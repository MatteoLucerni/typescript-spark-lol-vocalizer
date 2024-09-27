// src/in_game/in_game.ts

function playAudio() {
  const audio = new Audio('assets/dragon.mp3');
  audio.play().then(() => {
    console.log('Audio riprodotto con successo');
  }).catch((error) => {
    console.error('Errore nella riproduzione dell\'audio:', error);
  });
}

// Aggiungi un messaggio di test al caricamento della finestra
window.onload = () => {
  playAudio();
  console.log("Messaggio di test: Finestra in-game caricata correttamente.");
};
