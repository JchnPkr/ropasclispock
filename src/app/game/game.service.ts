import { Injectable } from '@angular/core';
import { AngularFirestore } from 'angularfire2/firestore';
import 'rxjs/Rx';
import { Subject } from 'rxjs/Subject';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { NGXLogger } from 'ngx-logger';

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

  constructor(private db: AngularFirestore,
              private logger: NGXLogger) {}

  addPlayerOneToDB(pOne: Player) {
    this.db.collection('players').add({...pOne})
      .then(docRef => {
        this.playerOne = pOne;
        this.playerOne.id = docRef.id;
        this.playerOneChanged.next(this.playerOne);
        this.logger.debug("addPlayerOneToDB: ", JSON.parse(JSON.stringify(this.playerOne)));
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
        this.logger.debug("fetchAvailablePlayers ", JSON.parse(JSON.stringify(this.players)));

        this.updatePlayerOne();

        if(this.playerOne.state ===  'inGame') {
          this.updatePlayerTwo();
        }
        else if((this.playerOne.state === 'requested') || (this.playerOne.state === 'accepted')) {
          if(this.playerOne.state === 'requested') {
            this.subscribeGameSessionFromRequest()
              .then(ref => {
                this.updatePlayerTwoFromRequest();
              });
          }
          else {
            this.updatePlayerTwoFromRequest();
          }
        }
      }));
  }

  private updatePlayerOne() {
    this.playerOne = this.players.find(i => i.id === this.playerOne.id);
    this.playerOneChanged.next(this.playerOne);
    this.logger.debug("updatePlayerOne: ", JSON.parse(JSON.stringify(this.playerOne)));
  }

  private subscribeGameSessionFromRequest() {
    var gId = this.playerOne.gameId;
    return new Promise((resolve,reject) => {
      this.sessionSub = this.db.collection('games').doc(gId).snapshotChanges()
        .subscribe(doc => {
          if(doc.payload.data()) {
            //gameSession from DB was created by requester, so pOneId of this session is pTwoId
            //for this client actually
            var pTwoId = (doc.payload.data() as GameSession).pOneId;
            this.gameSession = new GameSessionImpl(doc.payload.id, pTwoId, this.playerOne.id);
            this.gameSession.result = (doc.payload.data() as GameSession).result;
            this.sessionChanged.next(this.gameSession);
            this.logger.debug("subscribeGameSessionFromRequest: ", JSON.parse(JSON.stringify(this.gameSession)));
          }
          else {
            this.gameSession = null;
            this.logger.debug("subscribeGameSessionFromRequest: ", JSON.parse(JSON.stringify(this.gameSession)));
            this.sessionChanged.next(this.gameSession);
          }
          resolve(true)
        }, (err) => {
          resolve(false);
        });
    });
  }

  private updatePlayerTwo() {
    if(!this.isAIenabled && this.playerTwo && this.gameSession) {
      this.playerTwo = this.players.find(i => i.id === this.gameSession.pTwoId);
      this.playerTwoChanged.next(this.playerTwo);
      this.logger.debug("updatePlayerTwo: ", JSON.parse(JSON.stringify(this.playerTwo)));
    }
  }

  private updatePlayerTwoFromRequest() {
    if(this.gameSession) {
      //gameSession from DB was created by requester, so pOneId of this session is pTwoId
      //for this client actually
      this.playerTwo = this.players.find(i => i.id === this.gameSession.pOneId);
      this.playerTwoChanged.next(this.playerTwo);
      this.logger.debug("updatePlayerTwoFromRequest: ", JSON.parse(JSON.stringify(this.playerTwo)));
    }
  }

  startNewGame(pTwo: Player) {
    this.logger.debug("startNewGame: ", JSON.parse(JSON.stringify(this.playerOne)),
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
    this.logger.debug("enableAI");

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
    this.logger.debug("createAIPlayerTwo");

    this.playerTwo = new PlayerImpl('AllbutIntelligent');
    this.playerTwo.id = 'playerAId'
    this.playerTwoChanged.next(this.playerTwo);
  }

  private createLocalGameSession() {
    this.logger.debug("createLocalGameSession");

    var gameId = this.playerOne.name + 'VsAI';
    this.gameSession = new GameSessionImpl(gameId, this.playerOne.id, this.playerTwo.id);
    this.sessionChanged.next(this.gameSession);
  }

  private updateAIGameIdOnPlayers() {
    this.logger.debug("updateAIGameIdOnPlayers");

    this.playerOne.gameId = this.gameSession.gId;
    this.playerTwo.gameId = this.gameSession.gId;
  }

  private createEmptyPromise(logMessage: string) {
    var promise = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        this.logger.debug("createEmptyPromise: " + logMessage);
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
        this.logger.debug("updatePlayerOneStateInGame: ", JSON.parse(JSON.stringify(this.playerOne)));
      });
  }

  private addPlayerTwoToLocalGame(pTwo: Player) {
    this.playerTwo = this.players.find(i => i.id === pTwo.id);
    this.playerTwoChanged.next(this.playerTwo);
    this.logger.debug("addPlayerTwoToLocalGame: ", JSON.parse(JSON.stringify(this.playerTwo)));
    return this.createEmptyPromise('addPlayerTwoToLocalGame');
  }

  private createGameSession() {
    this.gameSession = new GameSessionImpl('', this.playerOne.id, this.playerTwo.id);
    return this.db.collection('games').add({...this.gameSession})
      .then(docRef => {
        this.gameSession.gId = docRef.id;
        this.sessionChanged.next(this.gameSession);
        this.logger.debug("createGameSession: ", JSON.parse(JSON.stringify(this.gameSession)));
      });
  }

  private subscribeGameSession() {
    this.sessionSub = this.db.collection('games').doc(this.gameSession.gId).snapshotChanges()
      .subscribe(doc => {
        if(doc.payload.data()) {
          this.gameSession.result = (doc.payload.data() as GameSession).result;
          this.sessionChanged.next(this.gameSession);
          this.logger.debug("subscribeGameSession: ", JSON.parse(JSON.stringify(this.gameSession)));
        }
        else {
          this.gameSession = null;
          this.logger.debug("subscribeGameSession: ", JSON.parse(JSON.stringify(this.gameSession)));
          this.sessionChanged.next(this.gameSession);
        }
      });
  }

  private updateGameIdPlayerOne() {
    this.db.collection('players').doc(this.playerOne.id).update({gameId: this.gameSession.gId})
      .then(result => {
        this.playerOne.gameId = this.gameSession.gId;
        this.playerOneChanged.next(this.playerOne);
        this.logger.debug("updateGameIdPlayerOne: ", JSON.parse(JSON.stringify(this.playerOne)));
      });
  }

  private updatePlayerTwoGameIdAndStateRequested() {
    this.db.collection('players').doc(this.playerTwo.id).update({gameId: this.gameSession.gId, state: 'requested'})
      .then(result => {
        this.playerTwo = this.players.find(i => i.id === this.playerTwo.id);
        this.playerTwoChanged.next(this.playerTwo);
        this.logger.debug("updatePlayerTwoGameIdAndStateRequested: ", JSON.parse(JSON.stringify(this.playerTwo)));
    });
  }

  updatePlayerOneChoiceAndTryEvaluate(choice: string) {
    this.logger.debug('updatePlayerOneChoiceAndTryEvaluate: ' + choice);

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
    this.logger.debug('evaluateResultAI');
    this.updatePlayerChoiceAIGame(choice);
    var generatedChoice = this.generateRandomChoiceOnAIPlayer();
    this.updateChoiceAIPlayer(generatedChoice);
    let result = this.evaluateWinner();
    this.updateAIGameResult(result);
  }

  private updatePlayerChoiceAIGame(choice: string) {
    this.logger.debug('updatePlayerChoiceAIGame');
    this.playerOne.lastChosen = choice;
    this.playerOneChanged.next(this.playerOne);
  }

  private generateRandomChoiceOnAIPlayer() {
    this.logger.debug('generateRandomChoiceOnAIPlayer');
    var randomIndex = this.generateRandomNatFromZeroTillMax(5);
    return this.possibleChoices[randomIndex];
  }

  private generateRandomNatFromZeroTillMax(max: number) {
    this.logger.debug('generateRandomNatFromZeroTillMax');
    return Math.floor(Math.random() * Math.floor(max));
  }

  private updateChoiceAIPlayer(generatedChoice) {
    this.logger.debug('updateChoiceAIPlayer');
    this.playerTwo.lastChosen = generatedChoice;
    this.playerTwoChanged.next(this.playerTwo);
  }

  private updatePlayerChoiceInDB(choice: string) {
    return this.db.collection('players').doc(this.playerOne.id).update({lastChosen: choice})
      .then(ref => {
        this.logger.debug('updatePlayerChoiceInDB');
        this.playerOne.lastChosen = choice;
        this.playerOneChanged.next(this.playerOne);
      });
  }

  private evaluateWinner() {
    this.logger.debug("evaluateWinner");

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
    this.logger.debug('updatePlayerOneWinCount');
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
    this.logger.debug('updatePlayerTwoWinCount');
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
    this.logger.debug('updateAIGameResult');
      this.gameSession.result = result;
      this.sessionChanged.next(this.gameSession);
  }

  private updateGameResultInDB(result: string) {
    this.db.collection('games').doc(this.gameSession.gId).update({result: result})
      .then(ref => {
        this.logger.debug('updateGameResultInDB');
        this.gameSession.result = result;
        this.sessionChanged.next(this.gameSession);
      });
  }

  resetApp() {
    this.logger.debug('resetApp');
    this.cancelSubscriptions();
    return this.cancelGameSession()
      .then(ref => {
          return this.resetClientsidePlayersAndRemovePlayerFromDB();
      });
  }

  private cancelSubscriptions() {
  this.fbSubs.forEach(sub => sub.unsubscribe());
    this.logger.debug("cancelSubscriptions");
  }

  cancelGameSession() {
    this.logger.debug('cancelGameSession');

    if(this.isAIenabled) {
      return this.disableAI();
    }
    else {
      return this.cancelGameSessionInDB();
    }
  }

  private disableAI() {
    this.logger.debug('disableAI');
    this.isAIenabled = false;
    this.resetAISession();
    this.resetAIPlayer();
    return this.resetPlayerOneGameSession();
  }

  private resetAISession() {
    this.logger.debug('resetAISession');
    this.gameSession = null;
    this.sessionChanged.next(this.gameSession);
  }

  private resetAIPlayer() {
    this.logger.debug('resetAIPlayer');
    this.playerTwo = null;
    this.playerTwoChanged.next(this.playerTwo);
  }

  private cancelGameSessionInDB() {
    if(this.gameSession) {
      this.sessionSub.unsubscribe();
      return this.db.collection('games').doc(this.gameSession.gId).delete()
        .then(ref => {
          this.logger.debug('cancelGameSessionInDB');
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
        this.logger.debug("resetPlayerTwo");
      });
  }

  private resetPlayerOneGameSession() {
    return this.db.collection('players').doc(this.playerOne.id).update({gameId: null, lastChosen: '', state: 'waiting'})
      .then(ref => {
        this.playerOne = this.players.find(i => i.id === this.playerOne.id);
        this.playerOneChanged.next(this.playerOne);
        this.logger.debug("resetPlayerOneGameSession");
      });
  }

  private resetClientsidePlayersAndRemovePlayerFromDB() {
    if(this.playerOne) {
      return this.db.collection('players').doc(this.playerOne.id).delete()
        .then(ref => {
          this.logger.debug('resetClientsidePlayersAndRemovePlayerFromDB');
          this.playerOne = null;
          this.playerTwo = null;
      });
    }
    else {
      return this.createEmptyPromise('resetPlayers: playerOne already null! resolved anyways!');
    }
  }

  resetGame() {
    this.logger.debug("resetGame");

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
    this.logger.debug("resetAIGameResult");
  }

  private resetLastChosenOnPlayersAI() {
    this.logger.debug("resetLastChosenOnPlayersAI");
    this.playerOne.lastChosen = '';
    this.playerOneChanged.next(this.playerOne);
    this.playerTwo.lastChosen = '';
    this.playerTwoChanged.next(this.playerTwo);
  }

  private resetGameResultInDB() {
    return this.db.collection('games').doc(this.gameSession.gId).update({result: null})
      .then(ref => {
        this.gameSession.result = null;
        this.logger.debug("resetGameResultInDB");
        this.sessionChanged.next(this.gameSession);
      });
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
      this.logger.debug("resetLastChosenOnPlayers");
    }
    else {
      this.logger.debug("resetLastChosenOnPlayers: Last choice already reset. Nothing to do.");
    }
  }

  /**
   *in case a game has been canceled by the opponent,
   *only the own client has to be cleaned up
   */
  cleanUpAbortedSession() {
    this.logger.debug("cleanUpAbortedSession");
    this.playerTwo = null;
    this.playerTwoChanged.next(this.playerTwo);
  }
}
