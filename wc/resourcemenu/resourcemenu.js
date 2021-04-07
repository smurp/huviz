/*

  https://css-tricks.com/styling-web-components/

*/
import {FSMMixin, FiniteStateMachine} from '../../src/fsm.js';
var resMenFSMTTL= `
         @prefix st: <https://example.com/state/> .
         @prefix st: <https://example.com/transition/> .

         st:           tr:start         st:onFront .
         st:onFront    tr:gotoDataset   st:onDataset .
         st:onFront    tr:gotoScript    st:onScript .
         st:onFront    tr:gotoSPARQL    st:onSPARQL .

         st:onFront    tr:esc           st:END .
         st:onDataset  tr:esc           st:onFront .
         st:onScript   tr:esc           st:onFront .
         st:onSPARQL   tr:esc           st:onFront .
       `;



export class ResourceMenu extends FSMMixin(HTMLElement) {
  constructor() {
    super();
    this.parseMachineTTL(resMenFSMTTL);
    this._debug = true;
    const template = document
          .getElementById('resource-menu')
          .content;
    const shadowRoot = this.attachShadow({mode: 'open'})
          .appendChild(template.cloneNode(true));
    this.addIDClickListeners('main, button, [id]', this.clickListener.bind(this));
    this.transit('start');
  }
  clickListener(evt) {
    let targetId = evt.target.id;
    //console.debug({evt, targetId});
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
      console.warn(`enter__() is a noop when stateId==${stateId}`);
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
