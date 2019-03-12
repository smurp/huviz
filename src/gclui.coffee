
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
getRandomId = (prefix) ->
  max = 10000000000;
  prefix = prefix || 'id';
  return prefix + Math.floor(Math.random() * Math.floor(max))
gcl = require('graphcommandlanguage')
ColoredTreePicker = require('coloredtreepicker').ColoredTreePicker
TreePicker = require('treepicker').TreePicker
class CommandController
  constructor: (@huviz, @container, @hierarchy) ->
    document.addEventListener 'dataset-loaded', @on_dataset_loaded
    $("#tabs").resizable({handles: {'w':'#ctrl-handle'},minWidth: 300})
    #$("#collapse_cntrl").click(@minimize_gclui)
    #$("#expand_cntrl").click(@maximize_gclui)
    if not @huviz.all_set.length
      $(@container).hide()
    d3.select(@container).html("")
    if @huviz.args.display_hints
      @hints = d3.select(@container).append("div").attr("class","hints")
      $(".hints").append($(".hint_set").contents())
    @make_command_history()
    @control_label("Current Command")
    @nextcommandbox = @comdiv.append('div')
    @make_verb_sets()
    @control_label("Verbs")
    @verbdiv = @comdiv.append('div').attr('class','verbs')
    @depthdiv = @comdiv.append('div')
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
  new_GraphCommand: (args) ->
    return new gcl.GraphCommand(@huviz, args)
  reset_graph: ->
    ###
    * unhide all
    * retrieve all
    * shelve all
    * sanity check set counts
    ###
    #@huviz.run_command(@new_GraphCommand(
    #  verbs: ['unhide']
    #  sets: [@huviz.all_set]
    #  skip_history: true))
    @huviz.walkBackAll()
    @huviz.walk_path_set = []
    @huviz.run_command(@new_GraphCommand(
      verbs: ['undiscard','unchoose','unselect', 'unpin', 'shelve','unlabel']
      sets: [@huviz.all_set.id]
      skip_history: true))
    @disengage_all_verbs()
    @reset_command_history()
    @engaged_taxons = []
  make_command_history: ->
    @comdiv = d3.select(@container).append("div") # --- Add a container
    history = d3.select("#tabs-history")
    @cmdtitle = history.
      append('div').
      attr('class','control_label').
      html('Command History').
      attr('style', 'display:inline')
    @scriptPlayerControls = history.append('div').attr('class','scriptPlayerControls')
    #  attr('style','position: relative;  float:right')

    @scriptRewindButton = @scriptPlayerControls.append('button').
      attr('title','rewind to start').
      on('click', @on_rewind_click)
    @scriptRewindButton.
      append('i').attr("class", "fa fa-fast-backward")

    @scriptBackButton = @scriptPlayerControls.append('button').
      attr('title','go back one step').
      #attr('disabled', 'disabled').
      on('click', @on_backward_click)
    @scriptBackButton.append('i').attr("class", "fa fa-play fa-flip-horizontal")

    @scriptPlayButton = @scriptPlayerControls.append('button').
      attr('title','play script step by step').
      attr('disabled', 'disabled').
      on('click', @on_forward_click)
    @scriptPlayButton.append('i').attr("class", "fa fa-play")

    @scriptForwardButton = @scriptPlayerControls.append('button').
      attr('title','play script continuously').
      attr('disabled', 'disabled').
      #attr('style', 'display:none').
      on('click', @on_fastforward_click)
    @scriptForwardButton.append('i').attr("class", "fa fa-fast-forward")

    @scriptDownloadButton = @scriptPlayerControls.append('button').
      attr('title','save script to file').
      attr('style', 'margin-left:1em').  # ;display:none
      on('click', @on_downloadscript_hybrid_clicked)
    @scriptDownloadButton.append('i').attr("class", "fa fa-download")
      #.append('span').text('.txt')

    @scriptDownloadJsonButton = @scriptPlayerControls.append('button').
      attr('title','save script as .json').
      attr('style', 'display:none').  # ;display:none
      on('click', @on_downloadscript_json_clicked)
    @scriptDownloadJsonButton.append('i').attr("class", "fa fa-download").
      append('span').text('.json')

    @scriptStashButton = @scriptPlayerControls.append('button').
      attr('title','save script to menu').
      attr('style', 'margin-left:.1em').
      on('click', @on_stashscript_clicked)
    @scriptStashButton.append('i').attr("class", "fa fa-bars")
      #.append('span').text('save to menu')

    #history.append('div')
    @cmdlist = history.
      append('div').
      attr('class','commandlist')
    @oldcommands = @cmdlist.
      append('div').
      attr('id','commandhistory').
      style('max-height',"#{@huviz.height-80}px")
    @future_cmdArgs = []
    @command_list = []
    @command_idx0 = 0
  reset_command_history: ->
    for record in @command_list
      record.elem.attr('class','command')
  get_downloadscript_name: (ext) ->
    return @lastScriptName or ('HuVizScript.' + ext)
  get_script_prefix: ->
    return [
      "#!/bin/env huviz",
      "# This HuVis script file was generated by the page:",
      "#   " + @huviz.get_reload_uri(),
      "# Generated at " + (new Date()).toISOString(),
      "",
      ""
      ].join("\n")
  get_script_body: ->
    return @get_script_prefix() + @oldcommands.text()
  get_script_body_as_json: ->
    cmdList = []
    if @huviz.dataset_loader.value
      cmdList.push
        verbs: ['load']
        data_uri: @huviz.dataset_loader.value
        ontologies: [@huviz.ontology_loader.value]
        skip_history: true
    for elem_and_cmd in @command_list
      cmd = elem_and_cmd.cmd
      cmdList.push(cmd.args_or_str)
    replacer = (key, value) ->
      # replacer() removes non-literals from GraphCommand.args_or_script for serialization
      retlist = []
      if key is 'subjects'
        for node_or_id in value
          if not node_or_id.id
            console.debug("expecting node_or_id to have attribute .id", node_or_id)
          if node_or_id.id and node_or_id.lid
            # ideally send both the id (ie url) and the lid which is the pretty id
            obj =
              id: node_or_id.id
              lid: node_or_id.lid
          retlist.push(obj or node_or_id)
        return retlist
      if key is 'sets'
        for set_or_id in value
          setId = set_or_id.id or set_or_id
          retlist.push(setId)
        return retlist
      return value
    return JSON.stringify(cmdList, replacer, 4)
  get_script_body_as_hybrid: ->
    # The "hybrid" script style consists of three parts
    #   1) the text version of the script
    #   2) the json_marker, a separator between the two parts
    #   3) the json version of the script
    return @get_script_body() +
      "\n\n" + @huviz.json_script_marker +
      "\n\n" + @get_script_body_as_json()
  make_txt_script_href: () ->
    theBod = encodeURIComponent(@get_script_body())
    theHref = "data:text/plain;charset=utf-8," + theBod
    return theHref
  make_json_script_href: ->
    theJSON = encodeURIComponent(@get_script_body_as_json())
    theHref = "data:text/json;charset=utf-8," + theJSON
    return theHref
  make_hybrid_script_href: () ->
    theBod = encodeURIComponent(@get_script_body_as_hybrid())
    theHref = "data:text/plain;charset=utf-8," + theBod
    return theHref
  on_downloadscript_json_clicked: =>
    @on_downloadscript_type('json')
    return
  on_downloadscript_txt_clicked: =>
    @on_downloadscript_type('txt')
    return
  on_downloadscript_hybrid_clicked: =>
    @on_downloadscript_type('hybrid', 'txt')
    return
  on_downloadscript_type: (scriptFileType, ext) =>
    transientLink = @scriptPlayerControls.append('a')
    transientLink.text('script')
    thisName = prompt("What would you like to call your saved script?",
      @get_downloadscript_name(ext or scriptFileType))
    if not thisName
      return
    @lastScriptName = thisName
    transientLink.attr('style','display:none')
    transientLink.attr('download', @lastScriptName)
    if scriptFileType is 'json'
      theHref = @make_json_script_href()
    else if scriptFileType is 'txt'
      theHref = @make_txt_script_href()
    else if scriptFileType is 'hybrid'
      theHref = @make_hybrid_script_href()
    transientLink.attr('href',theHref)
    transientLink.node().click()
    node = transientLink.node()
    node.parentNode.removeChild(node)
    return
  on_stashscript_clicked: () =>
    scriptFileType = 'hybrid'
    ext = 'txt'
    thisName = prompt("What would you like to call this script in your menu?",
      @get_downloadscript_name(ext or scriptFileType))
    if not thisName
      return
    @lastScriptName = thisName
    script_rec =
      uri: thisName
      opt_group: 'Your Own'
      data: @get_script_body_as_hybrid()
    @huviz.script_loader.add_local_file(script_rec)
    return
    
  on_rewind_click: () =>
    @reset_graph()
    @command_idx0 = 0
    @update_script_buttons()
  on_backward_click: () =>
    forward_to_idx = @command_idx0 - 1
    @on_rewind_click()
    @on_fastforward_click(forward_to_idx)
  on_forward_click: () =>
    @play_old_command_by_idx(@command_idx0)
    @command_idx0++
    @update_script_buttons()
  on_fastforward_click: (forward_to_idx) =>
    forward_to_idx ?= @command_list.length
    while @command_idx0 < forward_to_idx
      @on_forward_click()
  play_old_command_by_idx: (idx) ->
    record = @command_list[idx]
    record.elem.attr('class', 'command played')
    @play_old_command(record.cmd)
  play_old_command: (cmd) ->
    cmd.skip_history = true
    cmd.skip_history_remove = true
    @huviz.run_command(cmd)
  install_listeners: () ->
    window.addEventListener 'changePredicate', @predicate_picker.onChangeState
    window.addEventListener 'changeTaxon', @taxon_picker.onChangeState
    window.addEventListener 'changeEnglish', @onChangeEnglish
  on_dataset_loaded: (evt) =>
    if not evt.done?
      $(@container).show()
      @show_succession_of_hints()
      @huviz.perform_tasks_after_dataset_loaded()
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
    @OLD_select_the_initial_set()
    return
  NEW_select_the_initial_set: =>
    # this does NOT function as a workaround for the problem like OLD_select_the_initial_set
    @huviz.run_command(@new_GraphCommand(
      verbs: ['select'],
      every_class: true,
      classes: ['Thing'],
      skip_history: true))
    @huviz.run_command(@new_GraphCommand(
      verbs: ['unselect'],
      every_class: true,
      classes: ['Thing'],
      skip_history: true))
    @huviz.shelved_set.resort() # TODO remove when https://github.com/cwrc/HuViz/issues/109
    return
  OLD_select_the_initial_set: =>
    # TODO initialize the taxon coloring without cycling all
    rm_cmd = () => # more hideous hackery: remove toggleTaxonThing from script
      @delete_script_command_by_idx(0)
    toggleEveryThing = () =>
      @huviz.toggle_taxon("Thing", false) #, () -> alert('called'))
      setTimeout(rm_cmd, 1000)
    toggleEveryThing.call()
    # everyThingIsSelected = () =>
    #  @huviz.nodes.length is @huviz.selected_set.length
    # @check_until_then(everyThingIsSelected, toggleEveryThing)
    setTimeout(toggleEveryThing, 1200)
    setTimeout(@push_future_onto_history, 1800)
    #@huviz.do({verbs: ['unselect'], sets: [], skip_history: true})
    @huviz.shelved_set.resort() # TODO remove when https://github.com/cwrc/HuViz/issues/109
    return
  check_until_then: (checkCallback, thenCallback) ->
    nag = () =>
      if checkCallback.call()
        clearInterval(intervalId)
        #alert('check_until_then() is done')
        thenCallback.call()
    intervalId = setInterval(nag, 30)
  init_editor_data: ->
    # operations common to the constructor and reset_editor
    @shown_edges_by_predicate = {}
    @unshown_edges_by_predicate = {}
    @engaged_taxons = [] # new SortedSet()
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
    pred_name = e.detail.pred_name
    unless pred_uri in @predicates_ignored # FIXME merge with predicates_to_ignore
      unless pred_lid in @predicates_ignored # FIXME merge with predicates_to_ignore
        pred_name ?= pred_lid.match(/([\w\d\_\-]+)$/g)[0]
        @add_predicate(pred_lid, parent_lid, pred_name)
        @recolor_edges_and_predicates_eventually(e)
  recolor_edges_and_predicates_eventually: ->
    if @recolor_edges_and_predicates_eventually_id?
      # console.log "defer edges_and_predicates",@recolor_edges_and_predicates_eventually_id
      clearTimeout(@recolor_edges_and_predicates_eventually_id)
    @recolor_edges_and_predicates_eventually_id = setTimeout(@recolor_edges_and_predicates, 300)
  recolor_edges_and_predicates: (evt) =>
    @predicate_picker.recolor_now()
    @recolor_edges() # FIXME should only run after the predicate set has settled for some time
  resort_pickers: ->
    if @taxon_picker?
      # propagate the labels according to the currently preferred language
      @taxon_picker.resort_recursively()
      @taxon_picker.recolor_now()
      @huviz.recolor_nodes()
    if @predicate_picker?
      console.log("resorting of predicate_picker on hold until it does not delete 'anything'")
      #@predicate_picker?.resort_recursively()
    #@set_picker?.resort_recursively()
    return
  build_predicate_picker: (label) ->
    id = 'predicates'
    title =
      "Medium color: all edges shown -- click to show none\n" +
      "Faint color: no edges are shown -- click to show all\n" +
      "Stripey color: some edges shown -- click to show all\n" +
      "Hidden: no edges among the selected nodes"
    where = label? and @control_label(label,@comdiv,title) or @comdiv
    @predicatebox = where.append('div')
        .classed('container', true)
        .attr('id', id)
    #@predicatebox.attr('class','scrolling')
    @predicates_ignored = []
    @predicate_picker = new ColoredTreePicker(
      @predicatebox, 'anything',
      (extra_classes=[]), (needs_expander=true), (use_name_as_label=true), (squash_case=true))
    @predicate_hierarchy = {'anything':['anything']}
    # FIXME Why is show_tree being called four times per node?
    @predicate_picker.click_listener = @handle_on_predicate_clicked
    @predicate_picker.show_tree(@predicate_hierarchy, @predicatebox)
    $("#predicates").addClass("ui-resizable").append("<br class='clear'>")
    $("#predicates").resizable(handles: 's')
  add_predicate: (pred_lid, parent_lid, pred_name) =>
    #if pred_lid in @predicates_to_ignore
    #  return
    @predicate_picker.add(pred_lid, parent_lid, pred_name, @handle_on_predicate_clicked)
    @make_predicate_proposable(pred_lid)
  make_predicate_proposable: (pred_lid) ->
    predicate_ctl = @predicate_picker.id_to_elem[pred_lid]
    predicate_ctl.on 'mouseenter', () =>
      every = not not @predicate_picker.id_is_collapsed[pred_lid]
      nextStateArgs = @predicate_picker.get_next_state_args(pred_lid)
      if nextStateArgs.new_state is 'showing'
        @proposed_verb = 'draw'
      else
        @proposed_verb = 'undraw'
      @regarding = [pred_lid]
      @regarding_every = not not @predicate_picker.id_is_collapsed[pred_lid]
      ready = @prepare_command(@build_command())
      return
    predicate_ctl.on 'mouseleave', () =>
      @proposed_verb = null
      @regarding = null
      @prepare_command(@build_command())
      #@prepare_command(@new_GraphCommand( {}))
      return
  handle_on_predicate_clicked: (pred_id, new_state, elem, args) =>
    @start_working()
    setTimeout () => # run asynchronously so @start_working() can get a head start
      @on_predicate_clicked(pred_id, new_state, elem, args)
  on_predicate_clicked: (pred_id, new_state, elem, args) =>
    skip_history = not args or not args.original_click
    if new_state is 'showing'
      verb = 'draw'
    else
      verb = 'undraw'
    cmd = @new_GraphCommand(
      verbs: [verb]
      regarding: [pred_id]
      regarding_every: not not @predicate_picker.id_is_collapsed[pred_id]
      sets: [@huviz.selected_set.id]
      skip_history: skip_history)
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
        .classed('container', true)
        .attr('id', id)
    @taxon_box.attr('style','vertical-align:top')
    # http://en.wikipedia.org/wiki/Taxon
    @taxon_picker = new ColoredTreePicker(
      @taxon_box, 'Thing',
      # documenting meaning of positional params with single use variables
      (extra_classes=[]),
      (needs_expander=true),
      (use_name_as_label=true),
      (squash_case=true))
    @taxon_picker.click_listener = @handle_on_taxon_clicked
    @taxon_picker.hover_listener = @on_taxon_hovered
    @taxon_picker.show_tree(@hierarchy, @taxon_box)
    where.classed("taxon_picker_box_parent", true)
    return where
  add_taxon: (taxon_id, parent_lid, class_name, taxon) =>
    @taxon_picker.add(taxon_id, parent_lid, class_name, @handle_on_taxon_clicked)
    @make_taxon_proposable(taxon_id)
    @taxon_picker.recolor_now()
    @huviz.recolor_nodes()
  make_taxon_proposable: (taxon_id) ->
    taxon_ctl = @taxon_picker.id_to_elem[taxon_id]
    taxon_ctl.on 'mouseenter', (evt) =>
      #evt.stopPropagation()
      # REVIEW consider @taxon_picker.get_next_state_args(taxon_id) like make_predicate_proposable()
      @proposed_taxon = taxon_id
      @proposed_every = not not @taxon_picker.id_is_collapsed[taxon_id]
      if not @engaged_verbs.length
        # only presume that select/unselect is what is happening when no other verbs are engaged
        if @engaged_taxons.includes(taxon_id)
          @proposed_verb = 'unselect'
        else
          @proposed_verb = 'select'
      #console.log(@proposed_verb, @proposed_taxon)
      ready = @prepare_command(@build_command())
      return
    taxon_ctl.on 'mouseleave', (evt) =>
      @proposed_taxon = null
      @proposed_verb = null
      ready = @prepare_command(@build_command())
      return
    return
  onChangeEnglish: (evt) =>
    @object_phrase = evt.detail.english
    #console.log("%c#{@object_phrase}",'color:orange;font-size:2em')
    @prepare_command(@build_command())
    @update_command()
  handle_on_taxon_clicked: (id, new_state, elem, args) =>
    @start_working()
    setTimeout () => # run asynchronously so @start_working() can get a head start
      @on_taxon_clicked(id, new_state, elem, args)
  set_taxa_click_storm_callback: (callback) ->
    if @taxa_click_storm_callback?
      throw new Error("taxa_click_storm_callback already defined")
    else
      @taxa_click_storm_callback = callback
  taxa_being_clicked_increment: ->
    if not @taxa_being_clicked?
      @taxa_being_clicked = 0
    @taxa_being_clicked++
    return
  taxa_being_clicked_decrement: ->
    if not @taxa_being_clicked?
      throw new Error("taxa_being_clicked_decrement() has apparently been called before taxa_being_clicked_increment()")
    #@taxa_being_clicked ?= 1
    #console.log("taxa_being_clicked_decrement() before:", @taxa_being_clicked)
    @taxa_being_clicked--
    #console.log("taxa_being_clicked_decrement() after:", @taxa_being_clicked)
    if @taxa_being_clicked is 0
      #console.log("taxa click storm complete after length #{@taxa_click_storm_length}")
      #debugger if @taxa_click_storm_callback?
      if @taxa_click_storm_callback?
        @taxa_click_storm_callback.call(document)
        @taxa_click_storm_callback = null
      #@taxa_click_storm_length = 0
    #else
    #  blurt(@taxa_being_clicked, null, true)
    #  @taxa_click_storm_length ?= 0
    #  @taxa_click_storm_length++
    #
  make_run_transient_and_cleanup_callback: (because) ->
    return (err) =>
      if err
        console.log(err)
        throw err
      @huviz.clean_up_all_dirt()
      @run_any_immediate_command({})
      @perform_any_cleanup(because)
      return
  on_taxon_clicked: (taxonId, new_state, elem, args) =>
    args ?= {}
    # This method is called in various contexts:
    # 1) aVerb ______ .      Engage a taxon, run command, disengage taxon
    # 2) _____ ______ .      Engage a taxon
    # 3) _____ aTaxon .      Disengage a taxon
    # 4) _____ a and b .     Engage or disenage a taxon

    # These variables are interesting regardless of which scenario holds
    taxon = @huviz.taxonomy[taxonId]
    hasVerbs = not not @engaged_verbs.length
    skip_history = not args.original_click
    every_class = not not args.collapsed # force boolean value and default false
    # If there is already a verb engaged then this click should be running
    #     EngagedVerb taxonWith_id .
    #   In particular, the point being made here is that it is just the
    #   taxon given by taxonId which will be involved, not the selected_set
    #   or any other nodes.
    #
    #   Let us have some examples as a sanity check:
    #     Select taxonId .    # cool
    #     Label  taxonId .    # no problemo
    #       *       *         # OK, OK looks straight forward
    if hasVerbs
      cmd = @new_GraphCommand(
        verbs: @engaged_verbs
        classes: [taxonId]
        every_class: every_class
        skip_history: skip_history)
      @huviz.run_command(cmd)
      return

    # If there is no verb engaged then this click should either engage or
    # disengage the taxon identified by id as dictated by new_state.
    #
    # The following implements the tristate behaviour:
    #   Mixed —> On
    #   On —> Off
    #   Off —> On
    if taxon?
      old_state = taxon.get_state()
    else
      throw "Uhh, there should be a root Taxon 'Thing' by this point: " + taxonId
    if new_state is 'showing'
      if old_state in ['mixed', 'unshowing', 'empty']
        if not (taxonId in @engaged_taxons)
          @engaged_taxons.push(taxonId)
        # SELECT all members of the currently chosen classes
        cmd = @new_GraphCommand(
          verbs: ['select']
          classes: [taxonId]
          every_class: every_class
          skip_history: skip_history)
          #classes: (class_name for class_name in @engaged_taxons)
      else
        console.error "no action needed because #{taxonId}.#{old_state} == #{new_state}"
    else if new_state is 'unshowing'
      @unselect_node_class(taxonId)
      cmd = @new_GraphCommand(
        verbs: ['unselect']
        classes: [taxonId]
        every_class: every_class
        skip_history: skip_history)
    else if old_state is "hidden"
      console.error "#{taxonId}.old_state should NOT equal 'hidden' here"
    @taxon_picker.style_with_kid_color_summary_if_needed(taxonId)
    if cmd?
      @huviz.run_command(cmd, @make_run_transient_and_cleanup_callback(because))
      because = {}  # clear the because
    @update_command()
    return
  unselect_node_class: (node_class) ->
    # removes node_class from @engaged_taxons
    @engaged_taxons = @engaged_taxons.filter (eye_dee) ->
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
        wander: @huviz.human_term.wander
        walk: @huviz.human_term.walk
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
    if @huviz.show_hunt_verb
      @verb_sets.push({hunt: @huviz.human_term.hunt})
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
    unchoose: (node, engagedVerb) ->
      if not node.chosen?
        return 'choose' or engagedVerb
    wander: (node) ->
      if node.chosen?
        return 'wander'
    walk: (node) ->
      if node.chosen?
        return 'walk'
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
          next_verb = test(node, @engaged_verbs[0])
          if next_verb
            @engage_verb(next_verb, verb is @transient_verb_engaged)
      @huviz.set_cursor_for_verbs(@engaged_verbs)
    else # no verbs are engaged
      @huviz.set_cursor_for_verbs([])
  verbs_requiring_regarding:
    ['show','suppress','emphasize','deemphasize']
  verbs_override: # when overriding ones are selected, others are unselected
    choose: ['discard', 'unchoose', 'shelve', 'hide', 'wander', 'walk']
    wander: ['choose', 'unchoose', 'discard', 'shelve', 'hide', 'walk']
    walk: ['choose', 'unchoose', 'discard', 'shelve', 'hide', 'wander']
    shelve: ['unchoose', 'choose', 'hide', 'discard', 'retrieve', 'wander', 'walk']
    discard: ['choose', 'retrieve', 'hide', 'unchoose', 'unselect', 'select', 'wander', 'walk']
    hide: ['discard', 'undiscard', 'label', 'choose' ,'unchoose', 'select', 'unselect', 'wander', 'walk']
    hunt: ['discard', 'undiscard', 'choose', 'unchoose', 'wander', 'walk', 'hide', 'unhide', 'shelve', 'pin', 'unpin']
  verb_descriptions:
    choose: "Put nodes in the graph and pull other, connected nodes in too,
             so long as they haven't been discarded."
    wander:    "Put nodes in the graph and pull connected nodes in followed by
              shelving of the nodes which had been pulled into the graph previously."
    walk: "Put nodes in the graph but keep the previous central nodes activated.
            Shelve previous sub-nodes."
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
    hunt: "Animate binary search for the node"
  verb_cursors:
    choose: "←"
    unchoose: "⇠"
    wander: "🚶"
    walk: "🚶"
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
    hunt: "X"
  build_form: () ->
    @build_verb_form()
    @build_depth()
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
    log_click()
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
    #console.log "show_working_on()"
    if cmd? and not cmd.skip_history
      @push_command_onto_history(cmd)
    @nextcommand_working.attr('class','fa fa-spinner fa-spin') # PREFERRED fa-2x
    @nextcommand.attr('class','nextcommand command cmd-working')
  show_working_off: ->
    #console.log "show_working_off()"
    @nextcommand_working.attr('class','')
    @nextcommand.attr('class','nextcommand command')
    #@nextcommand.attr('style','background-color:yellow') # PREFERRED

  build_depth: () ->
    @depthdiv.text('Activate/Wander Depth:').classed("control_label activate_depth", true)
    @depthdiv.style('display','none')#('display','inline-block')
    @depthdiv.style('white-space','nowrap')
    @depth_input = @depthdiv.append('input')
    @depth_input.attr('class', 'depth_input')
    @depth_input.attr('placeholder','1')
    @depth_input.attr('type','number')
    @depth_input.attr('min','1')
    @depth_input.attr('max','9')
    @depth_input.attr('value','1')

  build_like: () ->
    @likediv.text('matching:').classed("control_label", true)
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
    @clear_like_button.attr('title','clear the "matching" field')
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
    for nid in @engaged_taxons
      @unselect_node_class(nid)
      @taxon_picker.set_direct_state(nid, 'unshowing')
  clear_like: ->
    @huviz.like_string()
  get_like_string: ->
    @like_input[0][0].value
  push_command: (cmd) ->
    throw new Error('DEPRECATED')
    @push_command_onto_history(cmd)
  push_cmdArgs_onto_future: (cmdArgs) ->
    @future_cmdArgs.push(cmdArgs)
  push_future_onto_history: =>
    if @future_cmdArgs.length
      @huviz.goto_tab(3)
      for cmdArgs in @future_cmdArgs
        @push_command_onto_history(@new_GraphCommand(cmdArgs))
      @reset_command_history()
      @command_idx0 = 0
      @update_script_buttons()
  push_command_onto_history: (cmd) ->
    # Maybe the command_pointer is in the middle of the command_list and here
    # we are trying to run a new command -- so we need to dispose of the remaining
    # commands in the command_list because the user is choosing to take a new path.
    @clear_unreplayed_commands_if_needed()
    cmd.id = getRandomId('cmd')
    elem = @oldcommands.append('div').
      attr('class','played command').
      attr('id',cmd.id)
    $('#commandhistory').scrollTop($('#commandhistory').scrollHeight)
    elem_and_cmd =
      elem: elem
      cmd: cmd
    @command_list.push(elem_and_cmd)
    @command_idx0 = @command_list.length
    idx_of_this_command = @command_idx0
    # we are appending to the end of the script, playing is no longer valid, so...
    @disable_play_buttons()
    elem.text(cmd.str+"\n") # add CR for downloaded scripts
    delete_button = elem.append('a')
    delete_button.attr('class','delete-command')
    delete_button.on('click',() => @delete_script_command_by_id(cmd.id))
    @update_script_buttons()
  clear_unreplayed_commands_if_needed: ->
    while @command_idx0 < @command_list.length
      @delete_script_command_by_idx(@command_list.length - 1)
    return
  delete_script_command_by_id: (cmd_id) ->
    for elem_and_cmd,idx in @command_list
      if elem_and_cmd.cmd.id is cmd_id
        @delete_script_command_by_idx(idx)
        break
    return
  delete_script_command_by_idx: (idx) ->
    elem_and_cmd = @command_list.splice(idx, 1)[0]
    #alert("about to delete: " + elem_and_cmd.cmd.str)
    elem = elem_and_cmd.elem[0]
    if not elem or not elem[0]
      return
    orphan = elem[0]
    pops = orphan.parentNode
    pops.removeChild(orphan)
    if idx < @command_idx0
      @command_idx0--
    if @command_idx0 < 0
      @command_idx0 = 0
    @update_script_buttons()
  update_script_buttons: ->
    if @command_idx0 >= @command_list.length
      @disable_play_buttons()
    else
      @enable_play_buttons()
    if @command_idx0 > 0
      @enable_back_buttons()
    if @command_idx0 <= 0
      @disable_back_buttons()
  disable_play_buttons: ->
    @scriptPlayButton.attr('disabled', 'disabled')
    @scriptForwardButton.attr('disabled', 'disabled')
  enable_play_buttons: ->
    @scriptForwardButton.attr('disabled', null)
    @scriptPlayButton.attr('disabled', null)
  disable_back_buttons: ->
    @scriptBackButton.attr('disabled', 'disabled')
    @scriptRewindButton.attr('disabled', 'disabled')
  enable_back_buttons: ->
    @scriptBackButton.attr('disabled', null)
    @scriptRewindButton.attr('disabled', null)
  build_command: ->
    args =
      verbs: []
    args.object_phrase = @object_phrase
    if @engaged_verbs.length > 0
      for v in @engaged_verbs
        if v isnt @transient_verb_engaged
          args.verbs.push(v)
    if @regarding? and @regarding.length
      args.regarding = @regarding.slice() # ie copy
      args.regarding_every = @regarding_every
    if @proposed_verb
      args.verbs.push(@proposed_verb)
    if @chosen_set_id
      args.sets = [@chosen_set]
    else if @proposed_set
      args.sets = [@proposed_set]
    else
      if @proposed_taxon
        args.every_class = @proposed_every
        args.classes = [@proposed_taxon]
      else # proposed_taxon dominates engaged_taxons and the selected_set equally
        if @engaged_taxons.length > 0
          args.classes = (class_name for class_name in @engaged_taxons)
        if @huviz.selected_set.length > 0
          args.sets = ['selected']
    like_str = (@like_input[0][0].value or "").trim()
    if like_str
      args.like = like_str
    @command = @new_GraphCommand(args)
  is_proposed: ->
    @proposed_verb or @proposed_set or @proposed_taxon
  update_command: (because) =>
    #console.log("update_command()", because)
    because = because or {}
    @huviz.show_state_msg("update_command")
    @run_any_immediate_command(because)
    @huviz.hide_state_msg()
  run_any_immediate_command: (because) ->
    #console.log("run_any_immediate_command()", because)
    ready = @prepare_command(@build_command())
    if ready and @huviz.doit_asap and @immediate_execution_mode and not @is_proposed()
      @perform_current_command(because)
    return
  perform_current_command: (because) =>
    @show_working_on(@command)
    if @huviz.slow_it_down
      start = Date.now()
      while Date.now() < start + (@huviz.slow_it_down * 1000)
        console.log(Math.round((Date.now() - start) / 1000))
      #alert("About to execute:\n  "+@command.str)
    @command.execute()
    @huviz.update_all_counts()
    @perform_any_cleanup(because)
    @show_working_off()
  perform_any_cleanup: (because) ->
    #console.log("perform_any_cleanup()",because)
    if because? and because.cleanup
      because.cleanup()
      @update_command()
    return
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
      @add_verb_set(vset)
  add_verb_set: (vset) ->
    alternatives = @verbdiv.append('div').attr('class','alternates')
    for id,label of vset
      @verb_pretty_name[id] = label
      @build_verb_picker(id,label,alternatives)
    @verb_pretty_name['load'] = @huviz.human_term.load
    @verb_pretty_name['hunt'] = @huviz.human_term.hunt
    @verb_pretty_name['draw'] = @huviz.human_term.draw
    @verb_pretty_name['undraw'] = @huviz.human_term.undraw
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
    vbctl.on 'click', () =>
      @handle_on_verb_clicked(id, vbctl)
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

  handle_on_verb_clicked: (id, elem) =>
    @start_working()
    setTimeout () => # run asynchronously so @start_working() can get a head start
      @on_verb_clicked(id, elem)

  on_verb_clicked: (id, elem) ->
    newstate = not elem.classed('engaged')
    elem.classed('engaged',newstate)
    if newstate
      @engage_verb(id)
      if id is "walk"
         @taxon_picker.shield()
         @set_picker.shield()
      @proposed_verb = null # there should be no proposed_verb if we are clicking engaging one
      because =
        verb_added: id
        cleanup: @disengage_all_verbs
    else
      if id is "walk"
        @taxon_picker.unshield()
        @set_picker.unshield()
      @disengage_verb(id)
    if not @engaged_verbs? or @engaged_verbs.length is 0
      @huviz.set_cursor_for_verbs([])
    @update_command(because)

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
              nameless_set: [@huviz.nameless_set.label]
              walked_set: [@huviz.walked_set.label]
              ]
    @set_picker_box = where.append('div')
        .classed('container',true)
        .attr('id', 'sets')
    @set_picker = new TreePicker(@set_picker_box, 'all', ['treepicker-vertical'])
    @set_picker.click_listener = @handle_on_set_picked
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
        @proposed_set = a_set
        @update_command()
      set_ctl.on 'mouseleave', () =>
        @proposed_set = null
        @update_command()
    for id, a_set of @huviz.selectable_sets
      make_listeners(id, a_set)
  handle_on_set_picked: (set_id, new_state) =>
    @start_working()
    setTimeout () => # run asynchronously so @start_working() can get a head start
      @on_set_picked(set_id, new_state)
  on_set_picked: (set_id, new_state) ->
    @clear_set_picker() # TODO consider in relation to liking_all_mode
    @set_picker.set_direct_state(set_id, new_state)
    because = {}
    hasVerbs = not not @engaged_verbs.length
    if new_state is 'showing'
      @taxon_picker.shield()
      @chosen_set = @huviz[set_id]
      @chosen_set_id = set_id
      because =
        set_added: set_id
        cleanup: @disengage_all_sets # the method to call to clear
      if hasVerbs
        cmd = new gcl.GraphCommand @huviz,
            verbs: @engaged_verbs # ['select']
            sets: [@chosen_set.id]
    else if new_state is 'unshowing'
      @taxon_picker.unshield()
      XXXcmd = new gcl.GraphCommand @huviz,
          verbs: ['unselect']
          sets: [@chosen_set.id]
      @disengage_all_sets()
    if cmd?
      @huviz.run_command(cmd, @make_run_transient_and_cleanup_callback(because))
      because = {}
    @update_command()

  disengage_all_sets: =>
    # TODO harmonize disengage_all_sets() and clear_all_sets() or document difference
    if @chosen_set_id
      @on_set_picked(@chosen_set_id, "unshowing")
      delete @chosen_set_id
      delete @chosen_set
  clear_all_sets: =>
    skip_sets = ['shelved_set']
    for set_key, set_label of @the_sets.all_set[1]
      if set_key in skip_sets
        continue
      the_set = @huviz[set_key]
      cleanup_verb = the_set.cleanup_verb
      cmd = new gcl.GraphCommand @huviz,
        verbs: [cleanup_verb]
        sets: [the_set.id]
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
