
# http://stackoverflow.com/a/7654602
looper = null
asyncLoop = (o) ->
  i = -1
  console.log "i:",i
  looper = ->
    i++
    if i >= o.length
      o.callback()
      return
    o.functionToLoop(looper,i)
  looper()

asyncLoop_test = () ->
  asyncLoop(
    length: 5
    functionToLoop: (looper,i) ->
      console.log "functionToLoop1()"
      setTimeout( () ->
        console.log('Iteration1 '+i)
        looper()
       100)
    callback: () ->
      console.log('#1 All done')
  )
  asyncLoop(
    length: 15
    functionToLoop: (looper,i) ->
      console.log "functionToLoop2()"
      setTimeout( () ->
        console.log('Iteration2 '+i)
        looper()
       33)
    callback: () ->
      console.log('#2 All done')
  )

asyncLoop_test()

(exports ? this).asyncLoop = asyncLoop
(exports ? this).looper = looper