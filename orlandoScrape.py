#!/usr/bin/env python
__version__='1.1.2'
__doc__ = """
Script to convert XML information from the Orlando project mark-up to
various output formats.  It produces JSON and starting to produce Turtle (TTL).

This file is now in GitHub at:
  https://github.com/smurp/huviz

1.1.2 Use the structID as the 'context' in n3, nq and trig output

1.1.1 extracts the standard ID from the DIV tag for each section.
      This will be used for linking back to the original text.

 Script by

 John Simpson, Postdoctoral Fellow with:
 1. Text Mining & Visualization for Literary History
 2. INKE, Modeling & Prototyping
 john.simpson@ualberta.ca / @symulation

AND

Shawn Murphy with:
 1. Text Mining & Visualization for Literary History
 2. Semandra.com
 <smurp@smurp.com> http://smurp.com

Copyright CC BY-SA 3.0  See: http://creativecommons.org/licenses/by-sa/3.0/

"""
STATE_OBVIOUS_PEOPLE_TOO = True # include assertions like:  <someone> a <Person>.
LOCAL_IDENTIFIERS = True  # False causes use of external ontologies
LOCAL_IDENTIFIERS = False  # False causes use of external ontologies
# False is bugged, groups are appearing as w:XXXX

import sqlite3
import sys

# imports from the rdf library allow for efficient handling of data it nt and quad format.
import rdflib.plugins.serializers.nt
import rdflib.plugins.serializers.nquads
from rdflib.plugins.serializers.nt import _xmlcharref_encode, _quoteLiteral

found_predicates = {}

def NQ_ROW(triple,context):
    if isinstance(triple[2], Literal):
        return u"%s %s %s %s .\n" % (triple[0].n3(),
                                     triple[1].n3(),
                                     _xmlcharref_encode(
                                         _quoteLiteral(triple[2])),
                                     context.n3())
    else:
        return u"%s %s %s %s !\n" % (triple[0].n3(),
                                     triple[1].n3(),
                                     _xmlcharref_encode(triple[2].n3()),
                                     context.n3())


# rdflib.plugins.serializers.nquads._nq_row = NQ_ROW

import sys
# solve the "ordinal not in range(128)" problem
reload(sys) # http://demongin.org/blog/808/
sys.setdefaultencoding('utf-8')

import re       # The regular expressions module
import codecs   # The module for dealing with various file formatting types
import json     # The module for efficient input/output from/to JSON

from lxml import etree
from io import StringIO, BytesIO
import xpath2_functions
xpath2_functions.register_functions(etree)

#Open two input files and two output files (one for matches and one for non-matches)
#xpathTests = codecs.open('orlando2RDFxpath3.txt', encoding='utf-8', mode='r')
# orlandoRAW = codecs.open('orlando_term_poetess_2013-01-04.xml', encoding='utf-8', mode='r')
#orlandoRDF = codecs.open('orlandoHUMAN_xpath-out-TESTING.txt', encoding='utf-8', mode='w')


BASE2 = "01"
BASE10 = "0123456789"
BASE26 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

class LocalNode:
    def __init__(self,val):
        self.val = val
    def n3(self):
        return self.val

def convert_base(src,srctable,desttable):
    """
    >>> convert_base('4',BASE10,BASE2)
    '100'
    >>> convert_base('1023',BASE10,BASE2) == '1' * 10
    True
    >>> convert_base('1024',BASE10,BASE2) == '1' + '0'*10
    True
    >>> b10 = '12341234424908'
    >>> convert_base(convert_base(b10,BASE10,BASE2),BASE2,BASE10) == b10
    True
    """
    import math
    srclen = len(srctable)
    destlen = len(desttable)
    val = 0
    numlen = len(src)
    i = 0
    while i < numlen:
        val = val * srclen + srctable.find(src[i])
        i += 1
    if val < 0:
        return 0

    r = val % destlen
    res = desttable[r]
    q = int(math.floor(val / destlen))
    while q:
        r = q % destlen
        #return (r,q,destlen)
        q = int(math.floor(q / destlen))
        res = desttable[r] + res
    return res

