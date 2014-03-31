

all: ballrm abdyma atwoma poetesses

ballrm:
	./orlandoScrape.py --outfile data/ballrm.nq --ids ballrm --state_the_obvious --all_predicates  --use_onto

abdyma:
	./orlandoScrape.py --outfile data/abdyma.nq --ids abdyma --state_the_obvious --all_predicates  --use_onto

atwoma:
	./orlandoScrape.py --outfile data/atwoma.nq --ids atwoma --state_the_obvious --all_predicates  --use_onto

poetesses:
	./orlandoscrape.py --outfile data/poetesses.nq --ids `bin/get_poetesses_ids.sh` --state_the_obvious --use_onto
