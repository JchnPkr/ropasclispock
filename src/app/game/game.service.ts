import { Injectable } from '@angular/core';
import { AngularFirestore } from 'angularfire2/firestore';
import 'rxjs/Rx';
import { Subject } from 'rxjs/Subject';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { Player, PlayerImpl } from '../player/player.model';
import { GameSession, GameSessionImpl } from './gameSession.model';

@Injectable()
export class GameService {
  isAIenabled = false;
  possibleChoices: string[] = ['rock', 'paper', 'scissors', 'lizard', 'spock'];

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

  private updatePlayerOne() {
    this.playerOne = this.players.find(i => i.id === this.playerOne.id);
    this.playerOneChanged.next(this.playerOne);
    console.log("---debug-updatePlayerOne: ", JSON.parse(JSON.stringify(this.playerOne)));

    if((this.playerOne.state === 'requested') || (this.playerOne.state === 'accepted')) {
      this.updateGameSessionFromRequest();
    }
  }

  private updateGameSessionFromRequest() {
    var gId = this.playerOne.gameId;
    this.sessionSub = this.db.collection('games').doc(gId).snapshotChanges()
      .subscribe(doc => {
        if(doc.payload.data()) {
          //gameSession from DB was created by requester, so pOneId of this session is pTwoId
          //for this client actually
          // console.log("---debug-updateGameSessionFromRequest (doc): ", JSON.parse(JSON.stringify(doc)));
          var pTwoId = (doc.payload.data() as GameSession).pOneId;
          this.gameSession = new GameSessionImpl(doc.payload.id, pTwoId, this.playerOne.id);
          this.gameSession.result = (doc.payload.data() as GameSession).result;
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

  private updatePlayerTwo() {
    if(!this.isAIenabled && this.playerTwo && this.gameSession) {
      this.playerTwo = this.players.find(i => i.id === this.gameSession.pTwoId);
      this.playerTwoChanged.next(this.playerTwo);
      console.log("---debug-updatePlayerTwo: ", JSON.parse(JSON.stringify(this.playerTwo)));
    }
  }

  private updatePlayerTwoFromRequest() {
    //gameSession from DB was created by requester, so pOneId of this session is pTwoId
    //for this client actually
    this.playerTwo = this.players.find(i => i.id === this.gameSession.pOneId);
    this.playerTwoChanged.next(this.playerTwo);
    console.log("---debug-updatePlayerTwoFromRequest: ", JSON.parse(JSON.stringify(this.playerTwo)));
  }

  startNewGame(pTwo: Player) {
    console.log("---debug-startNewGame: ", JSON.parse(JSON.stringify(this.playerOne)),
                                           JSON.parse(JSON.stringify(pTwo)));

    if(pTwo.id === this.playerOne.id) {
      return this.enableAI();
    }
    else {
      return this.updatePlayerOneStateInGame('inGame')
        .then(res => {
          return this.addPlayerTwoToLocalGame(pTwo)
            .then(res => {
              return this.createGameSession()
                .then(res => {
                  this.subscribeGameSession();
                  this.updateGameIdPlayerOne();
                  this.updatePlayerTwoGameIdAndStateRequested();
                });
            });
        });
    }
  }

  private enableAI() {
    console.log("---debug-enableAI");

    return this.updatePlayerOneStateInGame('inGame')
      .then(res => {
        this.isAIenabled = true;
        this.createAIPlayerTwo();
        this.createLocalGameSession()
        this.updateAIGameIdOnPlayers();
        return this.createEmptyPromise('enableAI Promise return');
      });
  }

  private createAIPlayerTwo() {
    console.log("---debug-createAIPlayerTwo");

    this.playerTwo = new PlayerImpl('AllbutIntelligent');
    this.playerTwo.id = 'playerAId'
    this.playerTwoChanged.next(this.playerTwo);
  }

  private createLocalGameSession() {
    console.log("---debug-createLocalGameSession");

    var gameId = this.playerOne.name + 'VsAI';
    this.gameSession = new GameSessionImpl(gameId, this.playerOne.id, this.playerTwo.id);
    this.sessionChanged.next(this.gameSession);
  }

  private updateAIGameIdOnPlayers() {
    console.log("---debug-updateAIGameIdOnPlayers");

    this.playerOne.gameId = this.gameSession.gId;
    this.playerTwo.gameId = this.gameSession.gId;
  }

  private createEmptyPromise(logMessage: string) {
    var promise = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        console.log("---debug-createEmptyPromise: " + logMessage);
        resolve();
        }, 1);
      });
    return promise;
  }

  updatePlayerOneStateInGame(state: string) {
    return this.db.collection('players').doc(this.playerOne.id).update({state: state})
      .then(result => {
        this.playerOne = this.players.find(i => i.id === this.playerOne.id);
        this.playerOneChanged.next(this.playerOne);
        console.log("---debug-updatePlayerOneStateInGame: ", JSON.parse(JSON.stringify(this.playerOne)));
      });
  }

