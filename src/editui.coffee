# Edit UI - Jan 2017

indexdDBstore = require('indexeddbstoragecontroller')

class EditController
  constructor: (@huviz) ->
    #TODO EditController should be loaded and checked when a dataset is loaded
    @userValid = true #TODO this needs to be hooked into authentication -- remove to huviz.coffee to validate against dataloaded and authentication
    #@userValid = false
    if @userValid is true and not @controls #document.getElementsByClassName("edit-controls")[0] is undefined

      con = document.createElement("div")
      con.className = "edit-controls loggedIn"
      con.setAttribute("edit", "no")
      document.body.appendChild(con)
      con.innerHTML = "<div class='cntrl-set slider-pair'><div class='label set-1'>VIEW</div><div class='slider'><div class='knob'></div></div><div class='label set-2'>EDIT</div></div>"
      @create_edit_form(con)
      con.getElementsByClassName("slider")[0].onclick = @toggle_edit_form
      #console.log(con.getElementsByTagName("form")[0])
      #console.log(con.getElementsByClassName("slider")[0])
      @formFields = con.getElementsByTagName("form")[0]
      clearForm = @formFields.getElementsByClassName("clearForm")[0] #TODO How are these working?
      saveForm = @formFields.getElementsByClassName("saveForm")[0]
      validateForm = @formFields.getElementsByTagName('input')
      validateForm[0].addEventListener("input", @validate_edit_form)
      validateForm[1].addEventListener("input", @validate_edit_form)
      validateForm[2].addEventListener("input", @validate_edit_form)
      clearForm.addEventListener("click", @clear_edit_form)
      saveForm.addEventListener("click", @save_edit_form)
      #alert('about to set controls')
      @controls = @formFields
    #else
    #  alert('running a second time')

  create_edit_form: (toggleEdit) ->
    formNode = document.createElement('form')
    formNode.classList.add("cntrl-set", "edit-form")
    formNode.innerHTML = '<input name="subject" placeholder="subject" type="text"/><input name="predicate" placeholder="predicate" type="text"/><input name="object" placeholder="object" type="text"/>'
    formNode.innerHTML += '<button class="saveForm" type="button" disabled>Save</button>'
    formNode.innerHTML += '<button class="clearForm" type="button">Clear</button>'
    toggleEdit.appendChild(formNode)

  toggle_edit_form: () ->
    toggleEdit = this.parentElement.parentElement
    toggleEditMode = toggleEdit.getAttribute("edit")
    if toggleEditMode is 'no' #toggle switched to edit mode, then create form
      toggleEdit.setAttribute("edit","yes")
      toggleEdit.classList.add("edit-mode")
      console.log("formFields:",this.formFields)
    if toggleEditMode is'yes' #toggle switched to edit mode, then remove form
      toggleEdit.setAttribute("edit","no")
      toggleEdit.classList.remove("edit-mode")
      #toggleEdit.lastChild.innerHTML = ''

  validate_edit_form: (evt) =>
    form = @controls
    inputFields = form.getElementsByTagName('input')
    saveButton = form.getElementsByTagName('button')[0]
    for i in [0..inputFields.length-1]
      if form.elements[i].value is ''
        saveButton.disabled = 'disabled'
        break
      else
        saveButton.disabled = false

  save_edit_form: ()->
    inputFields = this.parentElement.getElementsByTagName('input')
    tuple = []
    for i in [0..inputFields.length-1]
      console.log(this.parentElement.elements[i].name + ": " + this.parentElement.elements[i].value)
      tuple.push this.parentElement.elements[i].value
    assrtSave = new indexdDBstore.IndexedDBStorageController @huviz
    console.log(assrtSave)
    quad =
      s: tuple[0]
      p: tuple[1]
      o: tuple[2]
      #alert(JSON.stringify(quad))
    #assrtSave.assert(quad)
    #TODO Why does clear_edit_form() not work?
    saveButton = this.parentElement.getElementsByTagName('button')[0]
    for i of inputFields
      this.parentElement.elements[i].value = ''
    saveButton.disabled = true

  clear_edit_form: () =>
    form = @controls
    inputFields = form.getElementsByTagName('input')
    saveButton = form.getElementsByTagName('button')[0]
    for i of inputFields
      form.elements[i].value = ''
    saveButton.disabled = true

  (exports ? this).EditController = EditController
