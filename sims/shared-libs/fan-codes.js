/* FanPedia MicroSim kit: fan-codes.js (FP.codes)  v1.0.0
 *
 * Code tables and pure rule functions for fan orientation and arrangement:
 * discharge positions and angles, inlet box positions, motor positions
 * (W/X/Y/Z, L/R, A-H) with their restrictions, and the arrangement list.
 *
 * Every table cites its source. All directions follow FanPedia's DRIVE-SIDE
 * convention (ch12, ch13): angles are degrees measured clockwise from straight
 * up as seen by an observer on the drive side, with straight up written 360.
 *
 * Pure data and functions: works in any sim library and under Node `require`.
 * Never defines bare globals. Loading the file twice keeps the first copy.
 */
(function (root) {
  'use strict';
  var FP = root.FP = root.FP || {};
  if (FP.codes && FP.codes.__version) {
    if (typeof module === 'object' && module.exports) module.exports = FP.codes;
    return;
  }

  function deepFreeze(o) {
    Object.freeze(o);
    Object.keys(o).forEach(function (k) {
      if (o[k] && typeof o[k] === 'object' && !Object.isFrozen(o[k])) deepFreeze(o[k]);
    });
    return o;
  }
  function norm360(a) { var x = ((a % 360) + 360) % 360; return x; }      // 0..359
  function as360(a) { var x = norm360(a); return x === 0 ? 360 : x; }      // 1..360 (top = 360)

  // ------------------------------------------------------------ discharge positions
  // Source: FanPedia PDF pp. 46-49 (SWSI and DWDI, "Rotation View From Drive Side"),
  // as tabulated in ch13-rotation-discharge-code-builder.js L16-26 and the ch12
  // discharge table (docs/chapters/12-discharge-positions-and-rotation/index.md).
  // `angle` is the discharge angle N: degrees from upblast IN THE DIRECTION OF ROTATION.
  var DISCHARGES = [
    { code: 'UBD', name: 'Upblast', angle: 360 },
    { code: 'TAU', name: 'Top Angular Up', angle: 45 },
    { code: 'THD', name: 'Top Horizontal', angle: 90 },
    { code: 'TAD', name: 'Top Angular Down', angle: 135 },
    { code: 'DBD', name: 'Downblast', angle: 180 },
    { code: 'BAD', name: 'Bottom Angular Down', angle: 225 },
    { code: 'BHD', name: 'Bottom Horizontal', angle: 270 },
    { code: 'BAU', name: 'Bottom Angular Up', angle: 315 }
  ];
  // DWDI fans are offered in seven discharges; BAD is not one (FanPedia pp. 48-49; ch13 Anchors).
  var NOT_OFFERED = { SWSI: [], DWDI: ['BAD'] };

  function dischargeByCode(code) {
    for (var i = 0; i < DISCHARGES.length; i++) if (DISCHARGES[i].code === code) return DISCHARGES[i];
    return null;
  }
  /** Discharge for an angle (45..360; 0 is read as 360). */
  function dischargeByAngle(angle) {
    var a = as360(angle);
    for (var i = 0; i < DISCHARGES.length; i++) if (DISCHARGES[i].angle === a) return DISCHARGES[i];
    return null;
  }
  /** Discharges offered for a fan type ('SWSI' | 'DWDI'). */
  function dischargesFor(fanType) {
    var ex = NOT_OFFERED[fanType] || [];
    return DISCHARGES.filter(function (d) { return ex.indexOf(d.code) < 0; });
  }
  function isDischargeOffered(fanType, code) { return (NOT_OFFERED[fanType] || []).indexOf(code) < 0; }

  /**
   * Direction the air leaves (theta), degrees clockwise from straight up, drive side,
   * 0..359. ch12 rule: theta = N for CW, 360 - N for CCW.
   */
  function airDirection(rotation, angle) {
    return rotation === 'CCW' ? norm360(360 - angle) : norm360(angle);
  }
  /**
   * Where the outlet sits on the housing, degrees clockwise from the top, drive side.
   * ch12 Rules: CW location = theta - 90; CCW location = theta + 90 (mod 360).
   * Example: CW upblast sits on the left of the housing top (270), CCW on the right (90).
   */
  function outletLocation(rotation, angle) {
    var th = airDirection(rotation, angle);
    return rotation === 'CCW' ? norm360(th + 90) : norm360(th - 90);
  }
  /** Mirror a drive-side direction for an inlet-side view (ch12 Rules): d -> (360 - d) mod 360. */
  function mirror(direction) { return norm360(360 - direction); }

  /** Unit vector {x, y} for a direction in screen coordinates (y down). */
  function directionVector(theta) {
    var a = theta * Math.PI / 180;
    var x = Math.sin(a), y = -Math.cos(a);
    return { x: Math.abs(x) < 1e-12 ? 0 : x, y: Math.abs(y) < 1e-12 ? 0 : y };
  }

  var WORDS = ['straight up', 'up and to the right', 'to the right', 'down and to the right',
    'straight down', 'down and to the left', 'to the left', 'up and to the left'];
  var SHORT = ['Straight up', 'Up and right', 'Right', 'Down and right',
    'Straight down', 'Down and left', 'Left', 'Up and left'];
  /** Words for a direction in 45-degree steps: 'up and to the right' (ch13 style) or, with short=true, 'Up and right' (ch12 table style). */
  function directionWords(theta, short) {
    var i = Math.round(norm360(theta) / 45) % 8;
    return (short ? SHORT : WORDS)[i];
  }

  /** "CW THD (CW 90)" style designation; returns null for an unknown code. */
  function designation(rotation, code) {
    var d = dischargeByCode(code);
    return d ? rotation + ' ' + d.code + ' (' + rotation + ' ' + d.angle + ')' : null;
  }
  /** FanPedia "also known as" form: "Clockwise 90°" / "Counterclockwise 135°". */
  function alsoKnownAs(rotation, angle) {
    return (rotation === 'CCW' ? 'Counterclockwise ' : 'Clockwise ') + as360(angle) + '°';
  }

  // ------------------------------------------------------------ inlet box positions
  // Source: FanPedia p. 144 ("Inlet Box Positions Determined From Drive Side"), as
  // tabulated in ch12 "Inlet Box Position Dial" and ch18 "Inlet Box Position Trainer".
  // The position is the dial angle of the box opening, clockwise from the top as seen
  // from the drive side; it does NOT change with rotation.
  var INLET_BOX_POSITIONS = [
    { position: 45, description: 'Angular Down Intake', location: 'Upper right' },
    { position: 90, description: 'Horizontal Right Intake', location: 'Right' },
    { position: 135, description: 'Angular Up Intake', location: 'Lower right' },
    { position: 180, description: 'Bottom Up Intake', location: 'Bottom' },
    { position: 225, description: 'Angular Up Intake', location: 'Lower left' },
    { position: 270, description: 'Horizontal Left Intake', location: 'Left' },
    { position: 315, description: 'Angular Down Intake', location: 'Upper left' },
    { position: 360, description: 'Top Down Intake', location: 'Top' }
  ];
  function inletBoxByPosition(p) {
    var a = as360(p);
    for (var i = 0; i < INLET_BOX_POSITIONS.length; i++) if (INLET_BOX_POSITIONS[i].position === a) return INLET_BOX_POSITIONS[i];
    return null;
  }
  /** Drive-side position from an angle read on an inlet-side view (ch18 Rules): 360 - p, 0 written 360. */
  function inletBoxFromInletSide(p) { return as360(360 - p); }

  // ------------------------------------------------------------ motor positions
  // AMCA W, X, Y, Z for SWSI Arrangements 1, 3 and 3F. Source: FanPedia p. 52
  // illustration (read facing the drive side: W and X on the right-hand side, Y and Z
  // on the left; W and Z beside the housing, X and Y beside the drive end) and ch12
  // "Motor Positions W X Y Z". On 3F the illustration shows Z and W, also known as L and R.
  var MOTOR_POSITIONS_WXYZ = [
    { code: 'W', side: 'right', beside: 'housing', aka3F: 'R' },
    { code: 'X', side: 'right', beside: 'drive end', aka3F: null },
    { code: 'Y', side: 'left', beside: 'drive end', aka3F: null },
    { code: 'Z', side: 'left', beside: 'housing', aka3F: 'L' }
  ];

  // Restrictions for SWSI Arrangements 1, 3 and 3F. Source: FanPedia PDF pp. 162-163
  // ("Motor Position restrictions based on Discharge"), restated in ch13 "Motor
  // Position Restrictions" and its rule card. verdict 'not-allowed' or 'height-check'.
  var MOTOR_RESTRICTIONS = [
    { discharge: 'BHD', rotation: 'CW', position: 'Z', verdict: 'not-allowed', reason: 'Motor interferes with outlet opening of housing.' },
    { discharge: 'BHD', rotation: 'CCW', position: 'W', verdict: 'not-allowed', reason: 'Motor interferes with outlet opening of housing.' },
    { discharge: 'TAD', rotation: 'CW', position: 'W', verdict: 'not-allowed', reason: 'Motor interferes with outlet opening of housing.' },
    { discharge: 'TAD', rotation: 'CCW', position: 'Z', verdict: 'not-allowed', reason: 'Motor interferes with outlet opening of housing.' },
    { discharge: 'THD', rotation: 'CW', position: 'W', verdict: 'height-check', reason: 'Height restriction: motor may not fit below the discharge. On Arrangement 1 the motor will fit if the pedestal is lengthened.' },
    { discharge: 'THD', rotation: 'CCW', position: 'Z', verdict: 'height-check', reason: 'Height restriction: motor may not fit below the discharge. On Arrangement 1 the motor will fit if the pedestal is lengthened.' }
  ];
  var RESTRICTED_ARRANGEMENTS = ['1', '3', '3F'];

  // Swingout pairings. Source: FanPedia PDF pp. 53, 166 (ch13 table; ch24 "Swingout Motor Position Rule").
  var SWINGOUT_9SS = { right: { rotation: 'CW', position: 'L' }, left: { rotation: 'CCW', position: 'R', conduitBox: 'F2' } };

  /**
   * ch13 checker: verdict for an SWSI 1/3/3F line (W/X/Y/Z) or a 9SS line (L/R).
   * line: {arrangement, rotation, discharge, position}.
   * Returns {verdict: 'allowed' | 'not-allowed' | 'height-check', reason}.
   */
  function checkMotorPosition(line) {
    var arr = String(line.arrangement);
    if (arr === '9SS') {
      var ok = (line.rotation === 'CW' && line.position === 'L') || (line.rotation === 'CCW' && line.position === 'R');
      return ok ? { verdict: 'allowed', reason: 'Arrangement 9SS is built CW with (L) or CCW with (R).' }
        : { verdict: 'not-allowed', reason: 'Arrangement 9SS is built CW with (L) or CCW with (R) only.' };
    }
    if (RESTRICTED_ARRANGEMENTS.indexOf(arr) >= 0) {
      for (var i = 0; i < MOTOR_RESTRICTIONS.length; i++) {
        var r = MOTOR_RESTRICTIONS[i];
        if (r.discharge === line.discharge && r.rotation === line.rotation && r.position === line.position) {
          return { verdict: r.verdict, reason: r.reason };
        }
      }
    }
    return { verdict: 'allowed', reason: 'No FanPedia motor position restriction applies.' };
  }

  // Motor position systems by arrangement. Source: FanPedia pp. 52-57, 165-166, as
  // tabulated in ch24 "Motor Positions for Arrangement Variants" and ch13's rule table.
  var MOTOR_POSITION_SYSTEMS = [
    { arrangement: '1', positions: ['W', 'X', 'Y', 'Z'], rule: 'Any of W, X, Y, Z; see restrictions', source: 'FanPedia pp. 52, 162' },
    { arrangement: '3', positions: ['W', 'X', 'Y', 'Z'], rule: 'Any of W, X, Y, Z; see restrictions', source: 'FanPedia pp. 52, 163' },
    { arrangement: '3F', positions: ['W', 'Z', 'X', 'Y'], standard: ['W', 'Z'], rule: 'W and Z standard; consult factory for X and Y', source: 'FanPedia pp. 52, 167' },
    { arrangement: '9', positions: ['L', 'R'], standard: { CW: 'L', CCW: 'R' }, rule: 'Standard CW (L) / CCW (R); (L) normally with F1, F2 if clearance issues', source: 'FanPedia p. 52' },
    { arrangement: '9F', positions: ['L', 'R'], standard: { CW: 'L', CCW: 'R' }, rule: 'Standard CW (L) / CCW (R)', source: 'FanPedia p. 52' },
    { arrangement: '9H', positions: ['L', 'R'], standard: { CW: 'L', CCW: 'R' }, rule: 'Typically left for CW, right for CCW', source: 'FanPedia p. 166' },
    { arrangement: '9SS', positions: ['L', 'R'], rule: 'Right swing: CW (L) only. Left swing: CCW (R) only, F2 conduit box required', source: 'FanPedia pp. 53, 166' },
    { arrangement: '9ST', positions: ['L', 'R'], standard: { right: 'R', left: 'L' }, rule: 'Right swing standard (R); left swing standard (L)', source: 'FanPedia p. 53' },
    { arrangement: '10', positions: [], rule: 'Motor position unique to pedestal design, no options', source: 'FanPedia p. 52' },
    { arrangement: '3SM', positions: ['L', 'R'], standard: 'R', rule: 'Standard (R); (L) with F1, F2 if tight', source: 'FanPedia p. 55' },
    { arrangement: '3HS', positions: ['S', 'O'], standard: 'S', aka: { S: 'R', O: 'L' }, rule: 'Standard (S)', source: 'FanPedia p. 55' },
    { arrangement: '3VS', positions: ['S', 'O'], standard: 'S', aka: { S: 'R', O: 'L' }, rule: 'Standard (S)', source: 'FanPedia p. 55' },
    { arrangement: '3HA', positions: ['TC'], standard: 'TC', rule: 'Top Center only', source: 'FanPedia p. 55' },
    { arrangement: '3VA', positions: ['TC'], standard: 'TC', rule: 'Top Center only', source: 'FanPedia p. 55' },
    { arrangement: '9 inline horizontal', positions: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], floorMount: ['G', 'H', 'A', 'B', 'C'], rule: 'Any of A-H; floor mount G, H, A, B, C only', source: 'FanPedia p. 56' },
    { arrangement: '9 inline vertical', positions: [], rule: 'No specified motor position: centered on curb cap or between brackets', source: 'FanPedia p. 57' }
  ];
  function motorSystem(arrangement) {
    for (var i = 0; i < MOTOR_POSITION_SYSTEMS.length; i++) if (MOTOR_POSITION_SYSTEMS[i].arrangement === String(arrangement)) return MOTOR_POSITION_SYSTEMS[i];
    return null;
  }

  // Inline (axial) motor positions A-H, discharge view, A at the top then around the
  // casing with E at the bottom (FanPedia p. 56). Angles clockwise from the top.
  var AXIAL_MOTOR_POSITIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(function (c, i) { return { code: c, angle: i * 45 }; });
  var AXIAL_FLOOR_MOUNT = ['G', 'H', 'A', 'B', 'C'];

  // K-mount clock positions by discharge, SWSI and DWDI Arrangement 3 (FanPedia p. 54; ch13 table).
  var K_MOUNT_CLOCK = { UBD: ['9', '3'], THD: ['9', '10:30', '12'], DBD: ['9', '10:30', '12', '1:30', '3'], BHD: ['12', '1:30', '3'] };

  /**
   * ch24 checker for pedestal, swingout, plenum and inline motor lines.
   * line: {arrangement, rotation?, position, swing? ('right'|'left'), conduitBox? ('F1'|'F2'),
   *        clearanceIssue?, mount? ('floor'|'ceiling'|'duct'), discharge?}.
   * Returns {verdict: 'standard' | 'condition' | 'not-allowed' | 'height-check', correction, reason}.
   * correction (only for not-allowed): 'L' | 'R' | 'F2' | 'TC' | 'none' | 'floor-positions' | 'other-position'.
   */
  function checkMotorLine(line) {
    var a = String(line.arrangement), pos = line.position, rot = line.rotation;
    var na = function (corr, why) { return { verdict: 'not-allowed', correction: corr, reason: why }; };
    var st = function (why) { return { verdict: 'standard', correction: null, reason: why }; };
    var cond = function (why) { return { verdict: 'condition', correction: null, reason: why }; };
    if (a === '10') return na('none', 'Arrangement 10 motor position is unique to the pedestal, no options.');
    if (a === '9SS') {
      var need = SWINGOUT_9SS[line.swing === 'left' ? 'left' : 'right'];
      if (rot && rot !== need.rotation) return na('swing', 'A ' + (line.swing || 'right') + ' swing 9SS is ' + need.rotation + ' only.');
      if (pos !== need.position) return na(need.position, 'A ' + (line.swing || 'right') + ' swing 9SS is ' + need.rotation + ' and (' + need.position + ') only.');
      if (need.conduitBox && line.conduitBox && line.conduitBox !== need.conduitBox) return na('F2', 'Left swing 9SS must have the F2 conduit box.');
      return st('Matches the 9SS swingout pairing.');
    }
    if (a === '9ST') {
      var s = line.swing === 'left' ? 'L' : 'R';
      return pos === s ? st('9ST ' + (line.swing || 'right') + ' swing standard is (' + s + ').')
        : cond('9ST ' + (line.swing || 'right') + ' swing standard is (' + s + '); confirm other positions with the factory.');
    }
    if (a === '9' || a === '9F' || a === '9H') {
      var stdPos = rot === 'CCW' ? 'R' : 'L';
      if (pos !== stdPos) return cond('Standard is CW (L) / CCW (R); treat other pairings as a special request.');
      if (pos === 'L' && line.conduitBox === 'F2') return cond('(L) is normally ordered with F1; select F2 if clearance issues.');
      return st(rot + ' (' + pos + ') is the standard' + (pos === 'L' ? '; (L) is normally ordered with F1.' : '.'));
    }
    if (a === '3SM') return pos === 'R' ? st('3SM standard motor position is (R).') : cond('3SM (L) is ordered with F1, F2 if tight.');
    if (a === '3HS' || a === '3VS') return pos === 'S' ? st(a + ' standard is (S).') : cond(a + ' optional position (O).');
    if (a === '3HA' || a === '3VA') return pos === 'TC' ? st(a + ' is Top Center only.') : na('TC', 'A top-mounted motor on an adjustable base has one position, Top Center.');
    if (a === '9 inline horizontal') {
      if (line.mount === 'floor' && AXIAL_FLOOR_MOUNT.indexOf(pos) < 0) return na('floor-positions', 'Floor supports block the lower positions; floor mount shows G, H, A, B, C.');
      return st('Position ' + pos + ' is available for this mounting.');
    }
    if (a === '9 inline vertical') return na('none', 'No specified motor position: the motor is centered on the curb cap or between brackets.');
    if (a === '3F' && (pos === 'X' || pos === 'Y')) return cond('3F: W and Z standard; consult factory for X and Y.');
    if (RESTRICTED_ARRANGEMENTS.indexOf(a) >= 0) {
      var r = checkMotorPosition(line);
      if (r.verdict === 'allowed') return st(r.reason);
      return { verdict: r.verdict, correction: r.verdict === 'not-allowed' ? 'other-position' : null, reason: r.reason };
    }
    return cond('No FanPedia rule is tabulated for this arrangement; confirm with the factory.');
  }

  // ------------------------------------------------------------ arrangements
  // Source: ch11-arrangement-identifier.js L27-59 (AMCA arrangements as drawn in
  // FanPedia pp. 20-23 and the technical descriptions pp. 162-168; Arrangement 2 is
  // from the AMCA standard and is not shown in FanPedia) and the ch11 chapter anchors
  // (FanPedia p. 30: 1, 8, 9, 10 and 4 overhung; 3 and 7 center hung).
  var DRIVE_OPTS = ['Belt', 'Direct with coupling', 'Direct on motor shaft'];
  var IMPELLER_OPTS = ['Overhung', 'Center hung'];
  var BEARING_OPTS = ['Pedestal', 'Fan housing (at least one bearing)', 'Independent pedestals outside inlet boxes', 'Motor only'];
  var ARRANGEMENTS = [
    { code: '1', drive: 'Belt', impeller: 'Overhung', bearings: 'Pedestal', inFanPedia: true, source: 'FanPedia pp. 20, 162',
      summary: 'Overhung impeller, two bearings on a pedestal, motor on its own base.' },
    { code: '2', drive: 'Belt', impeller: 'Overhung', bearings: 'Fan housing (at least one bearing)', inFanPedia: false, source: 'AMCA standard (not shown in FanPedia)',
      summary: 'Overhung impeller, bearings in a bracket on the housing.' },
    { code: '3', drive: 'Belt', impeller: 'Center hung', bearings: 'Fan housing (at least one bearing)', inFanPedia: true, source: 'FanPedia pp. 20, 163',
      summary: 'Center hung impeller, bearings carried by the housing, separate motor.' },
    { code: '3SI', drive: 'Direct with coupling', impeller: 'Center hung', bearings: 'Independent pedestals outside inlet boxes', inFanPedia: true, source: 'FanPedia p. 164',
      summary: 'SWSI with attached inlet box, bearings on independent pedestals.' },
    { code: '3DI', drive: 'Direct with coupling', impeller: 'Center hung', bearings: 'Independent pedestals outside inlet boxes', inFanPedia: true, source: 'FanPedia p. 167',
      summary: 'DWDI with integrated inlet boxes and independent bearing pedestals.' },
    { code: '4', drive: 'Direct on motor shaft', impeller: 'Overhung', bearings: 'Motor only', inFanPedia: true, source: 'FanPedia pp. 20, 164',
      summary: 'Impeller on the motor shaft; the only bearings are in the motor.' },
    { code: '7', drive: 'Direct with coupling', impeller: 'Center hung', bearings: 'Fan housing (at least one bearing)', inFanPedia: true, source: 'FanPedia pp. 21, 168',
      summary: 'Arrangement 3 with a pedestal for motor, coupling and one bearing.' },
    { code: '8', drive: 'Direct with coupling', impeller: 'Overhung', bearings: 'Pedestal', inFanPedia: true, source: 'FanPedia p. 165',
      summary: 'Arrangement 1 pedestal extended to carry a coupled motor.' },
    { code: '9', drive: 'Belt', impeller: 'Overhung', bearings: 'Pedestal', inFanPedia: true, source: 'FanPedia p. 165',
      summary: 'Arrangement 1 with the motor on the side of the bearing pedestal.' },
    { code: '10', drive: 'Belt', impeller: 'Overhung', bearings: 'Pedestal', inFanPedia: true, source: 'FanPedia p. 167',
      summary: 'Arrangement 1 with the motor inside the bearing pedestal.' }
  ];
  function arrangementByCode(code) {
    for (var i = 0; i < ARRANGEMENTS.length; i++) if (ARRANGEMENTS[i].code === String(code)) return ARRANGEMENTS[i];
    return null;
  }

  var codes = {
    __version: '1.0.0',
    DISCHARGES: DISCHARGES, NOT_OFFERED: NOT_OFFERED,
    dischargeByCode: dischargeByCode, dischargeByAngle: dischargeByAngle,
    dischargesFor: dischargesFor, isDischargeOffered: isDischargeOffered,
    airDirection: airDirection, outletLocation: outletLocation, mirror: mirror,
    directionVector: directionVector, directionWords: directionWords,
    designation: designation, alsoKnownAs: alsoKnownAs,
    INLET_BOX_POSITIONS: INLET_BOX_POSITIONS, inletBoxByPosition: inletBoxByPosition,
    inletBoxFromInletSide: inletBoxFromInletSide,
    MOTOR_POSITIONS_WXYZ: MOTOR_POSITIONS_WXYZ, MOTOR_RESTRICTIONS: MOTOR_RESTRICTIONS,
    RESTRICTED_ARRANGEMENTS: RESTRICTED_ARRANGEMENTS, SWINGOUT_9SS: SWINGOUT_9SS,
    checkMotorPosition: checkMotorPosition, MOTOR_POSITION_SYSTEMS: MOTOR_POSITION_SYSTEMS,
    motorSystem: motorSystem, AXIAL_MOTOR_POSITIONS: AXIAL_MOTOR_POSITIONS,
    AXIAL_FLOOR_MOUNT: AXIAL_FLOOR_MOUNT, K_MOUNT_CLOCK: K_MOUNT_CLOCK, checkMotorLine: checkMotorLine,
    DRIVE_OPTS: DRIVE_OPTS, IMPELLER_OPTS: IMPELLER_OPTS, BEARING_OPTS: BEARING_OPTS,
    ARRANGEMENTS: ARRANGEMENTS, ARRANGEMENT_CODES: ARRANGEMENTS.map(function (a) { return a.code; }),
    arrangementByCode: arrangementByCode
  };
  FP.codes = deepFreeze(codes);
  if (typeof module === 'object' && module.exports) module.exports = FP.codes;
})(typeof window !== 'undefined' ? window : globalThis);
