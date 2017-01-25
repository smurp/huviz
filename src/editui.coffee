# Edit UI - Jan 2017

class EditController
  constructor: (@huviz) ->

    #TODO EditController should be loaded and checked when a dataset is loaded
    @userValid = true #TODO this needs to be hooked into authentication -- remove to huviz.coffee to validate against dataloaded and authentication
    #@userValid = false

    if @userValid is true and document.getElementsByClassName("edit-controls")[0] is undefined
      con = document.createElement("div")
      con.className = "edit-controls loggedIn"
      con.setAttribute("edit", "no")
      document.body.appendChild(con)
      con = document.getElementsByClassName("edit-controls")[0]
      con.innerHTML = "<div class='cntrl-set slider-pair'><div class='label set-1'>VIEW</div><div class='slider'><div class='knob'></div></div><div class='label set-2'>EDIT</div></div>"

      document.getElementsByClassName("slider")[0].onclick = @toggle_edit_form

  toggle_edit_form: () ->

    toggleEdit = this.parentElement.parentElement
    toggleEditMode = toggleEdit.getAttribute("edit")

    if toggleEditMode is 'no' #toggle switched to edit mode, then create form
      toggleEdit.setAttribute("edit","yes")
      toggleEdit.classList.add("edit-mode")
      formNode = document.createElement('form')
      formNode.classList.add("cntrl-set", "edit-form")
      formNode.innerHTML = '<input name="subject" placeholder="subject" type="text"/><input placeholder="predicate" type="text"/><input placeholder="object" type="text"/>'
      formNode.innerHTML += '<button type="button">Save</button>'
      formNode.innerHTML += '<button type="button">Clear!</button>'
      toggleEdit.appendChild(formNode)


    if toggleEditMode is'yes' #toggle switched to edit mode, then remove form
      toggleEdit.setAttribute("edit","no")
      toggleEdit.classList.remove("edit-mode")
      toggleEdit.lastChild.innerHTML = ''

    #TODO Clear button function: when clicked remove contents

    #TODO Save button enabled: if all three fields valid, then enable the save button

  (exports ? this).EditController = EditController
