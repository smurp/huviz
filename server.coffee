
# # huviz Server
#
# First we load standard node modules
fs = require('fs')
path = require('path')
Stream = require("stream").Stream

# Then load diverse modules
ejs = require("ejs")
express = require("express")
morgan = require("morgan")
nopt = require("nopt") # https://github.com/npm/nopt

# process command line arguments
cooked_argv = (a for a in process.argv)
knownOpts =
  usecdn: Boolean
  git_commit_hash: [String, null]
  git_branch_name: [String, null]
  port: [Stream, Number]
shortHands =
  faststart: []

process.env.NODE_ENV ?= 'production' # REVIEW why is this needed? what is the proper default?
switch process.env.NODE_ENV
  when 'development'
    cooked_argv.push("--faststart")
    cooked_argv.push("--git_commit_hash")
    cooked_argv.push("8e3849b")
    console.log(cooked_argv)
  when 'production'
    cooked_argv.push("--usecdn")

nopts = nopt(knownOpts, shortHands, cooked_argv, 2)

switch process.env.NODE_ENV
  when 'development'
    console.log('development', nopts)

# https://github.com/sstephenson/eco
# REVIEW is this still needed?
localOrCDN = (templatePath, data, options) ->
  options ?= {}
  fullPath = path.join(process.cwd(), templatePath)
  return (req, res) =>
    ejs.renderFile fullPath, data, options, (err, str) =>
      if err
        res.send(err)
      else
        res.send(str)

# Now build the express app itself.

app = express()
app.use(morgan('combined'))
app.set("/views", __dirname + "/views")
app.set("/views/tabs", path.join(__dirname, 'tabs', "views"))
app.use('/huviz/css', express.static(__dirname + '/css'))
app.use("/huviz", express.static(__dirname + '/lib'))
app.use('/jquery-ui-css',
  express.static(__dirname + '/node_modules/components-jqueryui/themes/smoothness'))
app.use('/jquery-ui',
  express.static(__dirname + '/node_modules/components-jqueryui'))
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist'))
app.use('/jquery-simulate-ext__libs',
  express.static(__dirname + '/node_modules/jquery-simulate-ext/libs'))
app.use('/jquery-simulate-ext__src',
  express.static(__dirname + '/node_modules/jquery-simulate-ext/src'))
app.use('/d3', express.static(__dirname + '/node_modules/d3'))
# Ideally we would do this....
# `app.use('/quaff-lod', express.static(__dirname + '/node_modules/quaff-lod/'))`
# but that fails while quaff-lod is being referenced as a symlink in package.json
quaff_module_path = process.env.QUAFF_PATH or path.join(__dirname,"node_modules","quaff-lod")
app.use('/quaff-lod/quaff-lod-worker-bundle.js',
    express.static(quaff_module_path + "/quaff-lod-worker-bundle.js"))
app.use('/data', express.static(__dirname + '/data'))
app.use('/js', express.static(__dirname + '/js'))
app.use("/jsoutline", express.static(__dirname + "/node_modules/jsoutline/lib"))
app.use('/huviz/vendor', express.static(__dirname + '/vendor'))
app.use('/node_modules', express.static(__dirname + '/node_modules'))
app.use('/huviz/async', express.static(__dirname + '/node_modules/async/lib/'))
app.use('/mocha', express.static(__dirname + '/node_modules/mocha'))
app.use('/chai', express.static(__dirname + '/node_modules/chai'))
app.use('/marked', express.static(__dirname + '/node_modules/marked'))
app.use('/huviz/docs', express.static(__dirname + '/docs'))
app.get("/tab_tester", localOrCDN("/views/tab_tester.html", {nopts: nopts}))
app.get("/search", localOrCDN("/views/search.html.ejs", {nopts: nopts}))
app.get("/boxed", localOrCDN("/views/boxed.html.ejs", {nopts: nopts}))
app.get("/twoup", localOrCDN("/views/twoup.html.ejs", {nopts: nopts}))
app.get("/getalong", localOrCDN("/views/getalong.html.ejs", {nopts: nopts}))
app.get("/tests", localOrCDN("/views/tests.html.ejs", {nopts: nopts}))
app.get("/forcetoy", localOrCDN("/views/forcetoy.html", {nopts: nopts}))
app.get("/", localOrCDN("/views/huvis.html.ejs", {nopts: nopts}))
app.use(express.static(__dirname + '/images')) # for /favicon.ico

# serve /srcdocs/SUMUT.md files as raw markdown
#app.use("/srcdocs/:d.md", express.static(__dirname + '/srcdocs'))
#app.use("/srcdocs/:d", express.static(__dirname + '/srcdocs'))
#app.get("/srcdocs/", (req, res) -> res.redirect("/srcdocs/index.html"))
app.use("/srcdocs",
  express.static("srcdocs", {index: 'index.html', redirect: true, extensions: ['html']}))
port = nopts.port or nopts.argv.remain[0] or process.env.PORT or default_port
console.log("Starting server on localhost:#{port} NODE_ENV:#{process.env.NODE_ENV}")
app.listen(port, 'localhost')
