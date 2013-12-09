#!/usr/bin/env python
__version__='1.1.1'
__doc__ = """
Script to convert XML information from the Orlanda project mark-up to
various output formats.  It produces JSON and starting to produce Turtle (TTL).

This file is now in GitHub at:
  https://github.com/smurp/huviz

1.1.1 extracts the standard ID from the DIV tag for each section.  This will be used for linking back to the original text.

 Script by
 
 John Simpson, Postdoctoral Fellow with:
 1. Text Mining & Visualization for Literary History
 2. INKE, Modeling & Prototyping
 john.simpson@ualberta.ca / @symulation

AND

Shawn Murphy, independent contractor guy with Text Mining & Visualization for Literary History

Copyright CC BY-SA 3.0  See: http://creativecommons.org/licenses/by-sa/3.0/

"""

LOCAL_IDENTIFIERS = True  # False causes use of external ontologies
LOCAL_IDENTIFIERS = False  # False causes use of external ontologies
# False is bugged, groups are appearing as w:XXXX

import rdflib.plugins.serializers.nt
import rdflib.plugins.serializers.nquads
from rdflib.plugins.serializers.nt import _xmlcharref_encode, _quoteLiteral

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

# 
# rdflib.plugins.serializers.nquads._nq_row = NQ_ROW

import sys
# solve the "ordinal not in range(128)" problem
reload(sys) # http://demongin.org/blog/808/
sys.setdefaultencoding('utf-8')

import re
import codecs
import json

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

def regexTestLoad(regexTests,options):
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
 

def fillDict(entryDict, regexArray, tripleCheck, mainSubject, stripMatch, structID):
    predicate = regexArray[tripleCheck][0]
    if options.only_predicates and not (predicate in options.only_predicates):
        return
    
    ctx_sn = {'sn': stripMatch}
    if structID:
        ctx_sn['ctx'] = structID
    
    if predicate not in entryDict:
        entryDict[predicate] = []

    # TODO(smurp): de-dupe by doing equivalent of:  stripMatch not in entryDict[predicate]:
    entryDict[predicate].append(ctx_sn)

def regexRecursion(searchText,regexArray,tripleCheck,recursionDepthPlusOne,mainSubject,entryDict,structID):
    #Start with the lowest level structural IDs.  Find everything that matches them and pull out the structID
    #If we can match all the way to the end then great, done.
    #If we can't match all the way to the end then we move up a structural ID level and start again
    #If we run out of structural ID levels then it is a failed search
    
    tripleTest = regexArray[tripleCheck][recursionDepthPlusOne]
    resultTripleTest = tripleTest.findall(searchText)
    if resultTripleTest:
        if (recursionDepthPlusOne) >= len(regexArray[tripleCheck])-1:
            for match in resultTripleTest:
                stripMatch=stripExtraXML(match)
                fillDict(entryDict, regexArray, tripleCheck, mainSubject, stripMatch, structID)
        else:
            for match in resultTripleTest:
                regexRecursion(match,regexArray,tripleCheck,recursionDepthPlusOne+1,mainSubject,entryDict,structID)

# Create the regex needed to extractthe closest structural ID tag
# during the regexRecursion function.
structIDregex=[]
structIDregex.append(re.compile('<DIV0 ID="(.+?)">(.+?)</DIV0>'))
structIDregex.append(re.compile('<DIV1 ID="(.+?)">(.+?)</DIV1>'))
structIDregex.append(re.compile('<DIV2 ID="(.+?)">(.+?)</DIV2>'))
structIDregex.append(re.compile('<P ID="(.+?)">(.+?)</P>'))

