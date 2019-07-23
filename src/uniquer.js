/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// FIXME this should be renamed to make_dom_safe_id()
const uniquer = function(str) {
  let retval;
  const m = str.match(/([\w\d\_\-]+)$/g);
  if (m) {
    retval = m[0];
  } else {
    retval = str.replace(/http(s)?\:/, '').replace(/\//, "__");
    retval = retval.replace(/[\.\;\/]/g, '_');
    retval = retval.replace(/^\_*/g, ''); // leading _
    retval = retval.replace(/\_*$/g, ''); // trailing _
  }
  if (retval.match(/^[^a-zA-Z]/)) {
    retval = `x${retval}`;
  }
  return retval;
};
(typeof exports !== 'undefined' && exports !== null ? exports : this).uniquer = uniquer;
