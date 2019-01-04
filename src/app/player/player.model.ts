export interface Player {
  id: string;
  name: string;
  gameId: string;
  winCount: number;
  lastChosen: string;
  status: string;
}

export class PlayerImpl implements Player{
  id: string;
  name: string;
  gameId: string;
  winCount: number;
  lastChosen: string;
  status: string;

  constructor(name: string) {
    this.id = null;
    this.name = name;
    this.gameId = '';
    this.winCount = 0;
    this.lastChosen = '';
    this.status = '';
  }
}