def regexTestLoad(regexTests, options):
    arrayCounter=0
    regexArray = {}
    for line in regexTests:
        line = line.replace('\n','')
        parts = line.split('|')
        if options.only_predicates and not parts[0] in options.only_predicates:
            continue
        regexArray[arrayCounter]=parts
        arrayDepth = len(regexArray[arrayCounter])
        n=1
        while n < arrayDepth:
           regexArray[arrayCounter][n] = re.compile(regexArray[arrayCounter][n])
           n+=1
        arrayCounter+=1
    return regexArray

# Loads the core extraction commands to be tested from the passed in external file
def xpathTestLoad(xpathTests, addXpaths, options):
    arrayCounter = 0
    xpathArray = {}
    for line in xpathTests:
        #print line
        #print line[0], type(line[0])
        line = line.replace('\n','')
        linesplit = line.split('|')
        if int(line[0]) == 1:
            xpathArray[arrayCounter] = linesplit
            n = 2
            arrayDepth = len(xpathArray[arrayCounter])
            while n < arrayDepth:
               xpathArray[arrayCounter][n] = etree.XPath(xpathArray[arrayCounter][n], smart_strings=False)
               n += 1
            del xpathArray[arrayCounter][0]
            arrayCounter += 1
        else:
            for path in addXpaths:
                path = path.replace('&',linesplit[2])
                xpathArray[arrayCounter] = [linesplit[0],linesplit[1]+path.split('|')[0]] + path.split('|')[1:]
                # print xpathArray[arrayCounter]
                n = 2
                arrayDepth = len(xpathArray[arrayCounter])
                while n < arrayDepth:
                    xpathArray[arrayCounter][n] = etree.XPath(xpathArray[arrayCounter][n], smart_strings=False)
                    n += 1
                del xpathArray[arrayCounter][0]
                arrayCounter += 1
    return xpathArray

def xpathAddition():  # returns all the specialized search terms to be included for each and every tag captured by xpothTestLoad
    addXpaths = []
    #  The & used in each line is a target for search and replace work to be done later.
    addXpaths.append("|//&|//descendant-or-self::*[not(self::BIBCIT)]/text()")
    addXpaths.append("ConnectionToOrganization|//&/descendant::ORGNAME[not(@STANDARD=./ancestor::ENTRY/descendant::STANDARD/text())]/@STANDARD")
    addXpaths.append("ConnectionToOrganization|//&/descendant::ORGNAME[not(@STANDARD=./ancestor::ENTRY/descendant::STANDARD/text())]|//descendant-or-self::*[not(self::BIBCIT)]/text()")
    addXpaths.append("ConnectionToPerson|//&/descendant::NAME[not(@STANDARD=./ancestor::ENTRY/descendant::STANDARD/text())]/@STANDARD")
    addXpaths.append("ConnectionToPerson|//&/descendant::NAME[not(@STANDARD=./ancestor::ENTRY/descendant::STANDARD/text())]|//descendant-or-self::*[not(self::BIBCIT)]/text()")
    addXpaths.append("ConnectionToGeog|//&/descendant::GEOG/@REG")
    addXpaths.append("ConnectionToGeog|//&/descendant::GEOG|//descendant-or-self::*[not(self::BIBCIT)]/text()")
    addXpaths.append("ConnectionToRegion|//&/descendant::REGION/@REG")
    addXpaths.append("ConnectionToRegion|//&/descendant::REGION|//descendant-or-self::*[not(self::BIBCIT)]/text()")
    addXpaths.append("ConnectionToSettlement|//&/descendant::SETTLEMENT/@REG")
    addXpaths.append("ConnectionToSettlement|//&/descendant::SETTLEMENT|//descendant-or-self::*[not(self::BIBCIT)]/text()")
    addXpaths.append("ConnectionToAddress|//&/descendant::ADDRESS/@REG")
    addXpaths.append("ConnectionToAddress|//&/descendant::ADDRESS|//descendant-or-self::*[not(self::BIBCIT)]/text()")
    addXpaths.append("ConnectionToDate|//&/descendant::DATE/@VALUE")
    addXpaths.append("ConnectionToDate|//&/descendant::DATE|//descendant-or-self::*[not(self::BIBCIT)]/text()")
    return addXpaths

def stripExtraXML(match):
    cleanLine=[]
    keep=True
    for character in match:
        if character=="<":
            keep=False
        if keep==True:
            cleanLine.append(character)
        if character==">":
            keep=True
    return(''.join(cleanLine))


