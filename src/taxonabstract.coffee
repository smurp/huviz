TaxonBase = require('taxonbase').TaxonBase

class TaxonAbstract extends TaxonBase
  # These are containers for Taxons or Predicates.  There is a tree structure
  # of AbstractTaxons and Taxons and Predicates comprise the leaves.
  # seq message   meaning     styling
  #   0 hidden    noneToShow  hidden/nocolor
  #   1 unshowing noneShowing lowcolor
  #   2 mixed     someShowing stripey
  #   3 showing   allShowing  medcolor
  #   4 selected  emphasized  hicolor
  constructor: (@id) ->
    super()
    @kids = SortedSet().sort_on("id").named(@id).isState("_mom")
  register: (kid) ->
    kid.mom = this
    @addSub(kid)
  addSub: (kid) ->
    @kids.add(kid)
  get_instances: () ->
    retval = []
    for kid in @kids
      for i in kid.get_instances()
        retval.push(i)
    return retval
  recalc_state: () ->
    summary =
      showing: false
      hidden: false
      unshowing: false
      mixed: false
    for k in @kids
      summary[k.state] = true
    if summary.mixed or (summary.showing  and summary.unshowing)
      @state = 'mixed'
    else if summary.showing
      @state = "showing"
    else if summary.unshowing
      @state = "unshowing"
    else
      @state = "hidden"
    return @state

(exports ? this).TaxonAbstract = TaxonAbstract