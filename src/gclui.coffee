
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
  console.log "toggle_suspend_updates(#val)"
  if not window.suspend_updates? or not window.suspend_updates
    window.suspend_updates = true
  else
    window.suspend_updates = false
  if val?
    window.suspend_updates = val
  #console.warn "suspend_updates",window.suspend_updates
  return window.suspend_updates

gcl = require('graphcommandlanguage')
TreePicker = require('treepicker').TreePicker
ColoredTreePicker = require('coloredtreepicker').ColoredTreePicker
class CommandController
  constructor: (@huviz, @container, @hierarchy) ->
    document.addEventListener 'dataset-loaded', @on_dataset_loaded
    $("#tabs").resizable({handles: {'w':'#ctrl-handle'}})
    if @container is null
      @container = d3.select("body").append("div").attr("id", "gclui")[0][0]
    if not @huviz.all_set.length
      $(@container).hide()
    d3.select(@container).html("")
    if @huviz.args.display_hints
      @hints = d3.select(@container).append("div").attr("class","hints")
      $(".hints").append($(".hint_set").contents())
    @comdiv = d3.select(@container).append("div") # --- Add a container
    @cmdlist = d3.select("#tabs-history").append('div').attr('class','commandlist')
    @oldcommands = @cmdlist.append('div').attr('class','commandhistory')
    @control_label("Current Command")
    @nextcommandbox = @comdiv.append('div')
    @make_verb_sets()
    @control_label("Verbs")
    @verbdiv = @comdiv.append('div').attr('class','verbs')
    @add_clear_both(@comdiv)
    #@node_pickers = @comdiv.append('div')
    @node_pickers = @comdiv.append('div').attr("id","node_pickers")
    @set_picker_box_parent = @build_set_picker("Sets",@node_pickers)
    @taxon_picker_box_parent = @build_taxon_picker("Class Selector",@node_pickers)
    @add_clear_both(@comdiv)
    @likediv = @taxon_picker_box_parent.append('div')
    @build_predicate_picker("Edges of the Selected Nodes")
    @init_editor_data()
    @build_form()
    @update_command()
    @install_listeners()
  control_label: (txt, what, title) ->
    what = what or @comdiv
    outer = what.append('div')
    label = outer.append('div')
    label.classed("control_label",true).text(txt)
    if title
      label.attr('title',title)
    return outer
  install_listeners: () ->
    window.addEventListener 'changePredicate', @predicate_picker.onChangeState
    window.addEventListener 'changeTaxon', @taxon_picker.onChangeState
    window.addEventListener 'changeEnglish', @onChangeEnglish
  on_dataset_loaded: (evt) =>
    if not evt.done?
      $(@container).show()
      @show_succession_of_hints()
      @select_the_initial_set()
      @huviz.hide_state_msg()
      # FIXME is there a standards-based way to prevent this happening three times?
      evt.done = true
  show_succession_of_hints: ->
    # Show the reminders, give them close buttons which reveal them in series
    $(".hints.hint_set").show()
    for reminder in $(".hints > .a_hint")
      $(reminder).attr('style','position:relative')
      $(reminder).append('<i class="fa fa-close close_hint"></i>').
        on "click", (evt,ui) =>
          $(evt.target).parent().hide() # hide reminder whose close was clicked
          if $(evt.target).parent().next() # is there a next another
            $(evt.target).parent().next().show() # then show it
          return false # so not all close buttons are pressed at once
    $(".hints > .a_hint").hide()
    $(".hints > .a_hint").first().show()
  select_the_initial_set: =>
    # TODO initialize the taxon coloring without cycling all
    @huviz.toggle_taxon("Thing", true)
    @huviz.toggle_taxon("Thing", false)
    @huviz.shelved_set.resort() # TODO remove when https://github.com/cwrc/HuViz/issues/109

    return
    #@engage_verb('choose')
  init_editor_data: ->
    # operations common to the constructor and reset_editor
    @shown_edges_by_predicate = {}
    @unshown_edges_by_predicate = {}
    @taxons_chosen = [] # new SortedSet()
  reset_editor: ->
    @clear_like()
    @disengage_all_verbs()
    @disengage_all_sets()
    @clear_all_sets()
    @init_editor_data()
    @update_command()
  disengage_command: ->
    @clear_like()
    @disengage_all_verbs()
    @disengage_all_sets()
    @update_command()
  disengage_all: ->
    @clear_like()
    @disengage_all_sets()
    @disengage_all_verbs()
    @update_command()
  add_clear_both: (target) ->
    # keep taxonomydiv from being to the right of the verbdiv
    target.append('div').attr('style','clear:both')
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
    @predicate_picker.recolor_now()
    @recolor_edges() # FIXME should only really be run after the predicate set has settled for some amount of time
  build_predicate_picker: (label) ->
    id = 'predicates'
    title =
      "Medium color: all edges shown -- click to show none\n" +
      "Faint color: no edges are shown -- click to show all\n" +
      "Stripey color: some edges shown -- click to show all\n" +
      "Hidden: no edges among the selected nodes"
    where = label? and @control_label(label,@comdiv,title) or @comdiv
    @predicatebox = where.append('div').classed('container',true).attr('id',id)
    #@predicatebox.attr('class','scrolling')
    @predicates_ignored = []
    @predicate_picker = new ColoredTreePicker(@predicatebox,'anything',[],true)
    @predicate_hierarchy = {'anything':['anything']}
    # FIXME Why is show_tree being called four times per node?
    @predicate_picker.click_listener = @on_predicate_clicked
    @predicate_picker.show_tree(@predicate_hierarchy, @predicatebox)
    $("#predicates").addClass("ui-resizable").append("<br class='clear'>")
    $("#predicates").resizable(handles: 's')

  add_newpredicate: (pred_lid, parent_lid, pred_name) =>
    #if pred_lid in @predicates_to_ignore
    #  return
    @predicate_picker.add(pred_lid, parent_lid, pred_name, @on_predicate_clicked)
  on_predicate_clicked: (pred_id, new_state, elem) =>
    @start_working()
    setTimeout () => # run asynchronously so @start_working() can get a head start
      @perform_on_predicate_clicked(pred_id, new_state, elem)
  perform_on_predicate_clicked: (pred_id, new_state, elem) =>
    if new_state is 'showing'
      verb = 'show'
    else
      verb = 'suppress'
    cmd = new gcl.GraphCommand @huviz,
      verbs: [verb]
      regarding: [pred_id]
      sets: [@huviz.selected_set]
    @prepare_command(cmd)
    @huviz.run_command(@command)
  recolor_edges: (evt) =>
    count = 0
    for node in @huviz.all_set
      for edge in node.links_from
        count++
        pred_n_js_id = edge.predicate.id
        edge.color = @predicate_picker.get_color_forId_byName(pred_n_js_id, 'showing')
  build_taxon_picker: (label, where) ->
    id = 'classes'
    title =
      "Medium color: all nodes are selected -- click to select none\n" +
      "Faint color: no nodes are selected -- click to select all\n" +
      "Stripey color: some nodes are selected -- click to select all\n"
    where = label? and @control_label(label, where, title) or @comdiv
    @taxon_box = where.append('div')
        .classed('container',true)
        .attr('id',id)
    @taxon_box.attr('style','vertical-align:top')
    # http://en.wikipedia.org/wiki/Taxon
    @taxon_picker = new ColoredTreePicker(@taxon_box,'Thing',[],true)
    @taxon_picker.click_listener = @on_taxon_clicked
    @taxon_picker.hover_listener = @on_taxon_hovered
    @taxon_picker.show_tree(@hierarchy,@taxon_box)
    where.classed("taxon_picker_box_parent", true)
    return where
  add_new_taxon: (class_id,parent_lid,class_name,taxon) =>
    @taxon_picker.add(class_id,parent_lid,class_name,@on_taxon_clicked)
    @taxon_picker.recolor_now()
    @huviz.recolor_nodes()
  onChangeEnglish: (evt) =>
    @object_phrase = evt.detail.english
    @update_command()
  on_taxon_clicked: (id, new_state, elem) =>
    # this supposedly implements the tristate behaviour:
    #   Mixed —> On
    #   On —> Off
    #   Off —> On
    # When we select "Thing" we mean:
    #    all nodes except the embryonic and the discarded
    #    OR rather, the hidden, the graphed and the unlinked
    @start_working()
    setTimeout () => # run asynchronously so @start_working() can get a head start
      @perform_on_taxon_clicked(id, new_state, elem)
  set_taxa_click_storm_callback: (callback) ->
    if @taxa_click_storm_callback?
      throw new Error("taxa_click_storm_callback already defined")
    else
      @taxa_click_storm_callback = callback
  taxa_being_clicked_increment: ->
    if not @taxa_being_clicked?
      @taxa_being_clicked = 0
    @taxa_being_clicked = @taxa_being_clicked + 1
    return
  taxa_being_clicked_decrement: ->
    if not @taxa_being_clicked?
      throw new Error("taxa_being_clicked_decrement() has apparently been called before taxa_being_clicked_increment()")
    #@taxa_being_clicked ?= 1
    console.log("taxa_being_clicked_decrement() before:", @taxa_being_clicked)
    @taxa_being_clicked--
    console.log("taxa_being_clicked_decrement() after:", @taxa_being_clicked)
    if @taxa_being_clicked is 0
      console.log("taxa click storm complete after length #{@taxa_click_storm_length}")
      #debugger if @taxa_click_storm_callback?
      if @taxa_click_storm_callback?
        @taxa_click_storm_callback.call(document)
        @taxa_click_storm_callback = null
      #@taxa_click_storm_length = 0
    #else
    #  @taxa_click_storm_length ?= 0
    #  @taxa_click_storm_length++
  perform_on_taxon_clicked: (id, new_state, elem) =>
    @taxa_being_clicked_increment()
    taxon = @huviz.taxonomy[id]
    if taxon?
      old_state = taxon.get_state()
    else
      throw "Uhh, there should be a root Taxon 'Thing' by this point: " + id
    if new_state is 'showing'
      if old_state in ['mixed', 'unshowing', 'empty']
        if not (id in @taxons_chosen)
          @taxons_chosen.push(id)
        # SELECT all members of the currently chosen classes
        cmd = new gcl.GraphCommand @huviz,
          verbs: ['select']
          classes: (class_name for class_name in @taxons_chosen)
      else
        console.error "there should be nothing to do because #{id}.#{old_state} == #{new_state}"
    else if new_state is 'unshowing'
      @unselect_node_class(id)
      cmd = new gcl.GraphCommand @huviz,
        verbs: ['unselect']
        classes: [id]
    else if old_state is "hidden"
      console.error "Uhh, how is it possible for #{id}.old_state to equal 'hidden' at this point?"
    @taxon_picker.style_with_kid_color_summary_if_needed(id)
    if cmd?
      if @object_phrase? and @object_phrase isnt ""
        cmd.object_phrase = @object_phrase
      #@show_working_on()
      #window.suspend_updates = false #  window.toggle_suspend_updates(false)
      @huviz.run_command(cmd)
      #@show_working_off()
    if new_state is 'showing'
      because =
        taxon_added: id
        cleanup: () =>
          @on_taxon_clicked(id, 'unshowing', elem)
    @update_command(because)
    @taxa_being_clicked_decrement()
  unselect_node_class: (node_class) ->
    # removes node_class from @taxons_chosen
    @taxons_chosen = @taxons_chosen.filter (eye_dee) ->
      eye_dee isnt node_class
    # # Elements may be in one of these states:
    #   mixed      - some instances of the node class are selected, but not all
    #   unshowing  - a light color indicating nothing of that type is selected
    #   showing    - a medium color indicating all things of that type are selected
    #   abstract   - the element represents an abstract superclass,
    #                presumably containing concrete node classes
    #
    #   hidden     - TBD: not sure when hidden is appropriate
    #   emphasized - TBD: mark the class of the focused_node
  make_verb_sets: ->
    @verb_sets = [ # mutually exclusive within each set
        choose: @huviz.human_term.choose
        unchoose: @huviz.human_term.unchoose
      ,
        select: @huviz.human_term.select
        unselect: @huviz.human_term.unselect
      ,
        label:  @huviz.human_term.label
        unlabel: @huviz.human_term.unlabel
      ,
        shelve: @huviz.human_term.shelve
        hide:   @huviz.human_term.hide
      ,
        discard: @huviz.human_term.discard
        undiscard: @huviz.human_term.undiscard
      ,
        pin: @huviz.human_term.pin
        unpin: @huviz.human_term.unpin
      ]
    #,
    #  print: 'print'
    #  redact: 'redact'
    #  peek: 'peek'
    #,  # FIXME the edge related commands must be reviewed
    #  show: 'reveal'
    #  suppress: 'suppress'
    #  specify: 'specify'
      #emphasize: 'emphasize'

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
    unpin: (node) ->
      if not node.fixed
        return 'pin'
    pin: (node) ->
      if node.fixed
        return 'unpin'
  should_be_immediate_mode: ->
    return not @is_verb_phrase_empty() and \
      @is_command_object_empty() and \
      not @liking_all_mode
  is_command_object_empty: ->
    return @huviz.selected_set.length is 0 and not @chosen_set?
  is_verb_phrase_empty: ->
    return @engaged_verbs.length is 0
  auto_change_verb_if_warranted: (node) ->
    if @huviz.edit_mode
      return
    if @immediate_execution_mode
      # If there is only one verb, then do auto_change
      if @engaged_verbs.length is 1
        verb = @engaged_verbs[0]
        test = @auto_change_verb_tests[verb]
        if test
          next_verb = test(node)
          if next_verb
            @engage_verb(next_verb, verb is @transient_verb_engaged)
      @huviz.set_cursor_for_verbs(@engaged_verbs)
    else # no verbs are engaged
      @huviz.set_cursor_for_verbs([])
  verbs_requiring_regarding:
    ['show','suppress','emphasize','deemphasize']
  verbs_override: # when overriding ones are selected, others are unselected
    choose: ['discard', 'unchoose', 'shelve', 'hide']
    shelve: ['unchoose', 'choose', 'hide', 'discard', 'retrieve']
    discard: ['choose', 'retrieve', 'hide', 'unchoose', 'unselect', 'select']
    hide: ['discard', 'undiscard', 'label', 'choose' ,'unchoose', 'select', 'unselect']
  verb_descriptions:
    choose: "Put nodes in the graph and pull other, connected nodes in too,
             so long as they haven't been discarded."
    shelve: "Remove nodes from the graph and put them on the shelf
             (the circle of nodes around the graph) from which they
             might return if called back into the graph by a neighbor
             being chosen."
    hide: "Remove nodes from the graph and don't display them anywhere,
           though they might be called back into the graph when some
           other node calls it back in to show an edge."
    label: "Show the node's labels."
    unlabel: "Stop showing the node's labels."
    discard: "Put nodes in the discard bin (the small red circle which appears
              when you start dragging a node) from which they do not get
              called back into the graph unless they are first retrieved."
    undiscard: "Retrieve nodes from the discard bin (the small red circle
                which appears when you start dragging a node))
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
    pin: "Make a node immobile"
    unpin: "Make a node mobile again"
  verb_cursors:
    choose: "←"
    unchoose: "⇠"
    shelve: "↺"
    label: "☭"
    unlabel: "☢"
    discard: "☣"
    undiscard: "☯"
    hide: "☠"
    select: "☘"
    unselect: "☺"
    pin: "p"
    unpin: "u"
  build_form: () ->
    @build_verb_form()
    @build_like()
    @nextcommand = @nextcommandbox.append('div').
        attr('class','nextcommand command')

    # Where the full command string to appear as plain text, eg:
    #    "____ every Thing."
    #    "shelve every Person."
    @nextcommandstr = @nextcommand.append('code')
    $(@nextcommandstr[0][0]).addClass('nextcommand_str')

    if @nextcommand_prompts_visible and @nextcommand_str_visible
      @nextcommand.append('hr')

    # Where the broken out versions of the command string, with prompts, goes.
    @nextcommand_prompts = @nextcommand.append('code')
    @nextcommand_prompts.attr('class', 'nextcommand_prompt')
    @nextcommand_verb_phrase = @nextcommand_prompts.append('span')
    @nextcommand_verb_phrase.attr('class','verb_phrase')
    @nextcommand_noun_phrase = @nextcommand_prompts.append('span')
    @nextcommand_noun_phrase.attr('class','noun_phrase')
    @nextcommand_suffix_phrase = @nextcommand_prompts.append('span')
    @nextcommand_suffix_phrase.attr('class','suffix_phrase')

    if @nextcommand_prompts_visible
      $(@nextcommand_prompts[0][0]).show()
    else
      $(@nextcommand_prompts[0][0]).hide()

    if @nextcommand_str_visible
      $(@nextcommandstr[0][0]).show()
    else
      $(@nextcommandstr[0][0]).hide()

    @nextcommand_working = @nextcommand.append('div').attr('class','cmd-spinner')
    @nextcommand_working.style('float:right; color:red; display:none;')
    @build_submit()

  working_timeout: 500 # msec
  start_working: ->
    if @already_working
      clearTimeout(@already_working)
      #console.log "already working", @already_working
    else
      #console.log "start_working()"
      @show_working_on()
    @already_working = setTimeout(@stop_working, @working_timeout)
  stop_working: =>
    @show_working_off()
    @already_working = undefined
  show_working_on: (cmd)->
    console.log "show_working_on()"
    if cmd?
      @push_command_onto_history(cmd)
    @nextcommand_working.attr('class','fa fa-spinner fa-spin') # PREFERRED fa-2x
    @nextcommand.attr('class','nextcommand command cmd-working')
  show_working_off: ->
    console.log "show_working_off()"
    @nextcommand_working.attr('class','')
    @nextcommand.attr('class','nextcommand command')
    #@nextcommand.attr('style','background-color:yellow') # PREFERRED

  build_like: () ->
    @likediv.text('like:').classed("control_label", true)
    @likediv.style('display','inline-block')
    @likediv.style('white-space','nowrap')
    @like_input = @likediv.append('input')
    @like_input.attr('class', 'like_input')
    @like_input.attr('placeholder','node Name')
    @liking_all_mode = false # rename to @liking_mode
    @like_input.on 'input', @handle_like_input
    @clear_like_button = @likediv.append('button').text('⌫')
    @clear_like_button.attr('type','button').classed('clear_like', true)
    @clear_like_button.attr('disabled','disabled')
    @clear_like_button.attr('title','clear the "like" field')
    @clear_like_button.on 'click', @handle_clear_like

  handle_clear_like: (evt) =>
    @like_input.property('value','')
    @handle_like_input()

  handle_like_input: (evt) =>
    like_value = @get_like_string()
    like_has_a_value = not not like_value
    if like_has_a_value
      @clear_like_button.attr('disabled', null)
      if @liking_all_mode #
        TODO = "update the selection based on the like value"
        #@update_command(evt) # update the impact of the value in the like input
      else
        @liking_all_mode = true
        @chosen_set_before_liking_all = @chosen_set_id
        @set_immediate_execution_mode(@is_verb_phrase_empty())
        @huviz.click_set("all") # ie choose the 'All' set
    else # like does not have a value
      @clear_like_button.attr('disabled','disabled')
      if @liking_all_mode # but it DID
        TODO = "restore the state before liking_all_mode " + \
        "eg select a different set or disable all set selection"
        #alert(TODO+" was: #{@chosen_set_before_liking_all}")
        if @chosen_set_before_liking_all
          @huviz.click_set(@chosen_set_before_liking_all)
          @chosen_set_before_liking_all = undefined # forget all about it
        else
          @huviz.click_set('all') # this should toggle OFF the selection of 'All'
        @liking_all_mode = false
        @set_immediate_execution_mode(true)
        #@update_command(evt) # does this deal with that moment when it becomes blanked?
      else # nothing has happened, so
        TODO = "do nothing ????"
    @update_command(evt)

  build_submit: () ->
    @doit_butt = @nextcommand.append('span').append("input").
           attr("style","float:right;").
           attr("type","submit").
           attr('value','GO!').
           attr('id','doit_button')
    @doit_butt.on 'click', () =>
      if @update_command()
        @huviz.run_command(@command)
        #@huviz.update_all_counts()  # TODO Try to remove this, should be auto
    @set_immediate_execution_mode(true)
  enable_doit_button: ->
    @doit_butt.attr('disabled',null)
  disable_doit_button: ->
    @doit_butt.attr('disabled','disabled')
  hide_doit_button: ->
    $(@doit_butt[0][0]).hide()
  show_doit_button: ->
    $(@doit_butt[0][0]).show()
  set_immediate_execution_mode: (which) ->
    if which
      @hide_doit_button()
    else
      @show_doit_button()
    @immediate_execution_mode = which
  update_immediate_execution_mode_as_warranted: ->
    @set_immediate_execution_mode(@should_be_immediate_execution_mode())

  disengage_all_verbs: =>
    for vid in @engaged_verbs
      @disengage_verb(vid)
  unselect_all_node_classes: ->
    for nid in @taxons_chosen
      @unselect_node_class(nid)
      @taxon_picker.set_direct_state(nid, 'unshowing')
  clear_like: ->
    @huviz.like_string()
  get_like_string: ->
    @like_input[0][0].value
  old_commands: []
  push_command: (cmd) ->
    @push_command_onto_history(cmd)
  push_command_onto_history: (cmd) ->
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
    args =
      verbs: []
    args.object_phrase = @object_phrase
    if @engaged_verbs.length > 0
      for v in @engaged_verbs
        if v isnt @transient_verb_engaged
          args.verbs.push(v)
    if @proposed_verb
      args.verbs.push(@proposed_verb)
    if @chosen_set_id
      args.sets = [@chosen_set]
    else if @proposed_set
      args.sets = [@proposed_set]
    else
      if @taxons_chosen.length > 0
        args.classes = (class_name for class_name in @taxons_chosen)
      if @huviz.selected_set.length > 0
        args.subjects = (s for s in @huviz.selected_set)
    like_str = (@like_input[0][0].value or "").trim()
    if like_str
      args.like = like_str
    @command = new gcl.GraphCommand(@huviz, args)
  is_proposed: ->
    @proposed_verb or @proposed_set #or @proposed_taxon
  update_command: (because) =>
    console.log("update_command()")
    because = because or {}
    @huviz.show_state_msg("update_command")
    ready = @prepare_command(@build_command())
    if ready and @huviz.doit_asap and @immediate_execution_mode and not @is_proposed()
      @execute_command(because)
    @huviz.hide_state_msg()
  execute_command: (because) =>
    @show_working_on(@command)
    if @huviz.slow_it_down
      start = Date.now()
      while Date.now() < start + (@huviz.slow_it_down * 1000)
        console.log(Math.round((Date.now() - start) / 1000))
      alert "About to execute:\n  "+@command.str
    @command.execute()
    @huviz.update_all_counts()
    if because.cleanup
      because.cleanup()
      @update_command()
    @show_working_off()
  nextcommand_prompts_visible: true
  nextcommand_str_visible: false
  prepare_command: (cmd) ->
    @command = cmd
    if @nextcommand_prompts_visible or true # NEEDED BY huviz_test.js
      @nextcommand_verb_phrase.text(@command.verb_phrase)
      if @command.verb_phrase_ready
        $(@nextcommand_verb_phrase[0][0]).
          addClass('nextcommand_prompt_ready').
          removeClass('nextcommand_prompt_unready')
      else
        $(@nextcommand_verb_phrase[0][0]).
          removeClass('nextcommand_prompt_ready').
          addClass('nextcommand_prompt_unready')
      @nextcommand_noun_phrase.text(@command.noun_phrase)
      if @command.noun_phrase_ready
        $(@nextcommand_noun_phrase[0][0]).
          addClass('nextcommand_prompt_ready').
          removeClass('nextcommand_prompt_unready')
      else
        $(@nextcommand_noun_phrase[0][0]).
          removeClass('nextcommand_prompt_ready').
          addClass('nextcommand_prompt_unready')
      @nextcommand_suffix_phrase.text(@command.suffix_phrase)
    if @nextcommand_str_visible or true # NEEDED BY huviz_test.js
      @nextcommandstr.text(@command.str)

    if @command.ready
      @enable_doit_button()
    else
      @disable_doit_button()
    return @command.ready
  ready_to_perform: () ->
    permit_multi_select = true
    (@transient_verb_engaged is 'unselect') or
      (not @object_phrase and (@engaged_verbs.length > 0)) or
      (permit_multi_select and
       (@engaged_verbs.length is 1 and @engaged_verbs[0] is 'select'))
  build_verb_form: () ->
    @verb_pretty_name = {}
    for vset in @verb_sets
      alternatives = @verbdiv.append('div').attr('class','alternates')
      for id,label of vset
        @verb_pretty_name[id] = label
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

  ###
  The "Do it" button is not needed if the following hold...

  If there is an object_phrase then the instant a verb is picked the command
  should run.

  If there are verbs picked then the instant there is an object_phrase the
  command should run and the object_phrase cleared. (what about selected_set?)

  Note that this covers immediate execution of transient verbs select/unselect

  ###
  are_non_transient_verbs: ->
    # return whether there are any non-transient verbs engaged
    len_transient = @transient_verb_engaged? and 1 or 0
    return @engaged_verbs.length > len_transient

  engage_transient_verb_if_needed: (verb_id) ->
    if @engaged_verbs.length is 0 and not @are_non_transient_verbs()
      @engage_verb(verb_id, true)

  disengage_transient_verb_if_needed: ->
    if @transient_verb_engaged
      @disengage_verb(@transient_verb_engaged)
      @huviz.set_cursor_for_verbs(@engaged_verbs)
      @update_command()

  engage_verb: (verb_id, transient) ->
    if transient
      @transient_verb_engaged = verb_id
      @verb_control[verb_id].classed('transient', true)
    overrides = @get_verbs_overridden_by(verb_id)
    @verb_control[verb_id].classed('engaged',true)
    for vid in @engaged_verbs
      if vid in overrides
        @disengage_verb(vid)
    if not (verb_id in @engaged_verbs)
      @engaged_verbs.push(verb_id)
  disengage_verb: (verb_id, transient) ->
    @engaged_verbs = @engaged_verbs.filter((verb) -> verb isnt verb_id) # remove verb_id
    @verb_control[verb_id].classed('engaged',false)
    if verb_id is @transient_verb_engaged
      @transient_verb_engaged = false
      @verb_control[verb_id].classed('transient', false)
  verb_control: {}
  build_verb_picker: (id,label,alternatives) ->
    vbctl = alternatives.append('div').attr("class","verb")
    if @verb_descriptions[id]
      vbctl.attr("title", @verb_descriptions[id])
    vbctl.attr("id", "verb-"+id)
    @verb_control[id] = vbctl
    vbctl.text(label)
    that = @
    vbctl.on 'click', () ->
      elem = d3.select(this)
      newstate = not elem.classed('engaged')
      elem.classed('engaged',newstate)
      if newstate
        that.engage_verb(id)
        that.proposed_verb = null # there should be no proposed_verb if we are clicking engaging one
        because =
          verb_added: id
          cleanup: that.disengage_all_verbs
      else
        that.disengage_verb(id)
      if not that.engaged_verbs? or that.engaged_verbs.length is 0
        that.huviz.set_cursor_for_verbs([])
      that.update_command(because)
    vbctl.on 'mouseenter', () -> # tell user what will happen if this verb is clicked
      elem = d3.select(this)
      click_would_engage = not elem.classed('engaged')
      because = {}
      if click_would_engage
        that.proposed_verb = id # not proposed_verbs because there can be at most one
        because =
          proposed_verb: id
          #cleanup: that.disengage_all_verbs
      else # clicking would disengage the verb
        that.proposed_verb = null # TODO figure out whether and how to show user
      # After the click there will be engaged verbs if click_would_engage
      # or there are more than one engaged_verbs.
      #click_would_leave_a_verb_phrase = click_would_engage or that.engaged_verbs.length > 1
      that.update_command(because)
    vbctl.on 'mouseleave', () ->
      elem = d3.select(this)
      leaving_verb_id = elem.classed('engaged')
      because =
        verb_leaving: leaving_verb_id
      that.proposed_verb = null
      that.update_command(because)

  run_script: (script) ->
    # We recognize a couple of different visible "space-illustrating characters" as spaces.
    #   https://en.wikipedia.org/wiki/Whitespace_character
    #     U+237D  ⍽ SHOULDERED OPEN BOX
    #     U+2420  ␠  SYMBOL FOR SPACE
    # The purpose of recognizing these as spaces is to make the scripts using them
    # more readable in a URL, especially in a FormURLa.
    script = script.replace(/[\u237D\u2420]/g," ")
    @huviz.gclc.run(script)
    @huviz.update_all_counts()
  build_set_picker: (label, where) ->
    # FIXME populate @the_sets from @huviz.selectable_sets
    where = label? and @control_label(label, where) or @comdiv
    @the_sets = # TODO build this automatically from huviz.selectable_sets
      'all_set': [@huviz.all_set.label,
              selected_set: [@huviz.selected_set.label]
              chosen_set: [@huviz.chosen_set.label]
              graphed_set: [@huviz.graphed_set.label]
              shelved_set: [@huviz.shelved_set.label]
              hidden_set: [@huviz.hidden_set.label]
              discarded_set: [@huviz.discarded_set.label]
              labelled_set: [@huviz.labelled_set.label]
              pinned_set: [@huviz.pinned_set.label]
              ]
    @set_picker_box = where.append('div')
        .classed('container',true)
        .attr('id', 'sets')
    @set_picker = new TreePicker(@set_picker_box,'all',['treepicker-vertical'])
    @set_picker.click_listener = @on_set_picked
    @set_picker.show_tree(@the_sets, @set_picker_box)
    @populate_all_set_docs()
    @make_sets_proposable()
    where.classed("set_picker_box_parent",true)
    return where
  populate_all_set_docs: () ->
    for id, a_set of @huviz.selectable_sets
      if a_set.docs?
        @set_picker.set_title(id, a_set.docs)
  make_sets_proposable: () ->
    make_listeners = (id, a_set) => # fat arrow carries this to @
      set_ctl = @set_picker.id_to_elem[id]
      set_ctl.on 'mouseenter', () =>
        @proposed_set =  a_set
        @update_command()
      set_ctl.on 'mouseleave', () =>
        @proposed_set = null
        @update_command()
    for id, a_set of @huviz.selectable_sets
      make_listeners(id, a_set)
  on_set_picked: (set_id, new_state) =>
    @clear_set_picker() # TODO consider in relation to liking_all_mode
    @set_picker.set_direct_state(set_id, new_state)
    if new_state is 'showing'
      @taxon_picker.shield()
      @chosen_set = @huviz[set_id]
      @chosen_set_id = set_id
      because =
        set_added: set_id
        cleanup: @disengage_all_sets # the method to call to clear
    else
      @taxon_picker.unshield()
      @disengage_all_sets()
    @update_command(because)
  disengage_all_sets: => # TODO harmonize disengage_all_sets() and clear_all_sets() or document difference
    if @chosen_set_id
      @on_set_picked(@chosen_set_id, "unshowing")
    #@chosen_set_id = undefined
  clear_all_sets: =>
    skip_sets = ['shelved_set']
    for set_key, set_label of @the_sets.all_set[1]
      if set_key in skip_sets
        continue
      the_set = @huviz[set_key]
      cleanup_verb = the_set.cleanup_verb
      cmd = new gcl.GraphCommand @huviz,
        verbs: [cleanup_verb]
        sets: [the_set]
      @huviz.run_command(cmd)
    return
  on_set_count_update: (set_id, count) =>
    @set_picker.set_payload(set_id, count)
  on_taxon_count_update: (taxon_id, count) ->
    @taxon_picker.set_payload(taxon_id, count)
  on_predicate_count_update: (pred_lid, count) ->
    @predicate_picker.set_payload(pred_lid, count)
  clear_set_picker: () ->
    if @chosen_set_id?
      @set_picker.set_direct_state(@chosen_set_id, 'unshowing')
      delete @chosen_set_id

(exports ? this).CommandController = CommandController
