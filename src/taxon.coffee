TaxonBase = require('taxonbase').TaxonBase
  
class Taxon extends TaxonBase # as Predicate is to Edge, Taxon is to Node, ie: type or class or whatever
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
    # _tp is for 'taxon-pickedness' and has value picked or unpicked
    @picked_nodes = SortedSet().named('picked').isState('_tp').sort_on("id")
    @unpicked_nodes = SortedSet().named('unpicked').isState('_tp').sort_on("id")
    @lid = @id # FIXME @lid should be local @id should be uri, no?
    @state = 'unshowing'
  get_instances: () ->
    return @instances
  register: (node) ->
    # This is slightly redundant given that @add makes a bidirection link too
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
    if change.pick?
      if change.pick
        @picked_nodes.acquire(node)
      else
        @unpicked_nodes.acquire(node)
    @update_state(node,change)
  recalc_state: (node, change) ->
    # FIXME fold the subroutines into this method for a single pass
    #       respecting the node and change hints
    # FIXME CRITICAL ensure that discarded nodes can not be picked
    #       by having picking a discarded node shelve it
    if @all_nodes_are_discarded() # AKA there are no undiscarded nodes
      @state = "hidden" # 0
    else if @only_some_undiscarded_nodes_are_picked()
      @state = "mixed"  # 2
    else if @all_undiscarded_nodes_are_picked()
      @state = "showing" # 3
    else if @no_undiscarded_nodes_are_picked()
      @state = "unshowing" # 1
    else
      console.warn "Taxon.recalc_state() should not fall thru"
      @state = "unshowing"
    return @state
  all_nodes_are_discarded: () ->
    return false # FIXME should really check for this case!
  only_some_undiscarded_nodes_are_picked: () ->
    # patterned after Predicate.only_some_picked_edges_are_shown
    some = false
    only = false
    for n in @instances
      if not some and n._tp?.id is 'picked'
        some = true
      if not only and n._tp?.id isnt 'picked'
        only = true
      if only and some
        return true
    return false
  all_undiscarded_nodes_are_picked: () ->
    # patterned after Predicate.all_picked_edges_are_shown
    for n in @instances
      if n.discarded?
        continue
      if n._tp?.id isnt 'picked' # AKA: if not @picked_nodes.has(n)
        return false
    return true
  no_undiscarded_nodes_are_picked: () ->
    # no discarded node may be picked (picking undiscards them!)
    # FIXME THIS IS NOT RIGHT!!!!
    return @picked_nodes.length is 0
  
(exports ? this).Taxon = Taxon