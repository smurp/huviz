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
  features:
    Expects langpath values which are colon-delimted lists of 2-letter
    language codes.  The final value in the list can instead be the
    word ANY, a wildcard meaning that every language not yet represented
    in the language path would be respected too.

    Note that MultiStrings can also have 'NOLANG' values, that is, values
    with no associated language.  These are always on the priority list,
    but at the end, even after ANY is respected.

    If one wants to make referencde to the "NOLANG" value, one can
    do so explicitly with the term NOLANG in the langpath.

  examples:
    "en"
      means that if an English value has been provided it will be
      respected and that if there is a NOLANG value it will be shown
      otherwise.  On no account will values in other languages be shown.

    "en:fr"
      If a MultiString instance has an English value it will be shown,
      otherwise if a French value is available it will be shown, failing
      that if a NOLANG value is present, it will be shown.

    "en:ANY"
      If a MultiString instance has an English value it will be shown,
      otherwise if value tagged with any other lanugage is available
      it will be shown (in no particular order) and finally if a
      "NOLANG" value is present, it will be shown.

    "en:NOLANG:ANY"
      Show English if available, or the NOLANG value or a value from
      ANY other language if present -- in that priority order.
*/

function MultiString() {
  var i;
  if (arguments.length == 0) {
    this.set_val_lang()
  } else {
    i = -1;
    while (arguments[i+=1]) {
      // process value/lang pairs
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
  //  set a value/lang pair where undefined lang sets NOLANG value
  if (lang) {
    this[lang] = value;
  } else {
    this.NOLANG = value || '';
  }
};

MultiString.langs_in_path = []; // default value
MultiString.prototype.set_lang_val = function(lang, value) {
  this.set_val_lang(value, lang);
};

MultiString.prototype.get_ANY_but_langs_in_path = function() {
  var langs_in_path = MultiString.langs_in_path;
  for (var key in this) {
    if (this.hasOwnProperty(key)) {
      if (langs_in_path.indexOf(key) == -1) {
        return this[key];
      }
    }
  };
};

MultiString.prototype.get_ALL = function() {
  var retval = '';
  for (var key in this) {
    if (key.length == 2) {
      if (retval) {
        retval += ', '
      }
      retval += `"${this[key]}"@${key}`;
    } else if (key == 'NOLANG') {
      if (retval) {
        retval += ', '
      }
      retval += `"${this[key]}"`;
    }
  };
  return retval;
};

const LANGCODE_RE = /^[a-z]{2}$/

MultiString.set_langpath = function(langpath){
  var langs = [],
      parts = [],
      langs_in_path = [],
      nolang_used = false;
  if (langpath) {
    parts = langpath.split(':');
    parts.forEach(function(p,idx){
      if (p.match(LANGCODE_RE)) {
        langs.push(p);
        langs_in_path.push(p);
      } else if (p == 'NOLANG') {
        nolang_used = true;
        langs.push(p);
      } else if (p == 'ANY') {
        langs.push("get_ANY_but_langs_in_path()")
      } else if (p == 'ALL') {
        langs.push("get_ALL()")
      } else {
        throw new Error(`<${p}> is not a legal term in LANGPATH`);
      }
    });
  }
  MultiString.langs_in_path = langs_in_path;
  var body = "return";
  if (langs.length) {
    body += " this."+langs.join(' || this.');
    body += " || ";
  }
  body += "''";
  // Compile a new function which follows the langpath for the value
  // so String.prototype methods can get to the value
  MultiString.prototype.toString =
    MultiString.prototype.valueOf =
      new Function(body);
};

MultiString.set_langpath('ANY:NOLANG'); // set the default langpath

// Extend class with a trivial method
MultiString.prototype.behead = function(){
  return this.substr(1);
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports.MultiString = MultiString;
}
