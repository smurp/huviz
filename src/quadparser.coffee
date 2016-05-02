
class QuadParser
  constructor: (str_or_stream) ->
    events.EventEmitter.call this    
    #addEventListener
    if typeof str_or_stream isnt 'string'
      throw new Error("QuadParser(stream) not yet supported")
    @_lzy = lines: str_or_stream.split("\n")
    this

#console.log(line);
Quad = (subject, pred, obj, graph) ->
  @s = new RdfUri(subject)
  @p = new RdfUri(pred)
  @o = new RdfObject(obj)
  @g = new RdfUri(graph)
RdfUri = (url) ->
  self = this
  match = url.match(uriRegex)
  if match
    self.raw = match[1]
  else
    self.raw = url
RdfObject = (val) ->
  self = this
  match = val.match(uriRegex)
  if match
    self.raw = match[1]
    self.type = "uri"
  else
    self.raw = val
    self.type = "literal"
parseQuadLine = (line) ->
  if not line? or line is "" or line.match(isComment)
    null
  else
    #console.log ("parseQuadLine(",line,")");
    match = line.match(quadRegex)
    #console.log("match",match);
    if match
      s = match[1].trim()
      p = match[2].trim()
      o = match[3].trim()
      g = match[4].trim()
      new Quad(s, p, o, g)
    else
      console.log "no match: " + line
QuadParser.super_ = events.EventEmitter
QuadParser:: = Object.create(events.EventEmitter::,
  constructor:
    value: QuadParser
    enumerable: false
)
QuadParser::parse = ->
  console.log "this", this
  @_lzy.lines.forEach (line) ->
    if line? and line isnt `undefined`
      str = line.toString() + "\n"
      quad = parseQuadLine(str)
      console.log "quad good", quad
      @emit "quad", quad  if quad?

  @emit "end"

Quad::toString = ->
  "<" + @s + "> <" + @p + "> " + @o + " <" + @g + "> .\n"

Quad::toNQuadString = ->
  "<" + @s + "> <" + @p + "> " + @o + " <" + @g + "> .\n"

uriRegex = /<([^>]*)>/
RdfUri::toString = ->
  @raw

RdfObject::toString = ->
  @raw

RdfObject::isUri = ->
  @type is "uri"

RdfObject::isLiteral = ->
  @type is "literal"

quadRegex = /\s*(<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>)\s*(".*"?|<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>).*\s*\.\s*$/
isComment = /^\s*\/\//

# (exports ? this).QuadParser = QuadParser
#
# This coffeescript version has been replaced by the javascript version in js/quadParser.js
# 
