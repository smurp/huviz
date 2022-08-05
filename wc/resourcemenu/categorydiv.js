import {
  config, dom, library
} from '../../node_modules/@fortawesome/fontawesome-svg-core/index.es.js'
import { fas } from '../../node_modules/@fortawesome/free-solid-svg-icons/index.es.js';
import { fab } from '../../node_modules/@fortawesome/free-brands-svg-icons/index.es.js';

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/huviz/css/introscreens.css" type="text/css">
  <div class="category">
    <div class="category-header">
      <h3 title="CategoryName"></h3>
      <i class="fas fa-circle"></i>
      <p>View All</p>
    </div>
    <div class="pill-list">
    </div>
  </div>
`;

export class CategoryDiv extends HTMLElement{
  static get observedAttributes(){
    return ['catTitle', 'preview'];
  }
  constructor(){
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    //Set category name in its header
    var catTitle = this.getAttribute('catTitle');
    this.shadowRoot.querySelector('h3').innerHTML = catTitle;
    //set the title attribute to category name
    this.shadowRoot.querySelector('h3').setAttribute('title', catTitle);

    if(this.getAttribute('preview')){
      this.shadowRoot.querySelector('.category').classList.add('preview');
    }

    //add list items
    this.addListItems(['Item 1', 'Item 2', 'Item 3', 'Item 4',
    'SecondItem 1', 'SecondItem 2', 'SecondItem 3', 'SecondItem 4', 'SecondItem 5']);

    this._load_font_awesome();
  }
  addListItems(listItems){
    const listElement = this.shadowRoot.querySelector('.pill-list');
    var innerListItems = "";
    if(listItems){
      listItems.forEach((item, i) => {
        innerListItems+=`<div class="pill" id="${item}-li">${item}</div>\n`;
      });
    }
    listElement.innerHTML = innerListItems;
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

window.customElements.define('category-div', CategoryDiv);
