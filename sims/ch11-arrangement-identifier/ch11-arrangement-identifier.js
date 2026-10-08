// Arrangement Identifier MicroSim
// CANVAS_HEIGHT: 710
// Use this CANVAS_HEIGHT for all the iframe heights that embed this MicroSim.
// The learner breaks a schematic side view of a centrifugal fan into three features
// (drive, impeller position, what carries the bearings), commits them, and then names
// the AMCA arrangement (1, 2, 3, 3SI, 3DI, 4, 7, 8, 9 or 10).
// Schematics are simplified teaching drawings, not manufacturer outline drawings.

// ---------- layout ----------
let canvasWidth = 760;
let drawHeight = 560;
let controlHeight = 150;
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let sliderLeftMargin = 160; // template name kept; this sim has no sliders
let defaultTextSize = 16;

// schematic box (screen coordinates) and local-to-screen transform
const LOCAL_W = 640;
const LOCAL_TOP = -40;
const LOCAL_BOTTOM = 255;
const SCHEM_TOP = 64;
const SCHEM_BOTTOM = 322;
let ox = 0, oy = 0, sc = 1;

// ---------- content ----------
const DRIVE_OPTS = ['Belt', 'Direct with coupling', 'Direct on motor shaft'];
const IMPELLER_OPTS = ['Overhung', 'Center hung'];
const BEARING_OPTS = ['Pedestal', 'Fan housing (at least one bearing)',
  'Independent pedestals outside inlet boxes', 'Motor only'];
const ARR_OPTS = ['1', '2', '3', '3SI', '3DI', '4', '7', '8', '9', '10'];

const START_PROMPT = 'How is this fan driven, where is the impeller, and what carries the bearings?';
const NOTE_TEXT = 'Schematics are simplified. Twin City Fan arrangement drawings: FanPedia pp. 20–23. ' +
  'Arrangement 2 is from the AMCA standard and is not shown in FanPedia.';

// One row per drawing, straight from the specification table.
const DRAWINGS = [
  { id: 1, drive: 'Belt', impeller: 'Overhung', bearings: 'Pedestal', arr: '1',
    why: 'Overhung on a pedestal with a separately mounted motor is Arrangement 1 (FanPedia pp. 20, 162).' },
  { id: 2, drive: 'Belt', impeller: 'Overhung', bearings: 'Fan housing (at least one bearing)', arr: '2',
    why: 'Overhung with bearings in a bracket on the housing is AMCA Arrangement 2.' },
  { id: 3, drive: 'Belt', impeller: 'Center hung', bearings: 'Fan housing (at least one bearing)', arr: '3',
    why: 'Center hung with bearings carried by the housing and a separate motor is Arrangement 3 (FanPedia pp. 20, 163).' },
  { id: 4, drive: 'Direct with coupling', impeller: 'Center hung', bearings: 'Independent pedestals outside inlet boxes', arr: '3SI',
    why: 'The attached inlet box puts the bearing outside the air on independent pedestals (FanPedia p. 164).' },
  { id: 5, drive: 'Direct with coupling', impeller: 'Center hung', bearings: 'Independent pedestals outside inlet boxes', arr: '3DI',
    why: 'Double width with integrated inlet boxes and independent bearing pedestals is Arrangement 3DI (FanPedia p. 167).' },
  { id: 6, drive: 'Direct on motor shaft', impeller: 'Overhung', bearings: 'Motor only', arr: '4',
    why: 'Impeller mounted to the motor shaft is Arrangement 4 (FanPedia pp. 20, 164).' },
  { id: 7, drive: 'Direct with coupling', impeller: 'Center hung', bearings: 'Fan housing (at least one bearing)', arr: '7',
    why: 'Center hung with a pedestal for motor, coupling and one bearing is Arrangement 7 (FanPedia pp. 21, 168).' },
  { id: 8, drive: 'Direct with coupling', impeller: 'Overhung', bearings: 'Pedestal', arr: '8',
    why: 'An Arrangement 1 pedestal extended for a coupled motor is Arrangement 8 (FanPedia p. 165).' },
  { id: 9, drive: 'Belt', impeller: 'Overhung', bearings: 'Pedestal', arr: '9',
    why: 'Overhung with the motor on the side of the bearing pedestal is Arrangement 9 (FanPedia p. 165).' },
  { id: 10, drive: 'Belt', impeller: 'Overhung', bearings: 'Pedestal', arr: '10',
    why: 'Overhung with the motor inside the bearing pedestal is Arrangement 10 (FanPedia p. 167).' }
];

