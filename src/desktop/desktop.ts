import { AppWindow } from "../AppWindow";
import { kWindowNames } from "../consts";
import { LauncherController } from "../launcher/launcher";
import { SettingsManager } from "../utils/SettingsManager";

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const lc = LauncherController.instance();
lc.run();

// La finestra desktop viene visualizzata quando il gioco non è in esecuzione.
// Qui, gestiamo gli switch per modificare le impostazioni.
class Desktop extends AppWindow {
  private toggleRedBuff: HTMLInputElement;
  private toggleBlueBuff: HTMLInputElement;
  private toggleScuttleBot: HTMLInputElement;
  private toggleScuttleTop: HTMLInputElement;
  private toggleCannonWave: HTMLInputElement;

  constructor() {
    super(kWindowNames.desktop);

    // Inizializza gli switch
    this.toggleRedBuff = document.getElementById("toggleRedBuff") as HTMLInputElement;
    this.toggleBlueBuff = document.getElementById("toggleBlueBuff") as HTMLInputElement;
    this.toggleScuttleBot = document.getElementById("toggleScuttleBot") as HTMLInputElement;
    this.toggleScuttleTop = document.getElementById("toggleScuttleTop") as HTMLInputElement; 
    this.toggleCannonWave = document.getElementById("toggleCannonWave") as HTMLInputElement;

    this.addListeners();
    this.loadSettings();
  }

  private loadSettings() {
    const settingsManager = SettingsManager.instance();
    settingsManager.loadSettings((parsedSettings) => {
      this.toggleRedBuff.checked = parsedSettings.redBuff;
      this.toggleBlueBuff.checked = parsedSettings.blueBuff;
      this.toggleScuttleBot.checked = parsedSettings.scuttleBot;
      this.toggleScuttleTop.checked = parsedSettings.scuttleTop;
      this.toggleCannonWave.checked = parsedSettings.cannonWave;

      // Dispatch change events per assicurare che eventuali listener siano triggerati
      const changeEvent = new Event('change');
      this.toggleRedBuff.dispatchEvent(changeEvent);
      this.toggleBlueBuff.dispatchEvent(changeEvent);
      this.toggleScuttleBot.dispatchEvent(changeEvent);
      this.toggleScuttleTop.dispatchEvent(changeEvent);
      this.toggleCannonWave.dispatchEvent(changeEvent);

      console.log("Impostazioni caricate correttamente nel desktop.");
    });
  }

  private saveSettings() {
    const settingsManager = SettingsManager.instance();
    const settings = {
      redBuff: this.toggleRedBuff.checked,
      blueBuff: this.toggleBlueBuff.checked,
      scuttleBot: this.toggleScuttleBot.checked,
      scuttleTop: this.toggleScuttleTop.checked,
      cannonWave: this.toggleCannonWave.checked,
    };
    settingsManager.saveSettings(settings);
  }

  private sendToggleMessage(id: string, enabled: boolean) {
    overwolf.windows.sendMessage(
      "background", // Nome della finestra di destinazione
      id,           // messageId
      { enabled: enabled }, // messageContent
      (result) => {         // callback
        if (result.success) {
          console.log(`Messaggio ${id} inviato con successo dalla desktop`);
        } else {
          console.error(`Errore nell'invio del messaggio ${id} dalla desktop:`, result.error);
        }
      }
    );
  }

  private addListeners() {
    this.toggleRedBuff.addEventListener("change", () => {
      this.sendToggleMessage("toggle_red_buff", this.toggleRedBuff.checked);
      this.saveSettings();
    });

    this.toggleBlueBuff.addEventListener("change", () => {
      this.sendToggleMessage("toggle_blue_buff", this.toggleBlueBuff.checked);
      this.saveSettings();
    });

    this.toggleScuttleBot.addEventListener("change", () => {
      this.sendToggleMessage("toggle_scuttle_bot", this.toggleScuttleBot.checked);
      this.saveSettings();
    });

    this.toggleScuttleTop.addEventListener("change", () => {
      this.sendToggleMessage("toggle_scuttle_top", this.toggleScuttleTop.checked);
      this.saveSettings();
    });

    this.toggleCannonWave.addEventListener("change", () => {
      this.sendToggleMessage("toggle_cannon_wave", this.toggleCannonWave.checked);
      this.saveSettings();
    });
  }
}

new Desktop();
