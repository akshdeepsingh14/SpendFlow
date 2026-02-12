let setLoading = null;
let setText = null;

let active = 0;          // ✅ counts ongoing requests
let wakeTimer = null;    // ✅ one shared “waking server” timer

export function registerGlobalLoader(loadingFn, textFn) {
  setLoading = loadingFn;
  setText = textFn;
}

export async function apiFetch(url, options = {}) {
  active += 1;

  // show loader
  setLoading?.(true);

  // set a friendly message (only once)
  if (active === 1) {
    setText?.("Connecting to server…");

    wakeTimer = setTimeout(() => {
      // Render free usually sleeps → first request slow
      setText?.("Waking up free server… (first time can be slow)");
    }, 2000);
  }

  try {
    return await fetch(url, options);
  } finally {
    active -= 1;

    // if no more requests, hide loader
    if (active <= 0) {
      active = 0;
      if (wakeTimer) {
        clearTimeout(wakeTimer);
        wakeTimer = null;
      }
      setText?.("");
      setLoading?.(false);
    }
  }
}
