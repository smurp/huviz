/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

//
// Purpose:
//   convert 'mintree' structures like:
//      {"BIO":["Biography",{"BIR":["Birth"]}],
//       "WRK":["Work"]}
//     where each node is an object with an id and name, and optional children
//        {'ID' :['Name'],
//         'GOD':['Yahwe',{'KID1':['Adam'],
//                         'KID2':['Eve']}]}
//   to structures like:
//      {"name": "Name",
//       "id":   "ID",
//       
  
var mintree2d3tree = function(mintree,out,default_root,use_ids_as_names) {
  use_ids_as_names = use_ids_as_names || false;
  default_root = default_root || {name: 'All', children: []};
  out = out || default_root;
  //console.log("===============\nadding:\n",mintree,"\nto:\n",out)
  for (let k in mintree) {
    var node;
    const v = mintree[k];
    if (use_ids_as_names) {
      node = {name:k};
    } else {
      node = {id:k};
    }
    if (v) {
      if (!use_ids_as_names) {
        node.name = v[0];
      }
      if (v[1]) {
        node.children = [];
        mintree2d3tree(v[1],node);
      }
    }
    out.children.push(node);
  }
  return out;    
};


const test = function() {
  const genesis = {
    ID :['Name'],
    GOD:['Yahwe', {
      KID1:['Adam'],
      KID2:['Eve']
    }]
  };
  const expect = '{"name":"All","children":[{"id":"GOD","name":"Yahwe","children":[{"id":"KID1","name":"Adam"},{"id":"KID2","name":"Eve"}]}]}';
  const got = mintree2d3tree(genesis);
  const got_str = JSON.stringify(got);
  if (got_str === expect) {
    return console.log('success');
  } else {
    console.log("=========================================");
    return console.log("",got_str,"\n<>\n",expect);
  }
};

//window = window or exports
window.mintree2d3tree = mintree2d3tree;
// test()
