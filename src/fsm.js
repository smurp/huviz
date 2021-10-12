/*
 FiniteStateMachine implements a simple abstract engine for running state machines.

 It supports optional methods for every transition and for become/leav a state.

 There are three kinds of methods:

 1. exit__STATEID called when leaving the old state
 2. on__TRANSITID called between exit__oldStateId and enter__newStateId
 3. enter__STATEID called when becoming the new state

 All three kinds of methods are optional.  If no method of any kind is found
 during a transition then a message is either thrown, logged or ignored based
 on the value of this.throw_or_return

 If there is an array at this.trace then the names of the method are pushed
 onto it as they are called.
*/
function strip(s) {
  return s.replace(/^\s+|\s+$/g, '');
}

// https://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
// https://stackoverflow.com/a/42250080  a Mixin strategy


/*
  Usage:
      class WhateverWithFSM extends FSMMixin(Whatever) {}
      class SubclassOfFiniteStateMachine extends FiniteStateMachine {}
 */
export let FSMMixin = (superclass) => class extends superclass {
  parseMachineTTL(ttl, defaultFirstStateId = '') {
    /*
     * This is not a fully general TTL parser.
     * It expects
     *   - every triple to be on its own line.
     *   - every term to be a CURIE
     *   - no literals
     *   - trailing comments OK
     * It ignores @prefixes so the incoming TTL can be legit.
     # Example:

         @prefix st: <https://example.com/state/> .
         @prefix tr: <https://example.com/transition/> .

         st:        tr:start     st:noVid . # state machines should start at st:
         st:noVid   tr:mouseover st:inVid .
         #st:inVid   tr:mousedown st:noVid .
         st:inVid   tr:mousedown st:adjBeg .
         st:adjBeg  tr:mousemove st:adjBeg .
         st:adjBeg  tr:mouseup   st:haveBeg .
         st:haveBeg tr:mousedown st:adjEnd .
         st:adjEnd  tr:mousemove st:adjEnd .
         st:adjEnd  tr:mouseup   st:haveBegEnd .

     */
    this.machineTTL = ttl;
    var lines = ttl.split("\n");
    var firstStateId;
    lines.forEach((line) => {
      var comment, line;
      line = strip(line);
      [line, comment] = line.split('#');
      //if (comment) { console.log({comment}) }
      if (!line.length || line.startsWith('@')) { return }
      var match = line.match(
        /^(?<subj>st:\w*)\s+(?<pred>tr:\w+)\s+(?<obj>st:\w*)\s*\.$/);
      if (match && match.length) {
        var trx = match.groups;
        var fromStateId = trx.subj.replace('st:', '');
        if (firstStateId == undefined) {
          firstStateId = fromStateId;
        }
        var transId = trx.pred.replace('tr:','');
        var toStateId = trx.obj.replace('st:','');
        var fromStateObj = this.get_or_create_state(fromStateId);
        if (fromStateObj[transId]) {
          throw new Error([`${fromStateId}-${transId}-${toStateId}`,
                           `COLLIDES WITH`,
                           `${fromStateId}-${transId}-${fromStateObj[transId]}`
                          ].join(' '))
        }
        fromStateObj[transId] = toStateId;
        var toStateObj = this.get_or_create_state(toStateId); // just to ensure it exists
      }
    });
    if (firstStateId != defaultFirstStateId) {
      console.warn(`${firstStateId} <> ${defaultFirstStateId}`);
    }
    //console.log(`ABOUT TO INIT STATE using set_state('${firstStateId}')`)
    var bogusEvent = {};
    this.set_state(firstStateId, bogusEvent); // normally '' but could be something else
  }
  get_or_create_state(state_id, returnCreated=false) {
    this.ensure_states();
    var state_obj = this._states[state_id];
    var created = !state_obj;
    if (created) {
      state_obj = this._states[state_id] = {};
    }
    if (returnCreated) {
      return [state_obj, created];
    } else {
      return state_obj;
    }
  }
  ensure_states() {
    if (!this._states) {
      this._states = {};
    }
  }
  _debug_or_trace(which, meth_name, id) {
    var showId = meth_name.endsWith('_') && id || '';
    var msg = `${which} ${this.constructor.name}.${meth_name}(${showId})`;
    if (this._debug) {
      console.debug(msg);
    }
    if (this.trace) {
      this.trace.push(msg);
    }
  }
  call_method_by_name(meth_name, evt, stateOrTransitId) {
    let meth;
    if (meth = this[meth_name]) {
      this._debug_or_trace(`called`, meth_name, stateOrTransitId);
      meth.call(this, evt, stateOrTransitId);
      if (this.trace) {
        this.trace.push(meth_name + ' called');
      }
      return true;
    } else {
      this._debug_or_trace('missed', meth_name, stateOrTransitId);
    }
    return false;
  }
  set_state(stateId, evt) {
    // call a method when arriving at the new state, if it exists
    var called = this.enter_state(evt, stateId);
    this.state = stateId; // set after calling meth_name so the old stateId is avail
    return called;
  }
  exit_state(evt, stateId) {
    // call a method when leaving the old state, if it exists
    var called;
    var prefix = 'exit__';
    called = this.call_method_by_name(prefix + stateId, evt, stateId);
    if (!called) {
      called = this.call_method_by_name(prefix, evt, stateId);
    }
    return called;
  }
  on_transition(evt, transId, called) {
    called = this.call_method_by_name('on__'+transId, evt) || called;
    if (!called) {
      called = this.call_method_by_name('on__', evt, transId) || called;
      // do not catch any error, let it get caught normally
    }
    return called;
  }
  enter_state(evt, stateId) {
    var called;
    called = this.call_method_by_name('enter__' + stateId, evt, stateId);
    if (!called) {
      called = this.call_method_by_name('enter__', evt, stateId);
    }
    return called;
  }
  get_state() {
    return this.state;
  }
  is_state(candidate) {
    return this.state === candidate;
  }
  make_noop_msg(trans_id, old_state, new_state) {
    return this.constructor.name + " had neither " +
           `on__${trans_id} exit__${old_state} or enter__${new_state || ''}`;
  }
  throw_or_return_msg(msg) {
    const throw_or_return = this.throw_or_return || 'return';
    if (throw_or_return === 'throw') {
      throw new Error(msg);
    } else if (throw_or_return.startsWith('return')) {
      if (throw_or_return == 'returnAndWarn') {
        console.warn(msg);
      }
      return msg;
    }
  }
  transit(transId, evt) {
    /*
      Call methods (if they exist) in the order:
      1) CALL exit__<currentStateId>()
           OR exit__()
      2) CALL when__<currentStateId>__<transId>()
           OR on__<transId>()
           OR on__()
      3) CALL enter__<targetStateId>()
           OR enter__()
    */
    var currentStateId = this.get_state();
    var currentStateObj = this._states[currentStateId];
    if (currentStateObj) {
      var targetStateId = currentStateObj[transId];
      /*
      if (!targetStateId) {
        return this.throw_or_return_msg(
          `${currentStateId} has no transition with id ${transId}`);
      }
      */
      // call exit__<currentStateId> if it exists
      var calledExit, calledWhen, calledOn, calledEnter;
      calledExit = this.exit_state(evt, currentStateId);
      var when_meth_name = `when__${currentStateId}__${transId}`;
      calledWhen = this.call_method_by_name(when_meth_name, evt);
      if (!calledWhen) {
        // call on__<transId> if it exists
        calledOn = this.on_transition(evt, transId, false);
      }
      // call exit__<targetStateId>
      calledEnter = this.set_state(targetStateId, evt);
      var called = calledExit || calledWhen || calledOn || calledEnter;
      if (!called) {
        const msg = this.make_noop_msg(transId, currentStateId, targetStateId);
        return this.throw_or_return_msg(msg);
      }
      if (evt.stopPropagation) {
        evt.stopPropagation();
      }
      return called;
    } else {
      this.throw_or_return_msg(
        `${this.constructor.name} has no state with id ${currentStateId}`);
    }
  }
};

// Also export a plain class which is NOT a Mixin
export class FiniteStateMachine extends FSMMixin(Object) {}
