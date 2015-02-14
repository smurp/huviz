class TextCursor
  constructor: (elem, text) ->
    if not text?
      text = ""
    @cursor = $(elem).append('div')
    @set_text(text)
    $(document).bind 'mousemove', (e) =>
      $(@cursor).css
       left:  e.pageX
       top:   e.pageY - 8
       position: 'absolute'
       float: 'left'
       'font-size': '2em'
   set_text: (text) ->
     @cursor.text(text)

(exports ? this).TextCursor = TextCursor
