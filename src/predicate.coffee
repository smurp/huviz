class Predicate
  constructor: (@id) ->
    @lid = @id.match(/([\w\d\_\-]+)$/g)[0] # lid means local id
    # pshown edges are those which are shown and linked to a picked source or target
    @shown_edges = SortedSet().sort_on("id").named("shown").isState("_s")
    # punshown edges are those which are unshown and linked to a picked source or target
    @unshown_edges = SortedSet().sort_on("id").named("unshown").isState("_s")
    #@all_edges = [] # FIXME not a SortedSet because edge.predicate already exists
    @picked_edges = SortedSet().sort_on("id").named("picked").isState('_p')
    @unpicked_edges = SortedSet().sort_on("id").named("unpicked").isState('_p')
    @all_edges = SortedSet().sort_on("id").named("predicate")
    @state = "hidden"
    this
  update_edge: (edge,change) ->
    if change.show?
      if change.show
        @shown_edges.acquire(edge)
      else
        @unshown_edges.acquire(edge)
    if change.pick?
      if change.pick
        @picked_edges.acquire(edge)
      else
        @unpicked_edges.acquire(edge)
    @update_state(edge,change)
  pick: (edge) ->
    @update_edge(edge,{pick:true})
    @update_state()
  unpick: (edge) ->
    @update_edge(edge,{pick:false})
    @update_state()
  add_edge: (edge) ->
    @all_edges.add(edge)
    @update_state()
  update_picked_edges: () ->
    before_count = @picked_edges.length
    for e in @all_edges  # FIXME why can @picked_edges not be trusted?
      if e.an_end_is_picked()
        @picked_edges.acquire(e)
    
  update_state: (edge,change) ->
    # FIXME fold the subroutines into this method for a single pass
    # FIXME make use of the edge and change hints in the single pass
    # terminology:
    #   picked edge:  an edge (shown or not) to or from a node in the picked_set
    # roughly: all_shown, none_shown, mixed, hidden
    #   are all the picked edges shown?
    #   are none of the picked edges shown?
    #   are strictly some of the picked edges shown?
    #   are there no picked edges?
    old_state = @state
    #console.warn "picked_edges.length",@picked_edges.length
    @update_picked_edges()
    if @picked_edges.length is 0
      @state = "hidden" # FIXME maybe "noneToShow"
    else if @only_some_picked_edges_are_shown()
      @state = "mixed" # FIXME maybe "partialShowing"?
    else if @picked_edges.length > 0 and @all_picked_edges_are_shown()
      @state = "showing" # FIXME maybe "allShowing"?
    else if @no_picked_edges_are_shown()
      @state = "unshowing" # FIXME maybe "noneShowing"?      
    else
      console.info "Predicate.update_state() should not fall thru",this
      throw "Predicate.update_state() should not fall thru (#{@lid})"
    #console.debug this.lid,old_state,"==>",@state
    if old_state isnt @state
      evt = new CustomEvent 'changePredicate',
          detail:
            target_id: this.lid
            predicate: this
            old_state: old_state
            new_state: @state
          bubbles: true
          cancelable: true
      window.dispatchEvent evt
  no_picked_edges_are_shown: () ->
    for e in @picked_edges
      if e.shown?
        return false
    return true
  all_picked_edges_are_shown: () ->
    for e in @picked_edges
      if not e.shown?
        return false
    return true
  only_some_picked_edges_are_shown: () ->
    some = false
    only = false
    shown_count = 0
    for e in @picked_edges
      #continue unless e.an_end_is_picked()
      if e.shown?
        some = true
      if not e.shown? # AKA e._s?.id isnt 'shown'
        only = true
      if only and some
        return true
    return false

(exports ? this).Predicate = Predicate