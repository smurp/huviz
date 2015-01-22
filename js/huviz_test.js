var expect = chai.expect;

// It would be great if this code could be written in coffeescript.
// This might offer clues:
//   http://rzrsharp.net/2012/08/01/client-side-testing-insanity.html
// though this is likely irrelevant.

var pause_msec = 3;
var say = function(msg, done) {
  console.log("STARTING",msg);
  //alert(msg);
  setTimeout(function(){
    console.log("FINISHING",msg);
    done();
  }, pause_msec);
};

describe("HuViz Tests", function() {
  this.timeout(0);
  huviz = require('huviz');
  var number_of_nodes = 15;
  var test_title;

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
    });


    it("unselecting a taxon should cause indirect-mixed on its supers", function(done) {
      say(test_title, done);
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
             "Settlement should not be selected").
	  to.equal(true);
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
      branch_id = "Region"
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

    it("instance-less mid-tree taxons should behave properly", function(done) {
      say(test_title, done);
      expect('this').to.be.true();
    });

    it("selecting an individual node should update the Selected count", function(done) {
      say(test_title, done);
      expect('this').to.be.true();
    });

    it("'choose Thing' should leave all taxa colored 'showing'", function(done) {
      say(test_title, done);
      expect('this').to.be.true();
    });

  });

  describe("operations on predicates", function() {
    it("initially everything should be shelved and nothing graphed", function(done) {
      say(test_title, done);
      expect(HVZ.graphed_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
      expect($("#Thing").hasClass("treepicker-indirect-mixed"), 
             "Thing should not be treepicker-indirect-mixed").
            to.equal(false);
    });
  });
});