// ---------- state ----------
let order = [];          // shuffled indices into DRAWINGS
let pos = 0;             // position in the round (0..9)
let phase = 'features';  // 'features' | 'arrangement' | 'checked' | 'results'
let featureResult = null;    // {answers:[d,i,b], correct:[bool,bool,bool]}
let arrangementResult = null; // {chosen, correct, message}
let featuresCorrect = 0;
let arrangementsCorrect = 0;
let roundLog = [];

// ---------- controls ----------
let driveSelect, impellerSelect, bearingSelect, arrRadio;
let checkFeaturesButton, checkArrButton, nextButton;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');

  driveSelect = makeSelect(DRIVE_OPTS);
  impellerSelect = makeSelect(IMPELLER_OPTS);
  bearingSelect = makeSelect(BEARING_OPTS);

  arrRadio = createRadio();
  arrRadio.parent(document.querySelector('main'));
  for (const a of ARR_OPTS) arrRadio.option(a, a);
  arrRadio.style('font-size', '16px');
  arrRadio.changed(updateButtonStates);
  for (const lab of arrRadio.elt.querySelectorAll('label')) {
    lab.style.padding = '1px 4px';
    lab.style.marginRight = '2px';
    lab.style.border = '2px solid transparent';
    lab.style.borderRadius = '5px';
  }

  checkFeaturesButton = createButton('Check Features');
  checkFeaturesButton.parent(document.querySelector('main'));
  checkFeaturesButton.mousePressed(checkFeatures);

  checkArrButton = createButton('Check Arrangement');
  checkArrButton.parent(document.querySelector('main'));
  checkArrButton.mousePressed(checkArrangement);

  nextButton = createButton('Next Drawing');
  nextButton.parent(document.querySelector('main'));
  nextButton.mousePressed(nextPressed);

  positionControls();
  startRound();

  describe('Arrangement Identifier. A schematic side view of a centrifugal fan is shown. ' +
    'Answer three feature questions (drive, impeller position, what carries the bearings), ' +
    'press Check Features, then choose the fan arrangement number and press Check Arrangement. ' +
    'Ten drawings per round with separate feature and arrangement scores.');
}

function makeSelect(opts) {
  const s = createSelect();
  s.parent(document.querySelector('main'));
  s.option('Choose...', '');
  for (const o of opts) s.option(o, o);
  s.selected('');
  s.disable('');
  s.style('font-size', '15px');
  s.changed(updateButtonStates);
  return s;
}

function positionControls() {
  const y0 = drawHeight + 8;
  driveSelect.position(62, y0);
  driveSelect.size(190);
  impellerSelect.position(345, y0);
  impellerSelect.size(140);

  bearingSelect.position(168, y0 + 35);
  bearingSelect.size(318);
  checkFeaturesButton.position(500, y0 + 35);

  arrRadio.position(118, y0 + 70);

  checkArrButton.position(10, y0 + 104);
  nextButton.position(170, y0 + 104);
}

// ---------- round flow ----------
function startRound() {
  order = shuffle([...Array(DRAWINGS.length).keys()]);
  pos = 0;
  featuresCorrect = 0;
  arrangementsCorrect = 0;
  roundLog = [];
  loadDrawing();
}

function current() {
  return DRAWINGS[order[pos]];
}

function loadDrawing() {
  phase = 'features';
  featureResult = null;
  arrangementResult = null;
  for (const s of [driveSelect, impellerSelect, bearingSelect]) {
    s.selected('');
    s.elt.style.outline = 'none';
  }
  for (const inp of arrRadio.elt.querySelectorAll('input')) inp.checked = false;
  setHighlights([]);
  nextButton.html(pos === DRAWINGS.length - 1 ? 'See Results' : 'Next Drawing');
  updateButtonStates();
}

function checkFeatures() {
  if (phase !== 'features') return;
  const d = current();
  const answers = [driveSelect.value(), impellerSelect.value(), bearingSelect.value()];
  if (answers.some(a => a === '')) return;
  const keys = [d.drive, d.impeller, d.bearings];
  const correct = answers.map((a, i) => a === keys[i]);
  featureResult = { answers, correct, keys };
  featuresCorrect += correct.filter(c => c).length;

  [driveSelect, impellerSelect, bearingSelect].forEach((s, i) => {
    s.elt.style.outline = correct[i] ? '3px solid seagreen' : '3px dashed firebrick';
  });

  // Highlight consistent arrangements only when every committed feature is right.
  if (correct.every(c => c)) {
    setHighlights(consistentArrangements(answers));
  } else {
    setHighlights([]);
  }
  phase = 'arrangement';
  updateButtonStates();
}

function consistentArrangements(answers) {
  return DRAWINGS.filter(r => r.drive === answers[0] && r.impeller === answers[1] &&
    r.bearings === answers[2]).map(r => r.arr);
}

