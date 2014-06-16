#Simple script to send a SPARQL query to our SPARQL endpoint on our Mulgara triplestore and output the result
#Modified from the example on p. 209 of Learning SPARQL, O'Reilly, Bob DuCharme

import urllib2

endpointURL = "http://cwrc-apps-03.srv.ualberta.ca:8088/sparql/"
query = """
SELECT ?x
FROM <all>
WHERE {?x ?y ?z}
"""

escapedQuery = urllib2.quote(query)
print escapedQuery

requestURL = endpointURL + "?query=" + escapedQuery
print requestURL

request = urllib2.Request(requestURL)

result = urllib2.urlopen(request)
print result.read()