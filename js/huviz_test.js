var expect = chai.expect;

var pause_msec = 2;
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

  before(function bootHuviz(done) {
    window.HVZ = new huviz.Orlando();
    window.HVZ.set_ontology("/data/OrlandoOntology-SexesUnderPerson.ttl");
    document.addEventListener('dataset-loaded', function(e) {
      console.log("dataset-loaded",arguments);
      done();
    }, false);
    window.HVZ.boot_sequence();
  })

  describe("basic operations", function() {
    it("initially everything should be shelved and nothing graphed", function(done) {
      say("initial.",done);
      expect(HVZ.graphed_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
    });

    it("'choose shelved.' should result in non-zero graphed_set.length ", function(done) {
      say("choose shelved.",done);
      HVZ.do({"verbs": ["choose"], "sets": [HVZ.shelved_set]});
      expect(HVZ.graphed_set.length).to.not.equal(0);
      expect(HVZ.graphed_set.length).to.equal(number_of_nodes);
    });

    it("'unselect Thing.' should dim all node colors ", function(done) {
      say("unselect Thing.",done);
      HVZ.do({"verbs": ["unselect"], "sets": [HVZ.graphed_set]});
      expect(HVZ.selected_set.length).to.equal(0);
    });

    it("'shelve Thing.' should remove everything from the graph ", function(done) {
      say("shelve graphed.",done);
      HVZ.do({"verbs": ["shelve"], "sets": [HVZ.graphed_set]});
      expect(HVZ.graphed_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(number_of_nodes);
    });

    it("choose_everything() should graph all nodes", function(done) {
      say("choose_everything()",done);
      HVZ.choose_everything();
      expect(HVZ.graphed_set.length).to.equal(number_of_nodes);
    });

    /*
    it("reset_graph() should blank everything", function(done) {
      say("reset_graph()",done);
      HVZ.reset_graph();
      expect(HVZ.graphed_set.length).to.equal(0);
    });
    */
  });
});

