
TreePicker = require('treepicker').TreePicker

###
#     ColoredTreePicker is a widget for displaying and manipulating a hierarchy
#     and displaying and manipulating the selectedness of branches and nodes.
#
#     The terminology below is a bit screwy because the motivating hierarchy
#     was a taxonomy controller which determined which nodes in a graph
#     are 'shown' as selected.  Perhaps better terminology would be to have
#     'shown' called 'marked' and 'unshown' called 'unmarked'.
#
#     ▼ 0x25bc
#     ▶ 0x25b6
#
#     Expanded                   Collapsed
#     +-----------------+        +-----------------+
#     | parent        ▼ |        | parent        ▶ |
#     |   +------------+|        +-----------------+
#     |   | child 1    ||
#     |   +------------+|
#     |   | child 2    ||
#     |   +------------+|
#     +-----------------+
#
#     Clicking an expanded parent should cycle thru selection and deselection
#     of only its direct instances, if there are any.
#
#     Clicking a collapsed parent should cycle thru selection and deselection
#     of its direct instances as well as those of all its children.
#
#     The coloring of expanded parents cycles thru the three states:
#       Mixed - some of the direct instances are selected
#       On - all of the direct instances are selected
#       Off - none of the direct instances are selected
#
#     The coloring of a collapsed parent cycles thru the three states:
#       Mixed - some descendant instances are selected (direct or indirect)
#       On - all descendant instances are selected (direct or indirect)
#       Off - no descendant instances are selected (direct or indirect)
#
#     Indirect instances are the instances of subclasses.
#
# The states:
#   showing    everything is "shown" (ie marked)
#   mixed      some things are shown (ie a mixure of marked and unmarked)
#   unshowing  though there are things, none are shown (ie unmarked)
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
#
###

L_unshowing = 0.93
L_showing = 0.75
L_emphasizing = 0.5
S_all = 0.5
verbose = false

class ColoredTreePicker extends TreePicker
  constructor: ->
    super(arguments...)
    @id_to_colors = {}
  add: (id,parent_id,name,listener) ->
    super(id,parent_id,name,listener)
    # FIXME @recolor_now() unless handled externally
    return
  recolor_now: =>
    @id_to_colors = @recolor()
    @update_css()
    return
  get_my_style_id: () ->
    return "#{@get_my_id()}_colors"
  update_css: ->
    if not @style_sheet?
      @style_sheet = @elem.append("style")
        # .attr("id", @get_my_style_id())
    styles = "// #{@get_my_id()}"
    ctxSel = @style_context_selector
    if ctxSel
      ctxSel += ' ' # put a space after ctxSel if it has content
    ctxSel ?= ''
    for id,colors of @id_to_colors
      nc = colors.unshowing
      sc = colors.showing
      styles += """

        #{ctxSel}##{id}.treepicker-showing {
           background-color:#{sc};
        }
        #{ctxSel}##{id}.treepicker-unshowing {
           background-color:#{nc};
        }
        #{ctxSel}##{id}.treepicker-mixed,
        #{ctxSel}##{id}.treepicker-indirect-mixed.treepicker-collapse {
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
    branch = @elem.node().children[0]
    @recolor_recurse_DOM(retval, recursor, branch, "")
    return retval
  recolor_recurse_DOM: (retval, recursor, branch, indent) ->
    branch_id = branch.getAttribute("id")
    class_str = branch.getAttribute("class")
    if verbose
      console.log indent+"-recolor_recurse(",branch_id,class_str,")",branch
    if branch_id
      # should this go after recursion so color range can be picked up?
      @recolor_node(retval, recursor, branch_id, branch, indent)
    if branch.children.length > 0
      for elem in branch.children
        if elem?
          class_str = elem.getAttribute("class")
          if class_str.indexOf("treepicker-label") > -1
            continue
          @recolor_recurse_DOM(retval, recursor, elem, indent + " |")
    return retval
  container_regex: new RegExp("container")
  contents_regex: new RegExp("contents")
  recolor_node: (a_node, recursor, id, elem_raw, indent) ->
    elem = d3.select(elem_raw)
    if @is_abstract(id)
      a_node[id] =
        unshowing:  hsl2rgb(0, 0, L_unshowing)
        showing:     hsl2rgb(0, 0, L_showing)
        emphasizing: hsl2rgb(0, 0, L_emphasizing)
    else
      # https://en.wikipedia.org/wiki/HSL_and_HSV#HSL
      #   Adding .5 ensures hues are centered in their range, not at top.
      #   Adding 1 ensures different first and last colors, since 0 == 360
      hue = ((recursor.i + .5)/(recursor.count + 1)) * 360
      recursor.i++ # post-increment to stay in the range below 360
      a_node[id] =
        unshowing:   hsl2rgb(hue, S_all, L_unshowing)
        showing:     hsl2rgb(hue, S_all, L_showing)
        emphasizing: hsl2rgb(hue, S_all, L_emphasizing)
      if verbose and recursor.i in [1, recursor.count + 1]
        console.info(id, recursor, hue, a_node[id])
    if verbose
      console.log(indent + " - - - recolor_node("+id+")", a_node[id].unshowing)
    return
  get_current_color_forId: (id) ->
    state = @id_to_state[true][id]
    return @get_color_forId_byName(id, state)
  get_color_forId_byName: (id, state_name) ->
    id = @uri_to_js_id(id)
    colors = @id_to_colors[id]
    if colors?
      return colors[state_name]
    console.warn("no colors found for id: " + id)
    return
  click_handler: () =>
    id = super()
    @style_with_kid_color_summary_if_needed(id)
    return
  style_with_kid_color_summary_if_needed: (id) ->
    if @should_be_colored_by_kid_summary(id)
      @style_with_kid_color_summary(id)
    return
  should_be_colored_by_kid_summary: (id) ->
    return not @is_leaf(id) and @id_is_collapsed[id]
  collapse_by_id: (id) ->
    super(id)
    @style_with_kid_color_summary_if_needed(id)
    return
  expand_by_id: (id) ->
    if @should_be_colored_by_kid_summary(id)
      @id_to_elem[id].attr("style", "") # clear style set by set_gradient_style
    super(id)
    return
  summarize_kid_colors: (id, color_list) ->
    color_list = color_list or []
    kids = @id_to_children[id]
    if not @is_abstract[id]
      color = @get_current_color_forId(id)
      if color?
        color_list.push(color)
    if kids?
      for kid_id in kids
        @summarize_kid_colors(kid_id, color_list)
    return color_list
  style_with_kid_color_summary: (id) ->
    color_list = @summarize_kid_colors(id)
    if color_list.length is 1
      color_list.push(color_list[0])
    if color_list.length
      @set_gradient_style(id,color_list)
    return
  set_gradient_style: (id, kid_colors) ->
    colors = kid_colors.join(', ')
    style = "background-color: transparent;"
    style += " background: linear-gradient(45deg, #{colors})"
    @id_to_elem[id].attr("style", style)
    return
  set_payload: (id, value) ->
    super(id, value)
    # REVIEW it works but is this the right time to do this?
    # ensure collapsed nodes have summary colors updated
    @style_with_kid_color_summary_if_needed(id)
    return

(exports ? this).ColoredTreePicker = ColoredTreePicker
