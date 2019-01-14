import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import { Player } from '../player/player.model';
import { GameService } from '../game/game.service';

@Component({
  selector: 'app-opponent-list',
  templateUrl: './opponent-list.component.html',
  styleUrls: ['./opponent-list.component.css']
})
export class OpponentListComponent implements OnInit, OnDestroy {
  opponentList: Player[];
  playersSubscription: Subscription;

  playerOne: Player;
  playerOneSubscription: Subscription;

  constructor(private gameService: GameService) { }

  ngOnInit() {
    this.playersSubscription = this.gameService.playersChanged.subscribe(
      (players: Player[]) => {
        this.opponentList = players;
      }
    );

    this.playerOneSubscription = this.gameService.playerOneChanged.subscribe(
      (player: Player) => {
        this.playerOne = player;
      }
    );

    // this.gameService.fetchAvailablePlayers();
  }

  onSubmit(event: any) {
    if(event.value === 'accept') {
      // this.gameService.getRequestingPlayer();
      // this.gameService.startNewGame(playerTwo);
    }
    else if(event.value === 'decline') {

    }
  }

  ngOnDestroy() {
    this.playersSubscription.unsubscribe();
    this.playerOneSubscription.unsubscribe();
  }
}
