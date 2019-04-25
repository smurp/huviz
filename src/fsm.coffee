# FiniteStateMachine has states and transitions between them with custom handlers
#
# Transitions are POJOs (Plain Old Javascript Objects) with keys:
#   id, targetState, handler and (optionally) sourceState
#
# Notes:
#   suitable for use as a mixin
#   https://coffeescript-cookbook.github.io/chapters/classes_and_objects/mixins
class FiniteStateMachine
  set_state: (state) ->
    called = false
    meth_name = 'become__' + state
    if (method = this[meth_name])
      method.bind(this)
      console.info('called', meth_name)
      method.call()
      called = true
    @state = state # set after calling meth_name so the old state is available to it
    return called
  get_state: ->
    return @state
  is_state: (candidate) ->
    return @state is candidate
  get_transit_handler_name: (transit_id) ->
    return 'on__' + transit_id
  transit: (trans_id) ->
    @transitions ?= {}
    called = false
    if (transition = @transitions[trans_id])
      transit_handler_name = @get_transit_handler_name(trans_id)
      if (transit_handler = this[transit_handler_name])
        transit_handler.bind(this)
        transit_handler.call()
        console.info('called',transit_handler_name)
        called = true
      if (target_id = transition.target)
        before_state_name = 'become__' + target_id
        called = @set_state(target_id) or called
      if not called
        msg = "FiniteStateMachine #{@id or ''} had neither #{transit_handler_name} or #{before_state_name}"
        console.log(this)
        throw new Error(msg)
      return
    else
      throw new Error("FiniteStateMachine #{@id or ''} has no transition with id #{trans_id}")

(exports ? this).FiniteStateMachine = FiniteStateMachine
