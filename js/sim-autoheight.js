// Sizes MicroSim iframes to their content.
// Every sim loads docs/sims/shared-libs/fanpedia-core.js (kit 1.3+), which,
// inside an iframe, posts {type: 'fp-sim-height', height, href} to this page
// whenever its content height changes. We set that iframe's CSS height to the
// reported px (iframes are box-sizing: content-box in extra.css, so the 2 px
// border stays outside). The iframe's height attribute stays as the no-JS
// fallback. Only same-origin messages are accepted.
(function () {
  "use strict";
  if (window.__fpSimAutoHeight) return;
  window.__fpSimAutoHeight = true;

  var MAX_HEIGHT = 20000;   // ignore absurd values instead of making a 1 km page

  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin) return;
    var data = event.data;
    if (!data || data.type !== "fp-sim-height") return;
    var h = Math.round(Number(data.height));
    if (!(h > 0) || h > MAX_HEIGHT) return;
    var frames = document.getElementsByTagName("iframe");
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === event.source) {
        if (frames[i].style.height !== h + "px") frames[i].style.height = h + "px";
        return;
      }
    }
  });

  // A sim that loaded before this script ran has already posted its height;
  // ask every iframe to send it again (sims ignore requests from elsewhere).
  function requestHeights() {
    var frames = document.getElementsByTagName("iframe");
    for (var i = 0; i < frames.length; i++) {
      try {
        frames[i].contentWindow.postMessage({ type: "fp-sim-height-request" }, window.location.origin);
      } catch (e) { /* cross-origin or not loaded yet: it posts on its own load */ }
    }
  }

  // document$ (Material) fires on every page load, including instant-navigation swaps.
  if (typeof document$ !== "undefined") {
    document$.subscribe(requestHeights);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", requestHeights);
  } else {
    requestHeights();
  }
})();
