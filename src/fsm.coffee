# FiniteStateMachine implements a simple abstract engine for running state machines.
#
# It supports optional methods for every transition and for become/leav a state.
#
# There are three kinds of methods:
# 1. on__TRANSITID called upon the commencement of the transition
# 2. exit__STATEID called when leaving a state
# 3. enter__STATEID called when becoming a state
#
# All three kinds of methods are optional.  If no method of any kind is found
# during a transition then a message is either thrown, logged or ignored based
# on the value of this.throw_log_or_ignore
#
# If there is an array at this.trace then the names of the method are pushed
# onto it as they are called.
#
# # Usage
#
#     class MyFSM extends FiniteStateMachine
#       constructor: (anything, you want) ->
#         # you can do anything you want on your FSM constructor
#       throw_log_or_ignore: 'ignore'
#       transitions:
#         start:
#           target: 'ready'
#         stop:
#           source: 'ready' # TODO respect source by raising error if an illegal transit is tried
#           target: 'stopped'
#       on__start: ->
#         console.log('on "start"')
#       exit__ready: ->
#         console.log('leave "ready"')
#       enter__stopped: ->
#         console.log('become "stopped"')
#
#     myFSM = new MyFSM()
#     myFSM.transit('start') ==> 'on "start"', 'leave "ready"'
#     myFSM.get_state() ==> 'ready'
#     myFSM.transit('stop') ==> 'become "stopped"'
#

# Notes:
#   suitable for use as a mixin
#   https://coffeescript-cookbook.github.io/chapters/classes_and_objects/mixins
class FiniteStateMachine
  call_method_by_name: (meth_name) ->
    if (meth = Reflect.get(this, meth_name))
      meth.call(this)
      if @trace
        @trace.push(meth_name)
      return true
    return false
  set_state: (state) ->
    # call a method when arriving at the new state, if it exists
    called = @call_method_by_name('enter__' + state)
    @state = state # set after calling meth_name so the old state is available to it
    return called
  exit_state: ->
    # call a method when leaving the old state, if it exists
    return @call_method_by_name('exit__' + @state)
  get_state: ->
    return @state
  is_state: (candidate) ->
    return @state is candidate
  make_noop_msg: (trans_id, old_state, new_state) ->
    return this.constructor.name + " had neither " +
           "on__#{trans_id} exit__#{old_state} or enter__#{new_state}"
  transit: (trans_id) ->
    @transitions ?= {}
    if (transition = @transitions[trans_id])
      called = @call_method_by_name('on__'+trans_id)
      msg = @make_noop_msg(trans_id, @state, target_id)
      called = @exit_state() or called
      if (target_id = transition.target)
        called = @set_state(target_id) or called
      if not called
        throw_log_or_ignore = @throw_log_or_ignore or 'ignore'
        if throw_log_or_ignore is 'throw'
          throw new Error(msg)
        else if throw_log_or_ignore is 'log'
          console.log(msg)
      return
    else
      throw new Error("#{this.constructor.name} has no transition with id #{trans_id}")

(exports ? this).FiniteStateMachine = FiniteStateMachine
