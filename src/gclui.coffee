###
# verbs: choose,label,discard,shelve,unlabel
# classes: writers,others,people,orgs # places,titles
# like:
# ids:
#
#  choose,label/unlabel,discard,shelve,expand
#
###

class CommandController
  constructor: (@huviz,@container) ->
    @comdiv = d3.select(@container).append("div")
    @cmdlist = @comdiv.append('div').attr('class','commandlist')
    @oldcommands = @cmdlist.append('div')
    @nextcommand = @cmdlist.append('div').
        attr('class','nextcommand command')
    @doitdiv = @comdiv.append('div')
    @verbdiv = @comdiv.append('div')
    @taxdiv = @comdiv.append('div')
    @likediv = @comdiv.append('div')

    @build_form()

    @update_command()
  verb_sets: [ # mutually exclusive within each set
    {choose: 'choose', unchoose: 'unchoose'},
    #{label:  'label', unlabel: 'unlabel'},
    {discard: 'discard', undiscard: 'retrieve'}
    #{document: 'document', redact: 'redact'}    
    ]
  verbs_override:
    choose: ['discard','unchoose']
    discard: ['choose','retrieve']
  hierarchy: [ 'everything': ['Anything', {people: ['People', {writers: 'Writers', others: 'Others'}], orgs: ['Organizations']}]]
  build_form: () ->
    @build_verb_form()
    #@build_taxonomy_form()
    @build_like()
    @build_submit()
  build_like: () ->
    @likediv.text('like:')
    @like_input = @likediv.append('input')
    @like_input.on 'input',@update_command
  build_submit: () ->
    @doit_butt = @doitdiv.append("input").
           attr("type","submit").
           attr('value','Do it')
    @doit_butt.on 'click', () =>
      if @update_command()
        @huviz.gclc.run(@cmd_obj)
        #if @cmdlist?
        @push_command(@cmd_obj)
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
  cmd_obj: {}
  update_command: () =>
    @cmd_obj = {}
    cmd_str = ""
    ready = true
    missing = '____'
    numverbs = @engaged_verbs.length
    if @engaged_verbs.length > 0
      @cmd_obj.verbs = []
      @engaged_verbs.forEach (vid,i) =>
        #console.log cmd_str
        if numverbs > 1
          if (numverbs - 1) == i
            cmd_str += " and "
          else
            if i > 0
              cmd_str += ', '
        cmd_str += vid
        @cmd_obj.verbs.push(vid)
    else
      ready = false
      cmd_str = missing
    cmd_str += " "
    @cmd_obj.classes = ['everything']
    cmd_str += 'everything'
    like_str = (@like_input[0][0].value or "").trim()
    if like_str
      cmd_str += " like '"+like_str+"'"
      @cmd_obj.like = like_str
    cmd_str += " ."
    @cmd_obj.str = cmd_str    
    @nextcommand.text(cmd_str)
    if ready
      @doit_butt.attr('disabled',null)
    else
      @doit_butt.attr('disabled','disabled')
    return ready
  build_verb_form: () ->
    last_slash = null
    last_group_sep = null    
    for vset in @verb_sets
      for id,label of vset
        @append_verb_control(id,label)
        last_slash = @verbdiv.append('text').text('/')
      last_group_sep = @verbdiv.append('text').text(',')        
      last_slash.remove()
    last_group_sep.remove()
  get_verbs_overridden_by: (verb_id) ->
    override = @verbs_override[verb_id] || []
    for vset in @verb_sets
      if vset[verb_id]
        for vid,label of vset
          if not (vid in override) and verb_id isnt vid
            override.push(vid)
    #console.log verb_id,"overrides",override
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
  append_verb_control: (id,label) ->
    vbctl = @verbdiv.append('span').attr("class","verb")
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