function confusionMessage(d, chosen) {
  if (chosen === '4' && [4, 5, 7, 8].includes(d.id)) {
    return 'There is a coupling and a separate fan shaft, so this is not Arrangement 4.';
  }
  if (chosen === '7' && d.id === 8) {
    return 'The impeller is overhung, not between the bearings; a coupled overhung fan is Arrangement 8.';
  }
  if ((chosen === '1' && (d.id === 9 || d.id === 10)) || (chosen === '9' && d.id === 10)) {
    return 'Look at where the motor is mounted; Arrangements 1, 9 and 10 differ only in motor location.';
  }
  if (chosen === '1' && d.id === 2) {
    return 'The bearings are on a bracket carried by the housing, not on a pedestal.';
  }
  return '';
}

function checkArrangement() {
  if (phase !== 'arrangement') return;
  const chosen = arrRadio.value();
  if (!chosen) return;
  const d = current();
  const ok = chosen === d.arr;
  let message;
  if (ok) {
    arrangementsCorrect++;
    message = 'Correct: Arrangement ' + d.arr + '. ' + d.why;
  } else {
    message = 'This is Arrangement ' + d.arr + '. ' + d.why;
    const extra = confusionMessage(d, chosen);
    if (extra) message += ' ' + extra;
  }
  arrangementResult = { chosen, correct: ok, message };
  roundLog.push({ arr: d.arr, chosen, ok, feats: featureResult.correct.filter(c => c).length });
  phase = 'checked';
  updateButtonStates();
}

function nextPressed() {
  if (phase === 'results') {
    startRound();
    return;
  }
  if (phase !== 'checked') return;
  if (pos < DRAWINGS.length - 1) {
    pos++;
    loadDrawing();
  } else {
    phase = 'results';
    setHighlights([]);
    nextButton.html('New Round');
    updateButtonStates();
  }
}

// ---------- control state helpers ----------
function setEnabled(el, on) {
  if (on) el.removeAttribute('disabled');
  else el.attribute('disabled', '');
}

function updateButtonStates() {
  const featureOpen = phase === 'features';
  for (const s of [driveSelect, impellerSelect, bearingSelect]) setEnabled(s, featureOpen);
  const allAnswered = driveSelect.value() !== '' && impellerSelect.value() !== '' &&
    bearingSelect.value() !== '';
  setEnabled(checkFeaturesButton, featureOpen && allAnswered);

  const arrOpen = phase === 'arrangement';
  for (const inp of arrRadio.elt.querySelectorAll('input')) inp.disabled = !arrOpen;
  arrRadio.elt.style.opacity = (phase === 'features' || phase === 'results') ? '0.45' : '1';
  setEnabled(checkArrButton, arrOpen && arrRadio.value() !== '');
  setEnabled(nextButton, phase === 'checked' || phase === 'results');
}

function setHighlights(list) {
  for (const lab of arrRadio.elt.querySelectorAll('label')) {
    const v = lab.querySelector('input').value;
    const on = list.includes(v);
    lab.style.background = on ? 'gold' : 'transparent';
    lab.style.borderColor = on ? 'darkgoldenrod' : 'transparent';
    lab.style.fontWeight = on ? 'bold' : 'normal';
  }
}

// ---------- drawing ----------
function draw() {
  updateCanvasSize();

  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  // title
  noStroke();
  fill('black');
  textSize(24);
  textAlign(CENTER, TOP);
  text('Arrangement Identifier', canvasWidth / 2, 8);

  textSize(defaultTextSize);
  textAlign(CENTER, TOP);
  noStroke();
  fill('black');
  if (phase === 'results') {
    text('Round complete: 10 drawings', canvasWidth / 2, 40);
  } else {
    let prompt = START_PROMPT;
    if (phase === 'arrangement') prompt = 'Now choose the arrangement number and press Check Arrangement.';
    if (phase === 'checked') prompt = pos === DRAWINGS.length - 1 ?
      'Press See Results to finish the round.' : 'Press Next Drawing to continue.';
    text('Drawing ' + (pos + 1) + ' of 10: ' + prompt, 10, 40, canvasWidth - 20);
  }

  // schematic frame
  fill('white');
  stroke('silver');
  rect(10, SCHEM_TOP, canvasWidth - 20, SCHEM_BOTTOM - SCHEM_TOP, 8);

  if (phase === 'results') {
    drawResults();
  } else {
    computeTransform();
    drawSchematic(current().id);
    if (phase === 'checked') drawLabels(current().id);
  }

  // note
  noStroke();
  fill('dimgray');
  textSize(14);
  textAlign(CENTER, TOP);
  text(NOTE_TEXT, 20, SCHEM_BOTTOM + 5, canvasWidth - 40);

  drawPanels();
  drawControlLabels();
}

