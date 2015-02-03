###
TreeCtrl controls TreePicker states: showing, unshowing, mixed for direct and indirect.

 Elements may be in one of these states:
   mixed      - some instances of the node class are selected, but not all
   unshowing  - there are instances but none are selected
   showing    - there are instances and all are selected
   abstract   - there are no instances (but presumably there are subs)
   (empty)    - is empty a better name for taxon with no direct members?
                Perhaps 'empty' is a legal direct-state and 'abstract' is only
                sensible as an indirect-state? Do these distinctions make
                sense in both the Taxon context and the Predicate context?

 What about these theoretical states?
   hidden     - TBD: not sure when hidden is appropriate
                perhaps abstract predicate subtrees should be hidden
                ie "there is nothing interesting here, move along"
   emphasized - TBD: mark the class of the focused_node
   

 Are these states only meaningful in the MVC View context and not the
 Model context? -- where the model context is Taxon and/or Predicate
 while the View context is the TreePicker.  Likewise 'collapse' is
 concept related to the View.  OK so we have View verbs such as:
 * hide
 * emphasize
 * collapse
 * pick (click?)
 and Model verbs such as:


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
    return
  recalc_indirect_state: () ->
    if @subs.length is 0
      return @state
    if @state is 'mixed'
      return 'mixed'
    consensus = @state # variable for legibility and performance
    for kid in @subs
      kid_ind_stt = kid.get_indirect_state()
      #  debugger
      if kid_ind_stt isnt consensus
        if consensus in ['empty', 'hidden']
          consensus = kid_ind_stt
        else if kid_ind_stt not in ['empty', 'hidden']
          return "mixed"
    return consensus
  update_state: (inst, change) ->
    if inst?
      @change_map[change].acquire(inst)
    else
      alert("update_state should be called with (inst, change)")
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
    if old_indirect_state isnt @indirect_state and old_indirect_state is 'abstract'
      console.log @lid, "was abstract"
    if old_state isnt @state or old_indirect_state isnt @indirect_state
      if window.suspend_updates
        return

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
      window.dispatchEvent evt
      if @super_class?
        @super_class.update_state()

(exports ? this).TreeCtrl = TreeCtrl
