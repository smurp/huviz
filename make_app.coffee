
stitch  = require("stitch")
fs = require('fs')

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
pkg.compile (err, src) ->
  pth = 'lib/application.js'
  fs.writeFile pth, src, (err) ->
    if err
      throw err
    console.log "wrote #{src.length} bytes to '#{pth}' #{new Date()}"

