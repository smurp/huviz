TaxonBase = require('taxonbase').TaxonBase
  
class Taxon extends TaxonBase
  # as Predicate is to Edge, Taxon is to Node, ie: type or class or whatever
  # Taxon actually contains Nodes directly, unlike TaxonAbstract (what a doof!)
  constructor: (@id) ->
    super()
    # FIXME try again to conver Taxon into a subclass of SortedSet
    #   Motivations
    #     1) remove redundancy of .register() and .add()
    #   Problems encountered:
    #     1) SortedSet is itself not really a proper subclass of Array.
    #        Isn't each instance directly adorned with methods like isState?
    #     2) Remember that d3 might need real Array instances for nodes, etc
    @instances = SortedSet().named(@id).isState('_isa').sort_on("id") # FIXME state?
    # _tp is for 'taxon-pickedness' and has value picked, unpicked or discarded
    #   (should probably be _ts for 'taxon-state'
    @picked_nodes = SortedSet().named('picked').isState('_tp').sort_on("id")
    @unpicked_nodes = SortedSet().named('unpicked').isState('_tp').sort_on("id")
    @discarded_nodes = SortedSet().named('discarded').isState('_tp').sort_on("id")
    @lid = @id # FIXME @lid should be local @id should be uri, no?
    @state = 'unshowing'
  get_instances: () ->
    return @instances
  register: (node) ->
    # This is slightly redundant given that @add makes a bidirectional link too
    # but the .taxon on node gives it access to the methods on the taxon
    # perhaps taxon should be a super of SortedSet rather than a facade.
    # Should Taxon delegate to SortedSet?
    node.taxon = this
    @add(node)
  add: (node) ->
    @instances.add(node)
  update_node: (node,change) ->
    # like Predicates, fully picked onpick?
    # should hidden and/or discarded taxons be invisible?
    old_node_state = node._tp
    if change.pick?
      if change.pick
        @picked_nodes.acquire(node)
      else
        @unpicked_nodes.acquire(node)
    if change.discard?
      @discarded_nodes.acquire(node)
    new_node_state = node._tp
    @update_state(node, change, old_node_state, new_node_state)
  recalc_state: (node, change, old_node_state, new_node_state) ->
    settheory = @recalc_state_using_set_theory(node, change, old_node_state, new_node_state)
    @state = settheory
    return @state
  recalc_state_using_set_theory: (node, change, old_node_state, new_node_state) ->
    if @picked_nodes.length + @unpicked_nodes is 0
      return "hidden"
    if @picked_nodes.length > 0 and @unpicked_nodes.length > 0
      return "mixed"
    if @unpicked_nodes.length is 0
      return "showing"
    if @picked_nodes.length is 0
      return "unshowing"
    else
      throw "Taxon[#{@id}].recalc_state should not fall thru, #picked:#{@picked_nodes.length} #unpicked:#{@unpicked_nodes.length}"
  recalc_english: (in_and_out) ->
    if @state is 'showing'
      in_and_out.include.push @id
    else if @state is 'unshowing'
      # uh what?
    else if @state is 'mixed'
      if @picked_nodes.length < @unpicked_nodes.length
        for n in @picked_nodes
          in_and_out.include.push n.id
      else
        in_and_out.include.push @id
        for n in @unpicked_nodes
          in_and_out.exclude.push n.id

(exports ? this).Taxon = Taxon