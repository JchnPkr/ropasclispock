import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs/Subscription';

import { GameService } from 'src/app/game/game.service';
import {GameSession} from 'src/app/game/gameSession.model';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {
  // public radioGroupForm: FormGroup;

  gameSession: GameSession;
  sessionSubscription: Subscription;

  isDisabled = false;

  constructor(private gService: GameService) {}

  ngOnInit() {
    // this.radioGroupForm = this.formBuilder.group({
    //   'model': ''
    // });

    this.sessionSubscription = this.gService.sessionChanged.subscribe(
      (gameSession: GameSession) => {
        this.gameSession = gameSession;
      }
    );

    this.gameSession = this.gService.gameSession;
  }

  onSubmit(event: any) {
    // this.radioGroupForm.disable();
    this.gService.updatePlayerOneChoiceAndTryEvaluate(event.value);
    this.isDisabled = true;
  }
}
