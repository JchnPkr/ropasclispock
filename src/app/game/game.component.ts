import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';

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
              private router: Router,
              private logger: NGXLogger) {}

  ngOnInit() {
    this.sessionSubscription = this.gService.sessionChanged.subscribe(
      (gameSession: GameSession) => {
        this.gameSession = gameSession;

        if(this.gameSession && !this.gameSession.result) {
          this.resetButtons();
        }
      }
    );

    this.gameSession = this.gService.gameSession;
  }

  onSubmit(event: any) {
    this.isDisabled = true;
    this.gService.updatePlayerOneChoiceAndTryEvaluate(event.value);
  }

  onReset() {
    this.gService.resetGame();
    this.resetButtons();
  }

  private resetButtons() {
    this.logger.debug("resetButtons");
    this.isDisabled = false;
    this.groupModelCheckedMarker = null;
  }

  onCancel() {
    this.router.navigate(['/opponentList'])
      .then(res => {
        this.gService.cancelGameSession()
          .then(ref => this.logger.debug("onCancel: Session canceled"))
      });
  }

  onReturn() {
    this.router.navigate(['/opponentList'])
      .then(res => {
        this.gService.cleanUpAbortedSession();
      });
  }
}
