
/*
  https://www.d3indepth.com/force-layout/
  https://bl.ocks.org/d3indepth/c48022f55ebc76e6adafa77cf466da35
  https://bl.ocks.org/mbostock/1095795
  https://plnkr.co/edit/iadT0ikcpKELU0eaE9f6?p=preview

 */
var width = window.innerWidth, height = window.innerHeight;
var intervalMsec = 333;
var resetLimit = 20;
var unicodeStart = 10000;
var makeGraph = false;
var shouldUpdateUX = true;
var simulation;
var clockInterval;
var charge = -90;
var elems = {};
window.runner = false;

var graphElem = document.querySelector('#content');
graphElem.setAttribute('height', height);
graphElem.setAttribute('width', width);

var nodes = [
  {name: '√', fixed: true},
]

var links = [
  {source: 0, target: 0},
]

var linkz = d3.forceLink().links(links);
var manyBody = d3.forceManyBody();
var distanceMax = Infinity;
  /*
    CSS, SVG and Canvas coordinate systems are all
      0
    0 ┼──────────── X
      │
      │
      │
      Y

    * https://javascript.info/coordinates
    * https://www.dashingd3js.com/using-the-svg-coordinate-space
    * https://developer.mozilla.org/en-US/docs/Web/CSS/CSSOM_View/Coordinate_systems
    * https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes

    * https://en.wikipedia.org/wiki/Arrows_(Unicode_block)
    * https://en.wikipedia.org/wiki/Box-drawing_character

    * https://math.stackexchange.com/questions/1201337/finding-the-angle-between-two-points
    * https://en.wikipedia.org/wiki/Atan2
    * https://en.wikipedia.org/wiki/Inverse_trigonometric_functions
    * https://en.wikipedia.org/wiki/Special_right_triangle

    b │ a
   ───┼───
    c │ d
   */

function distance(a, b) {
  var w = b.x - a.x;
  var h = b.y - a.y;
  return Math.sqrt(w*w + h*h)
}
function test(res, bail) {
  var s = `expected: ${res.expected} ≠ actual: ${res.actual}`;
  if (res.msg) {
    s = `msg: ${res.msg} ` + s;
  }
  if (res.actual == res.expected) {
    console.info(s);
    return false;
  } else {
    if (bail) {
      throw new Error(s);
    } else {
      console.error(s);
      return true
    }
  }
}
function testDistance() {
  test({actual: distance({x: 0, y: 0},
                         {x: 400, y: 300}),
        expected: 500});
  test({actual: distance({x: 0, y: 300},
                         {x: 0, y: 0}),
        expected: 300});
  test({actual: distance({x: 0, y: -400},
                         {x: 0, y: 0}),
        expected: 400});
}
var degPerRad = 180/Math.PI;
function angle(a, b) {
  // https://en.wikipedia.org/wiki/Atan2
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rads = Math.atan2(dy, dx); // - Math.PI/2;
  const adj = (rads > 0) && 360 || 0;
  const degs = adj - Math.round((rads * degPerRad));
  //console.log({dx, dy, adj, rads, degs});
  return degs + "deg";
}
function testAngle(bail) {
  const o = {x: 0, y: 0};
  const a = {x: 50, y: -50};
  const b = {x: -50, y: -50};
  const c = {x: -50, y: 50};
  const d = {x: 50, y: 50};
  test({actual: angle(b, a),
        msg: '→',
        expected: '0deg'}, bail)
  test({actual: angle(o, a),
        msg: '↗',
        expected: '45deg'}, bail)
  test({actual: angle(d, a),
        msg: '↑',
        expected: '90deg'}, bail)
  test({actual: angle(o, b),
        msg: '↖',
        expected: '135deg'}, bail)
  test({actual: angle(a, b),
        msg: '←',
        expected: '180deg'}, bail)
  test({actual: angle(o, c),
        msg: '↙',
        expected: '225deg'}, bail)
  test({actual: angle(b, c),
        msg: '↓',
        expected: '270deg'}, bail)
  test({actual: angle(o, d),
        msg: '↘',
        expected: '315deg'}, bail)

  test({actual: true,
        expected: false})
}
function updateManyBody() {
    manyBody.strength(charge).distanceMax(distanceMax);
}

function startSimulation() {
  simulation = d3.forceSimulation(nodes)
    .force('charge', manyBody)
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('link', linkz)
    .on('tick', ticked);
}

function updateLinks() {
  var u = d3.select('.links')
      .selectAll('div')
      .data(links)

  u.enter()
    .append('div')
    .merge(u)
    .attr('style', function(link) {
      var lefty, righty;
      if (link.source.x <= link.target.x) {
        lefty = link.source;
        righty = link.target;
      } else {
        lefty = link.target;
        righty = link.source;
      }
      lefty = link.source;
      righty = link.target;
      const left = Math.floor(lefty.x);
      const top = Math.floor(lefty.y);
      const length = Math.floor(distance(lefty, righty));
      const degrees = angle(lefty, righty);
      return `left:${left}px; ` +
        `top:${top}px; ` +
        `width:${length}px; ` +
        `transform: rotate(${degrees})`
    })
  u.exit().remove()
}



function updateNodes() {
  u = d3.select('.nodes')
    .selectAll('div')
    .data(nodes)

  u.enter()
    .append('div')
    .text(function(d) {
      return d.name
    })
    .merge(u)
    .attr('style', function(d) {
      return `left:${+Math.floor(d.x)}px; ` +
             `top:${Math.floor(d.y)}px`
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

function maybeReset() {
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
  maybeReset();
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
    if (simulation) {
      stopOrStart();
    }
    toggleClock();
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

function sec2deg(sec) {
  return (((6 * sec) + 270) % 360);
}
function min2deg(min) {
  return ((15 * min) + 270) % 360;
}

function startClock() {
  clockInterval = setInterval(() => {

    const sec = (new Date()).getSeconds();
    const secAsDeg = sec2deg(sec);
    const secAsRad = ((secAsDeg)/30)*Math.PI;
    const secAngle = angle({x:0, y:0},
                       {x:Math.sin(secAsRad),
                        y:Math.cos(secAsRad)});
    //console.log({deg, deg2});

    const elem = document.querySelector('.clockSec > div');
    const style =
          `left:400px; top:300px; ` +
          `width:250px; height:1px; background-color: red; ` +
          `transform:rotate(${secAsDeg}deg)`;
    elem.setAttribute('style', style);
    elem.innerHTML = `__ °:${secAngle} min:${sec}`;

    const min = (new Date()).getMinutes();
    const minAsDeg = min2deg(min);
    const minAsRad = ((minAsDeg)/30)*Math.PI;
    const minAngle = angle({x:0, y:0},
                       {x:Math.sin(minAsRad),
                        y:Math.cos(minAsRad)});

    const elem2 = document.querySelector('.clockMin > div');
    const style2 =
          `left:400px; top:300px; ` +
          `width:4px; height:100px; background-color: blue; ` +
          `transform:rotate(${minAngle})`;
    elem2.setAttribute('style', style2);
    elem2.innerHTML = `__ °:${minAngle} min:${min}`;
  }, 3);
}

function toggleClock() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  } else {
    startClock();
  }
}
//testDistance();
//testAngle();
//startClock();
//startSimulation();
//stopOrStart();

