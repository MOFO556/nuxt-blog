import { describe, expect, it } from 'vitest'
import { commentInsertSchema } from '#server-db/comments.validators'
import { postInsertSchema, postPatchSchema } from '#server-db/posts.validators'
import { profilePatchSchema, userInsertSchema, userSchema } from '#server-db/users.validators'

describe('userInsertSchema', () => {
  it('accepts password registration and sets authMethod', () => {
    const result = userInsertSchema.safeParse({
      login: 'alice1',
      password: 'secret12',
      usePassKey: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.authMethod).toBe('password')
      expect(result.data.login).toBe('alice1')
    }
  })

  it('rejects short password without passkey', () => {
    const result = userInsertSchema.safeParse({
      login: 'alice1',
      password: '123',
      usePassKey: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing password and passkey', () => {
    const result = userInsertSchema.safeParse({
      login: 'alice1',
      usePassKey: false,
    })
    expect(result.success).toBe(false)
  })
})

describe('userSchema (login)', () => {
  it('requires login and password of at least 6 chars', () => {
    expect(userSchema.safeParse({ login: 'bob', password: '12345' }).success).toBe(false)
    expect(userSchema.safeParse({ login: 'bob', password: '123456' }).success).toBe(true)
  })
})

describe('profilePatchSchema', () => {
  it('accepts avatar and password fields', () => {
    expect(profilePatchSchema.safeParse({
      avatar: 3,
      newPassword: 'secret12',
      currentPassword: 'oldpass1',
    }).success).toBe(true)
  })

  it('rejects short newPassword', () => {
    expect(profilePatchSchema.safeParse({ newPassword: '123' }).success).toBe(false)
  })
})

describe('postInsertSchema', () => {
  it('accepts a valid post', () => {
    const result = postInsertSchema.safeParse({
      title: 'Hello world',
      content: 'x'.repeat(25),
      url: '',
      tags: [{ name: 'vue' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects short title', () => {
    const result = postInsertSchema.safeParse({
      title: 'Hi',
      content: 'x'.repeat(25),
    })
    expect(result.success).toBe(false)
  })

  it('defaults mode to legacy when omitted', () => {
    const result = postInsertSchema.safeParse({
      title: 'Hello world',
      content: 'x'.repeat(25),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.mode).toBe('legacy')
    }
  })

  it('accepts a formatted post with contentHtml', () => {
    const result = postInsertSchema.safeParse({
      title: 'Hello world',
      mode: 'formatted',
      content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
      contentHtml: '<p>Hello formatted</p>',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.contentHtml).toBe('<p>Hello formatted</p>')
      expect(result.data.mode).toBe('formatted')
    }
  })

  it('rejects formatted posts without contentHtml', () => {
    const result = postInsertSchema.safeParse({
      title: 'Hello world',
      mode: 'formatted',
      content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
    })
    expect(result.success).toBe(false)
  })

  it('rejects description longer than 300 characters', () => {
    const result = postInsertSchema.safeParse({
      title: 'Hello world',
      content: 'x'.repeat(25),
      description: 'd'.repeat(301),
    })
    expect(result.success).toBe(false)
  })

  it('allows formatted content longer than the legacy 5000 cap', () => {
    const result = postInsertSchema.safeParse({
      title: 'Hello world',
      mode: 'formatted',
      content: 'x'.repeat(5001),
      contentHtml: `<p>${'x'.repeat(5001)}</p>`,
    })
    expect(result.success).toBe(true)
  })

  it('rejects formatted content over 100KB', () => {
    const result = postInsertSchema.safeParse({
      title: 'Hello world',
      mode: 'formatted',
      content: 'x'.repeat(100_001),
      contentHtml: '<p>ok</p>',
    })
    expect(result.success).toBe(false)
  })
})

describe('postPatchSchema', () => {
  it('applies legacy limits when mode is legacy even if contentHtml is sent', () => {
    const result = postPatchSchema.safeParse({
      mode: 'legacy',
      content: 'x'.repeat(5001),
      contentHtml: '<p>ignored</p>',
    })
    expect(result.success).toBe(false)
  })

  it('allows large tip-tap JSON when mode is formatted without contentHtml', () => {
    const result = postPatchSchema.safeParse({
      mode: 'formatted',
      content: 'x'.repeat(5001),
    })
    expect(result.success).toBe(true)
  })

  it('validates contentHtml alone for formatted mode', () => {
    const ok = postPatchSchema.safeParse({
      mode: 'formatted',
      contentHtml: '<p>Hello</p>',
    })
    expect(ok.success).toBe(true)

    const empty = postPatchSchema.safeParse({
      mode: 'formatted',
      contentHtml: '',
    })
    expect(empty.success).toBe(false)
  })
})

describe('commentInsertSchema', () => {
  it('accepts text-only comments', () => {
    expect(commentInsertSchema.safeParse({ text: 'Nice post' }).success).toBe(true)
  })

  it('rejects empty comments without images', () => {
    const result = commentInsertSchema.safeParse({ text: '   ' })
    expect(result.success).toBe(false)
  })

  it('accepts image-only comments', () => {
    expect(commentInsertSchema.safeParse({ text: '', images: [{ id: 1 }] }).success).toBe(true)
  })
})
