// Fan Selection Workflow - Mermaid flowchart with a card-sorting check
// CANVAS_HEIGHT: 1040
// Every one of the 12 steps carries a Mermaid `click` directive that opens its explanation.
// Learners then assign 8 information cards (fixed order, one attempt each) to the step that uses them.
// Job values on the cards (1,450 RPM; 1,180/1,780 RPM; 500°F / 70°F; 95 dB; 10 ft by 8 ft pad)
// are the chapter's illustrative worked example, not catalog data.

const CHAPTER_URL = '../../chapters/27-fan-selection-and-writing-the-specification/';

const STEPS = [
  null,
  { label: 'Application requirements', phase: 'duty',
    info: 'Collect airflow, pressure, airstream conditions, space, noise and efficiency limits before choosing anything.' },
  { label: 'Correct duty point to standard air', phase: 'duty',
    info: 'Divide the required static pressure by the density ratio so it can be read from a standard-air catalog table.' },
  { label: 'Fan family and impeller', phase: 'fan',
    info: 'Choose the impeller the airstream allows: clean air permits airfoil or backward curved, dusty air pushes toward radial tip or radial bladed.' },
  { label: 'Size and speed from catalog', phase: 'fan',
    info: 'Read the size, RPM and standard-air brake horsepower from the current catalog performance table.' },
  { label: 'Arrangement', phase: 'config',
    info: 'Decide where impeller, bearings and motor sit; hot or dirty air favors bearings out of the airstream.' },
  { label: 'Drive', phase: 'config',
    info: 'Choose belt drive or direct drive so the fan turns at the speed the table requires.' },
  { label: 'Construction', phase: 'config',
    info: 'Choose pressure class, materials, temperature package and spark resistance.' },
  { label: 'Motor and cold start', phase: 'config',
    info: 'Size the motor for the densest air the fan will ever start in.' },
  { label: 'Accessories', phase: 'config',
    info: 'Add the parts the application needs: dampers, liners, doors, drains, bases, isolators, flex connectors.' },
  { label: 'Sound and dimension check', phase: 'prove',
    info: 'Compare octave band sound data with the noise limit and the dimension table with the space.' },
  { label: 'Compare candidates', phase: 'prove',
    info: 'Weigh two or three candidate fans on performance, construction and accessories.' },
  { label: 'Description and specification', phase: 'doc',
    info: 'Write the complete fan description and the specification, then review both.' }
];

// Edge labels from the spec: i -> i+1
const EDGE_LABELS = [null, 'duty point', 'airstream', 'standard-air duty', 'size', 'motor location',
  'speed', 'temperature range', 'motor', 'complete fan', 'passes limits', 'chosen fan'];

// Cards in fixed order; section = chapter section to reread when missed.
const CARDS = [
  { text: 'The plant sits at 5,000 ft elevation.', step: 2,
    why: 'Elevation changes air density, which changes the standard-air pressure you read from the table.',
    section: 'Fan Selection: From Duty Point to Catalog Size', anchor: 'fan-selection-from-duty-point-to-catalog-size' },
  { text: 'The table speed of 1,450 RPM falls between the 1,180 and 1,780 RPM motor speeds.', step: 6,
    why: 'Matching fan speed to motor speed is the drive decision.',
    section: 'Drive Selection', anchor: 'drive-selection' },
  { text: 'On a winter startup the duct air is 70°F, not 500°F.', step: 8,
    why: 'Cold air is denser and takes more power, so it sizes the motor.',
    section: 'Cold Start Motor Sizing', anchor: 'cold-start-motor-sizing' },
  { text: 'The bearings must stay out of the 500°F gas.', step: 5,
    why: 'The arrangement decides whether bearings sit in or out of the airstream.',
    section: 'Arrangement Selection', anchor: 'arrangement-selection' },
  { text: 'The dust is sticky and abrasive.', step: 3,
    why: 'Dust that builds up or erodes rules out airfoil and backward curved wheels.',
    section: 'Impeller Selection', anchor: 'impeller-selection' },
  { text: 'The fan sits on spring isolators on a mezzanine.', step: 9,
    why: 'Isolators, an isolation base and flex connectors are accessories.',
    section: 'Accessory Selection', anchor: 'accessory-selection' },
  { text: 'The owner limits outlet sound to 95 dB A-weighted sound power.', step: 10,
    why: 'A noise limit is checked against the octave band sound data.',
    section: 'Octave Band Sound Data', anchor: 'octave-band-sound-data' },
  { text: 'The fan must fit a 10 ft by 8 ft pad.', step: 10,
    why: 'A space limit is checked against the dimension table.',
    section: 'Dimensional Data Table', anchor: 'dimensional-data-table' }
];

