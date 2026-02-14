const ipc = require("electron").ipcRenderer;

const EXTERNAL_API_POLL_INTERVAL = 500;
const EXTERNAL_API_MAX_RETRIES = 240;
const FALLBACK_BRIDGE_POLL_INTERVAL = 1000;
const PLAYER_CMD_FALLBACK_KEYS = {
  play: "K",
  pause: "K",
  togglePause: "K",
  next: "N",
  prev: "P",
  love: "F",
  toggleLike: "F",
  dislike: "D",
  toggleDislike: "D",
  toggleRepeat: "R",
  toggleShuffle: "S",
  toggleMute: "M",
};

let externalBridgeInitialized = false;
let fallbackBridgeInitialized = false;
let fallbackCurrentTrackKey;
let fallbackCurrentPlayingState;

document.addEventListener("DOMContentLoaded", () => {
  let bodyAttributesObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      let bodyClasses = document.body.classList;
      if (mutation.attributeName == "class" && bodyClasses.contains("body_bar-tall")) {
        bodyClasses.remove("body_bar-tall");
      }
    }
  });
  bodyAttributesObserver.observe(document.body, { attributes: true });

  initBackNavigationButton();
  initFallbackBridge();
  waitForExternalAPI();
});

ipc.on("playerCmd", (_event, cmd) => {
  let currentTrack = null;
  switch (cmd) {
    case "play":
      runCommandWithFallback(cmd, () => callExternal("togglePause", false));
      break;
    case "pause":
      runCommandWithFallback(cmd, () => callExternal("togglePause", true));
      break;
    case "love":
      runCommandWithFallback(cmd, () => {
        currentTrack = getCurrentTrack();
        if (currentTrack && currentTrack.liked) return true;
        return callExternal("toggleLike");
      });
      break;
    case "dislike":
      runCommandWithFallback(cmd, () => {
        currentTrack = getCurrentTrack();
        if (currentTrack && currentTrack.disliked) return true;
        return callExternal("toggleDislike");
      });
      break;
    case "volumeDown":
      runCommandWithFallback(cmd, () => {
        const volume = getVolume();
        if (typeof volume !== "number") return false;
        return callExternal("setVolume", clamp(volume - 0.1, 0, 1));
      });
      break;
    case "volumeUp":
      runCommandWithFallback(cmd, () => {
        const volume = getVolume();
        if (typeof volume !== "number") return false;
        return callExternal("setVolume", clamp(volume + 0.1, 0, 1));
      });
      break;
    case "goBackward":
      runCommandWithFallback(cmd, () => {
        const progress = getProgress();
        if (!progress || typeof progress.position !== "number") return false;
        return callExternal("setPosition", Math.max(progress.position - 5, 0));
      });
      break;
    case "goForward":
      runCommandWithFallback(cmd, () => {
        const progress = getProgress();
        if (!progress || typeof progress.position !== "number") return false;
        return callExternal("setPosition", progress.position + 5);
      });
      break;
    case "prev":
      runCommandWithFallback(cmd, () => {
        const progress = getProgress();
        if (progress && typeof progress.position === "number" && progress.position >= 3) {
          return callExternal("setPosition", 0);
        }
        return callExternal("prev");
      });
      break;
    default:
      runCommandWithFallback(cmd, () => callExternal(cmd));
  }
});

ipc.on("playerSeek", (_event, to) => {
  callExternal("setPosition", to);
});

ipc.on("navigate", (_event, url) => {
  if (!callExternal("navigate", url)) {
    window.location.href = url;
  }
});

ipc.on("playTrack", (_event, index) => {
  callExternal("play", index);
});

