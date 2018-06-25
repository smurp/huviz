"use strict";

var chai = require('chai');
var expect = chai.expect;

var OnceRunner = require('../js/oncerunner').OnceRunner;

describe('OnceRunner', function() {
  it("clears superceded call attempts", function(done) {
    var runner = new OnceRunner();
    var doit = function() {
      done();
    };
    runner.setTimeout(doit, 1);
    runner.setTimeout(doit, 1);
    runner.setTimeout(doit, 1);
    runner.setTimeout(doit, 1);
  });

  it("runs again if the later call is after the timeout", function(done) {
    var runner = new OnceRunner();
    var firstCount = 0;
    const first = function() {
      firstCount++;
      if (firstCount > 1) {
        throw new Error(`there can be only one (call to first()) not ${firstCount}`);
      }
    }
    const last = function() {
      if (firstCount == 1) {
        done();
      } else {
        console.log(`first() was run ${firstCount} times`);
      }
    };
    runner.setTimeout(first, 1);
    runner.setTimeout(first, 1);
    runner.setTimeout(first, 1);
    runner.setTimeout(first, 1);
    //TODO make a test to confirm that the callback is only called once, as in...
    //first(); // calling first() directly throws "there can be only one..." as it ought
    const runLast = function() {runner.setTimeout(last, 1);}
    setTimeout(runLast, 50) // wait 50 msec then run last
  });
});
