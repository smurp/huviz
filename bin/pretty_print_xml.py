#!/usr/bin/env python
import sys
from bs4 import BeautifulSoup

bs = BeautifulSoup(open(sys.argv[1]), 'xml')
print bs.prettify()
