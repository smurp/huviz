
import {uniquer, unique_id} from './uniquer.js'; // TODO rename to make_dom_safe_id

function hide(elem) {
  elem.style['display'] = 'none';
}
function show(elem) {
  elem.style['display'] = null;
}

export class PickOrProvide {
  static initClass() {
    this.prototype.tmpl = `
    <form id="UID" class="pick_or_provide_form" method="post" action="" enctype="multipart/form-data">
      <!--
        <span class="pick_or_provide_label">REPLACE_WITH_LABEL</span>
        -->
      <Xselect name="pick_or_provide"></Xselect>
      <div class="pick_or_provide"></div>
      <button type="button" class="delete_option">
        <i class="fas fa-trash" style="font-size: 1.2em;"></i>
      </button>
    </form>`;
    this.prototype.uri_file_loader_sel = '.uri_file_loader_form';
  }

  constructor(huviz, append_to_sel, label, css_class, isOntology, isEndpoint, opts) {
    this.containingElem = huviz;
    this.add_uri = this.add_uri.bind(this);
    this.add_local_file = this.add_local_file.bind(this);
    this.add_resource_option = this.add_resource_option.bind(this);
    this.onchange = this.onchange.bind(this);
    this.getSelectedElem = this.getSelectedElem.bind(this);
    this.deleteSelectedElem = this.deleteSelectedElem.bind(this);
    this.huviz = huviz;
    if (typeof(append_to_sel) == typeof('')) {
      this.append_to = document.querySelector(append_to_sel);
    } else {
      this.append_to = append_to_sel;
    }
    this.label = label;
    this.css_class = css_class;
    this.isOntology = isOntology;
    this.isEndpoint = isEndpoint;
    this.opts = opts;
    if (this.opts == null) { this.opts = {}; }
    this.uniq_id = unique_id();
    this.select_id = unique_id();
    this.pickable_uid = unique_id();
    this.your_own_uid = unique_id();
    this.find_or_append_form();
    const dndLoaderClass = this.opts.dndLoaderClass || DragAndDropLoader;
    this.drag_and_drop_loader = new dndLoaderClass(this.huviz, this.append_to, this);
    hide(this.drag_and_drop_loader.form);
    this.add_group({label: "Your Own", id: this.your_own_uid}, 'beforeend');
    console.warn(`SUPPRESSING 'Provide New ${this.label}'`)
    console.warn("SUPPRESSING 'Pick or Provide'")
    this.update_change_stamp();
  }

  querySelector(sel) {
    //return this.containingElem.querySelector(sel);
    var container = this.containingElem.shadowRoot ||  this.containingElem;
    return container.querySelector(sel);
  }

  querySelectorAll(sel) {
    var container = this.containingElem.shadowRoot ||  this.containingElem;
    return container.querySelectorAll(sel);
  }

  update_change_stamp() {
    this.change_stamp = performance.now();
  }

  is_quiet(msec) {
    if (msec == null) { msec = 200; }
    if (this.change_stamp != null) {
      if ((performance.now() - this.change_stamp) > msec) {
        return true;
      }
    }
    return false;
  }

  select_by_uri(targetUri) {
    const option = $('#' + this.select_id + ' option[value="' + targetUri + '"]');
    if (option.length !== 1) {
      throw new Error(`${targetUri} was not found`);
    }
    this.select_option(option);
  }

  val(val) {
    console.debug(this.constructor.name +
        '.val(' + ((val && ('"'+val+'"')) || '') + ') for ' +
        this.opts.rsrcType + ' was ' + this.value);
    //this.pick_or_provide_select.value = val;
    this.old_value = this.value;
    this.value = val;
    this.refresh();
  }

  disable() {
    this.pick_or_provide_select.setAttribute('disabled', true);
    hide(this.form.querySelector('.delete_option'))
  }

  enable() {
    this.pick_or_provide_select.setAttribute('disabled', false);
    show(this.form.querySelector('.delete_option'))
  }

