class Edge
  color: "lightgrey"
  constructor: (@source,@target,@predicate) ->
    # FIXME if everything already has .lid then remove the test "not a.lid?"
    @id = (not a.lid? and a.id or a.lid for a in [@source, @predicate, @target]).join(' ')
    #@id = (a.id for a in [@source, @predicate, @target, @context]).join(' ')
    @lid = @id
    @register()
    @contexts = []
    this
  register: () ->
    @predicate.add_inst(this)
  register_context: (context) ->
    @contexts.push(context)
    # context.register_context_for(this) # FIXME to see all assertions in a context
  isSelected: () ->
    return @source.selected? or @target.selected?
  show: () ->
    @predicate.update_state(this, 'show')
  unshow: () ->
    @predicate.update_state(this, 'unshow')
  an_end_is_selected: () ->
    return this.target.selected? or this.source.selected?
  unselect: () ->
    @predicate.update_state(this, 'unselect')
  select: () ->
    @predicate.update_state(this, 'select')    
  
(exports ? this).Edge = Edge