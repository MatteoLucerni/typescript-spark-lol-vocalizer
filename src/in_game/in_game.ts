// src/in_game/in_game.ts

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { loadSettings, saveSettings, Settings } from '../utils/storage';

// Gestione della coda audio
let audioQueue: string[] = [];
let isPlaying: boolean = false;

// Funzione per aggiungere un audio alla coda
function enqueueAudio(filename: string) {
  audioQueue.push(filename);
  if (!isPlaying) {
    playNextAudio();
  }
}

// Funzione per riprodurre il prossimo audio nella coda
function playNextAudio() {
  if (audioQueue.length === 0) {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  const filename = audioQueue.shift();
  const audio = new Audio(`assets/${filename}`);

  audio.play().then(() => {
    console.log(`Audio ${filename} riprodotto con successo`);
  }).catch((error) => {
    console.error(`Errore nella riproduzione dell'audio ${filename}:`, error);
    isPlaying = false;
    playNextAudio();
  });

  audio.onended = () => {
    isPlaying = false;
    playNextAudio();
  };

  audio.onerror = (error) => {
    console.error(`Errore nella riproduzione dell'audio ${filename}:`, error);
    isPlaying = false;
    playNextAudio();
  };
}

window.onload = () => {
  console.log("Finestra in-game caricata correttamente.");

  // Pulsanti di controllo finestra
  const minimizeButton = document.getElementById("minimizeButton");
  const maximizeButton = document.getElementById("maximizeButton");
  const closeButton = document.getElementById("closeButton");

  if (minimizeButton) {
    minimizeButton.addEventListener("click", () => {
      overwolf.windows.getCurrentWindow((result) => {
        if (result.success) {
          overwolf.windows.minimize(result.window.id);
        }
      });
    });
  }

  if (maximizeButton) {
    maximizeButton.addEventListener("click", () => {
      overwolf.windows.getCurrentWindow((result) => {
        if (result.success) {
          if (result.window.state === "maximized") {
            overwolf.windows.restore(result.window.id);
          } else {
            overwolf.windows.maximize(result.window.id);
          }
        }
      });
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      overwolf.windows.getCurrentWindow((result) => {
        if (result.success) {
          overwolf.windows.close(result.window.id);
        }
      });
    });
  }

  // Gestione degli switch di alert
  const toggleRedBuff = document.getElementById("toggleRedBuff") as HTMLInputElement;
  const toggleBlueBuff = document.getElementById("toggleBlueBuff") as HTMLInputElement;
  const toggleScuttleBot = document.getElementById("toggleScuttleBot") as HTMLInputElement;
  const toggleScuttleTop = document.getElementById("toggleScuttleTop") as HTMLInputElement;

  // Definire il tipo delle impostazioni
  interface AlertSettings extends Settings {
    redBuff: boolean;
    blueBuff: boolean;
    scuttleBot: boolean;
    scuttleTop: boolean;
  }

  // Funzione per inizializzare le impostazioni
  function initializeSettings() {
    loadSettings<AlertSettings>('alertSettings', (settings, error) => {
      if (settings) {
        toggleRedBuff.checked = settings.redBuff;
        toggleBlueBuff.checked = settings.blueBuff;
        toggleScuttleBot.checked = settings.scuttleBot;
        toggleScuttleTop.checked = settings.scuttleTop;
        console.log("Impostazioni caricate correttamente.");
      } else {
        console.warn("File delle impostazioni non trovato o errore nel parsing. Utilizzo delle impostazioni predefinite.");
        // Salva le impostazioni predefinite
        const defaultSettings: AlertSettings = {
          redBuff: toggleRedBuff.checked,
          blueBuff: toggleBlueBuff.checked,
          scuttleBot: toggleScuttleBot.checked,
          scuttleTop: toggleScuttleTop.checked,
        };
        saveSettings<AlertSettings>('alertSettings', defaultSettings, (success, error) => {
          if (success) {
            console.log('Impostazioni predefinite salvate.');
          } else {
            console.error('Errore nel salvare le impostazioni predefinite:', error);
          }
        });
      }
    });
  }

  // Carica le impostazioni all'avvio
  initializeSettings();

  // Funzione per inviare il messaggio al background script
  function sendToggleMessage(id: string, enabled: boolean) {
    overwolf.windows.sendMessage(
      "background",
      id,
      { enabled: enabled },
      (result) => {
        if (result.success) {
          console.log(`Messaggio ${id} inviato con successo`);
        } else {
          console.error(`Errore nell'invio del messaggio ${id}:`, result.error);
        }
      }
    );
  }

  // Definire il tipo delle impostazioni da salvare
  interface CurrentSettings extends AlertSettings {}

  // Aggiungi event listener per ogni switch
  function handleToggleChange() {
    const currentSettings: CurrentSettings = {
      redBuff: toggleRedBuff.checked,
      blueBuff: toggleBlueBuff.checked,
      scuttleBot: toggleScuttleBot.checked,
      scuttleTop: toggleScuttleTop.checked,
    };
    saveSettings<CurrentSettings>('alertSettings', currentSettings, (success, error) => {
      if (success) {
        console.log('Impostazioni salvate correttamente.');
      } else {
        console.error('Errore nel salvare le impostazioni:', error);
      }
    });
  }

  toggleRedBuff.addEventListener("change", () => {
    sendToggleMessage("toggle_red_buff", toggleRedBuff.checked);
    handleToggleChange();
  });

  toggleBlueBuff.addEventListener("change", () => {
    sendToggleMessage("toggle_blue_buff", toggleBlueBuff.checked);
    handleToggleChange();
  });

  toggleScuttleBot.addEventListener("change", () => {
    sendToggleMessage("toggle_scuttle_bot", toggleScuttleBot.checked);
    handleToggleChange();
  });

  toggleScuttleTop.addEventListener("change", () => {
    sendToggleMessage("toggle_scuttle_top", toggleScuttleTop.checked);
    handleToggleChange();
  });
};
