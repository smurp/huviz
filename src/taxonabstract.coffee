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
    different_states = 0
    for k in @kids
      if typeof k.state is 'undefined'
        console.debug k
      if not summary[k.state]
        summary[k.state] = true
        different_states++
    if summary.mixed or different_states > 1
      @state = 'mixed'
    # set the state to the kids' consensus
    #   (review in case a kid is fully hidden)
    else
      for k,v of summary
        if v
          @state = k
          break

    if false # enable to crosscheck, oldstyle
      if summary.mixed or (summary.showing  and summary.unshowing)
        @state0 = "mixed"
      else if summary.showing
        @state0 = "showing"
      else if summary.unshowing
        @state0 = "unshowing"
      else
        @state0 = "hidden"
      if @state0 isnt @state
        msg = "OMG #{@state} isnt #{@state0} count = #{different_states}"
        console.debug summary
      #@state = @state0
        
    #@recalc_english()
    return @state
  recalc_english: () ->
    if @state is 'showing'
      # ie this level contributes no detail
      @english = @id
    else if @state is "unshowing"
      @english = ''
    else if @state is "mixed"
      @english = ""
      #for k in kids

(exports ? this).TaxonAbstract = TaxonAbstract
