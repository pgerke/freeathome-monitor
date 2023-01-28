import "dotenv/config";
import { SystemAccessPoint } from "freeathome-local-api-client";
import fetch from "node-fetch";

// The base factor in milliseconds for the exponential backoff
const delayFactor = 200;
// The maximum number of times the attempt is made to establish a websocket connection.
const maxWsRetryCount = 10;

// Setup fetch
globalThis.fetch = fetch;

// This function waits for a second
async function pause() {
  return new Promise((res) => setTimeout(res, 1000));
}

// format and output message
function processMessage(message) {
  const keys = Object.keys(
    message["00000000-0000-0000-0000-000000000000"].datapoints
  );
  if (!keys.length) return;

  keys.forEach((value) => {
    const match = value.match(
      /^(ABB[a-z0-9]{9})\/(ch[\da-f]{4})\/(odp\d{4})$/i
    );
    if (!match) {
      console.error(`Ignored datapoint ${value}: Unexpected format`);
      return;
    }
    const update = {
      device: match[1],
      channel: match[2],
      datapoint: match[3],
      value: message["00000000-0000-0000-0000-000000000000"].datapoints[value]
    };
    console.log(JSON.stringify(update, null, null));
  });
}

// Create a loop function that waits for interrupt
let shutdownTriggered = false;
async function runLoop() {
  while (!shutdownTriggered) {
    await pause();
  }
}

// Ignore logs from the SysAP
const logger = {
  debug: () => {},
  error: () => {},
  log: () => {},
  warn: () => {}
};
// Connect to system access point and web socket
const sysAp = new SystemAccessPoint(
  process.env.SYSAP_HOST,
  process.env.SYSAP_USER_ID,
  process.env.SYSAP_PASSWORD,
  false,
  false,
  logger
);

// React to web socket events
let wsConnectionAttempt = 0;
sysAp.on("websocket-open", () => {
  wsConnectionAttempt = 0;
});
sysAp.on("websocket-close", (code, reason) => {
  if (code === 1000) return;

  console.warn(
    `Websocket to System Access Point was closed with code ${code.toString()}: ${reason.toString()}`
  );
  if (wsConnectionAttempt >= maxWsRetryCount) {
    console.error(
      "Maximum retry count exceeded. Will not try to reconnect to websocket again."
    );
    return;
  }

  const delay = delayFactor * 2 ** wsConnectionAttempt++;
  console.warn(
    `Attempting to reconnect in ${delay}ms [${wsConnectionAttempt}/${maxWsRetryCount}]`
  );
  setTimeout(() => sysAp.connectWebSocket(), delay);
});

// Subscribe to web socket events
const subscription = sysAp
  .getWebSocketMessages()
  .subscribe((message) => processMessage(message));
sysAp.connectWebSocket();

// Trap SIGINT and initialized
process.on("SIGINT", () => {
  shutdownTriggered = true;
});

// keep the script runnning until SIGINT is received.
await runLoop();

// Shutdown
sysAp.disconnectWebSocket();
subscription.unsubscribe();
