/**
 * @typedef {Object} AppContext
 * @property {import("electron").BrowserWindow} [mainWindow]
 * @property {{ get: (key: string, defaultValue?: any) => any }} [store]
 */

/** @type {AppContext} */
const appContext = globalThis;
const webContents = appContext.mainWindow && !appContext.mainWindow.isDestroyed()
	? appContext.mainWindow.webContents
	: null;

// (реклама/оверлеи)
const ADS_CSS = `
  .d-overhead, .ads-block, .ads-block__no-ads, .bar-below, .tableau, .branding.branding_brick {
    display: none !important;
  }
`;

// Селекторы для "волны"/vibe-анимаций.
// noinspection SpellCheckingInspection
const WAVE_SELECTORS = [
	"[class*='VibeAnimation_']",
	"[class*='VibeBlock_vibeAnimation']",
	"[class*='TimecodeGroup_timecode_current_animation']",
	"[class*='NavbarDesktopAnimatedBar_root']",
];

// noinspection SpellCheckingInspection
const WAVE_CSS = `
  [class*="VibeAnimation_"],
  [class*="VibeBlock_vibeAnimation"],
  [class*="TimecodeGroup_timecode_current_animation"],
  [class*="NavbarDesktopAnimatedBar_root"] {
    display: none !important;
  }

  [class*="VibeAnimation_"],
  [class*="VibeAnimation_"] *,
  [class*="VibeBlock_vibeAnimation"],
  [class*="VibeBlock_vibeAnimation"] *,
  [class*="NavbarDesktopAnimatedBar_root"],
  [class*="NavbarDesktopAnimatedBar_root"] * {
    animation: none !important;
    transition: none !important;
  }
`;

// noinspection GrazieInspection
const THEME_SCROLLBAR_CSS = `
  @media (prefers-color-scheme: dark) {
    html {
      color-scheme: dark;
    }
  }
  @media (prefers-color-scheme: light) {
    html {
      color-scheme: light;
    }
  }
`;

const ENABLE_WAVE_BLOCK_SCRIPT = `
  (() => {
    const selectors = ${JSON.stringify(WAVE_SELECTORS)};
    const hide = (element) => {
      if (!element || !element.style) return;
      element.style.setProperty("display", "none", "important");
      element.style.setProperty("animation", "none", "important");
      element.style.setProperty("transition", "none", "important");
    };
    const hideInTree = (root) => {
      if (!root || typeof root.querySelectorAll !== "function") return;
      selectors.forEach((selector) => root.querySelectorAll(selector).forEach(hide));
    };

    if (window.__ymWaveObserver) {
      window.__ymWaveObserver.disconnect();
      window.__ymWaveObserver = null;
    }

    hideInTree(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          hideInTree(node);
          selectors.forEach((selector) => {
            try {
              if (node.matches(selector)) hide(node);
            } catch (_) {}
          });
        });
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__ymWaveObserver = observer;
  })();
`;

const DISABLE_WAVE_BLOCK_SCRIPT = `
  (() => {
    if (window.__ymWaveObserver) {
      window.__ymWaveObserver.disconnect();
      window.__ymWaveObserver = null;
    }
  })();
`;

function runScript(script) {
	if (!webContents || webContents.isDestroyed()) return;
	webContents.executeJavaScript(script, true).catch(() => {
	});
}

function runInsertCSS(css) {
	if (!webContents || webContents.isDestroyed()) return;
	webContents.insertCSS(css).catch(() => {
	});
}

if (webContents && !webContents.isDestroyed()) {
	webContents.on("dom-ready", () => {
		runInsertCSS(ADS_CSS);

		// optional wave animation blocking
		const waveAnimationDisabled = appContext.store
			? appContext.store.get("disable_wave_animation", false)
			: false;
		if (waveAnimationDisabled) {
			runInsertCSS(WAVE_CSS);
			runScript(ENABLE_WAVE_BLOCK_SCRIPT);
		} else {
			runScript(DISABLE_WAVE_BLOCK_SCRIPT);
		}

		// scrollbar for dark mode
		runInsertCSS(THEME_SCROLLBAR_CSS);
	});
}
