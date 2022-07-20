import {
  config, dom, library
} from '../../node_modules/@fortawesome/fontawesome-svg-core/index.es.js'
import { fas } from '../../node_modules/@fortawesome/free-solid-svg-icons/index.es.js';
import { fab } from '../../node_modules/@fortawesome/free-brands-svg-icons/index.es.js';

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/huviz/css/introscreens.css" type="text/css">
  <div class="category-list">
  </div>
`;

const cat1 = {
  title : "Category 1",
  items : ['Item 1', 'Item 2', 'Item 3', 'Item 4',]
};

const cat2 = {
  title : "Category 2",
  items : ['Item 1', 'Item 2', 'Item 3', 'Item 4',
  'SecondItem 1', 'SecondItem 2', 'SecondItem 3', 'SecondItem 4',]
};
const cat3 = {
  title : "Category 3",
  items : ['Item 1', 'Item 2', 'Item 3', 'Item 4',
  'SecondItem 1', 'SecondItem 2', 'SecondItem 3', 'SecondItem 4',]
};


export class CategoryList extends HTMLElement{
  static get observedAttributes(){
    return ['catTitle'];
  }
  constructor(){
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    //add list items
    this.addCategories([cat1, cat2, cat3]);

  }
  addCategories(categories){
    const listElement = this.shadowRoot.querySelector('.category-list');
    var innerCategories = "";
    if(categories){
      categories.forEach((item, i) => {
        innerCategories+=`
        <div class="category" id="${item.title}-category">
          <div class="category-header">
            <h3 title="${item.title}">${item.title}</h3>
            <i class="fas fa-circle"></i>
            <p>View All</p>
          </div>
          <div id="${item.title}-list" class="pill-list">
            ${this.addListItems(item)}
          </div>
        </div>\n`;
      });
    }
    listElement.innerHTML = innerCategories;
    this._load_font_awesome();
  }
  addListItems(category){
    var innerListItems = "";
    if(category){
      category.items.forEach((item, i) => {
        innerListItems+=`<div class="pill" id="${item}-li">${item}</div>\n`;
      });
    }
    return innerListItems;
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

window.customElements.define('category-list', CategoryList);
