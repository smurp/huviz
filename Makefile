
BASE_ARGS = \
	--use_onto \
        --xpath orlando2RDFxpath3.txt --rules xpaths \
	--progress
#        --verbose
#        --infile orlando_all_entries_2013-03-04_FORMATTED.xml \
#        --infile atwoma.xml \
#        --infile abdyma.xml \

EXT=nq

ARGS = 	--all_predicates ${BASE_ARGS}

TMPFILE := $(shell mktemp /tmp/orlando-XXXXXXXXXXXXXX).${EXT}

all: individuals organizations periodicals publishing_houses genres

individuals: atwoma ballrm abdyma shakwi byroau

organizations: academie_des_femmes african_national_congress brontes female_antislavery_society newnham_college nuns the_1917_club the_17th_century_quakers men_and_womens_club

periodicals: yellow_book_and_poet taits_edinburgh_magazine englishwomans_review

publishing_houses: dial_press kelmscott_press minerva_press victoria_press

genres: famous_cookbooks

broken: relations poetesses

abdyma:
	./orlandoScrape.py --outfile ${TMPFILE} --ids abdyma ${ARGS}
	sort < ${TMPFILE} > data/abdyma.${EXT}
	rm ${TMPFILE}

abdyma_sql:
	./orlandoScrape.py --outfile abdyma.db --ids abdyma ${ARGS}

atwoma:
	./orlandoScrape.py --outfile ${TMPFILE} --ids atwoma  ${ARGS}
	sort < ${TMPFILE} > data/atwoma.${EXT}
	rm ${TMPFILE}

ballrm:
	./orlandoScrape.py --outfile ${TMPFILE} --ids ballrm ${ARGS}
	sort < ${TMPFILE} > data/ballrm.${EXT}
	rm ${TMPFILE}

byroau:
	./orlandoscrape.py --outfile ${TMPFILE} --id byroau ${ARGS}
	sort < ${TMPFILE} > data/byroau.${EXT}
	rm ${TMPFILE}

shakwi:
	./orlandoscrape.py --outfile ${TMPFILE} --id shakwi ${ARGS}
	sort < ${TMPFILE} > data/shakwi.${EXT}
	rm ${TMPFILE}

academie_des_femmes:
	./orlandoscrape.py --outfile ${TMPFILE} --id steige,barnna,loy_mi ${ARGS}
	sort < ${TMPFILE} > data/academie_des_femmes.${EXT}
	rm ${TMPFILE}

african_national_congress:
	./orlandoscrape.py --outfile ${TMPFILE} --id britve,renama,gordna,murpde,slovgi ${ARGS}
	sort < ${TMPFILE} > data/african_national_congress.${EXT}
	rm ${TMPFILE}

brontes:
	./orlandoscrape.py --outfile ${TMPFILE} --id bronem,bronch,bronan ${ARGS}
	sort < ${TMPFILE} > data/brontes.${EXT}
	rm ${TMPFILE}

female_antislavery_society:
	./orlandoscrape.py --outfile ${TMPFILE} --id elizhe,martha,fullma ${ARGS}
	sort < ${TMPFILE} > data/female_antislavery_society.${EXT}
	rm ${TMPFILE}

newnham_college:
	./orlandoscrape.py --outfile ${TMPFILE} --id daviem,butlejo,fordis,fawcmi,brownro,glaska,schrol,shawge ${ARGS}
	sort < ${TMPFILE} > data/newnham_college.${EXT}
	rm ${TMPFILE}

nuns:
	./orlandoscrape.py --outfile ${TMPFILE} --id hildbi,helo__,marifr ${ARGS}
	sort < ${TMPFILE} > data/nuns.${EXT}
	rm ${TMPFILE}

the_1917_club:
	./orlandoscrape.py --outfile ${TMPFILE} --id sharev,macaro,hamima ${ARGS}
	sort < ${TMPFILE} > data/the_1917_club.${EXT}
	rm ${TMPFILE}

the_17th_century_quakers:
	./orlandoscrape.py --outfile ${TMPFILE} --id hotel,blauba,fellma,biddhe,evanka,stirel,vokijo,whitdo ${ARGS}
	sort < ${TMPFILE} > data/the_17th_century_quakers.${EXT}
	rm ${TMPFILE}

