import {PrimaryButton} from './primarybutton.js';
import {BackButton} from './backbutton.js';
const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/huviz/css/introscreens.css" type="text/css">
  <div class="innerscreen">
    <div class="screen-info">
      <h1>Start</h1>
      <p>
        Pick a preloaded dataset, load your own file, or query an online knowledge base
      </p>
      <back-button></back-button>
    </div>
    <div class="option-list" flex-basis="25%">
      <div class="option">
        <primary-button buttonid="gotoBrowse" text="Load"></primary-button>
        <p class="button-info">Load an exising or community contributed dataset</p>
      </div>
      <div class="option">
        <primary-button buttonid="gotoContinue" text="Upload"></primary-button>
        <p class="button-info">Upload your own dataset or drag and drop anywhere on the page</p>
      </div>
      <div class="option">
        <primary-button buttonid="gotoSearch" text="Search"></primary-button>
        <p class="button-info">Search an online knowledge base</p>
      </div>
      <div class="option input">
      <input class="url-input" name="datasetUri" type="url" text="accepts extension jsonld|nt|nq|owl|rdf|ttl|trig|xml"
             pattern=".*(jsonld|nt|nq|owl|rdf|ttl|trig|xml)$"
             accept=".trig,.ttl,.jsonld,.nt,.owl,.rdf,.nq,.xml"
             class="box__uri"
             placeholder="Or enter URL here" />
      <action-button text="Load URL"></action-button>
    </div>
  </div>
`;

export class OnStart extends HTMLElement{
  constructor(){
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

window.customElements.define('on-start', OnStart);
