// Rotation and Discharge Code Builder
// CANVAS_HEIGHT: 557
// Learners write the rotation + discharge code (letter form and angle form) for
// eight illustrative job cards, then explore any rotation/angle in free practice.
// Rule (chapter 13): seen from the drive side, the outlet direction is "straight up"
// turned through the discharge angle in the direction of rotation (CW or CCW).

let canvasWidth = 800;
let drawHeight = 440;
let controlHeight = 117;
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let sliderLeftMargin = 390;
let defaultTextSize = 16;

// Discharge positions: letter code, name, angle (FanPedia PDF pp. 46-49)
const DISCHARGES = [
  { code: 'UBD', name: 'Upblast', angle: 360 },
  { code: 'TAU', name: 'Top Angular Up', angle: 45 },
  { code: 'THD', name: 'Top Horizontal', angle: 90 },
  { code: 'TAD', name: 'Top Angular Down', angle: 135 },
  { code: 'DBD', name: 'Downblast', angle: 180 },
  { code: 'BAD', name: 'Bottom Angular Down', angle: 225 },
  { code: 'BHD', name: 'Bottom Horizontal', angle: 270 },
  { code: 'BAU', name: 'Bottom Angular Up', angle: 315 }
];

// Job cards (illustrative scenarios), fixed order. code === null means "Not offered".
const CARDS = [
  { fan: 'SWSI', rot: 'CW', desc: 'Outlet blows straight up', code: 'UBD',
    why: 'Straight up is Upblast, 360°, for either rotation.' },
  { fan: 'SWSI', rot: 'CCW', desc: 'Outlet at the top blows horizontally to the left', code: 'THD',
    why: 'For CCW, a quarter turn counterclockwise from straight up points left: 90°, Top Horizontal.' },
  { fan: 'SWSI', rot: 'CW', desc: 'Outlet blows straight down', code: 'DBD',
    why: 'A half turn from straight up is 180°, Downblast, for either rotation.' },
  { fan: 'SWSI', rot: 'CCW', desc: 'Outlet at the bottom blows horizontally to the right', code: 'BHD',
    why: 'For CCW, three quarter turns counterclockwise from up points right: 270°, Bottom Horizontal.' },
  { fan: 'SWSI', rot: 'CW', desc: 'Outlet at the bottom points down and to the left at 45°', code: 'BAD',
    why: '225° clockwise from up is down-left, Bottom Angular Down, which SWSI fans offer.' },
  { fan: 'DWDI', rot: 'CW', desc: 'Outlet at the bottom points down and to the left at 45°', code: null,
    requested: 'BAD',
    why: 'DWDI fans are offered in seven discharges; Bottom Angular Down is not one of them.' },
  { fan: 'SWSI', rot: 'CCW', desc: 'Outlet at the top points up and to the left at 45°', code: 'TAU',
    why: '45° counterclockwise from up is up-left, Top Angular Up.' },
  { fan: 'DWDI', rot: 'CCW', desc: 'Outlet at the bottom points up and to the right at 45°', code: 'BAU',
    why: '315° counterclockwise from up is up-right, Bottom Angular Up, which DWDI fans offer.' }
];

const FAN_NAMES = {
  SWSI: 'SWSI (single width, single inlet)',
  DWDI: 'DWDI (double width, double inlet)'
};

// Quiz state
let cardIndex = 0;
let attempts = 0;          // submissions on the current card (1st scored, 2nd unscored)
let score = 0;
let feedback = null;       // { status, label, message, chose } for the latest graded submission
let notice = '';           // reminder when a submission is incomplete (not graded)
let mode = 'cards';        // 'cards' | 'practice'

// True once card 8 has its scored submission: free practice unlocks
function allCardsDone() {
  return cardIndex === CARDS.length - 1 && attempts >= 1;
}

