import { BackButton } from './backbutton.js';
import { CategoryList } from './categorylist.js';
const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/huviz/css/introscreens.css" type="text/css">
  <div class="navbar">
    <div class="logo">
      <a href="https://huviz.lincsproject.ca/">
      <img src="/images/HuVizLogo.svg"></img>
      </a>
    </div>
    <div class="navbar-item">
      <a>Docs</a>
    </div>
    <div class="navbar-item">
      <a>About</a>
    </div>
    <div class="navbar-item">
      <a>Credits</a>
    </div>
    <div class="navbar-item">
      <a href="https://gitlab.com/calincs/access/huviz" target="_blank">Gitlab</a>
    </div>
  </div>
`;

export class NavBar extends HTMLElement{
  constructor(){
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

window.customElements.define('nav-bar', NavBar);