# Create the regex needed to extractthe closest structural ID tag
# during the regexRecursion function.
structIDregex=[]
structIDregex.append(re.compile('<DIV0 ID="([^"]+?)">(.+?)</DIV0>'))
structIDregex.append(re.compile('<DIV1 ID="([^"]+?)">(.+?)</DIV1>'))
structIDregex.append(re.compile('<DIV2 ID="([^"]+?)">(.+?)</DIV2>'))
structIDregex.append(re.compile('<P ID="([^"]+?)">(.+?)</P>'))


from rdflib import Graph, Literal, BNode, RDF, ConjunctiveGraph, URIRef
from rdflib.namespace import FOAF, DC, Namespace


XFN = Namespace('http://vocab.sindice.com/xfn#')
BRW = Namespace('http://orlando.cambridge.org/public/svPeople?person_id=')
WP  = Namespace('http://en.wikipedia.org/wiki/')
ORL = Namespace('orl:')
ORLONT = Namespace('http://draftOrlandoOntology.org/Draft1#')
BLANK = Namespace('http:///')
LOCAL = Namespace('') # '_:' for trig or ttl support WIP '' works with snippets
BLANK_HACK = False
BLANK_WRITERS = False # FIXME ideally this would be True so writer ids like _:abdyma

unconstrained = LOCAL['unconstrained']

ID_GENERATOR = LOCAL
if LOCAL_IDENTIFIERS:
    #ID_GENERATOR = BNode     #
    #ID_GENERATOR = LocalNode #
    ID_GENERATOR = LOCAL
def make_node(an_id):
    return ID_GENERATOR[an_id]
def make_writer(an_id):
    return BRW[an_id]
def make_person(an_id):
    return LOCAL[an_id]

all_predicates = False
predicates_to_groups = ['religiousInfluence','connectionToOrganization']
predicate_to_type = {'childOf':XFN['parent'],
                     'parentOf':XFN['child'],
                     'grandchildOf':XFN['kin'],
                     'grandparentOf':XFN['kin'],
                     'cousinOf':XFN['kin'],
                     'juniorCollateralRelationshipTo':XFN['kin'],
                     'siblingOf':XFN['sibling'],
                     'friendOrAssociateOf':XFN['friend'],
                     'religiousInfluence':WP['Religious_denomination'],
                     'connectionToOrganization':ORL['connectionToOrganization']
                     }
use_ontology = False # False means use above mappings, True means use ORL[key]

if LOCAL_IDENTIFIERS:
    for k in predicate_to_type.keys():
        predicate_to_type[k] = LOCAL[k]

