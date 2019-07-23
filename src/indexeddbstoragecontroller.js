/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const indexdDBstore = require('indexeddbservice');

class IndexedDBStorageController {
  constructor(huviz, dbs) {
    this.huviz = huviz;
    this.dbs = dbs;
  }
     // preserves the graph_uri for inclusion in the quads when they are saved
  register(huviz) {
    this.huviz = huviz;
  }
     // called by the HuViz constructor if the `edit_handler` no, no *`storage_controller`*
  assert(quad) {
    //if not quad.g?
    //  quad.g = @graph_uri
    console.log("trx begin");
    const trx = this.dbs.nstoreDB.transaction(this.dbs.dbStoreName, 'readwrite');
    trx.oncomplete = e => {
      return console.log("trx complete!");
    };
    trx.onerror = e => {
      throw e;
    };
    const store = trx.objectStore(this.dbs.dbStoreName);
    const req = store.put(quad);
    return req.onsuccess = e => {
      console.log(quad,`added to ObjectStore: ${this.dbs.dbStoreName}`);
      return this.huviz.add_quad(quad);
    };
  }
    // gets called by the editui whenever Save is clicked
    // calls @huviz.add_quad (so huviz can display it)
    // saves the quad via IndexedDB to an objectStore called `quadstore`
  get_graphs() {}
     // returns the list of graphs from `quadstore` so PickOrProvide can show them for picking
  count(cb) {
    const trx = this.dbs.nstoreDB.transaction(this.dbs.dbStoreName, 'readonly');
    const objstor = trx.objectStore(this.dbs.dbStoreName);
    const req = objstor.count();
    return req.onsuccess = () => cb(req.result);
  }
}

(typeof exports !== 'undefined' && exports !== null ? exports : this).IndexedDBStorageController = IndexedDBStorageController;