// Controls
let rotSelect, dischargeSelect, submitButton, nextButton;
let fanTypeSelect, practiceRotSelect, angleSlider;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const mainEl = document.querySelector('main');

  // Row 1: the learner's code
  rotSelect = createSelect();
  rotSelect.option('Rotation…', '');
  rotSelect.option('CW', 'CW');
  rotSelect.option('CCW', 'CCW');
  rotSelect.parent(mainEl);

  dischargeSelect = createSelect();
  dischargeSelect.option('Discharge…', '');
  for (const d of DISCHARGES) dischargeSelect.option(d.code + ' ' + d.name, d.code);
  dischargeSelect.option('Not offered', 'NONE');
  dischargeSelect.parent(mainEl);

  // Row 2: submit / next
  submitButton = createButton('Submit Code');
  submitButton.parent(mainEl);
  submitButton.mousePressed(submitAnswer);

  nextButton = createButton('Next Card');
  nextButton.parent(mainEl);
  nextButton.mousePressed(nextCard);

  // Row 3: free practice
  fanTypeSelect = createSelect();
  fanTypeSelect.option('SWSI', 'SWSI');
  fanTypeSelect.option('DWDI', 'DWDI');
  fanTypeSelect.parent(mainEl);

  practiceRotSelect = createSelect();
  practiceRotSelect.option('CW', 'CW');
  practiceRotSelect.option('CCW', 'CCW');
  practiceRotSelect.parent(mainEl);

  angleSlider = createSlider(45, 360, 360, 45);
  angleSlider.parent(mainEl);

  for (const c of [fanTypeSelect, practiceRotSelect, angleSlider]) {
    c.changed(enterPractice);
    c.input(enterPractice);
  }

  positionControls();
  resetCardControls();
  updateControlStates();

  describe('Rotation and discharge code builder. Eight illustrative job cards describe a centrifugal fan ' +
    'and its outlet direction as seen from the drive side. Choose a rotation and a discharge code and submit; ' +
    'the sim shows feedback and draws the housing with the correct outlet and rotation arrow. ' +
    'After card 8, free practice lets you pick fan type, rotation and discharge angle.', LABEL);
}

function positionControls() {
  rotSelect.position(110, drawHeight + 8);
  dischargeSelect.position(210, drawHeight + 8);
  submitButton.position(110, drawHeight + 43);
  nextButton.position(310, drawHeight + 43);
  fanTypeSelect.position(140, drawHeight + 80);
  practiceRotSelect.position(215, drawHeight + 80);
  angleSlider.position(sliderLeftMargin, drawHeight + 80);
  angleSlider.size(max(80, canvasWidth - sliderLeftMargin - margin));
}

function draw() {
  updateCanvasSize();

  // Regions
  stroke('silver');
  strokeWeight(1);
  fill('aliceblue');
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Title
  noStroke();
  fill('black');
  textSize(24);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  text('Rotation and Discharge Code Builder', canvasWidth / 2, 10);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  textSize(defaultTextSize);

  const leftW = canvasWidth * 0.54;
  const panelTop = 45;
  const panelH = drawHeight - panelTop - 10;

  // Panels
  stroke('silver');
  fill(255, 255, 255, 230);
  rect(10, panelTop, leftW - 15, panelH, 10);
  rect(leftW + 5, panelTop, canvasWidth - leftW - 15, panelH, 10);

  if (mode === 'practice') {
    drawPracticePanel(20, panelTop + 10, leftW - 35);
  } else {
    drawCardPanel(20, panelTop + 10, leftW - 35, panelTop + panelH);
  }
  drawDiagramPanel(leftW + 5, panelTop, canvasWidth - leftW - 15, panelH);

  drawControlLabels();
}

// ---------- Left panel: job card + feedback ----------

