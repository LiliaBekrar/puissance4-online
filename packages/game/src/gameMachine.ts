import { setup } from 'xstate'

type GameEvent =
  | { type: 'start' }
  | { type: 'win' }
  | { type: 'draw' }
  | { type: 'restart' }

export const gameMachine = setup({
  types: {
    events: {} as GameEvent,
  },
}).createMachine({
  id: 'game',
  initial: 'LOBBY',

  states: {
    LOBBY: {
      on: {
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