const PHASE_STYLE = {
  duty:   'fill:#dbeafe,stroke:#1e3a8a,stroke-width:2px,color:#1e293b,font-size:16px',
  fan:    'fill:#ede9fe,stroke:#4c1d95,stroke-width:2px,color:#1e293b,font-size:16px',
  config: 'fill:#fef3c7,stroke:#78350f,stroke-width:2px,color:#1e293b,font-size:16px',
  prove:  'fill:#ccfbf1,stroke:#134e4a,stroke-width:2px,color:#1e293b,font-size:16px',
  doc:    'fill:#fce7f3,stroke:#831843,stroke-width:2px,color:#1e293b,font-size:16px'
};

const MASTERY = 7;

let cardIndex = 0;     // index of the card currently shown
let answered = false;  // current card already submitted (locked)
let results = [];      // true/false per submitted card

function stepName(n) { return 'step ' + n + ', ' + STEPS[n].label; }

function buildMermaid() {
  const lines = ['flowchart TD'];
  for (let i = 1; i <= 12; i++) {
    lines.push(`    S${i}["${i} · ${STEPS[i].label}"]:::${STEPS[i].phase}`);
  }
  for (let i = 1; i < 12; i++) {
    lines.push(`    S${i} -->|"${EDGE_LABELS[i]}"| S${i + 1}`);
  }
  lines.push('    S10 -. "fails space or noise: revise" .-> S5');
  // One click directive per node: each opens that step's explanation.
  for (let i = 1; i <= 12; i++) {
    lines.push(`    click S${i} showStepInfo`);
  }
  for (const [k, v] of Object.entries(PHASE_STYLE)) lines.push(`    classDef ${k} ${v}`);
  lines.push('    linkStyle default stroke:#64748b,stroke-width:2px');
  lines.push('    linkStyle 11 stroke:#b91c1c,stroke-width:2px');
  return lines.join('\n');
}

function nodeEl(n) {
  const all = document.querySelectorAll('#diagram .node');
  for (const el of all) {
    const m = el.id.match(/flowchart-(S\d+)-\d+$/);
    if (m && m[1] === 'S' + n) return el;
  }
  return null;
}

// Mermaid writes classDef styles inline with !important, so highlights are applied
// to the node shape the same way and restored from the saved original style.
const HL_STYLE = {
  'hl-focus':   { stroke: '#1d4ed8', 'stroke-width': '3px', 'stroke-dasharray': '6 3' },
  'hl-info':    { stroke: '#1d4ed8', 'stroke-width': '4px' },
  'hl-correct': { stroke: '#15803d', 'stroke-width': '5px', fill: '#bbf7d0' },
  'hl-wrong':   { stroke: '#b91c1c', 'stroke-width': '5px', fill: '#fecaca' }
};
const HL_ORDER = ['hl-focus', 'hl-info', 'hl-wrong', 'hl-correct'];  // later wins

function shapeOf(el) { return el.querySelector('rect, polygon, path'); }

