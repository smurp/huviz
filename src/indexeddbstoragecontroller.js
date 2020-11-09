// import {IndexedDBService} from 'indexeddbservice.js'; // TODO convert to module FIXME is this needed?

class IndexedDBStorageController {
  constructor(huviz, dbs) {
    this.huviz = huviz;
    this.dbs = dbs;
  }
     // preserves the graph_uri for inclusion in the quads when they are saved
  register(huviz) {
    // called by the HuViz constructor if the `edit_handler` no, no *`storage_controller`*
    this.huviz = huviz;
  }
  assert(quad) {
    //if not quad.g?
    //  quad.g = @graph_uri
    console.log("trx begin");
    const trx = this.dbs.nstoreDB.transaction(this.dbs.dbStoreName, 'readwrite');
    trx.oncomplete = e => {
      console.log("trx complete!");
    };
    trx.onerror = e => {
      throw e;
    };
    const store = trx.objectStore(this.dbs.dbStoreName);
    const req = store.put(quad);
    req.onsuccess = e => {
      console.log(quad,`added to ObjectStore: ${this.dbs.dbStoreName}`);
      this.huviz.add_quad(quad);
    };
    // gets called by the editui whenever Save is clicked
    // calls @huviz.add_quad (so huviz can display it)
    // saves the quad via IndexedDB to an objectStore called `quadstore`
  }
  get_graphs() {
     // returns the list of graphs from `quadstore` so PickOrProvide can show them for picking
    console.log("get_graphs() not implemented");
    return [];
  }
  count(cb) {
    const trx = this.dbs.nstoreDB.transaction(this.dbs.dbStoreName, 'readonly');
    const objstor = trx.objectStore(this.dbs.dbStoreName);
    const req = objstor.count();
    req.onsuccess = function() {
      cb(req.result);
    };
  }
}

// (exports ? this).IndexedDBStorageController = IndexedDBStorageController
// export IndexedDBStorageController; // TODO convert to modules