class FormatEmitter(object):
    def __init__(self, options):
        self.contexts = {}
        self.options = options
        self.prepFile(options)
        self.entries = []
        if options.rules == 'regexes':
            self.ruleRecursion = self.regexRecursion
        elif options.rules == 'xpaths':
            self.ruleRecursion = self.xPathRecursion
        if options.ignore_structid_regex:
            self.ignore_structid_re = re.compile(options.ignore_structid_regex)
        else:
            self.ignore_structid_re = False
        print self.ignore_structid_re

    def prepFile(self, options):
        if hasattr(options,'outfile'):
            self.outfile = codecs.open(options.outfile, encoding='utf-8', mode='w')

    def extractionCycle(self, orlandoRAW, ruleArray, NameTest, mainSubject):
        options = self.options
        entryDict=dict()
        commacheck3=False #controls the insertion of commas at the end of the objects
        count = 0
        for line in orlandoRAW:
            #print "len(line)",len(line)
            LineTest = NameTest.search(line)
            #print LineTest
            if LineTest:
                mainSubject=LineTest.group(1)
                if options.ids and not ( mainSubject in options.ids):
                    continue
                entryDict['ID']=mainSubject
                count += 1
                if options.verbose or options.progress:
                    print mainSubject
                for tripleCheck in ruleArray:
                    if options.capture_context:
                        structID = ""
                        for IDcheck in structIDregex:
                            IDcheckResults = IDcheck.findall(line)
                            for result in IDcheckResults:
                                structID = result[0]
                                if options.verbose:
                                    print structID, entryDict.keys()
                                searchText=result[1]
                                self.ruleRecursion(searchText, ruleArray, tripleCheck,
                                                   1, mainSubject, entryDict, structID)
                    else:
                        self.ruleRecursion(line, ruleArray, tripleCheck,
                                           1, mainSubject, entryDict, None)
                options.emitter.stash(entryDict,commacheck3,options)
                commacheck3=True
            entryDict = dict()
            if options.limit and count >= options.limit:
                break

    def regexRecursion(self, searchText, regexArray, tripleCheck, recursionDepthPlusOne, mainSubject, entryDict, structID):
        #Start with the lowest level structural IDs.  Find everything that matches them and pull out the structID
        #If we can match all the way to the end then great, done.
        #If we can't match all the way to the end then we move up a structural ID level and start again
        #If we run out of structural ID levels then it is a failed search
        tripleTest = regexArray[tripleCheck][recursionDepthPlusOne]
        resultTripleTest = tripleTest.findall(searchText)
        if resultTripleTest:
            if (recursionDepthPlusOne) >= len(regexArray[tripleCheck])-1:
                for match in resultTripleTest:
                    objectValue = stripExtraXML(match)
                    self.fillDict(entryDict, regexArray, tripleCheck, mainSubject, objectValue, structID)
            else:
                for match in resultTripleTest:
                    self.regexRecursion(match, regexArray, tripleCheck, recursionDepthPlusOne+1, mainSubject, entryDict, structID)


    def xPathRecursion(self, searchText, xpathArray, tripleCheck, recursionDepthPlus, mainSubject, entryDict, structID):
        """This is the function that processes all the xPath components of each search line"""
        #print "xPathRecursion() recursionDepthPlus:", recursionDepthPlus, "structID:",structID
        search_text = searchText
        if isinstance(searchText, etree._Element):
            searchText = etree.tounicode(searchText)
            # This is a total hack.  I don't know why but matches always had trailing text after the last XML tag
            # this led to "lxml.etree.XMLSyntaxError: Extra content at the end of the document" errors
            # wrapping this code in these <junk></junk> tags stops that from happening

            #print "searchText:", searchText
            #print "searchText type", type(searchText)
        #searchText = "<junk>%s</junk>" % searchText
        searchText = "<P>%s</P>" % searchText

        tripleTest = xpathArray[tripleCheck][recursionDepthPlus]
        #print "tripleTest", tripleTest
        searchTextOrig = searchText
        searchText = StringIO(searchText)
        try:
            searchText = etree.parse(searchText)
        except etree.XMLSyntaxError,e:
            print "FAILED searchText = etree.parse(searchText)"
            print e
            col = str(e).split()[-1]
            int_col = int(col)
            if int_col:
                start = max(0,int_col - 140)
                print " ",searchTextOrig[start:int_col]
            return

        #print "type tripleTest: ", type(tripleTest)
        #print "searchText: ", str(searchText)
        resultTripleTest = tripleTest(searchText)
        #print "resultTripleTest", resultTripleTest
        if "*[not(self::BIBCIT)]" in str(tripleTest):
            #print "JOINING TEXT"
            #Spacing is a problem after joining XML nodes.  This cleans it up a bit.
            resultTripleTest = ' '.join((' '.join(resultTripleTest)).split())
            resultTripleTest = resultTripleTest.replace(' .','.')
            resultTripleTest = resultTripleTest.replace(' ,',',')
            resultTripleTest = resultTripleTest.replace(" '" ,"'")
            resultTripleTest = resultTripleTest.replace(' "','"')
            #resultTripleTest = " ".join(resultTripleTest)
            #print resultTripleTest
        #print "  searchText", searchText, recursionDepthPlus
        if resultTripleTest:
            if self.options.verbose:
              print search_text
            if recursionDepthPlus >= len(xpathArray[tripleCheck])-1:
                #print "resultTripleTest Type", type(resultTripleTest)
                if isinstance(resultTripleTest, list):
                    for match in resultTripleTest:
                        """
                        print "match", match
                        print "matchType", type(match)
                        objectValue=stripExtraXML(match)
                        print "objectValue", objectValue
                        print "objectValueType", type(objectValue)
                        """

                        if self.options.verbose:
                            print "    ",match
                        #print "predicate: fillDict() A", structID
                        self.fillDict(entryDict, xpathArray, tripleCheck, mainSubject, match, structID)
                else:
                    #print "predicate: fillDict() B", structID
                    self.fillDict(entryDict, xpathArray, tripleCheck, mainSubject, resultTripleTest, structID)
            else:
                for match in resultTripleTest:
                    #print "structID being ignored", structID
                    self.xPathRecursion(match, xpathArray, tripleCheck, recursionDepthPlus+1, mainSubject, entryDict, structID)

    def fillDict(self, entryDict, regexArray, tripleCheck, mainSubject, objectValue, structID):
        pass_thru = False
        predicate = regexArray[tripleCheck][0]
        if predicate in ['standardName', 'hasStandardName']:
            # IT IS CRITICAL THAT WE DO NOT SKIP THESE NAME PREDICATES
            pass_thru = True

        if self.options.trace_quads:
            print >> sys.stderr, "  ",[ mainSubject, predicate, objectValue, structID ]

        if self.ignore_structid_re and not pass_thru:
            if structID:
                if self.ignore_structid_re.search(structID):
                    #print "skipping", structID
                    return

        if self.options.only_predicates and not (predicate in self.options.only_predicates):
            if not pass_thru:
              return

        ctx_sn = {'sn': objectValue}
        if structID:
            # maintain a cache of contexts keyed by structID
            if not self.contexts.has_key(structID):
                context_uri = LOCAL[structID]
                self.contexts[structID] = Graph(self.store.store, context_uri)
            ctx_sn['ctx'] = self.contexts[structID]

        if predicate not in entryDict:
            entryDict[predicate] = []

        # TODO(smurp): de-dupe by doing equivalent of:  objectValue not in entryDict[predicate]:
        entryDict[predicate].append(ctx_sn)

    def dump_human(self,entryDict, options):
        print "=" * 80
        print entryDict.get('sn') or entryDict.get('ID')
        for k,v in entryDict.items():
            if k in ['ID']:
                continue
            if type(v) == list:
                for item in v:
                    print "  ",k,repr(item['sn']),1,item['ctx']
            else:
                if type(v) == dict:
                    print "  ",k,repr(v.get('sn')),2
                else:
                    print "  ",k,repr(v),3
        print ""

    def stash(self,entryDict,commacheck3,options):
        if options.human:
            self.dump_human(entryDict,options)
        self.entries.append(entryDict)
    def go(self):
        options = self.options
        sys.stderr.write("begin\n")
        self.prepOutfile()
        ruleArray = None
        ruleFile = getattr(options, options.rules)
        ruleTests = codecs.open(ruleFile, encoding='utf-8', mode='r')
        if options.rules == "regexes":
            ruleArray = regexTestLoad(ruleTests, options)
        elif options.rules == "xpaths":
            ruleArray = xpathTestLoad(ruleTests, xpathAddition(), options)
        #print "ruleArray", ruleArray #, "options", options
        NameTest = re.compile('<ENTRY.+?ID="([\w, ]+)".*>',re.I)
        sys.stderr.write("extraction starts\n")
        with codecs.open(options.infile, encoding='utf-8', mode='r') as orlandoRAW:
            mainSubject=None
            self.extractionCycle(orlandoRAW, ruleArray, NameTest, mainSubject)
        sys.stderr.write("extraction ends\n")
        self.concludeOutfile()
        sys.stderr.write("end\n")

    def next_id(self):
        """
        >>> fe = FormatEmitter({})
        >>> fe.next_id()
        'B'
        >>> fe.next_id()
        'C'
        """
        if not hasattr(self,'current_id'):
            self.current_id = 0
        self.current_id += 1
        return convert_base(str(self.current_id),BASE10,BASE26)

    def prepOutfile(self):
        pass

