// Airstream Condition Sorter - p5.js MicroSim (Chapter 2: Airstreams, Total Pressure and Standard Air)
// CANVAS_HEIGHT: 565
// Ten application descriptions, shuffled. For each, the learner selects every airstream
// condition it has (hot, wet, corrosive, particulate-laden, explosive atmosphere) or Clean,
// and submits; an item is correct only when the set matches the key exactly. One attempt per
// item; the feedback names the missing and extra tags. Only the first run counts as evidence.
// Built on the FanPedia kit: FP.CardDeck (shuffle, one attempt, score, mastery, summary),
// FP.p5 (layout, text, buttons, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js (load them before
// this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch02-airstream-condition-sorter';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 380;
const controlHeight = K.controlHeightFor(5);   // tag rows + Submit/Next/Start over (320 px needs 5)
const canvasHeight = drawHeight + controlHeight;

// ---------- Tags (spec Content) ----------
const TAGS = [
  { key: 'hot', name: 'Hot', def: 'temperature high enough to change performance or call for construction beyond the standard catalog build.' },
  { key: 'wet', name: 'Wet', def: 'enough water vapor, mist or steam that liquid can condense and collect in the fan.' },
  { key: 'corrosive', name: 'Corrosive', def: 'gases, vapors or mists that chemically attack the fan\'s materials.' },
  { key: 'particulate', name: 'Particulate-laden', def: 'carries solid material such as dust, grit, chips, fibers or lint.' },
  { key: 'explosive', name: 'Explosive atmosphere', def: 'contains flammable gases, vapors or combustible dusts that a spark could ignite.' },
  { key: 'clean', name: 'Clean', def: 'none of the above; ordinary air near standard conditions.' }
];
const TAG_NAME = Object.fromEntries(TAGS.map(t => [t.key, t.name]));
const tagList = keys => TAGS.filter(t => keys.indexOf(t.key) >= 0).map(t => t.name).join(', ');

// ---------- Items (spec table; illustrative applications) ----------
const ITEMS = [
  { id: 1, short: 'Kiln dryer', text: 'Recirculating air inside a kiln dryer at 450°F.', answer: ['hot'],
    why: '450°F is well inside FanPedia\'s high-temperature package ranges; nothing else is described.' },
  { id: 2, short: 'Dishwashing room', text: 'Exhausting steam-laden air from a commercial dishwashing room.', answer: ['wet'],
    why: 'Steam condenses and collects in the housing; it is warm, not hot.' },
  { id: 3, short: 'Chemical storage room', text: 'Dry, room-temperature exhaust from a chemical storage room containing chlorine compounds.',
    answer: ['corrosive'], why: 'Chlorine compounds attack fan materials; the air is dry and at room temperature.' },
  { id: 4, short: 'Foundry shakeout', text: 'Sand and grit from a foundry shakeout, at ambient temperature.', answer: ['particulate'],
    why: 'Sand is abrasive solid material; it is not combustible.' },
  { id: 5, short: 'Solvent-recovery room', text: 'Exhaust from a solvent-recovery room where flammable vapors are present.',
    answer: ['explosive'], why: 'Flammable vapors could be ignited by a spark from the fan.' },
  { id: 6, short: 'Office supply air', text: 'Filtered outdoor air supplied to an office floor.', answer: ['clean'],
    why: 'Filtered outdoor air near 70°F has none of the five conditions.' },
  { id: 7, short: 'Swimming pool hall', text: 'Exhaust from an indoor swimming pool hall: warm, humid air containing chlorine compounds.',
    answer: ['wet', 'corrosive'], why: 'The humidity condenses and the chlorine compounds attack materials; the air is warm, not hot.' },
  { id: 8, short: 'Feed-mill elevator', text: 'Grain dust drawn from a feed-mill bucket elevator.', answer: ['particulate', 'explosive'],
    why: 'Grain dust is solid material and is also a combustible dust.' },
  { id: 9, short: 'Heat-treating oven', text: 'Clean air leaving a heat-treating oven at 700°F.', answer: ['hot'],
    why: '700°F calls for high-temperature construction; the air is stated to be clean.' },
  { id: 10, short: 'Laundry dryers', text: 'Warm, moist exhaust from commercial laundry dryers carrying lint.', answer: ['wet', 'particulate'],
    why: 'Moisture condenses in the duct and fan, and lint is fibrous solid material.' }
].map(c => Object.assign(c, { answerText: tagList(c.answer) }));

