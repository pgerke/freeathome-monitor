import "dotenv/config";
import { SystemAccessPoint } from "freeathome-local-api-client";
import fetch from "node-fetch";

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
      console.log(`Ignored datapoint ${value}: Unexpected format`);
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
