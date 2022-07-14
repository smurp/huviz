import {PrimaryButton} from './primarybutton.js';

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/huviz/css/introscreens.css" type="text/css">
  <div>
  <h1>Welcome to HuViz</h1>
  <p text-align="center">
    The Humanities Visualizer (HuViz) lets you explore the semantic
    relationships in linked datasets through interactive graphs.
  </p>
  <div class="option-list">
    <div class="option">
      <primary-button id="gotoStart" text="Start"></primary-button>
      <p>Pick a preloaded dataset, load your own file, or query
      an online knowledge base</p>
    </div>
    <div class="option">
      <primary-button id="gotoContinue" text="Continue"></primary-button/>
      <p>Load an earlier HuViz session</p>
    </div>
  </div>
  </div>
`;

class WelcomeScreen extends HTMLElement{
  static get observedAttributes(){
    return ['text'];
  }
  constructor(text){
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

window.customElements.define('welcome-screen', WelcomeScreen);
