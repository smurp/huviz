const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/huviz/css/introscreens.css" type="text/css">
  <li class="pill">
  </li>
`;

class PillListItem extends HTMLElement{
  static get observedAttributes(){
    return ['text'];
  }
  constructor(text){
    super();
    var listItem = this.getAttribute('text');

    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.shadowRoot.querySelector("li").innerHTML = listItem;
  }
}

window.customElements.define('pill-list-item', PillListItem);
