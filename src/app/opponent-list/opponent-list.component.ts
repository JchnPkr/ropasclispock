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
  }

  onSubmit(event: any) {
    if(event.value === 'accept') {
      this.router.navigate(['game/' + this.gameService.gameSession.gId]);
    }
    else if(event.value === 'decline') {
      this.gameService.declineGame();
    }
  }

  ngOnDestroy() {
    this.playersSubscription.unsubscribe();
    this.playerOneSubscription.unsubscribe();
  }
}
