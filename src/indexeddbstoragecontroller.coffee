# import {IndexedDBService} from 'indexeddbservice.js'; // TODO convert to module FIXME is this needed?

class IndexedDBStorageController
  constructor: (@huviz, @dbs) ->
     # preserves the graph_uri for inclusion in the quads when they are saved
  register: (@huviz) ->
     # called by the HuViz constructor if the `edit_handler` no, no *`storage_controller`*
  assert: (quad) ->
    #if not quad.g?
    #  quad.g = @graph_uri
    console.log("trx begin")
    trx = @dbs.nstoreDB.transaction(@dbs.dbStoreName, 'readwrite')
    trx.oncomplete = (e) =>
      console.log("trx complete!")
    trx.onerror = (e) =>
      throw e
    store = trx.objectStore(@dbs.dbStoreName)
    req = store.put(quad)
    req.onsuccess = (e) =>
      console.log(quad,"added to ObjectStore: #{@dbs.dbStoreName}")
      @huviz.add_quad(quad)
    # gets called by the editui whenever Save is clicked
    # calls @huviz.add_quad (so huviz can display it)
    # saves the quad via IndexedDB to an objectStore called `quadstore`
  get_graphs: ->
     # returns the list of graphs from `quadstore` so PickOrProvide can show them for picking
  count: (cb) ->
    trx = @dbs.nstoreDB.transaction(@dbs.dbStoreName, 'readonly')
    objstor = trx.objectStore(@dbs.dbStoreName)
    req = objstor.count()
    req.onsuccess = () ->
      cb(req.result)

(exports ? this).IndexedDBStorageController = IndexedDBStorageController
