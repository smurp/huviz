# FIXME this should be renamed to make_dom_safe_id()
uniquer = (str) ->
  m = str.match(/([\w\d\_\-]+)$/g)
  if m
    retval = m[0]
  else
    retval = str.replace(/http(s)?\:/, '').replace(/\//, "__")
    retval = retval.replace(/[\.\;\/]/g, '_')
    retval = retval.replace(/^\_*/g, '') # leading _
    retval = retval.replace(/\_*$/g, '') # trailing _
  if retval.match(/^[^a-zA-Z]/)
    retval = "x#{retval}"
  return retval
(exports ? this).uniquer = uniquer
