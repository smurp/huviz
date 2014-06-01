angliciser = require('angliciser').angliciser
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
    @update_english()

  update_english: () ->
    if @mom?
      @mom.update_english()
      return
    # called upon state change, english must change too
    in_and_out =
      include: []
      exclude: []
    @recalc_english(in_and_out)
    evt = new CustomEvent 'changeEnglish',
      detail:
        english: @english_from(in_and_out)
      bubbles: true
      cancelable: true
    window.dispatchEvent evt
  english_from: (in_and_out) -> 
    english = angliciser(in_and_out.include)
    if in_and_out.exclude.length
      english += " but not " + angliciser(in_and_out.exclude, " or ")
    #console.debug "#{JSON.stringify(in_and_out)} ==> #{english}"
    return english
 
(exports ? this).TaxonBase = TaxonBase
