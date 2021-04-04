export class IndexedDBService {
  static initClass() {
    this.prototype.dbName_default = 'nstoreDB';
    this.prototype.dbVer = 2;
  }
  constructor(huviz) {
    this.huviz = huviz;
    this.dbName = this.get_dbName();
    this.dbStoreName = "ntuples";
    this.initialize_db();
  }

  expunge_db(dbname, callback) {
    const indexedDB = this.get_indexedDB();
    const del_req = indexedDB.deleteDatabase('doof' || dbname || this.dbName);
    del_req.onerror = e => {
      //alert(e.toString())
      if (callback != null) {
        callback(e);
      }
    };
    del_req.onsuccess = e => {
      //alert("done deleting #{dbname}")
      if (dbname === this.dbName) {
        this.nstoreDB = undefined;
      }
      if (callback != null) {
        callback();
      }
    };
  }

  get_indexedDB() {
    return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  }

  initialize_db(callback) {
    const indexedDB = this.get_indexedDB();

    if (!indexedDB) {
      throw new Error("indexedDB not available");
    }

    const when_done = (db, why, cb, err) => {
      this.nstoreDB = db;
      if (cb != null) {
        cb(err);
      }
    };

    if (this.nstoreDB != null) {
      const msg = `nstoreDB already exists with name ${this.dbName}`;
      when_done(this.nstoreDB, msg, callback);
    } else {
      const req = indexedDB.open(this.dbName, this.dbVer); //TODO the name of the dataindex needs to be tied to specific instances
      console.debug(req);  // 'req' is not in the same state as the samle ('pending') and does not have the proper definitions for onerror, onsuccess...etc.

      req.onsuccess = evt => {
        console.debug(`onsuccess ${this.dbName}`);
        when_done(req.result, "success", callback);
      };

      req.onerror = evt => {
        console.error("IndexDB Error: " + evt.target.error.message);
        if (callback != null) {
          callback(evt.target.error);
        }
      };

      req.onupgradeneeded = evt => {
        const db = evt.target.result;
        console.debug(`onupgradeneeded ${db.name}`);
        console.debug(evt);
        if (evt.oldVersion === 1) {
          if (db.objectStoreNames.includes('spogis')) {
            alert("deleteObjectStore('spogis')");
            db.deleteObjectStore('spogis');
          }
        }
        if (evt.oldVersion < 3) { //Only create a new ObjectStore when initializing for the first time
          //alert("createObjectStore('#{@dbStoreName}')")
          const store = db.createObjectStore(this.dbStoreName,
            { keyPath: 'id', autoIncrement: true });
          console.debug(db);
          store.createIndex("s", "s", { unique: false });
          store.createIndex("p", "p", { unique: false });
          store.createIndex("o", "o", { unique: false });

          store.transaction.oncomplete = evt => {
            when_done(db, "onupgradeneeded", callback);
            return console.debug("transactions are complete");
          };
        }
      };
    }
  }
  get_dbName() {
    return this.huviz.args.editui__dbName || this.dbName_default;
  }

  add_node_to_db(quad) {
    console.debug("add new node to DB");
    console.debug(quad);
    console.debug(this.nstoreDB);
    //trx = @nstoreDB.transaction('spogis', "readwrite")
    //trx.oncomplete = (e) =>
    //  console.log "spogis added!"
    //trx.onerror = (e) =>
    //  console.log(e)
    //  alert "add_dataset(spogis) error!!!"
  }
}
IndexedDBService.initClass();

// export IndexedDBService; // TODO convert to module