function drawControlLabels() {
  noStroke();
  fill('black');
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  const y0 = drawHeight + 8;
  text('Drive:', 10, y0 + 12);
  text('Impeller:', 273, y0 + 12);
  text('Bearings carried by:', 10, y0 + 47);
  text('Arrangement:', 10, y0 + 82);
  textSize(14);
  fill('dimgray');
  if (phase === 'arrangement' && featureResult && featureResult.correct.every(c => c)) {
    text('Gold = consistent with your features', 330, y0 + 116);
  } else if (phase === 'features') {
    text('Arrangement unlocks after Check Features', 330, y0 + 116);
  }
}

function computeTransform() {
  const availW = canvasWidth - 40;
  const availH = SCHEM_BOTTOM - SCHEM_TOP - 8;
  sc = min(availW / LOCAL_W, availH / (LOCAL_BOTTOM - LOCAL_TOP));
  ox = (canvasWidth - LOCAL_W * sc) / 2;
  oy = SCHEM_TOP + 4 - LOCAL_TOP * sc;
}

function X(x) { return ox + x * sc; }
function Y(y) { return oy + y * sc; }
function S(v) { return v * sc; }

function lrect(x0, y0, x1, y1, r) {
  if (r) rect(X(x0), Y(y0), S(x1 - x0), S(y1 - y0), S(r));
  else rect(X(x0), Y(y0), S(x1 - x0), S(y1 - y0));
}

function lline(x1, y1, x2, y2) {
  line(X(x1), Y(y1), X(x2), Y(y2));
}

// ---- parts (local units: shaft centerline y = 110, floor y = 230) ----
const SHAFT_Y = 110;
const FLOOR_Y = 230;

function floorLine() {
  stroke('dimgray');
  strokeWeight(2);
  lline(0, FLOOR_Y, LOCAL_W, FLOOR_Y);
  strokeWeight(1);
  for (let x = 5; x < LOCAL_W; x += 16) lline(x, FLOOR_Y, x - 8, FLOOR_Y + 8);
}

function housing(x0, x1, inletLeft, inletRight) {
  stroke('dimgray');
  strokeWeight(2);
  fill('gainsboro');
  rect(X(x0), Y(20), S(x1 - x0), S(195), S(28), S(28), 0, 0);
  fill('gray');
  lrect(x0 - 8, 215, x1 + 8, FLOOR_Y);
  // inlet openings with inlet cones
  noStroke();
  fill('white');
  if (inletLeft) lrect(x0 - 2, 72, x0 + 3, 148);
  if (inletRight) lrect(x1 - 3, 72, x1 + 2, 148);
  stroke('dimgray');
  strokeWeight(2);
  if (inletLeft) { lline(x0, 72, x0 - 12, 60); lline(x0, 148, x0 - 12, 160); }
  if (inletRight) { lline(x1, 72, x1 + 12, 60); lline(x1, 148, x1 + 12, 160); }
}

function impeller(i0, i1, doubleWidth) {
  stroke('darkorange');
  strokeWeight(2);
  noFill();
  lrect(i0, 45, i1, 175);
  for (let x = i0 + 6; x < i1; x += 7) lline(x, 50, x, 170);
  strokeWeight(4);
  stroke('chocolate');
  if (doubleWidth) lline((i0 + i1) / 2, 42, (i0 + i1) / 2, 178);
  else lline(i1, 42, i1, 178);
  // hub
  fill('chocolate');
  noStroke();
  const hx = doubleWidth ? (i0 + i1) / 2 : i1;
  lrect(hx - 7, SHAFT_Y - 12, hx + 7, SHAFT_Y + 12);
}

function shaft(xa, xb) {
  stroke('dimgray');
  strokeWeight(max(3, S(6)));
  lline(xa, SHAFT_Y, xb, SHAFT_Y);
  strokeWeight(1);
}

function bearing(x, withFoot) {
  stroke('black');
  strokeWeight(1);
  fill('darkslategray');
  lrect(x - 11, SHAFT_Y - 15, x + 11, SHAFT_Y + 14, 4);
  if (withFoot) lrect(x - 16, SHAFT_Y + 14, x + 16, 140);
  fill('white');
  noStroke();
  ellipse(X(x), Y(SHAFT_Y), S(7), S(7));
}

function pedestal(x0, x1, top) {
  stroke('saddlebrown');
  strokeWeight(2);
  fill('burlywood');
  lrect(x0, top, x1, FLOOR_Y);
  strokeWeight(1);
  lline(x0, top, x1, FLOOR_Y);
  lline(x1, top, x0, FLOOR_Y);
}

function motor(x0, x1, y0, y1) {
  stroke('darkgreen');
  strokeWeight(2);
  fill('mediumseagreen');
  lrect(x0, y0, x1, y1, 6);
  strokeWeight(1);
  for (let x = x0 + 10; x < x1 - 6; x += 9) lline(x, y0 + 4, x, y1 - 4);
}

