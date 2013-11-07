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

var add_to =  function(itm,array){
    // Perform the set operation of adding itm to the Array if not already present
    //console.log("adding....",itm,'to',this);
    var idx = array.indexOf(itm);
    if (idx == -1){
      idx = array.push(itm) - 1;
    }
    return idx;
  };

//if (Array.__proto__.add == null) Array.prototype.add = add;

var nodes, links, node, link, unlinked_nodez;
var nearest_node;
var lariat;
var label_all_graphed_nodes = false; // keep synced with html
var verbose = true;
var verbosity = 0;
var TEMP = 5;
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

  if (nearest_node){
      var clickee = nearest_node;
      console.log("clickee",clickee.showing_links,clickee.name);
      if (clickee.showing_links == 'all'){
          hide_links_from_node(clickee);
          hide_links_to_node(clickee);
	  clickee.showing_links = 'none';
      } else {
          show_links_from_node(clickee);
          show_links_to_node(clickee);
          clickee.showing_links = 'all';
      }
      update_linked_flag(clickee);
  }
  force.links(links);
    //console.log();
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
var gravity = 0.3;
var label_show_range = link_distance * 1.1;
var graph_radius = 100;
var fisheye_radius = label_show_range * 5;
var focus_radius = label_show_range;
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
    graph_radius = Math.floor(Math.min(width/2,height/2)) * .9;
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
  sid2node = {};
  nodes = [];
  unlinked_nodez = [];
  links = [];
  force.nodes(nodes);
  d3.select(".link").remove();
  d3.select(".node").remove();
  d3.select(".lariat").remove();

   //nodes = force.nodes();
   //links = force.links();

  node  = svg.selectAll(".node");
  link  = svg.selectAll(".link");
  lariat = svg.selectAll(".lariat");

  link = link.data(links);
  
  link.exit().remove();

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

function names_in_edges(array){
  out = [];
  array.forEach(
    function(itm){
      out.push(itm.source.name+" ---> " + itm.target.name);
    }
  );
  return out;
}

var DUMP = true;
function dump_details(d,s){
    if (! DUMP){
      if (d.s.id != '_:E') return;
    }
    console.log("\\dump_details ======================");
    console.log("  ",d.name);
    console.log("  in:",d.links_to && d.links_to.length || 
		        d.links_to,
                        names_in_edges(d.links_to));
    console.log("  out:", d.links_from && d.links_from.length || d.links_from,
	                names_in_edges(d.links_from || []));
    console.log("  shown:", d.links_shown.length,names_in_edges(d.links_shown));
    console.log("  class:", s.getAttribute('class'));
    console.log("  showing_links:", d.showing_links);
    console.log("/dump_details ======================");
}

