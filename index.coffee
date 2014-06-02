
#require("coffee-script")
stitch  = require("stitch")
express = require("express")
argv    = process.argv.slice(2)

ss = require('./js/sortedset')
oink = ss.SortedSet()

pkg = stitch.createPackage(
  # Specify the paths you want Stitch to automatically bundle up
  paths: [ __dirname + "/src" ]

  # Specify your base libraries
  dependencies: [
    __dirname + '/node_modules/async/lib/async.js',
    __dirname + '/js/sortedset.js',
    __dirname + '/js/hsv.js',
    __dirname + '/js/hsl.js',
    __dirname + '/lib/d3.v3.min.js', # before fisheye
    __dirname + '/lib/fisheye.js',
    #__dirname + '/lib/jq.min.js',
    __dirname + '/lib/green_turtle.js'
    __dirname + '/js/quadParser.js'    
  ]
)
app = express.createServer()

# a package for code2flow to visualize
just_huviz = stitch.createPackage(
  paths: [ __dirname + "/src" ]
  dependencies: [
    __dirname + '/js/sortedset.js',
  ]
)

xpath = require('xpath') # https://www.npmjs.org/package/xpath
dom = require('xmldom').DOMParser  # https://github.com/jindw/xmldom
fs = require('fs')
createSnippetServer = (xmlFileName) ->
  doc = null
  makeXmlDoc = (err, data) ->
    if err
      console.error err
    else
      console.log "parsing #{xmlFileName}..."
      started = new Date().getTime() / 1000
      doc = new dom().parseFromString(data.toString())
      finished = new Date().getTime() / 1000
      console.log "finished parsing #{xmlFileName} in #{finished - started} sec"
  getSnippetById = (req, res) ->
    if doc
      started = new Date().getTime()
      console.log "xpath select #{ req.params.id }"
      nodes = xpath.select("//*[@id='#{req.params.id}']", doc)
      finished = new Date().getTime()
      sec = (finished - started) / 1000
      if nodes.length > 0
        snippet = nodes[0].toString()
        console.log "found #{ req.params.id } in #{sec} sec"
        res.send(snippet)
      else
        res.send("not found")
    else
      res.send("doc still parsing")
  fs.readFile(xmlFileName, makeXmlDoc)
  return getSnippetById

app.configure ->
  app.use express.logger()
  app.set "views", __dirname + "/views"
  app.use app.router
  #app.use express.static(__dirname + "/public")
  app.use express.static(__dirname)
  #app.use express.static(__dirname + '/js')
  app.use express.static(__dirname + '/lib')
  app.use express.static(__dirname + '/data')
  app.use express.static(__dirname + '/docs')
  app.use express.static(__dirname + '/node_modules')
  #app.get "/application.js", pkg.createServer()
  app.get "/just_huviz.js", just_huviz.createServer()
  app.get "/snippet/poetesses/:id([A-Za-z0-9-]+)/",
      createSnippetServer("poetesses_decomposed.xml")

port = argv[0] or process.env.PORT or 9999
if not ('--skip_orlando' in argv)
  app.get "/snippet/orlando/:id([A-Za-z0-9-]+)/",
      createSnippetServer("orlando_all_entries_2013-03-04.xml")

console.log "Starting server on port: #{port}"
app.listen port