function drawCardPanel(x, y, w, bottom) {
  const card = CARDS[cardIndex];
  // Narrow canvases get slightly smaller body text so the card still fits
  const bs = canvasWidth < 640 ? 14 : defaultTextSize;
  const lh = bs + 4;
  noStroke();
  fill('black');
  textStyle(BOLD);
  textSize(17);
  text('Job card ' + (cardIndex + 1) + ' of 8', x, y);
  const tw = textWidth('Job card ' + (cardIndex + 1) + ' of 8 ');
  textStyle(ITALIC);
  textSize(14);
  fill('dimgray');
  text('(illustrative)', x + tw, y + 2);
  textStyle(NORMAL);
  textSize(bs);
  fill('black');
  y += 26;

  y = wrapText('Fan: ' + FAN_NAMES[card.fan], x, y, w, lh);
  y = wrapText('Rotation: ' + card.rot + ' (as seen from the drive side)', x, y, w, lh);
  y = wrapText('Outlet: ' + card.desc + '.', x, y, w, lh);
  fill('dimgray');
  textSize(14);
  y = wrapText('Directions are as seen by an observer on the drive side.', x, y + 2, w, 18);
  textSize(bs);
  fill('black');
  textStyle(BOLD);
  y = wrapText('What code goes on the order?', x, y + 6, w, lh);
  textStyle(NORMAL);
  y += 8;

  if (notice) {
    fill('navy');
    y = wrapText(notice, x, y, w, lh) + 4;
    fill('black');
  }

  if (feedback) {
    stroke('silver');
    line(x, y, x + w, y);
    noStroke();
    y += 8;
    textStyle(BOLD);
    fill(feedback.status === 'Correct' ? 'darkgreen' : 'firebrick');
    y = wrapText(feedback.label, x, y, w, lh);
    textStyle(NORMAL);
    fill('black');
    if (feedback.chose) {
      fill('dimgray');
      y = wrapText('You chose: ' + feedback.chose, x, y, w, lh);
      fill('black');
    }
    if (feedback.message) y = wrapText(feedback.message, x, y, w, lh);
  }

  // End-of-cards summary, then the running score (pinned low, but never over the feedback)
  noStroke();
  if (allCardsDone()) {
    textSize(min(bs, 15));
    fill('navy');
    const msg = score >= 7
      ? 'Mastery reached (7 of 8 needed). Free practice is unlocked below.'
      : 'Mastery needs 7 of 8 on the first attempt. Free practice is unlocked below.';
    y = wrapText(msg, x, max(y + 6, bottom - 70), w, min(lh, 19));
  }
  fill('black');
  textStyle(BOLD);
  textSize(17);
  text('Codes correct: ' + score + ' of 8', x, max(y + 4, bottom - 30));
  textStyle(NORMAL);
  textSize(defaultTextSize);
}

function drawPracticePanel(x, y, w) {
  const fan = fanTypeSelect.value();
  const rot = practiceRotSelect.value();
  const angle = angleSlider.value();
  const d = dischargeForAngle(angle);
  noStroke();
  fill('black');
  textStyle(BOLD);
  textSize(17);
  text('Free practice', x, y);
  const ptw = textWidth('Free practice ');
  textStyle(ITALIC);
  textSize(14);
  fill('dimgray');
  if (ptw + textWidth('(exploration, not scored)') < w) text('(exploration, not scored)', x + ptw, y + 2);
  else text('(not scored)', x + ptw, y + 2);
  textStyle(NORMAL);
  textSize(defaultTextSize);
  fill('black');
  y += 28;
  y = wrapText('Fan: ' + FAN_NAMES[fan], x, y, w, 20);
  y = wrapText('Rotation: ' + rot + ', discharge angle ' + angle + '°', x, y, w, 20);
  y = wrapText('Outlet points ' + directionWords(rot, angle) + ' (drive side).', x, y, w, 20);
  y += 8;
  textSize(20);
  textStyle(BOLD);
  if (fan === 'DWDI' && angle === 225) {
    fill('firebrick');
    y = wrapText('Not offered on DWDI', x, y, w, 26);
    textStyle(NORMAL);
    textSize(defaultTextSize);
    fill('black');
    y = wrapText('DWDI fans come in seven discharges; ' + rot + ' BAD (' + rot + ' 225) is the missing one.', x, y, w, 20);
  } else {
    fill('darkgreen');
    y = wrapText(rot + ' ' + d.code + '  (' + rot + ' ' + angle + ')', x, y, w, 26);
    textStyle(NORMAL);
    textSize(defaultTextSize);
    fill('black');
    y = wrapText(d.name + ' discharge.', x, y, w, 20);
  }
  y += 12;
  fill('dimgray');
  textSize(15);
  y = wrapText('Try it: keep the angle fixed and switch CW to CCW. The outlet mirrors left to right; ' +
    'only 360 and 180 stay put.', x, y, w, 19);
  textSize(defaultTextSize);
  fill('black');
  text('Codes correct: ' + score + ' of 8', x, drawHeight - 40);
}

// ---------- Right panel: drive-side housing ----------