function initBackNavigationButton() {
  let headSearch = document.querySelector(".head-kids__controlls");
  if (headSearch) {
    let template = document.createElement("template");
    template.innerHTML = `<div class="head-kids__search"><div class="d-search"><button
      class="d-button deco-button deco-button-flat d-button_type_flat d-button_w-icon d-button_w-icon-centered"
      style="margin-left: 22px; margin-right: -22px;" disabled>
      <span class="d-button-inner deco-button-stylable">
      <span class="d-button__inner"><span class="d-icon deco-icon d-icon_arrow-left"></span></span>
      </span></button></div></div>`;
    let nodeElement = template.content.firstElementChild;
    nodeElement.onclick = () => window.history.back();
    headSearch.insertBefore(nodeElement, headSearch.firstChild);

    ipc.on("navigated", (_event, { canGoBack }) => {
      nodeElement.querySelector('button').disabled = !canGoBack;
    });
  }
}

document.addEventListener('keydown', (e) => {
  if (e.metaKey && e.key === 'f') {
    const searchButton = document.querySelector(".d-search__button");
    searchButton && searchButton.click();
  }
}, false);

window.close = undefined;

require("./darkmode");

function getExternalAPI() {
  return globalThis.externalAPI || (typeof window !== "undefined" ? window.externalAPI : undefined);
}

function invokeExternal(method, ...args) {
  const externalAPI = getExternalAPI();
  if (!externalAPI) return undefined;

  const fn = externalAPI[method];
  if (typeof fn !== "function") return undefined;

  try {
    return fn.apply(externalAPI, args);
  } catch (error) {
    console.error(`[playerCmd] externalAPI.${method} failed`, error);
    return undefined;
  }
}

function callExternal(method, ...args) {
  const externalAPI = getExternalAPI();
  if (!externalAPI) return false;

  const fn = externalAPI[method];
  if (typeof fn !== "function") return false;

  try {
    fn.apply(externalAPI, args);
    return true;
  } catch (error) {
    console.error(`[playerCmd] externalAPI.${method} failed`, error);
    return false;
  }
}

function getCurrentTrack() {
  const track = invokeExternal("getCurrentTrack");
  return track || null;
}

function getProgress() {
  const progress = invokeExternal("getProgress");
  return progress || null;
}

function getControls() {
  const controls = invokeExternal("getControls");
  return controls || {};
}

function getTracksList() {
  const tracks = invokeExternal("getTracksList");
  return Array.isArray(tracks) ? tracks.filter((track) => !!track) : [];
}

function getVolume() {
  return invokeExternal("getVolume");
}

function isPlaying() {
  return !!invokeExternal("isPlaying");
}

function runCommandWithFallback(cmd, handler) {
  let handled = false;
  try {
    handled = !!handler();
  } catch (error) {
    console.error(`[playerCmd] handler for "${cmd}" failed`, error);
  }

  if (!handled) {
    const keyCode = PLAYER_CMD_FALLBACK_KEYS[cmd];
    if (keyCode) {
      ipc.send("playerHotkey", keyCode);
    }
  }
}

function waitForExternalAPI(retry = 0) {
  const externalAPI = getExternalAPI();
  if (externalAPI && typeof externalAPI.on === "function") {
    initExternalBridge(externalAPI);
    return;
  }

  if (retry >= EXTERNAL_API_MAX_RETRIES) {
    console.warn("[preload] externalAPI is unavailable, fallback bridge is enabled");
    initFallbackBridge();
    return;
  }

  setTimeout(() => waitForExternalAPI(retry + 1), EXTERNAL_API_POLL_INTERVAL);
}

function initExternalBridge(externalAPI) {
  if (externalBridgeInitialized) return;
  externalBridgeInitialized = true;
  initFallbackBridge();

  onExternalEvent(externalAPI, externalAPI.EVENT_READY, () => {
    ipc.send("playerIsReady");
  });

  onExternalEvent(externalAPI, externalAPI.EVENT_TRACK, () => {
    const track = getCurrentTrack();
    ipc.send("changeTrack", {
      isPlaying: isPlaying(),
      currentTrack: track,
    });
    ipc.send("changePlaylist", {
      currentTrack: track,
      playlist: getTracksList(),
    });
  });

  onExternalEvent(externalAPI, externalAPI.EVENT_PROGRESS, () => {
    ipc.send("changeProgress", getProgress() || {});
  });

  onExternalEvent(externalAPI, externalAPI.EVENT_STATE, () => {
    ipc.send("changeState", {
      isPlaying: isPlaying(),
      currentTrack: getCurrentTrack(),
    });
  });

  onExternalEvent(externalAPI, externalAPI.EVENT_CONTROLS, () => {
    ipc.send("changeControls", {
      currentTrack: getCurrentTrack(),
      controls: getControls(),
    });
  });

  ipc.send("initControls", {
    currentTrack: getCurrentTrack(),
    controls: getControls(),
  });
}

