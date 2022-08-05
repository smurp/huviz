import {
  PickOrProvide, PickOrProvideScript, //PickOrProvide2Script,
  DragAndDropLoader, DragAndDropLoaderOfScripts
} from '../../src/dndloader.js';
import {uniquer, unique_id} from '../../src/uniquer.js'; // TODO rename to make_dom_safe_id
import {FSMMixin, FiniteStateMachine} from '../../src/fsm.js';

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

// export class NavBar extends HTMLElement{
//   constructor(){
//     super();
//     this.attachShadow({mode: 'open'});
//     this.shadowRoot.appendChild(template.content.cloneNode(true));
//   }
// }
//
//



var stateMachineTTL = `
`;

export class NavBar extends FSMMixin(HTMLElement) {
  constructor() {
    super();
    this.parseMachineTTL(stateMachineTTL);
    this._debug = true;
    const template = document
          .getElementById('nav-bar')
          .content;
    const shadowRoot = this.attachShadow({mode: 'open'})
          .appendChild(template.cloneNode(true));
    this.addIDClickListeners('main, button, [id]', this.clickListener.bind(this));
    //this.transit('start',{});
  }
  registerHuViz(huviz) {
    this.huviz = huviz;
    //this.init_resource_menus();
  }
  clickListener(evt) {
    let targetId = evt.target.id;
    if (targetId) {
      try {
        this.transit(targetId, evt);
      } catch (err) {
        console.error(err);
      }
    }
    console.debug(`final state: ${this.get_state()}`, evt.target);
  }
  addIDClickListeners(selector, handler) {
    /*
      Button ids are transition ids.
      HTMLElement ids are states
    */
    this.shadowRoot.querySelectorAll(selector).forEach((item) => {
      console.debug("addEventListener", {item});
      item.addEventListener('click', handler);
    })
  }
  enter__(evt, stateId) {
    if (stateId && stateId.length) { // ignore empty string
      this.showMain(stateId);
    } else {
      console.debug(`enter__() is a noop when stateId==${stateId}`);
    }
  }
  enter__END(evt, stateId) {
    this.parentNode.removeChild(this);
  }
  showMain(which) {
    this.shadowRoot.querySelectorAll('main').forEach((main) => {
      if (main.classList.contains(which)) {
        main.style.display = 'block';
      } else {
        main.style.display = 'none';
      }
    });
  }
}

window.customElements.define('nav-bar', NavBar);
