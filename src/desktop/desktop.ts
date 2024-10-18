import { AppWindow } from "../AppWindow";
import { kWindowNames } from "../consts";

import { LauncherController } from "../launcher/launcher";

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const lc = LauncherController.instance();

lc.run()

// The desktop window is the window displayed while game is not running.
// In our case, our desktop window has no logic - it only displays static data.
// Therefore, only the generic AppWindow class is called.
new AppWindow(kWindowNames.desktop);

const toiletModeToggle = document.getElementById("toiletModeToggle") as HTMLInputElement;

// Funzione per inviare il messaggio al background script
function sendToggleMessage(id: string, enabled: boolean) {
    lc.setAutoAccept(enabled);
}

// Aggiungi event listener per ogni switch
toiletModeToggle.addEventListener("change", () => {
    sendToggleMessage("toiletModeToggle", toiletModeToggle.checked);
});

