angliciser = require('angliciser').angliciser
class GCLTest
  constructor: (@runner, @spec) ->
    console.log "GCLTest",this

  perform: ->
    if @spec.script
      #console.log "==================",@spec.script
      @runner.gclc.run(@spec.script)
    # should the expections be checked in a callback?
    for exp in (@spec.expectations ? [] )
      console.log "exp",exp
      try
        got = eval(exp[0])
      catch e
        throw new Error "while eval('"+exp[0]+"') caught: "+e
      expected = exp[1]
      if @runner.verbose
        console.log "got="+got + " expected:"+expected
      if got != expected
        msg = msg ? "'"+@spec.desc+"' "+exp[0]+" = "+got+" not "+expected
        return msg

class GCLTestSuite
  ###
  # callback = function(){
  #    this.expect(this.graph_ctrl.nodes.length,7);
  #    this.expect(this.graph_ctrl.shelved_set.length,0);
  # }
  # ts = new GCLTestSuite(gclc, [
  #      {script:"choose 'abdyma'",
  #       expectations: [
  #           ["this.graph_ctrl.nodes.length",7],
  #           ["this.graph_ctrl.shelved_set.length",0],
  #       ]
  #      }
  #     ])
  ###
  constructor: (@graph_ctrl, @suite) ->
    console.log "GCLTestSuite() arguments",arguments
    @break_quickly = true
  emit: (txt,id) ->
    $("#testsuite-results").append("div").attr("id",id).text(txt)
  run: ->
    pass_count = 0
    errors = []
    fails = []
    num = 0
    @emit("RUNNING","running")
    for spec in @suite
      num++
      passed = false
      console.log "spec:",spec
      test = new GCLTest(this,spec)
      try
        retval = test.perform()
        if @verbose
          console.log retval
        if retval?
          fails.push([num,retval])
        else
          passed = true
          pass_count++
      catch e
        errors.push([num,e])
        #throw e
      if not passed and @break_quickly
        break
    console.log("passed:"+pass_count+
                " failed:"+fails.length
                " errors:"+errors.length)
    for fail in fails
      console.log "test#"+fail[0],fail[1]
    for err in errors
      console.log "err#"+err[0],err[1]

