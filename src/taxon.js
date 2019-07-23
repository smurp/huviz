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
const { angliciser } = require('angliciser');
const { TreeCtrl } = require('treectrl');

class Taxon extends TreeCtrl {
  static initClass() {
    // as Predicate is to Edge, Taxon is to Node, ie: type or class or whatever
    // Taxon actually contains Nodes directly, unlike TaxonAbstract (what a doof!)
    this.prototype.suspend_updates = false;
    this.prototype.custom_event_name = 'changeTaxon';
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
    super();
    this.lid = this.id; // FIXME @lid should be local @id should be uri, no?
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
      for (inst of Array.from(this.get_instances(false))) {
        retval.push(inst);
      }
      return Array.from(this.subs).map((sub) =>
        (() => {
          const result = [];
          for (inst of Array.from(sub.get_instances(true))) {
            result.push(retval.push(inst));
          }
          return result;
        })());
    } else {
      return this.instances;
    }
  }
  register(node) {
    // Slightly redundant given that @add makes a bidirectional link too
    // but the .taxon on node gives it access to the methods on the taxon.
    // Perhaps taxon should be a super of SortedSet rather than a facade.
    // Should Taxon delegate to SortedSet?
    node.taxon = this;
    return this.acquire(node);
  }
  acquire(node) {
    return this.instances.acquire(node);
  }
  recalc_direct_stats() {
    return [this.selected_instances.length, this.instances.length];
  }
  recalc_english(in_and_out) {
    if (this.indirect_state === 'showing') {
      let phrase = this.lid;
      if (this.subs.length > 0) {
        phrase = `every ${phrase}`;
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
            for (n of Array.from(this.selected_instances)) {
              in_and_out.include.push(n.lid);
            }
          } else {
            in_and_out.include.push(this.id);
            for (n of Array.from(this.unselected_instances)) {
              in_and_out.exclude.push(n.lid);
            }
          }
        }
        for (let sub of Array.from(this.subs)) {
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
    return window.dispatchEvent(evt);
  }
  english_from(in_and_out) {
    let english = angliciser(in_and_out.include);
    if (in_and_out.exclude.length) {
      english += ` except ${angliciser(in_and_out.exclude, " or ")}`;
    }
    return english;
  }
}
Taxon.initClass();

(typeof exports !== 'undefined' && exports !== null ? exports : this).Taxon = Taxon;
