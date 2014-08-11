Huviz = require('huviz').Huviz


class Deprecated extends Huviz
  
  hide_all_links: ->
    @nodes.forEach (node) =>
      #node.linked = false;
      #node.fixed = false;	
      @shelved_set.acquire node
      node.links_shown = []
      node.showing_links = "none"
      @shelved_set.acquire node
      @update_showing_links node

    @links_set.forEach (link) =>
      @remove_ghosts link

    @links_set.clear()
    @chosen_set.clear()
    
    # It should not be neccessary to clear discarded_set or hidden_set()
    # because shelved_set.acquire() should have accomplished that
    @restart()

  toggle_links: ->
    #console.log("links",force.links());
    unless @links_set.length
      @make_links G
      @restart()
    @force.links().length

  fire_nextsubject_event: (oldquad,newquad) ->
    #console.log "fire_nextsubject_event",oldquad
    window.dispatchEvent(
      new CustomEvent 'nextsubject',
        detail:
          old: oldquad
          new: newquad
        bubbles: true
        cancelable: true
    )

  onnextsubject: (e) =>
    alert "sproing"
    #console.log "onnextsubject: called",e
    # The event 'nextsubject' is fired when the subject of add_quad()
    # is different from the last call to add_quad().  It will also be
    # called when the data source has been exhausted. Our purpose
    # in listening for this situation is that this is when we ought
    # to check to see whether there is now enough information to create
    # a node.  A node must have an ID, a name and a type for it to
    # be worth making a node for it (at least in the orlando situation).
    # The ID is the uri (or the id if a BNode)
    @calls_to_onnextsubject++
    #console.log "count:",@calls_to_onnextsubject
    if e.detail.old?
      subject = @my_graph.subjects[e.detail.old.s.raw]  # FIXME why is raw still here?
      @set_type_if_possible(subject,e.detail.old,true)
      if @is_ready(subject)
        @get_or_create_node subject
        @tick()
          
  show_found_links: ->
    for sub_id of @G.subjects
      subj = @G.subjects[sub_id]
      subj.getValues("f:name").forEach (name) =>
        if name.match(@search_regex)
          node = @get_or_make_node(subj, [cx,cy])
          @show_node_links node  if node
    @restart()

  # deprecated in favour of get_or_create_node
  get_or_make_node: (subject, start_point, linked, into_set) ->
    return unless subject
    d = @get_node_by_id(subject.id)
    return d  if d
    start_point = start_point or [
      @width / 2
      @height / 2
    ]
    linked = typeof linked is "undefined" or linked or false
    name_obj = subject.predicates[FOAF_name].objects[0]
    name = name_obj.value? and name_obj.value or name_obj
    #name = subject.predicates[FOAF_name].objects[0].value
    d = new Node(subject.id)
    d.s = subject
    d.name = name
    d.point(start_point)
    d.prev_point([start_point[0]*1.01,start_point[1]*1.01])
    
    @assign_types(d)
    d.color = @color_by_type(d)

    @add_node_ghosts d
    #n_idx = @add_to_array(d, @nodes)
    n_idx = @nodes.add(d)
    @id2n[subject.id] = n_idx
    if false
      unless linked
        n_idx = @shelved_set.acquire(d)
        @id2u[subject.id] = n_idx
      else
        @id2u[subject.id] = @graphed_set.acquire(d)
    else
      into_set = into_set? and into_set or linked and @graphed_set or @get_default_set_by_type(d)
      into_set.acquire(d)
    @update_showing_links d
    d
  
  find_links_from_node: (node) ->
    target = undefined
    subj = node.s
    x = node.x or width / 2
    y = node.y or height / 2
    pnt = [x,y]
    oi = undefined
    if subj
      for p_name of subj.predicates
        @ensure_predicate(p_name)
        predicate = subj.predicates[p_name]
        oi = 0
        predicate.objects.forEach (obj,i) =>
          if obj.type is RDF_object
            target = @get_or_make_node(@G.subjects[obj.value], pnt)
          if target
            @add_link( new Edge(node, target))
    node.links_from_found = true

  find_links_to_node: (d) ->
    subj = d.s
    if subj
      parent_point = [d.x,d.y]
      @G.get_incoming_predicates(subj).forEach (sid_pred) =>
        sid = sid_pred[0]
        pred = sid_pred[1]
        src = @get_or_make_node(@G.subjects[sid], parent_point)
        @add_link( new Edge(src, d))
    d.links_to_found = true

  set_type_if_possible: (subj,quad,force) ->
    # This is a hack, ideally we would look on the subject for type at coloring
    # and taxonomy assignment time but more thought is needed on how to
    # integrate the semantic perspective with the coloring and the 'taxonomy'.
    force = not not force? and force
    if not subj.type? and subj.type isnt ORLANDO_writer and not force
      return
    #console.log "set_type_if_possible",force,subj.type,subj.id      
    pred_id = quad.p.raw
    if pred_id in [RDF_type,'a'] and quad.o.value is FOAF_Group
      subj.type = ORLANDO_org
    else if force and subj.id[0].match(@bnode_regex)
      subj.type = ORLANDO_other    
    else if force
      subj.type = ORLANDO_writer
    if subj.type?
      name = subj.predicates[FOAF_name]? and subj.predicates[FOAF_name].objects[0] or subj.id
      #console.log "   ",subj.type
      
  hide_all_links: ->
    @nodes.forEach (node) =>
      #node.linked = false;
      #node.fixed = false;	
      @shelved_set.acquire node
      node.links_shown = []
      node.showing_links = "none"
      @shelved_set.acquire node
      @update_showing_links node

    @links_set.forEach (link) =>
      @remove_ghosts link

    @links_set.clear()
    @chosen_set.clear()
    
    # It should not be neccessary to clear discarded_set or hidden_set()
    # because shelved_set.acquire() should have accomplished that
    @restart()

  toggle_links: ->
    #console.log("links",force.links());
    unless @links_set.length
      @make_links G
      @restart()
    @force.links().length

  fire_nextsubject_event: (oldquad,newquad) ->
    #console.log "fire_nextsubject_event",oldquad
    window.dispatchEvent(
      new CustomEvent 'nextsubject',
        detail:
          old: oldquad
          new: newquad
        bubbles: true
        cancelable: true
    )

  onnextsubject: (e) =>
    alert "sproing"
    #console.log "onnextsubject: called",e
    # The event 'nextsubject' is fired when the subject of add_quad()
    # is different from the last call to add_quad().  It will also be
    # called when the data source has been exhausted. Our purpose
    # in listening for this situation is that this is when we ought
    # to check to see whether there is now enough information to create
    # a node.  A node must have an ID, a name and a type for it to
    # be worth making a node for it (at least in the orlando situation).
    # The ID is the uri (or the id if a BNode)
    @calls_to_onnextsubject++
    #console.log "count:",@calls_to_onnextsubject
    if e.detail.old?
      subject = @my_graph.subjects[e.detail.old.s.raw]  # FIXME why is raw still here?
      @set_type_if_possible(subject,e.detail.old,true)
      if @is_ready(subject)
        @get_or_create_node subject
        @tick()
          
  show_found_links: ->
    for sub_id of @G.subjects
      subj = @G.subjects[sub_id]
      subj.getValues("f:name").forEach (name) =>
        if name.match(@search_regex)
          node = @get_or_make_node(subj, [cx,cy])
          @show_node_links node  if node
    @restart()

  # deprecated in favour of get_or_create_node
  get_or_make_node: (subject, start_point, linked, into_set) ->
    return unless subject
    d = @get_node_by_id(subject.id)
    return d  if d
    start_point = start_point or [
      @width / 2
      @height / 2
    ]
    linked = typeof linked is "undefined" or linked or false
    name_obj = subject.predicates[FOAF_name].objects[0]
    name = name_obj.value? and name_obj.value or name_obj
    #name = subject.predicates[FOAF_name].objects[0].value
    d = new Node(subject.id)
    d.s = subject
    d.name = name
    d.point(start_point)
    d.prev_point([start_point[0]*1.01,start_point[1]*1.01])
    
    @assign_types(d)
    d.color = @color_by_type(d)

    @add_node_ghosts d
    #n_idx = @add_to_array(d, @nodes)
    n_idx = @nodes.add(d)
    @id2n[subject.id] = n_idx
    if false
      unless linked
        n_idx = @shelved_set.acquire(d)
        @id2u[subject.id] = n_idx
      else
        @id2u[subject.id] = @graphed_set.acquire(d)
    else
      into_set = into_set? and into_set or linked and @graphed_set or @get_default_set_by_type(d)
      into_set.acquire(d)
    @update_showing_links d
    d
  
  find_links_from_node: (node) ->
    target = undefined
    subj = node.s
    x = node.x or width / 2
    y = node.y or height / 2
    pnt = [x,y]
    oi = undefined
    if subj
      for p_name of subj.predicates
        @ensure_predicate(p_name)
        predicate = subj.predicates[p_name]
        oi = 0
        predicate.objects.forEach (obj,i) =>
          if obj.type is RDF_object
            target = @get_or_make_node(@G.subjects[obj.value], pnt)
          if target
            @add_link( new Edge(node, target))
    node.links_from_found = true

  find_links_to_node: (d) ->
    subj = d.s
    if subj
      parent_point = [d.x,d.y]
      @G.get_incoming_predicates(subj).forEach (sid_pred) =>
        sid = sid_pred[0]
        pred = sid_pred[1]
        src = @get_or_make_node(@G.subjects[sid], parent_point)
        @add_link( new Edge(src, d))
    d.links_to_found = true
  
  set_type_if_possible: (subj,quad,force) ->
    # This is a hack, ideally we would look on the subject for type at coloring
    # and taxonomy assignment time but more thought is needed on how to
    # integrate the semantic perspective with the coloring and the 'taxonomy'.
    force = not not force? and force
    if not subj.type? and subj.type isnt ORLANDO_writer and not force
      return
    #console.log "set_type_if_possible",force,subj.type,subj.id      
    pred_id = quad.p.raw
    if pred_id in [RDF_type,'a'] and quad.o.value is FOAF_Group
      subj.type = ORLANDO_org
    else if force and subj.id[0].match(@bnode_regex)
      subj.type = ORLANDO_other    
    else if force
      subj.type = ORLANDO_writer
    if subj.type?
      name = subj.predicates[FOAF_name]? and subj.predicates[FOAF_name].objects[0] or subj.id
      #console.log "   ",subj.type

(exports ? this).Deprecated = Deprecated
