/*
  SortedSet

  SortedSet is a javascript Array which stays sorted and permits only
  once instance of each itm to be added.

  It adds these methods:
    add(itm)
    has(itm) => bool
    acquire(itm) # remove(itm) from prior set then add(itm) to this
    sort_on(f_or_k) # eg
      sort_on('some_property_name')
      sort_on(function(a,b){ return -1,0 or 1})
    remove(itm)
    binary_search(sought[,ret_ins_idx])
    clear() # empty the set

  SortedSet also supports the notion of items belonging to mutually exclusive
  sets, represented as "being in mutually exclusive states".
    isState(state_name) # makes the sortedset act in mutual exclusion with others
  If an item is "in a state" then its .state property contains a link to
  the sortedset "it is currently in".

  If one wants to record membership on items by attaching flags to them
  this can be accomplished with SortedSet.isFlag(flag_name)
    isFlag(flag_name) # items in the set get the property [flag_name]

  dead = new SortedSet().isState('dead')
  alive = new SortedSet().isState('alive')
  sick = new SortedSet().isFlag('sick')
  amputee = new SortedSet().isFlag('amputee')

  alice = {'id':'alice'};
  alive.add(alice);
  amputee.add(alice)
  alice.state == alive; // ==> true
  alice.state == dead;  // ==> false
  dead.acquire(alice);
  !!alice.amputee == true; // ==> true


  author: Shawn Murphy <smurp@smurp.com>
  written: 2013-11-15
  funder:  TM&V -- The Text Mining and Visualization project
  Copyright CC BY-SA 3.0  See: http://creativecommons.org/licenses/by-sa/3.0/

  http://stackoverflow.com/a/17866143/1234699
    provided guidance on how to 'subclass' Array

    "use strict";

 */