class JSONEmitter(FormatEmitter):
    def concludeOutfile(self):
        kwargs = dict(sort_keys=True)
        if self.options.pretty:
            kwargs['indent'] = 4
        self.outfile.write(json.dumps(self.entries,**kwargs))
        self.outfile.close()


class RDFEmitter(FormatEmitter):
    def __init__(self,options):
        super(RDFEmitter, self).__init__(options)
        self.store = Graph()
        self.store.bind('f',FOAF)
        self.universal = Graph(self.store.store,LOCAL['Universal']) # really only needed by ContextEmitter
        if not options.capture_context:
            self.store.bind('d',DC)
            self.store.bind('w',BRW)
            self.store.bind('x',XFN)
        self.entities = {}

    def get_entity(self,standard_name,node=None,ID=None,typ=None):
        if not self.entities.has_key(standard_name):
            if node == None:
                if ID == None:
                    ID = self.next_id()
                node = make_node(ID)
                #if BLANK_HACK:
                #    node = BLANK[str(ID)]
                #else:
                #    node = BNode(ID)
            entuple = [node,FOAF.name,Literal(standard_name)]
            if options.capture_context: # and hasattr(self,'universal'):
                entuple.append(self.universal)
                #print "NAMING ============>",entuple
                self.store.addN([entuple])
            else:
                self.store.add(entuple)
            if options.state_the_obvious:
                if STATE_OBVIOUS_PEOPLE_TOO or typ <> FOAF.Person:
                    # http://www.w3.org/TR/2013/NOTE-n-triples-20130409/#iri-summary
                    #   "a for the predicate rdf:type"
                    #     is OK in Turtle but not N-Triples (or NQuads, likely)
                    tupl = [node,RDF.type,typ]
                    if options.capture_context:
                        tupl.append(self.universal)
                        self.store.addN([tupl])
                    else:
                        self.store.add(tupl)
            self.entities[standard_name] = node
        return self.entities[standard_name]

    def get_person(self,name,**kwargs):
        kwargs['typ'] = FOAF.Person
        return self.get_entity(name,**kwargs)

    def get_group(self,name,**kwargs):
        kwargs['typ'] = FOAF.Group
        return self.get_entity(name,**kwargs)

    def generate_graph(self):
        bogus_relations = {
            ('aberfr','siblingOf'): 'Abdy, Maria',
            ('aberfr','childOf'): 'Smith, Richard',
            }
        if not options.bogus_relations:
            bogus_relations = {}

        for entry in self.entries:
            standardNames = entry.get('standardName', entry.get('hasStandardName', []))
            standardName = standardNames and standardNames[0]['sn'] or None
            if standardName == None:
                #print "skipping entry without a standardName", entry.get('ID'), entry.get('hasName')
                #print "  keys", entry.keys()
                #print entry
                continue

            writer = self.get_entity(
                standardName,
                make_writer(entry['ID']),
                typ=ORL.writer) # BRW normally not BNode

            for predicate,values in entry.items():
                if predicate in ['ID','standardName']: # TODO(smurp): add date-of-{birth,death}
                    continue
                if not found_predicates.has_key(predicate):
                    found_predicates[predicate] = False
                if all_predicates or predicate in predicate_to_type.keys():
                    found_predicates[predicate] = True
                    if use_ontology:
                        pred = ORLONT[predicate]
                    else:
                        pred = predicate_to_type[predicate]

                    # add some interesting relations
                    if bogus_relations:
                        k = (entry['ID'],predicate)
                        if bogus_relations.has_key(k):
                            values.append(bogus_relations[k])
                    for ctx_sn_d in values: # Context_standardName_dict
                        # if ctx_sn_d is a dict, it likely has context on the ctx key
                        if type(ctx_sn_d) <> dict:  # handle uncontextualized objects
                            ctx_sn_d = {'sn':ctx_sn_d}
                        if predicate in predicates_to_groups:
                            # we know the object is group, by the predicate
                            obj = self.get_group(ctx_sn_d['sn'])
                        else:
                            # we guess the object is a person since its not a group
                            obj = self.get_person(ctx_sn_d['sn'])
                            if obj == writer: # eliminate self links
                                continue
                        quad_or_triple = [writer,pred,obj]
                        if ctx_sn_d.has_key('ctx'):
                            quad_or_triple.append(ctx_sn_d['ctx'])
                        if options.verbose:
                            print "     QUAD!",quad_or_triple
                        if len(quad_or_triple) > 3:
                            self.store.addN([quad_or_triple]) # a quad
                        else:
                            self.store.add(quad_or_triple) # a triple

