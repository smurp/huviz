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
    # "choose like 'Maria'"
    # "choose organizations like 'church'"
    # "choose Thing like 'mary'"
    # "discard organizations like 'mary'"
    # "choose writers like 'Margaret' regarding family"
    #    /(\w+)(,\s*\w+) '(\w+)'/

  # Expect args: verbs, subjects, classes, constraints, regarding
  #   verbs: a list of verb names eg: ['choose','label'] REQUIRED
  #   subjects: a list of subj_ids eg: ['_:AE','http://a.com/abdyma']
  #   classes: a list of classes: ['writers','orgs']
  #   sets: a list of the huviz sets to act on eg: [@huviz.graphed_set]
  #   constraints: like TODO(smurp) document GraphCommand constraints
  #   regarding: a list of pred_ids eg: ['orl:child','orl:denom']
  #       really [ orl:connectionToOrganization,
  #                http://vocab.sindice.com/xfn#child ]
  # Every command must have at least one verb and any kind of subject, so
  #   at least one of: subjects, classes or sets
  # Optional parameters are:
  #   constraints and regarding
  constructor: (args_or_str) ->
    @prefixes = {}
    if typeof args_or_str == 'string'
      args = @parse(args_or_str)
    else
      args = args_or_str
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
        if like_regex and the_set?
          for n in the_set
            if n.name.match(like_regex)
              result_set.add n
        else # a redundant loop, kept shallow for speed when no like
          for n in the_set
            result_set.add n
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
        methods.push(method)
      else
        msg = "method '"+verb+"' not found"
        console.log msg
        alert msg
        #throw new Error(msg)
    return methods
  get_predicate_methods: () ->
    methods = []
    for verb in @verbs
      method = @graph_ctrl[verb + "_edge_regarding"]
      if method
        methods.push(method)
      else
        msg = "method '"+verb+"' not found"
        console.log msg
    return methods
  regarding_required: () ->
    return @regarding? and @regarding.length > 0
  execute: (@graph_ctrl) ->
    @graph_ctrl.show_state_msg(@as_msg())
    @graph_ctrl.force.stop()
    reg_req = @regarding_required()
    nodes = @get_nodes()
    console.log @str,"on",nodes.length,"nodes"
    if reg_req
      for meth in @get_predicate_methods()
        err = (err_arg) ->
          if err_arg?
            console.error "err =",err_arg
            if not err_arg?
              throw "err_arg is null"
            throw err_arg
          else
            console.log "DONE .execute()"
        iter = (node) =>
          for pred in @regarding
            retval = meth.call(@graph_ctrl,node,pred)
          @graph_ctrl.tick()
        #async.eachSeries nodes,iter,err
        if nodes?
          async.each nodes,iter,err
        #@graph_ctrl.tick()
    else if @verbs[0] is 'load' # FIXME not very general, but it appears to be the sole exception
      @graph_ctrl.load(@data_uri)
      console.log("load data_uri has returned")
    else
      for meth in @get_methods()
        # console.log "meth",meth
        # for node in nodes
        #  retval = meth.call(@graph_ctrl,node)
        err = (err_arg) ->
          if err
            console.log "err =",err_arg
            #throw err_arg
          else
            console.log "DONE .execute()"
        iter = (node) =>
          retval = meth.call(@graph_ctrl,node)
          @graph_ctrl.tick() # TODO(smurp) move this out, or call every Nth node
        #async.eachSeries nodes,iter,err
        if nodes?
          async.each nodes,iter,err
        #@graph_ctrl.tick()
    @graph_ctrl.hide_state_msg()
    @graph_ctrl.force.start()
  missing: '____'
  update_str: ->
    missing = @missing
    cmd_str = ""
    ready = true
    regarding_required = false
    if @verbs
      cmd_str = angliciser(@verbs)
    else
      ready = false
      cmd_str = missing
    cmd_str += " "
    obj_phrase = ""
    if cmd_str is 'load '
      @str += @data_uri + " ."
      return
    if @sets?
      more = angliciser((s.id for s in @sets))
      @object_phrase = more
    if @object_phrase?
      obj_phrase = @object_phrase
    else
      if @classes
        obj_phrase += angliciser(@classes)
      if @subjects
        obj_phrase = angliciser((subj.lid for subj in @subjects))
    if obj_phrase is ""
      obj_phrase = missing
      ready = false
    cmd_str += obj_phrase
    like_str = (@like or "").trim()
    if @verbs
      for verb in @verbs
        if ['show','suppress'].indexOf(verb) > -1
          regarding_required = true
    if regarding_required
      regarding_phrase = missing
      if @regarding? and @regarding.length > 0
        regarding_phrase = angliciser(@regarding)
      else
        ready = false
    if like_str
      cmd_str += " like '"+like_str+"'"
    if regarding_phrase
      cmd_str += " regarding " + regarding_phrase
    cmd_str += " ."
    @ready = ready
    @str = cmd_str
  parse: (cmd_str) ->
    parts = cmd_str.split(" ")
    verb = parts[0]
    cmd = {}
    cmd.verbs = [verb]
    if verb is 'load'
      cmd.data_uri = parts[1]
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
  run: (script) ->
    @graph_ctrl.before_running_command(this)
    #console.debug("script: ",script)
    if not script?
      console.error "script must be defined"
      return
    if script instanceof GraphCommand
      @commands = [script]
    else if typeof script is 'string'
      @commands =  script.split(';')
    else if script.constructor is [].constructor
      @commands = script
    else # an object we presume
      @commands = [script]
    retval = @execute()
    @graph_ctrl.after_running_command(this)
    retval
  run_one: (cmd_spec) ->
    cmd = new GraphCommand(cmd_spec)
    cmd.prefixes = @prefixes
    cmd.execute(@graph_ctrl)
  execute: () =>
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

(exports ? this).GraphCommandLanguageCtrl = GraphCommandLanguageCtrl
(exports ? this).GraphCommand = GraphCommand
(exports ? this).GCLTest = GCLTest
(exports ? this).GCLTestSuite = GCLTestSuite