function paintNode(el) {
  const shape = shapeOf(el);
  if (!shape) return;
  if (shape.dataset.origStyle === undefined) shape.dataset.origStyle = shape.getAttribute('style') || '';
  shape.setAttribute('style', shape.dataset.origStyle);
  for (const cls of HL_ORDER) {
    if (!el.classList.contains(cls)) continue;
    for (const [prop, val] of Object.entries(HL_STYLE[cls])) shape.style.setProperty(prop, val, 'important');
  }
}

function addHighlight(el, cls) { if (el) { el.classList.add(cls); paintNode(el); } }

function clearHighlights(cls) {
  document.querySelectorAll('#diagram .node.' + cls).forEach(el => { el.classList.remove(cls); paintNode(el); });
}

// Called by the Mermaid click directives (securityLevel: 'loose').
window.showStepInfo = function (nodeId) {
  const n = parseInt(String(nodeId).replace(/^S/, ''), 10);
  if (!STEPS[n]) return;
  clearHighlights('hl-info');
  const el = nodeEl(n);
  addHighlight(el, 'hl-info');
  const box = document.getElementById('stepInfo');
  box.innerHTML = '';
  const t = document.createElement('div');
  t.className = 'si-title';
  t.textContent = 'Step ' + n + ': ' + STEPS[n].label;
  const p = document.createElement('div');
  p.textContent = STEPS[n].info;
  box.appendChild(t);
  box.appendChild(p);
  positionInfo(el);
};

// Y-follow: place the explanation card level with the clicked node, kept below the
// sorting controls and inside the panel. Re-run whenever the controls change size.
let infoNode = null;
function positionInfo(el) {
  if (el !== undefined) infoNode = el;
  const panel = document.querySelector('.info-panel').getBoundingClientRect();
  const box = document.getElementById('stepInfo');
  const fb = document.getElementById('feedback');
  const above = (fb.offsetHeight > 0 ? fb : document.querySelector('.info-panel .row')).getBoundingClientRect();
  const minTop = above.bottom - panel.top + 12;
  const maxTop = Math.max(minTop, panel.height - box.offsetHeight - 10);
  let desired = minTop;
  if (infoNode) {
    const r = infoNode.getBoundingClientRect();
    desired = r.top + r.height / 2 - panel.top - box.offsetHeight / 2;
  }
  box.style.top = Math.max(minTop, Math.min(maxTop, desired)) + 'px';
}

function renderProgress() {
  const bar = document.getElementById('progress');
  bar.innerHTML = '';
  for (let i = 0; i < CARDS.length; i++) {
    const b = document.createElement('b');
    if (i < results.length) b.className = results[i] ? 'ok' : 'no';
    else if (i === cardIndex) b.className = 'cur';
    bar.appendChild(b);
  }
}

function showCard() {
  const c = CARDS[cardIndex];
  answered = false;
  document.getElementById('cardNum').textContent = 'Card ' + (cardIndex + 1) + ' of ' + CARDS.length;
  document.getElementById('cardText').textContent = c.text;
  document.getElementById('prompt').textContent = 'Which step uses this information?';
  const sel = document.getElementById('stepSelect');
  sel.disabled = false;
  sel.value = '';
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('submitBtn').style.display = '';
  document.getElementById('nextBtn').style.display = 'none';
  document.getElementById('restartBtn').style.display = 'none';
  const fb = document.getElementById('feedback');
  fb.className = 'feedback';
  fb.textContent = '';
  clearHighlights('hl-correct');
  clearHighlights('hl-wrong');
  renderProgress();
  positionInfo();
}

function submitAnswer() {
  if (answered) return;
  const sel = document.getElementById('stepSelect');
  const chosen = parseInt(sel.value, 10);
  if (!chosen) return;
  answered = true;  // one attempt per card: lock it
  const c = CARDS[cardIndex];
  const ok = chosen === c.step;
  results.push(ok);
  sel.disabled = true;
  document.getElementById('submitBtn').disabled = true;

  const fb = document.getElementById('feedback');
  if (ok) {
    fb.className = 'feedback ok';
    fb.textContent = 'Right: ' + c.why;
  } else {
    fb.className = 'feedback no';
    fb.textContent = 'Not quite. This belongs to ' + stepName(c.step) + ': ' + c.why;
    const wrongEl = nodeEl(chosen);
    addHighlight(wrongEl, 'hl-wrong');
  }
  const rightEl = nodeEl(c.step);
  addHighlight(rightEl, 'hl-correct');
  renderProgress();

  if (cardIndex < CARDS.length - 1) {
    document.getElementById('nextBtn').style.display = '';
    document.getElementById('nextBtn').focus();
  } else {
    showFinal();
  }
  positionInfo();
}

