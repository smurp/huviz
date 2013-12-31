
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
        my_contents = contents_of_me.append('div').attr('class','container')
        @show_tree(rest[1],my_contents,listener)
  set_branch_pickedness: (id,bool) ->
    @id_to_elem[id].classed('picked_branch',bool)
  add: (new_id,parent_id,name,listener) ->
    branch = {}
    branch[new_id] = [name or new_id]
    parent = @id_to_elem[parent_id]
    console.log "newpredicate.add()",new_id,parent,branch    
    @show_tree(branch,parent,listener)
  recolor: ->
    console.log 'recolor'
    count = 0
    for id,elem of @id_to_elem
      count++
    i = 0
    retval = {}
    for id,elem of @id_to_elem
      i++
      hue = i/count * 360
      rgb = hsv2rgb(hue,30,100)
      rgb_selected = hsv2rgb(hue,100,100)
      console.log rgb,i,count,hue
      elem.attr('style',"background-color:"+rgb)
      retval[id] = {'deselected':rgb,'selected':rgb_selected}
    retval
      
(exports ? this).TreePicker = TreePicker
