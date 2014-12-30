module.exports = (grunt) ->
  grunt.initConfig
    stitch:
      options:
        paths: ['src']
        dependencies: ['js/sortedSet.js', 'js/hsv.js', 'js/hsl.js', 'vendor/fisheye.js', 'vendor/green_turtle.js', 'js/quadParser.js']
        dest: 'lib/huviz.js'
    watch:
      scripts:
        files: ['src/*.coffee', 'js/*.js', 'Gruntfile.coffee']        
        tasks: ['stitch']
        options:
          spawn: false
    release:
      options:
        npm: false
        github:
          repo: 'smurp/huviz'
          usernameVar: 'GITHUB_USERNAME'
          passwordVar: 'GITHUB_PASSWORD'
  grunt.loadNpmTasks('grunt-stitch')
  grunt.loadNpmTasks('grunt-release')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.registerTask 'default', ['stitch']
