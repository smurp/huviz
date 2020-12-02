var nextVerb, nextNoun;
function clickVerb(evt) {
  setNextVerb(evt.target.innerText, true);
}
function clickSet(evt) {
  setNextNoun(evt.target.innerText, true);
}
function leaveVerb(evt) {
  setNextVerb("", false);
}
function leaveSet(evt) {
  setNextNoun("", false);
}
function overVerb(evt) {
  setNextVerb(evt.target.innerText);
}
function overSet(evt) {
  setNextNoun(evt.target.innerText);
}
function setNextVerb(val, perm) {
  nextVerb.innerText = val;
  nextVerb.class = perm && 'perm' || '';
}
function setNextNoun(val, perm) {
  nextNoun.innerText = val;
  nextNoun.class = perm && 'perm' || '';
}
function onreadyHandler() {
  console.log('onreadyHandler');
  document.querySelectorAll(".verbs").forEach((aVerb) => {
    aVerb.onclick = clickVerb;
    aVerb.onmouseleave = leaveVerb;
    aVerb.onmouseover = overVerb;
  });
  document.querySelectorAll(".sets").forEach((aSet) => {
    aSet.onclick = clickSet;
    aSet.onmouseleave = leaveSet;
    aSet.onmouseover = overSet;
  });
  nextVerb = document.querySelector('#nextVerb');
  nextNoun = document.querySelector('#nextNoun');
}
window.onload = onreadyHandler;
