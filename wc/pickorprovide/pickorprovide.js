import {
  PickOrProvide, PickOrProvideScript, //PickOrProvide2Script,
  DragAndDropLoader, DragAndDropLoaderOfScripts
} from '../../src/dndloader.js';
import {uniquer, unique_id} from '../../src/uniquer.js'; // TODO rename to make_dom_safe_id
import {FSMMixin, FiniteStateMachine} from '../../src/fsm.js';

var stateMachineTTL = `

`;

const categoryHeaderTemplate = `
<div class="category-header">
  <h3 title="CategoryName"></h3>
  <i class="fas fa-circle"></i>
  <p>View All</p>
</div>
`;

export class PickOrProvidePanel extends FSMMixin(HTMLElement) {
  constructor() {
    super();
    this.parseMachineTTL(stateMachineTTL);
    this._debug = true;
    const template = document
          .getElementById('pick-or-provide')
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
