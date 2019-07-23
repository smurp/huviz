/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class Edge {
  static initClass() {
    this.prototype.color = "lightgrey";
  }
  constructor(source, target, predicate, graph) {
    // FIXME if everything already has .lid then remove the test "not a.lid?"
    this.source = source;
    this.target = target;
    this.predicate = predicate;
    this.graph = graph;
    this.id = ([this.source, this.predicate, this.target].map((a) => ((a.lid == null) && a.id) || a.lid)).join(' ');
    this.lid = this.id;
    this.register();
    this.contexts = [];
    this;
  }
  register() {
    return this.predicate.add_inst(this);
  }
  register_context(context) {
    return this.contexts.push(context);
  }
    // context.register_context_for(this) # FIXME to see all assertions in a context
  isSelected() {
    return (this.source.selected != null) || (this.target.selected != null);
  }
  show() {
    return this.predicate.update_state(this, 'show');
  }
  unshow() {
    return this.predicate.update_state(this, 'unshow');
  }
  an_end_is_selected() {
    return (this.target.selected != null) || (this.source.selected != null);
  }
  unselect() {
    return this.predicate.update_state(this, 'unselect');
  }
  select() {
    return this.predicate.update_state(this, 'select');
  }
}
Edge.initClass();

(typeof exports !== 'undefined' && exports !== null ? exports : this).Edge = Edge;
