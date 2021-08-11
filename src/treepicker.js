/*
Build and control a hierarchic menu of arbitrarily nested divs looking like:

    +-----------------------+
    |      +---------------+|
    |      |        +-----+||
    | All▼ |People▼ |Men  |||
    |      |        +-----+||
    |      |        +-----+||
    |      |        |Women|||
    |      |        +-----+||
    |      +---------------+|
    +-----------------------+

* The user can toggle between collapsed and expanded using the triangles.
* On the other hand, branches in the tree which are empty are hidden.
* Clicking uncollapsed branches cycles just their selectedness not their children.
* Clicking collapsed branches cycles the selectedness of them and their children.

* <div class="container"> a container holds one or more contents
* <div class="contents"> a content (ie a node such as THING) may have a container for it kids
* so the CONTENT with id=Thing is within the root CONTAINER
     and the Thing CONTENT itself holds a CONTAINER with the child CONTENTS of its subclasses

Possible Bug: it appears that <div class="container" id="classes"> has a redundant child
                which looks like <div class="container">.
              It is unclear why this is needed.  Containers should not directly hold containers.
*/

import {uniquer} from './uniquer.js'; // TODO convert to module

/*
  This method is intended to replace D3 constructions like:
      const d3elem = thing.select(".treepicker-label")
      const exp = d3elem.
          append('span').
          classed("expander", true).
          text(this.collapser_str);
   with
       const domElem = thing.querySelector(".treepicker-label")
       const exp = append_html_to(
           `<span class="expander">${this.collapser_str}</span>`,
           domElem);
*/
export function append_html_to(html, elem) {
  elem.insertAdjacentHTML('beforeend', html);
  return elem.children[elem.children.length - 1]
}

