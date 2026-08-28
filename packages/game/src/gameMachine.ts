import { assign, setup } from 'xstate'
import { PlayerColor } from './types'
import type { GameContext, PlayerId } from './types'

// Liste de tous les événements que la machine du jeu peut recevoir.
type GameEvent =
  | { type: 'join'; playerId: PlayerId; name: string }
  | { type: 'chooseColor'; playerId: PlayerId; color: PlayerColor }
  | { type: 'start' }
  | { type: 'win' }
  | { type: 'draw' }
  | { type: 'restart' }

// `setup` permet de déclarer les types, guards et actions utilisés par la machine.
export const gameMachine = setup({
  // On indique à XState la forme du contexte et des événements.
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },

  // Les guards décident si une action ou une transition est autorisée.
  guards: {
    // Vérifie qu'un joueur peut rejoindre le lobby.
    canJoin: ({ context, event }) => {
      // Cette guard ne doit accepter que les événements `join`.
      if (event.type !== 'join') {
        return false
      }

      // Cherche si ce joueur est déjà présent dans la partie.
      const playerAlreadyJoined = context.players.some(
        (player) => player.id === event.playerId,
      )

      // Autorise l'entrée uniquement s'il reste une place et que le joueur n'est pas déjà présent.
      return context.players.length < 2 && !playerAlreadyJoined
    },

    // Vérifie qu'un joueur peut choisir la couleur demandée.
    canChooseColor: ({ context, event }) => {
      // Cette guard ne doit accepter que les événements `chooseColor`.
      if (event.type !== 'chooseColor') {
        return false
      }

      // Vérifie que le joueur a bien rejoint la partie avant de choisir une couleur.
      const playerExists = context.players.some(
        (player) => player.id === event.playerId,
      )

      // Vérifie si la couleur demandée appartient déjà à un autre joueur.
      const colorAlreadyTaken = context.players.some(
        (player) =>
          player.id !== event.playerId &&
          player.color === event.color,
      )

      // Autorise le choix uniquement si le joueur existe et que la couleur est disponible.
      return playerExists && !colorAlreadyTaken
    },
  },

  // Les actions modifient les données contenues dans le contexte de la machine.
  actions: {
    // Ajoute un nouveau joueur à la liste des joueurs.
    joinPlayer: assign({
      // Calcule une nouvelle valeur pour `players`.
      players: ({ context, event }) => {
        // Si l'événement n'est pas `join`, on conserve la liste actuelle.
        if (event.type !== 'join') {
          return context.players
        }

        // Crée un nouveau tableau contenant les anciens joueurs et le nouveau joueur.
        return [
          ...context.players,
          {
            id: event.playerId,
            name: event.name,
          },
        ]
      },
    }),

    // Enregistre la couleur choisie par un joueur.
    choosePlayerColor: assign({
      // Calcule une nouvelle liste de joueurs avec la couleur mise à jour.
      players: ({ context, event }) => {
        // Si l'événement n'est pas `chooseColor`, on conserve la liste actuelle.
        if (event.type !== 'chooseColor') {
          return context.players
        }

        // `map` construit un nouveau tableau en parcourant tous les joueurs.
        return context.players.map((player) => {
          // Les joueurs qui ne sont pas concernés restent inchangés.
          if (player.id !== event.playerId) {
            return player
          }

          // Le joueur concerné est copié puis reçoit la couleur choisie.
          return {
            ...player,
            color: event.color,
          }
        })
      },
    }),
  },
}).createMachine({
  // Identifiant interne de la définition XState, différent du futur gameId réseau.
  id: 'game',

  // Une nouvelle partie démarre sans aucun joueur.
  context: {
    players: [],
  },

  // Une nouvelle partie commence toujours dans le lobby.
  initial: 'LOBBY',

  // Déclaration des différentes phases possibles de la partie.
  states: {
    // Le lobby permet aux joueurs de rejoindre et de choisir leur couleur.
    LOBBY: {
      // `on` contient les événements acceptés lorsque la machine est dans LOBBY.
      on: {
        // Un joueur tente de rejoindre la partie.
        join: {
          // Vérifie d'abord que le joueur a le droit de rejoindre.
          guard: 'canJoin',

          // Ajoute le joueur uniquement si la guard retourne `true`.
          actions: 'joinPlayer',
        },

        // Un joueur tente de choisir une couleur.
        chooseColor: {
          // Vérifie que le joueur existe et que la couleur est disponible.
          guard: 'canChooseColor',

          // Enregistre la couleur uniquement si la guard retourne `true`.
          actions: 'choosePlayerColor',
        },

        // Le démarrage fait passer la partie du lobby à la phase de jeu.
        start: {
          target: 'PLAY',
        },
      },
    },

    // PLAY représente une partie actuellement en cours.
    PLAY: {
      // Événements acceptés pendant la partie.
      on: {
        // Une victoire fait passer la machine dans l'état VICTORY.
        win: {
          target: 'VICTORY',
        },

        // Une égalité fait passer la machine dans l'état DRAW.
        draw: {
          target: 'DRAW',
        },
      },
    },

    // VICTORY représente une partie terminée avec un gagnant.
    VICTORY: {
      // Événements disponibles après une victoire.
      on: {
        // Recommencer ramène pour l'instant la machine dans le lobby.
        restart: {
          target: 'LOBBY',
        },
      },
    },

    // DRAW représente une partie terminée sans gagnant.
    DRAW: {
      // Événements disponibles après une égalité.
      on: {
        // Recommencer ramène également la machine dans le lobby.
        restart: {
          target: 'LOBBY',
        },
      },
    },
  },
})