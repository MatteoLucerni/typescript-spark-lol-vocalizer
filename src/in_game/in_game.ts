// src/in_game/in_game.ts

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

// Ascolta i messaggi dal background script
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

  // Aggiungi event listener per ogni switch
  toggleRedBuff.addEventListener("change", () => {
    sendToggleMessage("toggle_red_buff", toggleRedBuff.checked);
  });

  toggleBlueBuff.addEventListener("change", () => {
    sendToggleMessage("toggle_blue_buff", toggleBlueBuff.checked);
  });

  toggleScuttleBot.addEventListener("change", () => {
    sendToggleMessage("toggle_scuttle_bot", toggleScuttleBot.checked);
  });

  toggleScuttleTop.addEventListener("change", () => {
    sendToggleMessage("toggle_scuttle_top", toggleScuttleTop.checked);
  });
};
