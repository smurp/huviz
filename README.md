huviz
=====

# General Paramaters for orlandoScrape.py

    --limit 2 
        limit the number of writers processed


# Converting XML to TTL

    ./orlandoScrape.py --outfile test.ttl 



# Converting XML to JSON

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

