
BASE_ARGS = \
	--use_onto \
	--progress

ARGS = 	--all_predicates ${BASE_ARGS}

all: ballrm abdyma atwoma poetesses brontes

ballrm:
	./orlandoScrape.py --outfile data/ballrm.nq --ids ballrm ${ARGS}

abdyma:
	./orlandoScrape.py --outfile data/abdyma.nq --ids abdyma ${ARGS}

atwoma:
	./orlandoScrape.py --outfile data/atwoma.nq \
		--ids atwoma  ${ARGS}

poetesses:
	./orlandoscrape.py --outfile data/poetesses.nq \
		--ids `bin/get_poetesses_ids.sh` ${BASE_ARGS}

brontes:
	./orlandoscrape.py --outfile data/brontes.nq \
		--id bronem,bronch,bronan ${ARGS}

shakwi:
	./orlandoscrape.py --outfile data/shakwi.nq \
		--id shakwi ${ARGS}

relations:  # commented out religiousInfluence and connectionToOrganization
	./orlandoscrape.py --outfile data/relations.nq \
		${BASE_ARGS}

early_writers: 
	./orlandoScrape.py --outfile data/early_writers.nq \
		--id boccgi,chauge,chripi,dant__,helo__,hildbi,julino,kempma,maloth,margna,marifr,petr__ \
		${ARGS}
