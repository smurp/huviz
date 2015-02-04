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
* Clicking uncollapsed branches cycles just their selectedness.
* Clicking collapsed branches cycles the selectedness of them and their children.
###
  
class TreePicker
  constructor: (@elem, root, extra_classes, @needs_expander) ->
    if extra_classes?
      @extra_classes = extra_classes
    @id_to_elem = {root:elem} # FIXME remove root
    @id_to_elem[root] = elem
    @ids_in_arrival_order = [root]
    @id_is_abstract = {}
    @id_is_collapsed = {}
    @id_to_state =
      true: {}
      false: {}
    @id_to_parent = {}
    @id_to_children = {}
    @set_abstract(root)
    @set_abstract('root') # FIXME duplication?!?
  get_my_id: () ->
    @elem.attr("id")
  set_abstract: (id) ->
    @id_is_abstract[id] = true
  get_abstract_count: ->
    return Object.keys(@id_is_abstract).length
  is_abstract: (id) ->
    tmp = @id_is_abstract[id]
    tmp? and tmp
  uri_to_js_id: (uri) ->
    uri.match(/([\w\d\_\-]+)$/g)[0]
  add_alphabetically: (i_am_in, node_id, label) ->
    label_lower = label.toLowerCase()
    container = i_am_in[0][0]
    for elem in container.children
      elem_lower = elem.id.toLowerCase() # FIXME should be the elem.label
      if (elem_lower > label_lower)
        return @add_to_elem_before(i_am_in, node_id, "#"+elem.id, label)
    # fall through and append if it comes before nothing
    @add_to_elem_before(i_am_in, node_id, undefined, label)
  add_to_elem_before: (i_am_in, node_id, before, label) ->
    i_am_in.insert('div', before). # insert just appends if before is undef
        attr('class','contents').
        attr('id',node_id)

  show_tree: (tree,i_am_in,listener,top) ->
    # http://stackoverflow.com/questions/14511872
    top = not top? or top
    for node_id,rest of tree
      label = rest[0]
      contents_of_me = @add_alphabetically(i_am_in, node_id, label)
      @id_to_elem[node_id] = contents_of_me
      msg = "show_tree() just did @id_to_elem[#{node_id}] = contents_of_me"
      #console.info(msg)
      picker = this
      contents_of_me.on 'click', @click_handler
      contents_of_me.append("p").attr("class", "treepicker-label").text(label)
      if rest.length > 1
        my_contents = @get_or_create_container(contents_of_me)
        if top and @extra_classes
          for css_class in @extra_classes
            my_contents.classed(css_class, true)        
        @show_tree(rest[1],my_contents,listener,false)

  click_handler: () =>
        listener = @click_listener
        picker = this
        elem = d3.select(d3.event.target)
        #elem = d3.select(d3.event.currentTarget)
        #if not elem.node().id
        #  alert("deferring to #{elem.node().parentElement.id}")
        #  return true
        d3.event.stopPropagation()

        # TODO figure out why the target elem is sometimes the treepicker-label not the 
        this_id = elem.node().id
        parent_id = elem.node().parentElement.id
        id = this_id or parent_id
        if not this_id
          elem = d3.select(elem.node().parentElement)
          
        is_treepicker_collapsed = elem.classed('treepicker-collapse')
        is_treepicker_showing = elem.classed('treepicker-showing')
        is_treepicker_indirect_showing = elem.classed('treepicker-indirect-showing')

        # If the state is not 'showing' then make it so, otherwise 'unshowing'.
        # if it is not currently showing.
        send_leafward = is_treepicker_collapsed
        new_state = 'showing'
        if is_treepicker_collapsed
          if is_treepicker_indirect_showing
            new_state = 'unshowing'
        else
          if is_treepicker_showing
            new_state = 'unshowing'
        
        picker.effect_click(id, new_state, send_leafward, listener)

  effect_click: (id, new_state, send_leafward, listener) ->
    if send_leafward
      kids = @id_to_children[id]
      if kids?
        for child_id in kids
          if child_id isnt id
            @effect_click(child_id, new_state, send_leafward, listener)
    if listener?  # TODO(shawn) replace with custom event?
       elem = @id_to_elem[id]
       listener.call(this, id, new_state, elem) # now this==picker not the event
  get_or_create_container: (contents) ->
    r = contents.select(".container")
    if r[0][0] isnt null
      return r
    contents.append('div').attr('class','container')
  get_top: ->
    return @ids_in_arrival_order[0] or @id
  add: (new_id,parent_id,name,listener) ->
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
    parent = @id_to_elem[parent_id] or @elem
    container = d3.select(@get_or_create_container(parent)[0][0])
    if @needs_expander
      @get_or_create_expander(parent,parent_id)
    @show_tree(branch,container,listener)
  collapser_str: "▼" # 0x25bc
  expander_str: "▶" # 0x25b6
  get_or_create_expander: (thing, id) ->
    if thing? and thing
      r = thing.select(".expander")
      if r[0][0] isnt null
        return r
      exp = thing.select(".treepicker-label").
          append('span').
          classed("expander", true).
          text(@collapser_str)
      @id_is_collapsed[id] = false
      picker = this
      exp.on 'click', () =>
        d3.event.stopPropagation()
        id2 = exp[0][0].parentNode.parentNode.getAttribute("id")
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
  expand_by_id: (id) ->
    @id_is_collapsed[id] = false
    elem = @id_to_elem[id]
    elem.classed("treepicker-collapse", false)
    exp = elem.select(".expander")
    exp.text(@collapser_str)
  get_or_create_payload: (thing) ->
    if thing? and thing
      r = thing.select(".payload")
      if r[0][0] isnt null
        return r
      thing.select(".treepicker-label").append('div').classed("payload", true)
  set_payload: (id, value) ->
    elem = @id_to_elem[id]
    if not elem? and elem isnt null
      console.warn "set_payload could not find " + id
    payload = @get_or_create_payload(elem)
    if payload?
      if value?
        payload.text(value)
      else
        payload.remove()
  set_title: (id, title) ->
    elem = @id_to_elem[id]
    if elem?
      elem.attr("title", title)
  set_direct_state: (id, state, old_state) ->
    if not old_state?
      old_state = @id_to_state[true][id]
    @id_to_state[true][id] = state
    if old_state?
      @id_to_elem[id].classed("treepicker-#{old_state}",false)
    if state?
      @id_to_elem[id].classed("treepicker-#{state}",true)
  set_indirect_state: (id, state, old_state) ->
    if not state?
      #if @get_my_id() is "classes"
      #  throw "#{@get_my_id()}.set_indirect_state() id=" + id + " state=" + state
      console.error("#{@get_my_id()}.set_indirect_state()",
                    arguments, "state should never be",undefined)
    if not old_state?
      old_state = @id_to_state[false][id]
    @id_to_state[false][id] = state  # false means indirect
    if old_state?
      @id_to_elem[id].classed("treepicker-indirect-#{old_state}",false)
    if state?
      @id_to_elem[id].classed("treepicker-indirect-#{state}",true)
  DEPRECATED_set_state_by_id: (id, state, old_state) ->
    alert("deprecated")
    @set_direct_state(id, state, old_state)
    if @is_leaf(id)
      indirect_state = state
    else
      indirect_state = @id_to_state[false][id]
    if not indirect_state?
      new_indirect_state = state
    else if state isnt indirect_state
      new_indirect_state = "mixed"
    else
      new_indirect_state = indirect_state
    @set_indirect_state(id, new_indirect_state)
    @update_parent_indirect_state(id)
  set_both_states_by_id: (id, direct_state, indirect_state, old_state, old_indirect_state) ->
    @set_direct_state(id, direct_state, old_state)
    @set_indirect_state(id, indirect_state, old_indirect_state)
    # the responsibility for knowing that parent state should change is Taxons
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

(exports ? this).TreePicker = TreePicker
