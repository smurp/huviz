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
  if (window) {
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
  array._cmp = function(a, b) {
    var f_or_k = array._f_or_k,
        av = (''+(a && a[f_or_k]) || ''),
        bv = (''+(b && b[f_or_k]) || '');
    // xcase are squashed iff needed
    var acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    return (acase < bcase) && -1 || ((acase > bcase) && 1 || 0);
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
      if (true) { // report because
        var because = ((duds.length != 1) && (""+ duds.length + " removed, not 1")) ||
            ((duds[0] != itm) && (duds[0].lid + " was removed instead of " + itm.lid)) || "";
        if (because) {
          console.log(itm[array._f_or_k], '??', duds[0][array._f_or_k])
          var msg = "remove failed at idx " + c + " to splice " + itm.id +
              " out of "+ array.label + " because "+ because;
          console.debug(msg);
          //throw new Error(msg);
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
  array.get_by = function(key,val){
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
     */
    ret_ins_idx = ret_ins_idx || false;
    var step = 0;
    var seeking = true;
    if (array.length < 1) {
      if (ret_ins_idx) {
	return {idx:0};
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
  some_dupes = SortedSet(0,1,2,2,5,7,2,9).sort_on(n);

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
};
//Sortedsets_tests();
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

(function() {
  d3.fisheye = {
    scale: function(scaleType) {
      return d3_fisheye_scale(scaleType(), 3, 0);
    },
    circular: function() {
      var radius = 200,
          distortion = 2,
          k0,
          k1,
          focus = [0, 0];

      function fisheye(d) {
        var dx = d.x - focus[0],
            dy = d.y - focus[1],
            dd = Math.sqrt(dx * dx + dy * dy);
        if (!dd || dd >= radius) return {x: d.x, y: d.y, z: 1};
        var k = k0 * (1 - Math.exp(-dd * k1)) / dd * .75 + .25;
        return {x: focus[0] + dx * k, y: focus[1] + dy * k, z: Math.min(k, 10)};
      }

      function rescale() {
        k0 = Math.exp(distortion);
        k0 = k0 / (k0 - 1) * radius;
        k1 = distortion / radius;
        return fisheye;
      }

      fisheye.radius = function(_) {
        if (!arguments.length) return radius;
        radius = +_;
        return rescale();
      };

      fisheye.distortion = function(_) {
        if (!arguments.length) return distortion;
        distortion = +_;
        return rescale();
      };

      fisheye.focus = function(_) {
        if (!arguments.length) return focus;
        focus = _;
        return fisheye;
      };

      return rescale();
    }
  };

  function d3_fisheye_scale(scale, d, a) {

    function fisheye(_) {
      var x = scale(_),
          left = x < a,
          range = d3.extent(scale.range()),
          min = range[0],
          max = range[1],
          m = left ? a - min : max - a;
      if (m == 0) m = max - min;
      return (left ? -1 : 1) * m * (d + 1) / (d + (m / Math.abs(x - a))) + a;
    }

    fisheye.distortion = function(_) {
      if (!arguments.length) return d;
      d = +_;
      return fisheye;
    };

    fisheye.focus = function(_) {
      if (!arguments.length) return a;
      a = +_;
      return fisheye;
    };

    fisheye.copy = function() {
      return d3_fisheye_scale(scale.copy(), d, a);
    };

    fisheye.nice = scale.nice;
    fisheye.ticks = scale.ticks;
    fisheye.tickFormat = scale.tickFormat;
    return d3.rebind(fisheye, scale, "domain", "range");
  }
})();

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
}).call(this)({});