function onExternalEvent(externalAPI, eventName, handler) {
  if (!eventName) return;

  try {
    externalAPI.on(eventName, handler);
  } catch (error) {
    console.error(`[preload] failed to register externalAPI event "${eventName}"`, error);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function initFallbackBridge() {
  if (fallbackBridgeInitialized) return;
  fallbackBridgeInitialized = true;

  ipc.send("playerIsReady");

  const initialState = getFallbackPlayerState();
  ipc.send("initControls", {
    currentTrack: initialState.currentTrack,
    controls: initialState.controls,
  });
  ipc.send("changeControls", initialState);

  syncFallbackPlayerState();
  setInterval(syncFallbackPlayerState, FALLBACK_BRIDGE_POLL_INTERVAL);
}

function syncFallbackPlayerState() {
  const state = getFallbackPlayerState();
  const trackKey = getTrackKey(state.currentTrack);

  if (trackKey && trackKey !== fallbackCurrentTrackKey) {
    fallbackCurrentTrackKey = trackKey;
    ipc.send("changeTrack", {
      currentTrack: state.currentTrack,
    });
    ipc.send("changePlaylist", {
      currentTrack: state.currentTrack,
      playlist: [],
    });
  }

  if (typeof state.progress.position === "number" && typeof state.progress.duration === "number") {
    ipc.send("changeProgress", state.progress);
  }

  if (state.currentTrack && fallbackCurrentPlayingState !== state.isPlaying) {
    fallbackCurrentPlayingState = state.isPlaying;
    ipc.send("changeState", {
      isPlaying: state.isPlaying,
      currentTrack: state.currentTrack,
    });
  }
}

function getFallbackPlayerState() {
  const mediaMetadata = getMediaSessionMetadata();
  const audio = getAudioElement();

  const title = cleanText(mediaMetadata?.title);
  const artist = cleanText(mediaMetadata?.artist);
  const album = cleanText(mediaMetadata?.album);
  const hasUsableTrackMeta = isUsableTrackMeta(title, artist);

  let duration = Number.isFinite(audio?.duration) ? audio.duration : 0;
  if (!duration && Number.isFinite(mediaMetadata?.duration)) {
    duration = mediaMetadata.duration;
  }

  const position = Number.isFinite(audio?.currentTime) ? audio.currentTime : 0;
  const isPlaying = !!(audio && !audio.paused && !audio.ended);

  const currentTrack = hasUsableTrackMeta
    ? {
      title,
      artists: [{ title: artist || "" }],
      album: { title: album || "", cover: undefined },
      duration: duration || 0,
      link: `/track/fallback-${hashCode(`${title}|${artist}|${album}`)}`,
      liked: false,
      disliked: false,
    }
    : null;

  return {
    currentTrack,
    isPlaying,
    progress: {
      position,
      duration: duration || 0,
    },
    controls: {
      next: true,
      prev: true,
    },
  };
}

function getMediaSessionMetadata() {
  if (!navigator.mediaSession || !navigator.mediaSession.metadata) return null;
  return navigator.mediaSession.metadata;
}

function getAudioElement() {
  return document.querySelector("audio");
}

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function getTrackKey(track) {
  if (!track || !track.title) return "";
  const artist = track.artists && track.artists[0] ? track.artists[0].title : "";
  const album = track.album ? track.album.title : "";
  return `${track.title}|${artist}|${album}`;
}

function isUsableTrackMeta(title, artist) {
  if (!title) return false;
  return !!artist || title.length > 3;
}

function hashCode(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (Math.imul(31, hash) + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}
