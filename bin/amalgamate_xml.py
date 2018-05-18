#!/usr/bin/env python
import os
import sys
from bs4 import BeautifulSoup

header = """<?xml version="1.0" encoding="UTF-8"?>
<ORLANDO-CWRC>

"""
footer = """</ORLANDO-CWRC>
"""

root = "orlando_2017-03-28"

def get_first_line(body):
    return body.split("\n",1)[0]

def prettify(which, id):
    prefix = which[0]
    bs = BeautifulSoup(open(os.path.join(root,which, i+"-" + prefix + ".xml")), 'xml')
    sgm = i + "-" + prefix + ".sgm"
    out = bs.prettify(encoding='utf-8')
    [first, rest] = out.split("\n",1)
    return rest.replace(sgm, i) # the ID in the files look like "atwoma-b.sgm" rather than "atwoma"

def get_sex(body):
    line = get_first_line(body)
    if line.find('FEMALE') > -1:
        return 'FEMALE'
    return "MALE"

if len(sys.argv) < 2:
    print "usage: amalgamate_xml list,of,auth,ids"
    print ""
    print "  amalgamate_xml.py abdyma,atwoma,fordis"
    print
    print "Expects the following paths to be available, eg:"
    print "   %s/biography/atwoma-b.xml" % root
    print "   %s/writing/atwoma-w.xml" % root
    sys.exit()

authids = sys.argv[1].split(',')

print header

for i in authids:
    bio = prettify("biography",i)
    sex = get_sex(bio)
    print """ <ENTRY PERSON="BRWWRITER" SEX="%s" ID="%s">""" % (sex, i)
    print bio
    print prettify("writing", i)
    print """ </ENTRY>"""

print footer
