angliciser = require('angliciser').angliciser
TreeCtrl = require('treectrl').TreeCtrl

class TaxonBase extends TreeCtrl
  suspend_updates: false

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
