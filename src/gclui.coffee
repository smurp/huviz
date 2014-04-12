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
TreePicker = require('treepicker').TreePicker
ColoredTreePicker = require('coloredtreepicker').ColoredTreePicker
class CommandController
  constructor: (@huviz,@container,@hierarchy) ->
    d3.select(@container).html("")
    @comdiv = d3.select(@container).append("div")
    #@gclpane = @comdiv.append('div').attr('class','gclpane')
    @cmdlist = @comdiv.append('div').attr('class','commandlist')
    @title_bar_controls()        
    @oldcommands = @cmdlist.append('div').attr('class','commandhistory')
    @nextcommandbox = @comdiv.append('div')
    @verbdiv = @comdiv.append('div').attr('class','verbs')
    @likediv = @comdiv.append('div')
    #@taxdiv = @comdiv.append('div').attr('class','taxonomydiv')
    @add_clear_both(@comdiv)
    @build_nodeclasspicker()
    @add_clear_both(@comdiv)
    @build_predicatepicker()
    @init_editor_data()
    @build_form()
    @update_command()
        

  init_editor_data: ->
    # operations common to the constructor and reset_editor
    @shown_edges_by_predicate = {}
    @unshown_edges_by_predicate = {}
    @node_classes_chosen = [] # new SortedSet()
    @subjects = []
        
  reset_editor: ->
    console.log "reset_editor","====================="
    @disengage_all_verbs()
    @deselect_all_node_classes()
    @init_editor_data()
    @clear_like()
    @update_command()
    #@predicate_picker.set_all_hiddenness(true)


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
      pred_name = pred_id
      @add_newpredicate(pred_id,parent,pred_name)

  build_predicatepicker: ->
    id = 'predicates'
    @predicatebox = @comdiv.append('div').classed('container',true).attr('id',id)
    @predicatebox.attr('class','scrolling')
    @predicates_ignored = []
    @predicate_picker = new ColoredTreePicker(@predicatebox,'anything')
    @predicate_hierarchy = {'anything':['Anything']}
    @predicate_picker.show_tree(@predicate_hierarchy,@predicatebox,@onpredicateclicked)

  add_newpredicate: (pred_id,parent,pred_name) =>
    @predicate_picker.add(pred_id,parent,pred_name,@onpredicateclicked)

  onpredicateclicked: (pred_id,selected,elem) =>
    @predicate_picker.color_by_selected(elem,selected)
    if selected
      verb = 'show'
    else
      verb = 'suppress'
    console.log "engaged_verbs:",@engaged_verbs
    cmd = new gcl.GraphCommand
      verbs: [verb]
      regarding: [pred_id]
      sets: [@huviz.chosen_set]
      
    @prepare_command cmd

  build_nodeclasspicker: ->
    id = 'classes'
    @nodeclassbox = @comdiv.append('div').classed('container',true).attr('id',id)
    @node_class_picker = new ColoredTreePicker(@nodeclassbox,'everything')
    @node_class_picker.show_tree(@hierarchy,@nodeclassbox,@onnodeclasspicked)

  add_newnodeclass: (class_id,parent,class_name) =>
    @node_class_picker.add(class_id,parent,class_name,@onnodeclasspicked)

  onnodeclasspicked: (id,selected,elem) =>
    @node_class_picker.color_by_selected(elem,selected)
    if selected
      if not (id in @node_classes_chosen)
        @node_classes_chosen.push(id)
    else
      @deselect_node_class(id)
    @update_command()

  deselect_node_class: (node_class) ->
    @node_classes_chosen = @node_classes_chosen.filter (eye_dee) ->
      eye_dee isnt node_class

  onsubjectpicked: (subject) => # FIXME rename subject to node
    if not (subject in @subjects)
      adding = true
      @subjects.push(subject)
    else
      adding = false
      @subjects = @subjects.filter (member) ->
        subject isnt member
    @update_predicate_visibility(adding, subject)
    @update_command()

  update_predicate_visibility: (adding, node) =>
    # Maintain per-predicate lists of shown and unshown edges
    # and the list of predicates which have predicates of either
    # kind among the set of nodes which are the current subject set.
    # This collection of data is used to determine the state of
    # the elements in the predicate_picker, wrt the current subjects:
    #  * hidden for those predicates with no edges
    #  * showing-colored for those with edges showing
    #  * notshowing-colored for those with edges but none showing
    #  * more-styled for those with some edges showing and some not

    # Glossary:
    #   'adding' a subject means that all its predicates will become visible in the colorpicker
    #   'removing' means
    #   'shown' means 
    #   'unshown' means 

    uri_to_js_id = @predicate_picker.uri_to_js_id
    console.clear()
    console.log "adding:",adding,"id:",node.id,"name:",node.name
    predicates_newly_identified_as_having_shown_edges = []    
    predicates_newly_identified_as_having_unshown_edges = []
    predicates_newly_identified_as_having_both = []
    predicates_newly_identified_as_having_neither = []

    add_shown = (pred_id, edge) =>
      # This edge is shown, so the associated predicate has at least one shown edge.
      console.log "  adding shown",pred_id        
      if not @shown_edges_by_predicate[pred_id]?
        @shown_edges_by_predicate[pred_id] = []
        # this predicate is newly identified as being shown
        predicates_newly_identified_as_having_shown_edges.push(edge.predicate)
      @shown_edges_by_predicate[pred_id].push(edge)

    remove_shown = (pred_id, edge) =>
      # The node with this edge is being removed from consideration so the predicate
      # associated with this edge has one fewer (or now possibly no) uses.
      console.log "  removing shown",pred_id      
      if @shown_edges_by_predicate[pred_id]?
        @shown_edges_by_predicate[pred_id] = @shown_edges_by_predicate[pred_id].filter (member) ->
          edge isnt member
        if not @shown_edges_by_predicate[pred_id].length
          delete @shown_edges_by_predicate[pred_id]
          predicates_newly_identified_as_having_neither.push(edge.predicate)
          
    add_unshown = (pred_id, edge) =>
      # This edge is not shown, so the associated predicate has at least one unshown edge
      console.log "  adding unshown",pred_id
      if not @unshown_edges_by_predicate[pred_id]?
        @unshown_edges_by_predicate[pred_id] = []
        predicates_newly_identified_as_having_unshown_edges.push(edge.predicate)
      @unshown_edges_by_predicate[pred_id].push(edge)

    remove_unshown = (pred_id, edge) =>
      # The node with this edge is being removed from consideration so the predicate
      # associated with this edge has one fewer (or now possibly no) uses.
      console.log "  removing unshown",pred_id
      if @unshown_edges_by_predicate[pred_id]?
        @unshown_edges_by_predicate[pred_id] = @unshown_edges_by_predicate[pred_id].filter (member) ->
          edge isnt member
        if not @unshown_edges_by_predicate[pred_id].length
          delete @unshown_edges_by_predicate[pred_id]
          if not @shown_edges_by_predicate[pred_id]?
            predicates_newly_identified_as_having_neither.push(edge.predicate)
    
    consider_edge_significance = (edge, i) =>
      # FIXME perhaps we should exclude edges where edge.subject isnt subject
      #if edge.subject isnt subject
      #  # Consider only those edge which eminate from the subject.
      #  # Doing this means that only the writers in the Orlando data
      #  # will be respected for consideration
      #  return
         
      # To discover which predicates are available but not yet displayed
      # we must find those links_from which are not links_shown

      pred_id = uri_to_js_id(edge.predicate.id)
      if adding
        if edge.shown
          add_shown(pred_id, edge)
        else
          add_unshown(pred_id, edge)
      else
        if edge.shown
          remove_shown(pred_id, edge)
        else
          remove_unshown(pred_id, edge)

    # Consider all the edges for which node is either subject or object
    node.links_from.forEach consider_edge_significance # node is the subject
    node.links_to.forEach consider_edge_significance   # node is the object

    console.log "newly shown: to be picked ============"
    predicates_newly_identified_as_having_shown_edges.forEach (predicate, i) =>
      pred_js_id = uri_to_js_id(predicate.id)
      #pred_js_id = predicate.id
      console.log " ",pred_js_id, "newly showing"
      unshown_idx = predicates_newly_identified_as_having_unshown_edges.indexOf(predicate)
      if unshown_idx > -1
        predicates_newly_identified_as_having_unshown_edges.splice(unshown_idx)
        # We could remove this predicate from ...having_shown_edges but will not bother
        # because that list will not be used again
        predicates_newly_identified_as_having_both.push(predicate)
        return
      @predicate_picker.set_branch_hiddenness(pred_js_id, false)
      #@predicate_picker.color_by_selected(pred_js_id, true)
      @predicate_picker.set_branch_pickedness(pred_js_id, true)

    console.log "newly unshown: to be unpicked ============ ============"
    predicates_newly_identified_as_having_unshown_edges.forEach (predicate, i) =>
      # no need to compare with ...having_shown_edges because that is done above
      pred_js_id = uri_to_js_id(predicate.id)
      console.log " ",pred_js_id, "unshowing"
      @predicate_picker.set_branch_hiddenness(pred_js_id, false)
      @predicate_picker.set_branch_pickedness(predicate.id, false)

    console.log "newly both AKA mixed: to be marked mixed ============ ============ ============"
    predicates_newly_identified_as_having_both.forEach  (predicate, i) =>
      pred_js_id = uri_to_js_id(predicate.id)
      console.log " ",pred_js_id,"mixed"
      @predicate_picker.set_branch_hiddenness(pred_js_id, false)
      @predicate_picker.set_branch_mixedness(predicate.id,true)

    console.log "newly neither: to be hidden ============ ============ ============ ============"
    predicates_newly_identified_as_having_neither.forEach (predicate, i) =>
      pred_js_id = uri_to_js_id(predicate.id)
      console.log " ",pred_js_id,"hiding"
      @predicate_picker.set_branch_hiddenness(pred_js_id, true)
    
    predicates_to_newly_hide = []
    predicates_to_newly_show = []      


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
    if @subjects.length > 0
      args.subjects = (s for s in @subjects)
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
    
(exports ? this).CommandController = CommandController    