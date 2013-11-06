window.GreenerTurtle = function(GreenTurtle){
  var RDF_object = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object';
  var build_indices = function(graph){
    console.log('BUILD INDICES');
    if (! graph.oid_2_id_p) graph.oid_2_id_p = {};
    //console.log("SUBJ",graph.subjects);
    for (var subj_id in graph.subjects){
        var subj = graph.subjects[subj_id];
        //console.log('  s =',subj,subj.predicates);
	for (var p in subj.predicates){
	    var predicate = subj.predicates[p]; 
            //console.log('    p =',predicate.objects.length,p);
	    for (oi = 0; oi < predicate.objects.length; oi++){
		var obj = predicate.objects[oi];
                //console.log(obj);
		if (obj && obj_has_type(obj,RDF_object)){
		    if (typeof graph.oid_2_id_p[obj.value] == 'undefined'){
			graph.oid_2_id_p[obj.value] = [];
		    }
		    if (obj.value == '_:E'){
                      console.log(obj.value,'----> [',subj.id,p,']');
		    }
		    graph.oid_2_id_p[obj.value].push([subj.id,p]);
		}
            }    
	}
    };
  };
  var get_incoming_predicates = function(subj){
    var resp =  this.oid_2_id_p[subj.id] || [];
    //console.log("get_incoming_predicates(",subj.id,")  ===>",resp);
    return resp;
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
