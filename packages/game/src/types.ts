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

// Une case contient la couleur d'un pion ou `null` lorsqu'elle est vide.
export type Cell = PlayerColor | null

// La grille est composée de lignes contenant chacune plusieurs cases.
export type Grid = Cell[][]

export type GameContext = {
  creatorId?: PlayerId
  players: Player[]
  grid: Grid
  currentPlayerId?: PlayerId
}
