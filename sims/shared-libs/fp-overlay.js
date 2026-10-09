/* FanPedia MicroSim kit: fp-overlay.js  (FP.Overlay)  version 1
 *
 * Interactive overlay on a raster drawing (a cleaned FanPedia figure). Two engines:
 *   callout  numbered markers on parts (x/y % of the image), optional offset marker with a
 *            pointer to the part, leader lines to a label column (side, dual or top-bottom).
 *   grid     numbered rectangular zones (x1..y2 % of the image) with a label key below.
 * The drawing is one <svg viewBox="0 0 W H"> holding the <image>, so every position scales
 * with the width; markers and chips keep a constant pixel size. Narrow layouts move the label
 * column below the drawing (numbers only, no leader lines).
 *
 * Explore and quiz are handed to FP.CalloutQuiz (callout-quiz.js): each marker or zone is a
 * data-part element, each label and leader a data-label-for element. Explore: hover or focus
 * previews the label and description in the info panel; click, Enter or Space opens it
 * (visited count). Quiz: prompts in a seeded shuffle, 2 attempts, the first wrong answer shows
 * the hint, a final miss reveals the answer, mastery (default 80 %), Start over, Retry missed.
 *
 * Calibration (authors only): main.html?calibrate=1 shows a 10 % grid, lets you drag markers,
 * marker anchors and zone corners, prints % coordinates and has a Copy JSON button.
 *
 * Plain browser script: no modules, no build step, safe to load twice and in any order.
 * Needs callout-quiz.js for explore/quiz (not for calibration). Reads FP.announce if present.
 * API reference: templates/microsim/kit-docs/overlay.md (not published).
 */