function tick() {
  fisheye.focus(last_mouse_pos);
  // if huvisgl is commented out then we do not update WebGL
  if (typeof xmult != 'undefined'){ 
    links.forEach(function(d){
        var l = d.line;
        l.geometry.vertices[0].x = d.source.x * xmult - cx;
        l.geometry.vertices[1].x = d.target.x * xmult - cx;
        l.geometry.vertices[0].y = d.source.y * ymult + cy;
        l.geometry.vertices[1].y = d.target.y * ymult + cy;
    });
  }

  var new_nearest_node;
  var new_nearest_idx;
  var focus_threshold = focus_radius * 1;
  var close_nodes = [];
  node.each(function(d,i) {
      var dist = distance(d,last_mouse_pos);
      if (dist <= focus_threshold){
          new_nearest_node = d;
          focus_threshold = dist;
          new_nearest_idx = i;
      }
  });
  if (nearest_node != new_nearest_node){
      if (nearest_node){
        d3.select('.nearest_node').classed('nearest_node',false);
      }
      if (new_nearest_node){ 
          var svg_node = node[0][new_nearest_idx];
          d3.select(svg_node).classed('nearest_node',true);
	  dump_details(new_nearest_node,svg_node)
          if (verbosity >= DEBUG) {
            console.log("new nearest_node:",new_nearest_node.s.id);
          }
      }
  }
  nearest_node = new_nearest_node;  // possibly null
  
  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  var n_nodes = nodes.length;
  node.attr("transform", function(d,i) { 
      if (! d.linked){
          var rad = 6.2832 * i / n_nodes + 3.14159;
	  d.x = cx + Math.sin(rad) * graph_radius;
	  d.y = cy + Math.cos(rad) * graph_radius;
	  //d.fixed = true;
      }
      d.fisheye = fisheye(d);
      var x = d.fisheye.x;
      var y = d.fisheye.y;
      return "translate(" + x + "," + y + ")"; })
    .attr("r", node_radius_by_links);

  label.attr("style",function(d){
      var name = $(this).text();
      if (dist_lt(last_mouse_pos,d,label_show_range) 
          || name.match(search_regex) 
          || label_all_graphed_nodes && d.linked){
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
	.attr("class", function(d){
            if (typeof xmult != 'undefined'){ // if huvisgl is commented out then we do not update WebGL
               var l = add_line(scene,
		                d.source.x,d.source.y,
                                d.target.x,d.target.y,
                                d.source.s.id + " - " + d.target.s.id
		    );
               d.line = line;
            }
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
      .attr("r", node_radius_by_links)
      .style("fill", color_by_type);

  nodeEnter.append("text")
      .attr("class", "label")
      .attr("style","")
      //.attr("dy", "1em")
      .attr("dy", ".35em")
      .attr("dx", ".4em")
      .text(function(d) { return d.name});
  label = svg.selectAll(".label");
  //force.nodes(nodes).links(links).start();
  force.start();
}

function mousemove() {
  last_mouse_pos = d3.mouse(this);
  cursor.attr("transform", "translate(" + last_mouse_pos + ")");
  tick();
}

var get_linked_or_unlinked_node = function(subj_id){
  return sid2node[subj_id];
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

var sort_nodes_by_name = function(a,b){
    if (a.name == b.name){
	return 0;
    } else if (a.name > b.name){
	return 1;
    } else {
	return -1
    }
}

var sort_by_current_sort_order = function(arr){
    return arr.sort(sort_nodes_by_name);
};

var INCOMPLETE_insert_into_sorted_and_indexed = function(itm,array,cmp,idx){
    if (! array.length){
	itm.srt_idx = array.push(itm) -1;
	return itm.srt_idx;
    }
    idx = idx || int(array.length/2);
    var mid = array[mid_idx];
    var c = cmp(itm,mid);
    if (c == 0){
	array.splice(mid_idx,0,itm);
    } 
};



var update_linked_flag = function(n){
  n.linked = n.links_shown.length > 0;
  n.fixed = ! n.linked;
  if (n.linked){
      if (! n.links_from_found || ! n.links_to_found){
	  n.showing_links = 'some'; // we do not know, so a click is worth a try
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
  var name = n.name;

  if (n.linked){
      //d3.select(node[0][new_nearest_idx]).classed('nearest_node',true);
      remove_from(n,unlinked_nodez);
      var svg_node = node[0][nodes.indexOf(n)];
      d3.select(svg_node).classed('lariat',false).classed('node',true);
      // node[0][new_nearest_idx]
  } else {
      if (unlinked_nodez.indexOf(n) == -1){
	  unlinked_nodez.push(n);
	  d3.select(svg_node).classed('lariat',true).classed('node',false);
	  sort_by_current_sort_order(unlinked_nodez);
      }
  }

  //console.log("linked:",n.linked,name);
  //console.log(n.links_shown);
  //name = "in:" +n.in_count + " out:" +n.out_count + "  " + name;
  //console.log(n);
  //if (n.in_count < 0 || n.out_count < 0) {console.log(name)};
  return name;
};
var add_link = function(e){
  //if (links.indexOf(e) > -1) return;  // already present
  //console.log(typeof links,links.prototype.add);
  /*
    console.log('linkes,links.add,e');
    console.log(links)
    console.log(links.add)
    console.log(e)
  */
  add_to(e,links);
  //if (! e.source.links_from) e.source.links_from = [];  // FIXME should use links_from_found
  //if (! e.target.links_to) e.target.links_to = [];
  add_to(e,e.source.links_from);
  add_to(e,e.source.links_shown);
  add_to(e,e.target.links_to);
  add_to(e,e.target.links_shown);
  update_linked_flag(e.source);
  update_linked_flag(e.target);
  restart();
};
var remove_from = function(doomed,array){
    var idx = array.indexOf(doomed);
    if (idx > -1){
	array.splice(idx,1);
    }
};
var UNDEFINED;
var remove_link = function(e){
  if (links.indexOf(e) == -1) return; // not present
  //if (! e.source.links_from) e.source.links_from = [];
  //if (! e.target.links_to) e.target.links_to = [];
  //remove_from(e,e.target.links_to);
  //remove_from(e,e.source.links_from);
  remove_from(e,links);
  remove_from(e,e.source.links_shown);
  remove_from(e,e.target.links_shown);
  update_linked_flag(e.source);
  update_linked_flag(e.target);
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
		    //t.in_count++;
		    //n.out_count++;
		    //n.links_from.push(edge);
		    add_link(edge);
		    //update_linked_flag(t);
                    //update_linked_flag(n);
		}
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
	    var src = make_node_if_missing(G.subjects[sid],parent_point);
	    //var src = get_node_for_linking(sid);
	    var edge = {source:src, target:d};
	    // console.log("  edge:",edge);
            add_link(edge);


	    //d.links_to.push(edge);
            //links.push(edge);
	    //update_linked_flag(d);
	    //update_linked_flag(src);
	});
    }
};
var show_links_to_node = function(n) {
  //if (! n.links_to_found){
    find_links_to_node(n);
    n.links_to_found = true;
  //}
    n.links_to.forEach(
      function(e,i){
        console.log('adding link from',e.source.name);
        add_to(e,n.links_shown);
	add_to(e,e.source.links_shown);
        add_to(e,links);
        update_linked_flag(e.source);
      }
    )
 
  force.links(links)
  restart();  
};
var hide_links_to_node = function(n) {
  n.links_to.forEach(
    function(e,i){
      remove_from(e,n.links_shown);
      remove_from(e,e.source.links_shown);
      remove_from(e,links);
      update_linked_flag(e.source);
    }
  );
  force.links(links);
  restart();  
};


var show_links_from_node = function(n) {
  var subj = n.s;
  if (! n.links_from_found){
    find_links_from_node(n);
    n.links_from_found = true;
  } else {
    n.links_from.forEach(
      function(e,i){
        add_to(e,n.links_shown);
        add_to(e,links);
	add_to(e,e.target.links_shown);
        update_linked_flag(e.target);
      }
    );
  }
  force.links(links);
  restart();
};

var hide_links_from_node = function(n) {
  // remove every link from .links_shown which is in .links_from
  n.links_from.forEach(
    function(e,i){
      remove_from(e,n.links_shown);
      remove_from(e,links);
      remove_from(e,e.target.links_shown);
      update_linked_flag(e.target);
    }
  );
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


var G = {};
var start_with_http = new RegExp("http", "ig");
var ids_to_show = start_with_http;
//var blank_writers = new RegExp("_\:[a-z_]{6}");
//var ids_to_show = blank_writers;
//var ids_to_show = new RegExp("", "ig");

var id2n = {}; // the index of linked nodes (in nodes)
var sid2node = {}; // index of subj.id to node (eg. {name:"Anglican Church",x:,y:,s:,}
var id2u = {}; // the index of unlinked nodes (in unlinked_nodez)

var make_node_if_missing = function(subject,start_point,linked){
  // assumes not already in nodes and id2n
  if (! subject) return;  // uhh, no subject
  var d = get_linked_or_unlinked_node(subject.id);
  if (d) return d; // already exist, return it
  //console.log("make_node_if_missing(",subject.id,") MISSING!");
  start_point = start_point || [width/2, height/2];
  linked = typeof linked === 'undefined' || false;
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
  if (true){ 
    var n_idx = nodes.push(d) - 1;
    id2n[subject.id] = n_idx;
    sid2node[subject.id] = d;
  } else {
    var n_idx = unlinked_nodez.push(d) - 1;
    id2u[subject.id] = n_idx;    
  }
  update_linked_flag(d);
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
  //make_links(g,Math.floor(nodes.length/10));
  //make_links(g);
  restart();
};


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

var hide_node_links = function(node){
    hide_links_from_node(node);
    hide_links_to_node(node);
    //node.linked = false;

};
var hide_found_links = function(){
  for(var sub_id in G.subjects){
    var subj = G.subjects[sub_id];
    subj.getValues('f:name').forEach(function(name){
      if (name.match(search_regex)){
          var n_idx = id2n[sub_id];
          var node  = nodes[n_idx];
          if (node){
          //console.log(sub_id,name,id2n[sub_id]);
          //console.log(node);
            hide_node_links(node);
            restart();
          }
      }
    });
  }
};

var show_node_links = function(node){
    show_links_from_node(node);
    show_links_to_node(node);
};
var show_found_links = function(){
  for(var sub_id in G.subjects){
    var subj = G.subjects[sub_id];
    subj.getValues('f:name').forEach(function(name){
      if (name.match(search_regex)){
          var n_idx = id2n[sub_id];
          var node  = nodes[n_idx];
          if (node){
          //console.log(sub_id,name,id2n[sub_id]);
          //console.log(node);
            show_node_links(node);
            restart();
          }
      }
    });
  }
};
var toggle_links = function(){
  //console.log("links",force.links());
  if (! links.length){
      make_links(G);
      restart();
  }
  return force.links().length;
};
var toggle_label_display = function(){
  label_all_graphed_nodes = ! label_all_graphed_nodes;
  tick();
};
var clear_box = function(){
  $("#status").text('');
};
