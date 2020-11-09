/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const chai = require("chai");
const {
  expect
} = chai;

const {
  FiniteStateMachine
} = require('../src/fsm');

describe("FiniteStateMachine", function() {
  class MyFSM extends FiniteStateMachine {
    static initClass() {
      this.prototype.throw_log_or_ignore = 'ignore';
      this.prototype.trace = true;
      this.prototype.transitions = {
        prepare: {
          target: 'prepared'
        },
        finish: {
          target: 'done'
        }
      };
    }
    constructor(accum) {
      super();
      this.accum = accum;
    }
    on__prepare() {
      return this.accum *= 2;
    }
    exit__prepared() {
      return this.accum *= 3;
    }
    enter__done() {
      return this.accum *= 5;
    }
  }
  MyFSM.initClass();

  it("runs transition and state methods", function() {
    const fsm = new MyFSM(1);
    fsm.trace = [];
    expect(fsm).to.be.ok;
    fsm.transit('prepare');
    expect(fsm.trace.slice(-1)[0]).to.equal('on__prepare');
    expect(fsm.accum).to.equal(2);
    fsm.transit('finish');
    expect(fsm.trace.slice(-2)[0]).to.equal('exit__prepared');
    expect(fsm.trace.slice(-1)[0]).to.equal('enter__done');
    expect(fsm.accum).to.equal(30);
  });
  it("can throw errors for missing transitions", function() {
    const fsm = new MyFSM(1);
    fsm.throw_log_or_ignore = 'throw';
    expect(() => fsm.transit('MISSING')).to.throw('MyFSM has no transition with id MISSING');
  });
  return it("can throw errors when no handling happens", function() {
    const fsm = new MyFSM(1);
    fsm.transitions.hasNoHandlers = {target: 'Erewhon'};
    fsm.throw_log_or_ignore = 'throw';
    const func = () => fsm.transit('hasNoHandlers');
    expect(func).to.throw('MyFSM had neither on__hasNoHandlers exit__undefined or enter__Erewhon');
  });
});
