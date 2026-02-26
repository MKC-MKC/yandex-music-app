const { ipcMain, powerMonitor, powerSaveBlocker } = require("electron");

let powerSaveBlockerId = null;
let stopGuardIntervalId = null;
let stopGuardTimeoutId = null;
let stopGuardStartedAt = 0;
const DEBUG_SLEEP_STOP = process.env.YM_SLEEP_DEBUG === "1";
const STOP_GUARD_DURATION_MS = 4000;
const STOP_GUARD_INTERVAL_MS = 1000;
const SLEEP_BRIDGE_CMD_PAUSE = `(() => {
  try {
    const bridge = globalThis.__YM_SLEEP;
    if (bridge && typeof bridge.pause === "function") {
      bridge.pause();
    }
  } catch (_) {}
})()`;
const SLEEP_BRIDGE_CMD_RELEASE = `(() => {
  try {
    const bridge = globalThis.__YM_SLEEP;
    if (bridge && typeof bridge.release === "function") {
      bridge.release();
    }
  } catch (_) {}
})()`;

ipcMain.on("changeState", (_event, state) => {
  if (state.isPlaying) {
    if (!powerSaveBlockerId) {
      powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    }
  } else if (powerSaveBlockerId !== null) {
    powerSaveBlocker.stop(powerSaveBlockerId);
    powerSaveBlockerId = null;
  }
});

ipcMain.on("sleepPauseUserAction", (_event, payload = {}) => {
  clearStopGuard("user-action");
  logSleep("user-action", payload);
});

powerMonitor.on("suspend", () => enforceStopPlayback("suspend"));
powerMonitor.on("resume", () => enforceStopPlayback("resume"));
powerMonitor.on("lock-screen", () => enforceStopPlayback("lock-screen"));
powerMonitor.on("unlock-screen", () => enforceStopPlayback("unlock-screen"));

function enforceStopPlayback(reason) {
  logSleep(`event: ${reason}`);
  startStopGuard();
  stopPowerSaveBlocker();
}

function startStopGuard() {
  clearStopGuard("restart", false);
  stopGuardStartedAt = Date.now();
  logSleep(`guard-start (${STOP_GUARD_DURATION_MS}ms)`);

  stopPlayback();
  setTimeout(stopPlayback, 250);

  stopGuardIntervalId = setInterval(stopPlayback, STOP_GUARD_INTERVAL_MS);
  stopGuardTimeoutId = setTimeout(() => {
    clearStopGuard("timeout");
  }, STOP_GUARD_DURATION_MS);
}

function stopPlayback() {
  const win = global.mainWindow;
  if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) {
    return;
  }
  // Pause playback on sleep/wake without changing track position.
  win.webContents.send("playerCmd", "sleepPause");
  win.webContents.executeJavaScript(SLEEP_BRIDGE_CMD_PAUSE, true).catch(() => {});
}

function clearStopGuard(reason, shouldLog = true) {
  if (stopGuardIntervalId !== null) {
    clearInterval(stopGuardIntervalId);
    stopGuardIntervalId = null;
  }
  if (stopGuardTimeoutId !== null) {
    clearTimeout(stopGuardTimeoutId);
    stopGuardTimeoutId = null;
  }

  const elapsedMs = stopGuardStartedAt ? Date.now() - stopGuardStartedAt : 0;
  stopGuardStartedAt = 0;

  const win = global.mainWindow;
  if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
    win.webContents.send("playerCmd", "sleepPauseRelease");
    win.webContents.executeJavaScript(SLEEP_BRIDGE_CMD_RELEASE, true).catch(() => {});
  }

  if (shouldLog) {
    logSleep(`guard-stop (${reason}, ${elapsedMs}ms)`);
  }
}

function stopPowerSaveBlocker() {
  if (powerSaveBlockerId === null) return;
  powerSaveBlocker.stop(powerSaveBlockerId);
  powerSaveBlockerId = null;
}

function logSleep(message, payload) {
  if (!DEBUG_SLEEP_STOP) return;
  const now = new Date().toISOString();
  if (payload !== undefined) {
    console.info(`[sleep-stop ${now}] ${message}`, payload);
  } else {
    console.info(`[sleep-stop ${now}] ${message}`);
  }
}
