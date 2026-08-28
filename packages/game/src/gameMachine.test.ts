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

  it('starts with no players', () => {
    const actor = createActor(gameMachine)

    actor.start()

    expect(actor.getSnapshot().context.players).toEqual([])
  })

  it('adds a player when they join the lobby', () => {
    // Arrange : création d'une nouvelle partie
    const actor = createActor(gameMachine)
    actor.start()

    // Act : un joueur rejoint le lobby
    actor.send({
      type: 'join',
      playerId: 'player-1',
      name: 'Lilia',
    })

    // Assert : le joueur est bien présent dans le contexte
    expect(actor.getSnapshot().context.players).toEqual([
      {
        id: 'player-1',
        name: 'Lilia',
      },
    ])
  })

  it('does not allow more than two players to join', () => {
    // Arrange
    const actor = createActor(gameMachine)
    actor.start()

    // Act : trois joueurs tentent de rejoindre une partie limitée à deux
    actor.send({
      type: 'join',
      playerId: 'player-1',
      name: 'Lilia',
    })

    actor.send({
      type: 'join',
      playerId: 'player-2',
      name: 'Marc',
    })

    actor.send({
      type: 'join',
      playerId: 'player-3',
      name: 'Alice',
    })

    // Assert : le troisième joueur doit être refusé
    expect(actor.getSnapshot().context.players).toHaveLength(2)
  })

  it('does not allow the same player to join twice', () => {
    // Arrange
    const actor = createActor(gameMachine)
    actor.start()

    // Act : le même identifiant tente de rejoindre deux fois
    actor.send({
      type: 'join',
      playerId: 'player-1',
      name: 'Lilia',
    })

    actor.send({
      type: 'join',
      playerId: 'player-1',
      name: 'Lilia',
    })

    // Assert : un même joueur ne doit apparaître qu'une fois
    expect(actor.getSnapshot().context.players).toHaveLength(1)
  })
})