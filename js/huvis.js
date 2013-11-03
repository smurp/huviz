/*

See for inspiration:
  Collapsible Force Layout
    http://bl.ocks.org/mbostock/1093130
  Force-based label placement
    http://bl.ocks.org/MoritzStefaner/1377729
  Graph with labeled edges:
    http://bl.ocks.org/jhb/5955887

 */

var nodes, links, node, link, unlinked_nodez, links_to_nodes_idx;

var verbose = true;
var verbosity = 0;
var COARSE = 10;
var MODERATE = 20;
var DEBUG = 40;

if (! verbose){
  console = {'log': function(){}};
}



var last_mouse_pos = [0,0];
var parseAndShow = function(data,textStatus){
  $("#status").text("parsing");
  console.log('parsing');
  var msg = "data was "+data.length+" bytes";
  var parse_start_time = new Date();
  G = GreenTurtle.implementation.parse(data,'text/turtle');
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
  if (is_a_main_node(d)){
     return 'blue';  // the 1305 writers
  } else { 
    try {
      //console.log("coloring",d.s.predicates);
      if (has_type(d.s,FOAF_Group)){
         return 'green'; // Groups
      } else {
         return 'red'; // other persons
      }
    } catch (err) {
      console.log(err);
      return 'yellow';
    }
  }
}

var mousedown_point = [cx,cy];
function register_mousedown_point(){
  mousedown_point = d3.mouse(this);
}

function distance(p1,p2){
  var x = (p1.x || p1[0]) - (p2.x || p2[0]);
  var y = (p1.y || p1[1]) - (p2.y || p2[1]);
  return Math.sqrt(x * x + y * y);
}

function click_to_toggle_edges(){
  var point = d3.mouse(this);
  //console.log(point,mousedown_point,distance(point,mousedown_point));
  
  if (distance(point,mousedown_point) > drag_dist_threshold){
    return;  // it was a drag, not a click
  }
  var dist = 3;
  // find first node within dist and show edges
  nodes.forEach(function(target) {
    if (distance(target,point) < dist) {
       //console.log(point,x,y,target);
       if (target.links_from){
         hide_links_from_node(target);
       } else {
         show_links_from_node(target);
       }
	if (target.links_to){
	    hide_links_to_node(target);
	} else {
	    show_links_to_node(target);
	}
    }
  });

  restart();
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
var gravity = 0.1;
var label_show_range = link_distance * 1.1;
var graph_radius = 100;
var fisheye_radius = label_show_range * 5;
var drag_dist_threshold = 5;
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
  graph_radius = Math.floor(Math.min(width/2,height/2));
};
function updateWindow(){
    get_window_width();
    get_window_height();
    update_graph_radius();
    svg.attr("width", width).attr("height", height);
    force.size([width,height]);
    restart();
}
window.onresize = updateWindow;


/////////////////////////////////////////////////////////////////////////////


get_window_height();
get_window_width();
update_graph_radius();


var fisheye = d3.fisheye.circular().radius(fisheye_radius).distortion(2.8);

// 
//   http://bl.ocks.org/mbostock/929623

var fill = d3.scale.category20();


var force = d3.layout.force()
    .size([width, height])
    .nodes([]) // initialize with no nodes
    .linkDistance(link_distance)
    .charge(charge)
    .gravity(gravity)
    .on("tick", tick);

var svg = d3.select("#vis").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("position", "absolute")
    .on("mousemove", mousemove)
    .on("mousedown", register_mousedown_point)
    .on("mouseup", click_to_toggle_edges);

svg.append("rect")
    .attr("width", width)
    .attr("height", height);



function reset_graph(){
  id2n = {};
  nodes = [];
  unlinked_nodez = [];
  links_to_nodes_idx = {};
  links = [];
  force.nodes(nodes);
  $(".link").remove();
  $(".node").remove();

   //nodes = force.nodes();
   //links = force.links();

  node  = svg.selectAll(".node");
  link  = svg.selectAll(".link");

  link = link.data(links);
  
  link.exit().remove()

  node = node.data(nodes);

  node.exit().remove();

  force.start();
}
reset_graph();

