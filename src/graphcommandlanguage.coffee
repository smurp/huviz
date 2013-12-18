angliciser = require('angliciser').angliciser
class GCLTest
  constructor: (@runner,@spec) ->
    #console.log "GCLTest.constructor() spec:",@spec
    @graph_ctrl = @runner.gclc.graph_ctrl
  perform: ->
    #console.log "GCLTest.perform() @spec:",@spec
    #console.log "@spec.script:",@spec.script
    if @spec.script
      #console.log "==================",@spec.script
      @runner.gclc.run(@spec.script)
    # should the expections be checked in a callback?
    for exp in (@spec.expectations ? [] )
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
  #    this.expect(this.graph_ctrl.unlinked_set.length,0);
  # }
  # ts = new GCLTestSuite(gclc, [
  #      {script:"choose 'abdyma'",
  #       expectations: [
  #           ["this.graph_ctrl.nodes.length",7],
  #           ["this.graph_ctrl.unlinked_set.length",0],
  #       ]
  #      }
  #     ])
  ###
  constructor: (@gclc,@suite) ->
    @break_quickly = true
  run: ->
    pass_count = 0
    errors = []
    fails = []
    num = 0
    for spec in @suite
      num++
      passed = false
      #console.log "spec:",spec
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
      throw new Error("node with id="+term+
            " not found among "+
            @graph_ctrl.nodes.length+" nodes: "+tried)
    return node    
  get_nodes: () ->    
    nodes = []
    like_regex = null
    if @like
      like_regex = new RegExp(@like,"ig") # ignore, greedy
    if @subjects
      for node_spec in @subjects
        node = @get_node(node_spec)
        if node
          nodes.push(node)
        nodes.push(node)
    else if @classes
      for class_name in @classes
        if class_name is 'everything'
          the_set = @graph_ctrl.nodes
        else
          the_set = @graph_ctrl.taxonomy[class_name]
        if @like
          for n in the_set
            if n.name.match(like_regex)
              nodes.push n
        else # a redundant loop, kept shallow for speed when no like
          for n in the_set
            nodes.push n
    return nodes
  get_methods: () ->  
    methods = []
    for verb in @verbs
      method = @graph_ctrl[verb]
      if method
        methods.push(method)
      else
        msg = "method '"+verb+"' not found"
        console.log msg
        #throw new Error(msg)
    return methods
  execute: (@graph_ctrl) ->
    nodes = @get_nodes()
    for meth in @get_methods()
      for node in nodes
        retval = meth.call(@graph_ctrl,node)
    @graph_ctrl.tick()
    retval
  update_str: ->
    missing = '____'
    cmd_str = ""
    ready = true
    if @verbs
      cmd_str = angliciser(@verbs)
    else
      ready = false
      cmd_str = missing
    cmd_str += " "
    obj_phrase = ""
    if @classes
      obj_phrase += angliciser(@classes)
    if @subjects
      obj_phrase += angliciser((subj.id for subj in @subjects))
    if obj_phrase is ""
      obj_phrase = missing
    cmd_str += obj_phrase
    like_str = (@like or "").trim()
    if like_str
      cmd_str += " like '"+like_str+"'"
    cmd_str += " ."
    @ready = ready
    @str = cmd_str
  parse: (cmd_str) ->
    # "choose 'abdyma'"
    parts = cmd_str.split(" ")
    verb = parts[0]
    subj = parts[1].replace(/\'/g,"") 
    cmd =
      verbs: [verb]
      subjects: [{'id': subj}]
    return cmd
    
    # "choose,label 'abdyma'"
    # "label everything"
    # "choose like 'Maria'"
    # "choose organizations like 'church'"
    # "choose everything like 'mary'"
    # "discard organizations like 'mary'"
    # "choose writers like 'Margaret' regarding family"
    #    /(\w+)(,\s*\w+) '(\w+)'/

  # Expect args: verbs, subjects, constraints, regarding
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
    console.log "new GraphCommand() ==>",@str
  
class GraphCommandLanguageCtrl
  constructor: (@graph_ctrl) ->
    @prefixes = {}
  run: (script) ->
    if script instanceof GraphCommand
      @commands = [script]
    else if typeof script is 'string'
      @commands =  script.split(';')
    else if script.constructor is [].constructor
      @commands = script
    else # an object we presume
      @commands = [script]
    retval = @execute()
    retval
  run_one: (cmd_spec) ->
    cmd = new GraphCommand(cmd_spec)
    cmd.prefixes = @prefixes
    cmd.execute(@graph_ctrl)
  run_verb_on_subj: (verb,subject) ->
    @run
      verbs: [verb]
      subjects: [@graph_ctrl.get_handle subject]
  execute: () ->
    for cmd_spec in @commands
      if cmd_spec
        @run_one(cmd_spec)
  
(exports ? this).GraphCommandLanguageCtrl = GraphCommandLanguageCtrl
(exports ? this).GraphCommand = GraphCommand
(exports ? this).GCLTest = GCLTest
(exports ? this).GCLTestSuite = GCLTestSuite
