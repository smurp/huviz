indexdDBstore = require('indexeddbservice')

class IndexedDBStorageController
  constructor: (@huviz, @graph_uri) ->
     # preserves the graph_uri for inclusion in the quads when they are saved
     console.log("--------------------------")
     #myhuviz = @huviz
     #console.log(myhuviz)
  register: (@huviz) ->
     # called by the HuViz constructor if the `edit_handler` no, no *`storage_controller`*
  assert: (quad) ->
    console.log("assert in IndexedDBStorageController")
    assrtSave = new indexdDBstore.IndexedDBService @huviz
    assrtSave.add_node_to_db(quad)
    #console.log(@huviz)
     # gets called by the editui whenever Save is clicked
     # calls @huviz.add_quad (so huviz can display it)
     # saves the quad via IndexedDB to an objectStore called `quadstore`
  get_graphs: ->
     # returns the list of graphs from `quadstore` so PickOrProvide can show them for picking

(exports ? this).IndexedDBStorageController = IndexedDBStorageController
