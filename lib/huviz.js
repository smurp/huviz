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
//(function() {

var SortedSet = function(){
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
	// Calling isState() on a SortedSet() prepares it so that
	// when add() is called then the SortedSet is registered on
	// the itm.state property.  This means that if the item
	// is moved to a different SortedSet then it's state can
	// be tested and altered.  This enforces mutually exlusive item
	// membership among the sets which all have isState() asserted.
	array.state_property = state_property || 'state';
	return array;
    };
    array.isFlag = function(flag_property){
	// Calling isFlag() on a SortedSet() prepares it so that
	// when add() is called then the SortedSet is registered on
	// the itm[flag_property].  When the item is removed from
	// the isFlagged SortedSet then that flag_property is deleted.
	// The default value for the name of the flag_property is
	// simply the name of SortedSet().  The motivation of course
        // is for many flags to be able to be set on each node, unlike
        // states, which are mutually exclusive.
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
        Objective:
          Alter supports making a possibly position-altering change to an item.
          Naively changing an item could invalidate its sort order breaking
          operations which depend on that order.
        Means:
          Alter finds itm then calls the callback, which might change itm
          in a way which ought to cause a repositioning in the array.
          If the sorted position of itm is now invalid then figure out where
          it should be positioned and move it there, taking care to not be
          distracted during binary_search by the fact that item is already
          in the set but possibly misorderedly so.
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
	// Objective:
	//   Maintain a sorted array which acts like a set.
        //   It is sorted so insertions and tests can be fast.
        // Return:
        //   The index at which it was inserted (or already found)
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
	// Objective:
	//   Remove item from an array acting like a set.
        //   It is sorted by cmp, so we can use binary_search for removal
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
           This method performs a binary-search-powered version of indexOf(),
           that is; it returns the index of sought or returns -1 to report that
           it was not found.

           If ret_ins_idx (ie "RETurn the INSertion INdeX") is true then
           instead of returning -1 upon failure, it returns the index at which
           sought should be inserted to keep the array sorted.
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
//(typeof exports !== "undefined" && exports !== null ? exports : this).SortedSet = SortedSet;
//})(this);
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

!function(){function n(n,t){return t>n?-1:n>t?1:n>=t?0:0/0}function t(n){return null!=n&&!isNaN(n)}function r(n){return{left:function(t,r,e,u){for(arguments.length<3&&(e=0),arguments.length<4&&(u=t.length);u>e;){var i=e+u>>>1;n(t[i],r)<0?e=i+1:u=i}return e},right:function(t,r,e,u){for(arguments.length<3&&(e=0),arguments.length<4&&(u=t.length);u>e;){var i=e+u>>>1;n(t[i],r)>0?u=i:e=i+1}return e}}}function e(n){return n.length}function u(n){for(var t=1;n*t%1;)t*=10;return t}function i(n,t){try{for(var r in t)Object.defineProperty(n.prototype,r,{value:t[r],enumerable:!1})}catch(e){n.prototype=t}}function o(){}function a(n){return sa+n in this}function c(n){return n=sa+n,n in this&&delete this[n]}function s(){var n=[];return this.forEach(function(t){n.push(t)}),n}function l(){var n=0;for(var t in this)t.charCodeAt(0)===la&&++n;return n}function f(){for(var n in this)if(n.charCodeAt(0)===la)return!1;return!0}function h(){}function g(n,t,r){return function(){var e=r.apply(t,arguments);return e===t?n:e}}function p(n,t){if(t in n)return t;t=t.charAt(0).toUpperCase()+t.substring(1);for(var r=0,e=fa.length;e>r;++r){var u=fa[r]+t;if(u in n)return u}}function v(){}function d(){}function m(n){function t(){for(var t,e=r,u=-1,i=e.length;++u<i;)(t=e[u].on)&&t.apply(this,arguments);return n}var r=[],e=new o;return t.on=function(t,u){var i,o=e.get(t);return arguments.length<2?o&&o.on:(o&&(o.on=null,r=r.slice(0,i=r.indexOf(o)).concat(r.slice(i+1)),e.remove(t)),u&&r.push(e.set(t,{on:u})),n)},t}function y(){Bo.event.preventDefault()}function x(){for(var n,t=Bo.event;n=t.sourceEvent;)t=n;return t}function M(n){for(var t=new d,r=0,e=arguments.length;++r<e;)t[arguments[r]]=m(t);return t.of=function(r,e){return function(u){try{var i=u.sourceEvent=Bo.event;u.target=n,Bo.event=u,t[u.type].apply(r,e)}finally{Bo.event=i}}},t}function _(n){return ga(n,ya),n}function b(n){return"function"==typeof n?n:function(){return pa(n,this)}}function w(n){return"function"==typeof n?n:function(){return va(n,this)}}function S(n,t){function r(){this.removeAttribute(n)}function e(){this.removeAttributeNS(n.space,n.local)}function u(){this.setAttribute(n,t)}function i(){this.setAttributeNS(n.space,n.local,t)}function o(){var r=t.apply(this,arguments);null==r?this.removeAttribute(n):this.setAttribute(n,r)}function a(){var r=t.apply(this,arguments);null==r?this.removeAttributeNS(n.space,n.local):this.setAttributeNS(n.space,n.local,r)}return n=Bo.ns.qualify(n),null==t?n.local?e:r:"function"==typeof t?n.local?a:o:n.local?i:u}function k(n){return n.trim().replace(/\s+/g," ")}function E(n){return new RegExp("(?:^|\\s+)"+Bo.requote(n)+"(?:\\s+|$)","g")}function A(n){return n.trim().split(/^|\s+/)}function C(n,t){function r(){for(var r=-1;++r<u;)n[r](this,t)}function e(){for(var r=-1,e=t.apply(this,arguments);++r<u;)n[r](this,e)}n=A(n).map(N);var u=n.length;return"function"==typeof t?e:r}function N(n){var t=E(n);return function(r,e){if(u=r.classList)return e?u.add(n):u.remove(n);var u=r.getAttribute("class")||"";e?(t.lastIndex=0,t.test(u)||r.setAttribute("class",k(u+" "+n))):r.setAttribute("class",k(u.replace(t," ")))}}function z(n,t,r){function e(){this.style.removeProperty(n)}function u(){this.style.setProperty(n,t,r)}function i(){var e=t.apply(this,arguments);null==e?this.style.removeProperty(n):this.style.setProperty(n,e,r)}return null==t?e:"function"==typeof t?i:u}function L(n,t){function r(){delete this[n]}function e(){this[n]=t}function u(){var r=t.apply(this,arguments);null==r?delete this[n]:this[n]=r}return null==t?r:"function"==typeof t?u:e}function T(n){return"function"==typeof n?n:(n=Bo.ns.qualify(n)).local?function(){return this.ownerDocument.createElementNS(n.space,n.local)}:function(){return this.ownerDocument.createElementNS(this.namespaceURI,n)}}function q(n){return{__data__:n}}function R(n){return function(){return ma(this,n)}}function D(t){return arguments.length||(t=n),function(n,r){return n&&r?t(n.__data__,r.__data__):!n-!r}}function P(n,t){for(var r=0,e=n.length;e>r;r++)for(var u,i=n[r],o=0,a=i.length;a>o;o++)(u=i[o])&&t(u,o,r);return n}function U(n){return ga(n,Ma),n}function j(n){var t,r;return function(e,u,i){var o,a=n[i].update,c=a.length;for(i!=r&&(r=i,t=0),u>=t&&(t=u+1);!(o=a[t])&&++t<c;);return o}}function H(){var n=this.__transition__;n&&++n.active}function F(n,t,r){function e(){var t=this[o];t&&(this.removeEventListener(n,t,t.$),delete this[o])}function u(){var u=c(t,Wo(arguments));e.call(this),this.addEventListener(n,this[o]=u,u.$=r),u._=t}function i(){var t,r=new RegExp("^__on([^.]+)"+Bo.requote(n)+"$");for(var e in this)if(t=e.match(r)){var u=this[e];this.removeEventListener(t[1],u,u.$),delete this[e]}}var o="__on"+n,a=n.indexOf("."),c=O;a>0&&(n=n.substring(0,a));var s=ba.get(n);return s&&(n=s,c=I),a?t?u:e:t?v:i}function O(n,t){return function(r){var e=Bo.event;Bo.event=r,t[0]=this.__data__;try{n.apply(this,t)}finally{Bo.event=e}}}function I(n,t){var r=O(n,t);return function(n){var t=this,e=n.relatedTarget;e&&(e===t||8&e.compareDocumentPosition(t))||r.call(t,n)}}function Y(){var n=".dragsuppress-"+ ++Sa,t="click"+n,r=Bo.select(Qo).on("touchmove"+n,y).on("dragstart"+n,y).on("selectstart"+n,y);if(wa){var e=Ko.style,u=e[wa];e[wa]="none"}return function(i){function o(){r.on(t,null)}r.on(n,null),wa&&(e[wa]=u),i&&(r.on(t,function(){y(),o()},!0),setTimeout(o,0))}}function Z(n,t){t.changedTouches&&(t=t.changedTouches[0]);var r=n.ownerSVGElement||n;if(r.createSVGPoint){var e=r.createSVGPoint();return e.x=t.clientX,e.y=t.clientY,e=e.matrixTransform(n.getScreenCTM().inverse()),[e.x,e.y]}var u=n.getBoundingClientRect();return[t.clientX-u.left-n.clientLeft,t.clientY-u.top-n.clientTop]}function V(){return Bo.event.changedTouches[0].identifier}function $(){return Bo.event.target}function X(){return Qo}function B(n){return n>0?1:0>n?-1:0}function J(n,t,r){return(t[0]-n[0])*(r[1]-n[1])-(t[1]-n[1])*(r[0]-n[0])}function W(n){return n>1?0:-1>n?ka:Math.acos(n)}function G(n){return n>1?Aa:-1>n?-Aa:Math.asin(n)}function K(n){return((n=Math.exp(n))-1/n)/2}function Q(n){return((n=Math.exp(n))+1/n)/2}function nt(n){return((n=Math.exp(2*n))-1)/(n+1)}function tt(n){return(n=Math.sin(n/2))*n}function rt(){}function et(n,t,r){return new ut(n,t,r)}function ut(n,t,r){this.h=n,this.s=t,this.l=r}function it(n,t,r){function e(n){return n>360?n-=360:0>n&&(n+=360),60>n?i+(o-i)*n/60:180>n?o:240>n?i+(o-i)*(240-n)/60:i}function u(n){return Math.round(255*e(n))}var i,o;return n=isNaN(n)?0:(n%=360)<0?n+360:n,t=isNaN(t)?0:0>t?0:t>1?1:t,r=0>r?0:r>1?1:r,o=.5>=r?r*(1+t):r+t-r*t,i=2*r-o,yt(u(n+120),u(n),u(n-120))}function ot(n,t,r){return new at(n,t,r)}function at(n,t,r){this.h=n,this.c=t,this.l=r}function ct(n,t,r){return isNaN(n)&&(n=0),isNaN(t)&&(t=0),st(r,Math.cos(n*=za)*t,Math.sin(n)*t)}function st(n,t,r){return new lt(n,t,r)}function lt(n,t,r){this.l=n,this.a=t,this.b=r}function ft(n,t,r){var e=(n+16)/116,u=e+t/500,i=e-r/200;return u=gt(u)*Oa,e=gt(e)*Ia,i=gt(i)*Ya,yt(vt(3.2404542*u-1.5371385*e-.4985314*i),vt(-.969266*u+1.8760108*e+.041556*i),vt(.0556434*u-.2040259*e+1.0572252*i))}function ht(n,t,r){return n>0?ot(Math.atan2(r,t)*La,Math.sqrt(t*t+r*r),n):ot(0/0,0/0,n)}function gt(n){return n>.206893034?n*n*n:(n-4/29)/7.787037}function pt(n){return n>.008856?Math.pow(n,1/3):7.787037*n+4/29}function vt(n){return Math.round(255*(.00304>=n?12.92*n:1.055*Math.pow(n,1/2.4)-.055))}function dt(n){return yt(n>>16,255&n>>8,255&n)}function mt(n){return dt(n)+""}function yt(n,t,r){return new xt(n,t,r)}function xt(n,t,r){this.r=n,this.g=t,this.b=r}function Mt(n){return 16>n?"0"+Math.max(0,n).toString(16):Math.min(255,n).toString(16)}function _t(n,t,r){var e,u,i,o=0,a=0,c=0;if(e=/([a-z]+)\((.*)\)/i.exec(n))switch(u=e[2].split(","),e[1]){case"hsl":return r(parseFloat(u[0]),parseFloat(u[1])/100,parseFloat(u[2])/100);case"rgb":return t(kt(u[0]),kt(u[1]),kt(u[2]))}return(i=$a.get(n))?t(i.r,i.g,i.b):(null==n||"#"!==n.charAt(0)||isNaN(i=parseInt(n.substring(1),16))||(4===n.length?(o=(3840&i)>>4,o=o>>4|o,a=240&i,a=a>>4|a,c=15&i,c=c<<4|c):7===n.length&&(o=(16711680&i)>>16,a=(65280&i)>>8,c=255&i)),t(o,a,c))}function bt(n,t,r){var e,u,i=Math.min(n/=255,t/=255,r/=255),o=Math.max(n,t,r),a=o-i,c=(o+i)/2;return a?(u=.5>c?a/(o+i):a/(2-o-i),e=n==o?(t-r)/a+(r>t?6:0):t==o?(r-n)/a+2:(n-t)/a+4,e*=60):(e=0/0,u=c>0&&1>c?0:e),et(e,u,c)}function wt(n,t,r){n=St(n),t=St(t),r=St(r);var e=pt((.4124564*n+.3575761*t+.1804375*r)/Oa),u=pt((.2126729*n+.7151522*t+.072175*r)/Ia),i=pt((.0193339*n+.119192*t+.9503041*r)/Ya);return st(116*u-16,500*(e-u),200*(u-i))}function St(n){return(n/=255)<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4)}function kt(n){var t=parseFloat(n);return"%"===n.charAt(n.length-1)?Math.round(2.55*t):t}function Et(n){return"function"==typeof n?n:function(){return n}}function At(n){return n}function Ct(n){return function(t,r,e){return 2===arguments.length&&"function"==typeof r&&(e=r,r=null),Nt(t,r,n,e)}}function Nt(n,t,r,e){function u(){var n,t=c.status;if(!t&&c.responseText||t>=200&&300>t||304===t){try{n=r.call(i,c)}catch(e){return o.error.call(i,e),void 0}o.load.call(i,n)}else o.error.call(i,c)}var i={},o=Bo.dispatch("beforesend","progress","load","error"),a={},c=new XMLHttpRequest,s=null;return!Qo.XDomainRequest||"withCredentials"in c||!/^(http(s)?:)?\/\//.test(n)||(c=new XDomainRequest),"onload"in c?c.onload=c.onerror=u:c.onreadystatechange=function(){c.readyState>3&&u()},c.onprogress=function(n){var t=Bo.event;Bo.event=n;try{o.progress.call(i,c)}finally{Bo.event=t}},i.header=function(n,t){return n=(n+"").toLowerCase(),arguments.length<2?a[n]:(null==t?delete a[n]:a[n]=t+"",i)},i.mimeType=function(n){return arguments.length?(t=null==n?null:n+"",i):t},i.responseType=function(n){return arguments.length?(s=n,i):s},i.response=function(n){return r=n,i},["get","post"].forEach(function(n){i[n]=function(){return i.send.apply(i,[n].concat(Wo(arguments)))}}),i.send=function(r,e,u){if(2===arguments.length&&"function"==typeof e&&(u=e,e=null),c.open(r,n,!0),null==t||"accept"in a||(a.accept=t+",*/*"),c.setRequestHeader)for(var l in a)c.setRequestHeader(l,a[l]);return null!=t&&c.overrideMimeType&&c.overrideMimeType(t),null!=s&&(c.responseType=s),null!=u&&i.on("error",u).on("load",function(n){u(null,n)}),o.beforesend.call(i,c),c.send(null==e?null:e),i},i.abort=function(){return c.abort(),i},Bo.rebind(i,o,"on"),null==e?i:i.get(zt(e))}function zt(n){return 1===n.length?function(t,r){n(null==t?r:null)}:n}function Lt(){var n=Tt(),t=qt()-n;t>24?(isFinite(t)&&(clearTimeout(Wa),Wa=setTimeout(Lt,t)),Ja=0):(Ja=1,Ka(Lt))}function Tt(){var n=Date.now();for(Ga=Xa;Ga;)n>=Ga.t&&(Ga.f=Ga.c(n-Ga.t)),Ga=Ga.n;return n}function qt(){for(var n,t=Xa,r=1/0;t;)t.f?t=n?n.n=t.n:Xa=t.n:(t.t<r&&(r=t.t),t=(n=t).n);return Ba=n,r}function Rt(n,t){return t-(n?Math.ceil(Math.log(n)/Math.LN10):1)}function Dt(n,t){var r=Math.pow(10,3*ca(8-t));return{scale:t>8?function(n){return n/r}:function(n){return n*r},symbol:n}}function Pt(n){var t=n.decimal,r=n.thousands,e=n.grouping,u=n.currency,i=e?function(n){for(var t=n.length,u=[],i=0,o=e[0];t>0&&o>0;)u.push(n.substring(t-=o,t+o)),o=e[i=(i+1)%e.length];return u.reverse().join(r)}:At;return function(n){var r=nc.exec(n),e=r[1]||" ",o=r[2]||">",a=r[3]||"",c=r[4]||"",s=r[5],l=+r[6],f=r[7],h=r[8],g=r[9],p=1,v="",d="",m=!1;switch(h&&(h=+h.substring(1)),(s||"0"===e&&"="===o)&&(s=e="0",o="=",f&&(l-=Math.floor((l-1)/4))),g){case"n":f=!0,g="g";break;case"%":p=100,d="%",g="f";break;case"p":p=100,d="%",g="r";break;case"b":case"o":case"x":case"X":"#"===c&&(v="0"+g.toLowerCase());case"c":case"d":m=!0,h=0;break;case"s":p=-1,g="r"}"$"===c&&(v=u[0],d=u[1]),"r"!=g||h||(g="g"),null!=h&&("g"==g?h=Math.max(1,Math.min(21,h)):("e"==g||"f"==g)&&(h=Math.max(0,Math.min(20,h)))),g=tc.get(g)||Ut;var y=s&&f;return function(n){var r=d;if(m&&n%1)return"";var u=0>n||0===n&&0>1/n?(n=-n,"-"):a;if(0>p){var c=Bo.formatPrefix(n,h);n=c.scale(n),r=c.symbol+d}else n*=p;n=g(n,h);var x=n.lastIndexOf("."),M=0>x?n:n.substring(0,x),_=0>x?"":t+n.substring(x+1);!s&&f&&(M=i(M));var b=v.length+M.length+_.length+(y?0:u.length),w=l>b?new Array(b=l-b+1).join(e):"";return y&&(M=i(w+M)),u+=v,n=M+_,("<"===o?u+n+w:">"===o?w+u+n:"^"===o?w.substring(0,b>>=1)+u+n+w.substring(b):u+(y?n:w+n))+r}}}function Ut(n){return n+""}function jt(){this._=new Date(arguments.length>1?Date.UTC.apply(this,arguments):arguments[0])}function Ht(n,t,r){function e(t){var r=n(t),e=i(r,1);return e-t>t-r?r:e}function u(r){return t(r=n(new ec(r-1)),1),r}function i(n,r){return t(n=new ec(+n),r),n}function o(n,e,i){var o=u(n),a=[];if(i>1)for(;e>o;)r(o)%i||a.push(new Date(+o)),t(o,1);else for(;e>o;)a.push(new Date(+o)),t(o,1);return a}function a(n,t,r){try{ec=jt;var e=new jt;return e._=n,o(e,t,r)}finally{ec=Date}}n.floor=n,n.round=e,n.ceil=u,n.offset=i,n.range=o;var c=n.utc=Ft(n);return c.floor=c,c.round=Ft(e),c.ceil=Ft(u),c.offset=Ft(i),c.range=a,n}function Ft(n){return function(t,r){try{ec=jt;var e=new jt;return e._=t,n(e,r)._}finally{ec=Date}}}function Ot(n){function t(n){function t(t){for(var r,u,i,o=[],a=-1,c=0;++a<e;)37===n.charCodeAt(a)&&(o.push(n.substring(c,a)),null!=(u=ic[r=n.charAt(++a)])&&(r=n.charAt(++a)),(i=C[r])&&(r=i(t,null==u?"e"===r?" ":"0":u)),o.push(r),c=a+1);return o.push(n.substring(c,a)),o.join("")}var e=n.length;return t.parse=function(t){var e={y:1900,m:0,d:1,H:0,M:0,S:0,L:0,Z:null},u=r(e,n,t,0);if(u!=t.length)return null;"p"in e&&(e.H=e.H%12+12*e.p);var i=null!=e.Z&&ec!==jt,o=new(i?jt:ec);return"j"in e?o.setFullYear(e.y,0,e.j):"w"in e&&("W"in e||"U"in e)?(o.setFullYear(e.y,0,1),o.setFullYear(e.y,0,"W"in e?(e.w+6)%7+7*e.W-(o.getDay()+5)%7:e.w+7*e.U-(o.getDay()+6)%7)):o.setFullYear(e.y,e.m,e.d),o.setHours(e.H+Math.floor(e.Z/100),e.M+e.Z%100,e.S,e.L),i?o._:o},t.toString=function(){return n},t}function r(n,t,r,e){for(var u,i,o,a=0,c=t.length,s=r.length;c>a;){if(e>=s)return-1;if(u=t.charCodeAt(a++),37===u){if(o=t.charAt(a++),i=N[o in ic?t.charAt(a++):o],!i||(e=i(n,r,e))<0)return-1}else if(u!=r.charCodeAt(e++))return-1}return e}function e(n,t,r){b.lastIndex=0;var e=b.exec(t.substring(r));return e?(n.w=w.get(e[0].toLowerCase()),r+e[0].length):-1}function u(n,t,r){M.lastIndex=0;var e=M.exec(t.substring(r));return e?(n.w=_.get(e[0].toLowerCase()),r+e[0].length):-1}function i(n,t,r){E.lastIndex=0;var e=E.exec(t.substring(r));return e?(n.m=A.get(e[0].toLowerCase()),r+e[0].length):-1}function o(n,t,r){S.lastIndex=0;var e=S.exec(t.substring(r));return e?(n.m=k.get(e[0].toLowerCase()),r+e[0].length):-1}function a(n,t,e){return r(n,C.c.toString(),t,e)}function c(n,t,e){return r(n,C.x.toString(),t,e)}function s(n,t,e){return r(n,C.X.toString(),t,e)}function l(n,t,r){var e=x.get(t.substring(r,r+=2).toLowerCase());return null==e?-1:(n.p=e,r)}var f=n.dateTime,h=n.date,g=n.time,p=n.periods,v=n.days,d=n.shortDays,m=n.months,y=n.shortMonths;t.utc=function(n){function r(n){try{ec=jt;var t=new ec;return t._=n,e(t)}finally{ec=Date}}var e=t(n);return r.parse=function(n){try{ec=jt;var t=e.parse(n);return t&&t._}finally{ec=Date}},r.toString=e.toString,r},t.multi=t.utc.multi=ar;var x=Bo.map(),M=Yt(v),_=Zt(v),b=Yt(d),w=Zt(d),S=Yt(m),k=Zt(m),E=Yt(y),A=Zt(y);p.forEach(function(n,t){x.set(n.toLowerCase(),t)});var C={a:function(n){return d[n.getDay()]},A:function(n){return v[n.getDay()]},b:function(n){return y[n.getMonth()]},B:function(n){return m[n.getMonth()]},c:t(f),d:function(n,t){return It(n.getDate(),t,2)},e:function(n,t){return It(n.getDate(),t,2)},H:function(n,t){return It(n.getHours(),t,2)},I:function(n,t){return It(n.getHours()%12||12,t,2)},j:function(n,t){return It(1+rc.dayOfYear(n),t,3)},L:function(n,t){return It(n.getMilliseconds(),t,3)},m:function(n,t){return It(n.getMonth()+1,t,2)},M:function(n,t){return It(n.getMinutes(),t,2)},p:function(n){return p[+(n.getHours()>=12)]},S:function(n,t){return It(n.getSeconds(),t,2)},U:function(n,t){return It(rc.sundayOfYear(n),t,2)},w:function(n){return n.getDay()},W:function(n,t){return It(rc.mondayOfYear(n),t,2)},x:t(h),X:t(g),y:function(n,t){return It(n.getFullYear()%100,t,2)},Y:function(n,t){return It(n.getFullYear()%1e4,t,4)},Z:ir,"%":function(){return"%"}},N={a:e,A:u,b:i,B:o,c:a,d:Qt,e:Qt,H:tr,I:tr,j:nr,L:ur,m:Kt,M:rr,p:l,S:er,U:$t,w:Vt,W:Xt,x:c,X:s,y:Jt,Y:Bt,Z:Wt,"%":or};return t}function It(n,t,r){var e=0>n?"-":"",u=(e?-n:n)+"",i=u.length;return e+(r>i?new Array(r-i+1).join(t)+u:u)}function Yt(n){return new RegExp("^(?:"+n.map(Bo.requote).join("|")+")","i")}function Zt(n){for(var t=new o,r=-1,e=n.length;++r<e;)t.set(n[r].toLowerCase(),r);return t}function Vt(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r,r+1));return e?(n.w=+e[0],r+e[0].length):-1}function $t(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r));return e?(n.U=+e[0],r+e[0].length):-1}function Xt(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r));return e?(n.W=+e[0],r+e[0].length):-1}function Bt(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r,r+4));return e?(n.y=+e[0],r+e[0].length):-1}function Jt(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r,r+2));return e?(n.y=Gt(+e[0]),r+e[0].length):-1}function Wt(n,t,r){return/^[+-]\d{4}$/.test(t=t.substring(r,r+5))?(n.Z=-t,r+5):-1}function Gt(n){return n+(n>68?1900:2e3)}function Kt(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r,r+2));return e?(n.m=e[0]-1,r+e[0].length):-1}function Qt(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r,r+2));return e?(n.d=+e[0],r+e[0].length):-1}function nr(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r,r+3));return e?(n.j=+e[0],r+e[0].length):-1}function tr(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r,r+2));return e?(n.H=+e[0],r+e[0].length):-1}function rr(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r,r+2));return e?(n.M=+e[0],r+e[0].length):-1}function er(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r,r+2));return e?(n.S=+e[0],r+e[0].length):-1}function ur(n,t,r){oc.lastIndex=0;var e=oc.exec(t.substring(r,r+3));return e?(n.L=+e[0],r+e[0].length):-1}function ir(n){var t=n.getTimezoneOffset(),r=t>0?"-":"+",e=~~(ca(t)/60),u=ca(t)%60;return r+It(e,"0",2)+It(u,"0",2)}function or(n,t,r){ac.lastIndex=0;var e=ac.exec(t.substring(r,r+1));return e?r+e[0].length:-1}function ar(n){for(var t=n.length,r=-1;++r<t;)n[r][0]=this(n[r][0]);return function(t){for(var r=0,e=n[r];!e[1](t);)e=n[++r];return e[0](t)}}function cr(){}function sr(n,t,r){var e=r.s=n+t,u=e-n,i=e-u;r.t=n-i+(t-u)}function lr(n,t){n&&fc.hasOwnProperty(n.type)&&fc[n.type](n,t)}function fr(n,t,r){var e,u=-1,i=n.length-r;for(t.lineStart();++u<i;)e=n[u],t.point(e[0],e[1],e[2]);t.lineEnd()}function hr(n,t){var r=-1,e=n.length;for(t.polygonStart();++r<e;)fr(n[r],t,1);t.polygonEnd()}function gr(){function n(n,t){n*=za,t=t*za/2+ka/4;var r=n-e,o=r>=0?1:-1,a=o*r,c=Math.cos(t),s=Math.sin(t),l=i*s,f=u*c+l*Math.cos(a),h=l*o*Math.sin(a);gc.add(Math.atan2(h,f)),e=n,u=c,i=s}var t,r,e,u,i;pc.point=function(o,a){pc.point=n,e=(t=o)*za,u=Math.cos(a=(r=a)*za/2+ka/4),i=Math.sin(a)},pc.lineEnd=function(){n(t,r)}}function pr(n){var t=n[0],r=n[1],e=Math.cos(r);return[e*Math.cos(t),e*Math.sin(t),Math.sin(r)]}function vr(n,t){return n[0]*t[0]+n[1]*t[1]+n[2]*t[2]}function dr(n,t){return[n[1]*t[2]-n[2]*t[1],n[2]*t[0]-n[0]*t[2],n[0]*t[1]-n[1]*t[0]]}function mr(n,t){n[0]+=t[0],n[1]+=t[1],n[2]+=t[2]}function yr(n,t){return[n[0]*t,n[1]*t,n[2]*t]}function xr(n){var t=Math.sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2]);n[0]/=t,n[1]/=t,n[2]/=t}function Mr(n){return[Math.atan2(n[1],n[0]),G(n[2])]}function _r(n,t){return ca(n[0]-t[0])<Ca&&ca(n[1]-t[1])<Ca}function br(n,t){n*=za;var r=Math.cos(t*=za);wr(r*Math.cos(n),r*Math.sin(n),Math.sin(t))}function wr(n,t,r){++vc,mc+=(n-mc)/vc,yc+=(t-yc)/vc,xc+=(r-xc)/vc}function Sr(){function n(n,u){n*=za;var i=Math.cos(u*=za),o=i*Math.cos(n),a=i*Math.sin(n),c=Math.sin(u),s=Math.atan2(Math.sqrt((s=r*c-e*a)*s+(s=e*o-t*c)*s+(s=t*a-r*o)*s),t*o+r*a+e*c);dc+=s,Mc+=s*(t+(t=o)),_c+=s*(r+(r=a)),bc+=s*(e+(e=c)),wr(t,r,e)}var t,r,e;Ec.point=function(u,i){u*=za;var o=Math.cos(i*=za);t=o*Math.cos(u),r=o*Math.sin(u),e=Math.sin(i),Ec.point=n,wr(t,r,e)}}function kr(){Ec.point=br}function Er(){function n(n,t){n*=za;var r=Math.cos(t*=za),o=r*Math.cos(n),a=r*Math.sin(n),c=Math.sin(t),s=u*c-i*a,l=i*o-e*c,f=e*a-u*o,h=Math.sqrt(s*s+l*l+f*f),g=e*o+u*a+i*c,p=h&&-W(g)/h,v=Math.atan2(h,g);wc+=p*s,Sc+=p*l,kc+=p*f,dc+=v,Mc+=v*(e+(e=o)),_c+=v*(u+(u=a)),bc+=v*(i+(i=c)),wr(e,u,i)}var t,r,e,u,i;Ec.point=function(o,a){t=o,r=a,Ec.point=n,o*=za;var c=Math.cos(a*=za);e=c*Math.cos(o),u=c*Math.sin(o),i=Math.sin(a),wr(e,u,i)},Ec.lineEnd=function(){n(t,r),Ec.lineEnd=kr,Ec.point=br}}function Ar(){return!0}function Cr(n,t,r,e,u){var i=[],o=[];if(n.forEach(function(n){if(!((t=n.length-1)<=0)){var t,r=n[0],e=n[t];if(_r(r,e)){u.lineStart();for(var a=0;t>a;++a)u.point((r=n[a])[0],r[1]);return u.lineEnd(),void 0}var c=new zr(r,n,null,!0),s=new zr(r,null,c,!1);c.o=s,i.push(c),o.push(s),c=new zr(e,n,null,!1),s=new zr(e,null,c,!0),c.o=s,i.push(c),o.push(s)}}),o.sort(t),Nr(i),Nr(o),i.length){for(var a=0,c=r,s=o.length;s>a;++a)o[a].e=c=!c;for(var l,f,h=i[0];;){for(var g=h,p=!0;g.v;)if((g=g.n)===h)return;l=g.z,u.lineStart();do{if(g.v=g.o.v=!0,g.e){if(p)for(var a=0,s=l.length;s>a;++a)u.point((f=l[a])[0],f[1]);else e(g.x,g.n.x,1,u);g=g.n}else{if(p){l=g.p.z;for(var a=l.length-1;a>=0;--a)u.point((f=l[a])[0],f[1])}else e(g.x,g.p.x,-1,u);g=g.p}g=g.o,l=g.z,p=!p}while(!g.v);u.lineEnd()}}}function Nr(n){if(t=n.length){for(var t,r,e=0,u=n[0];++e<t;)u.n=r=n[e],r.p=u,u=r;u.n=r=n[0],r.p=u}}function zr(n,t,r,e){this.x=n,this.z=t,this.o=r,this.e=e,this.v=!1,this.n=this.p=null}function Lr(n,t,r,e){return function(u,i){function o(t,r){var e=u(t,r);n(t=e[0],r=e[1])&&i.point(t,r)}function a(n,t){var r=u(n,t);d.point(r[0],r[1])}function c(){y.point=a,d.lineStart()}function s(){y.point=o,d.lineEnd()}function l(n,t){v.push([n,t]);var r=u(n,t);M.point(r[0],r[1])}function f(){M.lineStart(),v=[]}function h(){l(v[0][0],v[0][1]),M.lineEnd();var n,t=M.clean(),r=x.buffer(),e=r.length;if(v.pop(),p.push(v),v=null,e)if(1&t){n=r[0];var u,e=n.length-1,o=-1;if(e>0){for(_||(i.polygonStart(),_=!0),i.lineStart();++o<e;)i.point((u=n[o])[0],u[1]);i.lineEnd()}}else e>1&&2&t&&r.push(r.pop().concat(r.shift())),g.push(r.filter(Tr))}var g,p,v,d=t(i),m=u.invert(e[0],e[1]),y={point:o,lineStart:c,lineEnd:s,polygonStart:function(){y.point=l,y.lineStart=f,y.lineEnd=h,g=[],p=[]},polygonEnd:function(){y.point=o,y.lineStart=c,y.lineEnd=s,g=Bo.merge(g);var n=Dr(m,p);g.length?(_||(i.polygonStart(),_=!0),Cr(g,Rr,n,r,i)):n&&(_||(i.polygonStart(),_=!0),i.lineStart(),r(null,null,1,i),i.lineEnd()),_&&(i.polygonEnd(),_=!1),g=p=null},sphere:function(){i.polygonStart(),i.lineStart(),r(null,null,1,i),i.lineEnd(),i.polygonEnd()}},x=qr(),M=t(x),_=!1;return y}}function Tr(n){return n.length>1}function qr(){var n,t=[];return{lineStart:function(){t.push(n=[])},point:function(t,r){n.push([t,r])},lineEnd:v,buffer:function(){var r=t;return t=[],n=null,r},rejoin:function(){t.length>1&&t.push(t.pop().concat(t.shift()))}}}function Rr(n,t){return((n=n.x)[0]<0?n[1]-Aa-Ca:Aa-n[1])-((t=t.x)[0]<0?t[1]-Aa-Ca:Aa-t[1])}function Dr(n,t){var r=n[0],e=n[1],u=[Math.sin(r),-Math.cos(r),0],i=0,o=0;gc.reset();for(var a=0,c=t.length;c>a;++a){var s=t[a],l=s.length;if(l)for(var f=s[0],h=f[0],g=f[1]/2+ka/4,p=Math.sin(g),v=Math.cos(g),d=1;;){d===l&&(d=0),n=s[d];var m=n[0],y=n[1]/2+ka/4,x=Math.sin(y),M=Math.cos(y),_=m-h,b=_>=0?1:-1,w=b*_,S=w>ka,k=p*x;if(gc.add(Math.atan2(k*b*Math.sin(w),v*M+k*Math.cos(w))),i+=S?_+b*Ea:_,S^h>=r^m>=r){var E=dr(pr(f),pr(n));xr(E);var A=dr(u,E);xr(A);var C=(S^_>=0?-1:1)*G(A[2]);(e>C||e===C&&(E[0]||E[1]))&&(o+=S^_>=0?1:-1)}if(!d++)break;h=m,p=x,v=M,f=n}}return(-Ca>i||Ca>i&&0>gc)^1&o}function Pr(n){var t,r=0/0,e=0/0,u=0/0;return{lineStart:function(){n.lineStart(),t=1},point:function(i,o){var a=i>0?ka:-ka,c=ca(i-r);ca(c-ka)<Ca?(n.point(r,e=(e+o)/2>0?Aa:-Aa),n.point(u,e),n.lineEnd(),n.lineStart(),n.point(a,e),n.point(i,e),t=0):u!==a&&c>=ka&&(ca(r-u)<Ca&&(r-=u*Ca),ca(i-a)<Ca&&(i-=a*Ca),e=Ur(r,e,i,o),n.point(u,e),n.lineEnd(),n.lineStart(),n.point(a,e),t=0),n.point(r=i,e=o),u=a},lineEnd:function(){n.lineEnd(),r=e=0/0},clean:function(){return 2-t}}}function Ur(n,t,r,e){var u,i,o=Math.sin(n-r);return ca(o)>Ca?Math.atan((Math.sin(t)*(i=Math.cos(e))*Math.sin(r)-Math.sin(e)*(u=Math.cos(t))*Math.sin(n))/(u*i*o)):(t+e)/2}function jr(n,t,r,e){var u;if(null==n)u=r*Aa,e.point(-ka,u),e.point(0,u),e.point(ka,u),e.point(ka,0),e.point(ka,-u),e.point(0,-u),e.point(-ka,-u),e.point(-ka,0),e.point(-ka,u);else if(ca(n[0]-t[0])>Ca){var i=n[0]<t[0]?ka:-ka;u=r*i/2,e.point(-i,u),e.point(0,u),e.point(i,u)}else e.point(t[0],t[1])}function Hr(n){function t(n,t){return Math.cos(n)*Math.cos(t)>i}function r(n){var r,i,c,s,l;return{lineStart:function(){s=c=!1,l=1},point:function(f,h){var g,p=[f,h],v=t(f,h),d=o?v?0:u(f,h):v?u(f+(0>f?ka:-ka),h):0;if(!r&&(s=c=v)&&n.lineStart(),v!==c&&(g=e(r,p),(_r(r,g)||_r(p,g))&&(p[0]+=Ca,p[1]+=Ca,v=t(p[0],p[1]))),v!==c)l=0,v?(n.lineStart(),g=e(p,r),n.point(g[0],g[1])):(g=e(r,p),n.point(g[0],g[1]),n.lineEnd()),r=g;else if(a&&r&&o^v){var m;d&i||!(m=e(p,r,!0))||(l=0,o?(n.lineStart(),n.point(m[0][0],m[0][1]),n.point(m[1][0],m[1][1]),n.lineEnd()):(n.point(m[1][0],m[1][1]),n.lineEnd(),n.lineStart(),n.point(m[0][0],m[0][1])))}!v||r&&_r(r,p)||n.point(p[0],p[1]),r=p,c=v,i=d},lineEnd:function(){c&&n.lineEnd(),r=null},clean:function(){return l|(s&&c)<<1}}}function e(n,t,r){var e=pr(n),u=pr(t),o=[1,0,0],a=dr(e,u),c=vr(a,a),s=a[0],l=c-s*s;if(!l)return!r&&n;var f=i*c/l,h=-i*s/l,g=dr(o,a),p=yr(o,f),v=yr(a,h);mr(p,v);var d=g,m=vr(p,d),y=vr(d,d),x=m*m-y*(vr(p,p)-1);if(!(0>x)){var M=Math.sqrt(x),_=yr(d,(-m-M)/y);if(mr(_,p),_=Mr(_),!r)return _;var b,w=n[0],S=t[0],k=n[1],E=t[1];w>S&&(b=w,w=S,S=b);var A=S-w,C=ca(A-ka)<Ca,N=C||Ca>A;if(!C&&k>E&&(b=k,k=E,E=b),N?C?k+E>0^_[1]<(ca(_[0]-w)<Ca?k:E):k<=_[1]&&_[1]<=E:A>ka^(w<=_[0]&&_[0]<=S)){var z=yr(d,(-m+M)/y);return mr(z,p),[_,Mr(z)]}}}function u(t,r){var e=o?n:ka-n,u=0;return-e>t?u|=1:t>e&&(u|=2),-e>r?u|=4:r>e&&(u|=8),u}var i=Math.cos(n),o=i>0,a=ca(i)>Ca,c=ge(n,6*za);return Lr(t,r,c,o?[0,-n]:[-ka,n-ka])}function Fr(n,t,r,e){return function(u){var i,o=u.a,a=u.b,c=o.x,s=o.y,l=a.x,f=a.y,h=0,g=1,p=l-c,v=f-s;if(i=n-c,p||!(i>0)){if(i/=p,0>p){if(h>i)return;g>i&&(g=i)}else if(p>0){if(i>g)return;i>h&&(h=i)}if(i=r-c,p||!(0>i)){if(i/=p,0>p){if(i>g)return;i>h&&(h=i)}else if(p>0){if(h>i)return;g>i&&(g=i)}if(i=t-s,v||!(i>0)){if(i/=v,0>v){if(h>i)return;g>i&&(g=i)}else if(v>0){if(i>g)return;i>h&&(h=i)}if(i=e-s,v||!(0>i)){if(i/=v,0>v){if(i>g)return;i>h&&(h=i)}else if(v>0){if(h>i)return;g>i&&(g=i)}return h>0&&(u.a={x:c+h*p,y:s+h*v}),1>g&&(u.b={x:c+g*p,y:s+g*v}),u}}}}}}function Or(n,t,r,e){function u(e,u){return ca(e[0]-n)<Ca?u>0?0:3:ca(e[0]-r)<Ca?u>0?2:1:ca(e[1]-t)<Ca?u>0?1:0:u>0?3:2}function i(n,t){return o(n.x,t.x)}function o(n,t){var r=u(n,1),e=u(t,1);return r!==e?r-e:0===r?t[1]-n[1]:1===r?n[0]-t[0]:2===r?n[1]-t[1]:t[0]-n[0]}return function(a){function c(n){for(var t=0,r=d.length,e=n[1],u=0;r>u;++u)for(var i,o=1,a=d[u],c=a.length,s=a[0];c>o;++o)i=a[o],s[1]<=e?i[1]>e&&J(s,i,n)>0&&++t:i[1]<=e&&J(s,i,n)<0&&--t,s=i;return 0!==t}function s(i,a,c,s){var l=0,f=0;if(null==i||(l=u(i,c))!==(f=u(a,c))||o(i,a)<0^c>0){do s.point(0===l||3===l?n:r,l>1?e:t);while((l=(l+c+4)%4)!==f)}else s.point(a[0],a[1])}function l(u,i){return u>=n&&r>=u&&i>=t&&e>=i}function f(n,t){l(n,t)&&a.point(n,t)}function h(){N.point=p,d&&d.push(m=[]),S=!0,w=!1,_=b=0/0}function g(){v&&(p(y,x),M&&w&&A.rejoin(),v.push(A.buffer())),N.point=f,w&&a.lineEnd()}function p(n,t){n=Math.max(-Cc,Math.min(Cc,n)),t=Math.max(-Cc,Math.min(Cc,t));var r=l(n,t);if(d&&m.push([n,t]),S)y=n,x=t,M=r,S=!1,r&&(a.lineStart(),a.point(n,t));else if(r&&w)a.point(n,t);else{var e={a:{x:_,y:b},b:{x:n,y:t}};C(e)?(w||(a.lineStart(),a.point(e.a.x,e.a.y)),a.point(e.b.x,e.b.y),r||a.lineEnd(),k=!1):r&&(a.lineStart(),a.point(n,t),k=!1)}_=n,b=t,w=r}var v,d,m,y,x,M,_,b,w,S,k,E=a,A=qr(),C=Fr(n,t,r,e),N={point:f,lineStart:h,lineEnd:g,polygonStart:function(){a=A,v=[],d=[],k=!0},polygonEnd:function(){a=E,v=Bo.merge(v);var t=c([n,e]),r=k&&t,u=v.length;(r||u)&&(a.polygonStart(),r&&(a.lineStart(),s(null,null,1,a),a.lineEnd()),u&&Cr(v,i,t,s,a),a.polygonEnd()),v=d=m=null}};return N}}function Ir(n,t){function r(r,e){return r=n(r,e),t(r[0],r[1])}return n.invert&&t.invert&&(r.invert=function(r,e){return r=t.invert(r,e),r&&n.invert(r[0],r[1])}),r}function Yr(n){var t=0,r=ka/3,e=ie(n),u=e(t,r);return u.parallels=function(n){return arguments.length?e(t=n[0]*ka/180,r=n[1]*ka/180):[180*(t/ka),180*(r/ka)]},u}function Zr(n,t){function r(n,t){var r=Math.sqrt(i-2*u*Math.sin(t))/u;return[r*Math.sin(n*=u),o-r*Math.cos(n)]}var e=Math.sin(n),u=(e+Math.sin(t))/2,i=1+e*(2*u-e),o=Math.sqrt(i)/u;return r.invert=function(n,t){var r=o-t;return[Math.atan2(n,r)/u,G((i-(n*n+r*r)*u*u)/(2*u))]},r}function Vr(){function n(n,t){zc+=u*n-e*t,e=n,u=t}var t,r,e,u;Dc.point=function(i,o){Dc.point=n,t=e=i,r=u=o},Dc.lineEnd=function(){n(t,r)}}function $r(n,t){Lc>n&&(Lc=n),n>qc&&(qc=n),Tc>t&&(Tc=t),t>Rc&&(Rc=t)}function Xr(){function n(n,t){o.push("M",n,",",t,i)}function t(n,t){o.push("M",n,",",t),a.point=r}function r(n,t){o.push("L",n,",",t)}function e(){a.point=n}function u(){o.push("Z")}var i=Br(4.5),o=[],a={point:n,lineStart:function(){a.point=t},lineEnd:e,polygonStart:function(){a.lineEnd=u},polygonEnd:function(){a.lineEnd=e,a.point=n},pointRadius:function(n){return i=Br(n),a},result:function(){if(o.length){var n=o.join("");return o=[],n}}};return a}function Br(n){return"m0,"+n+"a"+n+","+n+" 0 1,1 0,"+-2*n+"a"+n+","+n+" 0 1,1 0,"+2*n+"z"}function Jr(n,t){mc+=n,yc+=t,++xc}function Wr(){function n(n,e){var u=n-t,i=e-r,o=Math.sqrt(u*u+i*i);Mc+=o*(t+n)/2,_c+=o*(r+e)/2,bc+=o,Jr(t=n,r=e)}var t,r;Uc.point=function(e,u){Uc.point=n,Jr(t=e,r=u)}}function Gr(){Uc.point=Jr}function Kr(){function n(n,t){var r=n-e,i=t-u,o=Math.sqrt(r*r+i*i);Mc+=o*(e+n)/2,_c+=o*(u+t)/2,bc+=o,o=u*n-e*t,wc+=o*(e+n),Sc+=o*(u+t),kc+=3*o,Jr(e=n,u=t)}var t,r,e,u;Uc.point=function(i,o){Uc.point=n,Jr(t=e=i,r=u=o)},Uc.lineEnd=function(){n(t,r)}}function Qr(n){function t(t,r){n.moveTo(t,r),n.arc(t,r,o,0,Ea)}function r(t,r){n.moveTo(t,r),a.point=e}function e(t,r){n.lineTo(t,r)}function u(){a.point=t}function i(){n.closePath()}var o=4.5,a={point:t,lineStart:function(){a.point=r},lineEnd:u,polygonStart:function(){a.lineEnd=i},polygonEnd:function(){a.lineEnd=u,a.point=t},pointRadius:function(n){return o=n,a},result:v};return a}function ne(n){function t(n){return(a?e:r)(n)}function r(t){return ee(t,function(r,e){r=n(r,e),t.point(r[0],r[1])})}function e(t){function r(r,e){r=n(r,e),t.point(r[0],r[1])}function e(){x=0/0,S.point=i,t.lineStart()}function i(r,e){var i=pr([r,e]),o=n(r,e);u(x,M,y,_,b,w,x=o[0],M=o[1],y=r,_=i[0],b=i[1],w=i[2],a,t),t.point(x,M)}function o(){S.point=r,t.lineEnd()}function c(){e(),S.point=s,S.lineEnd=l}function s(n,t){i(f=n,h=t),g=x,p=M,v=_,d=b,m=w,S.point=i}function l(){u(x,M,y,_,b,w,g,p,f,v,d,m,a,t),S.lineEnd=o,o()}var f,h,g,p,v,d,m,y,x,M,_,b,w,S={point:r,lineStart:e,lineEnd:o,polygonStart:function(){t.polygonStart(),S.lineStart=c},polygonEnd:function(){t.polygonEnd(),S.lineStart=e}};return S}function u(t,r,e,a,c,s,l,f,h,g,p,v,d,m){var y=l-t,x=f-r,M=y*y+x*x;if(M>4*i&&d--){var _=a+g,b=c+p,w=s+v,S=Math.sqrt(_*_+b*b+w*w),k=Math.asin(w/=S),E=ca(ca(w)-1)<Ca||ca(e-h)<Ca?(e+h)/2:Math.atan2(b,_),A=n(E,k),C=A[0],N=A[1],z=C-t,L=N-r,T=x*z-y*L;(T*T/M>i||ca((y*z+x*L)/M-.5)>.3||o>a*g+c*p+s*v)&&(u(t,r,e,a,c,s,C,N,E,_/=S,b/=S,w,d,m),m.point(C,N),u(C,N,E,_,b,w,l,f,h,g,p,v,d,m))}}var i=.5,o=Math.cos(30*za),a=16;return t.precision=function(n){return arguments.length?(a=(i=n*n)>0&&16,t):Math.sqrt(i)},t}function te(n){var t=ne(function(t,r){return n([t*La,r*La])});return function(n){return oe(t(n))}}function re(n){this.stream=n}function ee(n,t){return{point:t,sphere:function(){n.sphere()},lineStart:function(){n.lineStart()},lineEnd:function(){n.lineEnd()},polygonStart:function(){n.polygonStart()},polygonEnd:function(){n.polygonEnd()}}}function ue(n){return ie(function(){return n})()}function ie(n){function t(n){return n=a(n[0]*za,n[1]*za),[n[0]*h+c,s-n[1]*h]}function r(n){return n=a.invert((n[0]-c)/h,(s-n[1])/h),n&&[n[0]*La,n[1]*La]}function e(){a=Ir(o=se(m,y,x),i);var n=i(v,d);return c=g-n[0]*h,s=p+n[1]*h,u()
}function u(){return l&&(l.valid=!1,l=null),t}var i,o,a,c,s,l,f=ne(function(n,t){return n=i(n,t),[n[0]*h+c,s-n[1]*h]}),h=150,g=480,p=250,v=0,d=0,m=0,y=0,x=0,M=Ac,_=At,b=null,w=null;return t.stream=function(n){return l&&(l.valid=!1),l=oe(M(o,f(_(n)))),l.valid=!0,l},t.clipAngle=function(n){return arguments.length?(M=null==n?(b=n,Ac):Hr((b=+n)*za),u()):b},t.clipExtent=function(n){return arguments.length?(w=n,_=n?Or(n[0][0],n[0][1],n[1][0],n[1][1]):At,u()):w},t.scale=function(n){return arguments.length?(h=+n,e()):h},t.translate=function(n){return arguments.length?(g=+n[0],p=+n[1],e()):[g,p]},t.center=function(n){return arguments.length?(v=n[0]%360*za,d=n[1]%360*za,e()):[v*La,d*La]},t.rotate=function(n){return arguments.length?(m=n[0]%360*za,y=n[1]%360*za,x=n.length>2?n[2]%360*za:0,e()):[m*La,y*La,x*La]},Bo.rebind(t,f,"precision"),function(){return i=n.apply(this,arguments),t.invert=i.invert&&r,e()}}function oe(n){return ee(n,function(t,r){n.point(t*za,r*za)})}function ae(n,t){return[n,t]}function ce(n,t){return[n>ka?n-Ea:-ka>n?n+Ea:n,t]}function se(n,t,r){return n?t||r?Ir(fe(n),he(t,r)):fe(n):t||r?he(t,r):ce}function le(n){return function(t,r){return t+=n,[t>ka?t-Ea:-ka>t?t+Ea:t,r]}}function fe(n){var t=le(n);return t.invert=le(-n),t}function he(n,t){function r(n,t){var r=Math.cos(t),a=Math.cos(n)*r,c=Math.sin(n)*r,s=Math.sin(t),l=s*e+a*u;return[Math.atan2(c*i-l*o,a*e-s*u),G(l*i+c*o)]}var e=Math.cos(n),u=Math.sin(n),i=Math.cos(t),o=Math.sin(t);return r.invert=function(n,t){var r=Math.cos(t),a=Math.cos(n)*r,c=Math.sin(n)*r,s=Math.sin(t),l=s*i-c*o;return[Math.atan2(c*i+s*o,a*e+l*u),G(l*e-a*u)]},r}function ge(n,t){var r=Math.cos(n),e=Math.sin(n);return function(u,i,o,a){var c=o*t;null!=u?(u=pe(r,u),i=pe(r,i),(o>0?i>u:u>i)&&(u+=o*Ea)):(u=n+o*Ea,i=n-.5*c);for(var s,l=u;o>0?l>i:i>l;l-=c)a.point((s=Mr([r,-e*Math.cos(l),-e*Math.sin(l)]))[0],s[1])}}function pe(n,t){var r=pr(t);r[0]-=n,xr(r);var e=W(-r[1]);return((-r[2]<0?-e:e)+2*Math.PI-Ca)%(2*Math.PI)}function ve(n,t,r){var e=Bo.range(n,t-Ca,r).concat(t);return function(n){return e.map(function(t){return[n,t]})}}function de(n,t,r){var e=Bo.range(n,t-Ca,r).concat(t);return function(n){return e.map(function(t){return[t,n]})}}function me(n){return n.source}function ye(n){return n.target}function xe(n,t,r,e){var u=Math.cos(t),i=Math.sin(t),o=Math.cos(e),a=Math.sin(e),c=u*Math.cos(n),s=u*Math.sin(n),l=o*Math.cos(r),f=o*Math.sin(r),h=2*Math.asin(Math.sqrt(tt(e-t)+u*o*tt(r-n))),g=1/Math.sin(h),p=h?function(n){var t=Math.sin(n*=h)*g,r=Math.sin(h-n)*g,e=r*c+t*l,u=r*s+t*f,o=r*i+t*a;return[Math.atan2(u,e)*La,Math.atan2(o,Math.sqrt(e*e+u*u))*La]}:function(){return[n*La,t*La]};return p.distance=h,p}function Me(){function n(n,u){var i=Math.sin(u*=za),o=Math.cos(u),a=ca((n*=za)-t),c=Math.cos(a);jc+=Math.atan2(Math.sqrt((a=o*Math.sin(a))*a+(a=e*i-r*o*c)*a),r*i+e*o*c),t=n,r=i,e=o}var t,r,e;Hc.point=function(u,i){t=u*za,r=Math.sin(i*=za),e=Math.cos(i),Hc.point=n},Hc.lineEnd=function(){Hc.point=Hc.lineEnd=v}}function _e(n,t){function r(t,r){var e=Math.cos(t),u=Math.cos(r),i=n(e*u);return[i*u*Math.sin(t),i*Math.sin(r)]}return r.invert=function(n,r){var e=Math.sqrt(n*n+r*r),u=t(e),i=Math.sin(u),o=Math.cos(u);return[Math.atan2(n*i,e*o),Math.asin(e&&r*i/e)]},r}function be(n,t){function r(n,t){o>0?-Aa+Ca>t&&(t=-Aa+Ca):t>Aa-Ca&&(t=Aa-Ca);var r=o/Math.pow(u(t),i);return[r*Math.sin(i*n),o-r*Math.cos(i*n)]}var e=Math.cos(n),u=function(n){return Math.tan(ka/4+n/2)},i=n===t?Math.sin(n):Math.log(e/Math.cos(t))/Math.log(u(t)/u(n)),o=e*Math.pow(u(n),i)/i;return i?(r.invert=function(n,t){var r=o-t,e=B(i)*Math.sqrt(n*n+r*r);return[Math.atan2(n,r)/i,2*Math.atan(Math.pow(o/e,1/i))-Aa]},r):Se}function we(n,t){function r(n,t){var r=i-t;return[r*Math.sin(u*n),i-r*Math.cos(u*n)]}var e=Math.cos(n),u=n===t?Math.sin(n):(e-Math.cos(t))/(t-n),i=e/u+n;return ca(u)<Ca?ae:(r.invert=function(n,t){var r=i-t;return[Math.atan2(n,r)/u,i-B(u)*Math.sqrt(n*n+r*r)]},r)}function Se(n,t){return[n,Math.log(Math.tan(ka/4+t/2))]}function ke(n){var t,r=ue(n),e=r.scale,u=r.translate,i=r.clipExtent;return r.scale=function(){var n=e.apply(r,arguments);return n===r?t?r.clipExtent(null):r:n},r.translate=function(){var n=u.apply(r,arguments);return n===r?t?r.clipExtent(null):r:n},r.clipExtent=function(n){var o=i.apply(r,arguments);if(o===r){if(t=null==n){var a=ka*e(),c=u();i([[c[0]-a,c[1]-a],[c[0]+a,c[1]+a]])}}else t&&(o=null);return o},r.clipExtent(null)}function Ee(n,t){return[Math.log(Math.tan(ka/4+t/2)),-n]}function Ae(n){return n[0]}function Ce(n){return n[1]}function Ne(n){for(var t=n.length,r=[0,1],e=2,u=2;t>u;u++){for(;e>1&&J(n[r[e-2]],n[r[e-1]],n[u])<=0;)--e;r[e++]=u}return r.slice(0,e)}function ze(n,t){return n[0]-t[0]||n[1]-t[1]}function Le(n,t,r){return(r[0]-t[0])*(n[1]-t[1])<(r[1]-t[1])*(n[0]-t[0])}function Te(n,t,r,e){var u=n[0],i=r[0],o=t[0]-u,a=e[0]-i,c=n[1],s=r[1],l=t[1]-c,f=e[1]-s,h=(a*(c-s)-f*(u-i))/(f*o-a*l);return[u+h*o,c+h*l]}function qe(n){var t=n[0],r=n[n.length-1];return!(t[0]-r[0]||t[1]-r[1])}function Re(){tu(this),this.edge=this.site=this.circle=null}function De(n){var t=Gc.pop()||new Re;return t.site=n,t}function Pe(n){$e(n),Bc.remove(n),Gc.push(n),tu(n)}function Ue(n){var t=n.circle,r=t.x,e=t.cy,u={x:r,y:e},i=n.P,o=n.N,a=[n];Pe(n);for(var c=i;c.circle&&ca(r-c.circle.x)<Ca&&ca(e-c.circle.cy)<Ca;)i=c.P,a.unshift(c),Pe(c),c=i;a.unshift(c),$e(c);for(var s=o;s.circle&&ca(r-s.circle.x)<Ca&&ca(e-s.circle.cy)<Ca;)o=s.N,a.push(s),Pe(s),s=o;a.push(s),$e(s);var l,f=a.length;for(l=1;f>l;++l)s=a[l],c=a[l-1],Ke(s.edge,c.site,s.site,u);c=a[0],s=a[f-1],s.edge=We(c.site,s.site,null,u),Ve(c),Ve(s)}function je(n){for(var t,r,e,u,i=n.x,o=n.y,a=Bc._;a;)if(e=He(a,o)-i,e>Ca)a=a.L;else{if(u=i-Fe(a,o),!(u>Ca)){e>-Ca?(t=a.P,r=a):u>-Ca?(t=a,r=a.N):t=r=a;break}if(!a.R){t=a;break}a=a.R}var c=De(n);if(Bc.insert(t,c),t||r){if(t===r)return $e(t),r=De(t.site),Bc.insert(c,r),c.edge=r.edge=We(t.site,c.site),Ve(t),Ve(r),void 0;if(!r)return c.edge=We(t.site,c.site),void 0;$e(t),$e(r);var s=t.site,l=s.x,f=s.y,h=n.x-l,g=n.y-f,p=r.site,v=p.x-l,d=p.y-f,m=2*(h*d-g*v),y=h*h+g*g,x=v*v+d*d,M={x:(d*y-g*x)/m+l,y:(h*x-v*y)/m+f};Ke(r.edge,s,p,M),c.edge=We(s,n,null,M),r.edge=We(n,p,null,M),Ve(t),Ve(r)}}function He(n,t){var r=n.site,e=r.x,u=r.y,i=u-t;if(!i)return e;var o=n.P;if(!o)return-1/0;r=o.site;var a=r.x,c=r.y,s=c-t;if(!s)return a;var l=a-e,f=1/i-1/s,h=l/s;return f?(-h+Math.sqrt(h*h-2*f*(l*l/(-2*s)-c+s/2+u-i/2)))/f+e:(e+a)/2}function Fe(n,t){var r=n.N;if(r)return He(r,t);var e=n.site;return e.y===t?e.x:1/0}function Oe(n){this.site=n,this.edges=[]}function Ie(n){for(var t,r,e,u,i,o,a,c,s,l,f=n[0][0],h=n[1][0],g=n[0][1],p=n[1][1],v=Xc,d=v.length;d--;)if(i=v[d],i&&i.prepare())for(a=i.edges,c=a.length,o=0;c>o;)l=a[o].end(),e=l.x,u=l.y,s=a[++o%c].start(),t=s.x,r=s.y,(ca(e-t)>Ca||ca(u-r)>Ca)&&(a.splice(o,0,new Qe(Ge(i.site,l,ca(e-f)<Ca&&p-u>Ca?{x:f,y:ca(t-f)<Ca?r:p}:ca(u-p)<Ca&&h-e>Ca?{x:ca(r-p)<Ca?t:h,y:p}:ca(e-h)<Ca&&u-g>Ca?{x:h,y:ca(t-h)<Ca?r:g}:ca(u-g)<Ca&&e-f>Ca?{x:ca(r-g)<Ca?t:f,y:g}:null),i.site,null)),++c)}function Ye(n,t){return t.angle-n.angle}function Ze(){tu(this),this.x=this.y=this.arc=this.site=this.cy=null}function Ve(n){var t=n.P,r=n.N;if(t&&r){var e=t.site,u=n.site,i=r.site;if(e!==i){var o=u.x,a=u.y,c=e.x-o,s=e.y-a,l=i.x-o,f=i.y-a,h=2*(c*f-s*l);if(!(h>=-Na)){var g=c*c+s*s,p=l*l+f*f,v=(f*g-s*p)/h,d=(c*p-l*g)/h,f=d+a,m=Kc.pop()||new Ze;m.arc=n,m.site=u,m.x=v+o,m.y=f+Math.sqrt(v*v+d*d),m.cy=f,n.circle=m;for(var y=null,x=Wc._;x;)if(m.y<x.y||m.y===x.y&&m.x<=x.x){if(!x.L){y=x.P;break}x=x.L}else{if(!x.R){y=x;break}x=x.R}Wc.insert(y,m),y||(Jc=m)}}}}function $e(n){var t=n.circle;t&&(t.P||(Jc=t.N),Wc.remove(t),Kc.push(t),tu(t),n.circle=null)}function Xe(n){for(var t,r=$c,e=Fr(n[0][0],n[0][1],n[1][0],n[1][1]),u=r.length;u--;)t=r[u],(!Be(t,n)||!e(t)||ca(t.a.x-t.b.x)<Ca&&ca(t.a.y-t.b.y)<Ca)&&(t.a=t.b=null,r.splice(u,1))}function Be(n,t){var r=n.b;if(r)return!0;var e,u,i=n.a,o=t[0][0],a=t[1][0],c=t[0][1],s=t[1][1],l=n.l,f=n.r,h=l.x,g=l.y,p=f.x,v=f.y,d=(h+p)/2,m=(g+v)/2;if(v===g){if(o>d||d>=a)return;if(h>p){if(i){if(i.y>=s)return}else i={x:d,y:c};r={x:d,y:s}}else{if(i){if(i.y<c)return}else i={x:d,y:s};r={x:d,y:c}}}else if(e=(h-p)/(v-g),u=m-e*d,-1>e||e>1)if(h>p){if(i){if(i.y>=s)return}else i={x:(c-u)/e,y:c};r={x:(s-u)/e,y:s}}else{if(i){if(i.y<c)return}else i={x:(s-u)/e,y:s};r={x:(c-u)/e,y:c}}else if(v>g){if(i){if(i.x>=a)return}else i={x:o,y:e*o+u};r={x:a,y:e*a+u}}else{if(i){if(i.x<o)return}else i={x:a,y:e*a+u};r={x:o,y:e*o+u}}return n.a=i,n.b=r,!0}function Je(n,t){this.l=n,this.r=t,this.a=this.b=null}function We(n,t,r,e){var u=new Je(n,t);return $c.push(u),r&&Ke(u,n,t,r),e&&Ke(u,t,n,e),Xc[n.i].edges.push(new Qe(u,n,t)),Xc[t.i].edges.push(new Qe(u,t,n)),u}function Ge(n,t,r){var e=new Je(n,null);return e.a=t,e.b=r,$c.push(e),e}function Ke(n,t,r,e){n.a||n.b?n.l===r?n.b=e:n.a=e:(n.a=e,n.l=t,n.r=r)}function Qe(n,t,r){var e=n.a,u=n.b;this.edge=n,this.site=t,this.angle=r?Math.atan2(r.y-t.y,r.x-t.x):n.l===t?Math.atan2(u.x-e.x,e.y-u.y):Math.atan2(e.x-u.x,u.y-e.y)}function nu(){this._=null}function tu(n){n.U=n.C=n.L=n.R=n.P=n.N=null}function ru(n,t){var r=t,e=t.R,u=r.U;u?u.L===r?u.L=e:u.R=e:n._=e,e.U=u,r.U=e,r.R=e.L,r.R&&(r.R.U=r),e.L=r}function eu(n,t){var r=t,e=t.L,u=r.U;u?u.L===r?u.L=e:u.R=e:n._=e,e.U=u,r.U=e,r.L=e.R,r.L&&(r.L.U=r),e.R=r}function uu(n){for(;n.L;)n=n.L;return n}function iu(n,t){var r,e,u,i=n.sort(ou).pop();for($c=[],Xc=new Array(n.length),Bc=new nu,Wc=new nu;;)if(u=Jc,i&&(!u||i.y<u.y||i.y===u.y&&i.x<u.x))(i.x!==r||i.y!==e)&&(Xc[i.i]=new Oe(i),je(i),r=i.x,e=i.y),i=n.pop();else{if(!u)break;Ue(u.arc)}t&&(Xe(t),Ie(t));var o={cells:Xc,edges:$c};return Bc=Wc=$c=Xc=null,o}function ou(n,t){return t.y-n.y||t.x-n.x}function au(n,t,r){return(n.x-r.x)*(t.y-n.y)-(n.x-t.x)*(r.y-n.y)}function cu(n){return n.x}function su(n){return n.y}function lu(){return{leaf:!0,nodes:[],point:null,x:null,y:null}}function fu(n,t,r,e,u,i){if(!n(t,r,e,u,i)){var o=.5*(r+u),a=.5*(e+i),c=t.nodes;c[0]&&fu(n,c[0],r,e,o,a),c[1]&&fu(n,c[1],o,e,u,a),c[2]&&fu(n,c[2],r,a,o,i),c[3]&&fu(n,c[3],o,a,u,i)}}function hu(n,t){n=Bo.rgb(n),t=Bo.rgb(t);var r=n.r,e=n.g,u=n.b,i=t.r-r,o=t.g-e,a=t.b-u;return function(n){return"#"+Mt(Math.round(r+i*n))+Mt(Math.round(e+o*n))+Mt(Math.round(u+a*n))}}function gu(n,t){var r,e={},u={};for(r in n)r in t?e[r]=du(n[r],t[r]):u[r]=n[r];for(r in t)r in n||(u[r]=t[r]);return function(n){for(r in e)u[r]=e[r](n);return u}}function pu(n,t){return t-=n=+n,function(r){return n+t*r}}function vu(n,t){var r,e,u,i=ns.lastIndex=ts.lastIndex=0,o=-1,a=[],c=[];for(n+="",t+="";(r=ns.exec(n))&&(e=ts.exec(t));)(u=e.index)>i&&(u=t.substring(i,u),a[o]?a[o]+=u:a[++o]=u),(r=r[0])===(e=e[0])?a[o]?a[o]+=e:a[++o]=e:(a[++o]=null,c.push({i:o,x:pu(r,e)})),i=ts.lastIndex;return i<t.length&&(u=t.substring(i),a[o]?a[o]+=u:a[++o]=u),a.length<2?c[0]?(t=c[0].x,function(n){return t(n)+""}):function(){return t}:(t=c.length,function(n){for(var r,e=0;t>e;++e)a[(r=c[e]).i]=r.x(n);return a.join("")})}function du(n,t){for(var r,e=Bo.interpolators.length;--e>=0&&!(r=Bo.interpolators[e](n,t)););return r}function mu(n,t){var r,e=[],u=[],i=n.length,o=t.length,a=Math.min(n.length,t.length);for(r=0;a>r;++r)e.push(du(n[r],t[r]));for(;i>r;++r)u[r]=n[r];for(;o>r;++r)u[r]=t[r];return function(n){for(r=0;a>r;++r)u[r]=e[r](n);return u}}function yu(n){return function(t){return 0>=t?0:t>=1?1:n(t)}}function xu(n){return function(t){return 1-n(1-t)}}function Mu(n){return function(t){return.5*(.5>t?n(2*t):2-n(2-2*t))}}function _u(n){return n*n}function bu(n){return n*n*n}function wu(n){if(0>=n)return 0;if(n>=1)return 1;var t=n*n,r=t*n;return 4*(.5>n?r:3*(n-t)+r-.75)}function Su(n){return function(t){return Math.pow(t,n)}}function ku(n){return 1-Math.cos(n*Aa)}function Eu(n){return Math.pow(2,10*(n-1))}function Au(n){return 1-Math.sqrt(1-n*n)}function Cu(n,t){var r;return arguments.length<2&&(t=.45),arguments.length?r=t/Ea*Math.asin(1/n):(n=1,r=t/4),function(e){return 1+n*Math.pow(2,-10*e)*Math.sin((e-r)*Ea/t)}}function Nu(n){return n||(n=1.70158),function(t){return t*t*((n+1)*t-n)}}function zu(n){return 1/2.75>n?7.5625*n*n:2/2.75>n?7.5625*(n-=1.5/2.75)*n+.75:2.5/2.75>n?7.5625*(n-=2.25/2.75)*n+.9375:7.5625*(n-=2.625/2.75)*n+.984375}function Lu(n,t){n=Bo.hcl(n),t=Bo.hcl(t);var r=n.h,e=n.c,u=n.l,i=t.h-r,o=t.c-e,a=t.l-u;return isNaN(o)&&(o=0,e=isNaN(e)?t.c:e),isNaN(i)?(i=0,r=isNaN(r)?t.h:r):i>180?i-=360:-180>i&&(i+=360),function(n){return ct(r+i*n,e+o*n,u+a*n)+""}}function Tu(n,t){n=Bo.hsl(n),t=Bo.hsl(t);var r=n.h,e=n.s,u=n.l,i=t.h-r,o=t.s-e,a=t.l-u;return isNaN(o)&&(o=0,e=isNaN(e)?t.s:e),isNaN(i)?(i=0,r=isNaN(r)?t.h:r):i>180?i-=360:-180>i&&(i+=360),function(n){return it(r+i*n,e+o*n,u+a*n)+""}}function qu(n,t){n=Bo.lab(n),t=Bo.lab(t);var r=n.l,e=n.a,u=n.b,i=t.l-r,o=t.a-e,a=t.b-u;return function(n){return ft(r+i*n,e+o*n,u+a*n)+""}}function Ru(n,t){return t-=n,function(r){return Math.round(n+t*r)}}function Du(n){var t=[n.a,n.b],r=[n.c,n.d],e=Uu(t),u=Pu(t,r),i=Uu(ju(r,t,-u))||0;t[0]*r[1]<r[0]*t[1]&&(t[0]*=-1,t[1]*=-1,e*=-1,u*=-1),this.rotate=(e?Math.atan2(t[1],t[0]):Math.atan2(-r[0],r[1]))*La,this.translate=[n.e,n.f],this.scale=[e,i],this.skew=i?Math.atan2(u,i)*La:0}function Pu(n,t){return n[0]*t[0]+n[1]*t[1]}function Uu(n){var t=Math.sqrt(Pu(n,n));return t&&(n[0]/=t,n[1]/=t),t}function ju(n,t,r){return n[0]+=r*t[0],n[1]+=r*t[1],n}function Hu(n,t){var r,e=[],u=[],i=Bo.transform(n),o=Bo.transform(t),a=i.translate,c=o.translate,s=i.rotate,l=o.rotate,f=i.skew,h=o.skew,g=i.scale,p=o.scale;return a[0]!=c[0]||a[1]!=c[1]?(e.push("translate(",null,",",null,")"),u.push({i:1,x:pu(a[0],c[0])},{i:3,x:pu(a[1],c[1])})):c[0]||c[1]?e.push("translate("+c+")"):e.push(""),s!=l?(s-l>180?l+=360:l-s>180&&(s+=360),u.push({i:e.push(e.pop()+"rotate(",null,")")-2,x:pu(s,l)})):l&&e.push(e.pop()+"rotate("+l+")"),f!=h?u.push({i:e.push(e.pop()+"skewX(",null,")")-2,x:pu(f,h)}):h&&e.push(e.pop()+"skewX("+h+")"),g[0]!=p[0]||g[1]!=p[1]?(r=e.push(e.pop()+"scale(",null,",",null,")"),u.push({i:r-4,x:pu(g[0],p[0])},{i:r-2,x:pu(g[1],p[1])})):(1!=p[0]||1!=p[1])&&e.push(e.pop()+"scale("+p+")"),r=u.length,function(n){for(var t,i=-1;++i<r;)e[(t=u[i]).i]=t.x(n);return e.join("")}}function Fu(n,t){return t=t-(n=+n)?1/(t-n):0,function(r){return(r-n)*t}}function Ou(n,t){return t=t-(n=+n)?1/(t-n):0,function(r){return Math.max(0,Math.min(1,(r-n)*t))}}function Iu(n){for(var t=n.source,r=n.target,e=Zu(t,r),u=[t];t!==e;)t=t.parent,u.push(t);for(var i=u.length;r!==e;)u.splice(i,0,r),r=r.parent;return u}function Yu(n){for(var t=[],r=n.parent;null!=r;)t.push(n),n=r,r=r.parent;return t.push(n),t}function Zu(n,t){if(n===t)return n;for(var r=Yu(n),e=Yu(t),u=r.pop(),i=e.pop(),o=null;u===i;)o=u,u=r.pop(),i=e.pop();return o}function Vu(n){n.fixed|=2}function $u(n){n.fixed&=-7}function Xu(n){n.fixed|=4,n.px=n.x,n.py=n.y}function Bu(n){n.fixed&=-5}function Ju(n,t,r){var e=0,u=0;if(n.charge=0,!n.leaf)for(var i,o=n.nodes,a=o.length,c=-1;++c<a;)i=o[c],null!=i&&(Ju(i,t,r),n.charge+=i.charge,e+=i.charge*i.cx,u+=i.charge*i.cy);if(n.point){n.leaf||(n.point.x+=Math.random()-.5,n.point.y+=Math.random()-.5);var s=t*r[n.point.index];n.charge+=n.pointCharge=s,e+=s*n.point.x,u+=s*n.point.y}n.cx=e/n.charge,n.cy=u/n.charge}function Wu(n,t){return Bo.rebind(n,t,"sort","children","value"),n.nodes=n,n.links=ri,n}function Gu(n,t){for(var r=[n];null!=(n=r.pop());)if(t(n),(u=n.children)&&(e=u.length))for(var e,u;--e>=0;)r.push(u[e])}function Ku(n,t){for(var r=[n],e=[];null!=(n=r.pop());)if(e.push(n),(i=n.children)&&(u=i.length))for(var u,i,o=-1;++o<u;)r.push(i[o]);for(;null!=(n=e.pop());)t(n)}function Qu(n){return n.children}function ni(n){return n.value}function ti(n,t){return t.value-n.value}function ri(n){return Bo.merge(n.map(function(n){return(n.children||[]).map(function(t){return{source:n,target:t}})}))}function ei(n){return n.x}function ui(n){return n.y}function ii(n,t,r){n.y0=t,n.y=r}function oi(n){return Bo.range(n.length)}function ai(n){for(var t=-1,r=n[0].length,e=[];++t<r;)e[t]=0;return e}function ci(n){for(var t,r=1,e=0,u=n[0][1],i=n.length;i>r;++r)(t=n[r][1])>u&&(e=r,u=t);return e}function si(n){return n.reduce(li,0)}function li(n,t){return n+t[1]}function fi(n,t){return hi(n,Math.ceil(Math.log(t.length)/Math.LN2+1))}function hi(n,t){for(var r=-1,e=+n[0],u=(n[1]-e)/t,i=[];++r<=t;)i[r]=u*r+e;return i}function gi(n){return[Bo.min(n),Bo.max(n)]}function pi(n,t){return n.value-t.value}function vi(n,t){var r=n._pack_next;n._pack_next=t,t._pack_prev=n,t._pack_next=r,r._pack_prev=t}function di(n,t){n._pack_next=t,t._pack_prev=n}function mi(n,t){var r=t.x-n.x,e=t.y-n.y,u=n.r+t.r;return.999*u*u>r*r+e*e}function yi(n){function t(n){l=Math.min(n.x-n.r,l),f=Math.max(n.x+n.r,f),h=Math.min(n.y-n.r,h),g=Math.max(n.y+n.r,g)}if((r=n.children)&&(s=r.length)){var r,e,u,i,o,a,c,s,l=1/0,f=-1/0,h=1/0,g=-1/0;if(r.forEach(xi),e=r[0],e.x=-e.r,e.y=0,t(e),s>1&&(u=r[1],u.x=u.r,u.y=0,t(u),s>2))for(i=r[2],bi(e,u,i),t(i),vi(e,i),e._pack_prev=i,vi(i,u),u=e._pack_next,o=3;s>o;o++){bi(e,u,i=r[o]);var p=0,v=1,d=1;for(a=u._pack_next;a!==u;a=a._pack_next,v++)if(mi(a,i)){p=1;break}if(1==p)for(c=e._pack_prev;c!==a._pack_prev&&!mi(c,i);c=c._pack_prev,d++);p?(d>v||v==d&&u.r<e.r?di(e,u=a):di(e=c,u),o--):(vi(e,i),u=i,t(i))}var m=(l+f)/2,y=(h+g)/2,x=0;for(o=0;s>o;o++)i=r[o],i.x-=m,i.y-=y,x=Math.max(x,i.r+Math.sqrt(i.x*i.x+i.y*i.y));n.r=x,r.forEach(Mi)}}function xi(n){n._pack_next=n._pack_prev=n}function Mi(n){delete n._pack_next,delete n._pack_prev}function _i(n,t,r,e){var u=n.children;if(n.x=t+=e*n.x,n.y=r+=e*n.y,n.r*=e,u)for(var i=-1,o=u.length;++i<o;)_i(u[i],t,r,e)}function bi(n,t,r){var e=n.r+r.r,u=t.x-n.x,i=t.y-n.y;if(e&&(u||i)){var o=t.r+r.r,a=u*u+i*i;o*=o,e*=e;var c=.5+(e-o)/(2*a),s=Math.sqrt(Math.max(0,2*o*(e+a)-(e-=a)*e-o*o))/(2*a);r.x=n.x+c*u+s*i,r.y=n.y+c*i-s*u}else r.x=n.x+e,r.y=n.y}function wi(n,t){return n.parent==t.parent?1:2}function Si(n){var t=n.children;return t.length?t[0]:n.t}function ki(n){var t,r=n.children;return(t=r.length)?r[t-1]:n.t}function Ei(n,t,r){var e=r/(t.i-n.i);t.c-=e,t.s+=r,n.c+=e,t.z+=r,t.m+=r}function Ai(n){for(var t,r=0,e=0,u=n.children,i=u.length;--i>=0;)t=u[i],t.z+=r,t.m+=r,r+=t.s+(e+=t.c)}function Ci(n,t,r){return n.a.parent===t.parent?n.a:r}function Ni(n){return 1+Bo.max(n,function(n){return n.y})}function zi(n){return n.reduce(function(n,t){return n+t.x},0)/n.length}function Li(n){var t=n.children;return t&&t.length?Li(t[0]):n}function Ti(n){var t,r=n.children;return r&&(t=r.length)?Ti(r[t-1]):n}function qi(n){return{x:n.x,y:n.y,dx:n.dx,dy:n.dy}}function Ri(n,t){var r=n.x+t[3],e=n.y+t[0],u=n.dx-t[1]-t[3],i=n.dy-t[0]-t[2];return 0>u&&(r+=u/2,u=0),0>i&&(e+=i/2,i=0),{x:r,y:e,dx:u,dy:i}}function Di(n){var t=n[0],r=n[n.length-1];return r>t?[t,r]:[r,t]}function Pi(n){return n.rangeExtent?n.rangeExtent():Di(n.range())}function Ui(n,t,r,e){var u=r(n[0],n[1]),i=e(t[0],t[1]);return function(n){return i(u(n))}}function ji(n,t){var r,e=0,u=n.length-1,i=n[e],o=n[u];return i>o&&(r=e,e=u,u=r,r=i,i=o,o=r),n[e]=t.floor(i),n[u]=t.ceil(o),n}function Hi(n){return n?{floor:function(t){return Math.floor(t/n)*n},ceil:function(t){return Math.ceil(t/n)*n}}:hs}function Fi(n,t,r,e){var u=[],i=[],o=0,a=Math.min(n.length,t.length)-1;for(n[a]<n[0]&&(n=n.slice().reverse(),t=t.slice().reverse());++o<=a;)u.push(r(n[o-1],n[o])),i.push(e(t[o-1],t[o]));return function(t){var r=Bo.bisect(n,t,1,a)-1;return i[r](u[r](t))}}function Oi(n,t,r,e){function u(){var u=Math.min(n.length,t.length)>2?Fi:Ui,c=e?Ou:Fu;return o=u(n,t,c,r),a=u(t,n,c,du),i}function i(n){return o(n)}var o,a;return i.invert=function(n){return a(n)},i.domain=function(t){return arguments.length?(n=t.map(Number),u()):n},i.range=function(n){return arguments.length?(t=n,u()):t},i.rangeRound=function(n){return i.range(n).interpolate(Ru)},i.clamp=function(n){return arguments.length?(e=n,u()):e},i.interpolate=function(n){return arguments.length?(r=n,u()):r},i.ticks=function(t){return Vi(n,t)},i.tickFormat=function(t,r){return $i(n,t,r)},i.nice=function(t){return Yi(n,t),u()},i.copy=function(){return Oi(n,t,r,e)},u()}function Ii(n,t){return Bo.rebind(n,t,"range","rangeRound","interpolate","clamp")}function Yi(n,t){return ji(n,Hi(Zi(n,t)[2]))}function Zi(n,t){null==t&&(t=10);var r=Di(n),e=r[1]-r[0],u=Math.pow(10,Math.floor(Math.log(e/t)/Math.LN10)),i=t/e*u;return.15>=i?u*=10:.35>=i?u*=5:.75>=i&&(u*=2),r[0]=Math.ceil(r[0]/u)*u,r[1]=Math.floor(r[1]/u)*u+.5*u,r[2]=u,r}function Vi(n,t){return Bo.range.apply(Bo,Zi(n,t))}function $i(n,t,r){var e=Zi(n,t);if(r){var u=nc.exec(r);if(u.shift(),"s"===u[8]){var i=Bo.formatPrefix(Math.max(ca(e[0]),ca(e[1])));return u[7]||(u[7]="."+Xi(i.scale(e[2]))),u[8]="f",r=Bo.format(u.join("")),function(n){return r(i.scale(n))+i.symbol}}u[7]||(u[7]="."+Bi(u[8],e)),r=u.join("")}else r=",."+Xi(e[2])+"f";return Bo.format(r)}function Xi(n){return-Math.floor(Math.log(n)/Math.LN10+.01)}function Bi(n,t){var r=Xi(t[2]);return n in gs?Math.abs(r-Xi(Math.max(ca(t[0]),ca(t[1]))))+ +("e"!==n):r-2*("%"===n)}function Ji(n,t,r,e){function u(n){return(r?Math.log(0>n?0:n):-Math.log(n>0?0:-n))/Math.log(t)}function i(n){return r?Math.pow(t,n):-Math.pow(t,-n)}function o(t){return n(u(t))}return o.invert=function(t){return i(n.invert(t))},o.domain=function(t){return arguments.length?(r=t[0]>=0,n.domain((e=t.map(Number)).map(u)),o):e},o.base=function(r){return arguments.length?(t=+r,n.domain(e.map(u)),o):t},o.nice=function(){var t=ji(e.map(u),r?Math:vs);return n.domain(t),e=t.map(i),o},o.ticks=function(){var n=Di(e),o=[],a=n[0],c=n[1],s=Math.floor(u(a)),l=Math.ceil(u(c)),f=t%1?2:t;if(isFinite(l-s)){if(r){for(;l>s;s++)for(var h=1;f>h;h++)o.push(i(s)*h);o.push(i(s))}else for(o.push(i(s));s++<l;)for(var h=f-1;h>0;h--)o.push(i(s)*h);for(s=0;o[s]<a;s++);for(l=o.length;o[l-1]>c;l--);o=o.slice(s,l)}return o},o.tickFormat=function(n,t){if(!arguments.length)return ps;arguments.length<2?t=ps:"function"!=typeof t&&(t=Bo.format(t));var e,a=Math.max(.1,n/o.ticks().length),c=r?(e=1e-12,Math.ceil):(e=-1e-12,Math.floor);return function(n){return n/i(c(u(n)+e))<=a?t(n):""}},o.copy=function(){return Ji(n.copy(),t,r,e)},Ii(o,n)}function Wi(n,t,r){function e(t){return n(u(t))}var u=Gi(t),i=Gi(1/t);return e.invert=function(t){return i(n.invert(t))},e.domain=function(t){return arguments.length?(n.domain((r=t.map(Number)).map(u)),e):r},e.ticks=function(n){return Vi(r,n)},e.tickFormat=function(n,t){return $i(r,n,t)},e.nice=function(n){return e.domain(Yi(r,n))},e.exponent=function(o){return arguments.length?(u=Gi(t=o),i=Gi(1/t),n.domain(r.map(u)),e):t},e.copy=function(){return Wi(n.copy(),t,r)},Ii(e,n)}function Gi(n){return function(t){return 0>t?-Math.pow(-t,n):Math.pow(t,n)}}function Ki(n,t){function r(r){return i[((u.get(r)||("range"===t.t?u.set(r,n.push(r)):0/0))-1)%i.length]}function e(t,r){return Bo.range(n.length).map(function(n){return t+r*n})}var u,i,a;return r.domain=function(e){if(!arguments.length)return n;n=[],u=new o;for(var i,a=-1,c=e.length;++a<c;)u.has(i=e[a])||u.set(i,n.push(i));return r[t.t].apply(r,t.a)},r.range=function(n){return arguments.length?(i=n,a=0,t={t:"range",a:arguments},r):i},r.rangePoints=function(u,o){arguments.length<2&&(o=0);var c=u[0],s=u[1],l=(s-c)/(Math.max(1,n.length-1)+o);return i=e(n.length<2?(c+s)/2:c+l*o/2,l),a=0,t={t:"rangePoints",a:arguments},r},r.rangeBands=function(u,o,c){arguments.length<2&&(o=0),arguments.length<3&&(c=o);var s=u[1]<u[0],l=u[s-0],f=u[1-s],h=(f-l)/(n.length-o+2*c);return i=e(l+h*c,h),s&&i.reverse(),a=h*(1-o),t={t:"rangeBands",a:arguments},r},r.rangeRoundBands=function(u,o,c){arguments.length<2&&(o=0),arguments.length<3&&(c=o);var s=u[1]<u[0],l=u[s-0],f=u[1-s],h=Math.floor((f-l)/(n.length-o+2*c)),g=f-l-(n.length-o)*h;return i=e(l+Math.round(g/2),h),s&&i.reverse(),a=Math.round(h*(1-o)),t={t:"rangeRoundBands",a:arguments},r},r.rangeBand=function(){return a},r.rangeExtent=function(){return Di(t.a[0])},r.copy=function(){return Ki(n,t)},r.domain(n)}function Qi(r,e){function u(){var n=0,t=e.length;for(o=[];++n<t;)o[n-1]=Bo.quantile(r,n/t);return i}function i(n){return isNaN(n=+n)?void 0:e[Bo.bisect(o,n)]}var o;return i.domain=function(e){return arguments.length?(r=e.filter(t).sort(n),u()):r},i.range=function(n){return arguments.length?(e=n,u()):e},i.quantiles=function(){return o},i.invertExtent=function(n){return n=e.indexOf(n),0>n?[0/0,0/0]:[n>0?o[n-1]:r[0],n<o.length?o[n]:r[r.length-1]]},i.copy=function(){return Qi(r,e)},u()}function no(n,t,r){function e(t){return r[Math.max(0,Math.min(o,Math.floor(i*(t-n))))]}function u(){return i=r.length/(t-n),o=r.length-1,e}var i,o;return e.domain=function(r){return arguments.length?(n=+r[0],t=+r[r.length-1],u()):[n,t]},e.range=function(n){return arguments.length?(r=n,u()):r},e.invertExtent=function(t){return t=r.indexOf(t),t=0>t?0/0:t/i+n,[t,t+1/i]},e.copy=function(){return no(n,t,r)},u()}function to(n,t){function r(r){return r>=r?t[Bo.bisect(n,r)]:void 0}return r.domain=function(t){return arguments.length?(n=t,r):n},r.range=function(n){return arguments.length?(t=n,r):t},r.invertExtent=function(r){return r=t.indexOf(r),[n[r-1],n[r]]},r.copy=function(){return to(n,t)},r}function ro(n){function t(n){return+n}return t.invert=t,t.domain=t.range=function(r){return arguments.length?(n=r.map(t),t):n},t.ticks=function(t){return Vi(n,t)},t.tickFormat=function(t,r){return $i(n,t,r)},t.copy=function(){return ro(n)},t}function eo(n){return n.innerRadius}function uo(n){return n.outerRadius}function io(n){return n.startAngle}function oo(n){return n.endAngle}function ao(n){function t(t){function o(){s.push("M",i(n(l),a))}for(var c,s=[],l=[],f=-1,h=t.length,g=Et(r),p=Et(e);++f<h;)u.call(this,c=t[f],f)?l.push([+g.call(this,c,f),+p.call(this,c,f)]):l.length&&(o(),l=[]);return l.length&&o(),s.length?s.join(""):null}var r=Ae,e=Ce,u=Ar,i=co,o=i.key,a=.7;return t.x=function(n){return arguments.length?(r=n,t):r},t.y=function(n){return arguments.length?(e=n,t):e},t.defined=function(n){return arguments.length?(u=n,t):u},t.interpolate=function(n){return arguments.length?(o="function"==typeof n?i=n:(i=bs.get(n)||co).key,t):o},t.tension=function(n){return arguments.length?(a=n,t):a},t}function co(n){return n.join("L")}function so(n){return co(n)+"Z"}function lo(n){for(var t=0,r=n.length,e=n[0],u=[e[0],",",e[1]];++t<r;)u.push("H",(e[0]+(e=n[t])[0])/2,"V",e[1]);return r>1&&u.push("H",e[0]),u.join("")}function fo(n){for(var t=0,r=n.length,e=n[0],u=[e[0],",",e[1]];++t<r;)u.push("V",(e=n[t])[1],"H",e[0]);return u.join("")}function ho(n){for(var t=0,r=n.length,e=n[0],u=[e[0],",",e[1]];++t<r;)u.push("H",(e=n[t])[0],"V",e[1]);return u.join("")}function go(n,t){return n.length<4?co(n):n[1]+mo(n.slice(1,n.length-1),yo(n,t))}function po(n,t){return n.length<3?co(n):n[0]+mo((n.push(n[0]),n),yo([n[n.length-2]].concat(n,[n[1]]),t))}function vo(n,t){return n.length<3?co(n):n[0]+mo(n,yo(n,t))}function mo(n,t){if(t.length<1||n.length!=t.length&&n.length!=t.length+2)return co(n);var r=n.length!=t.length,e="",u=n[0],i=n[1],o=t[0],a=o,c=1;if(r&&(e+="Q"+(i[0]-2*o[0]/3)+","+(i[1]-2*o[1]/3)+","+i[0]+","+i[1],u=n[1],c=2),t.length>1){a=t[1],i=n[c],c++,e+="C"+(u[0]+o[0])+","+(u[1]+o[1])+","+(i[0]-a[0])+","+(i[1]-a[1])+","+i[0]+","+i[1];for(var s=2;s<t.length;s++,c++)i=n[c],a=t[s],e+="S"+(i[0]-a[0])+","+(i[1]-a[1])+","+i[0]+","+i[1]}if(r){var l=n[c];e+="Q"+(i[0]+2*a[0]/3)+","+(i[1]+2*a[1]/3)+","+l[0]+","+l[1]}return e}function yo(n,t){for(var r,e=[],u=(1-t)/2,i=n[0],o=n[1],a=1,c=n.length;++a<c;)r=i,i=o,o=n[a],e.push([u*(o[0]-r[0]),u*(o[1]-r[1])]);return e}function xo(n){if(n.length<3)return co(n);var t=1,r=n.length,e=n[0],u=e[0],i=e[1],o=[u,u,u,(e=n[1])[0]],a=[i,i,i,e[1]],c=[u,",",i,"L",wo(ks,o),",",wo(ks,a)];for(n.push(n[r-1]);++t<=r;)e=n[t],o.shift(),o.push(e[0]),a.shift(),a.push(e[1]),So(c,o,a);return n.pop(),c.push("L",e),c.join("")}function Mo(n){if(n.length<4)return co(n);for(var t,r=[],e=-1,u=n.length,i=[0],o=[0];++e<3;)t=n[e],i.push(t[0]),o.push(t[1]);for(r.push(wo(ks,i)+","+wo(ks,o)),--e;++e<u;)t=n[e],i.shift(),i.push(t[0]),o.shift(),o.push(t[1]),So(r,i,o);return r.join("")}function _o(n){for(var t,r,e=-1,u=n.length,i=u+4,o=[],a=[];++e<4;)r=n[e%u],o.push(r[0]),a.push(r[1]);for(t=[wo(ks,o),",",wo(ks,a)],--e;++e<i;)r=n[e%u],o.shift(),o.push(r[0]),a.shift(),a.push(r[1]),So(t,o,a);return t.join("")}function bo(n,t){var r=n.length-1;if(r)for(var e,u,i=n[0][0],o=n[0][1],a=n[r][0]-i,c=n[r][1]-o,s=-1;++s<=r;)e=n[s],u=s/r,e[0]=t*e[0]+(1-t)*(i+u*a),e[1]=t*e[1]+(1-t)*(o+u*c);return xo(n)}function wo(n,t){return n[0]*t[0]+n[1]*t[1]+n[2]*t[2]+n[3]*t[3]}function So(n,t,r){n.push("C",wo(ws,t),",",wo(ws,r),",",wo(Ss,t),",",wo(Ss,r),",",wo(ks,t),",",wo(ks,r))}function ko(n,t){return(t[1]-n[1])/(t[0]-n[0])}function Eo(n){for(var t=0,r=n.length-1,e=[],u=n[0],i=n[1],o=e[0]=ko(u,i);++t<r;)e[t]=(o+(o=ko(u=i,i=n[t+1])))/2;return e[t]=o,e}function Ao(n){for(var t,r,e,u,i=[],o=Eo(n),a=-1,c=n.length-1;++a<c;)t=ko(n[a],n[a+1]),ca(t)<Ca?o[a]=o[a+1]=0:(r=o[a]/t,e=o[a+1]/t,u=r*r+e*e,u>9&&(u=3*t/Math.sqrt(u),o[a]=u*r,o[a+1]=u*e));for(a=-1;++a<=c;)u=(n[Math.min(c,a+1)][0]-n[Math.max(0,a-1)][0])/(6*(1+o[a]*o[a])),i.push([u||0,o[a]*u||0]);return i}function Co(n){return n.length<3?co(n):n[0]+mo(n,Ao(n))}function No(n){for(var t,r,e,u=-1,i=n.length;++u<i;)t=n[u],r=t[0],e=t[1]+Ms,t[0]=r*Math.cos(e),t[1]=r*Math.sin(e);return n}function zo(n){function t(t){function c(){v.push("M",a(n(m),f),l,s(n(d.reverse()),f),"Z")}for(var h,g,p,v=[],d=[],m=[],y=-1,x=t.length,M=Et(r),_=Et(u),b=r===e?function(){return g}:Et(e),w=u===i?function(){return p}:Et(i);++y<x;)o.call(this,h=t[y],y)?(d.push([g=+M.call(this,h,y),p=+_.call(this,h,y)]),m.push([+b.call(this,h,y),+w.call(this,h,y)])):d.length&&(c(),d=[],m=[]);return d.length&&c(),v.length?v.join(""):null}var r=Ae,e=Ae,u=0,i=Ce,o=Ar,a=co,c=a.key,s=a,l="L",f=.7;return t.x=function(n){return arguments.length?(r=e=n,t):e},t.x0=function(n){return arguments.length?(r=n,t):r},t.x1=function(n){return arguments.length?(e=n,t):e},t.y=function(n){return arguments.length?(u=i=n,t):i},t.y0=function(n){return arguments.length?(u=n,t):u},t.y1=function(n){return arguments.length?(i=n,t):i},t.defined=function(n){return arguments.length?(o=n,t):o},t.interpolate=function(n){return arguments.length?(c="function"==typeof n?a=n:(a=bs.get(n)||co).key,s=a.reverse||a,l=a.closed?"M":"L",t):c},t.tension=function(n){return arguments.length?(f=n,t):f},t}function Lo(n){return n.radius}function To(n){return[n.x,n.y]}function qo(n){return function(){var t=n.apply(this,arguments),r=t[0],e=t[1]+Ms;return[r*Math.cos(e),r*Math.sin(e)]}}function Ro(){return 64}function Do(){return"circle"}function Po(n){var t=Math.sqrt(n/ka);return"M0,"+t+"A"+t+","+t+" 0 1,1 0,"+-t+"A"+t+","+t+" 0 1,1 0,"+t+"Z"}function Uo(n,t){return ga(n,Ls),n.id=t,n}function jo(n,t,r,e){var u=n.id;return P(n,"function"==typeof r?function(n,i,o){n.__transition__[u].tween.set(t,e(r.call(n,n.__data__,i,o)))}:(r=e(r),function(n){n.__transition__[u].tween.set(t,r)}))}function Ho(n){return null==n&&(n=""),function(){this.textContent=n}}function Fo(n,t,r,e){var u=n.__transition__||(n.__transition__={active:0,count:0}),i=u[r];if(!i){var a=e.time;i=u[r]={tween:new o,time:a,ease:e.ease,delay:e.delay,duration:e.duration},++u.count,Bo.timer(function(e){function o(e){return u.active>r?s():(u.active=r,i.event&&i.event.start.call(n,l,t),i.tween.forEach(function(r,e){(e=e.call(n,l,t))&&v.push(e)}),Bo.timer(function(){return p.c=c(e||1)?Ar:c,1},0,a),void 0)}function c(e){if(u.active!==r)return s();for(var o=e/g,a=f(o),c=v.length;c>0;)v[--c].call(n,a);return o>=1?(i.event&&i.event.end.call(n,l,t),s()):void 0}function s(){return--u.count?delete u[r]:delete n.__transition__,1}var l=n.__data__,f=i.ease,h=i.delay,g=i.duration,p=Ga,v=[];return p.t=h+a,e>=h?o(e-h):(p.c=o,void 0)},0,a)}}function Oo(n,t){n.attr("transform",function(n){return"translate("+t(n)+",0)"})}function Io(n,t){n.attr("transform",function(n){return"translate(0,"+t(n)+")"})}function Yo(n){return n.toISOString()}function Zo(n,t,r){function e(t){return n(t)}function u(n,r){var e=n[1]-n[0],u=e/r,i=Bo.bisect(Fs,u);return i==Fs.length?[t.year,Zi(n.map(function(n){return n/31536e6}),r)[2]]:i?t[u/Fs[i-1]<Fs[i]/u?i-1:i]:[Ys,Zi(n,r)[2]]}return e.invert=function(t){return Vo(n.invert(t))
},e.domain=function(t){return arguments.length?(n.domain(t),e):n.domain().map(Vo)},e.nice=function(n,t){function r(r){return!isNaN(r)&&!n.range(r,Vo(+r+1),t).length}var i=e.domain(),o=Di(i),a=null==n?u(o,10):"number"==typeof n&&u(o,n);return a&&(n=a[0],t=a[1]),e.domain(ji(i,t>1?{floor:function(t){for(;r(t=n.floor(t));)t=Vo(t-1);return t},ceil:function(t){for(;r(t=n.ceil(t));)t=Vo(+t+1);return t}}:n))},e.ticks=function(n,t){var r=Di(e.domain()),i=null==n?u(r,10):"number"==typeof n?u(r,n):!n.range&&[{range:n},t];return i&&(n=i[0],t=i[1]),n.range(r[0],Vo(+r[1]+1),1>t?1:t)},e.tickFormat=function(){return r},e.copy=function(){return Zo(n.copy(),t,r)},Ii(e,n)}function Vo(n){return new Date(n)}function $o(n){return JSON.parse(n.responseText)}function Xo(n){var t=Go.createRange();return t.selectNode(Go.body),t.createContextualFragment(n.responseText)}var Bo={version:"3.4.8"};Date.now||(Date.now=function(){return+new Date});var Jo=[].slice,Wo=function(n){return Jo.call(n)},Go=document,Ko=Go.documentElement,Qo=window;try{Wo(Ko.childNodes)[0].nodeType}catch(na){Wo=function(n){for(var t=n.length,r=new Array(t);t--;)r[t]=n[t];return r}}try{Go.createElement("div").style.setProperty("opacity",0,"")}catch(ta){var ra=Qo.Element.prototype,ea=ra.setAttribute,ua=ra.setAttributeNS,ia=Qo.CSSStyleDeclaration.prototype,oa=ia.setProperty;ra.setAttribute=function(n,t){ea.call(this,n,t+"")},ra.setAttributeNS=function(n,t,r){ua.call(this,n,t,r+"")},ia.setProperty=function(n,t,r){oa.call(this,n,t+"",r)}}Bo.ascending=n,Bo.descending=function(n,t){return n>t?-1:t>n?1:t>=n?0:0/0},Bo.min=function(n,t){var r,e,u=-1,i=n.length;if(1===arguments.length){for(;++u<i&&!(null!=(r=n[u])&&r>=r);)r=void 0;for(;++u<i;)null!=(e=n[u])&&r>e&&(r=e)}else{for(;++u<i&&!(null!=(r=t.call(n,n[u],u))&&r>=r);)r=void 0;for(;++u<i;)null!=(e=t.call(n,n[u],u))&&r>e&&(r=e)}return r},Bo.max=function(n,t){var r,e,u=-1,i=n.length;if(1===arguments.length){for(;++u<i&&!(null!=(r=n[u])&&r>=r);)r=void 0;for(;++u<i;)null!=(e=n[u])&&e>r&&(r=e)}else{for(;++u<i&&!(null!=(r=t.call(n,n[u],u))&&r>=r);)r=void 0;for(;++u<i;)null!=(e=t.call(n,n[u],u))&&e>r&&(r=e)}return r},Bo.extent=function(n,t){var r,e,u,i=-1,o=n.length;if(1===arguments.length){for(;++i<o&&!(null!=(r=u=n[i])&&r>=r);)r=u=void 0;for(;++i<o;)null!=(e=n[i])&&(r>e&&(r=e),e>u&&(u=e))}else{for(;++i<o&&!(null!=(r=u=t.call(n,n[i],i))&&r>=r);)r=void 0;for(;++i<o;)null!=(e=t.call(n,n[i],i))&&(r>e&&(r=e),e>u&&(u=e))}return[r,u]},Bo.sum=function(n,t){var r,e=0,u=n.length,i=-1;if(1===arguments.length)for(;++i<u;)isNaN(r=+n[i])||(e+=r);else for(;++i<u;)isNaN(r=+t.call(n,n[i],i))||(e+=r);return e},Bo.mean=function(n,r){var e,u=0,i=n.length,o=-1,a=i;if(1===arguments.length)for(;++o<i;)t(e=n[o])?u+=e:--a;else for(;++o<i;)t(e=r.call(n,n[o],o))?u+=e:--a;return a?u/a:void 0},Bo.quantile=function(n,t){var r=(n.length-1)*t+1,e=Math.floor(r),u=+n[e-1],i=r-e;return i?u+i*(n[e]-u):u},Bo.median=function(r,e){return arguments.length>1&&(r=r.map(e)),r=r.filter(t),r.length?Bo.quantile(r.sort(n),.5):void 0};var aa=r(n);Bo.bisectLeft=aa.left,Bo.bisect=Bo.bisectRight=aa.right,Bo.bisector=function(t){return r(1===t.length?function(r,e){return n(t(r),e)}:t)},Bo.shuffle=function(n){for(var t,r,e=n.length;e;)r=0|Math.random()*e--,t=n[e],n[e]=n[r],n[r]=t;return n},Bo.permute=function(n,t){for(var r=t.length,e=new Array(r);r--;)e[r]=n[t[r]];return e},Bo.pairs=function(n){for(var t,r=0,e=n.length-1,u=n[0],i=new Array(0>e?0:e);e>r;)i[r]=[t=u,u=n[++r]];return i},Bo.zip=function(){if(!(u=arguments.length))return[];for(var n=-1,t=Bo.min(arguments,e),r=new Array(t);++n<t;)for(var u,i=-1,o=r[n]=new Array(u);++i<u;)o[i]=arguments[i][n];return r},Bo.transpose=function(n){return Bo.zip.apply(Bo,n)},Bo.keys=function(n){var t=[];for(var r in n)t.push(r);return t},Bo.values=function(n){var t=[];for(var r in n)t.push(n[r]);return t},Bo.entries=function(n){var t=[];for(var r in n)t.push({key:r,value:n[r]});return t},Bo.merge=function(n){for(var t,r,e,u=n.length,i=-1,o=0;++i<u;)o+=n[i].length;for(r=new Array(o);--u>=0;)for(e=n[u],t=e.length;--t>=0;)r[--o]=e[t];return r};var ca=Math.abs;Bo.range=function(n,t,r){if(arguments.length<3&&(r=1,arguments.length<2&&(t=n,n=0)),1/0===(t-n)/r)throw new Error("infinite range");var e,i=[],o=u(ca(r)),a=-1;if(n*=o,t*=o,r*=o,0>r)for(;(e=n+r*++a)>t;)i.push(e/o);else for(;(e=n+r*++a)<t;)i.push(e/o);return i},Bo.map=function(n){var t=new o;if(n instanceof o)n.forEach(function(n,r){t.set(n,r)});else for(var r in n)t.set(r,n[r]);return t},i(o,{has:a,get:function(n){return this[sa+n]},set:function(n,t){return this[sa+n]=t},remove:c,keys:s,values:function(){var n=[];return this.forEach(function(t,r){n.push(r)}),n},entries:function(){var n=[];return this.forEach(function(t,r){n.push({key:t,value:r})}),n},size:l,empty:f,forEach:function(n){for(var t in this)t.charCodeAt(0)===la&&n.call(this,t.substring(1),this[t])}});var sa="\x00",la=sa.charCodeAt(0);Bo.nest=function(){function n(t,a,c){if(c>=i.length)return e?e.call(u,a):r?a.sort(r):a;for(var s,l,f,h,g=-1,p=a.length,v=i[c++],d=new o;++g<p;)(h=d.get(s=v(l=a[g])))?h.push(l):d.set(s,[l]);return t?(l=t(),f=function(r,e){l.set(r,n(t,e,c))}):(l={},f=function(r,e){l[r]=n(t,e,c)}),d.forEach(f),l}function t(n,r){if(r>=i.length)return n;var e=[],u=a[r++];return n.forEach(function(n,u){e.push({key:n,values:t(u,r)})}),u?e.sort(function(n,t){return u(n.key,t.key)}):e}var r,e,u={},i=[],a=[];return u.map=function(t,r){return n(r,t,0)},u.entries=function(r){return t(n(Bo.map,r,0),0)},u.key=function(n){return i.push(n),u},u.sortKeys=function(n){return a[i.length-1]=n,u},u.sortValues=function(n){return r=n,u},u.rollup=function(n){return e=n,u},u},Bo.set=function(n){var t=new h;if(n)for(var r=0,e=n.length;e>r;++r)t.add(n[r]);return t},i(h,{has:a,add:function(n){return this[sa+n]=!0,n},remove:function(n){return n=sa+n,n in this&&delete this[n]},values:s,size:l,empty:f,forEach:function(n){for(var t in this)t.charCodeAt(0)===la&&n.call(this,t.substring(1))}}),Bo.behavior={},Bo.rebind=function(n,t){for(var r,e=1,u=arguments.length;++e<u;)n[r=arguments[e]]=g(n,t,t[r]);return n};var fa=["webkit","ms","moz","Moz","o","O"];Bo.dispatch=function(){for(var n=new d,t=-1,r=arguments.length;++t<r;)n[arguments[t]]=m(n);return n},d.prototype.on=function(n,t){var r=n.indexOf("."),e="";if(r>=0&&(e=n.substring(r+1),n=n.substring(0,r)),n)return arguments.length<2?this[n].on(e):this[n].on(e,t);if(2===arguments.length){if(null==t)for(n in this)this.hasOwnProperty(n)&&this[n].on(e,null);return this}},Bo.event=null,Bo.requote=function(n){return n.replace(ha,"\\$&")};var ha=/[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g,ga={}.__proto__?function(n,t){n.__proto__=t}:function(n,t){for(var r in t)n[r]=t[r]},pa=function(n,t){return t.querySelector(n)},va=function(n,t){return t.querySelectorAll(n)},da=Ko[p(Ko,"matchesSelector")],ma=function(n,t){return da.call(n,t)};"function"==typeof Sizzle&&(pa=function(n,t){return Sizzle(n,t)[0]||null},va=Sizzle,ma=Sizzle.matchesSelector),Bo.selection=function(){return _a};var ya=Bo.selection.prototype=[];ya.select=function(n){var t,r,e,u,i=[];n=b(n);for(var o=-1,a=this.length;++o<a;){i.push(t=[]),t.parentNode=(e=this[o]).parentNode;for(var c=-1,s=e.length;++c<s;)(u=e[c])?(t.push(r=n.call(u,u.__data__,c,o)),r&&"__data__"in u&&(r.__data__=u.__data__)):t.push(null)}return _(i)},ya.selectAll=function(n){var t,r,e=[];n=w(n);for(var u=-1,i=this.length;++u<i;)for(var o=this[u],a=-1,c=o.length;++a<c;)(r=o[a])&&(e.push(t=Wo(n.call(r,r.__data__,a,u))),t.parentNode=r);return _(e)};var xa={svg:"http://www.w3.org/2000/svg",xhtml:"http://www.w3.org/1999/xhtml",xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/"};Bo.ns={prefix:xa,qualify:function(n){var t=n.indexOf(":"),r=n;return t>=0&&(r=n.substring(0,t),n=n.substring(t+1)),xa.hasOwnProperty(r)?{space:xa[r],local:n}:n}},ya.attr=function(n,t){if(arguments.length<2){if("string"==typeof n){var r=this.node();return n=Bo.ns.qualify(n),n.local?r.getAttributeNS(n.space,n.local):r.getAttribute(n)}for(t in n)this.each(S(t,n[t]));return this}return this.each(S(n,t))},ya.classed=function(n,t){if(arguments.length<2){if("string"==typeof n){var r=this.node(),e=(n=A(n)).length,u=-1;if(t=r.classList){for(;++u<e;)if(!t.contains(n[u]))return!1}else for(t=r.getAttribute("class");++u<e;)if(!E(n[u]).test(t))return!1;return!0}for(t in n)this.each(C(t,n[t]));return this}return this.each(C(n,t))},ya.style=function(n,t,r){var e=arguments.length;if(3>e){if("string"!=typeof n){2>e&&(t="");for(r in n)this.each(z(r,n[r],t));return this}if(2>e)return Qo.getComputedStyle(this.node(),null).getPropertyValue(n);r=""}return this.each(z(n,t,r))},ya.property=function(n,t){if(arguments.length<2){if("string"==typeof n)return this.node()[n];for(t in n)this.each(L(t,n[t]));return this}return this.each(L(n,t))},ya.text=function(n){return arguments.length?this.each("function"==typeof n?function(){var t=n.apply(this,arguments);this.textContent=null==t?"":t}:null==n?function(){this.textContent=""}:function(){this.textContent=n}):this.node().textContent},ya.html=function(n){return arguments.length?this.each("function"==typeof n?function(){var t=n.apply(this,arguments);this.innerHTML=null==t?"":t}:null==n?function(){this.innerHTML=""}:function(){this.innerHTML=n}):this.node().innerHTML},ya.append=function(n){return n=T(n),this.select(function(){return this.appendChild(n.apply(this,arguments))})},ya.insert=function(n,t){return n=T(n),t=b(t),this.select(function(){return this.insertBefore(n.apply(this,arguments),t.apply(this,arguments)||null)})},ya.remove=function(){return this.each(function(){var n=this.parentNode;n&&n.removeChild(this)})},ya.data=function(n,t){function r(n,r){var e,u,i,a=n.length,f=r.length,h=Math.min(a,f),g=new Array(f),p=new Array(f),v=new Array(a);if(t){var d,m=new o,y=new o,x=[];for(e=-1;++e<a;)d=t.call(u=n[e],u.__data__,e),m.has(d)?v[e]=u:m.set(d,u),x.push(d);for(e=-1;++e<f;)d=t.call(r,i=r[e],e),(u=m.get(d))?(g[e]=u,u.__data__=i):y.has(d)||(p[e]=q(i)),y.set(d,i),m.remove(d);for(e=-1;++e<a;)m.has(x[e])&&(v[e]=n[e])}else{for(e=-1;++e<h;)u=n[e],i=r[e],u?(u.__data__=i,g[e]=u):p[e]=q(i);for(;f>e;++e)p[e]=q(r[e]);for(;a>e;++e)v[e]=n[e]}p.update=g,p.parentNode=g.parentNode=v.parentNode=n.parentNode,c.push(p),s.push(g),l.push(v)}var e,u,i=-1,a=this.length;if(!arguments.length){for(n=new Array(a=(e=this[0]).length);++i<a;)(u=e[i])&&(n[i]=u.__data__);return n}var c=U([]),s=_([]),l=_([]);if("function"==typeof n)for(;++i<a;)r(e=this[i],n.call(e,e.parentNode.__data__,i));else for(;++i<a;)r(e=this[i],n);return s.enter=function(){return c},s.exit=function(){return l},s},ya.datum=function(n){return arguments.length?this.property("__data__",n):this.property("__data__")},ya.filter=function(n){var t,r,e,u=[];"function"!=typeof n&&(n=R(n));for(var i=0,o=this.length;o>i;i++){u.push(t=[]),t.parentNode=(r=this[i]).parentNode;for(var a=0,c=r.length;c>a;a++)(e=r[a])&&n.call(e,e.__data__,a,i)&&t.push(e)}return _(u)},ya.order=function(){for(var n=-1,t=this.length;++n<t;)for(var r,e=this[n],u=e.length-1,i=e[u];--u>=0;)(r=e[u])&&(i&&i!==r.nextSibling&&i.parentNode.insertBefore(r,i),i=r);return this},ya.sort=function(n){n=D.apply(this,arguments);for(var t=-1,r=this.length;++t<r;)this[t].sort(n);return this.order()},ya.each=function(n){return P(this,function(t,r,e){n.call(t,t.__data__,r,e)})},ya.call=function(n){var t=Wo(arguments);return n.apply(t[0]=this,t),this},ya.empty=function(){return!this.node()},ya.node=function(){for(var n=0,t=this.length;t>n;n++)for(var r=this[n],e=0,u=r.length;u>e;e++){var i=r[e];if(i)return i}return null},ya.size=function(){var n=0;return this.each(function(){++n}),n};var Ma=[];Bo.selection.enter=U,Bo.selection.enter.prototype=Ma,Ma.append=ya.append,Ma.empty=ya.empty,Ma.node=ya.node,Ma.call=ya.call,Ma.size=ya.size,Ma.select=function(n){for(var t,r,e,u,i,o=[],a=-1,c=this.length;++a<c;){e=(u=this[a]).update,o.push(t=[]),t.parentNode=u.parentNode;for(var s=-1,l=u.length;++s<l;)(i=u[s])?(t.push(e[s]=r=n.call(u.parentNode,i.__data__,s,a)),r.__data__=i.__data__):t.push(null)}return _(o)},Ma.insert=function(n,t){return arguments.length<2&&(t=j(this)),ya.insert.call(this,n,t)},ya.transition=function(){for(var n,t,r=As||++Ts,e=[],u=Cs||{time:Date.now(),ease:wu,delay:0,duration:250},i=-1,o=this.length;++i<o;){e.push(n=[]);for(var a=this[i],c=-1,s=a.length;++c<s;)(t=a[c])&&Fo(t,c,r,u),n.push(t)}return Uo(e,r)},ya.interrupt=function(){return this.each(H)},Bo.select=function(n){var t=["string"==typeof n?pa(n,Go):n];return t.parentNode=Ko,_([t])},Bo.selectAll=function(n){var t=Wo("string"==typeof n?va(n,Go):n);return t.parentNode=Ko,_([t])};var _a=Bo.select(Ko);ya.on=function(n,t,r){var e=arguments.length;if(3>e){if("string"!=typeof n){2>e&&(t=!1);for(r in n)this.each(F(r,n[r],t));return this}if(2>e)return(e=this.node()["__on"+n])&&e._;r=!1}return this.each(F(n,t,r))};var ba=Bo.map({mouseenter:"mouseover",mouseleave:"mouseout"});ba.forEach(function(n){"on"+n in Go&&ba.remove(n)});var wa="onselectstart"in Go?null:p(Ko.style,"userSelect"),Sa=0;Bo.mouse=function(n){return Z(n,x())},Bo.touches=function(n,t){return arguments.length<2&&(t=x().touches),t?Wo(t).map(function(t){var r=Z(n,t);return r.identifier=t.identifier,r}):[]},Bo.behavior.drag=function(){function n(){this.on("mousedown.drag",u).on("touchstart.drag",i)}function t(n,t,u,i,o){return function(){function a(){var n,r,e=t(h,v);e&&(n=e[0]-x[0],r=e[1]-x[1],p|=n|r,x=e,g({type:"drag",x:e[0]+s[0],y:e[1]+s[1],dx:n,dy:r}))}function c(){t(h,v)&&(m.on(i+d,null).on(o+d,null),y(p&&Bo.event.target===f),g({type:"dragend"}))}var s,l=this,f=Bo.event.target,h=l.parentNode,g=r.of(l,arguments),p=0,v=n(),d=".drag"+(null==v?"":"-"+v),m=Bo.select(u()).on(i+d,a).on(o+d,c),y=Y(),x=t(h,v);e?(s=e.apply(l,arguments),s=[s.x-x[0],s.y-x[1]]):s=[0,0],g({type:"dragstart"})}}var r=M(n,"drag","dragstart","dragend"),e=null,u=t(v,Bo.mouse,X,"mousemove","mouseup"),i=t(V,Bo.touch,$,"touchmove","touchend");return n.origin=function(t){return arguments.length?(e=t,n):e},Bo.rebind(n,r,"on")};var ka=Math.PI,Ea=2*ka,Aa=ka/2,Ca=1e-6,Na=Ca*Ca,za=ka/180,La=180/ka,Ta=Math.SQRT2,qa=2,Ra=4;Bo.interpolateZoom=function(n,t){function r(n){var t=n*y;if(m){var r=Q(v),o=i/(qa*h)*(r*nt(Ta*t+v)-K(v));return[e+o*s,u+o*l,i*r/Q(Ta*t+v)]}return[e+n*s,u+n*l,i*Math.exp(Ta*t)]}var e=n[0],u=n[1],i=n[2],o=t[0],a=t[1],c=t[2],s=o-e,l=a-u,f=s*s+l*l,h=Math.sqrt(f),g=(c*c-i*i+Ra*f)/(2*i*qa*h),p=(c*c-i*i-Ra*f)/(2*c*qa*h),v=Math.log(Math.sqrt(g*g+1)-g),d=Math.log(Math.sqrt(p*p+1)-p),m=d-v,y=(m||Math.log(c/i))/Ta;return r.duration=1e3*y,r},Bo.behavior.zoom=function(){function n(n){n.on(A,s).on(Ua+".zoom",f).on(C,h).on("dblclick.zoom",g).on(z,l)}function t(n){return[(n[0]-S.x)/S.k,(n[1]-S.y)/S.k]}function r(n){return[n[0]*S.k+S.x,n[1]*S.k+S.y]}function e(n){S.k=Math.max(E[0],Math.min(E[1],n))}function u(n,t){t=r(t),S.x+=n[0]-t[0],S.y+=n[1]-t[1]}function i(){_&&_.domain(x.range().map(function(n){return(n-S.x)/S.k}).map(x.invert)),w&&w.domain(b.range().map(function(n){return(n-S.y)/S.k}).map(b.invert))}function o(n){n({type:"zoomstart"})}function a(n){i(),n({type:"zoom",scale:S.k,translate:[S.x,S.y]})}function c(n){n({type:"zoomend"})}function s(){function n(){l=1,u(Bo.mouse(e),g),a(s)}function r(){f.on(C,Qo===e?h:null).on(N,null),p(l&&Bo.event.target===i),c(s)}var e=this,i=Bo.event.target,s=L.of(e,arguments),l=0,f=Bo.select(Qo).on(C,n).on(N,r),g=t(Bo.mouse(e)),p=Y();H.call(e),o(s)}function l(){function n(){var n=Bo.touches(g);return h=S.k,n.forEach(function(n){n.identifier in v&&(v[n.identifier]=t(n))}),n}function r(){var t=Bo.event.target;Bo.select(t).on(M,i).on(_,f),b.push(t);for(var r=Bo.event.changedTouches,o=0,c=r.length;c>o;++o)v[r[o].identifier]=null;var s=n(),l=Date.now();if(1===s.length){if(500>l-m){var h=s[0],g=v[h.identifier];e(2*S.k),u(h,g),y(),a(p)}m=l}else if(s.length>1){var h=s[0],x=s[1],w=h[0]-x[0],k=h[1]-x[1];d=w*w+k*k}}function i(){for(var n,t,r,i,o=Bo.touches(g),c=0,s=o.length;s>c;++c,i=null)if(r=o[c],i=v[r.identifier]){if(t)break;n=r,t=i}if(i){var l=(l=r[0]-n[0])*l+(l=r[1]-n[1])*l,f=d&&Math.sqrt(l/d);n=[(n[0]+r[0])/2,(n[1]+r[1])/2],t=[(t[0]+i[0])/2,(t[1]+i[1])/2],e(f*h)}m=null,u(n,t),a(p)}function f(){if(Bo.event.touches.length){for(var t=Bo.event.changedTouches,r=0,e=t.length;e>r;++r)delete v[t[r].identifier];for(var u in v)return void n()}Bo.selectAll(b).on(x,null),w.on(A,s).on(z,l),k(),c(p)}var h,g=this,p=L.of(g,arguments),v={},d=0,x=".zoom-"+Bo.event.changedTouches[0].identifier,M="touchmove"+x,_="touchend"+x,b=[],w=Bo.select(g).on(A,null).on(z,r),k=Y();H.call(g),r(),o(p)}function f(){var n=L.of(this,arguments);d?clearTimeout(d):(H.call(this),o(n)),d=setTimeout(function(){d=null,c(n)},50),y();var r=v||Bo.mouse(this);p||(p=t(r)),e(Math.pow(2,.002*Da())*S.k),u(r,p),a(n)}function h(){p=null}function g(){var n=L.of(this,arguments),r=Bo.mouse(this),i=t(r),s=Math.log(S.k)/Math.LN2;o(n),e(Math.pow(2,Bo.event.shiftKey?Math.ceil(s)-1:Math.floor(s)+1)),u(r,i),a(n),c(n)}var p,v,d,m,x,_,b,w,S={x:0,y:0,k:1},k=[960,500],E=Pa,A="mousedown.zoom",C="mousemove.zoom",N="mouseup.zoom",z="touchstart.zoom",L=M(n,"zoomstart","zoom","zoomend");return n.event=function(n){n.each(function(){var n=L.of(this,arguments),t=S;As?Bo.select(this).transition().each("start.zoom",function(){S=this.__chart__||{x:0,y:0,k:1},o(n)}).tween("zoom:zoom",function(){var r=k[0],e=k[1],u=r/2,i=e/2,o=Bo.interpolateZoom([(u-S.x)/S.k,(i-S.y)/S.k,r/S.k],[(u-t.x)/t.k,(i-t.y)/t.k,r/t.k]);return function(t){var e=o(t),c=r/e[2];this.__chart__=S={x:u-e[0]*c,y:i-e[1]*c,k:c},a(n)}}).each("end.zoom",function(){c(n)}):(this.__chart__=S,o(n),a(n),c(n))})},n.translate=function(t){return arguments.length?(S={x:+t[0],y:+t[1],k:S.k},i(),n):[S.x,S.y]},n.scale=function(t){return arguments.length?(S={x:S.x,y:S.y,k:+t},i(),n):S.k},n.scaleExtent=function(t){return arguments.length?(E=null==t?Pa:[+t[0],+t[1]],n):E},n.center=function(t){return arguments.length?(v=t&&[+t[0],+t[1]],n):v},n.size=function(t){return arguments.length?(k=t&&[+t[0],+t[1]],n):k},n.x=function(t){return arguments.length?(_=t,x=t.copy(),S={x:0,y:0,k:1},n):_},n.y=function(t){return arguments.length?(w=t,b=t.copy(),S={x:0,y:0,k:1},n):w},Bo.rebind(n,L,"on")};var Da,Pa=[0,1/0],Ua="onwheel"in Go?(Da=function(){return-Bo.event.deltaY*(Bo.event.deltaMode?120:1)},"wheel"):"onmousewheel"in Go?(Da=function(){return Bo.event.wheelDelta},"mousewheel"):(Da=function(){return-Bo.event.detail},"MozMousePixelScroll");rt.prototype.toString=function(){return this.rgb()+""},Bo.hsl=function(n,t,r){return 1===arguments.length?n instanceof ut?et(n.h,n.s,n.l):_t(""+n,bt,et):et(+n,+t,+r)};var ja=ut.prototype=new rt;ja.brighter=function(n){return n=Math.pow(.7,arguments.length?n:1),et(this.h,this.s,this.l/n)},ja.darker=function(n){return n=Math.pow(.7,arguments.length?n:1),et(this.h,this.s,n*this.l)},ja.rgb=function(){return it(this.h,this.s,this.l)},Bo.hcl=function(n,t,r){return 1===arguments.length?n instanceof at?ot(n.h,n.c,n.l):n instanceof lt?ht(n.l,n.a,n.b):ht((n=wt((n=Bo.rgb(n)).r,n.g,n.b)).l,n.a,n.b):ot(+n,+t,+r)};var Ha=at.prototype=new rt;Ha.brighter=function(n){return ot(this.h,this.c,Math.min(100,this.l+Fa*(arguments.length?n:1)))},Ha.darker=function(n){return ot(this.h,this.c,Math.max(0,this.l-Fa*(arguments.length?n:1)))},Ha.rgb=function(){return ct(this.h,this.c,this.l).rgb()},Bo.lab=function(n,t,r){return 1===arguments.length?n instanceof lt?st(n.l,n.a,n.b):n instanceof at?ct(n.l,n.c,n.h):wt((n=Bo.rgb(n)).r,n.g,n.b):st(+n,+t,+r)};var Fa=18,Oa=.95047,Ia=1,Ya=1.08883,Za=lt.prototype=new rt;Za.brighter=function(n){return st(Math.min(100,this.l+Fa*(arguments.length?n:1)),this.a,this.b)},Za.darker=function(n){return st(Math.max(0,this.l-Fa*(arguments.length?n:1)),this.a,this.b)},Za.rgb=function(){return ft(this.l,this.a,this.b)},Bo.rgb=function(n,t,r){return 1===arguments.length?n instanceof xt?yt(n.r,n.g,n.b):_t(""+n,yt,it):yt(~~n,~~t,~~r)};var Va=xt.prototype=new rt;Va.brighter=function(n){n=Math.pow(.7,arguments.length?n:1);var t=this.r,r=this.g,e=this.b,u=30;return t||r||e?(t&&u>t&&(t=u),r&&u>r&&(r=u),e&&u>e&&(e=u),yt(Math.min(255,~~(t/n)),Math.min(255,~~(r/n)),Math.min(255,~~(e/n)))):yt(u,u,u)},Va.darker=function(n){return n=Math.pow(.7,arguments.length?n:1),yt(~~(n*this.r),~~(n*this.g),~~(n*this.b))},Va.hsl=function(){return bt(this.r,this.g,this.b)},Va.toString=function(){return"#"+Mt(this.r)+Mt(this.g)+Mt(this.b)};var $a=Bo.map({aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074});$a.forEach(function(n,t){$a.set(n,dt(t))}),Bo.functor=Et,Bo.xhr=Ct(At),Bo.dsv=function(n,t){function r(n,r,i){arguments.length<3&&(i=r,r=null);var o=Nt(n,t,null==r?e:u(r),i);return o.row=function(n){return arguments.length?o.response(null==(r=n)?e:u(n)):r},o}function e(n){return r.parse(n.responseText)}function u(n){return function(t){return r.parse(t.responseText,n)}}function i(t){return t.map(o).join(n)}function o(n){return a.test(n)?'"'+n.replace(/\"/g,'""')+'"':n}var a=new RegExp('["'+n+"\n]"),c=n.charCodeAt(0);return r.parse=function(n,t){var e;return r.parseRows(n,function(n,r){if(e)return e(n,r-1);var u=new Function("d","return {"+n.map(function(n,t){return JSON.stringify(n)+": d["+t+"]"}).join(",")+"}");e=t?function(n,r){return t(u(n),r)}:u})},r.parseRows=function(n,t){function r(){if(l>=s)return o;if(u)return u=!1,i;var t=l;if(34===n.charCodeAt(t)){for(var r=t;r++<s;)if(34===n.charCodeAt(r)){if(34!==n.charCodeAt(r+1))break;++r}l=r+2;var e=n.charCodeAt(r+1);return 13===e?(u=!0,10===n.charCodeAt(r+2)&&++l):10===e&&(u=!0),n.substring(t+1,r).replace(/""/g,'"')}for(;s>l;){var e=n.charCodeAt(l++),a=1;if(10===e)u=!0;else if(13===e)u=!0,10===n.charCodeAt(l)&&(++l,++a);else if(e!==c)continue;return n.substring(t,l-a)}return n.substring(t)}for(var e,u,i={},o={},a=[],s=n.length,l=0,f=0;(e=r())!==o;){for(var h=[];e!==i&&e!==o;)h.push(e),e=r();(!t||(h=t(h,f++)))&&a.push(h)}return a},r.format=function(t){if(Array.isArray(t[0]))return r.formatRows(t);var e=new h,u=[];return t.forEach(function(n){for(var t in n)e.has(t)||u.push(e.add(t))}),[u.map(o).join(n)].concat(t.map(function(t){return u.map(function(n){return o(t[n])}).join(n)})).join("\n")},r.formatRows=function(n){return n.map(i).join("\n")},r},Bo.csv=Bo.dsv(",","text/csv"),Bo.tsv=Bo.dsv("	","text/tab-separated-values"),Bo.touch=function(n,t,r){if(arguments.length<3&&(r=t,t=x().changedTouches),t)for(var e,u=0,i=t.length;i>u;++u)if((e=t[u]).identifier===r)return Z(n,e)};var Xa,Ba,Ja,Wa,Ga,Ka=Qo[p(Qo,"requestAnimationFrame")]||function(n){setTimeout(n,17)};Bo.timer=function(n,t,r){var e=arguments.length;2>e&&(t=0),3>e&&(r=Date.now());var u=r+t,i={c:n,t:u,f:!1,n:null};Ba?Ba.n=i:Xa=i,Ba=i,Ja||(Wa=clearTimeout(Wa),Ja=1,Ka(Lt))},Bo.timer.flush=function(){Tt(),qt()},Bo.round=function(n,t){return t?Math.round(n*(t=Math.pow(10,t)))/t:Math.round(n)};var Qa=["y","z","a","f","p","n","\xb5","m","","k","M","G","T","P","E","Z","Y"].map(Dt);Bo.formatPrefix=function(n,t){var r=0;return n&&(0>n&&(n*=-1),t&&(n=Bo.round(n,Rt(n,t))),r=1+Math.floor(1e-12+Math.log(n)/Math.LN10),r=Math.max(-24,Math.min(24,3*Math.floor((r-1)/3)))),Qa[8+r/3]};var nc=/(?:([^{])?([<>=^]))?([+\- ])?([$#])?(0)?(\d+)?(,)?(\.-?\d+)?([a-z%])?/i,tc=Bo.map({b:function(n){return n.toString(2)},c:function(n){return String.fromCharCode(n)},o:function(n){return n.toString(8)},x:function(n){return n.toString(16)},X:function(n){return n.toString(16).toUpperCase()},g:function(n,t){return n.toPrecision(t)},e:function(n,t){return n.toExponential(t)},f:function(n,t){return n.toFixed(t)},r:function(n,t){return(n=Bo.round(n,Rt(n,t))).toFixed(Math.max(0,Math.min(20,Rt(n*(1+1e-15),t))))}}),rc=Bo.time={},ec=Date;jt.prototype={getDate:function(){return this._.getUTCDate()},getDay:function(){return this._.getUTCDay()},getFullYear:function(){return this._.getUTCFullYear()},getHours:function(){return this._.getUTCHours()},getMilliseconds:function(){return this._.getUTCMilliseconds()},getMinutes:function(){return this._.getUTCMinutes()},getMonth:function(){return this._.getUTCMonth()},getSeconds:function(){return this._.getUTCSeconds()},getTime:function(){return this._.getTime()},getTimezoneOffset:function(){return 0},valueOf:function(){return this._.valueOf()},setDate:function(){uc.setUTCDate.apply(this._,arguments)},setDay:function(){uc.setUTCDay.apply(this._,arguments)},setFullYear:function(){uc.setUTCFullYear.apply(this._,arguments)},setHours:function(){uc.setUTCHours.apply(this._,arguments)},setMilliseconds:function(){uc.setUTCMilliseconds.apply(this._,arguments)},setMinutes:function(){uc.setUTCMinutes.apply(this._,arguments)},setMonth:function(){uc.setUTCMonth.apply(this._,arguments)},setSeconds:function(){uc.setUTCSeconds.apply(this._,arguments)},setTime:function(){uc.setTime.apply(this._,arguments)}};var uc=Date.prototype;rc.year=Ht(function(n){return n=rc.day(n),n.setMonth(0,1),n},function(n,t){n.setFullYear(n.getFullYear()+t)},function(n){return n.getFullYear()}),rc.years=rc.year.range,rc.years.utc=rc.year.utc.range,rc.day=Ht(function(n){var t=new ec(2e3,0);return t.setFullYear(n.getFullYear(),n.getMonth(),n.getDate()),t},function(n,t){n.setDate(n.getDate()+t)},function(n){return n.getDate()-1}),rc.days=rc.day.range,rc.days.utc=rc.day.utc.range,rc.dayOfYear=function(n){var t=rc.year(n);return Math.floor((n-t-6e4*(n.getTimezoneOffset()-t.getTimezoneOffset()))/864e5)},["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].forEach(function(n,t){t=7-t;var r=rc[n]=Ht(function(n){return(n=rc.day(n)).setDate(n.getDate()-(n.getDay()+t)%7),n},function(n,t){n.setDate(n.getDate()+7*Math.floor(t))},function(n){var r=rc.year(n).getDay();return Math.floor((rc.dayOfYear(n)+(r+t)%7)/7)-(r!==t)});rc[n+"s"]=r.range,rc[n+"s"].utc=r.utc.range,rc[n+"OfYear"]=function(n){var r=rc.year(n).getDay();return Math.floor((rc.dayOfYear(n)+(r+t)%7)/7)}}),rc.week=rc.sunday,rc.weeks=rc.sunday.range,rc.weeks.utc=rc.sunday.utc.range,rc.weekOfYear=rc.sundayOfYear;var ic={"-":"",_:" ",0:"0"},oc=/^\s*\d+/,ac=/^%/;Bo.locale=function(n){return{numberFormat:Pt(n),timeFormat:Ot(n)}};var cc=Bo.locale({decimal:".",thousands:",",grouping:[3],currency:["$",""],dateTime:"%a %b %e %X %Y",date:"%m/%d/%Y",time:"%H:%M:%S",periods:["AM","PM"],days:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],shortDays:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],months:["January","February","March","April","May","June","July","August","September","October","November","December"],shortMonths:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]});Bo.format=cc.numberFormat,Bo.geo={},cr.prototype={s:0,t:0,add:function(n){sr(n,this.t,sc),sr(sc.s,this.s,this),this.s?this.t+=sc.t:this.s=sc.t},reset:function(){this.s=this.t=0},valueOf:function(){return this.s}};var sc=new cr;Bo.geo.stream=function(n,t){n&&lc.hasOwnProperty(n.type)?lc[n.type](n,t):lr(n,t)};var lc={Feature:function(n,t){lr(n.geometry,t)},FeatureCollection:function(n,t){for(var r=n.features,e=-1,u=r.length;++e<u;)lr(r[e].geometry,t)}},fc={Sphere:function(n,t){t.sphere()},Point:function(n,t){n=n.coordinates,t.point(n[0],n[1],n[2])},MultiPoint:function(n,t){for(var r=n.coordinates,e=-1,u=r.length;++e<u;)n=r[e],t.point(n[0],n[1],n[2])},LineString:function(n,t){fr(n.coordinates,t,0)},MultiLineString:function(n,t){for(var r=n.coordinates,e=-1,u=r.length;++e<u;)fr(r[e],t,0)},Polygon:function(n,t){hr(n.coordinates,t)},MultiPolygon:function(n,t){for(var r=n.coordinates,e=-1,u=r.length;++e<u;)hr(r[e],t)},GeometryCollection:function(n,t){for(var r=n.geometries,e=-1,u=r.length;++e<u;)lr(r[e],t)}};Bo.geo.area=function(n){return hc=0,Bo.geo.stream(n,pc),hc};var hc,gc=new cr,pc={sphere:function(){hc+=4*ka},point:v,lineStart:v,lineEnd:v,polygonStart:function(){gc.reset(),pc.lineStart=gr},polygonEnd:function(){var n=2*gc;hc+=0>n?4*ka+n:n,pc.lineStart=pc.lineEnd=pc.point=v}};Bo.geo.bounds=function(){function n(n,t){x.push(M=[l=n,h=n]),f>t&&(f=t),t>g&&(g=t)}function t(t,r){var e=pr([t*za,r*za]);if(m){var u=dr(m,e),i=[u[1],-u[0],0],o=dr(i,u);xr(o),o=Mr(o);var c=t-p,s=c>0?1:-1,v=o[0]*La*s,d=ca(c)>180;if(d^(v>s*p&&s*t>v)){var y=o[1]*La;y>g&&(g=y)}else if(v=(v+360)%360-180,d^(v>s*p&&s*t>v)){var y=-o[1]*La;f>y&&(f=y)}else f>r&&(f=r),r>g&&(g=r);d?p>t?a(l,t)>a(l,h)&&(h=t):a(t,h)>a(l,h)&&(l=t):h>=l?(l>t&&(l=t),t>h&&(h=t)):t>p?a(l,t)>a(l,h)&&(h=t):a(t,h)>a(l,h)&&(l=t)}else n(t,r);m=e,p=t}function r(){_.point=t}function e(){M[0]=l,M[1]=h,_.point=n,m=null}function u(n,r){if(m){var e=n-p;y+=ca(e)>180?e+(e>0?360:-360):e}else v=n,d=r;pc.point(n,r),t(n,r)}function i(){pc.lineStart()}function o(){u(v,d),pc.lineEnd(),ca(y)>Ca&&(l=-(h=180)),M[0]=l,M[1]=h,m=null}function a(n,t){return(t-=n)<0?t+360:t}function c(n,t){return n[0]-t[0]}function s(n,t){return t[0]<=t[1]?t[0]<=n&&n<=t[1]:n<t[0]||t[1]<n}var l,f,h,g,p,v,d,m,y,x,M,_={point:n,lineStart:r,lineEnd:e,polygonStart:function(){_.point=u,_.lineStart=i,_.lineEnd=o,y=0,pc.polygonStart()},polygonEnd:function(){pc.polygonEnd(),_.point=n,_.lineStart=r,_.lineEnd=e,0>gc?(l=-(h=180),f=-(g=90)):y>Ca?g=90:-Ca>y&&(f=-90),M[0]=l,M[1]=h}};return function(n){g=h=-(l=f=1/0),x=[],Bo.geo.stream(n,_);var t=x.length;if(t){x.sort(c);for(var r,e=1,u=x[0],i=[u];t>e;++e)r=x[e],s(r[0],u)||s(r[1],u)?(a(u[0],r[1])>a(u[0],u[1])&&(u[1]=r[1]),a(r[0],u[1])>a(u[0],u[1])&&(u[0]=r[0])):i.push(u=r);for(var o,r,p=-1/0,t=i.length-1,e=0,u=i[t];t>=e;u=r,++e)r=i[e],(o=a(u[1],r[0]))>p&&(p=o,l=r[0],h=u[1])}return x=M=null,1/0===l||1/0===f?[[0/0,0/0],[0/0,0/0]]:[[l,f],[h,g]]
}}(),Bo.geo.centroid=function(n){vc=dc=mc=yc=xc=Mc=_c=bc=wc=Sc=kc=0,Bo.geo.stream(n,Ec);var t=wc,r=Sc,e=kc,u=t*t+r*r+e*e;return Na>u&&(t=Mc,r=_c,e=bc,Ca>dc&&(t=mc,r=yc,e=xc),u=t*t+r*r+e*e,Na>u)?[0/0,0/0]:[Math.atan2(r,t)*La,G(e/Math.sqrt(u))*La]};var vc,dc,mc,yc,xc,Mc,_c,bc,wc,Sc,kc,Ec={sphere:v,point:br,lineStart:Sr,lineEnd:kr,polygonStart:function(){Ec.lineStart=Er},polygonEnd:function(){Ec.lineStart=Sr}},Ac=Lr(Ar,Pr,jr,[-ka,-ka/2]),Cc=1e9;Bo.geo.clipExtent=function(){var n,t,r,e,u,i,o={stream:function(n){return u&&(u.valid=!1),u=i(n),u.valid=!0,u},extent:function(a){return arguments.length?(i=Or(n=+a[0][0],t=+a[0][1],r=+a[1][0],e=+a[1][1]),u&&(u.valid=!1,u=null),o):[[n,t],[r,e]]}};return o.extent([[0,0],[960,500]])},(Bo.geo.conicEqualArea=function(){return Yr(Zr)}).raw=Zr,Bo.geo.albers=function(){return Bo.geo.conicEqualArea().rotate([96,0]).center([-.6,38.7]).parallels([29.5,45.5]).scale(1070)},Bo.geo.albersUsa=function(){function n(n){var i=n[0],o=n[1];return t=null,r(i,o),t||(e(i,o),t)||u(i,o),t}var t,r,e,u,i=Bo.geo.albers(),o=Bo.geo.conicEqualArea().rotate([154,0]).center([-2,58.5]).parallels([55,65]),a=Bo.geo.conicEqualArea().rotate([157,0]).center([-3,19.9]).parallels([8,18]),c={point:function(n,r){t=[n,r]}};return n.invert=function(n){var t=i.scale(),r=i.translate(),e=(n[0]-r[0])/t,u=(n[1]-r[1])/t;return(u>=.12&&.234>u&&e>=-.425&&-.214>e?o:u>=.166&&.234>u&&e>=-.214&&-.115>e?a:i).invert(n)},n.stream=function(n){var t=i.stream(n),r=o.stream(n),e=a.stream(n);return{point:function(n,u){t.point(n,u),r.point(n,u),e.point(n,u)},sphere:function(){t.sphere(),r.sphere(),e.sphere()},lineStart:function(){t.lineStart(),r.lineStart(),e.lineStart()},lineEnd:function(){t.lineEnd(),r.lineEnd(),e.lineEnd()},polygonStart:function(){t.polygonStart(),r.polygonStart(),e.polygonStart()},polygonEnd:function(){t.polygonEnd(),r.polygonEnd(),e.polygonEnd()}}},n.precision=function(t){return arguments.length?(i.precision(t),o.precision(t),a.precision(t),n):i.precision()},n.scale=function(t){return arguments.length?(i.scale(t),o.scale(.35*t),a.scale(t),n.translate(i.translate())):i.scale()},n.translate=function(t){if(!arguments.length)return i.translate();var s=i.scale(),l=+t[0],f=+t[1];return r=i.translate(t).clipExtent([[l-.455*s,f-.238*s],[l+.455*s,f+.238*s]]).stream(c).point,e=o.translate([l-.307*s,f+.201*s]).clipExtent([[l-.425*s+Ca,f+.12*s+Ca],[l-.214*s-Ca,f+.234*s-Ca]]).stream(c).point,u=a.translate([l-.205*s,f+.212*s]).clipExtent([[l-.214*s+Ca,f+.166*s+Ca],[l-.115*s-Ca,f+.234*s-Ca]]).stream(c).point,n},n.scale(1070)};var Nc,zc,Lc,Tc,qc,Rc,Dc={point:v,lineStart:v,lineEnd:v,polygonStart:function(){zc=0,Dc.lineStart=Vr},polygonEnd:function(){Dc.lineStart=Dc.lineEnd=Dc.point=v,Nc+=ca(zc/2)}},Pc={point:$r,lineStart:v,lineEnd:v,polygonStart:v,polygonEnd:v},Uc={point:Jr,lineStart:Wr,lineEnd:Gr,polygonStart:function(){Uc.lineStart=Kr},polygonEnd:function(){Uc.point=Jr,Uc.lineStart=Wr,Uc.lineEnd=Gr}};Bo.geo.path=function(){function n(n){return n&&("function"==typeof a&&i.pointRadius(+a.apply(this,arguments)),o&&o.valid||(o=u(i)),Bo.geo.stream(n,o)),i.result()}function t(){return o=null,n}var r,e,u,i,o,a=4.5;return n.area=function(n){return Nc=0,Bo.geo.stream(n,u(Dc)),Nc},n.centroid=function(n){return mc=yc=xc=Mc=_c=bc=wc=Sc=kc=0,Bo.geo.stream(n,u(Uc)),kc?[wc/kc,Sc/kc]:bc?[Mc/bc,_c/bc]:xc?[mc/xc,yc/xc]:[0/0,0/0]},n.bounds=function(n){return qc=Rc=-(Lc=Tc=1/0),Bo.geo.stream(n,u(Pc)),[[Lc,Tc],[qc,Rc]]},n.projection=function(n){return arguments.length?(u=(r=n)?n.stream||te(n):At,t()):r},n.context=function(n){return arguments.length?(i=null==(e=n)?new Xr:new Qr(n),"function"!=typeof a&&i.pointRadius(a),t()):e},n.pointRadius=function(t){return arguments.length?(a="function"==typeof t?t:(i.pointRadius(+t),+t),n):a},n.projection(Bo.geo.albersUsa()).context(null)},Bo.geo.transform=function(n){return{stream:function(t){var r=new re(t);for(var e in n)r[e]=n[e];return r}}},re.prototype={point:function(n,t){this.stream.point(n,t)},sphere:function(){this.stream.sphere()},lineStart:function(){this.stream.lineStart()},lineEnd:function(){this.stream.lineEnd()},polygonStart:function(){this.stream.polygonStart()},polygonEnd:function(){this.stream.polygonEnd()}},Bo.geo.projection=ue,Bo.geo.projectionMutator=ie,(Bo.geo.equirectangular=function(){return ue(ae)}).raw=ae.invert=ae,Bo.geo.rotation=function(n){function t(t){return t=n(t[0]*za,t[1]*za),t[0]*=La,t[1]*=La,t}return n=se(n[0]%360*za,n[1]*za,n.length>2?n[2]*za:0),t.invert=function(t){return t=n.invert(t[0]*za,t[1]*za),t[0]*=La,t[1]*=La,t},t},ce.invert=ae,Bo.geo.circle=function(){function n(){var n="function"==typeof e?e.apply(this,arguments):e,t=se(-n[0]*za,-n[1]*za,0).invert,u=[];return r(null,null,1,{point:function(n,r){u.push(n=t(n,r)),n[0]*=La,n[1]*=La}}),{type:"Polygon",coordinates:[u]}}var t,r,e=[0,0],u=6;return n.origin=function(t){return arguments.length?(e=t,n):e},n.angle=function(e){return arguments.length?(r=ge((t=+e)*za,u*za),n):t},n.precision=function(e){return arguments.length?(r=ge(t*za,(u=+e)*za),n):u},n.angle(90)},Bo.geo.distance=function(n,t){var r,e=(t[0]-n[0])*za,u=n[1]*za,i=t[1]*za,o=Math.sin(e),a=Math.cos(e),c=Math.sin(u),s=Math.cos(u),l=Math.sin(i),f=Math.cos(i);return Math.atan2(Math.sqrt((r=f*o)*r+(r=s*l-c*f*a)*r),c*l+s*f*a)},Bo.geo.graticule=function(){function n(){return{type:"MultiLineString",coordinates:t()}}function t(){return Bo.range(Math.ceil(i/d)*d,u,d).map(h).concat(Bo.range(Math.ceil(s/m)*m,c,m).map(g)).concat(Bo.range(Math.ceil(e/p)*p,r,p).filter(function(n){return ca(n%d)>Ca}).map(l)).concat(Bo.range(Math.ceil(a/v)*v,o,v).filter(function(n){return ca(n%m)>Ca}).map(f))}var r,e,u,i,o,a,c,s,l,f,h,g,p=10,v=p,d=90,m=360,y=2.5;return n.lines=function(){return t().map(function(n){return{type:"LineString",coordinates:n}})},n.outline=function(){return{type:"Polygon",coordinates:[h(i).concat(g(c).slice(1),h(u).reverse().slice(1),g(s).reverse().slice(1))]}},n.extent=function(t){return arguments.length?n.majorExtent(t).minorExtent(t):n.minorExtent()},n.majorExtent=function(t){return arguments.length?(i=+t[0][0],u=+t[1][0],s=+t[0][1],c=+t[1][1],i>u&&(t=i,i=u,u=t),s>c&&(t=s,s=c,c=t),n.precision(y)):[[i,s],[u,c]]},n.minorExtent=function(t){return arguments.length?(e=+t[0][0],r=+t[1][0],a=+t[0][1],o=+t[1][1],e>r&&(t=e,e=r,r=t),a>o&&(t=a,a=o,o=t),n.precision(y)):[[e,a],[r,o]]},n.step=function(t){return arguments.length?n.majorStep(t).minorStep(t):n.minorStep()},n.majorStep=function(t){return arguments.length?(d=+t[0],m=+t[1],n):[d,m]},n.minorStep=function(t){return arguments.length?(p=+t[0],v=+t[1],n):[p,v]},n.precision=function(t){return arguments.length?(y=+t,l=ve(a,o,90),f=de(e,r,y),h=ve(s,c,90),g=de(i,u,y),n):y},n.majorExtent([[-180,-90+Ca],[180,90-Ca]]).minorExtent([[-180,-80-Ca],[180,80+Ca]])},Bo.geo.greatArc=function(){function n(){return{type:"LineString",coordinates:[t||e.apply(this,arguments),r||u.apply(this,arguments)]}}var t,r,e=me,u=ye;return n.distance=function(){return Bo.geo.distance(t||e.apply(this,arguments),r||u.apply(this,arguments))},n.source=function(r){return arguments.length?(e=r,t="function"==typeof r?null:r,n):e},n.target=function(t){return arguments.length?(u=t,r="function"==typeof t?null:t,n):u},n.precision=function(){return arguments.length?n:0},n},Bo.geo.interpolate=function(n,t){return xe(n[0]*za,n[1]*za,t[0]*za,t[1]*za)},Bo.geo.length=function(n){return jc=0,Bo.geo.stream(n,Hc),jc};var jc,Hc={sphere:v,point:v,lineStart:Me,lineEnd:v,polygonStart:v,polygonEnd:v},Fc=_e(function(n){return Math.sqrt(2/(1+n))},function(n){return 2*Math.asin(n/2)});(Bo.geo.azimuthalEqualArea=function(){return ue(Fc)}).raw=Fc;var Oc=_e(function(n){var t=Math.acos(n);return t&&t/Math.sin(t)},At);(Bo.geo.azimuthalEquidistant=function(){return ue(Oc)}).raw=Oc,(Bo.geo.conicConformal=function(){return Yr(be)}).raw=be,(Bo.geo.conicEquidistant=function(){return Yr(we)}).raw=we;var Ic=_e(function(n){return 1/n},Math.atan);(Bo.geo.gnomonic=function(){return ue(Ic)}).raw=Ic,Se.invert=function(n,t){return[n,2*Math.atan(Math.exp(t))-Aa]},(Bo.geo.mercator=function(){return ke(Se)}).raw=Se;var Yc=_e(function(){return 1},Math.asin);(Bo.geo.orthographic=function(){return ue(Yc)}).raw=Yc;var Zc=_e(function(n){return 1/(1+n)},function(n){return 2*Math.atan(n)});(Bo.geo.stereographic=function(){return ue(Zc)}).raw=Zc,Ee.invert=function(n,t){return[-t,2*Math.atan(Math.exp(n))-Aa]},(Bo.geo.transverseMercator=function(){var n=ke(Ee),t=n.center,r=n.rotate;return n.center=function(n){return n?t([-n[1],n[0]]):(n=t(),[-n[1],n[0]])},n.rotate=function(n){return n?r([n[0],n[1],n.length>2?n[2]+90:90]):(n=r(),[n[0],n[1],n[2]-90])},n.rotate([0,0])}).raw=Ee,Bo.geom={},Bo.geom.hull=function(n){function t(n){if(n.length<3)return[];var t,u=Et(r),i=Et(e),o=n.length,a=[],c=[];for(t=0;o>t;t++)a.push([+u.call(this,n[t],t),+i.call(this,n[t],t),t]);for(a.sort(ze),t=0;o>t;t++)c.push([a[t][0],-a[t][1]]);var s=Ne(a),l=Ne(c),f=l[0]===s[0],h=l[l.length-1]===s[s.length-1],g=[];for(t=s.length-1;t>=0;--t)g.push(n[a[s[t]][2]]);for(t=+f;t<l.length-h;++t)g.push(n[a[l[t]][2]]);return g}var r=Ae,e=Ce;return arguments.length?t(n):(t.x=function(n){return arguments.length?(r=n,t):r},t.y=function(n){return arguments.length?(e=n,t):e},t)},Bo.geom.polygon=function(n){return ga(n,Vc),n};var Vc=Bo.geom.polygon.prototype=[];Vc.area=function(){for(var n,t=-1,r=this.length,e=this[r-1],u=0;++t<r;)n=e,e=this[t],u+=n[1]*e[0]-n[0]*e[1];return.5*u},Vc.centroid=function(n){var t,r,e=-1,u=this.length,i=0,o=0,a=this[u-1];for(arguments.length||(n=-1/(6*this.area()));++e<u;)t=a,a=this[e],r=t[0]*a[1]-a[0]*t[1],i+=(t[0]+a[0])*r,o+=(t[1]+a[1])*r;return[i*n,o*n]},Vc.clip=function(n){for(var t,r,e,u,i,o,a=qe(n),c=-1,s=this.length-qe(this),l=this[s-1];++c<s;){for(t=n.slice(),n.length=0,u=this[c],i=t[(e=t.length-a)-1],r=-1;++r<e;)o=t[r],Le(o,l,u)?(Le(i,l,u)||n.push(Te(i,o,l,u)),n.push(o)):Le(i,l,u)&&n.push(Te(i,o,l,u)),i=o;a&&n.push(n[0]),l=u}return n};var $c,Xc,Bc,Jc,Wc,Gc=[],Kc=[];Oe.prototype.prepare=function(){for(var n,t=this.edges,r=t.length;r--;)n=t[r].edge,n.b&&n.a||t.splice(r,1);return t.sort(Ye),t.length},Qe.prototype={start:function(){return this.edge.l===this.site?this.edge.a:this.edge.b},end:function(){return this.edge.l===this.site?this.edge.b:this.edge.a}},nu.prototype={insert:function(n,t){var r,e,u;if(n){if(t.P=n,t.N=n.N,n.N&&(n.N.P=t),n.N=t,n.R){for(n=n.R;n.L;)n=n.L;n.L=t}else n.R=t;r=n}else this._?(n=uu(this._),t.P=null,t.N=n,n.P=n.L=t,r=n):(t.P=t.N=null,this._=t,r=null);for(t.L=t.R=null,t.U=r,t.C=!0,n=t;r&&r.C;)e=r.U,r===e.L?(u=e.R,u&&u.C?(r.C=u.C=!1,e.C=!0,n=e):(n===r.R&&(ru(this,r),n=r,r=n.U),r.C=!1,e.C=!0,eu(this,e))):(u=e.L,u&&u.C?(r.C=u.C=!1,e.C=!0,n=e):(n===r.L&&(eu(this,r),n=r,r=n.U),r.C=!1,e.C=!0,ru(this,e))),r=n.U;this._.C=!1},remove:function(n){n.N&&(n.N.P=n.P),n.P&&(n.P.N=n.N),n.N=n.P=null;var t,r,e,u=n.U,i=n.L,o=n.R;if(r=i?o?uu(o):i:o,u?u.L===n?u.L=r:u.R=r:this._=r,i&&o?(e=r.C,r.C=n.C,r.L=i,i.U=r,r!==o?(u=r.U,r.U=n.U,n=r.R,u.L=n,r.R=o,o.U=r):(r.U=u,u=r,n=r.R)):(e=n.C,n=r),n&&(n.U=u),!e){if(n&&n.C)return n.C=!1,void 0;do{if(n===this._)break;if(n===u.L){if(t=u.R,t.C&&(t.C=!1,u.C=!0,ru(this,u),t=u.R),t.L&&t.L.C||t.R&&t.R.C){t.R&&t.R.C||(t.L.C=!1,t.C=!0,eu(this,t),t=u.R),t.C=u.C,u.C=t.R.C=!1,ru(this,u),n=this._;break}}else if(t=u.L,t.C&&(t.C=!1,u.C=!0,eu(this,u),t=u.L),t.L&&t.L.C||t.R&&t.R.C){t.L&&t.L.C||(t.R.C=!1,t.C=!0,ru(this,t),t=u.L),t.C=u.C,u.C=t.L.C=!1,eu(this,u),n=this._;break}t.C=!0,n=u,u=u.U}while(!n.C);n&&(n.C=!1)}}},Bo.geom.voronoi=function(n){function t(n){var t=new Array(n.length),e=a[0][0],u=a[0][1],i=a[1][0],o=a[1][1];return iu(r(n),a).cells.forEach(function(r,a){var c=r.edges,s=r.site,l=t[a]=c.length?c.map(function(n){var t=n.start();return[t.x,t.y]}):s.x>=e&&s.x<=i&&s.y>=u&&s.y<=o?[[e,o],[i,o],[i,u],[e,u]]:[];l.point=n[a]}),t}function r(n){return n.map(function(n,t){return{x:Math.round(i(n,t)/Ca)*Ca,y:Math.round(o(n,t)/Ca)*Ca,i:t}})}var e=Ae,u=Ce,i=e,o=u,a=Qc;return n?t(n):(t.links=function(n){return iu(r(n)).edges.filter(function(n){return n.l&&n.r}).map(function(t){return{source:n[t.l.i],target:n[t.r.i]}})},t.triangles=function(n){var t=[];return iu(r(n)).cells.forEach(function(r,e){for(var u,i,o=r.site,a=r.edges.sort(Ye),c=-1,s=a.length,l=a[s-1].edge,f=l.l===o?l.r:l.l;++c<s;)u=l,i=f,l=a[c].edge,f=l.l===o?l.r:l.l,e<i.i&&e<f.i&&au(o,i,f)<0&&t.push([n[e],n[i.i],n[f.i]])}),t},t.x=function(n){return arguments.length?(i=Et(e=n),t):e},t.y=function(n){return arguments.length?(o=Et(u=n),t):u},t.clipExtent=function(n){return arguments.length?(a=null==n?Qc:n,t):a===Qc?null:a},t.size=function(n){return arguments.length?t.clipExtent(n&&[[0,0],n]):a===Qc?null:a&&a[1]},t)};var Qc=[[-1e6,-1e6],[1e6,1e6]];Bo.geom.delaunay=function(n){return Bo.geom.voronoi().triangles(n)},Bo.geom.quadtree=function(n,t,r,e,u){function i(n){function i(n,t,r,e,u,i,o,a){if(!isNaN(r)&&!isNaN(e))if(n.leaf){var c=n.x,l=n.y;if(null!=c)if(ca(c-r)+ca(l-e)<.01)s(n,t,r,e,u,i,o,a);else{var f=n.point;n.x=n.y=n.point=null,s(n,f,c,l,u,i,o,a),s(n,t,r,e,u,i,o,a)}else n.x=r,n.y=e,n.point=t}else s(n,t,r,e,u,i,o,a)}function s(n,t,r,e,u,o,a,c){var s=.5*(u+a),l=.5*(o+c),f=r>=s,h=e>=l,g=(h<<1)+f;n.leaf=!1,n=n.nodes[g]||(n.nodes[g]=lu()),f?u=s:a=s,h?o=l:c=l,i(n,t,r,e,u,o,a,c)}var l,f,h,g,p,v,d,m,y,x=Et(a),M=Et(c);if(null!=t)v=t,d=r,m=e,y=u;else if(m=y=-(v=d=1/0),f=[],h=[],p=n.length,o)for(g=0;p>g;++g)l=n[g],l.x<v&&(v=l.x),l.y<d&&(d=l.y),l.x>m&&(m=l.x),l.y>y&&(y=l.y),f.push(l.x),h.push(l.y);else for(g=0;p>g;++g){var _=+x(l=n[g],g),b=+M(l,g);v>_&&(v=_),d>b&&(d=b),_>m&&(m=_),b>y&&(y=b),f.push(_),h.push(b)}var w=m-v,S=y-d;w>S?y=d+w:m=v+S;var k=lu();if(k.add=function(n){i(k,n,+x(n,++g),+M(n,g),v,d,m,y)},k.visit=function(n){fu(n,k,v,d,m,y)},g=-1,null==t){for(;++g<p;)i(k,n[g],f[g],h[g],v,d,m,y);--g}else n.forEach(k.add);return f=h=n=l=null,k}var o,a=Ae,c=Ce;return(o=arguments.length)?(a=cu,c=su,3===o&&(u=r,e=t,r=t=0),i(n)):(i.x=function(n){return arguments.length?(a=n,i):a},i.y=function(n){return arguments.length?(c=n,i):c},i.extent=function(n){return arguments.length?(null==n?t=r=e=u=null:(t=+n[0][0],r=+n[0][1],e=+n[1][0],u=+n[1][1]),i):null==t?null:[[t,r],[e,u]]},i.size=function(n){return arguments.length?(null==n?t=r=e=u=null:(t=r=0,e=+n[0],u=+n[1]),i):null==t?null:[e-t,u-r]},i)},Bo.interpolateRgb=hu,Bo.interpolateObject=gu,Bo.interpolateNumber=pu,Bo.interpolateString=vu;var ns=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,ts=new RegExp(ns.source,"g");Bo.interpolate=du,Bo.interpolators=[function(n,t){var r=typeof t;return("string"===r?$a.has(t)||/^(#|rgb\(|hsl\()/.test(t)?hu:vu:t instanceof rt?hu:Array.isArray(t)?mu:"object"===r&&isNaN(t)?gu:pu)(n,t)}],Bo.interpolateArray=mu;var rs=function(){return At},es=Bo.map({linear:rs,poly:Su,quad:function(){return _u},cubic:function(){return bu},sin:function(){return ku},exp:function(){return Eu},circle:function(){return Au},elastic:Cu,back:Nu,bounce:function(){return zu}}),us=Bo.map({"in":At,out:xu,"in-out":Mu,"out-in":function(n){return Mu(xu(n))}});Bo.ease=function(n){var t=n.indexOf("-"),r=t>=0?n.substring(0,t):n,e=t>=0?n.substring(t+1):"in";return r=es.get(r)||rs,e=us.get(e)||At,yu(e(r.apply(null,Jo.call(arguments,1))))},Bo.interpolateHcl=Lu,Bo.interpolateHsl=Tu,Bo.interpolateLab=qu,Bo.interpolateRound=Ru,Bo.transform=function(n){var t=Go.createElementNS(Bo.ns.prefix.svg,"g");return(Bo.transform=function(n){if(null!=n){t.setAttribute("transform",n);var r=t.transform.baseVal.consolidate()}return new Du(r?r.matrix:is)})(n)},Du.prototype.toString=function(){return"translate("+this.translate+")rotate("+this.rotate+")skewX("+this.skew+")scale("+this.scale+")"};var is={a:1,b:0,c:0,d:1,e:0,f:0};Bo.interpolateTransform=Hu,Bo.layout={},Bo.layout.bundle=function(){return function(n){for(var t=[],r=-1,e=n.length;++r<e;)t.push(Iu(n[r]));return t}},Bo.layout.chord=function(){function n(){var n,s,f,h,g,p={},v=[],d=Bo.range(i),m=[];for(r=[],e=[],n=0,h=-1;++h<i;){for(s=0,g=-1;++g<i;)s+=u[h][g];v.push(s),m.push(Bo.range(i)),n+=s}for(o&&d.sort(function(n,t){return o(v[n],v[t])}),a&&m.forEach(function(n,t){n.sort(function(n,r){return a(u[t][n],u[t][r])})}),n=(Ea-l*i)/n,s=0,h=-1;++h<i;){for(f=s,g=-1;++g<i;){var y=d[h],x=m[y][g],M=u[y][x],_=s,b=s+=M*n;p[y+"-"+x]={index:y,subindex:x,startAngle:_,endAngle:b,value:M}}e[y]={index:y,startAngle:f,endAngle:s,value:(s-f)/n},s+=l}for(h=-1;++h<i;)for(g=h-1;++g<i;){var w=p[h+"-"+g],S=p[g+"-"+h];(w.value||S.value)&&r.push(w.value<S.value?{source:S,target:w}:{source:w,target:S})}c&&t()}function t(){r.sort(function(n,t){return c((n.source.value+n.target.value)/2,(t.source.value+t.target.value)/2)})}var r,e,u,i,o,a,c,s={},l=0;return s.matrix=function(n){return arguments.length?(i=(u=n)&&u.length,r=e=null,s):u},s.padding=function(n){return arguments.length?(l=n,r=e=null,s):l},s.sortGroups=function(n){return arguments.length?(o=n,r=e=null,s):o},s.sortSubgroups=function(n){return arguments.length?(a=n,r=null,s):a},s.sortChords=function(n){return arguments.length?(c=n,r&&t(),s):c},s.chords=function(){return r||n(),r},s.groups=function(){return e||n(),e},s},Bo.layout.force=function(){function n(n){return function(t,r,e,u){if(t.point!==n){var i=t.cx-n.x,o=t.cy-n.y,a=u-r,c=i*i+o*o;if(c>a*a/d){if(p>c){var s=t.charge/c;n.px-=i*s,n.py-=o*s}return!0}if(t.point&&c&&p>c){var s=t.pointCharge/c;n.px-=i*s,n.py-=o*s}}return!t.charge}}function t(n){n.px=Bo.event.x,n.py=Bo.event.y,a.resume()}var r,e,u,i,o,a={},c=Bo.dispatch("start","tick","end"),s=[1,1],l=.9,f=os,h=as,g=-30,p=cs,v=.1,d=.64,m=[],y=[];return a.tick=function(){if((e*=.99)<.005)return c.end({type:"end",alpha:e=0}),!0;var t,r,a,f,h,p,d,x,M,_=m.length,b=y.length;for(r=0;b>r;++r)a=y[r],f=a.source,h=a.target,x=h.x-f.x,M=h.y-f.y,(p=x*x+M*M)&&(p=e*i[r]*((p=Math.sqrt(p))-u[r])/p,x*=p,M*=p,h.x-=x*(d=f.weight/(h.weight+f.weight)),h.y-=M*d,f.x+=x*(d=1-d),f.y+=M*d);if((d=e*v)&&(x=s[0]/2,M=s[1]/2,r=-1,d))for(;++r<_;)a=m[r],a.x+=(x-a.x)*d,a.y+=(M-a.y)*d;if(g)for(Ju(t=Bo.geom.quadtree(m),e,o),r=-1;++r<_;)(a=m[r]).fixed||t.visit(n(a));for(r=-1;++r<_;)a=m[r],a.fixed?(a.x=a.px,a.y=a.py):(a.x-=(a.px-(a.px=a.x))*l,a.y-=(a.py-(a.py=a.y))*l);c.tick({type:"tick",alpha:e})},a.nodes=function(n){return arguments.length?(m=n,a):m},a.links=function(n){return arguments.length?(y=n,a):y},a.size=function(n){return arguments.length?(s=n,a):s},a.linkDistance=function(n){return arguments.length?(f="function"==typeof n?n:+n,a):f},a.distance=a.linkDistance,a.linkStrength=function(n){return arguments.length?(h="function"==typeof n?n:+n,a):h},a.friction=function(n){return arguments.length?(l=+n,a):l},a.charge=function(n){return arguments.length?(g="function"==typeof n?n:+n,a):g},a.chargeDistance=function(n){return arguments.length?(p=n*n,a):Math.sqrt(p)},a.gravity=function(n){return arguments.length?(v=+n,a):v},a.theta=function(n){return arguments.length?(d=n*n,a):Math.sqrt(d)},a.alpha=function(n){return arguments.length?(n=+n,e?e=n>0?n:0:n>0&&(c.start({type:"start",alpha:e=n}),Bo.timer(a.tick)),a):e},a.start=function(){function n(n,e){if(!r){for(r=new Array(c),a=0;c>a;++a)r[a]=[];for(a=0;s>a;++a){var u=y[a];r[u.source.index].push(u.target),r[u.target.index].push(u.source)}}for(var i,o=r[t],a=-1,s=o.length;++a<s;)if(!isNaN(i=o[a][n]))return i;return Math.random()*e}var t,r,e,c=m.length,l=y.length,p=s[0],v=s[1];for(t=0;c>t;++t)(e=m[t]).index=t,e.weight=0;for(t=0;l>t;++t)e=y[t],"number"==typeof e.source&&(e.source=m[e.source]),"number"==typeof e.target&&(e.target=m[e.target]),++e.source.weight,++e.target.weight;for(t=0;c>t;++t)e=m[t],isNaN(e.x)&&(e.x=n("x",p)),isNaN(e.y)&&(e.y=n("y",v)),isNaN(e.px)&&(e.px=e.x),isNaN(e.py)&&(e.py=e.y);if(u=[],"function"==typeof f)for(t=0;l>t;++t)u[t]=+f.call(this,y[t],t);else for(t=0;l>t;++t)u[t]=f;if(i=[],"function"==typeof h)for(t=0;l>t;++t)i[t]=+h.call(this,y[t],t);else for(t=0;l>t;++t)i[t]=h;if(o=[],"function"==typeof g)for(t=0;c>t;++t)o[t]=+g.call(this,m[t],t);else for(t=0;c>t;++t)o[t]=g;return a.resume()},a.resume=function(){return a.alpha(.1)},a.stop=function(){return a.alpha(0)},a.drag=function(){return r||(r=Bo.behavior.drag().origin(At).on("dragstart.force",Vu).on("drag.force",t).on("dragend.force",$u)),arguments.length?(this.on("mouseover.force",Xu).on("mouseout.force",Bu).call(r),void 0):r},Bo.rebind(a,c,"on")};var os=20,as=1,cs=1/0;Bo.layout.hierarchy=function(){function n(u){var i,o=[u],a=[];for(u.depth=0;null!=(i=o.pop());)if(a.push(i),(s=r.call(n,i,i.depth))&&(c=s.length)){for(var c,s,l;--c>=0;)o.push(l=s[c]),l.parent=i,l.depth=i.depth+1;e&&(i.value=0),i.children=s}else e&&(i.value=+e.call(n,i,i.depth)||0),delete i.children;return Ku(u,function(n){var r,u;t&&(r=n.children)&&r.sort(t),e&&(u=n.parent)&&(u.value+=n.value)}),a}var t=ti,r=Qu,e=ni;return n.sort=function(r){return arguments.length?(t=r,n):t},n.children=function(t){return arguments.length?(r=t,n):r},n.value=function(t){return arguments.length?(e=t,n):e},n.revalue=function(t){return e&&(Gu(t,function(n){n.children&&(n.value=0)}),Ku(t,function(t){var r;t.children||(t.value=+e.call(n,t,t.depth)||0),(r=t.parent)&&(r.value+=t.value)})),t},n},Bo.layout.partition=function(){function n(t,r,e,u){var i=t.children;if(t.x=r,t.y=t.depth*u,t.dx=e,t.dy=u,i&&(o=i.length)){var o,a,c,s=-1;for(e=t.value?e/t.value:0;++s<o;)n(a=i[s],r,c=a.value*e,u),r+=c}}function t(n){var r=n.children,e=0;if(r&&(u=r.length))for(var u,i=-1;++i<u;)e=Math.max(e,t(r[i]));return 1+e}function r(r,i){var o=e.call(this,r,i);return n(o[0],0,u[0],u[1]/t(o[0])),o}var e=Bo.layout.hierarchy(),u=[1,1];return r.size=function(n){return arguments.length?(u=n,r):u},Wu(r,e)},Bo.layout.pie=function(){function n(i){var o=i.map(function(r,e){return+t.call(n,r,e)}),a=+("function"==typeof e?e.apply(this,arguments):e),c=(("function"==typeof u?u.apply(this,arguments):u)-a)/Bo.sum(o),s=Bo.range(i.length);null!=r&&s.sort(r===ss?function(n,t){return o[t]-o[n]}:function(n,t){return r(i[n],i[t])});var l=[];return s.forEach(function(n){var t;l[n]={data:i[n],value:t=o[n],startAngle:a,endAngle:a+=t*c}}),l}var t=Number,r=ss,e=0,u=Ea;return n.value=function(r){return arguments.length?(t=r,n):t},n.sort=function(t){return arguments.length?(r=t,n):r},n.startAngle=function(t){return arguments.length?(e=t,n):e},n.endAngle=function(t){return arguments.length?(u=t,n):u},n};var ss={};Bo.layout.stack=function(){function n(a,c){var s=a.map(function(r,e){return t.call(n,r,e)}),l=s.map(function(t){return t.map(function(t,r){return[i.call(n,t,r),o.call(n,t,r)]})}),f=r.call(n,l,c);s=Bo.permute(s,f),l=Bo.permute(l,f);var h,g,p,v=e.call(n,l,c),d=s.length,m=s[0].length;for(g=0;m>g;++g)for(u.call(n,s[0][g],p=v[g],l[0][g][1]),h=1;d>h;++h)u.call(n,s[h][g],p+=l[h-1][g][1],l[h][g][1]);return a}var t=At,r=oi,e=ai,u=ii,i=ei,o=ui;return n.values=function(r){return arguments.length?(t=r,n):t},n.order=function(t){return arguments.length?(r="function"==typeof t?t:ls.get(t)||oi,n):r},n.offset=function(t){return arguments.length?(e="function"==typeof t?t:fs.get(t)||ai,n):e},n.x=function(t){return arguments.length?(i=t,n):i},n.y=function(t){return arguments.length?(o=t,n):o},n.out=function(t){return arguments.length?(u=t,n):u},n};var ls=Bo.map({"inside-out":function(n){var t,r,e=n.length,u=n.map(ci),i=n.map(si),o=Bo.range(e).sort(function(n,t){return u[n]-u[t]}),a=0,c=0,s=[],l=[];for(t=0;e>t;++t)r=o[t],c>a?(a+=i[r],s.push(r)):(c+=i[r],l.push(r));return l.reverse().concat(s)},reverse:function(n){return Bo.range(n.length).reverse()},"default":oi}),fs=Bo.map({silhouette:function(n){var t,r,e,u=n.length,i=n[0].length,o=[],a=0,c=[];for(r=0;i>r;++r){for(t=0,e=0;u>t;t++)e+=n[t][r][1];e>a&&(a=e),o.push(e)}for(r=0;i>r;++r)c[r]=(a-o[r])/2;return c},wiggle:function(n){var t,r,e,u,i,o,a,c,s,l=n.length,f=n[0],h=f.length,g=[];for(g[0]=c=s=0,r=1;h>r;++r){for(t=0,u=0;l>t;++t)u+=n[t][r][1];for(t=0,i=0,a=f[r][0]-f[r-1][0];l>t;++t){for(e=0,o=(n[t][r][1]-n[t][r-1][1])/(2*a);t>e;++e)o+=(n[e][r][1]-n[e][r-1][1])/a;i+=o*n[t][r][1]}g[r]=c-=u?i/u*a:0,s>c&&(s=c)}for(r=0;h>r;++r)g[r]-=s;return g},expand:function(n){var t,r,e,u=n.length,i=n[0].length,o=1/u,a=[];for(r=0;i>r;++r){for(t=0,e=0;u>t;t++)e+=n[t][r][1];if(e)for(t=0;u>t;t++)n[t][r][1]/=e;else for(t=0;u>t;t++)n[t][r][1]=o}for(r=0;i>r;++r)a[r]=0;return a},zero:ai});Bo.layout.histogram=function(){function n(n,i){for(var o,a,c=[],s=n.map(r,this),l=e.call(this,s,i),f=u.call(this,l,s,i),i=-1,h=s.length,g=f.length-1,p=t?1:1/h;++i<g;)o=c[i]=[],o.dx=f[i+1]-(o.x=f[i]),o.y=0;if(g>0)for(i=-1;++i<h;)a=s[i],a>=l[0]&&a<=l[1]&&(o=c[Bo.bisect(f,a,1,g)-1],o.y+=p,o.push(n[i]));return c}var t=!0,r=Number,e=gi,u=fi;return n.value=function(t){return arguments.length?(r=t,n):r},n.range=function(t){return arguments.length?(e=Et(t),n):e},n.bins=function(t){return arguments.length?(u="number"==typeof t?function(n){return hi(n,t)}:Et(t),n):u},n.frequency=function(r){return arguments.length?(t=!!r,n):t},n},Bo.layout.pack=function(){function n(n,i){var o=r.call(this,n,i),a=o[0],c=u[0],s=u[1],l=null==t?Math.sqrt:"function"==typeof t?t:function(){return t};if(a.x=a.y=0,Ku(a,function(n){n.r=+l(n.value)}),Ku(a,yi),e){var f=e*(t?1:Math.max(2*a.r/c,2*a.r/s))/2;Ku(a,function(n){n.r+=f}),Ku(a,yi),Ku(a,function(n){n.r-=f})}return _i(a,c/2,s/2,t?1:1/Math.max(2*a.r/c,2*a.r/s)),o}var t,r=Bo.layout.hierarchy().sort(pi),e=0,u=[1,1];return n.size=function(t){return arguments.length?(u=t,n):u},n.radius=function(r){return arguments.length?(t=null==r||"function"==typeof r?r:+r,n):t},n.padding=function(t){return arguments.length?(e=+t,n):e},Wu(n,r)},Bo.layout.tree=function(){function n(n,u){var l=o.call(this,n,u),f=l[0],h=t(f);if(Ku(h,r),h.parent.m=-h.z,Gu(h,e),s)Gu(f,i);else{var g=f,p=f,v=f;Gu(f,function(n){n.x<g.x&&(g=n),n.x>p.x&&(p=n),n.depth>v.depth&&(v=n)});var d=a(g,p)/2-g.x,m=c[0]/(p.x+a(p,g)/2+d),y=c[1]/(v.depth||1);Gu(f,function(n){n.x=(n.x+d)*m,n.y=n.depth*y})}return l}function t(n){for(var t,r={A:null,children:[n]},e=[r];null!=(t=e.pop());)for(var u,i=t.children,o=0,a=i.length;a>o;++o)e.push((i[o]=u={_:i[o],parent:t,children:(u=i[o].children)&&u.slice()||[],A:null,a:null,z:0,m:0,c:0,s:0,t:null,i:o}).a=u);return r.children[0]}function r(n){var t=n.children,r=n.parent.children,e=n.i?r[n.i-1]:null;if(t.length){Ai(n);var i=(t[0].z+t[t.length-1].z)/2;e?(n.z=e.z+a(n._,e._),n.m=n.z-i):n.z=i}else e&&(n.z=e.z+a(n._,e._));n.parent.A=u(n,e,n.parent.A||r[0])}function e(n){n._.x=n.z+n.parent.m,n.m+=n.parent.m}function u(n,t,r){if(t){for(var e,u=n,i=n,o=t,c=u.parent.children[0],s=u.m,l=i.m,f=o.m,h=c.m;o=ki(o),u=Si(u),o&&u;)c=Si(c),i=ki(i),i.a=n,e=o.z+f-u.z-s+a(o._,u._),e>0&&(Ei(Ci(o,n,r),n,e),s+=e,l+=e),f+=o.m,s+=u.m,h+=c.m,l+=i.m;o&&!ki(i)&&(i.t=o,i.m+=f-l),u&&!Si(c)&&(c.t=u,c.m+=s-h,r=n)}return r}function i(n){n.x*=c[0],n.y=n.depth*c[1]}var o=Bo.layout.hierarchy().sort(null).value(null),a=wi,c=[1,1],s=null;return n.separation=function(t){return arguments.length?(a=t,n):a},n.size=function(t){return arguments.length?(s=null==(c=t)?i:null,n):s?null:c},n.nodeSize=function(t){return arguments.length?(s=null==(c=t)?null:i,n):s?c:null},Wu(n,o)},Bo.layout.cluster=function(){function n(n,i){var o,a=t.call(this,n,i),c=a[0],s=0;Ku(c,function(n){var t=n.children;t&&t.length?(n.x=zi(t),n.y=Ni(t)):(n.x=o?s+=r(n,o):0,n.y=0,o=n)});var l=Li(c),f=Ti(c),h=l.x-r(l,f)/2,g=f.x+r(f,l)/2;return Ku(c,u?function(n){n.x=(n.x-c.x)*e[0],n.y=(c.y-n.y)*e[1]}:function(n){n.x=(n.x-h)/(g-h)*e[0],n.y=(1-(c.y?n.y/c.y:1))*e[1]}),a}var t=Bo.layout.hierarchy().sort(null).value(null),r=wi,e=[1,1],u=!1;return n.separation=function(t){return arguments.length?(r=t,n):r},n.size=function(t){return arguments.length?(u=null==(e=t),n):u?null:e},n.nodeSize=function(t){return arguments.length?(u=null!=(e=t),n):u?e:null},Wu(n,t)},Bo.layout.treemap=function(){function n(n,t){for(var r,e,u=-1,i=n.length;++u<i;)e=(r=n[u]).value*(0>t?0:t),r.area=isNaN(e)||0>=e?0:e}function t(r){var i=r.children;if(i&&i.length){var o,a,c,s=f(r),l=[],h=i.slice(),p=1/0,v="slice"===g?s.dx:"dice"===g?s.dy:"slice-dice"===g?1&r.depth?s.dy:s.dx:Math.min(s.dx,s.dy);for(n(h,s.dx*s.dy/r.value),l.area=0;(c=h.length)>0;)l.push(o=h[c-1]),l.area+=o.area,"squarify"!==g||(a=e(l,v))<=p?(h.pop(),p=a):(l.area-=l.pop().area,u(l,v,s,!1),v=Math.min(s.dx,s.dy),l.length=l.area=0,p=1/0);l.length&&(u(l,v,s,!0),l.length=l.area=0),i.forEach(t)}}function r(t){var e=t.children;if(e&&e.length){var i,o=f(t),a=e.slice(),c=[];for(n(a,o.dx*o.dy/t.value),c.area=0;i=a.pop();)c.push(i),c.area+=i.area,null!=i.z&&(u(c,i.z?o.dx:o.dy,o,!a.length),c.length=c.area=0);e.forEach(r)}}function e(n,t){for(var r,e=n.area,u=0,i=1/0,o=-1,a=n.length;++o<a;)(r=n[o].area)&&(i>r&&(i=r),r>u&&(u=r));return e*=e,t*=t,e?Math.max(t*u*p/e,e/(t*i*p)):1/0}function u(n,t,r,e){var u,i=-1,o=n.length,a=r.x,s=r.y,l=t?c(n.area/t):0;if(t==r.dx){for((e||l>r.dy)&&(l=r.dy);++i<o;)u=n[i],u.x=a,u.y=s,u.dy=l,a+=u.dx=Math.min(r.x+r.dx-a,l?c(u.area/l):0);u.z=!0,u.dx+=r.x+r.dx-a,r.y+=l,r.dy-=l}else{for((e||l>r.dx)&&(l=r.dx);++i<o;)u=n[i],u.x=a,u.y=s,u.dx=l,s+=u.dy=Math.min(r.y+r.dy-s,l?c(u.area/l):0);u.z=!1,u.dy+=r.y+r.dy-s,r.x+=l,r.dx-=l}}function i(e){var u=o||a(e),i=u[0];return i.x=0,i.y=0,i.dx=s[0],i.dy=s[1],o&&a.revalue(i),n([i],i.dx*i.dy/i.value),(o?r:t)(i),h&&(o=u),u}var o,a=Bo.layout.hierarchy(),c=Math.round,s=[1,1],l=null,f=qi,h=!1,g="squarify",p=.5*(1+Math.sqrt(5));return i.size=function(n){return arguments.length?(s=n,i):s},i.padding=function(n){function t(t){var r=n.call(i,t,t.depth);return null==r?qi(t):Ri(t,"number"==typeof r?[r,r,r,r]:r)}function r(t){return Ri(t,n)}if(!arguments.length)return l;var e;return f=null==(l=n)?qi:"function"==(e=typeof n)?t:"number"===e?(n=[n,n,n,n],r):r,i},i.round=function(n){return arguments.length?(c=n?Math.round:Number,i):c!=Number},i.sticky=function(n){return arguments.length?(h=n,o=null,i):h},i.ratio=function(n){return arguments.length?(p=n,i):p},i.mode=function(n){return arguments.length?(g=n+"",i):g},Wu(i,a)},Bo.random={normal:function(n,t){var r=arguments.length;return 2>r&&(t=1),1>r&&(n=0),function(){var r,e,u;do r=2*Math.random()-1,e=2*Math.random()-1,u=r*r+e*e;while(!u||u>1);return n+t*r*Math.sqrt(-2*Math.log(u)/u)}},logNormal:function(){var n=Bo.random.normal.apply(Bo,arguments);return function(){return Math.exp(n())}},bates:function(n){var t=Bo.random.irwinHall(n);return function(){return t()/n}},irwinHall:function(n){return function(){for(var t=0,r=0;n>r;r++)t+=Math.random();return t}}},Bo.scale={};var hs={floor:At,ceil:At};Bo.scale.linear=function(){return Oi([0,1],[0,1],du,!1)};var gs={s:1,g:1,p:1,r:1,e:1};Bo.scale.log=function(){return Ji(Bo.scale.linear().domain([0,1]),10,!0,[1,10])};var ps=Bo.format(".0e"),vs={floor:function(n){return-Math.ceil(-n)},ceil:function(n){return-Math.floor(-n)}};Bo.scale.pow=function(){return Wi(Bo.scale.linear(),1,[0,1])},Bo.scale.sqrt=function(){return Bo.scale.pow().exponent(.5)},Bo.scale.ordinal=function(){return Ki([],{t:"range",a:[[]]})},Bo.scale.category10=function(){return Bo.scale.ordinal().range(ds)},Bo.scale.category20=function(){return Bo.scale.ordinal().range(ms)},Bo.scale.category20b=function(){return Bo.scale.ordinal().range(ys)},Bo.scale.category20c=function(){return Bo.scale.ordinal().range(xs)};var ds=[2062260,16744206,2924588,14034728,9725885,9197131,14907330,8355711,12369186,1556175].map(mt),ms=[2062260,11454440,16744206,16759672,2924588,10018698,14034728,16750742,9725885,12955861,9197131,12885140,14907330,16234194,8355711,13092807,12369186,14408589,1556175,10410725].map(mt),ys=[3750777,5395619,7040719,10264286,6519097,9216594,11915115,13556636,9202993,12426809,15186514,15190932,8666169,11356490,14049643,15177372,8077683,10834324,13528509,14589654].map(mt),xs=[3244733,7057110,10406625,13032431,15095053,16616764,16625259,16634018,3253076,7652470,10607003,13101504,7695281,10394312,12369372,14342891,6513507,9868950,12434877,14277081].map(mt);Bo.scale.quantile=function(){return Qi([],[])},Bo.scale.quantize=function(){return no(0,1,[0,1])},Bo.scale.threshold=function(){return to([.5],[0,1])},Bo.scale.identity=function(){return ro([0,1])},Bo.svg={},Bo.svg.arc=function(){function n(){var n=t.apply(this,arguments),i=r.apply(this,arguments),o=e.apply(this,arguments)+Ms,a=u.apply(this,arguments)+Ms,c=(o>a&&(c=o,o=a,a=c),a-o),s=ka>c?"0":"1",l=Math.cos(o),f=Math.sin(o),h=Math.cos(a),g=Math.sin(a);
return c>=_s?n?"M0,"+i+"A"+i+","+i+" 0 1,1 0,"+-i+"A"+i+","+i+" 0 1,1 0,"+i+"M0,"+n+"A"+n+","+n+" 0 1,0 0,"+-n+"A"+n+","+n+" 0 1,0 0,"+n+"Z":"M0,"+i+"A"+i+","+i+" 0 1,1 0,"+-i+"A"+i+","+i+" 0 1,1 0,"+i+"Z":n?"M"+i*l+","+i*f+"A"+i+","+i+" 0 "+s+",1 "+i*h+","+i*g+"L"+n*h+","+n*g+"A"+n+","+n+" 0 "+s+",0 "+n*l+","+n*f+"Z":"M"+i*l+","+i*f+"A"+i+","+i+" 0 "+s+",1 "+i*h+","+i*g+"L0,0"+"Z"}var t=eo,r=uo,e=io,u=oo;return n.innerRadius=function(r){return arguments.length?(t=Et(r),n):t},n.outerRadius=function(t){return arguments.length?(r=Et(t),n):r},n.startAngle=function(t){return arguments.length?(e=Et(t),n):e},n.endAngle=function(t){return arguments.length?(u=Et(t),n):u},n.centroid=function(){var n=(t.apply(this,arguments)+r.apply(this,arguments))/2,i=(e.apply(this,arguments)+u.apply(this,arguments))/2+Ms;return[Math.cos(i)*n,Math.sin(i)*n]},n};var Ms=-Aa,_s=Ea-Ca;Bo.svg.line=function(){return ao(At)};var bs=Bo.map({linear:co,"linear-closed":so,step:lo,"step-before":fo,"step-after":ho,basis:xo,"basis-open":Mo,"basis-closed":_o,bundle:bo,cardinal:vo,"cardinal-open":go,"cardinal-closed":po,monotone:Co});bs.forEach(function(n,t){t.key=n,t.closed=/-closed$/.test(n)});var ws=[0,2/3,1/3,0],Ss=[0,1/3,2/3,0],ks=[0,1/6,2/3,1/6];Bo.svg.line.radial=function(){var n=ao(No);return n.radius=n.x,delete n.x,n.angle=n.y,delete n.y,n},fo.reverse=ho,ho.reverse=fo,Bo.svg.area=function(){return zo(At)},Bo.svg.area.radial=function(){var n=zo(No);return n.radius=n.x,delete n.x,n.innerRadius=n.x0,delete n.x0,n.outerRadius=n.x1,delete n.x1,n.angle=n.y,delete n.y,n.startAngle=n.y0,delete n.y0,n.endAngle=n.y1,delete n.y1,n},Bo.svg.chord=function(){function n(n,a){var c=t(this,i,n,a),s=t(this,o,n,a);return"M"+c.p0+e(c.r,c.p1,c.a1-c.a0)+(r(c,s)?u(c.r,c.p1,c.r,c.p0):u(c.r,c.p1,s.r,s.p0)+e(s.r,s.p1,s.a1-s.a0)+u(s.r,s.p1,c.r,c.p0))+"Z"}function t(n,t,r,e){var u=t.call(n,r,e),i=a.call(n,u,e),o=c.call(n,u,e)+Ms,l=s.call(n,u,e)+Ms;return{r:i,a0:o,a1:l,p0:[i*Math.cos(o),i*Math.sin(o)],p1:[i*Math.cos(l),i*Math.sin(l)]}}function r(n,t){return n.a0==t.a0&&n.a1==t.a1}function e(n,t,r){return"A"+n+","+n+" 0 "+ +(r>ka)+",1 "+t}function u(n,t,r,e){return"Q 0,0 "+e}var i=me,o=ye,a=Lo,c=io,s=oo;return n.radius=function(t){return arguments.length?(a=Et(t),n):a},n.source=function(t){return arguments.length?(i=Et(t),n):i},n.target=function(t){return arguments.length?(o=Et(t),n):o},n.startAngle=function(t){return arguments.length?(c=Et(t),n):c},n.endAngle=function(t){return arguments.length?(s=Et(t),n):s},n},Bo.svg.diagonal=function(){function n(n,u){var i=t.call(this,n,u),o=r.call(this,n,u),a=(i.y+o.y)/2,c=[i,{x:i.x,y:a},{x:o.x,y:a},o];return c=c.map(e),"M"+c[0]+"C"+c[1]+" "+c[2]+" "+c[3]}var t=me,r=ye,e=To;return n.source=function(r){return arguments.length?(t=Et(r),n):t},n.target=function(t){return arguments.length?(r=Et(t),n):r},n.projection=function(t){return arguments.length?(e=t,n):e},n},Bo.svg.diagonal.radial=function(){var n=Bo.svg.diagonal(),t=To,r=n.projection;return n.projection=function(n){return arguments.length?r(qo(t=n)):t},n},Bo.svg.symbol=function(){function n(n,e){return(Es.get(t.call(this,n,e))||Po)(r.call(this,n,e))}var t=Do,r=Ro;return n.type=function(r){return arguments.length?(t=Et(r),n):t},n.size=function(t){return arguments.length?(r=Et(t),n):r},n};var Es=Bo.map({circle:Po,cross:function(n){var t=Math.sqrt(n/5)/2;return"M"+-3*t+","+-t+"H"+-t+"V"+-3*t+"H"+t+"V"+-t+"H"+3*t+"V"+t+"H"+t+"V"+3*t+"H"+-t+"V"+t+"H"+-3*t+"Z"},diamond:function(n){var t=Math.sqrt(n/(2*zs)),r=t*zs;return"M0,"+-t+"L"+r+",0"+" 0,"+t+" "+-r+",0"+"Z"},square:function(n){var t=Math.sqrt(n)/2;return"M"+-t+","+-t+"L"+t+","+-t+" "+t+","+t+" "+-t+","+t+"Z"},"triangle-down":function(n){var t=Math.sqrt(n/Ns),r=t*Ns/2;return"M0,"+r+"L"+t+","+-r+" "+-t+","+-r+"Z"},"triangle-up":function(n){var t=Math.sqrt(n/Ns),r=t*Ns/2;return"M0,"+-r+"L"+t+","+r+" "+-t+","+r+"Z"}});Bo.svg.symbolTypes=Es.keys();var As,Cs,Ns=Math.sqrt(3),zs=Math.tan(30*za),Ls=[],Ts=0;Ls.call=ya.call,Ls.empty=ya.empty,Ls.node=ya.node,Ls.size=ya.size,Bo.transition=function(n){return arguments.length?As?n.transition():n:_a.transition()},Bo.transition.prototype=Ls,Ls.select=function(n){var t,r,e,u=this.id,i=[];n=b(n);for(var o=-1,a=this.length;++o<a;){i.push(t=[]);for(var c=this[o],s=-1,l=c.length;++s<l;)(e=c[s])&&(r=n.call(e,e.__data__,s,o))?("__data__"in e&&(r.__data__=e.__data__),Fo(r,s,u,e.__transition__[u]),t.push(r)):t.push(null)}return Uo(i,u)},Ls.selectAll=function(n){var t,r,e,u,i,o=this.id,a=[];n=w(n);for(var c=-1,s=this.length;++c<s;)for(var l=this[c],f=-1,h=l.length;++f<h;)if(e=l[f]){i=e.__transition__[o],r=n.call(e,e.__data__,f,c),a.push(t=[]);for(var g=-1,p=r.length;++g<p;)(u=r[g])&&Fo(u,g,o,i),t.push(u)}return Uo(a,o)},Ls.filter=function(n){var t,r,e,u=[];"function"!=typeof n&&(n=R(n));for(var i=0,o=this.length;o>i;i++){u.push(t=[]);for(var r=this[i],a=0,c=r.length;c>a;a++)(e=r[a])&&n.call(e,e.__data__,a,i)&&t.push(e)}return Uo(u,this.id)},Ls.tween=function(n,t){var r=this.id;return arguments.length<2?this.node().__transition__[r].tween.get(n):P(this,null==t?function(t){t.__transition__[r].tween.remove(n)}:function(e){e.__transition__[r].tween.set(n,t)})},Ls.attr=function(n,t){function r(){this.removeAttribute(a)}function e(){this.removeAttributeNS(a.space,a.local)}function u(n){return null==n?r:(n+="",function(){var t,r=this.getAttribute(a);return r!==n&&(t=o(r,n),function(n){this.setAttribute(a,t(n))})})}function i(n){return null==n?e:(n+="",function(){var t,r=this.getAttributeNS(a.space,a.local);return r!==n&&(t=o(r,n),function(n){this.setAttributeNS(a.space,a.local,t(n))})})}if(arguments.length<2){for(t in n)this.attr(t,n[t]);return this}var o="transform"==n?Hu:du,a=Bo.ns.qualify(n);return jo(this,"attr."+n,t,a.local?i:u)},Ls.attrTween=function(n,t){function r(n,r){var e=t.call(this,n,r,this.getAttribute(u));return e&&function(n){this.setAttribute(u,e(n))}}function e(n,r){var e=t.call(this,n,r,this.getAttributeNS(u.space,u.local));return e&&function(n){this.setAttributeNS(u.space,u.local,e(n))}}var u=Bo.ns.qualify(n);return this.tween("attr."+n,u.local?e:r)},Ls.style=function(n,t,r){function e(){this.style.removeProperty(n)}function u(t){return null==t?e:(t+="",function(){var e,u=Qo.getComputedStyle(this,null).getPropertyValue(n);return u!==t&&(e=du(u,t),function(t){this.style.setProperty(n,e(t),r)})})}var i=arguments.length;if(3>i){if("string"!=typeof n){2>i&&(t="");for(r in n)this.style(r,n[r],t);return this}r=""}return jo(this,"style."+n,t,u)},Ls.styleTween=function(n,t,r){function e(e,u){var i=t.call(this,e,u,Qo.getComputedStyle(this,null).getPropertyValue(n));return i&&function(t){this.style.setProperty(n,i(t),r)}}return arguments.length<3&&(r=""),this.tween("style."+n,e)},Ls.text=function(n){return jo(this,"text",n,Ho)},Ls.remove=function(){return this.each("end.transition",function(){var n;this.__transition__.count<2&&(n=this.parentNode)&&n.removeChild(this)})},Ls.ease=function(n){var t=this.id;return arguments.length<1?this.node().__transition__[t].ease:("function"!=typeof n&&(n=Bo.ease.apply(Bo,arguments)),P(this,function(r){r.__transition__[t].ease=n}))},Ls.delay=function(n){var t=this.id;return arguments.length<1?this.node().__transition__[t].delay:P(this,"function"==typeof n?function(r,e,u){r.__transition__[t].delay=+n.call(r,r.__data__,e,u)}:(n=+n,function(r){r.__transition__[t].delay=n}))},Ls.duration=function(n){var t=this.id;return arguments.length<1?this.node().__transition__[t].duration:P(this,"function"==typeof n?function(r,e,u){r.__transition__[t].duration=Math.max(1,n.call(r,r.__data__,e,u))}:(n=Math.max(1,n),function(r){r.__transition__[t].duration=n}))},Ls.each=function(n,t){var r=this.id;if(arguments.length<2){var e=Cs,u=As;As=r,P(this,function(t,e,u){Cs=t.__transition__[r],n.call(t,t.__data__,e,u)}),Cs=e,As=u}else P(this,function(e){var u=e.__transition__[r];(u.event||(u.event=Bo.dispatch("start","end"))).on(n,t)});return this},Ls.transition=function(){for(var n,t,r,e,u=this.id,i=++Ts,o=[],a=0,c=this.length;c>a;a++){o.push(n=[]);for(var t=this[a],s=0,l=t.length;l>s;s++)(r=t[s])&&(e=Object.create(r.__transition__[u]),e.delay+=e.duration,Fo(r,s,i,e)),n.push(r)}return Uo(o,i)},Bo.svg.axis=function(){function n(n){n.each(function(){var n,s=Bo.select(this),l=this.__chart__||r,f=this.__chart__=r.copy(),h=null==c?f.ticks?f.ticks.apply(f,a):f.domain():c,g=null==t?f.tickFormat?f.tickFormat.apply(f,a):At:t,p=s.selectAll(".tick").data(h,f),v=p.enter().insert("g",".domain").attr("class","tick").style("opacity",Ca),d=Bo.transition(p.exit()).style("opacity",Ca).remove(),m=Bo.transition(p.order()).style("opacity",1),y=Pi(f),x=s.selectAll(".domain").data([0]),M=(x.enter().append("path").attr("class","domain"),Bo.transition(x));v.append("line"),v.append("text");var _=v.select("line"),b=m.select("line"),w=p.select("text").text(g),S=v.select("text"),k=m.select("text");switch(e){case"bottom":n=Oo,_.attr("y2",u),S.attr("y",Math.max(u,0)+o),b.attr("x2",0).attr("y2",u),k.attr("x",0).attr("y",Math.max(u,0)+o),w.attr("dy",".71em").style("text-anchor","middle"),M.attr("d","M"+y[0]+","+i+"V0H"+y[1]+"V"+i);break;case"top":n=Oo,_.attr("y2",-u),S.attr("y",-(Math.max(u,0)+o)),b.attr("x2",0).attr("y2",-u),k.attr("x",0).attr("y",-(Math.max(u,0)+o)),w.attr("dy","0em").style("text-anchor","middle"),M.attr("d","M"+y[0]+","+-i+"V0H"+y[1]+"V"+-i);break;case"left":n=Io,_.attr("x2",-u),S.attr("x",-(Math.max(u,0)+o)),b.attr("x2",-u).attr("y2",0),k.attr("x",-(Math.max(u,0)+o)).attr("y",0),w.attr("dy",".32em").style("text-anchor","end"),M.attr("d","M"+-i+","+y[0]+"H0V"+y[1]+"H"+-i);break;case"right":n=Io,_.attr("x2",u),S.attr("x",Math.max(u,0)+o),b.attr("x2",u).attr("y2",0),k.attr("x",Math.max(u,0)+o).attr("y",0),w.attr("dy",".32em").style("text-anchor","start"),M.attr("d","M"+i+","+y[0]+"H0V"+y[1]+"H"+i)}if(f.rangeBand){var E=f,A=E.rangeBand()/2;l=f=function(n){return E(n)+A}}else l.rangeBand?l=f:d.call(n,f);v.call(n,l),m.call(n,f)})}var t,r=Bo.scale.linear(),e=qs,u=6,i=6,o=3,a=[10],c=null;return n.scale=function(t){return arguments.length?(r=t,n):r},n.orient=function(t){return arguments.length?(e=t in Rs?t+"":qs,n):e},n.ticks=function(){return arguments.length?(a=arguments,n):a},n.tickValues=function(t){return arguments.length?(c=t,n):c},n.tickFormat=function(r){return arguments.length?(t=r,n):t},n.tickSize=function(t){var r=arguments.length;return r?(u=+t,i=+arguments[r-1],n):u},n.innerTickSize=function(t){return arguments.length?(u=+t,n):u},n.outerTickSize=function(t){return arguments.length?(i=+t,n):i},n.tickPadding=function(t){return arguments.length?(o=+t,n):o},n.tickSubdivide=function(){return arguments.length&&n},n};var qs="bottom",Rs={top:1,right:1,bottom:1,left:1};Bo.svg.brush=function(){function n(i){i.each(function(){var i=Bo.select(this).style("pointer-events","all").style("-webkit-tap-highlight-color","rgba(0,0,0,0)").on("mousedown.brush",u).on("touchstart.brush",u),o=i.selectAll(".background").data([0]);o.enter().append("rect").attr("class","background").style("visibility","hidden").style("cursor","crosshair"),i.selectAll(".extent").data([0]).enter().append("rect").attr("class","extent").style("cursor","move");var a=i.selectAll(".resize").data(p,At);a.exit().remove(),a.enter().append("g").attr("class",function(n){return"resize "+n}).style("cursor",function(n){return Ds[n]}).append("rect").attr("x",function(n){return/[ew]$/.test(n)?-3:null}).attr("y",function(n){return/^[ns]/.test(n)?-3:null}).attr("width",6).attr("height",6).style("visibility","hidden"),a.style("display",n.empty()?"none":null);var l,f=Bo.transition(i),h=Bo.transition(o);c&&(l=Pi(c),h.attr("x",l[0]).attr("width",l[1]-l[0]),r(f)),s&&(l=Pi(s),h.attr("y",l[0]).attr("height",l[1]-l[0]),e(f)),t(f)})}function t(n){n.selectAll(".resize").attr("transform",function(n){return"translate("+l[+/e$/.test(n)]+","+f[+/^s/.test(n)]+")"})}function r(n){n.select(".extent").attr("x",l[0]),n.selectAll(".extent,.n>rect,.s>rect").attr("width",l[1]-l[0])}function e(n){n.select(".extent").attr("y",f[0]),n.selectAll(".extent,.e>rect,.w>rect").attr("height",f[1]-f[0])}function u(){function u(){32==Bo.event.keyCode&&(C||(x=null,z[0]-=l[1],z[1]-=f[1],C=2),y())}function p(){32==Bo.event.keyCode&&2==C&&(z[0]+=l[1],z[1]+=f[1],C=0,y())}function v(){var n=Bo.mouse(_),u=!1;M&&(n[0]+=M[0],n[1]+=M[1]),C||(Bo.event.altKey?(x||(x=[(l[0]+l[1])/2,(f[0]+f[1])/2]),z[0]=l[+(n[0]<x[0])],z[1]=f[+(n[1]<x[1])]):x=null),E&&d(n,c,0)&&(r(S),u=!0),A&&d(n,s,1)&&(e(S),u=!0),u&&(t(S),w({type:"brush",mode:C?"move":"resize"}))}function d(n,t,r){var e,u,a=Pi(t),c=a[0],s=a[1],p=z[r],v=r?f:l,d=v[1]-v[0];return C&&(c-=p,s-=d+p),e=(r?g:h)?Math.max(c,Math.min(s,n[r])):n[r],C?u=(e+=p)+d:(x&&(p=Math.max(c,Math.min(s,2*x[r]-e))),e>p?(u=e,e=p):u=p),v[0]!=e||v[1]!=u?(r?o=null:i=null,v[0]=e,v[1]=u,!0):void 0}function m(){v(),S.style("pointer-events","all").selectAll(".resize").style("display",n.empty()?"none":null),Bo.select("body").style("cursor",null),L.on("mousemove.brush",null).on("mouseup.brush",null).on("touchmove.brush",null).on("touchend.brush",null).on("keydown.brush",null).on("keyup.brush",null),N(),w({type:"brushend"})}var x,M,_=this,b=Bo.select(Bo.event.target),w=a.of(_,arguments),S=Bo.select(_),k=b.datum(),E=!/^(n|s)$/.test(k)&&c,A=!/^(e|w)$/.test(k)&&s,C=b.classed("extent"),N=Y(),z=Bo.mouse(_),L=Bo.select(Qo).on("keydown.brush",u).on("keyup.brush",p);if(Bo.event.changedTouches?L.on("touchmove.brush",v).on("touchend.brush",m):L.on("mousemove.brush",v).on("mouseup.brush",m),S.interrupt().selectAll("*").interrupt(),C)z[0]=l[0]-z[0],z[1]=f[0]-z[1];else if(k){var T=+/w$/.test(k),q=+/^n/.test(k);M=[l[1-T]-z[0],f[1-q]-z[1]],z[0]=l[T],z[1]=f[q]}else Bo.event.altKey&&(x=z.slice());S.style("pointer-events","none").selectAll(".resize").style("display",null),Bo.select("body").style("cursor",b.style("cursor")),w({type:"brushstart"}),v()}var i,o,a=M(n,"brushstart","brush","brushend"),c=null,s=null,l=[0,0],f=[0,0],h=!0,g=!0,p=Ps[0];return n.event=function(n){n.each(function(){var n=a.of(this,arguments),t={x:l,y:f,i:i,j:o},r=this.__chart__||t;this.__chart__=t,As?Bo.select(this).transition().each("start.brush",function(){i=r.i,o=r.j,l=r.x,f=r.y,n({type:"brushstart"})}).tween("brush:brush",function(){var r=mu(l,t.x),e=mu(f,t.y);return i=o=null,function(u){l=t.x=r(u),f=t.y=e(u),n({type:"brush",mode:"resize"})}}).each("end.brush",function(){i=t.i,o=t.j,n({type:"brush",mode:"resize"}),n({type:"brushend"})}):(n({type:"brushstart"}),n({type:"brush",mode:"resize"}),n({type:"brushend"}))})},n.x=function(t){return arguments.length?(c=t,p=Ps[!c<<1|!s],n):c},n.y=function(t){return arguments.length?(s=t,p=Ps[!c<<1|!s],n):s},n.clamp=function(t){return arguments.length?(c&&s?(h=!!t[0],g=!!t[1]):c?h=!!t:s&&(g=!!t),n):c&&s?[h,g]:c?h:s?g:null},n.extent=function(t){var r,e,u,a,h;return arguments.length?(c&&(r=t[0],e=t[1],s&&(r=r[0],e=e[0]),i=[r,e],c.invert&&(r=c(r),e=c(e)),r>e&&(h=r,r=e,e=h),(r!=l[0]||e!=l[1])&&(l=[r,e])),s&&(u=t[0],a=t[1],c&&(u=u[1],a=a[1]),o=[u,a],s.invert&&(u=s(u),a=s(a)),u>a&&(h=u,u=a,a=h),(u!=f[0]||a!=f[1])&&(f=[u,a])),n):(c&&(i?(r=i[0],e=i[1]):(r=l[0],e=l[1],c.invert&&(r=c.invert(r),e=c.invert(e)),r>e&&(h=r,r=e,e=h))),s&&(o?(u=o[0],a=o[1]):(u=f[0],a=f[1],s.invert&&(u=s.invert(u),a=s.invert(a)),u>a&&(h=u,u=a,a=h))),c&&s?[[r,u],[e,a]]:c?[r,e]:s&&[u,a])},n.clear=function(){return n.empty()||(l=[0,0],f=[0,0],i=o=null),n},n.empty=function(){return!!c&&l[0]==l[1]||!!s&&f[0]==f[1]},Bo.rebind(n,a,"on")};var Ds={n:"ns-resize",e:"ew-resize",s:"ns-resize",w:"ew-resize",nw:"nwse-resize",ne:"nesw-resize",se:"nwse-resize",sw:"nesw-resize"},Ps=[["n","e","s","w","nw","ne","se","sw"],["e","w"],["n","s"],[]],Us=rc.format=cc.timeFormat,js=Us.utc,Hs=js("%Y-%m-%dT%H:%M:%S.%LZ");Us.iso=Date.prototype.toISOString&&+new Date("2000-01-01T00:00:00.000Z")?Yo:Hs,Yo.parse=function(n){var t=new Date(n);return isNaN(t)?null:t},Yo.toString=Hs.toString,rc.second=Ht(function(n){return new ec(1e3*Math.floor(n/1e3))},function(n,t){n.setTime(n.getTime()+1e3*Math.floor(t))},function(n){return n.getSeconds()}),rc.seconds=rc.second.range,rc.seconds.utc=rc.second.utc.range,rc.minute=Ht(function(n){return new ec(6e4*Math.floor(n/6e4))},function(n,t){n.setTime(n.getTime()+6e4*Math.floor(t))},function(n){return n.getMinutes()}),rc.minutes=rc.minute.range,rc.minutes.utc=rc.minute.utc.range,rc.hour=Ht(function(n){var t=n.getTimezoneOffset()/60;return new ec(36e5*(Math.floor(n/36e5-t)+t))},function(n,t){n.setTime(n.getTime()+36e5*Math.floor(t))},function(n){return n.getHours()}),rc.hours=rc.hour.range,rc.hours.utc=rc.hour.utc.range,rc.month=Ht(function(n){return n=rc.day(n),n.setDate(1),n},function(n,t){n.setMonth(n.getMonth()+t)},function(n){return n.getMonth()}),rc.months=rc.month.range,rc.months.utc=rc.month.utc.range;var Fs=[1e3,5e3,15e3,3e4,6e4,3e5,9e5,18e5,36e5,108e5,216e5,432e5,864e5,1728e5,6048e5,2592e6,7776e6,31536e6],Os=[[rc.second,1],[rc.second,5],[rc.second,15],[rc.second,30],[rc.minute,1],[rc.minute,5],[rc.minute,15],[rc.minute,30],[rc.hour,1],[rc.hour,3],[rc.hour,6],[rc.hour,12],[rc.day,1],[rc.day,2],[rc.week,1],[rc.month,1],[rc.month,3],[rc.year,1]],Is=Us.multi([[".%L",function(n){return n.getMilliseconds()}],[":%S",function(n){return n.getSeconds()}],["%I:%M",function(n){return n.getMinutes()}],["%I %p",function(n){return n.getHours()}],["%a %d",function(n){return n.getDay()&&1!=n.getDate()}],["%b %d",function(n){return 1!=n.getDate()}],["%B",function(n){return n.getMonth()}],["%Y",Ar]]),Ys={range:function(n,t,r){return Bo.range(Math.ceil(n/r)*r,+t,r).map(Vo)},floor:At,ceil:At};Os.year=rc.year,rc.scale=function(){return Zo(Bo.scale.linear(),Os,Is)};var Zs=Os.map(function(n){return[n[0].utc,n[1]]}),Vs=js.multi([[".%L",function(n){return n.getUTCMilliseconds()}],[":%S",function(n){return n.getUTCSeconds()}],["%I:%M",function(n){return n.getUTCMinutes()}],["%I %p",function(n){return n.getUTCHours()}],["%a %d",function(n){return n.getUTCDay()&&1!=n.getUTCDate()}],["%b %d",function(n){return 1!=n.getUTCDate()}],["%B",function(n){return n.getUTCMonth()}],["%Y",Ar]]);Zs.year=rc.year.utc,rc.scale.utc=function(){return Zo(Bo.scale.linear(),Zs,Vs)},Bo.text=Ct(function(n){return n.responseText}),Bo.json=function(n,t){return Nt(n,"application/json",$o,t)},Bo.html=function(n,t){return Nt(n,"text/html",Xo,t)},Bo.xml=Ct(function(n){return n.responseXML}),"function"==typeof define&&define.amd?define(Bo):"object"==typeof module&&module.exports?module.exports=Bo:this.d3=Bo}();
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
    while (arguments[i+=1]) {
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
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

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

  ColoredTreePicker = (function(_super) {
    __extends(ColoredTreePicker, _super);

    function ColoredTreePicker() {
      this.click_handler = __bind(this.click_handler, this);
      this.recolor_now = __bind(this.recolor_now, this);
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
      return "" + (this.get_my_id()) + "_colors";
    };

    ColoredTreePicker.prototype.update_css = function() {
      var colors, ctxSel, id, nc, sc, styles, _ref;
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
      _ref = this.id_to_colors;
      for (id in _ref) {
        colors = _ref[id];
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
      var branch_id, class_str, elem, _i, _len, _ref;
      branch_id = branch.getAttribute("id");
      class_str = branch.getAttribute("class");
      if (verbose) {
        console.log(indent + "-recolor_recurse(", branch_id, class_str, ")", branch);
      }
      if (branch_id) {
        this.recolor_node(retval, recursor, branch_id, branch, indent);
      }
      if (branch.children.length > 0) {
        _ref = branch.children;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          elem = _ref[_i];
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
      var elem, hue;
      elem = d3.select(elem_raw);
      if (this.is_abstract(id)) {
        retval[id] = {
          unshowing: hsl2rgb(0, 0, L_unshowing),
          showing: hsl2rgb(0, 0, L_showing),
          emphasizing: hsl2rgb(0, 0, L_emphasizing)
        };
      } else {
        recursor.i++;
        hue = recursor.i / recursor.count * 360;
        retval[id] = {
          unshowing: hsl2rgb(hue, S_all, L_unshowing),
          showing: hsl2rgb(hue, S_all, L_showing),
          emphasizing: hsl2rgb(hue, S_all, L_emphasizing)
        };
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
      var color, kid_id, kids, _i, _len;
      color_list = color_list || [];
      kids = this.id_to_children[id];
      if (!this.is_abstract[id]) {
        color = this.get_current_color_forId(id);
        if (color != null) {
          color_list.push(color);
        }
      }
      if (kids != null) {
        for (_i = 0, _len = kids.length; _i < _len; _i++) {
          kid_id = kids[_i];
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
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Huviz = require('huviz').Huviz;

  Deprecated = (function(_super) {
    __extends(Deprecated, _super);

    function Deprecated() {
      this.onnextsubject = __bind(this.onnextsubject, this);
      this.onnextsubject = __bind(this.onnextsubject, this);
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
    function Edge(source, target, predicate) {
      var a;
      this.source = source;
      this.target = target;
      this.predicate = predicate;
      this.id = ((function() {
        var _i, _len, _ref, _results;
        _ref = [this.source, this.predicate, this.target];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          a = _ref[_i];
          _results.push((a.lid == null) && a.id || a.lid);
        }
        return _results;
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
  var EditController, indexdDBstore,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  indexdDBstore = require('indexeddbstoragecontroller');

  EditController = (function() {
    function EditController(huviz) {
      var clearForm, saveForm, validateForm, viscanvas;
      this.huviz = huviz;
      this.clear_edit_form = __bind(this.clear_edit_form, this);
      this.save_edit_form = __bind(this.save_edit_form, this);
      this.validate_edit_form = __bind(this.validate_edit_form, this);
      this.toggle_edit_form = __bind(this.toggle_edit_form, this);
      this.update_predicate_picked = __bind(this.update_predicate_picked, this);
      this.userValid = true;
      if (this.userValid === true && !this.con) {
        this.con = document.createElement("div");
        this.con.className = "edit-controls loggedIn";
        this.con.setAttribute("edit", "no");
        this.huviz.set_edit_mode(false);
        viscanvas = this.huviz.viscanvas[0][0];
        viscanvas.appendChild(this.con);
        this.con.innerHTML = "<div class='cntrl-set slider-pair'><div class='label set-1'>VIEW</div><div class='slider'><div class='knob'></div></div><div class='label set-2'>CONTRIBUTE</div><div id='beta-note'>(Beta)</div></div>";
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
        this.object_input = this.formFields[2];
      }
    }

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
      var availablePredicates, predicate, _i, _len, _ref;
      availablePredicates = [];
      if (this.huviz.predicate_set) {
        _ref = this.huviz.predicate_set;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          predicate = _ref[_i];
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
      console.log("" + new_pred_value + " is new predicate");
      return this.validate_proposed_edge();
    };

    EditController.prototype.toggle_edit_form = function() {
      var toggleEditMode;
      toggleEditMode = this.con.getAttribute("edit");
      if (toggleEditMode === 'no') {
        this.con.setAttribute("edit", "yes");
        this.con.classList.add("edit-mode");
        this.huviz.set_edit_mode(true);
      }
      if (toggleEditMode === 'yes') {
        this.con.setAttribute("edit", "no");
        this.con.classList.remove("edit-mode");
        return this.huviz.set_edit_mode(false);
      }
    };

    EditController.prototype.validate_edit_form = function(evt) {
      var elem, form, i, inputFields, saveButton, _i, _ref;
      form = this.controls;
      inputFields = form.getElementsByTagName('input');
      saveButton = form.getElementsByTagName('button')[0];
      for (i = _i = 0, _ref = inputFields.length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
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
      var assrtSave, elem, form, i, inputFields, quad, saveButton, tuple, _i, _ref;
      form = this.controls;
      inputFields = form.getElementsByTagName('input');
      tuple = [];
      for (i = _i = 0, _ref = inputFields.length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
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
        debugger;
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

  })();

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
  var ColoredTreePicker, CommandController, TreePicker, gcl, getRandomId,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

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

  TreePicker = require('treepicker').TreePicker;

  CommandController = (function() {
    function CommandController(huviz, container, hierarchy) {
      this.huviz = huviz;
      this.container = container;
      this.hierarchy = hierarchy;
      this.on_set_count_update = __bind(this.on_set_count_update, this);
      this.clear_all_sets = __bind(this.clear_all_sets, this);
      this.disengage_all_sets = __bind(this.disengage_all_sets, this);
      this.handle_on_set_picked = __bind(this.handle_on_set_picked, this);
      this.handle_on_verb_clicked = __bind(this.handle_on_verb_clicked, this);
      this.perform_current_command = __bind(this.perform_current_command, this);
      this.update_command = __bind(this.update_command, this);
      this.push_future_onto_history = __bind(this.push_future_onto_history, this);
      this.disengage_all_verbs = __bind(this.disengage_all_verbs, this);
      this.handle_like_input = __bind(this.handle_like_input, this);
      this.handle_clear_like = __bind(this.handle_clear_like, this);
      this.stop_working = __bind(this.stop_working, this);
      this.on_taxon_clicked = __bind(this.on_taxon_clicked, this);
      this.handle_on_taxon_clicked = __bind(this.handle_on_taxon_clicked, this);
      this.onChangeEnglish = __bind(this.onChangeEnglish, this);
      this.add_taxon = __bind(this.add_taxon, this);
      this.recolor_edges = __bind(this.recolor_edges, this);
      this.on_predicate_clicked = __bind(this.on_predicate_clicked, this);
      this.handle_on_predicate_clicked = __bind(this.handle_on_predicate_clicked, this);
      this.add_predicate = __bind(this.add_predicate, this);
      this.recolor_edges_and_predicates = __bind(this.recolor_edges_and_predicates, this);
      this.handle_newpredicate = __bind(this.handle_newpredicate, this);
      this.OLD_select_the_initial_set = __bind(this.OLD_select_the_initial_set, this);
      this.NEW_select_the_initial_set = __bind(this.NEW_select_the_initial_set, this);
      this.select_the_initial_set = __bind(this.select_the_initial_set, this);
      this.on_dataset_loaded = __bind(this.on_dataset_loaded, this);
      this.on_fastforward_click = __bind(this.on_fastforward_click, this);
      this.on_forward_click = __bind(this.on_forward_click, this);
      this.on_backward_click = __bind(this.on_backward_click, this);
      this.on_rewind_click = __bind(this.on_rewind_click, this);
      this.on_stashscript_clicked = __bind(this.on_stashscript_clicked, this);
      this.on_downloadscript_type = __bind(this.on_downloadscript_type, this);
      this.on_downloadscript_hybrid_clicked = __bind(this.on_downloadscript_hybrid_clicked, this);
      this.on_downloadscript_txt_clicked = __bind(this.on_downloadscript_txt_clicked, this);
      this.on_downloadscript_json_clicked = __bind(this.on_downloadscript_json_clicked, this);
      document.addEventListener('dataset-loaded', this.on_dataset_loaded);
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

    CommandController.prototype.make_command_history = function() {
      var history;
      this.comdiv = d3.select(this.container).append("div");
      history = d3.select(this.huviz.oldToUniqueTabSel['tabs-history']);
      this.cmdtitle = history.append('div').attr('class', 'control_label').html('Command History').attr('style', 'display:inline');
      this.scriptPlayerControls = history.append('div').attr('class', 'scriptPlayerControls');
      this.scriptRewindButton = this.scriptPlayerControls.append('button').attr('title', 'rewind to start').on('click', this.on_rewind_click);
      this.scriptRewindButton.append('i').attr("class", "fa fa-fast-backward");
      this.scriptBackButton = this.scriptPlayerControls.append('button').attr('title', 'go back one step').on('click', this.on_backward_click);
      this.scriptBackButton.append('i').attr("class", "fa fa-play fa-flip-horizontal");
      this.scriptPlayButton = this.scriptPlayerControls.append('button').attr('title', 'play script step by step').attr('disabled', 'disabled').on('click', this.on_forward_click);
      this.scriptPlayButton.append('i').attr("class", "fa fa-play");
      this.scriptForwardButton = this.scriptPlayerControls.append('button').attr('title', 'play script continuously').attr('disabled', 'disabled').on('click', this.on_fastforward_click);
      this.scriptForwardButton.append('i').attr("class", "fa fa-fast-forward");
      this.scriptDownloadButton = this.scriptPlayerControls.append('button').attr('title', 'save script to file').attr('style', 'margin-left:1em').on('click', this.on_downloadscript_hybrid_clicked);
      this.scriptDownloadButton.append('i').attr("class", "fa fa-download");
      this.scriptDownloadJsonButton = this.scriptPlayerControls.append('button').attr('title', 'save script as .json').attr('style', 'display:none').on('click', this.on_downloadscript_json_clicked);
      this.scriptDownloadJsonButton.append('i').attr("class", "fa fa-download").append('span').text('.json');
      this.scriptStashButton = this.scriptPlayerControls.append('button').attr('title', 'save script to menu').attr('style', 'margin-left:.1em').on('click', this.on_stashscript_clicked);
      this.scriptStashButton.append('i').attr("class", "fa fa-bars");
      this.cmdlist = history.append('div').attr('class', 'commandlist');
      this.oldcommands = this.cmdlist.append('div').attr('class', 'commandhistory').style('max-height', "" + (this.huviz.height - 80) + "px");
      this.commandhistoryElem = this.huviz.topElem.querySelector('.commandhistory');
      this.commandhistory_JQElem = $(this.commandhistoryElem);
      this.future_cmdArgs = [];
      this.command_list = [];
      return this.command_idx0 = 0;
    };

    CommandController.prototype.reset_command_history = function() {
      var record, _i, _len, _ref, _results;
      _ref = this.command_list;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        record = _ref[_i];
        _results.push(record.elem.attr('class', 'command'));
      }
      return _results;
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
      var cmd, cmdList, elem_and_cmd, replacer, _i, _len, _ref;
      cmdList = [];
      if (this.huviz.dataset_loader.value) {
        cmdList.push({
          verbs: ['load'],
          data_uri: this.huviz.dataset_loader.value,
          ontologies: [this.huviz.ontology_loader.value],
          skip_history: true
        });
      }
      _ref = this.command_list;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem_and_cmd = _ref[_i];
        cmd = elem_and_cmd.cmd;
        cmdList.push(cmd.args_or_str);
      }
      replacer = function(key, value) {
        var node_or_id, obj, retlist, setId, set_or_id, _j, _k, _len1, _len2;
        retlist = [];
        if (key === 'subjects') {
          for (_j = 0, _len1 = value.length; _j < _len1; _j++) {
            node_or_id = value[_j];
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
          for (_k = 0, _len2 = value.length; _k < _len2; _k++) {
            set_or_id = value[_k];
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
      var _results;
      if (forward_to_idx == null) {
        forward_to_idx = this.command_list.length;
      }
      _results = [];
      while (this.command_idx0 < forward_to_idx) {
        _results.push(this.on_forward_click());
      }
      return _results;
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
      var reminder, _i, _len, _ref;
      $(".hints.hint_set").show();
      _ref = $(".hints > .a_hint");
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        reminder = _ref[_i];
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
      if (__indexOf.call(this.predicates_ignored, pred_uri) < 0) {
        if (__indexOf.call(this.predicates_ignored, pred_lid) < 0) {
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
      var count, edge, node, pred_n_js_id, _i, _len, _ref, _results;
      count = 0;
      _ref = this.huviz.all_set;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push((function() {
          var _j, _len1, _ref1, _results1;
          _ref1 = node.links_from;
          _results1 = [];
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            edge = _ref1[_j];
            count++;
            pred_n_js_id = edge.predicate.id;
            _results1.push(edge.color = this.predicate_picker.get_color_forId_byName(pred_n_js_id, 'showing'));
          }
          return _results1;
        }).call(this));
      }
      return _results;
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
          if (!(__indexOf.call(this.engaged_taxons, taxonId) >= 0)) {
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
        console.error("" + taxonId + ".old_state should NOT equal 'hidden' here");
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
      var vid, _i, _len, _ref, _results;
      _ref = this.engaged_verbs;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vid = _ref[_i];
        _results.push(this.disengage_verb(vid));
      }
      return _results;
    };

    CommandController.prototype.unselect_all_node_classes = function() {
      var nid, _i, _len, _ref, _results;
      _ref = this.engaged_taxons;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        nid = _ref[_i];
        this.unselect_node_class(nid);
        _results.push(this.taxon_picker.set_direct_state(nid, 'unshowing'));
      }
      return _results;
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
      var cmdArgs, _i, _len, _ref;
      if (this.future_cmdArgs.length) {
        this.huviz.goto_tab(3);
        _ref = this.future_cmdArgs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          cmdArgs = _ref[_i];
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
      var elem_and_cmd, idx, _i, _len, _ref;
      _ref = this.command_list;
      for (idx = _i = 0, _len = _ref.length; _i < _len; idx = ++_i) {
        elem_and_cmd = _ref[idx];
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

    CommandController.prototype.build_command = function() {
      var args, class_name, like_str, v, _i, _len, _ref;
      args = {
        verbs: []
      };
      args.object_phrase = this.object_phrase;
      if (this.engaged_verbs.length > 0) {
        _ref = this.engaged_verbs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          v = _ref[_i];
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
              var _j, _len1, _ref1, _results;
              _ref1 = this.engaged_taxons;
              _results = [];
              for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                class_name = _ref1[_j];
                _results.push(class_name);
              }
              return _results;
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
      var vset, _i, _len, _ref, _results;
      this.verb_pretty_name = {};
      _ref = this.verb_sets;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vset = _ref[_i];
        _results.push(this.add_verb_set(vset));
      }
      return _results;
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
      return this.verb_pretty_name['undraw'] = this.huviz.human_term.undraw;
    };

    CommandController.prototype.get_verbs_overridden_by = function(verb_id) {
      var label, override, vid, vset, _i, _len, _ref;
      override = this.verbs_override[verb_id] || [];
      _ref = this.verb_sets;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vset = _ref[_i];
        if (vset[verb_id]) {
          for (vid in vset) {
            label = vset[vid];
            if (!(__indexOf.call(override, vid) >= 0) && verb_id !== vid) {
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
      var overrides, vid, _i, _len, _ref;
      if (transient) {
        this.transient_verb_engaged = verb_id;
        this.verb_control[verb_id].classed('transient', true);
      }
      overrides = this.get_verbs_overridden_by(verb_id);
      this.verb_control[verb_id].classed('engaged', true);
      _ref = this.engaged_verbs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vid = _ref[_i];
        if (__indexOf.call(overrides, vid) >= 0) {
          this.disengage_verb(vid);
        }
      }
      if (!(__indexOf.call(this.engaged_verbs, verb_id) >= 0)) {
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
            walked_set: [this.huviz.walked_set.label]
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
      var a_set, id, _ref, _results;
      _ref = this.huviz.selectable_sets;
      _results = [];
      for (id in _ref) {
        a_set = _ref[id];
        if (a_set.docs != null) {
          _results.push(this.set_picker.set_title(id, a_set.docs));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    CommandController.prototype.make_sets_proposable = function() {
      var a_set, id, make_listeners, _ref, _results;
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
      _ref = this.huviz.selectable_sets;
      _results = [];
      for (id in _ref) {
        a_set = _ref[id];
        _results.push(make_listeners(id, a_set));
      }
      return _results;
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
      var cleanup_verb, cmd, set_key, set_label, skip_sets, the_set, _ref;
      skip_sets = ['shelved_set'];
      _ref = this.the_sets.all_set[1];
      for (set_key in _ref) {
        set_label = _ref[set_key];
        if (__indexOf.call(skip_sets, set_key) >= 0) {
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
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  angliciser = require('angliciser').angliciser;

  GCLTest = (function() {
    function GCLTest(runner, spec) {
      this.runner = runner;
      this.spec = spec;
      console.log("GCLTest", this);
    }

    GCLTest.prototype.perform = function() {
      var e, exp, expected, got, msg, _i, _len, _ref, _ref1;
      if (this.spec.script) {
        this.runner.gclc.run(this.spec.script);
      }
      _ref1 = (_ref = this.spec.expectations) != null ? _ref : [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        exp = _ref1[_i];
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
      var e, err, errors, fail, fails, num, pass_count, passed, retval, spec, test, _i, _j, _k, _len, _len1, _len2, _ref, _results;
      pass_count = 0;
      errors = [];
      fails = [];
      num = 0;
      this.emit("RUNNING", "running");
      _ref = this.suite;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        spec = _ref[_i];
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
      for (_j = 0, _len1 = fails.length; _j < _len1; _j++) {
        fail = fails[_j];
        console.log("test#" + fail[0], fail[1]);
      }
      _results = [];
      for (_k = 0, _len2 = errors.length; _k < _len2; _k++) {
        err = errors[_k];
        _results.push(console.log("err#" + err[0], err[1]));
      }
      return _results;
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
      var abbr, id, id_parts, msg, node, prefix, term, tried, _ref;
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
        _ref = this.prefixes;
        for (abbr in _ref) {
          prefix = _ref[abbr];
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
      var a_set, a_set_id, class_name, like_regex, n, node, node_spec, result_set, set, the_set, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _m, _n, _ref, _ref1, _ref2, _ref3;
      result_set = SortedSet().sort_on("id");
      like_regex = null;
      if (this.like) {
        like_regex = new RegExp(this.like, "ig");
      }
      if (this.subjects) {
        _ref = this.subjects;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          node_spec = _ref[_i];
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
        _ref1 = this.classes;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          class_name = _ref1[_j];
          the_set = (_ref2 = this.huviz.taxonomy[class_name]) != null ? _ref2.get_instances() : void 0;
          if (the_set != null) {
            if (like_regex) {
              for (_k = 0, _len2 = the_set.length; _k < _len2; _k++) {
                n = the_set[_k];
                if (n.name.match(like_regex)) {
                  result_set.add(n);
                }
              }
            } else {
              for (_l = 0, _len3 = the_set.length; _l < _len3; _l++) {
                n = the_set[_l];
                result_set.add(n);
              }
            }
          }
        }
      }
      if (this.sets) {
        _ref3 = this.sets;
        for (_m = 0, _len4 = _ref3.length; _m < _len4; _m++) {
          set = _ref3[_m];
          if (typeof set === 'string') {
            a_set_id = set;
            a_set = this.huviz.get_set_by_id(a_set_id);
          } else {
            a_set = set;
          }
          for (_n = 0, _len5 = a_set.length; _n < _len5; _n++) {
            node = a_set[_n];
            if ((like_regex == null) || node.name.match(like_regex)) {
              result_set.add(node);
            }
          }
        }
      }
      return result_set;
    };

    GraphCommand.prototype.get_methods = function() {
      var method, methods, msg, verb, _i, _len, _ref;
      methods = [];
      _ref = this.verbs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        verb = _ref[_i];
        method = this.huviz[verb];
        if (method) {
          method.build_callback = this.huviz["" + verb + "__build_callback"];
          method.callback = this.huviz["" + verb + "__atLast"];
          method.atFirst = this.huviz["" + verb + "__atFirst"];
          methods.push(method);
        } else {
          msg = "method '" + verb + "' not found";
          console.error(msg);
        }
      }
      return methods;
    };

    GraphCommand.prototype.get_predicate_methods = function() {
      var method, methods, msg, verb, _i, _len, _ref;
      methods = [];
      _ref = this.verbs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        verb = _ref[_i];
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
      var USE_ASYNC, atFirst, callback, errorHandler, iter, meth, node, nodes, regarding_required, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
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
        _ref = this.get_predicate_methods();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          meth = _ref[_i];
          iter = (function(_this) {
            return function(node) {
              var pred, retval, _j, _len1, _ref1;
              _ref1 = _this.regarding;
              for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                pred = _ref1[_j];
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
        console.log("load data_uri has returned");
      } else {
        _ref1 = this.get_methods();
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          meth = _ref1[_j];
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
              return retval = meth.call(_this.huviz, node, _this);
            };
          })(this);
          if (nodes != null) {
            if (USE_ASYNC = false) {
              async.each(nodes, iter, callback);
            } else {
              for (_k = 0, _len2 = nodes.length; _k < _len2; _k++) {
                node = nodes[_k];
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
      var l, verb_id, _i, _len, _ref;
      l = [];
      _ref = this.verbs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        verb_id = _ref[_i];
        l.push(this.huviz.gclui.verb_pretty_name[verb_id]);
      }
      return l;
    };

    GraphCommand.prototype.missing = '____';

    GraphCommand.prototype.update_str = function() {
      var aSet, cmd_str, like_str, maybe_every, missing, more, obj_phrase, ready, regarding_phrase, regarding_required, set, setLabel, setLabels, subj, verb, _i, _j, _len, _len1, _ref, _ref1;
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
        _ref = this.sets;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          set = _ref[_i];
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
              var _j, _len1, _ref1, _results;
              _ref1 = this.subjects;
              _results = [];
              for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                subj = _ref1[_j];
                _results.push(subj.lid);
              }
              return _results;
            }).call(this));
          }
        } else if (this.subjects) {
          obj_phrase = angliciser((function() {
            var _j, _len1, _ref1, _results;
            _ref1 = this.subjects;
            _results = [];
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              subj = _ref1[_j];
              _results.push(subj.lid || subj);
            }
            return _results;
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
        _ref1 = this.verbs;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          verb = _ref1[_j];
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
      this.execute = __bind(this.execute, this);
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
      var cmd_spec, run_once, _i, _len, _ref;
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
      _ref = this.commands;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cmd_spec = _ref[_i];
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
      var obj, oi, p, predicate, subj, subj_id, _results;
      _results = [];
      for (subj_id in graph.subjects) {
        subj = graph.subjects[subj_id];
        _results.push((function() {
          var _results1;
          _results1 = [];
          for (p in subj.predicates) {
            predicate = subj.predicates[p];
            oi = 0;
            _results1.push((function() {
              var _results2;
              _results2 = [];
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
                _results2.push(oi++);
              }
              return _results2;
            })());
          }
          return _results1;
        })());
      }
      return _results;
    };

    get_incoming_predicates = function(subj) {
      var resp;
      resp = this.oid_2_id_p[subj.id] || [];
      return resp;
    };

    count_subjects = function(graph) {
      var s, _results;
      graph.num_subj = 0;
      _results = [];
      for (s in graph.subjects) {
        _results.push(graph.num_subj++);
      }
      return _results;
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
  var BASE10, BASE57, CommandController, DC_subject, DragAndDropLoader, DragAndDropLoaderOfScripts, Edge, EditController, FOAF_Group, FOAF_Person, FOAF_name, GraphCommandLanguageCtrl, GreenerTurtle, Huviz, IndexedDBService, IndexedDBStorageController, MANY_SPACES_REGEX, NAME_SYNS, Node, OWL_Class, OWL_ObjectProperty, OWL_Thing, OntoViz, OntologicallyGrounded, Orlando, PEEKING_COLOR, PRIMORDIAL_ONTOLOGY, PickOrProvide, PickOrProvideScript, Predicate, RDFS_label, RDF_Class, RDF_a, RDF_literal, RDF_object, RDF_subClassOf, RDF_type, SKOS_prefLabel, Socrata, TYPE_SYNS, Taxon, TextCursor, UNDEFINED, XL_literalForm, XML_TAG_REGEX, angliciser, colorlog, convert, default_node_radius_policy, dist_lt, distance, escapeHtml, gcl, getPrefixedTypeSignature, getTypeSignature, has_predicate_value, has_type, hash, hpad, id_escape, ident, ids_to_show, int_to_base, is_a_main_node, is_node_to_always_show, is_one_of, linearize, node_radius_policies, orlando_human_term, sel_to_id, start_with_http, synthIdFor, tau, themeStyles, typeSigRE, unescape_unicode, unique_id, uniquer, wpad,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

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

  FOAF_Group = "http://xmlns.com/foaf/0.1/Group";

  FOAF_Person = "http://xmlns.com/foaf/0.1/Person";

  FOAF_name = "http://xmlns.com/foaf/0.1/name";

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

  SKOS_prefLabel = "http://www.w3.org/2004/02/skos/core#prefLabel";

  XL_literalForm = "http://www.w3.org/2008/05/skos-xl#literalForm";

  TYPE_SYNS = [RDF_type, RDF_a, 'rdfs:type', 'rdf:type'];

  NAME_SYNS = [FOAF_name, RDFS_label, 'rdfs:label', 'name', SKOS_prefLabel, XL_literalForm];

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
        return "" + prefix + "__" + match[1];
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
    undraw: 'Undraw'
  };

  Huviz = (function() {
    var nodeOrderAngle, node_display_type, renderStyles;

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

    Huviz.prototype.snippet_triple_em = .8;

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

    node_display_type = '';

    Huviz.prototype.pfm_display = false;

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

    Huviz.prototype.mousemove = function() {
      var action, d3_event, e, edge, pair, the_node, _i, _len, _ref, _ref1, _ref2, _ref3;
      d3_event = this.mouse_receiver[0][0];
      this.last_mouse_pos = d3.mouse(d3_event);
      if (this.rightClickHold) {
        this.text_cursor["continue"]();
        this.text_cursor.set_text("Inspect");
        if (this.focused_node) {
          the_node = $("#" + this.focused_node.lid);
          if (the_node.html()) {
            the_node.remove();
          }
          this.render_node_info_box();
        } else {
          if ($(".contextMenu.temp")) {
            $(".contextMenu.temp").remove();
          }
        }
      } else if (!this.dragging && this.mousedown_point && this.focused_node && distance(this.last_mouse_pos, this.mousedown_point) > this.drag_dist_threshold) {
        this.dragging = this.focused_node;
        if (this.args.drag_start_handler) {
          try {
            this.args.drag_start_handler.call(this, this.dragging);
          } catch (_error) {
            e = _error;
            console.warn(e);
          }
        }
        if (this.edit_mode) {
          if (this.editui.subject_node !== this.dragging) {
            this.editui.set_subject_node(this.dragging);
          }
        }
        if ((this.dragging.state !== (_ref = this.graphed_set) && _ref !== this.rightClickHold)) {
          this.graphed_set.acquire(this.dragging);
        }
      }
      if (this.dragging && !this.rightClickHold) {
        this.force.resume();
        if (!this.args.skip_log_tick) {
          console.log("Tick in @force.resume() mousemove");
        }
        this.move_node_to_point(this.dragging, this.last_mouse_pos);
        if (this.edit_mode) {
          this.text_cursor.pause("", "drop on object node");
        } else {
          if (this.dragging.links_shown.length === 0) {
            action = "choose";
          } else if (this.dragging.fixed) {
            action = "unpin";
          } else {
            action = "pin";
          }
          if (this.in_disconnect_dropzone(this.dragging)) {
            action = "shelve";
          } else if (this.in_discard_dropzone(this.dragging)) {
            action = "discard";
          }
          this.text_cursor.pause("", "drop to " + this.human_term[action]);
        }
      } else if (!this.rightClickHold) {
        if (this.edit_mode) {
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
        console.log("PEEKING at node: " + this.peeking_node.id);
        if ((this.focused_node != null) && this.focused_node !== this.peeking_node) {
          pair = [this.peeking_node.id, this.focused_node.id];
          _ref1 = this.peeking_node.links_shown;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            edge = _ref1[_i];
            if ((_ref2 = edge.source.id, __indexOf.call(pair, _ref2) >= 0) && (_ref3 = edge.target.id, __indexOf.call(pair, _ref3) >= 0)) {
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
      var d3_event;
      d3_event = this.mouse_receiver[0][0];
      this.mousedown_point = d3.mouse(d3_event);
      return this.last_mouse_pos = this.mousedown_point;
    };

    Huviz.prototype.mouseup = function() {
      var d3_event, drag_dist, point;
      window.log_click();
      d3_event = this.mouse_receiver[0][0];
      this.mousedown_point = false;
      point = d3.mouse(d3_event);
      if (d3.event.button === 2) {
        this.text_cursor["continue"]();
        this.text_cursor.set_text("Select");
        if (this.focused_node) {
          $("#" + this.focused_node.lid).removeClass("temp");
        }
        this.rightClickHold = false;
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
          if (this.edit_mode && (this.dragging === this.editui.subject_node)) {
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
      if (this.edit_mode && this.focused_node && this.editui.object_datatype_is_literal) {
        this.editui.set_subject_node(this.focused_node);
        this.tick("Tick in mouseup 1");
        return;
      }
      if (this.focused_node) {
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

    Huviz.prototype.mouseright = function() {
      var doesnt_exist, temp;
      d3.event.preventDefault();
      this.text_cursor["continue"]();
      temp = null;
      this.text_cursor.set_text("Inspect", temp, "#75c3fb");
      this.rightClickHold = true;
      doesnt_exist = this.focused_node ? true : false;
      if (this.focused_node && doesnt_exist) {
        return this.render_node_info_box();
      }
    };

    Huviz.prototype.render_node_info_box = function() {
      var all_names, color, color_headers, link_from, max_height, max_width, name, names_all_langs, node_info, node_out_links, node_type, note, other_types, target, url_check, width, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2;
      all_names = Object.values(this.focused_node.name);
      names_all_langs = "";
      note = "";
      color_headers = "";
      node_out_links = "";
      for (_i = 0, _len = all_names.length; _i < _len; _i++) {
        name = all_names[_i];
        if (names_all_langs) {
          names_all_langs = names_all_langs + " -- " + name;
        } else {
          names_all_langs = name;
        }
      }
      other_types = "";
      if (this.focused_node._types.length > 1) {
        _ref = this.focused_node._types;
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          node_type = _ref[_j];
          if (node_type !== this.focused_node.type) {
            if (other_types) {
              other_types = other_types + ", " + node_type;
            } else {
              other_types = node_type;
            }
          }
        }
        other_types = " (" + other_types + ")";
      }
      if (this.focused_node.links_from.length > 0) {
        _ref1 = this.focused_node.links_from;
        for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
          link_from = _ref1[_k];
          url_check = link_from.target.id;
          url_check = url_check.substring(0, 4);
          if (url_check === "http") {
            target = "<a href='" + link_from.target.id + "' target='blank'>" + link_from.target.lid + "</a>";
          } else {
            target = link_from.target.id;
          }
          node_out_links = node_out_links + ("<li><i class='fas fa-long-arrow-alt-right'></i> <a href='" + link_from.predicate.id + "' target='blank'>" + link_from.predicate.lid + "</a> <i class='fas fa-long-arrow-alt-right'></i> " + target + "</li>");
        }
        node_out_links = "<ul>" + node_out_links + "</ul>";
      }
      if (this.focused_node._colors) {
        width = 100 / this.focused_node._colors.length;
        _ref2 = this.focused_node._colors;
        for (_l = 0, _len3 = _ref2.length; _l < _len3; _l++) {
          color = _ref2[_l];
          color_headers = color_headers + ("<div class='subHeader' style='background-color: " + color + "; width: " + width + "%;'></div>");
        }
      }
      if (this.endpoint_loader.value) {
        if (this.endpoint_loader.value && this.focused_node.fully_loaded) {
          note = "<p class='note'>Node Fully Loaded</span>";
        } else {
          note = "<p class='note'><span class='label'>Note:</span> This node may not yet be fully loaded from remote server. Link details may not be accurate. Activate to load.</i>";
        }
      }
      if (this.focused_node) {
        node_info = "<div class=\"header\" style=\"background-color:" + this.focused_node.color + ";\">" + color_headers + "<button class=\"close_node_details\" title=\"Close Information Box\"><i class=\"far fa-window-close\"></i></button></div>\n<p><span class='label'>id:</span> " + this.focused_node.id + "</p>\n<p><span class='label'>name:</span> " + names_all_langs + "</p>\n<p><span class='label'>type(s):</span> " + this.focused_node.type + " " + other_types + "</p>\n<p><span class='label'>Links To:</span> " + this.focused_node.links_to.length + " <br>\n  <span class='label'>Links From:</span> " + this.focused_node.links_from.length + "</p>\n  " + note + "\n  " + node_out_links;
        max_width = this.width * 0.50;
        max_height = this.height * 0.80;
        d3.select(this.args.viscanvas_sel).append('div').attr('id', this.focused_node.lid).attr('class', 'contextMenu').classed('temp', true).style('display', 'block').style('top', "" + d3.event.clientY + "px").style('left', "" + d3.event.clientX + "px").style('max-width', "" + max_width + "px").style('max-height', "" + max_height + "px").html(node_info);
        $("#" + this.focused_node.lid).draggable();
        return $("#" + this.focused_node.lid + " .close_node_details").on('click', this.close_info_box);
      }
    };

    Huviz.prototype.close_info_box = function(e) {
      var box;
      box = e.currentTarget.offsetParent;
      return $(box).remove();
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
      $("#graph_title_set").css("width", this.width);
      if (this.tabsJQElem && this.tabsJQElem.length > 0) {
        this.tabsJQElem.css("left", "auto");
      }
      return this.restart();
    };

    Huviz.prototype.get_charge = function(d) {
      var graphed, retval;
      graphed = d.state === this.graphed_set;
      retval = graphed && this.charge || 0;
      if (retval === 0 && graphed) {
        console.error("bad combo of retval and graphed?", retval, graphed, d.name);
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
      if (special_focus) {
        this.ctx.beginPath();
        radius = radius / 2;
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fillStyle = "black";
        return this.ctx.fill();
      }
    };

    Huviz.prototype.draw_round_img = function(cx, cy, radius, strclr, filclr, special_focus, img) {
      var end_angle, incl_cntr, start_angle, wh;
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
      if (img != null) {
        wh = 100;
        this.ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
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

    Huviz.prototype.draw_triangle = function(x, y, size, color, x1, y1, x2, y2) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.moveTo(x, y);
      this.ctx.stroke();
      this.ctx.fillStyle = color;
      this.ctx.fill();
      return this.ctx.closePath();
    };

    Huviz.prototype.draw_pie = function(cx, cy, radius, strclr, filclrs, special_focus) {
      var arc, end_angle, filclr, num, start_angle, _i, _len, _results;
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
      _results = [];
      for (_i = 0, _len = filclrs.length; _i < _len; _i++) {
        filclr = filclrs[_i];
        end_angle = start_angle + arc;
        this.draw_circle(cx, cy, radius, strclr, filclr, end_angle, start_angle, special_focus);
        _results.push(start_angle = start_angle + arc);
      }
      return _results;
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
      var ang, arrow_size, check_range, ctrl_angle, orig_angle, pdist, sway, tip_x, tip_y, xctrl, xhndl, xmid, yctrl, yhndl, ymid;
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
      if (directional_edge) {
        arrow_size = 10;
        if (directional_edge === "forward") {
          tip_x = x2;
          return tip_y = y2;
        } else {
          tip_x = x1;
          return tip_y = y1;
        }
      }
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
      this.nodes.docs = "" + this.nodes.label + " nodes are in this set, regardless of state.";
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
        walked_set: this.walked_set
      };
    };

    Huviz.prototype.get_set_by_id = function(setId) {
      return this[setId + '_set'];
    };

    Huviz.prototype.update_all_counts = function() {
      return this.update_set_counts();
    };

    Huviz.prototype.update_predicate_counts = function() {
      var a_set, name, _i, _len, _ref, _results;
      console.warn('the unproven method update_predicate_counts() has just been called');
      _ref = this.predicate_set;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        a_set = _ref[_i];
        name = a_set.lid;
        _results.push(this.gclui.on_predicate_count_update(name, a_set.length));
      }
      return _results;
    };

    Huviz.prototype.update_set_counts = function() {
      var a_set, name, _ref, _results;
      _ref = this.selectable_sets;
      _results = [];
      for (name in _ref) {
        a_set = _ref[name];
        _results.push(this.gclui.on_set_count_update(name, a_set.length));
      }
      return _results;
    };

    Huviz.prototype.create_taxonomy = function() {
      return this.taxonomy = {};
    };

    Huviz.prototype.summarize_taxonomy = function() {
      var id, out, taxon, tree, _ref;
      out = "";
      tree = {};
      _ref = this.taxonomy;
      for (id in _ref) {
        taxon = _ref[id];
        out += "" + id + ": " + taxon.state + "\n";
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

    Huviz.prototype.get_or_create_taxon = function(taxon_id) {
      var label, parent, parent_lid, taxon;
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
      var term_id, term_label, _ref, _results;
      _ref = this.ontology.label;
      _results = [];
      for (term_id in _ref) {
        term_label = _ref[term_id];
        if (this.gclui.taxon_picker.id_to_name[term_id] != null) {
          this.gclui.taxon_picker.set_name_for_id(term_label, term_id);
        }
        if (this.gclui.predicate_picker.id_to_name[term_id] != null) {
          _results.push(this.gclui.predicate_picker.set_name_for_id(term_label, term_id));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Huviz.prototype.toggle_taxon = function(id, hier, callback) {
      var _ref;
      if (callback != null) {
        this.gclui.set_taxa_click_storm_callback(callback);
      }
      hier = (_ref = hier != null) != null ? _ref : {
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
      this.init_editc();
      this.indexed_dbservice();
      this.init_indexddbstorage();
      this.force.nodes(this.nodes);
      this.force.links(this.links_set);
      if (!this.args.skip_log_tick) {
        console.log("Tick in @force.nodes() reset_graph");
      }
      d3.select("" + this.args.huviz_top_sel + " .link").remove();
      d3.select("" + this.args.huviz_top_sel + " .node").remove();
      d3.select("" + this.args.huviz_top_sel + " .lariat").remove();
      this.node = this.svg.selectAll("" + this.args.huviz_top_sel + " .node");
      this.link = this.svg.selectAll("" + this.args.huviz_top_sel + " .link");
      this.lariat = this.svg.selectAll("" + this.args.huviz_top_sel + " .lariat");
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
      } else {
        return console.log("f =", f);
      }
    };

    Huviz.prototype.DEPRECATED_init_node_radius_policy = function() {
      var policy_box, policy_name, policy_picker, _results;
      policy_box = d3.select("#huvis_controls").append("div", "node_radius_policy_box");
      policy_picker = policy_box.append("select", "node_radius_policy");
      policy_picker.on("change", set_node_radius_policy);
      _results = [];
      for (policy_name in node_radius_policies) {
        _results.push(policy_picker.append("option").attr("value", policy_name).text(policy_name));
      }
      return _results;
    };

    Huviz.prototype.calc_node_radius = function(d) {
      var diff_adjustment, final_adjustment, total_links;
      total_links = d.links_to.length + d.links_from.length;
      diff_adjustment = 10 * (total_links / (total_links + 9));
      final_adjustment = this.node_diff * (diff_adjustment - 1);
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

    Huviz.prototype.find_node_or_edge_closest_to_pointer = function() {
      var closest_dist, closest_point, focus_threshold, new_focused_edge, new_focused_idx, new_focused_node, seeking;
      new_focused_node = null;
      new_focused_edge = null;
      new_focused_idx = null;
      focus_threshold = this.focus_threshold;
      closest_dist = this.width;
      closest_point = null;
      seeking = null;
      if (this.dragging) {
        if (!this.edit_mode) {
          return;
        }
        seeking = "object_node";
      } else {
        seeking = "focused_node";
      }
      this.nodes.forEach((function(_this) {
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
        return this.editui.set_object_node(new_focused_node);
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
          console.log("removing focus from previous focused_edge");
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
        if (this.focused_edge != null) {
          if (this.edit_mode) {
            return this.text_cursor.pause("", "edit this edge");
          } else {
            return this.text_cursor.pause("", "show edge sources");
          }
        } else {
          return this.text_cursor["continue"]();
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
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = verbs.length; _i < _len; _i++) {
            verb = verbs[_i];
            _results.push(this.human_term[verb]);
          }
          return _results;
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
      var focused, retval;
      focused = this.focused_node;
      if (!focused) {
        return;
      }
      retval = (focused.lid || '') + ' ';
      if (focused.state == null) {
        console.error(retval + ' has no state!!! This is unpossible!!!! name:', focused.name);
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

    Huviz.prototype.position_nodes = function() {
      var only_move_subject;
      only_move_subject = this.edit_mode && this.dragging && this.editui.subject_node;
      return this.nodes.forEach((function(_this) {
        return function(node, i) {
          return _this.reposition_node(node, only_move_subject);
        };
      })(this));
    };

    Huviz.prototype.reposition_node = function(node, only_move_subject) {
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
      var draw_n_n, e, edge_width, edges_between, line_width, msg, n_n, num_edges, sway, _i, _len, _ref, _results;
      num_edges = node.links_to.length;
      if (!num_edges) {
        return;
      }
      draw_n_n = {};
      _ref = node.links_shown;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
        msg = "";
        if (e.source === node) {
          continue;
        }
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
      _results = [];
      for (n_n in draw_n_n) {
        edges_between = draw_n_n[n_n];
        sway = 1;
        _results.push((function() {
          var _j, _len1, _results1;
          _results1 = [];
          for (_j = 0, _len1 = edges_between.length; _j < _len1; _j++) {
            e = edges_between[_j];
            if ((e.focused != null) && e.focused) {
              line_width = this.edge_width * this.peeking_line_thicker;
            } else {
              line_width = edge_width;
            }
            line_width = line_width + (this.line_edge_weight * e.contexts.length);
            this.draw_curvedline(e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, sway, e.color, e.contexts.length, line_width, e);
            if (node.walked) {
              this.draw_walk_edge_from(node, e, sway);
            }
            _results1.push(sway++);
          }
          return _results1;
        }).call(this));
      }
      return _results;
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
            var filclr, img, node_radius, pill_height, pill_width, rndng, special_focus, stroke_color, x, y;
            d.fisheye = _this.fisheye(d);
            if (_this.use_canvas) {
              node_radius = _this.calc_node_radius(d);
              stroke_color = d.color || 'yellow';
              if (d.chosen != null) {
                stroke_color = renderStyles.nodeHighlightOutline;
                special_focus = !!d.walked;
              }
              if (node_display_type === 'pills') {
                pill_width = node_radius * 2;
                pill_height = node_radius * 2;
                filclr = _this.get_node_color_or_color_list(d);
                rndng = 1;
                x = d.fisheye.x;
                y = d.fisheye.y;
                _this.rounded_rectangle(x, y, pill_width, pill_height, rndng, stroke_color, filclr);
              } else if (_this.default_node_url) {
                img = _this.get_or_create_round_img(_this.default_node_url);
                _this.draw_round_img(d.fisheye.x, d.fisheye.y, node_radius, stroke_color, filclr, special_focus, img);
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
      var img, style;
      if (this.round_img_cache == null) {
        this.round_img_cache = {};
      }
      if (!(img = this.round_img_cache[url])) {
        style = "border-radius:100%;position:absolute;top:32px;left:32px;object-fit:cover;width:64px;height:64px";
        style = "border-radius:100%;object-fit:cover;width:64px;height:64px";
        img = document.createElement('img');
        img.src = url;
        img.style = style;
        this.round_img_cache[url] = img;
      }
      return img;
    };

    Huviz.prototype.get_label_attributes = function(d) {
      var browser_font_size, bubble_text, focused_font_size, font_size, height, i, label_length, label_measure, line_height, line_length, ln_i, max_len, max_line_length, min_len, new_line_length, new_line_width, num_lines, num_lines_raw, padding, real_line_length, text, text_cuts, text_split, width, width_default, word, word_length, _i, _len;
      text = d.pretty_name;
      label_measure = this.ctx.measureText(text);
      browser_font_size = 12.8;
      focused_font_size = this.label_em * browser_font_size * this.focused_mag;
      padding = focused_font_size * 0.5;
      line_height = focused_font_size * 1.25;
      max_len = 250;
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
        for (i = _i = 0, _len = text_split.length; _i < _len; i = ++_i) {
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
        focused_font = "" + focused_font_size + "em sans-serif";
        unfocused_font = "" + this.label_em + "em sans-serif";
        focused_pill_font = "" + this.label_em + "em sans-serif";
        label_node = (function(_this) {
          return function(node) {
            var adjust_x, adjust_y, alpha, ctx, cuts, fill, flip, i, label, line_height, node_font_size, outline, pill_height, pill_width, print_label, radians, radius, result, text, textAlign, text_split, x, y, _i, _len;
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
            if (!_this.graphed_set.has(node) && _this.draw_lariat_labels_rotated) {
              radians = node.rad;
              flip = node.fisheye.x < _this.cx;
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
              if (node_display_type === 'pills') {
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
                for (i = _i = 0, _len = text_split.length; _i < _len; i = ++_i) {
                  text = text_split[i];
                  if (cuts && __indexOf.call(cuts, i) >= 0) {
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
                return ctx.fillText("  " + node.pretty_name + "  ", node.fisheye.x, node.fisheye.y);
              }
            }
          };
        })(this);
        this.graphed_set.forEach(label_node);
        this.shelved_set.forEach(label_node);
        return this.discarded_set.forEach(label_node);
      }
    };

    Huviz.prototype.draw_focused_labels = function() {
      var ctx, focused_font, focused_font_size, focused_pill_font, highlight_node;
      ctx = this.ctx;
      focused_font_size = this.label_em * this.focused_mag;
      focused_font = "" + focused_font_size + "em sans-serif";
      focused_pill_font = "" + this.label_em + "em sans-serif";
      highlight_node = (function(_this) {
        return function(node) {
          var adjust_x, adjust_y, alpha, cart_label, cuts, fill, i, label, line_height, node_font_size, outline, pill_height, pill_width, print_label, radius, result, text, text_split, x, y, _i, _len;
          if (node.focused_node || (node.focused_edge != null)) {
            if (node_display_type === 'pills') {
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
              for (i = _i = 0, _len = text_split.length; _i < _len; i = ++_i) {
                text = text_split[i];
                if (cuts && __indexOf.call(cuts, i) >= 0) {
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
                if (_this.cartouches) {
                  _this.draw_cartouche(cart_label, focused_font_size, node.fisheye.x, node.fisheye.y);
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

    Huviz.prototype.tick = function(msg) {
      var _base, _base1;
      if (typeof msg === 'string' && !this.args.skip_log_tick) {
        console.log(msg);
      }
      if (true) {
        if (this.clean_up_all_dirt_onceRunner != null) {
          if (this.clean_up_all_dirt_onceRunner.active) {
            if ((_base = this.clean_up_all_dirt_onceRunner.stats).runTick == null) {
              _base.runTick = 0;
            }
            if ((_base1 = this.clean_up_all_dirt_onceRunner.stats).skipTick == null) {
              _base1.skipTick = 0;
            }
            this.clean_up_all_dirt_onceRunner.stats.skipTick++;
            return;
          } else {
            this.clean_up_all_dirt_onceRunner.stats.runTick++;
          }
        }
      }
      this.ctx.lineWidth = this.edge_width;
      this.find_node_or_edge_closest_to_pointer();
      this.auto_change_verb();
      this.on_tick_change_current_command_if_warranted();
      this.blank_screen();
      this.draw_dropzones();
      this.fisheye.focus(this.last_mouse_pos);
      this.show_last_mouse_pos();
      this.position_nodes();
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

    Huviz.prototype.draw_cartouche = function(label, focused_font_size, x, y) {
      var ctx, focused_font, height, width;
      ctx = this.ctx;
      width = this.ctx.measureText(label).width * focused_font_size;
      focused_font = "" + focused_font_size + "em sans-serif";
      height = this.label_em * this.focused_mag * 16;
      ctx.font = focused_font;
      ctx.strokeStyle = renderStyles.pageBg;
      ctx.lineWidth = 5;
      return ctx.strokeText("  " + label + "  ", x, y);
    };

    Huviz.prototype.draw_edge_labels = function() {
      var edge, _i, _len, _ref, _results;
      if (!this.show_edges) {
        return;
      }
      if (this.focused_edge != null) {
        this.draw_edge_label(this.focused_edge);
      }
      if (this.show_edge_labels_adjacent_to_labelled_nodes) {
        _ref = this.links_set;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          edge = _ref[_i];
          if (edge.target.labelled || edge.source.labelled) {
            _results.push(this.draw_edge_label(edge));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
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
      if (this.cartouches) {
        this.draw_cartouche(label, this.label_em, edge.handle.x, edge.handle.y);
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
      return this.text_cursor.pause("wait");
    };

    Huviz.prototype.hide_state_msg = function() {
      this.state_msg_box.hide();
      return this.text_cursor["continue"]();
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
        pred_name = typeof this.ontology === "function" ? this.ontology(label[pred_lid]) : void 0;
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
          var pair, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = sendHeaders.length; _i < _len; _i++) {
            pair = sendHeaders[_i];
            _results.push(xhr.setRequestHeader(pair[0], pair[1]));
          }
          return _results;
        },
        success: (function(_this) {
          return function(data, textStatus, request) {
            var header, line, val, _i, _len, _results;
            console.log(textStatus);
            console.log(request.getAllResponseHeaders());
            console.table((function() {
              var _i, _len, _ref, _results;
              _ref = request.getAllResponseHeaders().split("\n");
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                line = _ref[_i];
                _results.push(line.split(':'));
              }
              return _results;
            })());
            _results = [];
            for (_i = 0, _len = digestHeaders.length; _i < _len; _i++) {
              header = digestHeaders[_i];
              val = request.getResponseHeader(header);
              if (val != null) {
                _results.push(alert(val));
              } else {
                _results.push(void 0);
              }
            }
            return _results;
          };
        })(this)
      });
    };

    Huviz.prototype.discovery_triple_ingestor_N3 = function(data, textStatus, request, discoArgs) {
      var parser, quadMunger, quadTester, quad_count;
      if (discoArgs == null) {
        discoArgs = {};
      }
      quadTester = discoArgs.quadTester || (function(_this) {
        return function(q) {
          return q != null;
        };
      })(this);
      quadMunger = discoArgs.quadMunger || (function(_this) {
        return function(q) {
          return [q];
        };
      })(this);
      quad_count = 0;
      parser = N3.Parser();
      return parser.parse(data, (function(_this) {
        return function(err, quad, pref) {
          var aQuad, _i, _len, _ref, _results;
          if (err && (discoArgs.onErr != null)) {
            discoArgs.onErr(err);
          }
          if (quadTester(quad)) {
            _ref = quadMunger(quad);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              aQuad = _ref[_i];
              _results.push(_this.inject_discovered_quad_for(quad, discoArgs.aUrl));
            }
            return _results;
          }
        };
      })(this));
    };

    Huviz.prototype.discovery_triple_ingestor_GreenTurtle = function(data, textStatus, request, discoArgs) {
      var aQuad, dataset, frame, graphUri, obj, pred, pred_id, quad, quadMunger, quadTester, subj_uri, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3;
      if (discoArgs == null) {
        discoArgs = {};
      }
      graphUri = discoArgs.graphUri;
      quadTester = discoArgs.quadTester || (function(_this) {
        return function(q) {
          return q != null;
        };
      })(this);
      quadMunger = discoArgs.quadMunger || (function(_this) {
        return function(q) {
          return [q];
        };
      })(this);
      dataset = new GreenerTurtle().parse(data, "text/turtle");
      _ref = dataset.subjects;
      for (subj_uri in _ref) {
        frame = _ref[subj_uri];
        _ref1 = frame.predicates;
        for (pred_id in _ref1) {
          pred = _ref1[pred_id];
          _ref2 = pred.objects;
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            obj = _ref2[_i];
            quad = {
              s: frame.id,
              p: pred.id,
              o: obj,
              g: graphUri
            };
            if (quadTester(quad)) {
              _ref3 = quadMunger(quad);
              for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
                aQuad = _ref3[_j];
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
            var _ref;
            if (quad.s !== aUrl.toString()) {
              return false;
            }
            if (!(_ref = quad.p, __indexOf.call(NAME_SYNS, _ref) >= 0)) {
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

    Huviz.prototype.discover_geoname_name_instructions = "<span style=\"font-size:.7em\">\nBe sure to\n  1) create a\n     <a target=\"geonamesAcct\"\n        href=\"http://www.geonames.org/login\">new account</a>\n  2) validate your email\n  3) on\n     <a target=\"geonamesAcct\"\n        href=\"http://www.geonames.org/manageaccount\">manage account</a>\n     press\n     <a target=\"geonamesAcct\"\n         href=\"http://www.geonames.org/enablefreewebservice\">click here to enable</a>\n 4) re-enter your GeoNames username in HuViz settings to trigger lookup</span>";

    Huviz.prototype.countdown_input = function(inputName) {
      var input, newVal;
      input = $("input[name='" + inputName + "']");
      if (input.val() < 1) {
        return false;
      }
      newVal = input.val() - 1;
      input.val(newVal);
      return true;
    };

    Huviz.prototype.discover_geoname_name = function(aUrl) {
      var id, k2p, userId;
      id = aUrl.pathname.replace(/\//g, '');
      userId = this.discover_geonames_as;
      k2p = this.discover_geoname_key_to_predicate_mapping;
      if (!this.countdown_input('discover_geonames_remaining')) {
        return;
      }
      $.ajax({
        url: "http://api.geonames.org/hierarchyJSON?geonameId=" + id + "&username=" + userId,
        success: (function(_this) {
          return function(json, textStatus, request) {
            var containershipQuad, deep, deeperQuad, depth, geoNamesRoot, geoRec, greedy, key, msg, name, placeQuad, pred, quad, seen_name, subj, theType, value, _i, _ref;
            if (json.status) {
              if (_this.discover_geoname_name_msgs == null) {
                _this.discover_geoname_name_msgs = {};
              }
              if (json.status.message) {
                msg = ("<dt style=\"font-size:.9em;color:red\">" + json.status.message + "</dt>") + _this.discover_geoname_name_instructions;
                if (userId) {
                  msg = "" + userId + " " + msg;
                }
              }
              if ((!_this.discover_geoname_name_msgs[msg]) || (_this.discover_geoname_name_msgs[msg] && Date.now() - _this.discover_geoname_name_msgs[msg] > _this.discover_geoname_name_msgs_threshold_ms)) {
                _this.discover_geoname_name_msgs[msg] = Date.now();
                _this.show_state_msg(msg);
              }
              return;
            }
            geoNamesRoot = aUrl.origin;
            deeperQuad = null;
            greedy = _this.discover_geonames_greedily;
            deep = _this.discover_geonames_deeply;
            depth = 0;
            _ref = json.geonames;
            for (_i = _ref.length - 1; _i >= 0; _i += -1) {
              geoRec = _ref[_i];
              subj = geoNamesRoot + '/' + geoRec.geonameId + '/';
              console.log("discover_geoname_name(" + subj + ")");
              depth++;
              console.table([geoRec]);
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
                  if (!greedy) {
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
                if (!greedy && seen_name) {
                  break;
                }
              }
              if (!deep && depth > 1) {
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
      });
    };


    /*
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

    Huviz.prototype.auto_discover = function(uri, force) {
      var aUrl, e;
      if (uri.startsWith('_')) {
        return;
      }
      try {
        aUrl = new URL(uri);
      } catch (_error) {
        e = _error;
        colorlog("skipping auto_discover('" + uri + "') because");
        console.log(e);
        return;
      }
      if (uri.startsWith("http://id.loc.gov/")) {
        this.ingest_quads_from("" + uri + ".skos.nt", this.discover_labels(uri));
      }
      if (uri.startsWith("http://sws.geonames.org/") && this.discover_geonames_as) {
        this.discover_geoname_name(aUrl);
      }
    };

    Huviz.prototype.discover_names = function(force) {
      var node, _i, _len, _ref, _results;
      _ref = this.nameless_set;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push(this.auto_discover(node.id, force));
      }
      return _results;
    };

    Huviz.prototype.make_qname = function(uri) {
      return uri;
    };

    Huviz.prototype.last_quad = {};

    Huviz.prototype.object_value_types = {};

    Huviz.prototype.unique_pids = {};

    Huviz.prototype.add_quad = function(quad, sprql_subj) {
      var cntx_n, ctxid, edge, isLiteral, is_type, literal_node, make_edge, newsubj, objId, objKey, objVal, obj_n, pred_n, pred_uri, simpleType, subj, subj_lid, subj_n, subj_uri;
      subj_uri = quad.s;
      pred_uri = quad.p;
      ctxid = quad.g || this.DEFAULT_CONTEXT;
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
        this.try_to_set_node_type(subj_n, 'Class');
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
          this.try_to_set_node_type(obj_n, 'Class');
        }
        if (quad.p === RDF_subClassOf && this.show_class_instance_edges) {
          this.try_to_set_node_type(obj_n, 'Class');
        }
        is_type = is_one_of(pred_uri, TYPE_SYNS);
        make_edge = this.show_class_instance_edges || !is_type;
        if (is_type) {
          this.try_to_set_node_type(subj_n, quad.o.value);
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
            if (quad.o.language || (objVal.match(/\s/g) || []).length > 0) {
              objKey = "" + subj_n.lid + " " + pred_uri;
              objId = synthIdFor(objKey);
            } else {
              objId = synthIdFor(objVal);
            }
            literal_node = this.get_or_create_node_by_id(objId, null, (isLiteral = true));
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
      if ((this.endpoint_loader != null) && this.endpoint_loader.value) {
        subj_n.fully_loaded = false;
        if (subj_n.id === quad.subject) {
          subj_n.fully_loaded = true;
        }
      }
      this.last_quad = quad;
      this.pfm_count('add_quad');
      return edge;
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
      var _base;
      if (node.isLiteral) {
        return;
      }
      node.nameless_since = performance.now();
      if ((_base = this.nameless_set).traffic == null) {
        _base.traffic = 0;
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
        alert("len not set");
      }
      if (len > 0) {
        node.pretty_name = node.name.substr(0, len);
      } else {
        node.pretty_name = node.name;
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
      var domain_lid, ranges;
      if (edge.source.type == null) {
        edge.source.type = 'Thing';
      }
      if (edge.target.type == null) {
        edge.target.type = 'Thing';
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
        var _i, _len, _ref, _results;
        _ref = [subj_n, pred_n, obj_n];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          a = _ref[_i];
          _results.push(a.lid);
        }
        return _results;
      })()).join(' ');
    };

    Huviz.prototype.get_or_create_Edge = function(subj_n, obj_n, pred_n, cntx_n) {
      var edge, edge_id;
      edge_id = this.make_Edge_id(subj_n, obj_n, pred_n);
      edge = this.edges_by_id[edge_id];
      if (edge == null) {
        this.edge_count++;
        edge = new Edge(subj_n, obj_n, pred_n);
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
      if (!(__indexOf.call(node._types, type_lid) >= 0)) {
        node._types.push(type_lid);
      }
      prev_type = node.type;
      node.type = type_lid;
      if (prev_type !== type_lid) {
        return this.assign_types(node);
      }
    };

    Huviz.prototype.report_every = 100;

    Huviz.prototype.parseAndShowTTLData = function(data, textStatus, callback) {
      var blurt_msg, context, e, every, frame, msg, obj, parse_start_time, pred, pred_id, quad_count, subj_uri, _i, _len, _ref, _ref1, _ref2;
      parse_start_time = new Date();
      context = "http://universal.org";
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
      _ref = this.G.subjects;
      for (subj_uri in _ref) {
        frame = _ref[subj_uri];
        _ref1 = frame.predicates;
        for (pred_id in _ref1) {
          pred = _ref1[pred_id];
          _ref2 = pred.objects;
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            obj = _ref2[_i];
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
      console.log("object_value_types:", this.object_value_types);
      return console.log("unique_pids:", this.unique_pids);
    };

    Huviz.prototype.parseAndShowTurtle = function(data, textStatus) {
      var key, msg, parse_end_time, parse_start_time, parse_time, parser, predicates, prop_name, prop_obj, show_end_time, show_start_time, show_time, siz, value, _i, _len, _ref;
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
        _ref = ['predicates', 'subjects', 'objects'];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          prop_name = _ref[_i];
          prop_obj = this.my_graph[prop_name];
          console.log(prop_name, ((function() {
            var _results;
            _results = [];
            for (key in prop_obj) {
              value = prop_obj[key];
              _results.push(key);
            }
            return _results;
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
        classes: ['Thing']
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
      var allLines, line, owl_type_map, q, quad_count, _i, _len;
      owl_type_map = {
        uri: RDF_object,
        literal: RDF_literal
      };
      quad_count = 0;
      allLines = data.split(/\r\n|\n/);
      for (_i = 0, _len = allLines.length; _i < _len; _i++) {
        line = allLines[_i];
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
      } else {
        msg = ("Could not load " + url + ". The data file format is not supported! ") + "Only files with TTL and NQ extensions are accepted.";
        this.hide_state_msg();
        this.blurt(msg, 'error');
        $('#' + this.get_data_ontology_display_id()).remove();
        this.reset_dataset_ontology_loader();
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

    Huviz.prototype.sparql_graph_query_and_show = function(url, id, callback) {
      var ajax_settings, graphSelector, qry, spinner;
      qry = "SELECT ?g\nWHERE {\n  GRAPH ?g { }\n}";

      /*
      Reference: https://www.w3.org/TR/sparql11-protocol/
      1. query via GET
      2. query via URL-encoded POST
      3. query via POST directly -- Query String Parameters: default-graph-uri (0 or more); named-graph-uri (0 or more)
                                 -- Request Content Type: application/sparql-query
                                 -- Request Message Body: Unencoded SPARQL query string
       */
      ajax_settings = {
        'type': 'GET',
        'url': url + '?query=' + encodeURIComponent(qry),
        'headers': {
          'Accept': 'application/sparql-results+json'
        }
      };
      if (url === "http://sparql.cwrc.ca/sparql") {
        ajax_settings.headers = {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json'
        };
      }

      /*
      ajax_settings = {
        'type': 'POST'
        'url': url
        'data': qry
        'headers' :
          'Content-Type': 'application/sparql-query'
          'Accept': 'application/sparql-results+json; q=1.0, application/sparql-query, q=0.8'
      }
       */

      /*
      ajax_settings = {
        'type': 'GET'
        'data': ''
        'url': url + '?query=' + encodeURIComponent(qry)
        'headers' :
           *'Accept': 'application/sparql-results+json'
          'Content-Type': 'application/x-www-form-urlencoded'
          'Accept': 'application/sparql-results+json; q=1.0, application/sparql-query, q=0.8'
      }
       */

      /*
      $.ajax
        method: 'GET'
        url: url + '?query=' + encodeURIComponent(littleTestQuery)
        headers:
          'Accept': 'application/sparql-results+json'
        success: (data, textStatus, jqXHR) =>
          console.log "This a little repsponse test: " + textStatus
          console.log jqXHR
          console.log jqXHR.getAllResponseHeaders(data)
          console.log data
        error: (jqxhr, textStatus, errorThrown) =>
          console.log(url, errorThrown)
          console.log jqXHR.getAllResponseHeaders(data)
       */

      /*
       * This is a quick test of the SPARQL Endpoint it should return https://www.w3.org/TR/2013/REC-sparql11-service-description-20130321/#example-turtle
      $.ajax
        method: 'GET'
        url: url
        headers:
          'Accept': 'text/turtle'
        success: (data, textStatus, jqXHR) =>
          console.log "This Enpoint Test: " + textStatus
          console.log jqXHR
          console.log jqXHR.getAllResponseHeaders(data)
          console.log data
        error: (jqxhr, textStatus, errorThrown) =>
          console.log(url, errorThrown)
          console.log jqXHR.getAllResponseHeaders(data)
       */
      graphSelector = "#sparqlGraphOptions-" + id;
      $(graphSelector).parent().css('display', 'none');
      $('#sparqlQryInput').css('display', 'none');
      spinner = $("#sparqlGraphSpinner-" + id);
      spinner.css('display', 'block');
      return $.ajax({
        type: ajax_settings.type,
        url: ajax_settings.url,
        headers: ajax_settings.headers,
        success: (function(_this) {
          return function(data, textStatus, jqXHR) {
            var graph, graph_options, graphsNotFound, json_check, json_data, results, _i, _len;
            json_check = typeof data;
            if (json_check === 'string') {
              json_data = JSON.parse(data);
            } else {
              json_data = data;
            }
            results = json_data.results.bindings;
            graphsNotFound = jQuery.isEmptyObject(results[0]);
            if (graphsNotFound) {
              $(graphSelector).parent().css('display', 'none');
              _this.reset_endpoint_form(true);
              return;
            }
            graph_options = "<option id='" + (_this.unique_id()) + "' value='" + url + "'> All Graphs </option>";
            for (_i = 0, _len = results.length; _i < _len; _i++) {
              graph = results[_i];
              graph_options = graph_options + ("<option id='" + (_this.unique_id()) + "' value='" + graph.g.value + "'>" + graph.g.value + "</option>");
            }
            $("#sparqlGraphOptions-" + id).html(graph_options);
            $(graphSelector).parent().css('display', 'block');
            return _this.reset_endpoint_form(true);
          };
        })(this),
        error: (function(_this) {
          return function(jqxhr, textStatus, errorThrown) {
            var msg;
            console.log(url, errorThrown);
            console.log(jqXHR.getAllResponseHeaders(data));
            $(graphSelector).parent().css('display', 'none');
            if (!errorThrown) {
              errorThrown = "Cross-Origin error";
            }
            msg = errorThrown + " while fetching " + url;
            _this.hide_state_msg();
            $('#' + _this.get_data_ontology_display_id()).remove();
            _this.blurt(msg, 'error');
            _this.reset_dataset_ontology_loader();
            return spinner.css('visibility', 'hidden');
          };
        })(this)
      });
    };

    Huviz.prototype.load_endpoint_data_and_show = function(subject, callback) {
      var ajax_settings, fromGraph, node_limit, qry, url;
      this.sparql_node_list = [];
      this.pfm_count('sparql');
      node_limit = $('#endpoint_limit').val();
      url = this.endpoint_loader.value;
      this.endpoint_loader.outstanding_requests = 0;
      fromGraph = '';
      if (this.endpoint_loader.endpoint_graph) {
        fromGraph = " FROM <" + this.endpoint_loader.endpoint_graph + "> ";
      }

      /*
      qry = """
      SELECT * #{fromGraph}
      WHERE {
      {<#{subject}> ?p ?o} UNION
      {{<#{subject}> ?p ?o} . {?o ?p2 ?o2 . FILTER(?o != <#{subject}>)}}
      }
      LIMIT #{node_limit}
      """
       */

      /*
      qry = """
      SELECT * #{fromGraph}
      WHERE {
      {<#{subject}> ?p ?o}
      UNION
      {{<#{subject}> ?p ?o} . {?o ?p2 ?o2 . FILTER(?o != <#{subject}>)}}
      UNION
      { ?s ?p <#{subject}>}
      }
      LIMIT #{node_limit}
      """
       */
      qry = "SELECT * " + fromGraph + "\nWHERE {\n  {<" + subject + "> ?p ?o}\n  UNION\n  {{<" + subject + "> ?p ?o} . {?o ?p2 ?o2}}\nUNION\n  {{?s3 ?p3 <" + subject + ">} . {?s3 ?p4 ?o4 }}\n}\nLIMIT " + node_limit;
      ajax_settings = {
        'method': 'GET',
        'url': url + '?query=' + encodeURIComponent(qry),
        'headers': {
          'Accept': 'application/sparql-results+json; q=1.0, application/sparql-query, q=0.8'
        }
      };
      if (url === "http://sparql.cwrc.ca/sparql") {
        ajax_settings.headers = {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json'
        };
      }

      /*
      ajax_settings = {
        'method': 'POST'
        'url': url #+ '?query=' + encodeURIComponent(qry)
        'data': qry
        'headers' :
          'Content-Type': 'application/sparql-query'
          'Accept': 'application/sparql-results+json; q=1.0, application/sparql-query, q=0.8'
      }
       */
      return $.ajax({
        method: ajax_settings.method,
        url: ajax_settings.url,
        headers: ajax_settings.headers,
        success: (function(_this) {
          return function(data, textStatus, jqXHR) {
            var disable, endpoint, json_check, json_data;
            json_check = typeof data;
            if (json_check === 'string') {
              json_data = JSON.parse(data);
            } else {
              json_data = data;
            }
            _this.add_nodes_from_SPARQL(json_data, subject);
            endpoint = _this.endpoint_loader.value;
            _this.dataset_loader.disable();
            _this.ontology_loader.disable();
            _this.replace_loader_display_for_endpoint(endpoint, _this.endpoint_loader.endpoint_graph);
            disable = true;
            _this.update_go_button(disable);
            _this.big_go_button.hide();
            return _this.after_file_loaded('sparql', callback);
          };
        })(this),
        error: (function(_this) {
          return function(jqxhr, textStatus, errorThrown) {
            var msg;
            console.log(url, errorThrown);
            console.log(jqXHR.getAllResponseHeaders(data));
            if (!errorThrown) {
              errorThrown = "Cross-Origin error";
            }
            msg = errorThrown + " while fetching " + url;
            _this.hide_state_msg();
            $('#' + _this.get_data_ontology_display_id()).remove();
            _this.blurt(msg, 'error');
            return _this.reset_dataset_ontology_loader();
          };
        })(this)
      });
    };

    Huviz.prototype.load_new_endpoint_data_and_show = function(subject, callback) {
      var ajax_settings, fromGraph, node_limit, note, qry, url;
      node_limit = $('#endpoint_limit').val();
      this.p_total_sprql_requests++;
      note = '';
      url = this.endpoint_loader.value;
      fromGraph = '';
      if (this.endpoint_loader.endpoint_graph) {
        fromGraph = " FROM <" + this.endpoint_loader.endpoint_graph + "> ";
      }
      qry = "SELECT * " + fromGraph + "\nWHERE {\n{<" + subject + "> ?p ?o}\nUNION\n{{<" + subject + "> ?p ?o} . {?o ?p2 ?o2}}\nUNION\n{{?s3 ?p3 <" + subject + ">} . {?s3 ?p4 ?o4 }}\n}\nLIMIT " + node_limit;
      ajax_settings = {
        'method': 'GET',
        'url': url + '?query=' + encodeURIComponent(qry),
        'headers': {
          'Accept': 'application/sparql-results+json; q=1.0, application/sparql-query, q=0.8'
        }
      };
      if (url === "http://sparql.cwrc.ca/sparql") {
        ajax_settings.headers = {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json'
        };
      }
      return $.ajax({
        method: ajax_settings.method,
        url: ajax_settings.url,
        headers: ajax_settings.headers,
        success: (function(_this) {
          return function(data, textStatus, jqXHR) {
            var json_check, json_data;
            note = subject;
            if (_this.p_display) {
              _this.performance_dashboard('sparql_request', note);
            }
            json_check = typeof data;
            if (json_check === 'string') {
              json_data = JSON.parse(data);
            } else {
              json_data = data;
            }
            _this.add_nodes_from_SPARQL(json_data, subject);
            _this.shelved_set.resort();
            _this.tick("Tick in load_new_endpoint_data_and_show success callback");
            _this.update_all_counts();
            return _this.endpoint_loader.outstanding_requests = _this.endpoint_loader.outstanding_requests - 1;
          };
        })(this),
        error: (function(_this) {
          return function(jqxhr, textStatus, errorThrown) {
            var msg;
            console.log(url, errorThrown);
            console.log(jqXHR.getAllResponseHeaders(data));
            if (!errorThrown) {
              errorThrown = "Cross-Origin error";
            }
            msg = errorThrown + " while fetching " + url;
            _this.hide_state_msg();
            $('#' + _this.get_data_ontology_display_id()).remove();
            _this.blurt(msg, 'error');
            return _this.reset_dataset_ontology_loader();
          };
        })(this)
      });
    };

    Huviz.prototype.add_nodes_from_SPARQL = function(json_data, subject) {
      var a_node, context, data, i, language, node, node_list_empty, node_not_in_list, nodes_in_data, obj_type, obj_val, plainLiteral, pred, q, snode, subj, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _results;
      data = '';
      context = "http://universal.org";
      plainLiteral = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";
      console.log("Adding node (i.e. fully exploring): " + subject);
      nodes_in_data = json_data.results.bindings;
      _results = [];
      for (_i = 0, _len = nodes_in_data.length; _i < _len; _i++) {
        node = nodes_in_data[_i];
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
          _ref = this.sparql_node_list;
          for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
            snode = _ref[_j];
            if (q.s === snode.s && q.p === snode.p && q.o.value === snode.o.value && q.o.type === snode.o.type && q.o.language === snode.o.language) {
              node_not_in_list = false;
              if (snode.s === subject || snode.o.value === subject) {
                _ref1 = this.all_set;
                for (i = _k = 0, _len2 = _ref1.length; _k < _len2; i = ++_k) {
                  a_node = _ref1[i];
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
          _results.push(this.add_quad(q, subject));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Huviz.prototype.add_nodes_from_SPARQL_Worker = function(queryTarget) {
      var graph, local_node_added, previous_nodes, query_limit, url, worker;
      console.log("Make request for new query and load nodes");
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
          var a_node, add_fully_loaded, i, quad, _i, _j, _len, _len1, _ref, _ref1;
          add_fully_loaded = e.data.fully_loaded_index;
          _ref = e.data.results;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            quad = _ref[_i];
            _this.add_quad(quad);
            _this.sparql_node_list.push(quad);
            local_node_added++;
          }
          console.log("Node Added Count: " + local_node_added);
          _ref1 = _this.all_set;
          for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
            a_node = _ref1[i];
            if (a_node.id === queryTarget) {
              _this.all_set[i].fully_loaded = true;
            }
          }
          _this.endpoint_loader.outstanding_requests = _this.endpoint_loader.outstanding_requests - 1;
          console.log("Resort the shelf");
          _this.shelved_set.resort();
          _this.tick("Tick in add_nodes_from_SPARQL_worker");
          return _this.update_all_counts();
        };
      })(this));
      return worker.postMessage({
        target: queryTarget,
        url: url,
        graph: graph,
        limit: query_limit,
        previous_nodes: previous_nodes
      });
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
      return this.height = (this.container.clientHeight || window.innerHeight || document.documentElement.clientHeight || document.clientHeight) - pad;
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
      console.log("unshowing links from: " + edge.id);
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
      var node, node_id;
      node_id = uri;
      node = this.nodes.get_by('id', node_id);
      if (node == null) {
        node = this.embryonic_set.get_by('id', node_id);
      }
      if (node == null) {
        node = new Node(node_id, this.use_lid_as_node_name);
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
        name = name || this.ontology.label[node.lid];
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

    Huviz.prototype.get_or_create_node = function(subject, start_point, linked) {
      linked = false;
      return this.get_or_make_node(subject, start_point, linked);
    };

    Huviz.prototype.make_nodes = function(g, limit) {
      var count, subj, subj_uri, subject, _ref, _results;
      limit = limit || 0;
      count = 0;
      _ref = g.subjects;
      _results = [];
      for (subj_uri in _ref) {
        subj = _ref[subj_uri];
        subject = subj;
        this.get_or_make_node(subject, [this.width / 2, this.height / 2], false);
        count++;
        if (limit && count >= limit) {
          break;
        } else {
          _results.push(void 0);
        }
      }
      return _results;
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

    Huviz.prototype.choose = function(chosen) {
      var message, msg, shownness;
      if ((this.endpoint_loader != null) && this.endpoint_loader.value) {
        if (!chosen.fully_loaded) {
          if (this.endpoint_loader.outstanding_requests < 10) {
            this.endpoint_loader.outstanding_requests++;
            this.add_nodes_from_SPARQL_Worker(chosen.id);
            console.log("Request counter: " + this.endpoint_loader.outstanding_requests);
          } else {
            if ($("#blurtbox").html()) {
              console.log("Request counter (over): " + this.endpoint_loader.outstanding_requests);
            } else {
              msg = "There are more than 300 requests in the que. Restricting process. " + message;
              this.blurt(msg, 'alert');
              message = true;
              console.log("Request counter: " + this.endpoint_loader.outstanding_requests);
            }
          }
        }
      }
      this.chosen_set.add(chosen);
      this.nowChosen_set.add(chosen);
      this.graphed_set.acquire(chosen);
      this.show_links_from_node(chosen);
      this.show_links_to_node(chosen);
      this.update_state(chosen);
      shownness = this.update_showing_links(chosen);
      return chosen;
    };

    Huviz.prototype.unchoose = function(unchosen) {
      var link, _i, _ref;
      this.chosen_set.remove(unchosen);
      _ref = unchosen.links_shown;
      for (_i = _ref.length - 1; _i >= 0; _i += -1) {
        link = _ref[_i];
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
      var node, _i, _len, _ref, _results;
      if (!this.wasChosen_set.clear()) {
        throw new Error("expecting wasChosen to be empty");
      }
      _ref = this.chosen_set;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push(this.wasChosen_set.add(node));
      }
      return _results;
    };

    Huviz.prototype.wander__atLast = function() {
      var node, nowRollCall, removed, wasRollCall, _i, _len;
      wasRollCall = this.wasChosen_set.roll_call();
      nowRollCall = this.nowChosen_set.roll_call();
      removed = this.wasChosen_set.filter((function(_this) {
        return function(node) {
          return !_this.nowChosen_set.includes(node);
        };
      })(this));
      for (_i = 0, _len = removed.length; _i < _len; _i++) {
        node = removed[_i];
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
      var pathNode, removed, _i, _ref;
      removed = [];
      _ref = this.walked_set;
      for (_i = _ref.length - 1; _i >= 0; _i += -1) {
        pathNode = _ref[_i];
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
      var lastWalked, tooHairy;
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
      nextStep.walkedIdx0 = this.walked_set.length;
      if (!nextStep.walked) {
        this.walked_set.add(nextStep);
      }
      this.choose(nextStep);
      if (tooHairy) {
        this.shave(tooHairy);
      }
    };

    Huviz.prototype.nodesAreAdjacent = function(n1, n2) {
      var busyNode, link, lonelyNode, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3;
      if ((n1.links_from.length + n1.links_to.length) > (n2.links_from.length + n2.links_to.length)) {
        _ref = [n2, n1], lonelyNode = _ref[0], busyNode = _ref[1];
      } else {
        _ref1 = [n1, n2], lonelyNode = _ref1[0], busyNode = _ref1[1];
      }
      _ref2 = lonelyNode.links_from;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        link = _ref2[_i];
        if (link.target === busyNode) {
          return true;
        }
      }
      _ref3 = lonelyNode.links_to;
      for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
        link = _ref3[_j];
        if (link.source === busyNode) {
          return true;
        }
      }
      return false;
    };

    Huviz.prototype.shave = function(tooHairy) {
      var link, _i, _ref;
      _ref = tooHairy.links_shown;
      for (_i = _ref.length - 1; _i >= 0; _i += -1) {
        link = _ref[_i];
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
          msg = "" + node.__proto__.constructor.name + " " + node.id + " lacks .select()";
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
      var color, taxon_id, _i, _len, _ref, _results;
      if (default_color == null) {
        default_color = 'black';
      }
      if (n._types == null) {
        n._types = [];
      }
      if (this.color_nodes_as_pies && n._types.length > 1) {
        n._colors = [];
        _ref = n._types;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          taxon_id = _ref[_i];
          if (typeof taxon_id === 'string') {
            color = this.get_color_for_node_type(n, taxon_id) || default_color;
            _results.push(n._colors.push(color));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
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
      var node, _i, _len, _ref, _results;
      if (this.nodes) {
        _ref = this.nodes;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          node = _ref[_i];
          _results.push(this.recolor_node(node));
        }
        return _results;
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
      var which, _ref;
      if ((_ref = this.data_uri) != null ? _ref.match('poetesses') : void 0) {
        console.info(this.data_uri, this.data_uri.match('poetesses'));
        which = "poetesses";
      } else {
        which = "orlando";
      }
      return "/snippet/" + which + "/" + snippet_id + "/";
    };

    Huviz.prototype.get_snippet_js_key = function(snippet_id) {
      return "K_" + snippet_id;
    };

    Huviz.prototype.get_snippet = function(snippet_id, callback) {
      var snippet_js_key, snippet_text, url;
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
        this.snippet_box = d3.select('#snippet_box');
        return console.log("init_snippet_box");
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
        my_position = this.get_next_snippet_position();
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

    Huviz.prototype.get_next_snippet_position = function() {
      var height, hinc, hoff, left_full, retval, top_full, vinc, voff, width;
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
      this.snippet_positions_filled[retval] = true;
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
      var edge, _i, _len, _ref, _results;
      _ref = node.links_shown;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        _results.push(edge.focused = false);
      }
      return _results;
    };

    Huviz.prototype.print_edge = function(edge) {
      var context, context_no, make_callback, me, snippet_js_key, _i, _len, _ref, _results;
      context_no = 0;
      _ref = edge.contexts;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        context = _ref[_i];
        snippet_js_key = this.get_snippet_js_key(context.id);
        context_no++;
        if (this.currently_printed_snippets[snippet_js_key] != null) {
          console.log("  skipping because", this.currently_printed_snippets[snippet_js_key]);
          continue;
        }
        me = this;
        make_callback = (function(_this) {
          return function(context_no, edge, context) {
            return function(err, data) {
              var quad, snippet_id, snippet_text;
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
              if (me.currently_printed_snippets[snippet_js_key] == null) {
                me.currently_printed_snippets[snippet_js_key] = [];
              }
              me.currently_printed_snippets[snippet_js_key].push(edge);
              me.snippet_db[snippet_js_key] = snippet_text;
              me.printed_edge = edge;
              quad = {
                subj_uri: edge.source.id,
                pred_uri: edge.predicate.id,
                graph_uri: _this.data_uri
              };
              if (edge.target.isLiteral) {
                quad.obj_val = edge.target.name.toString();
              } else {
                quad.obj_uri = edge.target.id;
              }
              return me.push_snippet({
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
        _results.push(this.get_snippet(context.id, make_callback(context_no, edge, context)));
      }
      return _results;
    };

    Huviz.prototype.print = function(node) {
      var edge, _i, _len, _ref;
      this.clear_snippets();
      _ref = node.links_shown;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
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
      var abbr, prefix, _ref, _results;
      this.gclc.prefixes = {};
      _ref = this.G.prefixes;
      _results = [];
      for (abbr in _ref) {
        prefix = _ref[abbr];
        _results.push(this.gclc.prefixes[abbr] = prefix);
      }
      return _results;
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
      var defaults, ds_rec, k, _i, _len, _ref, _results;
      defaults = preload_group.defaults || {};
      _ref = preload_group.datasets;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ds_rec = _ref[_i];
        for (k in defaults) {
          if (ds_rec[k] == null) {
            ds_rec[k] = defaults[k];
          }
        }
        _results.push(this.ensure_dataset(ds_rec, store_in_db));
      }
      return _results;
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
          return console.log("" + rsrcRec.uri + " added!");
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
            _this.sparql_graph_query_and_show(e.srcElement.result, _this.endpoint_loader.select_id);
            $("#" + _this.dataset_loader.uniq_id).children('select').prop('disabled', 'disabled');
            $("#" + _this.ontology_loader.uniq_id).children('select').prop('disabled', 'disabled');
            $("#" + _this.script_loader.uniq_id).children('select').prop('disabled', 'disabled');
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
          return console.log("" + dataset_uri + " deleted");
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
      console.log("populate_menus_from_IndexedDB(" + why + ")");
      datasetDB_objectStore = this.datasetDB.transaction('datasets').objectStore('datasets');
      count = 0;
      make_onsuccess_handler = (function(_this) {
        return function(why) {
          var recs;
          recs = [];
          return function(event) {
            var cursor, legacyDataset, legacyOntology, rec, _ref;
            cursor = event.target.result;
            if (cursor) {
              count++;
              rec = cursor.value;
              recs.push(rec);
              legacyDataset = !rec.isOntology && !rec.rsrcType;
              legacyOntology = !!rec.isOntology;
              if (((_ref = rec.rsrcType) === 'dataset' || _ref === 'ontology') || legacyDataset || legacyOntology) {
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
              _this.dataset_loader.val('');
              _this.ontology_loader.val('');
              _this.endpoint_loader.val('');
              _this.script_loader.val('');
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
      var preload_group_or_uri, _i, _len, _ref;
      console.groupCollapsed("preload_datasets");
      console.log(this.args.preload);
      if (this.args.preload) {
        _ref = this.args.preload;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          preload_group_or_uri = _ref[_i];
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
      var preload_group_or_uri, _i, _len, _ref;
      console.log(this.args.preload_endpoints);
      console.groupCollapsed("preload_endpoints");
      if (this.args.preload_endpoints) {
        _ref = this.args.preload_endpoints;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          preload_group_or_uri = _ref[_i];
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
      var endpoint_selector, last_val, sel;
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
        this.populate_sparql_label_picker();
        endpoint_selector = "#" + this.endpoint_loader.select_id;
        $(endpoint_selector).change(this.update_endpoint_form);
      }
      if (this.ontology_loader && !this.big_go_button) {
        this.big_go_button_id = this.unique_id('goButton_');
        this.big_go_button = $('<button class="big_go_button">LOAD</button>');
        this.big_go_button.attr('id', this.big_go_button_id);
        $(this.get_or_create_sel_for_picker()).append(this.big_go_button);
        this.big_go_button.click(this.visualize_dataset_using_ontology);
        this.big_go_button.prop('disabled', true);
      }
      this.init_datasetDB();
      this.preload_datasets();
      return typeof this.ontology_loader === "function" ? this.ontology_loader(last_val = null) : void 0;
    };

    Huviz.prototype.update_graph_form = function(e) {
      return this.endpoint_loader.endpoint_graph = e.currentTarget.value;
    };

    Huviz.prototype.visualize_dataset_using_ontology = function(ignoreEvent, dataset, ontologies) {
      var alreadyCommands, data, endpoint_label_uri, onto, scriptUri;
      colorlog('visualize_dataset_using_ontology()', dataset, ontologies);
      this.close_blurt_box();
      endpoint_label_uri = $("#endpoint_labels").val();
      if (endpoint_label_uri) {
        data = dataset || this.endpoint_loader;
        this.load_endpoint_data_and_show(endpoint_label_uri);
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
        throw new Error("Now whoa-up pardner... both data and onto should have .value");
      }
      this.load_data_with_onto(data, onto);
      this.update_browser_title(data);
      this.update_caption(data.value, onto.value);
    };

    Huviz.prototype.load_script_from_db = function(err, rsrcRec) {
      if (err != null) {
        return this.blurt(err, 'error');
      } else {
        return this.load_script_from_JSON(this.parse_script_file(rsrcRec.data, rsrcRec.uri));
      }
    };

    Huviz.prototype.init_gclc = function() {
      var pid, _i, _len, _ref, _results;
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
      _ref = this.predicates_to_ignore;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        pid = _ref[_i];
        _results.push(this.gclui.ignore_predicate(pid));
      }
      return _results;
    };

    Huviz.prototype.disable_dataset_ontology_loader = function(data, onto) {
      var disable;
      this.replace_loader_display(data, onto);
      disable = true;
      this.update_go_button(disable);
      this.dataset_loader.disable();
      this.ontology_loader.disable();
      return this.big_go_button.hide();
    };

    Huviz.prototype.reset_dataset_ontology_loader = function() {
      $('#' + this.get_data_ontology_display_id()).remove();
      this.dataset_loader.enable();
      this.ontology_loader.enable();
      this.big_go_button.show();
      $("#" + this.dataset_loader.select_id + " option[label='Pick or Provide...']").prop('selected', true);
      return this.gclui_JQElem.removeAttr("style", "display:none");
    };

    Huviz.prototype.update_dataset_ontology_loader = function() {
      var ugb;
      if (!((this.dataset_loader != null) && (this.ontology_loader != null) && (this.endpoint_loader != null) && (this.script_loader != null))) {
        console.log("still building loaders...");
        return;
      }
      this.set_ontology_from_dataset_if_possible();
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
      $("#endpoint_labels").prop('disabled', false).val("");
      $("#endpoint_limit").prop('disabled', false).val("100");
      if (show) {
        return $('#sparqlQryInput').css({
          'display': 'block',
          'color': 'inherit'
        });
      } else {
        return $('#sparqlQryInput').css('display', 'none');
      }
    };

    Huviz.prototype.update_go_button = function(disable) {
      var ds_on, ds_v, on_v;
      if (disable == null) {
        if (this.script_loader.value) {
          disable = false;
        } else if ((this.endpoint_loader != null) && this.endpoint_loader.value) {
          disable = false;
        } else {
          ds_v = this.dataset_loader.value;
          on_v = this.ontology_loader.value;
          disable = (!(ds_v && on_v)) || ('provide' === ds_v || 'provide' === on_v);
          ds_on = "" + ds_v + " AND " + on_v;
        }
      }
      this.big_go_button.prop('disabled', disable);
    };

    Huviz.prototype.get_reload_uri = function() {
      return this.reload_uri || new URL(window.location);
    };

    Huviz.prototype.generate_reload_uri = function(dataset, ontology) {
      var uri;
      this.reload_uri = uri = new URL(location);
      uri.hash = "load+" + dataset.value + "+with+" + ontology.value;
      return uri;
    };

    Huviz.prototype.get_data_ontology_display_id = function() {
      if (this.data_ontology_display_id == null) {
        this.data_ontology_display_id = this.unique_id('datontdisp_');
      }
      return this.data_ontology_display_id;
    };

    Huviz.prototype.replace_loader_display = function(dataset, ontology) {
      var controls, data_ontol_display, sel, uri;
      this.generate_reload_uri(dataset, ontology);
      uri = this.get_reload_uri();
      $(this.pickersSel).attr("style", "display:none");
      data_ontol_display = "<div id=\"" + (this.get_data_ontology_display_id()) + "\" class=\"data_ontology_display\">\n  <p><span class=\"dt_label\">Dataset:</span> " + dataset.label + "</p>\n  <p><span class=\"dt_label\">Ontology:</span> " + ontology.label + "</p>\n  <p>\n    <button title=\"Reload this data\"\n       onclick=\"location.replace('" + uri + "');location.reload()\"><i class=\"fas fa-redo\"></i></button>\n    <button title=\"Clear the graph and start over\"\n       onclick=\"location.assign(location.origin)\"><i class=\"fas fa-times\"></i></button>\n  </p>\n  <br style=\"clear:both\">\n</div>";
      sel = this.oldToUniqueTabSel['huvis_controls'];
      controls = document.querySelector(sel);
      controls.insertAdjacentHTML('afterbegin', data_ontol_display);
    };

    Huviz.prototype.replace_loader_display_for_endpoint = function(endpoint, graph) {
      var data_ontol_display, print_graph;
      $(this.pickersSel).attr("style", "display:none");
      if (graph) {
        print_graph = "<p><span class='dt_label'>Graph:</span> " + graph + "</p>";
      } else {
        print_graph = "";
      }
      data_ontol_display = "<div id=\"" + (get_data_ontology_display_id()) + "\">\n  <p><span class=\"dt_label\">Endpoint:</span> " + endpoint + "</p>\n  " + print_graph + "\n  <br style=\"clear:both\">\n</div>";
      return $("#huvis_controls").prepend(data_ontol_display);
    };

    Huviz.prototype.update_browser_title = function(dataset) {
      if (dataset.value) {
        return document.title = dataset.label + " - Huvis Graph Visualization";
      }
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
      this.insertBeforeEnd(this.captionElem, "<span class=\"" + dm + " subliminal\"></span>");
      this.make_JQElem(dm, this.args.huviz_top_sel + ' .' + dm);
      om = 'ontology_watermark';
      this.insertBeforeEnd(this.captionElem, "<span class=\"" + om + " subliminal\"></span>");
      this.make_JQElem(om, this.args.huviz_top_sel + ' .' + om);
    };

    Huviz.prototype.update_caption = function(dataset_str, ontology_str) {
      this.dataset_watermark_JQElem.text(dataset_str);
      this.ontology_watermark_JQElem.text(ontology_str);
    };

    Huviz.prototype.set_ontology_from_dataset_if_possible = function() {
      var ontologyUri, ontology_label, option;
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
      return this.ontology_loader.update_state();
    };

    Huviz.prototype.set_ontology_with_label = function(ontology_label) {
      var ont_opt, sel, topSel, _i, _len, _ref;
      topSel = this.args.huviz_top_sel;
      sel = topSel + (" [label='" + ontology_label + "']");
      _ref = $(sel);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ont_opt = _ref[_i];
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

    Huviz.prototype.populate_sparql_label_picker = function() {
      var fromGraph, select_box, spinner;
      select_box = "<div class='ui-widget' style='display:none;margin-top:5px;margin-left:10px;'>\n  <label>Graphs: </label>\n  <select id=\"sparqlGraphOptions-" + this.endpoint_loader.select_id + "\">\n  </select>\n</div>\n<div id=\"sparqlGraphSpinner-" + this.endpoint_loader.select_id + "\"\n     style='display:none;font-style:italic;'>\n  <i class='fas fa-spinner fa-spin' style='margin: 10px 10px 0 50px;'></i>  Looking for graphs...\n</div>\n<div id=\"sparqlQryInput\" class=ui-widget\n     style='display:none;margin-top:5px;margin-left:10px;color:#999;'>\n  <label for='endpoint_labels'>Find: </label>\n  <input id='endpoint_labels' disabled>\n  <i class='fas fa-spinner fa-spin' style='visibility:hidden;margin-left: 5px;'></i>\n  <div><label for='endpoint_limit'>Node Limit: </label>\n  <input id='endpoint_limit' value='100' disabled>\n  </div>\n</div>";
      $(this.pickersSel).append(select_box);
      spinner = $("#endpoint_labels").siblings('i');
      fromGraph = '';
      return $("#endpoint_labels").autocomplete({
        minLength: 3,
        delay: 500,
        position: {
          collision: "flip"
        },
        source: (function(_this) {
          return function(request, response) {
            var ajax_settings, qry, url;
            spinner.css('visibility', 'visible');
            url = _this.endpoint_loader.value;
            fromGraph = '';
            if (_this.endpoint_loader.endpoint_graph) {
              fromGraph = " FROM <" + _this.endpoint_loader.endpoint_graph + "> ";
            }
            qry = "      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n      PREFIX foaf: <http://xmlns.com/foaf/0.1/>\n      SELECT * " + fromGraph + "\n      WHERE {\n?sub rdfs:label|foaf:name ?obj .\n      filter contains(?obj,\"" + request.term + "\")\n      }\n      LIMIT 20";
            ajax_settings = {
              'method': 'GET',
              'url': url + '?query=' + encodeURIComponent(qry),
              'headers': {
                'Accept': 'application/sparql-results+json'
              }
            };
            if (url === "http://sparql.cwrc.ca/sparql") {
              ajax_settings.headers = {
                'Content-Type': 'application/sparql-query',
                'Accept': 'application/sparql-results+json'
              };
            }
            return $.ajax({
              method: ajax_settings.method,
              url: ajax_settings.url,
              headers: ajax_settings.headers,
              success: function(data, textStatus, jqXHR) {
                var json_check, json_data, label, results, selections, this_result, _i, _len;
                json_check = typeof data;
                if (json_check === 'string') {
                  json_data = JSON.parse(data);
                } else {
                  json_data = data;
                }
                results = json_data.results.bindings;
                selections = [];
                for (_i = 0, _len = results.length; _i < _len; _i++) {
                  label = results[_i];
                  this_result = {
                    label: label.obj.value + (" (" + label.sub.value + ")"),
                    value: label.sub.value
                  };
                  selections.push(this_result);
                  spinner.css('visibility', 'hidden');
                }
                return response(selections);
              },
              error: function(jqxhr, textStatus, errorThrown) {
                var msg;
                console.log(url, errorThrown);
                console.log(textStatus);
                if (!errorThrown) {
                  errorThrown = "Cross-Origin error";
                }
                msg = errorThrown + " while fetching " + url;
                _this.hide_state_msg();
                $('#' + _this.get_data_ontology_display_id()).remove();
                $("#endpoint_labels").siblings('i').css('visibility', 'hidden');
                return _this.blurt(msg, 'error');
              }
            });
          };
        })(this)
      });
    };

    Huviz.prototype.init_editc = function() {
      return this.editui != null ? this.editui : this.editui = new EditController(this);
    };

    Huviz.prototype.set_edit_mode = function(mode) {
      return this.edit_mode = mode;
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
      this.text_cursor.set_cursor("wait");
      return $("body").css("background-color", "red");
    };

    Huviz.prototype.after_running_command = function() {
      this.text_cursor.set_cursor("default");
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
        cssClass: 'huvis_controls scrolling_tab unselectable',
        title: "Power tools for controlling the graph",
        text: "Commands"
      }, {
        cssClass: 'tabs-options scrolling_tab',
        title: "Fine tune sizes, lengths and thicknesses",
        text: "Settings"
      }, {
        cssClass: 'tabs-history',
        title: "The command history",
        text: "History"
      }, {
        cssClass: 'tabs-credit scrolling_tab',
        title: "Academic, funding and technical credit",
        text: "Credit",
        bodyUrl: "/huviz/docs/credits.md"
      }, {
        cssClass: "tabs-tutor scrolling_tab",
        title: "A tutorial",
        text: "Tutorial",
        bodyUrl: "/huviz/docs/tutorial.md"
      }
    ];

    Huviz.prototype.make_tabs_html = function() {
      var firstClass, firstClass_, html, id, idSel, jQElem_list, mkcb, t, tab_specs, theDivs, theTabs, _i, _len;
      this.oldToUniqueTabSel = {};
      jQElem_list = [];
      theTabs = "<ul class=\"the-tabs\">";
      theDivs = "";
      tab_specs = this.args.tab_specs || this.default_tab_specs;
      for (_i = 0, _len = tab_specs.length; _i < _len; _i++) {
        t = tab_specs[_i];
        firstClass = t.cssClass.split(' ')[0];
        firstClass_ = firstClass.replace(/\-/, '_');
        id = this.unique_id(firstClass + '_');
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
    };

    Huviz.prototype.create_tabs = function() {
      var elem, html, jQElem_list, pair, _i, _len, _ref;
      elem = document.querySelector(this.args.create_tabs_adjacent_to_selector);
      _ref = this.make_tabs_html(), html = _ref[0], jQElem_list = _ref[1];
      this.addHTML(html);
      for (_i = 0, _len = jQElem_list.length; _i < _len; _i++) {
        pair = jQElem_list[_i];
        this.make_JQElem(pair[0], pair[1]);
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
      var html;
      html = "<div id=\"" + (sel_to_id(id)) + "\" class=\"" + classes + "\"></div>";
      if (specialElem) {
        this.insertBeforeEnd(specialElem, html);
      } else {
        this.addHTML(html);
      }
    };

    Huviz.prototype.ensure_divs = function() {
      var classes, elem, id, key, key_sel, sel, specialParent, specialParentElem, specialParentSel, specialParentSelKey, _i, _len, _ref;
      _ref = this.needed_divs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        key = _ref[_i];
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
    };

    Huviz.prototype.make_JQElems = function() {
      var key, sel, _i, _len, _ref;
      _ref = this.needed_JQElems;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        key = _ref[_i];
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
        huviz_top_sel: unique_id('#huviz_top_'),
        make_pickers: true,
        performance_dashboard_sel: unique_id('#performance_dashboard_'),
        settings: {},
        skip_log_tick: true,
        state_msg_box_sel: unique_id('#state_msg_box_'),
        status_sel: unique_id('#status_'),
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

    Huviz.prototype.needed_JQElems = ['gclui', 'performance_dashboard', 'viscanvas'];

    Huviz.prototype.calculate_args = function(incoming_args) {
      var args, def_args;
      if (incoming_args == null) {
        incoming_args = {};
      }
      if (!incoming_args.huviz_top_sel) {
        console.warn('you have not provided a value for huviz_top_sel so it will be appended to BODY');
      }
      def_args = Object.assign({}, this.make_default_args());
      args = Object.assign(def_args, incoming_args);
      if (args.create_tabs_adjacent_to_selector == null) {
        args.create_tabs_adjacent_to_selector = args.huviz_top_sel;
      }
      return args;
    };

    function Huviz(incoming_args) {
      this.pfm_update = __bind(this.pfm_update, this);
      this.pfm_count = __bind(this.pfm_count, this);
      this.build_pfm_live_monitor = __bind(this.build_pfm_live_monitor, this);
      this.pfm_dashboard = __bind(this.pfm_dashboard, this);
      this.change_setting_to_from = __bind(this.change_setting_to_from, this);
      this.update_graph_settings = __bind(this.update_graph_settings, this);
      this.update_graph_controls_cursor = __bind(this.update_graph_controls_cursor, this);
      this.init_graph_controls_from_json = __bind(this.init_graph_controls_from_json, this);
      this.dump_current_settings = __bind(this.dump_current_settings, this);
      this.expand_tabs = __bind(this.expand_tabs, this);
      this.collapse_tabs = __bind(this.collapse_tabs, this);
      this.fullscreen = __bind(this.fullscreen, this);
      this.close_blurt_box = __bind(this.close_blurt_box, this);
      this.blurt = __bind(this.blurt, this);
      this.populate_sparql_label_picker = __bind(this.populate_sparql_label_picker, this);
      this.reset_endpoint_form = __bind(this.reset_endpoint_form, this);
      this.update_endpoint_form = __bind(this.update_endpoint_form, this);
      this.update_dataset_ontology_loader = __bind(this.update_dataset_ontology_loader, this);
      this.load_script_from_db = __bind(this.load_script_from_db, this);
      this.visualize_dataset_using_ontology = __bind(this.visualize_dataset_using_ontology, this);
      this.update_graph_form = __bind(this.update_graph_form, this);
      this.ensure_datasets_from_XHR = __bind(this.ensure_datasets_from_XHR, this);
      this.ensure_datasets = __bind(this.ensure_datasets, this);
      this.register_gclc_prefixes = __bind(this.register_gclc_prefixes, this);
      this.undraw_edge_regarding = __bind(this.undraw_edge_regarding, this);
      this.draw_edge_regarding = __bind(this.draw_edge_regarding, this);
      this.redact = __bind(this.redact, this);
      this.print = __bind(this.print, this);
      this.peek = __bind(this.peek, this);
      this.clear_snippets = __bind(this.clear_snippets, this);
      this.hunt = __bind(this.hunt, this);
      this.animate_hunt = __bind(this.animate_hunt, this);
      this.unselect = __bind(this.unselect, this);
      this.select = __bind(this.select, this);
      this.hide = __bind(this.hide, this);
      this.walk = __bind(this.walk, this);
      this.wander = __bind(this.wander, this);
      this.wander__atLast = __bind(this.wander__atLast, this);
      this.wander__atFirst = __bind(this.wander__atFirst, this);
      this.unchoose = __bind(this.unchoose, this);
      this.choose = __bind(this.choose, this);
      this.shelve = __bind(this.shelve, this);
      this.clean_up_all_dirt = __bind(this.clean_up_all_dirt, this);
      this.clean_up_dirty_predicates = __bind(this.clean_up_dirty_predicates, this);
      this.update_searchterm = __bind(this.update_searchterm, this);
      this.sparql_graph_query_and_show = __bind(this.sparql_graph_query_and_show, this);
      this.DUMPER = __bind(this.DUMPER, this);
      this.parse_and_show_NQ_file = __bind(this.parse_and_show_NQ_file, this);
      this.choose_everything = __bind(this.choose_everything, this);
      this.parseAndShowTurtle = __bind(this.parseAndShowTurtle, this);
      this.parseAndShowTTLData = __bind(this.parseAndShowTTLData, this);
      this.ingest_quads_from = __bind(this.ingest_quads_from, this);
      this.discover_labels = __bind(this.discover_labels, this);
      this.make_triple_ingestor = __bind(this.make_triple_ingestor, this);
      this.discovery_triple_ingestor_GreenTurtle = __bind(this.discovery_triple_ingestor_GreenTurtle, this);
      this.discovery_triple_ingestor_N3 = __bind(this.discovery_triple_ingestor_N3, this);
      this.hide_state_msg = __bind(this.hide_state_msg, this);
      this.tick = __bind(this.tick, this);
      this.get_gravity = __bind(this.get_gravity, this);
      this.get_charge = __bind(this.get_charge, this);
      this.updateWindow = __bind(this.updateWindow, this);
      this.mouseright = __bind(this.mouseright, this);
      this.mouseup = __bind(this.mouseup, this);
      this.mousedown = __bind(this.mousedown, this);
      this.mousemove = __bind(this.mousemove, this);
      this.like_string = __bind(this.like_string, this);
      var search_input, _base;
      this.git_commit_hash = window.HUVIZ_GIT_COMMIT_HASH;
      this.args = this.calculate_args(incoming_args);
      this.ensureTopElem();
      if (this.args.create_tabs_adjacent_to_selector) {
        this.create_tabs();
      }
      this.tabsJQElem = $('#' + this.tabs_id);
      this.replace_human_term_spans(this.tabs_id);
      if (this.args.add_to_HVZ) {
        if (window.HVZ == null) {
          window.HVZ = [];
        }
        window.HVZ.push(this);
      }
      if ((_base = this.args).graph_controls_sel == null) {
        _base.graph_controls_sel = this.oldToUniqueTabSel['tabs-options'];
      }
      this.create_blurtbox();
      this.ensure_divs();
      this.make_JQElems();
      this.create_collapse_expand_handles();
      this.create_fullscreen_handle();
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

      /*
      if not d3.select(@args.viscanvas_sel)[0][0]
        new throw Error('expectling @args.viscanvas_sel to be found')
         *d3.select("body").append("div").attr("id", "viscanvas")
       */
      this.container = d3.select(this.args.viscanvas_sel).node().parentNode;
      this.init_graph_controls_from_json();
      this.apply_settings(this.args.settings);
      if (this.use_fancy_cursor) {
        this.text_cursor = new TextCursor(this.args.viscanvas_sel, "");
        this.install_update_pointer_togglers();
      }
      this.create_state_msg_box();
      this.viscanvas = d3.select(this.args.viscanvas_sel).html("").append("canvas").attr("width", this.width).attr("height", this.height);
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
      $('.open_tab').click((function(_this) {
        return function(event) {
          var tab_idx;
          tab_idx = parseInt($(event.target).attr('href').replace("#", ""));
          _this.goto_tab(tab_idx);
          return false;
        };
      })(this));
    }

    Huviz.prototype.create_blurtbox = function() {
      var blurtbox_id, html, tabsElem;
      blurtbox_id = this.unique_id('blurtbox_');
      tabsElem = document.querySelector('#' + this.tabs_id);
      html = "<div id=\"" + blurtbox_id + "\" class=\"blurtbox\"></div>";
      this.insertBeforeEnd(tabsElem, html);
      this.blurtbox_JQElem = $('#' + blurtbox_id);
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
      var elem;
      elem = document.getElementById("body");
      return elem.webkitRequestFullscreen();
    };

    Huviz.prototype.collapse_tabs = function() {
      this.tabsJQElem.prop('style', 'visibility:hidden;width:0');
      return this.tabsJQElem.find('.expand_cntrl').prop('style', 'visibility:visible');
    };

    Huviz.prototype.expand_tabs = function() {
      this.tabsJQElem.prop('style', 'visibility:visible');
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
      var canonical, human, selector, _ref, _results;
      optional_class = optional_class || 'a_human_term';
      _ref = this.human_term;
      _results = [];
      for (canonical in _ref) {
        human = _ref[canonical];
        selector = '.human_term__' + canonical;
        _results.push($(selector).text(human).addClass(optional_class));
      }
      return _results;
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
      undraw: 'UNDRAW'
    };

    Huviz.prototype.default_graph_controls = [
      {
        reset_controls_to_default: {
          label: {
            title: "Reset all controls to default"
          },
          input: {
            type: "button",
            label: "Reset All",
            style: "background-color: #555"
          },
          event_type: "change"
        }
      }, {
        focused_mag: {
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
        snippet_triple_em: {
          text: "snippet triple (em)",
          label: {
            title: "the size of the snippet triples"
          },
          input: {
            value: .5,
            min: .2,
            max: 4,
            step: .1,
            type: "range"
          }
        }
      }, {
        charge: {
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
          text: "gravity",
          label: {
            title: "the attractive force keeping nodes centered"
          },
          input: {
            value: 0.50,
            min: 0,
            max: 1,
            step: 0.025,
            type: "range"
          }
        }
      }, {
        shelf_radius: {
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
          text: "link distance",
          label: {
            title: "how long the lines are"
          },
          input: {
            value: 29,
            min: 5,
            max: 200,
            step: 2,
            type: "range"
          }
        }
      }, {
        edge_width: {
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
          text: "sway fraction",
          label: {
            title: "how much curvature lines have"
          },
          input: {
            value: 0.22,
            min: 0.001,
            max: 0.6,
            step: 0.01,
            type: "range"
          }
        }
      }, {
        label_graphed: {
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
        slow_it_down: {
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
        snippet_count_on_edge_labels: {
          text: "snippet count on edge labels",
          label: {
            title: "whether edges have their snippet count shown as (#)"
          },
          input: {
            checked: "checked",
            type: "checkbox"
          },
          event_type: "change"
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
          },
          event_type: "change"
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
          },
          event_type: "change"
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
          },
          event_type: "change"
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
          },
          event_type: "change"
        }
      }, {
        pill_display: {
          text: "Display graph with boxed labels",
          label: {
            title: "Show boxed labels on graph"
          },
          input: {
            type: "checkbox"
          },
          event_type: "change"
        }
      }, {
        theme_colors: {
          text: "Display graph with dark theme",
          label: {
            title: "Show graph plotted on a black background"
          },
          input: {
            type: "checkbox"
          },
          event_type: "change"
        }
      }, {
        display_label_cartouches: {
          text: "Background cartouches for labels",
          label: {
            title: "Remove backgrounds from focused labels"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          },
          event_type: "change"
        }
      }, {
        display_shelf_clockwise: {
          text: "Display nodes clockwise",
          label: {
            title: "Display clockwise (uncheck for counter-clockwise)"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          },
          event_type: "change"
        }
      }, {
        choose_node_display_angle: {
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
        color_nodes_as_pies: {
          text: "Color nodes as pies",
          style: "color:orange",
          label: {
            title: "Show all a nodes types as colored pie pieces"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        prune_walk_nodes: {
          text: "Walk styles ",
          style: "display:none",
          label: {
            title: "As path is walked, keep or prune connected nodes on selected steps"
          },
          input: {
            type: "select"
          },
          options: [
            {
              label: "Directional (pruned)",
              value: "directional_path",
              selected: true
            }, {
              label: "Non-directional (pruned)",
              value: "pruned_path"
            }, {
              label: "Non-directional (unpruned)",
              value: "hairy_path"
            }
          ],
          event_type: "change"
        }
      }, {
        make_nodes_for_literals: {
          style: "color:orange",
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
        show_hide_endpoint_loading: {
          style: "color:orange",
          text: "Show SPARQL endpoint loading forms",
          label: {
            title: "Show SPARQL endpoint interface for querying for nodes"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        show_hide_performance_monitor: {
          style: "color:orange",
          text: "Show Performance Monitor",
          label: {
            title: "Feedback on what HuViz is doing"
          },
          input: {
            type: "checkbox"
          }
        }
      }, {
        graph_title_style: {
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
              value: "subliminal"
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
          ],
          event_type: "change"
        }
      }, {
        graph_custom_main_title: {
          style: "display:none",
          text: "Custom Title",
          label: {
            title: "Title that appears on the graph background"
          },
          input: {
            type: "text",
            size: "16",
            placeholder: "Enter Title"
          },
          event_type: "change"
        }
      }, {
        graph_custom_sub_title: {
          style: "display:none",
          text: "Custom Sub-title",
          label: {
            title: "Sub-title that appears below main title"
          },
          input: {
            type: "text",
            size: "16",
            placeholder: "Enter Sub-title"
          },
          event_type: "change"
        }
      }, {
        debug_shelf_angles_and_flipping: {
          style: "color:orange;display:none",
          text: "debug shelf angles and flipping",
          label: {
            title: "show angles and flags with labels"
          },
          input: {
            type: "checkbox"
          },
          event_type: "change"
        }
      }, {
        language_path: {
          text: "Language Path",
          label: {
            title: "Preferred languages in order, with : separator."
          },
          input: {
            type: "text",
            value: (window.navigator.language.substr(0, 2) + ":en:ANY:NOLANG").replace("en:en:", "en:"),
            size: "16",
            placeholder: "en:es:fr:de:ANY:NOLANG"
          },
          event_type: "change"
        }
      }, {
        show_class_instance_edges: {
          style: "color:orange",
          text: "Show class-instance relationships",
          label: {
            title: "display the class-instance relationship as an edge"
          },
          input: {
            type: "checkbox"
          },
          event_type: "change"
        }
      }, {
        discover_geonames_as: {
          style: "color:orange",
          html_text: '<a href="http://www.geonames.org/login" taret="geonamesAcct">Geonames</a> Username',
          label: {
            title: "The GeoNames Username to look up geonames as"
          },
          input: {
            type: "text",
            value: "",
            size: "16",
            placeholder: "eg huviz"
          },
          event_type: "change"
        }
      }, {
        discover_geonames_remaining: {
          style: "color:orange",
          text: 'GeoNames Limit ',
          label: {
            title: "The number of Remaining Geonames to look up"
          },
          input: {
            type: "integer",
            value: 20,
            size: 6
          },
          event_type: "change"
        }
      }, {
        discover_geonames_greedily: {
          style: "color:orange",
          text: "Capture GeoNames Greedily",
          label: {
            title: "Capture not just names but population"
          },
          input: {
            type: "checkbox"
          },
          event_type: "change"
        }
      }, {
        discover_geonames_deeply: {
          style: "color:orange",
          text: "Capture GeoNames Deeply",
          label: {
            title: "Capture not directly referenced but the containing geographical places from GeoNames"
          },
          input: {
            type: "checkbox"
          },
          event_type: "change"
        }
      }, {
        show_edge_labels_adjacent_to_labelled_nodes: {
          style: "color:orange",
          text: "Show adjacent edge labels",
          label: {
            title: "Show edge labels adjacent to labelled nodes"
          },
          input: {
            type: "checkbox"
          },
          event_type: "change"
        }
      }, {
        show_hunt_verb: {
          style: "color:orange;display:none",
          text: "Show Hunt verb",
          label: {
            title: "Show the Hunt verb"
          },
          input: {
            type: "checkbox"
          },
          event_type: "change"
        }
      }, {
        show_edges: {
          style: "color:red",
          text: "Show Edges",
          label: {
            title: "Do draw edges"
          },
          input: {
            type: "checkbox",
            checked: "checked"
          },
          event_type: "change"
        }
      }, {
        single_chosen: {
          style: "color:red",
          text: "Single Active Node",
          label: {
            title: "Only use verbs which have one chosen node at a time"
          },
          input: {
            type: "checkbox"
          },
          event_type: "change"
        }
      }
    ];

    Huviz.prototype.dump_current_settings = function(post) {
      this.tabs_options_JQElem.html('');
      this.init_graph_controls_from_json();
      this.on_change_graph_title_style("subliminal");
      return this.on_change_prune_walk_nodes("directional_path");
    };

    Huviz.prototype.auto_adjust_settings = function() {
      return this;
    };

    Huviz.prototype.init_graph_controls_from_json = function() {
      var a, control, control_name, control_spec, graph_control, graph_controls_input_sel, input, k, label, old_val, option, v, value, _i, _len, _ref, _ref1, _ref2;
      graph_controls_input_sel = this.args.graph_controls_sel + ' input';
      this.graph_controls_cursor = new TextCursor(graph_controls_input_sel, "");
      if (this.graph_controls_cursor) {
        $(graph_controls_input_sel).on("mouseover", this.update_graph_controls_cursor);
      }
      this.graph_controls = d3.select(this.args.graph_controls_sel);
      this.graph_controls.classed('graph_controls', true);
      _ref = this.default_graph_controls;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        control_spec = _ref[_i];
        for (control_name in control_spec) {
          control = control_spec[control_name];
          graph_control = this.graph_controls.append('div').attr('id', control_name).attr('class', 'graph_control');
          label = graph_control.append('label');
          if (control.text != null) {
            label.text(control.text);
          }
          if (control.html_text) {
            label.html(control.html_text);
          }
          if (control.label != null) {
            label.attr(control.label);
          }
          if (control.style != null) {
            graph_control.attr("style", control.style);
          }
          if (control["class"] != null) {
            graph_control.attr('class', 'graph_control ' + control["class"]);
          }
          if (control.input.type === 'select') {
            input = label.append('select');
            input.attr("name", control_name);
            _ref1 = control.options;
            for (a in _ref1) {
              v = _ref1[a];
              option = input.append('option');
              if (v.selected) {
                option.html(v.label).attr("value", v.value).attr("selected", "selected");
              } else {
                option.html(v.label).attr("value", v.value);
              }
            }
          } else if (control.input.type === 'button') {
            input = label.append('button');
            input.attr("type", "button");
            input.html("Reset All");
            input.on("click", this.dump_current_settings);
          } else {
            input = label.append('input');
            input.attr("name", control_name);
            if (control.input != null) {
              _ref2 = control.input;
              for (k in _ref2) {
                v = _ref2[k];
                if (k === 'value') {
                  old_val = this[control_name];
                  this.change_setting_to_from(control_name, v, old_val);
                }
                input.attr(k, v);
              }
            }
            if (control.input.type === 'checkbox') {
              value = control.input.checked != null;
              this.change_setting_to_from(control_name, value, void 0);
            }
          }
          if (control.event_type === 'change') {
            input.on("change", this.update_graph_settings);
          } else {
            input.on("input", this.update_graph_settings);
          }
        }
      }
      this.tabs_options_JQElem.append("<div class='buffer_space'></div>");
    };

    Huviz.prototype.update_graph_controls_cursor = function(evt) {
      var cursor_text;
      cursor_text = evt.target.value.toString();
      if (!cursor_text) {
        console.debug(cursor_text);
      } else {
        console.log(cursor_text);
      }
      return this.graph_controls_cursor.set_text(cursor_text);
    };

    Huviz.prototype.update_graph_settings = function(target, update) {
      var asNum, cooked_value, old_value;
      target = (target != null) && target || d3.event.target;
      update = (update == null) && true || update;
      update = !update;
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
      d3.select(target).attr("title", cooked_value);
      if (update) {
        this.update_fisheye();
        this.updateWindow();
      }
      return this.tick("Tick in update_graph_settings");
    };

    Huviz.prototype.apply_settings = function(settings) {
      var setting, value, _results;
      _results = [];
      for (setting in settings) {
        value = settings[setting];
        this.change_setting_to_from(setting, value);
        _results.push(console.warn("should adjust the Settings INPUT for " + setting + " too"));
      }
      return _results;
    };

    Huviz.prototype.change_setting_to_from = function(setting_name, new_value, old_value, skip_custom_handler) {
      var cursor_text, custom_handler, custom_handler_name;
      skip_custom_handler = (skip_custom_handler != null) && skip_custom_handler || false;
      custom_handler_name = "on_change_" + setting_name;
      custom_handler = this[custom_handler_name];
      if (this.graph_controls_cursor) {
        cursor_text = new_value.toString();
        this.graph_controls_cursor.set_text(cursor_text);
      }
      if ((custom_handler != null) && !skip_custom_handler) {
        return custom_handler.apply(this, [new_value, old_value]);
      } else {
        return this[setting_name] = new_value;
      }
    };

    Huviz.prototype.on_change_nodes_pinnable = function(new_val, old_val) {
      var node, _i, _len, _ref, _results;
      if (!new_val) {
        if (this.graphed_set) {
          _ref = this.graphed_set;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            node = _ref[_i];
            _results.push(node.fixed = false);
          }
          return _results;
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

    Huviz.prototype.on_change_pill_display = function(new_val) {
      if (new_val) {
        node_display_type = 'pills';
        $("input[name='charge']").attr('min', '-5000').attr('value', '-3000');
        $("input[name='link_distance']").attr('max', '500').attr('value', '200');
        this.charge = -3000;
        this.link_distance = 200;
      } else {
        node_display_type = "";
        $("input[name='charge']").attr('min', '-600').attr('value', '-200');
        $("input[name='link_distance']").attr('max', '200').attr('value', '29');
        this.charge = -200;
        this.link_distance = 29;
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
      console.log(this.topElem);
      return this.updateWindow();
    };

    Huviz.prototype.on_change_display_label_cartouches = function(new_val) {
      if (new_val) {
        this.cartouches = true;
      } else {
        this.cartouches = false;
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
      var node, _i, _len, _ref;
      this.change_setting_to_from('truncate_labels_to', new_val, old_val, true);
      if (this.all_set) {
        _ref = this.all_set;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          node = _ref[_i];
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
        $("#graph_custom_main_title").css('display', 'inherit');
        $("#graph_custom_sub_title").css('display', 'inherit');
        custTitle = this.topJQElem.find("input[name='graph_custom_main_title']");
        custSubTitle = this.topJQElem.find("input[name='graph_custom_sub_title']");
        this.update_caption(custTitle[0].title, custSubTitle[0].title);
        this.topJQElem.find("a.git_commit_hash_watermark").css('display', 'none');
        this.ontology_watermark_JQElem.attr('style', '');
      } else if (new_val === "bold1") {
        this.ontology_watermark_JQElem.css('display', 'none');
      } else {
        $("#graph_custom_main_title").css('display', 'none');
        $("#graph_custom_sub_title").css('display', 'none');
        this.topJQElem.find("a.git_commit_hash_watermark").css('display', 'inherit');
        this.ontology_watermark_JQElem.attr('style', '');
        this.update_caption(this.dataset_loader.value, this.ontology_loader.value);
      }
      this.dataset_watermark_JQElem.removeClass().addClass(new_val);
      return this.ontology_watermark_JQElem.removeClass().addClass(new_val);
    };

    Huviz.prototype.on_change_graph_custom_main_title = function(new_val) {
      return this.dataset_watermark_JQElem.text(new_val);
    };

    Huviz.prototype.on_change_graph_custom_sub_title = function(new_val) {
      return this.ontology_watermark_JQElem.text(new_val);
    };

    Huviz.prototype.on_change_language_path = function(new_val, old_val) {
      var e, _ref;
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
      if ((_ref = this.gclui) != null) {
        _ref.resort_pickers();
      }
      if (this.ctx != null) {
        this.tick("Tick in on_change_language_path");
      }
    };

    Huviz.prototype.on_change_color_nodes_as_pies = function(new_val, old_val) {
      this.color_nodes_as_pies = new_val;
      return this.recolor_nodes();
    };

    Huviz.prototype.on_change_prune_walk_nodes = function(new_val, old_val) {
      return this.prune_walk_nodes = new_val;
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

    Huviz.prototype.on_change_show_hide_performance_monitor = function(new_val, old_val) {
      console.log("clicked performance monitor " + new_val + " " + old_val);
      if (new_val) {
        this.performance_dashboard_JQElem.css('display', 'block');
        this.pfm_display = true;
        this.pfm_dashboard();
        return this.timerId = setInterval(this.pfm_update, 1000);
      } else {
        clearInterval(this.timerId);
        this.performance_dashboard_JQElem.css('display', 'none').html('');
        return this.pfm_display = false;
      }
    };

    Huviz.prototype.on_change_discover_geonames_as = function(new_val, old_val) {
      this.discover_geonames_as = new_val;
      if (new_val) {
        if (this.nameless_set) {
          return this.discover_names();
        }
      }
    };

    Huviz.prototype.init_from_graph_controls = function() {
      var elem, _i, _len, _ref, _results;
      _ref = $(".graph_controls input");
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        _results.push(this.update_graph_settings(elem, false));
      }
      return _results;
    };

    Huviz.prototype.after_file_loaded = function(uri, callback) {
      this.fire_fileloaded_event(uri);
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

    Huviz.prototype.fire_fileloaded_event = function(uri) {
      document.dispatchEvent(new CustomEvent("dataset-loaded", {
        detail: uri
      }));
      return window.dispatchEvent(new CustomEvent('fileloaded', {
        detail: {
          message: "file loaded",
          time: new Date()
        },
        bubbles: true,
        cancelable: true
      }));
    };

    Huviz.prototype.XXX_load_file = function() {
      return this.load_data_with_onto(this.get_dataset_uri());
    };

    Huviz.prototype.load_data_with_onto = function(data, onto, callback) {
      this.data_uri = data.value;
      this.set_ontology(onto.value);
      if (this.args.display_reset) {
        $("#reset_btn").show();
      } else {
        this.disable_dataset_ontology_loader(data, onto);
      }
      this.show_state_msg("loading...");
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
      var cmdArgs, saul_goodman, _i, _len;
      saul_goodman = false;
      for (_i = 0, _len = json.length; _i < _len; _i++) {
        cmdArgs = json[_i];
        if (__indexOf.call(cmdArgs.verbs, 'load') >= 0) {
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
      var _ref;
      if (this.big_data_p == null) {
        if ((_ref = this.data_uri) != null ? _ref.match('poetesses|relations') : void 0) {
          this.big_data_p = true;
        } else {
          this.big_data_p = false;
        }
      }
      return this.big_data_p;
    };

    Huviz.prototype.get_default_set_by_type = function(node) {
      var _ref;
      if (this.is_big_data()) {
        if ((_ref = node.type) === 'writer') {
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
      message = "<div class='feedback_module'><p>Triples Added: <span id=\"noAddQuad\">0</span></p></div>\n<div class='feedback_module'><p>Number of Nodes: <span id=\"noN\">0</span></p></div>\n<div class='feedback_module'><p>Number of Edges: <span id=\"noE\">0</span></p></div>\n<div class='feedback_module'><p>Number of Predicates: <span id=\"noP\">0</span></p></div>\n<div class='feedback_module'><p>Number of Classes: <span id=\"noC\">0</span></p></div>\n" + (this.build_pfm_live_monitor('add_quad')) + "\n" + (this.build_pfm_live_monitor('hatch')) + "\n<div class='feedback_module'><p>Ticks in Session: <span id=\"noTicks\">0</span></p></div>\n" + (this.build_pfm_live_monitor('tick')) + "\n<div class='feedback_module'><p>Total SPARQL Requests: <span id=\"noSparql\">0</span></p></div>\n<div class='feedback_module'><p>Outstanding SPARQL Requests: <span id=\"noOR\">0</span></p></div>\n" + (this.build_pfm_live_monitor('sparql'));
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
      var calls_per_second, class_count, item, marker, new_count, noE, noN, noOR, noP, old_count, pfm_marker, time, _results;
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
      _results = [];
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
          _results.push(sparkline.sparkline(document.querySelector("#pfm_" + pfm_marker), this.pfm_data["" + pfm_marker].timed_count));
        } else if (this.pfm_data["" + pfm_marker]["timed_count"]) {
          _results.push(this.pfm_data["" + pfm_marker]["timed_count"] = [0.01]);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    return Huviz;

  })();

  OntologicallyGrounded = (function(_super) {
    __extends(OntologicallyGrounded, _super);

    function OntologicallyGrounded() {
      this.parseTTLOntology = __bind(this.parseTTLOntology, this);
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
      var frame, label, obj, obj_lid, obj_raw, ontology, pred, pred_id, pred_lid, subj_lid, subj_uri, _ref, _results;
      ontology = this.ontology;
      if ((GreenerTurtle != null) && this.turtle_parser === 'GreenerTurtle') {
        this.raw_ontology = new GreenerTurtle().parse(data, "text/turtle");
        _ref = this.raw_ontology.subjects;
        _results = [];
        for (subj_uri in _ref) {
          frame = _ref[subj_uri];
          subj_lid = uniquer(subj_uri);
          _results.push((function() {
            var _ref1, _results1;
            _ref1 = frame.predicates;
            _results1 = [];
            for (pred_id in _ref1) {
              pred = _ref1[pred_id];
              pred_lid = uniquer(pred_id);
              _results1.push((function() {
                var _i, _len, _ref2, _results2;
                _ref2 = pred.objects;
                _results2 = [];
                for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
                  obj = _ref2[_i];
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
                    _results2.push(ontology.domain[subj_lid] = obj_lid);
                  } else if (pred_lid === 'range') {
                    if (ontology.range[subj_lid] == null) {
                      ontology.range[subj_lid] = [];
                    }
                    if (!(__indexOf.call(ontology.range, obj_lid) >= 0)) {
                      _results2.push(ontology.range[subj_lid].push(obj_lid));
                    } else {
                      _results2.push(void 0);
                    }
                  } else if (pred_lid === 'subClassOf' || pred_lid === 'subClass') {
                    _results2.push(ontology.subClassOf[subj_lid] = obj_lid);
                  } else if (pred_lid === 'subPropertyOf') {
                    _results2.push(ontology.subPropertyOf[subj_lid] = obj_lid);
                  } else {
                    _results2.push(void 0);
                  }
                }
                return _results2;
              })());
            }
            return _results1;
          })());
        }
        return _results;
      }
    };

    return OntologicallyGrounded;

  })(Huviz);

  Orlando = (function(_super) {
    __extends(Orlando, _super);

    function Orlando() {
      var delay, onceDBReady, onceDBReadyCount;
      Orlando.__super__.constructor.apply(this, arguments);
      if (window.indexedDB) {
        onceDBReadyCount = 0;
        delay = 100;
        onceDBReady = (function(_this) {
          return function() {
            onceDBReadyCount++;
            console.log('onceDBReady() call #' + onceDBReadyCount);
            if (_this.datasetDB != null) {
              console.log('finally! datasetDB is now ready');
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
      var _ref;
      if (this.is_big_data()) {
        if ((_ref = node.type) === 'writer') {
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
      var dataType, dataType_curie, dataType_uri, fontSize, m, obj, obj_dd, _ref;
      obj = msg_or_obj;
      fontSize = this.snippet_triple_em;
      if (this.snippet_box) {
        if (typeof msg_or_obj !== 'string') {
          _ref = ["", msg_or_obj], msg_or_obj = _ref[0], m = _ref[1];
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
          msg_or_obj = "<div id=\"" + obj.snippet_js_key + "\">\n  <div style=\"font-size:" + fontSize + "em\">\n    <h3>subject</h3>\n    <div class=\"snip_circle\" style=\"background-color:" + m.edge.source.color + "; width: " + (fontSize * 2.5) + "em; height: " + (fontSize * 2.5) + "em;\"></div>\n    <p style=\"margin-left: " + (fontSize * 3.5) + "em\">" + (this.make_link(obj.quad.subj_uri)) + "</p>\n\n    <h3>predicate </h3>\n    <div class=\"snip_arrow\">\n      <div class=\"snip_arrow_stem\" style=\"width: " + (fontSize * 2) + "em; height: " + (fontSize * 1) + "em; margin-top: " + (fontSize * 0.75) + "em; background-color:" + m.edge.color + ";\"></div>\n      <div class=\"snip_arrow_head\" style=\"border-color: transparent transparent transparent " + m.edge.color + ";border-width: " + (fontSize * 1.3) + "em 0 " + (fontSize * 1.3) + "em " + (fontSize * 2.3) + "em;\"></div>\n    </div>\n    <p class=\"pred\" style=\"margin-left: " + (fontSize * 4.8) + "em\">" + (this.make_link(obj.quad.pred_uri)) + "</p>\n\n    <h3>object </h3>\n    <div class=\"snip_circle\" style=\"background-color:" + m.edge.target.color + "; width: " + (fontSize * 2.5) + "em; height: " + (fontSize * 2.5) + "em;\"></div>\n    <p style=\"margin-left: " + (fontSize * 3.5) + "em\">" + obj_dd + "</p>\n\n    <h3>source</h3>\n    <p style=\"margin-left: " + (fontSize * 2.5) + "em\">" + (this.make_link(obj.quad.graph_uri)) + "</p>\n  </div>\n</div>\n";
        }
        return Orlando.__super__.push_snippet.call(this, obj, msg_or_obj);
      }
    };

    Orlando.prototype.human_term = orlando_human_term;

    return Orlando;

  })(OntologicallyGrounded);

  OntoViz = (function(_super) {
    __extends(OntoViz, _super);

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

  Socrata = (function(_super) {

    /*
     * Inspired by https://data.edmonton.ca/
     *             https://data.edmonton.ca/api/views{,.json,.rdf,...}
     *
     */
    var categories;

    __extends(Socrata, _super);

    function Socrata() {
      this.parseAndShowJSON = __bind(this.parseAndShowJSON, this);
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
      var cat_id, dataset, g, k, q, v, _i, _len, _results;
      console.log("parseAndShowJSON", data);
      g = this.DEFAULT_CONTEXT;
      _results = [];
      for (_i = 0, _len = data.length; _i < _len; _i++) {
        dataset = data[_i];
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
        _results.push((function() {
          var _results1;
          _results1 = [];
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
            _results1.push(this.add_quad(q));
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    return Socrata;

  })(Huviz);

  PickOrProvide = (function() {
    PickOrProvide.prototype.tmpl = "<form id=\"UID\" class=\"pick_or_provide_form\" method=\"post\" action=\"\" enctype=\"multipart/form-data\">\n    <span class=\"pick_or_provide_label\">REPLACE_WITH_LABEL</span>\n    <select name=\"pick_or_provide\"></select>\n    <button type=\"button\" class=\"delete_option\"><i class=\"fa fa-trash\" style=\"font-size: 1.2em;\"></i></button>\n  </form>";

    PickOrProvide.prototype.uri_file_loader_sel = '.uri_file_loader_form';

    function PickOrProvide(huviz, append_to_sel, label, css_class, isOntology, isEndpoint, opts) {
      var dndLoaderClass;
      this.huviz = huviz;
      this.append_to_sel = append_to_sel;
      this.label = label;
      this.css_class = css_class;
      this.isOntology = isOntology;
      this.isEndpoint = isEndpoint;
      this.opts = opts;
      this.delete_selected_option = __bind(this.delete_selected_option, this);
      this.get_selected_option = __bind(this.get_selected_option, this);
      this.onchange = __bind(this.onchange, this);
      this.add_resource_option = __bind(this.add_resource_option, this);
      this.add_local_file = __bind(this.add_local_file, this);
      this.add_uri = __bind(this.add_uri, this);
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
      this;
    }

    PickOrProvide.prototype.val = function(val) {
      console.log(this.constructor.name + '.val(' + (val && '"' + val + '"' || '') + ') for ' + this.opts.rsrcType + ' was ' + this.pick_or_provide_select.val());
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
          return this.value = new_val;
        } else {
          return console.warn("TODO should set option to nothing");
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
      var k, opt, opt_group, opt_group_label, opt_str, val, _i, _j, _len, _len1, _ref, _ref1;
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
      _ref = ['value', 'title', 'class', 'id', 'style', 'label'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        k = _ref[_i];
        if (opt_rec[k] != null) {
          $(opt).attr(k, opt_rec[k]);
        }
      }
      _ref1 = ['isUri', 'canDelete', 'ontologyUri', 'ontology_label'];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        k = _ref1[_j];
        if (opt_rec[k] != null) {
          val = opt_rec[k];
          $(opt).data(k, val);
        }
      }
      return opt[0];
    };

    PickOrProvide.prototype.update_state = function(callback) {
      var canDelete, disable_the_delete_button, kid_cnt, label_value, raw_value, selected_option, the_options;
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
        return callback();
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

  PickOrProvideScript = (function(_super) {
    __extends(PickOrProvideScript, _super);

    function PickOrProvideScript() {
      this.onchange = __bind(this.onchange, this);
      return PickOrProvideScript.__super__.constructor.apply(this, arguments);
    }

    PickOrProvideScript.prototype.onchange = function(e) {
      PickOrProvideScript.__super__.onchange.call(this, e);
      return this.huviz.visualize_dataset_using_ontology();
    };

    return PickOrProvideScript;

  })(PickOrProvide);

  DragAndDropLoader = (function() {
    DragAndDropLoader.prototype.tmpl = "<form class=\"local_file_form\" method=\"post\" action=\"\" enctype=\"multipart/form-data\">\n  <div class=\"box__input\">\n    <input class=\"box__file\" type=\"file\" name=\"files[]\" id=\"file\"\n             data-multiple-caption=\"{count} files selected\" multiple />\n    <label for=\"file\"><span class=\"box__label\">Choose a local file</span></label>\n    <button class=\"box__upload_button\" type=\"submit\">Upload</button>\n      <div class=\"box__dragndrop\" style=\"display:none\"> Drop URL or file here</div>\n  </div>\n    <input type=\"url\" class=\"box__uri\" placeholder=\"Or enter URL here\" />\n  <div class=\"box__uploading\" style=\"display:none\">Uploading&hellip;</div>\n  <div class=\"box__success\" style=\"display:none\">Done!</div>\n  <div class=\"box__error\" style=\"display:none\">Error! <span></span>.</div>\n  </form>";

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

  DragAndDropLoaderOfScripts = (function(_super) {
    __extends(DragAndDropLoaderOfScripts, _super);

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
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

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
        console.log(req);
        req.onsuccess = (function(_this) {
          return function(evt) {
            console.log("onsuccess " + _this.dbName);
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
            console.log("onupgradeneeded " + db.name);
            console.log(evt);
            if (evt.oldVersion === 1) {
              if (__indexOf.call(db.objectStoreNames, 'spogis') >= 0) {
                alert("deleteObjectStore('spogis')");
                db.deleteObjectStore('spogis');
              }
            }
            if (evt.oldVersion < 3) {
              store = db.createObjectStore(_this.dbStoreName, {
                keyPath: 'id',
                autoIncrement: true
              });
              console.log(db);
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
                return console.log("transactions are complete");
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
      console.log("add new node to DB");
      console.log(quad);
      return console.log(this.nstoreDB);
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
    function Node(id, use_lid_as_node_name) {
      this.id = id;
      this.bub_txt = [];
      this.links_from = [];
      this.links_to = [];
      this.links_shown = [];
      this.lid = uniquer(this.id);
      if (use_lid_as_node_name) {
        this.name = this.lid;
      }
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
      var edge, _i, _j, _len, _len1, _ref, _ref1;
      _ref = this.links_from;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        edge.select();
      }
      _ref1 = this.links_to;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        edge = _ref1[_j];
        edge.select();
      }
      return this.taxon.update_state(this, 'select');
    };

    Node.prototype.unselect = function() {
      var edge, _i, _j, _len, _len1, _ref, _ref1;
      _ref = this.links_from;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        edge.unselect();
      }
      _ref1 = this.links_to;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        edge = _ref1[_j];
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
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  TreeCtrl = require('treectrl').TreeCtrl;

  uniquer = require("uniquer").uniquer;

  Predicate = (function(_super) {
    __extends(Predicate, _super);

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
      var before_count, e, _i, _len, _ref, _results;
      before_count = this.selected_instances.length;
      _ref = this.all_edges;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
        if (e.an_end_is_selected()) {
          _results.push(this.selected_instances.acquire(e));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Predicate.prototype.update_state = function(inst, change) {
      this.update_selected_instances();
      return Predicate.__super__.update_state.call(this, inst, change);
    };

    Predicate.prototype.recalc_direct_stats = function() {
      return [this.count_shown_selected(), this.selected_instances.length];
    };

    Predicate.prototype.count_shown_selected = function() {
      var count, e, _i, _len, _ref;
      count = 0;
      _ref = this.selected_instances;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
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
}, "taxon": function(exports, require, module) {(function() {
  var Taxon, TreeCtrl, angliciser,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  angliciser = require('angliciser').angliciser;

  TreeCtrl = require('treectrl').TreeCtrl;

  Taxon = (function(_super) {
    __extends(Taxon, _super);

    Taxon.prototype.suspend_updates = false;

    Taxon.prototype.custom_event_name = 'changeTaxon';

    function Taxon(id) {
      this.id = id;
      Taxon.__super__.constructor.call(this);
      this.lid = this.id;
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
      var inst, retval, sub, _i, _j, _len, _len1, _ref, _ref1, _results;
      if (hier) {
        retval = [];
        _ref = this.get_instances(false);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          inst = _ref[_i];
          retval.push(inst);
        }
        _ref1 = this.subs;
        _results = [];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          sub = _ref1[_j];
          _results.push((function() {
            var _k, _len2, _ref2, _results1;
            _ref2 = sub.get_instances(true);
            _results1 = [];
            for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
              inst = _ref2[_k];
              _results1.push(retval.push(inst));
            }
            return _results1;
          })());
        }
        return _results;
      } else {
        return this.instances;
      }
    };

    Taxon.prototype.register = function(node) {
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
      var n, phrase, sub, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2;
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
              _ref = this.selected_instances;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                n = _ref[_i];
                in_and_out.include.push(n.lid);
              }
            } else {
              in_and_out.include.push(this.id);
              _ref1 = this.unselected_instances;
              for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                n = _ref1[_j];
                in_and_out.exclude.push(n.lid);
              }
            }
          }
          _ref2 = this.subs;
          for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
            sub = _ref2[_k];
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
      var cursor, height, i, id, inset, line, lines, max_width, sel, top, url, voffset, _i, _j, _len, _len1;
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
      this.ctx.font = "" + (this.font_height()) + "px " + this.face;
      this.ctx.textAlign = 'left';
      lines = text.split("\n");
      max_width = 0;
      for (i = _i = 0, _len = lines.length; _i < _len; i = ++_i) {
        line = lines[i];
        if (line) {
          voffset = this.font_height() * i + top;
          max_width = Math.max(this.ctx.measureText(line).width, max_width);
        }
      }
      height = this.font_height() * lines.length + inset;
      this.draw_bubble(inset, top, max_width + inset * 4, height, this.pointer_height, this.font_height() / 2);
      for (i = _j = 0, _len1 = lines.length; _j < _len1; i = ++_j) {
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
        alert("" + this.id + " has no direct state");
      }
      return this.state;
    };

    TreeCtrl.prototype.get_indirect_state = function() {
      if (this.indirect_state == null) {
        alert("" + this.id + " has no indirect_state");
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
      var consensus, kid, kid_ind_stt, _i, _len, _ref;
      if (this.subs.length === 0) {
        return this.state;
      }
      if (this.state === 'mixed') {
        return 'mixed';
      }
      consensus = this.get_state();
      _ref = this.subs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        kid = _ref[_i];
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
      var evt, kid, old_indirect_state, old_state, updating_stats, _i, _len, _ref;
      if (!this.dirty) {
        return;
      }
      this.dirty = false;
      old_state = this.state;
      old_indirect_state = this.indirect_state;
      _ref = this.subs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        kid = _ref[_i];
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
      return "" + stats[0] + "/" + stats[1];
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
      var sub, _i, _len, _ref;
      stats[0] += this.direct_stats[0];
      stats[1] += this.direct_stats[1];
      if (this.subs.length > 0) {
        _ref = this.subs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          sub = _ref[_i];
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
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  uniquer = require("uniquer").uniquer;

  TreePicker = (function() {
    function TreePicker(elem, root, extra_classes, needs_expander, use_name_as_label, squash_case_during_sort, style_context_selector) {
      this.elem = elem;
      this.needs_expander = needs_expander;
      this.use_name_as_label = use_name_as_label;
      this.squash_case_during_sort = squash_case_during_sort;
      this.style_context_selector = style_context_selector;
      this.onChangeState = __bind(this.onChangeState, this);
      this.handle_click = __bind(this.handle_click, this);
      this.click_handler = __bind(this.click_handler, this);
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
      this.id_to_elem['/'] = elem;
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
        width: "" + rect.width + "px",
        height: "" + rect.height + "px"
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
      var child_elem, child_id, container_elem, kids_ids, sort_by_first_item, val, val_elem_pair, val_elem_pairs, _i, _j, _len, _len1;
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
      for (_i = 0, _len = kids_ids.length; _i < _len; _i++) {
        child_id = kids_ids[_i];
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
      for (_j = 0, _len1 = val_elem_pairs.length; _j < _len1; _j++) {
        val_elem_pair = val_elem_pairs[_j];
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
      var container, elem, label_lower, other_term, this_term, _i, _len, _ref;
      label_lower = label.toLowerCase();
      container = i_am_in[0][0];
      this_term = this.get_comparison_value(node_id, label);
      _ref = container.children;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
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
      var contents_of_me, css_class, label, my_contents, node_id, picker, rest, _i, _len, _ref, _results;
      top = (top == null) || top;
      _results = [];
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
            _ref = this.extra_classes;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              css_class = _ref[_i];
              my_contents.classed(css_class, true);
            }
          }
          _results.push(this.show_tree(rest[1], my_contents, listener, false));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
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
      var child_id, elem, kids, _i, _len;
      if (send_leafward) {
        kids = this.id_to_children[id];
        if (kids != null) {
          for (_i = 0, _len = kids.length; _i < _len; _i++) {
            child_id = kids[_i];
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
      var collapsed, id, _ref, _results;
      _ref = this.id_is_collapsed;
      _results = [];
      for (id in _ref) {
        collapsed = _ref[id];
        if (collapsed) {
          _results.push(this.expand_by_id(id));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
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
        console.error("" + (this.get_my_id()) + ".set_indirect_state()", arguments, "state should never be", void 0);
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
      var child_id, child_indirect_state, new_indirect_state, old_direct_state, old_indirect_state, _i, _len, _ref;
      old_indirect_state = this.id_to_state[false][id];
      old_direct_state = this.id_to_state[true][id];
      _ref = this.id_to_children[id];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child_id = _ref[_i];
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