# The following classes create a set of "emitters" that allow the data scraped from Orlando to be output
# into various formats

class TurtleEmitter(RDFEmitter):
    # http://rdflib.readthedocs.org/en/latest/_modules/rdflib/plugins/serializers/turtle.html
    def concludeOutfile(self):
        self.generate_graph()
        self.outfile.write(self.store.serialize(format='turtle'))

class NTriplesEmitter(RDFEmitter):
    # http://rdflib.readthedocs.org/en/latest/_modules/rdflib/plugins/serializers/nt.html
    def concludeOutfile(self):
        self.generate_graph()
        self.outfile.write(
            self.store.serialize(
                format="nt"))

class N3Emitter(RDFEmitter):
    # http://rdflib.readthedocs.org/en/latest/_modules/rdflib/plugins/serializers/n3.html
    def concludeOutfile(self):
        self.generate_graph()
        self.outfile.write(
            self.store.serialize(
                format="n3"))

class ContextEmitter(RDFEmitter):
    def __init__(self, options):
        super(ContextEmitter, self).__init__(options)
        self.store = ConjunctiveGraph()
        self.universal = Graph(self.store.store,LOCAL['Universal']) # really only needed by ContextEmitter
        options.capture_context = True
        if options.verbose:
            print "context_aware:",self.store.context_aware

