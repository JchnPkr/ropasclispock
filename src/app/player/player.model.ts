export interface Player {
  id: string;
  name: string;
  gameId: string;
  winCount: number;
  lastChosen: string;
  state: string;
}

export class PlayerImpl implements Player{
  id: string;
  name: string;
  gameId: string;
  winCount: number;
  lastChosen: string;
  state: string;

  constructor(name: string) {
    this.id = '';
    this.name = name;
    this.gameId = '';
    this.winCount = 0;
    this.lastChosen = '';
    this.state = 'waiting';
  }
}
