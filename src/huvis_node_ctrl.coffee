
class NodeChooser
  constructor: (graph,sets)->
    @graph = graph
    @sets = sets
    # G
    # sets = {nodes,unlinked,discarded,hidden,links}
  
  in_div: (container) ->
    @container = container
    div = d3.select(container)
    svg = div.append("svg").attr("width", width).attr("height", height)
  

  
  