"use strict";
/*
MultiString
  purpose:
     Provide an object that can be used in place of a string, in that
     it returns a string value, but actually stores multiple per-language
     versions of the string and can be reconfigured as to which different
     language version gets returned.
*/


// Define class MultiString
function MultiString(s) {
  this.value = s || '';
  Object.defineProperty(this, 'length', {get:
    function () { return this.value.length; }});
};
// inherit all properties from native class String
MultiString.prototype = Object.create(String.prototype);


MultiString.prototype.set_lang_val = function(lang, value) {
  this[lang] = value;
};

MultiString.set_langpath = function(langpath){
  let langs = [];
  if (langpath) {
    langs = langpath.split(':');
  }
  langs.push('value');
  let body = "return this."+langs.join('|| this.');
  // compile a new function which follows the langpath for the value
  // so String.prototype methods can get to the value
  MultiString.prototype.toString =
    MultiString.prototype.valueOf =
      new Function(body);
};

MultiString.set_langpath(); // set the default langpath

// Extend class with a trivial method
MultiString.prototype.behead = function(){
  return this.substr(1);
}

module.exports.MultiString = MultiString;

