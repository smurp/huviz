"use strict";
/*
MultiString
  purpose:
     Provide an object that can be used in place of a string, in that
     it returns a string value, but actually stores multiple per-language
     versions of the string and can be reconfigured as to which different
     language version gets returned.
  see:
     https://stackoverflow.com/a/28188150/1234699
*/

// Define class MultiString
function MultiString() {
  if (arguments.length == 0) {
    this.set_val_lang()
  } else {
    let i = -1;
    while (arguments[i+=1]) {
      // process value/lang pairs
      // console.log(`arguments[${i}] is `, arguments[i], typeof(i));
      this.set_val_lang(arguments[i] || '', arguments[i+=1]);
    }
  }
  Object.defineProperty(
    this, 'length',
    {get: function () { return (this.valueOf()||'').length; }});
};
// inherit all properties from native class String
MultiString.prototype = Object.create(String.prototype);

MultiString.prototype.set_val_lang = function(value, lang) {
  //  set a value/lang pair where undefined lang sets nolang value
  if (lang) {
    this[lang] = value;
  } else {
    this.nolang = value || '';
  }
};

MultiString.prototype.set_lang_val = function(lang, value) {
  this.set_val_lang(value, lang);
};

MultiString.set_langpath = function(langpath){
  let langs = [];
  if (langpath) {
    langs = langpath.split(':');
  }
  langs.push('nolang');
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

if (module && module.exports) {
  module.exports.MultiString = MultiString;
}

