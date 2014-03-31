
TreePicker = require('treepicker').TreePicker
  
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
        notshowing:  hsv2rgb(hue,20,100)
        showing:     hsv2rgb(hue,50,100)
        emphasizing: hsv2rgb(hue,90,100)
      elem.style("background-color",retval[id].notshowing)
    retval
  get_color_forId_byName: (id, state_name) ->
    id = @uri_to_js_id(id)
    @mapping_to_colors[id][state_name]
  color_by_selected: (elem, selected) ->
    state_name = selected and 'showing' or 'notshowing'
    #state_name = selected and 'emphasized' or 'notshowing'
    # FIXME do we really want to be dealing with this [0][0] nonsense everywhere?
    elem.style('background-color',@mapping_to_colors[elem[0][0].id][state_name])

(exports ? this).ColoredTreePicker = ColoredTreePicker
