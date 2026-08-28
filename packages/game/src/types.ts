export type PlayerId = string

export type Player = {
  id: PlayerId
  name: string
}

export type GameContext = {
  players: Player[]
}