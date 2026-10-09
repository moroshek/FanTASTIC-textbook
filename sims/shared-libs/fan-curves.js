/* FanPedia MicroSim kit: fan-curves.js (FP.curves)  v1.1.0
 *
 * Illustrative fan curves and the math around them: linear interpolation,
 * the system curve P = kQ^2, the operating-point solver, parallel and series
 * combinations, and fan-law mapping of a whole curve.
 *
 * DATA ARE ILLUSTRATIVE. Curve A and Curve B are the chapter-10 tables
 * (docs/chapters/10-fan-performance-curves-and-ratings/index.md, "Fan Curve
 * Explorer" spec), copied exactly from ch10-fan-curve-explorer.js L15-31 and
 * ch25-fan-law-calculator.js L21-25. They are NOT Twin City Fan published
 * ratings. Every chart that draws them must say "Illustrative".
 *
 * Library-agnostic and pure: works in p5, Chart.js, Plotly and DOM sims, and
 * under Node (`require`) for tests. Never defines bare globals.
 */
(function (root) {
  'use strict';
  var FP = root.FP = root.FP || {};
  if (FP.curves && FP.curves.__version) {
    if (typeof module === 'object' && module.exports) module.exports = FP.curves;
    return; // loaded twice: keep the first copy
  }

  function freezeCurve(c) {
    Object.freeze(c.q); Object.freeze(c.p); if (c.bhp) Object.freeze(c.bhp);
    return Object.freeze(c);
  }

  // ---- Illustrative data (exact copies of the ch10 / ch25 arrays) ----
  var CFM = [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000];

  var A = freezeCurve({
    id: 'A',
    name: 'Curve A (illustrative)',
    description: 'Illustrative backward inclined fan, one fixed speed, standard air',
    illustrative: true,
    rpm: 1380,                  // ch25: Curve A's rated speed
    stallBelow: 4000,           // peak pressure 4.9 in. wg at 4,000 CFM
    q: CFM.slice(),
    p: [4.6, 4.8, 4.9, 4.8, 4.5, 4.0, 3.2, 2.0, 0.4],
    bhp: [4.0, 5.0, 6.0, 7.0, 8.1, 9.0, 9.5, 9.4, 8.8]
  });

  var B = freezeCurve({
    id: 'B',
    name: 'Curve B (illustrative)',
    description: 'Illustrative forward curved fan, one fixed speed, standard air',
    illustrative: true,
    rpm: null,                  // the chapter states no speed for Curve B
    stallBelow: 8000,           // right-hand pressure peak at 8,000 CFM
    q: CFM.slice(),
    p: [2.2, 2.0, 1.9, 2.0, 2.05, 1.8, 1.5, 1.0, 0.4],
    bhp: [1.6, 2.0, 2.5, 3.1, 3.8, 4.5, 5.2, 5.8, 6.3]
  });

  // Curve A's rating point used throughout ch10 and ch25.
  var BASE_OP = Object.freeze({ q: 10000, p: 4.0, bhp: 9.0, eff: 70.0 });

  // ---- Interpolation ----
  // Straight-line interpolation in a table with ascending xs.
  // Outside the table: clamps to the end value (default) or, with
  // {extrapolate: true}, extends the first/last segment (ch25 parallel rule:
  // "beyond 16,000 CFM it is extended along the 14,000 to 16,000 segment").
  function interp(xs, ys, x, opts) {
    var n = xs.length;
    var extrapolate = !!(opts && opts.extrapolate);
    if (n === 0) return NaN;
    if (n === 1) return ys[0];
    if (x <= xs[0]) {
      if (!extrapolate || x === xs[0]) return ys[0];
      return ys[0] + (x - xs[0]) * (ys[1] - ys[0]) / (xs[1] - xs[0]);
    }
    if (x >= xs[n - 1]) {
      if (!extrapolate || x === xs[n - 1]) return ys[n - 1];
      return ys[n - 1] + (x - xs[n - 1]) * (ys[n - 1] - ys[n - 2]) / (xs[n - 1] - xs[n - 2]);
    }
    for (var i = 0; i < n - 1; i++) {
      if (x >= xs[i] && x <= xs[i + 1]) {
        var t = (x - xs[i]) / (xs[i + 1] - xs[i]);
        return ys[i] + t * (ys[i + 1] - ys[i]);
      }
    }
    return NaN; // only reachable with unsorted xs
  }

  function pressureAt(curve, q, opts) { return interp(curve.q, curve.p, q, opts); }
  function bhpAt(curve, q, opts) { return interp(curve.q, curve.bhp, q, opts); }
  function isStall(curve, q) { return q < curve.stallBelow; }

  // Fan static efficiency (%) from pressure, airflow and BHP:
  // eff = Q * P / (6356 * BHP). Returns NaN when bhp is 0.
  function staticEfficiency(q, p, bhp) {
    return bhp > 0 ? 100 * q * p / (6356 * bhp) : NaN;
  }

  // ---- System curve P = k Q^2 ----
  function kThrough(q, p) { return p / (q * q); }
  // Specs often write P = R (Q / qRef)^2 with R the resistance at qRef.
  function kFromR(R, qRef) { qRef = qRef || 10000; return R / (qRef * qRef); }
  function systemPressure(k, q) { return k * q * q; }
  function systemPoints(k, qs) {
    return qs.map(function (q) { return { q: q, p: systemPressure(k, q) }; });
  }

  // Accepts a curve object or a pressure function q -> p.
  function pressureFn(fan, opts) {
    if (typeof fan === 'function') return fan;
    return function (q) { return pressureAt(fan, q, opts); };
  }

  // ---- Operating point ----
  // The default upper end of the search. A curve object: its last airflow
  // (the table is not extended). A function: its own `qMax` (FP.curves.parallel
  // and series set it to the single-fan curve's last airflow x the fans in
  // parallel), else 16,000 CFM; then doubled while the fan still makes more
  // pressure than the system there, since the crossing lies further right
  // (capped at 2^21 CFM).
  function defaultQMax(fan, f, k) {
    if (typeof fan !== 'function') return fan.q[fan.q.length - 1];
    var q = typeof fan.qMax === 'number' && isFinite(fan.qMax) && fan.qMax > 0 ? fan.qMax : 16000;
    while (q < 2097152 && f(q) - systemPressure(k, q) > 0) q *= 2;
    return q;
  }

  // Searches q in `step` CFM increments from qMin to qMax and returns the q
  // where |fan pressure - system pressure| is smallest (the spec rule for
  // ch10-operating-point-finder and ch25-parallel-series: their anchors, e.g.
  // 12,300 CFM for the steep series pair, come from this 1 CFM search). Ties
  // keep the lower q.
  // When fan minus system changes sign within one step of that q, the exact
  // crossing is also found by bisection and returned as `exact: {q, p}`.
  // With opts.refine === true, q / p / pSystem / bhp / stall are taken at the
  // exact crossing instead (for a spec that states a closed form: P = 5.625
  // rounds to 5.63, where the whole-CFM point gives 5.62497 -> 5.62).
  // Returns {q, p, pSystem, diff, exact, bhp, stall}; bhp and stall only for
  // curve objects; exact is null when there is no sign change (no crossing).
  function operatingPoint(fan, k, opts) {
    opts = opts || {};
    var f = pressureFn(fan, opts.extrapolate ? { extrapolate: true } : null);
    var step = opts.step || 1;
    var qMin = opts.qMin != null ? opts.qMin : 0;
    var qMax = opts.qMax != null ? opts.qMax : defaultQMax(fan, f, k);
    var g = function (q) { return f(q) - systemPressure(k, q); };
    var best = null;
    for (var q = qMin; q <= qMax + 1e-9; q += step) {
      var d = Math.abs(g(q));
      if (best === null || d < best.diff) best = { q: q, diff: d };
    }
    var exact = crossing(g, best.q, step, qMin, qMax);
    var qOut = opts.refine === true && exact !== null ? exact : best.q;
    var out = { q: qOut, p: f(qOut), pSystem: systemPressure(k, qOut), diff: Math.abs(g(qOut)),
      exact: exact === null ? null : { q: exact, p: f(exact) } };
    if (typeof fan !== 'function') {
      if (fan.bhp) out.bhp = bhpAt(fan, qOut);
      out.stall = isStall(fan, qOut);
    }
    return out;
  }
  // Bisection on g within one step either side of q0; null without a sign change.
  function crossing(g, q0, step, qMin, qMax) {
    var g0 = g(q0);
    if (g0 === 0) return q0;
    var lo = null, hi = null;
    if (q0 + step <= qMax + 1e-9 && g0 * g(q0 + step) <= 0) { lo = q0; hi = q0 + step; }
    else if (q0 - step >= qMin - 1e-9 && g0 * g(q0 - step) <= 0) { lo = q0 - step; hi = q0; }
    if (lo === null) return null;
    var glo = g(lo);
    for (var i = 0; i < 80 && hi - lo > 1e-10 * Math.max(1, Math.abs(hi)); i++) {
      var mid = (lo + hi) / 2, gm = g(mid);
      if (gm === 0) return mid;
      if (glo * gm < 0) hi = mid; else { lo = mid; glo = gm; }
    }
    return (lo + hi) / 2;
  }

  // ---- Fans in parallel and in series (ch25 rules) ----
  // Parallel: pressure at total airflow Q equals single-fan pressure at Q / n.
  // Series: pressure at Q equals n x single-fan pressure at Q.
  // The single-fan curve is extended past its last point (ch25 rule).
  // The returned function carries `qMax`, its airflow extent, which
  // operatingPoint uses as the default search range.
  function curveQMax(curve) {
    if (typeof curve === 'function') return typeof curve.qMax === 'number' ? curve.qMax : 16000;
    return curve.q[curve.q.length - 1];
  }
  function parallel(curve, n) {
    n = n || 2;
    var f = pressureFn(curve, { extrapolate: true });
    var fn = function (q) { return f(q / n); };
    fn.qMax = curveQMax(curve) * n;      // operatingPoint's default search range
    return fn;
  }
  function series(curve, n) {
    n = n || 2;
    var f = pressureFn(curve, { extrapolate: true });
    var fn = function (q) { return n * f(q); };
    fn.qMax = curveQMax(curve);
    return fn;
  }

  // ---- Fan laws (ch25-fan-law-calculator.js L227-238) ----
  // ratios: {speed: N2/N1, diameter: D2/D1, density: rho2/rho1}; missing = 1.
  function fanLawFactors(r) {
    r = r || {};
    var s = r.speed != null ? r.speed : 1;
    var d = r.diameter != null ? r.diameter : 1;
    var rho = r.density != null ? r.density : 1;
    return {
      q: s * Math.pow(d, 3),
      p: Math.pow(s, 2) * Math.pow(d, 2) * rho,
      bhp: Math.pow(s, 3) * Math.pow(d, 5) * rho
    };
  }
  // Maps one point {q, p, bhp} through the fan laws.
  function mapPoint(pt, r) {
    var f = fanLawFactors(r);
    var out = { q: pt.q * f.q, p: pt.p * f.p };
    if (pt.bhp != null) out.bhp = pt.bhp * f.bhp;
    return out;
  }
  // Maps every point of a curve; returns a new (unfrozen) curve object that
  // keeps the illustrative flag and scales rpm and the stall boundary.
  function mapCurve(curve, r) {
    var f = fanLawFactors(r);
    var speed = r && r.speed != null ? r.speed : 1;
    return {
      id: curve.id,
      name: curve.name,
      illustrative: curve.illustrative,
      rpm: curve.rpm != null ? curve.rpm * speed : null,
      stallBelow: curve.stallBelow * f.q,
      q: curve.q.map(function (q) { return q * f.q; }),
      p: curve.p.map(function (p) { return p * f.p; }),
      bhp: curve.bhp ? curve.bhp.map(function (b) { return b * f.bhp; }) : undefined
    };
  }

  // Curve as [{q, p, bhp}] rows (handy for Chart.js {x, y} data).
  function points(curve, yKey) {
    yKey = yKey || 'p';
    return curve.q.map(function (q, i) { return { x: q, y: curve[yKey][i] }; });
  }

  FP.curves = {
    __version: '1.1.0',
    ILLUSTRATIVE_NOTE: 'Illustrative data, standard air, one fixed speed per fan',
    CFM: Object.freeze(CFM),
    A: A,
    B: B,
    BASE_OP: BASE_OP,
    interp: interp,
    pressureAt: pressureAt,
    bhpAt: bhpAt,
    isStall: isStall,
    staticEfficiency: staticEfficiency,
    kThrough: kThrough,
    kFromR: kFromR,
    systemPressure: systemPressure,
    systemPoints: systemPoints,
    operatingPoint: operatingPoint,
    parallel: parallel,
    series: series,
    fanLawFactors: fanLawFactors,
    mapPoint: mapPoint,
    mapCurve: mapCurve,
    points: points
  };

  if (typeof module === 'object' && module.exports) module.exports = FP.curves;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
