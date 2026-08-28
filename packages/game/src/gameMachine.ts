import { assign, setup } from 'xstate'


import type { GameContext, PlayerId } from './types'

type GameEvent =
  | { type: 'join'; playerId: PlayerId; name: string }
  | { type: 'start' }
  | { type: 'win' }
  | { type: 'draw' }
  | { type: 'restart' }

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },

  actions: {
    joinPlayer: assign({
      players: ({ context, event }) => {
        if (event.type !== 'join') {
          return context.players
        }

        return [
          ...context.players,
          {
            id: event.playerId,
            name: event.name,
          },
        ]
      },
    }),
  },
}).createMachine({
  id: 'game',

  context: {
    players: [],
  },

  initial: 'LOBBY',

  states: {
    LOBBY: {
      on: {
        join: {
          actions: 'joinPlayer',
        },
        start: {
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