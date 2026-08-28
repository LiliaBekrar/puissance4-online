import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'
import { PlayerColor } from './types'
import { gameMachine } from './gameMachine'

describe('gameMachine', () => {

// TEST1 : Vérifie que la machine commence dans l'état "LOBBY"
  it('starts in the lobby', () => {
    // Arrange : création d'une nouvelle partie
    const actor = createActor(gameMachine)

    // Act : on démarre la machine
    actor.start()

    // Assert : la machine est bien dans l'état "LOBBY"
    expect(actor.getSnapshot().value).toBe('LOBBY')
  })

// TEST2 : Vérifie que la machine passe de "LOBBY" à "PLAY" lorsque la partie démarre
  it('moves from lobby to play when the game starts', () => {
    // Arrange : création d'une nouvelle partie
    const actor = createActor(gameMachine)

    // Act : on démarre la machine et on envoie l'événement "start"
    actor.start()
    actor.send({ type: 'start' })

    // Assert : la machine est bien dans l'état "PLAY"
    expect(actor.getSnapshot().value).toBe('PLAY')
  })

// TEST3 : Vérifie que la machine commence avec aucun joueur dans le contexte
  it('starts with no players', () => {
    // Arrange : création d'une nouvelle partie
    const actor = createActor(gameMachine)

    // Act : on démarre la machine
    actor.start()

    // Assert : le contexte de la machine ne contient aucun joueur
    expect(actor.getSnapshot().context.players).toEqual([])
  })

// TEST4 : Vérifie que la machine ajoute un joueur lorsqu'il rejoint le lobby
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

// TEST5 : Vérifie que la machine n'autorise pas plus de deux joueurs à rejoindre
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

// TEST6 : Vérifie que la machine n'autorise pas un joueur à rejoindre deux fois
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

// TEST7 : Vérifie que la machine permet à un joueur de choisir une couleur disponible
  it('allows a player to choose an available color', () => {
    // Arrange on crée la partie et on fait rejoindre un joueur
    const actor = createActor(gameMachine)

    actor.start()

    actor.send({
      type: 'join',
      playerId: 'player-1',
      name: 'Lilia',
    })
    
    // Act : le joueur choisit une couleur (jaune)
    actor.send({
      type: 'chooseColor',
      playerId: 'player-1',
      color: PlayerColor.YELLOW,
    })

    // Assert : le joueur a bien la couleur choisie (jaune)
    expect(actor.getSnapshot().context.players[0]?.color).toBe(
      PlayerColor.YELLOW,
    )
  })

// TEST8 : Vérifie que la machine n'autorise pas deux joueurs à choisir la même couleur
  it('does not allow two players to choose the same color', () => {
    // Arrange on crée la partie et on fait rejoindre deux joueurs et le premier choisit la couleur jaune
    const actor = createActor(gameMachine)

    actor.start()

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
      type: 'chooseColor',
      playerId: 'player-1',
      color: PlayerColor.YELLOW,
    })

    // Act : le deuxième joueur tente de choisir la même couleur (jaune)
    actor.send({
      type: 'chooseColor',
      playerId: 'player-2',
      color: PlayerColor.YELLOW,
    })

    // Assert : le choix de couleur du deuxième joueur doit rester indéfini, car la couleur jaune est déjà choisie par le premier joueur
    expect(actor.getSnapshot().context.players[1]?.color).toBeUndefined()
  })

})