"use strict";

var MultiString = require('../lib/multistring').MultiString;

var test_suite = function() {
  let expect = function(a, b, msg) {
    if (a != b) {
      throw new Error(`'${a}' <> '${b}': ${msg}`);
    }
  }
  // Example, create instance phrase:
  let dragoman = new MultiString('dragoman');
  let potentate = new MultiString();
  potentate.set_lang_val('en', 'potentate');
  expect(dragoman, 'dragoman', "langless value should be initial default");

  expect(dragoman.length, 8,  "length broken for langless value");
  expect(potentate.length, 0, "length broken when no langless value");
  MultiString.set_langpath('en:fr:de');
  expect(dragoman.length, 8, "length broken when lang_path but no lang values");
  expect(dragoman.toUpperCase(), 'DRAGOMAN', 'native methods not working');
  expect(dragoman.behead(), 'ragoman',
         'extended methods not working');

  dragoman.set_lang_val('de', 'ubersetzer');
  expect(dragoman, "ubersetzer", 'lang_path not catching last lang');

  dragoman.set_lang_val('fr', 'traducteur');
  expect(dragoman, "traducteur", 'lang_path not catching a middle lang');

  dragoman.set_lang_val('en', 'translator');
  expect(dragoman, "translator", 'lang_path not catching first lang');

  MultiString.set_langpath('de')
  expect(dragoman, "ubersetzer",
         'set_langpath not changing results');
  expect(potentate, "",
         "set_langpath not causing empty langless value to show");

  console.log("success");
};

test_suite();
