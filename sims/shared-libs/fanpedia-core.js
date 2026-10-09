/* fanpedia-core.js — FanPedia MicroSim kit, core (library-agnostic).
 * Version 1.2.0 (2026-10-09). Namespace: window.FP. No modules, no build step.
 *
 * Provides: FP.tok, FP.fmt, FP.check, FP.msg, FP.Score, FP.rng, FP.announce,
 * FP.events, FP.embedded, FP.ui (small DOM helpers), FP.svg (✓/✗ paths), FP.ChallengeRunner,
 * FP.CardDeck.
 *
 * Rules: defines nothing outside FP; safe in any load order and when loaded
 * twice; every window/document use is guarded so the pure logic runs under
 * Node (`require`) for tests. Load order in main.html:
 * fanpedia-sim.css -> library (p5, Chart.js, ...) -> shared-libs -> sim.js.
 * API reference: templates/microsim/kit-docs/core.md (not published).
 */
(function (root) {
  'use strict';
  var FP = root.FP = root.FP || {};
  FP.version = '1.2.0';

  var hasDoc = typeof document !== 'undefined' && !!document.documentElement;

  // ---------------------------------------------------------------- tokens
  // Review §4.1. Names without the leading "--fp-"; hex fallbacks so JS
  // works without the stylesheet (and under Node).
  var TOKENS = {
    'primary': '#3f51b5',
    'primary-dark': '#303f9f',
    'primary-bg': '#e8eaf6',
    'accent': '#f57c00',
    'accent-text': '#a84300',
    'correct': '#2e7d32',
    'correct-bg': '#e8f5e9',
    'incorrect': '#c62828',
    'incorrect-bg': '#ffebee',
    'info-bg': '#eef2f7',
    'text': '#263238',
    'text-muted': '#546e7a',
    'draw-bg': '#f0f8ff',
    'ctrl-bg': '#ffffff',
    'border': '#c0c0c0',
    'series-1': '#3f51b5',
    'series-2': '#e66100',
    'series-3': '#00897b',
    'series-4': '#8e24aa',
    'series-5': '#6d4c41',
    'air': '#0277bd',
    'metal': '#d3dbe2',
    'metal-side': '#b4c0cb',
    'edge': '#4f5e6b',
    'motor': '#3a86c8',
    'bearing': '#2a8c9a',
    'belt': '#2b2b2b'
  };
  FP.TOKENS = TOKENS;
  /** Dash patterns that pair with --fp-series-1..5 (colour is never the only cue). */
  FP.SERIES_DASH = [[], [7, 4], [2, 3], [10, 3, 2, 3], [1, 3]];
  FP.FONT = 'Arial, Helvetica, sans-serif';

  /** FP.tok('primary') or FP.tok('--fp-primary') -> '#3f51b5' (CSS value if set). */
  FP.tok = function (name) {
    var key = String(name).replace(/^--fp-/, '').replace(/^--/, '');
    if (hasDoc && typeof getComputedStyle === 'function') {
      try {
        var v = getComputedStyle(document.documentElement).getPropertyValue('--fp-' + key);
        if (v && v.trim()) return v.trim();
      } catch (e) { /* fall through to the hex fallback */ }
    }
    return Object.prototype.hasOwnProperty.call(TOKENS, key) ? TOKENS[key] : undefined;
  };

  // ---------------------------------------------------------------- format
  /** num(x, d=0[, {upTo: true}]). upTo: at most d decimals, trailing zeros
   *  trimmed (echoing learner input: num(2.5, 3, {upTo: true}) -> "2.5"). */
  function num(x, decimals, opts) {
    var d = decimals == null ? 0 : decimals;
    x = Number(x);
    if (!isFinite(x)) return '—';
    var s = Math.abs(x).toFixed(d);
    if (opts && opts.upTo && s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    var neg = x < 0 && Number(s) !== 0;
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + parts.join('.');
  }
  function unit(u, defDec) {
    return function (x, decimals, opts) {
      return num(x, decimals == null ? defDec : decimals, opts) + u;
    };
  }
  FP.fmt = {
    /** num(1234.5, 1) -> "1,234.5"; non-finite -> "—". */
    num: num,
    /** numUpTo(2.50, 3) -> "2.5"; numUpTo(1200, 2) -> "1,200" (num with {upTo: true}). */
    numUpTo: function (x, decimals) { return num(x, decimals, { upTo: true }); },
    cfm: unit(' CFM', 0),        // "2,400 CFM"
    inwg: unit(' in. wg', 2),    // "1.50 in. wg"
    bhp: unit(' BHP', 1),        // "9.5 BHP"
    rpm: unit(' RPM', 0),        // "1,750 RPM"
    fpm: unit(' ft/min', 0),     // "1,800 ft/min"
    ft2: unit(' ft²', 2),        // "5.00 ft²"
    degF: unit('°F', 0),         // "70°F" (book style: no space)
    /** "2,400" / " 2400 " / "1.5e3" -> number; empty or non-numeric -> NaN. */
    parseNumber: function (s) {
      if (typeof s === 'number') return isFinite(s) ? s : NaN;
      if (s == null) return NaN;
      var t = String(s).replace(/,/g, '').trim();
      if (t === '') return NaN;
      var x = Number(t);
      return isFinite(x) ? x : NaN;
    }
  };

  // ---------------------------------------------------------------- check
  FP.check = {
    /** True when |x - model| <= tolerance. tol is {rel: 0.02} (fraction of
     *  |model|) or {abs: 0.1}; default {rel: 0.02}. Boundary counts as correct. */
    numeric: function (x, model, tol) {
      x = Number(x); model = Number(model);
      if (!isFinite(x) || !isFinite(model)) return false;
      tol = tol || { rel: 0.02 };
      var limit = tol.abs != null ? Math.abs(tol.abs) : Math.abs(model) * Math.abs(tol.rel);
      var eps = 1e-9 * Math.max(1, Math.abs(model));   // float noise at the boundary
      return Math.abs(x - model) <= limit + eps;
    }
  };

  // ---------------------------------------------------------------- messages
  // Exact wording from review §4.2.
  // A closing ")" ends a sentence only after . ! or ? inside it:
  // "CW UBD (CW 360)" -> "CW UBD (CW 360)."; "(see p. 4.)" is kept.
  function sentence(s) {
    s = s == null ? '' : String(s).trim();
    if (!s) return '';
    return /[.!?]\)?$/.test(s) ? s : s + '.';
  }
  function joinParts() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) {
      var p = arguments[i] == null ? '' : String(arguments[i]).trim();
      if (p) out.push(p);
    }
    return out.join(' ');
  }
  FP.msg = {
    OK: '✓',
    BAD: '✗',
    SEP: ' · ',
    EXPLORE: 'Explore mode',
    RETRY_MISSED: 'Retry missed',
    START_OVER: 'Start over',
    CHECK: 'Check',
    NEXT: 'Next',
    ENTER_NUMBER: 'Enter a number',
    ILLUSTRATIVE: 'Illustrative values',
    /** "✓ Correct: <answer>. <Why>" */
    correct: function (answer, why) {
      return joinParts('✓ Correct: ' + sentence(answer), sentence(why));
    },
    /** "✗ Not quite. <hint or Why> Try again (1 attempt left)." */
    tryAgain: function (hint, left) {
      left = left == null ? 1 : left;
      return joinParts('✗ Not quite.', sentence(hint),
        'Try again (' + left + ' attempt' + (left === 1 ? '' : 's') + ' left).');
    },
    /** "✗ Not quite. The answer is <answer>. <Why> This one counts as missed." */
    missed: function (answer, why) {
      return joinParts('✗ Not quite. The answer is ' + sentence(answer), sentence(why),
        'This one counts as missed.');
    },
    /** "Practice (not scored): <text>" */
    practice: function (text) { return 'Practice (not scored): ' + text; },
    /** "<Noun> correct: n of N" */
    score: function (noun, n, total) { return (noun || 'Items') + ' correct: ' + n + ' of ' + total; },
    /** 1.2: "Correct: n of N" (no noun) */
    scoreBare: function (n, total) { return 'Correct: ' + n + ' of ' + total; },
    /** 1.2: "<Noun> correct on the first attempt: n of N"; noun null/'' ->
     *  "Correct on the first attempt: n of N" */
    scoreFirst: function (noun, n, total) {
      return (noun ? noun + ' correct' : 'Correct') + ' on the first attempt: ' + n + ' of ' + total;
    },
    /** "Attempt 1 of 2" */
    attempt: function (i, n) { return 'Attempt ' + i + ' of ' + n; },
    /** "First-attempt score: n of N" */
    firstAttempt: function (n, total) { return 'First-attempt score: ' + n + ' of ' + total; },
    /** "Mastery reached (M of N needed)." */
    masteryReached: function (m, total) { return 'Mastery reached (' + m + ' of ' + total + ' needed).'; },
    /** "Mastery needs M of N on the first attempt. <review pointer>"; with
     *  on = 'any': "Mastery needs M of N correct. <review pointer>". A pointer
     *  ending in ":" keeps its colon (no ":."). */
    masteryNeeds: function (m, total, pointer, on) {
      var p = pointer == null ? '' : String(pointer).trim();
      return joinParts('Mastery needs ' + m + ' of ' + total +
        (on === 'any' ? ' correct.' : ' on the first attempt.'), /:$/.test(p) ? p : sentence(p));
    },
    /** "Explore mode unlocks after <last item>." */
    exploreLocked: function (last) { return 'Explore mode unlocks after ' + last + '.'; },
    /** "Source: <name>, retrieved <date>" */
    source: function (name, date) { return 'Source: ' + name + (date ? ', retrieved ' + date : ''); },
    /** Data-label line: parts joined with " · ". */
    note: function () {
      var a = Array.prototype.slice.call(arguments);
      if (a.length === 1 && Array.isArray(a[0])) a = a[0];
      return a.filter(function (p) { return p != null && String(p).trim() !== ''; }).join(' · ');
    }
  };

  // ---------------------------------------------------------------- score
  /** new FP.Score({total | items, mastery, noun, masteryOn, scoreLabel, bareLabel}).
   *  Tracks resolved-correct (any attempt) for the running line and
   *  first-attempt correct for the summary and mastery. mastery defaults to
   *  total. masteryOn: 'first' (default, first-attempt correct counts) or
   *  'any' (correct on any attempt counts).
   *  1.2 label options (running line only): scoreLabel 'correct' (default) or
   *  'first' (count first-attempt correct: "<Noun> correct on the first
   *  attempt: n of N"); bareLabel: true drops the noun ("Correct: n of N"). */
  function Score(opts) {
    opts = opts || {};
    this.total = opts.items ? opts.items.length : (opts.total || 0);
    this.mastery = opts.mastery == null ? this.total : opts.mastery;
    this.noun = opts.noun || 'Items';
    this.masteryOn = opts.masteryOn === 'any' ? 'any' : 'first';
    this.scoreLabel = opts.scoreLabel === 'first' ? 'first' : 'correct';
    this.bareLabel = !!opts.bareLabel;
    this.reset();
  }
  Score.prototype.reset = function () {
    this.results = [];   // per index: null | {correct, firstAttempt, attempts}
    for (var i = 0; i < this.total; i++) this.results.push(null);
    return this;
  };
  /** Record the final outcome of item i once; later calls for i are ignored. */
  Score.prototype.record = function (i, correct, attempts) {
    if (i < 0 || i >= this.total || this.results[i]) return false;
    attempts = attempts || 1;
    this.results[i] = { correct: !!correct, firstAttempt: !!correct && attempts === 1, attempts: attempts };
    return true;
  };
  Score.prototype.count = function (key) {
    var n = 0;
    for (var i = 0; i < this.results.length; i++) if (this.results[i] && this.results[i][key]) n++;
    return n;
  };
  Score.prototype.correct = function () { return this.count('correct'); };
  Score.prototype.firstAttempt = function () { return this.count('firstAttempt'); };
  Score.prototype.answered = function () {
    return this.results.filter(function (r) { return !!r; }).length;
  };
  Score.prototype.done = function () { return this.answered() === this.total; };
  /** The count mastery is judged on: firstAttempt() or, with masteryOn 'any', correct(). */
  Score.prototype.masteryCount = function () {
    return this.masteryOn === 'any' ? this.correct() : this.firstAttempt();
  };
  Score.prototype.mastered = function () { return this.masteryCount() >= this.mastery; };
  /** The running line: "<Noun> correct: n of N" by default; see the
   *  scoreLabel / bareLabel options. */
  Score.prototype.label = function () {
    if (this.scoreLabel === 'first') return FP.msg.scoreFirst(this.bareLabel ? '' : this.noun, this.firstAttempt(), this.total);
    return this.correctLabel();
  };
  /** "<Noun> correct: n of N" (or "Correct: n of N" with bareLabel), whatever scoreLabel says. */
  Score.prototype.correctLabel = function () {
    return this.bareLabel ? FP.msg.scoreBare(this.correct(), this.total) : FP.msg.score(this.noun, this.correct(), this.total);
  };
  /** [first-attempt line, mastery line]; with masteryOn 'any' the first line
   *  is the score line ("<Noun> correct: n of N"). */
  Score.prototype.summaryLines = function (pointer) {
    var any = this.masteryOn === 'any';
    return [
      any ? this.correctLabel() : FP.msg.firstAttempt(this.firstAttempt(), this.total),
      this.mastered() ? FP.msg.masteryReached(this.mastery, this.total)
        : FP.msg.masteryNeeds(this.mastery, this.total, pointer, any ? 'any' : undefined)
    ];
  };
  FP.Score = Score;

  // ---------------------------------------------------------------- rng
  function hashSeed(seed) {
    if (typeof seed === 'number' && isFinite(seed)) return seed >>> 0;
    var s = String(seed), h = 1779033703 ^ s.length;
    for (var i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  FP.rng = {
    /** mulberry32: FP.rng.seeded(21)() -> deterministic float in [0, 1). */
    seeded: function (seed) {
      var a = hashSeed(seed);
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    /** Fisher-Yates copy. rng: a function, a seed (number/string), or omitted (Math.random). */
    shuffle: function (arr, rng) {
      if (rng == null) rng = Math.random;
      else if (typeof rng !== 'function') rng = FP.rng.seeded(rng);
      var a = Array.prototype.slice.call(arr);
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }
  };

  // ---------------------------------------------------------------- events
  // Hook for later xAPI: FP.events.on('answered' | 'completed' | 'mastery', fn).
  // Also re-dispatched on window as CustomEvent 'fp:<type>' (detail = payload).
  if (!FP.events) {
    FP.events = (function () {
      var handlers = {};
      return {
        on: function (type, fn) {
          (handlers[type] = handlers[type] || []).push(fn);
          var self = this;
          return function () { self.off(type, fn); };
        },
        off: function (type, fn) {
          var h = handlers[type];
          if (!h) return;
          var i = h.indexOf(fn);
          if (i >= 0) h.splice(i, 1);
        },
        emit: function (type, detail) {
          var h = (handlers[type] || []).slice();
          for (var i = 0; i < h.length; i++) {
            try { h[i](detail); } catch (e) {
              if (typeof console !== 'undefined') console.error('FP.events ' + type + ' handler failed:', e);
            }
          }
          if (typeof root.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
            root.dispatchEvent(new root.CustomEvent('fp:' + type, { detail: detail }));
          }
        }
      };
    })();
  }

  // ---------------------------------------------------------------- announce
  var announceTimer = null;
  /** Speak text through a hidden aria-live="polite" region (created on first use). */
  FP.announce = function (text) {
    if (!hasDoc || !document.body) return text;
    var el = document.getElementById('fp-announce');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fp-announce';
      el.className = 'sr-only';
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('role', 'status');
      // Inline so it stays hidden even without fanpedia-sim.css.
      el.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
        'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
      document.body.appendChild(el);
    }
    // Clear first so repeating the same verdict is announced again.
    el.textContent = '';
    if (announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(function () { el.textContent = text; }, 60);
    return text;
  };

  // ---------------------------------------------------------------- embedded
  function detectEmbedded() {
    if (typeof window === 'undefined') return false;
    try { return window.self !== window.top; } catch (e) { return true; }   // cross-origin parent
  }
  FP.embedded = detectEmbedded();
  if (FP.embedded && hasDoc) {
    // fanpedia-sim.css hides "Back to Lesson Plan" under html.fp-embedded.
    document.documentElement.classList.add('fp-embedded');
  }

  // ---------------------------------------------------------------- DOM helpers
  FP.ui = {
    /** Set a feedback box: kind 'ok'|'bad'|'info'|'final'; announces by default. */
    feedback: function (el, kind, text, opts) {
      if (!el) return;
      el.classList.remove('ok', 'bad', 'info', 'final');
      el.classList.add('fp-feedback', kind);
      if (!el.getAttribute('role')) el.setAttribute('role', 'status');
      el.textContent = text;
      if (!opts || opts.announce !== false) FP.announce(text);
    },
    /** Render results (null | 'correct' | 'missed' | 'practice') as .fp-progress segments. */
    progress: function (el, results, current, noun) {
      if (!el || !hasDoc) return;
      el.classList.add('fp-progress');
      el.innerHTML = '';
      el.setAttribute('role', 'list');
      noun = noun || 'Item';
      for (var i = 0; i < results.length; i++) {
        var s = document.createElement('span');
        var r = results[i];
        var cls = r === 'correct' ? 'ok' : r === 'missed' ? 'bad' : i === current ? 'cur' : 'todo';
        s.className = cls;
        s.setAttribute('role', 'listitem');
        s.setAttribute('aria-label', noun + ' ' + (i + 1) + ' of ' + results.length + ': ' +
          (cls === 'ok' ? 'correct' : cls === 'bad' ? 'missed' : cls === 'cur' ? 'current' : 'not yet'));
        s.setAttribute('aria-current', cls === 'cur' ? 'step' : 'false');
        s.textContent = String(i + 1);
        el.appendChild(s);
      }
    }
  };

  // ---------------------------------------------------------------- SVG marks
  // ✓ / ✗ typed into SVG <text> may render in a colour-emoji font (it ignores
  // fill). Draw them as stroked paths instead.
  function r2(v) { return Math.round(v * 100) / 100; }
  FP.svg = {
    /** Path data for a ✓ ('ok' | 'check') or ✗ ('bad' | 'cross') centred on
     *  (cx, cy) inside a size × size box. Stroke it; do not fill it. */
    markPath: function (kind, cx, cy, size) {
      var h = (size == null ? 12 : size) / 2;
      cx = cx || 0; cy = cy || 0;
      if (kind === 'ok' || kind === 'check' || kind === 'correct') {
        return 'M' + r2(cx - h) + ' ' + r2(cy + 0.05 * h) + ' L' + r2(cx - 0.3 * h) + ' ' + r2(cy + 0.7 * h) +
          ' L' + r2(cx + h) + ' ' + r2(cy - 0.75 * h);
      }
      if (kind === 'bad' || kind === 'cross' || kind === 'incorrect') {
        var k = 0.8 * h;
        return 'M' + r2(cx - k) + ' ' + r2(cy - k) + ' L' + r2(cx + k) + ' ' + r2(cy + k) +
          ' M' + r2(cx + k) + ' ' + r2(cy - k) + ' L' + r2(cx - k) + ' ' + r2(cy + k);
      }
      throw new Error('FP.svg.markPath: kind must be "ok" or "bad"');
    },
    /** An SVG <path> element for the mark: {x, y, size=12, color (token name or
     *  CSS colour; default correct/incorrect), width (stroke, default size/6),
     *  label (aria-label; default none, aria-hidden)}. */
    mark: function (kind, o) {
      o = o || {};
      if (!hasDoc) return null;
      var size = o.size == null ? 12 : o.size;
      var ok = kind === 'ok' || kind === 'check' || kind === 'correct';
      var col = o.color || (ok ? 'correct' : 'incorrect');
      if (FP.TOKENS[String(col).replace(/^--fp-/, '')] !== undefined) col = FP.tok(col);
      var e = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      e.setAttribute('d', FP.svg.markPath(kind, o.x || 0, o.y || 0, size));
      e.setAttribute('fill', 'none');
      e.setAttribute('stroke', col);
      e.setAttribute('stroke-width', String(o.width || Math.max(1.5, size / 6)));
      e.setAttribute('stroke-linecap', 'round');
      e.setAttribute('stroke-linejoin', 'round');
      if (o.label) { e.setAttribute('role', 'img'); e.setAttribute('aria-label', o.label); }
      else e.setAttribute('aria-hidden', 'true');
      return e;
    }
  };

  // ---------------------------------------------------------------- helpers
  function itemAnswerText(item) {
    if (item.answerText != null) return item.answerText;
    if (typeof item.model === 'number') {
      return num(item.model, item.decimals || 0) + (item.unit ? ' ' + item.unit : '');
    }
    return item.answer != null ? String(item.answer) : '';
  }
  function resolveText(v, a, b) { return typeof v === 'function' ? v(a, b) : v; }
  // opts.messages = {correct, retry, missed}: a string or fn(res) replacing the
  // default FP.msg text (res.message holds the default when fn is called).
  function customMessage(messages, res) {
    if (!messages || messages[res.status] == null) return res.message;
    var m = messages[res.status];
    m = typeof m === 'function' ? m(res) : m;
    return m == null ? res.message : String(m);
  }
  function call(fn, arg) { if (typeof fn === 'function') fn(arg); }

  // ---------------------------------------------------------------- ChallengeRunner
  /** Pattern A/E state machine (no UI).
   *  new FP.ChallengeRunner({items, attempts: 2, tolerance: {rel: 0.02}, noun,
   *    mastery, masteryOn: 'first', scoreLabel: 'correct', bareLabel: false,
   *    messages, explore: true, check, id,
   *    onChange, onUnlockExplore, onComplete})
   *  item: {id, prompt, model (number) | answer (any), tolerance, unit, decimals,
   *         answerText, why, hint (string | fn(value, item))}. */
  function ChallengeRunner(opts) {
    this.opts = opts || {};
    this.items = this.opts.items || [];
    this.attempts = this.opts.attempts || 2;
    this.tolerance = this.opts.tolerance || { rel: 0.02 };
    this.score = new Score({ total: this.items.length, mastery: this.opts.mastery, masteryOn: this.opts.masteryOn,
      noun: this.opts.noun || 'Challenges', scoreLabel: this.opts.scoreLabel, bareLabel: this.opts.bareLabel });
    this.restart(true);
  }
  ChallengeRunner.prototype.restart = function (silent) {
    this.index = 0;
    this.used = 0;                 // attempts used on the current item
    this.phase = this.items.length ? 'question' : 'done';   // question | resolved | done
    this.explore = false;
    this.last = null;              // last submit result
    this.results = this.items.map(function () { return null; });
    this.score.reset();
    if (!silent) call(this.opts.onChange, this.state());
    return this;
  };
  ChallengeRunner.prototype.item = function () { return this.items[this.index]; };
  ChallengeRunner.prototype.isCorrect = function (value, item) {
    if (item.check) return !!item.check(value, item);
    if (this.opts.check) return !!this.opts.check(value, item);
    if (typeof item.model === 'number') return FP.check.numeric(value, item.model, item.tolerance || this.tolerance);
    return value === item.answer;
  };
  /** Submit an answer. Returns {status: 'correct'|'retry'|'missed'|'invalid'|'ignored',
   *  kind: 'ok'|'bad'|'info', message, value, attempt, attemptsLeft, item, index}. */
  ChallengeRunner.prototype.submit = function (raw) {
    if (this.phase !== 'question') return { status: 'ignored', kind: 'info', message: '' };
    var item = this.item();
    var value = raw;
    if (typeof item.model === 'number') {
      value = FP.fmt.parseNumber(raw);
      if (isNaN(value)) {
        this.last = { status: 'invalid', kind: 'info', message: FP.msg.ENTER_NUMBER, value: raw,
          attempt: this.used + 1, attemptsLeft: this.attempts - this.used, item: item, index: this.index };
        call(this.opts.onChange, this.state());
        return this.last;
      }
    }
    this.used++;
    var ok = this.isCorrect(value, item);
    var answer = itemAnswerText(item);
    var res = { value: value, attempt: this.used, item: item, index: this.index };
    if (ok) {
      res.status = 'correct'; res.kind = 'ok';
      res.message = FP.msg.correct(answer, resolveText(item.why, value, item));
    } else if (this.used < this.attempts) {
      res.status = 'retry'; res.kind = 'bad';
      res.message = FP.msg.tryAgain(resolveText(item.hint != null ? item.hint : item.why, value, item),
        this.attempts - this.used);
    } else {
      res.status = 'missed'; res.kind = 'bad';
      res.message = FP.msg.missed(answer, resolveText(item.why, value, item));
    }
    res.attemptsLeft = res.status === 'retry' ? this.attempts - this.used : 0;
    res.message = customMessage(this.opts.messages, res);
    if (res.status !== 'retry') {
      this.results[this.index] = ok ? 'correct' : 'missed';
      this.score.record(this.index, ok, this.used);
      this.phase = 'resolved';
    }
    this.last = res;
    FP.events.emit('answered', {
      source: this.opts.id || 'challenge', itemId: item.id != null ? item.id : this.index,
      index: this.index, value: value, correct: ok, attempt: this.used,
      final: res.status !== 'retry', scored: true
    });
    call(this.opts.onChange, this.state());
    return res;
  };
  /** Advance after an item resolves. After the last item the run is done and,
   *  unless opts.explore === false, explore mode unlocks. */
  ChallengeRunner.prototype.next = function () {
    if (this.phase !== 'resolved') return false;
    this.last = null;
    this.used = 0;
    if (this.index < this.items.length - 1) {
      this.index++;
      this.phase = 'question';
    } else {
      this.phase = 'done';
      var summary = this.summary();
      FP.events.emit('completed', { source: this.opts.id || 'challenge', firstAttempt: summary.firstAttempt,
        correct: summary.correct, total: summary.total, mastered: summary.mastered });
      if (summary.mastered) FP.events.emit('mastery', { source: this.opts.id || 'challenge', total: summary.total });
      call(this.opts.onComplete, summary);
      if (this.opts.explore !== false) {
        this.explore = true;
        call(this.opts.onUnlockExplore, summary);
      }
    }
    call(this.opts.onChange, this.state());
    return true;
  };
  ChallengeRunner.prototype.summary = function (pointer) {
    var self = this;
    return {
      correct: this.score.correct(),
      firstAttempt: this.score.firstAttempt(),
      total: this.items.length,
      mastery: this.score.mastery,
      masteryOn: this.score.masteryOn,
      mastered: this.score.mastered(),
      lines: this.score.summaryLines(pointer != null ? pointer : this.opts.reviewPointer),
      misses: this.items.map(function (it, i) { return { item: it, index: i, result: self.results[i] }; })
        .filter(function (m) { return m.result === 'missed'; })
        .map(function (m) { return { item: m.item, index: m.index, answer: itemAnswerText(m.item), why: m.item.why }; })
    };
  };
  ChallengeRunner.prototype.state = function () {
    var item = this.item();
    var lastLabel = this.items.length ? (this.items[this.items.length - 1].label ||
      ('challenge ' + this.items.length)) : '';
    return {
      phase: this.phase, explore: this.explore, index: this.index, item: item,
      attempt: Math.min(this.used + 1, this.attempts), attempts: this.attempts,
      attemptLabel: FP.msg.attempt(Math.min(this.used + 1, this.attempts), this.attempts),
      isLast: this.index === this.items.length - 1,
      results: this.results.slice(), scoreLabel: this.score.label(), last: this.last,
      correct: this.score.correct(), firstAttempt: this.score.firstAttempt(),
      exploreLabel: this.explore ? FP.msg.EXPLORE : FP.msg.exploreLocked(lastLabel)
    };
  };
  FP.ChallengeRunner = ChallengeRunner;

  // ---------------------------------------------------------------- CardDeck
  /** Pattern B/C/D/F/G state machine (no UI).
   *  new FP.CardDeck({cards, shuffle: true, seed, attempts: 1, retryMissed: true,
   *    noun: 'Cards', mastery, masteryOn: 'first', scoreLabel: 'correct',
   *    bareLabel: false, messages, practiceTry: false,
   *    check, label, id, onChange, onComplete})
   *  practiceTry: true allows one unscored try after a card locks as missed;
   *  'always' also after a correct lock; a number sets the tries per card.
   *  card: {id, answer, answerText, why, hint, ...anything the sim draws}. */
  function CardDeck(opts) {
    this.opts = opts || {};
    this.cards = this.opts.cards || [];
    this.attempts = this.opts.attempts || 1;
    this.rng = this.opts.seed != null ? FP.rng.seeded(this.opts.seed) : Math.random;
    this.score = new Score({ total: this.cards.length, mastery: this.opts.mastery, masteryOn: this.opts.masteryOn,
      noun: this.opts.noun || 'Cards', scoreLabel: this.opts.scoreLabel, bareLabel: this.opts.bareLabel });
    this.round = 0;
    this._start(this.cards.slice(), false);
    this.round = 1;
  }
  CardDeck.prototype._order = function (list) {
    return (this.opts.shuffle === false && this.opts.seed == null) ? list : FP.rng.shuffle(list, this.rng);
  };
  // Public read-only fields (kept for the sims that read them): order (cards
  // of the current round, in play order), placements (locked placements of
  // the current round). Prefer getOrder() / getPlacements() / placement(id).
  CardDeck.prototype._start = function (list, practice, kind) {
    this.order = this._order(list);
    this.practice = practice;          // a retry-missed or practice round: not scored
    this.practiceKind = practice ? (kind || 'missed') : null;   // 'missed' | 'all'
    this.index = 0;
    this.used = 0;
    this.practiceUsed = 0;             // unscored practice tries on the locked card
    this.phase = this.order.length ? 'choose' : 'summary';   // choose | feedback | summary
    this.placements = [];              // {card, chosen, correct, attempts}
    this.last = null;
    if (!practice) {
      this.score.reset();
      this.scoredPlacements = this.placements;   // kept through later practice rounds
    }
  };
  CardDeck.prototype.card = function () { return this.order[this.index]; };
  CardDeck.prototype.answerText = function (card) {
    if (card.answerText != null) return card.answerText;
    if (this.opts.label) return this.opts.label(card.answer, card);
    return String(card.answer);
  };
  /** Place the face-up card. Returns {status: 'correct'|'retry'|'missed'|'ignored',
   *  kind, message, card, chosen, attempt, locked, practice}. */
  CardDeck.prototype.place = function (choice) {
    if (this.phase === 'feedback' && this.canPractice()) return this._practiceTry(choice);
    if (this.phase !== 'choose') return { status: 'ignored', kind: 'info', message: '' };
    var card = this.card();
    this.used++;
    var ok = this.opts.check ? !!this.opts.check(card, choice) : choice === card.answer;
    var res = { card: card, chosen: choice, attempt: this.used, practice: this.practice };
    var why = resolveText(card.why, choice, card);
    if (ok) {
      res.status = 'correct'; res.kind = 'ok'; res.message = FP.msg.correct(this.answerText(card), why);
    } else if (this.used < this.attempts) {
      res.status = 'retry'; res.kind = 'bad';
      res.message = FP.msg.tryAgain(resolveText(card.hint != null ? card.hint : why, choice, card),
        this.attempts - this.used);
    } else {
      res.status = 'missed'; res.kind = 'bad'; res.message = FP.msg.missed(this.answerText(card), why);
    }
    res.attemptsLeft = res.status === 'retry' ? this.attempts - this.used : 0;
    res.message = customMessage(this.opts.messages, res);
    if (this.practice) res.message = FP.msg.practice(res.message);
    res.locked = res.status !== 'retry';
    if (res.locked) {
      this.placements.push({ card: card, chosen: choice, correct: ok, attempts: this.used });
      if (!this.practice) this.score.record(this.cards.indexOf(card), ok, this.used);
      this.phase = 'feedback';
    }
    this.last = res;
    FP.events.emit('answered', {
      source: this.opts.id || 'deck', itemId: card.id != null ? card.id : this.cards.indexOf(card),
      index: this.index, value: choice, correct: ok, attempt: this.used, final: res.locked,
      scored: !this.practice
    });
    call(this.opts.onChange, this.state());
    return res;
  };
  /** Practice tries allowed per locked card (0 when opts.practiceTry is off). */
  CardDeck.prototype._practiceLimit = function () {
    var p = this.opts.practiceTry;
    if (!p) return 0;
    return typeof p === 'number' ? Math.max(0, Math.floor(p)) : 1;
  };
  /** True while the locked card takes an unscored practice try (opts.practiceTry). */
  CardDeck.prototype.canPractice = function () {
    if (this.phase !== 'feedback' || this.practiceUsed >= this._practiceLimit()) return false;
    var p = this.placements[this.placements.length - 1];
    return !!p && (this.opts.practiceTry === 'always' || !p.correct);
  };
  // An unscored try on the locked card: emits answered with scored:false and
  // never touches the score, the placements or the phase.
  CardDeck.prototype._practiceTry = function (choice) {
    var card = this.card();
    this.practiceUsed++;
    var ok = this.opts.check ? !!this.opts.check(card, choice) : choice === card.answer;
    var why = resolveText(card.why, choice, card);
    var res = { card: card, chosen: choice, attempt: this.used + this.practiceUsed, practice: this.practice,
      practiceTry: true, scored: false, locked: true, attemptsLeft: 0 };
    if (ok) { res.status = 'correct'; res.kind = 'ok'; res.message = FP.msg.correct(this.answerText(card), why); }
    else { res.status = 'missed'; res.kind = 'bad'; res.message = FP.msg.missed(this.answerText(card), why); }
    res.message = FP.msg.practice(customMessage(this.opts.messages, res));
    var p = this.placements[this.placements.length - 1];
    (p.practiceTries = p.practiceTries || []).push({ chosen: choice, correct: ok });
    this.last = res;
    FP.events.emit('answered', {
      source: this.opts.id || 'deck', itemId: card.id != null ? card.id : this.cards.indexOf(card),
      index: this.index, value: choice, correct: ok, attempt: res.attempt, final: true, scored: false
    });
    call(this.opts.onChange, this.state());
    return res;
  };
  /** Turn up the next card, or go to the summary after the last one. */
  CardDeck.prototype.next = function () {
    if (this.phase !== 'feedback') return false;
    this.used = 0;
    this.practiceUsed = 0;
    this.last = null;
    if (this.index < this.order.length - 1) {
      this.index++;
      this.phase = 'choose';
    } else {
      this.phase = 'summary';
      if (!this.practice) {
        var s = this.summary();
        FP.events.emit('completed', { source: this.opts.id || 'deck', firstAttempt: s.firstAttempt,
          correct: s.correct, total: s.total, mastered: s.mastered });
        if (s.mastered) FP.events.emit('mastery', { source: this.opts.id || 'deck', total: s.total });
        call(this.opts.onComplete, s);
      }
    }
    call(this.opts.onChange, this.state());
    return true;
  };
  CardDeck.prototype._missList = function (placements) {
    var self = this;
    return (placements || []).filter(function (p) { return !p.correct; }).map(function (p) {
      return { card: p.card, chosen: p.chosen, answer: self.answerText(p.card), why: p.card.why };
    });
  };
  /** Missed placements of the last SCORED round: [{card, chosen, answer, why}].
   *  1.2: unchanged by a Retry-missed or practice round (before 1.2 it
   *  returned the practice round's misses after retryMissed()). */
  CardDeck.prototype.misses = function () { return this._missList(this.scoredPlacements); };
  /** 1.2: misses of the current practice round ([] in a scored round). */
  CardDeck.prototype.practiceMisses = function () { return this.practice ? this._missList(this.placements) : []; };
  /** 1.2: misses of the current round, scored or practice (what retryMissed() replays). */
  CardDeck.prototype.roundMisses = function () { return this._missList(this.placements); };
  /** 1.2: the cards of the current round in play order (a copy). */
  CardDeck.prototype.getOrder = function () { return this.order.slice(); };
  /** 1.2: locked placements [{card, chosen, correct, attempts, practiceTries?}]
   *  of the current round (a copy); {scored: true} gives the last scored round's. */
  CardDeck.prototype.getPlacements = function (o) {
    return ((o && o.scored) ? this.scoredPlacements : this.placements).slice();
  };
  /** 1.2: the current round's placement of a card (by id or card object), or null.
   *  {scored: true} looks in the last scored round instead. */
  CardDeck.prototype.placement = function (idOrCard, o) {
    var list = (o && o.scored) ? this.scoredPlacements : this.placements;
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i].card;
      if (c === idOrCard || (c.id != null && c.id === idOrCard)) return list[i];
    }
    return null;
  };
  CardDeck.prototype.summary = function (pointer) {
    return {
      correct: this.score.correct(),
      firstAttempt: this.score.firstAttempt(),
      total: this.cards.length,
      mastery: this.score.mastery,
      masteryOn: this.score.masteryOn,
      mastered: this.score.mastered(),
      practice: this.practice,
      practiceKind: this.practiceKind,
      lines: this.score.summaryLines(pointer != null ? pointer : this.opts.reviewPointer),
      misses: this.misses(),                 // the last scored round's (1.2)
      practiceMisses: this.practiceMisses(), // 1.2: the current practice round's
      canRetryMissed: this.opts.retryMissed !== false && this.roundMisses().length > 0
    };
  };
  /** Practice round over the cards missed this round (the scored round, or
   *  the practice round just finished); the score is kept. */
  CardDeck.prototype.retryMissed = function () {
    if (this.phase !== 'summary' || this.opts.retryMissed === false) return false;
    var missed = this.roundMisses().map(function (m) { return m.card; });
    if (!missed.length) return false;
    this._start(missed, true, 'missed');
    call(this.opts.onChange, this.state());
    return true;
  };
  /** 1.2: an unscored round over every card (reshuffled like newRound), from
   *  any phase. Messages get the "Practice (not scored): " prefix, answered
   *  events carry scored: false, and the score and misses() are kept. */
  CardDeck.prototype.practiceRound = function (seed) {
    if (seed != null) this.rng = FP.rng.seeded(seed);
    this._start(this.cards.slice(), true, 'all');
    call(this.opts.onChange, this.state());
    return this;
  };
  /** Start over with every card, reshuffled. newRound(seed) reseeds the order;
   *  without a seed a seeded deck continues its own deterministic stream.
   *  1.2: newRound({seed, scored: false}) starts a practiceRound instead. */
  CardDeck.prototype.newRound = function (seed) {
    if (seed !== null && typeof seed === 'object') {
      if (seed.scored === false) return this.practiceRound(seed.seed);
      seed = seed.seed;
    }
    if (seed != null) this.rng = FP.rng.seeded(seed);
    this.round++;
    this._start(this.cards.slice(), false);
    call(this.opts.onChange, this.state());
    return this;
  };
  CardDeck.prototype.state = function () {
    return {
      phase: this.phase, practice: this.practice, practiceKind: this.practiceKind, round: this.round, index: this.index,
      count: this.order.length, card: this.card(),
      attempt: Math.min(this.used + 1, this.attempts), attempts: this.attempts,
      attemptLabel: FP.msg.attempt(Math.min(this.used + 1, this.attempts), this.attempts),
      isLast: this.index === this.order.length - 1, last: this.last,
      scoreLabel: this.score.label(), canPractice: this.canPractice(),
      correct: this.score.correct(), firstAttempt: this.score.firstAttempt(),
      results: this.order.map(function (c, i) {
        var p = this.placements[i];
        return p ? (p.correct ? 'correct' : 'missed') : null;
      }, this)
    };
  };
  FP.CardDeck = CardDeck;

  if (typeof module !== 'undefined' && module.exports) module.exports = FP;
})(typeof window !== 'undefined' ? window : globalThis);
