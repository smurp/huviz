(function() {
  var Canine, Carnivore, Feline, Mammal, Primate, Rodent,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Mammal = (function() {
    function Mammal() {}

    Mammal.prototype.birth = function() {
      return "live";
    };

    Mammal.prototype.look = function() {
      return "sideways";
    };

    Mammal.prototype.mammaries = true;

    Mammal.prototype.fur = true;

    Mammal.prototype.blood = "warm";

    Mammal.prototype.eats = function() {
      return "plants";
    };

    return Mammal;

  })();

  Primate = (function(_super) {
    __extends(Primate, _super);

    function Primate() {
      return Primate.__super__.constructor.apply(this, arguments);
    }

    Primate.prototype.speak = function() {
      return "ooh ooh";
    };

    Primate.prototype.eats = function() {
      return "everything";
    };

    return Primate;

  })(Mammal);

  Rodent = (function(_super) {
    __extends(Rodent, _super);

    function Rodent() {
      return Rodent.__super__.constructor.apply(this, arguments);
    }

    Rodent.prototype.speak = function() {
      return "squeak";
    };

    Rodent.prototype.eats = function() {
      return "cheese";
    };

    return Rodent;

  })(Mammal);

  Carnivore = (function(_super) {
    __extends(Carnivore, _super);

    function Carnivore() {
      return Carnivore.__super__.constructor.apply(this, arguments);
    }

    Carnivore.prototype.eats = function() {
      return "meat";
    };

    Carnivore.prototype.look = function() {
      return "forward";
    };

    return Carnivore;

  })(Mammal);

  Feline = (function(_super) {
    __extends(Feline, _super);

    function Feline() {
      return Feline.__super__.constructor.apply(this, arguments);
    }

    Feline.prototype.speak = function() {
      return "meow";
    };

    Feline.prototype.pounce = function() {};

    Feline.prototype.stalk = function() {};

    return Feline;

  })(Carnivore);

  Canine = (function(_super) {
    __extends(Canine, _super);

    function Canine() {
      return Canine.__super__.constructor.apply(this, arguments);
    }

    Canine.prototype.speak = function() {
      return "woof";
    };

    Canine.prototype.wag_tail = function() {};

    return Canine;

  })(Carnivore);

  (typeof exports !== "undefined" && exports !== null ? exports : this).Canine = Canine;

  (typeof exports !== "undefined" && exports !== null ? exports : this).Feline = Feline;

  (typeof exports !== "undefined" && exports !== null ? exports : this).Mammal = Mammal;

  (typeof exports !== "undefined" && exports !== null ? exports : this).Primate = Primate;

  (typeof exports !== "undefined" && exports !== null ? exports : this).Carnivore = Carnivore;

}).call(this);
