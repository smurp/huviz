
import { FSMMixin, FiniteStateMachine } from '../../src/fsm.js';
import { DatasetDBMixin } from '../../src/datasetdb.js';
import { PickOrProvidePanel } from '../pickorprovide/pickorprovide.js';
import { DropLoader } from './droploader.js';

// https://www.gitmemory.com/issue/FortAwesome/Font-Awesome/15316/517343443
//   see _load_font_awesome() in this file
import {
  config, dom, library
} from '../../node_modules/@fortawesome/fontawesome-svg-core/index.es.js'
import { fas } from '../../node_modules/@fortawesome/free-solid-svg-icons/index.es.js';
import { fab } from '../../node_modules/@fortawesome/free-brands-svg-icons/index.es.js';
// https://fontawesome.com/v5.0/how-to-use/with-the-api/setup/configuration
config.autoAddCss = false;

customElements.define('pick-or-provide', PickOrProvidePanel);

export const colorlog = function(msg, color='green', size='2em') {
  return console.log(`%c${msg}`, `color:${color};font-size:${size};`);
};

export const cleanse_fakepath = function(possible_fakepath) {
  const c_fakepath = "C:\\fakepath\\";
  if (possible_fakepath.startsWith(c_fakepath)) {
    return possible_fakepath.replace(c_fakepath, '');
  }
  return possible_fakepath;
}

var resMenFSMTTL= `
         # this graph defines the connections in the state machine
         @prefix st: <https://example.com/state/> .
         @prefix tr: <https://example.com/transition/> .

         st:           tr:start         st:onFirst .
         st:onFirst    tr:gotoStart     st:onStart .
         st:onFirst    tr:gotoContinue  st:onContinue .

         st:onStart    tr:gotoBrowse    st:onBrowse .
         st:onStart    tr:gotoUpload    st:onUpload .
         st:onStart    tr:gotoURL       st:onGo .
         st:onStart    tr:gotoQuery     st:onQuery .
         st:onStart    tr:esc           st:onFirst .

         st:onContinue tr:esc           st:onFirst .

         st:onScriptDetail tr:esc       st:onContinue;

         st:onBrowse   tr:esc           st:onStart .

         st:onUpload   tr:esc           st:onStart .
         st:onUpload   tr:vizUpload     st:onGo .

         st:onURL      tr:esc           st:onStart .
         st:onQuery    tr:esc           st:onStart .

         st:onGo       tr:none          st:done .
         st:onGo       tr:esc           st:onStart .

         # st:ANY        tr:gotoAbout     st:onAbout .
         # st:ANY        tr:gotoCredit    st:onCredit .
         # st:ANY        tr:gotoHelp      st:onHelp .

       `;

