export class Edge {
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
  }
  register() {
    this.predicate.add_inst(this);
  }
  register_context(context) {
    this.contexts.push(context);
    // context.register_context_for(this) # FIXME to see all assertions in a context
  }
  isSelected() {
    return (this.source.selected != null) || (this.target.selected != null);
  }
  show() {
    this.predicate.update_state(this, 'show');
  }
  unshow() {
    this.predicate.update_state(this, 'unshow');
  }
  an_end_is_selected() {
    return (this.target.selected != null) || (this.source.selected != null);
  }
  unselect() {
    this.predicate.update_state(this, 'unselect');
  }
  select() {
    this.predicate.update_state(this, 'select');
  }
}
Edge.initClass();

// export {Edge}; // TODO convert to module
