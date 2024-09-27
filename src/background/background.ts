// src/background.ts

import {
  OWGames,
  OWGameListener,
  OWWindow
} from '@overwolf/overwolf-api-ts';

import { kWindowNames, kGameClassIds } from "../consts";
import { playAudio } from './speech';

import RunningGameInfo = overwolf.games.RunningGameInfo;
import AppLaunchTriggeredEvent = overwolf.extensions.AppLaunchTriggeredEvent;

class BackgroundController {
  private static _instance: BackgroundController;
  private _windows: Record<string, OWWindow> = {};
  private _gameListener: OWGameListener;
  private isDragonSpawned = false;

  private constructor() {
    this._windows[kWindowNames.desktop] = new OWWindow(kWindowNames.desktop);
    this._windows[kWindowNames.inGame] = new OWWindow(kWindowNames.inGame);

    this._gameListener = new OWGameListener({
      onGameStarted: this.toggleWindows.bind(this),
      onGameEnded: this.toggleWindows.bind(this)
    });

    overwolf.extensions.onAppLaunchTriggered.addListener(
      e => this.onAppLaunchTriggered(e)
    );
  };

  public static instance(): BackgroundController {
    if (!BackgroundController._instance) {
      BackgroundController._instance = new BackgroundController();
    }

    return BackgroundController._instance;
  }

  public async run() {
    this._gameListener.start();

    const currWindowName = (await this.isSupportedGameRunning())
      ? kWindowNames.inGame
      : kWindowNames.desktop;

    this._windows[currWindowName].restore();

    // Imposta le features richieste per gli eventi di gioco
    this.setRequiredGameFeatures();

    // Registra il listener per gli eventi di gioco
    this.registerGameEventsListener();

    if (currWindowName === kWindowNames.inGame) {
      setTimeout(() => {
        playAudio("window-loaded.mp3");
        console.log("Messaggio di avvio applicazione inviato.");
      }, 1000);
    }
  }

  private setRequiredGameFeatures() {
    const requiredFeatures = [
      'gep_internal',
      'live_client_data',
      'matchState',
      'match_info',
      'death',
      'respawn',
      'abilities',
      'kill',
      'assist',
      'gold',
      'minions',
      'summoner_info',
      'gameMode',
      'teams',
      'level',
      'announcer',
      'counters',
      'damage',
      'heal',
      'jungle_camps',
      'team_frames',
      'chat'
    ];
    overwolf.games.events.setRequiredFeatures(requiredFeatures, (info) => {
      if (info.success) {
        console.log('Features richieste impostate con successo:', requiredFeatures);
      } else {
        console.error('Errore nell\'impostare le features richieste:', info.error);
      }
    });
  }

  private registerGameEventsListener() {
    overwolf.games.events.onNewEvents.removeListener(this.onNewEvents);
    overwolf.games.events.onNewEvents.addListener(this.onNewEvents);

    overwolf.games.events.onInfoUpdates2.removeListener(this.onInfoUpdates);
    overwolf.games.events.onInfoUpdates2.addListener(this.onInfoUpdates);
  }

  private onNewEvents = (eventData: overwolf.games.events.NewGameEvents) => {
    console.log('Nuovi eventi di gioco ricevuti:', eventData);
    eventData.events.forEach(event => {
      this.handleGameEvent(event);
    });
  }

  private onInfoUpdates = (infoData: overwolf.games.events.InfoUpdates2Event) => {
    console.log('Nuovi info updates ricevuti:', infoData);
    // Invia gli aggiornamenti delle informazioni alla finestra in-game
    overwolf.windows.sendMessage("in_game", "info_update", infoData, (result) => {
      if (result.success) {
        console.log("Info update inviato alla finestra in-game con successo");
      } else {
        console.error("Errore nell'inviare l'info update alla finestra in-game:", result.error);
      }
    });
  }

  private handleGameEvent(event: overwolf.games.events.GameEvent) {
    console.log('Evento ricevuto:', event);

    try {
      switch (event.name) {
        case "kill":
          // Gestione dell'evento kill
          break;
        case "death":
          // Gestione dell'evento death
          break;
        case "respawn":
          // Gestione dell'evento respawn
          break;
        case "jungle_camps":
          const campData = JSON.parse(event.data);
          console.log('Dati del jungle_camps:', campData);
          if (campData.name === "Dragon") {
            if (campData.alive && !this.isDragonSpawned) {
              console.log("Il drake sta spawnando!");
              playAudio('dragon.mp3');
              this.isDragonSpawned = true;
            } else if (!campData.alive && this.isDragonSpawned) {
              console.log("Il drake è stato ucciso!");
              playAudio('dragon-slain.mp3');
              this.isDragonSpawned = false;
            }
          }
          break;
        default:
          console.log(`Evento non gestito: ${event.name}`);
      }
    } catch (error) {
      console.error(`Errore nella gestione dell'evento ${event.name}:`, error);
    }

     // Invia l'evento alla finestra in-game
     overwolf.windows.sendMessage("in_game", "game_event", event, (result) => {
      if (result.success) {
        console.log("Evento inviato alla finestra in-game con successo");
      } else {
        console.error("Errore nell'inviare l'evento alla finestra in-game:", result.error);
      }
    });
  }

  private async onAppLaunchTriggered(e: AppLaunchTriggeredEvent) {
    console.log('onAppLaunchTriggered():', e);

    if (!e || e.origin.includes('gamelaunchevent')) {
      return;
    }

    if (await this.isSupportedGameRunning()) {
      this._windows[kWindowNames.desktop].close();
      this._windows[kWindowNames.inGame].restore();
    } else {
      this._windows[kWindowNames.desktop].restore();
      this._windows[kWindowNames.inGame].close();
    }
  }

  private toggleWindows(info: RunningGameInfo) {
    if (!info || !this.isSupportedGame(info)) {
      return;
    }

    if (info.isRunning) {
      this._windows[kWindowNames.desktop].close();
      this._windows[kWindowNames.inGame].restore();
    } else {
      this._windows[kWindowNames.desktop].restore();
      this._windows[kWindowNames.inGame].close();
    }
  }

  private async isSupportedGameRunning(): Promise<boolean> {
    const info = await OWGames.getRunningGameInfo();

    return info && info.isRunning && this.isSupportedGame(info);
  }

  private isSupportedGame(info: RunningGameInfo) {
    return kGameClassIds.includes(info.classId);
  }
}

BackgroundController.instance().run();
