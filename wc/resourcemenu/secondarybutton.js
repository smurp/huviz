const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/huviz/css/introscreens.css" type="text/css">
  <button class="secondary">
  </button>
`;

class SecondaryButton extends HTMLElement{
  static get observedAttributes(){
    return ['text', 'disabled'];
  }
  constructor(text){
    super();
    var buttonText = this.getAttribute('text');
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.shadowRoot.querySelector("button").innerHTML = buttonText;
    if (this.getAttribute('disabled')){
      this.shadowRoot.querySelector("button").classList.add('disabled');
      console.log(this.shadowRoot.querySelector("button").classList);
    }
  }
}

window.customElements.define('secondary-button', SecondaryButton);
