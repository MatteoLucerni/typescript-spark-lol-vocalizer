// src/in_game/in_game.ts

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Definisci l'ID dell'estensione e la versione
const EXTENSION_ID = "nhdmcdjcongmcnildlkmnkefkgcmadldmkhgplog"; // Sostituisci con il tuo reale Extension ID
const VERSION = "1.0.0"; // Sostituisci con la tua versione attuale

// Costruisci il percorso completo per il file delle impostazioni
const settingsFilePath = `${overwolf.io.paths.localAppData}/Overwolf/Extensions/${EXTENSION_ID}/${VERSION}/alertSettings.json`;

// Gestione della coda audio
let audioQueue: string[] = [];
let isPlaying: boolean = false;
let audioVolume: number = 0.5;

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
  console.log(`volume: ${audioVolume}`);
  audio.volume = audioVolume;

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

// **Aggiungi questo listener per ricevere i messaggi dal background script**
overwolf.windows.onMessageReceived.addListener((event) => {
  if (event.id === "play_audio") {
    const audioMessage = event.content as { filename: string };
    if (audioMessage && audioMessage.filename) {
      console.log(`Messaggio ricevuto per riprodurre audio: ${audioMessage.filename}`);
      enqueueAudio(audioMessage.filename);
    }
  } else {
    console.log(`Messaggio non gestito: ${event.id}`);
  }
});

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
  const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
  const volumeValue = document.getElementById('volumeValue');


  // Funzione per caricare le impostazioni dagli switch usando Overwolf
  function loadSettings() {
    overwolf.io.readFileContents(settingsFilePath, overwolf.io.enums.eEncoding.UTF8, (result) => {
      if (result.success && result.content) {
        try {
          const parsedSettings = JSON.parse(result.content);
          toggleRedBuff.checked = parsedSettings.redBuff;
          toggleBlueBuff.checked = parsedSettings.blueBuff;
          toggleScuttleBot.checked = parsedSettings.scuttleBot;
          toggleScuttleTop.checked = parsedSettings.scuttleTop;
          volumeSlider.value = parsedSettings.volume;
          volumeValue.textContent = parsedSettings.volume;
          console.log("Impostazioni caricate correttamente.");
        } catch (error) {
          console.error('Errore nel parsing delle impostazioni:', error);
        }
      } else {
        console.warn("File delle impostazioni non trovato. Utilizzo delle impostazioni predefinite.");
        volumeSlider.value = "50";
        volumeValue.textContent = "50";
        // Se il file non esiste, crea uno con le impostazioni attuali
        saveSettings(); // Crea il file con le impostazioni attuali
      }
    });
  }

  // Funzione per salvare le impostazioni dagli switch usando Overwolf
  function saveSettings() {
    const settings = {
      redBuff: toggleRedBuff.checked,
      blueBuff: toggleBlueBuff.checked,
      scuttleBot: toggleScuttleBot.checked,
      scuttleTop: toggleScuttleTop.checked,
      volume: volumeSlider.value,
    };
    overwolf.io.writeFileContents(settingsFilePath, JSON.stringify(settings), overwolf.io.enums.eEncoding.UTF8, false, (result) => {
      if (result.success) {
        console.log('Impostazioni salvate correttamente.');
      } else {
        console.error('Errore nel salvare le impostazioni:', result.error);
      }
    });
  }

  // Funzione per inviare il messaggio al background script
  function sendToggleMessage(id: string, enabled: boolean) {
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

    // Funzione per inviare il messaggio al background script
  function sendVolumeMessage(id: string, value: number) {
      overwolf.windows.sendMessage(
        "background", // Nome della finestra di destinazione
        id,           // messageId
        { value: value }, // messageContent
        (result) => {         // callback
          if (result.success) {
            console.log(`Messaggio ${id} inviato con successo`);
          } else {
            console.error(`Errore nell'invio del messaggio ${id}:`, result.error);
          }
        }
      );
    }

  // Aggiungi event listener per ogni switch
  toggleRedBuff.addEventListener("change", () => {
    sendToggleMessage("toggle_red_buff", toggleRedBuff.checked);
    saveSettings();
  });

  toggleBlueBuff.addEventListener("change", () => {
    sendToggleMessage("toggle_blue_buff", toggleBlueBuff.checked);
    saveSettings();
  });

  toggleScuttleBot.addEventListener("change", () => {
    sendToggleMessage("toggle_scuttle_bot", toggleScuttleBot.checked);
    saveSettings();
  });

  toggleScuttleTop.addEventListener("change", () => {
    sendToggleMessage("toggle_scuttle_top", toggleScuttleTop.checked);
    saveSettings();
  });

  volumeSlider.addEventListener('input', () => {
    const volume = volumeSlider.value;
    volumeValue.textContent = volume; // Update the display next to the slider

    // set the value in-app
    audioVolume = parseInt(volume) / 100;
    saveSettings();
  });

  // Carica le impostazioni all'avvio
  loadSettings();
};