const MASTERY = 8;
const PROMPT = 'Which conditions does this airstream have? Select all that apply.';

// Exact set match; the choice is an array of tag keys.
function sameSet(a, b) { return a.length === b.length && a.every(k => b.indexOf(k) >= 0); }

const deck = new FP.CardDeck({
  cards: ITEMS, shuffle: true, attempts: 1, retryMissed: false,
  noun: 'Items', mastery: MASTERY, id: SIM_ID,
  reviewPointer: 'Reread "The Airstreams Fans Handle", then Start over (practice only)',
  check: (card, choice) => sameSet(card.answer, choice),
  // Spec: incorrect reads "Not quite. Missing: <tags>. Extra: <tags>. <Why>."
  messages: {
    missed: res => {
      const missing = res.card.answer.filter(k => res.chosen.indexOf(k) < 0);
      const extra = res.chosen.filter(k => res.card.answer.indexOf(k) < 0);
      const parts = [FP.msg.BAD + ' Not quite.'];
      if (missing.length) parts.push('Missing: ' + tagList(missing) + '.');
      if (extra.length) parts.push('Extra: ' + tagList(extra) + '.');
      parts.push(res.card.why);
      return parts.join(' ');
    }
  }
});

// ---------- State ----------
let selected = [];       // tag keys chosen for the face-up item
let result = null;       // last place() result while the item is face up
let infoKey = null;      // tag whose definition is shown
let notice = '';         // "Select at least one tag" reminder
let firstRun = null;     // summary of the first run (the evidence)

// ---------- Controls ----------
let tagButtons = [], infoButtons = [], submitButton, nextButton, startOverButton;

