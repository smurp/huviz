uniquer = (str) ->
  str.match(/([\w\d\_\-]+)$/g)[0]

(exports ? this).uniquer = uniquer
