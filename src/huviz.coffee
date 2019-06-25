
#See for inspiration:
#  Collapsible Force Layout
#    http://bl.ocks.org/mbostock/1093130
#  Force-based label placement
#    http://bl.ocks.org/MoritzStefaner/1377729
#  Graph with labeled edges:
#    http://bl.ocks.org/jhb/5955887
#  Multi-Focus Layout:
#    http://bl.ocks.org/mbostock/1021953
#  Edge Labels
#    http://bl.ocks.org/jhb/5955887
#
#  Shelf -- around the graph, the ring of nodes which serves as reorderable menu
#  Discard Bin -- a jail to contain nodes one does not want to be bothered by
#
#  Commands on nodes
#     choose/shelve     -- graph or remove from graph
#     choose - add to graph and show all edges
#     unchoose - hide all edges except those to 'chosen' nodes
#                this will shelve (or hide if previously hidden)
#                those nodes which end up no longer being connected
#                to anything
#     discard/retrieve    -- throw away or recover
#     label/unlabel       -- shows labels or hides them
#     substantiate/redact -- shows source text or hides it
#     expand/contract     -- show all links or collapse them
#
# TODO(smurp) implement emphasize and deemphasize 'verbs' (we need a new word)
#   emphasize: (node,predicate,color) =>
#   deemphasize: (node,predicate,color) =>
#   pin/unpin
#
# TODO(smurp) break out verbs as instances of class Verb, support loading of verbs
#
# TODO: perhaps there is a distinction to be made between verbs
#   and 'actuators' where verbs are the things that people issue
#   while actuators (actions?) are the one-or-more things per-verb that
#   constitute the implementation of the verb.  The motivations are:
#     a) that actuators may be shared between verbs
#     b) multiple actuators might be needed per verb
#     c) there might be applications for actuators other than verbs
#     d) there might be update operations against gclui apart from actuators
#
# Immediate Priorities:
# 120) BUG: hidden nodes are hidden but are also detectable via TextCursor
# 118) TASK: add setting for "'chosen' border thickness (px)"
# 116) BUG: stop truncating verbs lists longer than 2 in TextCursor: use grid
# 115) TASK: add ColorTreepicker [+] and [-] boxes for 'show' and 'unshow'
# 114) TASK: make text_cursor show detailed stuff when in Commands and Settings
# 113) TASK: why is CP "Poetry" in abdyma.nq not shelved?
# 107) TASK: minimize hits on TextCursor by only calling it when verbs change
#            not whenever @focused_node changes
# 104) TASK: remove no-longer-needed text_cursor calls
#  40) TASK: support search better, show matches continuously
#  79) TASK: support dragging of edges to shelf or discard bin
#  97) TASK: integrate blanket for code coverage http://goo.gl/tH4Ghk
#  93) BUG: toggling a predicate should toggle indirect-mixed on its supers
#  92) BUG: non-empty predicates should not have payload '0/0' after kid click
#  94) TASK: show_msg() during command.run to inform user and prevent clicks
#  95) TASK: get /orlonto.html working smoothly again
#  90) BUG: english is no longer minimal
#  91) BUG: mocha async being misused re done(), so the passes count is wrong
#  86) BUG: try_to_set_node_type: only permit subtypes to override supertypes
#  87) BUG: solve node.type vs node.taxon sync problem (see orlonto)
#  46) TASK: impute node type based on predicates via ontology DONE???
#  53) PERF: should_show_label should not have search_regex in inner loop
#  65) BUG: hidden nodes are not fully ignored on the shelf so shelved nodes
#           are not always the focused node
#  68) TASK: optimize update_english
#  69) TASK: figure out ideal root for predicate hierarchy -- owl:Property?
#  70) TASK: make owl:Thing implicit root class
#            ie: have Taxons be subClassOf owl:Thing unless replaced
#  72) TASK: consolidate type and taxon links from node?
#  74) TASK: recover from loading crashes with Cancel button on show_state_msg
#  76) TASK: consider renaming graphed_set to connected_set and verbs
#            choose/unchoose to graph/ungraph
#  84) TASK: add an unchosen_set containing the graphed but not chosen nodes
#
# Eventual Tasks:
#  85) TASK: move SVG, Canvas and WebGL renderers to own pluggable Renderer subclasses
#  75) TASK: implement real script parser
#   4) TASK: Suppress all but the 6-letter id of writers in the cmd cli
#  14) TASK: it takes time for clicks on the predicate picker to finish;
#      showing a busy cursor or a special state for the selected div
#      would help the user have faith.
#      (Investigate possible inefficiencies, too.)
#      AKA: fix bad-layout-until-drag-and-drop bug
#  18) TASK: drop a node on another node to draw their mutual edges only
#  19) TASK: progressive documentation (context sensitive tips and intros)
#  25) TASK: debug wait cursor when slow operations are happening, maybe
#      prevent starting operations when slow stuff is underway
#      AKA: show waiting cursor during verb execution
#  30) TASK: Stop passing (node, change, old_node_status, new_node_status) to
#      Taxon.update_state() because it never seems to be needed
#  35) TASK: get rid of jquery
#  37) TASK: fix Bronte names, ie unicode
#  41) TASK: link to new backend
#  51) TASK: make predicate picker height adjustable
#  55) TASK: clicking an edge for a snippet already shown should add that
#            triple line to the snippet box and bring the box forward
#            (ideally using css animation to flash the triple and scroll to it)
#  56) TASK: improve layout of the snippet box so the subj is on the first line
#            and subsequent lines show (indented) predicate-object pairs for
#            each triple which cites the snippet
#  57) TASK: hover over node on shelf shows edges to graphed and shelved nodes
#  61) TASK: make a settings controller for edge label (em) (or mag?)
#  66) BUG: #load+/data/ballrm.nq fails to populate the predicate picker
#  67) TASK: add verbs pin/unpin (using polar coords to record placement)
#
angliciser = require('angliciser').angliciser
uniquer = require("uniquer").uniquer # FIXME rename to make_dom_safe_id
gcl = require('graphcommandlanguage')
#asyncLoop = require('asynchronizer').asyncLoop
CommandController = require('gclui').CommandController
EditController = require('editui').EditController
#FiniteStateMachine = require('fsm').FiniteStateMachine
IndexedDBService = require('indexeddbservice').IndexedDBService
IndexedDBStorageController = require('indexeddbstoragecontroller').IndexedDBStorageController
Edge = require('edge').Edge
GraphCommandLanguageCtrl = require('graphcommandlanguage').GraphCommandLanguageCtrl
GreenerTurtle = require('greenerturtle').GreenerTurtle
Node = require('node').Node
Predicate = require('predicate').Predicate
Taxon = require('taxon').Taxon
TextCursor = require('textcursor').TextCursor

MultiString.set_langpath('en:fr') # TODO make this a setting

# It is as if these imports were happening but they are being stitched in instead
#   OnceRunner = require('oncerunner').OnceRunner
#   TODO document the other examples of requires that are being "stitched in"

colorlog = (msg, color, size) ->
  color ?= "red"
  size ?= "1.2em"
  console.log("%c#{msg}", "color:#{color};font-size:#{size};")

unpad_md = (txt, pad) ->
  # Purpose:
  #   Remove padding at the beginings of all lines in txt IFF all lines have padding
  # Motivation:
  #   Markdown is very whitespace sensitive but it makes for ugly code
  #   to not have left padding in large strings.
  pad = "    "
  out_lines = []
  in_lines = txt.split("\n")
  for line in in_lines
    if not (line.startsWith(pad) or line.length is 0)
      return txt
    out_lines.push(line.replace(/^    /,''))
  out = out_lines.join("\n")
  return out

strip_surrounding_quotes = (s) ->
  return s.replace(/\"$/,'').replace(/^\"/,'')

wpad = undefined
hpad = 10
tau = Math.PI * 2
distance = (p1, p2) ->
  p2 = p2 || [0,0]
  x = (p1.x or p1[0]) - (p2.x or p2[0])
  y = (p1.y or p1[1]) - (p2.y or p2[1])
  Math.sqrt x * x + y * y
dist_lt = (mouse, d, thresh) ->
  x = mouse[0] - d.x
  y = mouse[1] - d.y
  Math.sqrt(x * x + y * y) < thresh
hash = (str) ->
  # https://github.com/darkskyapp/string-hash/blob/master/index.js
  hsh = 5381
  i = str.length
  while i
    hsh = (hsh * 33) ^ str.charCodeAt(--i)
  return hsh >>> 0
convert = (src, srctable, desttable) ->
  # convert.js
  # http://rot47.net
  # Dr Zhihua Lai
  srclen = srctable.length
  destlen = desttable.length
  # first convert to base 10
  val = 0
  numlen = src.length
  i = 0
  while i < numlen
    val = val * srclen + srctable.indexOf(src.charAt(i))
    i++
  return 0  if val < 0
  # then covert to any base
  r = val % destlen
  res = desttable.charAt(r)
  q = Math.floor(val / destlen)
  while q
    r = q % destlen
    q = Math.floor(q / destlen)
    res = desttable.charAt(r) + res
  return res
BASE57 = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
BASE10 = "0123456789"
int_to_base = (intgr) ->
  convert(""+intgr, BASE10, BASE57)
synthIdFor = (str) ->
  # return a short random hash suitable for use as DOM/JS id
  return 'h'+int_to_base(hash(str)).substr(0,6)
window.synthIdFor = synthIdFor
unescape_unicode = (u) ->
  # pre-escape any existing quotes so when JSON.parse does not get confused
  return JSON.parse('"' + u.replace('"', '\\"') + '"')

linearize = (msgRecipient, streamoid) ->
  if streamoid.idx is 0
    msgRecipient.postMessage({event: 'finish'})
  else
    i = streamoid.idx + 1
    l = 0
    while (streamoid.data[i] not '\n')
      l++
      i++
    line = streamoid.data.substr(streamoid.idx, l+1).trim()
    msgRecipient.postMessage({event:'line', line:line})
    streamoid.idx = i
    recurse = () -> linearize(msgRecipient, streamoid)
    setTimeout(recurse, 0)

ident = (data) ->
  return data

unique_id = (prefix) ->
  prefix ?= 'uid_'
  return prefix + Math.random().toString(36).substr(2,10)

sel_to_id = (selector) ->
  # remove the leading hash to make a selector into an id
  return selector.replace(/^\#/,'')

window.log_click = () ->
  console.log("%cCLICK", "color:red;font-size:1.8em")

# http://dublincore.org/documents/dcmi-terms/
DC_subject  = "http://purl.org/dc/terms/subject"
DCE_title    = "http://purl.org/dc/elements/1.1/title"
FOAF_Group  = "http://xmlns.com/foaf/0.1/Group"
FOAF_Person = "http://xmlns.com/foaf/0.1/Person"
FOAF_name   = "http://xmlns.com/foaf/0.1/name"
OSMT_name   = "https://wiki.openstreetmap.org/wiki/Key:name"
OSMT_reg_name = "https://wiki.openstreetmap.org/wiki/Key:reg_name"
OWL_Class   = "http://www.w3.org/2002/07/owl#Class"
OWL_Thing   = "http://www.w3.org/2002/07/owl#Thing"
OWL_ObjectProperty = "http://www.w3.org/2002/07/owl#ObjectProperty"
RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
RDF_object  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
RDF_type    = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
RDF_Class   = "http://www.w3.org/2000/01/rdf-schema#Class" # TODO rename RDFS_
RDF_subClassOf   = "http://www.w3.org/2000/01/rdf-schema#subClassOf" # TODO rename RDFS_
RDF_a       = 'a'
RDFS_label  = "http://www.w3.org/2000/01/rdf-schema#label"
SCHEMA_name = "http://schema.org/name"
SKOS_prefLabel = "http://www.w3.org/2004/02/skos/core#prefLabel"
XL_literalForm = "http://www.w3.org/2008/05/skos-xl#literalForm"
TYPE_SYNS   = [RDF_type, RDF_a, 'rdfs:type', 'rdf:type']
THUMB_PREDS = [
  'http://dbpedia.org/ontology/thumbnail'
  'http://xmlns.com/foaf/0.1/thumbnail']
NAME_SYNS = [
  FOAF_name, RDFS_label, 'rdfs:label', 'name', SKOS_prefLabel, XL_literalForm,
  SCHEMA_name, DCE_title, OSMT_reg_name, OSMT_name ]
XML_TAG_REGEX = /(<([^>]+)>)/ig

typeSigRE =
  # https://regex101.com/r/lKClAg/1
  'xsd': new RegExp("^http:\/\/www\.w3\.org\/2001\/XMLSchema\#(.*)$")
  # https://regex101.com/r/ccfdLS/3/
  'rdf': new RegExp("^http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#(.*)$")
getPrefixedTypeSignature = (typeUri) ->
  for prefix, sig of typeSigRE
    match = typeUri.match(sig)
    if match
      return "#{prefix}__#{match[1]}"
  return
getTypeSignature = (typeUri) ->
  typeSig = getPrefixedTypeSignature(typeUri)
  return typeSig
  #return (typeSig or '').split('__')[1]
PRIMORDIAL_ONTOLOGY =
  subClassOf:
    Literal: 'Thing'
    # https://www.w3.org/1999/02/22-rdf-syntax-ns
    # REVIEW(smurp) ignoring all but the rdfs:Datatype instances
    # REVIEW(smurp) should Literal be called Datatype instead?
    "rdf__PlainLiteral": 'Literal'
    "rdf__HTML": 'Literal'
    "rdf__langString": 'Literal'
    "rdf__type": 'Literal'
    "rdf__XMLLiteral": 'Literal'
    # https://www.w3.org/TR/xmlschema11-2/type-hierarchy-201104.png
    # https://www.w3.org/2011/rdf-wg/wiki/XSD_Datatypes
    # REVIEW(smurp) ideally all the xsd types would fall under anyType > anySimpleType > anyAtomicType
    # REVIEW(smurp) what about Built-in list types like: ENTITIES, IDREFS, NMTOKENS ????
    "xsd__anyURI": 'Literal'
    "xsd__base64Binary": 'Literal'
    "xsd__boolean": 'Literal'
    "xsd__date": 'Literal'
    "xsd__dateTimeStamp": 'date'
    "xsd__decimal": 'Literal'
    "xsd__integer": "xsd__decimal"
    "xsd__long": "xsd__integer"
    "xsd__int": "xsd__long"
    "xsd__short": "xsd__int"
    "xsd__byte": "xsd__short"
    "xsd__nonNegativeInteger": "xsd__integer"
    "xsd__positiveInteger": "xsd__nonNegativeInteger"
    "xsd__unsignedLong": "xsd__nonNegativeInteger"
    "xsd__unsignedInt":  "xsd__unsignedLong"
    "xsd__unsignedShort": "xsd__unsignedInt"
    "xsd__unsignedByte": "xsd__unsignedShort"
    "xsd__nonPositiveInteger": "xsd__integer"
    "xsd__negativeInteger": "xsd__nonPositiveInteger"
    "xsd__double": 'Literal'
    "xsd__duration": 'Literal'
    "xsd__float": 'Literal'
    "xsd__gDay": 'Literal'
    "xsd__gMonth": 'Literal'
    "xsd__gMonthDay": 'Literal'
    "xsd__gYear": 'Literal'
    "xsd__gYearMonth": 'Literal'
    "xsd__hexBinary": 'Literal'
    "xsd__NOTATION": 'Literal'
    "xsd__QName": 'Literal'
    "xsd__string": 'Literal'
    "xsd__normalizedString": "xsd_string"
    "xsd__token": "xsd__normalizedString"
    "xsd__language": "xsd__token"
    "xsd__Name": "xsd__token"
    "xsd__NCName": "xsd__Name"
    "xsd__time": 'Literal'
  subPropertyOf: {}
  domain: {}
  range: {}
  label: {} # MultiStrings as values

MANY_SPACES_REGEX = /\s{2,}/g
UNDEFINED = undefined
start_with_http = new RegExp("http", "ig")
ids_to_show = start_with_http

PEEKING_COLOR = "darkgray"

themeStyles =
  "light":
    "themeName": "theme_white"
    "pageBg": "white"
    "labelColor": "black"
    "shelfColor": "lightgreen"
    "discardColor": "salmon"
    "nodeHighlightOutline": "black"
  "dark":
    "themeName": "theme_black"
    "pageBg": "black"
    "labelColor": "#ddd"
    "shelfColor": "#163e00"
    "discardColor": "#4b0000"
    "nodeHighlightOutline": "white"


id_escape = (an_id) ->
  retval = an_id.replace(/\:/g,'_')
  retval = retval.replace(/\//g,'_')
  retval = retval.replace(new RegExp(' ','g'),'_')
  retval = retval.replace(new RegExp('\\?','g'),'_')
  retval = retval.replace(new RegExp('\=','g'),'_')
  retval = retval.replace(new RegExp('\\.','g'),'_')
  retval = retval.replace(new RegExp('\\#','g'),'_')
  retval

if true
  node_radius_policies =
    "node radius by links": (d) ->
      d.radius = Math.max(@node_radius, Math.log(d.links_shown.length))
      return d.radius
      if d.showing_links is "none"
        d.radius = @node_radius
      else
        if d.showing_links is "all"
          d.radius = Math.max(@node_radius,
            2 + Math.log(d.links_shown.length))
      d.radius
    "equal dots": (d) ->
      @node_radius
  default_node_radius_policy = "equal dots"
  default_node_radius_policy = "node radius by links"

  has_type = (subject, typ) ->
    has_predicate_value subject, RDF_type, typ

  has_predicate_value = (subject, predicate, value) ->
    pre = subject.predicates[predicate]
    if pre
      objs = pre.objects
      oi = 0
      while oi <= objs.length
        obj = objs[oi]
        return true  if obj.value is value
        oi++
    false

  is_a_main_node = (d) ->
    (BLANK_HACK and d.s.id[7] isnt "/") or (not BLANK_HACK and d.s.id[0] isnt "_")

  is_node_to_always_show = is_a_main_node

  is_one_of = (itm,array) ->
    array.indexOf(itm) > -1

if not is_one_of(2,[3,2,4])
  alert "is_one_of() fails"

window.blurt = (str, type, noButton) ->
  throw new Error('global blurt() is defunct, use @blurt() on HuViz')

escapeHtml = (unsafe) ->
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");

noop = () -> # Yup, does nothing.  On purpose!

class SettingsWidget
  constructor: (@huviz, @inputElem, state) ->
    @id = unique_id('widget_')
    @inputJQElem = $(@inputElem)

  wrap: (html) ->
    $(@inputElem).wrap(html)

class UsernameWidget extends SettingsWidget
  # https://fontawesome.com/v4.7.0/examples/#animated explains animations fa-spin (continuous) and fa-pulse (8-step)
  state_to_state_icon:
    bad: 'fa-times' # the username has been tried and failed last use
    good: 'fa-check' # the username has been tried and succeeded last use
    untried: 'fa-question' # a username has been provided but not yet tried
    trying: 'fa-spinner fa-pulse' # performing a lookup with a username which might be bad or good
    empty: 'fa-ellipsis-h' # no username present
    looking: 'fa-map-marker-alt fa-spin' # performing a lookup with a known good username
  state_to_color:
    bad: 'red'
    good: 'green'
    untried: 'orange'
    trying: 'orange'
    empty: 'grey'
    looking: 'green'

  constructor: ->
    super(arguments...)
    @wrap("""<div id="#{@id}" class="geo_input_wrap"></div>""") #  style="border:2px solid; padding:2px
    #@inputElem.setAttribute('style','border:none')
    @widgetJQElem = $('#'+@id)
    @widgetJQElem.prepend("""<i class="userIcon fa fa-user-alt"></i><i class="stateIcon fa fa-question"></i>""")
    @stateIconJQElem = @widgetJQElem.find('.stateIcon')
    @userIconJQElem = @widgetJQElem.find('.userIcon')
    @set_state('empty')

  set_state: (state) ->
    if false and @state and @state is state
      console.log("not bothering to change the state to",state,"cause it already is")
      return
    @state = state
    console.log(state, @inputJQElem.val())
    stateIcon = @state_to_state_icon[state]
    @stateIconJQElem.attr('class', "stateIcon fa " + stateIcon)
    color = @state_to_color[state]
    @widgetJQElem.css('border-color',color)
    @widgetJQElem.css('color',color)
    return

class GeoUserNameWidget extends UsernameWidget
  constructor: ->
    super(arguments...)
    @stateIconJQElem.on('click', @huviz.show_geonames_instructions)
    @userIconJQElem.on('click', @huviz.show_geonames_instructions)

orlando_human_term =
  all: 'All'
  chosen: 'Activated'
  unchosen: 'Deactivated'
  selected: 'Selected'
  shelved: 'Shelved'
  discarded: 'Discarded'
  hidden: 'Hidden'
  graphed: 'Graphed'
  fixed: 'Pinned'
  labelled: 'Labelled'
  choose: 'Activate'
  unchoose: 'Deactivate'
  wander: 'Wander'
  walk: 'Walk'
  walked: "Walked"
  select: 'Select'
  unselect: 'Unselect'
  label: 'Label'
  unlabel: 'Unlabel'
  shelve: 'Shelve'
  hide: 'Hide'
  discard: 'Discard'
  undiscard: 'Retrieve'
  pin: 'Pin'
  unpin: 'Unpin'
  unpinned: 'Unpinned'
  nameless: 'Nameless'
  blank_verb: 'VERB'
  blank_noun: 'SET/SELECTION'
  hunt: 'Hunt'
  load: 'Load'
  draw: 'Draw'
  undraw: 'Undraw'
  connect: 'Connect'
  spawn: 'Spawn'
  specialize: 'Specialize'
  annotate: 'Annotate'
  seeking_object: 'Object node'

class Huviz
  hash: hash
  class_list: [] # FIXME remove
  HHH: {}
  edges_by_id: {}
  edge_count: 0
  snippet_db: {}
  class_index: {}
  hierarchy: {}
  default_color: "brown"
  DEFAULT_CONTEXT: 'http://universal.org/'
  turtle_parser: 'GreenerTurtle'
  #turtle_parser: 'N3'

  use_canvas: true
  use_svg: false
  use_webgl: false
  #use_webgl: true  if location.hash.match(/webgl/)
  #use_canvas: false  if location.hash.match(/nocanvas/)

  nodes: undefined
  links_set: undefined
  node: undefined
  link: undefined

  lariat: undefined
  verbose: true
  verbosity: 0
  TEMP: 5
  COARSE: 10
  MODERATE: 20
  DEBUG: 40
  DUMP: false
  node_radius_policy: undefined
  draw_circle_around_focused: true
  draw_lariat_labels_rotated: true
  run_force_after_mouseup_msec: 2000
  nodes_pinnable: true

  BLANK_HACK: false
  width: undefined
  height: 0
  cx: 0
  cy: 0

  snippet_body_em: .7
  line_length_min: 4

  # TODO figure out how to replace with the default_graph_control
  link_distance: 29
  fisheye_zoom: 4.0
  peeking_line_thicker: 4
  show_snippets_constantly: false
  charge: -193
  gravity: 0.025
  snippet_count_on_edge_labels: true
  label_show_range: null # @link_distance * 1.1
  focus_threshold: 100
  discard_radius: 200
  fisheye_radius: 300 #null # label_show_range * 5
  focus_radius: null # label_show_range
  drag_dist_threshold: 5
  snippet_size: 300
  dragging: false
  last_status: undefined
  edge_x_offset: 5
  shadow_offset: 1
  shadow_color: 'DarkGray'

  my_graph:
    predicates: {}
    subjects: {}
    objects: {}

  # required by green turtle, should be retired
  G: {}
  local_file_data: ""

  search_regex: new RegExp("^$", "ig")
  node_radius: 3.2

  mousedown_point: false
  discard_center: [0,0]
  lariat_center: [0,0]
  last_mouse_pos: [ 0, 0]

  renderStyles = themeStyles.light
  display_shelf_clockwise: true
  nodeOrderAngle = 0.5
  node_display_type = ''

  pfm_data:
    tick:
      total_count: 0
      prev_total_count: 0
      timed_count: []
      label: "Ticks/sec."
    add_quad:
      total_count: 0
      prev_total_count: 0
      timed_count: []
      label: "Add Quad/sec"
    hatch:
      total_count: 0
      prev_total_count: 0
      timed_count: []
      label: "Hatch/sec"
    taxonomy:
      total_count: 0
      label: "Number of Classes:"
    sparql:
      total_count: 0
      prev_total_count: 0
      timed_count: []
      label: "Sparql Queries/sec"

  p_total_sprql_requests: 0

  how_heavy_are: (n, label, cb) ->
    memories = []
    memories.push(window.performance.memory)
    @heavy_things ?= {}
    buncha = []
    @heavy_things[label] = buncha
    for m in [1..n]
      retval = cb.call(this,n)
      #console.log(retval)
      buncha.push(retval)
    memories.push(window.performance.memory)
    memories.push({})
    memories.push({})
    [before,after,diff,per] = memories
    for k of memories[0]
      diff[k] = after[k] - before[k]
      per[k] = diff[k] / n
    per.what = 'B/'+label
    before.what = 'before'
    after.what = 'after'
    diff.what = 'diff'
    #console.log(per)
    colorlog(label + ' occupy ' + per.totalJSHeapSize + ' Bytes each')
    console.log('eg', retval)
    #console.table(memories)
    return

  how_heavy: (n) ->
    # Purpose:
    #   Find out how many Bytes each of the following objects occupy in RAM.
    # Example:
    #   HVZ[0].how_heavy(100000)
    @how_heavy_are(n, 'Array', (x) -> return new Array(100))
    @how_heavy_are(n, 'Object', (x) -> return (new Object())[x] = x)
    @how_heavy_are(n, 'String', (x) -> return ""+x)
    @how_heavy_are(n, 'Random', (x) -> return Math.random())
    @how_heavy_are(n, 'SortedSet', (x) -> return SortedSet().named(x))

  compose_object_from_defaults_and_incoming: (defs, incoming) ->
    # Purpose:
    #   To return an object with the properties of defs and incoming layered into it in turn
    # Intended Use Case:
    #   It is frequently the case that one wants to have and object with contains
    #   the default arguments for something and that one also wants the ability to
    #   pass in another object which contains the specifics for the call.
    #   This method joins those things together properly (they can even be null)
    #   to return the amalgamation of the defaults and the incoming arguments.
    defs ?= {}
    incoming ?= {}
    return Object.assign(Object.assign({}, defs), incoming)

  default_dialog_args:
    width:200
    height:200
    left:100
    top:100
    head_bg_color:'#157fcc'
    classes: "contextMenu temp"
    title: ''

  gen_dialog_html: (contents, id, in_args) ->
    args = @compose_object_from_defaults_and_incoming(@default_dialog_args, in_args)
    #args = Object.assign(default_args, in_args)
    return """<div id="#{id}" class="#{args.classes} #{args.extraClasses}"
        style="display:block;top:#{args.top}px;left:#{args.left}px;max-width:#{args.width}px;max-height:#{args.height}px">
      <div class="header" style="background-color:#{args.head_bg_color};#{args.style}">
        <div class="dialog_title">#{args.title}</div>
        <button class="close_node_details" title="Close"><i class="far fa-window-close" for="#{id}"></i></button>
      </div>
      #{contents}
    </div>""" # """ for emacs coffeescript mode

  make_dialog: (content_html, id, args) ->
    id ?= @unique_id('dialog_')  # if you do not have an id, an id will be provided for you
    @addHTML(@gen_dialog_html(content_html, id, args))
    elem = document.querySelector('#'+id)
    $(elem).on('drag',@pop_div_to_top)
    $(elem).draggable().resizable()
    $(elem.querySelector(' .close_node_details')).on('click', args.close or @destroy_dialog)
    return elem

  pop_div_to_top: (elem) ->
    $(elem.currentTarget).parent().append(elem.currentTarget)

  destroy_dialog: (e) ->
    console.log "destroy_dialog"
    box = e.currentTarget.offsetParent
    $(box).remove()

  make_markdown_dialog: (markdown, id, args) ->
    args ?= {}
    args.extraClasses += " markdownDialog"
    return @make_dialog(marked(markdown or ''), id, args)

  make_pre_dialog: (textToPre, id, args) ->
    args ?= {}
    args.extraClasses += " preformattedDialog"
    return @make_dialog("<pre>#{textToPre}</pre>", id, args)

  make_json_dialog: (json, id, args) ->
    args ?= {}
    args.extraClasses += " preformattedDialog"
    jsonString = JSON.stringify(json, null, args.json_indent or 2)
    return @make_dialog("<pre>#{jsonString}</pre>", id, args)

  unique_id: (prefix) ->
    prefix ?= 'uid_'
    return prefix + Math.random().toString(36).substr(2,10)

  change_sort_order: (array, cmp) ->
    array.__current_sort_order = cmp
    array.sort array.__current_sort_order
  isArray: (thing) ->
    Object::toString.call(thing) is "[object Array]"
  cmp_on_name: (a, b) ->
    return 0  if a.name is b.name
    return -1  if a.name < b.name
    1
  cmp_on_id: (a, b) ->
    return 0  if a.id is b.id
    return -1  if a.id < b.id
    1
  binary_search_on: (sorted_array, sought, cmp, ret_ins_idx) ->
    # return -1 or the idx of sought in sorted_array
    # if ret_ins_idx instead of -1 return [n] where n is where it ought to be
    # AKA "RETurn the INSertion INdeX"
    cmp = cmp or sorted_array.__current_sort_order or @cmp_on_id
    ret_ins_idx = ret_ins_idx or false
    seeking = true
    if sorted_array.length < 1
      return idx: 0  if ret_ins_idx
      return -1
    mid = undefined
    bot = 0
    top = sorted_array.length
    while seeking
      mid = bot + Math.floor((top - bot) / 2)
      c = cmp(sorted_array[mid], sought)

      #console.log(" c =",c);
      return mid  if c is 0
      if c < 0 # ie sorted_array[mid] < sought
        bot = mid + 1
      else
        top = mid
      if bot is top
        return idx: bot  if ret_ins_idx
        return -1

  # Objective:
  #   Maintain a sorted array which acts like a set.
  #   It is sorted so insertions and tests can be fast.
  # cmp: a comparison function returning -1,0,1
  # an integer was returned, ie it was found

  # Perform the set .add operation, adding itm only if not already present

  #if (Array.__proto__.add == null) Array.prototype.add = add;
  # the nodes the user has chosen to see expanded
  # the nodes the user has discarded
  # the nodes which are in the graph, linked together
  # the nodes not displaying links and not discarded
  # keep synced with html
  # bugged
  roughSizeOfObject: (object) ->
    # http://stackoverflow.com/questions/1248302/javascript-object-size
    objectList = []
    stack = [object]
    bytes = 0
    while stack.length
      value = stack.pop()
      if typeof value is "boolean"
        bytes += 4
      else if typeof value is "string"
        bytes += value.length * 2
      else if typeof value is "number"
        bytes += 8
      else if typeof value is "object" and objectList.indexOf(value) is -1
        objectList.push value
        for i of value
          stack.push value[i]
    bytes

  move_node_to_point: (node, point) ->
    node.x = point[0]
    node.y = point[1]

  click_node: (node_or_id) ->
    # motivated by testing. Should this also be used by normal click handling?
    console.warn("click_node() is deprecated")
    if typeof node_or_id is 'string'
      node = @nodes.get_by('id', node_or_id)
    else
      node = node_or_id
    @set_focused_node(node)
    evt = new MouseEvent "mouseup",
      screenX: node.x
      screenY: node.y
    @canvas.dispatchEvent(evt)
    return @

  click_verb: (id) ->
    verbs = $("#verb-#{id}")
    if not verbs.length
      throw new Error("verb '#{id}' not found")
    verbs.trigger("click")
    return @

  click_set: (id) ->
    if id is 'nodes'
      alert("set 'nodes' is deprecated")
      console.error("set 'nodes' is deprecated")
    else
      if not id.endsWith('_set')
        id = id + '_set'
    sel = "##{id}"
    sets = $(sel)
    if not sets.length
      throw new Error("set '#{id}' not found using selector: '#{sel}'")
    sets.trigger("click")
    return @

  click_predicate: (id) ->
    @gclui.predicate_picker.handle_click(id)
    return @

  click_taxon: (id) ->
    $("##{id}").trigger("click")
    return @

  like_string: (str) =>
    # Ideally we'd trigger an actual 'input' event but that is not possible
    #$(".like_input").val(str)
    @gclui.like_input.val(str)
    @gclui.handle_like_input()
    #debugger if @DEBUG and str is ""
    return @

  toggle_expander: (id) ->
    @topJQElem.find("##{id} span.expander:first").trigger("click");
    return @

  doit: ->
    @topJQElem.find(".doit_button").trigger("click")
    return @

  make_cursor_text_while_dragging: (action) ->
    if action in ['seeking_object']
      drag_or_drop = 'drag'
    else
      drag_or_drop = 'drop'
    return "#{@human_term[drag_or_drop] or drag_or_drop} to #{@human_term[action] or action}"

  get_mouse_point: (d3_event) ->
    d3_event ?= @mouse_receiver[0][0]
    return d3.mouse(d3_event)

  should_start_dragging: ->
    # We can only know that the users intention is to drag
    # a node once sufficient motion has started, when there
    # is a focused_node
    #console.log "state_name == '" + @focused_node.state.state_name + "' and selected? == " + @focused_node.selected?
    #console.log "START_DRAG: \n  dragging",@dragging,"\n  mousedown_point:",@mousedown_point,"\n  @focused_node:",@focused_node
    return not @dragging and
        @mousedown_point and
        @focused_node and
        distance(@last_mouse_pos, @mousedown_point) > @drag_dist_threshold

  mousemove: =>
    @last_mouse_pos = @get_mouse_point()
    if @rightClickHold
      @text_cursor.continue()
      @text_cursor.set_text("Inspect")
      if @focused_node
        the_node = $("##{@focused_node.lid}")
        if the_node.html() then the_node.remove()
        @render_node_info_box(@focused_node)
      else
        if $(".contextMenu.temp") then $(".contextMenu.temp").remove()
    else if @should_start_dragging()
      @dragging = @focused_node
      if @args.drag_start_handler
        try
          @args.drag_start_handler.call(this, @dragging)
        catch e
          console.warn(e)
      if @editui.is_state('connecting')
        if @editui.subject_node isnt @dragging
          @editui.set_subject_node(@dragging)
      if @dragging.state isnt @graphed_set isnt @rightClickHold
        @graphed_set.acquire(@dragging)

    if not @rightClickHold
      if @dragging
        @force.resume() # why?
        if not @args.skip_log_tick
          console.log "Tick in @force.resume() mousemove"
        @move_node_to_point(@dragging, @last_mouse_pos)
        if @editui.is_state('connecting')
          @text_cursor.pause("", "drop on object node")
        else
          if @dragging.links_shown.length is 0
            action = "choose"
          else if @dragging.fixed
            action = "unpin"
          else
            action = "pin"
          if (edit_state = @editui.get_state()) isnt 'not_editing'
            action = edit_state
          else if @in_disconnect_dropzone(@dragging)
            action = "shelve"
          else if @in_discard_dropzone(@dragging)
            action = "discard"
          cursor_text = @make_cursor_text_while_dragging(action)
          @text_cursor.pause("", cursor_text)
      else
        # TODO put block "if not @dragging and @mousedown_point and @focused_node and distance" here
        if @editui.is_state('connecting')
          if @editui.object_node or not @editui.subject_node
            if @editui.object_datatype_is_literal
              @text_cursor.set_text("click subject node")
            else
              @text_cursor.set_text("drag subject node")
    if @peeking_node?
      console.log "PEEKING at node: " + @peeking_node.id
      if @focused_node? and @focused_node isnt @peeking_node
        pair = [ @peeking_node.id, @focused_node.id ]
        #console.log "   PEEKING at edge between" + @peeking_node.id + " and " + @focused_node.id
        for edge in @peeking_node.links_shown
          if edge.source.id in pair and edge.target.id in pair
            #console.log "PEEK edge.id is '" + edge.id + "'"
            edge.focused = true
            @print_edge(edge)
          else
            edge.focused = false
    @tick("Tick in mousemove")

  mousedown: =>
    @mousedown_point = @get_mouse_point()
    @last_mouse_pos = @mousedown_point

  mouseup: =>
    window.log_click()
    d3_event = @mouse_receiver[0][0]
    @mousedown_point = false
    point = @get_mouse_point(d3_event)
    if d3.event.button is 2 # Right click event so don't alter selected state
      @text_cursor.continue()
      @text_cursor.set_text("Select")
      if @focused_node then $("##{@focused_node.lid}").removeClass("temp")
      @rightClickHold = false
      return
    # if something was being dragged then handle the drop
    if @dragging
      #@log_mouse_activity('FINISH A DRAG')
      @move_node_to_point(@dragging, point)
      if @in_discard_dropzone(@dragging)
        @run_verb_on_object('discard', @dragging)
      else if @in_disconnect_dropzone(@dragging)  # TODO rename to shelve_dropzone
        @run_verb_on_object('shelve', @dragging)
        # @unselect(@dragging) # this might be confusing
      else if @dragging.links_shown.length == 0
        @run_verb_on_object('choose', @dragging)
      else if @nodes_pinnable
        if @editui.is_state('connecting') and (@dragging is @editui.subject_node)
          console.log "not pinning subject_node when dropping"
        else if @dragging.fixed # aka pinned
          @run_verb_on_object('unpin', @dragging)
        else
          @run_verb_on_object('pin', @dragging)
      @dragging = false
      @text_cursor.continue()
      return

    if @editui.is_state('connecting') and @focused_node and @editui.object_datatype_is_literal
      @editui.set_subject_node(@focused_node)
      #console.log("edit mode and focused note and editui is literal")
      @tick("Tick in mouseup 1")
      return

    # this is the node being clickedRDF_literal
    if @focused_node # and @focused_node.state is @graphed_set
      @perform_current_command(@focused_node)
      @tick("Tick in mouseup 2")
      return

    if @focused_edge
      # FIXME do the edge equivalent of @perform_current_command
      #@update_snippet() # useful when hover-shows-snippet
      @print_edge(@focused_edge)
      return

    # it was a drag, not a click
    drag_dist = distance(point, @mousedown_point)
    #if drag_dist > @drag_dist_threshold
    #  console.log "drag detection probably bugged",point,@mousedown_point,drag_dist
    #  return

    if @focused_node
      unless @focused_node.state is @graphed_set
        @run_verb_on_object('choose', @focused_node)
      else if @focused_node.showing_links is "all"
        @run_verb_on_object('print', @focused_node)
      else
        @run_verb_on_object('choose', @focused_node)
      # TODO(smurp) are these still needed?
      @force.links(@links_set)
      if not @args.skip_log_tick
        console.log "Tick in @force.links() mouseup"
      @restart()

    return

  log_mouse_activity: (label) ->
    console.log(label,"\n  dragging", @dragging,
        "\n  mousedown_point:",@mousedown_point,
        "\n  @focused_node:", @focused_node)

  mouseright: () =>
    d3.event.preventDefault()
    @text_cursor.continue()
    temp = null
    @text_cursor.set_text("Inspect", temp, "#75c3fb")
    @rightClickHold = true
    doesnt_exist = if @focused_node then true else false
    if @focused_node and doesnt_exist
      @render_node_info_box(@focused_node)

  render_node_info_box: (info_node) ->
    node_inspector_id = "NODE_INSPECTOR__" + info_node.lid
    if info_node._inspector?
      @hilight_dialog(info_node._inspector)
      return
    all_names = Object.values(info_node.name)
    names_all_langs = ""
    note = ""
    color_headers = ""
    node_out_links = ""

    for name in all_names
      if names_all_langs
        names_all_langs = names_all_langs + " -- " + name
      else
        names_all_langs = name
    other_types = ""
    if (info_node._types.length > 1)
      for node_type in info_node._types
        if node_type != info_node.type
          if other_types
            other_types = other_types + ", " + node_type
          else
            other_types = node_type
      other_types = " (" + other_types + ")"
    #console.log info_node
    #console.log info_node.links_from.length
    if (info_node.links_from.length > 0)
      for link_from in info_node.links_from
        [target_prefix, target] = @render_target_for_display(link_from.target)
        node_out_links = node_out_links + """
        <li><i class='fas fa-long-arrow-alt-right'></i>
          <a href='#{link_from.predicate.id}' target='blank'>#{link_from.predicate.lid}</a>
          #{target_prefix} #{target}
        </li>
          """ # """
      node_out_links = "<ul>" + node_out_links + "</ul>"
    #console.log info_node
    if info_node._colors
      width = 100 / info_node._colors.length
      for color in info_node._colors
        color_headers = color_headers +
          "<div class='subHeader' style='background-color: #{color}; width: #{width}%;'></div>"
    if @endpoint_loader.value
      if @endpoint_loader.value and info_node.fully_loaded
        note = "<p class='note'>Node Fully Loaded</span>"
      else
        note = """<p class='note'><span class='label'>Note:</span>
          This node may not yet be fully loaded from remote server.
          Link details may not be accurate. Activate to load.</i>""" # """

    dialogArgs =
      width: @width * 0.50
      height: @height * 0.80
      top: d3.event.clientY
      left: d3.event.clientX
      close: @close_node_inspector

    if info_node
      dialogArgs.head_bg_color = info_node.color
      id_display = @create_link_if_url(info_node.id)
      node_info_html = """
        <div class="message_wrapper">
          <p class='id_display'><span class='label'>id:</span> #{id_display}</p>
          <p><span class='label'>name:</span> #{names_all_langs}</p>
          <p><span class='label'>type(s):</span> #{info_node.type} #{other_types}</p>
          <p><span class='label'>Links To:</span> #{info_node.links_to.length} <br>
            <span class='label'>Links From:</span> #{info_node.links_from.length}</p>
            #{note}
            #{node_out_links}
        </div>
        """ # """

      info_node._inspector = @make_dialog(node_info_html, node_inspector_id, dialogArgs)
      info_node._inspector.dataset.node_id = info_node.id
    return

  close_node_inspector: (event, ui) =>  # fat because it is called by click handler
    box = event.currentTarget.offsetParent
    node_id = box.dataset.node_id
    if node_id?
      node = @all_set.get_by('id', node_id)
      if node?
        delete node._inspector
    @destroy_dialog(event)
    return

  create_link_if_url: (possible_link) ->
    url_check = possible_link.substring(0,4)
    if url_check is "http"
      target = "<a href='#{possible_link}' target='blank'>#{possible_link}</a>"
    else
      target = possible_link

  render_target_for_display: (node) ->
    if node.isLiteral
      typeCURIE = node.type.replace('__',':')
      lines = node.name.toString().split(/\r\n|\r|\n/)
      showBlock = lines.length > 1 or node.name.toString().length > 30
      colon = ":"
      if showBlock
        return [colon, """<blockquote title="#{typeCURIE}">#{node.name}</blockquote>"""]
      else
        return [colon, """<code title="#{typeCURIE}">#{node.name}</code>"""]
    else
      arrow = "<i class='fas fa-long-arrow-alt-right'></i>"
      return [arrow, @create_link_if_url(node.id)]

  perform_current_command: (node) ->
    if @gclui.ready_to_perform()
      cmd = new gcl.GraphCommand this,
        verbs: @gclui.engaged_verbs
        subjects: [node]
      @run_command(cmd)
    #else
    #  @toggle_selected(node)
    @clean_up_all_dirt_once()

  run_command: (cmd, callback) ->
    #@show_state_msg(cmd.as_msg())
    @gclui.show_working_on(cmd)
    @gclc.run(cmd, callback)
    @gclui.show_working_off()
    #@hide_state_msg()
    return

  #///////////////////////////////////////////////////////////////////////////
  # resize-svg-when-window-is-resized-in-d3-js
  #   http://stackoverflow.com/questions/16265123/
  updateWindow: =>
    if not @container
      console.warn('updateWindow() skipped until @container')
      return
    @get_container_width()
    @get_container_height()
    @update_graph_radius()
    @update_graph_center()
    @update_discard_zone()
    @update_lariat_zone()
    if @svg
      @svg.
        attr("width", @width).
        attr("height", @height)
    if @canvas
      @canvas.width = @width
      @canvas.height = @height
    @force.size [@mx, @my]
    if not @args.skip_log_tick
      console.log "Tick in @force.size() updateWindow"
    # FIXME all selectors must be localized so if there are two huviz
    #       instances on a page they do not interact
    instance_container = @args.huviz_top_sel
    $("#{instance_container} .graph_title_set").css("width", @width)
    if @tabsJQElem and @tabsJQElem.length > 0
      @tabsJQElem.css("left", "auto")
    @restart()

  #///////////////////////////////////////////////////////////////////////////
  #
  #   http://bl.ocks.org/mbostock/929623
  get_charge: (d) =>
    graphed = d.state == @graphed_set
    retval = graphed and @charge or 0  # zero so shelf has no influence
    if d.charge?
      retval = d.charge
    #if retval is 0 and graphed
    #  console.error "bad combo of retval and graphed?",retval,graphed,d.name
    return retval

  get_gravity: =>
    return @gravity

  # lines: 5845 5848 5852 of d3.v3.js object to
  #    mouse_receiver.call(force.drag);
  # when mouse_receiver == viscanvas
  init_webgl: ->
    @init()
    @animate()

  #dump_line(add_line(scene,cx,cy,width,height,'ray'))
  draw_circle: (cx, cy, radius, strclr, filclr, start_angle, end_angle, special_focus) ->
    incl_cntr = start_angle? or end_angle?
    start_angle = start_angle or 0
    end_angle = end_angle or tau
    if strclr
      @ctx.strokeStyle = strclr or "blue"
    if filclr
      @ctx.fillStyle = filclr or "blue"
    @ctx.beginPath()
    #if incl_cntr
      #@ctx.moveTo(cx, cy) # so the arcs are wedges not chords
      # do not incl_cntr when drawing a whole circle
    @ctx.arc(cx, cy, radius, start_angle, end_angle, true)
    @ctx.closePath()
    if strclr
      @ctx.stroke()
    if filclr
      @ctx.fill()

    if special_focus # true if this is a wander or walk highlighted node
      @ctx.beginPath()
      radius = radius/2
      @ctx.arc(cx, cy, radius, 0, Math.PI*2)
      @ctx.closePath()
      @ctx.fillStyle = "black"
      @ctx.fill()

  draw_round_img: (cx, cy, radius, strclr, filclr, special_focus, imageData, url) ->
    incl_cntr = start_angle? or end_angle?
    start_angle = start_angle or 0
    end_angle = end_angle or tau
    if strclr
      @ctx.strokeStyle = strclr or "blue"
    @ctx.beginPath()
    if incl_cntr
      @ctx.moveTo(cx, cy) # so the arcs are wedges not chords
      # do not incl_cntr when drawing a whole circle
    @ctx.arc(cx, cy, radius, start_angle, end_angle, true)
    @ctx.closePath()
    if strclr
      @ctx.stroke()
    if filclr
      @ctx.fill()
    wh = radius*2
    if imageData?
      # note that drawImage can clip for the centering task
      #   https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
      @ctx.drawImage(imageData, cx-radius, cy-radius, wh, wh)
    else
      img = new Image()
      img.src = url
      @ctx.drawImage(img,
                     0, 0, img.width, img.height,
                     cx-radius, cy-radius, wh, wh)

    if special_focus # true if this is a wander or walk highlighted node
      @ctx.beginPath()
      radius = radius/2
      @ctx.arc(cx, cy, radius, 0, Math.PI*2)
      @ctx.closePath()
      @ctx.fillStyle = "black"
      @ctx.fill()


  draw_triangle: (x, y, color, x1, y1, x2, y2) ->
    @ctx.beginPath()
    @ctx.moveTo(x, y)
    @ctx.strokeStyle = color
    @ctx.lineTo(x1, y1)
    @ctx.lineTo(x2, y2)
    @ctx.moveTo(x, y)
    @ctx.stroke()
    @ctx.fillStyle = color
    @ctx.fill()
    @ctx.closePath()

  draw_pie: (cx, cy, radius, strclr, filclrs, special_focus) ->
    num = filclrs.length
    if not num
      throw new Error("no colors specified")
    if num is 1
      @draw_circle(cx, cy, radius, strclr, filclrs[0],false,false,special_focus)
      return
    arc = tau/num
    start_angle = 0
    for filclr in filclrs
      end_angle = start_angle + arc
      @draw_circle(cx, cy, radius, strclr, filclr, end_angle, start_angle, special_focus)
      start_angle = start_angle + arc

  draw_line: (x1, y1, x2, y2, clr) ->
    @ctx.strokeStyle = clr or 'red'
    @ctx.beginPath()
    @ctx.moveTo(x1, y1)
    @ctx.lineTo(x2, y2)
    @ctx.closePath()
    @ctx.stroke()

  draw_curvedline: (x1, y1, x2, y2, sway_inc, clr, num_contexts, line_width, edge, directional_edge) ->
    pdist = distance([x1,y1],[x2,y2])
    sway = @swayfrac * sway_inc * pdist
    if pdist < @line_length_min
      return
    if sway is 0
      return
    # sway is the distance to offset the control point from the midline
    orig_angle = Math.atan2(x2 - x1, y2 - y1)
    ctrl_angle = (orig_angle + (Math.PI / 2))
    ang = ctrl_angle
    ang = orig_angle
    check_range = (val,name) ->
      window.maxes = window.maxes or {}
      window.ranges = window.ranges or {}
      range = window.ranges[name] or {max: -Infinity, min: Infinity}
      range.max = Math.max(range.max, val)
      range.min = Math.min(range.min, val)
    #check_range(orig_angle,'orig_angle')
    #check_range(ctrl_angle,'ctrl_angle')
    xmid = x1 + (x2-x1)/2
    ymid = y1 + (y2-y1)/2
    xctrl = xmid + Math.sin(ctrl_angle) * sway
    yctrl = ymid + Math.cos(ctrl_angle) * sway
    @ctx.strokeStyle = clr or 'red'
    @ctx.beginPath()
    @ctx.lineWidth = line_width
    @ctx.moveTo(x1, y1)
    @ctx.quadraticCurveTo(xctrl, yctrl, x2, y2)
    #@ctx.closePath()
    @ctx.stroke()

    xhndl = xmid + Math.sin(ctrl_angle) * (sway/2)
    yhndl = ymid + Math.cos(ctrl_angle)* (sway/2)
    edge.handle =
      x: xhndl
      y: yhndl
    @draw_circle(xhndl, yhndl, (line_width/2), clr) # draw a circle at the midpoint of the line
    if directional_edge is "forward"
      tip_x = x2
      tip_y = y2
    else
      tip_x = x1
      tip_y = y1

    # --------- ARROWS on Edges -----------
    if @arrows_chosen
      a_l = 8 # arrow length
      a_w = 2 # arrow width
      arr_side = Math.sqrt(a_l * a_l + a_w * a_w)

      arrow_color = clr
      node_radius = @calc_node_radius(edge.target)

      arw_angl = Math.atan((yctrl - y2)/(xctrl - x2))
      hd_angl = Math.tan(a_w/a_l)
      if (xctrl < x2) then flip = -1 else flip = 1 # Flip sign depending on angle

      pnt_x =  x2 + flip * node_radius * Math.cos(arw_angl)
      pnt_y =  y2 + flip * node_radius * Math.sin(arw_angl)
      arrow_base_x = x2 + flip * (node_radius + a_l) * Math.cos(arw_angl)
      arrow_base_y = y2 + flip * (node_radius + a_l) * Math.sin(arw_angl)
      xo1 = pnt_x + flip * arr_side * Math.cos(arw_angl + hd_angl)
      yo1 = pnt_y + flip * arr_side * Math.sin(arw_angl + hd_angl)
      xo2 = pnt_x + flip * arr_side * Math.cos(arw_angl - hd_angl)
      yo2 = pnt_y + flip * arr_side * Math.sin(arw_angl - hd_angl)
      @draw_triangle(pnt_x, pnt_y, arrow_color, xo1, yo1, xo2, yo2)

  draw_self_edge_circle: (cx, cy, strclr, length, line_width, e, arw_angle) ->
    node_radius = @calc_node_radius(e.source)
    arw_radius = node_radius * 5
    #if (arw_radius > 75) then arw_radius = 75
    x_offset =  Math.cos(arw_angle) * arw_radius
    y_offset = Math.sin(arw_angle) * arw_radius
    cx2 = cx + x_offset
    cy2 = cy + y_offset
    strclr = e.color
    filclr = false
    start_angle = 0
    end_angle = 0
    special_focus = false
    @draw_circle(cx2, cy2, arw_radius, strclr, filclr, start_angle, end_angle, special_focus)

    x_arrow_offset = Math.cos(arw_angle) * @calc_node_radius(e.source)
    y_arrow_offset = Math.sin(arw_angle) * @calc_node_radius(e.source)

    a_l = 8 # arrow length
    a_w = 2 # arrow width
    arr_side = Math.sqrt(a_l * a_l + a_w * a_w)

    arrow_color = e.color
    node_radius = @calc_node_radius(e.source)

    arw_angl = arw_angle + 1
    x2 = cx
    y2 = cy

    hd_angl = Math.tan(a_w/a_l) # Adjusts the arrow shape
    flip = 1

    arw_angl = arw_angle + 1.45
    arrow_adjust = Math.atan(a_l/arw_radius)

    pnt_x =  x2 + flip * node_radius * Math.cos(arw_angl)
    pnt_y =  y2 + flip * node_radius * Math.sin(arw_angl)

    arrow_base_x = x2 + flip * (node_radius + a_l) * Math.cos(arw_angl)
    arrow_base_y = y2 + flip * (node_radius + a_l) * Math.sin(arw_angl)
    xo1 = pnt_x + flip * arr_side * Math.cos(arw_angl + hd_angl - arrow_adjust)
    yo1 = pnt_y + flip * arr_side * Math.sin(arw_angl + hd_angl - arrow_adjust)
    xo2 = pnt_x + flip * arr_side * Math.cos(arw_angl - hd_angl - arrow_adjust)
    yo2 = pnt_y + flip * arr_side * Math.sin(arw_angl - hd_angl - arrow_adjust)
    @draw_triangle(pnt_x, pnt_y, arrow_color, xo1, yo1, xo2, yo2)
    e.handle =
      x: cx2 + x_offset
      y: cy2 + y_offset
    @draw_circle(e.handle.x, e.handle.y, (line_width/2), arrow_color)

  draw_disconnect_dropzone: ->
    @ctx.save()
    @ctx.lineWidth = @graph_radius * 0.1
    @draw_circle(@lariat_center[0], @lariat_center[1], @graph_radius, renderStyles.shelfColor)
    @ctx.restore()
  draw_discard_dropzone: ->
    @ctx.save()
    @ctx.lineWidth = @discard_radius * 0.1
    @draw_circle(@discard_center[0], @discard_center[1], @discard_radius, "", renderStyles.discardColor)
    @ctx.restore()
  draw_dropzones: ->
    if @dragging
      @draw_disconnect_dropzone()
      @draw_discard_dropzone()
  in_disconnect_dropzone: (node) ->
    # is it within the RIM of the disconnect circle?
    dist = distance(node, @lariat_center)
    @graph_radius * 0.9 < dist and @graph_radius * 1.1 > dist
  in_discard_dropzone: (node) ->
    # is it ANYWHERE within the circle?
    dist = distance(node, @discard_center)
    @discard_radius * 1.1 > dist

  init_sets: ->
    # #### states are mutually exclusive
    #
    #  * graphed: in the graph, connected to other nodes
    #  * shelved: on the shelf, available for choosing
    #  * discarded: in the discard zone, findable but ignored by show_links_*
    #  * hidden: findable, but not displayed anywhere (when found, will become shelved)
    #  * embryonic: incomplete, not ready to be used
    #
    # #### flags able to co-exist
    #
    # * chosen: (aka Activated) these nodes are graphed and pull other nodes into
    #   the graph with them
    # * selected: the predicates of the edges terminating at these nodes populate the
    #   _predicate picker_ with the label **Edges of the Selected Nodes**
    # * pinned: in the graph and at fixed positions
    # * labelled: these nodes have their name (or id) showing all the time
    # * nameless: these nodes do not have names which are distinct from their urls

    @nodes = SortedSet().named('all').
      sort_on("id").
      labelled(@human_term.all)
    @nodes.docs = """#{@nodes.label} nodes are in this set, regardless of state."""
    @all_set = @nodes

    @embryonic_set = SortedSet().named("embryo").
      sort_on("id").
      isFlag()
    @embryonic_set.docs = "
      Nodes which are not yet complete are 'embryonic' and not yet
      in '#{@all_set.label}'.  Nodes need to have a class and a label to
      no longer be embryonic."

    @chosen_set = SortedSet().named("chosen").
      sort_on("id").
      isFlag().
      labelled(@human_term.chosen).
      sub_of(@all_set)
    @chosen_set.docs = "
      Nodes which the user has specifically '#{@chosen_set.label}' by either
      dragging them into the graph from the surrounding green
      'shelf'. '#{@chosen_set.label}' nodes can drag other nodes into the
      graph if the others are #{@human_term.hidden} or #{@human_term.shelved} but
      not if they are #{@human_term.discarded}."
    @chosen_set.cleanup_verb = 'shelve'

    @selected_set = SortedSet().named("selected").
      sort_on("id").
      isFlag().
      labelled(@human_term.selected).
      sub_of(@all_set)
    @selected_set.cleanup_verb = "unselect"
    @selected_set.docs = "
      Nodes which have been '#{@selected_set.label}' using the class picker,
      ie which are highlighted and a little larger."

    @shelved_set = SortedSet().
      named("shelved").
      sort_on('name').
      case_insensitive_sort(true).
      labelled(@human_term.shelved).
      sub_of(@all_set).
      isState()
    @shelved_set.docs = "
      Nodes which are '#{@shelved_set.label}' on the green surrounding 'shelf',
      either because they have been dragged there or released back to there
      when the node which pulled them into the graph was
      '#{@human_term.unchosen}."

    @discarded_set = SortedSet().named("discarded").
      labelled(@human_term.discarded).
      sort_on('name').
      case_insensitive_sort(true).
      sub_of(@all_set).
      isState()
    @discarded_set.cleanup_verb = "shelve" # TODO confirm this
    @discarded_set.docs = "
      Nodes which have been '#{@discarded_set.label}' by being dragged into
      the red 'discard bin' in the bottom right corner.
      '#{@discarded_set.label}' nodes are not pulled into the graph when
      nodes they are connected to become '#{@chosen_set.label}'."

    @hidden_set = SortedSet().named("hidden").
      sort_on("id").
      labelled(@human_term.hidden).
      sub_of(@all_set).
      isState()
    @hidden_set.docs = "
      Nodes which are '#{@hidden_set.label}' but can be pulled into
      the graph by other nodes when those become
      '#{@human_term.chosen}'."
    @hidden_set.cleanup_verb = "shelve"

    @graphed_set = SortedSet().named("graphed").
      sort_on("id").
      labelled(@human_term.graphed).
      sub_of(@all_set).
      isState()
    @graphed_set.docs = "
      Nodes which are included in the central graph either by having been
      '#{@human_term.chosen}' themselves or which are pulled into the
      graph by those which have been."
    @graphed_set.cleanup_verb = "unchoose"

    @wasChosen_set = SortedSet().named("wasChosen").
      sort_on("id").
      labelled("Was Chosen").
      isFlag() # membership is not mutually exclusive with the isState() sets
    @wasChosen_set.docs = "
      Nodes are marked wasChosen by wander__atFirst for later comparison
      with nowChosen."

    @nowChosen_set = SortedSet().named("nowChosen").
      sort_on("id").
      labelled("Now Graphed").
      isFlag() # membership is not mutually exclusive with the isState() sets
    @nowChosen_set.docs = "
      Nodes pulled in by @choose() are marked nowChosen for later comparison
      against wasChosen by wander__atLast."

    @pinned_set = SortedSet().named('fixed').
      sort_on("id").
      labelled(@human_term.fixed).
      sub_of(@all_set).
      isFlag()
    @pinned_set.docs = "
      Nodes which are '#{@pinned_set.label}' to the canvas as a result of
      being dragged and dropped while already being '#{@human_term.graphed}'.
      #{@pinned_set.label} nodes can be #{@human_term.unpinned} by dragging
      them from their #{@pinned_set.label} location."
    @pinned_set.cleanup_verb = "unpin"

    @labelled_set = SortedSet().named("labelled").
      sort_on("id").
      labelled(@human_term.labelled).
      isFlag().
      sub_of(@all_set)
    @labelled_set.docs = "Nodes which have their labels permanently shown."
    @labelled_set.cleanup_verb = "unlabel"

    @nameless_set = SortedSet().named("nameless").
      sort_on("id").
      labelled(@human_term.nameless).
      sub_of(@all_set).
      isFlag('nameless')
    @nameless_set.docs = "Nodes for which no name is yet known"

    @links_set = SortedSet().
      named("shown").
      sort_on("id").
      isFlag()
    @links_set.docs = "Links which are shown."

    @walked_set = SortedSet().
      named("walked").
      isFlag().
      labelled(@human_term.walked).
      sub_of(@chosen_set).
      sort_on('walkedIdx0') # sort on index of position in the path; the 0 means zero-based idx
    @walked_set.docs = "Nodes in order of their walkedness"

    @predicate_set = SortedSet().named("predicate").isFlag().sort_on("id")
    @context_set   = SortedSet().named("context").isFlag().sort_on("id")
    @context_set.docs = "The set of quad contexts."

    # TODO make selectable_sets drive gclui.build_set_picker
    #      with the nesting data coming from .sub_of(@all) as above
    @selectable_sets =
      all_set: @all_set
      chosen_set: @chosen_set
      selected_set: @selected_set
      shelved_set: @shelved_set
      discarded_set: @discarded_set
      hidden_set: @hidden_set
      graphed_set: @graphed_set
      labelled_set: @labelled_set
      pinned_set: @pinned_set
      nameless_set: @nameless_set
      walked_set: @walked_set

  get_set_by_id: (setId) ->
    setId = setId is 'fixed' and 'pinned' or setId # because pinned uses fixed as its 'name'
    return this[setId + '_set']

  update_all_counts: ->
    @update_set_counts()
    #@update_predicate_counts()

  update_predicate_counts: ->
    console.warn('the unproven method update_predicate_counts() has just been called')
    for a_set in @predicate_set
      name = a_set.lid
      @gclui.on_predicate_count_update(name, a_set.length)

  update_set_counts: ->
    for name, a_set of @selectable_sets
      @gclui.on_set_count_update(name, a_set.length)

  create_taxonomy: ->
    # The taxonomy is intertwined with the taxon_picker
    @taxonomy = {}  # make driven by the hierarchy

  summarize_taxonomy: ->
    out = ""
    tree = {}
    for id, taxon of @taxonomy
      out += "#{id}: #{taxon.state}\n"
      tree[id] = taxon.state
    return tree

  regenerate_english: ->
    root = 'Thing'
    if @taxonomy[root]? # TODO this should be the ROOT, not literally Thing
      @taxonomy[root].update_english()
    else
      console.log("not regenerating english because no taxonomy[#{root}]")
    return

  get_or_create_taxon: (taxon_id) ->
    if not @taxonomy[taxon_id]?
      taxon = new Taxon(taxon_id)
      @taxonomy[taxon_id] = taxon
      parent_lid = @ontology.subClassOf[taxon_id] or @HHH[taxon_id] or 'Thing'
      if parent_lid?
        parent = @get_or_create_taxon(parent_lid)
        taxon.register_superclass(parent)
        label = @ontology.label[taxon_id]
      @gclui.add_taxon(taxon_id, parent_lid, label, taxon) # FIXME should this be an event on the Taxon constructor?
    @taxonomy[taxon_id]

  update_labels_on_pickers: () ->
    for term_id, term_label of @ontology.label
      # a label might be for a taxon or a predicate, so we must sort out which
      if @gclui.taxon_picker.id_to_name[term_id]?
        @gclui.taxon_picker.set_name_for_id(term_label, term_id)
      if @gclui.predicate_picker.id_to_name[term_id]?
        @gclui.predicate_picker.set_name_for_id(term_label, term_id)

  toggle_taxon: (id, hier, callback) ->
    if callback?
      @gclui.set_taxa_click_storm_callback(callback)
    # TODO preserve the state of collapsedness?
    hier = hier? ? hier : true # default to true
    if hier
      @gclui.taxon_picker.collapse_by_id(id)
    @topJQElem.find("##{id}").trigger("click")
    if hier
      @gclui.taxon_picker.expand_by_id(id)

  do: (args) ->
    cmd = new gcl.GraphCommand(this, args)
    @gclc.run(cmd)

  reset_data: ->
    # TODO fix gclc.run so it can handle empty sets
    if @discarded_set.length
      @do({verbs: ['shelve'], sets: [@discarded_set.id]})
    if @graphed_set.length
      @do({verbs: ['shelve'], sets: [@graphed_set.id]})
    if @hidden_set.length
      @do({verbs: ['shelve'], sets: [@hidden_set.id]})
    if @selected_set.length
      @do({verbs: ['unselect'], sets: [@selected_set.id]})
    @gclui.reset_editor()
    @gclui.select_the_initial_set()

  perform_tasks_after_dataset_loaded: ->
    @gclui.select_the_initial_set()
    if not @args.skip_discover_names
      @discover_names()

  reset_graph: ->
    @G = {} # is this deprecated?
    @init_sets()
    @init_gclc()
    @init_editc_or_not()
    @indexed_dbservice()  # REVIEW is this needed?
    @init_indexddbstorage() # REVIEW and this?

    @force.nodes(@nodes)
    @force.links(@links_set)
    if not @args.skip_log_tick
      console.log "Tick in @force.nodes() reset_graph"

    # TODO move this SVG code to own renderer
    d3.select("#{@args.huviz_top_sel} .link").remove()
    d3.select("#{@args.huviz_top_sel} .node").remove()
    d3.select("#{@args.huviz_top_sel} .lariat").remove()
    @node = @svg.selectAll("#{@args.huviz_top_sel} .node")
    @link = @svg.selectAll("#{@args.huviz_top_sel} .link") # looks bogus, see @link assignment below
    @lariat = @svg.selectAll("#{@args.huviz_top_sel} .lariat")

    @link = @link.data(@links_set)
    @link.exit().remove()
    @node = @node.data(@nodes)
    @node.exit().remove()
    @force.start()
    if not @args.skip_log_tick
      console.log "Tick in @force.start() reset_graph2"

  set_node_radius_policy: (evt) ->
    # TODO(shawn) remove or replace this whole method
    f = $("select#node_radius_policy option:selected").val()
    return  unless f
    if typeof f is typeof "str"
      @node_radius_policy = node_radius_policies[f]
    else if typeof f is typeof @set_node_radius_policy
      @node_radius_policy = f
    else
      console.log "f =", f

  DEPRECATED_init_node_radius_policy: ->
    policy_box = d3.select("#huvis_controls").append("div", "node_radius_policy_box")
    policy_picker = policy_box.append("select", "node_radius_policy")
    policy_picker.on "change", set_node_radius_policy
    for policy_name of node_radius_policies
      policy_picker.append("option").attr("value", policy_name).text policy_name

  calc_node_radius: (d) ->
    total_links = d.links_to.length + d.links_from.length
    diff_adjustment = 10 * (total_links/(total_links+9))
    final_adjustment =  @node_diff * (diff_adjustment - 1)
    if d.radius?
      return d.radius
    return @node_radius * (not d.selected? and 1 or @selected_mag) + final_adjustment
    #@node_radius_policy d
  names_in_edges: (set) ->
    out = []
    set.forEach (itm, i) ->
      out.push itm.source.name + " ---> " + itm.target.name
    out
  dump_details: (node) ->
    return unless window.dump_details
    #
    #    if (! DUMP){
    #      if (node.s.id != '_:E') return;
    #    }
    #
    console.log "================================================="
    console.log node.name
    console.log "  x,y:", node.x, node.y
    try
      console.log "  state:", node.state.state_name, node.state
    console.log "  chosen:", node.chosen
    console.log "  fisheye:", node.fisheye
    console.log "  fixed:", node.fixed
    console.log "  links_shown:", node.links_shown.length, @names_in_edges(node.links_shown)
    console.log "  links_to:", node.links_to.length, @names_in_edges(node.links_to)
    console.log "  links_from:", node.links_from.length, @names_in_edges(node.links_from)
    console.log "  showing_links:", node.showing_links
    console.log "  in_sets:", node.in_sets

   # Return the nodes which can be seen and are worth checking for proximity, etc.
  is_node_visible: (node) ->
    return not @hidden_set.has(node)

  # Return an array (not a SortedSet) of nodes which are visible
  get_visible_subset: (super_set) ->
    super_set ?= @all_set
    retlist = []
    for node in super_set
      if @is_node_visible(node)
        retlist.push(node)
    return super_set

  # # References:
  # https://github.com/d3/d3-quadtree
  #
  # # Examples
  #
  # * http://bl.ocks.org/patricksurry/6478178
  # * https://bl.ocks.org/mbostock/9078690
  #
  # # Status
  #
  # Having trouble getting access to the addAll method
  WIP_find_node_or_edge_closest_to_pointer_using_quadtrees: ->
    quadtree = d3.geom.quadtree()
      .extent([[-1, -1], [@width + 1, @height + 1]])
      .addAll(@get_visible_subset())
    [mx, my] = @last_mouse_pos
    qNodes = (qTree) ->
      ret = []
      qTree.visit (node, x0, y0, x1, y1) ->
        node.x0 = x0
        node.y0 = y0
        node.x1 = x1
        node.y1 = y1
        ret.push(node)
    data = qNodes(quadtree)
    found = quadtree.find(mx, my)
    debugger

  find_node_or_edge_closest_to_pointer: ->
    @highwater('find_node_or_edge', true)
    new_focused_node = null
    new_focused_edge = null
    new_focused_idx = null
    focus_threshold = @focus_threshold
    closest_dist = @width
    closest_point = null

    seeking = null # holds property name of the thing we are seeking: 'focused_node'/'object_node'/false
    if @dragging
      if not @editui.is_state('connecting')
        return
      seeking = "object_node"
    else
      seeking = "focused_node"

    # TODO build a spatial index!!!! OMG https://github.com/smurp/huviz/issues/25
    # Examine every node to find the closest one within the focus_threshold
    @all_set.forEach (d, i) =>
      n_dist = distance(d.fisheye or d, @last_mouse_pos)
      #console.log(d)
      if n_dist < closest_dist
        closest_dist = n_dist
        closest_point = d.fisheye or d
      if not (seeking is 'object_node' and @dragging and @dragging.id is d.id)
        if n_dist <= focus_threshold
          new_focused_node = d
          focus_threshold = n_dist
          new_focused_idx = i

    # Examine the center of every edge and make it the new_focused_edge
    #   if close enough and the closest thing
    @links_set.forEach (e, i) =>
      if e.handle?
        e_dist = distance(e.handle, @last_mouse_pos)
        if e_dist < closest_dist
          closest_dist = e_dist
          closest_point = e.handle
        if e_dist <= focus_threshold
          new_focused_edge = e
          focus_threshold = e_dist
          new_focused_edge_idx = i

    if new_focused_edge # the mouse is closer to an edge than a node
      new_focused_node = null
      seeking = null

    if closest_point
      if @draw_circle_around_focused
        @draw_circle(closest_point.x, closest_point.y, @node_radius * 3, "red")

    @set_focused_node(new_focused_node)
    @set_focused_edge(new_focused_edge)

    if seeking is 'object_node'
      @editui.set_object_node(new_focused_node)
    @highwater('find_node_or_edge')
    return

  highwater_incr: (id) ->
    @highwatermarks ?= {}
    hwm = @highwatermarks
    hwm[id] = (hwm[id]? and hwm[id] or 0) + 1

  highwater: (id, start) ->
    @highwatermarks ?= {}
    hwm = @highwatermarks
    if start?
      hwm[id + '__'] = performance.now()
    else
      diff = performance.now() - hwm[id + '__']
      hwm[id] ?= diff
      if hwm[id] < diff
        hwm[id] = diff

  DEPRECATED_showing_links_to_cursor_map:
    all: 'not-allowed'
    some: 'all-scroll'
    none: 'pointer'

  set_focused_node: (node) -> # node might be null
    if @focused_node is node
      return # no change so skip
    if @focused_node
      # unfocus the previously focused_node
      if @use_svg
        d3.select(".focused_node").classed("focused_node", false)
      #@unscroll_pretty_name(@focused_node)
      @focused_node.focused_node = false
    if node
      if @use_svg
        svg_node = node[0][new_focused_idx]
        d3.select(svg_node).classed("focused_node", true)
      node.focused_node = true
    @focused_node = node # might be null
    if @focused_node
      #console.log("focused_node:", @focused_node)
      @gclui.engage_transient_verb_if_needed("select") # select is default verb
    else
      @gclui.disengage_transient_verb_if_needed()

  set_focused_edge: (new_focused_edge) ->
    if @proposed_edge and @focused_edge # TODO why bail now???
      return
    #console.log "set_focused_edge(#{new_focused_edge and new_focused_edge.id})"
    unless @focused_edge is new_focused_edge
      if @focused_edge? #and @focused_edge isnt new_focused_edge
        #console.log "removing focus from previous focused_edge"
        @focused_edge.focused = false
        delete @focused_edge.source.focused_edge
        delete @focused_edge.target.focused_edge
      if new_focused_edge?
        # FIXME add use_svg stanza
        new_focused_edge.focused = true
        new_focused_edge.source.focused_edge = true
        new_focused_edge.target.focused_edge = true
      @focused_edge = new_focused_edge # blank it or set it
      if @focused_edge?
        if @editui.is_state('connecting')
          @text_cursor.pause("", "edit this edge")
        else
          @text_cursor.pause("", "show edge sources")
      else
        @text_cursor.continue()

  @proposed_edge = null #initialization (no proposed edge active)
  set_proposed_edge: (new_proposed_edge) ->
    console.log "Setting proposed edge...", new_proposed_edge
    if @proposed_edge
      delete @proposed_edge.proposed # remove .proposed flag from old one
    if new_proposed_edge
      new_proposed_edge.proposed = true # flag the new one
    @proposed_edge = new_proposed_edge # might be null
    @set_focused_edge(new_proposed_edge) # a proposed_edge also becomes focused

  install_update_pointer_togglers: ->
    console.warn("the update_pointer_togglers are being called too often")
    d3.select("#huvis_controls").on "mouseover", () =>
      @update_pointer = false
      @text_cursor.pause("default")
      #console.log "update_pointer: #{@update_pointer}"
    d3.select("#huvis_controls").on "mouseout", () =>
      @update_pointer = true
      @text_cursor.continue()
      #console.log "update_pointer: #{@update_pointer}"

  DEPRECATED_adjust_cursor: ->
    # http://css-tricks.com/almanac/properties/c/cursor/
    if @focused_node
      next = @showing_links_to_cursor_map[@focused_node.showing_links]
    else
      next = 'default'
    @text_cursor.set_cursor(next)

  set_cursor_for_verbs: (verbs) ->
    if not @use_fancy_cursor
      return
    text = [@human_term[verb] for verb in verbs].join("\n")
    if @last_cursor_text isnt text
      @text_cursor.set_text(text)
      @last_cursor_text = text

  auto_change_verb: ->
    if @focused_node
      @gclui.auto_change_verb_if_warranted(@focused_node)

  get_focused_node_and_its_state: ->
    focused = @focused_node
    if not focused
      return
    retval = (focused.lid or '') + ' '
    if not focused.state?
      msg = retval + ' has no state!!! This is unpossible!!!! name:'
      focused._warnings ?= {}
      if not focused._warnings[msg]
        # warn each unique message once
        console.warn(msg, focused.name)
        focused._warnings[msg] = true
      return
    retval += focused.state.id
    return retval

  on_tick_change_current_command_if_warranted: ->
    # It is warranted if we are hovering over nodes and the last state and this stat differ.
    # The status of the current command might change even if the mouse has not moved, because
    # for instance the graph has wiggled around under a stationary mouse.  For that reason
    # it is legit to go to the trouble of updating the command on the tick.  When though?
    # The command should be changed if one of a number of things has changed since last tick:
    #  * the focused node
    #  * the state of the focused node
    if @prior_node_and_state isnt @get_focused_node_and_its_state() # ie if it has changed
      if @gclui.engaged_verbs.length
        nodes = @focused_node? and [@focused_node] or []
        @gclui.prepare_command(
          @gclui.new_GraphCommand({verbs: @gclui.engaged_verbs, subjects: nodes}))

  position_nodes_by_force: ->
    only_move_subject = @editui.is_state('connecting') and @dragging and @editui.subject_node
    @nodes.forEach (node, i) =>
      @reposition_node_by_force(node, only_move_subject)

  reposition_node_by_force: (node, only_move_subject) ->
    if @dragging is node
      @move_node_to_point(node, @last_mouse_pos)
    if only_move_subject
      return
    if not @graphed_set.has(node)  # slower
    #if node.showing_links is 'none' # faster
      return
    node.fisheye = @fisheye(node)

  apply_fisheye: ->
    @links_set.forEach (e) =>
      e.target.fisheye = @fisheye(e.target)  unless e.target.fisheye

    if @use_svg
      link.attr("x1", (d) ->
        d.source.fisheye.x
      ).attr("y1", (d) ->
        d.source.fisheye.y
      ).attr("x2", (d) ->
        d.target.fisheye.x
      ).attr "y2", (d) ->
        d.target.fisheye.y

  shown_messages: []
  show_message_once: (msg, alert_too) ->
    if @shown_messages.indexOf(msg) is -1
      @shown_messages.push(msg)
      console.log(msg)
      if alert_too
        alert(msg)

  draw_edges_from: (node) ->
    num_edges = node.links_to.length
    #@show_message_once "draw_edges_from(#{node.id}) "+ num_edges
    return unless num_edges

    draw_n_n = {}
    for e in node.links_shown
      msg = ""
      #if e.source is node
        #continue
      if e.source.embryo
        msg += "source #{e.source.name} is embryo #{e.source.id}; "
        msg += e.id + " "
      if e.target.embryo
        msg += "target #{e.target.name} is embryo #{e.target.id}"
      if msg isnt ""
        #@show_message_once(msg)
        continue
      n_n = e.source.lid + " " + e.target.lid
      if not draw_n_n[n_n]?
        draw_n_n[n_n] = []
      draw_n_n[n_n].push(e)
      #@show_message_once("will draw edge() n_n:#{n_n} e.id:#{e.id}")
    edge_width = @edge_width
    for n_n, edges_between of draw_n_n
      sway = 1
      for e in edges_between
        #console.log e
        if e.focused? and e.focused
          line_width = @edge_width * @peeking_line_thicker
        else
          line_width = edge_width
        line_width = line_width + (@line_edge_weight * e.contexts.length)
        #@show_message_once("will draw line() n_n:#{n_n} e.id:#{e.id}")
        if (e.source.fisheye.x == e.target.fisheye.x) and (e.source.fisheye.y == e.target.fisheye.y)
          x2 = @width/2 # Find centre of draw area
          y2 = @height/2
          #arw_angle = Math.atan((e.source.fisheye.y - y2)/(e.source.fisheye.x - x2)) # find angle between node center and draw area center
          arw_angle = Math.atan((e.source.fisheye.y - y2)/(e.source.fisheye.x - x2))
          #console.log arw_angle
          #console.log (e.source.fisheye.y - y2)/(e.source.fisheye.x - x2)
          if (x2 > e.source.fisheye.x) then arw_angle = arw_angle + 3
          @draw_self_edge_circle(e.source.fisheye.x, e.source.fisheye.y, e.color, e.contexts.length, line_width, e, arw_angle)
        else
          @draw_curvedline(e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x,
                           e.target.fisheye.y, sway, e.color, e.contexts.length, line_width, e)

        if node.walked # ie is part of the walk path
          @draw_walk_edge_from(node, e, sway)
        sway++

  draw_walk_edge_from: (node, edge, sway) ->
    #if this line from path node to path node then add black highlight
    if @edgeIsOnWalkedPath(edge)
      directional_edge = (edge.source.walkedIdx0 > edge.source.walkedIdx0) and 'forward' or 'backward'
      e = edge
      if directional_edge
        @draw_curvedline(e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x,
                         e.target.fisheye.y, sway, "black", e.contexts.length, 1, e, directional_edge)

  draw_edges: ->
    if not @show_edges
      return
    if @use_canvas
      @graphed_set.forEach (node, i) =>
        @draw_edges_from(node)

    if @use_webgl
      dx = @width * xmult
      dy = @height * ymult
      dx = -1 * @cx
      dy = -1 * @cy
      @links_set.forEach (e) =>
        #e.target.fisheye = @fisheye(e.target)  unless e.target.fisheye
        @add_webgl_line e  unless e.gl
        l = e.gl

        #
        #	  if (e.source.fisheye.x != e.target.fisheye.x &&
        #	      e.source.fisheye.y != e.target.fisheye.y){
        #	      alert(e.id + " edge has a length");
        #	  }
        #
        @mv_line l, e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y
        @dump_line l

    if @use_webgl and false
      @links_set.forEach (e, i) =>
        return  unless e.gl
        v = e.gl.geometry.vertices
        v[0].x = e.source.fisheye.x
        v[0].y = e.source.fisheye.y
        v[1].x = e.target.fisheye.x
        v[1].y = e.target.fisheye.y

  draw_nodes_in_set: (set, radius, center) ->
    # cx and cy are local here TODO(smurp) rename cx and cy
    cx = center[0]
    cy = center[1]
    num = set.length
    set.forEach (node, i) =>
      #clockwise = false
      # 0 or 1 starts at 6, 0.5 starts at 12, 0.75 starts at 9, 0.25 starts at 3
      start = 1 - nodeOrderAngle
      if @display_shelf_clockwise
        rad = tau * (start - i / num)
      else
        rad = tau * (i / num + start)

      node.rad = rad
      node.x = cx + Math.sin(rad) * radius
      node.y = cy + Math.cos(rad) * radius
      node.fisheye = @fisheye(node)
      if @use_canvas
        filclrs = @get_node_color_or_color_list(
          node, renderStyles.nodeHighlightOutline)
        @draw_pie(node.fisheye.x, node.fisheye.y,
                  @calc_node_radius(node),
                  node.color or "yellow",
                  filclrs)
      if @use_webgl
        @mv_node node.gl, node.fisheye.x, node.fisheye.y

  draw_discards: ->
    @draw_nodes_in_set(@discarded_set, @discard_radius, @discard_center)
  draw_shelf: ->
    @draw_nodes_in_set(@shelved_set, @graph_radius, @lariat_center)
  draw_nodes: ->
    if @use_svg
      node.attr("transform", (d, i) ->
        "translate(" + d.fisheye.x + "," + d.fisheye.y + ")"
      ).attr "r", calc_node_radius
    if @use_canvas or @use_webgl
      @graphed_set.forEach (d, i) =>
        d.fisheye = @fisheye(d)
        #console.log d.name.NOLANG
        if @use_canvas
          node_radius = @calc_node_radius(d)
          stroke_color = d.color or 'yellow'
          if d.chosen?
            stroke_color = renderStyles.nodeHighlightOutline
            # if the node d is in the @walked_set it needs special_focus
            special_focus = not not d.walked  # "not not" forces boolean
          # if 'pills' is selected; change node shape to rounded squares
          if (node_display_type == 'pills')
            pill_width = node_radius * 2
            pill_height = node_radius * 2
            filclr = @get_node_color_or_color_list(d)
            rndng = 1
            x = d.fisheye.x
            y = d.fisheye.y
            @rounded_rectangle(x, y,
                      pill_width,
                      pill_height,
                      rndng,
                      stroke_color,
                      filclr)
          else if @show_images_in_nodes and
              (imgUrl = (d.__thumbnail or @args.default_node_url))
            try
              imageData = @get_or_create_round_img(imgUrl)
            catch e
              console.error(e)
            @draw_round_img(
              d.fisheye.x, d.fisheye.y,
              node_radius,
              stroke_color,
              filclr,
              special_focus,
              imageData,
              imgUrl)
          else
            @draw_pie(d.fisheye.x, d.fisheye.y,
                      node_radius,
                      stroke_color,
                      @get_node_color_or_color_list(d),
                      special_focus)
        if @use_webgl
          @mv_node(d.gl, d.fisheye.x, d.fisheye.y)

  get_node_color_or_color_list: (n, default_color) ->
    default_color ?= 'black'
    if @color_nodes_as_pies and n._types and n._types.length > 1
      @recolor_node(n, default_color)
      return n._colors
    return [n.color or default_color]

  get_or_create_round_img: (url) ->
    @round_img_cache ?= {}
    display_image_size = 128
    if not (img = @round_img_cache[url])
      imgId = @unique_id('round_img_')
      roundImage = document.createElement('img')
      round_image_maker = document.createElement("CANVAS")
      round_image_maker.width = display_image_size # size of ultimate image
      round_image_maker.height = display_image_size
      ctx = round_image_maker.getContext("2d")

      origImage = new Image()
      origImage.crossOrigin = "Anonymous";
      origImage.src = url # path to image file

      origImage.onload = () ->  # When image is loaded create a new round image
        ctx.beginPath()
        # This needs to be half the size of height/width to fill canvas area
        ctx.arc(display_image_size/2, display_image_size/2,
                display_image_size/2, 0, 2 * Math.PI, false)
        ctx.clip()
        ctx.fillStyle = renderStyles.pageBg
        ctx.fill()

        if origImage.width > origImage.height  # Landscape image
          w = Math.round(origImage.width * display_image_size/origImage.height)
          h = Math.round(display_image_size)
          x = - Math.round((w - h)/2)
          y = 0
        else # Portrait image
          w = Math.round(display_image_size)
          h = Math.round(origImage.height * display_image_size/origImage.width)
          x = 0
          y = Math.round((w - h)/2)
        ctx.drawImage(origImage, x, y, w, h) # This just paints the image as is
        roundImage.src = round_image_maker.toDataURL()
      @round_img_cache[url] = roundImage
    return roundImage

  get_label_attributes: (d) ->
    text = d.pretty_name
    label_measure = @ctx.measureText(text) #this is total length of text (in ems?)
    browser_font_size = 12.8 # -- Setting or auto from browser?
    focused_font_size = @label_em * browser_font_size * @focused_mag
    padding = focused_font_size * 0.5
    line_height = focused_font_size * 1.25 # set line height to 125%
    max_len = 250
    min_len = 100
    label_length = label_measure.width + 2 * padding
    num_lines_raw = label_length/max_len
    num_lines = (Math.floor num_lines_raw) + 1
    if (num_lines > 1)
      width_default = @label_em * label_measure.width/num_lines
    else
      width_default = max_len
    bubble_text = []
    text_cuts = []
    ln_i = 0
    bubble_text[ln_i] = ""
    if (label_length < (width_default + 2 * padding)) # single line label
      max_line_length = label_length - padding
    else # more than one line so calculate how many and create text lines array
      text_split = text.split(' ') # array of words
      max_line_length = 0
      for word, i in text_split
        word_length = @ctx.measureText(word) #Get length of next word
        line_length = @ctx.measureText(bubble_text[ln_i]) #Get current line length
        new_line_length = word_length.width + line_length.width #add together for testing
        if (new_line_length < width_default) #if line length is still less than max
          bubble_text[ln_i] = bubble_text[ln_i] + word + " " #add word to bubble_text
        else #new line needed
          text_cuts[ln_i] = i
          real_line_length = @ctx.measureText(bubble_text[ln_i])
          new_line_width = real_line_length.width
          if (new_line_width > max_line_length) # remember longest line lengthth
            max_line_length = real_line_length.width
          ln_i++
          bubble_text[ln_i] = word + " "
    width = max_line_length + 2 * padding #set actual width of box to longest line of text
    height = (ln_i + 1) * line_height + 2 * padding # calculate height using wrapping text
    font_size = @label_em
    #console.log text
    #console.log "focused_font_size: " + focused_font_size
    #console.log "line height: " + line_height
    #console.log "padding: " + padding
    #console.log "label_length: " + label_length
    #console.log "bubble height: " + height
    #console.log "max_line_length: " + max_line_length
    #console.log "bubble width: " + width
    #console.log "bubble cut points: "
    #console.log text_cuts
    d.bub_txt = [width, height, line_height, text_cuts, font_size]

  should_show_label: (node) ->
    (node.labelled or
        node.focused_edge or
        (@label_graphed and node.state is @graphed_set) or
        dist_lt(@last_mouse_pos, node, @label_show_range) or
        (node.name? and node.name.match(@search_regex))) # FIXME make this a flag that gets updated ONCE when the regex changes not something deep in loop!!!
  draw_labels: ->
    if @use_svg
      label.attr "style", (d) ->
        if @should_show_label(d)
          ""
        else
          "display:none"
    if @use_canvas or @use_webgl
      # http://stackoverflow.com/questions/3167928/drawing-rotated-text-on-a-html5-canvas
      # http://diveintohtml5.info/canvas.html#text
      # http://stackoverflow.com/a/10337796/1234699
      focused_font_size = @label_em * @focused_mag
      focused_font = "#{focused_font_size}em sans-serif"
      unfocused_font = "#{@label_em}em sans-serif"
      focused_pill_font = "#{@label_em}em sans-serif"

      label_node = (node) =>
        return unless @should_show_label(node)
        ctx = @ctx
        ctx.textBaseline = "middle"
        # perhaps scrolling should happen here
        #if not node_display_type and (node.focused_node or node.focused_edge?)
        if node.focused_node or node.focused_edge?
          label = @scroll_pretty_name(node)
          ctx.fillStyle = node.color
          ctx.font = focused_font
        else
          ctx.fillStyle = renderStyles.labelColor #"white" is default
          ctx.font = unfocused_font
        if not node.fisheye?
          return

        flip_point = @cx
        if  @discarded_set.has(node)
          flip_point = @discard_center[0]
        else if @shelved_set.has(node)
          flip_point = @lariat_center[0]

        if not @graphed_set.has(node) and @draw_lariat_labels_rotated
          # Flip label rather than write upside down
          #   var flip = (node.rad > Math.PI) ? -1 : 1;
          #   view-source:http://www.jasondavies.com/d3-dependencies/
          radians = node.rad
          flip = node.fisheye.x < flip_point # @cx  # flip labels on the left of center line
          textAlign = 'left'
          if flip
            radians = radians - Math.PI
            textAlign = 'right'
          ctx.save()
          ctx.translate(node.fisheye.x, node.fisheye.y)
          ctx.rotate -1 * radians + Math.PI / 2
          ctx.textAlign = textAlign
          if @debug_shelf_angles_and_flipping
            if flip #radians < 0
              ctx.fillStyle = 'rgb(255,0,0)'
            ctx.fillText(("  " + flip + "  " + radians).substr(0,14), 0, 0)
          else
            ctx.fillText("  " + node.pretty_name + "  ", 0, 0)
          ctx.restore()
        else
          if (node_display_type == 'pills')
            node_font_size = node.bub_txt[4]
            result = node_font_size != @label_em
            if not node.bub_txt.length or result
              @get_label_attributes(node)
            line_height = node.bub_txt[2]  # Line height calculated from text size ?
            adjust_x = node.bub_txt[0] / 2 - line_height/2# Location of first line of text
            adjust_y = node.bub_txt[1] / 2 - line_height
            pill_width = node.bub_txt[0] # box size
            pill_height = node.bub_txt[1]

            x = node.fisheye.x - pill_width/2
            y = node.fisheye.y - pill_height/2
            radius = 10 * @label_em
            alpha = 1
            outline = node.color
            # change box edge thickness and fill if node selected
            if node.focused_node or node.focused_edge?
              ctx.lineWidth = 2
              fill = "#f2f2f2"
            else
              ctx.lineWidth = 1
              fill = "white"
            @rounded_rectangle(x, y, pill_width, pill_height, radius, fill, outline, alpha)
            ctx.fillStyle = "#000"
            # Paint multi-line text
            text = node.pretty_name
            text_split = text.split(' ') # array of words
            cuts = node.bub_txt[3]
            print_label = ""
            for text, i in text_split
              if cuts and i in cuts
                ctx.fillText print_label.slice(0,-1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y
                adjust_y = adjust_y - line_height
                print_label = text + " "
              else
                print_label = print_label + text + " "
            if print_label # print last line, or single line if no cuts
              ctx.fillText print_label.slice(0,-1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y
          else
            ctx.fillText "  " + node.pretty_name + "  ", node.fisheye.x, node.fisheye.y

      @graphed_set.forEach(label_node)
      @shelved_set.forEach(label_node)
      @discarded_set.forEach(label_node)

  draw_focused_labels: ->
    ctx = @ctx
    focused_font_size = @label_em * @focused_mag
    focused_font = "#{focused_font_size}em sans-serif"
    focused_pill_font = "#{@label_em}em sans-serif"
    highlight_node = (node) =>
      if node.focused_node or node.focused_edge?
        if (node_display_type == 'pills')
          ctx.font = focused_pill_font
          node_font_size = node.bub_txt[4]
          result = node_font_size != @label_em
          if not node.bub_txt.length or result
            @get_label_attributes(node)
          line_height = node.bub_txt[2]  # Line height calculated from text size ?
          adjust_x = node.bub_txt[0] / 2 - line_height/2# Location of first line of text
          adjust_y = node.bub_txt[1] / 2 - line_height
          pill_width = node.bub_txt[0] # box size
          pill_height = node.bub_txt[1]

          x = node.fisheye.x - pill_width/2
          y = node.fisheye.y - pill_height/2
          radius = 10 * @label_em
          alpha = 1
          outline = node.color
          # change box edge thickness and fill if node selected
          if node.focused_node or node.focused_edge?
            ctx.lineWidth = 2
            fill = "#f2f2f2"
          else
            ctx.lineWidth = 1
            fill = "white"
          @rounded_rectangle(x, y, pill_width, pill_height, radius, fill, outline, alpha)
          ctx.fillStyle = "#000"
          # Paint multi-line text
          text = node.pretty_name
          text_split = text.split(' ') # array of words
          cuts = node.bub_txt[3]
          print_label = ""
          for text, i in text_split
            if cuts and i in cuts
              ctx.fillText print_label.slice(0,-1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y
              adjust_y = adjust_y - line_height
              print_label = text + " "
            else
              print_label = print_label + text + " "
          if print_label # print last line, or single line if no cuts
            ctx.fillText print_label.slice(0,-1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y
        else
          label = @scroll_pretty_name(node)
          if node.state.id is "graphed"
            cart_label = node.pretty_name
            ctx.measureText(cart_label).width #forces proper label measurement (?)
            if @paint_label_dropshadows
              @paint_dropshadow(cart_label, focused_font_size, node.fisheye.x, node.fisheye.y)
          ctx.fillStyle = node.color # This is the mouseover highlight color when GRAPHED
          ctx.font = focused_font
          ctx.fillText "  " + node.pretty_name + "  ", node.fisheye.x, node.fisheye.y
    @graphed_set.forEach(highlight_node)

  clear_canvas: ->
    @ctx.clearRect 0, 0, @canvas.width, @canvas.height
  blank_screen: ->
    @clear_canvas()  if @use_canvas or @use_webgl

  should_position_by_packing: ->
    return not @show_edges

  position_nodes_by_packing: ->
    # https://bl.ocks.org/mbostock/3231298
    if not @should_position_by_packing()
      return
    q = d3.geom.quadtree(@graphed_set)
    i = 0
    n = @graphed_set.length
    while (++i < n)
      q.visit(@position_node_by_packing(@graphed_set[i]))

  position_node_by_packing: (node) ->
    r = node.radius + 16
    nx1 = node.x - r
    nx2 = node.x + r
    ny1 = node.y - r
    ny2 = node.y + r
    return (quad, x1, y1, x2, y2) ->
      if (quad.point and (quad.point isnt node))
        x = node.x - quad.point.x
        y = node.y - quad.point.y
        l = Math.sqrt(x * x + y * y)
        r = node.radius + quad.point.radius
        if (l < r)
          l = (l -r) / 1 * .5
          node.x -= x *= l
          node.y -= y *= l
          quad.point.x += x
          quad.point.y += y
      return x1 > nx2 or x2 < nx1 or y1 > ny2 or y2 < ny1

  # # The distinguished node
  # There are phenomena which pertain to one and only one node: the distinguished_node.
  # There may be only one.  There does not have to be one though.
  #
  # Which nodes might be distinguished?
  #
  # * If there is only one node in the chosen_set it becomes the distinguished_node
  # * Being the terminal node in the walked_set is another way to become distinguished.
  #
  # What are the consequences of being distinguished?
  #
  # * the distinguished node is displayed pinned at the center of the graph
  #
  # To see to it that there is no distinguished node, call `@distinguish(null)`
  administer_the_distinguished_node: ->
    dirty = false
    only_chosen = null
    rightfully_distinguished = null
    if @chosen_set.length is 1
      only_chosen = @chosen_set[0]
    if @walked_set.length
      terminal_walked = @walked_set[@walked_set.length - 1]
    rightfully_distinguished = terminal_walked or only_chosen
    if rightfully_distinguished?
      if rightfully_distinguished._is_distinguished?
        # no change is needed so we can quit now
        return
      if @center_the_distinguished_node
        @pin_at_center(rightfully_distinguished)
    emeritus = @distinguish(rightfully_distinguished)
    if emeritus?
      if @center_the_distinguished_node
        @unpin(emeritus)
    if emeritus or rightfully_distinguished
      # there was a change, so update set counts
      @update_set_counts()

  tick: (msg) =>
    if not @ctx?
      return
    if typeof msg is 'string' and not @args.skip_log_tick
      console.log(msg)
    # return if @focused_node   # <== policy: freeze screen when selected
    if true
      if @clean_up_all_dirt_onceRunner?
        if @clean_up_all_dirt_onceRunner.active
          @clean_up_all_dirt_onceRunner.stats.runTick ?= 0
          @clean_up_all_dirt_onceRunner.stats.skipTick ?= 0
          @clean_up_all_dirt_onceRunner.stats.skipTick++
          return
        else
          @clean_up_all_dirt_onceRunner.stats.runTick++
    @highwater('maxtick', true)
    @ctx.lineWidth = @edge_width # TODO(smurp) just edges should get this treatment
    @administer_the_distinguished_node()
    @find_node_or_edge_closest_to_pointer()
    #@WIP_find_node_or_edge_closest_to_pointer_using_quadtrees()
    @auto_change_verb()
    @on_tick_change_current_command_if_warranted()
    #@update_snippet() // not in use
    @blank_screen()
    @draw_dropzones()
    @fisheye.focus @last_mouse_pos
    @show_last_mouse_pos()
    if @should_position_by_packing()
      @position_nodes_by_packing()
    else
      @position_nodes_by_force()
    @apply_fisheye()
    @draw_edges()
    @draw_nodes()
    @draw_shelf()
    @draw_discards()
    @draw_labels()
    @draw_edge_labels()
    @draw_focused_labels()
    @pfm_count('tick')
    @prior_node_and_state = @get_focused_node_and_its_state()
    @highwater('maxtick')
    return

  rounded_rectangle: (x, y, w, h, radius, fill, stroke, alpha) ->
    # http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
    ctx = @ctx
    ctx.fillStyle = fill
    r = x + w
    b = y + h
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(r - radius, y)
    ctx.quadraticCurveTo(r, y, r, y + radius)
    ctx.lineTo(r, y + h - radius)
    ctx.quadraticCurveTo(r, b, r - radius, b)
    ctx.lineTo(x + radius, b)
    ctx.quadraticCurveTo(x, b, x, b - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    if alpha
      ctx.globalAlpha = alpha
    ctx.fill()
    ctx.globalAlpha = 1
    if stroke
      ctx.strokeStyle = stroke
      ctx.stroke()

  paint_dropshadow: (label, focused_font_size, x, y) ->
    ctx = @ctx
    width = @ctx.measureText(label).width * focused_font_size
    focused_font = "#{focused_font_size}em sans-serif"
    height = @label_em * @focused_mag * 16
    ctx.font = focused_font
    ctx.strokeStyle = renderStyles.pageBg
    ctx.lineWidth = 5
    ctx.strokeText("  " + label + "  ", x, y)

  draw_edge_labels: ->
    if not @show_edges
      return
    if @focused_edge?
      @draw_edge_label(@focused_edge)
    if @show_edge_labels_adjacent_to_labelled_nodes
      for edge in @links_set
        if edge.target.labelled or edge.source.labelled
          @draw_edge_label(edge)

  draw_edge_label: (edge) ->
    ctx = @ctx
    # TODO the edge label should really come from the pretty name of the predicate
    #   edge.label > edge.predicate.label > edge.predicate.lid
    label = edge.label or edge.predicate.lid
    if @snippet_count_on_edge_labels
      if edge.contexts?
        if edge.contexts.length
          label += " (#{edge.contexts.length})"
    width = ctx.measureText(label).width
    height = @label_em * @focused_mag * 16
    if @paint_label_dropshadows
      if edge.handle?
        @paint_dropshadow(label, @label_em, edge.handle.x, edge.handle.y)
    #ctx.fillStyle = '#666' #@shadow_color
    #ctx.fillText " " + label, edge.handle.x + @edge_x_offset + @shadow_offset, edge.handle.y + @shadow_offset
    ctx.fillStyle = edge.color
    console.log edge
    ctx.fillText(" " + label, edge.handle.x + @edge_x_offset, edge.handle.y)

  update_snippet: ->
    if @show_snippets_constantly and @focused_edge? and @focused_edge isnt @printed_edge
      @print_edge(@focused_edge)

  msg_history: ""
  show_state_msg: (txt) ->
    if false
      @msg_history += " " + txt
      txt = @msg_history
    @state_msg_box.show()
    @state_msg_box.html("<div class='msg_payload'>" + txt + "</div><div class='msg_backdrop'></div>")
    @state_msg_box.on('click', @hide_state_msg)
    @text_cursor.pause("wait")

  hide_state_msg: () =>
    @state_msg_box.hide()
    @text_cursor.continue()
    #@text_cursor.set_cursor("default")

  svg_restart: ->
    # console.log "svg_restart()"
    @link = @link.data(@links_set)
    @link.enter().
      insert("line", ".node").
      attr "class", (d) ->
        #console.log(l.geometry.vertices[0].x,l.geometry.vertices[1].x);
        "link"

    @link.exit().remove()
    @node = @node.data(@nodes)

    @node.exit().remove()

    nodeEnter = @node.enter().
      append("g").
      attr("class", "lariat node").
      call(force.drag)
    nodeEnter.append("circle").
      attr("r", calc_node_radius).
      style "fill", (d) ->
        d.color

    nodeEnter.append("text").
      attr("class", "label").
      attr("style", "").
      attr("dy", ".35em").
      attr("dx", ".4em").
      text (d) ->
        d.name

    @label = @svg.selectAll(".label")

  canvas_show_text: (txt, x, y) ->
    # console.log "canvas_show_text(" + txt + ")"
    @ctx.fillStyle = "black"
    @ctx.font = "12px Courier"
    @ctx.fillText txt, x, y
  pnt2str: (x, y) ->
    "[" + Math.floor(x) + ", " + Math.floor(y) + "]"
  show_pos: (x, y, dx, dy) ->
    dx = dx or 0
    dy = dy or 0
    @canvas_show_text pnt2str(x, y), x + dx, y + dy
  show_line: (x0, y0, x1, y1, dx, dy, label) ->
    dx = dx or 0
    dy = dy or 0
    label = typeof label is "undefined" and "" or label
    @canvas_show_text pnt2str(x0, y0) + "-->" + pnt2str(x0, y0) + " " + label, x1 + dx, y1 + dy
  add_webgl_line: (e) ->
    e.gl = @add_line(scene, e.source.x, e.source.y, e.target.x, e.target.y, e.source.s.id + " - " + e.target.s.id, "green")

  #dump_line(e.gl);
  webgl_restart: ->
    links_set.forEach (d) =>
      @add_webgl_line d
  restart: ->
    @svg_restart() if @use_svg
    @force.start()
    if not @args.skip_log_tick
      console.log "Tick in @force.start() restart"
  show_last_mouse_pos: ->
    @draw_circle @last_mouse_pos[0], @last_mouse_pos[1], @focus_radius, "yellow"
  remove_ghosts: (e) ->
    if @use_webgl
      @remove_gl_obj e.gl  if e.gl
      delete e.gl
  add_node_ghosts: (d) ->
    d.gl = add_node(scene, d.x, d.y, 3, d.color)  if @use_webgl

  add_to: (itm, array, cmp) ->
    # FIXME should these arrays be SortedSets instead?
    cmp = cmp or array.__current_sort_order or @cmp_on_id
    c = @binary_search_on(array, itm, cmp, true)
    return c  if typeof c is typeof 3
    array.splice c.idx, 0, itm
    c.idx

  remove_from: (itm, array, cmp) ->
    cmp = cmp or array.__current_sort_order or @cmp_on_id
    c = @binary_search_on(array, itm, cmp)
    array.splice c, 1  if c > -1
    array

  my_graph:
    subjects: {}
    predicates: {}
    objects: {}

  fire_newsubject_event: (s) ->
    window.dispatchEvent(
      new CustomEvent 'newsubject',
        detail:
          sid: s
          # time: new Date()
        bubbles: true
        cancelable: true
    )

  ensure_predicate_lineage: (pid) ->
    # Ensure that fire_newpredicate_event is run for pid all the way back
    # to its earliest (possibly abstract) parent starting with the earliest
    pred_lid = uniquer(pid)
    if not @my_graph.predicates[pred_lid]?
      if @ontology.subPropertyOf[pred_lid]?
        parent_lid = @ontology.subPropertyOf[pred_lid]
      else
        parent_lid = "anything"
      @my_graph.predicates[pred_lid] = []
      @ensure_predicate_lineage(parent_lid)
      pred_name = @ontology?label[pred_lid]
      @fire_newpredicate_event(pid, pred_lid, parent_lid, pred_name)

  fire_newpredicate_event: (pred_uri, pred_lid, parent_lid, pred_name) ->
    window.dispatchEvent(
      new CustomEvent 'newpredicate',
        detail:
          pred_uri: pred_uri
          pred_lid: pred_lid
          parent_lid: parent_lid
          pred_name: pred_name
        bubbles: true
        cancelable: true
    )

  auto_discover_header: (uri, digestHeaders, sendHeaders) ->
    # THIS IS A FAILED EXPERIMENT BECAUSE
    # It turns out that for security reasons AJAX requests cannot show
    # the headers of redirect responses.  So, though it is a fine ambition
    # to retrieve the X-PrefLabel it cannot be seen because the 303 redirect
    # it is attached to is processed automatically by the browser and we
    # find ourselves looking at the final response.
    $.ajax
      type: 'GET'
      url: uri
      beforeSend: (xhr) ->
        #console.log(xhr)
        for pair in sendHeaders
          #xhr.setRequestHeader('X-Test-Header', 'test-value')
          xhr.setRequestHeader(pair[0], pair[1])
        #xhr.setRequestHeader('Accept', "text/n-triples, text/x-turtle, */*")
      #headers:
      #  Accept: "text/n-triples, text/x-turtle, */*"
      success: (data, textStatus, request) =>
        console.log(textStatus)
        console.log(request.getAllResponseHeaders())
        console.table((line.split(':') for line in request.getAllResponseHeaders().split("\n")))
        for header in digestHeaders
          val = request.getResponseHeader(header)
          if val?
            alert(val)

  discovery_triple_ingestor_N3: (data, textStatus, request, discoArgs) =>
    # Purpose:
    #   THIS IS NOT YET IN USE.  THIS IS FOR WHEN WE SWITCH OVER TO N3
    #
    #   This is the XHR callback returned by @make_triple_ingestor()
    #   The assumption is that data will be something N3 can parse.
    # Accepts:
    #   discoArgs:
    #     quadTester (OPTIONAL)
    #       returns true if the quad is to be added
    #     quadMunger (OPTIONAL)
    #       returns an array of one or more quads inspired by each quad
    discoArgs ?= {}
    quadTester = discoArgs.quadTester or (q) => q?
    quadMunger = discoArgs.quadMunger or (q) => [q]
    quad_count = 0
    parser = N3.Parser()
    parser.parse data, (err, quad, pref) =>
      if err and discoArgs.onErr?
        discoArgs.onErr(err)
      if quadTester(quad)
        for aQuad in quadMunger(quad)
          @inject_discovered_quad_for(quad, discoArgs.aUrl)

  discovery_triple_ingestor_GreenTurtle: (data, textStatus, request, discoArgs) =>
    # Purpose:
    #   This is the XHR callback returned by @make_triple_ingestor()
    #   The assumption is that data will be something N3 can parse.
    # Accepts:
    #   discoArgs:
    #     quadTester (OPTIONAL)
    #       returns true if the quad is to be added
    #     quadMunger (OPTIONAL)
    #       returns an array of one or more quads inspired by each quad
    discoArgs ?= {}
    graphUri = discoArgs.graphUri
    quadTester = discoArgs.quadTester or (q) => q?
    quadMunger = discoArgs.quadMunger or (q) => [q]
    dataset = new GreenerTurtle().parse(data, "text/turtle")
    for subj_uri, frame of dataset.subjects
      for pred_id, pred of frame.predicates
        for obj in pred.objects
          quad =
            s: frame.id
            p: pred.id
            o: obj # keys: type,value[,language]
            g: graphUri
          if quadTester(quad)
            for aQuad in quadMunger(quad)
              @inject_discovered_quad_for(aQuad, discoArgs.aUrl)
    return

  make_triple_ingestor: (discoArgs) =>
    return (data, textStatus, request) =>
      @discovery_triple_ingestor_GreenTurtle(data, textStatus, request, discoArgs)

  discover_labels: (aUrl) =>
    discoArgs =
      aUrl: aUrl
      quadTester: (quad) =>
        if quad.s isnt aUrl.toString()
          return false
        if not (quad.p in NAME_SYNS)
          return false
        return true
      quadMunger: (quad) =>
        return [quad]
      graphUri: aUrl.origin
    @make_triple_ingestor(discoArgs)

  ingest_quads_from: (uri, success, failure) =>
    $.ajax
      type: 'GET'
      url: uri
      success: success
      failure: failure

  # msec betweeen repetition of a msg display
  discover_geoname_name_msgs_threshold_ms: 5 * 1000

  # TODO eliminate all use of this version in favor of the markdown version
  discover_geoname_name_instructions: """
   Be sure to
     1) create a
        <a target="geonamesAcct"
           href="http://www.geonames.org/login">new account</a>
     2) validate your email
     3) on
        <a target="geonamesAcct"
           href="http://www.geonames.org/manageaccount">manage account</a>
        press
        <a target="geonamesAcct"
            href="http://www.geonames.org/enablefreewebservice">click here to enable</a>
    4) re-enter your GeoNames Username in HuViz settings to trigger lookup</span>"""

  discover_geoname_name_instructions_md: """
    ## How to get GeoNames lookup working

    [GeoNames](http://www.geonames.org) is a very popular service experiencing much load.
    To protect their servers they require a username to be able to perform lookup.
    The hourly limit is 1000 and the daily limit is 30000 per username.

    You may use the `huviz` username if you are going to perform just a couple of lookups.
    If you are going to do lots of GeoNames lookups you should set up your own account.
    Here is how:

    1. create a <a target="geonamesAcct" href="http://www.geonames.org/login">new account</a> if you don't have one
    2. validate your email (if you haven't already)
    3. on the <a target="geonamesAcct" href="http://www.geonames.org/manageaccount">manage account</a> page
       press <a target="geonamesAcct" href="http://www.geonames.org/enablefreewebservice">Click here to enable</a>
       if your account is not already _enabled to use the free web services_
    4. enter your *GeoNames Username* in HuViz `Settings` tab then press the TAB or ENTER key to trigger lookup
    5. if you need to perform more lookups, just adjust the *GeoNames Limit*, then leave that field with TAB, ENTER or a click

    (Soon, HuViz will let you save your personal *GeoNames Username* and your *GeoNames Limit* to make this more convenient.)

  """

  adjust_setting: (input_or_id, new_value, old_value, skip_custom_handler) ->
    # NOTE that old_value is only being provided by adjust_setting_if_needed()
    input = null
    setting_id = null
    if typeof input_or_id is 'string'
      input = @get_setting_input_JQElem(input_or_id)
      setting_id = input_or_id
    else
      input = input_or_id
      setting_id = input[0].name
    theType = input.attr('type')
    if theType in ['checkbox', 'radiobutton']
      #new_value = new_value and 'checked' or null
      input.prop('checked', new_value)
    else
      input.val(new_value)
    if this[setting_id]?
      this[setting_id] = new_value
    @change_setting_to_from(setting_id, new_value, old_value, skip_custom_handler)
    return new_value

  get_setting_input_JQElem: (inputName) ->
    return @topJQElem.find("[name='#{inputName}']")

  countdown_setting: (inputName) ->
    input = @get_setting_input_JQElem(inputName)
    if input.val() < 1
      return 0
    newVal = input.val() - 1
    return @adjust_setting(inputName, newVal)

  preset_discover_geonames_remaining: ->
    count = 0
    for node in @nameless_set
      url = node.id
      if url.includes('geonames.org')
        count++
    return @adjust_setting('discover_geonames_remaining', count)

  show_geonames_instructions: (params) =>
    #params =
    #  msg: "Check your email for confirmation msg"
    # Usage:
    #   show_geonames_instructions({msg:'Check your email for confirmation message.'})
    args =
      width: @width * 0.6
      height: @height * 0.6
    markdown = @discover_geoname_name_instructions_md
    if params?
      if params.msg?
        markdown += """

          #### Error:
          <span style="color:red">#{params.msg}</span>
           """
    @make_markdown_dialog(markdown, null, args)

  discover_geoname_name: (aUrl) ->
    id = aUrl.pathname.replace(/\//g,'')
    soughtId = id
    idInt = parseInt(id)
    userId = @discover_geonames_as
    k2p = @discover_geoname_key_to_predicate_mapping
    url = "http://api.geonames.org/hierarchyJSON?geonameId=#{id}&username=#{userId}"
    if @discover_geonames_remaining < 1
      #console.warn("discover_geoname_name() should not be called when remaining is less than 1")
      return
    if (widget = @discover_geonames_as__widget)
      if widget.state is 'untried'
        @discover_geonames_as__widget.set_state('trying')
      else if widget.state is 'looking'
        if @discover_geonames_remaining < 1
          console.info('stop looking because remaining is', @discover_geonames_remaining)
          return false
        # We decrement remaining before looking or after successfully trying.
        # We do so before looking because we know that the username is good, so this will count.
        # We do so after trying because we do not know until afterward that the username was good and whether it would count.
        rem = @countdown_setting('discover_geonames_remaining')
        #console.info('discover_geoname_name() widget.state =', widget.state, "so decrementing remaining (#{rem}) early")
      else if widget.state is 'good'
        if @discover_geonames_remaining < 1
          #console.info('aborting discover_geoname_name() because remaining =', @discover_geonames_remaining)
          return false
        @discover_geonames_as__widget.set_state('looking')
        console.info('looking for',id,'using name',userId)
      else
        console.warn("discover_goename_name() should not be called when widget.state =", widget.state)
        return false
    @geonames_name_lookups_performed ?= 0
    @geonames_name_lookups_performed += 1
    $.ajax
      url: url
      error: (xhr, status, error) =>
        #console.log(xhr, status, error)
        if error is 'Unauthorized'
          if @discover_geonames_as__widget.state isnt 'bad'
            @discover_geonames_as__widget.set_state('bad')
            @show_geonames_instructions()
      success: (json, textStatus, request) =>
        if json.status
          @discover_geoname_name_msgs ?= {}
          if json.status.message
            msg = """<dt style="font-size:.9em;color:red">#{json.status.message}</dt>""" +
              @discover_geoname_name_instructions
            if userId
              msg = "#{userId} #{msg}"
          if (not @discover_geoname_name_msgs[msg]) or
              (@discover_geoname_name_msgs[msg] and
               Date.now() - @discover_geoname_name_msgs[msg] >
                @discover_geoname_name_msgs_threshold_ms)
            @discover_geoname_name_msgs[msg] = Date.now()
            @make_dialog(msg)
            #@show_state_msg(msg)
          return
        #subj = aUrl.toString()
        if (widget = @discover_geonames_as__widget)
          state_at_start = widget.state
          if state_at_start in ['trying', 'looking']
            if widget.state is 'trying'
              # we decrement remaining after successfully trying or before looking
              @countdown_setting('discover_geonames_remaining') # more remaining
              @discover_geonames_as__widget.set_state('looking') # yes, fall through to looking
            if widget.state is 'looking'
              if @discover_geonames_remaining > 0
                # trigger again because they have been suspended
                # use setTimeout to give nodes a chance to update
                again = () => @discover_names('geonames.org')
                setTimeout(again, 100)
              else
                @discover_geonames_as__widget.set_state('good') # no more remaining lookups permitted
            else # TODO figure out why setting 'good' only when done (and setting 'looking' while 'trying') hangs
              console.log('we should never get here where widget.state =',widget.state)
              #@discover_geonames_as__widget.set_state('good') # finally go to good because we are done
          else
            msg = "state_at_start = #{state_at_start} but it should only be looking or trying (nameless: #{@nameless_set.length})"
            #console.error(msg)
            #throw new Error(msg)
        else
          throw new Error("discover_geonames_as__widget is missing")
        geoNamesRoot = aUrl.origin
        deeperQuad = null
        greedily = @discover_geonames_greedily
        deeply = @discover_geonames_deeply
        depth = 0
        for geoRec in json.geonames by -1 # from most specific to most general
          # Solution! The originally sought geoname (given by aUrl) should have
          # its name injected back into the graph using the exact representation
          # employed in aUrl (ie with or without 'https', 'www' and trailing slash)
          # but all the deeper geoRecs (because they are new to this graph, presumably)
          # should be represented canonically (ie without 'https', 'www' or trailing slash).
          if not depth
            if geoRec.geonameId.toString() isnt soughtId
              console.warn("likely misalignment between representation of soughtId and found",
                           soughtId, "!=", geoRec.geonameId)
            subj = aUrl.toString()
          else
            subj = geoNamesRoot + '/' + geoRec.geonameId # + '/'
          #console.log("discover_geoname_name(#{subj})")
          depth++
          soughtGeoname = (geoRec.geonameId is idInt)
          if (not deeply) and (not soughtGeoname)
            #console.error("skipping because we are not going deep",geoRec.geonameId, id, geoRec.name)
            continue
          #console.table([{id: id, geonameId: geoRec.geonameId, name: geoRec.name}])
          name = (geoRec or {}).name
          placeQuad =
            s: subj
            p: RDF_type
            o:
              value: 'https://schema.org/Place'
              type: RDF_object  # REVIEW are there others?
            g: geoNamesRoot
          @inject_discovered_quad_for(placeQuad, aUrl)

          seen_name = false
          for key, value of geoRec # climb the hierarchy of Places sent by GeoNames
            if key is 'name'
              seen_name = true # so we can break at the end of this loop being done
            else
              if not greedily
                continue
            if key in ['geonameId']
              continue
            pred = k2p[key]
            if not pred
              continue
            theType = RDF_literal

            if typeof value is 'number'
              # REVIEW are these right?
              if Number.isInteger(value)
                theType = 'xsd:integer'
              else
                theType = 'xsd:decimal'
              value = "" + value # convert to string for @add_quad()
            else
              theType = RDF_literal
            quad =
              s: subj
              p: pred
              o:
                value: value
                type: theType  # REVIEW are there others?
              g: geoNamesRoot
            @inject_discovered_quad_for(quad, aUrl)
            if not greedily and seen_name
              break # out of the greedy consumption of all k/v pairs
          if not deeply and depth > 1
            break # out of the deep consumption of all nested contexts
          if deeperQuad
            containershipQuad =
              s: quad.s
              p: 'http://data.ordnancesurvey.co.uk/ontology/spatialrelations/contains'
              o:
                value: deeperQuad.s
                type: RDF_object
              g: geoNamesRoot
            @inject_discovered_quad_for(containershipQuad, aUrl)
          deeperQuad = Object.assign({}, quad) # shallow copy
        return # from success
    return

  ###
          "fcode" : "RGN",
          "adminCodes1" : {
             "ISO3166_2" : "ENG"
          },
          "adminName1" : "England",
           "countryName" : "United Kingdom",
          "fcl" : "L",
          "countryId" : "2635167",
          "adminCode1" : "ENG",
          "name" : "Yorkshire",
          "lat" : "53.95528",
          "population" : 0,
          "geonameId" : 8581589,
          "fclName" : "parks,area, ...",
          "countryCode" : "GB",
          "fcodeName" : "region",
          "toponymName" : "Yorkshire",
          "lng" : "-1.16318"
  ###
  discover_geoname_key_to_predicate_mapping:
    name: RDFS_label
    #toponymName: RDFS_label
    #lat: 'http://dbpedia.org/property/latitude'
    #lng: 'http://dbpedia.org/property/longitude'
    #fcodeName: RDF_literal
    population: 'http://dbpedia.org/property/population'

  inject_discovered_quad_for: (quad, url) ->
    # Purpose:
    #   Central place to perform operations on discoveries, such as caching.
    q = @add_quad(quad)
    @update_set_counts()
    @found_names ?= []
    @found_names.push(quad.o.value)

  deprefix: (uri, prefix, expansion) ->
    # Return uri replacing expansion with prefix if possible
    return uri.replace(expansion, prefix)

  make_sparql_name_for_getty: (uris, expansion, prefix) ->
    # This is good stuff which should be made a bit more general
    # for applicability beyond getty.edu
    #   see https://github.com/cwrc/HuViz/issues/180#issuecomment-489557605
    prefix ?= ':'
    if not Array.isArray(uris)
      uris = [uris]
    if not uris.length
      throw new Error('expecting uris to be an Array of length > 0')
    if uris.length is 1 # so just match that one uri directly
      subj_constraint = "BIND (?s AS <#{uris[0]}>)"
    else # more than 1 so make a FILTER statement for the ?subj match
      # Build a constraint for the subject
      #   FILTER (?subj IN (:300073730, :300153822, :300153825))
      subj_constraint = "FILTER (?s IN (" +
        (@deprefix(uri, prefix, expansion) for uri in uris).join(', ') + "))"
    return """
      PREFIX #{prefix} <#{expansion}>
      SELECT * {
        ?subj gvp:prefLabelGVP [xl:literalForm ?label] .
        #{subj_constraint}
       }""" # """

  make_sparql_name_query: (uris) ->
    if uris.length is 1 # so just match that one uri directly
      #subj_constraint = "BIND (<#{uris[0]}> AS ?subj)"
      subj_constraint = "FILTER (?subj in (<#{uris[0]}>))"
    else # more than 1 so make a FILTER statement for the ?subj match
      # Build a constraint for the subject
      #   FILTER (?subj IN (:300073730, :300153822, :300153825))
      subj_constraint = "FILTER (?subj IN (" +
        (@deprefix(uri, prefix, expansion) for uri in uris).join(', ') + "))"
    return """
      PREFIX dbr: <http://dbpedia.org/resource/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      CONSTRUCT {
        ?subj ?pred ?obj .
      }
      WHERE {
        ?subj ?pred ?obj .
        FILTER (?pred IN (rdfs:label)) .
        #{subj_constraint}
      }
      LIMIT 10
      """ # """
    ###
      PREFIX dbr: <http://dbpedia.org/resource/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      CONSTRUCT {?sub ?pre ?obj}
      WHERE {
         ?sub ?pre ?obj .
         FILTER (?sub IN (dbr:Robert_Tappan_Morris,dbr:Technical_University_of_Berlin)) .
         FILTER (?pre IN (rdfs:label)) .
      }
    ###

    ###
     SELECT ?sub ?obj
     WHERE {
       ?sub rdfs:label|foaf:name ?obj .
       FILTER (?sub IN (<http://dbpedia.org/page/Robert_Tappan_Morris>))
     }
    ###

  make_sparql_name_handler: (uris) ->
    return noop

  make_sparql_name_query_and_handler: (uri_or_uris) ->
    if Array.isArray(uri_or_uris)
      uris = uri_or_uris
    else
      uris = [uri_or_uris]
    query = @make_sparql_name_query(uris)
    handler = @make_sparql_name_handler(uris)
    return [query, handler]

  auto_discover_name_for: (namelessUri) ->
    if namelessUri.startsWith('_') # skip "blank" nodes
      return
    try
      aUrl = new URL(namelessUri)
    catch e
      colorlog("skipping auto_discover_name_for('#{namelessUri}') because")
      console.log(e)
      return
    @highwater_incr('discover_name')

    hasDomainName = (domainName) ->
      return aUrl.hostname.endsWith(domainName)

    if hasDomainName('cwrc.ca')
      console.warn("auto_discover_name_for('#{namelessUri}') skipping cwrc.ca")
      return
      args =
        namelessUri: namelessUri
        #predicates: [OSMT_reg_name, OSMT_name]
        serverUrl: "http://sparql.cwrc.ca/sparql"
      @run_sparql_name_query(args)
      return

    if hasDomainName("id.loc.gov")
      # This is less than ideal because it uses the special knowledge
      # that the .skos.nt file is available. Unfortunately the only
      # RDF file which is offered via content negotiation is .rdf and
      # there is no parser for that in HuViz yet.  Besides, they are huge.
      retval = @ingest_quads_from("#{namelessUri}.skos.nt",
                                  @discover_labels(namelessUri))
      # This cool method would via a proxy but fails in the browser because
      # full header access is blocked by XHR.
      # `@auto_discover_header(namelessUri, ['X-PrefLabel'], sendHeaders or [])`
      return

    if hasDomainName("vocab.getty.edu")
      if (try_even_though_CORS_should_block = false)
        # This would work, but CORS blocks this.  Preserved in case sufficiently
        # robust accounts are set up so the HuViz server could serve as a proxy.
        serverUrl = "http://vocab.getty.edu/download/nt"
        downloadUrl = "#{serverUrl}?uri=#{encodeURIComponent(namelessUri)}"
        retval = @ingest_quads_from(downloadUrl, @discover_labels(namelessUri))
        return
      else
        # Alternative response datatypes are .json, .csv, .tsv and .xml
        args =
          namelessUri: namelessUri
          serverUrl: "http://vocab.getty.edu/sparql.tsv"
        @run_sparql_name_query(args)
        return

    if hasDomainName("openstreetmap.org")
      args =
        namelessUri: namelessUri
        predicates: [OSMT_reg_name, OSMT_name]
        serverUrl: "https://sophox.org/sparql"
      @run_sparql_name_query(args)
      return

    # ## Geonames
    #
    # Geonames has its own API and some complicated use limits so is treated
    # very differently.
    if hasDomainName("geonames.org")
      if @discover_geonames_as__widget.state in ['untried','looking','good'] and
          @discover_geonames_remaining > 0
        @discover_geoname_name(aUrl)
      return

    # As a final backstop we use LDF.  Why last? To spare the LDF server.
    # The endpoint of authority is superior because it ought to be up to date.
    for domainName, serverUrl of @domain2ldfServer
      args =
        namelessUri: namelessUri
        serverUrl: serverUrl
      if hasDomainName(domainName) or domainName is '*'
        @run_ldf_name_query(args)
        return
    return

  discover_names_including: (includes) ->
    if @nameless_set # this might be before the set exists
      @discover_names(includes)
    return

  discover_names: (includes) ->
    #console.log('discover_names(',includes,') # of nameless:',@nameless_set.length)
    for node in @nameless_set
      uri = node.id
      if not (includes? and not uri.includes(includes))
        # only if includes is specified but not found do we skip auto_discover_name_for
        @auto_discover_name_for(uri)
    return

  # ## SPARQL queries

  run_sparql_name_query: (args) ->
    {namelessUri} = args
    args.query ?= "# " +
      ( args.comment or "run_sparql_name_query(#{namelessUri})") + "\n" +
      @make_name_query(namelessUri, args)
    defaults =
      success_handler: @generic_name_success_handler
      result_handler: @name_result_handler
      default_terms:
        s: namelessUri
        p: RDFS_label
    args = @compose_object_from_defaults_and_incoming(defaults, args)
    @run_managed_query_ajax(args)

  # Receive a tsv of rows and call the `result_handler` to process each row.
  #
  # Data might look like:
  # ```
  # ?p ?o
  # rdfs:label "Uncle Bob"
  # rdfs:label "Uncle Sam"
  # ```
  #
  # Meanwhile `result_handler` expects each row to be JSON like:
  #
  # ```json
  # {'?p': 'rdfs:label', '?o': "Uncle Bob"}
  # ```
  tsv_name_success_handler: (data, textStatus, jqXHR, queryManager) =>
    result_handler = queryManager.args.result_handler
    try
      table = []
      #@make_pre_dialog(data, null, {title:"tsv_name_success_handler"})
      try
        lines = data.split(/\r?\n/)
      catch e
        console.info("data:",data)
        throw e
      firstLine = lines.shift()
      cols = firstLine.split("\t")
      for line in lines
        continue if not line
        row = line.split("\t")
        rowJson = _.zipObject(cols, row)
        result_handler(rowJson, queryManager)
        table.push(rowJson)
      queryManager.setResultCount(table.length)
    catch e
      @make_json_dialog(table)
      queryManager.fatalError(e)
    return

  json_name_success_handler: (data, textStatus, jqXHR, queryManager) =>
    result_handler = queryManager.args.result_handler
    try
      table = []
      for resultJson in data.results.bindings
        continue if not resultJson
        result_handler(resultJson, queryManager)
        table.push(resultJson)
      queryManager.setResultCount(table.length)
    catch e
      @make_json_dialog(table, null, {title: "table of results"})
      queryManager.fatalError(e)
    return

  display_graph_success_handler: (data, textStatus, jqXHR, queryManager) =>
    @disable_dataset_ontology_loader_AUTOMATICALLY()
    # TODO @update_browser_title()
    # TODO @update_caption()
    @generic_name_success_handler(data, textStatus, jqXHR, queryManager)
    @call_on_dataset_loaded()
    return

  generic_success_handler: (data, textStatus, jqXHR, queryManager) =>
    @generic_name_success_handler(data, textStatus, jqXHR, queryManager)
    return

  generic_name_success_handler: (data, textStatus, jqXHR, queryManager) =>
    try
      data = JSON.parse(data)
    catch error
      console.info("generic_success_handler tried and failed to treat data as json")
    # this should be based on response header or a queryManager
    console.log("response Content-Type:", jqXHR.getResponseHeader("content-type"))
    if data.head?
      resp_type = 'json'
    else if data.includes("\t")
      # TODO base presumption of .tsv on something more definitive than finding one
      resp_type = 'tsv'
    else
      console.warn(data)
      throw new Error("no idea what resp_type this data is")
    switch resp_type
      when 'json'
        success_handler = @json_name_success_handler
      when 'tsv'
        success_handler = @tsv_name_success_handler
      else
        throw new Error('no name_success_handler available')
    success_handler(data, textStatus, jqXHR, queryManager)
    return

  # ## Linked Data Fragments (LDF)
  #
  # Linked Data Fragments is a technique for performing efficient federated searches.
  #
  # http://linkeddatafragments.org/
  #
  # This implementation makes use of
  #
  #   https://github.com/smurp/comunica-ldf-client
  #
  # which is a fork of:
  #   https://github.com/comunica/jQuery-Widget.js
  #
  # with the only real difference being a dist version of ldf-client-worker.min.js

  domain2ldfServer:
    # values feed LDF client context.sources.value # see run_managed_query_ldf
    'dbpedia.org': "http://fragments.dbpedia.org/2016-04/en"
    'viaf.org': "http://data.linkeddatafragments.org/viaf"
    'getty.edu': "http://data.linkeddatafragments.org/lov"
    '*': "http://data.linkeddatafragments.org/lov"
    #'wikidata.org':
    #  source: "https://query.wikidata.org/bigdata/ldf"
    # TODO handle "wikidata.org"

  default_name_query_args:
    predicates: [RDFS_label, FOAF_name, SCHEMA_name]
    limit: 20 # set to `false` for no limit

  # ### make_name_query()
  #
  # Generate a name lookup query for `uri`.  If the optional `args` object
  # has an optional `predicates` list then those predicates are specifically
  # looked up.  The default predicates are provided by `default_name_query_args`.
  #
  # The default query looks like:
  # ```sparql
  # SELECT *
  # WHERE {
  #   {
  #     BIND (foaf:name as ?p) .
  #     <#{uri}> ?p ?o .
  #   } UNION {
  #     BIND (rdfs:label as ?p) .
  #     <#{uri}> ?p ?o .
  #   } UNION {
  #     BIND (schema:name as ?p) .
  #     <#{uri}> ?p ?o .
  #   }
  # }
  # LIMIT 20```
  make_name_query: (uri, in_args) ->
    args = @compose_object_from_defaults_and_incoming(@default_name_query_args, in_args)
    {predicates} = args
    lines = [
      "SELECT *",
      "WHERE {"]
    pred_num = 0
    for pred in predicates
      if pred_num
        lines.push('  UNION')
      pred_num++
      lines.push("  {")
      lines.push("    BIND (<#{pred}> as ?p) .")
      lines.push("    <#{uri}> ?p ?o .")
      lines.push("  }")
    lines.push("}")
    if args.limit
      lines.push("LIMIT #{args.limit}")
    return lines.join("\n")

  convert_N3_obj_to_GreenTurtle: (n3_obj_term) ->
    @greenturtleparser ?= new GreenerTurtle()
    bare_obj_term = n3_obj_term
    subj = 'http://example.com/subj'
    pred = 'http://example.com/pred'
    statement = "<#{subj}> <#{pred}> #{bare_obj_term} ."
    try
      graph = @greenturtleparser.parse(statement, "text/turtle")
      retval = graph.subjects[subj].predicates[pred].objects.slice(-1)[0]
    catch e
      console.log(n3_obj_term, n3_obj_term.split(''))
      console.error(e)
      retval =
        value: strip_surrounding_quotes(n3_obj_term)
        type: 'Literal' # TODO make this legit
    return retval

  convert_str_obj_to_GreenTurtle: (bare_term) =>
    if bare_term[0] is '<'
      return @convert_N3_obj_to_GreenTurtle(bare_term)
    if bare_term.slice(-1)[0] isnt '"'
      if bare_term.startsWith('"')
        if bare_term.includes('@')
          return @convert_N3_obj_to_GreenTurtle(bare_term)
        else
          # fall through to report error
      else
        return @convert_N3_obj_to_GreenTurtle('"'+bare_term+'"')
    msg = "bare_term: {#{bare_term}} not parseable by convert_str_term_to_GreenTurtle"
    throw new Error(msg)

  convert_N3_uri_to_string: (n3Uri) =>
    #console.warn("convert_N3_uri_to_string('#{n3Uri}')")
    return n3Uri

  convert_str_uri_to_string: (bareUri) =>
    if bareUri.startsWith('<')
      bareUri =  bareUri.substr(1,bareUri.length-2)
    #console.warn("convert_str_uri_to_string('#{bareUri}')")
    return bareUri

  convert_obj_obj_to_GreenTurtle: (jsObj) =>
    # TODO convert the .type to a legit uri
    if jsObj.type is 'uri'
      jsObj.type = RDF_object
    else if jsObj.type is 'literal'
      jsObj.type = RDF_literal
      if (lang = jsObj['xml:lang'])
        delete jsObj['xml:lang']
        jsObj.language = lang.toLowerCase() # REVIEW is lowercasing always right?
    return jsObj

  convert_obj_uri_to_string: (jsObj) =>
    # We are anticipating jsObj to have a .value
    if jsObj.value?
      return jsObj.value
    if typeof jsObj isnt 'object'
      return jsObj
    throw new Error('expecting jsObj to have .value or be a literal')

  name_result_handler: (result, queryManager) =>
    terms = queryManager.args.query_terms or queryManager.args.default_terms
    subj_term = result['?s'] or result['s'] or terms.s
    pred_term = result['?p'] or result['p'] or terms.p
    obj_term = result['?o'] or result['o'] or terms.o

    # identify the result_type
    if queryManager.args.from_N3
      result_type = 'n3'
    else if obj_term.value?
      # TODO this LOOKS like GreenTurtle.  Is it a standard?
      #    It differs in that the .type is ['url','literal'] rather than an uri
      result_type = 'obj'
    else
      result_type = 'str'

    # prepare parsers based on the result_type
    switch result_type
      when 'n3'
        parseObj = @convert_N3_obj_to_GreenTurtle
        parseUri = @convert_N3_uri_to_string
      when 'obj'
        parseObj = @convert_obj_obj_to_GreenTurtle
        parseUri = @convert_obj_uri_to_string
      when 'str' # TODO what should we call this?
        parseObj = @convert_str_obj_to_GreenTurtle
        parseUri = @convert_str_uri_to_string
      else
        console.error(result)
        throw new Error('can not determine result_type')
    try
      q =
        s: parseUri(subj_term)
        p: parseUri(pred_term)
        o: parseObj(obj_term)
        g: terms.g
      @add_quad(q)
    catch error
      #@make_json_dialog(result, null, {title: error.toString()})
      console.warn(result)
      console.error(error)
    return

  run_ldf_name_query: (args) ->
    {namelessUri} = args
    args.query = "# " +
      ( args.comment or "run_ldf_name_query(#{namelessUri})") + "\n" +
      @make_name_query(namelessUri)
    defaults =
      success_handler: @generic_name_success_handler
      result_handler: @name_result_handler
      from_N3: true
      default_terms:
        s: namelessUri
        p: RDFS_label
    args = @compose_object_from_defaults_and_incoming(defaults, args)
    @run_managed_query_ldf(args)

  run_managed_query_ldf: (args) ->
    queryManager = @run_managed_query_abstract(args)
    {success_handler, error_callback, timeout, result_handler, serverUrl, query} = args
    serverUrl ?= "http://fragments.dbpedia.org/2016-04/en" # TODO what?
    ldf_worker = new Worker('/comunica-ldf-client/ldf-client-worker.min.js')
    ldf_worker.postMessage
      type: 'query'
      query: query
      resultsToTree: false  # TODO experiment with this
      context:
        '@comunica/actor-http-memento:datetime': null
        queryFormat: 'sparql'
        sources: [
          type: 'auto'
          value: serverUrl
          ]

    ldf_worker.onmessage = (event) =>
      queryManager.cancelAnimation()
      d = event.data
      {type, result} = d
      switch type
        when 'result'
          queryManager.incrResultCount()
          result_handler.call(this, result, queryManager)
        when 'error'
          queryManager.fatalError(d)
        when 'end'
          queryManager.finishCounting()
        when 'queryInfo', 'log'
          #console.log(type, event)
        else
          console.log("UNHANDLED", event)

    return queryManager

  # ## Examples and Tests START

  make_wikidata_name_query: (uri, langs) ->
    uri ?= 'wd:Q160302'
    langs ?= "en" # comma delimited langs expected, eg "en,fr,de"
    if uri.startsWith('http')
      subj = "<#{uri}>"
    else
      subj = uri
    if uri.startsWith('wd:')
      prefixes = "PREFIX wd: <http://www.wikidata.org/entity/>"
    else
      prefixes = ""
    return """
    #{prefixes}
    SELECT ?subj ?pred ?subjLabel
    WHERE {
      BIND (#{subj} as ?subj)
      BIND (rdfs:label as ?pred)
      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "#{langs}" .
      }
    }""" # "

  test_json_fetch: (uri, success, err) ->
    uri ?= 'https://www.wikidata.org/entity/Q12345.json'
    success ?= (r) => console.log(r, r.json().then((json)=>console.log(JSON.stringify(json))))
    err ?= (e) => console.log('OOF:',e)
    fetch(uri).then(success).catch(err)
    return

  # ## QUAD Ingestion

  make_qname: (uri) ->
    # TODO(smurp) dear god! this method name is lying (it is not even trying)
    return uri

  last_quad: {}

  # ### `add_quad` is the standard entrypoint for all data sources
  #
  # It is fires the events:
  #   newsubject

  object_value_types: {}
  unique_pids: {}
  add_quad: (quad, sprql_subj) ->  #sprq_sbj only used in SPARQL quieries
    # FIXME Oh! How this method needs a fine toothed combing!!!!
    #   * are rdf:Class and owl:Class the same?
    #   * uniquer is misnamed, it should be called make_domsafe_id or sumut
    #   * vars like sid, pid, subj_lid should be revisited
    #   * review subj vs subj_n
    #   * do not conflate node ids across prefixes eg rdfs:Class vs owl:Class
    #   * Literal should not be a subclass of Thing. Thing and dataType are sibs
    # Terminology:
    #   A `lid` is a "local id" which is unique and a safe identifier for css selectors.
    #   This is in opposition to an `id` which is a synonym for uri (ideally).
    #   There is inconsistency in this usage, which should be cleared up.
    #   Proposed terms which SHOULD be used are:
    #     - *_curie             eg pred_curie='rdfs:label'
    #     - *_uri               eg subj_uri='http://sparql.cwrc.ca/ontology/cwrc#NaturalPerson'
    #     - *_lid: a "local id" eg subj_lid='atwoma'
    #console.log "HuViz.add_quad()", quad
    subj_uri = quad.s
    if not subj_uri?
      throw new Error("quad.s is undefined")
    pred_uri = quad.p
    if not pred_uri?
      throw new Error("quad.p is undefined")
    ctxid = quad.g || @DEFAULT_CONTEXT
    subj_lid = uniquer(subj_uri)  # FIXME rename uniquer to make_dom_safe_id
    @object_value_types[quad.o.type] = 1
    @unique_pids[pred_uri] = 1
    newsubj = false
    subj = null
    #if @p_display then @performance_dashboard('add_quad')

    # REVIEW is @my_graph still needed and being correctly used?
    if not @my_graph.subjects[subj_uri]?
      newsubj = true
      subj =
        id: subj_uri
        name: subj_lid
        predicates: {}
      @my_graph.subjects[subj_uri] = subj
    else
      subj = @my_graph.subjects[subj_uri]

    @ensure_predicate_lineage(pred_uri)
    edge = null
    subj_n = @get_or_create_node_by_id(subj_uri)
    pred_n = @get_or_create_predicate_by_id(pred_uri)
    cntx_n = @get_or_create_context_by_id(ctxid)
    if quad.p is RDF_subClassOf and @show_class_instance_edges
      @try_to_set_node_type(subj_n, 'Class')
    # TODO: use @predicates_to_ignore instead OR rdfs:first and rdfs:rest
    if pred_uri.match(/\#(first|rest)$/)
      console.warn("add_quad() ignoring quad because pred_uri=#{pred_uri}", quad)
      return
    # set the predicate on the subject
    if not subj.predicates[pred_uri]?
      subj.predicates[pred_uri] = {objects:[]}
    if quad.o.type is RDF_object
      # The object is not a literal, but another resource with an uri
      # so we must get (or create) a node to represent it
      obj_n = @get_or_create_node_by_id(quad.o.value)
      if quad.o.value is RDF_Class and @show_class_instance_edges
        # This weird operation is to ensure that the Class Class is a Class
        @try_to_set_node_type(obj_n, 'Class')
      if quad.p is RDF_subClassOf and @show_class_instance_edges
        @try_to_set_node_type(obj_n, 'Class')
      # We have a node for the object of the quad and this quad is relational
      # so there should be links made between this node and that node
      is_type = is_one_of(pred_uri, TYPE_SYNS)
      use_thumb = is_one_of(pred_uri, THUMB_PREDS) and @show_thumbs_dont_graph
      make_edge = @show_class_instance_edges or not is_type and not use_thumb
      if is_type
        @try_to_set_node_type(subj_n, quad.o.value)
      if use_thumb
        subj_n.__thumbnail = quad.o.value
        @develop(subj_n)
      if make_edge
        @develop(subj_n) # both subj_n and obj_n should hatch for edge to make sense
        # REVIEW uh, how are we ensuring that the obj_n is hatching? should it?
        edge = @get_or_create_Edge(subj_n, obj_n, pred_n, cntx_n)
        @infer_edge_end_types(edge)
        edge.register_context(cntx_n)
        edge.color = @gclui.predicate_picker.get_color_forId_byName(pred_n.lid,'showing')
        @add_edge(edge)
        @develop(obj_n)
    else # ie the quad.o is a literal
      if is_one_of(pred_uri, NAME_SYNS)
        @set_name(
          subj_n,
          quad.o.value.replace(/^\s+|\s+$/g, ''),
          quad.o.language)
        if subj_n.embryo
          @develop(subj_n) # might be ready now
      else # the object is a literal other than name
        if @make_nodes_for_literals
          objVal = quad.o.value
          simpleType = getTypeSignature(quad.o.type or '') or 'Literal'
          if not objVal?
            throw new Error("missing value for " + JSON.stringify([subj_uri, pred_uri, quad.o]))
          # Does the value have a language or does it contain spaces?
          #objValHasSpaces = (objVal.match(/\s/g)||[]).length > 0
          if quad.o.language and @group_literals_by_subj_and_pred
            # Perhaps an appropriate id for a literal "node" is
            # some sort of amalgam of the subject and predicate ids
            # for that object.
            # Why?  Consider the case of rdfs:comment.
            # If there are multiple literal object values on rdfs:comment
            # they are presumably different language versions of the same
            # text.  For them to end up on the same MultiString instance
            # they all have to be treated as names for a node with the same
            # id -- hence that id must be composed of the subj and pred ids.
            # Another perspective on this is that these are different comments
            # in different languages, so what suggests that they have anything
            # at all to do with one another?
            # Further, if (as is the case with these triples)
            #   Martineau_Harriet hasActivistInvolvementIn "_tariff reform_"
            #   Martineau_Harriet hasGenderedPoliticalActivity "_tariff reform_"
            # they SHOULD share the "_tariff reform_" node.
            #
            # So, after all this (poorly stated commentary) the uneasy conclusion
            # is that if a literal value has a language associated with it then
            # all the alternate language literals associated with that same
            # subject/predicate combination will be treated as the same literal
            # node.
            objKey = "#{subj_n.lid} #{pred_uri}"
            objId = synthIdFor(objKey)
            objId_explanation = "synthIdFor('#{objKey}') = #{objId}"
            #console.warn(objId_explanation)
          else
            objId = synthIdFor(objVal)
          literal_node = @get_or_create_node_by_id(objId, objVal, (isLiteral = true))
          @try_to_set_node_type(literal_node, simpleType)
          literal_node.__dataType = quad.o.type
          @develop(literal_node)
          @set_name(literal_node, quad.o.value, quad.o.language)
          edge = @get_or_create_Edge(subj_n, literal_node, pred_n, cntx_n)
          @infer_edge_end_types(edge)
          edge.register_context(cntx_n)
          edge.color = @gclui.predicate_picker.get_color_forId_byName(pred_n.lid,'showing')
          @add_edge(edge)
          literal_node.fully_loaded = true # for sparql quieries to flag literals as fully_loaded
    # if SPARQL Endpoint loaded AND this is subject node then set current subject to true (i.e. fully loaded)
    if @using_sparql()
      subj_n.fully_loaded = false # all nodes default to not being fully_loaded
      #if subj_n.id is sprql_subj# if it is the subject node then is fully_loaded
      #  subj_n.fully_loaded = true
      if subj_n.id is quad.subject # if it is the subject node then is fully_loaded
        subj_n.fully_loaded = true
    @last_quad = quad
    @pfm_count('add_quad')
    return edge

  remove_from_nameless: (node) ->
    if node.nameless?
      this.nameless_removals ?= 0
      this.nameless_removals++
      node_removed = @nameless_set.remove(node)
      if node_removed isnt node
        console.log("expecting",node_removed,"to have been",node)
      #if @nameless_set.binary_search(node) > -1
      #  console.log("expecting",node,"to no longer be found in",@nameless_set)
      delete node.nameless_since
    return
  add_to_nameless: (node) ->
    if node.isLiteral
      # Literals cannot have names looked up.
      return
    node.nameless_since = performance.now()
    @nameless_set.traffic ?= 0
    @nameless_set.traffic++
    @nameless_set.add(node)
    #@nameless_set.push(node) # REVIEW(smurp) why not .add()?????
    return

  set_name: (node, full_name, lang) ->
    # So if we set the full_name to null that is to mean that we have
    # no good idea what the name yet.
    perform_rename = () =>
      if full_name?
        if not node.isLiteral
          @remove_from_nameless(node)
      else
        if not node.isLiteral
          @add_to_nameless(node)
        full_name = node.lid or node.id
      if typeof full_name is 'object'
        # MultiString instances have constructor.name == 'String'
        # console.log(full_name.constructor.name, full_name)
        node.name = full_name
      else
        if node.name
          node.name.set_val_lang(full_name, lang)
        else
          node.name = new MultiString(full_name, lang)
    if node.state and node.state.id is 'shelved'
      # Alter calls the callback add_name in the midst of an operation
      # which is likely to move subj_n from its current position in
      # the shelved_set.  The shelved_set is the only one which is
      # sorted by name and as a consequence is the only one able to
      # be confused by the likely shift in alphabetic position of a
      # node.  For the sake of efficiency we "alter()" the position
      # of the node rather than do shelved_set.resort() after the
      # renaming.
      @shelved_set.alter(node, perform_rename)
      @tick("Tick in set_name")
    else
      perform_rename()
    #node.name ?= full_name  # set it if blank
    len = @truncate_labels_to
    if not len?
      alert "len not set"
    if len > 0
      node.pretty_name = node.name.substr(0, len) # truncate
    else
      node.pretty_name = node.name
    node.scroll_offset = 0
    return

  scroll_spacer: "   "

  scroll_pretty_name: (node) ->
    if @truncate_labels_to >= node.name.length
      limit = node.name.length
    else
      limit = @truncate_labels_to
    should_scroll = limit > 0 and limit < node.name.length
    if not should_scroll
      return
    if true # node.label_truncated_to
      spacer = @scroll_spacer
      if not node.scroll_offset
        node.scroll_offset = 1
      else
        node.scroll_offset += 1
        if node.scroll_offset > node.name.length + spacer.length #limit
          node.scroll_offset = 0
      wrapped = ""
      while wrapped.length < 3 * limit
        wrapped +=  node.name + spacer
      node.pretty_name = wrapped.substr(node.scroll_offset, limit)
    # if node.pretty_name.length > limit
    #   alert("TOO BIG")
    # if node.pretty_name.length < 1
    #   alert("TOO SMALL")
  unscroll_pretty_name: (node) ->
    @set_name(node, node.name)

  infer_edge_end_types: (edge) ->
    edge.source.type = 'Thing' unless edge.source.type?
    edge.target.type = 'Thing' unless edge.target.type?
    # infer type of source based on the range of the predicate
    ranges = @ontology.range[edge.predicate.lid]
    if ranges?
      @try_to_set_node_type(edge.target, ranges[0])
    # infer type of source based on the domain of the predicate
    domain_lid = @ontology.domain[edge.predicate.lid]
    if domain_lid?
      @try_to_set_node_type(edge.source, domain_lid)

  make_Edge_id: (subj_n, obj_n, pred_n) ->
    return (a.lid for a in [subj_n, pred_n, obj_n]).join(' ')

  get_or_create_Edge: (subj_n, obj_n, pred_n, cntx_n) ->
    edge_id = @make_Edge_id(subj_n, obj_n, pred_n)
    edge = @edges_by_id[edge_id]
    if not edge?
      @edge_count++
      edge = new Edge(subj_n, obj_n, pred_n)
      @edges_by_id[edge_id] = edge
    return edge

  add_edge: (edge) ->
    if edge.id.match(/Universal$/)
      console.log("add", edge.id)
    # TODO(smurp) should .links_from and .links_to be SortedSets? Yes. Right?
    @add_to(edge, edge.source.links_from)
    @add_to(edge, edge.target.links_to)
    edge

  delete_edge: (e) ->
    @remove_link(e.id)
    @remove_from(e, e.source.links_from)
    @remove_from(e, e.target.links_to)
    delete @edges_by_id[e.id]
    null

  try_to_set_node_type: (node, type_uri) ->
    type_lid = uniquer(type_uri) # should ensure uniqueness
    if not node._types
      node._types = []
    if not (type_lid in node._types)
      node._types.push(type_lid)
    prev_type = node.type
    node.type = type_lid
    if prev_type isnt type_lid
      @assign_types(node)

  report_every: 100 # if 1 then more data shown

  parseAndShowTTLData: (data, textStatus, callback) =>
    # modelled on parseAndShowNQStreamer
    #console.log("parseAndShowTTLData",data)
    parse_start_time = new Date()
    context = "http://universal.org"
    if GreenerTurtle? and @turtle_parser is 'GreenerTurtle'
      #console.log("GreenTurtle() started")
      #@G = new GreenerTurtle().parse(data, "text/turtle")
      try
        @G = new GreenerTurtle().parse(data, "text/turtle")
      catch e
        msg = escapeHtml(e.toString())
        blurt_msg = """<p>There has been a problem with the Turtle parser.  Check your dataset for errors.</p><p class="js_msg">#{msg}</p>"""
        @blurt(blurt_msg, "error")
        return false
    quad_count = 0
    every = @report_every
    for subj_uri,frame of @G.subjects
      #console.log "frame:",frame
      #console.log frame.predicates
      for pred_id,pred of frame.predicates
        for obj in pred.objects
          # this is the right place to convert the ids (URIs) to CURIES
          #   Or should it be QNames?
          #      http://www.w3.org/TR/curie/#s_intro
          if every is 1
            @show_state_msg("<LI>#{frame.id} <LI>#{pred.id} <LI>#{obj.value}")
            console.log("===========================\n  #", quad_count, "  subj:", frame.id, "\n  pred:", pred.id, "\n  obj.value:", obj.value)
          else
            if quad_count % every is 0
              @show_state_msg("parsed relation: " + quad_count)
          quad_count++
          @add_quad
            s: frame.id
            p: pred.id
            o: obj # keys: type,value[,language]
            g: context
    @dump_stats()
    @after_file_loaded('stream', callback)

  dump_stats: ->
    console.log("object_value_types:", @object_value_types)
    console.log("unique_pids:", @unique_pids)

  parseAndShowTurtle: (data, textStatus) =>
    msg = "data was " + data.length + " bytes"
    parse_start_time = new Date()

    if GreenerTurtle? and @turtle_parser is 'GreenerTurtle'
      @G = new GreenerTurtle().parse(data, "text/turtle")
      console.log("GreenTurtle")

    else if @turtle_parser is 'N3'
      console.log("N3")
      #N3 = require('N3')
      console.log("n3", N3)
      predicates = {}
      parser = N3.Parser()
      parser.parse data, (err,trip,pref) =>
        console.log(trip)
        if pref
          console.log(pref)
        if trip
          @add_quad(trip)
        else
          console.log(err)

      #console.log "my_graph",@my_graph
      console.log('===================================')
      for prop_name in ['predicates','subjects','objects']
        prop_obj = @my_graph[prop_name]
        console.log prop_name,(key for key,value of prop_obj).length,prop_obj
      console.log('===================================')
      #console.log "Predicates",(key for key,value of my_graph.predicates).length,my_graph.predicates
      #console.log "Subjects",my_graph.subjects.length,my_graph.subjects
      #console.log "Objects",my_graph.objects.length,my_graph.objects

    parse_end_time = new Date()
    parse_time = (parse_end_time - parse_start_time) / 1000
    siz = @roughSizeOfObject(@G)
    msg += " resulting in a graph of " + siz + " bytes"
    msg += " which took " + parse_time + " seconds to parse"
    console.log(msg) if @verbosity >= @COARSE
    show_start_time = new Date()
    @showGraph(@G)
    show_end_time = new Date()
    show_time = (show_end_time - show_start_time) / 1000
    msg += " and " + show_time + " sec to show"
    console.log(msg) if @verbosity >= @COARSE
    @text_cursor.set_cursor("default")
    $("#status").text ""

  choose_everything: =>
    cmd = new gcl.GraphCommand this,
      verbs: ['choose']
      classes: ['Thing']
    @gclc.run(cmd)
    @tick("Tick in choose_everything")

  remove_framing_quotes: (s) -> s.replace(/^\"/,"").replace(/\"$/,"")
  parseAndShowNQStreamer: (uri, callback) ->
    # turning a blob (data) into a stream
    #   http://stackoverflow.com/questions/4288759/asynchronous-for-cycle-in-javascript
    #   http://www.dustindiaz.com/async-method-queues/
    owl_type_map =
      uri:     RDF_object
      literal: RDF_literal
    worker = new Worker('/huviz/xhr_readlines_worker.js')
    quad_count = 0
    worker.addEventListener 'message', (e) =>
      msg = null
      if e.data.event is 'line'
        quad_count++
        @show_state_msg("<h3>Parsing... </h3><p>" + uri + "</p><progress value='" + quad_count + "' max='" + @node_count + "'></progress>")
        #if quad_count % 100 is 0
          #@show_state_msg("parsed relation " + quad_count)
        q = parseQuadLine(e.data.line)
        if q
          q.s = q.s.raw
          q.p = q.p.raw
          q.g = q.g.raw
          q.o =
            type:  owl_type_map[q.o.type]
            value: unescape_unicode(@remove_framing_quotes(q.o.toString()))
          @add_quad(q)
      else if e.data.event is 'start'
        msg = "starting to split " + uri
        @show_state_msg("<h3>Starting to split... </h3><p>" + uri + "</p>")
        @node_count = e.data.numLines
      else if e.data.event is 'finish'
        msg = "finished_splitting " + uri
        @show_state_msg("done loading")
        @after_file_loaded(uri, callback)
      else
        msg = "unrecognized NQ event:" + e.data.event
      if msg?
        @blurt(msg)
    worker.postMessage({uri:uri})

  parse_and_show_NQ_file: (data, callback) =>
    #TODO There is currently no error catcing on local nq files
    owl_type_map =
      uri:     RDF_object
      literal: RDF_literal
    quad_count = 0
    allLines = data.split(/\r\n|\n/)
    for line in allLines
      quad_count++
      q = parseQuadLine(line)
      if q
        q.s = q.s.raw
        q.p = q.p.raw
        q.g = q.g.raw
        q.o =
          type:  owl_type_map[q.o.type]
          value: unescape_unicode(@remove_framing_quotes(q.o.toString()))
        @add_quad(q)
    @local_file_data = ""
    @after_file_loaded('local file', callback)

  DUMPER: (data) =>
    console.log(data)

  fetchAndShow: (url, callback) ->
    @show_state_msg("fetching " + url)
    the_parser = @parseAndShowNQ #++++Why does the parser default to NQ?
    if url.match(/.ttl/)
      the_parser = @parseAndShowTTLData # does not stream
    else if url.match(/.(nq|nt)/)
      the_parser = @parseAndShowNQ
    #else if url.match(/.json/) #Currently JSON files not supported at read_data_and_show
      #console.log "Fetch and show JSON File"
      #the_parser = @parseAndShowJSON
    else #File not valid
      #abort with message
      #NOTE This only catches URLs that do not have a valid file name; nothing about actual file format
      msg = "Could not load #{url}. The data file format is not supported! " +
            "Only files with TTL and NQ extensions are accepted."
      @hide_state_msg()
      @blurt(msg, 'error')
      $('#'+@get_data_ontology_display_id()).remove()
      @reset_dataset_ontology_loader()
      #@init_resource_menus()
      return

    # Deal with the case that the file is cached inside the datasetDB as a result
    # of having been dragged and droppped from the local disk and added to the datasetDB.
    if url.startsWith('file:///') or url.indexOf('/') is -1 # ie it is a local file
      @get_resource_from_db  url, (err, rsrcRec) =>
        if rsrcRec?
          the_parser(rsrcRec.data)
          return # REVIEW ensure that proper try catch is happening
        @blurt(err or "'#{url} was not found in your DATASET menu.  Provide it and reload this page")
        @reset_dataset_ontology_loader()
        return
      return

    if the_parser is @parseAndShowNQ
      @parseAndShowNQStreamer(url, callback)
      return

    $.ajax
      url: url
      success: (data, textStatus) =>
        the_parser(data, textStatus, callback)
        #@fire_fileloaded_event(url) ## should call after_file_loaded(url, callback) within the_parser
        @hide_state_msg()
      error: (jqxhr, textStatus, errorThrown) =>
        console.log(url, errorThrown)
        if not errorThrown
          errorThrown = "Cross-Origin error"
        msg = errorThrown + " while fetching dataset " + url
        @hide_state_msg()
        $('#'+@get_data_ontology_display_id()).remove()
        @blurt(msg, 'error')  # trigger this by goofing up one of the URIs in cwrc_data.json
        @reset_dataset_ontology_loader()
        #TODO Reset titles on page

  log_query_with_timeout: (qry, timeout, fillColor, bgColor) ->
    queryManager = @log_query(qry)
    queryManager.anim = @animate_sparql_query(queryManager.preElem, timeout, fillColor, bgColor)
    return queryManager

  log_query: (qry) =>
    return @gclui.push_sparqlQuery_onto_log(qry)

  run_little_test_query: ->
    littleTestQuery = """SELECT * WHERE {?s ?o ?p} LIMIT 1"""

    $.ajax
      method: 'GET'
      url: url + '?query=' + encodeURIComponent(littleTestQuery)
      headers:
        'Accept': 'application/sparql-results+json'
      success: (data, textStatus, jqXHR) =>
        console.log "This a little repsponse test: " + textStatus
        console.log jqXHR
        console.log jqXHR.getAllResponseHeaders(data)
        console.log data
      error: (jqxhr, textStatus, errorThrown) =>
        console.log(url, errorThrown)
        console.log jqXHR.getAllResponseHeaders(data)

    # This is a quick test of the SPARQL Endpoint it should return
    #   https://www.w3.org/TR/2013/REC-sparql11-service-description-20130321/#example-turtle
    # $.ajax
    #   method: 'GET'
    #   url: url
    #   headers:
    #     'Accept': 'text/turtle'
    #   success: (data, textStatus, jqXHR) =>
    #     console.log "This Enpoint Test: " + textStatus
    #     console.log jqXHR
    #     console.log jqXHR.getAllResponseHeaders(data)
    #     console.log data
    #   error: (jqxhr, textStatus, errorThrown) =>
    #     console.log(url, errorThrown)
    #     console.log jqXHR.getAllResponseHeaders(data)

  run_managed_query_abstract: (args) ->
    # Reference: https://www.w3.org/TR/sparql11-protocol/
    args ?= {}
    args.success_handler ?= noop
    args.error_callback ?= noop
    args.timeout ?= @get_sparql_timeout_msec()

    queryManager = @log_query_with_timeout(args.query, args.timeout)
    queryManager.args = args
    return queryManager

  run_managed_query_ajax: (args) ->
    {query, serverUrl} = args
    queryManager = @run_managed_query_abstract(args)
    {success_handler, error_callback, timeout} = args
    # These POST settings work for: CWRC, WWI open, on DBpedia, and Open U.K.
    # but not on Bio Database
    more = "&timeout=" + timeout
    # TODO This should be decrufted
    ajax_settings = { #TODO Currently this only works on CWRC Endpoint
      'method': 'GET'
      'url': serverUrl + '?query=' + encodeURIComponent(query) + more
      'headers' :
        # This is only required for CWRC - not accepted by some Endpoints
        #'Content-Type': 'application/sparql-query'
        'Accept': 'application/sparql-results+json'
    }
    if serverUrl is "http://sparql.cwrc.ca/sparql" # Hack to make CWRC setup work properly
      ajax_settings.headers =
        'Content-Type' : 'application/sparql-query'
        'Accept': 'application/sparql-results+json'
    if serverUrl.includes('wikidata')
      # these don't solve CORS issues but could solve CORB issues
      ajax_settings.headers.Accept = "text/tab-separated-values"
      ajax_settings.headers.Accept = "text/csv"

    queryManager.xhr = $.ajax
      timeout: timeout
      method: ajax_settings.method
      url: ajax_settings.url
      headers: ajax_settings.headers
      success: (data, textStatus, jqXHR) =>
        queryManager.cancelAnimation()
        try
          success_handler(data, textStatus, jqXHR, queryManager)
        catch e
          queryManager.fatalError(e)
      error: (jqxhr, textStatus, errorThrown) =>
        if not errorThrown
          errorThrown = "Cross-Origin error"
        msg = errorThrown + " while fetching " + serverUrl
        $('#'+@get_data_ontology_display_id()).remove()
        queryManager.fatalError(msg)
        if error_callback?
          error_callback(jqxhr, textStatus, errorThrown, queryManager)

    return queryManager

  run_managed_query_worker: (qry, serverUrl, args) ->
    args.query = qry
    args.serverUrl = serverUrl
    queryManager = @run_managed_query_abstract(args)
    return queryManager

  sparql_graph_query_and_show__trigger: (url) =>
    selectId = @endpoint_loader.select_id
    @sparql_graph_query_and_show(url, selectId)
    #console.log @dataset_loader
    $("##{@dataset_loader.uniq_id}").children('select').prop('disabled', 'disabled')
    $("##{@ontology_loader.uniq_id}").children('select').prop('disabled', 'disabled')
    $("##{@script_loader.uniq_id}").children('select').prop('disabled', 'disabled')

  sparql_graph_query_and_show: (url, id, callback) =>
    qry = """
      # sparql_graph_query_and_show()
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      SELECT ?g ?label
      WHERE {
        GRAPH ?g { } .
        OPTIONAL {?g rdfs:label ?label}
      }
      ORDER BY ?g
    """
    #alert("sparql_graph_query_and_show() id: #{id}")
    # these are shared between success and error handlers
    spinner = $("#sparqlGraphSpinner-#{id}")
    spinner.css('display','block')
    graphSelector = "#sparqlGraphOptions-#{id}"
    $(graphSelector).parent().css('display', 'none')
    @sparqlQryInput_hide()
    # LOAD button should be disabled while the search for graphs is happening
    @disable_go_button()
    handle_graphsNotFound = () =>
      $(graphSelector).parent().css('display', 'none')
      @reset_endpoint_form(true)
      @enable_go_button()

    make_success_handler = () =>
      return (data, textStatus, jqXHR, queryManager) =>
        json_check = typeof data
        if json_check is 'string'
          json_data = JSON.parse(data)
        else
          json_data = data

        results = json_data.results.bindings
        queryManager.setResultCount(results.length)

        graphsNotFound = jQuery.isEmptyObject(results[0])
        if graphsNotFound
          handle_graphsNotFound()
          return
        graph_options = "<option id='#{@unique_id()}' value='#{url}'> All Graphs </option>"
        for graph in results
          if graph.label?
            label = " (#{graph.label.value})"
          else
            label = ''
          graph_options = graph_options + "<option id='#{@unique_id()}' value='#{graph.g.value}'>#{graph.g.value}#{label}</option>"
        $("#sparqlGraphOptions-#{id}").html(graph_options)
        $(graphSelector).parent().css('display', 'block')
        @reset_endpoint_form(true)
        @disable_go_button() # disable until a graph or term is picked

    make_error_callback = () =>
      return (jqXHR, textStatus, errorThrown) =>
        $(graphSelector).parent().css('display', 'none')
        spinner.css('visibility','hidden')
        #@reset_dataset_ontology_loader()
        handle_graphsNotFound()
        @reset_endpoint_form(true)

    args =
      success_handler: make_success_handler()
      error_callback: make_error_callback()
    args.query = qry
    args.serverUrl = url
    @sparql_graph_query_and_show_queryManager = @run_managed_query_ajax(args)

  sparqlQryInput_hide: ->
    @sparqlQryInput_JQElem.hide() #css('display', 'none')
  sparqlQryInput_show: ->
    @sparqlQryInput_JQElem.show()
    @sparqlQryInput_JQElem.css({'color': 'inherit'} )

  load_endpoint_data_and_show: (subject, callback) ->
    @sparql_node_list = []
    @pfm_count('sparql')
    #if @p_display then @performance_dashboard('sparql_request')
    node_limit = @endpoint_limit_JQElem.val()
    url = @endpoint_loader.value
    @endpoint_loader.outstanding_requests = 0
    fromGraph = ''
    if @endpoint_loader.endpoint_graph
      fromGraph=" FROM <#{@endpoint_loader.endpoint_graph}> "
    qry = """
    # load_endpoint_data_and_show('#{subject}')
    SELECT * #{fromGraph}
    WHERE {
      {<#{subject}> ?p ?o}
      UNION
      {{<#{subject}> ?p ?o} .
       {?o ?p2 ?o2}}
      UNION
      {{?s3 ?p3 <#{subject}>} .
       {?s3 ?p4 ?o4 }}
    }
    LIMIT #{node_limit}
    """

    make_success_handler = () =>
      return (data, textStatus, jqXHR, queryManager) =>
        json_check = typeof data
        if json_check is 'string'
          json_data = JSON.parse(data)
        else
          json_data = data
        queryManager.setResultCount(json_data.length)
        @add_nodes_from_SPARQL(json_data, subject, queryManager)
        endpoint = @endpoint_loader.value
        @dataset_loader.disable()
        @ontology_loader.disable()
        @replace_loader_display_for_endpoint(endpoint, @endpoint_loader.endpoint_graph)
        @disable_go_button()
        @big_go_button.hide()
        @after_file_loaded('sparql', callback)

    args =
      query: qry
      serverUrl: url
      success_handler: make_success_handler()
    @run_managed_query_ajax(args)


  add_nodes_from_SPARQL: (json_data, subject, queryManager) ->
    data = ''
    context = "http://universal.org"
    plainLiteral = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
    #console.log json_data
    console.log "Adding node (i.e. fully exploring): " + subject
    results = json_data.results.bindings
    if queryManager?
      queryManager.setResultCount(results.length)
    for node in results
      language = ''
      obj_type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
      if node.s
        subj = node.s.value
        pred = node.p.value
        obj_val = subject
      else if node.o2
        subj = node.o.value
        pred = node.p2.value
        obj_val = node.o2.value
        if node.o2.type is 'literal' or node.o.type is 'typed-literal'
          if node.o2.datatype
            obj_type = node.o2.datatype
          else
            obj_type = plainLiteral
          if node.o2["xml:lang"]
            language = node.o2['xml:lang']
        #console.log "-------- Sub-node -----" + subj + " " + pred  + " " + obj_val + " " + obj_type
      else if node.s3
        subj = node.s3.value
        pred = node.p4.value
        obj_val = node.o4.value
        if node.o4.type is 'literal' or node.o4.type is 'typed-literal'
          if node.o4.datatype
            obj_type = node.o4.datatype
          else
            obj_type = plainLiteral
          if node.o4["xml:lang"]
            language = node.o4['xml:lang']
      else
        subj = subject
        pred = node.p.value
        obj_val = node.o.value
        if node.o.type is 'literal' or node.o.type is 'typed-literal'
          if node.o.datatype
            obj_type = node.o.datatype
          else
            obj_type = plainLiteral
          if node.o["xml:lang"]
            language = node.o['xml:lang']
      q =
        g: context
        s: subj
        p: pred
        o:
          type: obj_type
          value: obj_val
      if language
        q.o.language = language

      #console.log q
      #IF this is a new quad, then add it. Otherwise no.
      node_list_empty = @sparql_node_list.length
      if node_list_empty is 0 # Add first node (because list is empty)
        @sparql_node_list.push q
        node_not_in_list = true
      else
        # Check if node is in list - sparql_node_list is used to keep track
        # of nodes that have already been loaded by a query so that they
        # will not be added again through add_quad.
        for snode in @sparql_node_list
          #TODO - This filtering statement doesn't seem tight (Will not catch nodes that HuViz creates - that's okay I think)
          if q.s is snode.s and q.p is snode.p and q.o.value is snode.o.value and q.o.type is snode.o.type and q.o.language is snode.o.language
            node_not_in_list = false
            #console.log "Found it in list so will not send to add_quad"
            if snode.s is subject or snode.o.value is subject#IF node is subject node IS already in list BUT fullly_loaded is false then set to true
              for a_node, i in @all_set
                if a_node.id is subject
                   @all_set[i].fully_loaded = true
                   #console.log "Found node for #{subject} so making it fully_loaded"
            #else if snode.o.value is subject
              #for a_node, i in @all_set
                #console.log "compare: " + a_node.id + "   subject: " + subject
                #if a_node.id is subject
                   #@all_set[i].fully_loaded = true
                   #console.log "Found object node for #{subject} which should be fully_loaded"
            break
          else
            node_not_in_list = true
      #If node is not in list then add
      if node_not_in_list
        @sparql_node_list.push q
        node_not_in_list = false
        @add_quad(q, subject)
      #@dump_stats()

  add_nodes_from_SPARQL_Worker: (queryTarget, callback) ->
    console.log("Make request for new query and load nodes")

    timeout = @get_sparql_timeout_msec()
    queryManagerArgs = {timeout}
    queryManager = null # so it can be seen across calls to the message listener

    @pfm_count('sparql')
    url = @endpoint_loader.value
    if @sparql_node_list then previous_nodes = @sparql_node_list else previous_nodes = []
    graph = @endpoint_loader.endpoint_graph
    local_node_added = 0
    query_limit = 1000 #@endpoint_limit_JQElem.val()
    worker = new Worker('/huviz/sparql_ajax_query.js')
    worker.addEventListener 'message', (e) =>
      #console.log e.data
      if e.data.method_name is 'log_query'
        queryManagerArgs.query = "#SPARQL_Worker\n"+e.data.qry
        queryManagerArgs.serverUrl = url
        queryManager = @run_managed_query_abstract(queryManagerArgs)
        #queryManager = @log_query_with_timeout(, timeout)
        return
      else if e.data.method_name isnt 'accept_results'
        error = new Error("expecting either data.method = 'log_query' or 'accept_results'")
        queryManager.fatalError(error)
        throw error
      add_fully_loaded = e.data.fully_loaded_index
      for quad in e.data.results
        #console.log quad
        @add_quad(quad)
        @sparql_node_list.push(quad)  # Add the new quads to the official list of added quads
        local_node_added++
      queryManager.setResultCount(local_node_added)
      queryManager.cancelAnimation()
      if local_node_added
        queryManager.setSuccessColor()
      else
        queryManager.setNoneColor()
      # Verify through the loaded nodes that they are all properly marked as fully_loaded
      for a_node, i in @all_set
        if a_node.id is queryTarget
          @all_set[i].fully_loaded = true
      @endpoint_loader.outstanding_requests = @endpoint_loader.outstanding_requests - 1
      #console.log "Resort the shelf"
      @shelved_set.resort()
      @tick("Tick in add_nodes_from_SPARQL_worker")
      @update_all_counts()
      if callback?
        callback()
    worker.postMessage(
      target: queryTarget
      url: url
      graph: graph
      limit: query_limit
      timeout: timeout
      previous_nodes: previous_nodes)

  using_sparql: ->
    # force the return of a boolan with "not not"
    return not not (@endpoint_loader? and @endpoint_loader.value) # This is part of a sparql set

  get_neighbors_via_sparql: (chosen, callback) ->
    if not chosen.fully_loaded
      # If there are more than certain number of requests, stop the process
      maxReq = @max_outstanding_sparql_requests
      if (@endpoint_loader.outstanding_requests < maxReq)
        @endpoint_loader.outstanding_requests++
        @add_nodes_from_SPARQL_Worker(chosen.id, callback)
        console.log("outstanding_requests: " + @endpoint_loader.outstanding_requests)
      else
        msg = "SPARQL requests capped at #{maxReq}"
        #@blurt(msg, 'alert')
        console.info(msg)
        # if $("#blurtbox").html()
        #   #console.log "Don't add error message " + message
        #   console.log "Request counter (over): " + @endpoint_loader.outstanding_requests
        # else
        #   #console.log "Error message " + message
        #   msg = "There are more than 300 requests in the que. Restricting process. " + message
        #   @blurt(msg, 'alert')
        #   message = true
        #   console.log "Request counter: " + @endpoint_loader.outstanding_requests
    return

  # Deal with buggy situations where flashing the links on and off
  # fixes data structures.  Not currently needed.
  show_and_hide_links_from_node: (d) ->
    @show_links_from_node d
    @hide_links_from_node d

  get_container_width: (pad) ->
    pad = pad or hpad
    w_width = (@container.clientWidth or window.innerWidth or document.documentElement.clientWidth or document.clientWidth) - pad
    tabs_width = 0
    if @tabsJQElem and @tabsJQElem.length > 0
      tabs_width = @tabsJQElem.width()
    @width = w_width - tabs_width

  # Should be refactored to be get_container_height
  get_container_height: (pad) ->
    pad = pad or hpad
    @height = (@container.clientHeight or window.innerHeight or document.documentElement.clientHeight or document.clientHeight) - pad
    if @args.stay_square
      @height = @width
    return @height

  update_graph_radius: ->
    @graph_region_radius = Math.floor(Math.min(@width / 2, @height / 2))
    @graph_radius = @graph_region_radius * @shelf_radius

  update_graph_center: ->
    @cy = @height / 2
    if @off_center
      @cx = @width - @graph_region_radius
    else
      @cx = @width / 2
    @my = @cy * 2
    @mx = @cx * 2

  update_lariat_zone: ->
    @lariat_center = [@cx, @cy]

  update_discard_zone: ->
    @discard_ratio = .1
    @discard_radius = @graph_radius * @discard_ratio
    @discard_center = [
      @width - @discard_radius * 3
      @height - @discard_radius * 3
    ]

  set_search_regex: (text) ->
    @search_regex = new RegExp(text or "^$", "ig")

  update_searchterm: =>
    text = $(this).text()
    @set_search_regex text
    @restart()

  dump_locations: (srch, verbose, func) ->
    verbose = verbose or false
    pattern = new RegExp(srch, "ig")
    nodes.forEach (node, i) =>
      unless node.name.match(pattern)
        console.log(pattern, "does not match!", node.name) if verbose
        return
      console.log(func.call(node))  if func
      @dump_details(node) if not func or verbose

  get_node_by_id: (node_id, throw_on_fail) ->
    throw_on_fail = throw_on_fail or false
    obj = @nodes.get_by('id',node_id)
    if not obj? and throw_on_fail
      throw new Error("node with id <" + node_id + "> not found")
    obj

  update_showing_links: (n) ->
    # TODO understand why this is like {Taxon,Predicate}.update_state
    #   Is this even needed anymore?
    old_status = n.showing_links
    if n.links_shown.length is 0
      n.showing_links = "none"
    else
      if n.links_from.length + n.links_to.length > n.links_shown.length
        n.showing_links = "some"
      else
        n.showing_links = "all"
    if old_status is n.showing_links
      return null # no change, so null
    # We return true to mean that edges where shown, so
    return old_status is "none" or n.showing_links is "all"

  should_show_link: (edge) ->
    # Edges should not be shown if either source or target are discarded or embryonic.
    ss = edge.source.state
    ts = edge.target.state
    d = @discarded_set
    e = @embryonic_set
    not (ss is d or ts is d or ss is e or ts is e)

  add_link: (e) ->
    @add_to e, e.source.links_from
    @add_to e, e.target.links_to
    if @should_show_link(e)
      @show_link(e)
    @update_showing_links e.source
    @update_showing_links e.target
    @update_state e.target

  remove_link: (edge_id) ->
    e = @links_set.get_by('id', edge_id)
    if not e?
      console.log("remove_link(#{edge_id}) not found!")
      return
    @remove_from(e, e.source.links_shown)
    @remove_from(e, e.target.links_shown)
    @links_set.remove(e)
    console.log("removing links from: " + e.id)
    @update_showing_links(e.source)
    @update_showing_links(e.target)
    @update_state(e.target)
    @update_state(e.source)

  # FIXME it looks like incl_discards is not needed and could be removed
  show_link: (edge, incl_discards) ->
    if (not incl_discards) and (edge.target.state is @discarded_set or edge.source.state is @discarded_set)
      return
    @add_to(edge, edge.source.links_shown)
    @add_to(edge, edge.target.links_shown)
    @links_set.add(edge)
    edge.show()
    @update_state(edge.source)
    @update_state(edge.target)
    #@gclui.add_shown(edge.predicate.lid,edge)

  unshow_link: (edge) ->
    @remove_from(edge,edge.source.links_shown)
    @remove_from(edge,edge.target.links_shown)
    @links_set.remove(edge)
    #console.log("unshowing links from: " + edge.id)
    edge.unshow() # FIXME make unshow call @update_state WHICH ONE? :)
    @update_state(edge.source)
    @update_state(edge.target)
    #@gclui.remove_shown(edge.predicate.lid,edge)

  show_links_to_node: (n, incl_discards) ->
    incl_discards = incl_discards or false
    #if not n.links_to_found
    #  @find_links_to_node n,incl_discards
    n.links_to.forEach (e, i) =>
      @show_link(e, incl_discards)
    @update_showing_links(n)
    @update_state(n)
    @force.links(@links_set)
    if not @args.skip_log_tick
      console.log "Tick in @force.links(@links_set) show_links_to_node"
    @restart()

  update_state: (node) ->
    if node.state is @graphed_set and node.links_shown.length is 0
      @shelved_set.acquire(node)
      @unpin(node)
      #console.debug("update_state() had to @shelved_set.acquire(#{node.name})",node)
    if node.state isnt @graphed_set and node.links_shown.length > 0
      #console.debug("update_state() had to @graphed_set.acquire(#{node.name})",node)
      @graphed_set.acquire(node)

  hide_links_to_node: (n) ->
    n.links_to.forEach (e, i) =>
      @remove_from e, n.links_shown
      @remove_from e, e.source.links_shown
      e.unshow()
      @links_set.remove e
      @remove_ghosts e
      @update_state e.source
      @update_showing_links e.source
      @update_showing_links e.target
    @update_state n
    @force.links(@links_set)
    if not @args.skip_log_tick
      console.log "Tick in @force.links() hide_links_to_node"
    @restart()

  show_links_from_node: (n, incl_discards) ->
    incl_discards = incl_discards or false
    #if not n.links_from_found
    #  @find_links_from_node n
    n.links_from.forEach (e, i) =>
      @show_link(e, incl_discards)
    @update_state(n)
    @force.links(@links_set)
    if not @args.skip_log_tick
      console.log("Tick in @force.links() show_links_from_node")
    @restart()

  hide_links_from_node: (n) ->
    n.links_from.forEach (e, i) =>
      @remove_from e, n.links_shown
      @remove_from e, e.target.links_shown
      e.unshow()
      @links_set.remove e
      @remove_ghosts e
      @update_state e.target
      @update_showing_links e.source
      @update_showing_links e.target

    @force.links(@links_set)
    if not @args.skip_log_tick
      console.log("Tick in @force.links hide_links_from_node")
    @restart()

  attach_predicate_to_its_parent: (a_pred) ->
    parent_id = @ontology.subPropertyOf[a_pred.lid] or 'anything'
    if parent_id?
      parent_pred = @get_or_create_predicate_by_id(parent_id)
      a_pred.register_superclass(parent_pred)
    return

  get_or_create_predicate_by_id: (sid) ->
    obj_id = @make_qname(sid)
    obj_n = @predicate_set.get_by('id',obj_id)
    if not obj_n?
      obj_n = new Predicate(obj_id)
      @predicate_set.add(obj_n)
      @attach_predicate_to_its_parent(obj_n)
    obj_n

  clean_up_dirty_predicates: =>
    pred = @predicate_set.get_by('id', 'anything')
    if pred?
      pred.clean_up_dirt()

  clean_up_dirty_taxons: ->
    if @taxonomy.Thing?
      @taxonomy.Thing.clean_up_dirt()

  clean_up_all_dirt_once: ->
    @clean_up_all_dirt_onceRunner ?= new OnceRunner(0, 'clean_up_all_dirt_once')
    @clean_up_all_dirt_onceRunner.setTimeout(@clean_up_all_dirt, 300)

  clean_up_all_dirt: =>
    #console.warn("clean_up_all_dirt()")
    @clean_up_dirty_taxons()
    @clean_up_dirty_predicates()
    #@regenerate_english()
    #setTimeout(@clean_up_dirty_predictes, 500)
    #setTimeout(@clean_up_dirty_predictes, 3000)
    return

  prove_OnceRunner: (timeout) ->
    @prove_OnceRunner_inst ?= new OnceRunner(30)
    yahoo = () -> alert('yahoo!')
    @prove_OnceRunner_inst.setTimeout(yahoo, timeout)

  get_or_create_context_by_id: (sid) ->
    obj_id = @make_qname(sid)
    obj_n = @context_set.get_by('id',obj_id)
    if not obj_n?
      obj_n = {id:obj_id}
      @context_set.add(obj_n)
    obj_n

  get_or_create_node_by_id: (uri, name, isLiteral) ->
    # FIXME OMG must standardize on .lid as the short local id, ie internal id
    #node_id = @make_qname(uri) # REVIEW: what about uri: ":" ie the current graph
    node_id = uri
    node = @nodes.get_by('id', node_id)
    if not node?
      node = @embryonic_set.get_by('id',node_id)
    if not node?
      # at this point the node is embryonic, all we know is its uri!
      node = new Node(node_id, @use_lid_as_node_name)
      if isLiteral?
        node.isLiteral = isLiteral
      if not node.id?
        alert("new Node('#{uri}') has no id")
      #@nodes.add(node)
      @embryonic_set.add(node)
    node.type ?= "Thing"
    node.lid ?= uniquer(node.id)
    if not node.name?
      # FIXME dereferencing of @ontology.label should be by curie, not lid
      # if name is empty string, that is acceptable
      # if no name is provided, we use the label from the ontology if available
      if not name?
        # Leave defaulting to the use of node.lid to @set_name() itself.
        # If we do that here then nothing is recognized as being nameless.
        name = @ontology.label[node.lid] or null
      @set_name(node, name)
    return node

  develop: (node) ->
    # If the node is embryonic and is ready to hatch, then hatch it.
    # In other words if the node is now complete enough to do interesting
    # things with, then let it join the company of other complete nodes.
    if node.embryo? and @is_ready(node)
      @hatch(node)
      return true
    return false

  hatch: (node) ->
    # Take a node from being 'embryonic' to being a fully graphable node
    #console.log node.id+" "+node.name+" is being hatched!"
    node.lid = uniquer(node.id) # FIXME ensure uniqueness
    @embryonic_set.remove(node)
    new_set = @get_default_set_by_type(node)
    if new_set?
      new_set.acquire(node)
    @assign_types(node,"hatch")
    start_point = [@cx, @cy]
    node.point(start_point)
    node.prev_point([start_point[0]*1.01,start_point[1]*1.01])
    @add_node_ghosts(node)
    @update_showing_links(node)
    @nodes.add(node)
    @recolor_node(node)
    @tick("Tick in hatch")
    @pfm_count('hatch')
    node

  get_or_create_transient_node: (subjNode, point) ->
    transient_id = '_:_transient'
    nom = "↪"
    nom = " "
    transient_node = @get_or_create_node_by_id(transient_id, (name = nom), (isLiteral = false))
    @move_node_to_point(transient_node, {x: subjNode.x, y: subjNode.y})
    transient_node.radius = 0
    transient_node.charge = 20
    return transient_node

  # TODO: remove this method
  make_nodes: (g, limit) ->
    limit = limit or 0
    count = 0
    for subj_uri,subj of g.subjects #my_graph.subjects
      #console.log subj, g.subjects[subj]  if @verbosity >= @DEBUG
      #console.log subj_uri
      #continue  unless subj.match(ids_to_show)
      subject = subj #g.subjects[subj]
      @get_or_make_node subject, [
        @width / 2
        @height / 2
      ], false
      count++
      break  if limit and count >= limit

  make_links: (g, limit) ->
    limit = limit or 0
    @nodes.some (node, i) =>
      subj = node.s
      @show_links_from_node @nodes[i]
      true  if (limit > 0) and (@links_set.length >= limit)
    @restart()

  hide_node_links: (node) ->
    node.links_shown.forEach (e, i) =>
      @links_set.remove(e)
      if e.target is node
        @remove_from(e, e.source.links_shown)
        @update_state(e.source)
        e.unshow()
        @update_showing_links(e.source)
      else
        @remove_from(e, e.target.links_shown)
        @update_state(e.target)
        e.unshow()
        @update_showing_links(e.target)
      @remove_ghosts(e)

    node.links_shown = []
    @update_state(node)
    @update_showing_links(node)

  hide_found_links: ->
    @nodes.forEach (node, i) =>
      if node.name.match(search_regex)
        @hide_node_links(node)
    @restart()

  discard_found_nodes: ->
    @nodes.forEach (node, i) =>
      @discard node  if node.name.match(search_regex)
    @restart()

  show_node_links: (node) ->
    @show_links_from_node(node)
    @show_links_to_node(node)
    @update_showing_links(node)

  toggle_display_tech: (ctrl, tech) ->
    val = undefined
    tech = ctrl.parentNode.id
    if tech is "use_canvas"
      @use_canvas = not @use_canvas
      @clear_canvas()  unless @use_canvas
      val = @use_canvas
    if tech is "use_svg"
      @use_svg = not @use_svg
      val = @use_svg
    if tech is "use_webgl"
      @use_webgl = not @use_webgl
      val = @use_webgl
    ctrl.checked = val
    @tick("Tick in toggle_display_tech")
    true

  label: (branded) ->
    @labelled_set.add(branded)
    return

  unlabel: (anonymized) ->
    @labelled_set.remove(anonymized)
    return

  get_point_from_polar_coords: (polar) ->
    {range, degrees} = polar
    radians = 2 * Math.PI * (degrees - 90) / 360
    return [@cx + range * Math.cos(radians) * @graph_region_radius,
            @cy + range * Math.sin(radians) * @graph_region_radius]

  pin: (node, cmd) ->
    if node.state is @graphed_set
      if cmd? and cmd.polar_coords
        pin_point = @get_point_from_polar_coords(cmd.polar_coords)
        node.prev_point(pin_point)
      @pinned_set.add(node)
      return true
    return false

  unpin: (node) ->
    # delete node.pinned_only_while_chosen # do it here in case of direct unpinning
    if node.fixed
      @pinned_set.remove(node)
      return true
    return false

  pin_at_center: (node) ->
    cmd =
      polar_coords:
        range: 0
        degrees: 0
    @pin(node, cmd)

  unlink: (unlinkee) ->
    # FIXME discover whether unlink is still needed
    @hide_links_from_node(unlinkee)
    @hide_links_to_node(unlinkee)
    @shelved_set.acquire(unlinkee)
    @update_showing_links(unlinkee)
    @update_state(unlinkee)

  #
  #  The DISCARDED are those nodes which the user has
  #  explicitly asked to not have drawn into the graph.
  #  The user expresses this by dropping them in the
  #  discard_dropzone.
  #
  discard: (goner) ->
    @unpin(goner)
    @unlink(goner)
    @discarded_set.acquire(goner)
    shown = @update_showing_links(goner)
    @unselect(goner)
    #@update_state(goner)
    goner

  undiscard: (prodigal) ->  # TODO(smurp) rename command to 'retrieve' ????
    if @discarded_set.has(prodigal) # see test 'retrieving should only affect nodes which are discarded'
      @shelved_set.acquire(prodigal)
      @update_showing_links(prodigal)
      @update_state(prodigal)
    prodigal

  #
  #  The CHOSEN are those nodes which the user has
  #  explicitly asked to have the links shown for.
  #  This is different from those nodes which find themselves
  #  linked into the graph because another node has been chosen.
  #
  shelve: (goner) =>
    @unpin(goner)
    @chosen_set.remove(goner)
    @hide_node_links(goner)
    @shelved_set.acquire(goner)
    shownness = @update_showing_links(goner)
    if goner.links_shown.length > 0
      console.log("shelving failed for", goner)
    goner

  choose: (chosen, callback_after_choosing) =>
    # If this chosen node is part of a SPARQL query set and not fully loaded then
    # fully load it and try this method again, via callback.
    if @using_sparql() and not chosen.fully_loaded
      callback_after_getting_neighbors = () => @choose(chosen, callback_after_choosing)
      @get_neighbors_via_sparql(chosen, callback_after_getting_neighbors)
      return

    # There is a flag .chosen in addition to the state 'linked'
    # because linked means it is in the graph
    @chosen_set.add(chosen)     # adding the flag .chosen does not affect the .state
    @nowChosen_set.add(chosen)  # adding the flag .nowChosen does not affect the .state
    # do it early so add_link shows them otherwise choosing from discards just puts them on the shelf
    @graphed_set.acquire(chosen) # .acquire means DO change the .state to graphed vs shelved etc

    @show_links_from_node(chosen)
    @show_links_to_node(chosen)
    @update_state(chosen)
    shownness = @update_showing_links(chosen)
    if callback_after_choosing?
      callback_after_choosing()
    chosen

  unchoose: (unchosen) =>
    # To unchoose a node is to remove the chosen flag and unshow the edges
    # to any nodes which are not themselves chosen.  If that means that
    # this 'unchosen' node is now no longer graphed, so be it.
    #
    #   remove the node from the chosen set
    #     loop thru all links_shown
    #       if neither end of the link is chosen then
    #         unshow the link
    # @unpin unchosen # TODO figure out why this does not cleanse pin
    @chosen_set.remove(unchosen)
    for link in unchosen.links_shown by -1
      if link?
        if not (link.target.chosen? or link.source.chosen?)
          @unshow_link(link)
      else
        console.log("there is a null in the .links_shown of", unchosen)
    @update_state(unchosen)

  wander__atFirst: =>
    # Purpose:
    #   At first, before the verb Wander is executed on any node, we must
    # build a SortedSet of the nodes which were wasChosen to compare
    # with the SortedSet of nodes which are intendedToBeGraphed as a
    # result of the Wander command which is being executed. This method
    # is called once, BEFORE iterating through the nodes being wander-ed.
    if not @wasChosen_set.clear()
      throw new Error("expecting wasChosen to be empty")
    for node in @chosen_set
      @wasChosen_set.add(node)

  wander__atLast: =>
    # Purpose:
    #   At last, after all appropriate nodes have been pulled into the graph
    # by the Wander verb, it is time to remove wasChosen nodes which
    # are not nowChosen.  In other words, ungraph those nodes which
    # are no longer held in the graph by any recently wandered-to nodes.
    # This method is called once, AFTER wander has been called on each node.
    wasRollCall = @wasChosen_set.roll_call()
    nowRollCall = @nowChosen_set.roll_call()
    removed = @wasChosen_set.filter (node) =>
      not @nowChosen_set.includes(node)
    for node in removed
      @unchoose(node)
      @wasChosen_set.remove(node)
    if not @nowChosen_set.clear()
      throw new Error("the nowChosen_set should be empty after clear()")

  wander: (chosen) =>
    # Wander is just the same as Choose (AKA Activate) except afterward it deactivates the
    # nodes which were in the chosen_set before but are not in the set being wandered.
    # This is accomplished by wander__build_callback()
    # See @wander__atFirst and @wander__atLast which are run before and after this one.
    return @choose(chosen)

  unwalk: (node) ->
    @walked_set.remove(node)
    delete node.walkedIdx0
    return

  walkBackTo: (existingStep) ->
    # note that if existingStep is null (ie a non-node) we will walk back all
    removed = []
    for pathNode in @walked_set by -1
      if pathNode is existingStep
        break
      # remove these intervening nodes
      @unchoose(pathNode)
      @shave(pathNode)
      @unwalk(pathNode)
      removed.push(pathNode)
    return removed

  walkBackAll: ->
    return @walkBackTo(null)

  walk: (nextStep) =>
    tooHairy = null
    if nextStep.walked
      # 1) if this node already in @walked_set then remove inwtervening nodes
      # ie it is already in the path so walk back to it
      @walkBackTo(nextStep) # stop displaying those old links
      @choose(nextStep)
      return

    if @walked_set.length # is there already a walk path in progress?
      lastWalked = @walked_set.slice(-1)[0] # find the last node
      if @nodesAreAdjacent(nextStep, lastWalked) # is nextStep linked to lastWalked?
        # 2) handle the case of this being the next in a long chain of adjacent nodes
        tooHairy = lastWalked  # Shave this guy later. If we do it now, nextStep gets ungraphed!
      else
        # 3) start a new path because nextStep is not connected with the @walked_set
        @walkBackAll() # clean up the old path completely

    do_after_chosen = () =>
      if tooHairy # as promised we now deal with the previous terminal node
        @shave(tooHairy) # ungraph the non-path nodes which were held in the graph by tooHairy

    # this should happen to every node added to @walked_set
    nextStep.walkedIdx0 = @walked_set.length # tell it what position it will have in the path
    if not nextStep.walked # It might already be in the path, if not...
      @walked_set.add(nextStep) # add it
    @choose(nextStep, do_after_chosen) # finally, choose nextStep to make it hairy

    return # so the javascript is not cluttered with confusing nonsense

  nodesAreAdjacent: (n1, n2) ->
    # figure out which node is least connected so we do the least work checking links
    if (n1.links_from.length + n1.links_to.length) > (n2.links_from.length + n2.links_to.length)
      [lonelyNode, busyNode] = [n2, n1]
    else
      [lonelyNode, busyNode] = [n1, n2]
    # iterate through the outgoing links of the lonlier node, breaking on adjacency
    for link in lonelyNode.links_from
      if link.target is busyNode
        return true
    # iterate through the incoming links of the lonlier node, breaking on adjacency
    for link in lonelyNode.links_to
      if link.source is busyNode
        return true
    return false

  shave: (tooHairy) ->
    for link in tooHairy.links_shown by -1
      if link?
        if (not link.target.walked?) or (not link.source.walked?)
          @unshow_link(link)
        if not @edgeIsOnWalkedPath(link)
          @unshow_link(link)
      else
        console.log("there is a null in the .links_shown of", unchosen)
    @update_state(tooHairy) # update the pickers concerning these changes REVIEW needed?

  edgeIsOnWalkedPath: (edge) ->
    return @nodesAreAdjacentOnWalkedPath(edge.target, edge.source)

  nodesAreAdjacentOnWalkedPath: (n1, n2) ->
    n1idx0 = n1.walkedIdx0
    n2idx0 = n2.walkedIdx0
    if n1idx0? and n2idx0?
      larger = Math.max(n1idx0, n2idx0)
      smaller = Math.min(n1idx0, n2idx0)
      if larger - smaller is 1
        return true
    return false

  distinguish: (node) ->
    emeritus = @distinguished_node
    if @emeritus?
      delete emeritus._is_distinguished
    if node?
      node._is_distinguished = true
    @distinguished_node = node
    return emeritus

  hide: (goner) =>
    @unpin(goner)
    @chosen_set.remove(goner)
    @hidden_set.acquire(goner)
    @selected_set.remove(goner)
    goner.unselect()
    @hide_node_links(goner)
    @update_state(goner)
    shownness = @update_showing_links(goner)

  # The verbs SELECT and UNSELECT perhaps don't need to be exposed on the UI
  # but they perform the function of manipulating the @selected_set
  select: (node) =>
    if not node.selected?
      @selected_set.add(node)
      if node.select?
        node.select()
        @recolor_node(node)
      else
        msg = "#{node.__proto__.constructor.name} #{node.id} lacks .select()"
        throw msg
        console.error msg,node

  unselect: (node) =>
    if node.selected?
      @selected_set.remove(node)
      node.unselect()
      @recolor_node(node)
    return

  # These are the EDITING VERBS: connect, spawn, specialize and annotate
  connect: (node) ->
    if node isnt @focused_node
      console.info("connect('#{node.lid}') SKIPPING because it is not the focused node")
      return
    @editui.set_state('seeking_object')
    @editui.set_subject_node(node)
    @transient_node = @get_or_create_transient_node(node)
    @editui.set_object_node(@transient_node)
    @dragging = @transient_node
    console.log(@transient_node.state.id)
    #alert("connect('#{node.lid}')")

  set_unique_color: (uniqcolor, set, node) ->
    set.uniqcolor ?= {}
    old_node = set.uniqcolor[uniqcolor]
    if old_node
      old_node.color = old_node.uniqucolor_orig
      delete old_node.uniqcolor_orig
    set.uniqcolor[uniqcolor] = node
    node.uniqcolor_orig = node.color
    node.color = uniqcolor
    return

  animate_hunt: (array, sought_node, mid_node, prior_node, pos) =>
    #sought_node.color = 'red'
    pred_uri = 'hunt:trail'
    if mid_node
      mid_node.color = 'black'
      mid_node.radius = 100
      @label(mid_node)
    if prior_node
      @ensure_predicate_lineage(pred_uri)
      trail_pred = @get_or_create_predicate_by_id(pred_uri)
      edge = @get_or_create_Edge(mid_node, prior_node, trail_pred, 'http://universal.org')
      edge.label = JSON.stringify(pos)
      @infer_edge_end_types(edge)
      edge.color = @gclui.predicate_picker.get_color_forId_byName(trail_pred.lid, 'showing')
      @add_edge(edge)
      #@show_link(edge)
    if pos.done
      cmdArgs =
        verbs: ['show']
        regarding: [pred_uri]
        sets: [@shelved_set.id]
      cmd = new gcl.GraphCommand(this, cmdArgs)
      @run_command(cmd)
      @clean_up_all_dirt_once()

  hunt: (node) =>
    # Hunt is just a test verb to animate SortedSet.binary_search() for debugging
    @animate_hunt(@shelved_set, node, null, null, {})
    @shelved_set.binary_search(node, false, @animate_hunt)

  recolor_node: (n, default_color) ->
    default_color ?= 'black'
    n._types ?= []
    if @color_nodes_as_pies and n._types.length > 1
      n._colors = []
      for taxon_id in n._types
        if typeof(taxon_id) is 'string'
          color = @get_color_for_node_type(n, taxon_id) or default_color
          n._colors.push(color)
       #n._colors = ['red','orange','yellow','green','blue','purple']
    else
      n.color = @get_color_for_node_type(n, n.type)

  get_color_for_node_type: (node, type) ->
    state = node.selected? and "emphasizing" or "showing"
    return @gclui.taxon_picker.get_color_forId_byName(type, state)

  recolor_nodes: () ->
    # The nodes needing recoloring are all but the embryonic.
    if @nodes
      for node in @nodes
        @recolor_node(node)

  toggle_selected: (node) ->
    if node.selected?
      @unselect(node)
    else
      @select(node)
    @update_all_counts()
    @regenerate_english()
    @tick("Tick in toggle_selected")

  # ======== SNIPPET (INFO BOX) UI ==========================================
  get_snippet_url: (snippet_id) ->
    if snippet_id.match(/http\:/)
      return snippet_id
    else
      return "#{window.location.origin}#{@get_snippetServer_path(snippet_id)}"

  get_snippetServer_path: (snippet_id) ->
    # this relates to index.coffee and the urls for the
    if @data_uri?.match('poetesses')
      console.info @data_uri,@data_uri.match('poetesses')
      which = "poetesses"
    else
      which = "orlando"
    return "/snippet/#{which}/#{snippet_id}/"

  make_edge_inspector_id: (edge) ->
    id = edge.id.replace(new RegExp(' ','g'), '_')
    #console.log("make_edge_inspector_id()", edge, '==>', id)
    return id

  get_snippet_js_key: (snippet_id) ->
    # This is in case snippet_ids can not be trusted as javascript
    # property ids because they might have leading '-' or something.
    return "K_" + snippet_id

  get_snippet: (snippet_id, callback) ->
    console.warn("get_snippet('#{snippet_id}') should no longer be called")
    snippet_js_key = @get_snippet_js_key(snippet_id)
    snippet_text = @snippet_db[snippet_js_key]
    url = @get_snippet_url(snippet_id)
    if snippet_text
      callback(null, {response:snippet_text, already_has_snippet_id:true})
    else
      #url = "http://localhost:9999/snippet/poetesses/b--balfcl--0--P--3/"
      #console.warn(url)
      d3.xhr(url, callback)
    return "got it"

  clear_snippets: (evt) =>
    if evt? and evt.target? and not $(evt.target).hasClass('close_all_snippets_button')
      return false
    @currently_printed_snippets = {}
    @snippet_positions_filled = {}
    $('.snippet_dialog_box').remove()
    return

  init_snippet_box: ->
    if d3.select('#snippet_box')[0].length > 0
      @snippet_box = d3.select('#snippet_box')
      console.log "init_snippet_box"
  remove_snippet: (snippet_id) ->
    key = @get_snippet_js_key(snippet_id)
    delete @currently_printed_snippets[key]
    if @snippet_box
      slctr = '#'+id_escape(snippet_id)
      console.log(slctr)
      @snippet_box.select(slctr).remove()
  push_snippet: (obj, msg) ->
    console.log "push_snippet"
    if @snippet_box
      snip_div = @snippet_box.append('div').attr('class','snippet')
      snip_div.html(msg)
      $(snip_div[0][0]).addClass("snippet_dialog_box")
      my_position = @get_next_snippet_position(obj.snippet_js_key)
      dialog_args =
        #maxHeight: @snippet_size
        minWidth: 400
        title: obj.dialog_title
        position:
          my: my_position
          at: "left top"
          of: window
        close: (event, ui) =>
          event.stopPropagation()
          delete @snippet_positions_filled[my_position]
          delete @currently_printed_snippets[event.target.id]
          return

      dlg = $(snip_div).dialog(dialog_args)
      elem = dlg[0][0]
      elem.setAttribute("id",obj.snippet_js_key)
      bomb_parent = $(elem).parent().
        select(".ui-dialog-titlebar").children().first()
      close_all_button = bomb_parent.
        append('<button type="button" class="ui-button ui-corner-all ui-widget close-all" role="button" title="Close All""><img class="close_all_snippets_button" src="close_all.png" title="Close All"></button>')
        #append('<span class="close_all_snippets_button" title="Close All"></span>')
        #append('<img class="close_all_snippets_button" src="close_all.png" title="Close All">')
      close_all_button.on('click', @clear_snippets)
      return

  snippet_positions_filled: {}
  snippet_position_str_to_obj: (str) ->
    # convert "left+123 top+456" to {left: 123, top: 456}
    [left, top] = str.replace(new RegExp('([a-z]*)\\+','g'),'').split(' ').map((c) -> parseInt(c))
    return {left, top}
  get_next_snippet_position_obj: (id) ->
    return @snippet_position_str_to_obj(@get_next_snippet_position(id))
  get_next_snippet_position: (id) ->
    # Fill the left edge, then the top edge, then diagonally from top-left
    id ?= true
    height = @height
    width = @width
    left_full = false
    top_full = false
    hinc = 0
    vinc = @snippet_size
    hoff = 0
    voff = 0
    retval = "left+#{hoff} top+#{voff}"
    while @snippet_positions_filled[retval]?
      hoff = hinc + hoff
      voff = vinc + voff
      retval = "left+#{hoff} top+#{voff}"
      if not left_full and voff + vinc + vinc > height
        left_full = true
        hinc = @snippet_size
        hoff = 0
        voff = 0
        vinc = 0
      if not top_full and hoff + hinc + hinc + hinc > width
        top_full = true
        hinc = 30
        vinc = 30
        hoff = 0
        voff = 0
    @snippet_positions_filled[retval] = id
    return retval

  # =========================================================================

  remove_tags: (xml) ->
    xml.replace(XML_TAG_REGEX, " ").replace(MANY_SPACES_REGEX, " ")

  # peek selects a node so that subsequent mouse motions select not nodes but edges of this node
  peek: (node) =>
    was_already_peeking = false
    if @peeking_node?
      if @peeking_node is node
        was_already_peeking = true
      @recolor_node(@peeking_node)
      @unflag_all_edges(@peeking_node)
    if not was_already_peeking
      @peeking_node = node
      @peeking_node.color = PEEKING_COLOR

  unflag_all_edges: (node) ->
    for edge in node.links_shown
      edge.focused = false

  hilight_dialog: (dialog_elem) ->
    if typeof(dialog_elem) is 'string'
      throw new Error('hilight_dialog() expects an Elem, not '+dialog_elem)
    else
      dialog_id = dialog_elem.getAttribute('id')
    $(dialog_elem).parent().append(dialog_elem) # bring to top
    $(dialog_elem).effect('shake')
    return

  print_edge: (edge) ->
    # @clear_snippets()
    context_no = 0
    for context in edge.contexts
      edge_inspector_id = @make_edge_inspector_id(edge, context)
      #snippet_js_key = @get_snippet_js_key(context.id)
      context_no++
      if @currently_printed_snippets[edge_inspector_id]?
        @hilight_dialog(edge._inspector or edge_inspector_id)
        continue
      me = this
      make_callback = (context_no, edge, context) =>
        (err,data) =>
          data = data or {response: ""}
          snippet_text = data.response
          if not data.already_has_snippet_id
            snippet_text = me.remove_tags(snippet_text)
            snippet_text += '<br><code class="snippet_id">'+context.id+"</code>"
          snippet_id = context.id
          snippet_js_key = me.get_snippet_js_key snippet_id
          if not me.currently_printed_snippets[edge_inspector_id]?
            me.currently_printed_snippets[edge_inspector_id] = []
          me.currently_printed_snippets[edge_inspector_id].push(edge)
          me.snippet_db[edge_inspector_id] = snippet_text
          me.printed_edge = edge
          quad =
            subj_uri: edge.source.id
            pred_uri: edge.predicate.id
            graph_uri: @data_uri
          if edge.target.isLiteral
            quad.obj_val = edge.target.name.toString()
          else
            quad.obj_uri = edge.target.id
          me.push_snippet
            edge_inspector_id: edge_inspector_id
            edge: edge
            pred_id: edge.predicate.lid
            pred_name: edge.predicate.name
            context_id: context.id
            quad: quad
            dialog_title: edge.source.name
            snippet_text: snippet_text
            no: context_no
            snippet_js_key: snippet_js_key
      cb = make_callback(context_no, edge, context)
      cb() # To get the old snippet fetcher working again, do the following instead:
      #@get_snippet(context.id, cb)

  # The Verbs PRINT and REDACT show and hide snippets respectively
  print: (node) =>
    @clear_snippets()
    for edge in node.links_shown
      @print_edge(edge)
    return

  redact: (node) =>
    node.links_shown.forEach (edge,i) =>
      @remove_snippet edge.id

  draw_edge_regarding: (node, predicate_lid) =>
    dirty = false
    doit = (edge,i,frOrTo) =>
      if edge.predicate.lid is predicate_lid
        if not edge.shown?
          @show_link(edge)
          dirty = true
    node.links_from.forEach (edge,i) =>
      doit(edge,i,'from')
    node.links_to.forEach (edge,i) =>
      doit(edge,i,'to')
    if dirty
      @update_state(node)
      @update_showing_links(node)
      @force.alpha(0.1)
      if not @args.skip_log_tick
        console.log("Tick in @force.alpha draw_edge_regarding")
    return

  undraw_edge_regarding: (node, predicate_lid) =>
    dirty = false
    doit = (edge,i,frOrTo) =>
      if edge.predicate.lid is predicate_lid
        dirty = true
        @unshow_link(edge)
    node.links_from.forEach (edge,i) =>
      doit(edge,i,'from')
    node.links_to.forEach (edge,i) =>
      doit(edge,i,'to')
    # FIXME(shawn) Looping through links_shown should suffice, try it again
    #node.links_shown.forEach (edge,i) =>
    #  doit(edge,'shown')
    if dirty
      @update_state(node)
      @update_showing_links(node)
      @force.alpha(0.1)
    return

  update_history: ->
    if window.history.pushState
      the_state = {}
      hash = ""
      if chosen_set.length
        the_state.chosen_node_ids = []
        hash += "#"
        hash += "chosen="
        n_chosen = chosen_set.length
        @chosen_set.forEach (chosen, i) =>
          hash += chosen.id
          the_state.chosen_node_ids.push chosen.id
          hash += ","  if n_chosen > i + 1

      the_url = location.href.replace(location.hash, "") + hash
      the_title = document.title
      window.history.pushState(the_state, the_title, the_state)

  # TODO: remove this method
  restore_graph_state: (state) ->
    #console.log('state:',state);
    return unless state
    if state.chosen_node_ids
      @reset_graph()
      state.chosen_node_ids.forEach (chosen_id) =>
        chosen = get_or_make_node(chosen_id)
        @choose chosen  if chosen

  fire_showgraph_event: ->
    window.dispatchEvent(
      new CustomEvent 'showgraph',
        detail:
          message: "graph shown"
          time: new Date()
        bubbles: true
        cancelable: true
    )

  showGraph: (g) ->
    alert "showGraph called"
    @make_nodes g
    @fire_showgraph_event() if window.CustomEvent?
    @restart()

  show_the_edges: () ->
    #edge_controller.show_tree_in.call(arguments)

  register_gclc_prefixes: =>
    @gclc.prefixes = {}
    for abbr,prefix of @G.prefixes
      @gclc.prefixes[abbr] = prefix


  # https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
  init_datasetDB: ->
    indexedDB = window.indexedDB # || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || null
    if not indexedDB
      console.log("indexedDB not available")
    if not @datasetDB and indexedDB
      @dbName = 'datasetDB'
      @dbVersion = 2
      request = indexedDB.open(@dbName, @dbVersion)
      request.onsuccess = (evt) =>
        @datasetDB = request.result
        @datasetDB.onerror = (err) =>
          alert("Database error: #{e.target.errorCode}")
        #alert "onsuccess"
        @populate_menus_from_IndexedDB('onsuccess')
      request.onerror = (err) =>
        alert("unable to init #{@dbName}")
      request.onupgradeneeded = (event) =>
        db = event.target.result
        objectStore = db.createObjectStore("datasets", {keyPath: 'uri'})
        objectStore.transaction.oncomplete = (evt) =>
          @datasetDB = db
          # alert "onupgradeneeded"
          @populate_menus_from_IndexedDB('onupgradeneeded')

  ensure_datasets: (preload_group, store_in_db) =>
    # note "fat arrow" so this can be an AJAX callback (see preload_datasets)
    defaults = preload_group.defaults or {}
    #console.log preload_group # THIS IS THE ITEMS IN A FILE (i.e. cwrc.json, generes.json)
    for ds_rec in preload_group.datasets
      # If this preload_group has defaults apply them to the ds_rec
      # if it is missing that value.
      # We do not want to do `ds_rec.__proto__ = defaults`
      #  because then defaults are not ownProperty
      for k of defaults
        ds_rec[k] ?= defaults[k]
      @ensure_dataset(ds_rec, store_in_db)

  ensure_dataset: (rsrcRec, store_in_db) ->
    # ensure the dataset is in the database and the correct
    uri = rsrcRec.uri
    rsrcRec.time ?= new Date().toString()
    rsrcRec.title ?= uri
    rsrcRec.isUri ?= not not uri.match(/^(http|ftp)/)
    # if it has a time then a user added it therefore canDelete
    rsrcRec.canDelete ?= not not rsrcRec.time?
    rsrcRec.label ?= uri.split('/').reverse()[0]
    if rsrcRec.isOntology
      if @ontology_loader
        @ontology_loader.add_resource(rsrcRec, store_in_db)
    if @dataset_loader and not rsrcRec.isEndpoint
      @dataset_loader.add_resource(rsrcRec, store_in_db)
    if rsrcRec.isEndpoint and @endpoint_loader
      @endpoint_loader.add_resource(rsrcRec, store_in_db)

  add_resource_to_db: (rsrcRec, callback) ->
    trx = @datasetDB.transaction('datasets', "readwrite")
    trx.oncomplete = (e) =>
      console.log("#{rsrcRec.uri} added!")
    trx.onerror = (e) =>
      console.log(e)
      alert "add_resource(#{rsrcRec.uri}) error!!!"
    store = trx.objectStore('datasets')
    req = store.put(rsrcRec)
    req.onsuccess = (e) =>
      if rsrcRec.isEndpoint
        @sparql_graph_query_and_show__trigger(e.srcElement.result)
      if rsrcRec.uri isnt e.target.result
        console.debug("rsrcRec.uri (#{rsrcRec.uri}) is expected to equal", e.target.result)
      callback(rsrcRec)

  remove_dataset_from_db: (dataset_uri, callback) ->
    trx = @datasetDB.transaction('datasets', "readwrite")
    trx.oncomplete = (e) =>
      console.log("#{dataset_uri} deleted")
    trx.onerror = (e) =>
      console.log(e)
      alert("remove_dataset_from_db(#{dataset_uri}) error!!!")
    store = trx.objectStore('datasets')
    req = store.delete(dataset_uri)
    req.onsuccess = (e) =>
      if callback?
        callback(dataset_uri)
    req.onerror = (e) =>
      console.debug e

  get_resource_from_db: (rsrcUri, callback) ->
    trx = @datasetDB.transaction('datasets', "readwrite")
    trx.oncomplete = (evt) =>
      console.log("get_resource_from_db('#{rsrcUri}') complete, either by success or error")
    trx.onerror = (err) =>
      console.log(err)
      if callback?
        callback(err, null)
      else
        alert("get_resource_from_db(#{rsrcUri}) error!!!")
        throw err
    store = trx.objectStore('datasets')
    req = store.get(rsrcUri)
    req.onsuccess = (event) =>
      if callback?
        callback(null, event.target.result)
    req.onerror = (err) =>
      console.debug("get_resource_from_db('#{rsrcUri}') onerror ==>",err)
      if callback
        callback(err, null)
      else
        throw err
    return

  populate_menus_from_IndexedDB: (why) ->
    # https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#Using_a_cursor
    console.log("populate_menus_from_IndexedDB(#{why})")
    datasetDB_objectStore = @datasetDB.transaction('datasets').objectStore('datasets')
    count = 0
    make_onsuccess_handler = (why) =>
      recs = []
      return (event) =>
        cursor = event.target.result
        if cursor
          count++
          rec = cursor.value
          recs.push(rec)
          legacyDataset = (not rec.isOntology and not rec.rsrcType)
          legacyOntology = (not not rec.isOntology)
          if rec.rsrcType in ['dataset', 'ontology'] or legacyDataset or legacyOntology
            # both datasets and ontologies appear in the dataset menu, for visualization
            @dataset_loader.add_resource_option(rec)
          if rec.rsrcType is 'ontology' or legacyOntology
            # only datasets are added to the dataset menu
            @ontology_loader.add_resource_option(rec)
          if rec.rsrcType is 'script'
            @script_loader.add_resource_option(rec)
          if rec.rsrcType is 'endpoint'
            @endpoint_loader.add_resource_option(rec)
          cursor.continue()
        else # when there are no (or NO MORE) entries, ie FINALLY
          #console.table(recs)
          # Reset the value of each loader to blank so
          # they show 'Pick or Provide...' not the last added entry.
          @dataset_loader.val('')
          @ontology_loader.val('')
          @endpoint_loader.val('')
          @script_loader.val('')
          @update_dataset_ontology_loader()
          console.groupEnd() # closing group called "populate_menus_from_IndexedDB(why)"
          document.dispatchEvent( # TODO use 'huvis_controls' rather than document
            new Event('dataset_ontology_loader_ready'));
          #alert "#{count} entries saved #{why}"

    if @dataset_loader?
      datasetDB_objectStore.openCursor().onsuccess = make_onsuccess_handler(why)

  preload_datasets: ->
    # If present args.preload is expected to be a list or urls or objects.
    # Whether literal object or JSON urls the object structure is expected to be:
    #   { 'datasets': [
    #        {
    #         'uri': "/data/byroau.nq",     // url of dataset .ttl or .nq
    #         'label': "Augusta Ada Brown", // label of OPTION in SELECT
    #         'isOntology': false,          // optional, if true it goes in Onto menu
    #         'opt_group': "Individuals",   // user-defined label for menu subsection
    #         'canDelete':   false,         // meaningful only for recs in datasetsDB
    #         'ontologyUri': '/data/orlando.ttl' // url of ontology
    #         }
    #                  ],
    #     'defaults': {}  # optional, may contain default values for the keys above
    #    }
    console.groupCollapsed("preload_datasets")
    # Adds preload options to datasetDB table
    console.log @args.preload
    if @args.preload
      for preload_group_or_uri in @args.preload
        if typeof(preload_group_or_uri) is 'string' # the URL of a preload_group JSON
          #$.getJSON(preload_group_or_uri, null, @ensure_datasets_from_XHR)
          $.ajax
            async: false
            url: preload_group_or_uri
            success: (data, textStatus) =>
              @ensure_datasets_from_XHR(data)
            error: (jqxhr, textStatus, errorThrown) ->
              console.error(preload_group_or_uri + " " +textStatus+" "+errorThrown.toString())
        else if typeof(preload_group_or_uri) is 'object' # a preload_group object
          @ensure_datasets(preload_group_or_uri)
        else
          console.error("bad member of @args.preload:", preload_group_or_uri)
    console.groupEnd() # closing group called "preload_datasets"

  preload_endpoints: ->
    console.log(@args.preload_endpoints)
    console.groupCollapsed("preload_endpoints")
    ####
    if @args.preload_endpoints
      for preload_group_or_uri in @args.preload_endpoints
        console.log(preload_group_or_uri)
        if typeof(preload_group_or_uri) is 'string' # the URL of a preload_group JSON
          #$.getJSON(preload_group_or_uri, null, @ensure_datasets_from_XHR)
          $.ajax
            async: false
            url: preload_group_or_uri
            success: (data, textStatus) =>
              @ensure_datasets_from_XHR(data)
            error: (jqxhr, textStatus, errorThrown) ->
              console.error(preload_group_or_uri + " " +textStatus+" "+errorThrown.toString())
        else if typeof(preload_group_or_uri) is 'object' # a preload_group object
          @ensure_datasets(preload_group_or_uri)
        else
          console.error("bad member of @args.preload:", preload_group_or_uri)
    console.groupEnd()
    ####

  ensure_datasets_from_XHR: (preload_group) =>
    @ensure_datasets(preload_group, false) # false means DO NOT store_in_db
    return

  get_menu_by_rsrcType: (rsrcType) ->
    return @[rsrcType+'_loader'] # eg rsrcType='script' ==> @script_loader

  get_or_create_sel_for_picker: (specificSel) ->
    # if specificSel is defined, return it, otherwise return the selector of a thin
    sel = specificSel
    if not sel?
      if not @pickersSel?
        pickersId = @unique_id('pickers_')
        @pickersSel = '#' + pickersId
        if (huvis_controls_sel = @oldToUniqueTabSel['huvis_controls'])
          @huvis_controls_elem ?= document.querySelector(huvis_controls_sel)
          if @huvis_controls_elem
            @huvis_controls_elem.insertAdjacentHTML('beforeend', """<div id="#{pickersId}"></div>""")
      sel = @pickersSel
    return sel

  init_resource_menus: ->
    # REVIEW See views/huviz.html.eco to set dataset_loader__append_to_sel and similar
    if not @dataset_loader and @args.make_pickers
      sel = @get_or_create_sel_for_picker(@args.dataset_loader__append_to_sel)
      @dataset_loader = new PickOrProvide(@, sel,
        'Dataset', 'DataPP', false, false,
        {rsrcType: 'dataset'})
    if not @ontology_loader and @args.make_pickers
      sel = @get_or_create_sel_for_picker(@args.ontology_loader__append_to_sel)
      @ontology_loader = new PickOrProvide(@, sel,
        'Ontology', 'OntoPP', true, false,
        {rsrcType: 'ontology'})
    if not @script_loader and @args.make_pickers
      sel = @get_or_create_sel_for_picker(@args.script_loader__append_to_sel)
      @script_loader = new PickOrProvideScript(@, sel,
        'Script', 'ScriptPP', false, false,
        {dndLoaderClass: DragAndDropLoaderOfScripts; rsrcType: 'script'})
    if not @endpoint_loader and @args.make_pickers
      sel = @get_or_create_sel_for_picker(@args.endpoint_loader__append_to_sel)
      @endpoint_loader = new PickOrProvide(@, sel,
        'Sparql', 'EndpointPP', false, true,
        {rsrcType: 'endpoint'})
      #@endpoint_loader.outstanding_requests = 0
    if @endpoint_loader and not @big_go_button
      @build_sparql_form()
      endpoint_selector = "##{@endpoint_loader.select_id}"
      $(endpoint_selector).change(@update_endpoint_form)
    if @ontology_loader and not @big_go_button
      @big_go_button_id = @unique_id('goButton_')
      @big_go_button = $('<button class="big_go_button">LOAD</button>')
      @big_go_button.attr('id', @big_go_button_id)
      $(@get_or_create_sel_for_picker()).append(@big_go_button)
      @big_go_button.click(@big_go_button_onclick)
      @disable_go_button()
    if @ontology_loader or @dataset_loader or @script_loader and not @big_go_button
      ontology_selector = "##{@ontology_loader.select_id}"
      $(ontology_selector).change(@update_dataset_forms)
      dataset_selector = "##{@dataset_loader.select_id}"
      $(dataset_selector).change(@update_dataset_forms)
      script_selector = "##{@script_loader.select_id}"
      $(script_selector).change(@update_dataset_forms)

    @init_datasetDB()
    @preload_datasets()

    #@preload_endpoints()
    # TODO remove this nullification of @last_val by fixing logic in select_option()
    # clear the last_val so select_option works the first time
    @ontology_loader?last_val = null

  big_go_button_onclick: (event) =>
    if @using_sparql()
      return @big_go_button_onclick_sparql(event)
    @visualize_dataset_using_ontology()
    return

  big_go_button_onclick_sparql: (event) ->
    if @allGraphsChosen()
      if (foundUri = @endpoint_labels_JQElem.val())
        @visualize_dataset_using_ontology()
        return
      colorlog("IGNORING. The LOAD button should not even be clickable right now")
      return
    if (endpoint_label_uri = @endpoint_labels_JQElem.val())
      @visualize_dataset_using_ontology()
      return
    if (graphUri = @sparqlGraphSelector_JQElem.val())
      @displayTheChosenGraph(graphUri)
      return
    colorlog("IGNORING.  Neither graph nor endpoint_label is chosen.")
    return

  displayTheChosenGraph: (graphUri) ->
    #alert("stub for displayTheChosenGraph('#{graphUri}')")
    args =
      success_handler: @display_graph_success_handler
      result_handler: @name_result_handler
      query_terms:
        g: graphUri
    # respect the limit provided by the user
    if (limit = @endpoint_limit_JQElem.val())
      args.limit = limit
    args.query = @make_generic_query(args)
    @run_generic_query(args)
    return

  # ## make_generic_query()
  #
  # The default query looks like:
  # ```sparql
  # SELECT *
  # FROM <query_terms.g> # only present if query_terms.g provided
  # WHERE {
  #   <query_terms.s> ?p ?o .
  # }
  # LIMIT 20 # the value of args.limit, if present
  # ```
  make_generic_query: (in_args) ->
    args = @compose_object_from_defaults_and_incoming(@default_name_query_args, in_args)
    terms = args.query_terms or {}
    lines = ["SELECT *"]
    if terms.g?
      lines.push("FROM <#{terms.g}>")
    lines.push("WHERE {")
    pattern = "  "
    for term in 'spo'.split('')
      val = terms[term]
      if val?
        pattern += "<#{val}> "
      else
        pattern += "?#{term} "
    pattern += "."
    lines.push(pattern)
    lines.push("}")
    if args.limit
      lines.push("LIMIT #{args.limit}")
    return lines.join("\n")

  run_generic_query: (args) ->
    serverSpec = @get_server_for_dataset(args.query_terms.g)
    {serverType, serverUrl} = serverSpec
    args.serverUrl = serverUrl
    args.serverType = serverType
    switch serverType
      when 'ldf'
        @run_managed_query_ldf(args)
      when 'sparql'
        @run_managed_query_ajax(args)
      else
        throw new Error("don't know how to handle serverType: '#{serverType}'")
    return

  domain2sparqlEndpoint:
    'cwrc.ca': 'http://sparql.cwrc.ca/sparql'
    'getty.edu': 'http://vocab.getty.edu/sparql.tsv'
    'openstreetmap.org': 'https://sophox.org/sparql'

  get_server_for_dataset: (datasetUri) ->
    aUrl = new URL(datasetUri)
    {domain} = aUrl
    # Deal with the situation where the datasetUri sought is served
    # by the server the user has chosen.
    if @using_sparql() and @sparqlGraphSelector_JQElem.val() is datasetUri
      serverType = 'sparql'
      serverUrl = @endpoint_loader.value
    # Otherwise, consult built-in hard-coded mappings from datasets to
    # the servers they are available at.  First we look for matches
    # based on the domain sought.
    else if (serverUrl = @domain2sparqlEndpoint[domain])
      serverType = 'sparql'
    else if (serverUrl = @domain2sparqlEndpoint[domain])
      serverType = 'ldf'
    # Then try to find wildcard servers '*', if available.
    # Give precedence to sparql over ldf.
    else if (serverUrl = @domain2sparqlEndpoint['*'])
      serverType = 'sparql'
    else if (serverUrl = @domain2ldfServer['*'])
      serverType = 'ldf'
    else
      throw new Error("a server could not be found for #{datasetUri}")
    return {serverType, serverUrl}

  update_dataset_forms: (e) =>
    ont_val = $("##{@ontology_loader.select_id}").val()
    dat_val = $("##{@dataset_loader.select_id}").val()
    scr_val = $("##{@script_loader.select_id}").val()
    if ont_val is '' and dat_val is '' and scr_val is ''
      $("##{@endpoint_loader.uniq_id}").children('select').prop('disabled', false)
    else
      $("##{@endpoint_loader.uniq_id}").children('select').prop('disabled', 'disabled')

  update_graph_form: (e) =>
    console.log e.currentTarget.value
    @endpoint_loader.endpoint_graph = e.currentTarget.value

  visualize_dataset_using_ontology: (ignoreEvent, dataset, ontologies) =>
    colorlog('visualize_dataset_using_ontology()', dataset, ontologies)
    @close_blurt_box()
    endpoint_label_uri = @endpoint_labels_JQElem.val()
    if endpoint_label_uri
      data = dataset or @endpoint_loader
      @load_endpoint_data_and_show(endpoint_label_uri)
      # TODO ensure disable_dataset_ontology_loader() is only called once
      console.warn("disable_dataset_ontology_loader() SHOULD BE CALLED ONLY ONCE")
      @disable_dataset_ontology_loader_AUTOMATICALLY()
      @update_browser_title(data)
      @update_caption(data.value, data.endpoint_graph)
      return
    # Either dataset and ontologies are passed in by HuViz.load_with() from a command
    #   or this method is called with neither in which case get values from the loaders
    alreadyCommands = (@gclui.command_list? and @gclui.command_list.length)
    alreadyCommands = @gclui.future_cmdArgs.length > 0
    if @script_loader.value and not alreadyCommands
      scriptUri = @script_loader.value
      @get_resource_from_db(scriptUri, @load_script_from_db)
      return
    onto = ontologies and ontologies[0] or @ontology_loader
    data = dataset or @dataset_loader
    # at this point data and onto are both objects with a .value key, containing url or fname
    if not (onto.value and data.value)
      console.debug(data, onto)
      @update_dataset_forms()
      throw new Error("Now whoa-up pardner... both data and onto should have .value")
    @load_data_with_onto(data, onto, @after_visualize_dataset_using_ontology)
    @update_browser_title(data)
    @update_caption(data.value, onto.value)
    return

  after_visualize_dataset_using_ontology: =>
    @preset_discover_geonames_remaining()

  load_script_from_db: (err, rsrcRec) =>
    if err?
      @blurt(err, 'error')
    else
      @load_script_from_JSON(@parse_script_file(rsrcRec.data, rsrcRec.uri))

  init_gclc: ->
    @gclc = new GraphCommandLanguageCtrl(this)
    @init_resource_menus()
    if not @gclui?
      # @oldToUniqueTabSel['huvis_controls'] ???
      @gclui = new CommandController(this,d3.select(@args.gclui_sel)[0][0],@hierarchy)
    window.addEventListener('showgraph', @register_gclc_prefixes)
    window.addEventListener('newpredicate', @gclui.handle_newpredicate)
    if not @show_class_instance_edges
      TYPE_SYNS.forEach (pred_id,i) =>
        @gclui.ignore_predicate(pred_id)
    NAME_SYNS.forEach (pred_id,i) =>
      @gclui.ignore_predicate(pred_id)
    for pid in @predicates_to_ignore
      @gclui.ignore_predicate(pid)
    return

  disable_dataset_ontology_loader_AUTOMATICALLY: ->
    # TODO to be AUTOMATIC(!!) handle dataset, ontology and script too
    # TODO this should add graph, item and limit only if needed
    endpoint =
      value: @endpoint_loader.value
      label: @endpoint_loader.value # TODO get pretty label (or not?)
      limit: @endpoint_limit_JQElem.val()
      graph:
        value: @sparqlGraphSelector_JQElem.val()
        label: @sparqlGraphSelector_JQElem.val() # TODO get pretty label (or not?)
      item:
        value: @endpoint_labels_JQElem.val()
        label: @endpoint_labels_JQElem.val() # TODO get pretty label (or not?)
    @disable_dataset_ontology_loader(null, null, endpoint)
    return

  disable_dataset_ontology_loader: (data, onto, endpoint) ->
    @replace_loader_display(data, onto, endpoint)
    @disable_go_button()
    @dataset_loader.disable()
    @ontology_loader.disable()
    @big_go_button.hide()
    return

  reset_dataset_ontology_loader: ->
    $('#'+@get_data_ontology_display_id()).remove()
    #Enable dataset loader and reset to default setting
    @dataset_loader.enable()
    @ontology_loader.enable()
    @big_go_button.show()
    $("##{@dataset_loader.select_id} option[label='Pick or Provide...']").prop('selected', true)
    @gclui_JQElem.removeAttr("style","display:none")
    return

  update_dataset_ontology_loader: =>
    if not (@dataset_loader? and @ontology_loader? and
            @endpoint_loader? and @script_loader?)
      console.log("still building loaders...")
      return
    @set_ontology_from_dataset_if_possible()
    ugb = () =>
      @update_go_button() # TODO confirm that this should be disable_go_button
    setTimeout(ugb, 200)

  update_endpoint_form: (e) =>
    #check if there are any endpoint selections available
    graphSelector = "#sparqlGraphOptions-#{e.currentTarget.id}"
    $(graphSelector).change(@update_graph_form)
    if e.currentTarget.value is ''
      $("##{@dataset_loader.uniq_id}").children('select').prop('disabled', false)
      $("##{@ontology_loader.uniq_id}").children('select').prop('disabled', false)
      $("##{@script_loader.uniq_id}").children('select').prop('disabled', false)
      $(graphSelector).parent().css('display', 'none')
      @reset_endpoint_form(false)
    else if e.currentTarget.value is 'provide'
      console.log "update_endpoint_form ... select PROVIDE"
    else
      @sparql_graph_query_and_show(e.currentTarget.value, e.currentTarget.id)
      #console.log @dataset_loader
      $("##{@dataset_loader.uniq_id}").children('select').prop('disabled', 'disabled')
      $("##{@ontology_loader.uniq_id}").children('select').prop('disabled', 'disabled')
      $("##{@script_loader.uniq_id}").children('select').prop('disabled', 'disabled')

  reset_endpoint_form: (show) =>
    spinner = $("#sparqlGraphSpinner-#{@endpoint_loader.select_id}")
    spinner.css('display','none')
    @endpoint_labels_JQElem.prop('disabled', false).val("")
    @endpoint_limit_JQElem.prop('disabled', false).val(@sparql_query_default_limit)
    if show
      @sparqlQryInput_show()
    else
      @sparqlQryInput_hide()

  disable_go_button: =>
    @update_go_button((disable = true))
    return

  enable_go_button: =>
    @update_go_button((disable = false))
    return

  update_go_button: (disable) ->
    if not disable?
      if @script_loader.value
        disable = false
      else if @using_sparql()
        disable = false
      else
        ds_v = @dataset_loader.value
        on_v = @ontology_loader.value
        #console.log("DATASET: #{ds_v}\nONTOLOGY: #{on_v}")
        disable = (not (ds_v and on_v)) or ('provide' in [ds_v, on_v])
        ds_on = "#{ds_v} AND #{on_v}"
    @big_go_button.prop('disabled', disable)
    return

  get_reload_uri: ->
    return @reload_uri or new URL(window.location)

  generate_reload_uri: (dataset, ontology, endpoint) ->
    @reload_uri = uri = new URL(document.location)
    if dataset and ontology
      uri.hash = "load+#{dataset.value}+with+#{ontology.value}"
    else if endpoint
      uri.hash = "query+"+encodeURIComponent(endpoint.value)
      if endpoint.graph and endpoint.graph.value
        uri.hash += "+from+"+encodeURIComponent(endpoint.graph.value)
      if endpoint.item and endpoint.item.value
        uri.hash += "+seeking+"+encodeURIComponent(endpoint.item.value)
      if endpoint.limit
        uri.hash += "+limit+"+encodeURIComponent(endpoint.limit)
    return uri

  get_data_ontology_display_id: ->
    @data_ontology_display_id ?= @unique_id('datontdisp_')
    return @data_ontology_display_id

  hide_pickers: ->
    $(@pickersSel).attr("style","display:none")

  replace_loader_display: (dataset, ontology, endpoint) ->
    @generate_reload_uri(dataset, ontology, endpoint)
    @hide_pickers()
    vis_src_args =
      uri: @get_reload_uri()
      dataset: dataset
      ontology: ontology
      endpoint: endpoint
      script: "TODO include script stuff here"
    @render_visualization_source_display(vis_src_args)
    return

  render_visualization_source_display: (vis_src_args) ->
    {dataset, ontology, endpoint, script, uri} = vis_src_args
    if dataset and ontology
      add_reload_button = true
      source_html = """
        <p><span class="dt_label">Dataset:</span> #{dataset.label}</p>
        <p><span class="dt_label">Ontology:</span> #{ontology.label}</p>
        """
    else if endpoint
      add_reload_button = true
      source_html = """
        <p><span class="dt_label">Endpoint:</span> #{endpoint.label}</p>
      """
      if endpoint.graph
        source_html += """
        <p><span class="dt_label">Graph:</span> #{endpoint.graph.label}</p>
      """
      if endpoint.item
        source_html += """
        <p><span class="dt_label">Item:</span> #{endpoint.item.label}</p>
      """
      if endpoint.limit
        source_html += """
        <p><span class="dt_label">Limit:</span> #{endpoint.limit}</p>
      """
    else if script
      source_html = """
        <p><span class="dt_label">Script:</span> #{script}</p>
      """
    else
      source_html = """
        <p><span class="dt_label">Source:</span>TBD</p>
      """
    reload_html = """
      <p>
        <button title="Reload this data"
           onclick="location.replace('#{uri}');location.reload()"><i class="fas fa-redo"></i></button>
        <button title="Clear the graph and start over"
           onclick="location.assign(location.origin)"><i class="fas fa-times"></i></button>
      </p>
    """
    visualization_source_display = """
    <div id="#{@get_data_ontology_display_id()}" class="data_ontology_display">
      #{source_html}
      #{add_reload_button and reload_html or ''}
      <br style="clear:both">
    </div>""" # """ the extra set of triple double quotes is for emacs coffescript mode
    sel = @oldToUniqueTabSel['huvis_controls']
    controls = document.querySelector(sel)
    controls.insertAdjacentHTML('afterbegin', visualization_source_display)
    return

  replace_loader_display_for_endpoint: (endpoint, graph) ->
    $(@pickersSel).attr("style","display:none")
    #uri = new URL(location)
    #uri.hash = "load+#{dataset.value}+with+#{ontology.value}"
    if graph
      print_graph = "<p><span class='dt_label'>Graph:</span> #{graph}</p>"
    else
      print_graph = ""
    data_ontol_display = """
    <div id="#{@get_data_ontology_display_id()}">
      <p><span class="dt_label">Endpoint:</span> #{endpoint}</p>
      #{print_graph}
      <br style="clear:both">
    </div>"""
    $("#huvis_controls").prepend(data_ontol_display)

  update_browser_title: (dataset) ->
    if dataset.value
      @set_browser_title(dataset.label)

  set_browser_title: (label) ->
    document.title = label + " - Huvis Graph Visualization"

  make_git_link: ->
    base = @args.git_base_url
    """<a class="git_commit_hash_watermark subliminal"
         target="huviz_version"  tabindex="-1"
         href="#{base}#{@git_commit_hash}">#{@git_commit_hash}</a>""" # """

  create_caption: ->
    @captionId = @unique_id('caption_')
    @addDivWithIdAndClasses(@captionId, "graph_title_set git_commit_hash_watermark")
    @captionElem = document.querySelector('#' + @captionId)
    if @git_commit_hash
      @insertBeforeEnd(@captionElem, @make_git_link())
    dm = 'dataset_watermark'
    @insertBeforeEnd(@captionElem, """<div class="#{dm} subliminal"></div>""") # """
    @make_JQElem(dm, @args.huviz_top_sel + ' .' + dm) # @dataset_watermark_JQElem
    om = 'ontology_watermark'
    @insertBeforeEnd(@captionElem, """<div class="#{om} subliminal"></div>""") # """
    @make_JQElem(om, @args.huviz_top_sel + ' .' + om) # @ontology_watermark_JQElem
    return

  update_caption: (dataset_str, ontology_str) ->
    @dataset_watermark_JQElem.text(dataset_str)
    @ontology_watermark_JQElem.text(ontology_str)
    return

  set_ontology_from_dataset_if_possible: ->
    if @dataset_loader.value # and not @ontology_loader.value
      option = @dataset_loader.get_selected_option()
      ontologyUri = option.data('ontologyUri')
      ontology_label = option.data('ontology_label') #default set in group json file
      if ontologyUri # let the uri (if present) dominate the label
        @set_ontology_with_uri(ontologyUri)
      else
        @set_ontology_with_label(ontology_label)
    @ontology_loader.update_state()

  set_ontology_with_label: (ontology_label) ->
    topSel = @args.huviz_top_sel
    sel = topSel + " [label='#{ontology_label}']"
    for ont_opt in $(sel) # FIXME make this re-entrant
      @ontology_loader.select_option($(ont_opt))
      return
    return

  set_dataset_with_uri: (uri) ->
    # TODO use PickOrProvide.select_by_uri() as in query_from_seeking_limit()
    topSel = @args.huviz_top_sel
    option = $(topSel + ' option[value="' + uri + '"]')
    @dataset_loader.select_option(option)

  set_ontology_with_uri: (ontologyUri) ->
    # TODO use PickOrProvide.select_by_uri() as in query_from_seeking_limit()
    topSel = @args.huviz_top_sel
    ontology_option = $(topSel + ' option[value="' + ontologyUri + '"]')
    @ontology_loader.select_option(ontology_option)

  build_sparql_form: () =>
    @sparqlId = unique_id()
    sparqlQryInput_id = "sparqlQryInput_#{@sparqlId}"
    @sparqlQryInput_selector = "#" + sparqlQryInput_id
    endpoint_limit_id = unique_id('endpoint_limit_')
    endpoint_labels_id = unique_id('endpoint_labels_')
    sparqlGraphSelectorId = "sparqlGraphOptions-#{@endpoint_loader.select_id}"
    select_box = """
      <div class="ui-widget" style="display:none;margin-top:5px;margin-left:10px;">
        <label>Graphs: </label>
        <select id="#{sparqlGraphSelectorId}">
        </select>
      </div>
      <div id="sparqlGraphSpinner-#{@endpoint_loader.select_id}"
           style="display:none;font-style:italic;">
        <i class="fas fa-spinner fa-spin" style="margin: 10px 10px 0 50px;"></i>  Looking for graphs...
      </div>
      <div id="#{sparqlQryInput_id}" class="ui-widget sparqlQryInput"
           style="display:none;margin-top:5px;margin-left:10px;color:#999;">
        <label for="#{endpoint_labels_id}">Find: </label>
        <input id="#{endpoint_labels_id}">
        <i class="fas fa-spinner fa-spin" style="visibility:hidden;margin-left: 5px;"></i>
        <div><label for="#{endpoint_limit_id}">Node Limit: </label>
        <input id="#{endpoint_limit_id}" value="#{@sparql_query_default_limit}">
        </div>
      </div>
    """ # """
    $(@pickersSel).append(select_box)
    @sparqlQryInput_JQElem = $(@sparqlQryInput_selector)
    @endpoint_labels_JQElem = $('#'+endpoint_labels_id)
    @endpoint_limit_JQElem = $('#'+endpoint_limit_id)
    @sparqlGraphSelector_JQElem = $('#'+sparqlGraphSelectorId)
    @sparqlGraphSelector_JQElem.change(@sparqlGraphSelector_onchange)
    fromGraph =''
    @endpoint_labels_JQElem.on('input', @animate_endpoint_label_typing)
    @endpoint_labels_JQElem.autocomplete
      minLength: 3
      delay: 500
      position: {collision: "flip"}
      source: @search_sparql_by_label
    @endpoint_labels_JQElem.on('autocompleteselect', @endpoint_labels__autocompleteselect)
    @endpoint_labels_JQElem.on('change', @endpoint_labels__update)
    @endpoint_labels_JQElem.focusout(@endpoint_labels__focusout)

  # Called when the user selects an endpoint_labels autosuggestion
  endpoint_labels__autocompleteselect: (event) =>
    # Hopefully having this handler engaged will not interfere with the autocomplete.
    @enable_go_button()
    return true

  endpoint_labels__update: (event) =>
    # If the endpoint_labels field is left blank then permit LOAD of graph
    if not @endpoint_labels_JQElem.val().length
      @enable_go_button()
    return true

  endpoint_labels__focusout: (event) =>
    # If endpoint_labels has content WITHOUT autocompleteselect then disable LOAD
    if not @endpoint_labels_JQElem.val().length
      @enable_go_button()
    return true

  allGraphsChosen: ->
    # REVIEW what about the case where there were no graphs?
    try
      return @sparqlGraphSelector_JQElem.val() is @endpoint_loader.value
    catch error
      # REVIEW big handwave here! Assuming an error means something is missing
      return false

  # When a Graph is selected, we offer the LOAD button for full graph loading.
  sparqlGraphSelector_onchange: (event) =>
    if @allGraphsChosen()
      # Apparently, 'All Graphs' was chosen.
      # Disable the LOAD button because loading all data on a server is madness.
      @disable_go_button()
    else
      # Some particular graph was apparently chosen.
      # We enable the LOAD button so the whole graph may be loaded.
      @enable_go_button()
    return

  animate_endpoint_label_typing: =>
    # Called every time the user types a character to animate the countdown to sending a query
    elem = @endpoint_labels_JQElem[0]
    @endpoint_label_typing_anim = @animate_fill_graph(elem, 500, '#E7E7E7')
    # TODO receive a handle to the animation so it can be killed when the search begins

  animate_endpoint_label_search: (overMsec, fc, bc) =>
    # Called every time the search starts to show countdown until timeout
    @start_graphs_selector_spinner()
    overMsec ?= @get_sparql_timeout_msec()
    elem = @endpoint_labels_JQElem[0]
    @endpoint_label_search_anim = @animate_sparql_query(elem, overMsec, fc, bc)
    # TODO upon timeout, style box with a color to indicate failure
    # TODO upon success, style the box with a color to indicate success

  endpoint_label_search_success: ->
    @kill_endpoint_label_search_anim()
    @endpoint_labels_JQElem.css('background', 'lightgreen')

  endpoint_label_search_none: ->
    @kill_endpoint_label_search_anim()
    @endpoint_labels_JQElem.css('background', 'lightgrey')

  endpoint_label_search_failure: ->
    @kill_endpoint_label_search_anim()
    @endpoint_labels_JQElem.css('background', 'pink')

  kill_endpoint_label_search_anim: ->
    @endpoint_label_search_anim.cancel()
    @stop_graphs_selector_spinner()
    return

  animate_sparql_query: (elem, overMsec, fillColor, bgColor) ->
    fillColor ?= 'lightblue'
    return @animate_fill_graph(elem, overMsec, fillColor, bgColor)

  animate_fill_graph: (elem, overMsec, fillColor, bgColor) ->
    # https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
    overMsec ?= 2000
    fillColor ?= 'yellow'
    bgColor ?= 'white'
    animId = false
    go = (elem, overMsec, fillColor, bgColor) ->
      cancelled = false
      anim = {elem, overMsec, fillColor, bgColor, cancelled}
      step = (nowMsec) ->
        if anim.cancelled
          console.info('animate_fill_graph() cancelled')
          return
        if not anim.startMsec
          anim.startMsec = nowMsec
        anim.progressMsec = nowMsec - anim.startMsec
        fillPct = ((anim.overMsec - anim.progressMsec) / anim.overMsec) * 100
        bgPct = 100 - fillPct
        bg = "linear-gradient(to right, #{anim.fillColor} 0% #{bgPct}%, #{bgColor} #{bgPct}%, #{anim.bgColor} 100%)"
        # console.log(bg, anim.startMsec, nowMsec, anim.progressMsec)
        elem.style.background = bg
        if anim.progressMsec < anim.overMsec
          anim.animId = requestAnimationFrame(step)
      anim.animId = requestAnimationFrame(step)
      anim.cancel = () ->
        anim.cancelled = true
        window.cancelAnimationFrame(anim.animId)
      return anim
    return go(elem, overMsec, fillColor, bgColor)

  get_sparql_timeout_msec: ->
    return 1000 * (@sparql_timeout or 5)

  start_graphs_selector_spinner: ->
    spinner = @endpoint_labels_JQElem.siblings('i')
    spinner.css('visibility','visible')
    return

  stop_graphs_selector_spinner: ->
    spinner = @endpoint_labels_JQElem.siblings('i')
    spinner.css('visibility','hidden') #  happens regardless of result.length
    return

  euthanize_search_sparql_by_label: ->
    @disable_go_button()
    if @search_sparql_by_label_queryManager?
      @kill_endpoint_label_search_anim()
      @search_sparql_by_label_queryManager.kill()
      return true
    return false

  #  # Reading
  #
  #  Efficient Optimization and Processing of Queries over Text-rich Graph-structured Data
  #    https://d-nb.info/1037189205/34
  #
  #  Alternatives to regex in SPARQL
  #    https://www.cray.com/blog/dont-use-hammer-screw-nail-alternatives-regex-sparql/
  search_sparql_by_label: (request, response) =>
    @euthanize_search_sparql_by_label()
    @animate_endpoint_label_search()
    @start_graphs_selector_spinner()
    url = @endpoint_loader.value
    fromGraph = ''
    if @endpoint_loader.endpoint_graph
      fromGraph=" FROM <#{@endpoint_loader.endpoint_graph}> "

    qry = """
    # search_sparql_by_label()
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX dbp: <http://dbpedia.org/ontology/>
    SELECT DISTINCT * #{fromGraph}
    WHERE {
      ?sub rdfs:label|foaf:name|dbp:name ?obj .
      FILTER (STRSTARTS(LCASE(?obj), "#{request.term.toLowerCase()}"))
    }
    LIMIT 20
    """                       # for emacs syntax hilighting  ---> "

    make_success_handler = () =>
      return (data, textStatus, jqXHR, queryManager) =>
        json_check = typeof data
        if json_check is 'string'
          try
            json_data = JSON.parse(data)
          catch e
            console.error(e)
            console.log({data})
            @endpoint_label_search_failure()
        else
          json_data = data
        results = json_data.results.bindings
        queryManager.setResultCount(results.length)
        selections = []

        if results.length
          @endpoint_label_search_success()
        else
          @endpoint_label_search_none()
        # TODO maybe move spinner control into @kill_endpoint_label_search_anim()
        @stop_graphs_selector_spinner()

        for label in results
          this_result = {
            label: label.obj.value + " (#{label.sub.value})"
            value: label.sub.value
          }
          selections.push(this_result)
        response(selections)

    make_error_callback = () =>
      return (jqxhr, textStatus, errorThrown) =>
        @endpoint_label_search_failure()
        $('#'+@get_data_ontology_display_id()).remove()
        @stop_graphs_selector_spinner()

    args =
      query: qry
      serverUrl: url
      success_handler: make_success_handler()
      error_callback: make_error_callback()

    @search_sparql_by_label_queryManager = @run_managed_query_ajax(args)

  init_editc_or_not: ->
    @editui ?= new EditController(@)
    @editui.id = 'EditUI'
    @editui.transit('prepare')
    if @args.show_edit
      @editui.show()
    else
      @editui.hide()
    if @args.start_with_editing
      @editui.transit('enable')

  indexed_dbservice: ->
    @indexeddbservice ?= new IndexedDBService(this)

  init_indexddbstorage: ->
    @dbsstorage ?= new IndexedDBStorageController(this, @indexeddbservice)

  # TODO make other than 'anything' optional
  predicates_to_ignore: ["anything", "first", "rest", "members"]

  get_polar_coords_of: (node) ->
    w = @get_container_height()
    h = @get_container_width()
    min_wh = Math.min(w, h)
    max_radius = min_wh / 2
    max_radius = @graph_region_radius
    x = node.x - @cx
    y = node.y - @cy
    range = (Math.sqrt(((x * x) + (y * y)))/(max_radius))
    radians = Math.atan2(y, x) + (Math.PI) # + (Math.PI/2)
    degrees = (Math.floor(radians * 180 / Math.PI) + 270) % 360
    return {range: range, degrees: degrees}

  run_verb_on_object: (verb, subject) ->
    args =
      verbs: [verb]
      subjects: [@get_handle subject]
    if verb is 'pin'
      args.polar_coords = @get_polar_coords_of(subject)
    cmd = new gcl.GraphCommand(this, args)
    @run_command(cmd)

  before_running_command: ->
    # FIXME fix non-display of cursor and color changes
    @text_cursor.set_cursor("wait")
    #$("body").css "background-color", "red" # FIXME remove once it works!
    #toggle_suspend_updates(true)

  after_running_command: ->
    #toggle_suspend_updates(false)
    @text_cursor.set_cursor("default")
    #$("body").css "background-color", renderStyles.pageBg # FIXME remove once it works!
    #$("body").addClass renderStyles.themeName
    @topElem.style.backgroundColor = renderStyles.pageBg
    @topElem.classList.add(renderStyles.themeName)

    @update_all_counts()
    @clean_up_all_dirt_once()

  get_handle: (thing) ->
    # A handle is like a weak reference, saveable, serializable
    # and garbage collectible.  It was motivated by the desire to
    # turn an actual node into a suitable member of the subjects list
    # on a GraphCommand
    return {id: thing.id, lid: thing.lid}

  toggle_logging: () ->
    if not console.log_real?
      console.log_real = console.log
    new_state = console.log is console.log_real
    @set_logging(new_state)

  set_logging: (new_state) ->
    if new_state
      console.log = console.log_real
      return true
    else
      console.log = () ->
      return false

  create_state_msg_box: () ->
    @state_msg_box = $("#state_msg_box")
    @hide_state_msg()
    #console.info @state_msg_box

  init_ontology: ->
    @create_taxonomy()
    @ontology = PRIMORDIAL_ONTOLOGY

  default_tab_specs: [
    id: 'commands'
    cssClass:'huvis_controls scrolling_tab unselectable'
    title: "Power tools for controlling the graph"
    text: "Commands"
  ,
    id: 'settings'
    cssClass: 'settings scrolling_tab'
    title: "Fine tune sizes, lengths and thicknesses"
    text: "Settings"
  ,
    id: 'history'
    cssClass:'tabs-history'
    title: "The command history"
    text: "History"
  ,
    id: 'credits'
    cssClass: 'tabs-credit scrolling_tab'
    title: "Academic, funding and technical credit"
    text: "Credit"
    bodyUrl: "/huviz/docs/credits.md"
  ,
    id: 'tutorial'
    cssClass: "tabs-tutor scrolling_tab"
    title: "A tutorial"
    text: "Tutorial"
    bodyUrl: "/huviz/docs/tutorial.md"
  ,
    id: 'sparqlQueries'
    cssClass: "tabs-sparqlQueries scrolling_tab"
    title: "SPARQL Queries"
    text: "Q"
  ]

  get_default_tab: (id) ->
    for tab in @default_tab_specs
      if tab.id is id
        return tab
    return {
      id: id
      title: id
      cssClass: id
      text: id}

  make_tabs_html: ->
    # The firstClass in cssClass acts like a re-entrant identifier for these
    # tabs. Each also gets a unique id.
    # Purpose:
    #   Programmatically build the equivalent of views/tabs/all.ejs but with
    #   unique ids for the divs
    # Notes:
    #   When @args.use_old_tabs_ids is true this method reproduces all.ejs exactly.
    #   Otherwise it gives each div a unique id
    #   Either way @oldToUniqueTabSel provides a way to select each tab using
    #       the old non-reentrant ids like 'tabs-intro'
    # Arguments:
    #   cssClass becomes the value of the class attribute of the div
    #   title becomes the title attribute of the tab
    #   text becomes the visible label of the tab
    #   moveSelector: (optional) the selector of content to move into the div
    #   bodyUrl: (optional) is the url of content to insert into the div
    #       (if it ends with .md the markdown is rendered)
    # Motivation:
    #   The problem this is working to solve is that we want HuViz to
    #   be re-entrant (ie more than one instance per page) but it was
    #   originally written without that in mind, using unique ids such
    #   as #tabs-intro liberally.  This method provides a way to
    #   programmatically build the tabs with truly unique ids but also
    #   with a way to learn what those ids are using the old
    #   identifiers.  To finish the task of transforming the code to
    #   be re-entrant we must:
    #     1) find all the places which use ids such as "#gclui" or
    #        "#tabs-history" and get them to use @oldToUniqueTabSel
    #        as a lookup for the new ids.
    #     2) rebuild the CSS to use class names such as ".gclui" rather
    #        than the old ids such as "#gclui"
    jQElem_list = [] # a list of args for the command @make_JQElem()
    theTabs = """<ul class="the-tabs">"""
    theDivs = ""
    tab_specs = @args.tab_specs
    for t in tab_specs
      if typeof(t) is 'string'
        t = @get_default_tab(t)
      firstClass = t.cssClass.split(' ')[0]
      firstClass_ = firstClass.replace(/\-/, '_')
      id = @unique_id(firstClass + '_')
      @tabs_class_to_id[firstClass] = id
      if @args.use_old_tab_ids
        id = firstClass
      idSel = '#' + id
      @oldToUniqueTabSel[firstClass] = idSel
      theTabs += """<li><a href="#{idSel}" title="#{t.title}">#{t.text}</a></li>"""
      theDivs += """<div id="#{id}" class="#{t.cssClass}">#{t.kids or ''}</div>"""
      if not marked?
        console.info('marked does not exist yet')
      if t.bodyUrl?
        @withUriDo(t.bodyUrl, idSel)
      if t.moveSelector?
        mkcb = (fromSel, toSel) => # make closure
          return () => @moveSelToSel(fromSel, toSel)
        setTimeout(mkcb(t.moveSelector, idSel), 30)
      jQElem_list.push([firstClass_, idSel]) # queue up args for execution by @make_JQElem()
    theTabs += "</ul>"
    @tabs_id = @unique_id('tabs_')
    html = [
      """<section id="#{@tabs_id}" class="huviz_tabs" role="controls">""",
      theTabs, theDivs,
      "</section>"].join('')
    return [html, jQElem_list]

  moveSelToSel: (moveSel, targetSel) ->
    if not (moveElem = document.querySelector(moveSel))
      console.warn("moveSelector() failed to find moveSel: '#{ moveSel}'")
      return
    if not (targetElem = document.querySelector(targetSel))
      console.warn("moveSelector() failed to find targetSel: '#{ targetSel}'")
      return
    targetElem.appendChild(moveElem)
    return

  withUriDo: (url, sel, processor) ->
    xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = (e) =>
      if xhr.readyState is 4
        if xhr.status is 200
          processor ?= (url.endsWith('.md') and marked) or ident
          @renderIntoWith(xhr.responseText, sel, processor)
        else
          console.error(xhr.statusText)
    xhr.onerror = (e) ->
      console.error(xhr.statusText)
    xhr.send(null)

  renderIntoWith: (data, sel, processor) ->
    elem = document.querySelector(sel)
    if not elem
      return
    if processor?
      elem.innerHTML = processor(data)
    else
      elem.innerHTML = data
    return

  insertBeforeEnd: (elem, html) ->
    position = 'beforeend'
    elem.insertAdjacentHTML(position, html)
    return elem.lastElementChild  # note, this only works right if html has one outer elem

  create_tabs: ->
    @tabs_class_to_id = {}
    if not @args.tab_specs
      return
    # create <section id="tabs"...> programmatically, making unique ids along the way
    elem = document.querySelector(@args.create_tabs_adjacent_to_selector)
    [html, jQElem_list] = @make_tabs_html()
    @addHTML(html)
    for pair in jQElem_list
      contentAreaJQElem = @make_JQElem(pair[0], pair[1]) # make things like @tab_options_JQElem
      tabKey = 'tab_for_' + pair[0]
      tabSel = 'li [href="#' + contentAreaJQElem[0].id + '"]'
      @make_JQElem(tabKey, tabSel) # make things like @tab_for_tab_options_JQElem
    return

  ensureTopElem: ->
    if not document.querySelector(@args.huviz_top_sel)
      body = document.querySelector("body")
      id = sel_to_id(@args.huviz_top_sel)
      classes = 'huviz_top'
      @addDivWithIDAndClasses(id, classes, body)
      #@insertBeforeEnd(body, """<div id="#{@args.huviz_top_sel}"></div>""")
    @topElem = document.querySelector(@args.huviz_top_sel)
    @topJQElem = $(@topElem)
    return

  get_picker_style_context_selector: ->
    # The selector of the context which the picker's colors are constrained to.
    # What?  To keep the colors which any ColorTreePickers create confined to
    # this particular HuViz instance.
    return @args.huviz_top_sel

  addHTML: (html) ->
    return @insertBeforeEnd(@topElem, html)

  addDivWithIdAndClasses: (id, classes, specialElem) ->
    html = """<div id="#{sel_to_id(id)}" class="#{classes}"></div>"""
    if specialElem
      return @insertBeforeEnd(specialElem, html)
    else
      return @addHTML(html)

  ensure_divs: ->
    # find the unique id for things like viscanvas and make div if missing
    for key in @needed_divs
      key_sel = key + '_sel'
      if (sel = @args[key_sel])
        id = sel_to_id(sel)
        classes = key
        if not (elem = document.querySelector(sel))
          specialParentElem = null # indicates the huviz_top div
          if (specialParent = @div_has_special_parent[key])
            specialParentSelKey = specialParent + '_sel'
            if (specialParentSel = @args[specialParentSelKey]) or
                  (specialParentSel = @oldToUniqueTabSel[specialParent])
              specialParentElem = document.querySelector(specialParentSel)
          @addDivWithIdAndClasses(id, classes, specialParentElem)
    return

  make_JQElem: (key, sel) ->
    jqelem_id = key + '_JQElem'
    found = $(sel)
    if found.length > 0
      this[jqelem_id] = found
    else
      throw new Error(sel + ' not found')
    return found

  make_JQElems: ->
    # Make jQuery elems like @viscanvas_JQElem and performance_dashboard_JQElem
    for key in @needed_JQElems
      if (sel = @args[key + '_sel'])
        @make_JQElem(key, sel)
    return

  # TODO create default_args from needed_divs (or something)
  make_default_args: ->
    # these must be made on the fly for reentrancy
    return {
      add_to_HVZ: true
      ctrl_handle_sel: unique_id('#ctrl_handle_')
      gclui_sel: unique_id('#gclui_')
      git_base_url: "https://github.com/smurp/huviz/commit/"
      hide_fullscreen_button: false
      huviz_top_sel: unique_id('#huviz_top_') # if not provided then create
      make_pickers: true
      performance_dashboard_sel: unique_id('#performance_dashboard_')
      settings: {}
      show_edit: false
      show_tabs: true
      skip_log_tick: true
      state_msg_box_sel: unique_id('#state_msg_box_')
      status_sel: unique_id('#status_')
      stay_square: false
      tab_specs: ['commands','settings','history'] # things break if these are not present
      tabs_minWidth: 300
      use_old_tab_ids: false
      viscanvas_sel: unique_id('#viscanvas_')
      vissvg_sel: unique_id('#vissvg_')}

  # The div on the left should be placed in the div on the right
  # The div on the left should appear in needed_divs.
  # The div on right should be identified by a tab id like 'huvis_controls'
  #                                    or by a div id like 'viscanvas'
  # Divs which do not have a 'special_parent' get plunked in the @topElem
  div_has_special_parent:
    gclui: 'huvis_controls'

  needed_divs: [
    'gclui'
    'performance_dashboard'
    'state_msg_box'
    'status'
    'viscanvas'
    'vissvg'
    ]

  needed_JQElems: [
    'gclui'
    'performance_dashboard'
    'viscanvas'
    'huviz_controls'
    ]

  calculate_args: (incoming_args) ->
    # overlay incoming over defaults to make the composition
    incoming_args ?= {}
    if not incoming_args.huviz_top_sel
      console.warn('you have not provided a value for huviz_top_sel so it will be appended to BODY')
    args = @compose_object_from_defaults_and_incoming(@make_default_args(), incoming_args)
    # calculate some args from others
    args.create_tabs_adjacent_to_selector ?= args.huviz_top_sel
    return args

  constructor: (incoming_args) -> # Huviz
    @oldToUniqueTabSel = {}
    #if @show_performance_monitor is true
    #  @pfm_dashboard()
    @git_commit_hash = window.HUVIZ_GIT_COMMIT_HASH
    @args = @calculate_args(incoming_args)
    @ensureTopElem()
    if @args.create_tabs_adjacent_to_selector
      @create_tabs()
    @tabsJQElem = $('#' + @tabs_id)
    if not @args.show_tabs
      @collapse_tabs()
    @replace_human_term_spans(@tabs_id)
    if @args.add_to_HVZ
      if not window.HVZ?
        window.HVZ = []
      window.HVZ.push(this)

    # FIXME Simplify this whole settings_sel and 'settings' thing
    #       The settings should just be built right on settings_JQElem
    @args.settings_sel ?= @oldToUniqueTabSel['settings']

    @create_blurtbox()
    @ensure_divs()
    @make_JQElems()
    @create_collapse_expand_handles()
    if not @args.hide_fullscreen_button
      @create_fullscreen_handle()
    @init_ontology()
    @create_caption()
    @off_center = false # FIXME expose this or make the amount a slider
    document.addEventListener('nextsubject', @onnextsubject)
    @init_snippet_box()  # FIXME not sure this does much useful anymore

    @mousedown_point = false
    @discard_point = [@cx,@cy] # FIXME refactor so ctrl_handle handles this
    @lariat_center = [@cx,@cy] #       and this....
    @node_radius_policy = node_radius_policies[default_node_radius_policy]
    @currently_printed_snippets = {}
    @fill = d3.scale.category20()
    @force = d3.layout.force().
             size([@width,@height]).
             nodes([]).
             linkDistance(@link_distance).
             charge(@get_charge).
             gravity(@gravity).
             on("tick", @tick)
    @update_fisheye()
    @svg = d3.select(@args.vissvg_sel).
              append("svg").
              attr("width", @width).
              attr("height", @height).
              attr("position", "absolute")
    @svg.append("rect").attr("width", @width).attr("height", @height)
    @container = d3.select(@args.viscanvas_sel).node().parentNode
    @init_settings_to_defaults()
    @adjust_settings_from_kv_list(@args.settings)
    if @use_fancy_cursor
      @text_cursor = new TextCursor(@args.viscanvas_sel, "")
      @install_update_pointer_togglers()
    @create_state_msg_box()
    @viscanvas = d3.select(@args.viscanvas_sel).html("").
      append("canvas").
      attr("width", @width).
      attr("height", @height)
    @canvas = @viscanvas[0][0]
    @mouse_receiver = @viscanvas
    @reset_graph()
    @updateWindow()
    @ctx = @canvas.getContext("2d")
    #console.log @ctx
    @mouse_receiver
      .on("mousemove", @mousemove)
      .on("mousedown", @mousedown)
      .on("mouseup", @mouseup)
      .on("contextmenu", @mouseright)
      #.on("mouseout", @mouseup) # FIXME what *should* happen on mouseout?

    @restart()
    @set_search_regex("")
    search_input = document.getElementById('search')
    if search_input
      search_input.addEventListener("input", @update_searchterm)
    window.addEventListener("resize", @updateWindow)
    @tabsJQElem.on("resize", @updateWindow)
    $(@viscanvas).bind("_splitpaneparentresize", @updateWindow)
    @tabsJQElem.tabs({active: 0})
    @maybe_demo_round_img()

  maybe_demo_round_img: ->
    if not (@args.demo_round_img)
      return
    try
      roundImage = @get_or_create_round_img(@args.demo_round_img)
      roundImage.id = @unique_id('sample_round_img_')
      @tabsJQElem.append(roundImage)
      $('#'+roundImage.id).attr("style","background-color:black")
    catch e
      console.warn("url:", @args.demo_round_img)
      console.debug(e)
    return

  create_blurtbox: ->
    blurtbox_id = @unique_id('blurtbox_')
    tabsElem = document.querySelector('#'+@tabs_id)
    html = """<div id="#{blurtbox_id}" class="blurtbox"></div>"""
    @blurtbox_JQElem = $(@insertBeforeEnd(tabsElem, html))
    return

  blurt: (str, type, noButton) =>
    #css styles for messages: info (blue), alert (yellow), error (red)
    # TODO There is currently no way for users to remove blurt boxes

    #type='info' if !type
    if type is "info" then label = "<h3>Message</h3>"
    if type is "alert" then label = "<h3>Alert</h3>"
    if type is "error" then label = "<h3>Error</h3>"
    if not type then label = ''
    @blurtbox_JQElem.append("<div class='blurt #{type}'>#{label}#{str}<br class='clear'></div>")
    @blurtbox_JQElem.scrollTop(10000)
    if not noButton and not @close_blurtbox_button
      @close_blurtbox_button = @blurtbox_JQElem.prepend("<button id='blurt_close' class='sml_bttn' type='button'>close</button>")
      @close_blurtbox_button.on('click', @close_blurt_box)
    return

  close_blurt_box: () =>
    delete @close_blurtbox_button
    @blurtbox_JQElem.html('')


  ##### ------------------- fullscreen stuff ---------------- ########
  create_fullscreen_handle: ->
    fs = """<div class="full_screen" style="position:absolute;z-index:999"><i class="fa fa-arrows-alt"></i></div>"""
    @topJQElem.prepend(fs)
    @fullscreenJQElem = @topJQElem.find(".full_screen")
    @fullscreenJQElem.click(@fullscreen)
    return

  fullscreen: =>
    # https://developer.mozilla.org/en-US/docs/Web/API/Document/exitFullscreen
    if (document.fullscreenElement)
      document.exitFullscreen()
    else
      @topElem.requestFullscreen()

  ##### ------------------- collapse/expand stuff ---------------- ########

  collapse_tabs: () =>
    @tabsJQElem.prop('style','visibility:hidden;width:0')
    @tabsJQElem.find('.expand_cntrl').prop('style','visibility:visible')
    @tabsJQElem.find('.the-tabs').prop('style','display:none')
    @tabsJQElem.find('.tabs-intro').prop('style','display:none')
    #@expandCtrlJQElem.show() # why does this not work instead of the above?

  expand_tabs: () =>
    @tabsJQElem.prop('style','visibility:visible')
    #@tabsJQElem.find('.expand_cntrl').prop('style','visibility:hidden')
    @tabsJQElem.find('.the-tabs').prop('style','display:inherit')
    @tabsJQElem.find('.tabs-intro').prop('style','display:inherit')
    @expandCtrlJQElem.hide()
    @collapseCtrlJQElem.show()

  create_collapse_expand_handles: ->
    ctrl_handle_id = sel_to_id(@args.ctrl_handle_sel)
    html = """
      <div class="expand_cntrl" style="visibility:hidden">
        <i class="fa fa-angle-double-left"></i></div>
      <div class="collapse_cntrl">
        <i class="fa fa-angle-double-right"></i></div>
      <div id="#{ctrl_handle_id}"
           class="ctrl_handle ui-resizable-handle ui-resizable-w">
         <div class="ctrl_handle_grip">o</div>
      </div>
    """ # """ this comment is to help emacs coffeescript mode
    @tabsJQElem.prepend(html)
    @expandCtrlJQElem = @tabsJQElem.find(".expand_cntrl")
    @expandCtrlJQElem.click(@expand_tabs).on("click", @updateWindow)
    @collapseCtrlJQElem = @tabsJQElem.find(".collapse_cntrl")
    @collapseCtrlJQElem.click(@collapse_tabs).on("click", @updateWindow)
    @tabsJQElem.resizable
        handles: {'w':@args.ctrl_handle_sel}
        minWidth: @args.tabs_minWidth
    return

  #### ---------------------  Utilities ---------------------------- #######

  goto_tab: (tab_idx) ->
    @tabsJQElem.tabs(
      active: tab_idx
      collapsible: true)
    return

  update_fisheye: ->
    #@label_show_range = @link_distance * 1.1
    @label_show_range = 30 * 1.1 #TODO Fixed value or variable like original? (above)
    #@fisheye_radius = @label_show_range * 5
    @focus_radius = @label_show_range
    @fisheye = d3.fisheye.
      circular().
      radius(@fisheye_radius).
      distortion(@fisheye_zoom)
    @force.linkDistance(@link_distance).gravity(@gravity)
    if not @args.skip_log_tick
      console.log("Tick in @force.linkDistance... update_fisheye")

  replace_human_term_spans: (optional_class) ->
    optional_class = optional_class or 'a_human_term'
    #if console and console.info
    #  console.info("doing addClass('#{optional_class}') on all occurrences of CSS class human_term__*")
    for canonical, human of @human_term
      selector = '.human_term__' + canonical
      #console.log("replacing '#{canonical}' with '#{human}' in #{selector}")
      $(selector).text(human).addClass(optional_class) #.style('color','red')

  human_term:
    all: 'ALL'
    chosen: 'CHOSEN'
    unchosen: 'UNCHOSEN'
    selected: 'SELECTED'
    shelved: 'SHELVED'
    discarded: 'DISCARDED'
    hidden: 'HIDDEN'
    graphed: 'GRAPHED'
    fixed: 'PINNED'
    labelled: 'LABELLED'
    choose: 'CHOOSE'
    unchoose: 'UNCHOOSE'
    select: 'SELECT'
    unselect: 'UNSELECT'
    label: 'LABEL'
    unlabel: 'UNLABEL'
    shelve: 'SHELVE'
    hide: 'HIDE'
    discard: 'DISCARD'
    undiscard: 'RETRIEVE'
    pin: 'PIN'
    unpin: 'UNPIN'
    unpinned: 'UNPINNED'
    nameless: 'NAMELESS'
    blank_verb: 'VERB'
    blank_noun: 'SET/SELECTION'
    hunt: 'HUNT'
    walk: 'WALK'
    walked: 'WALKED'
    wander: 'WANDER'
    draw: 'DRAW'
    undraw: 'UNDRAW'
    connect: 'CONNECT'
    spawn: 'SPAWN'
    specialize: 'SPECIALIZE'
    annotate: 'ANNOTATE'

  # TODO add controls
  #   selected_border_thickness
  #   show_cosmetic_tabs
  default_settings: [
      reset_settings_to_default:
        text: "Reset Settings"
        label:
          title: "Reset all settings to their defaults"
        input:
          type: "button"
          label: "Reset"
    ,
      use_accordion_for_settings:
        text: "show Settings in accordion"
        label:
          title: "Show the Settings Groups as an 'Accordion'"
        input:
          #checked: "checked"
          type: "checkbox"
        #style: "display:none"
    ,
      show_cosmetic_tabs:
        text: "Show Cosmetic Tabs"
        label:
          title: "Expose the merely informational tabs such as 'Intro' and 'Credits'"
        input:
          type: "checkbox"
          checked: "checked"
    ,
      focused_mag:
        group: "Labels"
        text: "focused label mag"
        input:
          value: 1.4
          min: 1
          max: 3
          step: .1
          type: 'range'
        label:
          title: "the amount bigger than a normal label the currently focused one is"
    ,
      selected_mag:
        group: "Labels"
        text: "selected node mag"
        input:
          value: 1.5
          min: 0.5
          max: 4
          step: .1
          type: 'range'
        label:
          title: "the amount bigger than a normal node the currently selected ones are"
    ,
      label_em:
        group: "Labels"
        text: "label size (em)"
        label:
          title: "the size of the font"
        input:
          value: .9
          min: .1
          max: 4
          step: .05
          type: 'range'
    ,
      #snippet_body_em:
      #  text: "snippet body (em)"
      #  label:
      #    title: "the size of the snippet text"
      #  input:
      #    value: .7
      #    min: .2
      #    max: 4
      #    step: .1
      #    type: "range"
    #,
      charge:
        group: "Layout"
        text: "charge (-)"
        label:
          title: "the repulsive charge betweeen nodes"
        input:
          value: -210
          min: -600
          max: -1
          step: 1
          type: "range"
    ,
      gravity:
        group: "Layout"
        text: "gravity"
        label:
          title: "the attractive force keeping nodes centered"
        input:
          value: 0.50
          min: 0
          max: 1
          step: 0.025
          type: "range"
    ,
      shelf_radius:
        group: "Sizing"
        text: "shelf radius"
        label:
          title: "how big the shelf is"
        input:
          value: 0.8
          min: 0.1
          max: 3
          step: 0.05
          type: "range"
    ,
      fisheye_zoom:
        group: "Sizing"
        text: "fisheye zoom"
        label:
          title: "how much magnification happens"
        input:
          value: 6.0
          min: 1
          max: 20
          step: 0.2
          type: "range"
    ,
      fisheye_radius:
        group: "Sizing"
        text: "fisheye radius"
        label:
          title: "how big the fisheye is"
        input:
          value: 300
          min: 0
          max: 2000
          step: 20
          type: "range"
    ,
      node_radius:
        group: "Sizing"
        text: "node radius"
        label:
          title: "how fat the nodes are"
        input:
          value: 3
          min: 0.5
          max: 50
          step: 0.1
          type: "range"
    ,
      node_diff:
        group: "Sizing"
        text: "node differentiation"
        label:
          title: "size variance for node edge count"
        input:
          value: 1
          min: 0
          max: 10
          step: 0.1
          type: "range"
    ,
      focus_threshold:
        group: "Sizing"
        text: "focus threshold"
        label:
          title: "how fine is node recognition"
        input:
          value: 20
          min: 10
          max: 150
          step: 1
          type: "range"
    ,
      link_distance:
        group: "Layout"
        text: "link distance"
        label:
          title: "how long the lines are"
        input:
          value: 29
          min: 5
          max: 500
          step: 2
          type: "range"
    ,
      edge_width:
        group: "Sizing"
        text: "line thickness"
        label:
          title: "how thick the lines are"
        input:
          value: 0.2
          min: 0.2
          max: 10
          step: .2
          type: "range"
    ,
      line_edge_weight:
        group: "Sizing"
        text: "line edge weight"
        label:
          title: "how much thicker lines become to indicate the number of snippets"
        input:
          value: 0.45
          min: 0
          max: 1
          step: 0.01
          type: "range"
    ,
      swayfrac:
        group: "Sizing"
        text: "sway fraction"
        label:
          title: "how much curvature lines have"
        input:
          value: 0.22
          min: -1.0
          max: 1.0
          step: 0.01
          type: "range"
    ,
      label_graphed:
        group: "Labels"
        text: "label graphed nodes"
        style: "display:none"
        label:
          title: "whether graphed nodes are always labelled"
        input:
          #checked: "checked"
          type: "checkbox"
    ,
      truncate_labels_to:
        group: "Labels"
        text: "truncate and scroll"
        label:
          title: "truncate and scroll labels longer than this, or zero to disable"
        input:
          value: 0 # 40
          min: 0
          max: 60
          step: 1
          type: "range"
    ,
      snippet_count_on_edge_labels:
        group: "Labels"
        text: "snippet count on edge labels"
        label:
          title: "whether edges have their snippet count shown as (#)"
        input:
          #checked: "checked"
          type: "checkbox"
    ,
      nodes_pinnable:
        style: "display:none"
        text: "nodes pinnable"
        label:
          title: "whether repositioning already graphed nodes pins them at the new spot"
        input:
          checked: "checked"
          type: "checkbox"
    ,
      use_fancy_cursor:
        style: "display:none"
        text: "use fancy cursor"
        label:
          title: "use custom cursor"
        input:
          checked: "checked"
          type: "checkbox"
    ,
      doit_asap:
        style: "display:none"
        text: "DoIt ASAP"
        label:
          title: "execute commands as soon as they are complete"
        input:
          checked: "checked" # default to 'on'
          type: "checkbox"
    ,
      show_dangerous_datasets:
        style: "display:none"
        text: "Show dangerous datasets"
        label:
          title: "Show the datasets which are too large or buggy"
        input:
          type: "checkbox"
    ,
      pill_display:
        group: "Labels"
        text: "Display graph with boxed labels"
        label:
          title: "Show boxed labels on graph"
        input:
          type: "checkbox"
          #checked: "checked"
    ,
      theme_colors:
        group: "Styling"
        text: "Display graph with dark theme"
        label:
          title: "Show graph plotted on a black background"
        input:
          type: "checkbox"
    ,
      paint_label_dropshadows:
        group: "Styling"
        text: "Draw drop-shadows behind labels"
        label:
          title: "Make labels more visible when overlapping"
        input:
          type: "checkbox"
          checked: "checked"
    ,
      display_shelf_clockwise:
        group: "Styling"
        text: "Display nodes clockwise"
        label:
          title: "Display clockwise (uncheck for counter-clockwise)"
        input:
          type: "checkbox"
          checked: "checked"
    ,
      choose_node_display_angle:
        group: "Styling"
        text: "Node display angle"
        label:
          title: "Where on shelf to place first node"
        input:
          value: 0.5
          min: 0
          max: 1
          step: 0.25
          type: "range"
    ,
      language_path:
        group: "Ontological"
        text: "Language Path"
        label:
          title: """Using ':' as separator and with ANY and NOLANG as possible values,
            a list of the languages to expose, in order of preference.
            Examples: "en:fr" means show English before French or nothing;
            "ANY:en" means show any language before showing English;
            "en:ANY:NOLANG" means show English if available, then any other
            language, then finally labels in no declared language.
            """
        input:
          type: "text"
          # TODO tidy up -- use browser default language then English
          value: (window.navigator.language.substr(0,2) + ":en:ANY:NOLANG").replace("en:en:","en:")
          size: "16"
          placeholder: "en:es:fr:de:ANY:NOLANG"
    ,
      ontological_settings_preamble:
        group: "Ontological"
        text: "Set before data ingestion..."
        label:
          title: """The following settings must be adjusted before
            data ingestion for them to take effect."""
    ,
      show_class_instance_edges:
        group: "Ontological"
        text: "Show class-instance relationships"
        label:
          title: "display the class-instance relationship as an edge"
        input:
          type: "checkbox"
          #checked: "checked"
    ,
      make_nodes_for_literals:
        group: "Ontological"
        text: "Make nodes for literals"
        label:
          title: "show literal values (dates, strings, numbers) as nodes"
        input:
          type: "checkbox"
          checked: "checked"
        event_type: "change"
    ,
      group_literals_by_subj_and_pred:
        group: "Ontological"
        text: "Group literals by subject & predicate"
        label:
          title: """Group literals together as a single node when they have
          a language indicated and they share a subject and predicate, on the
          theory that they are different language versions of the same text."""
        input:
          type: "checkbox"
          checked: "checked"
    ,
      color_nodes_as_pies:
        group: "Ontological"
        text: "Color nodes as pies"
        label:
          title: """Show all a nodes types as colored pie pieces."""
        input:
          type: "checkbox"   #checked: "checked"
    ,
      show_hide_endpoint_loading:
        style: "display:none"
        class: "alpha_feature"
        text: "Show SPARQL endpoint loading forms"
        label:
          title: "Show SPARQL endpoint interface for querying for nodes"
        input:
          type: "checkbox"
    ,
      graph_title_style:
        group: "Captions"
        text: "Title display "
        label:
          title: "Select graph title style"
        input:
          type: "select"
        options : [
            label: "Watermark"
            value: "subliminal"
            selected: true
          ,
            label: "Bold Titles 1"
            value: "bold1"
          ,
            label: "Bold Titles 2"
            value: "bold2"
          ,
            label: "Custom Captions"
            value: "custom"
        ]
    ,
      graph_custom_main_title:
        group: "Captions"
        style: "display:none"
        text: "Custom Title"
        label:
          title: "Title that appears on the graph background"
        input:
          type: "text"
          size: "16"
          placeholder: "Enter Title"
    ,
      graph_custom_sub_title:
        group: "Captions"
        style: "display:none"
        text: "Custom Sub-title"
        label:
          title: "Sub-title that appears below main title"
        input:
          type: "text"
          size: "16"
          placeholder: "Enter Sub-title"
    ,
      discover_geonames_as:
        group: "Geonames"
        html_text: '<a href="http://www.geonames.org/login" target="geonamesAcct">Username</a> '
        label:
          title: "The GeoNames Username to look up geonames as"
        input:
          jsWidgetClass: GeoUserNameWidget
          type: "text"
          value: "huviz"  # "smurp_nooron"
          size: "14"
          placeholder: "e.g. huviz"
    ,
      discover_geonames_remaining:
        group: "Geonames"
        text: 'GeoNames Limit '
        label:
          title: "The number of Remaining Geonames to look up"
        input:
          type: "integer"
          value: 20
          size: 6
    ,
      discover_geonames_greedily:
        group: "Geonames"
        text: "Capture GeoNames Greedily"
        label:
          title: "Capture not just names but populations too."
        input:
          type: "checkbox"
          #checked: "checked"
    ,
      discover_geonames_deeply:
        group: "Geonames"
        text: "Capture GeoNames Deeply"
        label:
          title: "Capture not just directly referenced but also the containing geographical places from GeoNames."
        input:
          type: "checkbox"
          #checked: "checked"
    ,
      show_edge_labels_adjacent_to_labelled_nodes:
        group: "Labels"
        text: "Show adjacent edge labels"
        label:
          title: "Show edge labels adjacent to labelled nodes"
        input:
          type: "checkbox"
          checked: "checked"
    ,
      show_edges:
        class: "alpha_feature"
        text: "Show Edges"
        label:
          title: "Do draw edges"
        input:
          type: "checkbox"
          checked: "checked"
    ,
      center_the_distinguished_node:
        class: "alpha_feature"
        text: "Center the distinguished node"
        label:
          title: "Center the most interesting node"
        input:
          type: "checkbox"
          checked: "checked"
    ,
      arrows_chosen:
        class: "alpha_feature"
        text: "Arrowheads on Edges"
        label:
          title: "Displays directional arrowheads on the 'object' end of lines."
        input:
          type: "checkbox"
          checked: "checked"
    ,
      show_images_in_nodes:
        group: "Images"
        class: "alpha_feature"
        text: "Show Images in Nodes"
        label:
          title: "Show dbpedia:thumbnail and foaf:thumbnail in nodes when available"
        input:
          type: "checkbox"
          checked: "checked"
    ,
      show_thumbs_dont_graph:
        group: "Images"
        class: "alpha_feature"
        text: "Show thumbnails, don't graph"
        label:
          title: "Treat dbpedia:thumbnail and foaf:thumbnail as images, not graph data"
        input:
          type: "checkbox"
          checked: "checked"
    ,
      show_queries_tab:
        group: "SPARQL"
        class: "alpha_feature"
        text: "Show Queries Tab"
        label:
          title: "Expose the 'Queries' tab to be able to monitor and debug SPARQL queries"
        input:
          type: "checkbox"
          #checked: "checked"
    ,
      max_outstanding_sparql_requests:
        group: "SPARQL"
        class: "alpha_feature"
        text: "Max. Outstanding Requests"
        label:
          title: "Cap on the number of simultaneous SPARQL requests"
        input:
          value: 20
          min: 1
          max: 100
          step: 1
          type: "range"
    ,
      sparql_timeout:
        group: "SPARQL"
        class: "alpha_feature"
        text: "Query timeout"
        label:
          title: "Number of seconds to run SPARQL queries before giving up."
        input:
          value: 45
          min: 1
          max: 90
          step: 1
          type: "range"
    ,
      sparql_query_default_limit:
        group: "SPARQL"
        class: "alpha_feature"
        text: "Default Node Limit"
        label:
          title: "Default value for the 'Node Limit'"
        input:
          value: 200
          min: 1
          max: 1000
          step: 10
          type: "range"
    ,
      debug_shelf_angles_and_flipping:
        group: "Debugging"
        class: "alpha_feature"
        text: "debug shelf angles and flipping"
        label:
          title: "show angles and flags with labels"
        input:
          type: "checkbox"   #checked: "checked"
    ,
      show_performance_monitor:
        group: "Debugging"
        class: "alpha_feature"
        text: "Show Performance Monitor"
        label:
          title: "Feedback on what HuViz is doing"
        input:
          type: "checkbox"
          #checked: "checked"
    ,
      slow_it_down:
        group: "Debugging"
        class: "alpha_feature"
        text: "Slow it down (sec)"
        label:
          title: "execute commands with wait states to simulate long operations"
        input:
          value: 0
          min: 0
          max: 10
          step: 0.1
          type: "range"
    ,
      show_hunt_verb:
        group: "Debugging"
        class: "alpha_feature"
        text: "Show Hunt verb"
        label:
          title: "Expose the 'Hunt' verb, for demonstration of SortedSet.binary_search()"
        input:
          type: "checkbox"
          #checked: "checked"
    ]

  auto_adjust_settings: ->
    # Try to tune the gravity, charge and link length to suit the data and the canvas size.
    return @

  make_settings_group: (groupName) ->
    return @insertBeforeEnd(@settingGroupsContainerElem, """<h1>#{groupName}</h1><div class="settingsGroup"></div>""")

  get_or_create_settings_group: (groupName) ->
    groupId = synthIdFor(groupName)
    @settings_groups ?= {}
    group = @settings_groups[groupName]
    if not group
      @settings_groups[groupName] = group = @make_settings_group(groupName)
    return group

  init_settings_to_defaults: =>
    # TODO rebuild this method without D3 using @settingsElem
    @settingsElem = document.querySelector(@args.settings_sel)
    settings_input_sel = @args.settings_sel + ' input'
    @settings_cursor = new TextCursor(settings_input_sel, "")
    if @settings_cursor
      $(settings_input_sel).on("mouseover", @update_settings_cursor)
      #$("input").on("mouseenter", @update_settings_cursor)
      #$("input").on("mousemove", @update_settings_cursor)
    @settings = d3.select(@settingsElem)
    @settings.classed('settings',true)
    @settingGroupsContainerElem = @insertBeforeEnd(@settingsElem, '<div class="settingGroupsContainer"></div>')
    for control_spec in @default_settings
      for control_name, control of control_spec
        inputId = unique_id(control_name+'_')
        groupName = control.group or 'General'
        groupElem = @get_or_create_settings_group(groupName)
        controlElem = @insertBeforeEnd(groupElem, """<div class="a_setting #{control_name}__setting"></div>""")
        labelElem = @insertBeforeEnd(controlElem, """<label for="#{inputId}"></label>""")
        if control.text?
          labelElem.innerHTML = control.text
        if control.html_text?
          labelElem.innerHTML = control.html_text
        if control.style?
          controlElem.setAttribute('style', control.style)
        if control.class?
          #graph_control.attr('class', 'graph_control ' + control.class)
          #controlElem.addAttribute('class', control.class)
          controlElem.classList.add(control.class)
        if control.input?
          if control.input.type is 'select'
            inputElem = @insertBeforeEnd(controlElem, """<select></select>""")
            for optIdx, opt of control.options
              optionElem = @insertBeforeEnd(inputElem, """<option value="#{opt.value}"></option>""")
              if opt.selected
                optionElem.setAttribute('selected','selected')
              if opt.label?
                optionElem.innerHTML = opt.label
          else if control.input.type is 'button'
            #console.log "construct button: #{control.input.label}"
            inputElem = @insertBeforeEnd(controlElem, """<button type="button">(should set label)</button>""")
            if control.input.label?
              inputElem.innerHTML = control.input.label
            if control.input.style?
              inputElem.setAttribute('style', control.input.style)
          else
            inputElem = @insertBeforeEnd(controlElem, """<input name="#{control_name}"></input>""")
            WidgetClass = null
            for k,v of control.input
              if k is 'jsWidgetClass'
                WidgetClass = v
                continue
              if k is 'value'
                old_val = @[control_name]
                @change_setting_to_from(control_name, v, old_val)
              inputElem.setAttribute(k, v)
            if WidgetClass
              @[control_name + '__widget'] = new WidgetClass(this, inputElem)
            if control.input.type is 'checkbox'
              value = control.input.checked?
              @change_setting_to_from(control_name, value, undefined) #@[control_name].checked)
            # TODO replace control.event_type with autodetecting on_change_ vs on_update_ method existence
          inputElem.setAttribute('id', inputId)
          inputElem.setAttribute('name', control_name)
          event_type = control.event_type or
              (control.input.type in ['checkbox','range','radio'] and 'input') or
              'change'

          if event_type is 'change'
            # These controls only update when enter is pressed or the focus changes.
            # Good for things like text fields which might not make sense until the user is 'done'.
            #input.on("change", @update_graph_settings)
            inputElem.addEventListener('change', @change_graph_settings)
          else
            # These controls get continuously updated.
            # Good for range sliders, radiobuttons and checkboxes.
            # This can be forced by setting the .event_type on the control_spec explicitly.
            #input.on("input", @update_graph_settings) # continuous updates
            inputElem.addEventListener('input', @update_graph_settings)
          if control.input.type is 'button'
            inputElem.addEventListener('click', @update_graph_settings)

        if control.label.title?
          @insertBeforeEnd(controlElem, '<div class="setting_explanation">' + control.label.title + '</div>')
    #$(@settingGroupsContainerElem).accordion()
    #@insertBeforeEnd(@settingsElem, """<div class="buffer_space"></div>""")
    return

  update_settings_cursor: (evt) =>
    cursor_text = (evt.target.value).toString()
    if !cursor_text
      console.debug(cursor_text)
    else
      console.log(cursor_text)
    @settings_cursor.set_text(cursor_text)

  update_graph_settings: (event) =>
    @change_graph_settings(event, true)

  change_graph_settings: (event, update) =>
    target = event.target
    update ?= false
    if target.type is "checkbox"
      cooked_value = target.checked
    else if target.type is "range" # must massage into something useful
      asNum = parseFloat(target.value)
      cooked_value = ('' + asNum) isnt 'NaN' and asNum or target.value
    else
      cooked_value = target.value
    old_value = @[target.name]
    @change_setting_to_from(target.name, cooked_value, old_value)
    #d3.select(target).attr("title", cooked_value)
    if update  # TODO be more discriminating, not all settings require update
               #   ones that do: charge, gravity, fisheye_zoom, fisheye_radius
      @update_fisheye()
      @updateWindow()
    @tick("Tick in update_graph_settings")

  # ## Settings ##
  #
  # ### Nomenclature ###
  #
  # * changing a setting changes the property on the Huviz instance (but not the input)
  # * adjusting a setting alters the input in the settings tab then changes it too
  # * on_change_<setting_name> methods, if they exist, are called continuously upon INPUT changes

  adjust_settings_from_list_of_specs: (setting_specs) ->
    for setting_spec in setting_specs
      for setting_name, control of setting_spec
        value = null
        if control.input?
          if control.input.value?
            value = control.input.value
          if control.input.type is 'button'
            #console.info("#{setting_name} is a button, so skipping")
            continue
          if control.input.type is 'checkbox'
            if control.input.checked
              value = true
            else
              value = false
          if control.input.type is 'select'
            for option in control.options
              if option.selected
                value = option.value
                # TODO support select where more than one option is selected
          if control.input.type is 'text'
            value = control.input.value or '' # otherwise no adjustment happens
        else
          continue # skip settings without an input (eg *_preamble)
        if value?
          @adjust_setting_if_needed(setting_name, value)
        else
          console.info("#{setting_name} not handled by adjust_settings_from_list_of_specs()")
          console.info("  default_value:",@get_setting_input_JQElem(setting_name).val())
    return

  adjust_settings_from_kv_list: (kv_list) ->
    for setting, value of kv_list
      @adjust_setting(setting, value)

  adjust_setting_if_needed: (setting_name, new_value, skip_custom_handler) ->
    input = @get_setting_input_JQElem(setting_name)
    theType = input.attr('type')
    if theType in ['checkbox', 'radiobutton']
      old_value = input.prop('checked')
    else
      old_value = input.val()
    equality = "because old_value: (#{old_value}) new_value: (#{new_value})"
    if ""+old_value is ""+new_value # compare on string value because that is what inputs return
      #console.warn("  no change required "+equality)
      return # bail because no change is needed
    #pretty_value = typeof value is 'string' and "'#{value}'" or value
    console.log("change_setting_if_needed('#{setting_name}', #{new_value})")
    console.info("  change required "+equality)
    return @adjust_setting(input, new_value, old_value, skip_custom_handler)

  change_setting_to_from: (setting_name, new_value, old_value, skip_custom_handler) =>
    skip_custom_handler = skip_custom_handler? and skip_custom_handler or false
    # TODO replace control.event_type with autodetecting on_change_ vs on_update_ method existence
    custom_handler_name = "on_change_" + setting_name
    custom_handler = @[custom_handler_name]
    if @settings_cursor
      cursor_text = (new_value).toString()
      #console.info("#{setting_name}: #{cursor_text}")
      @settings_cursor.set_text(cursor_text)
    if custom_handler? and not skip_custom_handler
      #console.log "change_setting_to_from() custom setting: #{setting_name} to:#{new_value}(#{typeof new_value}) from:#{old_value}(#{typeof old_value})"
      custom_handler.apply(@, [new_value, old_value])
    else
      #console.log "change_setting_to_from() setting: #{setting_name} to:#{new_value}(#{typeof new_value}) from:#{old_value}(#{typeof old_value})"
      this[setting_name] = new_value

  adjust_settings_from_defaults: ->
    return @adjust_settings_from_list_of_specs(@default_settings)

  on_change_reset_settings_to_default: (event) =>
    console.group('reset_settings_to_default()...')
    @adjust_settings_from_defaults()
    @adjust_settings_from_kv_list(@args.settings)
    console.groupEnd()
    return

  # on_change handlers for the various settings which need them
  on_change_use_accordion_for_settings: (new_val, old_val) ->
    if new_val
      # TODO replace this delay with a promise
      doit = () => $(@settingGroupsContainerElem).accordion()
      setTimeout(doit, 200)
    else
      console.warn('We do not yet have a solution for turning OFF the Accordion')

  on_change_nodes_pinnable: (new_val, old_val) ->
    if not new_val
      if @graphed_set
        for node in @graphed_set
          node.fixed = false

  on_change_show_hunt_verb: (new_val, old_val) ->
    if new_val
      vset = {hunt: @human_term.hunt}
      @gclui.verb_sets.push(vset)
      @gclui.add_verb_set(vset)

  on_change_show_cosmetic_tabs: (new_val, old_val) ->
    if not @tab_for_tabs_sparqlQueries_JQElem?
      # Keep calling this same method until tabs-sparqlQueries has been found
      setTimeout((() => @on_change_show_cosmetic_tabs(new_val, old_val)), 50)
      return
    # Showing the queries tab is a power-user thing so we hide boring tabs for convenience.
    if new_val
      if @tab_for_tabs_credit_JQElem?
        @tab_for_tabs_credit_JQElem.show()
      if @tab_for_tabs_intro_JQElem?
        @tab_for_tabs_intro_JQElem.show()
    else
      if @tab_for_tabs_credit_JQElem?
        @tab_for_tabs_credit_JQElem.hide()
      if @tab_for_tabs_intro_JQElem?
        @tab_for_tabs_intro_JQElem.hide()
    return

  on_change_show_queries_tab: (new_val, old_val) ->
    if not @tab_for_tabs_sparqlQueries_JQElem?
      # Keep calling this same method until tabs-sparqlQueries has been found
      setTimeout((() => @on_change_show_queries_tab(new_val, old_val)), 50)
      return
    # Showing the queries tab is a power-user thing so we hide boring tabs for convenience.
    if new_val
      @tab_for_tabs_sparqlQueries_JQElem.show()
    else
      @tab_for_tabs_sparqlQueries_JQElem.hide()
    return

  on_change_show_dangerous_datasets: (new_val, old_val) ->
    if new_val
      $('option.dangerous').show()
      $('option.dangerous').text (idx, text) ->
        append = ' (!)'
        if not text.match(/\(\!\)$/)
          return text + append
        return text
    else
      $('option.dangerous').hide()

  on_change_pill_display: (new_val) ->
    if new_val
      node_display_type = 'pills'
      @adjust_setting('charge', -3000)
      @adjust_setting('link_distance', 200)
    else
      node_display_type = ""
      @adjust_setting('charge', -210) # TODO use prior value or default value
      @adjust_setting('link_distance', 29) # TODO use prior value or default value
    @updateWindow()

  on_change_theme_colors: (new_val) ->
    if new_val
      renderStyles = themeStyles.dark
      #$("body").removeClass themeStyles.light.themeName
      @topElem.classList.remove(themeStyles.light.themeName)
    else
      renderStyles = themeStyles.light
      #$("body").removeClass themeStyles.dark.themeName
      @topElem.classList.remove(themeStyles.light.themeName)
    #@update_graph_settings()
    #$("body").css "background-color", renderStyles.pageBg
    #$("body").addClass renderStyles.themeName
    @topElem.style.backgroundColor = renderStyles.pageBg
    @topElem.classList.add(renderStyles.themeName)
    @updateWindow()

  on_change_paint_label_dropshadows: (new_val) ->
    if new_val
      @paint_label_dropshadows = true
    else
      @paint_label_dropshadows = false
    @updateWindow()

  on_change_display_shelf_clockwise: (new_val) ->
    if new_val
      @display_shelf_clockwise = true
    else
      @display_shelf_clockwise = false
    @updateWindow()

  on_change_choose_node_display_angle: (new_val) ->
    nodeOrderAngle = new_val
    @updateWindow()

  on_change_shelf_radius: (new_val, old_val) ->
    @change_setting_to_from('shelf_radius', new_val, old_val, true)
    @update_graph_radius()
    @updateWindow()

  on_change_truncate_labels_to: (new_val, old_val) ->
    @change_setting_to_from('truncate_labels_to', new_val, old_val, true)
    if @all_set
      for node in @all_set
        @unscroll_pretty_name(node)
    @updateWindow()

  on_change_graph_title_style: (new_val, old_val) ->
    if new_val is "custom"
      @topJQElem.find(".main_title").removeAttr("style")
      @topJQElem.find(".sub_title").removeAttr("style")
      @topJQElem.find(".graph_custom_main_title__setting").css('display', 'inherit')
      @topJQElem.find(".graph_custom_sub_title__setting").css('display', 'inherit')
      custTitle = @topJQElem.find("input[name='graph_custom_main_title']")
      custSubTitle = @topJQElem.find("input[name='graph_custom_sub_title']")
      @update_caption(custTitle[0].title, custSubTitle[0].title)
      @topJQElem.find("a.git_commit_hash_watermark").css('display', 'none')
      @ontology_watermark_JQElem.attr('style', '')
    else if new_val is "bold1"
      @ontology_watermark_JQElem.css('display', 'none')
    else
      @topJQElem.find(".graph_custom_main_title__setting").css('display', 'none')
      @topJQElem.find(".graph_custom_sub_title__setting").css('display', 'none')
      @topJQElem.find("a.git_commit_hash_watermark").css('display', 'inherit')
      @ontology_watermark_JQElem.attr('style', '')
      @update_caption(@data_uri,@onto_uri)
    @dataset_watermark_JQElem.removeClass().addClass("dataset_watermark #{new_val}")
    @ontology_watermark_JQElem.removeClass().addClass("ontology_watermark #{new_val}")

  on_change_graph_custom_main_title: (new_val) ->
    # if new custom values then update titles
    @dataset_watermark_JQElem.text(new_val)

  on_change_graph_custom_sub_title: (new_val) ->
    @ontology_watermark_JQElem.text(new_val)

  # TODO use make_markdown_dialog() instead of alert()
  on_change_language_path: (new_val, old_val) ->
    try
      MultiString.set_langpath(new_val)
    catch e
      alert("Input: #{new_val}\n#{e.toString()}\n\n  The 'Language Path' should be a colon-separated list of ISO two-letter language codes, such as 'en' or 'fr:en:es'.  One can also include the keywords ANY, NOLANG or ALL in the list.\n  'ANY' means show a value from no particular language and works well in situations where you don't know or care which language is presented.\n  'NOLANG' means show a value for which no language was specified.\n  'ALL' causes all the different language versions to be revealed. It is best used alone\n\nExamples (show first available, so order matters)\n  en:fr\n    show english or french or nothing\n  en:ANY:NOLANG\n    show english or ANY other language or language-less label\n  ALL\n    show all versions available, language-less last")
      @change_setting_to_from('language_path', old_val, old_val)
      return
    if @shelved_set
      @shelved_set.resort()
      @discarded_set.resort()
    @update_labels_on_pickers()
    @gclui?.resort_pickers()
    if @ctx?
      @tick("Tick in on_change_language_path")
    return

  on_change_color_nodes_as_pies: (new_val, old_val) ->  # TODO why this == window ??
    @color_nodes_as_pies = new_val
    @recolor_nodes()

  on_change_show_hide_endpoint_loading: (new_val, old_val) ->
    if @endpoint_loader
      endpoint = "#" + @endpoint_loader.uniq_id
    if new_val and endpoint
      $(endpoint).css('display','block')
    else
      $(endpoint).css('display','none')

  on_change_show_performance_monitor: (new_val, old_val) ->
    console.log "clicked performance monitor " + new_val + " " + old_val
    if new_val
      @performance_dashboard_JQElem.css('display','block')
      @show_performance_monitor = true
      @pfm_dashboard()
      @timerId = setInterval(@pfm_update, 1000)
    else
      clearInterval(@timerId)
      @performance_dashboard_JQElem.css('display','none').html('')
      @show_performance_monitor = false

  on_change_discover_geonames_remaining: (new_val, old_val) ->
    @discover_geonames_remaining = parseInt(new_val,10)
    @discover_names_including('geonames.org')

  on_change_discover_geonames_as: (new_val, old_val) ->
    if not @discover_geonames_as__widget? # Try later if not ready
      setTimeout((() => @on_change_discover_geonames_as(new_val, old_val)), 50)
      return
    @discover_geonames_as = new_val
    if new_val
      @discover_geonames_as__widget.set_state('untried')
      @discover_names_including('geonames.org')
    else
      if @discover_geonames_as__widget
        @discover_geonames_as__widget.set_state('empty')

  on_change_center_the_distinguished_node: (new_val, old_val) ->
    @center_the_distinguished_node = new_val
    @tick()

  on_change_arrows_chosen: (new_val, old_val) ->
    @arrows_chosen = new_val
    @tick()

  init_from_settings: ->
    # alert "init_from_settings() is deprecated"
    # Perform update_graph_settings for everything in the form
    # so the HTML can be used as configuration file
    for elem in $(".settings input") # so we can modify them in a loop
      @update_graph_settings(elem, false)

  after_file_loaded: (uri, callback) ->
    @call_on_dataset_loaded(uri)
    if callback
      callback()

  show_node_pred_edge_stats: ->
    pred_count = 0
    edge_count = 0
    s = "nodes:#{@nodes.length} predicates:#{pred_count} edges:#{edge_count}"
    console.log(s)

  call_on_dataset_loaded: (uri) ->
    @gclui.on_dataset_loaded({uri: uri})

  XXX_load_file: ->
    @load_data_with_onto(@get_dataset_uri())

  load_data_with_onto: (data, onto, callback) ->  # Used for loading files from menu
    # data and onto are expected to have .value containing an url; full, relative or filename
    # regardless the .value is a key into the datasetDB
    @data_uri = data.value
    @set_ontology(onto.value)
    @onto_uri = onto.value
    if @args.display_reset
      $("#reset_btn").show()
    else
      #@disable_data_set_selector()
      @disable_dataset_ontology_loader(data, onto)
    @show_state_msg("loading...")
    @show_state_msg(@data_uri)
    unless @G.subjects
      @fetchAndShow(@data_uri, callback)

  disable_data_set_selector: () ->
    $("[name=data_set]").prop('disabled', true)
    $("#reload_btn").show()

  XXX_read_data_and_show: (filename, data) -> #Handles drag-and-dropped files
    # REVIEW is this no longer used?
    data = @local_file_data
    #console.log data
    if filename.match(/.ttl$/)
      the_parser = @parseAndShowTTLData
    else if filename.match(/.nq$/)
      the_parser = @parse_and_show_NQ_file
    else
      alert("Unknown file format. Unable to parse '#{filename}'. Only .ttl and .nq files supported.")
      return
    the_parser(data)
    #@local_file_data = "" #RESET the file data
    #@disable_data_set_selector()
    @disable_dataset_ontology_loader()
    #@show_state_msg("loading...")
    #@show_state_msg filename

  get_dataset_uri: () ->
    # FIXME goodbye jquery
    return $("select.file_picker option:selected").val()

  run_script_from_hash: ->
    script = @get_script_from_hash()
    if script?
      @gclui.run_script(script)
    return

  get_script_from_hash: () ->
    script = location.hash
    script = (not script? or script is "#") and "" or script.replace(/^#/,"")
    script = script.replace(/\+/g," ")
    if script
      colorlog("get_script_from_hash() script: "+script)
    return script

  adjust_menus_from_load_cmd: (cmd) ->
    # Adjust the dataset and ontology loaders to match the cmd
    if cmd.ontologies and cmd.ontologies.length > 0 and not @ontology_loader.value
      @set_ontology_with_uri(cmd.ontologies[0])
      if cmd.data_uri and not @dataset_loader.value
        @set_dataset_with_uri(cmd.data_uri)
        return true
    return false

  # recognize that changing this will likely break old hybrid HuVizScripts
  json_script_marker: "# JSON FOLLOWS"

  load_script_from_JSON: (json) ->
    #alert('load_script_from_JSON')
    saul_goodman = false
    for cmdArgs in json
      if 'load' in cmdArgs.verbs
        saul_goodman = @adjust_menus_from_load_cmd(cmdArgs)
      else
        @gclui.push_cmdArgs_onto_future(cmdArgs)
    return

  parse_script_file: (data, fname) ->
    # There are two file formats, both with the extension .txt
    #   1) * Commands as they appear in the Command History
    #      * Followed by the comment on a line of its own
    #      * Followed by the .json version of the script, for trivial parsing
    #   2) Commands as they appear in the Command History
    # The thinking is that, ultimately, version 1) will be required until the
    # parser for the textual version is complete.
    lines = data.split('\n')
    while lines.length
      line = lines.shift()
      if line.includes(@json_script_marker)
        return JSON.parse(lines.join("\n"))
    return {}

  boot_sequence: (script) ->
    # If we are passed an empty string that means there was an outer
    # script but there was nothing for us and DO NOT examine the hash for more.
    # If there is a script after the hash, run it.
    # Otherwise load the default dataset defined by the page.
    # Or load nothing if there is no default.
    @reset_graph()
    if not script?
      script = @get_script_from_hash()
    if script? and script.length
      console.log("boot_sequence('#{script}')")
      @gclui.run_script(script)
    else
      data_uri = @get_dataset_uri()
      if data_uri
        @load(data_uri)

  load: (data_uri, callback) ->
    @fetchAndShow(data_uri, callback) unless @G.subjects
    if @use_webgl
      @init_webgl()

  load_with: (data_uri, ontology_uris) ->
    @goto_tab(1) # go to Commands tab # FIXME: should be symbolic not int indexed
    basename = (uri) ->
      return uri.split('/').pop().split('.').shift() # the filename without the ext
    dataset =
      label: basename(data_uri)
      value: data_uri
    ontology =
      label: basename(ontology_uris[0])
      value: ontology_uris[0]
    @visualize_dataset_using_ontology({}, dataset, [ontology])
    return

  endpoint_loader_is_quiet: ->
    # TODO Replace with a Promise-based way to ensure the loader is ready.
    # TODO Build it into PickOrProvide and use it in @load_with() too.
    return @endpoint_loader? and @endpoint_loader.is_quiet(500)

  query_from_seeking_limit: (querySpec) ->
    {serverUrl, graphUrl, limit, subjectUrl} = querySpec
    if not @endpoint_loader_is_quiet()
      setTimeout((() => @query_from_seeking_limit(querySpec)), 50)
      #throw new Error("endpoint_loader not ready")
      return
    @goto_tab(1)
    if serverUrl?
      @endpoint_loader.select_by_uri(serverUrl)
      @sparql_graph_query_and_show__trigger(serverUrl)
      finish_prep = () =>
        if graphUrl?
          @sparqlQryInput_show()
          @sparqlGraphSelector_JQElem.val(graphUrl)
        if limit?
          @endpoint_limit_JQElem.val(limit)
        if subjectUrl?
          @endpoint_labels_JQElem.val(subjectUrl)
        @big_go_button_onclick_sparql()
      @sparql_graph_query_and_show_queryManager.when_done(finish_prep)
    return

  # TODO: remove now that @get_or_create_node_by_id() sets type and name
  is_ready: (node) ->
    # Determine whether there is enough known about a node to make it visible
    # Does it have an .id and a .type and a .name?
    return node.id? and node.type? and node.name?

  assign_types: (node, within) ->
    type_id = node.type # FIXME one of type or taxon_id gotta go, bye 'type'
    if type_id
      #console.log "assign_type",type_id,"to",node.id,"within",within,type_id
      @get_or_create_taxon(type_id).register(node)
    else
      throw "there must be a .type before hatch can even be called:"+node.id+ " "+type_id
      #console.log "assign_types failed, missing .type on",node.id,"within",within,type_id

  is_big_data: () ->
    if not @big_data_p?
      #if @nodes.length > 200
      if @data_uri?.match('poetesses|relations')
        @big_data_p = true
      else
        @big_data_p = false
    return @big_data_p

  get_default_set_by_type: (node) ->
    # see Orlando.get_default_set_by_type
    #console.log "get_default_set_by_type",node
    if @is_big_data()
      if node.type in ['writer']
        return @shelved_set
      else
        return @hidden_set
    return @shelved_set

  get_default_set_by_type: (node) ->
    return @shelved_set

  pfm_dashboard: () =>
    # Adding feedback monitor
    #   1. new instance in pfm_data (line 541)
    #   2. add @pfm_count('name') to method
    #   3. add #{@build_pfm_live_monitor('name')} into message below
    warning = ""
    message = """
      <div class='feedback_module'><p>Triples Added: <span id="noAddQuad">0</span></p></div>
      <div class='feedback_module'><p>Number of Nodes: <span id="noN">0</span></p></div>
      <div class='feedback_module'><p>Number of Edges: <span id="noE">0</span></p></div>
      <div class='feedback_module'><p>Number of Predicates: <span id="noP">0</span></p></div>
      <div class='feedback_module'><p>Number of Classes: <span id="noC">0</span></p></div>
      <div class='feedback_module'><p>find_nearest... (msec): <span id="highwater_find_node_or_edge">0</span></p></div>
      <div class='feedback_module'><p>maxtick (msec): <span id="highwater_maxtick">0</span></p></div>
      <div class='feedback_module'><p>discover_name #: <span id="highwater_discover_name">0</span></p></div>
      #{@build_pfm_live_monitor('add_quad')}
      #{@build_pfm_live_monitor('hatch')}
      <div class='feedback_module'><p>Ticks in Session: <span id="noTicks">0</span></p></div>
      #{@build_pfm_live_monitor('tick')}
      <div class='feedback_module'><p>Total SPARQL Requests: <span id="noSparql">0</span></p></div>
      <div class='feedback_module'><p>Outstanding SPARQL Requests: <span id="noOR">0</span></p></div>
      #{@build_pfm_live_monitor('sparql')}
    """
    @performance_dashboard_JQElem.html(message + warning)

  build_pfm_live_monitor: (name) =>
    label = @pfm_data["#{name}"]["label"]
    monitor = "<div class='feedback_module'>#{label}: <svg id='pfm_#{name}' class='sparkline' width='200px' height='50px' stroke-width='1'></svg></div>"
    return monitor

  pfm_count: (name) =>
    # Incriment the global count for 'name' variable (then used to update live counters)
    @pfm_data["#{name}"].total_count++

  pfm_update: () =>
    time = Date.now()
    class_count = 0
    # update static markers
    if @nodes then noN = @nodes.length else noN = 0
    $("#noN").html("#{noN}")
    if @edge_count then noE = @edge_count else noE = 0
    $("#noE").html("#{noE}")
    for k,v of @highwatermarks
      continue if k.endsWith('__')
      val = v
      if not Number.isInteger(v)
        v = v.toFixed(2)
      $("#highwater_#{k}").html(v)
    #$("#fnnoe").html("#{(@find_node_or_edge_max or 0).toFixed(2)}")
    $("#maxtick").html("#{(@maxtick or 0).toFixed(2)}")
    if @predicate_set then noP = @predicate_set.length else noP = 0
    $("#noP").html("#{noP}")
    for item of @taxonomy #TODO Should improve this by avoiding recount every second
      class_count++
    @pfm_data.taxonomy.total_count = class_count
    $("#noC").html("#{@pfm_data.taxonomy.total_count}")
    $("#noTicks").html("#{@pfm_data.tick.total_count}")
    $("#noAddQuad").html("#{@pfm_data.add_quad.total_count}")
    $("#noSparql").html("#{@pfm_data.sparql.total_count}")
    if @endpoint_loader then noOR = @endpoint_loader.outstanding_requests else noOR = 0
    $("#noOR").html("#{noOR}")

    for pfm_marker of @pfm_data
      marker = @pfm_data["#{pfm_marker}"]
      old_count = marker.prev_total_count
      new_count = marker.total_count
      calls_per_second = Math.round(new_count - old_count)
      if @pfm_data["#{pfm_marker}"]["timed_count"] and (@pfm_data["#{pfm_marker}"]["timed_count"].length > 0)
        #console.log marker.label + "  " + calls_per_second
        if (@pfm_data["#{pfm_marker}"]["timed_count"].length > 60) then @pfm_data["#{pfm_marker}"]["timed_count"].shift()
        @pfm_data["#{pfm_marker}"].timed_count.push(calls_per_second)
        @pfm_data["#{pfm_marker}"].prev_total_count = new_count + 0.01
        #console.log "#pfm_#{pfm_marker}"
        sparkline.sparkline(document.querySelector("#pfm_#{pfm_marker}"), @pfm_data["#{pfm_marker}"].timed_count)
      else if (@pfm_data["#{pfm_marker}"]["timed_count"])
        @pfm_data["#{pfm_marker}"]["timed_count"] = [0.01]
        #console.log "Setting #{marker.label }to zero"


class OntologicallyGrounded extends Huviz
  # If OntologicallyGrounded then there is an associated ontology which informs
  # the TaxonPicker and the PredicatePicker, rather than the pickers only
  # being informed by implicit ontological hints such as
  #   _:Fred a foaf:Person .  # tells us Fred is a Person
  #   _:Fred dc:name "Fred" . # tells us the predicate_picker needs "name"
  set_ontology: (ontology_uri) ->
    #@init_ontology()
    @read_ontology(ontology_uri)

  read_ontology: (url) ->
    if url.startsWith('file:///') or url.indexOf('/') is -1 # ie local file stored in datasetDB
      @get_resource_from_db url, (err, rsrcRec) =>
        if rsrcRec?
          @parseTTLOntology(rsrcRec.data)
          return
        @blurt(err or "'#{url}' was not found in your ONTOLOGY menu.  Provide it and reload page")
        @reset_dataset_ontology_loader()
        return
      return
    $.ajax
      url: url
      async: false
      success: @parseTTLOntology
      error: (jqxhr, textStatus, errorThrown) =>
        # REVIEW standardize on @blurt(), right?
        @show_state_msg(errorThrown + " while fetching ontology " + url)

  parseTTLOntology: (data, textStatus) =>
    # detect (? rdfs:subClassOf ?) and (? ? owl:Class)
    # Analyze the ontology to enable proper structuring of the
    # predicate_picker and the taxon_picker.  Also to support
    # imputing 'type' (and hence Taxon) to nodes.
    ontology = @ontology
    if GreenerTurtle? and @turtle_parser is 'GreenerTurtle'
      @raw_ontology = new GreenerTurtle().parse(data, "text/turtle")
      for subj_uri, frame of @raw_ontology.subjects
        subj_lid = uniquer(subj_uri)
        for pred_id, pred of frame.predicates
          pred_lid = uniquer(pred_id)
          for obj in pred.objects
            obj_raw = obj.value
            if pred_lid in ['comment']
              #console.error "  skipping",subj_lid, pred_lid #, pred
              continue
            if pred_lid is 'label' # commented out by above test
              label = obj_raw
              if ontology.label[subj_lid]?
                ontology.label[subj_lid].set_val_lang(label, obj.language)
              else
                ontology.label[subj_lid] = new MultiString(label, obj.language)
            obj_lid = uniquer(obj_raw)
            #if pred_lid in ['range','domain']
            #  console.log pred_lid, subj_lid, obj_lid
            if pred_lid is 'domain'
              ontology.domain[subj_lid] = obj_lid
            else if pred_lid is 'range'
              if not ontology.range[subj_lid]?
                ontology.range[subj_lid] = []
              if not (obj_lid in ontology.range)
                ontology.range[subj_lid].push(obj_lid)
            else if pred_lid in ['subClassOf', 'subClass']
              ontology.subClassOf[subj_lid] = obj_lid
            else if pred_lid is 'subPropertyOf'
              ontology.subPropertyOf[subj_lid] = obj_lid

        #
        # [ rdf:type owl:AllDisjointClasses ;
        #   owl:members ( :Organization
        #                 :Person
        #                 :Place
        #                 :Sex
        #                 :Work
        #               )
        # ] .
        #
        # If there exists (_:1, rdfs:type, owl:AllDisjointClasses)
        # Then create a root level class for every rdfs:first in rdfs:members

class Orlando extends OntologicallyGrounded
  # These are the Orlando specific methods layered on Huviz.
  # These ought to be made more data-driven.

  constructor: ->
    super(arguments...)
    if window.indexedDB
      onceDBReadyCount = 0
      delay = 100
      onceDBReady = () =>
        onceDBReadyCount++
        console.log('onceDBReady() call #' + onceDBReadyCount)
        if @datasetDB?
          console.log('finally! datasetDB is now ready')
          @run_script_from_hash()
        else
          setTimeout(onceDBReady,delay) # causes this method to be run again, acting as an async loop
      setTimeout(onceDBReady,delay)
    else
      # REVIEW not sure if this is worth doing (are we requiring indexedDB absolutely?)
      @run_script_from_hash()

  get_default_set_by_type: (node) ->
    if @is_big_data()
      if node.type in ['writer']
        return @shelved_set
      else
        return @hidden_set
    return @shelved_set

  HHH: {}

  make_link: (uri, text, target) ->
    uri ?= ""
    target ?= synthIdFor(uri.replace(/\#.*$/,'')) # open only one copy of each document
    text ?= uri
    return """<a target="#{target}" href="#{uri}">#{text}</a>"""

  push_snippet: (msg_or_obj) ->
    obj = msg_or_obj
    if true #@snippet_box
      if typeof msg_or_obj isnt 'string'
        [msg_or_obj, m] = ["", msg_or_obj]  # swap them
        if obj.quad.obj_uri
          obj_dd = """#{@make_link(obj.quad.obj_uri)}"""
        else
          dataType_uri = m.edge.target.__dataType or ""
          dataType = ""
          if dataType_uri
            dataType_curie = m.edge.target.type.replace('__',':')
            #dataType = """^^<a target="_" href="#{dataType_uri}">#{dataType_curie}</a>"""
            dataType = "^^#{@make_link(dataType_uri, dataType_curie)}"
          obj_dd = """"#{obj.quad.obj_val}"#{dataType}"""
        msg_or_obj = """
        <div id="#{obj.snippet_js_key}" class="message_wrapper" style="overflow:none;">
            <h3>subject</h3>
            <div class="edge_circle" style="background-color:#{m.edge.source.color};"></div>
            <p>#{@make_link(obj.quad.subj_uri)}</p>

            <h3>predicate </h3>
            <div class="edge_arrow">
              <div class="edge_arrow_stem" style="background-color:#{m.edge.color};"></div>
              <div class="edge_arrow_head" style="border-color: transparent transparent transparent #{m.edge.color};"></div>
            </div>
            <p class="pred">#{@make_link(obj.quad.pred_uri)}</p>

            <h3>object </h3>
            <div class="edge_circle" style="background-color:#{m.edge.target.color};"></div>
            <p>#{obj_dd}</p>

            <h3>source</h3>
            <p">#{@make_link(obj.quad.graph_uri)}</p>
        </div>

        """
        ## unconfuse emacs Coffee-mode: " """ ' '  "
    pos = @get_next_snippet_position_obj(obj.edge_inspector_id)
    dialogArgs =
      width: @width
      height: @height
      extraClasses: "edge_inspector"
      top: pos.top
      left: pos.left
      close: @close_edge_inspector
    obj.edge._inspector = @make_dialog(msg_or_obj, obj.edge_inspector_id, dialogArgs)
    obj.edge._inspector.dataset.edge_id = obj.edge.id

  close_edge_inspector: (event, ui) =>
    box = event.currentTarget.offsetParent
    edge_id = box.dataset.edge_id
    if edge_id?
      edge = @edges_by_id[edge_id]
      if edge?
        delete edge._inspector
    edge_inspector_id = event.target.getAttribute('for')
    @remove_edge_inspector(edge_inspector_id)
    @destroy_dialog(event)
    return

  remove_edge_inspector: (edge_inspector_id) ->
    delete @currently_printed_snippets[edge_inspector_id]
    @clear_snippet_position_filled_for(edge_inspector_id)
    return

  clear_snippet_position_filled_for: (match_id) ->
    # delete the snippet_position_filled for match_id, so the position can be re-used
    for pos, id of @snippet_positions_filled
      if id is match_id
        delete @snippet_positions_filled[pos]
        break
    return

  human_term: orlando_human_term

class OntoViz extends Huviz #OntologicallyGrounded
  human_term: orlando_human_term
  HHH: # hardcoded hierarchy hints, kv pairs of subClass to superClass
    ObjectProperty: 'Thing'
    Class: 'Thing'
    SymmetricProperty: 'ObjectProperty'
    IrreflexiveProperty: 'ObjectProperty'
    AsymmetricProperty: 'ObjectProperty'

  ontoviz_type_to_hier_map:
    RDF_type: "classes"
    OWL_ObjectProperty: "properties"
    OWL_Class: "classes"

  use_lid_as_node_name: true
  snippet_count_on_edge_labels: false

  DEPRECATED_try_to_set_node_type: (node,type) ->
    # FIXME incorporate into ontoviz_type_to_hier_map
    #
    if type.match(/Property$/)
      node.type = 'properties'
    else if type.match(/Class$/)
      node.type = 'classes'
    else
      console.log(node.id+".type is", type)
      return false
    console.log("try_to_set_node_type", node.id, "=====", node.type)
    return true

  # first, rest and members are produced by GreenTurtle regarding the AllDisjointClasses list
  predicates_to_ignore: ["anything", "comment", "first", "rest", "members"]

class Socrata extends Huviz
  ###
  # Inspired by https://data.edmonton.ca/
  #             https://data.edmonton.ca/api/views{,.json,.rdf,...}
  #
  ###
  categories = {}
  ensure_category: (category_name) ->
    cat_id = category_name.replace /\w/, '_'
    if @categories[category_id]?
      @categories[category_id] = category_name
      @assert_name category_id,category_name
      @assert_instanceOf category_id,DC_subject
    return cat_id

  assert_name: (uri,name,g) ->
    name = name.replace(/^\s+|\s+$/g, '')
    @add_quad
      s: uri
      p: RDFS_label
      o:
        type: RDF_literal
        value: stripped_name

  assert_instanceOf: (inst,clss,g) ->
    @add_quad
      s: inst
      p: RDF_a
      o:
        type: RDF_object
        value: clss

  assert_propertyValue: (sub_uri,pred_uri,literal) ->
    console.log("assert_propertyValue", arguments)
    @add_quad
      s: subj_uri
      p: pred_uri
      o:
        type: RDF_literal
        value: literal

  assert_relation: (subj_uri,pred_uri,obj_uri) ->
    console.log("assert_relation", arguments)
    @add_quad
      s: subj_uri
      p: pred_uri
      o:
        type: RDF_object
        value: obj_uri

  parseAndShowJSON: (data) =>
    #TODO Currently not working/tested
    console.log("parseAndShowJSON",data)
    g = @DEFAULT_CONTEXT

    #  https://data.edmonton.ca/api/views/sthd-gad4/rows.json

    for dataset in data
      #dataset_uri = "https://data.edmonton.ca/api/views/#{dataset.id}/"
      console.log(@dataset_uri)
      q =
        g: g
        s: dataset_uri
        p: RDF_a
        o:
          type: RDF_literal
          value: 'dataset'
      console.log(q)
      @add_quad(q)
      for k,v of dataset
        if not is_on_of(k,['category','name','id']) # ,'displayType'
          continue
        q =
          g: g
          s: dataset_uri
          p: k
          o:
            type:  RDF_literal
            value: v
        if k == 'category'
          cat_id = @ensure_category(v)
          @assert_instanceOf(dataset_uri, OWL_Class)
          continue
        if k == 'name'
          assert_propertyValue dataset_uri, RDFS_label, v
          continue
        continue

        if typeof v == 'object'
          continue
        if k is 'name'
          console.log(dataset.id, v)
        #console.log k,typeof v
        @add_quad(q)
        #console.log q

class PickOrProvide
  tmpl: """
	<form id="UID" class="pick_or_provide_form" method="post" action="" enctype="multipart/form-data">
    <span class="pick_or_provide_label">REPLACE_WITH_LABEL</span>
    <select name="pick_or_provide"></select>
    <button type="button" class="delete_option"><i class="fa fa-trash" style="font-size: 1.2em;"></i></button>
  </form>
  """
  uri_file_loader_sel: '.uri_file_loader_form'

  constructor: (@huviz, @append_to_sel, @label, @css_class, @isOntology, @isEndpoint, @opts) ->
    @opts ?= {}
    @uniq_id = @huviz.unique_id()
    @select_id = @huviz.unique_id()
    @pickable_uid = @huviz.unique_id()
    @your_own_uid = @huviz.unique_id()
    @find_or_append_form()
    dndLoaderClass = @opts.dndLoaderClass or DragAndDropLoader
    @drag_and_drop_loader = new dndLoaderClass(@huviz, @append_to_sel, @)
    @drag_and_drop_loader.form.hide()
    #@add_group({label: "-- Pick #{@label} --", id: @pickable_uid})
    @add_group({label: "Your Own", id: @your_own_uid}, 'append')
    @add_option({label: "Provide New #{@label} ...", value: 'provide'}, @select_id)
    @add_option({label: "Pick or Provide...", canDelete: false}, @select_id, 'prepend')
    @update_change_stamp()
    return this

  update_change_stamp: ->
    @change_stamp = performance.now()

  is_quiet: (msec) ->
    msec ?= 200
    if @change_stamp?
      if (performance.now() - @change_stamp) > msec
        return true
    return false

  select_by_uri: (targetUri) ->
    option = $('#' + @select_id + ' option[value="' + targetUri + '"]')
    if option.length isnt 1
      throw new Error("#{targetUri} was not found")
    @select_option(option)
    return

  val: (val) ->
    console.log(this.constructor.name + '.val(' + (val and '"'+val+'"' or '') + ') for ' + this.opts.rsrcType + ' was ' + @pick_or_provide_select.val())
    @pick_or_provide_select.val(val)
    @refresh()

  disable: ->
    @pick_or_provide_select.prop('disabled', true)
    @form.find('.delete_option').hide()

  enable: ->
    @pick_or_provide_select.prop('disabled', false)
    @form.find('.delete_option').show()

  select_option: (option) ->
    new_val = option.val()
    #console.table([{last_val: @last_val, new_val: new_val}])
    cur_val = @pick_or_provide_select.val()
    # TODO remove last_val = null in @init_resource_menus() by fixing logic below
    #   What is happening is that the AJAX loading of preloads means that
    #   it is as if each of the new datasets is being selected as it is
    #   added -- but when the user picks an actual ontology then
    #   @set_ontology_from_dataset_if_possible() fails if the new_val == @last_val
    if cur_val isnt @last_val # and not @isOntology
      @last_val = cur_val
    if @last_val isnt new_val
      @last_val = new_val
      if new_val
        @pick_or_provide_select.val(new_val)
        @value = new_val
      else
        console.warn("TODO should set option to nothing")

  add_uri: (uri_or_rec) =>
    if typeof uri_or_rec is 'string'
      uri = uri_or_rec
      rsrcRec = {}
    else
      rsrcRec = uri_or_rec
    rsrcRec.uri ?= uri
    rsrcRec.isOntology ?= @isOntology
    rsrcRec.isEndpoint ?= @isEndpoint
    rsrcRec.time ?= (new Date()).toISOString()
    rsrcRec.isUri ?= true
    rsrcRec.title ?= rsrcRec.uri
    rsrcRec.canDelete ?= not not rsrcRec.time?
    rsrcRec.label ?= rsrcRec.uri.split('/').reverse()[0] or rsrcRec.uri
    if rsrcRec.label is "sparql" then rsrcRec.label = rsrcRec.uri
    rsrcRec.rsrcType ?= @opts.rsrcType
    # rsrcRec.data ?= file_rec.data # we cannot add data because for uri we load each time
    @add_resource(rsrcRec, true)
    @update_change_stamp()
    @update_state()

  add_local_file: (file_rec) =>
    # These are local files which have been 'uploaded' to the browser.
    # As a consequence they cannot be programmatically loaded by the browser
    # and so we cache them
    #local_file_data = file_rec.data
    #@huviz.local_file_data = local_file_data
    if typeof file_rec is 'string'
      uri = file_rec
      rsrcRec = {}
    else
      rsrcRec = file_rec
      rsrcRec.uri ?= uri
      rsrcRec.isOntology ?= @isOntology
      rsrcRec.time ?= (new Date()).toISOString()
      rsrcRec.isUri ?= false
      rsrcRec.title ?= rsrcRec.uri
      rsrcRec.canDelete ?= not not rsrcRec.time?
      rsrcRec.label ?= rsrcRec.uri.split('/').reverse()[0]
      rsrcRec.rsrcType ?= @opts.rsrcType
      rsrcRec.data ?= file_rec.data
    @add_resource(rsrcRec, true)
    @update_state()

  add_resource: (rsrcRec, store_in_db) ->
    uri = rsrcRec.uri
    #rsrcRec.uri ?= uri.split('/').reverse()[0]
    if store_in_db
      @huviz.add_resource_to_db(rsrcRec, @add_resource_option)
    else
      @add_resource_option(rsrcRec)

  add_resource_option: (rsrcRec) => # TODO rename to rsrcRec
    uri = rsrcRec.uri
    rsrcRec.value = rsrcRec.uri
    @add_option(rsrcRec, @pickable_uid)
    @pick_or_provide_select.val(uri)
    @refresh()

  add_group: (grp_rec, which) ->
    which ?= 'append'
    optgrp = $("""<optgroup label="#{grp_rec.label}" id="#{grp_rec.id or @huviz.unique_id()}"></optgroup>""")
    if which is 'prepend'
      @pick_or_provide_select.prepend(optgrp)
    else
      @pick_or_provide_select.append(optgrp)
    return optgrp

  add_option: (opt_rec, parent_uid, pre_or_append) ->
    pre_or_append ?= 'append'
    if not opt_rec.label?
      console.log("missing .label on", opt_rec)
    if @pick_or_provide_select.find("option[value='#{opt_rec.value}']").length
      #alert "add_option() #{opt_rec.value} collided"
      return
    opt_str = """<option id="#{@huviz.unique_id()}"></option>"""
    opt = $(opt_str)
    opt_group_label = opt_rec.opt_group
    if opt_group_label
      opt_group = @pick_or_provide_select.find("optgroup[label='#{opt_group_label}']")
      #console.log(opt_group_label, opt_group.length) #, opt_group[0])
      if not opt_group.length
        #@huviz.blurt("adding '#{opt_group_label}'")
        opt_group = @add_group({label: opt_group_label}, 'prepend')
        # opt_group = $('<optgroup></optgroup>')
        # opt_group.attr('label', opt_group_label)
        # @pick_or_provide_select.append(opt_group)
      #if not opt_group.length
      #  @huviz.blurt('  but it does not yet exist')
      opt_group.append(opt)
    else # There is no opt_group_label, so this is a top level entry, ie a group, etc
      if pre_or_append is 'append'
        $("##{parent_uid}").append(opt)
      else
        $("##{parent_uid}").prepend(opt)
    for k in ['value', 'title', 'class', 'id', 'style', 'label']
      if opt_rec[k]?
        $(opt).attr(k, opt_rec[k])
    for k in ['isUri', 'canDelete', 'ontologyUri', 'ontology_label'] # TODO standardize on _
      if opt_rec[k]?
        val = opt_rec[k]
        $(opt).data(k, val)
    return opt[0]

  update_state: (callback) ->
    raw_value = @pick_or_provide_select.val()
    selected_option = @get_selected_option()
    label_value = selected_option[0].label
    the_options = @pick_or_provide_select.find("option")
    kid_cnt = the_options.length
    #console.log("#{@label}.update_state() raw_value: #{raw_value} kid_cnt: #{kid_cnt}")
    if raw_value is 'provide'
      @drag_and_drop_loader.form.show()
      @state = 'awaiting_dnd'
      @value = undefined
    else
      @drag_and_drop_loader.form.hide()
      @state = 'has_value'
      @value = raw_value
      @label = label_value
    disable_the_delete_button = true
    if @value?
      canDelete = selected_option.data('canDelete')
      disable_the_delete_button = not canDelete
    # disable_the_delete_button = false  # uncomment to always show the delete button -- useful when bad data stored
    @form.find('.delete_option').prop('disabled', disable_the_delete_button)
    if callback?
      callback()

  find_or_append_form: ->
    if not $(@local_file_form_sel).length
      $(@append_to_sel).append(@tmpl.replace('REPLACE_WITH_LABEL', @label).replace('UID',@uniq_id))
    @form = $("##{@uniq_id}")
    @pick_or_provide_select = @form.find("select[name='pick_or_provide']")
    @pick_or_provide_select.attr('id',@select_id)
    #console.debug @css_class,@pick_or_provide_select
    @pick_or_provide_select.change(@onchange)
    @delete_option_button = @form.find('.delete_option')
    @delete_option_button.click(@delete_selected_option)
    @form.find('.delete_option').prop('disabled', true) # disabled initially
    #console.info "form", @form

  onchange: (e) =>
    #e.stopPropagation()
    @refresh()

  get_selected_option: =>
    @pick_or_provide_select.find('option:selected') # just one CAN be selected

  delete_selected_option: (e) =>
    e.stopPropagation()
    selected_option = @get_selected_option()
    val = selected_option.attr('value')
    if val?
      @huviz.remove_dataset_from_db(@value)
      @delete_option(selected_option)
      @update_state()
      #  @value = null

  delete_option: (opt_elem) ->
    uri = opt_elem.attr('value')
    @huviz.remove_dataset_from_db(uri)
    opt_elem.remove()
    @huviz.update_dataset_ontology_loader()

  refresh: ->
    @update_state(@huviz.update_dataset_ontology_loader)

class PickOrProvideScript extends PickOrProvide
  onchange: (e) =>
    super(e)
    @huviz.visualize_dataset_using_ontology()

# inspiration: https://css-tricks.com/drag-and-drop-file-uploading/
class DragAndDropLoader
  tmpl: """
	<form class="local_file_form" method="post" action="" enctype="multipart/form-data">
	  <div class="box__input">
	    <input class="box__file" type="file" name="files[]" id="file"
             data-multiple-caption="{count} files selected" multiple />
	    <label for="file"><span class="box__label">Choose a local file</span></label>
	    <button class="box__upload_button" type="submit">Upload</button>
      <div class="box__dragndrop" style="display:none"> Drop URL or file here</div>
	  </div>
    <input type="url" class="box__uri" placeholder="Or enter URL here" />
	  <div class="box__uploading" style="display:none">Uploading&hellip;</div>
	  <div class="box__success" style="display:none">Done!</div>
	  <div class="box__error" style="display:none">Error! <span></span>.</div>
  </form>
  """

  constructor: (@huviz, @append_to_sel, @picker) ->
    @local_file_form_id = @huviz.unique_id()
    @local_file_form_sel = "##{@local_file_form_id}"
    @find_or_append_form()
    if @supports_file_dnd()
      @form.show()
      @form.addClass('supports-dnd')
      @form.find(".box__dragndrop").show()
  supports_file_dnd: ->
    div = document.createElement('div')
    return true
    return (div.draggable or div.ondragstart) and ( div.ondrop ) and
      (window.FormData and window.FileReader)
  load_uri: (firstUri) ->
    #@form.find('.box__success').text(firstUri)
    #@form.find('.box__success').show()
    #TODO SHOULD selection be added to the picker here, or wait for after successful?
    @picker.add_uri({uri: firstUri, opt_group: 'Your Own'})
    @form.hide()
    return true # ie success
  load_file: (firstFile) ->
    @huviz.local_file_data = "empty"
    filename = firstFile.name
    @form.find('.box__success').text(firstFile.name) #TODO Are these lines still needed?
    @form.find('.box__success').show()
    reader = new FileReader()
    reader.onload = (evt) =>
      #console.log evt.target.result
      #console.log("evt", evt)
      try
        #@huviz.read_data_and_show(firstFile.name, evt.target.result)
        if filename.match(/.(ttl|.nq)$/)
          @picker.add_local_file
            uri: firstFile.name
            opt_group: 'Your Own'
            data: evt.target.result
          #@huviz.local_file_data = evt.target.result  # REVIEW remove all uses of local_file_data?!?
        else
          #$("##{@dataset_loader.select_id} option[label='Pick or Provide...']").prop('selected', true)
          @huviz.blurt("Unknown file format. Unable to parse '#{filename}'. " +
                "Only .ttl and .nq files supported.", 'alert')
          @huviz.reset_dataset_ontology_loader()
          $('.delete_option').attr('style','')
      catch e
        msg = e.toString()
        #@form.find('.box__error').show()
        #@form.find('.box__error').text(msg)
        @huviz.blurt(msg, 'error')
    reader.readAsText(firstFile)
    return true # ie success
  find_or_append_form: ->
    num_dnd_form = $(@local_file_form_sel).length
    if not num_dnd_form
      elem = $(@tmpl)
      $(@append_to_sel).append(elem)
      elem.attr('id', @local_file_form_id)
    @form = $(@local_file_form_sel)
    @form.on 'submit unfocus', (evt) =>
      uri_field = @form.find('.box__uri')
      uri = uri_field.val()
      if uri_field[0].checkValidity()
        uri_field.val('')
        @load_uri(uri)
      return false
    @form.on 'drag dragstart dragend dragover dragenter dragleave drop', (evt) =>
      #console.clear()
      evt.preventDefault()
      evt.stopPropagation()
    @form.on 'dragover dragenter', () =>
      @form.addClass('is-dragover')
      console.log("addClass('is-dragover')")
    @form.on 'dragleave dragend drop', () =>
      @form.removeClass('is-dragover')
    @form.on 'drop', (e) =>
      console.log(e)
      console.log("e:", e.originalEvent.dataTransfer)
      @form.find('.box__input').hide()
      droppedUris = e.originalEvent.dataTransfer.getData("text/uri-list").split("\n")
      console.log("droppedUris",droppedUris)
      firstUri = droppedUris[0]
      if firstUri.length
        if @load_uri(firstUri)
          @form.find(".box__success").text('')
          @picker.refresh()
          @form.hide()
          return
      droppedFiles = e.originalEvent.dataTransfer.files
      console.log("droppedFiles", droppedFiles)
      if droppedFiles.length
        firstFile = droppedFiles[0]
        if @load_file(firstFile)
          @form.find(".box__success").text('')
          @picker.refresh()
          @form.hide()
          return
      # the drop operation failed to result in loaded data, so show 'drop here' msg
      @form.find('.box__input').show()
      @picker.refresh()

class DragAndDropLoaderOfScripts extends DragAndDropLoader
  load_file: (firstFile) ->
    filename = firstFile.name
    @form.find('.box__success').text(firstFile.name) #TODO Are these lines still needed?
    @form.find('.box__success').show()
    reader = new FileReader()
    reader.onload = (evt) =>
      try
        #@huviz.read_data_and_show(firstFile.name, evt.target.result)
        if filename.match(/.(txt|.json)$/)
          file_rec =
            uri: firstFile.name
            opt_group: 'Your Own'
            data: evt.target.result
          @picker.add_local_file(file_rec)
          #@huviz.local_file_data = evt.target.result
        else
          #$("##{@dataset_loader.select_id} option[label='Pick or Provide...']").prop('selected', true)
          @huviz.blurt("Unknown file format. Unable to parse '#{filename}'. " +
                "Only .txt and .huviz files supported.", 'alert')
          @huviz.reset_dataset_ontology_loader()
          $('.delete_option').attr('style','')
      catch err
        msg = err.toString()
        #@form.find('.box__error').show()
        #@form.find('.box__error').text(msg)
        @huviz.blurt(msg, 'error')
    reader.readAsText(firstFile)
    return true # ie success

(exports ? this).Huviz = Huviz
(exports ? this).Orlando = Orlando
(exports ? this).OntoViz = OntoViz
#(exports ? this).Socrata = Socrata
(exports ? this).Edge = Edge
