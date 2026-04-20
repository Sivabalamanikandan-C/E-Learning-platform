export function suppressBack(duration = 1500) {
  try {
    const handler = () => {
      // re-push same state to prevent going back
      window.history.pushState(null, "", window.location.href);
    };

    // push a state so there's something to replace
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handler);

    // remove the handler after duration
    const t = setTimeout(() => {
      window.removeEventListener("popstate", handler);
      clearTimeout(t);
    }, duration);
  } catch (e) {
    // ignore in environments where history isn't available
  }
}

export default suppressBack;
