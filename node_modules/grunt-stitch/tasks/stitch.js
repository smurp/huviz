/*
 * grunt-stitch
 * https://github.com/cezary/grunt-stitch
 *
 * Copyright (c) 2013 Cezary Wojtkowski
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs'),
    stitch = require('stitch'),
    gruntRef;

module.exports = function(grunt) {
  gruntRef = grunt;

  grunt.registerTask('stitch', 'Compile common.js modules with stitch.', function() {
    var done = this.async();

    var options = this.options();

    //try {
      //var _ = require('underscore');
      //stitch.compilers.ejs = function(module, filename) {
        //var content = _.template(fs.readFileSync(filename, 'utf8')).source;
        //module._compile('module.exports = '+content, filename);
      //};
    //}
    //catch (err) {}

    stitch.createPackage(options).compile(function(err, source) {
      if (err) {
        grunt.log.error(err);
      }

      fs.writeFile(options.dest, source, function(err) {
        if (err) {
          grunt.log.error(err);
        } else {
          grunt.log.writeln("File \""+options.dest+"\" created.");
        }

        done();
      });
    });
  });
};
