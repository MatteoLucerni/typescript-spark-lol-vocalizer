import { kWindowNames } from "../consts";

class SettingsManager {
  private settingsFilePath: string;
  private isSaving: boolean = false;
  private saveQueue: boolean = false;
  private static _instance: SettingsManager;

  private constructor() {
    const EXTENSION_ID = "nhdmcdjcongmcnildlkmnkefkgcmadldmkhgplog";
    const VERSION = "1.0.0";
    this.settingsFilePath = `${overwolf.io.paths.localAppData}/Overwolf/Extensions/${EXTENSION_ID}/${VERSION}/alertSettings.json`;
  }

  public static instance(): SettingsManager {
    if (!this._instance) {
      this._instance = new SettingsManager();
    }
    return this._instance;
  }

  public loadSettings(callback: (settings: any) => void) {
    overwolf.io.readFileContents(this.settingsFilePath, overwolf.io.enums.eEncoding.UTF8, (result) => {
      if (result.success && result.content) {
        try {
          const parsedSettings = JSON.parse(result.content);
          callback(parsedSettings);
        } catch (error) {
          console.error('Errore nel parsing delle impostazioni:', error);
          callback(this.getDefaultSettings());
        }
      } else {
        console.warn("File delle impostazioni non trovato. Utilizzo delle impostazioni predefinite.");
        callback(this.getDefaultSettings());
        this.saveSettings(this.getDefaultSettings());
      }
    });
  }

  public saveSettings(settings: any) {
    if (this.isSaving) {
      console.warn('Salvataggio già in corso. Segnalo per un salvataggio successivo.');
      this.saveQueue = true;
      return;
    }
    this.isSaving = true;

    overwolf.io.writeFileContents(this.settingsFilePath, JSON.stringify(settings), overwolf.io.enums.eEncoding.UTF8, false, (result) => {
      this.isSaving = false;
      if (result.success) {
        console.log('Impostazioni salvate correttamente.');
      } else {
        console.error('Errore nel salvare le impostazioni:', result.error);
      }

      if (this.saveQueue) {
        this.saveQueue = false;
        this.saveSettings(settings);
      }
    });
  }

  private getDefaultSettings() {
    return {
      redBuff: true,
      blueBuff: true,
      scuttleBot: true,
      scuttleTop: true,
      cannonWave: true,
      volume: "100",
    };
  }
}

export { SettingsManager };
