const { app, globalShortcut, systemPreferences } = require("electron");
const { getTrackMetaData } = require("./playerMetaData");
const { showLoveNotification, showTrackNotification } = require("./notifications");

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

registerShortcuts();

exports.reloadShortcuts = () => {
  globalShortcut.unregisterAll();
  registerShortcuts();
};

function registerShortcuts() {
  registerSystemMediaShortcuts();

  if (!systemPreferences.isTrustedAccessibilityClient(false)) {
    return;
  }
  registerCustomShortcuts();
}

function registerSystemMediaShortcuts() {
  registerShortcut("MediaPlayPause", "togglePause");
  registerShortcut("MediaNextTrack", "next");
  registerShortcut("MediaPreviousTrack", "prev");
}

function registerCustomShortcuts() {
  const hotkeys = global.store.get("hotkeys", {});

  registerGlobalHotkeys(hotkeys["play"], "play");
  registerGlobalHotkeys(hotkeys["pause"], "pause");
  registerGlobalHotkeys(hotkeys["play_pause"], "togglePause");

  registerGlobalHotkeys(hotkeys["previous_track"], "prev");
  registerGlobalHotkeys(hotkeys["next_track"], "next");
  
  registerGlobalHotkeys(hotkeys["go_backward"], "goBackward");
  registerGlobalHotkeys(hotkeys["go_forward"], "goForward");

  registerGlobalHotkeys(hotkeys["love"], "love", () => {
    showLoveNotification(true);
  });
  registerGlobalHotkeys(hotkeys["dislike"], "dislike");
  registerGlobalHotkeys(hotkeys["like_unlike"], "toggleLike", () => {
    let loved = !getTrackMetaData().liked;
    showLoveNotification(loved);
  });

  registerGlobalHotkeys(hotkeys["mute_unmute"], "toggleMute");
  registerGlobalHotkeys(hotkeys["repeat"], "toggleRepeat");
  registerGlobalHotkeys(hotkeys["shuffle"], "toggleShuffle");

  registerGlobalHotkeys(hotkeys["track_info"], undefined, showTrackNotification);

  registerGlobalHotkeys(hotkeys["volume_down"], "volumeDown");
  registerGlobalHotkeys(hotkeys["volume_up"], "volumeUp");
}

function registerGlobalHotkeys(acceleratorArray, playerCmd, additionalCmd) {
  if (!acceleratorArray) return;
  const accelerator = acceleratorArray.join("+");
  if (!accelerator) return;
  registerShortcut(accelerator, playerCmd, additionalCmd);
}

function registerShortcut(accelerator, playerCmd, additionalCmd) {
  const registered = globalShortcut.register(accelerator, () => {
    playerCmd && global.mainWindow && global.mainWindow.webContents.send("playerCmd", playerCmd);
    additionalCmd && additionalCmd();
  });
  if (!registered) {
    console.warn(`[hotkeys] failed to register accelerator "${accelerator}"`);
  }
}
