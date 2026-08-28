import { assign, setup } from 'xstate'
import { PlayerColor } from './types'
import type { GameContext, PlayerId } from './types'

// Événements acceptés par la machine du jeu.
type GameEvent =
  | { type: 'join'; playerId: PlayerId; name: string }
  | { type: 'chooseColor'; playerId: PlayerId; color: PlayerColor }
  | { type: 'start'; playerId: PlayerId }
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
          target: 'PLAY',
        },
      },
    },

    PLAY: {
      on: {
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