export function SortedSet() {
  // if (arguments.callee) {arguments.callee.NUMBER_OF_COPIES += 1;}
  if (typeof window != 'undefined') {
    if (!window.NUM_SORTEDSET){window.NUM_SORTEDSET = 0}
    window.NUM_SORTEDSET += 1;
  }
  var array = [];
  array.push.apply(array,arguments);
  array.case_insensitive = false;
  array.case_insensitive_sort = function(b) {
    if (typeof b == 'boolean') {
      if (b) { // INSENSITIVE
        array.cmp_options.caseFirst = false;
        array.cmp_options.sensisitivity = 'base';
      } else { // SENSITIVE
        array.cmp_options.caseFirst = 'upper';
        array.cmp_options.sensisitivity = 'case';
      }
      array.case_insensitive = b;
      array.resort();
    }
    return array;
  }
  array.cmp_options = {numeric: true, caseFirst: 'upper', sensitivity: 'case'};
  array._f_or_k = 'id';
  array._cmp_instrumented = function(a, b){
    /*
      Return a negative number if a < b
      Return a zero if a == b
      Return a positive number if a > b
    */
    var f_or_k = array._f_or_k,
        av = (''+(a && a[f_or_k]) || ''),
        bv = (''+(b && b[f_or_k]) || '');
    //console.log(f_or_k, array.case_insensitive);
    // xcase are squashed iff needed
    var acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    if (!array.case_insensitive && acase != av) {
      throw new Error("" + acase + " <> " + av + " BUT SHOULD EQUAL")
    }
    //var retval = av.localeCompare(bv, 'en', array.cmp_options);
    var retval = (acase < bcase) && -1 || ((acase > bcase) && 1 || 0);
    /*
      if (window.SORTLOG) {
      console.error(`${array.id}.${f_or_k} ${array.case_insensitive&&'IN'||''}SENSITIVE "${av}" ${DIR[retval+1]} "${bv}  (${retval})"`, array.cmp_options);
      }
    */
    array._verify_cmp(av, bv, retval);
    return retval;
  }
  array._cmp_classic = function(a, b) {
    /*
      Classic does NOT handle dupes
     */
    var f_or_k = array._f_or_k,
        av = (''+(a && a[f_or_k]) || ''),
        bv = (''+(b && b[f_or_k]) || '');
    // xcase are squashed iff needed
    var acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    return (acase < bcase) && -1 || ((acase > bcase) && 1 || 0);
  }
  array._cmp = function(a, b) {
    var f_or_k = array._f_or_k,
        av = (''+(a && a[f_or_k]) || ''),
        bv = (''+(b && b[f_or_k]) || '');
    // xcase are squashed iff needed
    var acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    return (acase < bcase) && -1 || ((acase > bcase) && 1 || 0) ||
           ((a.id < b.id) && -1) || ((a.id > b.id) && 1 || 0);
  }
  array._verify_cmp = function(av, bv, retval) {
    var dir = ['less than', 'equal to', 'greater than'][retval+1],
        right_or_wrong = 'wrongly',
        sense = (!array.case_insensitive && 'UN' || '') + 'SQUASHED',
        acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    if (sense == 'UNSQUASHED' &&
        acase != av &&
        av.toLowerCase() != av) {
      /*
        Is case INSENSITIVE comparison happening on the right values?

        Confirm that when a case_insensitive sort is happening
        AND the value upon which comparison actually happens (acase) differs from av
        AND that there are uppercase characters to squash
      */
      throw new Error(""+sense+"("+array.case_insensitive + ") but av(" + av + ") compared as acase(" + acase +")");
    }
    var tests = ['(retval > 0 && acase <= bcase)',
                 '(retval < 0 && acase >= bcase)',
                 '(retval == 0 && acase != bcase)'];
    tests.forEach(function(test){
      if (eval(test)) {
        throw new Error("" +test + " SHOWS _cmp(" + sense + ") " + right_or_wrong +
                        " calling a(" + acase + ") " + dir +" b(" + bcase + ")");
      }
    });
    right_or_wrong = 'rightly';
    //console.error(`_cmp(${sense}) ${right_or_wrong} calling a(${acase}) ${dir} b(${bcase})`);
  }
  array.sort_on = function(f_or_k){ // f_or_k AKA "Function or Key"
    //   f_or_k: a comparison function returning -1,0,1
    var DIR = ['<','=','>'];
    if (typeof f_or_k == 'string'){ // item object key to sort on the value of
      array._f_or_k = f_or_k
    } else if (typeof f_or_k == 'function'){
      array._cmp = f_or_k;
    } else {
      throw new Error("sort_on() expects a function or a property name");
    }
    array.resort()
    return array;
  }
  array.resort = function() {
    //if (window.SORTLOG) { console.groupCollapsed('resort') }
    array.sort(array._cmp);
    //if (window.SORTLOG) { console.groupEnd('resort') }
  }
  array.clear = function(){
    array.length = 0;
    for (var i = array.length - 1; i > -1; i--) {
      array[i].remove()
    }
    return array.length == 0; // should be zero now
  };
  array.isState = function(state_property){
    /*
     * Calling isState() on a SortedSet() prepares it so that
     * when add() is called then the SortedSet is registered on
     * the itm.state property.  This means that if the item
     * is moved to a different SortedSet then it's state can
     * be tested and altered.  This enforces mutually exlusive item
     * membership among the sets which all have isState() asserted.
     */
    array.state_property = state_property || 'state';
    return array;
  };
  array.isFlag = function(flag_property){
    /*
     * Calling isFlag() on a SortedSet() prepares it so that
     * when add() is called then the SortedSet is registered on
     * the itm[flag_property].  When the item is removed from
     * the isFlagged SortedSet then that flag_property is deleted.
     * The default value for the name of the flag_property is
     * simply the name of SortedSet().  The motivation of course
     * is for many flags to be able to be set on each node, unlike
     * states, which are mutually exclusive.
     */
    array.flag_property = flag_property || array.id; // array.state_name
    return array;
  };
  /*
    Maintain a containership heirarchy on the slots 'subsets' and 'superset'
  */
  array.subsets = [];
  array.sub_of = function(superset) {
    array.superset = superset;
    superset.has_sub(array);
    return array;
  };
  array.has_sub = function(subset) {
    array.subsets.push(subset);
    if (subset.superset != array) {
      subset.superset = array;
    }
    return array;
  };
  array.named = function(name){
    array.id = name;
    return array;
  };
  array.labelled = function(label) {
    array.label = label;
    return array;
  };
  array.get_label = function() {
    return array.label || array.id;
  };
  array.sort_on('id');
  array.toggle = function(itm){
    // Objective:
    //   add() or remove() as needed
    if (array.has(itm)) {
      array.remove(itm);
    } else {
      array.add(itm);
    }
  };
  array.alter = function(itm, callback) {
    /*
     * Objective:
     *   Alter supports making a possibly position-altering change to an item.
     *   Naively changing an item could invalidate its sort order breaking
     *   operations which depend on that order.
     * Means:
     *   Alter finds itm then calls the callback, which might change itm
     *   in a way which ought to cause a repositioning in the array.
     *   If the sorted position of itm is now invalid then figure out where
     *   it should be positioned and move it there, taking care to not be
     *   distracted during binary_search by the fact that item is already
     *   in the set but possibly misorderedly so.
     */
    var current_idx = array.binary_search(itm, true);
    callback();
    if (array.validate_sort_at(current_idx, true)) {
      return current_idx;
    }
    // It was NOT in the right position, so remove it and try again
    //array.remove(itm); // remove does not work because itm is mis-sorted
    return array.nudge_itm_at_(itm, current_idx);
  }
  array.nudge_itm_at_ = function(itm, current_idx) {
    var removed = array.splice(current_idx, 1);
    if (removed.length != 1 || removed[0] != itm) {
      var msg = "failed to remove " + itm[array._f_or_k] + " during .add()";
      console.debug(msg);
      //throw new Error(msg);
    }
    var ideal = array.binary_search(itm, true);
    var before_removal_count = array.length;
    array.remove(itm);
    var after_removal_count = array.length;
    if (false && !(before_removal_count - after_removal_count == 1)) {
      var msg = "temporarily removing itm extracted " +
          (before_removal_count - after_removal_count) +
          " items";
      console.debug(msg);
      // throw new Error(msg);
    }
    //array.splice(ideal.idx, 0, itm);
    array._engage_at(itm, ideal.idx);
    return array;
  }
  array.add = function(itm){
    /*
     * Objective:
     *   Maintain a sorted array which acts like a set.
     *   It is sorted so insertions and tests can be fast.
     * Return:
     *   The index at which it was inserted (or already found)
     */
    var c = array.binary_search(itm, true)
    if (typeof c == 'number'){ // an integer was returned, ie it was found
      return c;
    }
    array._engage_at(itm, c.idx);
    //array.is_sorted();
    return c.idx;
  }
  array._engage_at = function(itm, idx) {
    array.splice(idx,0,itm);
    if (array.state_property){
      itm[array.state_property] = array;
    }
    if (array.flag_property){
      itm[array.flag_property] = array;
    }
  }
  array.has = function(itm){ // AKA contains() or is_state_of()
    if (array.state_property){
      return itm[array.state_property] == array;
    }
    if (array.flag_property){
      return itm[array.flag_property] == array;
    }
    alert("we should never get here");
  };
  array.remove = function(itm){
    /*
     * Objective:
     *   Remove item from an array acting like a set.
     *   It is sorted by cmp, so we can use binary_search for removal
     */
    var duds = [];
    var c = array.binary_search(itm);
    //console.log("c:", c, array.is_sorted());
    if (c > -1){  // it was found
      duds = array.splice(c, 1);  // remove itm into the duds array (expecting length == 1)
      if (true) { // confirm correctness
        var because;
        if (duds.length != 1) {
          because = "removed "+ duds.length + " instead of exactly 1 item";
        } else if (duds[0] != itm) {
          because = duds[0].id + " was removed instead of " + itm.id;
          console.debug(itm.id, 'was', itm[array._f_or_k], 'but',
                        duds[0].id, 'was' , duds[0][array._f_or_k],
                        'which might appear the same without being the same object')
        } else {
          because = ""; // there was no error
        }
        if (because) {
          var msg = "remove failed at idx " + c + " to splice " + itm.id +
              " out of "+ array.label + " because "+ because;
          throw new Error(msg);
        }
      }
    } else {
      //debugger;
      //throw new Error(`remove() is failing at idx ${c} because array.binary_search() failed to find ${itm.lid} in ${array.label}`);
    }
    if (array.state_property){
      itm[array.state_property] = true; // EXAMINE delete instead?
    }
    if (array.flag_property){
      delete itm[array.flag_property];
    }
    return duds[0];
  }
  array.acquire = function(itm){
    // acquire() is like add() for SortedSet() but it takes care
    // of removing itm from the previous SortedSet
    var last_state = itm[array.state_property];
    if (last_state && last_state.remove){
      last_state.remove(itm);
    }
    return array.add(itm);
  };
  array.get = function(sought){
    var idx = array.binary_search(sought);
    if (idx > -1){
      return array[idx];
    }
  };
  array.get_by = function(key, val){
    var o = {};
    o[key] = val;
    return this.get(o);
  };
  array.binary_search = function(sought, ret_ins_idx, callback){
    /*
     * This method performs a binary-search-powered version of indexOf(),
     * that is; it returns the index of sought or returns -1 to report that
     * it was not found.
     *
     * If ret_ins_idx (ie "RETurn the INSertion INdeX") is true then
     * instead of returning -1 upon failure, it returns the index at which
     * sought should be inserted to keep the array sorted.
     *
     * SortedSet must be capable of containing multiple itm which have the same key.
     * It is assumed that the key .id is available when distinguishing itemss.  See _cmp
     */
    ret_ins_idx = ret_ins_idx || false;
    var step = 0;
    var seeking = true;
    if (array.length < 1) {
      if (ret_ins_idx) {
	return {idx: 0};
      }
      return -1;
    }
    var mid, mid_node, prior_node, c,
	bot = 0,
        top = array.length;
    while (seeking){
      mid = bot + Math.floor((top - bot)/2);
      mid_node = array[mid];
      c = array._cmp(mid_node, sought);
      if (callback) {
        callback(array, sought, mid_node, prior_node, {mid: mid, bot: bot, top: top, c: c, step: step})
      }
      step++;
      prior_node = mid_node;
      //console.log(" c =",c);
      if (c == 0) {
        if (callback) {callback(array, null, null, null, {done: true, retval: mid});}
        return mid;
      }
      if (c < 0){ // ie this[mid] < sought
	bot = mid + 1;
      } else {
	top = mid;
      }
      if (bot == top){
	if (ret_ins_idx){
          if (callback) {callback(array, null, null, null, {done: true, retval: bot});}
          return {idx:bot};
	}
        if (callback) {callback(array, null, null, null, {done: true, retval: -1});}
        return -1;
      };
    }
  }
  array.is_sorted = function() { // return true or throw
    for (var i = 0; (i + 1) < array.length; i++) {
      if (array.length > 1) {
        array.validate_sort_at(i);
      }
    }
    return true;
  }
  array.validate_sort_at = function(i, or_return) {
    var
    key = array._f_or_k,
    after = array[i+1],
    tween = array[i],
    before = array[i-1],
    or_return = !or_return;  // defaults to true
    // ensure monotonic increase
    if (typeof after != 'undefined' && array._cmp(tween, after) > 0) {
      if (or_return) {
        throw new Error('"' + tween[key] + '" is before "' + after[key] + '"');
      } else {
        return false;
      }
    }
    if (typeof before != 'undefined' && array._cmp(before, tween) > 0) {
      if (or_return) {
        throw new Error('"' + before[key] + '" is before "' + tween[key] + '"');
      } else {
        return false;
      }
    }
    return true;
  }
  array.dump = function() {
    for (var i = 0; i < array.length; i++) {
      var node = array[i];
      console.log(node.lid, node.name.toString(), node.name);
    }
  }
  array.roll_call = function() {
    var out = [];
    for (var i = 0; i < array.length; i++) {
      out.push(array[i].lid || array[i].id);
    }
    return out.join(', ');
  }
  return array;
};
// Instrument SortedSet so we can track the number of 'instances'.
// This is motivated by the fact that it is currently implemented
// not as a regular subclass of Array (which was not possible when it was created)
// but as a set of adornments on an Array instances, thereby incurring
// the burden of each such copy carrying its own copies of the SortedSet
// methods with it.  See https://github.com/cwrc/HuViz/issues/259
// SortedSet.NUMBER_OF_COPIES = 0;

