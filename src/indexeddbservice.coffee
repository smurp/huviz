#
class IndexedDBService
  constructor: (@huviz) ->
    console.log('+++++++++++++++++++++++++++++++++++++++++++++')
    indexedDB = window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB

    if not indexedDB
      console.log "indexedDB not available"

    if not @datasetDB and indexedDB
      @dbNm = "dataDB2"
      @dbVer = 1
      @dbStoreName = "spogis"
      #db =
      req = indexedDB.open(@dbNm, @dbVer) #TODO the name of the dataindex needs to be tied to specific instances
      console.log(req)                            # 'req' is not in the same state as the samle ('pending') and does not have the proper definitions for onerror, onsuccess...etc.

      req.onsuccess = (evt) =>
        console.log("successfully opened indexedDB")
        console.log(evt)
        console.log (req.result)
        @dsetDB = req.result

      req.onerror = (evt) =>
        console.error("IndexDB Error: " + evt.target.error.message)

      req.onupgradeneeded = (evt) =>
        db = evt.target.result
        console.log("Upgraded indexDB: " + db.name)
        console.log(evt)
        if evt.oldVersion is 0 #Only create a new ObjectStore when initializing for the first time
          store = db.createObjectStore(@dbStoreName, { keyPath: 'id', autoIncrement: true })
          console.log (db)
          store.createIndex("s", "s", { unique: false })
          store.createIndex("p", "p", { unique: false })
          store.createIndex("o", "o", { unique: false })

          store.transaction.oncomplete = (evt) =>
            @dsetDB = db
            console.log ("transactions are complete")
            console.log (db)

  add_node_to_db: (quad) ->
    console.log ("add new node to DB")
    console.log (quad)
    console.log  (@dsetDB)
    #trx = @dsetDB.transaction('spogis', "readwrite")
    #trx.oncomplete = (e) =>
    #  console.log "spogis added!"
    #trx.onerror = (e) =>
    #  console.log(e)
    #  alert "add_dataset(spogis) error!!!"


(exports ? this).IndexedDBService = IndexedDBService
