
// TODO deduplicate wrt src/huviz.js
const SUPPORTED_EXTENSION_REGEX = /.(jsonld|nq|nquads|nt|n3|trig|ttl|rdf|xml)$/;
const SUPPORTED_EXTENSION_MSG = 'Only accepts jsonld|nq|nquads|nt|n3|trig|ttl|rdf|xml extensions.';

export function hide(elem) {
  elem.style['display'] = 'none';
}
export function show(elem) {
  elem.style['display'] = null;
}

/*
  frEach -- an abbreviation of ForEachWord
    It splits the string of words into an array of words.
    Then runs function on each in turn.
*/
function frEach(string_of_words, func) {
  var array = string_of_words.split(' ');
  return array.forEach(func);
}

export const colorlog = function(msg, color='green', size='2em') {
  return console.log(`%c${msg}`, `color:${color};font-size:${size};`);
};

// inspiration: https://css-tricks.com/drag-and-drop-file-uploading/
export class DropLoader {
  constructor(huviz, picker) {
    this.resourceMenu = huviz;
    this.picker = picker;
    this.add_form_listeners();
    //show(this.form);
  }

  load_uri(firstUri) {
    //TODO SHOULD selection be added to the picker here, or wait for after successful?
    this.picker.add_uri({uri: firstUri, opt_group: 'Your Own'});
    //hide(this.form)
    return true; // ie success
  }

  save_file(firstFile, groupDetails, callback) {
    this.resourceMenu.local_file_data = "empty";
    const filename = firstFile.name;
    //TODO Are these lines still needed?
    this.form.querySelector('.box__success').innerText = firstFile.name;
    show(this.form.querySelector('.box__success'));
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        if (filename.match(SUPPORTED_EXTENSION_REGEX)) {
          console.debug(`${filename} is good, running add_local_file()`);
          this.picker.add_local_file({
            uri: firstFile.name,
            opt_group: groupDetails.opt_group,
            isOntology: groupDetails.isOntology,
            isUri: false,
            data: evt.target.result
          });
          if (callback) {
            callback();
          }
        } else {
          const msg = `Unknown file format. Unable to parse '${filename}'. `+
                SUPPORTED_EXTENSION_MSG;
          console.warn(msg);
          this.resourceMenu.blurt(msg, 'alert');
          this.resourceMenu.reset_dataset_ontology_loader();
          this.querySelector('.delete_option').setAttribute('style','');
        }
      } catch (e) {
        const msg = e.toString();
        this.resourceMenu.blurt(msg, 'error');
      }
    };
    reader.readAsText(firstFile);
    return true; // ie success
  }

  add_form_listeners() {
    var dnd_form = this.form = this.resourceMenu.querySelector('.local_file_form');
    dnd_form.addEventListener('drop', this.handleDrop.bind(this));
    dnd_form.addEventListener('submit', this.stopProp.bind(this));

    // frEach == ForEachWord
    frEach('unfocus drag dragstart dragend dragenter dragleave drop',
           e => dnd_form.addEventListener(e, this.stopProp.bind(this)));

    frEach('submits',
           e => dnd_form.addEventListener(e, this.validateFields.bind(this)));

    frEach('dragenter',// not needed for 'dragover'
           e => dnd_form.addEventListener(e, this.addIsDragover.bind(this)));

    frEach('dragleave dragend drop',
           e => dnd_form.addEventListener(e, this.removeIsDragover.bind(this)));

    frEach('click',
           e => this.resourceMenu.querySelector('#datasetUpload').
           addEventListener(e, console.error));
  }
  validateFields(evt) {
    colorlog('validateFields');
    const uri_field = this.form.querySelector('.box__uri');
    const uri = uri_field.value;
    if (uri_field[0].checkValidity()) {
      uri_field.value = '';
      this.load_uri(uri);
    }
    return false;
  }
  stopProp(evt) {
    colorlog('stopProp');
    evt.preventDefault(); // prevents form submission
    //evt.stopPropagation();
    return false;
  }
  addIsDragover(evt) {
    colorlog('addIsDragover');
    this.form.classList.add('is-dragover');
  }
  removeIsDragover(evt) {
    colorlog('removeIsDragover');
    this.form.classList.remove('is-dragover');
  }
  handleDrop(evt) {
    colorlog('handleDrop');
    console.debug(evt);
    console.debug("evt.dataTransfer:", evt.dataTransfer);
    hide(this.form.querySelector('.box__input'))
    const droppedUris = evt.dataTransfer.getData("text/uri-list").split("\n");
    console.debug("droppedUris",droppedUris);
    const firstUri = droppedUris[0];
    if (firstUri.length) {
      if (this.load_uri(firstUri)) {
        this.form.querySelector(".box__success").innerText = '';
        this.picker.refresh();
        //hide(this.form)
        return;
      }
    }
    const droppedFiles = evt.dataTransfer.files;
    console.debug("droppedFiles", droppedFiles);
    if (droppedFiles.length) {
      const firstFile = droppedFiles[0];
      if (this.load_file(firstFile)) {
        this.form.querySelector(".box__success").innerText = '';
        this.picker.refresh();
        //hide(this.form);
        return;
      }
    }
    // the drop operation failed to result in loaded data, so show 'drop here' msg
    show(this.form.querySelector('.box__input'));
    this.picker.refresh();
  };
}
