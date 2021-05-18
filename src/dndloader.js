
export class PickOrProvide {
  static initClass() {
    this.prototype.tmpl = `\
<form id="UID" class="pick_or_provide_form" method="post" action="" enctype="multipart/form-data">
      <span class="pick_or_provide_label">REPLACE_WITH_LABEL</span>
      <select name="pick_or_provide"></select>
      <button type="button" class="delete_option"><i class="fa fa-trash" style="font-size: 1.2em;"></i></button>
    </form>\
`;
    this.prototype.uri_file_loader_sel = '.uri_file_loader_form';
  }

  constructor(huviz, append_to_sel, label, css_class, isOntology, isEndpoint, opts) {
    this.add_uri = this.add_uri.bind(this);
    this.add_local_file = this.add_local_file.bind(this);
    this.add_resource_option = this.add_resource_option.bind(this);
    this.onchange = this.onchange.bind(this);
    this.get_selected_option = this.get_selected_option.bind(this);
    this.delete_selected_option = this.delete_selected_option.bind(this);
    this.huviz = huviz;
    this.append_to_sel = append_to_sel;
    this.label = label;
    this.css_class = css_class;
    this.isOntology = isOntology;
    this.isEndpoint = isEndpoint;
    this.opts = opts;
    if (this.opts == null) { this.opts = {}; }
    this.uniq_id = this.huviz.unique_id();
    this.select_id = this.huviz.unique_id();
    this.pickable_uid = this.huviz.unique_id();
    this.your_own_uid = this.huviz.unique_id();
    this.find_or_append_form();
    const dndLoaderClass = this.opts.dndLoaderClass || DragAndDropLoader;
    this.drag_and_drop_loader = new dndLoaderClass(this.huviz, this.append_to_sel, this);
    this.drag_and_drop_loader.form.hide();
    //@add_group({label: "-- Pick #{@label} --", id: @pickable_uid})
    this.add_group({label: "Your Own", id: this.your_own_uid}, 'append');
    this.add_option({label: `Provide New ${this.label} ...`, value: 'provide'}, this.select_id);
    this.add_option({label: "Pick or Provide...", canDelete: false}, this.select_id, 'prepend');
    this.update_change_stamp();
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
        this.opts.rsrcType + ' was ' + this.pick_or_provide_select.val());
    this.pick_or_provide_select.val(val);
    this.refresh();
  }

  disable() {
    this.pick_or_provide_select.prop('disabled', true);
    this.form.find('.delete_option').hide();
  }

  enable() {
    this.pick_or_provide_select.prop('disabled', false);
    this.form.find('.delete_option').show();
  }

  select_option(option) {
    const new_val = option.val();
    //console.table([{last_val: @last_val, new_val: new_val}])
    const cur_val = this.pick_or_provide_select.val();
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
        this.pick_or_provide_select.val(new_val);
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
    if (rsrcRec.label == null) { rsrcRec.label = rsrcRec.uri.split('/').reverse()[0] || rsrcRec.uri; }
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
    const {
      uri
    } = rsrcRec;
    rsrcRec.value = rsrcRec.uri;
    var opt = this.add_option(rsrcRec, this.pickable_uid);
    this.pick_or_provide_select.val(uri);
    this.refresh();
  }

  add_group(grp_rec, which) {
    if (which == null) { which = 'append'; }
    const optgrp = $(`<optgroup label="${grp_rec.label}" id="${grp_rec.id || this.huviz.unique_id()}"></optgroup>`);
    if (which === 'prepend') {
      this.pick_or_provide_select.prepend(optgrp);
    } else {
      this.pick_or_provide_select.append(optgrp);
    }
    return optgrp;
  }

  add_option(opt_rec, parent_uid, pre_or_append) {
    let k;
    if (pre_or_append == null) { pre_or_append = 'append'; }
    if ((opt_rec.label == null)) {
      console.log("missing .label on", opt_rec);
    }
    if (this.pick_or_provide_select.find(`option[value='${opt_rec.value}']`).length) {
      //alert "add_option() #{opt_rec.value} collided"
      return;
    }
    const opt_str = `<option id="${this.huviz.unique_id()}"></option>`;
    const opt = $(opt_str);
    const opt_group_label = opt_rec.opt_group;
    if (opt_group_label) {
      let opt_group = this.pick_or_provide_select.find(`optgroup[label='${opt_group_label}']`);
      //console.log(opt_group_label, opt_group.length) #, opt_group[0])
      if (!opt_group.length) {
        //@huviz.blurt("adding '#{opt_group_label}'")
        opt_group = this.add_group({label: opt_group_label}, 'prepend');
      }
        // opt_group = $('<optgroup></optgroup>')
        // opt_group.attr('label', opt_group_label)
        // @pick_or_provide_select.append(opt_group)
      //if not opt_group.length
      //  @huviz.blurt('  but it does not yet exist')
      opt_group.append(opt);
    } else { // There is no opt_group_label, so this is a top level entry, ie a group, etc
      if (pre_or_append === 'append') {
        $(`#${parent_uid}`).append(opt);
      } else {
        $(`#${parent_uid}`).prepend(opt);
      }
    }
    for (k of ['value', 'title', 'class', 'id', 'style', 'label']) {
      if (opt_rec[k] != null) {
        $(opt).attr(k, opt_rec[k]);
      }
    }
    var opt_elem = opt[0]
    for (k of ['isUri', 'canDelete', 'ontologyUri',
               'ontology_label', 'skip_graph_search']) { // TODO standardize on _
      if (opt_rec[k] != null) {
        const val = opt_rec[k];
        opt_elem.dataset[k] = val;
      }
    }
    return opt_elem;
  }

  update_state(callback) {
    const old_value = this.value;
    const raw_value = this.pick_or_provide_select.val();
    const selected_option = this.get_selected_option();
    const label_value = selected_option[0].label;
    const the_options = this.pick_or_provide_select.find("option");
    const kid_cnt = the_options.length;
    //console.log("#{@label}.update_state() raw_value: #{raw_value} kid_cnt: #{kid_cnt}")
    if (raw_value === 'provide') {
      this.drag_and_drop_loader.form.show();
      this.state = 'awaiting_dnd';
      this.value = undefined;
    } else {
      this.drag_and_drop_loader.form.hide();
      this.state = 'has_value';
      this.value = raw_value;
      this.label = label_value;
    }
    let disable_the_delete_button = true;
    if (this.value != null) {
      const canDelete = selected_option.data('canDelete');
      disable_the_delete_button = !canDelete;
    }
    // disable_the_delete_button = false  # uncomment to always show the delete button -- useful when bad data stored
    this.form.find('.delete_option').prop('disabled', disable_the_delete_button);
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
    if (!$(this.local_file_form_sel).length) {
      $(this.append_to_sel).append(this.tmpl.replace('REPLACE_WITH_LABEL', this.label).replace('UID',this.uniq_id));
    }
    this.form = $(`#${this.uniq_id}`);
    this.pick_or_provide_select = this.form.find("select[name='pick_or_provide']");
    this.pick_or_provide_select.attr('id',this.select_id);
    //console.debug @css_class,@pick_or_provide_select
    this.pick_or_provide_select.change(this.onchange);
    this.delete_option_button = this.form.find('.delete_option');
    this.delete_option_button.click(this.delete_selected_option);
    this.form.find('.delete_option').prop('disabled', true); // disabled initially
    //console.info "form", @form
  }

  onchange(e) {
    //e.stopPropagation()
    this.refresh();
  }

  get_selected_option() {
    return this.pick_or_provide_select.find('option:selected'); // just one CAN be selected
  }

  delete_selected_option(e) {
    e.stopPropagation();
    const selected_option = this.get_selected_option();
    const val = selected_option.attr('value');
    if (val != null) {
      this.huviz.remove_dataset_from_db(this.value);
      this.delete_option(selected_option);
      this.update_state();
    }
      //  @value = null
  }

  delete_option(opt_elem) {
    const uri = opt_elem.attr('value');
    this.huviz.remove_dataset_from_db(uri);
    opt_elem.remove();
    this.huviz.update_dataset_ontology_loader();
  }

  refresh() {
    this.update_state(this.huviz.update_dataset_ontology_loader);
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
<form class="local_file_form" method="post" action="" enctype="multipart/form-data">
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
    </form>\
`;
  }

  constructor(huviz, append_to_sel, picker) {
    this.huviz = huviz;
    this.append_to_sel = append_to_sel;
    this.picker = picker;
    this.local_file_form_id = this.huviz.unique_id();
    this.local_file_form_sel = `#${this.local_file_form_id}`;
    this.find_or_append_form();
    if (this.supports_file_dnd()) {
      this.form.show();
      this.form.addClass('supports-dnd');
      this.form.find(".box__dragndrop").show();
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
    this.form.hide();
    return true; // ie success
  }

  load_file(firstFile) {
    this.huviz.local_file_data = "empty";
    const filename = firstFile.name;
    this.form.find('.box__success').text(firstFile.name); //TODO Are these lines still needed?
    this.form.find('.box__success').show();
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
          //$("##{@dataset_loader.select_id} option[label='Pick or Provide...']").prop('selected', true)
          this.huviz.blurt(`Unknown file format. Unable to parse '${filename}'. ` +
                "Only .ttl and .nq files supported.", 'alert');
          this.huviz.reset_dataset_ontology_loader();
          return $('.delete_option').attr('style','');
        }
      } catch (e) {
        const msg = e.toString();
        //@form.find('.box__error').show()
        //@form.find('.box__error').text(msg)
        return this.huviz.blurt(msg, 'error');
      }
    };
    reader.readAsText(firstFile);
    return true; // ie success
  }

  find_or_append_form() {
    const num_dnd_form = $(this.local_file_form_sel).length;
    if (!num_dnd_form) {
      const elem = $(this.tmpl);
      $(this.append_to_sel).append(elem);
      elem.attr('id', this.local_file_form_id);
    }
    this.form = $(this.local_file_form_sel);
    this.form.on('submit unfocus', evt => {
      const uri_field = this.form.find('.box__uri');
      const uri = uri_field.val();
      if (uri_field[0].checkValidity()) {
        uri_field.val('');
        this.load_uri(uri);
      }
      return false;
    });
    this.form.on('drag dragstart dragend dragover dragenter dragleave drop', evt => {
      //console.clear()
      evt.preventDefault();
      return evt.stopPropagation();
    });
    this.form.on('dragover dragenter', () => {
      this.form.addClass('is-dragover');
      return console.log("addClass('is-dragover')");
    });
    this.form.on('dragleave dragend drop', () => {
      return this.form.removeClass('is-dragover');
    });
    this.form.on('drop', e => {
      console.log(e);
      console.log("e:", e.originalEvent.dataTransfer);
      this.form.find('.box__input').hide();
      const droppedUris = e.originalEvent.dataTransfer.getData("text/uri-list").split("\n");
      console.log("droppedUris",droppedUris);
      const firstUri = droppedUris[0];
      if (firstUri.length) {
        if (this.load_uri(firstUri)) {
          this.form.find(".box__success").text('');
          this.picker.refresh();
          this.form.hide();
          return;
        }
      }
      const droppedFiles = e.originalEvent.dataTransfer.files;
      console.log("droppedFiles", droppedFiles);
      if (droppedFiles.length) {
        const firstFile = droppedFiles[0];
        if (this.load_file(firstFile)) {
          this.form.find(".box__success").text('');
          this.picker.refresh();
          this.form.hide();
          return;
        }
      }
      // the drop operation failed to result in loaded data, so show 'drop here' msg
      this.form.find('.box__input').show();
      return this.picker.refresh();
    });
  }
}
DragAndDropLoader.initClass();

export class DragAndDropLoaderOfScripts extends DragAndDropLoader {
  load_file(firstFile) {
    const filename = firstFile.name;
    this.form.find('.box__success').text(firstFile.name); //TODO Are these lines still needed?
    this.form.find('.box__success').show();
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
          //$("##{@dataset_loader.select_id} option[label='Pick or Provide...']").prop('selected', true)
          this.huviz.blurt(`Unknown file format. Unable to parse '${filename}'. ` +
                "Only .txt and .huviz files supported.", 'alert');
          this.huviz.reset_dataset_ontology_loader();
          $('.delete_option').attr('style','');
        }
      } catch (err) {
        const msg = err.toString();
        //@form.find('.box__error').show()
        //@form.find('.box__error').text(msg)
        this.huviz.blurt(msg, 'error');
      }
    };
    reader.readAsText(firstFile);
    return true; // ie success REVIEW is this true?
  }
}
