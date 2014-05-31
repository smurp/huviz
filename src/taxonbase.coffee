class TaxonBase
  update_state: (node, change) ->
    old_state = @state
    @recalc_state(node, change)
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
        #@mom.state = false # force mom to dispatch an event
        @mom.update_state()
      console.debug evt.detail.target_id,evt.detail.new_state
      window.dispatchEvent evt # could pass to picker, this is async    

(exports ? this).TaxonBase = TaxonBase
