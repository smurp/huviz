#GreenTurtle = GreenTurtle or require("green_turtle").GreenTurtle
class GreenerTurtle
  verbosity = false
  obj_has_type = (obj, typ) ->
    obj.type is typ

  RDF_object = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
  build_indices = (graph) ->
    #console.log("SUBJ",graph.subjects);
    for subj_id of graph.subjects
      subj = graph.subjects[subj_id]
      
      #console.log('  s =',subj,subj.predicates);
      for p of subj.predicates
        predicate = subj.predicates[p]
        
        #console.log('    p =',predicate.objects.length,p);
        oi = 0
        while oi < predicate.objects.length
          obj = predicate.objects[oi]
          
          #console.log(obj);
          if obj and obj_has_type(obj, RDF_object)
            graph.oid_2_id_p[obj.value] = []  if typeof graph.oid_2_id_p[obj.value] is "undefined"
            console.log obj.value, "----> [", subj.id, p, "]"  if obj.value is "_:E" and verbosity
            graph.oid_2_id_p[obj.value].push [
              subj.id
              p
            ]
          oi++

  get_incoming_predicates = (subj) ->
    resp = @oid_2_id_p[subj.id] or []
    
    #console.log("get_incoming_predicates(",subj.id,")  ===>",resp);
    resp

  count_subjects = (graph) ->
    graph.num_subj = 0
    for s of graph.subjects
      graph.num_subj++

  parse: (data, type) ->
    G = GreenTurtle.implementation.parse(data, type)
    G.oid_2_id_p = {}  unless G.oid_2_id_p
    build_indices G
    count_subjects G
    G.get_incoming_predicates = get_incoming_predicates
    G

exports.GreenerTurtle = GreenerTurtle