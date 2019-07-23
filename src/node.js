/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { uniquer } = require("uniquer");

class Node {
  static initClass() {
    this.prototype.linked = false;          // TODO(smurp) probably vestigal
    this.prototype.showing_links = "none";
    this.prototype.name = null;
    this.prototype.s = null;                // TODO(smurp) rename Node.s to Node.subject, should be optional
    this.prototype.type = null;
  }
  constructor(id) {
    this.id = id;
    this.bub_txt = [];
    this.links_from = [];
    this.links_to = [];
    this.links_shown = [];
    this.lid = uniquer(this.id);
  }
  set_name(name) {
    this.name = name;
  }
  set_subject(s) {
    this.s = s;
  }
  point(point) {
    if (point != null) {
      this.x = point[0];
      this.y = point[1];
    }
    return [this.x,this.y];
  }
  prev_point(point) {
    if (point != null) {
      this.px = point[0];
      this.py = point[1];
    }
    return [this.px,this.py];
  }
  select() {
    let edge;
    for (edge of Array.from(this.links_from)) {
      edge.select();
    }
    for (edge of Array.from(this.links_to)) {
      edge.select();
    }
    return this.taxon.update_state(this, 'select');
  }
  unselect() {
    let edge;
    for (edge of Array.from(this.links_from)) {
      edge.unselect();
    }
    for (edge of Array.from(this.links_to)) {
      edge.unselect();
    }
    return this.taxon.update_state(this, 'unselect');
  }
  discard() {
    // should we unselect first if node.state is selected?
    return this.taxon.update_state(this, 'discard');
  }
}
Node.initClass();
(typeof exports !== 'undefined' && exports !== null ? exports : this).Node = Node;