# Henrietta Nuller, Jane Hume Clapperton, Olive Schreiner, Amy Levy, Emma Brooke, Mona Caird
# Isabella Ford, ie "Ford, Isabella Ormston" appears not to have her own article
men_and_womens_club:
	$(eval AUTH_IDS := mullhe,schrol,clapja,levyam,brooem,cairmo,fordis ) # fordis is missing from all_entries_2013-03-04
	#$(eval TMPINFILE := $(shell mktemp /tmp/orlando-XXXXXXXXXXXXXX).xml)
	#bin/amalgamate_xml.py ${AUTH_IDS} > ${TMPINFILE}
	#--infile ${TMPINFILE}
	./orlandoscrape.py --outfile ${TMPFILE} --id ${AUTH_IDS} ${ARGS}
	sort < ${TMPFILE} > data/men_and_womens_club.${EXT}
	rm ${TMPFILE}

poetesses:
	./orlandoscrape.py --outfile ${TMPFILE} \
		--ids `bin/get_poetesses_ids.sh` ${BASE_ARGS}
	sort < ${TMPFILE} > data/poetesses.${EXT}
	rm ${TMPFILE}

early_writers:
	./orlandoScrape.py --outfile ${TMPFILE} \
		--id boccgi,chauge,chripi,dant__,helo__,hildbi,julino,kempma,maloth,margna,marifr,petr__ \
		${ARGS}
	sort < ${TMPFILE} > data/early_writers.${EXT}
	rm ${TMPFILE}

relations:  # commented out religiousInfluence and connectionToOrganization
	./orlandoscrape.py --outfile ${TMPFILE} ${BASE_ARGS}
	sort < ${TMPFILE} > data/relations.${EXT}
	rm ${TMPFILE}


##############################################################################
# PERIODICALS
##############################################################################


taits_edinburgh_magazine:
	./orlandoscrape.py --outfile ${TMPFILE} --id martha,johnch,ellisa ${ARGS}
	sort < ${TMPFILE} > data/taits_edinburgh_magazine.${EXT}
	rm ${TMPFILE}

yellow_book_and_poet:
	./orlandoscrape.py --outfile ${TMPFILE} --id levyam,watsro,meynal,almala ${ARGS}
	sort < ${TMPFILE} > data/yellow_book_and_poet.${EXT}
	rm ${TMPFILE}

englishwomans_review:
	./orlandoscrape.py --outfile ${TMPFILE} --id boucje,blache ${ARGS}
	sort < ${TMPFILE} > data/englishwomans_review.${EXT}
	rm ${TMPFILE}

##############################################################################
# PUBLISHING HOUSES
##############################################################################

dial_press:
	./orlandoscrape.py --outfile ${TMPFILE} --id fordma,moorma,barndj,jessft ${ARGS}
	sort < ${TMPFILE} > data/dial_press.${EXT}
	rm ${TMPFILE}

kelmscott_press:
	./orlandoscrape.py --outfile ${TMPFILE} --id swanan,wildja,morrwi,gregau ${ARGS}
	sort < ${TMPFILE} > data/kelmscott_press.${EXT}
	rm ${TMPFILE}

minerva_press:
	./orlandoscrape.py --outfile ${TMPFILE} --id rochre,parsel,sleael,craihe,parkem,beauam ${ARGS}
	sort < ${TMPFILE} > data/minerva_press.${EXT}
	rm ${TMPFILE}

victoria_press:
	./orlandoscrape.py --outfile ${TMPFILE} --id faitem,procad,parkbe,haysm2 ${ARGS}
	sort < ${TMPFILE} > data/victoria_press.${EXT}
	rm ${TMPFILE}

##############################################################################
# GENRES
##############################################################################

famous_cookbooks:
	./orlandoscrape.py --outfile ${TMPFILE} --id cookan,glasha,pluma2,halesa,johnch ${ARGS}
	sort < ${TMPFILE} > data/famous_cookbooks.${EXT}
	rm ${TMPFILE}

