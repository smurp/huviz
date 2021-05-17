'use strict';
import http from 'http';
//import request from 'request';

import fetch from 'node-fetch';


//const hostname = '127.0.0.1';
//const port = 5050;
const PROXY_PREFIX = '/SPARQLPROXY/';

function proxyHeaders(from, which, prefix="") {
  var headers = {};
  which.split(' ').
    forEach((header) => {
      var val = from[header];
      if (val != undefined) {
        console.log(prefix, header, val);
        headers[header] = val;
      }
    });
  return headers;
}
function proxyRequestHeaders(req) {
  const PASS_THRU_HEADERS = 'accept content-type cookie user-agent referrer x-requested-with accept-encoding accept-language';
  return proxyHeaders(req.headers, PASS_THRU_HEADERS, "reqHeader");
}
function proxyResponseHeaders(res) {
  const PASS_THRU_HEADERS = 'accept content-type cookie user-agent referrer x-requested-with accept-encoding accept-language content-encoding';
  var resHeaders = res.headers;
  console.log({resHeaders});
  return proxyHeaders(resHeaders, PASS_THRU_HEADERS, "resHeader");
}
function conveyHeaders(to, from, only, prefix='conveying') {
  var keys = (only || '').split(' ');
  for (const [k,v] of Object.entries(from)) {
    var v0 = v[0];
    if (keys.includes(k)) {
      console.log(prefix, k, v0);
      to.setHeader(k,v0);
    } else {
      console.log("  skip", k, v0);
    }
  }
}

export async function sparqlproxy(req, res) {
  var {url} = req;
  //console.log({url});
  res.setHeader('Access-Control-Allow-Origin', '*');
  //var targetUrl = url.replace(PROXY_PREFIX, '');
  var targetUrl = req.params.target;
  //console.log({targetUrl});
  res.statusCode = 200;
  const remoteResponse = await fetch(targetUrl, {
    headers: proxyRequestHeaders(req)});
  const buffer = await remoteResponse.buffer();
  conveyHeaders(res, remoteResponse.headers.raw(),
                'content-type etag content-length connection',
                "resHeader");
  res.end(buffer.toString());
  // TODO add error or timeout handler
  //then(remRes => {console.log(remRes)});
};
/*
const server = http.createServer(proxinate);

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
})
;
*/
