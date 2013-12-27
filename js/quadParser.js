//var events = require('events')
//var events = require('EventEmitter')
//var Lazy=require("lazy");

//var events = {'EventEmitter':EventEmitter};
/*
function QuadParser(str) {
    var self = this;
    events.EventEmitter.call(this);
    this._lzy = {"lines":str.split("\n")};
    return this;
}

QuadParser.super_ = events.EventEmitter;
QuadParser.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
        value: QuadParser,
        enumerable: false
    }
});

QuadParser.prototype.parse = function(){
    console.log("this",this);
    self = this;
    this._lzy.lines
    .forEach(
	function(line) 
	{
            //console.log(line);
            if (line != null && line != undefined) {
                var str = line.toString() + "\n";
                var quad = parseQuadLine(str);
                console.log('quad good',quad);
                if (quad != null) {
		    console.log('thiis',self);
                    self.emit("quad", quad);
                }
            }
	}
    );
    self.emit("end")
}
*/
function Quad(subject,pred,obj,graph) {
    this.s = new RdfUri(subject);
    this.p = new RdfUri(pred);
    this.o = new RdfObject(obj);
    this.g = new RdfUri(graph);
}
Quad.prototype.toString = function() {
    return '<' + this.s + '> <' + this.p + '> ' + this.o + ' <' + this.g + '> .\n'
}
Quad.prototype.toNQuadString = function() {
    return '<' + this.s + '> <' + this.p + '> ' + this.o + ' <' + this.g + '> .\n'
}


var uriRegex = /<([^>]*)>/ ;

function RdfUri(url) {
    self = this;
    var match = url.match(uriRegex);
    if (match) {
        self.raw = match[1];
    } else {
        self.raw = url;
    }
}
RdfUri.prototype.toString = function() {
    return this.raw;
}

function RdfObject(val) {    
    self = this;
    var match = val.match(uriRegex);
    if (match) {
        self.raw = match[1];
        self.type = 'uri';
    } else {
        self.raw = val;
        self.type = 'literal';
    }
}
RdfObject.prototype.toString = function() {
    return this.raw;
}
RdfObject.prototype.isUri = function() {
    return this.type == 'uri';
}
RdfObject.prototype.isLiteral = function() {
    return this.type == 'literal';
}

var quadRegex = /\s*(<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>)\s*(".*"?|<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>).*\s*\.\s*\#*.*$/ ;
var isComment = /^\s*\/\// ;

function parseQuadLine(line) {
    if (line == null || line === "" || line.match(isComment)) {
        return null;
    } else {
	//console.log ("parseQuadLine(",line,")");
        var match = line.match(quadRegex);
	//console.log("match",match,line);
        if (match){
            var s = match[1].trim();
            var p = match[2].trim();
            var o = match[3].trim();
            var g = match[4].trim();
            return new Quad(s,p,o,g);
	//} else {
	//    console.log("no match: "+line);
	}
    }
}