export class TreePicker {
  static initClass() {
    this.prototype.collapser_str = "▼"; // 0x25bc
    this.prototype.expander_str = "▶";
  }
  constructor(elem, root, extra_classes, needs_expander, use_name_as_label, squash_case_during_sort, style_context_selector) {
    // The @style_context_selector is only really needed by colortreepicker
    if(elem.node){
      elem = elem.node();
    }
    //not circular -- ensuring treepicker.xfunction is bound to the right 'this' if called externally
    this.click_handler = this.click_handler.bind(this);
    this.handle_click = this.handle_click.bind(this);
    this.onChangeState = this.onChangeState.bind(this);

    this.elem = elem;
    this.needs_expander = needs_expander;
    this.use_name_as_label = use_name_as_label;
    this.squash_case_during_sort = squash_case_during_sort;
    this.style_context_selector = style_context_selector;
    if (extra_classes != null) {
      this.extra_classes = extra_classes;
    }
    if ((this.use_name_as_label == null)) {
      this.use_name_as_label = true;
    }
    if ((this.squash_case_during_sort == null)) {
      this.squash_case_during_sort = true;
    }
    this.id_to_elem = {};
    this.id_to_elem['/'] = this.elem;
    this.ids_in_arrival_order = [root];
    this.id_is_abstract = {};
    this.id_is_collapsed = {};
    this.id_to_state = {
      true: {},
      false: {}
    };
    this.id_to_parent = {root: '/'};
    this.id_to_children = {'/': [root]};
    this.id_to_payload_collapsed = {};
    this.id_to_payload_expanded = {};
    this.id_to_name = {};
    this.set_abstract(root); // FIXME is this needed?
    this.set_abstract('/');
    this.set_abstract('root'); // FIXME duplication?!?
  }
  get_my_id() {
    return this.elem.getAttribute("id");
  }
  //makes the treepicker unselectable and makes it available for styling through shield class
  shield() {
    if (!this._shield) {
      this.elem.setAttribute('position', 'relative')
      this._shield = this.elem.insertAdjacentHTML(
        'afterbegin',
        `<div class="shield"></div>`);
    }
    const rect = this.elem.getBoundingClientRect();
    const styles = {
      display: 'block',
      width: `${rect.width}px`,
      height: `${rect.height}px`
    };
    this._shield.style(styles);
    return this;
  }
  unshield() {
    this._shield.style({
      display: 'none'});
    return this;
  }
  set_abstract(id) {
    this.id_is_abstract[id] = true;
  }
  get_abstract_count() {
    return Object.keys(this.id_is_abstract).length;
  }
  is_abstract(id) { // ie class has no direct instances but maybe subclasses
    const tmp = this.id_is_abstract[id];
    return (tmp != null) && tmp;
  }
  uri_to_js_id(uri) {
    return uniquer(uri);
  }
  get_childrens_ids(parent_id) {
    if (parent_id == null) { parent_id = '/'; } // if no parent indicated, return root's kids
    return this.id_to_children[parent_id] || [];
  }
  get_container_elem_within_id(an_id) {
    // the div with class='container' holding class='contents' divs
    const content_elem = this.id_to_elem[an_id];
    return content_elem.querySelector('.container');
  }
  resort_recursively(an_id) {
    let child_elem;
    if (an_id == null) { an_id = '/'; } // if an_id not provided, then sort the root
    const kids_ids = this.get_childrens_ids(an_id);
    if (!kids_ids || !kids_ids.length) {
      return;
    }
    const val_elem_pairs = [];
    const sort_by_first_item = (a, b) => a[0].localeCompare(b[0]);
    for (let child_id of kids_ids) {
      this.resort_recursively(child_id);
      const val = this.get_sortable_value(child_id, this.id_to_name[child_id]);
      child_elem = this.id_to_elem[child_id];
      this.update_label_for_node(child_id, child_elem);
      val_elem_pairs.push([val, child_elem]);
    }
    val_elem_pairs.sort(sort_by_first_item);
    const container_elem = this.get_container_elem_within_id(an_id);
    if (!container_elem) {
      throw "no container_elem";
    }
    for (let val_elem_pair of val_elem_pairs) {
      child_elem = val_elem_pair[1];
      container_elem.appendChild(child_elem);
    }
  }
  update_label_for_node(node_id, node_elem) { // passing node_elem is optional
    // This takes the current value of @id_to_name[node_id] and displays it in the HTML.
    // Why? Because the label might be a MultiString whose language might have changed.
    if (node_elem == null) { node_elem = this.id_to_elem[node_id]; } // look up node_elem if it is not passed in
    const label_elem = node_elem.querySelector('p.treepicker-label span.label');
    if (label_elem != null) {
      label_elem.textContent = this.id_to_name[node_id];
    }
  }
  get_sortable_value(node_id, label) {
    let this_term;
    if (this.use_name_as_label) {
      this_term = (label || node_id);
    } else {
      this_term = node_id;
    }
    if (this.squash_case_during_sort === true) { // expose this as a setting
      this_term = this_term.toLowerCase();
    }
    return this_term;
  }
  add_alphabetically(add_to_container, node_id, label) {
    //const label_lower = label.toLowerCase();
    //const container = i_am_in;
    const this_term = this.get_sortable_value(node_id, label);
    for (let other_elem of add_to_container.children) {
      const other_term = this.get_sortable_value(other_elem.id, this.id_to_name[other_elem.id]);
      if (other_term > this_term) {
        return this.add_to_elem_before(add_to_container, node_id, other_elem, label);
      }
    }
    // fall through and append if it comes before nothing
    return this.add_to_elem_before(add_to_container, node_id, undefined, label);
  }

