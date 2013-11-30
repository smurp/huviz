###

  A graph showing just some nodes and just some edges from a large knowledge
  base can be specified by a series of operations which add, remove, link
  or label nodes and edges.  The goal is to provide an interface which
  supports performing these operations using either direct interaction or
  abstract specifiction, graphically provided.  Such a graph can be expressed
  as an ordered series of commands on sets of nodes and edges.

  <verb-phrase> <taxonomic-restriction> <name-restriction>;
  
  Examples of Commands:
    Graph and Label Groups like 'party';
    Graph Works like 'raven';
    Label People like 'atwood';
    Discard Orgs like 'oxford OR cambridge';

  Taxonomic Restriction:
     All | ( People(Writers|Others) |
             Organizations(Churches|Universities|Publishers|...) |
             Places(Continents|Oceans|Countries|Cities|Neighborhoods|...) |
             Works(Books|Poems|Essays|Articles|...) )

  Name Restriction (optional):
     like: <a string> | <a regex>    | <a boolean query>
       eg: atwood     |'oxf.*|cambr' | 'oxford OR cambridge'
      
  Action Specification:
    Graph|Ungraph
    Label|Unlabel
    Discard|Retrieve



  Command Add/Edit Interface Schematic:  
  
    +--------+ +-------+ +----------+ +------+ +------+  
    | writer | | other | | publisher| |church| |school|
    +--------+ +-------+ +----------+ +------+ +------+  
           \      /              \      /
          +--------+             +-----+      +--------+     +-------+
          | person |             | org | ...  | places | ... | works |
          +--------+             +-----+      +--------+     +-------+
                   \           /
                     \        /
                      +------+
                      | all  |
                      +------+
                     +--------+ 
               like: | atwood |  5 nodes
                     +--------+
                      |  ||  |
                     /        \
                   /     ||     \
          +--------+ +--------+ +--------+ 
          | graph  | | label  | | discard|
          +--------+ +--------+ +--------+ 
          |ungraph | |unlabel | |retrieve|
          +--------+ +--------+ +--------+ 


  Command Sequence Interface Schematic:

    Commands can be:
      reordered by dragging the thumb tabs: ||
      deleted by clicking the X.
      edited by clicking on their text
        or directly edited textually
      added by being directly typed
        <enter> executes and starts a new command

    X || Graph and Label Groups like 'party';
    X || Graph Works like 'raven';
    X || Label People like 'atwood'; 
    X || Discard Orgs like 'oxford OR cambridge';

    Typing:                 Produces:
      atwood<enter>           Graph All like 'atwood';
      not 'Mary'<enter>       Ungraph All like 'Mary';

  Graphical interaction with the graph itself is captured as a series of
  commands.  Clicking a node in the lariat equals "Graph Node <nodeid>."

###


cmds = ["Graph Group like 'party'",
  "Discard Writers"]

class NodeChooser
  constructor: (graph,sets)->
    @graph = graph
    @sets = sets
    # G
    # sets = {nodes,unlinked,discarded,hidden,links}

  in_div: (container) ->
    @container = container
    div = d3.select(container)
    #svg = div.append("svg").attr("width", width).attr("height", height)
    t = div.append('table')
    t.style("z-index:3")
    t.style("bg-color:red")

    t.data(['graph'])

window.NodeChooser = NodeChooser
