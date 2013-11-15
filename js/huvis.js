/*

See for inspiration:
  Collapsible Force Layout
    http://bl.ocks.org/mbostock/1093130
  Force-based label placement
    http://bl.ocks.org/MoritzStefaner/1377729
  Graph with labeled edges:
    http://bl.ocks.org/jhb/5955887
  Multi-Focus Layout:
    http://bl.ocks.org/mbostock/1021953

Lariat -- around the graph, the rope of nodes which serves as reorderable menu
Hoosegow -- a jail to contain nodes one does not want to be bothered by

 */

function change_sort_order(array,cmp){
    array.__current_sort_order = cmp;
    array.sort(array.__current_sort_order);
}

function isArray(thing){
    return Object.prototype.toString.call(thing) === '[object Array]';
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
function binary_search_on(sorted_array,sought,cmp,ret_ins_idx){
    // return -1 or the idx of sought in sorted_array
    // if ret_ins_idx instead of -1 return [n] where n is where it ought to be
    // AKA "RETurn the INSertion INdeX"
    cmp = cmp || sorted_array.__current_sort_order || cmp_on_id;
    ret_ins_idx = ret_ins_idx || false;
    var seeking = true;
    if (sorted_array.length < 1) {
	if (ret_ins_idx) return {idx:0};
	return -1;
    }
    var mid;
    var bot = 0,
        top = sorted_array.length;
    while (seeking){
	mid = bot + Math.floor((top - bot)/2);
	var c = cmp(sorted_array[mid],sought);
	//console.log(" c =",c);
	if (c == 0) return mid;
	if (c < 0){ // ie sorted_array[mid] < sought
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
var add_to_array = function(itm,array,cmp){
    // Objective:
    //   Maintain a sorted array which acts like a set.
    //   It is sorted so insertions and tests can be fast.
    // cmp: a comparison function returning -1,0,1
    cmp = cmp || array.__current_sort_order || cmp_on_id;
    var c = binary_search_on(array,itm,cmp,true)
    if (typeof c == typeof 3){ // an integer was returned, ie it was found
	return c;
    }
    array.splice(c.idx,0,itm);
    return c.idx;
}
var remove_from_array = function(itm,array,cmp){
    // Objective:
    //   Remove item from an array acting like a set.
    //   It is sorted by cmp, so we can use binary_search for removal
    cmp = cmp || array.__current_sort_order || cmp_on_id;
    var c = binary_search_on(array,itm,cmp);
    if (c > -1){
	array.splice(c,1);
    }
    return array;
}

function do_tests(verbose){
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
      stuff = [a,b],
      a_d = [a,d],
      ints = [0,1,2,3,4,5,6,7,8,10],
      even = [0,2,4,6,8,10];

    function expect(stmt,want){
	var got = eval(stmt);
	if (verbose) console.log(stmt,"==>",got);
	if (got != want){
	    throw stmt + " returned "+got+" expected "+want;
	}
    }

    expect("cmp_on_id(a,a)",0);
    expect("cmp_on_id(a,b)",-1);
    expect("cmp_on_id(b,a)",1);
    expect("binary_search_on(ints,0,n)",0);
    expect("binary_search_on(ints,4,n)",4);
    expect("binary_search_on(ints,8,n)",8);
    expect("binary_search_on(ints,9,n)",-1);
    expect("binary_search_on(ints,9,n,true).idx",9);
    expect("binary_search_on(ints,-3,n)",-1);
    expect("binary_search_on(even,1,n,true).idx",1);
    expect("binary_search_on(even,3,n,true).idx",2);
    expect("binary_search_on(even,5,n,true).idx",3);
    expect("binary_search_on(even,7,n,true).idx",4);
    expect("binary_search_on(even,9,n,true).idx",5);
    expect("binary_search_on(even,9,n)",-1);
    expect("binary_search_on(even,11,n,true).idx",6);
    expect("binary_search_on(stuff,a)",0);
    expect("binary_search_on(stuff,b)",1);
    expect("binary_search_on(stuff,c)",-1);
    expect("binary_search_on(stuff,d)",-1);
    expect("binary_search_on(a_d,c,cmp_on_id)",-1);
    expect("binary_search_on(a_d,c,cmp_on_id,true).idx",0);
    expect("binary_search_on(a_d,b,cmp_on_id,true).idx",1);
    expect("add_to_array(b,a_d)",1);
    expect("binary_search_on(a_d,a,cmp_on_id)",0);
    expect("binary_search_on(a_d,b,cmp_on_id)",1);
    expect("binary_search_on(a_d,d,cmp_on_id)",2);
    expect("add_to_array(c,a_d)",0);
}
do_tests(false);

var add_to =  function(itm,set){
    // Perform the set .add operation, adding itm only if not already present
    if (isArray(set)){
	return add_to_array(itm,set,cmp_on_id);
    }
    if (typeof itm.id === 'undefined') 
	throw "add_to() requires itm to have an .id";
    var found = set[itm.id];
    if (! found){
	set[itm.id] = itm;
    }
    return set[itm.id];
  };
var remove_from = function(doomed,set){
    if (typeof doomed.id === 'undefined') 
	throw "remove_from() requires doomed to have an .id";
    if (isArray(set)){
	return remove_from_array(doomed,set);
    }
    if (set[doomed.id]){
	delete set[doomed.id];
    }
    return set;
};


//if (Array.__proto__.add == null) Array.prototype.add = add;

var nodes, links_set, node, link;
var chosen_set;    // the nodes the user has chosen to see expanded
var discarded_set; // the nodes the user has discarded
var graphed_set;   // the nodes which are in the graph, linked together
var unlinked_set;  // the nodes not displaying links and not discarded
var nearest_node;
var lariat;
var label_all_graphed_nodes = false; // keep synced with html
var verbose = true;
var verbosity = 0;
var TEMP = 5;
var COARSE = 10;
var MODERATE = 20;
var DEBUG = 40;
var DUMP = false;
var node_radius_policy;
var draw_circle_around_nearest = false;
var draw_lariat_labels_rotated = true;
var run_force_after_mouseup_msec = 2000;
var nodes_pinnable = false;  // bugged

if (! verbose){
  console = {'log': function(){}};
}

var last_mouse_pos = [0,0];
var parseAndShow = function(data,textStatus){
  set_status("parsing");
  var msg = "data was "+data.length+" bytes";
  var parse_start_time = new Date();
  G = GreenerTurtle(GreenTurtle).parse(data,'text/turtle');
  var parse_end_time = new Date();
  var parse_time = (parse_end_time - parse_start_time) / 1000;
  var siz = roughSizeOfObject(G);
  msg += " resulting in a graph of "+siz+" bytes";
  msg += " which took " + parse_time + " seconds to parse";
  if (verbosity >= COARSE) {
    console.log(msg);
  }
  var show_start_time = new Date();
  showGraph(G);
  var show_end_time = new Date();
  var show_time = (show_end_time - show_start_time) / 1000;
  msg += " and " + show_time +" sec to show";
  if (verbosity >= COARSE) {
    console.log(msg);
  }
  $('body').css('cursor', 'default');
  $("#status").text("");
};

function roughSizeOfObject( object ) {
    // http://stackoverflow.com/questions/1248302/javascript-object-size
    var objectList = [];
    var stack = [ object ];
    var bytes = 0;

    while ( stack.length ) {
        var value = stack.pop();

        if ( typeof value === 'boolean' ) {
            bytes += 4;
        }
        else if ( typeof value === 'string' ) {
            bytes += value.length * 2;
        }
        else if ( typeof value === 'number' ) {
            bytes += 8;
        }
        else if
        (
            typeof value === 'object'
            && objectList.indexOf( value ) === -1
        )
        {
            objectList.push( value );

            for( i in value ) {
                stack.push( value[ i ] );
            }
        }
    }
    return bytes;
}

var fetchAndShow = function(url){
  //d3.xhr(url,'text/plain',parseAndShow);
  $('#status').text('fetching '+url);
  $('body').css('cursor', 'wait');
  $.ajax({url:url, 
          success: parseAndShow, 
          error: function(jqxhr,textStatus,errorThrown){
            $('#status').text(errorThrown + ' while fetching '+url);
          }})
};

var has_predicate_value = function(subject,predicate,value){
  var pre = subject.predicates[predicate];
  if (pre){
    objs = pre.objects;
    for (oi = 0; oi <= objs.length; oi++){
      var obj = objs[oi];
      if (obj.value == value){
       return true;
      }
    }
  }
  return false;
};

var obj_has_type = function(obj,typ){
  return obj.type == typ;
};

var FOAF_Group = 'http://xmlns.com/foaf/0.1/Group';
var FOAF_name = 'http://xmlns.com/foaf/0.1/name';
var RDF_Type = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
var RDF_object = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object';
var has_type = function(subject,typ){
  return has_predicate_value(subject,RDF_Type,typ);
};

var is_a_main_node = function(d){
  // This is a hacky Orlando-specific way to 
  return ((BLANK_HACK && d.s.id[7] != '/') ||     //  http:///4  
          (! BLANK_HACK && d.s.id[0] != '_' ));   //  _:4

};

var is_node_to_always_show = is_a_main_node;

var BLANK_HACK = false;
function color_by_type(d){
  // anon red otherwise blue 
    if (has_type(d.s,FOAF_Group)){
        return 'green'; // Groups
    } else if (d.s.id[0] == '_'){
	return 'red'; // Other people
    } else {
	return 'blue'; // the writers
    }
}

function distance(p1,p2){
  var x = (p1.x || p1[0]) - (p2.x || p2[0]);
  var y = (p1.y || p1[1]) - (p2.y || p2[1]);
  return Math.sqrt(x * x + y * y);
}

function move_node_to_point(node,point){
    node.x = point[0];
    node.y = point[1];
}

function mousemove() {
    //console.log('mousemove');
    last_mouse_pos = d3.mouse(this);
    if (dragging){
	force.resume();
	//console.log(nearest_node.x,last_mouse_pos);
	move_node_to_point(dragging,last_mouse_pos);
    }
    cursor.attr("transform", "translate(" + last_mouse_pos + ")");
    tick();
}
var mousedown_point = [cx,cy];
function mousedown(){
    //console.log('mousedown');
    if (nearest_node && nearest_node.linked){ // only drag nodes in graph
	dragging = nearest_node;
	//force.stop();
    }
    mousedown_point = d3.mouse(this);
    last_mouse_pos = mousedown_point;
    //e.preventDefault();
}

function mouseup(){
    var point = d3.mouse(this);
    //console.log(point,mousedown_point,distance(point,mousedown_point));
    if (dragging){
	move_node_to_point(dragging,point);
	if (in_discard_dropzone(dragging)){
	    console.log("discarding",dragging.name)
	    discard(dragging);
	} else 	if (nodes_pinnable){
	    dragging.fixed = true;
	}
	if (in_disconnect_dropzone(dragging)){
	    console.log("disconnect",dragging.name)
	    unchoose(dragging);
	} 
	dragging = false;
	return;
    }
    if (nearest_node && nearest_node.fixed && nearest_node.linked){
	if (nodes_pinnable){
	    nearest_node.fixed = false;
	}
    }
    if (distance(point,mousedown_point) > drag_dist_threshold){
	return;  // it was a drag, not a click
    }
    if (nearest_node){
	var clickee = nearest_node;
	//if (clickee.state == discarded_set){
	//    undiscard(clickee);
	//}
	if (! clickee.state ||  // hidden should be the default state
	    clickee.state == 'hidden' || 
	    clickee.state == hidden_set || 
	    clickee.state == unlinked_set || 
	    clickee.state == discarded_set){
	    choose(clickee);
	} else if (clickee.showing_links == 'all'){
	    unchoose(clickee);
	} else {
	    choose(clickee);
	}
	force.links(links_set);
	//update_flags(clickee);
	restart();
    }
}

var show_and_hide_links_from_node = function(d){
    show_links_from_node(d);
    hide_links_from_node(d);
};

var wpad,hpad = 10;
var width,height = 0;
var cx,cy = 0;
var link_distance = 20;
var charge = -30;
var gravity = 0.3;
var label_show_range = link_distance * 1.1;
var graph_radius = 100;
var discard_radius = 200;
var discard_center = [cx,cy];
var fisheye_radius = label_show_range * 5;
var focus_radius = label_show_range;
var drag_dist_threshold = 5;
var dragging = false;
/////////////////////////////////////////////////////////////////////////////
// resize-svg-when-window-is-resized-in-d3-js
//   http://stackoverflow.com/questions/16265123/
var get_window_width = function(pad){
  var pad = pad || hpad;			   
  width = (window.innerWidth || 
         document.documentElement.clientWidth || 
         document.clientWidth) - pad;
  cx = width/2;
  //console.log('width',width);
};
var get_window_height = function(pad){
  var pad = pad || hpad;			   
  height = ( window.innerHeight || 
            document.documentElement.clientHeight || 
            document.clientHeight) - pad;
  cy = height/2;
  //console.log('height',height);
}
var update_graph_radius = function(){
    graph_radius = Math.floor(Math.min(width/2,height/2)) * .9;
};

var update_discard_zone = function(){
    var discard_ratio = .1;
    discard_radius = graph_radius * discard_ratio;
    discard_center = [width - discard_radius * 3, 
		      height - discard_radius * 3];    
};

function updateWindow(){
    get_window_width();
    get_window_height();
    update_graph_radius();
    update_discard_zone();
    if (svg){
	svg
	    .attr("width", width)
	    .attr("height", height);
    }
    if (canvas){
	canvas.width = width;
	canvas.height = height;
    }
    force.size([width,height]);
    restart();
}
window.onresize = updateWindow;



/////////////////////////////////////////////////////////////////////////////


var fisheye = d3.fisheye.circular().radius(fisheye_radius).distortion(2.8);

// 
//   http://bl.ocks.org/mbostock/929623

var fill = d3.scale.category20();

function get_charge(d){
    if (! d.linked) return 0;
    return charge;
};

var force = d3.layout.force()
    .size([width, height])
    .nodes([]) // initialize with no nodes
    .linkDistance(link_distance)
    .charge(get_charge)
    .gravity(gravity)
    .on("tick", tick);

var svg = d3.select("#vis").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("position", "absolute");

svg.append("rect")
    .attr("width", width)
    .attr("height", height);

//var canvas = document.getElementById('#viscanvas')

var viscanvas = d3.select("#viscanvas").append("canvas")
    .attr("width",width)
    .attr("height", height);
var canvas = viscanvas[0][0];

var mouse_receiver = viscanvas;
mouse_receiver
    .on("mousemove", mousemove)
    .on("mousedown", mousedown)
    .on("mouseup", mouseup)
    .on("mouseout", mouseup);

// lines: 5845 5848 5852 of d3.v3.js object to
//    mouse_receiver.call(force.drag);
// when mouse_receiver == viscanvas

updateWindow();

var ctx = canvas.getContext('2d');

var use_canvas = true;
var use_svg = false;
var use_webgl = false;

if (location.hash.match(/webgl/)){
    use_webgl = true;
}
if (location.hash.match(/nocanvas/)){
    use_canvas = false;
}

function init_webgl(){
    init();
    animate();
    //add_frame();
    //dump_line(add_line(scene,cx,cy,width,height,'ray'))
}

function draw_circle(cx,cy,radius,strclr,filclr){
    if (strclr) ctx.strokeStyle = strclr || "blue";
    if (filclr) ctx.fillStyle = filclr || "blue";
    ctx.beginPath();
    ctx.arc(cx,cy,radius, 0, Math.PI*2, true);
    ctx.closePath();
    if (strclr) ctx.stroke();
    if (filclr) ctx.fill();
}
function draw_line(x1,y1,x2,y2,clr){
    ctx.strokeStyle = clr || red;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.closePath();
    ctx.stroke();
}
function draw_disconnect_dropzone(){
    ctx.save();
    ctx.lineWidth = graph_radius * 0.1;
    draw_circle(cx,cy,graph_radius,'lightgreen');
    ctx.restore()
}
function draw_discard_dropzone(){
    ctx.save();
    ctx.lineWidth = discard_radius * 0.1;
    draw_circle(discard_center[0],
		discard_center[1],
		discard_radius,'','salmon');
    ctx.restore()
}
function draw_dropzones(){
    if (dragging){
	draw_disconnect_dropzone();
	draw_discard_dropzone();
    }
}

function in_disconnect_dropzone(node){
    // is it within the RIM of the disconnect circle?
    var dist = distance(node,[cx,cy]);
    return (graph_radius * 0.9 < dist &&
	    graph_radius * 1.1 > dist);
}

function in_discard_dropzone(node){
    // is it ANYWHERE within the circle?
    var dist = distance(node,discard_center);
    return (discard_radius * 1.1 > dist);
}



function reset_graph(){
    //draw_circle(cx,cy,0.5 * Math.min(cx,cy),'black')
    id2n = {};
    nodes = []; //SortedSet().sort_on('id');
    change_sort_order(nodes,cmp_on_id);

    chosen_set = SortedSet().sort_on('id');

    /*
      states: graphed,unlinked,discarded,hidden
         graphed: in the graph, connected to other nodes
	 unlinked: in the lariat, available for choosing
	 discarded: in the discard zone, findable but ignored by show_links_*
	 hidden: findable, but not displayed anywhere
              	 (when found, will become unlinked)
     */
    unlinked_set = SortedSet()
	.sort_on('name')
        .named('unlinked')
	.isState();
    discarded_set = SortedSet()
	.sort_on('name')
	.named('discarded')
	.isState();
    hidden_set = SortedSet()
	.sort_on('id')
	.named('hidden')
	.isState();
    graphed_set = SortedSet()
	.sort_on('id')
	.named('graphed')
	.isState();

    links_set = SortedSet().sort_on('id');
    force.nodes(nodes);
    d3.select(".link").remove();
    d3.select(".node").remove();
    d3.select(".lariat").remove();
    
    //nodes = force.nodes();
    //links = force.links();
    
    node  = svg.selectAll(".node");
    link  = svg.selectAll(".link");
    lariat = svg.selectAll(".lariat");
    
    link = link.data(links_set);
    
    link.exit().remove();
    
    node = node.data(nodes);
    
    node.exit().remove();
    
    force.start();
}
reset_graph();

var cursor = svg.append("circle")
    .attr("r", label_show_range)
    .attr("transform", "translate("+cx+","+cy+")")
    .attr("class", "cursor");

restart();

function dist_lt(mouse,d,thresh){
    var x = mouse[0] - d.x;
    var y = mouse[1] - d.y;
    return (Math.sqrt(x * x + y * y) < thresh);
}

var search_regex = new RegExp('^$', "ig");

var set_search_regex = function(text){
   search_regex = new RegExp( text || '^$', "ig"); // get this once per tick
};

var update_searchterm = function(){
   //console.log(this);
   var text = $(this).text();
   set_search_regex(text);
   //console.log('"'+text+'" ==>',search_regex);
   restart();
}

set_search_regex('');
$(".search_box").on("input",update_searchterm);

var little_dot = .5;
var node_radius_policies = {
    'node radius by links': function(d) {
	//if (d.radius) return d.radius;
	d.radius = Math.max(little_dot,Math.log(d.links_shown.length));
	return d.radius;
	if (d.showing_links == 'none'){
	    d.radius = little_dot;	
	} else if (d.showing_links == 'all'){
	    d.radius = Math.max(little_dot,2 + Math.log(d.links_shown.length));
	}
	return d.radius;
    },
    'equal dots': function(d){
	return little_dot;
    }
};
var default_node_radius_policy = 'equal dots';
var default_node_radius_policy = 'node radius by links';
//set_node_radius_policy(node_radius_policies[default_node_radius_policy]);
node_radius_policy = node_radius_policies[default_node_radius_policy];

function set_node_radius_policy(evt){
    f = $( "select#node_radius_policy option:selected").val();
    if (! f) return;
    if (typeof f === typeof 'str'){
	node_radius_policy = node_radius_policies[f];
    } else if (typeof f === typeof set_node_radius_policy){
	node_radius_policy = f;
    } else {
	console.log("f =",f);
    }
}

function init_node_radius_policy(){
    var policy_box = d3.select('#huvis_controls')
	.append('div','node_radius_policy_box');
    var policy_picker = policy_box.append('select','node_radius_policy');
    policy_picker.on('change',set_node_radius_policy);
    for (var policy_name in node_radius_policies){
	policy_picker.append('option').attr('value',policy_name).text(policy_name);
	//console.log(policy_name);
    }
}


function calc_node_radius(d){
    return node_radius_policy(d);
}

function names_in_edges(set){
    out = [];
    set.forEach(function(itm,i){
	out.push(itm.source.name+" ---> " + itm.target.name);
    });
    return out;
}
function dump_details(node){
    /*
    if (! DUMP){
      if (node.s.id != '_:E') return;
    }
    */
    console.log("=================================================");
    console.log(node.name);
    console.log("  x,y:",node.x,node.y);
    try {
	console.log("  state:",node.state.state_name,node.state);
    } catch (e){}
    console.log("  chosen:",node.chosen);
    console.log("  fisheye:",node.fisheye);
    console.log("  fixed:",node.fixed);
    console.log("  links_shown:",
		node.links_shown.length, 
		names_in_edges(node.links_shown));
    console.log("  links_to:",
		node.links_to.length, 
		names_in_edges(node.links_to));
    console.log("  links_from:",
		node.links_from.length, 
		names_in_edges(node.links_from));
    console.log("  showing_links:", node.showing_links);
    console.log("  in_sets:",node.in_sets);
}

var dump_locations = function(srch,verbose,func){
    verbose = verbose || false;
    var pattern = new RegExp(srch, "ig");   
    nodes.forEach(
	function(node,i){
	    if (! node.name.match(pattern)){
		if (verbose) console.log(pattern,"does not match",node.name);
		return;
	    }
	    if (func){
		console.log(func.call(node));
	    }
	    if (! func || verbose){
		dump_details(node);
	    }
	}
    );
}

function find_nearest_node(){
    if (dragging) return;
    var new_nearest_node;
    var new_nearest_idx;
    var focus_threshold = focus_radius * 3;
    var closest = width;;
    var closest_point;
    nodes.forEach(function(d,i) {
	var dist = distance(d.fisheye || d,last_mouse_pos);
	if (dist < closest){
	    closest = dist;
	    closest_point = d.fisheye || d;
	}
	if (dist <= focus_threshold){
            new_nearest_node = d;
            focus_threshold = dist;
            new_nearest_idx = i;
            //console.log("dist",focus_threshold,dist,new_nearest_node.name);
	}
    });
    if (draw_circle_around_nearest){
	draw_circle(closest_point.x,closest_point.y,focus_radius,'red');
    }
    var msg = focus_threshold+" <> " + closest;
    var status = $("#status");
    //status.text(msg);
    //console.log('new_nearest_node',focus_threshold,new_nearest_node);
    if (nearest_node != new_nearest_node){
	if (nearest_node){
	    if (use_svg){
		d3.select('.nearest_node').classed('nearest_node',false);
	    }
            nearest_node.nearest_node = false;
	}
	if (new_nearest_node){ 
            new_nearest_node.nearest_node = true;
	    if (use_svg){
		var svg_node = node[0][new_nearest_idx];
		d3.select(svg_node).classed('nearest_node',true);
	    }
	    dump_details(new_nearest_node);
	}
    }
    nearest_node = new_nearest_node;  // possibly null
}

function draw_edges(){
  if (use_svg){
    link.attr("x1", function(d) { return d.source.fisheye.x; })
        .attr("y1", function(d) { return d.source.fisheye.y; })
        .attr("x2", function(d) { return d.target.fisheye.x; })
        .attr("y2", function(d) { return d.target.fisheye.y; });
  }
  if (use_canvas){
    links_set.forEach(function(e,i){
	/*
	if (! e.target.fisheye) 
	    e.target.fisheye = fisheye(e.target);
	    */
	draw_line(
	    e.source.fisheye.x,e.source.fisheye.y,
	    e.target.fisheye.x,e.target.fisheye.y,
	    e.color);
    });
  }
  if (use_webgl){
      //console.clear();
      var dx = width * xmult,
      dy = height * ymult;
      dx = -1 * cx;
      dy = -1 * cy;
      links_set.forEach(function(e){
	  if (! e.target.fisheye) 
	      e.target.fisheye = fisheye(e.target);
	  if (! e.gl){
	      add_webgl_line(e);
	  }
          var l = e.gl;
	  /*
	  if (e.source.fisheye.x != e.target.fisheye.x &&
	      e.source.fisheye.y != e.target.fisheye.y){
	      alert(e.id + " edge has a length");
	  }
	  */
	  mv_line(l,
		  e.source.fisheye.x,
		  e.source.fisheye.y,
		  e.target.fisheye.x,
		  e.target.fisheye.y);
	  dump_line(l);
      });
  }
  if (use_webgl && false){
    links_set.forEach(function(e,i){
	if (! e.gl) return;
	var v = e.gl.geometry.vertices;
	v[0].x = e.source.fisheye.x;
	v[0].y = e.source.fisheye.y;
	v[1].x = e.target.fisheye.x;
	v[1].y = e.target.fisheye.y;
    });
  }
}

function position_nodes(){
    var n_nodes = nodes.length;
    nodes.forEach(function(node,i){
	//console.log("position_node",d.name);
	if (dragging == node){
	    move_node_to_point(node,last_mouse_pos);
	}
	if (! node.linked) return;
        node.fisheye = fisheye(node);
    });
}



function draw_nodes_in_set(set,radius,center){
    var cx = center[0];
    var cy = center[1]
    var num = set.length;
    set.forEach(function(node,i){
	var rad = 2 * Math.PI * i / num;
	node.rad = rad;
	node.x = cx + Math.sin(rad) * radius;
	node.y = cy + Math.cos(rad) * radius;
	node.fisheye = fisheye(node);
	if (use_canvas){
	    draw_circle(node.fisheye.x,
			node.fisheye.y,
			calc_node_radius(node),
			node.color || 'yellow',
			node.color || 'black'
		       );
	}
	if (use_webgl){
	    mv_node(node.gl,node.fisheye.x,node.fisheye.y);
	}
    });
}
function draw_discards(){
    draw_nodes_in_set(discarded_set,discard_radius,discard_center);
};
function draw_lariat(){
    draw_nodes_in_set(unlinked_set,graph_radius,[cx,cy]);
}

function draw_nodes(){
  if (use_svg){
     node.attr(
	  "transform", 
	  function(d,i) { 
              return "translate(" + d.fisheye.x + "," + d.fisheye.y + ")"; 
	  }
      )
	  .attr("r", calc_node_radius);
  }
  if (use_canvas || use_webgl){
      nodes.forEach(function(d,i){
	  if (! d.linked) return;
	  d.fisheye = fisheye(d);
	  if (use_canvas){
              draw_circle(d.fisheye.x,
			  d.fisheye.y,
			  calc_node_radius(d),
			  d.color || 'yellow',
			  d.color || 'black'
			 );
	  }
	  if (use_webgl){
	      mv_node(d.gl,d.fisheye.x,d.fisheye.y)
	  }
      });
  }
}


function should_show_label(nodey){
    return dist_lt(last_mouse_pos,nodey,label_show_range) 
        || nodey.name.match(search_regex) 
        || label_all_graphed_nodes && nodey.linked;
}

function draw_labels(){
  if (use_svg){
    label.attr("style",function(d){
      if (should_show_label(d)){
        return "";
      } else {
        return "display:none";
      }
    });
  }
  if (use_canvas || use_webgl){
      //http://stackoverflow.com/questions/3167928/drawing-rotated-text-on-a-html5-canvas
      //ctx.rotate(Math.PI*2/(i*6));

      // http://diveintohtml5.info/canvas.html#text
      // http://stackoverflow.com/a/10337796/1234699
      nodes.forEach(function(node){
	  if (! should_show_label(node)) return;
	  if (node.nearest_node){
	      ctx.fillStyle = node.color;
	      ctx.font = "9px sans-serif";
	  } else {
	      ctx.fillStyle = 'black';
	      ctx.font = "7px sans-serif";
	  }
	  if (! node.linked && draw_lariat_labels_rotated){
	      // Flip label rather than write upside down
	      //   var flip = (node.rad > Math.PI) ? -1 : 1;
	      //   view-source:http://www.jasondavies.com/d3-dependencies/
	      ctx.save();
	      ctx.translate(node.fisheye.x,node.fisheye.y);
	      ctx.rotate(-1 * node.rad + Math.PI/2);
	      ctx.fillText(node.name,0,0);
	      ctx.restore();
	  } else {
	      ctx.fillText(node.name,node.fisheye.x,node.fisheye.y);
	  }
      });
  }
}

function clear_canvas(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function blank_screen(){
    if (use_canvas || use_webgl){
	clear_canvas();
    }
}

function tick() {
    //if (nearest_node){	return;    }
    blank_screen();
    draw_dropzones();
    find_nearest_node();
    fisheye.focus(last_mouse_pos);
    //show_last_mouse_pos();
    //find_nearest_node();
    position_nodes();
    draw_edges();
    draw_nodes();
    draw_lariat();
    draw_discards();
    draw_labels();
    update_status();
}

function update_status(){
    var msg = "linked:"+nodes.length +
	" unlinked:"+unlinked_set.length +
	" links:"+links_set.length +
	" discarded:"+discarded_set.length +
	" subjects:"+G.num_subj +
	" chosen:"+chosen_set.length;
    
    if (dragging){
	msg += " DRAG";
    }
    set_status(msg);
}

function svg_restart() {
  link = link.data(links_set);
  
  link.enter().insert("line", ".node")
	.attr("class", function(d){
            //console.log(l.geometry.vertices[0].x,l.geometry.vertices[1].x);
	    return "link";
	});

  link.exit().remove()

  node = node.data(nodes);

  //if (node){ console.log('=================================',node[0]);  }
  node.exit().remove()
  
  var nodeEnter = node.enter().append("g")
      //.attr("class", "node")
      //.attr("class", "lariat")
      .attr("class", "lariat node")
      .call(force.drag);
  
  nodeEnter.append("circle")
      .attr("r", calc_node_radius)
      .style("fill", function(d){d.color;});

  nodeEnter.append("text")
      .attr("class", "label")
      .attr("style","")
      //.attr("dy", "1em")
      .attr("dy", ".35em")
      .attr("dx", ".4em")
      .text(function(d) { return d.name});
  label = svg.selectAll(".label");
  //force.nodes(nodes).links(links_set).start();
}

function canvas_show_text(txt,x,y){
    console.log("canvas_show_text("+txt+")");
    ctx.fillStyle = 'black';
    ctx.font = "12px Courier"
    ctx.fillText(txt,x,y)
}
function pnt2str(x,y){
    return "["+Math.floor(x)+", "+Math.floor(y)+"]";
}
function show_pos(x,y,dx,dy){
    dx = dx || 0;
    dy = dy || 0;
    canvas_show_text(pnt2str(x,y),x+dx,y+dy);
}
function show_line(x0,y0,x1,y1,dx,dy,label){
    dx = dx || 0;
    dy = dy || 0;
    label = typeof label === 'undefined' && '' || label;
    canvas_show_text(pnt2str(x0,y0)+"-->"+pnt2str(x0,y0)+" "+label,
		     x1+dx,y1+dy)
}

function add_webgl_line(e){
    e.gl = add_line(scene,
		      e.source.x,e.source.y,
                      e.target.x,e.target.y,
                      e.source.s.id + " - " + e.target.s.id,
		      'green'
		     );
    //dump_line(e.gl);
}

function webgl_restart(){
    links_set.forEach(function(d){
	add_webgl_line(d);
    });
}

function restart(){
    if (use_svg) svg_restart();
    force.start();
}

function show_last_mouse_pos(){
  draw_circle(last_mouse_pos[0],last_mouse_pos[1],focus_radius,'yellow')
  //console.log(last_mouse_pos,'move');
}

var get_node_by_id = function(node_id,throw_on_fail){
    throw_on_fail = throw_on_fail || false;
    var idx = binary_search_on(nodes,{id:node_id}); // nodes is sorted by id
    if (idx > -1){
	return nodes[idx];
    } else {
	if (throw_on_fail){
	    throw "node with id <"+node_id+"> not found";
	} else {
	    return;
	}
    }
};

var update_flags = function(n){
    /*
    n.linked = n.state == graphed_set;
    n.fixed = ! n.linked;
    return
    */

    var old_linked_status = n.linked;
    n.linked = n.links_shown.length > 0;
    n.fixed = ! n.linked;
    if (n.linked){
	if (! n.links_from_found || ! n.links_to_found){
	    // we do not know, so a click is worth a try
	    n.showing_links = 'some'; 
	} else {
	    if (n.links_from.length + n.links_to.length > n.links_shown.length){
		n.showing_links = 'some';
	    } else {
		n.showing_links = 'all';
	    }
	}
    } else {
	n.showing_links = 'none';
    }
    var changed = old_linked_status != n.linked;
//    return n;
    /*

  if (n.linked){
      //d3.select(node[0][new_nearest_idx]).classed('nearest_node',true);
      unlinked_set.remove(n);
      if (use_svg){
	  var svg_node = node[0][nodes.indexOf(n)];
	  d3.select(svg_node).classed('lariat',false).classed('node',true);
      }
      // node[0][new_nearest_idx]
  } else {
      if (unlinked_set.binary_search(n) == -1){
	  unlinked_set.add(n);
	  //add_to_array(n,unlinked_set)
	  if (use_svg){
	      d3.select(svg_node).classed('lariat',true).classed('node',false);
	  }
      }
  }
  return n;
  */
};
var add_link = function(e){
  //if (links_set.indexOf(e) > -1) return;  // already present
  //console.log(typeof links_set,links_set.prototype.add);
  /*
    console.log('linkes,links_set.add,e');
    console.log(links_set)
    console.log(links_set.add)
    console.log(e)
  */
  links_set.add(e);
  //if (! e.source.links_from) e.source.links_from = [];  // FIXME should use links_from_found
  //if (! e.target.links_to) e.target.links_to = [];
  add_to(e,e.source.links_from);
  add_to(e,e.source.links_shown);
  add_to(e,e.target.links_to);
  add_to(e,e.target.links_shown);
  update_flags(e.source);
  update_flags(e.target);
  restart();
};
var UNDEFINED;
var remove_link = function(e){
  if (links_set.indexOf(e) == -1) return; // not present
  //if (! e.source.links_from) e.source.links_from = [];
  //if (! e.target.links_to) e.target.links_to = [];
  //remove_from(e,e.target.links_to);
  //remove_from(e,e.source.links_from);
  remove_from(e,e.source.links_shown);
  remove_from(e,e.target.links_shown);
  links_set.remove(e);
  update_flags(e.source);
  update_flags(e.target);
};

function remove_ghosts(e){
    if (use_webgl){
	if (e.gl) remove_gl_obj(e.gl);
	delete e.gl;
    }
}
function add_node_ghosts(d){
  if (use_webgl){
    d.gl = add_node(scene,d.x,d.y,3,d.color)
  }
}

function make_edge(s,t,c){
    return {source:s, target:t, color:c||'lightgrey',id:s.id+" "+t.id};
}

var find_links_from_node = function(node) {
    var target;
    var subj = node.s;
    var x = node.x || width/2,
    y = node.y || height/2;
    if (subj){
	for (p in subj.predicates){
	    var predicate = subj.predicates[p]; 
            for (oi = 0; oi < predicate.objects.length; oi++){
		var obj = predicate.objects[oi];
		if (obj.type == RDF_object){
		    target = get_or_make_node(G.subjects[obj.value],[x,y]);
		}
		if (! target) continue;
		var edge = make_edge(node,target);
		add_link(edge);
		/*
                var idx = binary_search_on(nodes,{id:obj.value});
		if (idx < 0){
		    if (obj.type == RDF_object){
			target = get_or_make_node(G.subjects[obj.value],[x,y]);
		    }
		}
		
		if (id2n[obj.value]){
		    var t = get_node_by_id(obj.value);
		    var edge = make_edge(n,t);
		    add_link(edge);
		}
		    */
            }
	    //console.log(p,"==>",predicate);
        }    
    }
};

var find_links_to_node = function(d) {
  if (verbosity >= DEBUG){   
    console.log('find_links_to_node',d);
  }
    var subj = d.s;
    if (subj){
	var parent_point = [d.x,d.y];
	G.get_incoming_predicates(subj).forEach(function(sid_pred){
            //console.log('  sid_pred:',sid_pred);
	    var sid = sid_pred[0];
	    var pred = sid_pred[1];
	    var src = get_or_make_node(G.subjects[sid],parent_point);
	    var edge = make_edge(src, d);
	    // console.log("  edge:",edge);
            add_link(edge);
	});
    }
};
var show_links_to_node = function(n,even_discards) {
    even_discards = even_discards || false;
    if (! n.links_to_found){
	find_links_to_node(n);
	n.links_to_found = true;
    }
    n.links_to.forEach(function(e,i){
	if (! even_discards || e.source.discard) return;
        add_to(e,n.links_shown);
	add_to(e,e.source.links_shown);
        links_set.add(e);
	update_state(e.source);
	update_state(e.target);
        update_flags(e.source);
    });
    force.links(links_set)
    restart();  
};

var update_state = function(node){
    if (node.links_shown.length == 0){
	unlinked_set.acquire(node);
    } else {
	graphed_set.acquire(node);
    }
};
var hide_links_to_node = function(n) {
    n.links_to.forEach(function(e,i){
	remove_from(e,n.links_shown);
	remove_from(e,e.source.links_shown);
	links_set.remove(e);
	remove_ghosts(e);
	update_state(e.source);
	update_flags(e.source);
	update_flags(e.target);
    });
    update_state(n);
    force.links(links_set);
    restart();  
};


var show_links_from_node = function(n,even_discards) {
    even_discards = even_discards || false;
    var subj = n.s;
    if (! n.links_from_found){
	find_links_from_node(n);
	n.links_from_found = true;
    } else {
	n.links_from.forEach(function(e,i){
	    if (! even_discards && e.target.discard) return;
            add_to(e,n.links_shown);
            links_set.add(e);
	    add_to(e,e.target.links_shown);
	    update_state(e.target);
            update_flags(e.target);
	});
    }
    update_state(n);
    force.links(links_set);
    restart();
};

var hide_links_from_node = function(n) {
    // remove every link from .links_shown which is in .links_from
    n.links_from.forEach(function(e,i){
	remove_from(e,n.links_shown);
	remove_from(e,e.target.links_shown);
	links_set.remove(e);
	remove_ghosts(e);
	update_state(e.target);
	update_flags(e.source);
	update_flags(e.target);
    });
    force.links(links_set);
    restart();
}

var G = {};
var start_with_http = new RegExp("http", "ig");
var ids_to_show = start_with_http;
//var blank_writers = new RegExp("_\:[a-z_]{6}");
//var ids_to_show = blank_writers;
//var ids_to_show = new RegExp("", "ig");

var id2n = {}; // the index of linked nodes (in nodes)
var id2u = {}; // the index of unlinked nodes (in unlinked_set)

var get_or_make_node = function(subject,start_point,linked){
  // assumes not already in nodes and id2n
    if (! subject) return;  // uhh, no subject
    var d = get_node_by_id(subject.id);
    if (d) return d; // already exist, return it
    //console.log("get_or_make_node(",subject.id,") MISSING!");
    start_point = start_point || [width/2, height/2];
    //linked = typeof linked === 'undefined' || false;  // WFT!!!!
    linked =  typeof linked === 'undefined' || linked || false;
    var name = subject.predicates[FOAF_name].objects[0].value;
    d = {x: start_point[0], y: start_point[1], 
	 px: start_point[0]*1.01, py: start_point[1]*1.01, 
	 linked:false, // in the graph as opposed to the lariat or hoosegow
	 links_shown: [],
	 links_from: [],  // it being missing triggers it being filled
	 links_from_found: false,
	 links_to: [],
	 links_to_found: false,
	 showing_links: 'none', // none|all|some
	 name: name,
	 s:subject, 
	 //in_count:0, out_count:0
	};
    d.color = color_by_type(d);
    d.id = d.s.id;
    add_node_ghosts(d);
    //if (linked){ 
    var n_idx =  add_to_array(d,nodes);  
    //var n_idx = nodes.push(d) - 1;
    id2n[subject.id] = n_idx;
    if (! linked){
	var n_idx = unlinked_set.acquire(d);
	id2u[subject.id] = n_idx;    
    } else {
	id2u[subject.id] = graphed_set.acquire(d);
    }
    update_flags(d);
    return d;
}

var make_nodes = function(g,limit){
    limit = limit || 0;
    var count = 0;
    for (subj in g.subjects){
      if (verbosity >= DEBUG){
        console.log(subj,g.subjects[subj]);
      }
      if (! subj.match(ids_to_show)) continue;
      var subject = g.subjects[subj];  
	get_or_make_node(subject,[width/2,height/2],false)
      count++;
      if (limit && count >= limit) break;
    }
};

var make_links = function(g,limit){
    limit = limit || 0;
    // for edge labels				   
    //   http://bl.ocks.org/jhb/5955887
    console.log('make_links');
    //for (var i =0 ; i<nodes.length; i++){
    nodes.some(function(node,i){
	var subj = node.s;
	show_links_from_node(nodes[i]);
	if ((limit > 0) && (links_set.length >= limit)) return true; // like break
    });
    console.log('/make_links');
    restart();
}

var showGraph = function(g){
  console.log('showGraph');
  make_nodes(g);
  //show_and_hide_links_from_node(nodes[0]);
  restart();			   
  //make_links(g,Math.floor(nodes.length/10));
  //make_links(g);
  //restart();
};


function load_file(){
    reset_graph();
    var data_uri = $( "select#file_picker option:selected").val();
    set_status(data_uri);
    G = {};
    if (! G.subjects){
	fetchAndShow(data_uri);
    }
    if (use_webgl){
	init_webgl();
    }
}

var wait_for_GreenTurtle = function(){
  if (typeof GreenTurtle === 'undefined') {
    setTimeout(wait_for_GreenTurtle,200);
  } else {
    load_file();
  }
}
var await_the_GreenTurtle = function(){
  try {
    var i = GreenTurtle.implementation;
    load_file();
  } catch (error) {
    console.log(error);
    setTimeout(await_the_GreenTurtle,3000);
  }
}

window.addEventListener('load',function(){
    // This delay is to let GreenTurtle initialize
    // It would be great if there were a hook for this...
    //init_node_radius_policy()
    load_file();
    //await_the_GreenTurtle();
});

var hide_node_links = function(node){
    console.log("hide_node_links("+node.id+")");
    node.links_shown.forEach(function(e,i){
	console.log("  ",e.id);
	if (e.target == node){
	    remove_from(e,e.source.links_shown);
	} else {
	    remove_from(e,e.target.links_shown);	    
	}
	links_set.remove(e);
	update_state(e.target);
	update_state(e.source);
	update_flags(e.target);
	update_flags(e.source);
	remove_ghosts(e);
    });
    node.links_shown = [];
    update_flags(node);
};
var hide_found_links = function(){
    nodes.forEach(function(node,i){
	if (node.name.match(search_regex)){
	    hide_node_links(node);
	}
    });
    restart();
};
var discard_found_nodes = function(){
    nodes.forEach(function(node,i){
	if (node.name.match(search_regex)){
	    discard(node);
	}
    });
    restart();
};

var show_node_links = function(node){
    show_links_from_node(node);
    show_links_to_node(node);
    update_flags(node);
};

var show_found_links = function(){
    for(var sub_id in G.subjects){
	var subj = G.subjects[sub_id];
	subj.getValues('f:name').forEach(function(name){
	    if (name.match(search_regex)){
		var node = get_or_make_node(subj,[cx,cy]);
		if (node){
		    show_node_links(node);
		}
	    }
	});
    }
    restart();
};
var toggle_links = function(){
  //console.log("links",force.links());
  if (! links_set.length){
      make_links(G);
      restart();
  }
  return force.links().length;
};
var toggle_label_display = function(){
    label_all_graphed_nodes = ! label_all_graphed_nodes;
    tick();
};
var hide_all_links = function(){
    nodes.forEach(function(node){
	node.linked = false;
	node.fixed = false;	
	node.links_shown = [];
	node.showing_links = 'none'
	unlinked_set.acquire(node);
    });
    links_set.forEach(function(link){
	remove_ghosts(link);
    });
    links_set.clear();
    chosen_set.clear();
    restart();
    //update_history();
};

var last_status;
var set_status = function(txt){
    txt = txt || ''
    if (last_status != txt){
	console.log(txt);
	$("#status").text(txt);
    }
    last_status = txt;
};
var toggle_display_tech = function(ctrl,tech){
    var val;

    var tech = ctrl.parentNode.id;
    if (tech == 'use_canvas'){
	use_canvas = ! use_canvas;
	if (! use_canvas){
	    clear_canvas();
	}
	val = use_canvas;
    } 
    if (tech == 'use_svg'){
	use_svg = ! use_svg;
	val = use_svg;
    } 
    if (tech == 'use_webgl'){
	use_webgl = ! use_webgl;
	val = use_webgl;
    } 
    ctrl.checked = val;
    tick();
    return true;
}

var unlink = function(unlinkee){
    hide_links_from_node(unlinkee);
    hide_links_to_node(unlinkee);
    unlinked_set.acquire(unlinkee);
    update_flags(unlinkee);
};

/*
  The DISCARDED are those nodes which the user has
  explicitly asked to not have drawn into the graph.
  The user expresses this by dropping them in the 
  discard_dropzone.
*/
var discard = function(goner){
    unchoose(goner);
    unlink(goner);
    //unlinked_set.remove(goner);
    discarded_set.acquire(goner);
    update_flags(goner);
    //goner.discarded = true;
    //goner.state = discarded_set;
};
var undiscard = function(prodigal){
    //discarded_set.remove(prodigal);
    unlinked_set.acquire(prodigal);
    update_flags(prodigal);
};


/*
  The CHOSEN are those nodes which the user has
  explicitly asked to have the links shown for.
  This is different from those nodes which find themselves
  linked into the graph because another node has been chosen.
 */
var unchoose = function(goner){
    delete goner.chosen;
    chosen_set.remove(goner);
    hide_node_links(goner);
    unlinked_set.acquire(goner);
    update_flags(goner);
    //update_history();
}
var choose = function(chosen){
    // There is a flag .chosen in addition to the state 'linked'
    // because linked means it is in the graph
    chosen_set.add(chosen);
    show_links_from_node(chosen);
    show_links_to_node(chosen);
    if (chosen.links_shown){
	//chosen.state = 'linked';
	graphed_set.acquire(chosen);
	chosen.showing_links = 'all';
    } else {
	//chosen.state = unlinked_set;
	unlinked_set.acquire(chosen);
    }
    update_state(chosen);
    update_flags(chosen);
    chosen.chosen = true;
    //update_history();
}
var update_history = function(){
    if (history.pushState){
	var the_state = {};
	var hash = '';
	if (chosen_set.length){
	    the_state.chosen_node_ids = [];
	    hash += '#';
	    hash += "chosen=";
	    var n_chosen = chosen_set.length;
	    chosen_set.forEach(function(chosen,i){
		hash += chosen.id;
		the_state.chosen_node_ids.push(chosen.id);
		if (n_chosen > i+1){
		    hash += ',';
		}
	    });
	}
	var the_url = location.href.replace(location.hash,"") + hash;
	var the_title = document.title;
	history.pushState(the_state,the_title,the_state);
    }
}
window.addEventListener('popstate',function(event){
    //console.log('popstate fired',event);
    restore_graph_state(event.state);
});

var restore_graph_state = function(state){
    //console.log('state:',state);
    if (! state) return;
    if (state.chosen_node_ids){
	reset_graph();
	state.chosen_node_ids.forEach(function(chosen_id){
	    var chosen = get_or_make_node(chosen_id);
	    if (chosen){
		choose(chosen);
	    }
	});
    }
}
