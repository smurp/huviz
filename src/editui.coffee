# Edit UI - Jan 2017

FiniteStateMachine = require('fsm').FiniteStateMachine
indexdDBstore = require('indexeddbstoragecontroller')

class EditController extends FiniteStateMachine
  constructor: (@huviz) ->
    #TODO EditController should be loaded and checked when a dataset is loaded
    @userValid = true #TODO this needs to be hooked into authentication -- remove to huviz.coffee to validate against dataloaded and authentication
    #@userValid = false
    @ensure_verbs()
    @build_transitions()
    @state = null

  build_transitions: ->
    @transitions =
      prepare:
        target: 'prepared'
      disable:
        target: 'disabled'
      enable:
        target: 'prepared'

  on__prepare: ->
    if @userValid is true and not @con #document.getElementsByClassName("edit-controls")[0] is undefined
      @con = document.createElement("div")
      @con.className = "edit-controls loggedIn"
      @con.setAttribute("edit", "no")
      #@huviz.set_edit_mode(false)
      viscanvas = @huviz.args.viscanvas_sel
      new_viscanvas = viscanvas.replace('#','')
      document.getElementById(new_viscanvas).appendChild(@con)
      @con.innerHTML = "<div class='cntrl-set slider-pair'><div class='label set-1'>VIEW</div><div class='slider'><div class='knob'></div></div><div class='label set-2'>CONTRIBUTE</div><div id='beta-note'>(Alpha)</div></div>"
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
      @proposed_quad = null
      @controls = @formFields
      @subject_input = @formFields[0]
      @predicate_input = @formFields[1]
      @object_input = @formFields[2]

  hide: ->
    $(@con).hide()
  show: ->
    $(@con).show()

  on__disable: ->
    @hide_verbs()
    @hide_form()

  on__enable: ->
    @show_verbs()
    @show_form()

  get_verb_set: ->
    return {
      connect: @huviz.human_term.connect # aka link
      spawn: @huviz.human_term.spawn # aka instantiate
      specialize: @huviz.human_term.specialize # aka subclass / subpropertize
      annotate: @huviz.human_term.annotate
      }

  add_verbs: ->
    vset = @get_verb_set()
    @huviz.gclui.verb_sets.unshift(vset)
    @huviz.gclui.add_verb_set(vset, (prepend = true))

  ensure_verbs: ->
    if not @my_verbs
      @my_verbs = @add_verbs()
      @hide_verbs()

  hide_verbs: ->
    @my_verbs.style('display','none')

  show_verbs: ->
    @my_verbs.style('display','flex')

  create_edit_form: (toggleEdit) ->
    formNode = document.createElement('form')
    formNode.classList.add("cntrl-set", "edit-form")
    formNode.innerHTML = '<input name="subject" placeholder="subject" type="text"/><input id="predicate" name="predicate" placeholder="predicate" type="text"/><input name="object" placeholder="object" type="text"/>'
    formNode.innerHTML += '<button class="saveForm" type="button" disabled>Save</button>'
    formNode.innerHTML += '<button class="clearForm" type="button">Clear</button>'
    toggleEdit.appendChild(formNode)
    @set_predicate_selector()

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
      source: availablePredicates,
      open: @update_predicate_picked
      close: @update_predicate_picked
      change: @update_predicate_picked
      position:
        my: "left bottom"
        at: "left top"
    )

  update_predicate_picked: (event, ui) ->
    #if event.type is 'autocompletechange'
    new_pred_value = @predicate_input.value
    console.log("#{new_pred_value} is new predicate")
    @validate_proposed_edge()

  hide_form: ->
    @con.setAttribute("edit","no")
    @con.classList.remove("edit-mode")
    #@huviz.set_edit_mode(false)

  show_form: ->
    @con.setAttribute("edit","yes")
    @con.classList.add("edit-mode")
    #@huviz.set_edit_mode(true)

  toggle_edit_form: () =>
    toggleEditMode = @con.getAttribute("edit")
    #console.log("error") #debugger
    if toggleEditMode is 'no' #toggle switched to edit mode, then show form
      @show_verbs()
      @show_form()
    if toggleEditMode is 'yes' #toggle switched to normal mode, then hide form
      @hide_verbs()
      @hide_form()

  validate_edit_form: (evt) ->
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

  save_edit_form: () ->
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
    @huviz.set_proposed_edge(null) # set to nothing, ie stop flagging the edge as proposed
    #@huviz.dbsstorage.assert(quad)
    #assrtSave.assert(quad)
    saveButton = form.getElementsByTagName('button')[0]
    for i of inputFields
      form.elements[i].value = ''
    saveButton.disabled = true
    #@proposed_quad = null #set to false (no focused edge)

  clear_edit_form: () ->
    form = @controls
    inputFields = form.getElementsByTagName('input')
    saveButton = form.getElementsByTagName('button')[0]
    for i of inputFields
      form.elements[i].value = ''
    if @proposed_quad
      console.log "@proposed_quad:", @proposed_quad
      #@huviz.set_proposed_edge(null)
      @remove_proposed_quad() # clear existing edge clear from display
    @set_subject_node()
    @set_object_node()
    saveButton.disabled = true
    # TODO why on calling this function does the ability to drag nodes to fill form disabled?

  set_subject_node: (node) ->
    if @subject_node is node
      return
    @subject_node = node
    new_value = node and node.id or ""
    console.log("set_subject_node() id:'#{new_value}'")
    @subject_input.setAttribute("value",new_value)
    @validate_edit_form()
    @validate_proposed_edge()

  set_object_node: (node) -> # either a node or undefined
    if @object_node is node
      return # ignore if there is no change
    @object_node = node # might be null
    new_value = node and node.id or ""
    console.log("set_object_node() id:'#{new_value}'")
    @object_input.setAttribute("value",new_value)
    @validate_edit_form()
    @validate_proposed_edge()

  validate_proposed_edge: () -> # type = subject or object
    console.log('validate_proposed_edge()')
    # What are the proposed subject node, object node and predicate?
    # Subject and Object fields must have values (IDs of Nodes)
    # Make a quad out of current subject and object (predicate if it is filled)
    #subject_id = @editui.subject_input.value
    RDF_object  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
    RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"

    subject_id = @subject_input.value
    object_id = @object_input.value
    predicate_val = @predicate_input.value

    # propose a new quad once there is a subject and an object
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
      # Ignore requests for edges that are identical to the last edge requested
      if @proposed_quad? and @quads_match(q, @proposed_quad)
        console.log("... skipping: <s:#{q.s}, p:#{q.p}, o:#{q.o.value}> matches old")
        return
      console.log("... accepting: <s:#{q.s}, p:#{q.p}, o:#{q.o.value}>")
      @set_proposed_quad(q)

  quads_match: (a, b) ->
    return (a.s is b.s) and (a.p is b.p) and (a.o.value is b.o.value)

  set_proposed_quad: (new_q) ->
    console.log "set_proposed_quad()"
    # If there is an existing edge remove it before setting a new proposed edge
    if @proposed_quad # There can only be one, so get rid of old proposed edge
      @remove_proposed_quad()
    @add_proposed_quad(new_q)
    @huviz.tick() # tell the graph to repaint itself
    console.log "Tick in editui.coffee set_proposed_quad"

  add_proposed_quad: (q) ->
    console.log ("add_proposed_quad() " + q.s + " " + q.p + " " +q.o.value)
    edge = @huviz.add_quad(q)
    if not edge
      console.log("error") #debugger
    @huviz.set_proposed_edge(edge)
    @huviz.show_link(edge)
    @proposed_quad = q

  remove_proposed_quad: ->
    old_edge = @huviz.proposed_edge
    if old_edge
      edge_id = old_edge.id
      @huviz.set_proposed_edge(null)
      #@huviz.remove_link(edge_id)
      #@huviz.unshow_link(old_edge)
      @huviz.delete_edge(old_edge)
      #delete @huviz.edges_by_id[old_edge]
    @proposed_quad = null

  (exports ? this).EditController = EditController
