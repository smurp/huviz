// import angliciser from 'angliciser.js' // TODO convert to module
// import TreeCtrl from 'treectrl.js' // TODO convert to module

class Taxon extends TreeCtrl {
  static initClass() {
    // as Predicate is to Edge, Taxon is to Node, ie: type or class or whatever
    // Taxon actually contains Nodes directly, unlike TaxonAbstract (what a doof!)
    this.prototype.suspend_updates = false;
    this.prototype.custom_event_name = 'changeTaxon';
  }
  constructor(id, lid) {
    super(id);
    this.lid = lid || id; // FIXME @lid should be local @id should be uri, no?
    // FIXME try again to conver Taxon into a subclass of SortedSet
    //   Motivations
    //     1) remove redundancy of .register() and .add()
    //   Problems encountered:
    //     1) SortedSet is itself not really a proper subclass of Array.
    //        Isn't each instance directly adorned with methods like isState?
    //     2) Remember that d3 might need real Array instances for nodes, etc
    this.instances = SortedSet().named(this.id).isState('_isa').sort_on("id"); // FIXME state?
    // _tp is for 'taxon-pickedness' and has value selected, unselected or discarded
    //   (should probably be _ts for 'taxon-state'
    this.discarded_instances = SortedSet().named('discarded').isState('_tp').sort_on("id");
    this.selected_instances = SortedSet().named('selected').isState('_tp').sort_on("id");
    this.unselected_instances = SortedSet().named('unselected').isState('_tp').sort_on("id");
    this.change_map = {
      discard: this.discarded_instances,
      select: this.selected_instances,
      unselect: this.unselected_instances
    };
  }
  get_instances(hier) {
    if (hier) {
      let inst;
      const retval = [];
      for (inst of this.get_instances(false)) {
        retval.push(inst);
      }
      for (let sub of this.subs) {
        for (inst of sub.get_instances(true)) {
          retval.push(inst);
        }
      }
      return;
    } else {
      return this.instances;
    }
  }
  register(node) {
    // Slightly redundant given that @add makes a bidirectional link too
    // but the .taxon on node gives it access to the methods on the taxon.
    // Perhaps taxon should be a super of SortedSet rather than a facade.
    // Should Taxon delegate to SortedSet?
    if (node.taxons == null) { node.taxons = []; }
    node.taxons.push(this);
    node.taxon = this;
    this.acquire(node);
  }
  acquire(node) {
    this.instances.acquire(node);
  }
  recalc_direct_stats() {
    return [this.selected_instances.length, this.instances.length];
  }
  recalc_english(in_and_out) {
    if (this.indirect_state === 'showing') {
      let phrase = this.lid;
      if (this.subs.length > 0) {
        phrase = "every " + phrase;
      }
      in_and_out.include.push(phrase);
    } else {
      if (this.indirect_state === 'mixed') {
        if (this.state === 'showing') {
          in_and_out.include.push(this.lid);
        }
        if (this.state === 'mixed') {
          let n;
          if (this.selected_instances.length < this.unselected_instances.length) {
            for (n of this.selected_instances) {
              in_and_out.include.push(n.lid);
            }
          } else {
            in_and_out.include.push(this.id);
            for (n of this.unselected_instances) {
              in_and_out.exclude.push(n.lid);
            }
          }
        }
        for (let sub of this.subs) {
          sub.recalc_english(in_and_out);
        }
      }
    }
  }
  update_english() {
    if (this.id !== "Thing") {
      console.error(`update_english(${this.lid}) should only be called on Thing`);
    }
    const in_and_out = {
      include: [],
      exclude: []
    };
    this.recalc_english(in_and_out);
    const evt = new CustomEvent('changeEnglish', {
      detail: {
        english: this.english_from(in_and_out)
      },
      bubbles: true,
      cancelable: true
    }
    );
    window.dispatchEvent(evt);
  }
  english_from(in_and_out) {
    let english = angliciser(in_and_out.include);
    if (in_and_out.exclude.length) {
      english += " except " + angliciser(in_and_out.exclude, " or ");
    }
    return english;
  }
}
Taxon.initClass();

// export {Taxon}; // TODO convert to module
