module.exports = (grunt) ->
  grunt.initConfig
    coffee:
      compile:
        files:
          'server.js': 'server.coffee'
    express:
      options:
        port: 9997
        delay: 300
        script: "server.js"
      dev:
        options:
          node_env: "development"
      prod:
        options:
          node_env: "production"
    stitch:
      options:
        paths: ['src']
        dependencies: ['js/sortedSet.js', 'js/hsv.js', 'js/hsl.js', 'vendor/fisheye.js', 'js/quadParser.js']
        dest: 'lib/huviz.js'
    watch:
      scripts:
        files: ['src/*.coffee', 'js/*.js', 'Gruntfile.coffee', 'server.coffee', 'views/*.eco']
        tasks: ['coffee', 'stitch', 'express:dev']
        options:
          atBegin: true
          debounceDelay: 250
          livereload:
            port: 35731
          spawn: false
    release:
      options:
        npm: false
        github:
          repo: 'smurp/huviz'
          #usernameVar: 'GITHUB_USERNAME'
          #passwordVar: 'GITHUB_PASSWORD'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-express-server'
  grunt.loadNpmTasks 'grunt-release'
  grunt.loadNpmTasks 'grunt-stitch'
  grunt.registerTask 'default', ['express:prod']
  grunt.registerTask 'dev', ['watch']
