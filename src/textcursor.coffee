class TextCursor
  fillStyle: "black"
  face: "sans-serif"
  width: 128
  height: 32
  scale: .3
  constructor: (@elem, text) ->
    @cache = {}
    @set_text(text)
    @paused = false
    @last_text = ""
  font_height: ->
    return @height * @scale
  set_text: (text) ->
    #console.log("set_text(#{text.replace("\n", "\\n")})")
    if text
      if not @cache[text]?
        @cache[text] = @make_img(text)
      url = @cache[text]
      cursor = "url(#{url}) 0 #{@font_height()}, default"
    else
      cursor = "default"
    @last_text = text
    if not @paused
      @set_cursor(cursor)
  pause: (cursor) ->
    @paused = true
    @set_cursor(cursor)
  continue: ->
    @paused = false
    @set_text(@last_text)
  set_cursor: (cursor) ->
    #console.log("set_cursor(#{@elem})", cursor)
    $(@elem).css("cursor", cursor)
  make_img: (text) ->
    # TODO make a speech bubble sort of thing of low opacity but text of high
    #    http://stackoverflow.com/a/8001254/1234699
    #    http://www.scriptol.com/html5/canvas/speech-bubble.php
    id = "temp_TextCursor_canvas"
    sel = "##{id}"
    $('<canvas>', {id: id}).appendTo("body")
    @canvas = $(sel)[0]
    @canvas.width = @width
    @canvas.height = @height
    @ctx = @canvas.getContext("2d")
    @ctx.clearRect 0, 0, @width, @height
    @ctx.translate 0, @font_height()
    @ctx.fillStyle = @fillStyle
    @ctx.font = "#{@font_height()}px #{@face}"
    @ctx.textAlign = 'left'
    lines = text.split("\n")
    for line,i in lines
      if line
        voffset = @font_height() * i
        #console.log("line":line, "i:",i, "voffset:",voffset)
        @ctx.fillText line, 0, voffset
    url = @canvas.toDataURL("image/png")
    #url = "http://www.smurp.com/smurp_headon.jpg"
    #$("<img>", {src: url}).appendTo("#gclui")
    cursor = "url(#{url}), help"
    #$("#gclui").css("cursor", cursor)
    $(@canvas).remove()
    return url

(exports ? this).TextCursor = TextCursor
