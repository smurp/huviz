
// sample code from http://en.wikipedia.org/wiki/Threejs
var camera, scene, renderer,
geometry, material, mesh;
 


var xmult = 1;
var ymult = 1;
 
function add_line(scene,x,y,x2,y2,name){
   // view-source:http://stemkoski.github.io/Three.js/Dashed-Lines.html
   // https://github.com/mrdoob/three.js/wiki/Drawing-lines
    draw_line(x,y,x2,y2,'green');
    var scale = 1;
    var xscale = scale * xmult;
    var yscale = scale * ymult;
    var lineGeometry = new THREE.Geometry();
    var vertArray = lineGeometry.vertices;
    /*
      vertArray.push( new THREE.Vector3(-150, -100, 0),
                      new THREE.Vector3(-150, 100, 0) );
    */
    var z = 999;
    /*
      vertArray.push( new THREE.Vector3(xmult * x, ymult * y, z),
      new THREE.Vector3(xmult * x2, ymult * y2, z) );
    */
    vertArray.push( new THREE.Vector3(xscale * x - cx,  yscale * y - cy, z),
                    new THREE.Vector3(xscale * x2 - cx, yscale * y2 - cy, z) );
    lineGeometry.computeLineDistances();
    var lineMaterial = new THREE.LineBasicMaterial( { color: 0xcc0000 } );
    var line = new THREE.Line( lineGeometry, lineMaterial );
    scene.add(line);
    line.name = name;
    return line;
}

function mv_line(line,x0,y0,x1,y1){
    v0 = line.geometry.vertices[0];
    v1 = line.geometry.vertices[1];
    v0.x = x0 - cx
    v0.y = y0 - cy
    v1.x = x1 - cx
    v1.y = y1 - cy
    
};

function add_frame(){
    console.log('scene',scene);
    var scale = 1;
    var inset = 50;
    var dx = cx - width;
    var dy = cy - height;
    dx = 0;
    dy = 0;
    var l = dx + inset;
    var r = dx + width - inset;
    var t = dy + inset;
    var b = dy + height - inset;
    b = b * scale;
    t = t * scale;
    l = l * scale;
    r = r * scale;
    var l2 = l * 1.1;
    var t2 = t * 1.1;
    var top = add_line(scene,l2,t2,r,t,'top');
    var bottom = add_line(scene,l,b,r,b,'bottom');
    var left = add_line(scene,l2,t2,l,b,'left');
    var right = add_line(scene,r,t,r,b,'right');
    console.log("FRAME",t,b,l,r);
    dump_line(right,'RIGHT');
}

function dump_line(line,msg){
    return;
    var v = line.geometry.vertices;
    msg = msg || '    ';
    console.log(msg,line.name,v[0].x,v[0].y,"->",v[1].x,v[1].y)
}

var glnodes = [];
function add_node(scene,x,y,r,clr){
    var mesh,geometry,material;
    clr = clr || 0x0000dd;
    var rmult = 10;
    geometry = new THREE.CubeGeometry( r*rmult,r*rmult,r*rmult );
    material = new THREE.MeshBasicMaterial( { color: clr, wireframe: true } );
    mesh = new THREE.Mesh( geometry, material );
    glnodes.push(mesh);
    scene.add( mesh );
}

function init() {
    scene = new THREE.Scene();

    if (true){
      // http://stackoverflow.com/questions/17558085/three-js-orthographic-camera
      camera = new THREE.OrthographicCamera(
	  width/-2,width/2,height/2,height/-2,1,1000);
    } else {
      camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    }
    camera.position.z = 1000;

    geometry = new THREE.CubeGeometry( 200, 200, 200 );
    material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    add_line(scene,cx-100,cy-100,cx+100,cy+100,'demo-line'); 
    add_node(scene,cx,cy,10);

    if (false){
      renderer = new THREE.CanvasRenderer();
    } else {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    }
    renderer.setSize( window.innerWidth -25, window.innerHeight -25);
 
    document.body.appendChild( renderer.domElement );
    renderer.domElement.setAttribute('style','z-index:4');
}
 
function animate() {
        // note: three.js includes requestAnimationFrame shim
    requestAnimationFrame( animate );
    render();
}
 
function rot_obj(obj){
    obj.rotation.x += 0.01;
    obj.rotation.y += 0.02; 
}

function render() {
    if (glnodes){
	glnodes.forEach(function(obj){rot_obj(obj)});
    }
    if (mesh){
	rot_obj(mesh);
    }
//    line.rotation.x += 0.01;
//    line.rotation.y += 0.02; 
//    line.rotation.x += 0.02; 

    renderer.render( scene, camera );
}
 /*


   */