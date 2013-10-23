#!/usr/bin/env python
__version__='1.1.0'
__doc__ = """
Script to convert XML information from the Orlanda project mark-up to
various output formats.  It produces JSON and starting to produce Turtle (TTL).

This file is now in GitHub at:
  https://github.com/smurp/huviz

On 2013-10-10 it was forked from orlandoScrape5-1.py which bore the comment:
# Script by John Simpson, Postdoctoral Fellow with:
# 1. Text Mining & Visualization for Literary History
# 2. INKE, Modeling & Prototyping
# john.simpson@ualberta.ca / @symulation
#
# Copyright CC BY-SA 3.0  See: http://creativecommons.org/licenses/by-sa/3.0/
#
# This version was modified for the TM&V hackfest to spit out data in JSON
# An additional modification so that the regex is only compiled once and then read out an array

"""


import sys
# solve the "ordinal not in range(128)" problem
reload(sys) # http://demongin.org/blog/808/
sys.setdefaultencoding('utf-8')

import re
import codecs
import json


def regexTestLoad(regexTests,options):
    arrayCounter=0
    regexArray = {}
    for line in regexTests:
        line = line.replace('\n','')
        parts = line.split('|')
        if options.only_predicates and not parts[0] in options.only_predicates:
            continue
        regexArray[arrayCounter]=parts
        
        n=1
        arrayDepth = len(regexArray[arrayCounter])
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
 

def fillDict(entryDict, regexArray, tripleCheck, mainSubject, stripMatch):
    predicate = regexArray[tripleCheck][0]
    if options.only_predicates and not (predicate in options.only_predicates):
        return
    if predicate not in entryDict:
        #print "  ",predicate
        entryDict[predicate]=[stripMatch]
    else:
        if stripMatch not in entryDict[predicate]:
            entryDict[predicate].append(stripMatch)


def regexRecursion(searchText,regexArray,tripleCheck,recursionDepthPlusOne,mainSubject,entryDict):
    #print "predicate", regexArray[tripleCheck][0]
    #print "tripleCheck", regexArray[tripleCheck][recursionDepthPlusOne]
    tripleTest = regexArray[tripleCheck][recursionDepthPlusOne]
    resultTripleTest = tripleTest.findall(searchText)
    if resultTripleTest:
        if (recursionDepthPlusOne) >= len(regexArray[tripleCheck])-1:
            for match in resultTripleTest:
                stripMatch=stripExtraXML(match)
                fillDict(entryDict, regexArray, tripleCheck, mainSubject, stripMatch)
        else:
            for match in resultTripleTest:
                regexRecursion(match,regexArray,tripleCheck,recursionDepthPlusOne+1,mainSubject,entryDict)

def arity_gt_n(entryDict,predicate,n):
    # check to see if the number of values on a slot are greater than N
    """
    >>> arity_gt_n({'a':[1,2],'b',1}
    False
    >>> arity_gt_n({'a':[1,2],'a',1}
    True
    >>> arity_gt_n({'a':[1,2],'a',2}
    False

    """
    return entryDict.has_key(predicate) and len(entryDict[predicate]) > n
def arity_gt_1(entryDict,predicate):
    return arity_gt_n(entryDict,predicate,1)

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
                regexRecursion(line,regexArray,tripleCheck,1,mainSubject,entryDict)
            options.emitter.stash(entryDict,commacheck3,options)
            commacheck3=True
        entryDict = dict()
        if options.limit and count >= options.limit:
            break

from rdflib import Graph, Literal, BNode, RDF
from rdflib.namespace import FOAF, DC, Namespace

XFN = Namespace('http://vocab.sindice.com/xfn#')
BRW = Namespace('http://orlando.cambridge.org/public/svPeople?person_id=')
WP  = Namespace('http://en.wikipedia.org/wiki/')
ORL = Namespace('http://orlan.do/')
BLANK = Namespace('http:///')
BLANK_HACK = False
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
        >>> fe = FormatEmitter()
        >>> fe.next_id()
        1
        >>> fe.next_id()
        2
        """
        if not hasattr(self,'current_id'):
            self.current_id = 0
        self.current_id += 1
        return self.current_id
        
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
        self.store.bind('d',DC)

        self.store.bind('w',BRW)
        self.store.bind('x',XFN)
        self.entities = {}

    def get_entity(self,standard_name,node=None,ID=None,typ=None):
        if not self.entities.has_key(standard_name):
            if node == None:
                if ID == None:
                    ID = self.next_id()
                if BLANK_HACK:
                    node = BLANK[str(ID)]
                else:
                    node = BNode(ID)
            self.store.add((node,FOAF.name,Literal(standard_name)))
            if options.state_the_obvious:
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
            standardName = standardNames and standardNames[0] or None
            if standardName == None:
                print "skipping entry without a standardName"
                continue
            writer = self.get_entity(standardName,BRW[entry['ID']],typ=FOAF.Person)

            #if entry.has_key('ID'):
            #    self.store.add((writer,RDF.about,BRW[entry['ID']]))

            for predicate,values in entry.items():
                if predicate in ['ID','standardName']:
                    continue
                if predicate in predicate_to_type.keys():
                    pred = predicate_to_type[predicate]

                    if bogus_relations:
                        k = (entry['ID'],predicate)
                        if bogus_relations.has_key(k):
                            values.append(bogus_relations[k])

                    for standard_name in values:
                        if predicate in predicates_to_groups:
                            obj = self.get_group(standard_name)
                        else:
                            obj = self.get_person(standard_name)
                            if obj == writer:
                                continue 
                        self.store.add((writer,pred,obj))
                        # WORKING on linking people


class TurtleEmitter(RDFEmitter):
    def concludeOutfile(self):
        self.generate_graph()
        self.outfile.write(self.store.serialize(format='turtle'))

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
    if hasattr(options,'emitter'):
        options.emitter.go()
    elif show_usage:
        parser.print_help()
