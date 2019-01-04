import { NgModule } from '@angular/core';
import { AuthGuard } from './auth/auth.guard';
import { Routes, RouterModule } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { GameComponent } from './game/game.component';
import { SignupComponent } from './auth/signup/signup.component';
import { SigninComponent } from './auth/signin/signin.component';

const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'signUp', component: SignupComponent},
  { path: 'logIn', component: SigninComponent},
  { path: 'game', component: GameComponent, canActivate: [AuthGuard]}
]

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes)
  ],
  exports: [RouterModule],
  providers: [AuthGuard]
})
export class AppRoutingModule {

}