const keys = K.keys.bind({
  '1': () => toggleTag(0), '2': () => toggleTag(1), '3': () => toggleTag(2),
  '4': () => toggleTag(3), '5': () => toggleTag(4), '6': () => toggleTag(5),
  Enter: onEnter
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  TAGS.forEach((t, i) => {
    const b = K.button(t.name, () => toggleTag(i));
    b.addClass('choice');
    b.attribute('aria-pressed', 'false');
    b.attribute('aria-keyshortcuts', String(i + 1));
    tagButtons.push(b);
    const info = K.button('ⓘ', () => showInfo(t.key), { variant: 'secondary' });
    info.addClass('acs-info');
    info.attribute('aria-label', 'Definition of ' + t.name);
    info.attribute('title', 'Definition of ' + t.name);
    infoButtons.push(info);
  });
  submitButton = K.button('Submit', submit);
  nextButton = K.button('Next item', nextItem);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  syncControls();

  describe('Airstream condition sorter. Ten short descriptions of fan applications appear one at a time ' +
    'in shuffled order. For each, select every condition tag that applies: hot, wet, corrosive, ' +
    'particulate-laden, explosive atmosphere, or clean, and press Submit. Each tag has an information ' +
    'button with its definition. Feedback names missing and extra tags and gives the reason; after ten ' +
    'items the sim shows the score and lists any missed items with their correct tags.');
}

// ---------- Control state and layout ----------
function syncControls() {
  const had = document.activeElement;
  const st = deck.state();
  const choosing = st.phase === 'choose';
  tagButtons.forEach((b, i) => {
    b.attribute('aria-pressed', selected.indexOf(TAGS[i].key) >= 0 ? 'true' : 'false');
    K.setEnabled(b, choosing);
  });
  K.setEnabled(submitButton, choosing);
  if (choosing) { submitButton.show(); nextButton.hide(); } else { submitButton.hide(); nextButton.show(); }
  if (st.phase === 'summary') nextButton.hide();
  nextButton.html(st.isLast ? 'See score' : 'Next item');
  positionControls();
  K.keepFocus(had, [...tagButtons, submitButton, nextButton, startOverButton]);
}

// Tag + info button pairs flow left to right and wrap as units; then the action buttons.
function positionControls() {
  const x0 = 10, maxX = canvasWidth - 10, gap = 4, pairGap = 12;
  let row = 0, x = x0;
  const place = (els, gapAfter) => {
    const w = els.reduce((s, e) => s + (e.elt.offsetWidth || 60), 0) + gap * (els.length - 1);
    if (x > x0 && x + w > maxX) { row++; x = x0; }
    let xx = x;
    els.forEach(e => { e.position(xx, K.controlRow(row)); xx += (e.elt.offsetWidth || 60) + gap; });
    x = x + w + gapAfter;
  };
  TAGS.forEach((t, i) => place([tagButtons[i], infoButtons[i]], pairGap));
  const st = deck.state();
  const action = st.phase === 'choose' ? submitButton : (st.phase === 'feedback' ? nextButton : null);
  x += 8;
  place(action ? [action, startOverButton] : [startOverButton], pairGap);
}

// ---------- Actions ----------
function toggleTag(i) {
  if (deck.state().phase !== 'choose') return;
  const key = TAGS[i].key;
  if (selected.indexOf(key) >= 0) {
    selected = selected.filter(k => k !== key);
  } else if (key === 'clean') {
    selected = ['clean'];                                 // Clean clears every other tag
  } else {
    selected = selected.filter(k => k !== 'clean').concat(key);   // any tag clears Clean
  }
  notice = '';
  syncControls();
  FP.announce(TAGS[i].name + (selected.indexOf(key) >= 0 ? ' selected' : ' not selected') +
    '. Selected: ' + (selected.length ? tagList(selected) : 'none') + '.');
}

function showInfo(key) {
  infoKey = key;
  FP.announce(TAG_NAME[key] + ': ' + TAGS.find(t => t.key === key).def);
}

function submit() {
  if (deck.state().phase !== 'choose') return;
  if (!selected.length) {
    notice = 'Select at least one tag (or Clean) before you submit.';
    FP.announce(notice);
    return;
  }
  const choice = TAGS.map(t => t.key).filter(k => selected.indexOf(k) >= 0);
  result = deck.place(choice);
  if (result.status === 'ignored') return;
  syncControls();
  FP.announce(result.message + ' Correct tags: ' + result.card.answerText + '.');
  nextButton.elt.focus();
}

function nextItem() {
  if (!deck.next()) return;
  selected = [];
  result = null;
  notice = '';
  const st = deck.state();
  if (st.phase === 'summary') {
    if (!firstRun) firstRun = deck.summary();
    syncControls();
    const s = deck.summary();
    FP.announce(scoreLine(s) + '. ' + s.lines[1] + ' ' + missedLines(s).join(' '));
    startOverButton.elt.focus();
  } else {
    syncControls();
    FP.announce('Item ' + (st.index + 1) + ' of ' + st.count + ': ' + st.card.text);
    submitButton.elt.focus();   // keys 1-6 toggle tags; Enter submits
  }
}

function startOver() {
  deck.newRound();
  selected = [];
  result = null;
  notice = '';
  syncControls();
  const st = deck.state();
  FP.announce('New shuffle. Item 1 of ' + st.count + ': ' + st.card.text);
  submitButton.elt.focus();   // keys 1-6 toggle tags; Enter submits
}

function onEnter() {
  const ph = deck.state().phase;
  if (ph === 'choose') submit(); else if (ph === 'feedback') nextItem();
}

// ---------- Text ----------
function scoreLine(s) { return 'Score: ' + s.firstAttempt + ' of ' + s.total; }
function missedLines(s) {
  return s.misses.map(m => FP.msg.BAD + ' ' + m.card.short + ': ' + m.answer + '.');
}
function practiceRun() { return deck.state().round > 1; }

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = deck.state();
  let y = K.title('Airstream Condition Sorter');
  const right = st.phase === 'summary' ? (practiceRun() ? 'Practice run done' : 'Run complete')
    : 'Item ' + (st.index + 1) + ' of ' + st.count + (practiceRun() ? ' · practice run' : '');
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 2 });
  K.note(canvasWidth >= 600
    ? ['Illustrative applications', 'Keys: 1-6 toggle tags, Enter submits, then next']
    : ['Illustrative', 'Keys 1-6, Enter']);

  const top = y + 2, bottom = drawHeight - 24;
  const defH = infoKey ? defBoxHeight() : 0;
  const panelBottom = bottom - (defH ? defH + 6 : 0);
  K.panel(10, top, canvasWidth - 20, panelBottom - top);
  const tx = 20, tw = canvasWidth - 40, avail = panelBottom - top - 16;
  const ts = K.fitTextSize(t => content(tx, top + 8, tw, t, st, true) - (top + 8), avail, 16, 12);
  content(tx, top + 8, tw, ts, st, false);
  if (defH) drawDefinition(bottom - defH, defH);
}

