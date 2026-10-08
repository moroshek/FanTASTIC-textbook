/* FanPedia MicroSim kit: fanpedia-p5.js (FP.p5)  v1.0.0
 *
 * Layout, text and control helpers for p5.js 1.11.10 MicroSims. Extracted from
 * the six copies in ch01, ch04, ch11, ch13, ch20 and ch25 (see
 * logs/microsim-standardization-review-2026-10-08.md §2.1).
 *
 * Rules:
 *  - Defines NO p5 callbacks (setup, draw, keyPressed, windowResized, ...).
 *    The sim keeps its own and calls these helpers from them.
 *  - Calls p5 drawing functions only when a helper runs, never at load time,
 *    so it can be loaded before or after p5.
 *  - Works in p5 global mode by default; for instance mode call FP.p5.use(p).
 *  - Colours come from FP.tok() (fanpedia-core.js) with the §4.1 hex fallbacks.
 */
(function (root) {
  'use strict';
  var FP = root.FP = root.FP || {};
  if (FP.p5 && FP.p5.__version) {
    if (typeof module === 'object' && module.exports) module.exports = FP.p5;
    return; // loaded twice: keep the first copy
  }

  // ---- token access (works without fanpedia-core.js / fanpedia-sim.css) ----
  var FALLBACK = {
    '--fp-primary': '#3f51b5',
    '--fp-primary-dark': '#303f9f',
    '--fp-primary-bg': '#e8eaf6',
    '--fp-accent': '#f57c00',
    '--fp-accent-text': '#a84300',
    '--fp-correct': '#2e7d32',
    '--fp-correct-bg': '#e8f5e9',
    '--fp-incorrect': '#c62828',
    '--fp-incorrect-bg': '#ffebee',
    '--fp-info-bg': '#eef2f7',
    '--fp-text': '#263238',
    '--fp-text-muted': '#546e7a',
    '--fp-draw-bg': '#f0f8ff',
    '--fp-ctrl-bg': '#ffffff',
    '--fp-border': '#c0c0c0'
  };
  function tok(name) {
    var v = null;
    if (typeof FP.tok === 'function') {
      try { v = FP.tok(name); } catch (e) { v = null; }
    }
    return (v && String(v).trim()) || FALLBACK[name] || '#000000';
  }

  // ---- p5 instance (global mode = the global object) ----
  var inst = null;
  function P() { return inst || root; }
  function use(p) { inst = p || null; return api; }

  // ---- layout constants (§4.1 spacing) ----
  var L = {
    drawHeight: 400,
    controlHeight: 50,
    margin: 10,          // outer margin
    rowPitch: 35,        // control row pitch
    rowTop: 8,           // first control row at drawHeight + 8
    labelOffset: 20,     // control label centre at drawHeight + 20 + 35n
    gap: 8,
    titleSize: 22,
    bodySize: 16,
    noteSize: 13,
    minSize: 12
  };

  // Set layout values once in setup() so controlRow() works before the first draw.
  function config(o) {
    if (o) for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) L[k] = o[k];
    return L;
  }

  // Control-region height for `rows` rows: 35 per row + 10 (ch25 convention).
  function controlHeightFor(rows) { return rows * L.rowPitch + 10; }

  // Top y of control row n (0-based): drawHeight + 8 + 35n.
  function controlRow(n, drawH) {
    return (drawH != null ? drawH : L.drawHeight) + L.rowTop + L.rowPitch * (n || 0);
  }
  // Centre y for a text label in control row n: drawHeight + 20 + 35n.
  function controlLabel(n, drawH) {
    return (drawH != null ? drawH : L.drawHeight) + L.labelOffset + L.rowPitch * (n || 0);
  }

  // Slider width that fills the row after a label column (ch01/ch13/ch25 pattern).
  function sliderWidth(canvasW, leftMargin, rightMargin, minW) {
    return Math.max(minW || 80, canvasW - leftMargin - (rightMargin != null ? rightMargin : 25));
  }

  // ---- regions ----
  // Drawing region (aliceblue) above, control region (white) below, silver borders.
  function regions(drawH, ctrlH) {
    var p = P();
    if (drawH != null) L.drawHeight = drawH;
    if (ctrlH != null) L.controlHeight = ctrlH;
    var w = p.width;
    p.push();
    p.stroke(tok('--fp-border'));
    p.strokeWeight(1);
    p.fill(tok('--fp-draw-bg'));
    p.rect(0, 0, w, L.drawHeight);
    p.fill(tok('--fp-ctrl-bg'));
    p.rect(0, L.drawHeight, w, L.controlHeight);
    p.pop();
  }

  // ---- text helpers ----
  function measureWith(measure) {
    if (typeof measure === 'function') return measure;
    return function (s) { return P().textWidth(s); };
  }

  // Splits str into lines no wider than maxW. Honours '\n'. A single word wider
  // than maxW gets its own line (never split mid-word). `measure(s)` defaults to
  // p5 textWidth at the current text size and style.
  function wrapLines(str, maxW, measure) {
    var m = measureWith(measure);
    var out = [];
    var paras = String(str == null ? '' : str).split('\n');
    for (var pi = 0; pi < paras.length; pi++) {
      var words = paras[pi].split(/ +/).filter(function (w) { return w !== ''; });
      var line = '';
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (line && m(test) > maxW) { out.push(line); line = words[i]; } else { line = test; }
      }
      out.push(line); // empty paragraph keeps a blank line
    }
    return out;
  }

  function countLines(str, maxW, measure) { return wrapLines(str, maxW, measure).length; }

  // Draws wrapped text with its first line's TOP at y (uses current textAlign
  // horizontally) and returns the y below the last line. opts.dryRun measures
  // without drawing; opts.maxLines truncates with an ellipsis.
  function wrapText(str, x, y, maxW, lineH, opts) {
    opts = opts || {};
    var p = P();
    var lines = wrapLines(str, maxW, opts.measure);
    if (opts.maxLines && lines.length > opts.maxLines) {
      lines = lines.slice(0, opts.maxLines);
      lines[lines.length - 1] = lines[lines.length - 1].replace(/\s*\S*$/, '') + '…';
    }
    lineH = lineH || Math.round((p.textSize ? p.textSize() : L.bodySize) * 1.3);
    if (!opts.dryRun) {
      p.push();
      p.textAlign(opts.align != null ? opts.align : (p.LEFT || 'left'), p.TOP || 'top');
      for (var i = 0; i < lines.length; i++) p.text(lines[i], x, y + i * lineH);
      p.pop();
    }
    return y + lines.length * lineH;
  }

  // Largest text size in [min, max] whose layout fits maxH. layout(ts) must
  // return the height it would use at size ts (draw nothing; use dryRun).
  // textSize(ts) is set before each call and left at the chosen size.
  function fitTextSize(layout, maxH, max, min) {
    var p = P();
    var hi = max || L.bodySize, lo = min || L.minSize;
    var ts = hi;
    for (; ts > lo; ts--) {
      if (p.textSize) p.textSize(ts);
      if (layout(ts) <= maxH) break;
    }
    if (p.textSize) p.textSize(ts);
    return ts;
  }

  // ---- title, panel, status line, note ----
  // 22px bold centered title at y=10; shrinks (to 16px) when it would not fit.
  // Returns the y below the title.
  function title(str, opts) {
    opts = opts || {};
    var p = P();
    var size = opts.size || L.titleSize;
    var y = opts.y != null ? opts.y : 10;
    var maxW = p.width - 2 * L.margin;
    p.push();
    p.noStroke();
    p.fill(tok('--fp-text'));
    p.textStyle(p.BOLD);
    p.textSize(size);
    while (size > 16 && p.textWidth(str) > maxW) { size--; p.textSize(size); }
    p.textAlign(p.CENTER, p.TOP);
    p.text(str, p.width / 2, y);
    p.pop();
    return y + size + 8;
  }

  // Translucent rounded white panel (alpha 230, grey 200 border, radius 8).
  // opts.fill / opts.stroke accept token names ('--fp-correct-bg') or colours;
  // opts.dashed draws a dashed border (pair with ✗ feedback, §4.2).
  function panel(x, y, w, h, opts) {
    opts = opts || {};
    var p = P();
    p.push();
    p.strokeWeight(opts.weight || 1);
    if (opts.stroke) p.stroke(color(opts.stroke)); else p.stroke(200);
    if (opts.fill) p.fill(color(opts.fill)); else p.fill(255, 255, 255, 230);
    if (opts.dashed && p.drawingContext) p.drawingContext.setLineDash([6, 4]);
    p.rect(x, y, w, h, opts.radius != null ? opts.radius : 8);
    if (opts.dashed && p.drawingContext) p.drawingContext.setLineDash([]);
    p.pop();
  }
  function color(c) { return (typeof c === 'string' && c.indexOf('--fp-') === 0) ? tok(c) : c; }

  // Status line under the title: `left` (score, bold) at the left margin and
  // `right` (progress, muted) right-aligned. When both do not fit on one line,
  // `right` drops to a second line. `note` (optional) is drawn with note().
  // Returns the y below the status line.
  function statusLine(left, right, note, opts) {
    opts = opts || {};
    var p = P();
    var y = opts.y != null ? opts.y : 40;
    var size = opts.size || 15;
    var lineH = size + 6;
    var x0 = L.margin, x1 = p.width - L.margin;
    p.push();
    p.noStroke();
    p.textSize(size);
    p.textAlign(p.LEFT, p.TOP);
    p.textStyle(p.BOLD);
    var lw = left ? p.textWidth(left) : 0;
    if (left) { p.fill(tok('--fp-text')); p.text(left, x0, y); }
    p.textStyle(p.NORMAL);
    var bottom = y + lineH;
    if (right) {
      var rw = p.textWidth(right);
      p.fill(tok('--fp-text-muted'));
      if (!left || lw + 16 + rw <= x1 - x0) {
        p.textAlign(p.RIGHT, p.TOP);
        p.text(right, x1, y);
      } else {
        p.text(right, x0, y + lineH);
        bottom += lineH;
      }
    }
    p.pop();
    if (note) FP.p5.note(note);
    return bottom;
  }

  // Data label (.fp-note equivalent): 13px muted, bottom-left of the drawing
  // region (§4.2). Parts may be an array; they are joined with " · ".
  // Truncates with an ellipsis rather than overflowing the canvas.
  function note(text, opts) {
    opts = opts || {};
    var p = P();
    var s = Array.isArray(text) ? text.filter(Boolean).join(' · ') : String(text);
    var maxW = p.width - 2 * L.margin;
    p.push();
    p.noStroke();
    p.fill(tok('--fp-text-muted'));
    p.textStyle(p.NORMAL);
    p.textSize(opts.size || L.noteSize);
    if (p.textWidth(s) > maxW) {
      while (s.length > 1 && p.textWidth(s + '…') > maxW) s = s.slice(0, -1);
      s = s.replace(/\s+$/, '') + '…';
    }
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text(s, L.margin, opts.y != null ? opts.y : L.drawHeight - 6);
    p.pop();
  }

  // ---- controls ----
  function elt(c) { return c && c.elt ? c.elt : c; }
  function isHidden(c) {
    var e = elt(c);
    return !e || (e.style && e.style.display === 'none');
  }

  // Creates a p5 button parented to <main>, with the kit class.
  function button(label, onPress, opts) {
    opts = opts || {};
    var p = P();
    var b = p.createButton(label);
    var main = typeof document !== 'undefined' ? document.querySelector('main') : null;
    if (main) b.parent(main);
    b.addClass('fp-btn');
    if (opts.variant) b.addClass('fp-btn-' + opts.variant);
    b.elt.type = 'button';
    // A click listener, not p5 mousePressed (mousedown only), so Enter and
    // Space on a focused button press it too.
    if (onPress) b.elt.addEventListener('click', onPress);
    return b;
  }

  // Lays out buttons left to right from control row `row`, wrapping onto the
  // next row when the canvas is too narrow (§4.5 item 6). `null` or '|' in the
  // list adds a group gap (ch04 bins | navigation). Hidden buttons are skipped.
  // Returns the index of the next free row. Reserve controlHeightFor() rows for
  // the narrowest width (320 px) the sim supports.
  function flowButtons(row, buttons, opts) {
    opts = opts || {};
    var p = P();
    var x0 = opts.x != null ? opts.x : L.margin;
    var maxX = opts.maxX != null ? opts.maxX : p.width - L.margin;
    var gap = opts.gap != null ? opts.gap : L.gap;
    var groupGap = opts.groupGap != null ? opts.groupGap : 16;
    var widthOf = opts.measure || function (b) { return elt(b).offsetWidth || 0; };
    var r = row, x = x0, pendingGap = 0, any = false;
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (b === null || b === '|') { pendingGap = groupGap; continue; }
      if (isHidden(b)) continue;
      var w = widthOf(b);
      var bx = any ? x + pendingGap : x;
      if (any && bx + w > maxX) { r++; bx = x0; }
      var y = controlRow(r) + (opts.dy || 0);
      if (b.position) b.position(bx, y); else { var e = elt(b); e.style.position = 'absolute'; e.style.left = bx + 'px'; e.style.top = y + 'px'; }
      x = bx + w + gap;
      pendingGap = 0;
      any = true;
    }
    return any ? r + 1 : row;
  }

  // Enables or disables a p5 element or DOM control (disabled + aria-disabled).
  function setEnabled(c, on) {
    var e = elt(c);
    if (!e) return;
    e.disabled = !on;
    if (e.setAttribute) e.setAttribute('aria-disabled', on ? 'false' : 'true');
  }

  // ---- keyboard ----
  // Normalises a p5 key/keyCode pair to a map key: letters lower-case,
  // 'Enter', 'Escape', ' ' (also matched by 'Space'), 'ArrowLeft', ...
  var CODE_NAMES = { 13: 'Enter', 27: 'Escape', 32: ' ', 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown', 8: 'Backspace', 9: 'Tab' };
  function normKey(k, code) {
    if (code != null && CODE_NAMES[code]) return CODE_NAMES[code];
    if (k === 'Return') return 'Enter';
    if (typeof k === 'string' && k.length === 1) return k.toLowerCase();
    return k;
  }
  function inTextField(target) {
    if (!target || !target.tagName) return false;
    var tag = target.tagName.toUpperCase();
    if (tag === 'TEXTAREA' || target.isContentEditable) return true;
    if (tag === 'SELECT') return true;
    if (tag !== 'INPUT') return false;
    var t = (target.type || 'text').toLowerCase();
    return ['text', 'number', 'search', 'email', 'tel', 'url', 'password'].indexOf(t) >= 0;
  }
  function buildMap(map) {
    var m = {};
    for (var k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      var nk = k === 'Space' ? ' ' : (k.length === 1 ? k.toLowerCase() : k);
      m[nk] = map[k];
    }
    return m;
  }
  // Pure lookup used by bind(): returns the handler or null. While focus is in
  // a text field only Enter and Escape are matched (typing "1" in an answer box
  // must not press bin 1). A focused <button> gets Enter/Space natively, so
  // those are left to the browser there.
  function match(map, k, code, target) {
    var nk = normKey(k, code);
    var m = buildMap(map);
    if (inTextField(target) && nk !== 'Enter' && nk !== 'Escape') return null;
    if (target && target.tagName && target.tagName.toUpperCase() === 'BUTTON' && (nk === 'Enter' || nk === ' ')) return null;
    return Object.prototype.hasOwnProperty.call(m, nk) ? m[nk] : null;
  }
  // Returns a handler to call from the sim's own keyPressed():
  //   const keys = FP.p5.keys.bind({'1': () => place(0), Enter: next});
  //   function keyPressed() { return keys(); }
  // Handlers receive the normalised key. Returns false (p5: prevent default)
  // when a handler ran, otherwise undefined.
  function bind(map) {
    return function () {
      var p = P();
      var target = typeof document !== 'undefined' ? document.activeElement : null;
      var fn = match(map, p.key, p.keyCode, target);
      if (!fn) return undefined;
      fn(normKey(p.key, p.keyCode));
      return false;
    };
  }

  // ---- canvas sizing (AGENTS.md p5 rules) ----
  // Returns the width to use: <main>'s width, at least minW (default 320).
  // Keep the sim's own updateCanvasSize() and call it FIRST in setup():
  //   function updateCanvasSize() { canvasWidth = FP.p5.updateCanvasSize(); }
  function updateCanvasSize(minW, fallback) {
    var min = minW != null ? minW : 320;
    var w = 0;
    if (typeof document !== 'undefined') {
      var main = document.querySelector('main');
      if (main) w = main.offsetWidth || main.clientWidth || 0;
    }
    if (!w) w = fallback || (P().width || 800);
    return Math.max(min, w);
  }

  // Creates the canvas and parents it to the bare <main> (never id="main").
  function canvas(w, h) {
    var p = P();
    var c = p.createCanvas(w, h);
    if (typeof document !== 'undefined') {
      var main = document.querySelector('main');
      if (main) c.parent(main);
    }
    return c;
  }

  var api = {
    __version: '1.0.0',
    use: use,
    tok: tok,
    layout: L,
    config: config,
    controlHeightFor: controlHeightFor,
    controlRow: controlRow,
    controlLabel: controlLabel,
    sliderWidth: sliderWidth,
    regions: regions,
    title: title,
    panel: panel,
    statusLine: statusLine,
    note: note,
    wrapLines: wrapLines,
    countLines: countLines,
    wrapText: wrapText,
    fitTextSize: fitTextSize,
    button: button,
    flowButtons: flowButtons,
    setEnabled: setEnabled,
    keys: { bind: bind, match: match, normKey: normKey },
    updateCanvasSize: updateCanvasSize,
    canvas: canvas
  };
  FP.p5 = api;

  if (typeof module === 'object' && module.exports) module.exports = FP.p5;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
