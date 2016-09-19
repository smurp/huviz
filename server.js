(function() {
  var Stream, a, app, cooked_argv, createSnippetServer, eco, express, fs, knownOpts, libxmljs, localOrCDN, nopt, nopts, port, shortHands;

  express = require("express");

  eco = require("eco");

  nopt = require("nopt");

  Stream = require("stream").Stream;

  fs = require('fs');

  cooked_argv = (function() {
    var _i, _len, _ref, _results;
    _ref = process.argv;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      a = _ref[_i];
      _results.push(a);
    }
    return _results;
  })();

  knownOpts = {
    is_local: Boolean,
    skip_orlando: Boolean,
    skip_poetesses: Boolean,
    git_commit_hash: [String, null],
    git_branch_name: [String, null],
    port: [Stream, Number]
  };

  shortHands = {
    faststart: ["--skip_orlando", "--skip_poetesses"]
  };

  switch (process.env.NODE_ENV) {
    case 'development':
      cooked_argv.push("--faststart");
      cooked_argv.push("--is_local");
      console.log(cooked_argv);
  }

  nopts = nopt(knownOpts, shortHands, cooked_argv, 2);

  switch (process.env.NODE_ENV) {
    case 'development':
      console.log(nopts);
  }

  app = express.createServer();

  localOrCDN = function(templatePath, isLocal) {
    var respondDude, template;
    template = fs.readFileSync(__dirname + templatePath, "utf-8");
    respondDude = (function(_this) {
      return function(req, res) {
        return res.send(eco.render(template, nopts));
      };
    })(this);
    return respondDude;
  };

  libxmljs = require("libxmljs");

  createSnippetServer = function(xmlFileName, uppercase) {
    var doc, elems_by_id, elems_idx_by_id, getSnippetById, id_in_case, makeXmlDoc, nodes_with_id;
    if ((uppercase == null) || uppercase) {
      id_in_case = "ID";
    } else {
      id_in_case = "id";
    }
    doc = null;
    nodes_with_id = [];
    elems_by_id = {};
    elems_idx_by_id = {};
    makeXmlDoc = function(err, data) {
      var count, elem, finished, i, id, started, thing, _i, _len;
      if (err) {
        return console.error(err);
      } else {
        console.log("parsing " + xmlFileName + "...");
        started = new Date().getTime() / 1000;
        doc = libxmljs.parseXml(data.toString());
        finished = new Date().getTime() / 1000;
        console.log("finished parsing " + xmlFileName + " in " + (finished - started) + " sec");
        if (true) {
          console.log("finding IDs in " + xmlFileName + "...");
          started = new Date().getTime() / 1000;
          nodes_with_id = doc.find('//*[@' + id_in_case + ']');
          count = nodes_with_id.length;
          finished = new Date().getTime() / 1000;
          console.log("finished parsing " + xmlFileName + " in " + (finished - started) + " sec found: " + count);
          if (true) {
            started = new Date().getTime() / 1000;
            for (i = _i = 0, _len = nodes_with_id.length; _i < _len; i = ++_i) {
              elem = nodes_with_id[i];
              thing = elem.get("@" + id_in_case);
              id = thing.value();
              elems_idx_by_id[id] = i;
            }
            finished = new Date().getTime() / 1000;
            return console.log("finished indexing " + xmlFileName + " in " + (finished - started) + " sec");
          }
        }
      }
    };
    getSnippetById = function(req, res) {
      var elem, finished, sec, snippet, started;
      if (doc) {
        started = new Date().getTime();
        elem = nodes_with_id[elems_idx_by_id[req.params.id]];
        finished = new Date().getTime();
        sec = (finished - started) / 1000;
        if (elem != null) {
          snippet = elem.toString();
          return res.send(snippet);
        } else {
          return res.send("not found");
        }
      } else {
        return res.send("doc still parsing");
      }
    };
    fs.readFile(xmlFileName, makeXmlDoc);
    return getSnippetById;
  };

  app.configure(function() {
    app.use(express.logger());
    app.set("views", __dirname + "/views");
    app.use(app.router);
    app.use("/huviz", express["static"](__dirname + '/lib'));
    app.use('/css', express["static"](__dirname + '/css'));
    app.use('/jquery-ui-css', express["static"](__dirname + '/node_modules/components-jqueryui/themes/smoothness'));
    app.use('/jquery-ui', express["static"](__dirname + '/node_modules/components-jqueryui'));
    app.use('/jquery', express["static"](__dirname + '/node_modules/components-jquery'));
    app.use('/data', express["static"](__dirname + '/data'));
    app.use('/js', express["static"](__dirname + '/js'));
    app.use("/jsoutline", express["static"](__dirname + "/node_modules/jsoutline/lib"));
    app.use('/vendor', express["static"](__dirname + '/vendor'));
    app.use('/node_modules', express["static"](__dirname + '/node_modules'));
    app.use('/mocha', express["static"](__dirname + '/node_modules/mocha'));
    app.use('/chai', express["static"](__dirname + '/node_modules/chai'));
    app.use('/marked', express["static"](__dirname + '/node_modules/marked'));
    app.use('/docs', express["static"](__dirname + '/docs'));
    app.get("/orlonto.html", localOrCDN("/views/orlonto.html.eco", nopts.is_local));
    app.get("/yegodd.html", localOrCDN("/views/yegodd.html.eco", nopts.is_local));
    app.get("/tests", localOrCDN("/views/tests.html.eco", nopts.is_local));
    app.get("/", localOrCDN("/views/huvis.html.eco", nopts.is_local));
    return app.use(express["static"](__dirname + '/images'));
  });

  port = nopts.port || nopts.argv.remain[0] || process.env.PORT || default_port;

  if (!nopts.skip_orlando) {
    app.get("/snippet/orlando/:id([A-Za-z0-9-_]+)/", createSnippetServer("orlando_all_entries_2013-03-04.xml", true));
  }

  if (!nopts.skip_poetesses) {
    app.get("/snippet/poetesses/:id([A-Za-z0-9-_]+)/", createSnippetServer("poetesses_decomposed.xml", false));
  }

  console.log("Starting server on port: " + port + " localhost");

  app.listen(port, 'localhost');

}).call(this);
