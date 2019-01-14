import { Injectable } from '@angular/core';
import { AngularFirestore } from 'angularfire2/firestore';
import 'rxjs/Rx';
import { Subject } from 'rxjs/Subject';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { Player } from '../player/player.model';
import { GameSession, GameSessionImpl } from './gameSession.model';

@Injectable()
export class GameService {
  playerOne: Player;
  playerOneChanged = new Subject<Player>();

  playerTwo: Player;
  playerTwoChanged = new Subject<Player>();

  playersChanged = new Subject<Player[]>();
  players: Player[] = [];
  private fbSubs: Subscription[] = [];

  gameSession: GameSession;
  sessionChanged = new Subject<GameSession>();

  constructor(private db: AngularFirestore) {}

  addPlayerOneToDB(pOne: Player) {
    this.db.collection('players').add({...pOne})
      .then(docRef => {
        this.playerOne = pOne;
        this.playerOne.id = docRef.id;
        this.playerOneChanged.next(this.playerOne);
        console.log("---debug-addPlayerOneToDB: ", JSON.parse(JSON.stringify(this.playerOne)));
        this.fetchAvailablePlayers();
    });
  }

  fetchAvailablePlayers() {
    this.fbSubs.push(this.db
      .collection('players')
      .snapshotChanges()
      .pipe(
        map(docArray => {
          return docArray.map(doc => {
            return {
              id: doc.payload.doc.id,
              name: (doc.payload.doc.data() as Player).name,
              gameId: (doc.payload.doc.data() as Player).gameId,
              winCount: (doc.payload.doc.data() as Player).winCount,
              lastChosen: (doc.payload.doc.data() as Player).lastChosen,
              state: (doc.payload.doc.data() as Player).state,
            };
          });
        })
      ).subscribe((players: Player[]) => {
        this.players = players;
        this.playersChanged.next([...this.players]);
        console.log("---debug: Fetched players! ", JSON.parse(JSON.stringify(this.players)));

        this.addPlayerOneToGame();
      }));
  }

  addPlayerOneToGame() {
    this.playerOne = this.players.find(i => i.id === this.playerOne.id);
    this.playerOneChanged.next(this.playerOne);
    console.log("---debug-addPlayerOneToGame: ", JSON.parse(JSON.stringify(this.playerOne)));
  }

  startNewGame(pTwo: Player) {
    this.addPlayerTwoToGame(pTwo)
      .then(res => {
        this.createGameSession()
          .then(res => {
            this.updateGameIdOnPlayers();
          });
      });
//TODO
//wait for confirmation,
    // if(pTwo.state === 'accepted') {
    // }
  }

  addPlayerTwoToGame(pTwo: Player) {

    //TODO if state != 'waiting' -> requested player is busy

    return this.db.collection('players').doc(pTwo.id).update({state: 'requested'})
      .then(result => {
        this.playerTwo = this.players.find(i => i.id === pTwo.id);
        this.playerTwoChanged.next(this.playerTwo);
        console.log("---debug-addPlayerTwo: ", JSON.parse(JSON.stringify(this.playerTwo)));
      });
  }

  createGameSession() {
    this.gameSession = new GameSessionImpl('', this.playerOne.id, this.playerTwo.id);
    return this.db.collection('games').add({...this.gameSession})
      .then(ref => {
        this.gameSession.gId = ref.id;
        this.sessionChanged.next(this.gameSession);
        console.log("---debug-createGameSession: ", JSON.parse(JSON.stringify(this.gameSession)));
      });
  }

    updateGameIdOnPlayers() {
    this.db.collection('players').doc(this.playerOne.id).update({gameId: this.gameSession.gId})
      .then(result => {
        this.playerOne.gameId = this.gameSession.gId;
        this.playerOneChanged.next(this.playerTwo);
        console.log("---debug: PlayerOne gameId update: ", JSON.parse(JSON.stringify(this.playerOne)));
      });

    this.db.collection('players').doc(this.playerTwo.id).update({gameId: this.gameSession.gId})
      .then(result => {
        this.playerTwo.gameId = this.gameSession.gId;
        this.playerTwoChanged.next(this.playerTwo);
        console.log("---debug: PlayerTwo gameId update: ", JSON.parse(JSON.stringify(this.playerTwo)));
      });
  }

