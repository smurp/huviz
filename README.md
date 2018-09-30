huviz
=====

![Image](./graph_ex1.png?raw=true)

# Demonstration Sites

* [Production](http://huvz.dev.nooron.com/)
* [Beta](http://beta.huvz.dev.nooron.com/)
* [Alpha](http://alpha.huvz.dev.nooron.com/)


# Installation

    # Install huviz from github
    git clone https://github.com/smurp/huviz.git

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

# Running the server during development

    npm run dev

# Runner CLI tests during development

    npm run watchTest

uses https://www.npmjs.com/package/npm-watch https://www.npmjs.com/package/mocha

# Running the server

    npm start

# Operating orlandoScrape.py

    --limit 2
        limit the number of writers processed


## Converting XML to Turtle (TTL)

    ./orlandoScrape.py --outfile data/test_20.ttl  --limit 20 -v

See [data/test_20.ttl](../master/data/test_20.ttl)

## Converting XML to [NQuads](http://www.w3.org/TR/n-quads/)

    ./orlandoScrape.py  --outfile data/test_1.nq   --limit 1

See [data/test_q.nq](../master/data/test_1.nq)


## Converting XML to JSON

  How to produce the full JSON output as `orlando_all_entries_2013-03-04.json` (the default behaviour):

    ./orlandoScrape.py --infile orlando_all_entries_2013-03-04.xml --outfile orlando_all_entries_2013-03-04.json  --regexes orlando2RDFregex4.txt


  How to produce the poetess JSON output as `orlando_poetesses_2013-02-12.json`:

    ./orlandoScrape.py --infile orlando_poetesses_2013-02-12.xml --outfile orlando_poetesses_2013-02-12.json  --regexes orlando2RDFregex4.txt

  How to produce orlando_timeline.json

    egrep 'dateOf|standardName' orlando2RDFregex4.txt > orlando_timeline.regex
    ./orlandoScrape.py --infile orlando_all_entries_2013-03-04.xml --outfile orlando_timeline.json --regex orlando_timeline.regex -v


# Running the Orlando timeline locally

    git clone https://github.com/smurp/huviz
    python -m SimpleHTTPServer
    open http://localhost:8000/timeline.html

# Generating tag_tree.json

    ./extractOrlandoTagInfo.py --compact --outfile orlando_tag_tree.json
