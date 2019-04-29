
chai = require("chai")
expect = chai.expect

FiniteStateMachine = require('../src/fsm').FiniteStateMachine

describe "FiniteStateMachine", () ->
  class MyFSM extends FiniteStateMachine
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

  it "runs transition and state methods", ->
    fsm = new MyFSM(1)
    fsm.trace = []
    expect(fsm).to.be.ok
    fsm.transit('prepare')
    expect(fsm.trace.slice(-1)[0]).to.equal('on__prepare')
    expect(fsm.accum).to.equal(2)
    fsm.transit('finish')
    expect(fsm.trace.slice(-2)[0]).to.equal('exit__prepared')
    expect(fsm.trace.slice(-1)[0]).to.equal('enter__done')
    expect(fsm.accum).to.equal(30)
  it "can throw errors for missing transitions", ->
    fsm = new MyFSM(1)
    fsm.throw_log_or_ignore = 'throw'
    expect(() => fsm.transit('MISSING')).to.throw('MyFSM has no transition with id MISSING')
  it "can throw errors when no handling happens", ->
    fsm = new MyFSM(1)
    fsm.transitions.hasNoHandlers = {target: 'Erewhon'}
    fsm.throw_log_or_ignore = 'throw'
    func = () => fsm.transit('hasNoHandlers')
    expect(func).to.throw('MyFSM had neither on__hasNoHandlers exit__undefined or enter__Erewhon')



