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
  when_done: (listener) ->
    @listeners.push(listener)
  call_done_listeners: ->
    while (listener = @listeners.shift())
      setTimeout(listener, 10)
  incrResultCount: ->
    @resultCount++
  styleQuery: (color, style) ->
    @preJQElem.css('background', color).addClass(style)
  setNoneColor: () ->
    @styleQuery('#d3d3d357','result-none') # no result 'light grey'
  setErrorColor: () ->
    @styleQuery('#f9e7ea', 'result-error') # Error 'pink'
  setSuccessColor: () ->
    @styleQuery('#e6f9e6','result-success') # Success 'green'
  setKilledColor: () ->
    @setNoneColor()
    @preJQElem.css('color', 'white').addClass('result-empty')
  displayError: (e) ->
    console.warn(e)
    @qryJQElem.append("""<div class="query-error">#{e}</div>""")
  fatalError: (e) ->
    @set_state('done')
    @cancelAnimation()
    @displayError(e)
    @setErrorColor()
    #console.error(e)
  displayResults: (results) ->
    @qryJQElem.append("""<div class="query-results">#{results}</div>""")
  finishCounting: ->
    @setResultCount(@resultCount)
  setResultCount: (count) ->
    @set_state('done')
    @resultCount = count
    @displayResults("result count: #{@resultCount}")
    if count is 0
      @setNoneColor()
    else if count > 0
      @setSuccessColor()
  setXHR: (@xhr) ->
  abortXHR: ->
    @xhr.abort()
  cancelAnimation: ->
    @anim.cancel()
  kill: ->
    @abortXHR()
    @cancelAnimation()
    @setKilledColor()

(exports ? this).QueryManager = QueryManager
