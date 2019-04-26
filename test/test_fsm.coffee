
chai = require("chai")
expect = chai.expect

FiniteStateMachine = require('../src/fsm').FiniteStateMachine

describe "FiniteStateMachine", () ->
  it "runs transition and state methods", ->
    class FSM2 extends FiniteStateMachine
      constructor: (@accum) ->
        super()
      throw_log_or_ignore: 'ignore'
      trace: true
      transitions:
        prepare:
          target: 'prepared'
        finish:
          target: 'done'
      on__prepare: ->
        @accum *= 2
      exit__prepared: ->
        @accum *= 3
      enter__done: ->
        @accum *= 5

    fsm = new FSM2(1)
    fsm.trace = []
    expect(fsm).to.be.ok
    fsm.transit('prepare')
    expect(fsm.trace.slice(-1)[0]).to.equal('on__prepare')
    expect(fsm.accum).to.equal(2)
    fsm.transit('finish')
    expect(fsm.trace.slice(-2)[0]).to.equal('exit__prepared')
    expect(fsm.trace.slice(-1)[0]).to.equal('enter__done')
    expect(fsm.accum).to.equal(30)



