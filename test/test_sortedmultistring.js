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
var get_random_element = function(array) {
  var idx = Math.trunc(Math.random()*array.length);
  return array[idx];
}
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
    //console.error(''+folks.reduce(as_labels))
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

  it("nodes can be removed from start, end and middle", function() {
    var pets = SortedSet().sort_on('label');
    var unicorn = {label: 'unicorn'};
    var dog = {label: 'dog'};
    var horse = {label: 'horse'};

    pets.add(unicorn);
    pets.add(horse);
    pets.add(dog);
    expect(pets.reduce(as_labels)).to.eql("dog;horse;unicorn");
    pets.remove(dog);
    expect(pets.length).to.eql(2);
    expect(pets.reduce(as_labels)).to.eql("horse;unicorn");
    pets.add(dog);
    pets.remove(horse);
    expect(pets.length).to.eql(2);
    expect(pets.reduce(as_labels)).to.eql("dog;unicorn");
    pets.add(horse);
    pets.remove(unicorn);
    expect(pets.length).to.eql(2);
    expect(pets.reduce(as_labels)).to.eql("dog;horse");
  });

  it("changing a node's name changes its sort position with .alter(n,cb)", function() {
    var pets = SortedSet().sort_on('label');
    pets.case_insensitive_sort(true);
    MultiString.set_langpath('en:ANY:NOLANG');
    var dog = {label: new MultiString('dog', 'en')};
    var horse = {label: new MultiString('chevale', 'fr')};
    pets.add(dog);
    pets.add(horse);
    expect(pets.reduce(as_labels)).to.eql("chevale;dog","fr > en");
    pets.alter(horse, function() {
      horse.label.set_val_lang('horse','en');
    });  // .add() is not just for adding anymore, its for nudging
    //pets.nudge(horse) // TODO make something like this work!
    //expect(pets.validate_sort_at(0, true)).to.eql(true, "horse position not valid")
    expect(pets.reduce(as_labels)).to.eql(
      "dog;horse",
      "changing a node's name does not change its sort position");
  });
  it("random insertion and removal of MultiStrings", function() {
    MultiString.set_langpath('en:ANY:NOLANG');
    var rand = SortedSet().sort_on('name');
    rand.case_insensitive_sort(true);
    var all = [];
    for (var i=0; i < 1000; i++) {
      var id =  Math.random().toString(36).substr(2,10);
      var enLabel =  Math.random().toString(36).substr(2,10);
      var frLabel =  Math.random().toString(36).substr(2,10);
      var nolangLabel = Math.random().toString(36).substr(2,10);
      all.push(id);
      var ms = new MultiString(nolangLabel);
      ms.set_val_lang(frLabel, 'fr');
      ms.set_val_lang(enLabel, 'en');
      rand.add({lid: id, name: ms});
      if (i % 3 == 0) { // one out of X insertions, do a removal
        var randIdx = Math.round(Math.random() * all.length);
        var rmId = all.pop(randIdx);
        var dud = rand.remove(rmId);
        //console.log('randIdx:',randIdx, 'rmId:',rmId, 'dud:',dud);
      }
    }
    console.log('langpath:en INITIAL');
    rand.dump();

    console.log('langpath:fr');
    MultiString.set_langpath('fr:ANY:NOLANG');
    rand.resort();
    rand.dump();

    console.log('langpath:en');
    MultiString.set_langpath('en:ANY:NOLANG');
    rand.resort();
    rand.dump();
  });
  it("random name arrival of MultiStrings", function() {
    MultiString.set_langpath('en:ANY:NOLANG');
    var languages = ['en', 'fr', 'de', null];
    var all = SortedSet().sort_on('id').named('all');
    var embryo = SortedSet().sort_on('id').named('embryo').isFlag();
    var shelved = SortedSet().sort_on('name').case_insensitive_sort(true).sub_of(all).isState();
    var node, randLang, randName, randTask, randType;
    var ids = [];
    var types = ['Pig', 'Dog', 'Horse'];
    var tasks = 'new name name hatch'.split(' '); // ie things get on average two names and things generally hatch
    for (var i=0; i < 100; i++) {
      randTask = get_random_element(tasks);
      randType = get_random_element(types);
      randLang = languages[Math.round(Math.random()*3)];
      randName = Math.random().toString(36).substr(2,10);
      console.log(randTask,i);
      if (randTask == 'name') {
        // add a new name to an existing node
        node = get_random_element(shelved);
        if (!node) {
          break;
        }
        if (node.name) {
          node.name.set_val_lang(randName, randLang);
        } else {
          node.name = new MultiString(randName, randLang);
        }
      } else if (randTask == 'new') {
        // add a new node
        const id = Math.random().toString(36).substr(2,10);
        node = {
          id: id,
          lid: id,
          name: new MultiString(randName, randLang)
        };
        ids.push(node.id);
        all.add(node);
        embryo.add(node);
      } else if (randTask == 'hatch') {
        node = get_random_element(embryo);
        if (node) {
          shelved.acquire(node);
          shelved.resort();
        }
      } else {
        throw new Error('there should be a randTask');
      }
    }
    console.log('langpath:en INITIAL');
    //all.dump();

    console.log({all: all.length, embryo: embryo.length, shelved: shelved.length});
    
    console.log('langpath:fr');
    MultiString.set_langpath('fr:ANY:NOLANG');
    shelved.resort();
    console.log(shelved.name_call());
    shelved.dump();

    console.log('langpath:en');
    MultiString.set_langpath('en:ANY:NOLANG');
    shelved.resort();
    console.log(shelved.name_call());
    shelved.dump();
  });

});
