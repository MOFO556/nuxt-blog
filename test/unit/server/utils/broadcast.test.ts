import { describe, expect, it, vi } from 'vitest'
import {
  addClient,
  broadcast,
  removeClient,
  subscribe,
  unsubscribe,
} from '#server-utils/broadcast'

function peer() {
  return { send: vi.fn() }
}

describe('broadcast', () => {
  it('sends JSON payloads only to subscribed peers', () => {
    const a = peer()
    const b = peer()
    addClient(a)
    addClient(b)
    subscribe(a, 'post:1')
    subscribe(b, 'post:2')

    broadcast('post:1', { type: 'comment:added' })

    expect(a.send).toHaveBeenCalledOnce()
    expect(JSON.parse(a.send.mock.calls[0]![0] as string)).toEqual({
      channel: 'post:1',
      data: { type: 'comment:added' },
    })
    expect(b.send).not.toHaveBeenCalled()

    unsubscribe(a, 'post:1')
    broadcast('post:1', { type: 'noop' })
    expect(a.send).toHaveBeenCalledOnce()

    removeClient(a)
    removeClient(b)
  })

  it('removes peers that throw on send', () => {
    const broken = {
      send: vi.fn(() => {
        throw new Error('closed')
      }),
    }
    addClient(broken)
    subscribe(broken, 'room')
    broadcast('room', { ok: true })
    expect(broken.send).toHaveBeenCalledOnce()

    broadcast('room', { ok: false })
    expect(broken.send).toHaveBeenCalledOnce()
  })
})