  private addPlayerTwoToLocalGame(pTwo: Player) {
    this.playerTwo = this.players.find(i => i.id === pTwo.id);
    this.playerTwoChanged.next(this.playerTwo);
    console.log("---debug-addPlayerTwoToLocalGame: ", JSON.parse(JSON.stringify(this.playerTwo)));
    return this.createEmptyPromise('addPlayerTwoToLocalGame');
  }

  private createGameSession() {
    this.gameSession = new GameSessionImpl('', this.playerOne.id, this.playerTwo.id);
    return this.db.collection('games').add({...this.gameSession})
      .then(docRef => {
        this.gameSession.gId = docRef.id;
        this.sessionChanged.next(this.gameSession);
        console.log("---debug-createGameSession: ", JSON.parse(JSON.stringify(this.gameSession)));
      });
  }

  private subscribeGameSession() {
    this.sessionSub = this.db.collection('games').doc(this.gameSession.gId).snapshotChanges()
      .subscribe(doc => {
        if(doc.payload.data()) {
          this.gameSession.result = (doc.payload.data() as GameSession).result;
          this.sessionChanged.next(this.gameSession);
          console.log("---debug-subscribeGameSession: ", JSON.parse(JSON.stringify(this.gameSession)));
        }
        else {
          this.gameSession = null;
          this.sessionChanged.next(this.gameSession);
        }
        console.log("---debug-subscribeGameSession: ", JSON.parse(JSON.stringify(this.gameSession)));
      });
  }

  private updateGameIdPlayerOne() {
    this.db.collection('players').doc(this.playerOne.id).update({gameId: this.gameSession.gId})
      .then(result => {
        this.playerOne.gameId = this.gameSession.gId;
        this.playerOneChanged.next(this.playerOne);
        console.log("---debug-updateGameIdPlayerOne: ", JSON.parse(JSON.stringify(this.playerOne)));
      });
  }

  private updatePlayerTwoGameIdAndStateRequested() {
    this.db.collection('players').doc(this.playerTwo.id).update({gameId: this.gameSession.gId, state: 'requested'})
      .then(result => {
        this.playerTwo = this.players.find(i => i.id === this.playerTwo.id);
        this.playerTwoChanged.next(this.playerTwo);
        console.log("---debug-addPlayerTwo: ", JSON.parse(JSON.stringify(this.playerTwo)));
    });
  }

  updatePlayerOneChoiceAndTryEvaluate(choice: string) {
    console.log('---debug-updatePlayerOneChoiceAndTryEvaluate: ' + choice);

    if(this.isAIenabled) {
      this.evaluateResultAI(choice);
    }
    else {
      this.updatePlayerChoiceInDB(choice)
        .then(ref => {
          if(this.playerTwo.lastChosen != '') {
            let result = this.evaluateWinner();
            this.updateGameResultInDB(result);
          }
        });
    }
  }

  private evaluateResultAI(choice: string) {
    this.updatePlayerChoiceAIGame(choice);
    var generatedChoice = this.generateRandomChoiceOnAIPlayer();
    this.updateChoiceAIPlayer(generatedChoice);
    let result = this.evaluateWinner();
    this.updateAIGameResult(result);
  }

  private updatePlayerChoiceAIGame(choice: string) {
    this.playerOne.lastChosen = choice;
    this.playerOneChanged.next(this.playerOne);
  }

  private generateRandomChoiceOnAIPlayer() {
    var randomIndex = this.generateRandomNatFromZeroTillMax(5);
    return this.possibleChoices[randomIndex];
  }