var cursor = svg.append("circle")
    .attr("r", label_show_range*2)
    .attr("transform", "translate("+cx+","+cy+")")
    .attr("class", "cursor");


//node.on("doubleclick", function(d){alert(d.s.id);});

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

function node_radius_by_links(d) {
  return 3;
  return d.links_from ? d.links_from.length : d.in_count || 3;
  if (d.links_from){
    return 3;
  } else {
    return 5;
  }
}

function tick() {
  fisheye.focus(last_mouse_pos);
  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  node.attr("transform", function(d,i) { 
      d.fisheye = fisheye(d);
      var x = d.fisheye.x;
      var y = d.fisheye.y;
      return "translate(" + x + "," + y + ")"; })
    .attr("r", node_radius_by_links);

  label.attr("style",function(d){
      var name = $(this).text();
      if (dist_lt(last_mouse_pos,d,label_show_range) || name.match(search_regex)){
        return "";
      } else {
        return "display:none";
      }
   });

  link.attr("x1", function(d) { return d.source.fisheye.x; })
      .attr("y1", function(d) { return d.source.fisheye.y; })
      .attr("x2", function(d) { return d.target.fisheye.x; })
      .attr("y2", function(d) { return d.target.fisheye.y; });
}

function restart() {

  link = link.data(links);
  
  link.enter().insert("line", ".node")
      .attr("class", "link");

  link.exit().remove()

  node = node.data(nodes);

  //if (node){ console.log('=================================',node[0]);  }
  node.exit().remove()
  
  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .call(force.drag);
  
  nodeEnter.append("circle")
      .attr("r", node_radius_by_links)
      .style("fill", color_by_type);

  nodeEnter.append("text")
      .attr("class", "label")
      .attr("style","")
      //.attr("dy", "1em")
      .attr("dy", ".35em")
      .attr("dx", ".4em")
      .text(function(d) { 
        var name = ' ';
        try {
          name = d.s.predicates['http://xmlns.com/foaf/0.1/name'].objects[0].value;
        } catch (err) {
          console.log(err);
        }
        return name;
      });
  label = svg.selectAll(".label");
  //force.nodes(nodes).links(links).start();
  force.start();
}

function mousemove() {
  last_mouse_pos = d3.mouse(this);
  fisheye.focus(last_mouse_pos);
  node.each(function(d) { d.fisheye = fisheye(d); })
      .attr("transform", function(d){
         return "translate(" + d.fisheye.x + "," + d.fisheye.y + ")";
      })
      .attr("r", function(d) { return d.fisheye.z * 4.5; });

  link.attr("x1", function(d) { return d.source.fisheye.x; })
      .attr("y1", function(d) { return d.source.fisheye.y; })
      .attr("x2", function(d) { return d.target.fisheye.x; })
      .attr("y2", function(d) { return d.target.fisheye.y; });
  cursor.attr("transform", "translate(" + last_mouse_pos + ")");
  tick();
}

var get_linked_or_unlinked_node = function(node_id){
  return id2u[node_id] || id2n[node_id];
};
var node_exists = get_linked_or_unlinked_node;

var get_node_for_linking = function(node_id){
  /*
     We find a node either already among the linked nodes
     or among the unlinked nodes and ensure that it is
     among the linked nodes.
   */
   if (id2u[node_id]){
     id2n[node_id] = nodes.push(d) - 1;
     delete id2u[node_id];
   }
   if (id2n[node_id]) return nodes[id2n[node_id]];
};

var find_links_from_node = function(n) {
    var a_node;
    var subj = n.s;
    var x = n.x || width/2,
    y = n.y || height/2;
    if (subj){
	for (p in subj.predicates){
	    var predicate = subj.predicates[p]; 
            for (oi = 0; oi < predicate.objects.length; oi++){
		var obj = predicate.objects[oi];
		if (! id2n[obj.value]){
		    if (obj.type == RDF_object){
			a_node = make_node_if_missing(G.subjects[obj.value],[x,y]);
		    }
		}
		
		if (id2n[obj.value]){
		    var t = get_node_for_linking(obj.value);
		    var edge = {source: n, target: t};
		    t.in_count++;
		    n.links_from.push(edge);
		}
            }
	    //console.log(p,"==>",predicate);
        }    
    }
};