// These tests are included in the module to simplify testing in the browser.
export var SortedSets_tests = function(verbose){
  verbose = verbose || false;
  var n = function(a,b){
    if (a == b) return 0;
    if (a < b) return -1;
    return 1;
  }
  var
  a = {id:1},
  b = {id:2},
  c = {id:0},
  d = {id:3},
  stuff = SortedSet(a,b),
  a_d = SortedSet(a,d).sort_on('id'),
  ints = SortedSet(0,1,2,3,4,5,6,7,8,10).sort_on(n),
  even = SortedSet(0,2,4,6,8,10).sort_on(n),
  some_dupes = SortedSet(0,1,2,2,5,7,2,9).sort_on(n),

  a1 = {id:1, name:'Alice'},
  a2 = {id:2, name:'Alice'},
  a3 = {id:3, name:'Alice'},
  a4 = {id:4, name:'Alice'},
  b5 = {id:5, name:'Bob'},
  b6 = {id:6, name:'Bob'},
  dupe_names = SortedSet().sort_on('name');

  function expect(stmt,want){
    var got = eval(stmt);
    if (verbose) console.log(stmt,"==>",got);
    if (got != want){
      throw stmt + " returned "+got+" expected "+want;
    }
  }
  function assert(be_good, or_throw){
    if (! be_good) throw or_throw;
  }
  function cmp_on_name(a,b){
    if (a.name == b.name) return 0;
    if (a.name < b.name)  return -1;
    return 1;
  }
  function cmp_on_id(a,b){
    if (a.id == b.id) return 0;
    if (a.id < b.id) return -1;
    return 1;
  }

  expect("cmp_on_id(a,a)",0);
  expect("cmp_on_id(a,b)",-1);
  expect("cmp_on_id(b,a)",1);
  expect("ints.binary_search(0)",0);
  expect("ints.binary_search(4)",4);
  expect("ints.binary_search(8)",8);
  expect("ints.binary_search(9)",-1);
  expect("ints.binary_search(9,true).idx",9);
  expect("ints.binary_search(-3)",-1);
  expect("even.binary_search(1,true).idx",1);
  expect("even.binary_search(3,true).idx",2);
  expect("even.binary_search(5,true).idx",3);
  expect("even.binary_search(7,true).idx",4);
  expect("even.binary_search(9,true).idx",5);
  expect("even.binary_search(9)",-1);
  expect("even.binary_search(11,true).idx",6);
  expect("stuff.binary_search(a)",0);
  expect("stuff.binary_search(b)",1);
  expect("stuff.binary_search(c)",-1);
  expect("stuff.binary_search(d)",-1);
  expect("a_d.binary_search(c)",-1);
  expect("a_d.binary_search(c,true).idx",0);
  expect("a_d.binary_search(b,true).idx",1);
  expect("a_d.add(b)",1);
  expect("a_d.binary_search(a)",0);
  expect("a_d.binary_search(b)",1);
  expect("a_d.binary_search(d)",2);
  expect("a_d.add(c)",0);
  expect("dupe_names.add(a2)", 0);
  expect("dupe_names.add(a1)", 0);
  expect("12 * 12", 144);
  expect("dupe_names.length", 2);

  expect("dupe_names.roll_call()", '1, 2');
  expect("dupe_names.binary_search({'name':'Alice'})", 1);

  expect("dupe_names.add(a4)", 2);
  expect("dupe_names.length", 3);
  expect("dupe_names.roll_call()", '1, 2, 4');

  expect("dupe_names.add(b6)", 3);
  expect("dupe_names.roll_call()", '1, 2, 4, 6');

  expect("dupe_names.add(b5)", 3);
  expect("dupe_names.roll_call()", '1, 2, 4, 5, 6');

  expect("dupe_names._cmp(b5, b5)", 0);
  expect("dupe_names._cmp(a4, b5)", -1);
  expect("dupe_names._cmp(b5, a4)", 1);

  expect("dupe_names._cmp(b5, b6)", -1);
  expect("dupe_names._cmp(b6, b5)", 1);
  expect("dupe_names._cmp(b5, a1)", 1);

  expect("dupe_names.remove(b5).id", 5);
  expect("dupe_names.remove(a2).id", 2);
  expect("dupe_names.roll_call()", '1, 4, 6');

  expect("'ran to completion'.split(' ').join(' ')", 'ran to completion');
};
/*
 * Here is a handy way to watch the tests:
 *   nodemon -w js/sortedset.js --exec  node js/sortedset.js
 * Uncomment next line to run tests.  Silence is success.
 */
//    SortedSets_tests();
if (typeof module !== 'undefined' && module.exports) {
  module.exports.SortedSet = SortedSet;
}
