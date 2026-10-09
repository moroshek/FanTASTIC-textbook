/* FanPedia MicroSim kit: chart-theme.js (FP.chart)  v1.1.0
 *
 * One look for Chart.js 4.4.4 and Plotly 2.35.0 charts: Arial 12-14 px, grid
 * #e6edf4, the §4.1 series palette with a dash pattern AND a marker shape per
 * series (never green or red, which mean correct/incorrect), standard axis
 * titles, hover text with thousands separators, and an "Illustrative data"
 * label for both libraries.
 *
 * Never loads a library. Pass the library in: FP.chart.chartjs(Chart).
 * Pure helpers (palette, formatting, layout merge) also run under Node.
 */
(function (root) {
  'use strict';
  var FP = root.FP = root.FP || {};
  if (FP.chart && FP.chart.__version) {
    if (typeof module === 'object' && module.exports) module.exports = FP.chart;
    return;
  }

  var FALLBACK = {
    '--fp-text': '#263238',
    '--fp-text-muted': '#546e7a',
    '--fp-border': '#c0c0c0',
    '--fp-series-1': '#3f51b5',
    '--fp-series-2': '#e66100',
    '--fp-series-3': '#00897b',
    '--fp-series-4': '#8e24aa',
    '--fp-series-5': '#6d4c41'
  };
  function tok(name) {
    var v = null;
    if (typeof FP.tok === 'function') {
      try { v = FP.tok(name); } catch (e) { v = null; }
    }
    return (v && String(v).trim()) || FALLBACK[name] || '#000000';
  }

  var FONT = 'Arial, Helvetica, sans-serif';
  var GRID = '#e6edf4';
  var DASHES = [[], [7, 4], [2, 3], [10, 3, 2, 3], [1, 3]];
  var CJS_POINTS = ['circle', 'rect', 'triangle', 'rectRot', 'crossRot'];
  var PLOTLY_SYMBOLS = ['circle', 'square', 'triangle-up', 'diamond', 'x'];

  // Series i (0-based, wraps after 5): {color, dash, pointStyle, symbol}.
  function series(i) {
    var k = ((i % 5) + 5) % 5;
    return {
      color: tok('--fp-series-' + (k + 1)),
      dash: DASHES[k].slice(),
      pointStyle: CJS_POINTS[k],
      symbol: PLOTLY_SYMBOLS[k]
    };
  }
  function palette() { return [0, 1, 2, 3, 4].map(series); }

  // Plotly accepts a dash length list: [7,4] -> "7px,4px"; [] -> "solid".
  function plotlyDash(d) {
    return d && d.length ? d.map(function (n) { return n + 'px'; }).join(',') : 'solid';
  }

  var AXIS = {
    airflow: 'Airflow (CFM)',
    staticPressure: 'Static pressure (in. wg)',
    totalPressure: 'Total pressure (in. wg)',
    bhp: 'Brake horsepower (BHP)',
    efficiency: 'Static efficiency (%)',
    speed: 'Fan speed (RPM)',
    velocity: 'Velocity (ft/min)',
    temperature: 'Temperature (°F)'
  };
  var UNITS = {
    airflow: 'CFM', staticPressure: 'in. wg', totalPressure: 'in. wg', bhp: 'BHP',
    efficiency: '%', speed: 'RPM', velocity: 'ft/min', temperature: '°F'
  };
  var ILLUSTRATIVE = 'Illustrative data';

  // 12345.6 -> "12,346" (decimals 0) ; en-US thousands separators.
  function fmt(v, decimals) {
    if (v == null || !isFinite(v)) return '';
    var d = decimals == null ? 0 : decimals;
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // ---- deep merge (plain objects; arrays and other values replace) ----
  function isObj(o) { return o !== null && typeof o === 'object' && !Array.isArray(o); }
  function merge(dst, src) {
    if (!isObj(src)) return dst;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (isObj(src[k]) && isObj(dst[k])) merge(dst[k], src[k]);
      else if (isObj(src[k])) dst[k] = merge({}, src[k]);
      else dst[k] = src[k];
    }
    return dst;
  }

  // =================== Chart.js ===================

  // Draws options.plugins.fpNote.text in muted 12 px at the top-left of the
  // chart area (or 'bottom-left' / 'top-right' via .position). Registered by
  // FP.chart.chartjs(); set with FP.chart.illustrative.chartjs(options).
  var notePlugin = {
    id: 'fpNote',
    afterDraw: function (chart) {
      var o = chart.options.plugins && chart.options.plugins.fpNote;
      if (!o || !o.text) return;
      var a = chart.chartArea, ctx = chart.ctx;
      if (!a) return;
      var pos = o.position || 'top-left';
      ctx.save();
      ctx.font = (o.size || 12) + 'px ' + FONT;
      ctx.fillStyle = o.color || tok('--fp-text-muted');
      var right = pos.indexOf('right') >= 0;
      var bottom = pos.indexOf('bottom') >= 0;
      var w = ctx.measureText(o.text).width;
      var x = right ? a.right - 6 - w : a.left + 6;
      var y = bottom ? a.bottom - 6 : a.top + 4;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(x - 3, bottom ? y - 13 : y - 1, w + 6, 16);
      ctx.fillStyle = o.color || tok('--fp-text-muted');
      ctx.textBaseline = bottom ? 'bottom' : 'top';
      ctx.fillText(o.text, x, y);
      ctx.restore();
    }
  };

  // Legend box height for a chart (Chart.js scriptable option, context
  // {chart}): 0 when every dataset is a line or scatter, else undefined
  // (Chart.js then uses the font size: a filled square-ish box).
  var LINE_TYPES = { line: true, scatter: true };
  function legendBoxHeight(ctx) {
    var chart = ctx && ctx.chart;
    if (!chart || !chart.config) return 0;
    var base = chart.config.type;
    var ds = (chart.data && chart.data.datasets) || (chart.config.data && chart.config.data.datasets) || [];
    for (var i = 0; i < ds.length; i++) {
      if (!LINE_TYPES[(ds[i] && ds[i].type) || base]) return undefined;
    }
    return (ds.length || LINE_TYPES[base]) ? 0 : undefined;
  }

  // Sets Chart.js global defaults once and registers the fpNote plugin.
  function chartjs(Chart) {
    if (!Chart || !Chart.defaults) return Chart;
    var d = Chart.defaults;
    d.font.family = FONT;
    d.font.size = 13;
    d.color = tok('--fp-text');
    d.borderColor = GRID;
    if (d.scale && d.scale.grid) d.scale.grid.color = GRID;
    if (d.scale && d.scale.title) {
      d.scale.title.font = { size: 13, weight: 'bold' };
      d.scale.title.color = tok('--fp-text');
    }
    if (d.scale && d.scale.ticks) d.scale.ticks.color = tok('--fp-text');
    d.elements.line.borderWidth = 2.5;
    d.elements.point.radius = 3.5;
    d.elements.point.hoverRadius = 6;
    var lg = d.plugins.legend;
    lg.position = 'top';
    lg.labels.font = { size: 12 };
    lg.labels.usePointStyle = false;
    lg.labels.boxWidth = 30;
    // Line and scatter datasets get a line sample (height 0), so the dash
    // pattern shows; a chart with any bar/pie/other dataset keeps Chart.js's
    // filled box (1.1: before, boxHeight 0 for every chart left bars with an
    // invisible legend swatch). Scriptable; a chart's own boxHeight wins.
    lg.labels.boxHeight = legendBoxHeight;
    var tt = d.plugins.tooltip;
    tt.titleFont = { size: 13, weight: 'bold' };
    tt.bodyFont = { size: 13 };
    tt.backgroundColor = 'rgba(38,50,56,0.92)';
    if (!Chart.__fpNoteRegistered) {
      Chart.register(notePlugin);
      Chart.__fpNoteRegistered = true;
    }
    return Chart;
  }

  // Dataset style for series i, merged with overrides.
  function chartjsDataset(i, overrides) {
    var s = series(i);
    return merge({
      borderColor: s.color,
      backgroundColor: s.color,
      borderDash: s.dash,
      pointStyle: s.pointStyle,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: s.color,
      pointBorderWidth: 2,
      fill: false,
      tension: 0
    }, overrides || {});
  }

  // Linear scale with a standard title ('airflow' or literal text) and
  // thousands-separated tick labels.
  function chartjsScale(titleKey, overrides, decimals) {
    return merge({
      type: 'linear',
      title: { display: true, text: AXIS[titleKey] || titleKey },
      grid: { color: GRID },
      ticks: { maxRotation: 0, autoSkip: true, callback: function (v) { return fmt(v, decimals == null ? autoDecimals(v) : decimals); } }
    }, overrides || {});
  }
  function autoDecimals(v) { var a = Math.abs(v); return a >= 100 || Number.isInteger(v) ? 0 : (a >= 10 ? 1 : 2); }

  // Tooltip callbacks: spec {x: {label, unit, decimals}, y: {...}}; unit/label
  // default from the AXIS keys when spec.x / spec.y is a string ('airflow').
  function axisSpec(s) {
    if (typeof s === 'string') return { label: (AXIS[s] || s).replace(/\s*\(.*\)$/, ''), unit: UNITS[s] || '', decimals: s === 'airflow' || s === 'speed' ? 0 : 2 };
    return s || {};
  }
  function chartjsTooltip(spec) {
    var x = axisSpec(spec.x), y = axisSpec(spec.y);
    return {
      callbacks: {
        title: function (items) {
          return items.length ? x.label + ': ' + fmt(items[0].parsed.x, x.decimals) + (x.unit ? ' ' + x.unit : '') : '';
        },
        label: function (item) {
          return (item.dataset.label ? item.dataset.label + ': ' : '') +
            fmt(item.parsed.y, y.decimals) + (y.unit ? ' ' + y.unit : '');
        }
      }
    };
  }

  // =================== Plotly ===================

  function plotlyAxis(titleText) {
    return {
      gridcolor: GRID,
      zeroline: false,
      linecolor: tok('--fp-border'),
      tickfont: { size: 12 },
      separatethousands: true,
      tickformat: ',',             // 16000 -> 16,000 (not 16k); 0.5 stays 0.5
      title: titleText ? { text: titleText, font: { size: 13 }, standoff: 6 } : undefined
    };
  }

  // Theme layout merged under `base`. Every xaxis*/yaxis* key in base gets the
  // axis defaults; axis title strings that match an AXIS key are expanded
  // ('airflow' -> 'Airflow (CFM)').
  function plotlyLayout(base) {
    base = base || {};
    var out = {
      font: { family: FONT, size: 13, color: tok('--fp-text') },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff',
      margin: { l: 60, r: 16, t: 36, b: 48 },
      hovermode: 'closest',
      hoverlabel: { font: { family: FONT, size: 13 } },
      legend: { orientation: 'h', x: 1, xanchor: 'right', y: 1.02, yanchor: 'bottom', font: { size: 12 } },
      xaxis: plotlyAxis(),
      yaxis: plotlyAxis()
    };
    for (var k in base) {
      if (/^[xy]axis\d*$/.test(k) && !out[k]) out[k] = plotlyAxis();
    }
    merge(out, base);
    for (var key in out) {
      if (!/^[xy]axis\d*$/.test(key)) continue;
      var ax = out[key];
      if (typeof ax.title === 'string') ax.title = { text: AXIS[ax.title] || ax.title, font: { size: 13 }, standoff: 6 };
      else if (ax.title && typeof ax.title.text === 'string' && AXIS[ax.title.text]) ax.title.text = AXIS[ax.title.text];
      if (ax.title === undefined) delete ax.title;
    }
    return out;
  }

  // Line style for series i: {color, width, dash} plus marker symbol.
  function plotlyTrace(i, overrides) {
    var s = series(i);
    return merge({
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: s.color, width: 2.5, dash: plotlyDash(s.dash) },
      marker: { color: s.color, size: 7, symbol: s.symbol }
    }, overrides || {});
  }

  // Hover template with thousands separators:
  //   hoverTemplate({x: 'airflow', y: 'staticPressure'})
  //   -> "<b>%{fullData.name}</b><br>Airflow: %{x:,.0f} CFM<br>Static pressure: %{y:,.2f} in. wg<extra></extra>"
  // spec.extra: additional lines (strings) appended before <extra>.
  function hoverTemplate(spec) {
    var x = axisSpec(spec.x), y = axisSpec(spec.y);
    function part(ax, v) {
      var d = ax.decimals == null ? 2 : ax.decimals;
      return ax.label + ': %{' + v + ':,.' + d + 'f}' + (ax.unit ? ' ' + ax.unit : '');
    }
    var lines = [spec.name === false ? null : '<b>' + (spec.name || '%{fullData.name}') + '</b>', part(x, 'x'), part(y, 'y')]
      .concat(spec.extra || []).filter(Boolean);
    return lines.join('<br>') + '<extra></extra>';
  }

  var plotlyConfig = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] };

  // =================== Illustrative label ===================
  var illustrative = {
    text: ILLUSTRATIVE,
    // Chart.js: sets options.plugins.fpNote (needs FP.chart.chartjs(Chart) once).
    chartjs: function (options, text, position) {
      options = options || {};
      options.plugins = options.plugins || {};
      options.plugins.fpNote = { text: text || ILLUSTRATIVE, position: position || 'top-left' };
      return options;
    },
    // Plotly: appends a paper-anchored annotation above the plot's top-left.
    plotly: function (layout, text) {
      layout = layout || {};
      layout.annotations = (layout.annotations || []).concat([{
        text: text || ILLUSTRATIVE, xref: 'paper', yref: 'paper', x: 0, y: 1, xanchor: 'left', yanchor: 'bottom',
        showarrow: false, font: { size: 12, color: tok('--fp-text-muted') }, name: 'fp-illustrative'
      }]);
      return layout;
    }
  };

  FP.chart = {
    __version: '1.1.0',
    FONT: FONT,
    GRID: GRID,
    AXIS: AXIS,
    UNITS: UNITS,
    tok: tok,
    series: series,
    palette: palette,
    plotlyDash: plotlyDash,
    fmt: fmt,
    merge: merge,
    chartjs: chartjs,
    chartjsDataset: chartjsDataset,
    chartjsScale: chartjsScale,
    chartjsTooltip: chartjsTooltip,
    notePlugin: notePlugin,
    legendBoxHeight: legendBoxHeight,
    plotlyLayout: plotlyLayout,
    plotlyTrace: plotlyTrace,
    plotlyConfig: plotlyConfig,
    hoverTemplate: hoverTemplate,
    illustrative: illustrative
  };

  if (typeof module === 'object' && module.exports) module.exports = FP.chart;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
