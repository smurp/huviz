"use strict";

var chai = require("chai");
var expect = chai.expect;

var MultiString = require('../js/multistring').MultiString;
var SortedSet = require('../js/sortedset').SortedSet;

var as_labels = function(acc, obj) {
  //console.error("acc:",acc,"obj:",obj);
  if (typeof(acc) != 'string') {
    //acc = acc.label.toString();
    acc = '' + acc.label;
  }
  var retval = acc + ';' + obj.label;
  //console.log("as_labels(acc:",acc,'obj:', ''+obj, ") ==>", retval);
  return ''+retval;
};

global.window = {SORTLOG: false}
console.groupCollapsed = function(){}
console.groupEnd = function(){}
describe("MultiString and SortedSet work together", function() {
  var window = {SORTLOG: false}
  it("sortedset._cmp behaves the same as sortedset._cmp_instrumented", function() {
    var pets = SortedSet().sort_on('label');
    MultiString.set_langpath('fr:NOLANG');
    var dog = {label: new MultiString('dog', 'en',
                                      'chein', 'fr',
                                      'Hund', 'de')};
    var cat = {label: new MultiString('chat', 'fr',
                                      'Katzen', 'de',
                                      'Felis catus')};
    var mouse = {label: (new MultiString('mouse', 'en',
                                         'souris', 'fr',
                                         'Maus', 'de'))};
    pets.case_insensitive_sort(false);
    expect(pets._cmp(cat, dog)).to.eql(pets._cmp_instrumented(cat, dog))
    MultiString.set_langpath('de:NOLANG');
    expect(pets._cmp(cat, dog)).to.eql(pets._cmp_instrumented(cat, dog))
    expect(pets._cmp(dog, cat)).to.eql(pets._cmp_instrumented(dog, cat))
    MultiString.set_langpath('en:NOLANG');
    expect(pets._cmp(cat, dog)).to.eql(pets._cmp_instrumented(cat, dog))
    pets.case_insensitive_sort(true);
    expect(pets._cmp(cat, dog)).to.eql(pets._cmp_instrumented(cat, dog))
    expect(pets._cmp(cat, mouse)).to.eql(pets._cmp_instrumented(cat, mouse))
  })
  it("changing langpath changes sort order", function() {
    var pets = SortedSet().sort_on('label');
    pets.add({label: (new MultiString('dog', 'en',
                                      'chein', 'fr',
                                      'Hund', 'de'))});
    pets.add({label: (new MultiString('cat', 'en',
                                      'chat', 'fr',
                                      'Katze', 'de'))});
    pets.add({label: (new MultiString('mouse', 'en',
                                      'souris', 'fr',
                                      'Maus', 'de'))});
    MultiString.set_langpath('fr');
    pets.resort();
    expect(pets.reduce(as_labels)).to.eql('chat;chein;souris');
    MultiString.set_langpath('de:fr:en');
    pets.resort();
    expect(pets.reduce(as_labels)).to.eql('Hund;Katze;Maus');
    MultiString.set_langpath('en:NOLANG');
    pets.resort();
    expect(pets.reduce(as_labels)).to.eql('cat;dog;mouse');
    pets.add({label: new MultiString('Horse')});
    pets.add({label: new MultiString('horse')});
    pets.resort();
    //expect(pets._cmp({label:'A'},{label:'a'})).to.equal(1);
    expect(pets.case_insensitive).to.eql(false)
    expect(pets.reduce(as_labels)).to.eql(
      'Horse;cat;dog;horse;mouse',
      'not doing UNSQUASHED sort properly');
    pets.case_insensitive_sort(true);
    expect(pets.reduce(as_labels)).to.eql(
      'cat;dog;Horse;horse;mouse',
      "not doing SQUASHED sort properly WARNING order of Horse|horse is indeterminate");
  });

  it("does not fail the way the real world data did", function(){
    var folks = SortedSet().sort_on('label').case_insensitive_sort(true);
    MultiString.set_langpath('en:NOLANG');
    folks.add({label: new MultiString('English','en','Anglais','fr')});
    console.error(''+folks.reduce(as_labels))
    // NOTE THAT Array.reduce does not call as_labels if Array.length == 1
    expect(''+folks.reduce(as_labels).label).to.eql("English","weird?");
    folks.add({label: new MultiString('Colin Faulkner','en')});
    expect(folks.reduce(as_labels)).to.eql("Colin Faulkner;English","freaks?");
    folks.add({label: new MultiString('Fred Mars','en')});
    MultiString.set_langpath('en:ANY:NOLANG');
    folks.resort();
    //console.log("REDUCTION:",folks.reduce(as_labels));
    //console.log("CAR:",folks[0].toString());
    expect(folks.reduce(as_labels)).to.eql("Colin Faulkner;English;Fred Mars","uh, what's up?");
  });


  it("nodes have their position nudged upon name name change", function() {
    var pets = SortedSet().sort_on('label');
    pets.case_insensitive_sort(true);
    MultiString.set_langpath('en:ANY:NOLANG');
    var dog = {label: new MultiString('dog', 'en')};
    var horse = {label: new MultiString('chevale', 'fr')};
    pets.add(dog);
    pets.add(horse);
    expect(pets.reduce(as_labels)).to.eql("chevale;dog","fr > en");
    horse.label.set_val_lang('horse','en');
    //pets.nudge(horse) // TODO make something like this work!
    expect(pets.reduce(as_labels)).to.eql(
      "dog;horse",
      "changing a node's name does not change its sort position");
  });

});
