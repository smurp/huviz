class TaxonBase
  get_state: () ->
    if not @state?
      @state = @recalc_state()
    return @state
  update_state: (node, change, old_node_state, new_node_state) ->
    old_state = @state
    @recalc_state(node, change, old_node_state, new_node_state)
    if old_state isnt @state
      evt = new CustomEvent 'changeTaxon',
        detail:
          target_id: this.id
          taxon: this
          old_state: old_state
          new_state: @state
        bubbles: true
        cancelable: true
      if @mom?
        @mom.update_state()
      window.dispatchEvent evt # could pass to picker, this is async    

(exports ? this).TaxonBase = TaxonBase

###
[Thing
  [Human
    [Person] [Writer]]
  [Group]]
--> THING

Showing
unshowing



[thing
  [human
    [Person] [writer]]
  [Group]]
--> Person except smith and Group except mormons

--> Everything except Beauty


###