
chai = require("chai")
expect = chai.expect

FiniteStateMachine = require('../src/fsm').FiniteStateMachine

class FSM1 extends FiniteStateMachine
  throw_log_or_ignore: 'throw'
  transitions:
    prepare:
      target: 'prepared'
    finish:
      target: 'done'
  on__prepare: ->
    console.log('on__prepare() called')
    try
      @bog_standard()
    catch e
      console.log(e)
  become__prepared: ->
    console.log('become__prepared() called')
    try
      @bog_standard()
    catch e
      console.log(e)
  leave__prepared: ->
    console.log('leave__prepared() called')
  become__done: ->
    console.log('become__done() called')
  bog_standard: ->
    console.log('bog_standard() called')

describe "FiniteStateMachine", () ->
  it "initializes nicely", ->
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
      leave__prepared: ->
        @accum *= 3
      become__done: ->
        @accum *= 5

    fsm = new FSM2(1)
    fsm.trace = []
    expect(fsm).to.be.ok
    fsm.transit('prepare')
    expect(fsm.trace.slice(-1)[0]).to.equal('on__prepare')
    expect(fsm.accum).to.equal(2)
    fsm.transit('finish')
    expect(fsm.trace.slice(-2)[0]).to.equal('leave__prepared')
    expect(fsm.trace.slice(-1)[0]).to.equal('become__done')
    expect(fsm.accum).to.equal(30)



