"use strict";

var chai = require("chai");
var expect = chai.expect;

var MultiString = require('../js/multistring').MultiString;
var SortedSet = require('../js/sortedset').SortedSet;

// Array.includes polyfill per MDN (Mozilla Developer Network)
// https://tc39.github.io/ecma262/#sec-array.prototype.includes
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(searchElement, fromIndex) {

      // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If len is 0, return false.
      if (len === 0) {
        return false;
      }

      // 4. Let n be ? ToInteger(fromIndex).
      //    (If fromIndex is undefined, this step produces the value 0.)
      var n = fromIndex | 0;

      // 5. If n ≥ 0, then
      //  a. Let k be n.
      // 6. Else n < 0,
      //  a. Let k be len + n.
      //  b. If k < 0, let k be 0.
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }

      // 7. Repeat, while k < len
      while (k < len) {
        // a. Let elementK be the result of ? Get(O, ! ToString(k)).
        // b. If SameValueZero(searchElement, elementK) is true, return true.
        // c. Increase k by 1.
        if (sameValueZero(o[k], searchElement)) {
          return true;
        }
        k++;
      }

      // 8. Return false
      return false;
    }
  });
}

describe("MultiString", function() {
  it("makes string with multiple language values", function() {
    let dragoman = new MultiString('dragoman'); // the NOLANG value
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
      0, "length broken when lang_path but no lang values");

    MultiString.set_langpath('en:fr:de:NOLANG');
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

    let dog = new MultiString('dog', 'en', 'Hund', 'de', 'chien', 'fr');
    expect(''+dog).to.equal('Hund');
    expect(dog.substr(0,2)).to.equal('Hu', "String methods not found")

    dog.set_val_lang('woofer'); // ie NOLANG
    MultiString.set_langpath('NOLANG');
    expect(''+dog).to.equal('woofer', "NOLANG not respected");

    MultiString.set_langpath('ANY:en');
    expect(MultiString.langs_in_path[0]).to.equal(
      'en', 'langs_in_path not begin updated')
    expect(''+dog).to.not.equal('dog', "ANY not excluding langs_in_path");

    MultiString.set_langpath('ALL');
    expect(''+dog).to.equal( // fragile, depends on object order maintenance
      '"dog"@en, "Hund"@de, "chien"@fr, "woofer"',
      "ALL not respected");
  })
});

