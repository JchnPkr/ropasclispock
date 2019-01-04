import { Injectable } from '@angular/core';
import { GameService } from 'src/app/game/game.service';
import { Subject } from 'rxjs/Subject';
import { Router } from '@angular/router';
import { AngularFireAuth } from 'angularfire2/auth';

import { AuthData } from './auth-data.model';
import { PlayerImpl } from 'src/app/player/player.model';

@Injectable()
export class AuthService {
  authChange = new Subject<boolean>();
  private isAuthenticated: boolean;

    constructor(private router: Router,
                private afAuth: AngularFireAuth,
                private gService: GameService){}

    initAuthListener() {
      this.afAuth.authState.subscribe(
        user => {
          if(user) {
            this.isAuthenticated = true;
            this.authChange.next(true);
            this.router.navigate(['/game']);
          }
          else {
            this.gService.cancelSubscriptions();
            this.authChange.next(false);
            this.router.navigate(['/logIn']);
            this.isAuthenticated = false;
          }
        }
      );
    }

  registerUser(authData: AuthData) {
    this.afAuth.auth.createUserWithEmailAndPassword(
      authData.email,
      authData.password
    ).then(result => {
      console.log(result);
      this.gService.addPlayerOne(new PlayerImpl(authData.email.split('@')[0]));
    }).catch(error => {
      console.log(error);
    });
  }

  signinUser(authData: AuthData) {
    this.afAuth.auth.signInWithEmailAndPassword(
      authData.email, authData.password
    ).then(result => {
      console.log(result);
      this.gService.addPlayerOne(new PlayerImpl(authData.email.split('@')[0]));
    }).catch(error => {
      console.log(error);
    });
  }

  isAuth() {
    return this.isAuthenticated;
  }

  logOut() {
    this.gService.resetApp()
      .then(ref => {
        this.afAuth.auth.signOut();
      });
  }
}
