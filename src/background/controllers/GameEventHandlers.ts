// background/GameEventHandlers.ts

import { playAudio } from '../utils/speech';
import { formatTime } from '../utils/utils';
import { getTeamBySummonerName } from '../utils/utils';
import { BackgroundController } from './BackgroundController';

export class GameEventHandlers {
  private controller: BackgroundController; // Riferimento a BackgroundController

  constructor(controller: any) {
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

  /**
   * Ok this is complicated so I need to write it down. According to the API, they are called "Baron"
   * But they actually have different behavior and follow the schema:
   * 
   * Voidgrubs spawn at 6 mins and after that every 4 mins. HOWEVER, this only if the first group is killed before 9:45
   * Rift Herald spawns at 14 mins and in theory it does not respawns. It DESPAWNS automatically at 19:45 (or 19:55 if in-combat)
   * Baron spawns at 20 mins and respawns every 6 mins.
   * 
   * @param campInfo 
   * 
   */
  private handleBaronPitInfoUpdate(campName: string, campInfo: any) {
    const currentGameTime = this.controller.lastMatchClockTime;

    try {
      switch (campName) {
        case "VoidGrubs":
          // There is no event for VoidGrubs killed - so we rely on this stupid logic
          
          if (campInfo.alive && !this.controller.isVoidgrubsSpawned) {
            playAudio('voidgrubs-spawned.mp3')
            this.controller.isVoidgrubsSpawned = true;
          }
          break;
        case "Rift Herald":
          if (campInfo.alive && !this.controller.isRiftHeraldSpawned) {
            playAudio('riftherald-spawned.mp3')
            this.controller.isVoidgrubsSpawned = true;
          }
          break;
        case "Baron":
          if (campInfo.alive && !this.controller.isNashorSpawned) {
            playAudio('baron-spawned.mp3')
            this.controller.isVoidgrubsSpawned = true;
          }
          break;
      }
    } catch (error) {
      console.error(`Errore nella gestione dell'info update baron pit ${campName} - ${campInfo}:`, error);
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

      if (campName === "VoidGrubs" || campName === "Rift Herald" || campName === "Baron") {
        this.handleBaronPitInfoUpdate(campName, campInfo);
      }
    }
  }

  public handleLiveClientData(eventsData: any[]) {
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


  public checkNashorSpawnTimer(currentGameTime: number) {
    const timeUntilNextNashorSpawn = this.controller.nextNashorSpawnTime - currentGameTime;

    if (timeUntilNextNashorSpawn <= 60 && timeUntilNextNashorSpawn > 0 && !this.controller.alertSentForNextNashor) {
      this.controller.alertSentForNextNashor = true;
      this.sendNashorSpawnAlert();
    }

    if (timeUntilNextNashorSpawn <= 0) {
      this.controller.alertSentForNextDragon = false;
    }
  }

  public handleNashorKill(gameEvent: any) {
    const currentGameTime = gameEvent.EventTime;
    this.controller.lastNashorKillTime = currentGameTime;
    this.controller.nextNashorSpawnTime = this.controller.lastNashorKillTime + (60 * 6); // 6 minuti dopo l'uccisione
    this.controller.alertSentForNextNashor = false;
    console.log(`Baron Nashor ucciso al minuto ${formatTime(this.controller.lastNashorKillTime)}. Prossimo respawn al minuto ${formatTime(this.controller.nextNashorSpawnTime)}.`);
    playAudio('nashor-slain.mp3');
  }

  public sendNashorSpawnAlert() {
    console.log("Il Baron Nashor respawnerà tra un minuto!");
    playAudio('one-min-nashor.mp3');
  }
}