function motorShaft(xa, xb, y) {
  stroke('dimgray');
  strokeWeight(max(2, S(5)));
  lline(xa, y, xb, y);
  strokeWeight(1);
}

function sheave(x, y, r) {
  stroke('black');
  strokeWeight(1);
  fill('dimgray');
  lrect(x - 5, y - r, x + 5, y + r, 2);
}

function belts(x, y1, y2) {
  stroke('black');
  strokeWeight(2);
  lline(x - 8, y1, x - 8, y2);
  lline(x + 8, y1, x + 8, y2);
  strokeWeight(1);
}

function coupling(x) {
  stroke('black');
  strokeWeight(1);
  fill('goldenrod');
  lrect(x, SHAFT_Y - 17, x + 7, SHAFT_Y + 17, 2);
  lrect(x + 10, SHAFT_Y - 17, x + 17, SHAFT_Y + 17, 2);
}

function arrow(x1, y1, x2, y2) {
  stroke('steelblue');
  fill('steelblue');
  strokeWeight(2);
  lline(x1, y1, x2, y2);
  const a = atan2(Y(y2) - Y(y1), X(x2) - X(x1));
  push();
  translate(X(x2), Y(y2));
  rotate(a);
  noStroke();
  triangle(0, 0, -9, -5, -9, 5);
  pop();
  strokeWeight(1);
}

function airLeft(x0) {
  arrow(x0 - 95, 82, x0 - 16, 92);
  arrow(x0 - 95, 138, x0 - 16, 128);
}

function airRight(x1) {
  arrow(x1 + 40, 70, x1 + 14, 88);
  arrow(x1 + 40, 150, x1 + 14, 132);
}

function inletBox(x0, x1) {
  // box with an open top; air enters from above
  stroke('dimgray');
  strokeWeight(2);
  fill('gainsboro');
  lrect(x0, 35, x1, 215);
  noStroke();
  fill('white');
  lrect(x0 + 8, 33, x1 - 8, 38);
  fill('gray');
  stroke('dimgray');
  lrect(x0 - 4, 215, x1 + 4, FLOOR_Y);
  const cx = (x0 + x1) / 2;
  arrow(cx - 12, -18, cx - 12, 30);
  arrow(cx + 12, -18, cx + 12, 30);
}

function housingBracket(xWall, xEnd) {
  // plate bolted to the housing side wall plus a diagonal brace, no floor support
  stroke('saddlebrown');
  strokeWeight(2);
  fill('burlywood');
  const dir = xEnd > xWall ? 1 : -1;
  const a = min(xWall, xEnd), b = max(xWall, xEnd);
  lrect(a, SHAFT_Y + 14, b, SHAFT_Y + 24);
  lline(xWall, 195, xEnd - dir * 8, SHAFT_Y + 24);
  fill('black');
  noStroke();
  ellipse(X(xWall + dir * 3), Y(SHAFT_Y + 19), S(4), S(4));
  ellipse(X(xWall + dir * 3), Y(190), S(4), S(4));
}

function inletBracket(xWall, xBar) {
  // bracket across the inlet: a bar held off the housing face, bearing at its middle
  stroke('saddlebrown');
  strokeWeight(3);
  lline(xBar, 38, xBar, 186);
  lline(xBar, 38, xWall, 38);
  lline(xBar, 186, xWall, 186);
  strokeWeight(1);
}

