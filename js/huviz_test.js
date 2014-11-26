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
      expect($("#Thing div.container:first").attr("style")).to.equal("display:none");
      expect($("#Thing span.expander:first").text()).to.equal(HVZ.gclui.taxon_picker.expander_str);
      $("#Thing span.expander:first").trigger("click");
      expect($("#Thing div.container:first").attr("style")).to.equal("");
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

    it("Collapsing a taxon with mixed children should color it stripey", function(done) {
      say(test_title, done);
      expect(HVZ.gclui.taxon_picker.id_is_collapsed["Thing"]).to.not.be.ok();
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
      $("#Settlement").trigger("click"); // 2 Settlements
      expect($("#Settlement").hasClass("treepicker-mixed")).to.be.not.ok();
      expect($("#Settlement").hasClass("treepicker-picked")).to.be.not.ok();
      expect(HVZ.selected_set.length).to.equal(number_of_nodes - 2);
      $("#Thing span.expander:first").trigger("click"); // collapse
      expect($("#Thing").hasClass("treepicker-mixed")).to.be.ok(); // actual expectation
      //
      //expect(HVZ.gclui.taxon_picker.id_is_collapsed["Thing"]).to.be.ok();
      //$("#Thing").hasClass("both_show_and_unshown"); // rename to mixed?
      //$("#Thing").trigger("click"); 
      //expect(HVZ.selected_set.length).to.equal(number_of_nodes);
      //$("#Thing span.expander:first").trigger("click");
    });

    /*
    it("Clicking Thing while collapsed should toggle selection of all nodes", function(done) {
      say(test_title, done);
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
      $("#Thing span.expander:first").trigger("click");
      $("#Thing").trigger("click");
      expect(HVZ.selected_set.length).to.equal(0);
      $("#Thing").trigger("click");
      expect(HVZ.selected_set.length).to.equal(number_of_nodes);
      $("#Thing span.expander:first").trigger("click");
    });
    */

    /*
      Tests to perform (aka bugs to fix!)
      ===================================
      Selecting an individual node should update the set_picker Selected count
      Clicking taxons should always update their colors
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