def extractionCycle(orlandoRAW, regexArray, NameTest, mainSubject, options):
    entryDict=dict()
    commacheck3=False #controls the insertion of commas at the end of the objects
    count = 0
    for line in orlandoRAW:
        LineTest = NameTest.search(line)
        #print LineTest
        if LineTest:
            mainSubject=LineTest.group(1)
            entryDict['ID']=mainSubject
            count += 1
            if options.verbose:
                print mainSubject
            for tripleCheck in regexArray:
                if options.capture_context:
                    structID=""
                    for IDcheck in structIDregex:
                        IDcheckResults=IDcheck.findall(line)
                        for result in IDcheckResults:
                            structID=result[0]
                            searchText=result[1]
                            regexRecursion(searchText,regexArray,tripleCheck,
                                           1,mainSubject,entryDict,structID)
                else:
                    regexRecursion(line,regexArray,tripleCheck,1,mainSubject,entryDict)
            options.emitter.stash(entryDict,commacheck3,options)
            commacheck3=True
        entryDict = dict()
        if options.limit and count >= options.limit:
            break

from rdflib import Graph, Literal, BNode, RDF, ConjunctiveGraph, URIRef
from rdflib.namespace import FOAF, DC, Namespace
a_context = URIRef("http://bibliographica.org/entity/E10009")

XFN = Namespace('http://vocab.sindice.com/xfn#')
BRW = Namespace('http://orlando.cambridge.org/public/svPeople?person_id=')
WP  = Namespace('http://en.wikipedia.org/wiki/')
ORL = Namespace('http://orlan.do/')
BLANK = Namespace('http:///')
LOCAL = Namespace('')
BLANK_HACK = False
BLANK_WRITERS = False # FIXME ideally this would be True so writer ids like _:abdyma

ID_GENERATOR = BRW    
if LOCAL_IDENTIFIERS:
    #ID_GENERATOR = BNode     # 
    #ID_GENERATOR = LocalNode # 
    ID_GENERATOR = LOCAL 
def make_node(an_id):
    return ID_GENERATOR[an_id]

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

if LOCAL_IDENTIFIERS:
    for k in predicate_to_type.keys():
        predicate_to_type[k] = LOCAL[k]

class FormatEmitter(object):
    def __init__(self,options):
        self.options = options
        if hasattr(options,'outfile'):
            self.outfile = codecs.open(options.outfile, encoding='utf-8', mode='w')
        self.entries = []

    def stash(self,entryDict,commacheck3,options):
        self.entries.append(entryDict)
    def go(self):
        options = self.options
        regexTests = codecs.open(options.regexes, encoding='utf-8', mode='r')
        print "begin"
        self.prepOutfile()
        regexArray = regexTestLoad(regexTests,options)
        NameTest = re.compile('<ENTRY.+?ID="([\w, ]+)".*>',re.I)
        print "extraction starts"
        with codecs.open(options.infile, encoding='utf-8', mode='r') as orlandoRAW: 
            mainSubject=None
            extractionCycle(orlandoRAW, regexArray, NameTest, mainSubject, options)
        print "extraction ends"
        self.concludeOutfile()
        print "end"

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
        self.store = ConjunctiveGraph()
        print "conext_aware:",self.store.context_aware
        self.store.bind('f',FOAF)
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
            #self.store.add((node,FOAF.name,Literal(standard_name)))
            self.store.addN([(node,FOAF.name,Literal(standard_name),a_context)])
            if options.state_the_obvious:
                if typ <> FOAF.Person:
                    self.store.add((node,RDF.type,typ))
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
            standardNames = entry.get('standardName',[])
            standardName = standardNames and standardNames[0]['sn'] or None
            if standardName == None:
                print "skipping entry without a standardName"
                continue

            writer = self.get_entity(
                standardName,
                make_node(entry['ID']),
                typ=FOAF.Person) # BRW normally not BNode

            for predicate,values in entry.items():
                if predicate in ['ID','standardName']: # TODO(smurp): add date-of-{birth,death}
                    continue
                if predicate in predicate_to_type.keys():
                    pred = predicate_to_type[predicate]

                    # add some interesting relations
                    if bogus_relations:
                        k = (entry['ID'],predicate)
                        if bogus_relations.has_key(k):
                            values.append(bogus_relations[k])

                    for ctx_sn_d in values:
                        if type(ctx_sn_d) <> dict:  # handle uncontextualized objects
                            ctx_sn_d = {'sn':ctx_sn_d}
                        if predicate in predicates_to_groups:
                            obj = self.get_group(ctx_sn_d['sn'])
                        else:
                            obj = self.get_person(ctx_sn_d['sn'])
                            if obj == writer:
                                continue 
                        quad_or_triple = [writer,pred,obj]
                        if ctx_sn_d.has_key('ctx'):
                            ctx = URIRef(ctx_sn_d['ctx']) # TODO(smurp): BNode or Local
                            quad_or_triple.append(ctx)
                        #print "    quad =",quad_or_triple
                        if len(quad_or_triple) > 3:
                            self.store.addN([quad_or_triple]) # a quad
                        else:
                            self.store.add(quad_or_triple) # a triple