  select_option(option) {
    const new_val = option.value;
    //console.table([{last_val: @last_val, new_val: new_val}])
    const cur_val = this.pick_or_provide_select.value;
    // TODO remove last_val = null in @init_resource_menus() by fixing logic below
    //   What is happening is that the AJAX loading of preloads means that
    //   it is as if each of the new datasets is being selected as it is
    //   added -- but when the user picks an actual ontology then
    //   @set_ontology_from_dataset_if_possible() fails if the new_val == @last_val
    if (cur_val !== this.last_val) { // and not @isOntology
      this.last_val = cur_val;
    }
    if (this.last_val !== new_val) {
      this.last_val = new_val;
      if (new_val) {
        this.pick_or_provide_select.value = new_val
        this.value = new_val;
      } else {
        // TODO should something be done here?
        console.debug("PickOrProvide:",this);
        console.debug("option:",option);
        console.warn("TODO should set option to nothing");
      }
    }
  }

  add_uri(uri_or_rec) {
    let rsrcRec, uri;
    if (typeof uri_or_rec === 'string') {
      uri = uri_or_rec;
      rsrcRec = {};
    } else {
      rsrcRec = uri_or_rec;
    }
    if (rsrcRec.uri == null) { rsrcRec.uri = uri; }
    if (rsrcRec.isOntology == null) { rsrcRec.isOntology = this.isOntology; }
    if (rsrcRec.isEndpoint == null) { rsrcRec.isEndpoint = this.isEndpoint; }
    if (rsrcRec.time == null) { rsrcRec.time = (new Date()).toISOString(); }
    if (rsrcRec.isUri == null) { rsrcRec.isUri = true; }
    if (rsrcRec.title == null) { rsrcRec.title = rsrcRec.uri; }
    if (rsrcRec.canDelete == null) { rsrcRec.canDelete = !(rsrcRec.time == null); }
    if (rsrcRec.label == null) {
      rsrcRec.label = rsrcRec.uri.split('/').reverse()[0] || rsrcRec.uri; }
    if (rsrcRec.label === "sparql") { rsrcRec.label = rsrcRec.uri; }
    if (rsrcRec.rsrcType == null) { rsrcRec.rsrcType = this.opts.rsrcType; }
    // rsrcRec.data ?= file_rec.data # we cannot add data because for uri we load each time
    this.add_resource(rsrcRec, true);
    this.update_change_stamp();
    this.update_state();
  }

  add_local_file(file_rec) {
    // These are local files which have been 'uploaded' to the browser.
    // As a consequence they cannot be programmatically loaded by the browser
    // and so we cache them
    //local_file_data = file_rec.data
    //@huviz.local_file_data = local_file_data
    let rsrcRec, uri;
    if (typeof file_rec === 'string') {
      uri = file_rec;
      rsrcRec = {};
    } else {
      rsrcRec = file_rec;
      if (rsrcRec.uri == null) { rsrcRec.uri = uri; }
      if (rsrcRec.isOntology == null) { rsrcRec.isOntology = this.isOntology; }
      if (rsrcRec.time == null) { rsrcRec.time = (new Date()).toISOString(); }
      if (rsrcRec.isUri == null) { rsrcRec.isUri = false; }
      if (rsrcRec.title == null) { rsrcRec.title = rsrcRec.uri; }
      if (rsrcRec.canDelete == null) { rsrcRec.canDelete = !(rsrcRec.time == null); }
      if (rsrcRec.label == null) { rsrcRec.label = rsrcRec.uri.split('/').reverse()[0]; }
      if (rsrcRec.rsrcType == null) { rsrcRec.rsrcType = this.opts.rsrcType; }
      if (rsrcRec.data == null) { rsrcRec.data = file_rec.data; }
    }
    this.add_resource(rsrcRec, true);
    this.update_state();
  }

  add_resource(rsrcRec, store_in_db) {
    const {
      uri
    } = rsrcRec;
    //rsrcRec.uri ?= uri.split('/').reverse()[0]
    if (store_in_db) {
      this.huviz.add_resource_to_db(rsrcRec, this.add_resource_option);
    } else {
      this.add_resource_option(rsrcRec);
    }
  }

  add_resource_option(rsrcRec) { // TODO rename to rsrcRec
    const { uri } = rsrcRec;
    rsrcRec.value = uri;
    this.add_option(rsrcRec, this.pickable_uid);
    this.pick_or_provide_select.setAttribute('value',uri);
    this.refresh();
  }

  add_group(grp_rec, position) {
    if (position == null) { position = 'beforeend'; }
    if (position == 'prepend' || position == '') {
      throw new Error(`using jquery arg ${position}`);
    }
    var id = grp_rec.id || unique_id();
    var optgrpstr = `<div class="optgrp" title="${grp_rec.label}"
                          id="${id}"><h3>${grp_rec.label}</h3></div>`;
    this.pick_or_provide_select.insertAdjacentHTML(position, optgrpstr);
    return this.querySelector(`#${id}`);
  }

