/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

// # huviz Server
//
// First we load standard node modules
import fs from 'fs';
import path from 'path';
import {Stream} from 'stream';

// Then load diverse modules
import ejs from 'ejs';
import express from 'express';
import fileUpload from 'express-fileupload';
import marked from 'marked';
import morgan from 'morgan';
import nopt from 'nopt'; // https://github.com/npm/nopt

// then local modules
import {sparqlproxy} from './js/sparqlproxy.js';

const __dirname = process.cwd();

// process command line arguments
const cooked_argv = (Array.from(process.argv));
const knownOpts = {
  usecdn: Boolean,
  git_commit_hash: [String, null],
  git_branch_name: [String, null],
  port: [Stream, Number]
};
const shortHands =
  {faststart: []};

if (process.env.NODE_ENV == null) { process.env.NODE_ENV = 'production'; } // REVIEW why is this needed? what is the proper default?
switch (process.env.NODE_ENV) {
  case 'development':
    cooked_argv.push("--faststart");
    cooked_argv.push("--git_commit_hash");
    cooked_argv.push("8e3849b");
    console.log(cooked_argv);
    break;
  case 'production':
    cooked_argv.push("--usecdn");
    break;
}

const nopts = nopt(knownOpts, shortHands, cooked_argv, 2);
nopts.huviz_init_file = "/js/HUVIZ_INIT_com.nooron.dev.huviz.js";
//nopts.huviz_init_file = "/js/init_huvis.js"

switch (process.env.NODE_ENV) {
  case 'development':
    console.log(nopts);
    break;
}

// https://github.com/sstephenson/eco
// REVIEW is this still needed?
const localOrCDN = function(templatePath, data, options) {
  if (options == null) { options = {}; }
  const fullPath = path.join(process.cwd(), templatePath);
  return (req, res) => {
    return ejs.renderFile(fullPath, data, options, (err, str) => {
      if (err) {
        return res.send(err);
      } else {
        return res.send(str);
      }
    });
  };
};

function moreMenu(req, res) {
  res.send(marked(`
## HuViz More...

### Tests and Demos
* [forcetoy](/more/forcetoy)
* [getalong](/more/getalong)
* [historymockup](/more/historymockup)
* [tests](/more/tests)

### Need converting to ES6 Modules
* [boxed](/more/boxed)
* [search](/more/search)
* [twoup](/more/twoup)

[back](/)
`));
}

function publishScriptPOST(req, res) {
  // https://github.com/richardgirges/express-fileupload/tree/master/example#basic-file-upload

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let scriptFile = req.files.scriptFile;
  var location = "/scripts/" + scriptFile.md5 + '.txt';
  var uploadPath = path.join(__dirname, 'UPLOADS', location);

  // Use the mv() method to place the file somewhere on your server
  scriptFile.mv(uploadPath, function(err) {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    } else {
      console.log("responding " + scriptFile.md5)
      res.setHeader("location", location)
      res.end();
    }
  });
}

// Now build the express app itself.

const app = express();
app.use(morgan('combined'));
app.use(fileUpload({useTempFiles: true, tempFileDir: '/tmp/' /*, debug: true */}));
app.set("/views", __dirname + "/views");
app.set("/views/tabs", path.join(__dirname, 'tabs', "views"));
app.use('/huviz/css', express.static(__dirname + '/css'));
app.use("/huviz", express.static(__dirname + '/lib'));
app.use('/jquery-ui-css',
  express.static(__dirname + '/node_modules/components-jqueryui/themes/smoothness'));
app.use('/jquery-ui',
  express.static(__dirname + '/node_modules/components-jqueryui'));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/jquery-simulate-ext__libs',
  express.static(__dirname + '/node_modules/jquery-simulate-ext/libs'));
app.use('/jquery-simulate-ext__src',
  express.static(__dirname + '/node_modules/jquery-simulate-ext/src'));
app.use('/d3', express.static(__dirname + '/node_modules/d3'));
// Ideally we would do this....
// `app.use('/quaff-lod', express.static(__dirname + '/node_modules/quaff-lod/'))`
// but that fails while quaff-lod is being referenced as a symlink in package.json
const quaff_module_path = process.env.QUAFF_PATH || path.join(__dirname,"node_modules","quaff-lod");
app.use('/quaff-lod/quaff-lod-worker-bundle.js',
    express.static(quaff_module_path + "/quaff-lod-worker-bundle.js"));
app.use('/data', express.static(__dirname + '/data'));
app.use('/scripts', express.static(path.join(__dirname, 'UPLOADS', 'scripts')));
app.post("/scripts", publishScriptPOST);
app.use('/js', express.static(__dirname + '/js'));
app.use("/jsoutline", express.static(__dirname + "/node_modules/jsoutline/lib"));
app.use('/huviz/vendor', express.static(__dirname + '/vendor'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.use('/huviz/async', express.static(__dirname + '/node_modules/async/lib/'));
app.use('/mocha', express.static(__dirname + '/node_modules/mocha'));
app.use('/chai', express.static(__dirname + '/node_modules/chai'));
app.use('/marked', express.static(__dirname + '/node_modules/marked'));
app.use('/huviz/docs', express.static(__dirname + '/docs'));
app.get("/tab_tester", localOrCDN("/views/tab_tester.html", {nopts}));
app.get("/more", moreMenu);
app.get("/more/boxed", localOrCDN("/views/boxed.html.ejs", {nopts}));
app.get("/more/forcetoy", localOrCDN("/views/forcetoy.html", {nopts}));
app.get("/more/getalong", localOrCDN("/views/getalong.html.ejs", {nopts}));
app.get("/more/historymockup", localOrCDN("/views/historymockup.html.ejs", {nopts}));
app.get("/more/search", localOrCDN("/views/search.html.ejs", {nopts}));
app.get("/more/twoup", localOrCDN("/views/twoup.html.ejs", {nopts}));
app.get("/more/tests", localOrCDN("/views/tests.html.ejs", {nopts}));
// app.get("/process_env.js", (req, res) => res.send("process_env="+process.env)) # serve process.env
app.get("/", localOrCDN("/views/huvis.html.ejs", {nopts}));
app.get("/SPARQLPROXY/:target", sparqlproxy);

app.use('/images', express.static(__dirname + '/images')); // for /favicon.ico

// serve /srcdocs/SUMUT.md files as raw markdown
//app.use("/srcdocs/:d.md", express.static(__dirname + '/srcdocs'))
//app.use("/srcdocs/:d", express.static(__dirname + '/srcdocs'))
//app.get("/srcdocs/", (req, res) -> res.redirect("/srcdocs/index.html"))
app.use("/srcdocs",
  express.static("srcdocs", {index: 'index.html', redirect: true, extensions: ['html']}));
const port = nopts.port || nopts.argv.remain[0] || process.env.PORT || 5000;
console.log(`Starting server on localhost:${port} NODE_ENV:${process.env.NODE_ENV}`);
app.listen(port, 'localhost');
