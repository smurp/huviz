#!/usr/bin/env python
__version__='0.0.1'
__doc__ = """
OrlandoXML.py is a tool for manipulating the XML files for the Orlando project.


pycli.py is python boilerplate code written by
Shawn Murphy<smurp@smurp.com> to act as a starting point for his
command-line programs.  It offers basic features such as:
  - doctest testing
  - automatic manual creation
  - version inspection
"""

import sys

# solve the "ordinal not in range(128)" problem
reload(sys) # http://demongin.org/blog/808/
sys.setdefaultencoding('utf-8')

from bs4 import BeautifulSoup

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

def export_json(options,soup):
    with open(options.outfile,'w') as f:
        for entry in soup('entry'):
            for s in entry('standard'):
                print s.strings.next()
            #f.write(entry('standard'))



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
        export_json(options,soup)
