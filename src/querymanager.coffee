# A controller for the display of the lifecycle of a SPARQL Query
class QueryManager
  constructor: (@qry) ->
    @set_state('new')
    @listeners ?= []
    @resultCount = 0
  set_state: (state) ->
    @_state = state
    if state is 'done'
      @call_done_listeners()
    return
  when_done: (listener) ->
    @listeners.push(listener)
    return
  call_done_listeners: ->
    while (listener = @listeners.shift())
      setTimeout(listener, 10)
    return
  incrResultCount: -> # TODO delete if unused
    return @resultCount++
  styleQuery: (color, style) ->
    @preJQElem.css('background', color).addClass(style)
    return
  setNoneColor: () ->
    @styleQuery('#d3d3d357','result-none') # no result 'light grey'
    return
  setErrorColor: () ->
    @styleQuery('#f9e7ea', 'result-error') # Error 'pink'
    return
  setSuccessColor: () ->
    @styleQuery('#e6f9e6','result-success') # Success 'green'
    return
  setKilledColor: () ->
    @setNoneColor()
    @preJQElem.css('color', 'white').addClass('result-empty')
    return
  displayError: (e) ->
    console.warn(e)
    @qryJQElem.append("""<div class="query-error">#{e}</div>""")
    return
  fatalError: (e) ->
    @set_state('done')
    @cancelAnimation()
    @displayError(e)
    @setErrorColor()
    return
  displayResults: (results) ->
    @qryJQElem.append("""<div class="query-results">#{results}</div>""")
    return
  finishCounting: ->
    @setResultCount(@resultCount)
    return
  setResultCount: (count) ->
    @set_state('done')
    @resultCount = count
    @displayResults("result count: #{@resultCount}")
    if count is 0
      @setNoneColor()
    else if count > 0
      @setSuccessColor()
    return
  setXHR: (@xhr) ->
    return
  abortXHR: ->
    @xhr.abort()
    return
  cancelAnimation: ->
    @anim.cancel()
    return
  kill: ->
    @abortXHR()
    @cancelAnimation()
    @setKilledColor()
    return

(exports ? this).QueryManager = QueryManager