function drawSchematic(id) {
  floorLine();
  switch (id) {
    case 1: // Arrangement 1: pedestal, motor on own floor base, belts
      airLeft(120);
      pedestal(230, 360, 140);
      housing(120, 200, true, false);
      impeller(130, 188, false);
      shaft(188, 395);
      bearing(255, true); bearing(335, true);
      fill('gray'); stroke('dimgray'); lrect(395, 214, 490, FLOOR_Y);
      motor(402, 482, 168, 214);
      motorShaft(385, 402, 191);
      belts(385, SHAFT_Y, 191);
      sheave(385, SHAFT_Y, 22); sheave(385, 191, 13);
      break;
    case 2: // Arrangement 2: bracket on housing, separate motor with belts
      airLeft(120);
      housing(120, 200, true, false);
      impeller(130, 188, false);
      housingBracket(200, 330);
      shaft(188, 365);
      bearing(235, false); bearing(305, false);
      fill('gray'); stroke('dimgray'); lrect(375, 214, 470, FLOOR_Y);
      motor(382, 462, 168, 214);
      motorShaft(355, 382, 191);
      belts(355, SHAFT_Y, 191);
      sheave(355, SHAFT_Y, 22); sheave(355, 191, 13);
      break;
    case 3: // Arrangement 3: center hung, bearings on housing brackets, belts
      airLeft(165);
      housing(200, 280, true, false);
      impeller(212, 268, false);
      inletBracket(200, 172);
      housingBracket(280, 322);
      shaft(165, 350);
      bearing(172, false); bearing(305, false);
      fill('gray'); stroke('dimgray'); lrect(352, 214, 450, FLOOR_Y);
      motor(360, 440, 168, 214);
      motorShaft(340, 360, 191);
      belts(340, SHAFT_Y, 191);
      sheave(340, SHAFT_Y, 22); sheave(340, 191, 13);
      break;
    case 4: // Arrangement 3SI: inlet box, independent pedestals, coupled motor off the fan
      inletBox(90, 170);
      housing(170, 250, false, false);
      impeller(182, 238, false);
      pedestal(44, 76, 140);
      pedestal(270, 302, 140);
      shaft(50, 335);
      bearing(60, true); bearing(286, true);
      coupling(335);
      motorShaft(352, 375, SHAFT_Y);
      fill('gray'); stroke('dimgray'); lrect(372, 140, 470, FLOOR_Y);
      motor(375, 465, 78, 142);
      break;
    case 5: // Arrangement 3DI: DWDI, two inlet boxes, independent pedestals, coupled motor
      inletBox(150, 220);
      inletBox(340, 410);
      housing(220, 340, false, false);
      impeller(232, 328, true);
      pedestal(104, 136, 140);
      pedestal(424, 456, 140);
      shaft(110, 480);
      bearing(120, true); bearing(440, true);
      coupling(475);
      motorShaft(492, 512, SHAFT_Y);
      fill('gray'); stroke('dimgray'); lrect(508, 140, 606, FLOOR_Y);
      motor(512, 600, 78, 142);
      break;
    case 6: // Arrangement 4: impeller on motor shaft, motor on pedestal
      airLeft(140);
      housing(140, 220, true, false);
      pedestal(245, 355, 142);
      impeller(150, 208, false);
      motorShaft(208, 250, SHAFT_Y);
      motor(250, 350, 78, 142);
      break;
    case 7: // Arrangement 7: DWDI, inlet bracket bearing, pedestal with bearing, coupling, motor
      airLeft(150);
      airRight(250);
      pedestal(268, 470, 140);
      housing(150, 250, true, true);
      impeller(160, 240, true);
      inletBracket(150, 122);
      shaft(112, 330);
      bearing(122, false); bearing(292, true);
      coupling(325);
      motorShaft(342, 362, SHAFT_Y);
      motor(362, 462, 78, 140);
      break;
    case 8: // Arrangement 8: long pedestal, two bearings, coupling, motor on the same pedestal
      airLeft(120);
      pedestal(225, 545, 140);
      housing(120, 200, true, false);
      impeller(130, 188, false);
      shaft(188, 380);
      bearing(250, true); bearing(330, true);
      coupling(375);
      motorShaft(392, 425, SHAFT_Y);
      motor(425, 525, 78, 140);
      break;
    case 9: // Arrangement 9: motor on slide base on the side of the pedestal
      airLeft(120);
      pedestal(230, 360, 140);
      housing(120, 200, true, false);
      impeller(130, 188, false);
      shaft(188, 395);
      bearing(255, true); bearing(335, true);
      // slide base plate bolted to the pedestal side, motor on it (pedestal face toward the viewer)
      stroke('black'); fill('silver'); lrect(262, 204, 358, 214);
      fill('black'); noStroke();
      ellipse(X(270), Y(209), S(4), S(4)); ellipse(X(350), Y(209), S(4), S(4));
      motor(272, 348, 160, 204);
      motorShaft(348, 385, 182);
      belts(385, SHAFT_Y, 182);
      sheave(385, SHAFT_Y, 22); sheave(385, 182, 13);
      break;
    case 10: // Arrangement 10: motor inside the pedestal (cutaway)
      airLeft(120);
      pedestal(230, 360, 140);
      housing(120, 200, true, false);
      impeller(130, 188, false);
      shaft(188, 395);
      bearing(255, true); bearing(335, true);
      // cutaway window in the pedestal side
      stroke('saddlebrown');
      strokeWeight(1);
      fill('linen');
      lrect(242, 150, 352, 224);
      drawingContext.setLineDash([5, 4]);
      noFill();
      stroke('black');
      lrect(242, 150, 352, 224);
      drawingContext.setLineDash([]);
      stroke('black'); fill('silver'); lrect(256, 212, 340, 220);
      motor(262, 334, 172, 212);
      motorShaft(334, 385, 192);
      belts(385, SHAFT_Y, 192);
      sheave(385, SHAFT_Y, 22); sheave(385, 192, 13);
      break;
  }
}

