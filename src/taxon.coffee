# import angliciser from 'angliciser.js' // TODO use as module
TreeCtrl = require('treectrl').TreeCtrl

class Taxon extends TreeCtrl
  # as Predicate is to Edge, Taxon is to Node, ie: type or class or whatever
  # Taxon actually contains Nodes directly, unlike TaxonAbstract (what a doof!)
  suspend_updates: false
  custom_event_name: 'changeTaxon'
  constructor: (@id, @lid) ->
    super()
    @lid ?= @id # FIXME @lid should be local @id should be uri, no?
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
    @discarded_instances = SortedSet().named('discarded').isState('_tp').sort_on("id")
    @selected_instances = SortedSet().named('selected').isState('_tp').sort_on("id")
    @unselected_instances = SortedSet().named('unselected').isState('_tp').sort_on("id")
    @change_map =
      discard: @discarded_instances
      select: @selected_instances
      unselect: @unselected_instances
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
    node.taxons ?= []
    node.taxons.push(this)
    node.taxon = this
    @acquire(node)
  acquire: (node) ->
    @instances.acquire(node)
  recalc_direct_stats: ->
    return [@selected_instances.length, @instances.length]
  recalc_english: (in_and_out) ->
    if @indirect_state is 'showing'
      phrase = @lid
      if @subs.length > 0
        phrase = "every " + phrase
      in_and_out.include.push phrase
    else
      if @indirect_state is 'mixed'
        if @state is 'showing'
          in_and_out.include.push(@lid)
        if @state is 'mixed'
          if @selected_instances.length < @unselected_instances.length
            for n in @selected_instances
              in_and_out.include.push(n.lid)
          else
            in_and_out.include.push(@id)
            for n in @unselected_instances
              in_and_out.exclude.push(n.lid)
        for sub in @subs
          sub.recalc_english(in_and_out)
    return
  update_english: () ->
    if @id isnt "Thing"
      console.error "update_english(#{@lid}) should only be called on Thing"
    in_and_out =
      include: []
      exclude: []
    @recalc_english(in_and_out)
    evt = new CustomEvent 'changeEnglish',
      detail:
        english: @english_from(in_and_out)
      bubbles: true
      cancelable: true
    window.dispatchEvent evt
  english_from: (in_and_out) ->
    english = angliciser(in_and_out.include)
    if in_and_out.exclude.length
      english += " except " + angliciser(in_and_out.exclude, " or ")
    return english

(exports ? this).Taxon = Taxon
