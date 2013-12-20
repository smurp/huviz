
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
#  Lariat -- around the graph, the rope of nodes which serves as reorderable menu
#  Hoosegow -- a jail to contain nodes one does not want to be bothered by
#
#  Commands on nodes
#     choose/shelve     -- graph or remove from graph
#     discard/retrieve    -- throw away or recover
#     label/unlabel       -- shows labels or hides them
#     substantiate/redact -- shows source text or hides it
#     expand/contract     -- show all links or collapse them
#
#  ToDo
#    flip labels
#    nquads parser (or trig?)  1 hr
#    edge-picker
gcl = require('graphcommandlanguage')
gclui = require('gclui')
gt = require('greenerturtle')
GreenerTurtle = gt.GreenerTurtle
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

class Huviz
  UNDEFINED = undefined
  start_with_http = new RegExp("http", "ig")
  ids_to_show = start_with_http
  
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

  FOAF_Group = "http://xmlns.com/foaf/0.1/Group"
  FOAF_name = "http://xmlns.com/foaf/0.1/name"
  RDF_Type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
  RDF_object = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
  has_type = (subject, typ) ->
    has_predicate_value subject, RDF_Type, typ

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
  nodes_pinnable: false

  BLANK_HACK: false
  width: undefined
  height: 0
  cx: 0
  cy: 0
  link_distance: 20
  charge: -30
  gravity: 0.3
  label_show_range: null # @link_distance * 1.1
  graph_radius: 100
  shelf_radius: 0.9
  discard_radius: 200
  fisheye_radius: null # label_show_range * 5
  fisheye_zoom: 4.0
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

  #d3.xhr(url,'text/plain',parseAndShow);

  # This is a hacky Orlando-specific way to capture this
  assign_types: (d) ->
    if has_type(d.s, FOAF_Group)
      @taxonomy['orgs'].add(d)
    else if d.s.id[0] is "_"
      @taxonomy['people'].add(d)
      @taxonomy['others'].add(d)      
    else
      @taxonomy['writers'].add(d)    

  # This is a hacky Orlando-specific way to 
  #  http:///4  
  #  _:4
  #
  color_by_type: (d) ->    
    # anon red otherwise blue 
    if has_type(d.s, FOAF_Group)
      "green" # Groups
    else if d.s.id[0] is "_"
      "red" # Other people
    else
      "blue" # the writers

  move_node_to_point: (node, point) ->
    node.x = point[0]
    node.y = point[1]
    
  mousemove: =>
    d3_event = @mouse_receiver[0][0]
    #console.log('mousemove',this,d3_event)
    @last_mouse_pos = d3.mouse(d3_event)
    # || focused_node.state == discarded_set
    if not @dragging and @mousedown_point and @focused_node and
        distance(@last_mouse_pos, @mousedown_point) > @drag_dist_threshold and
        @focused_node.state is @graphed_set
      # We can only know that the users intention is to drag
      # a node once sufficient motion has started, when there
      # is a focused_node
      @dragging = @focused_node
    if @dragging
      @force.resume() # why?
      #console.log(@focused_node.x,@last_mouse_pos);
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
    
    #console.log(point,mousedown_point,distance(point,mousedown_point));
    # if something was being dragged then handle the drop
    if @dragging
      @move_node_to_point @dragging, point
      if @in_discard_dropzone(@dragging)
        @run_verb_on_object 'discard',@dragging
      else @dragging.fixed = true  if @nodes_pinnable
      if @in_disconnect_dropzone(@dragging)
        @run_verb_on_object 'shelve',@dragging        
      @dragging = false
      return

    # if this was a click on a pinned node then unpin it
    if @nodes_pinnable and @focused_node and
        @focused_node.fixed and @focused_node.state is @graphed_set
      @focused_node.fixed = false 

    # it was a drag, not a click
    drag_dist = distance(point, @mousedown_point)
    #if drag_dist > @drag_dist_threshold
    #  console.log "drag detection probably bugged",point,@mousedown_point,drag_dist
    #  return

    if @focused_node
      unless @focused_node.state is @graphed_set
        @run_verb_on_object 'choose',@focused_node
      else if @focused_node.showing_links is "all"
        @run_verb_on_object 'shelve',@focused_node
      else
        @run_verb_on_object 'choose',@focused_node        

      # TODO(smurp) are these still needed?
      @force.links @links_set
      @restart()


  #///////////////////////////////////////////////////////////////////////////
  # resize-svg-when-window-is-resized-in-d3-js
  #   http://stackoverflow.com/questions/16265123/
  updateWindow: =>
    @get_window_width()
    @get_window_height()
    @update_graph_radius()
    @update_discard_zone()
    @update_lariat_zone()
    if @svg
      @svg.
        attr("width", @width).
        attr("height", @height)
    if @canvas
      @canvas.width = @width
      @canvas.height = @height
    @force.size [@width,@height]
    @restart()

  #///////////////////////////////////////////////////////////////////////////
  # 
  #   http://bl.ocks.org/mbostock/929623
  get_charge: (d) =>
    return 0  unless @graphed_set.has(d)
    @charge

  get_gravity: =>
    return @gravity

  # lines: 5845 5848 5852 of d3.v3.js object to
  #    mouse_receiver.call(force.drag);
  # when mouse_receiver == viscanvas
  init_webgl: ->
    @init()
    @animate()

  #add_frame();
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
    @ctx.strokeStyle = clr or red
    @ctx.beginPath()
    @ctx.moveTo x1, y1
    @ctx.lineTo x2, y2
    @ctx.closePath()
    @ctx.stroke()
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
    #      states: graphed,unlinked,discarded,hidden
    #         graphed: in the graph, connected to other nodes
    #	 unlinked: in the lariat, available for choosing
    #	 discarded: in the discard zone, findable but ignored by show_links_*
    #	 hidden: findable, but not displayed anywhere
    #              	 (when found, will become unlinked)
    #     
    @nodes = SortedSet().sort_on("id") # is .named() required?
    @chosen_set = SortedSet().named("chosen").isFlag().sort_on("id")
    @unlinked_set = SortedSet().sort_on("name").named("unlinked").isState()
    @discarded_set = SortedSet().sort_on("name").named("discarded").isState()
    @hidden_set = SortedSet().sort_on("id").named("hidden").isState()
    @graphed_set = SortedSet().sort_on("id").named("graphed").isState()
    @links_set = SortedSet().named("shown").isFlag().sort_on("id")
    @labelled_set = SortedSet().named("labelled").isFlag().sort_on("id")
    @create_taxonomy()

  create_taxonomy: ->
    @taxonomy = {}
    for nom in ['writers','people','others','orgs']
      @taxonomy[nom] = SortedSet().named(nom).isFlag().sort_on("id")
    
  reset_graph: ->
    @init_sets()
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
    @node_radius_policy d
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

  draw_edges: ->
    if @use_svg
      link.attr("x1", (d) ->
        d.source.fisheye.x
      ).attr("y1", (d) ->
        d.source.fisheye.y
      ).attr("x2", (d) ->
        d.target.fisheye.x
      ).attr "y2", (d) ->
        d.target.fisheye.y

    if @use_canvas
      @links_set.forEach (e, i) =>
        @draw_line e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, e.color

    if @use_webgl
      dx = @width * xmult
      dy = @height * ymult
      dx = -1 * @cx
      dy = -1 * @cy
      @links_set.forEach (e) =>
        e.target.fisheye = @fisheye(e.target)  unless e.target.fisheye
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

  position_nodes: ->
    n_nodes = @nodes.length or 0
    @nodes.forEach (node, i) =>
      @move_node_to_point node, @last_mouse_pos if @dragging is node
      return unless @graphed_set.has(node)
      node.fisheye = @fisheye(node)

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
  draw_lariat: ->
    @draw_nodes_in_set @unlinked_set, @graph_radius, @lariat_center
  draw_nodes: ->
    if @use_svg
      node.attr("transform", (d, i) ->
        "translate(" + d.fisheye.x + "," + d.fisheye.y + ")"
      ).attr "r", calc_node_radius
    if @use_canvas or @use_webgl
      #console.log "draw_nodes() @nodes:", @nodes.length, "@graphed:", @graphed_set.length
      @nodes.forEach (d, i) =>
        return unless @graphed_set.has(d)
        #if i < 3
        #  console.log i,d
        d.fisheye = @fisheye(d)
        if @use_canvas
          @draw_circle(d.fisheye.x, d.fisheye.y,
                       @calc_node_radius(d),
                       d.color or "yellow", d.color or "black")
        if @use_webgl
          @mv_node(d.gl, d.fisheye.x, d.fisheye.y)
  should_show_label: (node) ->
    node.labelled or
        dist_lt(@last_mouse_pos, node, @label_show_range) or
        node.name.match(@search_regex) or
        @label_all_graphed_nodes and @graphed_set.has(node)
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
      @nodes.forEach (node) =>
        return unless @should_show_label(node)
        if node.focused_node
          @ctx.fillStyle = node.color
          @ctx.font = focused_font
        else
          @ctx.fillStyle = "black"
          @ctx.font = unfocused_font
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
          @ctx.fillText node.name, 0, 0          
          @ctx.restore()
        else
          @ctx.fillText node.name, node.fisheye.x, node.fisheye.y

  clear_canvas: ->
    @ctx.clearRect 0, 0, @canvas.width, @canvas.height
  blank_screen: ->
    @clear_canvas()  if @use_canvas or @use_webgl
  tick: =>
    # return if @focused_node   # <== policy: freeze screen when selected
    @blank_screen()
    @draw_dropzones()
    @find_focused_node()
    @fisheye.focus @last_mouse_pos
    @show_last_mouse_pos()
    @position_nodes()
    @draw_edges()
    @draw_nodes()
    @draw_lariat()
    @draw_discards()
    @draw_labels()
    @update_status()
  update_status: ->
    msg = "linked:" + @nodes.length +
          " unlinked:" + @unlinked_set.length +
          " links:" + @links_set.length +
          " discarded:" + @discarded_set.length +
          " subjects:" + @G.num_subj +
          " chosen:" + @chosen_set.length
    msg += " DRAG"  if @dragging
    @set_status msg
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
    
    #.attr("class", "node")
    #.attr("class", "lariat")
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
  make_edge: (s, t, c) ->
    source: s
    target: t
    color: c or "lightgrey"
    id: s.id + " " + t.id

  add_to: (itm, array, cmp) ->
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

  # add_quad is the standard entrypoint for all data sources
  # It is fires the events:
  #   newsubject
  add_quad: (quad) ->
    #console.log quad.context
    s = quad.subject
    newsubj = false
    subj = null
    if not @my_graph.subjects[s]?
      newsubj = true
      subj =
        uri: s
        predicates: []
      @my_graph.subjects[s] = subj
    else
      subj = @my_graph.subjects[s]
      
    @my_graph.predicates[quad.predicate] = {}
    @my_graph.objects[quad.object] = {}

    if newsubj
      @fire_newsubject_event s if window.CustomEvent?
  
  parseAndShowTurtle: (data, textStatus) =>
    @set_status "parsing"
    msg = "data was " + data.length + " bytes"
    parse_start_time = new Date()

    
    #  application/n-quads
    #  .nq
    #
    if GreenerTurtle? and @turtle_parser is 'GreenerTurtle'
      @G = new GreenerTurtle().parse(data, "text/turtle")

    else if @turtle_parser is 'N3'
      #N3 = require('N3')
      console.log "n3",N3
      predicates = {}
      parser = N3.Parser()
      parser.parse data, (err,trip,pref) =>
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

  parseAndShowNQ: (data, textStatus) ->
    QuadParser = require("rdfquads").QuadParser
    # Build a parser around a stream
    
    parser = new QuadParser(data)
    parser.on 'quad', (quad) ->
      console.log quad
    parser.on 'end', (quad) ->
      console.log 'done parsing'
    
  fetchAndShow: (url) ->
    $("#status").text "fetching " + url
    $("body").css "cursor", "wait"
    if url.match(/.ttl/)
      the_parser = @parseAndShowTurtle
    else if url.match(/.nq/)
      the_parser = @parseAndShowNQ
          
    $.ajax
      url: url
      success: the_parser
      error: (jqxhr, textStatus, errorThrown) ->
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
    @cx = @width / 2

  # Should be refactored to be get_container_height
  get_window_height: (pad) ->
    pad = pad or hpad
    @height = (window.innerHeight or document.documentElement.clientHeight or document.clientHeight) - pad
    #console.log "get_window_height()",window.innerHeight,document.documentElement.clientHeight,document.clientHeight,"==>",@height
    @cy = @height / 2
    
  update_graph_radius: ->
    @graph_radius = Math.floor(Math.min(@width / 2, @height / 2)) * @shelf_radius

  update_lariat_zone: ->
    @lariat_center = [@width / 2, @height / 2]

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
    thing = {}
    thing.id = node_id

    idx = @nodes.binary_search thing      
    if idx > -1
      @nodes[idx]
    else
      if throw_on_fail
        throw new Error("node with id <" + node_id + "> not found")
      else
        return

  update_flags: (n) ->
    old_linked_status = @graphed_set.has(n)
    if old_linked_status
      if not n.links_from_found or not n.links_to_found
        n.showing_links = "some"
      else
        if n.links_from.length + n.links_to.length > n.links_shown.length
          n.showing_links = "some"
        else
          n.showing_links = "all"
    else
      n.showing_links = "none"

  add_link: (e) ->
    show = e.source.state isnt @discarded_set and
           e.target.state isnt @discarded_set
    if show 
      @links_set.add e
      @add_to e, e.source.links_shown
      @add_to e, e.target.links_shown
    @add_to e, e.source.links_from
    @add_to e, e.target.links_to
    @update_flags e.source
    @update_flags e.target
    @update_state e.target
    # should we do;
    #    @update_state e.source
    #@restart()

  remove_link: (e) ->
    return  if @links_set.indexOf(e) is -1
    @remove_from e, e.source.links_shown
    @remove_from e, e.target.links_shown
    @links_set.remove e
    @update_flags e.source
    @update_flags e.target
    @update_state e.target
    @update_state e.source

  find_links_from_node: (node) ->
    target = undefined
    subj = node.s
    x = node.x or width / 2
    y = node.y or height / 2
    pnt = [x,y]
    oi = undefined
    if subj
      for p_name of subj.predicates
        @ensure_predicate(p_name)
        predicate = subj.predicates[p_name]
        oi = 0
        predicate.objects.forEach (obj,i) =>
          if obj.type is RDF_object
            target = @get_or_make_node(@G.subjects[obj.value], pnt)
          if target
            @add_link @make_edge(node, target)
    node.links_from_found = true

  find_links_to_node: (d) ->
    subj = d.s
    if subj
      parent_point = [d.x,d.y]
      @G.get_incoming_predicates(subj).forEach (sid_pred) =>
        sid = sid_pred[0]
        pred = sid_pred[1]
        src = @get_or_make_node(@G.subjects[sid], parent_point)
        @add_link @make_edge(src, d)
    d.links_to_found = true

  show_link: (edge, incl_discards) ->
    return  if (not incl_discards) and (edge.target.state is @discarded_set or edge.source.state is @discarded_set)
    @add_to edge, edge.source.links_shown
    @add_to edge, edge.target.links_shown
    @links_set.add edge
    @update_state edge.source
    @update_state edge.target

  show_links_to_node: (n, incl_discards) ->
    incl_discards = incl_discards or false
    if not n.links_to_found
      @find_links_to_node n,incl_discards
    n.links_to.forEach (e, i) =>
      @show_link e, incl_discards
    @update_flags n
    @update_state n
    @force.links @links_set
    @restart()

  update_state: (node) ->
    if node.state == @graphed_set and node.links_shown.length is 0
      @unlinked_set.acquire node
    if node.links_shown.length > 0
      @graphed_set.acquire node

  hide_links_to_node: (n) ->
    n.links_to.forEach (e, i) =>
      @remove_from e, n.links_shown
      @remove_from e, e.source.links_shown
      @links_set.remove e
      @remove_ghosts e
      @update_state e.source
      @update_flags e.source
      @update_flags e.target

    @update_state n
    @force.links @links_set
    @restart()

  show_links_from_node: (n, incl_discards) ->
    incl_discards = incl_discards or false
    if not n.links_from_found
      @find_links_from_node n
    n.links_from.forEach (e, i) =>
      @show_link e, incl_discards
    @update_state n
    @force.links @links_set
    @restart()

  hide_links_from_node: (n) ->
    n.links_from.forEach (e, i) =>
      @remove_from e, n.links_shown
      @remove_from e, e.target.links_shown
      @links_set.remove e
      @remove_ghosts e
      @update_state e.target
      @update_flags e.source
      @update_flags e.target

    @force.links @links_set
    @restart()

  get_or_make_node: (subject, start_point, linked) ->
    return  unless subject
    d = @get_node_by_id(subject.id)
    return d  if d
    start_point = start_point or [
      @width / 2
      @height / 2
    ]
    linked = typeof linked is "undefined" or linked or false
    name = subject.predicates[FOAF_name].objects[0].value
    d =
      x: start_point[0]
      y: start_point[1]
      px: start_point[0] * 1.01
      py: start_point[1] * 1.01
      linked: false
      links_shown: []
      links_from: []
      links_from_found: false
      links_to: []
      links_to_found: false
      showing_links: "none"
      name: name
      s: subject

    d.color = @color_by_type(d)
    @assign_types(d)
    d.id = d.s.id
    @add_node_ghosts d
    #n_idx = @add_to_array(d, @nodes)
    n_idx = @nodes.add(d)
    @id2n[subject.id] = n_idx
    unless linked
      n_idx = @unlinked_set.acquire(d)
      @id2u[subject.id] = n_idx
    else
      @id2u[subject.id] = @graphed_set.acquire(d)
    @update_flags d
    d

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
        @update_flags e.source
      else
        @remove_from e, e.target.links_shown
        @update_state e.target
        @update_flags e.target
      @remove_ghosts e

    node.links_shown = []
    @update_state node
    @update_flags node

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
    @update_flags node

  show_found_links: ->
    for sub_id of @G.subjects
      subj = @G.subjects[sub_id]
      subj.getValues("f:name").forEach (name) =>
        if name.match(@search_regex)
          node = @get_or_make_node(subj, [cx,cy])
          @show_node_links node  if node
    @restart()

  toggle_links: ->
    #console.log("links",force.links());
    unless @links_set.length
      @make_links G
      @restart()
    @force.links().length

  toggle_label_display: ->
    @label_all_graphed_nodes = not @label_all_graphed_nodes
    @tick()

  hide_all_links: ->
    @nodes.forEach (node) =>
      #node.linked = false;
      #node.fixed = false;	
      @unlinked_set.acquire node
      node.links_shown = []
      node.showing_links = "none"
      @unlinked_set.acquire node
      @update_flags node

    @links_set.forEach (link) =>
      remove_ghosts link

    @links_set.clear()
    @chosen_set.clear()
    
    # It should not be neccessary to clear discarded_set or hidden_set()
    # because unlinked_set.acquire() should have accomplished that
    @restart()


  set_status: (txt) ->
    txt = txt or ""
    unless @last_status is txt
      $("#status").text txt
    @last_status = txt

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
    @hide_links_from_node unlinkee
    @hide_links_to_node unlinkee
    @unlinked_set.acquire unlinkee
    @update_flags unlinkee
    @update_state unlinkee
    
  #
  #  The DISCARDED are those nodes which the user has
  #  explicitly asked to not have drawn into the graph.
  #  The user expresses this by dropping them in the 
  #  discard_dropzone.
  #
  discard: (goner) ->
    @shelve goner  
    @unlink goner
    @discarded_set.acquire goner
    @update_flags goner
    goner

  undiscard: (prodigal) ->
    @unlinked_set.acquire prodigal
    @update_flags prodigal
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
    @unlinked_set.acquire goner
    @update_flags goner
    goner

  #update_history();
  choose: (chosen) =>
    # There is a flag .chosen in addition to the state 'linked'
    # because linked means it is in the graph
    @chosen_set.add chosen
    @graphed_set.acquire chosen # do it early so add_link shows them otherwise choosing from discards just puts them in the lariat
    @show_links_from_node chosen
    @show_links_to_node chosen
    if chosen.links_shown
      @graphed_set.acquire chosen
      chosen.showing_links = "all"
    else
      @unlinked_set.acquire chosen
    @update_state chosen
    @update_flags chosen
    chosen

  #update_history();
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
      @gclc = new gcl.GraphCommandLanguageCtrl(this)
      @gclui = new gclui.CommandController(this,d3.select("#gclui")[0][0])
      window.addEventListener 'showgraph', @register_gclc_prefixes

  run_verb_on_object: (verb,subject) ->
    cmd = new gcl.GraphCommand
      verbs: [verb]
      subjects: [@get_handle subject]
    @gclc.run cmd
    @gclui.push_command cmd

  get_handle: (thing) ->
    # A handle is like a weak reference, saveable, serializable
    # and garbage collectible.  It was motivated by the desire to
    # turn an actual node into a suitable member of the subjects list
    # on a GraphCommand
    return {id: thing.id}

  constructor: ->
    @init_sets()
    @init_gclc()

    @mousedown_point = [@cx,@cy]
    @discard_point = [@cx,@cy]
    @lariat_center = [@cx,@cy]
    @node_radius_policy = node_radius_policies[default_node_radius_policy]
    @update_fisheye()
    @fill = d3.scale.category20()
    @force = d3.layout.force().size([
      @width
      @height
    ]).nodes([]).linkDistance(@link_distance).
                 charge(@get_charge).
                 gravity(@gravity).
                 on("tick", @tick)
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
    @mouse_receiver.
      on("mousemove", @mousemove).
      on("mousedown", @mousedown).
      on("mouseup", @mouseup).
      on("mouseout", @mouseup)
    @restart()

    @set_search_regex("")
    search_input = document.getElementById('search')
    if search_input
      search_input.addEventListener("input", @update_searchterm)
    #$(".search_box").on "input", @update_searchterm
    window.addEventListener "resize", @updateWindow

  get_jiggy: ->
    return @width
  focused_mag: 1.4
  label_em: .7

  update_fisheye: ->
    @label_show_range = @link_distance * 1.1
    @fisheye_radius = @label_show_range * 5
    @focus_radius = @label_show_range

    @fisheye = d3.fisheye.
      circular().
      radius(@fisheye_radius).
      distortion(@fisheye_zoom)
        
  update_graph_settings: (target) =>
    @[target.name] = target.value
    @update_fisheye()
    @updateWindow()
    @tick()
  init_from_graph_controls: ->
    # Perform update_graph_settings for everything in the form
    # so the HTML can be used as configuration file        
  load_file: ->
    @reset_graph()
    data_uri = $("select.file_picker option:selected").val()
    @set_status data_uri
    @G = {}
    @fetchAndShow data_uri  unless @G.subjects
    @init_webgl()  if @use_webgl

#(typeof exports is 'undefined' and window or exports).Huviz = Huviz
exports.Huviz = Huviz
