import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import { GameService } from 'src/app/game/game.service';
import {GameSession} from 'src/app/game/gameSession.model';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {
  gameSession: GameSession;
  sessionSubscription: Subscription;

  isDisabled = false;
  groupModel: string;

  constructor(private gService: GameService) {}

  ngOnInit() {
    this.sessionSubscription = this.gService.sessionChanged.subscribe(
      (gameSession: GameSession) => {
        this.gameSession = gameSession;
      }
    );

    this.gameSession = this.gService.gameSession;
  }

  onSubmit(event: any) {
    this.gService.updatePlayerOneChoiceAndTryEvaluate(event.value);
    this.isDisabled = true;
  }

  onReset() {
    this.gService.resetGame();
    this.isDisabled = false;
    this.groupModel = null;
  }
}
