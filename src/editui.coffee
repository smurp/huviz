# Edit UI - Jan 2017

class EditController
  constructor: (@huviz) ->

    #TODO EditController should be loaded and checked when a dataset is loaded
    @userValid = true #TODO this needs to be hooked into authentication
    @userValid = false

    if @userValid is true and document.getElementsByClassName("edit-controls")[0] is undefined
      con = document.createElement("div")
      con.className = "edit-controls loggedIn"
      con.setAttribute("edit", "no")
      document.body.appendChild(con)
      con = document.getElementsByClassName("edit-controls")[0]
      con.innerHTML = "<div class='cntrl-set slider-pair'><div class='label set-1'>VIEW</div><div class='slider'><div class='knob'></div></div><div class='label set-2'>EDIT</div></div>"

      document.getElementsByClassName("edit-controls")[0].onclick = @toggle_edit_form

  toggle_edit_form: () ->
    toggleEditClass = this.getAttribute("edit")
    toggleEdit = document.getElementsByClassName("edit-controls")[0]

    if toggleEditClass is 'no' #toggle switched to edit mode, then create form
      this.setAttribute("edit","yes")
      this.classList.add("edit-mode")
      formNode = document.createElement('div')
      formNode.classList.add("cntrl-set", "edit-form")
      formNode.innerHTML = '<input placeholder="subject" type="text"/><input placeholder="predicate" type="text"/><input placeholder="object" type="text"/><button type="button">Save</button><button type="button">Clear</button>'
      this.appendChild(formNode)

    if toggleEditClass is'yes' #toggle switched to edit mode, then remove form
      this.setAttribute("edit","no")
      this.classList.remove("edit-mode")
      this.lastChild.innerHTML = ''


  (exports ? this).EditController = EditController
