
// sample code from http://en.wikipedia.org/wiki/Threejs
var camera, scene, renderer,
geometry, material, mesh;
 
init();
animate();

var ymult = 1;
var xmult = -1;
 
function add_line(scene,x,y,x2,y2,name){
   // view-source:http://stemkoski.github.io/Three.js/Dashed-Lines.html
   var lineGeometry = new THREE.Geometry();
   var vertArray = lineGeometry.vertices;
  /*
   vertArray.push( new THREE.Vector3(-150, -100, 0),
                   new THREE.Vector3(-150, 100, 0) );
   */
    var z = 1000;
    vertArray.push( new THREE.Vector3(xmult * x, ymult * y, z),
                    new THREE.Vector3(xmult * x2, ymult * y2, z) );
   lineGeometry.computeLineDistances();
   var lineMaterial = new THREE.LineBasicMaterial( { color: 0xcc0000 } );
   line = new THREE.Line( lineGeometry, lineMaterial );
   scene.add(line);
   line.name = name;
   return line;
}

function init() {
    scene = new THREE.Scene();

    if (false){
      // http://stackoverflow.com/questions/17558085/three-js-orthographic-camera
      camera = new THREE.OrthographicCamera(width/-2,width/2,height/2,height/-2,1000,1);
    } else {
      camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    }
    camera.position.z = 1000;

    geometry = new THREE.CubeGeometry( 200, 200, 200 );
    material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    //add_line(scene,cx,cy,cx+100,cy+100); 
    if (false){
      renderer = new THREE.CanvasRenderer();
    } else {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    }
    renderer.setSize( window.innerWidth -25, window.innerHeight -25);
 
    document.body.appendChild( renderer.domElement );
}
 
function animate() {
        // note: three.js includes requestAnimationFrame shim
    requestAnimationFrame( animate );
    render();
}
 
function render() {
    if (mesh){
      mesh.rotation.x += 0.01;
      mesh.rotation.y += 0.02; 
    }
//    line.rotation.x += 0.01;
//    line.rotation.y += 0.02; 
//    line.rotation.x += 0.02; 

    renderer.render( scene, camera );
}
 /*


   */