function showFinal() {
  const n = results.filter(Boolean).length;
  const fb = document.getElementById('feedback');
  const last = fb.textContent;
  fb.className = 'feedback final';
  fb.innerHTML = '';
  const lastLine = document.createElement('div');
  lastLine.textContent = 'Card 8: ' + last;
  lastLine.style.marginBottom = '6px';
  fb.appendChild(lastLine);
  const score = document.createElement('div');
  score.style.fontWeight = 'bold';
  score.textContent = n + ' of 8 correct' + (n >= MASTERY ? ' — mastery reached.' : '.');
  fb.appendChild(score);
  if (n < MASTERY) {
    const missed = [];
    results.forEach((r, i) => {
      if (!r && !missed.some(m => m.anchor === CARDS[i].anchor)) missed.push(CARDS[i]);
    });
    const p = document.createElement('div');
    p.style.marginTop = '4px';
    p.appendChild(document.createTextNode('Reread these sections, then try again: '));
    missed.forEach((m, i) => {
      const a = document.createElement('a');
      a.href = CHAPTER_URL + '#' + m.anchor;
      a.target = '_top';
      a.textContent = m.section;
      p.appendChild(a);
      if (i < missed.length - 1) p.appendChild(document.createTextNode('; '));
    });
    p.appendChild(document.createTextNode('.'));
    fb.appendChild(p);
  }
  document.getElementById('prompt').textContent = 'All 8 cards sorted.';
  document.getElementById('submitBtn').style.display = 'none';
  document.getElementById('nextBtn').style.display = 'none';
  document.getElementById('restartBtn').style.display = '';
}

function restart() {
  cardIndex = 0;
  results = [];
  showCard();
}

function setupControls() {
  const sel = document.getElementById('stepSelect');
  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = 'Choose a step…';
  sel.appendChild(ph);
  for (let i = 1; i <= 12; i++) {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = i + ' · ' + STEPS[i].label;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => {
    document.getElementById('submitBtn').disabled = answered || !sel.value;
  });
  document.getElementById('submitBtn').addEventListener('click', submitAnswer);
  document.getElementById('nextBtn').addEventListener('click', () => {
    cardIndex++;
    showCard();
  });
  document.getElementById('restartBtn').addEventListener('click', restart);
}

// Keyboard access: Tab to a step, Enter or Space opens its explanation.
function setupNodeKeyboard() {
  for (let i = 1; i <= 12; i++) {
    const el = nodeEl(i);
    if (!el) continue;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Step ' + i + ': ' + STEPS[i].label);
    el.addEventListener('focus', () => addHighlight(el, 'hl-focus'));
    el.addEventListener('blur', () => { el.classList.remove('hl-focus'); paintNode(el); });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.showStepInfo('S' + i); }
    });
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  setupControls();
  showCard();
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',   // required for click callbacks
    theme: 'default',
    themeVariables: { fontSize: '16px', fontFamily: 'Arial, Helvetica, sans-serif' },
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis',
                 nodeSpacing: 30, rankSpacing: 18, padding: 6, wrappingWidth: 330 }
  });
  const host = document.getElementById('diagram');
  const pre = document.createElement('pre');
  pre.className = 'mermaid';
  pre.textContent = buildMermaid();
  host.appendChild(pre);
  await mermaid.run({ nodes: [pre] });
  setupNodeKeyboard();
  positionInfo();
});
