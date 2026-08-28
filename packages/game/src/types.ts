export type PlayerId = string

export enum PlayerColor {
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export type Player = {
  id: PlayerId
  name: string
  color?: PlayerColor
}

export type GameContext = {
  creatorId?: PlayerId
  players: Player[]
}