// src/background.ts

import {
  OWGames,
  OWGameListener,
  OWWindow
} from '@overwolf/overwolf-api-ts';

import { kWindowNames, kGameClassIds } from "../consts";
import { playAudio } from './speech'; // Importa playAudio da speech.ts

import RunningGameInfo = overwolf.games.RunningGameInfo;
import AppLaunchTriggeredEvent = overwolf.extensions.AppLaunchTriggeredEvent;

interface ExtendedInfoUpdate2 extends overwolf.games.events.InfoUpdate2 {
  jungle_camps?: {
    [key: string]: any;
  };
  live_client_data?: {
    events?: any[]; // Modifica il tipo per riflettere che è un array
    all_players?: string;
    active_player?: string;
    [key: string]: any;
  };
}

// Function to extract the team based on summonerName
function getTeamBySummonerName(summonerName: string, parsedData: any): string | null {
  for (let player of parsedData) {
    if (player.summonerName === summonerName) {
      return player.team;  // Return the team if the summonerName matches
    }
  }
  return null;  // Return null if no match is found
}

class BackgroundController {
  private static _instance: BackgroundController;
  private _windows: Record<string, OWWindow> = {};
  private _gameListener: OWGameListener;
  private isDragonSpawned = false;

  // Variabili per il timer del Drago
  private nextDragonSpawnTime: number = 300; // Il Drago spawna inizialmente a 5 minuti
  private lastDragonKillTime: number | null = null;
  private alertSentForNextDragon: boolean = false;
  private lastMatchClockTime: number = 0;

  // Flag per evitare ripetizioni degli avvisi
  private blueSpawnAlertSent: boolean = false;
  private redSpawnAlertSent: boolean = false;
  private scuttleBotSpawnAlert: boolean = false;
  private scuttleTopSpawnAlert: boolean = false;

  private team: string = null;
  private summonerName: string = null;

  // Stato degli alert (di default tutti abilitati)
  private alertsEnabled = {
    redBuff: true,
    blueBuff: true,
    scuttleBot: true,
    scuttleTop: true,
  };

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

    // Aggiungi il listener per i messaggi dalla finestra in-game
    overwolf.windows.onMessageReceived.addListener(this.onMessageReceived.bind(this));
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

    // Imposta le features richieste per gli eventi di gioco con ritentativi
    try {
      await this.setRequiredFeaturesWithRetry([
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
      ]);
    } catch (error) {
      console.error('Non è stato possibile impostare le features richieste. L\'app potrebbe non funzionare correttamente.');
      // Puoi decidere se terminare l'app o continuare comunque
      return;
    }

    // Registra il listener per gli eventi di gioco
    this.registerGameEventsListener();

