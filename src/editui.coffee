# Edit UI - Jan 2017

indexdDBstore = require('indexeddbstoragecontroller')


class EditController
  constructor: (@huviz) ->
    #TODO EditController should be loaded and checked when a dataset is loaded
    @userValid = true #TODO this needs to be hooked into authentication -- remove to huviz.coffee to validate against dataloaded and authentication
    #@userValid = false
    if @userValid is true and not @con #document.getElementsByClassName("edit-controls")[0] is undefined
      @con = document.createElement("div")
      @con.className = "edit-controls loggedIn"
      @con.setAttribute("edit", "no")
      @huviz.set_edit_mode(false)
      document.body.appendChild(@con)
      @con.innerHTML = "<div class='cntrl-set slider-pair'><div class='label set-1'>VIEW</div><div class='slider'><div class='knob'></div></div><div class='label set-2'>EDIT</div></div>"
      @create_edit_form(@con)
      @con.getElementsByClassName("slider")[0].onclick = @toggle_edit_form
      #console.log(con.getElementsByTagName("form")[0])
      #console.log(con.getElementsByClassName("slider")[0])
      @formFields = @con.getElementsByTagName("form")[0]
      clearForm = @formFields.getElementsByClassName("clearForm")[0] #TODO How are these working?
      saveForm = @formFields.getElementsByClassName("saveForm")[0]
      validateForm = @formFields.getElementsByTagName('input')
      validateForm[0].addEventListener("input", @validate_edit_form)
      validateForm[1].addEventListener("input", @validate_edit_form)
      validateForm[2].addEventListener("input", @validate_edit_form)
      clearForm.addEventListener("click", @clear_edit_form)
      saveForm.addEventListener("click", @save_edit_form)
      @proposed_edge = null
      @deleted_last_edge = true # intialized to allow for first setting
      @controls = @formFields
      @subject_input = @formFields[0]
      @predicate_input = @formFields[1]
      @object_input = @formFields[2]

  create_edit_form: (toggleEdit) ->
    formNode = document.createElement('form')
    formNode.classList.add("cntrl-set", "edit-form")
    formNode.innerHTML = '<input name="subject" placeholder="subject" type="text"/><input id="predicate" name="predicate" placeholder="predicate" type="text"/><input name="object" placeholder="object" type="text"/>'
    formNode.innerHTML += '<button class="saveForm" type="button" disabled>Save</button>'
    formNode.innerHTML += '<button class="clearForm" type="button">Clear</button>'
    toggleEdit.appendChild(formNode)

  set_predicate_selector: () ->
      #console.log("setting predicate selector in edit form")
      # Add predicates from Ontology for autocomplete box in edit form
      #pred_array = @huviz.predicate_set
      availablePredicates = []
      if @huviz.predicate_set
        for predicate in @huviz.predicate_set
          availablePredicates.push predicate.lid
        availablePredicates.push "literal"
      else
        availablePredicates = [
          "A",
          "literal"
        ]
      $("#predicate").autocomplete(
        source:availablePredicates,
        position:
          my: "left bottom"
          at: "left top"
      )

  toggle_edit_form: () =>
    toggleEditMode = @con.getAttribute("edit")
    #debugger
    if toggleEditMode is 'no' #toggle switched to edit mode, then show form
      @con.setAttribute("edit","yes")
      @con.classList.add("edit-mode")
      @huviz.set_edit_mode(true)
    if toggleEditMode is'yes' #toggle switched to normal mode, then hide form
      @con.setAttribute("edit","no")
      @con.classList.remove("edit-mode")
      @huviz.set_edit_mode(false)

  validate_edit_form: (evt) =>
    form = @controls
    inputFields = form.getElementsByTagName('input')
    saveButton = form.getElementsByTagName('button')[0]
    for i in [0..inputFields.length-1]
      elem = form.elements[i]
      if elem.value is ''
        saveButton.disabled = 'disabled'
        break
      else
        saveButton.disabled = false
    @adjust_object_datatype()

  predicate_is_DatatypeProperty: () ->
    # The job of figuring this out is best done in a method because:
    #   * a search up the superclasses of the predicate is needed
    #   * caching that answer might be needed for efficiency
    #   * heuristics in case of ambiguity might be required
    #
    # We can get started on this by just responding to magic values in the predicate.
    #console.log("predicate_is_Datatype has been called")
    if @predicate_input
      window.THINGY = @predicate_input
      current_value = @predicate_input.value
      return current_value is 'literal'
    return false

  adjust_object_datatype: () ->
    @set_predicate_selector()
    if @predicate_is_DatatypeProperty()
      @object_datatype_is_literal = true
      placeholder_label = "a literal value"
    else
      @object_datatype_is_literal = false
      placeholder_label = "object"
    @object_input.setAttribute("placeholder", placeholder_label)

    # if the predicate is of DatatypeProperty then
    #  0. replace placeholder to reflect data type needed in object
    #  1. object field will only accpet input according to appropriate type (i.e. literal string, number or date)

  save_edit_form: () =>
    form = @controls
    inputFields = form.getElementsByTagName('input')
    tuple = []
    for i in [0..inputFields.length-1]
      elem = form.elements[i]
      console.log(elem.name + ": " + elem.value)
      tuple.push(elem.value)
    assrtSave = new indexdDBstore.IndexedDBStorageController(@huviz)
    console.log(assrtSave)
    quad =
      s: tuple[0]
      p: tuple[1]
      o: tuple[2]
    @latest_quad = quad  # REMOVE ONCE saving to the indexedDB is working
    #@huviz.dbsstorage.assert(quad)
    #assrtSave.assert(quad)
    saveButton = form.getElementsByTagName('button')[0]
    for i of inputFields
      form.elements[i].value = ''
    saveButton.disabled = true
    @proposed_edge = false #set to false (no focused edge)

  clear_edit_form: () =>
    form = @controls
    inputFields = form.getElementsByTagName('input')
    saveButton = form.getElementsByTagName('button')[0]
    for i of inputFields
      form.elements[i].value = ''
    if @proposed_edge
      console.log @proposed_edge
      proposed_focused_edge = null
      @huviz.set_proposed_focused_edge(proposed_focused_edge)
      @remove_proposed_edge(@proposed_edge) # clear existing edge clear from display
    saveButton.disabled = true
    # TODO why on calling this function does the ability to drag nodes to fill form disabled?

  set_subject_node: (node) ->
    @subject_node = node
    new_value = node and node.id or ""
    console.log("setting subject node......" + new_value)
    @subject_input.setAttribute("value",new_value)
    @validate_edit_form()
    @validate_proposed_edge(new_value, "s")
    return

  set_object_node: (node) ->
    @object_node = node
    new_value = node and node.id or ""
    console.log("setting object node......"  + new_value)
    if new_value and @deleted_last_edge   # This should only happen when 1) there is a new value and 2) the last request has been completed
      @deleted_last_edge = false # reset, because we are now going to process the new edge value
      @object_input.setAttribute("value",new_value)
      @validate_edit_form()
      @validate_proposed_edge()
    return

  validate_proposed_edge: () -> # type = subject or object
    # What are the proposed subject node, object node and predicate?
      # Subject and Object fields must have values (IDs of Nodes)
      # Make a quad out of current subject and object (predicate if it is filled)
      #subject_id = @editui.subject_input.value
      RDF_object  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
      RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"

      subject_id = @subject_input.value
      object_id = @object_input.value
      predicate_val = @predicate_input.value
      #console.log @huviz.RDF_object

      # Only
      if subject_id and object_id
        obj_type = if predicate_val is 'literal' then RDF_literal else RDF_object
        q =
          s: subject_id
          p: predicate_val || "anything"
          o:  # keys: type,value[,language]
            type: obj_type
            value: object_id
          g: "http://" + Date.now()
        # Don't process any edge proposal if it is just the same as the current proposal
        console.log (q)
        console.log (@proposed_edge)
        # Ignore requests for edges that are identical to the last edge requested
        if @proposed_edge? and q.o.value is @proposed_edge.o.value
          console.log "this new proposed edge is just the same as old - get out of here"
          @deleted_last_edge = true # reset so a new edge can be displayed in object field
          return
        console.log "validating proposed edge.... It should be:" + q.s + ' ' + q.p + ' ' +q.o.value
        @set_proposed_edge(q)

  set_proposed_edge: (new_q) ->
    console.log "creating a new proposed edge...."
    #console.log new_q
    # If there is an existing edge remove it before setting a new proposed edge
    if @proposed_edge?  # There can only be one, so get rid of old proposed edge
      #console.log "I'm getting rid of the old edge now"
      @remove_proposed_edge(@proposed_edge, new_q)
      @add_proposed_quad(new_q)
    # Cleared all gates - time to add the new proposed edge
    else
      @add_proposed_quad(new_q)

  add_proposed_quad: (q) ->
    console.log ("I'm making a new quad.... " + q.s + " " + q.p + " " +q.o.value)
    @huviz.add_quad(q)
    # Remember this proposed edge for next time a proposal is made
    #console.log @huviz.edges_by_id
    #console.log @huviz.links_set
    #console.log @graphed_set
    obj_n = @huviz.get_or_create_node_by_id(q.o.value)
    subj_n = @huviz.get_or_create_node_by_id(q.s)
    pred_n = @huviz.get_or_create_predicate_by_id(q.p)
    new_proposed_edge = @huviz.get_or_create_Edge(subj_n, obj_n, pred_n)
    @huviz.set_proposed_focused_edge(new_proposed_edge)
    # Set the two nodes to be selected and have focused edge
    console.log(new_proposed_edge)
    @huviz.show_link(new_proposed_edge)
    @proposed_edge = q
    @deleted_last_edge = true

  remove_proposed_edge: (old_q, new_q) ->
    console.log ("Removing previous proposed edge: " + old_q.s + " " + old_q.p + " " +old_q.o.value)
    obj_n = @huviz.get_or_create_node_by_id(old_q.o.value)
    subj_n = @huviz.get_or_create_node_by_id(old_q.s)
    pred_n = @huviz.get_or_create_predicate_by_id(old_q.p)
    #console.log obj_n
    #console.log subj_n
    #console.log pred_n
    # Get the edge to remove
    last_proposed_edge = @huviz.get_or_create_Edge(subj_n, obj_n, pred_n)
    console.log last_proposed_edge
    console.log @graphed_set
    #console.log last_proposed_edge
    old_e = old_q.s + " " + old_q.p + " " +old_q.o.value
    @huviz.remove_link(old_e) # Only active if it sees node
    @huviz.unshow_link(last_proposed_edge)
    @deleted_last_edge = true
    #last_edge_index = @huviz.edges_by_id.indexOf(last_proposed_edge)
    #console.log(last_edge_index)
    delete @huviz.edges_by_id[old_e]






  (exports ? this).EditController = EditController