// Part labels, shown only after Check Arrangement. [text, anchorX, anchorY, labelX, labelY]
const LABELS = {
  1: [['SWSI housing', 160, 30, 110, -28], ['Impeller (overhung)', 160, 60, 40, 5],
      ['2 bearings', 295, 96, 290, -28], ['Pedestal', 295, 200, 260, 248],
      ['Fan sheave', 385, 88, 430, 40], ['Belts', 393, 150, 445, 115],
      ['Motor on its own floor base', 442, 214, 470, 248]],
  2: [['SWSI housing', 160, 30, 110, -28], ['Impeller (overhung)', 160, 60, 40, 5],
      ['2 bearings', 270, 96, 270, -28], ['Bracket bolted to housing', 265, 140, 250, 248],
      ['Fan sheave', 355, 88, 420, 40], ['Belts', 363, 150, 420, 115],
      ['Separate motor', 422, 214, 470, 248]],
  3: [['Bearing on bracket across inlet', 172, 96, 120, -28], ['SWSI housing', 240, 30, 290, -2],
      ['Impeller (center hung)', 240, 170, 200, 248], ['Bearing on housing bracket', 305, 96, 430, -28],
      ['Fan sheave', 340, 88, 430, 40], ['Belts', 348, 150, 410, 115],
      ['Motor on floor', 400, 214, 470, 248]],
  4: [['Inlet box', 130, 150, 130, 185], ['SWSI housing', 210, 30, 250, -2],
      ['Impeller (center hung)', 210, 170, 260, 248], ['Bearing on independent pedestal', 60, 96, 60, -32],
      ['Bearing on independent pedestal', 286, 96, 390, 40], ['Coupling', 343, 128, 360, 175],
      ['Motor off the fan assembly', 420, 78, 470, -28]],
  5: [['Inlet boxes', 185, 60, 150, -32], ['DWDI housing', 280, 30, 280, -2],
      ['Impeller (center hung)', 280, 170, 280, 248], ['Independent pedestal', 120, 160, 75, 248],
      ['Independent pedestal', 440, 160, 470, 248], ['Coupling', 483, 128, 520, 175],
      ['Motor off the fan assembly', 556, 78, 545, -28]],
  6: [['SWSI housing', 180, 30, 100, -28], ['Impeller hub on motor shaft', 212, 110, 290, -28],
      ['Motor (no fan bearings)', 330, 100, 470, 60], ['Motor pedestal', 300, 200, 440, 200]],
  7: [['Bearing on bracket across inlet', 122, 96, 100, -28], ['DWDI housing', 200, 30, 250, -2],
      ['Impeller (center hung)', 200, 170, 180, 248], ['Bearing on pedestal', 292, 95, 330, 40],
      ['Coupling', 333, 127, 400, 248], ['Motor on the same pedestal', 412, 78, 500, -28],
      ['Pedestal', 440, 200, 520, 200]],
  8: [['SWSI housing', 160, 30, 110, -28], ['Impeller (overhung)', 160, 60, 40, 5],
      ['2 bearings', 290, 96, 280, -28], ['Coupling', 383, 92, 370, 40],
      ['Motor on the extended pedestal', 475, 78, 500, -28], ['Long pedestal', 385, 200, 385, 248]],
  9: [['SWSI housing', 160, 30, 110, -28], ['Impeller (overhung)', 160, 60, 40, 5],
      ['2 bearings', 295, 96, 290, -28], ['Motor on slide base on side of pedestal', 310, 204, 290, 248],
      ['Fan sheave', 385, 88, 440, 40], ['Belts', 393, 150, 460, 120]],
  10: [['SWSI housing', 160, 30, 110, -28], ['Impeller (overhung)', 160, 60, 40, 5],
       ['2 bearings', 295, 96, 290, -28], ['Motor inside the pedestal (cutaway)', 298, 218, 290, 248],
       ['Fan sheave', 385, 88, 440, 40], ['Belts', 393, 150, 460, 120]]
};

function drawLabels(id) {
  textSize(14);
  textAlign(CENTER, CENTER);
  for (const [t, ax, ay, lx, ly] of LABELS[id]) {
    const tw = textWidth(t) + 10;
    let sx = X(lx);
    sx = constrain(sx, 14 + tw / 2, canvasWidth - 14 - tw / 2);
    const sy = Y(ly);
    stroke('black');
    strokeWeight(1);
    line(sx, sy, X(ax), Y(ay));
    fill('black');
    noStroke();
    ellipse(X(ax), Y(ay), 5, 5);
    stroke('dimgray');
    fill('lightyellow');
    rect(sx - tw / 2, sy - 10, tw, 20, 4);
    noStroke();
    fill('black');
    text(t, sx, sy);
  }
}

