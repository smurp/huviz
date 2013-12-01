#
#
#See for inspiration:
#  Collapsible Force Layout
#    http://bl.ocks.org/mbostock/1093130
#  Force-based label placement
#    http://bl.ocks.org/MoritzStefaner/1377729
#  Graph with labeled edges:
#    http://bl.ocks.org/jhb/5955887
#  Multi-Focus Layout:
#    http://bl.ocks.org/mbostock/1021953
#
#Lariat -- around the graph, the rope of nodes which serves as reorderable menu
#Hoosegow -- a jail to contain nodes one does not want to be bothered by
#
# 
class Huviz
  use_canvas = true
  use_svg = false
  use_webgl = false
  #use_webgl = true  if location.hash.match(/webgl/)
  #use_canvas = false  if location.hash.match(/nocanvas/)

  nodes = undefined
  links_set = undefined
  node = undefined
  link = undefined
  chosen_set = undefined
  discarded_set = undefined
  graphed_set = undefined
  unlinked_set = undefined
  focused_node = undefined
  lariat = undefined
  label_all_graphed_nodes = false
  verbose = true
  verbosity = 0
  TEMP = 5
  COARSE = 10
  MODERATE = 20
  DEBUG = 40
  DUMP = false
  node_radius_policy = undefined
  draw_circle_around_focused = false
  draw_lariat_labels_rotated = true
  run_force_after_mouseup_msec = 2000
  nodes_pinnable = false

  BLANK_HACK = false
  wpad = undefined
  hpad = 10
  width = undefined
  height = 0
  cx = undefined
  cy = 0
  link_distance = 20
  charge = -30
  gravity = 0.3
  label_show_range = link_distance * 1.1
  graph_radius = 100
  discard_radius = 200
  fisheye_radius = label_show_range * 5
  focus_radius = label_show_range
  drag_dist_threshold = 5
  dragging = false
  last_status = undefined

  G = {}
  start_with_http = new RegExp("http", "ig")
  ids_to_show = start_with_http
  id2n = {}
  id2u = {}

  search_regex = new RegExp("^$", "ig")
  little_dot = .5
  fisheye_zoom = 2.8

  #if not verbose
  #  console = log: -> 
  last_mouse_pos = [
    0
    0
  ]

  change_sort_order = (array, cmp) ->
    array.__current_sort_order = cmp
    array.sort array.__current_sort_order
  isArray = (thing) ->
    Object::toString.call(thing) is "[object Array]"
  cmp_on_name = (a, b) ->
    return 0  if a.name is b.name
    return -1  if a.name < b.name
    1
  cmp_on_id = (a, b) ->
    return 0  if a.id is b.id
    return -1  if a.id < b.id
    1
  binary_search_on = (sorted_array, sought, cmp, ret_ins_idx) ->
    # return -1 or the idx of sought in sorted_array
    # if ret_ins_idx instead of -1 return [n] where n is where it ought to be
    # AKA "RETurn the INSertion INdeX"
    cmp = cmp or sorted_array.__current_sort_order or cmp_on_id
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

  # Objective:
  #   Remove item from an array acting like a set.
  #   It is sorted by cmp, so we can use binary_search for removal
  do_tests = (verbose) ->
    expect = (stmt, want) ->
      got = eval(stmt)
      console.log stmt, "==>", got  if verbose
      throw stmt + " returned " + got + " expected " + want  unless got is want
    verbose = verbose or false

    n = (a, b) ->
      return 0  if a is b
      return -1  if a < b
      1

    a = id: 1
    b = id: 2
    c = id: 0
    d = id: 3
    stuff = [
      a
      b
    ]
    a_d = [
      a
      d
    ]
    ints = [
      0
      1
      2
      3
      4
      5
      6
      7
      8
      10
    ]
    even = [
      0
      2
      4
      6
      8
      10
    ]
    expect "cmp_on_id(a,a)", 0
    expect "cmp_on_id(a,b)", -1
    expect "cmp_on_id(b,a)", 1
    expect "binary_search_on(ints,0,n)", 0
    expect "binary_search_on(ints,4,n)", 4
    expect "binary_search_on(ints,8,n)", 8
    expect "binary_search_on(ints,9,n)", -1
    expect "binary_search_on(ints,9,n,true).idx", 9
    expect "binary_search_on(ints,-3,n)", -1
    expect "binary_search_on(even,1,n,true).idx", 1
    expect "binary_search_on(even,3,n,true).idx", 2
    expect "binary_search_on(even,5,n,true).idx", 3
    expect "binary_search_on(even,7,n,true).idx", 4
    expect "binary_search_on(even,9,n,true).idx", 5
    expect "binary_search_on(even,9,n)", -1
    expect "binary_search_on(even,11,n,true).idx", 6
    expect "binary_search_on(stuff,a)", 0
    expect "binary_search_on(stuff,b)", 1
    expect "binary_search_on(stuff,c)", -1
    expect "binary_search_on(stuff,d)", -1
    expect "binary_search_on(a_d,c,cmp_on_id)", -1
    expect "binary_search_on(a_d,c,cmp_on_id,true).idx", 0
    expect "binary_search_on(a_d,b,cmp_on_id,true).idx", 1
    expect "add_to_array(b,a_d)", 1
    expect "binary_search_on(a_d,a,cmp_on_id)", 0
    expect "binary_search_on(a_d,b,cmp_on_id)", 1
    expect "binary_search_on(a_d,d,cmp_on_id)", 2
    expect "add_to_array(c,a_d)", 0

  # Perform the set .add operation, adding itm only if not already present

  #if (Array.__proto__.add == null) Array.prototype.add = add;
  # the nodes the user has chosen to see expanded
  # the nodes the user has discarded
  # the nodes which are in the graph, linked together
  # the nodes not displaying links and not discarded
  # keep synced with html
  # bugged
  roughSizeOfObject = (object) ->
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

  # This is a hacky Orlando-specific way to 
  #  http:///4  
  #  _:4
  color_by_type = (d) ->    
    # anon red otherwise blue 
    if has_type(d.s, FOAF_Group)
      "green" # Groups
    else if d.s.id[0] is "_"
      "red" # Other people
    else
      "blue" # the writers
  distance = (p1, p2) ->
    x = (p1.x or p1[0]) - (p2.x or p2[0])
    y = (p1.y or p1[1]) - (p2.y or p2[1])
    Math.sqrt x * x + y * y
  move_node_to_point = (node, point) ->
    node.x = point[0]
    node.y = point[1]
  mousemove = ->
    #console.log('mousemove');
    last_mouse_pos = d3.mouse(this)
    # || focused_node.state == discarded_set 
    dragging = focused_node  if not dragging and mousedown_point and focused_node and distance(last_mouse_pos, mousedown_point) > drag_dist_threshold and focused_node.state is graphed_set
    if dragging
      force.resume()
      
      #console.log(focused_node.x,last_mouse_pos);
      move_node_to_point dragging, last_mouse_pos
    cursor.attr "transform", "translate(" + last_mouse_pos + ")"
    tick()
  mousedown = ->
    
    #console.log('mousedown');
    #
    #    if (focused_node && 
    #	(focused_node.state == graphed_set // || focused_node.state == discarded_set 
    #	)){ // only drag nodes in graph
    #	dragging = focused_node;
    #	//force.stop();
    #    }
    #    
    mousedown_point = d3.mouse(this)
    last_mouse_pos = mousedown_point

  #e.preventDefault();
  mouseup = ->
    mousedown_point = false
    point = d3.mouse(this)
    
    #console.log(point,mousedown_point,distance(point,mousedown_point));
    # if something was being dragged then handle the drop
    if dragging
      move_node_to_point dragging, point
      if in_discard_dropzone(dragging)
        console.log "discarding", dragging.name
        discard dragging
      else dragging.fixed = true  if nodes_pinnable
      if in_disconnect_dropzone(dragging)
        console.log "disconnect", dragging.name
        unchoose dragging
      dragging = false
      return
    
    # if this was a click on a pinned node then unpin it
    focused_node.fixed = false  if nodes_pinnable  if focused_node and focused_node.fixed and focused_node.state is graphed_set
    return  if distance(point, mousedown_point) > drag_dist_threshold # it was a drag, not a click
    if focused_node
      clickee = focused_node
      
      #
      #	if (! clickee.state ||  // hidden should be the default state
      #	    clickee.state == 'hidden' || 
      #	    clickee.state == hidden_set || 
      #	    clickee.state == unlinked_set || 
      #	    clickee.state == discarded_set){
      #	    
      unless clickee.state is graphed_set
        choose clickee
      else if clickee.showing_links is "all"
        unchoose clickee
      else
        choose clickee
      force.links links_set
      
      #update_flags(clickee);
      restart()

  #///////////////////////////////////////////////////////////////////////////
  # resize-svg-when-window-is-resized-in-d3-js
  #   http://stackoverflow.com/questions/16265123/

  #console.log('width',width);

  #console.log('height',height);
  updateWindow = ->
    get_window_width()
    get_window_height()
    update_graph_radius()
    update_discard_zone()
    svg.attr("width", width).attr "height", height  if svg
    if canvas
      canvas.width = width
      canvas.height = height
    force.size [
      width
      height
    ]
    restart()

  #///////////////////////////////////////////////////////////////////////////
  # 
  #   http://bl.ocks.org/mbostock/929623
  get_charge = (d) ->
    return 0  unless graphed_set.has(d)
    charge
  # initialize with no nodes

  #var canvas = document.getElementById('#viscanvas')

  # lines: 5845 5848 5852 of d3.v3.js object to
  #    mouse_receiver.call(force.drag);
  # when mouse_receiver == viscanvas
  init_webgl = ->
    init()
    animate()

  #add_frame();
  #dump_line(add_line(scene,cx,cy,width,height,'ray'))
  draw_circle = (cx, cy, radius, strclr, filclr) ->
    ctx.strokeStyle = strclr or "blue"  if strclr
    ctx.fillStyle = filclr or "blue"  if filclr
    ctx.beginPath()
    ctx.arc cx, cy, radius, 0, Math.PI * 2, true
    ctx.closePath()
    ctx.stroke()  if strclr
    ctx.fill()  if filclr
  draw_line = (x1, y1, x2, y2, clr) ->
    ctx.strokeStyle = clr or red
    ctx.beginPath()
    ctx.moveTo x1, y1
    ctx.lineTo x2, y2
    ctx.closePath()
    ctx.stroke()
  draw_disconnect_dropzone = ->
    ctx.save()
    ctx.lineWidth = graph_radius * 0.1
    draw_circle cx, cy, graph_radius, "lightgreen"
    ctx.restore()
  draw_discard_dropzone = ->
    ctx.save()
    ctx.lineWidth = discard_radius * 0.1
    draw_circle discard_center[0], discard_center[1], discard_radius, "", "salmon"
    ctx.restore()
  draw_dropzones = ->
    if dragging
      draw_disconnect_dropzone()
      draw_discard_dropzone()
  in_disconnect_dropzone = (node) ->
    # is it within the RIM of the disconnect circle?
    dist = distance(node, [
      cx
      cy
    ])
    graph_radius * 0.9 < dist and graph_radius * 1.1 > dist
  in_discard_dropzone = (node) ->
    # is it ANYWHERE within the circle?
    dist = distance(node, discard_center)
    discard_radius * 1.1 > dist
  reset_graph = ->
    #draw_circle(cx,cy,0.5 * Math.min(cx,cy),'black')
    id2n = {}
    nodes = [] #SortedSet().sort_on('id');
    change_sort_order nodes, cmp_on_id
    chosen_set = SortedSet().named("chosen").isFlag().sort_on("id")
    
    #
    #      states: graphed,unlinked,discarded,hidden
    #         graphed: in the graph, connected to other nodes
    #	 unlinked: in the lariat, available for choosing
    #	 discarded: in the discard zone, findable but ignored by show_links_*
    #	 hidden: findable, but not displayed anywhere
    #              	 (when found, will become unlinked)
    #     
    unlinked_set = SortedSet().sort_on("name").named("unlinked").isState()
    discarded_set = SortedSet().sort_on("name").named("discarded").isState()
    hidden_set = SortedSet().sort_on("id").named("hidden").isState()
    graphed_set = SortedSet().sort_on("id").named("graphed").isState()
    links_set = SortedSet().named("shown").isFlag().sort_on("id")
    force.nodes nodes
    d3.select(".link").remove()
    d3.select(".node").remove()
    d3.select(".lariat").remove()
    
    #nodes = force.nodes();
    #links = force.links();
    node = svg.selectAll(".node")
    link = svg.selectAll(".link")
    lariat = svg.selectAll(".lariat")
    link = link.data(links_set)
    link.exit().remove()
    node = node.data(nodes)
    node.exit().remove()
    force.start()
  dist_lt = (mouse, d, thresh) ->
    x = mouse[0] - d.x
    y = mouse[1] - d.y
    Math.sqrt(x * x + y * y) < thresh
  # get this once per tick

  #console.log(this);

  #console.log('"'+text+'" ==>',search_regex);

  #if (d.radius) return d.radius;

  #set_node_radius_policy(node_radius_policies[default_node_radius_policy]);
  set_node_radius_policy = (evt) ->
    f = $("select#node_radius_policy option:selected").val()
    return  unless f
    if typeof f is typeof "str"
      node_radius_policy = node_radius_policies[f]
    else if typeof f is typeof set_node_radius_policy
      node_radius_policy = f
    else
      console.log "f =", f
  init_node_radius_policy = ->
    policy_box = d3.select("#huvis_controls").append("div", "node_radius_policy_box")
    policy_picker = policy_box.append("select", "node_radius_policy")
    policy_picker.on "change", set_node_radius_policy
    for policy_name of node_radius_policies
      policy_picker.append("option").attr("value", policy_name).text policy_name

  #console.log(policy_name);
  calc_node_radius = (d) ->
    node_radius_policy d
  names_in_edges = (set) ->
    out = []
    set.forEach (itm, i) ->
      out.push itm.source.name + " ---> " + itm.target.name

    out
  dump_details = (node) ->
    
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
    console.log "  links_shown:", node.links_shown.length, names_in_edges(node.links_shown)
    console.log "  links_to:", node.links_to.length, names_in_edges(node.links_to)
    console.log "  links_from:", node.links_from.length, names_in_edges(node.links_from)
    console.log "  showing_links:", node.showing_links
    console.log "  in_sets:", node.in_sets
  find_focused_node = ->
    return  if dragging
    new_focused_node = undefined
    new_focused_idx = undefined
    focus_threshold = focus_radius * 3
    closest = width
    closest_point = undefined
    nodes.forEach (d, i) ->
      dist = distance(d.fisheye or d, last_mouse_pos)
      if dist < closest
        closest = dist
        closest_point = d.fisheye or d
      if dist <= focus_threshold
        new_focused_node = d
        focus_threshold = dist
        new_focused_idx = i

    
    #console.log("dist",focus_threshold,dist,new_focused_node.name);
    draw_circle closest_point.x, closest_point.y, focus_radius, "red"  if draw_circle_around_focused
    msg = focus_threshold + " <> " + closest
    status = $("#status")
    
    #status.text(msg);
    #console.log('new_focused_node',focus_threshold,new_focused_node);
    unless focused_node is new_focused_node
      if focused_node
        d3.select(".focused_node").classed "focused_node", false  if use_svg
        focused_node.focused_node = false
      if new_focused_node
        new_focused_node.focused_node = true
        if use_svg
          svg_node = node[0][new_focused_idx]
          d3.select(svg_node).classed "focused_node", true
        dump_details new_focused_node
    focused_node = new_focused_node # possibly null
  draw_edges = ->
    if use_svg
      link.attr("x1", (d) ->
        d.source.fisheye.x
      ).attr("y1", (d) ->
        d.source.fisheye.y
      ).attr("x2", (d) ->
        d.target.fisheye.x
      ).attr "y2", (d) ->
        d.target.fisheye.y

    if use_canvas
      links_set.forEach (e, i) ->
        
        #
        #	if (! e.target.fisheye) 
        #	    e.target.fisheye = fisheye(e.target);
        #	    
        draw_line e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, e.color

    if use_webgl
      
      #console.clear();
      dx = width * xmult
      dy = height * ymult
      dx = -1 * cx
      dy = -1 * cy
      links_set.forEach (e) ->
        e.target.fisheye = fisheye(e.target)  unless e.target.fisheye
        add_webgl_line e  unless e.gl
        l = e.gl
        
        #
        #	  if (e.source.fisheye.x != e.target.fisheye.x &&
        #	      e.source.fisheye.y != e.target.fisheye.y){
        #	      alert(e.id + " edge has a length");
        #	  }
        #	  
        mv_line l, e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y
        dump_line l

    if use_webgl and false
      links_set.forEach (e, i) ->
        return  unless e.gl
        v = e.gl.geometry.vertices
        v[0].x = e.source.fisheye.x
        v[0].y = e.source.fisheye.y
        v[1].x = e.target.fisheye.x
        v[1].y = e.target.fisheye.y

  position_nodes = ->
    n_nodes = nodes.length or 0
    nodes.forEach (node, i) ->
      #console.log("position_node",d.name);
      move_node_to_point node, last_mouse_pos  if dragging is node
      return  unless graphed_set.has(node)
      node.fisheye = fisheye(node)

  draw_nodes_in_set = (set, radius, center) ->
    cx = center[0]
    cy = center[1]
    num = set.length
    set.forEach (node, i) ->
      rad = 2 * Math.PI * i / num
      node.rad = rad
      node.x = cx + Math.sin(rad) * radius
      node.y = cy + Math.cos(rad) * radius
      node.fisheye = fisheye(node)
      draw_circle node.fisheye.x, node.fisheye.y, calc_node_radius(node), node.color or "yellow", node.color or "black"  if use_canvas
      mv_node node.gl, node.fisheye.x, node.fisheye.y  if use_webgl

  draw_discards = ->
    draw_nodes_in_set discarded_set, discard_radius, discard_center
  draw_lariat = ->
    draw_nodes_in_set unlinked_set, graph_radius, [cx,cy]
  draw_nodes = ->
    if use_svg
      node.attr("transform", (d, i) ->
        "translate(" + d.fisheye.x + "," + d.fisheye.y + ")"
      ).attr "r", calc_node_radius
    if use_canvas or use_webgl
      nodes.forEach (d, i) ->
        return unless graphed_set.has(d)
        d.fisheye = fisheye(d)
        if use_canvas
          draw_circle(d.fisheye.x, d.fisheye.y, calc_node_radius(d), d.color or "yellow", d.color or "black")
        if use_webgl
          mv_node(d.gl, d.fisheye.x, d.fisheye.y)
  should_show_label = (node) ->
    dist_lt(last_mouse_pos, node, label_show_range) or node.name.match(search_regex) or label_all_graphed_nodes and graphed_set.has(node)
  draw_labels = ->
    if use_svg
      label.attr "style", (d) ->
        if should_show_label(d)
          ""
        else
          "display:none"
    if use_canvas or use_webgl
      
      #http://stackoverflow.com/questions/3167928/drawing-rotated-text-on-a-html5-canvas
      #ctx.rotate(Math.PI*2/(i*6));
      
      # http://diveintohtml5.info/canvas.html#text
      # http://stackoverflow.com/a/10337796/1234699
      nodes.forEach (node) ->
        return  unless should_show_label(node)
        if node.focused_node
          ctx.fillStyle = node.color
          ctx.font = "9px sans-serif"
        else
          ctx.fillStyle = "black"
          ctx.font = "7px sans-serif"
        if not graphed_set.has(node) and draw_lariat_labels_rotated
          
          # Flip label rather than write upside down
          #   var flip = (node.rad > Math.PI) ? -1 : 1;
          #   view-source:http://www.jasondavies.com/d3-dependencies/
          ctx.save()
          ctx.translate node.fisheye.x, node.fisheye.y
          ctx.rotate -1 * node.rad + Math.PI / 2
          ctx.fillText node.name, 0, 0
          ctx.restore()
        else
          ctx.fillText node.name, node.fisheye.x, node.fisheye.y

  clear_canvas = ->
    ctx.clearRect 0, 0, canvas.width, canvas.height
  blank_screen = ->
    clear_canvas()  if use_canvas or use_webgl
  tick = ->
    #if (focused_node){	return;    }
    blank_screen()
    draw_dropzones()
    find_focused_node()
    fisheye.focus last_mouse_pos
    
    #show_last_mouse_pos();
    #find_focused_node();
    position_nodes()
    draw_edges()
    draw_nodes()
    draw_lariat()
    draw_discards()
    draw_labels()
    update_status()
  update_status = ->
    msg = "linked:" + nodes.length + " unlinked:" + unlinked_set.length + " links:" + links_set.length + " discarded:" + discarded_set.length + " subjects:" + G.num_subj + " chosen:" + chosen_set.length
    msg += " DRAG"  if dragging
    set_status msg
  svg_restart = ->
    link = link.data(links_set)
    link.enter().
      insert("line", ".node").
      attr "class", (d) ->
        #console.log(l.geometry.vertices[0].x,l.geometry.vertices[1].x);
        "link"

    link.exit().remove()
    node = node.data(nodes)
    
    #if (node){ console.log('=================================',node[0]);  }
    node.exit().remove()
    
    #.attr("class", "node")
    #.attr("class", "lariat")
    nodeEnter = node.enter().append("g").attr("class", "lariat node").call(force.drag)
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

    label = svg.selectAll(".label")

  #force.nodes(nodes).links(links_set).start();
  canvas_show_text = (txt, x, y) ->
    console.log "canvas_show_text(" + txt + ")"
    ctx.fillStyle = "black"
    ctx.font = "12px Courier"
    ctx.fillText txt, x, y
  pnt2str = (x, y) ->
    "[" + Math.floor(x) + ", " + Math.floor(y) + "]"
  show_pos = (x, y, dx, dy) ->
    dx = dx or 0
    dy = dy or 0
    canvas_show_text pnt2str(x, y), x + dx, y + dy
  show_line = (x0, y0, x1, y1, dx, dy, label) ->
    dx = dx or 0
    dy = dy or 0
    label = typeof label is "undefined" and "" or label
    canvas_show_text pnt2str(x0, y0) + "-->" + pnt2str(x0, y0) + " " + label, x1 + dx, y1 + dy
  add_webgl_line = (e) ->
    e.gl = add_line(scene, e.source.x, e.source.y, e.target.x, e.target.y, e.source.s.id + " - " + e.target.s.id, "green")

  #dump_line(e.gl);
  webgl_restart = ->
    links_set.forEach (d) ->
      add_webgl_line d
  restart = ->
    svg_restart() if use_svg
    force.start()
  show_last_mouse_pos = ->
    draw_circle last_mouse_pos[0], last_mouse_pos[1], focus_radius, "yellow"

  #console.log(last_mouse_pos,'move');
  # nodes is sorted by id

  #
  #    n.linked = n.state == graphed_set;
  #    n.fixed = ! n.linked;
  #    return
  #    

  #n.linked = n.links_shown.length > 0;
  #n.fixed = ! old_linked_status;

  # we do not know, so a click is worth a try

  #var changed = old_linked_status != n.linked;
  #    return n;
  #
  #
  #  if (n.linked){
  #      //d3.select(node[0][new_focused_idx]).classed('focused_node',true);
  #      unlinked_set.remove(n);
  #      if (use_svg){
  #	  var svg_node = node[0][nodes.indexOf(n)];
  #	  d3.select(svg_node).classed('lariat',false).classed('node',true);
  #      }
  #      // node[0][new_focused_idx]
  #  } else {
  #      if (unlinked_set.binary_search(n) == -1){
  #	  unlinked_set.add(n);
  #	  //add_to_array(n,unlinked_set)
  #	  if (use_svg){
  #	      d3.select(svg_node).classed('lariat',true).classed('node',false);
  #	  }
  #      }
  #  }
  #  return n;
  #  

  #if (links_set.indexOf(e) > -1) return;  // already present
  #console.log(typeof links_set,links_set.prototype.add);
  #
  #    console.log('linkes,links_set.add,e');
  #    console.log(links_set)
  #    console.log(links_set.add)
  #    console.log(e)
  #  

  #if (! e.source.links_from) e.source.links_from = [];  // FIXME should use links_from_found
  #if (! e.target.links_to) e.target.links_to = [];
  # not present
  #if (! e.source.links_from) e.source.links_from = [];
  #if (! e.target.links_to) e.target.links_to = [];
  #remove_from(e,e.target.links_to);
  #remove_from(e,e.source.links_from);
  remove_ghosts = (e) ->
    if use_webgl
      remove_gl_obj e.gl  if e.gl
      delete e.gl
  add_node_ghosts = (d) ->
    d.gl = add_node(scene, d.x, d.y, 3, d.color)  if use_webgl
  make_edge = (s, t, c) ->
    source: s
    target: t
    color: c or "lightgrey"
    id: s.id + " " + t.id

  #console.log('  sid_pred:',sid_pred);

  #if (! incl_discards && e.source.state == discarded_set) return;

  #add_to(e,n.links_shown);
  #add_to(e,e.source.links_shown);
  #links_set.add(e);
  #update_state(e.source);
  #update_flags(e.source);

  #update_state(n);
  #update_flags(n);

  #if (! incl_discards && e.target.state == discarded_set) return;

  #
  #            add_to(e,n.links_shown);
  #            links_set.add(e);
  #	    add_to(e,e.target.links_shown);
  #	    update_state(e.target);
  #            update_flags(e.target);
  #	    

  # remove every link from .links_shown which is in .links_from

  #var blank_writers = new RegExp("_\:[a-z_]{6}");
  #var ids_to_show = blank_writers;
  #var ids_to_show = new RegExp("", "ig");
  # the index of linked nodes (in nodes)
  # the index of unlinked nodes (in unlinked_set)

  # assumes not already in nodes and id2n
  # uhh, no subject
  # already exist, return it
  #console.log("get_or_make_node(",subject.id,") MISSING!");

  #linked = typeof linked === 'undefined' || false;  // WFT!!!!
  # in the graph as opposed to the lariat or hoosegow
  # it being missing triggers it being filled
  # none|all|some

  #in_count:0, out_count:0

  #if (linked){ 

  #var n_idx = nodes.push(d) - 1;

  # for edge labels				   
  #   http://bl.ocks.org/jhb/5955887

  #for (var i =0 ; i<nodes.length; i++){
  # like break

  #show_and_hide_links_from_node(nodes[0]);

  #make_links(g,Math.floor(nodes.length/10));
  #make_links(g);
  #restart();
  load_file = ->
    reset_graph()
    data_uri = $("select#file_picker option:selected").val()
    set_status data_uri
    G = {}
    fetchAndShow data_uri  unless G.subjects
    init_webgl()  if use_webgl
  add_to_array = (itm, array, cmp) ->
    cmp = cmp or array.__current_sort_order or cmp_on_id
    c = binary_search_on(array, itm, cmp, true)
    return c  if typeof c is typeof 3
    array.splice c.idx, 0, itm
    c.idx

  remove_from_array = (itm, array, cmp) ->
    cmp = cmp or array.__current_sort_order or cmp_on_id
    c = binary_search_on(array, itm, cmp)
    array.splice c, 1  if c > -1
    array

  add_to = (itm, set) ->
    return add_to_array(itm, set, cmp_on_id)  if isArray(set)
    throw "add_to() requires itm to have an .id"  if typeof itm.id is "undefined"
    found = set[itm.id]
    set[itm.id] = itm  unless found
    set[itm.id]

  remove_from = (doomed, set) ->
    throw "remove_from() requires doomed to have an .id"  if typeof doomed.id is "undefined"
    return remove_from_array(doomed, set)  if isArray(set)
    delete set[doomed.id]  if set[doomed.id]
    set

  parseAndShow = (data, textStatus) ->
    set_status "parsing"
    msg = "data was " + data.length + " bytes"
    parse_start_time = new Date()
    G = GreenerTurtle(GreenTurtle).parse(data, "text/turtle")
    parse_end_time = new Date()
    parse_time = (parse_end_time - parse_start_time) / 1000
    siz = roughSizeOfObject(G)
    msg += " resulting in a graph of " + siz + " bytes"
    msg += " which took " + parse_time + " seconds to parse"
    console.log msg  if verbosity >= COARSE
    show_start_time = new Date()
    showGraph G
    show_end_time = new Date()
    show_time = (show_end_time - show_start_time) / 1000
    msg += " and " + show_time + " sec to show"
    console.log msg  if verbosity >= COARSE
    $("body").css "cursor", "default"
    $("#status").text ""

  fetchAndShow = (url) ->
    $("#status").text "fetching " + url
    $("body").css "cursor", "wait"
    $.ajax
      url: url
      success: parseAndShow
      error: (jqxhr, textStatus, errorThrown) ->
        $("#status").text errorThrown + " while fetching " + url


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

  FOAF_Group = "http://xmlns.com/foaf/0.1/Group"
  FOAF_name = "http://xmlns.com/foaf/0.1/name"
  RDF_Type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
  RDF_object = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
  has_type = (subject, typ) ->
    has_predicate_value subject, RDF_Type, typ

  is_a_main_node = (d) ->
    (BLANK_HACK and d.s.id[7] isnt "/") or (not BLANK_HACK and d.s.id[0] isnt "_")

  is_node_to_always_show = is_a_main_node

  mousedown_point = [
    cx
    cy
  ]
  show_and_hide_links_from_node = (d) ->
    show_links_from_node d
    hide_links_from_node d

  discard_center = [
    cx
    cy
  ]
  get_window_width = (pad) ->
    pad = pad or hpad
    width = (window.innerWidth or document.documentElement.clientWidth or document.clientWidth) - pad
    cx = width / 2

  get_window_height = (pad) ->
    pad = pad or hpad
    height = (window.innerHeight or document.documentElement.clientHeight or document.clientHeight) - pad
    cy = height / 2

  update_graph_radius = ->
    graph_radius = Math.floor(Math.min(width / 2, height / 2)) * .9

  update_discard_zone = ->
    discard_ratio = .1
    discard_radius = graph_radius * discard_ratio
    discard_center = [
      width - discard_radius * 3
      height - discard_radius * 3
    ]

  fisheye = d3.fisheye.
    circular().
    radius(fisheye_radius).
    distortion(fisheye_zoom)
  fill = d3.scale.category20()
  force = d3.layout.force().size([
    width
    height
  ]).nodes([]).linkDistance(link_distance).charge(get_charge).gravity(gravity).on("tick", tick)
  svg = d3.select("#vis").append("svg").attr("width", width).attr("height", height).attr("position", "absolute")
  svg.append("rect").attr("width", width).attr "height", height
  viscanvas = d3.select("#viscanvas").
    append("canvas").
    attr("width", width).
    attr("height", height)
  canvas = viscanvas[0][0]
  mouse_receiver = viscanvas
  mouse_receiver.
    on("mousemove", mousemove).
    on("mousedown", mousedown).
    on("mouseup", mouseup).
    on("mouseout", mouseup)
  updateWindow()
  ctx = canvas.getContext("2d")
  reset_graph()
  cursor = svg.append("circle").attr("r", label_show_range).attr("transform", "translate(" + cx + "," + cy + ")").attr("class", "cursor")
  restart()

  
  set_search_regex = (text) ->
    search_regex = new RegExp(text or "^$", "ig")

  update_searchterm = ->
    text = $(this).text()
    set_search_regex text
    restart()

  set_search_regex("")
  $(".search_box").on "input", update_searchterm

  node_radius_policies =
    "node radius by links": (d) ->
      d.radius = Math.max(little_dot, Math.log(d.links_shown.length))
      return d.radius
      if d.showing_links is "none"
        d.radius = little_dot
      else d.radius = Math.max(little_dot, 2 + Math.log(d.links_shown.length))  if d.showing_links is "all"
      d.radius

    "equal dots": (d) ->
      little_dot

  default_node_radius_policy = "equal dots"
  default_node_radius_policy = "node radius by links"
  node_radius_policy = node_radius_policies[default_node_radius_policy]
  dump_locations = (srch, verbose, func) ->
    verbose = verbose or false
    pattern = new RegExp(srch, "ig")
    nodes.forEach (node, i) ->
      unless node.name.match(pattern)
        console.log pattern, "does not match", node.name  if verbose
        return
      console.log func.call(node)  if func
      dump_details node  if not func or verbose

  get_node_by_id = (node_id, throw_on_fail) ->
    throw_on_fail = throw_on_fail or false
    idx = binary_search_on(nodes,
      id: node_id
    )
    if idx > -1
      nodes[idx]
    else
      if throw_on_fail
        throw "node with id <" + node_id + "> not found"
      else
        return

  update_flags = (n) ->
    old_linked_status = graphed_set.has(n)
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

  add_link = (e) ->
    links_set.add e
    add_to e, e.source.links_from
    add_to e, e.source.links_shown
    add_to e, e.target.links_to
    add_to e, e.target.links_shown
    update_flags e.source
    update_flags e.target
    restart()

  UNDEFINED = undefined
  remove_link = (e) ->
    return  if links_set.indexOf(e) is -1
    remove_from e, e.source.links_shown
    remove_from e, e.target.links_shown
    links_set.remove e
    update_flags e.source
    update_flags e.target

  find_links_from_node = (node) ->
    target = undefined
    subj = node.s
    x = node.x or width / 2
    y = node.y or height / 2
    oi = undefined
    if subj
      for p of subj.predicates
        predicate = subj.predicates[p]
        oi = 0
        while oi < predicate.objects.length
          obj = predicate.objects[oi]
          if obj.type is RDF_object
            target = get_or_make_node(G.subjects[obj.value], [
              x
              y
            ])
          continue  unless target
          add_link make_edge(node, target)
          oi++
    node.links_from_found = true

  find_links_to_node = (d) ->
    subj = d.s
    if subj
      parent_point = [
        d.x
        d.y
      ]
      G.get_incoming_predicates(subj).forEach (sid_pred) ->
        sid = sid_pred[0]
        pred = sid_pred[1]
        src = get_or_make_node(G.subjects[sid], parent_point)
        add_link make_edge(src, d)

    d.links_to_found = true

  show_link = (edge, incl_discards) ->
    return  if (not incl_discards) and (edge.target.state is discarded_set or edge.source.state is discarded_set)
    add_to edge, edge.source.links_shown
    add_to edge, edge.target.links_shown
    links_set.add edge
    update_state edge.source
    update_state edge.target

  show_links_to_node = (n, incl_discards) ->
    incl_discards = incl_discards or false
    find_links_to_node n  unless n.links_to_found
    n.links_to.forEach (e, i) ->
      show_link e, incl_discards
    force.links links_set
    restart()

  update_state = (node) ->
    if node.links_shown.length is 0
      unlinked_set.acquire node
    else
      graphed_set.acquire node

  hide_links_to_node = (n) ->
    n.links_to.forEach (e, i) ->
      remove_from e, n.links_shown
      remove_from e, e.source.links_shown
      links_set.remove e
      remove_ghosts e
      update_state e.source
      update_flags e.source
      update_flags e.target

    update_state n
    force.links links_set
    restart()

  show_links_from_node = (n, incl_discards) ->
    incl_discards = incl_discards or false
    subj = n.s
    unless n.links_from_found
      find_links_from_node n
    else
      n.links_from.forEach (e, i) ->
        show_link e, incl_discards

    update_state n
    force.links links_set
    restart()

  hide_links_from_node = (n) ->
    n.links_from.forEach (e, i) ->
      remove_from e, n.links_shown
      remove_from e, e.target.links_shown
      links_set.remove e
      remove_ghosts e
      update_state e.target
      update_flags e.source
      update_flags e.target

    force.links links_set
    restart()

  get_or_make_node = (subject, start_point, linked) ->
    return  unless subject
    d = get_node_by_id(subject.id)
    return d  if d
    start_point = start_point or [
      width / 2
      height / 2
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

    d.color = color_by_type(d)
    d.id = d.s.id
    add_node_ghosts d
    n_idx = add_to_array(d, nodes)
    id2n[subject.id] = n_idx
    unless linked
      n_idx = unlinked_set.acquire(d)
      id2u[subject.id] = n_idx
    else
      id2u[subject.id] = graphed_set.acquire(d)
    update_flags d
    d

  make_nodes = (g, limit) ->
    limit = limit or 0
    count = 0
    for subj of g.subjects
      console.log subj, g.subjects[subj]  if verbosity >= DEBUG
      continue  unless subj.match(ids_to_show)
      subject = g.subjects[subj]
      get_or_make_node subject, [
        width / 2
        height / 2
      ], false
      count++
      break  if limit and count >= limit

  make_links = (g, limit) ->
    limit = limit or 0
    console.log "make_links"
    nodes.some (node, i) ->
      subj = node.s
      show_links_from_node nodes[i]
      true  if (limit > 0) and (links_set.length >= limit)
    console.log "/make_links"
    restart()

  #await_the_GreenTurtle();
  hide_node_links = (node) ->
    console.log "hide_node_links(" + node.id + ")"
    node.links_shown.forEach (e, i) ->
      console.log "  ", e.id
      links_set.remove e
      if e.target is node
        remove_from e, e.source.links_shown
        update_state e.source
        update_flags e.source
      else
        remove_from e, e.target.links_shown
        update_state e.target
        update_flags e.target
      remove_ghosts e

    node.links_shown = []
    update_state node
    update_flags node

  hide_found_links = ->
    nodes.forEach (node, i) ->
      hide_node_links node  if node.name.match(search_regex)
    restart()

  discard_found_nodes = ->
    nodes.forEach (node, i) ->
      discard node  if node.name.match(search_regex)
    restart()

  show_node_links = (node) ->
    show_links_from_node node
    show_links_to_node node
    update_flags node

  show_found_links = ->
    for sub_id of G.subjects
      subj = G.subjects[sub_id]
      subj.getValues("f:name").forEach (name) ->
        if name.match(search_regex)
          node = get_or_make_node(subj, [
            cx
            cy
          ])
          show_node_links node  if node
    restart()

  toggle_links = ->
    #console.log("links",force.links());
    unless links_set.length
      make_links G
      restart()
    force.links().length

  toggle_label_display = ->
    label_all_graphed_nodes = not label_all_graphed_nodes
    tick()

  hide_all_links = ->
    nodes.forEach (node) ->
      #node.linked = false;
      #node.fixed = false;	
      unlinked_set.acquire node
      node.links_shown = []
      node.showing_links = "none"
      unlinked_set.acquire node
      update_flags node

    links_set.forEach (link) ->
      remove_ghosts link

    links_set.clear()
    chosen_set.clear()
    
    # It should not be neccessary to clear discarded_set or hidden_set()
    # because unlinked_set.acquire() should have accomplished that
    restart()


  set_status = (txt) ->
    txt = txt or ""
    unless last_status is txt
      console.log txt
      $("#status").text txt
    last_status = txt

  toggle_display_tech = (ctrl, tech) ->
    val = undefined
    tech = ctrl.parentNode.id
    if tech is "use_canvas"
      use_canvas = not use_canvas
      clear_canvas()  unless use_canvas
      val = use_canvas
    if tech is "use_svg"
      use_svg = not use_svg
      val = use_svg
    if tech is "use_webgl"
      use_webgl = not use_webgl
      val = use_webgl
    ctrl.checked = val
    tick()
    true

  unlink = (unlinkee) ->
    hide_links_from_node unlinkee
    hide_links_to_node unlinkee
    unlinked_set.acquire unlinkee
    update_flags unlinkee

  #
  #  The DISCARDED are those nodes which the user has
  #  explicitly asked to not have drawn into the graph.
  #  The user expresses this by dropping them in the 
  #  discard_dropzone.
  #
  discard = (goner) ->
    unchoose goner
    unlink goner
    
    #unlinked_set.remove(goner);
    discarded_set.acquire goner
    update_flags goner

  #goner.discarded = true;
  #goner.state = discarded_set;
  undiscard = (prodigal) ->
    #discarded_set.remove(prodigal);
    unlinked_set.acquire prodigal
    update_flags prodigal


  #
  #  The CHOSEN are those nodes which the user has
  #  explicitly asked to have the links shown for.
  #  This is different from those nodes which find themselves
  #  linked into the graph because another node has been chosen.
  # 
  unchoose = (goner) ->
    chosen_set.remove goner
    hide_node_links goner
    unlinked_set.acquire goner
    update_flags goner

  #update_history();
  choose = (chosen) ->
    # There is a flag .chosen in addition to the state 'linked'
    # because linked means it is in the graph
    chosen_set.add chosen
    show_links_from_node chosen
    show_links_to_node chosen
    if chosen.links_shown
      #chosen.state = 'linked';
      graphed_set.acquire chosen
      chosen.showing_links = "all"
    else
      #chosen.state = unlinked_set;
      unlinked_set.acquire chosen
    update_state chosen
    update_flags chosen

  #update_history();
  update_history = ->
    if history.pushState
      the_state = {}
      hash = ""
      if chosen_set.length
        the_state.chosen_node_ids = []
        hash += "#"
        hash += "chosen="
        n_chosen = chosen_set.length
        chosen_set.forEach (chosen, i) ->
          hash += chosen.id
          the_state.chosen_node_ids.push chosen.id
          hash += ","  if n_chosen > i + 1

      the_url = location.href.replace(location.hash, "") + hash
      the_title = document.title
      history.pushState the_state, the_title, the_state

  restore_graph_state = (state) ->
    #console.log('state:',state);
    return  unless state
    if state.chosen_node_ids
      reset_graph()
      state.chosen_node_ids.forEach (chosen_id) ->
        chosen = get_or_make_node(chosen_id)
        choose chosen  if chosen

  showGraph = (g) ->
    console.log "showGraph"
    make_nodes g
    restart()

  wait_for_GreenTurtle = ->
    if typeof GreenTurtle is "undefined"
      setTimeout wait_for_GreenTurtle, 200
    else
      load_file()

  await_the_GreenTurtle = ->
    try
      i = GreenTurtle.implementation
      load_file()
    catch error
      console.log error
      setTimeout await_the_GreenTurtle, 3000

  window.addEventListener "load", ->
    # This delay is to let GreenTurtle initialize
    # It would be great if there were a hook for this...
    #init_node_radius_policy()
    console.log "load_file() via 'load' listener"
    load_file()

  window.addEventListener "popstate", (event) ->
    #console.log('popstate fired',event);
    restore_graph_state event.state

  window.addEventListener "resize", updateWindow
  
  #do_tests(false)
  
#window.huviz_controller = new Huviz()
