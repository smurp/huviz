#
#  started from: 
#    Collapsible Radial Reingold-Tilford
#      http://jsfiddle.net/Nivaldo/CbGh2/
#

class CollapsibleRadialReingoldTilfordTree
  root = undefined
  tree = undefined
  EDGE_LENGTH = 50
  CONTAINER = null
  diameter = 300
  svg = undefined
  i = 0
  duration = 350
  width = 100
  height = 100
  diagonal = undefined
  use_ids_as_names = false
  selector = null

  set_center = (center_point) ->
    root.x0 = center_point.x or center_point[0]
    root.y0 = center_point.y or center_point[1]    
                                                
  update = (source) ->
    # Compute the new tree layout.
    nodes = tree.nodes(root)
    links = tree.links(nodes)
    
    # Normalize for fixed-depth.
    nodes.forEach (d) ->
      d.y = d.depth * EDGE_LENGTH

    
    # Update the nodes…
    node = svg.selectAll("g.node").data(nodes, (d) ->
      d.id or (d.id = ++i)
    )
    
    # Enter any new nodes at the parent's previous position.
    
    #.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
    nodeEnter = node.enter().append("g").attr("class", "node").on("click", click)
    nodeEnter.append("circle").attr("r", 1e-6).style "fill", (d) ->
      (if d._children then "lightsteelblue" else "#fff")

    
    #.attr("transform", function(d) { return d.x < 180 ? "translate(0)" : "rotate(180)translate(-" + (d.name.length * 8.5)  + ")"; })
    nodeEnter.append("text").attr("x", 10).attr("dy", ".35em").attr("text-anchor", "start").text((d) ->
      d.name
    ).style "fill-opacity", 1e-6
    
    # Transition nodes to their new position.
    nodeUpdate = node.transition().duration(duration).attr("transform", (d) ->
      "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"
    )
    nodeUpdate.select("circle").attr("r", 4.5).style "fill", (d) ->
      (if d._children then "lightsteelblue" else "#fff")

    nodeUpdate.select("text").style("fill-opacity", 1).attr "transform", (d) ->
      (if d.x < 180 then "translate(0)" else "rotate(180)translate(-" + (d.name.length + 50) + ")")

    
    # TODO: appropriate transform
    
    #.attr("transform", function(d) { return "diagonal(" + source.y + "," + source.x + ")"; })
    nodeExit = node.exit().transition().duration(duration).remove()
    nodeExit.select("circle").attr "r", 1e-6
    nodeExit.select("text").style "fill-opacity", 1e-6
    
    # Update the links…
    link = svg.selectAll("path.link").data(links, (d) ->
      d.target.id
    )
    
    # Enter any new links at the parent's previous position.
    link.enter().insert("path", "g").attr("class", "link").attr "d", (d) ->
      o =
        x: source.x0
        y: source.y0

      
      diagonal
        source: o
        target: o

    # Transition links to their new position.
    link.transition().duration(duration).attr "d", diagonal
    
    # Transition exiting nodes to the parent's new position.
    link.exit().transition().duration(duration).attr("d", (d) ->
      o =
        x: source.x
        y: source.y

      diagonal
        source: o
        target: o

    ).remove()
    
    # Stash the old positions for transition.
    nodes.forEach (d) ->
      d.x0 = d.x
      d.y0 = d.y

  # Toggle children on click.
  click = (d) ->
    if d.children
      d._children = d.children
      d.children = null
    else
      d.children = d._children
      d._children = null
    update d

  # Collapse nodes
  collapse = (d) ->
    if d.children
      d._children = d.children
      d._children.forEach collapse
      d.children = null
  
  show = (txt) ->
    d3.select('body').append('pre').text(txt)

  #"orlando_tag_tree_PRETTY.json"
  init_tree: (root) =>
    console.log 'init_tree',root
    #set_center([width/2,height/2])
    set_center([height/2, 0])
    #root.children.forEach collapse
    @collapse()
    update root    

  collapse: () =>
    root.children.forEach collapse
    
  import_mintree: (error,data) =>
    if error
      return console.warn(error)
    if data.name
      root = data
    else
      use_ids_as_names = true
      root = mintree2d3tree data,{name: 'Edges',children: []},use_ids_as_names
      #show(JSON.stringify(root,null,4))
    @init_tree(root)

  init_graphics: () ->
    CONTAINER = document.getElementById(selector)
    console.log "CONTAINER", CONTAINER

    diameter = Math.max(500, Math.min(CONTAINER.getAttribute("clientHeight"), CONTAINER.getAttribute("clientWidth")))
    #diameter = Math.min(CONTAINER.getAttribute("clientHeight"), CONTAINER.getAttribute("clientWidth"))
    #CONTAINER.innerHTML = "diameter:" + diameter

    width = diameter
    height = diameter

    svg = d3.select(CONTAINER).append("svg").
      attr("width", width).
      attr("height", height).
      append("g").
      attr("transform",
        "translate(" + diameter / 2 + "," + diameter / 2 + ")")
        
  show_tree_in: (data_url_or_tree,sel,use_ids) =>
    selector = sel
    if not CONTAINER
      @init_graphics()
      
    if typeof data_url_or_tree == typeof ''
      data_url = data_url_or_tree
      console.log('data_url',data_url)
    else
      data_tree = data_url_or_tree
      console.log('data_tree',data_tree)      
    
    use_ids_as_names = use_ids or false
    console.log('use_ids_as_names',use_ids_as_names)

    tree = d3.layout.tree().
      size([360,diameter / 2 - 80]).
      separation (a, b) ->
        ((if a.parent is b.parent then 1 else 10)) / a.depth

    diagonal = d3.svg.diagonal.radial().projection (d) ->
      [d.y, d.x / 180 * Math.PI]

    if data_url
      d3.json data_url, @import_mintree, (err) -> alert err
    else
      root = data_tree
      @init_tree(root)      

    return 'youch'
    #d3.select(self.frameElement).style "height", "800px"

(typeof exports is 'undefined' and window or exports).CollapsibleRadialReingoldTilfordTree = CollapsibleRadialReingoldTilfordTree