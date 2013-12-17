
class TreePicker
  show_tree: (tree,i_am_in,listener) ->
    # http://stackoverflow.com/questions/14511872
    for node_id,rest of tree
      label = rest[0]
      contents_of_me = i_am_in.append('div').
          attr('class','contents').
          attr('id',node_id)
      contents_of_me.on 'click', () ->
        d3.event.stopPropagation()
        elem = d3.select(this)
        new_state = not elem.classed('picked_branch')
        elem.classed('picked_branch',new_state)
        if listener  # TODO(shawn) replace with custom event?
          listener.call(this,this.id,new_state,elem)
      contents_of_me.append('p').html(label)
      if rest.length > 1
        my_contents = contents_of_me.append('div').attr('class','container')
        @show_tree(rest[1],my_contents,listener)
        
(exports ? this).TreePicker = TreePicker