  add_option(opt_rec, parent_uid, position) {
    let k;
    if (position == null) { position = 'beforeend'; }
    if ((opt_rec.label == null)) {
      console.log("missing .label on", opt_rec);
    }
    if (this.pick_or_provide_select.querySelector(`div[title='${opt_rec.value}']`)) {
      //alert "add_option() #{opt_rec.value} collided"
      return;
    }
    var opt = document.createElement('span');
    opt.id = unique_id();
    const opt_group_label = opt_rec.opt_group;
    if (opt_group_label) {
      let opt_group = this.pick_or_provide_select.querySelector(
        `div[title='${opt_group_label}']`);
      if (!opt_group) {
        console.log(`adding '${opt_group_label}'`)
        opt_group = this.add_group({label: opt_group_label}, 'beforeend');
      }
      opt_group.insertAdjacentElement('beforeend', opt);
    } else { // There is no opt_group_label, so this is a top level entry, ie a group, etc
      var dest = this.querySelector(`#${parent_uid}`);
      dest.insertAdjacentElement(position, opt);
    }
    opt.innerText = opt_rec.label;
    for (k of ['value', 'title', 'class', 'id', 'style', 'label']) {
      if (opt_rec[k] != null) {
        opt.setAttribute(k, opt_rec[k]);  //$(opt).attr(k, opt_rec[k]);
      }
    }
    // TODO standardize on snake-case rather than camelCase
    for (k of ['isUri', 'canDelete', 'ontologyUri',
               'ontology_label', 'skip_graph_search']) {
      if (opt_rec[k] != null) {
        const val = opt_rec[k];
        opt.dataset[k] = val;
      }
    }
    opt.addEventListener('click', this.option_click_listener.bind(this));
    opt.classList.add('pick_or_provide_item')
    return opt;
  }
  setSelectedId(id) {
    this.selectedId = id;
  }
  setSelectedElem(elem) {
    this.setSelectedId(elem && elem.id)
    this.old_selectedElem = this.selectedElem;
    this.selectedElem = elem;
    let val = elem && elem.getAttribute('value');
    console.log(`setSelectedElem ${this.label} to ${val} when this.constructor.name=${this?.constructor?.name}`);
    this.val(val);
  }
  option_click_listener(evt) {
    this.containingElem.handleLoaderClickInResourceMenu(this, evt);
  }

  update_state(callback) {
    const old_value = this.old_value;
    const raw_value = this.value
    const selected = this.selectedElem;
    if (!selected) {
      console.debug('nothing selected');
      return
    }
    const label_value = selected.getAttribute('label');
    //const the_options = this.pick_or_provide_select.querySelectorAll("option");
    //const kid_cnt = the_options.length;
    //console.log("#{@label}.update_state() raw_value: #{raw_value} kid_cnt: #{kid_cnt}")
    if (raw_value === 'provide') {
      show(this.drag_and_drop_loader.form)
      this.state = 'awaiting_dnd';
      this.value = undefined;
    } else {
      hide(this.drag_and_drop_loader.form);
      this.state = 'has_value';
      this.value = raw_value;
      this.label = label_value;
    }
    let disable_the_delete_button = true;
    if (this.value != null) {
      const canDelete = selected.dataset.canDelete;
      disable_the_delete_button = !canDelete;
    }
    // disable_the_delete_button = false
    // uncomment to always show the delete button -- useful when bad data stored
    this.form.querySelector('.delete_option').
      setAttribute('disabled', disable_the_delete_button);
    if (callback != null) {
      const args = {
        pickOrProvide: this,
        newValue: raw_value,
        oldValue: old_value
      };
      callback(args);
    }
  }

  find_or_append_form() {
    var form_sel = `#${this.uniq_id}`;
    if (!this.form) {
      var filledTmpl = this.tmpl.replace('REPLACE_WITH_LABEL', this.label).
          replace('UID',this.uniq_id);
      this.append_to.insertAdjacentHTML('beforeend', filledTmpl);
      this.form = this.append_to.querySelector(form_sel);
    } else {
      return this.form;
    }
    this.pick_or_provide_select = this.form.querySelector("div.pick_or_provide");
    this.pick_or_provide_select.setAttribute('id', this.select_id);
    //console.debug @css_class,@pick_or_provide_select
    this.pick_or_provide_select.onchange = this.onchange.bind(this);
    this.delete_option_button = this.form.querySelector('.delete_option');
    this.delete_option_button.onclick = this.deleteSelectedElem.bind(this);
    this.form.querySelector('.delete_option').setAttribute('disabled', true); // disabled initially
    return this.form;
  }

