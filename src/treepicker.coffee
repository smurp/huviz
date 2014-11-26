
###
Build and control a hierarchic menu of arbitrarily nested divs looking like:
  +---------------------+
  |     +--------------+|
  |     |       +-----+||
  | All |People |Men  |||
  |     |       +-----+||
  |     |       +-----+||
  |     |       |Women|||
  |     |       +-----+||
  |     +--------------+|
  +---------------------+

  Collapsed is different from hidden.  Hidden is to be used when there are
  no instances of the (say) predicates in a branch.  Collapsed is the opposite
  of expanded.
###
  
class TreePicker
  constructor: (elem, root, extra_classes, @needs_expander) ->
    if extra_classes?
      @extra_classes = extra_classes
    @elem = d3.select(elem)
    @id_to_elem = {root:elem}
    @id_to_elem[root] = elem
    @ids_in_arrival_order = [root]
    @id_is_abstract = {}
    @id_is_collapsed = {}
    @set_abstract(root)
    @set_abstract('root') # FIXME duplication?!?
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
      picker = this
      contents_of_me.on 'click', () ->
        d3.event.stopPropagation()
        elem = d3.select(this)
        new_state = not elem.classed('treepicker-picked')
        picker.set_branch_pickedness(this.id,new_state)
        if listener  # TODO(shawn) replace with custom event?
          listener.call(this,this.id,new_state,elem)
      contents_of_me.append("p").attr("class", "treepicker-label").text(label)
      if rest.length > 1
        my_contents = @get_or_create_container(contents_of_me)
        if top and @extra_classes
          for css_class in @extra_classes
            my_contents.classed(css_class, true)        
        @show_tree(rest[1],my_contents,listener,false)
  set_branch_pickedness: (id,bool) ->
    @id_to_elem[id]?classed('treepicker-picked',bool)
  set_all_hiddenness: (bool) ->
    top = @get_top()
    @set_branch_hiddenness(top,false)
    for id,elem of @id_to_elem
      if id isnt top and id isnt 'anything' and id isnt 'root'
        @set_branch_hiddenness(id,bool)
  set_branch_hiddenness: (id,bool) ->
    if @id_to_elem[id]?
      @id_to_elem[id].classed('hidden',bool)
  set_branch_mixedness: (id, bool) ->
    # Calling set_branch_mixedness(id, true) means there exist
    #      nodes showing edges for this predicate AND
    #      nodes not showing edges for this predicate
    @id_to_elem[id]?classed('treepicker-mixed',bool)
    #d3.select(@id_to_elem[id])?classed('treepicker-mixed',bool)
    #console.log("set_branch_mixedness()",arguments,@id_to_elem[id]?classed('treepicker-mixed'))
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
        id2 = exp[0][0].parentNode.parentNode.getAttribute("id")
        if id2 isnt id
          throw("#{id} <> #{id2}")
        d3.event.stopPropagation()
        if exp.text() is @collapser_str
          exp.text(@expander_str)
          @id_is_collapsed[id] = true
          thing.select(".container").attr("style", "display:none")
        else
          exp.text(@collapser_str)
          @id_is_collapsed[id] = false
          thing.select(".container").attr("style","")
  get_or_create_payload: (thing) ->
    if thing? and thing
      r = thing.select(".payload")
      if r[0][0] isnt null
        return r
      thing.select(".treepicker-label").append('div').classed("payload", true)
  set_payload: (id, value) ->
    elem = @id_to_elem[id]
    if not elem? and elem isnt null
      console.log "set_payload could not find " + id
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
      
(exports ? this).TreePicker = TreePicker
