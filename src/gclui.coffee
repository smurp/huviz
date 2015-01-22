
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
    if @container is null
      @container = d3.select("body").append("div").attr("id", "gclui")[0][0]
    d3.select(@container).html("")
    #@init_indices()
    @comdiv = d3.select(@container).append("div")
    @cmdlist = d3.select("#tabs-history").append('div').attr('class','commandlist')
    @title_bar_controls()
    @oldcommands = @cmdlist.append('div').attr('class','commandhistory')

    @control_label("Current Command")
    @nextcommandbox = @comdiv.append('div')

    @control_label("Choose Verb")
    @verbdiv = @comdiv.append('div').attr('class','verbs')
    @add_clear_both(@comdiv)

    @control_label("Select Nodes")
    @build_setpicker()
    #@add_clear_both(@comdiv)    

    @build_nodeclasspicker()    
    @likediv = @comdiv.append('div')
    @add_clear_both(@comdiv)

    @control_label("Edges of the Selected Nodes")
    @build_predicatepicker()
    @init_editor_data()
    @build_form()
    @update_command()
    @install_listeners()

  control_label: (txt) ->
    @comdiv.append('div').classed("control_label",true).text(txt)

  install_listeners: () ->
    window.addEventListener 'changePredicate', @predicate_picker.onChangeState
    @setListenFor_changeTaxon(true)
    window.addEventListener 'changeEnglish', @onChangeEnglish

  setListenFor_changeTaxon: (doit) ->
    if doit
      console.warn "listening for 'changeTaxon'"
      window.addEventListener 'changeTaxon', @taxon_picker.onChangeState
    else
      console.warn "un-listening for 'changeTaxon'"
      window.removeEventListener 'changeTaxon', @taxon_picker.onChangeState

  on_dataset_loaded: (evt) =>
    if not evt.done?
      @select_the_initial_set()
      @huviz.hide_state_msg()
      # FIXME is there a standards-based way to prevent this happening three times?
      evt.done = true

  select_the_initial_set: =>
    @huviz.pick_taxon("Thing", true)
    #@engage_verb('choose')

  init_editor_data: ->
    # operations common to the constructor and reset_editor
    @shown_edges_by_predicate = {}
    @unshown_edges_by_predicate = {}
    @node_classes_chosen = [] # new SortedSet()
        
  reset_editor: ->
    @disengage_all_verbs()
    @unselect_all_node_classes()
    @init_editor_data()
    @clear_like()
    @update_command()

  add_clear_both: (target) ->
    # keep taxonomydiv from being to the right of the verbdiv
    target.append('div').attr('style','clear:both') 

  title_bar_controls: ->
    return
    @show_comdiv_button = d3.select(@container).
         append('div').classed('show_comdiv_button',true)
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

    @clear_history_button = d3.select("#tab-history").
        append('input').
        attr("type","submit").
        attr('value','Clear')
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
    pred_uri = e.detail.pred_uri
    parent_lid = e.detail.parent_lid
    pred_lid = e.detail.pred_lid
    unless pred_uri in @predicates_ignored # FIXME merge with predicates_to_ignore
      unless pred_lid in @predicates_ignored # FIXME merge with predicates_to_ignore
        pred_name = pred_lid.match(/([\w\d\_\-]+)$/g)[0]      
        @add_newpredicate(pred_lid,parent_lid,pred_name)
        @recolor_edges_and_predicates_eventually(e)

  recolor_edges_and_predicates_eventually: ->
    if @recolor_edges_and_predicates_eventually_id?
      # console.log "defer edges_and_predicates",@recolor_edges_and_predicates_eventually_id
      clearTimeout(@recolor_edges_and_predicates_eventually_id)
    @recolor_edges_and_predicates_eventually_id = setTimeout(@recolor_edges_and_predicates, 300)

  recolor_edges_and_predicates: (evt) =>
    # console.log "recolor_edges_and_predicates()"
    @predicate_picker.recolor_now()
    @recolor_edges() # FIXME should only really be run after the predicate set has settled for some amount of time
          
  build_predicatepicker: ->
    id = 'predicates'
    @predicatebox = @comdiv.append('div').classed('container',true).attr('id',id)
    @predicatebox.attr('title',
                       "Medium color: all edges shown -- click to show none\n" +
                       "Faint color: no edges are shown -- click to show all\n" +
                       "Stripey color: some edges shown -- click to show all\n" +
                       "Hidden: no edges among the selected nodes")
    
    #@predicatebox.attr('class','scrolling')
    @predicates_ignored = []
    @predicate_picker = new ColoredTreePicker(@predicatebox,'anything',[],true)
    @predicate_hierarchy = {'anything':['anything']}
    
    # FIXME Why is show_tree being called four times per node?
    @predicate_picker.show_tree(@predicate_hierarchy,@predicatebox,@on_predicate_clicked)

  add_newpredicate: (pred_lid, parent_lid, pred_name) =>
    #if pred_lid in @predicates_to_ignore
    #  return
    @predicate_picker.add(pred_lid, parent_lid, pred_name, @on_predicate_clicked)

  on_predicate_clicked: (pred_id,selected,elem) =>
    if selected
      verb = 'show'
    else
      verb = 'suppress'
    cmd = new gcl.GraphCommand
      verbs: [verb]
      regarding: [pred_id]
      sets: [@huviz.selected_set]
      
    @prepare_command cmd
    @huviz.gclc.run(@command)

  recolor_edges: (evt) =>
    count = 0
    for node in @huviz.nodes
      for edge in node.links_from
        count++
        pred_n_js_id = edge.predicate.id
        edge.color = @predicate_picker.get_color_forId_byName(pred_n_js_id,'showing')

  ###
  #     Collapsing and expanding taxons whether abstract or just instanceless.
  #
  #     ▼ 0x25bc
  #     ▶ 0x25b6
  #
  #     Expanded                   Collapsed
  #     +-----------------+        +-----------------+
  #     | parent        ▼ |        | parent        ▶ |
  #     |   +------------+|        +-----------------+
  #     |   | child 1    ||
  #     |   +------------+|
  #     |   | child 2    ||
  #     |   +------------+|
  #     +-----------------+
  #
  #     Clicking an expanded parent should cycle thru selection and deselection
  #     of only its direct instances, if there are any.
  #
  #     Clicking a collapsed parent should cycle thru selection and deselection
  #     of its direct instances as well as those of all its children.
  #
  #     The coloring of expanded parents cycles thru the three states:
  #       Mixed - some of the direct instances are selected
  #       On - all of the direct instances are selected
  #       Off - none of the direct instances are selected
  #   
  #     The coloring of a collapsed parent cycles thru the three states:
  #       Mixed - some descendant instances are selected (direct or indirect)
  #       On - all descendant instances are selected (direct or indirect)
  #       Off - no descendant instances are selected (direct or indirect)
  #
  #     Indirect instances are the instances of subclasses.
  ###

  build_nodeclasspicker: ->
    id = 'classes'
    @nodeclassbox = @comdiv.append('div')
        .classed('container',true)
        .attr('id',id)
    @nodeclassbox.attr('style','vertical-align:top')
    @nodeclassbox.attr(
      'title',
      "Medium color: all nodes are selected -- click to select none\n" +
      "Faint color: no nodes are selected -- click to select all\n" +
      "Stripey color: some nodes are selected -- click to select all\n")

    # http://en.wikipedia.org/wiki/Taxon
    @taxon_picker = new ColoredTreePicker(@nodeclassbox,'Thing',[],true) #,@)
    @taxon_picker.show_tree(@hierarchy,@nodeclassbox,@on_taxon_picked)

  add_newnodeclass: (class_id,parent_lid,class_name,taxon) =>
    @taxon_picker.add(class_id,parent_lid,class_name,@on_taxon_picked)
    @taxon_picker.recolor_now()
    @huviz.recolor_nodes()

  onChangeEnglish: (evt) =>
    @object_phrase = evt.detail.english
    @update_command()

  on_taxon_picked: (id, selected, elem, propagate_DEPRECATED) =>
    # TODO
    #   remove propagate argument
    #   pass in new_state rather than selected

    # this supposedly implements the tristate behaviour:
    #   Mixed —> On
    #   On —> Off
    #   Off —> On
    # When we select "Thing" we mean:
    #    all nodes except the embryonic and the discarded
    #    OR rather, the hidden, the graphed and the unlinked
    # When propagate we need to update the treepicker and the selected_set.
    #   * the colors of child nodes on the treepicker
    #   * the color of the clicked node on the treepicker
    #      - should be stripey if subclass coloring is mixed

    new_state = selected and 'showing' or 'unshowing'
    taxon = @huviz.taxonomy[id]
    if taxon?
      old_state = taxon.get_state()
    else
      throw "Uhh, there should be a root Taxon 'Thing' by this point: " + id

    console.info("on_taxon_picked() id: #{id}, new_state: #{new_state}, old_state: #{old_state}")
    if new_state is 'showing'
      if old_state in ['mixed','unshowing']
        if not (id in @node_classes_chosen)
          @node_classes_chosen.push(id)
        # SELECT all members of the currently chosen classes
        cmd = new gcl.GraphCommand
          verbs: ['select']
          classes: (class_name for class_name in @node_classes_chosen)
      else
        console.log "there should be nothing to do because #{old_state} == #{new_state}"
        
    else if new_state is 'unshowing'
      @unselect_node_class(id)
      cmd = new gcl.GraphCommand
        verbs: ['unselect']
        classes: [id]
    else if old_state is "hidden"
      console.error "Uhh, how is it possible for #{id}.old_state to equal 'hidden' at this point?"
    if cmd?
      if @object_phrase? and @object_phrase isnt ""
        cmd.object_phrase = @object_phrase
      @huviz.gclc.run(cmd)
      @huviz.taxonomy['Thing'].update_english()
    @update_command()

  unselect_node_class: (node_class) ->
    # removes node_class from @node_classes_chosen
    @node_classes_chosen = @node_classes_chosen.filter (eye_dee) ->
      eye_dee isnt node_class

    # # Elements may be in one of these states:
    #   hidden     - TBD: not sure when hidden is appropriate
    #   notshowing - a light color indicating nothing of that type is selected
    #   showing    - a medium color indicating all things of that type are selected
    #   emphasized - mark the class of the focused_node
    #   mixed      - some instances of the node class are selected, but not all
    #   abstract   - the element represents an abstract superclass, presumably containing concrete node classes

  verb_sets: [ # mutually exclusive within each set
      choose: 'choose'
      unchoose: 'unchoose'
    ,
      select: 'select'
      unselect: 'unselect'
    ,
      label:   'label'
      unlabel: 'unlabel'
    ,  
      shelve: 'shelve'
      hide:   'hide'
    ,
      discard: 'discard'
      undiscard: 'retrieve'
    #,
    #  print: 'print'
    #  redact: 'redact'
    #  peek: 'peek'

    #,  # FIXME the edge related commands must be reviewed
    #  show: 'reveal'
    #  suppress: 'suppress'
    #  specify: 'specify'
      #emphasize: 'emphasize'
    ]

  auto_change_verb_tests:
    select: (node) ->
      if node.selected?
        return 'unselect'
    unselect: (node) ->
      if not node.selected?
        return 'select'
    choose: (node) ->
      if node.chosen?
        return 'unchoose'
    unchoose: (node) ->
      if not node.chosen?
        return 'choose'
    label: (node) ->
      if node.labelled
        return 'unlabel'
    unlabel: (node) ->
      if not node.labelled
        return 'label'

  is_immediate_mode: ->
    @engaged_verbs.length is 1 # should also test for empty object

  auto_change_verb_if_warranted: (node) ->
    if @is_immediate_mode()
      verb = @engaged_verbs[0]
      test = @auto_change_verb_tests[verb]
      if test
        next_verb = test(node)
        if next_verb
          @engage_verb(next_verb)

  verbs_requiring_regarding:
    ['show','suppress','emphasize','deemphasize']
    
  verbs_override: # when overriding ones are selected, others are unselected
    choose: ['discard', 'unchoose', 'shelve', 'hide']
    shelve: ['unchoose', 'choose', 'hide', 'discard', 'retrieve']
    discard: ['choose', 'retrieve', 'hide', 'unchoose', 'unselect', 'select']
    hide: ['discard', 'undiscard', 'label', 'choose' ,'unchoose', 'select', 'unselect']

  verb_descriptions:
    choose: "Put nodes in the graph."
    shelve: "Remove nodes from the graph and put them on the shelf
             (the circle of nodes around the graph) from which they
             might return if called back into the graph by a neighbor
             being chosen."
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
           attr('value','Do it').
           attr('id','doit_button')
    @doit_butt.on 'click', () =>
      if @update_command()
        @huviz.gclc.run(@command)
        @push_command(@command)
        @reset_editor()
        @huviz.update_all_counts()
  disengage_all_verbs: ->
    for vid in @engaged_verbs
      @disengage_verb(vid)
  unselect_all_node_classes: ->
    for nid in @node_classes_chosen
      @unselect_node_class(nid)
      @taxon_picker.set_direct_state(nid, 'unshowing')
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
    if @engaged_verbs.length > 0
      args.verbs = (v for v in @engaged_verbs)
    if @chosen_set_id
      args.sets = [@chosen_set]
    else
      if @node_classes_chosen.length > 0
        args.classes = (class_name for class_name in @node_classes_chosen)
      if @huviz.selected_set.length > 0      
        args.subjects = (s for s in @huviz.selected_set)
    like_str = (@like_input[0][0].value or "").trim()
    if like_str
      args.like = like_str
    @command = new gcl.GraphCommand(args)
  update_command: () =>
    @huviz.show_state_msg("update_command")
    @prepare_command @build_command()
    @huviz.hide_state_msg()
  prepare_command: (cmd) ->
    @command = cmd
    @nextcommandstr.text(@command.str)
    if @command.ready
      @doit_butt.attr('disabled',null)
    else
      @doit_butt.attr('disabled','disabled')
    return @command.ready
  ready_to_perform: () ->
    @engaged_verbs.length > 0 and not @object_phrase
  build_verb_form: () ->
    for vset in @verb_sets
      alternatives = @verbdiv.append('div').attr('class','alternates')
      for id,label of vset
        @build_verb_picker(id,label,alternatives)
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
    @verb_control[verb_id].classed('engaged',true)
    for vid in @engaged_verbs
      if vid in overrides
        @disengage_verb(vid)
    if not (verb_id in @engaged_verbs)
      @engaged_verbs.push(verb_id)
  disengage_verb: (verb_id) ->
    @engaged_verbs = @engaged_verbs.filter (verb) -> verb isnt verb_id
    @verb_control[verb_id].classed('engaged',false)
  verb_control: {}
  build_verb_picker: (id,label,alternatives) ->
    vbctl = alternatives.append('div').attr("class","verb")
    if @verb_descriptions[id]
      vbctl.attr("title",@verb_descriptions[id]).attr("id", "verb-"+id)
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
    @huviz.update_all_counts()

  build_setpicker: () ->
    # FIXME populate @the_sets from @huviz.selectable_sets
    @the_sets = {'nodes': ['All ', {'selected_set': ['Selected'], 'chosen_set': ['Chosen'], 'graphed_set': ['Graphed'], 'shelved_set': ['Shelved'], 'hidden_set': ['Hidden'], 'discarded_set': ['Discarded'], 'labelled_set': ['Labelled']}]}
    @set_picker_box = @comdiv.append('div')
        .classed('container',true)
        .attr('id', 'sets')
    @set_picker = new TreePicker(@set_picker_box,'all',['treepicker-vertical'])
    @set_picker.show_tree(@the_sets, @set_picker_box, @on_set_picked)
    @populate_all_set_docs()

  populate_all_set_docs: () ->
    for id, a_set of @huviz.selectable_sets
      if a_set.docs?
        @set_picker.set_title(id, a_set.docs)

  on_set_picked: (set_id, picking) =>
    @clear_set_picker()
    if picking
      @set_picker.set_state_by_id(set_id, "showing")
      @chosen_set = @huviz[set_id]
      @chosen_set_id = set_id
    else  # FIXME @chosen_set OR @chosen_set_id but why both?
      @set_picker.set_state_by_id(set_id, "unshowing")
      delete @chosen_set
      delete @chosen_set_id
    @update_command()

  on_set_count_update: (set_id, count) =>
    @set_picker.set_payload(set_id, count)

  clear_set_picker: () ->
    if @chosen_set_id?
      @set_picker.set_direct_state(@chosen_set_id, 'unshowing')
      delete @chosen_set_id
        
(exports ? this).CommandController = CommandController
