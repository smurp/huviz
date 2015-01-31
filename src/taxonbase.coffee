angliciser = require('angliciser').angliciser
TreeCtrl = require('treectrl').TreeCtrl

class TaxonBase extends TreeCtrl
  suspend_updates: false
  get_state: () ->
    if not @state?
      alert "Taxon id:#{@id} has no direct state"
    return @state
  get_indirect_state: ->
    if not @indirect_state?
      alert "Taxon id:#{@id} has no indirect_state"
    return @indirect_state
  update_state: ->
    old_state = @state
    old_indirect_state = @indirect_state
    @recalc_states()
    if old_state isnt @state or old_indirect_state isnt @indirect_state
      evt = new CustomEvent 'changeTaxon',
        detail:
          target_id: this.id
          taxon: this
          old_state: old_state
          new_state: @state
          old_indirect_state: old_indirect_state
          new_indirect_state: @indirect_state
        bubbles: true
        cancelable: true
      if @super_class?
        @super_class.update_state()
      window.dispatchEvent evt # could pass to picker, this is async
    #@update_english()

  update_english: () ->
    if @id isnt "Thing"
      console.error "update_english(#{@lid}) should only be called on Thing"
    if @super_class?
      @super_class.update_english()
      return
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
    return english
 
(exports ? this).TaxonBase = TaxonBase
