//  angliciser(['a','b','c']) ==> "a, b and c"
//  angliciser(['a','b']) ==> "a and b"
//  angliciser(['a']) ==> "a"#
//  angliciser([]) ==> ""

export function angliciser(lst, and_or_or) {
  const b = and_or_or;
  and_or_or = ((and_or_or == null) && " and ") || and_or_or; // uh really?! so one can pass in " or "
  if ((b != null) && (and_or_or !== b)) {
    throw "and_or_or failing " + b;
  }
  let english = "";
  const lstlen = lst.length;
  lst.forEach((itm,i) => {
    if (lstlen > 1) {
      if ((lstlen - 1) === i) {
        english += and_or_or;
      } else {
        if (i > 0) {
          english += ', ';
        }
      }
    }
  });
  return english;
}
