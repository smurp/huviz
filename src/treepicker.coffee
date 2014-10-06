
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
  constructor: (elem, root, lateral) ->
    @lateral = (lateral? and lateral) or false
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
  show_tree: (tree,i_am_in,listener,top) ->
    # http://stackoverflow.com/questions/14511872
    top = not top? or top
    for node_id,rest of tree
      label = rest[0]
      contents_of_me = i_am_in.append('div').
          attr('class','contents').
          attr('id',node_id)
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
        if top and @lateral
          my_contents.classed("lateral", true)
        @show_tree(rest[1],my_contents,listener,false)
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