class TurtleEmitter(RDFEmitter):
    # http://rdflib.readthedocs.org/en/latest/_modules/rdflib/plugins/serializers/turtle.html
    def concludeOutfile(self):
        self.generate_graph()
        self.outfile.write(self.store.serialize(format='turtle'))

class NQuadsEmitter(RDFEmitter):
    # http://rdflib.readthedocs.org/en/latest/_modules/rdflib/plugins/serializers/nquads.html
    def concludeOutfile(self):
        self.generate_graph()
        self.outfile.write(
            self.store.serialize(
                format="nquads"))

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

class TrigEmitter(RDFEmitter):
    # http://rdflib.readthedocs.org/en/latest/_modules/rdflib/plugins/serializers/trig.html
    def concludeOutfile(self):
        self.generate_graph()
        self.outfile.write(
            self.store.serialize(
                format="trig"))
    
if __name__ == "__main__":
    only_predicates = 'standardName,dateOfBirth,dateOfDeath'.split(',')
    only_predicates.extend(predicate_to_type.keys())
    defaults = dict(
        regexes = 'orlando2RDFregex4.txt',
        infile = 'orlando_all_entries_2013-03-04.xml',
        only_predicates = only_predicates,
        outfile = 'orlando_all_entries_2013-03-04.json')
    
    from optparse import OptionParser
    parser = OptionParser()
    parser.add_option("--outfile",
                      default = defaults['outfile'],
                      help = "output filename, default:"+\
                          defaults['outfile'])
    parser.add_option("--regexes",
                      default = defaults['regexes'],
                      help = "regex tests filename, default: "+\
                          defaults['regexes'])
    parser.add_option("--infile",
                      default = defaults['infile'],
                      help = "input filename, default:"+\
                          defaults['infile'])
    parser.add_option("--limit",
                      type = "int",
                      help = "limit the number of entries processed")    
    parser.add_option("-x","--capture_context",
                      default = False,
                      action = 'store_true',
                      help = "capture the context of relations")
    parser.add_option("--pretty",
                      action = 'store_true',
                      help = "make json or xml output more human readable")
    parser.add_option(
        "--only_predicates",
        default = ','.join(defaults['only_predicates']),
        help = "the predicates to keep, default: %(only_predicates)s" % defaults)    
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
    parser.add_option("-V","--version",
                      action = 'store_true',
                      help = "show version")
    parser.add_option("--man",
                      action = 'store_true',
                      help = "show the manual for this program")
    parser.version = __version__
    parser.usage =  """
    e.g.
       %prog --doctest
          Perform unit tests on the %prog
       
       %prog 
          The default operation is equivalent to:
              ./orlandoScrape.py \\
                 --infile orlando_all_entries_2013-03-04.xml \\
                 --outfile orlando_all_entries_2013-03-04.json \\
                 --regexes orlando2RDFregex4.txt \\
                 --only_predicates "standardName,childOf,dateOfBirth,dateOfDeath,parentOf"

       %pro
          During testing this is nice
             ./orlandoScrape.py --outfile data/test_1.ttl --limit 1 --infile orlando_all_entries_2013-03-04.xml  -v

       %prog --only_predicates ""
          Run without constraint on the predictes emitted.
      
    """
    (options,args) = parser.parse_args()
    show_usage = True
    if options.only_predicates:
        options.only_predicates = options.only_predicates.split(',')
    if options.doctest:
        show_usage = False
        import doctest
        doctest.testmod(verbose=options.verbose)
        sys.exit()
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
    if hasattr(options,'emitter'):
        options.emitter.go()
    elif show_usage:
        parser.print_help()
