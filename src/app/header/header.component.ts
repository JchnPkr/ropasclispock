import { Component, OnInit } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { GameService } from '../game/game.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  constructor(private authService: AuthService,
              private gameService: GameService) {}

  ngOnInit() {}

  onLogout() {
    this.authService.logOut();
  }
}
