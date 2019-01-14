import { NgModule } from '@angular/core';
import { AuthGuard } from './auth/auth.guard';
import { Routes, RouterModule } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { GameComponent } from './game/game.component';
import { SignupComponent } from './auth/signup/signup.component';
import { LoginComponent } from './auth/login/login.component';
import { OpponentListComponent } from './opponent-list/opponent-list.component';

const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'signup', component: SignupComponent},
  { path: 'login', component: LoginComponent},
  { path: 'opponentList', component: OpponentListComponent},
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
