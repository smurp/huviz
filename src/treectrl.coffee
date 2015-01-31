###
TreeCtrl controls TreePicker states: showing, unshowing, mixed for direct and indirect.
###
class TreeCtrl
  constructor: ->
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

(exports ? this).TreeCtrl = TreeCtrl