var build_links_to_nodes_idx = function(){
    nodes.forEach(function(d){
	for (p in d.s.predicates){
	    var predicate = d.s.predicates[p]; 
	    for (oi = 0; oi < predicate.objects.length; oi++){
		var obj = predicate.objects[oi];
		if (obj && obj_has_type(obj,RDF_object)){
		    if (typeof links_to_nodes_idx[obj.value] == 'undefined'){
			links_to_nodes_idx[obj.value] = [];			
		    }
		    links_to_nodes_idx[obj.value].push([d.s.id,p]);
		}
            }    
	}
    })
    //console.log("the Beeb is linked to by",links_to_nodes_idx['_:CN']);
};
var find_links_to_node = function(d) {
  if (verbosity >= DEBUG){   
    console.log('find_links_to_node',d);
  }
    var subj = d.s;
    if (subj){
        /*
	if (! links_to_nodes_idx[subj.id]){
	    build_links_to_nodes_idx();
	}
	*/
	var parent_point = [d.x,d.y];
	//console.log('parent_point',parent_point);
	(links_to_nodes_idx[subj.id] || []).forEach(function(sid_pred){
            //console.log('  sid_pred',sid_pred);
	    var sid = sid_pred[0];
	    var pred = sid_pred[1];
	    //console.log("  ",sid,pred);
	    var a_node = make_node_if_missing(G.subjects[sid],parent_point);
	    var src = get_node_for_linking(sid);
	    var edge = {source:src, target:d};
	    d.in_count++; // FIXME d.out_count++ or src.in_incount++ ?
	    d.links_to.push(edge);
            links.push(edge);
	});
    }
};
var show_links_to_node = function(n) {
  if (verbosity >= DEBUG){
    console.log("========= show_links_to_node",{
	  n:n,
          _links_to:n._links_to,
	  links_to:n.links_to});
  }
  var subj = n.s;
  if (n._links_to){
    n.links_to = n._links_to;
    delete n._links_to;
  } else {
    n.links_to = [];
    find_links_to_node(n);
  }
  for (var i = 0; i < n.links_to.length; i++){
    links.push(n.links_to[i]);
  }
  force.links(links)
  //console.log("  links.length",links.length)
  restart();  
};
var hide_links_to_node = function(n) {
  if (verbosity >= DEBUG){
    console.log("========= hide_links_to_node",{
	n:n,
	_links_to:n._links_to,
	links_to:n.links_to});
  }
  var subj = n.s;
  if (n.links_to){
    n._links_to = n.links_to;
    delete n.links_to;
  } else {
    n._links_to = [];
  }
  //console.log("links.length",links.length);
  for (var l = links.length - 1; l >= 0 ; l--){
    var link = links[l];
    if ($.inArray(link,n._links_to) > -1){ // if link in n._links_to
      if (verbosity >= DEBUG){
        //console.log('pruning edge',link);
      }
      link.target.out_count--;
      links.splice(l,1);
      if (! is_node_to_always_show(link.target) && (link.target.out_count <= 0)){
        remove_node(link.target);
      }
    }
  }
  force.links(links);
  //console.log("  links.length",links.length)
  restart();
};


var show_links_from_node = function(n) {
  var subj = n.s;
  if (n._links_from){
    n.links_from = n._links_from;
    delete n._links_from;
  } else {
    n.links_from = [];
    find_links_from_node(n);
  }
  for (var i = 0; i < n.links_from.length; i++){
    links.push(n.links_from[i]);
  }
  restart();
};

var hide_links_from_node = function(n) {
  var subj = n.s;
  if (n.links_from){
    n._links_from = n.links_from;
    delete n.links_from;
  } else {
    n._links_from = [];
  }
  for (var l = links.length - 1; l >= 0 ; l--){
    var link = links[l];
    if ($.inArray(link,n._links_from) > -1){ // if link in n._links_from
      if (verbosity >= DEBUG){
        //console.log('pruning edge',link);
      }
      link.target.in_count--;
      links.splice(l,1);
      if (! is_node_to_always_show(link.target) && (link.target.in_count <= 0)){
        remove_node(link.target);
      }
    }
  }
  /*
  if (verbosity >= MODERATE){
    console.log("=========hide_links_from_node",n);
    console.log("links.length",links.length)
    //console.log("links_pruned.length",links_pruned.length);
  }
  */
  force.links(links);
  restart();
}