  onchange(e) {
    //e.stopPropagation()
    this.refresh();
  }

  getSelectedElem() {
    return this.selectedElem;
  }

  deleteSelectedElem(e) {
    e.stopPropagation();
    const selectedElem = this.getSelectedElem();
    const val = selectedElem.getAttribute('value');
    if (val != null) {
      this.huviz.remove_dataset_from_db(this.value);
      this.delete_option(selectedElem);
      this.update_state();
    }
  }

  delete_option(opt_elem) {
    const uri = opt_elem.attr('value');
    this.huviz.remove_dataset_from_db(uri);
    opt_elem.remove();
    this.huviz.update_resource_menu();
  }

  refresh() {
    let cb = this.huviz.update_resource_menu.bind(this.containingElem);
    this.update_state(cb);
  }
}
PickOrProvide.initClass();

export class PickOrProvideScript extends PickOrProvide {
  constructor() {
    super(...arguments);
    this.onchange = this.onchange.bind(this);
  }

  onchange(e) {
    super.onchange(e);
    this.huviz.visualize_dataset_using_ontology();
  }
}

// inspiration: https://css-tricks.com/drag-and-drop-file-uploading/
export class DragAndDropLoader {
  static initClass() {
    this.prototype.tmpl = `\
<form id="REPLACE_ID" class="local_file_form" method="post" action="" enctype="multipart/form-data">
  <div class="box__input">
    <input class="box__file" type="file" name="files[]"
               data-multiple-caption="{count} files selected" multiple />
    <label for="file"><span class="box__label">Choose a local file</span></label>
    <button class="box__upload_button" type="submit">Upload</button>
        <div class="box__dragndrop" style="display:none"> Drop URL or file here</div>
  </div>
      <input type="url" class="box__uri" placeholder="Or enter URL here" />
  <div class="box__uploading" style="display:none">Uploading&hellip;</div>
  <div class="box__success" style="display:none">Done!</div>
  <div class="box__error" style="display:none">Error! <span></span>.</div>
</form>
`;
  }

  constructor(huviz, append_to_sel, picker) {
    this.huviz = huviz;
    if (typeof(append_to_sel) == typeof('')) {
      this.append_to = document.querySelector(append_to_sel);
    } else {
      this.append_to = append_to_sel;
    }
    this.picker = picker;
    this.local_file_form_id = unique_id();
    this.local_file_form_sel = `#${this.local_file_form_id}`;
    this.find_or_append_form();
    if (this.supports_file_dnd()) {
      this.form.style['display'] = 'none';
      this.form.classList.add('supports-dnd');
      this.form.querySelector(".box__dragndrop").style['display'] = 'none';
    }
  }

  supports_file_dnd() {
    const div = document.createElement('div');
    return true;
    return (div.draggable || div.ondragstart) && ( div.ondrop ) &&
      (window.FormData && window.FileReader);
  }

  load_uri(firstUri) {
    //@form.find('.box__success').text(firstUri)
    //@form.find('.box__success').show()
    //TODO SHOULD selection be added to the picker here, or wait for after successful?
    this.picker.add_uri({uri: firstUri, opt_group: 'Your Own'});
    hide(this.form)
    return true; // ie success
  }

