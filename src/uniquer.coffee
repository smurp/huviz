uniquer = (str) ->
  m = str.match(/([\w\d\_\-]+)$/g)
  if m
    retval = m[0]
  else
    retval = str.replace(/http(s)?\:/, '').replace(/\//, "__")
    retval = retval.replace(/[\.\;\/]/g, '_')
    retval = retval.replace(/^\_*/g, '') # leading _
    retval = retval.replace(/\_*$/g, '') # trailing _
    #if console? and console.info?
    #  console.info("uniquer('#{str}') = '#{retval}'")
  return retval

(exports ? this).uniquer = uniquer
