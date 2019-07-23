/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//
class IndexedDBService {
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
    //alert("deleting #{dbname or @dbName}")
    const del_req = window.indexedDB.deleteDatabase('doof' || dbname || this.dbName);
    del_req.onerror = e => {
      //alert(e.toString())
      if (callback != null) {
        return callback(e);
      }
    };
    return del_req.onsuccess = e => {
      //alert("done deleting #{dbname}")
      if (dbname === this.dbName) {
        this.nstoreDB = undefined;
      }
      if (callback != null) {
        return callback();
      }
    };
  }

  initialize_db(callback) {
    const indexedDB = (window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB);

    if (!indexedDB) {
      throw new Error("indexedDB not available");
    }

    const when_done = (db, why, cb, err) => {
      this.nstoreDB = db;
      if (cb != null) {
        return cb(err);
      }
    };

    if (this.nstoreDB != null) {
      const msg = `nstoreDB already exists with name ${this.dbName}`;
      when_done(this.nstoreDB, msg, callback);
    } else {
      const req = indexedDB.open(this.dbName, this.dbVer); //TODO the name of the dataindex needs to be tied to specific instances
      console.log(req);  // 'req' is not in the same state as the samle ('pending') and does not have the proper definitions for onerror, onsuccess...etc.

      req.onsuccess = evt => {
        console.log(`onsuccess ${this.dbName}`);
        return when_done(req.result, "success", callback);
      };

      req.onerror = evt => {
        console.error(`IndexDB Error: ${evt.target.error.message}`);
        if (callback != null) {
          return callback(evt.target.error);
        }
      };

      req.onupgradeneeded = evt => {
        const db = evt.target.result;
        console.log(`onupgradeneeded ${db.name}`);
        console.log(evt);
        if (evt.oldVersion === 1) {
          if (Array.from(db.objectStoreNames).includes('spogis')) {
            alert("deleteObjectStore('spogis')");
            db.deleteObjectStore('spogis');
          }
        }
        if (evt.oldVersion < 3) { //Only create a new ObjectStore when initializing for the first time
          //alert("createObjectStore('#{@dbStoreName}')")
          const store = db.createObjectStore(this.dbStoreName,
            { keyPath: 'id', autoIncrement: true });
          console.log((db));
          store.createIndex("s", "s", { unique: false });
          store.createIndex("p", "p", { unique: false });
          store.createIndex("o", "o", { unique: false });

          return store.transaction.oncomplete = evt => {
            when_done(db, "onupgradeneeded", callback);
            return console.log(("transactions are complete"));
          };
        }
      };
    }
  }
  get_dbName() {
    return this.huviz.args.editui__dbName || this.dbName_default;
  }

  add_node_to_db(quad) {
    console.log(("add new node to DB"));
    console.log((quad));
    return console.log((this.nstoreDB));
  }
}
IndexedDBService.initClass();
    //trx = @nstoreDB.transaction('spogis', "readwrite")
    //trx.oncomplete = (e) =>
    //  console.log "spogis added!"
    //trx.onerror = (e) =>
    //  console.log(e)
    //  alert "add_dataset(spogis) error!!!"


(typeof exports !== 'undefined' && exports !== null ? exports : this).IndexedDBService = IndexedDBService;
