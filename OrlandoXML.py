#!/usr/bin/env python
__version__='0.0.1'
__doc__ = """
OrlandoXML.py is a tool for manipulating the XML files for the Orlando project.

"""

import sys
# solve the "ordinal not in range(128)" problem
reload(sys) # http://demongin.org/blog/808/
sys.setdefaultencoding('utf-8')

from rdflib import Graph, Literal, BNode, RDF
from rdflib.namespace import FOAF, DC
store = Graph()

from bs4 import BeautifulSoup
from tagtree import load_TagTree

def read_xml(options):
    return BeautifulSoup(open(options.infile))

def decompose(options,soup):
    these = ['revisiondesc']
    these = ['orlandoheader']
    for this in these:
        for it in soup(this):
            it.decompose()

def prettify(options,soup):
    with open(options.outfile,'w') as f:
        f.write(soup.prettify())

tag_to_class = dict(name="Person",
                    orgname="Organization",
                    )

def preamble(options):
    orl_root = 'http://orlan.do/'
    store.bind('r',orl_root+'rel/')
    store.bind('w',orl_root+'writer/')
    store.bind('p',orl_root+'people/')
    store.bind('g',orl_root+'geog/')
    store.bind('i',orl_root+'inst/')
    store.bind('w',orl_root+'work/')
    store.bind('f',orl_root+'f/')
    
def export_ttl(options,soup):
    reltags = get_RelationalTagSet(options)
    semtags = get_SemanticTagSet(options)
    structags = get_StructuralTagSet(options)
    if True:
        for tag in options.struct2sem.split(','):
            semtags.add(tag)
            structags.remove(tag)
    #if 'standard' in structags:
    #    print "WHY IS standard IN structags?"
    entry_no = 0
    with open(options.outfile,'w') as f:
        if options.limit:
            search_kwargs = dict(limit=options.limit)
        for entry in soup.find_all('entry',limit=2):
            for child in entry.descendants:
                #if child.name in structags:
                #    continue
                if child.name == None:
                    continue
                #print dir(child)
                # When child.name == None then that means child is a TEXT node
                # eg in "<I>boo</I>" when the child is 'boo' then .name == None
                if child.name in reltags:
                    print "  " * len(list(child.parents)),child.name
                #print child.name, "=" * 100
                #print child

                #for s in entry('standard'):
                #print s.strings.next()
            #f.write(entry('standard'))
            entry_no += 1
            if options.limit and options.limit == entry_no:
                print "stopping at limit",entry_no
                break 
        print entry

def get_RelationalTagSet(options,
                         kwargs=dict(trans = lambda a: a.lower())):
    return set(load_TagTree(options.tagtree).get_tags(**kwargs))

def get_SemanticTagSet(options,**kwargs):
    return get_TagSet_by(options,'1',**kwargs)

def get_StructuralTagSet(options,**kwargs):
    return get_TagSet_by(options,'0',**kwargs)

import csv
def get_TagSet_by(options,sem_or_struct,upper=True):
    # sem_or_struct is 1 or 0 respectively
    # tag,doc_code,subtype_code,use_code,description,attribute,description_attr
    out = set([])
    with open('orlando_tag_admin.csv','r') as tag_meta:
        csv_reader = csv.DictReader(tag_meta)
        for row in csv_reader:
            if row['use_code'] == sem_or_struct:
                out.add(row['tag'].strip().lower())
    if options.verbose:
        print out
    return out
        

if __name__ == "__main__":
    defaults = dict(regexes = 'orlando2RDFregex3.txt',
                    #infile = 'orlando_entries_all_pub_c_2013-05-01.xml',
                    #infile = 'orlando_short.xml',
                    infile = 'orlando_term_poetess_2013-01-04.xml',
                    outfile = 'orlando.json')
                
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
                       default = 0,
                       type = "int",
                       help = "the max number of writers to process")
    parser.add_option("--struct2sem",
                      default = "standard",
                      type = "str",
                      help = "tags to switch from structural to semantic, comma-delim")
    parser.add_option("--tagtree",
                      default = "orlando_tag_tree.json",
                      type = "str",
                      help = "file containing tag tree, default: orlando_tag_tree.json")
    parser.add_option("--doctest",
                      action = 'store_true',
                      help = "perform doc tests")
    parser.add_option("--prettify",
                      action = 'store_true',
                      help = "dump the xml in pretty form")
    parser.add_option("--decompose",
                      action = 'store_true',
                      help = "bs4.decompose, ie remove tags: revisiondesc")
    parser.add_option("--man",
                      action = 'store_true',
                      help = "show the manual for this program")
    parser.add_option("-v","--verbose",
                      action = 'store_true',
                      help = "be verbose in all things, go with god")
    parser.add_option("-V","--version",
                      action = 'store_true',
                      help = "show version")
    parser.add_option("--int",
                      type="int",
                      help = "accept an integer")
    parser.add_option("--str",
                      help = "accept a string")
    parser.version = __version__
    parser.usage =  """
    e.g.
       %prog --doctest
          Perform unit tests on the %prog
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

    soup = read_xml(options)
    if options.decompose:
        decompose(options,soup)
    if options.prettify:
        prettify(options,soup)
        show_usage = False
        
    if show_usage:
        parser.print_help()
    
    if options.outfile.endswith('.json'):
        print "EXPORTING",options.outfile
        export_ttl(options,soup)
    
