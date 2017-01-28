# Edit UI - Jan 2017

class EditController
  constructor: (@huviz) ->

    #TODO EditController should be loaded and checked when a dataset is loaded
    @userValid = true #TODO this needs to be hooked into authentication -- remove to huviz.coffee to validate against dataloaded and authentication
    @userValid = false

    if @userValid is true and document.getElementsByClassName("edit-controls")[0] is undefined

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
      clearForm = @formFields.getElementsByClassName("clearForm")[0]
      saveForm = @formFields.getElementsByClassName("saveForm")[0]
      clearForm.addEventListener("click", @clear_edit_form)
      saveForm.addEventListener("click", @save_edit_form)

  create_edit_form: (toggleEdit) ->
    formNode = document.createElement('form')
    formNode.classList.add("cntrl-set", "edit-form")
    formNode.innerHTML = '<input name="subject" placeholder="subject" value="testSubject" type="text"/><input name="predicate" placeholder="predicate" type="text"/><input name="object" placeholder="object" type="text"/>'
    formNode.innerHTML += '<button class="saveForm" type="button">Save</button>'
    formNode.innerHTML += '<button class="clearForm" type="button">Clear</button>'
    toggleEdit.appendChild(formNode)

  toggle_edit_form: () ->
    toggleEdit = this.parentElement.parentElement
    toggleEditMode = toggleEdit.getAttribute("edit")
    if toggleEditMode is 'no' #toggle switched to edit mode, then create form
      toggleEdit.setAttribute("edit","yes")
      toggleEdit.classList.add("edit-mode")
    if toggleEditMode is'yes' #toggle switched to edit mode, then remove form
      toggleEdit.setAttribute("edit","no")
      toggleEdit.classList.remove("edit-mode")
      #toggleEdit.lastChild.innerHTML = ''

    #TODO Clear button function: when clicked remove contents

    #TODO Save button enabled: if all three fields valid, then enable the save button

  save_edit_form: (value)->
    inputFields = this.parentElement.getElementsByTagName('input')
    for i in [0..inputFields.length-1]
      console.log(this.parentElement.elements[i].name + ": " + this.parentElement.elements[i].value)
      #console.log(this.parentElement.elements[i].value)

  clear_edit_form: (value)->
    inputFields = this.parentElement.getElementsByTagName('input')
    for i of inputFields
      this.parentElement.elements[i].value = ''

  (exports ? this).EditController = EditController
