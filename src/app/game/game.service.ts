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
  sessionSub = new Subscription;

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

        this.updatePlayerOne();
        this.updatePlayerTwo();
      }));
  }

  updatePlayerOne() {
    this.playerOne = this.players.find(i => i.id === this.playerOne.id);
    this.playerOneChanged.next(this.playerOne);
    console.log("---debug-updatePlayerOne: ", JSON.parse(JSON.stringify(this.playerOne)));

    this.updateGameSessionFromRequest();
  }

  updateGameSessionFromRequest() {
    if(this.playerOne.state ==='requested') {
      var gId = this.playerOne.gameId;
      this.sessionSub = this.db.collection('games').doc(gId).snapshotChanges()
        .subscribe(doc => {
          if(doc.payload.data()) {
            //gameSession from DB was created by requester, so pOneId of this session is pTwoId
            //for this client actually
            // console.log("---debug-updateGameSessionFromRequest (doc): ", JSON.parse(JSON.stringify(doc)));
            var pTwoId = (doc.payload.data() as GameSession).pOneId;
            this.gameSession = new GameSessionImpl(doc.payload.id, pTwoId, this.playerOne.id);
            this.sessionChanged.next(this.gameSession);
            console.log("---debug-updateGameSessionFromRequest: ", JSON.parse(JSON.stringify(this.gameSession)));

            this.updatePlayerTwoFromRequest();
          }
          else {
            this.gameSession = null;
            this.sessionChanged.next(this.gameSession);
            console.log("---debug-updateGameSessionFromRequest: ", JSON.parse(JSON.stringify(this.gameSession)));
          }
        });
    }
  }

  updatePlayerTwo() {
    if(this.playerTwo && this.gameSession) {
      this.playerTwo = this.players.find(i => i.id === this.gameSession.pTwoId);
      this.playerTwoChanged.next(this.playerTwo);
      console.log("---debug-updatePlayerTwo: ", JSON.parse(JSON.stringify(this.playerTwo)));
    }
  }

  updatePlayerTwoFromRequest() {
    //gameSession from DB was created by requester, so pOneId of this session is pTwoId
    //for this client actually
    this.playerTwo = this.players.find(i => i.id === this.gameSession.pOneId);
    this.playerTwoChanged.next(this.playerTwo);
    console.log("---debug-updatePlayerTwoFromRequest: ", JSON.parse(JSON.stringify(this.playerTwo)));
  }

  startNewGame(pTwo: Player) {
    if(pTwo.id === this.playerOne.id) {
      this.enableAI();
    }
    else {
      return this.updatePlayerOneStateInGame('inGame')
        .then(res => {
          return this.addPlayerTwoToGame(pTwo)
            .then(res => {
              return this.createGameSession()
                .then(res => {
                  return this.updateGameIdOnPlayers();
                });
            });
        });
    }
  }

  enableAI() {
    return this.updatePlayerOneStateInGame('inGame')
      .then(res => {
        // this.isAIenabled = true;
        // ---
        // //create aiPlayerTwo
        // return this.createGameSession()
        //   .then(res => {
        //     return this.updateGameIdOnPlayers();
        //   });
      });
  }

  updatePlayerOneStateInGame(state: string) {
    return this.db.collection('players').doc(this.playerOne.id).update({state: state})
      .then(result => {
        this.playerOne = this.players.find(i => i.id === this.playerOne.id);
        this.playerOneChanged.next(this.playerOne);
        console.log("---debug-updatePlayerOneStateInGame: ", JSON.parse(JSON.stringify(this.playerOne)));
      });
  }

  addPlayerTwoToGame(pTwo: Player) {
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
        this.playerOneChanged.next(this.playerOne);
        console.log("---debug: PlayerOne gameId update: ", JSON.parse(JSON.stringify(this.playerOne)));

    return this.db.collection('players').doc(this.playerTwo.id).update({gameId: this.gameSession.gId})
      .then(result => {
        this.playerTwo.gameId = this.gameSession.gId;
        this.playerTwoChanged.next(this.playerTwo);
        console.log("---debug: PlayerTwo gameId update: ", JSON.parse(JSON.stringify(this.playerTwo)));
      });
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
    return this.resetGameSession()
      .then(ref => {
          return this.resetClientsidePlayersAndRemovePlayerFromDB();
      });
  }

  cancelSubscriptions() {
  this.fbSubs.forEach(sub => sub.unsubscribe());
    console.log("---debug-cancelSubscriptions");
  }

  /**
   *this method resets the calling client side
   *and session data in DB
   */
  resetGameSession() {
    this.sessionSub.unsubscribe();
    if(this.gameSession) {
      return this.db.collection('games').doc(this.gameSession.gId).delete()
        .then(ref => {
          console.log('---debug-resetGameSession');
          this.gameSession = null;
          this.sessionChanged.next(this.gameSession);
          return this.resetPlayerTwo()
            .then(ref => {
              return this.resetPlayerOneGameSession();
            });
        });
    }
    else {
      var promise = new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          console.log("---debug-resetGameSession: session already null! resolved anyways!");
          resolve();
          }, 1);
        });
      return promise;
    }
  }

  resetPlayerTwo() {
    return this.db.collection('players').doc(this.playerTwo.id).update({gameId: null, lastChosen: '', state: 'waiting'})
      .then(ref => {
        this.playerTwo = null;
        this.playerTwoChanged.next(this.playerTwo);
        console.log("---debug-resetPlayerTwo");
      });
  }

  resetPlayerOneGameSession() {
    return this.db.collection('players').doc(this.playerOne.id).update({gameId: null, lastChosen: '', state: 'waiting'})
      .then(ref => {
        this.playerOne = this.players.find(i => i.id === this.playerOne.id);
        this.playerOneChanged.next(this.playerOne);
        console.log("---debug-resetPlayerOneGameSession");
      });
  }

  resetClientsidePlayersAndRemovePlayerFromDB() {
    if(this.playerOne) {
      return this.db.collection('players').doc(this.playerOne.id).delete()
        .then(ref => {
          console.log('---debug-resetPlayers');
          this.playerOne = null;
          this.playerTwo = null;
      });
    }
    else {
      var promise = new Promise<void>((resolve, reject) => {
        setTimeout(() => {
        console.log("---debug-resetPlayers: playerOne already null! resolved anyways!");
        resolve();
        }, 1);
      });
      return promise;
    }
  }

  resetGame() {
    this.db.collection('games').doc(this.gameSession.gId).update({result: null})
      .then(ref => {
        this.gameSession.result = null;
        this.sessionChanged.next(this.gameSession);
        console.log("---debug-resetGame");
        this.resetLastChosenOnPlayers();
      });
  }

  /**
   *in case a game has been canceled by the opponent,
   *only the own client has to be cleaned up
   */
  cleanUpAbortedSession() {
    this.gameSession = null;
    this.sessionChanged.next(this.gameSession);
    this.playerTwo = null;
    this.playerTwoChanged.next(this.playerTwo);
    console.log("---debug-cleanUpAbortedSession");
  }

  resetLastChosenOnPlayers() {
    if(this.playerOne.lastChosen != '') {
      this.db.collection('players').doc(this.playerOne.id).update({lastChosen: ''})
        .then(ref => {
          this.playerOne.lastChosen = '';
          this.playerOneChanged.next(this.playerOne);
        });
      this.db.collection('players').doc(this.playerTwo.id).update({lastChosen: ''})
        .then(ref => {
          this.playerTwo.lastChosen = '';
          this.playerTwoChanged.next(this.playerTwo);
        });
      console.log("---debug-resetLastChosenOnPlayers");
    }
    else {
      console.log("---debug-resetLastChosenOnPlayers: Last choice already reset. Nothing to do.");
    }
  }
}
