#
class IndexedDBService
  constructor: (@huviz) ->
    @dbName = @get_dbName()
    @dbStoreName = "ntuples"
    @initialize_db()

  expunge_db: (dbname, callback) ->
    #alert("deleting #{dbname or @dbName}")
    del_req = window.indexedDB.deleteDatabase('doof' or dbname or @dbName)
    del_req.onerror = (e) =>
      #alert(e.toString())
      if callback?
        callback(e)
    del_req.onsuccess = (e) =>
      #alert("done deleting #{dbname}")
      if dbname is @dbName
        @nstoreDB = undefined
      if callback?
        callback()

  initialize_db: (callback) ->
    indexedDB = window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB

    if not indexedDB
      throw new Error("indexedDB not available")

    when_done = (db, why, cb, err) =>
      #alert("database #{@dbName} opened!")
      @nstoreDB = db
      if cb?
        cb(err)

    if @nstoreDB?
      msg = "nstoreDB already exists with name #{@dbName}"
      console.warn(msg)
      when_done(@nstoreDB, msg, callback)
    else
      req = indexedDB.open(@dbName, @dbVer) #TODO the name of the dataindex needs to be tied to specific instances
      console.log(req)  # 'req' is not in the same state as the samle ('pending') and does not have the proper definitions for onerror, onsuccess...etc.

      req.onsuccess = (evt) =>
        console.log("onsuccess #{@dbName}")
        when_done(req.result, "success", callback)

      req.onerror = (evt) =>
        console.error("IndexDB Error: " + evt.target.error.message)
        if callback?
          callback(evt.target.error)

      req.onupgradeneeded = (evt) =>
        db = evt.target.result
        console.log("onupgradeneeded #{db.name}")
        console.log(evt)
        if evt.oldVersion is 1
          if 'spogis' in db.objectStoreNames
            alert("deleteObjectStore('spogis')")
            db.deleteObjectStore('spogis')
        if evt.oldVersion < 3 #Only create a new ObjectStore when initializing for the first time
          #alert("createObjectStore('#{@dbStoreName}')")
          store = db.createObjectStore(@dbStoreName,
            { keyPath: 'id', autoIncrement: true })
          console.log (db)
          store.createIndex("s", "s", { unique: false })
          store.createIndex("p", "p", { unique: false })
          store.createIndex("o", "o", { unique: false })

          store.transaction.oncomplete = (evt) =>
            when_done(db, "onupgradeneeded", callback)
            console.log ("transactions are complete")
    return

  dbName_default: 'nstoreDB'
  dbVer: 2
  get_dbName: ->
    return @huviz.args.editui__dbName or @dbName_default

  add_node_to_db: (quad) ->
    console.log ("add new node to DB")
    console.log (quad)
    console.log  (@nstoreDB)
    #trx = @nstoreDB.transaction('spogis', "readwrite")
    #trx.oncomplete = (e) =>
    #  console.log "spogis added!"
    #trx.onerror = (e) =>
    #  console.log(e)
    #  alert "add_dataset(spogis) error!!!"


(exports ? this).IndexedDBService = IndexedDBService