  updatePlayerOneChoiceAndTryEvaluate(choice: string) {
    console.log('---debug-update-choice: ' + choice);
    this.db.collection('players').doc(this.playerOne.id).update({lastChosen: choice})
      .then(ref => {
        this.playerOne.lastChosen = choice;
        this.playerOneChanged.next(this.playerOne);

        if(this.playerTwo.lastChosen != '') {
          let result = this.evaluateWinner();
          this.db.collection('games').doc(this.gameSession.gId).update({result: result})
            .then(ref => {
              this.gameSession.result = result;
              this.sessionChanged.next(this.gameSession);
            });
        }
      });
  }

  evaluateWinner() {
    if(!this.playerOne.lastChosen || !this.playerTwo.lastChosen) {
      console.log("---debug: could not evaluate winner!",
        JSON.parse(JSON.stringify(this.playerOne)),
        JSON.parse(JSON.stringify(this.playerTwo)));
    }
    else if(this.playerOne.lastChosen === this.playerTwo.lastChosen) {
      return 'Draw!';
    }
    else if((this.playerOne.lastChosen === 'rock' && (this.playerTwo.lastChosen === 'lizard' || this.playerTwo.lastChosen === 'scissors')) ||
       (this.playerOne.lastChosen === 'paper' && (this.playerTwo.lastChosen === 'rock' || this.playerTwo.lastChosen === 'spock')) ||
       (this.playerOne.lastChosen === 'scissors' && (this.playerTwo.lastChosen === 'paper' || this.playerTwo.lastChosen === 'lizard')) ||
       (this.playerOne.lastChosen === 'lizard' && (this.playerTwo.lastChosen === 'paper' ||this.playerTwo.lastChosen === 'spock')) ||
       (this.playerOne.lastChosen === 'spock' && (this.playerTwo.lastChosen === 'rock' || this.playerTwo.lastChosen === 'scissors'))) {
      this.playerOne.winCount++;
      this.db.collection('players').doc(this.playerOne.id).update({winCount: this.playerOne.winCount})
        .then(ref => {
          this.playerOneChanged.next(this.playerOne);
        });
      return 'Player ' + this.playerOne.name + ' wins!';
    }
    else {
      this.playerTwo.winCount++;
      this.db.collection('players').doc(this.playerTwo.id).update({winCount: this.playerTwo.winCount})
        .then(ref => {
          this.playerOneChanged.next(this.playerOne);
        });
      return 'Player ' + this.playerTwo.name + ' wins!'
    }
  }

  resetApp() {
    this.cancelSubscriptions();
    this.resetGameSession();
    return this.resetPlayers();
  }

  resetGameSession() {
    if(this.gameSession) {
      this.db.collection('games').doc(this.gameSession.gId).delete()
        .then(ref => {
          console.log('---debug-reset-session');
          this.gameSession = null;
        });
    }
  }

  resetPlayers() {
    if(this.playerOne) {
      return this.db.collection('players').doc(this.playerOne.id).delete()
        .then(ref => {
          console.log('---debug-reset-players');
          this.playerOne = null;
          this.playerTwo = null;
      });
    }
    else {
      var promise = new Promise<void>((resolve, reject) => {
        setTimeout(() => {
        console.log("---debug: playerOne already null! resolved anyways!");
        resolve();
        }, 1000);
      });
      return promise;
    }
  }

  resetGame() {
    this.db.collection('games').doc(this.gameSession.gId).update({result: null})
      .then(ref => {
        this.gameSession.result = null;
        this.sessionChanged.next(this.gameSession);
        this.resetLastChosenOnPlayers();
      });
  }

  resetLastChosenOnPlayers() {
    this.db.collection('players').doc(this.playerOne.id).update({lastChosen: null})
      .then(ref => {
        this.playerOne.lastChosen = null;
        this.playerOneChanged.next(this.playerOne);
      });
    //TODO reenable after debug
    // this.db.collection('players').doc(this.playerTwo.id).update({lastChosen: null})
    //   .then(ref => {
    //     this.playerTwo.lastChosen = null;
    //     this.playerTwoChanged.next(this.playerTwo);
    //   });
  }

  cancelSubscriptions() {
    this.fbSubs.forEach(sub => sub.unsubscribe());
  }
}
