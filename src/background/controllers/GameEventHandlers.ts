// background/GameEventHandlers.ts

import { playAudio } from '../utils/speech';
import { formatTime } from '../utils/utils';
import { getTeamBySummonerName } from '../utils/utils';
import { BackgroundController } from './BackgroundController';

export class GameEventHandlers {
  private controller: BackgroundController; // Riferimento a BackgroundController

  private lastWaveNumberAlerted: number | null = null;
  private siegeSpawnFrequency: number = 3; // Inizialmente ogni 3 wave
  private currentWaveNumber: number = 0;
  private goldAlertSent: Boolean = false;

  constructor(controller: BackgroundController) {
    this.controller = controller;
  }

  public handleGameEvent(event: overwolf.games.events.GameEvent) {
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

  public handleGoldInfoUpdate(goldInfo: any) {
    const currentGold = goldInfo.gold
    console.log(`Current Gold: ${currentGold}`);

    if (currentGold >= 2000 && !this.goldAlertSent) {
      playAudio('gold.mp3');
      this.goldAlertSent = true
    }

    if(currentGold < 2000 && this.goldAlertSent) {
      this.goldAlertSent = false
    }
  }

  public handleCannonWaveTimings(currentGameTime: number) {
    // Ignora se oltre i 20 minuti
    if (currentGameTime > 1200) {
      return;
    }
  
    if (currentGameTime < 65) {
      return; // Prima wave non ancora spawnata
    }
  
    const elapsedTime = currentGameTime - 65;
    const waveNumber = Math.floor(elapsedTime / 30) + 1;
  
    // Evita di ripetere per la stessa wave
    if (waveNumber === this.currentWaveNumber) {
      return;
    }
  
    this.currentWaveNumber = waveNumber;
  
    // Determina la frequenza di spawn dei Siege minion
    if (currentGameTime <= 900) { // Fino a 15 minuti
      this.siegeSpawnFrequency = 3;
    } else if (currentGameTime <= 1200) { // 15-20 minuti
      this.siegeSpawnFrequency = 2;
    }
  
    // Determina se questa wave include un Siege minion
    const isSiegeWave = (waveNumber % this.siegeSpawnFrequency) === 0;
  
    if (isSiegeWave && this.lastWaveNumberAlerted !== waveNumber) {
      if (this.controller.alertsEnabled.cannonWave) {
        playAudio('cannon-wave.mp3');
      }
      this.lastWaveNumberAlerted = waveNumber;
      console.log(`Siege minion spawn nella wave ${waveNumber} al minuto ${formatTime(currentGameTime)}`);
    }
  }

  public handleJungleCampsInfoUpdate(jungleCampsData: any) {
    console.log('Aggiornamento jungle_camps:', jungleCampsData);
    // Itera su tutti i campi della giungla aggiornati
    for (const campKey in jungleCampsData) {
      const campInfoString = jungleCampsData[campKey];
      const campInfo = JSON.parse(campInfoString);

      const campName = campInfo.name;
      const iconStatus = campInfo.icon_status;

      // Gestione specifica per il Drago
      if (campName === "Dragon") {
        if (campInfo.alive && !this.controller.isDragonSpawned) {
          console.log("Il Drago è spawnato!");
          playAudio('dragon.mp3');
          this.controller.isDragonSpawned = true;
        } else if (!campInfo.alive && this.controller.isDragonSpawned) {
          console.log("Il Drago è stato ucciso!");
          this.controller.isDragonSpawned = false;
          // L'evento DragonKill gestisce l'aggiornamento del timer
        }
      }

      // Gestione per campi che iniziano con "Red"
      if (campName.startsWith("Red")) {
        if (iconStatus === "2" && !this.controller.redSpawnAlertSent) {
          console.log(`Il campo ${campName} sta per spawnare!`);
          if (this.controller.alertsEnabled.redBuff) {
            if ((this.controller.team === "ORDER" && campName.startsWith("Red West")) ||
                (this.controller.team === "CHAOS" && campName.startsWith("Red East"))) {
              playAudio('red-spawn.mp3');
            } else {
              playAudio('enemy-red-spawn.mp3');
            }
          }
          this.controller.redSpawnAlertSent = true;
        } else if (iconStatus !== "2" && this.controller.redSpawnAlertSent) {
          // Reset del flag se lo stato cambia
          this.controller.redSpawnAlertSent = false;
        }
      }

      // Gestione per campi che iniziano con "Blue"
      if (campName.startsWith("Blue")) {
        if (iconStatus === "2" && !this.controller.blueSpawnAlertSent) {
          console.log(`Il campo ${campName} sta per spawnare!`);
          if (this.controller.alertsEnabled.blueBuff) {
            if ((this.controller.team === "ORDER" && campName.startsWith("Blue West")) ||
                (this.controller.team === "CHAOS" && campName.startsWith("Blue East"))) {
              playAudio('blue-spawn.mp3');
            } else {
              playAudio('enemy-blue-spawn.mp3');
            }
          }
          this.controller.blueSpawnAlertSent = true;
        } else if (iconStatus !== "2" && this.controller.blueSpawnAlertSent) {
          // Reset del flag se lo stato cambia
          this.controller.blueSpawnAlertSent = false;
        }
      }

      // Gestione dello scuttle bot side
      if (campName === "Scuttle Crab River Bot side") {
        if (iconStatus === "2" && !this.controller.scuttleBotSpawnAlert) {
          console.log(`Il campo ${campName} sta per spawnare!`);
          if (this.controller.alertsEnabled.scuttleBot) {
            playAudio('scuttle-bot-spawn.mp3');
          }
          this.controller.scuttleBotSpawnAlert = true;
        } else if (iconStatus !== "2" && this.controller.scuttleBotSpawnAlert) {
          // Reset del flag se lo stato cambia
          this.controller.scuttleBotSpawnAlert = false;
        }
      }

      // Gestione dello scuttle top side
      if (campName === "Scuttle Crab River Top side") {
        if (iconStatus === "2" && !this.controller.scuttleTopSpawnAlert) {
          console.log(`Il campo ${campName} sta per spawnare!`);
          if (this.controller.alertsEnabled.scuttleTop) {
            playAudio('scuttle-top-spawn.mp3');
          }
          this.controller.scuttleTopSpawnAlert = true;
        } else if (iconStatus !== "2" && this.controller.scuttleTopSpawnAlert) {
          // Reset del flag se lo stato cambia
          this.controller.scuttleTopSpawnAlert = false;
        }
      }
    }
  }

  public handleLiveClientData(eventsData: any[]) {
    try {
      if (eventsData && Array.isArray(eventsData)) {
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

  public handleDragonKill(gameEvent: any) {
    const currentGameTime = gameEvent.EventTime;
    this.controller.lastDragonKillTime = currentGameTime;
    this.controller.nextDragonSpawnTime = this.controller.lastDragonKillTime + 300; // 5 minuti dopo l'uccisione
    this.controller.alertSentForNextDragon = false;
    console.log(`Drago ucciso al minuto ${formatTime(this.controller.lastDragonKillTime)}. Prossimo respawn al minuto ${formatTime(this.controller.nextDragonSpawnTime)}.`);
    playAudio('dragon-slain.mp3');
  }

  public checkDragonRespawnTimer(currentGameTime: number) {
    const timeUntilNextDragonSpawn = this.controller.nextDragonSpawnTime - currentGameTime;

    if (timeUntilNextDragonSpawn <= 60 && timeUntilNextDragonSpawn > 0 && !this.controller.alertSentForNextDragon) {
      this.controller.alertSentForNextDragon = true;
      this.sendDragonSpawnAlert();
    }

    if (timeUntilNextDragonSpawn <= 0) {
      this.controller.alertSentForNextDragon = false;
    }
  }

  public sendDragonSpawnAlert() {
    console.log("Il Drago respawnerà tra un minuto!");
    playAudio('one-min-drake.mp3');
  }
}
