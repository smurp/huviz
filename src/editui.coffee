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
      @controls = @formFields
      @subject_input = @formFields[0]
      @predicate_input = @formFields[1]
      @object_input = @formFields[2]
      #@toggle_edit_form()

  create_edit_form: (toggleEdit) ->
    formNode = document.createElement('form')
    formNode.classList.add("cntrl-set", "edit-form")
    formNode.innerHTML = '<input name="subject" placeholder="subject" type="text"/><input id="predicate" name="predicate" placeholder="predicate" type="text"/><input name="object" placeholder="object" type="text"/>'
    formNode.innerHTML += '<button class="saveForm" type="button" disabled>Save</button>'
    formNode.innerHTML += '<button class="clearForm" type="button">Clear</button>'
    console.log("++++++++++++++++++++++++++++++++++++++++")
    toggleEdit.appendChild(formNode)
    @set_predicate_selector()


  set_predicate_selector: (availableTags) ->
      console.log("setting predicate selector in edit form")
      #console.log(@huviz.predicate_set[0].lid)  # Undefined when this first called.
      #console.log(@huviz.predicate_set.length)  #
      if not availableTags
            availableTags = [
              "ActionScript",
              "AppleScript",
              "Asp",
              "BASIC",
              "C",
              "C++",
              "Clojure",
              "COBOL",
              "ColdFusion",
              "DatatypeProperty: literal string",
              "DatatypeProperty: number",
              "DatatypeProperty: date",
              "Erlang",
              "Fortran",
              "Groovy",
              "Haskell",
              "Java",
              "JavaScript",
              "Lisp",
              "Perl",
              "PHP",
              "Python",
              "Ruby",
              "Scala",
              "Scheme"
            ]
      $("#predicate").autocomplete(
        source:availableTags,
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
      # Add predicates from Ontology for autocomplete box in edit form
      #pred_array = @huviz.predicate_set
      predicates = []
      for predicate in @huviz.predicate_set
        predicates.push predicate.lid
      @set_predicate_selector(predicates)
      @huviz.set_edit_mode(true)
    if toggleEditMode is'yes' #toggle switched to normal mode, then hide form
      @con.setAttribute("edit","no")
      @con.classList.remove("edit-mode")
      @huviz.set_edit_mode(false)
    @adjust_object_datatype()

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
    console.log(form.elements[1].value)
    @adjust_object_datatype()

  predicate_is_DatatypeProperty: () ->
    # The job of figuring this out is best done in a method because:
    #   * a search up the superclasses of the predicate is needed
    #   * caching that answer might be needed for efficiency
    #   * heuristics in case of ambiguity might be required
    #
    # We can get started on this by just responding to magic values in the predicate.
    if @predicate_input
      window.THINGY = @predicate_input
      # Hey Wolf!! For some reason this is not finding the value in the input...
      # Wanna take it from here?
      current_value = @predicate_input.getAttribute('value')
      return current_value is 'literal'
    return false

  adjust_object_datatype: () ->
    # This is not being called yet.  Perhaps it should be when the predicate is set.
    # It could also have the job of triggering the change to the object widget.

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
    @huviz.dbsstorage.assert(quad)
    #assrtSave.assert(quad)
    saveButton = form.getElementsByTagName('button')[0]
    for i of inputFields
      form.elements[i].value = ''
    saveButton.disabled = true

  clear_edit_form: () =>
    form = @controls
    inputFields = form.getElementsByTagName('input')
    saveButton = form.getElementsByTagName('button')[0]
    for i of inputFields
      form.elements[i].value = ''
    saveButton.disabled = true

  set_subject_node: (node) ->
    @subject_node = node
    new_value = node and node.id or ""
    console.log("setting subject node......" + new_value)
    @subject_input.setAttribute("value",new_value)
    @validate_edit_form()
    return

  set_object_node: (node) ->
    @object_node = node
    new_value = node and node.id or ""
    console.log("setting object node......"  + new_value)
    @object_input.setAttribute("value",new_value)
    @validate_edit_form()
    return

  (exports ? this).EditController = EditController
