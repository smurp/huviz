# A controller for the display of the lifecycle of a SPARQL Query
class QueryManager
  constructor: (@qry) ->
    @resultCount = 0
  incrResultCount: ->
    @resultCount++
  colorQuery: (color) ->
    @preJQElem.css('background', color)
  setNoneColor: () ->
    @colorQuery('lightgrey')
  setErrorColor: () ->
    @colorQuery('pink')
  setSuccessColor: () ->
    @colorQuery('lightgreen')
  setKilledColor: () ->
    @setNoneColor()
    @preJQElem.css('color', 'white')
  displayError: (e) ->
    console.warn(e)
    @qryJQElem.append("""<div class="queryError">#{e}</div>""")
  fatalError: (e) ->
    @cancelAnimation()
    @displayError(e)
    @setErrorColor()
    console.error(e)
  displayResults: (results) ->
    @qryJQElem.append("""<div class="queryResults">#{results}</div>""")
  finishCounting: ->
    @setResultCount(@resultCount)
  setResultCount: (count) ->
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
