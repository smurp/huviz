angliciser = require('angliciser').angliciser
#gvcl = require('gvcl') #.GVCL
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
  constructor: (@huviz, @suite) ->
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
  constructor: (@huviz, args_or_str) ->
    if args_or_str instanceof GraphCommand
      throw new Error("nested GraphCommand no longer permitted")
    @prefixes = {}
    @args_or_str = args_or_str
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
    # REVIEW this method needs attention
    if node_spec.id
      node = @huviz.nodes.get({'id':node_spec.id})
    if node
      return node

    tried = [node_spec]
    id_parts = node_spec.split(':') # REVIEW curie? uri?
    if id_parts.length > 1
      abbr = id_parts[0]
      id = id_parts[1]
      prefix = @prefixes[abbr]
      if prefix
        term = prefix+id
        node = @huviz.nodes.get({'id':term})
        tried.push(term)
    unless node
      for abbr,prefix of @prefixes
        if not node
          term = prefix+id
          tried.push(term)
          node = @huviz.nodes.get({'id':term})
    if not node
      msg = "node with id = #{term} not found among #{@huviz.nodes.length} nodes: #{tried}"
      console.warn(msg)
      throw new Error(msg)
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
        the_set = @huviz.taxonomy[class_name]?.get_instances()
        if the_set?
          if like_regex
            for n in the_set
              if n.name.match(like_regex)
                result_set.add(n)
          else # a redundant loop, kept shallow for speed when no like
            for n in the_set
              result_set.add(n)
    if @sets
      for set in @sets # set might be a SortedSet instance or a_set_id string
        if typeof set is 'string'
          a_set_id = set
          a_set = @huviz.get_set_by_id(a_set_id)
        else
          a_set = set
        for node in a_set
          if not like_regex? or node.name.match(like_regex)
            result_set.add(node)
    return result_set
  get_methods: () ->
    methods = []
    for verb in @verbs
      method = @huviz[verb]
      if method
        method.build_callback = @huviz["#{verb}__build_callback"]
        method.callback = @huviz["#{verb}__atLast"]
        method.atFirst = @huviz["#{verb}__atFirst"]
        methods.push(method)
      else
        msg = "method '"+verb+"' not found"
        console.error(msg)
    return methods
  get_predicate_methods: () ->
    methods = []
    for verb in @verbs
      method = @huviz[verb + "_edge_regarding"]
      if method
        methods.push(method)
      else
        msg = "method '"+verb+"' not found"
        console.error(msg)
    return methods
  regarding_required: () ->
    return @regarding? and @regarding.length > 0
  execute: ->
    @huviz.show_state_msg(@as_msg())
    @huviz.d3simulation.stop()
    regarding_required = @regarding_required()
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
    if regarding_required
      for meth in @get_predicate_methods()
        iter = (node) =>
          for pred in @regarding
            retval = meth.call(@huviz, node, pred)
          @huviz.tick()
        if nodes?
          async.each(nodes, iter, errorHandler)
    else if @verbs[0] is 'load'
      @huviz.load_with(@data_uri, @with_ontologies)
    else if @verbs[0] is 'query'
      @huviz.query_from_seeking_limit(@sparqlQuery)
    else
      for meth in @get_methods() # find the methods on huviz which implement each verb
        if meth.callback
          callback = meth.callback
        else if meth.build_callback
          callback = meth.build_callback(this, nodes)
        else
          callback = errorHandler
        atFirst = meth.atFirst
        if atFirst?
          atFirst() # is called once before iterating through the nodes
        iter = (node) =>
          retval = meth.call(@huviz, node) # call the verb
          #@huviz.tick() # TODO(smurp) move this out, or call every Nth node
        # REVIEW Must we check for nodes? Perhaps atLast dominates.
        if nodes?
          if USE_ASYNC = false
            async.each(nodes, iter, callback)
          else
            for node in nodes
              iter(node)
            @huviz.gclui.set
            callback() # atLast is called once, after the verb has been called on each node
    @huviz.clean_up_all_dirt_once()
    @huviz.hide_state_msg()
    @huviz.d3simulation.restart()
    @huviz.tick("Tick in graphcommandlanguage")
    return
  get_pretty_verbs: ->
    l = []
    for verb_id in @verbs
      l.push(@huviz.gclui.verb_pretty_name[verb_id])
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
    #@object_phrase = null
    if @verbs and @verbs.length
      cmd_str = angliciser(@get_pretty_verbs())
      @verb_phrase_ready = true
      @verb_phrase = cmd_str
    else
      ready = false
      cmd_str = missing
      @verb_phrase_ready = false
      @verb_phrase = @huviz.human_term.blank_verb
    @verb_phrase += ' '
    cmd_str += " "
    obj_phrase = ""
    if cmd_str is 'load '
      @str += @data_uri + " ."
      return
    #debugger if not @object_phrase?
    @object_phrase ?= null  # this gives @object_phrase a value even if it is null
    if @sets?
      setLabels = []
      for set in @sets  # either a list of SortedSets or their ids
        if typeof set is 'string'
          aSet = @huviz.get_set_by_id(set)
        else
          aSet = set
        setLabel = aSet.get_label()
        setLabels.push(setLabel)
      more = angliciser(setLabels)
      more = "the #{more} set" +  ((@sets.length > 1) and 's' or '')
      @object_phrase = more
      #if @object_phrase?
      @noun_phrase_ready = true
      obj_phrase = @object_phrase
      @noun_phrase = obj_phrase
    else
      if @object_phrase
        console.log("update_str() object_phrase: ", @object_phrase)
        obj_phrase = @object_phrase
      else if @classes
        maybe_every = @every_class and "every " or ""
        obj_phrase += maybe_every + angliciser(@classes)
        if @except_subjects
          obj_phrase += ' except ' + angliciser((subj.lid for subj in @subjects))
      else if @subjects
        obj_phrase = angliciser((subj.lid or subj for subj in @subjects))
        #@noun_phrase = obj_phrase
    if obj_phrase is ""
      obj_phrase = missing
      ready = false
      @noun_phrase_ready = false
      @noun_phrase = @huviz.human_term.blank_noun
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
        if @regarding_every
          regarding_phrase = "every " + regarding_phrase
      else
        ready = false
    @suffix_phrase = ''
    if like_str
      @suffix_phrase += " matching '"+like_str+"'"
    if regarding_phrase
      @suffix_phrase += " regarding " + regarding_phrase +  ' .'
    else if @polar_coords
      @suffix_phrase +=  " at #{@polar_coords.degrees.toFixed(0)} degrees"
      @suffix_phrase +=  " and range #{@polar_coords.range.toFixed(2)} ."
    else
      @suffix_phrase += ' .'
    cmd_str += @suffix_phrase
    #cmd_str += " ."
    @ready = ready
    @str = cmd_str
  toString: ->
    @str
  parse_query_command: (parts) ->
    keymap = { # from key in command url to key on querySpec passed to HuViz
      query: 'serverUrl'
      from: 'graphUrl'
      limit: 'limit'
      seeking: 'subjectUrl'
      }
    spec = {}
    while parts.length
      # find argName/argVal pairs
      argName = keymap[parts.shift()]
      argVal = unescape(parts.shift())
      if argName?
        spec[argName] = argVal
      else
        throw new Error("parse_query_command() failed at",parts.join(' '))
    return spec
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
    else if verb is 'query'
      @sparqlQuery = @parse_query_command(parts)
    else
      subj = parts[1].replace(/\'/g,"")
      cmd.subjects = [{'id': subj}]
    return cmd
  toString: () ->
    return @str
  as_msg: () ->
    return @str

class GraphCommandLanguageCtrl
  constructor: (@huviz) ->
    @prefixes = {}
  run: (script, callback) ->
    @huviz.before_running_command(this)
    #console.debug("script: ",script)
    if not script?
      console.error "script must be defined"
      return
    if script instanceof GraphCommand
      @commands = [script]
    else if typeof script is 'string'
      @commands = script.split(';')
      #@gvcl_script = new GVCL(script)
    else if script.constructor is [].constructor
      @commands = script
    else # an object we presume
      @commands = [script]
    retval = @execute(callback)
    #console.log "commands:"
    #console.log @commands
    @huviz.after_running_command(this)
    return retval
  run_one: (cmd_spec) ->
    if cmd_spec instanceof GraphCommand
      cmd = cmd_spec
    else
      cmd = new GraphCommand(@huviz, cmd_spec)
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
