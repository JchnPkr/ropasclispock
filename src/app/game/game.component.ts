import { Component, OnInit } from '@angular/core';
import { GameService } from 'src/app/game/game.service';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {
  public radioGroupForm: FormGroup;

  constructor(private formBuilder: FormBuilder,
              private gService: GameService) {}

  ngOnInit() {
    this.radioGroupForm = this.formBuilder.group({
      'model': ''
    });
  }

  onSubmit(event: any) {
    this.radioGroupForm.disable();
    this.gService.updatePlayerOneChoiceAndTryEvaluate(event.target.value);
  }
}
