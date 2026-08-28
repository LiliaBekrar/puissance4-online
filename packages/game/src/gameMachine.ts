import { assign, setup } from 'xstate'
import { PlayerColor } from './types'
import type { GameContext, PlayerId } from './types'

// Événements acceptés par la machine du jeu.
type GameEvent =
  | { type: 'join'; playerId: PlayerId; name: string }
  | { type: 'chooseColor'; playerId: PlayerId; color: PlayerColor }
  | { type: 'start'; playerId: PlayerId }
  | { type: 'dropToken'; playerId: PlayerId; column: number }
  | { type: 'win' }
  | { type: 'draw' }
  | { type: 'restart' }

// Dimension de la grille
const GRID_ROWS = 6
const GRID_COLUMNS = 7

// Crée une nouvelle grille 6 × 7 entièrement vide.
const createEmptyGrid = () =>
  Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLUMNS }, () => null),
  )

  // Cherche la case libre la plus basse d'une colonne.
  const findAvailableRow = (grid: GameContext['grid'], column: number) => {
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      if (grid[row]?.[column] === null) {
        return row
      }
    }

    return undefined
  }

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },

  guards: {
    // Limite la partie à deux joueurs et interdit les doublons.
    canJoin: ({ context, event }) => {
      if (event.type !== 'join') {
        return false
      }

      const playerAlreadyJoined = context.players.some(
        (player) => player.id === event.playerId,
      )

      return context.players.length < 2 && !playerAlreadyJoined
    },

    // Autorise une couleur seulement si le joueur existe et qu'elle est disponible.
    canChooseColor: ({ context, event }) => {
      if (event.type !== 'chooseColor') {
        return false
      }

      const playerExists = context.players.some(
        (player) => player.id === event.playerId,
      )

      const colorAlreadyTaken = context.players.some(
        (player) =>
          player.id !== event.playerId &&
          player.color === event.color,
      )

      return playerExists && !colorAlreadyTaken
    },

    // Seul le créateur peut démarrer lorsque les deux joueurs sont prêts.
    canStart: ({ context, event }) => {
      if (event.type !== 'start') {
        return false
      }

      const hasTwoPlayers = context.players.length === 2

      const allPlayersHaveColor = context.players.every(
        (player) => player.color !== undefined,
      )

      const isCreator = context.creatorId === event.playerId

      return hasTwoPlayers && allPlayersHaveColor && isCreator
    },

    // Vérifie qu'un joueur peut jouer dans la colonne demandée.
    canDropToken: ({ context, event }) => {
      if (event.type !== 'dropToken') {
        return false
      }

      // Seul le joueur dont c'est le tour peut jouer.
      const isCurrentPlayer = context.currentPlayerId === event.playerId

      // La colonne doit correspondre à l'un des 7 indices de la grille.
      const isValidColumn =
        Number.isInteger(event.column) &&
        event.column >= 0 &&
        event.column < GRID_COLUMNS

      if (!isCurrentPlayer || !isValidColumn) {
        return false
      }

      // La colonne est jouable uniquement s'il reste au moins une case vide.
      return findAvailableRow(context.grid, event.column) !== undefined
    },

  },

  actions: {
    // Le premier joueur qui rejoint devient le créateur de la partie.
    joinPlayer: assign(({ context, event }) => {
      if (event.type !== 'join') {
        return {}
      }

      const newPlayer = {
        id: event.playerId,
        name: event.name,
      }

      return {
        players: [...context.players, newPlayer],
        creatorId: context.creatorId ?? event.playerId,
      }
    }),

    // Met à jour uniquement le joueur qui choisit sa couleur.
    choosePlayerColor: assign({
      players: ({ context, event }) => {
        if (event.type !== 'chooseColor') {
          return context.players
        }

        return context.players.map((player) => {
          if (player.id !== event.playerId) {
            return player
          }

          return {
            ...player,
            color: event.color,
          }
        })
      },
    }),

    // Le joueur jaune commence toujours la partie.
    setCurrentPlayer: assign({
      currentPlayerId: ({ context }) => {
        const yellowPlayer = context.players.find(
          (player) => player.color === PlayerColor.YELLOW,
        )

        return yellowPlayer?.id
      },
    }),

    // Dépose le pion du joueur dans la case libre la plus basse de la colonne.
    dropToken: assign({
      grid: ({ context, event }) => {
        if (event.type !== 'dropToken') {
          return context.grid
        }

        const row = findAvailableRow(context.grid, event.column)

        if (row === undefined) {
          return context.grid
        }

        const player = context.players.find(
          (player) => player.id === event.playerId,
        )

        if (!player?.color) {
          return context.grid
        }

        // On copie chaque ligne pour ne pas modifier directement l'ancienne grille.
        const newGrid = context.grid.map((currentRow) => [...currentRow])

        newGrid[row]![event.column] = player.color

        return newGrid
      },
    }),   

    // Passe le tour à l'autre joueur après un coup valide.
    switchPlayer: assign({
      currentPlayerId: ({ context }) => {
        const nextPlayer = context.players.find(
          (player) => player.id !== context.currentPlayerId,
        )

        return nextPlayer?.id
      },
    }),

  },
}).createMachine({
  id: 'game',

  context: {
    players: [],
    grid: createEmptyGrid(),
  },

  initial: 'LOBBY',

  states: {
    LOBBY: {
      on: {
        join: {
          guard: 'canJoin',
          actions: 'joinPlayer',
        },

        chooseColor: {
          guard: 'canChooseColor',
          actions: 'choosePlayerColor',
        },

        start: {
          guard: 'canStart',
          actions: 'setCurrentPlayer',
          target: 'PLAY',
        },
      },
    },

    PLAY: {
      on: {
        dropToken: {
          guard: 'canDropToken',
          actions: ['dropToken', 'switchPlayer'],
        },
        
        win: {
          target: 'VICTORY',
        },

        draw: {
          target: 'DRAW',
        },
      },
    },

    VICTORY: {
      on: {
        restart: {
          target: 'LOBBY',
        },
      },
    },

    DRAW: {
      on: {
        restart: {
          target: 'LOBBY',
        },
      },
    },
  },
})