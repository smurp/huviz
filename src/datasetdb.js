/*
  Usage:
      class WhateverWithDatasetDB extends DatasetDBMixin(Whatever) {}
      class SubclassOfDatasetDB extends DatasetDB {}
 */
import {
  PickOrProvide, PickOrProvideScript, PickOrProvideEndpoint, //PickOrProvide2Script,
  DragAndDropLoader, DragAndDropLoaderOfScripts
} from './dndloader.js';
import {uniquer, unique_id} from './uniquer.js'; // TODO rename to make_dom_safe_id

export let DatasetDBMixin = (superclass) => class extends superclass {
  init_datasetDB() {
    const {
      indexedDB
    } = window; // || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || null
    if (!indexedDB) {
      console.warn("indexedDB not available");
    }
    if (!this.datasetDB && indexedDB) {
      this.dbName = 'datasetDB';
      this.dbVersion = 2;
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onsuccess = (evt) => {
        console.debug('onsuccess', this.constructor.name);
        this.datasetDB = request.result;
        this.datasetDB.onerror = err => {
          alert(`Database error: ${e.target.errorCode}`);
        };
        //alert "onsuccess"
        this.populate_menus_from_IndexedDB('onsuccess');
        this.huviz.proceed_onceDBReady();
      };
      request.onerror = (err) => {
        console.error('onerror', err);
        alert(`unable to init ${this.dbName}`);
      };
      request.onupgradeneeded = (event) => {
        console.debug('onupgradeneeded', event);
        const db = event.target.result;
        const objectStore = db.createObjectStore("datasets", {keyPath: 'uri'});
        objectStore.transaction.oncomplete = (evt) => {
          this.datasetDB = db;
          // alert "onupgradeneeded"
          this.populate_menus_from_IndexedDB('onupgradeneeded');
        };
      };
    }
  }

  ensure_datasets(preload_group, store_in_db) {
    // note "fat arrow" so this can be an AJAX callback (see preload_datasets)
    const defaults = preload_group.defaults || {};
    //console.log(preload_group) # THIS IS THE ITEMS IN A FILE (i.e. cwrc.json, generes.json)
    for (let ds_rec of preload_group.datasets) {
      // If this preload_group has defaults apply them to the ds_rec
      // if it is missing that value.
      // We do not want to do `ds_rec.__proto__ = defaults`
      //  because then defaults are not ownProperty
      for (let k in defaults) {
        if (ds_rec[k] == null) { ds_rec[k] = defaults[k]; }
      }
      this.ensure_dataset(ds_rec, store_in_db);
    }
  }

  ensure_dataset(rsrcRec, store_in_db) {
    // ensure the dataset is in the database and the correct
    const { uri } = rsrcRec;
    if (rsrcRec.time == null) { rsrcRec.time = new Date().toString(); }
    if (rsrcRec.title == null) { rsrcRec.title = uri; }
    if (rsrcRec.isUri == null) { rsrcRec.isUri = !!uri.match(/^(http|ftp)/); }
    // if it has a time then a user added it therefore canDelete
    if (rsrcRec.canDelete == null) { rsrcRec.canDelete = !(rsrcRec.time == null); }
    if (rsrcRec.label == null) { rsrcRec.label = uri.split('/').reverse()[0]; }
    if (rsrcRec.isOntology) {
      if (this.ontology_loader) {
        this.ontology_loader.add_resource(rsrcRec, store_in_db);
      }
    }
    if (this.dataset_loader && !rsrcRec.isEndpoint) {
      this.dataset_loader.add_resource(rsrcRec, store_in_db);
    }
    if (rsrcRec.isEndpoint && this.endpoint_loader) {
      this.endpoint_loader.add_resource(rsrcRec, store_in_db);
    }
  }

  add_resource_to_db(rsrcRec, callback) {
    const trx = this.datasetDB.transaction('datasets', "readwrite");
    trx.oncomplete = (e) => {
      console.debug(`${rsrcRec.uri} added!`);
    };
    trx.onerror = (e) => {
      console.debug(e);
      alert(`add_resource(${rsrcRec.uri}) error!!!`);
    };
    const store = trx.objectStore('datasets');
    const req = store.put(rsrcRec);
    req.onsuccess = (e) => {
      if (rsrcRec.isEndpoint) {
        this.sparql_graph_query_and_show__trigger(e.srcElement.result);
      }
      if (rsrcRec.uri !== e.target.result) {
        console.debug(`rsrcRec.uri (${rsrcRec.uri}) is expected to equal`, e.target.result);
      }
      callback(rsrcRec);
    };
  }

  remove_dataset_from_db(dataset_uri, callback) {
    const trx = this.datasetDB.transaction('datasets', "readwrite");
    trx.oncomplete = (e) => {
      return console.log(`${dataset_uri} deleted`);
    };
    trx.onerror = (e) => {
      console.log(e);
      return alert(`remove_dataset_from_db(${dataset_uri}) error!!!`);
    };
    const store = trx.objectStore('datasets');
    const req = store.delete(dataset_uri);
    req.onsuccess = (e) => {
      if (callback != null) {
        callback(dataset_uri);
      }
    };
    req.onerror = (e) => {
      console.debug(e);
    };
  }

  get_resource_from_db(rsrcUri, callback) {
    const trx = this.datasetDB.transaction('datasets', "readonly");
    trx.oncomplete = (evt) => {
      console.debug(`get_resource_from_db('${rsrcUri}') complete, either by success or error`);
    };
    trx.onerror = (err) => {
      console.error(err);
      if (callback != null) {
        callback(err, null);
      } else {
        alert(`get_resource_from_db(${rsrcUri}) error!!!`);
        throw err;
      }
    };
    const store = trx.objectStore('datasets');
    const req = store.get(rsrcUri);
    req.onsuccess = (event) => {
      if (callback != null) {
        callback(null, event.target.result);
      }
    };
    req.onerror = (err) => {
      console.debug(`get_resource_from_db('${rsrcUri}') onerror ==>`,err);
      if (callback) {
        callback(err, null);
      } else {
        throw err;
      }
    };
  }

  populate_menus_from_IndexedDB(why) {
    // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#Using_a_cursor
    console.debug(`populate_menus_from_IndexedDB(${why})`);
    const datasetDB_objectStore = this.datasetDB.transaction('datasets').objectStore('datasets');
    let count = 0;
    const make_onsuccess_handler = (why) => {
      const recs = [];
      return event => {
        const cursor = event.target.result;
        if (cursor) {
          count++;
          const rec = cursor.value;
          recs.push(rec);
          const legacyDataset = (!rec.isOntology && !rec.rsrcType);
          const legacyOntology = (!!rec.isOntology);
          if (['dataset', 'ontology'].includes(rec.rsrcType) || legacyDataset || legacyOntology) {
            // both datasets and ontologies appear in the dataset menu, for visualization
            this.dataset_loader.add_resource_option(rec);
          }
          if ((rec.rsrcType === 'ontology') || legacyOntology) {
            // only datasets are added to the dataset menu
            this.ontology_loader.add_resource_option(rec);
          }
          if (rec.rsrcType === 'script') {
            this.script_loader.add_resource_option(rec);
          }
          if (rec.rsrcType === 'endpoint') {
            this.endpoint_loader.add_resource_option(rec);
          }
          cursor.continue();
        } else { // when there are no (or NO MORE) entries, ie FINALLY
          //console.table(recs)
          // Reset the value of each loader to blank so
          // they show 'Pick or Provide...' not the last added entry.
          console.debug(this.dataset_loader.val);
          this.dataset_loader.val();
          this.ontology_loader.val();
          this.endpoint_loader.val();
          this.script_loader.val();
          this.update_resource_menu();
          console.groupEnd(); // closing group called "populate_menus_from_IndexedDB(why)"
          document.dispatchEvent( // TODO use 'huvis_controls' rather than document
            new Event('dataset_ontology_loader_ready'));
        }
      };
    };
    //alert "#{count} entries saved #{why}"
    if (this.dataset_loader != null) {
      datasetDB_objectStore.openCursor().onsuccess = make_onsuccess_handler(why);
    }
  }

  preload_datasets() {
    // If present args.preload is expected to be a list or urls or objects.
    // Whether literal object or JSON urls the object structure is expected to be:
    //   { 'datasets': [
    //        {
    //         'uri': "/data/byroau.nq",     // url of dataset .ttl or .nq
    //         'label': "Augusta Ada Brown", // label of OPTION in SELECT
    //         'isOntology': false,          // optional, if true it goes in Onto menu
    //         'opt_group': "Individuals",   // user-defined label for menu subsection
    //         'canDelete':   false,         // meaningful only for recs in datasetsDB
    //         'ontologyUri': '/data/orlando.ttl' // url of ontology
    //         }
    //                  ],
    //     'defaults': {}  # optional, may contain default values for the keys above
    //    }
    console.groupCollapsed("preload_datasets");
    // Adds preload options to datasetDB table
    console.debug(this.args.preload);
    if (this.args.preload) {
      for (var preload_group_or_uri of this.args.preload) {
        if (typeof(preload_group_or_uri) === 'string') { // the URL of a preload_group JSON
          //$.getJSON(preload_group_or_uri, null, @ensure_datasets_from_XHR)
          $.ajax({
            async: false,
            url: preload_group_or_uri,
            success: (data, textStatus) => {
              return this.ensure_datasets_from_XHR(data);
            },
            error(jqxhr, textStatus, errorThrown) {
              return console.error(preload_group_or_uri + " " +textStatus+" "+errorThrown.toString());
            }
          });
        } else if (typeof(preload_group_or_uri) === 'object') { // a preload_group object
          this.ensure_datasets(preload_group_or_uri);
        } else {
          console.error("bad member of @args.preload:", preload_group_or_uri);
        }
      }
    }
    console.groupEnd(); // closing group called "preload_datasets"
  }

  preload_endpoints() {
    console.debug(this.args.preload_endpoints);
    console.groupCollapsed("preload_endpoints");
    //###
    if (this.args.preload_endpoints) {
      for (var preload_group_or_uri of this.args.preload_endpoints) {
        console.debug(preload_group_or_uri);
        if (typeof(preload_group_or_uri) === 'string') { // the URL of a preload_group JSON
          //$.getJSON(preload_group_or_uri, null, @ensure_datasets_from_XHR)
          $.ajax({
            async: false,
            url: preload_group_or_uri,
            success: (data, textStatus) => {
              return this.ensure_datasets_from_XHR(data);
            },
            error(jqxhr, textStatus, errorThrown) {
              return console.error(preload_group_or_uri + " " +textStatus+" "+errorThrown.toString());
            }
          });
        } else if (typeof(preload_group_or_uri) === 'object') { // a preload_group object
          this.ensure_datasets(preload_group_or_uri);
        } else {
          console.error("bad member of @args.preload:", preload_group_or_uri);
        }
      }
    }
    console.groupEnd();
  }

  ensure_datasets_from_XHR(preload_group) {
    this.ensure_datasets(preload_group, false); // false means DO NOT store_in_db
  }

  get_menu_by_rsrcType(rsrcType) {
    return this[rsrcType+'_loader']; // eg rsrcType='script' ==> @script_loader
  }

  get_or_create_sel_for_picker(specificSel) {
    // if specificSel is defined, return it, otherwise return the selector of a thin
    let sel = specificSel;
    if ((sel == null)) {
      if ((this.pickersSel == null)) {
        let huvis_controls_sel;
        const pickersId = unique_id('pickers_');
        this.pickersSel = '#' + pickersId;
        if (huvis_controls_sel = this.oldToUniqueTabSel['huvis_controls']) {
          if (this.huvis_controls_elem == null) {
            this.huvis_controls_elem = document.querySelector(huvis_controls_sel);
          }
          if (this.huvis_controls_elem) {
            this.huvis_controls_elem.insertAdjacentHTML(
              'beforeend',
              `<div id="${pickersId}"></div>`);
          }
        }
      }
      sel = this.pickersSel;
    }
    return sel;
  }

  init_resource_menus(args) {
    this.args = args;
    // REVIEW See views/huviz.html.eco to set dataset_loader__append_to_sel and similar
    if (!this.dataset_loader && this.args.make_pickers) {
      let sel = this.args.dataset_loader__append_to_sel;
      this.dataset_loader = new PickOrProvide(this, sel,
        'Dataset', 'DataPP', false, false,
        {rsrcType: 'dataset'});
    }
    if (!this.ontology_loader && this.args.make_pickers) {
      let sel = this.args.ontology_loader__append_to_sel;
      this.ontology_loader = new PickOrProvide(this, sel,
        'Ontology', 'OntoPP', true, false,
        {rsrcType: 'ontology'});
    }
    if (!this.script_loader && this.args.make_pickers) {
      let sel = this.args.script_loader__append_to_sel;
      this.script_loader = new PickOrProvideScript(this, sel,
        'Script', 'ScriptPP', false, false,
        {dndLoaderClass: DragAndDropLoaderOfScripts, rsrcType: 'script'});
    }
    if (!this.endpoint_loader && this.args.make_pickers) {
      let sel = this.args.endpoint_loader__append_to_sel;
      this.endpoint_loader = new PickOrProvideEndpoint(this, sel,
        'Sparql', 'EndpointPP', false, true,
        {rsrcType: 'endpoint'});
    }
    //@endpoint_loader.outstanding_requests = 0
    // if (this.endpoint_loader && !this.big_go_button) {
     if (this.endpoint_loader && this.args.make_pickers) {
      /*
      alert('WOOT');
      this.build_sparql_form();
      //const endpoint_selector = `#${this.endpoint_loader.select_id}`;
      const endpoint_selector = `#sparqlDetailHere`;
      const sparqlDetailElem = this.querySelector(endpoint_selector);
      const sparqlDetailTemplate = document.getElementById('sparql-ux');
      const content = sparqlDetailTemplate?.content; // nullish coalescence
      if (content) {
        sparqlDetailElem.appendChild(content);
      }
      */
      //$(endpoint_selector).change(this.update_endpoint_form);
    }
    /*
    if (this.ontology_loader && !this.big_go_button) {
      this.big_go_button_id = unique_id('goButton_');
      this.big_go_button = $('button.big_go_button');
      this.big_go_button.attr('id', this.big_go_button_id);
      //$(this.get_or_create_sel_for_picker()).append(this.big_go_button);
      this.big_go_button.click(this.big_go_button_onclick);
      this.disable_go_button();
    }
    */
    if (this.ontology_loader
        || this.dataset_loader
        || (this.script_loader && !this.gotoVisQuery_elem)) {
      const ontology_selector = `#${this.ontology_loader.select_id}`;
      $(ontology_selector).change(this.update_dataset_forms);
      const dataset_selector = `#${this.dataset_loader.select_id}`;
      $(dataset_selector).change(this.update_dataset_forms);
      const script_selector = `#${this.script_loader.select_id}`;
      $(script_selector).change(this.update_dataset_forms);
    }

    this.init_datasetDB();
    this.preload_datasets();

    //@preload_endpoints()
    // TODO remove this nullification of @last_val by fixing logic in select_option()
    // clear the last_val so select_option works the first time
    if (this.ontology_loader.last_val) {
      this.ontology_loader.last_val = null;
    }
  }

  build_sparql_form() {
    console.log('build_sparql_form()');
    throw new Error('build_sparql_form() should no longer be called');
    this.sparqlId = unique_id();
    const sparqlQryInput_id = `sparqlQryInput_${this.sparqlId}`;
    this.sparqlQryInput_selector = "#" + sparqlQryInput_id;
    const endpoint_limit_id = unique_id('endpoint_limit_');
    const endpoint_labels_id = unique_id('endpoint_labels_');
    const spo_query_id = unique_id('spo_query_');
    const sparqlGraphSelectorId = `sparqlGraphOptions-${this.endpoint_loader.select_id}`;
    const spo_placeholder =
         `SELECT * {
           ?s ?p ?o .
         }`.replace(/         /g,'');
    const select_box = `\
      <div class="ui-widget" style="margin-top:5px;margin-left:10px;">
        <h3>from datasetdb.js</h3>
        <label>Graphs: DOH </label>
        <select id="${sparqlGraphSelectorId}">
        </select>
      </div>
      <div id="sparqlGraphSpinner-${this.endpoint_loader.select_id}"
         style="display:none;font-style:italic;">
        <i class="fas fa-spinner fa-spin" style="margin: 10px 10px 0 50px;"></i>
        Looking for graphs...
      </div>
      <div id="${sparqlQryInput_id}" class="ui-widget sparqlQryInput"
         style="display:none;margin-top:5px;margin-left:10px;color:#999;">
        <label for="${endpoint_labels_id}">Find: </label>
        <input id="${endpoint_labels_id}">
        <i class="fas fa-spinner fa-spin" style="visibility:hidden;margin-left: 5px;"></i>
        <div>
          <label for="${endpoint_limit_id}">Node Limit: </label>
          <input id="${endpoint_limit_id}" value="${this.sparql_query_default_limit}">
        </div>
        <div>
          <label for="${spo_query_id}">(s,p,o) query: </label><br/>
          <textarea id="${spo_query_id}" value="" style="width:90%" rows="5"
            placeholder="${spo_placeholder}"></textarea>
          <p><i>pick graph, then enter query producing one or more <code>s,p,o</code></i></p>
        </div>
      </div>
      `;
    $(this.pickersSel).append(select_box);
    this.sparqlQryInput_JQElem = $(this.sparqlQryInput_selector);
    console.log('about to endpoint_levels_JQElem');
    this.endpoint_labels_JQElem = $('#'+endpoint_labels_id);
    this.endpoint_limit_JQElem = $('#'+endpoint_limit_id);
    this.sparqlGraphSelector_JQElem = $('#'+sparqlGraphSelectorId);
    this.sparqlGraphSelector_JQElem.change(this.sparqlGraphSelector_onchange);
    const fromGraph ='';
    this.endpoint_labels_JQElem.on('input', this.animate_endpoint_label_typing);
    this.endpoint_labels_JQElem.autocomplete({
      minLength: 3,
      delay: 500,
      position: {collision: "flip"},
      source: this.search_sparql_by_label
    });
    this.endpoint_labels_JQElem.on('autocompleteselect', this.endpoint_labels__autocompleteselect);
    this.endpoint_labels_JQElem.on('change', this.endpoint_labels__update);
    this.endpoint_labels_JQElem.focusout(this.endpoint_labels__focusout);
    this.spo_query_JQElem = $('#'+spo_query_id);
    this.spo_query_JQElem.on('update', this.spo_query__update);
  }

  spo_query__update(event) {
    // if there is a query, then permit LOAD of graph
    if (this.spo_query_JQElem.length) {
      this.enable_go_button();
    } else {
      this.disable_go_button();
    }
  }

  disable_go_button() {
    let disable;
    this.update_go_button((disable = true));
  }

  enable_go_button() {
    let disable;
    this.update_go_button((disable = false));
  }

  update_go_button(disable) {
    if (disable == null) {
      if (this.script_loader.value) {
        disable = false;
      } else if (this.huviz.using_sparql()) {
        disable = false;
      } else {
        const ds_v = this.dataset_loader.value;
        const on_v = this.ontology_loader.value;
        //console.log("DATASET: #{ds_v}\nONTOLOGY: #{on_v}")
        disable = (!(ds_v && on_v)) || ([ds_v, on_v].includes('provide'));
        const ds_on = `${ds_v} AND ${on_v}`;
      }
    }
    this.gotoVisQuery_elem.disabled = disable;
  }

  sparql_graph_query_and_show__trigger(url) {
    const selectId = this.endpoint_loader.select_id;
    this.sparql_graph_query_and_show(url, selectId);
    //console.log @dataset_loader
    /*
    console.warn('this.datset_loader.disabled = true; // UNTESTED REPLACEMENT FOR jQuery code');
    this.dataset_loader.disabled = true;
    this.ontology_loader.disabled = true;
    this.script_loader.disabled = true;
    */
    alert('sparql_graph_query_and_show__trigger()');
    $(`#${this.dataset_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
    $(`#${this.ontology_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
    $(`#${this.script_loader.uniq_id}`).children('select').prop('disabled', 'disabled');

  }

  sparql_graph_query_and_show(url, datasetJSON, callback) {
    var {id, skip_graph_search} = datasetJSON
    const qry = `\
# sparql_graph_query_and_show("${url}")
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?g ?label
WHERE {
GRAPH ?g { } .
OPTIONAL {?g rdfs:label ?label}
}
ORDER BY ?g\
`;
    // these are shared between success and error handlers
    const spinner = $(`#sparqlGraphSpinner-${id}`);
    spinner.css('display','block');
    const graphSelector = `#sparqlGraphOptions-${id}`;
    $(graphSelector).parent().css('display', 'none');
    this.sparqlQryInput_hide();
    // LOAD button should be disabled while the search for graphs is happening
    this.disable_go_button();
    const handle_graphsNotFound = () => {
      $(graphSelector).parent().css('display', 'none');
      this.reset_endpoint_form(true);
      this.enable_go_button();
    };

    const make_success_handler = () => {
      return (data, textStatus, jqXHR, queryManager) => {
        let json_data;
        const json_check = typeof data;
        if (json_check === 'string') {
          json_data = JSON.parse(data);
        } else {
          json_data = data;
        }

        const results = json_data.results.bindings;
        queryManager.setResultCount(results.length);

        const graphsNotFound = jQuery.isEmptyObject(results[0]);
        if (graphsNotFound) {
          handle_graphsNotFound();
          return;
        }
        let graph_options = `<option id='${this.unique_id()}' value='${url}'> All Graphs </option>`;
        for (let graph of results) {
          var label;
          if (graph.label != null) {
            label = ` (${graph.label.value})`;
          } else {
            label = '';
          }
          graph_options = graph_options +
            `<option id="${this.unique_id()}" value="${graph.g.value}">` +
            `${graph.g.value}${label}</option>`;
        }
        $(`#sparqlGraphOptions-${id}`).html(graph_options);
        $(graphSelector).parent().css('display', 'block');
        this.reset_endpoint_form(true);
        this.disable_go_button(); // disable until a graph or term is picked
      };
    };

    const make_error_callback = () => {
      return (jqXHR, textStatus, errorThrown) => {
        $(graphSelector).parent().css('display', 'none');
        spinner.css('visibility','hidden');
        //@reset_dataset_ontology_loader()
        handle_graphsNotFound();
        this.reset_endpoint_form(true);
      };
    };

    const args = {
      success_handler: make_success_handler(),
      error_callback: make_error_callback()
    };
    args.query = qry;
    args.serverUrl = url;
    if (skip_graph_search) {
      args.timeout = 1; //msec
    }
    this.sparql_graph_query_and_show_queryManager = this.run_managed_query_ajax(args);
  }

  sparqlQryInput_hide() {
    this.sparqlQryInput_JQElem.hide(); //css('display', 'none')
  }

  sparqlQryInput_show() {
    this.sparqlQryInput_JQElem.show();
    this.sparqlQryInput_JQElem.css({'color': 'inherit'} );
  }

  endpoint_loader_is_quiet() {
    // TODO Replace with a Promise-based way to ensure the loader is ready.
    // TODO Build it into PickOrProvide and use it in @load_with() too.
    return (this.endpoint_loader != null) && this.endpoint_loader.is_quiet(500);
  }

  XXX_visualize_from_url(querySpec) {
    const {serverUrl, graphUrl, limit, subjectUrl} = querySpec;
    if (!this.endpoint_loader_is_quiet()) {
      setTimeout((() => this.visualize_from_url(querySpec)), 50);
      //throw new Error("endpoint_loader not ready")
      return;
    }
    this.goto_tab('commands');
    if (serverUrl != null) {
      this.endpoint_loader.select_by_uri(serverUrl);
      this.sparql_graph_query_and_show__trigger(serverUrl);
      const finish_prep = () => {
        if (graphUrl != null) {
          this.sparqlQryInput_show();
          this.sparqlGraphSelector_JQElem.val(graphUrl);
        }
        if (limit != null) {
          this.endpoint_limit_JQElem.val(limit);
        }
        if (subjectUrl != null) {
          this.endpoint_labels_JQElem.val(subjectUrl);
        }
        return this.big_go_button_onclick_sparql();
      };
      this.sparql_graph_query_and_show_queryManager.when_done(finish_prep);
    }
  }

  reset_dataset_ontology_loader() {
    $('#'+this.get_data_ontology_display_id()).remove();
    //Enable dataset loader and reset to default setting
    this.dataset_loader.enable();
    this.ontology_loader.enable();
    this.big_go_button.show();
    $(`#${this.dataset_loader.select_id} option[label='Pick or Provide...']`)
       .prop('selected', true);
    this.gclui_JQElem.removeAttr("style","display:none");
  }

  update_endpoint_form(e) {
    //check if there are any endpoint selections available
    const graphSelector = `#sparqlGraphOptions-${e.currentTarget.id}`;
    $(graphSelector).change(this.update_graph_form);
    if (e.currentTarget.value === '') {
      $(`#${this.dataset_loader.uniq_id}`).children('select').prop('disabled', false);
      $(`#${this.ontology_loader.uniq_id}`).children('select').prop('disabled', false);
      $(`#${this.script_loader.uniq_id}`).children('select').prop('disabled', false);
      $(graphSelector).parent().css('display', 'none');
      this.reset_endpoint_form(false);
    } else if (e.currentTarget.value === 'provide') {
      console.log("update_endpoint_form ... select PROVIDE");
    } else {
      // find the selected OPTION
      var selectedOption = e.currentTarget.querySelector('option:checked');
      var endpointDataset;
      var endpointJSON = {id: e.currentTarget.id}
      if (selectedOption) {
        endpointDataset = selectedOption.dataset;
        endpointJSON = Object.assign(endpointJSON, endpointDataset);
      }
      this.sparql_graph_query_and_show(e.currentTarget.value, endpointJSON);
      //console.log(@dataset_loader)
      $(`#${this.dataset_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
      $(`#${this.ontology_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
      $(`#${this.script_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
    }
  }

  reset_endpoint_form(show) {
    const spinner = $(`#sparqlGraphSpinner-${this.endpoint_loader.select_id}`);
    spinner.css('display','none');
    this.endpoint_labels_JQElem.prop('disabled', false).val("");
    this.endpoint_limit_JQElem.prop('disabled', false).val(this.sparql_query_default_limit);
    if (show) {
      this.sparqlQryInput_show();
    } else {
      this.sparqlQryInput_hide();
    }
  }

  load_script_from_db(err, rsrcRec) {
    if (err != null) {
      this.blurt(err, 'error');
    } else {
      this.huviz.load_script_from_POJO(
        this.huviz.parse_script_to_POJO(rsrcRec.data, rsrcRec.uri));
    }
  }

}

export class DatasetDB extends DatasetDBMixin(Object) {}
