import {
  OWGames,
  OWGamesEvents,
  OWHotkeys
} from "@overwolf/overwolf-api-ts";

import { AppWindow } from "../AppWindow";
import { kHotkeys, kWindowNames, kGamesFeatures } from "../consts";
import { SettingsManager } from "../utils/SettingsManager";

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Gestione della coda audio
let audioQueue: string[] = [];
let isPlaying: boolean = false;
let audioVolume: number = 0.5;

class InGame extends AppWindow {
  private static _instance: InGame;
  private static count: number = 0;
  private _gameEventsListener: OWGamesEvents;
  private _eventsLog: HTMLElement;
  private _infoLog: HTMLElement;
  private toggleRedBuff: HTMLInputElement;
  private toggleBlueBuff: HTMLInputElement;
  private toggleScuttleBot: HTMLInputElement;
  private toggleScuttleTop: HTMLInputElement;
  private toggleCannonWave: HTMLInputElement;
  private volumeSlider: HTMLInputElement;
  private volumeValue: HTMLElement;

  private constructor() {
    super(kWindowNames.inGame);

    console.trace('InGame constructor called');
    console.log(InGame.count);
    if (InGame.count === 1) {
      throw new Error('Trace InGame constructor');
    }
    InGame.count += 1;

    this._eventsLog = document.getElementById('eventsLog');
    this._infoLog = document.getElementById('infoLog');

    // Gestione degli switch di alert
    this.toggleRedBuff = document.getElementById("toggleRedBuff") as HTMLInputElement;
    this.toggleBlueBuff = document.getElementById("toggleBlueBuff") as HTMLInputElement;
    this.toggleScuttleBot = document.getElementById("toggleScuttleBot") as HTMLInputElement;
    this.toggleScuttleTop = document.getElementById("toggleScuttleTop") as HTMLInputElement; 
    this.toggleCannonWave = document.getElementById("toggleCannonWave") as HTMLInputElement;
    this.volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
    this.volumeValue = document.getElementById('volumeValue');

    this.addListeners();
    this.loadSettings();
  }

  public static instance() {
    if (!this._instance) {
      this._instance = new InGame();
    }

    return this._instance;
  }

  // Funzione per aggiungere un audio alla coda
  private enqueueAudio(filename: string) {
    audioQueue.push(filename);
    if (!isPlaying) {
      this.playNextAudio();
   }
  }

  // Funzione per riprodurre il prossimo audio nella coda
  public playNextAudio() {
    if (audioQueue.length === 0) {
      isPlaying = false;
      return;
    }

    isPlaying = true;
    const filename = audioQueue.shift();

    const audio = new Audio(`assets/${filename}`);
    console.log(`volume: ${audioVolume}`);
    audio.volume = audioVolume;

    audio.play().then(() => {
      console.log(`Audio ${filename} riprodotto con successo`);
    }).catch((error) => {
      console.error(`Errore nella riproduzione dell'audio ${filename}:`, error);
      isPlaying = false;
      this.playNextAudio();
    });

    audio.onended = () => {
      isPlaying = false;
      this.playNextAudio();
    };

    audio.onerror = (error) => {
      console.error(`Errore nella riproduzione dell'audio ${filename}:`, error);
      isPlaying = false;
      this.playNextAudio();
    };
  }

  public async run() {
    // **Aggiungi questo listener per ricevere i messaggi dal background script**
    overwolf.windows.onMessageReceived.addListener((event) => {
      if (event.id === "play_audio") {
        const audioMessage = event.content as { filename: string };
        if (audioMessage && audioMessage.filename) {
          console.log(`Messaggio ricevuto per riprodurre audio: ${audioMessage.filename}`);
          this.enqueueAudio(audioMessage.filename);
        }
      } else {
        console.log(`Messaggio non gestito: ${event.id}`);
      }
    });
  }

  // Funzione per caricare le impostazioni dagli switch usando SettingsManager
  private loadSettings() {
    const settingsManager = SettingsManager.instance();
    settingsManager.loadSettings((parsedSettings) => {
      this.toggleRedBuff.checked = parsedSettings.redBuff;
      this.toggleBlueBuff.checked = parsedSettings.blueBuff;
      this.toggleScuttleBot.checked = parsedSettings.scuttleBot;
      this.toggleScuttleTop.checked = parsedSettings.scuttleTop;
      this.toggleCannonWave.checked = parsedSettings.cannonWave;
      this.volumeSlider.value = parsedSettings.volume;
      this.volumeValue.textContent = parsedSettings.volume;

      // Dispatch change events per assicurare che eventuali listener siano triggerati
      const changeEvent = new Event('change');
      this.toggleRedBuff.dispatchEvent(changeEvent);
      this.toggleBlueBuff.dispatchEvent(changeEvent);
      this.toggleScuttleBot.dispatchEvent(changeEvent);
      this.toggleScuttleTop.dispatchEvent(changeEvent);
      this.toggleCannonWave.dispatchEvent(changeEvent);
      this.volumeSlider.dispatchEvent(changeEvent);

      console.log("Impostazioni caricate correttamente.");
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
      volume: this.volumeSlider.value,
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
          console.log(`Messaggio ${id} inviato con successo`);
        } else {
          console.error(`Errore nell'invio del messaggio ${id}:`, result.error);
        }
      }
    );
  }

  private addListeners() {
    // Aggiungi event listener per ogni switch
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

    this.volumeSlider.addEventListener('input', () => {
      const volume = this.volumeSlider.value;
      this.volumeValue.textContent = volume; // Update the display next to the slider

      // set the value in-app
      audioVolume = parseInt(volume) / 100;
      this.saveSettings();
    });

    document.getElementById('testAudioButton').addEventListener('click', () => {
      const audio = new Audio('assets/window-loaded.mp3');

      const volume = this.volumeSlider.value;
      this.volumeValue.textContent = volume; // Update the display next to the slider

      // set the value in-app
      audioVolume = parseInt(volume) / 100;
      audio.volume = audioVolume;
      console.log(`testing with volume: ${audioVolume}`);
      audio.play();
    });
  }
}

InGame.instance().run();
