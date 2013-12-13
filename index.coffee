
#require("coffee-script")
stitch  = require("stitch")
express = require("express")
argv    = process.argv.slice(2)

ss = require('./js/sortedset')
oink = ss.SortedSet()
#oink.isFlag('oink')
#console.log oink

pkg = stitch.createPackage(
  # Specify the paths you want Stitch to automatically bundle up
  paths: [ __dirname + "/src" ]

  # Specify your base libraries
  dependencies: [
    __dirname + '/js/sortedset.js',
    __dirname + '/lib/d3.v3.min.js', # before fisheye
    __dirname + '/lib/fisheye.js',
    __dirname + '/lib/jq.min.js',
    __dirname + '/lib/green_turtle.js'

    #__dirname + '/node_modules/express/lib/utils.js',
    #__dirname + '/node_modules/rdfquads/node_modules/lazy/lazy.js',
    #__dirname + '/node_modules/rdfquads/lib/quadParser.js',

  ]
)
app = express.createServer()

app.configure ->
  app.use express.logger()
  app.set "views", __dirname + "/views"
  app.use app.router
  #app.use express.static(__dirname + "/public")
  app.use express.static(__dirname)
  app.use express.static(__dirname + '/js')
  app.use express.static(__dirname + '/lib')
  app.use express.static(__dirname + '/data')
  app.use express.static(__dirname + '/docs')
  #app.use express.static(__dirname + '/node_modules')  
  app.get "/application.js", pkg.createServer()

port = argv[0] or process.env.PORT or 10000
console.log "Starting server on port: #{port}"
app.listen port