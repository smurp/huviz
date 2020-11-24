import * as huviz from '/huviz/huviz.js';

var expect = chai.expect();
/*

  This suite has some problems:
    1) the "say(test_title, done)" lines are redundant
    2)

  Recommended Reading for writing modern tests for HuViz:
    http://staxmanade.com/2015/11/testing-asyncronous-code-with-mochajs-and-es7-async-await/

*/

const ORLANDO_ONTOLOGY_URI = "http://cwrc.ca/ontologies/OrlandoOntology-2015-11-16.ttl";
const EDITUI_DBNAME = 'nstoreDB_test';

var mocha_box_args = {
  "title":"test suite",
  "maxHeight": 800,
  "minWidth": 500,
  "position": {"at": "left top", "of": window}
};
var dlg = $("#mocha_box").dialog(mocha_box_args);
mocha.setup('bdd');
window.addEventListener('load',function(){
  mocha.run();
});

document.addEventListener('touchmove', function(e) {
  // TODO it would be great if Shawn had documented the movitvation for this :-)
  e.preventDefault();
}, false);

var pause_msec = 3;
var say = function(msg, done) {
  console.log("STARTING",msg);
  if (done) {
    setTimeout(function(){
      console.log("FINISHING",msg);
      done();
    }, pause_msec);
  }
  setTimeout(function(){
    console.log("FINISHING",msg);
    if (done) done();
  }, pause_msec);
};

/*
 http://staxmanade.com/2015/11/testing-asyncronous-code-with-mochajs-and-es7-async-await/

Purpose:
  It is challenging to use async/await in Mocha.  This helper make it easier.

Usage:
  it("Sample async/await mocha test using wrapper", mochaAsync(async () => {
    var x = await someAsyncMethodToTest();
    expect(x).to.equal(true);
  }));

  beforeEach(mochaAsync(async () => {
    await someLongSetupCode();
  }));

*/
function mochaAsync(fn) {
  return async function(done) {
    try {
      await fn();
      done();
    } catch (err) {
      done(err);
    }
  };
}

function confirm_continue(str) {
  if (! confirm(str)) {
    halt();
  }
}

