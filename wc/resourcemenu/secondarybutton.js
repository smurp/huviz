const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/huviz/css/introscreens.css" type="text/css">
  <button class="secondary" id="buttonID">
  </button>
`;

export class SecondaryButton extends HTMLElement{
  static get observedAttributes(){
    return ['text', 'disabled', 'buttonid'];
  }
  constructor(){
    super();
    var buttonText = this.getAttribute('text');
    var buttonID = this.getAttribute('buttonid');

    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    //put button text
    this.shadowRoot.querySelector("button").innerHTML = buttonText;
    //set button ID
    this.shadowRoot.querySelector("button").setAttribute('id', buttonID);
    //if disabled is set, disable button
    if (this.getAttribute('disabled')){
      this.shadowRoot.querySelector("button").classList.add('disabled');
    }
  }
}

window.customElements.define('secondary-button', SecondaryButton);