  private generateRandomNatFromZeroTillMax(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  private updateChoiceAIPlayer(generatedChoice) {
    this.playerTwo.lastChosen = generatedChoice;
    this.playerTwoChanged.next(this.playerTwo);
  }

  private updatePlayerChoiceInDB(choice: string) {
    return this.db.collection('players').doc(this.playerOne.id).update({lastChosen: choice})
      .then(ref => {
        this.playerOne.lastChosen = choice;
        this.playerOneChanged.next(this.playerOne);
      });
  }

  private evaluateWinner() {
    console.log("---debug-evaluateWinner");

    if(!this.playerOne.lastChosen || !this.playerTwo.lastChosen) {
      console.error("---error: could not evaluate winner!",
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
      this.updatePlayerOneWinCount();
      return 'Player ' + this.playerOne.name + ' wins!';
    }
    else {
      this.playerTwo.winCount++;
      this.updatePlayerTwoWinCount();
      return 'Player ' + this.playerTwo.name + ' wins!'
    }
  }

  private updatePlayerOneWinCount() {
    if(this.isAIenabled) {
      this.playerOneChanged.next(this.playerOne);
    }
    else {
      this.db.collection('players').doc(this.playerOne.id).update({winCount: this.playerOne.winCount})
        .then(ref => {
          this.playerOneChanged.next(this.playerOne);
        });
    }
  }

  private updatePlayerTwoWinCount() {
    if(this.isAIenabled) {
      this.playerTwoChanged.next(this.playerTwo);
    }
    else {
      this.db.collection('players').doc(this.playerTwo.id).update({winCount: this.playerTwo.winCount})
        .then(ref => {
          this.playerTwoChanged.next(this.playerTwo);
        });
    }
  }

  private updateAIGameResult(result: string) {
      this.gameSession.result = result;
      this.sessionChanged.next(this.gameSession);
  }

  private updateGameResultInDB(result: string) {
    this.db.collection('games').doc(this.gameSession.gId).update({result: result})
      .then(ref => {
        this.gameSession.result = result;
        this.sessionChanged.next(this.gameSession);
      });
  }

  resetApp() {
    this.cancelSubscriptions();
    return this.cancelGameSession()
      .then(ref => {
          return this.resetClientsidePlayersAndRemovePlayerFromDB();
      });
  }

  private cancelSubscriptions() {
  this.fbSubs.forEach(sub => sub.unsubscribe());
    console.log("---debug-cancelSubscriptions");
  }

  cancelGameSession() {
    console.log('---debug-cancelGameSession:');

    if(this.isAIenabled) {
      return this.disableAI();
    }
    else {
      return this.cancelGameSessionInDB();
    }
  }

  private disableAI() {
    console.log('---debug-disableAI');
    this.isAIenabled = false;
    this.resetAISession();
    this.resetAIPlayer();
    return this.resetPlayerOneGameSession();
  }

  private resetAISession() {
    console.log('---debug-resetAISession');
    this.gameSession = null;
    this.sessionChanged.next(this.gameSession);
  }

  private resetAIPlayer() {
    console.log('---debug-resetAIPlayer');
    this.playerTwo = null;
    this.playerTwoChanged.next(this.playerTwo);
  }

  private cancelGameSessionInDB() {
    this.sessionSub.unsubscribe();

    if(this.gameSession) {
      return this.db.collection('games').doc(this.gameSession.gId).delete()
        .then(ref => {
          console.log('---debug-cancelGameSession');
          this.gameSession = null;
          this.sessionChanged.next(this.gameSession);
          return this.resetPlayerTwo()
            .then(ref => {
              return this.resetPlayerOneGameSession();
            });
        });
    }
    else {
      return this.createEmptyPromise('cancelGameSession: session already null! resolved anyways!');
    }
  }

  private resetPlayerTwo() {
    return this.db.collection('players').doc(this.playerTwo.id).update({gameId: null, lastChosen: '', state: 'waiting'})
      .then(ref => {
        this.playerTwo = null;
        this.playerTwoChanged.next(this.playerTwo);
        console.log("---debug-resetPlayerTwo");
      });
  }

  private resetPlayerOneGameSession() {
    return this.db.collection('players').doc(this.playerOne.id).update({gameId: null, lastChosen: '', state: 'waiting'})
      .then(ref => {
        this.playerOne = this.players.find(i => i.id === this.playerOne.id);
        this.playerOneChanged.next(this.playerOne);
        console.log("---debug-resetPlayerOneGameSession");
      });
  }

  private resetClientsidePlayersAndRemovePlayerFromDB() {
    if(this.playerOne) {
      return this.db.collection('players').doc(this.playerOne.id).delete()
        .then(ref => {
          console.log('---debug-resetPlayers');
          this.playerOne = null;
          this.playerTwo = null;
      });
    }
    else {
      return this.createEmptyPromise('resetPlayers: playerOne already null! resolved anyways!');
    }
  }

  resetGame() {
    console.log("---debug-resetGame");

    if(this.isAIenabled) {
      this.resetAIGameResult();
      this.resetLastChosenOnPlayersAI();
    }
    else {
      this.resetGameResultInDB()
        .then(ref => {
          this.resetLastChosenOnPlayers();
        });
    }
  }

  private resetAIGameResult() {
    this.gameSession.result = null;
    this.sessionChanged.next(this.gameSession);
    console.log("---debug-resetAIGameResult");
  }

  private resetLastChosenOnPlayersAI() {
    console.log("---debug-resetLastChosenOnPlayersAI");
    this.playerOne.lastChosen = '';
    this.playerOneChanged.next(this.playerOne);
    this.playerTwo.lastChosen = '';
    this.playerTwoChanged.next(this.playerTwo);
  }

  private resetGameResultInDB() {
    return this.db.collection('games').doc(this.gameSession.gId).update({result: null})
      .then(ref => {
        this.gameSession.result = null;
        this.sessionChanged.next(this.gameSession);
        console.log("---debug-resetGameResultInDB");
      });
  }

  /**
   *in case a game has been canceled by the opponent,
   *only the own client has to be cleaned up
   */
  cleanUpAbortedSession() {
    console.log("---debug-cleanUpAbortedSession");
    this.playerTwo = null;
    this.playerTwoChanged.next(this.playerTwo);
  }

  private resetLastChosenOnPlayers() {
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
