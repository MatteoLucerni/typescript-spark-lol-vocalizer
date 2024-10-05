function getLeagueLockfilePath(callback) {
  // League of Legends class ID: 5426
  overwolf.games.getRunningGameInfo((gameInfo) => {
    if (gameInfo && gameInfo.isRunning && gameInfo.classId === 10902) {
      // Assuming the lockfile is located in the root directory of the game
      const gamePath = gameInfo.executionPath;
      const lockfilePath = `${gamePath}\\lockfile`;
      
      console.log('League of Legends lockfile path:', lockfilePath);

      // Call the callback with the lockfile path
      callback(lockfilePath);
    } else {
      console.error('League of Legends is not running.');
    }
  });
}

export function acceptReadyCheck(delayInSeconds = 5) {
  const delayInMilliseconds = delayInSeconds * 1000;

  setTimeout(() => {
    getLeagueLockfilePath((lockfilePath) => {
      if (!lockfilePath) {
        console.error('Lockfile path is unavailable.');
        return;
      }

      // Use Overwolf API to read the lockfile
      overwolf.io.readFileContents(lockfilePath, overwolf.io.enums.eEncoding.UTF8, (result) => {
        if (result.success) {
          // Read the lockfile content
          const lockfileContent = result.content;
          const [name, pid, port, authToken, protocol] = lockfileContent.split(':');

          // Create base64-encoded authentication token using btoa
          const encodedAuth = btoa(`riot:${authToken}`);

          // Prepare the request options for the ReadyCheck accept
          const url = `https://127.0.0.1:${port}/lol-matchmaking/v1/ready-check/accept`;

          // Make a POST request using fetch
          fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${encodedAuth}`,
              'Content-Type': 'application/json',
            },
          })
          .then(response => {
            if (response.ok) {
              console.log('Successfully accepted the match!');
            } else {
              console.error('Failed to accept the match:', response.statusText);
            }
          })
          .catch(error => {
            console.error('Error during the request:', error);
          });
        } else {
          console.error('Failed to read the lockfile:', result.error);
        }
      });
    });
  }, delayInMilliseconds); // Delay before triggering the accept
}
