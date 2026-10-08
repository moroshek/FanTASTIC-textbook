// Construction Class Advisor MicroSim (Chapter 20)
// CANVAS_HEIGHT: 660
// Six illustrative airstream inquiries. For each one the learner picks one of four
// construction recommendations (A-D), commits it with Recommend, and only then sees
// the reason. The first attempt is scored; one extra practice attempt is allowed.
// Source rules: FanPedia (https://tcf.com/fanpedia/) pp. 85, 107, 110, 116, 119, 122, 145.
// Width responsive; all controls are native p5.js buttons in the control region.

// ---------- canvas layout (standard MicroSim variable names) ----------
let canvasWidth = 400;          // replaced by the container width in updateCanvasSize()
let drawHeight = 580;           // drawing region (no controls here)
let controlHeight = 80;         // 2 rows of controls: (2 x 35) + 10
let canvasHeight = drawHeight + controlHeight;
let margin = 15;
let sliderLeftMargin = 140;     // kept for template consistency (this sim has no sliders)
let defaultTextSize = 16;

// ---------- content (from the chapter specification; option order is fixed) ----------
const inquiries = [
  {
    short: 'Arr. 9 axial fan, steam, near-ambient',
    text: 'Arrangement 9 axial fan exhausting steam from a washdown area at near-ambient temperature.',
    tags: ['wet'],
    options: [
      'High moisture construction with a drain at the lowest point.',
      'High temperature package.',
      'Spark resistant Type C.',
      'Standard construction; steam is just air.'
    ],
    correct: 0,
    reason: 'High moisture construction is for steam or condensation in the housing and is offered on Arrangement 9 axial fans; a drain removes the water.'
  },
  {
    short: 'Same Arr. 9 axial fan, steam at 220°F',
    text: 'The same Arrangement 9 axial fan, but the steam exhaust reaches 220°F.',
    tags: ['hot', 'wet'],
    options: [
      'High moisture construction plus a high temperature package.',
      'Refer to engineering review; high moisture and high temperature construction cannot be combined.',
      'High moisture construction only; 220°F is not hot.',
      'Insulated jacket only.'
    ],
    correct: 1,
    reason: 'FanPedia states that high moisture construction cannot be used with high temperature construction, and 220°F falls in an axial high temperature package.'
  },
  {
    short: 'Radial bladed fan, Type C specified, non-ferrous impeller',
    text: 'Radial bladed fan; specification calls for spark-resistant Type C; this fan\'s standard impeller is non-ferrous.',
    tags: ['explosive'],
    options: [
      'Type C with rub plate and Monel rub ring.',
      'Type B.',
      'Type A.',
      'No spark resistance needed.'
    ],
    correct: 1,
    reason: 'FanPedia notes that a fan with a non-ferrous impeller as standard should use Type B.'
  },
  {
    short: 'Arr. 1 centrifugal, kiln air at 700°F, walkway',
    text: 'Arrangement 1 centrifugal fan recirculating kiln air at 700°F; a walkway passes beside the fan and workers can touch the housing.',
    tags: ['hot', 'personnel exposure'],
    options: [
      'Standard construction with a heat-resistant coating.',
      '601°F-800°F package, no insulation.',
      '601°F-800°F package with insulated construction (for example an insulated jacket).',
      '801°F-1,000°F package.'
    ],
    correct: 2,
    reason: '700°F lies in the 601°F-800°F band, and a touchable hot housing calls for insulation; jackets are also named as personnel protection.'
  },
  {
    short: 'Forced draft fan, inlet box, exhaust returned to inlet',
    text: 'Forced draft fan with an inlet box; the boiler system returns part of its hot exhaust to the fan inlet.',
    tags: ['hot', 'recirculated gas'],
    options: [
      'FGR connection on the inlet box, with an insulated inlet box for the hot gas.',
      'High moisture construction.',
      'Spark resistant Type C.',
      'Weep hole only.'
    ],
    correct: 0,
    reason: 'Recirculated flue gas enters through an FGR connection on the front of the inlet box, and the hot gas makes an insulated inlet box appropriate.'
  },
  {
    short: 'Stainless housing on a mild steel pedestal',
    text: 'Stainless steel housing on a mild steel pedestal; the specification forbids welding stainless steel to mild steel.',
    tags: ['corrosive'],
    options: [
      'Weld the housing to the pedestal anyway.',
      'Buffer strips between housing and pedestal, or a bolt-on pedestal.',
      'Coat the pedestal.',
      'Aluminum pedestal welded to the housing.'
    ],
    correct: 1,
    reason: 'FanPedia uses buffer strips when stainless must not be welded to mild steel, and a bolt-on pedestal for dissimilar metals.'
  }
];

