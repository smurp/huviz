
// sample code from http://en.wikipedia.org/wiki/Threejs
var camera, scene, renderer,
line,
geometry, material, mesh;
 
init();
animate();
 
function add_line(scene){
   // view-source:http://stemkoski.github.io/Three.js/Dashed-Lines.html
   var lineGeometry = new THREE.Geometry();
   var vertArray = lineGeometry.vertices;
    vertArray.push( new THREE.Vector3(-150, -100, 0),
                   new THREE.Vector3(-150, 100, 0) );
   lineGeometry.computeLineDistances();
   var lineMaterial = new THREE.LineBasicMaterial( { color: 0xcc0000 } );
   line = new THREE.Line( lineGeometry, lineMaterial );
   scene.add(line);
}

function init() {
    scene = new THREE.Scene();

    //camera = new THREE.OrthographicCamera(window.innerWidth - 20, window.innerHeight - 20);
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 1000;
 
    geometry = new THREE.CubeGeometry( 200, 200, 200 );
    material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );

    add_line(scene);
    console.log("line",line); 
    //mesh = new THREE.Mesh( geometry, material );
    //scene.add( mesh );
 
    //renderer = new THREE.CanvasRenderer();
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize( window.innerWidth -20, window.innerHeight -20);
 
    document.body.appendChild( renderer.domElement );
}
 
function animate() {
        // note: three.js includes requestAnimationFrame shim
    requestAnimationFrame( animate );
    render();
}
 
function render() {
    //mesh.rotation.x += 0.01;
    //mesh.rotation.y += 0.02; 
//    line.rotation.x += 0.01;
//    line.rotation.y += 0.02; 
    line.rotation.z += 0.02; 

    renderer.render( scene, camera );
}
 /*


   */