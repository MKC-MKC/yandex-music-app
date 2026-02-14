const { app, BrowserWindow, BrowserView, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const Store = require("electron-store");

let i18n = new (require("./locales/i18n"))();

const defaultWindowWidth = 1301;
const defaultWindowHeight = 768;

let win;
let willQuitApp = false;
let initialUrl = "https://music.yandex.ru";

app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaSessionService");
process.on("uncaughtException", console.error);

app.on("before-quit", () => (willQuitApp = true));
app.on("activate", () => {
  if (win) {
    win.show();
  }
});

app.on("ready", () => {
  win = new BrowserWindow({
    title: i18n.__("App Name"),
    minHeight: 200,
    minWidth: 400,
    backgroundColor: getWindowBackgroudColor(),
    webPreferences: {
      contextIsolation: false,
      preload: path.join(__dirname, "../renderer/preload.js"),
    },
  });

  const store = new Store();
  ipcMain.handle("getStoreValue", (_event, key, defaultValue) => {
    return store.get(key, defaultValue);
  });
  ipcMain.handle("setStoreValue", (_event, key, value) => {
    return store.set(key, value);
  });
  ipcMain.on("playerHotkey", (_event, keyCode) => {
    sendPlayerHotkey(keyCode);
  });
  const windowBounds = store.get("window.bounds", { width: defaultWindowWidth, height: defaultWindowHeight });
  win.setBounds(windowBounds);

  exports.showLoader();
  win.loadURL(initialUrl);
  
  global.mainWindow = win;
  global.store = store;

  require("./features");

  win.on("close", (e) => {
    if (willQuitApp) {
      const bounds = win.getBounds();
      if (bounds.width > 400 && bounds.height > 200) {
        store.set("window.bounds", bounds);
      }
      win = null;
    } else {
      e.preventDefault();
      if (win.isFullScreen()) {
        win.once('leave-full-screen', () => win.hide())
        win.setFullScreen(false)
      } else {
        win.hide()
      }      
    }
  });
});

app.setAsDefaultProtocolClient("yandex-music-app");

app.on("open-url", (event, url) => {
  event.preventDefault();
  initialUrl = url;
  const path = url
    .replace('yandex-music-app:/', '')
    .replace('https://music.yandex.ru/', '');
  global.mainWindow.loadURL("https://music.yandex.ru/" + path);
});

exports.showLoader = () => {
  let view = new BrowserView();
  win.setBrowserView(view);
  let [width, height] = win.getSize();
  view.setBounds({ x: 0, y: 0, width: width, height: height });
  view.setAutoResize({ width: true, height: true, horizontal: true, vertical: true });
  view.webContents.loadFile("src/renderer/loader.html");

  const timoutId = setTimeout(() => {
    win.removeBrowserView(view);
  }, 10000);

  ipcMain.once("playerIsReady", () => {
    win.removeBrowserView(view);
    clearTimeout(timoutId);
  });
};

function getWindowBackgroudColor() {
  if (nativeTheme.shouldUseDarkColors) {
    return "#181818";
  } else {
    return "#ffffff";
  }
}

function sendPlayerHotkey(keyCode) {
  if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) {
    return;
  }

  if (typeof keyCode !== "string") return;
  const normalizedKeyCode = keyCode.trim().toUpperCase();
  if (!normalizedKeyCode) return;

  try {
    win.webContents.sendInputEvent({ type: "keyDown", keyCode: normalizedKeyCode });
    if (normalizedKeyCode.length === 1) {
      win.webContents.sendInputEvent({ type: "char", keyCode: normalizedKeyCode.toLowerCase() });
    }
    win.webContents.sendInputEvent({ type: "keyUp", keyCode: normalizedKeyCode });
  } catch (error) {
    console.error(`[playerHotkey] failed to send key "${normalizedKeyCode}"`, error);
  }

  const keyboardCode = normalizedKeyCode.length === 1 ? `Key${normalizedKeyCode}` : normalizedKeyCode;
  const key = normalizedKeyCode.length === 1 ? normalizedKeyCode.toLowerCase() : normalizedKeyCode;
  const keyCodeNumber = normalizedKeyCode.length === 1 ? normalizedKeyCode.charCodeAt(0) : undefined;

  const script = `
    (() => {
      const target = document.activeElement || document.body || document;
      const eventInit = {
        key: ${JSON.stringify(key)},
        code: ${JSON.stringify(keyboardCode)},
        bubbles: true,
        cancelable: true
      };
      if (${typeof keyCodeNumber === "number"}) {
        eventInit.keyCode = ${keyCodeNumber || 0};
        eventInit.which = ${keyCodeNumber || 0};
      }
      target.dispatchEvent(new KeyboardEvent("keydown", eventInit));
      target.dispatchEvent(new KeyboardEvent("keyup", eventInit));
    })();
  `;
  win.webContents.executeJavaScript(script, true).catch((error) => {
    console.error(`[playerHotkey] JS fallback failed for key "${normalizedKeyCode}"`, error);
  });
}