const letters = ['A', 'B', 'C', 'D'];
const exampleLine = '601°F-800°F package; mild steel and Corten or stainless steel; insulated jacket.';
const MSG_CORRECT = 'Recommended construction is sound.';
const MSG_WRONG = 'That breaks a rule.';
const MSG_MASTERY = 'You can turn an airstream into a construction line.';

// ---------- state ----------
let current = 0;          // index of the inquiry on screen
let selected = -1;        // option currently selected (not yet committed)
let records = [];         // per inquiry: { first, practice, revealed }
let showSummary = false;

// ---------- controls ----------
let letterButtons = [];
let recommendButton, nextButton, restartButton;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');

  // Create every control before positioning any of them
  for (let i = 0; i < 4; i++) {
    const b = createButton(letters[i]);
    b.parent(document.querySelector('main'));
    b.size(40, 30);
    b.mousePressed(() => selectOption(i));
    letterButtons.push(b);
  }
  recommendButton = createButton('Recommend');
  recommendButton.parent(document.querySelector('main'));
  recommendButton.size(110, 30);
  recommendButton.mousePressed(commitRecommendation);

  nextButton = createButton('Next inquiry');
  nextButton.parent(document.querySelector('main'));
  nextButton.size(130, 30);
  nextButton.mousePressed(nextInquiry);

  restartButton = createButton('Start over');
  restartButton.parent(document.querySelector('main'));
  restartButton.size(100, 30);
  restartButton.mousePressed(resetAll);

  positionControls();
  resetAll();

  describe('Construction Class Advisor: six illustrative fan inquiries with airstream condition tags. ' +
    'Choose option A, B, C or D, press Recommend to commit, then read whether the construction is sound and why. ' +
    'The first answer to each inquiry is scored; a summary lists every answer and the final score out of 6.');
  noLoop();
}

function positionControls() {
  // Row 1: option letters + Recommend; Row 2: Next inquiry + Start over
  const row1 = drawHeight + 8;
  const row2 = drawHeight + 43;
  const x0 = 85;  // room for the "Option:" label
  for (let i = 0; i < 4; i++) letterButtons[i].position(x0 + i * 46, row1);
  recommendButton.position(x0 + 4 * 46 + 10, row1);
  nextButton.position(10, row2);
  restartButton.position(150, row2);
}

function resetAll() {
  current = 0;
  selected = -1;
  showSummary = false;
  records = inquiries.map(() => ({ first: -1, practice: -1, revealed: false }));
  updateButtons();
  redraw();
}

function selectOption(i) {
  const r = records[current];
  if (showSummary || r.revealed || r.practice >= 0) return;
  if (r.first === i) return;  // the practice attempt must be a different option
  selected = i;
  updateButtons();
  redraw();
}

function commitRecommendation() {
  if (showSummary || selected < 0) return;
  const r = records[current];
  const q = inquiries[current];
  if (r.first < 0) {
    r.first = selected;                       // scored attempt
    if (selected === q.correct) r.revealed = true;
  } else if (r.practice < 0 && !r.revealed) {
    r.practice = selected;                    // practice attempt (not scored)
    r.revealed = true;                        // correct option shown after practice
  }
  selected = -1;
  updateButtons();
  redraw();
}

function nextInquiry() {
  if (showSummary || records[current].first < 0) return;
  records[current].revealed = true;  // moving on reveals the correct option for the summary
  if (current < inquiries.length - 1) {
    current++;
  } else {
    showSummary = true;
  }
  selected = -1;
  updateButtons();
  redraw();
}

function setEnabled(btn, on) {
  if (on) btn.removeAttribute('disabled'); else btn.attribute('disabled', '');
}

function updateButtons() {
  const r = records[current];
  const choosing = !showSummary && !r.revealed && r.practice < 0;
  for (let i = 0; i < 4; i++) {
    setEnabled(letterButtons[i], choosing && r.first !== i);
    letterButtons[i].style('font-weight', i === selected ? 'bold' : 'normal');
    letterButtons[i].style('background-color', i === selected ? 'lightskyblue' : '');
  }
  setEnabled(recommendButton, choosing && selected >= 0);
  setEnabled(nextButton, !showSummary && r.first >= 0);
  nextButton.html(current === inquiries.length - 1 ? 'See summary' : 'Next inquiry');
}

