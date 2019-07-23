/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Huviz } = require('huviz');


class Deprecated extends Huviz {
  
  constructor(...args) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.onnextsubject = this.onnextsubject.bind(this);
    this.onnextsubject = this.onnextsubject.bind(this);
    super(...args);
  }

  hide_all_links() {
    this.nodes.forEach(node => {
      //node.linked = false;
      //node.fixed = false;	
      this.shelved_set.acquire(node);
      node.links_shown = [];
      node.showing_links = "none";
      this.shelved_set.acquire(node);
      return this.update_showing_links(node);
    });

    this.links_set.forEach(link => {
      return this.remove_ghosts(link);
    });

    this.links_set.clear();
    this.chosen_set.clear();
    
    // It should not be neccessary to clear discarded_set or hidden_set()
    // because shelved_set.acquire() should have accomplished that
    return this.restart();
  }

  toggle_links() {
    //console.log("links",force.links());
    if (!this.links_set.length) {
      this.make_links(G);
      this.restart();
    }
    return this.force.links().length;
  }

  fire_nextsubject_event(oldquad,newquad) {
    //console.log "fire_nextsubject_event",oldquad
    return window.dispatchEvent(
      new CustomEvent('nextsubject', {
        detail: {
          old: oldquad,
          new: newquad
        },
        bubbles: true,
        cancelable: true
      })
    );
  }

  onnextsubject(e) {
    alert("sproing");
    //console.log "onnextsubject: called",e
    // The event 'nextsubject' is fired when the subject of add_quad()
    // is different from the last call to add_quad().  It will also be
    // called when the data source has been exhausted. Our purpose
    // in listening for this situation is that this is when we ought
    // to check to see whether there is now enough information to create
    // a node.  A node must have an ID, a name and a type for it to
    // be worth making a node for it (at least in the orlando situation).
    // The ID is the uri (or the id if a BNode)
    this.calls_to_onnextsubject++;
    //console.log "count:",@calls_to_onnextsubject
    if (e.detail.old != null) {
      const subject = this.my_graph.subjects[e.detail.old.s.raw];  // FIXME why is raw still here?
      this.set_type_if_possible(subject,e.detail.old,true);
      if (this.is_ready(subject)) {
        this.get_or_create_node(subject);
        return this.tick();
      }
    }
  }
          
  show_found_links() {
    for (let sub_id in this.G.subjects) {
      var subj = this.G.subjects[sub_id];
      subj.getValues("f:name").forEach(name => {
        if (name.match(this.search_regex)) {
          const node = this.get_or_make_node(subj, [cx,cy]);
          if (node) { return this.show_node_links(node); }
        }
      });
    }
    return this.restart();
  }

  // deprecated in favour of get_or_create_node
  get_or_make_node(subject, start_point, linked, into_set) {
    if (!subject) { return; }
    let d = this.get_node_by_id(subject.id);
    if (d) { return d; }
    start_point = start_point || [
      this.width / 2,
      this.height / 2
    ];
    linked = (typeof linked === "undefined") || linked || false;
    const name_obj = subject.predicates[FOAF_name].objects[0];
    const name = ((name_obj.value != null) && name_obj.value) || name_obj;
    //name = subject.predicates[FOAF_name].objects[0].value
    d = new Node(subject.id);
    d.s = subject;
    d.name = name;
    d.point(start_point);
    d.prev_point([start_point[0]*1.01,start_point[1]*1.01]);
    
    this.assign_types(d);
    d.color = this.color_by_type(d);

    this.add_node_ghosts(d);
    //n_idx = @add_to_array(d, @nodes)
    let n_idx = this.nodes.add(d);
    this.id2n[subject.id] = n_idx;
    if (false) {
      if (!linked) {
        n_idx = this.shelved_set.acquire(d);
        this.id2u[subject.id] = n_idx;
      } else {
        this.id2u[subject.id] = this.graphed_set.acquire(d);
      }
    } else {
      into_set = ((into_set != null) && into_set) || (linked && this.graphed_set) || this.get_default_set_by_type(d);
      into_set.acquire(d);
    }
    this.update_showing_links(d);
    return d;
  }
  
  find_links_from_node(node) {
    let target = undefined;
    const subj = node.s;
    const x = node.x || (width / 2);
    const y = node.y || (height / 2);
    const pnt = [x,y];
    let oi = undefined;
    if (subj) {
      for (let p_name in subj.predicates) {
        this.ensure_predicate(p_name);
        const predicate = subj.predicates[p_name];
        oi = 0;
        predicate.objects.forEach((obj,i) => {
          if (obj.type === RDF_object) {
            target = this.get_or_make_node(this.G.subjects[obj.value], pnt);
          }
          if (target) {
            return this.add_link( new Edge(node, target));
          }
        });
      }
    }
    return node.links_from_found = true;
  }

  find_links_to_node(d) {
    const subj = d.s;
    if (subj) {
      const parent_point = [d.x,d.y];
      this.G.get_incoming_predicates(subj).forEach(sid_pred => {
        const sid = sid_pred[0];
        const pred = sid_pred[1];
        const src = this.get_or_make_node(this.G.subjects[sid], parent_point);
        return this.add_link( new Edge(src, d));
      });
    }
    return d.links_to_found = true;
  }

  set_type_if_possible(subj,quad,force) {
    // This is a hack, ideally we would look on the subject for type at coloring
    // and taxonomy assignment time but more thought is needed on how to
    // integrate the semantic perspective with the coloring and the 'taxonomy'.
    force = !(force == null) && force;
    if ((subj.type == null) && (subj.type !== ORLANDO_writer) && !force) {
      return;
    }
    //console.log "set_type_if_possible",force,subj.type,subj.id      
    const pred_id = quad.p.raw;
    if ([RDF_type,'a'].includes(pred_id) && (quad.o.value === FOAF_Group)) {
      subj.type = ORLANDO_org;
    } else if (force && subj.id[0].match(this.bnode_regex)) {
      subj.type = ORLANDO_other;    
    } else if (force) {
      subj.type = ORLANDO_writer;
    }
    if (subj.type != null) {
      let name;
      return name = ((subj.predicates[FOAF_name] != null) && subj.predicates[FOAF_name].objects[0]) || subj.id;
    }
  }
      //console.log "   ",subj.type
      
  hide_all_links() {
    this.nodes.forEach(node => {
      //node.linked = false;
      //node.fixed = false;	
      this.shelved_set.acquire(node);
      node.links_shown = [];
      node.showing_links = "none";
      this.shelved_set.acquire(node);
      return this.update_showing_links(node);
    });

    this.links_set.forEach(link => {
      return this.remove_ghosts(link);
    });

    this.links_set.clear();
    this.chosen_set.clear();
    
    // It should not be neccessary to clear discarded_set or hidden_set()
    // because shelved_set.acquire() should have accomplished that
    return this.restart();
  }

  toggle_links() {
    //console.log("links",force.links());
    if (!this.links_set.length) {
      this.make_links(G);
      this.restart();
    }
    return this.force.links().length;
  }

  fire_nextsubject_event(oldquad,newquad) {
    //console.log "fire_nextsubject_event",oldquad
    return window.dispatchEvent(
      new CustomEvent('nextsubject', {
        detail: {
          old: oldquad,
          new: newquad
        },
        bubbles: true,
        cancelable: true
      })
    );
  }

  onnextsubject(e) {
    alert("sproing");
    //console.log "onnextsubject: called",e
    // The event 'nextsubject' is fired when the subject of add_quad()
    // is different from the last call to add_quad().  It will also be
    // called when the data source has been exhausted. Our purpose
    // in listening for this situation is that this is when we ought
    // to check to see whether there is now enough information to create
    // a node.  A node must have an ID, a name and a type for it to
    // be worth making a node for it (at least in the orlando situation).
    // The ID is the uri (or the id if a BNode)
    this.calls_to_onnextsubject++;
    //console.log "count:",@calls_to_onnextsubject
    if (e.detail.old != null) {
      const subject = this.my_graph.subjects[e.detail.old.s.raw];  // FIXME why is raw still here?
      this.set_type_if_possible(subject,e.detail.old,true);
      if (this.is_ready(subject)) {
        this.get_or_create_node(subject);
        return this.tick();
      }
    }
  }
          
  show_found_links() {
    for (let sub_id in this.G.subjects) {
      var subj = this.G.subjects[sub_id];
      subj.getValues("f:name").forEach(name => {
        if (name.match(this.search_regex)) {
          const node = this.get_or_make_node(subj, [cx,cy]);
          if (node) { return this.show_node_links(node); }
        }
      });
    }
    return this.restart();
  }

  // deprecated in favour of get_or_create_node
  get_or_make_node(subject, start_point, linked, into_set) {
    if (!subject) { return; }
    let d = this.get_node_by_id(subject.id);
    if (d) { return d; }
    start_point = start_point || [
      this.width / 2,
      this.height / 2
    ];
    linked = (typeof linked === "undefined") || linked || false;
    const name_obj = subject.predicates[FOAF_name].objects[0];
    const name = ((name_obj.value != null) && name_obj.value) || name_obj;
    //name = subject.predicates[FOAF_name].objects[0].value
    d = new Node(subject.id);
    d.s = subject;
    d.name = name;
    d.point(start_point);
    d.prev_point([start_point[0]*1.01,start_point[1]*1.01]);
    
    this.assign_types(d);
    d.color = this.color_by_type(d);

    this.add_node_ghosts(d);
    //n_idx = @add_to_array(d, @nodes)
    let n_idx = this.nodes.add(d);
    this.id2n[subject.id] = n_idx;
    if (false) {
      if (!linked) {
        n_idx = this.shelved_set.acquire(d);
        this.id2u[subject.id] = n_idx;
      } else {
        this.id2u[subject.id] = this.graphed_set.acquire(d);
      }
    } else {
      into_set = ((into_set != null) && into_set) || (linked && this.graphed_set) || this.get_default_set_by_type(d);
      into_set.acquire(d);
    }
    this.update_showing_links(d);
    return d;
  }
  
  find_links_from_node(node) {
    let target = undefined;
    const subj = node.s;
    const x = node.x || (width / 2);
    const y = node.y || (height / 2);
    const pnt = [x,y];
    let oi = undefined;
    if (subj) {
      for (let p_name in subj.predicates) {
        this.ensure_predicate(p_name);
        const predicate = subj.predicates[p_name];
        oi = 0;
        predicate.objects.forEach((obj,i) => {
          if (obj.type === RDF_object) {
            target = this.get_or_make_node(this.G.subjects[obj.value], pnt);
          }
          if (target) {
            return this.add_link( new Edge(node, target));
          }
        });
      }
    }
    return node.links_from_found = true;
  }

  find_links_to_node(d) {
    const subj = d.s;
    if (subj) {
      const parent_point = [d.x,d.y];
      this.G.get_incoming_predicates(subj).forEach(sid_pred => {
        const sid = sid_pred[0];
        const pred = sid_pred[1];
        const src = this.get_or_make_node(this.G.subjects[sid], parent_point);
        return this.add_link( new Edge(src, d));
      });
    }
    return d.links_to_found = true;
  }
  
  set_type_if_possible(subj,quad,force) {
    // This is a hack, ideally we would look on the subject for type at coloring
    // and taxonomy assignment time but more thought is needed on how to
    // integrate the semantic perspective with the coloring and the 'taxonomy'.
    force = !(force == null) && force;
    if ((subj.type == null) && (subj.type !== ORLANDO_writer) && !force) {
      return;
    }
    //console.log "set_type_if_possible",force,subj.type,subj.id      
    const pred_id = quad.p.raw;
    if ([RDF_type,'a'].includes(pred_id) && (quad.o.value === FOAF_Group)) {
      subj.type = ORLANDO_org;
    } else if (force && subj.id[0].match(this.bnode_regex)) {
      subj.type = ORLANDO_other;    
    } else if (force) {
      subj.type = ORLANDO_writer;
    }
    if (subj.type != null) {
      let name;
      return name = ((subj.predicates[FOAF_name] != null) && subj.predicates[FOAF_name].objects[0]) || subj.id;
    }
  }
}
      //console.log "   ",subj.type

(typeof exports !== 'undefined' && exports !== null ? exports : this).Deprecated = Deprecated;
