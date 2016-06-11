# Usage:
#   txtcrsr = new TextCursor(".graph_control input", "click input for fun")
class TextCursor
  fontFillStyle: "black"
  bgFillStyle: "Yellow"
  bgGlobalAlpha: 0.6
  borderStrokeStyle: "black"
  face: "sans-serif"
  width: 128
  height: 32
  scale: .3
  pointer_height: 6
  constructor: (@elem, text) ->
    @cache = {}
    @set_text(text)
    @paused = false
    @last_text = ""
  font_height: ->
    return @height * @scale
  set_text: (text, temp) ->
    #console.log("set_text(#{text.replace("\n", "\\n")})")
    if text
      if not @cache[text]?
        @cache[text] = @make_img(text)
      url = @cache[text]
      #cursor = "url(#{url}) 0 #{@font_height()}, default"
      cursor = "url(#{url}) #{@pointer_height} 0, default"
    else
      cursor = "default"
    if not temp?
      @last_text = text
    if not @paused
      @set_cursor(cursor)
  pause: (cursor, text) ->
    @paused = false # so @set_cursor will run if set_text called
    if text?
      @set_text(text, true)
    else
      @set_cursor(cursor)
    @paused = true
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
    inset = 3
    top = 10

    @ctx.translate 0, @font_height()
    @ctx.fillStyle = @fontFillStyle
    @ctx.font = "#{@font_height()}px #{@face}"
    @ctx.textAlign = 'left'
    lines = text.split("\n")
    max_width = 0
    for line,i in lines
      if line
        voffset = @font_height() * i + top
        max_width = Math.max(@ctx.measureText(line).width, max_width)
    height = @font_height() * lines.length + inset
    @draw_bubble(inset, top,
                 max_width + inset * 4, height,
                 @pointer_height, @font_height()/2)
    for line,i in lines
      if line
        voffset = @font_height() * i + top
        @ctx.fillText line, top, voffset
    url = @canvas.toDataURL("image/png")
    #url = "http://www.smurp.com/smurp_headon.jpg"
    #$("<img>", {src: url}).appendTo("#gclui")
    cursor = "url(#{url}), help"
    #$("#gclui").css("cursor", cursor)
    $(@canvas).remove()
    return url
  draw_bubble: (x, y, w, h, pointer_height, radius) ->
    ###
    http://www.scriptol.com/html5/canvas/speech-bubble.php
    ###
    r = x + w
    b = y + h
    @ctx.save()
    @ctx.translate 0, @font_height() * -1
    @ctx.beginPath()
    @ctx.moveTo(x + radius, y)
    @ctx.lineTo(x + radius / 2, y - pointer_height)
    @ctx.lineTo(x + radius * 2, y)
    @ctx.lineTo(r - radius, y)
    @ctx.quadraticCurveTo(r, y, r, y + radius)
    @ctx.lineTo(r, y + h - radius)
    @ctx.quadraticCurveTo(r, b, r - radius, b)
    @ctx.lineTo(x + radius, b)
    @ctx.quadraticCurveTo(x, b, x, b - radius)
    @ctx.lineTo(x, y + radius)
    @ctx.quadraticCurveTo(x, y, x + radius, y)
    @ctx.closePath()
    if @bgGlobalAlpha?
      @ctx.save()
      @ctx.globalAlpha = @bgGlobalAlpha
      if @bgFillStyle?
        @ctx.fillStyle = @bgFillStyle
        @ctx.fill()
      @ctx.restore()
    @ctx.lineWidth = 1
    @ctx.strokeStyle = @borderStrokeStyle
    @ctx.stroke()
    @ctx.restore()


(exports ? this).TextCursor = TextCursor
