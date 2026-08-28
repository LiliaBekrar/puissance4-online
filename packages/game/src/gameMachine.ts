import { assign, setup } from 'xstate'

import type { GameContext, PlayerId } from './types'

/**
 * Liste de tous les événements que notre jeu peut recevoir.
 *
 * Chaque événement possède un `type` qui indique ce qui vient de se passer.
 * Certains événements transportent aussi des informations supplémentaires.
 */
type GameEvent =
  | { type: 'join'; playerId: PlayerId; name: string }
  | { type: 'start' }
  | { type: 'win' }
  | { type: 'draw' }
  | { type: 'restart' }

export const gameMachine = setup({
  /**
   * On indique à XState la forme des données utilisées par la machine.
   *
   * - `context` contient les données persistantes de la partie.
   * - `events` décrit toutes les actions que la machine peut recevoir.
   */
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },

  /**
   * Les guards sont des conditions qui permettent ou refusent une action.
   *
   * Elles ne modifient pas la partie.
   * Elles répondent simplement par `true` ou `false`.
   */
  guards: {
    canJoin: ({ context, event }) => {
      /**
       * Cette guard ne concerne que l'événement `join`.
       *
       * Si elle était appelée avec un autre événement,
       * on refuse immédiatement l'action.
       */
      if (event.type !== 'join') {
        return false
      }

      /**
       * On vérifie si un joueur ayant le même identifiant
       * est déjà présent dans la partie.
       *
       * `.some()` retourne `true` dès qu'il trouve
       * au moins un joueur correspondant.
       */
      const playerAlreadyJoined = context.players.some(
        (player) => player.id === event.playerId,
      )

      /**
       * Un joueur peut rejoindre uniquement si :
       *
       * 1. il y a moins de deux joueurs dans la partie ;
       * 2. son identifiant n'est pas déjà présent.
       *
       * `&&` signifie que les deux conditions doivent être vraies.
       * `!playerAlreadyJoined` signifie "le joueur n'est pas déjà présent".
       */
      return context.players.length < 2 && !playerAlreadyJoined
    },
  },

  /**
   * Les actions modifient les données de la partie.
   */
  actions: {
    joinPlayer: assign({
      /**
       * `assign()` permet à XState de mettre à jour le contexte.
       *
       * Ici, nous recalculons la liste des joueurs lorsqu'un joueur rejoint.
       */
      players: ({ context, event }) => {
        /**
         * L'action ne doit modifier les joueurs que pour un événement `join`.
         *
         * Si elle reçoit un autre événement, on retourne la liste actuelle
         * sans effectuer de modification.
         */
        if (event.type !== 'join') {
          return context.players
        }

        /**
         * On crée un nouveau tableau plutôt que de modifier directement
         * `context.players`.
         *
         * `...context.players` copie tous les joueurs déjà présents,
         * puis on ajoute le nouveau joueur à la fin.
         */
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
  /**
   * Identifiant interne de cette définition de machine.
   *
   * Ce n'est pas l'identifiant d'une partie en ligne.
   */
  id: 'game',

  /**
   * Données présentes lorsqu'une nouvelle partie est créée.
   *
   * Au départ, personne n'a encore rejoint le lobby.
   */
  context: {
    players: [],
  },

  /**
   * Une nouvelle partie commence toujours dans le lobby.
   */
  initial: 'LOBBY',

  /**
   * Les différents états possibles du jeu.
   *
   * LOBBY   : attente des joueurs
   * PLAY    : partie en cours
   * VICTORY : un joueur a gagné
   * DRAW    : égalité
   */
  states: {
    LOBBY: {
      on: {
        /**
         * Lorsqu'un joueur essaie de rejoindre :
         *
         * 1. `canJoin` vérifie si cela est autorisé ;
         * 2. si oui, `joinPlayer` l'ajoute au contexte.
         *
         * Il n'y a pas de `target` car rejoindre le lobby
         * ne change pas l'état de la partie : on reste dans LOBBY.
         */
        join: {
          guard: 'canJoin',
          actions: 'joinPlayer',
        },

        /**
         * Lorsque la partie démarre,
         * on quitte le lobby pour entrer dans la phase de jeu.
         */
        start: {
          target: 'PLAY',
        },
      },
    },

    PLAY: {
      on: {
        /**
         * Une victoire fait passer la partie
         * de PLAY à VICTORY.
         */
        win: {
          target: 'VICTORY',
        },

        /**
         * Si la grille est pleine sans gagnant,
         * la partie passe dans l'état DRAW.
         */
        draw: {
          target: 'DRAW',
        },
      },
    },

    VICTORY: {
      on: {
        /**
         * Après une victoire, `restart`
         * permet de revenir dans le lobby.
         */
        restart: {
          target: 'LOBBY',
        },
      },
    },

    DRAW: {
      on: {
        /**
         * Après une égalité, `restart`
         * permet également de revenir dans le lobby.
         */
        restart: {
          target: 'LOBBY',
        },
      },
    },
  },
})