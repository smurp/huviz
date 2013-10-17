#!/usr/bin/env python

"""
This program captures the data which drives creation of the "Active Tags" 
hierarchy in the bottom right corner of the OVis application.

The source code for OVis is at:
  https://github.com/patrickdemond/OVis/

The relationship hierarchy is embedded in the C++ source in the file ovOrlandoTagInfo.ccp

The simplest thing to do appears to be to simply find the region of the file
containing this data and filter it out.  We could embed the file right in this
project but then the opportunity to inherit from its improvements would be lost.
Best to just grab it via the web.
"""

defaults = dict(
    src_url = "https://raw.github.com/patrickdemond/OVis/master/source/ovOrlandoTagInfo.cpp")


__version__='1.0.0'

import sys
import json
import urllib2

class Node(object):
    """
    A tree is a set of children of an unlabelled root node.
    A node is a label and a set of children.
    A set of children is a keyed set of nodes.

    >>> root = Node("","")
    >>> root.am_root()
    True
    >>> bio = root.add("","BIOGRAPHY","Biography")
    >>> root.tag_to_node['BIOGRAPHY'].label
    'Biography'
    >>> root == root.tag_to_node['']
    True
    >>> birth = root.add("BIOGRAPHY","BIRTH","Birth")
    >>> birth.children
    {}
    >>> root.tag_to_node['BIRTH'].label
    'Birth'
    >>> root.children['BIOGRAPHY'].children['BIRTH'].label == 'Birth'
    True
    >>> len(root.tag_to_node.keys())
    3
    >>> sorted(root.tag_to_node.keys())
    ['', 'BIOGRAPHY', 'BIRTH']
    >>> sorted(root.children.keys())
    ['BIOGRAPHY']
    >>> root.as_json(compact=True)
    '{"BIOGRAPHY":["Biography",{"BIRTH":["Birth"]}]}'

    """
    def am_root(self):
        return self.__dict__.has_key('tag_to_node')
    def __init__(self,tag="",label=""):
        self.tag = tag
        self.label = label
        self.children = {}
        if not tag:
            # we are the root node
            self.tag_to_node = {"":self}
    def add(self,parent_tag,tag,label):
        parent_node = self.tag_to_node[parent_tag]
        node = Node(tag,label)
        parent_node.children[tag] = node
        self.tag_to_node[tag] = node
        return node
    def as_tree(self):
        #print self.children
        #return
        out = {}
        for tag,node in self.children.items():
            val = [node.label]
            out[tag] = val
            if node.children:
                val.append(node.as_tree())
        return out
    def as_json(self,pretty=False,compact=False):
        kwargs = {}
        if pretty:
            kwargs = dict(sort_keys=True,indent=4)
        if compact:
            kwargs = dict(separators=(',', ':'))
        return json.dumps(self.as_tree(),**kwargs)

def get_raw_TagInfo(options):
    if options.infile:
        if options.verbose:
            print >> sys.stderr, "opening",options.infile
        with open(options.infile,'r') as f:
            out = f.read()
    elif options.src_url:
        if options.verbose:
            print >> sys.stderr, "retrieving",options.src_url
        response = urllib2.urlopen(options.src_url)
        out = response.read()
    return out
    
def grovel(raw,options):
    tree = Node("","")
    in_the_clover = False
    add_next_line = True
    count = 0
    for line in raw.split("\n"):
        if line.count("add in the ordered tags"):
            in_the_clover = True
            continue
        if not in_the_clover:
            continue
        if line.strip()=="}":
            break  # finish processing when } is encountered
        if line.count('::Instance->Add'):
            add_next_line = True
            continue
        if add_next_line:
            add_next_line = False
            #parent,tag,label = line.split(',',3)
            count += 1
            them = extract_triple(line)
            if len(them) <> 3:
                if options.verbose:
                    print >> sys.stderr, line,them
                continue
            if options.verbose:
                print >> sys.stderr, them[2]
            tree.add(*them)
            if options.limit and options.limit <= count:
                break
    return tree

# http://www.pythonregex.com/
import re
regex = '"([^\"]*)"'
pat = re.compile(regex)
def extract_triple(line):
    """
    >>> e = extract_triple
    >>> e('      "PTAG", "TAG", "A", false );')
    ['PTAG', 'TAG', 'A']
    >>> e('      "PTAG", "TAG", "A,B,C", false );')
    ['PTAG', 'TAG', 'A,B,C']
    """
    return pat.findall(line)[:3]

        
        
if __name__ == "__main__":        
    from optparse import OptionParser
    parser = OptionParser()
    parser.add_option("--src_url",
                      default = defaults['src_url'],
                      help = "the url to the ovOrlandoTagInfo.cpp file (or equivalent)")    
    parser.add_option("--infile",
                      #default = "../OVis/source/ovOrlandoTagInfo.cpp",
                      help = "the path to the ovOrlandoTagInfo.cpp file (or equivalent)")
    parser.add_option("--outfile",
                      help = "the path to file to fill with output")
    parser.add_option("--compact",
                      action = 'store_true',
                      help = "make the JSON compact")
    parser.add_option("--pretty",
                      action = 'store_true',
                      help = "make the JSON easy on the human eye, ie indent=4, sort_keys=True")    
    parser.add_option("--man",
                      action = 'store_true',
                      help = "generate a manual")
    parser.add_option("--doctest",
                      action = 'store_true',
                      help = "perform doc tests")
    parser.add_option("-v","--verbose",
                      action = 'store_true',
                      help = "be verbose in all things, go with god")
    parser.add_option("-V","--version",
                      action = 'store_true',
                      help = "show version")
    parser.add_option("--limit",
                      type = "int",
                      help = "the maximum number of nodes to add to the tree")
    parser.version = __version__
    parser.usage =  __doc__ + """
    e.g.
       %prog [--pretty|--compact]

       %prog --pretty --infile  "../OVis/source/ovOrlandoTagInfo.cpp"
          Grovel data out of a local copy of the file

       %prog 
          Grovel data of the the latest version of the file on github

       %prog --pretty
          Generate a human readable version
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
    if options.pretty or options.compact:
        tree = grovel(get_raw_TagInfo(options),options)
        args = {}
        if options.pretty:
            args['pretty'] = True
        if options.compact:
            args['compact'] = True
        output = tree.as_json(**args)
        if options.outfile:
            with open(options.outfile,"w") as outfile:
                outfile.write(output)
        else:
            print output
    elif show_usage:
        parser.print_help()
        
