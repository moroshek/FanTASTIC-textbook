/* FanPedia MicroSim kit: fan-models.js (FP.models)  v1.0.0
 *
 * Pure engineering models shared by the FanPedia MicroSims. Every function is
 * side-effect free, takes plain numbers (units are in the name or the comment)
 * and returns plain numbers or plain objects. Nothing here rounds unless the
 * function name says so: sims round for display with FP.fmt (core) or
 * FP.models.round, and judge answers against the UNROUNDED model.
 *
 * Every model is pinned by tests/shared-libs/fan-models.test.js to the numbers
 * in the chapter specs ("Chapter Anchors" and worked examples in
 * docs/chapters/<nn>-.../index.md). If a spec number and a model disagree, do
 * not "fix" the model to match; flag it to the author (review §5).
 *
 * Works in the browser (plain <script>, attaches to window.FP.models) and under
 * Node `require` (module.exports). Never defines bare globals. Loading the file
 * twice keeps the first copy.
 */
(function (root) {
  'use strict';
  var FP = root.FP = root.FP || {};
  if (FP.models && FP.models.__version) {
    if (typeof module === 'object' && module.exports) module.exports = FP.models;
    return;
  }

  // ---------------------------------------------------------------- helpers

  /** Round x to d decimals (half away from zero, robust to 1.005-style float error).
   *  Negative d rounds to tens, hundreds, ...: round(1799.9999, -1) -> 1800 exactly. */
  function round(x, d) {
    d = d || 0;
    var y, r;
    if (d < 0) {
      // Multiply back by an integer power of ten so the result is exact
      // (dividing by 0.1 leaves 1799.9999999999998).
      var p = Math.pow(10, -d);
      y = Math.abs(x) / p;
      r = Math.round(y + 1e-9 * Math.max(1, y)) * p;
    } else {
      var m = Math.pow(10, d);
      y = Math.abs(x) * m;
      r = Math.round(y + 1e-9 * Math.max(1, y)) / m;
    }
    return x < 0 ? -r : r;
  }

  // ------------------------------------------------- air density (ch01, ch02, ch10)
  // Standard air: 0.075 lb/ft^3 at 70 °F and 29.92 in. Hg (sea level).
  // Temperature factor  Kt = 530 / (T + 460)                  (T in °F)
  // Altitude factor     Ka = (1 - 6.8754e-6 * h) ^ 5.2559      (h in ft)
  // Density ratio       DR = Kt * Ka = (530 / (T + 460)) * (Pb / 29.92)
  // Sources: ch01 "Air Density Ratio Explorer" Rules (coefficient 6.8754e-6),
  // ch02 "Density Ratio" equation, ch10 "Density Correction Calculator" Rules
  // (which print the coefficient as 6.875e-6; the difference is < 0.0001 in Ka
  // below 10,000 ft and never changes a 3-decimal value in the specs).

  var STD_DENSITY_LBFT3 = 0.075;
  var STD_BARO_INHG = 29.92;
  var STD_TEMP_RANKINE = 530;          // 70 °F + 460
  var ALT_COEF_PER_FT = 6.8754e-6;
  var ALT_EXPONENT = 5.2559;

  /** Temperature correction factor Kt = 530 / (tempF + 460). Dimensionless. */
  function temperatureFactor(tempF) {
    return STD_TEMP_RANKINE / (tempF + 460);
  }

  /** Altitude correction factor Ka = Pb/29.92 from the standard atmosphere. altitudeFt in feet. */
  function altitudeFactor(altitudeFt, opts) {
    var c = (opts && opts.coef) || ALT_COEF_PER_FT;
    return Math.pow(1 - c * (altitudeFt || 0), ALT_EXPONENT);
  }

  /** Standard-atmosphere barometric pressure in in. Hg at altitudeFt. */
  function barometerInHg(altitudeFt, opts) {
    return STD_BARO_INHG * altitudeFactor(altitudeFt, opts);
  }

  /**
   * Density ratio DR = actual density / 0.075 lb/ft^3.
   * densityRatio(tempF, altitudeFt[, {baroInHg, coef}]): pass opts.baroInHg to use
   * a measured barometer instead of the altitude formula.
   */
  function densityRatio(tempF, altitudeFt, opts) {
    var pr = (opts && opts.baroInHg != null) ? opts.baroInHg / STD_BARO_INHG
      : altitudeFactor(altitudeFt || 0, opts);
    return temperatureFactor(tempF) * pr;
  }

  /** Actual air density in lb/ft^3. */
  function densityLbFt3(tempF, altitudeFt, opts) {
    return STD_DENSITY_LBFT3 * densityRatio(tempF, altitudeFt, opts);
  }

  /** Catalog (standard-air) value to SELECT at: required actual value / DR (pressure in in. wg). */
  function catalogFromActual(actualValue, dr) { return actualValue / dr; }

  /** Actual value at the job from a catalog (standard-air) value: catalog value * DR (pressure or BHP). */
  function actualFromCatalog(catalogValue, dr) { return catalogValue * dr; }

  // ------------------------------------------------------- fan laws (ch15, ch25)
  // Q2/Q1 = (N2/N1)(D2/D1)^3; P2/P1 = (N2/N1)^2 (D2/D1)^2 (rho2/rho1);
  // BHP2/BHP1 = (N2/N1)^3 (D2/D1)^5 (rho2/rho1). Source: ch25 "Fan Laws".

  /** Multipliers {q, p, bhp} for a speed ratio, size (diameter) ratio and density ratio (each default 1). */
  function fanLawRatios(speedRatio, sizeRatio, densRatio) {
    var n = speedRatio == null ? 1 : speedRatio;
    var d = sizeRatio == null ? 1 : sizeRatio;
    var r = densRatio == null ? 1 : densRatio;
    return {
      q: n * Math.pow(d, 3),
      p: n * n * d * d * r,
      bhp: n * n * n * Math.pow(d, 5) * r
    };
  }

  /**
   * Apply the fan laws to a base point.
   * base: {cfm, inWg, bhp, rpm?}; change: {speedRatio, sizeRatio, densityRatio}.
   * Returns {cfm, inWg, bhp, rpm (null if base.rpm unknown), ratios}.
   */
  function fanLaws(base, change) {
    var c = change || {};
    var k = fanLawRatios(c.speedRatio, c.sizeRatio, c.densityRatio);
    var n = c.speedRatio == null ? 1 : c.speedRatio;
    return {
      cfm: base.cfm * k.q,
      inWg: base.inWg * k.p,
      bhp: base.bhp * k.bhp,
      rpm: base.rpm == null ? null : base.rpm * n,
      ratios: k
    };
  }

  /** New fan speed (RPM) for a new airflow on the same system (airflow goes with speed). */
  function speedForAirflow(baseRpm, baseCfm, newCfm) { return baseRpm * newCfm / baseCfm; }

  /** Synchronous motor speed in RPM: 120 * hz / poles. */
  function syncSpeedRpm(hz, poles) { return 120 * hz / poles; }

  /**
   * VFD turndown with the fan laws (ch15): speed ratio = hz / baseHz.
   * o: {baseCfm, baseInWg, baseBhp, hz, baseHz=60, poles=4}.
   * Returns {ratio, syncRpm, cfm, inWg, bhp}.
   */
  function vfd(o) {
    var baseHz = o.baseHz || 60;
    var r = o.hz / baseHz;
    return {
      ratio: r,
      syncRpm: syncSpeedRpm(o.hz, o.poles || 4),
      cfm: o.baseCfm * r,
      inWg: o.baseInWg * r * r,
      bhp: o.baseBhp * r * r * r
    };
  }

  /** System resistance relation: pressure at q2Cfm on a system needing p1 at q1Cfm (P ~ Q^2, ch02). */
  function systemPressure(p1, q1Cfm, q2Cfm) { var x = q2Cfm / q1Cfm; return p1 * x * x; }

  // ---------------------------------------------------------- belt drive (ch03, ch11)
  // N_fan = N_motor * D_motor / D_fan; belt speed V = pi * D_motor * N_motor / 12 (ft/min);
  // design hp = motor hp * drive service factor; belts = ceil(design hp / hp per belt).

  /** Fan shaft speed in RPM from motor RPM and the two sheave pitch diameters (in). */
  function fanRpm(motorRpm, motorSheaveIn, fanSheaveIn) { return motorRpm * motorSheaveIn / fanSheaveIn; }

  /** Fan sheave pitch diameter (in) needed for a target fan RPM. */
  function fanSheaveFor(motorRpm, motorSheaveIn, targetFanRpm) { return motorSheaveIn * motorRpm / targetFanRpm; }

  /** Belt speed in ft/min: pi * motor sheave pitch diameter (in) * motor RPM / 12. */
  function beltSpeedFpm(motorSheaveIn, motorRpm) { return Math.PI * motorSheaveIn * motorRpm / 12; }

  /** Belts required: ceiling(design hp / hp per belt); an exact whole quotient is not rounded up. */
  function beltsRequired(designHp, hpPerBelt) {
    var q = designHp / hpPerBelt;
    var qr = Math.round(q);
    return Math.abs(q - qr) < 1e-9 ? qr : Math.ceil(q);
  }

  /**
   * Whole belt drive. o: {motorRpm, motorSheaveIn, fanSheaveIn, motorHp?, driveSF?, hpPerBelt?}.
   * Returns {fanRpm, diameterRatio (motor/fan), speedRatio (motor rpm / fan rpm),
   *          beltSpeedFpm, designHp, beltsExact, belts, label}.
   * label: 'fan slower than motor' | 'fan same as motor' | 'fan faster than motor' (ch03 Rules).
   */
  function beltDrive(o) {
    var nf = fanRpm(o.motorRpm, o.motorSheaveIn, o.fanSheaveIn);
    var ratio = o.motorSheaveIn / o.fanSheaveIn;
    var out = {
      fanRpm: nf,
      diameterRatio: ratio,
      speedRatio: o.motorRpm / nf,
      beltSpeedFpm: beltSpeedFpm(o.motorSheaveIn, o.motorRpm),
      designHp: null, beltsExact: null, belts: null,
      label: Math.abs(ratio - 1) < 1e-9 ? 'fan same as motor'
        : (ratio < 1 ? 'fan slower than motor' : 'fan faster than motor')
    };
    if (o.motorHp != null) {
      out.designHp = o.motorHp * (o.driveSF == null ? 1 : o.driveSF);
      if (o.hpPerBelt) {
        out.beltsExact = out.designHp / o.hpPerBelt;
        out.belts = beltsRequired(out.designHp, o.hpPerBelt);
      }
    }
    return out;
  }

  // -------------------------------------------------------- bearing life (ch03, ch17)
  // Years = rated hours / (hours/day * days/week * weeks/year); L-50 = 5 * L-10.
  // ch03 (FanPedia p. 90) counts 52 weeks; ch17 (FanPedia p. 89) counts 365/7.

  var WEEKS_52 = 52;
  var WEEKS_CALENDAR = 365 / 7;

  /** Operating hours per year. opts.weeksPerYear defaults to 52 (ch03); ch17 passes FP.models.WEEKS_CALENDAR. */
  function annualHours(hoursPerDay, daysPerWeek, opts) {
    var w = (opts && opts.weeksPerYear) || WEEKS_52;
    return hoursPerDay * daysPerWeek * w;
  }

  /** L-50 hours from L-10 hours (FanPedia: L-50 = 5 x L-10). */
  function l50FromL10(l10Hours) { return 5 * l10Hours; }

  /** Calendar life in years for a rated life in hours and a schedule (h/day, days/week). */
  function bearingLifeYears(ratedHours, hoursPerDay, daysPerWeek, opts) {
    return ratedHours / annualHours(hoursPerDay, daysPerWeek, opts);
  }

  // --------------------------------------------- air power and BHP (ch02, ch10, ch25)
  // Air power (hp) = Q (CFM) * P (in. wg) / 6356; BHP = air power / efficiency.

  var HP_CONST = 6356;

  /** Air power in hp from airflow (CFM) and pressure (in. wg; FSP for static, FTP for total). */
  function airPowerHp(cfm, inWg) { return cfm * inWg / HP_CONST; }

  /** Brake horsepower from CFM, in. wg and efficiency as a FRACTION (0.70, not 70). */
  function brakeHp(cfm, inWg, efficiency) { return airPowerHp(cfm, inWg) / efficiency; }

  /** Efficiency as a FRACTION from CFM, in. wg and BHP. */
  function efficiency(cfm, inWg, bhp) { return airPowerHp(cfm, inWg) / bhp; }

  /** Convenience: {airHp, bhp} for cfm, inWg and efficiency fraction (review §4 name). */
  function airPowerBhp(cfm, inWg, eff) {
    return { airHp: airPowerHp(cfm, inWg), bhp: brakeHp(cfm, inWg, eff) };
  }

  // ------------------------------------------------------- ducts (ch01, ch02)
  /** Rectangular duct area in ft^2 from inside dimensions in inches: W*H/144. */
  function ductAreaRectFt2(widthIn, heightIn) { return widthIn * heightIn / 144; }
  /** Round duct area in ft^2 from diameter in inches: pi*D^2/576. */
  function ductAreaRoundFt2(diameterIn) { return Math.PI * diameterIn * diameterIn / 576; }
  /** Area in ft^2 for {shape:'rect', w, h} or {shape:'round', d} (inches). */
  function ductArea(duct) {
    return duct.shape === 'round' ? ductAreaRoundFt2(duct.d) : ductAreaRectFt2(duct.w, duct.h);
  }
  /** Velocity in ft/min: V = Q / A. */
  function ductVelocityFpm(cfm, areaFt2) { return cfm / areaFt2; }
  /** Airflow in CFM: Q = V * A. */
  function ductFlowCfm(fpm, areaFt2) { return fpm * areaFt2; }
  /** Velocity pressure in in. wg for standard air: (V / 4005)^2. */
  function velocityPressureInWg(fpm) { var x = fpm / 4005; return x * x; }
  /** Velocity in ft/min from velocity pressure (in. wg, standard air). */
  function velocityFromVpFpm(vpInWg) { return 4005 * Math.sqrt(vpInWg); }

  // ------------------------------------------------- lab exhaust (ch05, ch06)
  /**
   * Lab exhaust bookkeeping. o: {contaminatedCfm, bypassCfm, entrainedCfm, hoodPpm?}.
   * fanCfm = contaminated + bypass; totalCfm = fan + entrained;
   * sharePct = 100 * contaminated / total (null when total is 0);
   * plumePpm = hoodPpm * contaminated / total (null without hoodPpm or total 0).
   */
  function labExhaustMix(o) {
    var fan = (o.contaminatedCfm || 0) + (o.bypassCfm || 0);
    var total = fan + (o.entrainedCfm || 0);
    var share = total > 0 ? 100 * (o.contaminatedCfm || 0) / total : null;
    return {
      fanCfm: fan,
      totalCfm: total,
      sharePct: share,
      plumePpm: (o.hoodPpm != null && total > 0) ? o.hoodPpm * (o.contaminatedCfm || 0) / total : null
    };
  }

  // --------------------------------------- vibration isolation (ch22, ch23)
  // f = rpm/60; f_n = 3.13/sqrt(delta) (delta in inches); r = f/f_n; T = 1/|r^2 - 1|.

  var FN_CONST = 3.13;                                  // chapter value
  var G_IN_S2 = 386.1;

  /** Forcing (running) frequency in Hz from RPM. */
  function forcingFrequencyHz(rpm) { return rpm / 60; }

  /**
   * Natural frequency in Hz of a mass on isolators with static deflection deflectionIn.
   * Default uses the chapters' rounded 3.13/sqrt(delta); opts.exact uses (1/2pi)sqrt(386.1/delta).
   */
  function naturalFrequencyHz(deflectionIn, opts) {
    if (opts && opts.exact) return Math.sqrt(G_IN_S2 / deflectionIn) / (2 * Math.PI);
    return FN_CONST / Math.sqrt(deflectionIn);
  }

  /** Frequency ratio r = f / f_n. */
  function frequencyRatio(forcingHz, naturalHz) { return forcingHz / naturalHz; }

  /** Undamped transmissibility T = 1/|r^2 - 1| (Infinity at r = 1). */
  function transmissibility(r) {
    var d = Math.abs(r * r - 1);
    return d === 0 ? Infinity : 1 / d;
  }

  /** Percent isolation (1 - T) * 100, or null when T >= 1 (no isolation; amplified). */
  function percentIsolation(T) { return T < 1 ? (1 - T) * 100 : null; }

  /**
   * Isolation status for a frequency ratio: 'resonance' when |r - 1| <= resonanceTol
   * (ch22 uses 0.05, ch23 uses 0.02; default 0.02), 'isolating' when r > sqrt(2),
   * else 'amplifying'. ch23 uses 1.41 as the threshold: pass opts.threshold = 1.41.
   */
  function isolationStatus(r, opts) {
    var tol = (opts && opts.resonanceTol != null) ? opts.resonanceTol : 0.02;
    var th = (opts && opts.threshold) || Math.SQRT2;
    if (Math.abs(r - 1) <= tol) return 'resonance';
    return r > th ? 'isolating' : 'amplifying';
  }

  /** Static deflection per isolator in inches: (totalLb / count) / rateLbPerIn. */
  function springDeflectionIn(totalLb, count, rateLbPerIn) { return (totalLb / count) / rateLbPerIn; }

  /**
   * Full isolator calculation. o: {rpm, deflectionIn} or {rpm, totalLb, count, rateLbPerIn}.
   * Returns {loadPerIsolatorLb, deflectionIn, fnHz, fHz, r, T, isolationPct, status}.
   */
  function isolator(o, opts) {
    var load = o.totalLb != null ? o.totalLb / o.count : null;
    var defl = o.deflectionIn != null ? o.deflectionIn : springDeflectionIn(o.totalLb, o.count, o.rateLbPerIn);
    var fn = naturalFrequencyHz(defl, opts);
    var f = forcingFrequencyHz(o.rpm);
    var r = frequencyRatio(f, fn);
    var T = transmissibility(r);
    return { loadPerIsolatorLb: load, deflectionIn: defl, fnHz: fn, fHz: f, r: r, T: T,
      isolationPct: percentIsolation(T), status: isolationStatus(r, opts) };
  }

  // ------------------------------------------------ sound (ch25, ch27)
  // Octave-band A-weighting corrections (IEC 61672, as printed in ch27).
  var OCTAVE_BANDS_HZ = [63, 125, 250, 500, 1000, 2000, 4000, 8000];
  var A_WEIGHTING_DB = [-26.2, -16.1, -8.6, -3.2, 0, 1.2, 1.0, -1.1];

  /** Logarithmic sum in dB: 10*log10(sum 10^(L/10)). */
  function logSumDb(levels) {
    var s = 0;
    for (var i = 0; i < levels.length; i++) s += Math.pow(10, levels[i] / 10);
    return 10 * Math.log10(s);
  }

  /**
   * A-weight eight octave-band sound power levels (dB, bands 63..8,000 Hz).
   * Returns {weighted[8], lwa, unweighted, maxIndex, maxBandHz}; ties in the
   * largest weighted band go to the lower frequency (ch27 Rules).
   */
  function aWeighting(bandsDb) {
    var w = [];
    var maxI = 0;
    for (var i = 0; i < OCTAVE_BANDS_HZ.length; i++) {
      w.push(bandsDb[i] + A_WEIGHTING_DB[i]);
      if (w[i] > w[maxI] + 1e-12) maxI = i;
    }
    return { weighted: w, lwa: logSumDb(w), unweighted: logSumDb(bandsDb.slice(0, 8)),
      maxIndex: maxI, maxBandHz: OCTAVE_BANDS_HZ[maxI] };
  }

  var models = {
    __version: '1.0.0',
    round: round,
    // constants
    STD_DENSITY_LBFT3: STD_DENSITY_LBFT3, STD_BARO_INHG: STD_BARO_INHG, ALT_COEF_PER_FT: ALT_COEF_PER_FT,
    ALT_EXPONENT: ALT_EXPONENT, HP_CONST: HP_CONST, WEEKS_52: WEEKS_52, WEEKS_CALENDAR: WEEKS_CALENDAR,
    FN_CONST: FN_CONST, OCTAVE_BANDS_HZ: OCTAVE_BANDS_HZ.slice(), A_WEIGHTING_DB: A_WEIGHTING_DB.slice(),
    // density
    temperatureFactor: temperatureFactor, altitudeFactor: altitudeFactor, barometerInHg: barometerInHg,
    densityRatio: densityRatio, densityLbFt3: densityLbFt3,
    catalogFromActual: catalogFromActual, actualFromCatalog: actualFromCatalog,
    // fan laws
    fanLawRatios: fanLawRatios, fanLaws: fanLaws, speedForAirflow: speedForAirflow,
    syncSpeedRpm: syncSpeedRpm, vfd: vfd, systemPressure: systemPressure,
    // belt drive
    fanRpm: fanRpm, fanSheaveFor: fanSheaveFor, beltSpeedFpm: beltSpeedFpm,
    beltsRequired: beltsRequired, beltDrive: beltDrive,
    // bearings
    annualHours: annualHours, l50FromL10: l50FromL10, bearingLifeYears: bearingLifeYears,
    // power
    airPowerHp: airPowerHp, brakeHp: brakeHp, efficiency: efficiency, airPowerBhp: airPowerBhp,
    // ducts
    ductAreaRectFt2: ductAreaRectFt2, ductAreaRoundFt2: ductAreaRoundFt2, ductArea: ductArea,
    ductVelocityFpm: ductVelocityFpm, ductFlowCfm: ductFlowCfm,
    velocityPressureInWg: velocityPressureInWg, velocityFromVpFpm: velocityFromVpFpm,
    // lab exhaust
    labExhaustMix: labExhaustMix,
    // isolation
    forcingFrequencyHz: forcingFrequencyHz, naturalFrequencyHz: naturalFrequencyHz,
    frequencyRatio: frequencyRatio, transmissibility: transmissibility,
    percentIsolation: percentIsolation, isolationStatus: isolationStatus,
    springDeflectionIn: springDeflectionIn, isolator: isolator,
    // sound
    logSumDb: logSumDb, aWeighting: aWeighting
  };
  Object.freeze(models.OCTAVE_BANDS_HZ);
  Object.freeze(models.A_WEIGHTING_DB);
  FP.models = Object.freeze(models);
  if (typeof module === 'object' && module.exports) module.exports = FP.models;
})(typeof window !== 'undefined' ? window : globalThis);
