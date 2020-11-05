#GreenTurtle = GreenTurtle or require("green_turtle").GreenTurtle
class GreenerTurtle
  verbosity = false
  obj_has_type = (obj, typ) ->
    return obj.type is typ
  RDF_object = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
  build_indices = (graph) ->
    for subj_id of graph.subjects
      subj = graph.subjects[subj_id]
      for p of subj.predicates
        predicate = subj.predicates[p]
        oi = 0
        while oi < predicate.objects.length
          obj = predicate.objects[oi]
          if obj and obj_has_type(obj, RDF_object)
            if typeof graph.oid_2_id_p[obj.value] is "undefined"
              graph.oid_2_id_p[obj.value] = []
            if obj.value is "_:E" and verbosity
              console.log(obj.value, "----> [", subj.id, p, "]")
            graph.oid_2_id_p[obj.value].push([subj.id, p])
          oi++
    return

  get_incoming_predicates = (subj) ->
    resp = @oid_2_id_p[subj.id] or []
    return resp

  count_subjects = (graph) ->
    graph.num_subj = 0
    for s of graph.subjects
      graph.num_subj++
    return

  parse: (data, type) ->
    G = GreenTurtle.implementation.parse(data, type)
    G.oid_2_id_p = {}  unless G.oid_2_id_p
    build_indices(G)
    count_subjects(G)
    G.get_incoming_predicates = get_incoming_predicates
    return G

(exports ? this).GreenerTurtle = GreenerTurtle
