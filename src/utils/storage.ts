// src/utils/storage.ts

export interface Settings {
    [key: string]: any;
  }
  
  /**
   * Carica le impostazioni da un file JSON.
   * @param filename Il nome del file delle impostazioni (senza estensione).
   * @param callback Una funzione callback che riceve le impostazioni caricate o un errore.
   */
  export function loadSettings<T extends Settings>(filename: string, callback: (settings: T | null, error?: string) => void): void {
    const EXTENSION_ID = "nhdmcdjcongmcnildlkmnkefkgcmadldmkhgplog";
    const VERSION = "1.0.0";
    const settingsFilePath = `${overwolf.io.paths.localAppData}/Overwolf/Extensions/${EXTENSION_ID}/${VERSION}/${filename}.json`;
  
    overwolf.io.readFileContents(settingsFilePath, overwolf.io.enums.eEncoding.UTF8, (result) => {
      if (result.success && result.content) {
        try {
          const parsedSettings: T = JSON.parse(result.content);
          callback(parsedSettings);
        } catch (error) {
          console.error('Errore nel parsing delle impostazioni:', error);
          callback(null, 'Errore nel parsing delle impostazioni');
        }
      } else {
        console.warn("File delle impostazioni non trovato.");
        callback(null, 'File delle impostazioni non trovato');
      }
    });
  }
  
  /**
   * Salva le impostazioni in un file JSON.
   * @param filename Il nome del file delle impostazioni (senza estensione).
   * @param settings Le impostazioni da salvare.
   * @param callback Una funzione callback che riceve il risultato dell'operazione.
   */
  export function saveSettings<T extends Settings>(filename: string, settings: T, callback: (success: boolean, error?: string) => void): void {
    const EXTENSION_ID = "nhdmcdjcongmcnildlkmnkefkgcmadldmkhgplog";
    const VERSION = "1.0.0";
    const settingsFilePath = `${overwolf.io.paths.localAppData}/Overwolf/Extensions/${EXTENSION_ID}/${VERSION}/${filename}.json`;
  
    const content = JSON.stringify(settings, null, 2);
  
    overwolf.io.writeFileContents(settingsFilePath, content, overwolf.io.enums.eEncoding.UTF8, false, (result) => {
      if (result.success) {
        console.log('Impostazioni salvate correttamente.');
        callback(true);
      } else {
        console.error('Errore nel salvare le impostazioni:', result.error);
        callback(false, result.error);
      }
    });
  }
  