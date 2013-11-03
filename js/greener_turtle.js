window.GreenerTurtle = function(GreenTurtle){
  var RDF_object = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object';
  var build_indices = function(graph){
    if (! graph.oid_2_id_p) graph.oid_2_id_p = {};
    for (var subj in graph.subjects){
	for (var p in subj.predicates){
	    var predicate = subj.predicates[p]; 
	    for (oi = 0; oi < predicate.objects.length; oi++){
		var obj = predicate.objects[oi];
		if (obj && obj_has_type(obj,RDF_object)){
		    if (typeof graph.oid_2_id_p[obj.value] == 'undefined'){
			graph.oid_2_id_p[obj.value] = [];
		    }
		    graph.oid_2_id_p[obj.value].push([d.s.id,p]);
		}
            }    
	}
    };
  };
  var get_incoming_predicates = function(d){
    return this.oid_2_id_p[subj.id] || [];
  };


return {
    parse: function(data,type){
	G = GreenTurtle.implementation.parse(data,type);
      build_indices(G);
      G.get_incoming_predicates = get_incoming_predicates;
      return G;
  }
};

}