
#See for inspiration:
#  Collapsible Force Layout
#    http://bl.ocks.org/mbostock/1093130
#  Force-based label placement
#    http://bl.ocks.org/MoritzStefaner/1377729
#  Graph with labeled edges:
#    http://bl.ocks.org/jhb/5955887
#  Multi-Focus Layout:
#    http://bl.ocks.org/mbostock/1021953
#  Edge Labels
#    http://bl.ocks.org/jhb/5955887
#
#  Shelf -- around the graph, the ring of nodes which serves as reorderable menu
#  Discard Bin -- a jail to contain nodes one does not want to be bothered by
#
#  Commands on nodes
#     choose/shelve     -- graph or remove from graph
#     choose - add to graph and show all edges
#     unchoose - hide all edges except those to 'chosen' nodes
#                this will shelve (or hide if previously hidden)
#                those nodes which end up no longer being connected
#                to anything
#     discard/retrieve    -- throw away or recover
#     label/unlabel       -- shows labels or hides them
#     substantiate/redact -- shows source text or hides it
#     expand/contract     -- show all links or collapse them
#
# TODO(smurp) implement emphasize and deemphasize 'verbs' (we need a new word)
#   emphasize: (node,predicate,color) =>
#   deemphasize: (node,predicate,color) =>
#   pin/unpin
#
# THOUGHT: perhaps there is a distinction to be made between verbs
#   and 'actuators' where verbs are the things that people issue
#   while actuators (actions?) are the one-or-more things per-verb that
#   constitute the implementation of the verb.  The motivations are:
#     a) that actuators may be shared between verbs
#     b) multiple actuators might be needed per verb
#     c) there might be applications for actuators other than verbs
#     d) there might be update operations against gclui apart from actuators
#
# Immediate Priorities:
# 120) BUG: hidden nodes are hidden but are also detectable via TextCursor
# 118) TASK: add setting for "'chosen' border thickness (px)"
# 116) BUG: stop truncating verbs lists longer than 2 in TextCursor: use grid
# 115) TASK: add ColorTreepicker [+] and [-] boxes for 'show' and 'unshow'
# 114) TASK: make text_cursor show detailed stuff when in Commands and Settings
# 113) TASK: what is the weird stuff happening when there are selected nodes?
# 113) TASK: why is CP "Poetry" in abdyma.nq not shelved?
# 102) BUG: put Classes beside Sets again
# 107) TASK: minimize hits on TextCursor by only calling it when verbs change
#            not whenever @focused_node changes
# 104) TASK: remove no-longer-needed text_cursor calls
# 105) TASK: move @last_cursor_text logic to TextCursor itself
#  40) TASK: support search better, show matches continuously
#  79) TASK: support dragging of edges to shelf or discard bin
#  97) TASK: integrate blanket for code coverage http://goo.gl/tH4Ghk
#  93) BUG: toggling a predicate should toggle indirect-mixed on its supers
#  92) BUG: non-empty predicates should not have payload '0/0' after kid click
#  94) TASK: show_msg() during command.run to inform user and prevent clicks
#  95) TASK: get /orlonto.html working smoothly again
#  90) BUG: english is no longer minimal
#  91) BUG: mocha async being misused re done(), so the passes count is wrong
#  86) BUG: try_to_set_node_type: only permit subtypes to override supertypes
#  87) BUG: solve node.type vs node.taxon sync problem (see orlonto)
#  46) TASK: impute node type based on predicates via ontology
#  53) PERF: should_show_label should not have search_regex in inner loop
#  65) BUG: hidden nodes are not fully ignored on the shelf so shelved nodes
#           are not always the focused node
#  68) TASK: optimize update_english
#  69) TASK: figure out ideal root for predicate hierarchy -- owl:Property?
#  70) TASK: make owl:Thing implicit root class
#            ie: have Taxons be subClassOf owl:Thing unless replaced
#  72) TASK: consolidate type and taxon links from node?
#  74) TASK: recover from loading crashes with Cancel button on show_state_msg
#  76) TASK: consider renaming graphed_set to connected_set and verbs
#            choose/unchoose to graph/ungraph
#  84) TASK: add an unchosen_set containing the graphed but not chosen nodes
#
# Eventual Tasks:
#  85) TASK: move SVG, Canvas and WebGL renderers to own Renderer subclasses
#  75) TASK: implement real script parser
#   4) TASK: Suppress all but the 6-letter id of writers in the cmd cli
#  14) TASK: it takes time for clicks on the predicate picker to finish;
#      showing a busy cursor or a special state for the selected div
#      would help the user have faith.
#      (Investigate possible inefficiencies, too.)
#      AKA: fix bad-layout-until-drag-and-drop bug
#  18) TASK: drop a node on another node to draw their mutual edges only
#  19) TASK: progressive documentation (context sensitive tips and intros)
#  25) TASK: debug wait cursor when slow operations are happening, maybe
#      prevent starting operations when slow stuff is underway
#      AKA: show waiting cursor during verb execution
#  26) boot script should perhaps be "choose writer." or some reasonable set
#  30) TASK: Stop passing (node, change, old_node_status, new_node_status) to
#      Taxon.update_state() because it never seems to be needed
#  35) TASK: get rid of jquery
#  37) TASK: fix Bronte names, ie unicode
#  41) TASK: link to new backend
#  51) TASK: make predicate picker height adjustable
#  55) TASK: clicking an edge for a snippet already shown should add that
#            triple line to the snippet box and bring the box forward
#            (ideally using css animation to flash the triple and scroll to it)
#  56) TASK: improve layout of the snippet box so the subj is on the first line
#            and subsequent lines show (indented) predicate-object pairs for
#            each triple which cites the snippet
#  57) TASK: hover over node on shelf shows edges to graphed and shelved nodes
#  61) TASK: make a settings controller for edge label (em) (or mag?)
#  66) BUG: #load+/data/ballrm.nq fails to populate the predicate picker
#  67) TASK: add verbs pin/unpin (using polar coords to record placement)
#
angliciser = require('angliciser').angliciser
uniquer = require("uniquer").uniquer
gcl = require('graphcommandlanguage');
#asyncLoop = require('asynchronizer').asyncLoop
CommandController = require('gclui').CommandController
EditController = require('editui').EditController
IndexedDBService = require('indexeddbservice').IndexedDBService
IndexedDBStorageController = require('indexeddbstoragecontroller').IndexedDBStorageController
Edge = require('edge').Edge
GraphCommandLanguageCtrl = require('graphcommandlanguage').GraphCommandLanguageCtrl
GreenerTurtle = require('greenerturtle').GreenerTurtle
Node = require('node').Node
Predicate = require('predicate').Predicate
Taxon = require('taxon').Taxon
TextCursor = require('textcursor').TextCursor

wpad = undefined
hpad = 10
distance = (p1, p2) ->
  p2 = p2 || [0,0]
  x = (p1.x or p1[0]) - (p2.x or p2[0])
  y = (p1.y or p1[1]) - (p2.y or p2[1])
  Math.sqrt x * x + y * y
dist_lt = (mouse, d, thresh) ->
  x = mouse[0] - d.x
  y = mouse[1] - d.y
  Math.sqrt(x * x + y * y) < thresh

unescape_unicode = (u) ->
  # pre-escape any existing quotes so when JSON.parse does not get confused
  return JSON.parse('"' + u.replace('"', '\\"') + '"')

linearize = (msgRecipient, streamoid) ->
  if streamoid.idx is 0
    msgRecipient.postMessage({event: 'finish'})
  else
    i = streamoid.idx + 1
    l = 0
    while (streamoid.data[i] not '\n')
      l++
      i++
    line = streamoid.data.substr(streamoid.idx, l+1).trim()
    msgRecipient.postMessage({event:'line', line:line})
    streamoid.idx = i
    recurse = () -> linearize(msgRecipient, streamoid)
    setTimeout(recurse, 0)

unique_id = () ->
  'uid_'+Math.random().toString(36).substr(2,10)

# http://dublincore.org/documents/dcmi-terms/
DC_subject  = "http://purl.org/dc/terms/subject"

FOAF_Group  = "http://xmlns.com/foaf/0.1/Group"
FOAF_Person = "http://xmlns.com/foaf/0.1/Person"
FOAF_name   = "http://xmlns.com/foaf/0.1/name"
OWL_Class   = "http://www.w3.org/2002/07/owl#Class"
OWL_Thing   = "http://www.w3.org/2002/07/owl#Thing"
OWL_ObjectProperty = "http://www.w3.org/2002/07/owl#ObjectProperty"
RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
RDF_object  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
RDF_type    = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
RDF_a       = 'a'
RDFS_label  = "http://www.w3.org/2000/01/rdf-schema#label"
TYPE_SYNS   = [RDF_type, RDF_a, 'rdfs:type', 'rdf:type']
NAME_SYNS   = [FOAF_name, RDFS_label, 'rdfs:label', 'name']
XML_TAG_REGEX = /(<([^>]+)>)/ig
MANY_SPACES_REGEX = /\s{2,}/g
UNDEFINED = undefined
start_with_http = new RegExp("http", "ig")
ids_to_show = start_with_http

PEEKING_COLOR = "darkgray"

themeStyles =
  "light":
    "pageBg": "white"
    "labelColor": "black"
    "shelfColor": "lightgreen"
    "discardColor": "salmon"
    "nodeHighlightOutline": "white"
  "dark":
    "pageBg": "black"
    "labelColor": "#ddd"
    "shelfColor": "#163e00"
    "discardColor": "#4b0000"
    "nodeHighlightOutline": "white"


