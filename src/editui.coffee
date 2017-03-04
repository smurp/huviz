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
      #@toggle_edit_form()

  create_edit_form: (toggleEdit) ->
    formNode = document.createElement('form')
    formNode.classList.add("cntrl-set", "edit-form")
    formNode.innerHTML = '<input name="subject" placeholder="subject" type="text"/><input name="predicate" placeholder="predicate" type="text"/><input name="object" placeholder="object" type="text"/>'
    formNode.innerHTML += '<button class="saveForm" type="button" disabled>Save</button>'
    formNode.innerHTML += '<button class="clearForm" type="button">Clear</button>'
    toggleEdit.appendChild(formNode)

  toggle_edit_form: () =>
    toggleEditMode = @con.getAttribute("edit")
    #debugger
    if toggleEditMode is 'no' #toggle switched to edit mode, then create form
      @con.setAttribute("edit","yes")
      @con.classList.add("edit-mode")
      @huviz.set_edit_mode(true)
    if toggleEditMode is'yes' #toggle switched to edit mode, then remove form
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

  (exports ? this).EditController = EditController