    if (currWindowName === kWindowNames.inGame) {
      setTimeout(() => {
        playAudio("window-loaded.mp3");
        console.log("Messaggio di avvio applicazione inviato.");
      }, 1000);
    }
  }

  /**
   * Ritenta di impostare le features richieste con un numero massimo di tentativi e un intervallo di ritentativo.
   * @param requiredFeatures Le features richieste da impostare.
   * @param maxRetries Il numero massimo di tentativi.
   * @param delayMs L'intervallo di tempo tra i tentativi in millisecondi.
   */
  private async setRequiredFeaturesWithRetry(requiredFeatures: string[], maxRetries: number = 100, delayMs: number = 3000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.setRequiredFeatures(requiredFeatures);
        console.log('Features richieste impostate con successo:', requiredFeatures);
        return; // Esce dalla funzione se ha successo
      } catch (error) {
        console.error(`Tentativo ${attempt}: Errore nell'impostare le features richieste:`, error);
        if (attempt === maxRetries) {
          console.error('Numero massimo di tentativi raggiunto. Le features non sono state impostate correttamente.');
          throw error; // Rilancia l'errore dopo il massimo dei tentativi
        }
        // Attende prima del prossimo tentativo
        await this.delay(delayMs);
      }
    }
  }

  /**
   * Imposta le features richieste e ritorna una Promise che risolve se ha successo e rifiuta se fallisce.
   * @param requiredFeatures Le features richieste da impostare.
   */
  private setRequiredFeatures(requiredFeatures: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      overwolf.games.events.setRequiredFeatures(requiredFeatures, (info) => {
        if (info.success) {
          resolve();
        } else {
          reject(info.error);
        }
      });
    });
  }

  /**
   * Funzione di utilità per creare un delay.
   * @param ms Il numero di millisecondi da attendere.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      if (event.name === 'match_clock') {
        this.lastMatchClockTime = parseFloat(event.data);
        this.checkDragonRespawnTimer(this.lastMatchClockTime);
      }
      this.handleGameEvent(event);
    });
  }

  private onInfoUpdates = (infoData: overwolf.games.events.InfoUpdates2Event) => {
    console.log('Nuovi info updates ricevuti:', infoData);

    const info = infoData.info as ExtendedInfoUpdate2;

    // Gestione degli aggiornamenti di jungle_camps
    if (info?.jungle_camps) {
      this.handleJungleCampsInfoUpdate(info.jungle_camps);
    }

    if (info?.live_client_data?.all_players) {
      if (this.summonerName !== null) {
        //console.log('all players:', info.live_client_data.all_players);
        const playersJson = info.live_client_data.all_players;
  
        // Parse the JSON string into a JavaScript object
        const parsedData = JSON.parse(playersJson.toString());
  
        // Extract the "team" field
        this.team = getTeamBySummonerName(this.summonerName, parsedData);

        console.log(`Summoner ${this.summonerName} is on the ${this.team} team.`);
      }
    }

    if (info?.live_client_data?.active_player) {
      const activePlayerJson = info?.live_client_data?.active_player;

      const parsedAP = JSON.parse(activePlayerJson);

      this.summonerName = parsedAP.summonerName
      console.log(`Summoner Name: ${this.summonerName}`);
    }

    // Gestione live_client_data.events
    if (info?.live_client_data?.events) {
      console.log('live_client_data.events:', info.live_client_data.events);
      this.handleLiveClientData(info.live_client_data.events);
    }

    // Invia gli aggiornamenti delle informazioni alla finestra in-game solo se contiene jungle_camps
    if (info?.jungle_camps) {
      overwolf.windows.sendMessage("in_game", "info_update", infoData, (result) => {
        if (result.success) {
          console.log("Info update di jungle_camps inviato alla finestra in-game con successo");
        } else {
          console.error("Errore nell'inviare l'info update di jungle_camps alla finestra in-game:", result.error);
        }
      });
    }
  }

  private handleJungleCampsInfoUpdate(jungleCampsData: any) {
    console.log('Aggiornamento jungle_camps:', jungleCampsData);
    // Itera su tutti i campi della giungla aggiornati
    for (const campKey in jungleCampsData) {
      const campInfoString = jungleCampsData[campKey];
      const campInfo = JSON.parse(campInfoString);

      const campName = campInfo.name;
      const iconStatus = campInfo.icon_status;

      // Gestione specifica per il Drago
      if (campName === "Dragon") {
        if (campInfo.alive && !this.isDragonSpawned) {
          console.log("Il Drago è spawnato!");
          playAudio('dragon.mp3');
          this.isDragonSpawned = true;
        } else if (!campInfo.alive && this.isDragonSpawned) {
          console.log("Il Drago è stato ucciso!");
          this.isDragonSpawned = false;
          // L'evento DragonKill gestisce l'aggiornamento del timer
        }
      }

      // Gestione per campi che iniziano con "Red"
      if (campName.startsWith("Red")) {
        if (iconStatus === "2" && !this.redSpawnAlertSent) {
          console.log(`Il campo ${campName} sta per spawnare!`);
          if (this.alertsEnabled.redBuff) {
            if ((this.team === "ORDER" && campName.startsWith("Red West")) || 
                (this.team === "CHAOS" && campName.startsWith("Red East"))) {
              playAudio('red-spawn.mp3');
            } else {
              playAudio('enemy-red-spawn.mp3');
            }
          }
          this.redSpawnAlertSent = true;
        } else if (iconStatus !== "2" && this.redSpawnAlertSent) {
          // Reset del flag se lo stato cambia
          this.redSpawnAlertSent = false;
        }
      }

      // Gestione per campi che iniziano con "Blue"
      if (campName.startsWith("Blue")) {
        if (iconStatus === "2" && !this.blueSpawnAlertSent) {
          console.log(`Il campo ${campName} sta per spawnare!`);
          if (this.alertsEnabled.blueBuff) {
            if ((this.team === "ORDER" && campName.startsWith("Blue West")) || 
                (this.team === "CHAOS" && campName.startsWith("Blue East"))) {
              playAudio('blue-spawn.mp3');
            } else {
              playAudio('enemy-blue-spawn.mp3');
            }
          }
          this.blueSpawnAlertSent = true;
        } else if (iconStatus !== "2" && this.blueSpawnAlertSent) {
          // Reset del flag se lo stato cambia
          this.blueSpawnAlertSent = false;
        }
      }


      // Gestione dello scuttle bot side
      if (campName === "Scuttle Crab River Bot side") {
        if (iconStatus === "2" && !this.scuttleBotSpawnAlert) {
          console.log(`Il campo ${campName} sta per spawnare!`);
          if (this.alertsEnabled.scuttleBot) {
            playAudio('scuttle-bot-spawn.mp3');
          }
          this.scuttleBotSpawnAlert = true;
        } else if (iconStatus !== "2" && this.scuttleBotSpawnAlert) {
          // Reset del flag se lo stato cambia
          this.scuttleBotSpawnAlert = false;
        }
      }

      // Gestione dello scuttle top side
      if (campName === "Scuttle Crab River Top side") {
        if (iconStatus === "2" && !this.scuttleTopSpawnAlert) {
          console.log(`Il campo ${campName} sta per spawnare!`);
          if (this.alertsEnabled.scuttleTop) {
            playAudio('scuttle-top-spawn.mp3');
          }
          this.scuttleTopSpawnAlert = true;
        } else if (iconStatus !== "2" && this.scuttleTopSpawnAlert) {
          // Reset del flag se lo stato cambia
          this.scuttleTopSpawnAlert = false;
        }
      }
    }
  }

  private handleLiveClientData(eventsData: any[]) {
    try {
      if (eventsData) {
        eventsData.forEach((gameEvent: any) => {
          console.log('Evento ricevuto da live_client_data:', gameEvent);
          if (gameEvent.EventName === "DragonKill") {
            this.handleDragonKill(gameEvent);
          }
        });
      }
    } catch (error) {
      console.error('Errore nella gestione di live_client_data events:', error);
    }
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
        // Rimuoviamo la gestione dei messaggi di chat per il Drago
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

  private handleDragonKill(gameEvent: any) {
    const currentGameTime = gameEvent.EventTime;
    this.lastDragonKillTime = currentGameTime;
    this.nextDragonSpawnTime = this.lastDragonKillTime + 300; // 5 minuti dopo l'uccisione
    this.alertSentForNextDragon = false;
    console.log(`Drago ucciso al minuto ${this.formatTime(this.lastDragonKillTime)}. Prossimo respawn al minuto ${this.formatTime(this.nextDragonSpawnTime)}.`);
    playAudio('dragon-slain.mp3');
  }

  private checkDragonRespawnTimer(currentGameTime: number) {
    const timeUntilNextDragonSpawn = this.nextDragonSpawnTime - currentGameTime;

    if (timeUntilNextDragonSpawn <= 60 && timeUntilNextDragonSpawn > 0 && !this.alertSentForNextDragon) {
      this.alertSentForNextDragon = true;
      this.sendDragonSpawnAlert();
    }

    if (timeUntilNextDragonSpawn <= 0) {
      this.alertSentForNextDragon = false;
    }
  }

  private sendDragonSpawnAlert() {
    console.log("Il Drago respawnerà tra un minuto!");
    playAudio('one-min-drake.mp3');
  }

  private formatTime(timeInSeconds: number): string {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
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

  // Listener per i messaggi ricevuti dalla finestra in-game
  private onMessageReceived(message: overwolf.windows.MessageReceivedEvent) {
    if (message.id === "toggle_red_buff") {
      this.alertsEnabled.redBuff = message.content.enabled;
      console.log(`Red Buff alert enabled: ${this.alertsEnabled.redBuff}`);
    } else if (message.id === "toggle_blue_buff") {
      this.alertsEnabled.blueBuff = message.content.enabled;
      console.log(`Blue Buff alert enabled: ${this.alertsEnabled.blueBuff}`);
    } else if (message.id === "toggle_scuttle_bot") {
      this.alertsEnabled.scuttleBot = message.content.enabled;
      console.log(`Scuttle Bot alert enabled: ${this.alertsEnabled.scuttleBot}`);
    } else if (message.id === "toggle_scuttle_top") {
      this.alertsEnabled.scuttleTop = message.content.enabled;
      console.log(`Scuttle Top alert enabled: ${this.alertsEnabled.scuttleTop}`);
    } else {
      console.log(`Messaggio non gestito: ${message.id}`);
    }
  }
}

BackgroundController.instance().run();
