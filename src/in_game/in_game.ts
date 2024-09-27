// src/in_game/in_game.ts

// Ascolta i messaggi dalla background page
overwolf.windows.onMessageReceived.addListener((event) => {
  if (event.id === "speak") {
    const speakMessage = event.content as { message: string };
    if (speakMessage && speakMessage.message) {
      console.log(`Messaggio ricevuto per speak: ${speakMessage.message}`);
      // Implementa la sintesi vocale se necessario
    }
  } else if (event.id === "play_audio") {
    const audioMessage = event.content as { filename: string };
    if (audioMessage && audioMessage.filename) {
      console.log(`Messaggio ricevuto per riprodurre audio: ${audioMessage.filename}`);
      playAudio(audioMessage.filename);
    }
  } else if (event.id === "game_event") {
    const gameEvent = event.content as overwolf.games.events.GameEvent;
    displayGameEvent(gameEvent);
  } else if (event.id === "info_update") {
    const infoUpdate = event.content as overwolf.games.events.InfoUpdates2Event;
    displayInfoUpdate(infoUpdate);
  }
});

// Funzione per visualizzare gli eventi di gioco
function displayGameEvent(event: overwolf.games.events.GameEvent) {
  const eventsLog = document.getElementById("eventsLog");
  if (eventsLog) {
    const eventElement = document.createElement("div");
    eventElement.textContent = JSON.stringify(event);
    eventsLog.appendChild(eventElement);
  }
}

// Funzione per visualizzare gli aggiornamenti delle informazioni
function displayInfoUpdate(infoUpdate: overwolf.games.events.InfoUpdates2Event) {
  const infoLog = document.getElementById("infoLog");
  if (infoLog) {
    const infoElement = document.createElement("div");
    infoElement.textContent = JSON.stringify(infoUpdate);
    infoLog.appendChild(infoElement);
  }
}

// Funzione per riprodurre un file audio specifico
function playAudio(filename: string) {
  const audio = new Audio(`assets/${filename}`);
  audio.play().then(() => {
    console.log(`Audio ${filename} riprodotto con successo`);
  }).catch((error) => {
    console.error(`Errore nella riproduzione dell'audio ${filename}:`, error);
  });
}

window.onload = () => {
  console.log("Finestra in-game caricata correttamente.");
};
