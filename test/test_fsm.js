
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

import chai from 'chai';
const {
  expect
} = chai;

import {FiniteStateMachine, FSMMixin} from '../src/fsm.js';

// TODO add tests for FSMMixin

describe("FiniteStateMachine", function() {
  class MyFSM extends FiniteStateMachine {
    static initClass() {
      this.prototype.throw_or_return = 'ignore';
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

  class TTLFSM extends FiniteStateMachine {
    constructor() {
      super();
      var ttl = `
         @prefix st: <https://example.com/state/> .
         @prefix st: <https://example.com/transition/> .

         st:        tr:start     st:noVid .
         st:noVid   tr:mouseover st:inVid .
         #st:inVid   tr:mousedown st:noVid .
         st:inVid   tr:mousedown st:adjBeg .
         st:adjBeg  tr:mousemove st:adjBeg .
         st:adjBeg  tr:mouseup   st:haveBeg .
         st:haveBeg tr:mousedown st:adjEnd .
         st:adjEnd  tr:mousemove st:adjEnd .
         st:adjEnd  tr:mouseup   st:haveBegEnd .
       `;
      this.trace = [];
      this.parseMachineTTL(ttl);
    }
  }

  class TrackerFSM extends TTLFSM {
    exit__inVid             (evt) {evt.tour += " exit"}
    on__mousedown           (evt) {evt.tour += " on"}
    enter__adjBeg           (evt) {evt.tour += " enter"}
  }

  class WhenFSM extends TrackerFSM {
      when__inVid__mousedown  (evt) {evt.tour += " when"} // should dominate on__mousedown
  }

  class RPS_FSM extends FiniteStateMachine {
    constructor() {
      super();
      var ttl = `
         @prefix st: <https://example.com/state/> .
         @prefix st: <https://example.com/transition/> .

         st:          tr:start         st:rock .
         st:rock      tr:beatScissors  st:scissors .
         st:scissors  tr:beatPaper     st:paper .
         st:paper     tr:beatRock      st:rock .
       `;
      this.trace = [];
      this.parseMachineTTL(ttl);
    }
    //exit__             (evt, stateId) {evt.tour += " exit__"}
    //on__               (evt) {evt.tour += " on__"}
    enter__            (evt, stateId) {evt.tour += ` enter__(${stateId})`}
  }



/*
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
    fsm.throw_or_return = 'throw';
    expect(() => fsm.transit('MISSING')).to.throw('MyFSM has no transition with id MISSING');
  });
  it("can throw errors when no handling happens", function() {
    const fsm = new MyFSM(1);
    fsm.transitions.hasNoHandlers = {target: 'Erewhon'};
    fsm.throw_or_return = 'throw';
    const func = () => fsm.transit('hasNoHandlers');
    expect(func).to.throw('MyFSM had neither on__hasNoHandlers exit__undefined or enter__Erewhon');
  });
*/

  it("can build machines from TTL specifications", function() {
    const fsm = new TTLFSM();
    const actualStates = new Set(Object.keys(fsm._states));
    expect(actualStates).to.have.all.keys(
      '', 'noVid', 'inVid', 'adjBeg', 'haveBeg', 'adjEnd');
  });
  it("starts on state '' by default", () => {
    const fsm = new TTLFSM();
    expect(fsm.get_state()).to.equal('');
  });
  it("steps through transitions deterministically", () => {
    const fsm = new TTLFSM();
    fsm.transit('start');
    expect(fsm.get_state()).to.equal('noVid');
    fsm.transit('mouseover');
    fsm.transit('mousedown');
    fsm.transit('mousemove');
    fsm.transit('mouseup');
    fsm.transit('mousedown');
    fsm.transit('mousemove');
    fsm.transit('mouseup');
    expect(fsm.get_state()).to.equal('haveBegEnd');
  });
  it("transit() returns message if invalid transition is attempted", () => {
    const fsm = new TTLFSM();
    fsm.transit('start');
    expect(fsm.get_state()).to.equal('noVid');
    fsm.transit('mouseover');
    expect(fsm.transit('BOGUS')).to.equal("inVid has no transition with id BOGUS");
  });
  it("passes events to state and transition handlers", () => {
    const fsm = new TrackerFSM();
    fsm.transit('start');
    expect(fsm.get_state()).to.equal('noVid');
    fsm.transit('mouseover');
    var payload = {tour: 'mousedown'};
    fsm.transit('mousedown', payload);
    expect(payload.tour).to.equal("mousedown exit on enter");
  });
  it("should have when__CURSTATE__TRANS run instead of on__TRANS", () => {
    const when_fsm = new WhenFSM();
    when_fsm.transit('start');
    when_fsm.transit('mouseover');
    var when_payload = {tour: 'mousedown'};
    when_fsm.transit('mousedown', when_payload);
    expect(when_payload.tour).to.equal("mousedown exit when enter");
  });
  it("should run enter__ as fallback when specific handler missing", () => {
    const rps_fsm = new RPS_FSM();
    var payload = {tour: ''};
    rps_fsm.transit('start', payload);
    rps_fsm.transit('beatScissors', payload);
    rps_fsm.transit('beatPaper', payload);
    rps_fsm.transit('beatRock', payload);
    //console.log(rps_fsm.trace);
    expect(payload.tour).to.equal(
      " enter__(rock) enter__(scissors) enter__(paper) enter__(rock)");
  });

});
