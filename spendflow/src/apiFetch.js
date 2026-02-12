let setLoading = null;
let setText = null;

let active = 0;
let wakeTimer = null;

export function registerGlobalLoader(loadingFn, textFn) {
  setLoading = loadingFn;
  setText = textFn || null; // ✅ optional
}

export async function apiFetch(url, options = {}) {
  active += 1;
  setLoading?.(true);

  // ✅ Only set text if provided
  if (setText && active === 1) {
    setText("Connecting to server…");
    wakeTimer = setTimeout(() => {
      setText("Waking up free server… (first time can be slow)");
    }, 2000);
  }

  try {
    return await fetch(url, options);
  } finally {
    active -= 1;

    if (active <= 0) {
      active = 0;
      if (wakeTimer) {
        clearTimeout(wakeTimer);
        wakeTimer = null;
      }
      if (setText) setText("");
      setLoading?.(false);
    }
  }
}
