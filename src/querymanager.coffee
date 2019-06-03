
# A controller for the display of the lifecycle of a SPARQL Query
class QueryManager
  constructor: (@qry) ->
  colorQuery: (color) ->
    @preJQElem.css('background', color)
  setNoneColor: () ->
    @colorQuery('lightgrey')
  setErrorColor: () ->
    @colorQuery('pink')
  setSuccessColor: () ->
    @colorQuery('lightgreen')
  displayError: (e) ->
    console.warn(e)
    @qryJQElem.append("""<div class="queryError">#{e}</div>""")
  displayResults: (results) ->
    @qryJQElem.append("""<div class="queryResults">#{results}</div>""")
  setResultCount: (count) ->
    @resultCount = count
    @displayResults("result count: #{@resultCount}")
    if count is 0
      @setNoneColor()
    else if count > 0
      @setSuccessColor()

(exports ? this).QueryManager = QueryManager
