#!/usr/bin/env python
__version__='1.1.0'
__doc__ = """
Script to convert XML information from the Orlanda project mark-up to
various output formats.  Ideally, RDF, JSON and space optimized JSON.

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
import re
import codecs
import itertools, collections

import json


def regexTestLoad(regexTests,options):
    arrayCounter=0
    regexArray = {}
    for line in regexTests:
        line = line.replace('\n','')
        regexArray[arrayCounter]=line.split('|')
        n=1
        arrayDepth = len(regexArray[arrayCounter])
        while n < arrayDepth:
           regexArray[arrayCounter][n] = re.compile(regexArray[arrayCounter][n])
           n+=1
        arrayCounter+=1
    return regexArray


def consume(iterator, n):
    collections.deque(itertools.islice(iterator, n))
    



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
    if regexArray[tripleCheck][0] not in entryDict:
        entryDict[regexArray[tripleCheck][0]]=[stripMatch]
    else:
        if stripMatch not in entryDict[regexArray[tripleCheck][0]]:
            entryDict[regexArray[tripleCheck][0]].append(stripMatch)


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
            for tripleCheck in regexArray:
                if options.verbose:
                    print mainSubject
                regexRecursion(line,regexArray,tripleCheck,1,mainSubject,entryDict)
            options.emitter.stash(entryDict,commacheck3,options)
            commacheck3=True
        entryDict = dict()
        if options.limit and count >= options.limit:
            break

class FormatEmitter(object):
    def __init__(self,options):
        self.options = options
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

    def prepOutfile(self):
        pass

class JSONEmitter(FormatEmitter):
    def concludeOutfile(self):
        kwargs = dict(sort_keys=True)
        if self.options.pretty:
            kwargs['indent'] = 4
        self.outfile.write(json.dumps(self.entries,**kwargs))
        self.outfile.close()

class TurtleEmitter(FormatEmitter):
    def concludeOutfile(self):
        for entry in self.entries:
            print entry

orlandoOutfile = None

if __name__ == "__main__":
    defaults = dict(regexes = 'orlando2RDFregex4.txt',
                    infile = 'orlando_all_entries_2013-03-04.xml',
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
                 --regexes orlando2RDFregex4.txt 


    """
    (options,args) = parser.parse_args()
    show_usage = True
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
