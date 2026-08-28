import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'

import { gameMachine } from './gameMachine'

describe('gameMachine', () => {
  it('starts in the lobby', () => {
    const actor = createActor(gameMachine)

    actor.start()

    expect(actor.getSnapshot().value).toBe('LOBBY')
  })

  it('moves from lobby to play when the game starts', () => {
    const actor = createActor(gameMachine)

    actor.start()
    actor.send({ type: 'start' })

    expect(actor.getSnapshot().value).toBe('PLAY')
  })
})