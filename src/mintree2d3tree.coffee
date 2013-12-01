
#
# Purpose:
#   convert 'mintree' structures like:
#      {"BIO":["Biography",{"BIR":["Birth"]}],
#       "WRK":["Work"]}
#     where each node is an object with an id and name, and optional children
#        {'ID' :['Name'],
#         'GOD':['Yahwe',{'KID1':['Adam'],
#                         'KID2':['Eve']}]}
#   to structures like:
#      {"name": "Name",
#       "id":   "ID",
#       
  
mintree2d3tree = (mintree,out,default_root,use_ids_as_names) ->
  use_ids_as_names = use_ids_as_names or false
  default_root = default_root or {name: 'All', children: []}
  out = out or default_root
  #console.log("===============\nadding:\n",mintree,"\nto:\n",out)
  for k,v of mintree
    if use_ids_as_names
      node = name:k
    else
      node = id:k
    if v
      if not use_ids_as_names
        node.name = v[0]
      if v[1]
        node.children = []
        mintree2d3tree(v[1],node)
    out.children.push node
  return out    


test = ->
  genesis =
    ID :['Name']
    GOD:['Yahwe'
      KID1:['Adam']
      KID2:['Eve']]
  expect = '{"name":"All","children":[{"id":"GOD","name":"Yahwe","children":[{"id":"KID1","name":"Adam"},{"id":"KID2","name":"Eve"}]}]}'
  got = mintree2d3tree(genesis)
  got_str = JSON.stringify(got)
  if got_str == expect
    console.log('success')
  else
    console.log("=========================================")
    console.log("",got_str,"\n<>\n",expect)

#window = window or exports
window.mintree2d3tree = mintree2d3tree
# test()
