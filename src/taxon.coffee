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
    # _tp is for 'taxon-pickedness' and has value selected, unselected or discarded
    #   (should probably be _ts for 'taxon-state'
    @selected_nodes = SortedSet().named('selected').isState('_tp').sort_on("id")
    @unselected_nodes = SortedSet().named('unselected').isState('_tp').sort_on("id")
    @discarded_nodes = SortedSet().named('discarded').isState('_tp').sort_on("id")
    @lid = @id # FIXME @lid should be local @id should be uri, no?
    @state = 'unshowing'
    @indirect_state = 'unshowing'
    @subs = []
    @super_class = null
  register_superclass: (super_class) ->
    if super_class is this
      return
    if @super_class?
      @super_class.remove_subclass(this)
    @super_class = super_class
    @super_class.register_subclass(this)
  remove_subclass: (sub_class) ->
    idx = @subs.indexOf(sub_class)
    if idx > -1
      @subs.splice(idx, 1)
  register_subclass: (sub_class) ->
    @subs.push(sub_class)
  get_instances: (hier) ->
    if hier
      retval = []
      for inst in @get_instances(false)
        retval.push(inst)
      for sub in @subs
        for inst in sub.get_instances(true)
          retval.push(inst)
    else
      return @instances
  register: (node) ->
    # Slightly redundant given that @add makes a bidirectional link too
    # but the .taxon on node gives it access to the methods on the taxon.
    # Perhaps taxon should be a super of SortedSet rather than a facade.
    # Should Taxon delegate to SortedSet?
    node.taxon = this
    @add(node)
  add: (node) ->
    @instances.add(node)
  update_node: (node,change) ->
    # like Predicates, fully selected onselect?
    # should hidden and/or discarded taxons be invisible?
    old_node_state = node._tp
    if change.select?
      if change.select
        @selected_nodes.acquire(node)
      else
        @unselected_nodes.acquire(node)
    if change.discard?
      @discarded_nodes.acquire(node)
    new_node_state = node._tp
    @update_state()
  recalc_states: ->
    @state = @recalc_direct_state()
    @indirect_state = @recalc_indirect_state()
  recalc_indirect_state: () ->
    if @subs.length is 0
      return @state
    if @state is 'mixed'
      return 'mixed'
    consensus = @state # variable for legibility and performance
    for kid in @subs
      if kid.get_indirect_state() isnt consensus
        return "mixed"
    return consensus
  recalc_direct_state: ->
    if @selected_nodes.length + @unselected_nodes.length is 0
      return "unshowing" #"hidden"
    if @selected_nodes.length > 0 and @unselected_nodes.length > 0
      return "mixed"
    if @unselected_nodes.length is 0
      return "showing"
    if @selected_nodes.length is 0
      return "unshowing"
    else
      throw "Taxon[#{@id}].recalc_state should not fall thru, #selected:#{@selected_nodes.length} #unselected:#{@unselected_nodes.length}"
    return
  recalc_english: (in_and_out) ->
    if @indirect_state is 'showing'
      phrase = @lid
      if @subs.length > 0
        phrase = "every " + phrase      
      in_and_out.include.push phrase
    else
      if @indirect_state is 'mixed'
        if @state is 'mixed'
          if @selected_nodes.length < @unselected_nodes.length
            for n in @selected_nodes
              in_and_out.include.push n.lid
          else
            in_and_out.include.push @id
            for n in @unselected_nodes
              in_and_out.exclude.push n.lid
        else if @state is 'showing'
          in_and_out.include.push @lid
        for sub in @subs
          sub.recalc_english(in_and_out)
    return

(exports ? this).Taxon = Taxon