function score() {
  let n = 0;
  for (let i = 0; i < inquiries.length; i++) {
    if (records[i].first === inquiries[i].correct) n++;
  }
  return n;
}

// ---------- drawing ----------
function draw() {
  updateCanvasSize();

  fill('aliceblue');
  stroke('silver');
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  noStroke();
  fill('black');
  textSize(22);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  text('Construction Class Advisor', canvasWidth / 2, 10);
  textStyle(NORMAL);

  if (showSummary) drawSummary(); else drawInquiry();

  // control-region label
  noStroke();
  fill('black');
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  text('Option:', 12, drawHeight + 23);
  textAlign(LEFT, CENTER);
  fill('dimgray');
  textSize(14);
  if (canvasWidth > 430) {
    const r = records[current];
    let hint = '';
    if (showSummary) hint = 'Press Start over to try again.';
    else if (r.first < 0) hint = selected < 0 ? 'Pick A-D, then Recommend.' : 'Press Recommend to commit.';
    else if (!r.revealed && r.practice < 0) hint = 'Optional: one practice attempt.';
    else hint = 'Press ' + (current === inquiries.length - 1 ? 'See summary.' : 'Next inquiry.');
    text(hint, 265, drawHeight + 58);
  }
}

// Break a string into lines no wider than maxW at the current text size
function wrapLines(str, maxW) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (textWidth(test) > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function boldWrap(str, maxW) {
  textStyle(BOLD);
  const lines = wrapLines(str, maxW);
  textStyle(NORMAL);
  return lines;
}

function drawLines(lines, x, y, lh) {
  for (let i = 0; i < lines.length; i++) text(lines[i], x, y + i * lh);
  return lines.length * lh;
}

// Build the inquiry layout at text size ts and return its total height (no drawing)
function measureInquiry(ts) {
  textSize(ts);
  const q = inquiries[current];
  const lh = ts * 1.3;
  const innerW = canvasWidth - 2 * margin;
  let h = 70;                                             // title + header line
  h += wrapLines(q.text, innerW - 20).length * lh + 20;   // inquiry box
  h += 34;                                                // tag chips
  h += lh + 8;                                            // prompt
  for (let i = 0; i < 4; i++) h += cardInfo(i, innerW, ts).h + 8;
  textSize(ts);
  h += feedbackHeight(ts, innerW);
  return h;
}

function feedbackLines(innerW) {
  const r = records[current];
  const q = inquiries[current];
  if (r.first < 0) return null;
  const last = r.practice >= 0 ? r.practice : r.first;
  const verdict = last === q.correct ? MSG_CORRECT : MSG_WRONG;
  const label = r.practice >= 0 ? 'Practice attempt (not scored): ' : 'First attempt (scored): ';
  let extra = '';
  if (!r.revealed) extra = 'You may choose again once for practice; your first answer is the one scored.';
  else extra = 'Correct recommendation: ' + letters[q.correct] + '.';
  return {
    head: boldWrap(label + verdict, innerW - 20),
    body: wrapLines(q.reason, innerW - 20),
    extra: wrapLines(extra, innerW - 20),
    good: last === q.correct
  };
}

function feedbackHeight(ts, innerW) {
  const fb = feedbackLines(innerW);
  const lh = ts * 1.3;
  if (!fb) return lh + 24;
  return (fb.head.length + fb.body.length + fb.extra.length) * lh + 24;
}

// Text, status label and colors for option card i (used to measure and to draw)
function cardInfo(i, innerW, ts) {
  const q = inquiries[current];
  const r = records[current];
  textSize(ts);
  const lh = ts * 1.3;
  const lines = wrapLines(q.options[i], innerW - 60);
  const isFirst = r.first === i;
  const isPractice = r.practice === i;
  let bg = 'white', border = 'silver', weight = 1, tag = '';
  if (i === selected) { bg = 'lightcyan'; border = 'steelblue'; weight = 3; tag = 'selected'; }
  if ((isFirst || isPractice) && i !== q.correct) {
    bg = 'mistyrose'; border = 'firebrick'; weight = 2;
    tag = isFirst ? 'your first answer: breaks a rule' : 'practice answer: breaks a rule';
  }
  if (r.revealed && i === q.correct) {
    bg = 'honeydew'; border = 'forestgreen'; weight = 3;
    tag = isFirst ? 'your first answer: correct' : (isPractice ? 'practice answer: correct' : 'correct recommendation');
  }
  let h = lines.length * lh + 18;
  if (tag) {
    // give the status label its own line when it would collide with the last text line
    textSize(ts - 2);
    textStyle(BOLD);
    const tagW = textWidth(tag);
    textStyle(NORMAL);
    textSize(ts);
    const lastW = textWidth(lines[lines.length - 1]);
    if (44 + lastW + 16 + tagW > innerW - 8) h += ts;
  }
  return { lines, h, bg, border, weight, tag };
}

function drawInquiry() {
  const q = inquiries[current];
  const r = records[current];
  const innerW = canvasWidth - 2 * margin;

  // shrink text only if the content would not fit the drawing region
  let ts = 16;
  while (ts > 12 && measureInquiry(ts) > drawHeight - 6) ts--;
  textSize(ts);
  const lh = ts * 1.3;

  // header line
  let y = 42;
  noStroke();
  textAlign(LEFT, TOP);
  fill('black');
  textStyle(BOLD);
  text('Inquiry ' + (current + 1) + ' of ' + inquiries.length, margin, y);
  textStyle(ITALIC);
  fill('dimgray');
  textAlign(RIGHT, TOP);
  text('Illustrative inquiries', canvasWidth - margin, y);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  y += lh + 6;

  // inquiry box
  const qLines = wrapLines(q.text, innerW - 20);
  const boxH = qLines.length * lh + 14;
  fill('white');
  stroke('steelblue');
  strokeWeight(1.5);
  rect(margin, y, innerW, boxH, 8);
  strokeWeight(1);
  noStroke();
  fill('black');
  drawLines(qLines, margin + 10, y + 7, lh);
  y += boxH + 8;

  // airstream condition tags
  fill('black');
  textAlign(LEFT, CENTER);
  text('Airstream:', margin, y + (lh + 8) / 2);
  textAlign(LEFT, TOP);
  let tx = margin + textWidth('Airstream:') + 10;
  for (const t of q.tags) {
    const w = textWidth(t) + 18;
    fill('lemonchiffon');
    stroke('darkgoldenrod');
    rect(tx, y, w, lh + 8, 12);
    noStroke();
    fill('saddlebrown');
    textAlign(LEFT, CENTER);
    text(t, tx + 9, y + (lh + 8) / 2);
    textAlign(LEFT, TOP);
    tx += w + 8;
  }
  y += lh + 18;

  // prompt
  fill('black');
  textStyle(BOLD);
  text('What should the construction line say?', margin, y);
  textStyle(NORMAL);
  y += lh + 8;

  // option cards
  for (let i = 0; i < 4; i++) {
    const c = cardInfo(i, innerW, ts);
    fill(c.bg);
    stroke(c.border);
    strokeWeight(c.weight);
    rect(margin, y, innerW, c.h, 8);
    strokeWeight(1);
    // letter badge
    fill(c.border === 'silver' ? 'slategray' : c.border);
    noStroke();
    circle(margin + 20, y + c.h / 2, 26);
    fill('white');
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(letters[i], margin + 20, y + c.h / 2);
    textAlign(LEFT, TOP);
    textStyle(NORMAL);
    fill('black');
    drawLines(c.lines, margin + 44, y + 9, lh);
    if (c.tag) {
      textSize(ts - 2);
      textStyle(BOLD);
      fill(c.border);
      textAlign(RIGHT, TOP);
      text(c.tag, margin + innerW - 8, y + c.h - (ts - 2) - 5);
      textAlign(LEFT, TOP);
      textStyle(NORMAL);
      textSize(ts);
    }
    y += c.h + 8;
  }

  // feedback panel
  const fb = feedbackLines(innerW);
  y += 2;
  if (!fb) {
    fill('dimgray');
    textStyle(ITALIC);
    text('Choose one option, then press Recommend. The reason appears after you commit.', margin, y, innerW);
    textStyle(NORMAL);
    return;
  }
  const fh = (fb.head.length + fb.body.length + fb.extra.length) * lh + 16;
  fill(255, 255, 255, 235);
  stroke(fb.good ? 'forestgreen' : 'firebrick');
  strokeWeight(2);
  rect(margin, y, innerW, fh, 10);
  strokeWeight(1);
  noStroke();
  let fy = y + 8;
  fill(fb.good ? 'darkgreen' : 'darkred');
  textStyle(BOLD);
  fy += drawLines(fb.head, margin + 10, fy, lh);
  textStyle(NORMAL);
  fill('black');
  fy += drawLines(fb.body, margin + 10, fy, lh);
  fill('midnightblue');
  textStyle(ITALIC);
  drawLines(fb.extra, margin + 10, fy, lh);
  textStyle(NORMAL);
}

// Summary rows, measured or drawn at text size ts; returns the bottom y
function layoutSummary(ts, doDraw) {
  const innerW = canvasWidth - 2 * margin;
  const lh = ts * 1.3;
  const small = Math.max(ts - 2, 11);
  const slh = small * 1.3;
  const n = score();
  let y = 42;
  textSize(ts);
  textAlign(LEFT, TOP);
  if (doDraw) {
    noStroke();
    fill('black');
    textStyle(BOLD);
    text('Summary: ' + n + ' of 6', margin, y);
    textStyle(ITALIC);
    fill('dimgray');
    textAlign(RIGHT, TOP);
    text('Illustrative inquiries', canvasWidth - margin, y);
    textAlign(LEFT, TOP);
    textStyle(NORMAL);
  }
  y += lh + 6;

  for (let i = 0; i < inquiries.length; i++) {
    const q = inquiries[i];
    const r = records[i];
    const ok = r.first === q.correct;
    textSize(ts);
    // narrow screens drop the short description so the reasons stay readable
    const label = canvasWidth < 560 ? 'Inquiry ' + (i + 1) : (i + 1) + '. ' + q.short;
    const head = boldWrap(label + ' — first answer ' +
      (r.first >= 0 ? letters[r.first] : '-') + (ok ? ' (correct)' : ' (incorrect)') +
      '; correct ' + letters[q.correct], innerW - 16);
    textSize(small);
    const body = wrapLines(q.reason, innerW - 16);
    const h = head.length * lh + body.length * slh + 12;
    if (doDraw) {
      fill(ok ? 'honeydew' : 'mistyrose');
      stroke(ok ? 'forestgreen' : 'firebrick');
      rect(margin, y, innerW, h, 6);
      noStroke();
      textSize(ts);
      textStyle(BOLD);
      fill(ok ? 'darkgreen' : 'darkred');
      drawLines(head, margin + 8, y + 5, lh);
      textStyle(NORMAL);
      textSize(small);
      fill('black');
      drawLines(body, margin + 8, y + 5 + head.length * lh, slh);
    }
    y += h + 5;
  }

  // worked example: inquiry 4 as a construction line
  textSize(ts);
  const exLines = wrapLines('Construction line for inquiry 4: ' + exampleLine, innerW - 16);
  const exH = exLines.length * lh + 12;
  if (doDraw) {
    fill('white');
    stroke('steelblue');
    rect(margin, y, innerW, exH, 6);
    noStroke();
    fill('midnightblue');
    drawLines(exLines, margin + 8, y + 6, lh);
  }
  y += exH + 8;

  const verdict = n >= 5 ? MSG_MASTERY : 'Mastery is 5 of 6 on the first attempt. Review the reasons above, then press Start over.';
  const vLines = boldWrap('Final score: ' + n + ' of 6. ' + verdict, innerW);
  if (doDraw) {
    textStyle(BOLD);
    fill(n >= 5 ? 'darkgreen' : 'darkred');
    drawLines(vLines, margin, y, lh);
    textStyle(NORMAL);
  }
  y += vLines.length * lh;
  return y;
}

function drawSummary() {
  let ts = 16;
  while (ts > 11 && layoutSummary(ts, false) > drawHeight - 6) ts--;
  layoutSummary(ts, true);
}

// ---------- keyboard: A-D select, Enter commits (or moves on once committed) ----------
function keyPressed() {
  const k = key.toUpperCase();
  const idx = letters.indexOf(k);
  if (idx >= 0) {
    selectOption(idx);
  } else if (keyCode === ENTER) {
    const r = records[current];
    if (selected >= 0) commitRecommendation();
    else if (!showSummary && r.first >= 0) nextInquiry();
  }
}

// ---------- responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  redraw();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    canvasWidth = container.offsetWidth;
  }
}
