###
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
###

# import uniquer from 'uniquer.js'; // TODO convert to module

class TreePicker
  constructor: (@elem, root, extra_classes, @needs_expander, @use_name_as_label, @squash_case_during_sort, @style_context_selector) ->
    # The @style_context_selector is only really needed by colortreepicker
    if extra_classes?
      @extra_classes = extra_classes
    if not @use_name_as_label?
      @use_name_as_label = true
    if not @squash_case_during_sort?
      @squash_case_during_sort = true
    @id_to_elem = {}
    @id_to_elem['/'] = @elem
    @ids_in_arrival_order = [root]
    @id_is_abstract = {}
    @id_is_collapsed = {}
    @id_to_state =
      true: {}
      false: {}
    @id_to_parent = {root: '/'}
    @id_to_children = {'/': [root]}
    @id_to_payload_collapsed = {}
    @id_to_payload_expanded = {}
    @id_to_name = {}
    @set_abstract(root) # FIXME is this needed?
    @set_abstract('/')
    @set_abstract('root') # FIXME duplication?!?
  get_my_id: () ->
    @elem.attr("id")
  shield: ->
    if not @_shield
      d3.select(@elem.node()).style('position','relative')
      @_shield = d3.select(@elem.node()).insert('div')
      @_shield.classed('shield',true)
    rect = d3.select(@elem.node()).node().getBoundingClientRect()
    styles =
      display: 'block'
      width: "#{rect.width}px"
      height: "#{rect.height}px"
    @_shield.style(styles)
    @
  unshield: ->
    @_shield.style
      display: 'none'
    @
  set_abstract: (id) ->
    @id_is_abstract[id] = true
    return
  get_abstract_count: ->
    return Object.keys(@id_is_abstract).length
  is_abstract: (id) -> # ie class has no direct instances but maybe subclasses
    tmp = @id_is_abstract[id]
    return tmp? and tmp
  uri_to_js_id: (uri) ->
    return uniquer(uri)
  get_childrens_ids: (parent_id) ->
    parent_id ?= '/' # if no parent indicated, return root's kids
    return @id_to_children[parent_id] or []
  get_container_elem_within_id: (an_id) ->
    # the div with class='container' holding class='contents' divs
    content_elem = @id_to_elem[an_id].node()
    return content_elem.querySelector('.container')
  resort_recursively: (an_id) ->
    an_id ?= '/' # if an_id not provided, then sort the root
    kids_ids = @get_childrens_ids(an_id)
    if not kids_ids or not kids_ids.length
      return
    val_elem_pairs = []
    sort_by_first_item = (a, b) ->
      return a[0].localeCompare(b[0])
    for child_id in kids_ids
      @resort_recursively(child_id)
      val = @get_comparison_value(child_id, @id_to_name[child_id])
      child_elem = @id_to_elem[child_id].node()
      @update_label_for_node(child_id, child_elem)
      val_elem_pairs.push([val, child_elem])
    val_elem_pairs.sort(sort_by_first_item)
    container_elem = @get_container_elem_within_id(an_id)
    if not container_elem
      throw "no container_elem"
    for val_elem_pair in val_elem_pairs
      child_elem = val_elem_pair[1]
      container_elem.appendChild(child_elem)
    return
  update_label_for_node: (node_id, node_elem) -> # passing node_elem is optional
    # This takes the current value of @id_to_name[node_id] and displays it in the HTML.
    # Why? Because the label might be a MultiString whose language might have changed.
    node_elem ?= @id_to_elem[node_id] # look up node_elem if it is not passed in
    label_elem = node_elem.querySelector('p.treepicker-label span.label')
    if label_elem?
      label_elem.textContent = @id_to_name[node_id]
    return
  get_comparison_value: (node_id, label) ->
    if @use_name_as_label
      this_term = (label or node_id)
    else
      this_term = node_id
    if @squash_case_during_sort is true # expose this as a setting
      this_term = this_term.toLowerCase()
    return this_term
  add_alphabetically: (i_am_in, node_id, label) ->
    label_lower = label.toLowerCase()
    container = i_am_in.node()
    this_term = @get_comparison_value(node_id, label)
    for elem in container.children
      other_term = @get_comparison_value(elem.id, @id_to_name[elem.id])
      if (other_term > this_term)
        return @add_to_elem_before(i_am_in, node_id, "#"+elem.id, label)
    # fall through and append if it comes before nothing
    return @add_to_elem_before(i_am_in, node_id, undefined, label)
  add_to_elem_before: (i_am_in, node_id, before, label) ->
    return i_am_in.insert('div', before). # insert just appends if before is undef
        attr('class','contents').
        attr('id',node_id)
  show_tree: (tree, i_am_in, listener, top) ->
    # http://stackoverflow.com/questions/14511872
    top = not top? or top
    for node_id,rest of tree
      label = rest[0]
      #label = "┗ " + rest[0]

      # FIXME the creation of a node in the tree should be extracted into a method
      #       rather than being spread across this one and add_alphabetically.
      #       Setting @id_to_elem[node_id] should be in the new method
      contents_of_me = @add_alphabetically(i_am_in, node_id, label)
      @id_to_elem[node_id] = contents_of_me
      picker = this
      contents_of_me.on('click', @click_handler)
      contents_of_me.append("p").attr("class", "treepicker-label").
        append('span').attr('class','label').text(label)
      if rest.length > 1
        my_contents = @get_or_create_container(contents_of_me)
        if top and @extra_classes
          for css_class in @extra_classes
            my_contents.classed(css_class, true)
        @show_tree(rest[1], my_contents, listener, false)
    return
  click_handler: () =>
    picker = this
    elem = d3.select(d3.event.target)
    d3.event.stopPropagation()
    id = elem.node().id
    while not id
      elem = d3.select(elem.node().parentElement)
      id = elem.node().id
    picker.handle_click(id) #, send_leafward)
    # This is hacky but ColorTreePicker.click_handler() needs the id too
    return id
  handle_click: (id) =>
    # If this is called then id itself was itself click, not triggered by recursion
    @go_to_next_state(id, @get_next_state_args(id))
    return
  get_next_state_args: (id) ->
    elem = @id_to_elem[id]
    if not elem
      throw new Error("elem for '#{id}' not found")
    is_treepicker_collapsed = elem.classed('treepicker-collapse')
    is_treepicker_showing = elem.classed('treepicker-showing')
    is_treepicker_indirect_showing = elem.classed('treepicker-indirect-showing')
    # If the state is not 'showing' then make it so, otherwise 'unshowing'.
    # if it is not currently showing.
    new_state = 'showing'
    if is_treepicker_collapsed
      if is_treepicker_indirect_showing
        new_state = 'unshowing'
    else
      if is_treepicker_showing
        new_state = 'unshowing'
    return {
      new_state: new_state
      collapsed: is_treepicker_collapsed
      original_click: true
    }
  go_to_next_state: (id, args) ->
    listener = @click_listener
    send_leafward = @id_is_collapsed[id]
    @effect_click(id, args.new_state, send_leafward, listener, args)
    return
  effect_click: (id, new_state, send_leafward, listener, args) ->
    if send_leafward
      kids = @id_to_children[id]
      if kids?
        for child_id in kids
          if child_id isnt id
            @effect_click(child_id, new_state, send_leafward, listener)
    if listener?  # TODO(shawn) replace with custom event?
      elem = @id_to_elem[id]
      listener.call(this, id, new_state, elem, args) # now this==picker not the event
    return
  get_or_create_container: (contents) ->
    r = contents.select(".container")
    if r.node() isnt null
      return r
    contents.append('div').attr('class','container')
  get_top: ->
    return @ids_in_arrival_order[0] or @id
  set_name_for_id: (name, id) ->
    if @use_name_as_label
      @id_to_name[id] = name
    else
      @id_to_name[id] = id
    return
  add: (new_id, parent_id, name, listener) ->
    @ids_in_arrival_order.push(new_id)
    parent_id = parent_id? and parent_id or @get_top()
    new_id = @uri_to_js_id(new_id)
    @id_is_collapsed[new_id] = false
    parent_id = @uri_to_js_id(parent_id)
    @id_to_parent[new_id] = parent_id
    if not @id_to_children[parent_id]?
      @id_to_children[parent_id] = []
    if new_id isnt parent_id
      @id_to_children[parent_id].push(new_id)
    #@id_to_state[true][new_id] = "empty" # default meaning "no instances"
    #@id_to_state[false][new_id] = "empty" # default meaning "no instances"
    name = name? and name or new_id
    branch = {}
    branch[new_id] = [name or new_id]
    @id_to_name[new_id] = name
    parent = @id_to_elem[parent_id] or @elem
    container = d3.select(@get_or_create_container(parent).node())
    if @needs_expander
      @get_or_create_expander(parent,parent_id)
    @show_tree(branch, container, listener)
    return
  collapser_str: "▼" # 0x25bc
  expander_str: "▶" # 0x25b6
  get_or_create_expander: (thing, id) ->
    if thing? and thing
      r = thing.select(".expander")
      if r.node() isnt null
        return r
      exp = thing.select(".treepicker-label").
          append('span').
          classed("expander", true).
          text(@collapser_str)
      @id_is_collapsed[id] = false
      picker = this
      exp.on 'click', () => # TODO: make this function a method on the class
        d3.event.stopPropagation()
        id2 = exp.node().parentNode.parentNode.getAttribute("id")
        if id2 isnt id
          console.error("expander.click() #{id} <> #{id2}")
        if @id_is_collapsed[id2]
          @expand_by_id(id2)
        else
          @collapse_by_id(id2)
  collapse_by_id: (id) ->
    @id_is_collapsed[id] = true
    elem = @id_to_elem[id]
    elem.classed("treepicker-collapse", true)
    exp = elem.select(".expander")
    exp.text(@expander_str)
    @update_payload_by_id(id)
    return
  expand_by_id: (id) ->
    @id_is_collapsed[id] = false
    elem = @id_to_elem[id]
    elem.classed("treepicker-collapse", false)
    exp = elem.select(".expander")
    exp.text(@collapser_str)
    @update_payload_by_id(id)
    return
  expand_all: ->
    for id, collapsed of @id_is_collapsed
      if collapsed
        @expand_by_id(id)
    return
  get_or_create_payload: (thing) ->
    if thing? and thing
      thing_id = thing.node().id
      r = thing.select("##{thing_id} > .treepicker-label > .payload")
      if r.node() isnt null
        return r
      thing.select(".treepicker-label").append('span').classed("payload", true)
    return
  set_payload: (id, value) ->
    elem = @id_to_elem[id]
    if not elem? #and elem isnt null
      console.warn "set_payload could not find '#{id}'"
      return
    payload = @get_or_create_payload(elem)
    if payload?
      if value?
        payload.text(value)
      else
        payload.remove()
    return
  set_title: (id, title) ->
    elem = @id_to_elem[id]
    if elem?
      elem.attr("title", title)
    return
  set_direct_state: (id, state, old_state) ->
    if not old_state?
      old_state = @id_to_state[true][id]
    @id_to_state[true][id] = state
    elem = @id_to_elem[id]
    if not elem
      console.warn("set_direct_state(#{id}, #{state}, #{old_state}) NO elem for id on @id_to_elem")
      return
    if old_state?
      elem.classed("treepicker-#{old_state}", false)
    if state?
      elem.classed("treepicker-#{state}", true)
    return
  set_indirect_state: (id, state, old_state) ->
    if not state?
      console.error("#{@get_my_id()}.set_indirect_state()",
                    arguments, "state should never be",undefined)
    if not old_state?
      old_state = @id_to_state[false][id]
    @id_to_state[false][id] = state  # false means indirect
    elem = @id_to_elem[id]
    if not elem
      console.warn("set_indirect_state(#{id}, #{state}, #{old_state}) NO elem for id on @id_to_elem")
      return
    if old_state?
      elem.classed("treepicker-indirect-#{old_state}",false)
    if state?
      elem.classed("treepicker-indirect-#{state}",true)
    return
  set_both_states_by_id: (id, direct_state, indirect_state, old_state, old_indirect_state) ->
    @set_direct_state(id, direct_state, old_state)
    @set_indirect_state(id, indirect_state, old_indirect_state)
    # the responsibility for knowing that parent state should change is Taxons
    return
  is_leaf: (id) ->
    return (not @id_to_children[id]?) or @id_to_children[id].length is 0
  update_parent_indirect_state: (id) ->
    # Update the indirect_state of the parents up the tree
    parent_id = @id_to_parent[id]
    child_is_leaf = @is_leaf(id)
    if parent_id? and parent_id isnt id
      child_indirect_state = @id_to_state[false][id]
      parent_indirect_state = @id_to_state[false][parent_id]
      #if not parent_indirect_state?
        # console.warn("#{my_id}.update_parent_indirect_state()", {parent_id: parent_id, parent_indirect_state: parent_indirect_state, child_indirect_state: child_indirect_state})
        # use the parent's direct state as a default
        # new_parent_indirect_state = @id_to_state[true][parent_id]
      new_parent_indirect_state = parent_indirect_state
      if child_indirect_state isnt parent_indirect_state
        new_parent_indirect_state = @calc_new_indirect_state(parent_id)
      if new_parent_indirect_state isnt parent_indirect_state
        @set_indirect_state(parent_id, new_parent_indirect_state)
        # a change has happened, so propagate rootward
      #else
      #  console.info("#{@get_my_id()}.update_parent_indirect_state()",id, "still state:", new_parent_indirect_state)
      # console.info("#{@get_my_id()}.update_parent_indirect_state()", {parent_id: parent_id, parent_indirect_state: parent_indirect_state, child_indirect_state: child_indirect_state, new_parent_indirect_state: new_parent_indirect_state})
      @update_parent_indirect_state(parent_id)
    return
  calc_new_indirect_state: (id) ->
    # If every time a node has its direct state change it tells its
    # parent to check whether the parents direct children share that
    # parents direct state then everybodys indirect state can be maintained.
    old_indirect_state = @id_to_state[false][id]
    old_direct_state = @id_to_state[true][id]
    for child_id in @id_to_children[id]
      child_indirect_state = @id_to_state[false][child_id]
      if child_indirect_state isnt new_indirect_state
        if not new_indirect_state?
          new_indirect_state = child_indirect_state
        else
          new_indirect_state = "mixed"
      if new_indirect_state is 'mixed'
        # once we are mixed there is no going back, so break
        break
    if old_direct_state? and new_indirect_state isnt old_direct_state
      new_indirect_state = "mixed"
    return new_indirect_state
  get_state_by_id: (id, direct_only) ->
    if not direct_only?
      direct_only = true
    return @id_to_state[direct_only][id]
      # In ballrm.nq Place has direct_state = undefined because Place has
      # no direct instances so it never has an explicit state set.
      # Should there be a special state for such cases?
      # It would be useful to be able to style such nodes to communicate
      # that they are unpopulated / can't really be selected, etc.
      # Perhaps they could be italicized because they deserve a color since
      # they might have indirect children.
  onChangeState: (evt) =>
    det = evt.detail
    if det.new_indirect_state?
      @set_both_states_by_id(det.target_id, det.new_state, det.new_indirect_state, det.old_state, det.old_indirect_state)
    else
      @set_state_by_id(det.target_id, det.new_state, det.old_state)
    @cache_payload(det)
  cache_payload: (det) ->
    update = false
    if det.collapsed_payload?
      update = true
      @id_to_payload_collapsed[det.target_id] = det.collapsed_payload
    if det.payload?
      update = true
      @id_to_payload_expanded[det.target_id] = det.payload
    if update
      @update_payload_by_id(det.target_id)
    return
  update_payload_by_id: (id) ->
    if @id_is_collapsed[id]
      payload = @id_to_payload_collapsed[id]
      if payload?
        @set_payload(id, payload)
    else
      payload =  @id_to_payload_expanded[id]
      if payload?
        @set_payload(id, payload)
    return

(exports ? this).TreePicker = TreePicker
