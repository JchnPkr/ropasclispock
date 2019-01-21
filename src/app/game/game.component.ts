import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { Router } from '@angular/router';

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
  groupModelCheckedMarker: string;

  constructor(private gService: GameService,
              private router: Router) {}

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
    this.groupModelCheckedMarker = null;
  }

  onCancel() {
    this.router.navigate(['/opponentList'])
      .then(res => {
        this.gService.cancelGameSession()
          .then(ref => console.log("---debug-Session canceled"))
      });
  }

  onReturn() {
    this.router.navigate(['/opponentList'])
      .then(res => {
        this.gService.cleanUpAbortedSession();
      });
  }
}
