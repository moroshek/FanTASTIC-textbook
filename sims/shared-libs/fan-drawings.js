/* FanPedia MicroSim kit: fan-drawings.js (FD)  v1.0.0
 *
 * Shared p5.js drawings of fans, parts, ducts and arrows, so a motor or a
 * scroll housing looks the same in every chapter.
 *
 * CALLING CONVENTION (every drawing function):
 *     FD.someDrawing(p, options)
 *   p        the p5 instance in instance mode, or null / window in global mode
 *            (global-mode sims write FD.motor(null, {...})).
 *   options  a plain object; every key is optional unless the doc says so.
 * Every function wraps its work in p.push() / p.pop(), so it never changes the
 * sim's fill, stroke, text settings, line dash or shadow. Functions only DRAW:
 * they never create controls, never define setup/draw/keyPressed, and never
 * read the mouse.
 *
 * COORDINATES. Drive-side and stand-alone drawings take screen coordinates
 * (x, y, size). Side-view PARTS take LOCAL units plus a frame (FD.frame or
 * FD.frameAt) that maps local units to the screen; local y grows downward with
 * the shaft centerline at FD.SIDE.shaftY (110) and the floor at FD.SIDE.floorY
 * (230), as in the ch11 arrangement schematics.
 *
 * COMMON OPTIONS. highlight (true: accent glow plus a heavier outline, so
 * colour is never the only cue), label / labels (text on or off), rotation
 * ('CW' | 'CCW', always as seen from the DRIVE SIDE), angle (discharge angle in
 * degrees, 45..360, counted from upblast in the direction of rotation), t
 * (seconds, for animated air or rotation; omit for a still drawing).
 *
 * COLOURS come from the part palette (review §4.1), read through FP.tok when
 * the core is loaded and falling back to the hex values below otherwise.
 *
 * Sources: side-view parts from ch11-arrangement-identifier.js L384-707,
 * drive-side scroll / rotation / outlet arrows from
 * ch13-rotation-discharge-code-builder.js L385-521 (same drive-side rule),
 * duct cross-section from ch01-duct-airflow-velocity-calculator.js L570-627.
 * Axial fan, duct run, sheave pair, spring, inlet box and motor-position
 * drawings are new. All drawings are schematics, not to scale.
 *
 * Plain browser script; also loads under Node `require` (the pure FD.geom
 * helpers are unit tested). Never defines bare globals; loading twice keeps
 * the first copy. Also reachable as FP.drawings.
 */