  add_to_elem_before(add_to_container, node_id, before, label) {
    let elem, where;
    if(before){
      elem = before;
      where = "beforebegin";
    }
    else{
      elem = add_to_container;
      where = "beforeend"
    }
    //before = before || add_to_container;
    elem.insertAdjacentHTML(
      where,
      `<div class="contents" id="${node_id}"></div>`);
    let find_node_in = add_to_container.parentNode; // look far enough out
    return find_node_in.querySelector('#'+node_id);
  }
  show_tree(tree, i_am_in, listener, top) {
    // http://stackoverflow.com/questions/14511872
    top = (top == null) || top;
    for (let node_id in tree) {
      const rest = tree[node_id];
      const label = rest[0];
      //label = "┗ " + rest[0]

      // FIXME the creation of a node in the tree should be extracted into a method
      //       rather than being spread across this one and add_alphabetically.
      //       Setting @id_to_elem[node_id] should be in the new method
      const contents_of_me = this.add_alphabetically(i_am_in, node_id, label);
      this.id_to_elem[node_id] = contents_of_me;
      const picker = this;
      //D3: dependency to unravel (seems like insertAdjacentHTML of p beforeend )
      contents_of_me.addEventListener('click', this.click_handler);
      contents_of_me.insertAdjacentHTML(
        'beforeend',
        `<p class="treepicker-label"><span class="label">${label}</span></p>`);
      if (rest.length > 1) {
        const my_contents = this.get_or_create_container(contents_of_me);
        if (top && this.extra_classes) {
          for (let css_class of this.extra_classes) {
            my_contents.classList.add(css_class)
          }
        }
        this.show_tree(rest[1], my_contents, listener, false);
      }
    }
  }
  //D3: needs work for removing d3 dependency for d3.event.target
  click_handler(evt) {
    const picker = this;
    let elem = evt.target;
    evt.stopPropagation();
    let {id} = elem;
    while (!id) {
      elem = elem.parentElement;
      id = elem.id;
    }
    picker.handle_click(id); //, send_leafward)
    // This is hacky but ColorTreePicker.click_handler() needs the id too
    return id;
  }
  handle_click(id) {
    // If this is called then id itself was itself click, not triggered by recursion
    this.go_to_next_state(id, this.get_next_state_args(id));
  }
  get_next_state_args(id) {
    const elem = this.id_to_elem[id];
    if (!elem) {
      throw new Error(`elem for '${id}' not found`);
    }
    //D3: need to change to elem.setAttribute('class', 'x')
    const cl = elem.classList;
    const is_treepicker_collapsed = cl.contains('treepicker-collapse');
    const is_treepicker_showing = cl.contains('treepicker-showing');
    const is_treepicker_indirect_showing = cl.contains('treepicker-indirect-showing');

    // If the state is not 'showing' then make it so, otherwise 'unshowing'.
    // if it is not currently showing.
    let new_state = 'showing';
    if (is_treepicker_collapsed) {
      if (is_treepicker_indirect_showing) {
        new_state = 'unshowing';
      }
    } else {
      if (is_treepicker_showing) {
        new_state = 'unshowing';
      }
    }
    return {
      new_state,
      collapsed: is_treepicker_collapsed,
      original_click: true
    };
  }
  go_to_next_state(id, args) {
    const listener = this.click_listener;
    const send_leafward = this.id_is_collapsed[id];
    this.effect_click(id, args.new_state, send_leafward, listener, args);
  }
  effect_click(id, new_state, send_leafward, listener, args) {
    if (send_leafward) {
      const kids = this.id_to_children[id];
      if (kids != null) {
        for (let child_id of kids) {
          if (child_id !== id) {
            this.effect_click(child_id, new_state, send_leafward, listener);
          }
        }
      }
    }
    if (listener != null) {  // TODO(shawn) replace with custom event?
      const elem = this.id_to_elem[id];
      listener.call(this, id, new_state, elem, args); // now this==picker not the event
    }
  }

  get_or_create_container(contents) {
    const r = contents.querySelector(".container");
    if (r !== null) {
      return r;
    }
    return append_html_to(`<div class="container"></div>`, contents);
  }
  get_top() {
    return this.ids_in_arrival_order[0] || this.id;
  }
  set_name_for_id(name, id) {
    if (this.use_name_as_label) {
      this.id_to_name[id] = name;
    } else {
      this.id_to_name[id] = id;
    }
  }
  add(new_id, parent_id, name, listener) {
    this.ids_in_arrival_order.push(new_id);
    parent_id = ((parent_id != null) && parent_id) || this.get_top();
    new_id = this.uri_to_js_id(new_id);
    this.id_is_collapsed[new_id] = false;
    parent_id = this.uri_to_js_id(parent_id);
    this.id_to_parent[new_id] = parent_id;
    if ((this.id_to_children[parent_id] == null)) {
      this.id_to_children[parent_id] = [];
    }
    if (new_id !== parent_id) {
      this.id_to_children[parent_id].push(new_id);
    }
    //@id_to_state[true][new_id] = "empty" # default meaning "no instances"
    //@id_to_state[false][new_id] = "empty" # default meaning "no instances"
    name = ((name != null) && name) || new_id;
    const branch = {};
    branch[new_id] = [name || new_id];
    this.id_to_name[new_id] = name;
    const parent = this.id_to_elem[parent_id] || this.elem;
    //D3 dependency
    const container = this.get_or_create_container(parent);
    if (this.needs_expander) {
      this.get_or_create_expander(parent,parent_id);
    }
    this.show_tree(branch, container, listener);
     // 0x25b6
  }
  get_or_create_expander(thing, id) {
    if ((thing != null) && thing) {
      const r = thing.querySelector(".expander");
      if (r !== null) {
        return r;
      }
      this.id_is_collapsed[id] = false;
      const domElem = thing.querySelector(".treepicker-label");
      if(!domElem){
        return;
      }
      const exp = append_html_to(
          `<span class="expander">${this.collapser_str}</span>`,
          domElem);
      const picker = this;
      exp.addEventListener('click', () => { // TODO: make this function a method on the class
        // d3.event.stopPropagation();
        const id2 = exp.parentNode.parentNode.getAttribute("id");
        if (id2 !== id) {
          console.error(`expander.click() ${id} <> ${id2}`);
        }
        if (this.id_is_collapsed[id2]) {
          return this.expand_by_id(id2);
        } else {
          return this.collapse_by_id(id2);
        }
      });
    }
  }

