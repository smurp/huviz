/*
 FiniteStateMachine implements a simple abstract engine for running state machines.

 It supports optional methods for every transition and for become/leav a state.

 There are three kinds of methods:
 1. on__TRANSITID called upon the commencement of the transition
 2. exit__STATEID called when leaving a state
 3. enter__STATEID called when becoming a state

 All three kinds of methods are optional.  If no method of any kind is found
 during a transition then a message is either thrown, logged or ignored based
 on the value of this.throw_log_or_ignore

 If there is an array at this.trace then the names of the method are pushed
 onto it as they are called.
*/
function strip(s) {
  return s.replace(/^\s+|\s+$/g, '');
}

// https://stackoverflow.com/a/42250080  a Mixin strategy
export class FiniteStateMachine {
  parseMachineTTL(ttl, defaultFirstStateId = 'st_') {
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
        var fromStateId = trx.subj.replace(':','_');
        firstStateId = firstStateId || fromStateId;
        var transId = trx.pred.replace(':','_');
        var toStateId = trx.obj.replace(':','_');
        var fromStateObj = this.get_or_create_state(fromStateId);
        //console.log({line, fromStateId, transId, toStateId});
        if (fromStateObj[transId]) {
          throw new Error([`${fromStateId}-${transId}-${toStateId}`,
                           `COLLIDES WITH`,
                           `${fromStateId}-${transId}-${fromStateObj[transId]}`
                          ].join(' '))
        }
        fromStateObj[transId] = toStateId;
      }
    });
    if (firstStateId != defaultFirstStateId) {
      console.warn(`${firstStateId} <> ${defaultFirstStateId}`);
    }
    this.set_state(firstStateId);
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
      // ensure t
      this._states = {};
    }
  }
  call_method_by_name(meth_name) {
    let meth;
    if (meth = this[meth_name]) {
    //if (meth = Reflect.get(this, meth_name))
      meth.call(this);
      if (this.trace) {
        this.trace.push(meth_name + ' called');
      }
      return true;
    } else {
      if (this.trace) {
        this.trace.push(meth_name + ' missing');
      }
    }
    return false;
  }
  set_state(state) {
    // call a method when arriving at the new state, if it exists
    const called = this.call_method_by_name('enter__' + state);
    this.state = state; // set after calling meth_name so the old state is available to it
    return called;
  }
  exit_state() {
    // call a method when leaving the old state, if it exists
    return this.call_method_by_name('exit__' + this.state);
  }
  get_state() {
    return this.state;
  }
  is_state(candidate) {
    return this.state === candidate;
  }
  make_noop_msg(trans_id, old_state, new_state) {
    return this.constructor.name + " had neither " +
           `on__${trans_id} exit__${old_state} or enter__${new_state}`;
  }
  throw_log_or_ignore_msg(msg) {
    const throw_log_or_ignore = this.throw_log_or_ignore || 'ignore';
    if (throw_log_or_ignore === 'throw') {
      throw new Error(msg);
    } else if (throw_log_or_ignore === 'log') {
      console.warn(msg);
    }
  }
  transit(transId) {
    /*
      Call methods (if they exist) in the order:
      1) exit__<currentStateId>
      2) on__<transId>
      3) enter__<targetStateId>
    */
    var currentStateId = this.get_state();
    var currentStateObj = this._states[currentStateId];
    if (currentStateObj) {
      let called = this.exit_state();  // call exit__<currentStateId> if it exists
      called = this.call_method_by_name('on__'+transId) || called; // call on__<transId> if it exists
      var targetStateId = currentStateObj[transId];
      if (!targetStateId) {
        this.throw_log_or_ignore_msg(`${this.constructor.name} has no state with id ${currentStateId}`);
      }
      called = this.set_state(targetStateId) || called;  // call exit__<targetStateId>
      if (!called) {
        const msg = this.make_noop_msg(transId, currentStateId, targetStateId);
        this.throw_log_or_ignore_msg(msg);
      }
    } else {
      this.throw_log_or_ignore_msg(`${this.constructor.name} has no state with id ${currentStateId}`);
    }
  }
}
