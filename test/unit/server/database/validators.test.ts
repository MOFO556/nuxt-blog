import { describe, expect, it } from 'vitest'
import { commentInsertSchema } from '#server-db/comments.validators'
import { postInsertSchema } from '#server-db/posts.validators'
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
