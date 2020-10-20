#!/bin/sh

# Purpose:
#   Canonicalize JSON using the Python JSON library.
#   It does these things:
#     * sort the keys
#     * indent each level by 4

TMPFIL=`mktemp` # --suffix-.json /tmp/CANONICAL_XXXXXX`
cp $1 $TMPFIL
python -mjson.tool < $TMPFIL > $1

