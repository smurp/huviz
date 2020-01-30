(function() {
  var Stream, a, app, cooked_argv, ejs, express, fs, knownOpts, localOrCDN, morgan, nopt, nopts, path, port, quaff_module_path, shortHands;

  fs = require('fs');

  path = require('path');

  Stream = require("stream").Stream;

  ejs = require("ejs");

  express = require("express");

  morgan = require("morgan");

  nopt = require("nopt");

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
    usecdn: Boolean,
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
      cooked_argv.push("--git_commit_hash");
      cooked_argv.push("8e3849b");
      console.log(cooked_argv);
      break;
    case 'production':
      cooked_argv.push("--usecdn");
  }

  nopts = nopt(knownOpts, shortHands, cooked_argv, 2);

  switch (process.env.NODE_ENV) {
    case 'development':
      console.log('development', nopts);
      break;
    case 'production':
      console.log('production', nopts);
  }

  localOrCDN = function(templatePath, data, options) {
    var fullPath;
    if (options == null) {
      options = {};
    }
    fullPath = path.join(process.cwd(), templatePath);
    return (function(_this) {
      return function(req, res) {
        return ejs.renderFile(fullPath, data, options, function(err, str) {
          if (err) {
            return res.send(err);
          } else {
            return res.send(str);
          }
        });
      };
    })(this);
  };

  app = express();

  app.use(morgan('combined'));

  app.set("/views", __dirname + "/views");

  app.set("/views/tabs", path.join(__dirname, 'tabs', "views"));

  app.use('/huviz/css', express["static"](__dirname + '/css'));

  app.use("/huviz", express["static"](__dirname + '/lib'));

  app.use('/jquery-ui-css', express["static"](__dirname + '/node_modules/components-jqueryui/themes/smoothness'));

  app.use('/jquery-ui', express["static"](__dirname + '/node_modules/components-jqueryui'));

  app.use('/jquery', express["static"](__dirname + '/node_modules/jquery/dist'));

  app.use('/jquery-simulate-ext__libs', express["static"](__dirname + '/node_modules/jquery-simulate-ext/libs'));

  app.use('/jquery-simulate-ext__src', express["static"](__dirname + '/node_modules/jquery-simulate-ext/src'));

  app.use('/d3', express["static"](__dirname + '/node_modules/d3'));

  quaff_module_path = process.env.QUAFF_PATH || "/node_modules";

  app.use('/quaff-lod/quaff-lod-worker-bundle.js', localOrCDN(quaff_module_path + "/quaff-lod/quaff-lod-worker-bundle.js", {
    nopts: nopts
  }));

  app.use('/data', express["static"](__dirname + '/data'));

  app.use('/js', express["static"](__dirname + '/js'));

  app.use("/jsoutline", express["static"](__dirname + "/node_modules/jsoutline/lib"));

  app.use('/huviz/vendor', express["static"](__dirname + '/vendor'));

  app.use('/node_modules', express["static"](__dirname + '/node_modules'));

  app.use('/huviz/async', express["static"](__dirname + '/node_modules/async/lib/'));

  app.use('/mocha', express["static"](__dirname + '/node_modules/mocha'));

  app.use('/chai', express["static"](__dirname + '/node_modules/chai'));

  app.use('/marked', express["static"](__dirname + '/node_modules/marked'));

  app.use('/huviz/docs', express["static"](__dirname + '/docs'));

  app.get("/tab_tester", localOrCDN("/views/tab_tester.html", {
    nopts: nopts
  }));

  app.get("/flower", localOrCDN("/views/flower.html.ejs", {
    nopts: nopts
  }));

  app.get("/boxed", localOrCDN("/views/boxed.html.ejs", {
    nopts: nopts
  }));

  app.get("/twoup", localOrCDN("/views/twoup.html.ejs", {
    nopts: nopts
  }));

  app.get("/tests", localOrCDN("/views/tests.html.ejs", {
    nopts: nopts
  }));

  app.get("/", localOrCDN("/views/huvis.html.ejs", {
    nopts: nopts
  }));

  app.use(express["static"](__dirname + '/images'));

  app.use("/srcdocs", express["static"]("srcdocs", {
    index: 'index.html',
    redirect: true,
    extensions: ['html']
  }));

  port = nopts.port || nopts.argv.remain[0] || process.env.PORT || default_port;

  console.log("Starting server on port: " + port + " localhost");

  app.listen(port, 'localhost');

}).call(this);
