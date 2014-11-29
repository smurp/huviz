var expect = chai.expect;

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

  before(function bootHuviz(done) {
    window.HVZ = new huviz.Orlando();
    HVZ.set_ontology("/data/OrlandoOntology-SexesUnderPerson.ttl");
    document.addEventListener('dataset-loaded', function(e) {
      console.log("dataset-loaded",arguments);
      done();
    }, false);
    HVZ.boot_sequence();
    HVZ.goto_tab(2);
  });

  beforeEach(function() {
    test_title = this.currentTest.title;
  });

  describe("operations on classes", function() {
    it("initially everything should be shelved and nothing graphed", function(done) {
      say(test_title, done);
      expect(HVZ.graphed_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
    });

    it("'choose shelved.' should result in non-zero graphed_set.length ", function(done) {
      say(test_title, done);
      HVZ.do({"verbs": ["choose"], "sets": [HVZ.shelved_set]});
      expect(HVZ.graphed_set.length).to.not.equal(0);
      expect(HVZ.graphed_set.length).to.equal(number_of_nodes);
    });

    it("'unselect graphed.' should dim all node colors ", function(done) {
      say(test_title, done);
      HVZ.do({"verbs": ["unselect"], "sets": [HVZ.graphed_set]});
      expect(HVZ.selected_set.length).to.equal(0);
    });

    it("'shelve graphed.' should remove everything from the graph ", function(done) {
      say(test_title, done);
      expect(HVZ.graphed_set.length).to.equal(number_of_nodes);
      //$("#verb-shelve").trigger("click");
      //$("#graphed_set").trigger("click");
      //$("#doit_button").trigger("click");
      HVZ.do({"verbs": ["shelve"], "sets": [HVZ.graphed_set]});
      expect(HVZ.graphed_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(number_of_nodes);
    });

    it("'select shelved.' should select all nodes ", function(done) {
      say(test_title, done);
      expect(HVZ.selected_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(number_of_nodes);
      //$("#shelved_set").trigger("click");
      //$("#verb-select").trigger("click");
      //$("#doit_button").trigger("click");
      HVZ.do({"verbs": ["select"], "sets": [HVZ.shelved_set]});
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
    });

    it("Toggling a taxon expander should hide and show its subclassess", function(done) {
      say(test_title, done);
      $("#Thing span.expander:first").trigger("click");
      expect($("#Thing div.container:first").hasClass("treepicker-collapsed")).to.be.ok();
      expect($("#Thing span.expander:first").text()).to.equal(HVZ.gclui.taxon_picker.expander_str);
      $("#Thing span.expander:first").trigger("click");
      expect($("#Thing div.container:first").hasClass("treepicker-collapsed")).to.not.be.ok();
      expect($("#Thing span.expander:first").text()).to.equal(HVZ.gclui.taxon_picker.collapser_str);
    });

    it("Leaf taxons should not have expanders", function(done) {
      say(test_title, done);
      expect($("#Person span.expander:first").length).to.equal(0);
    });

    it("Clicking Person should toggle selection of the Person node", function(done) {
      say(test_title, done);
      HVZ.pick_taxon('Person');
      expect(HVZ.selected_set.length).to.equal(number_of_nodes - 1);
      HVZ.pick_taxon('Person');
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
    });

    it("Toggling an expanded taxon should affect only its instances", function(done) {
      say(test_title, done);
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
      $("#GeographicArea").trigger("click"); // 1 GeographicArea
      expect(HVZ.selected_set.length).to.equal(number_of_nodes - 1);
      $("#GeographicArea").trigger("click");
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
      $("#Region").trigger("click"); // 2 Regions
      expect(HVZ.selected_set.length).to.equal(number_of_nodes - 2);
      $("#Settlement").trigger("click"); // 2 Settlements
      expect(HVZ.selected_set.length).to.equal(number_of_nodes - 4);
      $("#GeographicArea").trigger("click");
      expect(HVZ.selected_set.length).to.equal(number_of_nodes - 5);
      $("#GeographicArea").trigger("click");
      expect(HVZ.selected_set.length).to.equal(number_of_nodes - 4);
      $("#Region").trigger("click");
      $("#Settlement").trigger("click");
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
    });

    it("Collapsing a taxon with showing children keeps it showing color", function(done) {
      say(test_title, done);
      // Confirm Assumptions
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["GeographicArea"]).to.equal(false, "GeographicArea not expanded");
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["Region"]).to.equal(false, "Region not expanded");
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["Settlement"]).to.equal(false, "Settlement not expanded");
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
      expect($("#GeographicArea").hasClass("treepicker-mixed")).to.equal(false, "collapsed GeographicArea should not be stripey");
      expect($("#GeographicArea").hasClass("treepicker-showing")).to.equal(true, "collapsed GeographicArea not solid colored");
      // Perform Test
      $("#GeographicArea span.expander:first").trigger("click"); // collapse
      expect($("#GeographicArea").hasClass("treepicker-mixed")).to.equal(false, "collapsed GeographicArea appears mixed");
      expect($("#GeographicArea").attr("style")).to.not.contain("linear-gradient", "collapsed GeographicArea is stripey");
      expect($("#GeographicArea").hasClass("treepicker-indirect-mixed")).to.equal(false, "collapsed GeographicArea appears indirect-mixed");
      // Cleanup
      $("#GeographicArea span.expander:first").trigger("click"); // expand
    });


    it("Toggling indirectly mixed taxon collapse should toggle stripeyness", function(done) {
      say(test_title, done);
      // Confirm Assumptions
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["Thing"]).to.not.be.ok();
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
      // Setup
      $("#Settlement").trigger("click"); // the 2 Settlements are now deselected
      expect($("#Settlement").hasClass("treepicker-mixed")).to.be.not.ok();
      expect($("#Settlement").hasClass("treepicker-picked")).to.be.not.ok();
      expect(HVZ.selected_set.length).to.equal(number_of_nodes - 2);
      $("#Thing span.expander:first").trigger("click"); // collapse
      // Tests
      expect($("#Thing").attr("style")).to.contain("linear-gradient", "Thing not stripey");
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["Thing"]).to.equal(true, "Thing not collapsed");
      // Cleanup
      $("#Thing span.expander:first").trigger("click"); // expand
      $("#Settlement").trigger("click"); // re-select the 2 Settlements
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
      expect($("#Thing").attr("style")).to.not.contain("linear-gradient", "Thing should not still be stripey");
    });


    it("Clicking a collapsed taxon with mixed children should select all children", function(done) {
      say(test_title, done);
      // Assumptions
      expect($("#Thing").hasClass("treepicker-mixed")).to.be.ok(); // actual expectation
      expect($("#Thing div.container:first").hasClass("treepicker-collapsed")).to.be.ok(); // collapse
      // OK, we've established that Thing is collapsed and has mixed children
      $("#Thing").trigger("click"); 
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
    });

    /*
    it("Instance-less mid-tree taxons should behave properly", function(done) {
      say(test_title, done);
      expect("to be written").to.not.be.ok();
    });

    it("Selecting an individual node should update the Selected count", function(done) {
      say(test_title, done);
      expect("to be written").to.not.be.ok();
    });

    it("Clicking Thing while collapsed should toggle selection of all nodes", function(done) {
      say(test_title, done);
      expect("to be written").to.not.be.ok();
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
      $("#Thing span.expander:first").trigger("click");
      $("#Thing").trigger("click");
      expect(HVZ.selected_set.length).to.equal(0);
      $("#Thing").trigger("click");
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
      $("#Thing span.expander:first").trigger("click");
    });

    */
  });
});
/*
describe("More Tests", function() {
  describe("advanced operations", function() {
    it("what a lark", function() {
      expect(0).to.equal(0);
    });
  });
});
*/
