export interface GameSession {
  gId: string;
  pOneId: string;
  pTwoId: string;
  result: string;
}

export class GameSessionImpl implements GameSession {
  gId: string;
  pOneId: string;
  pTwoId: string;
  result: string;

  constructor(gameId: string, pOneId: string, pTwoId: string) {
    this.gId = gameId;
    this.pOneId = pOneId;
    this.pTwoId = pTwoId;
  }
}
