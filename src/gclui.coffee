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
  constructor: (@huviz,@container) ->
    @comdiv = d3.select(@container).append("div")
    @cmdlist = @comdiv.append('div').attr('class','commandlist')

    @cmdlistbar = @cmdlist.append('div').attr('class','cmdlistbar')
    @cmdlistbarcontent = @cmdlistbar.append('div').attr('class','cmdlisttitlebarcontent')
    @cmdlistbarcontent.append('div').attr('class','cmdlisttitle')
    @toggle_history_button = @cmdlistbar.append('div').
        attr('class','hide_history')
    @cmdlistbar.append('div').style('clear:both')

    @toggle_history_button.on 'click', () =>
      shown = not @toggle_history_button.classed('hide_history')
      @toggle_history_button.classed('hide_history',shown)
      @toggle_history_button.classed('show_history',not shown)
      @oldcommands.classed('display_none',not shown)
      
    @toggle_commands_button = @cmdlistbar.append('div').
        attr('class','close_commands')

    @oldcommands = @cmdlist.append('div')
    @nextcommandbox = @comdiv.append('div')
    @verbdiv = @comdiv.append('div')
    @taxdiv = @comdiv.append('div')
    @comdiv.append('div').attr('style','clear:both')
    @nodeclassbox = @comdiv.append('div').classed('container',true)
    @likediv = @comdiv.append('div')    
    @node_classes_chosen = [] # new SortedSet()
    @build_nodeclasspicker()    
    @build_form()
    @update_command()
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
    {choose: 'choose', unchoose: 'unchoose'},
    {label:  'label', unlabel: 'unlabel'},
    {discard: 'discard', undiscard: 'retrieve'},
    #{document: 'document', redact: 'redact'}    
    ]
  verbs_override: # when overriding ones are selected, others are deselected
    choose: ['discard','unchoose']
    discard: ['choose','retrieve']
  hierarchy: { 'everything': ['Everything', {people: ['People', {writers: ['Writers'], others: ['Others']}], orgs: ['Organizations']}]}
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