function drawDiagramPanel(px, py, pw, ph) {
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(15);
  text('Drive-side view', px + pw / 2, py + 8);
  textAlign(LEFT, TOP);

  const cx = px + pw / 2;
  const cy = py + ph * 0.46;
  const s = min(pw, ph * 0.78);

  let view = null;
  if (mode === 'practice') {
    const fan = fanTypeSelect.value();
    const angle = angleSlider.value();
    view = { fan: fan, rot: practiceRotSelect.value(), angle: angle,
      notOffered: fan === 'DWDI' && angle === 225 };
  } else if (feedback) {
    const card = CARDS[cardIndex];
    const code = card.code || card.requested;
    view = { fan: card.fan, rot: card.rot, angle: dischargeByCode(code).angle, notOffered: card.code === null };
  }

  if (!view) {
    // Before submission: no answer revealed
    stroke('gray');
    strokeWeight(2);
    drawingContext.setLineDash([6, 6]);
    noFill();
    circle(cx, cy, s * 0.5);
    drawingContext.setLineDash([]);
    noStroke();
    fill('gray');
    textAlign(CENTER, CENTER);
    textSize(48);
    text('?', cx, cy);
    textSize(15);
    fill('dimgray');
    text('Submit to see the housing\nwith the correct outlet.', cx, py + ph - 40);
    textAlign(LEFT, TOP);
    textSize(defaultTextSize);
    return;
  }

  drawHousing(cx, cy, s, view.rot, view.angle, view.notOffered);
  drawAngleInset(px + pw - 42, py + 50, view.rot, view.angle);

  // Code labels under the diagram
  const d = dischargeForAngle(view.angle);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(18);
  textStyle(BOLD);
  if (view.notOffered) {
    fill('firebrick');
    text('Not offered on DWDI', cx, py + ph - 52);
    textStyle(NORMAL);
    textSize(15);
    fill('dimgray');
    text('requested: ' + view.rot + ' BAD (' + view.rot + ' 225)', cx, py + ph - 28);
  } else {
    fill('black');
    text(view.rot + ' ' + d.code + '   ·   ' + view.rot + ' ' + view.angle, cx, py + ph - 52);
    textStyle(NORMAL);
    textSize(15);
    fill('dimgray');
    text(view.fan + ', ' + d.name, cx, py + ph - 28);
  }
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  textSize(defaultTextSize);
}

// Unit vector (screen coords, y down) of the outlet direction:
// "straight up" turned through angle in the rotation direction.
function outletVector(rot, angle) {
  const a = radians(angle);
  const sx = rot === 'CW' ? sin(a) : -sin(a);
  return createVector(sx, -cos(a));
}

function drawHousing(cx, cy, s, rot, angle, notOffered) {
  const dvec = outletVector(rot, angle);
  // Outlet sits where the wheel's tangential velocity points along the outlet direction.
  const p = rot === 'CW' ? createVector(dvec.y, -dvec.x) : createVector(-dvec.y, dvec.x);
  const alpha = atan2(p.y, p.x);
  const R0 = s * 0.2;     // tongue (cutoff) radius
  const R1 = s * 0.3;     // scroll radius at the outlet
  const L = s * 0.2;      // outlet duct length
  const dir = rot === 'CW' ? 1 : -1;

  // Scroll housing polygon: spiral in the rotation direction, then the outlet duct
  stroke('black');
  strokeWeight(2);
  fill(notOffered ? 'gainsboro' : 'lightsteelblue');
  if (notOffered) drawingContext.setLineDash([6, 5]);
  beginShape();
  for (let i = 0; i <= 72; i++) {
    const t = i / 72;
    const phi = alpha + dir * TWO_PI * t;
    const r = R0 + (R1 - R0) * t;
    vertex(cx + r * cos(phi), cy + r * sin(phi));
  }
  const outerEnd = createVector(cx + R1 * cos(alpha) + L * dvec.x, cy + R1 * sin(alpha) + L * dvec.y);
  const innerEnd = createVector(cx + R0 * cos(alpha) + L * dvec.x, cy + R0 * sin(alpha) + L * dvec.y);
  vertex(outerEnd.x, outerEnd.y);
  vertex(innerEnd.x, innerEnd.y);
  endShape(CLOSE);
  drawingContext.setLineDash([]);

  // Wheel with blades
  const rw = R0 * 0.78;
  fill('white');
  stroke('dimgray');
  strokeWeight(1.5);
  circle(cx, cy, rw * 2);
  for (let k = 0; k < 12; k++) {
    const b = k * TWO_PI / 12;
    line(cx + rw * 0.45 * cos(b), cy + rw * 0.45 * sin(b), cx + rw * 0.95 * cos(b + dir * 0.35), cy + rw * 0.95 * sin(b + dir * 0.35));
  }
  fill('dimgray');
  circle(cx, cy, rw * 0.3);

  // Rotation arrow (arc in rotation direction)
  const ra = R1 + s * 0.06;
  const start = alpha + dir * 0.6;
  const sweep = PI * 1.2;
  stroke('darkorange');
  strokeWeight(3);
  noFill();
  if (dir > 0) arc(cx, cy, ra * 2, ra * 2, start, start + sweep);
  else arc(cx, cy, ra * 2, ra * 2, start - sweep, start);
  const endA = start + dir * sweep;
  const tip = createVector(cx + ra * cos(endA), cy + ra * sin(endA));
  const tang = createVector(-sin(endA) * dir, cos(endA) * dir);
  drawArrowHead(tip, tang, 11, 'darkorange');
  noStroke();
  fill('darkorange');
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(16);
  const la = start + dir * sweep * 0.5;
  text(rot, cx + (ra + 18) * cos(la), cy + (ra + 18) * sin(la));
  textStyle(NORMAL);

  // Air-flow arrow out of the outlet
  const mouth = createVector((outerEnd.x + innerEnd.x) / 2, (outerEnd.y + innerEnd.y) / 2);
  const tipA = createVector(mouth.x + dvec.x * s * 0.12, mouth.y + dvec.y * s * 0.12);
  stroke(notOffered ? 'gray' : 'navy');
  strokeWeight(3);
  line(mouth.x, mouth.y, tipA.x, tipA.y);
  drawArrowHead(tipA, dvec, 11, notOffered ? 'gray' : 'navy');

  if (notOffered) {
    // Cross out the unavailable outlet
    const m = createVector((mouth.x + cx + R1 * cos(alpha)) / 2, (mouth.y + cy + R1 * sin(alpha)) / 2);
    stroke('firebrick');
    strokeWeight(5);
    const k = s * 0.08;
    line(m.x - k, m.y - k, m.x + k, m.y + k);
    line(m.x - k, m.y + k, m.x + k, m.y - k);
  }
  strokeWeight(1);
  textAlign(LEFT, TOP);
  textSize(defaultTextSize);
}

