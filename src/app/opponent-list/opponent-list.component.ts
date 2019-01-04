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
  subscription: Subscription;

  constructor(private gameService: GameService) { }

  ngOnInit() {
    this.subscription = this.gameService.playersChanged.subscribe(
      (players: Player[]) => {
        this.opponentList = players;
      }
    );

    this.gameService.fetchAvailablePlayers();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