  collapse_by_id(id) {
    this.id_is_collapsed[id] = true;
    const elem = this.id_to_elem[id];
    elem.classList.add("treepicker-collapse");
    const exp = elem.querySelector(".expander");
    exp.innerText = this.expander_str;
    this.update_payload_by_id(id);
  }
  expand_by_id(id) {
    this.id_is_collapsed[id] = false;
    const elem = this.id_to_elem[id];
    elem.classList.remove("treepicker-collapse");
    const exp = elem.querySelector(".expander");
    exp.innerText = this.collapser_str;
    this.update_payload_by_id(id);
  }
  expand_all() {
    for (let id in this.id_is_collapsed) {
      const collapsed = this.id_is_collapsed[id];
      if (collapsed) {
        this.expand_by_id(id);
      }
    }
  }
  get_or_create_payload(thing) {
    if ((thing != null) && thing) {
      const thing_id = thing.id;
      const payload = thing.querySelector(
        `#${thing_id} > .treepicker-label > .payload`);
      if (payload !== null) {
        return payload;
      }
      let labelElem = thing.querySelector(".treepicker-label");
      return append_html_to(
        `<span class="payload"></span>`,
        labelElem);
    }
  }
  set_payload(id, value) {
    const elem = this.id_to_elem[id];
    if ((elem == null)) { //and elem isnt null
      console.warn(`set_payload could not find '${id}'`);
      return;
    }
    const payload = this.get_or_create_payload(elem);
    if (payload != null) {
      if (value != null) {
        payload.innerText = value;
      } else {
        payload.remove();
      }
    }
  }
  set_title(id, title) {
    const elem = this.id_to_elem[id];
    if (elem != null) {
      elem.setAttribute("title", title);
    }
  }
  set_direct_state(id, state, old_state) {
    if ((old_state == null)) {
      old_state = this.id_to_state[true][id];
    }
    this.id_to_state[true][id] = state;
    const elem = this.id_to_elem[id];
    if (!elem) {
      console.warn(`set_direct_state(${id}, ${state}, ${old_state}) NO elem for id on @id_to_elem`);
      return;
    }
    if (old_state != null) {
      elem.classList.remove(`treepicker-${old_state}`);
    }
    if (state != null) {
      elem.classList.add(`treepicker-${state}`);
    }
  }
  set_indirect_state(id, state, old_state) {
    if ((state == null)) {
      console.error(`${this.get_my_id()}.set_indirect_state()`,
                    arguments, "state should never be",undefined);
    }
    if ((old_state == null)) {
      old_state = this.id_to_state[false][id];
    }
    this.id_to_state[false][id] = state;  // false means indirect
    const elem = this.id_to_elem[id];
    if (!elem) {
      console.warn(`set_indirect_state(${id}, ${state}, ${old_state}) NO elem for id on @id_to_elem`);
      return;
    }
    if (old_state != null) {
      elem.classList.remove(`treepicker-indirect-${old_state}`)
    }
    if (state != null) {
      elem.classList.add(`treepicker-indirect-${state}`)
    }
  }
  set_both_states_by_id(id, direct_state, indirect_state, old_state, old_indirect_state) {
    this.set_direct_state(id, direct_state, old_state);
    this.set_indirect_state(id, indirect_state, old_indirect_state);
    // the responsibility for knowing that parent state should change is Taxons
  }
  is_leaf(id) {
    return ((this.id_to_children[id] == null)) || (this.id_to_children[id].length === 0);
  }
  update_parent_indirect_state(id) {
    // Update the indirect_state of the parents up the tree
    const parent_id = this.id_to_parent[id];
    const child_is_leaf = this.is_leaf(id);
    if ((parent_id != null) && (parent_id !== id)) {
      const child_indirect_state = this.id_to_state[false][id];
      const parent_indirect_state = this.id_to_state[false][parent_id];
      //if not parent_indirect_state?
        // console.warn("#{my_id}.update_parent_indirect_state()", {parent_id: parent_id, parent_indirect_state: parent_indirect_state, child_indirect_state: child_indirect_state})
        // use the parent's direct state as a default
        // new_parent_indirect_state = @id_to_state[true][parent_id]
      let new_parent_indirect_state = parent_indirect_state;
      if (child_indirect_state !== parent_indirect_state) {
        new_parent_indirect_state = this.calc_new_indirect_state(parent_id);
      }
      if (new_parent_indirect_state !== parent_indirect_state) {
        this.set_indirect_state(parent_id, new_parent_indirect_state);
      }
        // a change has happened, so propagate rootward
      //else
      //  console.info("#{@get_my_id()}.update_parent_indirect_state()",id, "still state:", new_parent_indirect_state)
      // console.info("#{@get_my_id()}.update_parent_indirect_state()", {parent_id: parent_id, parent_indirect_state: parent_indirect_state, child_indirect_state: child_indirect_state, new_parent_indirect_state: new_parent_indirect_state})
      this.update_parent_indirect_state(parent_id);
    }
  }
  calc_new_indirect_state(id) {
    // If every time a node has its direct state change it tells its
    // parent to check whether the parents direct children share that
    // parents direct state then everybodys indirect state can be maintained.
    let new_indirect_state;
    const old_indirect_state = this.id_to_state[false][id];
    const old_direct_state = this.id_to_state[true][id];
    for (let child_id of this.id_to_children[id]) {
      const child_indirect_state = this.id_to_state[false][child_id];
      if (child_indirect_state !== new_indirect_state) {
        if ((new_indirect_state == null)) {
          new_indirect_state = child_indirect_state;
        } else {
          new_indirect_state = "mixed";
        }
      }
      if (new_indirect_state === 'mixed') {
        // once we are mixed there is no going back, so break
        break;
      }
    }
    if ((old_direct_state != null) && (new_indirect_state !== old_direct_state)) {
      new_indirect_state = "mixed";
    }
    return new_indirect_state;
  }
  get_state_by_id(id, direct_only) {
    if ((direct_only == null)) {
      direct_only = true;
    }
    return this.id_to_state[direct_only][id];
  }
      // In ballrm.nq Place has direct_state = undefined because Place has
      // no direct instances so it never has an explicit state set.
      // Should there be a special state for such cases?
      // It would be useful to be able to style such nodes to communicate
      // that they are unpopulated / can't really be selected, etc.
      // Perhaps they could be italicized because they deserve a color since
      // they might have indirect children.
  onChangeState(evt) {
    const det = evt.detail;
    if (det.new_indirect_state != null) {
      this.set_both_states_by_id(det.target_id, det.new_state, det.new_indirect_state, det.old_state, det.old_indirect_state);
    } else {
      this.set_state_by_id(det.target_id, det.new_state, det.old_state);
    }
    return this.cache_payload(det);
  }
  cache_payload(det) {
    let update = false;
    if (det.collapsed_payload != null) {
      update = true;
      this.id_to_payload_collapsed[det.target_id] = det.collapsed_payload;
    }
    if (det.payload != null) {
      update = true;
      this.id_to_payload_expanded[det.target_id] = det.payload;
    }
    if (update) {
      this.update_payload_by_id(det.target_id);
    }
  }
  update_payload_by_id(id) {
    let payload;
    if (this.id_is_collapsed[id]) {
      payload = this.id_to_payload_collapsed[id];
      if (payload != null) {
        this.set_payload(id, payload);
      }
    } else {
      payload =  this.id_to_payload_expanded[id];
      if (payload != null) {
        this.set_payload(id, payload);
      }
    }
  }
}
TreePicker.initClass();
