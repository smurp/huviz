
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
  constructor: ->
    @id_to_elem = {}
  uri_to_js_id: (uri) ->
    uri.match(/([\w\d\_\-]+)$/g)[0]
  show_tree: (tree,i_am_in,listener) ->
    # http://stackoverflow.com/questions/14511872
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
      contents_of_me.append('p').html(label)
      if rest.length > 1
        my_contents = @get_or_create_container(contents_of_me)
        #my_contents = contents_of_me.append('div').attr('class','container')
        @show_tree(rest[1],my_contents,listener)
  set_branch_pickedness: (id,bool) ->
    @id_to_elem[id].classed('picked_branch',bool)
  get_or_create_container: (contents) ->
    r = contents.select(".container")
    if r[0][0] isnt null
      return r
    contents.append('div').attr('class','container')
  add: (new_id,parent_id,name,listener) ->
    new_id = @uri_to_js_id(new_id)
    parent_id = @uri_to_js_id(parent_id)
    branch = {}
    branch[new_id] = [name or new_id]
    parent = @id_to_elem[parent_id]
    container = d3.select(@get_or_create_container(parent)[0][0])
    @show_tree(branch,container,listener)
      
(exports ? this).TreePicker = TreePicker

