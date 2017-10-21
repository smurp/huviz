"use strict";

function OnceRunner(verbose) {
  this.verbose = verbose || false;
};

OnceRunner.prototype.setTimeout = function(cb, msec) {
  //console.log(`afterMsec_call(${msec}) typeof cb ==>`,typeof cb);
  if (this.timeoutID) {
    if (this.verbose) {
      console.warn("clearTimeout()", this.timeoutID._idleStart || this.timeoutID);
    }
    clearTimeout(this.timeoutID);
  }
  //cb = function() {console.log("mockFunc() called")};
  return this.timeoutID = setTimeout(this.makeWrapper(cb), msec);
};

OnceRunner.prototype.makeWrapper = function(callback) {
  var self = this;
  return function() {
    if (self.verbose) {
      console.warn("calling callback ",self.timeoutID._idleStart || self.timeoutID);
    }
    callback();
    };
};

(typeof exports !== "undefined" && exports !== null ? exports : this).OnceRunner = OnceRunner;