class NQuadsEmitter(ContextEmitter):
    # http://rdflib.readthedocs.org/en/latest/_modules/rdflib/plugins/serializers/nquads.html
    def concludeOutfile(self):
        self.generate_graph()
        self.outfile.write(
            self.store.serialize(
                format="nquads"))

class TrigEmitter(ContextEmitter):
    # http://rdflib.readthedocs.org/en/latest/_modules/rdflib/plugins/serializers/trig.html
    def concludeOutfile(self):
        self.generate_graph()
        self.outfile.write(
            self.store.serialize(
                format="trig"))

class SqliteEmitter(ContextEmitter):
    def __init__(self, options):
        super(SqliteEmitter, self).__init__(options)
        print "WARNING: the SQLite option is incomplete and non-functional"
        self.createTables()

    def createTables(self):
        self.runSqlFile('schema.sql')

    def runSqlFile(self, fname):
        cursor = self.conn.cursor()
        statements = open(fname,'r').read().split(';')
        for statement in statements:
            statement = statement.strip()
            if statement:
                statement += ';'
                print statement
                cursor.execute(statement)

    def prepFile(self, options):
        self.conn = sqlite3.connect(options.outfile)

    def concludeOutfile(self):
        self.generate_graph()
        self.dumpEntities()

    def dumpEntities(self):
        for entity in self.entities:
            print "##"
            print repr(entity)

    def dumpEntries(self):
        for entry in self.entries:
            print "# ENTRY"
            for k,v in entry.iteritems():
                print "##", k
                print repr(v)


if __name__ == "__main__": # Prevents this program from running if called by another program
    only_predicates = 'standardName,dateOfBirth,dateOfDeath'.split(',')
    only_predicates.extend(predicate_to_type.keys())
    defaults = dict(
        human = False,
        regexes = 'orlando2RDFregex4.txt',
        xpaths = 'orlando2RDFxpath3.txt',
        rules = 'regexes',
        #infile = 'orlando_all_entries_2013-03-04_FORMATTED.xml',
        infile = 'orlando_all_entries_2013-03-04.xml',
        only_predicates = only_predicates,
        ignore_structid_regex = '\-DIV0\-\-1$',
        outfile = 'orlando_all_entries_2013-03-04.json')

    from optparse import OptionParser
    parser = OptionParser()
    parser.add_option("--human",
                      default = defaults['human'],
                      action = 'store_true',
                      help = "output human readable text, good while building regexes")
    parser.add_option("--outfile",
                      default = defaults['outfile'],
                      help = "output filename, default:"+\
                          defaults['outfile'])
    parser.add_option("--ids",
                      default = "",
                      help = "a comma-delimited list of writer IDs: abdyma,atwoma")
    parser.add_option("--regexes",
                      default = defaults['regexes'],
                      help = "regex tests filename, default: "+\
                          defaults['regexes'])
    parser.add_option("--xpaths",
                      default = defaults['xpaths'],
                      help = "xpaths tests filename, default: "+\
                          defaults['xpaths'])
    parser.add_option("--rules",
                      default = defaults['rules'],
                      help = "use 'xpaths' or 'regexes', default: "+\
                          defaults['rules'])
    parser.add_option("--infile",
                      default = defaults['infile'],
                      help = "input filename, default:"+\
                          defaults['infile'])
    parser.add_option("--trace_quads",
                      action = 'store_true',
                      help = "show quads as they are encountered")
    parser.add_option("--limit",
                      type = "int",
                      help = "limit the number of entries processed")
    parser.add_option("-x","--capture_context",
                      default = True,
                      action = 'store_true',
                      help = "capture the context of relations")
    parser.add_option("--pretty",
                      action = 'store_true',
                      help = "make json or xml output more human readable")
    parser.add_option(
        "--only_predicates",
        default = ','.join(defaults['only_predicates']),
        help = "the predicates to keep, default: %(only_predicates)s" % defaults)
    parser.add_option("--all_predicates",
                      action = 'store_true',
                      help = "use every predicate available")
    parser.add_option("--state_the_obvious",
                      default = False,
                      action = 'store_true',
                      help = "assert that writers and others are FOAF.Person")
    parser.add_option("--bogus_relations",
                      default = False ,
                      action = 'store_true',
                      help = "assert (aberfr,siblingOf,abdyma) for test purposes")
    parser.add_option("--doctest",
                      action = 'store_true',
                      help = "perform doc tests")
    parser.add_option("-v","--verbose",
                      default = False,
                      action = 'store_true',
                      help = "be verbose")
    parser.add_option("--progress",
                      default = False,
                      action = 'store_true',
                      help = "show the ids of writers as they are being processed")
    parser.add_option("-V","--version",
                      action = 'store_true',
                      help = "show version")
    parser.add_option("--man",
                      action = 'store_true',
                      help = "show the manual for this program")
    parser.add_option("--use_onto",
                      action = 'store_true',
                      help = "use the ontology")
