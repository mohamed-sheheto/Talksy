/* Lightweight socket initializer used by the client UI.
   Exposes `socket` as a global for simple usage in `script.js`.
*/
const socket = (function initSocket() {
  if (typeof io === "undefined") return null;
  const s = io();
  s.on("connect", () => console.log("socket connected", s.id));
  s.on("disconnect", () => console.log("socket disconnected"));
  // debug passthrough events (server may emit these)
  s.on("join", (data) => console.debug("socket join", data));
  return s;
})();

// export for other scripts that reference `socket`
window.socket = socket;
