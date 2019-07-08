uniquer = require("uniquer").uniquer

class Node
  constructor: (@id) ->
    @bub_txt = []
    @links_from = []
    @links_to = []
    @links_shown = []
    @lid = uniquer(@id)
  linked: false          # TODO(smurp) probably vestigal
  showing_links: "none"
  name: null
  s: null                # TODO(smurp) rename Node.s to Node.subject, should be optional
  type: null
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
    @taxon.update_state(this, 'select')
  unselect: () ->
    for edge in this.links_from
      edge.unselect()
    for edge in this.links_to
      edge.unselect()
    @taxon.update_state(this, 'unselect')
  discard: () ->
    # should we unselect first if node.state is selected?
    @taxon.update_state(this, 'discard')
(exports ? this).Node = Node
