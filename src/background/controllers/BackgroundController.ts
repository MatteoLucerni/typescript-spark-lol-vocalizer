// background/BackgroundController.ts

import {
  OWGames,
  OWGameListener,
  OWWindow
} from '@overwolf/overwolf-api-ts';

import { kWindowNames, kGameClassIds } from '../utils/consts';
import { playAudio } from '../utils/speech';
import { getTeamBySummonerName, delay, formatTime } from '../utils/utils';
import { GameEventHandlers } from './GameEventHandlers';

import RunningGameInfo = overwolf.games.RunningGameInfo;
import AppLaunchTriggeredEvent = overwolf.extensions.AppLaunchTriggeredEvent;

interface ExtendedInfoUpdate2 extends overwolf.games.events.InfoUpdates2Event {
  jungle_camps?: {
    [key: string]: any;
  };
  live_client_data?: {
    events?: any[];
    all_players?: string;
    active_player?: string;
    [key: string]: any;
  };
}

export class BackgroundController {
  private static _instance: BackgroundController;
  private _windows: Record<string, OWWindow> = {};
  private _gameListener: OWGameListener;

  // Variabili di stato
  public isDragonSpawned = false;

  // Variabili per il timer del Drago
  public nextDragonSpawnTime: number = 300; // Il Drago spawna inizialmente a 5 minuti
  public lastDragonKillTime: number | null = null;
  public alertSentForNextDragon: boolean = false;
  public lastMatchClockTime: number = 0;

  // Flag per evitare ripetizioni degli avvisi
  public blueSpawnAlertSent: boolean = false;
  public redSpawnAlertSent: boolean = false;
  public scuttleBotSpawnAlert: boolean = false;
  public scuttleTopSpawnAlert: boolean = false;

  public team: string | null = null;
  public summonerName: string | null = null;

  // Stato degli alert (di default tutti abilitati)
  public alertsEnabled = {
    redBuff: true,
    blueBuff: true,
    scuttleBot: true,
    scuttleTop: true,
    cannonWave: true,
  };

  private gameEventHandlers: GameEventHandlers;

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
  }

  public static instance(): BackgroundController {
    if (!BackgroundController._instance) {
      BackgroundController._instance = new BackgroundController();
    }

    return BackgroundController._instance;
  }

  public async run() {
    // Inizializza GameEventHandlers e passa il riferimento a this
    this.gameEventHandlers = new GameEventHandlers(BackgroundController.instance());
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

  private async setRequiredFeaturesWithRetry(requiredFeatures: string[], delayMs: number = 5000): Promise<void> {
    while (true) {
      try {
        await this.setRequiredFeatures(requiredFeatures);
        console.log('Features richieste impostate con successo:', requiredFeatures);
        break;
      } catch (error) {
        await delay(delayMs);
      }
    }
  }
  

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
        this.gameEventHandlers.checkDragonRespawnTimer(this.lastMatchClockTime);
        this.gameEventHandlers.handleCannonWaveTimings(this.lastMatchClockTime);
      }
      this.gameEventHandlers.handleGameEvent(event);
    });
  }

  private onInfoUpdates = (infoData: overwolf.games.events.InfoUpdates2Event) => {
    console.log('Nuovi info updates ricevuti:', infoData);

    const info = infoData.info as ExtendedInfoUpdate2;

    // Gestione degli aggiornamenti di jungle_camps
    if (info?.jungle_camps) {
      this.gameEventHandlers.handleJungleCampsInfoUpdate(info.jungle_camps);
    }

    if (info?.live_client_data?.all_players) {
      if (this.summonerName !== null) {
        const playersJson = info.live_client_data.all_players;
        const parsedData = JSON.parse(playersJson.toString());
        this.team = getTeamBySummonerName(this.summonerName, parsedData);
      }
    }

    if (info?.live_client_data?.active_player) {
      const activePlayerJson = info.live_client_data.active_player;
      const parsedAP = JSON.parse(activePlayerJson);
      this.summonerName = parsedAP.summonerName;
    }

    // Gestione live_client_data.events
    if (info?.live_client_data?.events) {
      // console.log('live_client_data.events:', info.live_client_data.events);
      this.gameEventHandlers.handleLiveClientData(info.live_client_data.events);
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
    } else if (message.id === "toggle_cannon_wave") {
      this.alertsEnabled.cannonWave = message.content.enabled;
      console.log(`Cannon Wave alert enabled: ${this.alertsEnabled.cannonWave}`);
    } else {
      console.log(`Messaggio non gestito: ${message.id}`);
    }
  }
}
