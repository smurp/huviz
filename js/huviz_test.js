var expect = chai.expect;

describe("HuViz Tests", function() {
  this.timeout(0);
  huviz = require('huviz');
  number_of_nodes = 15;

  before(function bootHuviz() {
    window.HVZ = new huviz.Orlando();
    window.HVZ.set_ontology("/data/OrlandoOntology-SexesUnderPerson.ttl");
    document.addEventListener('dataset-loaded', function(e) {
      console.log("dataset-loaded",arguments);
      HVZ.choose_everything();
    }, false);
    window.HVZ.boot_sequence();
  })

  describe("constructor", function() {
    it("initially everything should be shelved and nothing graphed", function(done) {
      expect(HVZ.graphed_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(HVZ.nodes.length);
      done();
    });

    it("'choose Thing.' should result in non-zero graphed_set.length ", function(done) {
      HVZ.do({"verbs": ["choose"], "sets": [HVZ.shelved_set]});
      expect(HVZ.graphed_set.length).to.not.equal(0);
      expect(HVZ.graphed_set.length).to.equal(number_of_nodes);
      done();
    });

    it("'unselect Thing.' should dim all node colors ", function(done) {
      HVZ.do({"verbs": ["unselect"], "sets": [HVZ.graphed_set]});
      expect(HVZ.selected_set.length).to.equal(0);
      done();
    });

    it("'shelve Thing.' should remove everything from the graph ", function(done) {
      HVZ.do({"verbs": ["shelve"], "sets": [HVZ.graphed_set]});
      expect(HVZ.graphed_set.length).to.equal(0);
      expect(HVZ.shelved_set.length).to.equal(number_of_nodes);
      done();
    });

  });
});

