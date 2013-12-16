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
  engaged_verbs: []
  hierarchy: [ anything: ['Anything', {people: ['People', {writers: 'Writers', others: 'Others'}], orgs: ['Organizations']}]]
  build_form: () ->
    @build_verb_form()
    #@build_taxonomy_form()
    #@build_like()
    #@build_submit()
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
  engage_verb: (d) ->
  verb_control: {}
  append_verb_control: (id,label) ->
    vbctl = @verbdiv.append('span').attr("class","verb")
    @verb_control[id] = vbctl
    #vbctl.data('verb_id',id)
    vbctl.text(label)
    that = @
    vbctl.on 'click', () ->
      elem = d3.select(this)
      newstate = not elem.classed('engaged')
      elem.classed('engaged',newstate)
      if newstate
        that.engage_verb(id)
(exports ? this).CommandController = CommandController    