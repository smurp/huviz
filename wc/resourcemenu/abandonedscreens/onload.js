import { BackButton } from './backbutton.js';
import { CategoryList } from './categorylist.js';
const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/huviz/css/introscreens.css" type="text/css">
  <div class="innerscreen">
    <div class="screen-info">
      <h1>Load</h1>
      <p>
        Load an existing or community contributed dataset
      </p>
      <back-button></back-button>
    </div>
      <category-list></category-list>
  </div>
`;

export class OnLoad extends HTMLElement{
  constructor(){
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

window.customElements.define('on-load', OnLoad);
