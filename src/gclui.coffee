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
    @comdiv = d3.select(@container).append("div").attr('class','command')
    @verbdiv = @comdiv.append('div')
    @taxdiv = @comdiv.append('div')
    @likediv = @comdiv.append('div')    
    @build_form()
  verb_sets: [ # mutually exclusive within each set
    {choose: 'choose', unchoose: 'unchoose'},
    {label:  'label', unlabel: 'unlabel'},
    {discard: 'discard', undiscard: 'retrieve'},
    {showtext: 'document', hidetext: 'redact'}    
    ]
  verbs_override:
    choose: ['discard','unchoose']
    discard: ['choose','retrieve']
  hierarchy: [ anything: ['Anything', {people: ['People', {writers: 'Writers', others: 'Others'}], orgs: ['Organizations']}]]
  build_form: () ->
    @build_verb_form()
    #@build_taxonomy_form()
    @build_like()
    @build_submit()
  build_like: () ->
    @likediv.text('like:')
    @like_input = @likediv.append('input')
  build_submit: () ->
    @doit_butt = @comdiv.append("input").
           attr("type","submit").
           attr('value','Do it')
    @doit_butt.on 'click', () =>
      cmd = @get_current_command()
      @huviz.gclc.run(cmd)
  get_current_command: () ->
    return "choose '_:E'"
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
    @engaged_verbs.filter (verb) -> verb isnt verb_id
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
(exports ? this).CommandController = CommandController    