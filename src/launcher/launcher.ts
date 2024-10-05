import {
    OWGames,
    OWGameListener,
    OWWindow
  } from '@overwolf/overwolf-api-ts';

import { acceptReadyCheck } from './autoaccept';

  export const kGameClassIds = [
    5426 // League of Legends class ID
  ]; 

  export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  export class LauncherController {
    private static _instance: LauncherController;
    private _windows: Record<string, OWWindow> = {};
    private _gameListener: OWGameListener;

    private autoAcceptEnabled = true;
  
    private constructor() {
    }
  
    public static instance(): LauncherController {
      if (!LauncherController._instance) {
        LauncherController._instance = new LauncherController();
      }
  
      return LauncherController._instance;
    }

    public setAutoAccept(status: boolean) {
      console.log(`status: ${status}`);
      this.autoAcceptEnabled = status;
    }

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
            await delay(delayMs);
          }
        }
      }
    
      private setRequiredFeatures(requiredFeatures: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
        overwolf.games.launchers.events.setRequiredFeatures(10902, requiredFeatures, (result) => {
            if (result.success) {
                resolve();
              } else {
                reject(result.error);
              }
            });
        });
      }
    
  
    public async run() {
        overwolf.games.launchers.events.getInfo(10902, (result) => {
            console.log(result);
        })

        await this.setRequiredFeaturesWithRetry(['game_info', 'game_flow', 'lobby_info']);

        overwolf.games.launchers.events.onInfoUpdates.addListener((info) => {
            console.log("Launcher info updated:", info);

            if (info && info.info && info.info.game_flow) {
                // Extract the "phase" information from the "game_flow"
                const gameFlowPhase = info.info.game_flow.phase;
            
                // Check if the phase is "ReadyCheck"
                if (gameFlowPhase === "ReadyCheck" && this.autoAcceptEnabled) {
                  // Add your custom logic here
                  console.log("Game is in ReadyCheck phase!");

                  acceptReadyCheck();
               }
            }
        });
        
        overwolf.games.launchers.events.onNewEvents.addListener((event) => {
            console.log("New launcher event:", event);
        });
    }

  }
  