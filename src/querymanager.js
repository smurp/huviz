/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// A controller for the display of the lifecycle of a SPARQL Query
class QueryManager {
  constructor(qry) {
    this.qry = qry;
    this.set_state('new');
    if (this.listeners == null) { this.listeners = []; }
    this.resultCount = 0;
  }
  set_state(state) {
    this._state = state;
    if (state === 'done') {
      return this.call_done_listeners();
    }
  }
  when_done(listener) {
    return this.listeners.push(listener);
  }
  call_done_listeners() {
    return (() => {
      let listener;
      const result = [];
      while (listener = this.listeners.shift()) {
        result.push(setTimeout(listener, 10));
      }
      return result;
    })();
  }
  incrResultCount() {
    return this.resultCount++;
  }
  styleQuery(color, style) {
    return this.preJQElem.css('background', color).addClass(style);
  }
  setNoneColor() {
    return this.styleQuery('#d3d3d357','result-none'); // no result 'light grey'
  }
  setErrorColor() {
    return this.styleQuery('#f9e7ea', 'result-error'); // Error 'pink'
  }
  setSuccessColor() {
    return this.styleQuery('#e6f9e6','result-success'); // Success 'green'
  }
  setKilledColor() {
    this.setNoneColor();
    return this.preJQElem.css('color', 'white').addClass('result-empty');
  }
  displayError(e) {
    console.warn(e);
    return this.qryJQElem.append(`<div class="query-error">${e}</div>`);
  }
  fatalError(e) {
    this.set_state('done');
    this.cancelAnimation();
    this.displayError(e);
    this.setErrorColor();
    return console.error(e);
  }
  displayResults(results) {
    return this.qryJQElem.append(`<div class="query-results">${results}</div>`);
  }
  finishCounting() {
    return this.setResultCount(this.resultCount);
  }
  setResultCount(count) {
    this.set_state('done');
    this.resultCount = count;
    this.displayResults(`result count: ${this.resultCount}`);
    if (count === 0) {
      return this.setNoneColor();
    } else if (count > 0) {
      return this.setSuccessColor();
    }
  }
  setXHR(xhr) {
    this.xhr = xhr;
  }
  abortXHR() {
    return this.xhr.abort();
  }
  cancelAnimation() {
    return this.anim.cancel();
  }
  kill() {
    this.abortXHR();
    this.cancelAnimation();
    return this.setKilledColor();
  }
}

(typeof exports !== 'undefined' && exports !== null ? exports : this).QueryManager = QueryManager;