function drawArrowHead(tip, dirVec, size, col) {
  const v = dirVec.copy().normalize();
  const nrm = createVector(-v.y, v.x);
  noStroke();
  fill(col);
  triangle(tip.x + v.x * size * 0.6, tip.y + v.y * size * 0.6,
    tip.x - v.x * size * 0.6 + nrm.x * size * 0.6, tip.y - v.y * size * 0.6 + nrm.y * size * 0.6,
    tip.x - v.x * size * 0.6 - nrm.x * size * 0.6, tip.y - v.y * size * 0.6 - nrm.y * size * 0.6);
}

// Small inset: dashed "straight up" reference, the outlet direction, and the angle arc
function drawAngleInset(ix, iy, rot, angle) {
  const r = 24;
  stroke('silver');
  strokeWeight(1);
  fill('white');
  circle(ix, iy, r * 2 + 12);
  stroke('gray');
  drawingContext.setLineDash([3, 3]);
  line(ix, iy, ix, iy - r);
  drawingContext.setLineDash([]);
  const v = outletVector(rot, angle);
  stroke('navy');
  strokeWeight(2);
  line(ix, iy, ix + v.x * r, iy + v.y * r);
  stroke('darkorange');
  noFill();
  const up = -HALF_PI;
  const sweep = radians(angle);
  if (angle < 360) {
    if (rot === 'CW') arc(ix, iy, r, r, up, up + sweep);
    else arc(ix, iy, r, r, up - sweep, up);
  } else {
    circle(ix, iy, r);
  }
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(14);
  text(angle + '° ' + rot, ix, iy + r + 8);
  textAlign(LEFT, TOP);
  strokeWeight(1);
}

// ---------- Control-area labels ----------

function drawControlLabels() {
  noStroke();
  fill('black');
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  text('Your code:', 10, drawHeight + 18);
  textStyle(NORMAL);
  if (mode === 'cards') {
    fill('dimgray');
    textSize(14);
    let note = '';
    if (attempts === 1) note = 'One unscored retry allowed.';
    else if (attempts === 0) note = 'First submission is scored.';
    // Note sits to the right of the Next button when there is room
    const nx = nextButton.x + nextButton.elt.offsetWidth + 15;
    if (nx + textWidth(note) < canvasWidth - 5) text(note, nx, drawHeight + 53);
  }
  textSize(defaultTextSize);
  textStyle(BOLD);
  const locked = mode === 'cards' && !allCardsDone();
  fill(locked ? 'gray' : 'black');
  text('Free practice:', 10, drawHeight + 90);
  textStyle(NORMAL);
  if (locked) {
    fill('gray');
    textSize(14);
    text('unlocks after card 8', 285, drawHeight + 90);
    textSize(defaultTextSize);
  } else {
    fill('black');
    text('Angle: ' + angleSlider.value() + '°', 285, drawHeight + 90);
  }
  textAlign(LEFT, TOP);
}

