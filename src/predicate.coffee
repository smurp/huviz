TreeCtrl = require('treectrl').TreeCtrl

class Predicate extends TreeCtrl
  constructor: (@id) ->
    super()
    @lid = @id.match(/([\w\d\_\-]+)$/g)[0] # lid means local id
    @all_edges = SortedSet().sort_on("id").named("predicate")
    @selected_instances = SortedSet().sort_on("id").named("selected").isState('_p')
    # shown edges are those which are shown and linked to a selected source or target
    @shown_instances = SortedSet().sort_on("id").named("shown").isState("_s")
    # unshown edges are those which are unshown and linked to a selected source or target    
    @unshown_instances = SortedSet().sort_on("id").named("unshown").isState("_s")
    @unselected_instances = SortedSet().sort_on("id").named("unselected").isState('_p')
    this
  custom_event_name: 'changePredicate'    
  update: (inst, change) ->
    if change.show?
      if change.show
        @shown_instances.acquire(inst)
      else
        @unshown_instances.acquire(inst)
    if change.select?
      if change.select
        @selected_instances.acquire(inst)
      else
        @unselected_instances.acquire(inst)
    @update_state()
  add_inst: (inst) ->
    @all_edges.add(inst)
    @update_state()
  update_selected_instances: () ->
    before_count = @selected_instances.length
    for e in @all_edges  # FIXME why can @selected_instances not be trusted?
      if e.an_end_is_selected()
        @selected_instances.acquire(e)  
  update_state: ->
    # FIXME fold the subroutines into this method for a single pass
    # FIXME make use of the edge and change hints in the single pass
    # terminology:
    #   selected edge:  an edge (shown or not) to or from a node in the selected_set
    # roughly: all_shown, none_shown, mixed, hidden
    #   are all the selected edges shown?
    #   are none of the selected edges shown?
    #   are strictly some of the selected edges shown?
    #   are there no selected edges?
    @update_selected_instances()
    super()
  recalc_direct_state: ->
    if @selected_instances.length is 0
      return "hidden" # FIXME maybe "noneToShow"
    else if @only_some_selected_instances_are_shown()
      return "mixed" # FIXME maybe "partialShowing"?
    else if @selected_instances.length > 0 and @all_selected_instances_are_shown()
      return "showing" # FIXME maybe "allShowing"?
    else if @no_selected_instances_are_shown()
      return "unshowing" # FIXME maybe "noneShowing"?      
    else
      console.info "Predicate.update_state() should not fall thru",this
      throw "Predicate.update_state() should not fall thru (#{@lid})"
  no_selected_instances_are_shown: () ->
    for e in @selected_instances
      if e.shown?
        return false
    return true
  all_selected_instances_are_shown: () ->
    for e in @selected_instances
      if not e.shown?
        return false
    return true
  only_some_selected_instances_are_shown: () ->
    some = false
    only = false
    shown_count = 0
    for e in @selected_instances
      #continue unless e.an_end_is_selected()
      if e.shown?
        some = true
      if not e.shown? # AKA e._s?.id isnt 'shown'
        only = true
      if only and some
        return true
    return false

(exports ? this).Predicate = Predicate
