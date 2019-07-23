/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */


//  angliciser(['a','b','c']) ==> "a, b and c"
//  angliciser(['a','b']) ==> "a and b"
//  angliciser(['a']) ==> "a"#
//  angliciser([]) ==> ""

const angliciser = function(lst, and_or_or) {
  const b = and_or_or;
  and_or_or = ((and_or_or == null) && " and ") || and_or_or; // uh really?! so one can pass in " or "
  if ((b != null) && (and_or_or !== b)) {
    throw `and_or_or failing ${b}`;
  }
  let english = "";
  //console.log lst
  const lstlen = lst.length;
  lst.forEach((itm,i) => {
    //console.log english
    if (lstlen > 1) {
      if ((lstlen - 1) === i) {
        english += and_or_or;
      } else {
        if (i > 0) {
          english += ', ';
        }
      }
    }
    return english += itm;
  });
    //console.log "'"+english+"'"
  return english;
};
  
(typeof exports !== 'undefined' && exports !== null ? exports : this).angliciser = angliciser;