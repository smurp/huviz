TreeCtrl = require('treectrl').TreeCtrl
uniquer = require("uniquer").uniquer

class Predicate extends TreeCtrl
  constructor: (@id) ->
    super
    @lid = uniquer(@id) # lid means local_id
    @all_edges = SortedSet().sort_on("id").named("predicate")
    # TODO check for .acquire() bugs re isState('_s') vs isState('_p')
    @selected_instances = SortedSet().sort_on("id").named("selected").isState('_p')
    @unselected_instances = SortedSet().sort_on("id").named("unselected").isState('_p')
    # shown edges are those which are shown and linked to a selected source or target
    @shown_instances = SortedSet().sort_on("id").named("shown").isState("_s")
    # unshown edges are those which are unshown and linked to a selected source or target
    @unshown_instances = SortedSet().sort_on("id").named("unshown").isState("_s")
    @change_map =
      unselect: @unselected_instances
      select: @selected_instances
      unshow: @unshown_instances
      show: @shown_instances
    this
  custom_event_name: 'changePredicate'
  add_inst: (inst) ->
    @all_edges.add(inst)
    @update_state()
  update_selected_instances: () ->
    before_count = @selected_instances.length
    for e in @all_edges  # FIXME why can @selected_instances not be trusted?
      if e.an_end_is_selected()
        @selected_instances.acquire(e)
  update_state: (inst, change) ->
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
    super(inst, change)
  recalc_direct_stats: ->
    return [@count_shown_selected(), @selected_instances.length]
  count_shown_selected: ->
    count = 0
    for e in @selected_instances
      count++ if e.shown?
    return count

(exports ? this).Predicate = Predicate
