const MUSIC_KEY = "mastery-path:focus-music";
const VOLUME_KEY = "mastery-path:focus-volume";
const VIDEO_ID = "kqy44M6utSo";
const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* Playback works without storage. */
  }
};
let apiPromise;
function youtubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => {
      script.remove();
      apiPromise = null;
      reject(new Error("YouTube did not load"));
    }, 15000);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      previous?.();
      resolve(window.YT);
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      apiPromise = null;
      reject(new Error("YouTube is unavailable"));
    };
    document.head.append(script);
  });
  return apiPromise;
}

export class FocusMusic extends HTMLElement {
  connectedCallback() {
    this.generation = (this.generation ?? 0) + 1;
    this.enabled = read(MUSIC_KEY, "on") !== "off";
    const volume = Number(read(VOLUME_KEY, "20"));
    this.volume = Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) : 20;
    this.innerHTML = `<style>
      focus-music {display:block;font:600 15px/1.5 Nunito,system-ui,sans-serif;color:#153e4d;margin:16px auto;max-width:1152px;padding:0 16px;box-sizing:border-box}
      focus-music .fm-card {display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;border:2px solid #cbe3e5;border-radius:20px;padding:16px;background:#f1fbfa}
      focus-music .fm-copy {flex:1 1 220px;min-width:0}
      focus-music h2 {font:800 20px/1.3 Nunito,system-ui,sans-serif;margin:0 0 4px}
      focus-music p {margin:4px 0}
      focus-music button {border:2px solid #007f83;border-radius:12px;background:white;color:#00686c;font:inherit;padding:8px 12px;min-height:44px;cursor:pointer}
      focus-music button:focus-visible,focus-music a:focus-visible,focus-music input:focus-visible {outline:3px solid #237eb1;outline-offset:3px}
      focus-music .fm-controls {display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px}
      focus-music label {display:flex;align-items:center;gap:8px}
      focus-music input {width:100px;accent-color:#008b8f}
      focus-music a {color:#00686c;text-decoration:underline}
      focus-music .fm-player {flex:0 1 360px;max-width:100%;min-width:200px}
      focus-music iframe {display:block;width:100%;height:203px;border:0;border-radius:12px}
      focus-music [hidden] {display:none!important}
    </style><section class="fm-card" aria-label="Focus music">
      <div class="fm-copy"><h2>Focus music</h2><p>Deep Work Music · Alpha Waves &amp; Binaural Beats</p>
      <p class="fm-status" role="status"></p><div class="fm-controls"><button type="button" class="fm-toggle"></button>
      <label>Volume <input type="range" min="0" max="100" step="1" aria-label="Music volume"></label></div>
      <p><a href="https://www.youtube.com/watch?v=kqy44M6utSo" target="_blank" rel="noopener noreferrer">Open on YouTube</a></p></div><div class="fm-player"></div>
    </section>`;
    this.querySelector("input").value = String(this.volume);
    this.querySelector("input").oninput = (event) => {
      this.volume = Number(event.target.value);
      save(VOLUME_KEY, this.volume);
      this.player?.setVolume?.(this.volume);
      if (this.volume > 0) this.player?.unMute?.();
    };
    this.querySelector(".fm-toggle").onclick = () => {
      this.enabled = !this.enabled;
      save(MUSIC_KEY, this.enabled ? "on" : "off");
      this.update();
    };
    this.update();
  }
  status(text) {
    this.querySelector(".fm-status").textContent = text;
  }
  stop() {
    this.generation++;
    this.player?.destroy();
    this.player = null;
    this.querySelector(".fm-player")?.replaceChildren();
  }
  disconnectedCallback() {
    this.stop();
  }
  async update() {
    this.stop();
    const button = this.querySelector(".fm-toggle");
    button.textContent = this.enabled ? "Turn music off" : "Turn music on";
    button.setAttribute("aria-pressed", String(this.enabled));
    const host = this.querySelector(".fm-player");
    host.hidden = !this.enabled;
    this.querySelector("input").disabled = !this.enabled;
    if (!this.enabled) {
      this.status("Music is off.");
      return;
    }
    this.status("Loading music… If it does not start, press Play in the player.");
    const generation = this.generation;
    try {
      const YT = await youtubeAPI();
      if (!this.isConnected || generation !== this.generation) return;
      const slot = document.createElement("div");
      host.append(slot);
      this.player = new YT.Player(slot, {
        width: "360",
        height: "203",
        videoId: VIDEO_ID,
        playerVars: {
          playsinline: 1,
          controls: 1,
          loop: 1,
          playlist: VIDEO_ID,
          origin: location.origin,
        },
        events: {
          onReady: (event) => {
            if (generation !== this.generation) return;
            event.target.getIframe().title = "Deep Work Music YouTube player";
            event.target.setVolume(this.volume);
            event.target.playVideo();
            this.status("Press Play in the player if the music does not start.");
          },
          onStateChange: (event) => {
            if (generation !== this.generation) return;
            if (event.data === 1) this.status("Music is playing. You can pause it in the player.");
            if (event.data === 2) this.status("Music is paused. Press Play to continue.");
          },
          onAutoplayBlocked: () => {
            if (generation === this.generation)
              this.status("Press Play in the player to start your music.");
          },
          onError: () => {
            if (generation === this.generation)
              this.status(
                "This track could not play here. Try Open on YouTube, or turn music off and on to retry.",
              );
          },
        },
      });
    } catch {
      if (generation === this.generation && this.isConnected)
        this.status(
          "YouTube could not load. Turn music off and on to retry, or use Open on YouTube.",
        );
    }
  }
}
if (!customElements.get("focus-music")) customElements.define("focus-music", FocusMusic);
