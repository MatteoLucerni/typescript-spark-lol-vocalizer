// src/speech.ts

function speak(message: string) {
  // Invia un messaggio alla finestra in-game per emettere l'avviso vocale
  overwolf.windows.sendMessage(
    "in_game",          // windowId: Assicurati che questo corrisponda all'ID della finestra in_game nel manifest.json
    "speak",            // messageId: Un identificatore per il messaggio
    { message: message }, // messageContent: Il contenuto del messaggio
    (result) => {       // callback: Funzione di callback per gestire la risposta
      if (result.success) {
        console.log("Messaggio di sintesi vocale inviato con successo");
      } else {
        console.error("Errore nell'invio del messaggio di sintesi vocale:", result.error);
      }
    }
  );
}

export { speak };
