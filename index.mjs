import "dotenv/config";
import { SystemAccessPoint } from "freeathome-local-api-client";
import fetch from "node-fetch";

// Determine whether log output shall be formatted as JSONL or logfmt.
const useLogfmt = process.argv.findIndex((e) => e.startsWith("--logfmt")) >= 0;
// The base factor in milliseconds for the exponential backoff
const delayFactor = 200;
// The maximum number of times the attempt is made to establish a websocket connection.
const maxWsRetryCount = 10;

// Setup fetch
globalThis.fetch = fetch;

// formats an object as logfmt
function logfmt(data) {
  var line = "";

  for (let key in data) {
    let value = data[key];
    let is_null = false;

    if (value === null) {
      is_null = true;
      value = "";
    } else value = value.toString();

    const needs_quoting = value.indexOf(" ") > -1 || value.indexOf("=") > -1;
    const needs_escaping = value.indexOf('"') > -1 || value.indexOf("\\") > -1;

    if (needs_escaping) value = value.replace(/["\\]/g, "\\$&");
    if (needs_quoting) value = '"' + value + '"';
    if (value === "" && !is_null) value = '""';

    line += key + "=" + value + " ";
  }

  return line.trim();
}

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
      /^([a-z0-9]{12})\/(ch[\da-f]{4})\/([io]dp\d{4})$/i
    );
    if (!match) {
      const message = `Ignored datapoint ${value}: Unexpected format`;
      console.error(
        useLogfmt ? logfmt({ severity: "error", msg: message }) : message
      );
      return;
    }

    const update = {
      severity: useLogfmt ? "info" : undefined,
      device: match[1],
      channel: match[2],
      datapoint: match[3],
      value: message["00000000-0000-0000-0000-000000000000"].datapoints[value],
    };

    console.log(
      useLogfmt ? logfmt(update) : JSON.stringify(update, null, null)
    );
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
  error: (message) =>
    console.error(
      useLogfmt ? logfmt({ severity: "error", msg: message }) : message
    ),
  log: (message) =>
    console.log(
      useLogfmt ? logfmt({ severity: "info", msg: message }) : message
    ),
  warn: (message) =>
    console.warn(
      useLogfmt ? logfmt({ severity: "warn", msg: message }) : message
    ),
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

  let message = `Websocket to System Access Point was closed with code ${code.toString()}: ${reason.toString()}`;
  console.warn(
    useLogfmt ? logfmt({ severity: "warn", msg: message }) : message
  );

  if (wsConnectionAttempt >= maxWsRetryCount) {
    message =
      "Maximum retry count exceeded. Will not try to reconnect to websocket again.";
    console.error(
      useLogfmt ? logfmt({ severity: "error", msg: message }) : message
    );
    return;
  }

  const delay = delayFactor * 2 ** wsConnectionAttempt++;
  message = `Attempting to reconnect in ${delay}ms [${wsConnectionAttempt}/${maxWsRetryCount}]`;
  console.warn(
    useLogfmt ? logfmt({ severity: "warn", msg: message }) : message
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
