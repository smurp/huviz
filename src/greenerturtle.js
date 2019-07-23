/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//GreenTurtle = GreenTurtle or require("green_turtle").GreenTurtle
var GreenerTurtle = (function() {
  let verbosity = undefined;
  let obj_has_type = undefined;
  let RDF_object = undefined;
  let build_indices = undefined;
  let get_incoming_predicates = undefined;
  let count_subjects = undefined;
  GreenerTurtle = class GreenerTurtle {
    static initClass() {
      verbosity = false;
      obj_has_type = (obj, typ) => obj.type === typ;
  
      RDF_object = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";
      build_indices = graph =>
        //console.log("SUBJ",graph.subjects);
        (() => {
          const result = [];
          for (let subj_id in graph.subjects) {
            var subj = graph.subjects[subj_id];
        
            //console.log('  s =',subj,subj.predicates);
            result.push((() => {
              const result1 = [];
              for (var p in subj.predicates) {
                var predicate = subj.predicates[p];
          
                //console.log('    p =',predicate.objects.length,p);
                var oi = 0;
                result1.push((() => {
                  const result2 = [];
                  while (oi < predicate.objects.length) {
                    const obj = predicate.objects[oi];
            
                    //console.log(obj);
                    if (obj && obj_has_type(obj, RDF_object)) {
                      if (typeof graph.oid_2_id_p[obj.value] === "undefined") { graph.oid_2_id_p[obj.value] = []; }
                      if ((obj.value === "_:E") && verbosity) { console.log(obj.value, "----> [", subj.id, p, "]"); }
                      graph.oid_2_id_p[obj.value].push([
                        subj.id,
                        p
                      ]);
                    }
                    result2.push(oi++);
                  }
                  return result2;
                })());
              }
              return result1;
            })());
          }
          return result;
        })()
      ;
  
      get_incoming_predicates = function(subj) {
        const resp = this.oid_2_id_p[subj.id] || [];
      
        //console.log("get_incoming_predicates(",subj.id,")  ===>",resp);
        return resp;
      };
  
      count_subjects = function(graph) {
        graph.num_subj = 0;
        return (() => {
          const result = [];
          for (let s in graph.subjects) {
            result.push(graph.num_subj++);
          }
          return result;
        })();
      };
    }

    parse(data, type) {
      const G = GreenTurtle.implementation.parse(data, type);
      if (!G.oid_2_id_p) { G.oid_2_id_p = {}; }
      build_indices(G);
      count_subjects(G);
      G.get_incoming_predicates = get_incoming_predicates;
      return G;
    }
  };
  GreenerTurtle.initClass();
  return GreenerTurtle;
})();

exports.GreenerTurtle = GreenerTurtle;