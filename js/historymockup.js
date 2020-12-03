var allcommands, commandHistory, nextCommand, nextNoun, nextVerb;
var currentCommand = {perm:{}, temp:{}};

function onreadyHandler() {
  console.log('onreadyHandler');
  document.querySelectorAll(".verbs > button").forEach((aVerb) => {
    aVerb.onclick = handleEvery;
    aVerb.onmouseleave = handleEvery;
    aVerb.onmouseover = handleEvery;
  });
  document.querySelectorAll(".sets > button").forEach((aSet) => {
    aSet.onclick = handleEvery;
    aSet.onmouseleave = handleEvery;
    aSet.onmouseover = handleEvery;
  });
  // get just first instances of the mentioned classes
  nextVerb = document.querySelector('.verb_phrase'); 
  nextNoun = document.querySelector('.noun_phrase');
  currentCommand.elem = {
    noun: nextNoun,
    verb: nextVerb};
  commandHistory = document.querySelector('.commandHistory');
  nextCommand = document.querySelector('.nextcommand');
  allcommands = document.querySelector('.allcommands');
}

function handleEvery(evt) {
  var speech = evt.target.parentNode.dataset.speech, // noun | verb
      val = evt.target.innerText, // Actviate | Pin | Graphed | etc
      event = evt.type; // click | mouseenter | mouseleave
  setNext(speech, val, event);
}

function setNext(speech, val="", event) {
  var elem = currentCommand.elem[speech];
  var newVal = val;
  switch (event) {
  case 'mouseover':
    // When entering, the user should be warned what will happen if they click.
    currentCommand.temp[speech] = val;
    break
  case 'click':
    // By clicking the user is conveying they choose this one.
    // Unless this val had already been the choosen one, then unchoose it.
    if (currentCommand.perm[speech] == val) {
      currentCommand.perm[speech] = null;
    } else {
      currentCommand.perm[speech] = val;
    }
    currentCommand.temp[speech] = null;
    break;
  case 'mouseleave':
    newVal = currentCommand.perm[speech] || null; // fall back to the perm value
    break;
  default:
    // completely wipe the part of speech like: setNext('verb')
    newVal = '';
    currentCommand.perm[speech] = null;
    currentCommand.temp[speech] = null;
  }
  console.log('setNext', {speech, val, event, newVal});
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
  if (cc.perm.noun && cc.perm.verb) {
    var command = verb + ' ' + noun + ' .';
    nextCommand.insertAdjacentHTML(
      'beforebegin',
      `<div class="played command">${command}</div>`);
    setNext(speech);
  } else if (verb && noun) {
    nextCommand.classList.add('ready');
  } else {
    nextCommand.classList.add('unready');
  }
  //console.log("maybeExecute", currentCommand);
  nextCommand.scrollIntoView();
}

window.onload = onreadyHandler;
