/*
  SortedSet
  
  SortedSet is a javascript Array which stays sorted and permits only
  once instance of each itm to be added.  It adds these methods:
    add(itm)
    sort_on(f_or_k)
    remove(itm)
    binary_search(sought[,ret_ins_idx])

  author: Shawn Murphy <smurp@smurp.com>
  written: 2013-11-15
  funder:  TM&V -- The Text Mining and Visualization project
  Copyright CC BY-SA 3.0  See: http://creativecommons.org/licenses/by-sa/3.0/
  
  http://stackoverflow.com/a/17866143/1234699  
    provided guidance on how to 'subclass' Array
  
 */
function SortedSet(){
    var array = [];
    array.push.apply(array,arguments);

    var cmp;
    array.sort_on = function(f_or_k){
	// f_or_k: a comparison function returning -1,0,1
	if (typeof f_or_k === typeof 'some string'){
	    cmp = function(a,b){
		if (a[f_or_k] == b[f_or_k]) return 0;
		if (a[f_or_k] < b[f_or_k]) return -1;
		return 1;
	    }
	} else if (typeof f_or_k === typeof function(){}){
	    cmp = f_or_k;
	} else {
	    throw "sort_on() expects a function or a property name";
	}
	array.sort(cmp);
	return array;
    }
    array.clear = function(){
	array.length = 0;
    };
    array.sort_on('id');
    /*
    array.register_members_to = function(key){
	// If called, then when items are add() or remove() then
	// they will have a reference back to this SortedSet
	// placed in an array on them with the name given by key.
	// The motivation is so items added to SortedSet() can have
	// references to the sets they are in.
	// This could support light inferencing.
    };
    */
    array.add = function(itm){
	// Objective:
	//   Maintain a sorted array which acts like a set.
	//   It is sorted so insertions and tests can be fast.
	var c = array.binary_search(itm,true)
	if (typeof c == typeof 3){ // an integer was returned, ie it was found
	    return c;
	}
	array.splice(c.idx,0,itm);
	return c.idx;
    }
    array.remove = function(itm){
	// Objective:
	//   Remove item from an array acting like a set.
	//   It is sorted by cmp, so we can use binary_search for removal
	var c = array.binary_search(itm);
	if (c > -1){
	    array.splice(c,1);
	}
	return array;
    }
    array.binary_search = function(sought,ret_ins_idx){
	// return -1 or the idx of sought in this
	// if ret_ins_idx instead of -1 return [n] where n is where it ought to be
	// AKA "RETurn the INSertion INdeX"
	ret_ins_idx = ret_ins_idx || false;
	var seeking = true;
	if (array.length < 1) {
	    if (ret_ins_idx) return {idx:0};
	    return -1;
	}
	var mid;
	var bot = 0,
        top = array.length;
	while (seeking){
	    mid = bot + Math.floor((top - bot)/2);
	    var c = cmp(array[mid],sought);
	    //console.log(" c =",c);
	    if (c == 0) return mid;
	    if (c < 0){ // ie this[mid] < sought
		bot = mid + 1;
	    } else {
		top = mid;
	    }
	    if (bot == top){ 
		if (ret_ins_idx) return {idx:bot};
		return -1;
	    };
	}
    }
    return array;
}

function SortedSets_tests(verbose){
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
    even = SortedSet(0,2,4,6,8,10).sort_on(n);
    
    function expect(stmt,want){
	var got = eval(stmt);
	if (verbose) console.log(stmt,"==>",got);
	if (got != want){
	    throw stmt + " returned "+got+" expected "+want;
	}
    }
    function assert(be_good,or_throw){
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
}
//SortedSets_tests(true);
