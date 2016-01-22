
BASE_ARGS = \
	--use_onto \
        --xpath orlando2RDFxpath3.txt --rules xpaths \
	--progress
#        --verbose

#--infile orlando_all_entries_2013-03-04_FORMATTED.xml \

ARGS = 	--all_predicates ${BASE_ARGS}

TMPFILE := $(shell mktemp /tmp/XXXXXXXXXXXXXX).nq

all: individuals organizations periodicals publishing_houses genres

individuals: atwoma ballrm abdyma shakwi byroau

organizations: academie_des_femmes african_national_congress brontes female_antislavery_society newnham_college nuns the_1917_club the_17th_century_quakers

periodicals: yellow_book_and_poet taits_edinburgh_magazine englishwomans_review

publishing_houses: dial_press kelmscott_press minerva_press victoria_press

genres: famous_cookbooks

broken: atwoma relations poetesses brontes

abdyma:
	./orlandoScrape.py --outfile ${TMPFILE} --ids abdyma ${ARGS}
	sort < ${TMPFILE} > data/abdyma.nq
	rm ${TMPFILE}

atwoma:
	./orlandoScrape.py --outfile ${TMPFILE} --ids atwoma  ${ARGS}
	sort < ${TMPFILE} > data/atwoma.nq
	rm ${TMPFILE}

ballrm:
	./orlandoScrape.py --outfile ${TMPFILE} --ids ballrm ${ARGS}
	sort < ${TMPFILE} > data/ballrm.nq
	rm ${TMPFILE}

byroau:
	./orlandoscrape.py --outfile ${TMPFILE} --id byroau ${ARGS}
	sort < ${TMPFILE} > data/byroau.nq
	rm ${TMPFILE}

shakwi:
	./orlandoscrape.py --outfile ${TMPFILE} --id shakwi ${ARGS}
	sort < ${TMPFILE} > data/shakwi.nq
	rm ${TMPFILE}

academie_des_femmes:
	./orlandoscrape.py --outfile ${TMPFILE} --id steige,barnna,loy_mi ${ARGS}
	sort < ${TMPFILE} > data/academie_des_femmes.nq
	rm ${TMPFILE}

african_national_congress:
	./orlandoscrape.py --outfile ${TMPFILE} --id britve,renama,gordna,murpde,slovgi ${ARGS}
	sort < ${TMPFILE} > data/african_national_congress.nq
	rm ${TMPFILE}

brontes:
	./orlandoscrape.py --outfile ${TMPFILE} --id bronem,bronch,bronan ${ARGS}
	sort < ${TMPFILE} > data/brontes.nq
	rm ${TMPFILE}

female_antislavery_society:
	./orlandoscrape.py --outfile ${TMPFILE} --id elizhe,martha,fullma ${ARGS}
	sort < ${TMPFILE} > data/female_antislavery_society.nq
	rm ${TMPFILE}

newnham_college:
	./orlandoscrape.py --outfile ${TMPFILE} --id daviem,butlejo,fordis,fawcmi,brownro,glaska,schrol,shawge ${ARGS}
	sort < ${TMPFILE} > data/newnham_college.nq
	rm ${TMPFILE}

nuns:
	./orlandoscrape.py --outfile ${TMPFILE} --id hildbi,helo__,marifr ${ARGS}
	sort < ${TMPFILE} > data/nuns.nq
	rm ${TMPFILE}

the_1917_club:
	./orlandoscrape.py --outfile ${TMPFILE} --id sharev,macaro,hamima ${ARGS}
	sort < ${TMPFILE} > data/the_1917_club.nq
	rm ${TMPFILE}

the_17th_century_quakers:
	./orlandoscrape.py --outfile ${TMPFILE} --id hotel,blauba,fellma,biddhe,evanka,stirel,vokijo,whitdo ${ARGS}
	sort < ${TMPFILE} > data/the_17th_century_quakers.nq
	rm ${TMPFILE}

poetesses:
	./orlandoscrape.py --outfile ${TMPFILE} \
		--ids `bin/get_poetesses_ids.sh` ${BASE_ARGS}
	sort < ${TMPFILE} > data/poetesses.nq
	rm ${TMPFILE}

early_writers: 
	./orlandoScrape.py --outfile ${TMPFILE} \
		--id boccgi,chauge,chripi,dant__,helo__,hildbi,julino,kempma,maloth,margna,marifr,petr__ \
		${ARGS}
	sort < ${TMPFILE} > data/early_writers.nq
	rm ${TMPFILE}

relations:  # commented out religiousInfluence and connectionToOrganization
	./orlandoscrape.py --outfile ${TMPFILE} ${BASE_ARGS}
	sort < ${TMPFILE} > data/relations.nq
	rm ${TMPFILE}


##############################################################################
# PERIODICALS
##############################################################################


taits_edinburgh_magazine:
	./orlandoscrape.py --outfile ${TMPFILE} --id martha,johnch,ellisa ${ARGS}
	sort < ${TMPFILE} > data/taits_edinburgh_magazine.nq
	rm ${TMPFILE}

yellow_book_and_poet:
	./orlandoscrape.py --outfile ${TMPFILE} --id levyam,watsro,meynal,almala ${ARGS}
	sort < ${TMPFILE} > data/yellow_book_and_poet.nq
	rm ${TMPFILE}

englishwomans_review:
	./orlandoscrape.py --outfile ${TMPFILE} --id boucje,blache ${ARGS}
	sort < ${TMPFILE} > data/englishwomans_review.nq
	rm ${TMPFILE}

##############################################################################
# PUBLISHING HOUSES
##############################################################################

dial_press:
	./orlandoscrape.py --outfile ${TMPFILE} --id fordma,moorma,barndj,jessft ${ARGS}
	sort < ${TMPFILE} > data/dial_press.nq
	rm ${TMPFILE}

kelmscott_press:
	./orlandoscrape.py --outfile ${TMPFILE} --id swanan,wildja,morrwi,gregau ${ARGS}
	sort < ${TMPFILE} > data/kelmscott_press.nq
	rm ${TMPFILE}

minerva_press:
	./orlandoscrape.py --outfile ${TMPFILE} --id rochre,parsel,sleael,craihe,parkem,beauam ${ARGS}
	sort < ${TMPFILE} > data/minerva_press.nq
	rm ${TMPFILE}

victoria_press:
	./orlandoscrape.py --outfile ${TMPFILE} --id faitem,procad,parkbe,haysm2 ${ARGS}
	sort < ${TMPFILE} > data/victoria_press.nq
	rm ${TMPFILE}

##############################################################################
# GENRES
##############################################################################

famous_cookbooks:
	./orlandoscrape.py --outfile ${TMPFILE} --id cookan,glasha,pluma2,halesa,johnch ${ARGS}
	sort < ${TMPFILE} > data/famous_cookbooks.nq
	rm ${TMPFILE}

