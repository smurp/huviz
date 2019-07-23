module.exports = (grunt) ->
  grunt.initConfig
    coffee:
      compile:
        files:
          'tests/mammalia.js': 'tests/mammalia.coffee'
    release:
      options:
        npm: false
        github:
          repo: 'smurp/jsoutline'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-release'