(function (G) {
  'use strict';
  var FP = G.FP = G.FP || {};
  var VERSION = 1;
  if (FP.Overlay && FP.Overlay.version >= VERSION) {
    if (typeof module !== 'undefined' && module.exports) module.exports = FP.Overlay;
    return;
  }

  // ---------- Pure helpers (tested in tests/shared-libs/fp-overlay.test.js) ----------
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function round1(v) { return Math.round(v * 10) / 10; }
  function num(v) { return typeof v === 'number' && isFinite(v); }

  // Percent of an image dimension -> viewBox units, and back (clamped to 0..100, 0.1 % steps).
  function pctToView(p, size) { return p / 100 * size; }
  function viewToPct(v, size) { return round1(clamp(v / size * 100, 0, 100)); }
  // A pointer position (client px) -> image percent, given the drawing's client rect.
  function clientToPct(cx, cy, rect) {
    return {
      x: round1(clamp((cx - rect.left) / rect.width * 100, 0, 100)),
      y: round1(clamp((cy - rect.top) / rect.height * 100, 0, 100))
    };
  }
  // viewBox units per CSS pixel; markers are drawn at scale(k) so they keep their pixel size.
  function viewPerPx(viewW, pxW) { return pxW > 0 ? viewW / pxW : 1; }

  // Callout parts: (x, y) is the anchor on the part; (mx, my), when given, is where the numbered
  // marker sits (a pointer line joins it to the anchor).
  function hasOffset(p) { return num(p.mx) && num(p.my) && (p.mx !== p.x || p.my !== p.y); }
  function markerPos(p) { return hasOffset(p) ? { x: p.mx, y: p.my } : { x: p.x, y: p.y }; }

  // Grid zones
  function normZone(z) {
    return { x1: Math.min(z.x1, z.x2), y1: Math.min(z.y1, z.y2), x2: Math.max(z.x1, z.x2), y2: Math.max(z.y1, z.y2) };
  }
  function zoneArea(z) { var n = normZone(z); return (n.x2 - n.x1) * (n.y2 - n.y1); }
  function inZone(z, x, y) { var n = normZone(z); return x >= n.x1 && x <= n.x2 && y >= n.y1 && y <= n.y2; }
  // The zone under a point: the smallest one that contains it (it is painted on top), or null.
  function hitZone(zones, x, y) {
    var best = null;
    (zones || []).forEach(function (z) {
      if (inZone(z, x, y) && (!best || zoneArea(z) < zoneArea(best))) best = z;
    });
    return best;
  }
  // Paint order: larger zones first, so a smaller zone inside a larger one stays clickable.
  function paintOrder(zones) {
    return zones.map(function (z, i) { return { z: z, i: i }; })
      .sort(function (a, b) { return zoneArea(b.z) - zoneArea(a.z) || a.i - b.i; })
      .map(function (o) { return o.z; });
  }
  // Drag one corner ('tl' | 'tr' | 'bl' | 'br') to (x, y); the opposite corner stays put.
  function moveCorner(z, corner, x, y, minSize) {
    var m = minSize == null ? 2 : minSize, n = normZone(z);
    x = round1(clamp(x, 0, 100)); y = round1(clamp(y, 0, 100));
    if (corner.charAt(1) === 'l') n.x1 = Math.min(x, n.x2 - m); else n.x2 = Math.max(x, n.x1 + m);
    if (corner.charAt(0) === 't') n.y1 = Math.min(y, n.y2 - m); else n.y2 = Math.max(y, n.y1 + m);
    return { x1: round1(n.x1), y1: round1(n.y1), x2: round1(n.x2), y2: round1(n.y2) };
  }

  // Layout names (the overlay plan uses the guide's names).
  function normLayout(name) {
    var n = String(name || 'side').toLowerCase();
    if (n === 'side-panel' || n === 'side') return 'side';
    if (n === 'dual-panel' || n === 'dual') return 'dual';
    if (n === 'top-bottom' || n === 'topbottom') return 'top-bottom';
    if (n === 'below' || n === 'grid') return 'below';
    return 'side';
  }

  // Reading order for keys below a drawing: rows of items whose centres lie within `band` % of
  // the row's first item (top to bottom), each row left to right.
  function readingOrder(items, band) {
    band = band == null ? 15 : band;
    var sorted = items.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var rows = [], cur = null;
    sorted.forEach(function (it) {
      if (!cur || it.y - cur.y0 > band) { cur = { y0: it.y, items: [] }; rows.push(cur); }
      cur.items.push(it);
    });
    var out = [];
    rows.forEach(function (r) { r.items.sort(function (a, b) { return a.x - b.x; }).forEach(function (it) { out.push(it); }); });
    return out;
  }

  // Segment intersection (proper crossing; shared end points do not count).
  function segmentsCross(a, b, c, d) {
    var o = function (p, q, r) { var v = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x); return v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0; };
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  }
  // Where label j of n sits, in image %, for a panel (rows spread evenly along the drawing).
  function slot(panel, j, n) {
    var t = (j + 0.5) / n * 100, g = 6;
    if (panel === 'left') return { x: -g, y: t };
    if (panel === 'top') return { x: t, y: -g };
    if (panel === 'bottom') return { x: t, y: 100 + g };
    return { x: 100 + g, y: t };
  }
  // Leader crossings and total length for items in this order on a panel.
  function leaderCost(seq, panel) {
    var segs = seq.map(function (it, j) { return [{ x: it.x, y: it.y }, slot(panel, j, seq.length)]; });
    var cross = 0, len = 0;
    for (var i = 0; i < segs.length; i++) {
      len += Math.sqrt(Math.pow(segs[i][1].x - segs[i][0].x, 2) + Math.pow(segs[i][1].y - segs[i][0].y, 2));
      for (var j = i + 1; j < segs.length; j++) if (segmentsCross(segs[i][0], segs[i][1], segs[j][0], segs[j][1])) cross += 1;
    }
    return { crossings: cross, length: len };
  }
  // Start from the geometric sort, then swap pairs while that removes crossings or shortens the
  // leaders (deterministic local search; N is small).
  function untangle(seq, panel) {
    var best = seq.slice(), cost = function (q) { var c = leaderCost(q, panel); return c.crossings * 1000 + c.length; };
    var bc = cost(best), improved = true, passes = 0;
    while (improved && passes++ < 50) {
      improved = false;
      for (var i = 0; i < best.length; i++) for (var j = i + 1; j < best.length; j++) {
        var q = best.slice(), t = q[i]; q[i] = q[j]; q[j] = t;
        var c = cost(q);
        if (c < bc - 1e-6) { best = q; bc = c; improved = true; }
      }
    }
    return best;
  }

  // Label layout: which panel each label goes in and its number (the marker number).
  // items: [{id, x, y}] = marker positions (zone centres for grid). Proximity rule from the
  // overlay guide: side = one column, top to bottom; dual = left half by x | right half, each
  // top to bottom; top-bottom = upper half by y | lower half, each left to right; below =
  // reading order. Within a panel the order is then untangled (fewest crossing leaders, then the
  // shortest). Numbers run panel by panel.
  // Returns {order: [id], panel: {id: 'right'|'left'|'top'|'bottom'|'below'}, n: {id: 1..N}}.
  function layoutLabels(items, layout) {
    layout = normLayout(layout);
    var byY = function (a, b) { return a.y - b.y || a.x - b.x; };
    var byX = function (a, b) { return a.x - b.x || a.y - b.y; };
    var groups;
    if (layout === 'dual' || layout === 'top-bottom') {
      var s = items.slice().sort(layout === 'dual' ? byX : byY);
      var k = Math.ceil(s.length / 2);
      var first = s.slice(0, k), second = s.slice(k);
      groups = layout === 'dual'
        ? [['left', first.sort(byY)], ['right', second.sort(byY)]]
        : [['top', first.sort(byX)], ['bottom', second.sort(byX)]];
    } else if (layout === 'below') {
      groups = [['below', readingOrder(items)]];
    } else {
      groups = [['right', items.slice().sort(byY)]];
    }
    if (layout !== 'below') groups = groups.map(function (g) { return [g[0], untangle(g[1], g[0])]; });
    var out = { order: [], panel: {}, n: {} };
    groups.forEach(function (g) {
      g[1].forEach(function (it) { out.order.push(it.id); out.panel[it.id] = g[0]; out.n[it.id] = out.order.length; });
    });
    return out;
  }

  // Leader line from a marker (px) to a label row's near edge (px), as an SVG path. A short
  // straight run into the label keeps the end readable.
  function leaderPath(from, to, panel) {
    var r = function (v) { return Math.round(v * 10) / 10; };
    var run = 10, ex = to.x, ey = to.y;
    var bx = panel === 'right' ? ex - run : panel === 'left' ? ex + run : ex;
    var by = panel === 'top' ? ey + run : panel === 'bottom' ? ey - run : ey;
    return 'M' + r(from.x) + ' ' + r(from.y) + 'L' + r(bx) + ' ' + r(by) + 'L' + r(ex) + ' ' + r(ey);
  }

  // ---------- Accessible names and answer-leak checks ----------
  function normText(s) { return ' ' + String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' '; }
  function labelForms(label) {
    var base = normText(label).trim();
    var forms = [base];
    if (/s$/.test(base)) forms.push(base.replace(/s$/, ''));   // "bearings" also matches "bearing"
    else forms.push(base + 's');
    return forms.filter(function (f) { return f.length > 2; });
  }
  // Every (text, label) pair where the text contains the label as whole words (case and
  // punctuation ignored, singular or plural). Used to keep hints, prompts and the figure's
  // accessible name from giving an answer away.
  function findLeaks(texts, labels) {
    var out = [];
    (texts || []).forEach(function (t) {
      var nt = normText(t);
      (labels || []).forEach(function (l) {
        if (labelForms(l).some(function (f) { return nt.indexOf(' ' + f + ' ') >= 0; })) out.push({ text: t, label: l });
      });
    });
    return out;
  }
  // The name a marker or zone carries. In the quiz an unrevealed part is only "Part n" (the
  // engine keeps this rule after mount); explore and revealed parts read their label;
  // calibration adds the coordinates.
  function partName(label, n, mode, revealed, coords, noun) {
    if (mode === 'calibrate') return 'Marker ' + n + ': ' + label + (coords ? ' (' + coords + ')' : '');
    if ((mode === 'quiz' || mode === 'practice') && !revealed) return (noun || 'Part') + ' ' + n;
    return label;
  }
  // "Inlet collar" -> "inlet collar" inside a sentence; names such as "D-Lok ..." or "SWSI ..."
  // keep their capitals.
  function lowerFirst(label) {
    var s = String(label || '');
    return /^[A-Z][a-z]+(?:[\s,/(]|$)/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  }
  // The drawing's accessible name. It stays the same in every mode, so it never names a part.
  function figureName(data, count) {
    var noun = data.engine === 'grid' ? 'numbered drawing' : 'numbered part';
    return (data.alt || data.title || 'Drawing') + '. ' + count + ' ' + noun + (count === 1 ? '' : 's') + '.';
  }

  // ---------- Data ----------
  function items(data) { return data.engine === 'grid' ? (data.zones || []) : (data.parts || []); }
  function itemPos(data, it) {
    if (data.engine === 'grid') { var n = normZone(it); return { id: it.id, x: (n.x1 + n.x2) / 2, y: (n.y1 + n.y2) / 2 }; }
    var p = markerPos(it); return { id: it.id, x: p.x, y: p.y };
  }
  function infoText(it) {
    var t = it.description || it.summary || it.text || '';
    if (it.facts && it.facts.length) t = (t ? t + ' ' : '') + it.facts.join(' ');
    return t;
  }
  // Problems that would break the overlay or give answers away. Returned as strings; mount logs
  // each one with console.warn (nothing is dropped silently, nothing throws for a soft issue).
  function validate(data) {
    var w = [], list = items(data), seen = {};
    if (!data || !data.id) w.push('data.id is missing');
    if (!num(data.width) || !num(data.height)) w.push('data.width and data.height (image pixels) are required');
    if (!data.image) w.push('data.image is missing');
    if (!list.length) w.push(data.engine === 'grid' ? 'no zones' : 'no parts');
    var labels = list.map(function (it) { return it.label; });
    list.forEach(function (it, i) {
      var where = (data.engine === 'grid' ? 'zone ' : 'part ') + (it.id || i);
      if (!it.id || !it.label) w.push(where + ': needs id and label');
      if (seen[it.id]) w.push(where + ': duplicate id');
      seen[it.id] = true;
      var coords = data.engine === 'grid' ? ['x1', 'y1', 'x2', 'y2'] : ['x', 'y'];
      if (data.engine !== 'grid' && (it.mx != null || it.my != null)) coords = coords.concat(['mx', 'my']);
      coords.forEach(function (k) { if (!num(it[k]) || it[k] < 0 || it[k] > 100) w.push(where + ': ' + k + ' must be 0..100'); });
      if (data.engine === 'grid' && num(it.x1) && zoneArea(it) < 1) w.push(where + ': zone is smaller than 1 % of the image');
      findLeaks([it.prompt || it.quiz_question || ''], [it.label]).forEach(function () { w.push(where + ': the quiz prompt names the answer'); });
      findLeaks([it.hint || ''], [it.label]).forEach(function () { w.push(where + ': the hint names the answer'); });
      if (!it.hint) w.push(where + ': no hint (the first wrong answer gets no clue)');
    });
    findLeaks([data.alt || ''], labels).forEach(function (l) { w.push('alt text names the part "' + l.label + '"; it is read in quiz mode too'); });
    return w;
  }
  // FP.CalloutQuiz tables in marker-number order, so the engine's "Part k" is marker k.
  function quizTables(data, order) {
    var byId = {};
    items(data).forEach(function (it) { byId[it.id] = it; });
    var parts = order.map(function (id) { var it = byId[id]; return { id: id, label: it.label, text: infoText(it) }; });
    var prompts = order.map(function (id) {
      var it = byId[id];
      var q = { id: id, prompt: it.prompt || it.quiz_question || ('Select the ' + it.label + '.'), answer: id,
        why: it.why || it.description || it.summary || '' };
      if (it.hint) q.hint = it.hint;
      if (it.wrong) q.wrong = it.wrong;
      return q;
    });
    return { parts: parts, prompts: prompts };
  }
  // Deterministic quiz seed from the sim id (FNV-1a), so every learner gets the same order.
  function seedFor(id) {
    var h = 0x811c9dc5, s = String(id || '');
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  // The coordinates an author pastes back into the sim's data (one item per line).
  function calibrationJSON(data) {
    var rows = items(data).map(function (it) {
      var o = { id: it.id };
      if (data.engine === 'grid') { var n = normZone(it); o.x1 = n.x1; o.y1 = n.y1; o.x2 = n.x2; o.y2 = n.y2; }
      else { o.x = it.x; o.y = it.y; if (hasOffset(it)) { o.mx = it.mx; o.my = it.my; } }
      return '  ' + JSON.stringify(o);
    });
    return '[\n' + rows.join(',\n') + '\n]';
  }

  // ---------- DOM layer ----------
  var SVGNS = 'http://www.w3.org/2000/svg';
  var STYLE_ID = 'fp-overlay-style';
  var TOK = {
    '--fp-primary': '#3f51b5', '--fp-primary-dark': '#303f9f', '--fp-primary-bg': '#e8eaf6',
    '--fp-accent': '#f57c00', '--fp-accent-text': '#a84300', '--fp-correct': '#2e7d32',
    '--fp-incorrect': '#c62828', '--fp-text': '#263238', '--fp-text-muted': '#546e7a',
    '--fp-border': '#c0c0c0', '--fp-draw-bg': '#f0f8ff'
  };
  function v(n) { return 'var(' + n + ',' + TOK[n] + ')'; }
  function css() {
    return [
      '.fpo{position:relative;}',
      '.fpo-fig{display:flex;flex-direction:column;gap:6px;}',
      '.fpo-row{display:flex;align-items:stretch;gap:12px;}',
      '.fpo-drawing{flex:1 1 auto;min-width:0;}',
      '.fpo-svg{display:block;width:100%;height:auto;background:#fff;border:1px solid ' + v('--fp-border') + ';border-radius:6px;touch-action:manipulation;user-select:none;-webkit-user-select:none;}',
      '.fpo-credit{margin:3px 0 0;font-size:13px;color:' + v('--fp-text-muted') + ';}',
      '.fpo-key{list-style:none;margin:0;padding:0;font-size:14px;line-height:1.25;color:' + v('--fp-text') + ';}',
      '.fpo-key li{display:flex;align-items:flex-start;gap:6px;padding:3px 4px;border-radius:6px;border:1px solid transparent;cursor:pointer;}',
      '.fpo-key .fpo-num{flex:0 0 auto;min-width:22px;height:22px;box-sizing:border-box;border-radius:11px;background:' + v('--fp-primary') + ';color:#fff;font-weight:bold;font-size:13px;line-height:22px;text-align:center;}',
      '.fpo-key .fpo-lbl{padding-top:2px;}',
      '.fpo-key li.fpo-hot,.fpo-key li:has(.fp-cq-label-selected){background:' + v('--fp-primary-bg') + ';border-color:' + v('--fp-primary') + ';}',
      '.fpo-key li:has(.fp-cq-label-selected) .fpo-lbl{font-weight:bold;}',
      '.fpo-key .fp-cq-label-visited::after{content:" \\2713";color:' + v('--fp-text-muted') + ';}',
      '.fpo-panel-right,.fpo-panel-left{flex:0 0 auto;width:clamp(140px,26%,230px);display:flex;flex-direction:column;justify-content:space-around;gap:2px;padding:2px 0;}',
      '.fpo-layout-dual .fpo-panel-right,.fpo-layout-dual .fpo-panel-left{width:clamp(130px,21%,200px);}',
      '.fpo-panel-left li{flex-direction:row-reverse;text-align:right;}',
      '.fpo-panel-top,.fpo-panel-bottom{display:flex;flex-wrap:wrap;justify-content:space-around;gap:4px 10px;}',
      '.fpo-panel-top li,.fpo-panel-bottom li{max-width:200px;}',
      '.fpo-panel-below{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:2px 10px;}',
      '.fpo-leaders{position:absolute;left:0;top:0;pointer-events:none;overflow:visible;}',
      '.fpo-leader{fill:none;stroke:' + v('--fp-text-muted') + ';stroke-width:1;opacity:.55;}',
      '.fpo-leader.fp-cq-label-selected,.fpo-leader.fpo-hot{stroke:' + v('--fp-primary') + ';stroke-width:2;opacity:1;}',
      '.fpo-narrow .fpo-leaders{display:none;}',
      // Markers (callout engine): constant pixel size via scale(k), set by the script.
      '.fpo-part{cursor:pointer;outline:none;}',
      '.fpo-dot{fill:' + v('--fp-primary') + ';stroke:#fff;stroke-width:2;}',
      '.fpo-hit{fill:transparent;}',
      '.fpo-ring{fill:none;stroke:none;stroke-width:3;}',
      '.fpo-n{fill:#fff;font:bold 13px Arial,Helvetica,sans-serif;text-anchor:middle;dominant-baseline:central;pointer-events:none;}',
      '.fpo-anchor{fill:' + v('--fp-primary') + ';stroke:#fff;stroke-width:1.5;}',
      '.fpo-pointer{stroke:' + v('--fp-primary') + ';stroke-width:2;vector-effect:non-scaling-stroke;}',
      '.fpo-part:hover .fpo-dot,.fpo-part.fpo-hot .fpo-dot{fill:' + v('--fp-primary-dark') + ';}',
      '.fpo-part:focus-visible .fpo-ring,.fpo-part.fp-cq-selected .fpo-ring{stroke:' + v('--fp-primary-dark') + ';}',
      '.fpo-part.fp-cq-selected .fpo-dot{fill:' + v('--fp-primary-dark') + ';}',
      '.fpo-part.fp-cq-correct .fpo-dot,.fpo-part.fp-cq-correct .fpo-anchor{fill:' + v('--fp-correct') + ';}',
      '.fpo-part.fp-cq-wrong .fpo-dot,.fpo-part.fp-cq-wrong .fpo-anchor{fill:' + v('--fp-incorrect') + ';}',
      '.fpo-part.fp-cq-wrong .fpo-ring{stroke:' + v('--fp-incorrect') + ';stroke-dasharray:3 2;}',
      '.fpo-part.fp-cq-answer .fpo-dot,.fpo-part.fp-cq-answer .fpo-anchor{fill:' + v('--fp-accent-text') + ';}',
      '.fpo-part.fp-cq-answer .fpo-ring{stroke:' + v('--fp-accent') + ';}',
      // Zones (grid engine)
      '.fpo-zone{fill:rgba(63,81,181,.03);stroke:' + v('--fp-primary') + ';stroke-width:1.5;stroke-dasharray:6 4;vector-effect:non-scaling-stroke;}',
      '.fpo-part:hover .fpo-zone,.fpo-part.fpo-hot .fpo-zone,.fpo-part.fp-cq-selected .fpo-zone{fill:rgba(63,81,181,.12);stroke-dasharray:none;stroke-width:2.5;}',
      '.fpo-part:focus-visible .fpo-zone{stroke:' + v('--fp-primary-dark') + ';stroke-dasharray:none;stroke-width:3.5;}',
      '.fpo-part.fp-cq-correct .fpo-zone{stroke:' + v('--fp-correct') + ';stroke-dasharray:none;stroke-width:3;fill:rgba(46,125,50,.10);}',
      '.fpo-part.fp-cq-wrong .fpo-zone{stroke:' + v('--fp-incorrect') + ';stroke-dasharray:6 3;stroke-width:3;fill:rgba(198,40,40,.08);}',
      '.fpo-part.fp-cq-answer .fpo-zone{stroke:' + v('--fp-accent') + ';stroke-dasharray:none;stroke-width:3.5;fill:rgba(245,124,0,.10);}',
      '.fpo-chip{fill:' + v('--fp-primary') + ';stroke:#fff;stroke-width:1.5;}',
      '.fpo-part.fp-cq-correct .fpo-chip{fill:' + v('--fp-correct') + ';}',
      '.fpo-part.fp-cq-wrong .fpo-chip{fill:' + v('--fp-incorrect') + ';}',
      '.fpo-part.fp-cq-answer .fpo-chip{fill:' + v('--fp-accent-text') + ';}',
      '.fpo-info{min-height:7.5em;}',
      '.fpo-info .fpo-preview{margin:0;font-size:13px;color:' + v('--fp-text-muted') + ';}',
      // Calibration (authors only)
      '.fpo-grid line{stroke:#000;stroke-opacity:.22;stroke-width:1;vector-effect:non-scaling-stroke;}',
      '.fpo-grid text{fill:' + v('--fp-text') + ';font:12px Arial,Helvetica,sans-serif;}',
      '.fpo-handle{fill:#fff;stroke:' + v('--fp-incorrect') + ';stroke-width:2;cursor:move;}',
      '.fpo-cal .fpo-part,.fpo-cal .fpo-anchor{cursor:move;}',
      '.fpo-calpanel{margin-top:8px;padding:8px 10px;border:2px dashed ' + v('--fp-accent') + ';border-radius:8px;font-size:14px;}',
      '.fpo-calpanel h2{font-size:16px;margin:0 0 4px;}',
      '.fpo-calpanel textarea{width:100%;min-height:12em;font:13px monospace;box-sizing:border-box;}',
      '.fpo-calpanel p{margin:4px 0;}'
    ].join('\n');
  }
  function injectStyle(doc) {
    if (doc.getElementById(STYLE_ID)) return;
    var s = doc.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css();
    // Prepend so fanpedia-sim.css and the sim's own styles win the cascade on equal specificity.
    doc.head.insertBefore(s, doc.head.firstChild);
  }
  function h(doc, tag, attrs, kids) {
    var e = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k]; else if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  }
  function s(doc, tag, attrs) {
    var e = doc.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    return e;
  }
  function announce(text) { if (typeof FP.announce === 'function') FP.announce(text); }

  function mount(opts) {
    var doc = opts.document || G.document;
    var root = typeof opts.root === 'string' ? doc.querySelector(opts.root) : opts.root;
    if (!root) throw new Error('FP.Overlay.mount: root element not found');
    var data = opts.data;
    validate(data).forEach(function (w) { console.warn('FP.Overlay (' + (data && data.id) + '): ' + w); });
    var grid = data.engine === 'grid';
    var W = data.width, H = data.height;
    var calibrate = opts.calibrate != null ? !!opts.calibrate
      : /(?:^|[?&])calibrate=1(?:&|$)/.test((G.location && G.location.search) || '');
    var wide = grid ? 'below' : normLayout(data.layout);
    var narrowBelow = data.narrowBelow || { side: 600, dual: 820, 'top-bottom': 520, below: 0 }[wide];
    var list = items(data);
    var byId = {};
    list.forEach(function (it) { byId[it.id] = it; });
    var lay = layoutLabels(list.map(function (it) { return itemPos(data, it); }), wide);
    var current = null; // the layout in use: wide or 'below'
    injectStyle(doc);

    // --- skeleton ---
    root.classList.add('fpo', grid ? 'fpo-grid-engine' : 'fpo-callout-engine', 'fpo-layout-' + wide);
    if (calibrate) root.classList.add('fpo-cal');
    var fig = h(doc, 'div', { class: 'fpo-fig' });
    var row = h(doc, 'div', { class: 'fpo-row' });
    var drawing = h(doc, 'div', { class: 'fpo-drawing' });
    var panels = {};
    ['top', 'left', 'right', 'bottom', 'below'].forEach(function (p) {
      panels[p] = h(doc, 'ol', { class: 'fpo-key fpo-panel-' + p, 'aria-label': 'Part names' });
    });
    fig.appendChild(panels.top);
    row.appendChild(panels.left); row.appendChild(drawing); row.appendChild(panels.right);
    fig.appendChild(row);
    fig.appendChild(panels.bottom); fig.appendChild(panels.below);
    root.appendChild(fig);

    var svg = s(doc, 'svg', { class: 'fpo-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'group',
      'aria-label': figureName(data, list.length), preserveAspectRatio: 'xMidYMid meet' });
    var img = s(doc, 'image', { href: data.image, x: 0, y: 0, width: W, height: H, 'aria-hidden': 'true' });
    svg.appendChild(img);
    drawing.appendChild(svg);
    if (data.credit) drawing.appendChild(h(doc, 'p', { class: 'fp-note fpo-credit', text: data.credit }));
    var leaders = s(doc, 'svg', { class: 'fpo-leaders', 'aria-hidden': 'true', focusable: 'false' });
    root.appendChild(leaders);

    // --- parts: markers or zones, in marker-number order in the DOM (= Tab order) ---
    var els = {}; // id -> {g, mk, dot, anchor, pointer, rect, chip, corners, row, lbl, leader}
    var gridLayer = calibrate ? s(doc, 'g', { class: 'fpo-grid', 'aria-hidden': 'true' }) : null;
    if (gridLayer) svg.appendChild(gridLayer);
    var drawOrder = grid ? paintOrder(list).map(function (z) { return z.id; }) : lay.order;
    drawOrder.forEach(function (id) {
      var it = byId[id], n = lay.n[id], e = {};
      e.g = s(doc, 'g', { class: 'fpo-part', 'data-part': id, 'aria-label': partName(it.label, n, calibrate ? 'calibrate' : 'explore', true) });
      if (grid) {
        e.rect = s(doc, 'rect', { class: 'fpo-zone' });
        e.chip = s(doc, 'g', { class: 'fpo-mk' });
        e.chip.appendChild(s(doc, 'rect', { class: 'fpo-chip', x: 0, y: 0, width: 24, height: 22, rx: 6 }));
        e.chip.appendChild(s(doc, 'text', { class: 'fpo-n', x: 12, y: 11.5, text: String(n) }));
        e.g.appendChild(e.rect); e.g.appendChild(e.chip);
        if (calibrate) {
          e.corners = {};
          ['tl', 'tr', 'bl', 'br'].forEach(function (c) {
            var hd = s(doc, 'g', { class: 'fpo-mk', 'data-corner': c });
            hd.appendChild(s(doc, 'rect', { class: 'fpo-handle', x: -6, y: -6, width: 12, height: 12 }));
            e.corners[c] = hd; e.g.appendChild(hd);
          });
        }
      } else {
        e.pointer = s(doc, 'line', { class: 'fpo-pointer' });
        e.anchor = s(doc, 'g', { class: 'fpo-mk fpo-anchor-g' });
        e.anchor.appendChild(s(doc, 'circle', { class: 'fpo-anchor', r: 4 }));
        e.mk = s(doc, 'g', { class: 'fpo-mk' });
        e.mk.appendChild(s(doc, 'circle', { class: 'fpo-hit', r: 14 }));
        e.mk.appendChild(s(doc, 'circle', { class: 'fpo-ring', r: 14 }));
        e.dot = s(doc, 'circle', { class: 'fpo-dot', r: 11 });
        e.mk.appendChild(e.dot);
        e.mk.appendChild(s(doc, 'text', { class: 'fpo-n', x: 0, y: 0.5, text: String(n) }));
        e.g.appendChild(e.pointer); e.g.appendChild(e.anchor); e.g.appendChild(e.mk);
      }
      svg.appendChild(e.g);
      els[id] = e;
    });
    lay.order.forEach(function (id) {
      var e = els[id], it = byId[id];
      e.lbl = h(doc, 'span', { class: 'fpo-lbl', 'data-label-for': id, text: it.label });
      e.row = h(doc, 'li', {}, [h(doc, 'span', { class: 'fpo-num', 'aria-hidden': 'true', text: String(lay.n[id]) }), e.lbl]);
      if (!grid) {
        e.leader = s(doc, 'path', { class: 'fpo-leader', 'data-label-for': id });
        leaders.appendChild(e.leader);
      }
    });

    // --- geometry ---
    var k = 1;
    function place() {
      var kk = k = viewPerPx(W, svg.getBoundingClientRect().width);
      list.forEach(function (it) {
        var e = els[it.id];
        if (grid) {
          var z = normZone(it), x = pctToView(z.x1, W), y = pctToView(z.y1, H);
          e.rect.setAttribute('x', x); e.rect.setAttribute('y', y);
          e.rect.setAttribute('width', pctToView(z.x2 - z.x1, W)); e.rect.setAttribute('height', pctToView(z.y2 - z.y1, H));
          e.chip.setAttribute('transform', 'translate(' + (x + 5 * kk) + ' ' + (y + 5 * kk) + ') scale(' + kk + ')');
          if (e.corners) Object.keys(e.corners).forEach(function (c) {
            var cx = pctToView(c.charAt(1) === 'l' ? z.x1 : z.x2, W), cy = pctToView(c.charAt(0) === 't' ? z.y1 : z.y2, H);
            e.corners[c].setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + kk + ')');
          });
        } else {
          var m = markerPos(it), off = hasOffset(it) || calibrate;
          var ax = pctToView(it.x, W), ay = pctToView(it.y, H), mx = pctToView(m.x, W), my = pctToView(m.y, H);
          e.mk.setAttribute('transform', 'translate(' + mx + ' ' + my + ') scale(' + k + ')');
          e.anchor.setAttribute('transform', 'translate(' + ax + ' ' + ay + ') scale(' + k + ')');
          e.anchor.style.display = off ? '' : 'none';
          e.pointer.style.display = hasOffset(it) ? '' : 'none';
          e.pointer.setAttribute('x1', mx); e.pointer.setAttribute('y1', my);
          e.pointer.setAttribute('x2', ax); e.pointer.setAttribute('y2', ay);
        }
      });
      if (gridLayer) drawGrid(kk);
    }
    function drawGrid(kk) {
      gridLayer.textContent = '';
      for (var p = 10; p < 100; p += 10) {
        gridLayer.appendChild(s(doc, 'line', { x1: pctToView(p, W), y1: 0, x2: pctToView(p, W), y2: H }));
        gridLayer.appendChild(s(doc, 'line', { x1: 0, y1: pctToView(p, H), x2: W, y2: pctToView(p, H) }));
        gridLayer.appendChild(s(doc, 'text', { x: pctToView(p, W) + 2 * kk, y: 12 * kk, 'font-size': 12 * kk, text: String(p) }));
        gridLayer.appendChild(s(doc, 'text', { x: 2 * kk, y: pctToView(p, H) - 2 * kk, 'font-size': 12 * kk, text: String(p) }));
      }
    }
    function setLayout(name) {
      if (name === current) return false;
      current = name;
      root.classList.toggle('fpo-narrow', name === 'below' && wide !== 'below');
      lay.order.forEach(function (id) {
        (name === 'below' ? panels.below : panels[lay.panel[id]]).appendChild(els[id].row);
      });
      Object.keys(panels).forEach(function (p) { panels[p].hidden = !panels[p].children.length; });
      return true;
    }
    function drawLeaders() {
      if (grid || current === 'below') return;
      var rr = root.getBoundingClientRect();
      leaders.setAttribute('width', rr.width); leaders.setAttribute('height', rr.height);
      lay.order.forEach(function (id) {
        var e = els[id], panel = lay.panel[id];
        var d = e.dot.getBoundingClientRect(), nb = e.row.querySelector('.fpo-num').getBoundingClientRect();
        if (!d.width || !nb.width) { e.leader.setAttribute('d', ''); return; }
        var c = { x: d.left + d.width / 2 - rr.left, y: d.top + d.height / 2 - rr.top };
        var to = panel === 'right' ? { x: nb.left - 3 - rr.left, y: nb.top + nb.height / 2 - rr.top }
          : panel === 'left' ? { x: nb.right + 3 - rr.left, y: nb.top + nb.height / 2 - rr.top }
          : panel === 'top' ? { x: nb.left + nb.width / 2 - rr.left, y: nb.bottom + 3 - rr.top }
          : { x: nb.left + nb.width / 2 - rr.left, y: nb.top - 3 - rr.top };
        var dx = to.x - c.x, dy = to.y - c.y, len = Math.sqrt(dx * dx + dy * dy) || 1, r = d.width / 2 + 1;
        e.leader.setAttribute('d', leaderPath({ x: c.x + dx / len * r, y: c.y + dy / len * r }, to, panel));
      });
    }
    var raf = 0;
    function update() {
      if (raf) return;
      var go = function () {
        raf = 0;
        var w = root.getBoundingClientRect().width;
        var changed = setLayout(w && w < narrowBelow ? 'below' : wide);
        place();
        drawLeaders();
        // The engine re-places its badges on window resize; a layout switch moves the parts too.
        if (changed && quiz) quiz.render();
      };
      raf = G.requestAnimationFrame ? G.requestAnimationFrame(go) : (setTimeout(go, 16), 1);
    }
    setLayout(wide);
    place();

    // --- hover / focus highlight and the explore preview ---
    var quiz = null;
    function hot(id, on) {
      var e = els[id];
      e.g.classList.toggle('fpo-hot', on); e.row.classList.toggle('fpo-hot', on);
      if (e.leader) e.leader.classList.toggle('fpo-hot', on);
    }
    function preview(id, on) {
      hot(id, on);
      if (!quiz || quiz.state.mode !== 'explore') return;
      if (!on) { quiz.render(); return; }
      var it = byId[id], box = quiz.ui.info;
      box.textContent = '';
      box.appendChild(h(doc, 'h3', { text: it.label }));
      var t = infoText(it);
      if (t) box.appendChild(h(doc, 'p', { text: t }));
      if (!quiz.state.visited[id]) box.appendChild(h(doc, 'p', { class: 'fpo-preview', text: 'Select it to mark it visited.' }));
    }
    list.forEach(function (it) {
      var e = els[it.id];
      e.g.addEventListener('mouseenter', function () { preview(it.id, true); });
      e.g.addEventListener('mouseleave', function () { preview(it.id, false); });
      e.g.addEventListener('focus', function () { preview(it.id, true); });
      e.g.addEventListener('blur', function () { preview(it.id, false); });
      e.row.addEventListener('mouseenter', function () { preview(it.id, true); });
      e.row.addEventListener('mouseleave', function () { preview(it.id, false); });
      e.row.addEventListener('click', function () {
        if (quiz && (quiz.state.mode === 'explore' || quiz.state.mode === 'summary')) quiz.choose(it.id);
      });
    });

    // --- explore and quiz: FP.CalloutQuiz ---
    var info = h(doc, 'div', { class: 'fp-cq-ui fp-panel fp-cq-info fpo-info' });
    root.parentNode.insertBefore(info, root.nextSibling);
    if (!calibrate) {
      if (!FP.CalloutQuiz) throw new Error('FP.Overlay: load callout-quiz.js before fp-overlay.js runs mount()');
      var t = quizTables(data, lay.order), CQM = FP.CalloutQuiz.messages, noun = grid ? 'Drawing' : 'Part';
      var lower = function (c) { return Object.assign({}, c, { clickedLabel: lowerFirst(c.clickedLabel) }); };
      var gridWrong = function (fn, c) {
        var text = fn(Object.assign({}, c, { clickedLabel: null }));
        return c.clickedLabel ? text.replace('✗ Not quite.', '✗ Not quite. That drawing is labeled: ' + c.clickedLabel + '.') : text;
      };
      var msg = {
        quizAria: function (n) { return partName('', n, 'quiz', false, null, noun); },
        // Grid labels are phrases ("Directly under the fan"), which read badly
        // after the engine's "That is the ..."; name the drawing's label instead.
        retry: function (c) { return grid ? gridWrong(CQM.retry, c) : CQM.retry(lower(c)); },
        missed: function (c) { return grid ? gridWrong(CQM.missed, c) : CQM.missed(lower(c)); },
        reviewPointer: grid ? 'Review the drawings below in Explore mode, then start over.' : CQM.reviewPointer,
        quizIntro: grid
          ? function (c) { return 'Labels are hidden. Select the numbered drawing that matches each prompt. You have ' + c.attempts + (c.attempts === 1 ? ' attempt' : ' attempts') + ' per prompt.'; }
          : function (c) { return 'Labels are hidden. Select the numbered marker on the part that matches each prompt. You have ' + c.attempts + (c.attempts === 1 ? ' attempt' : ' attempts') + ' per prompt.'; }
      };
      quiz = FP.CalloutQuiz.mount(Object.assign({
        root: root, id: data.id, parts: t.parts, prompts: t.prompts, infoEl: info,
        attempts: data.attempts || 2, mastery: data.mastery, order: 'shuffle',
        seed: data.seed != null ? data.seed : seedFor(data.id), retryMissed: true,
        scoreNoun: data.scoreNoun || (grid ? 'Drawings' : 'Parts'), tabOrder: lay.order,
        msg: Object.assign(msg, opts.msg || {}),
        exploreEmpty: data.exploreEmpty || (grid
          ? 'No drawing selected. Point at or select a numbered drawing to see what it shows.'
          : 'No part selected. Point at or select a numbered marker to see the part.'),
        explorePrompt: data.explorePrompt || (grid
          ? 'Point at or select a numbered drawing to see what it shows. When you are ready, choose Quiz.'
          : 'Point at or select a numbered marker to see the part. When you are ready, choose Quiz.')
      }, opts.calloutQuiz || {}));
    } else {
      info.hidden = true;
      calibration();
    }

    // --- calibration (authors only) ---
    function calibration() {
      var panel = h(doc, 'section', { class: 'fpo-calpanel', 'aria-label': 'Calibration' });
      var read = h(doc, 'p', { 'aria-live': 'polite', text: 'Drag a marker, its anchor dot or a zone corner. Click the drawing to read a position.' });
      var ta = h(doc, 'textarea', { readonly: 'readonly', spellcheck: 'false', 'aria-label': 'Calibrated coordinates (JSON)' });
      var status = h(doc, 'span', { 'aria-live': 'polite' });
      var copy = h(doc, 'button', { type: 'button', class: 'fp-btn', text: 'Copy JSON' });
      panel.appendChild(h(doc, 'h2', { text: 'Calibration mode (authors only, not shown to learners)' }));
      panel.appendChild(h(doc, 'p', { text: 'Coordinates are % of the image (0,0 = top left). ' + (grid
        ? 'Drag the square corner handles of a zone.'
        : 'Drag the numbered marker to move the label badge (it gets a pointer to the anchor); drag the small anchor dot to the exact part. Drop the marker on its anchor to remove the offset.') }));
      panel.appendChild(read);
      panel.appendChild(ta);
      panel.appendChild(h(doc, 'p', {}, [copy, ' ', status]));
      info.parentNode.insertBefore(panel, info.nextSibling);
      var refresh = function () { ta.value = calibrationJSON(data); };
      refresh();
      copy.addEventListener('click', function () {
        var done = function () { status.textContent = 'Copied.'; announce('Copied.'); };
        ta.select();
        if (G.navigator && G.navigator.clipboard && G.navigator.clipboard.writeText) {
          G.navigator.clipboard.writeText(ta.value).then(done, function () { if (doc.execCommand('copy')) done(); });
        } else if (doc.execCommand('copy')) done();
      });
      var drag = null;
      var pct = function (ev) { return clientToPct(ev.clientX, ev.clientY, svg.getBoundingClientRect()); };
      svg.addEventListener('pointerdown', function (ev) {
        var t = ev.target, g = t.closest ? t.closest('[data-part]') : null;
        var p = pct(ev);
        if (!g) { read.textContent = 'x ' + p.x + ', y ' + p.y + (grid ? (function () { var z = hitZone(list, p.x, p.y); return z ? ' (inside ' + z.label + ')' : ' (no zone)'; })() : ''); return; }
        var id = g.getAttribute('data-part'), it = byId[id];
        var corner = t.closest('[data-corner]');
        if (grid && !corner) return;
        drag = { id: id, corner: corner && corner.getAttribute('data-corner'), anchor: !grid && !!t.closest('.fpo-anchor-g') };
        if (!grid && !drag.anchor && !hasOffset(it)) { it.mx = it.x; it.my = it.y; }
        svg.setPointerCapture(ev.pointerId);
        ev.preventDefault();
      });
      svg.addEventListener('pointermove', function (ev) {
        if (!drag) return;
        var it = byId[drag.id], p = pct(ev), txt;
        if (grid) {
          var z = moveCorner(it, drag.corner, p.x, p.y);
          it.x1 = z.x1; it.y1 = z.y1; it.x2 = z.x2; it.y2 = z.y2;
          txt = it.label + ': x1 ' + z.x1 + ', y1 ' + z.y1 + ', x2 ' + z.x2 + ', y2 ' + z.y2;
        } else if (drag.anchor) { it.x = p.x; it.y = p.y; txt = it.label + ' anchor: x ' + p.x + ', y ' + p.y; }
        else { it.mx = p.x; it.my = p.y; txt = it.label + ' marker: mx ' + p.x + ', my ' + p.y; }
        read.textContent = txt;
        place(); drawLeaders();
      });
      var end = function () {
        if (!drag) return;
        var it = byId[drag.id];
        if (!grid && Math.abs(it.mx - it.x) < 1.5 && Math.abs(it.my - it.y) < 1.5) { delete it.mx; delete it.my; }
        if (!grid) els[it.id].g.setAttribute('aria-label', partName(it.label, lay.n[it.id], 'calibrate', true, 'x ' + it.x + ', y ' + it.y));
        drag = null; place(); drawLeaders(); refresh();
      };
      svg.addEventListener('pointerup', end);
      svg.addEventListener('pointercancel', end);
    }

    // --- keep geometry in step with the width ---
    if (G.ResizeObserver) new G.ResizeObserver(update).observe(root);
    else if (G.addEventListener) G.addEventListener('resize', update);
    img.addEventListener('load', update);
    update();

    return { root: root, data: data, quiz: quiz, calibrate: calibrate, layout: function () { return current; },
      labelLayout: lay, update: update, version: VERSION };
  }

  var Overlay = {
    version: VERSION,
    mount: mount,
    clientToPct: clientToPct, pctToView: pctToView, viewToPct: viewToPct, viewPerPx: viewPerPx,
    hasOffset: hasOffset, markerPos: markerPos,
    normZone: normZone, zoneArea: zoneArea, inZone: inZone, hitZone: hitZone, paintOrder: paintOrder, moveCorner: moveCorner,
    normLayout: normLayout, readingOrder: readingOrder, layoutLabels: layoutLabels, leaderPath: leaderPath,
    segmentsCross: segmentsCross, leaderCost: leaderCost,
    findLeaks: findLeaks, partName: partName, lowerFirst: lowerFirst, figureName: figureName,
    validate: validate, quizTables: quizTables, infoText: infoText, seedFor: seedFor, calibrationJSON: calibrationJSON,
    css: css
  };
  FP.Overlay = Overlay;
  if (typeof module !== 'undefined' && module.exports) module.exports = Overlay;
})(typeof window !== 'undefined' ? window : globalThis);
