import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';

import { GameService } from '../../game/game.service';
import { Player } from '../../player/player.model';

@Component({
  selector: 'app-opponent',
  templateUrl: './opponent.component.html',
  styleUrls: ['./opponent.component.css']
})
export class OpponentComponent implements OnInit {
  @Input() opponent: Player;

  constructor(private gameService: GameService,
              private router: Router) {}

  ngOnInit() {}

  onSelect() {
    this.gameService.startNewGame(this.opponent)
    // this.router.navigate(['game/' + gId]);
  }
}
