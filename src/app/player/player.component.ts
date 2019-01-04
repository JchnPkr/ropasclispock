import { Component, OnInit, Input } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import { Player } from './player.model';
import { GameService } from '../game/game.service';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent implements OnInit {
  playerOne: Player;
  subscriptionPlOne: Subscription;

  playerTwo: Player;
  subscriptionPlTwo: Subscription;

  constructor(private gameService: GameService) { }

  ngOnInit() {
    this.subscriptionPlOne = this.gameService.playerOneChanged.subscribe(
      (player: Player) => {
        this.playerOne = player;
      }
    );

    this.subscriptionPlTwo = this.gameService.playerTwoChanged.subscribe(
      (player: Player) => {
        this.playerTwo = player;
      }
    );

    this.playerOne = this.gameService.playerOne;
    this.playerTwo = this.gameService.playerTwo;
  }
}
