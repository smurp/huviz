
TreePicker = require('treepicker').TreePicker

# FIXME Add support for 'abstract' nodes in the tree, nodes which do not represent pickable things.
#       Color them with a gradient, using intensity for mixedness and the hue for taxonomic range.

class ColoredTreePicker extends TreePicker
  constructor: (elem,root) ->
    super(elem,root)
    @id_to_colors = {}
  add: (id,parent_id,name,listener) ->
    super(id,parent_id,name,listener)
    @id_to_colors = @recolor()
  recolor: ->
    count = Object.keys(@id_to_elem).length - @get_abstract_count()
    i = 0
    retval = {}
    for id,elem of @id_to_elem
      if @is_abstract(id)
        continue
      i++        
      hue = i/count * 360
      retval[id] =
        notshowing:  hsv2rgb(hue,12,100)
        showing:     hsv2rgb(hue,55,100)
        emphasizing: hsv2rgb(hue,100,100)
      elem.style("background-color",retval[id].notshowing)

    retval
  get_color_forId_byName: (id, state_name) ->
    id = @uri_to_js_id(id)
    colors = @id_to_colors[id]
    if colors?
      return colors[state_name]
    else
      msg = "get_color_forId_byName(" + id + ") failed because @id_to_colors[id] not found"
  color_by_selected: (id, selected) ->
    elem = @id_to_elem[id]
    state_name = selected and 'showing' or 'notshowing'
    if elem?
      colors = @id_to_colors[id]
      if colors?
        elem.style('background-color',colors[state_name])
      else
        if @id_is_abstract[id]? and not @id_is_abstract[id]
          msg = "id_to_colors has no colors for " + id
          console.debug msg
  set_branch_mixedness: (id, bool) ->
    #  when a div represents a mixed branch then color with a gradient of the two representative colors
    #    https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient
    console.log("set_branch_mixedness()",id,bool)
    if bool
      if @is_abstract(id)
        msg =  "set_branch_mixedness(" +id + "): " + bool + " for abstract"
        # FIXME these colors should come from first and last child of this abstraction
        sc = 'red'
        nc = 'green'
      else
        # these colors show the range from showing to notshowing for this predicate
        id2clr = @id_to_colors[id]
        if id2clr?
          sc = id2clr.showing
          nc = id2clr.notshowing
      if sc?
        the_style = "background: linear-gradient("+ sc + ", " + nc + ")"
        @id_to_elem[id].style(the_style)
    else
      @id_to_elem[id].style("")
  set_branch_pickedness: (id,bool) ->
    super(id, bool)
    #@color_by_selected(id, bool)
    @render(id,bool)
  render: (id,selectedness) ->
    if @is_abstract(id)
      @set_branch_mixedness(id, selectedness)
    else
      @color_by_selected(id, selectedness)
  ###
  set_branch_state: (id, state) -> # hidden|notshowing|showing|emphasizing|mixed
    mixedness = false
    if state is 'notshowing'
      pickedness = false
    else if state is 'showing'
      pickedness = true
    else if state is 'emphasizing'
  ###    
    
(exports ? this).ColoredTreePicker = ColoredTreePicker
