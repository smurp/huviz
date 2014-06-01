

#  angliciser(['a','b','c']) ==> "a, b and c"
#  angliciser(['a','b']) ==> "a and b"
#  angliciser(['a']) ==> "a"#
#  angliciser([]) ==> ""

angliciser = (lst, and_or_or) ->
  b = and_or_or
  and_or_or = not and_or_or? and " and " or and_or_or # uh really?! so one can pass in " or "
  if b? and and_or_or isnt b
    throw "and_or_or failing " + b
  english = ""
  #console.log lst
  lstlen = lst.length
  lst.forEach (itm,i) =>
    #console.log english
    if lstlen > 1
      if (lstlen - 1) == i
        english += and_or_or
      else
        if i > 0
          english += ', '
    english += itm
    #console.log "'"+english+"'"
  return english
  
(exports ? this).angliciser = angliciser