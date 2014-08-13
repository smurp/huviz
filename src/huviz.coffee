
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
# ISSUES:
#   4) TASK: Suppress all but the 6-letter id of writers in the cmd cli
#  12) Graph layout of a single writer and peripheral nodes is not
#      a simple flower, suggesting either that the shelf is exerting
#      force or that an inappropriate combination of charge and link
#      distance is occuring.
#  13) Sometimes lines are drawn over one another, this seems to occur
#      when two edges with the same contextId (ie xml structural id) exist
#  14) TASK: it takes time for clicks on the predicate picker to finish;
#      showing a busy cursor or a special state for the picked div
#      would help the user have faith.
#      (Investigate possible inefficiencies, too.)
#  15) TASK: collapse edges to one-per-color (width for number?)
#  16) TASK: click edge to show snippet
#  17) TASK: incorporate ontology to drive predicate nesting
#  18) TASK: drop a node on another node to draw their mutual edges only
#  19) TASK: progressive documentation (context sensitive tips and intros)
#  22) TASK: summarize picked_set succinctly in english version of cmd
#            eg  writers but atwoma
#       Current command shows redundant mix of nodeclasses and node ids
#  23) TASK: discipline consequence of clicking a picker div:
#            strict cycle:  someShown -> allShown -> noneShown
#  25) TASK: show busy pointer when slow operations are happening, maybe
#      prevent starting operations when slow stuff is underway
#  26) boot script should perhaps be "choose writer." or some reasonable set
#  27) make picking 'anything' (abstract predicates) do the right things
#  30) TASK: Stop passing (node, change, old_node_status, new_node_status) to
#      Taxon.update_state() because it never seems to be needed
#  32) TASK: make a settings controller for picked_mag
#  33) TASK: make a factory for the settings (so they're software generated)
#  34) TASK: make a settings controller for whether pinning is enabled
#  35) TASK: get rid of jquery
#  36) TASK: figure out UX to trigger snippet display and
#            figure out UX for print / redact if still useful
#  37) TASK: fix Bronte names, ie unicode
# 
#asyncLoop = require('asynchronizer').asyncLoop

CommandController = require('gclui').CommandController
Edge = require('edge').Edge
GraphCommandLanguageCtrl = require('graphcommandlanguage').GraphCommandLanguageCtrl
GreenerTurtle = require('greenerturtle').GreenerTurtle
Node = require('node').Node
Predicate = require('predicate').Predicate
TaxonAbstract = require('taxonabstract').TaxonAbstract
Taxon = require('taxon').Taxon

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

# http://dublincore.org/documents/dcmi-terms/
DC_subject  = "http://purl.org/dc/terms/subject"

FOAF_Group  = "http://xmlns.com/foaf/0.1/Group"
FOAF_Person = "http://xmlns.com/foaf/0.1/Person"
FOAF_name   = "http://xmlns.com/foaf/0.1/name"
OWL_Class   = "http://www.w3.org/2002/07/owl#Class"
OWL_ObjectProperty = "http://www.w3.org/2002/07/owl#ObjectProperty"
RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
RDF_object  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
RDF_type    = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
RDF_a       = 'a'
RDFS_label  = "http://www.w3.org/2000/01/rdf-schema#label"
TYPE_SYNS   = [RDF_type,RDF_a,'rdf:type']
NAME_SYNS   = [FOAF_name,RDFS_label,'name']

uri_to_js_id = (uri) ->
  uri.match(/([\w\d\_\-]+)$/g)[0]

