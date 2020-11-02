/*
TreeCtrl controls TreePicker states: showing, unshowing, mixed for direct and indirect.

 Elements may be in one of these states:
   mixed      - some instances of the node class are selected, but not all
   unshowing  - there are instances but none are selected
   showing    - there are instances and all are selected
   abstract   - there are no instances (but presumably there are subs)
   (empty)    - is empty a better name for taxon with no direct members?
                Perhaps 'empty' is a legal direct-state and 'abstract' is only
                sensible as an indirect-state? Do these distinctions make
                sense in both the Taxon context and the Predicate context?

 What about these theoretical states?
   hidden     - TBD: not sure when hidden is appropriate
                perhaps abstract predicate subtrees should be hidden
                ie "there is nothing interesting here, move along"
   emphasized - TBD: mark the class of the focused_node


 Are these states only meaningful in the MVC View context and not the
 Model context? -- where the model context is Taxon and/or Predicate
 while the View context is the TreePicker.  Likewise 'collapse' is
 concept related to the View.  OK so we have View verbs such as:
 * hide
 * emphasize
 * collapse
 * pick (click?)
 and Model verbs such as:


*/
class TreeCtrl {
  constructor(id) {
    this.id = id;
    this.state = 'empty';
    this.indirect_state = 'empty';
    this.subs = [];
    this.super_class = null;
    this.direct_stats = [0, 0];
    this.dirty = false;
  }
  get_state() {
    if ((this.state == null)) {
      alert(`${this.id} has no direct state`);
    }
    return this.state;
  }
  get_indirect_state() {
    if ((this.indirect_state == null)) {
      alert(`${this.id} has no indirect_state`);
    }
    return this.indirect_state;
  }
  register_superclass(super_class) {
    if (super_class === this) {
      return;
    }
    if (this.super_class != null) {
      this.super_class.remove_subclass(this);
    }
    this.super_class = super_class;
    this.super_class.register_subclass(this);
  }
  remove_subclass(sub_class) {
    const idx = this.subs.indexOf(sub_class);
    if (idx > -1) {
      this.subs.splice(idx, 1);
    }
  }
  register_subclass(sub_class) {
    this.subs.push(sub_class);
  }
  recalc_states() {
    this.direct_stats = this.recalc_direct_stats(); // eg [3, 60]
    this.indirect_stats = this.recalc_indirect_stats([0, 0]);
    this.state = this.recalc_direct_state();   // eg empty|unshowing|mixed|showing
    this.indirect_state = this.recalc_indirect_state(); // same as above
  }
  recalc_indirect_state() {
    //return @translate_stats_to_state @indirect_state
    if (this.subs.length === 0) {
      return this.state;      // eg 0/0
    }
    if (this.state === 'mixed') {
      return 'mixed';     // eg 3/6
    }
    let consensus = this.get_state(); // variable for legibility and performance
    for (let kid of this.subs) {
      const kid_ind_stt = kid.get_indirect_state();
      //  debugger
      if (kid_ind_stt !== consensus) {
        if (['empty', 'hidden'].includes(consensus)) {
          consensus = kid_ind_stt;
        } else if (!['empty', 'hidden'].includes(kid_ind_stt)) {
          return "mixed";
        }
      }
    }
    return consensus;
  }
  set_dirty() {
    this.dirty = true;
    if (this.super_class != null) {
      this.super_class.set_dirty();
    }
  }
  update_state(inst, change) {
    if (inst != null) {
      this.change_map[change].acquire(inst);
    }
    this.set_dirty();
  }
  clean_up_dirt() {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    // FIXME fold the subroutines into this method for a single pass
    // FIXME make use of the edge and change hints in the single pass
    // terminology:
    //   selected edge:  an edge (shown or not) to or from a node in the selected_set
    // roughly: all_shown, none_shown, mixed, hidden
    //   are all the selected edges shown?
    //   are none of the selected edges shown?
    //   are strictly some of the selected edges shown?
    //   are there no selected edges?
    const old_state = this.state;
    const old_indirect_state = this.indirect_state;

    for (let kid of this.subs) {
      kid.clean_up_dirt();
    }
    this.recalc_states();
    const updating_stats = true; // TODO make this settable by user
    if (updating_stats ||
        (old_state !== this.state) ||
        (old_indirect_state !== this.indirect_state)) {
      if (window.suspend_updates) {
        return;
      }
      const evt = new CustomEvent(this.custom_event_name, {
          detail: {
            target_id: this.lid,
            target: this,
            old_state,
            new_state: this.state,
            old_indirect_state,
            new_indirect_state: this.indirect_state,
            payload: this.get_payload_string(),
            collapsed_payload: this.get_collapsed_payload_string()
          },
          bubbles: true,
          cancelable: true
        }
      );
      window.dispatchEvent(evt);
    }
      //if @super_class?
      //  @super_class.fire_changeEvent_if_needed()
  }
  format_stats(stats) {
    return `${stats[0]}/${stats[1]}`;
  }
  translate_stats_to_state(stats) {
    if (stats[1] === 0) {
      return "empty";
    }
    if (stats[0] === 0) {
      return "unshowing";
    }
    if (stats[0] === stats[1]) {
      return "showing";
    }
    return "mixed";
  }
  recalc_direct_state() {
    return this.translate_stats_to_state(this.direct_stats);
  }
  get_payload_string() {
    return this.format_stats(this.direct_stats);
  }
  get_collapsed_payload_string() {
    return this.format_stats(this.indirect_stats);
  }
  recalc_indirect_stats(stats) {
    stats[0] += this.direct_stats[0];
    stats[1] += this.direct_stats[1];
    if (this.subs.length > 0) {
      for (let sub of this.subs) {
        sub.recalc_indirect_stats(stats);
      }
    }
    return stats;
  }
}

// (exports ? this).TreeCtrl = TreeCtrl
// export {TreeCtrl}
