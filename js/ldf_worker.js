"use strict";
console.clear()
if (typeof(require) == 'undefined') {
  console.info('/huviz/ldf_worker_bundle.js');
  var window = {};
} else {
  console.info('/js/ldf_worker.js');
}
console.table([{self: self, window: window, this: this}])

if (typeof(this) == 'undefined') {
  console.warn('this is undefined');
} else {
  console.warn('this is',this);
}
//debugger;

try {
  var ldf = require('ldf-client');
  console.log('require worked!')
} catch (e) {
  console.log('require failed');
}
if (typeof(ldf) == 'undefined') {
  self.importScripts('/huviz/ldf-client-browser.js');
  console.log('importScripts')
}

// if (typeof(require) == 'undefined') {
//   console.log('using importScripts');
//   self.window = self;
//   // Subsets of jQuery can be built here:
//   //   http://projects.jga.me/jquery-builder/
//   //self.importScripts('//code.jquery.com/jquery-2.2.4.min.js');
//   //self.importScripts('/vendor/jqueryAjax.js');
//   self.importScripts('/huviz/ldf-client-browser.js');
// } else {
//   var ldf = require('ldf-client');
// }
 
var fragClients = {};

var getOrCreateClient = (uri) => {
  var client = fragClients[uri];
  if (!client) {
    if (!self.FragmentsClient) {
      console.warn('FragmentsClient missing');
    }
    if (!self.ldf) {
      console.warn('ldf missing');
    }
    client = fragClients[uri] = new ldf.FragmentsClient(uri);
  }
  console.log('client:',client);
  return client
};

onmessage = (event) => {
  console.log('ldf_worker called');
  let d =  event.data;
  let fragmentsClient  = getOrCreateClient(d.fragmentsServerUri);
  let results = new ldf.SparqlIterator(d.query, { fragmentsClient: fragmentsClient });
  results.on('data', function (result) { console.log("WOOT",result); });
  //{ requestArgs } = event.data;
};