id_escape = (an_id) ->
  retval = an_id.replace(/\:/g,'_')
  retval = retval.replace(/\//g,'_')
  retval = retval.replace(new RegExp(' ','g'),'_')
  retval = retval.replace(new RegExp('\\?','g'),'_')
  retval = retval.replace(new RegExp('\=','g'),'_')
  retval = retval.replace(new RegExp('\\.','g'),'_')
  retval = retval.replace(new RegExp('\\#','g'),'_')
  retval

if true
  node_radius_policies =
    "node radius by links": (d) ->
      d.radius = Math.max(@node_radius, Math.log(d.links_shown.length))
      return d.radius
      if d.showing_links is "none"
        d.radius = @node_radius
      else
        if d.showing_links is "all"
          d.radius = Math.max(@node_radius,
            2 + Math.log(d.links_shown.length))
      d.radius
    "equal dots": (d) ->
      @node_radius
  default_node_radius_policy = "equal dots"
  default_node_radius_policy = "node radius by links"

  has_type = (subject, typ) ->
    has_predicate_value subject, RDF_type, typ

  has_predicate_value = (subject, predicate, value) ->
    pre = subject.predicates[predicate]
    if pre
      objs = pre.objects
      oi = 0
      while oi <= objs.length
        obj = objs[oi]
        return true  if obj.value is value
        oi++
    false

  is_a_main_node = (d) ->
    (BLANK_HACK and d.s.id[7] isnt "/") or (not BLANK_HACK and d.s.id[0] isnt "_")

  is_node_to_always_show = is_a_main_node

  is_one_of = (itm,array) ->
    array.indexOf(itm) > -1

if not is_one_of(2,[3,2,4])
  alert "is_one_of() fails"

class Huviz
  class_list: [] # FIXME remove
  HHH: {}
  edges_by_id: {}
  edge_count: 0
  snippet_db: {}
  class_index: {}
  hierarchy: {}
  default_color: "brown"
  DEFAULT_CONTEXT: 'http://universal.org/'
  turtle_parser: 'GreenerTurtle'
  #turtle_parser: 'N3'

  use_canvas: true
  use_svg: false
  use_webgl: false
  #use_webgl: true  if location.hash.match(/webgl/)
  #use_canvas: false  if location.hash.match(/nocanvas/)

  nodes: undefined
  links_set: undefined
  node: undefined
  link: undefined

  lariat: undefined
  verbose: true
  verbosity: 0
  TEMP: 5
  COARSE: 10
  MODERATE: 20
  DEBUG: 40
  DUMP: false
  node_radius_policy: undefined
  draw_circle_around_focused: true
  draw_lariat_labels_rotated: true
  run_force_after_mouseup_msec: 2000
  nodes_pinnable: true

  BLANK_HACK: false
  width: undefined
  height: 0
  cx: 0
  cy: 0

  snippet_body_em: .7
  snippet_triple_em: .5
  line_length_min: 4

  # TODO figure out how to replace with the default_graph_control
  link_distance: 29
  fisheye_zoom: 4.0
  peeking_line_thicker: 4
  show_snippets_constantly: false
  charge: -193
  gravity: 0.025
  snippet_count_on_edge_labels: true
  label_show_range: null # @link_distance * 1.1
  focus_threshold: 100
  discard_radius: 200
  fisheye_radius: 100 #null # label_show_range * 5
  focus_radius: null # label_show_range
  drag_dist_threshold: 5
  snippet_size: 300
  dragging: false
  last_status: undefined
  edge_x_offset: 5
  shadow_offset: 1
  shadow_color: 'DarkGray'

  my_graph:
    predicates: {}
    subjects: {}
    objects: {}

  # required by green turtle, should be retired
  G: {}

  search_regex: new RegExp("^$", "ig")
  node_radius: 3.2

  mousedown_point: false
  discard_center: [0,0]
  lariat_center: [0,0]
  last_mouse_pos: [ 0, 0]

  renderStyles = themeStyles.light

  change_sort_order: (array, cmp) ->
    array.__current_sort_order = cmp
    array.sort array.__current_sort_order
  isArray: (thing) ->
    Object::toString.call(thing) is "[object Array]"
  cmp_on_name: (a, b) ->
    return 0  if a.name is b.name
    return -1  if a.name < b.name
    1
  cmp_on_id: (a, b) ->
    return 0  if a.id is b.id
    return -1  if a.id < b.id
    1
  binary_search_on: (sorted_array, sought, cmp, ret_ins_idx) ->
    # return -1 or the idx of sought in sorted_array
    # if ret_ins_idx instead of -1 return [n] where n is where it ought to be
    # AKA "RETurn the INSertion INdeX"
    cmp = cmp or sorted_array.__current_sort_order or @cmp_on_id
    ret_ins_idx = ret_ins_idx or false
    seeking = true
    if sorted_array.length < 1
      return idx: 0  if ret_ins_idx
      return -1
    mid = undefined
    bot = 0
    top = sorted_array.length
    while seeking
      mid = bot + Math.floor((top - bot) / 2)
      c = cmp(sorted_array[mid], sought)

      #console.log(" c =",c);
      return mid  if c is 0
      if c < 0 # ie sorted_array[mid] < sought
        bot = mid + 1
      else
        top = mid
      if bot is top
        return idx: bot  if ret_ins_idx
        return -1

  # Objective:
  #   Maintain a sorted array which acts like a set.
  #   It is sorted so insertions and tests can be fast.
  # cmp: a comparison function returning -1,0,1
  # an integer was returned, ie it was found

  # Perform the set .add operation, adding itm only if not already present

  #if (Array.__proto__.add == null) Array.prototype.add = add;
  # the nodes the user has chosen to see expanded
  # the nodes the user has discarded
  # the nodes which are in the graph, linked together
  # the nodes not displaying links and not discarded
  # keep synced with html
  # bugged
  roughSizeOfObject: (object) ->
    # http://stackoverflow.com/questions/1248302/javascript-object-size
    objectList = []
    stack = [object]
    bytes = 0
    while stack.length
      value = stack.pop()
      if typeof value is "boolean"
        bytes += 4
      else if typeof value is "string"
        bytes += value.length * 2
      else if typeof value is "number"
        bytes += 8
      else if typeof value is "object" and objectList.indexOf(value) is -1
        objectList.push value
        for i of value
          stack.push value[i]
    bytes

  move_node_to_point: (node, point) ->
    node.x = point[0]
    node.y = point[1]

  click_node: (node_or_id) ->
    # motivated by testing. Should this also be used by normal click handling?
    console.warn("click_node() is deprecated")
    if typeof node_or_id is 'string'
      node = @nodes.get_by('id', node_or_id)
    else
      node = node_or_id
    @focused_node = node
    evt = new MouseEvent "mouseup",
      screenX: node.x
      screenY: node.y
    @canvas.dispatchEvent(evt)
    return @

  click_verb: (id) ->
    verbs = $("#verb-#{id}")
    if not verbs.length
      throw new Error("verb '#{id}' not found")
    verbs.trigger("click")
    return @

  click_set: (id) ->
    if id is 'nodes'
      alert("set 'nodes' is deprecated")
      console.error("set 'nodes' is deprecated")
    else
      if not id.endsWith('_set')
        id = id + '_set'
    sel = "##{id}"
    sets = $(sel)
    if not sets.length
      throw new Error("set '#{id}' not found using selector: '#{sel}'")
    sets.trigger("click")
    return @

  click_predicate: (id) ->
    @gclui.predicate_picker.handle_click(id)
    return @

  click_taxon: (id) ->
    $("##{id}").trigger("click")
    return @

  like_string: (str) =>
    # Ideally we'd trigger an actual 'input' event but that is not possible
    $(".like_input").val(str)
    @gclui.handle_like_input()
    #debugger if @DEBUG and str is ""
    return @

  toggle_expander: (id) ->
    $("##{id} span.expander:first").trigger("click");
    return @

  doit: ->
    $("#doit_button").trigger("click")
    return @

  mousemove: =>
    d3_event = @mouse_receiver[0][0]
    @last_mouse_pos = d3.mouse(d3_event)
    # || focused_node.state == discarded_set
    if not @dragging and @mousedown_point and @focused_node and
        distance(@last_mouse_pos, @mousedown_point) > @drag_dist_threshold
      # We can only know that the users intention is to drag
      # a node once sufficient motion has started, when there
      # is a focused_node
      #console.log "state_name == '" + @focused_node.state.state_name + "' and selected? == " + @focused_node.selected?
      #console.log "START_DRAG: \n  dragging",@dragging,"\n  mousedown_point:",@mousedown_point,"\n  @focused_node:",@focused_node
      @dragging = @focused_node
      if @edit_mode
        if @editui.subject_node isnt @dragging
          @editui.set_subject_node(@dragging)
      if @dragging.state isnt @graphed_set
        @graphed_set.acquire(@dragging)
    if @dragging
      @force.resume() # why?
      @move_node_to_point @dragging, @last_mouse_pos
      if @edit_mode
        @text_cursor.pause("", "drop on object node")

      else
        if @dragging.links_shown.length is 0
          action = "choose"
        else if @dragging.fixed
          action = "unpin"
        else
          action = "pin"
        if @in_disconnect_dropzone(@dragging)
          action = "shelve"
        else if @in_discard_dropzone(@dragging)
          action = "discard"
        @text_cursor.pause("", "drop to #{action}")
    else # IE not dragging
      if @edit_mode
        if @editui.object_node or not @editui.subject_node
          if @editui.object_datatype_is_literal
            @text_cursor.set_text("click subject node")
          else
            @text_cursor.set_text("drag subject node")
    if @peeking_node?
      #console.log "PEEKING at node: " + @peeking_node.id
      if @focused_node? and @focused_node isnt @peeking_node
        pair = [ @peeking_node.id, @focused_node.id ]
        #console.log "   PEEKING at edge between" + @peeking_node.id + " and " + @focused_node.id
        for edge in @peeking_node.links_shown
          if edge.source.id in pair and edge.target.id in pair
            #console.log "PEEK edge.id is '" + edge.id + "'"
            edge.focused = true
            @print_edge edge
          else
            edge.focused = false
    @tick()

  mousedown: =>
    d3_event = @mouse_receiver[0][0]
    @mousedown_point = d3.mouse(d3_event)
    @last_mouse_pos = @mousedown_point

  mouseup: =>
    d3_event = @mouse_receiver[0][0]
    @mousedown_point = false
    point = d3.mouse(d3_event)

    # if something was being dragged then handle the drop
    if @dragging
      #console.log "STOPPING_DRAG: \n  dragging",@dragging,"\n  mousedown_point:",@mousedown_point,"\n  @focused_node:",@focused_node
      @move_node_to_point @dragging, point
      if @in_discard_dropzone(@dragging)
        @run_verb_on_object 'discard', @dragging
      else if @in_disconnect_dropzone(@dragging)  # TODO rename to shelve_dropzone
        @run_verb_on_object 'shelve', @dragging
        # @unselect(@dragging) # this might be confusing
      else if @dragging.links_shown.length == 0
        @run_verb_on_object 'choose', @dragging
      else if @nodes_pinnable
        if @edit_mode and @dragging is @editui.subject_node and false
          console.log "not pinning subject_node when dropping"
        else if @dragging.fixed # aka pinned
          @run_verb_on_object 'unpin', @dragging
        else
          @run_verb_on_object 'pin', @dragging
      @dragging = false
      @text_cursor.continue()
      return

    if @edit_mode and @focused_node and @editui.object_datatype_is_literal
      @editui.set_subject_node(@focused_node)
      console.log("edit mode and focused note and editui is literal")
      @tick()
      return

    # this is the node being clickedRDF_literal
    if @focused_node # and @focused_node.state is @graphed_set
      @perform_current_command(@focused_node)
      @tick()
      return

    if @focused_edge
      # FIXME do the edge equivalent of @perform_current_command
      #@update_snippet() # useful when hover-shows-snippet
      @print_edge @focused_edge
      return

    # it was a drag, not a click
    drag_dist = distance(point, @mousedown_point)
    #if drag_dist > @drag_dist_threshold
    #  console.log "drag detection probably bugged",point,@mousedown_point,drag_dist
    #  return

    if @focused_node
      unless @focused_node.state is @graphed_set
        @run_verb_on_object 'choose',@focused_node
      else if @focused_node.showing_links is "all"
        @run_verb_on_object 'print',@focused_node
      else
        @run_verb_on_object 'choose',@focused_node

      # TODO(smurp) are these still needed?
      @force.links @links_set
      @restart()

  perform_current_command: (node) ->
    if @gclui.ready_to_perform()
      cmd = new gcl.GraphCommand this,
        verbs: @gclui.engaged_verbs
        subjects: [node]
      @run_command(cmd)
    #else
    #  @toggle_selected(node)
    @clean_up_all_dirt()

  run_command: (cmd) ->
    @show_state_msg(cmd.as_msg())
    #@gclui.show_working_on()
    #alert(cmd.as_msg())
    @gclc.run cmd
    #@gclui.show_working_off()
    @hide_state_msg()
    @gclui.push_command cmd

  #///////////////////////////////////////////////////////////////////////////
  # resize-svg-when-window-is-resized-in-d3-js
  #   http://stackoverflow.com/questions/16265123/
  updateWindow: =>
    @get_container_width()
    @get_container_height()
    @update_graph_radius()
    @update_graph_center()
    @update_discard_zone()
    @update_lariat_zone()
    if @svg
      @svg.
        attr("width", @width).
        attr("height", @height)
    if @canvas
      @canvas.width = @width
      @canvas.height = @height
    @force.size [@mx, @my]
    @restart()

  #///////////////////////////////////////////////////////////////////////////
  #
  #   http://bl.ocks.org/mbostock/929623
  get_charge: (d) =>
    graphed = d.state == @graphed_set
    retval = graphed and @charge or 0  # zero so shelf has no influence
    if retval is 0 and graphed
      console.error "bad combo of retval and graphed?",retval,graphed,d.name
    return retval

  get_gravity: =>
    return @gravity

  # lines: 5845 5848 5852 of d3.v3.js object to
  #    mouse_receiver.call(force.drag);
  # when mouse_receiver == viscanvas
  init_webgl: ->
    @init()
    @animate()

  #dump_line(add_line(scene,cx,cy,width,height,'ray'))
  draw_circle: (cx, cy, radius, strclr, filclr) ->
    @ctx.strokeStyle = strclr or "blue"  if strclr
    @ctx.fillStyle = filclr or "blue"  if filclr
    @ctx.beginPath()
    @ctx.arc cx, cy, radius, 0, Math.PI * 2, true
    @ctx.closePath()
    @ctx.stroke()  if strclr
    @ctx.fill()  if filclr
  draw_line: (x1, y1, x2, y2, clr) ->
    @ctx.strokeStyle = clr or 'red'
    @ctx.beginPath()
    @ctx.moveTo x1, y1
    @ctx.lineTo x2, y2
    @ctx.closePath()
    @ctx.stroke()
  draw_curvedline: (x1, y1, x2, y2, sway_inc, clr, num_contexts, line_width, edge) ->
    pdist = distance([x1,y1],[x2,y2])
    sway = @swayfrac * sway_inc * pdist
    if pdist < @line_length_min
      return
    if sway is 0
      return
    # sway is the distance to offset the control point from the midline
    orig_angle = Math.atan2(x2 - x1, y2 - y1)
    ctrl_angle = (orig_angle + (Math.PI / 2))
    ang = ctrl_angle
    ang = orig_angle
    check_range = (val,name) ->
      window.maxes = window.maxes or {}
      window.ranges = window.ranges or {}
      range = window.ranges[name] or {max: -Infinity, min: Infinity}
      range.max = Math.max(range.max,val)
      range.min = Math.min(range.min,val)
    #check_range(orig_angle,'orig_angle')
    #check_range(ctrl_angle,'ctrl_angle')
    xmid = x1 + (x2-x1)/2
    ymid = y1 + (y2-y1)/2
    xctrl = xmid + Math.sin(ctrl_angle) * sway
    yctrl = ymid + Math.cos(ctrl_angle) * sway
    @ctx.strokeStyle = clr or 'red'
    @ctx.beginPath()
    @ctx.lineWidth = line_width
    @ctx.moveTo x1, y1
    @ctx.quadraticCurveTo xctrl, yctrl, x2, y2
    #@ctx.closePath()
    @ctx.stroke()

    xhndl = xmid + Math.sin(ctrl_angle) * (sway/2)
    yhndl = ymid + Math.cos(ctrl_angle) * (sway/2)
    edge.handle =
      x: xhndl
      y: yhndl
    @draw_circle xhndl,yhndl,(line_width/2),clr # draw a circle at the midpoint of the line
    #@draw_line(xmid,ymid,xctrl,yctrl,clr) # show mid to ctrl

  draw_disconnect_dropzone: ->
    @ctx.save()
    @ctx.lineWidth = @graph_radius * 0.1
    @draw_circle @lariat_center[0], @lariat_center[1], @graph_radius, renderStyles.shelfColor
    @ctx.restore()
  draw_discard_dropzone: ->
    @ctx.save()
    @ctx.lineWidth = @discard_radius * 0.1
    @draw_circle @discard_center[0], @discard_center[1], @discard_radius, "", renderStyles.discardColor
    @ctx.restore()
  draw_dropzones: ->
    if @dragging
      @draw_disconnect_dropzone()
      @draw_discard_dropzone()
  in_disconnect_dropzone: (node) ->
    # is it within the RIM of the disconnect circle?
    dist = distance(node, @lariat_center)
    @graph_radius * 0.9 < dist and @graph_radius * 1.1 > dist
  in_discard_dropzone: (node) ->
    # is it ANYWHERE within the circle?
    dist = distance(node, @discard_center)
    @discard_radius * 1.1 > dist

  init_sets: ->
    #  states: graphed,shelved,discarded,hidden,embryonic
    #  embryonic: incomplete, not ready to be used
    #  graphed: in the graph, connected to other nodes
    #	 shelved: on the shelf, available for choosing
    #	 discarded: in the discard zone, findable but ignored by show_links_*
    #	 hidden: findable, but not displayed anywhere
    #              	 (when found, will become shelved)

    @nodes = SortedSet().named('all').
      sort_on("id").
      labelled(@human_term.all)
    @nodes.docs = """#{@nodes.label} nodes are in this set, regardless of state."""
    @all_set = @nodes

    @embryonic_set = SortedSet().named("embryo").
      sort_on("id").
      isFlag()
    @embryonic_set.docs = "
      Nodes which are not yet complete are 'embryonic' and not yet
      in '#{@all_set.label}'.  Nodes need to have a class and a label to
      no longer be embryonic."

    @chosen_set = SortedSet().named("chosen").
      sort_on("id").
      isFlag().
      labelled(@human_term.chosen).
      sub_of(@all_set)
    @chosen_set.docs = "
      Nodes which the user has specifically '#{@chosen_set.label}' by either
      dragging them into the graph from the surrounding green
      'shelf'. '#{@chosen_set.label}' nodes can drag other nodes into the
      graph if the others are #{@human_term.hidden} or #{@human_term.shelved} but
      not if they are #{@human_term.discarded}."
    @chosen_set.cleanup_verb = 'shelve'

    @selected_set = SortedSet().named("selected").
      sort_on("id").
      isFlag().
      labelled(@human_term.selected).
      sub_of(@all_set)
    @selected_set.cleanup_verb = "unselect"
    @selected_set.docs = "
      Nodes which have been '#{@selected_set.label}' using the class picker,
      ie which are highlighted and a little larger."

    @shelved_set = SortedSet().
      sort_on("name").
      named("shelved").
      labelled(@human_term.shelved).
      sub_of(@all_set).
      isState()
    @shelved_set.docs = "
      Nodes which are '#{@shelved_set.label}' on the green surrounding 'shelf',
      either because they have been dragged there or released back to there
      when the node which pulled them into the graph was
      '#{@human_term.unchosen}."

    @discarded_set = SortedSet().named("discarded").
      sort_on("name").
      labelled(@human_term.discarded).
      sub_of(@all_set).
      isState()
    @discarded_set.cleanup_verb = "shelve" # TODO confirm this
    @discarded_set.docs = "
      Nodes which have been '#{@discarded_set.label}' by being dragged into
      the red 'discard bin' in the bottom right corner.
      '#{@discarded_set.label}' nodes are not pulled into the graph when
      nodes they are connected to become '#{@chosen_set.label}'."

    @hidden_set = SortedSet().named("hidden").
      sort_on("id").
      labelled(@human_term.hidden).
      sub_of(@all_set).
      isState()
    @hidden_set.docs = "
      Nodes which are '#{@hidden_set.label}' but can be pulled into
      the graph by other nodes when those become
      '#{@human_term.chosen}'."
    @hidden_set.cleanup_verb = "shelve"

    @graphed_set = SortedSet().named("graphed").
      sort_on("id").
      labelled(@human_term.graphed).
      sub_of(@all_set).
      isState()
    @graphed_set.docs = "
      Nodes which are included in the central graph either by having been
      '#{@human_term.chosen}' themselves or which are pulled into the
      graph by those which have been."
    @graphed_set.cleanup_verb = "unchoose"

    @pinned_set = SortedSet().named('fixed').
      sort_on("id").
      labelled(@human_term.fixed).
      sub_of(@all_set).
      isFlag()
    @pinned_set.docs = "
      Nodes which are '#{@pinned_set.label}' to the canvas as a result of
      being dragged and dropped while already being '#{@human_term.graphed}'.
      #{@pinned_set.label} nodes can be #{@human_term.unpinned} by dragging
      them from their #{@pinned_set.label} location."
    @pinned_set.cleanup_verb = "unpin"

    @labelled_set = SortedSet().named("labelled").
      sort_on("id").
      labelled(@human_term.labelled).
      isFlag().
      sub_of(@all_set)

    @labelled_set.docs = "Nodes which have their labels permanently shown."
    @labelled_set.cleanup_verb = "unlabel"

    @links_set = SortedSet().
      named("shown").
      sort_on("id").
      isFlag()
    @links_set.docs = "Links which are shown."

    @predicate_set = SortedSet().named("predicate").isFlag().sort_on("id")
    @context_set   = SortedSet().named("context").isFlag().sort_on("id")
    @context_set.docs = "The set of quad contexts."

    # TODO make selectable_sets drive gclui.build_set_picker
    #      with the nesting data coming from .sub_of(@all) as above
    @selectable_sets =
      all_set: @all_set
      chosen_set: @chosen_set
      selected_set: @selected_set
      shelved_set: @shelved_set
      discarded_set: @discarded_set
      hidden_set: @hidden_set
      graphed_set: @graphed_set
      labelled_set: @labelled_set
      pinned_set: @pinned_set

  update_all_counts: ->
    @update_set_counts()
    #@update_predicate_counts()

  update_predicate_counts: ->
    console.warn('the unproven method update_predicate_counts() has just been called')
    for a_set in @predicate_set
      name = a_set.lid
      @gclui.on_predicate_count_update(name, a_set.length)

  update_set_counts: ->
    for name, a_set of @selectable_sets
      @gclui.on_set_count_update(name, a_set.length)

  create_taxonomy: ->
    # The taxonomy is intertwined with the taxon_picker
    @taxonomy = {}  # make driven by the hierarchy

  summarize_taxonomy: ->
    out = ""
    tree = {}
    for id, taxon of @taxonomy
      out += "#{id}: #{taxon.state}\n"
      tree[id] = taxon.state
    return tree

  regenerate_english: ->
    root = 'Thing'
    if @taxonomy[root]? # TODO this should be the ROOT, not literally Thing
      @taxonomy[root].update_english()
    else
      console.log("not regenerating english because no taxonomy[#{root}]")
    return

  get_or_create_taxon: (taxon_id) ->
    if not @taxonomy[taxon_id]?
      taxon = new Taxon(taxon_id)
      @taxonomy[taxon_id] = taxon
      parent_lid = @ontology.subClassOf[taxon_id] or @HHH[taxon_id] or 'Thing'
      if parent_lid?
        parent = @get_or_create_taxon(parent_lid)
        taxon.register_superclass(parent)
      @gclui.add_new_taxon(taxon_id,parent_lid,undefined,taxon) # FIXME should this be an event on the Taxon constructor?
    @taxonomy[taxon_id]

  toggle_taxon: (id, hier, callback) ->
    if callback?
      @gclui.set_taxa_click_storm_callback(callback)
    # TODO preserve the state of collapsedness?
    hier = hier? ? hier : true # default to true
    if hier
      @gclui.taxon_picker.collapse_by_id(id)
    $("##{id}").trigger("click")
    if hier
      @gclui.taxon_picker.expand_by_id(id)

  do: (args) ->
    cmd = new gcl.GraphCommand(this, args)
    @gclc.run(cmd)

  reset_data: ->
    # TODO fix gclc.run so it can handle empty sets
    if @discarded_set.length
      @do({verbs: ['shelve'], sets: [@discarded_set]})
    if @graphed_set.length
      @do({verbs: ['shelve'], sets: [@graphed_set]})
    if @hidden_set.length
      @do({verbs: ['shelve'], sets: [@hidden_set]})
    if @selected_set.length
      @do({verbs: ['unselect'], sets: [@selected_set]})
    @gclui.reset_editor()
    @gclui.select_the_initial_set()

  reset_graph: ->
    #@dump_current_settings("at top of reset_graph()")
    @G = {} # is this deprecated?
    @init_sets()
    @init_gclc()
    @init_editc()
    @indexed_dbservice()
    @init_indexddbstorage()

    @force.nodes @nodes
    @force.links @links_set

    # TODO move this SVG code to own renderer
    d3.select(".link").remove()
    d3.select(".node").remove()
    d3.select(".lariat").remove()
    @node = @svg.selectAll(".node")
    @link = @svg.selectAll(".link") # looks bogus, see @link assignment below
    @lariat = @svg.selectAll(".lariat")

    @link = @link.data(@links_set)
    @link.exit().remove()
    @node = @node.data(@nodes)
    @node.exit().remove()
    @force.start()

  set_node_radius_policy: (evt) ->
    # TODO(shawn) remove or replace this whole method
    f = $("select#node_radius_policy option:selected").val()
    return  unless f
    if typeof f is typeof "str"
      @node_radius_policy = node_radius_policies[f]
    else if typeof f is typeof @set_node_radius_policy
      @node_radius_policy = f
    else
      console.log "f =", f
  init_node_radius_policy: ->
    policy_box = d3.select("#huvis_controls").append("div", "node_radius_policy_box")
    policy_picker = policy_box.append("select", "node_radius_policy")
    policy_picker.on "change", set_node_radius_policy
    for policy_name of node_radius_policies
      policy_picker.append("option").attr("value", policy_name).text policy_name

  calc_node_radius: (d) ->
    @node_radius * (not d.selected? and 1 or @selected_mag)
    #@node_radius_policy d
  names_in_edges: (set) ->
    out = []
    set.forEach (itm, i) ->
      out.push itm.source.name + " ---> " + itm.target.name
    out
  dump_details: (node) ->
    return unless window.dump_details
    #
    #    if (! DUMP){
    #      if (node.s.id != '_:E') return;
    #    }
    #
    console.log "================================================="
    console.log node.name
    console.log "  x,y:", node.x, node.y
    try
      console.log "  state:", node.state.state_name, node.state
    console.log "  chosen:", node.chosen
    console.log "  fisheye:", node.fisheye
    console.log "  fixed:", node.fixed
    console.log "  links_shown:", node.links_shown.length, @names_in_edges(node.links_shown)
    console.log "  links_to:", node.links_to.length, @names_in_edges(node.links_to)
    console.log "  links_from:", node.links_from.length, @names_in_edges(node.links_from)
    console.log "  showing_links:", node.showing_links
    console.log "  in_sets:", node.in_sets

  find_node_or_edge_closest_to_pointer: ->
    new_focused_node = null
    new_focused_edge = null
    new_focused_idx = null
    focus_threshold = @focus_threshold
    closest_dist = @width
    closest_point = null

    seeking = false # holds property name of the thing we are seeking: 'focused_node'/'object_node'/false
    if @dragging
      if not @edit_mode
        return
      seeking = "object_node"
    else
      seeking = "focused_node"

    # TODO build a spatial index!!!! OMG
    # Examine every node to find the closest one within the focus_threshold
    @nodes.forEach (d, i) =>
      n_dist = distance(d.fisheye or d, @last_mouse_pos)
      #console.log(d)
      if n_dist < closest_dist
        closest_dist = n_dist
        closest_point = d.fisheye or d
      if not (seeking is 'object_node' and @dragging and @dragging.id is d.id)
        if n_dist <= focus_threshold
          new_focused_node = d
          focus_threshold = n_dist
          new_focused_idx = i

    # Examine the center of every edge and make it the new_focused_edge if close enough and the closest thing
    @links_set.forEach (e, i) =>
      if e.handle?
        e_dist = distance(e.handle, @last_mouse_pos)
        if e_dist < closest_dist
          closest_dist = e_dist
          closest_point = e.handle
        if e_dist <= focus_threshold
          new_focused_edge = e
          focus_threshold = e_dist
          new_focused_edge_idx = i

    if new_focused_edge? # the mouse is closer to an edge than a node
      new_focused_node = null

    if closest_point?
      if @draw_circle_around_focused
        @draw_circle closest_point.x, closest_point.y, @node_radius * 3, "red"

    if not (@focused_node is new_focused_node) and seeking is "focused_node"
      if @focused_node
        d3.select(".focused_node").classed "focused_node", false  if @use_svg
        @focused_node.focused_node = false
        @unscroll_pretty_name(@focused_node)
      if new_focused_node?
        new_focused_node.focused_node = true
        if @use_svg
          svg_node = node[0][new_focused_idx]
          d3.select(svg_node).classed "focused_node", true
        #@dump_details new_focused_node

    @set_focused_edge(new_focused_edge)

    if seeking is 'object_node'
      @editui.set_object_node(new_focused_node)

    if new_focused_edge
      return

    if seeking is 'focused_node'
      node_changed = @focused_node isnt new_focused_node
      @focused_node = new_focused_node # possibly null
      if node_changed
        if @focused_node? and @focused_node
          @gclui.engage_transient_verb_if_needed("select")
        else
          @gclui.disengage_transient_verb_if_needed()

  DEPRECATED_showing_links_to_cursor_map:
    all: 'not-allowed'
    some: 'all-scroll'
    none: 'pointer'

  set_focused_edge: (new_focused_edge) ->
    if @proposed_edge and @focused_edge # TODO why bail now???
      return
    unless @focused_edge is new_focused_edge
      if @focused_edge? #and @focused_edge isnt new_focused_edge
        console.log "removing focus from previous focused_edge"
        @focused_edge.focused = false
        delete @focused_edge.source.focused_edge
        delete @focused_edge.target.focused_edge
      if new_focused_edge?
        console.log "setting focused edge"
        # FIXME add use_svg stanza
        new_focused_edge.focused = true
        new_focused_edge.source.focused_edge = true
        new_focused_edge.target.focused_edge = true
      @focused_edge = new_focused_edge # blank it or set it
      if @focused_edge?
        if @edit_mode
          @text_cursor.pause("", "edit this edge")
        else
          @text_cursor.pause("", "show edge sources")
      else
        @text_cursor.continue()

  @proposed_edge = null #initialization (no proposed edge active)
  set_proposed_edge: (new_proposed_edge) ->
    console.log "Setting proposed edge...", new_proposed_edge
    if @proposed_edge
      delete @proposed_edge.proposed # remove .proposed flag from old one
    if new_proposed_edge
      new_proposed_edge.proposed = true # flag the new one
    @proposed_edge = new_proposed_edge # might be null
    @set_focused_edge(new_proposed_edge) # a proposed_edge also becomes focused

  install_update_pointer_togglers: ->
    console.warn("the update_pointer_togglers are being called too often")
    d3.select("#huvis_controls").on "mouseover", () =>
      @update_pointer = false
      @text_cursor.pause("default")
      #console.log "update_pointer: #{@update_pointer}"
    d3.select("#huvis_controls").on "mouseout", () =>
      @update_pointer = true
      @text_cursor.continue()
      #console.log "update_pointer: #{@update_pointer}"

  DEPRECATED_adjust_cursor: ->
    # http://css-tricks.com/almanac/properties/c/cursor/
    if @focused_node
      next = @showing_links_to_cursor_map[@focused_node.showing_links]
    else
      next = 'default'
    @text_cursor.set_cursor(next)

  set_cursor_for_verbs: (verbs) ->
    if not @use_fancy_cursor
      return
    text = [@human_term[verb] for verb in verbs].join("\n")
    if @last_cursor_text isnt text
      @text_cursor.set_text(text)
      @last_cursor_text = text

  auto_change_verb: ->
    if @focused_node
      @gclui.auto_change_verb_if_warranted(@focused_node)

  position_nodes: ->
    only_move_subject = @edit_mode and @dragging and @editui.subject_node
    @nodes.forEach (node, i) =>
      @reposition_node(node, only_move_subject)

  reposition_node: (node, only_move_subject) ->
    if @dragging is node
      @move_node_to_point node, @last_mouse_pos
    if only_move_subject
      console.log "SKIPPING"
      return
    if not @graphed_set.has(node)  # slower
    #if node.showing_links is 'none' # faster
      return
    node.fisheye = @fisheye(node)

  apply_fisheye: ->
    @links_set.forEach (e) =>
      e.target.fisheye = @fisheye(e.target)  unless e.target.fisheye

    if @use_svg
      link.attr("x1", (d) ->
        d.source.fisheye.x
      ).attr("y1", (d) ->
        d.source.fisheye.y
      ).attr("x2", (d) ->
        d.target.fisheye.x
      ).attr "y2", (d) ->
        d.target.fisheye.y

  shown_messages: []
  show_message_once: (msg, alert_too) ->
    if @shown_messages.indexOf(msg) is -1
      @shown_messages.push(msg)
      console.log(msg)
      if alert_too
        alert(msg)

  draw_edges_from: (node) ->
    num_edges = node.links_to.length
    #@show_message_once "draw_edges_from(#{node.id}) "+ num_edges
    return unless num_edges

    draw_n_n = {}
    for e in node.links_shown
      msg = ""
      if e.source is node
        continue
      if e.source.embryo
        msg += "source #{e.source.name} is embryo #{e.source.id}; "
        msg += e.id + " "
      if e.target.embryo
        msg += "target #{e.target.name} is embryo #{e.target.id}"
      if msg isnt ""
        #@show_message_once(msg)
        continue
      n_n = e.source.lid + " " + e.target.lid
      if not draw_n_n[n_n]?
        draw_n_n[n_n] = []
      draw_n_n[n_n].push(e)
      #@show_message_once("will draw edge() n_n:#{n_n} e.id:#{e.id}")
    edge_width = @edge_width
    for n_n, edges_between of draw_n_n
      sway = 1
      for e in edges_between
        #console.log e
        if e.focused? and e.focused
          line_width = @edge_width * @peeking_line_thicker
        else
          line_width = edge_width
        line_width = line_width + (@line_edge_weight * e.contexts.length)
        #@show_message_once("will draw line() n_n:#{n_n} e.id:#{e.id}")
        @draw_curvedline e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, sway, e.color, e.contexts.length, line_width, e
        sway++

  draw_edges: ->
    if @use_canvas
      @graphed_set.forEach (node, i) =>
        @draw_edges_from(node)

      #@links_set.forEach (e, i) =>
      #  sway = i * 2
      #  #@draw_line e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, e.color
      #  @draw_curvedline e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, sway, e.color

    if @use_webgl
      dx = @width * xmult
      dy = @height * ymult
      dx = -1 * @cx
      dy = -1 * @cy
      @links_set.forEach (e) =>
        #e.target.fisheye = @fisheye(e.target)  unless e.target.fisheye
        @add_webgl_line e  unless e.gl
        l = e.gl

        #
        #	  if (e.source.fisheye.x != e.target.fisheye.x &&
        #	      e.source.fisheye.y != e.target.fisheye.y){
        #	      alert(e.id + " edge has a length");
        #	  }
        #
        @mv_line l, e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y
        @dump_line l

    if @use_webgl and false
      @links_set.forEach (e, i) =>
        return  unless e.gl
        v = e.gl.geometry.vertices
        v[0].x = e.source.fisheye.x
        v[0].y = e.source.fisheye.y
        v[1].x = e.target.fisheye.x
        v[1].y = e.target.fisheye.y

  draw_nodes_in_set: (set, radius, center) ->
    # cx and cy are local here TODO(smurp) rename cx and cy
    cx = center[0]
    cy = center[1]
    num = set.length
    set.forEach (node, i) =>
      rad = 2 * Math.PI * i / num
      node.rad = rad
      node.x = cx + Math.sin(rad) * radius
      node.y = cy + Math.cos(rad) * radius
      node.fisheye = @fisheye(node)
      if @use_canvas
        @draw_circle(node.fisheye.x, node.fisheye.y,
                     @calc_node_radius(node),
                     node.color or "yellow", node.color or renderStyles.nodeHighlightOutline)
      if @use_webgl
        @mv_node node.gl, node.fisheye.x, node.fisheye.y

  draw_discards: ->
    @draw_nodes_in_set @discarded_set, @discard_radius, @discard_center
  draw_shelf: ->
    @draw_nodes_in_set @shelved_set, @graph_radius, @lariat_center
  draw_nodes: ->
    if @use_svg
      node.attr("transform", (d, i) ->
        "translate(" + d.fisheye.x + "," + d.fisheye.y + ")"
      ).attr "r", calc_node_radius
    if @use_canvas or @use_webgl
      @graphed_set.forEach (d, i) =>
        d.fisheye = @fisheye(d)
        if @use_canvas
          node_radius = @calc_node_radius(d)
          stroke_color = d.color or 'yellow'
          fill_color = d.color or 'black'
          if d.chosen?
            stroke_color = renderStyles.nodeHighlightOutline
          @draw_circle(d.fisheye.x, d.fisheye.y,
                       node_radius,
                       stroke_color, fill_color)
        if @use_webgl
          @mv_node(d.gl, d.fisheye.x, d.fisheye.y)
  should_show_label: (node) ->
    (node.labelled or
        node.focused_edge or
        (@label_graphed and node.state is @graphed_set) or
        dist_lt(@last_mouse_pos, node, @label_show_range) or
        (node.name? and node.name.match(@search_regex))) # FIXME make this a flag that gets updated ONCE when the regex changes not something deep in loop!!!
  draw_labels: ->
    if @use_svg
      label.attr "style", (d) ->
        if @should_show_label(d)
          ""
        else
          "display:none"
    if @use_canvas or @use_webgl
      # http://stackoverflow.com/questions/3167928/drawing-rotated-text-on-a-html5-canvas
      # http://diveintohtml5.info/canvas.html#text
      # http://stackoverflow.com/a/10337796/1234699
      focused_font_size = @label_em * @focused_mag
      focused_font = "#{focused_font_size}em sans-serif"
      unfocused_font = "#{@label_em}em sans-serif"
      label_node = (node) =>
        return unless @should_show_label(node)
        ctx = @ctx
        # perhaps scrolling should happen here
        if node.focused_node or node.focused_edge?
          label = @scroll_pretty_name(node)
          if node.state.id is "graphed"
            cart_label = node.pretty_name
            ctx.measureText(cart_label).width #forces proper label measurement (?)
            if @cartouches
              @draw_cartouche(cart_label, node.fisheye.x, node.fisheye.y)
          ctx.fillStyle = node.color
          ctx.font = focused_font

        else
          ctx.fillStyle = renderStyles.labelColor #"white" is default
          ctx.font = unfocused_font
        return unless node.fisheye? # FIXME why is this even happening?
        if not @graphed_set.has(node) and @draw_lariat_labels_rotated
          # Flip label rather than write upside down
          #   var flip = (node.rad > Math.PI) ? -1 : 1;
          #   view-source:http://www.jasondavies.com/d3-dependencies/
          radians = node.rad
          flip = radians > Math.PI and radians < 2 * Math.PI
          textAlign = 'left'
          if flip
            radians = radians - Math.PI
            textAlign = 'right'
          ctx.save()
          ctx.translate node.fisheye.x, node.fisheye.y
          ctx.rotate -1 * radians + Math.PI / 2
          ctx.textAlign = textAlign
          ctx.fillText "  " + node.pretty_name, 0, 0 # TODO use .pretty_name
          ctx.restore()
        else
          ctx.fillText "  " + node.pretty_name, node.fisheye.x, node.fisheye.y

      @graphed_set.forEach label_node
      @shelved_set.forEach label_node
      @discarded_set.forEach label_node

  clear_canvas: ->
    @ctx.clearRect 0, 0, @canvas.width, @canvas.height
  blank_screen: ->
    @clear_canvas()  if @use_canvas or @use_webgl

  tick: =>
    # return if @focused_node   # <== policy: freeze screen when selected
    @ctx.lineWidth = @edge_width # TODO(smurp) just edges should get this treatment
    @find_node_or_edge_closest_to_pointer()
    @auto_change_verb()
    @update_snippet() # continuously update the snippet based on the currently focused_edge
    @blank_screen()
    @draw_dropzones()
    @fisheye.focus @last_mouse_pos
    @show_last_mouse_pos()
    @position_nodes() # unless @edit_mode and @dragging and @editui.subject_node
    @apply_fisheye()
    @draw_edges()
    @draw_nodes()
    @draw_shelf()
    @draw_discards()
    @draw_labels()
    @draw_edge_labels()

  rounded_rectangle: (x, y, w, h, radius, fill, stroke, alpha) ->
    ###
    http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
    ###
    console.log "Width: " + w
    ctx = @ctx
    ctx.fillStyle = fill
    r = x + w
    b = y + h
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(r - radius, y)
    ctx.quadraticCurveTo(r, y, r, y + radius)
    ctx.lineTo(r, y + h - radius)
    ctx.quadraticCurveTo(r, b, r - radius, b)
    ctx.lineTo(x + radius, b)
    ctx.quadraticCurveTo(x, b, x, b - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    if alpha
      ctx.globalAlpha = alpha
    ctx.fill()
    ctx.globalAlpha = 1
    if stroke
      ctx.strokeStyle = stroke
      ctx.stroke()

  draw_cartouche: (label, x, y) ->
    width = @ctx.measureText(label).width
    console.log "label width: " + width
    height = @label_em * @focused_mag * 16
    radius = @edge_x_offset
    cart_color = renderStyles.pageBg
    alpha = .8
    outline = true
    x = x + @edge_x_offset
    y = y - height
    width = width + 2 * @edge_x_offset
    height = height + @edge_x_offset
    @rounded_rectangle(x, y, width, height, radius, cart_color, outline, alpha)

  draw_edge_labels: ->
    if @focused_edge?
      @draw_edge_label(@focused_edge)

  draw_edge_label: (edge) ->
    ctx = @ctx
    label = edge.predicate.lid
    if @snippet_count_on_edge_labels
      if edge.contexts?
        if edge.contexts.length
          label += " (#{edge.contexts.length})"

    width = ctx.measureText(label).width
    height = @label_em * @focused_mag * 16
    if @cartouches
      @draw_cartouche(label, edge.handle.x, edge.handle.y)
    #ctx.fillStyle = '#666' #@shadow_color
    #ctx.fillText " " + label, edge.handle.x + @edge_x_offset + @shadow_offset, edge.handle.y + @shadow_offset
    ctx.fillStyle = edge.color
    ctx.fillText " " + label, edge.handle.x + @edge_x_offset, edge.handle.y

  update_snippet: ->
    if @show_snippets_constantly and @focused_edge? and @focused_edge isnt @printed_edge
      @print_edge @focused_edge

  msg_history: ""
  show_state_msg: (txt) ->
    if false
      @msg_history += " " + txt
      txt = @msg_history
    @state_msg_box.show()
    @state_msg_box.html("<br><br>" + txt)  # FIXME: OMG CSS PDQ
    @text_cursor.pause("wait")

  hide_state_msg: () ->
    @state_msg_box.hide()
    @text_cursor.continue()
    #@text_cursor.set_cursor("default")

  svg_restart: ->
    # console.log "svg_restart()"
    @link = @link.data(@links_set)
    @link.enter().
      insert("line", ".node").
      attr "class", (d) ->
        #console.log(l.geometry.vertices[0].x,l.geometry.vertices[1].x);
        "link"

    @link.exit().remove()
    @node = @node.data(@nodes)

    @node.exit().remove()

    nodeEnter = @node.enter().
      append("g").
      attr("class", "lariat node").
      call(force.drag)
    nodeEnter.append("circle").
      attr("r", calc_node_radius).
      style "fill", (d) ->
        d.color

    nodeEnter.append("text").
      attr("class", "label").
      attr("style", "").
      attr("dy", ".35em").
      attr("dx", ".4em").
      text (d) ->
        d.name

    @label = @svg.selectAll(".label")

  #force.nodes(nodes).links(links_set).start();
  canvas_show_text: (txt, x, y) ->
    # console.log "canvas_show_text(" + txt + ")"
    @ctx.fillStyle = "black"
    @ctx.font = "12px Courier"
    @ctx.fillText txt, x, y
  pnt2str: (x, y) ->
    "[" + Math.floor(x) + ", " + Math.floor(y) + "]"
  show_pos: (x, y, dx, dy) ->
    dx = dx or 0
    dy = dy or 0
    @canvas_show_text pnt2str(x, y), x + dx, y + dy
  show_line: (x0, y0, x1, y1, dx, dy, label) ->
    dx = dx or 0
    dy = dy or 0
    label = typeof label is "undefined" and "" or label
    @canvas_show_text pnt2str(x0, y0) + "-->" + pnt2str(x0, y0) + " " + label, x1 + dx, y1 + dy
  add_webgl_line: (e) ->
    e.gl = @add_line(scene, e.source.x, e.source.y, e.target.x, e.target.y, e.source.s.id + " - " + e.target.s.id, "green")

  #dump_line(e.gl);
  webgl_restart: ->
    links_set.forEach (d) =>
      @add_webgl_line d
  restart: ->
    @svg_restart() if @use_svg
    @force.start()
  show_last_mouse_pos: ->
    @draw_circle @last_mouse_pos[0], @last_mouse_pos[1], @focus_radius, "yellow"
  remove_ghosts: (e) ->
    if @use_webgl
      @remove_gl_obj e.gl  if e.gl
      delete e.gl
  add_node_ghosts: (d) ->
    d.gl = add_node(scene, d.x, d.y, 3, d.color)  if @use_webgl

  add_to: (itm, array, cmp) ->
    # FIXME should these arrays be SortedSets instead?
    cmp = cmp or array.__current_sort_order or @cmp_on_id
    c = @binary_search_on(array, itm, cmp, true)
    return c  if typeof c is typeof 3
    array.splice c.idx, 0, itm
    c.idx

  remove_from: (itm, array, cmp) ->
    cmp = cmp or array.__current_sort_order or @cmp_on_id
    c = @binary_search_on(array, itm, cmp)
    array.splice c, 1  if c > -1
    array

  my_graph:
    subjects: {}
    predicates: {}
    objects: {}

  fire_newsubject_event: (s) ->
    window.dispatchEvent(
      new CustomEvent 'newsubject',
        detail:
          sid: s
          # time: new Date()
        bubbles: true
        cancelable: true
    )

  ensure_predicate_lineage: (pid) ->
    # Ensure that fire_newpredicate_event is run for pid all the way back
    # to its earliest (possibly abstract) parent starting with the earliest
    pred_lid = uniquer(pid)
    if not @my_graph.predicates[pred_lid]?
      if @ontology.subPropertyOf[pred_lid]?
        parent_lid = @ontology.subPropertyOf[pred_lid]
      else
        parent_lid = "anything"
      @my_graph.predicates[pred_lid] = []
      @ensure_predicate_lineage(parent_lid)
      @fire_newpredicate_event pid, pred_lid, parent_lid

  fire_newpredicate_event: (pred_uri, pred_lid, parent_lid) ->
    window.dispatchEvent(
      new CustomEvent 'newpredicate',
        detail:
          pred_uri: pred_uri
          pred_lid: pred_lid
          parent_lid: parent_lid
        bubbles: true
        cancelable: true
    )

  make_qname: (uri) -> uri # TODO(smurp) reduce wrt prefixes
                           #     How does this relate to .lid?

  last_quad: {}

  # add_quad is the standard entrypoint for all data sources
  # It is fires the events:
  #   newsubject
  object_value_types: {}
  unique_pids: {}
  add_quad: (quad) ->
    console.log "HuViz.add_quad()", quad
    sid = quad.s
    pid = @make_qname(quad.p)
    ctxid = quad.g || @DEFAULT_CONTEXT
    subj_lid = uniquer(sid)
    @object_value_types[quad.o.type] = 1
    @unique_pids[pid] = 1
    newsubj = false
    subj = null
    if not @my_graph.subjects[sid]?
      newsubj = true
      subj =
        id: sid
        name: subj_lid
        predicates: {}
      @my_graph.subjects[sid] = subj
    else
      subj = @my_graph.subjects[sid]

    @ensure_predicate_lineage pid
    edge = null
    subj_n = @get_or_create_node_by_id(sid)
    pred_n = @get_or_create_predicate_by_id(pid)
    cntx_n = @get_or_create_context_by_id(ctxid)
    # set the predicate on the subject
    if not subj.predicates[pid]?
      subj.predicates[pid] = {objects:[]}
    if quad.o.type is RDF_object
      # The object is not a literal, but another resource with an uri
      # so we must get (or create) a node to represent it
      obj_n = @get_or_create_node_by_id(quad.o.value)
      # We have a node for the object of the quad and this quad is relational
      # so there should be links made between this node and that node
      is_type = is_one_of(pid, TYPE_SYNS)
      if is_type
        if @try_to_set_node_type(subj_n,quad.o.value)
          @develop(subj_n) # might be ready now
      else
        edge = @get_or_create_Edge(subj_n,obj_n,pred_n,cntx_n)
        @infer_edge_end_types(edge)
        edge.register_context(cntx_n)
        edge.color = @gclui.predicate_picker.get_color_forId_byName(pred_n.lid,'showing')
        @add_edge(edge)
        @develop(obj_n)
    else
      if subj_n.embryo and is_one_of(pid,NAME_SYNS)
        @set_name(subj_n, quad.o.value.replace(/^\s+|\s+$/g, ''))
        @develop(subj_n) # might be ready now
    @last_quad = quad
    return edge

  set_name: (node, full_name) ->
    node.name ?= full_name  # set it if blank
    len = @truncate_labels_to
    if not len?
      alert "len not set"
    if len > 0
      node.pretty_name = full_name.substr(0, len) # truncate
    else
      node.pretty_name = full_name
    node.scroll_offset = 0
    return

  scroll_spacer: "   "

  scroll_pretty_name: (node) ->
    if @truncate_labels_to >= node.name.length
      limit = node.name.length
    else
      limit = @truncate_labels_to
    should_scroll = limit > 0 and limit < node.name.length
    if not should_scroll
      return
    if true # node.label_truncated_to
      spacer = @scroll_spacer
      if not node.scroll_offset
        node.scroll_offset = 1
      else
        node.scroll_offset += 1
        if node.scroll_offset > node.name.length + spacer.length #limit
          node.scroll_offset = 0
      wrapped = ""
      while wrapped.length < 3 * limit
        wrapped +=  node.name + spacer
      node.pretty_name = wrapped.substr(node.scroll_offset, limit)
    # if node.pretty_name.length > limit
    #   alert("TOO BIG")
    # if node.pretty_name.length < 1
    #   alert("TOO SMALL")
  unscroll_pretty_name: (node) ->
    @set_name(node, node.name)

  infer_edge_end_types: (edge) ->
    edge.source.type = 'Thing' unless edge.source.type?
    edge.target.type = 'Thing' unless edge.target.type?
    ranges = @ontology.range[edge.predicate.lid]
    if ranges?
      #console.log "INFERRING BASED ON: edge_id:(#{edge.id}) first range_lid:(#{ranges[0]})",@ontology
      @try_to_set_node_type(edge.target,ranges[0])

    # infer type of source based on the domain of the predicate
    domain_lid = @ontology.domain[edge.predicate.lid]
    if domain_lid?
      #console.log "INFERRING BASED ON: edge_id:(#{edge.id}) domain_lid:(#{domain_lid})",@ontology
      @try_to_set_node_type(edge.source,domain_lid)

  make_Edge_id: (subj_n, obj_n, pred_n) ->
    return (a.lid for a in [subj_n, pred_n, obj_n]).join(' ')

  get_or_create_Edge: (subj_n, obj_n, pred_n, cntx_n) ->
    edge_id = @make_Edge_id(subj_n, obj_n, pred_n)
    edge = @edges_by_id[edge_id]
    if not edge?
      @edge_count++
      edge = new Edge(subj_n,obj_n,pred_n)
      @edges_by_id[edge_id] = edge
    return edge

  add_edge: (edge) ->
    if edge.id.match /Universal$/
      console.log("add", edge.id)
    #@add_link(edge)
    #return edge
    # TODO(smurp) should .links_from and .links_to be SortedSets? Yes. Right?
    #   edge.source.links_from.add(edge)
    #   edge.target.links_to.add(edge)
    #console.log "add_edge",edge.id
    @add_to edge,edge.source.links_from
    @add_to edge,edge.target.links_to
    edge

  delete_edge: (e) ->
    @remove_link(e.id)
    @remove_from e, e.source.links_from
    @remove_from e, e.target.links_to
    delete @edges_by_id[e.id]
    null

  try_to_set_node_type: (node, type_uri) ->
    #if type_uri.match(/^http.*/)
    #  alert "#{type_uri} is an uri rather than an lid"
    type_lid = uniquer(type_uri) # should ensure uniqueness
    #if not is_one_of(type_uri,@class_list)
    #  @class_list.push type_uri
    #  @hierarchy['everything'][1][type_lid] = [type_lid]
    ###
    if node.type?
      if node.type isnt type_lid
        console.warn "#{node.lid} already #{node.type} now: #{type_lid} "
    else
      console.info "  try_to_set_node_type",node.lid,"isa",type_lid
    ###
    node.type = type_lid
    return true

  report_every: 100 # if 1 then more data shown

  parseAndShowTTLData: (data, textStatus, callback) =>
    # modelled on parseAndShowNQStreamer
    parse_start_time = new Date()
    context = "http://universal.org"
    if GreenerTurtle? and @turtle_parser is 'GreenerTurtle'
      console.log("GreenTurtle() started")
      @G = new GreenerTurtle().parse(data, "text/turtle")
    quad_count = 0
    every = @report_every
    for subj_uri,frame of @G.subjects
      #console.log "frame:",frame
      #console.log frame.predicates
      for pred_id,pred of frame.predicates
        for obj in pred.objects
          # this is the right place to convert the ids (URIs) to CURIES
          #   Or should it be QNames?
          #      http://www.w3.org/TR/curie/#s_intro
          if every is 1
            @show_state_msg "<LI>#{frame.id} <LI>#{pred.id} <LI>#{obj.value}"
            console.log("===========================\n  #", quad_count, "  subj:", frame.id, "\n  pred:", pred.id, "\n  obj.value:", obj.value)
          else
            if quad_count % every is 0
              @show_state_msg("parsed relation " + quad_count)
          quad_count++
          @add_quad
            s: frame.id
            p: pred.id
            o: obj # keys: type,value[,language]
            g: context
    @dump_stats()
    @after_file_loaded('stream', callback)

  dump_stats: ->
    console.log("object_value_types:", @object_value_types)
    console.log("unique_pids:", @unique_pids)

  parseAndShowTurtle: (data, textStatus) =>
    msg = "data was " + data.length + " bytes"
    parse_start_time = new Date()

    if GreenerTurtle? and @turtle_parser is 'GreenerTurtle'
      @G = new GreenerTurtle().parse(data, "text/turtle")
      console.log("GreenTurtle")

    else if @turtle_parser is 'N3'
      console.log("N3")
      #N3 = require('N3')
      console.log("n3", N3)
      predicates = {}
      parser = N3.Parser()
      parser.parse data, (err,trip,pref) =>
        console.log(trip)
        if pref
          console.log(pref)
        if trip
          @add_quad(trip)
        else
          console.log(err)

      #console.log "my_graph",@my_graph
      console.log('===================================')
      for prop_name in ['predicates','subjects','objects']
        prop_obj = @my_graph[prop_name]
        console.log prop_name,(key for key,value of prop_obj).length,prop_obj
      console.log('===================================')
      #console.log "Predicates",(key for key,value of my_graph.predicates).length,my_graph.predicates
      #console.log "Subjects",my_graph.subjects.length,my_graph.subjects
      #console.log "Objects",my_graph.objects.length,my_graph.objects

    parse_end_time = new Date()
    parse_time = (parse_end_time - parse_start_time) / 1000
    siz = @roughSizeOfObject(@G)
    msg += " resulting in a graph of " + siz + " bytes"
    msg += " which took " + parse_time + " seconds to parse"
    console.log(msg) if @verbosity >= @COARSE
    show_start_time = new Date()
    @showGraph @G
    show_end_time = new Date()
    show_time = (show_end_time - show_start_time) / 1000
    msg += " and " + show_time + " sec to show"
    console.log(msg) if @verbosity >= @COARSE
    @text_cursor.set_cursor("default")
    $("#status").text ""

  choose_everything: =>
    console.log "choose_everything()"
    cmd = new gcl.GraphCommand this,
      verbs: ['choose']
      classes: ['Thing']
    @gclc.run(cmd)
    @gclui.push_command(cmd)
    @tick()

  remove_framing_quotes: (s) -> s.replace(/^\"/,"").replace(/\"$/,"")
  parseAndShowNQStreamer: (uri, callback) ->
    # turning a blob (data) into a stream
    #   http://stackoverflow.com/questions/4288759/asynchronous-for-cycle-in-javascript
    #   http://www.dustindiaz.com/async-method-queues/
    owl_type_map =
      uri:     RDF_object
      literal: RDF_literal
    worker = new Worker('/huviz/xhr_readlines_worker.js')
    quad_count = 0
    worker.addEventListener 'message', (e) =>
      msg = null
      if e.data.event is 'line'
        quad_count++
        if quad_count % 100 is 0
          @show_state_msg("parsed relation " + quad_count)
        q = parseQuadLine(e.data.line)
        if q
          q.s = q.s.raw
          q.p = q.p.raw
          q.g = q.g.raw
          q.o =
            type:  owl_type_map[q.o.type]
            value: unescape_unicode(@remove_framing_quotes(q.o.toString()))
          @add_quad q
      else if e.data.event is 'start'
        msg = "starting to split "+uri
      else if e.data.event is 'finish'
        msg = "finished_splitting "+uri
        @show_state_msg("done loading")
        @after_file_loaded(uri, callback)
      else
        msg = "unrecognized NQ event:"+e.data.event
      if msg?
        console.log(msg)
        #alert msg
    worker.postMessage({uri:uri})

  DUMPER: (data) =>
    console.log(data)

  fetchAndShow: (url, callback) ->
    @show_state_msg("fetching " + url)
    the_parser = @parseAndShowNQ
    if url.match(/.ttl/)
      the_parser = @parseAndShowTTLData # does not stream
    else if url.match(/.(nq|nt)/)
      the_parser = @parseAndShowNQ
    else if url.match(/.json/)
      the_parser = @parseAndShowJSON

    if the_parser is @parseAndShowNQ
      @parseAndShowNQStreamer(url, callback)
      return

    $.ajax
      url: url
      success: (data, textStatus) =>
        the_parser(data, textStatus, callback)
        #@fire_fileloaded_event(url) ## should call after_file_loaded(url, callback) within the_parser
        @hide_state_msg()
      error: (jqxhr, textStatus, errorThrown) ->
        console.log(url, errorThrown)
        $("#status").text(errorThrown + " while fetching " + url)

  # Deal with buggy situations where flashing the links on and off
  # fixes data structures.  Not currently needed.
  show_and_hide_links_from_node: (d) ->
    @show_links_from_node d
    @hide_links_from_node d

  get_container_width: (pad) ->
    pad = pad or hpad
    @width = (@container.clientWidth or window.innerWidth or document.documentElement.clientWidth or document.clientWidth) - pad
    #console.log "get_window_width()",window.innerWidth,document.documentElement.clientWidth,document.clientWidth,"==>",@width

  # Should be refactored to be get_container_height
  get_container_height: (pad) ->
    pad = pad or hpad
    @height = (@container.clientHeight or window.innerHeight or document.documentElement.clientHeight or document.clientHeight) - pad
    #console.log "get_window_height()",window.innerHeight,document.documentElement.clientHeight,document.clientHeight,"==>",@height

  update_graph_radius: ->
    @graph_region_radius = Math.floor(Math.min(@width / 2, @height / 2))
    @graph_radius = @graph_region_radius * @shelf_radius

  update_graph_center: ->
    @cy = @height / 2
    if @off_center
      @cx = @width - @graph_region_radius
    else
      @cx = @width / 2
    @my = @cy * 2
    @mx = @cx * 2

  update_lariat_zone: ->
    @lariat_center = [@cx, @cy]

  update_discard_zone: ->
    @discard_ratio = .1
    @discard_radius = @graph_radius * @discard_ratio
    @discard_center = [
      @width - @discard_radius * 3
      @height - @discard_radius * 3
    ]

  set_search_regex: (text) ->
    @search_regex = new RegExp(text or "^$", "ig")

  update_searchterm: =>
    text = $(this).text()
    @set_search_regex text
    @restart()

  dump_locations: (srch, verbose, func) ->
    verbose = verbose or false
    pattern = new RegExp(srch, "ig")
    nodes.forEach (node, i) =>
      unless node.name.match(pattern)
        console.log(pattern, "does not match!", node.name) if verbose
        return
      console.log(func.call(node))  if func
      @dump_details(node) if not func or verbose

  get_node_by_id: (node_id, throw_on_fail) ->
    throw_on_fail = throw_on_fail or false
    obj = @nodes.get_by('id',node_id)
    if not obj? and throw_on_fail
      throw new Error("node with id <" + node_id + "> not found")
    obj

  update_showing_links: (n) ->
    # TODO understand why this is like {Taxon,Predicate}.update_state
    #   Is this even needed anymore?
    old_status = n.showing_links
    if n.links_shown.length is 0
      n.showing_links = "none"
    else
      if n.links_from.length + n.links_to.length > n.links_shown.length
        n.showing_links = "some"
      else
        n.showing_links = "all"
    if old_status is n.showing_links
      return null # no change, so null
    # We return true to mean that edges where shown, so
    return old_status is "none" or n.showing_links is "all"

  should_show_link: (edge) ->
    # Edges should not be shown if either source or target are discarded or embryonic.
    ss = edge.source.state
    ts = edge.target.state
    d = @discarded_set
    e = @embryonic_set
    not (ss is d or ts is d or ss is e or ts is e)

  add_link: (e) ->
    @add_to e, e.source.links_from
    @add_to e, e.target.links_to
    if @should_show_link(e)
      @show_link(e)
    @update_showing_links e.source
    @update_showing_links e.target
    @update_state e.target

  remove_link: (edge_id) ->
    e = @links_set.get_by('id', edge_id)
    if not e?
      console.log("remove_link(#{edge_id}) not found!")
      return
    @remove_from e, e.source.links_shown
    @remove_from e, e.target.links_shown
    @links_set.remove e
    console.log "removing links from: " + e.id
    @update_showing_links e.source
    @update_showing_links e.target
    @update_state e.target
    @update_state e.source

  # FIXME it looks like incl_discards is not needed and could be removed
  show_link: (edge, incl_discards) ->
    console.log edge
    return  if (not incl_discards) and (edge.target.state is @discarded_set or edge.source.state is @discarded_set)
    @add_to edge, edge.source.links_shown
    @add_to edge, edge.target.links_shown
    @links_set.add edge
    edge.show()
    @update_state edge.source
    @update_state edge.target
    #@gclui.add_shown(edge.predicate.lid,edge)

  unshow_link: (edge) ->
    @remove_from edge,edge.source.links_shown
    @remove_from edge,edge.target.links_shown
    @links_set.remove edge
    console.log "unshowing links from: " + edge.id
    edge.unshow() # FIXME make unshow call @update_state WHICH ONE? :)
    @update_state edge.source
    @update_state edge.target
    #@gclui.remove_shown(edge.predicate.lid,edge)

  show_links_to_node: (n, incl_discards) ->
    incl_discards = incl_discards or false
    #if not n.links_to_found
    #  @find_links_to_node n,incl_discards
    n.links_to.forEach (e, i) =>
      @show_link e, incl_discards
    @update_showing_links n
    @update_state n
    @force.links @links_set
    @restart()

  update_state: (node) ->
    if node.state is @graphed_set and node.links_shown.length is 0
      @shelved_set.acquire node
      @unpin(node)
      #console.debug("update_state() had to @shelved_set.acquire(#{node.name})",node)
    if node.state isnt @graphed_set and node.links_shown.length > 0
      #console.debug("update_state() had to @graphed_set.acquire(#{node.name})",node)
      @graphed_set.acquire node

  hide_links_to_node: (n) ->
    n.links_to.forEach (e, i) =>
      @remove_from e, n.links_shown
      @remove_from e, e.source.links_shown
      e.unshow()
      @links_set.remove e
      @remove_ghosts e
      @update_state e.source
      @update_showing_links e.source
      @update_showing_links e.target

    @update_state n
    @force.links @links_set
    @restart()

  show_links_from_node: (n, incl_discards) ->
    incl_discards = incl_discards or false
    #if not n.links_from_found
    #  @find_links_from_node n
    n.links_from.forEach (e, i) =>
      @show_link e, incl_discards
    @update_state n
    @force.links @links_set
    @restart()

  hide_links_from_node: (n) ->
    n.links_from.forEach (e, i) =>
      @remove_from e, n.links_shown
      @remove_from e, e.target.links_shown
      e.unshow()
      @links_set.remove e
      @remove_ghosts e
      @update_state e.target
      @update_showing_links e.source
      @update_showing_links e.target

    @force.links @links_set
    @restart()

  attach_predicate_to_its_parent: (a_pred) ->
    parent_id = @ontology.subPropertyOf[a_pred.lid] or 'anything'
    if parent_id?
      parent_pred = @get_or_create_predicate_by_id(parent_id)
      a_pred.register_superclass(parent_pred)
    return

  get_or_create_predicate_by_id: (sid) ->
    obj_id = @make_qname(sid)
    obj_n = @predicate_set.get_by('id',obj_id)
    if not obj_n?
      obj_n = new Predicate(obj_id)
      @predicate_set.add(obj_n)
      @attach_predicate_to_its_parent(obj_n)
    obj_n

  clean_up_dirty_predicates: ->
    pred = @predicate_set.get_by('id', 'anything')
    if pred?
      pred.clean_up_dirt()

  clean_up_dirty_taxons: ->
    if @taxonomy.Thing?
      @taxonomy.Thing.clean_up_dirt()

  clean_up_all_dirt: ->
    @clean_up_dirty_taxons()
    @clean_up_dirty_predicates()
    @regenerate_english()

  get_or_create_context_by_id: (sid) ->
    obj_id = @make_qname(sid)
    obj_n = @context_set.get_by('id',obj_id)
    if not obj_n?
      obj_n = {id:obj_id}
      @context_set.add(obj_n)
    obj_n

  get_or_create_node_by_id: (sid) ->
    # FIXME OMG must standardize on .lid as the short local id, ie internal id
    obj_id = @make_qname(sid)
    obj_n = @nodes.get_by('id',obj_id)
    if not obj_n?
      obj_n = @embryonic_set.get_by('id',obj_id)
    if not obj_n?
      # at this point the node is embryonic, all we know is its uri!
      obj_n = new Node(obj_id, @use_lid_as_node_name)
      if not obj_n.id?
        alert "new Node('"+sid+"') has no id"
      #@nodes.add(obj_n)
      @embryonic_set.add(obj_n)
    return obj_n

  develop: (node) ->
    # If the node is embryonic and is ready to hatch, then hatch it.
    # In other words if the node is now complete enough to do interesting
    # things with, then let it join the company of other complete nodes.
    if node.embryo? and @is_ready(node)
      @hatch(node)

  hatch: (node) ->
    # Take a node from being 'embryonic' to being a fully graphable node
    #console.log node.id+" "+node.name+" is being hatched!"
    node.lid = uniquer(node.id) # FIXME ensure uniqueness
    @embryonic_set.remove(node)
    new_set = @get_default_set_by_type(node)
    if new_set?
      new_set.acquire(node)
    @assign_types(node,"hatch")
    start_point = [@cx, @cy]
    node.point(start_point)
    node.prev_point([start_point[0]*1.01,start_point[1]*1.01])
    @add_node_ghosts(node)
    @update_showing_links(node)
    @nodes.add(node)
    @recolor_node(node)
    @tick()
    return node

  get_or_create_node: (subject, start_point, linked) ->
    linked = false
    @get_or_make_node subject,start_point,linked

  # deprecated in favour of add_quad:
  make_nodes: (g, limit) ->
    limit = limit or 0
    count = 0
    for subj_uri,subj of g.subjects #my_graph.subjects
      #console.log subj, g.subjects[subj]  if @verbosity >= @DEBUG
      #console.log subj_uri
      #continue  unless subj.match(ids_to_show)
      subject = subj #g.subjects[subj]
      @get_or_make_node subject, [
        @width / 2
        @height / 2
      ], false
      count++
      break  if limit and count >= limit

  make_links: (g, limit) ->
    limit = limit or 0
    @nodes.some (node, i) =>
      subj = node.s
      @show_links_from_node @nodes[i]
      true  if (limit > 0) and (@links_set.length >= limit)
    @restart()

  hide_node_links: (node) ->
    node.links_shown.forEach (e, i) =>
      @links_set.remove e
      if e.target is node
        @remove_from e, e.source.links_shown
        @update_state e.source
        e.unshow()
        @update_showing_links e.source
      else
        @remove_from e, e.target.links_shown
        @update_state e.target
        e.unshow()
        @update_showing_links e.target
      @remove_ghosts e

    node.links_shown = []
    @update_state node
    @update_showing_links node

  hide_found_links: ->
    @nodes.forEach (node, i) =>
      @hide_node_links node  if node.name.match(search_regex)
    @restart()

  discard_found_nodes: ->
    @nodes.forEach (node, i) =>
      @discard node  if node.name.match(search_regex)
    @restart()

  show_node_links: (node) ->
    @show_links_from_node node
    @show_links_to_node node
    @update_showing_links node

  ## Never called
  # toggle_label_display: ->
  #   @label_graphed = not @label_graphed
  #   @tick()

  toggle_display_tech: (ctrl, tech) ->
    val = undefined
    tech = ctrl.parentNode.id
    if tech is "use_canvas"
      @use_canvas = not @use_canvas
      @clear_canvas()  unless @use_canvas
      val = @use_canvas
    if tech is "use_svg"
      @use_svg = not @use_svg
      val = @use_svg
    if tech is "use_webgl"
      @use_webgl = not @use_webgl
      val = @use_webgl
    ctrl.checked = val
    @tick()
    true

  label: (branded) ->
    @labelled_set.add branded
    @tick()

  unlabel: (anonymized) ->
    @labelled_set.remove anonymized
    @tick()

  pin: (node) ->
    if node.state is @graphed_set
      @pinned_set.add node
      return true
    return false

  unpin: (node) ->
    if node.fixed
      @pinned_set.remove node
      return true
    return false

  unlink: (unlinkee) ->
    # FIXME discover whether unlink is still needed
    @hide_links_from_node unlinkee
    @hide_links_to_node unlinkee
    @shelved_set.acquire unlinkee
    @update_showing_links unlinkee
    @update_state unlinkee

  #
  #  The DISCARDED are those nodes which the user has
  #  explicitly asked to not have drawn into the graph.
  #  The user expresses this by dropping them in the
  #  discard_dropzone.
  #
  discard: (goner) ->
    @unpin(goner)
    @unlink goner
    @discarded_set.acquire goner
    shown = @update_showing_links goner
    @unselect goner
    #@update_state goner
    goner

  undiscard: (prodigal) ->  # TODO(smurp) rename command to 'retrieve' ????
    if @discarded_set.has(prodigal) # see test 'retrieving should only affect nodes which are discarded'
      @shelved_set.acquire prodigal
      @update_showing_links prodigal
      @update_state prodigal
    prodigal

  #
  #  The CHOSEN are those nodes which the user has
  #  explicitly asked to have the links shown for.
  #  This is different from those nodes which find themselves
  #  linked into the graph because another node has been chosen.
  #
  shelve: (goner) =>
    @unpin(goner)
    @chosen_set.remove goner
    @hide_node_links goner
    @shelved_set.acquire goner
    shownness = @update_showing_links goner
    if goner.links_shown.length > 0
      console.log("shelving failed for", goner)
    goner

  choose: (chosen) =>
    # There is a flag .chosen in addition to the state 'linked'
    # because linked means it is in the graph
    @chosen_set.add chosen
    @graphed_set.acquire chosen # do it early so add_link shows them otherwise choosing from discards just puts them on the shelf
    @show_links_from_node chosen
    @show_links_to_node chosen
    ###
    if chosen.links_shown
      @graphed_set.acquire chosen  # FIXME this duplication (see above) is fishy
      chosen.showing_links = "all"
    else
      # FIXME after this weird side effect, at the least we should not go on
      console.error(chosen.lid,"was found to have no links_shown so: @unlink_set.acquire(chosen)", chosen)
      @shelved_set.acquire chosen
    ###
    @update_state chosen
    shownness = @update_showing_links chosen
    chosen

  unchoose: (unchosen) =>
    # To unchoose a node is to remove the chosen flag and unshow the edges
    # to any nodes which are not themselves chosen.  If that means that
    # this 'unchosen' node is now no longer graphed, so be it.
    #
    #   remove the node from the chosen set
    #     loop thru all links_shown
    #       if neither end of the link is chosen then
    #         unshow the link
    # @unpin unchosen # TODO figure out why this does not cleanse pin
    @chosen_set.remove unchosen
    for link in unchosen.links_shown by -1
      if link?
        if not (link.target.chosen? or link.source.chosen?)
          @unshow_link(link)
      else
        console.log("there is a null in the .links_shown of", unchosen)
    @update_state unchosen

  hide: (goner) =>
    @unpin(goner)
    @chosen_set.remove(goner)
    @hidden_set.acquire(goner)
    @selected_set.remove(goner)
    goner.unselect()
    @hide_node_links(goner)
    @update_state(goner)
    shownness = @update_showing_links(goner)

  #
  # The verbs SELECT and UNSELECT perhaps don't need to be exposed on the UI
  # but they perform the function of manipulating the @selected_set
  select: (node) =>
    if not node.selected?
      @selected_set.add(node)
      if node.select?
        node.select()
        @recolor_node(node)
      else
        msg = "#{node.__proto__.constructor.name} #{node.id} lacks .select()"
        throw msg
        console.error msg,node

  unselect: (node) =>
    if node.selected?
      @selected_set.remove(node)
      node.unselect()
      @recolor_node(node)

  recolor_node: (node) ->
    state = node.selected? and "emphasizing" or "showing"
    node.color = @gclui.taxon_picker.get_color_forId_byName(node.type,state)

  recolor_nodes: () ->
    # The nodes needing recoloring are all but the embryonic.
    for node in @nodes
      @recolor_node(node)

  toggle_selected: (node) ->
    if node.selected?
      @unselect(node)
    else
      @select(node)
    @update_all_counts()
    @regenerate_english()
    @tick()

  get_snippet_url: (snippet_id) ->
    if snippet_id.match(/http\:/)
      return snippet_id
    else
      return "#{window.location.origin}#{@get_snippetServer_path(snippet_id)}"

  get_snippetServer_path: (snippet_id) ->
    # this relates to index.coffee and the urls for the
    if @data_uri?.match('poetesses')
      console.info @data_uri,@data_uri.match('poetesses')
      which = "poetesses"
    else
      which = "orlando"
    return "/snippet/#{which}/#{snippet_id}/"

  get_snippet_js_key: (snippet_id) ->
    # This is in case snippet_ids can not be trusted as javascript
    # property ids because they might have leading '-' or something.
    return "K_" + snippet_id

  get_snippet: (snippet_id, callback) ->
    snippet_js_key = @get_snippet_js_key(snippet_id)
    snippet_text = @snippet_db[snippet_js_key]
    url = @get_snippet_url(snippet_id)
    if snippet_text
      callback(null, {response:snippet_text, already_has_snippet_id:true})
    else
      #url = "http://localhost:9999/snippet/poetesses/b--balfcl--0--P--3/"
      #console.warn(url)
      d3.xhr(url, callback)
    return "got it"

  clear_snippets: (evt) =>
    if evt? and evt.target? and not $(evt.target).hasClass('close_all_snippets_button')
      return false
    @currently_printed_snippets = {}
    @snippet_positions_filled = {}
    $('.snippet_dialog_box').remove()
    return

  remove_tags: (xml) ->
    xml.replace(XML_TAG_REGEX, " ").replace(MANY_SPACES_REGEX, " ")

  # peek selects a node so that subsequent mouse motions select not nodes but edges of this node
  peek: (node) =>
    was_already_peeking = false
    if @peeking_node?
      if @peeking_node is node
        was_already_peeking = true
      @recolor_node @peeking_node
      @unflag_all_edges @peeking_node
    if not was_already_peeking
      @peeking_node = node
      @peeking_node.color = PEEKING_COLOR

  unflag_all_edges: (node) ->
    for edge in node.links_shown
      edge.focused = false

  print_edge: (edge) ->
    # @clear_snippets()
    context_no = 0
    for context in edge.contexts
      snippet_js_key = @get_snippet_js_key(context.id)
      context_no++
      if @currently_printed_snippets[snippet_js_key]?
        # FIXME add the Subj--Pred--Obj line to the snippet for this edge
        #   also bring such snippets to the top
        console.log("  skipping because",@currently_printed_snippets[snippet_js_key])
        continue
      me = this
      make_callback = (context_no, edge, context) ->
        (err,data) ->
          data = data or {response: ""}
          snippet_text = data.response
          if not data.already_has_snippet_id
            snippet_text = me.remove_tags(snippet_text)
            snippet_text += '<br><code class="snippet_id">'+context.id+"</code>"
          snippet_id = context.id
          snippet_js_key = me.get_snippet_js_key snippet_id
          if not me.currently_printed_snippets[snippet_js_key]?
            me.currently_printed_snippets[snippet_js_key] = []
          me.currently_printed_snippets[snippet_js_key].push(edge)
          me.snippet_db[snippet_js_key] = snippet_text
          me.printed_edge = edge
          me.push_snippet
            edge: edge
            pred_id: edge.predicate.lid
            pred_name: edge.predicate.name
            context_id: context.id
            dialog_title: edge.source.name
            snippet_text: snippet_text
            no: context_no
            snippet_js_key: snippet_js_key
      @get_snippet context.id, make_callback(context_no, edge, context)

  # The Verbs PRINT and REDACT show and hide snippets respectively
  print: (node) =>
    @clear_snippets()
    for edge in node.links_shown
      @print_edge edge

  redact: (node) =>
    node.links_shown.forEach (edge,i) =>
      @remove_snippet edge.id

  show_edge_regarding: (node, predicate_lid) =>
    dirty = false
    doit = (edge,i,frOrTo) =>
      if edge.predicate.lid is predicate_lid
        if not edge.shown?
          @show_link edge
          dirty = true

    node.links_from.forEach (edge,i) =>
      doit(edge,i,'from')
    node.links_to.forEach (edge,i) =>
      doit(edge,i,'to')

    if dirty
      @update_state(node)
      @update_showing_links(node)
      @force.alpha(0.1)

  suppress_edge_regarding: (node, predicate_lid) =>
    dirty = false
    doit = (edge,i,frOrTo) =>
      if edge.predicate.lid is predicate_lid
        dirty = true
        @unshow_link edge
    node.links_from.forEach (edge,i) =>
      doit(edge,i,'from')
    node.links_to.forEach (edge,i) =>
      doit(edge,i,'to')
    # FIXME(shawn) Looping through links_shown should suffice, try it again
    #node.links_shown.forEach (edge,i) =>
    #  doit(edge,'shown')

    if dirty
      @update_state(node)
      @update_showing_links(node)
      @force.alpha(0.1)

  update_history: ->
    if window.history.pushState
      the_state = {}
      hash = ""
      if chosen_set.length
        the_state.chosen_node_ids = []
        hash += "#"
        hash += "chosen="
        n_chosen = chosen_set.length
        @chosen_set.forEach (chosen, i) =>
          hash += chosen.id
          the_state.chosen_node_ids.push chosen.id
          hash += ","  if n_chosen > i + 1

      the_url = location.href.replace(location.hash, "") + hash
      the_title = document.title
      window.history.pushState the_state, the_title, the_state

  restore_graph_state: (state) ->
    #console.log('state:',state);
    return unless state
    if state.chosen_node_ids
      @reset_graph()
      state.chosen_node_ids.forEach (chosen_id) =>
        chosen = get_or_make_node(chosen_id)
        @choose chosen  if chosen

  fire_showgraph_event: ->
    window.dispatchEvent(
      new CustomEvent 'showgraph',
        detail:
          message: "graph shown"
          time: new Date()
        bubbles: true
        cancelable: true
    )

  showGraph: (g) ->
    alert "showGraph called"
    @make_nodes g
    @fire_showgraph_event() if window.CustomEvent?
    @restart()

  show_the_edges: () ->
    #edge_controller.show_tree_in.call(arguments)

  register_gclc_prefixes: =>
    @gclc.prefixes = {}
    for abbr,prefix of @G.prefixes
      @gclc.prefixes[abbr] = prefix

  # https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
  init_datasetDB: ->
    indexedDB = window.indexedDB # || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || null
    if not indexedDB
      console.log("indexedDB not available")
    if not @datasetDB and indexedDB
      @dbName = 'datasetDB'
      @dbVersion = 2
      request = indexedDB.open(@dbName, @dbVersion)
      request.onsuccess = (e) =>
        @datasetDB = request.result
        @datasetDB.onerror = (e) =>
          alert "Database error: #{e.target.errorCode}"
        #alert "onsuccess"
        @fill_dataset_menus('onsuccess')
      request.onerror = (e) =>
        alert("unable to init #{@dbName}")
      request.onupgradeneeded = (e) =>
        db = event.target.result
        objectStore = db.createObjectStore("datasets", {keyPath: 'uri'})
        objectStore.transaction.oncomplete = (e) =>
          @datasetDB = db
          # alert "onupgradeneeded"
          @fill_dataset_menus('onupgradeneeded')

  ensure_datasets: (preload) ->
    defaults = preload.defaults or {}
    for ds_rec in preload.datasets
      for k of defaults
        ds_rec[k] ?= defaults[k]
      @ensure_dataset(ds_rec)

  ensure_dataset: (dataset_rec) ->
    # ensure the dataset is in the database and the correct loader
    uri = dataset_rec.uri
    #alert "ensure_dataset(#{JSON.stringify(dataset_rec)})"
    dataset_rec.time ?= new Date().toString()
    dataset_rec.title ?= uri
    dataset_rec.isUri ?= not not uri.match(/^(http|ftp)/)
    dataset_rec.canDelete ?= not not dataset_rec.time? # ie if it has a time then a user added it therefore canDelete
    dataset_rec.label ?= uri.split('/').reverse()[0]
    if dataset_rec.isOntology
      if @ontology_loader
        @ontology_loader.add_dataset(dataset_rec)
    else
      if @dataset_loader
        @dataset_loader.add_dataset(dataset_rec)

  add_dataset_to_db: (dataset_rec, callback) ->
    trx = @datasetDB.transaction('datasets', "readwrite")
    trx.oncomplete = (e) =>
      console.log("#{dataset_rec.uri} added!")
    trx.onerror = (e) =>
      console.log(e)
      alert "add_dataset(#{dataset_rec.uri}) error!!!"
    store = trx.objectStore('datasets')
    req = store.put(dataset_rec)
    req.onsuccess = (e) =>
      if dataset_rec.uri isnt e.target.result
        debugger
      callback(dataset_rec)

  remove_dataset_from_db: (dataset_uri, callback) ->
    trx = @datasetDB.transaction('datasets', "readwrite")
    trx.oncomplete = (e) =>
      console.log("#{dataset_uri} deleted")
    trx.onerror = (e) =>
      console.log(e)
      alert "remove_dataset_from_db(#{dataset_uri}) error!!!"
    store = trx.objectStore('datasets')
    req = store.delete(dataset_uri)
    req.onsuccess = (e) =>
      if callback?
        callback(dataset_uri)
    req.onerror = (e) =>
      console.debug e

  fill_dataset_menus: (why) ->
    # alert "fill_dataset_menus()"
    # https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#Using_a_cursor
    console.groupCollapsed("fill_dataset_menus(#{why})")
    if @args.preload
      for preload_group in @args.preload
        HVZ.ensure_datasets(preload_group)

    objectStore = @datasetDB.transaction('datasets').objectStore('datasets')
    count = 0

    make_onsuccess_handler = (why) =>
      recs = []
      return (event) =>
        cursor = event.target.result
        if cursor
          count++
          dataset_rec = cursor.value
          recs.push(dataset_rec)
          if not dataset_rec.isOntology
            # alert "Dataset: add_dataset_option(#{dataset_rec.uri})"
            @dataset_loader.add_dataset_option(dataset_rec)
          if dataset_rec.isOntology and @ontology_loader
            # alert "Ontology: add_dataset_option(#{dataset_rec.uri})"
            @ontology_loader.add_dataset_option(dataset_rec)
          cursor.continue()
        else # when there are no (or NO MORE) entries, ie FINALLY
          console.table(recs)
          @dataset_loader.val('')
          @ontology_loader.val('')
          @update_dataset_ontology_loader()
          console.groupEnd() # closing group called "fill_dataset_menus(why)"
          document.dispatchEvent( # TODO use 'huviz_controls' rather than document
            new Event('dataset_ontology_loader_ready'));
          #alert "#{count} entries saved #{why}"

    if @dataset_loader?
      objectStore.openCursor().onsuccess = make_onsuccess_handler(why)

  init_dataset_menus: ->
    if not @dataset_loader and @args.dataset_loader__append_to_sel
      @dataset_loader = new PickOrProvide(@, @args.dataset_loader__append_to_sel, 'Dataset', 'DataPP', false)
    if not @ontology_loader and @args.ontology_loader__append_to_sel
      @ontology_loader = new PickOrProvide(@, @args.ontology_loader__append_to_sel, 'Ontology', 'OntoPP', true)
      #$(@ontology_loader.form).disable()
    if @ontology_loader and not @big_go_button
      @big_go_button_id = unique_id()
      @big_go_button = $('<button>GO</button>')
      @big_go_button.attr('id', @big_go_button_id)
      $(@args.ontology_loader__append_to_sel).append(@big_go_button)
      @big_go_button.click(@visualize_dataset_using_ontology)
      @big_go_button.prop('disabled', true)
    @init_datasetDB()

  visualize_dataset_using_ontology: =>
    @set_ontology(@ontology_loader.value)
    @load_file_from_uri(@dataset_loader.value) # , () -> alert "woot")

  init_gclc: ->
    @gclc = new GraphCommandLanguageCtrl(this)
    @init_dataset_menus()
    if not @gclui?
      @gclui = new CommandController(this,d3.select(@args.gclui_sel)[0][0],@hierarchy)
    window.addEventListener 'showgraph', @register_gclc_prefixes
    window.addEventListener 'newpredicate', @gclui.handle_newpredicate
    TYPE_SYNS.forEach (pred_id,i) =>
      @gclui.ignore_predicate pred_id
    NAME_SYNS.forEach (pred_id,i) =>
      @gclui.ignore_predicate pred_id
    for pid in @predicates_to_ignore
      @gclui.ignore_predicate pid

  update_dataset_ontology_loader: =>
    #alert('update_dataset_ontology_loader')
    #debugger
    if not (@dataset_loader? and @ontology_loader?)
      console.log("still building loaders...")
      return
    ds_v = @dataset_loader.value
    on_v = @ontology_loader.value
    disable = (not (ds_v and on_v)) or ('provide' in [ds_v, on_v])
    ds_on = "#{ds_v} AND #{on_v}"
    @big_go_button.prop('disabled', disable)
    return

  init_editc: ->
    @editui ?= new EditController(@)

  set_edit_mode: (mode) ->
    @edit_mode = mode

  indexed_dbservice: ->
    @indexeddbservice ?= new IndexedDBService(this)

  init_indexddbstorage: ->
    @dbsstorage ?= new IndexedDBStorageController(this, @indexeddbservice)

  predicates_to_ignore: ["anything"]

  init_snippet_box: ->
    if d3.select('#snippet_box')[0].length > 0
      @snippet_box = d3.select('#snippet_box')
  remove_snippet: (snippet_id) ->
    key = @get_snippet_js_key(snippet_id)
    delete @currently_printed_snippets[key]
    if @snippet_box
      slctr = '#'+id_escape(snippet_id)
      console.log(slctr)
      @snippet_box.select(slctr).remove()
  push_snippet: (obj, msg) ->
    if @snippet_box
      snip_div = @snippet_box.append('div').attr('class','snippet')
      snip_div.html(msg)
      $(snip_div[0][0]).addClass("snippet_dialog_box")
      my_position = @get_next_snippet_position()
      dialog_args =
        maxHeight: @snippet_size
        title: obj.dialog_title
        position:
          my: my_position
          at: "left top"
          of: window
        close: (event, ui) =>
          event.stopPropagation()
          delete @snippet_positions_filled[my_position]
          delete @currently_printed_snippets[event.target.id]
          return

      dlg = $(snip_div).dialog(dialog_args)
      elem = dlg[0][0]
      elem.setAttribute("id",obj.snippet_js_key)
      bomb_parent = $(elem).parent().
        select(".ui-dialog-titlebar").children().first()
      close_all_button = bomb_parent.
        append('<button type="button" class="ui-button ui-widget" role="button" title="Close All""><img class="close_all_snippets_button" src="close_all.png" title="Close All"></button>')
        #append('<span class="close_all_snippets_button" title="Close All"></span>')
        #append('<img class="close_all_snippets_button" src="close_all.png" title="Close All">')
      close_all_button.on 'click', @clear_snippets
      return

  snippet_positions_filled: {}
  get_next_snippet_position: ->
    # Fill the left edge, then the top edge, then diagonally from top-left
    height = @height
    width = @width
    left_full = false
    top_full = false
    hinc = 0
    vinc = @snippet_size
    hoff = 0
    voff = 0
    retval = "left+#{hoff} top+#{voff}"
    while @snippet_positions_filled[retval]?
      hoff = hinc + hoff
      voff = vinc + voff
      retval = "left+#{hoff} top+#{voff}"
      if not left_full and voff + vinc + vinc > height
        left_full = true
        hinc = @snippet_size
        hoff = 0
        voff = 0
        vinc = 0
      if not top_full and hoff + hinc + hinc + hinc > width
        top_full = true
        hinc = 30
        vinc = 30
        hoff = 0
        voff = 0
    @snippet_positions_filled[retval] = true
    return retval

  run_verb_on_object: (verb, subject) ->
    cmd = new gcl.GraphCommand this,
      verbs: [verb]
      subjects: [@get_handle subject]
    @run_command(cmd)

  before_running_command: ->
    # FIXME fix non-display of cursor and color changes
    @text_cursor.set_cursor("wait")
    $("body").css "background-color", "red" # FIXME remove once it works!
    #toggle_suspend_updates(true)

  after_running_command: ->
    #toggle_suspend_updates(false)
    @text_cursor.set_cursor("default")
    $("body").css "background-color", renderStyles.pageBg # FIXME remove once it works!
    @update_all_counts()
    @clean_up_all_dirt()

  get_handle: (thing) ->
    # A handle is like a weak reference, saveable, serializable
    # and garbage collectible.  It was motivated by the desire to
    # turn an actual node into a suitable member of the subjects list
    # on a GraphCommand
    return {id: thing.id, lid: thing.lid}

  toggle_logging: () ->
    if not console.log_real?
      console.log_real = console.log
    new_state = console.log is console.log_real
    @set_logging(new_state)

  set_logging: (new_state) ->
    if new_state
      console.log = console.log_real
      return true
    else
      console.log = () ->
      return false

  create_state_msg_box: () ->
    @state_msg_box = $("#state_msg_box")
    @hide_state_msg()
    console.info @state_msg_box

  init_ontology: ->
    @create_taxonomy()
    @ontology =
      subClassOf: {}
      subPropertyOf: {}
      domain: {}
      range: {}

  constructor: (args) -> # Huviz
    args ?= {}
    if not args.viscanvas_sel
      msg = "call Huviz({viscanvas_sel:'????'}) so it can find the canvas to draw in"
      console.debug msg
    if not args.gclui_sel
      alert("call Huviz({gclui_sel:'????'}) so it can find the div to put the gclui command pickers in")
    if not args.graph_controls_sel
      console.warn("call Huviz({graph_controls_sel:'????'}) so it can put the settings somewhere")
    @args = args
    if @args.selector_for_graph_controls?
      @selector_for_graph_controls = @args.selector_for_graph_controls
    @init_ontology()
    @off_center = false # FIXME expose this or make the amount a slider
    #@toggle_logging()

    document.addEventListener 'nextsubject', @onnextsubject
    @init_snippet_box()  # FIXME not sure this does much useful anymore
    @mousedown_point = false
    @discard_point = [@cx,@cy] # FIXME refactor so updateWindow handles this
    @lariat_center = [@cx,@cy] #       and this....
    @node_radius_policy = node_radius_policies[default_node_radius_policy]
    @currently_printed_snippets = {}
    @fill = d3.scale.category20()
    @force = d3.layout.force().
             size([@width,@height]).
             nodes([]).
             linkDistance(@link_distance).
             charge(@get_charge).
             #charge(-300).
             gravity(@gravity).
             on("tick", @tick)
    @update_fisheye()
    @svg = d3.select("#vis").
              append("svg").
              attr("width", @width).
              attr("height", @height).
              attr("position", "absolute")
    @svg.append("rect").attr("width", @width).attr "height", @height
    if not d3.select(@args.viscanvas_sel)[0][0]
      d3.select("body").append("div").attr("id", "viscanvas")
    @container = d3.select(@args.viscanvas_sel).node().parentNode
    @init_graph_controls_from_json()
    if @use_fancy_cursor
      @text_cursor = new TextCursor(@args.viscanvas_sel, "")
      @install_update_pointer_togglers()
    @create_state_msg_box()
    @viscanvas = d3.select(@args.viscanvas_sel).html("").
      append("canvas").
      attr("width", @width).
      attr("height", @height)
    @canvas = @viscanvas[0][0]
    @mouse_receiver = @viscanvas
    @reset_graph()
    @updateWindow()
    @ctx = @canvas.getContext("2d")
    console.log @ctx
    @mouse_receiver
      .on("mousemove", @mousemove)
      .on("mousedown", @mousedown)
      .on("mouseup", @mouseup)
      #.on("mouseout", @mouseup) # FIXME what *should* happen on mouseout?
    @restart()
    @set_search_regex("")
    search_input = document.getElementById('search')
    if search_input
      search_input.addEventListener("input", @update_searchterm)
    #$(".search_box").on "input", @update_searchterm
    window.addEventListener "resize", @updateWindow
    $(@viscanvas).bind("_splitpaneparentresize", @updateWindow)
    $("#tabs").tabs
      active: 0
      collapsible: true
    $('.open_tab').click (event) =>
      tab_idx = parseInt($(event.target).attr('href').replace("#",""))
      @goto_tab(tab_idx)
      return false

  goto_tab: (tab_idx) ->
    $('#tabs').tabs
      active: tab_idx
      collapsible: true

  update_fisheye: ->
    @label_show_range = @link_distance * 1.1
    #@fisheye_radius = @label_show_range * 5
    @focus_radius = @label_show_range
    @fisheye = d3.fisheye.
      circular().
      radius(@fisheye_radius).
      distortion(@fisheye_zoom)
    @force.linkDistance(@link_distance).gravity(@gravity)

  replace_human_term_spans: (optional_class) ->
    optional_class = optional_class or 'a_human_term'
    if console and console.info
      console.info("doing addClass('#{optional_class}') on all occurrences of CSS class human_term__*")
    for canonical, human of @human_term
      selector = '.human_term__' + canonical
      console.log("replacing '#{canonical}' with '#{human}' in #{selector}")
      $(selector).text(human).addClass(optional_class) #.style('color','red')

  human_term:
    all: 'ALL'
    chosen: 'CHOSEN'
    unchosen: 'UNCHOSEN'
    selected: 'SELECTED'
    shelved: 'SHELVED'
    discarded: 'DISCARDED'
    hidden: 'HIDDEN'
    graphed: 'GRAPHED'
    fixed: 'PINNED'
    labelled: 'LABELLED'
    choose: 'CHOOSE'
    unchoose: 'UNCHOOSE'
    select: 'SELECT'
    unselect: 'UNSELECT'
    label: 'LABEL'
    unlabel: 'UNLABEL'
    shelve: 'SHELVE'
    hide: 'HIDE'
    discard: 'DISCARD'
    undiscard: 'RETRIEVE'
    pin: 'PIN'
    unpin: 'UNPIN'
    unpinned: 'UNPINNED'
    blank_verb: 'VERB'
    blank_noun: 'SET/SELECTION'

  # TODO add controls
  #   selected_border_thickness
  default_graph_controls: [
      focused_mag:
        text: "focused label mag"
        input:
          value: 1.4
          min: 1
          max: 3
          step: .1
          type: 'range'
        label:
          title: "the amount bigger than a normal label the currently focused one is"
    ,
      selected_mag:
        text: "selected node mag"
        input:
          value: 1.5
          min: 0.5
          max: 4
          step: .1
          type: 'range'
        label:
          title: "the amount bigger than a normal node the currently selected ones are"
    ,
      label_em:
        text: "label size (em)"
        label:
          title: "the size of the font"
        input:
          value: .9
          min: .1
          max: 4
          step: .05
          type: 'range'
    ,
      snippet_body_em:
        text: "snippet body (em)"
        label:
          title: "the size of the snippet text"
        input:
          value: .7
          min: .2
          max: 4
          step: .1
          type: "range"
    ,
      snippet_triple_em:
        text: "snippet triple (em)"
        label:
          title: "the size of the snippet triples"
        input:
          value: .5
          min: .2
          max: 4
          step: .1
          type: "range"
    ,
      charge:
        text: "charge (-)"
        label:
          title: "the repulsive charge betweeen nodes"
        input:
          value: -200
          min: -600
          max: -1
          step: 1
          type: "range"
    ,
      gravity:
        text: "gravity"
        label:
          title: "the attractive force keeping nodes centered"
        input:
          value: 0.25
          min: 0
          max: 1
          step: 0.025
          type: "range"
    ,
      shelf_radius:
        text: "shelf radius"
        label:
          title: "how big the shelf is"
        input:
          value: 0.8
          min: 0.1
          max: 3
          step: 0.05
          type: "range"
    ,
      fisheye_zoom:
        text: "fisheye zoom"
        label:
          title: "how much magnification happens"
        input:
          value: 6.0
          min: 1
          max: 20
          step: 0.2
          type: "range"
    ,
      fisheye_radius:
        text: "fisheye radius"
        label:
          title: "how big the fisheye is"
        input:
          value: 100
          min: 40
          max: 2000
          step: 20
          type: "range"
    ,
      node_radius:
        text: "node radius"
        label:
          title: "how fat the nodes are"
        input:
          value: 3
          min: .2
          max: 8
          step: 0.1
          type: "range"
    ,
      focus_threshold:
        text: "focus threshold"
        label:
          title: "how fine is node recognition"
        input:
          value: 100
          min: 15
          max: 150
          step: 1
          type: "range"
    ,
      link_distance:
        text: "link distance"
        label:
          title: "how long the lines are"
        input:
          value: 29
          min: 5
          max: 200
          step: 2
          type: "range"
    ,
      edge_width:
        text: "line thickness"
        label:
          title: "how thick the lines are"
        input:
          value: 0.2
          min: 0.2
          max: 10
          step: .2
          type: "range"
    ,
      line_edge_weight:
        text: "line edge weight"
        label:
          title: "how much thicker lines become to indicate the number of snippets"
        input:
          value: 0.45
          min: 0
          max: 1
          step: 0.01
          type: "range"
    ,
      swayfrac:
        text: "sway fraction"
        label:
          title: "how much curvature lines have"
        input:
          value: 0.22
          min: 0.001
          max: 0.6
          step: 0.01
          type: "range"
    ,
      label_graphed:
        text: "label graphed nodes"
        style: "display:none"
        label:
          title: "whether graphed nodes are always labelled"
        input:
          #checked: "checked"
          type: "checkbox"
    ,
      truncate_labels_to:
        text: "truncate and scroll"
        label:
          title: "truncate and scroll labels longer than this, or zero to disable"
        input:
          value: 40
          min: 0
          max: 60
          step: 1
          type: "range"
    ,
      slow_it_down:
        #style: "display:none"
        text: "Slow it down (sec)"
        label:
          title: "execute commands with wait states to simulate long operations"
        input:
          value: 0
          min: 0
          max: 10
          step: 0.1
          type: "range"
    ,
      snippet_count_on_edge_labels:
        text: "snippet count on edge labels"
        label:
          title: "whether edges have their snippet count shown as (#)"
        input:
          checked: "checked"
          type: "checkbox"
    ,
      nodes_pinnable:
        style: "display:none"
        text: "nodes pinnable"
        label:
          title: "whether repositioning already graphed nodes pins them at the new spot"
        input:
          checked: "checked"
          type: "checkbox"
    ,
      use_fancy_cursor:
        style: "display:none"
        text: "use fancy cursor"
        label:
          title: "use custom cursor"
        input:
          checked: "checked"
          type: "checkbox"
    ,
      doit_asap:
        style: "display:none"
        text: "DoIt ASAP"
        label:
          title: "execute commands as soon as they are complete"
        input:
          checked: "checked" # default to 'on'
          type: "checkbox"
    ,
      show_dangerous_datasets:
        text: "Show dangerous datasets"
        label:
          title: "Show the datasets which are too large or buggy"
        input:
          type: "checkbox"
    ,
      theme_colors:
        text: "Display graph with dark theme"
        label:
          title: "Show graph plotted on a black background"
        input:
          type: "checkbox"
    ,
      display_label_cartouches:
        text: "Background cartouches for labels"
        label:
          title: "Remove backgrounds from focused labels"
        input:
          type: "checkbox"
          checked: "checked"
    ]

  dump_current_settings: (post) ->
    console.log("dump_current_settings()")
    for control_spec in @default_graph_controls
      for control_name, control of control_spec
        console.log("#{control_name} is",@[control_name],typeof @[control_name],post or "")

  auto_adjust_settings: ->
    # Try to tune the gravity, charge and link length to suit the data and the canvas size.
    return @

  init_graph_controls_from_json: =>
    #@graph_controls_cursor = new TextCursor(@args.graph_controls_sel, "")
    @graph_controls_cursor = new TextCursor(".graph_control input", "")
    if @graph_controls_cursor
      $("input").on("mouseover", @update_graph_controls_cursor)
      #$("input").on("mouseenter", @update_graph_controls_cursor)
      #$("input").on("mousemove", @update_graph_controls_cursor)
    @graph_controls = d3.select(@args.graph_controls_sel)
    @graph_controls.classed('graph_controls',true)
    #$(@graph_controls).sortable().disableSelection() # TODO fix dropping
    for control_spec in @default_graph_controls
      for control_name, control of control_spec
        graph_control = @graph_controls.append('span').attr('class', 'graph_control')
        label = graph_control.append('label')
        if control.text?
          label.text(control.text)
        if control.label?
          label.attr(control.label)
        if control.style?
           graph_control.attr("style", control.style)
        input = label.append('input')
        input.attr("name", control_name)
        if control.input?
          for k,v of control.input
            if k is 'value'
              old_val = @[control_name]
              @change_setting_to_from(control_name, v, old_val)
            input.attr(k,v)
        if control.input.type is 'checkbox'
          value = control.input.checked?
          #console.log "control:",control_name,"value:",value, control
          @change_setting_to_from(control_name, value, undefined) #@[control_name].checked)
        input.on("change", @update_graph_settings) # TODO implement one or the other
        input.on("input", @update_graph_settings)
    return

  update_graph_controls_cursor: (evt) =>
    cursor_text = (evt.target.value).toString()
    if !cursor_text
      console.debug(cursor_text)
    else
      console.log(cursor_text)
    @graph_controls_cursor.set_text(cursor_text)

  update_graph_settings: (target, update) =>
    target = target? and target or d3.event.target
    update = not update? and true or update
    update = not update
    if target.type is "checkbox"
      cooked_value = target.checked
    else if target.type is "range" # must massage into something useful
      asNum = parseFloat(target.value)
      cooked_value = ('' + asNum) isnt 'NaN' and asNum or target.value
    else
      cooked_value = target.value
    old_value = @[target.name]
    @change_setting_to_from(target.name, cooked_value, old_value)
    d3.select(target).attr("title", cooked_value)
    if update  # TODO be more discriminating, not all settings require update
               #   ones that do: charge, gravity, fisheye_zoom, fisheye_radius
      @update_fisheye()
      @updateWindow()
    @tick()

  change_setting_to_from: (setting_name, new_value, old_value, skip_custom_handler) =>
    skip_custom_handler = skip_custom_handler? and skip_custom_handler or false
    custom_handler_name = "on_change_" + setting_name
    custom_handler = @[custom_handler_name]
    if @graph_controls_cursor
      cursor_text = (new_value).toString()
      console.info("#{setting_name}: #{cursor_text}")
      @graph_controls_cursor.set_text(cursor_text)
    if custom_handler? and not skip_custom_handler
      #console.log "change_setting_to_from() custom setting: #{setting_name} to:#{new_value}(#{typeof new_value}) from:#{old_value}(#{typeof old_value})"
      custom_handler.apply(@, [new_value, old_value])
    else
      #console.log "change_setting_to_from() setting: #{setting_name} to:#{new_value}(#{typeof new_value}) from:#{old_value}(#{typeof old_value})"
      this[setting_name] = new_value

  # on_change handlers for the various settings which need them
  on_change_nodes_pinnable: (new_val, old_val) ->
    if not new_val
      if @graphed_set
        for node in @graphed_set
          node.fixed = false

  on_change_show_dangerous_datasets: (new_val, old_val) ->
    if new_val
      $('option.dangerous').show()
      $('option.dangerous').text (idx, text) ->
        append = ' (!)'
        if not text.match(/\(\!\)$/)
          return text + append
        return text
    else
      $('option.dangerous').hide()

  on_change_theme_colors: (new_val) ->
    if new_val
      renderStyles = themeStyles.dark
    else
      renderStyles = themeStyles.light
    #@update_graph_settings()
    $("body").css "background-color", renderStyles.pageBg
    @updateWindow()

  on_change_display_label_cartouches: (new_val) ->
    if new_val
      @cartouches = true
    else
      @cartouches = false
    @updateWindow()


  on_change_shelf_radius: (new_val, old_val) ->
    @change_setting_to_from('shelf_radius', new_val, old_val, true)
    @update_graph_radius()
    @updateWindow()

  on_change_truncate_labels_to: (new_val, old_val) ->
    @change_setting_to_from('truncate_labels_to', new_val, old_val, true)
    if @all_set
      for node in @all_set
        @unscroll_pretty_name(node)
    @updateWindow()

  init_from_graph_controls: ->
    # alert "init_from_graph_controls() is deprecated"
    # Perform update_graph_settings for everything in the form
    # so the HTML can be used as configuration file
    for elem in $(".graph_controls input") # so we can modify them in a loop
      @update_graph_settings(elem, false)

  after_file_loaded: (uri, callback) ->
    #@show_node_pred_edge_stats()
    @fire_fileloaded_event(uri)
    if callback
      callback()

  show_node_pred_edge_stats: ->
    pred_count = 0
    edge_count = 0

    s = "nodes:#{@nodes.length} predicates:#{pred_count} edges:#{edge_count}"
    console.log(s)
    debugger

  fire_fileloaded_event: (uri) ->
    document.dispatchEvent(new CustomEvent("dataset-loaded", {detail: uri}))
    window.dispatchEvent(
      new CustomEvent 'fileloaded',
        detail:
          message: "file loaded"
          time: new Date()
        bubbles: true
        cancelable: true
    )

  load_file: ->
    @load_file_from_uri(@get_dataset_uri())

  load_file_from_uri: (@data_uri, callback) ->
    if @args.display_reset
      $("#reset_btn").show()
    else
      @disable_data_set_selector()
    @show_state_msg("loading...")
    #@init_from_graph_controls()
    #@dump_current_settings("after init_from_graph_controls()")
    @reset_graph()
    @show_state_msg @data_uri
    unless @G.subjects
      @fetchAndShow @data_uri, callback

  disable_data_set_selector: () ->
    $("[name=data_set]").prop('disabled', true)
    $("#reload_btn").show()

  read_data_and_show: (filename, data) ->
    if filename.match(/.ttl$/)
      the_parser = @parseAndShowTTLData
    else if filename.match(/.nq$/)
      the_parser = @parseAndShowNQStreamer
    else
      alert("don't know how to parse '#{filename}'")
      return
    the_parser(data)
    @disable_data_set_selector()

  get_dataset_uri: () ->
    # FIXME goodbye jquery
    return $("select.file_picker option:selected").val()

  get_script_from_hash: () ->
    script = location.hash
    script = (not script? or script is "#") and "" or script.replace(/^#/,"")
    script = script.replace(/\+/g," ")
    console.log("script", script)
    return script

  boot_sequence: (script) ->
    # If we are passed an empty string that means there was an outer
    # script but there was nothing for us and DO NOT examine the hash for more.
    # If there is a script after the hash, run it.
    # Otherwise load the default dataset defined by the page.
    # Or load nothing if there is no default.
    #@init_from_graph_controls()
    # $(".graph_controls").sortable() # FIXME make graph_controls sortable
    @reset_graph()
    if not script?
      script = @get_script_from_hash()
    if script? and script.length
      console.log("boot_sequence('#{script}')")
      @gclui.run_script(script)
    else
      data_uri = @get_dataset_uri()
      if data_uri
        @load(data_uri)

  load: (data_uri, callback) ->
    @fetchAndShow(data_uri, callback) unless @G.subjects
    @init_webgl()  if @use_webgl

  is_ready: (node) ->
    # This should really be performed on NODES not subjects, meaning nodes should
    # have FOAF_name and type assigned to them during add_quad()
    #
    # Determine whether there is enough known about a subject to create a node for it
    # Does it have an .id and a .type and a .name?
    return node.id? and node.type? and node.name?

  assign_types: (node,within) ->
    # see Orlando.assign_types
    type_id = node.type # FIXME one of type or taxon_id gotta go, bye 'type'
    if type_id
      #console.log "assign_type",type_id,"to",node.id,"within",within,type_id
      @get_or_create_taxon(type_id).register(node)

    else
      throw "there must be a .type before hatch can even be called:"+node.id+ " "+type_id
      #console.log "assign_types failed, missing .type on",node.id,"within",within,type_id

  is_big_data: () ->
    if not @big_data_p?
      #if @nodes.length > 200
      if @data_uri?.match('poetesses|relations')
        @big_data_p = true
      else
        @big_data_p = false
    return @big_data_p

  get_default_set_by_type: (node) ->
    # see Orlando.get_default_set_by_type
    #console.log "get_default_set_by_type",node
    if @is_big_data()
      if node.type in ['writer']
        return @shelved_set
      else
        return @hidden_set
    return @shelved_set

  get_default_set_by_type: (node) ->
    return @shelved_set

class OntologicallyGrounded extends Huviz
  # If OntologicallyGrounded then there is an associated ontology which informs
  # the TaxonPicker and the PredicatePicker
  set_ontology: (ontology_uri) ->
    #@init_ontology()
    @read_ontology(ontology_uri)

  read_ontology: (ontology_uri) ->
    $.ajax
      url: ontology_uri
      async: false
      success: @parseTTLOntology
      error: (jqxhr, textStatus, errorThrown) ->
        @show_state_msg(errorThrown + " while fetching ontology " + ontology_uri)

  parseTTLOntology: (data, textStatus) =>
    # detect (? rdfs:subClassOf ?) and (? ? owl:Class)
    # Analyze the ontology to enable proper structuring of the
    # predicate_picker and the taxon_picker.  Also to support
    # imputing 'type' (and hence Taxon) to nodes.
    ontology = @ontology
    if GreenerTurtle? and @turtle_parser is 'GreenerTurtle'
      @raw_ontology = new GreenerTurtle().parse(data, "text/turtle")
      for subj_uri, frame of @raw_ontology.subjects
        subj_lid = uniquer(subj_uri)
        for pred_id, pred of frame.predicates
          pred_lid = uniquer(pred_id)
          obj_raw = pred.objects[0].value

          if pred_lid in ['comment', 'label']
            #console.error "  skipping",subj_lid, pred_lid #, pred
            continue
          obj_lid = uniquer(obj_raw)
          #if pred_lid in ['range','domain']
          #  console.log pred_lid, subj_lid, obj_lid
          if pred_lid is 'domain'
            ontology.domain[subj_lid] = obj_lid
          else if pred_lid is 'range'
            if not ontology.range[subj_lid]?
              ontology.range[subj_lid] = []
            if not (obj_lid in ontology.range)
              ontology.range[subj_lid].push(obj_lid)
          else if pred_lid is 'subClassOf'
            ontology.subClassOf[subj_lid] = obj_lid
          else if pred_lid is 'subPropertyOf'
            ontology.subPropertyOf[subj_lid] = obj_lid

        #
        # [ rdf:type owl:AllDisjointClasses ;
        #   owl:members ( :Organization
        #                 :Person
        #                 :Place
        #                 :Sex
        #                 :Work
        #               )
        # ] .
        #
        # If there exists (_:1, rdfs:type, owl:AllDisjointClasses)
        # Then create a root level class for every rdfs:first in rdfs:members

class Orlando extends OntologicallyGrounded
  # These are the Orlando specific methods layered on Huviz.
  # These ought to be made more data-driven.

  get_default_set_by_type: (node) ->
    if @is_big_data()
      if node.type in ['writer']
        return @shelved_set
      else
        return @hidden_set
    return @shelved_set

  HHH: {}

  push_snippet: (msg_or_obj) ->
    obj = msg_or_obj
    if @snippet_box
      if typeof msg_or_obj isnt 'string'
        [msg_or_obj, m] = ["", msg_or_obj]  # swap them
        msg_or_obj = """
        <div id="#{obj.snippet_js_key}">
          <div style="font-size:#{@snippet_triple_em}em">
            <span class="writername" style="background-color:#{m.edge.source.color}">
              <a target="SRC"
                 title="see full text at Cambridge"
                 href="#{m.edge.source.id}"><i class="fa fa-external-link"></i> #{m.edge.source.name}</a>
            </span>
            —
            <span style="background-color:#{m.edge.color}">#{m.pred_id}</span>
            —
            <span style="background-color:#{m.edge.target.color}">#{m.edge.target.name}</span>
          </div>
          <div>
            <div contenteditable style="cursor:text;font-size:#{@snippet_body_em}em">#{m.snippet_text}</div>
          </div>
        </div>

        """
        ## unconfuse emacs Coffee-mode: " """ ' '  "
      super(obj, msg_or_obj) # fail back to super

  human_term:
    all: 'All'
    chosen: 'Activated'
    unchosen: 'Deactivated'
    selected: 'Selected'
    shelved: 'Shelved'
    discarded: 'Discarded'
    hidden: 'Hidden'
    graphed: 'Graphed'
    fixed: 'Pinned'
    labelled: 'Labelled'
    choose: 'Activate'
    unchoose: 'Deactivate'
    select: 'Select'
    unselect: 'Unselect'
    label: 'Label'
    unlabel: 'Unlabel'
    shelve: 'Shelve'
    hide: 'Hide'
    discard: 'Discard'
    undiscard: 'Retrieve'
    pin: 'Pin'
    unpin: 'Unpin'
    unpinned: 'Unpinned'
    blank_verb: 'VERB'
    blank_noun: 'SET/SELECTION'

class OntoViz extends Huviz #OntologicallyGrounded
  HHH: # hardcoded hierarchy hints, kv pairs of subClass to superClass
    ObjectProperty: 'Thing'
    Class: 'Thing'
    SymmetricProperty: 'ObjectProperty'
    IrreflexiveProperty: 'ObjectProperty'
    AsymmetricProperty: 'ObjectProperty'

  ontoviz_type_to_hier_map:
    RDF_type: "classes"
    OWL_ObjectProperty: "properties"
    OWL_Class: "classes"

  use_lid_as_node_name: true
  snippet_count_on_edge_labels: false

  DEPRECATED_try_to_set_node_type: (node,type) ->
    # FIXME incorporate into ontoviz_type_to_hier_map
    #
    if type.match(/Property$/)
      node.type = 'properties'
    else if type.match(/Class$/)
      node.type = 'classes'
    else
      console.log(node.id+".type is", type)
      return false
    console.log("try_to_set_node_type", node.id, "=====", node.type)
    return true

  # first, rest and members are produced by GreenTurtle regarding the AllDisjointClasses list
  predicates_to_ignore: ["anything", "comment", "first", "rest", "members"]

class Socrata extends Huviz
  ###
  # Inspired by https://data.edmonton.ca/
  #             https://data.edmonton.ca/api/views{,.json,.rdf,...}
  #
  ###
  categories = {}
  ensure_category: (category_name) ->
    cat_id = category_name.replace /\w/, '_'
    if @categories[category_id]?
      @categories[category_id] = category_name
      @assert_name category_id,category_name
      @assert_instanceOf category_id,DC_subject
    return cat_id

  assert_name: (uri,name,g) ->
    name = name.replace(/^\s+|\s+$/g, '')
    @add_quad
      s: uri
      p: RDFS_label
      o:
        type: RDF_literal
        value: stripped_name

  assert_instanceOf: (inst,clss,g) ->
    @add_quad
      s: inst
      p: RDF_a
      o:
        type: RDF_object
        value: clss

  assert_propertyValue: (sub_uri,pred_uri,literal) ->
    console.log("assert_propertyValue", arguments)
    @add_quad
      s: subj_uri
      p: pred_uri
      o:
        type: RDF_literal
        value: literal

  assert_relation: (subj_uri,pred_uri,obj_uri) ->
    console.log("assert_relation", arguments)
    @add_quad
      s: subj_uri
      p: pred_uri
      o:
        type: RDF_object
        value: obj_uri

  parseAndShowJSON: (data) =>
    console.log("parseAndShowJSON",data)
    g = @DEFAULT_CONTEXT

    #  https://data.edmonton.ca/api/views/sthd-gad4/rows.json

    for dataset in data
      #dataset_uri = "https://data.edmonton.ca/api/views/#{dataset.id}/"
      console.log(@dataset_uri)
      q =
        g: g
        s: dataset_uri
        p: RDF_a
        o:
          type: RDF_literal
          value: 'dataset'
      console.log(q)
      @add_quad(q)
      for k,v of dataset
        if not is_on_of(k,['category','name','id']) # ,'displayType'
          continue
        q =
          g: g
          s: dataset_uri
          p: k
          o:
            type:  RDF_literal
            value: v
        if k == 'category'
          cat_id = @ensure_category(v)
          @assert_instanceOf(dataset_uri, OWL_Class)
          continue
        if k == 'name'
          assert_propertyValue dataset_uri, RDFS_label, v
          continue
        continue

        if typeof v == 'object'
          continue
        if k is 'name'
          console.log(dataset.id, v)
        #console.log k,typeof v
        @add_quad(q)
        #console.log q

class PickOrProvide
  tmpl: """
	<form id="UID" class="pick_or_provide_form" method="post" action="" enctype="multipart/form-data">
    <span class="pick_or_provide_label">REPLACE_WITH_LABEL</span>
    <select name="pick_or_provide"></select>
    <button type="button" class="delete_option">⌫</button>
  </form>
  """
  uri_file_loader_sel: '.uri_file_loader_form'

  constructor: (@huviz, @append_to_sel, @label, @css_class, @isOntology) ->
    @uniq_id = unique_id()
    @select_id = unique_id()
    @pickable_uid = unique_id()
    @your_own_uid = unique_id()
    @find_or_append_form()
    @drag_and_drop_loader = new DragAndDropLoader(@huviz, @append_to_sel, @)
    @drag_and_drop_loader.form.hide()
    #@add_group({label: "-- Pick #{@label} --", id: @pickable_uid})
    @add_group({label: "Your Own", id: @your_own_uid}, 'append')
    @add_option({label: "Provide New #{@label} ...", value: 'provide'}, @select_id)
    @add_option({label: "Pick or Provide...", canDelete: false}, @select_id, 'prepend')
    @

  val: (val) ->
    console.log("#{@label}.val(#{val})")
    @pick_or_provide_select.val(val)
    #@pick_or_provide_select.change()
    #@value = val
    @refresh()

  add_uri: (uri_or_rec) =>
    if typeof uri_or_rec is 'string'
      uri = uri_or_rec
      dataset_rec = {}
    else
      dataset_rec = uri_or_rec
    dataset_rec.uri ?= uri
    dataset_rec.isOntology ?= @isOntology
    dataset_rec.time ?= new Date().toString()
    dataset_rec.isUri ?= true
    dataset_rec.title ?= dataset_rec.uri
    dataset_rec.canDelete ?= not not dataset_rec.time?
    dataset_rec.label ?= dataset_rec.uri.split('/').reverse()[0]
    @add_dataset(dataset_rec)
    @update_state()

  add_dataset: (dataset_rec) ->
    uri = dataset_rec.uri
    #dataset_rec.uri ?= uri.split('/').reverse()[0]
    @huviz.add_dataset_to_db(dataset_rec, @add_dataset_option)

  add_dataset_option: (dataset) => # TODO rename to dataset_rec
    uri = dataset.uri
    dataset.value = dataset.uri
    @add_option(dataset, @pickable_uid)
    @pick_or_provide_select.val(uri)
    @refresh()

  add_group: (grp_rec, which) ->
    which ?= 'append'
    optgroup_str = """<optgroup label="#{grp_rec.label}" id="#{grp_rec.id or unique_id()}"></optgroup>"""
    if which is 'prepend'
      optgrp = @pick_or_provide_select.prepend(optgroup_str)
    else
      optgrp = @pick_or_provide_select.append(optgroup_str)

  add_option: (opt_rec, parent_uid, pre_or_append) ->
    pre_or_append = 'append'
    if not opt_rec.label?
      console.log("missing .label on", opt_rec)
    if @pick_or_provide_select.find("option[value='#{opt_rec.value}']").length
      # alert "add_option() #{opt_rec.value} collided"
      return
    opt_str = """<option id="#{unique_id()}"></option>"""
    opt = $(opt_str)
    opt_group_label = opt_rec.opt_group
    if opt_group_label
      opt_group = @pick_or_provide_select.find(" optgroup[label='#{opt_group_label}']")
      console.log(opt_group_label, opt_group.length, opt_group)
      if not opt_group.length
        @add_group({label: opt_group_label}, 'prepend')
        # opt_group = $('<optgroup></optgroup>')
        # opt_group.attr('label', opt_group_label)
        # @pick_or_provide_select.append(opt_group)
      opt_group.append(opt)
    else
      if pre_or_append is 'append'
        $("##{parent_uid}").append(opt)
      else
        $("##{parent_uid}").prepend(opt)
    for k in ['value', 'title', 'class', 'id', 'style', 'label']
      if opt_rec[k]?
        $(opt).attr(k, opt_rec[k])
    for k in ['isUri', 'canDelete']
      if opt_rec[k]?
        $(opt).data(k, opt_rec[k])

  update_state: (callback) ->
    raw_value = @pick_or_provide_select.val()
    selected_option = @get_selected_option()
    the_options = @pick_or_provide_select.find("option")
    kid_cnt = the_options.length
    console.log("#{@label}.update_state() raw_value: #{raw_value} kid_cnt: #{kid_cnt}")
    #console.log "PickOrProvide:", @, "select:", @pick_or_provide_select[0].value
    if raw_value is 'provide'
      @drag_and_drop_loader.form.show()
      @state = 'awaiting_dnd'
      @value = undefined
    else
      @drag_and_drop_loader.form.hide()
      @state = 'has_value'
      @value = raw_value
    disable_the_delete_button = true
    if @value?
      canDelete = selected_option.data('canDelete')
      disable_the_delete_button = not canDelete

    # disable_the_delete_button = false  # uncomment to always show the delete button -- useful when bad data stored
    @form.find('.delete_option').prop('disabled', disable_the_delete_button)
    if callback?
      console.log("calling callback")
      callback()

  find_or_append_form: ->
    if not $(@local_file_form_sel).length
      $(@append_to_sel).append(@tmpl.replace('REPLACE_WITH_LABEL', @label).replace('UID',@uniq_id))
    @form = $("##{@uniq_id}")
    @pick_or_provide_select = @form.find("select[name='pick_or_provide']")
    @pick_or_provide_select.attr('id',@select_id)
    console.debug @css_class,@pick_or_provide_select
    @pick_or_provide_select.change (e) =>
      #e.stopPropagation()
      console.info("#{@label} CHANGE", e)
      @refresh()

    @delete_option_button = @form.find('.delete_option')
    @delete_option_button.click @delete_selected_option
    @form.find('.delete_option').prop('disabled', true) # disabled initially
    console.info "form", @form

  get_selected_option: =>
    @pick_or_provide_select.find('option:selected') # just one CAN be selected

  delete_selected_option: (e) =>
    e.stopPropagation()
    selected_option = @get_selected_option()
    val = selected_option.attr('value')
    if val?
      @huviz.remove_dataset_from_db(@value)
      @delete_option(selected_option)
      @update_state()
      #  @value = null

  delete_option: (opt_elem) ->
    uri = opt_elem.attr('value')
    @huviz.remove_dataset_from_db(uri)
    opt_elem.remove()
    @huviz.update_dataset_ontology_loader()

  refresh: ->
    @update_state(@huviz.update_dataset_ontology_loader)

# inspiration: https://css-tricks.com/drag-and-drop-file-uploading/
class DragAndDropLoader
  tmpl: """
	<form class="local_file_form" method="post" action="" enctype="multipart/form-data">
	  <div class="box__input">
	    <input class="box__file" type="file" name="files[]" id="file" data-multiple-caption="{count} files selected" multiple />
	    <label for="file"><span class="box__label">Choose a local file</span></label>
	    <button class="box__upload_button" type="submit">Upload</button>
      <div class="box__dragndrop" style="display:none"> Drop URL or file here</div>
	  </div>
	  <div class="box__uploading" style="display:none">Uploading&hellip;</div>
	  <div class="box__success" style="display:none">Done!</div>
	  <div class="box__error" style="display:none">Error! <span></span>.</div>
  </form>
  """

  constructor: (@huviz, @append_to_sel, @picker) ->
    @local_file_form_id = unique_id()
    @local_file_form_sel = "##{@local_file_form_id}"
    @find_or_append_form()
    if @supports_file_dnd()
      @form.show()
      @form.addClass('supports-dnd')
      @form.find(".box__dragndrop").show()
  supports_file_dnd: ->
    div = document.createElement('div')
    return true
    return (div.draggable or div.ondragstart) and ( div.ondrop ) and (window.FormData and window.FileReader)
  load_uri: (firstUri) ->
    @form.find('.box__success').text(firstUri)
    @form.find('.box__success').show()
    @picker.add_uri({uri: firstUri, opt_group: 'Your Own'})
    @form.hide()
    return true # ie success
  load_file: (firstFile) ->
    @form.find('.box__success').text(firstFile.name)
    @form.find('.box__success').show()
    reader = new FileReader()
    reader.onload = (evt) =>
      #console.log evt.target.result
      console.log("evt", evt)
      try
        @huviz.read_data_and_show(firstFile.name, evt.target.result)
      catch e
        msg = e.toString()
        @form.find('.box__error').show()
        @form.find('.box__error').text(msg)
    reader.readAsText(firstFile)
    return true # ie success
  find_or_append_form: ->
    num_dnd_form = $(@local_file_form_sel).length
    if not num_dnd_form
      elem = $(@tmpl)
      $(@append_to_sel).append(elem)
      elem.attr('id', @local_file_form_id)
    @form = $(@local_file_form_sel)
    @form.on 'drag dragstart dragend dragover dragenter dragleave drop', (e) =>
      #console.clear()
      e.preventDefault()
      e.stopPropagation()
    @form.on 'dragover dragenter', () =>
      @form.addClass('is-dragover')
      console.log("addClass('is-dragover')")
    @form.on 'dragleave dragend drop', () =>
      @form.removeClass('is-dragover')
    @form.on 'drop', (e) =>
      @form.find('.box__input').hide()
      droppedUris = e.originalEvent.dataTransfer.getData("text/uri-list").split("\n")
      console.log("droppedUris",droppedUris)
      firstUri = droppedUris[0]
      if firstUri.length
        if @load_uri(firstUri)
          @form.find(".box__success").text('')
          @picker.refresh()
          @form.hide()
          return

      droppedFiles = e.originalEvent.dataTransfer.files
      console.log("droppedFiles", droppedFiles)
      if droppedFiles.length
        firstFile = droppedFiles[0]
        if @load_file(firstFile)
          @form.find(".box__success").text('')
          @form.hide()
          @picker.refresh()
          return

      # the drop operation failed to result in loaded data, so show 'drop here' msg
      @form.find('.box__input').show()
      @picker.refresh()

(exports ? this).Huviz = Huviz
(exports ? this).Orlando = Orlando
(exports ? this).OntoViz = OntoViz
#(exports ? this).Socrata = Socrata
(exports ? this).Edge = Edge
