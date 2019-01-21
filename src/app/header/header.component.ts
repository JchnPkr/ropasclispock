import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import { AuthService } from '../auth/auth.service';
import { GameService } from '../game/game.service';
import { GameSession } from '../game/gameSession.model';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  isAuth: boolean;
  authSub: Subscription;

  gameSession: GameSession;
  sessionSubscription: Subscription;

  constructor(private authService: AuthService,
              private gameService: GameService) {}

  ngOnInit() {
    this.sessionSubscription = this.gameService.sessionChanged.subscribe(
      (gameSession: GameSession) => {
        this.gameSession = gameSession;
      }
    );

    this.gameSession = this.gameService.gameSession;

    this.authSub = this.authService.authChange.subscribe(
      (authState: boolean) => {
        this.isAuth = authState;
      }
    );

    this.isAuth = this.authService.isAuthenticated;
  }

  onLogout() {
    this.authService.logOut();
  }
}
