
/*
  https://www.d3indepth.com/force-layout/
  https://bl.ocks.org/d3indepth/c48022f55ebc76e6adafa77cf466da35
  https://bl.ocks.org/mbostock/1095795
  https://plnkr.co/edit/iadT0ikcpKELU0eaE9f6?p=preview

 */
var width = window.innerWidth, height = window.innerHeight;
var intervalMsec = 33;
var resetLimit = 4000;
var unicodeStart = 10000;
var makeGraph = false;
var shouldUpdateUX = true;
var charge = -20;
var elems = {};
window.runner = false;

var svgElem = document.querySelector('svg');
svgElem.setAttribute('height', height);
svgElem.setAttribute('width', width);

var nodes = [
  {name: '√', fixed: true},
]

var links = [
  {source: 0, target: 0},
]

var linkz = d3.forceLink().links(links);

function box_force() {
  /*
    https://tomroth.com.au/fdg-bounding-box/

    This approach has the disadvantage that nodes just
    gather crudely on the perimeter.  Superior would
    be a repulsive force which is a function of distance.
  */
  
  var radius = 10;
  for (var i = 0, n = nodes.length; i < n; ++i) {
    curr_node = nodes[i];
    curr_node.x = Math.max(radius, Math.min(width - radius, curr_node.x));
    curr_node.y = Math.max(radius, Math.min(height - radius, curr_node.y));
  }

}

var manyBody = d3.forceManyBody();
var distanceMax = Infinity;

function updateManyBody() {
    manyBody.strength(charge).distanceMax(distanceMax);
}

var simulation = d3.forceSimulation(nodes)
    .force('charge', manyBody)
    .force('center', d3.forceCenter(width / 2, height / 2))
    //.force('box_force', box_force)
    .force('link', linkz)
    .on('tick', ticked);

function updateLinks() {
  var u = d3.select('.links')
      .selectAll('line')
      .data(links)

  u.enter()
    .append('line')
    .merge(u)
    .attr('x1', function(d) {
      return d.source.x
    })
    .attr('y1', function(d) {
      return d.source.y
    })
    .attr('x2', function(d) {
      return d.target.x
    })
    .attr('y2', function(d) {
      return d.target.y
    })
  u.exit().remove()
}

function updateNodes() {
  u = d3.select('.nodes')
    .selectAll('text')
    .data(nodes)

  u.enter()
    .append('text')
    .text(function(d) {
      return d.name
    })
    .merge(u)
    .attr('x', function(d) {
      return d.x
    })
    .attr('y', function(d) {
      return d.y
    })
    .attr('dy', function(d) {
      return 5
    })
  u.exit().remove()
}

function getMinDim() {
  return Math.min(width, height);
}

function getOrMakeLozenge(id, tag) {
  if (!elems[id]) { // find element if predefined in html
    elems[id] = document.getElementById(id);
  }
  if (!elems[id]) { // if not predefined, make and cache it
    var legend = document.getElementById('legend');
    var elem = document.createElement(tag || 'button');
    elems[id] = legend.insertAdjacentElement('beforeend',elem);
    elems[id].setAttribute('id', id);
  }
  return elems[id];  // either it was predefined or newly made
}

function displayLozenge(id, val) {
  var elem = getOrMakeLozenge(id, 'button');
  elem.innerText = val;
}

function updateUX() {
  if (shouldUpdateUX) {
    shouldUpdateUX = false;
    displayLozenge('makeGraph', makeGraph && 'graph' || 'tree');
  }
  displayLozenge('count', nodes.length);
  displayLozenge('distanceMax',
                 "distanceMax = " +
                 (distanceMax / getMinDim()).toFixed(2) +
                 " * minDim");
}

function ticked() {
  updateLinks();
  updateNodes();
  updateUX();
}

function reset() {
  nodes = [];
  links = [];
}

function maybe_reset() {
  if (nodes.length > resetLimit) {
    reset();
  }
}

function restartAfterChange() {
  simulation.nodes(nodes);
  simulation.force('link').links(links);
  var n = nodes.length;
  simulation.alpha(.3+1/n).restart();
}

function spawn() {
  maybe_reset();
  var nextChar = String.fromCharCode(nodes.length + unicodeStart);
  var link = {source: Math.floor(nodes.length/5),
              target: nodes.length};
  var node = {name: nextChar};

  if (nodes.length > 0) {
    // make new nodes appear to spawn at the root node
    node.x = nodes[0].x;
    node.y = nodes[0].y;
  } else {
    // or the center of the screen for the first node
    node.y = height/2;
    node.x = width/2;
  }
  links.push(link);
  if (makeGraph && !(nodes.length % 8)) {
    links.push({source: Math.floor(nodes.length/8),
                target: nodes.length});
  }
  nodes.push(node);
  restartAfterChange();
  //console.info(nodes.length, node, link);
  //ticked();
}

function shake(alpha) {
  simulation.alpha(alpha).restart()
}

function stopOrStart() {
  if (window.runner) {
    clearInterval(runner);
    runner = false;
    console.info('stop');
  } else {
    console.info('start');
    window.runner = setInterval(spawn, intervalMsec);
  }
}

document.addEventListener('keydown', (e) => {
  console.log(`key: '${e.key}' pressed`);
  if (e.key == ' ') {
    stopOrStart();
    e.preventDefault(); // prevent scroll
  } else if (e.key == 'Escape') {
    reset();
  } else if (e.key == 's') {
    shake(2);
  } else if (e.key == 'i') {
    distanceMax = Infinity;
    updateManyBody();
  } else if (e.key == 'k') {
    if (distanceMax == Infinity) {
      distanceMax = getMinDim() / 16;
    } else {
      distanceMax = distanceMax * 1.25;
    }
    if (distanceMax > getMinDim()) {
      distanceMax = Infinity;
    }
    updateManyBody();
  } else if (e.key == 'g') {
    makeGraph = !makeGraph;
    shouldUpdateUX = true;
  } else if (e.key.startsWith('Arrow')) {
    e.preventDefault(); // so arrow keys don't scroll
  }
});

stopOrStart();
