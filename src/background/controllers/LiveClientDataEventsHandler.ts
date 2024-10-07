export class LiveClientDataEventsHandler {
    private static _instance: LiveClientDataEventsHandler | null = null;
    private lastProcessedEventID: number = 0; // Track the last processed EventID

    private countVoidGrabsKilled = 0;
  
    private constructor() {
      // Optionally, initialize with previously stored lastProcessedEventID
      // Example: this.lastProcessedEventID = loadLastProcessedEventID();
      console.log('LiveClientDataEventsHandler initialized');
    }
  
    // Singleton instance accessor
    public static getInstance(): LiveClientDataEventsHandler {
      if (!this._instance) {
        this._instance = new LiveClientDataEventsHandler();
      }
      return this._instance;
    }
  
    // Process incoming events from live_client_data
    public processEvents(liveClientDataEvents: any) {
      // Check if liveClientDataEvents has an 'Events' array
      const eventsArray = liveClientDataEvents?.Events;

      // Now process the events
      const newEvents = eventsArray.filter(event => event.EventID > this.lastProcessedEventID);

      const processedEvents = [];

      newEvents.forEach(event => {
        const eventDetails = this.handleEvent(event);
        this.lastProcessedEventID = event.EventID;

        processedEvents.push(eventDetails);
      });
  
      // Save the updated lastProcessedEventID (if necessary)
      this.saveLastProcessedEventID(this.lastProcessedEventID);
    }
  
    private handleEvent(event: any): { EventName: string, EventTime: number } {
      let resultMessage = '';
    
      switch (event.EventName) {
        case "DragonKill":
          resultMessage = `Dragon killed by: ${event.KillerName}, Dragon Type: ${event.DragonType}`;
          console.log(resultMessage);
          break;
    
        case "BaronKill":
          resultMessage = `Baron Nashor killed by: ${event.KillerName}`;
          console.log(resultMessage);
          break;
    
        case "HordeKill":
          resultMessage = `VoidGrub killed by: ${event.KillerName}`;
          this.countVoidGrabsKilled += 1;
    
          if (this.countVoidGrabsKilled === 3) {
            resultMessage = `Entire camp of VoidGrubs cleared!`;
            console.log(resultMessage);
          }
          break;
    
        case "HeraldKill":
          resultMessage = `Rift Herald killed by: ${event.KillerName}`;
          console.log(resultMessage);
          break;
    
        // Add more cases as needed
        default:
          resultMessage = `Event ${event.EventName} occurred at time ${event.EventTime}`;
          console.log(resultMessage);
      }
    
      // Return an object containing EventName and EventTime
      return {
        EventName: event.EventName,
        EventTime: event.EventTime
      };
    }

    // Save the last processed EventID (to localStorage, file, database, etc.)
    private saveLastProcessedEventID(eventID: number) {
      console.log(`Saving last processed EventID: ${eventID}`);
      // Example: localStorage.setItem('lastProcessedEventID', eventID.toString());
      // Example: save to a file, database, or other persistent storage
    }
  
    // Load the last processed EventID (from localStorage, file, database, etc.)
    private loadLastProcessedEventID(): number {
      console.log('Loading last processed EventID');
      // Example: return parseInt(localStorage.getItem('lastProcessedEventID') || '0');
      // Example: load from a file, database, or other persistent storage
      return 0; // Default to 0 if no saved EventID is found
    }
  }
  
  // Example usage when receiving new event data from the API
  function onNewLiveClientData(info) {
    const liveClientDataEvents = info?.live_client_data?.events;
  
    // Get the singleton instance of the handler and process the events
    const eventHandler = LiveClientDataEventsHandler.getInstance();
    eventHandler.processEvents(liveClientDataEvents);
  }
  