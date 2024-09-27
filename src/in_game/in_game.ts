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
  }
});

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
