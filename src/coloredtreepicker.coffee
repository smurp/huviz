
TreePicker = require('treepicker').TreePicker

# FIXME Add support for 'abstract' nodes in the tree, nodes which do not represent pickable things.
#       Color them with a gradient, using intensity for mixedness and the hue for taxonomic range.
  
class ColoredTreePicker extends TreePicker
  constructor: (elem,root) ->
    super(elem,root)
    @mapping_to_colors = {}
  add: (new_id,parent_id,name,listener) ->
    super(new_id,parent_id,name,listener)
    @mapping_to_colors = @recolor()
  recolor: ->
    count = 0
    for id,elem of @id_to_elem
      count++
    i = 0
    retval = {}
    for id,elem of @id_to_elem
      i++
      hue = i/count * 360
      showing = 
      retval[id] =
        notshowing:  hsv2rgb(hue,12,100)
        showing:     hsv2rgb(hue,55,100)
        emphasizing: hsv2rgb(hue,100,100)
      elem.style("background-color",retval[id].notshowing)
    retval
  get_color_forId_byName: (id, state_name) ->
    id = @uri_to_js_id(id)
    @mapping_to_colors[id][state_name]
  color_by_selected: (elem, selected) ->
    console.log("color_by_selected",elem[0][0].id,selected)
    state_name = selected and 'showing' or 'notshowing'
    #state_name = selected and 'emphasized' or 'notshowing'
    # FIXME do we really want to be dealing with this [0][0] nonsense everywhere?
    elem.style('background-color',@mapping_to_colors[elem[0][0].id][state_name])
  set_branch_mixedness: (id, bool) ->
    #  when a div represents a mixed branch then color with a gradient of the two representative colors
    #    https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient
    if bool
      sc = @mapping_to_colors[id].showing
      nc = @mapping_to_colors[id].notshowing
      @id_to_elem[id].style("background: linear-gradient("+ sc + ", " + nc + ")" )
    else
      @id_to_elem[id].style("")
  set_branch_pickedness: (id,bool) ->
    super(id, bool)
    if @id_to_elem[id]?
      @color_by_selected(@id_to_elem[id], bool)

(exports ? this).ColoredTreePicker = ColoredTreePicker
