
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
      #console.log "appending",node_id,"to",i_am_in
      contents_of_me = @add_alphabetically(i_am_in, node_id, label)
      @id_to_elem[node_id] = contents_of_me
      picker = this
      contents_of_me.on 'click', () ->
        d3.event.stopPropagation()
        elem = d3.select(this)
        new_state = not elem.classed('picked_branch')
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
      if @needs_expander
        @get_or_create_expander(contents_of_me)        
  set_branch_pickedness: (id,bool) ->
    if @id_to_elem[id]?
      @id_to_elem[id].classed('picked_branch',bool)
    #else
    #  console.log "  not found among:",(id for id in @id_to_elem)
  set_all_hiddenness: (bool) ->
    top = @get_top()
    @set_branch_hiddenness(top,false)
    for id,elem of @id_to_elem
      if id isnt top and id isnt 'anything' and id isnt 'root'
        @set_branch_hiddenness(id,bool)
  set_branch_hiddenness: (id,bool) ->
    if @id_to_elem[id]?
      @id_to_elem[id].classed('hidden',bool)
    #else
    #  console.log "  not found among:",(id for id in @id_to_elem)
      
  set_branch_mixedness: (id, bool) ->
    # Calling set_branch_mixedness(id, true) means there exist
    #      nodes showing edges for this predicate AND
    #      nodes not showing edges for this predicate
    @id_to_elem[id].classed('both_show_and_unshown',bool)    
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
    parent_id = @uri_to_js_id(parent_id)
    name = name? and name or new_id
    branch = {}
    branch[new_id] = [name or new_id]      
    parent = @id_to_elem[parent_id] or @elem
    container = d3.select(@get_or_create_container(parent)[0][0])
    @show_tree(branch,container,listener)
  collapser_str: "▼" # 0x25bc
  expander_str: "▶" # 0x25b6
  get_or_create_expander: (thing) ->
    if thing? and thing
      r = thing.select(".expander")
      if r[0][0] isnt null
        return r
      exp = thing.select(".treepicker-label").append('span').classed("expander", true).text(@collapser_str)
      picker = this
      exp.on 'click', () =>
        d3.event.stopPropagation()
        if exp.text() is @collapser_str
          exp.text(@expander_str)
          thing.select(".container").attr("style", "display:none")
        else
          exp.text(@collapser_str) 
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
