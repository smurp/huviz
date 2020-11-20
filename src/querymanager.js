// A controller for the display of the lifecycle of a SPARQL Query
export class QueryManager {
  constructor(qry) {
    this.qry = qry;
    this.set_state('new');
    if (this.listeners == null) { this.listeners = []; }
    this.resultCount = 0;
  }
  set_state(state) {
    this._state = state;
    if (state === 'done') {
      this.call_done_listeners();
    }
  }
  when_done(listener) {
    this.listeners.push(listener);
  }
  call_done_listeners() {
    let listener;
    while (listener = this.listeners.shift()) {
      setTimeout(listener, 10);
    }
  }
  incrResultCount() { // TODO delete if unused
    return this.resultCount++;
  }
  styleQuery(color, style) {
    this.preJQElem.css('background', color).addClass(style);
  }
  setNoneColor() {
    this.styleQuery('#d3d3d357','result-none'); // no result 'light grey'
  }
  setErrorColor() {
    this.styleQuery('#f9e7ea', 'result-error'); // Error 'pink'
  }
  setSuccessColor() {
    this.styleQuery('#e6f9e6','result-success'); // Success 'green'
  }
  setKilledColor() {
    this.setNoneColor();
    this.preJQElem.css('color', 'white').addClass('result-empty');
  }
  displayError(e) {
    console.warn(e);
    this.qryJQElem.append(`<div class="query-error">${e}</div>`);
  }
  fatalError(e) {
    this.set_state('done');
    this.cancelAnimation();
    this.displayError(e);
    this.setErrorColor();
  }
  displayResults(results) {
    this.qryJQElem.append(`<div class="query-results">${results}</div>`);
  }
  finishCounting() {
    this.setResultCount(this.resultCount);
  }
  setResultCount(count) {
    this.set_state('done');
    this.resultCount = count;
    this.displayResults(`result count: ${this.resultCount}`);
    if (count === 0) {
      this.setNoneColor();
    } else if (count > 0) {
      this.setSuccessColor();
    }
  }
  setXHR(xhr) {
    this.xhr = xhr;
  }
  abortXHR() {
    this.xhr.abort();
  }
  cancelAnimation() {
    this.anim.cancel();
  }
  kill() {
    this.abortXHR();
    this.cancelAnimation();
    this.setKilledColor();
  }
}
