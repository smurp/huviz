huviz
=====

![Image](./graph_ex1.png?raw=true)

# Demonstration Sites

**/cwrc/HuViz** is a fork of [/smurp/huviz](https://github.com/smurp/huviz) where development occurs

# Installation

* [Production](http://huviz.dev.nooron.com/)
* [Beta](http://beta.huviz.dev.nooron.com/)
* [Alpha](http://alpha.huviz.dev.nooron.com/)


# What is HuViz?

HuViz is a Semantic Web graph visualization system which uses a powerful system of interactions which can
be captured to produce replayable scripts.  It is rather like SQL (the Structured Query Language) but applied
to the task of creating graph visualizations.


## Sets

The commands in HuViz can be thought of as moving nodes around among various sets, where each set behaves in a particular way on screen.

* Activated -- the nodes which are placed into the graph and which cause other nodes connected to them to become graphed.
               Dragging a node into the graph Activates it.
* Discarded -- the nodes which have been placed in the disard bin and which can't be pulled into the graph by activated nodes.

* Graphed -- the nodes which are in the graph, either by being activated or by being pulled into the graph
* Hidden -- the nodes which have been made invisible to reduce clutter, but which can be pulled into the graph by activated nodes
* Labelled -- the nodes which show their labels continuously, rather than just when hovered near
* Nameless -- the nodes which do not have pretty names
* Pinned -- the nodes which have been pinned in particular places on the graph
* Selected -- the nodes which have their named edges cataloged in the box labelled "Edges of the Selected Nodes" for the Draw verb to work on
* Shelved -- the nodes which are kept, disconnected, on display on the sorted, circular "Shelf" around the central graph


## Verbs

The Verbs are the operations which move nodes between the various sets, ie sets of nodes in particular states.

* Activate / Deactivate
* Wander
* Walk
* Select / Unselect
* Draw
* Label / Unlabel
* Shelve
* Hide
* Discard / Retrieve
* Pin / Unpin



# Installation

    # Install huviz from github
    git clone https://github.com/smurp/huviz.git

## Installation (for running the server)


    # install NodeJS using NVM for most flexibility
    # known to work on NodeJS >= v6.11.3
    # (as of this writing, the latest Long Term Support version)

    https://github.com/creationix/nvm#install-script

    # Install `nvm` using the curl command in 'Install Script'.
    # Then quit that Terminal window and start a new one to make sure its firing up automatically.
    # There are tips at the bottom of the NVM README in case of problems.

    # Then install the LTS version of `node` itself like this:
    nvm install --lts

    # Make sure you've got a suitable version of Node
    node -v # expecting v6.11.3 or later

    # Then do classic normal npm stuff
    npm install # install needed modules


# Running the server

    npm start

# Development

## Running the server during development

    npm run watch

## Running CLI tests

THIS IS CURRENTLY DISABLED during the decaffeination process.

    npm run watch

    # bail on first error
    BAIL=1 npm run watchTest

uses https://www.npmjs.com/package/npm-watch https://www.npmjs.com/package/mocha

## Developing `quaff-lod`


Run the auto build process while you are editing `src/quaff-lod-worker.js`

```sh
$ cd quaff-lod
$ npm run watch
```

Run the development version of huviz and tell it where to find the dev
version of `quaff-lod`

```sh
$ cd huviz
$ QUAFF_PATH=../quaff-lod/ npm run watch
```


## Doing releases

Per https://github.com/geddski/grunt-release

### Patch Release:

Two choices:

* `npx grunt release`
* `npx grunt release:patch`

### Minor Release

* `npx grunt release:minor`

### Major Release

* `npx grunt release:major`


## Installation (for running orlandoScrape.py)

    # On OSX Mavericks install homebrew
    http://crosstown.coolestguidesontheplanet.com/os-x/55


    # If you want to run
    # On OSX you should set up pyenv-virtualenv
    https://github.com/yyuu/pyenv-virtualenv

    # Make a virtualenv
    pyenv virtualenv huvizenv

    # use it
    echo "PYENV_VERSION=huvizenv" > .python-version

    # install the python requirements
    pip install -r requirements.txt

### Operating orlandoScrape.py

    --limit 2
        limit the number of writers processed


### Converting XML to Turtle (TTL)

    ./orlandoScrape.py --outfile data/test_20.ttl  --limit 20 -v

See [data/test_20.ttl](../master/data/test_20.ttl)

### Converting XML to [NQuads](http://www.w3.org/TR/n-quads/)

    ./orlandoScrape.py  --outfile data/test_1.nq   --limit 1

See [data/test_q.nq](../master/data/test_1.nq)


### Converting XML to JSON

  How to produce the full JSON output as `orlando_all_entries_2013-03-04.json` (the default behaviour):

    ./orlandoScrape.py --infile orlando_all_entries_2013-03-04.xml --outfile orlando_all_entries_2013-03-04.json  --regexes orlando2RDFregex4.txt


  How to produce the poetess JSON output as `orlando_poetesses_2013-02-12.json`:

    ./orlandoScrape.py --infile orlando_poetesses_2013-02-12.xml --outfile orlando_poetesses_2013-02-12.json  --regexes orlando2RDFregex4.txt

  How to produce orlando_timeline.json

    egrep 'dateOf|standardName' orlando2RDFregex4.txt > orlando_timeline.regex
    ./orlandoScrape.py --infile orlando_all_entries_2013-03-04.xml --outfile orlando_timeline.json --regex orlando_timeline.regex -v


### Running the Orlando timeline locally

    git clone https://github.com/smurp/huviz
    python -m SimpleHTTPServer
    open http://localhost:8000/timeline.html

### Generating tag_tree.json

    ./extractOrlandoTagInfo.py --compact --outfile orlando_tag_tree.json

# Gallery

### [Finite state machine](http://alpha.huviz.dev.nooron.com/#load+/data/Running_state_machine.ttl+with+/data/owl_mini.ttl)

![Demo of finite state machine diagram](./docs/running_graph.png?raw=true)


### [Demo of CWRC subject-centric data](http://alpha.huviz.dev.nooron.com/#load+/data/VirginiaWoolfSubjectCentricDH2019.ttl+with+http://sparql.cwrc.ca/ontology/cwrc.ttl)

![Demo of moderately dense graph](./docs/huviz_vwoolf_cluster.png?raw=true)


### 3191 Nodes

![Graph of 3191 nodes pulled from CWRC SPARQL](./docs/3191_nodes.png?raw=true)
