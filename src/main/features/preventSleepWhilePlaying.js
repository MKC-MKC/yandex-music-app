const { ipcMain, powerMonitor, powerSaveBlocker } = require("electron");

let powerSaveBlockerId = null

ipcMain.on("changeState", (_event, state) => {
  if (state.isPlaying) {
    if (!powerSaveBlockerId) {
      powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension')
    }
  } else if (powerSaveBlockerId !== null) {
    powerSaveBlocker.stop(powerSaveBlockerId)
    powerSaveBlockerId = null;
  }
});

powerMonitor.on("suspend", () => {
  pausePlayback();
  stopPowerSaveBlocker();
});

function pausePlayback() {
  const win = global.mainWindow;
  if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) {
    return;
  }
  win.webContents.send("playerCmd", "pause");
}

function stopPowerSaveBlocker() {
  if (powerSaveBlockerId === null) return;
  powerSaveBlocker.stop(powerSaveBlockerId);
  powerSaveBlockerId = null;
}
