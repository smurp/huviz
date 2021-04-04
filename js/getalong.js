
/*
from http://bl.ocks.org/sxv/4491174

An experiment exploring the DOM's performance with large numbers of nodes.

*/

/* SET UP ENV */

var searchParams = new URL(document.location).searchParams;
var numSVG = searchParams.get('svg') || 100;
var numDIV = searchParams.get('div') || 100;
var numCANVAS = searchParams.get('canvas') || 100;
var divText = searchParams.get('text') || false;

var map = {}, $circle, $div;
map.width = window.innerWidth;
map.height = window.innerHeight;

map.canvas =
  d3.select('body')
  .append('canvas')
  .attr('width', map.width)
  .attr('height', map.height)
  .node().getContext('2d');

map.svg =
  d3.select('body')
  .append('svg')
  .attr('width', map.width)
  .attr('height', map.height)
  .append('g');

map.svg.append('rect')
  .attr('class', 'overlay')
  .attr('width', map.width)
  .attr('height', map.height);

map.divs =
  d3.select('body')
  .append('div').attr('class', 'divs')
  .attr('style', function(d) { return 'width: ' + map.width + 'px; height: ' + map.height + 'px;'; });


/* PREPARE DATA and SCALES */

map.canvas.nodes =
  d3.range(numCANVAS).map(function(d, i) {
    return {
      x: Math.random() * map.width / 2,
      y: Math.random() * map.height / 2,
      r: Math.random() * 10 + 3
    };
  });
map.svg.nodes =
  d3.range(numSVG).map(function(d, i) {
    return {
      x: Math.random() * map.width / 2,
      y: Math.random() * map.height / 2,
      r: Math.random() * 10 + 3
    };
  });
map.divs.nodes =
  d3.range(numDIV).map(function(d, i) {
    return {
      x: Math.random() * map.width / 2,
      y: Math.random() * map.height / 2,
      r: Math.random() * 10 + 3
    };
  });

map.nodes = map.svg.nodes.concat( map.canvas.nodes, map.divs.nodes );
var root = map.nodes[0];
root.r = 0;
root.fixed = true;

var x =
    d3.scale.linear()
    .domain([0, map.width])
    .range([0, map.width]);

var y =
    d3.scale.linear()
    .domain([0, map.height])
    .range([map.height, 0]);


/* PLOT */

map.canvas.draw =
  function() {
    map.canvas.clearRect(0, 0, map.width, map.height);
    map.canvas.beginPath();
    var i = -1, cx, cy;
    while (++i < map.canvas.nodes.length) {
      d = map.canvas.nodes[i];
      cx = x( d.x );
      cy = y( d.y );
      map.canvas.moveTo(cx, cy);
      map.canvas.arc(cx, cy, d.r, 0, 2 * Math.PI);
    }
    map.canvas.fill();
  };

map.svg.draw =
  function() {
    $circle =
      map.svg.selectAll('circle')
      .data(map.svg.nodes).enter()
      .append('circle')
      .attr('r', function(d) { return d.r; })
      .attr('fill', 'blue')
      .attr('transform', map.svg.transform);
  };

map.divs.draw =
  function() {
    $div =
      map.divs.selectAll('div')
      .data(map.divs.nodes).enter()
      .append('div')
      .text(function(d,i){if (divText) {return i}})
      .attr('style', function(d) { return 'width: ' + (d.r * 2) + 'px; height: ' + (d.r * 2) + 'px; margin-left: -' + d.r + 'px; margin-top: -' + d.r + 'px;'; });
  };

map.canvas.draw();
map.svg.draw();
map.divs.draw();

map.redraw = function() {
  map.canvas.draw();
  $circle.attr('transform', map.svg.transform);
  $div.style('left', function(d) { return x(d.x) + 'px'; })
    .style('top', function(d) { return  y(d.y) + 'px'; });
};

map.svg.transform =
  function(d) {
    return 'translate(' + x( d.x ) + ',' + y( d.y ) + ')';
  };


/* FORCE */

var force =
    d3.layout.force()
    .gravity(0.05)
    .charge( function(d, i) { return i ? 0 : -2000; } )
    .nodes(map.nodes)
    .size([map.width, map.height])
    .start();

force.on('tick', function(e) {
  var q = d3.geom.quadtree(map.nodes), i;
  for (i = 1; i < map.nodes.length; ++i) {
    q.visit( collide(map.nodes[i]) );
  }
  map.redraw();
});

function collide(node) {
  var r = node.r + 16,
      nx1 = node.x - r,
      nx2 = node.x + r,
      ny1 = node.y - r,
      ny2 = node.y + r;
  return function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== node)) {
      var x = node.x - quad.point.x,
	  y = node.y - quad.point.y,
	  l = Math.sqrt(x * x + y * y),
	  r = node.r + quad.point.r;
      if (l < r) {
	l = (l - r) / l * 0.5;
	node.x -= x *= l;
	node.y -= y *= l;
	quad.point.x += x;
	quad.point.y += y;
      }
    }
    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
  };
}


/* LISTENERS */

function mousemove() {
  var p = d3.mouse(this);
  root.px = x.invert( p[0] );
  root.py = y.invert( p[1] );
  force.resume();
}

d3.select('body')
  .on('mousemove', mousemove)
  .call( d3.behavior.zoom().x( x ).y( y ).scaleExtent([1, 8]).on('zoom', map.redraw) );

