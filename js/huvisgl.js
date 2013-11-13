
// A contrived example of VivaGraphJS with 1300 nodes and 5000 edges:
//   http://www.yasiv.com/graphs#HB/jagmesh6

// sample code from http://en.wikipedia.org/wiki/Threejs
var camera, scene, renderer,
geometry, material, mesh;
 


var xmult = 1;
var ymult = 1;
 
function add_line(scene,x0,y0,x1,y1,name,clr){
   // view-source:http://stemkoski.github.io/Three.js/Dashed-Lines.html
   // https://github.com/mrdoob/three.js/wiki/Drawing-lines
   //    draw_line(x0,y0,x1,y1,'green');
    //console.log("=================================");
    //show_pos(x0,y0);
    //show_pos(x1,y1);
    clr = clr || 0xcc0000;
    var scale = 1;
    var xscale = scale * xmult;
    var yscale = scale * ymult;
    var lineGeometry = new THREE.Geometry();
    var vertArray = lineGeometry.vertices;
    var z = 999;
    var dx = x1 - x0, 
        dy = y0 - y1;
    vertArray.push( new THREE.Vector3(0,  0, z),
                    new THREE.Vector3(dx, dy, z) );
    lineGeometry.computeLineDistances();
    var lineMaterial = new THREE.LineBasicMaterial( { color: clr } );
    var line = new THREE.Line( lineGeometry, lineMaterial );
    line.position.x = x0 - cx;
    line.position.y = (y0 - cy) * -1;
    scene.add(line);
    line.name = name;
    //console.log('add',dx,dy,line.name);
    return line;
}

function remove_gl_obj(obj){
    var old_len = scene.children.length;
    var nom = obj.name;
    scene.remove(obj);
    var new_len = scene.children.length;
    if (new_len == old_len){
	alert("remove_gl_obj failed for:"+nom);
    }
    // http://mrdoob.github.io/three.js/examples/webgl_test_memory.html
    obj.geometry.dispose()
    obj.material.dispose()
    //obj.texture.dispose()
    delete obj;
    //console.log("old:",old_len,"new:",new_len);
}


function mv_node(node,x,y){
    node.position.x = x - cx;
    node.position.y = (y - cy) * -1;
}
function mv_line(line,x0,y0,x1,y1){
    var dx = x1-x0, 
        dy = y0-y1;
    v1 = line.geometry.vertices[1];    
    v1.x = dx;
    v1.y = dy;
    mv_node(line,x0,y0);
    line.position.x = x0 - cx;
    line.position.y = (y0 - cy) * -1;
    line.geometry.verticesNeedUpdate = true;
};
var glnodes = [];
function add_node(scene,x,y,r,clr){
    var mesh,geometry,material;
    clr = clr || 0x0000dd;
    var rmult = 3;
    geometry = new THREE.CubeGeometry( r*rmult,r*rmult,r*rmult );
    material = new THREE.MeshBasicMaterial( { color: clr, wireframe: true } );
    mesh = new THREE.Mesh( geometry, material );
    glnodes.push(mesh);
    scene.add( mesh );
    return mesh;
}

function add_frame(){
    console.log('scene',scene);
    var scale = 1;
    var inset = 100;
    var dx = 0; //width;
    var dy = 0; //height;
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
    var l2 = l // * 1.1;
    var t2 = t // * 1.1;
    var top = add_line(scene,l2,t2,r,t,'top','black');
    var bottom = add_line(scene,l,b,r,b,'bottom','yellow');
    var left = add_line(scene,l2,t2,l,b,'left','red');
    var right = add_line(scene,r,t,r,b,'right','green');
    console.log("FRAME",t,b,l,r);
    dump_line(right,'RIGHT');
}

function dump_line(line,msg){
    return;
    var v = line.geometry.vertices;
    msg = msg || '    ';
    console.log(msg,line.name,v[0].x,v[0].y,"->",v[1].x,v[1].y)
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
    /*
    if (glnodes){
	glnodes.forEach(function(obj){rot_obj(obj)});
    }
    */
    renderer.render( scene, camera );
}
