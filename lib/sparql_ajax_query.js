// New Worker to process SPARQL endpoint queries
sparql_node_list = [];
all_set = [];

function sparql_endpoint_query (url, graph, subject, limit) {
  // Require:
  //    URL of Endpoint
  //    (optional) URL of graph (at Endpoint)
  //    Subject URL
  //    (optional) node limit on query
  // Return:
  //    Success (true/false)
  //    Data (JSON results from Sparql) or Error message
  fromGraph = '';
  if (graph) {
    fromGraph = " FROM <" + graph + "> "
  };
  qry = `
  SELECT * ${fromGraph}
  WHERE {
  {<${subject}> ?p ?o}
  UNION
  {{<${subject}> ?p ?o} . {?o ?p2 ?o2}}
  UNION
  {{?s3 ?p3 <${subject}>} . {?s3 ?p4 ?o4 }}
  }
  LIMIT ${limit}
  `;
  json_data = ""
  full_url = url + '?query=' + encodeURIComponent(qry);
  var sprqlHttp = new XMLHttpRequest();
  sprqlHttp.onreadystatechange = function() {
    if (sprqlHttp.readyState == 4 && sprqlHttp.status == 200) {
          data = sprqlHttp.responseText
          //console.log (data);
          json_check = typeof data;
          if (json_check == 'string') {json_data = JSON.parse(data)} else {json_data = data};
          //console.log (json_data);
          create_quads_from_JSON(json_data, subject);
    } else { // TODO: Need to add a way to pass back error
      //console.log ("Problem with the SPARQL query or not ready yet.")
    }
  }

  self.postMessage({
    method_name: 'log_query',
    url: url,
    qry: qry});
  sprqlHttp.open("GET", full_url, true);
  if (url == "http://sparql.cwrc.ca/sparql"){
    // Required because cwrc requires the Content-type attribute; however, not accepted by most Endpoints
    sprqlHttp.setRequestHeader('Content-Type','application/sparql-query',);
    sprqlHttp.setRequestHeader('Accept', 'application/sparql-results+json');
  }
  else {
    sprqlHttp.setRequestHeader('Accept', 'application/sparql-results+json; q=1.0, application/sparql-query, q=0.8');
  };
  sprqlHttp.send(null);
  //console.log (json_data);
}

function create_quads_from_JSON (json_data, subject) {
  // Require:
  //    JSON for Sparql query results
  //    Subject URL
  //    sparql_node_list
  // Returns:
  //    Object array of vetted quads to be added
  //    Updated sparql_node_list (list of all nodes added including new ones)
  data = '';
  context = "http://universal.org";
  plainLiteral = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";
  nodes_in_data = json_data.results.bindings;

  _results = [];
  for (_i = 0, _len = nodes_in_data.length; _i < _len; _i++) {
    node = nodes_in_data[_i];
    language = '';
    obj_type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";
    if (node.s) {
      subj = node.s.value;
      pred = node.p.value;
      obj_val = subject;
    } else if (node.o2) {
      subj = node.o.value;
      pred = node.p2.value;
      obj_val = node.o2.value;
      if (node.o2.type === 'literal' || node.o.type === 'typed-literal') {
        if (node.o2.datatype) {
          obj_type = node.o2.datatype;
        } else {
          obj_type = plainLiteral;
        }
        if (node.o2["xml:lang"]) {
          language = node.o2['xml:lang'];
        }
      }
    } else if (node.s3) {
      subj = node.s3.value;
      pred = node.p4.value;
      obj_val = node.o4.value;
      if (node.o4.type === 'literal' || node.o4.type === 'typed-literal') {
        if (node.o4.datatype) {
          obj_type = node.o4.datatype;
        } else {
          obj_type = plainLiteral;
        }
        if (node.o4["xml:lang"]) {
          language = node.o4['xml:lang'];
        }
      }
    } else {
      subj = subject;
      pred = node.p.value;
      obj_val = node.o.value;
      if (node.o.type === 'literal' || node.o.type === 'typed-literal') {
        if (node.o.datatype) {
          obj_type = node.o.datatype;
        } else {
          obj_type = plainLiteral;
        }
        if (node.o["xml:lang"]) {
          language = node.o['xml:lang'];
        }
      }
    };
    q = {
      g: context,
      s: subj,
      p: pred,
      o: {
        type: obj_type,
        value: obj_val
      }
    };
    if (language) {
      q.o.language = language;
    };
    q.subject = subject
    node_list_empty = sparql_node_list.length;
    if (node_list_empty === 0) {
      sparql_node_list.push(q);
      node_not_in_list = true;
    } else {
      _ref = sparql_node_list;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        snode = _ref[_j];
        if (q.s === snode.s && q.p === snode.p && q.o.value === snode.o.value && q.o.type === snode.o.type && q.o.language === snode.o.language) {
          node_not_in_list = false;
          break;
        } else {
          node_not_in_list = true;
        }
      }
    };
    if (node_not_in_list) {
      node_not_in_list = false;
      _results.push(q);
    }
  };

  self.postMessage({
    method_name: 'accept_results',
    results: _results});
}

self.

self.addEventListener('message',function(e){
  // Require:
  //    Subject URL, URL of Endpoint, URL of graph, Node limit, sparql_node_list
  // Return:
  //    queryTarget, object array of quads
  sparql_node_list = e.data.previous_nodes
  all_set = e.data.all_set
  sparql_endpoint_query(e.data.url, e.data.graph, e.data.target, e.data.limit);
  //console.log (e.data.previous_nodes)
  console.log ("Done with Worker query for " + e.data.target)
   //load(e.target.id, function(xhr) {});
   //self.postMessage(query_results);
    },false);