function sleep(ms, because) {
  blurt(`sleep(${ms}${because && ', "' + because + '"'})`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

function blurt(str) {
  if (!$('#blurtbox').length) {
    $('#tabs').append(`<div id="blurtbox" style="overflow:scroll; height:150px; font-family:monospace"></div>`);
  }
  $('#blurtbox').append(`<li>${str}</li>`);
  $('#blurtbox').scrollTop(1000000);
}
window.blurt = blurt;

// http://stackoverflow.com/a/40230053/1234699
function checkUntil(conditionFunc, interval_ms, timeout_ms) {
  var retryCountLimit = 100;
  var retryCount = 0;
  if (timeout_ms && timeout_ms > interval_ms) {
    retryCountLimit = Math.round(timeout_ms/interval_ms);
  }
  console.debug(conditionFunc);
  blurt(`checkUntil(COND, ${interval_ms}, ${timeout_ms})`);
  var promise = new Promise((resolve, reject) => {
    var timer = setInterval(function () {
      if (conditionFunc()) {
        clearInterval(timer);
        resolve();
        return;
      }
      retryCount++;
      if (retryCount >= retryCountLimit) {
        clearInterval(timer);
        reject(new Error(`retry count: ${retryCount} hit limit: ${retryCountLimit}`));
        //reject(`retry count: ${retryCount} hit limit: ${retryCountLimit}`);
        //throw new Error(`retry count: ${retryCount} hit limit: ${retryCountLimit}`);

      }
    }, interval_ms);
    if (timeout_ms) {
      setTimeout(function(){
        clearInterval(timer);
      },timeout_ms);
    }
  });

  return promise;
}

async function wait_till_prop__equals__(obj, prop_name, threshold, interval, timeout) {
  if (! interval) interval = 10;
  if (! timeout) timeout = 20 * interval + 1;
  let success = checkUntil(function() {
    //if (obj.n >= threshold) { alert(`got to ${threshold}`); }
    let retval = (obj[prop_name] == threshold);
    if (retval) {
      let msg = `wait_till_prop__equals__(${prop_name}, ${threshold}) SUCCESS`;
      blurt(`${msg}`);
    } else {
      let msg = `wait_till_prop__equals__(${prop_name}, ${threshold}): ${obj[prop_name]}`;
      blurt(`${msg}`);
    }
    return retval;
  }, interval, timeout);
  return success;
};

async function wait_till_prop__not_equals__(obj, prop_name, threshold, interval, timeout) {
  if (! interval) interval = 10;
  if (! timeout) timeout = 20 * interval + 1;
  let success = checkUntil(function() {
    //if (obj.n >= threshold) { alert(`got to ${threshold}`); }
    let retval = (obj[prop_name] != threshold);
    if (retval) {
      let msg = `wait_till_prop__not_equals__(${prop_name}, ${threshold})`;
      blurt(`${msg}`);
    } else {
      let msg = `wait_till_prop__not_equals__(${prop_name}, ${threshold}): ${obj[prop_name]}`;
      blurt(`${msg}`);
    }
    return retval;
  }, interval, timeout);
  return success;
};

async function wait_till_prop_n_equals(obj, threshold, interval, timeout) {
  if (! interval) interval = 10;
  if (! timeout) timeout = 20 * interval + 1;
  let success = checkUntil(function() {
    if (!obj.n) {
      obj.n = 0;
    }
    obj.n++;
    console.log("  "+obj.n);
    //if (obj.n >= threshold) { alert(`got to ${threshold}`); }
    return (obj.n >= threshold);
  }, interval, timeout);
  return success;
};

async function wait_till_true(cond, every_ms, timeout) {
  let sucess = await checkUntil(function() {
    return cond();
  }, every_ms, timeout);
};

async function wait_till_all_selected_for(HVZ, every_ms, timeout) {
  let sucess = await checkUntil(function() {
    return HVZ.selected_set.length == HVZ.nodes.length;
  }, every_ms, timeout);
};
async function wait_till_none_selected_for(HVZ, every_ms, timeout) {
  return wait_till_true(() => {return HVZ.selected_set.length == 0;}, every_ms, timeout);
  /*
  let sucess = await checkUntil(function() {
    return HVZ.selected_set.length == 0;
  }, every_ms, timeout);
  */
};



// http://stackoverflow.com/a/324533/1234699
var getStyle = function(className) {
    var classes = document.styleSheets[0].rules || document.styleSheets[0].cssRules;
    for (var x = 0; x < classes.length; x++) {
        if (classes[x].selectorText == className) {
            if (classes[x].cssText) {
              return classes[x].cssText;
            }
            (classes[x].cssText) ?
                 alert(classes[x].cssText) :
                 alert(classes[x].style.cssText);
        }
    }
};

/*
var setup_jsoutline = function() {
  console.group("jsoutline setup");
  window.treepicker = require('treepicker');
  window.coloredtreepicker = require('coloredtreepicker');
  window.taxon = require('taxon');
  window.gclui = require('gclui');
  jsoutline.traceAll(huviz.Orlando, true, ["tick","draw_circle","calc_node_radius","should_show_label","show_the_edges","draw_edge_labels","should_show_label","draw_nodes_in_set","draw_discards","draw_edge_labels","should_show_label","draw_discards","find_focused_node_or_edge","adjust_cursor","blank_screen","update_snippet","clear_canvas","draw_dropzones","show_last_mouse_pos","auto_change_verb","show_node_links","get_charge","hide_state_msg","show_state_msg","draw_labels","draw_nodes","apply_fisheye","draw_shelf","position_nodes","draw_edges","recolor_node","uri_to_js_id", "default_graph_controls", "mousemove", "draw_edges_from", "draw_curved_line"]);
  jsoutline.traceAll(treepicker.TreePicker, true, ["set_payload","get_or_create_payload","uri_to_js_id"]);
  jsoutline.traceAll(coloredtreepicker.ColoredTreePicker,true, ["set_payload","get_or_create_payload"]);
  jsoutline.traceAll(gclui.CommandController, true, ["auto_change_verb_if_warranted","is_immediate_mode","on_set_count_update"]);
  jsoutline.traceAll(taxon.Taxon, true);
  window.graphcommandlanguage = require('graphcommandlanguage')
  jsoutline.traceAll(graphcommandlanguage.GraphCommand, true, []);
  jsoutline.squelch = true;
  jsoutline.collapsed = true;
  console.groupEnd();
};
//setup_jsoutline();
*/

var get_nextcommand_str = function() {
  return $(".nextcommand_str").text();
};
var get_nextcommand_prompt = function() {
  return $(".nextcommand_prompt").text();
};
var get_payload = function(id) {
  return $('#' + id + ' > .treepicker-label > .payload').text();
}


describe("Test Enhancements", function() {
  before(function() {
    $('body').append('<pre id="timing_test" style="position:fixed; padding:0; margin:0; right:0; bottom:0; width:30%; height:30%; background:GoldenRod">TIMING</pre>')
  });

  after(function() {
    $('#timing_test').remove();
  });

  it("time delays should be possible",
     function(done) {
       function show(summut) {
         $('#timing_test').append(`${summut} `);
       }
       async function zoom(cb){
         $('#timing_test').html('');
         show('BEFORE');
         let tocker = setInterval(function(){show('tock')},100);
         let ticker = setInterval(function(){show('tick')},90);
         await sleep(300);
         clearInterval(ticker);
         clearInterval(tocker);
         show('AFTER');
         if (cb) {
           cb.call();
         }
       }
       zoom(done);
     });

  it("condition satisfaction should be supported by returning a Promise",
     function() {
       let obj = {};
       let TARGET_VALUE = 8;
       //async function count_asynchronously_until(target_value) {
       return wait_till_prop_n_equals(obj, TARGET_VALUE, 100, 5000);
     });

  it("using checkUntil()",
     mochaAsync(async () => {
       let obj = {n: 0};
       await checkUntil(function(){obj.n++; return obj.n > 5;}, 20, 200);
       expect(obj.n).to.equal(6);
       await checkUntil(function(){obj.n++; return obj.n > 10;}, 20, 200);
       expect(obj.n).to.equal(11);
     }));

  it("using wait_till_prop__equals__",
     mochaAsync(async () => {
       let obj = {n: 0};
       expect(true).to.equal(true);
     }));

  xit("condition satisfaction using wait_till_prop__equals__()",
     mochaAsync(async () => {
       let obj = {};
       obj.n = 0;
       let inc_obj_n = function() {
         console.log("obj.n:", obj.n);
         obj.n++;
       };
       let interval_id = setInterval(inc_obj_n, 10);
       let TARGET_VALUE = 8;
       return wait_till_prop__equals__(obj.n, TARGET_VALUE, 100, 1000);
     }));

  xit("condition satisfaction should be supported",
      function(done) {
        function show(summut) {
          $('#timing_test').append(`${summut} `);
        }
        async function zoom(cb){
          $('#timing_test').html('');
          show('BEFORE');
          let tocker = setInterval(function(){show('tock')},100);
          let ticker = setInterval(function(){show('tick')},90);
          await sleep(300);
          clearInterval(ticker);
          clearInterval(tocker);
          show('AFTER');
          if (cb) {
            cb.call();
          }
        }
        zoom(done);
      });
});

describe("HuViz Tests", function() {
  this.timeout(35000);
  //this.bail(true); // tell mocha to stop on first failure
  var number_of_nodes = 15;
  var test_title;

  function halt(because) {
    because = because || "halting intentionally";
    expect(undefined, because).to.be.ok();
  }

  // http://stackoverflow.com/questions/23947688/how-to-access-describe-and-it-messages-in-mocha
  before(function bootHuviz(done) {
    console.groupCollapsed("test suite setup");
    let nest_done = function(next) {
      return function() { return next; }
    };
    let delete_dbs = function(deletable_dbs) {
      for (const dbname of deletable_dbs) {
        //done = nest_cb(done);
        blurt(`queue <b>${dbname}</b> for deletion`);
        let del_req = window.indexedDB.deleteDatabase(dbname);
        del_req.onsuccess = function(dbname) {
          return function(){
            blurt(`<b>${dbname}</b> deleted`);
          };
        }(dbname);
        del_req.onerror = function(evt){
          let err = evt.result;
          blurt(`<b>${dbname}</b> error: ${err.toString()}`);
        };
      }
    };
    delete_dbs('dataDB2 datasets nstoreDB_test2 nstoreDB_test'.split(' '));

    window.HVZ = new huviz.Orlando({
      huviz_top_sel: "#HUVIZ_TOP",
      show_edit: false,
      start_with_editing: false,
      settings: {
        show_cosmetic_tabs: true,
        show_queries_tab: true
      },
      editui__dbName: EDITUI_DBNAME,
      // pass in the tab_specs to override the defaults_tab_specs
      tab_specs:
      [
        {
          "id": "intro",
          "cssClass": "tabs-intro scrolling_tab",
          "title": "Introduction and Usage",
          "text": "Intro",
          "moveSelector": "#contents_of_intro_tab"
        },
        'commands','settings','history','credits',
        'sparqlQueries'
      ],
      preload: [
        //'/data/genres.json'
        //, '/data/cwrc-writer.json'
        '/data/ontologies.json'
        //, '/data/open_anno.json'
        , '/data/experiments.json'
        //, '/data/organizations.json'
        //, '/data/periodicals.json'
        //, '/data/publishing.json'
        , '/data/individuals.json'
        //, '/data/cwrc_data.json'
        //, '/data/public_endpoints.json'
        //, '/data/cwrc_endpoints.json'
      ]

      /*

      // THESE VALUES ARE PRESERVED HERE
      // WHILE WE DUST OFF THE TESTS

      viscanvas_sel: "#viscanvas",
      gclui_sel: "#gclui",
      graph_controls_sel: '#tabs-options',
      display_reset: true,
      dataset_loader__append_to_sel: ".unselectable",
      ontology_loader__append_to_sel: ".unselectable",
      endpoint_loader__append_to_sel: ".unselectable",

      preload: [{
        datasets: [{uri: ORLANDO_ONTOLOGY_URI,
                    label: 'OrlandoOntology',
                    opt_group: 'Preloaded'}],
        defaults: {isOntology: true, canDelete: false}
      },{
        datasets: [{uri: "/data/abdyma.nq", label: 'Maria Abdy'}
                   ,{uri: "/data/shakwi.nq", label: 'William Shakespeare'}
                   //,{uri: "/data/.nq", label: ''}
                  ],
        defaults: {isOntology: false, opt_group: 'Individuals', canDelete: false}
      }],
      display_reset: true,
      editui__dbName: EDITUI_DBNAME

      */

    });
    document.addEventListener('dataset_ontology_loader_ready', function() {
      HVZ.dataset_loader.val("/data/shakwi.nq");
      HVZ.ontology_loader.val(ORLANDO_ONTOLOGY_URI);
      HVZ.big_go_button.click()
    }, false);
    // HVZ.set_ontology("http://cwrc.ca/ontologies/OrlandoOntology-2015-11-16.ttl");
    document.addEventListener('dataset-loaded', function(e) {
      console.log("dataset-loaded",arguments);
      done();
    }, false);
    //HVZ.boot_sequence();
    HVZ.goto_tab(2);
    console.groupEnd();
  });

  beforeEach(async function() {
    test_title = this.currentTest.title;
    //console.clear();
    console.groupCollapsed(test_title);
    await select_expand_and_ungraph_all();
  });

  // http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep/39914235#39914235
  async function select_expand_and_ungraph_all() {
    HVZ.gclui.clear_set_picker();
    ev = HVZ.gclui.engaged_verbs;
    //HVZ.gclui.disengage_all_verbs(); // preliminary
    /*
    try {
      HVZ.click_set("all");
      HVZ.click_set("all");
    } catch(e) {
      console.error(e);
    }
    */
    if (HVZ.graphed_set.length ||
        HVZ.selected_set.length != HVZ.nodes.length) {
      if (! HVZ.gclui.taxon_picker.id_is_collapsed.Thing) { // if Thing isnt collapsed
        $("#Thing span.expander:first").trigger("click");   //   collapse it
      }
      HVZ.click_taxon("Thing"); // should select all nodes
      if (HVZ.selected_set.length != HVZ.nodes.length) {
        HVZ.click_taxon("Thing");
      }
      $("#Thing span.expander:first").trigger("click"); // expand
      HVZ.click_verb("unchoose").doit();
    }
    if (HVZ.gclui.predicate_picker.id_is_collapsed.anything) {
      $("#anything span.expander:first").trigger("click"); // expand
    }
    if ($("#classes .treepicker-collapse").length) {
      HVZ.gclui.taxon_picker.expand_all();
    }
    if ($("#predicates .treepicker-collapse").length) {
      HVZ.gclui.predicate_picker.expand_all();
    }
    HVZ.gclui.disengage_all_verbs();
    expect(HVZ.gclui.engaged_verbs.length,
           `gclui.engaged_verbs non-empty [${ev.join(',')}]`).
      to.equal(0);
    expect($(".verb.engaged").length,
           "some verb(s) engaged").
      to.equal(0);
    expect($(".treepicker-collapse").length,
           "something is collapsed").
      to.equal(0);
    console.log("should be empty set", $(".treepicker-mixed"));
    if ($(".treepicker-mixed").length) {
      //if (confirm("something is mixed!!!  Debug?")) { debugger; }
      await sleep(3000, "letting treepicker-mixed settle to 0, HACKY");
    }
    await wait_till_prop__equals__($(".treepicker-mixed"), 'length', 0, 60, 8000);
    expect($(".treepicker-mixed").length,
           "something is mixed").
      to.equal(0);
    if (HVZ.selected_set.length != HVZ.nodes.length) {
      HVZ.click_verb('select').click_set('all').click_verb('select');
      //throw new Error("not everything is selected");
    }
    await wait_till_all_selected_for(HVZ, 333, 2001);
    /*
    expect(HVZ.gclui.engaged_verbs.length,
           `gclui.engaged_sets non-empty [${ev.join(',')}]`).
      to.equal(0);
    */

    if (HVZ.labelled_set.length) {
      HVZ.click_set('all').click_verb('unlabel').click_set('all');
      await wait_till_prop__equals__(HVZ.labelled_set, 'length', 0, 30, 2000);
    }

    expect(HVZ.selected_set.length,
           "not everything selected").
      to.equal(HVZ.nodes.length);
    if (HVZ.graphed_set.length) {
      HVZ.click_set('all').click_verb('unchoose');
    }
    expect(HVZ.graphed_set.length,
           "leaving things graphed").
      to.equal(0);
    expect(HVZ.shelved_set.length,
           "not everything shelved").
      to.equal(HVZ.nodes.length);
    expect(HVZ.labelled_set.length,
           "some things are still labelled").
      to.equal(0);
    //expect();
    expect($("#Thing").hasClass("treepicker-indirect-showing"), "Thing should be darkly colored").to.equal(true);
    expect($("#Thing").hasClass("treepicker-showing"), "Thing should be darkly colored, again").to.equal(true);
    expect($("#Thing").hasClass("treepicker-unshowing"), "Thing should not be lightly colored").to.equal(false);
    expect($("#Thing").hasClass("treepicker-indirect-mixed"), "Thing should not be stripey").to.equal(false);
  }

  afterEach(function() {
    console.groupEnd();
  });

  xdescribe("Edit UI", function() {
    before(function(done) {
      done();
    })
    afterEach(function(){
      // ensure VIEW mode is restored
      if (HVZ.editui__leave_open) {
        console.log(`after() is respecting HVZ.editui_leave_open`);
      } else {
        if ($(".edit-controls").attr('edit') == 'yes') {
          console.log(`after() restored the VIEW mode`);
          $(".edit-controls .slider").trigger('click');
        }
        expect($(".edit-controls").attr('edit')).to.equal('no');
      }});
    it(`the '${EDITUI_DBNAME}' should exist and be emptied at the start WIP no emptying`,
       mochaAsync(async () => {
         expect(window.indexedDB).to.be.ok()
         await checkUntil(() => {return HVZ.indexeddbservice.dbName}, 20, 200)
         expect(HVZ.indexeddbservice.dbName).to.equal(EDITUI_DBNAME);
         HVZ.indexeddbservice.initialize_db();
         await checkUntil(() => {return HVZ.indexeddbservice.nstoreDB}, 20, 600)
       }));
    it("the View/Edit control should exist",
       function() {
	 expect($(".edit-controls")).to.exist();
       });
    it("should toggle form display when clicked",
       mochaAsync(async () => {
         $(".edit-controls .slider").trigger('click');
	 expect($(".edit-controls").attr('edit')).to.equal('yes');
         await sleep(100); // just so we can see it
         $(".edit-controls .slider").trigger('click');
	 expect($(".edit-controls").attr('edit')).to.equal('no');
       }));
    it("should Save properly entered triples",
       function(done) {
	 say(test_title);
	 expect($(".edit-controls").attr('edit')).to.equal('no');
         $(".edit-controls .slider").trigger('click'); // enter edit mode
         expect($(".edit-controls").attr('edit')).to.equal('yes');
         expect($(".edit-controls .saveForm").attr('disabled')).to.equal('disabled');
         $(".edit-controls input[name='subject']").val('bob')
         $(".edit-controls input[name='predicate']").val('rdf:type')
         /*
           The use of .simulate() is motivated by the fact that jquery.trigger()
           only works with jquery-registered handlers.  The consequence is that
           .simulate() is needed to properly trigger validate_edit_form(), but
           even .simulate is not working.
         */
         $(".edit-controls input[name='object']").
           simulate("key-sequence", {sequence: 'foaf:uncles'})
         HVZ.editui.validate_edit_form(); // This should NOT need to be called directly
         console.warn("validate_edit_form() should be triggered by key-sequence")
         expect($(".edit-controls .saveForm").attr('disabled')).to.not.exist();

         HVZ.editui.latest_quad = {};
         $(".edit-controls .saveForm").click();
         expect(HVZ.editui.latest_quad.s).to.equal('bob')
         HVZ.dbsstorage.count(function(val) {
           expect(val).to.equal(1);
           console.log('count == 1');
           done();
         });
       });
    it("ENGAGE THIS TEST to do manual testing of drag and drop editing",
       mochaAsync(async () => {
         HVZ.toggle_taxon("Thing", true); // deselect everything
         $(".edit-controls .slider").trigger('click');
         await sleep(1000);
	 expect($(".edit-controls").attr('edit')).to.equal('yes');
         HVZ.editui__leave_open = true;
         halt();
       }));
  });

  describe("graph controls", function() {
    xit("FAIL IMMEDIATELY, to show the initial state of all tests",
       function() {
         halt("__ every Thing.");
       });

    it("the default controls should exist and have the right values",
       function() {
	 expect($("input[name='label_em']")).to.exist();
	 expect($("input[name='label_em']").attr('value')).to.equal('0.9');
       });

    xit("clicking reset should restore the neutral condition",  // RESET does not exist like this at the moment
       function(done) {
	 HVZ.click_verb("label").click_set("shelved");
	 expect(HVZ.labelled_set.length,
		"everything should be labelled by now").to.not.equal(0);
	 $("#reset_btn").click()
	 expect(HVZ.labelled_set.length,
		"nothing should be labelled after reset").to.equal(0);
         done();
       });

    it("should adjust ontologies when datasets picked",
       function() {
         $()
       });
  });

  describe("liking things", function() {
    it("liking should select the set ALL",
       function() {
	 HVZ.toggle_taxon("Thing", true);
	 HVZ.like_string("william");
	 expect(!HVZ.gclui.immediate_execution_mode,
		"but not enter immediate execution mode");
	 expect(HVZ.gclui.chosen_set_id,
		"set ALL should be chosen").to.equal('all_set');
	 $("#reset_btn").click();
	 expect(HVZ.labelled_set.length,
		"nothing should be labelled after reset").to.equal(0);
	 expect(HVZ.gclui.liking_all_mode,
		"should no longer be in liking_all_mode").to.equal(false);
       });

    xit("emptying 'like' should restore whatever set was previously engaged",
      mochaAsync(async () => {
	 HVZ.toggle_taxon("Thing", true);
	 prior_set_id = 'shelved_set';
	 HVZ.click_set(prior_set_id);
         //halt(`${prior_set_id} should be engaged`);
	 HVZ.like_string("william");
         //halt(`${prior_set_id} should be engaged and 'william' liked`);
	 expect(HVZ.gclui.immediate_execution_mode,
		`"___ ALL like 'william'" should be in immediate execution mode`).
	   to.equal(true);
	 expect(HVZ.gclui.chosen_set_id,
		"set ALL should be chosen").to.equal('all_set');
         HVZ.DEBUG = true;
	 HVZ.like_string("");
	 expect(HVZ.gclui.chosen_set_id,
		`set ALL should be ${prior_set_id}`).
           to.equal(prior_set_id); // TODO change to all_set
      }));

    xit("liking some string while all_set is engaged should LEAVE it engaged",
      mochaAsync(async () => {
	 HVZ.toggle_taxon("Thing", true);
	 prior_set_id = 'all_set';
	 HVZ.click_set(prior_set_id);
         like_str = 'william';
	 HVZ.like_string(like_str);
         //halt(`${prior_set_id} should be engaged and '${like_str}' liked`);
	 expect(HVZ.gclui.chosen_set_id,
		`set ALL should be ${prior_set_id}`).
           to.equal(prior_set_id);
	 expect(HVZ.gclui.immediate_execution_mode,
		`"___ ALL like '${like_str}'" should be in immediate execution mode`).
	   to.equal(true);
	 expect(HVZ.gclui.chosen_set_id,
		"set ALL should be chosen").to.equal('all_set');
	 HVZ.like_string("");
	 expect(HVZ.gclui.chosen_set_id,
		`set ALL should be ${prior_set_id}`).
           to.equal(prior_set_id); // TODO change to all_set
         //halt('expecting "__ every Thing. " so FAIL NOW');
         //done();
      }));

    it("HVZ.click_set('all').click_verb('unselect').click_set('all') SHOULD WORK");

    xit("liking with a verb picked should show the GO button WAS WORKING?!?",
       mochaAsync(async () => {
	 HVZ.toggle_taxon("Thing", true);
         await wait_till_none_selected_for(HVZ, 30, 2000);
         expect(HVZ.selected_set.length, "none should be selected").to.equal(0);
	 HVZ.toggle_taxon("Thing", true);
	 HVZ.click_verb('label');
	 HVZ.like_string("thames");
         function immediate_execution_mode__OFF(){
           blurt(`awaiting immediate_execution_mode__OFF`);
           return HVZ.gclui.immediate_execution_mode == false;
         }
         await checkUntil(immediate_execution_mode__OFF, 19, 1000); // FIXME is this stopping?
	 expect(HVZ.gclui.immediate_execution_mode,
		"immediate_execution_mode should be disabled").
	   to.equal(false);
	 expect(HVZ.labelled_set.length,
		"nothing should be labelled before the GO button is pressed").
	   to.equal(0);
	 expect(HVZ.gclui.chosen_set_id,
		"set ALL should be chosen").to.equal('all_set');
	 expect($(HVZ.gclui.doit_butt[0][0]).is(':hidden'),
		"the GO button should be visiblee").to.equal(false);
	 HVZ.like_string(""); // TODO ensure that gclui.reset() cleans up
	 expect($(HVZ.gclui.doit_butt[0][0]).is(':hidden'),
		"the GO button should be hidden").to.equal(true);
         await wait_till_prop__equals__(HVZ.labelled_set, 'length', 0, 30, 1000);
         expect(HVZ.labelled_set.length, `expecting nothing to be labelled anymore`).to.equal(0);
       }));

    xit("pressing the GO button should run the current command WAS WORKING?!?",
       mochaAsync(async () => {
         HVZ.toggle_taxon("Thing", true); // deselect all
         await wait_till_none_selected_for(HVZ, 30, 2000);
         expect(HVZ.labelled_set.length,
                "expecting nothing to be labelled").to.equal(0);
         /*
           If a verb is engaged and then a like_string provided then immediate execution mode
           should be turned OFF -- with the consequence that the GO button should appear.
           */
         HVZ.click_verb('label');
         HVZ.like_string("thames");
	 expect($(HVZ.gclui.doit_butt[0][0]).is(':hidden'),
		"the GO button should be visible").to.equal(false);
	 expect(!$(HVZ.gclui.doit_butt[0][0]).attr('disabled'),
		"the GO button should not be disabled");
	 $("#doit_button").click();
	 expect(HVZ.labelled_set.length,
		"and then not clean up after itself").
	   to.equal(2);  // depends on shakwi.nq
	 expect($(HVZ.gclui.doit_butt[0][0]).is(':hidden'),
		"the GO button should remain visible after clicking").
	   to.equal(false);
	 cmd_str = [HVZ.human_term.label,
		     HVZ.human_term.all,
		     'like',
		     "\'thames\'",
		     "."].join(' ');
	 expect(get_nextcommand_str()).to.equal(cmd_str);
	 expect(get_nextcommand_prompt()).to.equal(cmd_str);
	 expect(!$(HVZ.gclui.doit_butt[0][0]).attr('disabled'),
		"the GO button should remain clickable after clicking");
       }));

    it("Reset should clean up after a pressed GO button",
       mochaAsync(async () => {
	 $("#reset_btn").click();
	 HVZ.click_verb('label');
	 HVZ.like_string("thames");
	 $("#doit_button").click();
	 expect(HVZ.labelled_set.length,
		"Thames should be labelled after doing 'LABEL ALL like 'thames'.").
	   to.equal(2);  // depends on shakwi.nq
	 $("#reset_btn").click();
	 expect(HVZ.labelled_set.length,
		"everything should be cleaned up after Reset").to.equal(0)
       }));

    it("Reset should clean up after an unpressed GO button",
       mochaAsync(async () => {
	 $("#reset_btn").click();
	 HVZ.click_verb('label');
	 HVZ.like_string("thames");
	 expect(HVZ.labelled_set.length,
		"Thames should be labelled after \"LABEL ALL like 'thames'.\"").
	   to.equal(0);
	 $("#reset_btn").click();
	 expect(HVZ.labelled_set.length,
		"everything should be cleaned up after Reset").to.equal(0)
       }));
  });


  describe("operations on classes", function() {

    it("initially everything should be shelved and nothing graphed",
       function() {
	 expect(HVZ.graphed_set.length).to.equal(0);
	 expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
	 expect($("#Thing").hasClass("treepicker-indirect-mixed"),
		"Thing should not be treepicker-indirect-mixed").
           to.equal(false);

	 expect(HVZ.graphed_set.length).to.equal(0);
	 expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);

	 var taxon_name = "Thing";
	 expect($("#classes .treepicker-indirect-mixed").length,
		"there should be no indirect-mixed once " +
		taxon_name + " reselected").
           to.equal(0);

	 expect($("#predicates .treepicker-indirect-mixed").length,
		"there should be no indirect-mixed predicates when nothing is graphed").
           to.equal(0);

	 jsoutline.squelch = false;
	 jsoutline.collapsed = false;
       });

    it("toggling a leaf predicate should leave the root predicate unmixed",
       mochaAsync(async () => {
	 a_leaf_pred_id = "deathConnectionToSettlement";
	 HVZ.click_predicate(a_leaf_pred_id);  // graph some leaf predicates
         await wait_till_prop__not_equals__(HVZ.graphed_set, 'length', 0, 30, 2000);
	 expect(HVZ.graphed_set.length,
		"something should be graphed after selecting a leaf predicate").
           to.not.equal(0);

	 HVZ.click_predicate(a_leaf_pred_id);  // ungraph them again
         await wait_till_prop__equals__(HVZ.graphed_set, 'length', 0, 30, 2000);
	 expect(HVZ.graphed_set.length,
		"nothing should be graphed after toggling a leaf predicate").
           to.equal(0);
	 expect($("#predicates .treepicker-indirect-mixed").length,
		"there should be no indirect-mixed predicates when nothing is graphed").
           to.equal(0);
       }));

    it("toggling branch predicates should leave the root predicate unmixed",
       mochaAsync(async () => {
	 a_branch_predicate = "deathConnectionToGeog";
	 HVZ.click_predicate(a_branch_predicate); // graph some branch predicates
         await wait_till_prop__not_equals__(HVZ.graphed_set, 'length', 0, 30, 2000);
	 expect(HVZ.graphed_set.length,
		"something should be graphed after selecting a branch predicate").
           to.not.equal(0);

	 HVZ.click_predicate(a_branch_predicate);        // ungraph them again
         await wait_till_prop__equals__(HVZ.graphed_set, 'length', 0, 30, 2000);
	 expect(HVZ.graphed_set.length,
		"nothing should be graphed after toggling branch " +
		a_branch_predicate).to.equal(0);
	 expect($("#predicates .treepicker-indirect-mixed").length,
		"there should be no indirect-mixed predicates when nothing is graphed").
           to.equal(0);
       }));

    it("the colors should properly change when the collapsed class picker is toggled");

    it("the current selection should show in the nextcommand box",
       mochaAsync(async () => {
	 // verify initial state
	 expected_str = "____ every Thing ."; // note four _
	 expect(get_nextcommand_str()).to.equal(expected_str);
	 expected_prompt = HVZ.human_term.blank_verb + " every Thing .";
	 expect(get_nextcommand_prompt()).to.equal(expected_prompt);

	 // deselect everything using the taxon_picker
	 HVZ.toggle_expander("Thing"); // collapse
	 HVZ.click_taxon("Thing"); // deselect
         await wait_till_prop__equals__(HVZ.selected_set, 'length', 0, 30, 2000);
	 expect(HVZ.selected_set.length).to.equal(0);
	 // confirm that the object of the commands is blank
	 expect(get_nextcommand_str()).to.equal("____ ____ .");
	 expect(HVZ.selected_set.length).to.equal(0);
	 expected_prompt = HVZ.human_term.blank_verb + " " +
	   HVZ.human_term.blank_noun + ' .';
	 expect(get_nextcommand_prompt()).to.equal(expected_prompt);

	 // a single class selected should be simple
	 HVZ.toggle_expander("Thing"); // expand
	 HVZ.click_taxon("Person");
         await wait_till_prop__not_equals__(HVZ.selected_set, 'length', 0, 30, 2000);
	 expect(get_nextcommand_str()).
	   to.equal("____ Person .");
	 expect(get_nextcommand_prompt()).
	   to.equal(HVZ.human_term.blank_verb + " Person .");

	 // expand everything again
	 HVZ.toggle_expander("Thing"); // collapse so we can...
	 HVZ.click_taxon("Thing");     // select every Thing again
	 HVZ.toggle_expander("Thing"); // and then expand again
	 expected = "____ every Thing ."; // note four _
         await wait_till_prop__equals__(HVZ.selected_set, 'length', HVZ.all_set.length, 30, 2000);
	 expect(get_nextcommand_str()).to.equal(expected);
	 expect(get_nextcommand_prompt()).
	   to.equal(HVZ.human_term.blank_verb + " every Thing .");
	 expect(HVZ.gclui.taxon_picker.id_is_collapsed["Thing"]).to.equal(false);

	 // nothing graphed so no predicates should be mixed
	 expect($("#predicates .treepicker-indirect-mixed").length,
		"there should be no indirect-mixed predicates when nothing is graphed").
           to.equal(0);
       }));

    it("node selections should affect the english WIP not minimized",
       mochaAsync(async () => {
	 // verify initial state
	 expected = "____ every Thing ."; // note four _
	 expect(get_nextcommand_str()).to.equal(expected);

	 london = HVZ.nodes.get_by('id', 'F')
	 HVZ.run_verb_on_object('unselect', london)
	 expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length - 1);
	 // the object of the nextcommand should reflect the deselectedness of london

	 expect(HVZ.gclui.taxon_picker.id_is_collapsed["Thing"]).to.equal(false);
	 // TODO this tests for fully minimized english
	 // expect(get_nextcommand_str()).to.equal("____ every Thing but not BJ .");
	 expect(get_nextcommand_str()).to.contain("but not F");
	 expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length - 1);

	 // a single class selected should be simple
	 HVZ.toggle_expander("Thing"); // collapse
	 expect(get_nextcommand_str()).to.contain("but not F");
       }));

    it("unselecting a taxon should cause indirect-mixed on its supers",
       mochaAsync(async () => {
	 // Confirm Assumptions about starting conditions
	 expect($("#Place").hasClass("treepicker-indirect-mixed"),
		"Place should not be treepicker-indirect-mixed").
           to.equal(false);
	 expect($("#Settlement").hasClass("treepicker-showing"),
		"Settlement not showing as it initially should").
           to.equal(true);
	 // Perform tests
	 HVZ.click_taxon("Settlement"); // unshow
         let not_settlements = HVZ.all_set.length - HVZ.taxonomy.Settlement.instances.length;
         await wait_till_prop__equals__(HVZ.selected_set, 'length', not_settlements, 30, 2000);
	 expect($("#Settlement").hasClass("treepicker-unshowing"),
		"Settlement not unshowing as it should").
           to.equal(true);
	 expect($("#Place").hasClass("treepicker-indirect-mixed"),
		"Place should be treepicker-indirect-mixed " +
		"when it has unshowing children").
	   to.equal(true);
       }));

    it("reselecting a taxon should remove indirect-mixed from its supers",
       mochaAsync(async () => {
	 // Perform tests
	 HVZ.click_taxon("Settlement"); // unshow
         await wait_till_prop__not_equals__(HVZ.selected_set, 'length', HVZ.all_set.length, 30, 2000);
	 HVZ.click_taxon("Settlement"); // show again
         await wait_till_prop__equals__(HVZ.selected_set, 'length', HVZ.all_set.length, 30, 2000);
	 // confirm back to normal
	 expect($("#Settlement").hasClass("treepicker-showing"),
		"Settlement should be 'showing' again").
           to.equal(true);
	 expect($("#Place").hasClass("treepicker-indirect-mixed"),
		"Place should no longer be treepicker-indirect-mixed " +
		"when everything is selected").
           to.equal(false);
       }));

    it("unselecting a taxon should cause indirect-mixed on up to Thing",
       mochaAsync(async () => {
	 // Confirm Assumptions about starting conditions
	 expect($("#Thing").hasClass("treepicker-indirect-mixed"),
		"Thing should not be 'indirect-showing' not 'indirect-mixed'").
           to.equal(false);
	 expect($("#Person").hasClass("treepicker-showing"),
		"Person should start off 'showing' not 'mixed'").
           to.equal(true);
	 // Perform tests
	 HVZ.click_taxon("Settlement"); // show again
         let not_settlements = HVZ.all_set.length - HVZ.taxonomy.Settlement.instances.length;
         await wait_till_prop__equals__(HVZ.selected_set, 'length', not_settlements, 30, 2000);
	 expect($("#Settlement").hasClass("treepicker-unshowing")).
           to.equal(true, "Settlement not unshowing as it should");
	 expect($("#Thing").hasClass("treepicker-indirect-mixed"),
		"Thing should be treepicker-indirect-mixed " +
		"when it has unshowing children").
           to.equal(true);
       }));

    it("reselecting a taxon should remove indirect-mixed on up to Thing",
       mochaAsync(async () => {
	 // Perform tests
	 HVZ.click_taxon("Settlement"); // unshow
         await wait_till_prop__not_equals__(HVZ.selected_set, 'length', HVZ.all_set.length, 30, 2000);
	 HVZ.click_taxon("Settlement"); // show again
         await wait_till_prop__equals__(HVZ.selected_set, 'length', HVZ.all_set.length, 30, 2000);
	 // confirm back to normal
	 expect($("#Settlement").hasClass("treepicker-showing"),
		"Settlement should be 'showing' again").
           to.equal(true);
	 expect($("#Thing").hasClass("treepicker-indirect-mixed"),
		"Thing should no longer be treepicker-indirect-mixed " +
		"when everything is selected").
           to.equal(false);
       }));

    it("clicking collapsed Thing should toggle selection of all nodes",
       mochaAsync(async () => {
	 HVZ.toggle_expander("Thing");
	 HVZ.click_taxon("Thing");
         await wait_till_prop__equals__(HVZ.selected_set, 'length', 0, 30, 2000);
	 expect(HVZ.selected_set.length).to.equal(0);
         /*
           BUG WORKAROUND
           ==============
           This is a hack to ensure that the coloring of collapsed Thing is correct.

	 HVZ.toggle_expander("Thing");
       	 HVZ.toggle_expander("Thing");

           BUG WORKAROUND END
         */
	 HVZ.click_taxon("Thing");
         await wait_till_prop__equals__(HVZ.selected_set, 'length', HVZ.all_set.length, 30, 2000);
	 expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
      }));

    xit("'choose shelved.' should graph everything (in this dataset)",
       mochaAsync(async () => {
	 HVZ.click_verb("choose").click_set("shelved").doit();
         await wait_till_prop__equals__(HVZ.graphed_set, 'length', HVZ.all_set.length, 30, 2000);
	 expect(HVZ.graphed_set.length).to.not.equal(0);
	 expect(HVZ.graphed_set.length).to.equal(HVZ.nodes.length);
       }));


    it("'unselect graphed.' should dim all node colors ",
       mochaAsync(async () => {
    	 HVZ.toggle_expander("Thing");
	 HVZ.click_verb("choose").click_taxon("Thing");
	 expect(HVZ.graphed_set.length).to.equal(HVZ.nodes.length);
         /*
           BUG WORKAROUND
           ===============
           This section SHOULD NOT BE NEEDED.
           It is here to work around TWO bugs.

           BUG 1
           -----
           The current command is: "Activate ____ ."
           BUT the visibly engaged verb is "Deactivate".

           Clicking "Deactivate" twice rectifies this issue.

           BUG 2
           -----
           Neither the taxon_picker nor the predicate_picker are colored properly
           to show that everything is in the selected_set.

           Clicking "anything" twice rectifies this issue.

         HVZ.click_verb("unchoose"); // this should not be needed
         HVZ.click_verb("unchoose");
         HVZ.click_predicate("anything");
         HVZ.click_predicate("anything");
         await sleep(200);

           BUG WORKAROUND, DONE
         */

         expect(get_nextcommand_str()).to.equal("____ every Thing .");  // expected but not met!
         HVZ.click_set('graphed');
         await sleep(200);
         expect(get_nextcommand_str()).to.equal("____ Graphed .");
         await wait_till_prop__equals__(HVZ.graphed_set, 'length', HVZ.nodes.length, 30, 2000);
	 expect(HVZ.graphed_set.length).to.equal(HVZ.nodes.length);
         halt("about to 'unselect Graphed .'");
	 HVZ.click_verb("unselect").doit();
         await wait_till_prop__equals__(HVZ.selected_set, 'length', 0, 30, 2000);
	 expect(HVZ.selected_set.length).to.equal(0);
       }));

    xit("'shelve graphed.' should remove everything from the graph ",
       mochaAsync(async () => {
	 HVZ.click_verb("choose").click_set("all").doit().click_set("all");
	 HVZ.click_verb("shelve").click_set("graphed").doit();
	 expect(HVZ.graphed_set.length).to.equal(0);
	 expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
       }));

    it("'select shelved.' should select all nodes ",
       mochaAsync(async () => {
	 HVZ.click_verb("unselect").click_set("all").doit().click_set("all");
	 HVZ.click_verb("select").click_set("shelved").doit();
	 expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
       }));

    it("toggling a taxon expander should hide and show its subclassess",
       mochaAsync(async () => {
	 HVZ.toggle_expander("Thing");
	 expect($("#Thing").hasClass("treepicker-collapse")).
	   to.be.ok();
	 expect($("#Thing span.expander:first").text()).
	   to.equal(HVZ.gclui.taxon_picker.expander_str);
	 HVZ.toggle_expander("Thing");
	 expect($("#Thing").hasClass("treepicker-collapse")).
	   to.not.be.ok();
	 expect($("#Thing span.expander:first").text()).
	   to.equal(HVZ.gclui.taxon_picker.collapser_str);
       }));

    it("leaf taxons should not have expanders",
       mochaAsync(async () => {
	 expect($("#Person span.expander:first").length).to.equal(0);
       }));

    it("clicking Person should toggle selection of the Person node",
       mochaAsync(async () => {
         await sleep(200);
         //confirm_continue("about to click Person... Continue?");
	 HVZ.toggle_expander("Thing");
         await sleep(200);
         HVZ.toggle_expander("Thing");
         await sleep(200);
         //confirm_continue("all Things should appear selected in taxon_picker... Continue?");
	 HVZ.click_taxon('Person'); // disengage the peeps
         let not_Person_count = HVZ.all_set.length - HVZ.taxonomy.Person.instances.length;
         await wait_till_prop__equals__(HVZ.selected_set, 'length', not_Person_count, 30, 2000);
         halt();
	 expect(HVZ.selected_set.length).to.equal(not_Person_count);
	 HVZ.toggle_taxon('Person', false); // reengage the peeps
         await wait_till_prop__equals__(HVZ.selected_set, 'length', HVZ.all_set.length, 30, 2000);
	 expect(HVZ.selected_set.length).to.equal(HVZ.all_set.length);
       }));

    it("toggling an expanded taxon should affect only its instances",
       mochaAsync(async () => {
	 expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
	 let num_SpatialThing = HVZ.taxonomy.SpatialThing.instances.length;
	 let num_removed = num_SpatialThing
	 $("#SpatialThing").trigger("click"); // unshow SpatialThing
	 expect(HVZ.selected_set.length).to.equal(
           HVZ.nodes.length - num_removed,
           "Clicking SpatialThing should remove only them (#{num_removed})");
	 $("#SpatialThing").trigger("click"); // show SpatialThing again
	 num_removed -= num_SpatialThing
	 expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
	 let num_Region = HVZ.taxonomy.Region.instances.length
	 num_removed += num_Region
	 $("#Region").trigger("click"); // unshow Regions
         let num_remaining = HVZ.nodes.length - num_removed;
         await wait_till_prop__equals__(HVZ.selected_set, 'length', num_remaining, 30, 2000);
	 expect(HVZ.selected_set.length).to.equal(
           num_remaining,
           "Clicking Region should remove only them (#{num_Region})");
	 let num_Settlement = HVZ.taxonomy.Settlement.instances.length;
	 num_removed += num_Settlement;
         num_remaining = HVZ.nodes.length - num_removed;
	 $("#Settlement").trigger("click"); // unshow Settlements
         await wait_till_prop__equals__(HVZ.selected_set, 'length', num_remaining, 30, 2000);
	 expect(HVZ.selected_set.length).to.equal(
           num_remaining,
           "Clicking Settlement (#{num_Settlement}) should remove them too");
	 $("#SpatialThing").trigger("click");  // unshow SpatialThing
	 num_removed += num_SpatialThing;
         num_remaining = HVZ.nodes.length - num_removed;
         await wait_till_prop__equals__(HVZ.selected_set, 'length', num_remaining, 30, 2000);
	 expect(HVZ.selected_set.length).to.equal(
           num_remaining,
           "Clilcking SpatialThing should now remove them (#{num_SpatialThing}) too");
	 $("#SpatialThing").trigger("click");  // show SpatialThing
	 num_removed -= num_SpatialThing;
         num_remaining = HVZ.nodes.length - num_removed;
         await wait_till_prop__equals__(HVZ.selected_set, 'length', num_remaining, 30, 2000);
	 expect(HVZ.selected_set.length).to.equal(
           num_remaining,
           "Clilcking SpatialThing should now restore them (#{num_SpatialThing})");
	 $("#Region").trigger("click");
	 num_removed -= num_Region
	 $("#Settlement").trigger("click");
	 num_removed -= num_Settlement;
         await wait_till_prop__equals__(HVZ.selected_set, 'length', HVZ.all_set.length, 30, 2000);
	 expect(HVZ.selected_set.length).to.equal(
           HVZ.nodes.length,
           "All nodes should now be restored");
       }));

    it("collapsing a taxon with showing children keeps it showing color",
       mochaAsync(async () => {
	 // Confirm Assumptions
	 expect(HVZ.gclui.taxon_picker.id_is_collapsed["SpatialThing"]).
           to.equal(false, "SpatialThing not expanded");
	 expect(HVZ.gclui.taxon_picker.id_is_collapsed["Region"]).
           to.equal(false, "Region not expanded");
	 expect(HVZ.gclui.taxon_picker.id_is_collapsed["Settlement"]).
           to.equal(false, "Settlement not expanded");
	 expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
	 expect($("#SpatialThing").hasClass("treepicker-mixed")).
           to.equal(false, "collapsed SpatialThing should not be stripey");
	 //expect($("#SpatialThing").hasClass("treepicker-showing")).
	 //       to.equal(true, "collapsed SpatialThing not solid colored");
	 // Perform Test
	 $("#SpatialThing span.expander:first").trigger("click"); // collapse
	 expect($("#SpatialThing").hasClass("treepicker-mixed")).
           to.equal(false, "collapsed SpatialThing appears mixed");
	 expect($("#SpatialThing").attr("style")).
           to.contain("linear-gradient",
                      "collapsed SpatialThing should be stripey");
	 expect($("#SpatialThing").hasClass("treepicker-indirect-mixed"),
		"collapsed SpatialThing appears indirect-mixed").
           to.equal(false);
	 // Cleanup
	 $("#SpatialThing span.expander:first").trigger("click"); // expand
       }));

    it("toggling indirectly mixed taxon collapse should toggle stripeyness",
       mochaAsync(async () => {
	 // Setup
	 $("#Settlement").trigger("click"); // the 2 Settlements are now deselected
	 expect($("#Settlement").hasClass("treepicker-mixed")).to.be.not.ok();
	 expect($("#Settlement").hasClass("treepicker-picked")).to.be.not.ok();
	 expected = HVZ.nodes.length - HVZ.taxonomy.Settlement.instances.length;
         await wait_till_prop__equals__(HVZ.selected_set, 'length', expected, 30, 2000);
	 actual = HVZ.selected_set.length;
	 expect(actual,
  		"expected selected_set.length == nodes - Settlements")
           .to.equal(expected);
	 $("#SpatialThing span.expander:first").trigger("click"); // collapse
	 // Tests
	 expect(HVZ.gclui.taxon_picker.id_is_collapsed["SpatialThing"],
		"SpatialThing not collapsed").to.equal(true);
	 expect($("#SpatialThing").hasClass("treepicker-indirect-mixed"),
		"SpatialThing not stripey").to.be.ok();
	 // Cleanup
	 $("#SpatialThing span.expander:first").trigger("click"); // expand
	 $("#Settlement").trigger("click"); // re-select the 2 Settlements
         await wait_till_prop__equals__(HVZ.selected_set, 'length', HVZ.all_set.length, 30, 2000);
	 expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
	 expect($("#SpatialThing").hasClass("treepicker-indirect-mixed"),
		"SpatialThing is wrongly stripey").to.not.be.ok();
       }));

    it("clicking collapsed taxons with mixed kids should select them all",
       mochaAsync(async () => {
	 branch_id = "Place"
	 branch_sel = "#" + branch_id
	 // Tests
	 HVZ.click_taxon("Settlement");
	 expected = HVZ.nodes.length - HVZ.taxonomy.Settlement.instances.length;
         await wait_till_prop__equals__(HVZ.selected_set, 'length', expected, 30, 2000);
	 actual = HVZ.selected_set.length;
	 expect(actual).to.equal(expected);
	 $(branch_sel + " span.expander:first").trigger("click"); // collapse
	 expect($(branch_sel).hasClass("treepicker-indirect-mixed"),
		`${branch_id} should be stripey`).
           to.be.ok()
	 console.log(`clicking the mixed and collapsed ${branch_id} to select all children`);
	 $(branch_sel).trigger("click"); // make all taxons 'showing'
         await wait_till_prop__equals__(HVZ.selected_set, 'length', HVZ.nodes.length, 30, 2000);
	 expect(HVZ.selected_set.length,
		`clicking ${branch_id} should select all nodes`).
           to.equal(HVZ.nodes.length);
	 $(branch_sel + " span.expander:first").trigger("click"); // expand
       }));

    it("selecting an individual node should update the Selected count",
       mochaAsync(async () => {
	 london = HVZ.nodes.get_by('id', 'F')
	 expect(london, "London was not found").to.be.ok();
	 HVZ.toggle_selected(london);
	 one_less = HVZ.nodes.length - 1;
	 expect(HVZ.selected_set.length,
		"failed to deselect London").
	   to.equal(one_less);
	 expect(get_payload('selected_set'),
  	        "failed to update the picker payload").
           to.equal("" + one_less);
	 HVZ.toggle_selected(london);
	 expect(HVZ.selected_set.length,
		"failed to reselect London").
	   to.equal(HVZ.nodes.length);
	 expect(get_payload("selected_set"),
  	        "failed to update the picker payload").
           to.equal("" + HVZ.nodes.length);
       }));

    it("toggling node selection should toggle indirect-mixed up to Thing",
       mochaAsync(async () => {
	 var toggle_selection_of = function(an_id, classes_above, node_name) {
           console.group(node_name);
           a_node = HVZ.nodes.get_by('id', an_id)
           expect(a_node, node_name + " was not found").to.be.ok();
           expect($("#classes .treepicker-indirect-mixed").length,
		  "there should be no indirect-mixed").to.equal(0);

           HVZ.run_verb_on_object("unselect", a_node)
           expect($("#classes .treepicker-indirect-mixed").length,
		  "there should be " + classes_above + " indirect-mixed").
             to.equal(classes_above);

           one_less = HVZ.nodes.length - 1;
           expect(HVZ.selected_set.length, "failed to deselect " + node_name).
	     to.equal(one_less);
           expect(get_payload('selected_set'),
		  "failed to update the picker payload").
             to.equal("" + one_less);

           HVZ.run_verb_on_object("select", a_node)
           expect($("#classes .treepicker-indirect-mixed").length,
		  "there should be no indirect-mixed once " +
		  node_name + " reselected").
             to.equal(0);
           expect(HVZ.selected_set.length, "failed to reselect " + node_name).
             to.equal(HVZ.nodes.length);
           expect(get_payload('selected_set'),
		  "failed to update the picker payload").
             to.equal("" + HVZ.nodes.length);
           console.groupEnd();
	 };
	 toggle_selection_of("F", 1, "London");
	 toggle_selection_of("BW", 1, "Thames");
	 toggle_selection_of("B", 4, "England");
       }));

    it("'choose every Thing' should leave all taxa colored 'showing'",
       mochaAsync(async () => {
	 // confirm initial conditions
	 expect(get_nextcommand_str()).to.equal("____ every Thing .");

	 // do "choose every Thing ."
	 //$("#verb-choose").trigger("click");
	 HVZ.click_verb('choose');
	 //expect(get_nextcommand_str()).to.equal("choose every Thing .");
	 //$("#doit_button").trigger("click");

	 // confirm the resultant display
	 expect($("#classes .treepicker-unshowing").length,
		"after 'choose every Thing' no taxon should be " +
		"marked unshowing, ie look unselected").
           to.equal(0);

	 // restore ungraphed state by doing "unchoose every Thing ."
	 //$("#verb-unchoose").trigger("click");
	 HVZ.click_verb('unchoose');
	 //expect(get_nextcommand_str()).to.equal("unchoose every Thing .");
	 //$("#doit_button").trigger("click");
	 expect($("#classes .treepicker-unshowing").length,
		"after 'unchoose every Thing' no taxon should be " +
		"marked unshowing, ie look unselected").
           to.equal(0);
       }));

    it("instance-less mid-tree taxons should behave properly");

  });



  describe("operations on predicates", function() {

    it("everything should start shelved and un-graphed",
       mochaAsync(async () => {
	 expect(HVZ.graphed_set.length).to.equal(0);
	 expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
	 expect(get_nextcommand_str()).
	   to.equal("____ every Thing .");
	 var taxon_name = "Thing";
	 expect($("#classes .treepicker-indirect-mixed").length,
		"there should be no indirect-mixed once " +
		taxon_name + " reselected").
           to.equal(0);

	 expect($("#predicates .treepicker-indirect-mixed").length,
		"there should be no indirect-mixed predicates when nothing is graphed").
           to.equal(0);
       }));

    it("with nothing graphed, clicking collapsed anything should graph all",
       mochaAsync(async () => {
	 HVZ.toggle_expander("anything").click_predicate("anything");
         await wait_till_prop__equals__(HVZ.graphed_set, 'length', HVZ.nodes.length, 30, 33000);
	 // confirm that everything is graphed
	 expect(HVZ.graphed_set.length,
		"after clicking collapsed 'anything' everything should be graphed").
           to.equal(HVZ.nodes.length);
	 expect(HVZ.shelved_set.length).to.equal(0);
       }));

    it("with All graphed, clicking collapsed anything should ungraph all",
       mochaAsync(async () => {
         blurt('⬤ at outset');
         expect(HVZ.graphed_set.length).to.equal(0)
         expect(HVZ.selected_set.length).to.equal(HVZ.all_set.length)

         blurt('⬤ collapsed anything');
	 HVZ.toggle_expander("anything"); // collapse

         window.STOP_THE_WORLD = true
	 //HVZ.click_verb('choose'); // graph everything so we can test whether ungraphing works
         await sleep(5000);
         blurt('⬤ clicked anything');
         HVZ.click_predicate('anything');

         await wait_till_prop__equals__(HVZ.graphed_set, 'length', HVZ.nodes.length, 30, 3000);
         blurt('⬤ awaited graphed == nodes');

	 expect(HVZ.graphed_set.length,
		"after 'choose every Thing' everything should be graphed").
           to.equal(HVZ.nodes.length);
	 expect(HVZ.shelved_set.length).to.equal(0);
         //halt('choose just got clicked and graphed == all AND shelved == 0');
         //halt('the collapsed edge picker should be fully colored and read 104/104');
	 HVZ.click_predicate("anything"); // clicking collapsed anything should ungraph everything
         await wait_till_prop__equals__(HVZ.graphed_set, 'length', 0, 30, 3000);
         blurt('⬤ awaited graphed == 0');

	 // confirm that everything is now ungraphed
	 expect(HVZ.graphed_set.length,
		"after clicking collapsed 'anything' everything should be ungraphed").
           to.equal(0);
	 expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
       }));

    it("when no taxa are selected only the predicate anything should be visible",
       mochaAsync(async () => {
	 HVZ.toggle_expander("Thing");  // collapse Thing
	 HVZ.click_taxon("Thing");  // unselect every Thing
	 // make the unselectedness of every Thing visible (not important, just handy)
	 HVZ.toggle_expander("Thing");  // expand Thing, just for visibility
         await wait_till_prop__equals__(HVZ.selected_set, 'length', 0, 30, 3000);
	 expect(HVZ.selected_set.length, "nothing should be selected").to.equal(0);

	 // confirm that 'anything' is the only visible predicate
	 // TODO figure out how to test for 'anything' being the only visible predicate
	 expect($("#predicates.treepicker-indirect-mixed").length,
		"there should be no indirect-mixed predicates when nothing is graphed").
           to.equal(0);
	 expect($("#predicates.treepicker-indirect-showing").length,
		"there should be no indirect-showing predicates when nothing is graphed").
           to.equal(0);
	 expect($("#predicates.treepicker-indirect-unshowing").length,
		"there should be no indirect-unshowing predicates when nothing is graphed").
           to.equal(0);
	 expect($("#predicates.treepicker-indirect-empty").length,
		"there should be no indirect-mixed predicates when nothing is graphed").
           to.equal(0);
       }));

    it("collapsed picker nodes should summarize their kids' colors",
       mochaAsync(async () => {
	 var verify_gradient_when_collapsed = function(id, has_gradient) {
           var sel = "#" + id;
           expect($(sel).attr("style")).to.not.be.ok();
           HVZ.toggle_expander(id);
           if (has_gradient) {
             expect($(sel).attr("style"),
                    `${id} has kids so should summarize their colors and not be white`).
               to.contain("linear-gradient");
           } else {
             // should never get here because there should be no expander to click
             expect($(sel).attr("style"), `${id} has no kids so should not be stripey`).
               to.not.be.ok();
           }
           HVZ.toggle_expander(id);
	 };
	 verify_gradient_when_collapsed('anything', true); // has kids, ie descendants with colors
	 verify_gradient_when_collapsed('SpatialThing', true); // has kids
	 verify_gradient_when_collapsed('Thing', true); // has kids
	 verify_gradient_when_collapsed('hasWealthConnectionToRegion', true); // has kids
       }));

    it("predicates' payload should summarize their children when collapsed WIP movedConnectionToRegion next-to-leaf-nodes not summarizing correctly",
       mochaAsync(async () => {
	 var expect_predicate_payload = function(pred_id, collapsed, expanded) {
           // check collapsed payload
           var sel = "#"+ pred_id;
           HVZ.toggle_expander(pred_id); // collapse
           //$(sel + " span.expander:first").trigger("click"); // collapse
           expect(get_payload(pred_id), `${sel} collapsed payload wrong`).
             to.equal(collapsed);
           // check expanded payload
           HVZ.toggle_expander(pred_id); // expand
           expect(get_payload(pred_id), `${sel} expanded payload wrong`).
             to.equal(expanded);
	 }
	 expect_predicate_payload("anything", "0/49", "0/0"); // empty
	 expect_predicate_payload("moved", "0/5", "0/0"); // empty
	 expect_predicate_payload("movedConnectionToRegion", "0/3", "0/0"); // 1
       }));

    it("toggling a predicate should toggle indirect-mixed on its supers",
       mochaAsync(async () => {
	 // Confirm assumption that there are no indirect-mixed initially
	 expect($("#predicates .treepicker-indirect-mixed").length,
		"there should be no indirect-mixed predicates when nothing is graphed").
           to.equal(0);

	 a_leaf_predicate_sel = "#hasWealthConnectionToSettlement";

	 window.breakpoint = true;
	 jsoutline.squelch = true;
	 jsoutline.collapsed = false;
	 // graph some leaf predicate
	 $(a_leaf_predicate_sel).trigger("click");
	 expect(HVZ.graphed_set.length,
		"something should be graphed after selecting a leaf predicate").
           to.not.equal(0);

	 var num_parent = 4;
	 // confirm that there are now indirect-mixed
	 expect($("#predicates .treepicker-indirect-mixed").length,
		"all " + num_parent + " parents of " + a_leaf_predicate_sel +
		" should be indirect-mixed when it is picked").
	   to.equal(num_parent);
	 window.breakpoint = false;
	 jsoutline.squelch = true;
       }));

    it("non-empty predicates should not have payload '0/0' after kid click",
       mochaAsync(async () => {
	 HVZ.toggle_expander("Thing");  // collapse Thing
	 $("#Thing").trigger("click"); // unselect every Thing
	 $("#Thing").trigger("click"); // select every Thing
	 HVZ.toggle_expander("Thing");  // collapse Thing

	 HVZ.click_predicate("hasWealthConnectionToSettlement");  // select a leaf
	 expect(get_payload("hasWealthConnectionToRegion"),
		"a leaf's parent should not be 0/0 if it is non-empty").
           to.not.equal("0/0");
       }));

    it("empty predicates should be white when expanded");
    it("relationships should behave properly when collapsed and toggled");
  });

  describe("command life-cycle", function() {
    it("engaging Verb then Set should execute then disengage Set",
       mochaAsync(async () => {
	 expect(get_nextcommand_str()).to.equal("____ every Thing .");
	 HVZ.toggle_taxon('Thing',false);
	 expect(get_nextcommand_str()).to.equal("____ ____ .");
	 expect(!HVZ.gclui.chosen_set_id,
		"expect no set to be chosen at outset").
	   to.equal(true);
	 expect(HVZ.gclui.is_verb_phrase_empty(),
		"expect no verb to be engaged").
	   to.equal(true);
	 HVZ.click_verb("label").click_set("all").doit();
	 expect(get_nextcommand_str()).
	   to.equal("Label ____ .");
	 expect(HVZ.gclui.engaged_verbs[0]).to.equal('label');
	 expect(!HVZ.gclui.chosen_set_id,
		"expect set to be disengaged after immediate execution").
	   to.equal(true);
       }));

    it("engaging Verb then Class should execute then disengage Class",
       mochaAsync(async () => {
	 HVZ.toggle_taxon('Thing',false);
	 expect(get_nextcommand_str()).to.equal("____ ____ .");
	 expect(!HVZ.gclui.chosen_set_id,
		"expect no set to be chosen at outset").
	   to.equal(true);
	 expect(!HVZ.gclui.chosen_set_id,
		"expect no set to be chosen at outset").
	   to.equal(true);
	 expect(HVZ.gclui.is_verb_phrase_empty(),
		"expect no verb to be engaged").
	   to.equal(true);
	 HVZ.click_verb("label").click_taxon("Thing").doit();
	 expect(get_nextcommand_str()).
	   to.equal("Label ____ .");
	 expect(HVZ.gclui.engaged_verbs[0]).to.equal('label');
	 expect(!HVZ.gclui.chosen_set_id,
		"expect set to be disengaged after immediate execution").
	   to.equal(true);
       }));

    it("engaging Set then Verb should execute then disengage Verb",
       mochaAsync(async () => {
	 HVZ.toggle_taxon('Thing',false);
	 expect(get_nextcommand_str()).to.equal("____ ____ .");
	 HVZ.click_set("shelved").click_verb("label").doit();
	 console.log("MT?",HVZ.gclui.is_verb_phrase_empty());
	 expect(HVZ.gclui.is_verb_phrase_empty(),
		"expect verb to be disengaged after immediate execution").
	   to.equal(true);
	 expect(get_nextcommand_str()).
	   to.equal("____ Shelved .");
       }));

    it("engaging Class then Verb should execute then disengage Verb",
       mochaAsync(async () => {
	 HVZ.toggle_taxon('Thing',false);
	 expect(get_nextcommand_str()).to.equal("____ ____ .");
	 HVZ.click_taxon("Region").click_verb("label").doit();
	 expect(HVZ.gclui.is_verb_phrase_empty(),
		"expect verb to be disengaged after immediate execution").
	   to.equal(true);
	 expect(get_nextcommand_str()).to.equal("____ Region .");
	 //expect(false, "test not really working...").to.be.ok();
       }));

    it("retrieving should only affect nodes which are discarded.",
       mochaAsync(async () => {
	 HVZ.toggle_taxon('Thing',false);
	 expect(get_nextcommand_str()).to.equal("____ ____ .");
	 HVZ.click_verb('label');
	 HVZ.like_string("church").doit(); // ie "Anglican Church" and "Roman Catholic Church"
	 expect(get_nextcommand_str()).to.equal("Label All like 'church' .");
	 HVZ.gclui.disengage_command();
	 expect(get_nextcommand_str()).to.equal("____ ____ .");

	 HVZ.click_verb('hide');
	 HVZ.like_string("anglican").doit();
	 expect(get_nextcommand_str()).to.equal("Hide All like 'anglican' .");
	 HVZ.gclui.disengage_command();
	 expect(get_nextcommand_str()).to.equal("____ ____ .");

	 HVZ.click_verb('discard');
	 HVZ.like_string("roman catholic church").doit();
	 expect(get_nextcommand_str()).to.equal("Discard All like 'roman catholic church' .");
	 HVZ.gclui.disengage_command();
	 expect(get_nextcommand_str()).to.equal("____ ____ .");

	 HVZ.click_verb('undiscard');
	 HVZ.like_string("church").doit();
	 expect(get_nextcommand_str()).to.equal("Retrieve All like 'church' .");
	 HVZ.gclui.disengage_command();
	 expect(get_nextcommand_str()).to.equal("____ ____ .");

	 expect(HVZ.hidden_set.length,
		"hidden undiscarded things should not be affected by undiscard").
           to.equal(2);
       }));

    xit("previously hidden nodes should not be colored 'selected' when release backed to the shelf WIP it looks right but the test shows failure -- timing?",
       mochaAsync(async () => {
	 HVZ.toggle_taxon('Thing',false);
	 expect(get_nextcommand_str()).to.equal("____ ____ .");
	 HVZ.click_verb("hide").click_set("Region").doit();
	 HVZ.click_verb("choose").click_set("Person").doit();
	 HVZ.click_verb("unchoose").click_set("Person").doit();
	 HVZ.click_verb("unchoose");
	 expect(HVZ.selected_set.length).to.equal(0);
	 var node;
	 for (var idx = 0; idx < HVZ.taxonomy['Region'].instances.length; idx++) {
	   node = HVZ.taxonomy['Region'].instances[idx];
	   expect(node, "node should exist").to.be.ok();
	   expect(node.color,
		  "should have the 'unshowing' color for Region, a " +
		  "light red WEIRD the color looks right but the rgb " +
		  "value is wrong").
	     to.equal('rgb(246, 228, 228)');
	 }
	 expect("the_color_of_the_region_nodes").to.equal('something');
        }));

    xit("'spinner' icon should show when a command is executing");
    xit("clicking a set when another is engaged should engage the clicked one");
  });

  describe("settings", function() {
     var zoom = function(node) {
      for (var i = 0; i < node.name.length * 3; i++) {
	var before = node.name;
	HVZ.scroll_label(node);
	var after = node.pretty_name;
	console.log("------------");
	console.log(before);
	console.log(after);
      }
    };

    var scroll_test = function(node) {
      var limit = HVZ.truncate_labels_to;
      var short_name_no_scroll = limit >= node.name.length;
      var zero_limit = limit == 0;
      var prev = node.name;
      var repeats_after = prev.length + HVZ.scroll_spacer.length;
      for (var i = 0; i < node.name.length * 2; i++) {
	var before_cdr;
	var before = node.pretty_name;
	console.log("-------------------------------------",i)
	console.log("before -------",before);
	HVZ.scroll_pretty_name(node);
	var after = node.pretty_name;
	console.log("after -------- ",after);
	if (zero_limit) {
	  expect(after,"no scrolling needed if limit is 0").to.equal(before);
	} else {
	  if (short_name_no_scroll) {
	    expect(after,
		   "'" + node.name + "' is shorter than "+
		   limit+" no need to scroll: '" + after + "'").
	      to.equal(node.name);
	  } else {
	    expect(after.length,
		   "[" + after+ "] " +
		   "the scrolled length should equal the limit").
	      to.equal(limit);

	    if (i % repeats_after != 0) {
	      expect(after,
		     "scrolling and truncating to " + limit +
		     " expected by step " + i).
		to.not.equal(before);
	      before_cdr = before.substr(1, before.length);
	      console.log("before_cdr --- ",before_cdr);
	      expect(after.startsWith(before_cdr),
		     "the scrolled value [" + after +
		     "] should start with the prev value, " +
		     "less the first character [" +
		     before_cdr + "] on step: " + i ).
		to.equal(true);
	    }
	  }
	}
	prev = after;
      }
    };

    it("labels shouldn't scroll if the limit is set to 0",
       mochaAsync(async () => {
	 HVZ.all_set.sort_on('lid');
	 HVZ.change_setting_to_from('truncate_labels_to', 0, 40);
	 var hunsdon = HVZ.all_set.get_by('lid','I');   // name >> 10
	 var thames = HVZ.all_set.get_by('lid','BW');   // name < 10
	 console.log("Is that you, hunsdon?",hunsdon.name);
         scroll_test(hunsdon);
	 console.log("Is that you, thames? ",thames.name);
         scroll_test(thames);
       }));

    it("labels shouldn't scroll if they're shorter (or equal to) the limit",
       mochaAsync(async () => {
	 HVZ.all_set.sort_on('lid');
	 var bill = HVZ.all_set.get_by('lid','shakwi'); // name = 20
	 var thames = HVZ.all_set.get_by('lid','BW');   // name < 10
	 var bill_name_len = bill.name.length;
	 HVZ.change_setting_to_from('truncate_labels_to', bill_name_len, 40);
	 scroll_test(bill);
	 console.log("Is that you, thames? ",thames.name);
         scroll_test(thames);
       }));

    it("labels should scroll if they're longer than the limit",
       mochaAsync(async () => {
	 HVZ.all_set.sort_on('lid');
	 var bill = HVZ.all_set.get_by('lid','shakwi'); // name = 20
	 var thames = HVZ.all_set.get_by('lid','BW');   // name < 20
	 var hunsdon = HVZ.all_set.get_by('lid','I');   // name >> 20
	 var bill_name_len = bill.name.length;
	 HVZ.change_setting_to_from('truncate_labels_to', bill_name_len, 40);

	 console.log("------------------------------");
	 console.log("Is that you, bill?   ", bill.name);
	 console.log("Is that you, hunsdon?", hunsdon.name);
	 console.log("------------------------------");
         scroll_test(bill);
         scroll_test(hunsdon);
	 console.log("------------------------------");

       }));

  });

  describe("operations on verbs", function() {});

  describe("operations on set_picker", function() {});

});