export class ResourceMenu extends DatasetDBMixin(FSMMixin(HTMLElement)) {
  constructor() {
    super();
    window.theResourceMenu = this;

    /* prepare FiniteStateMachine */
    this.parseMachineTTL(resMenFSMTTL);
    this._debug = true; // log FiniteStateMachine efforts

    /* insert the template -- resourcemenu.html */
    const template = document
          .getElementById('resource-menu')
          .content;
    const shadowRoot = this.attachShadow({mode: 'open'})
          .appendChild(template.cloneNode(true));
    this._load_font_awesome(); // depends on shadowRoot

    /* wire up all the buttons so they can perform their transitions */
    this.addIDClickListeners('main, button, [id]', this.clickListener.bind(this));

    /* Initialize the beBrave feature, which can be removed when out of beta */
    this._toggleBeingBrave();

    /* perform 'start' transition to get things going */
    this.transit('start', {});
    // During development it is sometimes handy to just jump to a particular screen:
    /*
      this.transit('gotoStart',
       { console.error('hard-coded transit("gotoStart") to ease development')});
    */
  }
  blurt(...stuff) {
    console.warn("BLURT",stuff);
    this.huviz.blurt(stuff);
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
    this.defaultOntologyUri = this.querySelector('#defaultOntologyUri');
    this.defaultOntologyName = this.querySelector('#defaultOntologyName');
    this.init_resource_menus(args); // add {dataset,ontology,script,endpoint}_loader
    this.mirror_loaders_to_huviz(); // then mirror them on this.huviz
    let dnd = new DropLoader(this, this.dataset_loader);
    window.theLoader = dnd;
    this.drop_loader = dnd;
    this._set_up_tabs();
  }
  mirror_loaders_to_huviz() {
    // put properties on huviz to point to the loaders
    const loaders = 'dataset ontology script endpoint'.split(' ');
    for (let k of loaders) {
      var loader_name = `${k}_loader`;
      this.huviz[loader_name] = this[loader_name];
    }
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
  querySelectorAll(sel) {
    return this.shadowRoot.querySelectorAll(sel);
  }
  clickListener(evt) {
    let target = evt.target;
    let targetId = target.id;
    // The svg and path elements injected by fontawesome  don't have ids but need to be ignored
    if (!targetId && ['svg','path'].includes(target.nodeName)) {
      console.debug("seeking new target because on id found on", target)
      target = target.closest('main, button, [id]');
      console.debug('closest target:', target);
      targetId = target?.id;  // get the id if there is one
    }
    console.debug('clickListener', {evt, targetId});
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
    this.querySelectorAll(selector).forEach((item) => {
      console.debug("addEventListener", {item});
      item.addEventListener('click', handler);
    })
  }
  enter__(evt, stateId) {
    colorlog(`enter__ ${stateId}`);
    if (evt.preventDefault) {
      //evt.preventDefault();
      //evt.stopPropagation();
    }
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

  /* These catch transitions which might appear anywhere
     and hence are to cumbersome to have full state-transition-state
     triples defined for them.  These functions have the form:
       on__<transitionId>()
     See fsm.transit for details.
  */
  on__gotoAbout(evt) {
    this.showMain('onAbout');
  }
  on__gotoCredit(evt) {
    this.showMain('onCredit');
  }
  on__gotoHelp(evt) {
    this.showMain('onHelp');
  }
  on__gotoSettings(evt) {
    this.huviz.toggle_tabs();
    this.huviz.goto_tab('settings');
  }

  /*
    onUpload Start
  */
  enter__onUpload(userGeneratedClickEvt, stateId) {
    colorlog('enter__onUpload()');
    this.showMain(stateId); // display the onUpload UX
    if (!this.datasetUpload) { // do this once, this method might be called again
      this.datasetUpload = this.querySelector('#datasetUpload');
      this.ontologyUpload = this.querySelector('#ontologyUpload');
      this.ontologyTitle = this.querySelector('#ontologyTitle');
      // vizUpload click handled because its id is the uri of a transition
      this.visualizeUploadBtn = this.querySelector('#vizUpload');
      var validate =  this._validate_onUpload.bind(this);
      this.datasetUpload.addEventListener('change', validate);
      this.ontologyUpload.addEventListener('change', validate);
      validate();
    }
    // must use userGeneratedClickEvt, otherwise it will be rejected
    this.datasetUpload?.click(userGeneratedClickEvt); // fake click 'Choose File'
  }
  _validate_onUpload() {
    const {form} = this.drop_loader;
    var datasetUri = this.datasetUpload.value;
    var datasetIsValid = !!(datasetUri && datasetUri.length);
    var ontologyUri = this.ontologyUpload.value;
    var hasCustomOnto = !!(ontologyUri && ontologyUri.length);
    var isValid = datasetIsValid
    console.debug('_validate_onUpload()', {
      datasetUri, ontologyUri, isValid
    });
    form.classList.toggle('hasCustomOnto', hasCustomOnto);
    if (isValid) {
      this.visualizeUploadBtn.removeAttribute('disabled');
    } else {
      this.visualizeUploadBtn.setAttribute('disabled', 'disabled');
    }
  }
  // onUpload end

  // onStart Start
  enter__onStart(evt, stateId) {
    this.showMain(stateId); // display the onStart UX
    if (!this.datasetUri) {
      this.datasetUri = this.querySelector("[name='datasetUri']");
      this.datasetUri.addEventListener('input', this.onchange_datasetUri.bind(this));
      this.datasetUri.addEventListener('change', this.onchange_datasetUri.bind(this));
      this.gotoURLButton = this.querySelector('#gotoURL');
      //this.gotoURLButton2 = this.querySelector('#gotoURL2');
    }
    colorlog('enter__onStart() ended');
  }
  onchange_datasetUri(evt) {
    const noValue = !evt.target.value;
    const badPattern = evt.target.validity.patternMismatch;
    window.lookAtMe = evt.target;
    this.gotoURLButton.toggleAttribute('disabled', noValue||badPattern);
    //this.gotoURLButton2.toggleAttribute('disabled', noValue||badPattern);
  }

  /* onGo start */
  enter__onGo(evt, stateId) {
    this.showMain(stateId);
    var datUri = this.datasetUpload?.value || this.datasetUri?.value;
    datUri = cleanse_fakepath(datUri);  // remove leading C:\fakepath\ when file is local
    var datName = datUri; // TODO make this editable
    var ontUri = this.ontologyUpload?.value;
    var ontName = ontUri;
    if (!ontUri) {
      ontUri = this.defaultOntologyUri?.value;
      ontUri = cleanse_fakepath(ontUri);
      ontName = this.defaultOntologyName?.value || ontUri;
    } else {
      ontUri = cleanse_fakepath(ontUri);
      ontName = cleanse_fakepath(ontUri);
    }

    this.querySelector('#loadingDatasetUri').innerHTML = datUri;
    this.querySelector('#loadingDatasetName').innerHTML = datName;
    this.querySelector('#loadingOntologyUri').innerHTML = ontUri;
    this.querySelector('#loadingOntologyName').innerHTML = ontName;

    const datRsrc = {value: datUri, label: datName};
    const ontRsrc = {value: ontUri, label: ontName};

    var saveDataset = () => {
      const firstFile = this.datasetUpload?.files[0];
      if (firstFile) {
        const makeCallback = (data, onto) => {
          return () => {
            this.huviz.launch_visualization_with({data, onto});
          }
        }
        this.drop_loader.save_file(firstFile, {opt_group:'Your Own', isOntology:false}, makeCallback(datRsrc, ontRsrc));
      } else {
        // an URL must have been provided instead
        this.huviz.launch_visualization_with({data:datRsrc, onto:ontRsrc});
      }
    }
    // save ontology if there is one
    const firstOntologyFile = this.ontologyUpload?.files[0];
    if (firstOntologyFile) {
      // ensure that (if provided) the ontology has been saved to indexedDb
      this.drop_loader.save_file(firstOntologyFile, {opt_group:'Ontologies', isOntology:true}, saveDataset);
    } else {
      // no locally file upload was provided, so just proceed
      saveDataset();
    }
  }
  // onGo end

  showMain(which) {
    console.debug(`showMain('${which}')`);
    this.querySelectorAll('main').forEach((main) => {
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
    console.debug("value:",whichLoader.value);
  }

  load_script_and_run(err, rsrcRec) {
    if (err != null) {
      this.blurt(err, 'error');
    } else {
      this.load_script_from_db(err, rsrcRec);
      this.launch_visualization();
    }
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
      } else if (ontology_label) { // or use the label if it is set
        this.set_ontology_with_label(ontology_label);
      } else { // or default to 'OWL mini'
        this.set_ontology_with_uri('/data/owl_mini.ttl');
      }
    }
    if (this.huviz) {
      this.launch_visualization();
    }
    this.ontology_loader.update_state();
  }

  get_chosen_data() {
    return {value: this.dataset_loader.value,  // uri
            label: this.dataset_loader.label};
  }
  get_chosen_onto() {
    return {value: this.ontology_loader.value,
            label: this.ontology_loader.label};
  }
  get_chosen_script() {
    return {value: this.script_loader.value,
            label: this.script_loader.label};
  }
  get_chosen_endpoint() {
    return {value: this.endpoint_loader.value,
            label: this.endpoint_loader.label};
  }
  get_user_choices() {
    var data = this.get_chosen_data();
    var onto = this.get_chosen_onto();
    var script = this.get_chosen_script();
    var endpoint = this.get_chosen_endpoint();
    return {data, onto, script, endpoint};
  }

  launch_visualization() {
    if (!this.huviz) {
      console.warn(`launch_visualization called before this.huviz is assigned`);
      return;
    }
    this.huviz.launch_visualization_with(this.get_user_choices());
  }

  set_SOMETHING_by_selector(sumut, selector) {
    let elem = sumut.querySelector(selector);
    sumut.setSelectedElem(elem);
  }

  set_SOMETHING_to_value(sumut, val) {
    sumut.val(val);
    console.debug("set_SOMETHING_to_value()", sumut.label, val)
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

  /* hacks and other code to eventually be retired */
  _toggleBeingBrave(evt) {
    if (!evt) {
      this._beBraveCheckbox = this.querySelector('.beBrave input');
      if (!this._beBraveCheckbox) {
        console.warn('".beBrave input" not found in HTML so abandon initialization');
        return;
      } else {
        this._beBraveCheckbox.onchange = this._toggleBeingBrave.bind(this);
        /*
        this.shadowRoot.insertAdjacentHTML('afterbegin',`
        <style class="bravery"></style>
       `);
        */
        this._braveryStyle = this.querySelector('.bravery');
      }
    }
    let shouldBeBrave = !!this._beBraveCheckbox.checked;
    if (shouldBeBrave) {
      // .danger is normally display:none so beingBrave just makes it yellow
      this._braveryStyle.innerHTML = `
         .danger {
            background-color:yellow;
          }
         `;
    } else {
      // remove bravery!
      this._braveryStyle.innerHTML = `
         .danger {
            display: none;
         }
         `;
    }
  }
  _load_font_awesome() {
    // https://www.gitmemory.com/issue/FortAwesome/Font-Awesome/15316/517343443
    library.add( fas, fab );
    dom.watch({
      autoReplaceSvgRoot: this.shadowRoot,
      observeMutationsRoot: this.shadowRoot
    })
    this.querySelector('.fontawesomeness').innerHTML = dom.css();
  }
  _move_intro_tab_over_here() {
    const introTab = document.querySelector('#contents_of_intro_tab');
    if (introTab) {
      const aboutContent = this.querySelector('.onAbout .content');
      if (aboutContent) {
        aboutContent.insertAdjacentElement('afterbegin', introTab);
      }
    }
  }
  _set_up_tabs() {
    this._move_intro_tab_over_here();
    const creditContent = this.querySelector('.onCredit .content');
    this.huviz.withUriDo("/huviz/docs/credits.md", creditContent);
  }
}
