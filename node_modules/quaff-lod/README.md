# quaff-lod

This is streaming Linked Open Data parser made available as a Web Worker.

It is just a very thin wrapper around:

* https://github.com/rubensworks/jsonld-streaming-parser.js

The ambition is to also include:

* https://github.com/rdfjs/rdfxml-streaming-parser.js
* https://github.com/rdfjs/N3.js

This was motivated by the needs of https://github.com/smurp/huviz and https://github.com/smurp/nooron

## Usage:

```js
worker = new Worker('/node_modules/quaff-lod/quaff_lod_worker_bundle.js')
worker.addEventListener('message', receive_jsonld)
worker.postMessage({url: url})
```

## Development

`npm run dev`


## All Hail

Thanks to Ruben and Ruben for their great parsers!

* https://www.rubensworks.net/blog/2019/03/13/streaming-rdf-parsers/
* https://ruben.verborgh.org/blog/2013/04/30/lightning-fast-rdf-in-javascript/

Thank you to CWRC and Pelagios for funding.
