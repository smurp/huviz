"use strict";

var chai = require("chai");
var expect = chai.expect;

var MultiString = require('../js/multistring').MultiString;
var SortedSet = require('../js/sortedset').SortedSet;

describe("MultiString", function() {
  it("makes string with multiple language values", function() {
    let dragoman = new MultiString('dragoman');
    let potentate = new MultiString();
    potentate.set_lang_val('en', 'potentate');
    expect(''+dragoman).to.equal(
      'dragoman', "langless value should be initial default");

    expect(dragoman.length).to.equal(
      8,  "length broken for langless value");
    expect(potentate.length).to.equal(
      0, "length broken when no langless value");
    MultiString.set_langpath('en:fr:de');
    expect(dragoman.length).to.equal(
      8, "length broken when lang_path but no lang values");
    expect(dragoman.toUpperCase()).to.equal(
      'DRAGOMAN', 'native methods not working');
    expect(dragoman.behead()).to.equal(
      'ragoman', 'extended methods not working');

    dragoman.set_lang_val('de', 'ubersetzer');
    expect(''+dragoman).to.equal(
      "ubersetzer", 'lang_path not catching last lang');

    dragoman.set_lang_val('fr', 'traducteur');
    expect(''+dragoman).to.equal(
      "traducteur", 'lang_path not catching a middle lang');

    dragoman.set_lang_val('en', 'translator');
    expect(''+dragoman).to.equal(
      "translator", 'lang_path not catching first lang');

    MultiString.set_langpath('de');
    expect(''+dragoman).to.equal(
      "ubersetzer", 'set_langpath not changing results');
    expect(''+potentate).to.equal(
      "", "set_langpath not causing empty langless value to show");

    let dog = new MultiString('dog', 'en', 'Hund', 'de', 'chein', 'fr');
    expect(''+dog).to.equal('Hund');
    expect(dog.substr(0,2)).to.equal('Hu')
  })
});

