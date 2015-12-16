
BASE_ARGS = \
	--use_onto \
        --xpath orlando2RDFxpath3.txt --rules xpaths \
	--progress
#        --verbose

#--infile orlando_all_entries_2013-03-04_FORMATTED.xml \

ARGS = 	--all_predicates ${BASE_ARGS}

TMPFILE := $(shell mktemp /tmp/XXXXXXXXXXXXXX).nq

all: ballrm abdyma shakwi balfcl brontes

broken: atwoma relations poetesses brontes

abdyma:
	./orlandoScrape.py --outfile ${TMPFILE} --ids abdyma ${ARGS}
	sort < ${TMPFILE} > data/abdyma.nq
	rm ${TMPFILE}

atwoma:
	./orlandoScrape.py --outfile ${TMPFILE} --ids atwoma  ${ARGS}
	sort < ${TMPFILE} > data/atwoma.nq
	rm ${TMPFILE}

byroau:
	./orlandoScrape.py --outfile ${TMPFILE} --ids byroau ${ARGS}
	sort < ${TMPFILE} > data/byroau.nq
	rm ${TMPFILE}

ballrm:
	./orlandoScrape.py --outfile ${TMPFILE} --ids ballrm ${ARGS}
	sort < ${TMPFILE} > data/ballrm.nq
	rm ${TMPFILE}

poetesses:
	./orlandoscrape.py --outfile ${TMPFILE} \
		--ids `bin/get_poetesses_ids.sh` ${BASE_ARGS}
	sort < ${TMPFILE} > data/poetesses.nq
	rm ${TMPFILE}

brontes:
	./orlandoscrape.py --outfile ${TMPFILE} --id bronem,bronch,bronan ${ARGS}
	sort < ${TMPFILE} > data/brontes.nq
	rm ${TMPFILE}

shakwi:
	./orlandoscrape.py --outfile ${TMPFILE} --id shakwi ${ARGS}
	sort < ${TMPFILE} > data/shakwi.nq
	rm ${TMPFILE}

byroau:
	./orlandoscrape.py --outfile ${TMPFILE} --id byroau ${ARGS}
	sort < ${TMPFILE} > data/byroau.nq
	rm ${TMPFILE}

relations:  # commented out religiousInfluence and connectionToOrganization
	./orlandoscrape.py --outfile ${TMPFILE} ${BASE_ARGS}
	sort < ${TMPFILE} > data/relations.nq
	rm ${TMPFILE}

early_writers: 
	./orlandoScrape.py --outfile ${TMPFILE} \
		--id boccgi,chauge,chripi,dant__,helo__,hildbi,julino,kempma,maloth,margna,marifr,petr__ \
		${ARGS}
	sort < ${TMPFILE} > data/early_writers.nq
	rm ${TMPFILE}