class GraphCommand
    # "choose,label 'abdyma'"
    # "label Thing"
    # "choose matching 'Maria'"
    # "choose organizations matching 'church'"
    # "choose Thing matching 'mary'"
    # "discard organizations matching 'mary'"
    # "choose writers matching 'Margaret' regarding family"
    #    /(\w+)(,\s*\w+) '(\w+)'/

  # Expect args: verbs, subjects, classes, constraints, regarding
  #   verbs: a list of verb names eg: ['choose','label'] REQUIRED
  #   subjects: a list of subj_ids eg: ['_:AE','http://a.com/abdyma']
  #   classes: a list of classes: ['writers','orgs']
  #   sets: a list of the huviz sets to act on eg: [@huviz.graphed_set]
  #   constraints: matching TODO(smurp) document GraphCommand constraints
  #   regarding: a list of pred_ids eg: ['orl:child','orl:denom']
  #       really [ orl:connectionToOrganization,
  #                http://vocab.sindice.com/xfn#child ]
  # Every command must have at least one verb and any kind of subject, so
  #   at least one of: subjects, classes or sets
  # Optional parameters are:
  #   constraints and regarding
  constructor: (@graph_ctrl, args_or_str) ->
    @prefixes = {}
    if typeof args_or_str == 'string'
      args = @parse(args_or_str)
    else
      args = args_or_str
    args.skip_history ?= false
    args.every_class ?= false
    for argn,argv of args
      @[argn] = argv
    if not @str?
      @update_str()
  get_node: (node_spec) ->
    id = node_spec.id
    term = id
    tried = []
    node = @graph_ctrl.nodes.get({'id':term})
    tried.push(term)
    id_parts = id.split(':')
    if id_parts.length > 1
      abbr = id_parts[0]
      id = id_parts[1]
      prefix = @prefixes[abbr]
      if prefix
        term = prefix+id
        node = @graph_ctrl.nodes.get({'id':term})
        tried.push(term)
    unless node
      for abbr,prefix of @prefixes
        if not node
          term = prefix+id
          tried.push(term)
          node = @graph_ctrl.nodes.get({'id':term})
    if not node
      msg = "node with id = #{term} not found among #{@graph_ctrl.nodes.length} nodes: #{tried}"
      #console.warn msg
    return node
  get_nodes: () ->
    result_set = SortedSet().sort_on("id")
    like_regex = null
    if @like
      like_regex = new RegExp(@like,"ig") # ignore, greedy
    if @subjects
      for node_spec in @subjects
        node = @get_node(node_spec)
        if node
          if not like_regex? or node.name.match(like_regex)
            result_set.add(node)
        else
          if not @classes?
            @classes = []
          @classes.push(node_spec.id) # very hacky
        #nodes.push(node)
    if @classes
      for class_name in @classes
        the_set = @graph_ctrl.taxonomy[class_name]?.get_instances()
        if the_set?
          if like_regex
            for n in the_set
              if n.name.match(like_regex)
                result_set.add(n)
          else # a redundant loop, kept shallow for speed when no like
            for n in the_set
              result_set.add(n)
    if @sets
      for a_set in @sets
        for node in a_set
          if not like_regex? or node.name.match(like_regex)
            result_set.add(node)
    return result_set
  get_methods: () ->
    methods = []
    for verb in @verbs
      method = @graph_ctrl[verb]
      if method
        method.build_callback = @graph_ctrl["#{verb}__build_callback"]
        method.callback = @graph_ctrl["#{verb}__atLast"]
        method.atFirst = @graph_ctrl["#{verb}__atFirst"]
        methods.push(method)
      else
        msg = "method '"+verb+"' not found"
        console.error(msg)
    return methods
  get_predicate_methods: () ->
    methods = []
    for verb in @verbs
      method = @graph_ctrl[verb + "_edge_regarding"]
      if method
        methods.push(method)
      else
        msg = "method '"+verb+"' not found"
        console.error(msg)
    return methods
  regarding_required: () ->
    return @regarding? and @regarding.length > 0
  execute: ->
    @graph_ctrl.show_state_msg(@as_msg())
    @graph_ctrl.force.stop()
    reg_req = @regarding_required()
    nodes = @get_nodes()
    console.log("%c#{@str}", "color:blue;font-size:1.5em;", "on #{nodes.length} nodes")
    errorHandler = (err_arg) ->
      #alert("WOOT! command has executed")
      if err_arg?
        console.error("err =", err_arg)
        if not err_arg?
          throw "err_arg is null"
        throw err_arg
      #else
      #  console.log("DONE .execute()")
    if reg_req
      for meth in @get_predicate_methods()
        iter = (node) =>
          for pred in @regarding
            retval = meth.call(@graph_ctrl, node, pred)
          @graph_ctrl.tick()
        if nodes?
          async.each(nodes, iter, errorHandler)
    else if @verbs[0] is 'load' # FIXME not very general, but it appears to be the sole exception
      @graph_ctrl.load_with(@data_uri, @with_ontologies)
      console.log("load data_uri has returned")
    else
      for meth in @get_methods()
        if meth.callback
          callback = meth.callback
        else if meth.build_callback
          callback = meth.build_callback(this, nodes)
        else
          callback = errorHandler
        atFirst = meth.atFirst
        if atFirst?
          atFirst()
        iter = (node) =>
          retval = meth.call(@graph_ctrl, node)
          @graph_ctrl.tick() # TODO(smurp) move this out, or call every Nth node
        # REVIEW Must we check for nodes? Perhaps atLast dominates.
        if nodes?
          if USE_ASYNC = false
            async.each(nodes, iter, callback)
          else
            for node in nodes
              iter(node)
            #if callback isnt errorHandler
            #  debugger
            @graph_ctrl.gclui.set
            callback()
    @graph_ctrl.clean_up_all_dirt_once()
    @graph_ctrl.hide_state_msg()
    @graph_ctrl.force.start()
    return
  get_pretty_verbs: ->
    l = []
    for verb_id in @verbs
      l.push(@graph_ctrl.gclui.verb_pretty_name[verb_id])
    return l
  missing: '____'
  update_str: ->
    missing = @missing
    cmd_str = ""
    ready = true
    regarding_required = false
    @verb_phrase = ''
    @noun_phrase = ''
    @noun_phrase_ready = false
    if @verbs and @verbs.length
      cmd_str = angliciser(@get_pretty_verbs())
      @verb_phrase_ready = true
      @verb_phrase = cmd_str
    else
      ready = false
      cmd_str = missing
      @verb_phrase_ready = false
      @verb_phrase = @graph_ctrl.human_term.blank_verb
    @verb_phrase += ' '
    cmd_str += " "
    obj_phrase = ""
    if cmd_str is 'load '
      @str += @data_uri + " ."
      return
    @object_phrase = null
    if @sets?
      more = angliciser((s.get_label() for s in @sets))
      @object_phrase = more
      #if @object_phrase?
      @noun_phrase_ready = true
      obj_phrase = @object_phrase
      @noun_phrase = obj_phrase
    else
      if @classes
        maybe_every = @every_class and "every " or ""
        obj_phrase += maybe_every + angliciser(@classes)
        if @except_subjects
          obj_phrase += ' except ' + angliciser((subj.lid for subj in @subjects))
      else if @subjects
        obj_phrase = angliciser((subj.lid for subj in @subjects))
        #@noun_phrase = obj_phrase
    if obj_phrase is ""
      obj_phrase = missing
      ready = false
      @noun_phrase_ready = false
      @noun_phrase = @graph_ctrl.human_term.blank_noun
    else if obj_phrase.length > 0
      @noun_phrase_ready = true
      @noun_phrase = obj_phrase
    cmd_str += obj_phrase
    like_str = (@like or "").trim()
    if @verbs
      for verb in @verbs
        if ['draw', 'undraw'].indexOf(verb) > -1
          regarding_required = true
    if regarding_required
      regarding_phrase = missing
      if @regarding_required() #? and @regarding.length > 0
        regarding_phrase = angliciser(@regarding)
      else
        ready = false
    @suffix_phrase = ''
    if like_str
      @suffix_phrase += " matching '"+like_str+"'"
    if regarding_phrase
      @suffix_phrase += " regarding " + regarding_phrase +  ' .'
    else
      @suffix_phrase += ' .'
    cmd_str += @suffix_phrase
    #cmd_str += " ."
    @ready = ready
    @str = cmd_str
  toString: ->
    @str
  parse: (cmd_str) ->
    parts = cmd_str.split(" ")
    verb = parts[0]
    cmd = {}
    cmd.verbs = [verb]
    if verb is 'load'
      cmd.data_uri = parts[1]
      if parts.length > 3
        # "load /data/bob.ttl with onto1.ttl onto2.ttl"
        cmd.with_ontologies = parts.slice(3,) # cdr
    else
      subj = parts[1].replace(/\'/g,"")
      cmd.subjects = [{'id': subj}]
    return cmd
  toString: () ->
    return @str
  as_msg: () ->
    return @str

class GraphCommandLanguageCtrl
  constructor: (@graph_ctrl) ->
    @prefixes = {}
  run: (script, callback) ->
    @graph_ctrl.before_running_command(this)
    #console.debug("script: ",script)
    if not script?
      console.error "script must be defined"
      return
    if script instanceof GraphCommand
      @commands = [script]
    else if typeof script is 'string'
      @commands = script.split(';')
    else if script.constructor is [].constructor
      @commands = script
    else # an object we presume
      @commands = [script]
    retval = @execute(callback)
    #console.log "commands:"
    #console.log @commands
    @graph_ctrl.after_running_command(this)
    return retval
  run_one: (cmd_spec) ->
    cmd = new GraphCommand(@graph_ctrl, cmd_spec)
    cmd.prefixes = @prefixes
    cmd.execute()
  execute: (callback) =>
    if @commands.length > 0 and typeof @commands[0] is 'string' and @commands[0].match(/^load /)
      #console.log("initial execute", @commands)
      @run_one(@commands.shift())
      #setTimeout @execute, 2000
      run_once = () =>
        document.removeEventListener('dataset-loaded',run_once)
        @execute()
      document.addEventListener('dataset-loaded',run_once)
      return
    for cmd_spec in @commands
      if cmd_spec # ie not blank
        @run_one(cmd_spec)
    if callback?
      callback()
    return

(exports ? this).GraphCommandLanguageCtrl = GraphCommandLanguageCtrl
(exports ? this).GraphCommand = GraphCommand
(exports ? this).GCLTest = GCLTest
(exports ? this).GCLTestSuite = GCLTestSuite
