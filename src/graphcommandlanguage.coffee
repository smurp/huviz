
class GraphCommand
  get_nodes: () ->
    nodes = []
    for node_spec in @subjects
      id = node_spec.id
      term = id      
      node = @graph_ctrl.nodes.get({'id':term})
      unless node
        @prefixes.forEach (prefix) =>
          if not node
            term = prefix+id
            node = @graph_ctrl.nodes.get({'id':term})
      if not node
        throw new Error("node with id="+term+" not found")
      nodes.append(node)
    return nodes    
  get_methods: () ->  
    methods = []
    for verb in @verbs
      method = @graph_ctrl[verb]
      if not method
        throw new Error("method "+method+" not found")
      methods.append(method)
    return methods
  execute: (@graph_ctrl,prefixes) ->
    @prefixes = prefixes ? []
    nodes = @get_nodes()
    for meth in @get_methods()
      for node in nodes
        meth.call(node)
  parse: (cmd_str) ->
    # "choose 'abdyma'"
    parts = cmd_str.split(" ")
    verb = parts[0]
    subj = parts[1].replace("'","")
    cmd =
      verbs: [verb]
      subjects: [{'id': subj}]
    console.log cmd
    return cmd
    
    # "choose,label 'abdyma'"
    # "choose like 'Maria'"
    # "choose organizations like 'church'"
    # "choose writers like 'Margaret' regarding family"

    # /(\w+)(,\s*\w+) '(\w+)'/
    

  # Expect args: verbs, subjects, constraints, regarding
  constructor: (args_or_str) ->
    if typeof args_or_str == 'string'
      args = @parse(args_or_str)
    else
      args = args_or_str
    for arg of args
      @[arg] = args[arg]
    console.log(this)
  
class GraphCommandLanguageCtrl
  constructor: (@graph_ctrl,@prefixes) ->
  run: (commands) ->
    @commands =  commands ? @commands
    @execute()
  do: (cmd_spec) ->
    cmd = new GraphCommand(cmd_spec)
    cmd.execute(@graph_ctrl,@prefixes)
  execute: () ->
    for cmd_spec in @commands
      @do(cmd_spec)
  
(exports ? this).GraphCommandLanguageCtrl = GraphCommandLanguageCtrl
