/*

  https://css-tricks.com/styling-web-components/

*/
import {FiniteStateMachine} from '../../src/fsm.js';

class ResMenFSM extends FiniteStateMachine {
  constructor(resMen) {
    super();
    this.resMen = resMen;
    this.trace = [];
    var ttl = `
         @prefix st: <https://example.com/state/> .
         @prefix st: <https://example.com/transition/> .

         st:         tr:start            st:atIntro .
         st:atIntro  tr:click__dataset   st:inDataset .
         st:atIntro  tr:click__script    st:inScript .
         st:atIntro  tr:click__sparql    st:inSparql .

         st:inVid   tr:mousedown st:adjBeg .
         st:adjBeg  tr:mousemove st:adjBeg .
         st:adjBeg  tr:mouseup   st:haveBeg .
         st:haveBeg tr:mousedown st:adjEnd .
         st:adjEnd  tr:mousemove st:adjEnd .
         st:adjEnd  tr:mouseup   st:haveBegEnd .
       `;
    this.parseMachineTTL(ttl);
  }
  on__start() {
    this.resMen.showMain('dataset')
  }
}

export class ResourceMenu extends HTMLElement {
  constructor() {
    super();
    this.fsm = new ResMenFSM(this);
    const template = document
          .getElementById('resource-menu')
          .content;
    const shadowRoot = this.attachShadow({mode: 'open'})
          .appendChild(template.cloneNode(true));
  }
  showMain(which) {
    this.querySelectorAll('main').forEach((main) => {
      console.error(main);
      if (main.classList.contains(which)) {
        main.style.display = 'inherit';
      } else {
        main.style.display = 'none';
      }
    });
  }
}
