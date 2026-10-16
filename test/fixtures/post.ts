import { faker } from '@faker-js/faker'

export function buildPostPayload(overrides: {
  title?: string
  content?: string
  url?: string
  tags?: { name: string, slug?: string }[]
} = {}) {
  return {
    title: overrides.title ?? faker.lorem.words(4),
    content: overrides.content ?? faker.lorem.paragraphs(2).slice(0, 200).padEnd(25, 'x'),
    url: overrides.url ?? '',
    tags: overrides.tags,
  }
}
