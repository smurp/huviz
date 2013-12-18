
class TreePicker
  id_to_elem: {}    
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
(exports ? this).TreePicker = TreePicker
