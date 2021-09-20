/*

  https://css-tricks.com/styling-web-components/

*/

import {FSMMixin, FiniteStateMachine} from '../../src/fsm.js';
import {DatasetDBMixin} from '../../src/datasetdb.js';
import {PickOrProvidePanel} from '../pickorprovide/pickorprovide.js';

customElements.define('pick-or-provide', PickOrProvidePanel);

var resMenFSMTTL= `
         # this graph defines the connections in the state machine
         @prefix st: <https://example.com/state/> .
         @prefix tr: <https://example.com/transition/> .

         st:           tr:start         st:onFirst .
         st:onFirst    tr:gotoStart     st:onStart .
         st:onFirst    tr:gotoContinue  st:onContinue .

         st:onStart    tr:gotoBrowse    st:onBrowse .
         st:onStart    tr:gotoUpload    st:onUpload .
         st:onStart    tr:gotoURL       st:onURL .
         st:onStart    tr:gotoQuery     st:onQuery .
         st:onStart    tr:esc           st:onFirst .

         st:onBrowse   tr:esc           st:onStart .
         st:onUpload   tr:esc           st:onStart .
         st:onURL      tr:esc           st:onStart .
         st:onQuery    tr:esc           st:onStart .
       `;

var XXXresMenFSMTTL= `
         @prefix st: <https://example.com/state/> .
         @prefix tr: <https://example.com/transition/> .

         st:           tr:start         st:onFront .
         st:onFront    tr:gotoDataset   st:onDataset .
         st:onFront    tr:gotoScript    st:onScript .
         st:onFront    tr:gotoSPARQL    st:onSPARQL .

         st:onFront    tr:esc           st:END .
         st:onDataset  tr:esc           st:onFront .
         st:onScript   tr:esc           st:onFront .
         st:onSPARQL   tr:esc           st:onFront .
         st:onSPARQLDetail  tr:esc      st:onSPARQL .

         st:onSPARQL   tr:pick         st:onSPARQLDetail .
         st:onHelp     tr:esc          st:onFront .
         st:onCredits  tr:esc          st:onFront .
       `;


export class ResourceMenu extends DatasetDBMixin(FSMMixin(HTMLElement)) {
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
    this.transit('start', {});
//    this.transit('gotoStart',{ console.error('hard-coded transit("gotoStart") to ease development')});
  }
  blurt(...stuff) {
    this.huviz.blurt(___stuff);
  }
  registerHuViz(huviz) {
    this.huviz = huviz;
    this.registerPickOrProvide();
    // convey the args from HuViz, motivated by args.preload
    var args = Object.assign({make_pickers: true}, huviz.args);
    args.dataset_loader__append_to_sel = this.querySelector('#datasetHere');
    args.ontology_loader__append_to_sel = this.querySelector('#ontologyHere');
    args.script_loader__append_to_sel = this.querySelector('#scriptHere');
    args.endpoint_loader__append_to_sel = this.querySelector('#endpointHere');

    this.init_resource_menus(args); // add {dataset,ontology,script,endpoint}_loader
    this.huviz.collapse_tabs();
  }
  registerPickOrProvide() {
    var pop = this.querySelector('pick-or-provide');
    pop.registerHuViz(this.huviz);
  }
  querySelector(sel) {
    return this.shadowRoot.querySelector(sel);
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
      //console.debug("addEventListener", {item});
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

  handleLoaderClickInResourceMenu(whichLoader, evt) {
    switch (whichLoader) {
    case this.dataset_loader:
      this.set_ontology_from_dataset_if_possible();
      break;
    case this.endpoint_loader:
      this.transit('pick', evt);
      console.error("implement state change to sparqlDetails");
      break;

    default:
      console.warn(whichLoader, "ignored by handleLoaderClickInResourceMenu()");
    }
  }

  update_resource_menu(args) {
    if (!((this.dataset_loader != null) &&
          (this.ontology_loader != null) &&
          (this.endpoint_loader != null) &&
          (this.script_loader != null))) {
      console.log("still building loaders...");
      return;
    }
    this.set_ontology_from_dataset_if_possible(args);
  }

  set_ontology_from_dataset_if_possible(args) {
    if (args == null) { args = {}; }
    if (args.pickOrProvide === this.ontology_loader) { // and @dataset_loader.value
      // The ontology_loader being adjusted provoked this call.
      // We do not want to override the adjustment just made by the user.
      return;
    }
    if (this.dataset_loader.value) { // and not @ontology_loader.value
      const option = this.dataset_loader.getSelectedElem();
      const ontologyUri = option.dataset['ontologyUri'];
      const ontology_label = option.dataset['ontology_label']; //default set in group json file
      if (ontologyUri) { // let the uri (if present) dominate the label
        this.set_ontology_with_uri(ontologyUri);
      } else {
        this.set_ontology_with_label(ontology_label);
      }
    }
    if (this.huviz) {
      this.auto_click_big_go_button_if_ready();
    }
    this.ontology_loader.update_state();
  }

  auto_click_big_go_button_if_ready() {
    if (!this.huviz) {
      console.warn(`auto_click_big_go_button_if_ready() before this.huviz`);
      return;
    }
    if ((this.dataset_loader.value && this.ontology_loader.value)) {
      let data = {value: this.dataset_loader.value,  // uri
                  label: this.dataset_loader.label};
      let ontos = [{value: this.ontology_loader.value,
                    label: this.ontology_loader.label}];
      let scripts = null;
      if (this.script_loader.value) {
        scripts = [{value: this.script_loader.value,
                    label: this.script_loader.label}];
      }
      this.huviz.expand_tabs();
      console.log({data, ontos, scripts});
      this.huviz.visualize_dataset_using_ontology_and_script(
        {}, // ignoreEvent
        data,
        ontos,
        scripts);
    } else if (this.endpoint_loader.value) {
      throw new Error('should implement visualize_dataset_using_endpoint');
      //this.huviz.visualize_dataset_using_
    }
  }

  set_SOMETHING_by_selector(sumut, selector) {
    let elem = sumut.querySelector(selector);
    sumut.setSelectedElem(elem);
  }

  set_dataset_with_uri(seek) {
    this.set_SOMETHING_by_selector(this.dataset_loader, `[value='${seek}']`);
  }

  set_ontology_with_label(seek) {
    this.set_SOMETHING_by_selector(this.ontology_loader, `[label='${seek}']`);
  }

  set_ontology_with_uri(seek) {
    this.set_SOMETHING_by_selector(this.ontology_loader, `[value='${seek}']`);
  }
}
