class Edge
  color: "lightgrey"
  constructor: (@source,@target,@predicate,@context) ->
    @id = (a.id for a in [@source, @predicate, @target, @context]).join(' ')
    #console.log "new Edge() ==>",@id
    @register()
    this
  register: () ->
    @predicate.add_edge(this)
  isPicked: () ->
    return @source.picked? or @target.picked?
  show: () ->
    @predicate.shown_edges.acquire(this)
    if @isPicked()
      @predicate.pick(this)
    else
      @predicate.unshown_edges.remove(this)
      @predicate.unpick(this)
    @predicate.update_edge(this,{show:true})
  unshow: () ->
    if @isPicked()
      @predicate.unshown_edges.acquire(this)
      @predicate.pick(this)
    else
      @predicate.unshown_edges.acquire(this)
      @predicate.unpicked_edges.acquire(this)
    @predicate.update_edge(this,{show:false})      
  an_end_is_picked: () ->
    return this.target.picked? or this.source.picked?
  unpick: () ->
    @predicate.unpick(this)
  pick: () ->
    @predicate.pick(this)

(exports ? this).Edge = Edge