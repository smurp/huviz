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
(function() {

var SortedSet = function(){
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
    array.named = function(name){
	//array.state_name = name;
	array.id = name; // 
	return array;
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
    array.add = function(itm){
	// Objective:
	//   Maintain a sorted array which acts like a set.
	//   It is sorted so insertions and tests can be fast.
	var c = array.binary_search(itm,true)
	if (typeof c == typeof 3){ // an integer was returned, ie it was found
	    return c;
	}
	array.splice(c.idx,0,itm);
	if (array.state_property){
	    itm[array.state_property] = array;
	}
	if (array.flag_property){
	    itm[array.flag_property] = array;
	}
	return c.idx;
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
	var c = array.binary_search(itm);
	if (c > -1){
	    array.splice(c,1);
	}
	if (array.state_property){
	    itm[array.state_property] = true; // EXAMINE delete instead?
	}
	if (array.flag_property){
	    delete itm[array.flag_property];
	}
	return array;
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
};
(typeof exports !== "undefined" && exports !== null ? exports : this).SortedSet = SortedSet;
})(this);

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

/*
 green-turtle version 1.2.0 Copyright (c) 2011-2013, R. Alexander Milowski <alex@milowski.com> All rights reserved. */
if("undefined"==typeof GreenTurtle)var GreenTurtle=function(){function r(){}function j(a){this.target=a?a:{graph:{subjects:{},prefixes:{},terms:{}}};this.theOne="_:"+(new Date).getTime();this.vocabulary=this.language=null;this.blankCounter=0;this.langAttributes=[{namespaceURI:"http://www.w3.org/XML/1998/namespace",localName:"lang"}];this.inXHTMLMode=!1;this.absURIRE=/[\w\_\-]+:\S+/;this.finishedHandlers=[];this.init()}function M(){var a=this;this.curieParser={trim:function(a){return a.replace(/^\s\s*/,
"").replace(/\s\s*$/,"")},parse:function(b,c){b=this.trim(b);"["==b.charAt(0)&&"]"==b.charAt(b.length-1)&&(b=b.substring(1,b.length-1));var e=b.indexOf(":");if(0<=e){var f=b.substring(0,e);if(""==f)return(f=a.prefixes[""])?f+b.substring(e+1):null;if("_"==f)return"_:"+b.substring(e+1);if(p.NCNAME.test(f)&&(f=a.prefixes[f]))return f+b.substring(e+1)}return c?a.baseURI.resolve(b):b}};this.base=null;this.toString=function(a){var c=a&&a.shorten?{graph:this,shorten:!0,prefixesUsed:{}}:null;s="";for(var e in this.subjects)s+=
this.subjects[e].toString(c),s+="\n";a=a&&a.baseURI?"@base <"+baseURI+"> .\n":"";if(c&&c.shorten)for(var f in c.prefixesUsed)a+="@prefix "+f+" <"+this.prefixes[f]+"> .\n";return 0==a.length?s:a+"\n"+s};this.clear=function(){this.subjects={};this.prefixes={};this.terms={}};this.clear();Object.defineProperty(this,"tripleCount",{enumerable:!0,configurable:!1,get:function(){var a=0,c;for(c in this.subjects){var e=this.subjects[c],f;for(f in e.predicates)a+=e.predicates[f].objects.length}return a}})}function E(a,
b){this.graph=a;this.id=this.subject=b;this.predicates={};this.origins=[];this.types=[]}function z(a){this.predicate=this.id=a;this.objects=[]}function x(a){j.call(this,a)}function P(a){this.query=function(b,c){if(!b)return a.getProjections(c);var e=[],f;for(f in a._data_.graph.subjects){var i=a._data_.graph.subjects[f],k;for(k in b){var h=a._data_.graph.curieParser.parse(k,!0),h=i.predicates[h];if(!h){i=null;break}for(var g=a._data_.graph.curieParser.parse(b[k],!1),d=null,j=0;!d&&j<h.objects.length;j++)h.objects[j].value==
g&&(d=h.objects[j]);if(!d){i=null;break}}i&&e.push(p.toProjection(a,i,c))}return e}}function H(a,b){this._data_={owner:a,subject:b,properties:{}}}function p(a){this._data_={graph:new M};this._data_.graph.baseURI=this.parseURI(a);this._data_.baseURI=this._data_.graph.baseURI;Object.defineProperty(this,"rdfa",{value:new P(this),writable:!1,configurable:!1,enumerable:!0});Object.defineProperty(this,"graph",{value:this._data_.graph,writable:!1,configurable:!1,enumerable:!0});Object.defineProperty(this,
"implementation",{value:GreenTurtle.implementation,writable:!1,configurable:!1,enumerable:!0})}function d(){this.reset();this.onError=function(a,b){console.log(a+": "+b)}}function l(){this.blankCounter=0;this.vocabularies=[{namespaceURI:"http://schema.org/",isMember:function(a){return 0==a.indexOf(this.namespaceURI)},getProperty:function(a){return this.namespaceURI+a}}]}function N(a){l.call(this);this.graph=a}var O={version:"1.2.0"};r.SCHEME=/^[A-Za-z][A-Za-z0-9\+\-\.]*\:/;r.prototype.parseURI=function(a){var b=
r.SCHEME.exec(a);if(!b)throw"Bad URI value, no scheme: "+a;a={spec:a};a.scheme=b[0].substring(0,b[0].length-1);a.schemeSpecificPart=a.spec.substring(b[0].length);"/"==a.schemeSpecificPart.charAt(0)&&"/"==a.schemeSpecificPart.charAt(1)?this.parseGeneric(a):a.isGeneric=!1;a.normalize=function(){if(this.isGeneric&&0!=this.segments.length){if(1<this.path.length&&"/."==this.path.substring(this.path.length-2))this.path=this.path.substring(0,this.path.length-1),this.segments.splice(this.segments.length-
1,1);else{var a=this.path.charAt(this.path.length-1);"/"!=a&&(a="");for(var b=0;b<this.segments.length;b++)0<b&&".."==this.segments[b]&&(this.segments.splice(b-1,2),b-=2),"."==this.segments[b]&&(this.segments.splice(b,1),b--);this.path=0==this.segments.length?"/":"/"+this.segments.join("/")+a}this.schemeSpecificPart="//"+this.authority+this.path;"undefined"!=typeof this.query&&(this.schemeSpecificPart+="?"+this.query);"undefined"!=typeof this.fragment&&(this.schemeSpecificPart+="#"+this.fragment);
this.spec=this.scheme+":"+this.schemeSpecificPart}};a.resolve=function(a){if(!a)return this.spec;if("#"==a.charAt(0)){var b=this.spec.lastIndexOf("#");return 0>b?this.spec+a:this.spec.substring(0,b)+a}if(!this.isGeneric)throw"Cannot resolve uri against non-generic URI: "+this.spec;a.indexOf(":");if("/"==a.charAt(0))return this.scheme+"://"+this.authority+a;if("."==a.charAt(0)&&"/"==a.charAt(1)){if("/"==this.path.charAt(this.path.length-1))return this.scheme+"://"+this.authority+this.path+a.substring(2);
b=this.path.lastIndexOf("/");return this.scheme+"://"+this.authority+this.path.substring(0,b)+a.substring(1)}if(r.SCHEME.test(a))return a;if("?"==a.charAt(0)||"/"==this.path.charAt(this.path.length-1))return this.scheme+"://"+this.authority+this.path+a;b=this.path.lastIndexOf("/");return this.scheme+"://"+this.authority+this.path.substring(0,b+1)+a};a.relativeTo=function(a){if(a.scheme!=this.scheme)return this.spec;if(!this.isGeneric)throw"A non generic URI cannot be made relative: "+this.spec;if(!a.isGeneric)throw"Cannot make a relative URI against a non-generic URI: "+
a.spec;if(a.authority!=this.authority)return this.spec;for(var b=0;b<this.segments.length&&b<a.segments.length;b++)if(this.segments[b]!=a.segments[b]){for(var f="",i=b;i<a.segments.length;i++)f+="../";for(i=b;i<this.segments.length;i++)f+=this.segments[i],i+1<this.segments.length&&(f+="/");"/"==this.path.charAt(this.path.length-1)&&(f+="/");return f}if(this.segments.length==a.segments.length)return this.hash?this.hash:this.query?this.query:"";if(b<this.segments.length){f="";for(i=b;i<this.segments.length;i++)f+=
this.segments[i],i+1<this.segments.length&&(f+="/");"/"==this.path.charAt(this.path.length-1)&&(f+="/");return f}throw"Cannot calculate a relative URI for "+this.spec+" against "+a.spec;};return a};r.prototype.parseGeneric=function(a){if("/"!=a.schemeSpecificPart.charAt(0)||"/"!=a.schemeSpecificPart.charAt(1))throw"Generic URI values should start with '//':"+a.spec;var b=a.schemeSpecificPart.substring(2),c=b.indexOf("/");a.authority=0>c?b:b.substring(0,c);a.path=0>c?"":b.substring(c);b=a.path.indexOf("#");
0<=b&&(a.fragment=a.path.substring(b+1),a.path=a.path.substring(0,b));b=a.path.indexOf("?");0<=b&&(a.query=a.path.substring(b+1),a.path=a.path.substring(0,b));if("/"==a.path||""==a.path)a.segments=[];else{a.segments=a.path.split(/\//);0<a.segments.length&&(""==a.segments[0]&&1<a.path.length&&"/"!=a.path.charAt(1))&&a.segments.shift();0<a.segments.length&&0<a.path.length&&"/"==a.path.charAt(a.path.length-1)&&""==a.segments[a.segments.length-1]&&1<a.path.length&&"/"!=a.path.charAt(a.path.length-2)&&
a.segments.pop();for(b=0;b<a.segments.length;b++)for(var c=a.segments[b].split(/%[A-Za-z0-9][A-Za-z0-9]|[\ud800-\udfff][\ud800-\udfff]|[A-Za-z0-9\-\._~!$&'()*+,;=@:\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+/),e=0;e<c.length;e++)if(0<c[e].length)throw"Unecaped character "+c[e].charAt(0)+" ("+c[e].charCodeAt(0)+") in URI "+a.spec;}a.isGeneric=!0};j.prototype=new r;j.prototype.constructor=j;j.prototype.newBlankNode=function(){this.blankCounter++;return"_:"+this.blankCounter};j.XMLLiteralURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral";
j.HTMLLiteralURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML";j.PlainLiteralURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";j.objectURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#object";j.typeURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#type";j.nameChar="[-A-Z_a-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c-\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd\u10000-\uefffF.0-9\u00b7\u0300-\u036f\u203f-\u2040]";j.nameStartChar=
"[A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u0131\u0134-\u013e\u0141-\u0148\u014a-\u017e\u0180-\u01c3\u01cd-\u01f0\u01f4-\u01f5\u01fa-\u0217\u0250-\u02a8\u02bb-\u02c1\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03ce\u03d0-\u03d6\u03da\u03dc\u03de\u03e0\u03e2-\u03f3\u0401-\u040c\u040e-\u044f\u0451-\u045c\u045e-\u0481\u0490-\u04c4\u04c7-\u04c8\u04cb-\u04cc\u04d0-\u04eb\u04ee-\u04f5\u04f8-\u04f9\u0531-\u0556\u0559\u0561-\u0586\u05d0-\u05ea\u05f0-\u05f2\u0621-\u063a\u0641-\u064a\u0671-\u06b7\u06ba-\u06be\u06c0-\u06ce\u06d0-\u06d3\u06d5\u06e5-\u06e6\u0905-\u0939\u093d\u0958-\u0961\u0985-\u098c\u098f-\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09dc-\u09dd\u09df-\u09e1\u09f0-\u09f1\u0a05-\u0a0a\u0a0f-\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32-\u0a33\u0a35-\u0a36\u0a38-\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8b\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2-\u0ab3\u0ab5-\u0ab9\u0abd\u0ae0\u0b05-\u0b0c\u0b0f-\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32-\u0b33\u0b36-\u0b39\u0b3d\u0b5c-\u0b5d\u0b5f-\u0b61\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99-\u0b9a\u0b9c\u0b9e-\u0b9f\u0ba3-\u0ba4\u0ba8-\u0baa\u0bae-\u0bb5\u0bb7-\u0bb9\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c60-\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cde\u0ce0-\u0ce1\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d28\u0d2a-\u0d39\u0d60-\u0d61\u0e01-\u0e2e\u0e30\u0e32-\u0e33\u0e40-\u0e45\u0e81-\u0e82\u0e84\u0e87-\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa-\u0eab\u0ead-\u0eae\u0eb0\u0eb2-\u0eb3\u0ebd\u0ec0-\u0ec4\u0f40-\u0f47\u0f49-\u0f69\u10a0-\u10c5\u10d0-\u10f6\u1100\u1102-\u1103\u1105-\u1107\u1109\u110b-\u110c\u110e-\u1112\u113c\u113e\u1140\u114c\u114e\u1150\u1154-\u1155\u1159\u115f-\u1161\u1163\u1165\u1167\u1169\u116d-\u116e\u1172-\u1173\u1175\u119e\u11a8\u11ab\u11ae-\u11af\u11b7-\u11b8\u11ba\u11bc-\u11c2\u11eb\u11f0\u11f9\u1e00-\u1e9b\u1ea0-\u1ef9\u1f00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2126\u212a-\u212b\u212e\u2180-\u2182\u3041-\u3094\u30a1-\u30fa\u3105-\u312c\uac00-\ud7a3\u4e00-\u9fa5\u3007\u3021-\u3029_]";
j.NCNAME=RegExp("^"+j.nameStartChar+j.nameChar+"*$");j.trim=function(a){return a.replace(/^\s\s*/,"").replace(/\s\s*$/,"")};j.prototype.tokenize=function(a){return j.trim(a).split(/\s+/)};j.prototype.parseSafeCURIEOrCURIEOrURI=function(a,b,c){a=j.trim(a);return"["==a.charAt(0)&&"]"==a.charAt(a.length-1)?(a=a.substring(1,a.length-1),a=a.trim(a),0==a.length?null:"_:"==a?this.theOne:this.parseCURIE(a,b,c)):this.parseCURIEOrURI(a,b,c)};j.prototype.parseCURIE=function(a,b){var c=a.indexOf(":");if(0<=c){var e=
a.substring(0,c);if(""==e)return(e=b[""])?e+a.substring(c+1):null;if("_"==e)return"_:"+a.substring(c+1);if(j.NCNAME.test(e)&&(e=b[e]))return e+a.substring(c+1)}return null};j.prototype.parseCURIEOrURI=function(a,b,c){return(b=this.parseCURIE(a,b,c))?b:this.resolveAndNormalize(c,a)};j.prototype.parsePredicate=function(a,b,c,e,f,i){return""==a?null:(a=this.parseTermOrCURIEOrAbsURI(a,b,i?null:c,e,f))&&0==a.indexOf("_:")?null:a};j.prototype.parseTermOrCURIEOrURI=function(a,b,c,e,f){a=j.trim(a);if((e=
this.parseCURIE(a,e,f))||(e=c[a]))return e;e=a.toLowerCase();return(e=c[e])?e:b&&!this.absURIRE.exec(a)?b+a:this.resolveAndNormalize(f,a)};j.prototype.parseTermOrCURIEOrAbsURI=function(a,b,c,e,f){a=j.trim(a);if(e=this.parseCURIE(a,e,f))return e;if(c){if(b&&!this.absURIRE.exec(a))return b+a;if(b=c[a])return b;b=a.toLowerCase();if(b=c[b])return b}return this.absURIRE.exec(a)?this.resolveAndNormalize(f,a):null};j.prototype.resolveAndNormalize=function(a,b){var c=a.resolve(b),c=this.parseURI(c);c.normalize();
return c.spec};j.prototype.parsePrefixMappings=function(a,b){for(var c=this.tokenize(a),e=null,f=0;f<c.length;f++)":"==c[f][c[f].length-1]?e=c[f].substring(0,c[f].length-1):e&&(b[e]=this.target.baseURI?this.target.baseURI.resolve(c[f]):c[f],e=null)};j.prototype.copyMappings=function(a){var b={},c;for(c in a)b[c]=a[c];return b};j.prototype.ancestorPath=function(a){for(var b="";a&&a.nodeType!=Node.DOCUMENT_NODE;)b="/"+a.localName+b,a=a.parentNode;return b};j.prototype.setContext=function(a){"html"==
a.localName&&"XHTML+RDFa 1.1"==a.getAttribute("version")?this.setXHTMLContext():"html"==a.localName||"http://www.w3.org/1999/xhtml"==a.namespaceURI?document.doctype?"-//W3C//DTD XHTML+RDFa 1.0//EN"==document.doctype.publicId&&"http://www.w3.org/MarkUp/DTD/xhtml-rdfa-1.dtd"==document.doctype.systemId?(console.log("WARNING: RDF 1.0 is not supported.  Defaulting to HTML5 mode."),this.setHTMLContext()):"-//W3C//DTD XHTML+RDFa 1.1//EN"==document.doctype.publicId&&"http://www.w3.org/MarkUp/DTD/xhtml-rdfa-2.dtd"==
document.doctype.systemId?this.setXHTMLContext():this.setHTMLContext():this.setHTMLContext():this.setXMLContext()};j.prototype.setInitialContext=function(){this.vocabulary=null;this.target.graph.prefixes={};this.target.graph.terms={};this.langAttributes=[{namespaceURI:"http://www.w3.org/XML/1998/namespace",localName:"lang"}];this.target.graph.prefixes[""]="http://www.w3.org/1999/xhtml/vocab#";this.target.graph.prefixes.grddl="http://www.w3.org/2003/g/data-view#";this.target.graph.prefixes.ma="http://www.w3.org/ns/ma-ont#";
this.target.graph.prefixes.owl="http://www.w3.org/2002/07/owl#";this.target.graph.prefixes.rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#";this.target.graph.prefixes.rdfa="http://www.w3.org/ns/rdfa#";this.target.graph.prefixes.rdfs="http://www.w3.org/2000/01/rdf-schema#";this.target.graph.prefixes.rif="http://www.w3.org/2007/rif#";this.target.graph.prefixes.skos="http://www.w3.org/2004/02/skos/core#";this.target.graph.prefixes.skosxl="http://www.w3.org/2008/05/skos-xl#";this.target.graph.prefixes.wdr=
"http://www.w3.org/2007/05/powder#";this.target.graph.prefixes["void"]="http://rdfs.org/ns/void#";this.target.graph.prefixes.wdrs="http://www.w3.org/2007/05/powder-s#";this.target.graph.prefixes.xhv="http://www.w3.org/1999/xhtml/vocab#";this.target.graph.prefixes.xml="http://www.w3.org/XML/1998/namespace";this.target.graph.prefixes.xsd="http://www.w3.org/2001/XMLSchema#";this.target.graph.prefixes.sd="http://www.w3.org/ns/sparql-service-description#";this.target.graph.prefixes.org="http://www.w3.org/ns/org#";
this.target.graph.prefixes.gldp="http://www.w3.org/ns/people#";this.target.graph.prefixes.cnt="http://www.w3.org/2008/content#";this.target.graph.prefixes.dcat="http://www.w3.org/ns/dcat#";this.target.graph.prefixes.earl="http://www.w3.org/ns/earl#";this.target.graph.prefixes.ht="http://www.w3.org/2006/http#";this.target.graph.prefixes.ptr="http://www.w3.org/2009/pointers#";this.target.graph.prefixes.cc="http://creativecommons.org/ns#";this.target.graph.prefixes.ctag="http://commontag.org/ns#";this.target.graph.prefixes.dc=
"http://purl.org/dc/terms/";this.target.graph.prefixes.dcterms="http://purl.org/dc/terms/";this.target.graph.prefixes.foaf="http://xmlns.com/foaf/0.1/";this.target.graph.prefixes.gr="http://purl.org/goodrelations/v1#";this.target.graph.prefixes.ical="http://www.w3.org/2002/12/cal/icaltzd#";this.target.graph.prefixes.og="http://ogp.me/ns#";this.target.graph.prefixes.rev="http://purl.org/stuff/rev#";this.target.graph.prefixes.sioc="http://rdfs.org/sioc/ns#";this.target.graph.prefixes.v="http://rdf.data-vocabulary.org/#";
this.target.graph.prefixes.vcard="http://www.w3.org/2006/vcard/ns#";this.target.graph.prefixes.schema="http://schema.org/";this.target.graph.terms.describedby="http://www.w3.org/2007/05/powder-s#describedby";this.target.graph.terms.license="http://www.w3.org/1999/xhtml/vocab#license";this.target.graph.terms.role="http://www.w3.org/1999/xhtml/vocab#role"};j.prototype.setXMLContext=function(){this.setInitialContext();this.inHTMLMode=this.inXHTMLMode=!1};j.prototype.setHTMLContext=function(){this.setInitialContext();
this.langAttributes=[{namespaceURI:"http://www.w3.org/XML/1998/namespace",localName:"lang"},{namespaceURI:null,localName:"lang"}];this.inXHTMLMode=!1;this.inHTMLMode=!0};j.prototype.setXHTMLContext=function(){this.setInitialContext();this.inXHTMLMode=!0;this.inHTMLMode=!1;this.langAttributes=[{namespaceURI:"http://www.w3.org/XML/1998/namespace",localName:"lang"},{namespaceURI:null,localName:"lang"}];this.target.graph.terms.alternate="http://www.w3.org/1999/xhtml/vocab#alternate";this.target.graph.terms.appendix=
"http://www.w3.org/1999/xhtml/vocab#appendix";this.target.graph.terms.bookmark="http://www.w3.org/1999/xhtml/vocab#bookmark";this.target.graph.terms.cite="http://www.w3.org/1999/xhtml/vocab#cite";this.target.graph.terms.chapter="http://www.w3.org/1999/xhtml/vocab#chapter";this.target.graph.terms.contents="http://www.w3.org/1999/xhtml/vocab#contents";this.target.graph.terms.copyright="http://www.w3.org/1999/xhtml/vocab#copyright";this.target.graph.terms.first="http://www.w3.org/1999/xhtml/vocab#first";
this.target.graph.terms.glossary="http://www.w3.org/1999/xhtml/vocab#glossary";this.target.graph.terms.help="http://www.w3.org/1999/xhtml/vocab#help";this.target.graph.terms.icon="http://www.w3.org/1999/xhtml/vocab#icon";this.target.graph.terms.index="http://www.w3.org/1999/xhtml/vocab#index";this.target.graph.terms.last="http://www.w3.org/1999/xhtml/vocab#last";this.target.graph.terms.license="http://www.w3.org/1999/xhtml/vocab#license";this.target.graph.terms.meta="http://www.w3.org/1999/xhtml/vocab#meta";
this.target.graph.terms.next="http://www.w3.org/1999/xhtml/vocab#next";this.target.graph.terms.prev="http://www.w3.org/1999/xhtml/vocab#prev";this.target.graph.terms.previous="http://www.w3.org/1999/xhtml/vocab#previous";this.target.graph.terms.section="http://www.w3.org/1999/xhtml/vocab#section";this.target.graph.terms.stylesheet="http://www.w3.org/1999/xhtml/vocab#stylesheet";this.target.graph.terms.subsection="http://www.w3.org/1999/xhtml/vocab#subsection";this.target.graph.terms.start="http://www.w3.org/1999/xhtml/vocab#start";
this.target.graph.terms.top="http://www.w3.org/1999/xhtml/vocab#top";this.target.graph.terms.up="http://www.w3.org/1999/xhtml/vocab#up";this.target.graph.terms.p3pv1="http://www.w3.org/1999/xhtml/vocab#p3pv1";this.target.graph.terms.related="http://www.w3.org/1999/xhtml/vocab#related";this.target.graph.terms.role="http://www.w3.org/1999/xhtml/vocab#role";this.target.graph.terms.transformation="http://www.w3.org/1999/xhtml/vocab#transformation"};j.prototype.init=function(){};j.prototype.newSubjectOrigin=
function(){};j.prototype.addTriple=function(){};j.dateTimeTypes=[{pattern:/-?P(?:[0-9]+Y)?(?:[0-9]+M)?(?:[0-9]+D)?(?:T(?:[0-9]+H)?(?:[0-9]+M)?(?:[0-9]+(?:\.[0-9]+)?S)?)?/,type:"http://www.w3.org/2001/XMLSchema#duration"},{pattern:/-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]-[0-9][0-9]T(?:[0-1][0-9]|2[0-4]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,type:"http://www.w3.org/2001/XMLSchema#dateTime"},{pattern:/-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]-[0-9][0-9](?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,
type:"http://www.w3.org/2001/XMLSchema#date"},{pattern:/(?:[0-1][0-9]|2[0-4]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,type:"http://www.w3.org/2001/XMLSchema#time"},{pattern:/-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]/,type:"http://www.w3.org/2001/XMLSchema#gYearMonth"},{pattern:/-?[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9]/,type:"http://www.w3.org/2001/XMLSchema#gYear"}];j.deriveDateTimeType=function(a){for(var b=0;b<
j.dateTimeTypes.length;b++){var c=j.dateTimeTypes[b].pattern.exec(a);if(c&&c[0].length==a.length)return j.dateTimeTypes[b].type}return null};j.prototype.process=function(a,b){a.nodeType==Node.DOCUMENT_NODE?(a=a.documentElement,this.setContext(a)):a.parentNode.nodeType==Node.DOCUMENT_NODE&&this.setContext(a);var c=[],e=function(a){var c=a.indexOf("#");0<=c&&(a=a.substring(0,c));b&&b.baseURIMap&&(a=b.baseURIMap(a));return a};for(c.push({current:a,context:this.push(null,e(a.baseURI))});0<c.length;){var f=
c.shift();if(f.parent){if(!(f.context.parent&&f.context.parent.listMapping==f.listMapping))for(var i in f.listMapping){var k=f.listMapping[i];if(0==k.length)this.addTriple(f.parent,f.subject,i,{type:j.objectURI,value:"http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"});else{for(var h=[],g=0;g<k.length;g++)h.push(this.newBlankNode());for(g=0;g<h.length;g++)this.addTriple(f.parent,h[g],"http://www.w3.org/1999/02/22-rdf-syntax-ns#first",k[g]),this.addTriple(f.parent,h[g],"http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
{type:j.objectURI,value:g+1<h.length?h[g+1]:"http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"});this.addTriple(f.parent,f.subject,i,{type:j.objectURI,value:h[0]})}}}else{var h=f.current,f=f.context,d=!1,m=null,q=null,n=null,l=f.prefixes,k=!1,p=[],w=f.listMapping,x=f.parent?!1:!0,L=f.language,r=f.vocabulary,u=this.parseURI(e(h.baseURI));h.item=null;if(g=h.getAttributeNode("vocab"))g=j.trim(g.value),0<g.length?(r=g,this.addTriple(h,u.spec,"http://www.w3.org/ns/rdfa#usesVocabulary",{type:j.objectURI,
value:r})):r=this.vocabulary;for(g=0;g<h.attributes.length;g++){var y=h.attributes[g];if("x"==y.nodeName.charAt(0)&&0==y.nodeName.indexOf("xmlns:")){k||(l=this.copyMappings(l),k=!0);var A=y.nodeName.substring(6),y=j.trim(y.value);l[A]=this.target.baseURI?this.target.baseURI.resolve(y):y}}if(g=h.getAttributeNode("prefix"))k||(l=this.copyMappings(l),k=!0),this.parsePrefixMappings(g.value,l);k=null;for(g=0;!k&&g<this.langAttributes.length;g++)k=h.getAttributeNodeNS(this.langAttributes[g].namespaceURI,
this.langAttributes[g].localName);k&&(g=j.trim(k.value),L=0<g.length?g:null);var A=h.getAttributeNode("rel"),y=h.getAttributeNode("rev"),B=h.getAttributeNode("typeof"),z=h.getAttributeNode("property"),D=h.getAttributeNode("datatype"),E=this.inHTMLMode?h.getAttributeNode("datetime"):null,K=h.getAttributeNode("content"),C=h.getAttributeNode("about"),I=h.getAttributeNode("src"),G=h.getAttributeNode("resource"),J=h.getAttributeNode("href"),H=h.getAttributeNode("inlist"),t=[];if(A)for(var F=this.tokenize(A.value),
g=0;g<F.length;g++)(i=this.parsePredicate(F[g],r,f.terms,l,u,this.inHTMLMode&&null!=z))&&t.push(i);var v=[];if(y){F=this.tokenize(y.value);for(g=0;g<F.length;g++)(i=this.parsePredicate(F[g],r,f.terms,l,u,this.inHTMLMode&&null!=z))&&v.push(i)}if(this.inHTMLMode&&(null!=A||null!=y)&&null!=z)0==t.length&&(A=null),0==v.length&&(y=null);if(A||y){C&&(m=this.parseSafeCURIEOrCURIEOrURI(C.value,l,u));B&&(n=m);m||(h.parentNode.nodeType==Node.DOCUMENT_NODE?m=e(h.baseURI):f.parentObject&&(m=e(h.parentNode.baseURI)==
f.parentObject?e(h.baseURI):f.parentObject));G&&(q=this.parseSafeCURIEOrCURIEOrURI(G.value,l,u));if(!q)if(J)q=this.resolveAndNormalize(u,encodeURI(J.value));else if(I)q=this.resolveAndNormalize(u,encodeURI(I.value));else if(B&&!C&&(!this.inXHTMLMode||!("head"==h.localName||"body"==h.localName)))q=this.newBlankNode();B&&!C&&this.inXHTMLMode&&("head"==h.localName||"body"==h.localName)?n=m:B&&!C&&(n=q)}else if(z&&!K&&!D){if(C&&(m=this.parseSafeCURIEOrCURIEOrURI(C.value,l,u),B&&(n=m)),!m&&h.parentNode.nodeType==
Node.DOCUMENT_NODE?(m=e(h.baseURI),B&&(n=m)):!m&&f.parentObject&&(m=e(h.parentNode.baseURI)==f.parentObject?e(h.baseURI):f.parentObject),B&&!n){G&&(n=this.parseSafeCURIEOrCURIEOrURI(G.value,l,u));!n&&J&&(n=this.resolveAndNormalize(u,encodeURI(J.value)));!n&&I&&(n=this.resolveAndNormalize(u,encodeURI(I.value)));if(!n&&(this.inXHTMLMode||this.inHTMLMode)&&("head"==h.localName||"body"==h.localName))n=m;n||(n=this.newBlankNode());q=n}}else C&&(m=this.parseSafeCURIEOrCURIEOrURI(C.value,l,u)),!m&&G&&(m=
this.parseSafeCURIEOrCURIEOrURI(G.value,l,u)),!m&&J&&(m=this.resolveAndNormalize(u,encodeURI(J.value))),!m&&I&&(m=this.resolveAndNormalize(u,encodeURI(I.value))),m||(h.parentNode.nodeType==Node.DOCUMENT_NODE?m=e(h.baseURI):(this.inXHTMLMode||this.inHTMLMode)&&("head"==h.localName||"body"==h.localName)?m=e(h.parentNode.baseURI)==f.parentObject?e(h.baseURI):f.parentObject:B?m=this.newBlankNode():f.parentObject&&(m=e(h.parentNode.baseURI)==f.parentObject?e(h.baseURI):f.parentObject,z||(d=!0))),B&&(n=
m);if(m&&(C||G||n))g=m,B&&(!C&&!G&&q)&&(g=q),this.newSubjectOrigin(h,g);if(n){F=this.tokenize(B.value);for(g=0;g<F.length;g++)(k=this.parseTermOrCURIEOrAbsURI(F[g],r,f.terms,l,u))&&this.addTriple(h,n,j.typeURI,{type:j.objectURI,value:k})}m&&m!=f.parentObject&&(w={},x=!0);if(q){if(A&&H)for(g=0;g<t.length;g++)k=w[t[g]],k||(k=[],w[t[g]]=k),k.push({type:j.objectURI,value:q});else if(A)for(g=0;g<t.length;g++)this.addTriple(h,m,t[g],{type:j.objectURI,value:q});if(y)for(g=0;g<v.length;g++)this.addTriple(h,
q,v[g],{type:j.objectURI,value:m})}else{if(m&&!q&&(A||y))q=this.newBlankNode();if(A&&H)for(g=0;g<t.length;g++)k=w[t[g]],k||(k=[],w[i]=k),p.push({predicate:t[g],list:k});else if(A)for(g=0;g<t.length;g++)p.push({predicate:t[g],forward:!0});if(y)for(g=0;g<v.length;g++)p.push({predicate:v[g],forward:!1})}if(z){v=t=null;D?(t=""==D.value?j.PlainLiteralURI:this.parseTermOrCURIEOrAbsURI(D.value,r,f.terms,l,u),v=E&&!K?E.value:t==j.XMLLiteralURI||t==j.HTMLLiteralURI?null:K?K.value:h.textContent):K?(t=j.PlainLiteralURI,
v=K.value):E?(v=E.value,t=j.deriveDateTimeType(v),t||(t=j.PlainLiteralURI)):!A&&!y&&(G&&(v=this.parseSafeCURIEOrCURIEOrURI(G.value,l,u)),!v&&J?v=this.resolveAndNormalize(u,encodeURI(J.value)):!v&&I&&(v=this.resolveAndNormalize(u,encodeURI(I.value))),v&&(t=j.objectURI));t||(B&&!C?(t=j.objectURI,v=n):(v=h.textContent,this.inHTMLMode&&"time"==h.localName&&(t=j.deriveDateTimeType(v)),t||(t=j.PlainLiteralURI)));F=this.tokenize(z.value);for(g=0;g<F.length;g++)if(i=this.parsePredicate(F[g],r,f.terms,l,u))H?
(k=w[i],k||(k=[],w[i]=k),k.push(t==j.XMLLiteralURI||t==j.HTMLLiteralURI?{type:t,value:h.childNodes}:{type:t?t:j.PlainLiteralURI,value:v,language:L})):t==j.XMLLiteralURI||t==j.HTMLLiteralURI?this.addTriple(h,m,i,{type:t,value:h.childNodes}):this.addTriple(h,m,i,{type:t?t:j.PlainLiteralURI,value:v,language:L})}if(m&&!d)for(g=0;g<f.incomplete.length;g++)f.incomplete[g].list?f.incomplete[g].list.push({type:j.objectURI,value:m}):f.incomplete[g].forward?this.addTriple(h,f.subject,f.incomplete[g].predicate,
{type:j.objectURI,value:m}):this.addTriple(h,m,f.incomplete[g].predicate,{type:j.objectURI,value:f.subject});n=null;u=m;d?(n=this.push(f,f.subject),n.parentObject=e(h.parentNode.baseURI)==f.parentObject?e(h.baseURI):f.parentObject,n.incomplete=f.incomplete,n.language=L,n.prefixes=l):(n=this.push(f,m),n.parentObject=q?q:m?m:f.subject,n.prefixes=l,n.incomplete=p,q&&(u=q,w={},x=!0),n.listMapping=w,n.language=L);n.vocabulary=r;x&&c.unshift({parent:h,context:f,subject:u,listMapping:w});for(h=h.lastChild;h;h=
h.previousSibling)h.nodeType==Node.ELEMENT_NODE&&c.unshift({current:h,context:n})}}this.inHTMLMode&&this.copyProperties();for(g=0;g<this.finishedHandlers.length;g++)this.finishedHandlers[g](a)};j.prototype.copyProperties=function(){};j.prototype.push=function(a,b){return{parent:a,subject:b?b:a?a.subject:null,parentObject:null,incomplete:[],listMapping:a?a.listMapping:{},language:a?a.language:this.language,prefixes:a?a.prefixes:this.target.graph.prefixes,terms:a?a.terms:this.target.graph.terms,vocabulary:a?
a.vocabulary:this.vocabulary}};M.prototype.expand=function(a){return this.curieParser.parse(a,!0)};M.prototype.shorten=function(a,b){for(prefix in this.prefixes){var c=this.prefixes[prefix];if(0==a.indexOf(c))return b&&(b[prefix]=c),prefix+":"+a.substring(c.length)}return null};E.prototype.toString=function(a){var b=null;"_:"==this.subject.substring(0,2)?b=this.subject:a&&a.shorten?(b=this.graph.shorten(this.subject,a.prefixesUsed))||(b="<"+this.subject+">"):b="<"+this.subject+">";var c=!0,e;for(e in this.predicates)c?
c=!1:b+=";\n",b+=" "+this.predicates[e].toString(a);return b+" ."};E.prototype.toObject=function(){var a={subject:this.subject,predicates:{}},b;for(b in this.predicates){var c=this.predicates[b],e={predicate:b,objects:[]};a.predicates[b]=e;for(var f=0;f<c.objects.length;f++){var i=c.objects[f];if(i.type==j.XMLLiteralURI){for(var d=new XMLSerializer,h="",g=0;g<i.value.length;g++)i.value[g].nodeType==Node.ELEMENT_NODE?h+=d.serializeToString(i.value[g]):i.value[g].nodeType==Node.TEXT_NODE&&(h+=i.value[g].nodeValue);
e.objects.push({type:i.type,value:h,language:i.language})}else e.objects.push({type:i.type,value:i.value,language:i.language})}}return a};E.prototype.getValues=function(){for(var a=[],b=0;b<arguments.length;b++){var c=this.graph.curieParser.parse(arguments[b],!0);if(c=this.predicates[c])for(var e=0;e<c.objects.length;e++)a.push(c.objects[e].value)}return a};z.getPrefixMap=function(a){for(var b={};a.attributes;){for(var c=0;c<a.attributes.length;c++)if("http://www.w3.org/2000/xmlns/"==a.attributes[c].namespaceURI){var e=
a.attributes[c].localName;"xmlns"==a.attributes[c].localName&&(e="");e in b||(b[e]=a.attributes[c].nodeValue)}a=a.parentNode}return b};z.prototype.toString=function(a){var b=null;a&&a.shorten&&a.graph?(b=a.graph.shorten(this.predicate,a.prefixesUsed))||(b="<"+this.predicate+">"):b="<"+this.predicate+">";for(var b=b+" ",c=0;c<this.objects.length;c++)if(0<c&&(b+=", "),"http://www.w3.org/1999/02/22-rdf-syntax-ns#object"==this.objects[c].type)"_:"==this.objects[c].value.substring(0,2)?b+=this.objects[c].value:
a&&a.shorten&&a.graph?(b=a.graph.shorten(this.objects[c].value,a.prefixesUsed))||(b="<"+this.objects[c].value+">"):b+="<"+this.objects[c].value+">";else if("http://www.w3.org/2001/XMLSchema#integer"==this.objects[c].type||"http://www.w3.org/2001/XMLSchema#decimal"==this.objects[c].type||"http://www.w3.org/2001/XMLSchema#double"==this.objects[c].type||"http://www.w3.org/2001/XMLSchema#boolean"==this.objects[c].type)b+=this.objects[c].value;else if("http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral"==
this.objects[c].type){for(var e=new XMLSerializer,f="",i=0;i<this.objects[c].value.length;i++)if(this.objects[c].value[i].nodeType==Node.ELEMENT_NODE){var d=z.getPrefixMap(this.objects[c].value[i]),h=[],g;for(g in d)h.push(g);h.sort();for(var j=this.objects[c].value[i].cloneNode(!0),m=0;m<h.length;m++)j.setAttributeNS("http://www.w3.org/2000/xmlns/",0==h[m].length?"xmlns":"xmlns:"+h[m],d[h[m]]);f+=e.serializeToString(j)}else this.objects[c].value[i].nodeType==Node.TEXT_NODE&&(f+=this.objects[c].value[i].nodeValue);
b+='"""'+f.replace(/"""/,'\\"\\"\\"')+'"""^^<http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral>'}else e=this.objects[c].value,b=0<=e.indexOf("\n")||0<=e.indexOf("\r")?b+('"""'+e.replace(/"""/,'\\"\\"\\"')+'"""'):b+('"'+e.replace(/"/,'\\"')+'"'),"http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"!=this.objects[c].type?b+="^^<"+this.objects[c].type+">":this.objects[c].language&&(b+="@"+this.objects[c].language);return b};x.prototype=new j;x.prototype.constructor=j;x.prototype.getObjectSize=
function(a){var b=0,c;for(c in a)a.hasOwnProperty(c)&&b++;return b};x.prototype.init=function(){var a=this;this.finishedHandlers.push(function(){for(var b in a.target.graph.subjects)0==a.getObjectSize(a.target.graph.subjects[b].predicates)&&delete a.target.graph.subjects[b]})};x.prototype.newSubjectOrigin=function(a,b){for(var c=this.newSubject(null,b),e=0;e<c.origins.length;e++)if(c.origins[e]===a)return;c.origins.push(a);a.data||Object.defineProperty(a,"data",{value:c,writable:!1,configurable:!0,
enumerable:!0})};x.prototype.newSubject=function(a,b){var c=this.target.graph.subjects[b];c||(c=new E(this.target.graph,b),this.target.graph.subjects[b]=c);return c};x.prototype.addTriple=function(a,b,c,e){var f=this.newSubject(a,b),b=f.predicates[c];b||(b=new z(c),f.predicates[c]=b);for(var i=0;i<b.objects.length;i++)if(b.objects[i].type==e.type&&b.objects[i].value==e.value){b.objects[i].origin!==a&&(Array.isArray(b.objects[i].origin)||(c=[],c.push(b.objects[i].origin),b.objects[i].origin=c),b.objects[i].origin.push(a));
return}b.objects.push(e);e.origin=a;c==j.typeURI&&f.types.push(e.value)};x.rdfaCopyPredicate="http://www.w3.org/ns/rdfa#copy";x.rdfaPatternType="http://www.w3.org/ns/rdfa#Pattern";x.prototype.copyProperties=function(){var a=[],b={},c;for(c in this.target.graph.subjects){var e=this.target.graph.subjects[c],f=e.predicates[x.rdfaCopyPredicate];if(f){a.push(c);for(var i=0;i<f.objects.length;i++)if(f.objects[i].type==j.objectURI){var d=f.objects[i].value,h=this.target.graph.subjects[d];if(h){var g=h.predicates[j.typeURI];
if(g){for(var l=!1,m=0;m<g.objects.length&&!l;m++)g.objects[m].value==x.rdfaPatternType&&g.objects[m].type==j.objectURI&&(l=!0);if(l){b[d]=!0;for(var q in h.predicates)if(d=h.predicates[q],q==j.typeURI){if(1!=d.objects.length)for(m=0;m<d.objects.length;m++)d.objects[m].value!=x.rdfaPatternType&&(g=e.predicates[q],g||(g=new z(q),e.predicates[q]=g),g.objects.push({type:d.objects[m].type,value:d.objects[m].value,language:d.objects[m].language,origin:d.objects[m].origin}),e.types.push(d.objects[m].value))}else{g=
e.predicates[q];g||(g=new z(q),e.predicates[q]=g);for(m=0;m<d.objects.length;m++)g.objects.push({type:d.objects[m].type,value:d.objects[m].value,language:d.objects[m].language,origin:d.objects[m].origin})}}}}}}}for(i=0;i<a.length;i++)e=this.target.graph.subjects[a[i]],delete e.predicates[x.rdfaCopyPredicate];for(c in b)delete this.target.graph.subjects[c]};H.prototype.getProperties=function(){var a=[],b;for(b in this._data_.properties)a.push(b);return a};H.prototype.getSubject=function(){return this._data_.subject};
H.prototype.get=function(a){a=this._data_.owner._data_.graph.curieParser.parse(a,!0);return(a=this._data_.properties[a])?a[0]:null};H.prototype.getAll=function(a){a=this._data_.owner._data_.graph.curieParser.parse(a,!0);return this._data_.properties[a]};p.prototype=new r;p.prototype.constructor=p;p.nameChar="[-A-Z_a-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c-\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd\u10000-\uefffF.0-9\u00b7\u0300-\u036f\u203f-\u2040]";
p.nameStartChar="[A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u0131\u0134-\u013e\u0141-\u0148\u014a-\u017e\u0180-\u01c3\u01cd-\u01f0\u01f4-\u01f5\u01fa-\u0217\u0250-\u02a8\u02bb-\u02c1\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03ce\u03d0-\u03d6\u03da\u03dc\u03de\u03e0\u03e2-\u03f3\u0401-\u040c\u040e-\u044f\u0451-\u045c\u045e-\u0481\u0490-\u04c4\u04c7-\u04c8\u04cb-\u04cc\u04d0-\u04eb\u04ee-\u04f5\u04f8-\u04f9\u0531-\u0556\u0559\u0561-\u0586\u05d0-\u05ea\u05f0-\u05f2\u0621-\u063a\u0641-\u064a\u0671-\u06b7\u06ba-\u06be\u06c0-\u06ce\u06d0-\u06d3\u06d5\u06e5-\u06e6\u0905-\u0939\u093d\u0958-\u0961\u0985-\u098c\u098f-\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09dc-\u09dd\u09df-\u09e1\u09f0-\u09f1\u0a05-\u0a0a\u0a0f-\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32-\u0a33\u0a35-\u0a36\u0a38-\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8b\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2-\u0ab3\u0ab5-\u0ab9\u0abd\u0ae0\u0b05-\u0b0c\u0b0f-\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32-\u0b33\u0b36-\u0b39\u0b3d\u0b5c-\u0b5d\u0b5f-\u0b61\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99-\u0b9a\u0b9c\u0b9e-\u0b9f\u0ba3-\u0ba4\u0ba8-\u0baa\u0bae-\u0bb5\u0bb7-\u0bb9\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c60-\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cde\u0ce0-\u0ce1\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d28\u0d2a-\u0d39\u0d60-\u0d61\u0e01-\u0e2e\u0e30\u0e32-\u0e33\u0e40-\u0e45\u0e81-\u0e82\u0e84\u0e87-\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa-\u0eab\u0ead-\u0eae\u0eb0\u0eb2-\u0eb3\u0ebd\u0ec0-\u0ec4\u0f40-\u0f47\u0f49-\u0f69\u10a0-\u10c5\u10d0-\u10f6\u1100\u1102-\u1103\u1105-\u1107\u1109\u110b-\u110c\u110e-\u1112\u113c\u113e\u1140\u114c\u114e\u1150\u1154-\u1155\u1159\u115f-\u1161\u1163\u1165\u1167\u1169\u116d-\u116e\u1172-\u1173\u1175\u119e\u11a8\u11ab\u11ae-\u11af\u11b7-\u11b8\u11ba\u11bc-\u11c2\u11eb\u11f0\u11f9\u1e00-\u1e9b\u1ea0-\u1ef9\u1f00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2126\u212a-\u212b\u212e\u2180-\u2182\u3041-\u3094\u30a1-\u30fa\u3105-\u312c\uac00-\ud7a3\u4e00-\u9fa5\u3007\u3021-\u3029_]";
p.NCNAME=RegExp("^"+j.nameStartChar+j.nameChar+"*$");p.toProjection=function(a,b,c){var e=new H(a,b.subject),f;for(f in b.predicates){var i=b.predicates[f],d=[];e._data_.properties[f]=d;for(var h=0;h<i.objects.length;h++)d.push(i.objects[h].value)}if(c)for(var g in c)f=c[g],f=a._data_.graph.curieParser.parse(f,!0),(d=e._data_.properties[f])&&(e[g]=1==d.length?d[0]:d);return e};p.prototype.getProperties=function(a){var b=[];if(a){if(a=this._data_.graph.curieParser.parse(a,!0),f=this._data_.graph.subjects[a])for(var c in f.predicates)b.push(c)}else{var a=
{},e;for(e in this._data_.graph.subjects){var f=this._data_.graph.subjects[e];if(f)for(c in f.predicates)a[c]||(a[c]=!0,b.push(c))}}return b};p.prototype.getSubjects=function(a,b){var c=[];a&&(a=this._data_.graph.curieParser.parse(a,!0));if(a&&b){var e=this._data_.graph.curieParser.parse(b,!0),f;for(f in this._data_.graph.subjects){var d=this._data_.graph.subjects[f];if(d=d.predicates[a])for(var k=0;k<d.objects.length;k++)if(d.objects[k].value==b||d.objects[k].value==e){c.push(f);break}}}else if(a)for(f in this._data_.graph.subjects)d=
this._data_.graph.subjects[f],(d=d.predicates[a])&&c.push(f);else if(b)for(f in e=this._data_.graph.curieParser.parse(b,!0),this._data_.graph.subjects){var d=this._data_.graph.subjects[f],h;for(h in d.predicates)if(d=f.predicates[h]){for(var g=null,k=0;!g&&k<d.objects.length;k++)if(d.objects[k].value==b||node.objects[k].value==e)g=d.objects[k];if(g){c.push(f);break}}}else for(f in this._data_.graph.subjects)c.push(f);return c};p.prototype.getValueOrigins=function(a,b){var c=[],e=function(a){if(a)for(var b=
0;b<a.objects.length;b++)if(Array.isArray(a.objects[b].origin))for(var e=0;e<a.objects[b].origin.length;e++)c.push({origin:a.objects[b].origin[e],value:a.objects[b].value});else c.push({origin:a.objects[b].origin,value:a.objects[b].value})};b&&(b=this._data_.graph.curieParser.parse(b,!0));if(a){var a=this._data_.graph.curieParser.parse(a,!0),f=this._data_.graph.subjects[a];if(f)if(b)e(f.predicates[b]);else for(var d in f.predicates)e(f.predicates[d])}else if(b)for(var k in this._data_.graph.subjects)f=
this._data_.graph.subjects[k],e(f.predicates[b]);else for(k in this._data_.graph.subjects)for(d in f=this._data_.graph.subjects[k],f.predicates)e(f.predicates[d]);return c};p.prototype.getValues=function(a,b){var c=[];b&&(b=this._data_.graph.curieParser.parse(b,!0));if(a){var a=this._data_.graph.curieParser.parse(a,!0),e=this._data_.graph.subjects[a];if(e)if(b){var f=e.predicates[b];if(f)for(var d=0;d<f.objects.length;d++)c.push(f.objects[d].value)}else for(var k in e.predicates){f=e.predicates[k];
for(d=0;d<f.objects.length;d++)c.push(f.objects[d].value)}}else if(b)for(var h in this._data_.graph.subjects){if(e=this._data_.graph.subjects[h],f=e.predicates[b])for(d=0;d<f.objects.length;d++)c.push(f.objects[d].value)}else for(h in this._data_.graph.subjects)for(k in e=this._data_.graph.subjects[h],e.predicates){f=e.predicates[k];for(d=0;d<f.objects.length;d++)c.push(f.objects[d].value)}return c};Object.defineProperty(p.prototype,"prefixes",{enumerable:!0,get:function(){return Object.keys(this._data_.graph.prefixes)}});
p.prototype.setMapping=function(a,b){this._data_.graph.prefixes[a]=b};p.prototype.getMapping=function(a){return this._data_.graph.prefixes[a]};p.prototype.expand=function(a){return this._data_.graph.expand(a)};p.prototype.shorten=function(a){return this._data_.graph.shorten(a)};p.prototype.getSubject=function(a){if(!a)return null;a=this._data_.graph.curieParser.parse(a,!0);return(a=this._data_.graph.subjects[a])?a:null};p.prototype.getProjection=function(a,b){if(!a)return null;var a=this._data_.graph.curieParser.parse(a,
!0),c=this._data_.graph.subjects[a];return!c?null:p.toProjection(this,c,b)};p.prototype.getProjections=function(a,b,c){a&&(a=this._data_.graph.curieParser.parse(a,!0));var e=[];"undefined"==typeof b&&"undefined"==typeof c&&(c=a);if(a&&b){var f=this._data_.graph.curieParser.parse(b,!0),d;for(d in this._data_.graph.subjects){var k=this._data_.graph.subjects[d],h=k.predicates[a];if(h)for(var g=0;g<h.objects.length;g++)if(h.objects[g].value==b||h.objects[g].value==f){e.push(p.toProjection(this,k,c));
break}}}else if(a)for(d in this._data_.graph.subjects)k=this._data_.graph.subjects[d],k.predicates[a]&&e.push(p.toProjection(this,k,c));else for(d in this._data_.graph.subjects)k=this._data_.graph.subjects[d],e.push(p.toProjection(this,k,c));return e};p.prototype.merge=function(a,b){var c=b&&b.mergeBlankNodes?!0:!1,e=0;if(!c)for(var f in this._data_.graph.subjects){var d=/_:([0-9]+)/.exec(f);d&&(d=parseInt(d[1]),d>e&&(e=d))}if(a){var k={},c=c?function(a){return a}:function(a){var b=k[a];!b&&/_:([0-9]+)/.test(a)&&
(e++,b="_:"+e,k[a]=b);return b?b:a};for(f in a){var h=c(f),d=a[f];f=h?h:f;if(h=this._data_.graph.subjects[f])for(var g in d.predicates){var l=d.predicates[g],m=h.predicates[g];if(m)for(var q=0;q<l.objects.length;q++){for(var n=l.objects[q],p=[],r=0;r<m.objects.length;r++)n.type==j.XMLLiteralURI&&(m.objects[r].type!=n.type||m.objects[r].value!==n.value)?p.push(n):(m.objects[r].type!=n.type||m.objects[r].value==n.value)&&p.push(n);for(r=0;r<p.length;r++)p[r].type==j.objectURI&&(p[r].value=c(p[r].value)),
m.objects.push(p[r])}else{h.predicates[g]=l;for(q=0;q<l.objects.length;q++)l.objects[q].type==j.objectURI&&(l.objects[q].value=c(l.objects[q].value))}}else for(g in this._data_.graph.subjects[f]=d,d.subject=f,d.predicates){l=d.predicates[g];for(q=0;q<l.objects.length;q++)l.objects[q].type==j.objectURI&&(l.objects[q].value=c(l.objects[q].value))}}}if(b&&b.prefixes)for(var w in b.prefixes)this._data_.graph.prefixes[w]||(this._data_.graph.prefixes[w]=b.prefixes[w])};Element.prototype.getElementsByType=
function(){var a=arguments,b=this.ownerDocument.createTreeWalker(this,NodeFilter.SHOW_ELEMENT,{acceptNode:function(b){if(!b.data)return NodeFilter.FILTER_SKIP;for(var c=0;c<a.length;c++)if(0<=b.data.types.indexOf(a[c]))return NodeFilter.FILTER_ACCEPT;return NodeFilter.FILTER_SKIP}},!1),c=[];for(c.item=function(a){return this[a]};b.nextNode();)c.push(b.currentNode);return c};Element.prototype.getFirstElementByType=function(){var a=arguments,b=this.ownerDocument.createTreeWalker(this,NodeFilter.SHOW_ELEMENT,
{acceptNode:function(b){if(!b.data)return NodeFilter.FILTER_SKIP;for(var e=0;e<a.length;e++)if(0<=b.data.types.indexOf(a[e]))return NodeFilter.FILTER_ACCEPT;return NodeFilter.FILTER_SKIP}},!1);return b.nextNode()?b.currentNode:null};p.attach=function(a,b){Object.defineProperty(a,"data",{value:new p(b&&b.baseURI?b.baseURI:a.nodeType==Node.DOCUMENT_NODE?a.documentElement.baseURI:a.graph.baseURI),writable:!1,configurable:!1,enumerable:!0});a.getElementsByType=function(a){return this.getElementsByProperty("http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
a)};a.getElementsBySubject=function(a){var b=[];b.item=function(a){return this[a]};a=this.data._data_.graph.curieParser.parse(a,!0);if(a=this.data._data_.graph.subjects[a])for(var f=0;f<a.origins.length;f++)b.push(a.origins[f]);return b};a.getElementsByProperty=function(a,b){var f=[];f.item=function(a){return this[a]};b&&(b=this.data._data_.graph.curieParser.parse(b,!1));var d="undefined"==typeof b,a=this.data._data_.graph.curieParser.parse(a,!0),k;for(k in this.data._data_.graph.subjects){var h=
this.data._data_.graph.subjects[k].predicates[a];if(h)for(var g=0;g<h.objects.length;g++)if(d||h.objects[g].value==b)Array.isArray(h.objects[g].origin)?f.push.apply(f,h.objects[g].origin):f.push(h.objects[g].origin)}return f};a.getElementSubject=function(a){for(var b in this.data._data_.graph.subjects)if(0<=this.data._data_.graph.subjects[b].origins.indexOf(a))return b;return null}};d.prototype=new r;d.prototype.constructor=d;d.commentRE=/^#.*/;d.wsRE=/^\s+/;d.iriRE=/^\<((?:(?:[^\x00-\x20<>"{}|^`\\]|\\u[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]|\\U[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f])*))\>/;
d.singleQuoteLiteralRE=/^'((?:[^'\n\r\\]*|\\'|\\)*)'/;d.doubleQuoteLiteralRE=/^\"((?:[^"\n\r\\]*|\\"|\\)*)\"/;d.longDoubleQuoteLiteralRE=/^\"\"\"((?:[^"\\]*|\\"|\\|\"(?!\")|\"\"(?!\"))*)\"\"\"/;d.longSingleQuoteLiteralRE=/^'''((?:[^'\\]*|\\'|\\|'(?!')|''(?!'))*)'''/;d.typeRE=/^\^\^/;d.dotRE=/^\./;d.openSquareBracketRE=/^\[/;d.closeSquareBracketRE=/^\]/;d.prefixRE=/^((?:(?:[A-Z]|[a-z]|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u02FF]|[\u0370-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\ud800-\udfff][\ud800-\udfff])(?:(?:[A-Z]|[a-z]|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u02FF]|[\u0370-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\ud800-\udfff][\ud800-\udfff]|[_\.\-\u00B7]|[0-9]|[\u0300-\u036F]|[\u203F-\u2040])*(?:[A-Z]|[a-z]|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u02FF]|[\u0370-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\ud800-\udfff][\ud800-\udfff]|[_\-\u00B7]|[0-9]|[\u0300-\u036F]|[\u203F-\u2040]))?)?):/;
d.blankNodeRE=/^(_:)/;d.localNameRE=/^((?:[A-Z]|[a-z]|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u02FF]|[\u0370-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\ud800-\udfff][\ud800-\udfff]|[_:]|[0-9]|%[0-9A-Fa-f][0-9A-Fa-f]|\\[_~\.\-!$&'()*+,;=\/?#@%])(?:(?:[A-Z]|[a-z]|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u02FF]|[\u0370-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\ud800-\udfff][\ud800-\udfff]|[_\-\.:\u00b7]|[\u0300-\u036F]|[\u203F-\u2040]|[0-9]|%[0-9A-Fa-f][0-9A-Fa-f]|\\[_~\.\-!$&'()*+,;=/?#@%])*(?:[A-Z]|[a-z]|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u02FF]|[\u0370-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\ud800-\udfff][\ud800-\udfff]|[_\-:\u00b7]|[\u0300-\u036F]|[\u203F-\u2040]|[0-9]|%[0-9A-Fa-f][0-9A-Fa-f]|\\[_~\.\-!$&'()*+,;=/?#@%]))?)/;
d.langRE=/^@([a-zA-Z]+(?:-[a-zA-Z0-9]+)*)/;d.prefixIDRE=/^@prefix/;d.baseRE=/^@base/;d.sparqlPrefixRE=/^[Pp][Rr][Ee][Ff][Ii][Xx]/;d.sparqlBaseRE=/^[Bb][Aa][Ss][Ee]/;d.semicolonRE=/^;/;d.commaRE=/^,/;d.aRE=/^a/;d.openParenRE=/^\(/;d.closeParenRE=/^\)/;d.integerRE=/^([+-]?[0-9]+)/;d.decimalRE=/^([+-]?[0-9]*\.[0-9]+)/;d.doubleRE=/^([+-]?(?:[0-9]+\.[0-9]*[eE][+-]?[0-9]+|\.[0-9]+[eE][+-]?[0-9]+|[0-9]+[eE][+-]?[0-9]+))/;d.booleanRE=/^(true|false)/;d.typeURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
d.objectURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#object";d.plainLiteralURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";d.nilURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#nil";d.firstURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#first";d.restURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#rest";d.xsdStringURI="http://www.w3.org/2001/XMLSchema#string";d.xsdIntegerURI="http://www.w3.org/2001/XMLSchema#integer";d.xsdDecimalURI="http://www.w3.org/2001/XMLSchema#decimal";d.xsdDoubleURI=
"http://www.w3.org/2001/XMLSchema#double";d.xsdBooleanURI="http://www.w3.org/2001/XMLSchema#boolean";d.prototype.reset=function(){this.context=new M;this.errorCount=this.blankNodeCounter=0;this.lineNumber=1};d.dumpGraph=function(a){for(var b in a)console.log(a[b].toString())};d.prototype.newBlankNode=function(){this.blankNodeCounter++;return"_:"+this.blankNodeCounter};d.prototype._match=function(a,b){var c=a.exec(b);return c?{text:c[0],remaining:b.substring(c[0].length),values:1<c.length?c.splice(1):
null}:null};d.prototype._trim=function(a){var b=null;do{if(b=d.wsRE.exec(a))this.lineNumber+=b[0].split(/\n/).length-1,a=a.substring(b[0].length);(b=d.commentRE.exec(a))&&(a=a.substring(b[0].length))}while(b);return a};d.prototype.reportError=function(a){this.onError(this.lineNumber,a)};d.prototype.parse=function(a,b){b&&(this.context.baseURI=this.parseURI(b));for(;0<a.length;)a=this._trim(a),0<a.length&&(a=this.parseStatement(a))};d.prototype.parseStatement=function(a){var b=this._match(d.prefixIDRE,
a);if(b){var c=this._trim(b.remaining),b=this.parsePrefixName(c);if(!b)return this.reportError("Cannot parse prefix after @prefix: "+a.substring(20)+"..."),this.errorCount++,c;a=b.prefix;c=this._trim(b.remaining);b=this.parseIRIReference(c);if(!b)return this.reportError("Cannot parse IRI after @prefix: "+c.substring(20)+"..."),this.errorCount++,c;this.context.prefixes[a]=this.context.baseURI?this.context.baseURI.resolve(b.iri):b.iri;try{this.parseURI(this.context.prefixes[a])}catch(e){this.reportError(e.toString()),
this.errorCount++}c=this._trim(b.remaining);if(b=this._match(d.dotRE,c))return b.remaining;this.reportError("Missing end . for @prefix statement.  Found: "+c.substring(0,20)+"...");this.errorCount++;return c}if(b=this._match(d.baseRE,a)){c=this._trim(b.remaining);b=this.parseIRIReference(c);if(!b)return this.reportError("Cannot parse IRI after @base: "+c.substring(0,20)+"..."),this.errorCount++,c;try{this.context.baseURI=this.context.baseURI?this.parseURI(this.context.baseURI.resolve(b.iri)):this.parseURI(b.iri)}catch(f){this.reportError(f+
"; IRI: "+b.iri),this.errorCount++}c=this._trim(b.remaining);if(b=this._match(d.dotRE,c))return b.remaining;this.reportError("Missing end . for @base statement.  Found: "+c.substring(0,20)+"...");this.errorCount++;return c}if(b=this._match(d.sparqlPrefixRE,a)){c=this._trim(b.remaining);b=this.parsePrefixName(c);if(!b)return this.reportError("Cannot parse prefix after PREFIX: "+a.substring(0,20)+"..."),this.errorCount++,c;a=b.prefix;c=this._trim(b.remaining);b=this.parseIRIReference(c);if(!b)return this.reportError("Cannot parse IRI after PREFIX: "+
c.substring(0,20)+"..."),this.errorCount++,c;this.context.prefixes[a]=this.context.baseURI?this.context.baseURI.resolve(b.iri):b.iri;try{this.parseURI(this.context.prefixes[a])}catch(i){this.reportError(i.toString()),this.errorCount++}return b.remaining}if(b=this._match(d.sparqlBaseRE,a)){c=this._trim(b.remaining);b=this.parseIRIReference(c);if(!b)return this.reportError("Cannot parse IRI after BASE: "+c.substring(0,20)+"..."),this.errorCount++,c;try{this.context.baseURI=this.context.baseURI?this.parseURI(this.context.baseURI.resolve(b.iri)):
this.parseURI(b.iri)}catch(k){this.reportError(k+"; IRI: "+b.iri),this.errorCount++}return b.remaining}a=this.parseTriples(a);a=this._trim(a);if(b=this._match(d.dotRE,a))return b.remaining;this.reportError("Missing end . triples.  Found: "+a.substring(0,20)+"...");this.errorCount++;return a};d.prototype.parseTriples=function(a){var b=this.parseIRI(a);if(b||(b=this.parseBlankNode(a)))return this.parsePredicateObjectList(b.iri,this._trim(b.remaining));if(b=this._match(d.openParenRE,a)){var a=null,c=
b.remaining,e=null;do{c=this._trim(c);if(b=this._match(d.closeParenRE,c)){c=b.remaining;e?this.addTriple(e,d.restURI,{type:d.objectURI,value:d.nilURI}):a=this.newBlankNode();break}b=this.newBlankNode();e?this.addTriple(e,d.restURI,{type:d.objectURI,value:b}):a=b;e=b;c=this.parseObject(e,d.firstURI,c)}while(0<c.length);return this.parsePredicateObjectList(a,this._trim(c))}return(b=this._match(d.openSquareBracketRE,a))?(a=this.newBlankNode(),c=this._trim(b.remaining),(b=this._match(d.closeSquareBracketRE,
c))?c=b.remaining:(c=this.parsePredicateObjectList(a,c),(b=this._match(d.closeSquareBracketRE,this._trim(c)))?c=b.remaining:this.reportError("Missing end square bracket ']'.")),this.parsePredicateObjectList(a,this._trim(c),!0)):!b?(this.reportError("Terminating: Cannot parse at "+a.substring(0,20)+" ..."),this.errorCount++,""):this.parsePredicateObjectList(b.iri,this._trim(b.remaining))};d.prototype.parsePredicateObjectList=function(a,b,c){var e=!0,f=null;do{var i=this.parseIRI(b);if(!i&&(i=this._match(d.aRE,
b)))i.iri=d.typeURI;if(!i){if(c)return b;this.reportError("Terminating: Cannot parse predicate IRI.");this.errorCount++;return""}f=this.parseObjectList(a,i.iri,this._trim(i.remaining));if(i=this._match(d.semicolonRE,this._trim(f))){do b=this._trim(i.remaining),i=this._match(d.semicolonRE,b);while(i);c=!0}else e=!1}while(e);return f};d.prototype.parseObjectList=function(a,b,c){var e=!0,f=null;do{var f=this.parseObject(a,b,c),i=this._match(d.commaRE,this._trim(f));i?c=this._trim(i.remaining):e=!1}while(e);
return f};d.prototype.parseObject=function(a,b,c){var e=this.parseIRI(c);if(e||(e=this.parseBlankNode(c)))return this.addTriple(a,b,{type:d.objectURI,value:e.iri}),e.remaining;if(e=this._match(d.openParenRE,c)){var f=a,i=b,k=e.remaining;do{k=this._trim(k);if(e=this._match(d.closeParenRE,k))return this.addTriple(f,f==a?b:d.restURI,{type:d.objectURI,value:d.nilURI}),e.remaining;e=this.newBlankNode();f==a?this.addTriple(a,b,{type:d.objectURI,value:e}):this.addTriple(f,d.restURI,{type:d.objectURI,value:e});
f=e;i=d.firstURI;k=this.parseObject(f,i,k)}while(0<k.length)}if(e=this._match(d.openSquareBracketRE,c)){c=this.newBlankNode();this.addTriple(a,b,{type:d.objectURI,value:c});k=this.parsePredicateObjectList(c,this._trim(e.remaining),!0);k=this._trim(k);if(e=this._match(d.closeSquareBracketRE,k))return e.remaining;this.reportError("Missing close square bracket ']' for blank node "+c+" predicate object list");this.errorCount++;return k}if(e=this.parseLiteral(c))return this.addTriple(a,b,{type:e.type?
e.type:d.plainLiteralURI,value:e.literal,language:e.language}),e.remaining;this.reportError("Terminating: Cannot parse literal at "+c.substring(0,20));this.errorCount++;return""};d.prototype.parsePrefixName=function(a){if(a=this._match(d.prefixRE,a))a.prefix=a.values[0];return a};d.prototype.parseIRIReference=function(a){if(a=this._match(d.iriRE,a))a.iri=d.expandURI(a.values[0]);return a};d.prototype.parseIRI=function(a){var b=this._match(d.iriRE,a);if(b){a=d.expandURI(b.values[0]);b.iri=this.context.baseURI?
this.context.baseURI.resolve(a):a;try{this.parseURI(b.iri)}catch(c){this.reportError(c.toString()),this.errorCount++}return b}if(b=this._match(d.prefixRE,a)){var e=b.values[0],a=this.context.prefixes[e];if(!a)return this.reportError("No prefix mapping for "+e),this.errorCount++,null;e=b.remaining;if(b=this._match(d.localNameRE,e)){b.iri=a+d.expandName(b.values[0]);try{this.parseURI(b.iri)}catch(f){this.reportError(f.toString()),this.errorCount++}return b}return{iri:a,remaining:e}}return null};d.prototype.parseBlankNode=
function(a){if(a=this._match(d.blankNodeRE,a))if(a=this._match(d.localNameRE,a.remaining))return a.iri="_:"+d.expandName(a.values[0]),a;return null};d.prototype.parseLiteral=function(a){var b=this._match(d.longDoubleQuoteLiteralRE,a);b||(b=this._match(d.longSingleQuoteLiteralRE,a));b||(b=this._match(d.singleQuoteLiteralRE,a));b||(b=this._match(d.doubleQuoteLiteralRE,a));if(b){a=null;try{a=d.expandLiteral(b.values[0])}catch(c){this.reportError(c.toString()),this.errorCount++}var e=b.remaining;if(b=
this._match(d.langRE,e))return b.literal=a,b.language=b.values[0],b;if(b=this._match(d.typeRE,e)){e=b.remaining;if(b=this.parseIRI(e))return b.literal=a,b.type=b.iri,b;this.reportError("Missing type URI after ^^");this.errorCount++}return{literal:a,remaining:e}}return(b=this._match(d.doubleRE,a))?(b.literal=b.values[0],b.type=d.xsdDoubleURI,b):(b=this._match(d.decimalRE,a))?(b.literal=b.values[0],b.type=d.xsdDecimalURI,b):(b=this._match(d.integerRE,a))?(b.literal=b.values[0],b.type=d.xsdIntegerURI,
b):(b=this._match(d.booleanRE,a))?(b.literal=b.values[0],b.type=d.xsdBooleanURI,b):null};d.prototype.newSubject=function(a){var b=this.context.subjects[a];b||(b=new E(this.context,a),this.context.subjects[a]=b);return b};d.expandHex=function(a){for(var b=a.split(/[0-9A-Fa-f]+/),c=0;c<b.length;c++)if(0<b[c].length)throw"Bad hex in escape: "+a;b=parseInt(a,16);if(isNaN(b))throw"Bad hex in escape: "+a;if(65536>b)return String.fromCharCode(b);a=b-65536;b=a&1023;return String.fromCharCode((a>>10)+55296)+
String.fromCharCode(b+56320)};d.escapedSequenceRE=/(\\t|\\b|\\n|\\r|\\f|\\"|\\'|\\\\|(?:\\U[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f])|(?:\\u[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]))/;d.expandLiteral=function(a){for(var a=a.split(d.escapedSequenceRE),b="",c=0;c<a.length;c++)if(0!=a[c].length)if("\\t"==a[c])b+="\t";else if("\\b"==a[c])b+="\b";else if("\\n"==a[c])b+="\n";else if("\\r"==a[c])b+="\r";else if("\\f"==a[c])b+="\f";else if('\\"'==a[c])b+=
'"';else if("\\'"==a[c])b+="'";else if("\\\\"==a[c])b+="\\";else if(6==a[c].length&&"\\"==a[c].charAt(0)&&"u"==a[c].charAt(1))b+=d.expandHex(a[c].substring(2));else if(10==a[c].length&&"\\"==a[c].charAt(0)&&"U"==a[c].charAt(1))b+=d.expandHex(a[c].substring(2));else{var e=a[c].substring(0,2);if(2==e.length&&"\\U"==e)throw"Bad hex in \\U escape "+a[c].substring(0,10);if(2==e.length&&"\\u"==e)throw"Bad hex in \\u escape "+a[c].substring(0,6);e=a[c].indexOf("\\");if(0<=e)throw"Bad escape "+a[c].substring(e,
e+2);b+=a[c]}return b};d.escapedURIRE=/((?:\\U[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f])|(?:\\u[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]))/;d.expandURI=function(a){for(var a=a.split(d.escapedURIRE),b="",c=0;c<a.length;c++)if(0!=a[c].length)if(6==a[c].length&&"\\"==a[c].charAt(0)&&"u"==a[c].charAt(1))b+=d.expandHex(a[c].substring(2));else if(10==a[c].length&&"\\"==a[c].charAt(0)&&"U"==a[c].charAt(1))b+=d.expandHex(a[c].substring(2));else{var e=a[c].substring(0,
2);if(2==e.length&&"\\U"==e)throw"Bad hex in \\U escape "+a[c].substring(0,10);if(2==e.length&&"\\u"==e)throw"Bad hex in \\u escape "+a[c].substring(0,6);e=a[c].indexOf("\\");if(0<=e)throw"Bad escape "+a[c].substring(e,e+2);b+=a[c]}return b};d.escapedNameCharRE=/(\\[_~\.\-!$&'()*+,;=/?#@%])/;d.expandName=function(a){for(var a=a.split(d.escapedNameCharRE),b="",c=0;c<a.length;c++)0!=a[c].length&&(b="\\"==a[c].charAt(0)?b+a[c].charAt(1):b+a[c]);return b};d.prototype.addTriple=function(a,b,c){var a=this.newSubject(a),
e=a.predicates[b];e||(e=new z(b),a.predicates[b]=e);e.objects.push(c);b==d.typeURI&&a.types.push(c.value)};l.prototype=new r;l.prototype.constructor=l;l.absoluteURIRE=/[\w\_\-]+:\S+/;l.prototype.newBlankNode=function(){this.blankCounter++;return"_:"+this.blankCounter};l.prototype.createBaseURI=function(a){var b=a.indexOf("#");0<=b&&(a=a.substring(0,b));return this.parseURI(a)};l.trim=function(a){return a.replace(/^\s\s*/,"").replace(/\s\s*$/,"")};l.tokenize=function(a){return l.trim(a).split(/\s+/)};
l.prototype.getVocabulary=function(a){for(var b=0;b<this.vocabularies.length;b++)if(this.vocabularies[b].isMember(a))return this.vocabularies[b];var b=function(a){return{namespaceURI:a,getProperty:function(a){return this.namespaceURI+a}}},c=a.indexOf("#");if(0<=c)return b(a.substring(0,c+1));c=a.lastIndexOf("/");return 0<=c?b(a.substring(0,c+1)):b(a)};l.prototype.getProperty=function(a,b){return l.absoluteURIRE.exec(a)?a:b?b.getProperty(a):null};l.valueMappings={meta:function(a){return a.getAttribute("content")},
audio:function(a,b){return b.resolve(a.getAttribute("src"))},a:function(a,b){return b.resolve(a.getAttribute("href"))},object:function(a,b){return b.resolve(a.getAttribute("data"))},time:function(a){var b=a.getAttribute("datetime");return b?b:a.textContent}};l.valueMappings.embed=l.valueMappings.audio;l.valueMappings.iframe=l.valueMappings.audio;l.valueMappings.img=l.valueMappings.audio;l.valueMappings.source=l.valueMappings.audio;l.valueMappings.track=l.valueMappings.audio;l.valueMappings.video=
l.valueMappings.audio;l.valueMappings.area=l.valueMappings.a;l.valueMappings.link=l.valueMappings.a;l.prototype.getValue=function(a,b){var c=l.valueMappings[a.localName];return c?c(a,b):a.textContent};l.objectURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#object";l.PlainLiteralURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";l.typeURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#type";l.prototype.process=function(a){a.nodeType==Node.DOCUMENT_NODE&&(a=a.documentElement);var b=[];for(b.push({current:a,
context:this.push(null,null)});0<b.length;){var c=b.shift(),a=c.current,c=c.context,e=this.createBaseURI(a.baseURI),f=null,d=c.vocabulary,k=a.hasAttribute("itemscope");if(k){var h=a.getAttribute("itemtype"),g=a.getAttribute("itemid");h&&(d=this.getVocabulary(h),f=g?g:this.newBlankNode(),this.addTriple(a,f,l.typeURI,{type:l.objectURI,value:h}))}if(h=a.getAttribute("itemprop"))if(h=l.tokenize(h),k)c.parent.subject&&f&&this.addTriple(a,c.subject,j,{type:l.objectURI,value:f});else if(d&&(f||(f=c.subject),
f)){e=this.getValue(a,e);for(k=0;k<h.length;k++){var j=0<h[k].length?this.getProperty(h[k],d):null;j&&this.addTriple(a,f,j,{type:l.PlainLiteralURI,value:e})}}for(a=a.lastChild;a;a=a.previousSibling)a.nodeType==Node.ELEMENT_NODE&&b.unshift({current:a,context:this.push(c,f,d)})}};l.prototype.push=function(a,b,c){return{parent:a,subject:b?b:a?a.subject:null,vocabulary:c?c:a?a.vocabulary:null}};l.prototype.addTriple=function(){};N.prototype=new l;N.prototype.constructor=l;N.prototype.addTriple=function(a,
b,c,e){var d=this.graph.subjects[b];d||(d=new E(this.graph,b),this.graph.subjects[b]=d);b=d.predicates[c];b||(b=new z(c),d.predicates[c]=b);for(var i=0;i<b.objects.length;i++)if(b.objects[i].type==e.type&&b.objects[i].value==e.value){b.objects[i].origin!==a&&(Array.isArray(b.objects[i].origin)||(c=[],c.push(b.objects[i].origin),b.objects[i].origin=c),b.objects[i].origin.push(a));return}b.objects.push(e);e.origin=a;c==l.typeURI&&d.types.push(e.value)};var D={attach:function(a,b){var c=a.implementation.hasFeature;
a.implementation.hasFeature=function(a,b){return"RDFaAPI"==a&&"1.1"==b?!0:c.apply(this,arguments)};var e=a.data?!0:!1;if(a.data)a.data._data_&&a.data._data_.graph.clear();else{p.attach(a,b);var d=function(a){a.id||(a.id="R"+Date.now());return new CustomEvent("green-turtle-response",{detail:a})};window.addEventListener("green-turtle-request",function(b){if("status"==b.detail.type)b={type:"status",version:GreenTurtle.version,loaded:e,count:a.data.graph.tripleCount,id:b.detail.id},window.dispatchEvent(d(b));
else if("get-subjects"==b.detail.type){var c=a.data.getSubjects(),b={type:"subjects",subjects:c,id:b.detail.id};window.dispatchEvent(d(b))}else if("get-subject"==b.detail.type){var g=null,i=b.detail.subject;if(a.data.getSubject)g=(c=a.data.getSubject(i))?c.toObject():null;else for(var g={subject:i,predicates:{}},j=a.data.getProjection(i),l=j.getProperties(),n=0;n<l.length;n++){var p=[];g.predicates[l[n]]={predicate:predicate,objects:p};for(var r=j.getAll(l[n]),w=0;w<r.length;w++)c[r[w]]?p.push({type:"http://www.w3.org/1999/02/22-rdf-syntax-ns#object",
value:r[w]}):p.push({type:"http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral",value:r[w]})}b={type:"subject",subject:i,triples:g,id:b.detail.id};window.dispatchEvent(d(b))}else console.log("Unrecognized message: "+JSON.stringify(b.detail))},!1)}var i=function(){var c=new x(a.data._data_);c.finishedHandlers.push(function(){for(var c in D.processors)D.processors[c].process(a,b)});c.finishedHandlers.push(function(a){if(a.ownerDocument){var b=a.ownerDocument.createEvent("HTMLEvents");b.initEvent("rdfa.loaded",
!0,!0);a.ownerDocument.dispatchEvent(b)}});c.process(a.documentElement,b);e=!0};"loading"==a.readyState?window.addEventListener("load",function(){i()},!1):i()},parse:function(a,b,c){var d=this.processors[b];if(!d)throw"Unsupported media type "+b;d=d.createParser();c&&c.errorHandler&&(d.onError=c.errorHandler);c=c?c.baseURI:null;d.parse(a,c);if(0<d.errorCount)throw c?"Errors during parsing "+c+" of type "+b:"Errors during parsing of type "+b;return d.context},createDocumentData:function(a){return new p(a?
a:window?window.location.href:"about:blank")}};Object.defineProperty(D,"processors",{value:{},writable:!1,configurable:!1,enumerable:!0});D.processors["text/turtle"]={createParser:function(){return new d},process:function(a,b){if(this.enabled){var c=a.nodeType==Node.DOCUMENT_NODE?a:a.ownerDocument;if(c.data){for(var d=!0,f=c.getElementsByTagNameNS("http://www.w3.org/1999/xhtml","script"),i=0;i<f.length;i++)if("text/turtle"==f[i].getAttribute("type")){var j=this.createParser();b&&b.errorHandler&&(j.onError=
b.errorHandler);j.parse(f[i].textContent,b?b.baseURI:null);0<j.errorCount?d=!1:c.data.merge(j.context.subjects,{prefixes:j.context.prefixes})}return d}}},enabled:!0};D.processors.microdata={process:function(a){if(this.enabled){var b=a.nodeType==Node.DOCUMENT_NODE?a:a.ownerDocument;if(!b.data)return!1;(new N(b.data.graph)).process(a);return!0}},enabled:!1};Object.defineProperty(O,"implementation",{value:D,writable:!1,configurable:!1,enumerable:!0});O.attach=function(a,b){D.attach(a,b)};return O}();
GreenTurtle.attach(document);

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
  var ColoredTreePicker, L_emphasizing, L_notshowing, L_showing, S_all, TreePicker, verbose,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  TreePicker = require('treepicker').TreePicker;

  L_notshowing = 0.93;

  L_showing = 0.75;

  L_emphasizing = 0.5;

  S_all = 0.5;

  verbose = false;

  ColoredTreePicker = (function(_super) {
    __extends(ColoredTreePicker, _super);

    function ColoredTreePicker(elem, root, extra_classes, needs_expander) {
      this.needs_expander = needs_expander;
      this.recolor_now = __bind(this.recolor_now, this);
      ColoredTreePicker.__super__.constructor.call(this, elem, root, extra_classes, this.needs_expander);
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
      var colors, id, nc, sc, styles, _ref;
      if (this.style_sheet == null) {
        this.style_sheet = d3.select("body").append("style").attr("id", this.get_my_style_id());
      }
      styles = "  #" + (this.get_my_id()) + " {}";
      _ref = this.id_to_colors;
      for (id in _ref) {
        colors = _ref[id];
        nc = colors.notshowing;
        sc = colors.showing;
        styles += "\n  #" + id + ".treepicker-showing {\n     background-color:" + sc + ";\n  }\n  #" + id + ".treepicker-unshowing {\n     background-color:" + nc + ";\n  }\n  #" + id + ".treepicker-mixed,\n  #" + id + ".treepicker-indirect-mixed.treepicker-collapse {\n    background: linear-gradient(45deg, " + nc + ", " + sc + ", " + nc + ", " + sc + ", " + nc + ", " + sc + ", " + nc + ", " + sc + ");\n    background-color: transparent;\n  }";
      }
      this.style_sheet.html(styles);
      if (this.style_sheet.html().length !== styles.length) {
        return console.error("style_sheet_length error:", this.style_sheet.html().length, "<>", styles.length);
      } else {
        return console.info("style_sheet_length good:", this.style_sheet.html().length, "==", styles.length);
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
      return this.recolor_recurse_DOM(retval, recursor, branch, "");
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
          notshowing: hsl2rgb(0, 0, L_notshowing),
          showing: hsl2rgb(0, 0, L_showing),
          emphasizing: hsl2rgb(0, 0, L_emphasizing)
        };
      } else {
        recursor.i++;
        hue = recursor.i / recursor.count * 360;
        retval[id] = {
          notshowing: hsl2rgb(hue, S_all, L_notshowing),
          showing: hsl2rgb(hue, S_all, L_showing),
          emphasizing: hsl2rgb(hue, S_all, L_emphasizing)
        };
      }
      if (verbose) {
        return console.log(indent + " - - - recolor_node(" + id + ")", retval[id].notshowing);
      }
    };

    ColoredTreePicker.prototype.get_color_forId_byName = function(id, state_name) {
      var colors, msg;
      id = this.uri_to_js_id(id);
      colors = this.id_to_colors[id];
      if (colors != null) {
        return colors[state_name];
      } else {
        return msg = "get_color_forId_byName(" + id + ") failed because @id_to_colors[id] not found";
      }
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
    Edge.prototype.color = "lightgrey";

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

    Edge.prototype.register = function() {
      return this.predicate.add_edge(this);
    };

    Edge.prototype.register_context = function(context) {
      return this.contexts.push(context);
    };

    Edge.prototype.isSelected = function() {
      return (this.source.selected != null) || (this.target.selected != null);
    };

    Edge.prototype.show = function() {
      this.predicate.shown_edges.acquire(this);
      if (this.isSelected()) {
        this.predicate.select(this);
      } else {
        this.predicate.unshown_edges.remove(this);
        this.predicate.unselect(this);
      }
      return this.predicate.update_edge(this, {
        show: true
      });
    };

    Edge.prototype.unshow = function() {
      if (this.isSelected()) {
        this.predicate.unshown_edges.acquire(this);
        this.predicate.select(this);
      } else {
        this.predicate.unshown_edges.acquire(this);
        this.predicate.unselected_edges.acquire(this);
      }
      return this.predicate.update_edge(this, {
        show: false
      });
    };

    Edge.prototype.an_end_is_selected = function() {
      return (this.target.selected != null) || (this.source.selected != null);
    };

    Edge.prototype.unselect = function() {
      return this.predicate.unselect(this);
    };

    Edge.prototype.select = function() {
      return this.predicate.select(this);
    };

    return Edge;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).Edge = Edge;

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
  var ColoredTreePicker, CommandController, TaxonBase, TreePicker, gcl,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  window.toggle_suspend_updates = function(val) {
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

  TaxonBase = require("taxonbase").TaxonBase;

  gcl = require('graphcommandlanguage');

  TreePicker = require('treepicker').TreePicker;

  ColoredTreePicker = require('coloredtreepicker').ColoredTreePicker;

  CommandController = (function() {
    function CommandController(huviz, container, hierarchy) {
      this.huviz = huviz;
      this.container = container;
      this.hierarchy = hierarchy;
      this.on_set_count_update = __bind(this.on_set_count_update, this);
      this.on_set_picked = __bind(this.on_set_picked, this);
      this.update_command = __bind(this.update_command, this);
      this.on_taxon_picked = __bind(this.on_taxon_picked, this);
      this.onChangeEnglish = __bind(this.onChangeEnglish, this);
      this.add_newnodeclass = __bind(this.add_newnodeclass, this);
      this.recolor_edges = __bind(this.recolor_edges, this);
      this.onpredicateclicked = __bind(this.onpredicateclicked, this);
      this.add_newpredicate = __bind(this.add_newpredicate, this);
      this.recolor_edges_and_predicates = __bind(this.recolor_edges_and_predicates, this);
      this.handle_newpredicate = __bind(this.handle_newpredicate, this);
      this.select_the_initial_set = __bind(this.select_the_initial_set, this);
      this.on_dataset_loaded = __bind(this.on_dataset_loaded, this);
      document.addEventListener('dataset-loaded', this.on_dataset_loaded);
      d3.select(this.container).html("");
      this.comdiv = d3.select(this.container).append("div");
      this.cmdlist = d3.select("#tabs-history").append('div').attr('class', 'commandlist');
      this.title_bar_controls();
      this.oldcommands = this.cmdlist.append('div').attr('class', 'commandhistory');
      this.control_label("Current Command");
      this.nextcommandbox = this.comdiv.append('div');
      this.control_label("Choose Verb");
      this.verbdiv = this.comdiv.append('div').attr('class', 'verbs');
      this.add_clear_both(this.comdiv);
      this.control_label("Select Nodes");
      this.build_setpicker();
      this.build_nodeclasspicker();
      this.likediv = this.comdiv.append('div');
      this.add_clear_both(this.comdiv);
      this.control_label("Edges of the Selected Nodes");
      this.build_predicatepicker();
      this.init_editor_data();
      this.build_form();
      this.update_command();
      this.install_listeners();
    }

    CommandController.prototype.control_label = function(txt) {
      return this.comdiv.append('div').classed("control_label", true).text(txt);
    };

    CommandController.prototype.install_listeners = function() {
      window.addEventListener('changePredicate', this.predicate_picker.onChangeState);
      window.addEventListener('changeTaxon', this.taxon_picker.onChangeState);
      return window.addEventListener('changeEnglish', this.onChangeEnglish);
    };

    CommandController.prototype.on_dataset_loaded = function(evt) {
      if (evt.done == null) {
        this.select_the_initial_set();
        this.huviz.hide_state_msg();
        return evt.done = true;
      }
    };

    CommandController.prototype.select_the_initial_set = function() {
      return this.huviz.pick_taxon("Thing", true);
    };

    CommandController.prototype.init_editor_data = function() {
      this.shown_edges_by_predicate = {};
      this.unshown_edges_by_predicate = {};
      return this.node_classes_chosen = [];
    };

    CommandController.prototype.reset_editor = function() {
      this.disengage_all_verbs();
      this.unselect_all_node_classes();
      this.init_editor_data();
      this.clear_like();
      return this.update_command();
    };

    CommandController.prototype.add_clear_both = function(target) {
      return target.append('div').attr('style', 'clear:both');
    };

    CommandController.prototype.title_bar_controls = function() {
      this.show_comdiv_button = d3.select(this.container).append('div').classed('show_comdiv_button', true);
      this.show_comdiv_button.classed('display_none', true);
      this.cmdlistbar = this.cmdlist.append('div').attr('class', 'cmdlistbar');
      this.cmdlist.append('div').attr('style', 'clear:both');
      this.cmdlistbarcontent = this.cmdlistbar.append('div').attr('class', 'cmdlisttitlebarcontent');
      this.cmdlistbarcontent.append('div').attr('class', 'cmdlisttitle');
      this.toggle_comdiv_button = this.cmdlistbar.append('div').attr('class', 'hide_comdiv');
      this.toggle_history_button = this.cmdlistbar.append('div').attr('class', 'hide_history');
      this.cmdlist.append('div').style('clear:both');
      this.toggle_history_button.on('click', (function(_this) {
        return function() {
          var shown;
          shown = !_this.toggle_history_button.classed('hide_history');
          _this.toggle_history_button.classed('hide_history', shown);
          _this.toggle_history_button.classed('show_history', !shown);
          return _this.oldcommands.classed('display_none', !shown);
        };
      })(this));
      this.clear_history_button = d3.select("#tab-history").append('input').attr("type", "submit").attr('value', 'Clear');
      this.clear_history_button.on('click', (function(_this) {
        return function() {
          return _this.oldcommands.html("");
        };
      })(this));
      this.show_comdiv_button.on('click', (function(_this) {
        return function() {
          _this.show_comdiv_button.classed('display_none', true);
          return _this.comdiv.classed('display_none', false);
        };
      })(this));
      this.toggle_comdiv_button.on('click', (function(_this) {
        return function() {
          var shown;
          shown = !_this.toggle_comdiv_button.classed('hide_comdiv');
          "setting toggle_comdiv:" + shown;
          _this.comdiv.classed('display_none', !shown);
          return _this.show_comdiv_button.classed('display_none', false);
        };
      })(this));
      return this.toggle_commands_button = this.cmdlistbar.append('div').attr('class', 'close_commands');
    };

    CommandController.prototype.ignore_predicate = function(pred_id) {
      return this.predicates_ignored.push(pred_id);
    };

    CommandController.prototype.handle_newpredicate = function(e) {
      var parent_lid, pred_lid, pred_name, pred_uri;
      pred_uri = e.detail.pred_uri;
      parent_lid = e.detail.parent_lid;
      pred_lid = e.detail.pred_lid;
      if (__indexOf.call(this.predicates_ignored, pred_uri) < 0) {
        if (__indexOf.call(this.predicates_ignored, pred_lid) < 0) {
          pred_name = pred_lid.match(/([\w\d\_\-]+)$/g)[0];
          this.add_newpredicate(pred_lid, parent_lid, pred_name);
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

    CommandController.prototype.build_predicatepicker = function() {
      var id;
      id = 'predicates';
      this.predicatebox = this.comdiv.append('div').classed('container', true).attr('id', id);
      this.predicatebox.attr('title', "Medium color: all edges shown -- click to show none\n" + "Faint color: no edges are shown -- click to show all\n" + "Stripey color: some edges shown -- click to show all\n" + "Hidden: no edges among the selected nodes");
      this.predicatebox.attr('class', 'scrolling');
      this.predicates_ignored = [];
      this.predicate_picker = new ColoredTreePicker(this.predicatebox, 'anything', [], true);
      this.predicate_hierarchy = {
        'anything': ['anything']
      };
      return this.predicate_picker.show_tree(this.predicate_hierarchy, this.predicatebox, this.onpredicateclicked);
    };

    CommandController.prototype.add_newpredicate = function(pred_lid, parent_lid, pred_name) {
      return this.predicate_picker.add(pred_lid, parent_lid, pred_name, this.onpredicateclicked);
    };

    CommandController.prototype.onpredicateclicked = function(pred_id, selected, elem) {
      var cmd, verb;
      if (selected) {
        verb = 'show';
      } else {
        verb = 'suppress';
      }
      cmd = new gcl.GraphCommand({
        verbs: [verb],
        regarding: [pred_id],
        sets: [this.huviz.selected_set]
      });
      this.prepare_command(cmd);
      return this.huviz.gclc.run(this.command);
    };

    CommandController.prototype.recolor_edges = function(evt) {
      var count, edge, node, pred_n_js_id, _i, _len, _ref, _results;
      count = 0;
      _ref = this.huviz.nodes;
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


    /*
     *     Collapsing and expanding taxons whether abstract or just instanceless.
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
     */

    CommandController.prototype.build_nodeclasspicker = function() {
      var id;
      id = 'classes';
      this.nodeclassbox = this.comdiv.append('div').classed('container', true).attr('id', id);
      this.nodeclassbox.attr('style', 'vertical-align:top');
      this.nodeclassbox.attr('title', "Medium color: all nodes are selected -- click to select none\n" + "Faint color: no nodes are selected -- click to select all\n" + "Stripey color: some nodes are selected -- click to select all\n");
      this.taxon_picker = new ColoredTreePicker(this.nodeclassbox, 'Thing', [], true);
      return this.taxon_picker.show_tree(this.hierarchy, this.nodeclassbox, this.on_taxon_picked);
    };

    CommandController.prototype.add_newnodeclass = function(class_id, parent_lid, class_name, taxon) {
      this.taxon_picker.add(class_id, parent_lid, class_name, this.on_taxon_picked);
      this.taxon_picker.recolor_now();
      return this.huviz.recolor_nodes();
    };

    CommandController.prototype.onChangeEnglish = function(evt) {
      this.object_phrase = evt.detail.english;
      return this.update_command();
    };

    CommandController.prototype.on_taxon_picked = function(id, selected, elem, propagate) {
      var class_name, cmd, kid, kid_elem, state, taxon, _i, _len, _ref;
      console.info("on_taxon_picked()", arguments);
      this.huviz.show_state_msg("toggling " + selected);
      taxon = this.huviz.taxonomy[id];
      if (taxon != null) {
        this.huviz.show_state_msg("get_state()");
        state = taxon.get_state();
        this.huviz.hide_state_msg();
      } else {
        throw "Uhh, there should be a root Taxon 'Thing' by this point: " + id;
      }
      console.log("on_taxon_state() state:", state);
      if (propagate == null) {
        propagate = this.taxon_picker.id_is_collapsed[id];
      }
      console.warn("" + id + " propagate: " + propagate + " PROPAGATION IS DISABLED AND SHOULD BE REMOVED");
      if (propagate && false) {
        console.log("crawl taxon.kids to propagate new state for", id);
        this.on_taxon_picked(id, selected, elem, false);
        if (taxon.kids != null) {
          _ref = taxon.kids;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            kid = _ref[_i];
            kid_elem = this.taxon_picker.id_to_elem[id];
            this.on_taxon_picked(kid.id, selected, kid_elem, true);
          }
        }
        return;
      }
      if (state === 'mixed' || state === 'unshowing') {
        if (!(__indexOf.call(this.node_classes_chosen, id) >= 0)) {
          this.node_classes_chosen.push(id);
        }
        cmd = new gcl.GraphCommand({
          verbs: ['select'],
          classes: (function() {
            var _j, _len1, _ref1, _results;
            _ref1 = this.node_classes_chosen;
            _results = [];
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              class_name = _ref1[_j];
              _results.push(class_name);
            }
            return _results;
          }).call(this)
        });
      } else if (state === 'showing') {
        this.unselect_node_class(id);
        cmd = new gcl.GraphCommand({
          verbs: ['unselect'],
          classes: [id]
        });
      } else if (state === "hidden") {
        throw "Uhh, how is it possible for state to equal 'hidden' at this point?";
      }
      if ((this.object_phrase != null) && this.object_phrase !== "") {
        cmd.object_phrase = this.object_phrase;
      }
      this.huviz.gclc.run(cmd);
      this.huviz.taxonomy['Thing'].update_english();
      return this.update_command();
    };

    CommandController.prototype.unselect_node_class = function(node_class) {
      return this.node_classes_chosen = this.node_classes_chosen.filter(function(eye_dee) {
        return eye_dee !== node_class;
      });
    };

    CommandController.prototype.verb_sets = [
      {
        choose: 'choose',
        unchoose: 'unchoose'
      }, {
        select: 'select',
        unselect: 'unselect'
      }, {
        label: 'label',
        unlabel: 'unlabel'
      }, {
        shelve: 'shelve',
        hide: 'hide'
      }, {
        discard: 'discard',
        undiscard: 'retrieve'
      }
    ];

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
      unchoose: function(node) {
        if (node.chosen == null) {
          return 'choose';
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
      }
    };

    CommandController.prototype.is_immediate_mode = function() {
      return this.engaged_verbs.length === 1;
    };

    CommandController.prototype.auto_change_verb_if_warranted = function(node) {
      var next_verb, test, verb;
      if (this.is_immediate_mode()) {
        verb = this.engaged_verbs[0];
        test = this.auto_change_verb_tests[verb];
        if (test) {
          next_verb = test(node);
          if (next_verb) {
            return this.engage_verb(next_verb);
          }
        }
      }
    };

    CommandController.prototype.verbs_requiring_regarding = ['show', 'suppress', 'emphasize', 'deemphasize'];

    CommandController.prototype.verbs_override = {
      choose: ['discard', 'unchoose', 'shelve', 'hide'],
      shelve: ['unchoose', 'choose', 'hide', 'discard', 'retrieve'],
      discard: ['choose', 'retrieve', 'hide', 'unchoose', 'unselect', 'select'],
      hide: ['discard', 'undiscard', 'label', 'choose', 'unchoose', 'select', 'unselect']
    };

    CommandController.prototype.verb_descriptions = {
      choose: "Put nodes in the graph.",
      shelve: "Remove nodes from the graph and put them on the shelf (the circle of nodes around the graph) from which they might return if called back into the graph by a neighbor being chosen.",
      hide: "Remove nodes from the grpah and don't display them anywhere, though they might be called back into the graph when some other node calls it back in to show an edge.",
      label: "Show the node's labels.",
      unlabel: "Stop showing the node's labels.",
      discard: "Put nodes in the discard bin (the small red circle) from which they do not get called back into the graph unless they are retrieved.",
      undiscard: "Retrieve nodes from the discard bin (the small red circle) and put them back on the shelf.",
      print: "Print associated snippets.",
      redact: "Hide the associated snippets.",
      show: "Show edges: 'Show (nodes) regarding (edges).' Add to the existing state of the graph edges from nodes of the classes indicated edges of the types indicated.",
      suppress: "Stop showing: 'Suppress (nodes) regarding (edges).' Remove from the existing sate of the graph edges of the types indicated from nodes of the types classes indicated.",
      specify: "Immediately specify the entire state of the graph with the constantly updating set of edges indicated from nodes of the classes indicated.",
      load: "Load knowledge from the given uri."
    };

    CommandController.prototype.build_form = function() {
      this.build_verb_form();
      this.build_like();
      this.nextcommand = this.nextcommandbox.append('div').attr('class', 'nextcommand command');
      this.nextcommandstr = this.nextcommand.append('span');
      return this.build_submit();
    };

    CommandController.prototype.build_like = function() {
      this.likediv.text('like:');
      this.like_input = this.likediv.append('input');
      return this.like_input.on('input', this.update_command);
    };

    CommandController.prototype.build_submit = function() {
      this.doit_butt = this.nextcommand.append('span').append("input").attr("style", "float:right").attr("type", "submit").attr('value', 'Do it').attr('id', 'doit_button');
      return this.doit_butt.on('click', (function(_this) {
        return function() {
          if (_this.update_command()) {
            _this.huviz.gclc.run(_this.command);
            _this.push_command(_this.command);
            _this.reset_editor();
            return _this.huviz.update_all_counts();
          }
        };
      })(this));
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
      _ref = this.node_classes_chosen;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        nid = _ref[_i];
        this.unselect_node_class(nid);
        _results.push(this.taxon_picker.set_branch_pickedness(nid, false));
      }
      return _results;
    };

    CommandController.prototype.clear_like = function() {
      return this.like_input[0][0].value = "";
    };

    CommandController.prototype.old_commands = [];

    CommandController.prototype.push_command = function(cmd) {
      var cmd_ui, prior, record;
      if (this.old_commands.length > 0) {
        prior = this.old_commands[this.old_commands.length - 1];
        if (prior.cmd.str === cmd.str) {
          return;
        }
      }
      cmd_ui = this.oldcommands.append('div').attr('class', 'command');
      record = {
        elem: cmd_ui,
        cmd: cmd
      };
      this.old_commands.push(record);
      return cmd_ui.text(cmd.str);
    };

    CommandController.prototype.build_command = function() {
      var args, class_name, like_str, s, v;
      args = {};
      args.object_phrase = this.object_phrase;
      if (this.engaged_verbs.length > 0) {
        args.verbs = (function() {
          var _i, _len, _ref, _results;
          _ref = this.engaged_verbs;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            v = _ref[_i];
            _results.push(v);
          }
          return _results;
        }).call(this);
      }
      if (this.chosen_set_id) {
        args.sets = [this.chosen_set];
      } else {
        if (this.node_classes_chosen.length > 0) {
          args.classes = (function() {
            var _i, _len, _ref, _results;
            _ref = this.node_classes_chosen;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              class_name = _ref[_i];
              _results.push(class_name);
            }
            return _results;
          }).call(this);
        }
        if (this.huviz.selected_set.length > 0) {
          args.subjects = (function() {
            var _i, _len, _ref, _results;
            _ref = this.huviz.selected_set;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              s = _ref[_i];
              _results.push(s);
            }
            return _results;
          }).call(this);
        }
      }
      like_str = (this.like_input[0][0].value || "").trim();
      if (like_str) {
        args.like = like_str;
      }
      return this.command = new gcl.GraphCommand(args);
    };

    CommandController.prototype.update_command = function() {
      this.huviz.show_state_msg("update_command");
      this.prepare_command(this.build_command());
      return this.huviz.hide_state_msg();
    };

    CommandController.prototype.prepare_command = function(cmd) {
      this.command = cmd;
      this.nextcommandstr.text(this.command.str);
      if (this.command.ready) {
        this.doit_butt.attr('disabled', null);
      } else {
        this.doit_butt.attr('disabled', 'disabled');
      }
      return this.command.ready;
    };

    CommandController.prototype.ready_to_perform = function() {
      return this.engaged_verbs.length > 0 && !this.object_phrase;
    };

    CommandController.prototype.build_verb_form = function() {
      var alternatives, id, label, vset, _i, _len, _ref, _results;
      _ref = this.verb_sets;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vset = _ref[_i];
        alternatives = this.verbdiv.append('div').attr('class', 'alternates');
        _results.push((function() {
          var _results1;
          _results1 = [];
          for (id in vset) {
            label = vset[id];
            _results1.push(this.build_verb_picker(id, label, alternatives));
          }
          return _results1;
        }).call(this));
      }
      return _results;
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

    CommandController.prototype.engage_verb = function(verb_id) {
      var overrides, vid, _i, _len, _ref;
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

    CommandController.prototype.disengage_verb = function(verb_id) {
      this.engaged_verbs = this.engaged_verbs.filter(function(verb) {
        return verb !== verb_id;
      });
      return this.verb_control[verb_id].classed('engaged', false);
    };

    CommandController.prototype.verb_control = {};

    CommandController.prototype.build_verb_picker = function(id, label, alternatives) {
      var that, vbctl;
      vbctl = alternatives.append('div').attr("class", "verb");
      if (this.verb_descriptions[id]) {
        vbctl.attr("title", this.verb_descriptions[id]).attr("id", "verb-" + id);
      }
      this.verb_control[id] = vbctl;
      vbctl.text(label);
      that = this;
      return vbctl.on('click', function() {
        var elem, newstate;
        elem = d3.select(this);
        newstate = !elem.classed('engaged');
        elem.classed('engaged', newstate);
        if (newstate) {
          that.engage_verb(id);
        } else {
          that.disengage_verb(id);
        }
        return that.update_command();
      });
    };

    CommandController.prototype.run_script = function(script) {
      this.huviz.gclc.run(script);
      return this.huviz.update_all_counts();
    };

    CommandController.prototype.build_setpicker = function() {
      this.the_sets = {
        'nodes': [
          'All ', {
            'selected_set': ['Selected'],
            'chosen_set': ['Chosen'],
            'graphed_set': ['Graphed'],
            'shelved_set': ['Shelved'],
            'hidden_set': ['Hidden'],
            'discarded_set': ['Discarded'],
            'labelled_set': ['Labelled']
          }
        ]
      };
      this.set_picker_box = this.comdiv.append('div').classed('container', true).attr('id', 'sets');
      this.set_picker = new TreePicker(this.set_picker_box, 'all', ['treepicker-vertical']);
      this.set_picker.show_tree(this.the_sets, this.set_picker_box, this.on_set_picked);
      return this.populate_all_set_docs();
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

    CommandController.prototype.on_set_picked = function(set_id, picking) {
      this.clear_set_picker();
      if (picking) {
        this.set_picker.set_state_by_id(set_id, "showing");
        this.chosen_set = this.huviz[set_id];
        this.chosen_set_id = set_id;
      } else {
        this.set_picker.set_state_by_id(set_id, "unshowing");
        delete this.chosen_set;
        delete this.chosen_set_id;
      }
      return this.update_command();
    };

    CommandController.prototype.on_set_count_update = function(set_id, count) {
      return this.set_picker.set_payload(set_id, count);
    };

    CommandController.prototype.clear_set_picker = function() {
      if (this.chosen_set_id != null) {
        this.set_picker.set_branch_pickedness(this.chosen_set_id, false);
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
    function GCLTestSuite(graph_ctrl, suite) {
      this.graph_ctrl = graph_ctrl;
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
    function GraphCommand(args_or_str) {
      var argn, args, argv;
      this.prefixes = {};
      if (typeof args_or_str === 'string') {
        args = this.parse(args_or_str);
      } else {
        args = args_or_str;
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
      id = node_spec.id;
      term = id;
      tried = [];
      node = this.graph_ctrl.nodes.get({
        'id': term
      });
      tried.push(term);
      id_parts = id.split(':');
      if (id_parts.length > 1) {
        abbr = id_parts[0];
        id = id_parts[1];
        prefix = this.prefixes[abbr];
        if (prefix) {
          term = prefix + id;
          node = this.graph_ctrl.nodes.get({
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
            node = this.graph_ctrl.nodes.get({
              'id': term
            });
          }
        }
      }
      if (!node) {
        msg = "node with id = " + term + " not found among " + this.graph_ctrl.nodes.length + " nodes: " + tried;
      }
      return node;
    };

    GraphCommand.prototype.get_nodes = function() {
      var a_set, class_name, like_regex, n, node, node_spec, result_set, the_set, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _m, _n, _ref, _ref1, _ref2, _ref3;
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
          the_set = (_ref2 = this.graph_ctrl.taxonomy[class_name]) != null ? _ref2.get_instances() : void 0;
          if (like_regex && (the_set != null)) {
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
      if (this.sets) {
        _ref3 = this.sets;
        for (_m = 0, _len4 = _ref3.length; _m < _len4; _m++) {
          a_set = _ref3[_m];
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
        method = this.graph_ctrl[verb];
        if (method) {
          methods.push(method);
        } else {
          msg = "method '" + verb + "' not found";
          console.log(msg);
          alert(msg);
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
        method = this.graph_ctrl[verb + "_edge_regarding"];
        if (method) {
          methods.push(method);
        } else {
          msg = "method '" + verb + "' not found";
          console.log(msg);
        }
      }
      return methods;
    };

    GraphCommand.prototype.regarding_required = function() {
      return (this.regarding != null) && this.regarding.length > 0;
    };

    GraphCommand.prototype.execute = function(graph_ctrl) {
      var err, iter, meth, nodes, reg_req, _i, _j, _len, _len1, _ref, _ref1;
      this.graph_ctrl = graph_ctrl;
      this.graph_ctrl.show_state_msg(this.as_msg());
      this.graph_ctrl.force.stop();
      reg_req = this.regarding_required();
      nodes = this.get_nodes();
      console.log(this.str, "on", nodes.length, "nodes");
      if (reg_req) {
        _ref = this.get_predicate_methods();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          meth = _ref[_i];
          err = function(err_arg) {
            if (err_arg != null) {
              console.error("err =", err_arg);
              if (err_arg == null) {
                throw "err_arg is null";
              }
              throw err_arg;
            } else {
              return console.log("DONE .execute()");
            }
          };
          iter = (function(_this) {
            return function(node) {
              var pred, retval, _j, _len1, _ref1;
              _ref1 = _this.regarding;
              for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                pred = _ref1[_j];
                retval = meth.call(_this.graph_ctrl, node, pred);
              }
              return _this.graph_ctrl.tick();
            };
          })(this);
          if (nodes != null) {
            async.each(nodes, iter, err);
          }
        }
      } else if (this.verbs[0] === 'load') {
        this.graph_ctrl.load(this.data_uri);
        console.log("load data_uri has returned");
      } else {
        _ref1 = this.get_methods();
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          meth = _ref1[_j];
          err = function(err_arg) {
            if (err) {
              return console.log("err =", err_arg);
            } else {
              return console.log("DONE .execute()");
            }
          };
          iter = (function(_this) {
            return function(node) {
              var retval;
              retval = meth.call(_this.graph_ctrl, node);
              return _this.graph_ctrl.tick();
            };
          })(this);
          if (nodes != null) {
            async.each(nodes, iter, err);
          }
        }
      }
      this.graph_ctrl.hide_state_msg();
      return this.graph_ctrl.force.start();
    };

    GraphCommand.prototype.update_str = function() {
      var cmd_str, like_str, missing, more, obj_phrase, ready, regarding_phrase, regarding_required, s, subj, verb, _i, _len, _ref;
      missing = '____';
      cmd_str = "";
      ready = true;
      regarding_required = false;
      if (this.verbs) {
        cmd_str = angliciser(this.verbs);
      } else {
        ready = false;
        cmd_str = missing;
      }
      cmd_str += " ";
      obj_phrase = "";
      if (cmd_str === 'load ') {
        this.str += this.data_uri + " .";
        return;
      }
      if (this.sets != null) {
        more = angliciser((function() {
          var _i, _len, _ref, _results;
          _ref = this.sets;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            s = _ref[_i];
            _results.push(s.id);
          }
          return _results;
        }).call(this));
        this.object_phrase = more;
      }
      if (this.object_phrase != null) {
        obj_phrase = this.object_phrase;
      } else {
        if (this.classes) {
          obj_phrase += angliciser(this.classes);
        }
        if (this.subjects) {
          obj_phrase = angliciser((function() {
            var _i, _len, _ref, _results;
            _ref = this.subjects;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              subj = _ref[_i];
              _results.push(subj.lid);
            }
            return _results;
          }).call(this));
        }
      }
      if (obj_phrase === "") {
        obj_phrase = missing;
        ready = false;
      }
      cmd_str += obj_phrase;
      like_str = (this.like || "").trim();
      if (this.verbs) {
        _ref = this.verbs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          verb = _ref[_i];
          if (['show', 'suppress'].indexOf(verb) > -1) {
            regarding_required = true;
          }
        }
      }
      if (regarding_required) {
        regarding_phrase = missing;
        if ((this.regarding != null) && this.regarding.length > 0) {
          regarding_phrase = angliciser(this.regarding);
        } else {
          ready = false;
        }
      }
      if (like_str) {
        cmd_str += " like '" + like_str + "'";
      }
      if (regarding_phrase) {
        cmd_str += " regarding " + regarding_phrase;
      }
      cmd_str += " .";
      this.ready = ready;
      return this.str = cmd_str;
    };

    GraphCommand.prototype.parse = function(cmd_str) {
      var cmd, parts, subj, verb;
      parts = cmd_str.split(" ");
      verb = parts[0];
      cmd = {};
      cmd.verbs = [verb];
      if (verb === 'load') {
        cmd.data_uri = parts[1];
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
    function GraphCommandLanguageCtrl(graph_ctrl) {
      this.graph_ctrl = graph_ctrl;
      this.execute = __bind(this.execute, this);
      this.prefixes = {};
    }

    GraphCommandLanguageCtrl.prototype.run = function(script) {
      var retval;
      this.graph_ctrl.before_running_command(this);
      console.log("script: ", script);
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
      retval = this.execute();
      this.graph_ctrl.after_running_command(this);
      return retval;
    };

    GraphCommandLanguageCtrl.prototype.run_one = function(cmd_spec) {
      var cmd;
      cmd = new GraphCommand(cmd_spec);
      cmd.prefixes = this.prefixes;
      return cmd.execute(this.graph_ctrl);
    };

    GraphCommandLanguageCtrl.prototype.execute = function() {
      var cmd_spec, run_once, _i, _len, _ref, _results;
      if (this.commands.length > 0 && typeof this.commands[0] === 'string' && this.commands[0].match(/^load /)) {
        console.log("initial execute", this.commands);
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
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cmd_spec = _ref[_i];
        if (cmd_spec) {
          _results.push(this.run_one(cmd_spec));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
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
}, "huvis_node_ctrl": function(exports, require, module) {
/*

  A graph showing just some nodes and just some edges from a large knowledge
  base can be specified by a series of operations which add, remove, link
  or label nodes and edges.  The goal is to provide an interface which
  supports performing these operations using either direct interaction or
  abstract specifiction, graphically provided.  Such a graph can be expressed
  as an ordered series of commands on sets of nodes and edges.

  <verb-phrase> <taxonomic-restriction> <name-restriction>;
  
  Examples of Commands:
    Graph and Label Groups like 'party';
    Graph Works like 'raven';
    Label People like 'atwood';
    Discard Orgs like 'oxford OR cambridge';

  Taxonomic Restriction:
     All | ( People(Writers|Others) |
             Organizations(Churches|Universities|Publishers|...) |
             Places(Continents|Oceans|Countries|Cities|Neighborhoods|...) |
             Works(Books|Poems|Essays|Articles|...) )

  Name Restriction (optional):
     like: <a string> | <a regex>    | <a boolean query>
       eg: atwood     |'oxf.*|cambr' | 'oxford OR cambridge'
      
  Action Specification:
    Graph|Ungraph
    Label|Unlabel
    Discard|Retrieve



  Command Add/Edit Interface Schematic:  
  
    +--------+ +-------+ +----------+ +------+ +------+  
    | writer | | other | | publisher| |church| |school|
    +--------+ +-------+ +----------+ +------+ +------+  
           \      /              \      /
          +--------+             +-----+      +--------+     +-------+
          | person |             | org | ...  | places | ... | works |
          +--------+             +-----+      +--------+     +-------+
                   \           /
                     \        /
                      +------+
                      | all  |
                      +------+
                     +--------+ 
               like: | atwood |  5 nodes
                     +--------+
                      |  ||  |
                     /        \
                   /     ||     \
          +--------+ +--------+ +--------+ 
          | graph  | | label  | | discard|
          +--------+ +--------+ +--------+ 
          |ungraph | |unlabel | |retrieve|
          +--------+ +--------+ +--------+ 


  Command Sequence Interface Schematic:

    Commands can be:
      reordered by dragging the thumb tabs: ||
      deleted by clicking the X.
      edited by clicking on their text
        or directly edited textually
      added by being directly typed
        <enter> executes and starts a new command

    X || Graph and Label Groups like 'party';
    X || Graph Works like 'raven';
    X || Label People like 'atwood'; 
    X || Discard Orgs like 'oxford OR cambridge';

    Typing:                 Produces:
      atwood<enter>           Graph All like 'atwood';
      not 'Mary'<enter>       Ungraph All like 'Mary';

  Graphical interaction with the graph itself is captured as a series of
  commands.  Clicking a node in the lariat equals "Graph Node <nodeid>."
 */

(function() {
  var NodeChooser, cmds;

  cmds = ["Graph Group like 'party'", "Discard Writers"];

  NodeChooser = (function() {
    function NodeChooser(graph, sets) {
      this.graph = graph;
      this.sets = sets;
    }

    NodeChooser.prototype.in_div = function(container) {
      var div, t;
      this.container = container;
      div = d3.select(container);
      t = div.append('table');
      t.style("z-index:3");
      t.style("bg-color:red");
      return t.data(['graph']);
    };

    return NodeChooser;

  })();

  window.NodeChooser = NodeChooser;

}).call(this);
}, "huvis_test": function(exports, require, module) {
/*
   thing = [{desc: "initial empty graph",
                expectations: [ 
                   ["this.graph_ctrl.nodes.length",7],
                   ["this.graph_ctrl.links_set.length",0]
                  ]
                },
               {desc: "choosing writer",
                script: "choose 'w:abdyma'",
                expectations: [
                   ["this.graph_ctrl.nodes.length",7],
                   ["this.graph_ctrl.unlinked_set.length",0],
                   ["this.graph_ctrl.links_set.length",6],
                  ]
                },
               {desc: "discarding writer should empty graph",
                script: "discard 'w:abdyma'",
                expectations: [
                   ["this.graph_ctrl.nodes.length",7],
                   ["this.graph_ctrl.unlinked_set.length",6],
                   ["this.graph_ctrl.discarded_set.length",1],
                   ["this.graph_ctrl.links_set.length",0],
                  ]
                },
               {desc: "choose AnglicanChurch; expect no effect",
                script:"choose '_:E'",
                expectations: [
                   ["this.graph_ctrl.discarded_set.length",1],
                   ["this.graph_ctrl.discarded_set[0].links_shown.length",0]
                  ]
               },
               {desc: "choose from discards should graph",
                script:"choose 'w:abdyma'",
                expectations: [
                   ["this.graph_ctrl.discarded_set.length",0],
                   ["this.graph_ctrl.graphed_set.length",7],
                   ["this.graph_ctrl.unlinked_set.length",0]
                  ]
               },
               {desc: "discard AnglicanChurch; expect it to be",
                script:"discard '_:E'",
                expectations: [
                   ["this.graph_ctrl.discarded_set.length",1],
                   ["this.graph_ctrl.discarded_set[0].links_shown.length",0]
                  ]
               },
               {desc: "choose AnglicanChurch; expect it to be graphed",
                script:"choose '_:E'",
                expectations: [
                   ["this.graph_ctrl.discarded_set.length",0],
                   ["this.graph_ctrl.nodes.get({'id':'_:E'}).links_shown.length",1]
                  ]
               }
              ]
 */

(function() {


}).call(this);
}, "huviz": function(exports, require, module) {(function() {
  var CommandController, DC_subject, Edge, FOAF_Group, FOAF_Person, FOAF_name, GraphCommandLanguageCtrl, GreenerTurtle, Huviz, MANY_SPACES_REGEX, NAME_SYNS, Node, OWL_Class, OWL_ObjectProperty, OWL_Thing, OntoViz, OntologicallyGrounded, Orlando, PEEKING_COLOR, Predicate, RDFS_label, RDF_a, RDF_literal, RDF_object, RDF_type, Socrata, TYPE_SYNS, Taxon, TaxonAbstract, UNDEFINED, XML_TAG_REGEX, default_node_radius_policy, dist_lt, distance, gcl, has_predicate_value, has_type, hpad, id_escape, ids_to_show, is_a_main_node, is_node_to_always_show, is_one_of, node_radius_policies, start_with_http, uri_to_js_id, wpad,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  gcl = require('graphcommandlanguage');

  CommandController = require('gclui').CommandController;

  Edge = require('edge').Edge;

  GraphCommandLanguageCtrl = require('graphcommandlanguage').GraphCommandLanguageCtrl;

  GreenerTurtle = require('greenerturtle').GreenerTurtle;

  Node = require('node').Node;

  Predicate = require('predicate').Predicate;

  TaxonAbstract = require('taxonabstract').TaxonAbstract;

  Taxon = require('taxon').Taxon;

  wpad = void 0;

  hpad = 10;

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

  RDF_a = 'a';

  RDFS_label = "http://www.w3.org/2000/01/rdf-schema#label";

  TYPE_SYNS = [RDF_type, RDF_a, 'rdf:type'];

  NAME_SYNS = [FOAF_name, RDFS_label, 'name'];

  uri_to_js_id = function(uri) {
    var e;
    try {
      return uri.match(/([\w\d\_\-]+)$/g)[0];
    } catch (_error) {
      e = _error;
      console.error("uri_to_js_id failed for [" + uri + "]");
      return null;
    }
  };

  XML_TAG_REGEX = /(<([^>]+)>)/ig;

  MANY_SPACES_REGEX = /\s{2,}/g;

  UNDEFINED = void 0;

  start_with_http = new RegExp("http", "ig");

  ids_to_show = start_with_http;

  PEEKING_COLOR = "darkgray";

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

  Huviz = (function() {
    var predicates;

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

    Huviz.prototype.edge_width = 1.8;

    Huviz.prototype.focused_mag = 1.9;

    Huviz.prototype.label_em = .7;

    Huviz.prototype.snippet_body_em = .7;

    Huviz.prototype.snippet_triple_em = .5;

    Huviz.prototype.line_length_min = 4;

    Huviz.prototype.link_distance = 100;

    Huviz.prototype.peeking_line_thicker = 4;

    Huviz.prototype.show_snippets_constantly = false;

    Huviz.prototype.charge = -193;

    Huviz.prototype.gravity = 0.025;

    Huviz.prototype.swayfrac = .2;

    Huviz.prototype.label_graphed = true;

    Huviz.prototype.snippet_count_on_edge_labels = true;

    Huviz.prototype.label_show_range = null;

    Huviz.prototype.graph_radius = 100;

    Huviz.prototype.shelf_radius = 0.9;

    Huviz.prototype.discard_radius = 200;

    Huviz.prototype.fisheye_radius = 100;

    Huviz.prototype.fisheye_zoom = 4.0;

    Huviz.prototype.selected_mag = 1.2;

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

    Huviz.prototype.search_regex = new RegExp("^$", "ig");

    Huviz.prototype.node_radius = 3.2;

    Huviz.prototype.mousedown_point = false;

    Huviz.prototype.discard_center = [0, 0];

    Huviz.prototype.lariat_center = [0, 0];

    Huviz.prototype.last_mouse_pos = [0, 0];

    predicates = {
      name: 'edges',
      children: [
        {
          name: 'a'
        }, {
          name: 'b'
        }, {
          name: 'c'
        }
      ]
    };

    Huviz.prototype.ensure_predicate = function(p_name) {
      var pobj, _i, _len, _ref;
      _ref = predicates.children;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        pobj = _ref[_i];
        if (pobj.name === p_name) {
          break;
        }
      }
      return predicates.children.push({
        name: p_name,
        children: []
      });
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

    Huviz.prototype.mousemove = function() {
      var d3_event, edge, pair, _i, _len, _ref, _ref1, _ref2;
      d3_event = this.mouse_receiver[0][0];
      this.last_mouse_pos = d3.mouse(d3_event);
      if (!this.dragging && this.mousedown_point && this.focused_node && distance(this.last_mouse_pos, this.mousedown_point) > this.drag_dist_threshold) {
        this.dragging = this.focused_node;
        if (this.dragging.state !== this.graphed_set) {
          this.graphed_set.acquire(this.dragging);
        }
      }
      if (this.dragging) {
        this.force.resume();
        this.move_node_to_point(this.dragging, this.last_mouse_pos);
      }
      if (this.peeking_node != null) {
        if ((this.focused_node != null) && this.focused_node !== this.peeking_node) {
          pair = [this.peeking_node.id, this.focused_node.id];
          _ref = this.peeking_node.links_shown;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            edge = _ref[_i];
            if ((_ref1 = edge.source.id, __indexOf.call(pair, _ref1) >= 0) && (_ref2 = edge.target.id, __indexOf.call(pair, _ref2) >= 0)) {
              edge.focused = true;
              this.print_edge(edge);
            } else {
              edge.focused = false;
            }
          }
        }
      }
      return this.tick();
    };

    Huviz.prototype.mousedown = function() {
      var d3_event;
      d3_event = this.mouse_receiver[0][0];
      this.mousedown_point = d3.mouse(d3_event);
      return this.last_mouse_pos = this.mousedown_point;
    };

    Huviz.prototype.mouseup = function() {
      var d3_event, drag_dist, point;
      d3_event = this.mouse_receiver[0][0];
      this.mousedown_point = false;
      point = d3.mouse(d3_event);
      if (this.dragging) {
        this.move_node_to_point(this.dragging, point);
        if (this.in_discard_dropzone(this.dragging)) {
          this.run_verb_on_object('discard', this.dragging);
        } else if (this.in_disconnect_dropzone(this.dragging)) {
          this.run_verb_on_object('shelve', this.dragging);
        } else if (this.dragging.links_shown.length === 0) {
          this.run_verb_on_object('choose', this.dragging);
        } else if (this.nodes_pinnable) {
          this.dragging.fixed = !this.dragging.fixed;
        }
        this.dragging = false;
        return;
      }
      if (this.nodes_pinnable && this.focused_node && this.focused_node.fixed && this.focused_node.state === this.graphed_set) {
        this.focused_node.fixed = false;
      }
      if (this.focused_node) {
        this.perform_current_command(this.focused_node);
        this.tick();
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
        return this.restart();
      }
    };

    Huviz.prototype.perform_current_command = function(node) {
      var cmd;
      if (this.gclui.ready_to_perform()) {
        cmd = new gcl.GraphCommand({
          verbs: this.gclui.engaged_verbs,
          subjects: [node]
        });
        this.show_state_msg(cmd.as_msg());
        this.gclc.run(cmd);
        this.hide_state_msg();
        return this.gclui.push_command(cmd);
      } else {
        return this.toggle_selected(node);
      }
    };

    Huviz.prototype.updateWindow = function() {
      this.get_window_width();
      this.get_window_height();
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

    Huviz.prototype.draw_circle = function(cx, cy, radius, strclr, filclr) {
      if (strclr) {
        this.ctx.strokeStyle = strclr || "blue";
      }
      if (filclr) {
        this.ctx.fillStyle = filclr || "blue";
      }
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
      this.ctx.closePath();
      if (strclr) {
        this.ctx.stroke();
      }
      if (filclr) {
        return this.ctx.fill();
      }
    };

    Huviz.prototype.draw_line = function(x1, y1, x2, y2, clr) {
      this.ctx.strokeStyle = clr || red;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.closePath();
      return this.ctx.stroke();
    };

    Huviz.prototype.draw_curvedline = function(x1, y1, x2, y2, sway_inc, clr, num_contexts, line_width, edge) {
      var ang, check_range, ctrl_angle, orig_angle, pdist, sway, xctrl, xhndl, xmid, yctrl, yhndl, ymid;
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
      this.ctx.strokeStyle = clr || red;
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
      return this.draw_circle(xhndl, yhndl, line_width / 2, clr);
    };

    Huviz.prototype.draw_disconnect_dropzone = function() {
      this.ctx.save();
      this.ctx.lineWidth = this.graph_radius * 0.1;
      this.draw_circle(this.lariat_center[0], this.lariat_center[1], this.graph_radius, "lightgreen");
      return this.ctx.restore();
    };

    Huviz.prototype.draw_discard_dropzone = function() {
      this.ctx.save();
      this.ctx.lineWidth = this.discard_radius * 0.1;
      this.draw_circle(this.discard_center[0], this.discard_center[1], this.discard_radius, "", "salmon");
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
      this.nodes = SortedSet().sort_on("id").named("All");
      this.nodes.docs = "All Nodes are in this set, regardless of state";
      this.embryonic_set = SortedSet().sort_on("id").named("embryo").isFlag();
      this.embryonic_set.docs = "Nodes which are not yet complete are 'embryonic' and not yet in 'nodes'.";
      this.chosen_set = SortedSet().named("chosen").isFlag().sort_on("id");
      this.chosen_set.docs = "Nodes which the user has individually 'chosen' to graph by clicking or dragging them.";
      this.chosen_set.comment = "This concept should perhaps be retired now that selected_set is being maintainted.";
      this.selected_set = SortedSet().named("selected").isFlag().sort_on("id");
      this.selected_set.docs = "Nodes which have been 'selected' using the class picker ie which are highlighted.";
      this.shelved_set = SortedSet().sort_on("name").named("shelved").isState();
      this.shelved_set.docs = "Nodes which are on the surrounding 'shelf'.";
      this.discarded_set = SortedSet().sort_on("name").named("discarded").isState();
      this.discarded_set.docs = "Nodes which have been discarded so they will not be included in graphs." + (this.hidden_set = SortedSet().sort_on("id").named("hidden").isState());
      this.hidden_set.docs = "Nodes which are invisible but can be pulled into graphs by other nodes.";
      this.graphed_set = SortedSet().sort_on("id").named("graphed").isState();
      this.graphed_set.docs = "Nodes which are included in the central graph.";
      this.links_set = SortedSet().sort_on("id").named("shown").isFlag();
      this.links_set.docs = "Links which are shown.";
      this.labelled_set = SortedSet().named("labelled").isFlag().sort_on("id");
      this.labelled_set.docs = "Nodes which have their labels permanently shown.";
      this.predicate_set = SortedSet().named("predicate").isFlag().sort_on("id");
      this.context_set = SortedSet().named("context").isFlag().sort_on("id");
      this.context_set.docs = "The set of quad contexts.";
      return this.selectable_sets = {
        nodes: this.nodes,
        chosen_set: this.chosen_set,
        selected_set: this.selected_set,
        shelved_set: this.shelved_set,
        discarded_set: this.discarded_set,
        hidden_set: this.hidden_set,
        graphed_set: this.graphed_set,
        labelled_set: this.labelled_set
      };
    };

    Huviz.prototype.update_all_counts = function() {
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

    Huviz.prototype.get_or_create_taxon = function(taxon_id, abstract) {
      var parent, parent_lid, taxon;
      if (this.taxonomy[taxon_id] == null) {
        if (abstract) {
          taxon = new TaxonAbstract(taxon_id);
          this.gclui.taxon_picker.set_abstract(taxon_id);
        } else {
          taxon = new Taxon(taxon_id);
        }
        this.taxonomy[taxon_id] = taxon;
        parent_lid = this.ontology.subClassOf[taxon_id] || this.HHH[taxon_id] || 'Thing';
        if (parent_lid != null) {
          parent = this.get_or_create_taxon(parent_lid, false);
          taxon.register_superclass(parent);
        }
        this.gclui.add_newnodeclass(taxon_id, parent_lid, void 0, taxon);
      }
      return this.taxonomy[taxon_id];
    };

    Huviz.prototype.pick_taxon = function(id, hier) {
      var _ref;
      hier = (_ref = hier != null) != null ? _ref : {
        hier: true
      };
      if (hier) {
        this.gclui.taxon_picker.collapse_by_id(id);
      }
      $("#" + id).trigger("click");
      if (hier) {
        return this.gclui.taxon_picker.expand_by_id(id);
      }
    };

    Huviz.prototype["do"] = function(args) {
      var cmd;
      cmd = new gcl.GraphCommand(args);
      return this.gclc.run(cmd);
    };

    Huviz.prototype.reset_data = function() {
      if (this.discarded_set.length) {
        this["do"]({
          verbs: ['shelve'],
          sets: [this.discarded_set]
        });
      }
      if (this.graphed_set.length) {
        this["do"]({
          verbs: ['shelve'],
          sets: [this.graphed_set]
        });
      }
      if (this.hidden_set.length) {
        this["do"]({
          verbs: ['shelve'],
          sets: [this.hidden_set]
        });
      }
      if (this.selected_set.length) {
        this["do"]({
          verbs: ['unselect'],
          sets: [this.selected_set]
        });
      }
      return this.gclui.select_the_initial_set();
    };

    Huviz.prototype.reset_graph = function() {
      this.G = {};
      this.init_sets();
      this.init_gclc();
      this.force.nodes(this.nodes);
      d3.select(".link").remove();
      d3.select(".node").remove();
      d3.select(".lariat").remove();
      this.node = this.svg.selectAll(".node");
      this.link = this.svg.selectAll(".link");
      this.lariat = this.svg.selectAll(".lariat");
      this.link = this.link.data(this.links_set);
      this.link.exit().remove();
      this.node = this.node.data(this.nodes);
      this.node.exit().remove();
      return this.force.start();
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

    Huviz.prototype.init_node_radius_policy = function() {
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
      return this.node_radius * ((d.selected == null) && 1 || this.selected_mag);
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

    Huviz.prototype.find_focused_node_or_edge = function() {
      var closest, closest_point, focus_threshold, new_focused_edge, new_focused_idx, new_focused_node, svg_node;
      if (this.dragging) {
        return;
      }
      new_focused_node = void 0;
      new_focused_edge = void 0;
      new_focused_idx = void 0;
      focus_threshold = this.focus_radius * 3;
      closest = this.width;
      closest_point = void 0;
      this.nodes.forEach((function(_this) {
        return function(d, i) {
          var n_dist;
          n_dist = distance(d.fisheye || d, _this.last_mouse_pos);
          if (n_dist < closest) {
            closest = n_dist;
            closest_point = d.fisheye || d;
          }
          if (n_dist <= focus_threshold) {
            new_focused_node = d;
            focus_threshold = n_dist;
            return new_focused_idx = i;
          }
        };
      })(this));
      this.links_set.forEach((function(_this) {
        return function(e, i) {
          var e_dist, new_focused_edge_idx;
          if (e.handle != null) {
            e_dist = distance(e.handle, _this.last_mouse_pos);
            if (e_dist < closest) {
              closest = e_dist;
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
      if (new_focused_edge != null) {
        new_focused_node = void 0;
      }
      if (closest_point != null) {
        if (this.draw_circle_around_focused) {
          this.draw_circle(closest_point.x, closest_point.y, this.node_radius * 3, "red");
        }
      }
      if (this.focused_node !== new_focused_node) {
        if (this.focused_node) {
          if (this.use_svg) {
            d3.select(".focused_node").classed("focused_node", false);
          }
          this.focused_node.focused_node = false;
        }
        if (new_focused_node != null) {
          new_focused_node.focused_node = true;
          if (this.use_svg) {
            svg_node = node[0][new_focused_idx];
            d3.select(svg_node).classed("focused_node", true);
          }
        }
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
      }
      this.focused_node = new_focused_node;
      this.focused_edge = new_focused_edge;
      return this.adjust_cursor();
    };

    Huviz.prototype.showing_links_to_cursor_map = {
      all: 'not-allowed',
      some: 'all-scroll',
      none: 'pointer'
    };

    Huviz.prototype.adjust_cursor = function() {
      var next;
      if (this.focused_node) {
        next = this.showing_links_to_cursor_map[this.focused_node.showing_links];
      } else {
        next = 'default';
      }
      return $("body").css("cursor", next);
    };

    Huviz.prototype.position_nodes = function() {
      var n_nodes;
      n_nodes = this.nodes.length || 0;
      return this.nodes.forEach((function(_this) {
        return function(node, i) {
          if (_this.dragging === node) {
            _this.move_node_to_point(node, _this.last_mouse_pos);
          }
          if (!_this.graphed_set.has(node)) {
            return;
          }
          return node.fisheye = _this.fisheye(node);
        };
      })(this));
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
            this.draw_curvedline(e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y, sway, e.color, e.contexts.length, line_width, e);
            _results1.push(sway++);
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    Huviz.prototype.draw_edges = function() {
      var dx, dy;
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
          var rad;
          rad = 2 * Math.PI * i / num;
          node.rad = rad;
          node.x = cx + Math.sin(rad) * radius;
          node.y = cy + Math.cos(rad) * radius;
          node.fisheye = _this.fisheye(node);
          if (_this.use_canvas) {
            _this.draw_circle(node.fisheye.x, node.fisheye.y, _this.calc_node_radius(node), node.color || "yellow", node.color || "black");
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
            var fill_color, node_radius, stroke_color;
            d.fisheye = _this.fisheye(d);
            if (_this.use_canvas) {
              node_radius = _this.calc_node_radius(d);
              stroke_color = d.color || 'yellow';
              fill_color = d.color || 'black';
              if (d.chosen != null) {
                stroke_color = 'black';
              }
              _this.draw_circle(d.fisheye.x, d.fisheye.y, node_radius, stroke_color, fill_color);
            }
            if (_this.use_webgl) {
              return _this.mv_node(d.gl, d.fisheye.x, d.fisheye.y);
            }
          };
        })(this));
      }
    };

    Huviz.prototype.should_show_label = function(node) {
      return node.labelled || node.focused_edge || (this.label_graphed && node.state === this.graphed_set) || dist_lt(this.last_mouse_pos, node, this.label_show_range) || ((node.name != null) && node.name.match(this.search_regex));
    };

    Huviz.prototype.draw_labels = function() {
      var focused_font, focused_font_size, label_node, unfocused_font;
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
        label_node = (function(_this) {
          return function(node) {
            var ctx, flip, radians, textAlign;
            if (!_this.should_show_label(node)) {
              return;
            }
            ctx = _this.ctx;
            if (node.focused_node || (node.focused_edge != null)) {
              ctx.fillStyle = node.color;
              ctx.font = focused_font;
            } else {
              ctx.fillStyle = "black";
              ctx.font = unfocused_font;
            }
            if (node.fisheye == null) {
              return;
            }
            if (!_this.graphed_set.has(node) && _this.draw_lariat_labels_rotated) {
              radians = node.rad;
              flip = radians > Math.PI && radians < 2 * Math.PI;
              textAlign = 'left';
              if (flip) {
                radians = radians - Math.PI;
                textAlign = 'right';
              }
              ctx.save();
              ctx.translate(node.fisheye.x, node.fisheye.y);
              ctx.rotate(-1 * radians + Math.PI / 2);
              ctx.textAlign = textAlign;
              ctx.fillText("  " + node.name, 0, 0);
              return ctx.restore();
            } else {
              return ctx.fillText("  " + node.name, node.fisheye.x, node.fisheye.y);
            }
          };
        })(this);
        this.graphed_set.forEach(label_node);
        this.shelved_set.forEach(label_node);
        return this.discarded_set.forEach(label_node);
      }
    };

    Huviz.prototype.clear_canvas = function() {
      return this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };

    Huviz.prototype.blank_screen = function() {
      if (this.use_canvas || this.use_webgl) {
        return this.clear_canvas();
      }
    };

    Huviz.prototype.auto_change_verb = function() {
      if (this.focused_node) {
        return this.gclui.auto_change_verb_if_warranted(this.focused_node);
      }
    };

    Huviz.prototype.tick = function() {
      this.ctx.lineWidth = this.edge_width;
      this.find_focused_node_or_edge();
      this.auto_change_verb();
      this.update_snippet();
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
      return this.draw_edge_labels();
    };

    Huviz.prototype.draw_edge_labels = function() {
      if (this.focused_edge != null) {
        return this.draw_edge_label(this.focused_edge);
      }
    };

    Huviz.prototype.draw_edge_label = function(edge) {
      var ctx, label;
      ctx = this.ctx;
      label = edge.predicate.lid;
      if (this.snippet_count_on_edge_labels) {
        if (edge.contexts != null) {
          if (edge.contexts.length) {
            label += " (" + edge.contexts.length + ")";
          }
        }
      }
      ctx.fillStyle = this.shadow_color;
      ctx.fillText(" " + label, edge.handle.x + this.edge_x_offset + this.shadow_offset, edge.handle.y + this.shadow_offset);
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
      this.state_msg_box.html("<br><br>" + txt);
      return $("body").css("cursor", "wait");
    };

    Huviz.prototype.hide_state_msg = function() {
      this.state_msg_box.hide();
      return $("body").css("cursor", "default");
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
      return this.force.start();
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

    Huviz.prototype.DEPRECATED_add_to = function(itm, set) {
      var found;
      if (isArray(set)) {
        return add_to_array(itm, set, cmp_on_id);
      }
      if (typeof itm.id === "undefined") {
        throw new Error("add_to() requires itm to have an .id");
      }
      found = set[itm.id];
      if (!found) {
        set[itm.id] = itm;
      }
      return set[itm.id];
    };

    Huviz.prototype.DEPRECATED_remove_from = function(doomed, set) {
      if (typeof doomed.id === "undefined") {
        throw new Error("remove_from() requires doomed to have an .id");
      }
      if (isArray(set)) {
        return remove_from_array(doomed, set);
      }
      if (set[doomed.id]) {
        delete set[doomed.id];
      }
      return set;
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
      var parent_lid, pred_lid;
      pred_lid = uri_to_js_id(pid);
      if (this.my_graph.predicates[pred_lid] == null) {
        if (this.ontology.subPropertyOf[pred_lid] != null) {
          parent_lid = this.ontology.subPropertyOf[pred_lid];
        } else {
          parent_lid = "anything";
        }
        this.my_graph.predicates[pred_lid] = [];
        this.ensure_predicate_lineage(parent_lid);
        return this.fire_newpredicate_event(pid, pred_lid, parent_lid);
      }
    };

    Huviz.prototype.fire_newpredicate_event = function(pred_uri, pred_lid, parent_lid) {
      return window.dispatchEvent(new CustomEvent('newpredicate', {
        detail: {
          pred_uri: pred_uri,
          pred_lid: pred_lid,
          parent_lid: parent_lid
        },
        bubbles: true,
        cancelable: true
      }));
    };

    Huviz.prototype.make_qname = function(uri) {
      return uri;
    };

    Huviz.prototype.last_quad = {};

    Huviz.prototype.object_value_types = {};

    Huviz.prototype.unique_pids = {};

    Huviz.prototype.add_quad = function(quad) {
      var cntx_n, ctxid, edge, edge_e, is_type, newsubj, obj_n, pid, pred_n, sid, subj, subj_lid, subj_n;
      sid = quad.s;
      pid = this.make_qname(quad.p);
      ctxid = quad.g || this.DEFAULT_CONTEXT;
      subj_lid = uri_to_js_id(sid);
      this.object_value_types[quad.o.type] = 1;
      this.unique_pids[pid] = 1;
      newsubj = false;
      subj = null;
      if (this.my_graph.subjects[sid] == null) {
        newsubj = true;
        subj = {
          id: sid,
          name: subj_lid,
          predicates: {}
        };
        this.my_graph.subjects[sid] = subj;
      } else {
        subj = this.my_graph.subjects[sid];
      }
      this.ensure_predicate_lineage(pid);
      subj_n = this.get_or_create_node_by_id(sid);
      pred_n = this.get_or_create_predicate_by_id(pid);
      cntx_n = this.get_or_create_context_by_id(ctxid);
      if (subj.predicates[pid] == null) {
        subj.predicates[pid] = {
          objects: []
        };
      }
      if (quad.o.type === RDF_object) {
        obj_n = this.get_or_create_node_by_id(quad.o.value);
        is_type = is_one_of(pid, TYPE_SYNS);
        if (is_type) {
          if (this.try_to_set_node_type(subj_n, quad.o.value)) {
            this.develop(subj_n);
          }
        } else {
          edge = this.get_or_create_Edge(subj_n, obj_n, pred_n, cntx_n);
          this.infer_edge_end_types(edge);
          edge.register_context(cntx_n);
          edge.color = this.gclui.predicate_picker.get_color_forId_byName(pred_n.lid, 'showing');
          edge_e = this.add_edge(edge);
          this.develop(obj_n);
        }
      } else {
        if (subj_n.embryo && is_one_of(pid, NAME_SYNS)) {
          subj_n.name = quad.o.value.replace(/^\s+|\s+$/g, '');
          this.develop(subj_n);
        }
      }

      /*
      try
        last_sid = @last_quad.s
      catch e
        last_sid = ""       
      if last_sid and last_sid isnt quad.s
         *if @last_quad
        @fire_nextsubject_event @last_quad,quad
       */
      return this.last_quad = quad;
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

    Huviz.prototype.get_or_create_Edge = function(subj_n, obj_n, pred_n) {
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

    Huviz.prototype.try_to_set_node_type = function(node, type_uri) {
      var type_lid;
      type_lid = uri_to_js_id(type_uri);

      /*
      if node.type?
        if node.type isnt type_lid
          console.warn "#{node.lid} already #{node.type} now: #{type_lid} "
      else
        console.info "  try_to_set_node_type",node.lid,"isa",type_lid
       */
      node.type = type_lid;
      return true;
    };

    Huviz.prototype.report_every = 100;

    Huviz.prototype.parseAndShowTTLStreamer = function(data, textStatus) {
      var context, every, frame, obj, parse_start_time, pred, pred_id, quad_count, subj_uri, _i, _len, _ref, _ref1, _ref2;
      parse_start_time = new Date();
      context = "http://universal";
      if ((GreenerTurtle != null) && this.turtle_parser === 'GreenerTurtle') {
        this.G = new GreenerTurtle().parse(data, "text/turtle");
        console.log("GreenTurtle");
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
                this.show_state_msg("parsed relation " + quad_count);
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
      return this.dump_stats();
    };

    Huviz.prototype.dump_stats = function() {
      console.log("object_value_types:", this.object_value_types);
      return console.log("unique_pids:", this.unique_pids);
    };

    Huviz.prototype.parseAndShowTurtle = function(data, textStatus) {
      var key, msg, parse_end_time, parse_start_time, parse_time, parser, prop_name, prop_obj, show_end_time, show_start_time, show_time, siz, value, _i, _len, _ref;
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
      $("body").css("cursor", "default");
      return $("#status").text("");
    };

    Huviz.prototype.choose_everything = function() {
      var cmd;
      cmd = new gcl.GraphCommand({
        verbs: ['choose'],
        classes: ['Thing']
      });
      this.gclc.run(cmd);
      this.gclui.push_command(cmd);
      return this.tick();
    };

    Huviz.prototype.remove_framing_quotes = function(s) {
      return s.replace(/^\"/, "").replace(/\"$/, "");
    };

    Huviz.prototype.parseAndShowNQStreamer = function(uri) {
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
            if (quad_count % 100 === 0) {
              _this.show_state_msg("parsed relation " + quad_count);
            }
            q = parseQuadLine(e.data.line);
            if (q) {
              q.s = q.s.raw;
              q.p = q.p.raw;
              q.g = q.g.raw;
              q.o = {
                type: owl_type_map[q.o.type],
                value: _this.remove_framing_quotes(q.o.toString())
              };
              _this.add_quad(q);
            }
          } else if (e.data.event === 'start') {
            msg = "starting to split " + uri;
          } else if (e.data.event === 'finish') {
            msg = "finished_splitting " + uri;
            _this.show_state_msg("done loading");
            document.dispatchEvent(new CustomEvent("dataset-loaded", {
              detail: uri
            }));
            _this.fire_fileloaded_event();
          } else {
            msg = "unrecognized NQ event:" + e.data.event;
          }
          if (msg != null) {
            return console.log(msg);
          }
        };
      })(this));
      return worker.postMessage({
        uri: uri
      });
    };

    Huviz.prototype.DUMPER = function(data) {
      return console.log(data);
    };

    Huviz.prototype.fetchAndShow = function(url) {
      var the_parser;
      this.show_state_msg("fetching " + url);
      if (url.match(/.ttl/)) {
        the_parser = this.parseAndShowTTLStreamer;
      } else if (url.match(/.nq/)) {
        the_parser = this.parseAndShowNQ;
        this.parseAndShowNQStreamer(url);
        return;
      } else if (url.match(/.json/)) {
        the_parser = this.parseAndShowJSON;
      }
      return $.ajax({
        url: url,
        success: (function(_this) {
          return function(data, textStatus) {
            the_parser(data, textStatus);
            _this.fire_fileloaded_event();
            return _this.hide_state_msg();
          };
        })(this),
        error: function(jqxhr, textStatus, errorThrown) {
          console.log(url, errorThrown);
          return $("#status").text(errorThrown + " while fetching " + url);
        }
      });
    };

    Huviz.prototype.show_and_hide_links_from_node = function(d) {
      this.show_links_from_node(d);
      return this.hide_links_from_node(d);
    };

    Huviz.prototype.get_window_width = function(pad) {
      pad = pad || hpad;
      return this.width = (window.innerWidth || document.documentElement.clientWidth || document.clientWidth) - pad;
    };

    Huviz.prototype.get_window_height = function(pad) {
      pad = pad || hpad;
      return this.height = (window.innerHeight || document.documentElement.clientHeight || document.clientHeight) - pad;
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

    Huviz.prototype.remove_link = function(e) {
      if (this.links_set.indexOf(e) === -1) {
        return;
      }
      this.remove_from(e, e.source.links_shown);
      this.remove_from(e, e.target.links_shown);
      this.links_set.remove(e);
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
      return this.restart();
    };

    Huviz.prototype.update_state = function(node) {
      if (node.state === this.graphed_set && node.links_shown.length === 0) {
        this.shelved_set.acquire(node);
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
      return this.restart();
    };

    Huviz.prototype.get_or_create_predicate_by_id = function(sid) {
      var obj_id, obj_n;
      obj_id = this.make_qname(sid);
      obj_n = this.predicate_set.get_by('id', obj_id);
      if (obj_n == null) {
        obj_n = new Predicate(obj_id);
        this.predicate_set.add(obj_n);
      }
      return obj_n;
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

    Huviz.prototype.get_or_create_node_by_id = function(sid) {
      var obj_id, obj_n;
      obj_id = this.make_qname(sid);
      obj_n = this.nodes.get_by('id', obj_id);
      if (obj_n == null) {
        obj_n = this.embryonic_set.get_by('id', obj_id);
      }
      if (obj_n == null) {
        obj_n = new Node(obj_id, this.use_lid_as_node_name);
        if (obj_n.id == null) {
          alert("new Node('" + sid + "') has no id");
        }
        this.embryonic_set.add(obj_n);
      }
      return obj_n;
    };

    Huviz.prototype.develop = function(node) {
      if ((node.embryo != null) && this.is_ready(node)) {
        return this.hatch(node);
      }
    };

    Huviz.prototype.hatch = function(node) {
      var new_set, start_point;
      node.lid = uri_to_js_id(node.id);
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
      this.tick();
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
      this.tick();
      return true;
    };

    Huviz.prototype.label = function(branded) {
      this.labelled_set.add(branded);
      return this.tick();
    };

    Huviz.prototype.unlabel = function(anonymized) {
      this.labelled_set.remove(anonymized);
      return this.tick();
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
      this.unlink(goner);
      this.discarded_set.acquire(goner);
      shown = this.update_showing_links(goner);
      this.unselect(goner);
      return goner;
    };

    Huviz.prototype.undiscard = function(prodigal) {
      this.shelved_set.acquire(prodigal);
      this.update_showing_links(prodigal);
      this.update_state(prodigal);
      return prodigal;
    };

    Huviz.prototype.shelve = function(goner) {
      var shownness;
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
      var shownness;
      this.chosen_set.add(chosen);
      this.graphed_set.acquire(chosen);
      this.show_links_from_node(chosen);
      this.show_links_to_node(chosen);
      if (chosen.links_shown) {
        this.graphed_set.acquire(chosen);
        chosen.showing_links = "all";
      } else {
        console.error(chosen.lid, "was found to have no links_shown so: @unlink_set.acquire(chosen)", chosen);
        this.shelved_set.acquire(chosen);
      }
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

    Huviz.prototype.hide = function(hidee) {
      var shownness;
      this.chosen_set.remove(hidee);
      this.hidden_set.acquire(hidee);
      this.selected_set.remove(hidee);
      hidee.unselect();
      this.hide_node_links(hidee);
      this.update_state(hidee);
      return shownness = this.update_showing_links(hidee);
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
        return this.recolor_node(node);
      }
    };

    Huviz.prototype.recolor_node = function(node) {
      var state;
      state = (node.selected != null) && "emphasizing" || "showing";
      return node.color = this.gclui.taxon_picker.get_color_forId_byName(node.type, state);
    };

    Huviz.prototype.recolor_nodes = function() {
      var node, _i, _len, _ref, _results;
      _ref = this.nodes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push(this.recolor_node(node));
      }
      return _results;
    };

    Huviz.prototype.toggle_selected = function(node) {
      if (node.selected != null) {
        return this.unselect(node);
      } else {
        return this.select(node);
      }
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
          response: snippet_text
        });
      } else {
        d3.xhr(url, callback);
      }
      return "got it";
    };

    Huviz.prototype.clear_snippets = function() {
      this.currently_printed_snippets = {};
      if (this.snippet_box) {
        return this.snippet_box.html("");
      }
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
        make_callback = function(context_no, edge, context) {
          return function(err, data) {
            var snippet_id, snippet_text;
            snippet_text = me.remove_tags(data.response);
            snippet_id = context.id;
            snippet_js_key = me.get_snippet_js_key(snippet_id);
            if (me.currently_printed_snippets[snippet_js_key] == null) {
              me.currently_printed_snippets[snippet_js_key] = [];
            }
            me.currently_printed_snippets[snippet_js_key].push(edge);
            me.snippet_db[snippet_js_key] = snippet_text;
            me.printed_edge = edge;
            return me.push_snippet({
              edge: edge,
              pred_id: edge.predicate.lid,
              pred_name: edge.predicate.name,
              context_id: context.id,
              snippet_text: snippet_text,
              no: context_no,
              snippet_js_key: snippet_js_key
            });
          };
        };
        _results.push(this.get_snippet(context.id, make_callback(context_no, edge, context)));
      }
      return _results;
    };

    Huviz.prototype.print = function(node) {
      var edge, _i, _len, _ref, _results;
      this.clear_snippets();
      _ref = node.links_shown;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        _results.push(this.print_edge(edge));
      }
      return _results;
    };

    Huviz.prototype.redact = function(node) {
      return node.links_shown.forEach((function(_this) {
        return function(edge, i) {
          return _this.remove_snippet(edge.id);
        };
      })(this));
    };

    Huviz.prototype.show_edge_regarding = function(node, predicate_lid) {
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
        return this.force.alpha(0.1);
      }
    };

    Huviz.prototype.suppress_edge_regarding = function(node, predicate_lid) {
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
        return this.force.alpha(0.1);
      }
    };

    Huviz.prototype.update_history = function() {
      var hash, n_chosen, the_state, the_title, the_url;
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

    Huviz.prototype.init_gclc = function() {
      var pid, _i, _len, _ref, _results;
      this.gclc = new GraphCommandLanguageCtrl(this);
      if (this.gclui == null) {
        this.gclui = new CommandController(this, d3.select("#gclui")[0][0], this.hierarchy);
      }
      window.addEventListener('showgraph', this.register_gclc_prefixes);
      window.addEventListener('newpredicate', this.gclui.handle_newpredicate);
      TYPE_SYNS.forEach((function(_this) {
        return function(pred_id, i) {
          return _this.gclui.ignore_predicate(pred_id);
        };
      })(this));
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

    Huviz.prototype.predicates_to_ignore = ["anything"];

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
      var dialog_args, dlg, my_position, snip_div;
      if (this.snippet_box) {
        snip_div = this.snippet_box.append('div').attr('class', 'snippet');
        snip_div.html(msg);
        my_position = this.get_next_snippet_position();
        dialog_args = {
          maxHeight: this.snippet_size,
          title: obj.context_id,
          position: {
            my: my_position,
            at: "left top",
            of: window
          },
          close: (function(_this) {
            return function(event, ui) {
              delete _this.snippet_positions_filled[my_position];
              return delete _this.currently_printed_snippets[event.target.id];
            };
          })(this)
        };
        dlg = $(snip_div).dialog(dialog_args);
        return dlg[0][0].setAttribute("id", obj.snippet_js_key);
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

    Huviz.prototype.run_verb_on_object = function(verb, subject) {
      var cmd;
      cmd = new gcl.GraphCommand({
        verbs: [verb],
        subjects: [this.get_handle(subject)]
      });
      this.show_state_msg(cmd.as_msg());
      this.gclc.run(cmd);
      return this.gclui.push_command(cmd);
    };

    Huviz.prototype.before_running_command = function() {
      $("body").css("cursor", "wait");
      $("body").css("background-color", "red");
      return toggle_suspend_updates(true);
    };

    Huviz.prototype.after_running_command = function() {
      toggle_suspend_updates(false);
      $("body").css("cursor", "default");
      $("body").css("background-color", "white");
      return this.update_all_counts();
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
      this.hide_state_msg();
      return console.info(this.state_msg_box);
    };

    Huviz.prototype.init_ontology = function() {
      this.create_taxonomy();
      return this.ontology = {
        subClassOf: {},
        subPropertyOf: {},
        domain: {},
        range: {}
      };
    };

    function Huviz() {
      this.update_graph_settings = __bind(this.update_graph_settings, this);
      this.register_gclc_prefixes = __bind(this.register_gclc_prefixes, this);
      this.suppress_edge_regarding = __bind(this.suppress_edge_regarding, this);
      this.show_edge_regarding = __bind(this.show_edge_regarding, this);
      this.redact = __bind(this.redact, this);
      this.print = __bind(this.print, this);
      this.peek = __bind(this.peek, this);
      this.unselect = __bind(this.unselect, this);
      this.select = __bind(this.select, this);
      this.hide = __bind(this.hide, this);
      this.unchoose = __bind(this.unchoose, this);
      this.choose = __bind(this.choose, this);
      this.shelve = __bind(this.shelve, this);
      this.update_searchterm = __bind(this.update_searchterm, this);
      this.DUMPER = __bind(this.DUMPER, this);
      this.parseAndShowTurtle = __bind(this.parseAndShowTurtle, this);
      this.parseAndShowTTLStreamer = __bind(this.parseAndShowTTLStreamer, this);
      this.tick = __bind(this.tick, this);
      this.get_gravity = __bind(this.get_gravity, this);
      this.get_charge = __bind(this.get_charge, this);
      this.updateWindow = __bind(this.updateWindow, this);
      this.mouseup = __bind(this.mouseup, this);
      this.mousedown = __bind(this.mousedown, this);
      this.mousemove = __bind(this.mousemove, this);
      var search_input, the_Huviz;
      this.init_ontology();
      this.off_center = false;
      this.create_state_msg_box();
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
      this.svg = d3.select("#vis").append("svg").attr("width", this.width).attr("height", this.height).attr("position", "absolute");
      this.svg.append("rect").attr("width", this.width).attr("height", this.height);
      if (!d3.select("#viscanvas")[0][0]) {
        d3.select("body").append("div").attr("id", "viscanvas");
      }
      this.viscanvas = d3.select("#viscanvas").append("canvas").attr("width", this.width).attr("height", this.height);
      this.canvas = this.viscanvas[0][0];
      this.mouse_receiver = this.viscanvas;
      this.updateWindow();
      this.ctx = this.canvas.getContext("2d");
      this.reset_graph();
      this.cursor = this.svg.append("circle").attr("r", this.label_show_range).attr("transform", "translate(" + this.cx + "," + this.cy + ")").attr("class", "cursor");
      the_Huviz = this;
      this.mouse_receiver.on("mousemove", this.mousemove).on("mousedown", this.mousedown).on("mouseup", this.mouseup);
      this.restart();
      this.set_search_regex("");
      search_input = document.getElementById('search');
      if (search_input) {
        search_input.addEventListener("input", this.update_searchterm);
      }
      window.addEventListener("resize", this.updateWindow);
      $("#tabs").tabs({
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

    Huviz.prototype.goto_tab = function(tab_idx) {
      return $('#tabs').tabs({
        active: tab_idx
      });
    };

    Huviz.prototype.update_fisheye = function() {
      this.label_show_range = this.link_distance * 1.1;
      this.focus_radius = this.label_show_range;
      this.fisheye = d3.fisheye.circular().radius(this.fisheye_radius).distortion(this.fisheye_zoom);
      return this.force.linkDistance(this.link_distance).gravity(this.gravity);
    };

    Huviz.prototype.update_graph_settings = function(target, update) {
      var asNum, cooked_value, custom_handler_name, old_value;
      update = (update == null) && true || update;
      if (target.type === "checkbox") {
        cooked_value = target.checked;
      } else if (target.type === "range") {
        asNum = parseFloat(target.value);
        cooked_value = ('' + asNum) !== 'NaN' && asNum || target.value;
      } else {
        cooked_value = target.value;
      }
      old_value = this[target.name];
      if (cooked_value != null) {
        this[target.name] = cooked_value;
      }
      custom_handler_name = "on_change_" + target.name;
      if (this[custom_handler_name]) {
        this[custom_handler_name](target, old_value, cooked_value);
      }
      if (update) {
        this.update_fisheye();
        this.updateWindow();
        this.tick();
      }
      return d3.select(target).attr("title", cooked_value);
    };

    Huviz.prototype.on_change_nodes_pinnable = function(target, old_val, new_val) {
      var node, _i, _len, _ref, _results;
      if (!new_val) {
        _ref = this.graphed_set;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          node = _ref[_i];
          _results.push(node.fixed = false);
        }
        return _results;
      }
    };

    Huviz.prototype.xpath_query = function(xpath) {
      return document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
    };

    Huviz.prototype.init_from_graph_controls = function() {
      var elem, elems, iterator, _i, _len, _results;
      iterator = this.xpath_query("//div[@class='graph_controls']//input");
      elems = [];
      elem = iterator.iterateNext();
      while (elem) {
        elems.push(elem);
        elem = iterator.iterateNext();
      }
      console.log("initializing from " + elems.length + " settings");
      _results = [];
      for (_i = 0, _len = elems.length; _i < _len; _i++) {
        elem = elems[_i];
        _results.push(this.update_graph_settings(elem, false));
      }
      return _results;
    };

    Huviz.prototype.fire_fileloaded_event = function() {
      return window.dispatchEvent(new CustomEvent('fileloaded', {
        detail: {
          message: "file loaded",
          time: new Date()
        },
        bubbles: true,
        cancelable: true
      }));
    };

    Huviz.prototype.load_file = function() {
      $("#reset_btn").show();
      this.show_state_msg("loading...");
      this.init_from_graph_controls();
      this.reset_graph();
      this.data_uri = this.get_dataset_uri();
      this.show_state_msg(this.data_uri);
      if (!this.G.subjects) {
        this.fetchAndShow(this.data_uri);
      }
      if (this.use_webgl) {
        return this.init_webgl();
      }
    };

    Huviz.prototype.get_dataset_uri = function() {
      return $("select.file_picker option:selected").val();
    };

    Huviz.prototype.get_script_from_hash = function() {
      var script;
      script = location.hash;
      script = ((script == null) || script === "#") && "" || script.replace(/^#/, "");
      script = script.replace(/\+/g, " ");
      return script;
    };

    Huviz.prototype.boot_sequence = function() {
      var data_uri, script;
      this.init_from_graph_controls();
      this.reset_graph();
      script = this.get_script_from_hash();
      if (script) {
        return this.gclui.run_script(script);
      } else {
        data_uri = this.get_dataset_uri();
        if (data_uri) {
          return this.load(data_uri);
        }
      }
    };

    Huviz.prototype.load = function(data_uri) {
      if (!this.G.subjects) {
        this.fetchAndShow(data_uri);
      }
      if (this.use_webgl) {
        return this.init_webgl();
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
      var _ref;
      if (this.big_data_p == null) {
        if ((_ref = this.data_uri) != null ? _ref.match('poetesses|atwoma|relations') : void 0) {
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

    OntologicallyGrounded.prototype.read_ontology = function(ontology_uri) {
      return $.ajax({
        url: ontology_uri,
        success: this.parseTTLOntology,
        error: function(jqxhr, textStatus, errorThrown) {
          return this.show_state_msg(errorThrown + " while fetching ontology " + url);
        }
      });
    };

    OntologicallyGrounded.prototype.parseTTLOntology = function(data, textStatus) {
      var frame, obj_lid, obj_raw, ontology, pred, pred_id, pred_lid, subj_lid, subj_uri, _ref, _results;
      ontology = this.ontology;
      if ((GreenerTurtle != null) && this.turtle_parser === 'GreenerTurtle') {
        this.raw_ontology = new GreenerTurtle().parse(data, "text/turtle");
        _ref = this.raw_ontology.subjects;
        _results = [];
        for (subj_uri in _ref) {
          frame = _ref[subj_uri];
          subj_lid = uri_to_js_id(subj_uri);
          _results.push((function() {
            var _ref1, _results1;
            _ref1 = frame.predicates;
            _results1 = [];
            for (pred_id in _ref1) {
              pred = _ref1[pred_id];
              pred_lid = uri_to_js_id(pred_id);
              obj_raw = pred.objects[0].value;
              if (pred_lid === 'comment' || pred_lid === 'label') {
                continue;
              }
              obj_lid = uri_to_js_id(obj_raw);
              if (pred_lid === 'domain') {
                _results1.push(ontology.domain[subj_lid] = obj_lid);
              } else if (pred_lid === 'range') {
                if (ontology.range[subj_lid] == null) {
                  ontology.range[subj_lid] = [];
                }
                if (!(__indexOf.call(ontology.range, obj_lid) >= 0)) {
                  _results1.push(ontology.range[subj_lid].push(obj_lid));
                } else {
                  _results1.push(void 0);
                }
              } else if (pred_lid === 'subClassOf') {
                _results1.push(ontology.subClassOf[subj_lid] = obj_lid);
              } else if (pred_lid === 'subPropertyOf') {
                _results1.push(ontology.subPropertyOf[subj_lid] = obj_lid);
              } else {
                _results1.push(void 0);
              }
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
      return Orlando.__super__.constructor.apply(this, arguments);
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

    Orlando.prototype.push_snippet = function(msg_or_obj) {
      var m, obj, _ref;
      obj = msg_or_obj;
      if (this.snippet_box) {
        if (typeof msg_or_obj !== 'string') {
          _ref = ["", msg_or_obj], msg_or_obj = _ref[0], m = _ref[1];
          msg_or_obj = "<div id=\"" + obj.snippet_js_key + "\">\n  <div style=\"font-size:" + this.snippet_triple_em + "em\">\n    <span class=\"writername\" style=\"background-color:" + m.edge.source.color + "\">\n      <a target=\"SRC\"\n         href=\"" + m.edge.source.id + "\">" + m.edge.source.name + "</a>\n    </span>\n    —\n    <span style=\"background-color:" + m.edge.color + "\">" + m.pred_id + "</span>\n    —\n    <span style=\"background-color:" + m.edge.target.color + "\">" + m.edge.target.name + "</span>\n  </div>\n  <div>\n    <div contenteditable style=\"cursor:text;font-size:" + this.snippet_body_em + "em\">" + m.snippet_text + "</div>\n  </div>\n</div>\n";
        }
        return Orlando.__super__.push_snippet.call(this, obj, msg_or_obj);
      }
    };

    return Orlando;

  })(OntologicallyGrounded);

  OntoViz = (function(_super) {
    __extends(OntoViz, _super);

    function OntoViz() {
      return OntoViz.__super__.constructor.apply(this, arguments);
    }

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

  if (!is_one_of(2, [3, 2, 4])) {
    alert("is_one_of() fails");
  }

  (typeof exports !== "undefined" && exports !== null ? exports : this).Huviz = Huviz;

  (typeof exports !== "undefined" && exports !== null ? exports : this).Orlando = Orlando;

  (typeof exports !== "undefined" && exports !== null ? exports : this).OntoViz = OntoViz;

  (typeof exports !== "undefined" && exports !== null ? exports : this).Edge = Edge;

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
  var Node;

  Node = (function() {
    Node.prototype.linked = false;

    Node.prototype.showing_links = "none";

    Node.prototype.name = null;

    Node.prototype.s = null;

    Node.prototype.type = null;

    function Node(id, use_lid_as_node_name) {
      this.id = id;
      this.links_from = [];
      this.links_to = [];
      this.links_shown = [];
      this.lid = this.id.match(/([\w\d\_\-]+)$/g)[0];
      if (use_lid_as_node_name) {
        this.name = this.lid;
      }
    }

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
      return this.taxon.update_node(this, {
        select: true
      });
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
      return this.taxon.update_node(this, {
        select: false
      });
    };

    Node.prototype.discard = function() {
      return this.taxon.update_node(this, {
        discard: true
      });
    };

    return Node;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).Node = Node;

}).call(this);
}, "predicate": function(exports, require, module) {(function() {
  var Predicate;

  Predicate = (function() {
    function Predicate(id) {
      this.id = id;
      this.lid = this.id.match(/([\w\d\_\-]+)$/g)[0];
      this.shown_edges = SortedSet().sort_on("id").named("shown").isState("_s");
      this.unshown_edges = SortedSet().sort_on("id").named("unshown").isState("_s");
      this.selected_edges = SortedSet().sort_on("id").named("selected").isState('_p');
      this.unselected_edges = SortedSet().sort_on("id").named("unselected").isState('_p');
      this.all_edges = SortedSet().sort_on("id").named("predicate");
      this.state = "hidden";
      this;
    }

    Predicate.prototype.update_edge = function(edge, change) {
      if (change.show != null) {
        if (change.show) {
          this.shown_edges.acquire(edge);
        } else {
          this.unshown_edges.acquire(edge);
        }
      }
      if (change.select != null) {
        if (change.select) {
          this.selected_edges.acquire(edge);
        } else {
          this.unselected_edges.acquire(edge);
        }
      }
      return this.update_state(edge, change);
    };

    Predicate.prototype.select = function(edge) {
      this.update_edge(edge, {
        select: true
      });
      return this.update_state();
    };

    Predicate.prototype.unselect = function(edge) {
      this.update_edge(edge, {
        select: false
      });
      return this.update_state();
    };

    Predicate.prototype.add_edge = function(edge) {
      this.all_edges.add(edge);
      return this.update_state();
    };

    Predicate.prototype.update_selected_edges = function() {
      var before_count, e, _i, _len, _ref, _results;
      before_count = this.selected_edges.length;
      _ref = this.all_edges;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
        if (e.an_end_is_selected()) {
          _results.push(this.selected_edges.acquire(e));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Predicate.prototype.update_state = function(edge, change) {
      var evt, old_state;
      old_state = this.state;
      this.update_selected_edges();
      if (this.selected_edges.length === 0) {
        this.state = "hidden";
      } else if (this.only_some_selected_edges_are_shown()) {
        this.state = "mixed";
      } else if (this.selected_edges.length > 0 && this.all_selected_edges_are_shown()) {
        this.state = "showing";
      } else if (this.no_selected_edges_are_shown()) {
        this.state = "unshowing";
      } else {
        console.info("Predicate.update_state() should not fall thru", this);
        throw "Predicate.update_state() should not fall thru (" + this.lid + ")";
      }
      if (old_state !== this.state) {
        evt = new CustomEvent('changePredicate', {
          detail: {
            target_id: this.lid,
            predicate: this,
            old_state: old_state,
            new_state: this.state
          },
          bubbles: true,
          cancelable: true
        });
        return window.dispatchEvent(evt);
      }
    };

    Predicate.prototype.no_selected_edges_are_shown = function() {
      var e, _i, _len, _ref;
      _ref = this.selected_edges;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
        if (e.shown != null) {
          return false;
        }
      }
      return true;
    };

    Predicate.prototype.all_selected_edges_are_shown = function() {
      var e, _i, _len, _ref;
      _ref = this.selected_edges;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
        if (e.shown == null) {
          return false;
        }
      }
      return true;
    };

    Predicate.prototype.only_some_selected_edges_are_shown = function() {
      var e, only, shown_count, some, _i, _len, _ref;
      some = false;
      only = false;
      shown_count = 0;
      _ref = this.selected_edges;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
        if (e.shown != null) {
          some = true;
        }
        if (e.shown == null) {
          only = true;
        }
        if (only && some) {
          return true;
        }
      }
      return false;
    };

    return Predicate;

  })();

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

  (typeof exports !== "undefined" && exports !== null ? exports : this).QuadParser = QuadParser;

}).call(this);
}, "snippetsnooper": function(exports, require, module) {// Generated by CoffeeScript 1.7.1
(function() {
  var createServer, doint, dom, fs, test, thingy, thingy2, xpath;

  xpath = require('xpath');

  dom = require('xmldom').DOMParser;

  fs = require('fs');

  thingy = function() {
    var doc, nodes, xml;
    xml = '<thing><snip id="someid">Yahoo!</snip></thing>';
    doc = new dom().parseFromString(xml);
    nodes = xpath.select("//thing", doc.toString());
    return console.log("node: " + nodes[0].toString());
  };

  thingy2 = function() {
    return fs.readFile("thing.xml", function(err, data) {
      var doc, nodes;
      console.log("err: ", err);
      console.log(typeof data);
      console.log("str", data.toString());
      doc = new dom().parseFromString(data.toString());
      return nodes = xpath.select("//snip[@id='someid']", doc.toString());
    });
  };

  doint = function() {
    return fs.readFile("poetesses_decomposed.xml", function(err, data) {
      var doc, nodes, snippet_id;
      doc = new dom().parseFromString(data.toString());
      snippet_id = "b--ballrm--0--DIV2--3";
      snippet_id = "b--balfcl--0--DIV0--1";
      return nodes = xpath.select("//div2[@id='b--ballrm--0--DIV2--3']", doc);
    });
  };

  createServer = function(xmlFileName) {
    var doc, getSnippetById, makeXmlDoc;
    doc = null;
    makeXmlDoc = function(err, data) {
      if (err) {
        return console.error(err);
      } else {
        console.log("parsing " + xmlFileName + "...");
        doc = new dom().parseFromString(data.toString());
        return console.log("finished parsing " + xmlFileName);
      }
    };
    getSnippetById = function(req, res) {
      var nodes, snippet;
      if (doc) {
        console.log("xpath select " + req.params.id);
        nodes = xpath.select("//*[@id='" + req.paras.id + "']", doc);
        if (nodes.length > 0) {
          snippet = nodes[0].toString();
          console.log("found ", snippet);
          return res.send(snippet);
        } else {
          return res.send("not found");
        }
      } else {
        return res.send("doc still parsing");
      }
    };
    fs.readFile(xmlFileName, makeXmlDoc);
    return getSnippetById;
  };

  test = function() {
    var req, res, srvr;
    srvr = createServer("poetesses_decomposed.xml");
    req = {
      params: {
        id: "b--balfcl--0--DIV2--1"
      }
    };
    res = {
      send: function(v) {
        return console.log("sending: " + v);
      }
    };
    return srvr(req, res);
  };

  test();

}).call(this);
}, "taxon": function(exports, require, module) {(function() {
  var Taxon, TaxonBase,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  TaxonBase = require('taxonbase').TaxonBase;

  Taxon = (function(_super) {
    __extends(Taxon, _super);

    function Taxon(id) {
      this.id = id;
      Taxon.__super__.constructor.call(this);
      this.instances = SortedSet().named(this.id).isState('_isa').sort_on("id");
      this.selected_nodes = SortedSet().named('selected').isState('_tp').sort_on("id");
      this.unselected_nodes = SortedSet().named('unselected').isState('_tp').sort_on("id");
      this.discarded_nodes = SortedSet().named('discarded').isState('_tp').sort_on("id");
      this.lid = this.id;
      this.state = 'unshowing';
      this.subs = [];
      this.super_class = null;
    }

    Taxon.prototype.register_superclass = function(super_class) {
      if (super_class === this) {
        return;
      }
      if (this.super_class != null) {
        this.super_class.remove_subclass(this);
      }
      this.super_class = super_class;
      return this.super_class.register_subclass(this);
    };

    Taxon.prototype.remove_subclass = function(sub_class) {
      var idx;
      idx = this.subs.indexOf(sub_class);
      if (idx > -1) {
        return this.subs.splice(idx, 1);
      }
    };

    Taxon.prototype.register_subclass = function(sub_class) {
      return this.subs.push(sub_class);
    };

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
      return this.add(node);
    };

    Taxon.prototype.add = function(node) {
      return this.instances.add(node);
    };

    Taxon.prototype.update_node = function(node, change) {
      var new_node_state, old_node_state;
      old_node_state = node._tp;
      if (change.select != null) {
        if (change.select) {
          this.selected_nodes.acquire(node);
        } else {
          this.unselected_nodes.acquire(node);
        }
      }
      if (change.discard != null) {
        this.discarded_nodes.acquire(node);
      }
      new_node_state = node._tp;
      return this.update_state(node, change, old_node_state, new_node_state);
    };

    Taxon.prototype.recalc_state = function(node, change, old_node_state, new_node_state) {
      var settheory;
      settheory = this.recalc_state_using_set_theory(node, change, old_node_state, new_node_state);
      this.state = settheory;
      return this.state;
    };

    Taxon.prototype.recalc_state_using_set_theory = function(node, change, old_node_state, new_node_state) {
      if (this.selected_nodes.length + this.unselected_nodes.length === 0) {
        return "hidden";
      }
      if (this.selected_nodes.length > 0 && this.unselected_nodes.length > 0) {
        return "mixed";
      }
      if (this.unselected_nodes.length === 0) {
        return "showing";
      }
      if (this.selected_nodes.length === 0) {
        return "unshowing";
      } else {
        throw "Taxon[" + this.id + "].recalc_state should not fall thru, #selected:" + this.selected_nodes.length + " #unselected:" + this.unselected_nodes.length;
      }
    };

    Taxon.prototype.recalc_english = function(in_and_out) {
      var n, _i, _j, _len, _len1, _ref, _ref1, _results, _results1;
      if (this.state === 'showing') {
        return in_and_out.include.push(this.lid);
      } else if (this.state === 'unshowing') {
        return console.warn("uh what?");
      } else if (this.state === 'mixed') {
        if (this.selected_nodes.length < this.unselected_nodes.length) {
          _ref = this.selected_nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(in_and_out.include.push(n.lid));
          }
          return _results;
        } else {
          in_and_out.include.push(this.id);
          _ref1 = this.unselected_nodes;
          _results1 = [];
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            n = _ref1[_j];
            _results1.push(in_and_out.exclude.push(n.lid));
          }
          return _results1;
        }
      }
    };

    return Taxon;

  })(TaxonBase);

  (typeof exports !== "undefined" && exports !== null ? exports : this).Taxon = Taxon;

}).call(this);
}, "taxonabstract": function(exports, require, module) {(function() {
  var TaxonAbstract, TaxonBase,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  TaxonBase = require('taxonbase').TaxonBase;

  TaxonAbstract = (function(_super) {
    __extends(TaxonAbstract, _super);

    function TaxonAbstract(id) {
      this.id = id;
      TaxonAbstract.__super__.constructor.call(this);
      this.kids = SortedSet().sort_on("id").named(this.id).isState("_mom");
    }

    TaxonAbstract.prototype.register = function(kid) {
      kid.mom = this;
      return this.addSub(kid);
    };

    TaxonAbstract.prototype.addSub = function(kid) {
      return this.kids.add(kid);
    };

    TaxonAbstract.prototype.get_instances = function() {
      var i, kid, retval, _i, _j, _len, _len1, _ref, _ref1;
      retval = [];
      _ref = this.kids;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        kid = _ref[_i];
        _ref1 = kid.get_instances();
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          i = _ref1[_j];
          retval.push(i);
        }
      }
      return retval;
    };

    TaxonAbstract.prototype.recalc_state = function() {
      var different_states, k, summary, v, _i, _len, _ref;
      summary = {
        showing: false,
        hidden: false,
        unshowing: false,
        mixed: false
      };
      different_states = 0;
      _ref = this.kids;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        k = _ref[_i];
        if (typeof k.get_state() === 'undefined') {
          console.debug(k);
        }
        if (!summary[k.state]) {
          summary[k.state] = true;
          different_states++;
        }
      }
      if (different_states > 1) {
        this.state = 'mixed';
      } else {
        for (k in summary) {
          v = summary[k];
          if (v) {
            this.state = k;
            break;
          }
        }
      }
      return this.state;
    };

    TaxonAbstract.prototype.recalc_english = function(in_and_out) {
      var kid, _i, _len, _ref, _results;
      if (this.state === 'showing') {
        return in_and_out.include.push(this.id);
      } else if (this.state === "unshowing") {

      } else if (this.state === "mixed") {
        _ref = this.kids;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          kid = _ref[_i];
          _results.push(kid.recalc_english(in_and_out));
        }
        return _results;
      }
    };

    return TaxonAbstract;

  })(TaxonBase);

  (typeof exports !== "undefined" && exports !== null ? exports : this).TaxonAbstract = TaxonAbstract;

}).call(this);
}, "taxonbase": function(exports, require, module) {(function() {
  var TaxonBase, angliciser;

  angliciser = require('angliciser').angliciser;

  TaxonBase = (function() {
    function TaxonBase() {}

    TaxonBase.prototype.suspend_updates = false;

    TaxonBase.prototype.get_state = function() {
      if (this.state == null) {
        this.state = this.recalc_state();
      }
      return this.state;
    };

    TaxonBase.prototype.update_state = function(node, change, old_node_state, new_node_state) {
      var evt, old_state;
      old_state = this.state;
      this.recalc_state(node, change, old_node_state, new_node_state);
      if (old_state !== this.state) {
        evt = new CustomEvent('changeTaxon', {
          detail: {
            target_id: this.id,
            taxon: this,
            old_state: old_state,
            new_state: this.state
          },
          bubbles: true,
          cancelable: true
        });
        if (this.mom != null) {
          console.warn("TaxonBase.update_state() should have more sophisticated rootward propagation");
          this.mom.update_state();
        }
        window.dispatchEvent(evt);
      }
      return this.update_english();
    };

    TaxonBase.prototype.update_english = function() {
      var evt, in_and_out;
      if (window.suspend_updates) {
        console.warn("Suspending update_english");
        return;
      }
      if (this.mom != null) {
        this.mom.update_english();
        return;
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

    TaxonBase.prototype.english_from = function(in_and_out) {
      var english;
      english = angliciser(in_and_out.include);
      if (in_and_out.exclude.length) {
        english += " but not " + angliciser(in_and_out.exclude, " or ");
      }
      return english;
    };

    return TaxonBase;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).TaxonBase = TaxonBase;

}).call(this);
}, "treepicker": function(exports, require, module) {
/*
Build and control a hierarchic menu of arbitrarily nested divs looking like:
  +---------------------+
  |     +--------------+|
  |     |       +-----+||
  | All |People |Men  |||
  |     |       +-----+||
  |     |       +-----+||
  |     |       |Women|||
  |     |       +-----+||
  |     +--------------+|
  +---------------------+

  Collapsed is different from hidden.  Hidden is to be used when there are
  no instances of the (say) predicates in a branch.  Collapsed is the opposite
  of expanded.
 */

(function() {
  var TreePicker,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  TreePicker = (function() {
    function TreePicker(elem, root, extra_classes, needs_expander) {
      this.elem = elem;
      this.needs_expander = needs_expander;
      this.onChangeState = __bind(this.onChangeState, this);
      if (extra_classes != null) {
        this.extra_classes = extra_classes;
      }
      this.id_to_elem = {
        root: elem
      };
      this.id_to_elem[root] = elem;
      this.ids_in_arrival_order = [root];
      this.id_is_abstract = {};
      this.id_is_collapsed = {};
      this.id_to_state = {
        "true": {},
        "false": {}
      };
      this.id_to_parent = {};
      this.id_to_children = {};
      this.set_abstract(root);
      this.set_abstract('root');
    }

    TreePicker.prototype.get_my_id = function() {
      return this.elem.attr("id");
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
      return uri.match(/([\w\d\_\-]+)$/g)[0];
    };

    TreePicker.prototype.add_alphabetically = function(i_am_in, node_id, label) {
      var container, elem, elem_lower, label_lower, _i, _len, _ref;
      label_lower = label.toLowerCase();
      container = i_am_in[0][0];
      _ref = container.children;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        elem_lower = elem.id.toLowerCase();
        if (elem_lower > label_lower) {
          return this.add_to_elem_before(i_am_in, node_id, "#" + elem.id, label);
        }
      }
      return this.add_to_elem_before(i_am_in, node_id, void 0, label);
    };

    TreePicker.prototype.add_to_elem_before = function(i_am_in, node_id, before, label) {
      return i_am_in.insert('div', before).attr('class', 'contents').attr('id', node_id);
    };

    TreePicker.prototype.show_tree = function(tree, i_am_in, listener, top) {
      var contents_of_me, css_class, label, msg, my_contents, node_id, picker, rest, _i, _len, _ref, _results;
      top = (top == null) || top;
      _results = [];
      for (node_id in tree) {
        rest = tree[node_id];
        label = rest[0];
        contents_of_me = this.add_alphabetically(i_am_in, node_id, label);
        this.id_to_elem[node_id] = contents_of_me;
        msg = "show_tree() just did @id_to_elem[" + node_id + "] = contents_of_me";
        picker = this;
        contents_of_me.on('click', function() {
          var elem, id, new_state, old_showing, send_leafward;
          d3.event.stopPropagation();
          elem = d3.select(this);
          old_showing = !elem.classed('treepicker-showing');
          new_state = old_showing && "showing" || "unshowing";
          id = this.id;
          send_leafward = picker.id_is_collapsed[id];
          return picker.effect_click(id, new_state, send_leafward, listener);
        });
        contents_of_me.append("p").attr("class", "treepicker-label").text(label);
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

    TreePicker.prototype.effect_click = function(id, new_state, send_leafward, listener) {
      var child_id, elem, kids, showing, _i, _len;
      console.log("" + (this.get_my_id()) + ".effect_click()", arguments);
      showing = new_state === "showing";
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
        return listener.call(this, id, new_state === 'showing', elem);
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
      this.id_to_children[parent_id].push(new_id);
      name = (name != null) && name || new_id;
      branch = {};
      branch[new_id] = [name || new_id];
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
      return exp.text(this.expander_str);
    };

    TreePicker.prototype.expand_by_id = function(id) {
      var elem, exp;
      this.id_is_collapsed[id] = false;
      elem = this.id_to_elem[id];
      elem.classed("treepicker-collapse", false);
      exp = elem.select(".expander");
      return exp.text(this.collapser_str);
    };

    TreePicker.prototype.get_or_create_payload = function(thing) {
      var r;
      if ((thing != null) && thing) {
        r = thing.select(".payload");
        if (r[0][0] !== null) {
          return r;
        }
        return thing.select(".treepicker-label").append('div').classed("payload", true);
      }
    };

    TreePicker.prototype.set_payload = function(id, value) {
      var elem, payload;
      elem = this.id_to_elem[id];
      if ((elem == null) && elem !== null) {
        console.warn("set_payload could not find " + id);
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

    TreePicker.prototype.set_direct_state = function(id, state) {
      var old_state;
      console.info("" + (this.get_my_id()) + ".set_direct_state()", arguments);
      old_state = this.id_to_state[true][id];
      this.id_to_state[true][id] = state;
      if (old_state != null) {
        this.id_to_elem[id].classed("treepicker-" + old_state, false);
      }
      if (state != null) {
        return this.id_to_elem[id].classed("treepicker-" + state, true);
      }
    };

    TreePicker.prototype.set_indirect_state = function(id, state) {
      var old_state;
      console.info("" + (this.get_my_id()) + ".set_indirect_state()", arguments);
      if (state == null) {
        console.error("" + (this.get_my_id()) + ".set_indirect_state()", arguments, "state should never be", void 0);
      }
      old_state = this.id_to_state[false][id];
      this.id_to_state[false][id] = state;
      if (old_state != null) {
        this.id_to_elem[id].classed("treepicker-indirect-" + old_state, false);
      }
      if (state != null) {
        return this.id_to_elem[id].classed("treepicker-indirect-" + state, true);
      }
    };

    TreePicker.prototype.set_state_by_id = function(id, state) {
      var indirect_state;
      console.info("" + (this.get_my_id()) + ".set_state_by_id()", arguments);
      this.set_direct_state(id, state);
      if (this.is_leaf(id)) {
        indirect_state = state;
      } else {
        indirect_state = this.id_to_state[false][id];
      }
      if (indirect_state == null) {
        this.set_indirect_state(id, state);
      } else if (state !== indirect_state) {
        this.set_indirect_state(id, "mixed");
      } else {
        this.set_indirect_state(id, indirect_state);
      }
      return this.update_parent_indirect_state(id);
    };

    TreePicker.prototype.is_leaf = function(id) {
      return (this.id_to_children[id] == null) || this.id_to_children[id].length === 0;
    };

    TreePicker.prototype.update_parent_indirect_state = function(id) {
      var child_indirect_state, child_is_leaf, new_parent_indirect_state, parent_id, parent_indirect_state;
      console.info("" + (this.get_my_id()) + ".update_parent_indirect_state()", arguments);
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
      var child_id, child_indirect_state, new_indirect_state, _i, _len, _ref;
      new_indirect_state = this.id_to_state[false][id];
      _ref = this.id_to_children[id];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child_id = _ref[_i];
        child_indirect_state = this.id_to_state[false][child_id];
        if (child_indirect_state !== new_indirect_state) {
          if (new_indirect_state == null) {
            new_indirect_state = child_indirect_state;
          } else {
            new_indirect_state = "mixed";
          }
          break;
        }
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
      return this.set_state_by_id(evt.detail.target_id, evt.detail.new_state);
    };

    return TreePicker;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).TreePicker = TreePicker;

}).call(this);
}});