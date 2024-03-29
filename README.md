huviz
=====

![Image](./graph_ex1.png?raw=true)

# What is HuViz?

HuViz is a Semantic Web graph visualization engine which uses a powerful system of interactions which can
be captured to produce replayable scripts.  It is rather like SQL (the Structured Query Language) but applied
to the task of creating graph visualizations.  It runs as a stand-alone site and can be integrated into
other sites as a visualizer for their graph content.

## Pages about HuViz

* [http://smurp.github.io/huviz/](http://smurp.github.io/huviz/)
* [https://nooron.com/#huviz](https://nooron.com/#huviz)

## Deployments

* [Production](https://huviz.lincsproject.ca/)
* [Classic](https://huviz-classic.lincsproject.ca/) (in coffeescript, using D3v3)

## Papers and Presentations Mentioning HuViz
* [Software Integration in the Digital Humanities](https://www.canarie.ca/wp-content/uploads/16-Brown-Ilovan.pdf)
* [HuViz: From _Orlando_ to CWRC... And Beyond!](https://dblp.org/rec/conf/dihu/MartinLBMS18.html)
* [REED London and the Promise of Critical Infrastructure](https://dh2018.adho.org/en/reed-london-and-the-promise-of-critical-infrastructure/)

# Development and Issues

* Development occurs at: [https://github.com/smurp/huviz](https://github.com/smurp/huviz)
* Issues are maintained at:
  - [https://gitlab.com/calincs/access/HuViz/-/issues](https://gitlab.com/calincs/access/HuViz/-/issues)
     * related to [http://lincsproject.ca](http://lincsproject.ca)
  - [https://github.com/smurp/huviz/issues](https://github.com/smurp/huviz/issues)
     * low-level issues
     * relating to integrations, embedding and so on

## Wireframes for future directions

* [HuViz Overview](https://balsamiq.cloud/senbj2i/ppkgzk1)
* [Tab Details](https://balsamiq.cloud/su7hynz/p1rmtj6/r8AA1)
* [History Mockup](http://alpha.huviz.dev.nooron.com/more/historymockup)

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

## Install huviz from github
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
    # watches for changes
    # then runs build:*
    # which creates a new lib/huviz.dist.js
    # which triggers restarting the server

## Running Tests "Continuously"

    # in one window be running
    npm run watch

    # in another window run one of
    npm run watchTest # runs both unit tests and user tests whenever code changes
    npm run watchTest:user # runs just user tests continuously
    npm run watchTest:unit # runs just unit tests continuously

## Run all tests once (not continuously)

    npm run test # starts a server and runs both user tests and unit tests
    # prefixing the above with BAIL=1 stops test execution on first failure
    BAIL=1 npm run test

## To create new user tests

Install [Selenium-IDE](https://www.selenium.dev/selenium-ide/) and edit the file [test/user_tests.side](test/user_tests.side).

Watch [Selenium IDE Demo A tutorial for beginners](https://www.youtube.com/watch?v=ZG3VFDMaAlk) (15min) or
[Selenium IDE Tutorial For Beginners](https://www.youtube.com/watch?v=m4KpTvEz3vg) for a thorough (100min) tutorial.

## To create new unit tests

Add HuViz module unit tests in [test](test) using mocha and chai to match the existing style.

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

# System Diagram

![HuViz System Diagram](./docs/huviz_system_diagram.svg)
