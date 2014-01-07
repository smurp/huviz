###
# verbs: choose,label,discard,shelve,unlabel
# classes: writers,others,people,orgs # places,titles
# like:
# ids:
#
#  choose,label/unlabel,discard,shelve,expand
#
###
angliciser = require('angliciser').angliciser
gcl = require('graphcommandlanguage')
class CommandController
  constructor: (@huviz,@container,@hierarchy) ->
    @comdiv = d3.select(@container).append("div")
    #@gclpane = @comdiv.append('div').attr('class','gclpane')
    @cmdlist = @comdiv.append('div').attr('class','commandlist')
    @title_bar_controls()        
    @oldcommands = @cmdlist.append('div').attr('class','commandhistory')
    @nextcommandbox = @comdiv.append('div')
    @verbdiv = @comdiv.append('div').attr('class','verbs')
    @taxdiv = @comdiv.append('div').attr('class','taxonomydiv')
    @add_clear_both(@comdiv)
    @nodeclassbox = @comdiv.append('div').classed('container',true)
    @add_clear_both(@comdiv)    
    @predicatebox = @comdiv.append('div').classed('container',true)    
    @node_classes_chosen = [] # new SortedSet()
    @build_nodeclasspicker()
    @likediv = @comdiv.append('div')
    @build_predicatepicker()    
    @build_form()
    @update_command()

  add_clear_both: (target) ->
    target.append('div').attr('style','clear:both') # keep taxonomydiv from being to the right of the verbdiv

  title_bar_controls: ->
    @show_comdiv_button = d3.select(@container).
         append('div').classed('show_comdiv_button',true)
    #@show_comdiv_button.text('oink')
    @show_comdiv_button.classed('display_none',true)
    #@comdiv.classed('display_none',true)
    @cmdlistbar = @cmdlist.append('div').attr('class','cmdlistbar')
    @cmdlist.append('div').attr('style','clear:both')    
    @cmdlistbarcontent = @cmdlistbar.append('div').
         attr('class','cmdlisttitlebarcontent')
    @cmdlistbarcontent.append('div').attr('class','cmdlisttitle')
    @toggle_comdiv_button = @cmdlistbar.append('div').
        attr('class','hide_comdiv')
    @toggle_history_button = @cmdlistbar.append('div').
        attr('class','hide_history')
    @cmdlist.append('div').style('clear:both')

    @toggle_history_button.on 'click', () =>
      shown = not @toggle_history_button.classed('hide_history')
      @toggle_history_button.classed('hide_history',shown)
      @toggle_history_button.classed('show_history',not shown)
      @oldcommands.classed('display_none',not shown)

    @show_comdiv_button.on 'click', () =>
      @show_comdiv_button.classed('display_none',true)
      @comdiv.classed('display_none',false)
      
    @toggle_comdiv_button.on 'click', () =>
      shown = not @toggle_comdiv_button.classed('hide_comdiv')
      "setting toggle_comdiv:"+shown
      #@toggle_comdiv_button.classed('hide_comdiv',shown)
      #@toggle_comdiv_button.classed('show_comdiv',not shown)
      @comdiv.classed('display_none',not shown)
      @show_comdiv_button.classed('display_none',false)
      
    @toggle_commands_button = @cmdlistbar.append('div').
        attr('class','close_commands')

  ignore_predicate: (pred_id) ->
    @predicates_ignored.push(pred_id)

  handle_newpredicate: (e) =>
    parent = 'anything'
    pred_id = e.detail.sid
    unless pred_id in @predicates_ignored
      pred_name = pred_id
      @add_newpredicate(pred_id,parent,pred_name)

  onpredicatepicked: (pred_id,selected,elem) =>
    console.log "onpredicatepicked",arguments
    #console.log "onpredicatepicked()",pred_id,@predicate_to_colors
    if selected
      color = @predicate_to_colors[pred_id].showing
    else
      color = @predicate_to_colors[pred_id].notshowing
    #console.log "elem",elem
    elem.style('background-color',color)

  add_newpredicate: (pred_id,parent,pred_name) =>
    #console.log "add_newpredicate()",pred_id,parent
    @predicate_picker.add(pred_id,parent,pred_name,@onpredicatepicked)
    @predicate_to_colors = @predicate_picker.recolor()
    console.log "predicate_to_colors",@predicate_to_colors

  build_predicatepicker: ->
    tp = require('treepicker')
    console.log "build_predicatepicker()"
    @predicates_ignored = []
    @predicate_picker = new tp.TreePicker()
    @predicate_hierarchy = {'anything':['Anything']}
    @predicate_picker.show_tree(@predicate_hierarchy,@predicatebox,@onpredicatepicked)
    
  build_nodeclasspicker: ->
    tp = require('treepicker')
    @node_class_picker = new tp.TreePicker()
    @node_class_picker.show_tree(@hierarchy,@nodeclassbox,@onnodeclasspicked)
  onnodeclasspicked: (id,new_state,elem) =>
    if new_state
      if not (id in @node_classes_chosen)
        @node_classes_chosen.push(id)
    else
      @deselect_node_class(id)
    @update_command()
  deselect_node_class: (node_class) ->
    @node_classes_chosen = @node_classes_chosen.filter (eye_dee) ->
      eye_dee isnt node_class

  verb_sets: [ # mutually exclusive within each set
      choose: 'choose'
      shelve: 'shelve'
      hide:   'hide'
    ,
      label:   'label'
      unlabel: 'unlabel'
    ,
      discard: 'discard'
      undiscard: 'retrieve'
    ,
      reveal: 'reveal'
      redact: 'redact'
    ]
  verbs_override: # when overriding ones are selected, others are deselected
    choose: ['discard','unchoose']
    discard: ['choose','retrieve','hide']
    hide: ['discard','undiscard','label']

  build_form: () ->
    @build_verb_form()
    @build_like()
    @nextcommand = @nextcommandbox.append('div').
        attr('class','nextcommand command')
    @nextcommandstr = @nextcommand.append('span')
    @build_submit()        
  build_like: () ->
    @likediv.text('like:')
    @like_input = @likediv.append('input')
    @like_input.on 'input',@update_command
  build_submit: () ->
    @doit_butt = @nextcommand.append('span').append("input").
           attr("style","float:right").
           attr("type","submit").
           attr('value','Do it')
    @doit_butt.on 'click', () =>
      if @update_command()
        @huviz.gclc.run(@command)
        @push_command(@command)
        @reset_editor()
  reset_editor: ->
    @disengage_all_verbs()
    @deselect_all_node_classes()
    @clear_like()
    @update_command()
  disengage_all_verbs: ->
    for vid in @engaged_verbs
      @disengage_verb(vid)
  deselect_all_node_classes: ->
    for nid in @node_classes_chosen
      @deselect_node_class(nid)
      @node_class_picker.set_branch_pickedness(nid,false)
  clear_like: ->
    @like_input[0][0].value = ""
  old_commands: []
  push_command: (cmd) ->
    if @old_commands.length > 0
      prior = @old_commands[@old_commands.length-1]
      if prior.cmd.str is cmd.str
        return  # same as last command, ignore
    cmd_ui = @oldcommands.append('div').attr('class','command')
    record =
      elem: cmd_ui
      cmd: cmd
    @old_commands.push(record)
    cmd_ui.text(cmd.str)
  build_command: ->
    args = {}
    if @engaged_verbs.length > 0
      args.verbs = (v for v in @engaged_verbs)
    if @node_classes_chosen.length > 0
      args.classes = (class_name for class_name in @node_classes_chosen)
    like_str = (@like_input[0][0].value or "").trim()
    if like_str
      args.like = like_str
    @command = new gcl.GraphCommand(args)
  update_command: () =>
    @command = @build_command()
    @nextcommandstr.text(@command.str)
    if @command.ready
      @doit_butt.attr('disabled',null)
    else
      @doit_butt.attr('disabled','disabled')
    return @command.ready
  build_verb_form: () ->
    for vset in @verb_sets
      alternatives = @verbdiv.append('div').attr('class','alternates')
      for id,label of vset
        @append_verb_control(id,label,alternatives)
  get_verbs_overridden_by: (verb_id) ->
    override = @verbs_override[verb_id] || []
    for vset in @verb_sets
      if vset[verb_id]
        for vid,label of vset
          if not (vid in override) and verb_id isnt vid
            override.push(vid)
    return override
  engaged_verbs: []
  engage_verb: (verb_id) ->
    overrides = @get_verbs_overridden_by(verb_id)
    for vid in @engaged_verbs
      if vid in overrides
        @disengage_verb(vid)
    if not (verb_id in @engaged_verbs)
      @engaged_verbs.push(verb_id)
  disengage_verb: (verb_id) ->
    @engaged_verbs = @engaged_verbs.filter (verb) -> verb isnt verb_id
    @verb_control[verb_id].classed('engaged',false)
  verb_control: {}
  append_verb_control: (id,label,alternatives) ->
    vbctl = alternatives.append('div').attr("class","verb")
    @verb_control[id] = vbctl
    vbctl.text(label)
    that = @
    vbctl.on 'click', () ->
      elem = d3.select(this)
      newstate = not elem.classed('engaged')
      elem.classed('engaged',newstate)
      if newstate
        that.engage_verb(id)
      else
        that.disengage_verb(id)
      that.update_command()    
    
(exports ? this).CommandController = CommandController    