function drawResults() {
  noStroke();
  fill('black');
  textAlign(LEFT, TOP);
  textSize(15);
  const colW = (canvasWidth - 60) / 2;
  for (let i = 0; i < roundLog.length; i++) {
    const r = roundLog[i];
    const col = i < 5 ? 0 : 1;
    const row = i % 5;
    const x = 30 + col * (colW + 10);
    const y = SCHEM_TOP + 12 + row * 36;
    fill(r.ok ? 'darkgreen' : 'firebrick');
    wrapText((r.ok ? 'Correct: ' : 'Missed: ') + 'drawing ' + (i + 1) + ', Arr. ' + r.arr +
      (r.ok ? '' : ' (chose ' + r.chosen + ')') + '; features ' + r.feats + '/3', x, y, colW, 17);
  }
  fill('black');
  textAlign(CENTER, TOP);
  const mastered = arrangementsCorrect >= 8;
  text(mastered ? 'Mastery reached: 8 or more arrangements correct on the first attempt.' :
    'Mastery is 8 of 10 arrangements correct. Review the missed drawings and try a new round.',
    20, SCHEM_TOP + 202, canvasWidth - 40);
  text('Press New Round for a new shuffled set.', canvasWidth / 2, SCHEM_TOP + 238);
}

function wrapText(str, x, y, w, lh) {
  const words = str.split(' ');
  let lineStr = '';
  for (const word of words) {
    const test = lineStr ? lineStr + ' ' + word : word;
    if (textWidth(test) > w && lineStr) {
      text(lineStr, x, y);
      y += lh;
      lineStr = word;
    } else {
      lineStr = test;
    }
  }
  if (lineStr) { text(lineStr, x, y); y += lh; }
  return y;
}

function drawPanels() {
  const top = SCHEM_BOTTOM + 44;
  const h = drawHeight - top - 8;
  const gap = 10;
  const w = (canvasWidth - 20 - gap) / 2;
  const lx = 10, rx = 10 + w + gap;

  stroke('silver');
  strokeWeight(1);
  fill(255, 255, 255, 235);
  rect(lx, top, w, h, 10);
  rect(rx, top, w, h, 10);

  textAlign(LEFT, TOP);
  noStroke();
  textSize(16);
  fill('black');
  textStyle(BOLD);
  text('Features', lx + 10, top + 8);
  text('Arrangement', rx + 10, top + 8);
  textStyle(NORMAL);

  // running counts, always visible
  textSize(15);
  fill('navy');
  text('Features correct: ' + featuresCorrect + ' of 30', lx + 10, top + h - 24);
  text('Arrangements correct: ' + arrangementsCorrect + ' of 10', rx + 10, top + h - 24);

  // feature panel body
  let y = top + 32;
  fill('black');
  textSize(15);
  if (phase === 'results') {
    y = wrapText('Feature answers are scaffolding and are scored separately from the arrangement names.',
      lx + 10, y, w - 20, 19);
  } else if (!featureResult) {
    y = wrapText('Answer Drive, Impeller and Bearings carried by below, then press Check Features.',
      lx + 10, y, w - 20, 19);
  } else {
    const names = ['Drive', 'Impeller', 'Bearings'];
    for (let i = 0; i < 3; i++) {
      fill(featureResult.correct[i] ? 'darkgreen' : 'firebrick');
      const msg = featureResult.correct[i] ?
        names[i] + ': correct (' + featureResult.keys[i] + ')' :
        names[i] + ': incorrect; answer is ' + featureResult.keys[i];
      y = wrapText(msg, lx + 10, y, w - 20, 19);
    }
    fill('black');
    y += 2;
    if (featureResult.correct.every(c => c)) {
      const list = consistentArrangements(featureResult.answers);
      wrapText('Consistent with these features (gold): ' + list.join(', '),
        lx + 10, y, w - 20, 19);
    } else {
      wrapText('A feature is wrong, so no arrangements are highlighted.', lx + 10, y, w - 20, 19);
    }
  }

  // arrangement panel body
  y = top + 32;
  fill('black');
  if (phase === 'results') {
    wrapText('Round score: ' + arrangementsCorrect + ' of 10 arrangements and ' +
      featuresCorrect + ' of 30 features.', rx + 10, y, w - 20, 19);
  } else if (!arrangementResult) {
    const msg = phase === 'features' ?
      'Locked until you check the three features.' :
      'Choose one arrangement and press Check Arrangement. One attempt per drawing.';
    wrapText(msg, rx + 10, y, w - 20, 19);
  } else {
    fill(arrangementResult.correct ? 'darkgreen' : 'firebrick');
    wrapText(arrangementResult.message, rx + 10, y, w - 20, 19);
  }
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    canvasWidth = max(container.offsetWidth, 300);
  }
}