XML_TAG_REGEX = /(<([^>]+)>)/ig
MANY_SPACES_REGEX = /\s{2,}/g
UNDEFINED = undefined
start_with_http = new RegExp("http", "ig")
ids_to_show = start_with_http

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
    
  
class Huviz
  class_list: [] # FIXME remove
  HHH: {}
  edges_by_id: {}
  edge_count: 0
  snippet_db: {}
  #class_set: SortedSet().sort_on("id").named("all")
  class_index: {}
  #hierarchy: {'everything': ['EveryThing', {}]}
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
  label_all_graphed_nodes: false
  verbose: true
  verbosity: 0
  TEMP: 5
  COARSE: 10
  MODERATE: 20
  DEBUG: 40
  DUMP: false
  node_radius_policy: undefined
  draw_circle_around_focused: false
  draw_lariat_labels_rotated: true
  run_force_after_mouseup_msec: 2000
  nodes_pinnable: true

  BLANK_HACK: false
  width: undefined
  height: 0
  cx: 0
  cy: 0

  edge_width: 1
  focused_mag: 1.4
  label_em: .7  
  line_length_min: 4
  link_distance: 20
  charge: -30
  gravity: 0.3
  swayfrac: .12
  label_show_range: null # @link_distance * 1.1
  graph_radius: 100
  shelf_radius: 0.9
  discard_radius: 200
  fisheye_radius: 100 #null # label_show_range * 5
  fisheye_zoom: 4.0
  picked_mag:  1.2
  focus_radius: null # label_show_range
  drag_dist_threshold: 5
  dragging: false
  last_status: undefined

  my_graph: 
    predicates: {}
    subjects: {}
    objects: {}

  # required by green turtle, should be retired
  G: {}
  id2n: {}
  id2u: {}

  search_regex: new RegExp("^$", "ig")
  node_radius: .5

  mousedown_point: false
  discard_center: [0,0]
  lariat_center: [0,0]
  last_mouse_pos: [ 0, 0]

  predicates =
    name: 'edges'
    children: [
      {name: 'a'},
      {name: 'b'},
      {name: 'c'},      
      ]

  ensure_predicate: (p_name) ->
    for pobj in predicates.children
      if pobj.name is p_name
        break
    predicates.children.push
      name: p_name
      children: []

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

  mousemove: =>
    d3_event = @mouse_receiver[0][0]
    #console.log('mousemove',this,d3_event)
    @last_mouse_pos = d3.mouse(d3_event)
    # || focused_node.state == discarded_set
    if not @dragging and @mousedown_point and @focused_node and
        distance(@last_mouse_pos, @mousedown_point) > @drag_dist_threshold
      # We can only know that the users intention is to drag
      # a node once sufficient motion has started, when there
      # is a focused_node
      console.log "state_name == '" + @focused_node.state.state_name + "' and picked? == " + @focused_node.picked?
      console.log "START_DRAG: \n  dragging",@dragging,"\n  mousedown_point:",@mousedown_point,"\n  @focused_node:",@focused_node
      @dragging = @focused_node
      if @dragging.state isnt @graphed_set
        console.log "graphed_set.acquire()"
        @graphed_set.acquire(@dragging)
    if @dragging
      @force.resume() # why?
      @move_node_to_point @dragging, @last_mouse_pos
    #@cursor.attr "transform", "translate(" + @last_mouse_pos + ")"
    @tick()
    
  mousedown: =>
    #console.log 'mousedown'
    d3_event = @mouse_receiver[0][0]    
    @mousedown_point = d3.mouse(d3_event)
    @last_mouse_pos = @mousedown_point

  mouseup: =>
    #console.log 'mouseup', @dragging or "not", "dragging"
    d3_event = @mouse_receiver[0][0]    
    @mousedown_point = false
    point = d3.mouse(d3_event)

    # if something was being dragged then handle the drop
    if @dragging
      #console.log "STOPPING_DRAG: \n  dragging",@dragging,"\n  mousedown_point:",@mousedown_point,"\n  @focused_node:",@focused_node
      @move_node_to_point @dragging, point
      if @in_discard_dropzone(@dragging)
        @run_verb_on_object 'discard', @dragging
      else if @in_disconnect_dropzone(@dragging)
        @run_verb_on_object 'shelve', @dragging
        # @unpick(@dragging) # this might be confusing
      else if @dragging.links_shown.length == 0
        @run_verb_on_object 'choose', @dragging
        @pick(@dragging)
      else if @nodes_pinnable
        @dragging.fixed = not @dragging.fixed
      @dragging = false
      return

    # if this was a click on a pinned node then unpin it
    if @nodes_pinnable and @focused_node and
        @focused_node.fixed and @focused_node.state is @graphed_set
      @focused_node.fixed = false

    # this is the node being clicked
    if @focused_node # and @focused_node.state is @graphed_set
      @perform_current_command(@focused_node)
      #@toggle_picked(@focused_node)
      @tick()
      return

    # it was a drag, not a click
    drag_dist = distance(point, @mousedown_point)
    #if drag_dist > @drag_dist_threshold
    #  console.log "drag detection probably bugged",point,@mousedown_point,drag_dist
    #  return

    if @focused_node
      unless @focused_node.state is @graphed_set
        @run_verb_on_object 'choose',@focused_node
        #@run_verb_on_object 'print',@focused_node        
      else if @focused_node.showing_links is "all"
        #@run_verb_on_object 'shelve',@focused_node
        @run_verb_on_object 'print',@focused_node
      else
        @run_verb_on_object 'choose',@focused_node        

      # TODO(smurp) are these still needed?
      @force.links @links_set
      @restart()

  perform_current_command: (node) ->
    if @gclui.ready_to_perform()
      cmd = new gcl.GraphCommand
        verbs: @gclui.engaged_verbs
        subjects: [node]
      @show_state_msg(cmd.as_msg())
      @gclc.run cmd
      @hide_state_msg()
      @gclui.push_command cmd
    else
      @toggle_picked(node)

  #///////////////////////////////////////////////////////////////////////////
  # resize-svg-when-window-is-resized-in-d3-js
  #   http://stackoverflow.com/questions/16265123/
  updateWindow: =>
    @get_window_width()
    @get_window_height()
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
    #alert "draw_line should never be called"
    #throw new Error "WTF"
    @ctx.strokeStyle = clr or red
    @ctx.beginPath()
    @ctx.moveTo x1, y1
    @ctx.lineTo x2, y2
    @ctx.closePath()
    @ctx.stroke()
  draw_curvedline: (x1, y1, x2, y2, sway_inc, clr) ->
    pdist = distance([x1,y1],[x2,y2])
    sway = @swayfrac * sway_inc * pdist
    if pdist < @line_length_min
      return
    if sway is 0
      return
    # sway is the distance to offset the control point from the midline
    orig_angle = Math.atan2(x2 - x1, y2 - y1)
    ctrl_angle = (orig_angle + (Math.PI / 2))
    # console.log "orig",orig_angle
    # console.log "ctrl",ctrl_angle    
    ang = ctrl_angle
    ang = orig_angle
    #show_range ->
    #  console.log("RANGE",window.max_ang,window.min_ang)
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
    #console.log [x1,y1],[xctrl,yctrl],[x2,y2]
    @ctx.strokeStyle = clr or red
    @ctx.beginPath()
    @ctx.moveTo x1, y1
    @ctx.quadraticCurveTo xctrl, yctrl, x2, y2
    #@ctx.closePath()
    @ctx.stroke()
    #@draw_line(xmid,ymid,xctrl,yctrl,clr) # show mid to ctrl
    #console.log(xmid,ymid,xctrl,yctrl,clr)
  draw_disconnect_dropzone: ->
    @ctx.save()
    @ctx.lineWidth = @graph_radius * 0.1
    @draw_circle @lariat_center[0], @lariat_center[1], @graph_radius, "lightgreen"
    @ctx.restore()
  draw_discard_dropzone: ->
    @ctx.save()
    @ctx.lineWidth = @discard_radius * 0.1
    @draw_circle @discard_center[0], @discard_center[1], @discard_radius, "", "salmon"
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
    @id2n = {} # TODO(smurp): remove?
    #  states: graphed,shelved,discarded,hidden,embryonic
    #  embryonic: incomplete, not ready to be used
    #  graphed: in the graph, connected to other nodes
    #	 shelved: on the shelf, available for choosing
    #	 discarded: in the discard zone, findable but ignored by show_links_*
    #	 hidden: findable, but not displayed anywhere
    #              	 (when found, will become shelved)
    #  FIXME consider adding the pinned_set
    @nodes = SortedSet().sort_on("id").named("All")
    @nodes.docs = "All Nodes are in this set, regardless of state"

    @embryonic_set = SortedSet().sort_on("id").named("embryo").isFlag()
    @embryonic_set.docs = "Nodes which are not yet complete are 'embryonic' and not yet in 'nodes'."

    @chosen_set = SortedSet().named("chosen").isFlag().sort_on("id")
    @chosen_set.docs = "Nodes which the user has individually 'chosen' to graph by clicking or dragging them."
    @chosen_set.comment = "This concept should perhaps be retired now that picked_set is being maintainted."

    @picked_set = SortedSet().named("picked").isFlag().sort_on("id")
    @picked_set.docs = "Nodes which have been 'picked' using the class picker ie which are highlighted."

    @shelved_set  = SortedSet().sort_on("name").named("shelved").isState()
    @shelved_set.docs = "Nodes which are on the surrounding 'shelf'."

    @discarded_set = SortedSet().sort_on("name").named("discarded").isState()
    @discarded_set.docs = "Nodes which have been discarded so they will not be included in graphs." +
    
    @hidden_set    = SortedSet().sort_on("id").named("hidden").isState()
    @hidden_set.docs = "Nodes which are invisible but can be pulled into graphs by other nodes."
    
    @graphed_set   = SortedSet().sort_on("id").named("graphed").isState()
    @graphed_set.docs = "Nodes which are included in the central graph."

    @links_set     = SortedSet().sort_on("id").named("shown").isFlag()
    @links_set.docs = "Links which are shown."
    
    @labelled_set  = SortedSet().named("labelled").isFlag().sort_on("id")
    @labelled_set.docs = "Nodes which have their labels permanently shown."

    @predicate_set = SortedSet().named("predicate").isFlag().sort_on("id")
    @context_set   = SortedSet().named("context").isFlag().sort_on("id")
    @context_set.docs = "The set of quad contexts."

    @pickable_sets =
      # nodes: @nodes # FIXME reenable after fixing payload position
      chosen_set: @chosen_set
      picked_set: @picked_set
      shelved_set: @shelved_set
      discarded_set: @discarded_set
      hidden_set: @hidden_set
      graphed_set: @graphed_set
      labelled_set: @labelled_set
      # FIXME consider adding labelled_set
            
    @create_taxonomy()

  update_all_counts: ->
    for name, a_set of @pickable_sets
      @gclui.on_set_count_update(name, a_set.length)

  create_taxonomy: ->
    @taxonomy = {}  # make driven by the hierarchy

  get_or_create_taxon: (taxon_id,abstract) ->
    if not @taxonomy[taxon_id]?
      if abstract
        taxon = new TaxonAbstract(taxon_id)
        @gclui.taxon_picker.set_abstract(taxon_id) # OMG
      else
        taxon = new Taxon(taxon_id)
      @taxonomy[taxon_id] = taxon
      parent_lid = @HHH[taxon_id]
      if parent_lid?
        parent = @get_or_create_taxon(parent_lid, true)
        parent.register(taxon)
      @gclui.add_newnodeclass(taxon_id,parent_lid) # FIXME should this be an event on the Taxon constructor?
    @taxonomy[taxon_id]
    
  reset_graph: ->
    @G = {} # is this deprecated?
    @init_sets()
    @init_gclc()
    @force.nodes @nodes
    d3.select(".link").remove()
    d3.select(".node").remove()
    d3.select(".lariat").remove()
    
    #nodes = force.nodes();
    #links = force.links();
    @node = @svg.selectAll(".node")
    @link = @svg.selectAll(".link")
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
    @node_radius * (not d.picked? and 1 or @picked_mag)
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

  find_focused_node: ->
    return if @dragging
    new_focused_node = undefined
    new_focused_idx = undefined
    focus_threshold = @focus_radius * 3
    closest = @width
    closest_point = undefined
    @nodes.forEach (d, i) =>
      dist = distance(d.fisheye or d, @last_mouse_pos)
      if dist < closest
        closest = dist
        closest_point = d.fisheye or d
      if dist <= focus_threshold
        new_focused_node = d
        focus_threshold = dist
        new_focused_idx = i
    
    @draw_circle closest_point.x, closest_point.y, @focus_radius, "red"  if @draw_circle_around_focused
    msg = focus_threshold + " <> " + closest
    @status = $("#status")
    #status.text(msg);
    unless @focused_node is new_focused_node
      if @focused_node
        d3.select(".focused_node").classed "focused_node", false  if @use_svg
        @focused_node.focused_node = false
      if new_focused_node
        new_focused_node.focused_node = true
        if @use_svg
          svg_node = node[0][new_focused_idx]
          d3.select(svg_node).classed "focused_node", true
        @dump_details new_focused_node
    @focused_node = new_focused_node # possibly null
    @adjust_cursor()

  showing_links_to_cursor_map:
    all: 'not-allowed'
    some: 'all-scroll'
    none: 'pointer'
    
  adjust_cursor: ->
    # http://css-tricks.com/almanac/properties/c/cursor/
    if @focused_node
      next = @showing_links_to_cursor_map[@focused_node.showing_links]
    else
      next = 'default'
    $("body").css "cursor", next

  position_nodes: ->
    n_nodes = @nodes.length or 0
    @nodes.forEach (node, i) =>
      @move_node_to_point node, @last_mouse_pos if @dragging is node
      return unless @graphed_set.has(node)
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

  draw_edges_from: (node) ->
    num_edges = node.links_from.length
    return unless num_edges

    draw_n_n = {}
    for e in node.links_shown
      return unless e.source is node # show only links_from
      if e.source.embryo
        console.log "source",e.source.name,"is embryo",e.source.id
        return
      if e.target.embryo
        console.log "target",e.target.name,"is embryo",e.target.id
        return
      n_n = e.source.lid + " " + e.target.lid
      if not draw_n_n[n_n]?
        draw_n_n[n_n] = []
      draw_n_n[n_n].push(e)

    #dump_and_throw = n_n.match(/barban/) and false
    for n_n, edges_between of draw_n_n
      sway = 1
      for e in edges_between
        #if dump_and_throw
        #  console.info "dump_and_throw",e
        @draw_curvedline e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, sway, e.color, e.contexts.length
        sway++
      #if dump_and_throw
      #  throw "give that a gander"

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
                     node.color or "yellow", node.color or "black")
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
          @draw_circle(d.fisheye.x, d.fisheye.y,
                       @calc_node_radius(d),
                       d.color or "yellow", d.color or "black")
        if @use_webgl
          @mv_node(d.gl, d.fisheye.x, d.fisheye.y)
  should_show_label: (node) ->
    (node.labelled or
        dist_lt(@last_mouse_pos, node, @label_show_range) or
        node.name.match(@search_regex) or
        @label_all_graphed_nodes and node.graphed?)
  draw_labels: ->
    if @use_svg
      label.attr "style", (d) ->
        if @should_show_label(d)
          ""
        else
          "display:none"
    if @use_canvas or @use_webgl
      #http://stackoverflow.com/questions/3167928/drawing-rotated-text-on-a-html5-canvas
      # http://diveintohtml5.info/canvas.html#text
      # http://stackoverflow.com/a/10337796/1234699
      focused_font_size = @label_em * @focused_mag
      focused_font = "#{focused_font_size}em sans-serif"
      unfocused_font = "#{@label_em}em sans-serif"
      #console.log focused_font,unfocused_font
      label_node = (node) =>
        return unless @should_show_label(node)
        if node.focused_node
          @ctx.fillStyle = node.color
          @ctx.font = focused_font
        else
          @ctx.fillStyle = "black"
          @ctx.font = unfocused_font
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
          @ctx.save()
          @ctx.translate node.fisheye.x, node.fisheye.y
          @ctx.rotate -1 * radians + Math.PI / 2
          @ctx.textAlign = textAlign
          @ctx.fillText "  " + node.name, 0, 0          
          @ctx.restore()
        else
          @ctx.fillText "  " + node.name, node.fisheye.x, node.fisheye.y
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
    @blank_screen()
    @draw_dropzones()
    @find_focused_node()
    @fisheye.focus @last_mouse_pos
    @show_last_mouse_pos()
    @position_nodes()
    @apply_fisheye()
    @draw_edges()
    @draw_nodes()
    @draw_shelf()
    @draw_discards()
    @draw_labels()

  msg_history: ""
  show_state_msg: (txt) ->
    #console.warn(txt)
    if false
      @msg_history += " " + txt
      txt = @msg_history
    @state_msg_box.show()
    @state_msg_box.html("<br><br>" + txt)  # FIXME: OMG CSS PDQ
    $("body").css "cursor", "wait"

  hide_state_msg: () ->
    #@show_state_msg(' * ')
    @state_msg_box.hide()
    $("body").css "cursor", "default"

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

  DEPRECATED_add_to: (itm, set) ->
    return add_to_array(itm, set, cmp_on_id)  if isArray(set)
    throw new Error "add_to() requires itm to have an .id"  if typeof itm.id is "undefined"
    found = set[itm.id]
    set[itm.id] = itm  unless found
    set[itm.id]

  DEPRECATED_remove_from: (doomed, set) ->
    throw new Error "remove_from() requires doomed to have an .id"  if typeof doomed.id is "undefined"
    return remove_from_array(doomed, set)  if isArray(set)
    delete set[doomed.id]  if set[doomed.id]
    set

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

  fire_newpredicate_event: (pred_id) ->
    window.dispatchEvent(
      new CustomEvent 'newpredicate',
        detail:
          sid: pred_id
          # time: new Date()
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
    #console.log(quad)
    sid = quad.s
    pid = @make_qname(quad.p)
    ctxid = quad.g || @DEFAULT_CONTEXT
    subj_lid = uri_to_js_id(sid)
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
          
    if not @my_graph.predicates[pid]?
      @my_graph.predicates[pid] = []
      @fire_newpredicate_event pid

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
      is_type = is_one_of(pid,TYPE_SYNS)
      if is_type
        if @try_to_set_node_type(subj_n,quad.o.value)
          @develop(subj_n) # might be ready now
      else
        edge = @get_or_create_Edge(subj_n,obj_n,pred_n,cntx_n)
        edge.register_context(cntx_n)
        edge.color = @gclui.predicate_picker.get_color_forId_byName(pred_n.lid,'showing')
        edge_e = @add_edge(edge)
        @develop(obj_n)

    else
      #if @same_as(pid,rdf_type)
      #  subj_n.type = quad.o.value
      if subj_n.embryo and is_one_of(pid,NAME_SYNS)
        subj_n.name = quad.o.value.replace(/^\s+|\s+$/g, '')
        @develop(subj_n) # might be ready now
      else
        subj.predicates[pid].objects.push(quad.o.value)

    ###
    try
      last_sid = @last_quad.s
    catch e
      last_sid = ""       
    if last_sid and last_sid isnt quad.s
      #if @last_quad
      @fire_nextsubject_event @last_quad,quad
    ###
    @last_quad = quad

  make_Edge_id: (subj_n, obj_n, pred_n) ->
    return (a.lid for a in [subj_n, pred_n, obj_n]).join(' ')

  get_or_create_Edge: (subj_n, obj_n, pred_n) ->
    edge_id = @make_Edge_id(subj_n, obj_n, pred_n)
    edge = @edges_by_id[edge_id]
    if not edge?
      @edge_count++
      edge = new Edge(subj_n,obj_n,pred_n)
      @edges_by_id[edge_id] = edge
    return edge    

  add_edge: (edge) ->
    if edge.id.match /Universal$/
      console.log "add",edge.id
    #@add_link(edge)
    #return edge
    # TODO(smurp) should .links_from and .links_to be SortedSets? Yes. Right?
    #   edge.source.links_from.add(edge)
    #   edge.target.links_to.add(edge)
    #console.log "add_edge",edge.id
    @add_to edge,edge.source.links_from
    @add_to edge,edge.target.links_to
    edge

  try_to_set_node_type: (node,type_uri) ->
    #console.info "try_to_set_node_type",type_uri,@class_list
    type_lid = uri_to_js_id(type_uri) # should ensure uniqueness
    #if not is_one_of(type_uri,@class_list)
    #  @class_list.push type_uri
    #  @hierarchy['everything'][1][type_lid] = [type_lid]
    node.type = type_lid
    return true

  parseAndShowTTLStreamer: (data, textStatus) =>
    # modelled on parseAndShowNQStreamer
    parse_start_time = new Date()
    context = "http://universal"
    if GreenerTurtle? and @turtle_parser is 'GreenerTurtle'
      @G = new GreenerTurtle().parse(data, "text/turtle")
      console.log "GreenTurtle"
    for subj_uri,frame of @G.subjects
      #console.log "frame:",frame
      #console.log frame.predicates
      for pred_id,pred of frame.predicates
        for obj in pred.objects
          # this is the right place to convert the ids (URIs) to CURIES
          #   Or should it be QNames?
          #      http://www.w3.org/TR/curie/#s_intro
          @add_quad
            s: frame.id
            p: pred.id
            o: obj # keys: type,value[,language]
            g: context
    @dump_stats()

  dump_stats: ->
    console.log "object_value_types:",@object_value_types    
    console.log "unique_pids:",@unique_pids
    
  parseAndShowTurtle: (data, textStatus) =>
    msg = "data was " + data.length + " bytes"
    parse_start_time = new Date()
    
    if GreenerTurtle? and @turtle_parser is 'GreenerTurtle'
      @G = new GreenerTurtle().parse(data, "text/turtle")
      console.log "GreenTurtle"
      
    else if @turtle_parser is 'N3'
      console.log "N3"
      #N3 = require('N3')
      console.log "n3",N3
      predicates = {}
      parser = N3.Parser()
      parser.parse data, (err,trip,pref) =>
        console.log trip
        if pref
          console.log pref
        if trip
          @add_quad trip
        else
          console.log err

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
    console.log msg  if @verbosity >= @COARSE
    show_start_time = new Date()
    @showGraph @G
    show_end_time = new Date()
    show_time = (show_end_time - show_start_time) / 1000
    msg += " and " + show_time + " sec to show"
    console.log msg  if @verbosity >= @COARSE
    $("body").css "cursor", "default"
    $("#status").text ""

  choose_everything: ->
    cmd = new gcl.GraphCommand
      verbs: ['choose']
      classes: ['everything']
    @gclc.run cmd
    @gclui.push_command cmd
    @tick()

  remove_framing_quotes: (s) -> s.replace(/^\"/,"").replace(/\"$/,"")
  parseAndShowNQStreamer: (uri) ->
    # turning a blob (data) into a stream
    #   http://stackoverflow.com/questions/4288759/asynchronous-for-cycle-in-javascript
    #   http://www.dustindiaz.com/async-method-queues/
    owl_type_map =
      uri:     RDF_object
      literal: RDF_literal
    worker = new Worker('js/xhr_readlines_worker.js')
    quad_count = 0
    worker.addEventListener 'message', (e) =>
      msg = null
      if e.data.event is 'line'
        quad_count++
        if quad_count % 100 is 0
          @show_state_msg("parsed quad " + quad_count)
        q = parseQuadLine(e.data.line)
        if q
          q.s = q.s.raw
          q.p = q.p.raw
          q.g = q.g.raw
          q.o = 
            type:  owl_type_map[q.o.type]
            value: @remove_framing_quotes(q.o.toString())
          @add_quad q
      else if e.data.event is 'start'
        msg = "starting to split "+uri
      else if e.data.event is 'finish'
        msg = "finished_splitting "+uri
        @show_state_msg("done loading")
        document.dispatchEvent(new CustomEvent("dataset-loaded", {detail: uri}))

        #@choose_everything()
        #@fire_nextsubject_event @last_quad,null
      else
        msg = "unrecognized NQ event:"+e.data.event
      if msg?
        console.log msg
        #alert msg
    worker.postMessage({uri:uri})

  DUMPER: (data) =>
    console.log data

  fetchAndShow: (url) ->
    @show_state_msg("fetching " + url)
    if url.match(/.ttl/)
      the_parser = @parseAndShowTurtle
      the_parser = @parseAndShowTTLStreamer
    else if url.match(/.nq/)
      the_parser = @parseAndShowNQ
      @parseAndShowNQStreamer(url)
      return
    else if url.match(/.json/)
      the_parser = @parseAndShowJSON
      #the_parser = @DUMPER
      
    $.ajax
      url: url
      success: the_parser
      error: (jqxhr, textStatus, errorThrown) ->
        console.log url, errorThrown
        $("#status").text errorThrown + " while fetching " + url

  # Deal with buggy situations where flashing the links on and off
  # fixes data structures.  Not currently needed.
  show_and_hide_links_from_node: (d) ->
    @show_links_from_node d
    @hide_links_from_node d

  # Should be refactored to be get_container_width
  get_window_width: (pad) ->
    pad = pad or hpad
    @width = (window.innerWidth or document.documentElement.clientWidth or document.clientWidth) - pad
    #console.log "get_window_width()",window.innerWidth,document.documentElement.clientWidth,document.clientWidth,"==>",@width

  # Should be refactored to be get_container_height
  get_window_height: (pad) ->
    pad = pad or hpad
    @height = (window.innerHeight or document.documentElement.clientHeight or document.clientHeight) - pad
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
        console.log pattern, "does not match!", node.name  if verbose
        return
      console.log func.call(node)  if func
      @dump_details node if not func or verbose

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

  remove_link: (e) ->
    return if @links_set.indexOf(e) is -1
    @remove_from e, e.source.links_shown
    @remove_from e, e.target.links_shown
    @links_set.remove e
    @update_showing_links e.source
    @update_showing_links e.target
    @update_state e.target
    @update_state e.source

  # FIXME it looks like incl_discards is not needed and could be removed
  show_link: (edge, incl_discards) ->
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

  get_or_create_predicate_by_id: (sid) ->
    obj_id = @make_qname(sid)
    obj_n = @predicate_set.get_by('id',obj_id)
    if not obj_n?
      obj_n = new Predicate(obj_id)
      #obj_n = {id:obj_id, lid:obj_id.match(/([\w\d\_\-]+)$/g)[0]} # lid means local id
      @predicate_set.add(obj_n)
    obj_n

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
      obj_n = new Node(obj_id)
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
    node.lid = uri_to_js_id(node.id) # FIXME ensure uniqueness
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

  toggle_label_display: ->
    @label_all_graphed_nodes = not @label_all_graphed_nodes
    @tick()

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
    @unlink goner
    @discarded_set.acquire goner
    shown = @update_showing_links goner
    @unpick goner
    #@update_state goner
    goner

  undiscard: (prodigal) ->  # TODO(smurp) rename command to 'retrieve' ????
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
    @chosen_set.remove goner
    @hide_node_links goner
    @shelved_set.acquire goner
    shownness = @update_showing_links goner
    if goner.links_shown.length > 0
      console.log "shelving failed for",goner
    goner

  choose: (chosen) =>
    # There is a flag .chosen in addition to the state 'linked'
    # because linked means it is in the graph
    #@pick chosen
    @chosen_set.add chosen
    @graphed_set.acquire chosen # do it early so add_link shows them otherwise choosing from discards just puts them on the shelf
    @show_links_from_node chosen
    @show_links_to_node chosen
    if chosen.links_shown
      @graphed_set.acquire chosen  # FIXME this duplication (see above) is fishy
      chosen.showing_links = "all"
    else
      # FIXME after this weird side effect, at the least we should not go on
      console.error(chosen.lid,"was found to have no links_shown so: @unlink_set.acquire(chosen)", chosen)
      @shelved_set.acquire chosen
    @update_state chosen
    shownness = @update_showing_links chosen
    chosen

  hide: (hidee) =>
    @chosen_set.remove hidee
    @hidden_set.acquire hidee
    @picked_set.remove hidee
    hidee.unpick()
    @hide_node_links hidee
    @update_state hidee
    shownness = @update_showing_links hidee


  #
  # The verbs PICK and UNPICK perhaps don't need to be exposed on the UI
  # but they perform the function of manipulating the @picked_set
  pick: (node) =>
    if not node.picked?
      @picked_set.add(node)
      node.pick()
      @recolor_node(node)

  unpick: (node) =>
    if node.picked?
      @picked_set.remove(node)
      node.unpick()
      @recolor_node(node)

  recolor_node: (node) ->
    state = node.picked? and "emphasizing" or "showing"
    node.color = @gclui.taxon_picker.get_color_forId_byName(node.type,state)

  recolor_nodes: () ->
    # The nodes needing recoloring are all but the embryonic.
    for node in @nodes
      @recolor_node(node)

  toggle_picked: (node) ->
    if node.picked?
      @unpick(node)
    else
      @pick(node)

  SNIPPET_SAFETY: false

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
      callback(null, {response:snippet_text})
    else
      #url = "http://localhost:9999/snippet/poetesses/b--balfcl--0--P--3/"
      #console.warn(url)
      d3.xhr(url, callback)
    return "got it"

  clear_snippets: () ->
    @currently_printed_snippets = {}
    if @snippet_box
      @snippet_box.html("")

  remove_tags: (xml) ->
    xml.replace(XML_TAG_REGEX, " ").replace(MANY_SPACES_REGEX, " ")
      
  # The Verbs PRINT and REDACT show and hide snippets respectively
  print: (node) =>
    @clear_snippets()
    for edge in node.links_shown
      for context in edge.contexts
        snippet_id = context.id
        snippet_js_key = @get_snippet_js_key(snippet_id)
        if @currently_printed_snippets[snippet_js_key]?
          continue # so there is no duplication
        @currently_printed_snippets[snippet_js_key] = edge

        @get_snippet snippet_id,(err,data) =>
          snippet_text = @remove_tags(data.response)
          @snippet_db[snippet_js_key] = snippet_text
          @push_snippet
            edge: edge
            pred_id: edge.predicate.lid
            pred_name: edge.predicate.name
            context_id: snippet_id
            snippet_text: snippet_text
    
  redact: (node) =>
    node.links_shown.forEach (edge,i) =>
      @remove_snippet edge.id

  show_edge_regarding: (node, predicate_lid) =>
    dirty = false
    doit = (edge,i,frOrTo) =>
      if edge.predicate.lid is predicate_lid
        console.log "  show_edge_regarding",frOrTo,predicate_lid
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
        console.log "  suppress_edge_regarding",predicate_lid,node.id
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
    @make_nodes g
    @fire_showgraph_event() if window.CustomEvent?
    @restart()

  show_the_edges: () ->
    #edge_controller.show_tree_in.call(arguments)

  register_gclc_prefixes: =>
    @gclc.prefixes = {}
    for abbr,prefix of @G.prefixes
      @gclc.prefixes[abbr] = prefix

  init_gclc: ->
    if gcl
      @gclc = new GraphCommandLanguageCtrl(this)
      @gclui = new CommandController(this,d3.select("#gclui")[0][0],@hierarchy)
      window.addEventListener 'showgraph', @register_gclc_prefixes
      window.addEventListener 'newpredicate', @gclui.handle_newpredicate
      TYPE_SYNS.forEach (pred_id,i) =>
        @gclui.ignore_predicate pred_id
      NAME_SYNS.forEach (pred_id,i) =>
        @gclui.ignore_predicate pred_id

  init_snippet_box: ->
    if d3.select('#snippet_box')[0].length > 0
      @snippet_box = d3.select('#snippet_box')
  remove_snippet: (snippet_id) ->
    key = @get_snippet_js_key(snippet_id)
    delete @currently_printed_snippets[key]
    if @snippet_box
      slctr = '#'+id_escape(snippet_id)
      console.log slctr
      @snippet_box.select(slctr).remove()
  push_snippet: (msg_or_obj) ->
    if @snippet_box
      snip_div = @snippet_box.append('div').attr('class','snippet')
      if typeof msg_or_obj is 'string'
        msg = msg_or_obj
      else
        m = msg_or_obj.toString()
      snip_div.html(msg)

  run_verb_on_object: (verb,subject) ->
    cmd = new gcl.GraphCommand
      verbs: [verb]
      subjects: [@get_handle subject]
    @show_state_msg(cmd.as_msg())
    @gclc.run cmd
    @hide_state_msg()
    @gclui.push_command cmd
    @update_all_counts() # FIXME consider gclui events calling run_verb_on_object

  get_handle: (thing) ->
    # A handle is like a weak reference, saveable, serializable
    # and garbage collectible.  It was motivated by the desire to
    # turn an actual node into a suitable member of the subjects list
    # on a GraphCommand
    return {id: thing.id, lid: thing.lid}

  populate_taxonomy: () ->
    
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
        
  constructor: ->
    @off_center = false # FIXME expose this or make the amount a slider
    @toggle_logging()
    @create_state_msg_box()
    document.addEventListener 'nextsubject', @onnextsubject
    #@reset_graph() # FIXME should it be a goal to make this first?
    @init_sets()    #   because these are the first two lines of reset_graph
    @init_gclc()   
    @populate_taxonomy()
    @init_snippet_box()
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
    @viscanvas = d3.select("#viscanvas").
      append("canvas").
      attr("width", @width).
      attr("height", @height)
    @canvas = @viscanvas[0][0]
    @mouse_receiver = @viscanvas
    @updateWindow()
    @ctx = @canvas.getContext("2d")
    @reset_graph()
    @cursor = @svg.append("circle").
                  attr("r", @label_show_range).
                  attr("transform", "translate(" + @cx + "," + @cy + ")").
                  attr("class", "cursor")
    the_Huviz = this
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

  update_fisheye: ->
    @label_show_range = @link_distance * 1.1
    #@fisheye_radius = @label_show_range * 5
    @focus_radius = @label_show_range
    @fisheye = d3.fisheye.
      circular().
      radius(@fisheye_radius).
      distortion(@fisheye_zoom)
    @force.linkDistance(@link_distance).gravity(@gravity)
    
  update_graph_settings: (target, update) =>
    update = not update? and true or update
    asNum = parseFloat(target.value)
    cooked_value = ('' + asNum) isnt 'NaN' and asNum or target.value
    @[target.name] = cooked_value
    if update
      @update_fisheye()
      @updateWindow()
      @tick()
    d3.select(target).attr("title", cooked_value)
  xpath_query: (xpath) ->
    document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null)
  init_from_graph_controls: ->
    # Perform update_graph_settings for everything in the form
    # so the HTML can be used as configuration file
    iterator = @xpath_query("//div[@class='graph_controls']//input")
    elems = []
    elem = iterator.iterateNext()
    while (elem) # materialize the iterator
      elems.push elem
      elem = iterator.iterateNext()
    for elem in elems # so we can modify them in a loop
      @update_graph_settings(elem, false)

  load_file: ->
    @show_state_msg("loading...")
    @init_from_graph_controls()
    @reset_graph()
    @data_uri = @get_dataset_uri()
    @show_state_msg @data_uri
    @fetchAndShow @data_uri  unless @G.subjects
    @init_webgl()  if @use_webgl

  get_dataset_uri: () ->
    # FIXME goodbye jquery
    return $("select.file_picker option:selected").val()

  get_script_from_hash: () ->
    script = location.hash
    script = (not script? or script is "#") and "" or script.replace(/^#/,"")
    script = script.replace(/\+/g," ")
    return script

  boot_sequence: ->
    # If there is a script after the hash, run it.
    # Otherwise load the default dataset defined by the page.
    # Or load nothing if there is no default.
    @init_from_graph_controls()
    @reset_graph()
    script = @get_script_from_hash()
    if script
      @gclui.run_script(script)
    else
      data_uri = @get_dataset_uri()
      if data_uri
        @load(data_uri)

  load: (data_uri) ->
    @fetchAndShow data_uri  unless @G.subjects
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
      if @data_uri?.match('poetesses|atwoma|relations')
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

  get_taxon_to_initially_pick: () ->
    return 'writer'

class Orlando extends Huviz
  # These are the Orlando specific methods layered on Huviz.
  # These ought to be made more data-driven.
  create_taxonomy: ->
    @taxonomy = {}  # make driven by the hierarchy
    #e = new AbstractTaxon('everything')
    #@taxonomy['everything'] = e

  populate_taxonomy: ->
  # use the hints or the HHH to build a hierarchy of AbstractTaxons and Taxons
  #  for nom in ['writers','people','others','orgs']
  #    @add_to_taxonomy(nom)

  get_taxon_to_initially_pick: () ->
    return 'writer'

  get_default_set_by_type: (node) ->
    if @is_big_data()
      if node.type in ['writer']
        return @shelved_set
      else
        return @hidden_set
    return @shelved_set

  HHH: # hardcoded hierarchy hints, kv pairs of child to parent
    human: 'everything'
    writer: 'human'
    Group: 'everything'
    Person: 'human'
    
  hints: { 'everything': ['Everything', {human: ['human', {writer: ['Writers'], Person: ['Person']}], Group: ['Group']}]}

  push_snippet: (msg_or_obj) ->
    if @snippet_box
      if typeof msg_or_obj isnt 'string'
        [msg_or_obj,m] = ["",msg_or_obj]  # swap them
        msg_or_obj = """
        <div id="#{id_escape(m.edge.id)}">
          <div>
            <span class="writername" style="background-color:#{m.edge.source.color}">
              <a target="SRC"
                 href="#{m.edge.source.id}">#{m.edge.source.name}</a>
            </span>
            —
            <span style="background-color:#{m.edge.color}">#{m.pred_id}</span>
            —
            <span style="background-color:#{m.edge.target.color}">#{m.edge.target.name}</span>
            <span class="close_snippet"></span>
          </div>
          <div id="#{m.context_id}">
            <p>
              <b>Text:</b> <i style="font-size:80%">#{m.context_id}</i>
            </p>
            <p>#{m.snippet_text}</p>
          </div>
        </div>

        """
        ## unconfuse emacs Coffee-mode: " """ ' '  "                      
        $('.close_snippet').on 'click', (evt) ->
          $(evt.target).parent().parent().remove()

      super(msg_or_obj) # fail back to super

class OntoViz extends Huviz
  constructor: ->
    super()
    #@gclui.taxon_picker.add('everything',null,'Everything!')

  HHH: # hardcoded hierarchy hints, kv pairs of child to parent
    ObjectProperty: 'everything'
    Class: 'everything'
    SymmetricProperty: 'everything'

  ontoviz_type_to_hier_map:
    RDF_type: "classes"
    OWL_ObjectProperty: "properties"
    OWL_Class: "classes"
  
  DEPRECATED_try_to_set_node_type: (node,type) ->
    # FIXME incorporate into ontoviz_type_to_hier_map
    # 
    if type.match(/Property$/)
      node.type = 'properties'
    else if type.match(/Class$/)
      node.type = 'classes'
    else
      console.log node.id+".type is",type
      return false
    console.log "try_to_set_node_type",node.id,"=====",node.type
    return true

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
    console.log "assert_propertyValue",arguments
    @add_quad
      s: subj_uri
      p: pred_uri
      o:
        type: RDF_literal
        value: literal 

  assert_relation: (subj_uri,pred_uri,obj_uri) ->
    console.log "assert_relation", arguments
    @add_quad
      s: subj_uri
      p: pred_uri
      o:
        type: RDF_object
        value: obj_uri
        
  parseAndShowJSON: (data) =>
    console.log("parseAndShowJSON",data)
    #g = @DEFAULT_CONTEXT

    #  https://data.edmonton.ca/api/views/sthd-gad4/rows.json

    for dataset in data
      #dataset_uri = "https://data.edmonton.ca/api/views/#{dataset.id}/"
      console.log dataset_uri
      q = 
        g: g
        s: dataset_uri
        p: RDF_a
        o:
          type: RDF_literal
          value: 'dataset'
      console.log q
      @add_quad q
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
          @assert_instanceOf dataset_uri,OWL_Class
          continue
        if k == 'name'
          assert_propertyValue dataset_uri, RDFS_label, v
          continue
        continue
        
        if typeof v == 'object'
          continue
        if k is 'name'
          console.log dataset.id,v
        #console.log k,typeof v
        @add_quad q
        #console.log q
        

if not is_one_of(2,[3,2,4])
  alert "is_one_of() fails"
  
#(typeof exports is 'undefined' and window or exports).Huviz = Huviz

(exports ? this).Huviz = Huviz
(exports ? this).Orlando = Orlando
(exports ? this).OntoViz = OntoViz
(exports ? this).Edge = Edge

