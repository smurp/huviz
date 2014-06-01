###
# verbs: choose,label,discard,shelve,unlabel
# classes: writers,others,people,orgs # places,titles
# like:
# ids:
#
#  choose,label/unlabel,discard,shelve,expand
#
###
window.toggle_suspend_updates = (val) ->
  if not window.suspend_updates? or not window.suspend_updates
    window.suspend_updates = true
  else
    window.suspend_updates = false
  if val?
    window.suspend_updates = val
  #console.warn "suspend_updates",window.suspend_updates
  return window.suspend_updates
  
TaxonBase = require("taxonbase").TaxonBase
gcl = require('graphcommandlanguage')
TreePicker = require('treepicker').TreePicker
ColoredTreePicker = require('coloredtreepicker').ColoredTreePicker
class CommandController
  constructor: (@huviz,@container,@hierarchy) ->
    document.addEventListener 'dataset-loaded', @on_dataset_loaded
    d3.select(@container).html("")
    #@init_indices()
    @comdiv = d3.select(@container).append("div")
    #@gclpane = @comdiv.append('div').attr('class','gclpane')
    @cmdlist = @comdiv.append('div').attr('class','commandlist')
    @title_bar_controls()        
    @oldcommands = @cmdlist.append('div').attr('class','commandhistory')
    @nextcommandbox = @comdiv.append('div')
    @verbdiv = @comdiv.append('div').attr('class','verbs')
    #@taxdiv = @comdiv.append('div').attr('class','taxonomydiv')
    @add_clear_both(@comdiv)
    @build_nodeclasspicker()

    @likediv = @comdiv.append('div')
    @add_clear_both(@comdiv)
    @build_predicatepicker()
    @init_editor_data()
    @build_form()
    @update_command()
    @install_listeners()

  install_listeners: () ->
    window.addEventListener 'changePredicate', @predicate_picker.onChangeState
    window.addEventListener 'changeTaxon', @taxon_picker.onChangeState
    window.addEventListener 'changeEnglish', @onChangeEnglish

  on_dataset_loaded: (evt) =>
    if not evt.done?
      @pick_everything()
      @recolor_edges()

      # FIXME is there a standards-based way to prevent this happening three times?
      evt.done = true

  pick_everything: =>
    @onnodeclasspicked 'everything',true
    @huviz.taxonomy['everything'].update_english()

  init_editor_data: ->
    # operations common to the constructor and reset_editor
    @shown_edges_by_predicate = {}
    @unshown_edges_by_predicate = {}
    @node_classes_chosen = [] # new SortedSet()
        
  reset_editor: ->
    @disengage_all_verbs()
    @deselect_all_node_classes()
    @init_editor_data()
    @clear_like()
    @update_command()

  add_clear_both: (target) ->
    # keep taxonomydiv from being to the right of the verbdiv
    target.append('div').attr('style','clear:both') 

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
    @clear_history_button = @cmdlistbar.append('div').
        attr('class','clear_history')
    @cmdlist.append('div').style('clear:both')

    @toggle_history_button.on 'click', () =>
      shown = not @toggle_history_button.classed('hide_history')
      @toggle_history_button.classed('hide_history',shown)
      @toggle_history_button.classed('show_history',not shown)
      @oldcommands.classed('display_none',not shown)

    @clear_history_button.on 'click', () =>
      @oldcommands.html("")

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
      #pred_name = pred_id
      pred_name = pred_id.match(/([\w\d\_\-]+)$/g)[0]
      @add_newpredicate(pred_id,parent,pred_name)

  build_predicatepicker: ->
    id = 'predicates'
    @predicatebox = @comdiv.append('div').classed('container',true).attr('id',id)
    @predicatebox.attr('title',
                       "Medium color: all edges shown -- click to show none\n" +
                       "Faint color: no edges are shown -- click to show all\n" +
                       "Stripey color: some edges shown -- click to show all\n" +
                       "Hidden: no edges among the picked nodes")
    
    @predicatebox.attr('class','scrolling')
    @predicates_ignored = []
    @predicate_picker = new ColoredTreePicker(@predicatebox,'anything')
    @predicate_hierarchy = {'anything':['Anything']}
    @predicate_picker.show_tree(@predicate_hierarchy,@predicatebox,@onpredicateclicked)

  add_newpredicate: (pred_id,parent,pred_name) =>
    @predicate_picker.add(pred_id,parent,pred_name,@onpredicateclicked)

  onpredicateclicked: (pred_id,selected,elem) =>
    @predicate_picker.color_by_selected(pred_id,selected)
    if selected
      verb = 'show'
    else
      verb = 'suppress'
    cmd = new gcl.GraphCommand
      verbs: [verb]
      regarding: [pred_id]
      sets: [@huviz.picked_set]
      
    @prepare_command cmd
    @huviz.gclc.run(@command)

  recolor_edges: (evt) =>
    count = 0
    for node in @huviz.nodes
      for edge in node.links_from
        count++
        pred_n_js_id = edge.predicate.id
        edge.color = @predicate_picker.get_color_forId_byName(pred_n_js_id,'showing')

  build_nodeclasspicker: ->
    id = 'classes'
    @nodeclassbox = @comdiv.append('div').classed('container',true).attr('id',id)
    @nodeclassbox.attr(
      'title',
      "Medium color: all nodes are picked -- click to pick none\n" +
      "Faint color: no nodes are picked -- click to pick all\n" +
      "Stripey color: some nodes are picked -- click to pick all\n")

    @taxon_picker = new ColoredTreePicker(@nodeclassbox,'everything')
    @taxon_picker.show_tree(@hierarchy,@nodeclassbox,@onnodeclasspicked)

  add_newnodeclass: (class_id,parent,class_name) =>
    @taxon_picker.add(class_id,parent,class_name,@onnodeclasspicked)
    @huviz.recolor_nodes()

  onChangeEnglish: (evt) =>
    @object_phrase = evt.detail.english
    @update_command()
    
  onnodeclasspicked: (id,selected,elem) =>
    # FIXME implement the tristate behaviour:
    #   Mixed —> On
    #   On —> Off
    #   Off —> On
    # When we pick "everything" we mean:
    #    all nodes except the embryonic and the discarded
    #    OR rather, the hidden, the graphed and the unlinked
    #console.info("onnodeclasspicked('" + id + ", " + selected + "')")
    toggle_suspend_updates(true)
    @taxon_picker.color_by_selected(id,selected)
    taxon = @huviz.taxonomy[id]
    if taxon?
      #console.clear()
      state = taxon.get_state()
    else
      throw "Uhh, there should be a root Taxon 'everything' by this point"
    #console.debug "id:",id,"state:",state,taxon
    if state in ['mixed','unshowing']
      if not (id in @node_classes_chosen)
        @node_classes_chosen.push(id)
      # PICK all members of the currently chosen classes
      cmd = new gcl.GraphCommand
        verbs: ['pick']
        classes: (class_name for class_name in @node_classes_chosen)
    else if state is 'showing'
      @deselect_node_class(id)
      cmd = new gcl.GraphCommand
        verbs: ['unpick']
        classes: [id]
    else if state is "hidden"
      throw "Uhh, how is it possible for state to equal 'hidden' at this point?"
    if @object_phrase? and @object_phrase isnt ""
      cmd.object_phrase = @object_phrase
    @huviz.gclc.run(cmd)
    toggle_suspend_updates(false)
    @huviz.taxonomy['everything'].update_english()
    @update_command()
    # ////////////////////////////////////////
    # FIXME this is just for testing
    # @predicate_picker.set_branch_mixedness('anything',true)
    # ////////////////////////////////////////

  deselect_node_class: (node_class) ->
    @node_classes_chosen = @node_classes_chosen.filter (eye_dee) ->
      eye_dee isnt node_class


    # # Elements may be in one of these states:
    #   hidden     - TBD: not sure when hidden is appropriate
    #   notshowing - a light color indicating nothing of that type is picked
    #   showing    - a medium color indicating all things of that type are picked
    #   emphasized - mark the class of the focused_node
    #   mixed      - some instances of the node class are picked, but not all
    #   abstract   - the element represents an abstract superclass, presumably containing concrete node classes

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
      print: 'print'
      redact: 'redact'
    ,
      show: 'reveal'
      suppress: 'suppress'
      specify: 'specify'
      #emphasize: 'emphasize'
    ]

  verbs_requiring_regarding:
    ['show','suppress','emphasize','deemphasize']
    
  verbs_override: # when overriding ones are selected, others are deselected
    choose: ['discard','unchoose']
    discard: ['choose','retrieve','hide']
    hide: ['discard','undiscard','label']

  verb_descriptions:
    choose: "Put nodes in the graph."
    shelve: "Remove nodes from the graph and put them on the shelf
             (the circle of nodes around the graph) from which they
             might return if called back into the graph by "
    hide: "Remove nodes from the grpah and don't display them anywhere,
           though they might be called back into the graph when some
           other node calls it back in to show an edge."
    label: "Show the node's labels."
    unlabel: "Stop showing the node's labels."
    discard: "Put nodes in the discard bin (the small red circle) from
              which they do not get called back into the graph unless
              they are retrieved."
    undiscard: "Retrieve nodes from the discard bin (the small red circle)
                and put them back on the shelf."
    print: "Print associated snippets."
    redact: "Hide the associated snippets."
    show: "Show edges: 'Show (nodes) regarding (edges).'
           Add to the existing state of the graph edges from nodes of
           the classes indicated edges of the types indicated."
    suppress: "Stop showing: 'Suppress (nodes) regarding (edges).'
               Remove from the existing sate of the graph edges of the types
               indicated from nodes of the types classes indicated."
    specify: "Immediately specify the entire state of the graph with
              the constantly updating set of edges indicated from nodes
              of the classes indicated."
    load: "Load knowledge from the given uri."

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
  disengage_all_verbs: ->
    for vid in @engaged_verbs
      @disengage_verb(vid)
  deselect_all_node_classes: ->
    for nid in @node_classes_chosen
      @deselect_node_class(nid)
      @taxon_picker.set_branch_pickedness(nid,false)
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
    # if @subjects.length > 0
    #   args.subjects = (s for s in @subjects)
    args.object_phrase = @object_phrase
    if @huviz.picked_set.length > 0      
      args.subjects = (s for s in @huviz.picked_set)
    if @engaged_verbs.length > 0
      args.verbs = (v for v in @engaged_verbs)
    if @node_classes_chosen.length > 0
      args.classes = (class_name for class_name in @node_classes_chosen)
    like_str = (@like_input[0][0].value or "").trim()
    if like_str
      args.like = like_str
    @command = new gcl.GraphCommand(args)
  update_command: () =>
    @prepare_command @build_command()
  prepare_command: (cmd) ->
    @command = cmd
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
    if @verb_descriptions[id]
      vbctl.attr("title",@verb_descriptions[id])
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
  run_script: (script) ->
    @huviz.gclc.run(script)
    
(exports ? this).CommandController = CommandController
