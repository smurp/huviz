huviz
=====

![Image](./graph_ex1.png?raw=true)

# Demonstration Sites
**/cwrc/HuViz** is a fork of [/smurp/huviz](https://github.com/smurp/huviz) where development occurs

# Installation

* [LINCS Production](https://huviz.lincsproject.ca/)
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

# Gallery

### [Finite state machine](http://alpha.huviz.dev.nooron.com/#load+/data/Running_state_machine.ttl+with+/data/owl_mini.ttl)

![Demo of finite state machine diagram](./docs/running_graph.png?raw=true)


### [Demo of CWRC subject-centric data](http://alpha.huviz.dev.nooron.com/#load+/data/VirginiaWoolfSubjectCentricDH2019.ttl+with+http://sparql.cwrc.ca/ontology/cwrc.ttl)

![Demo of moderately dense graph](./docs/huviz_vwoolf_cluster.png?raw=true)


### 3191 Nodes

![Graph of 3191 nodes pulled from CWRC SPARQL](./docs/3191_nodes.png?raw=true)
