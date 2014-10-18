
TreePicker = require('treepicker').TreePicker

# FIXME Add support for 'abstract' nodes in the tree, nodes which do not represent pickable things.
#       Color them with a gradient, using intensity for mixedness and the hue for taxonomic range.


L_notshowing = 0.93
L_showing = 0.75
L_emphasizing = 0.5
S_all = 0.5

class ColoredTreePicker extends TreePicker
  constructor: (elem,root) ->
    super(elem,root)
    @id_to_colors = {}
    #console.log "ColorTreePicker(): root =",root
  add: (id,parent_id,name,listener) ->
    super(id,parent_id,name,listener)
    @id_to_colors = @recolor()
  recolor: ->
    recursor =
      count: Object.keys(@id_to_elem).length - @get_abstract_count()
      branch: @elem[0][0][0][0]
      i: 0
    retval = {}
    console.log "RECOLOR"
    @recolor_recurse(retval, recursor)
  recolor_recurse: (retval, recursor) ->
    console.log "recursor.branch",recursor.branch
    for something in d3.select(recursor.branch).selectAll(".contents .container .contents")
      for kid in something
        console.log "  kid:",kid
    for id,elem of @id_to_elem
      @recolor_node(retval, recursor, id, elem)
    retval
  recolor_node: (retval, recursor, id, elem) ->
    if @is_abstract(id)
      retval[id] =
        notshowing:  hsl2rgb(0, 0, L_notshowing)
        showing:     hsl2rgb(0, 0, L_showing)
        emphasizing: hsl2rgb(0, 0, L_emphasizing)
    else
      # https://en.wikipedia.org/wiki/HSL_and_HSV#HSL
      recursor.i++        
      hue = recursor.i/recursor.count * 360
      retval[id] =
        notshowing:  hsl2rgb(hue, S_all, L_notshowing)
        showing:     hsl2rgb(hue, S_all, L_showing)
        emphasizing: hsl2rgb(hue, S_all, L_emphasizing)
    elem.style("background-color",retval[id].notshowing)

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
        elem.style("background","").style('background-color',colors[state_name])
      else
        if @id_is_abstract[id]? and not @id_is_abstract[id]
          msg = "id_to_colors has no colors for " + id
          console.debug msg
  set_branch_mixedness: (id, bool) ->
    #  when a div represents a mixed branch then color with a gradient of the two representative colors
    #    https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient
    if bool
      if @is_abstract(id) and false
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
        @id_to_elem[id].
           style("background": "linear-gradient(45deg, #{nc}, #{sc}, #{nc}, #{sc}, #{nc}, #{sc}, #{nc}, #{sc})").
           style("background-color", "")
    else
      @id_to_elem[id]?style("")
  set_branch_pickedness: (id,bool) ->
    super(id, bool)
    #@color_by_selected(id, bool)
    @render(id,bool)
  render: (id,selectedness) ->
    #if @is_abstract(id)
    #  @set_branch_mixedness(id, selectedness)
    #else
    @color_by_selected(id, selectedness)
  onChangeState: (evt) =>
    new_state = evt.detail.new_state
    target_id = evt.detail.target_id
    #console.debug target_id,new_state,evt.detail.predicate
    if new_state is "hidden" # rename noneToShow
      @set_branch_hiddenness(target_id, true)
    else
      @set_branch_hiddenness(target_id, false)
    if new_state is "showing" # rename allShowing
      @set_branch_pickedness(target_id, true)
    if new_state is "unshowing" # rename noneShowing
      @set_branch_pickedness(target_id, false)
    if new_state is "mixed" # rename partiallyShowing
      @set_branch_mixedness(target_id, true)
    else
      @set_branch_mixedness(target_id, false)
  
(exports ? this).ColoredTreePicker = ColoredTreePicker
