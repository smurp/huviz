###
TreeCtrl controls TreePicker states: showing, unshowing, mixed for direct and indirect.
###
class TreeCtrl
  constructor: ->
    @state = 'unshowing'
    @indirect_state = 'unshowing'
    @subs = []
    @super_class = null
  get_state: () ->
    if not @state?
      alert "#{@id} has no direct state"
    return @state
  get_indirect_state: ->
    if not @indirect_state?
      alert "#{@id} has no indirect_state"
    return @indirect_state
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
  select: (inst) ->
    @update(inst,{select: true})
    @update_state()
  unselect: (inst) ->
    @update(inst, {select: false})
    @update_state()
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
    old_state = @state
    old_indirect_state = @indirect_state
    @recalc_states()
    if old_state isnt @state or old_indirect_state isnt @indirect_state    
      evt = new CustomEvent @custom_event_name,
          detail:
            target_id: this.lid
            target: this
            old_state: old_state
            new_state: @state
            old_indirect_state: old_indirect_state
            new_indirect_state: @indirect_state
          bubbles: true
          cancelable: true
      if @super_class?
        @super_class.update_state()
      window.dispatchEvent evt

(exports ? this).TreeCtrl = TreeCtrl
