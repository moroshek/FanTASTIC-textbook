/* fanpedia-core.js — FanPedia MicroSim kit, core (library-agnostic).
 * Version 1.0.0 (2026-10-08). Namespace: window.FP. No modules, no build step.
 *
 * Provides: FP.tok, FP.fmt, FP.check, FP.msg, FP.Score, FP.rng, FP.announce,
 * FP.events, FP.embedded, FP.ui (small DOM helpers), FP.ChallengeRunner,
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
  FP.version = '1.0.0';

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
  function num(x, decimals) {
    var d = decimals == null ? 0 : decimals;
    x = Number(x);
    if (!isFinite(x)) return '—';
    var s = Math.abs(x).toFixed(d);
    var neg = x < 0 && Number(s) !== 0;
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + parts.join('.');
  }
  function unit(u, defDec) {
    return function (x, decimals) {
      return num(x, decimals == null ? defDec : decimals) + u;
    };
  }
  FP.fmt = {
    /** num(1234.5, 1) -> "1,234.5"; non-finite -> "—". */
    num: num,
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
  function sentence(s) {
    s = s == null ? '' : String(s).trim();
    if (!s) return '';
    return /[.!?)]$/.test(s) ? s : s + '.';
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
    /** "Attempt 1 of 2" */
    attempt: function (i, n) { return 'Attempt ' + i + ' of ' + n; },
    /** "First-attempt score: n of N" */
    firstAttempt: function (n, total) { return 'First-attempt score: ' + n + ' of ' + total; },
    /** "Mastery reached (M of N needed)." */
    masteryReached: function (m, total) { return 'Mastery reached (' + m + ' of ' + total + ' needed).'; },
    /** "Mastery needs M of N on the first attempt. <review pointer>" */
    masteryNeeds: function (m, total, pointer) {
      return joinParts('Mastery needs ' + m + ' of ' + total + ' on the first attempt.', sentence(pointer));
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
  /** new FP.Score({total | items, mastery, noun}). Tracks resolved-correct
   *  (any attempt) for the running line and first-attempt correct for the
   *  summary and mastery. mastery defaults to total. */
  function Score(opts) {
    opts = opts || {};
    this.total = opts.items ? opts.items.length : (opts.total || 0);
    this.mastery = opts.mastery == null ? this.total : opts.mastery;
    this.noun = opts.noun || 'Items';
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
  Score.prototype.mastered = function () { return this.firstAttempt() >= this.mastery; };
  /** "<Noun> correct: n of N" */
  Score.prototype.label = function () { return FP.msg.score(this.noun, this.correct(), this.total); };
  /** [first-attempt line, mastery line] */
  Score.prototype.summaryLines = function (pointer) {
    var f = this.firstAttempt();
    return [
      FP.msg.firstAttempt(f, this.total),
      this.mastered() ? FP.msg.masteryReached(this.mastery, this.total)
        : FP.msg.masteryNeeds(this.mastery, this.total, pointer)
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

  // ---------------------------------------------------------------- helpers
  function itemAnswerText(item) {
    if (item.answerText != null) return item.answerText;
    if (typeof item.model === 'number') {
      return num(item.model, item.decimals || 0) + (item.unit ? ' ' + item.unit : '');
    }
    return item.answer != null ? String(item.answer) : '';
  }
  function resolveText(v, a, b) { return typeof v === 'function' ? v(a, b) : v; }
  function call(fn, arg) { if (typeof fn === 'function') fn(arg); }

  // ---------------------------------------------------------------- ChallengeRunner
  /** Pattern A/E state machine (no UI).
   *  new FP.ChallengeRunner({items, attempts: 2, tolerance: {rel: 0.02}, noun,
   *    mastery, explore: true, check, id, onChange, onUnlockExplore, onComplete})
   *  item: {id, prompt, model (number) | answer (any), tolerance, unit, decimals,
   *         answerText, why, hint (string | fn(value, item))}. */
  function ChallengeRunner(opts) {
    this.opts = opts || {};
    this.items = this.opts.items || [];
    this.attempts = this.opts.attempts || 2;
    this.tolerance = this.opts.tolerance || { rel: 0.02 };
    this.score = new Score({ total: this.items.length, mastery: this.opts.mastery, noun: this.opts.noun || 'Challenges' });
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
      exploreLabel: this.explore ? FP.msg.EXPLORE : FP.msg.exploreLocked(lastLabel)
    };
  };
  FP.ChallengeRunner = ChallengeRunner;

  // ---------------------------------------------------------------- CardDeck
  /** Pattern B/C/D/F/G state machine (no UI).
   *  new FP.CardDeck({cards, shuffle: true, seed, attempts: 1, retryMissed: true,
   *    noun: 'Cards', mastery, check, label, id, onChange, onComplete})
   *  card: {id, answer, answerText, why, hint, ...anything the sim draws}. */
  function CardDeck(opts) {
    this.opts = opts || {};
    this.cards = this.opts.cards || [];
    this.attempts = this.opts.attempts || 1;
    this.rng = this.opts.seed != null ? FP.rng.seeded(this.opts.seed) : Math.random;
    this.score = new Score({ total: this.cards.length, mastery: this.opts.mastery, noun: this.opts.noun || 'Cards' });
    this.round = 0;
    this._start(this.cards.slice(), false);
    this.round = 1;
  }
  CardDeck.prototype._order = function (list) {
    return (this.opts.shuffle === false && this.opts.seed == null) ? list : FP.rng.shuffle(list, this.rng);
  };
  CardDeck.prototype._start = function (list, practice) {
    this.order = this._order(list);
    this.practice = practice;          // a retry-missed round: not scored
    this.index = 0;
    this.used = 0;
    this.phase = this.order.length ? 'choose' : 'summary';   // choose | feedback | summary
    this.placements = [];              // {card, chosen, correct, attempts}
    this.last = null;
    if (!practice) this.score.reset();
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
  /** Turn up the next card, or go to the summary after the last one. */
  CardDeck.prototype.next = function () {
    if (this.phase !== 'feedback') return false;
    this.used = 0;
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
  /** Missed placements of the current round: [{card, chosen, answer, why}]. */
  CardDeck.prototype.misses = function () {
    var self = this;
    return this.placements.filter(function (p) { return !p.correct; }).map(function (p) {
      return { card: p.card, chosen: p.chosen, answer: self.answerText(p.card), why: p.card.why };
    });
  };
  CardDeck.prototype.summary = function (pointer) {
    return {
      correct: this.score.correct(),
      firstAttempt: this.score.firstAttempt(),
      total: this.cards.length,
      mastery: this.score.mastery,
      mastered: this.score.mastered(),
      practice: this.practice,
      lines: this.score.summaryLines(pointer != null ? pointer : this.opts.reviewPointer),
      misses: this.misses(),
      canRetryMissed: this.opts.retryMissed !== false && this.misses().length > 0
    };
  };
  /** Practice round over the cards missed this round; the score is kept. */
  CardDeck.prototype.retryMissed = function () {
    if (this.phase !== 'summary' || this.opts.retryMissed === false) return false;
    var missed = this.misses().map(function (m) { return m.card; });
    if (!missed.length) return false;
    this._start(missed, true);
    call(this.opts.onChange, this.state());
    return true;
  };
  /** Start over with every card, reshuffled. newRound(seed) reseeds the order;
   *  without a seed a seeded deck continues its own deterministic stream. */
  CardDeck.prototype.newRound = function (seed) {
    if (seed != null) this.rng = FP.rng.seeded(seed);
    this.round++;
    this._start(this.cards.slice(), false);
    call(this.opts.onChange, this.state());
    return this;
  };
  CardDeck.prototype.state = function () {
    return {
      phase: this.phase, practice: this.practice, round: this.round, index: this.index,
      count: this.order.length, card: this.card(),
      attempt: Math.min(this.used + 1, this.attempts), attempts: this.attempts,
      attemptLabel: FP.msg.attempt(Math.min(this.used + 1, this.attempts), this.attempts),
      isLast: this.index === this.order.length - 1, last: this.last,
      scoreLabel: this.score.label(),
      results: this.order.map(function (c, i) {
        var p = this.placements[i];
        return p ? (p.correct ? 'correct' : 'missed') : null;
      }, this)
    };
  };
  FP.CardDeck = CardDeck;

  if (typeof module !== 'undefined' && module.exports) module.exports = FP;
})(typeof window !== 'undefined' ? window : globalThis);