(function (root) {
  'use strict';
  var FP = root.FP = root.FP || {};
  var FD = root.FD = root.FD || {};
  if (FD.__version) {
    if (typeof module === 'object' && module.exports) module.exports = FD;
    return;
  }

  var TWO_PI = Math.PI * 2;
  var HALF_PI = Math.PI / 2;

  // ------------------------------------------------------------------ palette
  var FALLBACK = {
    metal: '#d3dbe2', metalSide: '#b4c0cb', metalDark: '#8e9daa', edge: '#4f5e6b',
    motor: '#3a86c8', motorSide: '#2a679d', motorEdge: '#183a57',
    bearing: '#2a8c9a', bearingEdge: '#163f45', belt: '#2b2b2b',
    sheave: '#6d7c89', sheaveEdge: '#2f3a44', shaft: '#9aa6b1', hub: '#3b4651',
    steel: '#9fb0bf', steelSide: '#7f93a5', coupling: '#8d6e63', floor: '#546e7a',
    air: '#0277bd', accent: '#f57c00', accentText: '#a84300', primary: '#3f51b5',
    text: '#263238', muted: '#546e7a', incorrect: '#c62828', correct: '#2e7d32',
    drawBg: '#f0f8ff', white: '#ffffff', border: '#c0c0c0'
  };
  // Token names read through FP.tok (fanpedia-core.js) and defined in fanpedia-sim.css.
  // Shades without a token (motorSide, sheave, hub, ...) are derived ch03 part colours.
  var TOKENS = {
    metal: '--fp-metal', metalSide: '--fp-metal-side', edge: '--fp-edge',
    motor: '--fp-motor', bearing: '--fp-bearing', belt: '--fp-belt',
    air: '--fp-air', accent: '--fp-accent', accentText: '--fp-accent-text', primary: '--fp-primary',
    text: '--fp-text', muted: '--fp-text-muted', incorrect: '--fp-incorrect', correct: '--fp-correct',
    drawBg: '--fp-draw-bg', border: '--fp-border'
  };
  var cache = null;
  /** The resolved palette {metal, edge, motor, bearing, belt, air, accent, ...}. Cached; see refreshPalette. */
  function palette() {
    if (cache) return cache;
    var c = {};
    Object.keys(FALLBACK).forEach(function (k) {
      var v = null;
      if (TOKENS[k] && FP && typeof FP.tok === 'function') {
        try { v = FP.tok(TOKENS[k], FALLBACK[k]); } catch (e) { v = null; }
      }
      c[k] = (typeof v === 'string' && v.trim()) ? v.trim() : FALLBACK[k];
    });
    cache = c;
    return c;
  }
  /** Forget the cached palette (call after changing CSS tokens). */
  function refreshPalette() { cache = null; return palette(); }

  // ------------------------------------------------------------------ helpers
  function P(p) { return p || root; }
  function opt(o, k, d) { return (o && o[k] !== undefined && o[k] !== null) ? o[k] : d; }
  function dash(p, arr) { if (p.drawingContext && p.drawingContext.setLineDash) p.drawingContext.setLineDash(arr || []); }
  function glow(p, on) {
    if (!on || !p.drawingContext) return;
    p.drawingContext.shadowColor = palette().accent;
    p.drawingContext.shadowBlur = 12;
  }
  function noGlow(p) { if (p.drawingContext) { p.drawingContext.shadowBlur = 0; p.drawingContext.shadowColor = 'rgba(0,0,0,0)'; } }

  /** Frame fitting local units [0..localW] x [localTop..localBottom] centred in box {x, y, w, h}. */
  function frame(box, localW, localTop, localBottom) {
    var sc = Math.min(box.w / localW, box.h / (localBottom - localTop));
    var ox = box.x + (box.w - localW * sc) / 2;
    var oy = box.y - localTop * sc + (box.h - (localBottom - localTop) * sc) / 2;
    return frameAt(ox, oy, sc);
  }
  /** Frame with local (0,0) at screen (x, y) and `scale` screen px per local unit. */
  function frameAt(x, y, scale) {
    var sc = scale || 1;
    return { ox: x || 0, oy: y || 0, sc: sc,
      X: function (v) { return this.ox + v * this.sc; },
      Y: function (v) { return this.oy + v * this.sc; },
      S: function (v) { return v * this.sc; } };
  }
  function F(o) { return (o && o.frame) || frameAt(opt(o, 'x', 0), opt(o, 'y', 0), opt(o, 'scale', 1)); }
  function lrect(p, f, x0, y0, x1, y1, r) {
    if (r) p.rect(f.X(x0), f.Y(y0), f.S(x1 - x0), f.S(y1 - y0), f.S(r));
    else p.rect(f.X(x0), f.Y(y0), f.S(x1 - x0), f.S(y1 - y0));
  }
  function lline(p, f, x1, y1, x2, y2) { p.line(f.X(x1), f.Y(y1), f.X(x2), f.Y(y2)); }
  function poly(p, pts, close) {
    p.beginShape();
    for (var i = 0; i < pts.length; i++) p.vertex(pts[i][0], pts[i][1]);
    if (close) p.endShape(p.CLOSE); else p.endShape();
  }

  // ------------------------------------------------------------------ geometry (pure)
  /**
   * Outlet (air) direction as a screen unit vector {x, y} (y down): "straight up"
   * turned through `angle` degrees in the direction of rotation, seen from the
   * drive side. Identical to ch13 outletVector().
   */
  function outletVector(rotation, angle) {
    var a = angle * Math.PI / 180;
    var sx = rotation === 'CW' ? Math.sin(a) : -Math.sin(a);
    var x = Math.abs(sx) < 1e-12 ? 0 : sx, y = -Math.cos(a);
    return { x: x, y: Math.abs(y) < 1e-12 ? 0 : y };
  }
  /**
   * Scroll housing geometry for centre (cx, cy) and size s (ch13 drawHousing):
   * returns {dvec, alpha, dir, R0, R1, L, spiral[[x,y]...], outerEnd, innerEnd, mouth}.
   * The outlet sits where the wheel's tangential velocity points along the outlet direction.
   */
  function scrollGeometry(cx, cy, s, rotation, angle) {
    var d = outletVector(rotation, angle);
    var pv = rotation === 'CW' ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x };
    var alpha = Math.atan2(pv.y, pv.x);
    var R0 = s * 0.2, R1 = s * 0.3, L = s * 0.2;
    var dir = rotation === 'CW' ? 1 : -1;
    var spiral = [];
    for (var i = 0; i <= 72; i++) {
      var t = i / 72, phi = alpha + dir * TWO_PI * t, r = R0 + (R1 - R0) * t;
      spiral.push([cx + r * Math.cos(phi), cy + r * Math.sin(phi)]);
    }
    var outerEnd = [cx + R1 * Math.cos(alpha) + L * d.x, cy + R1 * Math.sin(alpha) + L * d.y];
    var innerEnd = [cx + R0 * Math.cos(alpha) + L * d.x, cy + R0 * Math.sin(alpha) + L * d.y];
    return { dvec: d, alpha: alpha, dir: dir, R0: R0, R1: R1, L: L, spiral: spiral,
      outerEnd: outerEnd, innerEnd: innerEnd,
      mouth: [(outerEnd[0] + innerEnd[0]) / 2, (outerEnd[1] + innerEnd[1]) / 2] };
  }
  /** Points of a circular arc from angle a0 sweeping `sweep` radians (positive = clockwise on screen). */
  function arcPoints(cx, cy, r, a0, sweep, n) {
    var pts = [], k = n || Math.max(8, Math.ceil(Math.abs(sweep) * 12));
    for (var i = 0; i <= k; i++) { var a = a0 + sweep * i / k; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
  }
  /**
   * Open-belt tangent points for two pulleys (c1, r1) and (c2, r2), centres on any line.
   * Returns {upper: [[x,y],[x,y]], lower: [[x,y],[x,y]]} (upper = smaller screen y side
   * when c2 is to the right of c1).
   */
  function beltTangents(x1, y1, r1, x2, y2, r2) {
    var dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    var base = Math.atan2(dy, dx), off = Math.acos((r1 - r2) / d);
    function pt(cx, cy, r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var aU = base - off, aL = base + off;
    return { upper: [pt(x1, y1, r1, aU), pt(x2, y2, r2, aU)], lower: [pt(x1, y1, r1, aL), pt(x2, y2, r2, aL)],
      angles: { upper: aU, lower: aL } };
  }
  /** Sheave rotation angles (radians) at time t s for a motor RPM and pitch diameters; slow divides real speed for display. */
  function sheaveAngles(t, motorRpm, motorIn, fanIn, slow) {
    var k = slow || 60;
    var am = (t || 0) * (motorRpm / 60) * TWO_PI / k;
    return { motor: am, fan: am * motorIn / fanIn };
  }

  // ------------------------------------------------------------------ arrows
  /** Filled arrowhead with its tip at (x, y) pointing along angle (radians, screen). */
  function arrowHead(p, x, y, angle, size, color) {
    p = P(p);
    var s = size || 10, c = color || palette().air;
    p.push();
    p.noStroke(); p.fill(c);
    p.translate(x, y); p.rotate(angle);
    p.triangle(0, 0, -s, -s * 0.55, -s, s * 0.55);
    p.pop();
  }

  /**
   * Airflow arrow from (x1, y1) to (x2, y2). Options: frame (then the points are
   * local units), color (default air), weight (2.5), head (10), dashed, t (seconds:
   * animates a moving dash so the air "flows"), label, labelSide ('above'|'below').
   */
  function airflowArrow(p, o) {
    p = P(p);
    var pal = palette(), f = o.frame;
    var x1 = f ? f.X(o.x1) : o.x1, y1 = f ? f.Y(o.y1) : o.y1;
    var x2 = f ? f.X(o.x2) : o.x2, y2 = f ? f.Y(o.y2) : o.y2;
    var c = opt(o, 'color', pal.air), a = Math.atan2(y2 - y1, x2 - x1), hs = opt(o, 'head', 10);
    p.push();
    glow(p, o.highlight);
    p.stroke(c); p.strokeWeight(opt(o, 'weight', 2.5)); p.noFill();
    if (o.t !== undefined || o.dashed) {
      dash(p, [8, 6]);
      if (o.t !== undefined && p.drawingContext) p.drawingContext.lineDashOffset = -(o.t * 30) % 14;
    }
    p.line(x1, y1, x2 - Math.cos(a) * hs * 0.6, y2 - Math.sin(a) * hs * 0.6);
    dash(p, []);
    arrowHead(p, x2, y2, a, hs, c);
    if (o.label) {
      p.noStroke(); p.fill(pal.text); p.textSize(opt(o, 'textSize', 14));
      p.textAlign(p.CENTER, o.labelSide === 'below' ? p.TOP : p.BOTTOM);
      p.text(o.label, (x1 + x2) / 2, (y1 + y2) / 2 + (o.labelSide === 'below' ? 6 : -6));
    }
    p.pop();
  }

  /**
   * Rotation arc with an arrowhead, centred at (x, y) with radius r. rotation 'CW'
   * draws clockwise on screen. Options: start (radians, screen, default -2.4),
   * sweep (radians, default 1.2*PI), color (accent), weight (3), label (string;
   * drawn in accent-text colour), labelSize (16).
   */
  function rotationArc(p, o) {
    p = P(p);
    var pal = palette(), dir = o.rotation === 'CCW' ? -1 : 1;
    var start = opt(o, 'start', -2.4), sweep = opt(o, 'sweep', Math.PI * 1.2);
    var pts = arcPoints(o.x, o.y, o.r, start, dir * sweep);
    var c = opt(o, 'color', pal.accent);
    p.push();
    p.noFill(); p.stroke(c); p.strokeWeight(opt(o, 'weight', 3));
    poly(p, pts, false);
    var endA = start + dir * sweep;
    arrowHead(p, o.x + o.r * Math.cos(endA), o.y + o.r * Math.sin(endA), endA + dir * HALF_PI, opt(o, 'head', 11), c);
    if (o.label) {
      var la = start + dir * sweep * 0.5, lr = o.r + opt(o, 'labelOffset', 18);
      p.noStroke(); p.fill(pal.accentText); p.textStyle(p.BOLD); p.textSize(opt(o, 'labelSize', 16));
      p.textAlign(p.CENTER, p.CENTER);
      p.text(o.label, o.x + lr * Math.cos(la), o.y + lr * Math.sin(la));
    }
    p.pop();
  }

  /**
   * Label box with a leader line to an anchor point. Options: text, ax, ay (anchor),
   * lx, ly (label centre), frame (then all four are local units), bounds {x0, x1}
   * (keeps the box on screen), textSize (14), highlight.
   */
  function leaderLabel(p, o) {
    p = P(p);
    var pal = palette(), f = o.frame;
    var ax = f ? f.X(o.ax) : o.ax, ay = f ? f.Y(o.ay) : o.ay;
    var sx = f ? f.X(o.lx) : o.lx, sy = f ? f.Y(o.ly) : o.ly;
    p.push();
    p.textSize(opt(o, 'textSize', 14));
    var tw = p.textWidth(o.text) + 10, th = opt(o, 'textSize', 14) + 6;
    if (o.bounds) sx = Math.max(o.bounds.x0 + tw / 2, Math.min(o.bounds.x1 - tw / 2, sx));
    p.stroke(pal.text); p.strokeWeight(1);
    p.line(sx, sy, ax, ay);
    p.noStroke(); p.fill(pal.text); p.circle(ax, ay, 5);
    glow(p, o.highlight);
    p.stroke(o.highlight ? pal.accent : pal.edge); p.strokeWeight(o.highlight ? 2 : 1);
    p.fill(pal.white);
    p.rect(sx - tw / 2, sy - th / 2, tw, th, 4);
    noGlow(p);
    p.noStroke(); p.fill(pal.text); p.textAlign(p.CENTER, p.CENTER);
    p.text(o.text, sx, sy);
    p.pop();
  }

  // ------------------------------------------------------------------ side-view parts (local units)
  var SIDE = { shaftY: 110, floorY: 230, localW: 640, localTop: -40, localBottom: 255 };

  function partStyle(p, o, fillC, strokeC, w) {
    var pal = palette();
    glow(p, o && o.highlight);
    p.stroke(o && o.highlight ? pal.accent : strokeC);
    p.strokeWeight((w || 2) + (o && o.highlight ? 1 : 0));
    if (fillC) p.fill(fillC); else p.noFill();
  }

  /** Floor line with hatching. Options: frame, x0 (0), x1 (localW), y (floorY). */
  function floor(p, o) {
    p = P(p); o = o || {};
    var f = F(o), y = opt(o, 'y', SIDE.floorY), x0 = opt(o, 'x0', 0), x1 = opt(o, 'x1', SIDE.localW);
    p.push();
    p.stroke(palette().floor); p.strokeWeight(2);
    lline(p, f, x0, y, x1, y);
    p.strokeWeight(1);
    for (var x = x0 + 5; x < x1; x += 16) lline(p, f, x, y, x - 8, y + 8);
    p.pop();
  }

  /** Side view of a scroll housing from x0 to x1 (local). Options: inletLeft, inletRight, top (20), bottom (215), floorY, highlight. */
  function housingSide(p, o) {
    p = P(p);
    var f = F(o), pal = palette(), x0 = o.x0, x1 = o.x1;
    var top = opt(o, 'top', 20), bot = opt(o, 'bottom', 215), fy = opt(o, 'floorY', SIDE.floorY);
    var sy = opt(o, 'shaftY', SIDE.shaftY), half = 38;
    p.push();
    partStyle(p, o, pal.metal, pal.edge, 2);
    p.rect(f.X(x0), f.Y(top), f.S(x1 - x0), f.S(bot - top), f.S(28), f.S(28), 0, 0);
    noGlow(p);
    p.stroke(pal.edge); p.strokeWeight(2); p.fill(pal.steel);
    lrect(p, f, x0 - 8, bot, x1 + 8, fy);
    p.noStroke(); p.fill(pal.white);
    if (o.inletLeft) lrect(p, f, x0 - 2, sy - half, x0 + 3, sy + half);
    if (o.inletRight) lrect(p, f, x1 - 3, sy - half, x1 + 2, sy + half);
    p.stroke(pal.edge); p.strokeWeight(2);
    if (o.inletLeft) { lline(p, f, x0, sy - half, x0 - 12, sy - half - 12); lline(p, f, x0, sy + half, x0 - 12, sy + half + 12); }
    if (o.inletRight) { lline(p, f, x1, sy - half, x1 + 12, sy - half - 12); lline(p, f, x1, sy + half, x1 + 12, sy + half + 12); }
    p.pop();
  }

  /** Side view of an impeller between i0 and i1 (local). Options: doubleWidth, shaftY, highlight. */
  function impellerSide(p, o) {
    p = P(p);
    var f = F(o), pal = palette(), i0 = o.i0, i1 = o.i1, sy = opt(o, 'shaftY', SIDE.shaftY);
    p.push();
    partStyle(p, o, null, pal.hub, 2);
    lrect(p, f, i0, sy - 65, i1, sy + 65);
    noGlow(p);
    p.strokeWeight(1.5);
    for (var x = i0 + 6; x < i1; x += 7) lline(p, f, x, sy - 60, x, sy + 60);
    p.strokeWeight(4);
    var hx = o.doubleWidth ? (i0 + i1) / 2 : i1;
    lline(p, f, hx, sy - 68, hx, sy + 68);
    p.noStroke(); p.fill(pal.hub);
    lrect(p, f, hx - 7, sy - 12, hx + 7, sy + 12);
    p.pop();
  }

  /** Fan shaft from xa to xb at y (default shaftY). */
  function shaft(p, o) {
    p = P(p);
    var f = F(o), pal = palette(), y = opt(o, 'y', SIDE.shaftY);
    p.push();
    glow(p, o.highlight);
    p.stroke(o.highlight ? pal.accent : pal.hub); p.strokeWeight(Math.max(3, f.S(6)));
    lline(p, f, o.xa, y, o.xb, y);
    p.pop();
  }

  /** Motor shaft from xa to xb at y. */
  function motorShaft(p, o) {
    p = P(p);
    var f = F(o), pal = palette();
    p.push();
    p.stroke(pal.hub); p.strokeWeight(Math.max(2, f.S(5)));
    lline(p, f, o.xa, o.y, o.xb, o.y);
    p.pop();
  }

  /** Pillow-block bearing centred at x on the shaft. Options: foot (draw the mounting foot), y (shaftY), highlight. */
  function bearing(p, o) {
    p = P(p);
    var f = F(o), pal = palette(), x = o.x, sy = opt(o, 'y', SIDE.shaftY);
    p.push();
    partStyle(p, o, pal.bearing, pal.bearingEdge, 1);
    lrect(p, f, x - 11, sy - 15, x + 11, sy + 14, 4);
    if (o.foot) lrect(p, f, x - 16, sy + 14, x + 16, sy + 30);
    noGlow(p);
    p.fill(pal.white); p.noStroke();
    p.ellipse(f.X(x), f.Y(sy), f.S(7), f.S(7));
    p.pop();
  }

  /**
   * Steel bearing pedestal from x0 to x1, top `top` to the floor (cross-braced).
   * Options: floorY, cutaway [x0, y0, x1, y1] (dashed window showing a motor inside), highlight.
   */
  function pedestal(p, o) {
    p = P(p);
    var f = F(o), pal = palette(), fy = opt(o, 'floorY', SIDE.floorY);
    p.push();
    partStyle(p, o, pal.steel, pal.edge, 2);
    lrect(p, f, o.x0, o.top, o.x1, fy);
    noGlow(p);
    p.strokeWeight(1); p.stroke(pal.steelSide);
    lline(p, f, o.x0, o.top, o.x1, fy);
    lline(p, f, o.x1, o.top, o.x0, fy);
    if (o.cutaway) {
      var c = o.cutaway;
      p.stroke(pal.edge); p.fill(pal.white);
      lrect(p, f, c[0], c[1], c[2], c[3]);
      dash(p, [5, 4]); p.noFill(); p.stroke(pal.text);
      lrect(p, f, c[0], c[1], c[2], c[3]);
      dash(p, []);
    }
    p.pop();
  }

  /** Motor body from (x0, y0) to (x1, y1), local, with cooling fins. Options: highlight, label. */
  function motor(p, o) {
    p = P(p);
    var f = F(o), pal = palette();
    p.push();
    partStyle(p, o, pal.motor, pal.motorEdge, 2);
    lrect(p, f, o.x0, o.y0, o.x1, o.y1, 6);
    noGlow(p);
    p.stroke(pal.motorSide); p.strokeWeight(1);
    for (var x = o.x0 + 10; x < o.x1 - 6; x += 9) lline(p, f, x, o.y0 + 4, x, o.y1 - 4);
    if (o.label) {
      p.noStroke(); p.fill(pal.white); p.textSize(opt(o, 'textSize', 14)); p.textStyle(p.BOLD);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(o.label, f.X((o.x0 + o.x1) / 2), f.Y((o.y0 + o.y1) / 2));
    }
    p.pop();
  }

  /** Floor base plate (motor base) from (x0, y0) to (x1, y1), local. */
  function base(p, o) {
    p = P(p);
    var f = F(o), pal = palette();
    p.push();
    partStyle(p, o, pal.steelSide, pal.edge, 1);
    lrect(p, f, o.x0, o.y0, o.x1, o.y1);
    p.pop();
  }

  /** Slide base plate bolted to a pedestal side, from (x0, y0) to (x1, y1), local. */
  function slideBase(p, o) {
    p = P(p);
    var f = F(o), pal = palette();
    p.push();
    partStyle(p, o, pal.metalSide, pal.edge, 1);
    lrect(p, f, o.x0, o.y0, o.x1, o.y1);
    p.noStroke(); p.fill(pal.text);
    var my = (o.y0 + o.y1) / 2;
    p.ellipse(f.X(o.x0 + 8), f.Y(my), f.S(4), f.S(4));
    p.ellipse(f.X(o.x1 - 8), f.Y(my), f.S(4), f.S(4));
    p.pop();
  }

  /** Side view of a sheave (thin disc) at x, y with radius r (local). */
  function sheave(p, o) {
    p = P(p);
    var f = F(o), pal = palette();
    p.push();
    partStyle(p, o, pal.sheave, pal.sheaveEdge, 1);
    lrect(p, f, o.x - 5, o.y - o.r, o.x + 5, o.y + o.r, 2);
    p.pop();
  }

  /** V-belts seen edge on at x, between y1 and y2 (local). */
  function belts(p, o) {
    p = P(p);
    var f = F(o), pal = palette();
    p.push();
    glow(p, o.highlight);
    p.stroke(o.highlight ? pal.accent : pal.belt); p.strokeWeight(2);
    lline(p, f, o.x - 8, o.y1, o.x - 8, o.y2);
    lline(p, f, o.x + 8, o.y1, o.x + 8, o.y2);
    p.pop();
  }

  /** Flexible coupling starting at x on the shaft (local). */
  function coupling(p, o) {
    p = P(p);
    var f = F(o), pal = palette(), y = opt(o, 'y', SIDE.shaftY);
    p.push();
    partStyle(p, o, pal.coupling, pal.text, 1);
    lrect(p, f, o.x, y - 17, o.x + 7, y + 17, 2);
    lrect(p, f, o.x + 10, y - 17, o.x + 17, y + 17, 2);
    p.pop();
  }

  /** Inlet box from x0 to x1 (local), open at the top, with downward air arrows unless air=false. */
  function inletBox(p, o) {
    p = P(p);
    var f = F(o), pal = palette(), fy = opt(o, 'floorY', SIDE.floorY);
    p.push();
    partStyle(p, o, pal.metal, pal.edge, 2);
    lrect(p, f, o.x0, 35, o.x1, 215);
    noGlow(p);
    p.noStroke(); p.fill(pal.white);
    lrect(p, f, o.x0 + 8, 33, o.x1 - 8, 38);
    p.fill(pal.steel); p.stroke(pal.edge);
    lrect(p, f, o.x0 - 4, 215, o.x1 + 4, fy);
    p.pop();
    if (o.air !== false) {
      var cx = (o.x0 + o.x1) / 2;
      airflowArrow(p, { frame: f, x1: cx - 12, y1: -18, x2: cx - 12, y2: 30, t: o.t });
      airflowArrow(p, { frame: f, x1: cx + 12, y1: -18, x2: cx + 12, y2: 30, t: o.t });
    }
  }

  /** Bearing bracket bolted to the housing side wall at xWall, reaching to xEnd (local). */
  function housingBracket(p, o) {
    p = P(p);
    var f = F(o), pal = palette(), sy = opt(o, 'shaftY', SIDE.shaftY);
    var dir = o.xEnd > o.xWall ? 1 : -1, a = Math.min(o.xWall, o.xEnd), b = Math.max(o.xWall, o.xEnd);
    p.push();
    partStyle(p, o, pal.steel, pal.edge, 2);
    lrect(p, f, a, sy + 14, b, sy + 24);
    lline(p, f, o.xWall, 195, o.xEnd - dir * 8, sy + 24);
    p.fill(pal.text); p.noStroke();
    p.ellipse(f.X(o.xWall + dir * 3), f.Y(sy + 19), f.S(4), f.S(4));
    p.ellipse(f.X(o.xWall + dir * 3), f.Y(190), f.S(4), f.S(4));
    p.pop();
  }

  /** Bracket across the inlet: a bar at xBar held off the housing face at xWall (local). */
  function inletBracket(p, o) {
    p = P(p);
    var f = F(o), pal = palette();
    p.push();
    glow(p, o.highlight);
    p.stroke(o.highlight ? pal.accent : pal.edge); p.strokeWeight(3);
    lline(p, f, o.xBar, 38, o.xBar, 186);
    lline(p, f, o.xBar, 38, o.xWall, 38);
    lline(p, f, o.xBar, 186, o.xWall, 186);
    p.pop();
  }

  function airLeft(p, f, x0, t) {
    airflowArrow(p, { frame: f, x1: x0 - 95, y1: 82, x2: x0 - 16, y2: 92, t: t });
    airflowArrow(p, { frame: f, x1: x0 - 95, y1: 138, x2: x0 - 16, y2: 128, t: t });
  }
  function airRight(p, f, x1, t) {
    airflowArrow(p, { frame: f, x1: x1 + 40, y1: 70, x2: x1 + 14, y2: 88, t: t });
    airflowArrow(p, { frame: f, x1: x1 + 40, y1: 150, x2: x1 + 14, y2: 132, t: t });
  }

  // Arrangement schematics: part calls exactly as ch11 drawSchematic(), keyed by AMCA code.
  // Each step is [part, options]; 'airLeft'/'airRight' take {x}.
  var ARR = {
    '1': [['airLeft', { x: 120 }], ['pedestal', { x0: 230, x1: 360, top: 140, part: 'pedestal' }], ['housingSide', { x0: 120, x1: 200, inletLeft: true, part: 'housing' }],
      ['impellerSide', { i0: 130, i1: 188, part: 'impeller' }], ['shaft', { xa: 188, xb: 395, part: 'shaft' }], ['bearing', { x: 255, foot: true, part: 'bearing' }], ['bearing', { x: 335, foot: true, part: 'bearing' }],
      ['base', { x0: 395, y0: 214, x1: 490, y1: 230, part: 'base' }], ['motor', { x0: 402, x1: 482, y0: 168, y1: 214, part: 'motor' }], ['motorShaft', { xa: 385, xb: 402, y: 191 }],
      ['belts', { x: 385, y1: 110, y2: 191, part: 'belts' }], ['sheave', { x: 385, y: 110, r: 22, part: 'sheave' }], ['sheave', { x: 385, y: 191, r: 13, part: 'sheave' }]],
    '2': [['airLeft', { x: 120 }], ['housingSide', { x0: 120, x1: 200, inletLeft: true, part: 'housing' }], ['impellerSide', { i0: 130, i1: 188, part: 'impeller' }],
      ['housingBracket', { xWall: 200, xEnd: 330, part: 'bracket' }], ['shaft', { xa: 188, xb: 365, part: 'shaft' }], ['bearing', { x: 235, part: 'bearing' }], ['bearing', { x: 305, part: 'bearing' }],
      ['base', { x0: 375, y0: 214, x1: 470, y1: 230, part: 'base' }], ['motor', { x0: 382, x1: 462, y0: 168, y1: 214, part: 'motor' }], ['motorShaft', { xa: 355, xb: 382, y: 191 }],
      ['belts', { x: 355, y1: 110, y2: 191, part: 'belts' }], ['sheave', { x: 355, y: 110, r: 22, part: 'sheave' }], ['sheave', { x: 355, y: 191, r: 13, part: 'sheave' }]],
    '3': [['airLeft', { x: 165 }], ['housingSide', { x0: 200, x1: 280, inletLeft: true, part: 'housing' }], ['impellerSide', { i0: 212, i1: 268, part: 'impeller' }],
      ['inletBracket', { xWall: 200, xBar: 172, part: 'bracket' }], ['housingBracket', { xWall: 280, xEnd: 322, part: 'bracket' }], ['shaft', { xa: 165, xb: 350, part: 'shaft' }],
      ['bearing', { x: 172, part: 'bearing' }], ['bearing', { x: 305, part: 'bearing' }], ['base', { x0: 352, y0: 214, x1: 450, y1: 230, part: 'base' }],
      ['motor', { x0: 360, x1: 440, y0: 168, y1: 214, part: 'motor' }], ['motorShaft', { xa: 340, xb: 360, y: 191 }], ['belts', { x: 340, y1: 110, y2: 191, part: 'belts' }],
      ['sheave', { x: 340, y: 110, r: 22, part: 'sheave' }], ['sheave', { x: 340, y: 191, r: 13, part: 'sheave' }]],
    '3SI': [['inletBox', { x0: 90, x1: 170, part: 'inletBox' }], ['housingSide', { x0: 170, x1: 250, part: 'housing' }], ['impellerSide', { i0: 182, i1: 238, part: 'impeller' }],
      ['pedestal', { x0: 44, x1: 76, top: 140, part: 'pedestal' }], ['pedestal', { x0: 270, x1: 302, top: 140, part: 'pedestal' }], ['shaft', { xa: 50, xb: 335, part: 'shaft' }],
      ['bearing', { x: 60, foot: true, part: 'bearing' }], ['bearing', { x: 286, foot: true, part: 'bearing' }], ['coupling', { x: 335, part: 'coupling' }],
      ['motorShaft', { xa: 352, xb: 375, y: 110 }], ['base', { x0: 372, y0: 140, x1: 470, y1: 230, part: 'base' }], ['motor', { x0: 375, x1: 465, y0: 78, y1: 142, part: 'motor' }]],
    '3DI': [['inletBox', { x0: 150, x1: 220, part: 'inletBox' }], ['inletBox', { x0: 340, x1: 410, part: 'inletBox' }], ['housingSide', { x0: 220, x1: 340, part: 'housing' }],
      ['impellerSide', { i0: 232, i1: 328, doubleWidth: true, part: 'impeller' }], ['pedestal', { x0: 104, x1: 136, top: 140, part: 'pedestal' }], ['pedestal', { x0: 424, x1: 456, top: 140, part: 'pedestal' }],
      ['shaft', { xa: 110, xb: 480, part: 'shaft' }], ['bearing', { x: 120, foot: true, part: 'bearing' }], ['bearing', { x: 440, foot: true, part: 'bearing' }],
      ['coupling', { x: 475, part: 'coupling' }], ['motorShaft', { xa: 492, xb: 512, y: 110 }], ['base', { x0: 508, y0: 140, x1: 606, y1: 230, part: 'base' }],
      ['motor', { x0: 512, x1: 600, y0: 78, y1: 142, part: 'motor' }]],
    '4': [['airLeft', { x: 140 }], ['housingSide', { x0: 140, x1: 220, inletLeft: true, part: 'housing' }], ['pedestal', { x0: 245, x1: 355, top: 142, part: 'pedestal' }],
      ['impellerSide', { i0: 150, i1: 208, part: 'impeller' }], ['motorShaft', { xa: 208, xb: 250, y: 110 }], ['motor', { x0: 250, x1: 350, y0: 78, y1: 142, part: 'motor' }]],
    '7': [['airLeft', { x: 150 }], ['airRight', { x: 250 }], ['pedestal', { x0: 268, x1: 470, top: 140, part: 'pedestal' }], ['housingSide', { x0: 150, x1: 250, inletLeft: true, inletRight: true, part: 'housing' }],
      ['impellerSide', { i0: 160, i1: 240, doubleWidth: true, part: 'impeller' }], ['inletBracket', { xWall: 150, xBar: 122, part: 'bracket' }], ['shaft', { xa: 112, xb: 330, part: 'shaft' }],
      ['bearing', { x: 122, part: 'bearing' }], ['bearing', { x: 292, foot: true, part: 'bearing' }], ['coupling', { x: 325, part: 'coupling' }],
      ['motorShaft', { xa: 342, xb: 362, y: 110 }], ['motor', { x0: 362, x1: 462, y0: 78, y1: 140, part: 'motor' }]],
    '8': [['airLeft', { x: 120 }], ['pedestal', { x0: 225, x1: 545, top: 140, part: 'pedestal' }], ['housingSide', { x0: 120, x1: 200, inletLeft: true, part: 'housing' }],
      ['impellerSide', { i0: 130, i1: 188, part: 'impeller' }], ['shaft', { xa: 188, xb: 380, part: 'shaft' }], ['bearing', { x: 250, foot: true, part: 'bearing' }], ['bearing', { x: 330, foot: true, part: 'bearing' }],
      ['coupling', { x: 375, part: 'coupling' }], ['motorShaft', { xa: 392, xb: 425, y: 110 }], ['motor', { x0: 425, x1: 525, y0: 78, y1: 140, part: 'motor' }]],
    '9': [['airLeft', { x: 120 }], ['pedestal', { x0: 230, x1: 360, top: 140, part: 'pedestal' }], ['housingSide', { x0: 120, x1: 200, inletLeft: true, part: 'housing' }],
      ['impellerSide', { i0: 130, i1: 188, part: 'impeller' }], ['shaft', { xa: 188, xb: 395, part: 'shaft' }], ['bearing', { x: 255, foot: true, part: 'bearing' }], ['bearing', { x: 335, foot: true, part: 'bearing' }],
      ['slideBase', { x0: 262, y0: 204, x1: 358, y1: 214, part: 'base' }], ['motor', { x0: 272, x1: 348, y0: 160, y1: 204, part: 'motor' }], ['motorShaft', { xa: 348, xb: 385, y: 182 }],
      ['belts', { x: 385, y1: 110, y2: 182, part: 'belts' }], ['sheave', { x: 385, y: 110, r: 22, part: 'sheave' }], ['sheave', { x: 385, y: 182, r: 13, part: 'sheave' }]],
    '10': [['airLeft', { x: 120 }], ['pedestal', { x0: 230, x1: 360, top: 140, cutaway: [242, 150, 352, 224], part: 'pedestal' }], ['housingSide', { x0: 120, x1: 200, inletLeft: true, part: 'housing' }],
      ['impellerSide', { i0: 130, i1: 188, part: 'impeller' }], ['shaft', { xa: 188, xb: 395, part: 'shaft' }], ['bearing', { x: 255, foot: true, part: 'bearing' }], ['bearing', { x: 335, foot: true, part: 'bearing' }],
      ['base', { x0: 256, y0: 212, x1: 340, y1: 220, part: 'base' }], ['motor', { x0: 262, x1: 334, y0: 172, y1: 212, part: 'motor' }], ['motorShaft', { xa: 334, xb: 385, y: 192 }],
      ['belts', { x: 385, y1: 110, y2: 192, part: 'belts' }], ['sheave', { x: 385, y: 110, r: 22, part: 'sheave' }], ['sheave', { x: 385, y: 192, r: 13, part: 'sheave' }]]
  };
  // Part labels from ch11 LABELS: [text, anchorX, anchorY, labelX, labelY] in local units.
  var ARR_LABELS = {
    '1': [['SWSI housing', 160, 30, 110, -28], ['Impeller (overhung)', 160, 60, 40, 5], ['2 bearings', 295, 96, 290, -28], ['Pedestal', 295, 200, 260, 248],
      ['Fan sheave', 385, 88, 430, 40], ['Belts', 393, 150, 445, 115], ['Motor on its own floor base', 442, 214, 470, 248]],
    '2': [['SWSI housing', 160, 30, 110, -28], ['Impeller (overhung)', 160, 60, 40, 5], ['2 bearings', 270, 96, 270, -28], ['Bracket bolted to housing', 265, 140, 250, 248],
      ['Fan sheave', 355, 88, 420, 40], ['Belts', 363, 150, 420, 115], ['Separate motor', 422, 214, 470, 248]],
    '3': [['Bearing on bracket across inlet', 172, 96, 120, -28], ['SWSI housing', 240, 30, 290, -2], ['Impeller (center hung)', 240, 170, 200, 248],
      ['Bearing on housing bracket', 305, 96, 430, -28], ['Fan sheave', 340, 88, 430, 40], ['Belts', 348, 150, 410, 115], ['Motor on floor', 400, 214, 470, 248]],
    '3SI': [['Inlet box', 130, 150, 130, 185], ['SWSI housing', 210, 30, 250, -2], ['Impeller (center hung)', 210, 170, 260, 248], ['Bearing on independent pedestal', 60, 96, 60, -32],
      ['Bearing on independent pedestal', 286, 96, 390, 40], ['Coupling', 343, 128, 360, 175], ['Motor off the fan assembly', 420, 78, 470, -28]],
    '3DI': [['Inlet boxes', 185, 60, 150, -32], ['DWDI housing', 280, 30, 280, -2], ['Impeller (center hung)', 280, 170, 280, 248], ['Independent pedestal', 120, 160, 75, 248],
      ['Independent pedestal', 440, 160, 470, 248], ['Coupling', 483, 128, 520, 175], ['Motor off the fan assembly', 556, 78, 545, -28]],
    '4': [['SWSI housing', 180, 30, 100, -28], ['Impeller hub on motor shaft', 212, 110, 290, -28], ['Motor (no fan bearings)', 330, 100, 470, 60], ['Motor pedestal', 300, 200, 440, 200]],
    '7': [['Bearing on bracket across inlet', 122, 96, 100, -28], ['DWDI housing', 200, 30, 250, -2], ['Impeller (center hung)', 200, 170, 180, 248], ['Bearing on pedestal', 292, 95, 330, 40],
      ['Coupling', 333, 127, 400, 248], ['Motor on the same pedestal', 412, 78, 500, -28], ['Pedestal', 440, 200, 520, 200]],
    '8': [['SWSI housing', 160, 30, 110, -28], ['Impeller (overhung)', 160, 60, 40, 5], ['2 bearings', 290, 96, 280, -28], ['Coupling', 383, 92, 370, 40],
      ['Motor on the extended pedestal', 475, 78, 500, -28], ['Long pedestal', 385, 200, 385, 248]],
    '9': [['SWSI housing', 160, 30, 110, -28], ['Impeller (overhung)', 160, 60, 40, 5], ['2 bearings', 295, 96, 290, -28], ['Motor on slide base on side of pedestal', 310, 204, 290, 248],
      ['Fan sheave', 385, 88, 440, 40], ['Belts', 393, 150, 460, 120]],
    '10': [['SWSI housing', 160, 30, 110, -28], ['Impeller (overhung)', 160, 60, 40, 5], ['2 bearings', 295, 96, 290, -28], ['Motor inside the pedestal (cutaway)', 298, 218, 290, 248],
      ['Fan sheave', 385, 88, 440, 40], ['Belts', 393, 150, 460, 120]]
  };

  /**
   * Whole side-view schematic of an AMCA arrangement, as in ch11.
   * code: '1' | '2' | '3' | '3SI' | '3DI' | '4' | '7' | '8' | '9' | '10'.
   * Options: box {x, y, w, h} (fits FD.SIDE local extents) or frame; labels (part
   * labels with leaders); highlight (a part name or array: 'housing', 'impeller',
   * 'shaft', 'bearing', 'pedestal', 'motor', 'base', 'belts', 'sheave', 'coupling',
   * 'inletBox', 'bracket'); airflow (default true); t (animates air); floor (default true).
   * Returns the frame used, or null for an unknown code.
   */
  function arrangement(p, code, o) {
    p = P(p); o = o || {};
    var steps = ARR[String(code)];
    if (!steps) return null;
    var f = o.frame || frame(o.box || { x: 0, y: 0, w: SIDE.localW, h: SIDE.localBottom - SIDE.localTop },
      SIDE.localW, SIDE.localTop, SIDE.localBottom);
    var hl = o.highlight ? [].concat(o.highlight) : [];
    if (o.floor !== false) floor(p, { frame: f });
    for (var i = 0; i < steps.length; i++) {
      var name = steps[i][0], so = steps[i][1];
      if (name === 'airLeft') { if (o.airflow !== false) airLeft(p, f, so.x, o.t); continue; }
      if (name === 'airRight') { if (o.airflow !== false) airRight(p, f, so.x, o.t); continue; }
      var oo = { frame: f, t: o.t, air: o.airflow };
      for (var k in so) if (Object.prototype.hasOwnProperty.call(so, k)) oo[k] = so[k];
      oo.highlight = hl.indexOf(so.part) >= 0;
      FD[name](p, oo);
    }
    if (o.labels) {
      var bounds = { x0: Math.max(0, f.X(0)), x1: f.X(SIDE.localW) };
      if (o.bounds) bounds = o.bounds;
      ARR_LABELS[String(code)].forEach(function (l) {
        leaderLabel(p, { text: l[0], ax: l[1], ay: l[2], lx: l[3], ly: l[4], frame: f, bounds: bounds, textSize: opt(o, 'textSize', 14) });
      });
    }
    return f;
  }

  // ------------------------------------------------------------------ drive-side scroll housing
  /**
   * Drive-side view of a centrifugal scroll housing (ch13 drawHousing), with the
   * wheel, a rotation arc, the outlet and an airflow arrow out of the outlet.
   * Options: x, y (centre), size (s; housing spans about 0.6*s plus the outlet),
   *   rotation 'CW' | 'CCW' (drive side), angle (45..360),
   *   view 'drive' (default) | 'inlet' (mirror image left to right; the arrow appears reversed),
   *   notOffered (grey dashed housing and a red cross over the outlet),
   *   labels (default true: rotation label on the arc), rotationLabel (override text, or false),
   *   showRotation (true), showAir (true), highlight ('outlet' | 'rotation' | true for the housing), t (animates air).
   * Returns {mouth: [x, y], tip: [x, y]} in screen coordinates.
   */
  function scrollHousing(p, o) {
    p = P(p);
    var pal = palette(), cx = o.x, cy = o.y, s = o.size, rot = o.rotation || 'CW', ang = opt(o, 'angle', 360);
    var g = scrollGeometry(cx, cy, s, rot, ang);
    var inlet = o.view === 'inlet';
    function M(pt) { return inlet ? [2 * cx - pt[0], pt[1]] : pt; }
    function Mv(v) { return inlet ? { x: -v.x, y: v.y } : v; }
    var hl = o.highlight;
    p.push();
    // housing outline: spiral in the rotation direction, then the outlet duct
    glow(p, hl === true);
    p.stroke(hl === true ? pal.accent : pal.edge); p.strokeWeight(hl === true ? 3 : 2);
    p.fill(o.notOffered ? pal.white : pal.metal);
    if (o.notOffered) dash(p, [6, 5]);
    var shape = g.spiral.concat([g.outerEnd, g.innerEnd]).map(M);
    poly(p, shape, true);
    dash(p, []); noGlow(p);
    // wheel with blades
    var rw = g.R0 * 0.78;
    p.fill(pal.white); p.stroke(pal.hub); p.strokeWeight(1.5);
    p.circle(cx, cy, rw * 2);
    for (var k = 0; k < 12; k++) {
      var b = k * TWO_PI / 12;
      var a0 = M([cx + rw * 0.45 * Math.cos(b), cy + rw * 0.45 * Math.sin(b)]);
      var a1 = M([cx + rw * 0.95 * Math.cos(b + g.dir * 0.35), cy + rw * 0.95 * Math.sin(b + g.dir * 0.35)]);
      p.line(a0[0], a0[1], a1[0], a1[1]);
    }
    p.fill(pal.hub); p.circle(cx, cy, rw * 0.3);
    p.pop();

    // rotation arc (drawn in the drive-side sense, then mirrored for an inlet view)
    if (o.showRotation !== false) {
      var ra = g.R1 + s * 0.06, start = g.alpha + g.dir * 0.6, sweep = Math.PI * 1.2;
      var drawnRot = inlet ? (rot === 'CW' ? 'CCW' : 'CW') : rot;
      var st = inlet ? Math.PI - start : start;
      var lbl = o.rotationLabel !== undefined ? o.rotationLabel : (o.labels === false || inlet ? false : rot);
      p.push();
      if (hl === 'rotation') glow(p, true);
      rotationArc(p, { x: cx, y: cy, r: ra, rotation: drawnRot, start: st, sweep: sweep, label: lbl || null,
        weight: hl === 'rotation' ? 4 : 3 });
      p.pop();
    }

    // airflow arrow out of the outlet mouth
    var mouth = M(g.mouth), dv = Mv(g.dvec);
    var tip = [mouth[0] + dv.x * s * 0.12, mouth[1] + dv.y * s * 0.12];
    if (o.showAir !== false) {
      airflowArrow(p, { x1: mouth[0], y1: mouth[1], x2: tip[0], y2: tip[1], weight: 3, head: 11,
        color: o.notOffered ? pal.muted : pal.air, t: o.t, highlight: hl === 'outlet' });
    }
    if (o.notOffered) {
      var e = M([g.mouth[0], g.mouth[1]]), w = M([cx + g.R1 * Math.cos(g.alpha), cy + g.R1 * Math.sin(g.alpha)]);
      var m = [(e[0] + w[0]) / 2, (e[1] + w[1]) / 2], kk = s * 0.08;
      p.push();
      p.stroke(pal.incorrect); p.strokeWeight(5);
      p.line(m[0] - kk, m[1] - kk, m[0] + kk, m[1] + kk);
      p.line(m[0] - kk, m[1] + kk, m[0] + kk, m[1] - kk);
      p.pop();
    }
    return { mouth: mouth, tip: tip };
  }

  /**
   * Small angle inset (ch13 drawAngleInset): dashed "straight up" reference, the
   * outlet direction and the discharge-angle arc. Options: x, y, r (24), rotation,
   * angle, label (default true: "90° CW" under the dial).
   */
  function angleDial(p, o) {
    p = P(p);
    var pal = palette(), ix = o.x, iy = o.y, r = opt(o, 'r', 24), ang = opt(o, 'angle', 360), rot = o.rotation || 'CW';
    p.push();
    p.stroke(pal.border); p.strokeWeight(1); p.fill(pal.white);
    p.circle(ix, iy, r * 2 + 12);
    p.stroke(pal.muted); dash(p, [3, 3]);
    p.line(ix, iy, ix, iy - r);
    dash(p, []);
    var v = outletVector(rot, ang);
    p.stroke(pal.air); p.strokeWeight(2);
    p.line(ix, iy, ix + v.x * r, iy + v.y * r);
    p.stroke(pal.accent); p.noFill();
    if (ang % 360 !== 0) poly(p, arcPoints(ix, iy, r / 2, -HALF_PI, (rot === 'CW' ? 1 : -1) * ang * Math.PI / 180), false);
    else p.circle(ix, iy, r);
    if (o.label !== false) {
      p.noStroke(); p.fill(pal.text); p.textAlign(p.CENTER, p.TOP); p.textSize(14);
      p.text((ang % 360 === 0 ? 360 : ang) + '° ' + rot, ix, iy + r + 8);
    }
    p.pop();
  }

  /**
   * Inlet box seen from the drive side, at an inlet-box position (45..360, clockwise
   * from the top, independent of rotation; FanPedia p. 144). Draw it BEFORE
   * scrollHousing with the same x, y, size so the housing overlaps its root.
   * Options: x, y, size, position, view ('drive' | 'inlet'), labels (position number),
   * highlight, air (arrow of air entering the opening; default true), t.
   */
  function inletBoxEnd(p, o) {
    p = P(p);
    var pal = palette(), s = o.size, pos = opt(o, 'position', 360);
    var th = (o.view === 'inlet' ? (360 - pos) % 360 : pos % 360) * Math.PI / 180;
    var ux = Math.sin(th), uy = -Math.cos(th), nx = -uy, ny = ux;
    var r0 = s * 0.1, r1 = s * 0.5, hw = s * 0.17;
    var c = [o.x, o.y];
    function at(d, w) { return [c[0] + ux * d + nx * w, c[1] + uy * d + ny * w]; }
    p.push();
    glow(p, o.highlight);
    p.stroke(o.highlight ? pal.accent : pal.edge); p.strokeWeight(o.highlight ? 3 : 2); p.fill(pal.metalSide);
    poly(p, [at(r0, -hw), at(r1, -hw), at(r1, hw), at(r0, hw)], true);
    noGlow(p);
    p.stroke(pal.white); p.strokeWeight(4);
    var e0 = at(r1, -hw * 0.75), e1 = at(r1, hw * 0.75);
    p.line(e0[0], e0[1], e1[0], e1[1]);
    p.pop();
    if (o.air !== false) {
      var a0 = at(r1 + s * 0.2, 0), a1 = at(r1 + s * 0.02, 0);
      airflowArrow(p, { x1: a0[0], y1: a0[1], x2: a1[0], y2: a1[1], t: o.t });
    }
    if (o.labels) {
      var lp = at(r1 + s * 0.3, 0);
      p.push();
      p.noStroke(); p.fill(pal.text); p.textSize(14); p.textStyle(p.BOLD); p.textAlign(p.CENTER, p.CENTER);
      p.text(String(pos % 360 === 0 ? 360 : pos), lp[0], lp[1]);
      p.pop();
    }
  }

  /**
   * AMCA motor positions W, X, Y, Z around a drive-side housing (FanPedia p. 52:
   * W and X on the right, Y and Z on the left; W and Z beside the housing).
   * Options: x, y (housing centre), size (as scrollHousing), positions (default all four),
   * active (code drawn solid and highlighted), blocked (array of codes drawn dashed with a cross),
   * labels (default true). Schematic floor-level placement, not to scale.
   */
  function motorPositions(p, o) {
    p = P(p);
    var pal = palette(), s = o.size, fy = o.y + s * 0.42;
    var place = { W: 0.52, X: 0.82, Y: -0.82, Z: -0.52 };
    var list = o.positions || ['W', 'X', 'Y', 'Z'], blocked = o.blocked || [];
    var mw = s * 0.22, mh = s * 0.14;
    p.push();
    list.forEach(function (code) {
      var mx = o.x + place[code] * s, isA = o.active === code, isB = blocked.indexOf(code) >= 0;
      p.push();
      glow(p, isA);
      p.stroke(isA ? pal.accent : pal.motorEdge); p.strokeWeight(isA ? 3 : 1.5);
      if (isB) { dash(p, [5, 4]); p.fill(pal.white); }
      else if (isA) p.fill(pal.motor);
      else p.fill(pal.metal);
      p.rect(mx - mw / 2, fy - mh, mw, mh, 4);
      dash(p, []); noGlow(p);
      if (isB) {
        p.stroke(pal.incorrect); p.strokeWeight(3);
        p.line(mx - mw * 0.3, fy - mh * 0.85, mx + mw * 0.3, fy - mh * 0.15);
        p.line(mx - mw * 0.3, fy - mh * 0.15, mx + mw * 0.3, fy - mh * 0.85);
      }
      if (o.labels !== false) {
        p.noStroke(); p.fill(pal.text); p.textStyle(p.BOLD); p.textSize(16); p.textAlign(p.CENTER, p.TOP);
        p.text(code, mx, fy + 4);
      }
      p.pop();
    });
    p.stroke(pal.floor); p.strokeWeight(2);
    p.line(o.x - s, fy, o.x + s, fy);
    p.pop();
  }

  // ------------------------------------------------------------------ ducts
  /**
   * Duct cross-section in a box (ch01 drawDuctFigure). Options: x, y, w, h (box),
   * shape 'rect' | 'round' | 'unknown', wIn, hIn (rect, inches), dIn (round),
   * maxIn (inches that fill the box; omit to fit the duct), flowLabel, caption
   * (default 'duct cross-section'; false hides), highlight.
   */
  function ductSection(p, o) {
    p = P(p);
    var pal = palette(), cx = o.x + o.w / 2, boxTop = o.y + 8, boxH = o.h - 72;
    var cy = boxTop + boxH / 2, box = Math.min(o.w - 60, boxH);
    p.push();
    glow(p, o.highlight);
    if (o.shape === 'unknown') {
      dash(p, [6, 4]); p.stroke(pal.air); p.strokeWeight(2); p.fill(pal.drawBg);
      p.rect(cx - box * 0.4, cy - box * 0.4, box * 0.8, box * 0.8);
      dash(p, []); noGlow(p);
      p.noStroke(); p.fill(pal.air); p.textAlign(p.CENTER, p.CENTER); p.textSize(18);
      p.text('A = ?', cx, cy);
    } else {
      var maxIn = o.maxIn || (o.shape === 'round' ? o.dIn : Math.max(o.wIn, o.hIn));
      var ppi = box / maxIn;
      p.stroke(o.highlight ? pal.accent : pal.edge); p.strokeWeight(2); p.fill(pal.metal);
      p.textSize(14);
      if (o.shape === 'round') {
        var r = o.dIn * ppi / 2;
        p.circle(cx, cy, 2 * r);
        noGlow(p);
        p.stroke(pal.text); p.strokeWeight(1); p.line(cx - r, cy, cx + r, cy);
        p.noStroke(); p.fill(pal.text); p.textAlign(p.CENTER, p.BOTTOM);
        p.text('D = ' + o.dIn + ' in', cx, r > 40 ? cy - 3 : cy - r - 3);
      } else {
        var rw = o.wIn * ppi, rh = o.hIn * ppi;
        p.rect(cx - rw / 2, cy - rh / 2, rw, rh);
        noGlow(p);
        p.noStroke(); p.fill(pal.text); p.textAlign(p.CENTER, p.TOP);
        p.text(o.wIn + ' in', cx, cy + rh / 2 + 2);
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(o.hIn + ' in', cx - rw / 2 - 4, cy);
      }
    }
    p.noStroke(); p.fill(pal.text); p.textAlign(p.CENTER, p.TOP);
    if (o.flowLabel) { p.textSize(16); p.text(o.flowLabel, cx, o.y + o.h - 40); }
    if (o.caption !== false) { p.fill(pal.muted); p.textSize(14); p.text(o.caption || 'duct cross-section', cx, o.y + o.h - 20); }
    p.pop();
  }

  var RUN_TYPES = ['hood', 'louver', 'filter', 'coil', 'damper', 'duct', 'elbow', 'fan', 'diffuser', 'stack', 'room'];

  function drawRunSymbol(p, c, x, y, w, h, pal, t) {
    var cx = x + w / 2, cy = y + h / 2;
    p.stroke(pal.edge); p.strokeWeight(1.5);
    switch (c.type) {
      case 'hood':
        p.fill(pal.metal);
        poly(p, [[x, y - h * 0.35], [x + w * 0.7, y], [x + w * 0.7, y + h], [x, y + h * 1.35]], true);
        break;
      case 'louver':
        for (var i = 1; i < 5; i++) { var ly = y + h * i / 5; p.line(x + w * 0.25, ly - h * 0.12, x + w * 0.75, ly + h * 0.06); }
        break;
      case 'filter':
        p.noFill(); p.strokeWeight(1.5);
        var zz = [];
        for (var j = 0; j <= 8; j++) zz.push([cx + (j % 2 ? 7 : -7), y + h * j / 8]);
        poly(p, zz, false);
        break;
      case 'coil':
        p.noFill();
        for (var r = 0; r < 3; r++) for (var q = 0; q < 2; q++) p.circle(cx - 6 + q * 12, y + h * (r + 0.5) / 3, Math.min(9, h / 4));
        break;
      case 'damper':
        p.strokeWeight(2.5);
        for (var d = 1; d < 4; d++) { var dy = y + h * d / 4; p.line(cx - 8, dy - 6, cx + 8, dy + 6); }
        break;
      case 'fan':
        var rr = Math.min(w, h) * 0.42;
        p.fill(pal.metal); p.circle(cx, cy, rr * 2);
        var spin = (t || 0) * 3;
        p.stroke(pal.hub);
        for (var k = 0; k < 6; k++) { var a = spin + k * TWO_PI / 6; p.line(cx, cy, cx + rr * 0.85 * Math.cos(a), cy + rr * 0.85 * Math.sin(a)); }
        p.fill(pal.hub); p.circle(cx, cy, rr * 0.4);
        break;
      case 'diffuser':
        p.fill(pal.metal);
        poly(p, [[x, y], [x + w * 0.6, y - h * 0.3], [x + w * 0.6, y + h * 1.3], [x, y + h]], true);
        break;
      case 'room':
        dash(p, [5, 4]); p.noFill(); p.stroke(pal.muted);
        p.rect(x + 4, y - h * 0.6, w - 8, h * 2.2, 4);
        dash(p, []);
        break;
      case 'elbow':
        p.noFill(); p.strokeWeight(2);
        poly(p, arcPoints(x + w * 0.2, y + h, h * 0.75, -HALF_PI, HALF_PI), false);
        poly(p, arcPoints(x + w * 0.2, y + h, h * 0.35, -HALF_PI, HALF_PI), false);
        break;
      case 'stack':
        p.fill(pal.metal);
        p.rect(x + w * 0.3, y - h * 1.2, w * 0.4, h * 2.2);
        break;
      default: break;
    }
  }

  /**
   * Schematic duct system drawn left to right as equal segments joined by a duct,
   * with airflow arrows. Options: x, y, w, h (duct height; labels go below),
   * components: [{type, label, value}] where type is one of FD.RUN_TYPES
   * ('hood', 'louver', 'filter', 'coil', 'damper', 'duct', 'elbow', 'fan', 'diffuser', 'stack', 'room'),
   * label (default true), highlight (index of a component), t (animates air and the fan),
   * flowLabel (text above the first arrow). Returns the segment rectangles [{x, y, w, h}].
   */
  function ductRun(p, o) {
    p = P(p);
    var pal = palette(), comps = o.components || [], n = Math.max(1, comps.length);
    var segW = o.w / n, h = o.h, y = o.y;
    var rects = [];
    p.push();
    // duct body (the pipe the components sit in)
    p.stroke(pal.edge); p.strokeWeight(2); p.fill(pal.drawBg);
    var firstX = o.x + (comps[0] && comps[0].type === 'hood' ? segW * 0.7 : 0);
    var lastX = o.x + o.w - (comps[n - 1] && /diffuser|room|stack/.test(comps[n - 1].type) ? segW * 0.6 : 0);
    p.rect(firstX, y, lastX - firstX, h);
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i], sx = o.x + i * segW;
      rects.push({ x: sx, y: y, w: segW, h: h });
      p.push();
      if (o.highlight === i) {
        glow(p, true);
        p.stroke(pal.accent); p.strokeWeight(3); p.noFill();
        p.rect(sx + 2, y - 6, segW - 4, h + 12, 6);
        noGlow(p);
      }
      if (c.type === 'room' || c.type === 'stack') {
        drawRunSymbol(p, c, sx, y, segW, h, pal, o.t);
      } else {
        drawRunSymbol(p, c, sx + (c.type === 'hood' || c.type === 'diffuser' ? 0 : segW * 0.2), y,
          c.type === 'hood' || c.type === 'diffuser' ? segW : segW * 0.6, h, pal, o.t);
      }
      p.pop();
      if (o.label !== false && (c.label || c.value)) {
        p.push();
        p.noStroke(); p.fill(pal.text); p.textAlign(p.CENTER, p.TOP); p.textSize(opt(o, 'textSize', 13));
        if (c.label) p.text(c.label, sx + segW / 2, y + h + (c.type === 'hood' || c.type === 'diffuser' ? h * 0.4 : 0) + 8);
        if (c.value) { p.fill(pal.primary); p.textStyle(p.BOLD); p.text(c.value, sx + segW / 2, y + h + (c.type === 'hood' || c.type === 'diffuser' ? h * 0.4 : 0) + 26); }
        p.pop();
      }
    }
    p.pop();
    // air arrows along the centreline between components
    for (var j = 0; j < comps.length - 1; j++) {
      var ax = o.x + (j + 1) * segW;
      airflowArrow(p, { x1: ax - segW * 0.18, y1: y + h / 2, x2: ax + segW * 0.18, y2: y + h / 2, head: 9, weight: 2.5, t: o.t,
        label: j === 0 ? o.flowLabel : null });
    }
    return rects;
  }

  // ------------------------------------------------------------------ axial fan
  /**
   * Side view (cut-away) of a tubeaxial / vaneaxial fan. Options: x, y (top-left),
   * w, h, flow 'right' (default) | 'left', blades (count shown, default 2 per side),
   * vanes (straightening vanes downstream, default false), drive 'direct' (motor in
   * the tube, default) | 'belt' (motor outside on top with a belt tube) | 'none',
   * t (seconds: blades flicker as they turn and air animates), labels, highlight
   * ('blades' | 'motor' | 'vanes' | 'tube').
   */
  function axialFan(p, o) {
    p = P(p);
    var pal = palette(), x = o.x, y = o.y, w = o.w, h = o.h, right = o.flow !== 'left';
    var wall = Math.max(6, h * 0.07), cy = y + h / 2;
    var hubX = x + w * (right ? 0.38 : 0.62), hubR = h * 0.17;
    var hl = o.highlight;
    function X(fr) { return right ? x + w * fr : x + w * (1 - fr); }
    p.push();
    // tube walls (cut-away: only top and bottom walls drawn) with flanges
    glow(p, hl === 'tube');
    p.stroke(hl === 'tube' ? pal.accent : pal.edge); p.strokeWeight(hl === 'tube' ? 3 : 1.5); p.fill(pal.metal);
    p.rect(x, y, w, wall); p.rect(x, y + h - wall, w, wall);
    p.fill(pal.metalSide);
    p.rect(x - 4, y - 6, 8, wall + 12); p.rect(x + w - 4, y - 6, 8, wall + 12);
    p.rect(x - 4, y + h - wall - 6, 8, wall + 12); p.rect(x + w - 4, y + h - wall - 6, 8, wall + 12);
    noGlow(p);
    p.noStroke(); p.fill(pal.drawBg); p.rect(x, y + wall, w, h - 2 * wall);
    // motor and hub
    var drive = o.drive || 'direct';
    if (drive === 'direct') {
      glow(p, hl === 'motor');
      p.stroke(hl === 'motor' ? pal.accent : pal.motorEdge); p.strokeWeight(hl === 'motor' ? 3 : 1.5); p.fill(pal.motor);
      var mx0 = right ? hubX + hubR * 0.6 : hubX - hubR * 0.6 - w * 0.22;
      p.rect(mx0, cy - hubR * 0.9, w * 0.22, hubR * 1.8, 5);
      noGlow(p);
      p.stroke(pal.edge); p.strokeWeight(2);
      p.line(mx0 + w * 0.08, cy + hubR * 0.9, mx0 + w * 0.08, y + h - wall);         // motor support
    }
    p.stroke(pal.hub); p.strokeWeight(1.5); p.fill(pal.metalDark);
    p.ellipse(hubX, cy, hubR * 1.1, hubR * 2);
    // blades: two per side, alternating shade as they turn
    var phase = o.t !== undefined ? Math.floor(o.t * 8) % 2 : 0, tipR = (h / 2) - wall - 3;
    var dirx = right ? 1 : -1;
    glow(p, hl === 'blades');
    p.stroke(hl === 'blades' ? pal.accent : pal.hub); p.strokeWeight(hl === 'blades' ? 2.5 : 1.2);
    [-1, 1].forEach(function (side) {
      for (var b = 0; b < opt(o, 'blades', 2); b++) {
        var lean = (b + phase) % 2 ? 0.55 : 1;
        p.fill((b + phase) % 2 ? pal.metalDark : pal.metalSide);
        var r0 = hubR * 0.9, off = (b - 0.5) * hubR * 0.35;
        poly(p, [[hubX - dirx * hubR * 0.35 * lean + off, cy + side * r0], [hubX + dirx * hubR * 0.35 * lean + off, cy + side * r0],
          [hubX + dirx * hubR * 0.6 * lean + off, cy + side * tipR], [hubX - dirx * hubR * 0.2 * lean + off, cy + side * tipR]], true);
      }
    });
    noGlow(p);
    // straightening vanes
    if (o.vanes) {
      glow(p, hl === 'vanes');
      p.stroke(hl === 'vanes' ? pal.accent : pal.edge); p.strokeWeight(hl === 'vanes' ? 3.5 : 2.5);
      var vx = X(0.8);
      p.line(vx, y + wall, vx + dirx * 6, cy - hubR * 0.6);
      p.line(vx, y + h - wall, vx + dirx * 6, cy + hubR * 0.6);
      p.fill(pal.metalSide); p.strokeWeight(1);
      p.ellipse(vx + dirx * 4, cy, hubR * 0.9, hubR * 1.3);
      noGlow(p);
    }
    if (drive === 'belt') {
      glow(p, hl === 'motor');
      p.stroke(hl === 'motor' ? pal.accent : pal.motorEdge); p.strokeWeight(hl === 'motor' ? 3 : 1.5); p.fill(pal.motor);
      p.rect(hubX - w * 0.12, y - h * 0.42, w * 0.24, h * 0.3, 5);
      noGlow(p);
      p.stroke(pal.edge); p.strokeWeight(1.5); p.fill(pal.metalSide);
      p.rect(hubX - 7, y - h * 0.12, 14, h * 0.5 - hubR * 0.3);                        // belt tube
    }
    p.pop();
    // air arrows through the fan
    var ya = [cy - h * 0.3, cy + h * 0.3];
    ya.forEach(function (yy) {
      airflowArrow(p, { x1: right ? x - w * 0.12 : x + w * 1.12, y1: yy, x2: right ? x + w * 0.18 : x + w * 0.82, y2: yy, t: o.t });
      airflowArrow(p, { x1: right ? x + w * 0.9 : x + w * 0.1, y1: yy, x2: right ? x + w * 1.14 : x - w * 0.14, y2: yy, t: o.t });
    });
    if (o.labels) {
      var bnd = { x0: x - w * 0.15, x1: x + w * 1.15 };
      leaderLabel(p, { text: 'Tube (cut away)', ax: X(0.12), ay: y + wall / 2, lx: X(0.12), ly: y - (o.vanes ? 48 : 22), bounds: bnd });
      leaderLabel(p, { text: 'Blade', ax: hubX, ay: cy - tipR * 0.7, lx: X(0.2), ly: cy - h * 0.18, bounds: bnd });
      if (drive === 'direct') leaderLabel(p, { text: 'Motor', ax: X(0.5), ay: cy, lx: X(0.62), ly: y + h + 22, bounds: bnd });
      if (o.vanes) leaderLabel(p, { text: 'Straightening vanes', ax: X(0.8), ay: y + wall + 8, lx: X(0.82), ly: y - 22, bounds: bnd });
    }
  }

  // ------------------------------------------------------------------ sheave pair
  /**
   * End view of a belt drive: motor sheave and fan sheave drawn to the same scale,
   * joined by an open belt, each turning at its own speed (same belt speed).
   * Options: x, y, w, h (box), motorIn, fanIn (pitch diameters, inches), motorRpm,
   * t (seconds; omit for a still drawing), slow (display slow-down factor, default 60),
   * maxIn (inches for the box height; default max(motorIn, fanIn) * 1.15),
   * labels (diameters and speeds under each sheave, default true), highlight ('motor' | 'fan').
   * Returns {fanRpm, motorCenter, fanCenter, scale}.
   */
  function sheavePair(p, o) {
    p = P(p);
    var pal = palette(), mIn = o.motorIn, fIn = o.fanIn;
    var maxIn = o.maxIn || Math.max(mIn, fIn) * 1.15;
    var lblH = o.labels === false ? 0 : 44;
    var sc = Math.min((o.h - lblH) / maxIn, o.w / (mIn + fIn + Math.max(mIn, fIn) * 0.9));
    var rm = mIn * sc / 2, rf = fIn * sc / 2, cy = o.y + (o.h - lblH) / 2;
    var gap = Math.max(rm, rf) * 0.9;
    var total = 2 * rm + gap + 2 * rf;
    var mx = o.x + (o.w - total) / 2 + rm, fx = mx + rm + gap + rf;
    var fanRpm = o.motorRpm != null ? o.motorRpm * mIn / fIn : null;
    var ang = sheaveAngles(o.t, o.motorRpm || 0, mIn, fIn, o.slow);
    var tg = beltTangents(mx, cy, rm + 3, fx, cy, rf + 3);
    p.push();
    // belt
    p.stroke(pal.belt); p.strokeWeight(5); p.noFill();
    p.line(tg.upper[0][0], tg.upper[0][1], tg.upper[1][0], tg.upper[1][1]);
    p.line(tg.lower[0][0], tg.lower[0][1], tg.lower[1][0], tg.lower[1][1]);
    poly(p, arcPoints(mx, cy, rm + 3, tg.angles.lower, TWO_PI - (tg.angles.lower - tg.angles.upper)), false);
    poly(p, arcPoints(fx, cy, rf + 3, tg.angles.upper, tg.angles.lower - tg.angles.upper), false);
    // sheaves
    [[mx, rm, ang.motor, 'motor'], [fx, rf, ang.fan, 'fan']].forEach(function (s) {
      var isH = o.highlight === s[3];
      glow(p, isH);
      p.stroke(isH ? pal.accent : pal.sheaveEdge); p.strokeWeight(isH ? 3 : 1.5); p.fill(pal.sheave);
      p.circle(s[0], cy, s[1] * 2);
      noGlow(p);
      p.noFill(); p.stroke(pal.sheaveEdge); p.strokeWeight(1); p.circle(s[0], cy, s[1] * 1.55);
      p.stroke(pal.white); p.strokeWeight(Math.max(2, s[1] * 0.12));
      for (var k = 0; k < 3; k++) {
        var a = s[2] + k * TWO_PI / 3;
        p.line(s[0] + s[1] * 0.2 * Math.cos(a), cy + s[1] * 0.2 * Math.sin(a), s[0] + s[1] * 0.72 * Math.cos(a), cy + s[1] * 0.72 * Math.sin(a));
      }
      p.noStroke(); p.fill(pal.hub); p.circle(s[0], cy, Math.max(6, s[1] * 0.28));
      p.fill(pal.accent); p.circle(s[0] + s[1] * 0.85 * Math.cos(s[2]), cy + s[1] * 0.85 * Math.sin(s[2]), Math.max(5, s[1] * 0.14));
    });
    if (o.labels !== false) {
      p.noStroke(); p.fill(pal.text); p.textAlign(p.CENTER, p.TOP); p.textSize(14);
      var ly = cy + Math.max(rm, rf) + 8;
      var long = p.textWidth('Motor sheave ' + mIn + ' in') < (fx - mx) - 12;
      p.text((long ? 'Motor sheave ' : 'Motor ') + mIn + ' in', mx, ly);
      p.text((long ? 'Fan sheave ' : 'Fan ') + fIn + ' in', fx, ly);
      if (o.motorRpm != null) {
        p.fill(pal.muted);
        p.text(Math.round(o.motorRpm).toLocaleString('en-US') + ' RPM', mx, ly + 18);
        p.text(Math.round(fanRpm).toLocaleString('en-US') + ' RPM', fx, ly + 18);
      }
    }
    p.pop();
    return { fanRpm: fanRpm, motorCenter: [mx, cy], fanCenter: [fx, cy], scale: sc };
  }

  // ------------------------------------------------------------------ spring isolator
  /**
   * Coil spring isolator between a base plate and a load plate. Options: x (centre),
   * y (floor line, the bottom of the base plate), w (coil width), freeH (free height of
   * the coil in px), h (current coil height; default freeH), deflection (px; alternative
   * to h: h = freeH - deflection), coils (6), label (text above the load plate),
   * showDeflection (dimension marks the free height and the deflection), highlight.
   * Returns {top} (screen y of the load plate top).
   */
  function spring(p, o) {
    p = P(p);
    var pal = palette(), w = opt(o, 'w', 40), freeH = opt(o, 'freeH', 80);
    var h = o.h != null ? o.h : freeH - opt(o, 'deflection', 0);
    var coils = opt(o, 'coils', 6), plateH = 8, x = o.x, base = o.y - plateH;
    var top = base - h;
    p.push();
    // base and load plates
    p.stroke(pal.edge); p.strokeWeight(1.5); p.fill(pal.steel);
    p.rect(x - w * 0.75, base, w * 1.5, plateH, 2);
    p.rect(x - w * 0.75, top - plateH, w * 1.5, plateH, 2);
    // coil: zigzag front strands over back strands
    var n = coils * 2, pts = [];
    for (var i = 0; i <= n; i++) pts.push([x + (i % 2 ? w / 2 : -w / 2), base - h * i / n]);
    glow(p, o.highlight);
    p.noFill(); p.stroke(o.highlight ? pal.accent : pal.hub); p.strokeWeight(o.highlight ? 4 : 3);
    poly(p, pts, false);
    noGlow(p);
    if (o.showDeflection && h < freeH) {
      var fx = x + w * 0.95, freeTop = base - freeH;
      p.stroke(pal.muted); p.strokeWeight(1); dash(p, [3, 3]);
      p.line(x - w * 0.75, freeTop - plateH, x + w * 1.1, freeTop - plateH);
      dash(p, []);
      p.stroke(pal.primary); p.strokeWeight(2);
      p.line(fx, freeTop - plateH, fx, top - plateH);
      arrowHead(p, fx, top - plateH, HALF_PI, 7, pal.primary);
      p.noStroke(); p.fill(pal.primary); p.textSize(13); p.textAlign(p.LEFT, p.CENTER);
      p.text('δ', fx + 5, (freeTop + top) / 2 - plateH);
    }
    if (o.label) {
      p.noStroke(); p.fill(pal.text); p.textSize(opt(o, 'textSize', 14)); p.textAlign(p.CENTER, p.BOTTOM);
      p.text(o.label, x, top - plateH - 4);
    }
    p.pop();
    return { top: top - plateH };
  }

  // ------------------------------------------------------------------ export
  var api = {
    __version: '1.0.0',
    SIDE: SIDE, RUN_TYPES: RUN_TYPES, ARRANGEMENT_CODES: Object.keys(ARR),
    palette: palette, refreshPalette: refreshPalette, FALLBACK: FALLBACK, TOKENS: TOKENS,
    frame: frame, frameAt: frameAt,
    geom: { outletVector: outletVector, scrollGeometry: scrollGeometry, arcPoints: arcPoints,
      beltTangents: beltTangents, sheaveAngles: sheaveAngles },
    arrowHead: arrowHead, airflowArrow: airflowArrow, rotationArc: rotationArc, leaderLabel: leaderLabel,
    floor: floor, housingSide: housingSide, impellerSide: impellerSide, shaft: shaft, motorShaft: motorShaft,
    bearing: bearing, pedestal: pedestal, motor: motor, base: base, slideBase: slideBase, sheave: sheave,
    belts: belts, coupling: coupling, inletBox: inletBox, housingBracket: housingBracket, inletBracket: inletBracket,
    arrangement: arrangement, ARRANGEMENT_LABELS: ARR_LABELS,
    scrollHousing: scrollHousing, angleDial: angleDial, inletBoxEnd: inletBoxEnd, motorPositions: motorPositions,
    ductSection: ductSection, ductRun: ductRun, axialFan: axialFan, sheavePair: sheavePair, spring: spring
  };
  Object.keys(api).forEach(function (k) { FD[k] = api[k]; });
  Object.freeze(FD.geom); Object.freeze(FD.FALLBACK); Object.freeze(FD.TOKENS);
  FP.drawings = FD;
  if (typeof module === 'object' && module.exports) module.exports = FD;
})(typeof window !== 'undefined' ? window : globalThis);
