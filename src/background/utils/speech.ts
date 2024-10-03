// src/speech.ts

function playAudio(filename: string) {
  overwolf.windows.sendMessage(
    "in_game",
    "play_audio",
    { filename: filename },
    (result) => {
      if (result.success) {
        console.log(`Messaggio per riprodurre ${filename} inviato con successo`);
      } else {
        console.error(`Errore nell'invio del messaggio per riprodurre ${filename}:`, result.error);
      }
    }
  );
}

export { playAudio };
