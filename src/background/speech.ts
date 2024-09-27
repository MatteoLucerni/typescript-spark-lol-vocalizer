// src/speech.ts

function speak(text: string) {
    const synth = window.speechSynthesis;
    const utterThis = new SpeechSynthesisUtterance(text);
    synth.speak(utterThis);
  }
  
  export { speak };
  