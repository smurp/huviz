#!/bin/sh

# generate a comma-delimited list of the ids of the poetesses

grep "DIV0--1" poetesses_decomposed.xml  | cut -c 17-22 | sort | uniq |  tr "\n" ',' 