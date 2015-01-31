TreeCtrl = require('treectrl').TreeCtrl

class Predicate extends TreeCtrl
  constructor: (@id) ->
    super()
    @lid = @id.match(/([\w\d\_\-]+)$/g)[0] # lid means local id
    # pshown edges are those which are shown and linked to a selected source or target
    @shown_inst = SortedSet().sort_on("id").named("shown").isState("_s")
    # punshown edges are those which are unshown and linked to a selected source or target
    @unshown_inst = SortedSet().sort_on("id").named("unshown").isState("_s")
    @selected_inst = SortedSet().sort_on("id").named("selected").isState('_p')
    @unselected_inst = SortedSet().sort_on("id").named("unselected").isState('_p')
    @all_edges = SortedSet().sort_on("id").named("predicate")
    this
  custom_event_name: 'changePredicate'    
  update: (edge, change) ->
    if change.show?
      if change.show
        @shown_inst.acquire(edge)
      else
        @unshown_inst.acquire(edge)
    if change.select?
      if change.select
        @selected_inst.acquire(edge)
      else
        @unselected_inst.acquire(edge)
    @update_state(edge,change)
  add_inst: (inst) ->
    @all_edges.add(inst)
    @update_state()
  update_selected_inst: () ->
    before_count = @selected_inst.length
    for e in @all_edges  # FIXME why can @selected_inst not be trusted?
      if e.an_end_is_selected()
        @selected_inst.acquire(e)  
  update_state: (edge,change) ->
    # FIXME fold the subroutines into this method for a single pass
    # FIXME make use of the edge and change hints in the single pass
    # terminology:
    #   selected edge:  an edge (shown or not) to or from a node in the selected_set
    # roughly: all_shown, none_shown, mixed, hidden
    #   are all the selected edges shown?
    #   are none of the selected edges shown?
    #   are strictly some of the selected edges shown?
    #   are there no selected edges?
    old_state = @state
    old_indirect_state = @indirect_state
    #console.warn "selected_inst.length",@selected_inst.length
    @update_selected_inst()
    @recalc_states()    
    if old_state isnt @state
      evt = new CustomEvent @custom_event_name,
          detail:
            target_id: this.lid
            predicate: this
            old_state: old_state
            new_state: @state
            old_indirect_state: old_indirect_state
            new_indirect_state: @indirect_state
          bubbles: true
          cancelable: true
      window.dispatchEvent evt

  recalc_direct_state: ->
    if @selected_inst.length is 0
      @state = "hidden" # FIXME maybe "noneToShow"
    else if @only_some_selected_inst_are_shown()
      @state = "mixed" # FIXME maybe "partialShowing"?
    else if @selected_inst.length > 0 and @all_selected_inst_are_shown()
      @state = "showing" # FIXME maybe "allShowing"?
    else if @no_selected_inst_are_shown()
      @state = "unshowing" # FIXME maybe "noneShowing"?      
    else
      console.info "Predicate.update_state() should not fall thru",this
      throw "Predicate.update_state() should not fall thru (#{@lid})"
      
  no_selected_inst_are_shown: () ->
    for e in @selected_inst
      if e.shown?
        return false
    return true
  all_selected_inst_are_shown: () ->
    for e in @selected_inst
      if not e.shown?
        return false
    return true
  only_some_selected_inst_are_shown: () ->
    some = false
    only = false
    shown_count = 0
    for e in @selected_inst
      #continue unless e.an_end_is_selected()
      if e.shown?
        some = true
      if not e.shown? # AKA e._s?.id isnt 'shown'
        only = true
      if only and some
        return true
    return false

(exports ? this).Predicate = Predicate
