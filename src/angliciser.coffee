

#  angliciser(['a','b','c']) ==> "a, b and c"
#  angliciser(['a','b']) ==> "a and b"
#  angliciser(['a']) ==> "a"#
#  angliciser([]) ==> ""

angliciser = (lst) ->
  english = ""
  #console.log lst
  lstlen = lst.length
  lst.forEach (itm,i) =>
    #console.log english
    if lstlen > 1
      if (lstlen - 1) == i
        english += " and "
      else
        if i > 0
          english += ', '
    english += itm
    #console.log "'"+english+"'"
  return english
  
(exports ? this).angliciser = angliciser