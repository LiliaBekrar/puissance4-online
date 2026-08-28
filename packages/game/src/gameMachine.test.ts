import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'

import { gameMachine } from './gameMachine'
import { PlayerColor } from './types'

describe('gameMachine', () => {
  // TEST 1 : Vérifie qu'une nouvelle partie commence dans le lobby.
  it('starts in the lobby', () => {
    // Arrange : création d'une nouvelle partie.
    const actor = createActor(gameMachine)

    // Act : démarrage de la machine.
    actor.start()

    // Assert : la machine est bien dans l'état LOBBY.
    expect(actor.getSnapshot().value).toBe('LOBBY')
  })

  // TEST 2 : Vérifie qu'une nouvelle partie ne contient aucun joueur.
  it('starts with no players', () => {
    // Arrange : création d'une nouvelle partie.
    const actor = createActor(gameMachine)

    // Act : démarrage de la machine.
    actor.start()

    // Assert : aucun joueur n'est présent dans le contexte.
    expect(actor.getSnapshot().context.players).toEqual([])
  })

  // TEST 3 : Vérifie qu'un joueur peut rejoindre le lobby.
  it('adds a player when they join the lobby', () => {
    // Arrange : création et démarrage d'une nouvelle partie.
    const actor = createActor(gameMachine)
    actor.start()

    // Act : un joueur rejoint le lobby.
    actor.send({
      type: 'join',
      playerId: 'player-1',
      name: 'Lilia',
    })

    // Assert : le joueur est bien ajouté au contexte.
    expect(actor.getSnapshot().context.players).toEqual([
      {
        id: 'player-1',
        name: 'Lilia',
      },
    ])
  })

  // TEST 4 : Vérifie que le premier joueur devient le créateur de la partie.
  it('sets the first player as the game creator', () => {
    // Arrange : création et démarrage d'une nouvelle partie.
    const actor = createActor(gameMachine)
    actor.start()

    // Act : le premier joueur rejoint le lobby.
    actor.send({
      type: 'join',
      playerId: 'player-1',
      name: 'Lilia',
    })

    // Assert : son identifiant est enregistré comme créateur.
    expect(actor.getSnapshot().context.creatorId).toBe('player-1')
  })

  // TEST 5 : Vérifie qu'une partie ne peut contenir que deux joueurs.
  it('does not allow more than two players to join', () => {
    // Arrange : création et démarrage d'une nouvelle partie.
    const actor = createActor(gameMachine)
    actor.start()

    // Act : trois joueurs tentent de rejoindre une partie limitée à deux.
    actor.send({
      type: 'join',
      playerId: 'player-1',
      name: 'Lilia',
    })

    actor.send({
      type: 'join',
      playerId: 'player-2',
      name: 'Axel',
    })

    actor.send({
      type: 'join',
      playerId: 'player-3',
      name: 'Alice',
    })

    // Assert : le troisième joueur est refusé.
    expect(actor.getSnapshot().context.players).toHaveLength(2)
  })

  // TEST 6 : Vérifie qu'un même joueur ne peut pas rejoindre deux fois.
  it('does not allow the same player to join twice', () => {
    // Arrange : création et démarrage d'une nouvelle partie.
    const actor = createActor(gameMachine)
    actor.start()

    // Act : le même identifiant tente de rejoindre deux fois.
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

    // Assert : le joueur n'apparaît qu'une seule fois.
    expect(actor.getSnapshot().context.players).toHaveLength(1)
  })

  // TEST 7 : Vérifie qu'un joueur peut choisir une couleur disponible.
  it('allows a player to choose an available color', () => {
    // Arrange : un joueur rejoint le lobby.
    const actor = createActor(gameMachine)
    actor.start()

    actor.send({
      type: 'join',
      playerId: 'player-1',
      name: 'Lilia',
    })

    // Act : le joueur choisit la couleur jaune.
    actor.send({
      type: 'chooseColor',
      playerId: 'player-1',
      color: PlayerColor.YELLOW,
    })

    // Assert : la couleur jaune est bien enregistrée sur le joueur.
    expect(actor.getSnapshot().context.players[0]?.color).toBe(
      PlayerColor.YELLOW,
    )
  })

  // TEST 8 : Vérifie que deux joueurs ne peuvent pas choisir la même couleur.
  it('does not allow two players to choose the same color', () => {
    // Arrange : deux joueurs rejoignent et le premier choisit la couleur jaune.
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
      name: 'Axel',
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-1',
      color: PlayerColor.YELLOW,
    })

    // Act : le deuxième joueur tente de choisir la même couleur.
    actor.send({
      type: 'chooseColor',
      playerId: 'player-2',
      color: PlayerColor.YELLOW,
    })

    // Assert : le choix est refusé et la couleur du deuxième joueur reste indéfinie.
    expect(actor.getSnapshot().context.players[1]?.color).toBeUndefined()
  })

  // TEST 9 : Vérifie que le créateur peut démarrer lorsque les deux joueurs sont prêts.
  it('allows the creator to start when both players are ready', () => {
    // Arrange : deux joueurs rejoignent et choisissent chacun une couleur.
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
      name: 'Axel',
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-1',
      color: PlayerColor.YELLOW,
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-2',
      color: PlayerColor.RED,
    })

    // Act : le créateur demande le démarrage de la partie.
    actor.send({
      type: 'start',
      playerId: 'player-1',
    })

    // Assert : la machine passe dans l'état PLAY.
    expect(actor.getSnapshot().value).toBe('PLAY')
  })

  // TEST 10 : Vérifie qu'un joueur qui n'est pas le créateur ne peut pas démarrer.
  it('does not allow a non-creator player to start the game', () => {
    // Arrange : deux joueurs sont prêts à commencer.
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
      name: 'Axel',
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-1',
      color: PlayerColor.YELLOW,
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-2',
      color: PlayerColor.RED,
    })

    // Act : le deuxième joueur tente de démarrer la partie.
    actor.send({
      type: 'start',
      playerId: 'player-2',
    })

    // Assert : la machine reste dans le lobby.
    expect(actor.getSnapshot().value).toBe('LOBBY')
  })

  // TEST 11 : Vérifie que la partie ne démarre pas tant que les deux couleurs ne sont pas choisies.
  it('does not start until both players have chosen a color', () => {
    // Arrange : deux joueurs rejoignent mais un seul choisit une couleur.
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
      name: 'Axel',
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-1',
      color: PlayerColor.YELLOW,
    })

    // Act : le créateur tente de démarrer trop tôt.
    actor.send({
      type: 'start',
      playerId: 'player-1',
    })

    // Assert : la machine reste dans le lobby.
    expect(actor.getSnapshot().value).toBe('LOBBY')
  })

  //TEST 12 : Vérifie qu'une nouvelle partie possède une grille vide de 6 lignes sur 7 colonnes.
  it('starts with an empty 6 by 7 grid', () => {
    // Arrange : création et démarrage d'une nouvelle partie.
    const actor = createActor(gameMachine)

    // Act : démarrage de la machine.
    actor.start()

    const grid = actor.getSnapshot().context.grid

    // Assert : la grille est bien vide et de la bonne dimension.
    expect(grid).toHaveLength(6)
    expect(grid.every((row) => row.length === 7)).toBe(true)
    expect(grid.flat().every((cell) => cell === null)).toBe(true)
  })

  // TEST 13 : Vérifie que le joueur jaune obtient le premier tour.
  it('sets the yellow player as the current player when the game starts', () => {
    // Arrange : deux joueurs rejoignent la partie et choisissent des couleurs différentes.
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
      name: 'Axel',
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-1',
      color: PlayerColor.YELLOW,
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-2',
      color: PlayerColor.RED,
    })

    // Act : le créateur démarre la partie.
    actor.send({
      type: 'start',
      playerId: 'player-1',
    })

    // Assert : le joueur jaune devient le joueur autorisé à jouer.
    expect(actor.getSnapshot().context.currentPlayerId).toBe('player-1')
  })

  // TEST 14 : Vérifie qu'un pion tombe dans la case libre la plus basse de la colonne.
  it('drops a token at the bottom of an empty column', () => {
    // Arrange : on prépare une partie démarrée où Jaune possède le premier tour.
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
      name: 'Axel',
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-1',
      color: PlayerColor.YELLOW,
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-2',
      color: PlayerColor.RED,
    })

    actor.send({
      type: 'start',
      playerId: 'player-1',
    })

    // Act : le joueur jaune joue dans la première colonne.
    actor.send({
      type: 'dropToken',
      playerId: 'player-1',
      column: 0,
    })

    // Assert : le pion jaune se trouve dans la dernière ligne de la colonne.
    expect(actor.getSnapshot().context.grid[5]?.[0]).toBe(
      PlayerColor.YELLOW,
    )
  })

  // TEST 15 : Vérifie que le tour passe à l'autre joueur après un coup valide.
  it('switches the current player after a valid move', () => {
    // Arrange : on prépare une partie où le joueur jaune doit jouer en premier.
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
      name: 'Axel',
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-1',
      color: PlayerColor.YELLOW,
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-2',
      color: PlayerColor.RED,
    })

    actor.send({
      type: 'start',
      playerId: 'player-1',
    })

    // Act : Jaune joue son pion.
    actor.send({
      type: 'dropToken',
      playerId: 'player-1',
      column: 0,
    })

    // Assert : c'est désormais au joueur rouge de jouer.
    expect(actor.getSnapshot().context.currentPlayerId).toBe('player-2')
  })

  // TEST 16 : Vérifie qu'un joueur ne peut pas déposer de pion pendant le tour adverse.
  it('does not allow a player to play out of turn', () => {
    // Arrange : Jaune possède le premier tour de la partie.
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
      name: 'Axel',
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-1',
      color: PlayerColor.YELLOW,
    })

    actor.send({
      type: 'chooseColor',
      playerId: 'player-2',
      color: PlayerColor.RED,
    })

    actor.send({
      type: 'start',
      playerId: 'player-1',
    })

    // Act : Rouge tente de jouer alors que c'est encore le tour de Jaune.
    actor.send({
      type: 'dropToken',
      playerId: 'player-2',
      column: 0,
    })

    // Assert : aucun pion ne doit avoir été ajouté à la grille.
    expect(actor.getSnapshot().context.grid[5]?.[0]).toBeNull()

    // Assert : le tour appartient toujours au joueur jaune.
    expect(actor.getSnapshot().context.currentPlayerId).toBe('player-1')
  })
})