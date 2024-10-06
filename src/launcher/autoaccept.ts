function getAuthPortFromLaunchersInfo(callback) {
  overwolf.games.launchers.getRunningLaunchersInfo((gameInfo) => {
    console.log(gameInfo);

    // Find the command line string from the launcher data
    const launcher = gameInfo.launchers.find(l => l.classId === 10902);
    if (!launcher) {
      console.error("League of Legends launcher not found.");
      callback(null);
      return;
    }

    let commandLine = launcher.commandLine;

    // Parse the port and auth token using regular expressions
    const portMatch = commandLine.match(/--app-port="?(\d+)"?/);
    const authTokenMatch = commandLine.match(/--remoting-auth-token=([a-zA-Z0-9_-]+)/);

    // Extract values if matches are found
    const port: string = portMatch ? portMatch[1] : '';
    const authToken: string = authTokenMatch ? authTokenMatch[1] : '';

    // Compute the encoded key
    const auth: string = `riot:${authToken}`;
    const authBase64: string = btoa(auth);  // Encode to Base64 using btoa

    callback(port, authBase64)
  });
}

export function acceptReadyCheck(delayInSeconds = 5) {
  const delayInMilliseconds = delayInSeconds * 1000;

  setTimeout(() => {
    getAuthPortFromLaunchersInfo((appPort, encodedAuth) => {
          // Prepare the request options for the ReadyCheck accept
          const url = `https://127.0.0.1:${appPort}/lol-matchmaking/v1/ready-check/accept`;

          overwolf.web.sendHttpRequest(url, overwolf.web.enums.HttpRequestMethods.POST, [
              { key: 'Authorization', value: `Basic ${encodedAuth}` },
              { key: 'Content-Type', value: 'application/json' }
            ], '', (result) => {
            if (result.success) {
              console.log('Successfully accepted the ReadyCheck.');
            } else {
              console.error('Failed to accept the ReadyCheck:', result.error);
            }
          });
    });
  }, delayInMilliseconds); // Delay before triggering the accept
}
