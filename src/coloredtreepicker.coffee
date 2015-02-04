
TreePicker = require('treepicker').TreePicker

# The states:
#   showing    everything is "shown"
#   mixed      some things are shown
#   unshowing  though there are things, none are shown
#   empty      a mid-level branch which itself has no direct instances
#              (motivated by the taxon_picker which often has levels
#               in its hierarchy which themselves have no direct instances)
#   hidden     a leaf or whole branch which (at the moment) has no instances
#              (motivated by the predicate_picker which needs to hide
#               whole branches which currently contain nothing)
#
# Non-leaf levels in a treepicker can have indirect states different
# from their direct states.  The direct state relates to the direct instances.
# The indirect state spans the direct state of a level and all its children.
# Leaf levels should always have equal direct and indirect states.

L_notshowing = 0.93
L_showing = 0.75
L_emphasizing = 0.5
S_all = 0.5
verbose = false

class ColoredTreePicker extends TreePicker
  constructor: ->
    super
    @id_to_colors = {}
  add: (id,parent_id,name,listener) ->
    super(id,parent_id,name,listener)
    # FIXME @recolor_now() unless handled externally
  recolor_now: =>
    @id_to_colors = @recolor()
    @update_css()
  get_my_style_id: () ->
    return "#{@get_my_id()}_colors"
  update_css: ->
    if not @style_sheet?
      @style_sheet = d3.select("body").
        append("style").attr("id", @get_my_style_id())
    styles = "  ##{@get_my_id()} {}"
    for id,colors of @id_to_colors
      nc = colors.notshowing
      sc = colors.showing
      styles += """
      
        ##{id}.treepicker-showing {
           background-color:#{sc};
        }
        ##{id}.treepicker-unshowing {
           background-color:#{nc};
        }
        ##{id}.treepicker-mixed,
        ##{id}.treepicker-indirect-mixed.treepicker-collapse {
          background: linear-gradient(45deg, #{nc}, #{sc}, #{nc}, #{sc}, #{nc}, #{sc}, #{nc}, #{sc});
          background-color: transparent;
        }
      """
    @style_sheet.html(styles)
    if false # cross-check the stylesheets to ensure proper loading
      if @style_sheet.html().length isnt styles.length
        console.error("style_sheet_length error:", @style_sheet.html().length, "<>", styles.length)
      else
        console.info("style_sheet_length good:",@style_sheet.html().length, "==", styles.length)
    return
  recolor: ->
    recursor =
      count: Object.keys(@id_to_elem).length - @get_abstract_count()
      i: 0
    retval = {}
    if verbose
      console.log "RECOLOR" 
    branch = @elem[0][0].children[0]
    @recolor_recurse_DOM(retval, recursor, branch, "")
  recolor_recurse_DOM: (retval, recursor, branch, indent) ->
    branch_id = branch.getAttribute("id")
    class_str = branch.getAttribute("class")
    if verbose
      console.log indent+"-recolor_recurse(",branch_id,class_str,")",branch 
    if branch_id
      @recolor_node(retval, recursor, branch_id, branch, indent) # should this go after recursion so color range can be picked up?
    if branch.children.length > 0
      for elem in branch.children
        if elem?
          class_str = elem.getAttribute("class")
          if class_str.indexOf("treepicker-label") > -1
            continue
          @recolor_recurse_DOM(retval, recursor, elem, indent + " |")
    retval
  container_regex: new RegExp("container")
  contents_regex: new RegExp("contents")
  recolor_node: (retval, recursor, id, elem_raw, indent) ->
    elem = d3.select(elem_raw)
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
    if verbose
      console.log(indent + " - - - recolor_node("+id+")",retval[id].notshowing)
    #elem.style("background-color",retval[id].notshowing)

  get_color_forId_byName: (id, state_name) ->
    id = @uri_to_js_id(id)
    colors = @id_to_colors[id]
    if colors?
      return colors[state_name]
    else
      msg = "get_color_forId_byName(" + id + ") failed because @id_to_colors[id] not found"
    
(exports ? this).ColoredTreePicker = ColoredTreePicker
