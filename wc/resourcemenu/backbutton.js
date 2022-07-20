import {
  config, dom, library
} from '../../node_modules/@fortawesome/fontawesome-svg-core/index.es.js'
import { fas } from '../../node_modules/@fortawesome/free-solid-svg-icons/index.es.js';
import { fab } from '../../node_modules/@fortawesome/free-brands-svg-icons/index.es.js';

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/huviz/css/introscreens.css" type="text/css">
  <div class="back">
    <i class="fas fa-chevron-left"></i>
    <p>Back</p>
  </div>
`;

export class BackButton extends HTMLElement{
  static get observedAttributes(){
    return ['text'];
  }
  constructor(){
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._load_font_awesome();
  }
  _load_font_awesome() {
    // https://www.gitmemory.com/issue/FortAwesome/Font-Awesome/15316/517343443
    library.add( fas, fab );
    dom.watch({
      autoReplaceSvgRoot: this.shadowRoot,
      observeMutationsRoot: this.shadowRoot
    })
  }
}

window.customElements.define('back-button', BackButton);