function defBoxHeight() {
  const fs = canvasWidth < 480 ? 13 : 14;
  textSize(fs);
  textStyle(NORMAL);
  return K.countLines(definitionText(), canvasWidth - 36) * Math.round(fs * 1.3) + 10;
}
function definitionText() {
  return 'ⓘ ' + TAG_NAME[infoKey] + ': ' + TAGS.find(t => t.key === infoKey).def;
}
function drawDefinition(top, h) {
  const fs = canvasWidth < 480 ? 13 : 14;
  K.panel(10, top, canvasWidth - 20, h, { fill: '--fp-primary-bg', stroke: '--fp-primary' });
  noStroke();
  fill(FP.tok('text'));
  textSize(fs);
  textStyle(NORMAL);
  K.wrapText(definitionText(), 18, top + 5, canvasWidth - 36, Math.round(fs * 1.3));
}

// Lays out (or measures, with dry) the item or the summary; returns the y below it.
function content(x, y, w, ts, st, dry) {
  const lead = Math.round(ts * 1.3);
  const gap = 6;
  noStroke();
  textAlign(LEFT, TOP);
  const para = (str, col, opts) => {
    opts = opts || {};
    const s = opts.big ? ts + 2 : ts;
    textSize(s);
    textStyle(opts.bold ? BOLD : NORMAL);
    if (!dry) fill(col);
    y = K.wrapText(str, x, y, w, Math.round(s * 1.3), { dryRun: dry }) + (opts.gap != null ? opts.gap : gap);
    textStyle(NORMAL);
  };

  if (st.phase === 'summary') {
    const s = deck.summary();
    para(scoreLine(s), FP.tok('text'), { bold: true, big: true });
    para(s.lines[1], s.mastered ? FP.tok('primary-dark') : FP.tok('text'), { bold: s.mastered });
    if (practiceRun() && firstRun) {
      para('Practice run (not evidence). Your first run scored ' + firstRun.firstAttempt + ' of ' + firstRun.total +
        (firstRun.mastered ? ', mastery reached.' : '.'), FP.tok('text-muted'));
    }
    const missed = missedLines(s);
    if (missed.length) {
      para('Missed items and their correct tags:', FP.tok('text'), { bold: true, gap: 2 });
      missed.forEach(m => para(m, FP.tok('text'), { gap: 1 }));
    } else {
      para('No missed items: every set matched the key. Press Start over for a new shuffle (practice only).',
        FP.tok('text'));
    }
    return y - gap;
  }

  para(st.card.text, FP.tok('text'), { bold: true, big: true });
  para(PROMPT, FP.tok('text-muted'));
  para('Selected: ' + (selected.length ? tagList(selected) : 'none'), FP.tok('text'));
  if (notice) para('ℹ ' + notice, FP.tok('primary-dark'));
  if (result && result.message) {
    const ok = result.kind === 'ok';
    const lines = [result.message];
    if (!ok) lines.push('Correct tags: ' + result.card.answerText + '.');
    textSize(ts);
    // measure each line in the style it is drawn in (the answer key is bold, so it wraps sooner)
    const h = lines.reduce((a, l, i) => {
      textStyle(i === 0 ? NORMAL : BOLD);
      return a + K.countLines(l, w - 16) * lead;
    }, 0) + 12;
    textStyle(NORMAL);
    if (!dry) {
      K.panel(x - 4, y - 2, w + 8, h, {
        fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg',
        stroke: ok ? '--fp-correct' : '--fp-incorrect', dashed: !ok, weight: 2, radius: 6
      });
      let yy = y + 4;
      lines.forEach((l, i) => {
        fill(i === 0 ? FP.tok(ok ? 'correct' : 'incorrect') : FP.tok('text'));
        textStyle(i === 0 ? NORMAL : BOLD);
        yy = K.wrapText(l, x + 4, yy, w - 16, lead);
      });
      textStyle(NORMAL);
    }
    y += h + gap;
  }
  return y - gap;
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
