// FIXME this should be renamed to make_dom_safe_id()
export const uniquer = function(str) {
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

export function unique_id(prefix) {
  if (prefix == null) { prefix = 'uid_'; }
  return prefix + Math.random().toString(36).substr(2,10);
};
