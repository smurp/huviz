var expect = chai.expect;

// It would be great if this code could be written in coffeescript.
// This might offer clues:
//   http://rzrsharp.net/2012/08/01/client-side-testing-insanity.html
// though this is likely irrelevant.

//  This looks like a great post, should check for good ideas:
//  http://www.redotheweb.com/2013/01/15/functional-testing-for-nodejs-using-mocha-and-zombie-js.html

var pause_msec = 3;
var say = function(msg, done) {
  console.log("STARTING",msg);
  //alert(msg);
  setTimeout(function(){
    console.log("FINISHING",msg);
    done();
  }, pause_msec);
};

window.huviz = require('huviz');
var setup_jsoutline = function() {
  console.group("jsoutline setup");
  window.treepicker = require('treepicker');
  window.coloredtreepicker = require('coloredtreepicker');
  window.taxon = require('taxon');
  window.gclui = require('gclui');
  jsoutline.traceAll(huviz.Orlando, true, ["tick","draw_circle","calc_node_radius","should_show_label","show_the_edges","draw_edge_labels","should_show_label","draw_nodes_in_set","draw_discards","draw_edge_labels","should_show_label","draw_discards","find_focused_node_or_edge","adjust_cursor","blank_screen","update_snippet","clear_canvas","draw_dropzones","show_last_mouse_pos","auto_change_verb","show_node_links","get_charge","hide_state_msg","show_state_msg","draw_labels","draw_nodes","apply_fisheye","draw_shelf","position_nodes","draw_edges","recolor_node","uri_to_js_id", "default_graph_controls", "mousemove"]);
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

var get_command_english = function() {
  return $(".nextcommand > span:first").text();
};
describe("HuViz Tests", function() {
  this.timeout(0);
  this.bail(true); // tell mocha to stop on first failure
  var number_of_nodes = 15;
  var test_title;

  function halt(because) {
    because = because || "halting intentionally";
    expect(undefined, because).to.be.ok();
  }

  // http://stackoverflow.com/questions/23947688/how-to-access-describe-and-it-messages-in-mocha
  before(function bootHuviz(done) {
    console.groupCollapsed("test suite setup");
    window.HVZ = new huviz.Orlando();
    HVZ.set_ontology("/data/OrlandoOntology-SexesUnderPerson.ttl");
    document.addEventListener('dataset-loaded', function(e) {
      console.log("dataset-loaded",arguments);
      done();
    }, false);
    HVZ.boot_sequence();
    HVZ.goto_tab(2);
    //$('.file_picker:first').val("/data/ballrm.nq").change(); // no Places
    //$('.file_picker:first').val("/data/abdyma.nq").change(); // one embryo
    $('.file_picker:first').val("/data/shakwi.nq").change(); // hence simplest
    console.groupEnd();
  });

  beforeEach(function() {
    test_title = this.currentTest.title;
    //console.clear();
    console.groupCollapsed(test_title);
  });

  afterEach(function() {
    console.groupEnd();
  });

  describe("graph controls", function() {
    it("the default controls should exist and have the right values", function(done) {
      say(test_title, done);
      expect($("input[name='label_em']")).to.exist();
      expect($("input[name='label_em']").attr('value')).to.equal('0.9');
    });
  });


  describe("operations on classes", function() {
    it("initially everything should be shelved and nothing graphed", function(done) {
      say(test_title, done);
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

    it("toggling a leaf predicate should leave the root predicate unmixed", function(done) {
      say(test_title, done);

      a_leaf_predicate_sel = "#connectionWithAddress";
      $(a_leaf_predicate_sel).trigger("click");  // graph some leaf predicates
      expect(HVZ.graphed_set.length,
             "something should be graphed after selecting a leaf predicate").
            to.not.equal(0);
      $(a_leaf_predicate_sel).trigger("click");  // ungraph them again

      expect(HVZ.graphed_set.length, 
             "nothing should be graphed after toggling a leaf predicate").
            to.equal(0);

      expect($("#predicates .treepicker-indirect-mixed").length,
             "there should be no indirect-mixed predicates when nothing is graphed").
            to.equal(0);

    });

    it("toggling a branch predicate should leave the root predicate unmixed", function(done) {
      say(test_title, done);
      a_branch_predicate_sel = "#connectionWithRegion";
      a_branch_predicate_sel = "#connectionWithSettlement";
      $(a_branch_predicate_sel).trigger("click");  // graph some branch predicates
      expect(HVZ.graphed_set.length,
             "something should be graphed after selecting a branch predicate").
            to.not.equal(0);
      $(a_branch_predicate_sel).trigger("click");  // ungraph them again

      expect(HVZ.graphed_set.length,
             "nothing should be graphed after toggling branch " + 
             a_branch_predicate_sel).to.equal(0);

      expect($("#predicates .treepicker-indirect-mixed").length,
             "there should be no indirect-mixed predicates when nothing is graphed").
            to.equal(0);
    });

    it("the current selection should show in the nextcommand box", function(done) {
      say(test_title, done);
      // verify initial state
      expect(HVZ.graphed_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
      expected = "____ every Thing ."; // note four _
      expect(get_command_english()).to.equal(expected);

      // deselect everything using the taxon_picker
      $("#Thing span.expander:first").trigger("click"); // collapse
      $("#Thing").trigger("click");
      expect(HVZ.selected_set.length).to.equal(0);
      // confirm that the object of the commands is blank
      expect(get_command_english()).to.equal("____ ____ .");
      expect(HVZ.selected_set.length).to.equal(0);

      // a single class selected should be simple
      $("#Thing span.expander:first").trigger("click"); // collapse
      $("#Person").trigger("click");    
      expect(get_command_english()).to.equal("____ Person .");
      
      // expand everything again
      $("#Thing span.expander:first").trigger("click"); // collapse so we can...
      $("#Thing").trigger("click");  // select every Thing again
      $("#Thing span.expander:first").trigger("click"); // and then expand again
      expected = "____ every Thing ."; // note four _
      expect(get_command_english()).to.equal(expected);
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["Thing"]).to.equal(false);

      // nothing graphed so no predicates should be mixed
      expect($("#predicates .treepicker-indirect-mixed").length,
             "there should be no indirect-mixed predicates when nothing is graphed").
            to.equal(0);
    });

    it("node selections should affect the english WIP not minimized", function(done) {
      say(test_title, done);
      // verify initial state
      expect(HVZ.graphed_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
      expected = "____ every Thing ."; // note four _
      expect(get_command_english()).to.equal(expected);

      london = HVZ.nodes.get_by('id', 'BJ')
      HVZ.toggle_selected(london);
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length - 1);
      // the object of the nextcommand should reflect the deselectedness of london

      expect(HVZ.gclui.taxon_picker.id_is_collapsed["Thing"]).to.equal(false);
      // TODO this tests for fully minimized english
      // expect(get_command_english()).to.equal("____ every Thing but not BJ .");
      expect(get_command_english()).to.contain("but not BJ");
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length - 1);

      // a single class selected should be simple
      $("#Thing span.expander:first").trigger("click"); // collapse
      //$("#Thing").trigger("click");
      expect(get_command_english()).to.contain("but not BJ");
      
      // expand everything again
      $("#Thing span.expander:first").trigger("click"); // collapse so we can...
      $("#Thing").trigger("click");  // selecte every Thing again
      $("#Thing span.expander:first").trigger("click"); // and then expand again
    });

    it("unselecting a taxon should cause indirect-mixed on its supers", function(done) {
      say(test_title, done);
      HVZ.pick_taxon("Thing", true);
      HVZ.gclui.taxon_picker.expand_by_id('Thing');

      // Confirm Assumptions about starting conditions
      expect($("#Place").hasClass("treepicker-indirect-mixed")).
            to.equal(false, "Place should not be treepicker-indirect-mixed");
      expect($("#Settlement").hasClass("treepicker-showing")).
            to.equal(true, "Settlement not showing as it initially should");
      // Perform tests
      $("#Settlement").trigger("click"); // unshow
      expect($("#Settlement").hasClass("treepicker-unshowing")).
            to.equal(true, "Settlement not unshowing as it should");
      expect($("#Place").hasClass("treepicker-indirect-mixed")).
            to.equal(true, "Place should be treepicker-indirect-mixed when it has unshowing children");
    });

    it("reselecting a taxon should remove indirect-mixed from its supers", function(done) {
      say(test_title, done);
      // Confirm Assumptions about starting conditions
      expect($("#Place").hasClass("treepicker-indirect-mixed"), 
             "Place should be treepicker-indirect-mixed").
            to.equal(true);
      expect($("#Settlement").hasClass("treepicker-unshowing"), 
             "Settlement should be un-selected").
	  to.equal(true);
      expect($("#Settlement").hasClass("treepicker-showing"), 
             "Settlement should not be selected").
	  to.equal(false);
      // Perform tests
      $("#Settlement").trigger("click"); // show again
      // confirm back to normal
      expect($("#Settlement").hasClass("treepicker-showing"),
             "Settlement should be 'showing' again").
            to.equal(true);
      expect($("#Place").hasClass("treepicker-indirect-mixed"), 
             "Place should no longer be treepicker-indirect-mixed when everything is selected").
            to.equal(false);
    });

    it("unselecting a taxon should cause indirect-mixed on up to Thing", function(done) {
      say(test_title, done);
      // Confirm Assumptions about starting conditions
      expect($("#Thing").hasClass("treepicker-indirect-mixed"), 
             "Thing should not be 'indirect-showing' not 'indirect-mixed'").
            to.equal(false);
      expect($("#Person").hasClass("treepicker-showing"),
             "Person should start off 'showing' not 'mixed'").
            to.equal(true);
      // Perform tests
      $("#Settlement").trigger("click"); // unshow
      expect($("#Settlement").hasClass("treepicker-unshowing")).
            to.equal(true, "Settlement not unshowing as it should");
      expect($("#Thing").hasClass("treepicker-indirect-mixed"), 
             "Thing should be treepicker-indirect-mixed when it has unshowing children").
            to.equal(true);
    });



    it("reselecting a taxon should remove indirect-mixed on up to Thing", function(done) {
      say(test_title, done);
      // Confirm Assumptions about starting conditions
      expect($("#Thing").hasClass("treepicker-indirect-mixed"), 
             "Thing should be treepicker-indirect-mixed").
            to.equal(true);
      expect($("#Settlement").hasClass("treepicker-unshowing"), 
             "Settlement should not be selected").
	  to.equal(true);
      // Perform tests
      $("#Settlement").trigger("click"); // show again
      // confirm back to normal
      expect($("#Settlement").hasClass("treepicker-showing"),
             "Settlement should be 'showing' again").
            to.equal(true);
      expect($("#Thing").hasClass("treepicker-indirect-mixed"), 
             "Thing should no longer be treepicker-indirect-mixed when everything is selected").
            to.equal(false);
    });


    it("clicking collapsed Thing should toggle selection of all nodes", function(done) {
      say(test_title, done);
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
      $("#Thing span.expander:first").trigger("click");
      $("#Thing").trigger("click");
      expect(HVZ.selected_set.length).to.equal(0);
      $("#Thing").trigger("click");
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
      $("#Thing span.expander:first").trigger("click");
    });

    it("'choose shelved.' should result in non-zero graphed_set.length ", function(done) {
      say(test_title, done);
      HVZ.do({"verbs": ["choose"], "sets": [HVZ.shelved_set]});
      expect(HVZ.graphed_set.length).to.not.equal(0);
      expect(HVZ.graphed_set.length).to.equal(HVZ.nodes.length);
    });

    it("'unselect graphed.' should dim all node colors ", function(done) {
      say(test_title, done);
      HVZ.do({"verbs": ["unselect"], "sets": [HVZ.graphed_set]});
      expect(HVZ.selected_set.length).to.equal(0);
    });

    it("'shelve graphed.' should remove everything from the graph ", function(done) {
      say(test_title, done);
      expect(HVZ.graphed_set.length).to.equal(HVZ.nodes.length);
      //$("#verb-shelve").trigger("click");
      //$("#graphed_set").trigger("click");
      //$("#doit_button").trigger("click");
      HVZ.do({"verbs": ["shelve"], "sets": [HVZ.graphed_set]});
      expect(HVZ.graphed_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
    });

    it("'select shelved.' should select all nodes ", function(done) {
      say(test_title, done);
      expect(HVZ.selected_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
      //$("#shelved_set").trigger("click");
      //$("#verb-select").trigger("click");
      //$("#doit_button").trigger("click");
      HVZ.do({"verbs": ["select"], "sets": [HVZ.shelved_set]});
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
    });

    it("toggling a taxon expander should hide and show its subclassess", function(done) {
      say(test_title, done);
      $("#Thing span.expander:first").trigger("click");
      expect($("#Thing").hasClass("treepicker-collapse")).to.be.ok();
      expect($("#Thing span.expander:first").text()).to.equal(HVZ.gclui.taxon_picker.expander_str);
      $("#Thing span.expander:first").trigger("click");
      expect($("#Thing").hasClass("treepicker-collapse")).to.not.be.ok();
      expect($("#Thing span.expander:first").text()).to.equal(HVZ.gclui.taxon_picker.collapser_str);
    });

    it("leaf taxons should not have expanders", function(done) {
      say(test_title, done);
      expect($("#Person span.expander:first").length).to.equal(0);
    });

    it("clicking Person should toggle selection of the Person node", function(done) {
      say(test_title, done);
      HVZ.pick_taxon('Person',false);
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length - 1);
      HVZ.pick_taxon('Person',false);
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
    });

    it("toggling an expanded taxon should affect only its instances", function(done) {
      say(test_title, done);
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
      num_GeographicArea = HVZ.taxonomy.GeographicArea.instances.length
      num_removed = num_GeographicArea
      $("#GeographicArea").trigger("click"); // unshow GeographicArea
      expect(HVZ.selected_set.length).to.equal(
          HVZ.nodes.length - num_removed,
          "Clicking GeographicArea should remove only them (#{num_removed})");
      $("#GeographicArea").trigger("click"); // show GeographicArea again
      num_removed -= num_GeographicArea
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
      num_Region = HVZ.taxonomy.Region.instances.length
      num_removed += num_Region
      $("#Region").trigger("click"); // unshow Regions
      expect(HVZ.selected_set.length).to.equal(
          HVZ.nodes.length - num_removed,
          "Clicking Region should remove only them (#{num_Region})");
      num_Settlement = HVZ.taxonomy.Settlement.instances.length
      num_removed += num_Settlement
      $("#Settlement").trigger("click"); // unshow Settlements
      expect(HVZ.selected_set.length).to.equal(
          HVZ.nodes.length - num_removed,
          "Clicking Settlement (#{num_Settlement}) should remove them too");
      $("#GeographicArea").trigger("click");  // unshow GeographicArea
      num_removed += num_GeographicArea
      expect(HVZ.selected_set.length).to.equal(
          HVZ.nodes.length - num_removed,
          "Clilcking GeographicArea should now remove them (#{num_GeographicArea}) too");
      $("#GeographicArea").trigger("click");  // show GeographicArea
      num_removed -= num_GeographicArea
      expect(HVZ.selected_set.length).to.equal(
          HVZ.nodes.length - num_removed,
          "Clilcking GeographicArea should now restore them (#{num_GeographicArea})");
      $("#Region").trigger("click");
      num_removed -= num_Region
      $("#Settlement").trigger("click");
      num_removed -= num_Settlement
      expect(HVZ.selected_set.length).to.equal(
          HVZ.nodes.length,
          "All nodes should now be restored");
    });

    it("collapsing a taxon with showing children keeps it showing color", function(done) {
      say(test_title, done);
      // Confirm Assumptions
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["GeographicArea"]).
            to.equal(false, "GeographicArea not expanded");
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["Region"]).
            to.equal(false, "Region not expanded");
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["Settlement"]).
            to.equal(false, "Settlement not expanded");
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
      expect($("#GeographicArea").hasClass("treepicker-mixed")).
            to.equal(false, "collapsed GeographicArea should not be stripey");
      expect($("#GeographicArea").hasClass("treepicker-showing")).
            to.equal(true, "collapsed GeographicArea not solid colored");
      // Perform Test
      $("#GeographicArea span.expander:first").trigger("click"); // collapse
      expect($("#GeographicArea").hasClass("treepicker-mixed")).
            to.equal(false, "collapsed GeographicArea appears mixed");
      expect($("#GeographicArea").attr("style")).
            to.not.contain("linear-gradient", 
                           "collapsed GeographicArea is wrongly stripey");
      expect($("#GeographicArea").hasClass("treepicker-indirect-mixed"), 
             "collapsed GeographicArea appears indirect-mixed").
            to.equal(false);
      // Cleanup
      $("#GeographicArea span.expander:first").trigger("click"); // expand
    });

    it("toggling indirectly mixed taxon collapse should toggle stripeyness", function(done) {
      say(test_title, done);
      // Confirm Assumptions
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["Thing"]).to.not.be.ok();
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);

      // Setup
      $("#Settlement").trigger("click"); // the 2 Settlements are now deselected
      expect($("#Settlement").hasClass("treepicker-mixed")).to.be.not.ok();
      expect($("#Settlement").hasClass("treepicker-picked")).to.be.not.ok();
      actual = HVZ.selected_set.length
      expected = HVZ.nodes.length - HVZ.taxonomy.Settlement.instances.length
      expect(actual,
  	     "expected selected_set.length == nodes - Settlements")
            .to.equal(expected);
      $("#GeographicArea span.expander:first").trigger("click"); // collapse
      // Tests
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["GeographicArea"], 
             "GeographicArea not collapsed").to.equal(true);
      expect($("#GeographicArea").hasClass("treepicker-indirect-mixed"),
             "GeographicArea not stripey").to.be.ok();
      // Cleanup
      $("#GeographicArea span.expander:first").trigger("click"); // expand
      $("#Settlement").trigger("click"); // re-select the 2 Settlements
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
      expect($("#GeographicArea").hasClass("treepicker-indirect-mixed"),
             "GeographicArea is wrongly stripey").to.not.be.ok();
    });

    it("clicking collapsed taxons with mixed kids should select them all", function(done) {
      say(test_title, done);
      branch_id = "Place"
      branch_sel = "#" + branch_id
      // Confirm Assumption
      //     that Region is expanded with all children selected
      expect($(branch_sel).hasClass("treepicker-mixed"),
             "failed assumption that Region is initially not mixed").
            to.equal(false);
      expect($(branch_sel + " div.container:first").
              hasClass("treepicker-collapsed"), 
             "failed assumption that " + branch_id + " starts expanded").
            to.equal(false);
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
      // Tests
      $("#Settlement").trigger("click"); // the Settlements are now deselected
      actual = HVZ.selected_set.length;
      expected = HVZ.nodes.length - HVZ.taxonomy.Settlement.instances.length;
      expect(actual).to.equal(expected);
      console.log("clicking expanded " + branch_id + " to collapse it");
      $(branch_sel + " span.expander:first").trigger("click"); // collapse
      expect($(branch_sel).hasClass("treepicker-indirect-mixed"), 
             branch_id + " should be stripey").
            to.be.ok()
      console.log("clicking the mixed and collapsed " + branch_id + " to select all children");
      $(branch_sel).trigger("click"); // make all taxons 'showing'
      expect(HVZ.selected_set.length, 
             "clicking " + branch_id + " should select all nodes").
            to.equal(HVZ.nodes.length);
      $(branch_sel + " span.expander:first").trigger("click"); // expand
    });

    it("selecting an individual node should update the Selected count", function(done) {
      say(test_title, done);
      london = HVZ.nodes.get_by('id', 'BJ')
      expect(london, "London was not found").to.be.ok();
      HVZ.toggle_selected(london);
      one_less = HVZ.nodes.length - 1;
      expect(HVZ.selected_set.length, "failed to deselect London").
	  to.equal(one_less);
      expect($('#selected_set .payload').text(),
  	     "failed to update the picker payload").
            to.equal("" + one_less);
      HVZ.toggle_selected(london);
      expect(HVZ.selected_set.length, "failed to reselect London").
	  to.equal(HVZ.nodes.length);
      expect($('#selected_set .payload').text(),
  	     "failed to update the picker payload").
            to.equal("" + HVZ.nodes.length);
    });

    it("toggling node selection should toggle indirect-mixed up to Thing", function(done) {
      say(test_title, done);
      
      var toggle_selection_of = function(an_id, classes_above, node_name) {
        console.group(node_name);
        a_node = HVZ.nodes.get_by('id', an_id)
        expect(a_node, node_name + " was not found").to.be.ok();
        expect($("#classes .treepicker-indirect-mixed").length,
               "there should be no indirect-mixed").to.equal(0);

        //HVZ.toggle_selected(a_node);
        HVZ.perform_current_command(a_node);
        expect($("#classes .treepicker-indirect-mixed").length,
               "there should be " + classes_above + " indirect-mixed").
              to.equal(classes_above);

        one_less = HVZ.nodes.length - 1;
        expect(HVZ.selected_set.length, "failed to deselect " + node_name).
	    to.equal(one_less);
        expect($('#selected_set .payload').text(),
               "failed to update the picker payload").
              to.equal("" + one_less);

        //HVZ.toggle_selected(a_node);
        HVZ.perform_current_command(a_node);
        expect($("#classes .treepicker-indirect-mixed").length,
               "there should be no indirect-mixed once " + 
               node_name + " reselected").
              to.equal(0);
        expect(HVZ.selected_set.length, "failed to reselect " + node_name).
              to.equal(HVZ.nodes.length);
        expect($('#selected_set .payload').text(),
               "failed to update the picker payload").
              to.equal("" + HVZ.nodes.length);
        console.groupEnd();
      };
      toggle_selection_of("BJ", 5, "London");
      toggle_selection_of("I", 4, "Thames"); 
      toggle_selection_of("B", 3, "England");
    });

    it("instance-less mid-tree taxons should behave properly");

    it("'choose Thing' should leave all taxa colored 'showing'");

  });



  describe("operations on predicates", function() {

    it("everything should start shelved and un-graphed", function(done) {
      say(test_title, done);
      window.breakpoint = true;
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
    });

    it("with nothing graphed, clicking collapsed anything should graph all", function(done) {
      say(test_title, done);
      // confirm assumption that nothing is graphed and everything selected
      expect(HVZ.graphed_set.length).to.equal(0);
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);

      // click collapsed 'anything' predicate
      $("#anything span.expander:first").trigger("click"); // collapse
      $("#anything").trigger("click");

      // confirm that everything is graphed
      expect(HVZ.graphed_set.length, 
             "after clicking collapsed 'anything' everything should be graphed").
            to.equal(HVZ.nodes.length);
      expect(HVZ.shelved_set.length).to.equal(0);
      //      halt();
    });

    it("with everything graphed, clicking collapsed anything should ungraph all", function(done) {
      say(test_title, done);
      // confirm assumptions
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);

      // click collapsed 'anything' predicate when everything is selected
      $("#anything").trigger("click");
      
      // confirm that everything is now ungraphed
      expect(HVZ.graphed_set.length, 
             "after clicking collapsed 'anything' everything should be ungraphed").
            to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);

      // expand 'anything'
      $("#anything span.expander:first").trigger("click");
    });

    it("when no taxa are selected only the predicate anything should be visible", function(done) {
      say(test_title, done);
      // confirm assumptions
      expect(HVZ.selected_set.length).to.equal(HVZ.nodes.length);
      
      // unselect all Taxa
      $("#Thing span.expander:first").trigger("click"); // collapse Thing
      $("#Thing").trigger("click"); // select every Thing
      // make the unselectedness of every Thing visible (not important, just handy)
      $("#Thing span.expander:first").trigger("click"); // expand Thing
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

      //halt("figure out how to test for 'anything' actually being visible");

      $("#Thing span.expander:first").trigger("click"); // collapse Thing
      $("#Thing").trigger("click"); // select every Thing
      $("#Thing span.expander:first").trigger("click"); // expand Thing
    });


    it("empty predicates should be white");

    it("empty predicates with all kids unselected should be unselected too");

    it("toggling a predicate should toggle indirect-mixed on its supers", function(done) {
      say(test_title, done);
      //halt(); 

      // Confirm assumption that there are no indirect-mixed initially
      expect($("#predicates .treepicker-indirect-mixed").length,
             "there should be no indirect-mixed predicates when nothing is graphed").
            to.equal(0);

      a_leaf_predicate_sel = "#connectionWithAddress";

      // graph some leaf predicate
      $(a_leaf_predicate_sel).trigger("click");  
      expect(HVZ.graphed_set.length,
             "something should be graphed after selecting a leaf predicate").
            to.not.equal(0);
      
      var num_parent = 6;
      // confirm that there are now indirect-mixed
      expect($("#predicates .treepicker-indirect-mixed").length,
             "all " + num_parent + " parents of " + a_leaf_predicate_sel +
             " should be indirect-mixed when it is picked").
	    to.equal(num_parent);

      // clean up
      $(a_leaf_predicate_sel).trigger("click");  // ungraph them again
      expect(HVZ.graphed_set.length, 
             "nothing should be graphed after toggling a leaf predicate").
            to.equal(0);
      expect($("#predicates .treepicker-indirect-mixed").length,
             "there should be no indirect-mixed predicates when nothing is graphed").
            to.equal(0);
    });

  });


  describe("operations on verbs", function() {});


});