  load_file(firstFile) {
    this.huviz.local_file_data = "empty";
    const filename = firstFile.name;
    this.form.querySelector('.box__success').innerText = firstFile.name; //TODO Are these lines still needed?
    show(this.form.querySelector('.box__success'));
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        //@huviz.read_data_and_show(firstFile.name, evt.target.result)
        if (filename.match(/.(ttl|.nq)$/)) {
          return this.picker.add_local_file({
            uri: firstFile.name,
            opt_group: 'Your Own',
            data: evt.target.result
          });
          //@huviz.local_file_data = evt.target.result  # REVIEW remove all uses of local_file_data?!?
        } else {
          //$("##{@dataset_loader.select_id} option[label='Pick or Provide...']").setAttribute('selected', true)
          this.huviz.blurt(`Unknown file format. Unable to parse '${filename}'. ` +
                "Only .ttl and .nq files supported.", 'alert');
          this.huviz.reset_dataset_ontology_loader();
          this.querySelector('.delete_option').setAttribute('style','');
        }
      } catch (e) {
        const msg = e.toString();
        //@form.find('.box__error').show()
        //@form.find('.box__error').innerText = msg
        return this.huviz.blurt(msg, 'error');
      }
    };
    reader.readAsText(firstFile);
    return true; // ie success
  }

  find_or_append_form() {
    const form_id = this.local_file_form_id;
    const form_sel = this.local_file_form_sel;
    var dnd_form = this.append_to.querySelector(form_sel);
    if (!dnd_form) {
      var tmpl = this.tmpl.replace('REPLACE_ID', form_id);
      this.append_to.insertAdjacentHTML('beforeend', tmpl);
      dnd_form = this.append_to.querySelector(form_sel);
    }
    this.form = dnd_form;
    var h1 =  (evt) => {
      const uri_field = this.form.querySelector('.box__uri');
      const uri = uri_field.value;
      if (uri_field[0].checkValidity()) {
        uri_field.value = '';
        this.load_uri(uri);
      }
      return false;
    }
    'submit unfocus'.split(' ').forEach((e) => dnd_form.addEventListener(e, h1));

    var h2 = (evt) => {
      //console.clear()
      evt.preventDefault();
      evt.stopPropagation();
    };
    'drag dragstart dragend dragover dragenter dragleave drop'.split(' ').forEach((e) => {
      dnd_form.addEventListener(e, h2)
    });

    var h3 = () => {
      this.form.classList.add('is-dragover');
      console.log("classList.add('is-dragover')");
    };
    'dragover dragenter'.split(' ').forEach((e) => dnd_form.addEventListener(e, h3));

    var h4 = () => {
      this.form.removeClass('is-dragover');
    }
    'dragleave dragend drop'.split(' ').forEach((e) => dnd_form.addEventListener(e, h4));

    var h5 = (e) => {
      console.log(e);
      console.log("e:", e.originalEvent.dataTransfer);
      hide(this.form.querySelector('.box__input'))
      const droppedUris = e.originalEvent.dataTransfer.getData("text/uri-list").split("\n");
      console.log("droppedUris",droppedUris);
      const firstUri = droppedUris[0];
      if (firstUri.length) {
        if (this.load_uri(firstUri)) {
          this.form.querySelector(".box__success").innerText = '';
          this.picker.refresh();
          hide(this.form)
          return;
        }
      }
      const droppedFiles = e.originalEvent.dataTransfer.files;
      console.log("droppedFiles", droppedFiles);
      if (droppedFiles.length) {
        const firstFile = droppedFiles[0];
        if (this.load_file(firstFile)) {
          this.form.querySelector(".box__success").innerText = '';
          this.picker.refresh();
          hide(this.form);
          return;
        }
      }
      // the drop operation failed to result in loaded data, so show 'drop here' msg
      show(this.form.querySelector('.box__input'));
      this.picker.refresh();
    };
    dnd_form.addEventListener('drop', h5);
  }
}
DragAndDropLoader.initClass();

export class DragAndDropLoaderOfScripts extends DragAndDropLoader {
  load_file(firstFile) {
    const filename = firstFile.name;
    //TODO Are these lines still needed?
    this.form.querySelector('.box__success').innerText = firstFile.name;
    show(this.form.querySelector('.box__success'));
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        //@huviz.read_data_and_show(firstFile.name, evt.target.result)
        if (filename.match(/.(txt|.json)$/)) {
          const file_rec = {
            uri: firstFile.name,
            opt_group: 'Your Own',
            data: evt.target.result
          };
          this.picker.add_local_file(file_rec);
          //@huviz.local_file_data = evt.target.result
        } else {
          //$("##{@dataset_loader.select_id} option[label='Pick or Provide...']").setAttribute('selected', true)
          this.huviz.blurt(`Unknown file format. Unable to parse '${filename}'. ` +
                "Only .txt and .huviz files supported.", 'alert');
          this.huviz.reset_dataset_ontology_loader();
          this.querySelector('.delete_option').setAttribute('style','');
        }
      } catch (err) {
        const msg = err.toString();
        //@form.find('.box__error').show()
        //@form.find('.box__error').innerText = msg)
        this.huviz.blurt(msg, 'error');
      }
    };
    reader.readAsText(firstFile);
    return true; // ie success REVIEW is this true?
  }
}
