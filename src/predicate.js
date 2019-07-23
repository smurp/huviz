/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { TreeCtrl } = require('treectrl');
const { uniquer } = require("uniquer");

class Predicate extends TreeCtrl {
  static initClass() {
    this.prototype.custom_event_name = 'changePredicate';
  }
  constructor(id) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.id = id;
    super(...arguments);
    this.lid = uniquer(this.id); // lid means local_id
    this.all_edges = SortedSet().sort_on("id").named("predicate");
    // TODO check for .acquire() bugs re isState('_s') vs isState('_p')
    // An Edge is either selected or unselected, so they are mutually exclusive.
    // Hence .isState("_p") is common and unique to them.
    this.selected_instances = SortedSet().sort_on("id").named("selected").isState('_p');
    this.unselected_instances = SortedSet().sort_on("id").named("unselected").isState('_p');
    // An Edge is either shown or unshown, they are mutually exclusive.
    // Hence .isState("_s") is common and unique to them.
    // shown edges are those which are shown and linked to a selected source or target
    this.shown_instances = SortedSet().sort_on("id").named("shown").isState("_s");
    // unshown edges are those which are unshown and linked to a selected source or target
    this.unshown_instances = SortedSet().sort_on("id").named("unshown").isState("_s");
    this.change_map = {
      unselect: this.unselected_instances,
      select: this.selected_instances,
      unshow: this.unshown_instances,
      show: this.shown_instances
    };
    this;
  }
  add_inst(inst) {
    this.all_edges.add(inst);
    return this.update_state();
  }
  update_selected_instances() {
    const before_count = this.selected_instances.length;
    return (() => {
      const result = [];
      for (let e of Array.from(this.all_edges)) {  // FIXME why can @selected_instances not be trusted?
        if (e.an_end_is_selected()) {
          result.push(this.selected_instances.acquire(e));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
  update_state(inst, change) {
    this.update_selected_instances();
    return super.update_state(inst, change);
  }
  recalc_direct_stats() {
    return [this.count_shown_selected(), this.selected_instances.length];
  }
  count_shown_selected() {
    let count = 0;
    for (let e of Array.from(this.selected_instances)) {
      if (e.shown != null) { count++; }
    }
    return count;
  }
}
Predicate.initClass();

(typeof exports !== 'undefined' && exports !== null ? exports : this).Predicate = Predicate;
