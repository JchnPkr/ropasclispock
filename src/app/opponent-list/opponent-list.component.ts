import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { Router } from '@angular/router';

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

  playerTwo: Player;
  playerTwoSubscription: Subscription;


  constructor(private gameService: GameService,
              private router: Router) {}

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

    this.playerTwoSubscription = this.gameService.playerTwoChanged.subscribe(
      (player: Player) => {
        this.playerTwo = player;
      }
    );

    this.playerOne = this.gameService.playerOne;
    this.playerTwo = this.gameService.playerTwo;
    this.opponentList = this.gameService.players;
  }

  onSubmit(event: any) {
    if(event.value === 'accept') {
      this.gameService.updatePlayerOneStateInGame('accepted')
        .then(ref => {
          this.router.navigate(['game/' + this.gameService.gameSession.gId]);
        });
    }
    else if(event.value === 'decline') {
      this.gameService.cancelGameSession();
    }
  }

  ngOnDestroy() {
    this.playersSubscription.unsubscribe();
    this.playerOneSubscription.unsubscribe();
  }
}
