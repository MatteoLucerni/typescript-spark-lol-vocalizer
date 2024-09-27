// src/background.ts

import {
  OWGames,
  OWGameListener,
  OWWindow
} from '@overwolf/overwolf-api-ts';

import { kWindowNames, kGameClassIds } from "../consts";
import { playAudio } from './speech'; // Importa playAudio


import RunningGameInfo = overwolf.games.RunningGameInfo;
import AppLaunchTriggeredEvent = overwolf.extensions.AppLaunchTriggeredEvent;

// BackgroundController class remains as defined
class BackgroundController {
  private static _instance: BackgroundController;
  private _windows: Record<string, OWWindow> = {};
  private _gameListener: OWGameListener;

  private constructor() {
    // Populating the background controller's window dictionary
    this._windows[kWindowNames.desktop] = new OWWindow(kWindowNames.desktop);
    this._windows[kWindowNames.inGame] = new OWWindow(kWindowNames.inGame);

    // When a supported game is started or ended, toggle the app's windows
    this._gameListener = new OWGameListener({
      onGameStarted: this.toggleWindows.bind(this),
      onGameEnded: this.toggleWindows.bind(this)
    });

    overwolf.extensions.onAppLaunchTriggered.addListener(
      e => this.onAppLaunchTriggered(e)
    );
  };

  // Implementing the Singleton design pattern
  public static instance(): BackgroundController {
    if (!BackgroundController._instance) {
      BackgroundController._instance = new BackgroundController();
    }

    return BackgroundController._instance;
  }

// ... (il resto del codice rimane invariato)

// Start listening to game events
public async run() {
  this._gameListener.start();

  const currWindowName = (await this.isSupportedGameRunning())
    ? kWindowNames.inGame
    : kWindowNames.desktop;

  this._windows[currWindowName].restore();

  // Aggiungi questo codice per emettere un messaggio all'avvio
  if (currWindowName === kWindowNames.inGame) {
    // Attendi che la finestra in-game sia pronta
    setTimeout(() => {
      playAudio("window-loaded.mp3");
      console.log("Messaggio di avvio applicazione inviato.");
    }, 1000); // Ritardo di 1 secondo per assicurarsi che la finestra in-game sia pronta
  }
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

  // Identify whether the RunningGameInfo object references a supported game
  private isSupportedGame(info: RunningGameInfo) {
    return kGameClassIds.includes(info.classId);
  }
}

BackgroundController.instance().run();

// Variabile di stato per evitare avvisi multipli
let isDragonSpawned = false;

// Aggiungi la gestione degli eventi di gioco specifici

overwolf.games.events.onNewEvents.addListener((newEvents) => {
  // Accedi all'array 'events' all'interno di 'newEvents'
  newEvents.events.forEach(event => {
    handleGameEvent(event);
  });
});

function handleGameEvent(event: overwolf.games.events.GameEvent) {
  console.log('Sus:', event);
  console.log('Evento ricevuto:', event);

  try {
    switch (event.name) {
      // ... (altri casi)
      case "jungle_camps":
        const campData = JSON.parse(event.data);
        console.log('Dati del jungle_camps:', campData);
        if (campData.name === "Dragon") {
          if (campData.alive && !isDragonSpawned) {
            console.log("Il drake sta spawnando!");
            playAudio('dragon.mp3');
            isDragonSpawned = true;
          } else if (!campData.alive && isDragonSpawned) {
            console.log("Il drake è stato ucciso!");
            playAudio('dragon-slain.mp3'); // Usa un altro file audio se disponibile
            isDragonSpawned = false;
          }
        }
        break;
      // ... (altri casi)
    }
  } catch (error) {
    console.error(`Errore nella gestione dell'evento ${event.name}:`, error);
  }
}