import { BackButton } from './backbutton.js';
import { CategoryList } from './categorylist.js';

//old template for onContinue from resourcemenu.html
`<main class="onContinue">
  <i id="esc">Back to Start Menu</i>
  <h1>Continue a Session</h1>
  <div class="content">
    <p>Continue a previous session</p>
    <div id="scriptHere"></div>
  </div>
</main>`;

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/huviz/css/introscreens.css" type="text/css">
  <div class="innerscreen">
    <div class="screen-info">
      <h1>Continue</h1>
      <p>
        Continue a previous HuViz session
      </p>
      <back-button></back-button>
    </div>
  </div>
`;

export class OnContinue extends HTMLElement{
  constructor(){
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

window.customElements.define('on-continue', OnContinue);