# These are meant to work in conjunction with the SqliteEmitter
#    parser.add_option("--symmetric",
#                      action = 'store_true',
#                      help = "also generate triples where the writers are objects")
#    parser.add_option("--for_object",
#                      help = "generate triples for literal object")
    parser.add_option(
        "--ignore_structid_regex",
        default = defaults['ignore_structid_regex'],
        help = "regex for structIDs to ignore, default: '%(ignore_structid_regex)s' empty to ignore none" % defaults)
    parser.version = __version__
    parser.usage =  """
    e.g.
       %prog --doctest
          Perform unit tests on the %prog

       %prog
          The default operation is equivalent to:
              ./orlandoScrape.py \\
                 --rules {rules} \\
                 --infile {infile} \\
                 --outfile {outfile} \\
                 --regexes {regexes} \\
                 --only_predicates "standardName,childOf,dateOfBirth,dateOfDeath,parentOf" \\
                 --ignore_structid_regex '{ignore_structid_regex}'

       %pro
          During testing this is nice
             ./orlandoScrape.py --outfile data/test_1.ttl --limit 1 --infile orlando_all_entries_2013-03-04.xml  -v

       %prog --only_predicates ""
          Run without constraint on the predictes emitted.

    """.format(**defaults)
    (options,args) = parser.parse_args()
    show_usage = True
    if options.ids:
        options.ids = options.ids.split(",")
    if options.only_predicates:
        options.only_predicates = options.only_predicates.split(',')
    if options.all_predicates:
        options.only_predicates = []
        all_predicates = True
    if options.doctest:
        show_usage = False
        import doctest
        doctest.testmod(verbose=options.verbose)
        sys.exit()
    if options.use_onto:
        use_ontology = True
    if options.version:
        show_usage = False
        if options.verbose:
            print __cvs_id__
        else:
            print parser.version
    if options.man:
        show_usage = False
        import pydoc
        pydoc.help(__import__(__name__))
    #print options
    if options.outfile.endswith('.json'):
        options.emitter = JSONEmitter(options)
    if options.outfile.endswith('.ttl'):
        options.emitter = TurtleEmitter(options)
    if options.outfile.endswith('.nq'):
        options.emitter = NQuadsEmitter(options)
    if options.outfile.endswith('.nt'):
        options.emitter = NTriplesEmitter(options)
    if options.outfile.endswith('.n3'):
        options.emitter = N3Emitter(options)
    if options.outfile.endswith('.trig'):
        options.emitter = TrigEmitter(options)
    if options.outfile.endswith('.db'):
        options.emitter = SqliteEmitter(options)
    if hasattr(options,'emitter'):
        options.emitter.go()
    elif show_usage:
        parser.print_help()
    for k,v in found_predicates.items():
        print "  ",v,k

# TODO(shawn): remove commacheck3
