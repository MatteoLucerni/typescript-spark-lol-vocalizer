// background/utils.ts

export function getTeamBySummonerName(summonerName: string, parsedData: any): string | null {
    for (let player of parsedData) {
      if (player.summonerName === summonerName) {
        return player.team;
      }
    }
    return null;
  }
  
  export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  export function formatTime(timeInSeconds: number): string {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
  