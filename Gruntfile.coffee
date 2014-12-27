module.exports = (grunt) ->
  grunt.initConfig
    stitch:
      options:
        paths: ['src']
        dependencies: ['node_modules/async/lib/async.js', 'js/sortedSet.js', 'js/hsv.js', 'js/hsl.js', 'lib/fisheye.js', 'lib/green_turtle.js', 'js/quadParser.js']
        dest: 'application.js'
    watch:
      scripts:
        files: ['src/*.coffee']
        tasks: ['stitch']
        options:
          spawn: false
  grunt.loadNpmTasks('grunt-stitch');  
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask 'default', ['stitch']
