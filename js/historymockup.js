var allcommands, commandHistory, nextCommand, nextNoun, nextVerb;
var currentCommand = {};

function clickVerb(evt) {
  setNextVerb(evt.target.innerText, true);
}
function clickSet(evt) {
  setNextNoun(evt.target.innerText, true);
}
function leaveVerb(evt) {
  if (!currentCommand.verbReady) {
    setNextVerb(null, false);
  }
}
function leaveSet(evt) {
  if (!currentCommand.nounReady) {
    setNextNoun(null, false);
  }
}
function maybeExecuteCommand() {
  var {noun, verb, verbReady, nounReady} = currentCommand;
  if (verb && noun && verbReady && nounReady) {
    var command = verb + ' ' + noun + ' .';
    nextCommand.insertAdjacentHTML('beforebegin', `<div class="played command">${command}</div>`);
    setNextVerb(null, false);
    setNextNoun(null, false);
  }
  console.log(currentCommand);
  nextCommand.scrollIntoView();
}
function overVerb(evt) {
  setNextVerb(evt.target.innerText);
}
function overSet(evt) {
  setNextNoun(evt.target.innerText);
}
function setNext(elem, val, ready) {
  elem.innerText = val;
  if (ready) {
    elem.classList.add('nextcommand_prompt_ready');
    elem.classList.remove('nextcommand_prompt_unready');
  } else {
    elem.classList.add('nextcommand_prompt_unready');
    elem.classList.remove('nextcommand_prompt_ready');
  }
}
function setNextVerb(val, ready) {
  currentCommand.verb = val;
  currentCommand.verbReady = ready;
  setNext(nextVerb, val, ready);
  maybeExecuteCommand();
}
function setNextNoun(val, ready) {
  currentCommand.noun = val;
  currentCommand.nounReady = ready;
  setNext(nextNoun, val, ready);
  maybeExecuteCommand();
}
function onreadyHandler() {
  console.log('onreadyHandler');
  document.querySelectorAll(".verbs > button").forEach((aVerb) => {
    aVerb.onclick = clickVerb;
    aVerb.onmouseleave = leaveVerb;
    aVerb.onmouseover = overVerb;
  });
  document.querySelectorAll(".sets > button").forEach((aSet) => {
    aSet.onclick = clickSet;
    aSet.onmouseleave = leaveSet;
    aSet.onmouseover = overSet;
  });
  nextVerb = document.querySelector('.verb_phrase'); // get just first instance of class
  nextNoun = document.querySelector('.noun_phrase'); // get just first instance of class
  commandHistory = document.querySelector('.commandHistory');
  nextCommand = document.querySelector('.nextcommand');
  allcommands = document.querySelector('.allcommands');
}
window.onload = onreadyHandler;
