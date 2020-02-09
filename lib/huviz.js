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
var SortedSet = function(){
  if (arguments.callee) {arguments.callee.NUMBER_OF_COPIES += 1;}
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
SortedSet.NUMBER_OF_COPIES = 0;

// These tests are included in the module to simplify testing in the browser.
var SortedSets_tests = function(verbose){
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

function hsv2rgb(hue, sat, val) {
    // See
    //    http://en.wikipedia.org/wiki/HSL_and_HSV
    // from: 
    //    http://www.actionscript.org/forums/archive/index.php3/t-15155.html
    // see also:
    //    http://www.webreference.com/programming/javascript/mk/column3/creating/cp_mini_gradient_details.png
    var red, grn, blu, i, f, p, q, t;
    hue%=360; // probably not needed
    if(val==0) {return("rgb(0,0,0)");}
    sat/=100;
    val/=100;
    hue/=60;
    i = Math.floor(hue);
    f = hue-i;
    p = val*(1-sat);
    q = val*(1-(sat*f));
    t = val*(1-(sat*(1-f)));
    if (i==0) {red=val; grn=t; blu=p;}
    else if (i==1) {red=q; grn=val; blu=p;}
    else if (i==2) {red=p; grn=val; blu=t;}
    else if (i==3) {red=p; grn=q; blu=val;}
    else if (i==4) {red=t; grn=p; blu=val;}
    else if (i==5) {red=val; grn=p; blu=q;}
    red = Math.floor(red*255);
    grn = Math.floor(grn*255);
    blu = Math.floor(blu*255);
    var r_g_b = [red,grn,blu];
    //document.spangle_controls.status.value = r_g_b.valueOf();
    return "rgb(" + r_g_b.valueOf() + ")";
}

/*   http://jsfiddle.net/EPWF6/9/  
 *   https://en.wikipedia.org/wiki/HSL_and_HSV#Converting_to_RGB 
 *     Unfortunately this is seriously buggy!
 *       
 */
function hsl2rgb(H, S, L) {
    var input_s = "hsl2rgb(" + [H, S, L].toString() + ")";
    /*
     * H ∈ [0°, 360°)
     * S ∈ [0, 1]
     * L ∈ [0, 1]
     */
    if (H == 360) { H = 359.9999; };
    H %= 360;
    /* calculate chroma */
    var C = (1 - Math.abs((2 * L) - 1)) * S;

    /* Find a point (R1, G1, B1) along the bottom three faces of the RGB cube, with the same hue and chroma as our color (using the intermediate value X for the second largest component of this color) */
    var H_ = H / 60;

    var X = C * (1 - Math.abs((H_ % 2) - 1));

    var R1, G1, B1;

    if (H === undefined || isNaN(H) || H === null) {
        R1 = G1 = B1 = 0;
    }
    else {

        if (H_ >= 0 && H_ < 1) {
            R1 = C;
            G1 = X;
            B1 = 0;
        }
        else if (H_ >= 1 && H_ < 2) {
            R1 = X;
            G1 = C;
            B1 = 0;
        } else if (H_ >= 2 && H_ < 3) {
            R1 = 0;
            G1 = C;
            B1 = X;
        } else if (H_ >= 3 && H_ < 4) {
            R1 = 0;
            G1 = X;
            B1 = C;
        } else if (H_ >= 4 && H_ < 5) {
            R1 = X;
            G1 = 0;
            B1 = C;
        }
        else if (H_ >= 5 && H_ < 6) {
            R1 = C;
            G1 = 0;
            B1 = X;
        }
    }

    /* Find R, G, and B by adding the same amount to each component, to match lightness */

    var m = L - (C / 2);

    var R, G, B;

    /* Normalise to range [0,255] by multiplying 255 */
    R = (R1 + m) * 255;
    G = (G1 + m) * 255;
    B = (B1 + m) * 255;

    R = Math.round(R);
    G = Math.round(G);
    B = Math.round(B);

    retval = "rgb(" + R + ", " + G + ", " + B + ")";
    //    console.info(input_s,retval);
    return retval;
}

// based on https://github.com/talis/rdfquads.js
function Quad(subject,pred,obj,graph) {
    this.s = new RdfUri(subject);
    this.p = new RdfUri(pred);
    this.o = new RdfObject(obj);
    this.g = new RdfUri(graph);
}
Quad.prototype.toString = function() {
    return '<' + this.s + '> <' + this.p + '> ' + this.o + ' <' + this.g + '> .\n'
}
Quad.prototype.toNQuadString = function() {
    return '<' + this.s + '> <' + this.p + '> ' + this.o + ' <' + this.g + '> .\n'
}


var uriRegex = /<([^>]*)>/ ;

function RdfUri(url) {
    self = this;
    var match = url.match(uriRegex);
    if (match) {
        self.raw = match[1];
    } else {
        self.raw = url;
    }
}
RdfUri.prototype.toString = function() {
    return this.raw;
}

function RdfObject(val) {    
    self = this;
    var match = val.match(uriRegex);
    if (match) {
        self.raw = match[1];
        self.type = 'uri';
    } else {
        self.raw = val;
        self.type = 'literal';
    }
}
RdfObject.prototype.toString = function() {
    return this.raw;
}
RdfObject.prototype.isUri = function() {
    return this.type == 'uri';
}
RdfObject.prototype.isLiteral = function() {
    return this.type == 'literal';
}

var quadRegex = /\s*(<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>)\s*(".*"?|<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>).*\s*\.\s*\#*.*$/ ;
var isComment = /^\s*\/\// ;

function parseQuadLine(line) {
    if (line == null || line === "" || line.match(isComment)) {
        return null;
    } else {
	//console.log ("parseQuadLine(",line,")");
        var match = line.match(quadRegex);
	//console.log("match",match,line);
        if (match){
            var s = match[1].trim();
            var p = match[2].trim();
            var o = match[3].trim();
            var g = match[4].trim();
            return new Quad(s,p,o,g);
	//} else {
	//    console.log("no match: "+line);
	}
    }
}

"use strict";

/*
MultiString
  purpose:
     Provide an object that can be used in place of a string, in that
     it returns a string value, but actually stores multiple per-language
     versions of the string and can be reconfigured as to which different
     language version gets returned.
  see:
     https://stackoverflow.com/a/28188150/1234699
  features:
    Expects langpath values which are colon-delimted lists of 2-letter
    language codes.  The final value in the list can instead be the
    word ANY, a wildcard meaning that every language not yet represented
    in the language path would be respected too.

    Note that MultiStrings can also have 'NOLANG' values, that is, values
    with no associated language.  These are always on the priority list,
    but at the end, even after ANY is respected.

    If one wants to make referencde to the "NOLANG" value, one can
    do so explicitly with the term NOLANG in the langpath.

  examples:
    "en"
      means that if an English value has been provided it will be
      respected and that if there is a NOLANG value it will be shown
      otherwise.  On no account will values in other languages be shown.

    "en:fr"
      If a MultiString instance has an English value it will be shown,
      otherwise if a French value is available it will be shown, failing
      that if a NOLANG value is present, it will be shown.

    "en:ANY"
      If a MultiString instance has an English value it will be shown,
      otherwise if value tagged with any other lanugage is available
      it will be shown (in no particular order) and finally if a
      "NOLANG" value is present, it will be shown.

    "en:NOLANG:ANY"
      Show English if available, or the NOLANG value or a value from
      ANY other language if present -- in that priority order.
*/

function MultiString() {
  var i;
  if (arguments.length == 0) {
    this.set_val_lang()
  } else {
    i = -1;
    while (typeof(arguments[i+=1]) != 'undefined') { // an empty string is a legal name
      // process value/lang pairs
      this.set_val_lang(arguments[i] || '', arguments[i+=1]);
    }
  }
  Object.defineProperty(
    this, 'length',
    {get: function () { return (this.valueOf()||'').length; }});
};

// inherit all properties from native class String
MultiString.prototype = Object.create(String.prototype);

MultiString.prototype.set_val_lang = function(value, lang) {
  //  set a value/lang pair where undefined lang sets NOLANG value
  if (lang) {
    this[lang] = value;
  } else {
    this.NOLANG = value || '';
  }
};

MultiString.langs_in_path = []; // default value
MultiString.prototype.set_lang_val = function(lang, value) {
  this.set_val_lang(value, lang);
};

MultiString.prototype.get_ANY_but_langs_in_path = function() {
  var langs_in_path = MultiString.langs_in_path;
  for (var key in this) {
    if (this.hasOwnProperty(key)) {
      if (langs_in_path.indexOf(key) == -1) {
        return this[key];
      }
    }
  };
};

MultiString.prototype.get_ALL = function() {
  var retval = '';
  for (var key in this) {
    if (key.length == 2) {
      if (retval) {
        retval += ', '
      }
      retval += '"' + this[key] + '"@' + key;
    } else if (key == 'NOLANG') {
      if (retval) {
        retval += ', '
      }
      retval += '"' + this[key] + '"';
    }
  };
  return retval;
};

const LANGCODE_RE = /^[a-z]{2}$/

MultiString.set_langpath = function(langpath){
  var langs = [],
      parts = [],
      langs_in_path = [],
      nolang_used = false;
  if (langpath) {
    parts = langpath.split(':');
    parts.forEach(function(p,idx){
      if (p.match(LANGCODE_RE)) {
        langs.push(p);
        langs_in_path.push(p);
      } else if (p == 'NOLANG') {
        nolang_used = true;
        langs.push(p);
      } else if (p == 'ANY') {
        langs.push("get_ANY_but_langs_in_path()")
      } else if (p == 'ALL') {
        langs.push("get_ALL()")
      } else {
        throw new Error("<" + p + "> is not a legal term in LANGPATH");
      }
    });
  }
  MultiString.langs_in_path = langs_in_path;
  var body = "return";
  if (langs.length) {
    body += " this."+langs.join(' || this.');
    body += " || ";
  }
  body += "''";
  // Compile a new function which follows the langpath for the value
  // so String.prototype methods can get to the value
  MultiString.prototype.toString =
    MultiString.prototype.valueOf =
    new Function(body);
};

MultiString.set_langpath('ANY:NOLANG'); // set the default langpath

// Extend class with a trivial method
MultiString.prototype.behead = function(){
  return this.substr(1);
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports.MultiString = MultiString;
}

"use strict";

function OnceRunner(verbosity, name) {
  this.verbosity = verbosity || 0;
  this.profileName = (name || 'OnceRunner') + '_' + (new Date()).toISOString();
  this.active = false;
};

OnceRunner.prototype.setTimeout = function(cb, msec) {
  //console.log(`afterMsec_call(${msec}) typeof cb ==>`,typeof cb);
  if (! this.firstCallTime) { // when a new string of calls begins
    this.firstCallTime = Date.now();
    this.active = true;
    this.stats = {};
    if (this.verbosity > 39) {
      console.profile(this.profileName);
    }
    this.clearCount = 0; // the number of times execution has been delayed
  }
  if (this.timeoutID) {
    if (this.verbosity > 29) {
      console.warn("clearTimeout()", this.timeoutID._idleStart || this.timeoutID);
    }
    clearTimeout(this.timeoutID);
    this.clearCount++;
  }
  //cb = function() {console.log("mockFunc() called")};
  return this.timeoutID = setTimeout(this.makeWrapper(cb), msec);
};

OnceRunner.prototype.makeWrapper = function(callback) {
  var self = this;
  return function() {
    var stats = "";
    if (self.verbosity > 19) {
      console.warn("calling callback ",self.timeoutID._idleStart || self.timeoutID);
    }
    var callbackExecutionStart = Date.now();
    callback();
    self.active = false;
    var callbackExecutionEnd = Date.now();
    var callbackExecutionDurationMsec = callbackExecutionEnd - callbackExecutionStart;
    var overallExecutionDurationMsec = callbackExecutionEnd - self.firstCallTime;
    var timeSavedMsec = callbackExecutionDurationMsec * self.clearCount;
    var wouldaBeenDurationMsec = overallExecutionDurationMsec + timeSavedMsec;
    var timeSavedRatio = timeSavedMsec / wouldaBeenDurationMsec;
    self.stats.timeSavedRatio = timeSavedRatio;
    self.stats.timeSavedSec = timeSavedMsec/1000;
    self.stats.wouldaBeenSec = wouldaBeenDurationMsec / 1000;
    self.stats.profileName = self.profileName;
    if (self.verbosity > 9) {
      console.warn("OnceRunner() stats", self.stats);
    }
    if (self.verbosity > 39) {
      console.profileEnd();
    }
    self.firstCallTime = null; // an execution has happened so reset
  };
};

(typeof exports !== "undefined" && exports !== null ? exports : this).OnceRunner = OnceRunner;

(function() {
  /*
    Select every Thing except Penguin .
    Activate Person .
    Wander and Label NationalHeritage .
    Select GeographicHeritage .
    Draw Selected regarding relocatesTo .
    Walk Ethnicity .
   */

  var InputStream = function(input) {
    // copied from http://lisperator.net/pltut/parser/input-stream
    // usage:
    //     var stream = InputStream(string)
    var pos = 0, line = 1, col = 0;
    return {
      next  : next,
      peek  : peek,
      eof   : eof,
      croak : croak,
    };
    function next() {
      var ch = input.charAt(pos++);
      if (ch == "\n") line++, col = 0; else col++;
      return ch;
    }
    function peek() {
      return input.charAt(pos);
    }
    function eof() {
      return peek() == "";
    }
    function croak(msg) {
      throw new Error(msg + " (" + line + ":" + col + ")");
    }
  };

  var TokenStream = function(input) {
    // based on http://lisperator.net/pltut/parser/token-stream
    var current = null;
    //window.current = null
    var reserved = "with let ";
    // TODO Probably want to pass the builtins in as an argument
    var verbs = " " +
        "Choose Unchoose " +
        "Activate Deactivate " +
        "Select Unselect " +
        "Label Unlabel " +
        "Shelve Hide " +
        "Discard Retrieve " +
        "Pin Unpin " +
        "Wander Walk " +
        "Draw ";
    var connectors = " every except regarding and ";
    var sets = " Activated Chosen Graphed Hidden Labelled Nameless Pinned Selected Shelved ";
    var keywords = verbs + connectors + sets;
    //var keywords = " true false t f "; // + reserved + builtins;
    return {
      next  : next,
      peek  : peek,
      eof   : eof,
      croak : input.croak
    };

    function is_keyword(x) {
      return keywords.indexOf(" " + x + " ") >= 0;
    }
    function is_set(x) {
      return sets.indexOf(" " + x + " ") >= 0 && 'set';
    }
    function is_verb(x) {
      return verbs.indexOf(" " + x + " ") >= 0 && 'verb';
    }
    function is_connector(x) {
      return connectors.indexOf(" " + x + " ") >= 0 && 'connector';
    }
    /*
    function is_noun(x) {
      return is_set(x) || is_
    }
    */
    function is_digit(ch) {
      return /[0-9]/i.test(ch);
    }
    function is_id_start(ch) {
      return /[a-zA-Z]/i.test(ch);
    }
    function is_id(ch) {
      // Verbs, Sets, connectors and CURIEs may contain _
      return is_id_start(ch) || "_".indexOf(ch) >= 0;
    }
    function is_punc(ch) {
      // What about ; ?  Isn't ; what is being used to delimit commands in the URL?
      return ",.;".indexOf(ch) >= 0;
    }
    function is_whitespace(ch) {
      // How is the + sign in the URL version being handled? Gasp, outside of this parser?!!!?
      return " \t\n".indexOf(ch) >= 0;
    }
    function read_while(predicate) {
      var str = "";
      while (!input.eof() && predicate(input.peek()))
	str += input.next();
      return str;
    }
    function read_number() {
      /*
        At this point the GVCL does not seem to need numbers!
      */
      var has_dot = false;
      var number = read_while(function(ch){
	if (ch == ".") {
	  if (has_dot) return false;
	  has_dot = true;
	  return true;
	}
	return is_digit(ch);
      });
      // TODO test for negative number support
      return { type: "num", value: parseFloat(number) };
    }
    function read_ident() {
      var id = read_while(is_id);
      console.log('id:',id)
      return {
	// FormURLa needs builtins (above, beside, graph, table)
	// and (maybe!) keyword parameters, but not "var"
	// unless and until something like "with" or "let" are
	// implemented.
	type  : is_verb(id) || is_connector(id) || is_set(id) || "var",
	value : id
      };
    }
    function read_escaped(end) {
      var escaped = false, str = "";
      input.next();
      while (!input.eof()) {
	var ch = input.next();
	if (escaped) {
	  str += ch;
	  escaped = false;
	} else if (ch == "\\") {
	  escaped = true;
	} else if (ch == end) {
	  break;
	} else {
	  str += ch;
	}
      }
      return str;
    }
    function read_string() {
      return { type: "str", value: read_escaped('"') };
    }
    function skip_comment() {
      // Use Guillemet or "Latin quotation marks" for comments.
      //    https://en.wikipedia.org/wiki/Guillemet
      //        «comments␠go␠here»
      //
      // Consider the use of ␠ ie U+2420 "SYMBOL FOR SPACE" as
      // a space character in comments because it reads fairly well
      // as a space and does not get translated into %20 as all the
      // invisible Unicode space characters seem to:
      //    https://www.cs.tut.fi/~jkorpela/chars/spaces.html
      // Here is an example of a FormURLa with such a comment:
      //   print("hello, world"«this␠comment␠has␠some␠(weird!)␠spaces␠in␠it»)
      read_while(function(ch){ return ch != "»" });
      input.next();
    }
    function read_next() {
      read_while(is_whitespace);
      if (input.eof()) return null;
      var ch = input.peek();
      if (ch == "«") {  // left pointing double angle quotation mark
	skip_comment();
	return read_next();
      }
      if (ch == '"') return read_string();
      if (is_id_start(ch)) return read_ident();
      if (is_punc(ch)) return {
	type  : "punc",
	value : input.next()
      };
      input.croak("Can't handle character: «"+ch+"»");
    }
    function peek() {
      return current || (current = read_next());
    }
    function next() {
      var tok = current;
      current = null;
      return tok || read_next();
    }
    function eof() {
      return peek() == null;
    }
  };

  var FALSE = { type: "bool", value: false };
  function parse(input) {
    // based on http://lisperator.net/pltut/parser/the-parser
    var PRECEDENCE = {
      // NONE OF THIS IS IN USE in GVCL
      "=": 1,
      "||": 2,
      "&&": 3,
      "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
      "+": 10, "-": 10,
      "*": 20, "/": 20, "%": 20,
    };
    return parse_toplevel();
    function is_punc(ch) {
      var tok = input.peek();
      return tok && tok.type == "punc" && (!ch || tok.value == ch) && tok;
    }
    function is_kw(kw) {
      var tok = input.peek();
      return tok && tok.type == "kw" && (!kw || tok.value == kw) && tok;
    }
    function is_op(op) {
      var tok = input.peek();
      return tok && tok.type == "op" && (!op || tok.value == op) && tok;
    }
    function skip_punc(ch) {
      if (is_punc(ch)) input.next();
      else input.croak("Expecting punctuation: \"" + ch + "\"");
    }
    function skip_kw(kw) {
      if (is_kw(kw)) input.next();
      else input.croak("Expecting keyword: \"" + kw + "\"");
    }
    function skip_op(op) {
      if (is_op(op)) input.next();
      else input.croak("Expecting operator: \"" + op + "\"");
    }
    function unexpected() {
      input.croak("Unexpected token: " + JSON.stringify(input.peek()));
    }
    function maybe_binary(left, my_prec) {
      var tok = is_op();
      if (tok) {
	var his_prec = PRECEDENCE[tok.value];
	if (his_prec > my_prec) {
	  input.next();
	  return maybe_binary({
	    type     : tok.value == "=" ? "assign" : "binary",
	    operator : tok.value,
	    left     : left,
	    right    : maybe_binary(parse_atom(), his_prec)
	  }, my_prec);
	}
      }
      return left;
    }
    function delimited(start, stop, separator, parser) {
      var a = [], first = true;
      while (!input.eof()) {
	if (is_punc(stop)) break;
	if (first) first = false; else skip_punc(separator);
	if (is_punc(stop)) break;
	a.push(parser());
      }
      return a;
    }
    function is_part_of_speech_or_and(x, pos) {
      console.log('x:', x)
      return (x.type == pos || x.value == 'and' || false);
    }
    function parse_anglicised(member_parser, pos) {
      /*
        Consume 'anglicised' lists like:
          * "one"
          * "one and two"
          * "one, two and three"
       */
      var a = [], first = true;
      var next_input = input.peek();
      while (!input.eof() && (is_part_of_speech_or_and(next_input, pos))) {
	if (is_punc(input.peek())) skip_punc(',');
	if (first) first = false; else skip_punc(',');
	a.push(member_parser());
        next_input = input.peek();
      }
      return a;
    }
    function parse_verb_phrase() {
      return {
        type: 'verb_phrase',
        args: parse_anglicised(parse_verb, 'verb')
      }
    }
    function parse_noun_phrase() {
      return {
        type: 'noun_phrase',
        args: parse_anglicised(parse_noun, 'noun')
      }
    }
    function parse_call(func) {
      return {
	type: "call",
	func: func,
	args: delimited("(", ")", ",", parse_expression),
      };
    }
    function parse_verb() {
      var name = input.next();
      console.log('parse_verb:', name)
      if (name.type != "verb") input.croak("Expecting verb name");
      return name.value;
    }
    function parse_noun() {
      var name = input.next();
      console.log('parse_noun:', name)
      if (name.type != "noun") input.croak("Expecting noun name, got " + JSON.stringify(name));
      return name.value;
    }
    function parse_varname() {
      var name = input.next();
      if (name.type != "var") input.croak("Expecting variable name");
      return name.value;
    }
    function maybe_command(expr) {
      expr = expr();
      return parse_call(expr);
    }
    function parse_atom() {
      return maybe_command(function(){
	if (is_punc("(")) {
	  input.next();
	  var exp = parse_expression();
	  skip_punc(")");
	  return exp;
	}
	/*
	  if (is_punc("{")) return parse_prog();
	  input.next();
	  }
	*/
	var tok = input.next();
	if (tok.type == "var" || tok.type == "num" || tok.type == "str") {
	  return tok;
        }
	unexpected();
      });
    }
    function parse_toplevel() {
      var prog = [];
      while (!input.eof()) {
	prog.push(parse_command());
	// console.log("latest:",prog[prog.length-1]);
      }
      return { type: "prog", prog: prog };
    }
    function parse_prog() {
      var prog = delimited("{", "}", ";", parse_expression);
      if (prog.length == 0) return FALSE;
      if (prog.length == 1) return prog[0];
      return { type: "prog", prog: prog };
    }
    function parse_command() {
      var cmd = {};
      cmd.verb_phrase = parse_verb_phrase();
      cmd.noun_phrase = parse_noun_phrase();
      console.log(JSON.stringify(cmd));
      skip_punc(".");
      return cmd;
    }
  }

  var GVCL = (function() {
    function GVCL(aScript) {
      this.aScript = aScript;
      this.ast = parse(TokenStream(InputStream(aScript)))
    }
    return GVCL;

  })();

  var EXPORTS_OR_THIS = (
    typeof exports !== "undefined" && exports !== null ? exports : this);
  EXPORTS_OR_THIS.GVCL = GVCL;
}).call(this);

(function(/*! Stitch !*/) {
  if (!this.require) {
    var modules = {}, cache = {}, require = function(name, root) {
      var path = expand(root, name), module = cache[path], fn;
      if (module) {
        return module.exports;
      } else if (fn = modules[path] || modules[path = expand(path, './index')]) {
        module = {id: path, exports: {}};
        try {
          cache[path] = module;
          fn(module.exports, function(name) {
            return require(name, dirname(path));
          }, module);
          return module.exports;
        } catch (err) {
          delete cache[path];
          throw err;
        }
      } else {
        throw 'module \'' + name + '\' not found';
      }
    }, expand = function(root, name) {
      var results = [], parts, part;
      if (/^\.\.?(\/|$)/.test(name)) {
        parts = [root, name].join('/').split('/');
      } else {
        parts = name.split('/');
      }
      for (var i = 0, length = parts.length; i < length; i++) {
        part = parts[i];
        if (part == '..') {
          results.pop();
        } else if (part != '.' && part != '') {
          results.push(part);
        }
      }
      return results.join('/');
    }, dirname = function(path) {
      return path.split('/').slice(0, -1).join('/');
    };
    this.require = function(name) {
      return require(name, '');
    }
    this.require.define = function(bundle) {
      for (var key in bundle)
        modules[key] = bundle[key];
    };
  }
  return this.require.define;
}).call(this)({"angliciser": function(exports, require, module) {(function() {
  var angliciser;

  angliciser = function(lst, and_or_or) {
    var b, english, lstlen;
    b = and_or_or;
    and_or_or = (and_or_or == null) && " and " || and_or_or;
    if ((b != null) && and_or_or !== b) {
      throw "and_or_or failing " + b;
    }
    english = "";
    lstlen = lst.length;
    lst.forEach((function(_this) {
      return function(itm, i) {
        if (lstlen > 1) {
          if ((lstlen - 1) === i) {
            english += and_or_or;
          } else {
            if (i > 0) {
              english += ', ';
            }
          }
        }
        return english += itm;
      };
    })(this));
    return english;
  };

  (typeof exports !== "undefined" && exports !== null ? exports : this).angliciser = angliciser;

}).call(this);
}, "coloredtreepicker": function(exports, require, module) {(function() {
  var ColoredTreePicker, L_emphasizing, L_showing, L_unshowing, S_all, TreePicker, verbose,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  TreePicker = require('treepicker').TreePicker;


  /*
   *     ColoredTreePicker is a widget for displaying and manipulating a hierarchy
   *     and displaying and manipulating the selectedness of branches and nodes.
   *
   *     The terminology below is a bit screwy because the motivating hierarchy
   *     was a taxonomy controller which determined which nodes in a graph
   *     are 'shown' as selected.  Perhaps better terminology would be to have
   *     'shown' called 'marked' and 'unshown' called 'unmarked'.
   *
   *     ▼ 0x25bc
   *     ▶ 0x25b6
   *
   *     Expanded                   Collapsed
   *     +-----------------+        +-----------------+
   *     | parent        ▼ |        | parent        ▶ |
   *     |   +------------+|        +-----------------+
   *     |   | child 1    ||
   *     |   +------------+|
   *     |   | child 2    ||
   *     |   +------------+|
   *     +-----------------+
   *
   *     Clicking an expanded parent should cycle thru selection and deselection
   *     of only its direct instances, if there are any.
   *
   *     Clicking a collapsed parent should cycle thru selection and deselection
   *     of its direct instances as well as those of all its children.
   *
   *     The coloring of expanded parents cycles thru the three states:
   *       Mixed - some of the direct instances are selected
   *       On - all of the direct instances are selected
   *       Off - none of the direct instances are selected
   *
   *     The coloring of a collapsed parent cycles thru the three states:
   *       Mixed - some descendant instances are selected (direct or indirect)
   *       On - all descendant instances are selected (direct or indirect)
   *       Off - no descendant instances are selected (direct or indirect)
   *
   *     Indirect instances are the instances of subclasses.
   *
   * The states:
   *   showing    everything is "shown" (ie marked)
   *   mixed      some things are shown (ie a mixure of marked and unmarked)
   *   unshowing  though there are things, none are shown (ie unmarked)
   *   empty      a mid-level branch which itself has no direct instances
   *              (motivated by the taxon_picker which often has levels
   *               in its hierarchy which themselves have no direct instances)
   *   hidden     a leaf or whole branch which (at the moment) has no instances
   *              (motivated by the predicate_picker which needs to hide
   *               whole branches which currently contain nothing)
   *
   * Non-leaf levels in a treepicker can have indirect states different
   * from their direct states.  The direct state relates to the direct instances.
   * The indirect state spans the direct state of a level and all its children.
   * Leaf levels should always have equal direct and indirect states.
   *
   */

  L_unshowing = 0.93;

  L_showing = 0.75;

  L_emphasizing = 0.5;

  S_all = 0.5;

  verbose = false;

  ColoredTreePicker = (function(superClass) {
    extend(ColoredTreePicker, superClass);

    function ColoredTreePicker() {
      this.click_handler = bind(this.click_handler, this);
      this.recolor_now = bind(this.recolor_now, this);
      ColoredTreePicker.__super__.constructor.apply(this, arguments);
      this.id_to_colors = {};
    }

    ColoredTreePicker.prototype.add = function(id, parent_id, name, listener) {
      return ColoredTreePicker.__super__.add.call(this, id, parent_id, name, listener);
    };

    ColoredTreePicker.prototype.recolor_now = function() {
      this.id_to_colors = this.recolor();
      return this.update_css();
    };

    ColoredTreePicker.prototype.get_my_style_id = function() {
      return (this.get_my_id()) + "_colors";
    };

    ColoredTreePicker.prototype.update_css = function() {
      var colors, ctxSel, id, nc, ref, sc, styles;
      if (this.style_sheet == null) {
        this.style_sheet = this.elem.append("style");
      }
      styles = "// " + (this.get_my_id());
      ctxSel = this.style_context_selector;
      if (ctxSel) {
        ctxSel += ' ';
      }
      if (ctxSel == null) {
        ctxSel = '';
      }
      ref = this.id_to_colors;
      for (id in ref) {
        colors = ref[id];
        nc = colors.unshowing;
        sc = colors.showing;
        styles += "\n" + ctxSel + "#" + id + ".treepicker-showing {\n   background-color:" + sc + ";\n}\n" + ctxSel + "#" + id + ".treepicker-unshowing {\n   background-color:" + nc + ";\n}\n" + ctxSel + "#" + id + ".treepicker-mixed,\n" + ctxSel + "#" + id + ".treepicker-indirect-mixed.treepicker-collapse {\n  background: linear-gradient(45deg, " + nc + ", " + sc + ", " + nc + ", " + sc + ", " + nc + ", " + sc + ", " + nc + ", " + sc + ");\n  background-color: transparent;\n}";
      }
      this.style_sheet.html(styles);
      if (false) {
        if (this.style_sheet.html().length !== styles.length) {
          console.error("style_sheet_length error:", this.style_sheet.html().length, "<>", styles.length);
        } else {
          console.info("style_sheet_length good:", this.style_sheet.html().length, "==", styles.length);
        }
      }
    };

    ColoredTreePicker.prototype.recolor = function() {
      var branch, recursor, retval;
      recursor = {
        count: Object.keys(this.id_to_elem).length - this.get_abstract_count(),
        i: 0
      };
      retval = {};
      if (verbose) {
        console.log("RECOLOR");
      }
      branch = this.elem[0][0].children[0];
      this.recolor_recurse_DOM(retval, recursor, branch, "");
      return retval;
    };

    ColoredTreePicker.prototype.recolor_recurse_DOM = function(retval, recursor, branch, indent) {
      var branch_id, class_str, elem, i, len, ref;
      branch_id = branch.getAttribute("id");
      class_str = branch.getAttribute("class");
      if (verbose) {
        console.log(indent + "-recolor_recurse(", branch_id, class_str, ")", branch);
      }
      if (branch_id) {
        this.recolor_node(retval, recursor, branch_id, branch, indent);
      }
      if (branch.children.length > 0) {
        ref = branch.children;
        for (i = 0, len = ref.length; i < len; i++) {
          elem = ref[i];
          if (elem != null) {
            class_str = elem.getAttribute("class");
            if (class_str.indexOf("treepicker-label") > -1) {
              continue;
            }
            this.recolor_recurse_DOM(retval, recursor, elem, indent + " |");
          }
        }
      }
      return retval;
    };

    ColoredTreePicker.prototype.container_regex = new RegExp("container");

    ColoredTreePicker.prototype.contents_regex = new RegExp("contents");

    ColoredTreePicker.prototype.recolor_node = function(retval, recursor, id, elem_raw, indent) {
      var elem, hue, ref;
      elem = d3.select(elem_raw);
      if (this.is_abstract(id)) {
        retval[id] = {
          unshowing: hsl2rgb(0, 0, L_unshowing),
          showing: hsl2rgb(0, 0, L_showing),
          emphasizing: hsl2rgb(0, 0, L_emphasizing)
        };
      } else {
        hue = ((recursor.i + .5) / (recursor.count + 1)) * 360;
        recursor.i++;
        retval[id] = {
          unshowing: hsl2rgb(hue, S_all, L_unshowing),
          showing: hsl2rgb(hue, S_all, L_showing),
          emphasizing: hsl2rgb(hue, S_all, L_emphasizing)
        };
        if (verbose && ((ref = recursor.i) === 1 || ref === (recursor.count + 1))) {
          console.info(id, recursor, hue, retval[id]);
        }
      }
      if (verbose) {
        return console.log(indent + " - - - recolor_node(" + id + ")", retval[id].unshowing);
      }
    };

    ColoredTreePicker.prototype.get_current_color_forId = function(id) {
      var state;
      state = this.id_to_state[true][id];
      return this.get_color_forId_byName(id, state);
    };

    ColoredTreePicker.prototype.get_color_forId_byName = function(id, state_name) {
      var colors;
      id = this.uri_to_js_id(id);
      colors = this.id_to_colors[id];
      if (colors != null) {
        return colors[state_name];
      }
    };

    ColoredTreePicker.prototype.click_handler = function() {
      var id;
      id = ColoredTreePicker.__super__.click_handler.call(this);
      return this.style_with_kid_color_summary_if_needed(id);
    };

    ColoredTreePicker.prototype.style_with_kid_color_summary_if_needed = function(id) {
      if (this.should_be_colored_by_kid_summary(id)) {
        return this.style_with_kid_color_summary(id);
      }
    };

    ColoredTreePicker.prototype.should_be_colored_by_kid_summary = function(id) {
      return !this.is_leaf(id) && this.id_is_collapsed[id];
    };

    ColoredTreePicker.prototype.collapse_by_id = function(id) {
      ColoredTreePicker.__super__.collapse_by_id.call(this, id);
      return this.style_with_kid_color_summary_if_needed(id);
    };

    ColoredTreePicker.prototype.expand_by_id = function(id) {
      if (this.should_be_colored_by_kid_summary(id)) {
        this.id_to_elem[id].attr("style", "");
      }
      return ColoredTreePicker.__super__.expand_by_id.call(this, id);
    };

    ColoredTreePicker.prototype.summarize_kid_colors = function(id, color_list) {
      var color, i, kid_id, kids, len;
      color_list = color_list || [];
      kids = this.id_to_children[id];
      if (!this.is_abstract[id]) {
        color = this.get_current_color_forId(id);
        if (color != null) {
          color_list.push(color);
        }
      }
      if (kids != null) {
        for (i = 0, len = kids.length; i < len; i++) {
          kid_id = kids[i];
          this.summarize_kid_colors(kid_id, color_list);
        }
      }
      return color_list;
    };

    ColoredTreePicker.prototype.style_with_kid_color_summary = function(id) {
      var color_list;
      color_list = this.summarize_kid_colors(id);
      if (color_list.length === 1) {
        color_list.push(color_list[0]);
      }
      if (color_list.length) {
        return this.set_gradient_style(id, color_list);
      }
    };

    ColoredTreePicker.prototype.set_gradient_style = function(id, kid_colors) {
      var colors, style;
      colors = kid_colors.join(', ');
      style = "background-color: transparent;";
      style += " background: linear-gradient(45deg, " + colors + ")";
      return this.id_to_elem[id].attr("style", style);
    };

    ColoredTreePicker.prototype.set_payload = function(id, value) {
      ColoredTreePicker.__super__.set_payload.call(this, id, value);
      return this.style_with_kid_color_summary_if_needed(id);
    };

    return ColoredTreePicker;

  })(TreePicker);

  (typeof exports !== "undefined" && exports !== null ? exports : this).ColoredTreePicker = ColoredTreePicker;

}).call(this);
}, "deprecated": function(exports, require, module) {(function() {
  var Deprecated, Huviz,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Huviz = require('huviz').Huviz;

  Deprecated = (function(superClass) {
    extend(Deprecated, superClass);

    function Deprecated() {
      this.onnextsubject = bind(this.onnextsubject, this);
      this.onnextsubject = bind(this.onnextsubject, this);
      return Deprecated.__super__.constructor.apply(this, arguments);
    }

    Deprecated.prototype.hide_all_links = function() {
      this.nodes.forEach((function(_this) {
        return function(node) {
          _this.shelved_set.acquire(node);
          node.links_shown = [];
          node.showing_links = "none";
          _this.shelved_set.acquire(node);
          return _this.update_showing_links(node);
        };
      })(this));
      this.links_set.forEach((function(_this) {
        return function(link) {
          return _this.remove_ghosts(link);
        };
      })(this));
      this.links_set.clear();
      this.chosen_set.clear();
      return this.restart();
    };

    Deprecated.prototype.toggle_links = function() {
      if (!this.links_set.length) {
        this.make_links(G);
        this.restart();
      }
      return this.force.links().length;
    };

    Deprecated.prototype.fire_nextsubject_event = function(oldquad, newquad) {
      return window.dispatchEvent(new CustomEvent('nextsubject', {
        detail: {
          old: oldquad,
          "new": newquad
        },
        bubbles: true,
        cancelable: true
      }));
    };

    Deprecated.prototype.onnextsubject = function(e) {
      var subject;
      alert("sproing");
      this.calls_to_onnextsubject++;
      if (e.detail.old != null) {
        subject = this.my_graph.subjects[e.detail.old.s.raw];
        this.set_type_if_possible(subject, e.detail.old, true);
        if (this.is_ready(subject)) {
          this.get_or_create_node(subject);
          return this.tick();
        }
      }
    };

    Deprecated.prototype.show_found_links = function() {
      var sub_id, subj;
      for (sub_id in this.G.subjects) {
        subj = this.G.subjects[sub_id];
        subj.getValues("f:name").forEach((function(_this) {
          return function(name) {
            var node;
            if (name.match(_this.search_regex)) {
              node = _this.get_or_make_node(subj, [cx, cy]);
              if (node) {
                return _this.show_node_links(node);
              }
            }
          };
        })(this));
      }
      return this.restart();
    };

    Deprecated.prototype.get_or_make_node = function(subject, start_point, linked, into_set) {
      var d, n_idx, name, name_obj;
      if (!subject) {
        return;
      }
      d = this.get_node_by_id(subject.id);
      if (d) {
        return d;
      }
      start_point = start_point || [this.width / 2, this.height / 2];
      linked = typeof linked === "undefined" || linked || false;
      name_obj = subject.predicates[FOAF_name].objects[0];
      name = (name_obj.value != null) && name_obj.value || name_obj;
      d = new Node(subject.id);
      d.s = subject;
      d.name = name;
      d.point(start_point);
      d.prev_point([start_point[0] * 1.01, start_point[1] * 1.01]);
      this.assign_types(d);
      d.color = this.color_by_type(d);
      this.add_node_ghosts(d);
      n_idx = this.nodes.add(d);
      this.id2n[subject.id] = n_idx;
      if (false) {
        if (!linked) {
          n_idx = this.shelved_set.acquire(d);
          this.id2u[subject.id] = n_idx;
        } else {
          this.id2u[subject.id] = this.graphed_set.acquire(d);
        }
      } else {
        into_set = (into_set != null) && into_set || linked && this.graphed_set || this.get_default_set_by_type(d);
        into_set.acquire(d);
      }
      this.update_showing_links(d);
      return d;
    };

    Deprecated.prototype.find_links_from_node = function(node) {
      var oi, p_name, pnt, predicate, subj, target, x, y;
      target = void 0;
      subj = node.s;
      x = node.x || width / 2;
      y = node.y || height / 2;
      pnt = [x, y];
      oi = void 0;
      if (subj) {
        for (p_name in subj.predicates) {
          this.ensure_predicate(p_name);
          predicate = subj.predicates[p_name];
          oi = 0;
          predicate.objects.forEach((function(_this) {
            return function(obj, i) {
              if (obj.type === RDF_object) {
                target = _this.get_or_make_node(_this.G.subjects[obj.value], pnt);
              }
              if (target) {
                return _this.add_link(new Edge(node, target));
              }
            };
          })(this));
        }
      }
      return node.links_from_found = true;
    };

    Deprecated.prototype.find_links_to_node = function(d) {
      var parent_point, subj;
      subj = d.s;
      if (subj) {
        parent_point = [d.x, d.y];
        this.G.get_incoming_predicates(subj).forEach((function(_this) {
          return function(sid_pred) {
            var pred, sid, src;
            sid = sid_pred[0];
            pred = sid_pred[1];
            src = _this.get_or_make_node(_this.G.subjects[sid], parent_point);
            return _this.add_link(new Edge(src, d));
          };
        })(this));
      }
      return d.links_to_found = true;
    };

    Deprecated.prototype.set_type_if_possible = function(subj, quad, force) {
      var name, pred_id;
      force = !(force == null) && force;
      if ((subj.type == null) && subj.type !== ORLANDO_writer && !force) {
        return;
      }
      pred_id = quad.p.raw;
      if ((pred_id === RDF_type || pred_id === 'a') && quad.o.value === FOAF_Group) {
        subj.type = ORLANDO_org;
      } else if (force && subj.id[0].match(this.bnode_regex)) {
        subj.type = ORLANDO_other;
      } else if (force) {
        subj.type = ORLANDO_writer;
      }
      if (subj.type != null) {
        return name = (subj.predicates[FOAF_name] != null) && subj.predicates[FOAF_name].objects[0] || subj.id;
      }
    };

    Deprecated.prototype.hide_all_links = function() {
      this.nodes.forEach((function(_this) {
        return function(node) {
          _this.shelved_set.acquire(node);
          node.links_shown = [];
          node.showing_links = "none";
          _this.shelved_set.acquire(node);
          return _this.update_showing_links(node);
        };
      })(this));
      this.links_set.forEach((function(_this) {
        return function(link) {
          return _this.remove_ghosts(link);
        };
      })(this));
      this.links_set.clear();
      this.chosen_set.clear();
      return this.restart();
    };

    Deprecated.prototype.toggle_links = function() {
      if (!this.links_set.length) {
        this.make_links(G);
        this.restart();
      }
      return this.force.links().length;
    };

    Deprecated.prototype.fire_nextsubject_event = function(oldquad, newquad) {
      return window.dispatchEvent(new CustomEvent('nextsubject', {
        detail: {
          old: oldquad,
          "new": newquad
        },
        bubbles: true,
        cancelable: true
      }));
    };

    Deprecated.prototype.onnextsubject = function(e) {
      var subject;
      alert("sproing");
      this.calls_to_onnextsubject++;
      if (e.detail.old != null) {
        subject = this.my_graph.subjects[e.detail.old.s.raw];
        this.set_type_if_possible(subject, e.detail.old, true);
        if (this.is_ready(subject)) {
          this.get_or_create_node(subject);
          return this.tick();
        }
      }
    };

    Deprecated.prototype.show_found_links = function() {
      var sub_id, subj;
      for (sub_id in this.G.subjects) {
        subj = this.G.subjects[sub_id];
        subj.getValues("f:name").forEach((function(_this) {
          return function(name) {
            var node;
            if (name.match(_this.search_regex)) {
              node = _this.get_or_make_node(subj, [cx, cy]);
              if (node) {
                return _this.show_node_links(node);
              }
            }
          };
        })(this));
      }
      return this.restart();
    };

    Deprecated.prototype.get_or_make_node = function(subject, start_point, linked, into_set) {
      var d, n_idx, name, name_obj;
      if (!subject) {
        return;
      }
      d = this.get_node_by_id(subject.id);
      if (d) {
        return d;
      }
      start_point = start_point || [this.width / 2, this.height / 2];
      linked = typeof linked === "undefined" || linked || false;
      name_obj = subject.predicates[FOAF_name].objects[0];
      name = (name_obj.value != null) && name_obj.value || name_obj;
      d = new Node(subject.id);
      d.s = subject;
      d.name = name;
      d.point(start_point);
      d.prev_point([start_point[0] * 1.01, start_point[1] * 1.01]);
      this.assign_types(d);
      d.color = this.color_by_type(d);
      this.add_node_ghosts(d);
      n_idx = this.nodes.add(d);
      this.id2n[subject.id] = n_idx;
      if (false) {
        if (!linked) {
          n_idx = this.shelved_set.acquire(d);
          this.id2u[subject.id] = n_idx;
        } else {
          this.id2u[subject.id] = this.graphed_set.acquire(d);
        }
      } else {
        into_set = (into_set != null) && into_set || linked && this.graphed_set || this.get_default_set_by_type(d);
        into_set.acquire(d);
      }
      this.update_showing_links(d);
      return d;
    };

    Deprecated.prototype.find_links_from_node = function(node) {
      var oi, p_name, pnt, predicate, subj, target, x, y;
      target = void 0;
      subj = node.s;
      x = node.x || width / 2;
      y = node.y || height / 2;
      pnt = [x, y];
      oi = void 0;
      if (subj) {
        for (p_name in subj.predicates) {
          this.ensure_predicate(p_name);
          predicate = subj.predicates[p_name];
          oi = 0;
          predicate.objects.forEach((function(_this) {
            return function(obj, i) {
              if (obj.type === RDF_object) {
                target = _this.get_or_make_node(_this.G.subjects[obj.value], pnt);
              }
              if (target) {
                return _this.add_link(new Edge(node, target));
              }
            };
          })(this));
        }
      }
      return node.links_from_found = true;
    };

    Deprecated.prototype.find_links_to_node = function(d) {
      var parent_point, subj;
      subj = d.s;
      if (subj) {
        parent_point = [d.x, d.y];
        this.G.get_incoming_predicates(subj).forEach((function(_this) {
          return function(sid_pred) {
            var pred, sid, src;
            sid = sid_pred[0];
            pred = sid_pred[1];
            src = _this.get_or_make_node(_this.G.subjects[sid], parent_point);
            return _this.add_link(new Edge(src, d));
          };
        })(this));
      }
      return d.links_to_found = true;
    };

    Deprecated.prototype.set_type_if_possible = function(subj, quad, force) {
      var name, pred_id;
      force = !(force == null) && force;
      if ((subj.type == null) && subj.type !== ORLANDO_writer && !force) {
        return;
      }
      pred_id = quad.p.raw;
      if ((pred_id === RDF_type || pred_id === 'a') && quad.o.value === FOAF_Group) {
        subj.type = ORLANDO_org;
      } else if (force && subj.id[0].match(this.bnode_regex)) {
        subj.type = ORLANDO_other;
      } else if (force) {
        subj.type = ORLANDO_writer;
      }
      if (subj.type != null) {
        return name = (subj.predicates[FOAF_name] != null) && subj.predicates[FOAF_name].objects[0] || subj.id;
      }
    };

    return Deprecated;

  })(Huviz);

  (typeof exports !== "undefined" && exports !== null ? exports : this).Deprecated = Deprecated;

}).call(this);
}, "edge": function(exports, require, module) {(function() {
  var Edge;

  Edge = (function() {
    function Edge(source, target, predicate, graph) {
      var a;
      this.source = source;
      this.target = target;
      this.predicate = predicate;
      this.graph = graph;
      this.id = ((function() {
        var i, len, ref, results;
        ref = [this.source, this.predicate, this.target];
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          a = ref[i];
          results.push((a.lid == null) && a.id || a.lid);
        }
        return results;
      }).call(this)).join(' ');
      this.lid = this.id;
      this.register();
      this.contexts = [];
      this;
    }

    Edge.prototype.color = "lightgrey";

    Edge.prototype.register = function() {
      return this.predicate.add_inst(this);
    };

    Edge.prototype.register_context = function(context) {
      return this.contexts.push(context);
    };

    Edge.prototype.isSelected = function() {
      return (this.source.selected != null) || (this.target.selected != null);
    };

    Edge.prototype.show = function() {
      return this.predicate.update_state(this, 'show');
    };

    Edge.prototype.unshow = function() {
      return this.predicate.update_state(this, 'unshow');
    };

    Edge.prototype.an_end_is_selected = function() {
      return (this.target.selected != null) || (this.source.selected != null);
    };

    Edge.prototype.unselect = function() {
      return this.predicate.update_state(this, 'unselect');
    };

    Edge.prototype.select = function() {
      return this.predicate.update_state(this, 'select');
    };

    return Edge;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).Edge = Edge;

}).call(this);
}, "editui": function(exports, require, module) {(function() {
  var EditController, FiniteStateMachine, indexdDBstore,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  FiniteStateMachine = require('fsm').FiniteStateMachine;

  indexdDBstore = require('indexeddbstoragecontroller');

  EditController = (function(superClass) {
    extend(EditController, superClass);

    function EditController(huviz) {
      this.huviz = huviz;
      this.toggle_edit_form = bind(this.toggle_edit_form, this);
      this.userValid = true;
      this.ensure_verbs();
      this.build_transitions();
      this.state = null;
    }

    EditController.prototype.build_transitions = function() {
      return this.transitions = {
        prepare: {
          target: 'prepared'
        },
        disable: {
          target: 'disabled'
        },
        enable: {
          target: 'prepared'
        }
      };
    };

    EditController.prototype.on__prepare = function() {
      var clearForm, new_viscanvas, saveForm, validateForm, viscanvas;
      if (this.userValid === true && !this.con) {
        this.con = document.createElement("div");
        this.con.className = "edit-controls loggedIn";
        this.con.setAttribute("edit", "no");
        viscanvas = this.huviz.args.viscanvas_sel;
        new_viscanvas = viscanvas.replace('#', '');
        document.getElementById(new_viscanvas).appendChild(this.con);
        this.con.innerHTML = "<div class='cntrl-set slider-pair'><div class='label set-1'>VIEW</div><div class='slider'><div class='knob'></div></div><div class='label set-2'>CONTRIBUTE</div><div id='beta-note'>(Alpha)</div></div>";
        this.create_edit_form(this.con);
        this.con.getElementsByClassName("slider")[0].onclick = this.toggle_edit_form;
        this.formFields = this.con.getElementsByTagName("form")[0];
        clearForm = this.formFields.getElementsByClassName("clearForm")[0];
        saveForm = this.formFields.getElementsByClassName("saveForm")[0];
        validateForm = this.formFields.getElementsByTagName('input');
        validateForm[0].addEventListener("input", this.validate_edit_form);
        validateForm[1].addEventListener("input", this.validate_edit_form);
        validateForm[2].addEventListener("input", this.validate_edit_form);
        clearForm.addEventListener("click", this.clear_edit_form);
        saveForm.addEventListener("click", this.save_edit_form);
        this.proposed_quad = null;
        this.controls = this.formFields;
        this.subject_input = this.formFields[0];
        this.predicate_input = this.formFields[1];
        return this.object_input = this.formFields[2];
      }
    };

    EditController.prototype.hide = function() {
      return $(this.con).hide();
    };

    EditController.prototype.show = function() {
      return $(this.con).show();
    };

    EditController.prototype.on__disable = function() {
      this.hide_verbs();
      return this.hide_form();
    };

    EditController.prototype.on__enable = function() {
      this.show_verbs();
      return this.show_form();
    };

    EditController.prototype.get_verb_set = function() {
      return {
        connect: this.huviz.human_term.connect,
        spawn: this.huviz.human_term.spawn,
        specialize: this.huviz.human_term.specialize,
        annotate: this.huviz.human_term.annotate
      };
    };

    EditController.prototype.add_verbs = function() {
      var prepend, vset;
      vset = this.get_verb_set();
      this.huviz.gclui.verb_sets.unshift(vset);
      return this.huviz.gclui.add_verb_set(vset, (prepend = true));
    };

    EditController.prototype.ensure_verbs = function() {
      if (!this.my_verbs) {
        this.my_verbs = this.add_verbs();
        return this.hide_verbs();
      }
    };

    EditController.prototype.hide_verbs = function() {
      return this.my_verbs.style('display', 'none');
    };

    EditController.prototype.show_verbs = function() {
      return this.my_verbs.style('display', 'flex');
    };

    EditController.prototype.create_edit_form = function(toggleEdit) {
      var formNode;
      formNode = document.createElement('form');
      formNode.classList.add("cntrl-set", "edit-form");
      formNode.innerHTML = '<input name="subject" placeholder="subject" type="text"/><input id="predicate" name="predicate" placeholder="predicate" type="text"/><input name="object" placeholder="object" type="text"/>';
      formNode.innerHTML += '<button class="saveForm" type="button" disabled>Save</button>';
      formNode.innerHTML += '<button class="clearForm" type="button">Clear</button>';
      toggleEdit.appendChild(formNode);
      return this.set_predicate_selector();
    };

    EditController.prototype.set_predicate_selector = function() {
      var availablePredicates, j, len, predicate, ref;
      availablePredicates = [];
      if (this.huviz.predicate_set) {
        ref = this.huviz.predicate_set;
        for (j = 0, len = ref.length; j < len; j++) {
          predicate = ref[j];
          availablePredicates.push(predicate.lid);
        }
        availablePredicates.push("literal");
      } else {
        availablePredicates = ["A", "literal"];
      }
      return $("#predicate").autocomplete({
        source: availablePredicates,
        open: this.update_predicate_picked,
        close: this.update_predicate_picked,
        change: this.update_predicate_picked,
        position: {
          my: "left bottom",
          at: "left top"
        }
      });
    };

    EditController.prototype.update_predicate_picked = function(event, ui) {
      var new_pred_value;
      new_pred_value = this.predicate_input.value;
      console.log(new_pred_value + " is new predicate");
      return this.validate_proposed_edge();
    };

    EditController.prototype.hide_form = function() {
      this.con.setAttribute("edit", "no");
      return this.con.classList.remove("edit-mode");
    };

    EditController.prototype.show_form = function() {
      this.con.setAttribute("edit", "yes");
      return this.con.classList.add("edit-mode");
    };

    EditController.prototype.toggle_edit_form = function() {
      var toggleEditMode;
      toggleEditMode = this.con.getAttribute("edit");
      if (toggleEditMode === 'no') {
        this.show_verbs();
        this.show_form();
      }
      if (toggleEditMode === 'yes') {
        this.hide_verbs();
        return this.hide_form();
      }
    };

    EditController.prototype.validate_edit_form = function(evt) {
      var elem, form, i, inputFields, j, ref, saveButton;
      form = this.controls;
      inputFields = form.getElementsByTagName('input');
      saveButton = form.getElementsByTagName('button')[0];
      for (i = j = 0, ref = inputFields.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
        elem = form.elements[i];
        if (elem.value === '') {
          saveButton.disabled = 'disabled';
          break;
        } else {
          saveButton.disabled = false;
        }
      }
      return this.adjust_object_datatype();
    };

    EditController.prototype.predicate_is_DatatypeProperty = function() {
      var current_value;
      if (this.predicate_input) {
        window.THINGY = this.predicate_input;
        current_value = this.predicate_input.value;
        return current_value === 'literal';
      }
      return false;
    };

    EditController.prototype.adjust_object_datatype = function() {
      var placeholder_label;
      if (this.predicate_is_DatatypeProperty()) {
        this.object_datatype_is_literal = true;
        placeholder_label = "a literal value";
      } else {
        this.object_datatype_is_literal = false;
        placeholder_label = "object";
      }
      return this.object_input.setAttribute("placeholder", placeholder_label);
    };

    EditController.prototype.save_edit_form = function() {
      var assrtSave, elem, form, i, inputFields, j, quad, ref, saveButton, tuple;
      form = this.controls;
      inputFields = form.getElementsByTagName('input');
      tuple = [];
      for (i = j = 0, ref = inputFields.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
        elem = form.elements[i];
        console.log(elem.name + ": " + elem.value);
        tuple.push(elem.value);
      }
      assrtSave = new indexdDBstore.IndexedDBStorageController(this.huviz);
      console.log(assrtSave);
      quad = {
        s: tuple[0],
        p: tuple[1],
        o: tuple[2]
      };
      this.latest_quad = quad;
      this.huviz.set_proposed_edge(null);
      saveButton = form.getElementsByTagName('button')[0];
      for (i in inputFields) {
        form.elements[i].value = '';
      }
      return saveButton.disabled = true;
    };

    EditController.prototype.clear_edit_form = function() {
      var form, i, inputFields, saveButton;
      form = this.controls;
      inputFields = form.getElementsByTagName('input');
      saveButton = form.getElementsByTagName('button')[0];
      for (i in inputFields) {
        form.elements[i].value = '';
      }
      if (this.proposed_quad) {
        console.log("@proposed_quad:", this.proposed_quad);
        this.remove_proposed_quad();
      }
      this.set_subject_node();
      this.set_object_node();
      return saveButton.disabled = true;
    };

    EditController.prototype.set_subject_node = function(node) {
      var new_value;
      if (this.subject_node === node) {
        return;
      }
      this.subject_node = node;
      new_value = node && node.id || "";
      console.log("set_subject_node() id:'" + new_value + "'");
      this.subject_input.setAttribute("value", new_value);
      this.validate_edit_form();
      return this.validate_proposed_edge();
    };

    EditController.prototype.set_object_node = function(node) {
      var new_value;
      if (this.object_node === node) {
        return;
      }
      this.object_node = node;
      new_value = node && node.id || "";
      console.log("set_object_node() id:'" + new_value + "'");
      this.object_input.setAttribute("value", new_value);
      this.validate_edit_form();
      return this.validate_proposed_edge();
    };

    EditController.prototype.validate_proposed_edge = function() {
      var RDF_literal, RDF_object, obj_type, object_id, predicate_val, q, subject_id;
      console.log('validate_proposed_edge()');
      RDF_object = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";
      RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";
      subject_id = this.subject_input.value;
      object_id = this.object_input.value;
      predicate_val = this.predicate_input.value;
      if (subject_id && object_id) {
        obj_type = predicate_val === 'literal' ? RDF_literal : RDF_object;
        q = {
          s: subject_id,
          p: predicate_val || "anything",
          o: {
            type: obj_type,
            value: object_id
          },
          g: "http://" + Date.now()
        };
        if ((this.proposed_quad != null) && this.quads_match(q, this.proposed_quad)) {
          console.log("... skipping: <s:" + q.s + ", p:" + q.p + ", o:" + q.o.value + "> matches old");
          return;
        }
        console.log("... accepting: <s:" + q.s + ", p:" + q.p + ", o:" + q.o.value + ">");
        return this.set_proposed_quad(q);
      }
    };

    EditController.prototype.quads_match = function(a, b) {
      return (a.s === b.s) && (a.p === b.p) && (a.o.value === b.o.value);
    };

    EditController.prototype.set_proposed_quad = function(new_q) {
      console.log("set_proposed_quad()");
      if (this.proposed_quad) {
        this.remove_proposed_quad();
      }
      this.add_proposed_quad(new_q);
      this.huviz.tick();
      return console.log("Tick in editui.coffee set_proposed_quad");
    };

    EditController.prototype.add_proposed_quad = function(q) {
      var edge;
      console.log("add_proposed_quad() " + q.s + " " + q.p + " " + q.o.value);
      edge = this.huviz.add_quad(q);
      if (!edge) {
        console.log("error");
      }
      this.huviz.set_proposed_edge(edge);
      this.huviz.show_link(edge);
      return this.proposed_quad = q;
    };

    EditController.prototype.remove_proposed_quad = function() {
      var edge_id, old_edge;
      old_edge = this.huviz.proposed_edge;
      if (old_edge) {
        edge_id = old_edge.id;
        this.huviz.set_proposed_edge(null);
        this.huviz.delete_edge(old_edge);
      }
      return this.proposed_quad = null;
    };

    (typeof exports !== "undefined" && exports !== null ? exports : EditController).EditController = EditController;

    return EditController;

  })(FiniteStateMachine);

}).call(this);
}, "fsm": function(exports, require, module) {(function() {
  var FiniteStateMachine;

  FiniteStateMachine = (function() {
    function FiniteStateMachine() {}

    FiniteStateMachine.prototype.call_method_by_name = function(meth_name) {
      var meth;
      if ((meth = this[meth_name])) {
        meth.call(this);
        if (this.trace) {
          this.trace.push(meth_name);
        }
        return true;
      }
      return false;
    };

    FiniteStateMachine.prototype.set_state = function(state) {
      var called;
      called = this.call_method_by_name('enter__' + state);
      this.state = state;
      return called;
    };

    FiniteStateMachine.prototype.exit_state = function() {
      return this.call_method_by_name('exit__' + this.state);
    };

    FiniteStateMachine.prototype.get_state = function() {
      return this.state;
    };

    FiniteStateMachine.prototype.is_state = function(candidate) {
      return this.state === candidate;
    };

    FiniteStateMachine.prototype.make_noop_msg = function(trans_id, old_state, new_state) {
      return this.constructor.name + " had neither " + ("on__" + trans_id + " exit__" + old_state + " or enter__" + new_state);
    };

    FiniteStateMachine.prototype.throw_log_or_ignore_msg = function(msg) {
      var throw_log_or_ignore;
      throw_log_or_ignore = this.throw_log_or_ignore || 'ignore';
      if (throw_log_or_ignore === 'throw') {
        throw new Error(msg);
      } else if (throw_log_or_ignore === 'log') {
        console.warn(msg);
      }
    };

    FiniteStateMachine.prototype.transit = function(trans_id) {
      var called, initial_state, msg, target_id, transition;
      if (this.transitions == null) {
        this.transitions = {};
      }
      if ((transition = this.transitions[trans_id])) {
        initial_state = this.state;
        called = this.call_method_by_name('on__' + trans_id);
        called = this.exit_state() || called;
        if ((target_id = transition.target)) {
          called = this.set_state(target_id) || called;
        }
        if (!called) {
          msg = this.make_noop_msg(trans_id, initial_state, target_id);
          this.throw_log_or_ignore_msg(msg);
        }
      } else {
        this.throw_log_or_ignore_msg(this.constructor.name + " has no transition with id " + trans_id);
      }
    };

    return FiniteStateMachine;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).FiniteStateMachine = FiniteStateMachine;

}).call(this);
}, "gclui": function(exports, require, module) {
/*
 * verbs: choose,label,discard,shelve,unlabel
 * classes: writers,others,people,orgs # places,titles
 * like:
 * ids:
 *
 *  choose,label/unlabel,discard,shelve,expand
 *
 */

(function() {
  var ColoredTreePicker, CommandController, QueryManager, TreePicker, gcl, getRandomId,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  window.toggle_suspend_updates = function(val) {
    console.log("toggle_suspend_updates(#val)");
    if ((window.suspend_updates == null) || !window.suspend_updates) {
      window.suspend_updates = true;
    } else {
      window.suspend_updates = false;
    }
    if (val != null) {
      window.suspend_updates = val;
    }
    return window.suspend_updates;
  };

  getRandomId = function(prefix) {
    var max;
    max = 10000000000;
    prefix = prefix || 'id';
    return prefix + Math.floor(Math.random() * Math.floor(max));
  };

  gcl = require('graphcommandlanguage');

  ColoredTreePicker = require('coloredtreepicker').ColoredTreePicker;

  QueryManager = require('querymanager').QueryManager;

  TreePicker = require('treepicker').TreePicker;

  CommandController = (function() {
    function CommandController(huviz, container, hierarchy) {
      this.huviz = huviz;
      this.container = container;
      this.hierarchy = hierarchy;
      this.on_set_count_update = bind(this.on_set_count_update, this);
      this.clear_all_sets = bind(this.clear_all_sets, this);
      this.disengage_all_sets = bind(this.disengage_all_sets, this);
      this.handle_on_set_picked = bind(this.handle_on_set_picked, this);
      this.handle_on_verb_clicked = bind(this.handle_on_verb_clicked, this);
      this.perform_current_command = bind(this.perform_current_command, this);
      this.update_command = bind(this.update_command, this);
      this.push_future_onto_history = bind(this.push_future_onto_history, this);
      this.disengage_all_verbs = bind(this.disengage_all_verbs, this);
      this.handle_like_input = bind(this.handle_like_input, this);
      this.handle_clear_like = bind(this.handle_clear_like, this);
      this.stop_working = bind(this.stop_working, this);
      this.on_taxon_clicked = bind(this.on_taxon_clicked, this);
      this.handle_on_taxon_clicked = bind(this.handle_on_taxon_clicked, this);
      this.onChangeEnglish = bind(this.onChangeEnglish, this);
      this.add_taxon = bind(this.add_taxon, this);
      this.recolor_edges = bind(this.recolor_edges, this);
      this.on_predicate_clicked = bind(this.on_predicate_clicked, this);
      this.handle_on_predicate_clicked = bind(this.handle_on_predicate_clicked, this);
      this.add_predicate = bind(this.add_predicate, this);
      this.recolor_edges_and_predicates = bind(this.recolor_edges_and_predicates, this);
      this.handle_newpredicate = bind(this.handle_newpredicate, this);
      this.OLD_select_the_initial_set = bind(this.OLD_select_the_initial_set, this);
      this.NEW_select_the_initial_set = bind(this.NEW_select_the_initial_set, this);
      this.select_the_initial_set = bind(this.select_the_initial_set, this);
      this.on_dataset_loaded = bind(this.on_dataset_loaded, this);
      this.on_fastforward_click = bind(this.on_fastforward_click, this);
      this.on_forward_click = bind(this.on_forward_click, this);
      this.on_backward_click = bind(this.on_backward_click, this);
      this.on_rewind_click = bind(this.on_rewind_click, this);
      this.on_stashscript_clicked = bind(this.on_stashscript_clicked, this);
      this.on_downloadscript_type = bind(this.on_downloadscript_type, this);
      this.on_downloadscript_hybrid_clicked = bind(this.on_downloadscript_hybrid_clicked, this);
      this.on_downloadscript_txt_clicked = bind(this.on_downloadscript_txt_clicked, this);
      this.on_downloadscript_json_clicked = bind(this.on_downloadscript_json_clicked, this);
      if (!this.huviz.all_set.length) {
        $(this.container).hide();
      }
      d3.select(this.container).html("");
      if (this.huviz.args.display_hints) {
        this.hints = d3.select(this.container).append("div").attr("class", "hints");
        $(".hints").append($(".hint_set").contents());
      }
      this.style_context_selector = this.huviz.get_picker_style_context_selector();
      this.make_command_history();
      this.prepare_tabs_sparqlQueries();
      this.control_label("Current Command");
      this.nextcommandbox = this.comdiv.append('div');
      this.make_verb_sets();
      this.control_label("Verbs");
      this.verbdiv = this.comdiv.append('div').attr('class', 'verbs');
      this.depthdiv = this.comdiv.append('div');
      this.add_clear_both(this.comdiv);
      this.node_pickers = this.comdiv.append('div').attr("id", "node_pickers");
      this.set_picker_box_parent = this.build_set_picker("Sets", this.node_pickers);
      this.taxon_picker_box_parent = this.build_taxon_picker("Class Selector", this.node_pickers);
      this.add_clear_both(this.comdiv);
      this.likediv = this.taxon_picker_box_parent.append('div');
      this.build_predicate_picker("Edges of the Selected Nodes");
      this.init_editor_data();
      this.build_form();
      this.update_command();
      this.install_listeners();
    }

    CommandController.prototype.control_label = function(txt, what, title) {
      var label, outer;
      what = what || this.comdiv;
      outer = what.append('div');
      label = outer.append('div');
      label.classed("control_label", true).text(txt);
      if (title) {
        label.attr('title', title);
      }
      return outer;
    };

    CommandController.prototype.new_GraphCommand = function(args) {
      return new gcl.GraphCommand(this.huviz, args);
    };

    CommandController.prototype.reset_graph = function() {

      /*
      * unhide all
      * retrieve all
      * shelve all
      * sanity check set counts
       */
      this.huviz.walkBackAll();
      this.huviz.walk_path_set = [];
      this.huviz.run_command(this.new_GraphCommand({
        verbs: ['undiscard', 'unchoose', 'unselect', 'unpin', 'shelve', 'unlabel'],
        sets: [this.huviz.all_set.id],
        skip_history: true
      }));
      this.disengage_all_verbs();
      this.reset_command_history();
      return this.engaged_taxons = [];
    };

    CommandController.prototype.prepare_tabs_sparqlQueries = function() {};

    CommandController.prototype.push_sparqlQuery_onto_log = function(qry, meta) {
      var id, preElem, preJQElem, qryJQElem, queriesJQElem, queryManager;
      if (meta == null) {
        meta = {};
      }
      if (meta.timestamp == null) {
        meta.timestamp = Date.now();
      }
      id = meta.id || this.huviz.hash(qry + meta.timestamp);
      queriesJQElem = this.huviz.tabs_sparqlQueries_JQElem;
      qryJQElem = $('<div class="played command"><pre></pre></div>');
      qryJQElem.attr('id', id);
      queriesJQElem.append(qryJQElem);
      preJQElem = qryJQElem.find('pre');
      preElem = preJQElem[0];
      preJQElem.text(qry);
      queriesJQElem.scrollTop(10000);
      queryManager = new QueryManager(qry);
      return Object.assign(queryManager, {
        qryJQElem: qryJQElem,
        preJQElem: preJQElem,
        preElem: preElem
      });
    };

    CommandController.prototype.make_command_history = function() {
      var history;
      this.comdiv = d3.select(this.container).append("div");
      history = d3.select(this.huviz.oldToUniqueTabSel['tabs-history']);
      this.cmdtitle = history.append('div').attr('class', 'control_label').html('Command History').attr('style', 'display:inline');
      this.scriptPlayerControls = history.append('div').attr('class', 'scriptPlayerControls');
      this.scriptRewindButton = this.scriptPlayerControls.append('button').attr('title', 'rewind to start').attr('disabled', 'disabled').on('click', this.on_rewind_click);
      this.scriptRewindButton.append('i').attr("class", "fa fa-fast-backward");
      this.scriptBackButton = this.scriptPlayerControls.append('button').attr('title', 'go back one step').attr('disabled', 'disabled').on('click', this.on_backward_click);
      this.scriptBackButton.append('i').attr("class", "fa fa-play fa-flip-horizontal");
      this.scriptPlayButton = this.scriptPlayerControls.append('button').attr('title', 'play script step by step').attr('disabled', 'disabled').on('click', this.on_forward_click);
      this.scriptPlayButton.append('i').attr("class", "fa fa-play");
      this.scriptForwardButton = this.scriptPlayerControls.append('button').attr('title', 'play script continuously').attr('disabled', 'disabled').on('click', this.on_fastforward_click);
      this.scriptForwardButton.append('i').attr("class", "fa fa-fast-forward");
      this.scriptDownloadButton = this.scriptPlayerControls.append('button').attr('title', 'save script to file').attr('style', 'margin-left:1em').attr('disabled', 'disabled').on('click', this.on_downloadscript_hybrid_clicked);
      this.scriptDownloadButton.append('i').attr("class", "fa fa-download");
      this.scriptDownloadJsonButton = this.scriptPlayerControls.append('button').attr('title', 'save script as .json').attr('style', 'display:none').on('click', this.on_downloadscript_json_clicked);
      this.scriptDownloadJsonButton.append('i').attr("class", "fa fa-download").append('span').text('.json');
      this.scriptStashButton = this.scriptPlayerControls.append('button').attr('title', 'save script to menu').attr('disabled', 'disabled').attr('style', 'margin-left:.1em').on('click', this.on_stashscript_clicked);
      this.scriptStashButton.append('i').attr("class", "fa fa-bars");
      this.cmdlist = history.append('div').attr('class', 'commandlist');
      this.oldcommands = this.cmdlist.append('div').attr('class', 'commandhistory').style('max-height', (this.huviz.height - 80) + "px");
      this.commandhistoryElem = this.huviz.topElem.querySelector('.commandhistory');
      this.commandhistory_JQElem = $(this.commandhistoryElem);
      this.future_cmdArgs = [];
      this.command_list = [];
      return this.command_idx0 = 0;
    };

    CommandController.prototype.reset_command_history = function() {
      var i, len, record, ref, results;
      ref = this.command_list;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        record = ref[i];
        results.push(record.elem.attr('class', 'command'));
      }
      return results;
    };

    CommandController.prototype.get_downloadscript_name = function(ext) {
      return this.lastScriptName || ('HuVizScript.' + ext);
    };

    CommandController.prototype.get_script_prefix = function() {
      return ["#!/bin/env huviz", "# This HuVis script file was generated by the page:", "#   " + this.huviz.get_reload_uri(), "# Generated at " + (new Date()).toISOString(), "", ""].join("\n");
    };

    CommandController.prototype.get_script_body = function() {
      return this.get_script_prefix() + this.oldcommands.text();
    };

    CommandController.prototype.get_script_body_as_json = function() {
      var cmd, cmdList, elem_and_cmd, i, len, ref, replacer;
      cmdList = [];
      if (this.huviz.dataset_loader.value) {
        cmdList.push({
          verbs: ['load'],
          data_uri: this.huviz.dataset_loader.value,
          ontologies: [this.huviz.ontology_loader.value],
          skip_history: true
        });
      }
      ref = this.command_list;
      for (i = 0, len = ref.length; i < len; i++) {
        elem_and_cmd = ref[i];
        cmd = elem_and_cmd.cmd;
        cmdList.push(cmd.args_or_str);
      }
      replacer = function(key, value) {
        var j, k, len1, len2, node_or_id, obj, retlist, setId, set_or_id;
        retlist = [];
        if (key === 'subjects') {
          for (j = 0, len1 = value.length; j < len1; j++) {
            node_or_id = value[j];
            if (!node_or_id.id) {
              console.debug("expecting node_or_id to have attribute .id", node_or_id);
            }
            if (node_or_id.id && node_or_id.lid) {
              obj = {
                id: node_or_id.id,
                lid: node_or_id.lid
              };
            }
            retlist.push(obj || node_or_id);
          }
          return retlist;
        }
        if (key === 'sets') {
          for (k = 0, len2 = value.length; k < len2; k++) {
            set_or_id = value[k];
            setId = set_or_id.id || set_or_id;
            retlist.push(setId);
          }
          return retlist;
        }
        return value;
      };
      return JSON.stringify(cmdList, replacer, 4);
    };

    CommandController.prototype.get_script_body_as_hybrid = function() {
      return this.get_script_body() + "\n\n" + this.huviz.json_script_marker + "\n\n" + this.get_script_body_as_json();
    };

    CommandController.prototype.make_txt_script_href = function() {
      var theBod, theHref;
      theBod = encodeURIComponent(this.get_script_body());
      theHref = "data:text/plain;charset=utf-8," + theBod;
      return theHref;
    };

    CommandController.prototype.make_json_script_href = function() {
      var theHref, theJSON;
      theJSON = encodeURIComponent(this.get_script_body_as_json());
      theHref = "data:text/json;charset=utf-8," + theJSON;
      return theHref;
    };

    CommandController.prototype.make_hybrid_script_href = function() {
      var theBod, theHref;
      theBod = encodeURIComponent(this.get_script_body_as_hybrid());
      theHref = "data:text/plain;charset=utf-8," + theBod;
      return theHref;
    };

    CommandController.prototype.on_downloadscript_json_clicked = function() {
      this.on_downloadscript_type('json');
    };

    CommandController.prototype.on_downloadscript_txt_clicked = function() {
      this.on_downloadscript_type('txt');
    };

    CommandController.prototype.on_downloadscript_hybrid_clicked = function() {
      this.on_downloadscript_type('hybrid', 'txt');
    };

    CommandController.prototype.on_downloadscript_type = function(scriptFileType, ext) {
      var node, theHref, thisName, transientLink;
      transientLink = this.scriptPlayerControls.append('a');
      transientLink.text('script');
      thisName = prompt("What would you like to call your saved script?", this.get_downloadscript_name(ext || scriptFileType));
      if (!thisName) {
        return;
      }
      this.lastScriptName = thisName;
      transientLink.attr('style', 'display:none');
      transientLink.attr('download', this.lastScriptName);
      if (scriptFileType === 'json') {
        theHref = this.make_json_script_href();
      } else if (scriptFileType === 'txt') {
        theHref = this.make_txt_script_href();
      } else if (scriptFileType === 'hybrid') {
        theHref = this.make_hybrid_script_href();
      }
      transientLink.attr('href', theHref);
      transientLink.node().click();
      node = transientLink.node();
      node.parentNode.removeChild(node);
    };

    CommandController.prototype.on_stashscript_clicked = function() {
      var ext, scriptFileType, script_rec, thisName;
      scriptFileType = 'hybrid';
      ext = 'txt';
      thisName = prompt("What would you like to call this script in your menu?", this.get_downloadscript_name(ext || scriptFileType));
      if (!thisName) {
        return;
      }
      this.lastScriptName = thisName;
      script_rec = {
        uri: thisName,
        opt_group: 'Your Own',
        data: this.get_script_body_as_hybrid()
      };
      this.huviz.script_loader.add_local_file(script_rec);
    };

    CommandController.prototype.on_rewind_click = function() {
      this.reset_graph();
      this.command_idx0 = 0;
      return this.update_script_buttons();
    };

    CommandController.prototype.on_backward_click = function() {
      var forward_to_idx;
      forward_to_idx = this.command_idx0 - 1;
      this.on_rewind_click();
      return this.on_fastforward_click(forward_to_idx);
    };

    CommandController.prototype.on_forward_click = function() {
      this.play_old_command_by_idx(this.command_idx0);
      this.command_idx0++;
      return this.update_script_buttons();
    };

    CommandController.prototype.on_fastforward_click = function(forward_to_idx) {
      var results;
      if (forward_to_idx == null) {
        forward_to_idx = this.command_list.length;
      }
      results = [];
      while (this.command_idx0 < forward_to_idx) {
        results.push(this.on_forward_click());
      }
      return results;
    };

    CommandController.prototype.play_old_command_by_idx = function(idx) {
      var record;
      record = this.command_list[idx];
      record.elem.attr('class', 'command played');
      return this.play_old_command(record.cmd);
    };

    CommandController.prototype.play_old_command = function(cmd) {
      cmd.skip_history = true;
      cmd.skip_history_remove = true;
      return this.huviz.run_command(cmd);
    };

    CommandController.prototype.install_listeners = function() {
      window.addEventListener('changePredicate', this.predicate_picker.onChangeState);
      window.addEventListener('changeTaxon', this.taxon_picker.onChangeState);
      return window.addEventListener('changeEnglish', this.onChangeEnglish);
    };

    CommandController.prototype.on_dataset_loaded = function(evt) {
      if (evt.done == null) {
        $(this.container).show();
        this.show_succession_of_hints();
        this.huviz.perform_tasks_after_dataset_loaded();
        this.huviz.hide_state_msg();
        return evt.done = true;
      }
    };

    CommandController.prototype.show_succession_of_hints = function() {
      var i, len, ref, reminder;
      $(".hints.hint_set").show();
      ref = $(".hints > .a_hint");
      for (i = 0, len = ref.length; i < len; i++) {
        reminder = ref[i];
        $(reminder).attr('style', 'position:relative');
        $(reminder).append('<i class="fa fa-close close_hint"></i>').on("click", (function(_this) {
          return function(evt, ui) {
            $(evt.target).parent().hide();
            if ($(evt.target).parent().next()) {
              $(evt.target).parent().next().show();
            }
            return false;
          };
        })(this));
      }
      $(".hints > .a_hint").hide();
      return $(".hints > .a_hint").first().show();
    };

    CommandController.prototype.select_the_initial_set = function() {
      this.OLD_select_the_initial_set();
    };

    CommandController.prototype.NEW_select_the_initial_set = function() {
      this.huviz.run_command(this.new_GraphCommand({
        verbs: ['select'],
        every_class: true,
        classes: ['Thing'],
        skip_history: true
      }));
      this.huviz.run_command(this.new_GraphCommand({
        verbs: ['unselect'],
        every_class: true,
        classes: ['Thing'],
        skip_history: true
      }));
      this.huviz.shelved_set.resort();
    };

    CommandController.prototype.OLD_select_the_initial_set = function() {
      var rm_cmd, toggleEveryThing;
      rm_cmd = (function(_this) {
        return function() {
          return _this.delete_script_command_by_idx(0);
        };
      })(this);
      toggleEveryThing = (function(_this) {
        return function() {
          _this.huviz.toggle_taxon("Thing", false);
          return setTimeout(rm_cmd, 1000);
        };
      })(this);
      toggleEveryThing.call();
      setTimeout(toggleEveryThing, 1200);
      setTimeout(this.push_future_onto_history, 1800);
      this.huviz.shelved_set.resort();
    };

    CommandController.prototype.check_until_then = function(checkCallback, thenCallback) {
      var intervalId, nag;
      nag = (function(_this) {
        return function() {
          if (checkCallback.call()) {
            clearInterval(intervalId);
            return thenCallback.call();
          }
        };
      })(this);
      return intervalId = setInterval(nag, 30);
    };

    CommandController.prototype.init_editor_data = function() {
      this.shown_edges_by_predicate = {};
      this.unshown_edges_by_predicate = {};
      return this.engaged_taxons = [];
    };

    CommandController.prototype.reset_editor = function() {
      this.clear_like();
      this.disengage_all_verbs();
      this.disengage_all_sets();
      this.clear_all_sets();
      this.init_editor_data();
      return this.update_command();
    };

    CommandController.prototype.disengage_command = function() {
      this.clear_like();
      this.disengage_all_verbs();
      this.disengage_all_sets();
      return this.update_command();
    };

    CommandController.prototype.disengage_all = function() {
      this.clear_like();
      this.disengage_all_sets();
      this.disengage_all_verbs();
      return this.update_command();
    };

    CommandController.prototype.add_clear_both = function(target) {
      return target.append('div').attr('style', 'clear:both');
    };

    CommandController.prototype.ignore_predicate = function(pred_id) {
      return this.predicates_ignored.push(pred_id);
    };

    CommandController.prototype.handle_newpredicate = function(e) {
      var parent_lid, pred_lid, pred_name, pred_uri;
      pred_uri = e.detail.pred_uri;
      parent_lid = e.detail.parent_lid;
      pred_lid = e.detail.pred_lid;
      pred_name = e.detail.pred_name;
      if (indexOf.call(this.predicates_ignored, pred_uri) < 0) {
        if (indexOf.call(this.predicates_ignored, pred_lid) < 0) {
          if (pred_name == null) {
            pred_name = pred_lid.match(/([\w\d\_\-]+)$/g)[0];
          }
          this.add_predicate(pred_lid, parent_lid, pred_name);
          return this.recolor_edges_and_predicates_eventually(e);
        }
      }
    };

    CommandController.prototype.recolor_edges_and_predicates_eventually = function() {
      if (this.recolor_edges_and_predicates_eventually_id != null) {
        clearTimeout(this.recolor_edges_and_predicates_eventually_id);
      }
      return this.recolor_edges_and_predicates_eventually_id = setTimeout(this.recolor_edges_and_predicates, 300);
    };

    CommandController.prototype.recolor_edges_and_predicates = function(evt) {
      this.predicate_picker.recolor_now();
      return this.recolor_edges();
    };

    CommandController.prototype.resort_pickers = function() {
      if (this.taxon_picker != null) {
        this.taxon_picker.resort_recursively();
        this.taxon_picker.recolor_now();
        this.huviz.recolor_nodes();
      }
      if (this.predicate_picker != null) {
        console.log("resorting of predicate_picker on hold until it does not delete 'anything'");
      }
    };

    CommandController.prototype.build_predicate_picker = function(label) {
      var extra_classes, needs_expander, squash_case, title, use_name_as_label, where;
      this.predicates_id = this.huviz.unique_id('predicates_');
      title = "Medium color: all edges shown -- click to show none\n" + "Faint color: no edges are shown -- click to show all\n" + "Stripey color: some edges shown -- click to show all\n" + "Hidden: no edges among the selected nodes";
      where = (label != null) && this.control_label(label, this.comdiv, title) || this.comdiv;
      this.predicatebox = where.append('div').classed('container', true).attr('id', this.predicates_id);
      this.predicates_ignored = [];
      this.predicate_picker = new ColoredTreePicker(this.predicatebox, 'anything', (extra_classes = []), (needs_expander = true), (use_name_as_label = true), (squash_case = true), this.style_context_selector);
      this.predicate_hierarchy = {
        'anything': ['anything']
      };
      this.predicate_picker.click_listener = this.handle_on_predicate_clicked;
      this.predicate_picker.show_tree(this.predicate_hierarchy, this.predicatebox);
      this.predicates_JQElem = $(this.predicates_id);
      this.predicates_JQElem.addClass("predicates ui-resizable").append("<br class='clear'>");
      return this.predicates_JQElem.resizable({
        handles: 's'
      });
    };

    CommandController.prototype.add_predicate = function(pred_lid, parent_lid, pred_name) {
      this.predicate_picker.add(pred_lid, parent_lid, pred_name, this.handle_on_predicate_clicked);
      return this.make_predicate_proposable(pred_lid);
    };

    CommandController.prototype.make_predicate_proposable = function(pred_lid) {
      var predicate_ctl;
      predicate_ctl = this.predicate_picker.id_to_elem[pred_lid];
      predicate_ctl.on('mouseenter', (function(_this) {
        return function() {
          var every, nextStateArgs, ready;
          every = !!_this.predicate_picker.id_is_collapsed[pred_lid];
          nextStateArgs = _this.predicate_picker.get_next_state_args(pred_lid);
          if (nextStateArgs.new_state === 'showing') {
            _this.proposed_verb = 'draw';
          } else {
            _this.proposed_verb = 'undraw';
          }
          _this.regarding = [pred_lid];
          _this.regarding_every = !!_this.predicate_picker.id_is_collapsed[pred_lid];
          ready = _this.prepare_command(_this.build_command());
        };
      })(this));
      return predicate_ctl.on('mouseleave', (function(_this) {
        return function() {
          _this.proposed_verb = null;
          _this.regarding = null;
          _this.prepare_command(_this.build_command());
        };
      })(this));
    };

    CommandController.prototype.handle_on_predicate_clicked = function(pred_id, new_state, elem, args) {
      this.start_working();
      return setTimeout((function(_this) {
        return function() {
          return _this.on_predicate_clicked(pred_id, new_state, elem, args);
        };
      })(this));
    };

    CommandController.prototype.on_predicate_clicked = function(pred_id, new_state, elem, args) {
      var cmd, skip_history, verb;
      skip_history = !args || !args.original_click;
      if (new_state === 'showing') {
        verb = 'draw';
      } else {
        verb = 'undraw';
      }
      cmd = this.new_GraphCommand({
        verbs: [verb],
        regarding: [pred_id],
        regarding_every: !!this.predicate_picker.id_is_collapsed[pred_id],
        sets: [this.huviz.selected_set.id],
        skip_history: skip_history
      });
      this.prepare_command(cmd);
      return this.huviz.run_command(this.command);
    };

    CommandController.prototype.recolor_edges = function(evt) {
      var count, edge, i, len, node, pred_n_js_id, ref, results;
      count = 0;
      ref = this.huviz.all_set;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        node = ref[i];
        results.push((function() {
          var j, len1, ref1, results1;
          ref1 = node.links_from;
          results1 = [];
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            edge = ref1[j];
            count++;
            pred_n_js_id = edge.predicate.id;
            results1.push(edge.color = this.predicate_picker.get_color_forId_byName(pred_n_js_id, 'showing'));
          }
          return results1;
        }).call(this));
      }
      return results;
    };

    CommandController.prototype.build_taxon_picker = function(label, where) {
      var extra_classes, id, needs_expander, squash_case, title, use_name_as_label;
      id = 'classes';
      title = "Medium color: all nodes are selected -- click to select none\n" + "Faint color: no nodes are selected -- click to select all\n" + "Stripey color: some nodes are selected -- click to select all\n";
      where = (label != null) && this.control_label(label, where, title) || this.comdiv;
      this.taxon_box = where.append('div').classed('container', true).attr('id', id);
      this.taxon_box.attr('style', 'vertical-align:top');
      this.taxon_picker = new ColoredTreePicker(this.taxon_box, 'Thing', (extra_classes = []), (needs_expander = true), (use_name_as_label = true), (squash_case = true), this.style_context_selector);
      this.taxon_picker.click_listener = this.handle_on_taxon_clicked;
      this.taxon_picker.hover_listener = this.on_taxon_hovered;
      this.taxon_picker.show_tree(this.hierarchy, this.taxon_box);
      where.classed("taxon_picker_box_parent", true);
      return where;
    };

    CommandController.prototype.add_taxon = function(taxon_id, parent_lid, class_name, taxon) {
      this.taxon_picker.add(taxon_id, parent_lid, class_name, this.handle_on_taxon_clicked);
      this.make_taxon_proposable(taxon_id);
      this.taxon_picker.recolor_now();
      return this.huviz.recolor_nodes();
    };

    CommandController.prototype.make_taxon_proposable = function(taxon_id) {
      var taxon_ctl;
      taxon_ctl = this.taxon_picker.id_to_elem[taxon_id];
      taxon_ctl.on('mouseenter', (function(_this) {
        return function(evt) {
          var ready;
          _this.proposed_taxon = taxon_id;
          _this.proposed_every = !!_this.taxon_picker.id_is_collapsed[taxon_id];
          if (!_this.engaged_verbs.length) {
            if (_this.engaged_taxons.includes(taxon_id)) {
              _this.proposed_verb = 'unselect';
            } else {
              _this.proposed_verb = 'select';
            }
          }
          ready = _this.prepare_command(_this.build_command());
        };
      })(this));
      taxon_ctl.on('mouseleave', (function(_this) {
        return function(evt) {
          var ready;
          _this.proposed_taxon = null;
          _this.proposed_verb = null;
          ready = _this.prepare_command(_this.build_command());
        };
      })(this));
    };

    CommandController.prototype.onChangeEnglish = function(evt) {
      this.object_phrase = evt.detail.english;
      this.prepare_command(this.build_command());
      return this.update_command();
    };

    CommandController.prototype.handle_on_taxon_clicked = function(id, new_state, elem, args) {
      this.start_working();
      return setTimeout((function(_this) {
        return function() {
          return _this.on_taxon_clicked(id, new_state, elem, args);
        };
      })(this));
    };

    CommandController.prototype.set_taxa_click_storm_callback = function(callback) {
      if (this.taxa_click_storm_callback != null) {
        throw new Error("taxa_click_storm_callback already defined");
      } else {
        return this.taxa_click_storm_callback = callback;
      }
    };

    CommandController.prototype.taxa_being_clicked_increment = function() {
      if (this.taxa_being_clicked == null) {
        this.taxa_being_clicked = 0;
      }
      this.taxa_being_clicked++;
    };

    CommandController.prototype.taxa_being_clicked_decrement = function() {
      if (this.taxa_being_clicked == null) {
        throw new Error("taxa_being_clicked_decrement() has apparently been called before taxa_being_clicked_increment()");
      }
      this.taxa_being_clicked--;
      if (this.taxa_being_clicked === 0) {
        if (this.taxa_click_storm_callback != null) {
          this.taxa_click_storm_callback.call(document);
          return this.taxa_click_storm_callback = null;
        }
      }
    };

    CommandController.prototype.make_run_transient_and_cleanup_callback = function(because) {
      return (function(_this) {
        return function(err) {
          if (err) {
            console.log(err);
            throw err;
          }
          _this.huviz.clean_up_all_dirt();
          _this.run_any_immediate_command({});
          _this.perform_any_cleanup(because);
        };
      })(this);
    };

    CommandController.prototype.on_taxon_clicked = function(taxonId, new_state, elem, args) {
      var because, cmd, every_class, hasVerbs, old_state, skip_history, taxon;
      if (args == null) {
        args = {};
      }
      taxon = this.huviz.taxonomy[taxonId];
      hasVerbs = !!this.engaged_verbs.length;
      skip_history = !args.original_click;
      every_class = !!args.collapsed;
      if (hasVerbs) {
        cmd = this.new_GraphCommand({
          verbs: this.engaged_verbs,
          classes: [taxonId],
          every_class: every_class,
          skip_history: skip_history
        });
        this.huviz.run_command(cmd);
        return;
      }
      if (taxon != null) {
        old_state = taxon.get_state();
      } else {
        throw "Uhh, there should be a root Taxon 'Thing' by this point: " + taxonId;
      }
      if (new_state === 'showing') {
        if (old_state === 'mixed' || old_state === 'unshowing' || old_state === 'empty') {
          if (!(indexOf.call(this.engaged_taxons, taxonId) >= 0)) {
            this.engaged_taxons.push(taxonId);
          }
          cmd = this.new_GraphCommand({
            verbs: ['select'],
            classes: [taxonId],
            every_class: every_class,
            skip_history: skip_history
          });
        } else {
          console.error("no action needed because " + taxonId + "." + old_state + " == " + new_state);
        }
      } else if (new_state === 'unshowing') {
        this.unselect_node_class(taxonId);
        cmd = this.new_GraphCommand({
          verbs: ['unselect'],
          classes: [taxonId],
          every_class: every_class,
          skip_history: skip_history
        });
      } else if (old_state === "hidden") {
        console.error(taxonId + ".old_state should NOT equal 'hidden' here");
      }
      this.taxon_picker.style_with_kid_color_summary_if_needed(taxonId);
      if (cmd != null) {
        this.huviz.run_command(cmd, this.make_run_transient_and_cleanup_callback(because));
        because = {};
      }
      this.update_command();
    };

    CommandController.prototype.unselect_node_class = function(node_class) {
      return this.engaged_taxons = this.engaged_taxons.filter(function(eye_dee) {
        return eye_dee !== node_class;
      });
    };

    CommandController.prototype.make_verb_sets = function() {
      this.verb_sets = [
        {
          choose: this.huviz.human_term.choose,
          unchoose: this.huviz.human_term.unchoose,
          wander: this.huviz.human_term.wander,
          walk: this.huviz.human_term.walk
        }, {
          select: this.huviz.human_term.select,
          unselect: this.huviz.human_term.unselect
        }, {
          label: this.huviz.human_term.label,
          unlabel: this.huviz.human_term.unlabel
        }, {
          shelve: this.huviz.human_term.shelve,
          hide: this.huviz.human_term.hide
        }, {
          discard: this.huviz.human_term.discard,
          undiscard: this.huviz.human_term.undiscard
        }, {
          pin: this.huviz.human_term.pin,
          unpin: this.huviz.human_term.unpin
        }
      ];
      if (this.huviz.show_hunt_verb) {
        return this.verb_sets.push({
          hunt: this.huviz.human_term.hunt
        });
      }
    };

    CommandController.prototype.auto_change_verb_tests = {
      select: function(node) {
        if (node.selected != null) {
          return 'unselect';
        }
      },
      unselect: function(node) {
        if (node.selected == null) {
          return 'select';
        }
      },
      choose: function(node) {
        if (node.chosen != null) {
          return 'unchoose';
        }
      },
      unchoose: function(node, engagedVerb) {
        if (node.chosen == null) {
          return 'choose' || engagedVerb;
        }
      },
      wander: function(node) {
        if (node.chosen != null) {
          return 'wander';
        }
      },
      walk: function(node) {
        if (node.chosen != null) {
          return 'walk';
        }
      },
      label: function(node) {
        if (node.labelled) {
          return 'unlabel';
        }
      },
      unlabel: function(node) {
        if (!node.labelled) {
          return 'label';
        }
      },
      unpin: function(node) {
        if (!node.fixed) {
          return 'pin';
        }
      },
      pin: function(node) {
        if (node.fixed) {
          return 'unpin';
        }
      }
    };

    CommandController.prototype.should_be_immediate_mode = function() {
      return !this.is_verb_phrase_empty() && this.is_command_object_empty() && !this.liking_all_mode;
    };

    CommandController.prototype.is_command_object_empty = function() {
      return this.huviz.selected_set.length === 0 && (this.chosen_set == null);
    };

    CommandController.prototype.is_verb_phrase_empty = function() {
      return this.engaged_verbs.length === 0;
    };

    CommandController.prototype.auto_change_verb_if_warranted = function(node) {
      var next_verb, test, verb;
      if (this.huviz.edit_mode) {
        return;
      }
      if (this.immediate_execution_mode) {
        if (this.engaged_verbs.length === 1) {
          verb = this.engaged_verbs[0];
          test = this.auto_change_verb_tests[verb];
          if (test) {
            next_verb = test(node, this.engaged_verbs[0]);
            if (next_verb) {
              this.engage_verb(next_verb, verb === this.transient_verb_engaged);
            }
          }
        }
        return this.huviz.set_cursor_for_verbs(this.engaged_verbs);
      } else {
        return this.huviz.set_cursor_for_verbs([]);
      }
    };

    CommandController.prototype.verbs_requiring_regarding = ['show', 'suppress', 'emphasize', 'deemphasize'];

    CommandController.prototype.verbs_override = {
      choose: ['discard', 'unchoose', 'shelve', 'hide', 'wander', 'walk'],
      wander: ['choose', 'unchoose', 'discard', 'shelve', 'hide', 'walk'],
      walk: ['choose', 'unchoose', 'discard', 'shelve', 'hide', 'wander'],
      shelve: ['unchoose', 'choose', 'hide', 'discard', 'retrieve', 'wander', 'walk'],
      discard: ['choose', 'retrieve', 'hide', 'unchoose', 'unselect', 'select', 'wander', 'walk'],
      hide: ['discard', 'undiscard', 'label', 'choose', 'unchoose', 'select', 'unselect', 'wander', 'walk'],
      hunt: ['discard', 'undiscard', 'choose', 'unchoose', 'wander', 'walk', 'hide', 'unhide', 'shelve', 'pin', 'unpin']
    };

    CommandController.prototype.verb_descriptions = {
      choose: "Put nodes in the graph and pull other, connected nodes in too, so long as they haven't been discarded.",
      wander: "Put nodes in the graph and pull connected nodes in followed by shelving of the nodes which had been pulled into the graph previously.",
      walk: "Put nodes in the graph but keep the previous central nodes activated. Shelve previous sub-nodes.",
      shelve: "Remove nodes from the graph and put them on the shelf (the circle of nodes around the graph) from which they might return if called back into the graph by a neighbor being chosen.",
      hide: "Remove nodes from the graph and don't display them anywhere, though they might be called back into the graph when some other node calls it back in to show an edge.",
      label: "Show the node's labels.",
      unlabel: "Stop showing the node's labels.",
      discard: "Put nodes in the discard bin (the small red circle which appears when you start dragging a node) from which they do not get called back into the graph unless they are first retrieved.",
      undiscard: "Retrieve nodes from the discard bin (the small red circle which appears when you start dragging a node)) and put them back on the shelf.",
      print: "Print associated snippets.",
      redact: "Hide the associated snippets.",
      show: "Show edges: 'Show (nodes) regarding (edges).' Add to the existing state of the graph edges from nodes of the classes indicated edges of the types indicated.",
      suppress: "Stop showing: 'Suppress (nodes) regarding (edges).' Remove from the existing sate of the graph edges of the types indicated from nodes of the types classes indicated.",
      specify: "Immediately specify the entire state of the graph with the constantly updating set of edges indicated from nodes of the classes indicated.",
      load: "Load knowledge from the given uri.",
      pin: "Make a node immobile",
      unpin: "Make a node mobile again",
      hunt: "Animate binary search for the node"
    };

    CommandController.prototype.verb_cursors = {
      choose: "←",
      unchoose: "⇠",
      wander: "🚶",
      walk: "🚶",
      shelve: "↺",
      label: "☭",
      unlabel: "☢",
      discard: "☣",
      undiscard: "☯",
      hide: "☠",
      select: "☘",
      unselect: "☺",
      pin: "p",
      unpin: "u",
      hunt: "X"
    };

    CommandController.prototype.build_form = function() {
      this.build_verb_form();
      this.build_depth();
      this.build_like();
      this.nextcommand = this.nextcommandbox.append('div').attr('class', 'nextcommand command');
      this.nextcommandstr = this.nextcommand.append('code');
      $(this.nextcommandstr[0][0]).addClass('nextcommand_str');
      if (this.nextcommand_prompts_visible && this.nextcommand_str_visible) {
        this.nextcommand.append('hr');
      }
      this.nextcommand_prompts = this.nextcommand.append('code');
      this.nextcommand_prompts.attr('class', 'nextcommand_prompt');
      this.nextcommand_verb_phrase = this.nextcommand_prompts.append('span');
      this.nextcommand_verb_phrase.attr('class', 'verb_phrase');
      this.nextcommand_noun_phrase = this.nextcommand_prompts.append('span');
      this.nextcommand_noun_phrase.attr('class', 'noun_phrase');
      this.nextcommand_suffix_phrase = this.nextcommand_prompts.append('span');
      this.nextcommand_suffix_phrase.attr('class', 'suffix_phrase');
      if (this.nextcommand_prompts_visible) {
        $(this.nextcommand_prompts[0][0]).show();
      } else {
        $(this.nextcommand_prompts[0][0]).hide();
      }
      if (this.nextcommand_str_visible) {
        $(this.nextcommandstr[0][0]).show();
      } else {
        $(this.nextcommandstr[0][0]).hide();
      }
      this.nextcommand_working = this.nextcommand.append('div').attr('class', 'cmd-spinner');
      this.nextcommand_working.style('float:right; color:red; display:none;');
      return this.build_submit();
    };

    CommandController.prototype.working_timeout = 500;

    CommandController.prototype.start_working = function() {
      log_click();
      if (this.already_working) {
        clearTimeout(this.already_working);
      } else {
        this.show_working_on();
      }
      return this.already_working = setTimeout(this.stop_working, this.working_timeout);
    };

    CommandController.prototype.stop_working = function() {
      this.show_working_off();
      return this.already_working = void 0;
    };

    CommandController.prototype.show_working_on = function(cmd) {
      if ((cmd != null) && !cmd.skip_history) {
        this.push_command_onto_history(cmd);
      }
      this.nextcommand_working.attr('class', 'fa fa-spinner fa-spin');
      return this.nextcommand.attr('class', 'nextcommand command cmd-working');
    };

    CommandController.prototype.show_working_off = function() {
      this.nextcommand_working.attr('class', '');
      return this.nextcommand.attr('class', 'nextcommand command');
    };

    CommandController.prototype.build_depth = function() {
      this.depthdiv.text('Activate/Wander Depth:').classed("control_label activate_depth", true);
      this.depthdiv.style('display', 'none');
      this.depthdiv.style('white-space', 'nowrap');
      this.depth_input = this.depthdiv.append('input');
      this.depth_input.attr('class', 'depth_input');
      this.depth_input.attr('placeholder', '1');
      this.depth_input.attr('type', 'number');
      this.depth_input.attr('min', '1');
      this.depth_input.attr('max', '9');
      return this.depth_input.attr('value', '1');
    };

    CommandController.prototype.build_like = function() {
      this.likediv.text('matching:').classed("control_label", true);
      this.likediv.style('display', 'inline-block');
      this.likediv.style('white-space', 'nowrap');
      this.like_input = this.likediv.append('input');
      this.like_input.attr('class', 'like_input');
      this.like_input.attr('placeholder', 'node Name');
      this.liking_all_mode = false;
      this.like_input.on('input', this.handle_like_input);
      this.clear_like_button = this.likediv.append('button').text('⌫');
      this.clear_like_button.attr('type', 'button').classed('clear_like', true);
      this.clear_like_button.attr('disabled', 'disabled');
      this.clear_like_button.attr('title', 'clear the "matching" field');
      return this.clear_like_button.on('click', this.handle_clear_like);
    };

    CommandController.prototype.handle_clear_like = function(evt) {
      this.like_input.property('value', '');
      return this.handle_like_input();
    };

    CommandController.prototype.handle_like_input = function(evt) {
      var TODO, like_has_a_value, like_value;
      like_value = this.get_like_string();
      like_has_a_value = !!like_value;
      if (like_has_a_value) {
        this.clear_like_button.attr('disabled', null);
        if (this.liking_all_mode) {
          TODO = "update the selection based on the like value";
        } else {
          this.liking_all_mode = true;
          this.chosen_set_before_liking_all = this.chosen_set_id;
          this.set_immediate_execution_mode(this.is_verb_phrase_empty());
          this.huviz.click_set("all");
        }
      } else {
        this.clear_like_button.attr('disabled', 'disabled');
        if (this.liking_all_mode) {
          TODO = "restore the state before liking_all_mode " + "eg select a different set or disable all set selection";
          if (this.chosen_set_before_liking_all) {
            this.huviz.click_set(this.chosen_set_before_liking_all);
            this.chosen_set_before_liking_all = void 0;
          } else {
            this.huviz.click_set('all');
          }
          this.liking_all_mode = false;
          this.set_immediate_execution_mode(true);
        } else {
          TODO = "do nothing ????";
        }
      }
      return this.update_command(evt);
    };

    CommandController.prototype.build_submit = function() {
      this.doit_butt = this.nextcommand.append('span').append("input").attr("style", "float:right;").attr("type", "submit").attr('value', 'GO!').attr('class', 'doit_button');
      this.doit_butt.on('click', (function(_this) {
        return function() {
          if (_this.update_command()) {
            return _this.huviz.run_command(_this.command);
          }
        };
      })(this));
      return this.set_immediate_execution_mode(true);
    };

    CommandController.prototype.enable_doit_button = function() {
      return this.doit_butt.attr('disabled', null);
    };

    CommandController.prototype.disable_doit_button = function() {
      return this.doit_butt.attr('disabled', 'disabled');
    };

    CommandController.prototype.hide_doit_button = function() {
      return $(this.doit_butt[0][0]).hide();
    };

    CommandController.prototype.show_doit_button = function() {
      return $(this.doit_butt[0][0]).show();
    };

    CommandController.prototype.set_immediate_execution_mode = function(which) {
      if (which) {
        this.hide_doit_button();
      } else {
        this.show_doit_button();
      }
      return this.immediate_execution_mode = which;
    };

    CommandController.prototype.update_immediate_execution_mode_as_warranted = function() {
      return this.set_immediate_execution_mode(this.should_be_immediate_execution_mode());
    };

    CommandController.prototype.disengage_all_verbs = function() {
      var i, len, ref, results, vid;
      ref = this.engaged_verbs;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        vid = ref[i];
        results.push(this.disengage_verb(vid));
      }
      return results;
    };

    CommandController.prototype.unselect_all_node_classes = function() {
      var i, len, nid, ref, results;
      ref = this.engaged_taxons;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        nid = ref[i];
        this.unselect_node_class(nid);
        results.push(this.taxon_picker.set_direct_state(nid, 'unshowing'));
      }
      return results;
    };

    CommandController.prototype.clear_like = function() {
      return this.huviz.like_string();
    };

    CommandController.prototype.get_like_string = function() {
      return this.like_input[0][0].value;
    };

    CommandController.prototype.push_command = function(cmd) {
      throw new Error('DEPRECATED');
      return this.push_command_onto_history(cmd);
    };

    CommandController.prototype.push_cmdArgs_onto_future = function(cmdArgs) {
      return this.future_cmdArgs.push(cmdArgs);
    };

    CommandController.prototype.push_future_onto_history = function() {
      var cmdArgs, i, len, ref;
      if (this.future_cmdArgs.length) {
        this.huviz.goto_tab(3);
        ref = this.future_cmdArgs;
        for (i = 0, len = ref.length; i < len; i++) {
          cmdArgs = ref[i];
          this.push_command_onto_history(this.new_GraphCommand(cmdArgs));
        }
        this.reset_command_history();
        this.command_idx0 = 0;
        return this.update_script_buttons();
      }
    };

    CommandController.prototype.push_command_onto_history = function(cmd) {
      var delete_button, elem, elem_and_cmd, idx_of_this_command;
      this.clear_unreplayed_commands_if_needed();
      cmd.id = getRandomId('cmd');
      elem = this.oldcommands.append('div').attr('class', 'played command').attr('id', cmd.id);
      this.commandhistory_JQElem.scrollTop(this.commandhistory_JQElem.scrollHeight);
      elem_and_cmd = {
        elem: elem,
        cmd: cmd
      };
      this.command_list.push(elem_and_cmd);
      this.command_idx0 = this.command_list.length;
      idx_of_this_command = this.command_idx0;
      this.disable_play_buttons();
      elem.text(cmd.str + "\n");
      delete_button = elem.append('a');
      delete_button.attr('class', 'delete-command');
      delete_button.on('click', (function(_this) {
        return function() {
          return _this.delete_script_command_by_id(cmd.id);
        };
      })(this));
      return this.update_script_buttons();
    };

    CommandController.prototype.clear_unreplayed_commands_if_needed = function() {
      while (this.command_idx0 < this.command_list.length) {
        this.delete_script_command_by_idx(this.command_list.length - 1);
      }
    };

    CommandController.prototype.delete_script_command_by_id = function(cmd_id) {
      var elem_and_cmd, i, idx, len, ref;
      ref = this.command_list;
      for (idx = i = 0, len = ref.length; i < len; idx = ++i) {
        elem_and_cmd = ref[idx];
        if (elem_and_cmd.cmd.id === cmd_id) {
          this.delete_script_command_by_idx(idx);
          break;
        }
      }
    };

    CommandController.prototype.delete_script_command_by_idx = function(idx) {
      var elem, elem_and_cmd, orphan, pops;
      elem_and_cmd = this.command_list.splice(idx, 1)[0];
      elem = elem_and_cmd.elem[0];
      if (!elem || !elem[0]) {
        return;
      }
      orphan = elem[0];
      pops = orphan.parentNode;
      pops.removeChild(orphan);
      if (idx < this.command_idx0) {
        this.command_idx0--;
      }
      if (this.command_idx0 < 0) {
        this.command_idx0 = 0;
      }
      return this.update_script_buttons();
    };

    CommandController.prototype.update_script_buttons = function() {
      if (this.command_list.length > 1) {
        this.enable_save_buttons();
      } else {
        this.disable_save_buttons();
      }
      if (this.command_idx0 >= this.command_list.length) {
        this.disable_play_buttons();
      } else {
        this.enable_play_buttons();
      }
      if (this.command_idx0 > 0) {
        this.enable_back_buttons();
      }
      if (this.command_idx0 <= 0) {
        return this.disable_back_buttons();
      }
    };

    CommandController.prototype.disable_play_buttons = function() {
      this.scriptPlayButton.attr('disabled', 'disabled');
      return this.scriptForwardButton.attr('disabled', 'disabled');
    };

    CommandController.prototype.enable_play_buttons = function() {
      this.scriptForwardButton.attr('disabled', null);
      return this.scriptPlayButton.attr('disabled', null);
    };

    CommandController.prototype.disable_back_buttons = function() {
      this.scriptBackButton.attr('disabled', 'disabled');
      return this.scriptRewindButton.attr('disabled', 'disabled');
    };

    CommandController.prototype.enable_back_buttons = function() {
      this.scriptBackButton.attr('disabled', null);
      return this.scriptRewindButton.attr('disabled', null);
    };

    CommandController.prototype.disable_save_buttons = function() {
      this.scriptDownloadButton.attr('disabled', 'disabled');
      return this.scriptStashButton.attr('disabled', 'disabled');
    };

    CommandController.prototype.enable_save_buttons = function() {
      this.scriptDownloadButton.attr('disabled', null);
      return this.scriptStashButton.attr('disabled', null);
    };

    CommandController.prototype.build_command = function() {
      var args, class_name, i, len, like_str, ref, v;
      args = {
        verbs: []
      };
      args.object_phrase = this.object_phrase;
      if (this.engaged_verbs.length > 0) {
        ref = this.engaged_verbs;
        for (i = 0, len = ref.length; i < len; i++) {
          v = ref[i];
          if (v !== this.transient_verb_engaged) {
            args.verbs.push(v);
          }
        }
      }
      if ((this.regarding != null) && this.regarding.length) {
        args.regarding = this.regarding.slice();
        args.regarding_every = this.regarding_every;
      }
      if (this.proposed_verb) {
        args.verbs.push(this.proposed_verb);
      }
      if (this.chosen_set_id) {
        args.sets = [this.chosen_set];
      } else if (this.proposed_set) {
        args.sets = [this.proposed_set];
      } else {
        if (this.proposed_taxon) {
          args.every_class = this.proposed_every;
          args.classes = [this.proposed_taxon];
        } else {
          if (this.engaged_taxons.length > 0) {
            args.classes = (function() {
              var j, len1, ref1, results;
              ref1 = this.engaged_taxons;
              results = [];
              for (j = 0, len1 = ref1.length; j < len1; j++) {
                class_name = ref1[j];
                results.push(class_name);
              }
              return results;
            }).call(this);
          }
          if (this.huviz.selected_set.length > 0) {
            args.sets = ['selected'];
          }
        }
      }
      like_str = (this.like_input[0][0].value || "").trim();
      if (like_str) {
        args.like = like_str;
      }
      return this.command = this.new_GraphCommand(args);
    };

    CommandController.prototype.is_proposed = function() {
      return this.proposed_verb || this.proposed_set || this.proposed_taxon;
    };

    CommandController.prototype.update_command = function(because) {
      because = because || {};
      this.huviz.show_state_msg("update_command");
      this.run_any_immediate_command(because);
      return this.huviz.hide_state_msg();
    };

    CommandController.prototype.run_any_immediate_command = function(because) {
      var ready;
      ready = this.prepare_command(this.build_command());
      if (ready && this.huviz.doit_asap && this.immediate_execution_mode && !this.is_proposed()) {
        this.perform_current_command(because);
      }
    };

    CommandController.prototype.perform_current_command = function(because) {
      var start;
      this.show_working_on(this.command);
      if (this.huviz.slow_it_down) {
        start = Date.now();
        while (Date.now() < start + (this.huviz.slow_it_down * 1000)) {
          console.log(Math.round((Date.now() - start) / 1000));
        }
      }
      this.command.execute();
      this.huviz.update_all_counts();
      this.perform_any_cleanup(because);
      return this.show_working_off();
    };

    CommandController.prototype.perform_any_cleanup = function(because) {
      if ((because != null) && because.cleanup) {
        because.cleanup();
        this.update_command();
      }
    };

    CommandController.prototype.nextcommand_prompts_visible = true;

    CommandController.prototype.nextcommand_str_visible = false;

    CommandController.prototype.prepare_command = function(cmd) {
      this.command = cmd;
      if (this.nextcommand_prompts_visible || true) {
        this.nextcommand_verb_phrase.text(this.command.verb_phrase);
        if (this.command.verb_phrase_ready) {
          $(this.nextcommand_verb_phrase[0][0]).addClass('nextcommand_prompt_ready').removeClass('nextcommand_prompt_unready');
        } else {
          $(this.nextcommand_verb_phrase[0][0]).removeClass('nextcommand_prompt_ready').addClass('nextcommand_prompt_unready');
        }
        this.nextcommand_noun_phrase.text(this.command.noun_phrase);
        if (this.command.noun_phrase_ready) {
          $(this.nextcommand_noun_phrase[0][0]).addClass('nextcommand_prompt_ready').removeClass('nextcommand_prompt_unready');
        } else {
          $(this.nextcommand_noun_phrase[0][0]).removeClass('nextcommand_prompt_ready').addClass('nextcommand_prompt_unready');
        }
        this.nextcommand_suffix_phrase.text(this.command.suffix_phrase);
      }
      if (this.nextcommand_str_visible || true) {
        this.nextcommandstr.text(this.command.str);
      }
      if (this.command.ready) {
        this.enable_doit_button();
      } else {
        this.disable_doit_button();
      }
      return this.command.ready;
    };

    CommandController.prototype.ready_to_perform = function() {
      var permit_multi_select;
      permit_multi_select = true;
      return (this.transient_verb_engaged === 'unselect') || (!this.object_phrase && (this.engaged_verbs.length > 0)) || (permit_multi_select && (this.engaged_verbs.length === 1 && this.engaged_verbs[0] === 'select'));
    };

    CommandController.prototype.build_verb_form = function() {
      var i, len, ref, results, vset;
      this.verb_pretty_name = {};
      ref = this.verb_sets;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        vset = ref[i];
        results.push(this.add_verb_set(vset));
      }
      return results;
    };

    CommandController.prototype.add_verb_set = function(vset) {
      var alternatives, id, label;
      alternatives = this.verbdiv.append('div').attr('class', 'alternates');
      for (id in vset) {
        label = vset[id];
        this.verb_pretty_name[id] = label;
        this.build_verb_picker(id, label, alternatives);
      }
      this.verb_pretty_name['load'] = this.huviz.human_term.load;
      this.verb_pretty_name['hunt'] = this.huviz.human_term.hunt;
      this.verb_pretty_name['draw'] = this.huviz.human_term.draw;
      this.verb_pretty_name['undraw'] = this.huviz.human_term.undraw;
      return alternatives;
    };

    CommandController.prototype.get_verbs_overridden_by = function(verb_id) {
      var i, label, len, override, ref, vid, vset;
      override = this.verbs_override[verb_id] || [];
      ref = this.verb_sets;
      for (i = 0, len = ref.length; i < len; i++) {
        vset = ref[i];
        if (vset[verb_id]) {
          for (vid in vset) {
            label = vset[vid];
            if (!(indexOf.call(override, vid) >= 0) && verb_id !== vid) {
              override.push(vid);
            }
          }
        }
      }
      return override;
    };

    CommandController.prototype.engaged_verbs = [];


    /*
    The "Do it" button is not needed if the following hold...
    
    If there is an object_phrase then the instant a verb is picked the command
    should run.
    
    If there are verbs picked then the instant there is an object_phrase the
    command should run and the object_phrase cleared. (what about selected_set?)
    
    Note that this covers immediate execution of transient verbs select/unselect
     */

    CommandController.prototype.are_non_transient_verbs = function() {
      var len_transient;
      len_transient = (this.transient_verb_engaged != null) && 1 || 0;
      return this.engaged_verbs.length > len_transient;
    };

    CommandController.prototype.engage_transient_verb_if_needed = function(verb_id) {
      if (this.engaged_verbs.length === 0 && !this.are_non_transient_verbs()) {
        return this.engage_verb(verb_id, true);
      }
    };

    CommandController.prototype.disengage_transient_verb_if_needed = function() {
      if (this.transient_verb_engaged) {
        this.disengage_verb(this.transient_verb_engaged);
        this.huviz.set_cursor_for_verbs(this.engaged_verbs);
        return this.update_command();
      }
    };

    CommandController.prototype.engage_verb = function(verb_id, transient) {
      var i, len, overrides, ref, vid;
      if (transient) {
        this.transient_verb_engaged = verb_id;
        this.verb_control[verb_id].classed('transient', true);
      }
      overrides = this.get_verbs_overridden_by(verb_id);
      this.verb_control[verb_id].classed('engaged', true);
      ref = this.engaged_verbs;
      for (i = 0, len = ref.length; i < len; i++) {
        vid = ref[i];
        if (indexOf.call(overrides, vid) >= 0) {
          this.disengage_verb(vid);
        }
      }
      if (!(indexOf.call(this.engaged_verbs, verb_id) >= 0)) {
        return this.engaged_verbs.push(verb_id);
      }
    };

    CommandController.prototype.disengage_verb = function(verb_id, transient) {
      this.engaged_verbs = this.engaged_verbs.filter(function(verb) {
        return verb !== verb_id;
      });
      this.verb_control[verb_id].classed('engaged', false);
      if (verb_id === this.transient_verb_engaged) {
        this.transient_verb_engaged = false;
        return this.verb_control[verb_id].classed('transient', false);
      }
    };

    CommandController.prototype.verb_control = {};

    CommandController.prototype.build_verb_picker = function(id, label, alternatives) {
      var that, vbctl;
      vbctl = alternatives.append('div').attr("class", "verb");
      if (this.verb_descriptions[id]) {
        vbctl.attr("title", this.verb_descriptions[id]);
      }
      vbctl.attr("id", "verb-" + id);
      this.verb_control[id] = vbctl;
      vbctl.text(label);
      that = this;
      vbctl.on('click', (function(_this) {
        return function() {
          return _this.handle_on_verb_clicked(id, vbctl);
        };
      })(this));
      vbctl.on('mouseenter', function() {
        var because, click_would_engage, elem;
        elem = d3.select(this);
        click_would_engage = !elem.classed('engaged');
        because = {};
        if (click_would_engage) {
          that.proposed_verb = id;
          because = {
            proposed_verb: id
          };
        } else {
          that.proposed_verb = null;
        }
        return that.update_command(because);
      });
      return vbctl.on('mouseleave', function() {
        var because, elem, leaving_verb_id;
        elem = d3.select(this);
        leaving_verb_id = elem.classed('engaged');
        because = {
          verb_leaving: leaving_verb_id
        };
        that.proposed_verb = null;
        return that.update_command(because);
      });
    };

    CommandController.prototype.handle_on_verb_clicked = function(id, elem) {
      this.start_working();
      return setTimeout((function(_this) {
        return function() {
          return _this.on_verb_clicked(id, elem);
        };
      })(this));
    };

    CommandController.prototype.on_verb_clicked = function(id, elem) {
      var because, newstate;
      newstate = !elem.classed('engaged');
      elem.classed('engaged', newstate);
      if (newstate) {
        this.engage_verb(id);
        if (id === "walk") {
          this.taxon_picker.shield();
          this.set_picker.shield();
        }
        this.proposed_verb = null;
        because = {
          verb_added: id,
          cleanup: this.disengage_all_verbs
        };
      } else {
        if (id === "walk") {
          this.taxon_picker.unshield();
          this.set_picker.unshield();
        }
        this.disengage_verb(id);
      }
      if ((this.engaged_verbs == null) || this.engaged_verbs.length === 0) {
        this.huviz.set_cursor_for_verbs([]);
      }
      return this.update_command(because);
    };

    CommandController.prototype.run_script = function(script) {
      script = script.replace(/[\u237D\u2420]/g, " ");
      this.huviz.gclc.run(script);
      return this.huviz.update_all_counts();
    };

    CommandController.prototype.build_set_picker = function(label, where) {
      where = (label != null) && this.control_label(label, where) || this.comdiv;
      this.the_sets = {
        'all_set': [
          this.huviz.all_set.label, {
            selected_set: [this.huviz.selected_set.label],
            chosen_set: [this.huviz.chosen_set.label],
            graphed_set: [this.huviz.graphed_set.label],
            shelved_set: [this.huviz.shelved_set.label],
            hidden_set: [this.huviz.hidden_set.label],
            discarded_set: [this.huviz.discarded_set.label],
            labelled_set: [this.huviz.labelled_set.label],
            pinned_set: [this.huviz.pinned_set.label],
            nameless_set: [this.huviz.nameless_set.label],
            walked_set: [this.huviz.walked_set.label],
            suppressed_set: [this.huviz.suppressed_set.label]
          }
        ]
      };
      this.set_picker_box = where.append('div').classed('container', true).attr('id', 'sets');
      this.set_picker = new TreePicker(this.set_picker_box, 'all', ['treepicker-vertical']);
      this.set_picker.click_listener = this.handle_on_set_picked;
      this.set_picker.show_tree(this.the_sets, this.set_picker_box);
      this.populate_all_set_docs();
      this.make_sets_proposable();
      where.classed("set_picker_box_parent", true);
      return where;
    };

    CommandController.prototype.populate_all_set_docs = function() {
      var a_set, id, ref, results;
      ref = this.huviz.selectable_sets;
      results = [];
      for (id in ref) {
        a_set = ref[id];
        if (a_set.docs != null) {
          results.push(this.set_picker.set_title(id, a_set.docs));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    CommandController.prototype.make_sets_proposable = function() {
      var a_set, id, make_listeners, ref, results;
      make_listeners = (function(_this) {
        return function(id, a_set) {
          var set_ctl;
          set_ctl = _this.set_picker.id_to_elem[id];
          set_ctl.on('mouseenter', function() {
            _this.proposed_set = a_set;
            return _this.update_command();
          });
          return set_ctl.on('mouseleave', function() {
            _this.proposed_set = null;
            return _this.update_command();
          });
        };
      })(this);
      ref = this.huviz.selectable_sets;
      results = [];
      for (id in ref) {
        a_set = ref[id];
        results.push(make_listeners(id, a_set));
      }
      return results;
    };

    CommandController.prototype.handle_on_set_picked = function(set_id, new_state) {
      this.start_working();
      return setTimeout((function(_this) {
        return function() {
          return _this.on_set_picked(set_id, new_state);
        };
      })(this));
    };

    CommandController.prototype.on_set_picked = function(set_id, new_state) {
      var XXXcmd, because, cmd, hasVerbs;
      this.clear_set_picker();
      this.set_picker.set_direct_state(set_id, new_state);
      because = {};
      hasVerbs = !!this.engaged_verbs.length;
      if (new_state === 'showing') {
        this.taxon_picker.shield();
        this.chosen_set = this.huviz[set_id];
        this.chosen_set_id = set_id;
        because = {
          set_added: set_id,
          cleanup: this.disengage_all_sets
        };
        if (hasVerbs) {
          cmd = new gcl.GraphCommand(this.huviz, {
            verbs: this.engaged_verbs,
            sets: [this.chosen_set.id]
          });
        }
      } else if (new_state === 'unshowing') {
        this.taxon_picker.unshield();
        XXXcmd = new gcl.GraphCommand(this.huviz, {
          verbs: ['unselect'],
          sets: [this.chosen_set.id]
        });
        this.disengage_all_sets();
      }
      if (cmd != null) {
        this.huviz.run_command(cmd, this.make_run_transient_and_cleanup_callback(because));
        because = {};
      }
      return this.update_command();
    };

    CommandController.prototype.disengage_all_sets = function() {
      if (this.chosen_set_id) {
        this.on_set_picked(this.chosen_set_id, "unshowing");
        delete this.chosen_set_id;
        return delete this.chosen_set;
      }
    };

    CommandController.prototype.clear_all_sets = function() {
      var cleanup_verb, cmd, ref, set_key, set_label, skip_sets, the_set;
      skip_sets = ['shelved_set'];
      ref = this.the_sets.all_set[1];
      for (set_key in ref) {
        set_label = ref[set_key];
        if (indexOf.call(skip_sets, set_key) >= 0) {
          continue;
        }
        the_set = this.huviz[set_key];
        cleanup_verb = the_set.cleanup_verb;
        cmd = new gcl.GraphCommand(this.huviz, {
          verbs: [cleanup_verb],
          sets: [the_set.id]
        });
        this.huviz.run_command(cmd);
      }
    };

    CommandController.prototype.on_set_count_update = function(set_id, count) {
      return this.set_picker.set_payload(set_id, count);
    };

    CommandController.prototype.on_taxon_count_update = function(taxon_id, count) {
      return this.taxon_picker.set_payload(taxon_id, count);
    };

    CommandController.prototype.on_predicate_count_update = function(pred_lid, count) {
      return this.predicate_picker.set_payload(pred_lid, count);
    };

    CommandController.prototype.clear_set_picker = function() {
      if (this.chosen_set_id != null) {
        this.set_picker.set_direct_state(this.chosen_set_id, 'unshowing');
        return delete this.chosen_set_id;
      }
    };

    return CommandController;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).CommandController = CommandController;

}).call(this);
}, "graphcommandlanguage": function(exports, require, module) {(function() {
  var GCLTest, GCLTestSuite, GraphCommand, GraphCommandLanguageCtrl, angliciser,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  angliciser = require('angliciser').angliciser;

  GCLTest = (function() {
    function GCLTest(runner, spec1) {
      this.runner = runner;
      this.spec = spec1;
      console.log("GCLTest", this);
    }

    GCLTest.prototype.perform = function() {
      var e, exp, expected, got, i, len, msg, ref, ref1;
      if (this.spec.script) {
        this.runner.gclc.run(this.spec.script);
      }
      ref1 = (ref = this.spec.expectations) != null ? ref : [];
      for (i = 0, len = ref1.length; i < len; i++) {
        exp = ref1[i];
        console.log("exp", exp);
        try {
          got = eval(exp[0]);
        } catch (_error) {
          e = _error;
          throw new Error("while eval('" + exp[0] + "') caught: " + e);
        }
        expected = exp[1];
        if (this.runner.verbose) {
          console.log("got=" + got + " expected:" + expected);
        }
        if (got !== expected) {
          msg = msg != null ? msg : "'" + this.spec.desc + "' " + exp[0] + " = " + got + " not " + expected;
          return msg;
        }
      }
    };

    return GCLTest;

  })();

  GCLTestSuite = (function() {

    /*
     * callback = function(){
     *    this.expect(this.graph_ctrl.nodes.length,7);
     *    this.expect(this.graph_ctrl.shelved_set.length,0);
     * }
     * ts = new GCLTestSuite(gclc, [
     *      {script:"choose 'abdyma'",
     *       expectations: [
     *           ["this.graph_ctrl.nodes.length",7],
     *           ["this.graph_ctrl.shelved_set.length",0],
     *       ]
     *      }
     *     ])
     */
    function GCLTestSuite(huviz, suite) {
      this.huviz = huviz;
      this.suite = suite;
      console.log("GCLTestSuite() arguments", arguments);
      this.break_quickly = true;
    }

    GCLTestSuite.prototype.emit = function(txt, id) {
      return $("#testsuite-results").append("div").attr("id", id).text(txt);
    };

    GCLTestSuite.prototype.run = function() {
      var e, err, errors, fail, fails, i, j, k, len, len1, len2, num, pass_count, passed, ref, results, retval, spec, test;
      pass_count = 0;
      errors = [];
      fails = [];
      num = 0;
      this.emit("RUNNING", "running");
      ref = this.suite;
      for (i = 0, len = ref.length; i < len; i++) {
        spec = ref[i];
        num++;
        passed = false;
        console.log("spec:", spec);
        test = new GCLTest(this, spec);
        try {
          retval = test.perform();
          if (this.verbose) {
            console.log(retval);
          }
          if (retval != null) {
            fails.push([num, retval]);
          } else {
            passed = true;
            pass_count++;
          }
        } catch (_error) {
          e = _error;
          errors.push([num, e]);
        }
        if (!passed && this.break_quickly) {
          break;
        }
      }
      console.log("passed:" + pass_count + " failed:" + fails.length, " errors:" + errors.length);
      for (j = 0, len1 = fails.length; j < len1; j++) {
        fail = fails[j];
        console.log("test#" + fail[0], fail[1]);
      }
      results = [];
      for (k = 0, len2 = errors.length; k < len2; k++) {
        err = errors[k];
        results.push(console.log("err#" + err[0], err[1]));
      }
      return results;
    };

    return GCLTestSuite;

  })();

  GraphCommand = (function() {
    function GraphCommand(huviz, args_or_str) {
      var argn, args, argv;
      this.huviz = huviz;
      if (args_or_str instanceof GraphCommand) {
        throw new Error("nested GraphCommand no longer permitted");
      }
      this.prefixes = {};
      this.args_or_str = args_or_str;
      if (typeof args_or_str === 'string') {
        args = this.parse(args_or_str);
      } else {
        args = args_or_str;
      }
      if (args.skip_history == null) {
        args.skip_history = false;
      }
      if (args.every_class == null) {
        args.every_class = false;
      }
      for (argn in args) {
        argv = args[argn];
        this[argn] = argv;
      }
      if (this.str == null) {
        this.update_str();
      }
    }

    GraphCommand.prototype.get_node = function(node_spec) {
      var abbr, id, id_parts, msg, node, prefix, ref, term, tried;
      if (node_spec.id) {
        node = this.huviz.nodes.get({
          'id': node_spec.id
        });
      }
      if (node) {
        return node;
      }
      tried = [node_spec];
      id_parts = node_spec.split(':');
      if (id_parts.length > 1) {
        abbr = id_parts[0];
        id = id_parts[1];
        prefix = this.prefixes[abbr];
        if (prefix) {
          term = prefix + id;
          node = this.huviz.nodes.get({
            'id': term
          });
          tried.push(term);
        }
      }
      if (!node) {
        ref = this.prefixes;
        for (abbr in ref) {
          prefix = ref[abbr];
          if (!node) {
            term = prefix + id;
            tried.push(term);
            node = this.huviz.nodes.get({
              'id': term
            });
          }
        }
      }
      if (!node) {
        msg = "node with id = " + term + " not found among " + this.huviz.nodes.length + " nodes: " + tried;
        console.warn(msg);
        throw new Error(msg);
      }
      return node;
    };

    GraphCommand.prototype.get_nodes = function() {
      var a_set, a_set_id, class_name, i, j, k, len, len1, len2, len3, len4, len5, like_regex, m, n, node, node_spec, o, p, ref, ref1, ref2, ref3, result_set, set, the_set;
      result_set = SortedSet().sort_on("id");
      like_regex = null;
      if (this.like) {
        like_regex = new RegExp(this.like, "ig");
      }
      if (this.subjects) {
        ref = this.subjects;
        for (i = 0, len = ref.length; i < len; i++) {
          node_spec = ref[i];
          node = this.get_node(node_spec);
          if (node) {
            if ((like_regex == null) || node.name.match(like_regex)) {
              result_set.add(node);
            }
          } else {
            if (this.classes == null) {
              this.classes = [];
            }
            this.classes.push(node_spec.id);
          }
        }
      }
      if (this.classes) {
        ref1 = this.classes;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          class_name = ref1[j];
          the_set = (ref2 = this.huviz.taxonomy[class_name]) != null ? ref2.get_instances() : void 0;
          if (the_set != null) {
            if (like_regex) {
              for (k = 0, len2 = the_set.length; k < len2; k++) {
                n = the_set[k];
                if (n.name.match(like_regex)) {
                  result_set.add(n);
                }
              }
            } else {
              for (m = 0, len3 = the_set.length; m < len3; m++) {
                n = the_set[m];
                result_set.add(n);
              }
            }
          }
        }
      }
      if (this.sets) {
        ref3 = this.sets;
        for (o = 0, len4 = ref3.length; o < len4; o++) {
          set = ref3[o];
          if (typeof set === 'string') {
            a_set_id = set;
            a_set = this.huviz.get_set_by_id(a_set_id);
          } else {
            a_set = set;
          }
          for (p = 0, len5 = a_set.length; p < len5; p++) {
            node = a_set[p];
            if ((like_regex == null) || node.name.match(like_regex)) {
              result_set.add(node);
            }
          }
        }
      }
      return result_set;
    };

    GraphCommand.prototype.get_methods = function() {
      var i, len, method, methods, msg, ref, verb;
      methods = [];
      ref = this.verbs;
      for (i = 0, len = ref.length; i < len; i++) {
        verb = ref[i];
        method = this.huviz[verb];
        if (method) {
          method.build_callback = this.huviz[verb + "__build_callback"];
          method.callback = this.huviz[verb + "__atLast"];
          method.atFirst = this.huviz[verb + "__atFirst"];
          methods.push(method);
        } else {
          msg = "method '" + verb + "' not found";
          console.error(msg);
        }
      }
      return methods;
    };

    GraphCommand.prototype.get_predicate_methods = function() {
      var i, len, method, methods, msg, ref, verb;
      methods = [];
      ref = this.verbs;
      for (i = 0, len = ref.length; i < len; i++) {
        verb = ref[i];
        method = this.huviz[verb + "_edge_regarding"];
        if (method) {
          methods.push(method);
        } else {
          msg = "method '" + verb + "' not found";
          console.error(msg);
        }
      }
      return methods;
    };

    GraphCommand.prototype.regarding_required = function() {
      return (this.regarding != null) && this.regarding.length > 0;
    };

    GraphCommand.prototype.execute = function() {
      var USE_ASYNC, atFirst, callback, errorHandler, i, iter, j, k, len, len1, len2, meth, node, nodes, ref, ref1, regarding_required;
      this.huviz.show_state_msg(this.as_msg());
      this.huviz.force.stop();
      regarding_required = this.regarding_required();
      nodes = this.get_nodes();
      console.log("%c" + this.str, "color:blue;font-size:1.5em;", "on " + nodes.length + " nodes");
      errorHandler = function(err_arg) {
        if (err_arg != null) {
          console.error("err =", err_arg);
          if (err_arg == null) {
            throw "err_arg is null";
          }
          throw err_arg;
        }
      };
      if (regarding_required) {
        ref = this.get_predicate_methods();
        for (i = 0, len = ref.length; i < len; i++) {
          meth = ref[i];
          iter = (function(_this) {
            return function(node) {
              var j, len1, pred, ref1, retval;
              ref1 = _this.regarding;
              for (j = 0, len1 = ref1.length; j < len1; j++) {
                pred = ref1[j];
                retval = meth.call(_this.huviz, node, pred);
              }
              return _this.huviz.tick();
            };
          })(this);
          if (nodes != null) {
            async.each(nodes, iter, errorHandler);
          }
        }
      } else if (this.verbs[0] === 'load') {
        this.huviz.load_with(this.data_uri, this.with_ontologies);
      } else if (this.verbs[0] === 'query') {
        this.huviz.query_from_seeking_limit(this.sparqlQuery);
      } else {
        ref1 = this.get_methods();
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          meth = ref1[j];
          if (meth.callback) {
            callback = meth.callback;
          } else if (meth.build_callback) {
            callback = meth.build_callback(this, nodes);
          } else {
            callback = errorHandler;
          }
          atFirst = meth.atFirst;
          if (atFirst != null) {
            atFirst();
          }
          iter = (function(_this) {
            return function(node) {
              var retval;
              return retval = meth.call(_this.huviz, node);
            };
          })(this);
          if (nodes != null) {
            if (USE_ASYNC = false) {
              async.each(nodes, iter, callback);
            } else {
              for (k = 0, len2 = nodes.length; k < len2; k++) {
                node = nodes[k];
                iter(node);
              }
              this.huviz.gclui.set;
              callback();
            }
          }
        }
      }
      this.huviz.clean_up_all_dirt_once();
      this.huviz.hide_state_msg();
      this.huviz.force.start();
      this.huviz.tick("Tick in graphcommandlanguage");
    };

    GraphCommand.prototype.get_pretty_verbs = function() {
      var i, l, len, ref, verb_id;
      l = [];
      ref = this.verbs;
      for (i = 0, len = ref.length; i < len; i++) {
        verb_id = ref[i];
        l.push(this.huviz.gclui.verb_pretty_name[verb_id]);
      }
      return l;
    };

    GraphCommand.prototype.missing = '____';

    GraphCommand.prototype.update_str = function() {
      var aSet, cmd_str, i, j, len, len1, like_str, maybe_every, missing, more, obj_phrase, ready, ref, ref1, regarding_phrase, regarding_required, set, setLabel, setLabels, subj, verb;
      missing = this.missing;
      cmd_str = "";
      ready = true;
      regarding_required = false;
      this.verb_phrase = '';
      this.noun_phrase = '';
      this.noun_phrase_ready = false;
      if (this.verbs && this.verbs.length) {
        cmd_str = angliciser(this.get_pretty_verbs());
        this.verb_phrase_ready = true;
        this.verb_phrase = cmd_str;
      } else {
        ready = false;
        cmd_str = missing;
        this.verb_phrase_ready = false;
        this.verb_phrase = this.huviz.human_term.blank_verb;
      }
      this.verb_phrase += ' ';
      cmd_str += " ";
      obj_phrase = "";
      if (cmd_str === 'load ') {
        this.str += this.data_uri + " .";
        return;
      }
      if (this.object_phrase == null) {
        this.object_phrase = null;
      }
      if (this.sets != null) {
        setLabels = [];
        ref = this.sets;
        for (i = 0, len = ref.length; i < len; i++) {
          set = ref[i];
          if (typeof set === 'string') {
            aSet = this.huviz.get_set_by_id(set);
          } else {
            aSet = set;
          }
          setLabel = aSet.get_label();
          setLabels.push(setLabel);
        }
        more = angliciser(setLabels);
        more = ("the " + more + " set") + ((this.sets.length > 1) && 's' || '');
        this.object_phrase = more;
        this.noun_phrase_ready = true;
        obj_phrase = this.object_phrase;
        this.noun_phrase = obj_phrase;
      } else {
        if (this.object_phrase) {
          console.log("update_str() object_phrase: ", this.object_phrase);
          obj_phrase = this.object_phrase;
        } else if (this.classes) {
          maybe_every = this.every_class && "every " || "";
          obj_phrase += maybe_every + angliciser(this.classes);
          if (this.except_subjects) {
            obj_phrase += ' except ' + angliciser((function() {
              var j, len1, ref1, results;
              ref1 = this.subjects;
              results = [];
              for (j = 0, len1 = ref1.length; j < len1; j++) {
                subj = ref1[j];
                results.push(subj.lid);
              }
              return results;
            }).call(this));
          }
        } else if (this.subjects) {
          obj_phrase = angliciser((function() {
            var j, len1, ref1, results;
            ref1 = this.subjects;
            results = [];
            for (j = 0, len1 = ref1.length; j < len1; j++) {
              subj = ref1[j];
              results.push(subj.lid || subj);
            }
            return results;
          }).call(this));
        }
      }
      if (obj_phrase === "") {
        obj_phrase = missing;
        ready = false;
        this.noun_phrase_ready = false;
        this.noun_phrase = this.huviz.human_term.blank_noun;
      } else if (obj_phrase.length > 0) {
        this.noun_phrase_ready = true;
        this.noun_phrase = obj_phrase;
      }
      cmd_str += obj_phrase;
      like_str = (this.like || "").trim();
      if (this.verbs) {
        ref1 = this.verbs;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          verb = ref1[j];
          if (['draw', 'undraw'].indexOf(verb) > -1) {
            regarding_required = true;
          }
        }
      }
      if (regarding_required) {
        regarding_phrase = missing;
        if (this.regarding_required()) {
          regarding_phrase = angliciser(this.regarding);
          if (this.regarding_every) {
            regarding_phrase = "every " + regarding_phrase;
          }
        } else {
          ready = false;
        }
      }
      this.suffix_phrase = '';
      if (like_str) {
        this.suffix_phrase += " matching '" + like_str + "'";
      }
      if (regarding_phrase) {
        this.suffix_phrase += " regarding " + regarding_phrase + ' .';
      } else if (this.polar_coords) {
        this.suffix_phrase += " at " + (this.polar_coords.degrees.toFixed(0)) + " degrees";
        this.suffix_phrase += " and range " + (this.polar_coords.range.toFixed(2)) + " .";
      } else {
        this.suffix_phrase += ' .';
      }
      cmd_str += this.suffix_phrase;
      this.ready = ready;
      return this.str = cmd_str;
    };

    GraphCommand.prototype.toString = function() {
      return this.str;
    };

    GraphCommand.prototype.parse_query_command = function(parts) {
      var argName, argVal, keymap, spec;
      keymap = {
        query: 'serverUrl',
        from: 'graphUrl',
        limit: 'limit',
        seeking: 'subjectUrl'
      };
      spec = {};
      while (parts.length) {
        argName = keymap[parts.shift()];
        argVal = unescape(parts.shift());
        if (argName != null) {
          spec[argName] = argVal;
        } else {
          throw new Error("parse_query_command() failed at", parts.join(' '));
        }
      }
      return spec;
    };

    GraphCommand.prototype.parse = function(cmd_str) {
      var cmd, parts, subj, verb;
      parts = cmd_str.split(" ");
      verb = parts[0];
      cmd = {};
      cmd.verbs = [verb];
      if (verb === 'load') {
        cmd.data_uri = parts[1];
        if (parts.length > 3) {
          cmd.with_ontologies = parts.slice(3);
        }
      } else if (verb === 'query') {
        this.sparqlQuery = this.parse_query_command(parts);
      } else {
        subj = parts[1].replace(/\'/g, "");
        cmd.subjects = [
          {
            'id': subj
          }
        ];
      }
      return cmd;
    };

    GraphCommand.prototype.toString = function() {
      return this.str;
    };

    GraphCommand.prototype.as_msg = function() {
      return this.str;
    };

    return GraphCommand;

  })();

  GraphCommandLanguageCtrl = (function() {
    function GraphCommandLanguageCtrl(huviz) {
      this.huviz = huviz;
      this.execute = bind(this.execute, this);
      this.prefixes = {};
    }

    GraphCommandLanguageCtrl.prototype.run = function(script, callback) {
      var retval;
      this.huviz.before_running_command(this);
      if (script == null) {
        console.error("script must be defined");
        return;
      }
      if (script instanceof GraphCommand) {
        this.commands = [script];
      } else if (typeof script === 'string') {
        this.commands = script.split(';');
      } else if (script.constructor === [].constructor) {
        this.commands = script;
      } else {
        this.commands = [script];
      }
      retval = this.execute(callback);
      this.huviz.after_running_command(this);
      return retval;
    };

    GraphCommandLanguageCtrl.prototype.run_one = function(cmd_spec) {
      var cmd;
      if (cmd_spec instanceof GraphCommand) {
        cmd = cmd_spec;
      } else {
        cmd = new GraphCommand(this.huviz, cmd_spec);
      }
      cmd.prefixes = this.prefixes;
      return cmd.execute();
    };

    GraphCommandLanguageCtrl.prototype.execute = function(callback) {
      var cmd_spec, i, len, ref, run_once;
      if (this.commands.length > 0 && typeof this.commands[0] === 'string' && this.commands[0].match(/^load /)) {
        this.run_one(this.commands.shift());
        run_once = (function(_this) {
          return function() {
            document.removeEventListener('dataset-loaded', run_once);
            return _this.execute();
          };
        })(this);
        document.addEventListener('dataset-loaded', run_once);
        return;
      }
      ref = this.commands;
      for (i = 0, len = ref.length; i < len; i++) {
        cmd_spec = ref[i];
        if (cmd_spec) {
          this.run_one(cmd_spec);
        }
      }
      if (callback != null) {
        callback();
      }
    };

    return GraphCommandLanguageCtrl;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).GraphCommandLanguageCtrl = GraphCommandLanguageCtrl;

  (typeof exports !== "undefined" && exports !== null ? exports : this).GraphCommand = GraphCommand;

  (typeof exports !== "undefined" && exports !== null ? exports : this).GCLTest = GCLTest;

  (typeof exports !== "undefined" && exports !== null ? exports : this).GCLTestSuite = GCLTestSuite;

}).call(this);
}, "greenerturtle": function(exports, require, module) {(function() {
  var GreenerTurtle;

  GreenerTurtle = (function() {
    var RDF_object, build_indices, count_subjects, get_incoming_predicates, obj_has_type, verbosity;

    function GreenerTurtle() {}

    verbosity = false;

    obj_has_type = function(obj, typ) {
      return obj.type === typ;
    };

    RDF_object = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";

    build_indices = function(graph) {
      var obj, oi, p, predicate, results, subj, subj_id;
      results = [];
      for (subj_id in graph.subjects) {
        subj = graph.subjects[subj_id];
        results.push((function() {
          var results1;
          results1 = [];
          for (p in subj.predicates) {
            predicate = subj.predicates[p];
            oi = 0;
            results1.push((function() {
              var results2;
              results2 = [];
              while (oi < predicate.objects.length) {
                obj = predicate.objects[oi];
                if (obj && obj_has_type(obj, RDF_object)) {
                  if (typeof graph.oid_2_id_p[obj.value] === "undefined") {
                    graph.oid_2_id_p[obj.value] = [];
                  }
                  if (obj.value === "_:E" && verbosity) {
                    console.log(obj.value, "----> [", subj.id, p, "]");
                  }
                  graph.oid_2_id_p[obj.value].push([subj.id, p]);
                }
                results2.push(oi++);
              }
              return results2;
            })());
          }
          return results1;
        })());
      }
      return results;
    };

    get_incoming_predicates = function(subj) {
      var resp;
      resp = this.oid_2_id_p[subj.id] || [];
      return resp;
    };

    count_subjects = function(graph) {
      var results, s;
      graph.num_subj = 0;
      results = [];
      for (s in graph.subjects) {
        results.push(graph.num_subj++);
      }
      return results;
    };

    GreenerTurtle.prototype.parse = function(data, type) {
      var G;
      G = GreenTurtle.implementation.parse(data, type);
      if (!G.oid_2_id_p) {
        G.oid_2_id_p = {};
      }
      build_indices(G);
      count_subjects(G);
      G.get_incoming_predicates = get_incoming_predicates;
      return G;
    };

    return GreenerTurtle;

  })();

  exports.GreenerTurtle = GreenerTurtle;

}).call(this);
}, "huviz": function(exports, require, module) {(function() {
  var BASE10, BASE57, CommandController, DCE_title, DC_subject, DragAndDropLoader, DragAndDropLoaderOfScripts, Edge, EditController, FOAF_Group, FOAF_Person, FOAF_name, GeoUserNameWidget, GraphCommandLanguageCtrl, GreenerTurtle, Huviz, IndexedDBService, IndexedDBStorageController, MANY_SPACES_REGEX, NAME_SYNS, Node, OA_, OA_terms_regex, OSMT_name, OSMT_reg_name, OWL_Class, OWL_ObjectProperty, OWL_Thing, OntoViz, OntologicallyGrounded, Orlando, PEEKING_COLOR, PRIMORDIAL_ONTOLOGY, PickOrProvide, PickOrProvideScript, Predicate, RDFS_label, RDF_Class, RDF_a, RDF_literal, RDF_object, RDF_subClassOf, RDF_type, SCHEMA_name, SKOS_prefLabel, SettingsWidget, Socrata, THUMB_PREDS, TYPE_SYNS, Taxon, TextCursor, UNDEFINED, UsernameWidget, XL_literalForm, XML_TAG_REGEX, angliciser, colorlog, convert, default_node_radius_policy, dist_lt, distance, escapeHtml, gcl, getPrefixedTypeSignature, getTypeSignature, has_predicate_value, has_type, hash, hpad, id_escape, ident, ids_to_show, int_to_base, is_a_main_node, is_node_to_always_show, is_one_of, linearize, node_radius_policies, noop, orlando_human_term, sel_to_id, start_with_http, strip_surrounding_quotes, synthIdFor, tau, themeStyles, typeSigRE, unescape_unicode, unique_id, uniquer, unpad_md, wpad,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  angliciser = require('angliciser').angliciser;

  uniquer = require("uniquer").uniquer;

  gcl = require('graphcommandlanguage');

  CommandController = require('gclui').CommandController;

  EditController = require('editui').EditController;

  IndexedDBService = require('indexeddbservice').IndexedDBService;

  IndexedDBStorageController = require('indexeddbstoragecontroller').IndexedDBStorageController;

  Edge = require('edge').Edge;

  GraphCommandLanguageCtrl = require('graphcommandlanguage').GraphCommandLanguageCtrl;

  GreenerTurtle = require('greenerturtle').GreenerTurtle;

  Node = require('node').Node;

  Predicate = require('predicate').Predicate;

  Taxon = require('taxon').Taxon;

  TextCursor = require('textcursor').TextCursor;

  MultiString.set_langpath('en:fr');

  colorlog = function(msg, color, size) {
    if (color == null) {
      color = "red";
    }
    if (size == null) {
      size = "1.2em";
    }
    return console.log("%c" + msg, "color:" + color + ";font-size:" + size + ";");
  };

  unpad_md = function(txt, pad) {
    var in_lines, j, len1, line, out, out_lines;
    pad = "    ";
    out_lines = [];
    in_lines = txt.split("\n");
    for (j = 0, len1 = in_lines.length; j < len1; j++) {
      line = in_lines[j];
      if (!(line.startsWith(pad) || line.length === 0)) {
        return txt;
      }
      out_lines.push(line.replace(/^    /, ''));
    }
    out = out_lines.join("\n");
    return out;
  };

  strip_surrounding_quotes = function(s) {
    return s.replace(/\"$/, '').replace(/^\"/, '');
  };

  wpad = void 0;

  hpad = 10;

  tau = Math.PI * 2;

  distance = function(p1, p2) {
    var x, y;
    p2 = p2 || [0, 0];
    x = (p1.x || p1[0]) - (p2.x || p2[0]);
    y = (p1.y || p1[1]) - (p2.y || p2[1]);
    return Math.sqrt(x * x + y * y);
  };

  dist_lt = function(mouse, d, thresh) {
    var x, y;
    x = mouse[0] - d.x;
    y = mouse[1] - d.y;
    return Math.sqrt(x * x + y * y) < thresh;
  };

  hash = function(str) {
    var hsh, i;
    hsh = 5381;
    i = str.length;
    while (i) {
      hsh = (hsh * 33) ^ str.charCodeAt(--i);
    }
    return hsh >>> 0;
  };

  convert = function(src, srctable, desttable) {
    var destlen, i, numlen, q, r, res, srclen, val;
    srclen = srctable.length;
    destlen = desttable.length;
    val = 0;
    numlen = src.length;
    i = 0;
    while (i < numlen) {
      val = val * srclen + srctable.indexOf(src.charAt(i));
      i++;
    }
    if (val < 0) {
      return 0;
    }
    r = val % destlen;
    res = desttable.charAt(r);
    q = Math.floor(val / destlen);
    while (q) {
      r = q % destlen;
      q = Math.floor(q / destlen);
      res = desttable.charAt(r) + res;
    }
    return res;
  };

  BASE57 = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  BASE10 = "0123456789";

  int_to_base = function(intgr) {
    return convert("" + intgr, BASE10, BASE57);
  };

  synthIdFor = function(str) {
    return 'h' + int_to_base(hash(str)).substr(0, 6);
  };

  window.synthIdFor = synthIdFor;

  unescape_unicode = function(u) {
    return JSON.parse('"' + u.replace('"', '\\"') + '"');
  };

  linearize = function(msgRecipient, streamoid) {
    var i, l, line, recurse;
    if (streamoid.idx === 0) {
      return msgRecipient.postMessage({
        event: 'finish'
      });
    } else {
      i = streamoid.idx + 1;
      l = 0;
      while (streamoid.data[i](!'\n')) {
        l++;
        i++;
      }
      line = streamoid.data.substr(streamoid.idx, l + 1).trim();
      msgRecipient.postMessage({
        event: 'line',
        line: line
      });
      streamoid.idx = i;
      recurse = function() {
        return linearize(msgRecipient, streamoid);
      };
      return setTimeout(recurse, 0);
    }
  };

  ident = function(data) {
    return data;
  };

  unique_id = function(prefix) {
    if (prefix == null) {
      prefix = 'uid_';
    }
    return prefix + Math.random().toString(36).substr(2, 10);
  };

  sel_to_id = function(selector) {
    return selector.replace(/^\#/, '');
  };

  window.log_click = function() {
    return console.log("%cCLICK", "color:red;font-size:1.8em");
  };

  DC_subject = "http://purl.org/dc/terms/subject";

  DCE_title = "http://purl.org/dc/elements/1.1/title";

  FOAF_Group = "http://xmlns.com/foaf/0.1/Group";

  FOAF_Person = "http://xmlns.com/foaf/0.1/Person";

  FOAF_name = "http://xmlns.com/foaf/0.1/name";

  OA_ = "http://www.w3.org/ns/oa#";

  OA_terms_regex = /^(Annotation|Choice|CssSelector|CssStyle|DataPositionSelector|Direction|FragmentSelector|HttpRequestState|Motivation|PreferContainedDescriptions|PreferContainedIRIs|RangeSelector|ResourceSelection|Selector|SpecificResource|State|Style|SvgSelector|TextPositionSelector|TextQuoteSelector|TextualBody|TimeState|XPathSelector|annotationService|assessing|bodyValue|bookmarking|cachedSource|canonical|classifying|commenting|describing|editing|end|exact|hasBody|hasEndSelector|hasPurpose|hasScope|hasSelector|hasSource|hasStartSelector|hasState|hasTarget|highlighting|identifying|linking|ltrDirection|moderating|motivatedBy|prefix|processingLanguage|questioning|refinedBy|renderedVia|replying|rtlDirection|sourceDate|sourceDateEnd|sourceDateStart|start|styleClass|styledBy|suffix|tagging|textDirection|via)$/;

  OSMT_name = "https://wiki.openstreetmap.org/wiki/Key:name";

  OSMT_reg_name = "https://wiki.openstreetmap.org/wiki/Key:reg_name";

  OWL_Class = "http://www.w3.org/2002/07/owl#Class";

  OWL_Thing = "http://www.w3.org/2002/07/owl#Thing";

  OWL_ObjectProperty = "http://www.w3.org/2002/07/owl#ObjectProperty";

  RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";

  RDF_object = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";

  RDF_type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

  RDF_Class = "http://www.w3.org/2000/01/rdf-schema#Class";

  RDF_subClassOf = "http://www.w3.org/2000/01/rdf-schema#subClassOf";

  RDF_a = 'a';

  RDFS_label = "http://www.w3.org/2000/01/rdf-schema#label";

  SCHEMA_name = "http://schema.org/name";

  SKOS_prefLabel = "http://www.w3.org/2004/02/skos/core#prefLabel";

  XL_literalForm = "http://www.w3.org/2008/05/skos-xl#literalForm";

  TYPE_SYNS = [RDF_type, RDF_a, 'rdfs:type', 'rdf:type'];

  THUMB_PREDS = ['http://dbpedia.org/ontology/thumbnail', 'http://xmlns.com/foaf/0.1/thumbnail'];

  NAME_SYNS = [FOAF_name, RDFS_label, 'rdfs:label', 'name', SKOS_prefLabel, XL_literalForm, SCHEMA_name, DCE_title, OSMT_reg_name, OSMT_name];

  XML_TAG_REGEX = /(<([^>]+)>)/ig;

  typeSigRE = {
    'xsd': new RegExp("^http:\/\/www\.w3\.org\/2001\/XMLSchema\#(.*)$"),
    'rdf': new RegExp("^http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#(.*)$")
  };

  getPrefixedTypeSignature = function(typeUri) {
    var match, prefix, sig;
    for (prefix in typeSigRE) {
      sig = typeSigRE[prefix];
      match = typeUri.match(sig);
      if (match) {
        return prefix + "__" + match[1];
      }
    }
  };

  getTypeSignature = function(typeUri) {
    var typeSig;
    typeSig = getPrefixedTypeSignature(typeUri);
    return typeSig;
  };

  PRIMORDIAL_ONTOLOGY = {
    subClassOf: {
      Literal: 'Thing',
      "rdf__PlainLiteral": 'Literal',
      "rdf__HTML": 'Literal',
      "rdf__langString": 'Literal',
      "rdf__type": 'Literal',
      "rdf__XMLLiteral": 'Literal',
      "xsd__anyURI": 'Literal',
      "xsd__base64Binary": 'Literal',
      "xsd__boolean": 'Literal',
      "xsd__date": 'Literal',
      "xsd__dateTimeStamp": 'date',
      "xsd__decimal": 'Literal',
      "xsd__integer": "xsd__decimal",
      "xsd__long": "xsd__integer",
      "xsd__int": "xsd__long",
      "xsd__short": "xsd__int",
      "xsd__byte": "xsd__short",
      "xsd__nonNegativeInteger": "xsd__integer",
      "xsd__positiveInteger": "xsd__nonNegativeInteger",
      "xsd__unsignedLong": "xsd__nonNegativeInteger",
      "xsd__unsignedInt": "xsd__unsignedLong",
      "xsd__unsignedShort": "xsd__unsignedInt",
      "xsd__unsignedByte": "xsd__unsignedShort",
      "xsd__nonPositiveInteger": "xsd__integer",
      "xsd__negativeInteger": "xsd__nonPositiveInteger",
      "xsd__double": 'Literal',
      "xsd__duration": 'Literal',
      "xsd__float": 'Literal',
      "xsd__gDay": 'Literal',
      "xsd__gMonth": 'Literal',
      "xsd__gMonthDay": 'Literal',
      "xsd__gYear": 'Literal',
      "xsd__gYearMonth": 'Literal',
      "xsd__hexBinary": 'Literal',
      "xsd__NOTATION": 'Literal',
      "xsd__QName": 'Literal',
      "xsd__string": 'Literal',
      "xsd__normalizedString": "xsd_string",
      "xsd__token": "xsd__normalizedString",
      "xsd__language": "xsd__token",
      "xsd__Name": "xsd__token",
      "xsd__NCName": "xsd__Name",
      "xsd__time": 'Literal'
    },
    subPropertyOf: {},
    domain: {},
    range: {},
    label: {}
  };

  MANY_SPACES_REGEX = /\s{2,}/g;

  UNDEFINED = void 0;

  start_with_http = new RegExp("http", "ig");

  ids_to_show = start_with_http;

  PEEKING_COLOR = "darkgray";

  themeStyles = {
    "light": {
      "themeName": "theme_white",
      "pageBg": "white",
      "labelColor": "black",
      "shelfColor": "lightgreen",
      "discardColor": "salmon",
      "nodeHighlightOutline": "black"
    },
    "dark": {
      "themeName": "theme_black",
      "pageBg": "black",
      "labelColor": "#ddd",
      "shelfColor": "#163e00",
      "discardColor": "#4b0000",
      "nodeHighlightOutline": "white"
    }
  };

  id_escape = function(an_id) {
    var retval;
    retval = an_id.replace(/\:/g, '_');
    retval = retval.replace(/\//g, '_');
    retval = retval.replace(new RegExp(' ', 'g'), '_');
    retval = retval.replace(new RegExp('\\?', 'g'), '_');
    retval = retval.replace(new RegExp('\=', 'g'), '_');
    retval = retval.replace(new RegExp('\\.', 'g'), '_');
    retval = retval.replace(new RegExp('\\#', 'g'), '_');
    return retval;
  };

  if (true) {
    node_radius_policies = {
      "node radius by links": function(d) {
        d.radius = Math.max(this.node_radius, Math.log(d.links_shown.length));
        return d.radius;
        if (d.showing_links === "none") {
          d.radius = this.node_radius;
        } else {
          if (d.showing_links === "all") {
            d.radius = Math.max(this.node_radius, 2 + Math.log(d.links_shown.length));
          }
        }
        return d.radius;
      },
      "equal dots": function(d) {
        return this.node_radius;
      }
    };
    default_node_radius_policy = "equal dots";
    default_node_radius_policy = "node radius by links";
    has_type = function(subject, typ) {
      return has_predicate_value(subject, RDF_type, typ);
    };
    has_predicate_value = function(subject, predicate, value) {
      var obj, objs, oi, pre;
      pre = subject.predicates[predicate];
      if (pre) {
        objs = pre.objects;
        oi = 0;
        while (oi <= objs.length) {
          obj = objs[oi];
          if (obj.value === value) {
            return true;
          }
          oi++;
        }
      }
      return false;
    };
    is_a_main_node = function(d) {
      return (BLANK_HACK && d.s.id[7] !== "/") || (!BLANK_HACK && d.s.id[0] !== "_");
    };
    is_node_to_always_show = is_a_main_node;
    is_one_of = function(itm, array) {
      return array.indexOf(itm) > -1;
    };
  }

  if (!is_one_of(2, [3, 2, 4])) {
    alert("is_one_of() fails");
  }

  window.blurt = function(str, type, noButton) {
    throw new Error('global blurt() is defunct, use @blurt() on HuViz');
  };

  escapeHtml = function(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  };

  noop = function() {};

  SettingsWidget = (function() {
    function SettingsWidget(huviz, inputElem1, state) {
      this.huviz = huviz;
      this.inputElem = inputElem1;
      this.id = unique_id('widget_');
      this.inputJQElem = $(this.inputElem);
    }

    SettingsWidget.prototype.wrap = function(html) {
      return $(this.inputElem).wrap(html);
    };

    return SettingsWidget;

  })();

  UsernameWidget = (function(superClass) {
    extend(UsernameWidget, superClass);

    UsernameWidget.prototype.state_to_state_icon = {
      bad: 'fa-times',
      good: 'fa-check',
      untried: 'fa-question',
      trying: 'fa-spinner fa-pulse',
      empty: 'fa-ellipsis-h',
      looking: 'fa-map-marker-alt fa-spin'
    };

    UsernameWidget.prototype.state_to_color = {
      bad: 'red',
      good: 'green',
      untried: 'orange',
      trying: 'orange',
      empty: 'grey',
      looking: 'green'
    };

    function UsernameWidget() {
      UsernameWidget.__super__.constructor.apply(this, arguments);
      this.wrap("<div id=\"" + this.id + "\" class=\"geo_input_wrap\"></div>");
      this.widgetJQElem = $('#' + this.id);
      this.widgetJQElem.prepend("<i class=\"userIcon fa fa-user-alt\"></i><i class=\"stateIcon fa fa-question\"></i>");
      this.stateIconJQElem = this.widgetJQElem.find('.stateIcon');
      this.userIconJQElem = this.widgetJQElem.find('.userIcon');
      this.set_state('empty');
    }

    UsernameWidget.prototype.set_state = function(state) {
      var color, stateIcon;
      if (false && this.state && this.state === state) {
        console.log("not bothering to change the state to", state, "cause it already is");
        return;
      }
      this.state = state;
      console.info(this.constructor.name, "state:", state, 'username:', this.inputJQElem.val());
      stateIcon = this.state_to_state_icon[state];
      this.stateIconJQElem.attr('class', "stateIcon fa " + stateIcon);
      color = this.state_to_color[state];
      this.widgetJQElem.css('border-color', color);
      this.widgetJQElem.css('color', color);
    };

    return UsernameWidget;

  })(SettingsWidget);

  GeoUserNameWidget = (function(superClass) {
    extend(GeoUserNameWidget, superClass);

    function GeoUserNameWidget() {
      GeoUserNameWidget.__super__.constructor.apply(this, arguments);
      this.stateIconJQElem.on('click', this.huviz.show_geonames_instructions);
      this.userIconJQElem.on('click', this.huviz.show_geonames_instructions);
    }

    return GeoUserNameWidget;

  })(UsernameWidget);

  orlando_human_term = {
    all: 'All',
    chosen: 'Activated',
    unchosen: 'Deactivated',
    selected: 'Selected',
    shelved: 'Shelved',
    discarded: 'Discarded',
    hidden: 'Hidden',
    graphed: 'Graphed',
    fixed: 'Pinned',
    labelled: 'Labelled',
    choose: 'Activate',
    unchoose: 'Deactivate',
    wander: 'Wander',
    walk: 'Walk',
    walked: "Walked",
    select: 'Select',
    unselect: 'Unselect',
    label: 'Label',
    unlabel: 'Unlabel',
    shelve: 'Shelve',
    hide: 'Hide',
    discard: 'Discard',
    undiscard: 'Retrieve',
    pin: 'Pin',
    unpin: 'Unpin',
    unpinned: 'Unpinned',
    nameless: 'Nameless',
    blank_verb: 'VERB',
    blank_noun: 'SET/SELECTION',
    hunt: 'Hunt',
    load: 'Load',
    draw: 'Draw',
    undraw: 'Undraw',
    connect: 'Connect',
    spawn: 'Spawn',
    specialize: 'Specialize',
    annotate: 'Annotate',
    seeking_object: 'Object node',
    suppress: 'Suppress',
    suppressed: 'Suppresssed'
  };

  Huviz = (function() {
    var nodeOrderAngle, renderStyles;

    Huviz.prototype.hash = hash;

    Huviz.prototype.class_list = [];

    Huviz.prototype.HHH = {};

    Huviz.prototype.edges_by_id = {};

    Huviz.prototype.edge_count = 0;

    Huviz.prototype.snippet_db = {};

    Huviz.prototype.class_index = {};

    Huviz.prototype.hierarchy = {};

    Huviz.prototype.default_color = "brown";

    Huviz.prototype.DEFAULT_CONTEXT = 'http://universal.org/';

    Huviz.prototype.turtle_parser = 'GreenerTurtle';

    Huviz.prototype.use_canvas = true;

    Huviz.prototype.use_svg = false;

    Huviz.prototype.use_webgl = false;

    Huviz.prototype.nodes = void 0;

    Huviz.prototype.links_set = void 0;

    Huviz.prototype.node = void 0;

    Huviz.prototype.link = void 0;

    Huviz.prototype.lariat = void 0;

    Huviz.prototype.verbose = true;

    Huviz.prototype.verbosity = 0;

    Huviz.prototype.TEMP = 5;

    Huviz.prototype.COARSE = 10;

    Huviz.prototype.MODERATE = 20;

    Huviz.prototype.DEBUG = 40;

    Huviz.prototype.DUMP = false;

    Huviz.prototype.node_radius_policy = void 0;

    Huviz.prototype.draw_circle_around_focused = true;

    Huviz.prototype.draw_lariat_labels_rotated = true;

    Huviz.prototype.run_force_after_mouseup_msec = 2000;

    Huviz.prototype.nodes_pinnable = true;

    Huviz.prototype.BLANK_HACK = false;

    Huviz.prototype.width = void 0;

    Huviz.prototype.height = 0;

    Huviz.prototype.cx = 0;

    Huviz.prototype.cy = 0;

    Huviz.prototype.snippet_body_em = .7;

    Huviz.prototype.line_length_min = 4;

    Huviz.prototype.link_distance = 29;

    Huviz.prototype.fisheye_zoom = 4.0;

    Huviz.prototype.peeking_line_thicker = 4;

    Huviz.prototype.show_snippets_constantly = false;

    Huviz.prototype.charge = -193;

    Huviz.prototype.gravity = 0.025;

    Huviz.prototype.snippet_count_on_edge_labels = true;

    Huviz.prototype.label_show_range = null;

    Huviz.prototype.focus_threshold = 100;

    Huviz.prototype.discard_radius = 200;

    Huviz.prototype.fisheye_radius = 300;

    Huviz.prototype.focus_radius = null;

    Huviz.prototype.drag_dist_threshold = 5;

    Huviz.prototype.snippet_size = 300;

    Huviz.prototype.dragging = false;

    Huviz.prototype.last_status = void 0;

    Huviz.prototype.edge_x_offset = 5;

    Huviz.prototype.shadow_offset = 1;

    Huviz.prototype.shadow_color = 'DarkGray';

    Huviz.prototype.my_graph = {
      predicates: {},
      subjects: {},
      objects: {}
    };

    Huviz.prototype.G = {};

    Huviz.prototype.local_file_data = "";

    Huviz.prototype.search_regex = new RegExp("^$", "ig");

    Huviz.prototype.node_radius = 3.2;

    Huviz.prototype.mousedown_point = false;

    Huviz.prototype.discard_center = [0, 0];

    Huviz.prototype.lariat_center = [0, 0];

    Huviz.prototype.last_mouse_pos = [0, 0];

    renderStyles = themeStyles.light;

    Huviz.prototype.display_shelf_clockwise = true;

    nodeOrderAngle = 0.5;

    Huviz.prototype.pfm_data = {
      tick: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Ticks/sec."
      },
      add_quad: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Add Quad/sec"
      },
      hatch: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Hatch/sec"
      },
      taxonomy: {
        total_count: 0,
        label: "Number of Classes:"
      },
      sparql: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Sparql Queries/sec"
      }
    };

    Huviz.prototype.p_total_sprql_requests = 0;

    Huviz.prototype.how_heavy_are = function(n, label, cb) {
      var after, before, buncha, diff, j, k, m, memories, per, ref, retval;
      memories = [];
      memories.push(window.performance.memory);
      if (this.heavy_things == null) {
        this.heavy_things = {};
      }
      buncha = [];
      this.heavy_things[label] = buncha;
      for (m = j = 1, ref = n; 1 <= ref ? j <= ref : j >= ref; m = 1 <= ref ? ++j : --j) {
        retval = cb.call(this, n);
        buncha.push(retval);
      }
      memories.push(window.performance.memory);
      memories.push({});
      memories.push({});
      before = memories[0], after = memories[1], diff = memories[2], per = memories[3];
      for (k in memories[0]) {
        diff[k] = after[k] - before[k];
        per[k] = diff[k] / n;
      }
      per.what = 'B/' + label;
      before.what = 'before';
      after.what = 'after';
      diff.what = 'diff';
      colorlog(label + ' occupy ' + per.totalJSHeapSize + ' Bytes each');
      console.log('eg', retval);
    };

    Huviz.prototype.how_heavy = function(n) {
      this.how_heavy_are(n, 'Array', function(x) {
        return new Array(100);
      });
      this.how_heavy_are(n, 'Object', function(x) {
        return (new Object())[x] = x;
      });
      this.how_heavy_are(n, 'String', function(x) {
        return "" + x;
      });
      this.how_heavy_are(n, 'Random', function(x) {
        return Math.random();
      });
      return this.how_heavy_are(n, 'SortedSet', function(x) {
        return SortedSet().named(x);
      });
    };

    Huviz.prototype.compose_object_from_defaults_and_incoming = function(defs, incoming) {
      if (defs == null) {
        defs = {};
      }
      if (incoming == null) {
        incoming = {};
      }
      return Object.assign(Object.assign({}, defs), incoming);
    };

    Huviz.prototype.default_dialog_args = {
      width: 200,
      height: 200,
      left: 100,
      top: 100,
      head_bg_color: '#157fcc',
      classes: "contextMenu temp",
      title: ''
    };

    Huviz.prototype.gen_dialog_html = function(contents, id, in_args) {
      var args;
      args = this.compose_object_from_defaults_and_incoming(this.default_dialog_args, in_args);
      return "<div id=\"" + id + "\" class=\"" + args.classes + " " + args.extraClasses + "\"\n    style=\"display:block;top:" + args.top + "px;left:" + args.left + "px;max-width:" + args.width + "px;max-height:" + args.height + "px\">\n  <div class=\"header\" style=\"background-color:" + args.head_bg_color + ";" + args.style + "\">\n    <div class=\"dialog_title\">" + args.title + "</div>\n    <button class=\"close_node_details\" title=\"Close\"><i class=\"far fa-window-close\" for=\"" + id + "\"></i></button>\n  </div>\n  " + contents + "\n</div>";
    };

    Huviz.prototype.make_dialog = function(content_html, id, args) {
      var elem;
      if (id == null) {
        id = this.unique_id('dialog_');
      }
      this.addHTML(this.gen_dialog_html(content_html, id, args));
      elem = document.querySelector('#' + id);
      $(elem).on('drag', this.pop_div_to_top);
      $(elem).draggable().resizable();
      $(elem.querySelector(' .close_node_details')).on('click', args.close || this.destroy_dialog);
      return elem;
    };

    Huviz.prototype.pop_div_to_top = function(elem) {
      return $(elem.currentTarget).parent().append(elem.currentTarget);
    };

    Huviz.prototype.destroy_dialog = function(e) {
      var box;
      box = e.currentTarget.offsetParent;
      return $(box).remove();
    };

    Huviz.prototype.make_markdown_dialog = function(markdown, id, args) {
      if (args == null) {
        args = {};
      }
      args.extraClasses += " markdownDialog";
      return this.make_dialog(marked(markdown || ''), id, args);
    };

    Huviz.prototype.make_pre_dialog = function(textToPre, id, args) {
      if (args == null) {
        args = {};
      }
      args.extraClasses += " preformattedDialog";
      return this.make_dialog("<pre>" + textToPre + "</pre>", id, args);
    };

    Huviz.prototype.make_json_dialog = function(json, id, args) {
      var jsonString;
      if (args == null) {
        args = {};
      }
      args.extraClasses += " preformattedDialog";
      jsonString = JSON.stringify(json, null, args.json_indent || 2);
      return this.make_dialog("<pre>" + jsonString + "</pre>", id, args);
    };

    Huviz.prototype.unique_id = function(prefix) {
      if (prefix == null) {
        prefix = 'uid_';
      }
      return prefix + Math.random().toString(36).substr(2, 10);
    };

    Huviz.prototype.change_sort_order = function(array, cmp) {
      array.__current_sort_order = cmp;
      return array.sort(array.__current_sort_order);
    };

    Huviz.prototype.isArray = function(thing) {
      return Object.prototype.toString.call(thing) === "[object Array]";
    };

    Huviz.prototype.cmp_on_name = function(a, b) {
      if (a.name === b.name) {
        return 0;
      }
      if (a.name < b.name) {
        return -1;
      }
      return 1;
    };

    Huviz.prototype.cmp_on_id = function(a, b) {
      if (a.id === b.id) {
        return 0;
      }
      if (a.id < b.id) {
        return -1;
      }
      return 1;
    };

    Huviz.prototype.binary_search_on = function(sorted_array, sought, cmp, ret_ins_idx) {
      var bot, c, mid, seeking, top;
      cmp = cmp || sorted_array.__current_sort_order || this.cmp_on_id;
      ret_ins_idx = ret_ins_idx || false;
      seeking = true;
      if (sorted_array.length < 1) {
        if (ret_ins_idx) {
          return {
            idx: 0
          };
        }
        return -1;
      }
      mid = void 0;
      bot = 0;
      top = sorted_array.length;
      while (seeking) {
        mid = bot + Math.floor((top - bot) / 2);
        c = cmp(sorted_array[mid], sought);
        if (c === 0) {
          return mid;
        }
        if (c < 0) {
          bot = mid + 1;
        } else {
          top = mid;
        }
        if (bot === top) {
          if (ret_ins_idx) {
            return {
              idx: bot
            };
          }
          return -1;
        }
      }
    };

    Huviz.prototype.roughSizeOfObject = function(object) {
      var bytes, i, objectList, stack, value;
      objectList = [];
      stack = [object];
      bytes = 0;
      while (stack.length) {
        value = stack.pop();
        if (typeof value === "boolean") {
          bytes += 4;
        } else if (typeof value === "string") {
          bytes += value.length * 2;
        } else if (typeof value === "number") {
          bytes += 8;
        } else if (typeof value === "object" && objectList.indexOf(value) === -1) {
          objectList.push(value);
          for (i in value) {
            stack.push(value[i]);
          }
        }
      }
      return bytes;
    };

    Huviz.prototype.move_node_to_point = function(node, point) {
      node.x = point[0];
      return node.y = point[1];
    };

    Huviz.prototype.click_node = function(node_or_id) {
      var evt, node;
      console.warn("click_node() is deprecated");
      if (typeof node_or_id === 'string') {
        node = this.nodes.get_by('id', node_or_id);
      } else {
        node = node_or_id;
      }
      this.set_focused_node(node);
      evt = new MouseEvent("mouseup", {
        screenX: node.x,
        screenY: node.y
      });
      this.canvas.dispatchEvent(evt);
      return this;
    };

    Huviz.prototype.click_verb = function(id) {
      var verbs;
      verbs = $("#verb-" + id);
      if (!verbs.length) {
        throw new Error("verb '" + id + "' not found");
      }
      verbs.trigger("click");
      return this;
    };

    Huviz.prototype.click_set = function(id) {
      var sel, sets;
      if (id === 'nodes') {
        alert("set 'nodes' is deprecated");
        console.error("set 'nodes' is deprecated");
      } else {
        if (!id.endsWith('_set')) {
          id = id + '_set';
        }
      }
      sel = "#" + id;
      sets = $(sel);
      if (!sets.length) {
        throw new Error("set '" + id + "' not found using selector: '" + sel + "'");
      }
      sets.trigger("click");
      return this;
    };

    Huviz.prototype.click_predicate = function(id) {
      this.gclui.predicate_picker.handle_click(id);
      return this;
    };

    Huviz.prototype.click_taxon = function(id) {
      $("#" + id).trigger("click");
      return this;
    };

    Huviz.prototype.like_string = function(str) {
      this.gclui.like_input.val(str);
      this.gclui.handle_like_input();
      return this;
    };

    Huviz.prototype.toggle_expander = function(id) {
      this.topJQElem.find("#" + id + " span.expander:first").trigger("click");
      return this;
    };

    Huviz.prototype.doit = function() {
      this.topJQElem.find(".doit_button").trigger("click");
      return this;
    };

    Huviz.prototype.make_cursor_text_while_dragging = function(action) {
      var drag_or_drop;
      if (action === 'seeking_object') {
        drag_or_drop = 'drag';
      } else {
        drag_or_drop = 'drop';
      }
      return (this.human_term[drag_or_drop] || drag_or_drop) + " to " + (this.human_term[action] || action);
    };

    Huviz.prototype.get_mouse_point = function(d3_event) {
      if (d3_event == null) {
        d3_event = this.mouse_receiver[0][0];
      }
      return d3.mouse(d3_event);
    };

    Huviz.prototype.should_start_dragging = function() {
      return !this.dragging && this.mousedown_point && this.focused_node && distance(this.last_mouse_pos, this.mousedown_point) > this.drag_dist_threshold;
    };

    Huviz.prototype.mousemove = function() {
      var action, cursor_text, e, edge, edit_state, j, len1, pair, ref, ref1, ref2;
      this.last_mouse_pos = this.get_mouse_point();
      if (this.should_start_dragging()) {
        this.dragging = this.focused_node;
        if (this.args.drag_start_handler) {
          try {
            this.args.drag_start_handler.call(this, this.dragging);
          } catch (_error) {
            e = _error;
            console.warn(e);
          }
        }
        if (this.editui.is_state('connecting')) {
          if (this.editui.subject_node !== this.dragging) {
            this.editui.set_subject_node(this.dragging);
          }
        }
        if (this.dragging.state !== this.graphed_set) {
          this.graphed_set.acquire(this.dragging);
        }
      }
      if (this.dragging) {
        this.force.resume();
        if (!this.args.skip_log_tick) {
          console.log("Tick in @force.resume() mousemove");
        }
        this.move_node_to_point(this.dragging, this.last_mouse_pos);
        if (this.editui.is_state('connecting')) {
          this.text_cursor.pause("", "drop on object node");
        } else {
          if (this.dragging.links_shown.length === 0) {
            action = "choose";
          } else if (this.dragging.fixed) {
            action = "unpin";
          } else {
            action = "pin";
          }
          if ((edit_state = this.editui.get_state()) !== 'not_editing') {
            action = edit_state;
          } else if (this.in_disconnect_dropzone(this.dragging)) {
            action = "shelve";
          } else if (this.in_discard_dropzone(this.dragging)) {
            action = "discard";
          }
          cursor_text = this.make_cursor_text_while_dragging(action);
          this.text_cursor.pause("", cursor_text);
        }
      } else {
        if (this.editui.is_state('connecting')) {
          if (this.editui.object_node || !this.editui.subject_node) {
            if (this.editui.object_datatype_is_literal) {
              this.text_cursor.set_text("click subject node");
            } else {
              this.text_cursor.set_text("drag subject node");
            }
          }
        }
      }
      if (this.peeking_node != null) {
        if ((this.focused_node != null) && this.focused_node !== this.peeking_node) {
          pair = [this.peeking_node.id, this.focused_node.id];
          ref = this.peeking_node.links_shown;
          for (j = 0, len1 = ref.length; j < len1; j++) {
            edge = ref[j];
            if ((ref1 = edge.source.id, indexOf.call(pair, ref1) >= 0) && (ref2 = edge.target.id, indexOf.call(pair, ref2) >= 0)) {
              edge.focused = true;
              this.print_edge(edge);
            } else {
              edge.focused = false;
            }
          }
        }
      }
      return this.tick("Tick in mousemove");
    };

    Huviz.prototype.mousedown = function() {
      this.mousedown_point = this.get_mouse_point();
      return this.last_mouse_pos = this.mousedown_point;
    };

    Huviz.prototype.mouseup = function() {
      var d3_event, drag_dist, point;
      window.log_click();
      d3_event = this.mouse_receiver[0][0];
      this.mousedown_point = false;
      point = this.get_mouse_point(d3_event);
      if (d3.event.button === 2) {
        if (this.focused_node) {
          $("#" + this.focused_node.lid).removeClass("temp");
        }
        return;
      }
      if (this.dragging) {
        this.move_node_to_point(this.dragging, point);
        if (this.in_discard_dropzone(this.dragging)) {
          this.run_verb_on_object('discard', this.dragging);
        } else if (this.in_disconnect_dropzone(this.dragging)) {
          this.run_verb_on_object('shelve', this.dragging);
        } else if (this.dragging.links_shown.length === 0) {
          this.run_verb_on_object('choose', this.dragging);
        } else if (this.nodes_pinnable) {
          if (this.editui.is_state('connecting') && (this.dragging === this.editui.subject_node)) {
            console.log("not pinning subject_node when dropping");
          } else if (this.dragging.fixed) {
            this.run_verb_on_object('unpin', this.dragging);
          } else {
            this.run_verb_on_object('pin', this.dragging);
          }
        }
        this.dragging = false;
        this.text_cursor["continue"]();
        return;
      }
      if (this.editui.is_state('connecting') && this.focused_node && this.editui.object_datatype_is_literal) {
        this.editui.set_subject_node(this.focused_node);
        this.tick("Tick in mouseup 1");
        return;
      }
      if (this.focused_node) {
        if (window.location.hostname === 'localhost') {
          console.log(this.focused_node);
        }
        this.perform_current_command(this.focused_node);
        this.tick("Tick in mouseup 2");
        return;
      }
      if (this.focused_edge) {
        this.print_edge(this.focused_edge);
        return;
      }
      drag_dist = distance(point, this.mousedown_point);
      if (this.focused_node) {
        if (this.focused_node.state !== this.graphed_set) {
          this.run_verb_on_object('choose', this.focused_node);
        } else if (this.focused_node.showing_links === "all") {
          this.run_verb_on_object('print', this.focused_node);
        } else {
          this.run_verb_on_object('choose', this.focused_node);
        }
        this.force.links(this.links_set);
        if (!this.args.skip_log_tick) {
          console.log("Tick in @force.links() mouseup");
        }
        this.restart();
      }
    };

    Huviz.prototype.log_mouse_activity = function(label) {
      return console.log(label, "\n  dragging", this.dragging, "\n  mousedown_point:", this.mousedown_point, "\n  @focused_node:", this.focused_node);
    };

    Huviz.prototype.mouseright = function() {
      var doesnt_exist;
      d3.event.preventDefault();
      doesnt_exist = this.focused_node ? true : false;
      if (this.focused_node && doesnt_exist) {
        return this.render_node_info_box(this.focused_node);
      }
    };

    Huviz.prototype.render_node_info_box = function(info_node) {
      var aa, all_names, color, color_headers, dialogArgs, id_display, j, len1, len2, len3, len4, link_from, name, names_all_langs, node_info_html, node_inspector_id, node_out_links, node_type, note, other_types, p, ref, ref1, ref2, ref3, target, target_prefix, width, z;
      node_inspector_id = "NODE_INSPECTOR__" + info_node.lid;
      if (info_node._inspector != null) {
        this.hilight_dialog(info_node._inspector);
        return;
      }
      console.log("inspect node:", info_node);
      all_names = Object.values(info_node.name);
      names_all_langs = "";
      note = "";
      color_headers = "";
      node_out_links = "";
      for (j = 0, len1 = all_names.length; j < len1; j++) {
        name = all_names[j];
        if (names_all_langs) {
          names_all_langs = names_all_langs + " -- " + name;
        } else {
          names_all_langs = name;
        }
      }
      other_types = "";
      if (info_node._types.length > 1) {
        ref = info_node._types;
        for (p = 0, len2 = ref.length; p < len2; p++) {
          node_type = ref[p];
          if (node_type !== info_node.type) {
            if (other_types) {
              other_types = other_types + ", " + node_type;
            } else {
              other_types = node_type;
            }
          }
        }
        other_types = " (" + other_types + ")";
      }
      if (info_node.links_from.length > 0) {
        ref1 = info_node.links_from;
        for (z = 0, len3 = ref1.length; z < len3; z++) {
          link_from = ref1[z];
          ref2 = this.render_target_for_display(link_from.target), target_prefix = ref2[0], target = ref2[1];
          node_out_links = node_out_links + ("<li><i class='fas fa-long-arrow-alt-right'></i>\n  <a href='" + link_from.predicate.id + "' target='blank'>" + link_from.predicate.lid + "</a>\n  " + target_prefix + " " + target + "\n</li>");
        }
        node_out_links = "<ul>" + node_out_links + "</ul>";
      }
      if (info_node._colors) {
        width = 100 / info_node._colors.length;
        ref3 = info_node._colors;
        for (aa = 0, len4 = ref3.length; aa < len4; aa++) {
          color = ref3[aa];
          color_headers = color_headers + ("<div class='subHeader' style='background-color: " + color + "; width: " + width + "%;'></div>");
        }
      }
      if (this.endpoint_loader.value) {
        if (this.endpoint_loader.value && info_node.fully_loaded) {
          note = "<p class='note'>Node Fully Loaded</span>";
        } else {
          note = "<p class='note'><span class='label'>Note:</span>\nThis node may not yet be fully loaded from remote server.\nLink details may not be accurate. Activate to load.</i>";
        }
      }
      dialogArgs = {
        width: this.width * 0.50,
        height: this.height * 0.80,
        top: d3.event.clientY,
        left: d3.event.clientX,
        close: this.close_node_inspector
      };
      if (info_node) {
        dialogArgs.head_bg_color = info_node.color;
        id_display = this.create_link_if_url(info_node.id);
        node_info_html = "<div class=\"message_wrapper\">\n  <p class='id_display'><span class='label'>id:</span> " + id_display + "</p>\n  <p><span class='label'>name:</span> " + names_all_langs + "</p>\n  <p><span class='label'>type(s):</span> " + info_node.type + " " + other_types + "</p>\n  <p><span class='label'>Links To:</span> " + info_node.links_to.length + " <br>\n    <span class='label'>Links From:</span> " + info_node.links_from.length + "</p>\n    " + note + "\n    " + node_out_links + "\n</div>";
        info_node._inspector = this.make_dialog(node_info_html, node_inspector_id, dialogArgs);
        info_node._inspector.dataset.node_id = info_node.id;
      }
    };

    Huviz.prototype.close_node_inspector = function(event, ui) {
      var box, node, node_id;
      box = event.currentTarget.offsetParent;
      node_id = box.dataset.node_id;
      if (node_id != null) {
        node = this.all_set.get_by('id', node_id);
        if (node != null) {
          delete node._inspector;
        }
      }
      this.destroy_dialog(event);
    };

    Huviz.prototype.create_link_if_url = function(possible_link) {
      var target, url_check;
      url_check = possible_link.substring(0, 4);
      if (url_check === "http") {
        return target = "<a href='" + possible_link + "' target='blank'>" + possible_link + "</a>";
      } else {
        return target = possible_link;
      }
    };

    Huviz.prototype.render_target_for_display = function(node) {
      var arrow, colon, lines, showBlock, typeCURIE;
      if (node.isLiteral) {
        typeCURIE = node.type.replace('__', ':');
        lines = node.name.toString().split(/\r\n|\r|\n/);
        showBlock = lines.length > 1 || node.name.toString().length > 30;
        colon = ":";
        if (showBlock) {
          return [colon, "<blockquote title=\"" + typeCURIE + "\">" + node.name + "</blockquote>"];
        } else {
          return [colon, "<code title=\"" + typeCURIE + "\">" + node.name + "</code>"];
        }
      } else {
        arrow = "<i class='fas fa-long-arrow-alt-right'></i>";
        return [arrow, this.create_link_if_url(node.id)];
      }
    };

    Huviz.prototype.perform_current_command = function(node) {
      var cmd;
      if (this.gclui.ready_to_perform()) {
        cmd = new gcl.GraphCommand(this, {
          verbs: this.gclui.engaged_verbs,
          subjects: [node]
        });
        this.run_command(cmd);
      }
      return this.clean_up_all_dirt_once();
    };

    Huviz.prototype.run_command = function(cmd, callback) {
      this.gclui.show_working_on(cmd);
      this.gclc.run(cmd, callback);
      this.gclui.show_working_off();
    };

    Huviz.prototype.updateWindow = function() {
      var instance_container;
      if (!this.container) {
        console.warn('updateWindow() skipped until @container');
        return;
      }
      this.get_container_width();
      this.get_container_height();
      this.update_graph_radius();
      this.update_graph_center();
      this.update_discard_zone();
      this.update_lariat_zone();
      if (this.svg) {
        this.svg.attr("width", this.width).attr("height", this.height);
      }
      if (this.canvas) {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
      }
      this.force.size([this.mx, this.my]);
      if (!this.args.skip_log_tick) {
        console.log("Tick in @force.size() updateWindow");
      }
      instance_container = this.args.huviz_top_sel;
      $(instance_container + " .graph_title_set").css("width", this.width);
      if (this.tabsJQElem && this.tabsJQElem.length > 0) {
        this.tabsJQElem.css("left", "auto");
      }
      return this.restart();
    };

    Huviz.prototype.get_charge = function(d) {
      var graphed, retval;
      graphed = d.state === this.graphed_set;
      retval = graphed && this.charge || 0;
      if (d.charge != null) {
        retval = d.charge;
      }
      return retval;
    };

    Huviz.prototype.get_gravity = function() {
      return this.gravity;
    };

    Huviz.prototype.init_webgl = function() {
      this.init();
      return this.animate();
    };

    Huviz.prototype.draw_circle = function(cx, cy, radius, strclr, filclr, start_angle, end_angle, special_focus) {
      var incl_cntr;
      incl_cntr = (start_angle != null) || (end_angle != null);
      start_angle = start_angle || 0;
      end_angle = end_angle || tau;
      if (strclr) {
        this.ctx.strokeStyle = strclr || "blue";
      }
      if (filclr) {
        this.ctx.fillStyle = filclr || "blue";
      }
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, start_angle, end_angle, true);
      this.ctx.closePath();
      if (strclr) {
        this.ctx.stroke();
      }
      if (filclr) {
        this.ctx.fill();
      }
      if (special_focus) {
        this.ctx.beginPath();
        radius = radius / 2;
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fillStyle = "black";
        return this.ctx.fill();
      }
    };

    Huviz.prototype.draw_round_img = function(cx, cy, radius, strclr, filclr, special_focus, imageData, url) {
      var end_angle, img, incl_cntr, start_angle, wh;
      incl_cntr = (typeof start_angle !== "undefined" && start_angle !== null) || (typeof end_angle !== "undefined" && end_angle !== null);
      start_angle = start_angle || 0;
      end_angle = end_angle || tau;
      if (strclr) {
        this.ctx.strokeStyle = strclr || "blue";
      }
      this.ctx.beginPath();
      if (incl_cntr) {
        this.ctx.moveTo(cx, cy);
      }
      this.ctx.arc(cx, cy, radius, start_angle, end_angle, true);
      this.ctx.closePath();
      if (strclr) {
        this.ctx.stroke();
      }
      if (filclr) {
        this.ctx.fill();
      }
      wh = radius * 2;
      if (imageData != null) {
        this.ctx.drawImage(imageData, cx - radius, cy - radius, wh, wh);
      } else {
        img = new Image();
        img.src = url;
        this.ctx.drawImage(img, 0, 0, img.width, img.height, cx - radius, cy - radius, wh, wh);
      }
      if (special_focus) {
        this.ctx.beginPath();
        radius = radius / 2;
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fillStyle = "black";
        return this.ctx.fill();
      }
    };

    Huviz.prototype.draw_triangle = function(x, y, color, x1, y1, x2, y2) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.strokeStyle = color;
      this.ctx.lineTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.moveTo(x, y);
      this.ctx.stroke();
      this.ctx.fillStyle = color;
      this.ctx.fill();
      return this.ctx.closePath();
    };

    Huviz.prototype.draw_pie = function(cx, cy, radius, strclr, filclrs, special_focus) {
      var arc, end_angle, filclr, j, len1, num, results1, start_angle;
      num = filclrs.length;
      if (!num) {
        throw new Error("no colors specified");
      }
      if (num === 1) {
        this.draw_circle(cx, cy, radius, strclr, filclrs[0], false, false, special_focus);
        return;
      }
      arc = tau / num;
      start_angle = 0;
      results1 = [];
      for (j = 0, len1 = filclrs.length; j < len1; j++) {
        filclr = filclrs[j];
        end_angle = start_angle + arc;
        this.draw_circle(cx, cy, radius, strclr, filclr, end_angle, start_angle, special_focus);
        results1.push(start_angle = start_angle + arc);
      }
      return results1;
    };

    Huviz.prototype.draw_line = function(x1, y1, x2, y2, clr) {
      this.ctx.strokeStyle = clr || 'red';
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.closePath();
      return this.ctx.stroke();
    };

    Huviz.prototype.draw_curvedline = function(x1, y1, x2, y2, sway_inc, clr, num_contexts, line_width, edge, directional_edge) {
      var a_l, a_w, ang, arr_side, arrow_base_x, arrow_base_y, arrow_color, arw_angl, check_range, ctrl_angle, flip, hd_angl, node_radius, orig_angle, pdist, pnt_x, pnt_y, sway, tip_x, tip_y, xctrl, xhndl, xmid, xo1, xo2, yctrl, yhndl, ymid, yo1, yo2;
      pdist = distance([x1, y1], [x2, y2]);
      sway = this.swayfrac * sway_inc * pdist;
      if (pdist < this.line_length_min) {
        return;
      }
      if (sway === 0) {
        return;
      }
      orig_angle = Math.atan2(x2 - x1, y2 - y1);
      ctrl_angle = orig_angle + (Math.PI / 2);
      ang = ctrl_angle;
      ang = orig_angle;
      check_range = function(val, name) {
        var range;
        window.maxes = window.maxes || {};
        window.ranges = window.ranges || {};
        range = window.ranges[name] || {
          max: -Infinity,
          min: Infinity
        };
        range.max = Math.max(range.max, val);
        return range.min = Math.min(range.min, val);
      };
      xmid = x1 + (x2 - x1) / 2;
      ymid = y1 + (y2 - y1) / 2;
      xctrl = xmid + Math.sin(ctrl_angle) * sway;
      yctrl = ymid + Math.cos(ctrl_angle) * sway;
      this.ctx.strokeStyle = clr || 'red';
      this.ctx.beginPath();
      this.ctx.lineWidth = line_width;
      this.ctx.moveTo(x1, y1);
      this.ctx.quadraticCurveTo(xctrl, yctrl, x2, y2);
      this.ctx.stroke();
      xhndl = xmid + Math.sin(ctrl_angle) * (sway / 2);
      yhndl = ymid + Math.cos(ctrl_angle) * (sway / 2);
      edge.handle = {
        x: xhndl,
        y: yhndl
      };
      this.draw_circle(xhndl, yhndl, line_width / 2, clr);
      if (directional_edge === "forward") {
        tip_x = x2;
        tip_y = y2;
      } else {
        tip_x = x1;
        tip_y = y1;
      }
      if (this.arrows_chosen) {
        a_l = 8;
        a_w = 2;
        arr_side = Math.sqrt(a_l * a_l + a_w * a_w);
        arrow_color = clr;
        node_radius = this.calc_node_radius(edge.target);
        arw_angl = Math.atan((yctrl - y2) / (xctrl - x2));
        hd_angl = Math.tan(a_w / a_l);
        if (xctrl < x2) {
          flip = -1;
        } else {
          flip = 1;
        }
        pnt_x = x2 + flip * node_radius * Math.cos(arw_angl);
        pnt_y = y2 + flip * node_radius * Math.sin(arw_angl);
        arrow_base_x = x2 + flip * (node_radius + a_l) * Math.cos(arw_angl);
        arrow_base_y = y2 + flip * (node_radius + a_l) * Math.sin(arw_angl);
        xo1 = pnt_x + flip * arr_side * Math.cos(arw_angl + hd_angl);
        yo1 = pnt_y + flip * arr_side * Math.sin(arw_angl + hd_angl);
        xo2 = pnt_x + flip * arr_side * Math.cos(arw_angl - hd_angl);
        yo2 = pnt_y + flip * arr_side * Math.sin(arw_angl - hd_angl);
        return this.draw_triangle(pnt_x, pnt_y, arrow_color, xo1, yo1, xo2, yo2);
      }
    };

    Huviz.prototype.draw_self_edge_circle = function(cx, cy, strclr, length, line_width, e, arw_angle) {
      var a_l, a_w, arr_side, arrow_adjust, arrow_base_x, arrow_base_y, arrow_color, arw_angl, arw_radius, cx2, cy2, end_angle, filclr, flip, hd_angl, node_radius, pnt_x, pnt_y, special_focus, start_angle, x2, x_arrow_offset, x_offset, xo1, xo2, y2, y_arrow_offset, y_offset, yo1, yo2;
      node_radius = this.calc_node_radius(e.source);
      arw_radius = node_radius * 5;
      x_offset = Math.cos(arw_angle) * arw_radius;
      y_offset = Math.sin(arw_angle) * arw_radius;
      cx2 = cx + x_offset;
      cy2 = cy + y_offset;
      strclr = e.color;
      filclr = false;
      start_angle = 0;
      end_angle = 0;
      special_focus = false;
      this.draw_circle(cx2, cy2, arw_radius, strclr, filclr, start_angle, end_angle, special_focus);
      x_arrow_offset = Math.cos(arw_angle) * this.calc_node_radius(e.source);
      y_arrow_offset = Math.sin(arw_angle) * this.calc_node_radius(e.source);
      a_l = 8;
      a_w = 2;
      arr_side = Math.sqrt(a_l * a_l + a_w * a_w);
      arrow_color = e.color;
      node_radius = this.calc_node_radius(e.source);
      arw_angl = arw_angle + 1;
      x2 = cx;
      y2 = cy;
      hd_angl = Math.tan(a_w / a_l);
      flip = 1;
      arw_angl = arw_angle + 1.45;
      arrow_adjust = Math.atan(a_l / arw_radius);
      pnt_x = x2 + flip * node_radius * Math.cos(arw_angl);
      pnt_y = y2 + flip * node_radius * Math.sin(arw_angl);
      arrow_base_x = x2 + flip * (node_radius + a_l) * Math.cos(arw_angl);
      arrow_base_y = y2 + flip * (node_radius + a_l) * Math.sin(arw_angl);
      xo1 = pnt_x + flip * arr_side * Math.cos(arw_angl + hd_angl - arrow_adjust);
      yo1 = pnt_y + flip * arr_side * Math.sin(arw_angl + hd_angl - arrow_adjust);
      xo2 = pnt_x + flip * arr_side * Math.cos(arw_angl - hd_angl - arrow_adjust);
      yo2 = pnt_y + flip * arr_side * Math.sin(arw_angl - hd_angl - arrow_adjust);
      this.draw_triangle(pnt_x, pnt_y, arrow_color, xo1, yo1, xo2, yo2);
      e.handle = {
        x: cx2 + x_offset,
        y: cy2 + y_offset
      };
      return this.draw_circle(e.handle.x, e.handle.y, line_width / 2, arrow_color);
    };

    Huviz.prototype.draw_disconnect_dropzone = function() {
      this.ctx.save();
      this.ctx.lineWidth = this.graph_radius * 0.1;
      this.draw_circle(this.lariat_center[0], this.lariat_center[1], this.graph_radius, renderStyles.shelfColor);
      return this.ctx.restore();
    };

    Huviz.prototype.draw_discard_dropzone = function() {
      this.ctx.save();
      this.ctx.lineWidth = this.discard_radius * 0.1;
      this.draw_circle(this.discard_center[0], this.discard_center[1], this.discard_radius, "", renderStyles.discardColor);
      return this.ctx.restore();
    };

    Huviz.prototype.draw_dropzones = function() {
      if (this.dragging) {
        this.draw_disconnect_dropzone();
        return this.draw_discard_dropzone();
      }
    };

    Huviz.prototype.in_disconnect_dropzone = function(node) {
      var dist;
      dist = distance(node, this.lariat_center);
      return this.graph_radius * 0.9 < dist && this.graph_radius * 1.1 > dist;
    };

    Huviz.prototype.in_discard_dropzone = function(node) {
      var dist;
      dist = distance(node, this.discard_center);
      return this.discard_radius * 1.1 > dist;
    };

    Huviz.prototype.init_sets = function() {
      this.nodes = SortedSet().named('all').sort_on("id").labelled(this.human_term.all);
      this.nodes.docs = this.nodes.label + " nodes are in this set, regardless of state.";
      this.all_set = this.nodes;
      this.embryonic_set = SortedSet().named("embryo").sort_on("id").isFlag();
      this.embryonic_set.docs = "Nodes which are not yet complete are 'embryonic' and not yet in '" + this.all_set.label + "'.  Nodes need to have a class and a label to no longer be embryonic.";
      this.chosen_set = SortedSet().named("chosen").sort_on("id").isFlag().labelled(this.human_term.chosen).sub_of(this.all_set);
      this.chosen_set.docs = "Nodes which the user has specifically '" + this.chosen_set.label + "' by either dragging them into the graph from the surrounding green 'shelf'. '" + this.chosen_set.label + "' nodes can drag other nodes into the graph if the others are " + this.human_term.hidden + " or " + this.human_term.shelved + " but not if they are " + this.human_term.discarded + ".";
      this.chosen_set.cleanup_verb = 'shelve';
      this.selected_set = SortedSet().named("selected").sort_on("id").isFlag().labelled(this.human_term.selected).sub_of(this.all_set);
      this.selected_set.cleanup_verb = "unselect";
      this.selected_set.docs = "Nodes which have been '" + this.selected_set.label + "' using the class picker, ie which are highlighted and a little larger.";
      this.shelved_set = SortedSet().named("shelved").sort_on('name').case_insensitive_sort(true).labelled(this.human_term.shelved).sub_of(this.all_set).isState();
      this.shelved_set.docs = "Nodes which are '" + this.shelved_set.label + "' on the green surrounding 'shelf', either because they have been dragged there or released back to there when the node which pulled them into the graph was '" + this.human_term.unchosen + ".";
      this.discarded_set = SortedSet().named("discarded").labelled(this.human_term.discarded).sort_on('name').case_insensitive_sort(true).sub_of(this.all_set).isState();
      this.discarded_set.cleanup_verb = "shelve";
      this.discarded_set.docs = "Nodes which have been '" + this.discarded_set.label + "' by being dragged into the red 'discard bin' in the bottom right corner. '" + this.discarded_set.label + "' nodes are not pulled into the graph when nodes they are connected to become '" + this.chosen_set.label + "'.";
      this.hidden_set = SortedSet().named("hidden").sort_on("id").labelled(this.human_term.hidden).sub_of(this.all_set).isState();
      this.hidden_set.docs = "Nodes which are '" + this.hidden_set.label + "' but can be pulled into the graph by other nodes when those become '" + this.human_term.chosen + "'.";
      this.hidden_set.cleanup_verb = "shelve";
      this.graphed_set = SortedSet().named("graphed").sort_on("id").labelled(this.human_term.graphed).sub_of(this.all_set).isState();
      this.graphed_set.docs = "Nodes which are included in the central graph either by having been '" + this.human_term.chosen + "' themselves or which are pulled into the graph by those which have been.";
      this.graphed_set.cleanup_verb = "unchoose";
      this.wasChosen_set = SortedSet().named("wasChosen").sort_on("id").labelled("Was Chosen").isFlag();
      this.wasChosen_set.docs = "Nodes are marked wasChosen by wander__atFirst for later comparison with nowChosen.";
      this.nowChosen_set = SortedSet().named("nowChosen").sort_on("id").labelled("Now Graphed").isFlag();
      this.nowChosen_set.docs = "Nodes pulled in by @choose() are marked nowChosen for later comparison against wasChosen by wander__atLast.";
      this.pinned_set = SortedSet().named('fixed').sort_on("id").labelled(this.human_term.fixed).sub_of(this.all_set).isFlag();
      this.pinned_set.docs = "Nodes which are '" + this.pinned_set.label + "' to the canvas as a result of being dragged and dropped while already being '" + this.human_term.graphed + "'. " + this.pinned_set.label + " nodes can be " + this.human_term.unpinned + " by dragging them from their " + this.pinned_set.label + " location.";
      this.pinned_set.cleanup_verb = "unpin";
      this.labelled_set = SortedSet().named("labelled").sort_on("id").labelled(this.human_term.labelled).isFlag().sub_of(this.all_set);
      this.labelled_set.docs = "Nodes which have their labels permanently shown.";
      this.labelled_set.cleanup_verb = "unlabel";
      this.nameless_set = SortedSet().named("nameless").sort_on("id").labelled(this.human_term.nameless).sub_of(this.all_set).isFlag('nameless');
      this.nameless_set.docs = "Nodes for which no name is yet known";
      this.links_set = SortedSet().named("shown").sort_on("id").isFlag();
      this.links_set.docs = "Links which are shown.";
      this.walked_set = SortedSet().named("walked").isFlag().labelled(this.human_term.walked).sub_of(this.chosen_set).sort_on('walkedIdx0');
      this.walked_set.docs = "Nodes in order of their walkedness";
      this.suppressed_set = SortedSet().named("suppressed").sort_on("id").labelled(this.human_term.suppressed).sub_of(this.all_set).isState();
      this.suppressed_set.docs = "Nodes which are '" + this.suppressed_set.label + "' by a suppression algorithm such as Suppress Annotation Entities.  Suppression is mutually exclusive with Shelved, Discarded, Graphed and Hidden.";
      this.suppressed_set.cleanup_verb = "shelve";
      this.predicate_set = SortedSet().named("predicate").isFlag().sort_on("id");
      this.context_set = SortedSet().named("context").isFlag().sort_on("id");
      this.context_set.docs = "The set of quad contexts.";
      return this.selectable_sets = {
        all_set: this.all_set,
        chosen_set: this.chosen_set,
        selected_set: this.selected_set,
        shelved_set: this.shelved_set,
        discarded_set: this.discarded_set,
        hidden_set: this.hidden_set,
        graphed_set: this.graphed_set,
        labelled_set: this.labelled_set,
        pinned_set: this.pinned_set,
        nameless_set: this.nameless_set,
        walked_set: this.walked_set,
        suppressed_set: this.suppressed_set
      };
    };

    Huviz.prototype.get_set_by_id = function(setId) {
      setId = setId === 'fixed' && 'pinned' || setId;
      return this[setId + '_set'];
    };

    Huviz.prototype.update_all_counts = function() {
      return this.update_set_counts();
    };

    Huviz.prototype.update_predicate_counts = function() {
      var a_set, j, len1, name, ref, results1;
      console.warn('the unproven method update_predicate_counts() has just been called');
      ref = this.predicate_set;
      results1 = [];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        a_set = ref[j];
        name = a_set.lid;
        results1.push(this.gclui.on_predicate_count_update(name, a_set.length));
      }
      return results1;
    };

    Huviz.prototype.update_set_counts = function() {
      var a_set, name, ref, results1;
      ref = this.selectable_sets;
      results1 = [];
      for (name in ref) {
        a_set = ref[name];
        results1.push(this.gclui.on_set_count_update(name, a_set.length));
      }
      return results1;
    };

    Huviz.prototype.create_taxonomy = function() {
      return this.taxonomy = {};
    };

    Huviz.prototype.summarize_taxonomy = function() {
      var id, out, ref, taxon, tree;
      out = "";
      tree = {};
      ref = this.taxonomy;
      for (id in ref) {
        taxon = ref[id];
        out += id + ": " + taxon.state + "\n";
        tree[id] = taxon.state;
      }
      return tree;
    };

    Huviz.prototype.regenerate_english = function() {
      var root;
      root = 'Thing';
      if (this.taxonomy[root] != null) {
        this.taxonomy[root].update_english();
      } else {
        console.log("not regenerating english because no taxonomy[" + root + "]");
      }
    };

    Huviz.prototype.get_or_create_taxon = function(taxon_url) {
      var label, parent, parent_lid, taxon, taxon_id;
      taxon_id = taxon_url;
      if (this.taxonomy[taxon_id] == null) {
        taxon = new Taxon(taxon_id);
        this.taxonomy[taxon_id] = taxon;
        parent_lid = this.ontology.subClassOf[taxon_id] || this.HHH[taxon_id] || 'Thing';
        if (parent_lid != null) {
          parent = this.get_or_create_taxon(parent_lid);
          taxon.register_superclass(parent);
          label = this.ontology.label[taxon_id];
        }
        this.gclui.add_taxon(taxon_id, parent_lid, label, taxon);
      }
      return this.taxonomy[taxon_id];
    };

    Huviz.prototype.update_labels_on_pickers = function() {
      var ref, results1, term_id, term_label;
      ref = this.ontology.label;
      results1 = [];
      for (term_id in ref) {
        term_label = ref[term_id];
        if (this.gclui.taxon_picker.id_to_name[term_id] != null) {
          this.gclui.taxon_picker.set_name_for_id(term_label, term_id);
        }
        if (this.gclui.predicate_picker.id_to_name[term_id] != null) {
          results1.push(this.gclui.predicate_picker.set_name_for_id(term_label, term_id));
        } else {
          results1.push(void 0);
        }
      }
      return results1;
    };

    Huviz.prototype.toggle_taxon = function(id, hier, callback) {
      var ref;
      if (callback != null) {
        this.gclui.set_taxa_click_storm_callback(callback);
      }
      hier = (ref = hier != null) != null ? ref : {
        hier: true
      };
      if (hier) {
        this.gclui.taxon_picker.collapse_by_id(id);
      }
      this.topJQElem.find("#" + id).trigger("click");
      if (hier) {
        return this.gclui.taxon_picker.expand_by_id(id);
      }
    };

    Huviz.prototype["do"] = function(args) {
      var cmd;
      cmd = new gcl.GraphCommand(this, args);
      return this.gclc.run(cmd);
    };

    Huviz.prototype.reset_data = function() {
      if (this.discarded_set.length) {
        this["do"]({
          verbs: ['shelve'],
          sets: [this.discarded_set.id]
        });
      }
      if (this.graphed_set.length) {
        this["do"]({
          verbs: ['shelve'],
          sets: [this.graphed_set.id]
        });
      }
      if (this.hidden_set.length) {
        this["do"]({
          verbs: ['shelve'],
          sets: [this.hidden_set.id]
        });
      }
      if (this.selected_set.length) {
        this["do"]({
          verbs: ['unselect'],
          sets: [this.selected_set.id]
        });
      }
      this.gclui.reset_editor();
      return this.gclui.select_the_initial_set();
    };

    Huviz.prototype.perform_tasks_after_dataset_loaded = function() {
      this.gclui.select_the_initial_set();
      if (!this.args.skip_discover_names) {
        return this.discover_names();
      }
    };

    Huviz.prototype.reset_graph = function() {
      this.G = {};
      this.init_sets();
      this.init_gclc();
      this.init_editc_or_not();
      this.indexed_dbservice();
      this.init_indexddbstorage();
      this.force.nodes(this.nodes);
      this.force.links(this.links_set);
      if (!this.args.skip_log_tick) {
        console.log("Tick in @force.nodes() reset_graph");
      }
      d3.select(this.args.huviz_top_sel + " .link").remove();
      d3.select(this.args.huviz_top_sel + " .node").remove();
      d3.select(this.args.huviz_top_sel + " .lariat").remove();
      this.node = this.svg.selectAll(this.args.huviz_top_sel + " .node");
      this.link = this.svg.selectAll(this.args.huviz_top_sel + " .link");
      this.lariat = this.svg.selectAll(this.args.huviz_top_sel + " .lariat");
      this.link = this.link.data(this.links_set);
      this.link.exit().remove();
      this.node = this.node.data(this.nodes);
      this.node.exit().remove();
      this.force.start();
      if (!this.args.skip_log_tick) {
        return console.log("Tick in @force.start() reset_graph2");
      }
    };

    Huviz.prototype.set_node_radius_policy = function(evt) {
      var f;
      f = $("select#node_radius_policy option:selected").val();
      if (!f) {
        return;
      }
      if (typeof f === typeof "str") {
        return this.node_radius_policy = node_radius_policies[f];
      } else if (typeof f === typeof this.set_node_radius_policy) {
        return this.node_radius_policy = f;
      }
    };

    Huviz.prototype.DEPRECATED_init_node_radius_policy = function() {
      var policy_box, policy_name, policy_picker, results1;
      policy_box = d3.select("#huvis_controls").append("div", "node_radius_policy_box");
      policy_picker = policy_box.append("select", "node_radius_policy");
      policy_picker.on("change", set_node_radius_policy);
      results1 = [];
      for (policy_name in node_radius_policies) {
        results1.push(policy_picker.append("option").attr("value", policy_name).text(policy_name));
      }
      return results1;
    };

    Huviz.prototype.calc_node_radius = function(d) {
      var diff_adjustment, final_adjustment, total_links;
      total_links = d.links_to.length + d.links_from.length;
      diff_adjustment = 10 * (total_links / (total_links + 9));
      final_adjustment = this.node_diff * (diff_adjustment - 1);
      if (d.radius != null) {
        return d.radius;
      }
      return this.node_radius * ((d.selected == null) && 1 || this.selected_mag) + final_adjustment;
    };

    Huviz.prototype.names_in_edges = function(set) {
      var out;
      out = [];
      set.forEach(function(itm, i) {
        return out.push(itm.source.name + " ---> " + itm.target.name);
      });
      return out;
    };

    Huviz.prototype.dump_details = function(node) {
      if (!window.dump_details) {
        return;
      }
      console.log("=================================================");
      console.log(node.name);
      console.log("  x,y:", node.x, node.y);
      try {
        console.log("  state:", node.state.state_name, node.state);
      } catch (_error) {}
      console.log("  chosen:", node.chosen);
      console.log("  fisheye:", node.fisheye);
      console.log("  fixed:", node.fixed);
      console.log("  links_shown:", node.links_shown.length, this.names_in_edges(node.links_shown));
      console.log("  links_to:", node.links_to.length, this.names_in_edges(node.links_to));
      console.log("  links_from:", node.links_from.length, this.names_in_edges(node.links_from));
      console.log("  showing_links:", node.showing_links);
      return console.log("  in_sets:", node.in_sets);
    };

    Huviz.prototype.is_node_visible = function(node) {
      return !this.hidden_set.has(node);
    };

    Huviz.prototype.get_visible_subset = function(super_set) {
      var j, len1, node, retlist;
      if (super_set == null) {
        super_set = this.all_set;
      }
      retlist = [];
      for (j = 0, len1 = super_set.length; j < len1; j++) {
        node = super_set[j];
        if (this.is_node_visible(node)) {
          retlist.push(node);
        }
      }
      return super_set;
    };

    Huviz.prototype.WIP_find_node_or_edge_closest_to_pointer_using_quadtrees = function() {
      var data, found, mx, my, qNodes, quadtree, ref;
      quadtree = d3.geom.quadtree().extent([[-1, -1], [this.width + 1, this.height + 1]]).addAll(this.get_visible_subset());
      ref = this.last_mouse_pos, mx = ref[0], my = ref[1];
      qNodes = function(qTree) {
        var ret;
        ret = [];
        return qTree.visit(function(node, x0, y0, x1, y1) {
          node.x0 = x0;
          node.y0 = y0;
          node.x1 = x1;
          node.y1 = y1;
          return ret.push(node);
        });
      };
      data = qNodes(quadtree);
      found = quadtree.find(mx, my);
      throw new Error("under construction");
    };

    Huviz.prototype.find_node_or_edge_closest_to_pointer = function() {
      var closest_dist, closest_point, focus_threshold, new_focused_edge, new_focused_idx, new_focused_node, seeking;
      this.highwater('find_node_or_edge', true);
      new_focused_node = null;
      new_focused_edge = null;
      new_focused_idx = null;
      focus_threshold = this.focus_threshold;
      closest_dist = this.width;
      closest_point = null;
      seeking = null;
      if (this.dragging) {
        if (!this.editui.is_state('connecting')) {
          return;
        }
        seeking = "object_node";
      } else {
        seeking = "focused_node";
      }
      this.all_set.forEach((function(_this) {
        return function(d, i) {
          var n_dist;
          n_dist = distance(d.fisheye || d, _this.last_mouse_pos);
          if (n_dist < closest_dist) {
            closest_dist = n_dist;
            closest_point = d.fisheye || d;
          }
          if (!(seeking === 'object_node' && _this.dragging && _this.dragging.id === d.id)) {
            if (n_dist <= focus_threshold) {
              new_focused_node = d;
              focus_threshold = n_dist;
              return new_focused_idx = i;
            }
          }
        };
      })(this));
      this.links_set.forEach((function(_this) {
        return function(e, i) {
          var e_dist, new_focused_edge_idx;
          if (e.handle != null) {
            e_dist = distance(e.handle, _this.last_mouse_pos);
            if (e_dist < closest_dist) {
              closest_dist = e_dist;
              closest_point = e.handle;
            }
            if (e_dist <= focus_threshold) {
              new_focused_edge = e;
              focus_threshold = e_dist;
              return new_focused_edge_idx = i;
            }
          }
        };
      })(this));
      if (new_focused_edge) {
        new_focused_node = null;
        seeking = null;
      }
      if (closest_point) {
        if (this.draw_circle_around_focused) {
          this.draw_circle(closest_point.x, closest_point.y, this.node_radius * 3, "red");
        }
      }
      this.set_focused_node(new_focused_node);
      this.set_focused_edge(new_focused_edge);
      if (seeking === 'object_node') {
        this.editui.set_object_node(new_focused_node);
      }
      this.highwater('find_node_or_edge');
    };

    Huviz.prototype.highwater_incr = function(id) {
      var hwm;
      if (this.highwatermarks == null) {
        this.highwatermarks = {};
      }
      hwm = this.highwatermarks;
      return hwm[id] = ((hwm[id] != null) && hwm[id] || 0) + 1;
    };

    Huviz.prototype.highwater = function(id, start) {
      var diff, hwm;
      if (this.highwatermarks == null) {
        this.highwatermarks = {};
      }
      hwm = this.highwatermarks;
      if (start != null) {
        return hwm[id + '__'] = performance.now();
      } else {
        diff = performance.now() - hwm[id + '__'];
        if (hwm[id] == null) {
          hwm[id] = diff;
        }
        if (hwm[id] < diff) {
          return hwm[id] = diff;
        }
      }
    };

    Huviz.prototype.DEPRECATED_showing_links_to_cursor_map = {
      all: 'not-allowed',
      some: 'all-scroll',
      none: 'pointer'
    };

    Huviz.prototype.set_focused_node = function(node) {
      var svg_node;
      if (this.focused_node === node) {
        return;
      }
      if (this.focused_node) {
        if (this.use_svg) {
          d3.select(".focused_node").classed("focused_node", false);
        }
        this.focused_node.focused_node = false;
      }
      if (node) {
        if (this.use_svg) {
          svg_node = node[0][new_focused_idx];
          d3.select(svg_node).classed("focused_node", true);
        }
        node.focused_node = true;
      }
      this.focused_node = node;
      if (this.focused_node) {
        return this.gclui.engage_transient_verb_if_needed("select");
      } else {
        return this.gclui.disengage_transient_verb_if_needed();
      }
    };

    Huviz.prototype.set_focused_edge = function(new_focused_edge) {
      if (this.proposed_edge && this.focused_edge) {
        return;
      }
      if (this.focused_edge !== new_focused_edge) {
        if (this.focused_edge != null) {
          this.focused_edge.focused = false;
          delete this.focused_edge.source.focused_edge;
          delete this.focused_edge.target.focused_edge;
        }
        if (new_focused_edge != null) {
          new_focused_edge.focused = true;
          new_focused_edge.source.focused_edge = true;
          new_focused_edge.target.focused_edge = true;
        }
        this.focused_edge = new_focused_edge;
        if (!this.use_fancy_cursor) {
          return;
        }
        if (this.focused_edge != null) {
          if (this.editui.is_state('connecting')) {
            this.text_cursor.pause("", "edit this edge");
          } else {
            this.text_cursor.pause("", "show edge sources");
          }
        } else {
          this.text_cursor["continue"]();
        }
      }
    };

    Huviz.proposed_edge = null;

    Huviz.prototype.set_proposed_edge = function(new_proposed_edge) {
      console.log("Setting proposed edge...", new_proposed_edge);
      if (this.proposed_edge) {
        delete this.proposed_edge.proposed;
      }
      if (new_proposed_edge) {
        new_proposed_edge.proposed = true;
      }
      this.proposed_edge = new_proposed_edge;
      return this.set_focused_edge(new_proposed_edge);
    };

    Huviz.prototype.install_update_pointer_togglers = function() {
      console.warn("the update_pointer_togglers are being called too often");
      d3.select("#huvis_controls").on("mouseover", (function(_this) {
        return function() {
          _this.update_pointer = false;
          return _this.text_cursor.pause("default");
        };
      })(this));
      return d3.select("#huvis_controls").on("mouseout", (function(_this) {
        return function() {
          _this.update_pointer = true;
          return _this.text_cursor["continue"]();
        };
      })(this));
    };

    Huviz.prototype.DEPRECATED_adjust_cursor = function() {
      var next;
      if (this.focused_node) {
        next = this.showing_links_to_cursor_map[this.focused_node.showing_links];
      } else {
        next = 'default';
      }
      return this.text_cursor.set_cursor(next);
    };

    Huviz.prototype.set_cursor_for_verbs = function(verbs) {
      var text, verb;
      if (!this.use_fancy_cursor) {
        return;
      }
      text = [
        (function() {
          var j, len1, results1;
          results1 = [];
          for (j = 0, len1 = verbs.length; j < len1; j++) {
            verb = verbs[j];
            results1.push(this.human_term[verb]);
          }
          return results1;
        }).call(this)
      ].join("\n");
      if (this.last_cursor_text !== text) {
        this.text_cursor.set_text(text);
        return this.last_cursor_text = text;
      }
    };

    Huviz.prototype.auto_change_verb = function() {
      if (this.focused_node) {
        return this.gclui.auto_change_verb_if_warranted(this.focused_node);
      }
    };

    Huviz.prototype.get_focused_node_and_its_state = function() {
      var focused, msg, retval;
      focused = this.focused_node;
      if (!focused) {
        return;
      }
      retval = (focused.lid || '') + ' ';
      if (focused.state == null) {
        msg = retval + ' has no state!!! This is unpossible!!!! name:';
        if (focused._warnings == null) {
          focused._warnings = {};
        }
        if (!focused._warnings[msg]) {
          console.warn(msg, focused.name);
          focused._warnings[msg] = true;
        }
        return;
      }
      retval += focused.state.id;
      return retval;
    };

    Huviz.prototype.on_tick_change_current_command_if_warranted = function() {
      var nodes;
      if (this.prior_node_and_state !== this.get_focused_node_and_its_state()) {
        if (this.gclui.engaged_verbs.length) {
          nodes = (this.focused_node != null) && [this.focused_node] || [];
          return this.gclui.prepare_command(this.gclui.new_GraphCommand({
            verbs: this.gclui.engaged_verbs,
            subjects: nodes
          }));
        }
      }
    };

    Huviz.prototype.position_nodes_by_force = function() {
      var only_move_subject;
      only_move_subject = this.editui.is_state('connecting') && this.dragging && this.editui.subject_node;
      return this.nodes.forEach((function(_this) {
        return function(node, i) {
          return _this.reposition_node_by_force(node, only_move_subject);
        };
      })(this));
    };

    Huviz.prototype.reposition_node_by_force = function(node, only_move_subject) {
      if (this.dragging === node) {
        this.move_node_to_point(node, this.last_mouse_pos);
      }
      if (only_move_subject) {
        return;
      }
      if (!this.graphed_set.has(node)) {
        return;
      }
      return node.fisheye = this.fisheye(node);
    };

    Huviz.prototype.apply_fisheye = function() {
      this.links_set.forEach((function(_this) {
        return function(e) {
          if (!e.target.fisheye) {
            return e.target.fisheye = _this.fisheye(e.target);
          }
        };
      })(this));
      if (this.use_svg) {
        return link.attr("x1", function(d) {
          return d.source.fisheye.x;
        }).attr("y1", function(d) {
          return d.source.fisheye.y;
        }).attr("x2", function(d) {
          return d.target.fisheye.x;
        }).attr("y2", function(d) {
          return d.target.fisheye.y;
        });
      }
    };

    Huviz.prototype.shown_messages = [];

    Huviz.prototype.show_message_once = function(msg, alert_too) {
      if (this.shown_messages.indexOf(msg) === -1) {
        this.shown_messages.push(msg);
        console.log(msg);
        if (alert_too) {
          return alert(msg);
        }
      }
    };

    Huviz.prototype.draw_edges_from = function(node) {
      var arw_angle, draw_n_n, e, edge_width, edges_between, j, len1, line_width, msg, n_n, num_edges, ref, results1, sway, x2, y2;
      num_edges = node.links_to.length;
      if (!num_edges) {
        return;
      }
      draw_n_n = {};
      ref = node.links_shown;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        e = ref[j];
        msg = "";
        if (e.source.embryo) {
          msg += "source " + e.source.name + " is embryo " + e.source.id + "; ";
          msg += e.id + " ";
        }
        if (e.target.embryo) {
          msg += "target " + e.target.name + " is embryo " + e.target.id;
        }
        if (msg !== "") {
          continue;
        }
        n_n = e.source.lid + " " + e.target.lid;
        if (draw_n_n[n_n] == null) {
          draw_n_n[n_n] = [];
        }
        draw_n_n[n_n].push(e);
      }
      edge_width = this.edge_width;
      results1 = [];
      for (n_n in draw_n_n) {
        edges_between = draw_n_n[n_n];
        sway = 1;
        results1.push((function() {
          var len2, p, results2;
          results2 = [];
          for (p = 0, len2 = edges_between.length; p < len2; p++) {
            e = edges_between[p];
            if ((e.focused != null) && e.focused) {
              line_width = this.edge_width * this.peeking_line_thicker;
            } else {
              line_width = edge_width;
            }
            line_width = line_width + (this.line_edge_weight * e.contexts.length);
            if ((e.source.fisheye.x === e.target.fisheye.x) && (e.source.fisheye.y === e.target.fisheye.y)) {
              x2 = this.width / 2;
              y2 = this.height / 2;
              arw_angle = Math.atan((e.source.fisheye.y - y2) / (e.source.fisheye.x - x2));
              if (x2 > e.source.fisheye.x) {
                arw_angle = arw_angle + 3;
              }
              this.draw_self_edge_circle(e.source.fisheye.x, e.source.fisheye.y, e.color, e.contexts.length, line_width, e, arw_angle);
            } else {
              this.draw_curvedline(e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, sway, e.color, e.contexts.length, line_width, e);
            }
            if (node.walked) {
              this.draw_walk_edge_from(node, e, sway);
            }
            results2.push(sway++);
          }
          return results2;
        }).call(this));
      }
      return results1;
    };

    Huviz.prototype.draw_walk_edge_from = function(node, edge, sway) {
      var directional_edge, e;
      if (this.edgeIsOnWalkedPath(edge)) {
        directional_edge = (edge.source.walkedIdx0 > edge.source.walkedIdx0) && 'forward' || 'backward';
        e = edge;
        if (directional_edge) {
          return this.draw_curvedline(e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, sway, "black", e.contexts.length, 1, e, directional_edge);
        }
      }
    };

    Huviz.prototype.draw_edges = function() {
      var dx, dy;
      if (!this.show_edges) {
        return;
      }
      if (this.use_canvas) {
        this.graphed_set.forEach((function(_this) {
          return function(node, i) {
            return _this.draw_edges_from(node);
          };
        })(this));
      }
      if (this.use_webgl) {
        dx = this.width * xmult;
        dy = this.height * ymult;
        dx = -1 * this.cx;
        dy = -1 * this.cy;
        this.links_set.forEach((function(_this) {
          return function(e) {
            var l;
            if (!e.gl) {
              _this.add_webgl_line(e);
            }
            l = e.gl;
            _this.mv_line(l, e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y);
            return _this.dump_line(l);
          };
        })(this));
      }
      if (this.use_webgl && false) {
        return this.links_set.forEach((function(_this) {
          return function(e, i) {
            var v;
            if (!e.gl) {
              return;
            }
            v = e.gl.geometry.vertices;
            v[0].x = e.source.fisheye.x;
            v[0].y = e.source.fisheye.y;
            v[1].x = e.target.fisheye.x;
            return v[1].y = e.target.fisheye.y;
          };
        })(this));
      }
    };

    Huviz.prototype.draw_nodes_in_set = function(set, radius, center) {
      var cx, cy, num;
      cx = center[0];
      cy = center[1];
      num = set.length;
      return set.forEach((function(_this) {
        return function(node, i) {
          var filclrs, rad, start;
          start = 1 - nodeOrderAngle;
          if (_this.display_shelf_clockwise) {
            rad = tau * (start - i / num);
          } else {
            rad = tau * (i / num + start);
          }
          node.rad = rad;
          node.x = cx + Math.sin(rad) * radius;
          node.y = cy + Math.cos(rad) * radius;
          node.fisheye = _this.fisheye(node);
          if (_this.use_canvas) {
            filclrs = _this.get_node_color_or_color_list(node, renderStyles.nodeHighlightOutline);
            _this.draw_pie(node.fisheye.x, node.fisheye.y, _this.calc_node_radius(node), node.color || "yellow", filclrs);
          }
          if (_this.use_webgl) {
            return _this.mv_node(node.gl, node.fisheye.x, node.fisheye.y);
          }
        };
      })(this));
    };

    Huviz.prototype.draw_discards = function() {
      return this.draw_nodes_in_set(this.discarded_set, this.discard_radius, this.discard_center);
    };

    Huviz.prototype.draw_shelf = function() {
      return this.draw_nodes_in_set(this.shelved_set, this.graph_radius, this.lariat_center);
    };

    Huviz.prototype.draw_nodes = function() {
      if (this.use_svg) {
        node.attr("transform", function(d, i) {
          return "translate(" + d.fisheye.x + "," + d.fisheye.y + ")";
        }).attr("r", calc_node_radius);
      }
      if (this.use_canvas || this.use_webgl) {
        return this.graphed_set.forEach((function(_this) {
          return function(d, i) {
            var e, filclr, imageData, imgUrl, node_radius, pill_height, pill_width, rndng, special_focus, stroke_color, x, y;
            d.fisheye = _this.fisheye(d);
            if (_this.use_canvas) {
              node_radius = _this.calc_node_radius(d);
              stroke_color = d.color || 'yellow';
              if (d.chosen != null) {
                stroke_color = renderStyles.nodeHighlightOutline;
                special_focus = !!d.walked;
              }
              if (_this.display_labels_as === 'pills') {
                pill_width = node_radius * 2;
                pill_height = node_radius * 2;
                filclr = _this.get_node_color_or_color_list(d);
                rndng = 1;
                x = d.fisheye.x;
                y = d.fisheye.y;
                _this.rounded_rectangle(x, y, pill_width, pill_height, rndng, stroke_color, filclr);
              } else if (_this.show_images_in_nodes && (imgUrl = d.__thumbnail || _this.args.default_node_url)) {
                try {
                  imageData = _this.get_or_create_round_img(imgUrl);
                } catch (_error) {
                  e = _error;
                  console.error(e);
                }
                _this.draw_round_img(d.fisheye.x, d.fisheye.y, node_radius, stroke_color, filclr, special_focus, imageData, imgUrl);
              } else {
                _this.draw_pie(d.fisheye.x, d.fisheye.y, node_radius, stroke_color, _this.get_node_color_or_color_list(d), special_focus);
              }
            }
            if (_this.use_webgl) {
              return _this.mv_node(d.gl, d.fisheye.x, d.fisheye.y);
            }
          };
        })(this));
      }
    };

    Huviz.prototype.get_node_color_or_color_list = function(n, default_color) {
      if (default_color == null) {
        default_color = 'black';
      }
      if (this.color_nodes_as_pies && n._types && n._types.length > 1) {
        this.recolor_node(n, default_color);
        return n._colors;
      }
      return [n.color || default_color];
    };

    Huviz.prototype.get_or_create_round_img = function(url) {
      var ctx, display_image_size, img, imgId, origImage, roundImage, round_image_maker;
      if (this.round_img_cache == null) {
        this.round_img_cache = {};
      }
      display_image_size = 128;
      if (!(img = this.round_img_cache[url])) {
        imgId = this.unique_id('round_img_');
        roundImage = document.createElement('img');
        round_image_maker = document.createElement("CANVAS");
        round_image_maker.width = display_image_size;
        round_image_maker.height = display_image_size;
        ctx = round_image_maker.getContext("2d");
        origImage = new Image();
        origImage.crossOrigin = "Anonymous";
        origImage.src = url;
        origImage.onload = function() {
          var h, w, x, y;
          ctx.beginPath();
          ctx.arc(display_image_size / 2, display_image_size / 2, display_image_size / 2, 0, 2 * Math.PI, false);
          ctx.clip();
          ctx.fillStyle = renderStyles.pageBg;
          ctx.fill();
          if (origImage.width > origImage.height) {
            w = Math.round(origImage.width * display_image_size / origImage.height);
            h = Math.round(display_image_size);
            x = -Math.round((w - h) / 2);
            y = 0;
          } else {
            w = Math.round(display_image_size);
            h = Math.round(origImage.height * display_image_size / origImage.width);
            x = 0;
            y = Math.round((w - h) / 2);
          }
          ctx.drawImage(origImage, x, y, w, h);
          return roundImage.src = round_image_maker.toDataURL();
        };
        this.round_img_cache[url] = roundImage;
      }
      return roundImage;
    };

    Huviz.prototype.get_label_attributes = function(d) {
      var browser_font_size, bubble_text, focused_font_size, font_size, height, i, j, label_length, label_measure, len1, line_height, line_length, ln_i, max_len, max_line_length, min_len, new_line_length, new_line_width, num_lines, num_lines_raw, padding, real_line_length, text, text_cuts, text_split, width, width_default, word, word_length;
      text = d.pretty_name;
      label_measure = this.ctx.measureText(text);
      browser_font_size = 12.8;
      focused_font_size = this.label_em * browser_font_size * this.focused_mag;
      padding = focused_font_size * 0.5;
      line_height = focused_font_size * 1.25;
      max_len = 300;
      min_len = 100;
      label_length = label_measure.width + 2 * padding;
      num_lines_raw = label_length / max_len;
      num_lines = (Math.floor(num_lines_raw)) + 1;
      if (num_lines > 1) {
        width_default = this.label_em * label_measure.width / num_lines;
      } else {
        width_default = max_len;
      }
      bubble_text = [];
      text_cuts = [];
      ln_i = 0;
      bubble_text[ln_i] = "";
      if (label_length < (width_default + 2 * padding)) {
        max_line_length = label_length - padding;
      } else {
        text_split = text.split(' ');
        max_line_length = 0;
        for (i = j = 0, len1 = text_split.length; j < len1; i = ++j) {
          word = text_split[i];
          word_length = this.ctx.measureText(word);
          line_length = this.ctx.measureText(bubble_text[ln_i]);
          new_line_length = word_length.width + line_length.width;
          if (new_line_length < width_default) {
            bubble_text[ln_i] = bubble_text[ln_i] + word + " ";
          } else {
            text_cuts[ln_i] = i;
            real_line_length = this.ctx.measureText(bubble_text[ln_i]);
            new_line_width = real_line_length.width;
            if (new_line_width > max_line_length) {
              max_line_length = real_line_length.width;
            }
            ln_i++;
            bubble_text[ln_i] = word + " ";
          }
        }
      }
      width = max_line_length + 2 * padding;
      height = (ln_i + 1) * line_height + 2 * padding;
      font_size = this.label_em;
      return d.bub_txt = [width, height, line_height, text_cuts, font_size];
    };

    Huviz.prototype.should_show_label = function(node) {
      return node.labelled || node.focused_edge || (this.label_graphed && node.state === this.graphed_set) || dist_lt(this.last_mouse_pos, node, this.label_show_range) || ((node.name != null) && node.name.match(this.search_regex));
    };

    Huviz.prototype.draw_labels = function() {
      var focused_font, focused_font_size, focused_pill_font, label_node, unfocused_font;
      if (this.use_svg) {
        label.attr("style", function(d) {
          if (this.should_show_label(d)) {
            return "";
          } else {
            return "display:none";
          }
        });
      }
      if (this.use_canvas || this.use_webgl) {
        focused_font_size = this.label_em * this.focused_mag;
        focused_font = focused_font_size + "em sans-serif";
        unfocused_font = this.label_em + "em sans-serif";
        focused_pill_font = this.label_em + "em sans-serif";
        label_node = (function(_this) {
          return function(node) {
            var adjust_x, adjust_y, alpha, ctx, cuts, fill, flip, flip_point, i, j, label, len1, line_height, node_font_size, outline, pill_height, pill_width, print_label, radians, radius, result, text, textAlign, text_split, x, y;
            if (!_this.should_show_label(node)) {
              return;
            }
            ctx = _this.ctx;
            ctx.textBaseline = "middle";
            if (node.focused_node || (node.focused_edge != null)) {
              label = _this.scroll_pretty_name(node);
              ctx.fillStyle = node.color;
              ctx.font = focused_font;
            } else {
              ctx.fillStyle = renderStyles.labelColor;
              ctx.font = unfocused_font;
            }
            if (node.fisheye == null) {
              return;
            }
            flip_point = _this.cx;
            if (_this.discarded_set.has(node)) {
              flip_point = _this.discard_center[0];
            } else if (_this.shelved_set.has(node)) {
              flip_point = _this.lariat_center[0];
            }
            if (!_this.graphed_set.has(node) && _this.draw_lariat_labels_rotated) {
              radians = node.rad;
              flip = node.fisheye.x < flip_point;
              textAlign = 'left';
              if (flip) {
                radians = radians - Math.PI;
                textAlign = 'right';
              }
              ctx.save();
              ctx.translate(node.fisheye.x, node.fisheye.y);
              ctx.rotate(-1 * radians + Math.PI / 2);
              ctx.textAlign = textAlign;
              if (_this.debug_shelf_angles_and_flipping) {
                if (flip) {
                  ctx.fillStyle = 'rgb(255,0,0)';
                }
                ctx.fillText(("  " + flip + "  " + radians).substr(0, 14), 0, 0);
              } else {
                ctx.fillText("  " + node.pretty_name + "  ", 0, 0);
              }
              return ctx.restore();
            } else {
              if (_this.display_labels_as === 'pills') {
                node_font_size = node.bub_txt[4];
                result = node_font_size !== _this.label_em;
                if (!node.bub_txt.length || result) {
                  _this.get_label_attributes(node);
                }
                line_height = node.bub_txt[2];
                adjust_x = node.bub_txt[0] / 2 - line_height / 2;
                adjust_y = node.bub_txt[1] / 2 - line_height;
                pill_width = node.bub_txt[0];
                pill_height = node.bub_txt[1];
                x = node.fisheye.x - pill_width / 2;
                y = node.fisheye.y - pill_height / 2;
                radius = 10 * _this.label_em;
                alpha = 1;
                outline = node.color;
                if (node.focused_node || (node.focused_edge != null)) {
                  ctx.lineWidth = 2;
                  fill = "#f2f2f2";
                } else {
                  ctx.lineWidth = 1;
                  fill = "white";
                }
                _this.rounded_rectangle(x, y, pill_width, pill_height, radius, fill, outline, alpha);
                ctx.fillStyle = "#000";
                text = node.pretty_name;
                text_split = text.split(' ');
                cuts = node.bub_txt[3];
                print_label = "";
                for (i = j = 0, len1 = text_split.length; j < len1; i = ++j) {
                  text = text_split[i];
                  if (cuts && indexOf.call(cuts, i) >= 0) {
                    ctx.fillText(print_label.slice(0, -1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
                    adjust_y = adjust_y - line_height;
                    print_label = text + " ";
                  } else {
                    print_label = print_label + text + " ";
                  }
                }
                if (print_label) {
                  return ctx.fillText(print_label.slice(0, -1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
                }
              } else if (_this.display_labels_as === 'nodeLabels') {
                if (node.labelElem == null) {
                  node.labelElem = _this.make_labelElem(node.pretty_name);
                }
                return node.labelElem.setAttribute('style', "top:" + node.fisheye.y + "px; left:" + node.fisheye.x + "px");
              } else {
                return ctx.fillText("  " + node.pretty_name + "  ", node.fisheye.x, node.fisheye.y);
              }
            }
          };
        })(this);
        this.graphed_set.forEach(label_node);
        this.shelved_set.forEach(label_node);
        this.discarded_set.forEach(label_node);
      }
    };

    Huviz.prototype.make_labelElem = function(text) {
      var div;
      div = this.addDivWithIdAndClasses(null, "nodeLabel", this.viscanvas_elem);
      div.innerHTML = text;
      return div;
    };

    Huviz.prototype.draw_focused_labels = function() {
      var ctx, default_text_for_empty_value, focused_font, focused_font_size, focused_pill_font, highlight_node;
      ctx = this.ctx;
      focused_font_size = this.label_em * this.focused_mag;
      focused_font = focused_font_size + "em sans-serif";
      focused_pill_font = this.label_em + "em sans-serif";
      default_text_for_empty_value = '“”';
      highlight_node = (function(_this) {
        return function(node) {
          var adjust_x, adjust_y, alpha, cart_label, cuts, fill, i, j, label, len1, line_height, node_font_size, outline, pill_height, pill_width, print_label, radius, result, text, text_split, x, y;
          if (node.focused_node || (node.focused_edge != null)) {
            if (_this.display_labels_as === 'pills') {
              ctx.font = focused_pill_font;
              node_font_size = node.bub_txt[4];
              result = node_font_size !== _this.label_em;
              if (!node.bub_txt.length || result) {
                _this.get_label_attributes(node);
              }
              line_height = node.bub_txt[2];
              adjust_x = node.bub_txt[0] / 2 - line_height / 2;
              adjust_y = node.bub_txt[1] / 2 - line_height;
              pill_width = node.bub_txt[0];
              pill_height = node.bub_txt[1];
              x = node.fisheye.x - pill_width / 2;
              y = node.fisheye.y - pill_height / 2;
              radius = 10 * _this.label_em;
              alpha = 1;
              outline = node.color;
              if (node.focused_node || (node.focused_edge != null)) {
                ctx.lineWidth = 2;
                fill = "#f2f2f2";
              } else {
                ctx.lineWidth = 1;
                fill = "white";
              }
              _this.rounded_rectangle(x, y, pill_width, pill_height, radius, fill, outline, alpha);
              ctx.fillStyle = "#000";
              text = node.pretty_name;
              text_split = text.split(' ');
              cuts = node.bub_txt[3];
              print_label = "";
              for (i = j = 0, len1 = text_split.length; j < len1; i = ++j) {
                text = text_split[i];
                if (cuts && indexOf.call(cuts, i) >= 0) {
                  ctx.fillText(print_label.slice(0, -1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
                  adjust_y = adjust_y - line_height;
                  print_label = text + " ";
                } else {
                  print_label = print_label + text + " ";
                }
              }
              if (print_label) {
                return ctx.fillText(print_label.slice(0, -1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
              }
            } else {
              label = _this.scroll_pretty_name(node);
              if (node.state.id === "graphed") {
                cart_label = node.pretty_name;
                ctx.measureText(cart_label).width;
                if (_this.paint_label_dropshadows) {
                  _this.paint_dropshadow(cart_label, focused_font_size, node.fisheye.x, node.fisheye.y);
                }
              }
              ctx.fillStyle = node.color;
              ctx.font = focused_font;
              return ctx.fillText("  " + node.pretty_name + "  ", node.fisheye.x, node.fisheye.y);
            }
          }
        };
      })(this);
      return this.graphed_set.forEach(highlight_node);
    };

    Huviz.prototype.clear_canvas = function() {
      return this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };

    Huviz.prototype.blank_screen = function() {
      if (this.use_canvas || this.use_webgl) {
        return this.clear_canvas();
      }
    };

    Huviz.prototype.should_position_by_packing = function() {
      return !this.show_edges;
    };

    Huviz.prototype.position_nodes_by_packing = function() {
      var i, n, q, results1;
      if (!this.should_position_by_packing()) {
        return;
      }
      q = d3.geom.quadtree(this.graphed_set);
      i = 0;
      n = this.graphed_set.length;
      results1 = [];
      while (++i < n) {
        results1.push(q.visit(this.position_node_by_packing(this.graphed_set[i])));
      }
      return results1;
    };

    Huviz.prototype.position_node_by_packing = function(node) {
      var nx1, nx2, ny1, ny2, r;
      r = node.radius + 16;
      nx1 = node.x - r;
      nx2 = node.x + r;
      ny1 = node.y - r;
      ny2 = node.y + r;
      return function(quad, x1, y1, x2, y2) {
        var l, x, y;
        if (quad.point && (quad.point !== node)) {
          x = node.x - quad.point.x;
          y = node.y - quad.point.y;
          l = Math.sqrt(x * x + y * y);
          r = node.radius + quad.point.radius;
          if (l < r) {
            l = (l(-r)) / 1 * .5;
            node.x -= x *= l;
            node.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      };
    };

    Huviz.prototype.administer_the_distinguished_node = function() {
      var dirty, emeritus, only_chosen, rightfully_distinguished, terminal_walked;
      dirty = false;
      only_chosen = null;
      rightfully_distinguished = null;
      if (this.chosen_set.length === 1) {
        only_chosen = this.chosen_set[0];
      }
      if (this.walked_set.length) {
        terminal_walked = this.walked_set[this.walked_set.length - 1];
      }
      rightfully_distinguished = terminal_walked || only_chosen;
      if (rightfully_distinguished != null) {
        if (rightfully_distinguished._is_distinguished != null) {
          return;
        }
        if (this.center_the_distinguished_node) {
          this.pin_at_center(rightfully_distinguished);
        }
      }
      emeritus = this.distinguish(rightfully_distinguished);
      if (emeritus != null) {
        if (this.center_the_distinguished_node) {
          this.unpin(emeritus);
        }
      }
      if (emeritus || rightfully_distinguished) {
        return this.update_set_counts();
      }
    };

    Huviz.prototype.tick = function(msg) {
      var base1, base2;
      if (this.ctx == null) {
        return;
      }
      if (typeof msg === 'string' && !this.args.skip_log_tick) {
        console.log(msg);
      }
      if (true) {
        if (this.clean_up_all_dirt_onceRunner != null) {
          if (this.clean_up_all_dirt_onceRunner.active) {
            if ((base1 = this.clean_up_all_dirt_onceRunner.stats).runTick == null) {
              base1.runTick = 0;
            }
            if ((base2 = this.clean_up_all_dirt_onceRunner.stats).skipTick == null) {
              base2.skipTick = 0;
            }
            this.clean_up_all_dirt_onceRunner.stats.skipTick++;
            return;
          } else {
            this.clean_up_all_dirt_onceRunner.stats.runTick++;
          }
        }
      }
      this.highwater('maxtick', true);
      this.ctx.lineWidth = this.edge_width;
      this.administer_the_distinguished_node();
      this.find_node_or_edge_closest_to_pointer();
      this.auto_change_verb();
      this.on_tick_change_current_command_if_warranted();
      this.blank_screen();
      this.draw_dropzones();
      this.fisheye.focus(this.last_mouse_pos);
      this.show_last_mouse_pos();
      if (this.should_position_by_packing()) {
        this.position_nodes_by_packing();
      } else {
        this.position_nodes_by_force();
      }
      this.apply_fisheye();
      this.draw_edges();
      this.draw_nodes();
      this.draw_shelf();
      this.draw_discards();
      this.draw_labels();
      this.draw_edge_labels();
      this.draw_focused_labels();
      this.pfm_count('tick');
      this.prior_node_and_state = this.get_focused_node_and_its_state();
      this.highwater('maxtick');
    };

    Huviz.prototype.rounded_rectangle = function(x, y, w, h, radius, fill, stroke, alpha) {
      var b, ctx, r;
      ctx = this.ctx;
      ctx.fillStyle = fill;
      r = x + w;
      b = y + h;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(r - radius, y);
      ctx.quadraticCurveTo(r, y, r, y + radius);
      ctx.lineTo(r, y + h - radius);
      ctx.quadraticCurveTo(r, b, r - radius, b);
      ctx.lineTo(x + radius, b);
      ctx.quadraticCurveTo(x, b, x, b - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      if (alpha) {
        ctx.globalAlpha = alpha;
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      if (stroke) {
        ctx.strokeStyle = stroke;
        return ctx.stroke();
      }
    };

    Huviz.prototype.paint_dropshadow = function(label, focused_font_size, x, y) {
      var ctx, focused_font, height, width;
      ctx = this.ctx;
      width = this.ctx.measureText(label).width * focused_font_size;
      focused_font = focused_font_size + "em sans-serif";
      height = this.label_em * this.focused_mag * 16;
      ctx.font = focused_font;
      ctx.strokeStyle = renderStyles.pageBg;
      ctx.lineWidth = 5;
      return ctx.strokeText("  " + label + "  ", x, y);
    };

    Huviz.prototype.draw_edge_labels = function() {
      var edge, j, len1, ref, results1;
      if (!this.show_edges) {
        return;
      }
      if (this.focused_edge != null) {
        this.draw_edge_label(this.focused_edge);
      }
      if (this.show_edge_labels_adjacent_to_labelled_nodes) {
        ref = this.links_set;
        results1 = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          edge = ref[j];
          if (edge.target.labelled || edge.source.labelled) {
            results1.push(this.draw_edge_label(edge));
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }
    };

    Huviz.prototype.draw_edge_label = function(edge) {
      var ctx, height, label, width;
      ctx = this.ctx;
      label = edge.label || edge.predicate.lid;
      if (this.snippet_count_on_edge_labels) {
        if (edge.contexts != null) {
          if (edge.contexts.length) {
            label += " (" + edge.contexts.length + ")";
          }
        }
      }
      width = ctx.measureText(label).width;
      height = this.label_em * this.focused_mag * 16;
      if (this.paint_label_dropshadows) {
        if (edge.handle != null) {
          this.paint_dropshadow(label, this.label_em, edge.handle.x, edge.handle.y);
        }
      }
      ctx.fillStyle = edge.color;
      return ctx.fillText(" " + label, edge.handle.x + this.edge_x_offset, edge.handle.y);
    };

    Huviz.prototype.update_snippet = function() {
      if (this.show_snippets_constantly && (this.focused_edge != null) && this.focused_edge !== this.printed_edge) {
        return this.print_edge(this.focused_edge);
      }
    };

    Huviz.prototype.msg_history = "";

    Huviz.prototype.show_state_msg = function(txt) {
      if (false) {
        this.msg_history += " " + txt;
        txt = this.msg_history;
      }
      this.state_msg_box.show();
      this.state_msg_box.html("<div class='msg_payload'>" + txt + "</div><div class='msg_backdrop'></div>");
      this.state_msg_box.on('click', this.hide_state_msg);
      if (this.use_fancy_cursor) {
        this.text_cursor.pause("wait");
      }
    };

    Huviz.prototype.hide_state_msg = function() {
      this.state_msg_box.hide();
      if (this.use_fancy_cursor) {
        this.text_cursor["continue"]();
      }
    };

    Huviz.prototype.svg_restart = function() {
      var nodeEnter;
      this.link = this.link.data(this.links_set);
      this.link.enter().insert("line", ".node").attr("class", function(d) {
        return "link";
      });
      this.link.exit().remove();
      this.node = this.node.data(this.nodes);
      this.node.exit().remove();
      nodeEnter = this.node.enter().append("g").attr("class", "lariat node").call(force.drag);
      nodeEnter.append("circle").attr("r", calc_node_radius).style("fill", function(d) {
        return d.color;
      });
      nodeEnter.append("text").attr("class", "label").attr("style", "").attr("dy", ".35em").attr("dx", ".4em").text(function(d) {
        return d.name;
      });
      return this.label = this.svg.selectAll(".label");
    };

    Huviz.prototype.canvas_show_text = function(txt, x, y) {
      this.ctx.fillStyle = "black";
      this.ctx.font = "12px Courier";
      return this.ctx.fillText(txt, x, y);
    };

    Huviz.prototype.pnt2str = function(x, y) {
      return "[" + Math.floor(x) + ", " + Math.floor(y) + "]";
    };

    Huviz.prototype.show_pos = function(x, y, dx, dy) {
      dx = dx || 0;
      dy = dy || 0;
      return this.canvas_show_text(pnt2str(x, y), x + dx, y + dy);
    };

    Huviz.prototype.show_line = function(x0, y0, x1, y1, dx, dy, label) {
      dx = dx || 0;
      dy = dy || 0;
      label = typeof label === "undefined" && "" || label;
      return this.canvas_show_text(pnt2str(x0, y0) + "-->" + pnt2str(x0, y0) + " " + label, x1 + dx, y1 + dy);
    };

    Huviz.prototype.add_webgl_line = function(e) {
      return e.gl = this.add_line(scene, e.source.x, e.source.y, e.target.x, e.target.y, e.source.s.id + " - " + e.target.s.id, "green");
    };

    Huviz.prototype.webgl_restart = function() {
      return links_set.forEach((function(_this) {
        return function(d) {
          return _this.add_webgl_line(d);
        };
      })(this));
    };

    Huviz.prototype.restart = function() {
      if (this.use_svg) {
        this.svg_restart();
      }
      this.force.start();
      if (!this.args.skip_log_tick) {
        return console.log("Tick in @force.start() restart");
      }
    };

    Huviz.prototype.show_last_mouse_pos = function() {
      return this.draw_circle(this.last_mouse_pos[0], this.last_mouse_pos[1], this.focus_radius, "yellow");
    };

    Huviz.prototype.remove_ghosts = function(e) {
      if (this.use_webgl) {
        if (e.gl) {
          this.remove_gl_obj(e.gl);
        }
        return delete e.gl;
      }
    };

    Huviz.prototype.add_node_ghosts = function(d) {
      if (this.use_webgl) {
        return d.gl = add_node(scene, d.x, d.y, 3, d.color);
      }
    };

    Huviz.prototype.add_to = function(itm, array, cmp) {
      var c;
      cmp = cmp || array.__current_sort_order || this.cmp_on_id;
      c = this.binary_search_on(array, itm, cmp, true);
      if (typeof c === typeof 3) {
        return c;
      }
      array.splice(c.idx, 0, itm);
      return c.idx;
    };

    Huviz.prototype.remove_from = function(itm, array, cmp) {
      var c;
      cmp = cmp || array.__current_sort_order || this.cmp_on_id;
      c = this.binary_search_on(array, itm, cmp);
      if (c > -1) {
        array.splice(c, 1);
      }
      return array;
    };

    Huviz.prototype.my_graph = {
      subjects: {},
      predicates: {},
      objects: {}
    };

    Huviz.prototype.fire_newsubject_event = function(s) {
      return window.dispatchEvent(new CustomEvent('newsubject', {
        detail: {
          sid: s
        },
        bubbles: true,
        cancelable: true
      }));
    };

    Huviz.prototype.ensure_predicate_lineage = function(pid) {
      var parent_lid, pred_lid, pred_name;
      pred_lid = uniquer(pid);
      if (this.my_graph.predicates[pred_lid] == null) {
        if (this.ontology.subPropertyOf[pred_lid] != null) {
          parent_lid = this.ontology.subPropertyOf[pred_lid];
        } else {
          parent_lid = "anything";
        }
        this.my_graph.predicates[pred_lid] = [];
        this.ensure_predicate_lineage(parent_lid);
        if (this.ontology.label) {
          pred_name = this.ontology.label[pred_lid];
        }
        return this.fire_newpredicate_event(pid, pred_lid, parent_lid, pred_name);
      }
    };

    Huviz.prototype.fire_newpredicate_event = function(pred_uri, pred_lid, parent_lid, pred_name) {
      return window.dispatchEvent(new CustomEvent('newpredicate', {
        detail: {
          pred_uri: pred_uri,
          pred_lid: pred_lid,
          parent_lid: parent_lid,
          pred_name: pred_name
        },
        bubbles: true,
        cancelable: true
      }));
    };

    Huviz.prototype.auto_discover_header = function(uri, digestHeaders, sendHeaders) {
      return $.ajax({
        type: 'GET',
        url: uri,
        beforeSend: function(xhr) {
          var j, len1, pair, results1;
          results1 = [];
          for (j = 0, len1 = sendHeaders.length; j < len1; j++) {
            pair = sendHeaders[j];
            results1.push(xhr.setRequestHeader(pair[0], pair[1]));
          }
          return results1;
        },
        success: (function(_this) {
          return function(data, textStatus, request) {
            var header, j, len1, line, results1, val;
            console.log(textStatus);
            console.log(request.getAllResponseHeaders());
            console.table((function() {
              var j, len1, ref, results1;
              ref = request.getAllResponseHeaders().split("\n");
              results1 = [];
              for (j = 0, len1 = ref.length; j < len1; j++) {
                line = ref[j];
                results1.push(line.split(':'));
              }
              return results1;
            })());
            results1 = [];
            for (j = 0, len1 = digestHeaders.length; j < len1; j++) {
              header = digestHeaders[j];
              val = request.getResponseHeader(header);
              if (val != null) {
                results1.push(alert(val));
              } else {
                results1.push(void 0);
              }
            }
            return results1;
          };
        })(this)
      });
    };

    Huviz.prototype.getTesterAndMunger = function(discoArgs) {
      var fallbackQuadMunter, fallbackQuadTester, quadMunger, quadTester;
      fallbackQuadTester = (function(_this) {
        return function(q) {
          return q != null;
        };
      })(this);
      fallbackQuadMunter = (function(_this) {
        return function(q) {
          return [q];
        };
      })(this);
      quadTester = discoArgs.quadTester || fallbackQuadTester;
      quadMunger = discoArgs.quadMunger || fallbackQuadMunger;
      return {
        quadTester: quadTester,
        quadMunger: quadMunger
      };
    };

    Huviz.prototype.discovery_triple_ingestor_N3 = function(data, textStatus, request, discoArgs) {
      var parser, quadMunger, quadTester, quad_count, ref;
      if (discoArgs == null) {
        discoArgs = {};
      }
      ref = this.getTesterAndMunger(discoArgs), quadTester = ref.quadTester, quadMunger = ref.quadMunger;
      quad_count = 0;
      parser = N3.Parser();
      return parser.parse(data, (function(_this) {
        return function(err, quad, pref) {
          var aQuad, j, len1, ref1, results1;
          if (err && (discoArgs.onErr != null)) {
            discoArgs.onErr(err);
          }
          if (quadTester(quad)) {
            ref1 = quadMunger(quad);
            results1 = [];
            for (j = 0, len1 = ref1.length; j < len1; j++) {
              aQuad = ref1[j];
              results1.push(_this.inject_discovered_quad_for(quad, discoArgs.aUrl));
            }
            return results1;
          }
        };
      })(this));
    };

    Huviz.prototype.discovery_triple_ingestor_GreenTurtle = function(data, textStatus, request, discoArgs) {
      var aQuad, dataset, frame, graphUri, j, len1, len2, obj, p, pred, pred_id, quad, quadMunger, quadTester, ref, ref1, ref2, ref3, ref4, subj_uri;
      if (discoArgs == null) {
        discoArgs = {};
      }
      graphUri = discoArgs.graphUri;
      ref = this.getTesterAndMunger(discoArgs), quadTester = ref.quadTester, quadMunger = ref.quadMunger;
      dataset = new GreenerTurtle().parse(data, "text/turtle");
      ref1 = dataset.subjects;
      for (subj_uri in ref1) {
        frame = ref1[subj_uri];
        ref2 = frame.predicates;
        for (pred_id in ref2) {
          pred = ref2[pred_id];
          ref3 = pred.objects;
          for (j = 0, len1 = ref3.length; j < len1; j++) {
            obj = ref3[j];
            quad = {
              s: frame.id,
              p: pred.id,
              o: obj,
              g: graphUri
            };
            if (quadTester(quad)) {
              ref4 = quadMunger(quad);
              for (p = 0, len2 = ref4.length; p < len2; p++) {
                aQuad = ref4[p];
                this.inject_discovered_quad_for(aQuad, discoArgs.aUrl);
              }
            }
          }
        }
      }
    };

    Huviz.prototype.make_triple_ingestor = function(discoArgs) {
      return (function(_this) {
        return function(data, textStatus, request) {
          return _this.discovery_triple_ingestor_GreenTurtle(data, textStatus, request, discoArgs);
        };
      })(this);
    };

    Huviz.prototype.discover_labels = function(aUrl) {
      var discoArgs;
      discoArgs = {
        aUrl: aUrl,
        quadTester: (function(_this) {
          return function(quad) {
            var ref;
            if (quad.s !== aUrl.toString()) {
              return false;
            }
            if (!(ref = quad.p, indexOf.call(NAME_SYNS, ref) >= 0)) {
              return false;
            }
            return true;
          };
        })(this),
        quadMunger: (function(_this) {
          return function(quad) {
            return [quad];
          };
        })(this),
        graphUri: aUrl.origin
      };
      return this.make_triple_ingestor(discoArgs);
    };

    Huviz.prototype.ingest_quads_from = function(uri, success, failure) {
      return $.ajax({
        type: 'GET',
        url: uri,
        success: success,
        failure: failure
      });
    };

    Huviz.prototype.discover_geoname_name_msgs_threshold_ms = 5 * 1000;

    Huviz.prototype.discover_geoname_name_instructions = "Be sure to\n  1) create a\n     <a target=\"geonamesAcct\"\n        href=\"http://www.geonames.org/login\">new account</a>\n  2) validate your email\n  3) on\n     <a target=\"geonamesAcct\"\n        href=\"http://www.geonames.org/manageaccount\">manage account</a>\n     press\n     <a target=\"geonamesAcct\"\n         href=\"http://www.geonames.org/enablefreewebservice\">click here to enable</a>\n 4) re-enter your GeoNames Username in HuViz settings to trigger lookup</span>";

    Huviz.prototype.discover_geoname_name_instructions_md = "## How to get GeoNames lookup working\n\n[GeoNames](http://www.geonames.org) is a very popular service experiencing much load.\nTo protect their servers they require a username to be able to perform lookup.\nThe hourly limit is 1000 and the daily limit is 30000 per username.\n\nYou may use the `huviz` username if you are going to perform just a couple of lookups.\nIf you are going to do lots of GeoNames lookups you should set up your own account.\nHere is how:\n\n1. create a <a target=\"geonamesAcct\" href=\"http://www.geonames.org/login\">new account</a> if you don't have one\n2. validate your email (if you haven't already)\n3. on the <a target=\"geonamesAcct\" href=\"http://www.geonames.org/manageaccount\">manage account</a> page\n   press <a target=\"geonamesAcct\" href=\"http://www.geonames.org/enablefreewebservice\">Click here to enable</a>\n   if your account is not already _enabled to use the free web services_\n4. enter your *GeoNames Username* in HuViz `Settings` tab then press the TAB or ENTER key to trigger lookup\n5. if you need to perform more lookups, just adjust the *GeoNames Limit*, then leave that field with TAB, ENTER or a click\n\n(Soon, HuViz will let you save your personal *GeoNames Username* and your *GeoNames Limit* to make this more convenient.)\n";

    Huviz.prototype.adjust_setting = function(input_or_id, new_value, old_value, skip_custom_handler) {
      var input, setting_id, theType;
      input = null;
      setting_id = null;
      if (typeof input_or_id === 'string') {
        input = this.get_setting_input_JQElem(input_or_id);
        setting_id = input_or_id;
      } else {
        input = input_or_id;
        setting_id = input[0].name;
      }
      theType = input.attr('type');
      if (theType === 'checkbox' || theType === 'radiobutton') {
        input.prop('checked', new_value);
      } else {
        input.val(new_value);
      }
      if (this[setting_id] != null) {
        this[setting_id] = new_value;
      }
      this.change_setting_to_from(setting_id, new_value, old_value, skip_custom_handler);
      return new_value;
    };

    Huviz.prototype.get_setting_input_JQElem = function(inputName) {
      return this.topJQElem.find("[name='" + inputName + "']");
    };

    Huviz.prototype.countdown_setting = function(inputName) {
      var input, newVal, val;
      input = this.get_setting_input_JQElem(inputName);
      val = input.val();
      if (val < 1) {
        return 0;
      }
      newVal = val - 1;
      return this.adjust_setting(inputName, newVal);
    };

    Huviz.prototype.preset_discover_geonames_remaining = function() {
      var count, j, len1, node, ref, url;
      count = 0;
      ref = this.nameless_set;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        node = ref[j];
        url = node.id;
        if (url.includes('geonames.org')) {
          count++;
        }
      }
      return this.adjust_setting('discover_geonames_remaining', count);
    };

    Huviz.prototype.show_geonames_instructions = function(params) {
      var args, markdown;
      args = {
        width: this.width * 0.6,
        height: this.height * 0.6
      };
      markdown = this.discover_geoname_name_instructions_md;
      if (params != null) {
        if (params.msg != null) {
          markdown += "\n#### Error:\n<span style=\"color:red\">" + params.msg + "</span>";
        }
        if (params.username != null) {
          markdown += "\n#### Username:\n<span style=\"color:blue\">" + params.username + "</span>";
        }
      }
      if (params.markdown != null) {
        markdown = params.markdown;
      }
      return this.make_markdown_dialog(markdown, null, args);
    };

    Huviz.prototype.discover_geoname_name = function(aUrl) {
      var id, rem, username, widget;
      id = aUrl.pathname.replace(/\//g, '');
      username = this.discover_geonames_as;
      if (this.discover_geonames_remaining < 1) {
        return;
      }
      if ((widget = this.discover_geonames_as__widget)) {
        if (widget.state === 'untried') {
          this.discover_geonames_as__widget.set_state('trying');
        } else if (widget.state === 'looking') {
          if (this.discover_geonames_remaining < 1) {
            console.info('stop looking because remaining is', this.discover_geonames_remaining);
            return false;
          }
          rem = this.countdown_setting('discover_geonames_remaining');
        } else if (widget.state === 'good') {
          if (this.discover_geonames_remaining < 1) {
            return false;
          }
          this.discover_geonames_as__widget.set_state('looking');
        } else {
          console.warn("discover_geoname_name() should not be called when widget.state =", widget.state);
          return false;
        }
      }
      if (this.geonames_name_lookups_performed == null) {
        this.geonames_name_lookups_performed = 0;
      }
      this.geonames_name_lookups_performed += 1;
      $.ajax(this.make_geoname_ajax_closure(aUrl));
    };

    Huviz.prototype.make_geoname_ajax_closure = function(aUrl) {
      var id, idInt, k2p, soughtId, url, username;
      id = aUrl.pathname.replace(/\//g, '');
      soughtId = id;
      idInt = parseInt(id);
      username = this.discover_geonames_as;
      k2p = this.discover_geoname_key_to_predicate_mapping;
      url = "http://api.geonames.org/hierarchyJSON?geonameId=" + id + "&username=" + username;
      return {
        url: url,
        error: (function(_this) {
          return function(xhr, status, error) {
            if (error === 'Unauthorized') {
              if (_this.discover_geonames_as__widget.state !== 'bad') {
                _this.discover_geonames_as__widget.set_state('bad');
                return _this.show_geonames_instructions();
              }
            }
          };
        })(this),
        success: (function(_this) {
          return function(json, textStatus, request) {
            var again, containershipQuad, deeperQuad, deeply, depth, geoNamesRoot, geoRec, greedily, j, key, msg, name, params, placeQuad, pred, quad, ref, seen_name, soughtGeoname, state_at_start, subj, theType, value, widget;
            if (json.status) {
              console.debug(json, textStatus, request, aUrl, url);
              if (_this.discover_geoname_name_msgs == null) {
                _this.discover_geoname_name_msgs = {};
              }
              params = {};
              if (json.status.message) {
                params.msg = json.status.message;
                if (username) {
                  params.username = username;
                }
                if (json.status.message.startsWith('For input string')) {
                  params.markdown = "Geoname lookup failed for the url:\n\n`" + aUrl.href + "`";
                }
              }
              if ((!_this.discover_geoname_name_msgs[msg]) || (_this.discover_geoname_name_msgs[msg] && Date.now() - _this.discover_geoname_name_msgs[msg] > _this.discover_geoname_name_msgs_threshold_ms)) {
                _this.discover_geoname_name_msgs[msg] = Date.now();
                _this.show_geonames_instructions(params);
              }
              return;
            }
            if ((widget = _this.discover_geonames_as__widget)) {
              state_at_start = widget.state;
              if (state_at_start === 'trying' || state_at_start === 'looking') {
                if (widget.state === 'trying') {
                  _this.countdown_setting('discover_geonames_remaining');
                  _this.discover_geonames_as__widget.set_state('looking');
                }
                if (widget.state === 'looking') {
                  if (_this.discover_geonames_remaining > 0) {
                    again = function() {
                      return _this.discover_names_including('geonames.org');
                    };
                    setTimeout(again, 100);
                  } else {
                    _this.discover_geonames_as__widget.set_state('good');
                  }
                } else {
                  console.log('we should never get here where widget.state =', widget.state);
                }
              } else {
                msg = "state_at_start = " + state_at_start + " but it should only be looking or trying (nameless: " + _this.nameless_set.length + ")";
              }
            } else {
              throw new Error("discover_geonames_as__widget is missing");
            }
            geoNamesRoot = aUrl.origin;
            deeperQuad = null;
            greedily = _this.discover_geonames_greedily;
            deeply = _this.discover_geonames_deeply;
            depth = 0;
            ref = json.geonames;
            for (j = ref.length - 1; j >= 0; j += -1) {
              geoRec = ref[j];
              if (!depth) {
                if (geoRec.geonameId.toString() !== soughtId) {
                  console.warn("likely misalignment between representation of soughtId and found", soughtId, "!=", geoRec.geonameId);
                }
                subj = aUrl.toString();
              } else {
                subj = geoNamesRoot + '/' + geoRec.geonameId;
              }
              depth++;
              soughtGeoname = geoRec.geonameId === idInt;
              if ((!deeply) && (!soughtGeoname)) {
                continue;
              }
              name = (geoRec || {}).name;
              placeQuad = {
                s: subj,
                p: RDF_type,
                o: {
                  value: 'https://schema.org/Place',
                  type: RDF_object
                },
                g: geoNamesRoot
              };
              _this.inject_discovered_quad_for(placeQuad, aUrl);
              seen_name = false;
              for (key in geoRec) {
                value = geoRec[key];
                if (key === 'name') {
                  seen_name = true;
                } else {
                  if (!greedily) {
                    continue;
                  }
                }
                if (key === 'geonameId') {
                  continue;
                }
                pred = k2p[key];
                if (!pred) {
                  continue;
                }
                theType = RDF_literal;
                if (typeof value === 'number') {
                  if (Number.isInteger(value)) {
                    theType = 'xsd:integer';
                  } else {
                    theType = 'xsd:decimal';
                  }
                  value = "" + value;
                } else {
                  theType = RDF_literal;
                }
                quad = {
                  s: subj,
                  p: pred,
                  o: {
                    value: value,
                    type: theType
                  },
                  g: geoNamesRoot
                };
                _this.inject_discovered_quad_for(quad, aUrl);
                if (!greedily && seen_name) {
                  break;
                }
              }
              if (!deeply && depth > 1) {
                break;
              }
              if (deeperQuad) {
                containershipQuad = {
                  s: quad.s,
                  p: 'http://data.ordnancesurvey.co.uk/ontology/spatialrelations/contains',
                  o: {
                    value: deeperQuad.s,
                    type: RDF_object
                  },
                  g: geoNamesRoot
                };
                _this.inject_discovered_quad_for(containershipQuad, aUrl);
              }
              deeperQuad = Object.assign({}, quad);
            }
          };
        })(this)
      };
    };


    /*
     * This is what a single geoRec from geonames.org looks like:
            "fcode" : "RGN",
            "adminCodes1" : {
               "ISO3166_2" : "ENG"
            },
            "adminName1" : "England",
            "countryName" : "United Kingdom",
            "fcl" : "L",
            "countryId" : "2635167",
            "adminCode1" : "ENG",
            "name" : "Yorkshire",
            "lat" : "53.95528",
            "population" : 0,
            "geonameId" : 8581589,
            "fclName" : "parks,area, ...",
            "countryCode" : "GB",
            "fcodeName" : "region",
            "toponymName" : "Yorkshire",
            "lng" : "-1.16318"
     */

    Huviz.prototype.discover_geoname_key_to_predicate_mapping = {
      name: RDFS_label,
      population: 'http://dbpedia.org/property/population'
    };

    Huviz.prototype.inject_discovered_quad_for = function(quad, url) {
      var q;
      q = this.add_quad(quad);
      this.update_set_counts();
      if (this.found_names == null) {
        this.found_names = [];
      }
      return this.found_names.push(quad.o.value);
    };

    Huviz.prototype.deprefix = function(uri, prefix, expansion) {
      return uri.replace(expansion, prefix);
    };

    Huviz.prototype.make_sparql_name_for_getty = function(uris, expansion, prefix) {
      var subj_constraint, uri;
      if (prefix == null) {
        prefix = ':';
      }
      if (!Array.isArray(uris)) {
        uris = [uris];
      }
      if (!uris.length) {
        throw new Error('expecting uris to be an Array of length > 0');
      }
      if (uris.length === 1) {
        subj_constraint = "BIND (?s AS <" + uris[0] + ">)";
      } else {
        subj_constraint = "FILTER (?s IN (" + ((function() {
          var j, len1, results1;
          results1 = [];
          for (j = 0, len1 = uris.length; j < len1; j++) {
            uri = uris[j];
            results1.push(this.deprefix(uri, prefix, expansion));
          }
          return results1;
        }).call(this)).join(', ') + "))";
      }
      return "PREFIX " + prefix + " <" + expansion + ">\nSELECT * {\n  ?subj gvp:prefLabelGVP [xl:literalForm ?label] .\n  " + subj_constraint + "\n }";
    };

    Huviz.prototype.make_sparql_name_query = function(uris) {
      var subj_constraint, uri;
      if (uris.length === 1) {
        subj_constraint = "FILTER (?subj in (<" + uris[0] + ">))";
      } else {
        subj_constraint = "FILTER (?subj IN (" + ((function() {
          var j, len1, results1;
          results1 = [];
          for (j = 0, len1 = uris.length; j < len1; j++) {
            uri = uris[j];
            results1.push(this.deprefix(uri, prefix, expansion));
          }
          return results1;
        }).call(this)).join(', ') + "))";
      }
      return "PREFIX dbr: <http://dbpedia.org/resource/>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\nCONSTRUCT {\n  ?subj ?pred ?obj .\n}\nWHERE {\n  ?subj ?pred ?obj .\n  FILTER (?pred IN (rdfs:label)) .\n  " + subj_constraint + "\n}\nLIMIT 10";

      /*
        PREFIX dbr: <http://dbpedia.org/resource/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      
        CONSTRUCT {?sub ?pre ?obj}
        WHERE {
           ?sub ?pre ?obj .
           FILTER (?sub IN (dbr:Robert_Tappan_Morris,dbr:Technical_University_of_Berlin)) .
           FILTER (?pre IN (rdfs:label)) .
        }
       */

      /*
       SELECT ?sub ?obj
       WHERE {
         ?sub rdfs:label|foaf:name ?obj .
         FILTER (?sub IN (<http://dbpedia.org/page/Robert_Tappan_Morris>))
       }
       */
    };

    Huviz.prototype.make_sparql_name_handler = function(uris) {
      return noop;
    };

    Huviz.prototype.make_sparql_name_query_and_handler = function(uri_or_uris) {
      var handler, query, uris;
      if (Array.isArray(uri_or_uris)) {
        uris = uri_or_uris;
      } else {
        uris = [uri_or_uris];
      }
      query = this.make_sparql_name_query(uris);
      handler = this.make_sparql_name_handler(uris);
      return [query, handler];
    };

    Huviz.prototype.auto_discover_name_for = function(namelessUri, node) {
      var aUrl, args, downloadUrl, e, hasDomainName, ref, retval, serverSpec, serverUrl, try_even_though_CORS_should_block;
      if (namelessUri.startsWith('_')) {
        return;
      }
      try {
        aUrl = new URL(namelessUri);
      } catch (_error) {
        e = _error;
        colorlog("skipping auto_discover_name_for('" + namelessUri + "') because");
        console.log(e);
        return;
      }
      this.highwater_incr('discover_name');
      hasDomainName = function(domainName) {
        return aUrl.hostname.endsWith(domainName);
      };
      if (hasDomainName('cwrc.ca')) {
        args = {
          namelessUri: namelessUri,
          serverUrl: "http://sparql.cwrc.ca/sparql"
        };
        this.run_sparql_name_query(args);
        return;
      }
      if (hasDomainName("id.loc.gov")) {
        retval = this.ingest_quads_from(namelessUri + ".skos.nt", this.discover_labels(namelessUri));
        return;
      }
      if (hasDomainName("vocab.getty.edu")) {
        if ((try_even_though_CORS_should_block = false)) {
          serverUrl = "http://vocab.getty.edu/download/nt";
          downloadUrl = serverUrl + "?uri=" + (encodeURIComponent(namelessUri));
          retval = this.ingest_quads_from(downloadUrl, this.discover_labels(namelessUri));
          return;
        } else {
          args = {
            namelessUri: namelessUri,
            serverUrl: "http://vocab.getty.edu/sparql.tsv"
          };
          this.run_sparql_name_query(args);
          return;
        }
      }
      if (hasDomainName("openstreetmap.org")) {
        args = {
          namelessUri: namelessUri,
          predicates: [OSMT_reg_name, OSMT_name],
          serverUrl: "https://sophox.org/sparql"
        };
        this.run_sparql_name_query(args);
        return;
      }
      if (hasDomainName("geonames.org")) {
        if (node && node.sought_name) {
          return;
        }
        if (((ref = this.discover_geonames_as__widget.state) === 'untried' || ref === 'looking' || ref === 'good') && this.discover_geonames_remaining > 0) {
          node.sought_name = true;
          this.discover_geoname_name(aUrl);
        }
        return;
      }
      if (true) {
        if (serverSpec = this.get_server_for_dataset(namelessUri)) {
          args = {
            namelessUri: namelessUri,
            serverUrl: serverSpec.serverUrl
          };
          this.run_sparql_name_query(args);
          return;
        }
      }
    };

    Huviz.prototype.discover_names_including = function(includes) {
      if (this.nameless_set) {
        this.discover_names(includes);
      }
    };

    Huviz.prototype.discover_names = function(includes) {
      var j, len1, node, ref, uri;
      ref = this.nameless_set;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        node = ref[j];
        uri = node.id;
        if (!uri.includes(':')) {
          continue;
        }
        if (!((includes != null) && !uri.includes(includes))) {
          this.auto_discover_name_for(uri, node);
        }
      }
    };

    Huviz.prototype.run_sparql_name_query = function(args) {
      var defaults, namelessUri;
      namelessUri = args.namelessUri;
      if (args.query == null) {
        args.query = "# " + (args.comment || ("run_sparql_name_query(" + namelessUri + ")")) + "\n" + this.make_name_query(namelessUri, args);
      }
      defaults = {
        success_handler: this.generic_name_success_handler,
        result_handler: this.name_result_handler,
        default_terms: {
          s: namelessUri,
          p: RDFS_label
        }
      };
      args = this.compose_object_from_defaults_and_incoming(defaults, args);
      return this.run_managed_query_ajax(args);
    };

    Huviz.prototype.tsv_name_success_handler = function(data, textStatus, jqXHR, queryManager) {
      var cols, e, firstLine, j, len1, line, lines, result_handler, row, rowJson, table;
      result_handler = queryManager.args.result_handler;
      try {
        table = [];
        try {
          lines = data.split(/\r?\n/);
        } catch (_error) {
          e = _error;
          console.info("data:", data);
          throw e;
        }
        firstLine = lines.shift();
        cols = firstLine.split("\t");
        for (j = 0, len1 = lines.length; j < len1; j++) {
          line = lines[j];
          if (!line) {
            continue;
          }
          row = line.split("\t");
          rowJson = _.zipObject(cols, row);
          result_handler(rowJson, queryManager);
          table.push(rowJson);
        }
        queryManager.setResultCount(table.length);
      } catch (_error) {
        e = _error;
        this.make_json_dialog(table);
        queryManager.fatalError(e);
      }
    };

    Huviz.prototype.json_name_success_handler = function(data, textStatus, jqXHR, queryManager) {
      var e, j, len1, ref, resultJson, result_handler, table;
      result_handler = queryManager.args.result_handler;
      try {
        table = [];
        ref = data.results.bindings;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          resultJson = ref[j];
          if (!resultJson) {
            continue;
          }
          result_handler(resultJson, queryManager);
          table.push(resultJson);
        }
        queryManager.setResultCount(table.length);
      } catch (_error) {
        e = _error;
        this.make_json_dialog(table, null, {
          title: "table of results"
        });
        queryManager.fatalError(e);
      }
    };

    Huviz.prototype.display_graph_success_handler = function(data, textStatus, jqXHR, queryManager) {
      this.disable_dataset_ontology_loader_AUTOMATICALLY();
      this.generic_name_success_handler(data, textStatus, jqXHR, queryManager);
      this.call_on_dataset_loaded();
    };

    Huviz.prototype.generic_success_handler = function(data, textStatus, jqXHR, queryManager) {
      this.generic_name_success_handler(data, textStatus, jqXHR, queryManager);
    };

    Huviz.prototype.generic_name_success_handler = function(data, textStatus, jqXHR, queryManager) {
      var error, resp_content_type, resp_type, serverDesc, success_handler;
      try {
        data = JSON.parse(data);
      } catch (_error) {
        error = _error;
      }
      resp_content_type = jqXHR.getResponseHeader("content-type").split(';')[0];
      if (data.head != null) {
        resp_type = 'json';
      } else if (data.includes("\t")) {
        resp_type = 'tsv';
      } else {
        serverDesc = queryManager.args.serverUrl || "the server";
        throw new Error("no support for " + resp_content_type + " just json or tsv for data coming from " + serverDesc);
      }
      switch (resp_type) {
        case 'json':
          success_handler = this.json_name_success_handler;
          break;
        case 'tsv':
          success_handler = this.tsv_name_success_handler;
          break;
        default:
          throw new Error('no name_success_handler available');
      }
      success_handler(data, textStatus, jqXHR, queryManager);
    };

    Huviz.prototype.default_name_query_args = {
      predicates: [RDFS_label, FOAF_name, SCHEMA_name],
      limit: 20
    };

    Huviz.prototype.make_name_query = function(uri, in_args) {
      var args, j, len1, lines, pred, pred_num, predicates;
      args = this.compose_object_from_defaults_and_incoming(this.default_name_query_args, in_args);
      predicates = args.predicates;
      lines = ["SELECT *", "WHERE {"];
      pred_num = 0;
      for (j = 0, len1 = predicates.length; j < len1; j++) {
        pred = predicates[j];
        if (pred_num) {
          lines.push('  UNION');
        }
        pred_num++;
        lines.push("  {");
        lines.push("    BIND (<" + pred + "> as ?p) .");
        lines.push("    <" + uri + "> ?p ?o .");
        lines.push("  }");
      }
      lines.push("}");
      if (args.limit) {
        lines.push("LIMIT " + args.limit);
      }
      return lines.join("\n");
    };

    Huviz.prototype.convert_N3_obj_to_GreenTurtle = function(n3_obj_term) {
      var bare_obj_term, e, graph, pred, retval, statement, subj;
      if (typeof n3_obj_term === 'string') {
        bare_obj_term = n3_obj_term;
      } else {
        bare_obj_term = n3_obj_term.id;
        if (!bare_obj_term.startsWith('"')) {
          retval = {
            type: RDF_object,
            value: n3_obj_term.id
          };
          return retval;
        }
        bare_obj_term = bare_obj_term.replace("http://www.w3.org/2001/XMLSchema#", "xsd:");
        bare_obj_term = bare_obj_term.replace("^^xsd:string", '');
      }
      if (this.greenturtleparser == null) {
        this.greenturtleparser = new GreenerTurtle();
      }
      subj = 'http://example.com/subj';
      pred = 'http://example.com/pred';
      statement = "<" + subj + "> <" + pred + "> " + bare_obj_term + " .";
      try {
        graph = this.greenturtleparser.parse(statement, "text/turtle");
        retval = graph.subjects[subj].predicates[pred].objects.slice(-1)[0];
      } catch (_error) {
        e = _error;
        console.error(e);
        throw e;
        retval = {
          value: strip_surrounding_quotes(n3_obj_term),
          type: 'Literal'
        };
      }
      return retval;
    };

    Huviz.prototype.convert_str_obj_to_GreenTurtle = function(bare_term) {
      var msg;
      if (bare_term[0] === '<') {
        return this.convert_N3_obj_to_GreenTurtle(bare_term);
      }
      if (bare_term.slice(-1)[0] !== '"') {
        if (bare_term.startsWith('"')) {
          if (bare_term.includes('@')) {
            return this.convert_N3_obj_to_GreenTurtle(bare_term);
          } else {

          }
        } else {
          return this.convert_N3_obj_to_GreenTurtle('"' + bare_term + '"');
        }
      }
      msg = "bare_term: {" + bare_term + "} not parseable by convert_str_term_to_GreenTurtle";
      throw new Error(msg);
    };

    Huviz.prototype.convert_N3_uri_to_string = function(n3Uri) {
      return n3Uri;
    };

    Huviz.prototype.convert_str_uri_to_string = function(bareUri) {
      if (bareUri.startsWith('<')) {
        bareUri = bareUri.substr(1, bareUri.length - 2);
      }
      return bareUri;
    };

    Huviz.prototype.convert_obj_obj_to_GreenTurtle = function(jsObj) {
      var lang;
      if (jsObj.type === 'uri') {
        jsObj.type = RDF_object;
      } else if (jsObj.type === 'literal') {
        jsObj.type = RDF_literal;
        if ((lang = jsObj['xml:lang'])) {
          delete jsObj['xml:lang'];
          jsObj.language = lang.toLowerCase();
        }
      }
      return jsObj;
    };

    Huviz.prototype.convert_obj_uri_to_string = function(jsObj) {
      if (jsObj.value != null) {
        return jsObj.value;
      }
      if (typeof jsObj !== 'object') {
        return jsObj;
      }
      throw new Error('expecting jsObj to have .value or be a literal');
    };

    Huviz.prototype.name_result_handler = function(result, queryManager) {
      var error, obj_term, parseObj, parseUri, pred_term, q, result_type, subj_term, terms;
      terms = queryManager.args.query_terms || queryManager.args.default_terms;
      subj_term = result['?s'] || result['s'] || terms.s;
      pred_term = result['?p'] || result['p'] || terms.p;
      obj_term = result['?o'] || result['o'] || terms.o;
      if (queryManager.args.from_N3) {
        result_type = 'n3';
      } else if (obj_term.value != null) {
        result_type = 'obj';
      } else {
        result_type = 'str';
      }
      switch (result_type) {
        case 'n3':
          parseObj = this.convert_N3_obj_to_GreenTurtle;
          parseUri = this.convert_N3_uri_to_string;
          break;
        case 'obj':
          parseObj = this.convert_obj_obj_to_GreenTurtle;
          parseUri = this.convert_obj_uri_to_string;
          break;
        case 'str':
          parseObj = this.convert_str_obj_to_GreenTurtle;
          parseUri = this.convert_str_uri_to_string;
          break;
        default:
          console.error(result);
          throw new Error('can not determine result_type');
      }
      try {
        q = {
          s: parseUri(subj_term),
          p: parseUri(pred_term),
          o: parseObj(obj_term),
          g: terms.g
        };
        this.add_quad(q);
      } catch (_error) {
        error = _error;
        console.warn(result);
        console.error(error);
      }
    };

    Huviz.prototype.make_wikidata_name_query = function(uri, langs) {
      var prefixes, subj;
      if (uri == null) {
        uri = 'wd:Q160302';
      }
      if (langs == null) {
        langs = "en";
      }
      if (uri.startsWith('http')) {
        subj = "<" + uri + ">";
      } else {
        subj = uri;
      }
      if (uri.startsWith('wd:')) {
        prefixes = "PREFIX wd: <http://www.wikidata.org/entity/>";
      } else {
        prefixes = "";
      }
      return prefixes + "\nSELECT ?subj ?pred ?subjLabel\nWHERE {\n  BIND (" + subj + " as ?subj)\n  BIND (rdfs:label as ?pred)\n  SERVICE wikibase:label {\n    bd:serviceParam wikibase:language \"" + langs + "\" .\n  }\n}";
    };

    Huviz.prototype.test_json_fetch = function(uri, success, err) {
      if (uri == null) {
        uri = 'https://www.wikidata.org/entity/Q12345.json';
      }
      if (success == null) {
        success = (function(_this) {
          return function(r) {
            return console.log(r, r.json().then(function(json) {
              return console.log(JSON.stringify(json));
            }));
          };
        })(this);
      }
      if (err == null) {
        err = (function(_this) {
          return function(e) {
            return console.log('OOF:', e);
          };
        })(this);
      }
      fetch(uri).then(success)["catch"](err);
    };

    Huviz.prototype.make_qname = function(uri) {
      return uri;
    };

    Huviz.prototype.last_quad = {};

    Huviz.prototype.object_value_types = {};

    Huviz.prototype.unique_pids = {};

    Huviz.prototype.add_quad = function(quad, sprql_subj) {
      var cntx_n, ctxid, edge, isLiteral, is_type, literal_node, make_edge, newsubj, objId, objId_explanation, objKey, objVal, obj_n, pred_n, pred_uri, simpleType, subj, subj_lid, subj_n, subj_uri, use_thumb;
      subj_uri = quad.s;
      if (subj_uri == null) {
        throw new Error("quad.s is undefined");
      }
      pred_uri = quad.p;
      if (pred_uri == null) {
        throw new Error("quad.p is undefined");
      }
      ctxid = quad.g || this.get_context();
      subj_lid = uniquer(subj_uri);
      this.object_value_types[quad.o.type] = 1;
      this.unique_pids[pred_uri] = 1;
      newsubj = false;
      subj = null;
      if (this.my_graph.subjects[subj_uri] == null) {
        newsubj = true;
        subj = {
          id: subj_uri,
          name: subj_lid,
          predicates: {}
        };
        this.my_graph.subjects[subj_uri] = subj;
      } else {
        subj = this.my_graph.subjects[subj_uri];
      }
      this.ensure_predicate_lineage(pred_uri);
      edge = null;
      subj_n = this.get_or_create_node_by_id(subj_uri);
      pred_n = this.get_or_create_predicate_by_id(pred_uri);
      cntx_n = this.get_or_create_context_by_id(ctxid);
      if (quad.p === RDF_subClassOf && this.show_class_instance_edges) {
        this.try_to_set_node_type(subj_n, OWL_Class);
      }
      if (pred_uri.match(/\#(first|rest)$/)) {
        console.warn("add_quad() ignoring quad because pred_uri=" + pred_uri, quad);
        return;
      }
      if (subj.predicates[pred_uri] == null) {
        subj.predicates[pred_uri] = {
          objects: []
        };
      }
      if (quad.o.type === RDF_object) {
        obj_n = this.get_or_create_node_by_id(quad.o.value);
        if (quad.o.value === RDF_Class && this.show_class_instance_edges) {
          this.try_to_set_node_type(obj_n, OWL_Class);
        }
        if (quad.p === RDF_subClassOf && this.show_class_instance_edges) {
          this.try_to_set_node_type(obj_n, OWL_Class);
        }
        is_type = is_one_of(pred_uri, TYPE_SYNS);
        use_thumb = is_one_of(pred_uri, THUMB_PREDS) && this.show_thumbs_dont_graph;
        make_edge = this.show_class_instance_edges || !is_type && !use_thumb;
        if (is_type) {
          this.try_to_set_node_type(subj_n, quad.o.value);
        }
        if (use_thumb) {
          subj_n.__thumbnail = quad.o.value;
          this.develop(subj_n);
        }
        if (make_edge) {
          this.develop(subj_n);
          edge = this.get_or_create_Edge(subj_n, obj_n, pred_n, cntx_n);
          this.infer_edge_end_types(edge);
          edge.register_context(cntx_n);
          edge.color = this.gclui.predicate_picker.get_color_forId_byName(pred_n.lid, 'showing');
          this.add_edge(edge);
          this.develop(obj_n);
        }
      } else {
        if (is_one_of(pred_uri, NAME_SYNS)) {
          this.set_name(subj_n, quad.o.value.replace(/^\s+|\s+$/g, ''), quad.o.language);
          if (subj_n.embryo) {
            this.develop(subj_n);
          }
        } else {
          if (this.make_nodes_for_literals) {
            objVal = quad.o.value;
            simpleType = getTypeSignature(quad.o.type || '') || 'Literal';
            if (objVal == null) {
              throw new Error("missing value for " + JSON.stringify([subj_uri, pred_uri, quad.o]));
            }
            if (quad.o.language && this.group_literals_by_subj_and_pred) {
              objKey = subj_n.lid + " " + pred_uri;
              objId = synthIdFor(objKey);
              objId_explanation = "synthIdFor('" + objKey + "') = " + objId;
            } else {
              objId = synthIdFor(objVal);
            }
            literal_node = this.get_or_create_node_by_id(objId, objVal, (isLiteral = true));
            this.try_to_set_node_type(literal_node, simpleType);
            literal_node.__dataType = quad.o.type;
            this.develop(literal_node);
            this.set_name(literal_node, quad.o.value, quad.o.language);
            edge = this.get_or_create_Edge(subj_n, literal_node, pred_n, cntx_n);
            this.infer_edge_end_types(edge);
            edge.register_context(cntx_n);
            edge.color = this.gclui.predicate_picker.get_color_forId_byName(pred_n.lid, 'showing');
            this.add_edge(edge);
            literal_node.fully_loaded = true;
          }
        }
      }
      if (this.using_sparql()) {
        subj_n.fully_loaded = false;
        if (subj_n.id === quad.subject) {
          subj_n.fully_loaded = true;
        }
      }
      if (subj_n.embryo) {
        this.develop(subj_n);
      }
      this.consider_suppressing_edge_and_ends_re_OA(edge);
      this.last_quad = quad;
      this.pfm_count('add_quad');
      return edge;
    };

    Huviz.prototype.consider_suppressing_edge_and_ends_re_OA = function(edge) {
      var ref, suppressEdge;
      if (!edge || !this.suppress_annotation_edges) {
        return;
      }
      this.suppress_node_re_OA_if_appropriate(edge.source);
      if (edge.predicate.lid === 'exact') {
        if (this.hasAnnotation_targets == null) {
          this.hasAnnotation_targets = [];
        }
        if (!(ref = edge.target, indexOf.call(this.hasAnnotation_targets, ref) >= 0)) {
          this.hasAnnotation_targets.push(edge.target);
        }
        return;
      }
      suppressEdge = this.in_OA_cached(edge.predicate);
      this.suppress_node_re_OA_if_appropriate(edge.target);
    };

    Huviz.prototype.suppress_node_re_OA_if_appropriate = function(node) {
      var j, len1, ref, should_suppress, taxon;
      should_suppress = true;
      ref = node.taxons;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        taxon = ref[j];
        if (!this.in_OA_cached(taxon)) {
          should_suppress = false;
          continue;
        }
      }
      if (should_suppress) {
        this.suppress(node);
      }
    };

    Huviz.prototype.in_OA_cached = function(thing) {
      if (thing._is_in_OA == null) {
        thing._is_in_OA = this.in_OA_vocab(thing.id);
      }
      return thing._is_in_OA;
    };

    Huviz.prototype.in_OA_vocab = function(url) {
      var is_in, match;
      match = url.match(OA_terms_regex);
      is_in = !!(url.startsWith(OA_) || match);
      console.info(url + " is " + (!is_in && 'NOT ' || '') + "in OA");
      return is_in;
    };

    Huviz.prototype.remove_from_nameless = function(node) {
      var node_removed;
      if (node.nameless != null) {
        if (this.nameless_removals == null) {
          this.nameless_removals = 0;
        }
        this.nameless_removals++;
        node_removed = this.nameless_set.remove(node);
        if (node_removed !== node) {
          console.log("expecting", node_removed, "to have been", node);
        }
        delete node.nameless_since;
      }
    };

    Huviz.prototype.add_to_nameless = function(node) {
      var base1;
      if (node.isLiteral) {
        return;
      }
      node.nameless_since = performance.now();
      if ((base1 = this.nameless_set).traffic == null) {
        base1.traffic = 0;
      }
      this.nameless_set.traffic++;
      this.nameless_set.add(node);
    };

    Huviz.prototype.set_name = function(node, full_name, lang) {
      var len, perform_rename;
      perform_rename = (function(_this) {
        return function() {
          if (full_name != null) {
            if (!node.isLiteral) {
              _this.remove_from_nameless(node);
            }
          } else {
            if (!node.isLiteral) {
              _this.add_to_nameless(node);
            }
            full_name = node.lid || node.id;
          }
          if (typeof full_name === 'object') {
            return node.name = full_name;
          } else {
            if (node.name) {
              return node.name.set_val_lang(full_name, lang);
            } else {
              return node.name = new MultiString(full_name, lang);
            }
          }
        };
      })(this);
      if (node.state && node.state.id === 'shelved') {
        this.shelved_set.alter(node, perform_rename);
        this.tick("Tick in set_name");
      } else {
        perform_rename();
      }
      len = this.truncate_labels_to;
      if (len == null) {
        throw new Error("set_name('" + node.id + "', " + full_name + ", " + lang + ')');
        return;
      }
      if (len > 0) {
        node.pretty_name = node.name.substr(0, len);
      } else {
        node.pretty_name = node.name || '“”';
      }
      node.scroll_offset = 0;
    };

    Huviz.prototype.scroll_spacer = "   ";

    Huviz.prototype.scroll_pretty_name = function(node) {
      var limit, should_scroll, spacer, wrapped;
      if (this.truncate_labels_to >= node.name.length) {
        limit = node.name.length;
      } else {
        limit = this.truncate_labels_to;
      }
      should_scroll = limit > 0 && limit < node.name.length;
      if (!should_scroll) {
        return;
      }
      if (true) {
        spacer = this.scroll_spacer;
        if (!node.scroll_offset) {
          node.scroll_offset = 1;
        } else {
          node.scroll_offset += 1;
          if (node.scroll_offset > node.name.length + spacer.length) {
            node.scroll_offset = 0;
          }
        }
        wrapped = "";
        while (wrapped.length < 3 * limit) {
          wrapped += node.name + spacer;
        }
        return node.pretty_name = wrapped.substr(node.scroll_offset, limit);
      }
    };

    Huviz.prototype.unscroll_pretty_name = function(node) {
      return this.set_name(node, node.name);
    };

    Huviz.prototype.infer_edge_end_types = function(edge) {
      var base1, base2, domain_lid, ranges;
      if ((base1 = edge.source).type == null) {
        base1.type = 'Thing';
      }
      if ((base2 = edge.target).type == null) {
        base2.type = 'Thing';
      }
      ranges = this.ontology.range[edge.predicate.lid];
      if (ranges != null) {
        this.try_to_set_node_type(edge.target, ranges[0]);
      }
      domain_lid = this.ontology.domain[edge.predicate.lid];
      if (domain_lid != null) {
        return this.try_to_set_node_type(edge.source, domain_lid);
      }
    };

    Huviz.prototype.make_Edge_id = function(subj_n, obj_n, pred_n) {
      var a;
      return ((function() {
        var j, len1, ref, results1;
        ref = [subj_n, pred_n, obj_n];
        results1 = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          a = ref[j];
          results1.push(a.lid);
        }
        return results1;
      })()).join(' ');
    };

    Huviz.prototype.get_or_create_Edge = function(subj_n, obj_n, pred_n, cntx_n) {
      var edge, edge_id;
      edge_id = this.make_Edge_id(subj_n, obj_n, pred_n);
      edge = this.edges_by_id[edge_id];
      if (edge == null) {
        this.edge_count++;
        edge = new Edge(subj_n, obj_n, pred_n, cntx_n);
        this.edges_by_id[edge_id] = edge;
      }
      return edge;
    };

    Huviz.prototype.add_edge = function(edge) {
      if (edge.id.match(/Universal$/)) {
        console.log("add", edge.id);
      }
      this.add_to(edge, edge.source.links_from);
      this.add_to(edge, edge.target.links_to);
      return edge;
    };

    Huviz.prototype.delete_edge = function(e) {
      this.remove_link(e.id);
      this.remove_from(e, e.source.links_from);
      this.remove_from(e, e.target.links_to);
      delete this.edges_by_id[e.id];
      return null;
    };

    Huviz.prototype.try_to_set_node_type = function(node, type_uri) {
      var prev_type, type_lid;
      type_lid = uniquer(type_uri);
      if (!node._types) {
        node._types = [];
      }
      if (!(indexOf.call(node._types, type_lid) >= 0)) {
        node._types.push(type_lid);
      }
      prev_type = node.type;
      node.type = type_lid;
      if (prev_type !== type_lid) {
        return this.assign_types(node);
      }
    };

    Huviz.prototype.report_every = 100;

    Huviz.prototype.get_context = function() {
      return this.data_uri || this.DEFAULT_CONTEXT;
    };

    Huviz.prototype.parseAndShowTTLData = function(data, textStatus, callback) {
      var blurt_msg, context, e, every, frame, j, len1, msg, obj, parse_start_time, pred, pred_id, quad_count, ref, ref1, ref2, subj_uri;
      parse_start_time = new Date();
      context = this.get_context();
      if ((GreenerTurtle != null) && this.turtle_parser === 'GreenerTurtle') {
        try {
          this.G = new GreenerTurtle().parse(data, "text/turtle");
        } catch (_error) {
          e = _error;
          msg = escapeHtml(e.toString());
          blurt_msg = "<p>There has been a problem with the Turtle parser.  Check your dataset for errors.</p><p class=\"js_msg\">" + msg + "</p>";
          this.blurt(blurt_msg, "error");
          return false;
        }
      }
      quad_count = 0;
      every = this.report_every;
      ref = this.G.subjects;
      for (subj_uri in ref) {
        frame = ref[subj_uri];
        ref1 = frame.predicates;
        for (pred_id in ref1) {
          pred = ref1[pred_id];
          ref2 = pred.objects;
          for (j = 0, len1 = ref2.length; j < len1; j++) {
            obj = ref2[j];
            if (every === 1) {
              this.show_state_msg("<LI>" + frame.id + " <LI>" + pred.id + " <LI>" + obj.value);
              console.log("===========================\n  #", quad_count, "  subj:", frame.id, "\n  pred:", pred.id, "\n  obj.value:", obj.value);
            } else {
              if (quad_count % every === 0) {
                this.show_state_msg("parsed relation: " + quad_count);
              }
            }
            quad_count++;
            this.add_quad({
              s: frame.id,
              p: pred.id,
              o: obj,
              g: context
            });
          }
        }
      }
      this.dump_stats();
      return this.after_file_loaded('stream', callback);
    };

    Huviz.prototype.dump_stats = function() {
      console.debug("object_value_types:", this.object_value_types);
      return console.debug("unique_pids:", this.unique_pids);
    };

    Huviz.prototype.parseAndShowTurtle = function(data, textStatus) {
      var j, key, len1, msg, parse_end_time, parse_start_time, parse_time, parser, predicates, prop_name, prop_obj, ref, show_end_time, show_start_time, show_time, siz, value;
      msg = "data was " + data.length + " bytes";
      parse_start_time = new Date();
      if ((GreenerTurtle != null) && this.turtle_parser === 'GreenerTurtle') {
        this.G = new GreenerTurtle().parse(data, "text/turtle");
        console.log("GreenTurtle");
      } else if (this.turtle_parser === 'N3') {
        console.log("N3");
        console.log("n3", N3);
        predicates = {};
        parser = N3.Parser();
        parser.parse(data, (function(_this) {
          return function(err, trip, pref) {
            console.log(trip);
            if (pref) {
              console.log(pref);
            }
            if (trip) {
              return _this.add_quad(trip);
            } else {
              return console.log(err);
            }
          };
        })(this));
        console.log('===================================');
        ref = ['predicates', 'subjects', 'objects'];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          prop_name = ref[j];
          prop_obj = this.my_graph[prop_name];
          console.log(prop_name, ((function() {
            var results1;
            results1 = [];
            for (key in prop_obj) {
              value = prop_obj[key];
              results1.push(key);
            }
            return results1;
          })()).length, prop_obj);
        }
        console.log('===================================');
      }
      parse_end_time = new Date();
      parse_time = (parse_end_time - parse_start_time) / 1000;
      siz = this.roughSizeOfObject(this.G);
      msg += " resulting in a graph of " + siz + " bytes";
      msg += " which took " + parse_time + " seconds to parse";
      if (this.verbosity >= this.COARSE) {
        console.log(msg);
      }
      show_start_time = new Date();
      this.showGraph(this.G);
      show_end_time = new Date();
      show_time = (show_end_time - show_start_time) / 1000;
      msg += " and " + show_time + " sec to show";
      if (this.verbosity >= this.COARSE) {
        console.log(msg);
      }
      this.text_cursor.set_cursor("default");
      return $("#status").text("");
    };

    Huviz.prototype.choose_everything = function() {
      var cmd;
      cmd = new gcl.GraphCommand(this, {
        verbs: ['choose'],
        classes: ['Thing'],
        every_class: true
      });
      this.gclc.run(cmd);
      return this.tick("Tick in choose_everything");
    };

    Huviz.prototype.remove_framing_quotes = function(s) {
      return s.replace(/^\"/, "").replace(/\"$/, "");
    };

    Huviz.prototype.parseAndShowNQStreamer = function(uri, callback) {
      var owl_type_map, quad_count, worker;
      owl_type_map = {
        uri: RDF_object,
        literal: RDF_literal
      };
      worker = new Worker('/huviz/xhr_readlines_worker.js');
      quad_count = 0;
      worker.addEventListener('message', (function(_this) {
        return function(e) {
          var msg, q;
          msg = null;
          if (e.data.event === 'line') {
            quad_count++;
            _this.show_state_msg("<h3>Parsing... </h3><p>" + uri + "</p><progress value='" + quad_count + "' max='" + _this.node_count + "'></progress>");
            q = parseQuadLine(e.data.line);
            if (q) {
              q.s = q.s.raw;
              q.p = q.p.raw;
              q.g = q.g.raw;
              q.o = {
                type: owl_type_map[q.o.type],
                value: unescape_unicode(_this.remove_framing_quotes(q.o.toString()))
              };
              _this.add_quad(q);
            }
          } else if (e.data.event === 'start') {
            msg = "starting to split " + uri;
            _this.show_state_msg("<h3>Starting to split... </h3><p>" + uri + "</p>");
            _this.node_count = e.data.numLines;
          } else if (e.data.event === 'finish') {
            msg = "finished_splitting " + uri;
            _this.show_state_msg("done loading");
            _this.after_file_loaded(uri, callback);
          } else {
            msg = "unrecognized NQ event:" + e.data.event;
          }
          if (msg != null) {
            return _this.blurt(msg);
          }
        };
      })(this));
      return worker.postMessage({
        uri: uri
      });
    };

    Huviz.prototype.parse_and_show_NQ_file = function(data, callback) {
      var allLines, j, len1, line, owl_type_map, q, quad_count;
      owl_type_map = {
        uri: RDF_object,
        literal: RDF_literal
      };
      quad_count = 0;
      allLines = data.split(/\r\n|\n/);
      for (j = 0, len1 = allLines.length; j < len1; j++) {
        line = allLines[j];
        quad_count++;
        q = parseQuadLine(line);
        if (q) {
          q.s = q.s.raw;
          q.p = q.p.raw;
          q.g = q.g.raw;
          q.o = {
            type: owl_type_map[q.o.type],
            value: unescape_unicode(this.remove_framing_quotes(q.o.toString()))
          };
          this.add_quad(q);
        }
      }
      this.local_file_data = "";
      return this.after_file_loaded('local file', callback);
    };

    Huviz.prototype.DUMPER = function(data) {
      return console.log(data);
    };

    Huviz.prototype.fetchAndShow = function(url, callback) {
      var msg, the_parser;
      this.show_state_msg("fetching " + url);
      the_parser = this.parseAndShowNQ;
      if (url.match(/.ttl/)) {
        the_parser = this.parseAndShowTTLData;
      } else if (url.match(/.(nq|nt)/)) {
        the_parser = this.parseAndShowNQ;
      } else if (url.match(/.(jsonld|nq|nquads|nt|n3|trig|ttl|rdf|xml)$/)) {
        the_parser = this.parseAndShowFile;
      } else {
        msg = ("Could not load " + url + ". The data file format is not supported! ") + "Only accepts jsonld|nq|nquads|nt|n3|trig|ttl|rdf|xml extensions.";
        this.hide_state_msg();
        this.blurt(msg, 'error');
        $('#' + this.get_data_ontology_display_id()).remove();
        this.reset_dataset_ontology_loader();
        return;
      }
      if (the_parser === this.parseAndShowFile) {
        this.parseAndShowFile(url, callback);
        return;
      }
      if (url.startsWith('file:///') || url.indexOf('/') === -1) {
        this.get_resource_from_db(url, (function(_this) {
          return function(err, rsrcRec) {
            if (rsrcRec != null) {
              the_parser(rsrcRec.data);
              return;
            }
            _this.blurt(err || ("'" + url + " was not found in your DATASET menu.  Provide it and reload this page"));
            _this.reset_dataset_ontology_loader();
          };
        })(this));
        return;
      }
      if (the_parser === this.parseAndShowNQ) {
        this.parseAndShowNQStreamer(url, callback);
        return;
      }
      return $.ajax({
        url: url,
        success: (function(_this) {
          return function(data, textStatus) {
            the_parser(data, textStatus, callback);
            return _this.hide_state_msg();
          };
        })(this),
        error: (function(_this) {
          return function(jqxhr, textStatus, errorThrown) {
            console.log(url, errorThrown);
            if (!errorThrown) {
              errorThrown = "Cross-Origin error";
            }
            msg = errorThrown + " while fetching dataset " + url;
            _this.hide_state_msg();
            $('#' + _this.get_data_ontology_display_id()).remove();
            _this.blurt(msg, 'error');
            return _this.reset_dataset_ontology_loader();
          };
        })(this)
      });
    };

    Huviz.prototype.log_query_with_timeout = function(qry, timeout, fillColor, bgColor) {
      var queryManager;
      queryManager = this.log_query(qry);
      queryManager.anim = this.animate_sparql_query(queryManager.preElem, timeout, fillColor, bgColor);
      return queryManager;
    };

    Huviz.prototype.log_query = function(qry) {
      return this.gclui.push_sparqlQuery_onto_log(qry);
    };

    Huviz.prototype.run_little_test_query = function() {
      var littleTestQuery;
      littleTestQuery = "SELECT * WHERE {?s ?o ?p} LIMIT 1";
      return $.ajax({
        method: 'GET',
        url: url + '?query=' + encodeURIComponent(littleTestQuery),
        headers: {
          'Accept': 'application/sparql-results+json'
        },
        success: (function(_this) {
          return function(data, textStatus, jqXHR) {
            console.log("This a little repsponse test: " + textStatus);
            console.log(jqXHR);
            console.log(jqXHR.getAllResponseHeaders(data));
            return console.log(data);
          };
        })(this),
        error: (function(_this) {
          return function(jqxhr, textStatus, errorThrown) {
            console.log(url, errorThrown);
            return console.log(jqXHR.getAllResponseHeaders(data));
          };
        })(this)
      });
    };

    Huviz.prototype.run_managed_query_abstract = function(args) {
      var queryManager;
      if (args == null) {
        args = {};
      }
      if (args.success_handler == null) {
        args.success_handler = noop;
      }
      if (args.error_callback == null) {
        args.error_callback = noop;
      }
      if (args.timeout == null) {
        args.timeout = this.get_sparql_timeout_msec();
      }
      queryManager = this.log_query_with_timeout(args.query, args.timeout);
      queryManager.args = args;
      return queryManager;
    };

    Huviz.prototype.run_managed_query_ajax = function(args) {
      var ajax_settings, error_callback, more, query, queryManager, serverUrl, success_handler, timeout;
      query = args.query, serverUrl = args.serverUrl;
      queryManager = this.run_managed_query_abstract(args);
      success_handler = args.success_handler, error_callback = args.error_callback, timeout = args.timeout;
      more = "&timeout=" + timeout;
      ajax_settings = {
        'method': 'GET',
        'url': serverUrl + '?query=' + encodeURIComponent(query) + more,
        'headers': {
          'Accept': 'application/sparql-results+json'
        }
      };
      if (serverUrl === "http://sparql.cwrc.ca/sparql") {
        ajax_settings.headers = {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json'
        };
      }
      if (serverUrl.includes('wikidata')) {
        ajax_settings.headers.Accept = "text/tab-separated-values";
        ajax_settings.headers.Accept = "text/csv";
      }
      queryManager.xhr = $.ajax({
        timeout: timeout,
        method: ajax_settings.method,
        url: ajax_settings.url,
        headers: ajax_settings.headers,
        success: (function(_this) {
          return function(data, textStatus, jqXHR) {
            var e;
            queryManager.cancelAnimation();
            try {
              return success_handler(data, textStatus, jqXHR, queryManager);
            } catch (_error) {
              e = _error;
              return queryManager.fatalError(e);
            }
          };
        })(this),
        error: (function(_this) {
          return function(jqxhr, textStatus, errorThrown) {
            var msg;
            if (!errorThrown) {
              errorThrown = "Cross-Origin error";
            }
            msg = errorThrown + " while fetching " + serverUrl;
            $('#' + _this.get_data_ontology_display_id()).remove();
            queryManager.fatalError(msg);
            if (error_callback != null) {
              return error_callback(jqxhr, textStatus, errorThrown, queryManager);
            }
          };
        })(this)
      });
      return queryManager;
    };

    Huviz.prototype.run_managed_query_worker = function(qry, serverUrl, args) {
      var queryManager;
      args.query = qry;
      args.serverUrl = serverUrl;
      queryManager = this.run_managed_query_abstract(args);
      return queryManager;
    };

    Huviz.prototype.sparql_graph_query_and_show__trigger = function(url) {
      var selectId;
      selectId = this.endpoint_loader.select_id;
      this.sparql_graph_query_and_show(url, selectId);
      $("#" + this.dataset_loader.uniq_id).children('select').prop('disabled', 'disabled');
      $("#" + this.ontology_loader.uniq_id).children('select').prop('disabled', 'disabled');
      return $("#" + this.script_loader.uniq_id).children('select').prop('disabled', 'disabled');
    };

    Huviz.prototype.sparql_graph_query_and_show = function(url, id, callback) {
      var args, graphSelector, handle_graphsNotFound, make_error_callback, make_success_handler, qry, spinner;
      qry = "# sparql_graph_query_and_show()\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nSELECT ?g ?label\nWHERE {\n  GRAPH ?g { } .\n  OPTIONAL {?g rdfs:label ?label}\n}\nORDER BY ?g";
      spinner = $("#sparqlGraphSpinner-" + id);
      spinner.css('display', 'block');
      graphSelector = "#sparqlGraphOptions-" + id;
      $(graphSelector).parent().css('display', 'none');
      this.sparqlQryInput_hide();
      this.disable_go_button();
      handle_graphsNotFound = (function(_this) {
        return function() {
          $(graphSelector).parent().css('display', 'none');
          _this.reset_endpoint_form(true);
          return _this.enable_go_button();
        };
      })(this);
      make_success_handler = (function(_this) {
        return function() {
          return function(data, textStatus, jqXHR, queryManager) {
            var graph, graph_options, graphsNotFound, j, json_check, json_data, label, len1, results;
            json_check = typeof data;
            if (json_check === 'string') {
              json_data = JSON.parse(data);
            } else {
              json_data = data;
            }
            results = json_data.results.bindings;
            queryManager.setResultCount(results.length);
            graphsNotFound = jQuery.isEmptyObject(results[0]);
            if (graphsNotFound) {
              handle_graphsNotFound();
              return;
            }
            graph_options = "<option id='" + (_this.unique_id()) + "' value='" + url + "'> All Graphs </option>";
            for (j = 0, len1 = results.length; j < len1; j++) {
              graph = results[j];
              if (graph.label != null) {
                label = " (" + graph.label.value + ")";
              } else {
                label = '';
              }
              graph_options = graph_options + ("<option id='" + (_this.unique_id()) + "' value='" + graph.g.value + "'>" + graph.g.value + label + "</option>");
            }
            $("#sparqlGraphOptions-" + id).html(graph_options);
            $(graphSelector).parent().css('display', 'block');
            _this.reset_endpoint_form(true);
            return _this.disable_go_button();
          };
        };
      })(this);
      make_error_callback = (function(_this) {
        return function() {
          return function(jqXHR, textStatus, errorThrown) {
            $(graphSelector).parent().css('display', 'none');
            spinner.css('visibility', 'hidden');
            handle_graphsNotFound();
            return _this.reset_endpoint_form(true);
          };
        };
      })(this);
      args = {
        success_handler: make_success_handler(),
        error_callback: make_error_callback()
      };
      args.query = qry;
      args.serverUrl = url;
      return this.sparql_graph_query_and_show_queryManager = this.run_managed_query_ajax(args);
    };

    Huviz.prototype.sparqlQryInput_hide = function() {
      return this.sparqlQryInput_JQElem.hide();
    };

    Huviz.prototype.sparqlQryInput_show = function() {
      this.sparqlQryInput_JQElem.show();
      return this.sparqlQryInput_JQElem.css({
        'color': 'inherit'
      });
    };

    Huviz.prototype.load_endpoint_data_and_show = function(subject, callback) {
      var args, fromGraph, make_success_handler, node_limit, qry, url;
      this.sparql_node_list = [];
      this.pfm_count('sparql');
      node_limit = this.endpoint_limit_JQElem.val();
      url = this.endpoint_loader.value;
      this.endpoint_loader.outstanding_requests = 0;
      fromGraph = '';
      if (this.endpoint_loader.endpoint_graph) {
        fromGraph = " FROM <" + this.endpoint_loader.endpoint_graph + "> ";
      }
      qry = "# load_endpoint_data_and_show('" + subject + "')\nSELECT * " + fromGraph + "\nWHERE {\n  {<" + subject + "> ?p ?o}\n  UNION\n  {{<" + subject + "> ?p ?o} .\n   {?o ?p2 ?o2}}\n  UNION\n  {{?s3 ?p3 <" + subject + ">} .\n   {?s3 ?p4 ?o4 }}\n}\nLIMIT " + node_limit;
      make_success_handler = (function(_this) {
        return function() {
          return function(data, textStatus, jqXHR, queryManager) {
            var endpoint, json_check, json_data;
            json_check = typeof data;
            if (json_check === 'string') {
              json_data = JSON.parse(data);
            } else {
              json_data = data;
            }
            queryManager.setResultCount(json_data.length);
            _this.add_nodes_from_SPARQL(json_data, subject, queryManager);
            endpoint = _this.endpoint_loader.value;
            _this.dataset_loader.disable();
            _this.ontology_loader.disable();
            _this.replace_loader_display_for_endpoint(endpoint, _this.endpoint_loader.endpoint_graph);
            _this.disable_go_button();
            _this.big_go_button.hide();
            return _this.after_file_loaded('sparql', callback);
          };
        };
      })(this);
      args = {
        query: qry,
        serverUrl: url,
        success_handler: make_success_handler()
      };
      return this.run_managed_query_ajax(args);
    };

    Huviz.prototype.add_nodes_from_SPARQL = function(json_data, subject, queryManager) {
      var a_node, context, data, i, j, language, len1, len2, len3, node, node_list_empty, node_not_in_list, obj_type, obj_val, p, plainLiteral, pred, q, ref, ref1, results, results1, snode, subj, z;
      data = '';
      context = this.get_context();
      plainLiteral = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";
      console.log("Adding node (i.e. fully exploring): " + subject);
      results = json_data.results.bindings;
      if (queryManager != null) {
        queryManager.setResultCount(results.length);
      }
      results1 = [];
      for (j = 0, len1 = results.length; j < len1; j++) {
        node = results[j];
        language = '';
        obj_type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";
        if (node.s) {
          subj = node.s.value;
          pred = node.p.value;
          obj_val = subject;
        } else if (node.o2) {
          subj = node.o.value;
          pred = node.p2.value;
          obj_val = node.o2.value;
          if (node.o2.type === 'literal' || node.o.type === 'typed-literal') {
            if (node.o2.datatype) {
              obj_type = node.o2.datatype;
            } else {
              obj_type = plainLiteral;
            }
            if (node.o2["xml:lang"]) {
              language = node.o2['xml:lang'];
            }
          }
        } else if (node.s3) {
          subj = node.s3.value;
          pred = node.p4.value;
          obj_val = node.o4.value;
          if (node.o4.type === 'literal' || node.o4.type === 'typed-literal') {
            if (node.o4.datatype) {
              obj_type = node.o4.datatype;
            } else {
              obj_type = plainLiteral;
            }
            if (node.o4["xml:lang"]) {
              language = node.o4['xml:lang'];
            }
          }
        } else {
          subj = subject;
          pred = node.p.value;
          obj_val = node.o.value;
          if (node.o.type === 'literal' || node.o.type === 'typed-literal') {
            if (node.o.datatype) {
              obj_type = node.o.datatype;
            } else {
              obj_type = plainLiteral;
            }
            if (node.o["xml:lang"]) {
              language = node.o['xml:lang'];
            }
          }
        }
        q = {
          g: context,
          s: subj,
          p: pred,
          o: {
            type: obj_type,
            value: obj_val
          }
        };
        if (language) {
          q.o.language = language;
        }
        node_list_empty = this.sparql_node_list.length;
        if (node_list_empty === 0) {
          this.sparql_node_list.push(q);
          node_not_in_list = true;
        } else {
          ref = this.sparql_node_list;
          for (p = 0, len2 = ref.length; p < len2; p++) {
            snode = ref[p];
            if (q.s === snode.s && q.p === snode.p && q.o.value === snode.o.value && q.o.type === snode.o.type && q.o.language === snode.o.language) {
              node_not_in_list = false;
              if (snode.s === subject || snode.o.value === subject) {
                ref1 = this.all_set;
                for (i = z = 0, len3 = ref1.length; z < len3; i = ++z) {
                  a_node = ref1[i];
                  if (a_node.id === subject) {
                    this.all_set[i].fully_loaded = true;
                  }
                }
              }
              break;
            } else {
              node_not_in_list = true;
            }
          }
        }
        if (node_not_in_list) {
          this.sparql_node_list.push(q);
          node_not_in_list = false;
          results1.push(this.add_quad(q, subject));
        } else {
          results1.push(void 0);
        }
      }
      return results1;
    };

    Huviz.prototype.add_nodes_from_SPARQL_Worker = function(queryTarget, callback) {
      var graph, local_node_added, previous_nodes, queryManager, queryManagerArgs, query_limit, timeout, url, worker;
      console.log("Make request for new query and load nodes");
      timeout = this.get_sparql_timeout_msec();
      queryManagerArgs = {
        timeout: timeout
      };
      queryManager = null;
      this.pfm_count('sparql');
      url = this.endpoint_loader.value;
      if (this.sparql_node_list) {
        previous_nodes = this.sparql_node_list;
      } else {
        previous_nodes = [];
      }
      graph = this.endpoint_loader.endpoint_graph;
      local_node_added = 0;
      query_limit = 1000;
      worker = new Worker('/huviz/sparql_ajax_query.js');
      worker.addEventListener('message', (function(_this) {
        return function(e) {
          var a_node, add_fully_loaded, error, i, j, len1, len2, p, quad, ref, ref1;
          if (e.data.method_name === 'log_query') {
            queryManagerArgs.query = "#SPARQL_Worker\n" + e.data.qry;
            queryManagerArgs.serverUrl = url;
            queryManager = _this.run_managed_query_abstract(queryManagerArgs);
            return;
          } else if (e.data.method_name !== 'accept_results') {
            error = new Error("expecting either data.method = 'log_query' or 'accept_results'");
            queryManager.fatalError(error);
            throw error;
          }
          add_fully_loaded = e.data.fully_loaded_index;
          ref = e.data.results;
          for (j = 0, len1 = ref.length; j < len1; j++) {
            quad = ref[j];
            _this.add_quad(quad);
            _this.sparql_node_list.push(quad);
            local_node_added++;
          }
          queryManager.setResultCount(local_node_added);
          queryManager.cancelAnimation();
          if (local_node_added) {
            queryManager.setSuccessColor();
          } else {
            queryManager.setNoneColor();
          }
          ref1 = _this.all_set;
          for (i = p = 0, len2 = ref1.length; p < len2; i = ++p) {
            a_node = ref1[i];
            if (a_node.id === queryTarget) {
              _this.all_set[i].fully_loaded = true;
            }
          }
          _this.endpoint_loader.outstanding_requests = _this.endpoint_loader.outstanding_requests - 1;
          _this.shelved_set.resort();
          _this.tick("Tick in add_nodes_from_SPARQL_worker");
          _this.update_all_counts();
          if (callback != null) {
            return callback();
          }
        };
      })(this));
      return worker.postMessage({
        target: queryTarget,
        url: url,
        graph: graph,
        limit: query_limit,
        timeout: timeout,
        previous_nodes: previous_nodes
      });
    };

    Huviz.prototype.using_sparql = function() {
      return !!((this.endpoint_loader != null) && this.endpoint_loader.value);
    };

    Huviz.prototype.outstanding_sparql_requests_are_capped = function() {
      return !(this.endpoint_loader.outstanding_requests < this.max_outstanding_sparql_requests);
    };

    Huviz.prototype.get_neighbors_via_sparql = function(chosen, callback) {
      var maxReq, msg;
      if (!chosen.fully_loaded) {
        maxReq = this.max_outstanding_sparql_requests;
        if (!this.outstanding_sparql_requests_are_capped()) {
          this.endpoint_loader.outstanding_requests++;
          this.add_nodes_from_SPARQL_Worker(chosen.id, callback);
          console.log("outstanding_requests: " + this.endpoint_loader.outstanding_requests);
        } else {
          msg = "SPARQL requests capped at " + maxReq;
          console.info(msg);
        }
      }
    };

    Huviz.prototype.show_and_hide_links_from_node = function(d) {
      this.show_links_from_node(d);
      return this.hide_links_from_node(d);
    };

    Huviz.prototype.get_container_width = function(pad) {
      var tabs_width, w_width;
      pad = pad || hpad;
      w_width = (this.container.clientWidth || window.innerWidth || document.documentElement.clientWidth || document.clientWidth) - pad;
      tabs_width = 0;
      if (this.tabsJQElem && this.tabsJQElem.length > 0) {
        tabs_width = this.tabsJQElem.width();
      }
      return this.width = w_width - tabs_width;
    };

    Huviz.prototype.get_container_height = function(pad) {
      pad = pad || hpad;
      this.height = (this.container.clientHeight || window.innerHeight || document.documentElement.clientHeight || document.clientHeight) - pad;
      if (this.args.stay_square) {
        this.height = this.width;
      }
      return this.height;
    };

    Huviz.prototype.update_graph_radius = function() {
      this.graph_region_radius = Math.floor(Math.min(this.width / 2, this.height / 2));
      return this.graph_radius = this.graph_region_radius * this.shelf_radius;
    };

    Huviz.prototype.update_graph_center = function() {
      this.cy = this.height / 2;
      if (this.off_center) {
        this.cx = this.width - this.graph_region_radius;
      } else {
        this.cx = this.width / 2;
      }
      this.my = this.cy * 2;
      return this.mx = this.cx * 2;
    };

    Huviz.prototype.update_lariat_zone = function() {
      return this.lariat_center = [this.cx, this.cy];
    };

    Huviz.prototype.update_discard_zone = function() {
      this.discard_ratio = .1;
      this.discard_radius = this.graph_radius * this.discard_ratio;
      return this.discard_center = [this.width - this.discard_radius * 3, this.height - this.discard_radius * 3];
    };

    Huviz.prototype.set_search_regex = function(text) {
      return this.search_regex = new RegExp(text || "^$", "ig");
    };

    Huviz.prototype.update_searchterm = function() {
      var text;
      text = $(this).text();
      this.set_search_regex(text);
      return this.restart();
    };

    Huviz.prototype.dump_locations = function(srch, verbose, func) {
      var pattern;
      verbose = verbose || false;
      pattern = new RegExp(srch, "ig");
      return nodes.forEach((function(_this) {
        return function(node, i) {
          if (!node.name.match(pattern)) {
            if (verbose) {
              console.log(pattern, "does not match!", node.name);
            }
            return;
          }
          if (func) {
            console.log(func.call(node));
          }
          if (!func || verbose) {
            return _this.dump_details(node);
          }
        };
      })(this));
    };

    Huviz.prototype.get_node_by_id = function(node_id, throw_on_fail) {
      var obj;
      throw_on_fail = throw_on_fail || false;
      obj = this.nodes.get_by('id', node_id);
      if ((obj == null) && throw_on_fail) {
        throw new Error("node with id <" + node_id + "> not found");
      }
      return obj;
    };

    Huviz.prototype.update_showing_links = function(n) {
      var old_status;
      old_status = n.showing_links;
      if (n.links_shown.length === 0) {
        n.showing_links = "none";
      } else {
        if (n.links_from.length + n.links_to.length > n.links_shown.length) {
          n.showing_links = "some";
        } else {
          n.showing_links = "all";
        }
      }
      if (old_status === n.showing_links) {
        return null;
      }
      return old_status === "none" || n.showing_links === "all";
    };

    Huviz.prototype.should_show_link = function(edge) {
      var d, e, ss, ts;
      ss = edge.source.state;
      ts = edge.target.state;
      d = this.discarded_set;
      e = this.embryonic_set;
      return !(ss === d || ts === d || ss === e || ts === e);
    };

    Huviz.prototype.add_link = function(e) {
      this.add_to(e, e.source.links_from);
      this.add_to(e, e.target.links_to);
      if (this.should_show_link(e)) {
        this.show_link(e);
      }
      this.update_showing_links(e.source);
      this.update_showing_links(e.target);
      return this.update_state(e.target);
    };

    Huviz.prototype.remove_link = function(edge_id) {
      var e;
      e = this.links_set.get_by('id', edge_id);
      if (e == null) {
        console.log("remove_link(" + edge_id + ") not found!");
        return;
      }
      this.remove_from(e, e.source.links_shown);
      this.remove_from(e, e.target.links_shown);
      this.links_set.remove(e);
      console.log("removing links from: " + e.id);
      this.update_showing_links(e.source);
      this.update_showing_links(e.target);
      this.update_state(e.target);
      return this.update_state(e.source);
    };

    Huviz.prototype.show_link = function(edge, incl_discards) {
      if ((!incl_discards) && (edge.target.state === this.discarded_set || edge.source.state === this.discarded_set)) {
        return;
      }
      this.add_to(edge, edge.source.links_shown);
      this.add_to(edge, edge.target.links_shown);
      this.links_set.add(edge);
      edge.show();
      this.update_state(edge.source);
      return this.update_state(edge.target);
    };

    Huviz.prototype.unshow_link = function(edge) {
      this.remove_from(edge, edge.source.links_shown);
      this.remove_from(edge, edge.target.links_shown);
      this.links_set.remove(edge);
      edge.unshow();
      this.update_state(edge.source);
      return this.update_state(edge.target);
    };

    Huviz.prototype.show_links_to_node = function(n, incl_discards) {
      incl_discards = incl_discards || false;
      n.links_to.forEach((function(_this) {
        return function(e, i) {
          return _this.show_link(e, incl_discards);
        };
      })(this));
      this.update_showing_links(n);
      this.update_state(n);
      this.force.links(this.links_set);
      if (!this.args.skip_log_tick) {
        console.log("Tick in @force.links(@links_set) show_links_to_node");
      }
      return this.restart();
    };

    Huviz.prototype.update_state = function(node) {
      if (node.state === this.graphed_set && node.links_shown.length === 0) {
        this.shelved_set.acquire(node);
        this.unpin(node);
      }
      if (node.state !== this.graphed_set && node.links_shown.length > 0) {
        return this.graphed_set.acquire(node);
      }
    };

    Huviz.prototype.hide_links_to_node = function(n) {
      n.links_to.forEach((function(_this) {
        return function(e, i) {
          _this.remove_from(e, n.links_shown);
          _this.remove_from(e, e.source.links_shown);
          e.unshow();
          _this.links_set.remove(e);
          _this.remove_ghosts(e);
          _this.update_state(e.source);
          _this.update_showing_links(e.source);
          return _this.update_showing_links(e.target);
        };
      })(this));
      this.update_state(n);
      this.force.links(this.links_set);
      if (!this.args.skip_log_tick) {
        console.log("Tick in @force.links() hide_links_to_node");
      }
      return this.restart();
    };

    Huviz.prototype.show_links_from_node = function(n, incl_discards) {
      incl_discards = incl_discards || false;
      n.links_from.forEach((function(_this) {
        return function(e, i) {
          return _this.show_link(e, incl_discards);
        };
      })(this));
      this.update_state(n);
      this.force.links(this.links_set);
      if (!this.args.skip_log_tick) {
        console.log("Tick in @force.links() show_links_from_node");
      }
      return this.restart();
    };

    Huviz.prototype.hide_links_from_node = function(n) {
      n.links_from.forEach((function(_this) {
        return function(e, i) {
          _this.remove_from(e, n.links_shown);
          _this.remove_from(e, e.target.links_shown);
          e.unshow();
          _this.links_set.remove(e);
          _this.remove_ghosts(e);
          _this.update_state(e.target);
          _this.update_showing_links(e.source);
          return _this.update_showing_links(e.target);
        };
      })(this));
      this.force.links(this.links_set);
      if (!this.args.skip_log_tick) {
        console.log("Tick in @force.links hide_links_from_node");
      }
      return this.restart();
    };

    Huviz.prototype.attach_predicate_to_its_parent = function(a_pred) {
      var parent_id, parent_pred;
      parent_id = this.ontology.subPropertyOf[a_pred.lid] || 'anything';
      if (parent_id != null) {
        parent_pred = this.get_or_create_predicate_by_id(parent_id);
        a_pred.register_superclass(parent_pred);
      }
    };

    Huviz.prototype.get_or_create_predicate_by_id = function(sid) {
      var obj_id, obj_n;
      obj_id = this.make_qname(sid);
      obj_n = this.predicate_set.get_by('id', obj_id);
      if (obj_n == null) {
        obj_n = new Predicate(obj_id);
        this.predicate_set.add(obj_n);
        this.attach_predicate_to_its_parent(obj_n);
      }
      return obj_n;
    };

    Huviz.prototype.clean_up_dirty_predicates = function() {
      var pred;
      pred = this.predicate_set.get_by('id', 'anything');
      if (pred != null) {
        return pred.clean_up_dirt();
      }
    };

    Huviz.prototype.clean_up_dirty_taxons = function() {
      if (this.taxonomy.Thing != null) {
        return this.taxonomy.Thing.clean_up_dirt();
      }
    };

    Huviz.prototype.clean_up_all_dirt_once = function() {
      if (this.clean_up_all_dirt_onceRunner == null) {
        this.clean_up_all_dirt_onceRunner = new OnceRunner(0, 'clean_up_all_dirt_once');
      }
      return this.clean_up_all_dirt_onceRunner.setTimeout(this.clean_up_all_dirt, 300);
    };

    Huviz.prototype.clean_up_all_dirt = function() {
      this.clean_up_dirty_taxons();
      this.clean_up_dirty_predicates();
    };

    Huviz.prototype.prove_OnceRunner = function(timeout) {
      var yahoo;
      if (this.prove_OnceRunner_inst == null) {
        this.prove_OnceRunner_inst = new OnceRunner(30);
      }
      yahoo = function() {
        return alert('yahoo!');
      };
      return this.prove_OnceRunner_inst.setTimeout(yahoo, timeout);
    };

    Huviz.prototype.get_or_create_context_by_id = function(sid) {
      var obj_id, obj_n;
      obj_id = this.make_qname(sid);
      obj_n = this.context_set.get_by('id', obj_id);
      if (obj_n == null) {
        obj_n = {
          id: obj_id
        };
        this.context_set.add(obj_n);
      }
      return obj_n;
    };

    Huviz.prototype.get_or_create_node_by_id = function(uri, name, isLiteral) {
      var node;
      node = this.nodes.get_by('id', uri);
      if (node == null) {
        node = this.embryonic_set.get_by('id', uri);
      }
      if (node == null) {
        node = new Node(uri);
        if (this.use_lid_as_node_name && (node.name == null) && (name == null)) {
          name = node.lid;
        }
        if (isLiteral != null) {
          node.isLiteral = isLiteral;
        }
        if (node.id == null) {
          alert("new Node('" + uri + "') has no id");
        }
        this.embryonic_set.add(node);
      }
      if (node.type == null) {
        node.type = "Thing";
      }
      if (node.lid == null) {
        node.lid = uniquer(node.id);
      }
      if (node.name == null) {
        if (name == null) {
          name = this.ontology.label[node.lid] || null;
        }
        this.set_name(node, name);
      }
      return node;
    };

    Huviz.prototype.develop = function(node) {
      if ((node.embryo != null) && this.is_ready(node)) {
        this.hatch(node);
        return true;
      }
      return false;
    };

    Huviz.prototype.hatch = function(node) {
      var new_set, start_point;
      node.lid = uniquer(node.id);
      this.embryonic_set.remove(node);
      new_set = this.get_default_set_by_type(node);
      if (new_set != null) {
        new_set.acquire(node);
      }
      this.assign_types(node, "hatch");
      start_point = [this.cx, this.cy];
      node.point(start_point);
      node.prev_point([start_point[0] * 1.01, start_point[1] * 1.01]);
      this.add_node_ghosts(node);
      this.update_showing_links(node);
      this.nodes.add(node);
      this.recolor_node(node);
      this.tick("Tick in hatch");
      this.pfm_count('hatch');
      return node;
    };

    Huviz.prototype.get_or_create_transient_node = function(subjNode, point) {
      var isLiteral, name, nom, transient_id, transient_node;
      transient_id = '_:_transient';
      nom = "↪";
      nom = " ";
      transient_node = this.get_or_create_node_by_id(transient_id, (name = nom), (isLiteral = false));
      this.move_node_to_point(transient_node, {
        x: subjNode.x,
        y: subjNode.y
      });
      transient_node.radius = 0;
      transient_node.charge = 20;
      return transient_node;
    };

    Huviz.prototype.make_nodes = function(g, limit) {
      var count, ref, results1, subj, subj_uri, subject;
      limit = limit || 0;
      count = 0;
      ref = g.subjects;
      results1 = [];
      for (subj_uri in ref) {
        subj = ref[subj_uri];
        subject = subj;
        this.get_or_make_node(subject, [this.width / 2, this.height / 2], false);
        count++;
        if (limit && count >= limit) {
          break;
        } else {
          results1.push(void 0);
        }
      }
      return results1;
    };

    Huviz.prototype.make_links = function(g, limit) {
      limit = limit || 0;
      this.nodes.some((function(_this) {
        return function(node, i) {
          var subj;
          subj = node.s;
          _this.show_links_from_node(_this.nodes[i]);
          if ((limit > 0) && (_this.links_set.length >= limit)) {
            return true;
          }
        };
      })(this));
      return this.restart();
    };

    Huviz.prototype.hide_node_links = function(node) {
      node.links_shown.forEach((function(_this) {
        return function(e, i) {
          _this.links_set.remove(e);
          if (e.target === node) {
            _this.remove_from(e, e.source.links_shown);
            _this.update_state(e.source);
            e.unshow();
            _this.update_showing_links(e.source);
          } else {
            _this.remove_from(e, e.target.links_shown);
            _this.update_state(e.target);
            e.unshow();
            _this.update_showing_links(e.target);
          }
          return _this.remove_ghosts(e);
        };
      })(this));
      node.links_shown = [];
      this.update_state(node);
      return this.update_showing_links(node);
    };

    Huviz.prototype.hide_found_links = function() {
      this.nodes.forEach((function(_this) {
        return function(node, i) {
          if (node.name.match(search_regex)) {
            return _this.hide_node_links(node);
          }
        };
      })(this));
      return this.restart();
    };

    Huviz.prototype.discard_found_nodes = function() {
      this.nodes.forEach((function(_this) {
        return function(node, i) {
          if (node.name.match(search_regex)) {
            return _this.discard(node);
          }
        };
      })(this));
      return this.restart();
    };

    Huviz.prototype.show_node_links = function(node) {
      this.show_links_from_node(node);
      this.show_links_to_node(node);
      return this.update_showing_links(node);
    };

    Huviz.prototype.toggle_display_tech = function(ctrl, tech) {
      var val;
      val = void 0;
      tech = ctrl.parentNode.id;
      if (tech === "use_canvas") {
        this.use_canvas = !this.use_canvas;
        if (!this.use_canvas) {
          this.clear_canvas();
        }
        val = this.use_canvas;
      }
      if (tech === "use_svg") {
        this.use_svg = !this.use_svg;
        val = this.use_svg;
      }
      if (tech === "use_webgl") {
        this.use_webgl = !this.use_webgl;
        val = this.use_webgl;
      }
      ctrl.checked = val;
      this.tick("Tick in toggle_display_tech");
      return true;
    };

    Huviz.prototype.label = function(branded) {
      this.labelled_set.add(branded);
    };

    Huviz.prototype.unlabel = function(anonymized) {
      this.labelled_set.remove(anonymized);
    };

    Huviz.prototype.get_point_from_polar_coords = function(polar) {
      var degrees, radians, range;
      range = polar.range, degrees = polar.degrees;
      radians = 2 * Math.PI * (degrees - 90) / 360;
      return [this.cx + range * Math.cos(radians) * this.graph_region_radius, this.cy + range * Math.sin(radians) * this.graph_region_radius];
    };

    Huviz.prototype.pin = function(node, cmd) {
      var pin_point;
      if (node.state === this.graphed_set) {
        if ((cmd != null) && cmd.polar_coords) {
          pin_point = this.get_point_from_polar_coords(cmd.polar_coords);
          node.prev_point(pin_point);
        }
        this.pinned_set.add(node);
        return true;
      }
      return false;
    };

    Huviz.prototype.unpin = function(node) {
      if (node.fixed) {
        this.pinned_set.remove(node);
        return true;
      }
      return false;
    };

    Huviz.prototype.pin_at_center = function(node) {
      var cmd;
      cmd = {
        polar_coords: {
          range: 0,
          degrees: 0
        }
      };
      return this.pin(node, cmd);
    };

    Huviz.prototype.unlink = function(unlinkee) {
      this.hide_links_from_node(unlinkee);
      this.hide_links_to_node(unlinkee);
      this.shelved_set.acquire(unlinkee);
      this.update_showing_links(unlinkee);
      return this.update_state(unlinkee);
    };

    Huviz.prototype.discard = function(goner) {
      var shown;
      this.unpin(goner);
      this.unlink(goner);
      this.discarded_set.acquire(goner);
      shown = this.update_showing_links(goner);
      this.unselect(goner);
      return goner;
    };

    Huviz.prototype.undiscard = function(prodigal) {
      if (this.discarded_set.has(prodigal)) {
        this.shelved_set.acquire(prodigal);
        this.update_showing_links(prodigal);
        this.update_state(prodigal);
      }
      return prodigal;
    };

    Huviz.prototype.shelve = function(goner) {
      var shownness;
      this.unpin(goner);
      this.chosen_set.remove(goner);
      this.hide_node_links(goner);
      this.shelved_set.acquire(goner);
      shownness = this.update_showing_links(goner);
      if (goner.links_shown.length > 0) {
        console.log("shelving failed for", goner);
      }
      return goner;
    };

    Huviz.prototype.suppress = function(suppressee) {
      console.log("suppress(", suppressee, ")");
      this.unpin(suppressee);
      this.chosen_set.remove(suppressee);
      this.hide_node_links(suppressee);
      this.shelved_set.remove(suppressee);
      this.update_showing_links(suppressee);
      this.suppressed_set.acquire(suppressee);
      return suppressee;
    };

    Huviz.prototype.choose = function(chosen, callback_after_choosing) {
      var callback_after_getting_neighbors, shownness;
      if (this.using_sparql() && !chosen.fully_loaded && !this.outstanding_sparql_requests_are_capped()) {
        callback_after_getting_neighbors = (function(_this) {
          return function() {
            return _this.choose(chosen, callback_after_choosing);
          };
        })(this);
        this.get_neighbors_via_sparql(chosen, callback_after_getting_neighbors);
        return;
      }
      this.chosen_set.add(chosen);
      this.nowChosen_set.add(chosen);
      this.graphed_set.acquire(chosen);
      this.show_links_from_node(chosen);
      this.show_links_to_node(chosen);
      this.update_state(chosen);
      shownness = this.update_showing_links(chosen);
      if (callback_after_choosing != null) {
        callback_after_choosing();
      }
      return chosen;
    };

    Huviz.prototype.unchoose = function(unchosen) {
      var j, link, ref;
      this.chosen_set.remove(unchosen);
      ref = unchosen.links_shown;
      for (j = ref.length - 1; j >= 0; j += -1) {
        link = ref[j];
        if (link != null) {
          if (!((link.target.chosen != null) || (link.source.chosen != null))) {
            this.unshow_link(link);
          }
        } else {
          console.log("there is a null in the .links_shown of", unchosen);
        }
      }
      return this.update_state(unchosen);
    };

    Huviz.prototype.wander__atFirst = function() {
      var j, len1, node, ref, results1;
      if (!this.wasChosen_set.clear()) {
        throw new Error("expecting wasChosen to be empty");
      }
      ref = this.chosen_set;
      results1 = [];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        node = ref[j];
        results1.push(this.wasChosen_set.add(node));
      }
      return results1;
    };

    Huviz.prototype.wander__atLast = function() {
      var j, len1, node, nowRollCall, removed, wasRollCall;
      wasRollCall = this.wasChosen_set.roll_call();
      nowRollCall = this.nowChosen_set.roll_call();
      removed = this.wasChosen_set.filter((function(_this) {
        return function(node) {
          return !_this.nowChosen_set.includes(node);
        };
      })(this));
      for (j = 0, len1 = removed.length; j < len1; j++) {
        node = removed[j];
        this.unchoose(node);
        this.wasChosen_set.remove(node);
      }
      if (!this.nowChosen_set.clear()) {
        throw new Error("the nowChosen_set should be empty after clear()");
      }
    };

    Huviz.prototype.wander = function(chosen) {
      return this.choose(chosen);
    };

    Huviz.prototype.unwalk = function(node) {
      this.walked_set.remove(node);
      delete node.walkedIdx0;
    };

    Huviz.prototype.walkBackTo = function(existingStep) {
      var j, pathNode, ref, removed;
      removed = [];
      ref = this.walked_set;
      for (j = ref.length - 1; j >= 0; j += -1) {
        pathNode = ref[j];
        if (pathNode === existingStep) {
          break;
        }
        this.unchoose(pathNode);
        this.shave(pathNode);
        this.unwalk(pathNode);
        removed.push(pathNode);
      }
      return removed;
    };

    Huviz.prototype.walkBackAll = function() {
      return this.walkBackTo(null);
    };

    Huviz.prototype.walk = function(nextStep) {
      var do_after_chosen, lastWalked, tooHairy;
      tooHairy = null;
      if (nextStep.walked) {
        this.walkBackTo(nextStep);
        this.choose(nextStep);
        return;
      }
      if (this.walked_set.length) {
        lastWalked = this.walked_set.slice(-1)[0];
        if (this.nodesAreAdjacent(nextStep, lastWalked)) {
          tooHairy = lastWalked;
        } else {
          this.walkBackAll();
        }
      }
      do_after_chosen = (function(_this) {
        return function() {
          if (tooHairy) {
            return _this.shave(tooHairy);
          }
        };
      })(this);
      nextStep.walkedIdx0 = this.walked_set.length;
      if (!nextStep.walked) {
        this.walked_set.add(nextStep);
      }
      this.choose(nextStep, do_after_chosen);
    };

    Huviz.prototype.nodesAreAdjacent = function(n1, n2) {
      var busyNode, j, len1, len2, link, lonelyNode, p, ref, ref1, ref2, ref3;
      if ((n1.links_from.length + n1.links_to.length) > (n2.links_from.length + n2.links_to.length)) {
        ref = [n2, n1], lonelyNode = ref[0], busyNode = ref[1];
      } else {
        ref1 = [n1, n2], lonelyNode = ref1[0], busyNode = ref1[1];
      }
      ref2 = lonelyNode.links_from;
      for (j = 0, len1 = ref2.length; j < len1; j++) {
        link = ref2[j];
        if (link.target === busyNode) {
          return true;
        }
      }
      ref3 = lonelyNode.links_to;
      for (p = 0, len2 = ref3.length; p < len2; p++) {
        link = ref3[p];
        if (link.source === busyNode) {
          return true;
        }
      }
      return false;
    };

    Huviz.prototype.shave = function(tooHairy) {
      var j, link, ref;
      ref = tooHairy.links_shown;
      for (j = ref.length - 1; j >= 0; j += -1) {
        link = ref[j];
        if (link != null) {
          if ((link.target.walked == null) || (link.source.walked == null)) {
            this.unshow_link(link);
          }
          if (!this.edgeIsOnWalkedPath(link)) {
            this.unshow_link(link);
          }
        } else {
          console.log("there is a null in the .links_shown of", unchosen);
        }
      }
      return this.update_state(tooHairy);
    };

    Huviz.prototype.edgeIsOnWalkedPath = function(edge) {
      return this.nodesAreAdjacentOnWalkedPath(edge.target, edge.source);
    };

    Huviz.prototype.nodesAreAdjacentOnWalkedPath = function(n1, n2) {
      var larger, n1idx0, n2idx0, smaller;
      n1idx0 = n1.walkedIdx0;
      n2idx0 = n2.walkedIdx0;
      if ((n1idx0 != null) && (n2idx0 != null)) {
        larger = Math.max(n1idx0, n2idx0);
        smaller = Math.min(n1idx0, n2idx0);
        if (larger - smaller === 1) {
          return true;
        }
      }
      return false;
    };

    Huviz.prototype.distinguish = function(node) {
      var emeritus;
      emeritus = this.distinguished_node;
      if (this.emeritus != null) {
        delete emeritus._is_distinguished;
      }
      if (node != null) {
        node._is_distinguished = true;
      }
      this.distinguished_node = node;
      return emeritus;
    };

    Huviz.prototype.hide = function(goner) {
      var shownness;
      this.unpin(goner);
      this.chosen_set.remove(goner);
      this.hidden_set.acquire(goner);
      this.selected_set.remove(goner);
      goner.unselect();
      this.hide_node_links(goner);
      this.update_state(goner);
      return shownness = this.update_showing_links(goner);
    };

    Huviz.prototype.select = function(node) {
      var msg;
      if (node.selected == null) {
        this.selected_set.add(node);
        if (node.select != null) {
          node.select();
          return this.recolor_node(node);
        } else {
          msg = node.__proto__.constructor.name + " " + node.id + " lacks .select()";
          throw msg;
          return console.error(msg, node);
        }
      }
    };

    Huviz.prototype.unselect = function(node) {
      if (node.selected != null) {
        this.selected_set.remove(node);
        node.unselect();
        this.recolor_node(node);
      }
    };

    Huviz.prototype.connect = function(node) {
      if (node !== this.focused_node) {
        console.info("connect('" + node.lid + "') SKIPPING because it is not the focused node");
        return;
      }
      this.editui.set_state('seeking_object');
      this.editui.set_subject_node(node);
      this.transient_node = this.get_or_create_transient_node(node);
      this.editui.set_object_node(this.transient_node);
      this.dragging = this.transient_node;
      return console.log(this.transient_node.state.id);
    };

    Huviz.prototype.set_unique_color = function(uniqcolor, set, node) {
      var old_node;
      if (set.uniqcolor == null) {
        set.uniqcolor = {};
      }
      old_node = set.uniqcolor[uniqcolor];
      if (old_node) {
        old_node.color = old_node.uniqucolor_orig;
        delete old_node.uniqcolor_orig;
      }
      set.uniqcolor[uniqcolor] = node;
      node.uniqcolor_orig = node.color;
      node.color = uniqcolor;
    };

    Huviz.prototype.animate_hunt = function(array, sought_node, mid_node, prior_node, pos) {
      var cmd, cmdArgs, edge, pred_uri, trail_pred;
      pred_uri = 'hunt:trail';
      if (mid_node) {
        mid_node.color = 'black';
        mid_node.radius = 100;
        this.label(mid_node);
      }
      if (prior_node) {
        this.ensure_predicate_lineage(pred_uri);
        trail_pred = this.get_or_create_predicate_by_id(pred_uri);
        edge = this.get_or_create_Edge(mid_node, prior_node, trail_pred, 'http://universal.org');
        edge.label = JSON.stringify(pos);
        this.infer_edge_end_types(edge);
        edge.color = this.gclui.predicate_picker.get_color_forId_byName(trail_pred.lid, 'showing');
        this.add_edge(edge);
      }
      if (pos.done) {
        cmdArgs = {
          verbs: ['show'],
          regarding: [pred_uri],
          sets: [this.shelved_set.id]
        };
        cmd = new gcl.GraphCommand(this, cmdArgs);
        this.run_command(cmd);
        return this.clean_up_all_dirt_once();
      }
    };

    Huviz.prototype.hunt = function(node) {
      this.animate_hunt(this.shelved_set, node, null, null, {});
      return this.shelved_set.binary_search(node, false, this.animate_hunt);
    };

    Huviz.prototype.recolor_node = function(n, default_color) {
      var color, j, len1, ref, results1, taxon_id;
      if (default_color == null) {
        default_color = 'black';
      }
      if (n._types == null) {
        n._types = [];
      }
      if (this.color_nodes_as_pies && n._types.length > 1) {
        n._colors = [];
        ref = n._types;
        results1 = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          taxon_id = ref[j];
          if (typeof taxon_id === 'string') {
            color = this.get_color_for_node_type(n, taxon_id) || default_color;
            results1.push(n._colors.push(color));
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      } else {
        return n.color = this.get_color_for_node_type(n, n.type);
      }
    };

    Huviz.prototype.get_color_for_node_type = function(node, type) {
      var state;
      state = (node.selected != null) && "emphasizing" || "showing";
      return this.gclui.taxon_picker.get_color_forId_byName(type, state);
    };

    Huviz.prototype.recolor_nodes = function() {
      var j, len1, node, ref, results1;
      if (this.nodes) {
        ref = this.nodes;
        results1 = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          node = ref[j];
          results1.push(this.recolor_node(node));
        }
        return results1;
      }
    };

    Huviz.prototype.toggle_selected = function(node) {
      if (node.selected != null) {
        this.unselect(node);
      } else {
        this.select(node);
      }
      this.update_all_counts();
      this.regenerate_english();
      return this.tick("Tick in toggle_selected");
    };

    Huviz.prototype.get_snippet_url = function(snippet_id) {
      if (snippet_id.match(/http\:/)) {
        return snippet_id;
      } else {
        return "" + window.location.origin + (this.get_snippetServer_path(snippet_id));
      }
    };

    Huviz.prototype.get_snippetServer_path = function(snippet_id) {
      var ref, which;
      if ((ref = this.data_uri) != null ? ref.match('poetesses') : void 0) {
        console.info(this.data_uri, this.data_uri.match('poetesses'));
        which = "poetesses";
      } else {
        which = "orlando";
      }
      return "/snippet/" + which + "/" + snippet_id + "/";
    };

    Huviz.prototype.make_edge_inspector_id = function(edge) {
      var id;
      id = edge.id.replace(new RegExp(' ', 'g'), '_');
      return id;
    };

    Huviz.prototype.get_snippet_js_key = function(snippet_id) {
      return "K_" + snippet_id;
    };

    Huviz.prototype.get_snippet = function(snippet_id, callback) {
      var snippet_js_key, snippet_text, url;
      console.warn("get_snippet('" + snippet_id + "') should no longer be called");
      snippet_js_key = this.get_snippet_js_key(snippet_id);
      snippet_text = this.snippet_db[snippet_js_key];
      url = this.get_snippet_url(snippet_id);
      if (snippet_text) {
        callback(null, {
          response: snippet_text,
          already_has_snippet_id: true
        });
      } else {
        d3.xhr(url, callback);
      }
      return "got it";
    };

    Huviz.prototype.clear_snippets = function(evt) {
      if ((evt != null) && (evt.target != null) && !$(evt.target).hasClass('close_all_snippets_button')) {
        return false;
      }
      this.currently_printed_snippets = {};
      this.snippet_positions_filled = {};
      $('.snippet_dialog_box').remove();
    };

    Huviz.prototype.init_snippet_box = function() {
      if (d3.select('#snippet_box')[0].length > 0) {
        return this.snippet_box = d3.select('#snippet_box');
      }
    };

    Huviz.prototype.remove_snippet = function(snippet_id) {
      var key, slctr;
      key = this.get_snippet_js_key(snippet_id);
      delete this.currently_printed_snippets[key];
      if (this.snippet_box) {
        slctr = '#' + id_escape(snippet_id);
        console.log(slctr);
        return this.snippet_box.select(slctr).remove();
      }
    };

    Huviz.prototype.push_snippet = function(obj, msg) {
      var bomb_parent, close_all_button, dialog_args, dlg, elem, my_position, snip_div;
      console.log("push_snippet");
      if (this.snippet_box) {
        snip_div = this.snippet_box.append('div').attr('class', 'snippet');
        snip_div.html(msg);
        $(snip_div[0][0]).addClass("snippet_dialog_box");
        my_position = this.get_next_snippet_position(obj.snippet_js_key);
        dialog_args = {
          minWidth: 400,
          title: obj.dialog_title,
          position: {
            my: my_position,
            at: "left top",
            of: window
          },
          close: (function(_this) {
            return function(event, ui) {
              event.stopPropagation();
              delete _this.snippet_positions_filled[my_position];
              delete _this.currently_printed_snippets[event.target.id];
            };
          })(this)
        };
        dlg = $(snip_div).dialog(dialog_args);
        elem = dlg[0][0];
        elem.setAttribute("id", obj.snippet_js_key);
        bomb_parent = $(elem).parent().select(".ui-dialog-titlebar").children().first();
        close_all_button = bomb_parent.append('<button type="button" class="ui-button ui-corner-all ui-widget close-all" role="button" title="Close All""><img class="close_all_snippets_button" src="close_all.png" title="Close All"></button>');
        close_all_button.on('click', this.clear_snippets);
      }
    };

    Huviz.prototype.snippet_positions_filled = {};

    Huviz.prototype.snippet_position_str_to_obj = function(str) {
      var left, ref, top;
      ref = str.replace(new RegExp('([a-z]*)\\+', 'g'), '').split(' ').map(function(c) {
        return parseInt(c);
      }), left = ref[0], top = ref[1];
      return {
        left: left,
        top: top
      };
    };

    Huviz.prototype.get_next_snippet_position_obj = function(id) {
      return this.snippet_position_str_to_obj(this.get_next_snippet_position(id));
    };

    Huviz.prototype.get_next_snippet_position = function(id) {
      var height, hinc, hoff, left_full, retval, top_full, vinc, voff, width;
      if (id == null) {
        id = true;
      }
      height = this.height;
      width = this.width;
      left_full = false;
      top_full = false;
      hinc = 0;
      vinc = this.snippet_size;
      hoff = 0;
      voff = 0;
      retval = "left+" + hoff + " top+" + voff;
      while (this.snippet_positions_filled[retval] != null) {
        hoff = hinc + hoff;
        voff = vinc + voff;
        retval = "left+" + hoff + " top+" + voff;
        if (!left_full && voff + vinc + vinc > height) {
          left_full = true;
          hinc = this.snippet_size;
          hoff = 0;
          voff = 0;
          vinc = 0;
        }
        if (!top_full && hoff + hinc + hinc + hinc > width) {
          top_full = true;
          hinc = 30;
          vinc = 30;
          hoff = 0;
          voff = 0;
        }
      }
      this.snippet_positions_filled[retval] = id;
      return retval;
    };

    Huviz.prototype.remove_tags = function(xml) {
      return xml.replace(XML_TAG_REGEX, " ").replace(MANY_SPACES_REGEX, " ");
    };

    Huviz.prototype.peek = function(node) {
      var was_already_peeking;
      was_already_peeking = false;
      if (this.peeking_node != null) {
        if (this.peeking_node === node) {
          was_already_peeking = true;
        }
        this.recolor_node(this.peeking_node);
        this.unflag_all_edges(this.peeking_node);
      }
      if (!was_already_peeking) {
        this.peeking_node = node;
        return this.peeking_node.color = PEEKING_COLOR;
      }
    };

    Huviz.prototype.unflag_all_edges = function(node) {
      var edge, j, len1, ref, results1;
      ref = node.links_shown;
      results1 = [];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        edge = ref[j];
        results1.push(edge.focused = false);
      }
      return results1;
    };

    Huviz.prototype.hilight_dialog = function(dialog_elem) {
      var dialog_id;
      if (typeof dialog_elem === 'string') {
        throw new Error('hilight_dialog() expects an Elem, not ' + dialog_elem);
      } else {
        dialog_id = dialog_elem.getAttribute('id');
      }
      $(dialog_elem).parent().append(dialog_elem);
      $(dialog_elem).effect('shake');
    };

    Huviz.prototype.print_edge = function(edge) {
      var cb, context, context_no, edge_inspector_id, j, len1, make_callback, me, ref, results1;
      context_no = 0;
      ref = edge.contexts;
      results1 = [];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        context = ref[j];
        edge_inspector_id = this.make_edge_inspector_id(edge, context);
        context_no++;
        if (this.currently_printed_snippets[edge_inspector_id] != null) {
          this.hilight_dialog(edge._inspector || edge_inspector_id);
          continue;
        }
        console.log("inspect edge:", edge);
        me = this;
        make_callback = (function(_this) {
          return function(context_no, edge, context) {
            return function(err, data) {
              var quad, snippet_id, snippet_js_key, snippet_text;
              data = data || {
                response: ""
              };
              snippet_text = data.response;
              if (!data.already_has_snippet_id) {
                snippet_text = me.remove_tags(snippet_text);
                snippet_text += '<br><code class="snippet_id">' + context.id + "</code>";
              }
              snippet_id = context.id;
              snippet_js_key = me.get_snippet_js_key(snippet_id);
              if (me.currently_printed_snippets[edge_inspector_id] == null) {
                me.currently_printed_snippets[edge_inspector_id] = [];
              }
              me.currently_printed_snippets[edge_inspector_id].push(edge);
              me.snippet_db[edge_inspector_id] = snippet_text;
              me.printed_edge = edge;
              quad = {
                subj_uri: edge.source.id,
                pred_uri: edge.predicate.id,
                graph_uri: edge.graph.id
              };
              if (edge.target.isLiteral) {
                quad.obj_val = edge.target.name.toString();
              } else {
                quad.obj_uri = edge.target.id;
              }
              return me.push_snippet({
                edge_inspector_id: edge_inspector_id,
                edge: edge,
                pred_id: edge.predicate.lid,
                pred_name: edge.predicate.name,
                context_id: context.id,
                quad: quad,
                dialog_title: edge.source.name,
                snippet_text: snippet_text,
                no: context_no,
                snippet_js_key: snippet_js_key
              });
            };
          };
        })(this);
        cb = make_callback(context_no, edge, context);
        results1.push(cb());
      }
      return results1;
    };

    Huviz.prototype.print = function(node) {
      var edge, j, len1, ref;
      this.clear_snippets();
      ref = node.links_shown;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        edge = ref[j];
        this.print_edge(edge);
      }
    };

    Huviz.prototype.redact = function(node) {
      return node.links_shown.forEach((function(_this) {
        return function(edge, i) {
          return _this.remove_snippet(edge.id);
        };
      })(this));
    };

    Huviz.prototype.draw_edge_regarding = function(node, predicate_lid) {
      var dirty, doit;
      dirty = false;
      doit = (function(_this) {
        return function(edge, i, frOrTo) {
          if (edge.predicate.lid === predicate_lid) {
            if (edge.shown == null) {
              _this.show_link(edge);
              return dirty = true;
            }
          }
        };
      })(this);
      node.links_from.forEach((function(_this) {
        return function(edge, i) {
          return doit(edge, i, 'from');
        };
      })(this));
      node.links_to.forEach((function(_this) {
        return function(edge, i) {
          return doit(edge, i, 'to');
        };
      })(this));
      if (dirty) {
        this.update_state(node);
        this.update_showing_links(node);
        this.force.alpha(0.1);
        if (!this.args.skip_log_tick) {
          console.log("Tick in @force.alpha draw_edge_regarding");
        }
      }
    };

    Huviz.prototype.undraw_edge_regarding = function(node, predicate_lid) {
      var dirty, doit;
      dirty = false;
      doit = (function(_this) {
        return function(edge, i, frOrTo) {
          if (edge.predicate.lid === predicate_lid) {
            dirty = true;
            return _this.unshow_link(edge);
          }
        };
      })(this);
      node.links_from.forEach((function(_this) {
        return function(edge, i) {
          return doit(edge, i, 'from');
        };
      })(this));
      node.links_to.forEach((function(_this) {
        return function(edge, i) {
          return doit(edge, i, 'to');
        };
      })(this));
      if (dirty) {
        this.update_state(node);
        this.update_showing_links(node);
        this.force.alpha(0.1);
      }
    };

    Huviz.prototype.update_history = function() {
      var n_chosen, the_state, the_title, the_url;
      if (window.history.pushState) {
        the_state = {};
        hash = "";
        if (chosen_set.length) {
          the_state.chosen_node_ids = [];
          hash += "#";
          hash += "chosen=";
          n_chosen = chosen_set.length;
          this.chosen_set.forEach((function(_this) {
            return function(chosen, i) {
              hash += chosen.id;
              the_state.chosen_node_ids.push(chosen.id);
              if (n_chosen > i + 1) {
                return hash += ",";
              }
            };
          })(this));
        }
        the_url = location.href.replace(location.hash, "") + hash;
        the_title = document.title;
        return window.history.pushState(the_state, the_title, the_state);
      }
    };

    Huviz.prototype.restore_graph_state = function(state) {
      if (!state) {
        return;
      }
      if (state.chosen_node_ids) {
        this.reset_graph();
        return state.chosen_node_ids.forEach((function(_this) {
          return function(chosen_id) {
            var chosen;
            chosen = get_or_make_node(chosen_id);
            if (chosen) {
              return _this.choose(chosen);
            }
          };
        })(this));
      }
    };

    Huviz.prototype.fire_showgraph_event = function() {
      return window.dispatchEvent(new CustomEvent('showgraph', {
        detail: {
          message: "graph shown",
          time: new Date()
        },
        bubbles: true,
        cancelable: true
      }));
    };

    Huviz.prototype.showGraph = function(g) {
      alert("showGraph called");
      this.make_nodes(g);
      if (window.CustomEvent != null) {
        this.fire_showgraph_event();
      }
      return this.restart();
    };

    Huviz.prototype.show_the_edges = function() {};

    Huviz.prototype.register_gclc_prefixes = function() {
      var abbr, prefix, ref, results1;
      this.gclc.prefixes = {};
      ref = this.G.prefixes;
      results1 = [];
      for (abbr in ref) {
        prefix = ref[abbr];
        results1.push(this.gclc.prefixes[abbr] = prefix);
      }
      return results1;
    };

    Huviz.prototype.init_datasetDB = function() {
      var indexedDB, request;
      indexedDB = window.indexedDB;
      if (!indexedDB) {
        console.log("indexedDB not available");
      }
      if (!this.datasetDB && indexedDB) {
        this.dbName = 'datasetDB';
        this.dbVersion = 2;
        request = indexedDB.open(this.dbName, this.dbVersion);
        request.onsuccess = (function(_this) {
          return function(evt) {
            _this.datasetDB = request.result;
            _this.datasetDB.onerror = function(err) {
              return alert("Database error: " + e.target.errorCode);
            };
            return _this.populate_menus_from_IndexedDB('onsuccess');
          };
        })(this);
        request.onerror = (function(_this) {
          return function(err) {
            return alert("unable to init " + _this.dbName);
          };
        })(this);
        return request.onupgradeneeded = (function(_this) {
          return function(event) {
            var db, objectStore;
            db = event.target.result;
            objectStore = db.createObjectStore("datasets", {
              keyPath: 'uri'
            });
            return objectStore.transaction.oncomplete = function(evt) {
              _this.datasetDB = db;
              return _this.populate_menus_from_IndexedDB('onupgradeneeded');
            };
          };
        })(this);
      }
    };

    Huviz.prototype.ensure_datasets = function(preload_group, store_in_db) {
      var defaults, ds_rec, j, k, len1, ref, results1;
      defaults = preload_group.defaults || {};
      ref = preload_group.datasets;
      results1 = [];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        ds_rec = ref[j];
        for (k in defaults) {
          if (ds_rec[k] == null) {
            ds_rec[k] = defaults[k];
          }
        }
        results1.push(this.ensure_dataset(ds_rec, store_in_db));
      }
      return results1;
    };

    Huviz.prototype.ensure_dataset = function(rsrcRec, store_in_db) {
      var uri;
      uri = rsrcRec.uri;
      if (rsrcRec.time == null) {
        rsrcRec.time = new Date().toString();
      }
      if (rsrcRec.title == null) {
        rsrcRec.title = uri;
      }
      if (rsrcRec.isUri == null) {
        rsrcRec.isUri = !!uri.match(/^(http|ftp)/);
      }
      if (rsrcRec.canDelete == null) {
        rsrcRec.canDelete = !(rsrcRec.time == null);
      }
      if (rsrcRec.label == null) {
        rsrcRec.label = uri.split('/').reverse()[0];
      }
      if (rsrcRec.isOntology) {
        if (this.ontology_loader) {
          this.ontology_loader.add_resource(rsrcRec, store_in_db);
        }
      }
      if (this.dataset_loader && !rsrcRec.isEndpoint) {
        this.dataset_loader.add_resource(rsrcRec, store_in_db);
      }
      if (rsrcRec.isEndpoint && this.endpoint_loader) {
        return this.endpoint_loader.add_resource(rsrcRec, store_in_db);
      }
    };

    Huviz.prototype.add_resource_to_db = function(rsrcRec, callback) {
      var req, store, trx;
      trx = this.datasetDB.transaction('datasets', "readwrite");
      trx.oncomplete = (function(_this) {
        return function(e) {
          return console.log(rsrcRec.uri + " added!");
        };
      })(this);
      trx.onerror = (function(_this) {
        return function(e) {
          console.log(e);
          return alert("add_resource(" + rsrcRec.uri + ") error!!!");
        };
      })(this);
      store = trx.objectStore('datasets');
      req = store.put(rsrcRec);
      return req.onsuccess = (function(_this) {
        return function(e) {
          if (rsrcRec.isEndpoint) {
            _this.sparql_graph_query_and_show__trigger(e.srcElement.result);
          }
          if (rsrcRec.uri !== e.target.result) {
            console.debug("rsrcRec.uri (" + rsrcRec.uri + ") is expected to equal", e.target.result);
          }
          return callback(rsrcRec);
        };
      })(this);
    };

    Huviz.prototype.remove_dataset_from_db = function(dataset_uri, callback) {
      var req, store, trx;
      trx = this.datasetDB.transaction('datasets', "readwrite");
      trx.oncomplete = (function(_this) {
        return function(e) {
          return console.log(dataset_uri + " deleted");
        };
      })(this);
      trx.onerror = (function(_this) {
        return function(e) {
          console.log(e);
          return alert("remove_dataset_from_db(" + dataset_uri + ") error!!!");
        };
      })(this);
      store = trx.objectStore('datasets');
      req = store["delete"](dataset_uri);
      req.onsuccess = (function(_this) {
        return function(e) {
          if (callback != null) {
            return callback(dataset_uri);
          }
        };
      })(this);
      return req.onerror = (function(_this) {
        return function(e) {
          return console.debug(e);
        };
      })(this);
    };

    Huviz.prototype.get_resource_from_db = function(rsrcUri, callback) {
      var req, store, trx;
      trx = this.datasetDB.transaction('datasets', "readwrite");
      trx.oncomplete = (function(_this) {
        return function(evt) {
          return console.log("get_resource_from_db('" + rsrcUri + "') complete, either by success or error");
        };
      })(this);
      trx.onerror = (function(_this) {
        return function(err) {
          console.log(err);
          if (callback != null) {
            return callback(err, null);
          } else {
            alert("get_resource_from_db(" + rsrcUri + ") error!!!");
            throw err;
          }
        };
      })(this);
      store = trx.objectStore('datasets');
      req = store.get(rsrcUri);
      req.onsuccess = (function(_this) {
        return function(event) {
          if (callback != null) {
            return callback(null, event.target.result);
          }
        };
      })(this);
      req.onerror = (function(_this) {
        return function(err) {
          console.debug("get_resource_from_db('" + rsrcUri + "') onerror ==>", err);
          if (callback) {
            return callback(err, null);
          } else {
            throw err;
          }
        };
      })(this);
    };

    Huviz.prototype.populate_menus_from_IndexedDB = function(why) {
      var count, datasetDB_objectStore, make_onsuccess_handler;
      console.debug("populate_menus_from_IndexedDB(" + why + ")");
      datasetDB_objectStore = this.datasetDB.transaction('datasets').objectStore('datasets');
      count = 0;
      make_onsuccess_handler = (function(_this) {
        return function(why) {
          var recs;
          recs = [];
          return function(event) {
            var cursor, legacyDataset, legacyOntology, rec, ref;
            cursor = event.target.result;
            if (cursor) {
              count++;
              rec = cursor.value;
              recs.push(rec);
              legacyDataset = !rec.isOntology && !rec.rsrcType;
              legacyOntology = !!rec.isOntology;
              if (((ref = rec.rsrcType) === 'dataset' || ref === 'ontology') || legacyDataset || legacyOntology) {
                _this.dataset_loader.add_resource_option(rec);
              }
              if (rec.rsrcType === 'ontology' || legacyOntology) {
                _this.ontology_loader.add_resource_option(rec);
              }
              if (rec.rsrcType === 'script') {
                _this.script_loader.add_resource_option(rec);
              }
              if (rec.rsrcType === 'endpoint') {
                _this.endpoint_loader.add_resource_option(rec);
              }
              return cursor["continue"]();
            } else {
              _this.dataset_loader.val();
              _this.ontology_loader.val();
              _this.endpoint_loader.val();
              _this.script_loader.val();
              _this.update_dataset_ontology_loader();
              console.groupEnd();
              return document.dispatchEvent(new Event('dataset_ontology_loader_ready'));
            }
          };
        };
      })(this);
      if (this.dataset_loader != null) {
        return datasetDB_objectStore.openCursor().onsuccess = make_onsuccess_handler(why);
      }
    };

    Huviz.prototype.preload_datasets = function() {
      var j, len1, preload_group_or_uri, ref;
      console.groupCollapsed("preload_datasets");
      console.log(this.args.preload);
      if (this.args.preload) {
        ref = this.args.preload;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          preload_group_or_uri = ref[j];
          if (typeof preload_group_or_uri === 'string') {
            $.ajax({
              async: false,
              url: preload_group_or_uri,
              success: (function(_this) {
                return function(data, textStatus) {
                  return _this.ensure_datasets_from_XHR(data);
                };
              })(this),
              error: function(jqxhr, textStatus, errorThrown) {
                return console.error(preload_group_or_uri + " " + textStatus + " " + errorThrown.toString());
              }
            });
          } else if (typeof preload_group_or_uri === 'object') {
            this.ensure_datasets(preload_group_or_uri);
          } else {
            console.error("bad member of @args.preload:", preload_group_or_uri);
          }
        }
      }
      return console.groupEnd();
    };

    Huviz.prototype.preload_endpoints = function() {
      var j, len1, preload_group_or_uri, ref;
      console.log(this.args.preload_endpoints);
      console.groupCollapsed("preload_endpoints");
      if (this.args.preload_endpoints) {
        ref = this.args.preload_endpoints;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          preload_group_or_uri = ref[j];
          console.log(preload_group_or_uri);
          if (typeof preload_group_or_uri === 'string') {
            $.ajax({
              async: false,
              url: preload_group_or_uri,
              success: (function(_this) {
                return function(data, textStatus) {
                  return _this.ensure_datasets_from_XHR(data);
                };
              })(this),
              error: function(jqxhr, textStatus, errorThrown) {
                return console.error(preload_group_or_uri + " " + textStatus + " " + errorThrown.toString());
              }
            });
          } else if (typeof preload_group_or_uri === 'object') {
            this.ensure_datasets(preload_group_or_uri);
          } else {
            console.error("bad member of @args.preload:", preload_group_or_uri);
          }
        }
      }
      return console.groupEnd();
    };

    Huviz.prototype.ensure_datasets_from_XHR = function(preload_group) {
      this.ensure_datasets(preload_group, false);
    };

    Huviz.prototype.get_menu_by_rsrcType = function(rsrcType) {
      return this[rsrcType + '_loader'];
    };

    Huviz.prototype.get_or_create_sel_for_picker = function(specificSel) {
      var huvis_controls_sel, pickersId, sel;
      sel = specificSel;
      if (sel == null) {
        if (this.pickersSel == null) {
          pickersId = this.unique_id('pickers_');
          this.pickersSel = '#' + pickersId;
          if ((huvis_controls_sel = this.oldToUniqueTabSel['huvis_controls'])) {
            if (this.huvis_controls_elem == null) {
              this.huvis_controls_elem = document.querySelector(huvis_controls_sel);
            }
            if (this.huvis_controls_elem) {
              this.huvis_controls_elem.insertAdjacentHTML('beforeend', "<div id=\"" + pickersId + "\"></div>");
            }
          }
        }
        sel = this.pickersSel;
      }
      return sel;
    };

    Huviz.prototype.init_resource_menus = function() {
      var dataset_selector, endpoint_selector, ontology_selector, script_selector, sel;
      if (!this.dataset_loader && this.args.make_pickers) {
        sel = this.get_or_create_sel_for_picker(this.args.dataset_loader__append_to_sel);
        this.dataset_loader = new PickOrProvide(this, sel, 'Dataset', 'DataPP', false, false, {
          rsrcType: 'dataset'
        });
      }
      if (!this.ontology_loader && this.args.make_pickers) {
        sel = this.get_or_create_sel_for_picker(this.args.ontology_loader__append_to_sel);
        this.ontology_loader = new PickOrProvide(this, sel, 'Ontology', 'OntoPP', true, false, {
          rsrcType: 'ontology'
        });
      }
      if (!this.script_loader && this.args.make_pickers) {
        sel = this.get_or_create_sel_for_picker(this.args.script_loader__append_to_sel);
        this.script_loader = new PickOrProvideScript(this, sel, 'Script', 'ScriptPP', false, false, {
          dndLoaderClass: DragAndDropLoaderOfScripts,
          rsrcType: 'script'
        });
      }
      if (!this.endpoint_loader && this.args.make_pickers) {
        sel = this.get_or_create_sel_for_picker(this.args.endpoint_loader__append_to_sel);
        this.endpoint_loader = new PickOrProvide(this, sel, 'Sparql', 'EndpointPP', false, true, {
          rsrcType: 'endpoint'
        });
      }
      if (this.endpoint_loader && !this.big_go_button) {
        this.build_sparql_form();
        endpoint_selector = "#" + this.endpoint_loader.select_id;
        $(endpoint_selector).change(this.update_endpoint_form);
      }
      if (this.ontology_loader && !this.big_go_button) {
        this.big_go_button_id = this.unique_id('goButton_');
        this.big_go_button = $('<button class="big_go_button">LOAD</button>');
        this.big_go_button.attr('id', this.big_go_button_id);
        $(this.get_or_create_sel_for_picker()).append(this.big_go_button);
        this.big_go_button.click(this.big_go_button_onclick);
        this.disable_go_button();
      }
      if (this.ontology_loader || this.dataset_loader || this.script_loader && !this.big_go_button) {
        ontology_selector = "#" + this.ontology_loader.select_id;
        $(ontology_selector).change(this.update_dataset_forms);
        dataset_selector = "#" + this.dataset_loader.select_id;
        $(dataset_selector).change(this.update_dataset_forms);
        script_selector = "#" + this.script_loader.select_id;
        $(script_selector).change(this.update_dataset_forms);
      }
      this.init_datasetDB();
      this.preload_datasets();
      if (this.ontology_loader.last_val) {
        return this.ontology_loader.last_val = null;
      }
    };

    Huviz.prototype.big_go_button_onclick = function(event) {
      if (this.using_sparql()) {
        return this.big_go_button_onclick_sparql(event);
      }
      this.visualize_dataset_using_ontology();
    };

    Huviz.prototype.big_go_button_onclick_sparql = function(event) {
      var endpoint_label_uri, foundUri, graphUri, spoQuery;
      if (this.allGraphsChosen()) {
        if ((foundUri = this.endpoint_labels_JQElem.val())) {
          this.visualize_dataset_using_ontology();
          return;
        }
        colorlog("IGNORING. The LOAD button should not even be clickable right now");
        return;
      }
      if ((endpoint_label_uri = this.endpoint_labels_JQElem.val())) {
        this.visualize_dataset_using_ontology();
        return;
      }
      if ((graphUri = this.sparqlGraphSelector_JQElem.val())) {
        if ((spoQuery = this.spo_query_JQElem.val())) {
          this.displayTheSpoQuery(spoQuery, graphUri);
          return;
        }
        this.displayTheChosenGraph(graphUri);
        return;
      }
      colorlog("IGNORING.  Neither graph nor endpoint_label is chosen.");
    };

    Huviz.prototype.displayTheChosenGraph = function(graphUri) {
      var args, limit;
      args = {
        success_handler: this.display_graph_success_handler,
        result_handler: this.name_result_handler,
        query_terms: {
          g: graphUri
        }
      };
      if ((limit = this.endpoint_limit_JQElem.val())) {
        args.limit = limit;
      }
      args.query = this.make_generic_query(args);
      this.run_generic_query(args);
    };

    Huviz.prototype.displayTheSpoQuery = function(spoQuery, graphUri) {
      var args, limit;
      args = {
        success_handler: this.display_graph_success_handler,
        result_handler: this.name_result_handler,
        query: spoQuery,
        query_terms: {
          g: graphUri
        }
      };
      if ((limit = this.endpoint_limit_JQElem.val())) {
        args.limit = limit;
      }
      this.run_generic_query(args);
    };

    Huviz.prototype.make_generic_query = function(in_args) {
      var args, j, len1, lines, pattern, ref, term, terms, val;
      args = this.compose_object_from_defaults_and_incoming(this.default_name_query_args, in_args);
      terms = args.query_terms || {};
      lines = ["SELECT *"];
      if (terms.g != null) {
        lines.push("FROM <" + terms.g + ">");
      }
      lines.push("WHERE {");
      pattern = "  ";
      ref = 'spo'.split('');
      for (j = 0, len1 = ref.length; j < len1; j++) {
        term = ref[j];
        val = terms[term];
        if (val != null) {
          pattern += "<" + val + "> ";
        } else {
          pattern += "?" + term + " ";
        }
      }
      pattern += ".";
      lines.push(pattern);
      lines.push("}");
      if (args.limit) {
        lines.push("LIMIT " + args.limit);
      }
      return lines.join("\n");
    };

    Huviz.prototype.run_generic_query = function(args) {
      var serverSpec, serverType, serverUrl;
      serverSpec = this.get_server_for_dataset(args.query_terms.g);
      serverType = serverSpec.serverType, serverUrl = serverSpec.serverUrl;
      args.serverUrl = serverUrl;
      args.serverType = serverType;
      switch (serverType) {
        case 'sparql':
          this.run_managed_query_ajax(args);
          break;
        default:
          throw new Error("don't know how to handle serverType: '" + serverType + "'");
      }
    };

    Huviz.prototype.domain2sparqlEndpoint = {
      'cwrc.ca': 'http://sparql.cwrc.ca/sparql',
      'getty.edu': 'http://vocab.getty.edu/sparql.tsv',
      'openstreetmap.org': 'https://sophox.org/sparql',
      'dbpedia.org': "http://dbpedia.org/sparql",
      'viaf.org': "http://data.linkeddatafragments.org/viaf",
      '*': "http://data.linkeddatafragments.org/lov"
    };

    Huviz.prototype.get_server_for_dataset = function(datasetUri) {
      var aUrl, domain, hostname, hostname_parts, serverType, serverUrl;
      aUrl = new URL(datasetUri);
      hostname = aUrl.hostname;
      hostname_parts = hostname.split('.');
      if (hostname_parts.length > 2) {
        while (hostname_parts.length > 2) {
          hostname_parts.shift();
        }
        domain = hostname_parts.join('.');
      } else {
        domain = hostname;
      }
      if (this.using_sparql() && this.sparqlGraphSelector_JQElem.val() === datasetUri) {
        serverType = 'sparql';
        serverUrl = this.endpoint_loader.value;
      } else if ((serverUrl = this.domain2sparqlEndpoint[domain])) {
        serverType = 'sparql';
      } else if ((serverUrl = this.domain2sparqlEndpoint['*'])) {
        serverType = 'sparql';
      } else {
        throw new Error("a server could not be found for " + datasetUri);
      }
      return {
        serverType: serverType,
        serverUrl: serverUrl
      };
    };

    Huviz.prototype.update_dataset_forms = function(e) {
      var dat_val, ont_val, scr_val;
      ont_val = $("#" + this.ontology_loader.select_id).val();
      dat_val = $("#" + this.dataset_loader.select_id).val();
      scr_val = $("#" + this.script_loader.select_id).val();
      if (ont_val === '' && dat_val === '' && scr_val === '') {
        return $("#" + this.endpoint_loader.uniq_id).children('select').prop('disabled', false);
      } else {
        return $("#" + this.endpoint_loader.uniq_id).children('select').prop('disabled', 'disabled');
      }
    };

    Huviz.prototype.update_graph_form = function(e) {
      console.log(e.currentTarget.value);
      return this.endpoint_loader.endpoint_graph = e.currentTarget.value;
    };

    Huviz.prototype.turn_on_loading_notice_if_enabled = function() {
      if (!this.display_loading_notice) {
        return;
      }
      return setTimeout(this.turn_on_loading_notice);
    };

    Huviz.prototype.loading_notice_markdown = "## Loading....\n<div class=\"loadingNotice\">Please wait</div>";

    Huviz.prototype.turn_on_loading_notice = function() {
      var args;
      colorlog('turn_on_loading_notice()', 'green');
      this.disable_go_button();
      args = {
        width: 550
      };
      return this.my_loading_notice_dialog = this.make_markdown_dialog(this.loading_notice_markdown, null, args);
    };

    Huviz.prototype.turn_off_loading_notice_if_enabled = function() {
      if (!this.display_loading_notice) {
        return;
      }
      return setTimeout(this.turn_off_loading_notice);
    };

    Huviz.prototype.turn_off_loading_notice = function() {
      colorlog('turn_off_loading_notice()', 'green');
      return this.my_loading_notice_dialog.remove();
    };

    Huviz.prototype.visualize_dataset_using_ontology = function(ignoreEvent, dataset, ontologies) {
      var alreadyCommands, data, endpoint_label_uri, onto, scriptUri;
      colorlog('visualize_dataset_using_ontology()');
      this.turn_on_loading_notice_if_enabled();
      this.close_blurt_box();
      endpoint_label_uri = this.endpoint_labels_JQElem.val();
      if (endpoint_label_uri) {
        data = dataset || this.endpoint_loader;
        this.load_endpoint_data_and_show(endpoint_label_uri);
        console.warn("disable_dataset_ontology_loader() SHOULD BE CALLED ONLY ONCE");
        this.disable_dataset_ontology_loader_AUTOMATICALLY();
        this.update_browser_title(data);
        this.update_caption(data.value, data.endpoint_graph);
        return;
      }
      alreadyCommands = (this.gclui.command_list != null) && this.gclui.command_list.length;
      alreadyCommands = this.gclui.future_cmdArgs.length > 0;
      if (this.script_loader.value && !alreadyCommands) {
        scriptUri = this.script_loader.value;
        this.get_resource_from_db(scriptUri, this.load_script_from_db);
        return;
      }
      onto = ontologies && ontologies[0] || this.ontology_loader;
      data = dataset || this.dataset_loader;
      if (!(onto.value && data.value)) {
        console.debug(data, onto);
        this.update_dataset_forms();
        throw new Error("Now whoa-up pardner... both data and onto should have .value");
      }
      this.load_data_with_onto(data, onto, this.after_visualize_dataset_using_ontology);
      this.update_browser_title(data);
      this.update_caption(data.value, onto.value);
    };

    Huviz.prototype.after_visualize_dataset_using_ontology = function() {
      this.turn_off_loading_notice_if_enabled();
      if (this.discover_geonames_remaining) {
        return this.preset_discover_geonames_remaining();
      }
    };

    Huviz.prototype.load_script_from_db = function(err, rsrcRec) {
      if (err != null) {
        return this.blurt(err, 'error');
      } else {
        return this.load_script_from_JSON(this.parse_script_file(rsrcRec.data, rsrcRec.uri));
      }
    };

    Huviz.prototype.init_gclc = function() {
      var j, len1, pid, ref;
      this.gclc = new GraphCommandLanguageCtrl(this);
      this.init_resource_menus();
      if (this.gclui == null) {
        this.gclui = new CommandController(this, d3.select(this.args.gclui_sel)[0][0], this.hierarchy);
      }
      window.addEventListener('showgraph', this.register_gclc_prefixes);
      window.addEventListener('newpredicate', this.gclui.handle_newpredicate);
      if (!this.show_class_instance_edges) {
        TYPE_SYNS.forEach((function(_this) {
          return function(pred_id, i) {
            return _this.gclui.ignore_predicate(pred_id);
          };
        })(this));
      }
      NAME_SYNS.forEach((function(_this) {
        return function(pred_id, i) {
          return _this.gclui.ignore_predicate(pred_id);
        };
      })(this));
      ref = this.predicates_to_ignore;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        pid = ref[j];
        this.gclui.ignore_predicate(pid);
      }
    };

    Huviz.prototype.disable_dataset_ontology_loader_AUTOMATICALLY = function() {
      var endpoint;
      endpoint = {
        value: this.endpoint_loader.value,
        label: this.endpoint_loader.value,
        limit: this.endpoint_limit_JQElem.val(),
        graph: {
          value: this.sparqlGraphSelector_JQElem.val(),
          label: this.sparqlGraphSelector_JQElem.val()
        },
        item: {
          value: this.endpoint_labels_JQElem.val(),
          label: this.endpoint_labels_JQElem.val()
        }
      };
      this.disable_dataset_ontology_loader(null, null, endpoint);
    };

    Huviz.prototype.disable_dataset_ontology_loader = function(data, onto, endpoint) {
      this.replace_loader_display(data, onto, endpoint);
      this.disable_go_button();
      this.dataset_loader.disable();
      this.ontology_loader.disable();
      this.big_go_button.hide();
    };

    Huviz.prototype.reset_dataset_ontology_loader = function() {
      $('#' + this.get_data_ontology_display_id()).remove();
      this.dataset_loader.enable();
      this.ontology_loader.enable();
      this.big_go_button.show();
      $("#" + this.dataset_loader.select_id + " option[label='Pick or Provide...']").prop('selected', true);
      this.gclui_JQElem.removeAttr("style", "display:none");
    };

    Huviz.prototype.update_dataset_ontology_loader = function(args) {
      var ugb;
      if (!((this.dataset_loader != null) && (this.ontology_loader != null) && (this.endpoint_loader != null) && (this.script_loader != null))) {
        console.log("still building loaders...");
        return;
      }
      this.set_ontology_from_dataset_if_possible(args);
      ugb = (function(_this) {
        return function() {
          return _this.update_go_button();
        };
      })(this);
      return setTimeout(ugb, 200);
    };

    Huviz.prototype.update_endpoint_form = function(e) {
      var graphSelector;
      graphSelector = "#sparqlGraphOptions-" + e.currentTarget.id;
      $(graphSelector).change(this.update_graph_form);
      if (e.currentTarget.value === '') {
        $("#" + this.dataset_loader.uniq_id).children('select').prop('disabled', false);
        $("#" + this.ontology_loader.uniq_id).children('select').prop('disabled', false);
        $("#" + this.script_loader.uniq_id).children('select').prop('disabled', false);
        $(graphSelector).parent().css('display', 'none');
        return this.reset_endpoint_form(false);
      } else if (e.currentTarget.value === 'provide') {
        return console.log("update_endpoint_form ... select PROVIDE");
      } else {
        this.sparql_graph_query_and_show(e.currentTarget.value, e.currentTarget.id);
        $("#" + this.dataset_loader.uniq_id).children('select').prop('disabled', 'disabled');
        $("#" + this.ontology_loader.uniq_id).children('select').prop('disabled', 'disabled');
        return $("#" + this.script_loader.uniq_id).children('select').prop('disabled', 'disabled');
      }
    };

    Huviz.prototype.reset_endpoint_form = function(show) {
      var spinner;
      spinner = $("#sparqlGraphSpinner-" + this.endpoint_loader.select_id);
      spinner.css('display', 'none');
      this.endpoint_labels_JQElem.prop('disabled', false).val("");
      this.endpoint_limit_JQElem.prop('disabled', false).val(this.sparql_query_default_limit);
      if (show) {
        return this.sparqlQryInput_show();
      } else {
        return this.sparqlQryInput_hide();
      }
    };

    Huviz.prototype.disable_go_button = function() {
      var disable;
      this.update_go_button((disable = true));
    };

    Huviz.prototype.enable_go_button = function() {
      var disable;
      this.update_go_button((disable = false));
    };

    Huviz.prototype.update_go_button = function(disable) {
      var ds_on, ds_v, on_v;
      if (disable == null) {
        if (this.script_loader.value) {
          disable = false;
        } else if (this.using_sparql()) {
          disable = false;
        } else {
          ds_v = this.dataset_loader.value;
          on_v = this.ontology_loader.value;
          disable = (!(ds_v && on_v)) || ('provide' === ds_v || 'provide' === on_v);
          ds_on = ds_v + " AND " + on_v;
        }
      }
      this.big_go_button.prop('disabled', disable);
    };

    Huviz.prototype.get_reload_uri = function() {
      return this.reload_uri || new URL(window.location);
    };

    Huviz.prototype.generate_reload_uri = function(dataset, ontology, endpoint) {
      var uri;
      this.reload_uri = uri = new URL(document.location);
      if (dataset && ontology) {
        uri.hash = "load+" + dataset.value + "+with+" + ontology.value;
      } else if (endpoint) {
        uri.hash = "query+" + encodeURIComponent(endpoint.value);
        if (endpoint.graph && endpoint.graph.value) {
          uri.hash += "+from+" + encodeURIComponent(endpoint.graph.value);
        }
        if (endpoint.item && endpoint.item.value) {
          uri.hash += "+seeking+" + encodeURIComponent(endpoint.item.value);
        }
        if (endpoint.limit) {
          uri.hash += "+limit+" + encodeURIComponent(endpoint.limit);
        }
      }
      return uri;
    };

    Huviz.prototype.get_data_ontology_display_id = function() {
      if (this.data_ontology_display_id == null) {
        this.data_ontology_display_id = this.unique_id('datontdisp_');
      }
      return this.data_ontology_display_id;
    };

    Huviz.prototype.hide_pickers = function() {
      return $(this.pickersSel).attr("style", "display:none");
    };

    Huviz.prototype.replace_loader_display = function(dataset, ontology, endpoint) {
      var vis_src_args;
      this.generate_reload_uri(dataset, ontology, endpoint);
      this.hide_pickers();
      vis_src_args = {
        uri: this.get_reload_uri(),
        dataset: dataset,
        ontology: ontology,
        endpoint: endpoint,
        script: "TODO include script stuff here"
      };
      this.render_visualization_source_display(vis_src_args);
    };

    Huviz.prototype.render_visualization_source_display = function(vis_src_args) {
      var add_reload_button, controls, dataset, endpoint, ontology, reload_html, script, sel, shareable_link_button, show_shareable_link_closure, source_html, uri, visualization_source_display;
      dataset = vis_src_args.dataset, ontology = vis_src_args.ontology, endpoint = vis_src_args.endpoint, script = vis_src_args.script, uri = vis_src_args.uri;
      if (dataset && ontology) {
        add_reload_button = true;
        source_html = "<p><span class=\"dt_label\">Dataset:</span> <a href=\"" + dataset.value + "\">" + dataset.label + "</a></p>\n<p><span class=\"dt_label\">Ontology:</span> <a href=\"" + ontology.value + "\">" + ontology.label + "</a></p>";
      } else if (endpoint) {
        add_reload_button = true;
        source_html = "<p><span class=\"dt_label\">Endpoint:</span> <a href=\"" + endpoint.value + "\">" + endpoint.label + "</a></p>";
        if (endpoint.graph) {
          source_html += "<p><span class=\"dt_label\">Graph:</span> <a href=\"" + endpoint.graph.value + "\">" + endpoint.graph.label + "</a></p>";
        }
        if (endpoint.item) {
          source_html += "<p><span class=\"dt_label\">Item:</span> <a href=\"" + endpoint.item.value + "\">" + endpoint.item.label + "</a></p>";
        }
        if (endpoint.limit) {
          source_html += "<p><span class=\"dt_label\">Limit:</span> " + endpoint.limit + "</p>";
        }
      } else if (script) {
        source_html = "<p><span class=\"dt_label\">Script:</span> " + script + "</p>";
      } else {
        source_html = "<p><span class=\"dt_label\">Source:</span>TBD</p>";
      }
      reload_html = "<p>\n  <button title=\"Copy shareable link\"\n    class=\"show_shareable_link_dialog\"><i class=\"fas fa-share-alt\"></i></button>\n  <button title=\"Reload this data\"\n     onclick=\"location.replace('" + uri + "');location.reload()\"><i class=\"fas fa-redo\"></i></button>\n  <button title=\"Clear the graph and start over\"\n     onclick=\"location.assign(location.origin)\"><i class=\"fas fa-times\"></i></button>\n</p>";
      visualization_source_display = "<div id=\"" + (this.get_data_ontology_display_id()) + "\" class=\"data_ontology_display\">\n  " + source_html + "\n  " + (add_reload_button && reload_html || '') + "\n  <br style=\"clear:both\">\n</div>";
      sel = this.oldToUniqueTabSel['huvis_controls'];
      controls = document.querySelector(sel);
      controls.insertAdjacentHTML('afterbegin', visualization_source_display);
      shareable_link_button = controls.querySelector(".show_shareable_link_dialog");
      show_shareable_link_closure = (function(_this) {
        return function() {
          return _this.show_shareable_link_dialog(uri);
        };
      })(this);
      shareable_link_button.onclick = show_shareable_link_closure;
    };

    Huviz.prototype.show_shareable_link_dialog = function(uri) {
      var args, md, onclickCommand, shareLinkId, shareLinkSel;
      args = {
        width: 550
      };
      shareLinkId = unique_id('lnk_');
      shareLinkSel = "#" + shareLinkId;
      onclickCommand = ["input=document.getElementById('" + shareLinkId + "');", "input.select();", "input.setSelectionRange(0, 99999);", "document.execCommand('copy',input);", "return"].join(' ');
      md = "## Shareable Link\n\n<input type=\"text\" id=\"" + shareLinkId + "\" class=\"urlToShare\" value=\"" + uri + "\"/>\n<button onclick=\"" + onclickCommand + "\" class=\"urlCopyButton\"><i class=\"fa fa-copy\" aria-hidden=\"true\"></i> Copy</button>";
      return this.make_markdown_dialog(md, null, args);
    };

    Huviz.prototype.replace_loader_display_for_endpoint = function(endpoint, graph) {
      var data_ontol_display, print_graph;
      $(this.pickersSel).attr("style", "display:none");
      if (graph) {
        print_graph = "<p><span class='dt_label'>Graph:</span> " + graph + "</p>";
      } else {
        print_graph = "";
      }
      data_ontol_display = "<div id=\"" + (this.get_data_ontology_display_id()) + "\">\n  <p><span class=\"dt_label\">Endpoint:</span> " + endpoint + "</p>\n  " + print_graph + "\n  <br style=\"clear:both\">\n</div>";
      return $("#huvis_controls").prepend(data_ontol_display);
    };

    Huviz.prototype.update_browser_title = function(dataset) {
      if (dataset.value) {
        return this.set_browser_title(dataset.label);
      }
    };

    Huviz.prototype.set_browser_title = function(label) {
      return document.title = label + " - Huvis Graph Visualization";
    };

    Huviz.prototype.make_git_link = function() {
      var base;
      base = this.args.git_base_url;
      return "<a class=\"git_commit_hash_watermark subliminal\"\ntarget=\"huviz_version\"  tabindex=\"-1\"\nhref=\"" + base + this.git_commit_hash + "\">" + this.git_commit_hash + "</a>";
    };

    Huviz.prototype.create_caption = function() {
      var dm, om;
      this.captionId = this.unique_id('caption_');
      this.addDivWithIdAndClasses(this.captionId, "graph_title_set git_commit_hash_watermark");
      this.captionElem = document.querySelector('#' + this.captionId);
      if (this.git_commit_hash) {
        this.insertBeforeEnd(this.captionElem, this.make_git_link());
      }
      dm = 'dataset_watermark';
      this.insertBeforeEnd(this.captionElem, "<div class=\"" + dm + " subliminal\"></div>");
      this.make_JQElem(dm, this.args.huviz_top_sel + ' .' + dm);
      om = 'ontology_watermark';
      this.insertBeforeEnd(this.captionElem, "<div class=\"" + om + " subliminal\"></div>");
      this.make_JQElem(om, this.args.huviz_top_sel + ' .' + om);
    };

    Huviz.prototype.update_caption = function(dataset_str, ontology_str) {
      this.dataset_watermark_JQElem.text(dataset_str);
      this.ontology_watermark_JQElem.text(ontology_str);
    };

    Huviz.prototype.set_ontology_from_dataset_if_possible = function(args) {
      var ontologyUri, ontology_label, option;
      if (args == null) {
        args = {};
      }
      if (args.pickOrProvide === this.ontology_loader) {
        return;
      }
      if (this.dataset_loader.value) {
        option = this.dataset_loader.get_selected_option();
        ontologyUri = option.data('ontologyUri');
        ontology_label = option.data('ontology_label');
        if (ontologyUri) {
          this.set_ontology_with_uri(ontologyUri);
        } else {
          this.set_ontology_with_label(ontology_label);
        }
      }
      this.ontology_loader.update_state();
    };

    Huviz.prototype.set_ontology_with_label = function(ontology_label) {
      var j, len1, ont_opt, ref, sel, topSel;
      topSel = this.args.huviz_top_sel;
      sel = topSel + (" option[label='" + ontology_label + "']");
      ref = $(sel);
      for (j = 0, len1 = ref.length; j < len1; j++) {
        ont_opt = ref[j];
        this.ontology_loader.select_option($(ont_opt));
        return;
      }
    };

    Huviz.prototype.set_dataset_with_uri = function(uri) {
      var option, topSel;
      topSel = this.args.huviz_top_sel;
      option = $(topSel + ' option[value="' + uri + '"]');
      return this.dataset_loader.select_option(option);
    };

    Huviz.prototype.set_ontology_with_uri = function(ontologyUri) {
      var ontology_option, topSel;
      topSel = this.args.huviz_top_sel;
      ontology_option = $(topSel + ' option[value="' + ontologyUri + '"]');
      return this.ontology_loader.select_option(ontology_option);
    };

    Huviz.prototype.build_sparql_form = function() {
      var endpoint_labels_id, endpoint_limit_id, fromGraph, select_box, sparqlGraphSelectorId, sparqlQryInput_id, spo_query_id;
      this.sparqlId = unique_id();
      sparqlQryInput_id = "sparqlQryInput_" + this.sparqlId;
      this.sparqlQryInput_selector = "#" + sparqlQryInput_id;
      endpoint_limit_id = unique_id('endpoint_limit_');
      endpoint_labels_id = unique_id('endpoint_labels_');
      spo_query_id = unique_id('spo_query_');
      sparqlGraphSelectorId = "sparqlGraphOptions-" + this.endpoint_loader.select_id;
      select_box = "<div class=\"ui-widget\" style=\"display:none;margin-top:5px;margin-left:10px;\">\n  <label>Graphs: </label>\n  <select id=\"" + sparqlGraphSelectorId + "\">\n  </select>\n</div>\n<div id=\"sparqlGraphSpinner-" + this.endpoint_loader.select_id + "\"\n     style=\"display:none;font-style:italic;\">\n  <i class=\"fas fa-spinner fa-spin\" style=\"margin: 10px 10px 0 50px;\"></i>  Looking for graphs...\n</div>\n<div id=\"" + sparqlQryInput_id + "\" class=\"ui-widget sparqlQryInput\"\n     style=\"display:none;margin-top:5px;margin-left:10px;color:#999;\">\n  <label for=\"" + endpoint_labels_id + "\">Find: </label>\n  <input id=\"" + endpoint_labels_id + "\">\n  <i class=\"fas fa-spinner fa-spin\" style=\"visibility:hidden;margin-left: 5px;\"></i>\n  <div><label for=\"" + endpoint_limit_id + "\">Node Limit: </label>\n  <input id=\"" + endpoint_limit_id + "\" value=\"" + this.sparql_query_default_limit + "\">\n  <div><label for=\"" + spo_query_id + "\">(s,p,o) query: </label>\n  <textarea id=\"" + spo_query_id + "\" value=\"\"\n    placeholder=\"pick graph, then enter query producing s,p,o\"></textarea>\n  </div>\n</div>";
      $(this.pickersSel).append(select_box);
      this.sparqlQryInput_JQElem = $(this.sparqlQryInput_selector);
      this.endpoint_labels_JQElem = $('#' + endpoint_labels_id);
      this.endpoint_limit_JQElem = $('#' + endpoint_limit_id);
      this.sparqlGraphSelector_JQElem = $('#' + sparqlGraphSelectorId);
      this.sparqlGraphSelector_JQElem.change(this.sparqlGraphSelector_onchange);
      fromGraph = '';
      this.endpoint_labels_JQElem.on('input', this.animate_endpoint_label_typing);
      this.endpoint_labels_JQElem.autocomplete({
        minLength: 3,
        delay: 500,
        position: {
          collision: "flip"
        },
        source: this.search_sparql_by_label
      });
      this.endpoint_labels_JQElem.on('autocompleteselect', this.endpoint_labels__autocompleteselect);
      this.endpoint_labels_JQElem.on('change', this.endpoint_labels__update);
      this.endpoint_labels_JQElem.focusout(this.endpoint_labels__focusout);
      this.spo_query_JQElem = $('#' + spo_query_id);
      return this.spo_query_JQElem.on('update', this.spo_query__update);
    };

    Huviz.prototype.spo_query__update = function(event) {
      if (this.spo_query_JQElem.length) {
        this.enable_go_button();
      } else {
        this.disable_go_button();
      }
    };

    Huviz.prototype.endpoint_labels__autocompleteselect = function(event) {
      this.enable_go_button();
      return true;
    };

    Huviz.prototype.endpoint_labels__update = function(event) {
      if (!this.endpoint_labels_JQElem.val().length) {
        this.enable_go_button();
      }
      return true;
    };

    Huviz.prototype.endpoint_labels__focusout = function(event) {
      if (!this.endpoint_labels_JQElem.val().length) {
        this.enable_go_button();
      }
      return true;
    };

    Huviz.prototype.allGraphsChosen = function() {
      var error;
      try {
        return this.sparqlGraphSelector_JQElem.val() === this.endpoint_loader.value;
      } catch (_error) {
        error = _error;
        return false;
      }
    };

    Huviz.prototype.sparqlGraphSelector_onchange = function(event) {
      if (this.allGraphsChosen()) {
        this.disable_go_button();
      } else {
        this.enable_go_button();
      }
    };

    Huviz.prototype.animate_endpoint_label_typing = function() {
      var elem;
      elem = this.endpoint_labels_JQElem[0];
      return this.endpoint_label_typing_anim = this.animate_fill_graph(elem, 500, '#E7E7E7');
    };

    Huviz.prototype.animate_endpoint_label_search = function(overMsec, fc, bc) {
      var elem;
      this.start_graphs_selector_spinner();
      if (overMsec == null) {
        overMsec = this.get_sparql_timeout_msec();
      }
      elem = this.endpoint_labels_JQElem[0];
      return this.endpoint_label_search_anim = this.animate_sparql_query(elem, overMsec, fc, bc);
    };

    Huviz.prototype.endpoint_label_search_success = function() {
      this.kill_endpoint_label_search_anim();
      return this.endpoint_labels_JQElem.css('background', 'lightgreen');
    };

    Huviz.prototype.endpoint_label_search_none = function() {
      this.kill_endpoint_label_search_anim();
      return this.endpoint_labels_JQElem.css('background', 'lightgrey');
    };

    Huviz.prototype.endpoint_label_search_failure = function() {
      this.kill_endpoint_label_search_anim();
      return this.endpoint_labels_JQElem.css('background', 'pink');
    };

    Huviz.prototype.kill_endpoint_label_search_anim = function() {
      this.endpoint_label_search_anim.cancel();
      this.stop_graphs_selector_spinner();
    };

    Huviz.prototype.animate_sparql_query = function(elem, overMsec, fillColor, bgColor) {
      if (fillColor == null) {
        fillColor = 'lightblue';
      }
      return this.animate_fill_graph(elem, overMsec, fillColor, bgColor);
    };

    Huviz.prototype.animate_fill_graph = function(elem, overMsec, fillColor, bgColor) {
      var animId, go;
      if (overMsec == null) {
        overMsec = 2000;
      }
      if (fillColor == null) {
        fillColor = 'yellow';
      }
      if (bgColor == null) {
        bgColor = 'white';
      }
      animId = false;
      go = function(elem, overMsec, fillColor, bgColor) {
        var anim, cancelled, step;
        cancelled = false;
        anim = {
          elem: elem,
          overMsec: overMsec,
          fillColor: fillColor,
          bgColor: bgColor,
          cancelled: cancelled
        };
        step = function(nowMsec) {
          var bg, bgPct, fillPct;
          if (anim.cancelled) {
            console.info('animate_fill_graph() cancelled');
            return;
          }
          if (!anim.startMsec) {
            anim.startMsec = nowMsec;
          }
          anim.progressMsec = nowMsec - anim.startMsec;
          fillPct = ((anim.overMsec - anim.progressMsec) / anim.overMsec) * 100;
          bgPct = 100 - fillPct;
          bg = "linear-gradient(to right, " + anim.fillColor + " 0% " + bgPct + "%, " + bgColor + " " + bgPct + "%, " + anim.bgColor + " 100%)";
          elem.style.background = bg;
          if (anim.progressMsec < anim.overMsec) {
            return anim.animId = requestAnimationFrame(step);
          }
        };
        anim.animId = requestAnimationFrame(step);
        anim.cancel = function() {
          anim.cancelled = true;
          return window.cancelAnimationFrame(anim.animId);
        };
        return anim;
      };
      return go(elem, overMsec, fillColor, bgColor);
    };

    Huviz.prototype.get_sparql_timeout_msec = function() {
      return 1000 * (this.sparql_timeout || 5);
    };

    Huviz.prototype.start_graphs_selector_spinner = function() {
      var spinner;
      spinner = this.endpoint_labels_JQElem.siblings('i');
      spinner.css('visibility', 'visible');
    };

    Huviz.prototype.stop_graphs_selector_spinner = function() {
      var spinner;
      spinner = this.endpoint_labels_JQElem.siblings('i');
      spinner.css('visibility', 'hidden');
    };

    Huviz.prototype.euthanize_search_sparql_by_label = function() {
      this.disable_go_button();
      if (this.search_sparql_by_label_queryManager != null) {
        this.kill_endpoint_label_search_anim();
        this.search_sparql_by_label_queryManager.kill();
        return true;
      }
      return false;
    };

    Huviz.prototype.search_sparql_by_label = function(request, response) {
      var args, fromGraph, make_error_callback, make_success_handler, qry, url;
      this.euthanize_search_sparql_by_label();
      this.animate_endpoint_label_search();
      this.start_graphs_selector_spinner();
      url = this.endpoint_loader.value;
      fromGraph = '';
      if (this.endpoint_loader.endpoint_graph) {
        fromGraph = " FROM <" + this.endpoint_loader.endpoint_graph + "> ";
      }
      qry = "# search_sparql_by_label()\nPREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nPREFIX foaf: <http://xmlns.com/foaf/0.1/>\nPREFIX dbp: <http://dbpedia.org/ontology/>\nSELECT DISTINCT * " + fromGraph + "\nWHERE {\n  ?sub rdfs:label|foaf:name|dbp:name ?obj .\n  FILTER (STRSTARTS(LCASE(?obj), \"" + (request.term.toLowerCase()) + "\"))\n}\nLIMIT 20";
      make_success_handler = (function(_this) {
        return function() {
          return function(data, textStatus, jqXHR, queryManager) {
            var e, j, json_check, json_data, label, len1, results, selections, this_result;
            json_check = typeof data;
            if (json_check === 'string') {
              try {
                json_data = JSON.parse(data);
              } catch (_error) {
                e = _error;
                console.error(e);
                console.log({
                  data: data
                });
                _this.endpoint_label_search_failure();
              }
            } else {
              json_data = data;
            }
            results = json_data.results.bindings;
            queryManager.setResultCount(results.length);
            selections = [];
            if (results.length) {
              _this.endpoint_label_search_success();
            } else {
              _this.endpoint_label_search_none();
            }
            _this.stop_graphs_selector_spinner();
            for (j = 0, len1 = results.length; j < len1; j++) {
              label = results[j];
              this_result = {
                label: label.obj.value + (" (" + label.sub.value + ")"),
                value: label.sub.value
              };
              selections.push(this_result);
            }
            return response(selections);
          };
        };
      })(this);
      make_error_callback = (function(_this) {
        return function() {
          return function(jqxhr, textStatus, errorThrown) {
            _this.endpoint_label_search_failure();
            $('#' + _this.get_data_ontology_display_id()).remove();
            return _this.stop_graphs_selector_spinner();
          };
        };
      })(this);
      args = {
        query: qry,
        serverUrl: url,
        success_handler: make_success_handler(),
        error_callback: make_error_callback()
      };
      return this.search_sparql_by_label_queryManager = this.run_managed_query_ajax(args);
    };

    Huviz.prototype.init_editc_or_not = function() {
      if (this.editui == null) {
        this.editui = new EditController(this);
      }
      this.editui.id = 'EditUI';
      this.editui.transit('prepare');
      if (this.args.show_edit) {
        this.editui.show();
      } else {
        this.editui.hide();
      }
      if (this.args.start_with_editing) {
        return this.editui.transit('enable');
      }
    };

    Huviz.prototype.indexed_dbservice = function() {
      return this.indexeddbservice != null ? this.indexeddbservice : this.indexeddbservice = new IndexedDBService(this);
    };

    Huviz.prototype.init_indexddbstorage = function() {
      return this.dbsstorage != null ? this.dbsstorage : this.dbsstorage = new IndexedDBStorageController(this, this.indexeddbservice);
    };

    Huviz.prototype.predicates_to_ignore = ["anything", "first", "rest", "members"];

    Huviz.prototype.get_polar_coords_of = function(node) {
      var degrees, h, max_radius, min_wh, radians, range, w, x, y;
      w = this.get_container_height();
      h = this.get_container_width();
      min_wh = Math.min(w, h);
      max_radius = min_wh / 2;
      max_radius = this.graph_region_radius;
      x = node.x - this.cx;
      y = node.y - this.cy;
      range = Math.sqrt((x * x) + (y * y)) / max_radius;
      radians = Math.atan2(y, x) + Math.PI;
      degrees = (Math.floor(radians * 180 / Math.PI) + 270) % 360;
      return {
        range: range,
        degrees: degrees
      };
    };

    Huviz.prototype.run_verb_on_object = function(verb, subject) {
      var args, cmd;
      args = {
        verbs: [verb],
        subjects: [this.get_handle(subject)]
      };
      if (verb === 'pin') {
        args.polar_coords = this.get_polar_coords_of(subject);
      }
      cmd = new gcl.GraphCommand(this, args);
      return this.run_command(cmd);
    };

    Huviz.prototype.before_running_command = function() {
      if (this.use_fancy_cursor) {
        this.text_cursor.set_cursor("wait");
      }
    };

    Huviz.prototype.after_running_command = function() {
      if (this.use_fancy_cursor) {
        this.text_cursor.set_cursor("default");
      }
      this.topElem.style.backgroundColor = renderStyles.pageBg;
      this.topElem.classList.add(renderStyles.themeName);
      this.update_all_counts();
      return this.clean_up_all_dirt_once();
    };

    Huviz.prototype.get_handle = function(thing) {
      return {
        id: thing.id,
        lid: thing.lid
      };
    };

    Huviz.prototype.toggle_logging = function() {
      var new_state;
      if (console.log_real == null) {
        console.log_real = console.log;
      }
      new_state = console.log === console.log_real;
      return this.set_logging(new_state);
    };

    Huviz.prototype.set_logging = function(new_state) {
      if (new_state) {
        console.log = console.log_real;
        return true;
      } else {
        console.log = function() {};
        return false;
      }
    };

    Huviz.prototype.create_state_msg_box = function() {
      this.state_msg_box = $("#state_msg_box");
      return this.hide_state_msg();
    };

    Huviz.prototype.init_ontology = function() {
      this.create_taxonomy();
      return this.ontology = PRIMORDIAL_ONTOLOGY;
    };

    Huviz.prototype.default_tab_specs = [
      {
        id: 'commands',
        cssClass: 'huvis_controls scrolling_tab unselectable',
        title: "Power tools for controlling the graph",
        text: "Commands"
      }, {
        id: 'settings',
        cssClass: 'settings scrolling_tab',
        title: "Fine tune sizes, lengths and thicknesses",
        text: "Settings"
      }, {
        id: 'history',
        cssClass: 'tabs-history',
        title: "The command history",
        text: "History"
      }, {
        id: 'credits',
        cssClass: 'tabs-credit scrolling_tab',
        title: "Academic, funding and technical credit",
        text: "Credit",
        bodyUrl: "/huviz/docs/credits.md"
      }, {
        id: 'tutorial',
        cssClass: "tabs-tutor scrolling_tab",
        title: "A tutorial",
        text: "Tutorial",
        bodyUrl: "/huviz/docs/tutorial.md"
      }, {
        id: 'sparqlQueries',
        cssClass: "tabs-sparqlQueries scrolling_tab",
        title: "SPARQL Queries",
        text: "Q"
      }
    ];

    Huviz.prototype.get_default_tab = function(id) {
      var j, len1, ref, tab;
      ref = this.default_tab_specs;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        tab = ref[j];
        if (tab.id === id) {
          return tab;
        }
      }
      return {
        id: id,
        title: id,
        cssClass: id,
        text: id
      };
    };

    Huviz.prototype.make_tabs_html = function() {
      var firstClass, firstClass_, html, id, idSel, j, jQElem_list, len1, mkcb, t, tab_specs, theDivs, theTabs;
      jQElem_list = [];
      theTabs = "<ul class=\"the-tabs\">";
      theDivs = "";
      tab_specs = this.args.tab_specs;
      for (j = 0, len1 = tab_specs.length; j < len1; j++) {
        t = tab_specs[j];
        if (typeof t === 'string') {
          t = this.get_default_tab(t);
        }
        firstClass = t.cssClass.split(' ')[0];
        firstClass_ = firstClass.replace(/\-/, '_');
        id = this.unique_id(firstClass + '_');
        this.tabs_class_to_id[firstClass] = id;
        if (this.args.use_old_tab_ids) {
          id = firstClass;
        }
        idSel = '#' + id;
        this.oldToUniqueTabSel[firstClass] = idSel;
        theTabs += "<li><a href=\"" + idSel + "\" title=\"" + t.title + "\">" + t.text + "</a></li>";
        theDivs += "<div id=\"" + id + "\" class=\"" + t.cssClass + "\">" + (t.kids || '') + "</div>";
        if (typeof marked === "undefined" || marked === null) {
          console.info('marked does not exist yet');
        }
        if (t.bodyUrl != null) {
          this.withUriDo(t.bodyUrl, idSel);
        }
        if (t.moveSelector != null) {
          mkcb = (function(_this) {
            return function(fromSel, toSel) {
              return function() {
                return _this.moveSelToSel(fromSel, toSel);
              };
            };
          })(this);
          setTimeout(mkcb(t.moveSelector, idSel), 30);
        }
        jQElem_list.push([firstClass_, idSel]);
      }
      theTabs += "</ul>";
      this.tabs_id = this.unique_id('tabs_');
      html = ["<section id=\"" + this.tabs_id + "\" class=\"huviz_tabs\" role=\"controls\">", theTabs, theDivs, "</section>"].join('');
      return [html, jQElem_list];
    };

    Huviz.prototype.moveSelToSel = function(moveSel, targetSel) {
      var moveElem, targetElem;
      if (!(moveElem = document.querySelector(moveSel))) {
        console.warn("moveSelector() failed to find moveSel: '" + moveSel + "'");
        return;
      }
      if (!(targetElem = document.querySelector(targetSel))) {
        console.warn("moveSelector() failed to find targetSel: '" + targetSel + "'");
        return;
      }
      targetElem.appendChild(moveElem);
    };

    Huviz.prototype.withUriDo = function(url, sel, processor) {
      var xhr;
      xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onload = (function(_this) {
        return function(e) {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              if (processor == null) {
                processor = (url.endsWith('.md') && marked) || ident;
              }
              return _this.renderIntoWith(xhr.responseText, sel, processor);
            } else {
              return console.error(xhr.statusText);
            }
          }
        };
      })(this);
      xhr.onerror = function(e) {
        return console.error(xhr.statusText);
      };
      return xhr.send(null);
    };

    Huviz.prototype.renderIntoWith = function(data, sel, processor) {
      var elem;
      elem = document.querySelector(sel);
      if (!elem) {
        return;
      }
      if (processor != null) {
        elem.innerHTML = processor(data);
      } else {
        elem.innerHTML = data;
      }
    };

    Huviz.prototype.insertBeforeEnd = function(elem, html) {
      var position;
      position = 'beforeend';
      elem.insertAdjacentHTML(position, html);
      return elem.lastElementChild;
    };

    Huviz.prototype.create_tabs = function() {
      var contentAreaJQElem, elem, html, j, jQElem_list, len1, pair, ref, tabKey, tabSel;
      this.tabs_class_to_id = {};
      if (!this.args.tab_specs) {
        return;
      }
      elem = document.querySelector(this.args.create_tabs_adjacent_to_selector);
      ref = this.make_tabs_html(), html = ref[0], jQElem_list = ref[1];
      this.addHTML(html);
      for (j = 0, len1 = jQElem_list.length; j < len1; j++) {
        pair = jQElem_list[j];
        contentAreaJQElem = this.make_JQElem(pair[0], pair[1]);
        tabKey = 'tab_for_' + pair[0];
        tabSel = 'li [href="#' + contentAreaJQElem[0].id + '"]';
        this.make_JQElem(tabKey, tabSel);
      }
    };

    Huviz.prototype.ensureTopElem = function() {
      var body, classes, id;
      if (!document.querySelector(this.args.huviz_top_sel)) {
        body = document.querySelector("body");
        id = sel_to_id(this.args.huviz_top_sel);
        classes = 'huviz_top';
        this.addDivWithIDAndClasses(id, classes, body);
      }
      this.topElem = document.querySelector(this.args.huviz_top_sel);
      this.topJQElem = $(this.topElem);
    };

    Huviz.prototype.get_picker_style_context_selector = function() {
      return this.args.huviz_top_sel;
    };

    Huviz.prototype.addHTML = function(html) {
      return this.insertBeforeEnd(this.topElem, html);
    };

    Huviz.prototype.addDivWithIdAndClasses = function(id, classes, specialElem) {
      var html, idHtml;
      idHtml = id && ("id=\"" + (sel_to_id(id)) + "\" ") || "";
      html = "<div " + idHtml + " class=\"" + classes + "\"></div>";
      if (specialElem) {
        return this.insertBeforeEnd(specialElem, html);
      } else {
        return this.addHTML(html);
      }
    };

    Huviz.prototype.ensure_divs = function() {
      var classes, elem, id, j, key, key_sel, len1, ref, sel, specialParent, specialParentElem, specialParentSel, specialParentSelKey;
      ref = this.needed_divs;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        key = ref[j];
        key_sel = key + '_sel';
        if ((sel = this.args[key_sel])) {
          id = sel_to_id(sel);
          classes = key;
          if (!(elem = document.querySelector(sel))) {
            specialParentElem = null;
            if ((specialParent = this.div_has_special_parent[key])) {
              specialParentSelKey = specialParent + '_sel';
              if ((specialParentSel = this.args[specialParentSelKey]) || (specialParentSel = this.oldToUniqueTabSel[specialParent])) {
                specialParentElem = document.querySelector(specialParentSel);
              }
            }
            this.addDivWithIdAndClasses(id, classes, specialParentElem);
          }
        }
      }
    };

    Huviz.prototype.make_JQElem = function(key, sel) {
      var found, jqelem_id;
      jqelem_id = key + '_JQElem';
      found = $(sel);
      if (found.length > 0) {
        this[jqelem_id] = found;
      } else {
        throw new Error(sel + ' not found');
      }
      return found;
    };

    Huviz.prototype.make_JQElems = function() {
      var j, key, len1, ref, sel;
      ref = this.needed_JQElems;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        key = ref[j];
        if ((sel = this.args[key + '_sel'])) {
          this.make_JQElem(key, sel);
        }
      }
    };

    Huviz.prototype.make_default_args = function() {
      return {
        add_to_HVZ: true,
        ctrl_handle_sel: unique_id('#ctrl_handle_'),
        gclui_sel: unique_id('#gclui_'),
        git_base_url: "https://github.com/smurp/huviz/commit/",
        hide_fullscreen_button: false,
        huviz_top_sel: unique_id('#huviz_top_'),
        make_pickers: true,
        performance_dashboard_sel: unique_id('#performance_dashboard_'),
        settings: {},
        show_edit: false,
        show_tabs: true,
        skip_log_tick: true,
        state_msg_box_sel: unique_id('#state_msg_box_'),
        status_sel: unique_id('#status_'),
        stay_square: false,
        tab_specs: ['commands', 'settings', 'history'],
        tabs_minWidth: 300,
        use_old_tab_ids: false,
        viscanvas_sel: unique_id('#viscanvas_'),
        vissvg_sel: unique_id('#vissvg_')
      };
    };

    Huviz.prototype.div_has_special_parent = {
      gclui: 'huvis_controls'
    };

    Huviz.prototype.needed_divs = ['gclui', 'performance_dashboard', 'state_msg_box', 'status', 'viscanvas', 'vissvg'];

    Huviz.prototype.needed_JQElems = ['gclui', 'performance_dashboard', 'viscanvas', 'huviz_controls'];

    Huviz.prototype.calculate_args = function(incoming_args) {
      var args;
      if (incoming_args == null) {
        incoming_args = {};
      }
      if (!incoming_args.huviz_top_sel) {
        console.warn('you have not provided a value for huviz_top_sel so it will be appended to BODY');
      }
      args = this.compose_object_from_defaults_and_incoming(this.make_default_args(), incoming_args);
      if (args.create_tabs_adjacent_to_selector == null) {
        args.create_tabs_adjacent_to_selector = args.huviz_top_sel;
      }
      return args;
    };

    function Huviz(incoming_args) {
      this.receive_quaff_lod = bind(this.receive_quaff_lod, this);
      this.parseAndShowFile = bind(this.parseAndShowFile, this);
      this.pfm_update = bind(this.pfm_update, this);
      this.pfm_count = bind(this.pfm_count, this);
      this.build_pfm_live_monitor = bind(this.build_pfm_live_monitor, this);
      this.pfm_dashboard = bind(this.pfm_dashboard, this);
      this.on_change_reset_settings_to_default = bind(this.on_change_reset_settings_to_default, this);
      this.change_setting_to_from = bind(this.change_setting_to_from, this);
      this.change_graph_settings = bind(this.change_graph_settings, this);
      this.update_graph_settings = bind(this.update_graph_settings, this);
      this.update_settings_cursor = bind(this.update_settings_cursor, this);
      this.init_settings_to_defaults = bind(this.init_settings_to_defaults, this);
      this.expand_tabs = bind(this.expand_tabs, this);
      this.collapse_tabs = bind(this.collapse_tabs, this);
      this.fullscreen = bind(this.fullscreen, this);
      this.close_blurt_box = bind(this.close_blurt_box, this);
      this.blurt = bind(this.blurt, this);
      this.complete_construction = bind(this.complete_construction, this);
      this.catch_reject_init_settings = bind(this.catch_reject_init_settings, this);
      this.search_sparql_by_label = bind(this.search_sparql_by_label, this);
      this.animate_endpoint_label_search = bind(this.animate_endpoint_label_search, this);
      this.animate_endpoint_label_typing = bind(this.animate_endpoint_label_typing, this);
      this.sparqlGraphSelector_onchange = bind(this.sparqlGraphSelector_onchange, this);
      this.endpoint_labels__focusout = bind(this.endpoint_labels__focusout, this);
      this.endpoint_labels__update = bind(this.endpoint_labels__update, this);
      this.endpoint_labels__autocompleteselect = bind(this.endpoint_labels__autocompleteselect, this);
      this.spo_query__update = bind(this.spo_query__update, this);
      this.build_sparql_form = bind(this.build_sparql_form, this);
      this.set_ontology_from_dataset_if_possible = bind(this.set_ontology_from_dataset_if_possible, this);
      this.show_shareable_link_dialog = bind(this.show_shareable_link_dialog, this);
      this.enable_go_button = bind(this.enable_go_button, this);
      this.disable_go_button = bind(this.disable_go_button, this);
      this.reset_endpoint_form = bind(this.reset_endpoint_form, this);
      this.update_endpoint_form = bind(this.update_endpoint_form, this);
      this.update_dataset_ontology_loader = bind(this.update_dataset_ontology_loader, this);
      this.load_script_from_db = bind(this.load_script_from_db, this);
      this.after_visualize_dataset_using_ontology = bind(this.after_visualize_dataset_using_ontology, this);
      this.visualize_dataset_using_ontology = bind(this.visualize_dataset_using_ontology, this);
      this.turn_off_loading_notice = bind(this.turn_off_loading_notice, this);
      this.turn_on_loading_notice = bind(this.turn_on_loading_notice, this);
      this.update_graph_form = bind(this.update_graph_form, this);
      this.update_dataset_forms = bind(this.update_dataset_forms, this);
      this.big_go_button_onclick = bind(this.big_go_button_onclick, this);
      this.ensure_datasets_from_XHR = bind(this.ensure_datasets_from_XHR, this);
      this.ensure_datasets = bind(this.ensure_datasets, this);
      this.register_gclc_prefixes = bind(this.register_gclc_prefixes, this);
      this.undraw_edge_regarding = bind(this.undraw_edge_regarding, this);
      this.draw_edge_regarding = bind(this.draw_edge_regarding, this);
      this.redact = bind(this.redact, this);
      this.print = bind(this.print, this);
      this.peek = bind(this.peek, this);
      this.clear_snippets = bind(this.clear_snippets, this);
      this.hunt = bind(this.hunt, this);
      this.animate_hunt = bind(this.animate_hunt, this);
      this.unselect = bind(this.unselect, this);
      this.select = bind(this.select, this);
      this.hide = bind(this.hide, this);
      this.walk = bind(this.walk, this);
      this.wander = bind(this.wander, this);
      this.wander__atLast = bind(this.wander__atLast, this);
      this.wander__atFirst = bind(this.wander__atFirst, this);
      this.unchoose = bind(this.unchoose, this);
      this.choose = bind(this.choose, this);
      this.suppress = bind(this.suppress, this);
      this.shelve = bind(this.shelve, this);
      this.clean_up_all_dirt = bind(this.clean_up_all_dirt, this);
      this.clean_up_dirty_predicates = bind(this.clean_up_dirty_predicates, this);
      this.update_searchterm = bind(this.update_searchterm, this);
      this.sparql_graph_query_and_show = bind(this.sparql_graph_query_and_show, this);
      this.sparql_graph_query_and_show__trigger = bind(this.sparql_graph_query_and_show__trigger, this);
      this.log_query = bind(this.log_query, this);
      this.DUMPER = bind(this.DUMPER, this);
      this.parse_and_show_NQ_file = bind(this.parse_and_show_NQ_file, this);
      this.choose_everything = bind(this.choose_everything, this);
      this.parseAndShowTurtle = bind(this.parseAndShowTurtle, this);
      this.parseAndShowTTLData = bind(this.parseAndShowTTLData, this);
      this.name_result_handler = bind(this.name_result_handler, this);
      this.convert_obj_uri_to_string = bind(this.convert_obj_uri_to_string, this);
      this.convert_obj_obj_to_GreenTurtle = bind(this.convert_obj_obj_to_GreenTurtle, this);
      this.convert_str_uri_to_string = bind(this.convert_str_uri_to_string, this);
      this.convert_N3_uri_to_string = bind(this.convert_N3_uri_to_string, this);
      this.convert_str_obj_to_GreenTurtle = bind(this.convert_str_obj_to_GreenTurtle, this);
      this.generic_name_success_handler = bind(this.generic_name_success_handler, this);
      this.generic_success_handler = bind(this.generic_success_handler, this);
      this.display_graph_success_handler = bind(this.display_graph_success_handler, this);
      this.json_name_success_handler = bind(this.json_name_success_handler, this);
      this.tsv_name_success_handler = bind(this.tsv_name_success_handler, this);
      this.show_geonames_instructions = bind(this.show_geonames_instructions, this);
      this.ingest_quads_from = bind(this.ingest_quads_from, this);
      this.discover_labels = bind(this.discover_labels, this);
      this.make_triple_ingestor = bind(this.make_triple_ingestor, this);
      this.discovery_triple_ingestor_GreenTurtle = bind(this.discovery_triple_ingestor_GreenTurtle, this);
      this.discovery_triple_ingestor_N3 = bind(this.discovery_triple_ingestor_N3, this);
      this.hide_state_msg = bind(this.hide_state_msg, this);
      this.tick = bind(this.tick, this);
      this.get_gravity = bind(this.get_gravity, this);
      this.get_charge = bind(this.get_charge, this);
      this.updateWindow = bind(this.updateWindow, this);
      this.close_node_inspector = bind(this.close_node_inspector, this);
      this.mouseright = bind(this.mouseright, this);
      this.mouseup = bind(this.mouseup, this);
      this.mousedown = bind(this.mousedown, this);
      this.mousemove = bind(this.mousemove, this);
      this.like_string = bind(this.like_string, this);
      var base1;
      this.oldToUniqueTabSel = {};
      this.git_commit_hash = window.HUVIZ_GIT_COMMIT_HASH;
      this.args = this.calculate_args(incoming_args);
      this.ensureTopElem();
      if (this.args.create_tabs_adjacent_to_selector) {
        this.create_tabs();
      }
      this.tabsJQElem = $('#' + this.tabs_id);
      if (!this.args.show_tabs) {
        this.collapse_tabs();
      }
      this.replace_human_term_spans(this.tabs_id);
      if (this.args.add_to_HVZ) {
        if (window.HVZ == null) {
          window.HVZ = [];
        }
        window.HVZ.push(this);
      }
      if ((base1 = this.args).settings_sel == null) {
        base1.settings_sel = this.oldToUniqueTabSel['settings'];
      }
      this.create_blurtbox();
      this.ensure_divs();
      this.make_JQElems();
      this.create_collapse_expand_handles();
      if (!this.args.hide_fullscreen_button) {
        this.create_fullscreen_handle();
      }
      this.init_ontology();
      this.create_caption();
      this.off_center = false;
      document.addEventListener('nextsubject', this.onnextsubject);
      this.init_snippet_box();
      this.mousedown_point = false;
      this.discard_point = [this.cx, this.cy];
      this.lariat_center = [this.cx, this.cy];
      this.node_radius_policy = node_radius_policies[default_node_radius_policy];
      this.currently_printed_snippets = {};
      this.fill = d3.scale.category20();
      this.force = d3.layout.force().size([this.width, this.height]).nodes([]).linkDistance(this.link_distance).charge(this.get_charge).gravity(this.gravity).on("tick", this.tick);
      this.update_fisheye();
      this.svg = d3.select(this.args.vissvg_sel).append("svg").attr("width", this.width).attr("height", this.height).attr("position", "absolute");
      this.svg.append("rect").attr("width", this.width).attr("height", this.height);
      this.container = d3.select(this.args.viscanvas_sel).node().parentNode;
      this.init_settings_to_defaults().then(this.complete_construction)["catch"](this.catch_reject_init_settings);
    }

    Huviz.prototype.catch_reject_init_settings = function(wha) {
      return console.error(wha);
    };

    Huviz.prototype.complete_construction = function(setting_resolutions) {
      var search_input;
      this.adjust_settings_from_kv_list(this.args.settings);
      if (this.use_fancy_cursor) {
        this.install_update_pointer_togglers();
      }
      this.create_state_msg_box();
      this.viscanvas = d3.select(this.args.viscanvas_sel).html("").append("canvas").attr("width", this.width).attr("height", this.height);
      this.make_JQElem('viscanvas', this.args.viscanvas_sel);
      this.viscanvas_elem = document.querySelector(this.args.viscanvas_sel);
      this.canvas = this.viscanvas[0][0];
      this.mouse_receiver = this.viscanvas;
      this.reset_graph();
      this.updateWindow();
      this.ctx = this.canvas.getContext("2d");
      this.mouse_receiver.on("mousemove", this.mousemove).on("mousedown", this.mousedown).on("mouseup", this.mouseup).on("contextmenu", this.mouseright);
      this.restart();
      this.set_search_regex("");
      search_input = document.getElementById('search');
      if (search_input) {
        search_input.addEventListener("input", this.update_searchterm);
      }
      window.addEventListener("resize", this.updateWindow);
      this.tabsJQElem.on("resize", this.updateWindow);
      $(this.viscanvas).bind("_splitpaneparentresize", this.updateWindow);
      this.tabsJQElem.tabs({
        active: 0
      });
      return this.maybe_demo_round_img();
    };

    Huviz.prototype.maybe_demo_round_img = function() {
      var e, roundImage;
      if (!this.args.demo_round_img) {
        return;
      }
      try {
        roundImage = this.get_or_create_round_img(this.args.demo_round_img);
        roundImage.id = this.unique_id('sample_round_img_');
        this.tabsJQElem.append(roundImage);
        $('#' + roundImage.id).attr("style", "background-color:black");
      } catch (_error) {
        e = _error;
        console.warn("url:", this.args.demo_round_img);
        console.debug(e);
      }
    };

    Huviz.prototype.create_blurtbox = function() {
      var blurtbox_id, html, tabsElem;
      blurtbox_id = this.unique_id('blurtbox_');
      tabsElem = document.querySelector('#' + this.tabs_id);
      html = "<div id=\"" + blurtbox_id + "\" class=\"blurtbox\"></div>";
      this.blurtbox_JQElem = $(this.insertBeforeEnd(tabsElem, html));
    };

    Huviz.prototype.blurt = function(str, type, noButton) {
      var label;
      if (type === "info") {
        label = "<h3>Message</h3>";
      }
      if (type === "alert") {
        label = "<h3>Alert</h3>";
      }
      if (type === "error") {
        label = "<h3>Error</h3>";
      }
      if (!type) {
        label = '';
      }
      this.blurtbox_JQElem.append("<div class='blurt " + type + "'>" + label + str + "<br class='clear'></div>");
      this.blurtbox_JQElem.scrollTop(10000);
      if (!noButton && !this.close_blurtbox_button) {
        this.close_blurtbox_button = this.blurtbox_JQElem.prepend("<button id='blurt_close' class='sml_bttn' type='button'>close</button>");
        this.close_blurtbox_button.on('click', this.close_blurt_box);
      }
    };

    Huviz.prototype.close_blurt_box = function() {
      delete this.close_blurtbox_button;
      return this.blurtbox_JQElem.html('');
    };

    Huviz.prototype.create_fullscreen_handle = function() {
      var fs;
      fs = "<div class=\"full_screen\" style=\"position:absolute;z-index:999\"><i class=\"fa fa-arrows-alt\"></i></div>";
      this.topJQElem.prepend(fs);
      this.fullscreenJQElem = this.topJQElem.find(".full_screen");
      this.fullscreenJQElem.click(this.fullscreen);
    };

    Huviz.prototype.fullscreen = function() {
      if (document.fullscreenElement) {
        return document.exitFullscreen();
      } else {
        return this.topElem.requestFullscreen();
      }
    };

    Huviz.prototype.collapse_tabs = function() {
      this.tabsJQElem.prop('style', 'visibility:hidden;width:0');
      this.tabsJQElem.find('.expand_cntrl').prop('style', 'visibility:visible');
      this.tabsJQElem.find('.the-tabs').prop('style', 'display:none');
      return this.tabsJQElem.find('.tabs-intro').prop('style', 'display:none');
    };

    Huviz.prototype.expand_tabs = function() {
      this.tabsJQElem.prop('style', 'visibility:visible');
      this.tabsJQElem.find('.the-tabs').prop('style', 'display:inherit');
      this.tabsJQElem.find('.tabs-intro').prop('style', 'display:inherit');
      this.expandCtrlJQElem.hide();
      return this.collapseCtrlJQElem.show();
    };

    Huviz.prototype.create_collapse_expand_handles = function() {
      var ctrl_handle_id, html;
      ctrl_handle_id = sel_to_id(this.args.ctrl_handle_sel);
      html = "<div class=\"expand_cntrl\" style=\"visibility:hidden\">\n  <i class=\"fa fa-angle-double-left\"></i></div>\n<div class=\"collapse_cntrl\">\n  <i class=\"fa fa-angle-double-right\"></i></div>\n<div id=\"" + ctrl_handle_id + "\"\n     class=\"ctrl_handle ui-resizable-handle ui-resizable-w\">\n   <div class=\"ctrl_handle_grip\">o</div>\n</div>";
      this.tabsJQElem.prepend(html);
      this.expandCtrlJQElem = this.tabsJQElem.find(".expand_cntrl");
      this.expandCtrlJQElem.click(this.expand_tabs).on("click", this.updateWindow);
      this.collapseCtrlJQElem = this.tabsJQElem.find(".collapse_cntrl");
      this.collapseCtrlJQElem.click(this.collapse_tabs).on("click", this.updateWindow);
      this.tabsJQElem.resizable({
        handles: {
          'w': this.args.ctrl_handle_sel
        },
        minWidth: this.args.tabs_minWidth
      });
    };

    Huviz.prototype.goto_tab = function(tab_idx) {
      this.tabsJQElem.tabs({
        active: tab_idx,
        collapsible: true
      });
    };

    Huviz.prototype.update_fisheye = function() {
      this.label_show_range = 30 * 1.1;
      this.focus_radius = this.label_show_range;
      this.fisheye = d3.fisheye.circular().radius(this.fisheye_radius).distortion(this.fisheye_zoom);
      this.force.linkDistance(this.link_distance).gravity(this.gravity);
      if (!this.args.skip_log_tick) {
        return console.log("Tick in @force.linkDistance... update_fisheye");
      }
    };

    Huviz.prototype.replace_human_term_spans = function(optional_class) {
      var canonical, human, ref, results1, selector;
      optional_class = optional_class || 'a_human_term';
      ref = this.human_term;
      results1 = [];
      for (canonical in ref) {
        human = ref[canonical];
        selector = '.human_term__' + canonical;
        results1.push($(selector).text(human).addClass(optional_class));
      }
      return results1;
    };

    Huviz.prototype.human_term = {
      all: 'ALL',
      chosen: 'CHOSEN',
      unchosen: 'UNCHOSEN',
      selected: 'SELECTED',
      shelved: 'SHELVED',
      discarded: 'DISCARDED',
      hidden: 'HIDDEN',
      graphed: 'GRAPHED',
      fixed: 'PINNED',
      labelled: 'LABELLED',
      choose: 'CHOOSE',
      unchoose: 'UNCHOOSE',
      select: 'SELECT',
      unselect: 'UNSELECT',
      label: 'LABEL',
      unlabel: 'UNLABEL',
      shelve: 'SHELVE',
      hide: 'HIDE',
      discard: 'DISCARD',
      undiscard: 'RETRIEVE',
      pin: 'PIN',
      unpin: 'UNPIN',
      unpinned: 'UNPINNED',
      nameless: 'NAMELESS',
      blank_verb: 'VERB',
      blank_noun: 'SET/SELECTION',
      hunt: 'HUNT',
      walk: 'WALK',
      walked: 'WALKED',
      wander: 'WANDER',
      draw: 'DRAW',
      undraw: 'UNDRAW',
      connect: 'CONNECT',
      spawn: 'SPAWN',
      specialize: 'SPECIALIZE',
      annotate: 'ANNOTATE',
      suppress: "SUPPRESS"
    };

    Huviz.prototype.default_settings = [
      {
        reset_settings_to_default: {
          text: "Reset Settings",
          label: {
            title: "Reset all settings to their defaults"
          },
          input: {
            type: "button",
            label: "Reset"
          }
        }
      }, {
        use_accordion_for_settings: {
          text: "show Settings in accordion",
          label: {
            title: "Show the Settings Groups as an 'Accordion'"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        show_cosmetic_tabs: {
          text: "Show Cosmetic Tabs",
          label: {
            title: "Expose the merely informational tabs such as 'Intro' and 'Credits'"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      }, {
        focused_mag: {
          group: "Labels",
          text: "focused label mag",
          input: {
            value: 1.4,
            min: 1,
            max: 3,
            step: .1,
            type: 'range'
          },
          label: {
            title: "the amount bigger than a normal label the currently focused one is"
          }
        }
      }, {
        selected_mag: {
          group: "Labels",
          text: "selected node mag",
          input: {
            value: 1.5,
            min: 0.5,
            max: 4,
            step: .1,
            type: 'range'
          },
          label: {
            title: "the amount bigger than a normal node the currently selected ones are"
          }
        }
      }, {
        label_em: {
          group: "Labels",
          text: "label size (em)",
          label: {
            title: "the size of the font"
          },
          input: {
            value: .9,
            min: .1,
            max: 4,
            step: .05,
            type: 'range'
          }
        }
      }, {
        charge: {
          group: "Layout",
          text: "charge (-)",
          label: {
            title: "the repulsive charge betweeen nodes"
          },
          input: {
            value: -210,
            min: -600,
            max: -1,
            step: 1,
            type: "range"
          }
        }
      }, {
        gravity: {
          group: "Layout",
          text: "gravity",
          label: {
            title: "the attractive force keeping nodes centered"
          },
          input: {
            value: 0.75,
            min: 0,
            max: 1,
            step: 0.025,
            type: "range"
          }
        }
      }, {
        shelf_radius: {
          group: "Sizing",
          text: "shelf radius",
          label: {
            title: "how big the shelf is"
          },
          input: {
            value: 0.8,
            min: 0.1,
            max: 3,
            step: 0.05,
            type: "range"
          }
        }
      }, {
        fisheye_zoom: {
          group: "Sizing",
          text: "fisheye zoom",
          label: {
            title: "how much magnification happens"
          },
          input: {
            value: 6.0,
            min: 1,
            max: 20,
            step: 0.2,
            type: "range"
          }
        }
      }, {
        fisheye_radius: {
          group: "Sizing",
          text: "fisheye radius",
          label: {
            title: "how big the fisheye is"
          },
          input: {
            value: 300,
            min: 0,
            max: 2000,
            step: 20,
            type: "range"
          }
        }
      }, {
        node_radius: {
          group: "Sizing",
          text: "node radius",
          label: {
            title: "how fat the nodes are"
          },
          input: {
            value: 3,
            min: 0.5,
            max: 50,
            step: 0.1,
            type: "range"
          }
        }
      }, {
        node_diff: {
          group: "Sizing",
          text: "node differentiation",
          label: {
            title: "size variance for node edge count"
          },
          input: {
            value: 1,
            min: 0,
            max: 10,
            step: 0.1,
            type: "range"
          }
        }
      }, {
        focus_threshold: {
          group: "Sizing",
          text: "focus threshold",
          label: {
            title: "how fine is node recognition"
          },
          input: {
            value: 20,
            min: 10,
            max: 150,
            step: 1,
            type: "range"
          }
        }
      }, {
        link_distance: {
          group: "Layout",
          text: "link distance",
          label: {
            title: "how long the lines are"
          },
          input: {
            value: 29,
            min: 5,
            max: 500,
            step: 2,
            type: "range"
          }
        }
      }, {
        edge_width: {
          group: "Sizing",
          text: "line thickness",
          label: {
            title: "how thick the lines are"
          },
          input: {
            value: 0.2,
            min: 0.2,
            max: 10,
            step: .2,
            type: "range"
          }
        }
      }, {
        line_edge_weight: {
          group: "Sizing",
          text: "line edge weight",
          label: {
            title: "how much thicker lines become to indicate the number of snippets"
          },
          input: {
            value: 0.45,
            min: 0,
            max: 1,
            step: 0.01,
            type: "range"
          }
        }
      }, {
        swayfrac: {
          group: "Sizing",
          text: "sway fraction",
          label: {
            title: "how much curvature lines have"
          },
          input: {
            value: 0.22,
            min: -1.0,
            max: 1.0,
            step: 0.01,
            type: "range"
          }
        }
      }, {
        label_graphed: {
          group: "Labels",
          text: "label graphed nodes",
          style: "display:none",
          label: {
            title: "whether graphed nodes are always labelled"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        truncate_labels_to: {
          group: "Labels",
          text: "truncate and scroll",
          label: {
            title: "truncate and scroll labels longer than this, or zero to disable"
          },
          input: {
            value: 0,
            min: 0,
            max: 60,
            step: 1,
            type: "range"
          }
        }
      }, {
        snippet_count_on_edge_labels: {
          group: "Labels",
          text: "snippet count on edge labels",
          label: {
            title: "whether edges have their snippet count shown as (#)"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        nodes_pinnable: {
          style: "display:none",
          text: "nodes pinnable",
          label: {
            title: "whether repositioning already graphed nodes pins them at the new spot"
          },
          input: {
            checked: "checked",
            type: "checkbox"
          }
        }
      }, {
        use_fancy_cursor: {
          style: "display:none",
          text: "use fancy cursor",
          label: {
            title: "use custom cursor"
          },
          input: {
            checked: "checked",
            type: "checkbox"
          }
        }
      }, {
        doit_asap: {
          style: "display:none",
          text: "DoIt ASAP",
          label: {
            title: "execute commands as soon as they are complete"
          },
          input: {
            checked: "checked",
            type: "checkbox"
          }
        }
      }, {
        show_dangerous_datasets: {
          style: "display:none",
          text: "Show dangerous datasets",
          label: {
            title: "Show the datasets which are too large or buggy"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        display_labels_as: {
          group: "Labels",
          text: "Display Graph with Labels As...",
          label: {
            title: "Select type of label display"
          },
          input: {
            type: "select"
          },
          options: [
            {
              label: "Words",
              value: "canvas"
            }, {
              label: "Boxes",
              value: "pills",
              selected: true
            }, {
              label: "Boxes NG (beta)",
              value: "nodeLabels"
            }
          ]
        }
      }, {
        theme_colors: {
          group: "Styling",
          text: "Display graph with dark theme",
          label: {
            title: "Show graph plotted on a black background"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        paint_label_dropshadows: {
          group: "Styling",
          text: "Draw drop-shadows behind labels",
          label: {
            title: "Make labels more visible when overlapping"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      }, {
        display_shelf_clockwise: {
          group: "Styling",
          text: "Display nodes clockwise",
          label: {
            title: "Display clockwise (uncheck for counter-clockwise)"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      }, {
        choose_node_display_angle: {
          group: "Styling",
          text: "Node display angle",
          label: {
            title: "Where on shelf to place first node"
          },
          input: {
            value: 0.5,
            min: 0,
            max: 1,
            step: 0.25,
            type: "range"
          }
        }
      }, {
        language_path: {
          group: "Ontological",
          text: "Language Path",
          label: {
            title: "Using ':' as separator and with ANY and NOLANG as possible values,\na list of the languages to expose, in order of preference.\nExamples: \"en:fr\" means show English before French or nothing;\n\"ANY:en\" means show any language before showing English;\n\"en:ANY:NOLANG\" means show English if available, then any other\nlanguage, then finally labels in no declared language."
          },
          input: {
            type: "text",
            value: (window.navigator.language.substr(0, 2) + ":en:ANY:NOLANG").replace("en:en:", "en:"),
            size: "16",
            placeholder: "en:es:fr:de:ANY:NOLANG"
          }
        }
      }, {
        ontological_settings_preamble: {
          group: "Ontological",
          text: "Set before data ingestion...",
          label: {
            title: "The following settings must be adjusted before\ndata ingestion for them to take effect."
          }
        }
      }, {
        show_class_instance_edges: {
          group: "Ontological",
          text: "Show class-instance relationships",
          label: {
            title: "display the class-instance relationship as an edge"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        use_lid_as_node_name: {
          group: "Ontological",
          text: "Use local-id as node name",
          label: {
            title: "Use the local-id of a resource as its node name, permitting display of nodes nothing else is known about."
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        make_nodes_for_literals: {
          group: "Ontological",
          text: "Make nodes for literals",
          label: {
            title: "show literal values (dates, strings, numbers) as nodes"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          },
          event_type: "change"
        }
      }, {
        group_literals_by_subj_and_pred: {
          group: "Ontological",
          text: "Group literals by subject & predicate",
          label: {
            title: "Group literals together as a single node when they have\na language indicated and they share a subject and predicate, on the\ntheory that they are different language versions of the same text."
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      }, {
        color_nodes_as_pies: {
          group: "Ontological",
          text: "Color nodes as pies",
          label: {
            title: "Show all a node's types as colored pie pieces."
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        suppress_annotation_edges: {
          group: "Annotation",
          "class": "alpha_feature",
          text: "Suppress Annotation Edges",
          label: {
            title: "Do not show Open Annotation edges or nodes.\nSummarize them as a hasAnnotation edge and enable the Annotation Inspector."
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        show_hide_endpoint_loading: {
          style: "display:none",
          "class": "alpha_feature",
          text: "Show SPARQL endpoint loading forms",
          label: {
            title: "Show SPARQL endpoint interface for querying for nodes"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        graph_title_style: {
          group: "Captions",
          text: "Title display ",
          label: {
            title: "Select graph title style"
          },
          input: {
            type: "select"
          },
          options: [
            {
              label: "Watermark",
              value: "subliminal",
              selected: true
            }, {
              label: "Bold Titles 1",
              value: "bold1"
            }, {
              label: "Bold Titles 2",
              value: "bold2"
            }, {
              label: "Custom Captions",
              value: "custom"
            }
          ]
        }
      }, {
        graph_custom_main_title: {
          group: "Captions",
          style: "display:none",
          text: "Custom Title",
          label: {
            title: "Title that appears on the graph background"
          },
          input: {
            type: "text",
            size: "16",
            placeholder: "Enter Title"
          }
        }
      }, {
        graph_custom_sub_title: {
          group: "Captions",
          style: "display:none",
          text: "Custom Sub-title",
          label: {
            title: "Sub-title that appears below main title"
          },
          input: {
            type: "text",
            size: "16",
            placeholder: "Enter Sub-title"
          }
        }
      }, {
        discover_geonames_as: {
          group: "Geonames",
          html_text: '<a href="http://www.geonames.org/login" target="geonamesAcct">Username</a> ',
          label: {
            title: "The GeoNames Username to look up geonames as"
          },
          input: {
            jsWidgetClass: GeoUserNameWidget,
            type: "text",
            value: "huviz",
            size: "14",
            placeholder: "e.g. huviz"
          }
        }
      }, {
        discover_geonames_remaining: {
          group: "Geonames",
          text: 'GeoNames Limit ',
          label: {
            title: "The number of Remaining Geonames to look up.\nIf zero before loading, then lookup is suppressed."
          },
          input: {
            type: "integer",
            value: 20,
            size: 6
          }
        }
      }, {
        discover_geonames_greedily: {
          group: "Geonames",
          text: "Capture GeoNames Greedily",
          label: {
            title: "Capture not just names but populations too."
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        discover_geonames_deeply: {
          group: "Geonames",
          text: "Capture GeoNames Deeply",
          label: {
            title: "Capture not just directly referenced but also the containing geographical places from GeoNames."
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        show_edge_labels_adjacent_to_labelled_nodes: {
          group: "Labels",
          text: "Show adjacent edge labels",
          label: {
            title: "Show edge labels adjacent to labelled nodes"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        show_edges: {
          "class": "alpha_feature",
          text: "Show Edges",
          label: {
            title: "Do draw edges"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      }, {
        center_the_distinguished_node: {
          "class": "alpha_feature",
          text: "Center the distinguished node",
          label: {
            title: "Center the most interesting node"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      }, {
        arrows_chosen: {
          "class": "alpha_feature",
          text: "Arrowheads on Edges",
          label: {
            title: "Displays directional arrowheads on the 'object' end of lines."
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      }, {
        show_images_in_nodes: {
          group: "Images",
          "class": "alpha_feature",
          text: "Show Images in Nodes",
          label: {
            title: "Show dbpedia:thumbnail and foaf:thumbnail in nodes when available"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      }, {
        show_thumbs_dont_graph: {
          group: "Images",
          "class": "alpha_feature",
          text: "Show thumbnails, don't graph",
          label: {
            title: "Treat dbpedia:thumbnail and foaf:thumbnail as images, not graph data"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      }, {
        show_queries_tab: {
          group: "SPARQL",
          "class": "alpha_feature",
          text: "Show Queries Tab",
          label: {
            title: "Expose the 'Queries' tab to be able to monitor and debug SPARQL queries"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        max_outstanding_sparql_requests: {
          group: "SPARQL",
          "class": "alpha_feature",
          text: "Max. Outstanding Requests",
          label: {
            title: "Cap on the number of simultaneous SPARQL requests"
          },
          input: {
            value: 20,
            min: 1,
            max: 100,
            step: 1,
            type: "range"
          }
        }
      }, {
        sparql_timeout: {
          group: "SPARQL",
          "class": "alpha_feature",
          text: "Query timeout",
          label: {
            title: "Number of seconds to run SPARQL queries before giving up."
          },
          input: {
            value: 45,
            min: 1,
            max: 90,
            step: 1,
            type: "range"
          }
        }
      }, {
        sparql_query_default_limit: {
          group: "SPARQL",
          "class": "alpha_feature",
          text: "Default Node Limit",
          label: {
            title: "Default value for the 'Node Limit'"
          },
          input: {
            value: 200,
            min: 1,
            max: 1000,
            step: 10,
            type: "range"
          }
        }
      }, {
        debug_shelf_angles_and_flipping: {
          group: "Debugging",
          "class": "alpha_feature",
          text: "debug shelf angles and flipping",
          label: {
            title: "show angles and flags with labels"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        show_performance_monitor: {
          group: "Debugging",
          "class": "alpha_feature",
          text: "Show Performance Monitor",
          label: {
            title: "Feedback on what HuViz is doing"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        slow_it_down: {
          group: "Debugging",
          "class": "alpha_feature",
          text: "Slow it down (sec)",
          label: {
            title: "execute commands with wait states to simulate long operations"
          },
          input: {
            value: 0,
            min: 0,
            max: 10,
            step: 0.1,
            type: "range"
          }
        }
      }, {
        show_hunt_verb: {
          group: "Debugging",
          "class": "alpha_feature",
          text: "Show Hunt verb",
          label: {
            title: "Expose the 'Hunt' verb, for demonstration of SortedSet.binary_search()"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        display_loading_notice: {
          group: "Debugging",
          "class": "alpha_feature",
          text: "Display Loading Notice",
          label: {
            title: "Display the loading_notice after the user presses LOAD"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          }
        }
      }
    ];

    Huviz.prototype.auto_adjust_settings = function() {
      return this;
    };

    Huviz.prototype.make_settings_group = function(groupName) {
      return this.insertBeforeEnd(this.settingGroupsContainerElem, "<h1>" + groupName + "</h1><div class=\"settingsGroup\"></div>");
    };

    Huviz.prototype.get_or_create_settings_group = function(groupName) {
      var group, groupId;
      groupId = synthIdFor(groupName);
      if (this.settings_groups == null) {
        this.settings_groups = {};
      }
      group = this.settings_groups[groupName];
      if (!group) {
        this.settings_groups[groupName] = group = this.make_settings_group(groupName);
      }
      return group;
    };

    Huviz.prototype.init_settings_to_defaults = function() {
      var WidgetClass, control, controlElem, control_name, control_spec, elemPromises, event_type, execInitElem, groupElem, groupName, initial_new_val, initial_old_val, inputElem, inputId, j, k, labelElem, len1, opt, optIdx, optionElem, ref, ref1, ref2, ref3, settings_input_sel, v;
      elemPromises = [];
      this.settingsElem = document.querySelector(this.args.settings_sel);
      settings_input_sel = this.args.settings_sel + ' input';
      this.settings_cursor = new TextCursor(settings_input_sel, "");
      if (this.settings_cursor) {
        $(settings_input_sel).on("mouseover", this.update_settings_cursor);
      }
      this.settings = d3.select(this.settingsElem);
      this.settings.classed('settings', true);
      this.settingGroupsContainerElem = this.insertBeforeEnd(this.settingsElem, '<div class="settingGroupsContainer"></div>');
      ref = this.default_settings;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        control_spec = ref[j];
        for (control_name in control_spec) {
          control = control_spec[control_name];
          initial_old_val = null;
          initial_new_val = null;
          inputId = unique_id(control_name + '_');
          groupName = control.group || 'General';
          groupElem = this.get_or_create_settings_group(groupName);
          controlElem = this.insertBeforeEnd(groupElem, "<div class=\"a_setting " + control_name + "__setting\"></div>");
          labelElem = this.insertBeforeEnd(controlElem, "<label for=\"" + inputId + "\"></label>");
          if (control.text != null) {
            labelElem.innerHTML = control.text;
          }
          if (control.html_text != null) {
            labelElem.innerHTML = control.html_text;
          }
          if (control.style != null) {
            controlElem.setAttribute('style', control.style);
          }
          if (control["class"] != null) {
            controlElem.classList.add(control["class"]);
          }
          if (control.input != null) {
            if (control.input.type === 'select') {
              inputElem = this.insertBeforeEnd(controlElem, "<select></select>");
              ref1 = control.options;
              for (optIdx in ref1) {
                opt = ref1[optIdx];
                optionElem = this.insertBeforeEnd(inputElem, "<option value=\"" + opt.value + "\"></option>");
                if (initial_new_val == null) {
                  initial_new_val = opt.value;
                }
                if (opt.selected) {
                  optionElem.setAttribute('selected', 'selected');
                  initial_new_val = opt.value;
                }
                if (opt.label != null) {
                  optionElem.innerHTML = opt.label;
                }
              }
            } else if (control.input.type === 'button') {
              inputElem = this.insertBeforeEnd(controlElem, "<button type=\"button\">(should set label)</button>");
              if (control.input.label != null) {
                inputElem.innerHTML = control.input.label;
              }
              if (control.input.style != null) {
                inputElem.setAttribute('style', control.input.style);
              }
            } else {
              inputElem = this.insertBeforeEnd(controlElem, "<input name=\"" + control_name + "\"></input>");
              WidgetClass = null;
              ref2 = control.input;
              for (k in ref2) {
                v = ref2[k];
                if (k === 'jsWidgetClass') {
                  WidgetClass = v;
                  continue;
                }
                if (k === 'value') {
                  initial_old_val = this[control_name];
                  initial_new_val = v;
                }
                inputElem.setAttribute(k, v);
              }
              if (WidgetClass) {
                this[control_name + '__widget'] = new WidgetClass(this, inputElem);
              }
              if (control.input.type === 'checkbox') {
                initial_new_val = !(control.input.checked == null);
              }
            }
            inputElem.setAttribute('id', inputId);
            inputElem.setAttribute('name', control_name);
            event_type = control.event_type;
            if (!event_type) {
              if (((ref3 = control.input.type) === 'checkbox' || ref3 === 'range' || ref3 === 'radio')) {
                event_type = 'input';
              } else {
                event_type = 'change';
              }
            }
            if (event_type === 'change') {
              inputElem.addEventListener('change', this.change_graph_settings);
            } else {
              inputElem.addEventListener('input', this.update_graph_settings);
            }
            if (control.input.type === 'button') {
              inputElem.addEventListener('click', this.update_graph_settings);
              continue;
            }
            execInitElem = (function(_this) {
              return function(resolve, reject) {
                var e;
                try {
                  _this.change_setting_to_from(control_name, initial_new_val, initial_old_val);
                  return resolve(control_name);
                } catch (_error) {
                  e = _error;
                  return reject(e);
                }
              };
            })(this);
            elemPromises.push(new Promise(execInitElem));
          } else {
            console.info(control_name + " has no input");
          }
          if (control.label.title != null) {
            this.insertBeforeEnd(controlElem, '<div class="setting_explanation">' + control.label.title + '</div>');
          }
        }
      }
      return Promise.all(elemPromises);
    };

    Huviz.prototype.update_settings_cursor = function(evt) {
      var cursor_text;
      cursor_text = evt.target.value.toString();
      if (!cursor_text) {
        console.debug(cursor_text);
      } else {
        console.log(cursor_text);
      }
      return this.settings_cursor.set_text(cursor_text);
    };

    Huviz.prototype.update_graph_settings = function(event) {
      return this.change_graph_settings(event, true);
    };

    Huviz.prototype.change_graph_settings = function(event, update) {
      var asNum, cooked_value, old_value, target;
      target = event.target;
      if (update == null) {
        update = false;
      }
      if (target.type === "checkbox") {
        cooked_value = target.checked;
      } else if (target.type === "range") {
        asNum = parseFloat(target.value);
        cooked_value = ('' + asNum) !== 'NaN' && asNum || target.value;
      } else {
        cooked_value = target.value;
      }
      old_value = this[target.name];
      this.change_setting_to_from(target.name, cooked_value, old_value);
      if (update) {
        this.update_fisheye();
        this.updateWindow();
      }
      return this.tick("Tick in update_graph_settings");
    };

    Huviz.prototype.adjust_settings_from_list_of_specs = function(setting_specs) {
      var control, j, len1, len2, option, p, ref, setting_name, setting_spec, value;
      for (j = 0, len1 = setting_specs.length; j < len1; j++) {
        setting_spec = setting_specs[j];
        for (setting_name in setting_spec) {
          control = setting_spec[setting_name];
          value = null;
          if (control.input != null) {
            if (control.input.value != null) {
              value = control.input.value;
            }
            if (control.input.type === 'button') {
              continue;
            }
            if (control.input.type === 'checkbox') {
              if (control.input.checked) {
                value = true;
              } else {
                value = false;
              }
            }
            if (control.input.type === 'select') {
              ref = control.options;
              for (p = 0, len2 = ref.length; p < len2; p++) {
                option = ref[p];
                if (option.selected) {
                  value = option.value;
                }
              }
            }
            if (control.input.type === 'text') {
              value = control.input.value || '';
            }
          } else {
            continue;
          }
          if (value != null) {
            this.adjust_setting_if_needed(setting_name, value);
          } else {
            console.info(setting_name + " not handled by adjust_settings_from_list_of_specs()");
            console.info("  default_value:", this.get_setting_input_JQElem(setting_name).val());
          }
        }
      }
    };

    Huviz.prototype.adjust_settings_from_kv_list = function(kv_list) {
      var results1, setting, value;
      results1 = [];
      for (setting in kv_list) {
        value = kv_list[setting];
        results1.push(this.adjust_setting(setting, value));
      }
      return results1;
    };

    Huviz.prototype.adjust_setting_if_needed = function(setting_name, new_value, skip_custom_handler) {
      var equality, input, old_value, theType;
      input = this.get_setting_input_JQElem(setting_name);
      theType = input.attr('type');
      if (theType === 'checkbox' || theType === 'radiobutton') {
        old_value = input.prop('checked');
      } else {
        old_value = input.val();
      }
      equality = "because old_value: (" + old_value + ") new_value: (" + new_value + ")";
      if ("" + old_value === "" + new_value) {
        return;
      }
      console.log("change_setting_if_needed('" + setting_name + "', " + new_value + ")");
      console.info("  change required " + equality);
      return this.adjust_setting(input, new_value, old_value, skip_custom_handler);
    };

    Huviz.prototype.change_setting_to_from = function(setting_name, new_value, old_value, skip_custom_handler) {
      var cursor_text, custom_handler, custom_handler_name;
      skip_custom_handler = (skip_custom_handler != null) && skip_custom_handler || false;
      custom_handler_name = "on_change_" + setting_name;
      custom_handler = this[custom_handler_name];
      if (this.settings_cursor) {
        if (new_value != null) {
          cursor_text = new_value.toString();
          this.settings_cursor.set_text(cursor_text);
        }
      }
      if ((custom_handler != null) && !skip_custom_handler) {
        return custom_handler.apply(this, [new_value, old_value]);
      } else {
        return this[setting_name] = new_value;
      }
    };

    Huviz.prototype.adjust_settings_from_defaults = function() {
      return this.adjust_settings_from_list_of_specs(this.default_settings);
    };

    Huviz.prototype.on_change_reset_settings_to_default = function(event) {
      console.group('reset_settings_to_default()...');
      this.adjust_settings_from_defaults();
      this.adjust_settings_from_kv_list(this.args.settings);
      console.groupEnd();
    };

    Huviz.prototype.on_change_use_fancy_cursor = function(new_val, old_val) {
      this.use_fancy_cursor = !!new_val;
      if (this.use_fancy_cursor && !this.text_cursor) {
        return this.text_cursor = new TextCursor(this.args.viscanvas_sel, "");
      }
    };

    Huviz.prototype.on_change_use_accordion_for_settings = function(new_val, old_val) {
      var doit;
      if (new_val) {
        doit = (function(_this) {
          return function() {
            return $(_this.settingGroupsContainerElem).accordion();
          };
        })(this);
        return setTimeout(doit, 200);
      } else {
        return console.warn('We do not yet have a solution for turning OFF the Accordion');
      }
    };

    Huviz.prototype.on_change_nodes_pinnable = function(new_val, old_val) {
      var j, len1, node, ref, results1;
      if (!new_val) {
        if (this.graphed_set) {
          ref = this.graphed_set;
          results1 = [];
          for (j = 0, len1 = ref.length; j < len1; j++) {
            node = ref[j];
            results1.push(node.fixed = false);
          }
          return results1;
        }
      }
    };

    Huviz.prototype.on_change_show_hunt_verb = function(new_val, old_val) {
      var vset;
      if (new_val) {
        vset = {
          hunt: this.human_term.hunt
        };
        this.gclui.verb_sets.push(vset);
        return this.gclui.add_verb_set(vset);
      }
    };

    Huviz.prototype.on_change_show_cosmetic_tabs = function(new_val, old_val) {
      if (this.tab_for_tabs_sparqlQueries_JQElem == null) {
        setTimeout(((function(_this) {
          return function() {
            return _this.on_change_show_cosmetic_tabs(new_val, old_val);
          };
        })(this)), 50);
        return;
      }
      if (new_val) {
        if (this.tab_for_tabs_credit_JQElem != null) {
          this.tab_for_tabs_credit_JQElem.show();
        }
        if (this.tab_for_tabs_intro_JQElem != null) {
          this.tab_for_tabs_intro_JQElem.show();
        }
      } else {
        if (this.tab_for_tabs_credit_JQElem != null) {
          this.tab_for_tabs_credit_JQElem.hide();
        }
        if (this.tab_for_tabs_intro_JQElem != null) {
          this.tab_for_tabs_intro_JQElem.hide();
        }
      }
    };

    Huviz.prototype.on_change_show_queries_tab = function(new_val, old_val) {
      if (this.tab_for_tabs_sparqlQueries_JQElem == null) {
        setTimeout(((function(_this) {
          return function() {
            return _this.on_change_show_queries_tab(new_val, old_val);
          };
        })(this)), 50);
        return;
      }
      if (new_val) {
        this.tab_for_tabs_sparqlQueries_JQElem.show();
      } else {
        this.tab_for_tabs_sparqlQueries_JQElem.hide();
      }
    };

    Huviz.prototype.on_change_show_dangerous_datasets = function(new_val, old_val) {
      if (new_val) {
        $('option.dangerous').show();
        return $('option.dangerous').text(function(idx, text) {
          var append;
          append = ' (!)';
          if (!text.match(/\(\!\)$/)) {
            return text + append;
          }
          return text;
        });
      } else {
        return $('option.dangerous').hide();
      }
    };

    Huviz.prototype.on_change_display_labels_as = function(new_val, old_val) {
      this.display_labels_as = new_val;
      if (new_val === 'nodeLabels') {
        this.viscanvas_JQElem.addClass('nodeLabels');
      } else {
        this.viscanvas_JQElem.removeClass('nodeLabels');
      }
      if (new_val === 'pills') {
        this.adjust_setting('charge', -3000);
        this.adjust_setting('link_distance', 200);
      } else {
        this.adjust_setting('charge', -210);
        this.adjust_setting('link_distance', 29);
      }
      return this.updateWindow();
    };

    Huviz.prototype.on_change_theme_colors = function(new_val) {
      if (new_val) {
        renderStyles = themeStyles.dark;
        this.topElem.classList.remove(themeStyles.light.themeName);
      } else {
        renderStyles = themeStyles.light;
        this.topElem.classList.remove(themeStyles.light.themeName);
      }
      this.topElem.style.backgroundColor = renderStyles.pageBg;
      this.topElem.classList.add(renderStyles.themeName);
      return this.updateWindow();
    };

    Huviz.prototype.on_change_paint_label_dropshadows = function(new_val) {
      if (new_val) {
        this.paint_label_dropshadows = true;
      } else {
        this.paint_label_dropshadows = false;
      }
      return this.updateWindow();
    };

    Huviz.prototype.on_change_display_shelf_clockwise = function(new_val) {
      if (new_val) {
        this.display_shelf_clockwise = true;
      } else {
        this.display_shelf_clockwise = false;
      }
      return this.updateWindow();
    };

    Huviz.prototype.on_change_choose_node_display_angle = function(new_val) {
      nodeOrderAngle = new_val;
      return this.updateWindow();
    };

    Huviz.prototype.on_change_shelf_radius = function(new_val, old_val) {
      this.change_setting_to_from('shelf_radius', new_val, old_val, true);
      this.update_graph_radius();
      return this.updateWindow();
    };

    Huviz.prototype.on_change_truncate_labels_to = function(new_val, old_val) {
      var j, len1, node, ref;
      this.change_setting_to_from('truncate_labels_to', new_val, old_val, true);
      if (this.all_set) {
        ref = this.all_set;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          node = ref[j];
          this.unscroll_pretty_name(node);
        }
      }
      return this.updateWindow();
    };

    Huviz.prototype.on_change_graph_title_style = function(new_val, old_val) {
      var custSubTitle, custTitle;
      if (new_val === "custom") {
        this.topJQElem.find(".main_title").removeAttr("style");
        this.topJQElem.find(".sub_title").removeAttr("style");
        this.topJQElem.find(".graph_custom_main_title__setting").css('display', 'inherit');
        this.topJQElem.find(".graph_custom_sub_title__setting").css('display', 'inherit');
        custTitle = this.topJQElem.find("input[name='graph_custom_main_title']");
        custSubTitle = this.topJQElem.find("input[name='graph_custom_sub_title']");
        this.update_caption(custTitle[0].title, custSubTitle[0].title);
        this.topJQElem.find("a.git_commit_hash_watermark").css('display', 'none');
        this.ontology_watermark_JQElem.attr('style', '');
      } else if (new_val === "bold1") {
        this.ontology_watermark_JQElem.css('display', 'none');
      } else {
        this.topJQElem.find(".graph_custom_main_title__setting").css('display', 'none');
        this.topJQElem.find(".graph_custom_sub_title__setting").css('display', 'none');
        this.topJQElem.find("a.git_commit_hash_watermark").css('display', 'inherit');
        this.ontology_watermark_JQElem.attr('style', '');
        this.update_caption(this.data_uri, this.onto_uri);
      }
      this.dataset_watermark_JQElem.removeClass().addClass("dataset_watermark " + new_val);
      return this.ontology_watermark_JQElem.removeClass().addClass("ontology_watermark " + new_val);
    };

    Huviz.prototype.on_change_graph_custom_main_title = function(new_val) {
      return this.dataset_watermark_JQElem.text(new_val);
    };

    Huviz.prototype.on_change_graph_custom_sub_title = function(new_val) {
      return this.ontology_watermark_JQElem.text(new_val);
    };

    Huviz.prototype.on_change_language_path = function(new_val, old_val) {
      var e, ref;
      try {
        MultiString.set_langpath(new_val);
      } catch (_error) {
        e = _error;
        alert("Input: " + new_val + "\n" + (e.toString()) + "\n\n  The 'Language Path' should be a colon-separated list of ISO two-letter language codes, such as 'en' or 'fr:en:es'.  One can also include the keywords ANY, NOLANG or ALL in the list.\n  'ANY' means show a value from no particular language and works well in situations where you don't know or care which language is presented.\n  'NOLANG' means show a value for which no language was specified.\n  'ALL' causes all the different language versions to be revealed. It is best used alone\n\nExamples (show first available, so order matters)\n  en:fr\n    show english or french or nothing\n  en:ANY:NOLANG\n    show english or ANY other language or language-less label\n  ALL\n    show all versions available, language-less last");
        this.change_setting_to_from('language_path', old_val, old_val);
        return;
      }
      if (this.shelved_set) {
        this.shelved_set.resort();
        this.discarded_set.resort();
      }
      this.update_labels_on_pickers();
      if ((ref = this.gclui) != null) {
        ref.resort_pickers();
      }
      if (this.ctx != null) {
        this.tick("Tick in on_change_language_path");
      }
    };

    Huviz.prototype.on_change_color_nodes_as_pies = function(new_val, old_val) {
      this.color_nodes_as_pies = new_val;
      return this.recolor_nodes();
    };

    Huviz.prototype.on_change_show_hide_endpoint_loading = function(new_val, old_val) {
      var endpoint;
      if (this.endpoint_loader) {
        endpoint = "#" + this.endpoint_loader.uniq_id;
      }
      if (new_val && endpoint) {
        return $(endpoint).css('display', 'block');
      } else {
        return $(endpoint).css('display', 'none');
      }
    };

    Huviz.prototype.on_change_show_performance_monitor = function(new_val, old_val) {
      if (new_val) {
        this.performance_dashboard_JQElem.css('display', 'block');
        this.show_performance_monitor = true;
        this.pfm_dashboard();
        return this.timerId = setInterval(this.pfm_update, 1000);
      } else {
        clearInterval(this.timerId);
        this.performance_dashboard_JQElem.css('display', 'none').html('');
        return this.show_performance_monitor = false;
      }
    };

    Huviz.prototype.on_change_discover_geonames_remaining = function(new_val, old_val) {
      this.discover_geonames_remaining = parseInt(new_val, 10);
      return this.discover_names_including('geonames.org');
    };

    Huviz.prototype.on_change_discover_geonames_as = function(new_val, old_val) {
      if (this.discover_geonames_as__widget == null) {
        setTimeout(((function(_this) {
          return function() {
            return _this.on_change_discover_geonames_as(new_val, old_val);
          };
        })(this)), 50);
        return;
      }
      this.discover_geonames_as = new_val;
      if (new_val) {
        this.discover_geonames_as__widget.set_state('untried');
        return this.discover_names_including('geonames.org');
      } else {
        if (this.discover_geonames_as__widget) {
          return this.discover_geonames_as__widget.set_state('empty');
        }
      }
    };

    Huviz.prototype.on_change_center_the_distinguished_node = function(new_val, old_val) {
      this.center_the_distinguished_node = new_val;
      return this.tick();
    };

    Huviz.prototype.on_change_arrows_chosen = function(new_val, old_val) {
      this.arrows_chosen = new_val;
      return this.tick();
    };

    Huviz.prototype.init_from_settings = function() {
      var elem, j, len1, ref, results1;
      ref = $(".settings input");
      results1 = [];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        elem = ref[j];
        results1.push(this.update_graph_settings(elem, false));
      }
      return results1;
    };

    Huviz.prototype.after_file_loaded = function(uri, callback) {
      this.call_on_dataset_loaded(uri);
      if (callback) {
        return callback();
      }
    };

    Huviz.prototype.show_node_pred_edge_stats = function() {
      var edge_count, pred_count, s;
      pred_count = 0;
      edge_count = 0;
      s = "nodes:" + this.nodes.length + " predicates:" + pred_count + " edges:" + edge_count;
      return console.log(s);
    };

    Huviz.prototype.call_on_dataset_loaded = function(uri) {
      return this.gclui.on_dataset_loaded({
        uri: uri
      });
    };

    Huviz.prototype.XXX_load_file = function() {
      return this.load_data_with_onto(this.get_dataset_uri());
    };

    Huviz.prototype.load_data_with_onto = function(data, onto, callback) {
      this.data_uri = data.value;
      this.set_ontology(onto.value);
      this.onto_uri = onto.value;
      if (this.args.display_reset) {
        $("#reset_btn").show();
      } else {
        this.disable_dataset_ontology_loader(data, onto);
      }
      this.show_state_msg(this.data_uri);
      if (!this.G.subjects) {
        return this.fetchAndShow(this.data_uri, callback);
      }
    };

    Huviz.prototype.disable_data_set_selector = function() {
      $("[name=data_set]").prop('disabled', true);
      return $("#reload_btn").show();
    };

    Huviz.prototype.XXX_read_data_and_show = function(filename, data) {
      var the_parser;
      data = this.local_file_data;
      if (filename.match(/.ttl$/)) {
        the_parser = this.parseAndShowTTLData;
      } else if (filename.match(/.nq$/)) {
        the_parser = this.parse_and_show_NQ_file;
      } else {
        alert("Unknown file format. Unable to parse '" + filename + "'. Only .ttl and .nq files supported.");
        return;
      }
      the_parser(data);
      return this.disable_dataset_ontology_loader();
    };

    Huviz.prototype.get_dataset_uri = function() {
      return $("select.file_picker option:selected").val();
    };

    Huviz.prototype.run_script_from_hash = function() {
      var script;
      script = this.get_script_from_hash();
      if (script != null) {
        this.gclui.run_script(script);
      }
    };

    Huviz.prototype.get_script_from_hash = function() {
      var script;
      script = location.hash;
      script = ((script == null) || script === "#") && "" || script.replace(/^#/, "");
      script = script.replace(/\+/g, " ");
      if (script) {
        colorlog("get_script_from_hash() script: " + script);
      }
      return script;
    };

    Huviz.prototype.adjust_menus_from_load_cmd = function(cmd) {
      if (cmd.ontologies && cmd.ontologies.length > 0 && !this.ontology_loader.value) {
        this.set_ontology_with_uri(cmd.ontologies[0]);
        if (cmd.data_uri && !this.dataset_loader.value) {
          this.set_dataset_with_uri(cmd.data_uri);
          return true;
        }
      }
      return false;
    };

    Huviz.prototype.json_script_marker = "# JSON FOLLOWS";

    Huviz.prototype.load_script_from_JSON = function(json) {
      var cmdArgs, j, len1, saul_goodman;
      saul_goodman = false;
      for (j = 0, len1 = json.length; j < len1; j++) {
        cmdArgs = json[j];
        if (indexOf.call(cmdArgs.verbs, 'load') >= 0) {
          saul_goodman = this.adjust_menus_from_load_cmd(cmdArgs);
        } else {
          this.gclui.push_cmdArgs_onto_future(cmdArgs);
        }
      }
    };

    Huviz.prototype.parse_script_file = function(data, fname) {
      var line, lines;
      lines = data.split('\n');
      while (lines.length) {
        line = lines.shift();
        if (line.includes(this.json_script_marker)) {
          return JSON.parse(lines.join("\n"));
        }
      }
      return {};
    };

    Huviz.prototype.boot_sequence = function(script) {
      var data_uri;
      this.reset_graph();
      if (script == null) {
        script = this.get_script_from_hash();
      }
      if ((script != null) && script.length) {
        console.log("boot_sequence('" + script + "')");
        return this.gclui.run_script(script);
      } else {
        data_uri = this.get_dataset_uri();
        if (data_uri) {
          return this.load(data_uri);
        }
      }
    };

    Huviz.prototype.load = function(data_uri, callback) {
      if (!this.G.subjects) {
        this.fetchAndShow(data_uri, callback);
      }
      if (this.use_webgl) {
        return this.init_webgl();
      }
    };

    Huviz.prototype.load_with = function(data_uri, ontology_uris) {
      var basename, dataset, ontology;
      this.goto_tab(1);
      basename = function(uri) {
        return uri.split('/').pop().split('.').shift();
      };
      dataset = {
        label: basename(data_uri),
        value: data_uri
      };
      ontology = {
        label: basename(ontology_uris[0]),
        value: ontology_uris[0]
      };
      this.visualize_dataset_using_ontology({}, dataset, [ontology]);
    };

    Huviz.prototype.endpoint_loader_is_quiet = function() {
      return (this.endpoint_loader != null) && this.endpoint_loader.is_quiet(500);
    };

    Huviz.prototype.query_from_seeking_limit = function(querySpec) {
      var finish_prep, graphUrl, limit, serverUrl, subjectUrl;
      serverUrl = querySpec.serverUrl, graphUrl = querySpec.graphUrl, limit = querySpec.limit, subjectUrl = querySpec.subjectUrl;
      if (!this.endpoint_loader_is_quiet()) {
        setTimeout(((function(_this) {
          return function() {
            return _this.query_from_seeking_limit(querySpec);
          };
        })(this)), 50);
        return;
      }
      this.goto_tab(1);
      if (serverUrl != null) {
        this.endpoint_loader.select_by_uri(serverUrl);
        this.sparql_graph_query_and_show__trigger(serverUrl);
        finish_prep = (function(_this) {
          return function() {
            if (graphUrl != null) {
              _this.sparqlQryInput_show();
              _this.sparqlGraphSelector_JQElem.val(graphUrl);
            }
            if (limit != null) {
              _this.endpoint_limit_JQElem.val(limit);
            }
            if (subjectUrl != null) {
              _this.endpoint_labels_JQElem.val(subjectUrl);
            }
            return _this.big_go_button_onclick_sparql();
          };
        })(this);
        this.sparql_graph_query_and_show_queryManager.when_done(finish_prep);
      }
    };

    Huviz.prototype.is_ready = function(node) {
      return (node.id != null) && (node.type != null) && (node.name != null);
    };

    Huviz.prototype.assign_types = function(node, within) {
      var type_id;
      type_id = node.type;
      if (type_id) {
        return this.get_or_create_taxon(type_id).register(node);
      } else {
        throw "there must be a .type before hatch can even be called:" + node.id + " " + type_id;
      }
    };

    Huviz.prototype.is_big_data = function() {
      var ref;
      if (this.big_data_p == null) {
        if ((ref = this.data_uri) != null ? ref.match('poetesses|relations') : void 0) {
          this.big_data_p = true;
        } else {
          this.big_data_p = false;
        }
      }
      return this.big_data_p;
    };

    Huviz.prototype.get_default_set_by_type = function(node) {
      var ref;
      if (this.is_big_data()) {
        if ((ref = node.type) === 'writer') {
          return this.shelved_set;
        } else {
          return this.hidden_set;
        }
      }
      return this.shelved_set;
    };

    Huviz.prototype.get_default_set_by_type = function(node) {
      return this.shelved_set;
    };

    Huviz.prototype.pfm_dashboard = function() {
      var message, warning;
      warning = "";
      message = "<div class='feedback_module'><p>Triples Added: <span id=\"noAddQuad\">0</span></p></div>\n<div class='feedback_module'><p>Number of Nodes: <span id=\"noN\">0</span></p></div>\n<div class='feedback_module'><p>Number of Edges: <span id=\"noE\">0</span></p></div>\n<div class='feedback_module'><p>Number of Predicates: <span id=\"noP\">0</span></p></div>\n<div class='feedback_module'><p>Number of Classes: <span id=\"noC\">0</span></p></div>\n<div class='feedback_module'><p>find_nearest... (msec): <span id=\"highwater_find_node_or_edge\">0</span></p></div>\n<div class='feedback_module'><p>maxtick (msec): <span id=\"highwater_maxtick\">0</span></p></div>\n<div class='feedback_module'><p>discover_name #: <span id=\"highwater_discover_name\">0</span></p></div>\n" + (this.build_pfm_live_monitor('add_quad')) + "\n" + (this.build_pfm_live_monitor('hatch')) + "\n<div class='feedback_module'><p>Ticks in Session: <span id=\"noTicks\">0</span></p></div>\n" + (this.build_pfm_live_monitor('tick')) + "\n<div class='feedback_module'><p>Total SPARQL Requests: <span id=\"noSparql\">0</span></p></div>\n<div class='feedback_module'><p>Outstanding SPARQL Requests: <span id=\"noOR\">0</span></p></div>\n" + (this.build_pfm_live_monitor('sparql'));
      return this.performance_dashboard_JQElem.html(message + warning);
    };

    Huviz.prototype.build_pfm_live_monitor = function(name) {
      var label, monitor;
      label = this.pfm_data["" + name]["label"];
      monitor = "<div class='feedback_module'>" + label + ": <svg id='pfm_" + name + "' class='sparkline' width='200px' height='50px' stroke-width='1'></svg></div>";
      return monitor;
    };

    Huviz.prototype.pfm_count = function(name) {
      return this.pfm_data["" + name].total_count++;
    };

    Huviz.prototype.pfm_update = function() {
      var calls_per_second, class_count, item, k, marker, new_count, noE, noN, noOR, noP, old_count, pfm_marker, ref, results1, time, v, val;
      time = Date.now();
      class_count = 0;
      if (this.nodes) {
        noN = this.nodes.length;
      } else {
        noN = 0;
      }
      $("#noN").html("" + noN);
      if (this.edge_count) {
        noE = this.edge_count;
      } else {
        noE = 0;
      }
      $("#noE").html("" + noE);
      ref = this.highwatermarks;
      for (k in ref) {
        v = ref[k];
        if (k.endsWith('__')) {
          continue;
        }
        val = v;
        if (!Number.isInteger(v)) {
          v = v.toFixed(2);
        }
        $("#highwater_" + k).html(v);
      }
      $("#maxtick").html("" + ((this.maxtick || 0).toFixed(2)));
      if (this.predicate_set) {
        noP = this.predicate_set.length;
      } else {
        noP = 0;
      }
      $("#noP").html("" + noP);
      for (item in this.taxonomy) {
        class_count++;
      }
      this.pfm_data.taxonomy.total_count = class_count;
      $("#noC").html("" + this.pfm_data.taxonomy.total_count);
      $("#noTicks").html("" + this.pfm_data.tick.total_count);
      $("#noAddQuad").html("" + this.pfm_data.add_quad.total_count);
      $("#noSparql").html("" + this.pfm_data.sparql.total_count);
      if (this.endpoint_loader) {
        noOR = this.endpoint_loader.outstanding_requests;
      } else {
        noOR = 0;
      }
      $("#noOR").html("" + noOR);
      results1 = [];
      for (pfm_marker in this.pfm_data) {
        marker = this.pfm_data["" + pfm_marker];
        old_count = marker.prev_total_count;
        new_count = marker.total_count;
        calls_per_second = Math.round(new_count - old_count);
        if (this.pfm_data["" + pfm_marker]["timed_count"] && (this.pfm_data["" + pfm_marker]["timed_count"].length > 0)) {
          if (this.pfm_data["" + pfm_marker]["timed_count"].length > 60) {
            this.pfm_data["" + pfm_marker]["timed_count"].shift();
          }
          this.pfm_data["" + pfm_marker].timed_count.push(calls_per_second);
          this.pfm_data["" + pfm_marker].prev_total_count = new_count + 0.01;
          results1.push(sparkline.sparkline(document.querySelector("#pfm_" + pfm_marker), this.pfm_data["" + pfm_marker].timed_count));
        } else if (this.pfm_data["" + pfm_marker]["timed_count"]) {
          results1.push(this.pfm_data["" + pfm_marker]["timed_count"] = [0.01]);
        } else {
          results1.push(void 0);
        }
      }
      return results1;
    };

    Huviz.prototype.parseAndShowFile = function(uri) {
      var aUri, error, fullUri, worker;
      try {
        aUri = new URL(uri);
      } catch (_error) {
        error = _error;
        fullUri = document.location.origin + uri;
        aUri = new URL(fullUri);
      }
      worker = new Worker('/quaff-lod/quaff-lod-worker-bundle.js');
      worker.addEventListener('message', this.receive_quaff_lod);
      worker.postMessage({
        url: aUri.toString()
      });
    };

    Huviz.prototype.convert_quaff_obj_to_GreenTurtle = function(raw) {
      var out;
      out = {
        value: raw.value
      };
      if (raw.datatype) {
        out.type = raw.datatype.value;
        if (raw.language != null) {
          out.language = raw.language || null;
        }
      } else {
        out.type = raw.type || RDF_object;
      }
      return out;
    };

    Huviz.prototype.receive_quaff_lod = function(event) {
      var graph, graph_uri, o, object, pred_uri, predicate, q, ref, subj_uri, subject;
      ref = event.data, subject = ref.subject, predicate = ref.predicate, object = ref.object, graph = ref.graph;
      if (!subject) {
        if (event.data.type === "end") {
          this.call_on_dataset_loaded();
        } else if (event.data.type === "error") {
          console.log(event.data);
          this.blurt(event.data.data, "error");
        }
        return;
      }
      subj_uri = subject.value;
      pred_uri = predicate.value;
      o = this.convert_quaff_obj_to_GreenTurtle(object);
      graph_uri = graph.value;
      q = {
        s: subj_uri,
        p: pred_uri,
        o: o,
        g: graph_uri
      };
      return this.add_quad(q);
    };

    return Huviz;

  })();

  OntologicallyGrounded = (function(superClass) {
    extend(OntologicallyGrounded, superClass);

    function OntologicallyGrounded() {
      this.parseTTLOntology = bind(this.parseTTLOntology, this);
      return OntologicallyGrounded.__super__.constructor.apply(this, arguments);
    }

    OntologicallyGrounded.prototype.set_ontology = function(ontology_uri) {
      return this.read_ontology(ontology_uri);
    };

    OntologicallyGrounded.prototype.read_ontology = function(url) {
      if (url.startsWith('file:///') || url.indexOf('/') === -1) {
        this.get_resource_from_db(url, (function(_this) {
          return function(err, rsrcRec) {
            if (rsrcRec != null) {
              _this.parseTTLOntology(rsrcRec.data);
              return;
            }
            _this.blurt(err || ("'" + url + "' was not found in your ONTOLOGY menu.  Provide it and reload page"));
            _this.reset_dataset_ontology_loader();
          };
        })(this));
        return;
      }
      return $.ajax({
        url: url,
        async: false,
        success: this.parseTTLOntology,
        error: (function(_this) {
          return function(jqxhr, textStatus, errorThrown) {
            return _this.show_state_msg(errorThrown + " while fetching ontology " + url);
          };
        })(this)
      });
    };

    OntologicallyGrounded.prototype.parseTTLOntology = function(data, textStatus) {
      var frame, label, obj, obj_lid, obj_raw, ontology, pred, pred_id, pred_lid, ref, results1, subj_lid, subj_uri;
      ontology = this.ontology;
      if ((GreenerTurtle != null) && this.turtle_parser === 'GreenerTurtle') {
        this.raw_ontology = new GreenerTurtle().parse(data, "text/turtle");
        ref = this.raw_ontology.subjects;
        results1 = [];
        for (subj_uri in ref) {
          frame = ref[subj_uri];
          subj_lid = uniquer(subj_uri);
          results1.push((function() {
            var ref1, results2;
            ref1 = frame.predicates;
            results2 = [];
            for (pred_id in ref1) {
              pred = ref1[pred_id];
              pred_lid = uniquer(pred_id);
              results2.push((function() {
                var j, len1, ref2, results3;
                ref2 = pred.objects;
                results3 = [];
                for (j = 0, len1 = ref2.length; j < len1; j++) {
                  obj = ref2[j];
                  obj_raw = obj.value;
                  if (pred_lid === 'comment') {
                    continue;
                  }
                  if (pred_lid === 'label') {
                    label = obj_raw;
                    if (ontology.label[subj_lid] != null) {
                      ontology.label[subj_lid].set_val_lang(label, obj.language);
                    } else {
                      ontology.label[subj_lid] = new MultiString(label, obj.language);
                    }
                  }
                  obj_lid = uniquer(obj_raw);
                  if (pred_lid === 'domain') {
                    results3.push(ontology.domain[subj_lid] = obj_lid);
                  } else if (pred_lid === 'range') {
                    if (ontology.range[subj_lid] == null) {
                      ontology.range[subj_lid] = [];
                    }
                    if (!(indexOf.call(ontology.range, obj_lid) >= 0)) {
                      results3.push(ontology.range[subj_lid].push(obj_lid));
                    } else {
                      results3.push(void 0);
                    }
                  } else if (pred_lid === 'subClassOf' || pred_lid === 'subClass') {
                    results3.push(ontology.subClassOf[subj_lid] = obj_lid);
                  } else if (pred_lid === 'subPropertyOf') {
                    results3.push(ontology.subPropertyOf[subj_lid] = obj_lid);
                  } else {
                    results3.push(void 0);
                  }
                }
                return results3;
              })());
            }
            return results2;
          })());
        }
        return results1;
      }
    };

    return OntologicallyGrounded;

  })(Huviz);

  Orlando = (function(superClass) {
    extend(Orlando, superClass);

    function Orlando() {
      this.close_edge_inspector = bind(this.close_edge_inspector, this);
      var delay, onceDBReady, onceDBReadyCount;
      Orlando.__super__.constructor.apply(this, arguments);
      if (window.indexedDB) {
        onceDBReadyCount = 0;
        delay = 100;
        onceDBReady = (function(_this) {
          return function() {
            onceDBReadyCount++;
            console.debug('onceDBReady() call #' + onceDBReadyCount);
            if (_this.datasetDB != null) {
              console.debug('finally! datasetDB is now ready');
              return _this.run_script_from_hash();
            } else {
              return setTimeout(onceDBReady, delay);
            }
          };
        })(this);
        setTimeout(onceDBReady, delay);
      } else {
        this.run_script_from_hash();
      }
    }

    Orlando.prototype.get_default_set_by_type = function(node) {
      var ref;
      if (this.is_big_data()) {
        if ((ref = node.type) === 'writer') {
          return this.shelved_set;
        } else {
          return this.hidden_set;
        }
      }
      return this.shelved_set;
    };

    Orlando.prototype.HHH = {};

    Orlando.prototype.make_link = function(uri, text, target) {
      if (uri == null) {
        uri = "";
      }
      if (target == null) {
        target = synthIdFor(uri.replace(/\#.*$/, ''));
      }
      if (text == null) {
        text = uri;
      }
      return "<a target=\"" + target + "\" href=\"" + uri + "\">" + text + "</a>";
    };

    Orlando.prototype.push_snippet = function(msg_or_obj) {
      var dataType, dataType_curie, dataType_uri, dialogArgs, m, obj, obj_dd, pos, ref;
      obj = msg_or_obj;
      if (true) {
        if (typeof msg_or_obj !== 'string') {
          ref = ["", msg_or_obj], msg_or_obj = ref[0], m = ref[1];
          if (obj.quad.obj_uri) {
            obj_dd = "" + (this.make_link(obj.quad.obj_uri));
          } else {
            dataType_uri = m.edge.target.__dataType || "";
            dataType = "";
            if (dataType_uri) {
              dataType_curie = m.edge.target.type.replace('__', ':');
              dataType = "^^" + (this.make_link(dataType_uri, dataType_curie));
            }
            obj_dd = "\"" + obj.quad.obj_val + "\"" + dataType;
          }
          msg_or_obj = "<div id=\"" + obj.snippet_js_key + "\" class=\"message_wrapper\" style=\"overflow:none;\">\n    <h3>subject</h3>\n    <div class=\"edge_circle\" style=\"background-color:" + m.edge.source.color + ";\"></div>\n    <p>" + (this.make_link(obj.quad.subj_uri)) + "</p>\n\n    <h3>predicate </h3>\n    <div class=\"edge_arrow\">\n      <div class=\"edge_arrow_stem\" style=\"background-color:" + m.edge.color + ";\"></div>\n      <div class=\"edge_arrow_head\" style=\"border-color: transparent transparent transparent " + m.edge.color + ";\"></div>\n    </div>\n    <p class=\"pred\">" + (this.make_link(obj.quad.pred_uri)) + "</p>\n\n    <h3>object </h3>\n    <div class=\"edge_circle\" style=\"background-color:" + m.edge.target.color + ";\"></div>\n    <p>" + obj_dd + "</p>\n\n    <h3>source</h3>\n    <p\">" + (this.make_link(obj.quad.graph_uri)) + "</p>\n</div>\n";
        }
      }
      pos = this.get_next_snippet_position_obj(obj.edge_inspector_id);
      dialogArgs = {
        width: this.width,
        height: this.height,
        extraClasses: "edge_inspector",
        top: pos.top,
        left: pos.left,
        close: this.close_edge_inspector
      };
      obj.edge._inspector = this.make_dialog(msg_or_obj, obj.edge_inspector_id, dialogArgs);
      return obj.edge._inspector.dataset.edge_id = obj.edge.id;
    };

    Orlando.prototype.close_edge_inspector = function(event, ui) {
      var box, edge, edge_id, edge_inspector_id;
      box = event.currentTarget.offsetParent;
      edge_id = box.dataset.edge_id;
      if (edge_id != null) {
        edge = this.edges_by_id[edge_id];
        if (edge != null) {
          delete edge._inspector;
        }
      }
      edge_inspector_id = event.target.getAttribute('for');
      this.remove_edge_inspector(edge_inspector_id);
      this.destroy_dialog(event);
    };

    Orlando.prototype.remove_edge_inspector = function(edge_inspector_id) {
      delete this.currently_printed_snippets[edge_inspector_id];
      this.clear_snippet_position_filled_for(edge_inspector_id);
    };

    Orlando.prototype.clear_snippet_position_filled_for = function(match_id) {
      var id, pos, ref;
      ref = this.snippet_positions_filled;
      for (pos in ref) {
        id = ref[pos];
        if (id === match_id) {
          delete this.snippet_positions_filled[pos];
          break;
        }
      }
    };

    Orlando.prototype.human_term = orlando_human_term;

    return Orlando;

  })(OntologicallyGrounded);

  OntoViz = (function(superClass) {
    extend(OntoViz, superClass);

    function OntoViz() {
      return OntoViz.__super__.constructor.apply(this, arguments);
    }

    OntoViz.prototype.human_term = orlando_human_term;

    OntoViz.prototype.HHH = {
      ObjectProperty: 'Thing',
      Class: 'Thing',
      SymmetricProperty: 'ObjectProperty',
      IrreflexiveProperty: 'ObjectProperty',
      AsymmetricProperty: 'ObjectProperty'
    };

    OntoViz.prototype.ontoviz_type_to_hier_map = {
      RDF_type: "classes",
      OWL_ObjectProperty: "properties",
      OWL_Class: "classes"
    };

    OntoViz.prototype.use_lid_as_node_name = true;

    OntoViz.prototype.snippet_count_on_edge_labels = false;

    OntoViz.prototype.DEPRECATED_try_to_set_node_type = function(node, type) {
      if (type.match(/Property$/)) {
        node.type = 'properties';
      } else if (type.match(/Class$/)) {
        node.type = 'classes';
      } else {
        console.log(node.id + ".type is", type);
        return false;
      }
      console.log("try_to_set_node_type", node.id, "=====", node.type);
      return true;
    };

    OntoViz.prototype.predicates_to_ignore = ["anything", "comment", "first", "rest", "members"];

    return OntoViz;

  })(Huviz);

  Socrata = (function(superClass) {

    /*
     * Inspired by https://data.edmonton.ca/
     *             https://data.edmonton.ca/api/views{,.json,.rdf,...}
     *
     */
    var categories;

    extend(Socrata, superClass);

    function Socrata() {
      this.parseAndShowJSON = bind(this.parseAndShowJSON, this);
      return Socrata.__super__.constructor.apply(this, arguments);
    }

    categories = {};

    Socrata.prototype.ensure_category = function(category_name) {
      var cat_id;
      cat_id = category_name.replace(/\w/, '_');
      if (this.categories[category_id] != null) {
        this.categories[category_id] = category_name;
        this.assert_name(category_id, category_name);
        this.assert_instanceOf(category_id, DC_subject);
      }
      return cat_id;
    };

    Socrata.prototype.assert_name = function(uri, name, g) {
      name = name.replace(/^\s+|\s+$/g, '');
      return this.add_quad({
        s: uri,
        p: RDFS_label,
        o: {
          type: RDF_literal,
          value: stripped_name
        }
      });
    };

    Socrata.prototype.assert_instanceOf = function(inst, clss, g) {
      return this.add_quad({
        s: inst,
        p: RDF_a,
        o: {
          type: RDF_object,
          value: clss
        }
      });
    };

    Socrata.prototype.assert_propertyValue = function(sub_uri, pred_uri, literal) {
      console.log("assert_propertyValue", arguments);
      return this.add_quad({
        s: subj_uri,
        p: pred_uri,
        o: {
          type: RDF_literal,
          value: literal
        }
      });
    };

    Socrata.prototype.assert_relation = function(subj_uri, pred_uri, obj_uri) {
      console.log("assert_relation", arguments);
      return this.add_quad({
        s: subj_uri,
        p: pred_uri,
        o: {
          type: RDF_object,
          value: obj_uri
        }
      });
    };

    Socrata.prototype.parseAndShowJSON = function(data) {
      var cat_id, dataset, g, j, k, len1, q, results1, v;
      console.log("parseAndShowJSON", data);
      g = this.data_uri || this.DEFAULT_CONTEXT;
      results1 = [];
      for (j = 0, len1 = data.length; j < len1; j++) {
        dataset = data[j];
        console.log(this.dataset_uri);
        q = {
          g: g,
          s: dataset_uri,
          p: RDF_a,
          o: {
            type: RDF_literal,
            value: 'dataset'
          }
        };
        console.log(q);
        this.add_quad(q);
        results1.push((function() {
          var results2;
          results2 = [];
          for (k in dataset) {
            v = dataset[k];
            if (!is_on_of(k, ['category', 'name', 'id'])) {
              continue;
            }
            q = {
              g: g,
              s: dataset_uri,
              p: k,
              o: {
                type: RDF_literal,
                value: v
              }
            };
            if (k === 'category') {
              cat_id = this.ensure_category(v);
              this.assert_instanceOf(dataset_uri, OWL_Class);
              continue;
            }
            if (k === 'name') {
              assert_propertyValue(dataset_uri, RDFS_label, v);
              continue;
            }
            continue;
            if (typeof v === 'object') {
              continue;
            }
            if (k === 'name') {
              console.log(dataset.id, v);
            }
            results2.push(this.add_quad(q));
          }
          return results2;
        }).call(this));
      }
      return results1;
    };

    return Socrata;

  })(Huviz);

  PickOrProvide = (function() {
    PickOrProvide.prototype.tmpl = "<form id=\"UID\" class=\"pick_or_provide_form\" method=\"post\" action=\"\" enctype=\"multipart/form-data\">\n    <span class=\"pick_or_provide_label\">REPLACE_WITH_LABEL</span>\n    <select name=\"pick_or_provide\"></select>\n    <button type=\"button\" class=\"delete_option\"><i class=\"fa fa-trash\" style=\"font-size: 1.2em;\"></i></button>\n  </form>";

    PickOrProvide.prototype.uri_file_loader_sel = '.uri_file_loader_form';

    function PickOrProvide(huviz, append_to_sel, label1, css_class, isOntology, isEndpoint, opts) {
      var dndLoaderClass;
      this.huviz = huviz;
      this.append_to_sel = append_to_sel;
      this.label = label1;
      this.css_class = css_class;
      this.isOntology = isOntology;
      this.isEndpoint = isEndpoint;
      this.opts = opts;
      this.delete_selected_option = bind(this.delete_selected_option, this);
      this.get_selected_option = bind(this.get_selected_option, this);
      this.onchange = bind(this.onchange, this);
      this.add_resource_option = bind(this.add_resource_option, this);
      this.add_local_file = bind(this.add_local_file, this);
      this.add_uri = bind(this.add_uri, this);
      if (this.opts == null) {
        this.opts = {};
      }
      this.uniq_id = this.huviz.unique_id();
      this.select_id = this.huviz.unique_id();
      this.pickable_uid = this.huviz.unique_id();
      this.your_own_uid = this.huviz.unique_id();
      this.find_or_append_form();
      dndLoaderClass = this.opts.dndLoaderClass || DragAndDropLoader;
      this.drag_and_drop_loader = new dndLoaderClass(this.huviz, this.append_to_sel, this);
      this.drag_and_drop_loader.form.hide();
      this.add_group({
        label: "Your Own",
        id: this.your_own_uid
      }, 'append');
      this.add_option({
        label: "Provide New " + this.label + " ...",
        value: 'provide'
      }, this.select_id);
      this.add_option({
        label: "Pick or Provide...",
        canDelete: false
      }, this.select_id, 'prepend');
      this.update_change_stamp();
      return this;
    }

    PickOrProvide.prototype.update_change_stamp = function() {
      return this.change_stamp = performance.now();
    };

    PickOrProvide.prototype.is_quiet = function(msec) {
      if (msec == null) {
        msec = 200;
      }
      if (this.change_stamp != null) {
        if ((performance.now() - this.change_stamp) > msec) {
          return true;
        }
      }
      return false;
    };

    PickOrProvide.prototype.select_by_uri = function(targetUri) {
      var option;
      option = $('#' + this.select_id + ' option[value="' + targetUri + '"]');
      if (option.length !== 1) {
        throw new Error(targetUri + " was not found");
      }
      this.select_option(option);
    };

    PickOrProvide.prototype.val = function(val) {
      console.debug(this.constructor.name + '.val(' + (val && '"' + val + '"' || '') + ') for ' + this.opts.rsrcType + ' was ' + this.pick_or_provide_select.val());
      this.pick_or_provide_select.val(val);
      return this.refresh();
    };

    PickOrProvide.prototype.disable = function() {
      this.pick_or_provide_select.prop('disabled', true);
      return this.form.find('.delete_option').hide();
    };

    PickOrProvide.prototype.enable = function() {
      this.pick_or_provide_select.prop('disabled', false);
      return this.form.find('.delete_option').show();
    };

    PickOrProvide.prototype.select_option = function(option) {
      var cur_val, new_val;
      new_val = option.val();
      cur_val = this.pick_or_provide_select.val();
      if (cur_val !== this.last_val) {
        this.last_val = cur_val;
      }
      if (this.last_val !== new_val) {
        this.last_val = new_val;
        if (new_val) {
          this.pick_or_provide_select.val(new_val);
          this.value = new_val;
        } else {
          console.debug("PickOrProvide:", this);
          console.debug("option:", option);
          console.warn("TODO should set option to nothing");
        }
      }
    };

    PickOrProvide.prototype.add_uri = function(uri_or_rec) {
      var rsrcRec, uri;
      if (typeof uri_or_rec === 'string') {
        uri = uri_or_rec;
        rsrcRec = {};
      } else {
        rsrcRec = uri_or_rec;
      }
      if (rsrcRec.uri == null) {
        rsrcRec.uri = uri;
      }
      if (rsrcRec.isOntology == null) {
        rsrcRec.isOntology = this.isOntology;
      }
      if (rsrcRec.isEndpoint == null) {
        rsrcRec.isEndpoint = this.isEndpoint;
      }
      if (rsrcRec.time == null) {
        rsrcRec.time = (new Date()).toISOString();
      }
      if (rsrcRec.isUri == null) {
        rsrcRec.isUri = true;
      }
      if (rsrcRec.title == null) {
        rsrcRec.title = rsrcRec.uri;
      }
      if (rsrcRec.canDelete == null) {
        rsrcRec.canDelete = !(rsrcRec.time == null);
      }
      if (rsrcRec.label == null) {
        rsrcRec.label = rsrcRec.uri.split('/').reverse()[0] || rsrcRec.uri;
      }
      if (rsrcRec.label === "sparql") {
        rsrcRec.label = rsrcRec.uri;
      }
      if (rsrcRec.rsrcType == null) {
        rsrcRec.rsrcType = this.opts.rsrcType;
      }
      this.add_resource(rsrcRec, true);
      this.update_change_stamp();
      return this.update_state();
    };

    PickOrProvide.prototype.add_local_file = function(file_rec) {
      var rsrcRec, uri;
      if (typeof file_rec === 'string') {
        uri = file_rec;
        rsrcRec = {};
      } else {
        rsrcRec = file_rec;
        if (rsrcRec.uri == null) {
          rsrcRec.uri = uri;
        }
        if (rsrcRec.isOntology == null) {
          rsrcRec.isOntology = this.isOntology;
        }
        if (rsrcRec.time == null) {
          rsrcRec.time = (new Date()).toISOString();
        }
        if (rsrcRec.isUri == null) {
          rsrcRec.isUri = false;
        }
        if (rsrcRec.title == null) {
          rsrcRec.title = rsrcRec.uri;
        }
        if (rsrcRec.canDelete == null) {
          rsrcRec.canDelete = !(rsrcRec.time == null);
        }
        if (rsrcRec.label == null) {
          rsrcRec.label = rsrcRec.uri.split('/').reverse()[0];
        }
        if (rsrcRec.rsrcType == null) {
          rsrcRec.rsrcType = this.opts.rsrcType;
        }
        if (rsrcRec.data == null) {
          rsrcRec.data = file_rec.data;
        }
      }
      this.add_resource(rsrcRec, true);
      return this.update_state();
    };

    PickOrProvide.prototype.add_resource = function(rsrcRec, store_in_db) {
      var uri;
      uri = rsrcRec.uri;
      if (store_in_db) {
        return this.huviz.add_resource_to_db(rsrcRec, this.add_resource_option);
      } else {
        return this.add_resource_option(rsrcRec);
      }
    };

    PickOrProvide.prototype.add_resource_option = function(rsrcRec) {
      var uri;
      uri = rsrcRec.uri;
      rsrcRec.value = rsrcRec.uri;
      this.add_option(rsrcRec, this.pickable_uid);
      this.pick_or_provide_select.val(uri);
      return this.refresh();
    };

    PickOrProvide.prototype.add_group = function(grp_rec, which) {
      var optgrp;
      if (which == null) {
        which = 'append';
      }
      optgrp = $("<optgroup label=\"" + grp_rec.label + "\" id=\"" + (grp_rec.id || this.huviz.unique_id()) + "\"></optgroup>");
      if (which === 'prepend') {
        this.pick_or_provide_select.prepend(optgrp);
      } else {
        this.pick_or_provide_select.append(optgrp);
      }
      return optgrp;
    };

    PickOrProvide.prototype.add_option = function(opt_rec, parent_uid, pre_or_append) {
      var j, k, len1, len2, opt, opt_group, opt_group_label, opt_str, p, ref, ref1, val;
      if (pre_or_append == null) {
        pre_or_append = 'append';
      }
      if (opt_rec.label == null) {
        console.log("missing .label on", opt_rec);
      }
      if (this.pick_or_provide_select.find("option[value='" + opt_rec.value + "']").length) {
        return;
      }
      opt_str = "<option id=\"" + (this.huviz.unique_id()) + "\"></option>";
      opt = $(opt_str);
      opt_group_label = opt_rec.opt_group;
      if (opt_group_label) {
        opt_group = this.pick_or_provide_select.find("optgroup[label='" + opt_group_label + "']");
        if (!opt_group.length) {
          opt_group = this.add_group({
            label: opt_group_label
          }, 'prepend');
        }
        opt_group.append(opt);
      } else {
        if (pre_or_append === 'append') {
          $("#" + parent_uid).append(opt);
        } else {
          $("#" + parent_uid).prepend(opt);
        }
      }
      ref = ['value', 'title', 'class', 'id', 'style', 'label'];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        k = ref[j];
        if (opt_rec[k] != null) {
          $(opt).attr(k, opt_rec[k]);
        }
      }
      ref1 = ['isUri', 'canDelete', 'ontologyUri', 'ontology_label'];
      for (p = 0, len2 = ref1.length; p < len2; p++) {
        k = ref1[p];
        if (opt_rec[k] != null) {
          val = opt_rec[k];
          $(opt).data(k, val);
        }
      }
      return opt[0];
    };

    PickOrProvide.prototype.update_state = function(callback) {
      var args, canDelete, disable_the_delete_button, kid_cnt, label_value, old_value, raw_value, selected_option, the_options;
      old_value = this.value;
      raw_value = this.pick_or_provide_select.val();
      selected_option = this.get_selected_option();
      label_value = selected_option[0].label;
      the_options = this.pick_or_provide_select.find("option");
      kid_cnt = the_options.length;
      if (raw_value === 'provide') {
        this.drag_and_drop_loader.form.show();
        this.state = 'awaiting_dnd';
        this.value = void 0;
      } else {
        this.drag_and_drop_loader.form.hide();
        this.state = 'has_value';
        this.value = raw_value;
        this.label = label_value;
      }
      disable_the_delete_button = true;
      if (this.value != null) {
        canDelete = selected_option.data('canDelete');
        disable_the_delete_button = !canDelete;
      }
      this.form.find('.delete_option').prop('disabled', disable_the_delete_button);
      if (callback != null) {
        args = {
          pickOrProvide: this,
          newValue: raw_value,
          oldValue: old_value
        };
        return callback(args);
      }
    };

    PickOrProvide.prototype.find_or_append_form = function() {
      if (!$(this.local_file_form_sel).length) {
        $(this.append_to_sel).append(this.tmpl.replace('REPLACE_WITH_LABEL', this.label).replace('UID', this.uniq_id));
      }
      this.form = $("#" + this.uniq_id);
      this.pick_or_provide_select = this.form.find("select[name='pick_or_provide']");
      this.pick_or_provide_select.attr('id', this.select_id);
      this.pick_or_provide_select.change(this.onchange);
      this.delete_option_button = this.form.find('.delete_option');
      this.delete_option_button.click(this.delete_selected_option);
      return this.form.find('.delete_option').prop('disabled', true);
    };

    PickOrProvide.prototype.onchange = function(e) {
      return this.refresh();
    };

    PickOrProvide.prototype.get_selected_option = function() {
      return this.pick_or_provide_select.find('option:selected');
    };

    PickOrProvide.prototype.delete_selected_option = function(e) {
      var selected_option, val;
      e.stopPropagation();
      selected_option = this.get_selected_option();
      val = selected_option.attr('value');
      if (val != null) {
        this.huviz.remove_dataset_from_db(this.value);
        this.delete_option(selected_option);
        return this.update_state();
      }
    };

    PickOrProvide.prototype.delete_option = function(opt_elem) {
      var uri;
      uri = opt_elem.attr('value');
      this.huviz.remove_dataset_from_db(uri);
      opt_elem.remove();
      return this.huviz.update_dataset_ontology_loader();
    };

    PickOrProvide.prototype.refresh = function() {
      return this.update_state(this.huviz.update_dataset_ontology_loader);
    };

    return PickOrProvide;

  })();

  PickOrProvideScript = (function(superClass) {
    extend(PickOrProvideScript, superClass);

    function PickOrProvideScript() {
      this.onchange = bind(this.onchange, this);
      return PickOrProvideScript.__super__.constructor.apply(this, arguments);
    }

    PickOrProvideScript.prototype.onchange = function(e) {
      PickOrProvideScript.__super__.onchange.call(this, e);
      return this.huviz.visualize_dataset_using_ontology();
    };

    return PickOrProvideScript;

  })(PickOrProvide);

  DragAndDropLoader = (function() {
    DragAndDropLoader.prototype.tmpl = "<form class=\"local_file_form\" method=\"post\" action=\"\" enctype=\"multipart/form-data\">\n  <div class=\"box__input\">\n    <input class=\"box__file\" type=\"file\" name=\"files[]\"\n             data-multiple-caption=\"{count} files selected\" multiple />\n    <label for=\"file\"><span class=\"box__label\">Choose a local file</span></label>\n    <button class=\"box__upload_button\" type=\"submit\">Upload</button>\n      <div class=\"box__dragndrop\" style=\"display:none\"> Drop URL or file here</div>\n  </div>\n    <input type=\"url\" class=\"box__uri\" placeholder=\"Or enter URL here\" />\n  <div class=\"box__uploading\" style=\"display:none\">Uploading&hellip;</div>\n  <div class=\"box__success\" style=\"display:none\">Done!</div>\n  <div class=\"box__error\" style=\"display:none\">Error! <span></span>.</div>\n  </form>";

    function DragAndDropLoader(huviz, append_to_sel, picker) {
      this.huviz = huviz;
      this.append_to_sel = append_to_sel;
      this.picker = picker;
      this.local_file_form_id = this.huviz.unique_id();
      this.local_file_form_sel = "#" + this.local_file_form_id;
      this.find_or_append_form();
      if (this.supports_file_dnd()) {
        this.form.show();
        this.form.addClass('supports-dnd');
        this.form.find(".box__dragndrop").show();
      }
    }

    DragAndDropLoader.prototype.supports_file_dnd = function() {
      var div;
      div = document.createElement('div');
      return true;
      return (div.draggable || div.ondragstart) && div.ondrop && (window.FormData && window.FileReader);
    };

    DragAndDropLoader.prototype.load_uri = function(firstUri) {
      this.picker.add_uri({
        uri: firstUri,
        opt_group: 'Your Own'
      });
      this.form.hide();
      return true;
    };

    DragAndDropLoader.prototype.load_file = function(firstFile) {
      var filename, reader;
      this.huviz.local_file_data = "empty";
      filename = firstFile.name;
      this.form.find('.box__success').text(firstFile.name);
      this.form.find('.box__success').show();
      reader = new FileReader();
      reader.onload = (function(_this) {
        return function(evt) {
          var e, msg;
          try {
            if (filename.match(/.(ttl|.nq)$/)) {
              return _this.picker.add_local_file({
                uri: firstFile.name,
                opt_group: 'Your Own',
                data: evt.target.result
              });
            } else {
              _this.huviz.blurt(("Unknown file format. Unable to parse '" + filename + "'. ") + "Only .ttl and .nq files supported.", 'alert');
              _this.huviz.reset_dataset_ontology_loader();
              return $('.delete_option').attr('style', '');
            }
          } catch (_error) {
            e = _error;
            msg = e.toString();
            return _this.huviz.blurt(msg, 'error');
          }
        };
      })(this);
      reader.readAsText(firstFile);
      return true;
    };

    DragAndDropLoader.prototype.find_or_append_form = function() {
      var elem, num_dnd_form;
      num_dnd_form = $(this.local_file_form_sel).length;
      if (!num_dnd_form) {
        elem = $(this.tmpl);
        $(this.append_to_sel).append(elem);
        elem.attr('id', this.local_file_form_id);
      }
      this.form = $(this.local_file_form_sel);
      this.form.on('submit unfocus', (function(_this) {
        return function(evt) {
          var uri, uri_field;
          uri_field = _this.form.find('.box__uri');
          uri = uri_field.val();
          if (uri_field[0].checkValidity()) {
            uri_field.val('');
            _this.load_uri(uri);
          }
          return false;
        };
      })(this));
      this.form.on('drag dragstart dragend dragover dragenter dragleave drop', (function(_this) {
        return function(evt) {
          evt.preventDefault();
          return evt.stopPropagation();
        };
      })(this));
      this.form.on('dragover dragenter', (function(_this) {
        return function() {
          _this.form.addClass('is-dragover');
          return console.log("addClass('is-dragover')");
        };
      })(this));
      this.form.on('dragleave dragend drop', (function(_this) {
        return function() {
          return _this.form.removeClass('is-dragover');
        };
      })(this));
      return this.form.on('drop', (function(_this) {
        return function(e) {
          var droppedFiles, droppedUris, firstFile, firstUri;
          console.log(e);
          console.log("e:", e.originalEvent.dataTransfer);
          _this.form.find('.box__input').hide();
          droppedUris = e.originalEvent.dataTransfer.getData("text/uri-list").split("\n");
          console.log("droppedUris", droppedUris);
          firstUri = droppedUris[0];
          if (firstUri.length) {
            if (_this.load_uri(firstUri)) {
              _this.form.find(".box__success").text('');
              _this.picker.refresh();
              _this.form.hide();
              return;
            }
          }
          droppedFiles = e.originalEvent.dataTransfer.files;
          console.log("droppedFiles", droppedFiles);
          if (droppedFiles.length) {
            firstFile = droppedFiles[0];
            if (_this.load_file(firstFile)) {
              _this.form.find(".box__success").text('');
              _this.picker.refresh();
              _this.form.hide();
              return;
            }
          }
          _this.form.find('.box__input').show();
          return _this.picker.refresh();
        };
      })(this));
    };

    return DragAndDropLoader;

  })();

  DragAndDropLoaderOfScripts = (function(superClass) {
    extend(DragAndDropLoaderOfScripts, superClass);

    function DragAndDropLoaderOfScripts() {
      return DragAndDropLoaderOfScripts.__super__.constructor.apply(this, arguments);
    }

    DragAndDropLoaderOfScripts.prototype.load_file = function(firstFile) {
      var filename, reader;
      filename = firstFile.name;
      this.form.find('.box__success').text(firstFile.name);
      this.form.find('.box__success').show();
      reader = new FileReader();
      reader.onload = (function(_this) {
        return function(evt) {
          var err, file_rec, msg;
          try {
            if (filename.match(/.(txt|.json)$/)) {
              file_rec = {
                uri: firstFile.name,
                opt_group: 'Your Own',
                data: evt.target.result
              };
              return _this.picker.add_local_file(file_rec);
            } else {
              _this.huviz.blurt(("Unknown file format. Unable to parse '" + filename + "'. ") + "Only .txt and .huviz files supported.", 'alert');
              _this.huviz.reset_dataset_ontology_loader();
              return $('.delete_option').attr('style', '');
            }
          } catch (_error) {
            err = _error;
            msg = err.toString();
            return _this.huviz.blurt(msg, 'error');
          }
        };
      })(this);
      reader.readAsText(firstFile);
      return true;
    };

    return DragAndDropLoaderOfScripts;

  })(DragAndDropLoader);

  (typeof exports !== "undefined" && exports !== null ? exports : this).Huviz = Huviz;

  (typeof exports !== "undefined" && exports !== null ? exports : this).Orlando = Orlando;

  (typeof exports !== "undefined" && exports !== null ? exports : this).OntoViz = OntoViz;

  (typeof exports !== "undefined" && exports !== null ? exports : this).Edge = Edge;

}).call(this);
}, "indexeddbservice": function(exports, require, module) {(function() {
  var IndexedDBService,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  IndexedDBService = (function() {
    function IndexedDBService(huviz) {
      this.huviz = huviz;
      this.dbName = this.get_dbName();
      this.dbStoreName = "ntuples";
      this.initialize_db();
    }

    IndexedDBService.prototype.expunge_db = function(dbname, callback) {
      var del_req;
      del_req = window.indexedDB.deleteDatabase('doof' || dbname || this.dbName);
      del_req.onerror = (function(_this) {
        return function(e) {
          if (callback != null) {
            return callback(e);
          }
        };
      })(this);
      return del_req.onsuccess = (function(_this) {
        return function(e) {
          if (dbname === _this.dbName) {
            _this.nstoreDB = void 0;
          }
          if (callback != null) {
            return callback();
          }
        };
      })(this);
    };

    IndexedDBService.prototype.initialize_db = function(callback) {
      var indexedDB, msg, req, when_done;
      indexedDB = window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      if (!indexedDB) {
        throw new Error("indexedDB not available");
      }
      when_done = (function(_this) {
        return function(db, why, cb, err) {
          _this.nstoreDB = db;
          if (cb != null) {
            return cb(err);
          }
        };
      })(this);
      if (this.nstoreDB != null) {
        msg = "nstoreDB already exists with name " + this.dbName;
        when_done(this.nstoreDB, msg, callback);
      } else {
        req = indexedDB.open(this.dbName, this.dbVer);
        console.debug(req);
        req.onsuccess = (function(_this) {
          return function(evt) {
            console.debug("onsuccess " + _this.dbName);
            return when_done(req.result, "success", callback);
          };
        })(this);
        req.onerror = (function(_this) {
          return function(evt) {
            console.error("IndexDB Error: " + evt.target.error.message);
            if (callback != null) {
              return callback(evt.target.error);
            }
          };
        })(this);
        req.onupgradeneeded = (function(_this) {
          return function(evt) {
            var db, store;
            db = evt.target.result;
            console.debug("onupgradeneeded " + db.name);
            console.debug(evt);
            if (evt.oldVersion === 1) {
              if (indexOf.call(db.objectStoreNames, 'spogis') >= 0) {
                alert("deleteObjectStore('spogis')");
                db.deleteObjectStore('spogis');
              }
            }
            if (evt.oldVersion < 3) {
              store = db.createObjectStore(_this.dbStoreName, {
                keyPath: 'id',
                autoIncrement: true
              });
              console.debug(db);
              store.createIndex("s", "s", {
                unique: false
              });
              store.createIndex("p", "p", {
                unique: false
              });
              store.createIndex("o", "o", {
                unique: false
              });
              return store.transaction.oncomplete = function(evt) {
                when_done(db, "onupgradeneeded", callback);
                return console.debug("transactions are complete");
              };
            }
          };
        })(this);
      }
    };

    IndexedDBService.prototype.dbName_default = 'nstoreDB';

    IndexedDBService.prototype.dbVer = 2;

    IndexedDBService.prototype.get_dbName = function() {
      return this.huviz.args.editui__dbName || this.dbName_default;
    };

    IndexedDBService.prototype.add_node_to_db = function(quad) {
      console.debug("add new node to DB");
      console.debug(quad);
      return console.debug(this.nstoreDB);
    };

    return IndexedDBService;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).IndexedDBService = IndexedDBService;

}).call(this);
}, "indexeddbstoragecontroller": function(exports, require, module) {(function() {
  var IndexedDBStorageController, indexdDBstore;

  indexdDBstore = require('indexeddbservice');

  IndexedDBStorageController = (function() {
    function IndexedDBStorageController(huviz, dbs) {
      this.huviz = huviz;
      this.dbs = dbs;
    }

    IndexedDBStorageController.prototype.register = function(huviz) {
      this.huviz = huviz;
    };

    IndexedDBStorageController.prototype.assert = function(quad) {
      var req, store, trx;
      console.log("trx begin");
      trx = this.dbs.nstoreDB.transaction(this.dbs.dbStoreName, 'readwrite');
      trx.oncomplete = (function(_this) {
        return function(e) {
          return console.log("trx complete!");
        };
      })(this);
      trx.onerror = (function(_this) {
        return function(e) {
          throw e;
        };
      })(this);
      store = trx.objectStore(this.dbs.dbStoreName);
      req = store.put(quad);
      return req.onsuccess = (function(_this) {
        return function(e) {
          console.log(quad, "added to ObjectStore: " + _this.dbs.dbStoreName);
          return _this.huviz.add_quad(quad);
        };
      })(this);
    };

    IndexedDBStorageController.prototype.get_graphs = function() {};

    IndexedDBStorageController.prototype.count = function(cb) {
      var objstor, req, trx;
      trx = this.dbs.nstoreDB.transaction(this.dbs.dbStoreName, 'readonly');
      objstor = trx.objectStore(this.dbs.dbStoreName);
      req = objstor.count();
      return req.onsuccess = function() {
        return cb(req.result);
      };
    };

    return IndexedDBStorageController;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).IndexedDBStorageController = IndexedDBStorageController;

}).call(this);
}, "mintree2d3tree": function(exports, require, module) {(function() {
  var mintree2d3tree, test;

  mintree2d3tree = function(mintree, out, default_root, use_ids_as_names) {
    var k, node, v;
    use_ids_as_names = use_ids_as_names || false;
    default_root = default_root || {
      name: 'All',
      children: []
    };
    out = out || default_root;
    for (k in mintree) {
      v = mintree[k];
      if (use_ids_as_names) {
        node = {
          name: k
        };
      } else {
        node = {
          id: k
        };
      }
      if (v) {
        if (!use_ids_as_names) {
          node.name = v[0];
        }
        if (v[1]) {
          node.children = [];
          mintree2d3tree(v[1], node);
        }
      }
      out.children.push(node);
    }
    return out;
  };

  test = function() {
    var expect, genesis, got, got_str;
    genesis = {
      ID: ['Name'],
      GOD: [
        'Yahwe', {
          KID1: ['Adam'],
          KID2: ['Eve']
        }
      ]
    };
    expect = '{"name":"All","children":[{"id":"GOD","name":"Yahwe","children":[{"id":"KID1","name":"Adam"},{"id":"KID2","name":"Eve"}]}]}';
    got = mintree2d3tree(genesis);
    got_str = JSON.stringify(got);
    if (got_str === expect) {
      return console.log('success');
    } else {
      console.log("=========================================");
      return console.log("", got_str, "\n<>\n", expect);
    }
  };

  window.mintree2d3tree = mintree2d3tree;

}).call(this);
}, "node": function(exports, require, module) {(function() {
  var Node, uniquer;

  uniquer = require("uniquer").uniquer;

  Node = (function() {
    function Node(id) {
      this.id = id;
      this.bub_txt = [];
      this.links_from = [];
      this.links_to = [];
      this.links_shown = [];
      this.lid = uniquer(this.id);
    }

    Node.prototype.linked = false;

    Node.prototype.showing_links = "none";

    Node.prototype.name = null;

    Node.prototype.s = null;

    Node.prototype.type = null;

    Node.prototype.set_name = function(name) {
      this.name = name;
    };

    Node.prototype.set_subject = function(s) {
      this.s = s;
    };

    Node.prototype.point = function(point) {
      if (point != null) {
        this.x = point[0];
        this.y = point[1];
      }
      return [this.x, this.y];
    };

    Node.prototype.prev_point = function(point) {
      if (point != null) {
        this.px = point[0];
        this.py = point[1];
      }
      return [this.px, this.py];
    };

    Node.prototype.select = function() {
      var edge, i, j, len, len1, ref, ref1;
      ref = this.links_from;
      for (i = 0, len = ref.length; i < len; i++) {
        edge = ref[i];
        edge.select();
      }
      ref1 = this.links_to;
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        edge = ref1[j];
        edge.select();
      }
      return this.taxon.update_state(this, 'select');
    };

    Node.prototype.unselect = function() {
      var edge, i, j, len, len1, ref, ref1;
      ref = this.links_from;
      for (i = 0, len = ref.length; i < len; i++) {
        edge = ref[i];
        edge.unselect();
      }
      ref1 = this.links_to;
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        edge = ref1[j];
        edge.unselect();
      }
      return this.taxon.update_state(this, 'unselect');
    };

    Node.prototype.discard = function() {
      return this.taxon.update_state(this, 'discard');
    };

    return Node;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).Node = Node;

}).call(this);
}, "predicate": function(exports, require, module) {(function() {
  var Predicate, TreeCtrl, uniquer,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  TreeCtrl = require('treectrl').TreeCtrl;

  uniquer = require("uniquer").uniquer;

  Predicate = (function(superClass) {
    extend(Predicate, superClass);

    function Predicate(id) {
      this.id = id;
      Predicate.__super__.constructor.apply(this, arguments);
      this.lid = uniquer(this.id);
      this.all_edges = SortedSet().sort_on("id").named("predicate");
      this.selected_instances = SortedSet().sort_on("id").named("selected").isState('_p');
      this.unselected_instances = SortedSet().sort_on("id").named("unselected").isState('_p');
      this.shown_instances = SortedSet().sort_on("id").named("shown").isState("_s");
      this.unshown_instances = SortedSet().sort_on("id").named("unshown").isState("_s");
      this.change_map = {
        unselect: this.unselected_instances,
        select: this.selected_instances,
        unshow: this.unshown_instances,
        show: this.shown_instances
      };
      this;
    }

    Predicate.prototype.custom_event_name = 'changePredicate';

    Predicate.prototype.add_inst = function(inst) {
      this.all_edges.add(inst);
      return this.update_state();
    };

    Predicate.prototype.update_selected_instances = function() {
      var before_count, e, i, len, ref, results;
      before_count = this.selected_instances.length;
      ref = this.all_edges;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        e = ref[i];
        if (e.an_end_is_selected()) {
          results.push(this.selected_instances.acquire(e));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    Predicate.prototype.update_state = function(inst, change) {
      this.update_selected_instances();
      return Predicate.__super__.update_state.call(this, inst, change);
    };

    Predicate.prototype.recalc_direct_stats = function() {
      return [this.count_shown_selected(), this.selected_instances.length];
    };

    Predicate.prototype.count_shown_selected = function() {
      var count, e, i, len, ref;
      count = 0;
      ref = this.selected_instances;
      for (i = 0, len = ref.length; i < len; i++) {
        e = ref[i];
        if (e.shown != null) {
          count++;
        }
      }
      return count;
    };

    return Predicate;

  })(TreeCtrl);

  (typeof exports !== "undefined" && exports !== null ? exports : this).Predicate = Predicate;

}).call(this);
}, "quadparser": function(exports, require, module) {(function() {
  var Quad, QuadParser, RdfObject, RdfUri, isComment, parseQuadLine, quadRegex, uriRegex;

  QuadParser = (function() {
    function QuadParser(str_or_stream) {
      events.EventEmitter.call(this);
      if (typeof str_or_stream !== 'string') {
        throw new Error("QuadParser(stream) not yet supported");
      }
      this._lzy = {
        lines: str_or_stream.split("\n")
      };
      this;
    }

    return QuadParser;

  })();

  Quad = function(subject, pred, obj, graph) {
    this.s = new RdfUri(subject);
    this.p = new RdfUri(pred);
    this.o = new RdfObject(obj);
    return this.g = new RdfUri(graph);
  };

  RdfUri = function(url) {
    var match, self;
    self = this;
    match = url.match(uriRegex);
    if (match) {
      return self.raw = match[1];
    } else {
      return self.raw = url;
    }
  };

  RdfObject = function(val) {
    var match, self;
    self = this;
    match = val.match(uriRegex);
    if (match) {
      self.raw = match[1];
      return self.type = "uri";
    } else {
      self.raw = val;
      return self.type = "literal";
    }
  };

  parseQuadLine = function(line) {
    var g, match, o, p, s;
    if ((line == null) || line === "" || line.match(isComment)) {
      return null;
    } else {
      match = line.match(quadRegex);
      if (match) {
        s = match[1].trim();
        p = match[2].trim();
        o = match[3].trim();
        g = match[4].trim();
        return new Quad(s, p, o, g);
      } else {
        return console.log("no match: " + line);
      }
    }
  };

  QuadParser.super_ = events.EventEmitter;

  QuadParser.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
      value: QuadParser,
      enumerable: false
    }
  });

  QuadParser.prototype.parse = function() {
    console.log("this", this);
    this._lzy.lines.forEach(function(line) {
      var quad, str;
      if ((line != null) && line !== undefined) {
        str = line.toString() + "\n";
        quad = parseQuadLine(str);
        console.log("quad good", quad);
        if (quad != null) {
          return this.emit("quad", quad);
        }
      }
    });
    return this.emit("end");
  };

  Quad.prototype.toString = function() {
    return "<" + this.s + "> <" + this.p + "> " + this.o + " <" + this.g + "> .\n";
  };

  Quad.prototype.toNQuadString = function() {
    return "<" + this.s + "> <" + this.p + "> " + this.o + " <" + this.g + "> .\n";
  };

  uriRegex = /<([^>]*)>/;

  RdfUri.prototype.toString = function() {
    return this.raw;
  };

  RdfObject.prototype.toString = function() {
    return this.raw;
  };

  RdfObject.prototype.isUri = function() {
    return this.type === "uri";
  };

  RdfObject.prototype.isLiteral = function() {
    return this.type === "literal";
  };

  quadRegex = /\s*(<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>)\s*(".*"?|<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>).*\s*\.\s*$/;

  isComment = /^\s*\/\//;

}).call(this);
}, "querymanager": function(exports, require, module) {(function() {
  var QueryManager;

  QueryManager = (function() {
    function QueryManager(qry) {
      this.qry = qry;
      this.set_state('new');
      if (this.listeners == null) {
        this.listeners = [];
      }
      this.resultCount = 0;
    }

    QueryManager.prototype.set_state = function(state) {
      this._state = state;
      if (state === 'done') {
        return this.call_done_listeners();
      }
    };

    QueryManager.prototype.when_done = function(listener) {
      return this.listeners.push(listener);
    };

    QueryManager.prototype.call_done_listeners = function() {
      var listener, results1;
      results1 = [];
      while ((listener = this.listeners.shift())) {
        results1.push(setTimeout(listener, 10));
      }
      return results1;
    };

    QueryManager.prototype.incrResultCount = function() {
      return this.resultCount++;
    };

    QueryManager.prototype.styleQuery = function(color, style) {
      return this.preJQElem.css('background', color).addClass(style);
    };

    QueryManager.prototype.setNoneColor = function() {
      return this.styleQuery('#d3d3d357', 'result-none');
    };

    QueryManager.prototype.setErrorColor = function() {
      return this.styleQuery('#f9e7ea', 'result-error');
    };

    QueryManager.prototype.setSuccessColor = function() {
      return this.styleQuery('#e6f9e6', 'result-success');
    };

    QueryManager.prototype.setKilledColor = function() {
      this.setNoneColor();
      return this.preJQElem.css('color', 'white').addClass('result-empty');
    };

    QueryManager.prototype.displayError = function(e) {
      console.warn(e);
      return this.qryJQElem.append("<div class=\"query-error\">" + e + "</div>");
    };

    QueryManager.prototype.fatalError = function(e) {
      this.set_state('done');
      this.cancelAnimation();
      this.displayError(e);
      return this.setErrorColor();
    };

    QueryManager.prototype.displayResults = function(results) {
      return this.qryJQElem.append("<div class=\"query-results\">" + results + "</div>");
    };

    QueryManager.prototype.finishCounting = function() {
      return this.setResultCount(this.resultCount);
    };

    QueryManager.prototype.setResultCount = function(count) {
      this.set_state('done');
      this.resultCount = count;
      this.displayResults("result count: " + this.resultCount);
      if (count === 0) {
        return this.setNoneColor();
      } else if (count > 0) {
        return this.setSuccessColor();
      }
    };

    QueryManager.prototype.setXHR = function(xhr) {
      this.xhr = xhr;
    };

    QueryManager.prototype.abortXHR = function() {
      return this.xhr.abort();
    };

    QueryManager.prototype.cancelAnimation = function() {
      return this.anim.cancel();
    };

    QueryManager.prototype.kill = function() {
      this.abortXHR();
      this.cancelAnimation();
      return this.setKilledColor();
    };

    return QueryManager;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).QueryManager = QueryManager;

}).call(this);
}, "taxon": function(exports, require, module) {(function() {
  var Taxon, TreeCtrl, angliciser,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  angliciser = require('angliciser').angliciser;

  TreeCtrl = require('treectrl').TreeCtrl;

  Taxon = (function(superClass) {
    extend(Taxon, superClass);

    Taxon.prototype.suspend_updates = false;

    Taxon.prototype.custom_event_name = 'changeTaxon';

    function Taxon(id, lid) {
      this.id = id;
      this.lid = lid;
      Taxon.__super__.constructor.call(this);
      if (this.lid == null) {
        this.lid = this.id;
      }
      this.instances = SortedSet().named(this.id).isState('_isa').sort_on("id");
      this.discarded_instances = SortedSet().named('discarded').isState('_tp').sort_on("id");
      this.selected_instances = SortedSet().named('selected').isState('_tp').sort_on("id");
      this.unselected_instances = SortedSet().named('unselected').isState('_tp').sort_on("id");
      this.change_map = {
        discard: this.discarded_instances,
        select: this.selected_instances,
        unselect: this.unselected_instances
      };
    }

    Taxon.prototype.get_instances = function(hier) {
      var i, inst, j, len, len1, ref, ref1, results, retval, sub;
      if (hier) {
        retval = [];
        ref = this.get_instances(false);
        for (i = 0, len = ref.length; i < len; i++) {
          inst = ref[i];
          retval.push(inst);
        }
        ref1 = this.subs;
        results = [];
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          sub = ref1[j];
          results.push((function() {
            var k, len2, ref2, results1;
            ref2 = sub.get_instances(true);
            results1 = [];
            for (k = 0, len2 = ref2.length; k < len2; k++) {
              inst = ref2[k];
              results1.push(retval.push(inst));
            }
            return results1;
          })());
        }
        return results;
      } else {
        return this.instances;
      }
    };

    Taxon.prototype.register = function(node) {
      if (node.taxons == null) {
        node.taxons = [];
      }
      node.taxons.push(this);
      node.taxon = this;
      return this.acquire(node);
    };

    Taxon.prototype.acquire = function(node) {
      return this.instances.acquire(node);
    };

    Taxon.prototype.recalc_direct_stats = function() {
      return [this.selected_instances.length, this.instances.length];
    };

    Taxon.prototype.recalc_english = function(in_and_out) {
      var i, j, k, len, len1, len2, n, phrase, ref, ref1, ref2, sub;
      if (this.indirect_state === 'showing') {
        phrase = this.lid;
        if (this.subs.length > 0) {
          phrase = "every " + phrase;
        }
        in_and_out.include.push(phrase);
      } else {
        if (this.indirect_state === 'mixed') {
          if (this.state === 'showing') {
            in_and_out.include.push(this.lid);
          }
          if (this.state === 'mixed') {
            if (this.selected_instances.length < this.unselected_instances.length) {
              ref = this.selected_instances;
              for (i = 0, len = ref.length; i < len; i++) {
                n = ref[i];
                in_and_out.include.push(n.lid);
              }
            } else {
              in_and_out.include.push(this.id);
              ref1 = this.unselected_instances;
              for (j = 0, len1 = ref1.length; j < len1; j++) {
                n = ref1[j];
                in_and_out.exclude.push(n.lid);
              }
            }
          }
          ref2 = this.subs;
          for (k = 0, len2 = ref2.length; k < len2; k++) {
            sub = ref2[k];
            sub.recalc_english(in_and_out);
          }
        }
      }
    };

    Taxon.prototype.update_english = function() {
      var evt, in_and_out;
      if (this.id !== "Thing") {
        console.error("update_english(" + this.lid + ") should only be called on Thing");
      }
      in_and_out = {
        include: [],
        exclude: []
      };
      this.recalc_english(in_and_out);
      evt = new CustomEvent('changeEnglish', {
        detail: {
          english: this.english_from(in_and_out)
        },
        bubbles: true,
        cancelable: true
      });
      return window.dispatchEvent(evt);
    };

    Taxon.prototype.english_from = function(in_and_out) {
      var english;
      english = angliciser(in_and_out.include);
      if (in_and_out.exclude.length) {
        english += " except " + angliciser(in_and_out.exclude, " or ");
      }
      return english;
    };

    return Taxon;

  })(TreeCtrl);

  (typeof exports !== "undefined" && exports !== null ? exports : this).Taxon = Taxon;

}).call(this);
}, "textcursor": function(exports, require, module) {(function() {
  var TextCursor;

  TextCursor = (function() {
    TextCursor.prototype.fontFillStyle = "black";

    TextCursor.prototype.bgFillStyle = "Yellow";

    TextCursor.prototype.bgGlobalAlpha = 0.6;

    TextCursor.prototype.borderStrokeStyle = "black";

    TextCursor.prototype.face = "sans-serif";

    TextCursor.prototype.width = 128;

    TextCursor.prototype.height = 32;

    TextCursor.prototype.scale = .3;

    TextCursor.prototype.pointer_height = 6;

    function TextCursor(elem, text) {
      this.elem = elem;
      this.cache = {};
      this.set_text(text);
      this.paused = false;
      this.last_text = "";
    }

    TextCursor.prototype.font_height = function() {
      return this.height * this.scale;
    };

    TextCursor.prototype.set_text = function(text, temp, bgcolor) {
      var cursor, url;
      this.bgFillStyle = bgcolor ? bgcolor : "yellow";
      if (text) {
        if (this.cache[text] == null) {
          this.cache[text] = this.make_img(text);
        }
        url = this.cache[text];
        cursor = "url(" + url + ") " + this.pointer_height + " 0, default";
      } else {
        cursor = "default";
      }
      if (temp == null) {
        this.last_text = text;
      }
      if (!this.paused) {
        return this.set_cursor(cursor);
      }
    };

    TextCursor.prototype.pause = function(cursor, text) {
      this.paused = false;
      if (text != null) {
        this.set_text(text, true);
      } else {
        this.set_cursor(cursor);
      }
      return this.paused = true;
    };

    TextCursor.prototype["continue"] = function() {
      this.paused = false;
      return this.set_text(this.last_text);
    };

    TextCursor.prototype.set_cursor = function(cursor) {
      return $(this.elem).css("cursor", cursor);
    };

    TextCursor.prototype.make_img = function(text) {
      var cursor, height, i, id, inset, j, k, len, len1, line, lines, max_width, sel, top, url, voffset;
      id = "temp_TextCursor_canvas";
      sel = "#" + id;
      $('<canvas>', {
        id: id
      }).appendTo("body");
      this.canvas = $(sel)[0];
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext("2d");
      this.ctx.clearRect(0, 0, this.width, this.height);
      inset = 3;
      top = 10;
      this.ctx.translate(0, this.font_height());
      this.ctx.fillStyle = this.fontFillStyle;
      this.ctx.font = (this.font_height()) + "px " + this.face;
      this.ctx.textAlign = 'left';
      lines = text.split("\n");
      max_width = 0;
      for (i = j = 0, len = lines.length; j < len; i = ++j) {
        line = lines[i];
        if (line) {
          voffset = this.font_height() * i + top;
          max_width = Math.max(this.ctx.measureText(line).width, max_width);
        }
      }
      height = this.font_height() * lines.length + inset;
      this.draw_bubble(inset, top, max_width + inset * 4, height, this.pointer_height, this.font_height() / 2);
      for (i = k = 0, len1 = lines.length; k < len1; i = ++k) {
        line = lines[i];
        if (line) {
          voffset = this.font_height() * i + top;
          this.ctx.fillText(line, top, voffset);
        }
      }
      url = this.canvas.toDataURL("image/png");
      cursor = "url(" + url + "), help";
      $(this.canvas).remove();
      return url;
    };

    TextCursor.prototype.draw_bubble = function(x, y, w, h, pointer_height, radius) {

      /*
      http://www.scriptol.com/html5/canvas/speech-bubble.php
       */
      var b, r;
      r = x + w;
      b = y + h;
      this.ctx.save();
      this.ctx.translate(0, this.font_height() * -1);
      this.ctx.beginPath();
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + radius / 2, y - pointer_height);
      this.ctx.lineTo(x + radius * 2, y);
      this.ctx.lineTo(r - radius, y);
      this.ctx.quadraticCurveTo(r, y, r, y + radius);
      this.ctx.lineTo(r, y + h - radius);
      this.ctx.quadraticCurveTo(r, b, r - radius, b);
      this.ctx.lineTo(x + radius, b);
      this.ctx.quadraticCurveTo(x, b, x, b - radius);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
      this.ctx.closePath();
      if (this.bgGlobalAlpha != null) {
        this.ctx.save();
        this.ctx.globalAlpha = this.bgGlobalAlpha;
        if (this.bgFillStyle != null) {
          this.ctx.fillStyle = this.bgFillStyle;
          this.ctx.fill();
        }
        this.ctx.restore();
      }
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = this.borderStrokeStyle;
      this.ctx.stroke();
      return this.ctx.restore();
    };

    return TextCursor;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).TextCursor = TextCursor;

}).call(this);
}, "treectrl": function(exports, require, module) {
/*
TreeCtrl controls TreePicker states: showing, unshowing, mixed for direct and indirect.

 Elements may be in one of these states:
   mixed      - some instances of the node class are selected, but not all
   unshowing  - there are instances but none are selected
   showing    - there are instances and all are selected
   abstract   - there are no instances (but presumably there are subs)
   (empty)    - is empty a better name for taxon with no direct members?
                Perhaps 'empty' is a legal direct-state and 'abstract' is only
                sensible as an indirect-state? Do these distinctions make
                sense in both the Taxon context and the Predicate context?

 What about these theoretical states?
   hidden     - TBD: not sure when hidden is appropriate
                perhaps abstract predicate subtrees should be hidden
                ie "there is nothing interesting here, move along"
   emphasized - TBD: mark the class of the focused_node


 Are these states only meaningful in the MVC View context and not the
 Model context? -- where the model context is Taxon and/or Predicate
 while the View context is the TreePicker.  Likewise 'collapse' is
 concept related to the View.  OK so we have View verbs such as:
 * hide
 * emphasize
 * collapse
 * pick (click?)
 and Model verbs such as:
 */

(function() {
  var TreeCtrl;

  TreeCtrl = (function() {
    function TreeCtrl() {
      this.state = 'empty';
      this.indirect_state = 'empty';
      this.subs = [];
      this.super_class = null;
      this.direct_stats = [0, 0];
      this.dirty = false;
    }

    TreeCtrl.prototype.get_state = function() {
      if (this.state == null) {
        alert(this.id + " has no direct state");
      }
      return this.state;
    };

    TreeCtrl.prototype.get_indirect_state = function() {
      if (this.indirect_state == null) {
        alert(this.id + " has no indirect_state");
      }
      return this.indirect_state;
    };

    TreeCtrl.prototype.register_superclass = function(super_class) {
      if (super_class === this) {
        return;
      }
      if (this.super_class != null) {
        this.super_class.remove_subclass(this);
      }
      this.super_class = super_class;
      return this.super_class.register_subclass(this);
    };

    TreeCtrl.prototype.remove_subclass = function(sub_class) {
      var idx;
      idx = this.subs.indexOf(sub_class);
      if (idx > -1) {
        return this.subs.splice(idx, 1);
      }
    };

    TreeCtrl.prototype.register_subclass = function(sub_class) {
      return this.subs.push(sub_class);
    };

    TreeCtrl.prototype.recalc_states = function() {
      this.direct_stats = this.recalc_direct_stats();
      this.indirect_stats = this.recalc_indirect_stats([0, 0]);
      this.state = this.recalc_direct_state();
      this.indirect_state = this.recalc_indirect_state();
    };

    TreeCtrl.prototype.recalc_indirect_state = function() {
      var consensus, i, kid, kid_ind_stt, len, ref;
      if (this.subs.length === 0) {
        return this.state;
      }
      if (this.state === 'mixed') {
        return 'mixed';
      }
      consensus = this.get_state();
      ref = this.subs;
      for (i = 0, len = ref.length; i < len; i++) {
        kid = ref[i];
        kid_ind_stt = kid.get_indirect_state();
        if (kid_ind_stt !== consensus) {
          if (consensus === 'empty' || consensus === 'hidden') {
            consensus = kid_ind_stt;
          } else if (kid_ind_stt !== 'empty' && kid_ind_stt !== 'hidden') {
            return "mixed";
          }
        }
      }
      return consensus;
    };

    TreeCtrl.prototype.set_dirty = function() {
      this.dirty = true;
      if (this.super_class != null) {
        return this.super_class.set_dirty();
      }
    };

    TreeCtrl.prototype.update_state = function(inst, change) {
      if (inst != null) {
        this.change_map[change].acquire(inst);
      }
      return this.set_dirty();
    };

    TreeCtrl.prototype.clean_up_dirt = function() {
      var evt, i, kid, len, old_indirect_state, old_state, ref, updating_stats;
      if (!this.dirty) {
        return;
      }
      this.dirty = false;
      old_state = this.state;
      old_indirect_state = this.indirect_state;
      ref = this.subs;
      for (i = 0, len = ref.length; i < len; i++) {
        kid = ref[i];
        kid.clean_up_dirt();
      }
      this.recalc_states();
      updating_stats = true;
      if (updating_stats || old_state !== this.state || old_indirect_state !== this.indirect_state) {
        if (window.suspend_updates) {
          return;
        }
        evt = new CustomEvent(this.custom_event_name, {
          detail: {
            target_id: this.lid,
            target: this,
            old_state: old_state,
            new_state: this.state,
            old_indirect_state: old_indirect_state,
            new_indirect_state: this.indirect_state,
            payload: this.get_payload_string(),
            collapsed_payload: this.get_collapsed_payload_string()
          },
          bubbles: true,
          cancelable: true
        });
        return window.dispatchEvent(evt);
      }
    };

    TreeCtrl.prototype.format_stats = function(stats) {
      return stats[0] + "/" + stats[1];
    };

    TreeCtrl.prototype.translate_stats_to_state = function(stats) {
      if (stats[1] === 0) {
        return "empty";
      }
      if (stats[0] === 0) {
        return "unshowing";
      }
      if (stats[0] === stats[1]) {
        return "showing";
      }
      return "mixed";
    };

    TreeCtrl.prototype.recalc_direct_state = function() {
      return this.translate_stats_to_state(this.direct_stats);
    };

    TreeCtrl.prototype.get_payload_string = function() {
      return this.format_stats(this.direct_stats);
    };

    TreeCtrl.prototype.get_collapsed_payload_string = function() {
      return this.format_stats(this.indirect_stats);
    };

    TreeCtrl.prototype.recalc_indirect_stats = function(stats) {
      var i, len, ref, sub;
      stats[0] += this.direct_stats[0];
      stats[1] += this.direct_stats[1];
      if (this.subs.length > 0) {
        ref = this.subs;
        for (i = 0, len = ref.length; i < len; i++) {
          sub = ref[i];
          sub.recalc_indirect_stats(stats);
        }
      }
      return stats;
    };

    return TreeCtrl;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).TreeCtrl = TreeCtrl;

}).call(this);
}, "treepicker": function(exports, require, module) {
/*
Build and control a hierarchic menu of arbitrarily nested divs looking like:

    +-----------------------+
    |      +---------------+|
    |      |        +-----+||
    | All▼ |People▼ |Men  |||
    |      |        +-----+||
    |      |        +-----+||
    |      |        |Women|||
    |      |        +-----+||
    |      +---------------+|
    +-----------------------+

* The user can toggle between collapsed and expanded using the triangles.
* On the other hand, branches in the tree which are empty are hidden.
* Clicking uncollapsed branches cycles just their selectedness not their children.
* Clicking collapsed branches cycles the selectedness of them and their children.

* <div class="container"> a container holds one or more contents
* <div class="contents"> a content (ie a node such as THING) may have a container for it kids
* so the CONTENT with id=Thing is within the root CONTAINER
     and the Thing CONTENT itself holds a CONTAINER with the child CONTENTS of its subclasses

Possible Bug: it appears that <div class="container" id="classes"> has a redundant child
                which looks like <div class="container">.
              It is unclear why this is needed.  Containers should not directly hold containers.
 */

(function() {
  var TreePicker, uniquer,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  uniquer = require("uniquer").uniquer;

  TreePicker = (function() {
    function TreePicker(elem1, root, extra_classes, needs_expander, use_name_as_label, squash_case_during_sort, style_context_selector) {
      this.elem = elem1;
      this.needs_expander = needs_expander;
      this.use_name_as_label = use_name_as_label;
      this.squash_case_during_sort = squash_case_during_sort;
      this.style_context_selector = style_context_selector;
      this.onChangeState = bind(this.onChangeState, this);
      this.handle_click = bind(this.handle_click, this);
      this.click_handler = bind(this.click_handler, this);
      if (extra_classes != null) {
        this.extra_classes = extra_classes;
      }
      if (this.use_name_as_label == null) {
        this.use_name_as_label = true;
      }
      if (this.squash_case_during_sort == null) {
        this.squash_case_during_sort = true;
      }
      this.id_to_elem = {};
      this.id_to_elem['/'] = this.elem;
      this.ids_in_arrival_order = [root];
      this.id_is_abstract = {};
      this.id_is_collapsed = {};
      this.id_to_state = {
        "true": {},
        "false": {}
      };
      this.id_to_parent = {
        root: '/'
      };
      this.id_to_children = {
        '/': [root]
      };
      this.id_to_payload_collapsed = {};
      this.id_to_payload_expanded = {};
      this.id_to_name = {};
      this.set_abstract(root);
      this.set_abstract('/');
      this.set_abstract('root');
    }

    TreePicker.prototype.get_my_id = function() {
      return this.elem.attr("id");
    };

    TreePicker.prototype.shield = function() {
      var rect, styles;
      if (!this._shield) {
        d3.select(this.elem[0][0]).style('position', 'relative');
        this._shield = d3.select(this.elem[0][0]).insert('div');
        this._shield.classed('shield', true);
      }
      rect = d3.select(this.elem[0][0]).node().getBoundingClientRect();
      styles = {
        display: 'block',
        width: rect.width + "px",
        height: rect.height + "px"
      };
      this._shield.style(styles);
      return this;
    };

    TreePicker.prototype.unshield = function() {
      this._shield.style({
        display: 'none'
      });
      return this;
    };

    TreePicker.prototype.set_abstract = function(id) {
      return this.id_is_abstract[id] = true;
    };

    TreePicker.prototype.get_abstract_count = function() {
      return Object.keys(this.id_is_abstract).length;
    };

    TreePicker.prototype.is_abstract = function(id) {
      var tmp;
      tmp = this.id_is_abstract[id];
      return (tmp != null) && tmp;
    };

    TreePicker.prototype.uri_to_js_id = function(uri) {
      return uniquer(uri);
    };

    TreePicker.prototype.get_childrens_ids = function(parent_id) {
      if (parent_id == null) {
        parent_id = '/';
      }
      return this.id_to_children[parent_id] || [];
    };

    TreePicker.prototype.get_container_elem_within_id = function(an_id) {
      var content_elem;
      content_elem = this.id_to_elem[an_id][0][0];
      return content_elem.querySelector('.container');
    };

    TreePicker.prototype.resort_recursively = function(an_id) {
      var child_elem, child_id, container_elem, i, j, kids_ids, len, len1, sort_by_first_item, val, val_elem_pair, val_elem_pairs;
      if (an_id == null) {
        an_id = '/';
      }
      kids_ids = this.get_childrens_ids(an_id);
      if (!kids_ids || !kids_ids.length) {
        return;
      }
      val_elem_pairs = [];
      sort_by_first_item = function(a, b) {
        return a[0].localeCompare(b[0]);
      };
      for (i = 0, len = kids_ids.length; i < len; i++) {
        child_id = kids_ids[i];
        this.resort_recursively(child_id);
        val = this.get_comparison_value(child_id, this.id_to_name[child_id]);
        child_elem = this.id_to_elem[child_id][0][0];
        this.update_label_for_node(child_id, child_elem);
        val_elem_pairs.push([val, child_elem]);
      }
      val_elem_pairs.sort(sort_by_first_item);
      container_elem = this.get_container_elem_within_id(an_id);
      if (!container_elem) {
        throw "no container_elem";
      }
      for (j = 0, len1 = val_elem_pairs.length; j < len1; j++) {
        val_elem_pair = val_elem_pairs[j];
        child_elem = val_elem_pair[1];
        container_elem.appendChild(child_elem);
      }
    };

    TreePicker.prototype.update_label_for_node = function(node_id, node_elem) {
      var label_elem;
      if (node_elem == null) {
        node_elem = this.id_to_elem[node_id];
      }
      label_elem = node_elem.querySelector('p.treepicker-label span.label');
      if (label_elem != null) {
        return label_elem.textContent = this.id_to_name[node_id];
      }
    };

    TreePicker.prototype.get_comparison_value = function(node_id, label) {
      var this_term;
      if (this.use_name_as_label) {
        this_term = label || node_id;
      } else {
        this_term = node_id;
      }
      if (this.squash_case_during_sort === true) {
        this_term = this_term.toLowerCase();
      }
      return this_term;
    };

    TreePicker.prototype.add_alphabetically = function(i_am_in, node_id, label) {
      var container, elem, i, label_lower, len, other_term, ref, this_term;
      label_lower = label.toLowerCase();
      container = i_am_in[0][0];
      this_term = this.get_comparison_value(node_id, label);
      ref = container.children;
      for (i = 0, len = ref.length; i < len; i++) {
        elem = ref[i];
        other_term = this.get_comparison_value(elem.id, this.id_to_name[elem.id]);
        if (other_term > this_term) {
          return this.add_to_elem_before(i_am_in, node_id, "#" + elem.id, label);
        }
      }
      return this.add_to_elem_before(i_am_in, node_id, void 0, label);
    };

    TreePicker.prototype.add_to_elem_before = function(i_am_in, node_id, before, label) {
      return i_am_in.insert('div', before).attr('class', 'contents').attr('id', node_id);
    };

    TreePicker.prototype.show_tree = function(tree, i_am_in, listener, top) {
      var contents_of_me, css_class, i, label, len, my_contents, node_id, picker, ref, rest, results;
      top = (top == null) || top;
      results = [];
      for (node_id in tree) {
        rest = tree[node_id];
        label = rest[0];
        contents_of_me = this.add_alphabetically(i_am_in, node_id, label);
        this.id_to_elem[node_id] = contents_of_me;
        picker = this;
        contents_of_me.on('click', this.click_handler);
        contents_of_me.append("p").attr("class", "treepicker-label").append('span').attr('class', 'label').text(label);
        if (rest.length > 1) {
          my_contents = this.get_or_create_container(contents_of_me);
          if (top && this.extra_classes) {
            ref = this.extra_classes;
            for (i = 0, len = ref.length; i < len; i++) {
              css_class = ref[i];
              my_contents.classed(css_class, true);
            }
          }
          results.push(this.show_tree(rest[1], my_contents, listener, false));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    TreePicker.prototype.click_handler = function() {
      var elem, id, picker;
      picker = this;
      elem = d3.select(d3.event.target);
      d3.event.stopPropagation();
      id = elem.node().id;
      while (!id) {
        elem = d3.select(elem.node().parentElement);
        id = elem.node().id;
      }
      picker.handle_click(id);
      return id;
    };

    TreePicker.prototype.handle_click = function(id) {
      return this.go_to_next_state(id, this.get_next_state_args(id));
    };

    TreePicker.prototype.get_next_state_args = function(id) {
      var elem, is_treepicker_collapsed, is_treepicker_indirect_showing, is_treepicker_showing, new_state;
      elem = this.id_to_elem[id];
      if (!elem) {
        throw new Error("elem for '" + id + "' not found");
      }
      is_treepicker_collapsed = elem.classed('treepicker-collapse');
      is_treepicker_showing = elem.classed('treepicker-showing');
      is_treepicker_indirect_showing = elem.classed('treepicker-indirect-showing');
      new_state = 'showing';
      if (is_treepicker_collapsed) {
        if (is_treepicker_indirect_showing) {
          new_state = 'unshowing';
        }
      } else {
        if (is_treepicker_showing) {
          new_state = 'unshowing';
        }
      }
      return {
        new_state: new_state,
        collapsed: is_treepicker_collapsed,
        original_click: true
      };
    };

    TreePicker.prototype.go_to_next_state = function(id, args) {
      var listener, send_leafward;
      listener = this.click_listener;
      send_leafward = this.id_is_collapsed[id];
      return this.effect_click(id, args.new_state, send_leafward, listener, args);
    };

    TreePicker.prototype.effect_click = function(id, new_state, send_leafward, listener, args) {
      var child_id, elem, i, kids, len;
      if (send_leafward) {
        kids = this.id_to_children[id];
        if (kids != null) {
          for (i = 0, len = kids.length; i < len; i++) {
            child_id = kids[i];
            if (child_id !== id) {
              this.effect_click(child_id, new_state, send_leafward, listener);
            }
          }
        }
      }
      if (listener != null) {
        elem = this.id_to_elem[id];
        return listener.call(this, id, new_state, elem, args);
      }
    };

    TreePicker.prototype.get_or_create_container = function(contents) {
      var r;
      r = contents.select(".container");
      if (r[0][0] !== null) {
        return r;
      }
      return contents.append('div').attr('class', 'container');
    };

    TreePicker.prototype.get_top = function() {
      return this.ids_in_arrival_order[0] || this.id;
    };

    TreePicker.prototype.set_name_for_id = function(name, id) {
      if (this.use_name_as_label) {
        return this.id_to_name[id] = name;
      } else {
        return this.id_to_name[id] = id;
      }
    };

    TreePicker.prototype.add = function(new_id, parent_id, name, listener) {
      var branch, container, parent;
      this.ids_in_arrival_order.push(new_id);
      parent_id = (parent_id != null) && parent_id || this.get_top();
      new_id = this.uri_to_js_id(new_id);
      this.id_is_collapsed[new_id] = false;
      parent_id = this.uri_to_js_id(parent_id);
      this.id_to_parent[new_id] = parent_id;
      if (this.id_to_children[parent_id] == null) {
        this.id_to_children[parent_id] = [];
      }
      if (new_id !== parent_id) {
        this.id_to_children[parent_id].push(new_id);
      }
      name = (name != null) && name || new_id;
      branch = {};
      branch[new_id] = [name || new_id];
      this.id_to_name[new_id] = name;
      parent = this.id_to_elem[parent_id] || this.elem;
      container = d3.select(this.get_or_create_container(parent)[0][0]);
      if (this.needs_expander) {
        this.get_or_create_expander(parent, parent_id);
      }
      return this.show_tree(branch, container, listener);
    };

    TreePicker.prototype.collapser_str = "▼";

    TreePicker.prototype.expander_str = "▶";

    TreePicker.prototype.get_or_create_expander = function(thing, id) {
      var exp, picker, r;
      if ((thing != null) && thing) {
        r = thing.select(".expander");
        if (r[0][0] !== null) {
          return r;
        }
        exp = thing.select(".treepicker-label").append('span').classed("expander", true).text(this.collapser_str);
        this.id_is_collapsed[id] = false;
        picker = this;
        return exp.on('click', (function(_this) {
          return function() {
            var id2;
            d3.event.stopPropagation();
            id2 = exp[0][0].parentNode.parentNode.getAttribute("id");
            if (id2 !== id) {
              console.error("expander.click() " + id + " <> " + id2);
            }
            if (_this.id_is_collapsed[id2]) {
              return _this.expand_by_id(id2);
            } else {
              return _this.collapse_by_id(id2);
            }
          };
        })(this));
      }
    };

    TreePicker.prototype.collapse_by_id = function(id) {
      var elem, exp;
      this.id_is_collapsed[id] = true;
      elem = this.id_to_elem[id];
      elem.classed("treepicker-collapse", true);
      exp = elem.select(".expander");
      exp.text(this.expander_str);
      return this.update_payload_by_id(id);
    };

    TreePicker.prototype.expand_by_id = function(id) {
      var elem, exp;
      this.id_is_collapsed[id] = false;
      elem = this.id_to_elem[id];
      elem.classed("treepicker-collapse", false);
      exp = elem.select(".expander");
      exp.text(this.collapser_str);
      return this.update_payload_by_id(id);
    };

    TreePicker.prototype.expand_all = function() {
      var collapsed, id, ref, results;
      ref = this.id_is_collapsed;
      results = [];
      for (id in ref) {
        collapsed = ref[id];
        if (collapsed) {
          results.push(this.expand_by_id(id));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    TreePicker.prototype.get_or_create_payload = function(thing) {
      var r, thing_id;
      if ((thing != null) && thing) {
        thing_id = thing[0][0].id;
        r = thing.select("#" + thing_id + " > .treepicker-label > .payload");
        if (r[0][0] !== null) {
          return r;
        }
        return thing.select(".treepicker-label").append('span').classed("payload", true);
      }
    };

    TreePicker.prototype.set_payload = function(id, value) {
      var elem, payload;
      elem = this.id_to_elem[id];
      if (elem == null) {
        console.warn("set_payload could not find '" + id + "'");
        return;
      }
      payload = this.get_or_create_payload(elem);
      if (payload != null) {
        if (value != null) {
          return payload.text(value);
        } else {
          return payload.remove();
        }
      }
    };

    TreePicker.prototype.set_title = function(id, title) {
      var elem;
      elem = this.id_to_elem[id];
      if (elem != null) {
        return elem.attr("title", title);
      }
    };

    TreePicker.prototype.set_direct_state = function(id, state, old_state) {
      var elem;
      if (old_state == null) {
        old_state = this.id_to_state[true][id];
      }
      this.id_to_state[true][id] = state;
      elem = this.id_to_elem[id];
      if (!elem) {
        console.warn("set_direct_state(" + id + ", " + state + ", " + old_state + ") NO elem for id on @id_to_elem");
        return;
      }
      if (old_state != null) {
        elem.classed("treepicker-" + old_state, false);
      }
      if (state != null) {
        return elem.classed("treepicker-" + state, true);
      }
    };

    TreePicker.prototype.set_indirect_state = function(id, state, old_state) {
      var elem;
      if (state == null) {
        console.error((this.get_my_id()) + ".set_indirect_state()", arguments, "state should never be", void 0);
      }
      if (old_state == null) {
        old_state = this.id_to_state[false][id];
      }
      this.id_to_state[false][id] = state;
      elem = this.id_to_elem[id];
      if (!elem) {
        console.warn("set_indirect_state(" + id + ", " + state + ", " + old_state + ") NO elem for id on @id_to_elem");
        return;
      }
      if (old_state != null) {
        elem.classed("treepicker-indirect-" + old_state, false);
      }
      if (state != null) {
        return elem.classed("treepicker-indirect-" + state, true);
      }
    };

    TreePicker.prototype.set_both_states_by_id = function(id, direct_state, indirect_state, old_state, old_indirect_state) {
      this.set_direct_state(id, direct_state, old_state);
      return this.set_indirect_state(id, indirect_state, old_indirect_state);
    };

    TreePicker.prototype.is_leaf = function(id) {
      return (this.id_to_children[id] == null) || this.id_to_children[id].length === 0;
    };

    TreePicker.prototype.update_parent_indirect_state = function(id) {
      var child_indirect_state, child_is_leaf, new_parent_indirect_state, parent_id, parent_indirect_state;
      parent_id = this.id_to_parent[id];
      child_is_leaf = this.is_leaf(id);
      if ((parent_id != null) && parent_id !== id) {
        child_indirect_state = this.id_to_state[false][id];
        parent_indirect_state = this.id_to_state[false][parent_id];
        new_parent_indirect_state = parent_indirect_state;
        if (child_indirect_state !== parent_indirect_state) {
          new_parent_indirect_state = this.calc_new_indirect_state(parent_id);
        }
        if (new_parent_indirect_state !== parent_indirect_state) {
          this.set_indirect_state(parent_id, new_parent_indirect_state);
        }
        return this.update_parent_indirect_state(parent_id);
      }
    };

    TreePicker.prototype.calc_new_indirect_state = function(id) {
      var child_id, child_indirect_state, i, len, new_indirect_state, old_direct_state, old_indirect_state, ref;
      old_indirect_state = this.id_to_state[false][id];
      old_direct_state = this.id_to_state[true][id];
      ref = this.id_to_children[id];
      for (i = 0, len = ref.length; i < len; i++) {
        child_id = ref[i];
        child_indirect_state = this.id_to_state[false][child_id];
        if (child_indirect_state !== new_indirect_state) {
          if (typeof new_indirect_state === "undefined" || new_indirect_state === null) {
            new_indirect_state = child_indirect_state;
          } else {
            new_indirect_state = "mixed";
          }
        }
        if (new_indirect_state === 'mixed') {
          break;
        }
      }
      if ((old_direct_state != null) && new_indirect_state !== old_direct_state) {
        new_indirect_state = "mixed";
      }
      return new_indirect_state;
    };

    TreePicker.prototype.get_state_by_id = function(id, direct_only) {
      if (direct_only == null) {
        direct_only = true;
      }
      return this.id_to_state[direct_only][id];
    };

    TreePicker.prototype.onChangeState = function(evt) {
      var det;
      det = evt.detail;
      if (det.new_indirect_state != null) {
        this.set_both_states_by_id(det.target_id, det.new_state, det.new_indirect_state, det.old_state, det.old_indirect_state);
      } else {
        this.set_state_by_id(det.target_id, det.new_state, det.old_state);
      }
      return this.cache_payload(det);
    };

    TreePicker.prototype.cache_payload = function(det) {
      var update;
      update = false;
      if (det.collapsed_payload != null) {
        update = true;
        this.id_to_payload_collapsed[det.target_id] = det.collapsed_payload;
      }
      if (det.payload != null) {
        update = true;
        this.id_to_payload_expanded[det.target_id] = det.payload;
      }
      if (update) {
        return this.update_payload_by_id(det.target_id);
      }
    };

    TreePicker.prototype.update_payload_by_id = function(id) {
      var payload;
      if (this.id_is_collapsed[id]) {
        payload = this.id_to_payload_collapsed[id];
        if (payload != null) {
          return this.set_payload(id, payload);
        }
      } else {
        payload = this.id_to_payload_expanded[id];
        if (payload != null) {
          return this.set_payload(id, payload);
        }
      }
    };

    return TreePicker;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).TreePicker = TreePicker;

}).call(this);
}, "uniquer": function(exports, require, module) {(function() {
  var uniquer;

  uniquer = function(str) {
    var m, retval;
    m = str.match(/([\w\d\_\-]+)$/g);
    if (m) {
      retval = m[0];
    } else {
      retval = str.replace(/http(s)?\:/, '').replace(/\//, "__");
      retval = retval.replace(/[\.\;\/]/g, '_');
      retval = retval.replace(/^\_*/g, '');
      retval = retval.replace(/\_*$/g, '');
    }
    if (retval.match(/^[^a-zA-Z]/)) {
      retval = "x" + retval;
    }
    return retval;
  };

  (typeof exports !== "undefined" && exports !== null ? exports : this).uniquer = uniquer;

}).call(this);
}});
