import { describe, expect, it } from 'vitest'
import { mapBraveResults, mapTavilyResults } from '~~/server/utils/assistant/webSearch'

describe('mapTavilyResults', () => {
  it('maps title/url/content and respects limit', () => {
    const hits = mapTavilyResults({
      results: [
        {
          title: 'Race report',
          url: 'https://example.com/a',
          content: 'Winner…'
        },
        { title: 'Second', url: 'https://example.com/b', snippet: 'alt' },
        { title: 'Third', url: 'https://example.com/c', content: 'x' },
      ],
    }, 2)

    expect(hits).toEqual([
      {
        title: 'Race report',
        url: 'https://example.com/a',
        snippet: 'Winner…',
        publishedAt: null
      },
      {
        title: 'Second',
        url: 'https://example.com/b',
        snippet: 'alt',
        publishedAt: null
      },
    ])
  })

  it('compacts long titles/snippets only when compact is on', () => {
    const longTitle = 'T'.repeat(200)
    const longSnippet = 'S'.repeat(400)
    const body = {
      results: [{
        title: longTitle,
        url: 'https://example.com/long',
        content: longSnippet,
      }],
    }

    const full = mapTavilyResults(body, 1)
    expect(full[0]?.title).toBe(longTitle)
    expect(full[0]?.snippet).toBe(longSnippet)

    const compact = mapTavilyResults(body, 1, { compact: true })
    expect(compact[0]?.title.length).toBeLessThanOrEqual(120)
    expect(compact[0]?.snippet.length).toBeLessThanOrEqual(220)
  })

  it('skips malformed rows', () => {
    expect(mapTavilyResults({ results: [{ title: 'no url' }, null, 'x'] }, 5)).toEqual([])
    expect(mapTavilyResults(null, 5)).toEqual([])
  })
})

describe('mapBraveResults', () => {
  it('maps web.results description/age', () => {
    const hits = mapBraveResults({
      web: {
        results: [
          {
            title: 'News',
            url: 'https://news.example/1',
            description: 'Brief',
            age: '2 hours ago',
          },
        ],
      },
    }, 5)

    expect(hits).toEqual([
      {
        title: 'News',
        url: 'https://news.example/1',
        snippet: 'Brief',
        publishedAt: '2 hours ago',
      },
    ])
  })

  it('returns empty when web.results missing', () => {
    expect(mapBraveResults({ web: {} }, 3)).toEqual([])
  })
})