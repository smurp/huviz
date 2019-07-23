/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

class QuadParser {
  constructor(str_or_stream) {
    events.EventEmitter.call(this);    
    //addEventListener
    if (typeof str_or_stream !== 'string') {
      throw new Error("QuadParser(stream) not yet supported");
    }
    this._lzy = {lines: str_or_stream.split("\n")};
    this;
  }
}

//console.log(line);
const Quad = function(subject, pred, obj, graph) {
  this.s = new RdfUri(subject);
  this.p = new RdfUri(pred);
  this.o = new RdfObject(obj);
  return this.g = new RdfUri(graph);
};
var RdfUri = function(url) {
  const self = this;
  const match = url.match(uriRegex);
  if (match) {
    return self.raw = match[1];
  } else {
    return self.raw = url;
  }
};
var RdfObject = function(val) {
  const self = this;
  const match = val.match(uriRegex);
  if (match) {
    self.raw = match[1];
    return self.type = "uri";
  } else {
    self.raw = val;
    return self.type = "literal";
  }
};
const parseQuadLine = function(line) {
  if ((line == null) || (line === "") || line.match(isComment)) {
    return null;
  } else {
    //console.log ("parseQuadLine(",line,")");
    const match = line.match(quadRegex);
    //console.log("match",match);
    if (match) {
      const s = match[1].trim();
      const p = match[2].trim();
      const o = match[3].trim();
      const g = match[4].trim();
      return new Quad(s, p, o, g);
    } else {
      return console.log(`no match: ${line}`);
    }
  }
};
QuadParser.super_ = events.EventEmitter;
QuadParser.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: QuadParser,
    enumerable: false
  }
}
);
QuadParser.prototype.parse = function() {
  console.log("this", this);
  this._lzy.lines.forEach(function(line) {
    if ((line != null) && (line !== undefined)) {
      const str = line.toString() + "\n";
      const quad = parseQuadLine(str);
      console.log("quad good", quad);
      if (quad != null) { return this.emit("quad", quad); }
    }
  });

  return this.emit("end");
};

Quad.prototype.toString = function() {
  return `<${this.s}> <${this.p}> ${this.o} <${this.g}> .\n`;
};

Quad.prototype.toNQuadString = function() {
  return `<${this.s}> <${this.p}> ${this.o} <${this.g}> .\n`;
};

var uriRegex = /<([^>]*)>/;
RdfUri.prototype.toString = function() {
  return this.raw;
};

RdfObject.prototype.toString = function() {
  return this.raw;
};

RdfObject.prototype.isUri = function() {
  return this.type === "uri";
};

RdfObject.prototype.isLiteral = function() {
  return this.type === "literal";
};

var quadRegex = /\s*(<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>)\s*(".*"?|<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>).*\s*\.\s*$/;
var isComment = /^\s*\/\//;

// (exports ? this).QuadParser = QuadParser
//
// This coffeescript version has been replaced by the javascript version in js/quadParser.js
// 
