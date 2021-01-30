
/*
 * decaffeinate suggestions:
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Edit UI - Jan 2017

import {FiniteStateMachine} from './fsm.js'; // TODO convert to module
import {IndexedDBStorageController} from './indexeddbstoragecontroller.js'; // TODO convert to module

export class EditController extends FiniteStateMachine {
  constructor(huviz) {
    super();
    this.toggle_edit_form = this.toggle_edit_form.bind(this);
    this.huviz = huviz;
    //TODO EditController should be loaded and checked when a dataset is loaded
    this.userValid = true; //TODO this needs to be hooked into authentication -- remove to huviz.coffee to validate against dataloaded and authentication
    //@userValid = false
    this.ensure_verbs();
    this.build_transitions();
    this.state = 'not_editing';
  }

  build_transitions() {
    /*
      This state machine is under construction and currently incoherent.
      This TTL is an attempt to re-express the legacy .transitions
     */
    var ttl = `
         @prefix st: <https://example.com/state/> .
         @prefix st: <https://example.com/transition/> .

         st:              tr:start     st:not_editing .
         st:not_editing   tr:enable    st:prepared .
         st:enabled       tr:disable   st:disabled .
         st:MYSTERY       tr:prepare   st:prepared .
    `;
    this.parseMachineTTL(ttl);
    /*
    this.transitions = {
      start: {
        target: 'not_editing',
      },
      prepare: {
        target: 'prepared'
      },
      disable: {
        target: 'disabled'
      },
      enable: {
        target: 'prepared'
      }
    };
    */
  }

  on__tr_prepare() {
    if ((this.userValid === true) && !this.con) { //document.getElementsByClassName("edit-controls")[0] is undefined
      this.con = document.createElement("div");
      this.con.className = "edit-controls loggedIn";
      this.con.setAttribute("edit", "no");
      //@huviz.set_edit_mode(false)
      const viscanvas = this.huviz.args.viscanvas_sel;
      const new_viscanvas = viscanvas.replace('#','');
      document.getElementById(new_viscanvas).appendChild(this.con);
      this.con.innerHTML = "<div class='cntrl-set slider-pair'><div class='label set-1'>VIEW</div><div class='slider'><div class='knob'></div></div><div class='label set-2'>CONTRIBUTE</div><div id='beta-note'>(Alpha)</div></div>";
      this.create_edit_form(this.con);
      this.con.getElementsByClassName("slider")[0].onclick = this.toggle_edit_form;
      //console.log(con.getElementsByTagName("form")[0])
      //console.log(con.getElementsByClassName("slider")[0])
      this.formFields = this.con.getElementsByTagName("form")[0];
      const clearForm = this.formFields.getElementsByClassName("clearForm")[0]; //TODO How are these working?
      const saveForm = this.formFields.getElementsByClassName("saveForm")[0];
      const validateForm = this.formFields.getElementsByTagName('input');
      validateForm[0].addEventListener("input", this.validate_edit_form);
      validateForm[1].addEventListener("input", this.validate_edit_form);
      validateForm[2].addEventListener("input", this.validate_edit_form);
      clearForm.addEventListener("click", this.clear_edit_form);
      saveForm.addEventListener("click", this.save_edit_form);
      this.proposed_quad = null;
      this.controls = this.formFields;
      this.subject_input = this.formFields[0];
      this.predicate_input = this.formFields[1];
      this.object_input = this.formFields[2];
    }
  }
  on__tr_disable() {
    this.hide_verbs();
    this.hide_form();
  }
  on__tr_enable() {
    this.show_verbs();
    this.show_form();
  }

  hide() {
    $(this.con).hide();
  }
  show() {
    $(this.con).show();
  }

  get_verb_set() {
    return {
      connect: this.huviz.human_term.connect, // aka link
      spawn: this.huviz.human_term.spawn, // aka instantiate
      specialize: this.huviz.human_term.specialize, // aka subclass / subpropertize
      annotate: this.huviz.human_term.annotate
      };
  }

  add_verbs() {
    let prepend;
    const vset = this.get_verb_set();
    this.huviz.gclui.verb_sets.unshift(vset);
    return this.huviz.gclui.add_verb_set(vset);
  }

  ensure_verbs() {
    if (!this.my_verbs) {
      this.my_verbs = this.add_verbs();
      this.hide_verbs();
    }
  }

  hide_verbs() {
    this.my_verbs.style('display','none');
  }

  show_verbs() {
    this.my_verbs.style('display','flex');
  }

  create_edit_form(toggleEdit) {
    const formNode = document.createElement('form');
    formNode.classList.add("cntrl-set", "edit-form");
    formNode.innerHTML = '<input name="subject" placeholder="subject" type="text"/><input id="predicate" name="predicate" placeholder="predicate" type="text"/><input name="object" placeholder="object" type="text"/>';
    formNode.innerHTML += '<button class="saveForm" type="button" disabled>Save</button>';
    formNode.innerHTML += '<button class="clearForm" type="button">Clear</button>';
    toggleEdit.appendChild(formNode);
    this.set_predicate_selector();
  }

  set_predicate_selector() {
    //console.log("setting predicate selector in edit form")
    // Add predicates from Ontology for autocomplete box in edit form
    //pred_array = @huviz.predicate_set
    let availablePredicates = [];
    if (this.huviz.predicate_set) {
      for (let predicate of this.huviz.predicate_set) {
        availablePredicates.push(predicate.lid);
      }
      availablePredicates.push("literal");
    } else {
      availablePredicates = [
        "A",
        "literal"
      ];
    }
    $("#predicate").autocomplete({
      source: availablePredicates,
      open: this.update_predicate_picked,
      close: this.update_predicate_picked,
      change: this.update_predicate_picked,
      position: {
        my: "left bottom",
        at: "left top"
      }
    });
  }

  update_predicate_picked(event, ui) {
    //if event.type is 'autocompletechange'
    const new_pred_value = this.predicate_input.value;
    console.log(`${new_pred_value} is new predicate`);
    this.validate_proposed_edge();
  }

  hide_form() {
    this.con.setAttribute("edit","no");
    this.con.classList.remove("edit-mode");
    //@huviz.set_edit_mode(false)
  }

  show_form() {
    this.con.setAttribute("edit","yes");
    this.con.classList.add("edit-mode");
    //@huviz.set_edit_mode(true)
  }

  toggle_edit_form() {
    const toggleEditMode = this.con.getAttribute("edit");
    //console.log("error") #debugger
    if (toggleEditMode === 'no') { //toggle switched to edit mode, then show form
      this.show_verbs();
      this.show_form();
    }
    if (toggleEditMode === 'yes') { //toggle switched to normal mode, then hide form
      this.hide_verbs();
      this.hide_form();
    }
  }

  validate_edit_form(evt) {
    const form = this.controls;
    const inputFields = form.getElementsByTagName('input');
    const saveButton = form.getElementsByTagName('button')[0];
    // Was this coffeescript:
    //     for i in [0..inputFields.length-1]
    //       elem = form.elements[i]
    for (let i = 0, end = inputFields.length-1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
      const elem = form.elements[i];
      if (elem.value === '') {
        saveButton.disabled = 'disabled';
        break;
      } else {
        saveButton.disabled = false;
      }
    }
    this.adjust_object_datatype();
  }

  predicate_is_DatatypeProperty() {
    // The job of figuring this out is best done in a method because:
    //   * a search up the superclasses of the predicate is needed
    //   * caching that answer might be needed for efficiency
    //   * heuristics in case of ambiguity might be required
    //
    // We can get started on this by just responding to magic values in the predicate.
    //console.log("predicate_is_Datatype has been called")
    if (this.predicate_input) {
      window.THINGY = this.predicate_input;
      const current_value = this.predicate_input.value;
      return current_value === 'literal';
    }
    return false;
  }

  adjust_object_datatype() {
    let placeholder_label;
    if (this.predicate_is_DatatypeProperty()) {
      this.object_datatype_is_literal = true;
      placeholder_label = "a literal value";
    } else {
      this.object_datatype_is_literal = false;
      placeholder_label = "object";
    }
    this.object_input.setAttribute("placeholder", placeholder_label);

    // if the predicate is of DatatypeProperty then
    //  0. replace placeholder to reflect data type needed in object
    //  1. object field will only accpet input according to appropriate type (i.e. literal string, number or date)
  }

  save_edit_form() {
    let i;
    let asc, end;
    const form = this.controls;
    const inputFields = form.getElementsByTagName('input');
    const tuple = [];
    for (i = 0, end = inputFields.length-1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
      const elem = form.elements[i];
      console.log(elem.name + ": " + elem.value);
      tuple.push(elem.value);
    }
    const assrtSave = new IndexedDBStorageController(this.huviz);
    console.log(assrtSave);
    const quad = {
      s: tuple[0],
      p: tuple[1],
      o: tuple[2]
    };
    this.latest_quad = quad;  // REMOVE ONCE saving to the indexedDB is working
    this.huviz.set_proposed_edge(null); // set to nothing, ie stop flagging the edge as proposed
    //@huviz.dbsstorage.assert(quad)
    //assrtSave.assert(quad)
    const saveButton = form.getElementsByTagName('button')[0];
    for (i in inputFields) {
      form.elements[i].value = '';
    }
    saveButton.disabled = true;
    //@proposed_quad = null #set to false (no focused edge)
  }

  clear_edit_form() {
    const form = this.controls;
    const inputFields = form.getElementsByTagName('input');
    const saveButton = form.getElementsByTagName('button')[0];
    for (let i in inputFields) {
      form.elements[i].value = '';
    }
    if (this.proposed_quad) {
      console.log("@proposed_quad:", this.proposed_quad);
      //@huviz.set_proposed_edge(null)
      this.remove_proposed_quad(); // clear existing edge clear from display
    }
    this.set_subject_node();
    this.set_object_node();
    saveButton.disabled = true;
    // TODO why on calling this function does the ability to drag nodes to fill form disabled?
  }

  set_subject_node(node) {
    if (this.subject_node === node) {
      return;
    }
    this.subject_node = node;
    const new_value = (node && node.id) || "";
    console.log(`set_subject_node() id:'${new_value}'`);
    this.subject_input.setAttribute("value",new_value);
    this.validate_edit_form();
    this.validate_proposed_edge();
  }

  set_object_node(node) { // either a node or undefined
    if (this.object_node === node) {
      return; // ignore if there is no change
    }
    this.object_node = node; // might be null
    const new_value = (node && node.id) || "";
    console.log(`set_object_node() id:'${new_value}'`);
    this.object_input.setAttribute("value",new_value);
    this.validate_edit_form();
    this.validate_proposed_edge();
  }

  validate_proposed_edge() { // type = subject or object
    console.log('validate_proposed_edge()');
    // What are the proposed subject node, object node and predicate?
    // Subject and Object fields must have values (IDs of Nodes)
    // Make a quad out of current subject and object (predicate if it is filled)
    //subject_id = @editui.subject_input.value
    const RDF_object  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";
    const RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";

    const subject_id = this.subject_input.value;
    const object_id = this.object_input.value;
    const predicate_val = this.predicate_input.value;

    // propose a new quad once there is a subject and an object
    if (subject_id && object_id) {
      const obj_type = predicate_val === 'literal' ? RDF_literal : RDF_object;
      const q = {
        s: subject_id,
        p: predicate_val || "anything",
        o: {  // keys: type,value[,language]
          type: obj_type,
          value: object_id
        },
        g: "http://" + Date.now()
      };
      // Don't process any edge proposal if it is just the same as the current proposal
      // Ignore requests for edges that are identical to the last edge requested
      if ((this.proposed_quad != null) && this.quads_match(q, this.proposed_quad)) {
        console.log(`... skipping: <s:${q.s}, p:${q.p}, o:${q.o.value}> matches old`);
        return;
      }
      console.log(`... accepting: <s:${q.s}, p:${q.p}, o:${q.o.value}>`);
      this.set_proposed_quad(q);
    }
  }

  quads_match(a, b) {
    return (a.s === b.s) && (a.p === b.p) && (a.o.value === b.o.value);
  }

  set_proposed_quad(new_q) {
    console.log("set_proposed_quad()");
    // If there is an existing edge remove it before setting a new proposed edge
    if (this.proposed_quad) { // There can only be one, so get rid of old proposed edge
      this.remove_proposed_quad();
    }
    this.add_proposed_quad(new_q);
    this.huviz.tick(); // tell the graph to repaint itself
    console.log("Tick in editui.coffee set_proposed_quad");
  }

  add_proposed_quad(q) {
    console.log(("add_proposed_quad() " + q.s + " " + q.p + " " +q.o.value));
    const edge = this.huviz.add_quad(q);
    if (!edge) {
      console.log("error"); //debugger
    }
    this.huviz.set_proposed_edge(edge);
    this.huviz.show_link(edge);
    this.proposed_quad = q;
  }

  remove_proposed_quad() {
    const old_edge = this.huviz.proposed_edge;
    if (old_edge) {
      const edge_id = old_edge.id;
      this.huviz.set_proposed_edge(null);
      //@huviz.remove_link(edge_id)
      //@huviz.unshow_link(old_edge)
      this.huviz.delete_edge(old_edge);
    }
      //delete @huviz.edges_by_id[old_edge]
    this.proposed_quad = null;
  }
}