var remove_node = function(d){
  if (verbosity >= DEBUG){
    //console.log('remove_node',d);
  }
  // var node_idx = id2n[d.s.id]
  //delete id2n[subject.id];
  //nodes.
}

var click_to_make_nodes_and_edges = function(){
  var point = d3.mouse(this),
      node = {x: point[0], y: point[1]},
      n = nodes.push(node);

  // add links to any nearby nodes
  nodes.forEach(function(target) {
    var x = target.x - node.x,
        y = target.y - node.y;
    if (Math.sqrt(x * x + y * y) < 30) {
      links.push({source: node, target: target});
    }
  });

  restart();
};

var G = {};
var start_with_http = new RegExp("http", "ig");
var ids_to_show = start_with_http;
//var blank_writers = new RegExp("_\:[a-z_]{6}");
//var ids_to_show = blank_writers;
//var ids_to_show = new RegExp("", "ig");

var id2n = {}; // the index of linked nodes (in nodes)
var id2u = {}; // the index of unlinked nodes (in unlinked_nodez)

var make_node_if_missing = function(subject,start_point,linked){
  // assumes not already in nodes and id2n
  if (! subject) return;  // uhh, no subject
  var d = get_linked_or_unlinked_node(subject.id);
  if (d) return d; // already exist, return it
  start_point = start_point || [width/2, height/2];
  d = {x: start_point[0], y: start_point[1], 
       px: start_point[0]*1.01, py: start_point[1]*1.01, 
       s:subject, in_count:0, out_count:0};
  linked = true;
  if (linked){
    var n_idx = nodes.push(d) - 1;
    id2n[subject.id] = n_idx;
  } else {
    var n_idx = unlinked_nodez.push(d) - 1;
    id2u[subject.id] = n_idx;    
  }
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
      make_node_if_missing(subject,[width/2,height/2])
      count++;
      if (limit && count >= limit) break;
    }
};


var make_links = function(g,limit){
    limit = limit || 0;
    // for edge labels				   
    //   http://bl.ocks.org/jhb/5955887
    console.log('make_links');
    for (var i =0 ; i<nodes.length; i++){
      var subj = nodes[i].s;
      show_links_from_node(nodes[i]);
      if ((limit > 0) && (links.length >= limit)) break;
    }
    console.log('/make_links');
    restart();
  }


var showGraph = function(g){
  console.log('showGraph');
  make_nodes(g);
  //show_and_hide_links_from_node(nodes[0]);
  restart();			   
  build_links_to_nodes_idx();  
  //make_links(g,Math.floor(nodes.length/10));
  //make_links(g);
  restart();
};

var orlando_data_uri = "data/test_100.ttl";
var orlando_data_uri = "data/test_40.ttl";
//var orlando_data_uri = "data/test_10.ttl";
//var orlando_data_uri = "data/test_20.ttl";
//var orlando_data_uri = "data/test_5.ttl";
//var orlando_data_uri = "data/test_2.ttl";
//var orlando_data_uri = "data/all.ttl";
//var orlando_data_uri = "http://www.w3.org/TeamSubmission/turtle/example2.ttl";
//var orlando_data_uri = "http://www.w3.org/TeamSubmission/turtle/example1.ttl";

function load_file(){
  reset_graph();
  var data_uri = $( "select#file_picker option:selected").val();
  console.log(data_uri);
  G = {};
  if (! G.subjects){
    fetchAndShow(data_uri);
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
   load_file();
   //await_the_GreenTurtle();
});


var toggle_links = function(){
  console.log("links",force.links());
  if (! links.length){
      make_links(G);
      restart();
  }
  return force.links().length;
};

var clear_box = function(){
  $("#status").text('');
};