// ---------- Quiz logic ----------

function submitAnswer() {
  if (mode !== 'cards' || attempts >= 2) return;
  const card = CARDS[cardIndex];
  const rot = rotSelect.value();
  const disch = dischargeSelect.value();
  if (disch === '') {
    notice = 'Choose a discharge (or Not offered) first.';
    return;
  }
  if (disch !== 'NONE' && rot === '') {
    notice = 'Choose a rotation (CW or CCW) first.';
    return;
  }
  notice = '';
  const correct = card.code === null ? disch === 'NONE' : (disch === card.code && rot === card.rot);
  const chose = disch === 'NONE' ? 'Not offered' : rot + ' ' + disch + ' (' + rot + ' ' + dischargeByCode(disch).angle + ')';
  const answer = answerText(card);
  const prefix = attempts === 1 ? 'Unscored retry. ' : '';
  if (attempts === 0 && correct) score++;
  attempts++;
  feedback = correct
    ? { status: 'Correct', label: prefix + 'Correct: ' + answer + '.', message: '', chose: chose }
    : { status: 'Incorrect', label: prefix + 'Incorrect', message: card.why + ' Correct answer: ' + answer + '.', chose: chose };
  if (cardIndex === CARDS.length - 1 && attempts === 1) {
    nextButton.html('Start Free Practice');
  }
  updateControlStates();
}

function nextCard() {
  if (attempts === 0) return;
  if (cardIndex < CARDS.length - 1) {
    cardIndex++;
    attempts = 0;
    feedback = null;
    notice = '';
    resetCardControls();
  } else {
    enterPractice();
  }
  updateControlStates();
}

// Free practice starts at the rule's defaults: SWSI, CW, 360
function enterPractice() {
  if (!allCardsDone() && mode !== 'practice') return;
  mode = 'practice';
  updateControlStates();
}

function resetCardControls() {
  rotSelect.selected('');
  dischargeSelect.selected('');
}

function updateControlStates() {
  const inCards = mode === 'cards';
  rotSelect.elt.disabled = !inCards || attempts >= 2;
  dischargeSelect.elt.disabled = !inCards || attempts >= 2;
  submitButton.elt.disabled = !inCards || attempts >= 2;
  submitButton.html(attempts === 0 ? 'Submit Code' : 'Retry (unscored)');
  nextButton.elt.disabled = !inCards || attempts === 0;
  const practiceOn = !inCards || allCardsDone();
  fanTypeSelect.elt.disabled = !practiceOn;
  practiceRotSelect.elt.disabled = !practiceOn;
  angleSlider.elt.disabled = !practiceOn;
  // The angle slider stays hidden until free practice unlocks (its label says so)
  if (practiceOn) angleSlider.show(); else angleSlider.hide();
}

function answerText(card) {
  if (card.code === null) return 'Not offered';
  const d = dischargeByCode(card.code);
  return card.rot + ' ' + d.code + ' (' + card.rot + ' ' + d.angle + ')';
}

function dischargeByCode(code) {
  return DISCHARGES.find(d => d.code === code);
}

function dischargeForAngle(angle) {
  return DISCHARGES.find(d => d.angle === angle);
}

function directionWords(rot, angle) {
  const v = outletVector(rot, angle);
  const h = abs(v.x) < 0.01 ? '' : (v.x > 0 ? 'right' : 'left');
  const vv = abs(v.y) < 0.01 ? '' : (v.y < 0 ? 'up' : 'down');
  if (h && vv) return vv + ' and to the ' + h;
  if (vv) return 'straight ' + vv;
  return 'to the ' + h;
}

// Word-wrap helper: draws text inside width w and returns the next y
function wrapText(str, x, y, w, lineH) {
  const words = str.split(' ');
  let lineStr = '';
  for (const word of words) {
    const test = lineStr ? lineStr + ' ' + word : word;
    if (textWidth(test) > w && lineStr) {
      text(lineStr, x, y);
      y += lineH;
      lineStr = word;
    } else {
      lineStr = test;
    }
  }
  if (lineStr) {
    text(lineStr, x, y);
    y += lineH;
  }
  return y;
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    canvasWidth = max(400, container.offsetWidth);
    if (typeof angleSlider !== 'undefined') {
      angleSlider.size(max(80, canvasWidth - sliderLeftMargin - margin));
    }
  }
}
