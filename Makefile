
ARGS = --state_the_obvious \
	--all_predicates \
	--use_onto \
	--progress

all: ballrm abdyma atwoma poetesses

ballrm:
	./orlandoScrape.py --outfile data/ballrm.nq --ids ballrm ${ARGS}

abdyma:
	./orlandoScrape.py --outfile data/abdyma.nq --ids abdyma ${ARGS}

atwoma:
	./orlandoScrape.py --outfile data/atwoma.nq \
		--ids atwoma  ${ARGS}

poetesses:
	./orlandoscrape.py --outfile data/poetesses.nq \
		--ids `bin/get_poetesses_ids.sh` ${ARGS}
