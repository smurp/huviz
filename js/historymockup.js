var allcommands, commandHistory, grow_shrink, nextCommand, nextcommand_prompt;
var currentCommand = {perm:{}, temp:{}};

var untargetFor = {};
var cancelElemForVerb = {};

var verbPairs = [
  ['Activate', 'Deactivate'],
  ['Select', 'Deselect'],
  ['Label', 'Unlabel'],
  ['Discard', 'Retrieve'],
  ['Pin', 'Unpin']];

function onreadyHandler() {
  //console.log('onreadyHandler');
  var mostRecentVerb = '';
  var recentVerbs = [];
  document.querySelectorAll(".verbs  button").forEach((verbElem) => {
    var text = verbElem.innerText.replace(/^\s+|\s+$/g, '')
    if (text == 'X') { // one of the cancel buttons
      var xButt = verbElem;
      xButt.onclick = (function(aVerbId, xButtElem){
        return () => disengageToggler(aVerbId, xButtElem);
      })(mostRecentVerb, xButt);
      recentVerbs.forEach((aVerbId) => {
        cancelElemForVerb[aVerbId] = xButt;
        disengageCancelButton(aVerbId)
      });
      recentVerbs = [];
    } else {
      var aVerb = verbElem;
      console.log(aVerb.innerText);
      aVerb.onclick = handleEvery;
      aVerb.onmouseleave = handleEvery;
      aVerb.onmouseover = handleEvery;
      aVerb.id = text;
      recentVerbs.push(text);
      mostRecentVerb = text;
    }
  });
  verbPairs.forEach((pair) => {
    var [a, b] = pair;
    untargetFor[a] = b; //document.querySelect(`#${b}`);
    untargetFor[b] = a; //document.querySelect(`#${a}`);
  });
  document.querySelectorAll(".sets > button").forEach((aSet) => {
    aSet.onclick = handleEvery;
    aSet.onmouseleave = handleEvery;
    aSet.onmouseover = handleEvery;
  });
  // get just first instances of the mentioned classes
  currentCommand.elem = {
    noun: document.querySelector('.noun_phrase'),
    verb: document.querySelector('.verb_phrase')
  };
  commandHistory = document.querySelector('.commandHistory');
  nextCommand = document.querySelector('.nextcommand');
  allcommands = document.querySelector('.allcommands');
  nextcommand_prompt = document.querySelector('.nextcommand_prompt');
  grow_shrink = document.querySelector(".grow_shrink_history");
  grow_shrink.onclick = handleGrowShrink;
}

function handleEvery(evt) {
  var speech = evt.target.closest('[data-speech]').dataset.speech, // noun | verb
      val = evt.target.innerText, // Actviate | Pin | Graphed | etc
      event = evt.type; // click | mouseenter | mouseleave
  setNext(speech, val, event, evt.target);
}

function disengageToggler(aVerbId, xButtElem) {
  var toDisengage = [xButtElem];
  var untargetId = untargetFor[aVerbId];
  toDisengage.push(document.getElementById(aVerbId));
  if (untargetId) {
    toDisengage.push(document.getElementById(untargetId));
  }
  toDisengage.forEach((elem) => {
    elem.classList.remove('engaged');
  });
}

function disengageOther(me) {
  var other = document.getElementById(untargetFor[me.id]);
  if (other) {
    other.classList.remove('engaged');
  }
}

function engageCancelButton(verbId) {
  var xButt = cancelElemForVerb[verbId];
  if (xButt) {
    xButt.classList.add('engaged');
  }
}
function disengageCancelButton(verbId) {
  var xButt = cancelElemForVerb[verbId];
  if (xButt) {
    xButt.classList.remove('engaged');
  }
}

function setNext(speech, val="", event, target) {
  if (event == 'click') {
    var perm = currentCommand.perm.verb;
    var temp = currentCommand.temp.verb;
    console.log({speech, val, event, perm, temp});
  }
  var elem = currentCommand.elem[speech];
  var newVal = val;
  switch (event) {
  case 'mouseover':
    // When entering, the user should be warned what will happen if they click.
    currentCommand.temp[speech] = val;
    break
  case 'click':
    // Clicking expresses the user's desire to choose this val.
    // Unless this val had already been the choosen one, then unchoose it.
    if (currentCommand.perm[speech] == val) {
      currentCommand.perm[speech] = null;
      target.classList.remove('engaged');
      disengageCancelButton(target.id);
    } else {
      currentCommand.perm[speech] = val;
      target.classList.add('engaged');
      engageCancelButton(target.id);
      disengageOther(target);
    }
    currentCommand.temp[speech] = null;
    break;
  case 'mouseleave':
    currentCommand.temp[speech] = null;
    newVal = currentCommand.perm[speech] || null; // fall back to the perm value
    break;
  default:
    // Completely wipe the part of speech like: setNext('verb')
    newVal = '';
    currentCommand.perm[speech] = null;
    currentCommand.temp[speech] = null;
  }
  //console.log('setNext', {speech, val, event, newVal});
  elem.innerText = newVal;
  if (newVal) {
    elem.classList.add('nextcommand_prompt_ready');
    elem.classList.remove('nextcommand_prompt_unready');
  } else {
    elem.classList.add('nextcommand_prompt_unready');
    elem.classList.remove('nextcommand_prompt_ready');
  }
  maybeExecute(speech);
}

function maybeExecute(speech) {
  var cc = currentCommand;
  var noun = cc.perm.noun || cc.temp.noun;
  var verb = cc.perm.verb || cc.temp.verb;
  //console.log("maybeExecute", {verb, noun}, cc);
  if (cc.perm.noun && cc.perm.verb) {
    //console.log('execute');
    execute(speech, verb, noun);
    console.clear();
  } else if (verb && noun) {
    //console.log('ready');
    nextcommand_prompt.classList.add('ready');
    nextcommand_prompt.classList.remove('unready');
  } else {
    //console.log('unready');
    nextcommand_prompt.classList.add('unready');
    nextcommand_prompt.classList.remove('ready');
  }
  //console.log("maybeExecute", currentCommand);
  nextCommand.scrollIntoView();
}

function execute(speech, verb, noun) {
  var command_str = verb + ' ' + noun + ' .';
  nextCommand.insertAdjacentHTML(
    'beforebegin',
    `<div class="played command">${command_str}</div>`);
  setNext(speech); // knock out the recently clicked part of speech
}

function handleGrowShrink(evt) {
  var isShrunk = evt.target.classList.contains('fa-angle-double-down');
  if (isShrunk) {
    evt.target.classList.replace('fa-angle-double-down','fa-angle-double-up')
    allcommands.classList.replace("shrunken", "grown");
  } else {
    evt.target.classList.replace('fa-angle-double-up','fa-angle-double-down')
    allcommands.classList.replace("grown", "shrunken");
  }
}

function handleClick(event) {
  switch (event.target.id) {
  case 'topbutton':
    topbutton.classList.toggle("button-pressed");
    bottombutton.classList.remove("button-pressed");
    break;
  case 'bottombutton':
    bottombutton.classList.toggle("button-pressed");
    topbutton.classList.remove("button-pressed");
    break;
  case 'xbutton':
    topbutton.classList.remove("button-pressed");
    bottombutton.classList.remove("button-pressed");
    break;
  }
  console.log(event.target);
}

window.onload = onreadyHandler;


