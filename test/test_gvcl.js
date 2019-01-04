"use strict";
var chai = require("chai");
var expect = chai.expect;
var GVCL = require('../js/gvcl').GVCL;

describe("GVCL", function() {
  this.bail(process.env.BAIL || false);
  it("Parses 'Verb Noun' commands", function() {
    let selThing = new GVCL('Select Thing .');
    expect(selThing.ast).to.be.ok();
  })
  it("Parses 'Verb and Verb Noun' commands", function() {
    let selThing = new GVCL('Select and Label Thing .');
    expect(selThing.ast).to.be.ok();
  })
  it("Parses 'Verb, Verb and Verb Noun' commands", function() {
    let selThing = new GVCL('Select, Label and Pin Thing .');
    expect(selThing.ast).to.be.ok();
  })
  it("Parses 'Verb Noun and Noun' commands", function() {
    let selThing = new GVCL('Select Thing and Thing2.');
    expect(selThing.ast).to.be.ok();
  })
});
