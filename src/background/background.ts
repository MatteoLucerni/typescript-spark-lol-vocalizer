// src/background.ts

import {
  OWGames,
  OWGameListener,
  OWWindow
} from '@overwolf/overwolf-api-ts';

import { kWindowNames, kGameClassIds } from "../consts";
import { speak } from './speech';

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
      speak("L'applicazione è stata avviata.");
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
      this.handleGameStart();
    } else {
      this._windows[kWindowNames.desktop].restore();
      this._windows[kWindowNames.inGame].close();
      this.handleGameEnd();
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

  // Handle game start events
  private handleGameStart() {
    speak("La partita è iniziata.");
    console.log("Messaggio di avvio partita inviato.");
    // Puoi aggiungere ulteriori avvisi o logica qui
  }

  // Handle game end events
  private handleGameEnd() {
    speak("La partita è terminata.");
    console.log("Messaggio di fine partita inviato.");
    // Puoi aggiungere ulteriori avvisi o logica qui
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
  speak('Hello!');
  console.log('Evento ricevuto:', event);

  try {
    switch (event.name) {
      case "kill":
        const killData = JSON.parse(event.data);
        const killMessage = `Hai effettuato un ${killData.label}.`;
        console.log(killMessage);
        speak(killMessage);
        break;
      case "death":
        const deathMessage = "Il tuo campione è stato ucciso.";
        console.log(deathMessage);
        speak(deathMessage);
        break;
      case "respawn":
        const respawnMessage = "Il tuo campione è rinato.";
        console.log(respawnMessage);
        speak(respawnMessage);
        break;
      case "jungle_camps":
        const campData = JSON.parse(event.data);
        console.log('Dati del jungle_camps:', campData);
        if (campData.name === "Dragon") {
          if (campData.alive && !isDragonSpawned) {
            const dragonSpawnMessage = "Il drake sta spawnando!";
            console.log(dragonSpawnMessage);
            speak(dragonSpawnMessage);
            isDragonSpawned = true;
          } else if (!campData.alive && isDragonSpawned) {
            const dragonDeathMessage = "Il drake è stato ucciso!";
            console.log(dragonDeathMessage);
            speak(dragonDeathMessage);
            isDragonSpawned = false;
          }
        }
        break;
      // Aggiungi altri casi per gestire altri eventi
      default:
        console.log(`Evento non gestito: ${event.name}`);
    }
  } catch (error) {
    console.error(`Errore nella gestione dell'evento ${event.name}:`, error);
  }
}
