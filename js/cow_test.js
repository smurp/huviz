var expect = chai.expect;

describe("Cow", function() {
  describe("cowstructor", function() {
    it("should have a default name", function() {
      var cow = new Cow();
      expect(cow.name).to.equal("Anon cow");
    });

    it("should set cow's name if provided", function() {
      var cow = new Cow("Kate");
      expect(cow.name).to.equal("Kate");
    });
  });

  describe("#greets", function() {
    it("should throw if no target is passed in", function() {
      expect(function() {
        (new Cow()).greets();
      }).to.throw(Error);
    });

    it("should greet passed target", function() {
      var greetings = (new Cow("Kate")).greets("Baby");
      expect(greetings).to.equal("Kate greets Baby");
    });
  });
});


describe("Trivial", function() {
  describe("constructor", function() {
    it("addition should work", function() {
      expect(1 + 1).to.equal(2);
    });

    it("string addition should work", function() {
      expect("trout" + "mask").to.equal("troutmask");
    });
  });
});

