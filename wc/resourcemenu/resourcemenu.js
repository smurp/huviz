/*

  https://css-tricks.com/styling-web-components/

*/

import {colorlog} from '../../src/huviz.js';
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

         st:onContinue tr:esc           st:onFirst .

         st:onScriptDetail tr:esc       st:onContinue;

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
    window.theResourceMenu = this;
    this.parseMachineTTL(resMenFSMTTL);
    this._debug = true;
    const template = document
          .getElementById('resource-menu')
          .content;
    const shadowRoot = this.attachShadow({mode: 'open'})
          .appendChild(template.cloneNode(true));
    // Next, wire up all the buttons so they can perform their transitions
    this.addIDClickListeners('main, button, [id]', this.clickListener.bind(this));

    this.addSpecialHandlerForFileUpload();

    // perform 'start' transition to get things going
    this.transit('start', {});

    // During development it is sometimes handy to just jump to a particular screen:
    /*
      this.transit('gotoStart',
       { console.error('hard-coded transit("gotoStart") to ease development')});
    */
  }

  addSpecialHandlerForFileUpload() {
    /*
      The onStart 'Upload' button is very tricksy!
      The click on the label[for="fupload"] is what triggers the 'Choose File'
      experience provided by the browser.  We do it this way because it can't
      be triggered programmatically, only by a user click event.
      This additional 'click' listener for ensures that clicking on the label
      has the same impact as having clicked on the Button it is contained by.

      Current problem: if the click happens on the onStart.gotoUpload button
      instead of the onStart[for="fupload"] label then there are two failures:
      1. the 'Choose File' operation is not triggered (understandable)
      2. the transition to onUpload is not triggered (confusing)

      Here is a different version of button/label combo with label on the outside:
        <dt><label for="fupload"><button id="gotoUpload">Upload</button></label></dt>
    */
    let onStartUploadLabel = this.querySelector(`.onStart label[for="fupload"]`);
    onStartUploadLabel?.addEventListener("click", evt => this.showMain('onUpload'));
    this.fileUploadInput = this.querySelector('#fupload');
  }

  blurt(...stuff) {
    this.huviz.blurt(___stuff);
  }
  registerHuViz(huviz) {
    this.huviz = huviz;
    this.huviz.collapse_tabs();
    this.registerPickOrProvide();
    // convey the args from HuViz, motivated by args.preload
    var args = Object.assign({make_pickers: true}, huviz.args);
    args.dataset_loader__append_to_sel = this.querySelector('#datasetHere');
    args.ontology_loader__append_to_sel = this.querySelector('#ontologyHere');
    args.script_loader__append_to_sel = this.querySelector('#scriptHere');
    args.endpoint_loader__append_to_sel = this.querySelector('#endpointHere');
    this.init_resource_menus(args); // add {dataset,ontology,script,endpoint}_loader
  }
  registerPickOrProvide() {
    var pops = this.querySelectorAll('pick-or-provide');
    for (const pop of pops) {
      pop.registerHuViz(this);
    }
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
    console.debug(`enter__(evt, '${stateId}') called because enter__${stateId}() does not exist`);
    if (stateId && stateId.length) { // ignore empty string
      this.showMain(stateId);
    } else {
      console.debug(`enter__() is a noop when stateId==${stateId}`);
    }
  }
  enter__END(evt, stateId) {
    this.parentNode.removeChild(this);
  }
  enter__onUpload(evt, stateId) {
    var fupload = this.fileUploadInput;
    requestIdleCallback(() => fupload.click(evt));
    this.showMain(stateId);
  }

  showMain(which) {
    console.debug(`showMain('${which}')`);
    this.shadowRoot.querySelectorAll('main').forEach((main) => {
      if (main.classList.contains(which)) {
        main.style.display = 'block';
      } else {
        main.style.display = 'none';
      }
    });
  }

  handleLoaderClickInResourceMenu(whichLoader, evt) {
    let uri = evt.target.getAttribute('value');
    switch (whichLoader) {
    case this.dataset_loader:
      whichLoader.setSelectedElem(evt.target);
      //this.set_ontology_from_dataset_if_possible();
      //this.try_to_visualize_dataset_using_ontology_and_script();
      break;
    case this.endpoint_loader:
      this.transit('pick', evt);
      console.error("implement state change to sparqlDetails");
      break;
    case this.ontology_loader:
      console.warn('handleLoaderClickInResourceMenu a noop for ontology_loader')
      break;
    case this.script_loader:
      this.get_resource_from_db(uri, this.load_script_and_run.bind(this));
      break;
    default:
      console.warn(whichLoader, "ignored by handleLoaderClickInResourceMenu()");
    }
    console.log("value:",whichLoader.value);
  }

  load_script_and_run(err, rsrcRec) {
    if (err != null) {
      this.blurt(err, 'error');
    }
    this.load_script_from_db(err, rsrcRec);
    this.auto_click_big_go_button_if_ready();
  }

  try_to_visualize_script(ignoreEvent, dataset, ontologies, scripts) {
    // Either dataset and ontologies are passed in by HuViz.load_with() from a command
    // or we are called with neither in which case get values from the SPARQL or SCRIPT loaders
    var huviz = this.huviz;
    let data, endpoint_label_uri;
    colorlog('visualize_dataset_using_ontology_and_script()');
    huviz.close_blurt_box();

    // If we are loading from a SCRIPT
    const alreadyCommands = huviz.gclui.future_cmdArgs.length > 0;
    console.error('reimplement script loading for dataset and onto picking');
    if (this.script_loader && this.script_loader.value && !alreadyCommands) {
      const scriptUri = this.script_loader.value;
      this.get_resource_from_db(scriptUri, this.load_script_from_db.bind(this));
      return;
    }

    // Otherwise we are starting with a dataset and ontology
    huviz.turn_on_loading_notice_if_enabled();
    //const onto = (ontologies && //ontologies[0]) || this.ontology_loader;
    const onto = ontologies[0]
    data = dataset; //|| this.dataset_loader;
    // at this point data and onto are both objects with a .value key, containing url or fname
    if (!(onto.value && data.value)) {
      console.debug(data, onto);
      this.update_dataset_forms();
      throw new Error("Now whoa-up pardner... both data and onto should have .value");
    }
    huviz.load_data_with_onto(data, onto, huviz.after_visualize_dataset_using_ontology);
    huviz.update_browser_title(data);
    huviz.update_caption(data.value, onto.value);
    huviz.disable_dataset_ontology_loader(data, onto, endpoint);
  }

  update_resource_menu(args) {
    var {dataset_loader, ontology_loader, endpoint_loader, script_loader} = this;
    var ready = (
      (dataset_loader != null) &&
      (ontology_loader != null) &&
      (endpoint_loader != null) &&
      (script_loader != null));
    if (!ready) {
      console.error({dataset_loader, ontology_loader, endpoint_loader, script_loader, args});
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

  set_SOMETHING_to_value(sumut, val) {
    sumut.val(val);
    console.log("set_SOMETHING_to_value()", sumut.label, val)
  }

  set_dataset_with_uri(uri) {
    //this.set_SOMETHING_by_selector(this.dataset_loader, `[value='${uri}']`);
    this.set_SOMETHING_to_value(this.dataset_loader, uri);
  }

  set_ontology_with_label(seek) {
    this.set_SOMETHING_by_selector(this.ontology_loader, `[label='${seek}']`);
  }

  set_ontology_with_uri(uri) {
    //this.set_SOMETHING_by_selector(this.ontology_loader, `[value='${uri}']`);
    this.set_SOMETHING_to_value(this.ontology_loader, uri);
  }

  adjust_menus_from_load_cmd(cmd) { // move to resourcemenu
    // Adjust the dataset and ontology loaders to match the cmd
    if (cmd.ontologies && (cmd.ontologies.length > 0) && !this.ontology_loader.value) {
      this.set_ontology_with_uri(cmd.ontologies[0]);
      if (cmd.data_uri && !this.dataset_loader.value) {
        this.set_dataset_with_uri(cmd.data_uri);
        return true;
      }
    }
    return false;
  }
}
