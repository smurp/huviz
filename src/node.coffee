class Node
  linked: false          # TODO(smurp) probably vestigal
  #links_from_found: true # TODO(smurp) deprecated because links*_found early
  #links_to_found: true   # TODO(smurp) deprecated becasue links*_found early
  showing_links: "none"
  name: null
  s: null                # TODO(smurp) rename Node.s to Node.subject, should be optional
  type: null
  constructor: (@id, use_lid_as_node_name) ->
    #console.log "new Node(",@id,")"
    @links_from = []
    @links_to = []
    @links_shown = []
    # FIXME use the as-yet-unimplemented unique-id-generator
    @lid = @id.match(/([\w\d\_\-]+)$/g)[0]
    if use_lid_as_node_name
      @name = @lid # provide default name
  set_name: (@name) ->
  set_subject: (@s) ->
  point: (point) ->
    if point?
      @x = point[0]
      @y = point[1]
    [@x,@y]
  prev_point: (point) ->
    if point?
      @px = point[0]
      @py = point[1]
    [@px,@py]
  select: () ->
    for edge in this.links_from
      edge.select()
    for edge in this.links_to
      edge.select()
    @taxon.update_node(this,{select:true})
  unselect: () ->
    for edge in this.links_from
      edge.unselect()
    for edge in this.links_to
      edge.unselect()
    @taxon.update_node(this,{select:false})
  discard: () ->
    # should we unselect first if node.state is selected?
    @taxon.update_node(this,{discard:true})
  # FIXME possibly useful, a record of which assertions a node is the context for
  # register_context_for: (edge) ->
  #   @is_context_for.push(edge)
(exports ? this).Node = Node
