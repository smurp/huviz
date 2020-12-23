class PickOrProvide {
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
    this.add_option(rsrcRec, this.pickable_uid);
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
    for (k of ['isUri', 'canDelete', 'ontologyUri', 'ontology_label']) { // TODO standardize on _
      if (opt_rec[k] != null) {
        const val = opt_rec[k];
        $(opt).data(k, val);
      }
    }
    return opt[0];
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

class PickOrProvideScript extends PickOrProvide {
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
class DragAndDropLoader {
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

class DragAndDropLoaderOfScripts extends DragAndDropLoader {
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

class Edge {
  static initClass() {
    this.prototype.color = "lightgrey";
  }
  constructor(source, target, predicate, graph) {
    // FIXME if everything already has .lid then remove the test "not a.lid?"
    this.source = source;
    this.target = target;
    this.predicate = predicate;
    this.graph = graph;
    this.id = ([this.source, this.predicate, this.target].map((a) => ((a.lid == null) && a.id) || a.lid)).join(' ');
    this.lid = this.id;
    this.register();
    this.contexts = [];
  }
  register() {
    this.predicate.add_inst(this);
  }
  register_context(context) {
    this.contexts.push(context);
    // context.register_context_for(this) # FIXME to see all assertions in a context
  }
  isSelected() {
    return (this.source.selected != null) || (this.target.selected != null);
  }
  show() {
    this.predicate.update_state(this, 'show');
  }
  unshow() {
    this.predicate.update_state(this, 'unshow');
  }
  an_end_is_selected() {
    return (this.target.selected != null) || (this.source.selected != null);
  }
  unselect() {
    this.predicate.update_state(this, 'unselect');
  }
  select() {
    this.predicate.update_state(this, 'select');
  }
}
Edge.initClass();

// export {Edge}; // TODO convert to module

// FiniteStateMachine implements a simple abstract engine for running state machines.
//
// It supports optional methods for every transition and for become/leav a state.
//
// There are three kinds of methods:
// 1. on__TRANSITID called upon the commencement of the transition
// 2. exit__STATEID called when leaving a state
// 3. enter__STATEID called when becoming a state
//
// All three kinds of methods are optional.  If no method of any kind is found
// during a transition then a message is either thrown, logged or ignored based
// on the value of this.throw_log_or_ignore
//
// If there is an array at this.trace then the names of the method are pushed
// onto it as they are called.
//
// # Usage
//
//     class MyFSM extends FiniteStateMachine
//       constructor: (anything, you want) ->
//         # you can do anything you want on your FSM constructor
//       throw_log_or_ignore: 'ignore'
//       transitions:
//         start:
//           target: 'ready'
//         stop:
//           source: 'ready' # TODO respect source by raising error if an illegal transit is tried
//           target: 'stopped'
//       on__start: ->
//         console.log('on "start"')
//       exit__ready: ->
//         console.log('leave "ready"')
//       enter__stopped: ->
//         console.log('become "stopped"')
//
//     myFSM = new MyFSM()
//     myFSM.transit('start') ==> 'on "start"', 'leave "ready"'
//     myFSM.get_state() ==> 'ready'
//     myFSM.transit('stop') ==> 'become "stopped"'
//

// Notes:
//   suitable for use as a mixin
//   https://coffeescript-cookbook.github.io/chapters/classes_and_objects/mixins
class FiniteStateMachine {
  call_method_by_name(meth_name) {
    let meth;
    if (meth = this[meth_name]) {
    //if (meth = Reflect.get(this, meth_name))
      meth.call(this);
      if (this.trace) {
        this.trace.push(meth_name);
      }
      return true;
    }
    return false;
  }
  set_state(state) {
    // call a method when arriving at the new state, if it exists
    const called = this.call_method_by_name('enter__' + state);
    this.state = state; // set after calling meth_name so the old state is available to it
    return called;
  }
  exit_state() {
    // call a method when leaving the old state, if it exists
    return this.call_method_by_name('exit__' + this.state);
  }
  get_state() {
    return this.state;
  }
  is_state(candidate) {
    return this.state === candidate;
  }
  make_noop_msg(trans_id, old_state, new_state) {
    return this.constructor.name + " had neither " +
           `on__${trans_id} exit__${old_state} or enter__${new_state}`;
  }
  throw_log_or_ignore_msg(msg) {
    const throw_log_or_ignore = this.throw_log_or_ignore || 'ignore';
    if (throw_log_or_ignore === 'throw') {
      throw new Error(msg);
    } else if (throw_log_or_ignore === 'log') {
      console.warn(msg);
    }
  }
  transit(trans_id) {
    let transition;
    if (this.transitions == null) { this.transitions = {}; }
    if (transition = this.transitions[trans_id]) {
      let target_id;
      const initial_state = this.state;
      let called = this.call_method_by_name('on__'+trans_id);
      called = this.exit_state() || called;
      if (target_id = transition.target) {
        called = this.set_state(target_id) || called;
      }
      if (!called) {
        const msg = this.make_noop_msg(trans_id, initial_state, target_id);
        this.throw_log_or_ignore_msg(msg);
      }
    } else {
      this.throw_log_or_ignore_msg(`${this.constructor.name} has no transition with id ${trans_id}`);
    }
  }
}

class IndexedDBService {
  static initClass() {
    this.prototype.dbName_default = 'nstoreDB';
    this.prototype.dbVer = 2;
  }
  constructor(huviz) {
    this.huviz = huviz;
    this.dbName = this.get_dbName();
    this.dbStoreName = "ntuples";
    this.initialize_db();
  }

  expunge_db(dbname, callback) {
    const indexedDB = this.get_indexedDB();
    const del_req = indexedDB.deleteDatabase('doof' || dbname || this.dbName);
    del_req.onerror = e => {
      //alert(e.toString())
      if (callback != null) {
        callback(e);
      }
    };
    del_req.onsuccess = e => {
      //alert("done deleting #{dbname}")
      if (dbname === this.dbName) {
        this.nstoreDB = undefined;
      }
      if (callback != null) {
        callback();
      }
    };
  }

  get_indexedDB() {
    return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  }

  initialize_db(callback) {
    const indexedDB = this.get_indexedDB();

    if (!indexedDB) {
      throw new Error("indexedDB not available");
    }

    const when_done = (db, why, cb, err) => {
      this.nstoreDB = db;
      if (cb != null) {
        cb(err);
      }
    };

    if (this.nstoreDB != null) {
      const msg = `nstoreDB already exists with name ${this.dbName}`;
      when_done(this.nstoreDB, msg, callback);
    } else {
      const req = indexedDB.open(this.dbName, this.dbVer); //TODO the name of the dataindex needs to be tied to specific instances
      console.debug(req);  // 'req' is not in the same state as the samle ('pending') and does not have the proper definitions for onerror, onsuccess...etc.

      req.onsuccess = evt => {
        console.debug(`onsuccess ${this.dbName}`);
        when_done(req.result, "success", callback);
      };

      req.onerror = evt => {
        console.error("IndexDB Error: " + evt.target.error.message);
        if (callback != null) {
          callback(evt.target.error);
        }
      };

      req.onupgradeneeded = evt => {
        const db = evt.target.result;
        console.debug(`onupgradeneeded ${db.name}`);
        console.debug(evt);
        if (evt.oldVersion === 1) {
          if (db.objectStoreNames.includes('spogis')) {
            alert("deleteObjectStore('spogis')");
            db.deleteObjectStore('spogis');
          }
        }
        if (evt.oldVersion < 3) { //Only create a new ObjectStore when initializing for the first time
          //alert("createObjectStore('#{@dbStoreName}')")
          const store = db.createObjectStore(this.dbStoreName,
            { keyPath: 'id', autoIncrement: true });
          console.debug(db);
          store.createIndex("s", "s", { unique: false });
          store.createIndex("p", "p", { unique: false });
          store.createIndex("o", "o", { unique: false });

          store.transaction.oncomplete = evt => {
            when_done(db, "onupgradeneeded", callback);
            return console.debug("transactions are complete");
          };
        }
      };
    }
  }
  get_dbName() {
    return this.huviz.args.editui__dbName || this.dbName_default;
  }

  add_node_to_db(quad) {
    console.debug("add new node to DB");
    console.debug(quad);
    console.debug(this.nstoreDB);
    //trx = @nstoreDB.transaction('spogis', "readwrite")
    //trx.oncomplete = (e) =>
    //  console.log "spogis added!"
    //trx.onerror = (e) =>
    //  console.log(e)
    //  alert "add_dataset(spogis) error!!!"
  }
}
IndexedDBService.initClass();

// export IndexedDBService; // TODO convert to module

class IndexedDBStorageController {
  constructor(huviz, dbs) {
    this.huviz = huviz;
    this.dbs = dbs;
  }
     // preserves the graph_uri for inclusion in the quads when they are saved
  register(huviz) {
    // called by the HuViz constructor if the `edit_handler` no, no *`storage_controller`*
    this.huviz = huviz;
  }
  assert(quad) {
    //if not quad.g?
    //  quad.g = @graph_uri
    console.log("trx begin");
    const trx = this.dbs.nstoreDB.transaction(this.dbs.dbStoreName, 'readwrite');
    trx.oncomplete = e => {
      console.log("trx complete!");
    };
    trx.onerror = e => {
      throw e;
    };
    const store = trx.objectStore(this.dbs.dbStoreName);
    const req = store.put(quad);
    req.onsuccess = e => {
      console.log(quad,`added to ObjectStore: ${this.dbs.dbStoreName}`);
      this.huviz.add_quad(quad);
    };
    // gets called by the editui whenever Save is clicked
    // calls @huviz.add_quad (so huviz can display it)
    // saves the quad via IndexedDB to an objectStore called `quadstore`
  }
  get_graphs() {
     // returns the list of graphs from `quadstore` so PickOrProvide can show them for picking
    console.log("get_graphs() not implemented");
    return [];
  }
  count(cb) {
    const trx = this.dbs.nstoreDB.transaction(this.dbs.dbStoreName, 'readonly');
    const objstor = trx.objectStore(this.dbs.dbStoreName);
    const req = objstor.count();
    req.onsuccess = function() {
      cb(req.result);
    };
  }
}

// export IndexedDBStorageController; // TODO convert to modules

class EditController extends FiniteStateMachine {
  constructor(huviz) {
    super();
    this.toggle_edit_form = this.toggle_edit_form.bind(this);
    this.huviz = huviz;
    //TODO EditController should be loaded and checked when a dataset is loaded
    this.userValid = true; //TODO this needs to be hooked into authentication -- remove to huviz.coffee to validate against dataloaded and authentication
    //@userValid = false
    this.ensure_verbs();
    this.build_transitions();
    this.state = 'not_editing';
  }

  build_transitions() {
    this.transitions = {
      start: {
        target: 'not_editing',
      },
      prepare: {
        target: 'prepared'
      },
      disable: {
        target: 'disabled'
      },
      enable: {
        target: 'prepared'
      }
    };
  }

  on__prepare() {
    if ((this.userValid === true) && !this.con) { //document.getElementsByClassName("edit-controls")[0] is undefined
      this.con = document.createElement("div");
      this.con.className = "edit-controls loggedIn";
      this.con.setAttribute("edit", "no");
      //@huviz.set_edit_mode(false)
      const viscanvas = this.huviz.args.viscanvas_sel;
      const new_viscanvas = viscanvas.replace('#','');
      document.getElementById(new_viscanvas).appendChild(this.con);
      this.con.innerHTML = "<div class='cntrl-set slider-pair'><div class='label set-1'>VIEW</div><div class='slider'><div class='knob'></div></div><div class='label set-2'>CONTRIBUTE</div><div id='beta-note'>(Alpha)</div></div>";
      this.create_edit_form(this.con);
      this.con.getElementsByClassName("slider")[0].onclick = this.toggle_edit_form;
      //console.log(con.getElementsByTagName("form")[0])
      //console.log(con.getElementsByClassName("slider")[0])
      this.formFields = this.con.getElementsByTagName("form")[0];
      const clearForm = this.formFields.getElementsByClassName("clearForm")[0]; //TODO How are these working?
      const saveForm = this.formFields.getElementsByClassName("saveForm")[0];
      const validateForm = this.formFields.getElementsByTagName('input');
      validateForm[0].addEventListener("input", this.validate_edit_form);
      validateForm[1].addEventListener("input", this.validate_edit_form);
      validateForm[2].addEventListener("input", this.validate_edit_form);
      clearForm.addEventListener("click", this.clear_edit_form);
      saveForm.addEventListener("click", this.save_edit_form);
      this.proposed_quad = null;
      this.controls = this.formFields;
      this.subject_input = this.formFields[0];
      this.predicate_input = this.formFields[1];
      this.object_input = this.formFields[2];
    }
  }

  hide() {
    $(this.con).hide();
  }
  show() {
    $(this.con).show();
  }

  on__disable() {
    this.hide_verbs();
    this.hide_form();
  }

  on__enable() {
    this.show_verbs();
    this.show_form();
  }

  get_verb_set() {
    return {
      connect: this.huviz.human_term.connect, // aka link
      spawn: this.huviz.human_term.spawn, // aka instantiate
      specialize: this.huviz.human_term.specialize, // aka subclass / subpropertize
      annotate: this.huviz.human_term.annotate
      };
  }

  add_verbs() {
    let prepend;
    const vset = this.get_verb_set();
    this.huviz.gclui.verb_sets.unshift(vset);
    return this.huviz.gclui.add_verb_set(vset, (prepend = true));
  }

  ensure_verbs() {
    if (!this.my_verbs) {
      this.my_verbs = this.add_verbs();
      this.hide_verbs();
    }
  }

  hide_verbs() {
    this.my_verbs.style('display','none');
  }

  show_verbs() {
    this.my_verbs.style('display','flex');
  }

  create_edit_form(toggleEdit) {
    const formNode = document.createElement('form');
    formNode.classList.add("cntrl-set", "edit-form");
    formNode.innerHTML = '<input name="subject" placeholder="subject" type="text"/><input id="predicate" name="predicate" placeholder="predicate" type="text"/><input name="object" placeholder="object" type="text"/>';
    formNode.innerHTML += '<button class="saveForm" type="button" disabled>Save</button>';
    formNode.innerHTML += '<button class="clearForm" type="button">Clear</button>';
    toggleEdit.appendChild(formNode);
    this.set_predicate_selector();
  }

  set_predicate_selector() {
    //console.log("setting predicate selector in edit form")
    // Add predicates from Ontology for autocomplete box in edit form
    //pred_array = @huviz.predicate_set
    let availablePredicates = [];
    if (this.huviz.predicate_set) {
      for (let predicate of this.huviz.predicate_set) {
        availablePredicates.push(predicate.lid);
      }
      availablePredicates.push("literal");
    } else {
      availablePredicates = [
        "A",
        "literal"
      ];
    }
    $("#predicate").autocomplete({
      source: availablePredicates,
      open: this.update_predicate_picked,
      close: this.update_predicate_picked,
      change: this.update_predicate_picked,
      position: {
        my: "left bottom",
        at: "left top"
      }
    });
  }

  update_predicate_picked(event, ui) {
    //if event.type is 'autocompletechange'
    const new_pred_value = this.predicate_input.value;
    console.log(`${new_pred_value} is new predicate`);
    this.validate_proposed_edge();
  }

  hide_form() {
    this.con.setAttribute("edit","no");
    this.con.classList.remove("edit-mode");
    //@huviz.set_edit_mode(false)
  }

  show_form() {
    this.con.setAttribute("edit","yes");
    this.con.classList.add("edit-mode");
    //@huviz.set_edit_mode(true)
  }

  toggle_edit_form() {
    const toggleEditMode = this.con.getAttribute("edit");
    //console.log("error") #debugger
    if (toggleEditMode === 'no') { //toggle switched to edit mode, then show form
      this.show_verbs();
      this.show_form();
    }
    if (toggleEditMode === 'yes') { //toggle switched to normal mode, then hide form
      this.hide_verbs();
      this.hide_form();
    }
  }

  validate_edit_form(evt) {
    const form = this.controls;
    const inputFields = form.getElementsByTagName('input');
    const saveButton = form.getElementsByTagName('button')[0];
    // Was this coffeescript:
    //     for i in [0..inputFields.length-1]
    //       elem = form.elements[i]
    for (let i = 0, end = inputFields.length-1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
      const elem = form.elements[i];
      if (elem.value === '') {
        saveButton.disabled = 'disabled';
        break;
      } else {
        saveButton.disabled = false;
      }
    }
    this.adjust_object_datatype();
  }

  predicate_is_DatatypeProperty() {
    // The job of figuring this out is best done in a method because:
    //   * a search up the superclasses of the predicate is needed
    //   * caching that answer might be needed for efficiency
    //   * heuristics in case of ambiguity might be required
    //
    // We can get started on this by just responding to magic values in the predicate.
    //console.log("predicate_is_Datatype has been called")
    if (this.predicate_input) {
      window.THINGY = this.predicate_input;
      const current_value = this.predicate_input.value;
      return current_value === 'literal';
    }
    return false;
  }

  adjust_object_datatype() {
    let placeholder_label;
    if (this.predicate_is_DatatypeProperty()) {
      this.object_datatype_is_literal = true;
      placeholder_label = "a literal value";
    } else {
      this.object_datatype_is_literal = false;
      placeholder_label = "object";
    }
    this.object_input.setAttribute("placeholder", placeholder_label);

    // if the predicate is of DatatypeProperty then
    //  0. replace placeholder to reflect data type needed in object
    //  1. object field will only accpet input according to appropriate type (i.e. literal string, number or date)
  }

  save_edit_form() {
    let i;
    let asc, end;
    const form = this.controls;
    const inputFields = form.getElementsByTagName('input');
    const tuple = [];
    for (i = 0, end = inputFields.length-1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
      const elem = form.elements[i];
      console.log(elem.name + ": " + elem.value);
      tuple.push(elem.value);
    }
    const assrtSave = new IndexedDBStorageController(this.huviz);
    console.log(assrtSave);
    const quad = {
      s: tuple[0],
      p: tuple[1],
      o: tuple[2]
    };
    this.latest_quad = quad;  // REMOVE ONCE saving to the indexedDB is working
    this.huviz.set_proposed_edge(null); // set to nothing, ie stop flagging the edge as proposed
    //@huviz.dbsstorage.assert(quad)
    //assrtSave.assert(quad)
    const saveButton = form.getElementsByTagName('button')[0];
    for (i in inputFields) {
      form.elements[i].value = '';
    }
    saveButton.disabled = true;
    //@proposed_quad = null #set to false (no focused edge)
  }

  clear_edit_form() {
    const form = this.controls;
    const inputFields = form.getElementsByTagName('input');
    const saveButton = form.getElementsByTagName('button')[0];
    for (let i in inputFields) {
      form.elements[i].value = '';
    }
    if (this.proposed_quad) {
      console.log("@proposed_quad:", this.proposed_quad);
      //@huviz.set_proposed_edge(null)
      this.remove_proposed_quad(); // clear existing edge clear from display
    }
    this.set_subject_node();
    this.set_object_node();
    saveButton.disabled = true;
    // TODO why on calling this function does the ability to drag nodes to fill form disabled?
  }

  set_subject_node(node) {
    if (this.subject_node === node) {
      return;
    }
    this.subject_node = node;
    const new_value = (node && node.id) || "";
    console.log(`set_subject_node() id:'${new_value}'`);
    this.subject_input.setAttribute("value",new_value);
    this.validate_edit_form();
    this.validate_proposed_edge();
  }

  set_object_node(node) { // either a node or undefined
    if (this.object_node === node) {
      return; // ignore if there is no change
    }
    this.object_node = node; // might be null
    const new_value = (node && node.id) || "";
    console.log(`set_object_node() id:'${new_value}'`);
    this.object_input.setAttribute("value",new_value);
    this.validate_edit_form();
    this.validate_proposed_edge();
  }

  validate_proposed_edge() { // type = subject or object
    console.log('validate_proposed_edge()');
    // What are the proposed subject node, object node and predicate?
    // Subject and Object fields must have values (IDs of Nodes)
    // Make a quad out of current subject and object (predicate if it is filled)
    //subject_id = @editui.subject_input.value
    const RDF_object  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";
    const RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";

    const subject_id = this.subject_input.value;
    const object_id = this.object_input.value;
    const predicate_val = this.predicate_input.value;

    // propose a new quad once there is a subject and an object
    if (subject_id && object_id) {
      const obj_type = predicate_val === 'literal' ? RDF_literal : RDF_object;
      const q = {
        s: subject_id,
        p: predicate_val || "anything",
        o: {  // keys: type,value[,language]
          type: obj_type,
          value: object_id
        },
        g: "http://" + Date.now()
      };
      // Don't process any edge proposal if it is just the same as the current proposal
      // Ignore requests for edges that are identical to the last edge requested
      if ((this.proposed_quad != null) && this.quads_match(q, this.proposed_quad)) {
        console.log(`... skipping: <s:${q.s}, p:${q.p}, o:${q.o.value}> matches old`);
        return;
      }
      console.log(`... accepting: <s:${q.s}, p:${q.p}, o:${q.o.value}>`);
      this.set_proposed_quad(q);
    }
  }

  quads_match(a, b) {
    return (a.s === b.s) && (a.p === b.p) && (a.o.value === b.o.value);
  }

  set_proposed_quad(new_q) {
    console.log("set_proposed_quad()");
    // If there is an existing edge remove it before setting a new proposed edge
    if (this.proposed_quad) { // There can only be one, so get rid of old proposed edge
      this.remove_proposed_quad();
    }
    this.add_proposed_quad(new_q);
    this.huviz.tick(); // tell the graph to repaint itself
    console.log("Tick in editui.coffee set_proposed_quad");
  }

  add_proposed_quad(q) {
    console.log(("add_proposed_quad() " + q.s + " " + q.p + " " +q.o.value));
    const edge = this.huviz.add_quad(q);
    if (!edge) {
      console.log("error"); //debugger
    }
    this.huviz.set_proposed_edge(edge);
    this.huviz.show_link(edge);
    this.proposed_quad = q;
  }

  remove_proposed_quad() {
    const old_edge = this.huviz.proposed_edge;
    if (old_edge) {
      const edge_id = old_edge.id;
      this.huviz.set_proposed_edge(null);
      //@huviz.remove_link(edge_id)
      //@huviz.unshow_link(old_edge)
      this.huviz.delete_edge(old_edge);
    }
      //delete @huviz.edges_by_id[old_edge]
    this.proposed_quad = null;
  }
}

//  angliciser(['a','b','c']) ==> "a, b and c"
//  angliciser(['a','b']) ==> "a and b"
//  angliciser(['a']) ==> "a"#
//  angliciser([]) ==> ""

function angliciser(lst, and_or_or) {
  const b = and_or_or;
  and_or_or = ((and_or_or == null) && " and ") || and_or_or; // uh really?! so one can pass in " or "
  if ((b != null) && (and_or_or !== b)) {
    throw "and_or_or failing " + b;
  }
  let english = "";
  const lstlen = lst.length;
  lst.forEach((itm,i) => {
    if (lstlen > 1) {
      if ((lstlen - 1) === i) {
        english += and_or_or;
      } else {
        if (i > 0) {
          english += ', ';
        }
      }
    }
    english += itm;
  });
  return english;
}

/*
  SortedSet

  SortedSet is a javascript Array which stays sorted and permits only
  once instance of each itm to be added.

  It adds these methods:
    add(itm)
    has(itm) => bool
    acquire(itm) # remove(itm) from prior set then add(itm) to this
    sort_on(f_or_k) # eg
      sort_on('some_property_name')
      sort_on(function(a,b){ return -1,0 or 1})
    remove(itm)
    binary_search(sought[,ret_ins_idx])
    clear() # empty the set

  SortedSet also supports the notion of items belonging to mutually exclusive
  sets, represented as "being in mutually exclusive states".
    isState(state_name) # makes the sortedset act in mutual exclusion with others
  If an item is "in a state" then its .state property contains a link to
  the sortedset "it is currently in".

  If one wants to record membership on items by attaching flags to them
  this can be accomplished with SortedSet.isFlag(flag_name)
    isFlag(flag_name) # items in the set get the property [flag_name]

  dead = new SortedSet().isState('dead')
  alive = new SortedSet().isState('alive')
  sick = new SortedSet().isFlag('sick')
  amputee = new SortedSet().isFlag('amputee')

  alice = {'id':'alice'};
  alive.add(alice);
  amputee.add(alice)
  alice.state == alive; // ==> true
  alice.state == dead;  // ==> false
  dead.acquire(alice);
  !!alice.amputee == true; // ==> true


  author: Shawn Murphy <smurp@smurp.com>
  written: 2013-11-15
  funder:  TM&V -- The Text Mining and Visualization project
  Copyright CC BY-SA 3.0  See: http://creativecommons.org/licenses/by-sa/3.0/

  http://stackoverflow.com/a/17866143/1234699
    provided guidance on how to 'subclass' Array

    "use strict";

 */
function SortedSet() {
  // if (arguments.callee) {arguments.callee.NUMBER_OF_COPIES += 1;}
  if (typeof window != 'undefined') {
    if (!window.NUM_SORTEDSET){window.NUM_SORTEDSET = 0;}
    window.NUM_SORTEDSET += 1;
  }
  var array = [];
  array.push.apply(array,arguments);
  array.case_insensitive = false;
  array.case_insensitive_sort = function(b) {
    if (typeof b == 'boolean') {
      if (b) { // INSENSITIVE
        array.cmp_options.caseFirst = false;
        array.cmp_options.sensisitivity = 'base';
      } else { // SENSITIVE
        array.cmp_options.caseFirst = 'upper';
        array.cmp_options.sensisitivity = 'case';
      }
      array.case_insensitive = b;
      array.resort();
    }
    return array;
  };
  array.cmp_options = {numeric: true, caseFirst: 'upper', sensitivity: 'case'};
  array._f_or_k = 'id';
  array._cmp_instrumented = function(a, b){
    /*
      Return a negative number if a < b
      Return a zero if a == b
      Return a positive number if a > b
    */
    var f_or_k = array._f_or_k,
        av = (''+(a && a[f_or_k]) || ''),
        bv = (''+(b && b[f_or_k]) || '');
    //console.log(f_or_k, array.case_insensitive);
    // xcase are squashed iff needed
    var acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    if (!array.case_insensitive && acase != av) {
      throw new Error("" + acase + " <> " + av + " BUT SHOULD EQUAL")
    }
    //var retval = av.localeCompare(bv, 'en', array.cmp_options);
    var retval = (acase < bcase) && -1 || ((acase > bcase) && 1 || 0);
    /*
      if (window.SORTLOG) {
      console.error(`${array.id}.${f_or_k} ${array.case_insensitive&&'IN'||''}SENSITIVE "${av}" ${DIR[retval+1]} "${bv}  (${retval})"`, array.cmp_options);
      }
    */
    array._verify_cmp(av, bv, retval);
    return retval;
  };
  array._cmp_classic = function(a, b) {
    /*
      Classic does NOT handle dupes
     */
    var f_or_k = array._f_or_k,
        av = (''+(a && a[f_or_k]) || ''),
        bv = (''+(b && b[f_or_k]) || '');
    // xcase are squashed iff needed
    var acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    return (acase < bcase) && -1 || ((acase > bcase) && 1 || 0);
  };
  array._cmp = function(a, b) {
    var f_or_k = array._f_or_k,
        av = (''+(a && a[f_or_k]) || ''),
        bv = (''+(b && b[f_or_k]) || '');
    // xcase are squashed iff needed
    var acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    return (acase < bcase) && -1 || ((acase > bcase) && 1 || 0) ||
           ((a.id < b.id) && -1) || ((a.id > b.id) && 1 || 0);
  };
  array._verify_cmp = function(av, bv, retval) {
    var dir = ['less than', 'equal to', 'greater than'][retval+1],
        right_or_wrong = 'wrongly',
        sense = (!array.case_insensitive && 'UN' || '') + 'SQUASHED',
        acase = array.case_insensitive && av.toLowerCase() || av,
        bcase = array.case_insensitive && bv.toLowerCase() || bv;
    if (sense == 'UNSQUASHED' &&
        acase != av &&
        av.toLowerCase() != av) {
      /*
        Is case INSENSITIVE comparison happening on the right values?

        Confirm that when a case_insensitive sort is happening
        AND the value upon which comparison actually happens (acase) differs from av
        AND that there are uppercase characters to squash
      */
      throw new Error(""+sense+"("+array.case_insensitive + ") but av(" + av + ") compared as acase(" + acase +")");
    }
    var tests = ['(retval > 0 && acase <= bcase)',
                 '(retval < 0 && acase >= bcase)',
                 '(retval == 0 && acase != bcase)'];
    tests.forEach(function(test){
      if (eval(test)) {
        throw new Error("" +test + " SHOWS _cmp(" + sense + ") " + right_or_wrong +
                        " calling a(" + acase + ") " + dir +" b(" + bcase + ")");
      }
    });
    right_or_wrong = 'rightly';
    //console.error(`_cmp(${sense}) ${right_or_wrong} calling a(${acase}) ${dir} b(${bcase})`);
  };
  array.sort_on = function(f_or_k){ // f_or_k AKA "Function or Key"
    //   f_or_k: a comparison function returning -1,0,1
    var DIR = ['<','=','>'];
    if (typeof f_or_k == 'string'){ // item object key to sort on the value of
      array._f_or_k = f_or_k;
    } else if (typeof f_or_k == 'function'){
      array._cmp = f_or_k;
    } else {
      throw new Error("sort_on() expects a function or a property name");
    }
    array.resort();
    return array;
  };
  array.resort = function() {
    //if (window.SORTLOG) { console.groupCollapsed('resort') }
    array.sort(array._cmp);
    //if (window.SORTLOG) { console.groupEnd('resort') }
  };
  array.clear = function(){
    array.length = 0;
    for (var i = array.length - 1; i > -1; i--) {
      array[i].remove();
    }
    return array.length == 0; // should be zero now
  };
  array.isState = function(state_property){
    /*
     * Calling isState() on a SortedSet() prepares it so that
     * when add() is called then the SortedSet is registered on
     * the itm.state property.  This means that if the item
     * is moved to a different SortedSet then it's state can
     * be tested and altered.  This enforces mutually exlusive item
     * membership among the sets which all have isState() asserted.
     */
    array.state_property = state_property || 'state';
    return array;
  };
  array.isFlag = function(flag_property){
    /*
     * Calling isFlag() on a SortedSet() prepares it so that
     * when add() is called then the SortedSet is registered on
     * the itm[flag_property].  When the item is removed from
     * the isFlagged SortedSet then that flag_property is deleted.
     * The default value for the name of the flag_property is
     * simply the name of SortedSet().  The motivation of course
     * is for many flags to be able to be set on each node, unlike
     * states, which are mutually exclusive.
     */
    array.flag_property = flag_property || array.id; // array.state_name
    return array;
  };
  /*
    Maintain a containership heirarchy on the slots 'subsets' and 'superset'
  */
  array.subsets = [];
  array.sub_of = function(superset) {
    array.superset = superset;
    superset.has_sub(array);
    return array;
  };
  array.has_sub = function(subset) {
    array.subsets.push(subset);
    if (subset.superset != array) {
      subset.superset = array;
    }
    return array;
  };
  array.named = function(name){
    array.id = name;
    return array;
  };
  array.labelled = function(label) {
    array.label = label;
    return array;
  };
  array.get_label = function() {
    return array.label || array.id;
  };
  array.sort_on('id');
  array.toggle = function(itm){
    // Objective:
    //   add() or remove() as needed
    if (array.has(itm)) {
      array.remove(itm);
    } else {
      array.add(itm);
    }
  };
  array.alter = function(itm, callback) {
    /*
     * Objective:
     *   Alter supports making a possibly position-altering change to an item.
     *   Naively changing an item could invalidate its sort order breaking
     *   operations which depend on that order.
     * Means:
     *   Alter finds itm then calls the callback, which might change itm
     *   in a way which ought to cause a repositioning in the array.
     *   If the sorted position of itm is now invalid then figure out where
     *   it should be positioned and move it there, taking care to not be
     *   distracted during binary_search by the fact that item is already
     *   in the set but possibly misorderedly so.
     */
    var current_idx = array.binary_search(itm, true);
    callback();
    if (array.validate_sort_at(current_idx, true)) {
      return current_idx;
    }
    // It was NOT in the right position, so remove it and try again
    //array.remove(itm); // remove does not work because itm is mis-sorted
    return array.nudge_itm_at_(itm, current_idx);
  };
  array.nudge_itm_at_ = function(itm, current_idx) {
    var removed = array.splice(current_idx, 1);
    if (removed.length != 1 || removed[0] != itm) {
      var msg = "failed to remove " + itm[array._f_or_k] + " during .add()";
      console.debug(msg);
      //throw new Error(msg);
    }
    var ideal = array.binary_search(itm, true);
    var before_removal_count = array.length;
    array.remove(itm);
    var after_removal_count = array.length;
    if (false && !(before_removal_count - after_removal_count == 1)) {
      var msg = "temporarily removing itm extracted " +
          (before_removal_count - after_removal_count) +
          " items";
      console.debug(msg);
      // throw new Error(msg);
    }
    //array.splice(ideal.idx, 0, itm);
    array._engage_at(itm, ideal.idx);
    return array;
  };
  array.add = function(itm){
    /*
     * Objective:
     *   Maintain a sorted array which acts like a set.
     *   It is sorted so insertions and tests can be fast.
     * Return:
     *   The index at which it was inserted (or already found)
     */
    var c = array.binary_search(itm, true);
    if (typeof c == 'number'){ // an integer was returned, ie it was found
      return c;
    }
    array._engage_at(itm, c.idx);
    //array.is_sorted();
    return c.idx;
  };
  array._engage_at = function(itm, idx) {
    array.splice(idx,0,itm);
    if (array.state_property){
      itm[array.state_property] = array;
    }
    if (array.flag_property){
      itm[array.flag_property] = array;
    }
  };
  array.has = function(itm){ // AKA contains() or is_state_of()
    if (array.state_property){
      return itm[array.state_property] == array;
    }
    if (array.flag_property){
      return itm[array.flag_property] == array;
    }
    alert("we should never get here");
  };
  array.remove = function(itm){
    /*
     * Objective:
     *   Remove item from an array acting like a set.
     *   It is sorted by cmp, so we can use binary_search for removal
     */
    var duds = [];
    var c = array.binary_search(itm);
    //console.log("c:", c, array.is_sorted());
    if (c > -1){  // it was found
      duds = array.splice(c, 1);  // remove itm into the duds array (expecting length == 1)
      if (true) { // confirm correctness
        var because;
        if (duds.length != 1) {
          because = "removed "+ duds.length + " instead of exactly 1 item";
        } else if (duds[0] != itm) {
          because = duds[0].id + " was removed instead of " + itm.id;
          console.debug(itm.id, 'was', itm[array._f_or_k], 'but',
                        duds[0].id, 'was' , duds[0][array._f_or_k],
                        'which might appear the same without being the same object');
        } else {
          because = ""; // there was no error
        }
        if (because) {
          var msg = "remove failed at idx " + c + " to splice " + itm.id +
              " out of "+ array.label + " because "+ because;
          throw new Error(msg);
        }
      }
    } else {
      //debugger;
      //throw new Error(`remove() is failing at idx ${c} because array.binary_search() failed to find ${itm.lid} in ${array.label}`);
    }
    if (array.state_property){
      itm[array.state_property] = true; // EXAMINE delete instead?
    }
    if (array.flag_property){
      delete itm[array.flag_property];
    }
    return duds[0];
  };
  array.acquire = function(itm){
    // acquire() is like add() for SortedSet() but it takes care
    // of removing itm from the previous SortedSet
    var last_state = itm[array.state_property];
    if (last_state && last_state.remove){
      last_state.remove(itm);
    }
    return array.add(itm);
  };
  array.get = function(sought){
    var idx = array.binary_search(sought);
    if (idx > -1){
      return array[idx];
    }
  };
  array.get_by = function(key, val){
    var o = {};
    o[key] = val;
    return this.get(o);
  };
  array.binary_search = function(sought, ret_ins_idx, callback){
    /*
     * This method performs a binary-search-powered version of indexOf(),
     * that is; it returns the index of sought or returns -1 to report that
     * it was not found.
     *
     * If ret_ins_idx (ie "RETurn the INSertion INdeX") is true then
     * instead of returning -1 upon failure, it returns the index at which
     * sought should be inserted to keep the array sorted.
     *
     * SortedSet must be capable of containing multiple itm which have the same key.
     * It is assumed that the key .id is available when distinguishing itemss.  See _cmp
     */
    ret_ins_idx = ret_ins_idx || false;
    var step = 0;
    var seeking = true;
    if (array.length < 1) {
      if (ret_ins_idx) {
	return {idx: 0};
      }
      return -1;
    }
    var mid, mid_node, prior_node, c,
	bot = 0,
        top = array.length;
    while (seeking){
      mid = bot + Math.floor((top - bot)/2);
      mid_node = array[mid];
      c = array._cmp(mid_node, sought);
      if (callback) {
        callback(array, sought, mid_node, prior_node, {mid: mid, bot: bot, top: top, c: c, step: step});
      }
      step++;
      prior_node = mid_node;
      //console.log(" c =",c);
      if (c == 0) {
        if (callback) {callback(array, null, null, null, {done: true, retval: mid});}
        return mid;
      }
      if (c < 0){ // ie this[mid] < sought
	bot = mid + 1;
      } else {
	top = mid;
      }
      if (bot == top){
	if (ret_ins_idx){
          if (callback) {callback(array, null, null, null, {done: true, retval: bot});}
          return {idx:bot};
	}
        if (callback) {callback(array, null, null, null, {done: true, retval: -1});}
        return -1;
      };
    }
  };
  array.is_sorted = function() { // return true or throw
    for (var i = 0; (i + 1) < array.length; i++) {
      if (array.length > 1) {
        array.validate_sort_at(i);
      }
    }
    return true;
  };
  array.validate_sort_at = function(i, or_return) {
    var
    key = array._f_or_k,
    after = array[i+1],
    tween = array[i],
    before = array[i-1],
    or_return = !or_return;  // defaults to true
    // ensure monotonic increase
    if (typeof after != 'undefined' && array._cmp(tween, after) > 0) {
      if (or_return) {
        throw new Error('"' + tween[key] + '" is before "' + after[key] + '"');
      } else {
        return false;
      }
    }
    if (typeof before != 'undefined' && array._cmp(before, tween) > 0) {
      if (or_return) {
        throw new Error('"' + before[key] + '" is before "' + tween[key] + '"');
      } else {
        return false;
      }
    }
    return true;
  };
  array.dump = function() {
    for (var i = 0; i < array.length; i++) {
      var node = array[i];
      console.log(node.lid, node.name.toString(), node.name);
    }
  };
  array.roll_call = function() {
    var out = [];
    for (var i = 0; i < array.length; i++) {
      out.push(array[i].lid || array[i].id);
    }
    return out.join(', ');
  };
  return array;
};
// Instrument SortedSet so we can track the number of 'instances'.
// This is motivated by the fact that it is currently implemented
// not as a regular subclass of Array (which was not possible when it was created)
// but as a set of adornments on an Array instances, thereby incurring
// the burden of each such copy carrying its own copies of the SortedSet
// methods with it.  See https://github.com/cwrc/HuViz/issues/259
// SortedSet.NUMBER_OF_COPIES = 0;

// These tests are included in the module to simplify testing in the browser.
var SortedSets_tests = function(verbose){
  verbose = verbose || false;
  var n = function(a,b){
    if (a == b) return 0;
    if (a < b) return -1;
    return 1;
  };
  var
  a = {id:1},
  b = {id:2},
  c = {id:0},
  d = {id:3},
  stuff = SortedSet(a,b),
  a_d = SortedSet(a,d).sort_on('id'),
  ints = SortedSet(0,1,2,3,4,5,6,7,8,10).sort_on(n),
  even = SortedSet(0,2,4,6,8,10).sort_on(n),
  some_dupes = SortedSet(0,1,2,2,5,7,2,9).sort_on(n),

  a1 = {id:1, name:'Alice'},
  a2 = {id:2, name:'Alice'},
  a3 = {id:3, name:'Alice'},
  a4 = {id:4, name:'Alice'},
  b5 = {id:5, name:'Bob'},
  b6 = {id:6, name:'Bob'},
  dupe_names = SortedSet().sort_on('name');

  function expect(stmt,want){
    var got = eval(stmt);
    if (verbose) console.log(stmt,"==>",got);
    if (got != want){
      throw stmt + " returned "+got+" expected "+want;
    }
  }
  function assert(be_good, or_throw){
    if (! be_good) throw or_throw;
  }
  function cmp_on_name(a,b){
    if (a.name == b.name) return 0;
    if (a.name < b.name)  return -1;
    return 1;
  }
  function cmp_on_id(a,b){
    if (a.id == b.id) return 0;
    if (a.id < b.id) return -1;
    return 1;
  }

  expect("cmp_on_id(a,a)",0);
  expect("cmp_on_id(a,b)",-1);
  expect("cmp_on_id(b,a)",1);
  expect("ints.binary_search(0)",0);
  expect("ints.binary_search(4)",4);
  expect("ints.binary_search(8)",8);
  expect("ints.binary_search(9)",-1);
  expect("ints.binary_search(9,true).idx",9);
  expect("ints.binary_search(-3)",-1);
  expect("even.binary_search(1,true).idx",1);
  expect("even.binary_search(3,true).idx",2);
  expect("even.binary_search(5,true).idx",3);
  expect("even.binary_search(7,true).idx",4);
  expect("even.binary_search(9,true).idx",5);
  expect("even.binary_search(9)",-1);
  expect("even.binary_search(11,true).idx",6);
  expect("stuff.binary_search(a)",0);
  expect("stuff.binary_search(b)",1);
  expect("stuff.binary_search(c)",-1);
  expect("stuff.binary_search(d)",-1);
  expect("a_d.binary_search(c)",-1);
  expect("a_d.binary_search(c,true).idx",0);
  expect("a_d.binary_search(b,true).idx",1);
  expect("a_d.add(b)",1);
  expect("a_d.binary_search(a)",0);
  expect("a_d.binary_search(b)",1);
  expect("a_d.binary_search(d)",2);
  expect("a_d.add(c)",0);
  expect("dupe_names.add(a2)", 0);
  expect("dupe_names.add(a1)", 0);
  expect("12 * 12", 144);
  expect("dupe_names.length", 2);

  expect("dupe_names.roll_call()", '1, 2');
  expect("dupe_names.binary_search({'name':'Alice'})", 1);

  expect("dupe_names.add(a4)", 2);
  expect("dupe_names.length", 3);
  expect("dupe_names.roll_call()", '1, 2, 4');

  expect("dupe_names.add(b6)", 3);
  expect("dupe_names.roll_call()", '1, 2, 4, 6');

  expect("dupe_names.add(b5)", 3);
  expect("dupe_names.roll_call()", '1, 2, 4, 5, 6');

  expect("dupe_names._cmp(b5, b5)", 0);
  expect("dupe_names._cmp(a4, b5)", -1);
  expect("dupe_names._cmp(b5, a4)", 1);

  expect("dupe_names._cmp(b5, b6)", -1);
  expect("dupe_names._cmp(b6, b5)", 1);
  expect("dupe_names._cmp(b5, a1)", 1);

  expect("dupe_names.remove(b5).id", 5);
  expect("dupe_names.remove(a2).id", 2);
  expect("dupe_names.roll_call()", '1, 4, 6');

  expect("'ran to completion'.split(' ').join(' ')", 'ran to completion');
};
/*
 * Here is a handy way to watch the tests:
 *   nodemon -w js/sortedset.js --exec  node js/sortedset.js
 * Uncomment next line to run tests.  Silence is success.
 */
//    SortedSets_tests();
if (typeof module !== 'undefined' && module.exports) {
  module.exports.SortedSet = SortedSet;
}

/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

class GCLTest {
  constructor(runner, spec) {
    this.runner = runner;
    this.spec = spec;
    console.log("GCLTest",this);
  }

  perform() {
    if (this.spec.script) {
      //console.log "==================",@spec.script
      this.runner.gclc.run(this.spec.script);
    }
    // should the expections be checked in a callback?
    for (let exp of (this.spec.expectations != null ? this.spec.expectations : [] )) {
      var got;
      console.log("exp",exp);
      try {
        got = eval(exp[0]);
      } catch (e) {
        throw new Error("while eval('"+exp[0]+"') caught: "+e);
      }
      const expected = exp[1];
      if (this.runner.verbose) {
        console.log("got="+got + " expected:"+expected);
      }
      if (got !== expected) {
        var msg = msg != null ? msg : "'"+this.spec.desc+"' "+exp[0]+" = "+got+" not "+expected;
        return msg;
      }
    }
  }
}

class GCLTestSuite {
  /*
   * callback = function(){
   *    this.expect(this.graph_ctrl.nodes.length,7);
   *    this.expect(this.graph_ctrl.shelved_set.length,0);
   * }
   * ts = new GCLTestSuite(gclc, [
   *      {script:"choose 'abdyma'",
   *       expectations: [
   *           ["this.graph_ctrl.nodes.length",7],
   *           ["this.graph_ctrl.shelved_set.length",0],
   *       ]
   *      }
   *     ])
   */
  constructor(huviz, suite) {
    this.huviz = huviz;
    this.suite = suite;
    console.log("GCLTestSuite() arguments",arguments);
    this.break_quickly = true;
  }
  emit(txt,id) {
    $("#testsuite-results").append("div").attr("id",id).text(txt);
  }
  run() {
    let pass_count = 0;
    const errors = [];
    const fails = [];
    let num = 0;
    this.emit("RUNNING","running");
    for (let spec of this.suite) {
      num++;
      let passed = false;
      console.log("spec:",spec);
      const test = new GCLTest(this,spec);
      try {
        const retval = test.perform();
        if (this.verbose) {
          console.log(retval);
        }
        if (retval != null) {
          fails.push([num,retval]);
        } else {
          passed = true;
          pass_count++;
        }
      } catch (e) {
        errors.push([num,e]);
      }
        //throw e
      if (!passed && this.break_quickly) {
        break;
      }
    }
    console.log("passed:"+pass_count+
                " failed:"+fails.length,
                " errors:"+errors.length);
    for (let fail of fails) {
      console.log("test#"+fail[0],fail[1]);
    }
    for (let err of errors) {
      console.log("err#"+err[0],err[1]);
    }
  }
}

class GraphCommand {
  static initClass() {
    this.prototype.missing = '____';
  }
    // "choose,label 'abdyma'"
    // "label Thing"
    // "choose matching 'Maria'"
    // "choose organizations matching 'church'"
    // "choose Thing matching 'mary'"
    // "discard organizations matching 'mary'"
    // "choose writers matching 'Margaret' regarding family"
    //    /(\w+)(,\s*\w+) '(\w+)'/

  // Expect args: verbs, subjects, classes, constraints, regarding
  //   verbs: a list of verb names eg: ['choose','label'] REQUIRED
  //   subjects: a list of subj_ids eg: ['_:AE','http://a.com/abdyma']
  //   classes: a list of classes: ['writers','orgs']
  //   sets: a list of the huviz sets to act on eg: [@huviz.graphed_set]
  //   constraints: matching TODO(smurp) document GraphCommand constraints
  //   regarding: a list of pred_ids eg: ['orl:child','orl:denom']
  //       really [ orl:connectionToOrganization,
  //                http://vocab.sindice.com/xfn#child ]
  // Every command must have at least one verb and any kind of subject, so
  //   at least one of: subjects, classes or sets
  // Optional parameters are:
  //   constraints and regarding
  constructor(huviz, args_or_str) {
    let args;
    this.huviz = huviz;
    if (args_or_str instanceof GraphCommand) {
      throw new Error("nested GraphCommand no longer permitted");
    }
    this.prefixes = {};
    this.args_or_str = args_or_str;
    if (typeof args_or_str === 'string') {
      args = this.parse(args_or_str);
    } else {
      args = args_or_str;
    }
    if (args.skip_history == null) {
      args.skip_history = false;
    }
    if (args.every_class == null) {
      args.every_class = false;
    }
    for (let argn in args) {
      const argv = args[argn];
      this[argn] = argv;
    }
    if ((this.str == null)) {
      this.update_str();
    }
  }
  get_node(node_spec) {
    // REVIEW this method needs attention
    let abbr, id, node, prefix, term;
    if (node_spec.id) {
      node = this.huviz.nodes.get({'id':node_spec.id});
    }
    if (node) {
      return node;
    }
    const tried = [node_spec];
    const id_parts = node_spec.split(':'); // REVIEW curie? uri?
    if (id_parts.length > 1) {
      abbr = id_parts[0];
      id = id_parts[1];
      prefix = this.prefixes[abbr];
      if (prefix) {
        term = prefix+id;
        node = this.huviz.nodes.get({'id':term});
        tried.push(term);
      }
    }
    if (!node) {
      for (abbr in this.prefixes) {
        prefix = this.prefixes[abbr];
        if (!node) {
          term = prefix+id;
          tried.push(term);
          node = this.huviz.nodes.get({'id':term});
        }
      }
    }
    if (!node) {
      const msg = `node with id = ${term} not found among ${this.huviz.nodes.length} nodes: ${tried}`;
      console.warn(msg);
      throw new Error(msg);
    }
    return node;
  }
  get_nodes() {
    let node;
    const result_set = SortedSet().sort_on("id");
    let like_regex = null;
    if (this.like) {
      like_regex = new RegExp(this.like,"ig"); // ignore, greedy
    }
    if (this.subjects) {
      for (let node_spec of this.subjects) {
        node = this.get_node(node_spec);
        if (node) {
          if ((like_regex == null) || node.name.match(like_regex)) {
            result_set.add(node);
          }
        } else {
          if ((this.classes == null)) {
            this.classes = [];
          }
          this.classes.push(node_spec.id); // very hacky
        }
      }
    }
        //nodes.push(node)
    if (this.classes) {
      for (let class_name of this.classes) {
        const the_set = (this.huviz.taxonomy[class_name] != null
                         ? this.huviz.taxonomy[class_name].get_instances()
                         : undefined);
        if (the_set != null) {
          var n;
          if (like_regex) {
            for (n of the_set) {
              if (n.name.match(like_regex)) {
                result_set.add(n);
              }
            }
          } else { // a redundant loop, kept shallow for speed when no like
            for (n of the_set) {
              result_set.add(n);
            }
          }
        }
      }
    }
    if (this.sets) {
      for (let set of this.sets) { // set might be a SortedSet instance or a_set_id string
        var a_set;
        if (typeof set === 'string') {
          const a_set_id = set;
          a_set = this.huviz.get_set_by_id(a_set_id);
        } else {
          a_set = set;
        }
        for (node of a_set) {
          if ((like_regex == null) || node.name.match(like_regex)) {
            result_set.add(node);
          }
        }
      }
    }
    return result_set;
  }
  get_methods() {
    const methods = [];
    for (let verb of this.verbs) {
      const method = this.huviz[verb];
      if (method) {
        method.build_callback = this.huviz[`${verb}__build_callback`];
        method.callback = this.huviz[`${verb}__atLast`];
        method.atFirst = this.huviz[`${verb}__atFirst`];
        methods.push(method);
      } else {
        const msg = "method '"+verb+"' not found";
        console.error(msg);
      }
    }
    return methods;
  }
  get_predicate_methods() {
    const methods = [];
    for (let verb of this.verbs) {
      const method = this.huviz[verb + "_edge_regarding"];
      if (method) {
        methods.push(method);
      } else {
        const msg = "method '"+verb+"' not found";
        console.error(msg);
      }
    }
    return methods;
  }
  regarding_required() {
    return (this.regarding != null) && (this.regarding.length > 0);
  }
  execute() {
    let iter, meth;
    this.huviz.show_state_msg(this.as_msg());
    this.huviz.d3simulation.stop();
    const regarding_required = this.regarding_required();
    const nodes = this.get_nodes();
    console.log(`%c${this.str}`, "color:blue;font-size:1.5em;", `on ${nodes.length} nodes`);
    const errorHandler = function(err_arg) {
      //alert("WOOT! command has executed")
      if (err_arg != null) {
        console.error("err =", err_arg);
        if ((err_arg == null)) {
          throw "err_arg is null";
        }
        throw err_arg;
      }
    };
      //else
      //  console.log("DONE .execute()")
    if (regarding_required) {
      for (meth of this.get_predicate_methods()) {
        iter = (node) => {
          for (let pred of this.regarding) {
            const retval = meth.call(this.huviz, node, pred);
          }
          return this.huviz.tick();
        };
        if (nodes != null) {
          async.each(nodes, iter, errorHandler);
        }
      }
    } else if (this.verbs[0] === 'load') {
      this.huviz.load_with(this.data_uri, this.with_ontologies);
    } else if (this.verbs[0] === 'run') {
      console.warn("TODO implement the ability to run scripts from the URL");
    } else if (this.verbs[0] === 'query') {
      this.huviz.query_from_seeking_limit(this.sparqlQuery);
    } else {
      for (meth of this.get_methods()) { // find the methods on huviz which implement each verb
        var callback;
        if (meth.callback) {
          ({
            callback
          } = meth);
        } else if (meth.build_callback) {
          callback = meth.build_callback(this, nodes);
        } else {
          callback = errorHandler;
        }
        const {
          atFirst
        } = meth;
        if (atFirst != null) {
          atFirst(); // is called once before iterating through the nodes
        }
        iter = (node) => {
          let retval;
          return retval = meth.call(this.huviz, node); // call the verb
        };
          //@huviz.tick() # TODO(smurp) move this out, or call every Nth node
        // REVIEW Must we check for nodes? Perhaps atLast dominates.
        if (nodes != null) {
          var USE_ASYNC;
          if (USE_ASYNC = false) {
            async.each(nodes, iter, callback);
          } else {
            for (let node of nodes) {
              iter(node);
            }
            this.huviz.gclui.set;
            callback(); // atLast is called once, after the verb has been called on each node
            this.huviz.tick(); // so commands caused by button presses get rendered
          }
        }
      }
    }
    this.huviz.clean_up_all_dirt_once();
    this.huviz.hide_state_msg();
    this.huviz.d3simulation.restart();
    this.huviz.tick("Tick in graphcommandlanguage");
  }
  get_pretty_verbs() {
    const l = [];
    for (let verb_id of this.verbs) {
      l.push(this.huviz.gclui.verb_pretty_name[verb_id]);
    }
    return l;
  }
  update_str() {
    let regarding_phrase;
    let subj;
    const {
      missing
    } = this;
    let cmd_str = "";
    let ready = true;
    let regarding_required = false;
    this.verb_phrase = '';
    this.noun_phrase = '';
    this.noun_phrase_ready = false;
    //@object_phrase = null
    if (this.verbs && this.verbs.length) {
      cmd_str = angliciser(this.get_pretty_verbs());
      this.verb_phrase_ready = true;
      this.verb_phrase = cmd_str;
    } else {
      ready = false;
      cmd_str = missing;
      this.verb_phrase_ready = false;
      this.verb_phrase = this.huviz.human_term.blank_verb;
    }
    this.verb_phrase += ' ';
    cmd_str += " ";
    let obj_phrase = "";
    if (cmd_str === 'load ') {
      this.str += this.data_uri + " .";
      return;
    }
    //debugger if not @object_phrase?
    if (this.object_phrase == null) { this.object_phrase = null; }  // this gives @object_phrase a value even if it is null
    if (this.sets != null) {
      const setLabels = [];
      for (let set of this.sets) {  // either a list of SortedSets or their ids
        var aSet;
        if (typeof set === 'string') {
          aSet = this.huviz.get_set_by_id(set);
        } else {
          aSet = set;
        }
        const setLabel = aSet.get_label();
        setLabels.push(setLabel);
      }
      let more = angliciser(setLabels);
      more = `the ${more} set` +  (((this.sets.length > 1) && 's') || '');
      this.object_phrase = more;
      //if @object_phrase?
      this.noun_phrase_ready = true;
      obj_phrase = this.object_phrase;
      this.noun_phrase = obj_phrase;
    } else {
      if (this.object_phrase) {
        console.log("update_str() object_phrase: ", this.object_phrase);
        obj_phrase = this.object_phrase;
      } else if (this.classes) {
        const maybe_every = (this.every_class && "every ") || "";
        obj_phrase += maybe_every + angliciser(this.classes);
        if (this.except_subjects) {
          obj_phrase += ' except ' + angliciser(((() => {
            const result = [];
            for (subj of this.subjects) {
              result.push(subj.lid);
            }
            return result;
          })()));
        }
      } else if (this.subjects) {
        obj_phrase = angliciser(((() => {
          const result1 = [];
          for (subj of this.subjects) {
            result1.push(subj.lid || subj);
          }
          return result1;
        })()));
      }
    }
        //@noun_phrase = obj_phrase
    if (obj_phrase === "") {
      obj_phrase = missing;
      ready = false;
      this.noun_phrase_ready = false;
      this.noun_phrase = this.huviz.human_term.blank_noun;
    } else if (obj_phrase.length > 0) {
      this.noun_phrase_ready = true;
      this.noun_phrase = obj_phrase;
    }
    cmd_str += obj_phrase;
    const like_str = (this.like || "").trim();
    if (this.verbs) {
      for (let verb of this.verbs) {
        if (['draw', 'undraw'].indexOf(verb) > -1) {
          regarding_required = true;
        }
      }
    }
    if (regarding_required) {
      regarding_phrase = missing;
      if (this.regarding_required()) { //? and @regarding.length > 0
        regarding_phrase = angliciser(this.regarding);
        if (this.regarding_every) {
          regarding_phrase = "every " + regarding_phrase;
        }
      } else {
        ready = false;
      }
    }
    this.suffix_phrase = '';
    if (like_str) {
      this.suffix_phrase += " matching '"+like_str+"'";
    }
    if (regarding_phrase) {
      this.suffix_phrase += " regarding " + regarding_phrase +  ' .';
    } else if (this.polar_coords) {
      this.suffix_phrase +=  ` at ${this.polar_coords.degrees.toFixed(0)} degrees`;
      this.suffix_phrase +=  ` and range ${this.polar_coords.range.toFixed(2)} .`;
    } else {
      this.suffix_phrase += ' .';
    }
    cmd_str += this.suffix_phrase;
    //cmd_str += " ."
    this.ready = ready;
    this.str = cmd_str;
  }
  toString() {
    return this.str;
  }
  parse_query_command(parts) {
    const keymap = { // from key in command url to key on querySpec passed to HuViz
      query: 'serverUrl',
      from: 'graphUrl',
      limit: 'limit',
      seeking: 'subjectUrl'
      };
    const spec = {};
    while (parts.length) {
      // find argName/argVal pairs
      const argName = keymap[parts.shift()];
      const argVal = unescape(parts.shift());
      if (argName != null) {
        spec[argName] = argVal;
      } else {
        throw new Error("parse_query_command() failed at",parts.join(' '));
      }
    }
    return spec;
  }
  parse(cmd_str) {
    const parts = cmd_str.split(" ");
    const verb = parts[0];
    const cmd = {};
    cmd.verbs = [verb];
    if (verb === 'load') {
      cmd.data_uri = parts[1];
      if (parts.length > 3) {
        // "load /data/bob.ttl with onto1.ttl onto2.ttl"
        cmd.with_ontologies = parts.slice(3); // cdr
      }
    } else if (verb === 'query') {
      this.sparqlQuery = this.parse_query_command(parts);
    } else {
      const subj = parts[1].replace(/\'/g,"");
      cmd.subjects = [{'id': subj}];
    }
    return cmd;
  }
  toString() {
    return this.str;
  }
  as_msg() {
    return this.str;
  }
}
GraphCommand.initClass();

class GraphCommandLanguageCtrl {
  constructor(huviz) {
    this.execute = this.execute.bind(this);
    this.huviz = huviz;
    this.prefixes = {};
  }
  run(script, callback) {
    this.huviz.before_running_command(this);
    //console.debug("script: ",script)
    if ((script == null)) {
      console.error("script must be defined");
      return;
    }
    if (script instanceof GraphCommand) {
      this.commands = [script];
    } else if (typeof script === 'string') {
      this.commands = script.split(';');
    } else if (script.constructor === [].constructor) {
      this.commands = script;
    } else { // an object we presume
      this.commands = [script];
    }
    const retval = this.execute(callback);
    this.huviz.after_running_command(this);
    return retval;
  }
  run_one(cmd_spec) {
    let cmd;
    if (cmd_spec instanceof GraphCommand) {
      cmd = cmd_spec;
    } else {
      cmd = new GraphCommand(this.huviz, cmd_spec);
    }
    cmd.prefixes = this.prefixes;
    return cmd.execute(); // TODO this might not need returning
  }
  execute(callback) {
    if ((this.commands.length > 0) && (typeof this.commands[0] === 'string') &&
        this.commands[0].match(/^load /)) {
      //console.log("initial execute", @commands)
      this.run_one(this.commands.shift());
      //setTimeout @execute, 2000
      var run_once = () => {
        document.removeEventListener('dataset-loaded',run_once);
        return this.execute();
      };
      document.addEventListener('dataset-loaded',run_once);
      return;
    }
    for (let cmd_spec of this.commands) {
      if (cmd_spec) { // ie not blank
        this.run_one(cmd_spec);
      }
    }
    if (callback != null) {
      callback();
    }
  }
}

// FIXME this should be renamed to make_dom_safe_id()
const uniquer = function(str) {
  let retval;
  const m = str.match(/([\w\d\_\-]+)$/g);
  if (m) {
    retval = m[0];
  } else {
    retval = str.replace(/http(s)?\:/, '').replace(/\//, "__");
    retval = retval.replace(/[\.\;\/]/g, '_');
    retval = retval.replace(/^\_*/g, ''); // leading _
    retval = retval.replace(/\_*$/g, ''); // trailing _
  }
  if (retval.match(/^[^a-zA-Z]/)) {
    retval = `x${retval}`;
  }
  return retval;
};

function unique_id(prefix) {
  if (prefix == null) { prefix = 'uid_'; }
  return prefix + Math.random().toString(36).substr(2,10);
};

/*
Build and control a hierarchic menu of arbitrarily nested divs looking like:

    +-----------------------+
    |      +---------------+|
    |      |        +-----+||
    | All▼ |People▼ |Men  |||
    |      |        +-----+||
    |      |        +-----+||
    |      |        |Women|||
    |      |        +-----+||
    |      +---------------+|
    +-----------------------+

* The user can toggle between collapsed and expanded using the triangles.
* On the other hand, branches in the tree which are empty are hidden.
* Clicking uncollapsed branches cycles just their selectedness not their children.
* Clicking collapsed branches cycles the selectedness of them and their children.

* <div class="container"> a container holds one or more contents
* <div class="contents"> a content (ie a node such as THING) may have a container for it kids
* so the CONTENT with id=Thing is within the root CONTAINER
     and the Thing CONTENT itself holds a CONTAINER with the child CONTENTS of its subclasses

Possible Bug: it appears that <div class="container" id="classes"> has a redundant child
                which looks like <div class="container">.
              It is unclear why this is needed.  Containers should not directly hold containers.
*/

class TreePicker {
  static initClass() {
    this.prototype.collapser_str = "▼"; // 0x25bc
    this.prototype.expander_str = "▶";
  }
  constructor(elem, root, extra_classes, needs_expander, use_name_as_label, squash_case_during_sort, style_context_selector) {
    // The @style_context_selector is only really needed by colortreepicker
    this.click_handler = this.click_handler.bind(this);
    this.handle_click = this.handle_click.bind(this);
    this.onChangeState = this.onChangeState.bind(this);
    this.elem = elem;
    this.needs_expander = needs_expander;
    this.use_name_as_label = use_name_as_label;
    this.squash_case_during_sort = squash_case_during_sort;
    this.style_context_selector = style_context_selector;
    if (extra_classes != null) {
      this.extra_classes = extra_classes;
    }
    if ((this.use_name_as_label == null)) {
      this.use_name_as_label = true;
    }
    if ((this.squash_case_during_sort == null)) {
      this.squash_case_during_sort = true;
    }
    this.id_to_elem = {};
    this.id_to_elem['/'] = this.elem;
    this.ids_in_arrival_order = [root];
    this.id_is_abstract = {};
    this.id_is_collapsed = {};
    this.id_to_state = {
      true: {},
      false: {}
    };
    this.id_to_parent = {root: '/'};
    this.id_to_children = {'/': [root]};
    this.id_to_payload_collapsed = {};
    this.id_to_payload_expanded = {};
    this.id_to_name = {};
    this.set_abstract(root); // FIXME is this needed?
    this.set_abstract('/');
    this.set_abstract('root'); // FIXME duplication?!?
  }
  get_my_id() {
    return this.elem.attr("id");
  }
  shield() {
    if (!this._shield) {
      d3.select(this.elem.node()).style('position','relative');
      this._shield = d3.select(this.elem.node()).insert('div');
      this._shield.classed('shield',true);
    }
    const rect = d3.select(this.elem.node()).node().getBoundingClientRect();
    const styles = {
      display: 'block',
      width: `${rect.width}px`,
      height: `${rect.height}px`
    };
    this._shield.style(styles);
    return this;
  }
  unshield() {
    this._shield.style({
      display: 'none'});
    return this;
  }
  set_abstract(id) {
    this.id_is_abstract[id] = true;
  }
  get_abstract_count() {
    return Object.keys(this.id_is_abstract).length;
  }
  is_abstract(id) { // ie class has no direct instances but maybe subclasses
    const tmp = this.id_is_abstract[id];
    return (tmp != null) && tmp;
  }
  uri_to_js_id(uri) {
    return uniquer(uri);
  }
  get_childrens_ids(parent_id) {
    if (parent_id == null) { parent_id = '/'; } // if no parent indicated, return root's kids
    return this.id_to_children[parent_id] || [];
  }
  get_container_elem_within_id(an_id) {
    // the div with class='container' holding class='contents' divs
    const content_elem = this.id_to_elem[an_id].node();
    return content_elem.querySelector('.container');
  }
  resort_recursively(an_id) {
    let child_elem;
    if (an_id == null) { an_id = '/'; } // if an_id not provided, then sort the root
    const kids_ids = this.get_childrens_ids(an_id);
    if (!kids_ids || !kids_ids.length) {
      return;
    }
    const val_elem_pairs = [];
    const sort_by_first_item = (a, b) => a[0].localeCompare(b[0]);
    for (let child_id of kids_ids) {
      this.resort_recursively(child_id);
      const val = this.get_comparison_value(child_id, this.id_to_name[child_id]);
      child_elem = this.id_to_elem[child_id].node();
      this.update_label_for_node(child_id, child_elem);
      val_elem_pairs.push([val, child_elem]);
    }
    val_elem_pairs.sort(sort_by_first_item);
    const container_elem = this.get_container_elem_within_id(an_id);
    if (!container_elem) {
      throw "no container_elem";
    }
    for (let val_elem_pair of val_elem_pairs) {
      child_elem = val_elem_pair[1];
      container_elem.appendChild(child_elem);
    }
  }
  update_label_for_node(node_id, node_elem) { // passing node_elem is optional
    // This takes the current value of @id_to_name[node_id] and displays it in the HTML.
    // Why? Because the label might be a MultiString whose language might have changed.
    if (node_elem == null) { node_elem = this.id_to_elem[node_id]; } // look up node_elem if it is not passed in
    const label_elem = node_elem.querySelector('p.treepicker-label span.label');
    if (label_elem != null) {
      label_elem.textContent = this.id_to_name[node_id];
    }
  }
  get_comparison_value(node_id, label) {
    let this_term;
    if (this.use_name_as_label) {
      this_term = (label || node_id);
    } else {
      this_term = node_id;
    }
    if (this.squash_case_during_sort === true) { // expose this as a setting
      this_term = this_term.toLowerCase();
    }
    return this_term;
  }
  add_alphabetically(i_am_in, node_id, label) {
    const label_lower = label.toLowerCase();
    const container = i_am_in.node();
    const this_term = this.get_comparison_value(node_id, label);
    for (let elem of container.children) {
      const other_term = this.get_comparison_value(elem.id, this.id_to_name[elem.id]);
      if (other_term > this_term) {
        return this.add_to_elem_before(i_am_in, node_id, "#"+elem.id, label);
      }
    }
    // fall through and append if it comes before nothing
    return this.add_to_elem_before(i_am_in, node_id, undefined, label);
  }
  add_to_elem_before(i_am_in, node_id, before, label) {
    return i_am_in.insert('div', before). // insert just appends if before is undef
        attr('class','contents').
        attr('id',node_id);
  }
  show_tree(tree, i_am_in, listener, top) {
    // http://stackoverflow.com/questions/14511872
    top = (top == null) || top;
    for (let node_id in tree) {
      const rest = tree[node_id];
      const label = rest[0];
      //label = "┗ " + rest[0]

      // FIXME the creation of a node in the tree should be extracted into a method
      //       rather than being spread across this one and add_alphabetically.
      //       Setting @id_to_elem[node_id] should be in the new method
      const contents_of_me = this.add_alphabetically(i_am_in, node_id, label);
      this.id_to_elem[node_id] = contents_of_me;
      const picker = this;
      contents_of_me.on('click', this.click_handler);
      contents_of_me.append("p").attr("class", "treepicker-label").
        append('span').attr('class','label').text(label);
      if (rest.length > 1) {
        const my_contents = this.get_or_create_container(contents_of_me);
        if (top && this.extra_classes) {
          for (let css_class of this.extra_classes) {
            my_contents.classed(css_class, true);
          }
        }
        this.show_tree(rest[1], my_contents, listener, false);
      }
    }
  }
  click_handler() {
    const picker = this;
    let elem = d3.select(d3.event.target);
    d3.event.stopPropagation();
    let {
      id
    } = elem.node();
    while (!id) {
      elem = d3.select(elem.node().parentElement);
      ({
        id
      } = elem.node());
    }
    picker.handle_click(id); //, send_leafward)
    // This is hacky but ColorTreePicker.click_handler() needs the id too
    return id;
  }
  handle_click(id) {
    // If this is called then id itself was itself click, not triggered by recursion
    this.go_to_next_state(id, this.get_next_state_args(id));
  }
  get_next_state_args(id) {
    const elem = this.id_to_elem[id];
    if (!elem) {
      throw new Error(`elem for '${id}' not found`);
    }
    const is_treepicker_collapsed = elem.classed('treepicker-collapse');
    const is_treepicker_showing = elem.classed('treepicker-showing');
    const is_treepicker_indirect_showing = elem.classed('treepicker-indirect-showing');
    // If the state is not 'showing' then make it so, otherwise 'unshowing'.
    // if it is not currently showing.
    let new_state = 'showing';
    if (is_treepicker_collapsed) {
      if (is_treepicker_indirect_showing) {
        new_state = 'unshowing';
      }
    } else {
      if (is_treepicker_showing) {
        new_state = 'unshowing';
      }
    }
    return {
      new_state,
      collapsed: is_treepicker_collapsed,
      original_click: true
    };
  }
  go_to_next_state(id, args) {
    const listener = this.click_listener;
    const send_leafward = this.id_is_collapsed[id];
    this.effect_click(id, args.new_state, send_leafward, listener, args);
  }
  effect_click(id, new_state, send_leafward, listener, args) {
    if (send_leafward) {
      const kids = this.id_to_children[id];
      if (kids != null) {
        for (let child_id of kids) {
          if (child_id !== id) {
            this.effect_click(child_id, new_state, send_leafward, listener);
          }
        }
      }
    }
    if (listener != null) {  // TODO(shawn) replace with custom event?
      const elem = this.id_to_elem[id];
      listener.call(this, id, new_state, elem, args); // now this==picker not the event
    }
  }
  get_or_create_container(contents) {
    const r = contents.select(".container");
    if (r.node() !== null) {
      return r;
    }
    return contents.append('div').attr('class','container');
  }
  get_top() {
    return this.ids_in_arrival_order[0] || this.id;
  }
  set_name_for_id(name, id) {
    if (this.use_name_as_label) {
      this.id_to_name[id] = name;
    } else {
      this.id_to_name[id] = id;
    }
  }
  add(new_id, parent_id, name, listener) {
    this.ids_in_arrival_order.push(new_id);
    parent_id = ((parent_id != null) && parent_id) || this.get_top();
    new_id = this.uri_to_js_id(new_id);
    this.id_is_collapsed[new_id] = false;
    parent_id = this.uri_to_js_id(parent_id);
    this.id_to_parent[new_id] = parent_id;
    if ((this.id_to_children[parent_id] == null)) {
      this.id_to_children[parent_id] = [];
    }
    if (new_id !== parent_id) {
      this.id_to_children[parent_id].push(new_id);
    }
    //@id_to_state[true][new_id] = "empty" # default meaning "no instances"
    //@id_to_state[false][new_id] = "empty" # default meaning "no instances"
    name = ((name != null) && name) || new_id;
    const branch = {};
    branch[new_id] = [name || new_id];
    this.id_to_name[new_id] = name;
    const parent = this.id_to_elem[parent_id] || this.elem;
    const container = d3.select(this.get_or_create_container(parent).node());
    if (this.needs_expander) {
      this.get_or_create_expander(parent,parent_id);
    }
    this.show_tree(branch, container, listener);
     // 0x25b6
  }
  get_or_create_expander(thing, id) {
    if ((thing != null) && thing) {
      const r = thing.select(".expander");
      if (r.node() !== null) {
        return r;
      }
      const exp = thing.select(".treepicker-label").
          append('span').
          classed("expander", true).
          text(this.collapser_str);
      this.id_is_collapsed[id] = false;
      const picker = this;
      return exp.on('click', () => { // TODO: make this function a method on the class
        d3.event.stopPropagation();
        const id2 = exp.node().parentNode.parentNode.getAttribute("id");
        if (id2 !== id) {
          console.error(`expander.click() ${id} <> ${id2}`);
        }
        if (this.id_is_collapsed[id2]) {
          return this.expand_by_id(id2);
        } else {
          return this.collapse_by_id(id2);
        }
      });
    }
  }
  collapse_by_id(id) {
    this.id_is_collapsed[id] = true;
    const elem = this.id_to_elem[id];
    elem.classed("treepicker-collapse", true);
    const exp = elem.select(".expander");
    exp.text(this.expander_str);
    this.update_payload_by_id(id);
  }
  expand_by_id(id) {
    this.id_is_collapsed[id] = false;
    const elem = this.id_to_elem[id];
    elem.classed("treepicker-collapse", false);
    const exp = elem.select(".expander");
    exp.text(this.collapser_str);
    this.update_payload_by_id(id);
  }
  expand_all() {
    for (let id in this.id_is_collapsed) {
      const collapsed = this.id_is_collapsed[id];
      if (collapsed) {
        this.expand_by_id(id);
      }
    }
  }
  get_or_create_payload(thing) {
    if ((thing != null) && thing) {
      const thing_id = thing.node().id;
      const r = thing.select(`#${thing_id} > .treepicker-label > .payload`);
      if (r.node() !== null) {
        return r;
      }
      thing.select(".treepicker-label").append('span').classed("payload", true);
    }
  }
  set_payload(id, value) {
    const elem = this.id_to_elem[id];
    if ((elem == null)) { //and elem isnt null
      console.warn(`set_payload could not find '${id}'`);
      return;
    }
    const payload = this.get_or_create_payload(elem);
    if (payload != null) {
      if (value != null) {
        payload.text(value);
      } else {
        payload.remove();
      }
    }
  }
  set_title(id, title) {
    const elem = this.id_to_elem[id];
    if (elem != null) {
      elem.attr("title", title);
    }
  }
  set_direct_state(id, state, old_state) {
    if ((old_state == null)) {
      old_state = this.id_to_state[true][id];
    }
    this.id_to_state[true][id] = state;
    const elem = this.id_to_elem[id];
    if (!elem) {
      console.warn(`set_direct_state(${id}, ${state}, ${old_state}) NO elem for id on @id_to_elem`);
      return;
    }
    if (old_state != null) {
      elem.classed(`treepicker-${old_state}`, false);
    }
    if (state != null) {
      elem.classed(`treepicker-${state}`, true);
    }
  }
  set_indirect_state(id, state, old_state) {
    if ((state == null)) {
      console.error(`${this.get_my_id()}.set_indirect_state()`,
                    arguments, "state should never be",undefined);
    }
    if ((old_state == null)) {
      old_state = this.id_to_state[false][id];
    }
    this.id_to_state[false][id] = state;  // false means indirect
    const elem = this.id_to_elem[id];
    if (!elem) {
      console.warn(`set_indirect_state(${id}, ${state}, ${old_state}) NO elem for id on @id_to_elem`);
      return;
    }
    if (old_state != null) {
      elem.classed(`treepicker-indirect-${old_state}`,false);
    }
    if (state != null) {
      elem.classed(`treepicker-indirect-${state}`,true);
    }
  }
  set_both_states_by_id(id, direct_state, indirect_state, old_state, old_indirect_state) {
    this.set_direct_state(id, direct_state, old_state);
    this.set_indirect_state(id, indirect_state, old_indirect_state);
    // the responsibility for knowing that parent state should change is Taxons
  }
  is_leaf(id) {
    return ((this.id_to_children[id] == null)) || (this.id_to_children[id].length === 0);
  }
  update_parent_indirect_state(id) {
    // Update the indirect_state of the parents up the tree
    const parent_id = this.id_to_parent[id];
    const child_is_leaf = this.is_leaf(id);
    if ((parent_id != null) && (parent_id !== id)) {
      const child_indirect_state = this.id_to_state[false][id];
      const parent_indirect_state = this.id_to_state[false][parent_id];
      //if not parent_indirect_state?
        // console.warn("#{my_id}.update_parent_indirect_state()", {parent_id: parent_id, parent_indirect_state: parent_indirect_state, child_indirect_state: child_indirect_state})
        // use the parent's direct state as a default
        // new_parent_indirect_state = @id_to_state[true][parent_id]
      let new_parent_indirect_state = parent_indirect_state;
      if (child_indirect_state !== parent_indirect_state) {
        new_parent_indirect_state = this.calc_new_indirect_state(parent_id);
      }
      if (new_parent_indirect_state !== parent_indirect_state) {
        this.set_indirect_state(parent_id, new_parent_indirect_state);
      }
        // a change has happened, so propagate rootward
      //else
      //  console.info("#{@get_my_id()}.update_parent_indirect_state()",id, "still state:", new_parent_indirect_state)
      // console.info("#{@get_my_id()}.update_parent_indirect_state()", {parent_id: parent_id, parent_indirect_state: parent_indirect_state, child_indirect_state: child_indirect_state, new_parent_indirect_state: new_parent_indirect_state})
      this.update_parent_indirect_state(parent_id);
    }
  }
  calc_new_indirect_state(id) {
    // If every time a node has its direct state change it tells its
    // parent to check whether the parents direct children share that
    // parents direct state then everybodys indirect state can be maintained.
    let new_indirect_state;
    const old_indirect_state = this.id_to_state[false][id];
    const old_direct_state = this.id_to_state[true][id];
    for (let child_id of this.id_to_children[id]) {
      const child_indirect_state = this.id_to_state[false][child_id];
      if (child_indirect_state !== new_indirect_state) {
        if ((new_indirect_state == null)) {
          new_indirect_state = child_indirect_state;
        } else {
          new_indirect_state = "mixed";
        }
      }
      if (new_indirect_state === 'mixed') {
        // once we are mixed there is no going back, so break
        break;
      }
    }
    if ((old_direct_state != null) && (new_indirect_state !== old_direct_state)) {
      new_indirect_state = "mixed";
    }
    return new_indirect_state;
  }
  get_state_by_id(id, direct_only) {
    if ((direct_only == null)) {
      direct_only = true;
    }
    return this.id_to_state[direct_only][id];
  }
      // In ballrm.nq Place has direct_state = undefined because Place has
      // no direct instances so it never has an explicit state set.
      // Should there be a special state for such cases?
      // It would be useful to be able to style such nodes to communicate
      // that they are unpopulated / can't really be selected, etc.
      // Perhaps they could be italicized because they deserve a color since
      // they might have indirect children.
  onChangeState(evt) {
    const det = evt.detail;
    if (det.new_indirect_state != null) {
      this.set_both_states_by_id(det.target_id, det.new_state, det.new_indirect_state, det.old_state, det.old_indirect_state);
    } else {
      this.set_state_by_id(det.target_id, det.new_state, det.old_state);
    }
    return this.cache_payload(det);
  }
  cache_payload(det) {
    let update = false;
    if (det.collapsed_payload != null) {
      update = true;
      this.id_to_payload_collapsed[det.target_id] = det.collapsed_payload;
    }
    if (det.payload != null) {
      update = true;
      this.id_to_payload_expanded[det.target_id] = det.payload;
    }
    if (update) {
      this.update_payload_by_id(det.target_id);
    }
  }
  update_payload_by_id(id) {
    let payload;
    if (this.id_is_collapsed[id]) {
      payload = this.id_to_payload_collapsed[id];
      if (payload != null) {
        this.set_payload(id, payload);
      }
    } else {
      payload =  this.id_to_payload_expanded[id];
      if (payload != null) {
        this.set_payload(id, payload);
      }
    }
  }
}
TreePicker.initClass();

/*
 *   http://jsfiddle.net/EPWF6/9/
 *   https://en.wikipedia.org/wiki/HSL_and_HSV#Converting_to_RGB
 *     Unfortunately this is seriously buggy!
 */
function hsl2rgb(H, S, L) {
  var input_s = "hsl2rgb(" + [H, S, L].toString() + ")";
  /*
   * H ∈ [0°, 360°)
   * S ∈ [0, 1]
   * L ∈ [0, 1]
   */
  if (H == 360) { H = 359.9999; };
  H %= 360;
  /* calculate chroma */
  var C = (1 - Math.abs((2 * L) - 1)) * S;
  /* Find a point (R1, G1, B1) along the bottom three faces of the RGB cube, with the same hue and chroma as our color (using the intermediate value X for the second largest component of this color) */
  var H_ = H / 60;
  var X = C * (1 - Math.abs((H_ % 2) - 1));
  var R1, G1, B1;
  if (H === undefined || isNaN(H) || H === null) {
    R1 = G1 = B1 = 0;
  }
  else {
    if (H_ >= 0 && H_ < 1) {
      R1 = C;
      G1 = X;
      B1 = 0;
    }
    else if (H_ >= 1 && H_ < 2) {
      R1 = X;
      G1 = C;
      B1 = 0;
    } else if (H_ >= 2 && H_ < 3) {
      R1 = 0;
      G1 = C;
      B1 = X;
    } else if (H_ >= 3 && H_ < 4) {
      R1 = 0;
      G1 = X;
      B1 = C;
    } else if (H_ >= 4 && H_ < 5) {
      R1 = X;
      G1 = 0;
      B1 = C;
    }
    else if (H_ >= 5 && H_ < 6) {
      R1 = C;
      G1 = 0;
      B1 = X;
    }
  }

  /* Find R, G, and B by adding the same amount to each component, to match lightness */

  var m = L - (C / 2);

  var R, G, B;

  /* Normalise to range [0,255] by multiplying 255 */
  R = (R1 + m) * 255;
  G = (G1 + m) * 255;
  B = (B1 + m) * 255;

  R = Math.round(R);
  G = Math.round(G);
  B = Math.round(B);

  const retval = "rgb(" + R + ", " + G + ", " + B + ")";
  //    console.info(input_s,retval);
  return retval;
}

/*
 *     ColoredTreePicker is a widget for displaying and manipulating a hierarchy
 *     and displaying and manipulating the selectedness of branches and nodes.
 *
 *     The terminology below is a bit screwy because the motivating hierarchy
 *     was a taxonomy controller which determined which nodes in a graph
 *     are 'shown' as selected.  Perhaps better terminology would be to have
 *     'shown' called 'marked' and 'unshown' called 'unmarked'.
 *
 *     ▼ 0x25bc
 *     ▶ 0x25b6
 *
 *     Expanded                   Collapsed
 *     +-----------------+        +-----------------+
 *     | parent        ▼ |        | parent        ▶ |
 *     |   +------------+|        +-----------------+
 *     |   | child 1    ||
 *     |   +------------+|
 *     |   | child 2    ||
 *     |   +------------+|
 *     +-----------------+
 *
 *     Clicking an expanded parent should cycle thru selection and deselection
 *     of only its direct instances, if there are any.
 *
 *     Clicking a collapsed parent should cycle thru selection and deselection
 *     of its direct instances as well as those of all its children.
 *
 *     The coloring of expanded parents cycles thru the three states:
 *       Mixed - some of the direct instances are selected
 *       On - all of the direct instances are selected
 *       Off - none of the direct instances are selected
 *
 *     The coloring of a collapsed parent cycles thru the three states:
 *       Mixed - some descendant instances are selected (direct or indirect)
 *       On - all descendant instances are selected (direct or indirect)
 *       Off - no descendant instances are selected (direct or indirect)
 *
 *     Indirect instances are the instances of subclasses.
 *
 * The states:
 *   showing    everything is "shown" (ie marked)
 *   mixed      some things are shown (ie a mixure of marked and unmarked)
 *   unshowing  though there are things, none are shown (ie unmarked)
 *   empty      a mid-level branch which itself has no direct instances
 *              (motivated by the taxon_picker which often has levels
 *               in its hierarchy which themselves have no direct instances)
 *   hidden     a leaf or whole branch which (at the moment) has no instances
 *              (motivated by the predicate_picker which needs to hide
 *               whole branches which currently contain nothing)
 *
 * Non-leaf levels in a treepicker can have indirect states different
 * from their direct states.  The direct state relates to the direct instances.
 * The indirect state spans the direct state of a level and all its children.
 * Leaf levels should always have equal direct and indirect states.
 *
 */

const L_unshowing = 0.93;
const L_showing = 0.75;
const L_emphasizing = 0.5;
const S_all = 0.5;
const verbose = false;

class ColoredTreePicker extends TreePicker {
  static initClass() {
    this.prototype.container_regex = new RegExp("container");
    this.prototype.contents_regex = new RegExp("contents");
  }
  constructor() {
    super(...arguments);
    this.recolor_now = this.recolor_now.bind(this);
    this.click_handler = this.click_handler.bind(this);
    this.id_to_colors = {};
  }
  add(id,parent_id,name,listener) {
    super.add(id,parent_id,name,listener);
    // FIXME @recolor_now() unless handled externally
  }
  recolor_now() {
    this.id_to_colors = this.recolor();
    this.update_css();
  }
  get_my_style_id() {
    return `${this.get_my_id()}_colors`;
  }
  update_css() {
    if ((this.style_sheet == null)) {
      this.style_sheet = this.elem.append("style");
    }
        // .attr("id", @get_my_style_id())
    let styles = `// ${this.get_my_id()}`;
    let ctxSel = this.style_context_selector;
    if (ctxSel) {
      ctxSel += ' '; // put a space after ctxSel if it has content
    }
    if (ctxSel == null) { ctxSel = ''; }
    for (let id in this.id_to_colors) {
      const colors = this.id_to_colors[id];
      const nc = colors.unshowing;
      const sc = colors.showing;
      styles += `\

${ctxSel}#${id}.treepicker-showing {
   background-color:${sc};
}
${ctxSel}#${id}.treepicker-unshowing {
   background-color:${nc};
}
${ctxSel}#${id}.treepicker-mixed,
${ctxSel}#${id}.treepicker-indirect-mixed.treepicker-collapse {
  background: linear-gradient(45deg, ${nc}, ${sc}, ${nc}, ${sc}, ${nc}, ${sc}, ${nc}, ${sc});
  background-color: transparent;
}\
`;
    }
    this.style_sheet.html(styles);
    if (false) { // cross-check the stylesheets to ensure proper loading
      if (this.style_sheet.html().length !== styles.length) {
        console.error("style_sheet_length error:", this.style_sheet.html().length, "<>", styles.length);
      } else {
        console.info("style_sheet_length good:",this.style_sheet.html().length, "==", styles.length);
      }
    }
  }
  recolor() {
    const recursor = {
      count: Object.keys(this.id_to_elem).length - this.get_abstract_count(),
      i: 0
    };
    const retval = {};
    if (verbose) {
      console.log("RECOLOR");
    }
    const branch = this.elem.node().children[0];
    this.recolor_recurse_DOM(retval, recursor, branch, "");
    return retval;
  }
  recolor_recurse_DOM(retval, recursor, branch, indent) {
    const branch_id = branch.getAttribute("id");
    let class_str = branch.getAttribute("class");
    if (verbose) {
      console.log(indent+"-recolor_recurse(",branch_id,class_str,")",branch);
    }
    if (branch_id) {
      // should this go after recursion so color range can be picked up?
      this.recolor_node(retval, recursor, branch_id, branch, indent);
    }
    if (branch.children.length > 0) {
      for (let elem of branch.children) {
        if (elem != null) {
          class_str = elem.getAttribute("class");
          if (class_str.indexOf("treepicker-label") > -1) {
            continue;
          }
          this.recolor_recurse_DOM(retval, recursor, elem, indent + " |");
        }
      }
    }
    return retval;
  }
  recolor_node(a_node, recursor, id, elem_raw, indent) {
    const elem = d3.select(elem_raw);
    if (this.is_abstract(id)) {
      a_node[id] = {
        unshowing:  hsl2rgb(0, 0, L_unshowing),
        showing:     hsl2rgb(0, 0, L_showing),
        emphasizing: hsl2rgb(0, 0, L_emphasizing)
      };
    } else {
      // https://en.wikipedia.org/wiki/HSL_and_HSV#HSL
      //   Adding .5 ensures hues are centered in their range, not at top.
      //   Adding 1 ensures different first and last colors, since 0 == 360
      const hue = ((recursor.i + .5)/(recursor.count + 1)) * 360;
      recursor.i++; // post-increment to stay in the range below 360
      a_node[id] = {
        unshowing:   hsl2rgb(hue, S_all, L_unshowing),
        showing:     hsl2rgb(hue, S_all, L_showing),
        emphasizing: hsl2rgb(hue, S_all, L_emphasizing)
      };
      if (verbose && [1, recursor.count + 1].includes(recursor.i)) {
        console.info(id, recursor, hue, a_node[id]);
      }
    }
    if (verbose) {
      console.log(indent + " - - - recolor_node("+id+")", a_node[id].unshowing);
    }
  }
  get_current_color_forId(id) {
    const state = this.id_to_state[true][id];
    return this.get_color_forId_byName(id, state);
  }
  get_color_forId_byName(id, state_name) {
    id = this.uri_to_js_id(id);
    const colors = this.id_to_colors[id];
    if (colors != null) {
      return colors[state_name];
    }
    console.warn("no colors found for id: " + id);
  }
  click_handler() {
    const id = super.click_handler();
    this.style_with_kid_color_summary_if_needed(id);
  }
  style_with_kid_color_summary_if_needed(id) {
    if (this.should_be_colored_by_kid_summary(id)) {
      this.style_with_kid_color_summary(id);
    }
  }
  should_be_colored_by_kid_summary(id) {
    return !this.is_leaf(id) && this.id_is_collapsed[id];
  }
  collapse_by_id(id) {
    super.collapse_by_id(id);
    this.style_with_kid_color_summary_if_needed(id);
  }
  expand_by_id(id) {
    if (this.should_be_colored_by_kid_summary(id)) {
      this.id_to_elem[id].attr("style", ""); // clear style set by set_gradient_style
    }
    super.expand_by_id(id);
  }
  summarize_kid_colors(id, color_list) {
    color_list = color_list || [];
    const kids = this.id_to_children[id];
    if (!this.is_abstract[id]) {
      const color = this.get_current_color_forId(id);
      if (color != null) {
        color_list.push(color);
      }
    }
    if (kids != null) {
      for (let kid_id of kids) {
        this.summarize_kid_colors(kid_id, color_list);
      }
    }
    return color_list;
  }
  style_with_kid_color_summary(id) {
    const color_list = this.summarize_kid_colors(id);
    if (color_list.length === 1) {
      color_list.push(color_list[0]);
    }
    if (color_list.length) {
      this.set_gradient_style(id,color_list);
    }
  }
  set_gradient_style(id, kid_colors) {
    const colors = kid_colors.join(', ');
    let style = "background-color: transparent;";
    style += ` background: linear-gradient(45deg, ${colors})`;
    this.id_to_elem[id].attr("style", style);
  }
  set_payload(id, value) {
    super.set_payload(id, value);
    // REVIEW it works but is this the right time to do this?
    // ensure collapsed nodes have summary colors updated
    this.style_with_kid_color_summary_if_needed(id);
  }
}
ColoredTreePicker.initClass();

// A controller for the display of the lifecycle of a SPARQL Query
class QueryManager {
  constructor(qry) {
    this.qry = qry;
    this.set_state('new');
    if (this.listeners == null) { this.listeners = []; }
    this.resultCount = 0;
  }
  set_state(state) {
    this._state = state;
    if (state === 'done') {
      this.call_done_listeners();
    }
  }
  when_done(listener) {
    this.listeners.push(listener);
  }
  call_done_listeners() {
    let listener;
    while (listener = this.listeners.shift()) {
      setTimeout(listener, 10);
    }
  }
  incrResultCount() { // TODO delete if unused
    return this.resultCount++;
  }
  styleQuery(color, style) {
    this.preJQElem.css('background', color).addClass(style);
  }
  setNoneColor() {
    this.styleQuery('#d3d3d357','result-none'); // no result 'light grey'
  }
  setErrorColor() {
    this.styleQuery('#f9e7ea', 'result-error'); // Error 'pink'
  }
  setSuccessColor() {
    this.styleQuery('#e6f9e6','result-success'); // Success 'green'
  }
  setKilledColor() {
    this.setNoneColor();
    this.preJQElem.css('color', 'white').addClass('result-empty');
  }
  displayError(e) {
    console.warn(e);
    this.qryJQElem.append(`<div class="query-error">${e}</div>`);
  }
  fatalError(e) {
    this.set_state('done');
    this.cancelAnimation();
    this.displayError(e);
    this.setErrorColor();
  }
  displayResults(results) {
    this.qryJQElem.append(`<div class="query-results">${results}</div>`);
  }
  finishCounting() {
    this.setResultCount(this.resultCount);
  }
  setResultCount(count) {
    this.set_state('done');
    this.resultCount = count;
    this.displayResults(`result count: ${this.resultCount}`);
    if (count === 0) {
      this.setNoneColor();
    } else if (count > 0) {
      this.setSuccessColor();
    }
  }
  setXHR(xhr) {
    this.xhr = xhr;
  }
  abortXHR() {
    this.xhr.abort();
  }
  cancelAnimation() {
    this.anim.cancel();
  }
  kill() {
    this.abortXHR();
    this.cancelAnimation();
    this.setKilledColor();
  }
}

window.toggle_suspend_updates = function(val) {
  console.log("toggle_suspend_updates(#val)");
  if ((window.suspend_updates == null) || !window.suspend_updates) {
    window.suspend_updates = true;
  } else {
    window.suspend_updates = false;
  }
  if (val != null) {
    window.suspend_updates = val;
  }
  //console.warn "suspend_updates",window.suspend_updates
  return window.suspend_updates;
};
const getRandomId = function(prefix) {
  const max = 10000000000;
  prefix = prefix || 'id';
  return prefix + Math.floor(Math.random() * Math.floor(max));
};

class CommandController {
  static initClass() {
      //,
      //  print: 'print'
      //  redact: 'redact'
      //  peek: 'peek'
      //,  # FIXME the edge related commands must be reviewed
      //  show: 'reveal'
      //  suppress: 'suppress'
      //  specify: 'specify'
      //  emphasize: 'emphasize'
    this.prototype.auto_change_verb_tests = {
      select(node) {
        if (node.selected != null) {
          return 'unselect';
        }
      },
      unselect(node) {
        if ((node.selected == null)) {
          return 'select';
        }
      },
      choose(node) {
        if (node.chosen != null) {
          return 'unchoose';
        }
      },
      unchoose(node, engagedVerb) {
        if ((node.chosen == null)) {
          return 'choose' || engagedVerb;
        }
      },
      wander(node) {
        if (node.chosen != null) {
          return 'wander';
        }
      },
      walk(node) {
        if (node.chosen != null) {
          return 'walk';
        }
      },
      label(node) {
        if (node.labelled) {
          return 'unlabel';
        }
      },
      unlabel(node) {
        if (!node.labelled) {
          return 'label';
        }
      },
      unpin(node) {
        if (!node.fixed) {
          return 'pin';
        }
      },
      pin(node) {
        if (node.fixed) {
          return 'unpin';
        }
      }
    };
    this.prototype.verbs_requiring_regarding =
      ['show','suppress','emphasize','deemphasize'];
    this.prototype.verbs_override = {
      // when overriding ones are selected, others are unselected
      choose: ['discard', 'unchoose', 'shelve', 'hide', 'wander', 'walk'],
      wander: ['choose', 'unchoose', 'discard', 'shelve', 'hide', 'walk'],
      walk: ['choose', 'unchoose', 'discard', 'shelve', 'hide', 'wander'],
      shelve: ['unchoose', 'choose', 'hide', 'discard', 'retrieve', 'wander', 'walk'],
      discard: ['choose', 'retrieve', 'hide', 'unchoose', 'unselect', 'select', 'wander', 'walk'],
      hide: ['discard', 'undiscard', 'label', 'choose' ,'unchoose', 'select', 'unselect', 'wander', 'walk'],
      hunt: ['discard', 'undiscard', 'choose', 'unchoose', 'wander', 'walk', 'hide', 'unhide', 'shelve', 'pin', 'unpin']
    };
    this.prototype.verb_descriptions = {
      choose: `Put nodes in the graph and pull other, connected nodes in too, \
so long as they haven't been discarded.`,
      wander:    `Put nodes in the graph and pull connected nodes in followed by \
shelving of the nodes which had been pulled into the graph previously.`,
      walk: `Put nodes in the graph but keep the previous central nodes activated. \
Shelve previous sub-nodes.`,
      shelve: `Remove nodes from the graph and put them on the shelf \
(the circle of nodes around the graph) from which they \
might return if called back into the graph by a neighbor \
being chosen.`,
      hide: `Remove nodes from the graph and don't display them anywhere, \
though they might be called back into the graph when some \
other node calls it back in to show an edge.`,
      label: "Show the node's labels.",
      unlabel: "Stop showing the node's labels.",
      discard: `Put nodes in the discard bin (the small red circle which appears \
when you start dragging a node) from which they do not get \
called back into the graph unless they are first retrieved.`,
      undiscard: `Retrieve nodes from the discard bin (the small red circle \
which appears when you start dragging a node)) \
and put them back on the shelf.`,
      print: "Print associated snippets.",
      redact: "Hide the associated snippets.",
      show: `Show edges: 'Show (nodes) regarding (edges).' \
Add to the existing state of the graph edges from nodes of \
the classes indicated edges of the types indicated.`,
      suppress: `Stop showing: 'Suppress (nodes) regarding (edges).' \
Remove from the existing sate of the graph edges of the types \
indicated from nodes of the types classes indicated.`,
      specify: `Immediately specify the entire state of the graph with \
the constantly updating set of edges indicated from nodes \
of the classes indicated.`,
      load: "Load knowledge from the given uri.",
      pin: "Make a node immobile",
      unpin: "Make a node mobile again",
      hunt: "Animate binary search for the node"
    };
    this.prototype.verb_cursors = {
      choose: "←",
      unchoose: "⇠",
      wander: "🚶",
      walk: "🚶",
      shelve: "↺",
      label: "☭",
      unlabel: "☢",
      discard: "☣",
      undiscard: "☯",
      hide: "☠",
      select: "☘",
      unselect: "☺",
      pin: "p",
      unpin: "u",
      hunt: "X"
    };

    this.prototype.working_timeout = 500;
    this.prototype.nextcommand_prompts_visible = true;
    this.prototype.nextcommand_str_visible = false;
    this.prototype.engaged_verbs = [];
    this.prototype.verb_control = {};
  }
  constructor(huviz, container, hierarchy) {
    this.on_downloadscript_json_clicked = this.on_downloadscript_json_clicked.bind(this);
    this.on_downloadscript_txt_clicked = this.on_downloadscript_txt_clicked.bind(this);
    this.on_downloadscript_hybrid_clicked = this.on_downloadscript_hybrid_clicked.bind(this);
    this.on_downloadscript_type = this.on_downloadscript_type.bind(this);
    this.on_stashscript_clicked = this.on_stashscript_clicked.bind(this);
    this.on_rewind_click = this.on_rewind_click.bind(this);
    this.on_backward_click = this.on_backward_click.bind(this);
    this.on_forward_click = this.on_forward_click.bind(this);
    this.on_fastforward_click = this.on_fastforward_click.bind(this);
    this.on_dataset_loaded = this.on_dataset_loaded.bind(this);
    this.select_the_initial_set = this.select_the_initial_set.bind(this);
    this.NEW_select_the_initial_set = this.NEW_select_the_initial_set.bind(this);
    this.OLD_select_the_initial_set = this.OLD_select_the_initial_set.bind(this);
    this.handle_newpredicate = this.handle_newpredicate.bind(this);
    this.recolor_edges_and_predicates = this.recolor_edges_and_predicates.bind(this);
    this.add_predicate = this.add_predicate.bind(this);
    this.handle_on_predicate_clicked = this.handle_on_predicate_clicked.bind(this);
    this.on_predicate_clicked = this.on_predicate_clicked.bind(this);
    this.recolor_edges = this.recolor_edges.bind(this);
    this.add_taxon = this.add_taxon.bind(this);
    this.onChangeEnglish = this.onChangeEnglish.bind(this);
    this.handle_on_taxon_clicked = this.handle_on_taxon_clicked.bind(this);
    this.on_taxon_clicked = this.on_taxon_clicked.bind(this);
    this.stop_working = this.stop_working.bind(this);
    this.handle_clear_like = this.handle_clear_like.bind(this);
    this.handle_like_input = this.handle_like_input.bind(this);
    this.disengage_all_verbs = this.disengage_all_verbs.bind(this);
    this.push_future_onto_history = this.push_future_onto_history.bind(this);
    this.update_command = this.update_command.bind(this);
    this.perform_current_command = this.perform_current_command.bind(this);
    this.handle_on_verb_clicked = this.handle_on_verb_clicked.bind(this);
    this.handle_on_set_picked = this.handle_on_set_picked.bind(this);
    this.disengage_all_sets = this.disengage_all_sets.bind(this);
    this.clear_all_sets = this.clear_all_sets.bind(this);
    this.on_set_count_update = this.on_set_count_update.bind(this);
    this.huviz = huviz;
    this.container = container;
    this.hierarchy = hierarchy;
    if (!this.huviz.all_set.length) {
      $(this.container).hide();
    }
    d3.select(this.container).html("");
    if (this.huviz.args.display_hints) {
      this.hints = d3.select(this.container).append("div").attr("class","hints");
      $(".hints").append($(".hint_set").contents());
    }
    this.style_context_selector = this.huviz.get_picker_style_context_selector();
    this.comdiv = d3.select(this.container).append("div"); // --- Add a container
    if (!this.huviz.combine_command_history) {
      this.control_label("Current Command");
    }
    this.nextcommandbox = this.comdiv.append('div');
    this.nextcommandbox.classed('combined_command_history',    // set this class
                                this.huviz.combine_command_history);  // if true
    this.make_command_history();
    this.prepare_tabs_sparqlQueries();
    this.make_verb_sets();
    this.control_label("Verbs");
    this.verbdiv = this.comdiv.append('div').attr('class','verbs');
    this.depthdiv = this.comdiv.append('div');
    this.add_clear_both(this.comdiv);
    //@node_pickers = @comdiv.append('div')
    this.node_pickers = this.comdiv.append('div').attr("id","node_pickers");
    this.set_picker_box_parent = this.build_set_picker("Sets",this.node_pickers);
    this.taxon_picker_box_parent = this.build_taxon_picker(
      "Class Selector", this.node_pickers);
    this.add_clear_both(this.comdiv);
    this.likediv = this.taxon_picker_box_parent.append('div');
    this.build_predicate_picker("Edges of the Selected Nodes");
    this.init_editor_data();
    this.build_form();
    this.update_command();
    this.install_listeners();
  }
  control_label(txt, what, title) {
    what = what || this.comdiv;
    const outer = what.append('div');
    const label = outer.append('div');
    label.classed("control_label",true).text(txt);
    if (title) {
      label.attr('title',title);
    }
    return outer;
  }
  new_GraphCommand(args) {
    return new GraphCommand(this.huviz, args);
  }
  reset_graph() {
    /*
    * unhide all
    * retrieve all
    * shelve all
    * sanity check set counts
    */
    //@huviz.run_command(@new_GraphCommand(
    //  verbs: ['unhide']
    //  sets: [@huviz.all_set]
    //  skip_history: true))
    this.huviz.walkBackAll();
    this.huviz.walk_path_set = [];
    this.huviz.run_command(this.new_GraphCommand({
      verbs: ['undiscard','unchoose','unselect', 'unpin', 'shelve','unlabel'],
      sets: [this.huviz.all_set.id],
      skip_history: true}));
    this.disengage_all_verbs();
    this.reset_command_history();
    this.engaged_taxons = [];
  }
  prepare_tabs_sparqlQueries() {
    // populate @huviz.tabs_sparqlQueries_JQElem with needed furniture
  }
  push_sparqlQuery_onto_log(qry, meta) {
    if (meta == null) { meta = {}; }
    if (meta.timestamp == null) { meta.timestamp = Date.now(); }
    const id = meta.id || this.huviz.hash(qry + meta.timestamp);
    const queriesJQElem = this.huviz.tabs_sparqlQueries_JQElem;
    const qryJQElem = $('<div class="played command"><pre></pre></div>');
    qryJQElem.attr('id', id);
    queriesJQElem.append(qryJQElem);
    const preJQElem = qryJQElem.find('pre');
    const preElem = preJQElem[0];
    preJQElem.text(qry); // rely on text() doing HTML encoding (to protect <, >, etc )
    queriesJQElem.scrollTop(10000);
    const queryManager = new QueryManager(qry);
    return Object.assign(queryManager, {qryJQElem, preJQElem, preElem});
  }
  make_command_history() {
    var history, command_history_label;
    if (!this.huviz.combine_command_history) {
      history = d3.select(this.huviz.oldToUniqueTabSel['tabs-history']);
      command_history_label = 'Command History';
    } else {
      this.huviz.tab_for_tabs_history_JQElem.hide();
      history = this.nextcommandbox; // keep only this for feature flag combine_command_history
      command_history_label = 'Commands';
    }
    this.cmdtitle = history.
      append('div').
      attr('class','control_label').
      html(command_history_label).
      attr('style', 'display:inline');
    this.scriptPlayerControls = history.append('div').attr(
      'class','scriptPlayerControls');
    //  attr('style','position: relative;  float:right')

    this.scriptRewindButton = this.scriptPlayerControls.append('button').
      attr('title','rewind to start').
      attr('disabled', 'disabled').on('click', this.on_rewind_click);
    this.scriptRewindButton.append('i').
      attr("class", "fa fa-fast-backward");

    this.scriptBackButton = this.scriptPlayerControls.append('button').
      attr('title','go back one step').
      attr('disabled', 'disabled').on('click', this.on_backward_click);
    this.scriptBackButton.append('i').attr("class", "fa fa-play fa-flip-horizontal");

    this.scriptPlayButton = this.scriptPlayerControls.append('button').
      attr('title','play script step by step').
      attr('disabled', 'disabled').on('click', this.on_forward_click);
    this.scriptPlayButton.append('i').attr("class", "fa fa-play");

    this.scriptForwardButton = this.scriptPlayerControls.append('button').
      attr('title','play script continuously').
      attr('disabled', 'disabled').on('click', this.on_fastforward_click);
    this.scriptForwardButton.append('i').attr("class", "fa fa-fast-forward");

    this.scriptDownloadButton = this.scriptPlayerControls.append('button').
      attr('title','save script to file').
      attr('style', 'margin-left:1em').  // ;display:none
      attr('disabled', 'disabled').on('click', this.on_downloadscript_hybrid_clicked);
    this.scriptDownloadButton.append('i').attr("class", "fa fa-download");
      //.append('span').text('.txt')

    this.scriptDownloadJsonButton = this.scriptPlayerControls.append('button').
      attr('title','save script as .json').
      attr('style', 'display:none').on('click', this.on_downloadscript_json_clicked);
    this.scriptDownloadJsonButton.append('i').attr("class", "fa fa-download").
      append('span').text('.json');

    this.scriptStashButton = this.scriptPlayerControls.append('button').
      attr('title','save script to menu').
      attr('disabled', 'disabled').
      attr('style', 'margin-left:.1em').on('click', this.on_stashscript_clicked);
    this.scriptStashButton.append('i').attr("class", "fa fa-bars");
      //.append('span').text('save to menu')

    this.cmdlist = history.
      append('div').
      attr('class','commandlist');
    this.oldcommands = this.cmdlist.
      append('div').
      attr('class','commandhistory').
      style('max-height', `${this.huviz.height-80}px`);
    this.commandhistoryElem = this.huviz.topElem.querySelector('.commandhistory');
    this.commandhistory_JQElem = $(this.commandhistoryElem);
    this.future_cmdArgs = [];
    this.command_list = [];
    this.command_idx0 = 0;
  }
  reset_command_history() {
    for (let record of this.command_list) {
      record.elem.attr('class','command');
    }
  }
  get_downloadscript_name(ext) {
    return this.lastScriptName || ('HuVizScript.' + ext);
  }
  get_script_prefix() {
    return [
      "#!/bin/env huviz",
      "# This HuVis script file was generated by the page:",
      "#   " + this.huviz.get_reload_uri(),
      "# Generated at " + (new Date()).toISOString(),
      "",
      ""
      ].join("\n");
  }
  get_script_body() {
    return this.get_script_prefix() + this.oldcommands.text();
  }
  get_script_body_as_json() {
    const cmdList = [];
    if (this.huviz.dataset_loader.value) {
      cmdList.push({
        verbs: ['load'],
        data_uri: this.huviz.dataset_loader.value,
        ontologies: [this.huviz.ontology_loader.value],
        skip_history: true
      });
    }
    for (let elem_and_cmd of this.command_list) {
      const {
        cmd
      } = elem_and_cmd;
      cmdList.push(cmd.args_or_str);
    }
    const replacer = function(key, value) {
      // replacer() removes non-literals from GraphCommand.args_or_script for serialization
      const retlist = [];
      if (key === 'subjects') {
        for (let node_or_id of value) {
          var obj;
          if (!node_or_id.id) {
            console.debug("expecting node_or_id to have attribute .id", node_or_id);
          }
          if (node_or_id.id && node_or_id.lid) {
            // ideally send both the id (ie url) and the lid which is the pretty id
            obj = {
              id: node_or_id.id,
              lid: node_or_id.lid
            };
          }
          retlist.push(obj || node_or_id);
        }
        return retlist;
      }
      if (key === 'sets') {
        for (let set_or_id of value) {
          const setId = set_or_id.id || set_or_id;
          retlist.push(setId);
        }
        return retlist;
      }
      return value;
    };
    return JSON.stringify(cmdList, replacer, 4);
  }
  get_script_body_as_hybrid() {
    // The "hybrid" script style consists of three parts
    //   1) the text version of the script
    //   2) the json_marker, a separator between the two parts
    //   3) the json version of the script
    return this.get_script_body() +
      "\n\n" + this.huviz.json_script_marker +
      "\n\n" + this.get_script_body_as_json();
  }
  make_txt_script_href() {
    const theBod = encodeURIComponent(this.get_script_body());
    const theHref = "data:text/plain;charset=utf-8," + theBod;
    return theHref;
  }
  make_json_script_href() {
    const theJSON = encodeURIComponent(this.get_script_body_as_json());
    const theHref = "data:text/json;charset=utf-8," + theJSON;
    return theHref;
  }
  make_hybrid_script_href() {
    const theBod = encodeURIComponent(this.get_script_body_as_hybrid());
    const theHref = "data:text/plain;charset=utf-8," + theBod;
    return theHref;
  }
  on_downloadscript_json_clicked() {
    this.on_downloadscript_type('json');
  }
  on_downloadscript_txt_clicked() {
    this.on_downloadscript_type('txt');
  }
  on_downloadscript_hybrid_clicked() {
    this.on_downloadscript_type('hybrid', 'txt');
  }
  on_downloadscript_type(scriptFileType, ext) {
    let theHref;
    const transientLink = this.scriptPlayerControls.append('a');
    transientLink.text('script');
    const thisName = prompt("What would you like to call your saved script?",
      this.get_downloadscript_name(ext || scriptFileType));
    if (!thisName) {
      return;
    }
    this.lastScriptName = thisName;
    transientLink.attr('style','display:none');
    transientLink.attr('download', this.lastScriptName);
    if (scriptFileType === 'json') {
      theHref = this.make_json_script_href();
    } else if (scriptFileType === 'txt') {
      theHref = this.make_txt_script_href();
    } else if (scriptFileType === 'hybrid') {
      theHref = this.make_hybrid_script_href();
    }
    transientLink.attr('href',theHref);
    transientLink.node().click();
    const node = transientLink.node();
    node.parentNode.removeChild(node);
  }
  on_stashscript_clicked() {
    const scriptFileType = 'hybrid';
    const ext = 'txt';
    const thisName = prompt("What would you like to call this script in your menu?",
      this.get_downloadscript_name(ext || scriptFileType));
    if (!thisName) {
      return;
    }
    this.lastScriptName = thisName;
    const script_rec = {
      uri: thisName,
      opt_group: 'Your Own',
      data: this.get_script_body_as_hybrid()
    };
    this.huviz.script_loader.add_local_file(script_rec);
  }
  on_rewind_click() {
    this.reset_graph();
    this.command_idx0 = 0;
    this.update_script_buttons();
  }
  on_backward_click() {
    const forward_to_idx = this.command_idx0 - 1;
    this.on_rewind_click();
    this.on_fastforward_click(forward_to_idx);
  }
  on_forward_click() {
    this.play_old_command_by_idx(this.command_idx0);
    this.command_idx0++;
    this.update_script_buttons();
  }
  on_fastforward_click(forward_to_idx) {
    if (forward_to_idx == null) { forward_to_idx = this.command_list.length; }
    while (this.command_idx0 < forward_to_idx) {
      this.on_forward_click();
    }
  }
  play_old_command_by_idx(idx) {
    const record = this.command_list[idx];
    record.elem.attr('class', 'command played');
    this.play_old_command(record.cmd);
  }
  play_old_command(cmd) {
    cmd.skip_history = true;
    cmd.skip_history_remove = true;
    this.huviz.run_command(cmd);
  }
  install_listeners() {
    window.addEventListener('changePredicate', this.predicate_picker.onChangeState);
    window.addEventListener('changeTaxon', this.taxon_picker.onChangeState);
    window.addEventListener('changeEnglish', this.onChangeEnglish);
  }
  on_dataset_loaded(evt) {
    if ((evt.done == null)) {
      $(this.container).show();
      this.show_succession_of_hints();
      this.huviz.perform_tasks_after_dataset_loaded();
      this.huviz.hide_state_msg();
      // FIXME is there a standards-based way to prevent this happening three times?
      evt.done = true;
    }
  }
  show_succession_of_hints() {
    // Show the reminders, give them close buttons which reveal them in series
    $(".hints.hint_set").show();
    for (let reminder of $(".hints > .a_hint")) {
      $(reminder).attr('style','position:relative');
      $(reminder).append('<i class="fa fa-close close_hint"></i>').
        on("click", (evt,ui) => {
          $(evt.target).parent().hide(); // hide reminder whose close was clicked
          if ($(evt.target).parent().next()) { // is there a next another
            $(evt.target).parent().next().show(); // then show it
          }
          return false;
      });
    } // so not all close buttons are pressed at once
    $(".hints > .a_hint").hide();
    $(".hints > .a_hint").first().show();
  }
  select_the_initial_set() {
    this.OLD_select_the_initial_set();
  }
  NEW_select_the_initial_set() {
    // this does NOT function as a workaround for the problem like OLD_select_the_initial_set
    this.huviz.run_command(this.new_GraphCommand({
      verbs: ['select'],
      every_class: true,
      classes: ['Thing'],
      skip_history: true}));
    this.huviz.run_command(this.new_GraphCommand({
      verbs: ['unselect'],
      every_class: true,
      classes: ['Thing'],
      skip_history: true}));
    this.huviz.shelved_set.resort(); // TODO remove when https://github.com/cwrc/HuViz/issues/109
  }
  OLD_select_the_initial_set() {
    // TODO initialize the taxon coloring without cycling all
    const rm_cmd = () => { // more hideous hackery: remove toggleTaxonThing from script
      return this.delete_script_command_by_idx(0);
    };
    const toggleEveryThing = () => {
      this.huviz.toggle_taxon("Thing", false); //, () -> alert('called'))
      return setTimeout(rm_cmd, 1000);
    };
    toggleEveryThing.call();
    // everyThingIsSelected = () =>
    //  @huviz.nodes.length is @huviz.selected_set.length
    // @check_until_then(everyThingIsSelected, toggleEveryThing)
    setTimeout(toggleEveryThing, 1200);
    setTimeout(this.push_future_onto_history, 1800);
    //@huviz.do({verbs: ['unselect'], sets: [], skip_history: true})
    this.huviz.shelved_set.resort(); // TODO remove when https://github.com/cwrc/HuViz/issues/109
  }
  check_until_then(checkCallback, thenCallback) {
    const nag = () => {
      if (checkCallback.call()) {
        clearInterval(intervalId);
        //alert('check_until_then() is done')
        return thenCallback.call();
      }
    };
    var intervalId = setInterval(nag, 30);
  }
  init_editor_data() {
    // operations common to the constructor and reset_editor
    this.shown_edges_by_predicate = {};
    this.unshown_edges_by_predicate = {};
    this.engaged_taxons = []; // new SortedSet()
  }
  reset_editor() {
    this.clear_like();
    this.disengage_all_verbs();
    this.disengage_all_sets();
    this.clear_all_sets();
    this.init_editor_data();
    this.update_command();
  }
  disengage_command() {
    this.clear_like();
    this.disengage_all_verbs();
    this.disengage_all_sets();
    this.update_command();
  }
  disengage_all() {
    this.clear_like();
    this.disengage_all_sets();
    this.disengage_all_verbs();
    this.update_command();
  }
  add_clear_both(target) {
    // keep taxonomydiv from being to the right of the verbdiv
    target.append('div').attr('style','clear:both');
  }
  ignore_predicate(pred_id) {
    this.predicates_ignored.push(pred_id);
  }
  handle_newpredicate(e) {
    const {
      pred_uri
    } = e.detail;
    const {
      parent_lid
    } = e.detail;
    const {
      pred_lid
    } = e.detail;
    let {
      pred_name
    } = e.detail;
    if (!this.predicates_ignored.includes(pred_uri)) { // FIXME merge with predicates_to_ignore
      if (!this.predicates_ignored.includes(pred_lid)) { // FIXME merge with predicates_to_ignore
        if (pred_name == null) { pred_name = pred_lid.match(/([\w\d\_\-]+)$/g)[0]; }
        this.add_predicate(pred_lid, parent_lid, pred_name);
        this.recolor_edges_and_predicates_eventually(e);
      }
    }
  }
  recolor_edges_and_predicates_eventually() {
    if (this.recolor_edges_and_predicates_eventually_id != null) {
      // console.log "defer edges_and_predicates",@recolor_edges_and_predicates_eventually_id
      clearTimeout(this.recolor_edges_and_predicates_eventually_id);
    }
    this.recolor_edges_and_predicates_eventually_id = setTimeout(this.recolor_edges_and_predicates, 300);
  }
  recolor_edges_and_predicates(evt) {
    this.predicate_picker.recolor_now();
    this.recolor_edges(); // FIXME should only run after the predicate set has settled for some time
  }
  resort_pickers() {
    if (this.taxon_picker != null) {
      // propagate the labels according to the currently preferred language
      this.taxon_picker.resort_recursively();
      this.taxon_picker.recolor_now();
      this.huviz.recolor_nodes();
    }
    if (this.predicate_picker != null) {
      console.log("resorting of predicate_picker on hold until it does not delete 'anything'");
    }
      //@predicate_picker?.resort_recursively()
    //@set_picker?.resort_recursively()
  }
  build_predicate_picker(label) {
    let extra_classes, needs_expander, squash_case, use_name_as_label;
    this.predicates_id = this.huviz.unique_id('predicates_');
    const title =
      "Medium color: all edges shown -- click to show none\n" +
      "Faint color: no edges are shown -- click to show all\n" +
      "Stripey color: some edges shown -- click to show all\n" +
      "Hidden: no edges among the selected nodes";
    const where = (
      (label != null) &&
        this.control_label(label,this.comdiv,title)) || this.comdiv;
    this.predicatebox = where.append('div')
        .classed('container', true)
        .attr('id', this.predicates_id);
    //@predicatebox.attr('class','scrolling')
    this.predicates_ignored = [];
    this.predicate_picker = new ColoredTreePicker(
      this.predicatebox, 'anything',
      (extra_classes=[]),
      (needs_expander=true),
      (use_name_as_label=true),
      (squash_case=true),
      this.style_context_selector);
    this.predicate_hierarchy = {'anything':['anything']};
    // FIXME Why is show_tree being called four times per node?
    this.predicate_picker.click_listener = this.handle_on_predicate_clicked;
    this.predicate_picker.show_tree(this.predicate_hierarchy, this.predicatebox);
    this.predicates_JQElem = $(this.predicates_id);
    this.predicates_JQElem.addClass("predicates ui-resizable").append("<br class='clear'>");
    this.predicates_JQElem.resizable({handles: 's'});
  }
  add_predicate(pred_lid, parent_lid, pred_name) {
    //if pred_lid in @predicates_to_ignore
    //  return
    this.predicate_picker.add(
      pred_lid, parent_lid, pred_name, this.handle_on_predicate_clicked);
    this.make_predicate_proposable(pred_lid);
  }
  make_predicate_proposable(pred_lid) {
    const predicate_ctl = this.predicate_picker.id_to_elem[pred_lid];
    predicate_ctl.on('mouseenter', () => {
      const every = !!this.predicate_picker.id_is_collapsed[pred_lid];
      const nextStateArgs = this.predicate_picker.get_next_state_args(pred_lid);
      if (nextStateArgs.new_state === 'showing') {
        this.proposed_verb = 'draw';
      } else {
        this.proposed_verb = 'undraw';
      }
      this.regarding = [pred_lid];
      this.regarding_every = !!this.predicate_picker.id_is_collapsed[pred_lid];
      const ready = this.prepare_command(this.build_command());
    });
    predicate_ctl.on('mouseleave', () => {
      this.proposed_verb = null;
      this.regarding = null;
      this.prepare_command(this.build_command());
      //@prepare_command(@new_GraphCommand( {}))
    });
  }
  handle_on_predicate_clicked(pred_id, new_state, elem, args) {
    this.start_working();
    setTimeout(() => { // run asynchronously so @start_working() can get a head start
      return this.on_predicate_clicked(pred_id, new_state, elem, args);
    });
  }
  on_predicate_clicked(pred_id, new_state, elem, args) {
    let verb;
    const skip_history = !args || !args.original_click;
    if (new_state === 'showing') {
      verb = 'draw';
    } else {
      verb = 'undraw';
    }
    const cmd = this.new_GraphCommand({
      verbs: [verb],
      regarding: [pred_id],
      regarding_every: !!this.predicate_picker.id_is_collapsed[pred_id],
      sets: [this.huviz.selected_set.id],
      skip_history});
    this.prepare_command(cmd);
    this.huviz.run_command(this.command);
  }
  recolor_edges(evt) {
    let count = 0;
    for (let node of this.huviz.all_set) {
      for (let edge of node.links_from) {
        count++;
        const pred_n_js_id = edge.predicate.id;
        edge.color = this.predicate_picker.get_color_forId_byName(
          pred_n_js_id, 'showing');
      }
    }
  }
  build_taxon_picker(label, where) {
    let extra_classes, needs_expander, squash_case, use_name_as_label;
    const id = 'classes';
    const title =
      "Medium color: all nodes are selected -- click to select none\n" +
      "Faint color: no nodes are selected -- click to select all\n" +
      "Stripey color: some nodes are selected -- click to select all\n";
    where = ((label != null)
             && this.control_label(label, where, title)) || this.comdiv;
    this.taxon_box = where.append('div')
        .classed('container', true)
        .attr('id', id);
    this.taxon_box.attr('style','vertical-align:top');
    // http://en.wikipedia.org/wiki/Taxon
    this.taxon_picker = new ColoredTreePicker(
      this.taxon_box, 'Thing',
      // documenting meaning of positional params with single use variables
      (extra_classes=[]),
      (needs_expander=true),
      (use_name_as_label=true),
      (squash_case=true),
      this.style_context_selector);
    this.taxon_picker.click_listener = this.handle_on_taxon_clicked;
    this.taxon_picker.hover_listener = this.on_taxon_hovered;
    this.taxon_picker.show_tree(this.hierarchy, this.taxon_box);
    where.classed("taxon_picker_box_parent", true);
    return where;
  }
  add_taxon(taxon_id, parent_lid, class_name, taxon) {
    this.taxon_picker.add(taxon_id, parent_lid, class_name,
                          this.handle_on_taxon_clicked);
    this.make_taxon_proposable(taxon_id);
    this.taxon_picker.recolor_now();
    this.huviz.recolor_nodes();
  }
  make_taxon_proposable(taxon_id) {
    const taxon_ctl = this.taxon_picker.id_to_elem[taxon_id];
    taxon_ctl.on('mouseenter', evt => {
      //evt.stopPropagation()
      // REVIEW consider @taxon_picker.get_next_state_args(taxon_id) like make_predicate_proposable()
      this.proposed_taxon = taxon_id;
      this.proposed_every = !!this.taxon_picker.id_is_collapsed[taxon_id];
      if (!this.engaged_verbs.length) {
        // only presume that select/unselect is what is happening when no other verbs are engaged
        if (this.engaged_taxons.includes(taxon_id)) {
          this.proposed_verb = 'unselect';
        } else {
          this.proposed_verb = 'select';
        }
      }
      //console.log(@proposed_verb, @proposed_taxon)
      const ready = this.prepare_command(this.build_command());
    });
    taxon_ctl.on('mouseleave', evt => {
      this.proposed_taxon = null;
      this.proposed_verb = null;
      const ready = this.prepare_command(this.build_command());
    });
  }
  onChangeEnglish(evt) {
    this.object_phrase = evt.detail.english;
    //console.log("%c#{@object_phrase}",'color:orange;font-size:2em')
    this.prepare_command(this.build_command());
    this.update_command();
  }
  handle_on_taxon_clicked(id, new_state, elem, args) {
    this.start_working();
    setTimeout(() => { // run asynchronously so @start_working() can get a head start
      return this.on_taxon_clicked(id, new_state, elem, args);
    });
  }
  set_taxa_click_storm_callback(callback) {
    if (this.taxa_click_storm_callback != null) {
      throw new Error("taxa_click_storm_callback already defined");
    } else {
      this.taxa_click_storm_callback = callback;
    }
  }
  taxa_being_clicked_increment() {
    if ((this.taxa_being_clicked == null)) {
      this.taxa_being_clicked = 0;
    }
    this.taxa_being_clicked++;
  }
  taxa_being_clicked_decrement() {
    if ((this.taxa_being_clicked == null)) {
      throw new Error("taxa_being_clicked_decrement() has been called before taxa_being_clicked_increment()");
    }
    //@taxa_being_clicked ?= 1
    //console.log("taxa_being_clicked_decrement() before:", @taxa_being_clicked)
    this.taxa_being_clicked--;
    //console.log("taxa_being_clicked_decrement() after:", @taxa_being_clicked)
    if (this.taxa_being_clicked === 0) {
      //console.log("taxa click storm complete after length #{@taxa_click_storm_length}")
      //debugger if @taxa_click_storm_callback?
      if (this.taxa_click_storm_callback != null) {
        this.taxa_click_storm_callback.call(document);
        this.taxa_click_storm_callback = null;
      }
    }
      //@taxa_click_storm_length = 0
  }
    //else
    //  blurt(@taxa_being_clicked, null, true)
    //  @taxa_click_storm_length ?= 0
    //  @taxa_click_storm_length++
  make_run_transient_and_cleanup_callback(because) {
    return err => {
      if (err) {
        console.log(err);
        throw err;
      }
      this.huviz.clean_up_all_dirt();
      this.run_any_immediate_command({});
      this.perform_any_cleanup(because);
    };
  }
  on_taxon_clicked(taxonId, new_state, elem, args) {
    let cmd, old_state;
    if (args == null) { args = {}; }
    // This method is called in various contexts:
    // 1) aVerb ______ .      Engage a taxon, run command, disengage taxon
    // 2) _____ ______ .      Engage a taxon
    // 3) _____ aTaxon .      Disengage a taxon
    // 4) _____ a and b .     Engage or disenage a taxon

    // These variables are interesting regardless of which scenario holds
    const taxon = this.huviz.taxonomy[taxonId];
    const hasVerbs = !!this.engaged_verbs.length;
    const skip_history = !args.original_click;
    const every_class = !!args.collapsed; // force boolean value and default false
    // If there is already a verb engaged then this click should be running
    //     EngagedVerb taxonWith_id .
    //   In particular, the point being made here is that it is just the
    //   taxon given by taxonId which will be involved, not the selected_set
    //   or any other nodes.
    //
    //   Let us have some examples as a sanity check:
    //     Select taxonId .    # cool
    //     Label  taxonId .    # no problemo
    //       *       *         # OK, OK looks straight forward
    if (hasVerbs) {
      cmd = this.new_GraphCommand({
        verbs: this.engaged_verbs,
        classes: [taxonId],
        every_class,
        skip_history});
      this.huviz.run_command(cmd);
      return;
    }

    // If there is no verb engaged then this click should either engage or
    // disengage the taxon identified by id as dictated by new_state.
    //
    // The following implements the tristate behaviour:
    //   Mixed —> On
    //   On —> Off
    //   Off —> On
    if (taxon != null) {
      old_state = taxon.get_state();
    } else {
      throw "Uhh, there should be a root Taxon 'Thing' by this point: " + taxonId;
    }
    if (new_state === 'showing') {
      if (['mixed', 'unshowing', 'empty'].includes(old_state)) {
        if (!(this.engaged_taxons.includes(taxonId))) {
          this.engaged_taxons.push(taxonId);
        }
        // SELECT all members of the currently chosen classes
        cmd = this.new_GraphCommand({
          verbs: ['select'],
          classes: [taxonId],
          every_class,
          skip_history});
          //classes: (class_name for class_name in @engaged_taxons)
      } else {
        console.error(`no action needed because ${taxonId}.${old_state} == ${new_state}`);
      }
    } else if (new_state === 'unshowing') {
      this.unselect_node_class(taxonId);
      cmd = this.new_GraphCommand({
        verbs: ['unselect'],
        classes: [taxonId],
        every_class,
        skip_history});
    } else if (old_state === "hidden") {
      console.error(`${taxonId}.old_state should NOT equal 'hidden' here`);
    }
    this.taxon_picker.style_with_kid_color_summary_if_needed(taxonId);
    if (cmd != null) {
      this.huviz.run_command(
        cmd, this.make_run_transient_and_cleanup_callback(because));
      var because = {};  // clear the because
    }
    this.update_command();
     // from on_taxon_clicked
  }
  unselect_node_class(node_class) {
    // removes node_class from @engaged_taxons
    this.engaged_taxons = this.engaged_taxons.filter(eye_dee => eye_dee !== node_class);
    // # Elements may be in one of these states:
    //   mixed      - some instances of the node class are selected, but not all
    //   unshowing  - a light color indicating nothing of that type is selected
    //   showing    - a medium color indicating all things of that type are selected
    //   abstract   - the element represents an abstract superclass,
    //                presumably containing concrete node classes
    //
    //   hidden     - TBD: not sure when hidden is appropriate
    //   emphasized - TBD: mark the class of the focused_node
  }
  make_verb_sets() {
    this.verb_sets = [
      { // mutually exclusive within each set
        choose: this.huviz.human_term.choose,
        unchoose: this.huviz.human_term.unchoose
      }
      , {
        select: this.huviz.human_term.select,
        unselect: this.huviz.human_term.unselect
      }
      , {
        label:  this.huviz.human_term.label,
        unlabel: this.huviz.human_term.unlabel
      }
      , {
        discard: this.huviz.human_term.discard,
        undiscard: this.huviz.human_term.undiscard
      }
      , {
        pin: this.huviz.human_term.pin,
        unpin: this.huviz.human_term.unpin
      }
      // put all the singletons alone down here
      , {
        wander: this.huviz.human_term.wander
      }
      , {
        walk: this.huviz.human_term.walk
      }
      , {
        shelve: this.huviz.human_term.shelve
      }
      , {
        hide:   this.huviz.human_term.hide
      }
    ];
    if (this.huviz.show_hunt_verb) {
      this.verb_sets.push({hunt: this.huviz.human_term.hunt});
    }
  }
  should_be_immediate_mode() {
    return !this.is_verb_phrase_empty() &&
      this.is_command_object_empty() &&
      !this.liking_all_mode;
  }
  is_command_object_empty() {
    return (this.huviz.selected_set.length === 0) && (this.chosen_set == null);
  }
  is_verb_phrase_empty() {
    return this.engaged_verbs.length === 0;
  }
  auto_change_verb_if_warranted(node) {
    if (this.huviz.edit_mode) {
      return;
    }
    if (this.immediate_execution_mode) {
      // If there is only one verb, then do auto_change
      if (this.engaged_verbs.length === 1) {
        const verb = this.engaged_verbs[0];
        const test = this.auto_change_verb_tests[verb];
        if (test) {
          const next_verb = test(node, this.engaged_verbs[0]);
          if (next_verb) {
            this.engage_verb(next_verb, verb === this.transient_verb_engaged);
          }
        }
      }
      this.huviz.set_cursor_for_verbs(this.engaged_verbs);
    } else { // no verbs are engaged
      this.huviz.set_cursor_for_verbs([]);
    }
  }
  build_form() {
    this.build_verb_form();
    this.build_depth();
    this.build_like();
    this.nextcommand = this.nextcommandbox.append('div').
        attr('class','nextcommand command');

    // Where the full command string to appear as plain text, eg:
    //    "____ every Thing."
    //    "shelve every Person."
    this.nextcommandstr = this.nextcommand.append('code');
    $(this.nextcommandstr.node()).addClass('nextcommand_str');

    if (this.nextcommand_prompts_visible && this.nextcommand_str_visible) {
      this.nextcommand.append('hr');
    }

    // Where the broken out versions of the command string, with prompts, goes.
    this.nextcommand_prompts = this.nextcommand.append('code');
    this.nextcommand_prompts.attr('class', 'nextcommand_prompt');
    this.nextcommand_verb_phrase = this.nextcommand_prompts.append('span');
    this.nextcommand_verb_phrase.attr('class','verb_phrase');
    this.nextcommand_noun_phrase = this.nextcommand_prompts.append('span');
    this.nextcommand_noun_phrase.attr('class','noun_phrase');
    this.nextcommand_suffix_phrase = this.nextcommand_prompts.append('span');
    this.nextcommand_suffix_phrase.attr('class','suffix_phrase');

    if (this.nextcommand_prompts_visible) {
      $(this.nextcommand_prompts.node()).show();
    } else {
      $(this.nextcommand_prompts.node()).hide();
    }

    if (this.nextcommand_str_visible) {
      $(this.nextcommandstr.node()).show();
    } else {
      $(this.nextcommandstr.node()).hide();
    }

    this.nextcommand_working = this.nextcommand.append('div').attr('class','cmd-spinner');
    this.nextcommand_working.style('float:right; color:red; display:none;');
    this.build_submit();
     // msec
  }
  start_working() {
    log_click();
    if (this.already_working) {
      clearTimeout(this.already_working);
      //console.log "already working", @already_working
    } else {
      //console.log "start_working()"
      this.show_working_on();
    }
    this.already_working = setTimeout(this.stop_working, this.working_timeout);
  }
  stop_working() {
    this.show_working_off();
    this.already_working = undefined;
  }
  show_working_on(cmd){
    //console.log "show_working_on()"
    if ((cmd != null) && !cmd.skip_history) {
      this.push_command_onto_history(cmd);
    }
    this.nextcommand_working.attr('class','fa fa-spinner fa-spin'); // PREFERRED fa-2x
    this.nextcommand.attr('class','nextcommand command cmd-working');
  }
  show_working_off() {
    //console.log "show_working_off()"
    this.nextcommand_working.attr('class','');
    this.nextcommand.attr('class','nextcommand command');
    //@nextcommand.attr('style','background-color:yellow') # PREFERRED
  }

  build_depth() {
    this.depthdiv.text('Activate/Wander Depth:').
      classed("control_label activate_depth", true);
    this.depthdiv.style('display','none');//('display','inline-block')
    this.depthdiv.style('white-space','nowrap');
    this.depth_input = this.depthdiv.append('input');
    this.depth_input.attr('class', 'depth_input');
    this.depth_input.attr('placeholder','1');
    this.depth_input.attr('type','number');
    this.depth_input.attr('min','1');
    this.depth_input.attr('max','9');
    this.depth_input.attr('value','1');
  }

  build_like() {
    this.likediv.text('matching:').classed("control_label", true);
    this.likediv.style('display','inline-block');
    this.likediv.style('white-space','nowrap');
    this.like_input = this.likediv.append('input');
    this.like_input.attr('class', 'like_input');
    this.like_input.attr('placeholder','node Name');
    this.liking_all_mode = false; // rename to @liking_mode
    this.like_input.on('input', this.handle_like_input);
    this.clear_like_button = this.likediv.append('button').text('⌫');
    this.clear_like_button.attr('type','button').classed('clear_like', true);
    this.clear_like_button.attr('disabled','disabled');
    this.clear_like_button.attr('title','clear the "matching" field');
    this.clear_like_button.on('click', this.handle_clear_like);
  }

  handle_clear_like(evt) {
    this.like_input.property('value','');
    this.handle_like_input();
  }

  handle_like_input(evt) {
    let TODO;
    const like_value = this.get_like_string();
    const like_has_a_value = !!like_value;
    if (like_has_a_value) {
      this.huviz.set_search_regex(like_value); // cause labels on matching nodes to be displayed
      this.clear_like_button.attr('disabled', null);
      if (this.liking_all_mode) { //
        TODO = "update the selection based on the like value";
        //@update_command(evt) # update the impact of the value in the like input
      } else {
        this.liking_all_mode = true;
        this.chosen_set_before_liking_all = this.chosen_set_id;
        this.set_immediate_execution_mode(this.is_verb_phrase_empty());
        this.huviz.click_set("all"); // ie choose the 'All' set
      }
    } else { // like does not have a value
      this.huviz.set_search_regex(''); // clear the labelling of matching nodes
      this.clear_like_button.attr('disabled','disabled');
      if (this.liking_all_mode) { // but it DID
        TODO = "restore the state before liking_all_mode " +
        "eg select a different set or disable all set selection";
        //alert(TODO+" was: #{@chosen_set_before_liking_all}")
        if (this.chosen_set_before_liking_all) {
          this.huviz.click_set(this.chosen_set_before_liking_all);
          this.chosen_set_before_liking_all = undefined; // forget all about it
        } else {
          this.huviz.click_set('all'); // this should toggle OFF the selection of 'All'
        }
        this.liking_all_mode = false;
        this.set_immediate_execution_mode(true);
        //@update_command(evt) # does this deal with that moment when it becomes blanked?
      } else { // nothing has happened, so
        TODO = "do nothing ????";
      }
    }
    this.update_command(evt);
  }

  build_submit() {
    this.doit_butt = this.nextcommand.append('span').append("input").
           attr("style","float:right;").
           attr("type","submit").
           attr('value','GO!').
           attr('class','doit_button');
    this.doit_butt.on('click', () => {
      if (this.update_command()) {
        return this.huviz.run_command(this.command);
      }
    });
    //@huviz.update_all_counts()  # TODO Try to remove this, should be auto
    this.set_immediate_execution_mode(true);
  }
  enable_doit_button() {
    this.doit_butt.attr('disabled',null);
  }
  disable_doit_button() {
    this.doit_butt.attr('disabled','disabled');
  }
  hide_doit_button() {
    $(this.doit_butt.node()).hide();
  }
  show_doit_button() {
    $(this.doit_butt.node()).show();
  }
  set_immediate_execution_mode(which) {
    if (which) {
      this.hide_doit_button();
    } else {
      this.show_doit_button();
    }
    this.immediate_execution_mode = which;
  }
  update_immediate_execution_mode_as_warranted() {
    this.set_immediate_execution_mode(this.should_be_immediate_execution_mode());
  }
  disengage_all_verbs() {
    for (let vid of this.engaged_verbs) {
      this.disengage_verb(vid);
    }
  }
  unselect_all_node_classes() {
    for (let nid of this.engaged_taxons) {
      this.unselect_node_class(nid);
      this.taxon_picker.set_direct_state(nid, 'unshowing');
    }
  }
  clear_like() {
    this.huviz.like_string();
  }
  get_like_string() {
    return this.like_input.node().value;
  }
  push_command(cmd) {
    throw new Error('DEPRECATED');
    this.push_command_onto_history(cmd);
  }
  push_cmdArgs_onto_future(cmdArgs) {
    this.future_cmdArgs.push(cmdArgs);
  }
  push_future_onto_history() {
    if (this.future_cmdArgs.length) {
      this.huviz.goto_tab('history');
      for (let cmdArgs of this.future_cmdArgs) {
        this.push_command_onto_history(this.new_GraphCommand(cmdArgs));
      }
      this.reset_command_history();
      this.command_idx0 = 0;
      this.update_script_buttons();
    }
  }
  push_command_onto_history(cmd) {
    // Maybe the command_pointer is in the middle of the command_list and here
    // we are trying to run a new command -- so we need to dispose of the remaining
    // commands in the command_list because the user is choosing to take a new path.
    this.clear_unreplayed_commands_if_needed();
    cmd.id = getRandomId('cmd');
    const elem = this.oldcommands.append('div').
      attr('class','played command').
      attr('id',cmd.id);
    this.commandhistory_JQElem.scrollTop(this.commandhistory_JQElem.scrollHeight);
    const elem_and_cmd = {
      elem,
      cmd
    };
    this.command_list.push(elem_and_cmd);
    this.command_idx0 = this.command_list.length;
    const idx_of_this_command = this.command_idx0;
    // we are appending to the end of the script, playing is no longer valid, so...
    this.disable_play_buttons();
    elem.text(cmd.str+"\n"); // add CR for downloaded scripts
    const delete_button = elem.append('a');
    delete_button.attr('class', 'delete-command');
    delete_button.on('click', () => this.delete_script_command_by_id(cmd.id));
    this.update_script_buttons();
  }
  clear_unreplayed_commands_if_needed() {
    while (this.command_idx0 < this.command_list.length) {
      this.delete_script_command_by_idx(this.command_list.length - 1);
    }
  }
  delete_script_command_by_id(cmd_id) {
    for (let idx = 0; idx < this.command_list.length; idx++) {
      const elem_and_cmd = this.command_list[idx];
      if (elem_and_cmd.cmd.id === cmd_id) {
        this.delete_script_command_by_idx(idx);
        break;
      }
    }
  }
  delete_script_command_by_idx(idx) {
    const elem_and_cmd = this.command_list.splice(idx, 1)[0]; // remove elem_and_cmd from command_list
    const elem = elem_and_cmd.elem.node();
    if (!elem) {
      console.warn(`delete_script_command_by_idx(${idx}) failed to find elem in`,
                   elem_and_cmd);
      return;
    }
    elem.remove();
    if (idx < this.command_idx0) {
      this.command_idx0--;
    }
    if (this.command_idx0 < 0) {
      this.command_idx0 = 0;
    }
    this.update_script_buttons();
  }
  update_script_buttons() {
    if (this.command_list.length > 1) {
      this.enable_save_buttons();
    } else {
      this.disable_save_buttons();
    }
    if (this.command_idx0 >= this.command_list.length) {
      this.disable_play_buttons();
    } else {
      this.enable_play_buttons();
    }
    if (this.command_idx0 > 0) {
      this.enable_back_buttons();
    }
    if (this.command_idx0 <= 0) {
      this.disable_back_buttons();
    }
  }
  disable_play_buttons() {
    this.scriptPlayButton.attr('disabled', 'disabled');
    this.scriptForwardButton.attr('disabled', 'disabled');
  }
  enable_play_buttons() {
    this.scriptForwardButton.attr('disabled', null);
    this.scriptPlayButton.attr('disabled', null);
  }
  disable_back_buttons() {
    this.scriptBackButton.attr('disabled', 'disabled');
    this.scriptRewindButton.attr('disabled', 'disabled');
  }
  enable_back_buttons() {
    this.scriptBackButton.attr('disabled', null);
    this.scriptRewindButton.attr('disabled', null);
  }
  disable_save_buttons() {
    this.scriptDownloadButton.attr('disabled', 'disabled');
    this.scriptStashButton.attr('disabled', 'disabled');
  }
  enable_save_buttons() {
    this.scriptDownloadButton.attr('disabled', null);
    this.scriptStashButton.attr('disabled', null);
  }
  build_command() {
    const args = {verbs: []};
    args.object_phrase = this.object_phrase;
    if (this.engaged_verbs.length > 0) {
      for (let v of this.engaged_verbs) {
        if (v !== this.transient_verb_engaged) {
          args.verbs.push(v);
        }
      }
    }
    if ((this.regarding != null) && this.regarding.length) {
      args.regarding = this.regarding.slice(); // ie copy
      args.regarding_every = this.regarding_every;
    }
    if (this.proposed_verb) {
      args.verbs.push(this.proposed_verb);
    }
    if (this.chosen_set_id) {
      args.sets = [this.chosen_set];
    } else if (this.proposed_set) {
      args.sets = [this.proposed_set];
    } else {
      if (this.proposed_taxon) {
        args.every_class = this.proposed_every;
        args.classes = [this.proposed_taxon];
      } else { // proposed_taxon dominates engaged_taxons and the selected_set equally
        if (this.engaged_taxons.length > 0) {
          args.classes = (Array.from(this.engaged_taxons));
        }
        if (this.huviz.selected_set.length > 0) {
          args.sets = ['selected'];
        }
      }
    }
    const like_str = (this.like_input.node().value || "").trim();
    if (like_str) {
      args.like = like_str;
    }
    this.command = this.new_GraphCommand(args);
    return this.command;
  }
  is_proposed() {
    return this.proposed_verb || this.proposed_set || this.proposed_taxon;
  }
  update_command(because) {
    //console.log("update_command()", because)
    because = because || {};
    this.huviz.show_state_msg("update_command");
    this.run_any_immediate_command(because);
    this.huviz.hide_state_msg();
  }
  run_any_immediate_command(because) {
    //console.log("run_any_immediate_command()", because)
    const ready = this.prepare_command(this.build_command());
    if (ready && this.huviz.doit_asap &&
        this.immediate_execution_mode && !this.is_proposed()) {
      this.perform_current_command(because);
    }
  }
  perform_current_command(because) {
    this.show_working_on(this.command);
    if (this.huviz.slow_it_down) {
      const start = Date.now();
      while (Date.now() < (start + (this.huviz.slow_it_down * 1000))) {
        console.log(Math.round((Date.now() - start) / 1000));
      }
    }
    //alert("About to execute:\n  "+@command.str)
    this.command.execute();
    this.huviz.update_all_counts();
    this.perform_any_cleanup(because);
    this.show_working_off();
  }
  perform_any_cleanup(because) {
    //console.log("perform_any_cleanup()",because)
    if ((because != null) && because.cleanup) {
      because.cleanup();
      this.update_command();
    }
  }
  prepare_command(cmd) {
    this.command = cmd;
    if (this.nextcommand_prompts_visible || true) { // NEEDED BY huviz_test.js
      this.nextcommand_verb_phrase.text(this.command.verb_phrase);
      if (this.command.verb_phrase_ready) {
        $(this.nextcommand_verb_phrase.node()).
          addClass('nextcommand_prompt_ready').
          removeClass('nextcommand_prompt_unready');
      } else {
        $(this.nextcommand_verb_phrase.node()).
          removeClass('nextcommand_prompt_ready').
          addClass('nextcommand_prompt_unready');
      }
      this.nextcommand_noun_phrase.text(this.command.noun_phrase);
      if (this.command.noun_phrase_ready) {
        $(this.nextcommand_noun_phrase.node()).
          addClass('nextcommand_prompt_ready').
          removeClass('nextcommand_prompt_unready');
      } else {
        $(this.nextcommand_noun_phrase.node()).
          removeClass('nextcommand_prompt_ready').
          addClass('nextcommand_prompt_unready');
      }
      this.nextcommand_suffix_phrase.text(this.command.suffix_phrase);
    }
    if (this.nextcommand_str_visible || true) { // NEEDED BY huviz_test.js
      this.nextcommandstr.text(this.command.str);
    }
    if (this.command.ready) {
      this.enable_doit_button();
    } else {
      this.disable_doit_button();
    }
    return this.command.ready;
  }
  ready_to_perform() {
    const permit_multi_select = true;
    return (this.transient_verb_engaged === 'unselect') ||
      (!this.object_phrase && (this.engaged_verbs.length > 0)) ||
      (permit_multi_select &&
       ((this.engaged_verbs.length === 1) && (this.engaged_verbs[0] === 'select')));
  }
  build_verb_form() {
    this.verb_pretty_name = {};
    //var pairs = d3.select(this.verbdiv.append('div').attr('class', 'pairs').node());
    var pairs = this.verbdiv.append('div').attr('class', 'pairs');
    //var singletons = d3.select(this.verbdiv.append('divs').attr('class', 'singletons').node());
    var singletons = this.verbdiv.append('divs').attr('class', 'singletons');
    for (let vset of this.verb_sets) {
      this.add_verb_set(vset, pairs, singletons);
    }
  }
  add_verb_set(vset, pairs, singletons) {
    var containerElem;
    const isSingle = Object.keys(vset).length == 1;
    console.log((isSingle ? 'singleton' : 'pair'), vset, pairs.constructor.name);
    if (!singletons) {
      console.log("ignoring add_verb_set() call from EditController");
      return this.verbdiv;
    }
    if (isSingle) {
      // Put all the singletons directly within ".verbs < .singletons"
      containerElem = singletons;
    } else {
      // Put the pairs within their own ".alternates" within ".verbs < .pairs"
      const alternatesElem = pairs.append('div').attr('class','alternates');
      containerElem = alternatesElem.append('div').attr('class', 'pair');
      alternatesElem.append('div').attr('class', 'x-button').text('X');
    }
    for (let id in vset) {
      const label = vset[id];
      this.verb_pretty_name[id] = label;
      this.build_verb_picker(id, label, containerElem);
    }
    // TODO move these to the right place !?!?!
    this.verb_pretty_name['load'] = this.huviz.human_term.load;
    this.verb_pretty_name['hunt'] = this.huviz.human_term.hunt;
    this.verb_pretty_name['draw'] = this.huviz.human_term.draw;
    this.verb_pretty_name['undraw'] = this.huviz.human_term.undraw;
    return containerElem; // might not be ignored
  }
  get_verbs_overridden_by(verb_id) {
    const override = this.verbs_override[verb_id] || [];
    for (let vset of this.verb_sets) {
      if (vset[verb_id]) {
        for (let vid in vset) {
          const label = vset[vid];
          if (!(override.includes(vid)) && (verb_id !== vid)) {
            override.push(vid);
          }
        }
      }
    }
    return override;
  }

  /*
  The "Do it" button is not needed if the following hold...

  If there is an object_phrase then the instant a verb is picked the command
  should run.

  If there are verbs picked then the instant there is an object_phrase the
  command should run and the object_phrase cleared. (what about selected_set?)

  Note that this covers immediate execution of transient verbs select/unselect

  */
  are_non_transient_verbs() {
    // return whether there are any non-transient verbs engaged
    const len_transient = ((this.transient_verb_engaged != null) && 1) || 0;
    return this.engaged_verbs.length > len_transient;
  }

  engage_transient_verb_if_needed(verb_id) {
    if ((this.engaged_verbs.length === 0) && !this.are_non_transient_verbs()) {
      this.engage_verb(verb_id, true);
    }
  }

  disengage_transient_verb_if_needed() {
    if (this.transient_verb_engaged) {
      this.disengage_verb(this.transient_verb_engaged);
      this.huviz.set_cursor_for_verbs(this.engaged_verbs);
      this.update_command();
    }
  }

  engage_verb(verb_id, transient) {
    if (transient) {
      this.transient_verb_engaged = verb_id;
      this.verb_control[verb_id].classed('transient', true);
    }
    const overrides = this.get_verbs_overridden_by(verb_id);
    this.verb_control[verb_id].classed('engaged',true);
    for (let vid of this.engaged_verbs) {
      if (overrides.includes(vid)) {
        this.disengage_verb(vid);
      }
    }
    if (!(this.engaged_verbs.includes(verb_id))) {
      this.engaged_verbs.push(verb_id);
    }
  }

  disengage_verb(verb_id, transient) {
    this.engaged_verbs = this.engaged_verbs.filter(verb => verb !== verb_id); // remove verb_id
    this.verb_control[verb_id].classed('engaged',false);
    if (verb_id === this.transient_verb_engaged) {
      this.transient_verb_engaged = false;
      this.verb_control[verb_id].classed('transient', false);
    }
  }

  build_verb_picker(id, label, alternatives) {
    const vbctl = alternatives.append('div').attr("class","verb");
    if (this.verb_descriptions[id]) {
      vbctl.attr("title", this.verb_descriptions[id]);
    }
    vbctl.attr("id", "verb-"+id);
    this.verb_control[id] = vbctl;
    vbctl.text(label);
    const that = this;
    vbctl.on('click', () => {
      this.handle_on_verb_clicked(id, vbctl);
    });
    vbctl.on('mouseenter', function() { // tell user what will happen if this verb is clicked
      const elem = d3.select(this);
      const click_would_engage = !elem.classed('engaged');
      let because = {};
      if (click_would_engage) {
        that.proposed_verb = id; // not proposed_verbs because there can be at most one
        because = {proposed_verb: id};
        //cleanup: that.disengage_all_verbs
      } else { // clicking would disengage the verb
        that.proposed_verb = null; // TODO figure out whether and how to show user
      }
      // After the click there will be engaged verbs if click_would_engage
      // or there are more than one engaged_verbs.
      //click_would_leave_a_verb_phrase = click_would_engage or that.engaged_verbs.length > 1
      that.update_command(because);
    });
    vbctl.on('mouseleave', function() {
      const elem = d3.select(this);
      const leaving_verb_id = elem.classed('engaged');
      const because =
        {verb_leaving: leaving_verb_id};
      that.proposed_verb = null;
      that.update_command(because);
    });
  }

  handle_on_verb_clicked(id, elem) {
    this.start_working();
    setTimeout(() => { // run asynchronously so @start_working() can get a head start
      this.on_verb_clicked(id, elem);
    });
  }

  on_verb_clicked(id, elem) {
    let because;
    const newstate = !elem.classed('engaged');
    elem.classed('engaged',newstate);
    if (newstate) {
      this.engage_verb(id);
      if (id === "walk") {
         this.taxon_picker.shield();
         this.set_picker.shield();
       }
      this.proposed_verb = null; // there should be no proposed_verb if we are clicking engaging one
      because = {
        verb_added: id,
        cleanup: this.disengage_all_verbs
      };
    } else {
      if (id === "walk") {
        this.taxon_picker.unshield();
        this.set_picker.unshield();
      }
      this.disengage_verb(id);
    }
    if ((this.engaged_verbs == null) || (this.engaged_verbs.length === 0)) {
      this.huviz.set_cursor_for_verbs([]);
    }
    this.update_command(because);
  }

  run_script(script) {
    // We recognize a couple of different visible "space-illustrating characters" as spaces.
    //   https://en.wikipedia.org/wiki/Whitespace_character
    //     U+237D  ⍽ SHOULDERED OPEN BOX
    //     U+2420  ␠  SYMBOL FOR SPACE
    // The purpose of recognizing these as spaces is to make the scripts using them
    // more readable in a URL, especially in a FormURLa.
    script = script.replace(/[\u237D\u2420]/g," ");
    this.huviz.gclc.run(script);
    this.huviz.update_all_counts();
  }
  build_set_picker(label, where) {
    // FIXME populate @the_sets from @huviz.selectable_sets
    where = ((label != null) && this.control_label(label, where)) || this.comdiv;
    this.the_sets = { // TODO build this automatically from huviz.selectable_sets
      'all_set': [this.huviz.all_set.label, {
              chosen_set: [this.huviz.chosen_set.label],
              discarded_set: [this.huviz.discarded_set.label],
              graphed_set: [this.huviz.graphed_set.label],
              hidden_set: [this.huviz.hidden_set.label],
              labelled_set: [this.huviz.labelled_set.label],
              matched_set: [this.huviz.matched_set.label],
              nameless_set: [this.huviz.nameless_set.label],
              pinned_set: [this.huviz.pinned_set.label],
              selected_set: [this.huviz.selected_set.label],
              shelved_set: [this.huviz.shelved_set.label],
              suppressed_set: [this.huviz.suppressed_set.label],
              walked_set: [this.huviz.walked_set.label]
            }
              ]
    };
    this.set_picker_box = where.append('div')
        .classed('container',true)
        .attr('id', 'sets');
    this.set_picker = new TreePicker(
      this.set_picker_box, 'all', ['treepicker-vertical']);
    this.set_picker.click_listener = this.handle_on_set_picked;
    this.set_picker.show_tree(this.the_sets, this.set_picker_box);
    this.populate_all_set_docs();
    this.make_sets_proposable();
    where.classed("set_picker_box_parent",true);
    return where;
  }
  populate_all_set_docs() {
    for (let id in this.huviz.selectable_sets) {
      const a_set = this.huviz.selectable_sets[id];
      if (a_set.docs != null) {
        this.set_picker.set_title(id, a_set.docs);
      }
    }
  }
  make_sets_proposable() {
    const make_listeners = (id, a_set) => { // fat arrow carries this to @
      const set_ctl = this.set_picker.id_to_elem[id];
      set_ctl.on('mouseenter', () => {
        this.proposed_set = a_set;
        return this.update_command();
      });
      return set_ctl.on('mouseleave', () => {
        this.proposed_set = null;
        return this.update_command();
      });
    };
    for (let id in this.huviz.selectable_sets) {
      const a_set = this.huviz.selectable_sets[id];
      make_listeners(id, a_set);
    }
  }
  handle_on_set_picked(set_id, new_state) {
    this.start_working();
    setTimeout(() => { // run asynchronously so @start_working() can get a head start
      this.on_set_picked(set_id, new_state);
    });
  }
  on_set_picked(set_id, new_state) {
    let cmd;
    this.clear_set_picker(); // TODO consider in relation to liking_all_mode
    this.set_picker.set_direct_state(set_id, new_state);
    let because = {};
    const hasVerbs = !!this.engaged_verbs.length;
    if (new_state === 'showing') {
      this.taxon_picker.shield();
      this.chosen_set = this.huviz[set_id];
      this.chosen_set_id = set_id;
      because = {
        set_added: set_id,
        cleanup: this.disengage_all_sets // the method to call to clear
      };
      if (hasVerbs) {
        cmd = new GraphCommand(this.huviz, {
            verbs: this.engaged_verbs, // ['select']
            sets: [this.chosen_set.id]
          });
      }
    } else if (new_state === 'unshowing') {
      this.taxon_picker.unshield();
      const XXXcmd = new GraphCommand(this.huviz, {
          verbs: ['unselect'],
          sets: [this.chosen_set.id]
        });
      this.disengage_all_sets();
    }
    if (cmd != null) {
      this.huviz.run_command(
        cmd, this.make_run_transient_and_cleanup_callback(because));
      because = {};
    }
    this.update_command();
  }

  disengage_all_sets() {
    // TODO harmonize disengage_all_sets() and clear_all_sets() or document difference
    if (this.chosen_set_id) {
      this.on_set_picked(this.chosen_set_id, "unshowing");
      delete this.chosen_set_id;
      delete this.chosen_set;
    }
  }
  clear_all_sets() {
    const skip_sets = ['shelved_set'];
    for (let set_key in this.the_sets.all_set[1]) {
      const set_label = this.the_sets.all_set[1][set_key];
      if (skip_sets.includes(set_key)) {
        continue;
      }
      const the_set = this.huviz[set_key];
      const {
        cleanup_verb
      } = the_set;
      const cmd = new GraphCommand(this.huviz, {
        verbs: [cleanup_verb],
        sets: [the_set.id]
      });
      this.huviz.run_command(cmd);
    }
  }
  on_set_count_update(set_id, count) {
    this.set_picker.set_payload(set_id, count);
  }
  on_taxon_count_update(taxon_id, count) {
    this.taxon_picker.set_payload(taxon_id, count);
  }
  on_predicate_count_update(pred_lid, count) {
    this.predicate_picker.set_payload(pred_lid, count);
  }
  clear_set_picker() {
    if (this.chosen_set_id != null) {
      this.set_picker.set_direct_state(this.chosen_set_id, 'unshowing');
      delete this.chosen_set_id;
    }
  }
}
CommandController.initClass();

//import {GreenTurtle} from 'vendor/green_turtle.js'; // TODO convert to module
var GreenerTurtle = function(){
  var verbosity = false;
  var obj_has_type = function(obj, typ) {
    return obj.type === typ;
  };
  var RDF_object = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object';
  var build_indices = function(graph){
    console.log('BUILD INDICES');
    //console.log("SUBJ",graph.subjects);
    for (var subj_id in graph.subjects){
      var subj = graph.subjects[subj_id];
      //console.log('  s =',subj,subj.predicates);
      for (var p in subj.predicates){
	var predicate = subj.predicates[p];
        //console.log('    p =',predicate.objects.length,p);
        var oi;
	for (oi = 0; oi < predicate.objects.length; oi++){
	  var obj = predicate.objects[oi];
	  //console.log(obj);
	  if (obj && obj_has_type(obj,RDF_object)){
	    if (typeof graph.oid_2_id_p[obj.value] == 'undefined'){
	      graph.oid_2_id_p[obj.value] = [];
	    }
	    if (obj.value == '_:E' && verbosity){
	      console.log(obj.value,'----> [',subj.id,p,']');
	    }
	    graph.oid_2_id_p[obj.value].push([subj.id,p]);
	  }
	}
      }
    };
  };
  var get_incoming_predicates = function(subj){
    var resp =  this.oid_2_id_p[subj.id] || [];
    //console.log("get_incoming_predicates(",subj.id,")  ===>",resp);
    return resp;
  };
  var count_subjects = function(graph){
    graph.num_subj = 0;
    for (var s in graph.subjects){
      graph.num_subj++;
    }
  };
  return {
    parse: function(data,type){
      var G = GreenTurtle.implementation.parse(data,type);
      if (! G.oid_2_id_p) G.oid_2_id_p = {};
      build_indices(G);
      count_subjects(G);
      G.get_incoming_predicates = get_incoming_predicates;
      return G;
    }
  };
};

"use strict";

/*
MultiString
  purpose:
     Provide an object that can be used in place of a string, in that
     it returns a string value, but actually stores multiple per-language
     versions of the string and can be reconfigured as to which different
     language version gets returned.
  see:
     https://stackoverflow.com/a/28188150/1234699
  features:
    Expects langpath values which are colon-delimted lists of 2-letter
    language codes.  The final value in the list can instead be the
    word ANY, a wildcard meaning that every language not yet represented
    in the language path would be respected too.

    Note that MultiStrings can also have 'NOLANG' values, that is, values
    with no associated language.  These are always on the priority list,
    but at the end, even after ANY is respected.

    If one wants to make referencde to the "NOLANG" value, one can
    do so explicitly with the term NOLANG in the langpath.

  examples:
    "en"
      means that if an English value has been provided it will be
      respected and that if there is a NOLANG value it will be shown
      otherwise.  On no account will values in other languages be shown.

    "en:fr"
      If a MultiString instance has an English value it will be shown,
      otherwise if a French value is available it will be shown, failing
      that if a NOLANG value is present, it will be shown.

    "en:ANY"
      If a MultiString instance has an English value it will be shown,
      otherwise if value tagged with any other lanugage is available
      it will be shown (in no particular order) and finally if a
      "NOLANG" value is present, it will be shown.

    "en:NOLANG:ANY"
      Show English if available, or the NOLANG value or a value from
      ANY other language if present -- in that priority order.
*/

function MultiString() {
  var i;
  if (arguments.length == 0) {
    this.set_val_lang();
  } else {
    i = -1;
    while (typeof(arguments[i+=1]) != 'undefined') { // an empty string is a legal name
      // process value/lang pairs
      this.set_val_lang(arguments[i] || '', arguments[i+=1]);
    }
  }
  Object.defineProperty(
    this, 'length',
    {get: function () { return (this.valueOf()||'').length; }});
};

// inherit all properties from native class String
MultiString.prototype = Object.create(String.prototype);

MultiString.prototype.set_val_lang = function(value, lang) {
  //  set a value/lang pair where undefined lang sets NOLANG value
  if (lang) {
    this[lang] = value;
  } else {
    this.NOLANG = value || '';
  }
};

MultiString.langs_in_path = []; // default value
MultiString.prototype.set_lang_val = function(lang, value) {
  this.set_val_lang(value, lang);
};

MultiString.prototype.get_ANY_but_langs_in_path = function() {
  var langs_in_path = MultiString.langs_in_path;
  for (var key in this) {
    if (this.hasOwnProperty(key)) {
      if (langs_in_path.indexOf(key) == -1) {
        return this[key];
      }
    }
  };
};

MultiString.prototype.get_ALL = function() {
  var retval = '';
  for (var key in this) {
    if (key.length == 2) {
      if (retval) {
        retval += ', ';
      }
      retval += '"' + this[key] + '"@' + key;
    } else if (key == 'NOLANG') {
      if (retval) {
        retval += ', ';
      }
      retval += '"' + this[key] + '"';
    }
  };
  return retval;
};

const LANGCODE_RE = /^[a-z]{2}$/;

MultiString.set_langpath = function(langpath){
  var langs = [],
      parts = [],
      langs_in_path = [],
      nolang_used = false;
  if (langpath) {
    parts = langpath.split(':');
    parts.forEach(function(p,idx){
      if (p.match(LANGCODE_RE)) {
        langs.push(p);
        langs_in_path.push(p);
      } else if (p == 'NOLANG') {
        nolang_used = true;
        langs.push(p);
      } else if (p == 'ANY') {
        langs.push("get_ANY_but_langs_in_path()");
      } else if (p == 'ALL') {
        langs.push("get_ALL()");
      } else {
        throw new Error("<" + p + "> is not a legal term in LANGPATH");
      }
    });
  }
  MultiString.langs_in_path = langs_in_path;
  var body = "return";
  if (langs.length) {
    body += " this."+langs.join(' || this.');
    body += " || ";
  }
  body += "''";
  // Compile a new function which follows the langpath for the value
  // so String.prototype methods can get to the value
  MultiString.prototype.toString =
    MultiString.prototype.valueOf =
    new Function(body);
};

MultiString.set_langpath('ANY:NOLANG'); // set the default langpath

// Extend class with a trivial method
MultiString.prototype.behead = function(){
  return this.substr(1);
};
/*
if (typeof module !== 'undefined' && module.exports) {
  module.exports.MultiString = MultiString;
}
*/

class Node {
  static initClass() {
    this.prototype.linked = false; // TODO(smurp) probably vestigal
    this.prototype.showing_links = "none";
    this.prototype.name = null;
    this.prototype.s = null; // TODO(smurp) .s to .subject, should be optional
    this.prototype.type = null;
  }
  constructor(id) {
    this.id = id;
    this.bub_txt = [];
    this.links_from = [];
    this.links_to = [];
    this.links_shown = [];
    this.lid = uniquer(this.id);
  }
  set_name(name) {
    this.name = name;
  }
  set_subject(s) {
    this.s = s;
  }
  point(point) {
    if (point != null) {
      this.x = point[0];
      this.y = point[1];
    }
    return [this.x,this.y];
  }
  prev_point(point) {
    if (point != null) {
      this.px = point[0];
      this.py = point[1];
    }
    return [this.px,this.py];
  }
  select() {
    let edge;
    for (edge of this.links_from) {
      edge.select();
    }
    for (edge of this.links_to) {
      edge.select();
    }
    this.taxon.update_state(this, 'select');
  }
  unselect() {
    let edge;
    for (edge of this.links_from) {
      edge.unselect();
    }
    for (edge of this.links_to) {
      edge.unselect();
    }
    this.taxon.update_state(this, 'unselect');
  }
  discard() {
    // should we unselect first if node.state is selected?
    this.taxon.update_state(this, 'discard');
  }
}
Node.initClass();
// export {Node} // TODO convert to module

"use strict";

function OnceRunner(verbosity, name) {
  this.verbosity = verbosity || 0;
  this.profileName = (name || 'OnceRunner') + '_' + (new Date()).toISOString();
  this.active = false;
};

OnceRunner.prototype.setTimeout = function(cb, msec) {
  //console.log(`afterMsec_call(${msec}) typeof cb ==>`,typeof cb);
  if (! this.firstCallTime) { // when a new string of calls begins
    this.firstCallTime = Date.now();
    this.active = true;
    this.stats = {};
    if (this.verbosity > 39) {
      console.profile(this.profileName);
    }
    this.clearCount = 0; // the number of times execution has been delayed
  }
  if (this.timeoutID) {
    if (this.verbosity > 29) {
      console.warn("clearTimeout()", this.timeoutID._idleStart || this.timeoutID);
    }
    clearTimeout(this.timeoutID);
    this.clearCount++;
  }
  //cb = function() {console.log("mockFunc() called")};
  return this.timeoutID = setTimeout(this.makeWrapper(cb), msec);
};

OnceRunner.prototype.makeWrapper = function(callback) {
  var self = this;
  return function() {
    var stats = "";
    if (self.verbosity > 19) {
      console.warn("calling callback ",self.timeoutID._idleStart || self.timeoutID);
    }
    var callbackExecutionStart = Date.now();
    callback();
    self.active = false;
    var callbackExecutionEnd = Date.now();
    var callbackExecutionDurationMsec = callbackExecutionEnd - callbackExecutionStart;
    var overallExecutionDurationMsec = callbackExecutionEnd - self.firstCallTime;
    var timeSavedMsec = callbackExecutionDurationMsec * self.clearCount;
    var wouldaBeenDurationMsec = overallExecutionDurationMsec + timeSavedMsec;
    var timeSavedRatio = timeSavedMsec / wouldaBeenDurationMsec;
    self.stats.timeSavedRatio = timeSavedRatio;
    self.stats.timeSavedSec = timeSavedMsec/1000;
    self.stats.wouldaBeenSec = wouldaBeenDurationMsec / 1000;
    self.stats.profileName = self.profileName;
    if (self.verbosity > 9) {
      console.warn("OnceRunner() stats", self.stats);
    }
    if (self.verbosity > 39) {
      console.profileEnd();
    }
    self.firstCallTime = null; // an execution has happened so reset
  };
};

/*
TreeCtrl controls TreePicker states: showing, unshowing, mixed for direct and indirect.

 Elements may be in one of these states:
   mixed      - some instances of the node class are selected, but not all
   unshowing  - there are instances but none are selected
   showing    - there are instances and all are selected
   abstract   - there are no instances (but presumably there are subs)
   (empty)    - is empty a better name for taxon with no direct members?
                Perhaps 'empty' is a legal direct-state and 'abstract' is only
                sensible as an indirect-state? Do these distinctions make
                sense in both the Taxon context and the Predicate context?

 What about these theoretical states?
   hidden     - TBD: not sure when hidden is appropriate
                perhaps abstract predicate subtrees should be hidden
                ie "there is nothing interesting here, move along"
   emphasized - TBD: mark the class of the focused_node


 Are these states only meaningful in the MVC View context and not the
 Model context? -- where the model context is Taxon and/or Predicate
 while the View context is the TreePicker.  Likewise 'collapse' is
 concept related to the View.  OK so we have View verbs such as:
 * hide
 * emphasize
 * collapse
 * pick (click?)
 and Model verbs such as:
*/
class TreeCtrl {
  constructor(id) {
    this.id = id;
    this.state = 'empty';
    this.indirect_state = 'empty';
    this.subs = [];
    this.super_class = null;
    this.direct_stats = [0, 0];
    this.dirty = false;
  }
  get_state() {
    if ((this.state == null)) {
      alert(`${this.id} has no direct state`);
    }
    return this.state;
  }
  get_indirect_state() {
    if ((this.indirect_state == null)) {
      alert(`${this.id} has no indirect_state`);
    }
    return this.indirect_state;
  }
  register_superclass(super_class) {
    if (super_class === this) {
      return;
    }
    if (this.super_class != null) {
      this.super_class.remove_subclass(this);
    }
    this.super_class = super_class;
    this.super_class.register_subclass(this);
  }
  remove_subclass(sub_class) {
    const idx = this.subs.indexOf(sub_class);
    if (idx > -1) {
      this.subs.splice(idx, 1);
    }
  }
  register_subclass(sub_class) {
    this.subs.push(sub_class);
  }
  recalc_states() {
    this.direct_stats = this.recalc_direct_stats(); // eg [3, 60]
    this.indirect_stats = this.recalc_indirect_stats([0, 0]);
    this.state = this.recalc_direct_state();   // eg empty|unshowing|mixed|showing
    this.indirect_state = this.recalc_indirect_state(); // same as above
  }
  recalc_indirect_state() {
    //return @translate_stats_to_state @indirect_state
    if (this.subs.length === 0) {
      return this.state;      // eg 0/0
    }
    if (this.state === 'mixed') {
      return 'mixed';     // eg 3/6
    }
    let consensus = this.get_state(); // variable for legibility and performance
    for (let kid of this.subs) {
      const kid_ind_stt = kid.get_indirect_state();
      //  debugger
      if (kid_ind_stt !== consensus) {
        if (['empty', 'hidden'].includes(consensus)) {
          consensus = kid_ind_stt;
        } else if (!['empty', 'hidden'].includes(kid_ind_stt)) {
          return "mixed";
        }
      }
    }
    return consensus;
  }
  set_dirty() {
    this.dirty = true;
    if (this.super_class != null) {
      this.super_class.set_dirty();
    }
  }
  update_state(inst, change) {
    if (inst != null) {
      this.change_map[change].acquire(inst);
    }
    this.set_dirty();
  }
  clean_up_dirt() {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    // FIXME fold the subroutines into this method for a single pass
    // FIXME make use of the edge and change hints in the single pass
    // terminology:
    //   selected edge:  an edge (shown or not) to or from a node in the selected_set
    // roughly: all_shown, none_shown, mixed, hidden
    //   are all the selected edges shown?
    //   are none of the selected edges shown?
    //   are strictly some of the selected edges shown?
    //   are there no selected edges?
    const old_state = this.state;
    const old_indirect_state = this.indirect_state;

    for (let kid of this.subs) {
      kid.clean_up_dirt();
    }
    this.recalc_states();
    const updating_stats = true; // TODO make this settable by user
    if (updating_stats ||
        (old_state !== this.state) ||
        (old_indirect_state !== this.indirect_state)) {
      if (window.suspend_updates) {
        return;
      }
      const evt = new CustomEvent(this.custom_event_name, {
          detail: {
            target_id: this.lid,
            target: this,
            old_state,
            new_state: this.state,
            old_indirect_state,
            new_indirect_state: this.indirect_state,
            payload: this.get_payload_string(),
            collapsed_payload: this.get_collapsed_payload_string()
          },
          bubbles: true,
          cancelable: true
        }
      );
      window.dispatchEvent(evt);
    }
      //if @super_class?
      //  @super_class.fire_changeEvent_if_needed()
  }
  format_stats(stats) {
    return `${stats[0]}/${stats[1]}`;
  }
  translate_stats_to_state(stats) {
    if (stats[1] === 0) {
      return "empty";
    }
    if (stats[0] === 0) {
      return "unshowing";
    }
    if (stats[0] === stats[1]) {
      return "showing";
    }
    return "mixed";
  }
  recalc_direct_state() {
    return this.translate_stats_to_state(this.direct_stats);
  }
  get_payload_string() {
    return this.format_stats(this.direct_stats);
  }
  get_collapsed_payload_string() {
    return this.format_stats(this.indirect_stats);
  }
  recalc_indirect_stats(stats) {
    stats[0] += this.direct_stats[0];
    stats[1] += this.direct_stats[1];
    if (this.subs.length > 0) {
      for (let sub of this.subs) {
        sub.recalc_indirect_stats(stats);
      }
    }
    return stats;
  }
}

// export {TreeCtrl}; // TODO convert to module

class Predicate extends TreeCtrl {
  static initClass() {
    this.prototype.custom_event_name = 'changePredicate';
  }
  constructor(id) {
    super(id);
    this.lid = uniquer(this.id); // lid means local_id
    this.all_edges = SortedSet().sort_on("id").named("predicate");
    // TODO check for .acquire() bugs re isState('_s') vs isState('_p')
    // An Edge is either selected or unselected, so they are mutually exclusive.
    // Hence .isState("_p") is common and unique to them.
    this.selected_instances = SortedSet().sort_on("id").named("selected").isState('_p');
    this.unselected_instances = SortedSet().sort_on("id").named("unselected").isState('_p');
    // An Edge is either shown or unshown, they are mutually exclusive.
    // Hence .isState("_s") is common and unique to them.
    // shown edges are those which are shown and linked to a selected source or target
    this.shown_instances = SortedSet().sort_on("id").named("shown").isState("_s");
    // unshown edges are those which are unshown and linked to a selected source or target
    this.unshown_instances = SortedSet().sort_on("id").named("unshown").isState("_s");
    this.change_map = {
      unselect: this.unselected_instances,
      select: this.selected_instances,
      unshow: this.unshown_instances,
      show: this.shown_instances
    };
  }
  add_inst(inst) {
    this.all_edges.add(inst);
    this.update_state();
  }
  update_selected_instances() {
    const before_count = this.selected_instances.length;
    for (let e of this.all_edges) {  // FIXME why can @selected_instances not be trusted?
      if (e.an_end_is_selected()) {
        this.selected_instances.acquire(e);
      }
    }
  }
  update_state(inst, change) {
    this.update_selected_instances();
    super.update_state(inst, change);
  }
  recalc_direct_stats() {
    return [this.count_shown_selected(), this.selected_instances.length];
  }
  count_shown_selected() {
    let count = 0;
    for (let e of this.selected_instances) {
      if (e.shown != null) { count++; }
    }
    return count;
  }
}
Predicate.initClass();

// based on https://github.com/talis/rdfquads.js
function Quad(subject,pred,obj,graph) {
  this.s = new RdfUri(subject);
  this.p = new RdfUri(pred);
  this.o = new RdfObject(obj);
  this.g = new RdfUri(graph);
}
Quad.prototype.toString = function() {
  return '<' + this.s + '> <' + this.p + '> ' + this.o + ' <' + this.g + '> .\n'
};
Quad.prototype.toNQuadString = function() {
  return '<' + this.s + '> <' + this.p + '> ' + this.o + ' <' + this.g + '> .\n'
};


var uriRegex = /<([^>]*)>/ ;

function RdfUri(url) {
  self = this;
  var match = url.match(uriRegex);
  if (match) {
      self.raw = match[1];
  } else {
      self.raw = url;
  }
}
RdfUri.prototype.toString = function() {
  return this.raw;
};

function RdfObject(val) {
  self = this;
  var match = val.match(uriRegex);
  if (match) {
      self.raw = match[1];
      self.type = 'uri';
  } else {
      self.raw = val;
      self.type = 'literal';
  }
}
RdfObject.prototype.toString = function() {
  return this.raw;
};
RdfObject.prototype.isUri = function() {
  return this.type == 'uri';
};
RdfObject.prototype.isLiteral = function() {
  return this.type == 'literal';
};

var quadRegex = /\s*(<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>)\s*(".*"?|<[^>]*>|_:[A-Za-z][A-Za-z0-9]*)\s*(<[^>]*>).*\s*\.\s*\#*.*$/ ;
var isComment = /^\s*\/\// ;

function parseQuadLine(line) {
  if (line == null || line === "" || line.match(isComment)) {
    return null;
  } else {
    var match = line.match(quadRegex);
    if (match){
      var s = match[1].trim();
      var p = match[2].trim();
      var o = match[3].trim();
      var g = match[4].trim();
      return new Quad(s,p,o,g);
    }
  }
}

/*
 * These SettingsWidget classes used to be in src/huviz.js nee src/huviz.coffee
 */

class SettingsWidget {
  constructor(huviz, inputElem, state) {
    this.huviz = huviz;
    this.inputElem = inputElem;
    this.id = unique_id('widget_');
    this.inputJQElem = $(this.inputElem);
  }

  wrap(html) {
    $(this.inputElem).wrap(html);
  }
}

class UsernameWidget extends SettingsWidget {
  static initClass() {
    // https://fontawesome.com/v4.7.0/examples/#animated explains animations fa-spin (continuous) and fa-pulse (8-step)
    this.prototype.state_to_state_icon = {
      bad: 'fa-times', // the username has been tried and failed last use
      good: 'fa-check', // the username has been tried and succeeded last use
      untried: 'fa-question', // a username has been provided but not yet tried
      trying: 'fa-spinner fa-pulse', // performing a lookup with a username which might be bad or good
      empty: 'fa-ellipsis-h', // no username present
      looking: 'fa-map-marker-alt fa-spin' // performing a lookup with a known good username
    };
    this.prototype.state_to_color = {
      bad: 'red',
      good: 'green',
      untried: 'orange',
      trying: 'orange',
      empty: 'grey',
      looking: 'green'
    };
  }

  constructor() {
    super(...arguments);
    this.wrap(`<div id="${this.id}" class="geo_input_wrap"></div>`); //  style="border:2px solid; padding:2px
    //@inputElem.setAttribute('style','border:none')
    this.widgetJQElem = $('#'+this.id);
    this.widgetJQElem.prepend("<i class=\"userIcon fa fa-user-alt\"></i><i class=\"stateIcon fa fa-question\"></i>");
    this.stateIconJQElem = this.widgetJQElem.find('.stateIcon');
    this.userIconJQElem = this.widgetJQElem.find('.userIcon');
    this.set_state('empty');
  }

  set_state(state) {
    if (false && this.state && (this.state === state)) {
      console.log("not bothering to change the state to",state,"cause it already is");
      return;
    }
    this.state = state;
    console.info(this.constructor.name, "state:", state, 'username:', this.inputJQElem.val());
    const stateIcon = this.state_to_state_icon[state];
    this.stateIconJQElem.attr('class', "stateIcon fa " + stateIcon);
    const color = this.state_to_color[state];
    this.widgetJQElem.css('border-color',color);
    this.widgetJQElem.css('color',color);
  }
}
UsernameWidget.initClass();

class GeoUserNameWidget extends UsernameWidget {
  constructor() {
    super(...arguments);
    this.stateIconJQElem.on('click', this.huviz.show_geonames_instructions);
    this.userIconJQElem.on('click', this.huviz.show_geonames_instructions);
  }
}

const DEFAULT_SETTINGS = [
  {
    reset_settings_to_default: {
      text: "Reset Settings",
      label: {
        title: "Reset all settings to their defaults"
      },
      input: {
        type: "button",
        label: "Reset"
      }
    }
  }
  , {
    use_accordion_for_settings: {
      text: "show Settings in accordion",
      label: {
        title: "Show the Settings Groups as an 'Accordion'"
      },
      input: {
        //checked: "checked"
        type: "checkbox"
      }
    }
  }
  //style: "display:none"
  , {
    show_cosmetic_tabs: {
      text: "Show Cosmetic Tabs",
      label: {
        title: "Expose the merely informational tabs such as 'Intro' and 'Credits'"
      },
      input: {
        type: "checkbox",
        checked: "checked"
      }
    }
  }
  , {
    focused_mag: {
      group: "Labels",
      text: "focused label mag",
      input: {
        value: 1.8,
        min: 1,
        max: 6,
        step: .1,
        type: 'range'
      },
      label: {
        title: "the amount bigger than a normal label the currently focused one is"
      }
    }
  }
  , {
    selected_mag: {
      group: "Labels",
      text: "selected node mag",
      input: {
        value: 1.5,
        min: 0.5,
        max: 4,
        step: .1,
        type: 'range'
      },
      label: {
        title: "the amount bigger than a normal node the currently selected ones are"
      }
    }
  }
  , {
    label_em: {
      group: "Labels",
      text: "label size (em)",
      label: {
        title: "the size of the font"
      },
      input: {
        value: .7,
        min: .1,
        max: 6,
        step: .05,
        type: 'range'
      }
    }
  }
  , {
    //snippet_body_em:
    //  text: "snippet body (em)"
    //  label:
    //    title: "the size of the snippet text"
    //  input:
    //    value: .7
    //    min: .2
    //    max: 4
    //    step: .1
    //    type: "range"
  //,
    charge: {
      group: "Layout",
      text: "charge (-)",
      label: {
        title: "the repulsive charge betweeen nodes"
      },
      input: {
        value: -560,
        min: -600,
        max: -1,
        step: 1,
        type: "range"
      }
    }
  }
  , {
    gravity: {
      group: "Layout",
      text: "gravity",
      class: "deprecated_feature",
      label: {
        title: "the attractive force keeping nodes centered"
      },
      input: {
        value: 0.1,
        min: 0,
        max: 1,
        step: 0.025,
        type: "range"
      }
    }
  }
  , {
    distanceMax: {
      group: "Layout",
      text: "distanceMax scaled",
      class: "alpha_feature",
      label: {
        title: "The maximum distance between nodes."
      },
      input: {
        value: .5,
        min: 0,
        max: 1,
        step: 0.025,
        type: "range"
      }
    }
  }
  , {
    shelf_radius: {
      group: "Sizing",
      text: "shelf radius",
      label: {
        title: "how big the shelf is"
      },
      input: {
        value: 0.8,
        min: 0.1,
        max: 3,
        step: 0.05,
        type: "range"
      }
    }
  }
  , {
    fisheye_zoom: {
      group: "Sizing",
      text: "fisheye zoom",
      label: {
        title: "how much magnification happens"
      },
      input: {
        value: 6.0,
        min: 1,
        max: 20,
        step: 0.2,
        type: "range"
      }
    }
  }
  , {
    fisheye_radius: {
      group: "Sizing",
      text: "fisheye radius",
      label: {
        title: "how big the fisheye is"
      },
      input: {
        value: 300,
        min: 0,
        max: 2000,
        step: 20,
        type: "range"
      }
    }
  }
  , {
    node_radius: {
      group: "Sizing",
      text: "node radius",
      label: {
        title: "how fat the nodes are"
      },
      input: {
        value: 3,
        min: 0.5,
        max: 50,
        step: 0.1,
        type: "range"
      }
    }
  }
  , {
    node_diff: {
      group: "Sizing",
      text: "node differentiation",
      label: {
        title: "size variance for node edge count"
      },
      input: {
        value: 1,
        min: 0,
        max: 10,
        step: 0.1,
        type: "range"
      }
    }
  }
  , {
    focus_threshold: {
      group: "Sizing",
      text: "focus threshold",
      label: {
        title: "how fine is node recognition"
      },
      input: {
        value: 20,
        min: 10,
        max: 150,
        step: 1,
        type: "range"
      }
    }
  }
  , {
    link_distance: {
      group: "Layout",
      text: "link distance",
      label: {
        title: "how long the lines are"
      },
      input: {
        value: 109,
        min: 5,
        max: 500,
        step: 2,
        type: "range"
      }
    }
  }
  , {
    edge_width: {
      group: "Sizing",
      text: "line thickness",
      label: {
        title: "how thick the lines are"
      },
      input: {
        value: 0.2,
        min: 0.2,
        max: 10,
        step: .2,
        type: "range"
      }
    }
  }
  , {
    line_edge_weight: {
      group: "Sizing",
      text: "line edge weight",
      label: {
        title: "how much thicker lines become to indicate the number of snippets"
      },
      input: {
        value: 0.45,
        min: 0,
        max: 1,
        step: 0.01,
        type: "range"
      }
    }
  }
  , {
    swayfrac: {
      group: "Sizing",
      text: "sway fraction",
      label: {
        title: "how much curvature lines have"
      },
      input: {
        value: 0.22,
        min: -1.0,
        max: 1.0,
        step: 0.01,
        type: "range"
      }
    }
  }
  , {
    label_graphed: {
      group: "Labels",
      text: "label graphed nodes",
      label: {
        title: "whether graphed nodes are always labelled"
      },
      input: {
        //checked: "checked"
        type: "checkbox"
      }
    }
  }
  , {
    truncate_labels_to: {
      group: "Labels",
      text: "truncate and scroll",
      label: {
        title: "truncate and scroll labels longer than this, or zero to disable"
      },
      input: {
        value: 0, // 40
        min: 0,
        max: 60,
        step: 1,
        type: "range"
      }
    }
  }
  , {
    snippet_count_on_edge_labels: {
      group: "Labels",
      text: "snippet count on edge labels",
      label: {
        title: "whether edges have their snippet count shown as (#)"
      },
      input: {
        //checked: "checked"
        type: "checkbox"
      }
    }
  }
  , {
    nodes_pinnable: {
      style: "display:none",
      text: "nodes pinnable",
      label: {
        title: "whether repositioning already graphed nodes pins them at the new spot"
      },
      input: {
        checked: "checked",
        type: "checkbox"
      }
    }
  }
  , {
    use_fancy_cursor: {
      style: "display:none",
      text: "use fancy cursor",
      label: {
        title: "use custom cursor"
      },
      input: {
        checked: "checked",
        type: "checkbox"
      }
    }
  }
  , {
    doit_asap: {
      style: "display:none",
      text: "DoIt ASAP",
      label: {
        title: "execute commands as soon as they are complete"
      },
      input: {
        checked: "checked", // default to 'on'
        type: "checkbox"
      }
    }
  }
  , {
    show_dangerous_datasets: {
      style: "display:none",
      text: "Show dangerous datasets",
      label: {
        title: "Show the datasets which are too large or buggy"
      },
      input: {
        type: "checkbox"
      }
    }
  }
  , {
    display_labels_as: {
      group: "Labels",
      text: "Display Labels As...",
      label: {
        title: "Select type of graphed label display"
      },
      input: {
        type: "select"
      },
      options : [{
          label: "Words (classic)",
          value: "canvas"
        }
        , {
          label: "Words NG (beta)",
          value: "boxNGs noBoxes"
        }
        , {
          label: "Boxes (classic)",
          value: "pills"
        }
        , {
          label: "Boxes NG (beta)",
          value: "boxNGs",
          selected: true
        }
      ]
    }
  }
  , {
    theme_colors: {
      group: "Styling",
      text: "Display graph with dark theme",
      label: {
        title: "Show graph plotted on a black background"
      },
      input: {
        type: "checkbox"
      }
    }
  }
  , {
    paint_label_dropshadows: {
      group: "Styling",
      text: "Draw drop-shadows behind labels",
      label: {
        title: "Make labels more visible when overlapping"
      },
      input: {
        type: "checkbox",
        checked: "checked"
      }
    }
  }
  , {
    display_shelf_clockwise: {
      group: "Styling",
      text: "Display nodes clockwise",
      label: {
        title: "Display clockwise (uncheck for counter-clockwise)"
      },
      input: {
        type: "checkbox",
        checked: "checked"
      }
    }
  }
  , {
    choose_node_display_angle: {
      group: "Styling",
      text: "Node display angle",
      label: {
        title: "Where on shelf to place first node"
      },
      input: {
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.25,
        type: "range"
      }
    }
  }
  , {
    language_path: {
      group: "Ontological",
      text: "Language Path",
      label: {
        title: `Using ':' as separator and with ANY and NOLANG as possible values,
a list of the languages to expose, in order of preference.
Examples: "en:fr" means show English before French or nothing;
"ANY:en" means show any language before showing English;
"en:ANY:NOLANG" means show English if available, then any other
language, then finally labels in no declared language.\
`
      },
      input: {
        type: "text",
        // TODO tidy up -- use browser default language then English
        value: (window.navigator.language.substr(0,2) + ":en:ANY:NOLANG").replace("en:en:","en:"),
        size: "16",
        placeholder: "en:es:fr:de:ANY:NOLANG"
      }
    }
  }
  , {
    ontological_settings_preamble: {
      group: "Ontological",
      text: "Set before data ingestion...",
      label: {
        title: `The following settings must be adjusted before
data ingestion for them to take effect.`
      }
    }
  }
  , {
    show_class_instance_edges: {
      group: "Ontological",
      text: "Show class-instance relationships",
      label: {
        title: "display the class-instance relationship as an edge"
      },
      input: {
        type: "checkbox"
      }
    }
  }
        //checked: "checked"
  , {
    use_lid_as_node_name: {
      group: "Ontological",
      text: "Use local-id as node name",
      label: {
        title: "Use the local-id of a resource as its node name, permitting display of nodes nothing else is known about."
      },
      input: {
        type: "checkbox"
      }
    }
  }
        //checked: "checked"
  , {
    make_nodes_for_literals: {
      group: "Ontological",
      text: "Make nodes for literals",
      label: {
        title: "show literal values (dates, strings, numbers) as nodes"
      },
      input: {
        type: "checkbox",
        checked: "checked"
      },
      event_type: "change"
    }
  }
  , {
    group_literals_by_subj_and_pred: {
      group: "Ontological",
      text: "Group literals by subject & predicate",
      label: {
        title: `Group literals together as a single node when they have
a language indicated and they share a subject and predicate, on the
theory that they are different language versions of the same text.`
      },
      input: {
        type: "checkbox",
        checked: "checked"
      }
    }
  }
  , {
    color_nodes_as_pies: {
      group: "Ontological",
      text: "Color nodes as pies",
      label: {
        title: "Show all a node's types as colored pie pieces."
      },
      input: {
        type: "checkbox"
      }
    }
  }   //checked: "checked"
  , {
    suppress_annotation_edges: {
      group: "Annotation",
      class: "alpha_feature",
      text: "Suppress Annotation Edges",
      label: {
        title: `Do not show Open Annotation edges or nodes.
Summarize them as a hasAnnotation edge and enable the Annotation Inspector.`
      },
      input: {
        type: "checkbox"
      }
    }
  }
        //checked: "checked"
  , {
    show_hide_endpoint_loading: {
      style: "display:none",
      class: "alpha_feature",
      text: "Show SPARQL endpoint loading forms",
      label: {
        title: "Show SPARQL endpoint interface for querying for nodes"
      },
      input: {
        type: "checkbox"
      }
    }
  }
  , {
    graph_title_style: {
      group: "Captions",
      text: "Title display ",
      label: {
        title: "Select graph title style"
      },
      input: {
        type: "select"
      },
      options : [{
          label: "Watermark",
          value: "subliminal",
          selected: true
        }
        , {
          label: "Bold Titles 1",
          value: "bold1"
        }
        , {
          label: "Bold Titles 2",
          value: "bold2"
        }
        , {
          label: "Custom Captions",
          value: "custom"
        }
      ]
    }
  }
  , {
    graph_custom_main_title: {
      group: "Captions",
      style: "display:none",
      text: "Custom Title",
      label: {
        title: "Title that appears on the graph background"
      },
      input: {
        type: "text",
        size: "16",
        placeholder: "Enter Title"
      }
    }
  }
  , {
    graph_custom_sub_title: {
      group: "Captions",
      style: "display:none",
      text: "Custom Sub-title",
      label: {
        title: "Sub-title that appears below main title"
      },
      input: {
        type: "text",
        size: "16",
        placeholder: "Enter Sub-title"
      }
    }
  }
  , {
    discover_geonames_as: {
      group: "Geonames",
      html_text: '<a href="http://www.geonames.org/login" target="geonamesAcct">Username</a> ',
      label: {
        title: "The GeoNames Username to look up geonames as"
      },
      input: {
        jsWidgetClass: GeoUserNameWidget,
        type: "text",
        value: "huviz",  // "smurp_nooron"
        size: "14",
        placeholder: "e.g. huviz"
      }
    }
  }
  , {
    discover_geonames_remaining: {
      group: "Geonames",
      text: 'GeoNames Limit ',
      label: {
        title: `The number of Remaining Geonames to look up.
If zero before loading, then lookup is suppressed.`
      },
      input: {
        type: "integer",
        value: 20,
        size: 6
      }
    }
  }
  , {
    discover_geonames_greedily: {
      group: "Geonames",
      text: "Capture GeoNames Greedily",
      label: {
        title: "Capture not just names but populations too."
      },
      input: {
        type: "checkbox"
      }
    }
  }
        //checked: "checked"
  , {
    discover_geonames_deeply: {
      group: "Geonames",
      text: "Capture GeoNames Deeply",
      label: {
        title: "Capture not just directly referenced but also the containing geographical places from GeoNames."
      },
      input: {
        type: "checkbox"
      }
    }
  }
        //checked: "checked"
  , {
    show_edge_labels_adjacent_to_labelled_nodes: {
      group: "Labels",
      text: "Show adjacent edge labels",
      label: {
        title: "Show edge labels adjacent to labelled nodes"
      },
      input: {
        type: "checkbox"
      }
    }
  }
        //checked: "checked"
  , {
    show_edges: {
      class: "alpha_feature",
      text: "Show Edges",
      label: {
        title: "Do draw edges"
      },
      input: {
        type: "checkbox",
        checked: "checked"
      }
    }
  }
  , {
    center_the_distinguished_node: {
      class: "alpha_feature",
      text: "Center the distinguished node",
      label: {
        title: "Center the most interesting node"
      },
      input: {
        type: "checkbox",
        checked: "checked"
      }
    }
  }
  , {
    arrows_chosen: {
      class: "alpha_feature",
      text: "Arrowheads on Edges",
      label: {
        title: "Displays directional arrowheads on the 'object' end of lines."
      },
      input: {
        type: "checkbox",
        checked: "checked"
      }
    }
  }
  , {
    show_images_in_nodes: {
      group: "Images",
      class: "alpha_feature",
      text: "Show Images in Nodes",
      label: {
        title: "Show dbpedia:thumbnail and foaf:thumbnail in nodes when available"
      },
      input: {
        type: "checkbox",
        checked: "checked"
      }
    }
  }
  , {
    show_thumbs_dont_graph: {
      group: "Images",
      class: "alpha_feature",
      text: "Show thumbnails, don't graph",
      label: {
        title: "Treat dbpedia:thumbnail and foaf:thumbnail as images, not graph data"
      },
      input: {
        type: "checkbox",
        checked: "checked"
      }
    }
  }
  , {
    start_with_search_node: {
      group: "SPARQL",
      class: "alpha_feature",
      text: "Start With Search Node",
      style: "display:none",
      label: {
        title: "Show a search field node as starting UX"
      },
      input: {
        type: "checkbox"
      }
    }
  }
        //checked: "checked"
  , {
    show_queries_tab: {
      group: "SPARQL",
      class: "alpha_feature",
      text: "Show Queries Tab",
      label: {
        title: "Expose the 'Queries' tab to be able to monitor and debug SPARQL queries"
      },
      input: {
        type: "checkbox"
      }
    }
  }
        //checked: "checked"
  , {
    max_outstanding_sparql_requests: {
      group: "SPARQL",
      class: "alpha_feature",
      text: "Max. Outstanding Requests",
      label: {
        title: "Cap on the number of simultaneous SPARQL requests"
      },
      input: {
        value: 20,
        min: 1,
        max: 100,
        step: 1,
        type: "range"
      }
    }
  }
  , {
    sparql_timeout: {
      group: "SPARQL",
      class: "alpha_feature",
      text: "Query timeout",
      label: {
        title: "Number of seconds to run SPARQL queries before giving up."
      },
      input: {
        value: 45,
        min: 1,
        max: 90,
        step: 1,
        type: "range"
      }
    }
  }
  , {
    sparql_query_default_limit: {
      group: "SPARQL",
      class: "alpha_feature",
      text: "Default Node Limit",
      label: {
        title: "Default value for the 'Node Limit'"
      },
      input: {
        value: 200,
        min: 1,
        max: 1000,
        step: 10,
        type: "range"
      }
    }
  }
  , {
    combine_command_history: {
      group: "Debugging",
      class: "alpha_feature",
      text: "Put history on command tab",
      label: {
	title: "Combine the history tab with the command tab"
      },
      input: {
	type: "checkbox"
	, checked: "checked"
      }
    }
  }
  , {
    debug_shelf_angles_and_flipping: {
      group: "Debugging",
      class: "alpha_feature",
      text: "debug shelf angles and flipping",
      label: {
        title: "show angles and flags with labels"
      },
      input: {
        type: "checkbox"
        //, checked: "checked"
      }
    }
  }
  , {
    show_performance_monitor: {
      group: "Debugging",
      class: "alpha_feature",
      text: "Show Performance Monitor",
      label: {
        title: "Feedback on what HuViz is doing"
      },
      input: {
        type: "checkbox"
      }
    }
  }
  , {
    slow_it_down: {
      group: "Debugging",
      class: "alpha_feature",
      text: "Slow it down (sec)",
      label: {
        title: "execute commands with wait states to simulate long operations"
      },
      input: {
        value: 0,
        min: 0,
        max: 10,
        step: 0.1,
        type: "range"
      }
    }
  }
  , {
    show_hunt_verb: {
      group: "Debugging",
      class: "alpha_feature",
      text: "Show Hunt verb",
      label: {
        title: "Expose the 'Hunt' verb, for demonstration of SortedSet.binary_search()"
      },
      input: {
        type: "checkbox"
      }
    }
  }
  , {
    display_loading_notice: {
      group: "Debugging",
      class: "alpha_feature",
      text: "Display Loading Notice",
      label: {
        title: "Display the loading_notice after the user presses LOAD"
      },
      input: {
        type: "checkbox",
        checked: "checked"
      }
    }
  } // this should be OFF by default until it is pretty
];

class Taxon extends TreeCtrl {
  static initClass() {
    // as Predicate is to Edge, Taxon is to Node, ie: type or class or whatever
    // Taxon actually contains Nodes directly, unlike TaxonAbstract (what a doof!)
    this.prototype.suspend_updates = false;
    this.prototype.custom_event_name = 'changeTaxon';
  }
  constructor(id, lid) {
    super(id);
    this.lid = lid || id; // FIXME @lid should be local @id should be uri, no?
    // FIXME try again to conver Taxon into a subclass of SortedSet
    //   Motivations
    //     1) remove redundancy of .register() and .add()
    //   Problems encountered:
    //     1) SortedSet is itself not really a proper subclass of Array.
    //        Isn't each instance directly adorned with methods like isState?
    //     2) Remember that d3 might need real Array instances for nodes, etc
    this.instances = SortedSet().named(this.id).isState('_isa').sort_on("id"); // FIXME state?
    // _tp is for 'taxon-pickedness' and has value selected, unselected or discarded
    //   (should probably be _ts for 'taxon-state'
    this.discarded_instances = SortedSet().named('discarded').isState('_tp').sort_on("id");
    this.selected_instances = SortedSet().named('selected').isState('_tp').sort_on("id");
    this.unselected_instances = SortedSet().named('unselected').isState('_tp').sort_on("id");
    this.change_map = {
      discard: this.discarded_instances,
      select: this.selected_instances,
      unselect: this.unselected_instances
    };
  }
  get_instances(hier) {
    if (hier) {
      let inst;
      const retval = [];
      for (inst of this.get_instances(false)) {
        retval.push(inst);
      }
      for (let sub of this.subs) {
        for (inst of sub.get_instances(true)) {
          retval.push(inst);
        }
      }
      return;
    } else {
      return this.instances;
    }
  }
  register(node) {
    // Slightly redundant given that @add makes a bidirectional link too
    // but the .taxon on node gives it access to the methods on the taxon.
    // Perhaps taxon should be a super of SortedSet rather than a facade.
    // Should Taxon delegate to SortedSet?
    if (node.taxons == null) { node.taxons = []; }
    node.taxons.push(this);
    node.taxon = this;
    this.acquire(node);
  }
  acquire(node) {
    this.instances.acquire(node);
  }
  recalc_direct_stats() {
    return [this.selected_instances.length, this.instances.length];
  }
  recalc_english(in_and_out) {
    if (this.indirect_state === 'showing') {
      let phrase = this.lid;
      if (this.subs.length > 0) {
        phrase = "every " + phrase;
      }
      in_and_out.include.push(phrase);
    } else {
      if (this.indirect_state === 'mixed') {
        if (this.state === 'showing') {
          in_and_out.include.push(this.lid);
        }
        if (this.state === 'mixed') {
          let n;
          if (this.selected_instances.length < this.unselected_instances.length) {
            for (n of this.selected_instances) {
              in_and_out.include.push(n.lid);
            }
          } else {
            in_and_out.include.push(this.id);
            for (n of this.unselected_instances) {
              in_and_out.exclude.push(n.lid);
            }
          }
        }
        for (let sub of this.subs) {
          sub.recalc_english(in_and_out);
        }
      }
    }
  }
  update_english() {
    if (this.id !== "Thing") {
      console.error(`update_english(${this.lid}) should only be called on Thing`);
    }
    const in_and_out = {
      include: [],
      exclude: []
    };
    this.recalc_english(in_and_out);
    const evt = new CustomEvent('changeEnglish', {
      detail: {
        english: this.english_from(in_and_out)
      },
      bubbles: true,
      cancelable: true
    }
    );
    window.dispatchEvent(evt);
  }
  english_from(in_and_out) {
    let english = angliciser(in_and_out.include);
    if (in_and_out.exclude.length) {
      english += " except " + angliciser(in_and_out.exclude, " or ");
    }
    return english;
  }
}
Taxon.initClass();

// export {Taxon}; // TODO convert to module

// Usage:
//   txtcrsr = new TextCursor(".graph_control input", "click input for fun")
class TextCursor {
  static initClass() {
    this.prototype.fontFillStyle = "black";
    this.prototype.bgFillStyle = "Yellow";
    this.prototype.bgGlobalAlpha = 0.6;
    this.prototype.borderStrokeStyle = "black";
    this.prototype.face = "sans-serif";
    this.prototype.width = 128;
    this.prototype.height = 32;
    this.prototype.scale = .3;
    this.prototype.pointer_height = 6;
  }
  constructor(elem, text) {
    this.elem = elem;
    this.cache = {};
    this.set_text(text);
    this.paused = false;
    this.last_text = "";
  }
  font_height() {
    return this.height * this.scale;
  }
  set_text(text, temp, bgcolor) {
    let cursor;
    this.bgFillStyle = bgcolor ? bgcolor : "yellow";
    if (text) {
      if ((this.cache[text] == null)) {
        this.cache[text] = this.make_img(text);
      }
      const url = this.cache[text];
      cursor = `url(${url}) ${this.pointer_height} 0, default`;
    } else {
      cursor = "default";
    }
    if ((temp == null)) {
      this.last_text = text;
    }
    if (!this.paused) {
      this.set_cursor(cursor);
    }
  }
  pause(cursor, text) {
    this.paused = false; // so @set_cursor will run if set_text called
    if (text != null) {
      this.set_text(text, true);
    } else {
      this.set_cursor(cursor);
    }
    this.paused = true;
  }
  continue() {
    this.paused = false;
    this.set_text(this.last_text);
  }
  set_cursor(cursor) {
    $(this.elem).css("cursor", cursor);
  }
  make_img(text) {
    // TODO make a speech bubble sort of thing of low opacity but text of high
    //    http://stackoverflow.com/a/8001254/1234699
    //    http://www.scriptol.com/html5/canvas/speech-bubble.php
    let i, line, voffset;
    const id = "temp_TextCursor_canvas";
    const sel = `#${id}`;
    $('<canvas>', {id}).appendTo("body");
    this.canvas = $(sel)[0];
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.clearRect(0, 0, this.width, this.height);
    const inset = 3;
    const top = 10;

    this.ctx.translate(0, this.font_height());
    this.ctx.fillStyle = this.fontFillStyle;
    this.ctx.font = `${this.font_height()}px ${this.face}`;
    this.ctx.textAlign = 'left';
    const lines = text.split("\n");
    let max_width = 0;
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (line) {
        voffset = (this.font_height() * i) + top;
        max_width = Math.max(this.ctx.measureText(line).width, max_width);
      }
    }
    const height = (this.font_height() * lines.length) + inset;
    this.draw_bubble(inset, top,
                 max_width + (inset * 4), height,
                 this.pointer_height, this.font_height()/2);
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (line) {
        voffset = (this.font_height() * i) + top;
        this.ctx.fillText(line, top, voffset);
      }
    }
    const url = this.canvas.toDataURL("image/png");
    const cursor = `url(${url}), help`;
    $(this.canvas).remove();
    return url;
  }
  draw_bubble(x, y, w, h, pointer_height, radius) {
    /*
    http://www.scriptol.com/html5/canvas/speech-bubble.php
    */
    const r = x + w;
    const b = y + h;
    this.ctx.save();
    this.ctx.translate(0, this.font_height() * -1);
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + (radius / 2), y - pointer_height);
    this.ctx.lineTo(x + (radius * 2), y);
    this.ctx.lineTo(r - radius, y);
    this.ctx.quadraticCurveTo(r, y, r, y + radius);
    this.ctx.lineTo(r, (y + h) - radius);
    this.ctx.quadraticCurveTo(r, b, r - radius, b);
    this.ctx.lineTo(x + radius, b);
    this.ctx.quadraticCurveTo(x, b, x, b - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    if (this.bgGlobalAlpha != null) {
      this.ctx.save();
      this.ctx.globalAlpha = this.bgGlobalAlpha;
      if (this.bgFillStyle != null) {
        this.ctx.fillStyle = this.bgFillStyle;
        this.ctx.fill();
      }
      this.ctx.restore();
    }
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = this.borderStrokeStyle;
    this.ctx.stroke();
    this.ctx.restore();
  }
}
TextCursor.initClass();

/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

MultiString.set_langpath('en:fr'); // TODO make this a setting

const colorlog = function(msg, color, size) {
  if (color == null) { color = "red"; }
  if (size == null) { size = "1.2em"; }
  return console.log(`%c${msg}`, `color:${color};font-size:${size};`);
};

const unpad_md = function(txt, pad) {
  // Purpose:
  //   Remove padding at the beginings of all lines in txt IFF all lines have padding
  // Motivation:
  //   Markdown is very whitespace sensitive but it makes for ugly code
  //   to not have left padding in large strings.
  pad = "    ";
  const out_lines = [];
  const in_lines = txt.split("\n");
  for (let line of in_lines) {
    if (!(line.startsWith(pad) || (line.length === 0))) {
      return txt;
    }
    out_lines.push(line.replace(/^    /,''));
  }
  const out = out_lines.join("\n");
  return out;
};

const strip_surrounding_quotes = function(s) {
  return s.replace(/\"$/,'').replace(/^\"/,'');
};

const hpad = 10;
const tau = Math.PI * 2;
const distance = function(p1, p2) {
  p2 = p2 || [0,0];
  const x = (p1.x || p1[0]) - (p2.x || p2[0]);
  const y = (p1.y || p1[1]) - (p2.y || p2[1]);
  return Math.sqrt((x * x) + (y * y));
};
const dist_lt = function(mouse, d, thresh) {
  if (window.dist_lt_called == null) { window.dist_lt_called = 0; }
  window.dist_lt_called++;
  const x = mouse[0] - d.x;
  const y = mouse[1] - d.y;
  return Math.sqrt((x * x) + (y * y)) < thresh;
};
let hash = function(str) {
  // https://github.com/darkskyapp/string-hash/blob/master/index.js
  let hsh = 5381;
  let i = str.length;
  while (i) {
    hsh = (hsh * 33) ^ str.charCodeAt(--i);
  }
  return hsh >>> 0;
};
const convert = function(src, srctable, desttable) {
  // convert.js
  // http://rot47.net
  // Dr Zhihua Lai
  const srclen = srctable.length;
  const destlen = desttable.length;
  // first convert to base 10
  let val = 0;
  const numlen = src.length;
  let i = 0;
  while (i < numlen) {
    val = (val * srclen) + srctable.indexOf(src.charAt(i));
    i++;
  }
  if (val < 0) { return 0; }
  // then covert to any base
  let r = val % destlen;
  let res = desttable.charAt(r);
  let q = Math.floor(val / destlen);
  while (q) {
    r = q % destlen;
    q = Math.floor(q / destlen);
    res = desttable.charAt(r) + res;
  }
  return res;
};
const BASE57 = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE10 = "0123456789";
const int_to_base = function(intgr){
  return convert(""+intgr, BASE10, BASE57);
};
const synthIdFor = function(str) {
  // return a short random hash suitable for use as DOM/JS id
  return 'h' + int_to_base(hash(str)).substr(0,6);
};
window.synthIdFor = synthIdFor;
const unescape_unicode = function(u) {
  // pre-escape any existing quotes so when JSON.parse does not get confused
  return JSON.parse('"' + u.replace('"', '\\"') + '"');
};

var linearize = function(msgRecipient, streamoid) {
  if (streamoid.idx === 0) {
    msgRecipient.postMessage({event: 'finish'});
  } else {
    let i = streamoid.idx + 1;
    let l = 0;
    while (streamoid.data[i](!'\n')) {
      l++;
      i++;
    }
    const line = streamoid.data.substr(streamoid.idx, l+1).trim();
    msgRecipient.postMessage({event:'line', line});
    streamoid.idx = i;
    const recurse = () => linearize(msgRecipient, streamoid);
    setTimeout(recurse, 0);
  }
};

const ident = function(data) {
  return data;
};

const sel_to_id = function(selector) {
  // remove the leading hash to make a selector into an id
  return selector.replace(/^\#/, '');
};

window.log_click = function() {
  console.log("%cCLICK", "color:red;font-size:1.8em");
};

// http://dublincore.org/documents/dcmi-terms/
const DC_subject  = "http://purl.org/dc/terms/subject";
const DCE_title    = "http://purl.org/dc/elements/1.1/title";
const FOAF_Group  = "http://xmlns.com/foaf/0.1/Group";
const FOAF_Person = "http://xmlns.com/foaf/0.1/Person";
const FOAF_name   = "http://xmlns.com/foaf/0.1/name";
const OA_ = "http://www.w3.org/ns/oa#"; // the prefix of the Open Annotation Ontology
// OA_terms_regex was built with the help of:
//   grep '^oa:' data/oa.ttl  | grep " a " | sort | sed 's/\ a\ .*//' | uniq | sed 's/^oa://' | tr '\n' '|'
const OA_terms_regex = /^(Annotation|Choice|CssSelector|CssStyle|DataPositionSelector|Direction|FragmentSelector|HttpRequestState|Motivation|PreferContainedDescriptions|PreferContainedIRIs|RangeSelector|ResourceSelection|Selector|SpecificResource|State|Style|SvgSelector|TextPositionSelector|TextQuoteSelector|TextualBody|TimeState|XPathSelector|annotationService|assessing|bodyValue|bookmarking|cachedSource|canonical|classifying|commenting|describing|editing|end|exact|hasBody|hasEndSelector|hasPurpose|hasScope|hasSelector|hasSource|hasStartSelector|hasState|hasTarget|highlighting|identifying|linking|ltrDirection|moderating|motivatedBy|prefix|processingLanguage|questioning|refinedBy|renderedVia|replying|rtlDirection|sourceDate|sourceDateEnd|sourceDateStart|start|styleClass|styledBy|suffix|tagging|textDirection|via)$/;
const OSMT_name   = "https://wiki.openstreetmap.org/wiki/Key:name";
const OSMT_reg_name = "https://wiki.openstreetmap.org/wiki/Key:reg_name";
const OWL_Class   = "http://www.w3.org/2002/07/owl#Class";
const OWL_Thing   = "http://www.w3.org/2002/07/owl#Thing";
const OWL_ObjectProperty = "http://www.w3.org/2002/07/owl#ObjectProperty";
const RDF_literal = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";
const RDF_object  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";
const RDF_type    = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const RDF_Class   = "http://www.w3.org/2000/01/rdf-schema#Class"; // TODO rename RDFS_
const RDF_subClassOf   = "http://www.w3.org/2000/01/rdf-schema#subClassOf"; // TODO rename RDFS_
const RDF_a       = 'a';
const RDFS_label  = "http://www.w3.org/2000/01/rdf-schema#label";
const SCHEMA_name = "http://schema.org/name";
const SKOS_prefLabel = "http://www.w3.org/2004/02/skos/core#prefLabel";
const XL_literalForm = "http://www.w3.org/2008/05/skos-xl#literalForm";
const TYPE_SYNS   = [RDF_type, RDF_a, 'rdfs:type', 'rdf:type'];
const THUMB_PREDS = [
  'http://dbpedia.org/ontology/thumbnail',
  'http://xmlns.com/foaf/0.1/thumbnail'];
const NAME_SYNS = [
  FOAF_name, RDFS_label, 'rdfs:label', 'name', SKOS_prefLabel, XL_literalForm,
  SCHEMA_name, DCE_title, OSMT_reg_name, OSMT_name ];
const XML_TAG_REGEX = /(<([^>]+)>)/ig;

const typeSigRE = {
  // https://regex101.com/r/lKClAg/1
  'xsd': new RegExp("^http:\/\/www\.w3\.org\/2001\/XMLSchema\#(.*)$"),
  // https://regex101.com/r/ccfdLS/3/
  'rdf': new RegExp("^http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#(.*)$")
};
const getPrefixedTypeSignature = function(typeUri) {
  for (let prefix in typeSigRE) {
    const sig = typeSigRE[prefix];
    const match = typeUri.match(sig);
    if (match) {
      return `${prefix}__${match[1]}`;
    }
  }
};
const getTypeSignature = function(typeUri) {
  const typeSig = getPrefixedTypeSignature(typeUri);
  return typeSig;
};
  //return (typeSig or '').split('__')[1]
const PRIMORDIAL_ONTOLOGY = {
  subClassOf: {
    Literal: 'Thing',
    // https://www.w3.org/1999/02/22-rdf-syntax-ns
    // REVIEW(smurp) ignoring all but the rdfs:Datatype instances
    // REVIEW(smurp) should Literal be called Datatype instead?
    "rdf__PlainLiteral": 'Literal',
    "rdf__HTML": 'Literal',
    "rdf__langString": 'Literal',
    "rdf__type": 'Literal',
    "rdf__XMLLiteral": 'Literal',
    // https://www.w3.org/TR/xmlschema11-2/type-hierarchy-201104.png
    // https://www.w3.org/2011/rdf-wg/wiki/XSD_Datatypes
    // REVIEW(smurp) ideally all the xsd types would fall under anyType > anySimpleType > anyAtomicType
    // REVIEW(smurp) what about Built-in list types like: ENTITIES, IDREFS, NMTOKENS ????
    "xsd__anyURI": 'Literal',
    "xsd__base64Binary": 'Literal',
    "xsd__boolean": 'Literal',
    "xsd__date": 'Literal',
    "xsd__dateTimeStamp": 'date',
    "xsd__decimal": 'Literal',
    "xsd__integer": "xsd__decimal",
    "xsd__long": "xsd__integer",
    "xsd__int": "xsd__long",
    "xsd__short": "xsd__int",
    "xsd__byte": "xsd__short",
    "xsd__nonNegativeInteger": "xsd__integer",
    "xsd__positiveInteger": "xsd__nonNegativeInteger",
    "xsd__unsignedLong": "xsd__nonNegativeInteger",
    "xsd__unsignedInt":  "xsd__unsignedLong",
    "xsd__unsignedShort": "xsd__unsignedInt",
    "xsd__unsignedByte": "xsd__unsignedShort",
    "xsd__nonPositiveInteger": "xsd__integer",
    "xsd__negativeInteger": "xsd__nonPositiveInteger",
    "xsd__double": 'Literal',
    "xsd__duration": 'Literal',
    "xsd__float": 'Literal',
    "xsd__gDay": 'Literal',
    "xsd__gMonth": 'Literal',
    "xsd__gMonthDay": 'Literal',
    "xsd__gYear": 'Literal',
    "xsd__gYearMonth": 'Literal',
    "xsd__hexBinary": 'Literal',
    "xsd__NOTATION": 'Literal',
    "xsd__QName": 'Literal',
    "xsd__string": 'Literal',
    "xsd__normalizedString": "xsd_string",
    "xsd__token": "xsd__normalizedString",
    "xsd__language": "xsd__token",
    "xsd__Name": "xsd__token",
    "xsd__NCName": "xsd__Name",
    "xsd__time": 'Literal'
  },
  subPropertyOf: {},
  domain: {},
  range: {},
  label: {} // MultiStrings as values
};

const MANY_SPACES_REGEX = /\s{2,}/g;
const UNDEFINED = undefined;
const start_with_http = new RegExp("http", "ig");
const ids_to_show = start_with_http;
const PEEKING_COLOR = "darkgray";

const themeStyles = {
  "light": {
    "themeName": "theme_white",
    "pageBg": "white",
    "labelColor": "black",
    "shelfColor": "lightgreen",
    "discardColor": "salmon",
    "nodeHighlightOutline": "black"
  },
  "dark": {
    "themeName": "theme_black",
    "pageBg": "black",
    "labelColor": "#ddd",
    "shelfColor": "#163e00",
    "discardColor": "#4b0000",
    "nodeHighlightOutline": "white"
  }
};

const id_escape = function(an_id) {
  let retval = an_id.replace(/\:/g,'_');
  retval = retval.replace(/\//g,'_');
  retval = retval.replace(new RegExp(' ','g'),'_');
  retval = retval.replace(new RegExp('\\?','g'),'_');
  retval = retval.replace(new RegExp('\=','g'),'_');
  retval = retval.replace(new RegExp('\\.','g'),'_');
  retval = retval.replace(new RegExp('\\#','g'),'_');
  return retval;
};

const node_radius_policies = {
  "node radius by links"(d) {
    d.radius = Math.max(this.node_radius, Math.log(d.links_shown.length));
    return d.radius;
    if (d.showing_links === "none") {
      d.radius = this.node_radius;
    } else {
      if (d.showing_links === "all") {
        d.radius = Math.max(this.node_radius,
          2 + Math.log(d.links_shown.length));
      }
    }
    return d.radius;
  },
  "equal dots"(d) {
    return this.node_radius;
  }
};
//default_node_radius_policy = "equal dots"
const default_node_radius_policy = "node radius by links";

const has_type = function(subject, typ) {
  return has_predicate_value(subject, RDF_type, typ);
};

var has_predicate_value = function(subject, predicate, value) {
  const pre = subject.predicates[predicate];
  if (pre) {
    const objs = pre.objects;
    let oi = 0;
    while (oi <= objs.length) {
      const obj = objs[oi];
      if (obj.value === value) {
        return true;
      }
      oi++;
    }
  }
  return false;
};

const is_a_main_node = function(d) {
  return (BLANK_HACK && (d.s.id[7] !== "/")) || (!BLANK_HACK && (d.s.id[0] !== "_"));
};

const is_node_to_always_show = is_a_main_node;

const is_one_of = function(itm, array) {
  return array.indexOf(itm) > -1;
};

window.blurt = function(str, type, noButton) {
  throw new Error('global blurt() is defunct, use @blurt() on HuViz');
};

const escapeHtml = function(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const noop = function() {}; // Yup, does nothing.  On purpose!

const orlando_human_term = {
  all: 'All',
  chosen: 'Activated',
  unchosen: 'Deactivated',
  selected: 'Selected',
  shelved: 'Shelved',
  discarded: 'Discarded',
  hidden: 'Hidden',
  graphed: 'Graphed',
  fixed: 'Pinned',
  labelled: 'Labelled',
  matched: 'Matched',
  choose: 'Activate',
  unchoose: 'Deactivate',
  wander: 'Wander',
  walk: 'Walk',
  walked: "Walked",
  select: 'Select',
  unselect: 'Unselect',
  label: 'Label',
  unlabel: 'Unlabel',
  shelve: 'Shelve',
  hide: 'Hide',
  discard: 'Discard',
  undiscard: 'Retrieve',
  pin: 'Pin',
  unpin: 'Unpin',
  unpinned: 'Unpinned',
  nameless: 'Nameless',
  blank_verb: 'VERB',
  blank_noun: 'SET/SELECTION',
  hunt: 'Hunt',
  load: 'Load',
  draw: 'Draw',
  undraw: 'Undraw',
  connect: 'Connect',
  spawn: 'Spawn',
  specialize: 'Specialize',
  annotate: 'Annotate',
  seeking_object: 'Object node',
  suppress: 'Suppress',
  suppressed: 'Suppresssed'
};

class Huviz {
  static initClass() {
    this.prototype.hash = hash;
    this.prototype.class_list = []; // FIXME remove
    this.prototype.HHH = {};
    this.prototype.edges_by_id = {};
    this.prototype.edge_count = 0;
    this.prototype.snippet_db = {};
    this.prototype.class_index = {};
    this.prototype.hierarchy = {};
    this.prototype.default_color = "brown";
    this.prototype.DEFAULT_CONTEXT = 'http://universal.org/';
    this.prototype.turtle_parser = 'GreenerTurtle';

    this.prototype.use_canvas = true;
    this.prototype.use_svg = false;
    this.prototype.use_webgl = false;
    //use_webgl: true  if location.hash.match(/webgl/)
    //use_canvas: false  if location.hash.match(/nocanvas/)

    this.prototype.nodes = undefined;
    this.prototype.links_set = undefined;
    this.prototype.node = undefined;
    this.prototype.link = undefined;

    this.prototype.lariat = undefined;
    this.prototype.verbose = true;
    this.prototype.verbosity = 0;
    this.prototype.TEMP = 5;
    this.prototype.COARSE = 10;
    this.prototype.MODERATE = 20;
    this.prototype.DEBUG = 40;
    this.prototype.DUMP = false;
    this.prototype.node_radius_policy = undefined;
    this.prototype.draw_circle_around_focused = true;
    this.prototype.draw_lariat_labels_rotated = true;
    this.prototype.run_force_after_mouseup_msec = 2000;
    this.prototype.nodes_pinnable = true;
    this.prototype.BLANK_HACK = false;
    this.prototype.width = undefined;
    this.prototype.height = 0;
    this.prototype.cx = 0;
    this.prototype.cy = 0;

    this.prototype.snippet_body_em = .7;
    this.prototype.line_length_min = 4;

    // TODO figure out how to replace with the default_graph_control
    // TODO remove all of the following which are rendered redundant by settings
    this.prototype.link_distance = 29;
    this.prototype.fisheye_zoom = 4.0;
    this.prototype.peeking_line_thicker = 4;
    this.prototype.show_snippets_constantly = false;
    this.prototype.charge = -193;
    this.prototype.gravity = 0.025;
    this.prototype.snippet_count_on_edge_labels = true;
    this.prototype.label_show_range = null; // @link_distance * 1.1
    this.prototype.focus_threshold = 100;
    this.prototype.discard_radius = 200;
    this.prototype.fisheye_radius = 300; //null # label_show_range * 5
    this.prototype.focus_radius = null; // label_show_range
    this.prototype.drag_dist_threshold = 5;
    this.prototype.snippet_size = 300;
    this.prototype.dragging = false;
    this.prototype.last_status = undefined;
    this.prototype.edge_x_offset = 5;
    this.prototype.shadow_offset = 1;
    this.prototype.shadow_color = 'DarkGray';

    this.prototype.my_graph = {
      predicates: {},
      subjects: {},
      objects: {}
    };

    this.prototype.G = {}; // required by green turtle, should be retired
    this.prototype.local_file_data = "";
    this.prototype.search_regex = new RegExp("^$", "ig");
    this.prototype.node_radius = 3.2;
    this.prototype.mousedown_point = false;
    this.prototype.discard_center = [0,0];
    this.prototype.lariat_center = [0,0];
    this.prototype.last_mouse_pos = [ 0, 0];
    this.prototype.renderStyles = themeStyles.light;
    this.prototype.display_shelf_clockwise = true;
    this.prototype.nodeOrderAngle = 0.5;
    this.prototype.pfm_data = {
      tick: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Ticks/sec."
      },
      add_quad: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Add Quad/sec"
      },
      hatch: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Hatch/sec"
      },
      taxonomy: {
        total_count: 0,
        label: "Number of Classes:"
      },
      sparql: {
        total_count: 0,
        prev_total_count: 0,
        timed_count: [],
        label: "Sparql Queries/sec"
      }
    };
    this.prototype.p_total_sprql_requests = 0;

    this.prototype.default_dialog_args = {
      width:200,
      height:200,
      left:100,
      top:100,
      head_bg_color:'#157fcc',
      classes: "contextMenu temp",
      title: ''
    };

    this.prototype.DEPRECATED_showing_links_to_cursor_map = {
      all: 'not-allowed',
      some: 'all-scroll',
      none: 'pointer'
    };
    this.proposed_edge = null;
    this.prototype.shown_messages = [];
    this.prototype.msg_history = "";
    this.prototype.my_graph = {
      subjects: {},
      predicates: {},
      objects: {}
    };

    // msec betweeen repetition of a msg display
    this.prototype.discover_geoname_name_msgs_threshold_ms = 5 * 1000;

    // TODO eliminate all use of this version in favor of the markdown version
    this.prototype.discover_geoname_name_instructions = `\
Be sure to
  1) create a
     <a target="geonamesAcct"
        href="http://www.geonames.org/login">new account</a>
  2) validate your email
  3) on
     <a target="geonamesAcct"
        href="http://www.geonames.org/manageaccount">manage account</a>
     press
     <a target="geonamesAcct"
         href="http://www.geonames.org/enablefreewebservice">click here to enable</a>
  4) re-enter your GeoNames Username in HuViz settings to trigger lookup</span>`;

    this.prototype.discover_geoname_name_instructions_md = `\
## How to get GeoNames lookup working

[GeoNames](http://www.geonames.org) is a very popular service experiencing much load.
To protect their servers they require a username to be able to perform lookup.
The hourly limit is 1000 and the daily limit is 30000 per username.

You may use the \`huviz\` username if you are going to perform just a couple of lookups.
If you are going to do lots of GeoNames lookups you should set up your own account.
Here is how:

1. create a <a target="geonamesAcct" href="http://www.geonames.org/login">new account</a> if you don't have one
2. validate your email (if you haven't already)
3. on the <a target="geonamesAcct" href="http://www.geonames.org/manageaccount">manage account</a> page
   press <a target="geonamesAcct" href="http://www.geonames.org/enablefreewebservice">Click here to enable</a>
   if your account is not already _enabled to use the free web services_
4. enter your *GeoNames Username* in HuViz \`Settings\` tab then press the TAB or ENTER key to trigger lookup
5. if you need to perform more lookups, just adjust the *GeoNames Limit*, then leave that field with TAB, ENTER or a click

(Soon, HuViz will let you save your personal *GeoNames Username* and your *GeoNames Limit* to make this more convenient.)
\
`;
    /*
    * This is what a single geoRec from geonames.org looks like:
            "fcode" : "RGN",
            "adminCodes1" : {
               "ISO3166_2" : "ENG"
            },
            "adminName1" : "England",
            "countryName" : "United Kingdom",
            "fcl" : "L",
            "countryId" : "2635167",
            "adminCode1" : "ENG",
            "name" : "Yorkshire",
            "lat" : "53.95528",
            "population" : 0,
            "geonameId" : 8581589,
            "fclName" : "parks,area, ...",
            "countryCode" : "GB",
            "fcodeName" : "region",
            "toponymName" : "Yorkshire",
            "lng" : "-1.16318"
    */

    this.prototype.discover_geoname_key_to_predicate_mapping = {
      name: RDFS_label,
      //toponymName: RDFS_label
      //lat: 'http://dbpedia.org/property/latitude'
      //lng: 'http://dbpedia.org/property/longitude'
      //fcodeName: RDF_literal
      population: 'http://dbpedia.org/property/population'
    };

    this.prototype.default_name_query_args = {
      predicates: [RDFS_label, FOAF_name, SCHEMA_name],
      limit: 20
    };

    this.prototype.last_quad = {};
    this.prototype.object_value_types = {};
    this.prototype.unique_pids = {};
    this.prototype.scroll_spacer = "   ";
    this.prototype.report_every = 100;
    this.prototype.snippet_positions_filled = {};

    this.prototype.domain2sparqlEndpoint = {
      'cwrc.ca': 'http://sparql.cwrc.ca/sparql',
      'getty.edu': 'http://vocab.getty.edu/sparql.tsv',
      'openstreetmap.org': 'https://sophox.org/sparql',
      'dbpedia.org': "http://dbpedia.org/sparql",
      'viaf.org': "http://data.linkeddatafragments.org/viaf",
      //'getty.edu': "http://data.linkeddatafragments.org/lov"
      //'wikidata.org': "https://query.wikidata.org"
      '*': "http://data.linkeddatafragments.org/lov"
    };

    this.prototype.loading_notice_markdown = `\
## Loading....
<div class="loadingNotice">Please wait</div>\
`;

    // TODO make other than 'anything' optional
    this.prototype.predicates_to_ignore = ["anything", "first", "rest", "members"];

    this.prototype.default_tab_specs = [{
      id: 'commands',
      cssClass:'huvis_controls scrolling_tab unselectable',
      title: "Power tools for controlling the graph",
      text: "Commands"
    }
    , {
      id: 'settings',
      cssClass: 'settings scrolling_tab',
      title: "Fine tune sizes, lengths and thicknesses",
      text: "Settings"
    }
    , {
      id: 'history',
      cssClass:'tabs-history',
      title: "The command history",
      text: "History"
    }
    , {
      id: 'credits',
      cssClass: 'tabs-credit scrolling_tab',
      title: "Academic, funding and technical credit",
      text: "Credit",
      bodyUrl: "/huviz/docs/credits.md"
    }
    , {
      id: 'tutorial',
      cssClass: "tabs-tutor scrolling_tab",
      title: "A tutorial",
      text: "Tutorial",
      bodyUrl: "/huviz/docs/tutorial.md"
    }
    , {
      id: 'sparqlQueries',
      cssClass: "tabs-sparqlQueries scrolling_tab",
      title: "SPARQL Queries",
      text: "Q"
    }
    ];

    // The div on the left should be placed in the div on the right
    // The div on the left should appear in needed_divs.
    // The div on right should be identified by a tab id like 'huvis_controls'
    //                                    or by a div id like 'viscanvas'
    // Divs which do not have a 'special_parent' get plunked in the @topElem
    this.prototype.div_has_special_parent =
      {gclui: 'huvis_controls'};

    this.prototype.needed_divs = [
      'gclui',
      'performance_dashboard',
      'state_msg_box',
      'status',
      'viscanvas',
      'vissvg'
      ];

    this.prototype.needed_JQElems = [
      'gclui',
      'performance_dashboard',
      'viscanvas',
      'huviz_controls'
      ];

    this.prototype.human_term = {
      all: 'ALL',
      chosen: 'CHOSEN',
      unchosen: 'UNCHOSEN',
      selected: 'SELECTED',
      shelved: 'SHELVED',
      discarded: 'DISCARDED',
      hidden: 'HIDDEN',
      graphed: 'GRAPHED',
      fixed: 'PINNED',
      labelled: 'LABELLED',
      choose: 'CHOOSE',
      unchoose: 'UNCHOOSE',
      select: 'SELECT',
      unselect: 'UNSELECT',
      label: 'LABEL',
      unlabel: 'UNLABEL',
      shelve: 'SHELVE',
      hide: 'HIDE',
      discard: 'DISCARD',
      undiscard: 'RETRIEVE',
      pin: 'PIN',
      unpin: 'UNPIN',
      unpinned: 'UNPINNED',
      nameless: 'NAMELESS',
      blank_verb: 'VERB',
      blank_noun: 'SET/SELECTION',
      hunt: 'HUNT',
      walk: 'WALK',
      walked: 'WALKED',
      wander: 'WANDER',
      draw: 'DRAW',
      undraw: 'UNDRAW',
      connect: 'CONNECT',
      spawn: 'SPAWN',
      specialize: 'SPECIALIZE',
      annotate: 'ANNOTATE',
      suppress: "SUPPRESS"
    };

    // TODO add controls
    //   selected_border_thickness
    //   show_cosmetic_tabs
    this.prototype.default_settings = DEFAULT_SETTINGS;
    // recognize that changing this will likely break old hybrid HuVizScripts
    this.prototype.json_script_marker = "# JSON FOLLOWS";
  }

  how_heavy_are(n, label, cb) {
    let retval;
    const memories = [];
    memories.push(window.performance.memory);
    if (this.heavy_things == null) { this.heavy_things = {}; }
    const buncha = [];
    this.heavy_things[label] = buncha;
    for (let m = 1, end = n, asc = 1 <= end; asc ? m <= end : m >= end; asc ? m++ : m--) {
      retval = cb.call(this,n);
      //console.log(retval)
      buncha.push(retval);
    }
    memories.push(window.performance.memory);
    memories.push({});
    memories.push({});
    const [before,after,diff,per] = Array.from(memories);
    for (let k in memories[0]) {
      diff[k] = after[k] - before[k];
      per[k] = diff[k] / n;
    }
    per.what = 'B/'+label;
    before.what = 'before';
    after.what = 'after';
    diff.what = 'diff';
    colorlog(label + ' occupy ' + per.totalJSHeapSize + ' Bytes each');
    console.log('eg', retval);
  }

  how_heavy(n) {
    // Purpose:
    //   Find out how many Bytes each of the following objects occupy in RAM.
    // Example:
    //   HVZ[0].how_heavy(100000)
    this.how_heavy_are(n, 'Array', x => new Array(100));
    this.how_heavy_are(n, 'Object', x => (new Object())[x] = x);
    this.how_heavy_are(n, 'String', x => ""+x);
    this.how_heavy_are(n, 'Random', x => Math.random());
    return this.how_heavy_are(n, 'SortedSet', x => SortedSet().named(x));
  }

  compose_object_from_defaults_and_incoming(defs, incoming) {
    // Purpose:
    //   To return an object with the properties of defs and incoming layered into it in turn
    // Intended Use Case:
    //   It is frequently the case that one wants to have and object with contains
    //   the default arguments for something and that one also wants the ability to
    //   pass in another object which contains the specifics for the call.
    //   This method joins those things together properly (they can even be null)
    //   to return the amalgamation of the defaults and the incoming arguments.
    if (defs == null) { defs = {}; }
    if (incoming == null) { incoming = {}; }
    return Object.assign(Object.assign({}, defs), incoming);
  }

  gen_dialog_html(contents, id, in_args) {
    const args = this.compose_object_from_defaults_and_incoming(this.default_dialog_args, in_args);
    //args = Object.assign(default_args, in_args)
    return `<div id="${id}" class="${args.classes} ${args.extraClasses}"
  style="display:block;top:${args.top}px;left:${args.left}px;max-width:${args.width}px;max-height:${args.height}px">
<div class="header" style="background-color:${args.head_bg_color};${args.style}">
  <div class="dialog_title">${args.title}</div>
  <button class="close_node_details" title="Close"><i class="far fa-window-close" for="${id}"></i></button>
</div>
${contents}
</div>`; // """ for emacs coffeescript mode
  }

  make_dialog(content_html, id, args) {
    if (id == null) { id = this.unique_id('dialog_'); }  // if you do not have an id, an id will be provided for you
    this.addHTML(this.gen_dialog_html(content_html, id, args));
    const elem = document.querySelector('#'+id);
    $(elem).on('drag',this.pop_div_to_top);
    $(elem).draggable().resizable();
    $(elem.querySelector(' .close_node_details')).on('click', args.close || this.destroy_dialog);
    return elem;
  }

  pop_div_to_top(elem) {
    $(elem.currentTarget).parent().append(elem.currentTarget);
  }

  destroy_dialog(e) {
    const box = e.currentTarget.offsetParent;
    $(box).remove();
  }

  make_markdown_dialog(markdown, id, args) {
    if (args == null) { args = {}; }
    args.extraClasses += " markdownDialog";
    return this.make_dialog(marked(markdown || ''), id, args);
  }

  make_pre_dialog(textToPre, id, args) {
    if (args == null) { args = {}; }
    args.extraClasses += " preformattedDialog";
    return this.make_dialog(`<pre>${textToPre}</pre>`, id, args);
  }

  make_json_dialog(json, id, args) {
    if (args == null) { args = {}; }
    args.extraClasses += " preformattedDialog";
    const jsonString = JSON.stringify(json, null, args.json_indent || 2);
    return this.make_dialog(`<pre>${jsonString}</pre>`, id, args);
  }

  unique_id(prefix) {
    if (prefix == null) { prefix = 'uid_'; }
    return prefix + Math.random().toString(36).substr(2,10);
  }

  change_sort_order(array, cmp) { // TODO remove if unused
    array.__current_sort_order = cmp;
    array.sort(array.__current_sort_order);
  }

  isArray(thing) {
    return Object.prototype.toString.call(thing) === "[object Array]";
  }

  cmp_on_name(a, b) {
    if (a.name === b.name) { return 0; }
    if (a.name < b.name) { return -1; }
    return 1;
  }
  cmp_on_id(a, b) {
    if (a.id === b.id) { return 0; }
    if (a.id < b.id) { return -1; }
    return 1;
  }
  binary_search_on(sorted_array, sought, cmp, ret_ins_idx) {
    // return -1 or the idx of sought in sorted_array
    // if ret_ins_idx instead of -1 return [n] where n is where it ought to be
    // AKA "RETurn the INSertion INdeX"
    cmp = cmp || sorted_array.__current_sort_order || this.cmp_on_id;
    ret_ins_idx = ret_ins_idx || false;
    const seeking = true;
    if (sorted_array.length < 1) {
      if (ret_ins_idx) { return {idx: 0}; }
      return -1;
    }
    let mid = undefined;
    let bot = 0;
    let top = sorted_array.length;
    while (seeking) {
      mid = bot + Math.floor((top - bot) / 2);
      const c = cmp(sorted_array[mid], sought);

      //console.log(" c =",c);
      if (c === 0) { return mid; }
      if (c < 0) { // ie sorted_array[mid] < sought
        bot = mid + 1;
      } else {
        top = mid;
      }
      if (bot === top) {
        if (ret_ins_idx) { return {idx: bot}; }
        return -1;
      }
    }
  }

  // Objective:
  //   Maintain a sorted array which acts like a set.
  //   It is sorted so insertions and tests can be fast.
  // cmp: a comparison function returning -1,0,1
  // an integer was returned, ie it was found

  // Perform the set .add operation, adding itm only if not already present

  //if (Array.__proto__.add == null) Array.prototype.add = add;
  // the nodes the user has chosen to see expanded
  // the nodes the user has discarded
  // the nodes which are in the graph, linked together
  // the nodes not displaying links and not discarded
  // keep synced with html
  // bugged
  roughSizeOfObject(object) {
    // http://stackoverflow.com/questions/1248302/javascript-object-size
    const objectList = [];
    const stack = [object];
    let bytes = 0;
    while (stack.length) {
      const value = stack.pop();
      if (typeof value === "boolean") {
        bytes += 4;
      } else if (typeof value === "string") {
        bytes += value.length * 2;
      } else if (typeof value === "number") {
        bytes += 8;
      } else if ((typeof value === "object") && (objectList.indexOf(value) === -1)) {
        objectList.push(value);
        for (let i in value) {
          stack.push(value[i]);
        }
      }
    }
    return bytes;
  }

  move_node_to_point(node, point) {
    node.x = point[0];
    node.y = point[1];
  }

  click_verb(id) {
    const verbs = $(`#verb-${id}`);
    if (!verbs.length) {
      throw new Error(`verb '${id}' not found`);
    }
    verbs.trigger("click");
    return this;
  }

  click_set(id) {
    if (id === 'nodes') {
      alert("set 'nodes' is deprecated");
      console.error("set 'nodes' is deprecated");
    } else {
      if (!id.endsWith('_set')) {
        id = id + '_set';
      }
    }
    const sel = `#${id}`;
    const sets = $(sel);
    if (!sets.length) {
      throw new Error(`set '${id}' not found using selector: '${sel}'`);
    }
    sets.trigger("click");
    return this;
  }

  click_predicate(id) {
    this.gclui.predicate_picker.handle_click(id);
    return this;
  }

  click_taxon(id) {
    $(`#${id}`).trigger("click");
    return this;
  }

  like_string(str) {
    // Ideally we'd trigger an actual 'input' event but that is not possible
    //$(".like_input").val(str)
    this.gclui.like_input.val(str);
    this.gclui.handle_like_input();
    //debugger if @DEBUG and str is ""
    return this;
  }

  toggle_expander(id) {
    this.topJQElem.find(`#${id} span.expander:first`).trigger("click");
    return this;
  }

  doit() {
    this.topJQElem.find(".doit_button").trigger("click");
    return this;
  }

  make_cursor_text_while_dragging(action) {
    let drag_or_drop;
    if (['seeking_object'].includes(action)) {
      drag_or_drop = 'drag';
    } else {
      drag_or_drop = 'drop';
    }
    return `${this.human_term[drag_or_drop] || drag_or_drop} to ${this.human_term[action] || action}`;
  }

  get_mouse_point(d3_event) {
    if (d3_event == null) { d3_event = this.mouse_receiver.node(); }
    return d3.mouse(d3_event);
  }

  should_start_dragging() {
    // We can only know that the users intention is to drag
    // a node once sufficient motion has started, when there
    // is a focused_node
    //console.log "state_name == '" + @focused_node.state.state_name + "' and selected? == " + @focused_node.selected?
    //console.log "START_DRAG: \n  dragging",@dragging,"\n  mousedown_point:",@mousedown_point,"\n  @focused_node:",@focused_node
    return !this.dragging &&
        this.mousedown_point &&
        this.focused_node &&
        (distance(this.last_mouse_pos, this.mousedown_point) > this.drag_dist_threshold);
  }

  mousemove() {
    this.d3simulation.alpha(0.1).restart();
    this.last_mouse_pos = this.get_mouse_point();
    if (this.should_start_dragging()) {
      this.dragging = this.focused_node;
      if (this.args.drag_start_handler) {
        try {
          this.args.drag_start_handler.call(this, this.dragging);
        } catch (e) {
          console.warn(e);
        }
      }
      if (this.editui.is_state('connecting')) {
        if (this.editui.subject_node !== this.dragging) {
          this.editui.set_subject_node(this.dragging);
        }
      }
      if (this.dragging.state !== this.graphed_set) {
        this.graphed_set.acquire(this.dragging);
      }
    }
    if (this.dragging) {
      this.sim_restart();  //        @force.resume() # why?
      if (!this.args.skip_log_tick) {
        console.log("Tick in @force.resume() mousemove");
      }
      this.move_node_to_point(this.dragging, this.last_mouse_pos);
      if (this.editui.is_state('connecting')) {
        this.text_cursor.pause("", "drop on object node");
      } else {
        let action, edit_state;
        if (this.dragging.links_shown.length === 0) {
          action = "choose";
        } else if (this.dragging.fixed) {
          action = "unpin";
        } else {
          action = "pin";
        }
        if ((edit_state = this.editui.get_state()) !== 'not_editing') {
          action = edit_state;
        } else if (this.in_disconnect_dropzone(this.dragging)) {
          action = "shelve";
        } else if (this.in_discard_dropzone(this.dragging)) {
          action = "discard";
        }
        const cursor_text = this.make_cursor_text_while_dragging(action);
        this.text_cursor.pause("", cursor_text);
      }
    } else {
      // TODO put block "if not @dragging and @mousedown_point and @focused_node and distance" here
      if (this.editui.is_state('connecting')) {
        if (this.editui.object_node || !this.editui.subject_node) {
          if (this.editui.object_datatype_is_literal) {
            this.text_cursor.set_text("click subject node");
          } else {
            this.text_cursor.set_text("drag subject node");
          }
        }
      }
    }
    if (this.peeking_node != null) {
      // console.log "PEEKING at node: " + @peeking_node.id
      if ((this.focused_node != null) && (this.focused_node !== this.peeking_node)) {
        const pair = [ this.peeking_node.id, this.focused_node.id ];
        //console.log "   PEEKING at edge between" + @peeking_node.id + " and " + @focused_node.id
        for (let edge of this.peeking_node.links_shown) {
          if (pair.includes(edge.source.id) && pair.includes(edge.target.id)) {
            //console.log "PEEK edge.id is '" + edge.id + "'"
            edge.focused = true;
            this.print_edge(edge);
          } else {
            edge.focused = false;
          }
        }
      }
    }
    if (this.should_display_labels_as('boxNGs')) {
      if (this.dragging) {
        this.update_boxNG(this.dragging);
      }
    } else {
      this.tick("Tick in mousemove");
    }
  }

  should_display_labels_as(which) {
    return this.display_labels_as.includes(which);
  }

  mousedown() {
    this.mousedown_point = this.get_mouse_point();
    this.last_mouse_pos = this.mousedown_point;
  }

  mouseup() {
    window.log_click();
    const d3_event = this.mouse_receiver.node();
    this.mousedown_point = false;
    const point = this.get_mouse_point(d3_event);
    if (d3.event.button === 2) { // Right click event so don't alter selected state
      if (this.focused_node) { $(`#${this.focused_node.lid}`).removeClass("temp"); }
      return;
    }
    // if something was being dragged then handle the drop
    if (this.dragging) {
      //@log_mouse_activity('FINISH A DRAG')
      this.move_node_to_point(this.dragging, point);
      if (this.in_discard_dropzone(this.dragging)) {
        this.run_verb_on_object('discard', this.dragging);
      } else if (this.in_disconnect_dropzone(this.dragging)) {  // TODO rename to shelve_dropzone
        this.run_verb_on_object('shelve', this.dragging);
        // @unselect(@dragging) # this might be confusing
      } else if (this.dragging.links_shown.length === 0) {
        this.run_verb_on_object('choose', this.dragging);
      } else if (this.nodes_pinnable) {
        if (this.editui.is_state('connecting')
            && (this.dragging === this.editui.subject_node)) {
          console.log("not pinning subject_node when dropping");
        } else if (this.dragging.fixed) { // aka pinned
          this.run_verb_on_object('unpin', this.dragging);
        } else {
          this.run_verb_on_object('pin', this.dragging);
        }
      }
      this.dragging = null;
      this.text_cursor.continue();
      return;
    }

    if (this.editui.is_state('connecting')
        && this.focused_node
        && this.editui.object_datatype_is_literal) {
      this.editui.set_subject_node(this.focused_node);
      //console.log("edit mode and focused note and editui is literal")
      this.tick("Tick in mouseup 1");
      return;
    }

    // this is the node being clicked
    if (this.focused_node) {
      this.perform_current_command(this.focused_node);
      this.tick("Tick in mouseup 2");
      return;
    }

    if (this.focused_edge) {
      // FIXME do the edge equivalent of @perform_current_command
      //@update_snippet() # useful when hover-shows-snippet
      this.print_edge(this.focused_edge);
      return;
    }
  }

  log_mouse_activity(label) {
    console.log(label,"\n  dragging", this.dragging,
        "\n  mousedown_point:",this.mousedown_point,
        "\n  @focused_node:", this.focused_node);
  }

  mouseright() {
    d3.event.preventDefault();
    const doesnt_exist = this.focused_node ? true : false;
    if (this.focused_node && doesnt_exist) {
      this.render_node_info_box(this.focused_node);
    }
  }

  render_node_info_box(info_node) {
    let color, width;
    const node_inspector_id = "NODE_INSPECTOR__" + info_node.lid;
    if (info_node._inspector != null) {
      this.hilight_dialog(info_node._inspector);
      return;
    }
    console.log("inspect node:", info_node);
    const all_names = Object.values(info_node.name);
    let names_all_langs = "";
    let note = "";
    let color_headers = "";
    let node_out_links = "";

    for (let name of all_names) {
      if (names_all_langs) {
        names_all_langs = names_all_langs + " -- " + name;
      } else {
        names_all_langs = name;
      }
    }
    let other_types = "";
    if (info_node._types.length > 1) {
      for (let node_type of info_node._types) {
        if (node_type !== info_node.type) {
          if (other_types) {
            other_types = other_types + ", " + node_type;
          } else {
            other_types = node_type;
          }
        }
      }
      other_types = " (" + other_types + ")";
    }
    //console.log info_node
    //console.log info_node.links_from.length
    if (info_node.links_from.length > 0) {
      for (let link_from of info_node.links_from) {
        const [target_prefix, target] = Array.from(this.render_target_for_display(link_from.target));
        node_out_links = node_out_links + `\
<li><i class='fas fa-long-arrow-alt-right'></i>
<a href='${link_from.predicate.id}' target='blank'>${link_from.predicate.lid}</a>
${target_prefix} ${target}
</li>\
`;
      } // """
      node_out_links = "<ul>" + node_out_links + "</ul>";
    }
    //console.log info_node
    if (info_node._colors) {
      width = 100 / info_node._colors.length;
      for (color of info_node._colors) {
        color_headers = color_headers +
          `<div class='subHeader' style='background-color: ${color}; width: ${width}%;'></div>`;
      }
    }
    if (this.endpoint_loader.value) {
      if (this.endpoint_loader.value && info_node.fully_loaded) {
        note = "<p class='note'>Node Fully Loaded</span>";
      } else {
        note = `<p class='note'><span class='label'>Note:</span>
This node may not yet be fully loaded from remote server.
Link details may not be accurate. Activate to load.</i>`; // """
      }
    }

    const dialogArgs = {
      width: this.width * 0.50,
      height: this.height * 0.80,
      top: d3.event.clientY,
      left: d3.event.clientX,
      close: this.close_node_inspector
    };

    if (info_node) {
      dialogArgs.head_bg_color = info_node.color;
      const id_display = this.create_link_if_url(info_node.id);
      const node_info_html = `\
<div class="message_wrapper">
<p class='id_display'><span class='label'>id:</span> ${id_display}</p>
<p><span class='label'>name:</span> ${names_all_langs}</p>
<p><span class='label'>type(s):</span> ${info_node.type} ${other_types}</p>
<p><span class='label'>Links To:</span> ${info_node.links_to.length} <br>
  <span class='label'>Links From:</span> ${info_node.links_from.length}</p>
  ${note}
  ${node_out_links}
</div>\
`; // """

      info_node._inspector = this.make_dialog(node_info_html, node_inspector_id, dialogArgs);
      info_node._inspector.dataset.node_id = info_node.id;
    }
  }

  close_node_inspector(event, ui) {  // fat because it is called by click handler
    const box = event.currentTarget.offsetParent;
    const {
      node_id
    } = box.dataset;
    if (node_id != null) {
      const node = this.all_set.get_by('id', node_id);
      if (node != null) {
        delete node._inspector;
      }
    }
    this.destroy_dialog(event);
  }

  create_link_if_url(possible_link) {
    let target;
    const url_check = possible_link.substring(0,4);
    if (url_check === "http") {
      target = `<a href='${possible_link}' target='blank'>${possible_link}</a>`;
    } else {
      target = possible_link;
    }
    return target;
  }

  render_target_for_display(node) {
    let retval;
    if (node.isLiteral) {
      const typeCURIE = node.type.replace('__',':');
      const lines = node.name.toString().split(/\r\n|\r|\n/);
      const showBlock = (lines.length > 1) || (node.name.toString().length > 30);
      const colon = ":";
      if (showBlock) {
        retval = [colon, `<blockquote title="${typeCURIE}">${node.name}</blockquote>`];
      } else {
        retval = [colon, `<code title="${typeCURIE}">${node.name}</code>`];
      }
    } else {
      const arrow = "<i class='fas fa-long-arrow-alt-right'></i>";
      retval = [arrow, this.create_link_if_url(node.id)];
    }
    return retval;
  }

  perform_current_command(node) {
    if (this.gclui.ready_to_perform()) {
      const cmd = new GraphCommand(this, {
        verbs: this.gclui.engaged_verbs,
        subjects: [node]
      });
      this.run_command(cmd);
    }
    this.clean_up_all_dirt_once();
  }

  run_command(cmd, callback) {
    //@show_state_msg(cmd.as_msg())
    this.gclui.show_working_on(cmd);
    this.gclc.run(cmd, callback);
    this.gclui.show_working_off();
    //@hide_state_msg()
  }

  /////////////////////////////////////////////////////////////////////////////
  // resize-svg-when-window-is-resized-in-d3-js
  //   http://stackoverflow.com/questions/16265123/
  updateWindow() {
    if (!this.container) {
      console.warn('updateWindow() skipped until @container');
      return;
    }
    this.get_container_width();
    this.get_container_height();
    this.update_graph_radius();
    this.update_graph_center();
    this.update_discard_zone();
    this.update_lariat_zone();
    if (this.svg) {
      this.svg.
        attr("width", this.width).
        attr("height", this.height);
    }
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    console.info("must implement d3v4 force.size");
    //@force.size [@mx, @my]
    if (!this.args.skip_log_tick) {
      console.log("Tick in @force.size() updateWindow");
    }
    // FIXME all selectors must be localized so if there are two huviz
    //       instances on a page they do not interact
    const instance_container = this.args.huviz_top_sel;
    $(`${instance_container} .graph_title_set`).css("width", this.width);
    if (this.tabsJQElem && (this.tabsJQElem.length > 0)) {
      this.tabsJQElem.css("left", "auto");
    }
    this.restart();
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  //   http://bl.ocks.org/mbostock/929623
  get_charge(d) {
    const graphed = d.state === this.graphed_set;
    let retval = (graphed && this.charge) || 0;  // zero so shelf has no influence
    if (d.charge != null) {
      retval = d.charge;
    }
    //if retval is 0 and graphed
    //  console.error "bad combo of retval and graphed?",retval,graphed,d.name
    return retval;
  }

  get_gravity() {
    return this.gravity;
  }

  // lines: 5845 5848 5852 of d3.v3.js object to
  //    mouse_receiver.call(force.drag);
  // when mouse_receiver == viscanvas
  init_webgl() {
    this.init();
    this.animate();
  }

  draw_circle(cx, cy, radius, strclr, filclr, start_angle, end_angle, special_focus) {
    const incl_cntr = (start_angle != null) || (end_angle != null);
    start_angle = start_angle || 0;
    end_angle = end_angle || tau;
    if (strclr) {
      this.ctx.strokeStyle = strclr || "blue";
    }
    if (filclr) {
      this.ctx.fillStyle = filclr || "blue";
    }
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, start_angle, end_angle, true);
    this.ctx.closePath();
    if (strclr) {
      this.ctx.stroke();
    }
    if (filclr) {
      this.ctx.fill();
    }
    if (special_focus) { // true if this is a wander or walk highlighted node
      this.ctx.beginPath();
      radius = radius/2;
      this.ctx.arc(cx, cy, radius, 0, Math.PI*2);
      this.ctx.closePath();
      this.ctx.fillStyle = "black";
      this.ctx.fill();
    }
  }

  draw_round_img(cx, cy, radius, strclr, filclr, special_focus, imageData, url) {
    const incl_cntr = (start_angle != null) || (end_angle != null);
    var start_angle = start_angle || 0;
    var end_angle = end_angle || tau;
    if (strclr) {
      this.ctx.strokeStyle = strclr || "blue";
    }
    this.ctx.beginPath();
    if (incl_cntr) {
      this.ctx.moveTo(cx, cy); // so the arcs are wedges not chords
    }
      // do not incl_cntr when drawing a whole circle
    this.ctx.arc(cx, cy, radius, start_angle, end_angle, true);
    this.ctx.closePath();
    if (strclr) {
      this.ctx.stroke();
    }
    if (filclr) {
      this.ctx.fill();
    }
    const wh = radius*2;
    if (imageData != null) {
      // note that drawImage can clip for the centering task
      //   https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
      this.ctx.drawImage(imageData, cx-radius, cy-radius, wh, wh);
    } else {
      const img = new Image();
      img.src = url;
      this.ctx.drawImage(img,
                     0, 0, img.width, img.height,
                     cx-radius, cy-radius, wh, wh);
    }
    if (special_focus) { // true if this is a wander or walk highlighted node
      this.ctx.beginPath();
      radius = radius/2;
      this.ctx.arc(cx, cy, radius, 0, Math.PI*2);
      this.ctx.closePath();
      this.ctx.fillStyle = "black";
      this.ctx.fill();
    }
  }


  draw_triangle(x, y, color, x1, y1, x2, y2) {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.strokeStyle = color;
    this.ctx.lineTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.moveTo(x, y);
    this.ctx.stroke();
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.closePath();
  }

  draw_pie(cx, cy, radius, strclr, filclrs, special_focus) {
    const num = filclrs.length;
    if (!num) {
      throw new Error("no colors specified");
    }
    if (num === 1) {
      this.draw_circle(cx, cy, radius, strclr, filclrs[0],false,false,special_focus);
      return;
    }
    const arc = tau/num;
    let start_angle = 0;
    for (let filclr of filclrs) {
      const end_angle = start_angle + arc;
      this.draw_circle(cx, cy, radius, strclr, filclr, end_angle, start_angle, special_focus);
      start_angle = start_angle + arc;
    }
  }

  draw_line(x1, y1, x2, y2, clr) {
    this.ctx.strokeStyle = clr || 'red';
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  draw_curvedline(x1, y1, x2, y2, sway_inc, clr, num_contexts, line_width, edge, directional_edge) {
    let tip_x, tip_y;
    const pdist = distance([x1,y1],[x2,y2]);
    const sway = this.swayfrac * sway_inc * pdist;
    if (pdist < this.line_length_min) {
      return;
    }
    if (sway === 0) {
      return;
    }
    // sway is the distance to offset the control point from the midline
    const orig_angle = Math.atan2(x2 - x1, y2 - y1);
    const ctrl_angle = (orig_angle + (Math.PI / 2));
    let ang = ctrl_angle;
    ang = orig_angle;
    const check_range = function(val,name) {
      window.maxes = window.maxes || {};
      window.ranges = window.ranges || {};
      const range = window.ranges[name] || {max: -Infinity, min: Infinity};
      range.max = Math.max(range.max, val);
      range.min = Math.min(range.min, val);
    };
    //check_range(orig_angle,'orig_angle')
    //check_range(ctrl_angle,'ctrl_angle')
    const xmid = x1 + ((x2-x1)/2);
    const ymid = y1 + ((y2-y1)/2);
    const xctrl = xmid + (Math.sin(ctrl_angle) * sway);
    const yctrl = ymid + (Math.cos(ctrl_angle) * sway);
    this.ctx.strokeStyle = clr || 'red';
    this.ctx.beginPath();
    this.ctx.lineWidth = line_width;
    this.ctx.moveTo(x1, y1);
    this.ctx.quadraticCurveTo(xctrl, yctrl, x2, y2);
    //@ctx.closePath()
    this.ctx.stroke();

    const xhndl = xmid + (Math.sin(ctrl_angle) * (sway/2));
    const yhndl = ymid + (Math.cos(ctrl_angle)* (sway/2));
    edge.handle = {
      x: xhndl,
      y: yhndl
    };
    this.draw_circle(xhndl, yhndl, (line_width/2), clr); // draw a circle at the midpoint of the line
    if (directional_edge === "forward") {
      tip_x = x2;
      tip_y = y2;
    } else {
      tip_x = x1;
      tip_y = y1;
    }

    // --------- ARROWS on Edges -----------
    if (this.arrows_chosen) {
      let flip;
      const a_l = 8; // arrow length
      const a_w = 2; // arrow width
      const arr_side = Math.sqrt((a_l * a_l) + (a_w * a_w));

      const arrow_color = clr;
      const node_radius = this.calc_node_radius(edge.target);

      const arw_angl = Math.atan((yctrl - y2)/(xctrl - x2));
      const hd_angl = Math.tan(a_w/a_l);
      if (xctrl < x2) { flip = -1; } else { flip = 1; } // Flip sign depending on angle

      const pnt_x =  x2 + (flip * node_radius * Math.cos(arw_angl));
      const pnt_y =  y2 + (flip * node_radius * Math.sin(arw_angl));
      const arrow_base_x = x2 + (flip * (node_radius + a_l) * Math.cos(arw_angl));
      const arrow_base_y = y2 + (flip * (node_radius + a_l) * Math.sin(arw_angl));
      const xo1 = pnt_x + (flip * arr_side * Math.cos(arw_angl + hd_angl));
      const yo1 = pnt_y + (flip * arr_side * Math.sin(arw_angl + hd_angl));
      const xo2 = pnt_x + (flip * arr_side * Math.cos(arw_angl - hd_angl));
      const yo2 = pnt_y + (flip * arr_side * Math.sin(arw_angl - hd_angl));
      this.draw_triangle(pnt_x, pnt_y, arrow_color, xo1, yo1, xo2, yo2);
    }
  }

  draw_self_edge_circle(cx, cy, strclr, length, line_width, e, arw_angle) {
    let node_radius = this.calc_node_radius(e.source);
    const arw_radius = node_radius * 5;
    //if (arw_radius > 75) then arw_radius = 75
    const x_offset =  Math.cos(arw_angle) * arw_radius;
    const y_offset = Math.sin(arw_angle) * arw_radius;
    const cx2 = cx + x_offset;
    const cy2 = cy + y_offset;
    strclr = e.color;
    const filclr = false;
    const start_angle = 0;
    const end_angle = 0;
    const special_focus = false;
    this.draw_circle(cx2, cy2, arw_radius, strclr, filclr, start_angle, end_angle, special_focus);

    const x_arrow_offset = Math.cos(arw_angle) * this.calc_node_radius(e.source);
    const y_arrow_offset = Math.sin(arw_angle) * this.calc_node_radius(e.source);

    const a_l = 8; // arrow length
    const a_w = 2; // arrow width
    const arr_side = Math.sqrt((a_l * a_l) + (a_w * a_w));

    const arrow_color = e.color;
    node_radius = this.calc_node_radius(e.source);

    let arw_angl = arw_angle + 1;
    const x2 = cx;
    const y2 = cy;

    const hd_angl = Math.tan(a_w/a_l); // Adjusts the arrow shape
    const flip = 1;

    arw_angl = arw_angle + 1.45;
    const arrow_adjust = Math.atan(a_l/arw_radius);

    const pnt_x =  x2 + (flip * node_radius * Math.cos(arw_angl));
    const pnt_y =  y2 + (flip * node_radius * Math.sin(arw_angl));

    const arrow_base_x = x2 + (flip * (node_radius + a_l) * Math.cos(arw_angl));
    const arrow_base_y = y2 + (flip * (node_radius + a_l) * Math.sin(arw_angl));
    const xo1 = pnt_x + (flip * arr_side * Math.cos((arw_angl + hd_angl) - arrow_adjust));
    const yo1 = pnt_y + (flip * arr_side * Math.sin((arw_angl + hd_angl) - arrow_adjust));
    const xo2 = pnt_x + (flip * arr_side * Math.cos(arw_angl - hd_angl - arrow_adjust));
    const yo2 = pnt_y + (flip * arr_side * Math.sin(arw_angl - hd_angl - arrow_adjust));
    this.draw_triangle(pnt_x, pnt_y, arrow_color, xo1, yo1, xo2, yo2);
    e.handle = {
      x: cx2 + x_offset,
      y: cy2 + y_offset
    };
    this.draw_circle(e.handle.x, e.handle.y, (line_width/2), arrow_color);
  }

  draw_disconnect_dropzone() {
    this.ctx.save();
    this.ctx.lineWidth = this.graph_radius * 0.1;
    this.draw_circle(this.lariat_center[0], this.lariat_center[1], this.graph_radius, this.renderStyles.shelfColor);
    this.ctx.restore();
  }

  draw_discard_dropzone() {
    this.ctx.save();
    this.ctx.lineWidth = this.discard_radius * 0.1;
    this.draw_circle(this.discard_center[0], this.discard_center[1], this.discard_radius, "", this.renderStyles.discardColor);
    this.ctx.restore();
  }

  draw_dropzones() {
    if (this.dragging) {
      this.draw_disconnect_dropzone();
      this.draw_discard_dropzone();
    }
  }

  in_disconnect_dropzone(node) {
    // is it within the RIM of the disconnect circle?
    const dist = distance(node, this.lariat_center);
    return ((this.graph_radius * 0.9) < dist) && ((this.graph_radius * 1.1) > dist);
  }

  in_discard_dropzone(node) {
    // is it ANYWHERE within the circle?
    const dist = distance(node, this.discard_center);
    return (this.discard_radius * 1.1) > dist;
  }

  init_sets() {
    // #### states are mutually exclusive
    //
    //  * graphed: in the graph, connected to other nodes
    //  * shelved: on the shelf, available for choosing
    //  * discarded: in the discard zone, findable but ignored by show_links_*
    //  * hidden: findable, but not displayed anywhere (when found, will become shelved)
    //  * embryonic: incomplete, not ready to be used
    //
    // #### flags able to co-exist
    //
    // * chosen: (aka Activated) these nodes are graphed and pull other nodes into
    //   the graph with them
    // * selected: the predicates of the edges terminating at these nodes populate the
    //   _predicate picker_ with the label **Edges of the Selected Nodes**
    // * pinned: in the graph and at fixed positions
    // * labelled: these nodes have their name (or id) showing all the time
    // * nameless: these nodes do not have names which are distinct from their urls

    this.nodes = SortedSet().named('all').
      sort_on("id").
      labelled(this.human_term.all);
    this.nodes.docs = `${this.nodes.label} nodes are in this set, regardless of state.`;
    this.all_set = this.nodes;

    this.embryonic_set = SortedSet().named("embryo").
      sort_on("id").
      isFlag();
    this.embryonic_set.docs = `\
Nodes which are not yet complete are 'embryonic' and not yet \
in '${this.all_set.label}'.  Nodes need to have a class and a label to \
no longer be embryonic.`;

    this.chosen_set = SortedSet().named("chosen").
      sort_on("id").
      isFlag().
      labelled(this.human_term.chosen).
      sub_of(this.all_set);
    this.chosen_set.docs = `\
Nodes which the user has specifically '${this.chosen_set.label}' by either \
dragging them into the graph from the surrounding green \
'shelf'. '${this.chosen_set.label}' nodes can drag other nodes into the \
graph if the others are ${this.human_term.hidden} or ${this.human_term.shelved} but \
not if they are ${this.human_term.discarded}.`;
    this.chosen_set.cleanup_verb = 'shelve';

    this.selected_set = SortedSet().named("selected").
      sort_on("id").
      isFlag().
      labelled(this.human_term.selected).
      sub_of(this.all_set);
    this.selected_set.cleanup_verb = "unselect";
    this.selected_set.docs = `\
Nodes which have been '${this.selected_set.label}' using the class picker, \
ie which are highlighted and a little larger.`;

    this.shelved_set = SortedSet().
      named("shelved").
      sort_on('name').
      case_insensitive_sort(true).
      labelled(this.human_term.shelved).
      sub_of(this.all_set).
      isState();
    this.shelved_set.docs = `\
Nodes which are '${this.shelved_set.label}' on the green surrounding 'shelf', \
either because they have been dragged there or released back to there \
when the node which pulled them into the graph was \
'${this.human_term.unchosen}.`;

    this.discarded_set = SortedSet().named("discarded").
      labelled(this.human_term.discarded).
      sort_on('name').
      case_insensitive_sort(true).
      sub_of(this.all_set).
      isState();
    this.discarded_set.cleanup_verb = "shelve"; // TODO confirm this
    this.discarded_set.docs = `\
Nodes which have been '${this.discarded_set.label}' by being dragged into \
the red 'discard bin' in the bottom right corner. \
'${this.discarded_set.label}' nodes are not pulled into the graph when \
nodes they are connected to become '${this.chosen_set.label}'.`;

    this.hidden_set = SortedSet().named("hidden").
      sort_on("id").
      labelled(this.human_term.hidden).
      sub_of(this.all_set).
      isState();
    this.hidden_set.docs = `\
Nodes which are '${this.hidden_set.label}' but can be pulled into \
the graph by other nodes when those become \
'${this.human_term.chosen}'.`;
    this.hidden_set.cleanup_verb = "shelve";

    this.graphed_set = SortedSet().named("graphed").
      sort_on("id").
      labelled(this.human_term.graphed).
      sub_of(this.all_set).
      isState();
    this.graphed_set.docs = `\
Nodes which are included in the central graph either by having been \
'${this.human_term.chosen}' themselves or which are pulled into the \
graph by those which have been.`;
    this.graphed_set.cleanup_verb = "unchoose";

    this.wasChosen_set = SortedSet().named("wasChosen").
      sort_on("id").
      labelled("Was Chosen").
      isFlag(); // membership is not mutually exclusive with the isState() sets
    this.wasChosen_set.docs = `\
Nodes are marked wasChosen by wander__atFirst for later comparison \
with nowChosen.`;

    this.nowChosen_set = SortedSet().named("nowChosen").
      sort_on("id").
      labelled("Now Graphed").
      isFlag(); // membership is not mutually exclusive with the isState() sets
    this.nowChosen_set.docs = `\
Nodes pulled in by @choose() are marked nowChosen for later comparison \
against wasChosen by wander__atLast.`;

    this.pinned_set = SortedSet().named('fixed').
      sort_on("id").
      labelled(this.human_term.fixed).
      sub_of(this.all_set).
      isFlag();
    this.pinned_set.docs = `\
Nodes which are '${this.pinned_set.label}' to the canvas as a result of \
being dragged and dropped while already being '${this.human_term.graphed}'. \
${this.pinned_set.label} nodes can be ${this.human_term.unpinned} by dragging \
them from their ${this.pinned_set.label} location.`;
    this.pinned_set.cleanup_verb = "unpin";

    this.labelled_set = SortedSet().named("labelled").
      sort_on("id").
      labelled(this.human_term.labelled).
      isFlag().
      sub_of(this.all_set);
    this.labelled_set.docs = "Nodes which have their labels permanently shown.";
    this.labelled_set.cleanup_verb = "unlabel";

    this.matched_set = SortedSet().named("matched").
      sort_on("id").
      labelled(this.human_term.matched).
      sub_of(this.all_set).
      isFlag('matched');
    this.matched_set.docs = "Nodes which match the 'matching' search term";

    this.nameless_set = SortedSet().named("nameless").
      sort_on("id").
      labelled(this.human_term.nameless).
      sub_of(this.all_set).
      isFlag('nameless');
    this.nameless_set.docs = "Nodes for which no name is yet known";

    this.links_set = SortedSet().
      named("shown").
      sort_on("id").
      isFlag();
    this.links_set.docs = "Links which are shown.";

    this.walked_set = SortedSet().
      named("walked").
      isFlag().
      labelled(this.human_term.walked).
      sub_of(this.chosen_set).
      sort_on('walkedIdx0'); // sort on index of position in the path; the 0 means zero-based idx
    this.walked_set.docs = "Nodes in order of their walkedness";

    this.suppressed_set = SortedSet().named("suppressed").
      sort_on("id").
      labelled(this.human_term.suppressed).
      sub_of(this.all_set).
      isState();
    this.suppressed_set.docs = `\
Nodes which are '${this.suppressed_set.label}' by a suppression algorithm \
such as Suppress Annotation Entities.  Suppression is mutually exclusive \
with Shelved, Discarded, Graphed and Hidden.`;
    this.suppressed_set.cleanup_verb = "shelve";

    this.predicate_set = SortedSet().named("predicate").isFlag().sort_on("id");
    this.context_set   = SortedSet().named("context").isFlag().sort_on("id");
    this.context_set.docs = "The set of quad contexts.";

    // TODO make selectable_sets drive gclui.build_set_picker
    //      with the nesting data coming from .sub_of(@all) as above
    this.selectable_sets = {
      all_set: this.all_set,
      chosen_set: this.chosen_set,
      discarded_set: this.discarded_set,
      graphed_set: this.graphed_set,
      hidden_set: this.hidden_set,
      labelled_set: this.labelled_set,
      matched_set: this.matched_set,
      nameless_set: this.nameless_set,
      pinned_set: this.pinned_set,
      selected_set: this.selected_set,
      shelved_set: this.shelved_set,
      suppressed_set: this.suppressed_set,
      walked_set: this.walked_set
    };
  }

  get_set_by_id(setId) {
    setId = ((setId === 'fixed') && 'pinned') || setId; // because pinned uses fixed as its 'name'
    return this[setId + '_set'];
  }

  update_all_counts() {
    this.update_set_counts();
    //@update_predicate_counts()
  }

  update_predicate_counts() {
    console.warn('the unproven method update_predicate_counts() has just been called');
    for (let a_set of this.predicate_set) {
      const name = a_set.lid;
      this.gclui.on_predicate_count_update(name, a_set.length);
    }
  }

  update_set_counts() {
    for (let name in this.selectable_sets) {
      const a_set = this.selectable_sets[name];
      this.gclui.on_set_count_update(name, a_set.length);
    }
  }

  create_taxonomy() {
    // The taxonomy is intertwined with the taxon_picker
    this.taxonomy = {};  // make driven by the hierarchy
  }

  summarize_taxonomy() {
    let out = "";
    const tree = {};
    for (let id in this.taxonomy) {
      const taxon = this.taxonomy[id];
      out += `${id}: ${taxon.state}\n`;
      tree[id] = taxon.state;
    }
    return tree;
  }

  regenerate_english() {
    const root = 'Thing';
    if (this.taxonomy[root] != null) { // TODO this should be the ROOT, not literally Thing
      this.taxonomy[root].update_english();
    } else {
      console.log(`not regenerating english because no taxonomy[${root}]`);
    }
  }

  get_or_create_taxon(taxon_url) {
    const taxon_id = taxon_url;
    if ((this.taxonomy[taxon_id] == null)) {
      let label;
      const taxon = new Taxon(taxon_id);
      this.taxonomy[taxon_id] = taxon;
      const parent_lid = this.ontology.subClassOf[taxon_id] || this.HHH[taxon_id] || 'Thing';
      if (parent_lid != null) {
        const parent = this.get_or_create_taxon(parent_lid);
        taxon.register_superclass(parent);
        label = this.ontology.label[taxon_id];
      }
      this.gclui.add_taxon(taxon_id, parent_lid, label, taxon); // FIXME should this be an event on the Taxon constructor?
    }
    return this.taxonomy[taxon_id];
  }

  update_labels_on_pickers() {
    for (let term_id in this.ontology.label) {
      // a label might be for a taxon or a predicate, so we must sort out which
      const term_label = this.ontology.label[term_id];
      if (this.gclui.taxon_picker.id_to_name[term_id] != null) {
        this.gclui.taxon_picker.set_name_for_id(term_label, term_id);
      }
      if (this.gclui.predicate_picker.id_to_name[term_id] != null) {
        this.gclui.predicate_picker.set_name_for_id(term_label, term_id);
      }
    }
  }

  toggle_taxon(id, hier, callback) {
    let left;
    if (callback != null) {
      this.gclui.set_taxa_click_storm_callback(callback);
    }
    // TODO preserve the state of collapsedness?
    hier = (left = (hier != null)) != null ? left : {hier : true}; // default to true
    if (hier) {
      this.gclui.taxon_picker.collapse_by_id(id);
    }
    this.topJQElem.find(`#${id}`).trigger("click");
    if (hier) {
      this.gclui.taxon_picker.expand_by_id(id);
    }
  }

  do(args) {
    const cmd = new GraphCommand(this, args);
    this.gclc.run(cmd);
  }

  reset_data() {
    // TODO fix gclc.run so it can handle empty sets
    if (this.discarded_set.length) {
      this.do({verbs: ['shelve'], sets: [this.discarded_set.id]});
    }
    if (this.graphed_set.length) {
      this.do({verbs: ['shelve'], sets: [this.graphed_set.id]});
    }
    if (this.hidden_set.length) {
      this.do({verbs: ['shelve'], sets: [this.hidden_set.id]});
    }
    if (this.selected_set.length) {
      this.do({verbs: ['unselect'], sets: [this.selected_set.id]});
    }
    this.gclui.reset_editor();
    this.gclui.select_the_initial_set();
  }

  perform_tasks_after_dataset_loaded() {
    this.gclui.select_the_initial_set();
    if (!this.args.skip_discover_names) {
      this.discover_names();
    }
  }

  reset_graph() {
    this.G = {}; // is this deprecated?
    this.init_sets();
    this.init_gclc();
    this.init_editc_or_not();
    this.indexed_dbservice();  // REVIEW is this needed?
    this.init_indexddbstorage(); // REVIEW and this?

    this.d3simulation.nodes(this.graphed_set || []);
    this.update_d3links();
    this.d3links = d3.forceLink().links(this.links_set);
    this.update_d3forceManyBody();
    this.d3simulation.force('charge', this.d3forceManyBody);
    this.d3simulation.force('center', d3.forceCenter(this.width/2,this.height/2));
    this.d3simulation.force('link', this.d3links);
    //@d3simulation.forceCollide(() => 20)

    if (!this.args.skip_log_tick) {
      console.log("Tick in @force.nodes() reset_graph");
    }

    this.reset_svg();
    this.sim_restart();
    if (!this.args.skip_log_tick) {
      console.log("Tick in @force.start() reset_graph2");
    }
  }

  update_d3forceManyBody() {
    console.warn("distanceMax", this.distanceMax);
    this.d3forceManyBody = d3.forceManyBody().strength(-50).distanceMax(this.distanceMax);
  }

  d3simulation_shake(spazLevel) {
    if (spazLevel == null) { spazLevel = .4; }
    if (this.d3simulation != null) {
      this.d3simulation.alpha(spazLevel).restart();
    }
  }

  reset_svg() {
    console.debug('@reset_svg() is a NOOP');
    return;
    // TODO move this SVG code to own renderer
    d3.select(`${this.args.huviz_top_sel} .link`).remove();
    d3.select(`${this.args.huviz_top_sel} .node`).remove();
    d3.select(`${this.args.huviz_top_sel} .lariat`).remove();
    this.node = this.svg.selectAll(`${this.args.huviz_top_sel} .node`);
    this.link = this.svg.selectAll(`${this.args.huviz_top_sel} .link`); // looks bogus, see @link assignment below
    this.lariat = this.svg.selectAll(`${this.args.huviz_top_sel} .lariat`);
    this.link = this.link.data(this.links_set);
    this.link.exit().remove();
    this.node = this.node.data(this.nodes);
    this.node.exit().remove();
  }

  set_node_radius_policy(evt) {
    // TODO(shawn) remove or replace this whole method
    const f = $("select#node_radius_policy option:selected").val();
    if (!f) { return; }
    if (typeof f === typeof "str") {
      this.node_radius_policy = node_radius_policies[f];
    } else if (typeof f === typeof this.set_node_radius_policy) {
      this.node_radius_policy = f;
    }
  }

  DEPRECATED_init_node_radius_policy() {
    const policy_box = d3.select("#huvis_controls").append("div", "node_radius_policy_box");
    const policy_picker = policy_box.append("select", "node_radius_policy");
    policy_picker.on("change", set_node_radius_policy);
    for (let policy_name in node_radius_policies) {
      policy_picker.append("option").attr("value", policy_name).text(policy_name);
    }
  }

  calc_node_radius(d) {
    const total_links = d.links_to.length + d.links_from.length;
    const diff_adjustment = 10 * (total_links/(total_links+9));
    const final_adjustment =  this.node_diff * (diff_adjustment - 1);
    if (d.radius != null) {
      return d.radius;
    }
    return (this.node_radius * (((d.selected == null) && 1) || this.selected_mag)) + final_adjustment;
  }

  names_in_edges(set) {
    const out = [];
    set.forEach((itm, i) => out.push(itm.source.name + " ---> " + itm.target.name));
    return out;
  }

  dump_details(node) {
    if (!window.dump_details) { return; }
    //
    //    if (! DUMP){
    //      if (node.s.id != '_:E') return;
    //    }
    //
    console.log("=================================================");
    console.log(node.name);
    console.log("  x,y:", node.x, node.y);
    try {
      console.log("  state:", node.state.state_name, node.state);
    } catch (error) {}
    console.log("  chosen:", node.chosen);
    console.log("  fisheye:", node.fisheye);
    console.log("  fixed:", node.fixed);
    console.log("  links_shown:", node.links_shown.length, this.names_in_edges(node.links_shown));
    console.log("  links_to:", node.links_to.length, this.names_in_edges(node.links_to));
    console.log("  links_from:", node.links_from.length, this.names_in_edges(node.links_from));
    console.log("  showing_links:", node.showing_links);
    console.log("  in_sets:", node.in_sets);
  }

   // Return the nodes which can be seen and are worth checking for proximity, etc.
  is_node_visible(node) {
    // TODO add check against suppressed too
    return !this.hidden_set.has(node);
  }

  // Return an array (not a SortedSet) of nodes which are visible
  get_visible_subset(super_set) {
    if (super_set == null) { super_set = this.all_set; }
    const retlist = [];
    for (let node of super_set) {
      if (this.is_node_visible(node)) {
        retlist.push(node);
      }
    }
    return super_set;
  }

  // # References:
  // https://github.com/d3/d3-quadtree
  //
  // # Examples
  //
  // * http://bl.ocks.org/patricksurry/6478178
  // * https://bl.ocks.org/mbostock/9078690
  //
  // # Status
  //
  // Having trouble getting access to the addAll method
  find_node_or_edge_closest_to_pointer_using_quadtrees() {
    var visibleNodes = this.get_visible_subset();
    var visibleEdges = this.links_set;
    var numVisible = visibleNodes.length;

    let seeking = null; // holds property name of the thing we are seeking: 'focused_node'/'object_node'/null
    if (this.dragging) {
      if (!this.editui.is_state('connecting')) {
        return;
      }
      seeking = "object_node";
    } else {
      seeking = "focused_node";
    }

    const getXfromNodeOrEdge = (d) => {
      if (d.handle) { return d.handle.x; } // for edges
      return d.x || 0;                     // for nodes
    };
    const getYfromNodeOrEdge = (d) => {
      if (d.handle) { return d.handle.y; }
      return d.y || 0;
    };
    const quadtree = d3.quadtree(). // define a quadtree
          x( getXfromNodeOrEdge ).
          y( getYfromNodeOrEdge );
    visibleNodes.forEach((n) => {   // add all visible nodes
      return quadtree.add(n);
    });
    visibleEdges.forEach((e) => {   // and all visible edges
      return quadtree.add(e);
    });
    const [mx, my] = this.last_mouse_pos;
    const found = quadtree.find(mx, my, this.focus_threshold); // find closest node or edge within threshold
    var new_focused_edge = null;
    var new_focused_node = null;
    if (found) {
      if (found.constructor.name == 'Node') {
        new_focused_node = found;
      } else {
        new_focused_edge = found;
        seeking = null; // we found an edge, not a node
      }
      if (this.draw_circle_around_focused) {
        this.draw_circle(getXfromNodeOrEdge(found), getYfromNodeOrEdge(found), this.node_radius * 3, "red");
      }
    }
    // if (!this.should_display_labels_as('boxNGs')) {
      this.set_focused_node(new_focused_node);
    // }
    this.set_focused_edge(new_focused_edge);

    if (seeking === 'object_node') {
      this.editui.set_object_node(new_focused_node);
    }
    this.highwater('find_node_or_edge');
  }

  DEFUNCT_find_node_or_edge_closest_to_pointer_using_d3() {
    // FIXME re-examine whether this operation should be performed when boxNGs
    if (this.should_display_labels_as('boxNGs')) {
      return;
    }
    const [x,y] = Array.from(this.last_mouse_pos);
    const closest_node = this.d3simulation.find(x, y, this.focus_threshold);
    if (closest_node) {
      this.set_focused_node(closest_node);
    }
  }

  DEFUNCT_find_node_or_edge_closest_to_pointer() {
    this.highwater('find_node_or_edge', true);
    let new_focused_node = null;
    let new_focused_edge = null;
    let new_focused_idx = null;
    let { focus_threshold } = this;
    let closest_dist = this.width;
    let closest_point = null;

    let seeking = null; // holds property name of the thing we are seeking: 'focused_node'/'object_node'/false
    if (this.dragging) {
      if (!this.editui.is_state('connecting')) {
        return;
      }
      seeking = "object_node";
    } else {
      seeking = "focused_node";
    }

    // TODO build a spatial index!!!! OMG https://github.com/smurp/huviz/issues/25
    // Examine every node to find the closest one within the focus_threshold
    this.all_set.forEach((d, i) => {
      const n_dist = distance(d.fisheye || d, this.last_mouse_pos);
      //console.log(d)
      if (n_dist < closest_dist) {
        closest_dist = n_dist;
        closest_point = d.fisheye || d;
      }
      if (!((seeking === 'object_node') && this.dragging && (this.dragging.id === d.id))) {
        if (n_dist <= focus_threshold) {
          new_focused_node = d;
          focus_threshold = n_dist;
          return new_focused_idx = i;
        }
      }
    });

    // Examine the center of every edge and make it the new_focused_edge
    //   if close enough and the closest thing
    this.links_set.forEach((e, i) => {
      if (e.handle != null) {
        const e_dist = distance(e.handle, this.last_mouse_pos);
        if (e_dist < closest_dist) {
          closest_dist = e_dist;
          closest_point = e.handle;
        }
        if (e_dist <= focus_threshold) {
          let new_focused_edge_idx;
          new_focused_edge = e;
          focus_threshold = e_dist;
          return new_focused_edge_idx = i;
        }
      }
    });

    if (new_focused_edge) { // the mouse is closer to an edge than a node
      new_focused_node = null;
      seeking = null;
    }

    if (closest_point) {
      if (this.draw_circle_around_focused) {
        this.draw_circle(closest_point.x, closest_point.y, this.node_radius * 3, "red");
      }
    }

    if (!this.should_display_labels_as('boxNGs')) {
      this.set_focused_node(new_focused_node);
    }
    this.set_focused_edge(new_focused_edge);

    if (seeking === 'object_node') {
      this.editui.set_object_node(new_focused_node);
    }
    this.highwater('find_node_or_edge');
  }

  highwater_incr(id) {
    if (this.highwatermarks == null) { this.highwatermarks = {}; }
    const hwm = this.highwatermarks;
    hwm[id] = (((hwm[id] != null) && hwm[id]) || 0) + 1;
  }

  highwater(id, start) {
    if (this.highwatermarks == null) { this.highwatermarks = {}; }
    const hwm = this.highwatermarks;
    if (start != null) {
      hwm[id + '__'] = performance.now();
    } else {
      const diff = performance.now() - hwm[id + '__'];
      if (hwm[id] == null) { hwm[id] = diff; }
      if (hwm[id] < diff) {
        hwm[id] = diff;
      }
    }
  }

  set_focused_node(node) { // node might be null
    if (node && node.focused_node) {
      this.show_message_once(`set_focused_node(${node.id}) ` + node.focused_node && "already");
    }
    if (node === false) {
      throw new Error('node should be null not false');
    }
    if (this.focused_node === node) {
      return; // no change so skip
    }
    if (this.focused_node) {
      // unfocus the previously focused_node
      if (this.use_svg) {
        d3.select(".focused_node").classed("focused_node", false);
      }
      //@unscroll_pretty_name(@focused_node)
      this.focused_node.focused_node = null;
    }
    if (node) {
      if (this.use_svg) {
        const svg_node = node[0][new_focused_idx];
        d3.select(svg_node).classed("focused_node", true);
      }
      node.focused_node = true;
    }
    this.focused_node = node || null; // ensure null is the new value if no node
    if (this.focused_node) {
      this.gclui.engage_transient_verb_if_needed("select"); // select is default verb
    } else {
      this.gclui.disengage_transient_verb_if_needed();
    }
  }

  set_focused_edge(new_focused_edge) {
    if (this.proposed_edge && this.focused_edge) { // TODO why bail now???
      return;
    }
    //console.log "set_focused_edge(#{new_focused_edge and new_focused_edge.id})"
    if (this.focused_edge === new_focused_edge) {
      return; // no change so skip
    }
    if (this.focused_edge != null) { //and @focused_edge isnt new_focused_edge
      //console.log "removing focus from previous focused_edge"
      this.focused_edge.focused = false;
      delete this.focused_edge.source.focused_edge;
      delete this.focused_edge.target.focused_edge;
    }
    if (new_focused_edge != null) {
      // FIXME add use_svg stanza as in set_focused_node
      new_focused_edge.focused = true;
      new_focused_edge.source.focused_edge = true;
      new_focused_edge.target.focused_edge = true;
    }
    this.focused_edge = new_focused_edge; // blank it or set it
    if (!this.use_fancy_cursor) {
      return;
    }
    if (this.focused_edge != null) {
      if (this.editui.is_state('connecting')) {
        this.text_cursor.pause("", "edit this edge");
      } else {
        this.text_cursor.pause("", "show edge sources");
      }
    } else {
      this.text_cursor.continue();
    }
     //initialization (no proposed edge active)
  }
  set_proposed_edge(new_proposed_edge) {
    console.info("Setting proposed edge...", new_proposed_edge);
    if (this.proposed_edge) {
      delete this.proposed_edge.proposed; // remove .proposed flag from old one
    }
    if (new_proposed_edge) {
      new_proposed_edge.proposed = true; // flag the new one
    }
    this.proposed_edge = new_proposed_edge; // might be null
    this.set_focused_edge(new_proposed_edge); // a proposed_edge also becomes focused
  }

  install_update_pointer_togglers() {
    console.warn("the update_pointer_togglers are being called too often");
    d3.select("#huvis_controls").on("mouseout", this.mouseout_of_huviz_controls);
    d3.select("#huvis_controls").on("mouseover", this.mouseover_of_huviz_controls);
  }

  mouseout_of_huviz_controls() {
    this.update_pointer = true;
    this.text_cursor.continue();
  }

  mouseover_of_huviz_controls() {
    this.update_pointer = false;
    this.text_cursor.pause("default");
  }

  DEPRECATED_adjust_cursor() {
    // http://css-tricks.com/almanac/properties/c/cursor/
    let next;
    if (this.focused_node) {
      next = this.showing_links_to_cursor_map[this.focused_node.showing_links];
    } else {
      next = 'default';
    }
    this.text_cursor.set_cursor(next);
  }

  set_cursor_for_verbs(verbs) {
    if (!this.use_fancy_cursor) {
      return;
    }
    const text = [verbs.map((verb) => this.human_term[verb])].join("\n");
    if (this.last_cursor_text !== text) {
      this.text_cursor.set_text(text);
      this.last_cursor_text = text;
    }
  }

  auto_change_verb() {
    if (this.focused_node) {
      this.gclui.auto_change_verb_if_warranted(this.focused_node);
    }
  }

  get_focused_node_and_its_state() {
    const focused = this.focused_node;
    if (!focused) {
      return;
    }
    let retval = (focused.lid || '') + ' ';
    if ((focused.state == null)) {
      const msg = retval + ' has no state!!! This is unpossible!!!! name:';
      if (focused._warnings == null) { focused._warnings = {}; }
      if (!focused._warnings[msg]) {
        // warn each unique message once
        console.warn(msg, focused.name);
        focused._warnings[msg] = true;
      }
      return;
    }
    retval += focused.state.id;
    return retval;
  }

  on_tick_change_current_command_if_warranted() {
    // It is warranted if we are hovering over nodes and the last state and this state differ.
    // The status of the current command might change even if the mouse has not moved, because
    // for instance the graph has wiggled around under a stationary mouse.  For that reason
    // it is legit to go to the trouble of updating the command on the tick.  When though?
    // The command should be changed if one of a number of things has changed since last tick:
    //  * the focused node
    //  * the state of the focused node
    if (this.prior_node_and_state !== this.get_focused_node_and_its_state()) { // ie if it has changed
      if (this.gclui.engaged_verbs.length) {
        const nodes = ((this.focused_node != null) && [this.focused_node]) || [];
        this.gclui.prepare_command(
          this.gclui.new_GraphCommand({verbs: this.gclui.engaged_verbs, subjects: nodes}));
      }
    }
  }

  position_nodes_by_force() {
    const only_move_subject = this.editui.is_state('connecting') && this.dragging && this.editui.subject_node;
    this.nodes.forEach((node, i) => {
      return this.reposition_node_by_force(node, only_move_subject);
    });
  }

  reposition_node_by_force(node, only_move_subject) {
    if (this.dragging === node) {
      this.move_node_to_point(node, this.last_mouse_pos);
    }
    if (only_move_subject) {
      return;
    }
    if (!this.graphed_set.has(node)) {  // slower
    //if node.showing_links is 'none' # faster
      return;
    }
    if (!node.x || (!node.y && false)) {
      node.x = node.px;
      node.y = node.py;
    }
    node.fisheye = this.fisheye(node);
  }

  apply_fisheye() {
    this.links_set.forEach(e => {
      if (!e.target.fisheye) {
        return e.target.fisheye = this.fisheye(e.target);
      }
    });

    if (this.use_svg) {
      link.attr("x1", d => d.source.fisheye.x).attr("y1", d => d.source.fisheye.y).attr("x2", d => d.target.fisheye.x).attr("y2", d => d.target.fisheye.y);
    }
  }
  show_message_once(msg, alert_too) {
    if (this.shown_messages.indexOf(msg) === -1) {
      this.shown_messages.push(msg);
      console.log(msg);
      if (alert_too) {
        alert(msg);
      }
    }
  }

  draw_edges_from(node) {
    let e, n_n;
    const num_edges = node.links_to.length;
    //@show_message_once "draw_edges_from(#{node.id}) "+ num_edges
    if (!num_edges) {
      return;
    }

    const draw_n_n = {};
    for (e of node.links_shown) {
      let msg = "";
      //if e.source is node
        //continue
      if (e.source.embryo) {
        msg += `source ${e.source.name} is embryo ${e.source.id}; `;
        msg += e.id + " ";
      }
      if (e.target.embryo) {
        msg += `target ${e.target.name} is embryo ${e.target.id}`;
      }
      if (msg !== "") {
        //@show_message_once(msg)
        continue;
      }
      n_n = e.source.lid + " " + e.target.lid;
      if ((draw_n_n[n_n] == null)) {
        draw_n_n[n_n] = [];
      }
      draw_n_n[n_n].push(e);
    }
      //@show_message_once("will draw edge() n_n:#{n_n} e.id:#{e.id}")
    const {
      edge_width
    } = this;
    for (n_n in draw_n_n) {
      const edges_between = draw_n_n[n_n];
      let sway = 1;
      for (e of edges_between) {
        //console.log e
        var line_width;
        if ((e.focused != null) && e.focused) {
          line_width = this.edge_width * this.peeking_line_thicker;
        } else {
          line_width = edge_width;
        }
        line_width = line_width + (this.line_edge_weight * e.contexts.length);
        //@show_message_once("will draw line() n_n:#{n_n} e.id:#{e.id}")
        if ((e.source.fisheye.x === e.target.fisheye.x) && (e.source.fisheye.y === e.target.fisheye.y)) {
          const x2 = this.width/2; // Find centre of draw area
          const y2 = this.height/2;
          //arw_angle = Math.atan((e.source.fisheye.y - y2)/(e.source.fisheye.x - x2)) # find angle between node center and draw area center
          let arw_angle = Math.atan((e.source.fisheye.y - y2)/(e.source.fisheye.x - x2));
          //console.log arw_angle
          //console.log (e.source.fisheye.y - y2)/(e.source.fisheye.x - x2)
          if (x2 > e.source.fisheye.x) { arw_angle = arw_angle + 3; }
          this.draw_self_edge_circle(e.source.fisheye.x, e.source.fisheye.y, e.color, e.contexts.length, line_width, e, arw_angle);
        } else {
          this.draw_curvedline(e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x,
                           e.target.fisheye.y, sway, e.color, e.contexts.length, line_width, e);
        }

        if (node.walked) { // ie is part of the walk path
          this.draw_walk_edge_from(node, e, sway);
        }
        sway++;
      }
    }
  }

  draw_walk_edge_from(node, edge, sway) {
    //if this line from path node to path node then add black highlight
    if (this.edgeIsOnWalkedPath(edge)) {
      const directional_edge = ((edge.source.walkedIdx0 > edge.source.walkedIdx0) && 'forward') || 'backward';
      const e = edge;
      if (directional_edge) {
        this.draw_curvedline(e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x,
                         e.target.fisheye.y, sway, "black", e.contexts.length, 1, e, directional_edge);
      }
    }
  }

  draw_edges() {
    if (!this.show_edges) {
      return;
    }
    if (this.use_canvas) {
      this.graphed_set.forEach((node, i) => {
        return this.draw_edges_from(node);
      });
    }
    if (this.use_webgl) {
      let dx = this.width * xmult;
      let dy = this.height * ymult;
      dx = -1 * this.cx;
      dy = -1 * this.cy;
      this.links_set.forEach(e => {
        //e.target.fisheye = @fisheye(e.target)  unless e.target.fisheye
        if (!e.gl) { this.add_webgl_line(e); }
        const l = e.gl;

        //
        //	  if (e.source.fisheye.x != e.target.fisheye.x &&
        //	      e.source.fisheye.y != e.target.fisheye.y){
        //	      alert(e.id + " edge has a length");
        //	  }
        //
        this.mv_line(l, e.source.fisheye.x, e.source.fisheye.y, e.target.fisheye.x, e.target.fisheye.y);
        return this.dump_line(l);
      });
    }
    if (this.use_webgl && false) {
      this.links_set.forEach((e, i) => {
        if (!e.gl) { return; }
        const v = e.gl.geometry.vertices;
        v[0].x = e.source.fisheye.x;
        v[0].y = e.source.fisheye.y;
        v[1].x = e.target.fisheye.x;
        return v[1].y = e.target.fisheye.y;
      });
    }
  }

  draw_nodes_in_set(set, radius, center) {
    // cx and cy are local here TODO(smurp) rename cx and cy
    const cx = center[0];
    const cy = center[1];
    const num = set.length;
    set.forEach((node, i) => {
      //clockwise = false
      // 0 or 1 starts at 6, 0.5 starts at 12, 0.75 starts at 9, 0.25 starts at 3
      let rad;
      const start = 1 - this.nodeOrderAngle;
      if (this.display_shelf_clockwise) {
        rad = tau * (start - (i / num));
      } else {
        rad = tau * ((i / num) + start);
      }
      node.rad = rad;
      node.x = cx + (Math.sin(rad) * radius);
      node.y = cy + (Math.cos(rad) * radius);
      node.fisheye = this.fisheye(node);
      if (this.use_canvas) {
        const filclrs = this.get_node_color_or_color_list(
          node, this.renderStyles.nodeHighlightOutline);
        this.draw_pie(node.fisheye.x, node.fisheye.y,
                  this.calc_node_radius(node),
                  node.color || "yellow",
                  filclrs);
      }
      if (this.use_webgl) {
        return this.mv_node(node.gl, node.fisheye.x, node.fisheye.y);
      }
    });
  }

  draw_discards() {
    this.draw_nodes_in_set(this.discarded_set, this.discard_radius, this.discard_center);
  }

  draw_shelf() {
    this.draw_nodes_in_set(this.shelved_set, this.graph_radius, this.lariat_center);
  }

  draw_nodes() {
    if (this.use_svg) {
      node.attr("transform", (d, i) => "translate(" + d.fisheye.x + "," + d.fisheye.y + ")").attr("r", calc_node_radius);
    }
    if (this.use_canvas || this.use_webgl) {
      this.graphed_set.forEach((d, i) => {
        let x, y;
        d.fisheye = this.fisheye(d);
        //console.log d.name.NOLANG
        if (this.use_canvas) {
          let filclr, imgUrl, special_focus;
          const node_radius = this.calc_node_radius(d);
          let stroke_color = d.color || 'yellow';
          if (d.chosen != null) {
            stroke_color = this.renderStyles.nodeHighlightOutline;
            // if the node d is in the @walked_set it needs special_focus
            special_focus = !!d.walked;  // "not not" forces boolean
          }
          // if 'pills' is selected; change node shape to rounded squares
          if (!this.should_display_labels_as('boxNGs')) {
            if (d.boxNG) {
              this.remove_boxNG(d);
            }
          }
          if (this.should_display_labels_as('pills')) {
            const pill_width = node_radius * 2;
            const pill_height = node_radius * 2;
            filclr = this.get_node_color_or_color_list(d);
            const rndng = 1;
            ({
              x
            } = d.fisheye);
            ({
              y
            } = d.fisheye);
            this.rounded_rectangle(x, y,
                      pill_width,
                      pill_height,
                      rndng,
                      stroke_color,
                      filclr);
          } else if (this.show_images_in_nodes &&
              (imgUrl = (d.__thumbnail || this.args.default_node_url))) {
            let imageData;
            try {
              imageData = this.get_or_create_round_img(imgUrl);
            } catch (e) {
              console.error(e);
            }
            this.draw_round_img(
              d.fisheye.x, d.fisheye.y,
              node_radius,
              stroke_color,
              filclr,
              special_focus,
              imageData,
              imgUrl);
          } else {
            this.draw_pie(d.fisheye.x, d.fisheye.y,
                      node_radius,
                      stroke_color,
                      this.get_node_color_or_color_list(d),
                      special_focus);
          }
        }
        if (this.use_webgl) {
          return this.mv_node(d.gl, d.fisheye.x, d.fisheye.y);
        }
      });
    }
  }

  get_node_color_or_color_list(n, default_color) {
    if (default_color == null) { default_color = 'black'; }
    if (this.color_nodes_as_pies && n._types && (n._types.length > 1)) {
      this.recolor_node(n, default_color);
      return n._colors;
    }
    return [n.color || default_color];
  }

  get_or_create_round_img(url) {
    let img, roundImage;
    if (this.round_img_cache == null) { this.round_img_cache = {}; }
    const display_image_size = 128;
    if (!(img = this.round_img_cache[url])) {
      const imgId = this.unique_id('round_img_');
      roundImage = document.createElement('img');
      const round_image_maker = document.createElement("CANVAS");
      round_image_maker.width = display_image_size; // size of ultimate image
      round_image_maker.height = display_image_size;
      const ctx = round_image_maker.getContext("2d");

      const origImage = new Image();
      origImage.crossOrigin = "Anonymous";
      origImage.src = url; // path to image file

      origImage.onload = function() {  // When image is loaded create a new round image
        let h, w, x, y;
        ctx.beginPath();
        // This needs to be half the size of height/width to fill canvas area
        ctx.arc(display_image_size/2, display_image_size/2,
                display_image_size/2, 0, 2 * Math.PI, false);
        ctx.clip();
        ctx.fillStyle = this.renderStyles.pageBg;
        ctx.fill();

        if (origImage.width > origImage.height) {  // Landscape image
          w = Math.round((origImage.width * display_image_size)/origImage.height);
          h = Math.round(display_image_size);
          x = - Math.round((w - h)/2);
          y = 0;
        } else { // Portrait image
          w = Math.round(display_image_size);
          h = Math.round((origImage.height * display_image_size)/origImage.width);
          x = 0;
          y = Math.round((w - h)/2);
        }
        ctx.drawImage(origImage, x, y, w, h); // This just paints the image as is
        return roundImage.src = round_image_maker.toDataURL();
      };
      this.round_img_cache[url] = roundImage;
    }
    return roundImage;
  }

  update_bub_txt(d) {
    let max_line_length, width_default;
    const text = d.pretty_name;
    const label_measure = this.ctx.measureText(text); //this is total length of text (in ems?)
    const browser_font_size = 12.8; // -- Setting or auto from browser?
    const focused_font_size = this.label_em * browser_font_size * this.focused_mag;
    const padding = focused_font_size * 0.5;
    const line_height = focused_font_size * 1.25; // set line height to 125%
    const max_len = 300;
    const min_len = 100;
    const label_length = label_measure.width + (2 * padding);
    const num_lines_raw = label_length/max_len;
    const num_lines = (Math.floor(num_lines_raw)) + 1;
    if (num_lines > 1) {
      width_default = (this.label_em * label_measure.width)/num_lines;
    } else {
      width_default = max_len;
    }
    const bubble_text = [];
    const text_cuts = [];
    let ln_i = 0;
    bubble_text[ln_i] = "";
    if (label_length < (width_default + (2 * padding))) { // single line label
      max_line_length = label_length - padding;
    } else { // more than one line so calculate how many and create text lines array
      const text_split = text.split(' '); // array of words
      max_line_length = 0;
      for (let i = 0; i < text_split.length; i++) {
        const word = text_split[i];
        const word_length = this.ctx.measureText(word); //Get length of next word
        const line_length = this.ctx.measureText(bubble_text[ln_i]); //Get current line length
        const new_line_length = word_length.width + line_length.width; //add together for testing
        if (new_line_length < width_default) { //if line length is still less than max
          bubble_text[ln_i] = bubble_text[ln_i] + word + " "; //add word to bubble_text
        } else { //new line needed
          text_cuts[ln_i] = i;
          const real_line_length = this.ctx.measureText(bubble_text[ln_i]);
          const new_line_width = real_line_length.width;
          if (new_line_width > max_line_length) { // remember longest line lengthth
            max_line_length = real_line_length.width;
          }
          ln_i++;
          bubble_text[ln_i] = word + " ";
        }
      }
    }
    const width = max_line_length + (2 * padding); //set actual width of box to longest line of text
    const height = ((ln_i + 1) * line_height) + (2 * padding); // calculate height using wrapping text
    const font_size = this.label_em;
    //console.log text
    //console.log "focused_font_size: " + focused_font_size
    //console.log "line height: " + line_height
    //console.log "padding: " + padding
    //console.log "label_length: " + label_length
    //console.log "bubble height: " + height
    //console.log "max_line_length: " + max_line_length
    //console.log "bubble width: " + width
    //console.log "bubble cut points: "
    //console.log text_cuts
    d.bub_txt = [width, height, line_height, text_cuts, font_size];
  }

  should_show_label(node) {
    return (
      node.labelled || // cheap tests come early
      node.focused_edge || // show labels on nodes if they have a focused_edge
      node.matched || // show labels on nodes in the matched set
      (this.label_graphed && (node.state === this.graphed_set)) || // show graphed nodes when label_graphed
      dist_lt(this.last_mouse_pos, node, this.label_show_range));
  }

  draw_labels() {
    if (this.use_svg) {
      label.attr("style", function(d) {
        if (this.should_show_label(d)) {
          return "";
        } else {
          return "display:none";
        }
      });
    }

    if (this.use_canvas || this.use_webgl) {
      // http://stackoverflow.com/questions/3167928/drawing-rotated-text-on-a-html5-canvas
      // http://diveintohtml5.info/canvas.html#text
      // http://stackoverflow.com/a/10337796/1234699

      // REVIEW remove these variables if they are not used
      const focused_font_size = this.label_em * this.focused_mag;
      const focused_font = `${focused_font_size}em sans-serif`;
      const unfocused_font = `${this.label_em}em sans-serif`;
      const focused_pill_font = `${this.label_em}em sans-serif`;

      const label_node = node => {
        if (!this.should_show_label(node)) {
          if (node.boxNG) {
            this.remove_boxNG(node);
          }
          return;
        }
        const {
          ctx
        } = this;
        ctx.textBaseline = "middle";
        // perhaps scrolling should happen here
        //if not @display_labels_as and (node.focused_node or node.focused_edge?)
        if (node.focused_node || (node.focused_edge != null)) {
          const label = this.scroll_pretty_name(node);
          ctx.fillStyle = node.color;
          ctx.font = focused_font;
        } else {
          ctx.fillStyle = this.renderStyles.labelColor; //"white" is default
          ctx.font = unfocused_font;
        }
        if ((node.fisheye == null)) {
          return;
        }

        let flip_point = this.cx;
        if  (this.discarded_set.has(node)) {
          flip_point = this.discard_center[0];
        } else if (this.shelved_set.has(node)) {
          flip_point = this.lariat_center[0];
        }

        if (!this.graphed_set.has(node) && this.draw_lariat_labels_rotated) {
          // Flip label rather than write upside down
          //   var flip = (node.rad > Math.PI) ? -1 : 1;
          //   view-source:http://www.jasondavies.com/d3-dependencies/
          let radians = node.rad;
          const flip = node.fisheye.x < flip_point; // @cx  # flip labels on the left of center line
          let textAlign = 'left';
          if (flip) {
            radians = radians - Math.PI;
            textAlign = 'right';
          }
          ctx.save();
          ctx.translate(node.fisheye.x, node.fisheye.y);
          ctx.rotate((-1 * radians) + (Math.PI / 2));
          ctx.textAlign = textAlign;
          if (this.debug_shelf_angles_and_flipping) {
            if (flip) { //radians < 0
              ctx.fillStyle = 'rgb(255,0,0)';
            }
            ctx.fillText(("  " + flip + "  " + radians).substr(0,14), 0, 0);
          } else {
            ctx.fillText("  " + node.pretty_name + "  ", 0, 0);
          }
          ctx.restore();
        } else {
          if (this.should_display_labels_as('pills')) {
            this.update_canvas_pill(node, ctx);
          } else if (this.should_display_labels_as('boxNGs')) {
            this.update_boxNG(node);
          } else {
            ctx.fillText("  " + node.pretty_name + "  ", node.fisheye.x, node.fisheye.y);
          }
        }
      };
      this.graphed_set.forEach(label_node);
      this.shelved_set.forEach(label_node);
      this.discarded_set.forEach(label_node);
    }
  }

  update_canvas_pill(node, ctx) {
    let fill;
    const node_font_size = node.bub_txt[4];
    const result = node_font_size !== this.label_em;
    if (!node.bub_txt.length || result) {
      this.update_bub_txt(node);
    }
    const line_height = node.bub_txt[2];  // Line height calculated from text size ?
    const adjust_x = (node.bub_txt[0] / 2) - (line_height/2); // Location of first line of text
    let adjust_y = (node.bub_txt[1] / 2) - line_height;
    const pill_width = node.bub_txt[0]; // box size
    const pill_height = node.bub_txt[1];

    const x = node.fisheye.x - (pill_width/2);
    const y = node.fisheye.y - (pill_height/2);
    const radius = 10 * this.label_em;
    const alpha = 1;
    const outline = node.color;
    // change box edge thickness and fill if node selected
    if (node.focused_node || (node.focused_edge != null)) {
      ctx.lineWidth = 2;
      fill = "#f2f2f2";
    } else {
      ctx.lineWidth = 1;
      fill = "white";
    }
    this.rounded_rectangle(x, y, pill_width, pill_height, radius, fill, outline, alpha);
    ctx.fillStyle = "#000";
    // Paint multi-line text
    let text = node.pretty_name;
    const text_split = text.split(' '); // array of words
    const cuts = node.bub_txt[3];
    let print_label = "";
    for (let i = 0; i < text_split.length; i++) {
      text = text_split[i];
      if (cuts && cuts.includes(i)) {
        ctx.fillText(print_label.slice(0, -1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
        adjust_y = adjust_y - line_height;
        print_label = text + " ";
      } else {
        print_label = print_label + text + " ";
      }
    }
    if (print_label) { // print last line, or single line if no cuts
      ctx.fillText(print_label.slice(0,-1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
    }
  }

  remove_boxNG(node) {
    let elem;
    if (elem = node.boxNG) {
      elem.parentNode.removeChild(elem);
      node['boxNG'] = undefined;
    }
  }

  update_boxNG(node) {
    // update whether boxNG is being shown
    if (this.should_display_boxNG(node)) {
      if (node.boxNG == null) { node.boxNG = this.make_boxNG(node); } // make sure it is there!
    } else {
      this.remove_boxNG(node); // we delete it if it is not needed
      return;
    }

    // FIXME update the text in the boxNG when the name or language changes...
    //   There are a couple of ways to do this...
    //   1) update the boxNG text value when the value changes (RARE! FAST! RIGHT!)
    //   2) check here each tick like this to see if it is needed (FREQUENT! SLOW! WRONG!)

    // FIXME The update of position should only happen when the position has actually changed
    //   Do this by rounding the fisheye to the nearest pixel at calculation time THEN
    //   flagging the fisheye with a .dirty (or .moved) boolean at fisheye update time
    //   then here only perform the following setAttribute when .dirty is true.
    // WARNING the boxNGs might have a stale position until they become .dirty

    const elem = node.boxNG;
    const jqElem = $(elem);

    // Update the POSITION of boxNG
    this.move_boxNG_if_needed(node, elem, jqElem);

    // Update the STYLING of boxNG
    const elemShouldAppearFocused = node.focused_node || node.focused_edge;
    const elemAppearsFocused = elem.className.includes('focusedNode');
    const needsFixing = elemAppearsFocused !== elemShouldAppearFocused;
    if (needsFixing) {
      if (elemShouldAppearFocused) {
        this.focus_boxNG_jqElem(node, jqElem);
      } else {
        this.unfocus_boxNG_jqElem(node, jqElem);
        this.style_boxNG_jqElem(node, jqElem);
      }
    }
  }

  move_boxNG_if_needed(node, elem, jqElem) {
    // Update the POSITION of the boxNG
    const fish_x = Math.round(node.fisheye.x);
    const fish_y = Math.round(node.fisheye.y);
    let nodeMoved = false;
    if (elem.offsetLeft !== fish_x) {
      nodeMoved = true;
      //console.debug("elem.offsetLeft (#{typeof elem.offsetLeft})", elem.offsetLeft, "!=", fish_x)
    } else if (elem.offsetTop !== fish_y) {
      nodeMoved = true;
    }
      //console.debug("elem.offsetTop", elem.offsetTop, "!=", fish_y)
    if (nodeMoved) { // it is easier to let jquery do this modification job
      jqElem.css('top', fish_y + 'px');
      jqElem.css('left', fish_x + 'px');
    }
  }

  style_boxNG_jqElem(node, jqElem, css) {
    if (css == null) { css = {}; }
    if (css['color'] == null) { css['color'] = node.color; }
    let font_size = this.label_em;
    if (node.selected != null) {
      font_size = this.label_em * this.selected_mag;
    }
    font_size = font_size + 'em';
    if (css['font-size'] == null) { css['font-size'] = font_size; } // this will NOT override the size for focused_node
    if (css['z-index'] == null) { css['z-index'] = 0; }
    jqElem.css(css);
  }

  focus_boxNG_jqElem(node, jqElem, css) {
    jqElem.addClass('focusedNode');
    if (css == null) { css = {}; }
    const font_size = this.label_em * this.focused_mag;
    css['font-size'] = font_size + 'em';
    css['z-index'] = 10000; // FIXME maybe this should be a continuously incrementing value?
    this.style_boxNG_jqElem(node, jqElem, css);
  }

  unfocus_boxNG_jqElem(node, jqElem) {
    //colorlog("removeClass('focusedNode')")
    jqElem.removeClass('focusedNode');
    //console.error(jqElem)
  }

  make_boxNG(node) {
    const elem = this.addDivWithIdAndClasses(null, "boxNG", this.viscanvas_elem);
    elem.innerHTML = node.pretty_name;
    // make closures so the node is passed to the handlers without lookup
    elem.onmousemove = evt => this.mousemove_boxNG(evt, node);
    elem.onmousedown = evt => this.mousedown_boxNG(evt, node);
    elem.onmouseout = evt => this.mouseout_boxNG(evt, node);
    elem.onmouseenter = evt => this.mouseenter_boxNG(evt, node);
    elem.onmouseup = evt => this.mouseup_boxNG(evt, node);
    return elem;
  }

  mousemove_boxNG(evt, node) {
    //console.debug('mousemove_boxNG', node.id);
    //@highwater_incr('mousemove_boxNG')
    d3.event = evt;
    evt.stopPropagation();
    this.mousemove();
    this.update_boxNG(node);
  }

  mousedown_boxNG(evt, node) {
    console.debug('mousedown_boxNG', node.id);
    d3.event = evt;
    this.mousedown();
    //@update_boxNG(node)
  }

  mouseout_boxNG(evt, node) {
    console.debug('mouseout_boxNG', node.id);
    d3.event = evt;
    evt.stopPropagation();
    if (node.focused_node) {
      this.set_focused_node();
    }
    this.update_boxNG(node);
    setTimeout(this.tick);
  }

  mouseenter_boxNG(evt, node) {
    console.debug('mouseenter_boxNG', node.id);
    d3.event = evt;
    evt.stopPropagation();
    this.set_focused_node(node);
    this.update_boxNG(node);
  }

  mouseup_boxNG(evt, node) {
    console.debug('mouseup_boxNG', node.id);
    d3.event = evt;
    evt.stopPropagation();
    this.mouseup();
    this.update_boxNG(node);
  }

  should_display_boxNG(node) {
    return ((node.state === this.graphed_set) || (node.focused_edge != null)) && this.is_in_viewport(node);
  }

  is_in_viewport(node) {
    return (0 < node.fisheye.x && node.fisheye.x < this.width) && (0 < node.fisheye.y && node.fisheye.y < this.height);
  }

  set_boxNG_editability(node, truth) {
    if (truth) {
      node.boxNG.setAttribute('contenteditable', "");
    } else {
      node.boxNG.removeAttribute('contenteditable');
    }
  }

  draw_focused_labels() {
    const {
      ctx
    } = this;
    const focused_font_size = this.label_em * this.focused_mag;
    const focused_font = `${focused_font_size}em sans-serif`;
    const focused_pill_font = `${this.label_em}em sans-serif`;
    const default_text_for_empty_value = '“”';
    const highlight_node = node => {
      if (node.focused_node || (node.focused_edge != null)) {
        let x, y;
        if (this.should_display_labels_as('pills')) {
          let fill;
          ctx.font = focused_pill_font;
          const node_font_size = node.bub_txt[4];
          const result = node_font_size !== this.label_em;
          if (!node.bub_txt.length || result) {
            this.get_label_attributes(node);
          }
          const line_height = node.bub_txt[2];  // Line height calculated from text size ?
          const adjust_x = (node.bub_txt[0] / 2) - (line_height/2);// Location of first line of text
          let adjust_y = (node.bub_txt[1] / 2) - line_height;
          const pill_width = node.bub_txt[0]; // box size
          const pill_height = node.bub_txt[1];

          x = node.fisheye.x - (pill_width/2);
          y = node.fisheye.y - (pill_height/2);
          const radius = 10 * this.label_em;
          const alpha = 1;
          const outline = node.color;
          // change box edge thickness and fill if node selected
          if (node.focused_node || (node.focused_edge != null)) {
            ctx.lineWidth = 2;
            fill = "#f2f2f2";
          } else {
            ctx.lineWidth = 1;
            fill = "white";
          }
          this.rounded_rectangle(x, y, pill_width, pill_height, radius, fill, outline, alpha);
          ctx.fillStyle = "#000";
          // Paint multi-line text
          let text = node.pretty_name;
          const text_split = text.split(' '); // array of words
          const cuts = node.bub_txt[3];
          let print_label = "";
          for (let i = 0; i < text_split.length; i++) {
            text = text_split[i];
            if (cuts && cuts.includes(i)) {
              ctx.fillText(print_label.slice(0,-1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
              adjust_y = adjust_y - line_height;
              print_label = text + " ";
            } else {
              print_label = print_label + text + " ";
            }
          }
          if (print_label) { // print last line, or single line if no cuts
            ctx.fillText(print_label.slice(0,-1), node.fisheye.x - adjust_x, node.fisheye.y - adjust_y);
          }
        } else if (this.should_display_labels_as('boxNGs')) {
          this.update_boxNG(node);
        } else {
          const label = this.scroll_pretty_name(node);
          if (node.state === this.graphed_set) {
            const cart_label = node.pretty_name;
            ctx.measureText(cart_label).width; //forces proper label measurement (?)
            if (this.paint_label_dropshadows) {
              this.paint_dropshadow(cart_label, focused_font_size, node.fisheye.x, node.fisheye.y);
            }
          }
          ctx.fillStyle = node.color; // This is the mouseover highlight color when GRAPHED
          ctx.font = focused_font;
          ctx.fillText("  " + node.pretty_name + "  ", node.fisheye.x, node.fisheye.y);
        }
      }
    };
    this.graphed_set.forEach(highlight_node);
  }

  clear_canvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  blank_screen() {
    if (this.use_canvas || this.use_webgl) { this.clear_canvas(); }
  }

  should_position_by_packing() {
    return !this.show_edges;
  }

  position_nodes_by_packing() {
    // https://bl.ocks.org/mbostock/3231298
    if (!this.should_position_by_packing()) {
      return;
    }
    const q = d3.geom.quadtree(this.graphed_set);
    let i = 0;
    const n = this.graphed_set.length;
    while (++i < n) {
      q.visit(this.position_node_by_packing(this.graphed_set[i]));
    }
  }

  position_node_by_packing(node) {
    let r = node.radius + 16;
    const nx1 = node.x - r;
    const nx2 = node.x + r;
    const ny1 = node.y - r;
    const ny2 = node.y + r;
    return function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== node)) {
        let x = node.x - quad.point.x;
        let y = node.y - quad.point.y;
        let l = Math.sqrt((x * x) + (y * y));
        r = node.radius + quad.point.radius;
        if (l < r) {
          l = ((l(-r)) / 1) * .5;
          node.x -= (x *= l);
          node.y -= (y *= l);
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return (x1 > nx2) || (x2 < nx1) || (y1 > ny2) || (y2 < ny1);
    };
  }

  // # The distinguished node
  // There are phenomena which pertain to one and only one node: the distinguished_node.
  // The number of distinguished nodes is either 0 or 1;
  //
  // Which nodes might be distinguished?
  // * If there is only one node in the chosen_set it becomes the distinguished_node
  // * Being the terminal node in the walked_set is another way to become distinguished.
  //
  // What are the consequences of being distinguished?
  // * the distinguished node is displayed pinned at the center of the graph
  //
  // To see to it that there is no distinguished node, call `@distinguish(null)`
  administer_the_distinguished_node() {
    let terminal_walked;
    const dirty = false;
    let only_chosen = null;
    let rightfully_distinguished = null;
    if (this.chosen_set.length === 1) {
      only_chosen = this.chosen_set[0];
    }
    if (this.walked_set.length) {
      terminal_walked = this.walked_set[this.walked_set.length - 1];
    }
    rightfully_distinguished = terminal_walked || only_chosen;
    if (rightfully_distinguished != null) {
      if (rightfully_distinguished._is_distinguished != null) {
        // no change is needed so we can quit now
        return;
      }
      if (this.center_the_distinguished_node) {
        this.pin_at_center(rightfully_distinguished);
      }
    }
    const emeritus = this.distinguish(rightfully_distinguished);
    if (emeritus != null) {
      if (this.center_the_distinguished_node) {
        this.unpin(emeritus);
      }
    }
    if (emeritus || rightfully_distinguished) {
      // there was a change, so update set counts
      this.update_set_counts();
    }
  }

  tick(msg) {
    //if @d3simulation and @d3simulation.alpha() < 0.1
    //  return
    if ((this.ctx == null)) {
      return;
    }
    if ((typeof msg === 'string') && !this.args.skip_log_tick) {
      console.log(msg);
    }
    // return if @focused_node   # <== policy: freeze screen when selected
    if (true) {
      if (this.clean_up_all_dirt_onceRunner != null) {
        if (this.clean_up_all_dirt_onceRunner.active) {
          if (this.clean_up_all_dirt_onceRunner.stats.runTick == null) {
            this.clean_up_all_dirt_onceRunner.stats.runTick = 0;
          }
          if (this.clean_up_all_dirt_onceRunner.stats.skipTick == null) {
            this.clean_up_all_dirt_onceRunner.stats.skipTick = 0;
          }
          this.clean_up_all_dirt_onceRunner.stats.skipTick++;
          return;
        } else {
          this.clean_up_all_dirt_onceRunner.stats.runTick++;
        }
      }
    }
    this.highwater('maxtick', true);
    this.ctx.lineWidth = this.edge_width; // TODO(smurp) just for edge borders, make one for nodes
    this.administer_the_distinguished_node();
    //this.find_node_or_edge_closest_to_pointer();
    this.find_node_or_edge_closest_to_pointer_using_quadtrees();
    this.auto_change_verb();
    this.on_tick_change_current_command_if_warranted();
    //@update_snippet() // not in use
    this.blank_screen();
    this.draw_dropzones();
    this.fisheye.focus(this.last_mouse_pos);
    this.show_last_mouse_pos();
    if (this.should_position_by_packing()) {
      this.position_nodes_by_packing();
    } else {
      this.position_nodes_by_force();
    }
    //@apply_fisheye()
    this.draw_edges();
    this.draw_nodes();
    this.draw_shelf();
    this.draw_discards();
    this.draw_labels();
    this.draw_edge_labels();
    this.draw_focused_labels();
    this.pfm_count('tick');
    this.prior_node_and_state = this.get_focused_node_and_its_state();
    this.highwater('maxtick');
  }

  rounded_rectangle(x, y, w, h, radius, fill, stroke, alpha) {
    // http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
    const {
      ctx
    } = this;
    ctx.fillStyle = fill;
    const r = x + w;
    const b = y + h;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(r - radius, y);
    ctx.quadraticCurveTo(r, y, r, y + radius);
    ctx.lineTo(r, (y + h) - radius);
    ctx.quadraticCurveTo(r, b, r - radius, b);
    ctx.lineTo(x + radius, b);
    ctx.quadraticCurveTo(x, b, x, b - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (alpha) {
      ctx.globalAlpha = alpha;
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  paint_dropshadow(label, focused_font_size, x, y) {
    const {
      ctx
    } = this;
    const width = this.ctx.measureText(label).width * focused_font_size;
    const focused_font = `${focused_font_size}em sans-serif`;
    const height = this.label_em * this.focused_mag * 16;
    ctx.font = focused_font;
    ctx.strokeStyle = this.renderStyles.pageBg;
    ctx.lineWidth = 5;
    ctx.strokeText("  " + label + "  ", x, y);
  }

  draw_edge_labels() {
    if (!this.show_edges) {
      return;
    }
    if (this.focused_edge != null) {
      this.draw_edge_label(this.focused_edge);
    }
    if (this.show_edge_labels_adjacent_to_labelled_nodes) {
      for (let edge of this.links_set) {
        if (edge.target.labelled || edge.source.labelled) {
          this.draw_edge_label(edge);
        }
      }
    }
  }

  draw_edge_label(edge) {
    const {
      ctx
    } = this;
    // TODO the edge label should really come from the pretty name of the predicate
    //   edge.label > edge.predicate.label > edge.predicate.lid
    let label = edge.label || edge.predicate.lid;
    if (this.snippet_count_on_edge_labels) {
      if (edge.contexts != null) {
        if (edge.contexts.length) {
          label += ` (${edge.contexts.length})`;
        }
      }
    }
    const {
      width
    } = ctx.measureText(label);
    const height = this.label_em * this.focused_mag * 16;
    if (this.paint_label_dropshadows) {
      if (edge.handle != null) {
        this.paint_dropshadow(label, this.label_em, edge.handle.x, edge.handle.y);
      }
    }
    ctx.fillStyle = edge.color;
    ctx.fillText(" " + label, edge.handle.x + this.edge_x_offset, edge.handle.y);
  }

  update_snippet() {
    if (this.show_snippets_constantly && (this.focused_edge != null) && (this.focused_edge !== this.printed_edge)) {
      this.print_edge(this.focused_edge);
    }
  }
  show_state_msg(txt) {
    if (false) {
      this.msg_history += " " + txt;
      txt = this.msg_history;
    }
    this.state_msg_box.show();
    this.state_msg_box.html("<div class='msg_payload'>" + txt + "</div><div class='msg_backdrop'></div>");
    this.state_msg_box.on('click', this.hide_state_msg);
    if (this.use_fancy_cursor) {
      this.text_cursor.pause("wait");
    }
  }

  hide_state_msg() {
    this.state_msg_box.hide();
    if (this.use_fancy_cursor) {
      this.text_cursor.continue();
    }
    //@text_cursor.set_cursor("default")
  }

  svg_restart() {
    // console.log "svg_restart()"
    this.link = this.link.data(this.links_set);
    this.link.enter().
      insert("line", ".node").
      attr("class", d => //console.log(l.geometry.vertices[0].x,l.geometry.vertices[1].x);
    "link");

    this.link.exit().remove();
    this.node = this.node.data(this.nodes);

    this.node.exit().remove();

    const nodeEnter = this.node.enter().
      append("g").
      attr("class", "lariat node").
      call(force.drag);
    nodeEnter.append("circle").
      attr("r", calc_node_radius).
      style("fill", d => d.color);

    nodeEnter.append("text").
      attr("class", "label").
      attr("style", "").
      attr("dy", ".35em").
      attr("dx", ".4em").
      text(d => d.name);

    this.label = this.svg.selectAll(".label");
  }

  canvas_show_text(txt, x, y) {
    // console.log "canvas_show_text(" + txt + ")"
    this.ctx.fillStyle = "black";
    this.ctx.font = "12px Courier";
    this.ctx.fillText(txt, x, y);
  }

  pnt2str(x, y) {
    return "[" + Math.floor(x) + ", " + Math.floor(y) + "]";
  }

  show_pos(x, y, dx, dy) {
    dx = dx || 0;
    dy = dy || 0;
    this.canvas_show_text(pnt2str(x, y), x + dx, y + dy);
  }

  show_line(x0, y0, x1, y1, dx, dy, label) {
    dx = dx || 0;
    dy = dy || 0;
    label = ((typeof label === "undefined") && "") || label;
    this.canvas_show_text(pnt2str(x0, y0) + "-->" + pnt2str(x0, y0) + " " + label, x1 + dx, y1 + dy);
  }

  add_webgl_line(e) {
    e.gl = this.add_line(
      scene, e.source.x, e.source.y, e.target.x, e.target.y, e.source.s.id + " - " + e.target.s.id, "green");
  }

  //dump_line(e.gl);
  webgl_restart() {
    links_set.forEach(d => {
      return this.add_webgl_line(d);
    });
  }

  restart() { // TODO rename to restart_d3simulation ; harmonize with @reset_graph() name
    if (this.use_svg) {
      this.svg_restart();
    }
    if ((this.d3simulation != null) && (this.graphed_set != null)) {
      this.d3simulation.nodes(this.graphed_set);
      this.d3simulation.force('link').links(this.links_set);
      this.d3simulation.alpha(0.3).restart();
    } else {
      console.warn("@d3simulation is",this.d3simulation);
    }
    if (!this.args.skip_log_tick) {
      console.log("Tick in @force.start() restart");
    }
  }

  show_last_mouse_pos() {
    this.draw_circle(this.last_mouse_pos[0], this.last_mouse_pos[1], this.focus_radius, "yellow");
  }

  remove_ghosts(e) {
    if (this.use_webgl) {
      if (e.gl) { this.remove_gl_obj(e.gl); }
      delete e.gl;
    }
  }

  add_node_ghosts(d) {
    if (this.use_webgl) { d.gl = add_node(scene, d.x, d.y, 3, d.color); }
  }

  add_to(itm, array, cmp) {
    // FIXME should these arrays be SortedSets instead?
    cmp = cmp || array.__current_sort_order || this.cmp_on_id;
    const c = this.binary_search_on(array, itm, cmp, true);
    if (typeof c === typeof 3) { return c; }
    array.splice(c.idx, 0, itm);
    return c.idx;
  }

  remove_from(itm, array, cmp) {
    cmp = cmp || array.__current_sort_order || this.cmp_on_id;
    const c = this.binary_search_on(array, itm, cmp);
    if (c > -1) { array.splice(c, 1); }
    return array;
  }

  fire_newsubject_event(s) {
    window.dispatchEvent(
      new CustomEvent('newsubject', {
        detail: {
          sid: s
        },
          // time: new Date()
        bubbles: true,
        cancelable: true
      })
    );
  }

  ensure_predicate_lineage(pid) {
    // Ensure that fire_newpredicate_event is run for pid all the way back
    // to its earliest (possibly abstract) parent starting with the earliest
    const pred_lid = uniquer(pid);
    if ((this.my_graph.predicates[pred_lid] == null)) {
      let parent_lid, pred_name;
      if (this.ontology.subPropertyOf[pred_lid] != null) {
        parent_lid = this.ontology.subPropertyOf[pred_lid];
      } else {
        parent_lid = "anything";
      }
      this.my_graph.predicates[pred_lid] = [];
      this.ensure_predicate_lineage(parent_lid);
      if (this.ontology.label) {
        pred_name = this.ontology.label[pred_lid];
      }
      this.fire_newpredicate_event(pid, pred_lid, parent_lid, pred_name);
    }
  }

  fire_newpredicate_event(pred_uri, pred_lid, parent_lid, pred_name) {
    window.dispatchEvent(
      new CustomEvent('newpredicate', {
        detail: {
          pred_uri,
          pred_lid,
          parent_lid,
          pred_name
        },
        bubbles: true,
        cancelable: true
      })
    );
  }

  auto_discover_header(uri, digestHeaders, sendHeaders) {  // TODO remove if not needed
    // THIS IS A FAILED EXPERIMENT BECAUSE
    // It turns out that for security reasons AJAX requests cannot show
    // the headers of redirect responses.  So, though it is a fine ambition
    // to retrieve the X-PrefLabel it cannot be seen because the 303 redirect
    // it is attached to is processed automatically by the browser and we
    // find ourselves looking at the final response.
    $.ajax({
      type: 'GET',
      url: uri,
      beforeSend(xhr) {
        //console.log(xhr)
        return sendHeaders.map((pair) =>
          //xhr.setRequestHeader('X-Test-Header', 'test-value')
          xhr.setRequestHeader(pair[0], pair[1]));
      },
        //xhr.setRequestHeader('Accept', "text/n-triples, text/x-turtle, */*")
      //headers:
      //  Accept: "text/n-triples, text/x-turtle, */*"
      success: (data, textStatus, request) => {
        console.log(textStatus);
        console.log(request.getAllResponseHeaders());
        console.table((request.getAllResponseHeaders().split("\n").map((line) => line.split(':'))));
        return (() => {
          const result = [];
          for (let header of digestHeaders) {
            const val = request.getResponseHeader(header);
            if (val != null) {
              result.push(alert(val));
            } else {
              result.push(undefined);
            }
          }
          return result;
        })();
      }
    });
  }

  getTesterAndMunger(discoArgs) {
    const fallbackQuadTester = q => (q != null);
    const fallbackQuadMunter = q => [q];
    const quadTester = discoArgs.quadTester || fallbackQuadTester;
    const quadMunger = discoArgs.quadMunger || fallbackQuadMunger;
    return {quadTester, quadMunger};
  }

  discovery_triple_ingestor_N3(data, textStatus, request, discoArgs) {
    // Purpose:
    //   THIS IS NOT YET IN USE.  THIS IS FOR WHEN WE SWITCH OVER TO N3
    //
    //   This is the XHR callback returned by @make_triple_ingestor()
    //   The assumption is that data will be something N3 can parse.
    // Accepts:
    //   discoArgs:
    //     quadTester (OPTIONAL)
    //       returns true if the quad is to be added
    //     quadMunger (OPTIONAL)
    //       returns an array of one or more quads inspired by each quad
    if (discoArgs == null) { discoArgs = {}; }
    const {quadTester, quadMunger} = this.getTesterAndMunger(discoArgs);
    const quad_count = 0;
    const parser = N3.Parser();
    parser.parse(data, (err, quad, pref) => {
      if (err && (discoArgs.onErr != null)) {
        discoArgs.onErr(err);
      }
      if (quadTester(quad)) {
        for (let aQuad of quadMunger(quad)) {
          this.inject_discovered_quad_for(quad, discoArgs.aUrl);
        }
      }
    });
  }

  discovery_triple_ingestor_GreenTurtle(data, textStatus, request, discoArgs) {
    // Purpose:
    //   This is the XHR callback returned by @make_triple_ingestor()
    //   The assumption is that data will be something N3 can parse.
    // Accepts:
    //   discoArgs:
    //     quadTester (OPTIONAL)
    //       returns true if the quad is to be added
    //     quadMunger (OPTIONAL)
    //       returns an array of one or more quads inspired by each quad
    if (discoArgs == null) { discoArgs = {}; }
    const {
      graphUri
    } = discoArgs;
    const {quadTester, quadMunger} = this.getTesterAndMunger(discoArgs);
    const dataset = new GreenerTurtle().parse(data, "text/turtle");
    for (let subj_uri in dataset.subjects) {
      const frame = dataset.subjects[subj_uri];
      for (let pred_id in frame.predicates) {
        const pred = frame.predicates[pred_id];
        for (let obj of pred.objects) {
          const quad = {
            s: frame.id,
            p: pred.id,
            o: obj, // keys: type,value[,language]
            g: graphUri
          };
          if (quadTester(quad)) {
            for (let aQuad of quadMunger(quad)) {
              this.inject_discovered_quad_for(aQuad, discoArgs.aUrl);
            }
          }
        }
      }
    }
  }

  make_triple_ingestor(discoArgs) {
    return function(data, textStatus, request) {
      return this.discovery_triple_ingestor_GreenTurtle(data, textStatus, request, discoArgs);
    };
  }

  discover_labels(aUrl) {
    const discoArgs = {
      aUrl,
      quadTester: quad => {
        if (quad.s !== aUrl.toString()) {
          return false;
        }
        if (!(NAME_SYNS.includes(quad.p))) {
          return false;
        }
        return true;
      },
      quadMunger: quad => {
        return [quad];
      },
      graphUri: aUrl.origin
    };
    return this.make_triple_ingestor(discoArgs);
  }

  ingest_quads_from(uri, success, failure) {
    $.ajax({
      type: 'GET',
      url: uri,
      success,
      failure
    });
  }

  adjust_setting(input_or_id, new_value, old_value, skip_custom_handler) {
    // NOTE that old_value is only being provided by adjust_setting_if_needed()
    let input = null;
    let setting_id = null;
    if (typeof input_or_id === 'string') {
      input = this.get_setting_input_JQElem(input_or_id);
      setting_id = input_or_id;
    } else {
      input = input_or_id;
      setting_id = input[0].name;
    }
    const theType = input.attr('type');
    if (['checkbox', 'radiobutton'].includes(theType)) {
      //new_value = new_value and 'checked' or null
      input.prop('checked', new_value);
    } else {
      input.val(new_value);
    }
    if (this[setting_id] != null) {
      this[setting_id] = new_value;
    }
    this.change_setting_to_from(setting_id, new_value, old_value, skip_custom_handler);
    return new_value;
  }

  get_setting_input_JQElem(inputName) {
    return this.topJQElem.find(`[name='${inputName}']`);
  }

  countdown_setting(inputName) {
    const input = this.get_setting_input_JQElem(inputName);
    const val = input.val();
    if (val < 1) {
      return 0;
    }
    const newVal = val - 1;
    return this.adjust_setting(inputName, newVal);
  }

  preset_discover_geonames_remaining() {
    let count = 0;
    for (let node of this.nameless_set) {
      const url = node.id;
      if (url.includes('geonames.org')) {
        count++;
      }
    }
    return this.adjust_setting('discover_geonames_remaining', count);
  }

  show_geonames_instructions(params) {
    //params =
    //  msg: "Check your email for confirmation msg"
    // Usage:
    //   show_geonames_instructions({msg:'Check your email for confirmation message.'})
    const args = {
      width: this.width * 0.6,
      height: this.height * 0.6
    };
    let markdown = this.discover_geoname_name_instructions_md;
    if (params != null) {
      if (params.msg != null) {
        markdown += `\

#### Error:
<span style="color:red">${params.msg}</span>\
`;
      }
      if (params.username != null) {
        markdown += `\

#### Username:
<span style="color:blue">${params.username}</span>\
`;
      }
    }
    if (params.markdown != null) {
      ({
        markdown
      } = params);
    }
    this.make_markdown_dialog(markdown, null, args);
  }

  discover_geoname_name(aUrl) {
    let widget;
    const id = aUrl.pathname.replace(/\//g,'');
    const username = this.discover_geonames_as;
    if (this.discover_geonames_remaining < 1) {
      //console.warn("discover_geoname_name() should not be called when remaining is less than 1")
      return;
    }
    if (widget = this.discover_geonames_as__widget) {
      if (widget.state === 'untried') {
        this.discover_geonames_as__widget.set_state('trying');
      } else if (widget.state === 'looking') {
        if (this.discover_geonames_remaining < 1) {
          console.info('stop looking because remaining is', this.discover_geonames_remaining);
          return false;
        }
        // We decrement remaining before looking or after successfully trying.
        // We do so before looking because we know that the username is good, so this will count.
        // We do so after trying because we do not know until afterward that the username
        // was good and whether it would count.
        const rem = this.countdown_setting('discover_geonames_remaining');
        //console.info('discover_geoname_name() widget.state =', widget.state, "so decrementing remaining (#{rem}) early")
      } else if (widget.state === 'good') {
        if (this.discover_geonames_remaining < 1) {
          //console.info('aborting discover_geoname_name() because remaining =', @discover_geonames_remaining)
          return false;
        }
        this.discover_geonames_as__widget.set_state('looking');
        // console.info('looking for',id,'using name', username)
      } else {
        console.warn("discover_geoname_name() should not be called when widget.state =", widget.state);
        return false;
      }
    }
    if (this.geonames_name_lookups_performed == null) { this.geonames_name_lookups_performed = 0; }
    this.geonames_name_lookups_performed += 1;
    $.ajax(this.make_geoname_ajax_closure(aUrl));
  }

  make_geoname_ajax_closure(aUrl) {
    // This method makes the handlers for the geonames ajax call.
    const id = aUrl.pathname.replace(/\//g,'');
    const soughtId = id;
    const idInt = parseInt(id);
    const username = this.discover_geonames_as;
    const k2p = this.discover_geoname_key_to_predicate_mapping;
    const url = `http://api.geonames.org/hierarchyJSON?geonameId=${id}&username=${username}`;
    // console.log("discover_geoname_name_SEARCH", aUrl.toString())
    return {
      url,
      error: (xhr, status, error) => {
        //console.log(xhr, status, error)
        if (error === 'Unauthorized') {
          if (this.discover_geonames_as__widget.state !== 'bad') {
            this.discover_geonames_as__widget.set_state('bad');
            return this.show_geonames_instructions();
          }
        }
      },
      success: (json, textStatus, request) => {
        // To test the receipt of an error condition, uncomment the next line
        //  json.status = {message: "Oooh, you've been very bad!"}
        let widget;
        if (json.status) {
          console.debug(json, textStatus, request, aUrl, url);
          if (this.discover_geoname_name_msgs == null) { this.discover_geoname_name_msgs = {}; }
          const params = {};
          if (json.status.message) {
            params.msg = json.status.message;
            if (username) {
              params.username = username;
            }
            if (json.status.message.startsWith('For input string')) {
              params.markdown = `\
Geoname lookup failed for the url:

\`${aUrl.href}\`\
`;
            }
          }
          if ((!this.discover_geoname_name_msgs[msg]) ||
              (this.discover_geoname_name_msgs[msg] &&
               ((Date.now() - this.discover_geoname_name_msgs[msg]) >
                this.discover_geoname_name_msgs_threshold_ms))) {
            // In other words: do not spam the user with errors faster than threshold
            this.discover_geoname_name_msgs[msg] = Date.now();
            this.show_geonames_instructions(params);
          }
          return;
        }
        //subj = aUrl.toString()
        if (widget = this.discover_geonames_as__widget) {
          const state_at_start = widget.state;
          if (['trying', 'looking'].includes(state_at_start)) {
            if (widget.state === 'trying') {
              // we decrement remaining after successfully trying or before looking
              this.countdown_setting('discover_geonames_remaining'); // more remaining
              this.discover_geonames_as__widget.set_state('looking'); // yes, fall through to looking
            }
            if (widget.state === 'looking') {
              if (this.discover_geonames_remaining > 0) {
                // trigger again because they have been suspended
                // use setTimeout to give nodes a chance to update
                const again = () => this.discover_names_including('geonames.org');
                setTimeout(again, 100);
              } else {
                this.discover_geonames_as__widget.set_state('good'); // no more remaining lookups permitted
              }
            } else { // TODO figure out why setting 'good' only when done (and setting 'looking' while 'trying') hangs
              console.log('we should never get here where widget.state =',widget.state);
            }
              //@discover_geonames_as__widget.set_state('good') # finally go to good because we are done
          } else {
            var msg = `state_at_start = ${state_at_start} but it should only be looking or trying (nameless: ${this.nameless_set.length})`;
          }
            //console.error(msg)
            //throw new Error(msg)
        } else {
          throw new Error("discover_geonames_as__widget is missing");
        }
        const geoNamesRoot = aUrl.origin;
        let deeperQuad = null;
        const greedily = this.discover_geonames_greedily;
        const deeply = this.discover_geonames_deeply;
        let depth = 0;
        for (let i = json.geonames.length - 1; i >= 0; i--) { // from most specific to most general
          // Solution! The originally sought geoname (given by aUrl) should have
          // its name injected back into the graph using the exact representation
          // employed in aUrl (ie with or without 'https', 'www' and trailing slash)
          // but all the deeper geoRecs (because they are new to this graph, presumably)
          // should be represented canonically (ie without 'https', 'www' or trailing slash).
          var quad, subj, value;
          const geoRec = json.geonames[i];
          if (!depth) {
            if (geoRec.geonameId.toString() !== soughtId) {
              console.warn("likely misalignment between representation of soughtId and found",
                           soughtId, "!=", geoRec.geonameId);
            }
            subj = aUrl.toString();
          } else {
            subj = geoNamesRoot + '/' + geoRec.geonameId; // + '/'
          }
          //console.log("discover_geoname_name(#{subj})")
          depth++;
          const soughtGeoname = (geoRec.geonameId === idInt);
          if ((!deeply) && (!soughtGeoname)) {
            //console.error("skipping because we are not going deep",geoRec.geonameId, id, geoRec.name)
            continue;
          }
          //console.table([{id: id, geonameId: geoRec.geonameId, name: geoRec.name}])
          const {
            name
          } = geoRec || {};
          // console.log("discover_geoname_name_SUCCESS", subj)
          const placeQuad = {
            s: subj,
            p: RDF_type,
            o: {
              value: 'https://schema.org/Place',
              type: RDF_object
            },  // REVIEW are there others?
            g: geoNamesRoot
          };
          this.inject_discovered_quad_for(placeQuad, aUrl);

          let seen_name = false;
          for (let key in geoRec) { // climb the hierarchy of Places sent by GeoNames
            value = geoRec[key];
            if (key === 'name') {
              seen_name = true; // so we can break at the end of this loop being done
            } else {
              if (!greedily) {
                continue;
              }
            }
            if (['geonameId'].includes(key)) {
              continue;
            }
            const pred = k2p[key];
            if (!pred) {
              continue;
            }
            let theType = RDF_literal;
            if (typeof value === 'number') {
              // REVIEW are these right?
              if (Number.isInteger(value)) {
                theType = 'xsd:integer';
              } else {
                theType = 'xsd:decimal';
              }
              value = "" + value; // convert to string for @add_quad()
            } else {
              theType = RDF_literal;
            }
            quad = {
              s: subj,
              p: pred,
              o: {
                value,
                type: theType
              },  // REVIEW are there others?
              g: geoNamesRoot
            };
            this.inject_discovered_quad_for(quad, aUrl);
            if (!greedily && seen_name) {
              break; // out of the greedy consumption of all k/v pairs
            }
          }
          if (!deeply && (depth > 1)) {
            break; // out of the deep consumption of all nested contexts
          }
          if (deeperQuad) {
            const containershipQuad = {
              s: quad.s,
              p: 'http://data.ordnancesurvey.co.uk/ontology/spatialrelations/contains',
              o: {
                value: deeperQuad.s,
                type: RDF_object
              },
              g: geoNamesRoot
            };
            this.inject_discovered_quad_for(containershipQuad, aUrl);
          }
          deeperQuad = Object.assign({}, quad);
        } // shallow copy

      } // from success
    };
  }

  inject_discovered_quad_for(quad, url) {
    // Purpose:
    //   Central place to perform operations on discoveries, such as caching.
    const q = this.add_quad(quad);
    this.update_set_counts();
    if (this.found_names == null) { this.found_names = []; }
    this.found_names.push(quad.o.value);
  }

  deprefix(uri, prefix, expansion) {
    // Return uri replacing expansion with prefix if possible
    return uri.replace(expansion, prefix);
  }

  make_sparql_name_for_getty(uris, expansion, prefix) {
    // This is good stuff which should be made a bit more general
    // for applicability beyond getty.edu
    //   see https://github.com/cwrc/HuViz/issues/180#issuecomment-489557605
    let subj_constraint;
    if (prefix == null) { prefix = ':'; }
    if (!Array.isArray(uris)) {
      uris = [uris];
    }
    if (!uris.length) {
      throw new Error('expecting uris to be an Array of length > 0');
    }
    if (uris.length === 1) { // so just match that one uri directly
      subj_constraint = `BIND (?s AS <${uris[0]}>)`;
    } else { // more than 1 so make a FILTER statement for the ?subj match
      // Build a constraint for the subject
      //   FILTER (?subj IN (:300073730, :300153822, :300153825))
      subj_constraint = "FILTER (?s IN (" +
        (uris.map((uri) => this.deprefix(uri, prefix, expansion))).join(', ') + "))";
    }
    return `\
PREFIX ${prefix} <${expansion}>
SELECT * {
?subj gvp:prefLabelGVP [xl:literalForm ?label] .
${subj_constraint}
}`; // """
  }

  make_sparql_name_query(uris) {
    let subj_constraint;
    if (uris.length === 1) { // so just match that one uri directly
      //subj_constraint = "BIND (<#{uris[0]}> AS ?subj)"
      subj_constraint = `FILTER (?subj in (<${uris[0]}>))`;
    } else { // more than 1 so make a FILTER statement for the ?subj match
      // Build a constraint for the subject
      //   FILTER (?subj IN (:300073730, :300153822, :300153825))
      subj_constraint = "FILTER (?subj IN (" +
        (uris.map((uri) => this.deprefix(uri, prefix, expansion))).join(', ') + "))";
    }
    return `\
PREFIX dbr: <http://dbpedia.org/resource/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT {
?subj ?pred ?obj .
}
WHERE {
?subj ?pred ?obj .
FILTER (?pred IN (rdfs:label)) .
${subj_constraint}
}
LIMIT 10\
`; // """
    /*
      PREFIX dbr: <http://dbpedia.org/resource/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      CONSTRUCT {?sub ?pre ?obj}
      WHERE {
         ?sub ?pre ?obj .
         FILTER (?sub IN (dbr:Robert_Tappan_Morris,dbr:Technical_University_of_Berlin)) .
         FILTER (?pre IN (rdfs:label)) .
      }
    */

    /*
     SELECT ?sub ?obj
     WHERE {
       ?sub rdfs:label|foaf:name ?obj .
       FILTER (?sub IN (<http://dbpedia.org/page/Robert_Tappan_Morris>))
     }
    */
  }

  make_sparql_name_handler(uris) {
    return noop;
  }

  make_sparql_name_query_and_handler(uri_or_uris) {
    let uris;
    if (Array.isArray(uri_or_uris)) {
      uris = uri_or_uris;
    } else {
      uris = [uri_or_uris];
    }
    const query = this.make_sparql_name_query(uris);
    const handler = this.make_sparql_name_handler(uris);
    return [query, handler];
  }

  auto_discover_name_for(namelessUri, node) {
    //if not namelessUri.includes(':') # skip "blank" nodes
    let args, aUrl, retval, serverUrl;
    if (namelessUri.startsWith('_')) { // skip "blank" nodes
      // FIXME                                                               
      // Normally one would imagine that blank urls would start with _:      
      // but it looks like the .id of such nodes has been stripped of the _: 
      return;
    }
    try {
      aUrl = new URL(namelessUri);
    } catch (e) {
      colorlog(`skipping auto_discover_name_for('${namelessUri}') because`);
      console.log(e);
      return;
    }
    this.highwater_incr('discover_name');

    const hasDomainName = domainName => aUrl.hostname.endsWith(domainName);

    if (hasDomainName('cwrc.ca')) {
      args = {
        namelessUri,
        //predicates: [OSMT_reg_name, OSMT_name]
        serverUrl: "http://sparql.cwrc.ca/sparql"
      };
      this.run_sparql_name_query(args);
      return;
    }

    if (hasDomainName("id.loc.gov")) {
      // This is less than ideal because it uses the special knowledge
      // that the .skos.nt file is available. Unfortunately the only
      // RDF file which is offered via content negotiation is .rdf and
      // there is no parser for that in HuViz yet.  Besides, they are huge.
      retval = this.ingest_quads_from(`${namelessUri}.skos.nt`,
                                  this.discover_labels(namelessUri));
      // This cool method would via a proxy but fails in the browser because
      // full header access is blocked by XHR.
      // `@auto_discover_header(namelessUri, ['X-PrefLabel'], sendHeaders or [])`
      return;
    }

    if (hasDomainName("vocab.getty.edu")) {
      let try_even_though_CORS_should_block;
      if (try_even_though_CORS_should_block = false) {
        // This would work, but CORS blocks this.  Preserved in case sufficiently
        // robust accounts are set up so the HuViz server could serve as a proxy.
        serverUrl = "http://vocab.getty.edu/download/nt";
        const downloadUrl = `${serverUrl}?uri=${encodeURIComponent(namelessUri)}`;
        retval = this.ingest_quads_from(downloadUrl, this.discover_labels(namelessUri));
        return;
      } else {
        // Alternative response datatypes are .json, .csv, .tsv and .xml
        args = {
          namelessUri,
          serverUrl: "http://vocab.getty.edu/sparql.tsv"
        };
        this.run_sparql_name_query(args);
        return;
      }
    }

    if (hasDomainName("openstreetmap.org")) {
      args = {
        namelessUri,
        predicates: [OSMT_reg_name, OSMT_name],
        serverUrl: "https://sophox.org/sparql"
      };
      this.run_sparql_name_query(args);
      return;
    }

    // ## Geonames
    //
    // Geonames has its own API and some complicated use limits so is treated
    // very differently.
    if (hasDomainName("geonames.org")) {
      if (node && node.sought_name) { // so far only used by geonames but might be useful elsewhere
        return; // node is already having its name sought, so skip
      }
      if (['untried','looking','good'].includes(this.discover_geonames_as__widget.state) &&
          (this.discover_geonames_remaining > 0)) {
        node.sought_name = true;
        this.discover_geoname_name(aUrl);
      }
      //else
      //  console.log("auto_discover_name_for(#{aUrl.toString()}) skipping because",
      //              @discover_geonames_as__widget.state)
      return;
    }

    if (true) { // TODO avoid domains we are learning return no names
      let serverSpec;
      if (serverSpec = this.get_server_for_dataset(namelessUri)) {
        args = {
          namelessUri,
          serverUrl: serverSpec.serverUrl
        };
        this.run_sparql_name_query(args);
        return;
      }
    }

  }

  discover_names_including(includes) {
    if (this.nameless_set) { // this might be before the set exists
      this.discover_names(includes);
    }
  }

  discover_names(includes) {
    // console.log('discover_names(',includes,') # of nameless:',@nameless_set.length)
    for (let node of this.nameless_set) {
      const uri = node.id;
      if (!uri.includes(':')) {
        continue;
      }
      if (!((includes != null) && !uri.includes(includes))) {
        // only if includes is specified but not found do we skip auto_discover_name_for
        this.auto_discover_name_for(uri, node);
      }
    }
  }

  // ## SPARQL queries

  run_sparql_name_query(args) {
    const {namelessUri} = args;
    if (args.query == null) { args.query = "# " +
      ( args.comment || `run_sparql_name_query(${namelessUri})`) + "\n" +
      this.make_name_query(namelessUri, args); }
    const defaults = {
      success_handler: this.generic_name_success_handler,
      result_handler: this.name_result_handler,
      default_terms: {
        s: namelessUri,
        p: RDFS_label
      }
    };
    args = this.compose_object_from_defaults_and_incoming(defaults, args);
    this.run_managed_query_ajax(args);
  }

  // Receive a tsv of rows and call the `result_handler` to process each row.
  //
  // Data might look like:
  // ```
  // ?p ?o
  // rdfs:label "Uncle Bob"
  // rdfs:label "Uncle Sam"
  // ```
  //
  // Meanwhile `result_handler` expects each row to be JSON like:
  //
  // ```json
  // {'?p': 'rdfs:label', '?o': "Uncle Bob"}
  // ```
  tsv_name_success_handler(data, textStatus, jqXHR, queryManager) {
    let e, table;
    const {
      result_handler
    } = queryManager.args;
    try {
      let lines;
      table = [];
      //@make_pre_dialog(data, null, {title:"tsv_name_success_handler"})
      try {
        lines = data.split(/\r?\n/);
      } catch (error) {
        e = error;
        console.info("data:",data);
        throw e;
      }
      const firstLine = lines.shift();
      const cols = firstLine.split("\t");
      for (let line of lines) {
        if (!line) { continue; }
        const row = line.split("\t");
        const rowJson = _.zipObject(cols, row);
        result_handler(rowJson, queryManager);
        table.push(rowJson);
      }
      queryManager.setResultCount(table.length);
    } catch (error1) {
      e = error1;
      this.make_json_dialog(table);
      queryManager.fatalError(e);
    }
  }

  json_name_success_handler(data, textStatus, jqXHR, queryManager) {
    let table;
    const {
      result_handler
    } = queryManager.args;
    try {
      table = [];
      for (let resultJson of data.results.bindings) {
        if (!resultJson) { continue; }
        result_handler(resultJson, queryManager);
        table.push(resultJson);
      }
      queryManager.setResultCount(table.length);
    } catch (e) {
      this.make_json_dialog(table, null, {title: "table of results"});
      queryManager.fatalError(e);
    }
  }

  display_graph_success_handler(data, textStatus, jqXHR, queryManager) {
    this.disable_dataset_ontology_loader_AUTOMATICALLY();
    // TODO @update_browser_title()
    // TODO @update_caption()
    this.generic_name_success_handler(data, textStatus, jqXHR, queryManager);
    this.call_on_dataset_loaded();
  }

  generic_success_handler(data, textStatus, jqXHR, queryManager) {
    this.generic_name_success_handler(data, textStatus, jqXHR, queryManager);
  }

  generic_name_success_handler(data, textStatus, jqXHR, queryManager) {
    let resp_type, success_handler;
    try {
      data = JSON.parse(data);
    } catch (error) {}
      //console.debug(queryManager.qry + "\n\ndid not return JSON")
    // this should be based on response header or a queryManager
    const resp_content_type = jqXHR.getResponseHeader("content-type").split(';')[0];
    if (data.head != null) {
      resp_type = 'json';
    } else if (data.includes("\t")) {
      // TODO base presumption of .tsv on something more definitive than finding one
      resp_type = 'tsv';
    } else {
      // console.warn(data)
      const serverDesc = queryManager.args.serverUrl || "the server";
      throw new Error(`no support for ${resp_content_type} just json or tsv for data coming from ${serverDesc}`);
    }
    switch (resp_type) {
      case 'json':
        success_handler = this.json_name_success_handler;
        break;
      case 'tsv':
        success_handler = this.tsv_name_success_handler;
        break;
      default:
        throw new Error('no name_success_handler available');
    }
    success_handler(data, textStatus, jqXHR, queryManager);
     // set to `false` for no limit
  }

  // ### make_name_query()
  //
  // Generate a name lookup query for `uri`.  If the optional `args` object
  // has an optional `predicates` list then those predicates are specifically
  // looked up.  The default predicates are provided by `default_name_query_args`.
  //
  // The default query looks like:
  // ```sparql
  // SELECT *
  // WHERE {
  //   {
  //     BIND (foaf:name as ?p) .
  //     <#{uri}> ?p ?o .
  //   } UNION {
  //     BIND (rdfs:label as ?p) .
  //     <#{uri}> ?p ?o .
  //   } UNION {
  //     BIND (schema:name as ?p) .
  //     <#{uri}> ?p ?o .
  //   }
  // }
  // LIMIT 20```
  make_name_query(uri, in_args) {
    const args = this.compose_object_from_defaults_and_incoming(this.default_name_query_args, in_args);
    const {predicates} = args;
    const lines = [
      "SELECT *",
      "WHERE {"];
    let pred_num = 0;
    for (let pred of predicates) {
      if (pred_num) {
        lines.push('  UNION');
      }
      pred_num++;
      lines.push("  {");
      lines.push(`    BIND (<${pred}> as ?p) .`);
      lines.push(`    <${uri}> ?p ?o .`);
      lines.push("  }");
    }
    lines.push("}");
    if (args.limit) {
      lines.push(`LIMIT ${args.limit}`);
    }
    return lines.join("\n");
  }

  convert_N3_obj_to_GreenTurtle(n3_obj_term) {
    let bare_obj_term, retval;
    if (typeof(n3_obj_term) === 'string') {
      bare_obj_term = n3_obj_term;
    } else {
      bare_obj_term = n3_obj_term.id;
      if (!bare_obj_term.startsWith('"')) { // it must be an uri
        retval = {
          type: RDF_object,
          value: n3_obj_term.id
        };
        return retval;
      }
      // the GreenTurtle parser seems to expect curies as types not full uri
      bare_obj_term = bare_obj_term.replace("http://www.w3.org/2001/XMLSchema#","xsd:");
      bare_obj_term = bare_obj_term.replace("^^xsd:string",'');
    }
    if (this.greenturtleparser == null) { this.greenturtleparser = new GreenerTurtle(); }
    const subj = 'http://example.com/subj';
    const pred = 'http://example.com/pred';
    const statement = `<${subj}> <${pred}> ${bare_obj_term} .`;
    try {
      const graph = this.greenturtleparser.parse(statement, "text/turtle");
      retval = graph.subjects[subj].predicates[pred].objects.slice(-1)[0];
    } catch (e) {
      //console.log(n3_obj_term, n3_obj_term.split(''))
      console.error(e);
      throw e;
      retval = {
        value: strip_surrounding_quotes(n3_obj_term),
        type: 'Literal' // TODO make this legit
      };
    }
    return retval;
  }

  convert_str_obj_to_GreenTurtle(bare_term) {
    if (bare_term[0] === '<') {
      return this.convert_N3_obj_to_GreenTurtle(bare_term);
    }
    if (bare_term.slice(-1)[0] !== '"') {
      if (bare_term.startsWith('"')) {
        if (bare_term.includes('@')) {
          return this.convert_N3_obj_to_GreenTurtle(bare_term);
        }
        else {}
          // fall through to report error
      } else {
        return this.convert_N3_obj_to_GreenTurtle('"'+bare_term+'"');
      }
    }
    const msg = `bare_term: {${bare_term}} not parseable by convert_str_term_to_GreenTurtle`;
    throw new Error(msg);
  }

  convert_N3_uri_to_string(n3Uri) {
    //console.warn("convert_N3_uri_to_string('#{n3Uri}')")
    return n3Uri;
  }

  convert_str_uri_to_string(bareUri) {
    if (bareUri.startsWith('<')) {
      bareUri =  bareUri.substr(1,bareUri.length-2);
    }
    //console.warn("convert_str_uri_to_string('#{bareUri}')")
    return bareUri;
  }

  convert_obj_obj_to_GreenTurtle(jsObj) {
    // TODO convert the .type to a legit uri
    if (jsObj.type === 'uri') {
      jsObj.type = RDF_object;
    } else if (jsObj.type === 'literal') {
      let lang;
      jsObj.type = RDF_literal;
      if (lang = jsObj['xml:lang']) {
        delete jsObj['xml:lang'];
        jsObj.language = lang.toLowerCase(); // REVIEW is lowercasing always right?
      }
    }
    return jsObj;
  }

  convert_obj_uri_to_string(jsObj) {
    // We are anticipating jsObj to have a .value
    if (jsObj.value != null) {
      return jsObj.value;
    }
    if (typeof jsObj !== 'object') {
      return jsObj;
    }
    throw new Error('expecting jsObj to have .value or be a literal');
  }

  name_result_handler(result, queryManager) {
    let parseObj, parseUri, result_type;
    const terms = queryManager.args.query_terms || queryManager.args.default_terms;
    const subj_term = result['?s'] || result['s'] || terms.s;
    const pred_term = result['?p'] || result['p'] || terms.p;
    const obj_term = result['?o'] || result['o'] || terms.o;

    // identify the result_type
    if (queryManager.args.from_N3) {
      result_type = 'n3';
    } else if (obj_term.value != null) {
      // TODO this LOOKS like GreenTurtle.  Is it a standard?
      //    It differs in that the .type is ['url','literal'] rather than an uri
      result_type = 'obj';
    } else {
      result_type = 'str';
    }

    // prepare parsers based on the result_type
    switch (result_type) {
      case 'n3':
        parseObj = this.convert_N3_obj_to_GreenTurtle;
        parseUri = this.convert_N3_uri_to_string;
        break;
      case 'obj':
        parseObj = this.convert_obj_obj_to_GreenTurtle;
        parseUri = this.convert_obj_uri_to_string;
        break;
      case 'str': // TODO what should we call this?
        parseObj = this.convert_str_obj_to_GreenTurtle;
        parseUri = this.convert_str_uri_to_string;
        break;
      default:
        console.error(result);
        throw new Error('can not determine result_type');
    }
    try {
      const q = {
        s: parseUri(subj_term),
        p: parseUri(pred_term),
        o: parseObj(obj_term),
        g: terms.g
      };
      this.add_quad(q);
    } catch (error) {
      //@make_json_dialog(result, null, {title: error.toString()})
      console.warn(result);
      console.error(error);
    }
  }


  // ## Examples and Tests START

  make_wikidata_name_query(uri, langs) {
    let prefixes, subj;
    if (uri == null) { uri = 'wd:Q160302'; }
    if (langs == null) { langs = "en"; } // comma delimited langs expected, eg "en,fr,de"
    if (uri.startsWith('http')) {
      subj = `<${uri}>`;
    } else {
      subj = uri;
    }
    if (uri.startsWith('wd:')) {
      prefixes = "PREFIX wd: <http://www.wikidata.org/entity/>";
    } else {
      prefixes = "";
    }
    return `\
${prefixes}
SELECT ?subj ?pred ?subjLabel
WHERE {
BIND (${subj} as ?subj)
BIND (rdfs:label as ?pred)
SERVICE wikibase:label {
  bd:serviceParam wikibase:language "${langs}" .
}
}`; // "
  }

  test_json_fetch(uri, success, err) {
    if (uri == null) { uri = 'https://www.wikidata.org/entity/Q12345.json'; }
    if (success == null) { success = r => console.log(r, r.json().then(json=> console.log(JSON.stringify(json)))); }
    if (err == null) { err = e => console.log('OOF:',e); }
    fetch(uri).then(success).catch(err);
  }

  // ## QUAD Ingestion

  make_qname(uri) {
    // TODO(smurp) dear god! this method name is lying (it is not even trying)
    return uri;
  }
  add_quad(quad, sprql_subj) {  //sprq_sbj only used in SPARQL quieries
    // FIXME Oh! How this method needs a fine toothed combing!!!!
    //   * are rdf:Class and owl:Class the same?
    //   * uniquer is misnamed, it should be called make_domsafe_id or sumut
    //   * vars like sid, pid, subj_lid should be revisited
    //   * review subj vs subj_n
    //   * do not conflate node ids across prefixes eg rdfs:Class vs owl:Class
    //   * Literal should not be a subclass of Thing. Thing and dataType are sibs
    // Terminology:
    //   A `lid` is a "local id" which is unique and a safe identifier for css selectors.
    //   This is in opposition to an `id` which is a synonym for uri (ideally).
    //   There is inconsistency in this usage, which should be cleared up.
    //   Proposed terms which SHOULD be used are:
    //     - *_curie             eg pred_curie='rdfs:label'
    //     - *_uri               eg subj_uri='http://sparql.cwrc.ca/ontology/cwrc#NaturalPerson'
    //     - *_lid: a "local id" eg subj_lid='atwoma'
    //console.log("HuViz.add_quad()", quad)
    //
    // Expecting .o to either:
    //   * represent an uri
    //     - type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
    //     - value: the uri
    //   * represent a literal
    //     - language: undefined OR a full language url
    //     - type: an XMLSchema value
    //     - value: the value in a string
    const subj_uri = quad.s;
    if ((subj_uri == null)) {
      throw new Error("quad.s is undefined");
    }
    const pred_uri = quad.p;
    if ((pred_uri == null)) {
      throw new Error("quad.p is undefined");
    }
    const ctxid = quad.g || this.get_context();
    const subj_lid = uniquer(subj_uri);  // FIXME rename uniquer to make_dom_safe_id
    this.object_value_types[quad.o.type] = 1;
    this.unique_pids[pred_uri] = 1;
    let newsubj = false;
    let subj = null;
    //if @p_display then @performance_dashboard('add_quad')

    // REVIEW is @my_graph still needed and being correctly used?
    if ((this.my_graph.subjects[subj_uri] == null)) {
      newsubj = true;
      subj = {
        id: subj_uri,
        name: subj_lid,
        predicates: {}
      };
      this.my_graph.subjects[subj_uri] = subj;
    } else {
      subj = this.my_graph.subjects[subj_uri];
    }

    this.ensure_predicate_lineage(pred_uri);
    let edge = null;
    const subj_n = this.get_or_create_node_by_id(subj_uri);
    const pred_n = this.get_or_create_predicate_by_id(pred_uri);
    const cntx_n = this.get_or_create_context_by_id(ctxid);
    if ((quad.p === RDF_subClassOf) && this.show_class_instance_edges) {
      this.try_to_set_node_type(subj_n, OWL_Class);
    }
    // TODO: use @predicates_to_ignore instead OR rdfs:first and rdfs:rest
    if (pred_uri.match(/\#(first|rest)$/)) {
      console.warn(`add_quad() ignoring quad because pred_uri=${pred_uri}`, quad);
      return;
    }
    // set the predicate on the subject
    if ((subj.predicates[pred_uri] == null)) {
      subj.predicates[pred_uri] = {objects:[]};
    }
    if (quad.o.type === RDF_object) {
      // The object is not a literal, but another resource with an uri
      // so we must get (or create) a node to represent it
      const obj_n = this.get_or_create_node_by_id(quad.o.value);
      if ((quad.o.value === RDF_Class) && this.show_class_instance_edges) {
        // This weird operation is to ensure that the Class Class is a Class
        this.try_to_set_node_type(obj_n, OWL_Class);
      }
      if ((quad.p === RDF_subClassOf) && this.show_class_instance_edges) {
        this.try_to_set_node_type(obj_n, OWL_Class);
      }
      // We have a node for the object of the quad and this quad is relational
      // so there should be links made between this node and that node
      const is_type = is_one_of(pred_uri, TYPE_SYNS);
      const use_thumb = is_one_of(pred_uri, THUMB_PREDS) && this.show_thumbs_dont_graph;
      const make_edge = this.show_class_instance_edges || (!is_type && !use_thumb);
      if (is_type) {
        this.try_to_set_node_type(subj_n, quad.o.value);
      }
      if (use_thumb) {
        subj_n.__thumbnail = quad.o.value;
        this.develop(subj_n);
      }
      if (make_edge) {
        this.develop(subj_n); // both subj_n and obj_n should hatch for edge to make sense
        // REVIEW uh, how are we ensuring that the obj_n is hatching? should it?
        edge = this.get_or_create_Edge(subj_n, obj_n, pred_n, cntx_n);
        this.infer_edge_end_types(edge);
        edge.register_context(cntx_n);
        edge.color = this.gclui.predicate_picker.get_color_forId_byName(pred_n.lid,'showing');
        this.add_edge(edge);
        this.develop(obj_n);
      }
    } else { // ie the quad.o is a literal
      if (is_one_of(pred_uri, NAME_SYNS)) {
        this.set_name(
          subj_n,
          quad.o.value.replace(/^\s+|\s+$/g, ''),
          quad.o.language);
        if (subj_n.embryo) {
          this.develop(subj_n); // might be ready now
        }
      } else { // the object is a literal other than name
        if (this.make_nodes_for_literals) {
          let isLiteral, objId;
          const objVal = quad.o.value;
          const simpleType = getTypeSignature(quad.o.type || '') || 'Literal';
          if ((objVal == null)) {
            throw new Error("missing value for " + JSON.stringify([subj_uri, pred_uri, quad.o]));
          }
          // Does the value have a language or does it contain spaces?
          //objValHasSpaces = (objVal.match(/\s/g)||[]).length > 0
          if (quad.o.language && this.group_literals_by_subj_and_pred) {
            // Perhaps an appropriate id for a literal "node" is
            // some sort of amalgam of the subject and predicate ids
            // for that object.
            // Why?  Consider the case of rdfs:comment.
            // If there are multiple literal object values on rdfs:comment
            // they are presumably different language versions of the same
            // text.  For them to end up on the same MultiString instance
            // they all have to be treated as names for a node with the same
            // id -- hence that id must be composed of the subj and pred ids.
            // Another perspective on this is that these are different comments
            // in different languages, so what suggests that they have anything
            // at all to do with one another?
            // Further, if (as is the case with these triples)
            //   Martineau_Harriet hasActivistInvolvementIn "_tariff reform_"
            //   Martineau_Harriet hasGenderedPoliticalActivity "_tariff reform_"
            // they SHOULD share the "_tariff reform_" node.
            //
            // So, after all this (poorly stated commentary) the uneasy conclusion
            // is that if a literal value has a language associated with it then
            // all the alternate language literals associated with that same
            // subject/predicate combination will be treated as the same literal
            // node.
            const objKey = `${subj_n.lid} ${pred_uri}`;
            objId = synthIdFor(objKey);
            const objId_explanation = `synthIdFor('${objKey}') = ${objId}`;
            //console.warn(objId_explanation)
          } else {
            objId = synthIdFor(objVal);
          }
          const literal_node = this.get_or_create_node_by_id(objId, objVal, (isLiteral = true));
          this.try_to_set_node_type(literal_node, simpleType);
          literal_node.__dataType = quad.o.type;
          this.develop(literal_node);
          this.set_name(literal_node, quad.o.value, quad.o.language);
          edge = this.get_or_create_Edge(subj_n, literal_node, pred_n, cntx_n);
          this.infer_edge_end_types(edge);
          edge.register_context(cntx_n);
          edge.color = this.gclui.predicate_picker.get_color_forId_byName(pred_n.lid,'showing');
          this.add_edge(edge);
          literal_node.fully_loaded = true; // for sparql quieries to flag literals as fully_loaded
        }
      }
    }
    // if the subject came from SPARQL then to true (i.e. fully loaded)
    if (this.using_sparql()) {
      subj_n.fully_loaded = false; // all nodes default to not being fully_loaded
      //if subj_n.id is sprql_subj# if it is the subject node then is fully_loaded
      //  subj_n.fully_loaded = true
      if (subj_n.id === quad.subject) { // if it is the subject node then is fully_loaded
        subj_n.fully_loaded = true;
      }
    }

    if (subj_n.embryo) {
      // It is unprincipled to do this, but some subj_n were escaping development.
      this.develop(subj_n);
    }

    this.consider_suppressing_edge_and_ends_re_OA(edge);

    this.last_quad = quad;
    this.pfm_count('add_quad');
    return edge;
  }

  consider_suppressing_edge_and_ends_re_OA(edge) {
    // ## Purpose:
    //
    // Suppress (ie keep from appearing in the graph by policy) nodes and edges
    // whose only purpose is to implement annotations.
    //
    // The exceptions to this are:
    //
    // * the object of an oa:exact predicate should NOT be suppressed
    // * the oa:exact object should be depicted as having an edge of type '_:hasAnnotation'
    // * the oa:hasTarget edge should be suppressed but a SYNTHETIC edge should be
    //   put in its place which links the target of the [oa:hasTarget] edge to the
    //   target of the [oa:exact] edge with [_:hasAnnotation]
    //
    // ## REVIEW:
    //
    // * discover if there are other predicates which should be treated like [oa:exact]
    //
    // ## Method:
    //
    // Place a node in the suppressed_set if any one of the following is true:
    // * its edges are only in the OA vocab
    // * it is in a taxon which is in the OA vocab
    // * it only has edges connecting it to nodes which are instances of OA classes
    //
    // The other aspect of this strategy which is complicated is how to keep
    // account of the relations between the nodes and edges in the subgraph
    // of an Annotion, noting these considerations:
    // * an Annotation may have 1 or more Targets
    // * an Annotation may have 0 or more Bodies
    // * Bodies and Targets may be connected directly to their Resources OR
    // * the may be indirectly connected to Resources via ResourceSelection
    // * multiple triples must be captured before a summary Edge can be created
    // * some of those triples my participate in multiple summary Edges
    // * during digestion some nodes may not have their subgraph membership known
    // * some Annotations will not have an easy "summary object" (eg oa:exact value)
    // * we will still want to be able to graph such Annotations
    // * multiple Bodies for an Annotation should each be "summarized"
    //
    // Strategies:
    //
    // 1. build paths
    //   * Nodes come to us randomly, so whenever one arrives knit it into a
    //     path and check to see if the newly extended path now satisfies
    //     conditions such as sufficiency for a) display b) closing
    //   * challenges:
    //     - how to express the logic for testing displayability and closability
    //     - how to maintain the set of fragmentary paths
    //   * references:
    //     - is this like Nooron's AutoSem?

    if (!edge || !this.suppress_annotation_edges) {
      return;
    }
    this.suppress_node_re_OA_if_appropriate(edge.source);
    // if edge.predicate.id is OA_exact # TODO once ids are urls then this is truer
    if (edge.predicate.lid === 'exact') { // TODO ensure ids are urls then do the above...
      if (this.hasAnnotation_targets == null) { this.hasAnnotation_targets = []; }
      if (!(this.hasAnnotation_targets.includes(edge.target))) {
        this.hasAnnotation_targets.push(edge.target);
      }
      //alert("not suppressing the object of oa:exact: #{edge.target.lid}")
      return; // edge.target should not be suppressed
    }
    const suppressEdge = this.in_OA_cached(edge.predicate); // WIP what????
    this.suppress_node_re_OA_if_appropriate(edge.target);
  }

  // Suppress this node if all its classes are in_OA.
  // Notice that if some of its classes are not in_OA then presumably we should
  // not suppress it because those classes make it "interesting to humans".
  // This begs the question "How does in_OA() work?".
  // Presumably the expectation of this
  // method is that in_OA() checks to see if the class is defined in the OA
  // ontology OR is one of those classes used by the OA ontology.
  // Nodes should be suppressed if they are not of interest to the user
  // because they are merely present as bookkeeping associated with OA.
  // Nodes may be in one of these conditions:
  // a) only typed as a class which the OA ontology explicitly uses (ie OA or a class OA uses)
  // b) not typed as a class which the OA ontology uses
  // If b) then the node is not suppressed
  suppress_node_re_OA_if_appropriate(node) {
    let should_suppress = true;
    for (let taxon of node.taxons) {
      if (!this.in_OA_cached(taxon)) {
        should_suppress = false;
        continue;
      }
    }
    if (should_suppress) {
      this.suppress(node);
    }
  }

  in_OA_cached(thing) {
    if ((thing._is_in_OA == null)) {
      thing._is_in_OA = this.in_OA_vocab(thing.id);
    }
    return thing._is_in_OA;
  }

  in_OA_vocab(url) {
    // Ideally it would be enough for url.startsWith to be tested for OA membership
    // but until @ontology.domain and @ontology.range and such are using URLs as
    // ids rather than "lids" (ie 'local' ids) we must also check for bare lids
    // such as 'Annotation', 'TextQuoteSelector' and friends.
    // Notice that since OA_terms_regex
    const match = url.match(OA_terms_regex);
    const is_in = !!(url.startsWith(OA_) || match); // force boolean
    console.info(`${url} is ${(!is_in && 'NOT ') || ''}in OA`);
    return is_in;
  }

  remove_from_nameless(node) {
    if (node.nameless != null) {
      if (this.nameless_removals == null) { this.nameless_removals = 0; }
      this.nameless_removals++;
      const node_removed = this.nameless_set.remove(node);
      if (node_removed !== node) {
        console.log("expecting",node_removed,"to have been",node);
      }
      //if @nameless_set.binary_search(node) > -1
      //  console.log("expecting",node,"to no longer be found in",@nameless_set)
      delete node.nameless_since;
    }
  }
  add_to_nameless(node) {
    if (node.isLiteral) {
      // Literals cannot have names looked up.
      return;
    }
    node.nameless_since = performance.now();
    if (this.nameless_set.traffic == null) { this.nameless_set.traffic = 0; }
    this.nameless_set.traffic++;
    this.nameless_set.add(node);
    //@nameless_set.push(node) # REVIEW(smurp) why not .add()?????
  }

  set_name(node, full_name, lang) {
    // So if we set the full_name to null that is to mean that we have
    // no good idea what the name yet.
    const perform_rename = () => {
      if (full_name != null) {
        if (!node.isLiteral) {
          this.remove_from_nameless(node);
        }
      } else {
        if (!node.isLiteral) {
          this.add_to_nameless(node);
        }
        full_name = node.lid || node.id;
      }
      if (typeof full_name === 'object') {
        // MultiString instances have constructor.name == 'String'
        // console.log(full_name.constructor.name, full_name)
        return node.name = full_name;
      } else {
        if (node.name) {
          return node.name.set_val_lang(full_name, lang);
        } else {
          return node.name = new MultiString(full_name, lang);
        }
      }
    };
    if (node.state && (node.state.id === 'shelved')) {
      // Alter calls the callback add_name in the midst of an operation
      // which is likely to move subj_n from its current position in
      // the shelved_set.  The shelved_set is the only one which is
      // sorted by name and as a consequence is the only one able to
      // be confused by the likely shift in alphabetic position of a
      // node.  For the sake of efficiency we "alter()" the position
      // of the node rather than do shelved_set.resort() after the
      // renaming.
      this.shelved_set.alter(node, perform_rename);
      this.tick("Tick in set_name");
    } else {
      perform_rename();
    }
    //node.name ?= full_name  # set it if blank
    const len = this.truncate_labels_to;
    if ((len == null)) {
      throw new Error("set_name('" + node.id + "', " + full_name + ", " + lang + ')');
      return;
    }
    if (len > 0) {
      node.pretty_name = node.name.substr(0, len); // truncate
    } else {
      node.pretty_name = node.name || '“”';
    }
    node.scroll_offset = 0;
  }

  scroll_pretty_name(node) {
    let limit;
    if (this.truncate_labels_to >= node.name.length) {
      limit = node.name.length;
    } else {
      limit = this.truncate_labels_to;
    }
    const should_scroll = (limit > 0) && (limit < node.name.length);
    if (!should_scroll) {
      return;
    }
    if (true) { // node.label_truncated_to
      const spacer = this.scroll_spacer;
      if (!node.scroll_offset) {
        node.scroll_offset = 1;
      } else {
        node.scroll_offset += 1;
        if (node.scroll_offset > (node.name.length + spacer.length)) { //limit
          node.scroll_offset = 0;
        }
      }
      let wrapped = "";
      while (wrapped.length < (3 * limit)) {
        wrapped +=  node.name + spacer;
      }
      node.pretty_name = wrapped.substr(node.scroll_offset, limit);
    }
    // if node.pretty_name.length > limit
    //   alert("TOO BIG")
    // if node.pretty_name.length < 1
    //   alert("TOO SMALL")
  }

  unscroll_pretty_name(node) {
    this.set_name(node, node.name);
  }

  infer_edge_end_types(edge) {
    if (edge.source.type == null) { edge.source.type = 'Thing'; }
    if (edge.target.type == null) { edge.target.type = 'Thing'; }
    // infer type of source based on the range of the predicate
    const ranges = this.ontology.range[edge.predicate.lid];
    if (ranges != null) {
      this.try_to_set_node_type(edge.target, ranges[0]);
    }
    // infer type of source based on the domain of the predicate
    const domain_lid = this.ontology.domain[edge.predicate.lid];
    if (domain_lid != null) {
      this.try_to_set_node_type(edge.source, domain_lid);
    }
  }

  make_Edge_id(subj_n, obj_n, pred_n) {
    return ([subj_n, pred_n, obj_n].map((a) => a.lid)).join(' ');
  }

  get_or_create_Edge(subj_n, obj_n, pred_n, cntx_n) {
    const edge_id = this.make_Edge_id(subj_n, obj_n, pred_n);
    let edge = this.edges_by_id[edge_id];
    if ((edge == null)) {
      this.edge_count++;
      edge = new Edge(subj_n, obj_n, pred_n, cntx_n);
      this.edges_by_id[edge_id] = edge;
    }
    return edge;
  }

  add_edge(edge) {
    if (edge.id.match(/Universal$/)) {
      console.log("add", edge.id);
    }
    // TODO(smurp) should .links_from and .links_to be SortedSets? Yes. Right?
    this.add_to(edge, edge.source.links_from);
    this.add_to(edge, edge.target.links_to);
    return edge;
  }

  delete_edge(e) {
    this.remove_link(e.id);
    this.remove_from(e, e.source.links_from);
    this.remove_from(e, e.target.links_to);
    delete this.edges_by_id[e.id];
  }

  try_to_set_node_type(node, type_uri) {
    // if not type_uri.includes(':')
    //   debugger
    //   throw new Error("try_to_set_node_type() expects an URL, not #{type_uri}")
    const type_lid = uniquer(type_uri); // should ensure uniqueness
    if (!node._types) {
      node._types = [];
    }
    if (!(node._types.includes(type_lid))) {
      node._types.push(type_lid);
    }
    const prev_type = node.type;
    node.type = type_lid;
    if (prev_type !== type_lid) {
      this.assign_types(node);
    }
     // if 1 then more data shown
  }

  get_context() {
    return this.data_uri || this.DEFAULT_CONTEXT;
  }

  parseAndShowTTLData(data, textStatus, callback) {
    // modelled on parseAndShowNQStreamer
    //console.log("parseAndShowTTLData",data)
    const parse_start_time = new Date();
    const context = this.get_context();
    if ((typeof GreenerTurtle !== 'undefined' && GreenerTurtle !== null) && (this.turtle_parser === 'GreenerTurtle')) {
      //console.log("GreenTurtle() started")
      //@G = new GreenerTurtle().parse(data, "text/turtle")
      try {
        this.G = new GreenerTurtle().parse(data, "text/turtle");
      } catch (e) {
        const msg = escapeHtml(e.toString());
        const blurt_msg = `<p>There has been a problem with the Turtle parser.  Check your dataset for errors.</p><p class="js_msg">${msg}</p>`;
        this.blurt(blurt_msg, "error");
        return false;
      }
    }
    let quad_count = 0;
    const every = this.report_every;
    for (let subj_uri in this.G.subjects) {
      //console.log("frame:",frame)
      //console.log(frame.predicates)
      const frame = this.G.subjects[subj_uri];
      for (let pred_id in frame.predicates) {
        const pred = frame.predicates[pred_id];
        for (let obj of pred.objects) {
          // this is the right place to convert the ids (URIs) to CURIES
          //   Or should it be QNames?
          //      http://www.w3.org/TR/curie/#s_intro
          if (every === 1) {
            this.show_state_msg(`<LI>${frame.id} <LI>${pred.id} <LI>${obj.value}`);
            console.log("===========================\n  #", quad_count, "  subj:", frame.id, "\n  pred:", pred.id, "\n  obj.value:", obj.value);
          } else {
            if ((quad_count % every) === 0) {
              this.show_state_msg("parsed relation: " + quad_count);
            }
          }
          quad_count++;
          this.add_quad({
            s: frame.id,
            p: pred.id,
            o: obj, // keys: type,value[,language]
            g: context
          });
        }
      }
    }
    this.dump_stats();
    this.after_file_loaded('stream', callback);
  }

  dump_stats() {
    console.debug("object_value_types:", this.object_value_types);
    console.debug("unique_pids:", this.unique_pids);
  }

  parseAndShowTurtle(data, textStatus) {
    let msg = "data was " + data.length + " bytes";
    const parse_start_time = new Date();

    if ((typeof GreenerTurtle !== 'undefined' && GreenerTurtle !== null) && (this.turtle_parser === 'GreenerTurtle')) {
      this.G = new GreenerTurtle().parse(data, "text/turtle");
      console.log("GreenTurtle");

    } else if (this.turtle_parser === 'N3') {
      console.log("N3");
      //N3 = require('N3')
      console.log("n3", N3);
      const predicates = {};
      const parser = N3.Parser();
      parser.parse(data, (err, trip, pref) => {
        console.log(trip);
        if (pref) {
          console.log(pref);
        }
        if (trip) {
          return this.add_quad(trip);
        } else {
          return console.log(err);
        }
      });

      //console.log("my_graph", @my_graph)
      console.log('===================================');
      for (let prop_name of ['predicates','subjects','objects']) {
        var prop_obj = this.my_graph[prop_name];
        console.log(prop_name,((() => {
          const result = [];
          for (let key in prop_obj) {
            const value = prop_obj[key];
            result.push(key);
          }
          return result;
        })()).length,prop_obj);
      }
      console.log('===================================');
    }
      //console.log "Predicates",(key for key,value of my_graph.predicates).length,my_graph.predicates
      //console.log "Subjects",my_graph.subjects.length,my_graph.subjects
      //console.log "Objects",my_graph.objects.length,my_graph.objects

    const parse_end_time = new Date();
    const parse_time = (parse_end_time - parse_start_time) / 1000;
    const siz = this.roughSizeOfObject(this.G);
    msg += " resulting in a graph of " + siz + " bytes";
    msg += " which took " + parse_time + " seconds to parse";
    if (this.verbosity >= this.COARSE) { console.log(msg); }
    const show_start_time = new Date();
    this.showGraph(this.G);
    const show_end_time = new Date();
    const show_time = (show_end_time - show_start_time) / 1000;
    msg += " and " + show_time + " sec to show";
    if (this.verbosity >= this.COARSE) { console.log(msg); }
    this.text_cursor.set_cursor("default");
    $("#status").text("");
  }

  choose_everything() {
    const cmd = new GraphCommand(
      this,
      {
        verbs: ['choose'],
        classes: ['Thing'],
        every_class: true
      }
    );
    this.gclc.run(cmd);
    this.tick("Tick in choose_everything");
  }

  remove_framing_quotes(s) { return s.replace(/^\"/,"").replace(/\"$/,""); }
  parseAndShowNQStreamer(uri, callback) {
    // turning a blob (data) into a stream
    //   http://stackoverflow.com/questions/4288759/asynchronous-for-cycle-in-javascript
    //   http://www.dustindiaz.com/async-method-queues/
    const owl_type_map = {
      uri:     RDF_object,
      literal: RDF_literal
    };
    const worker = new Worker('/huviz/xhr_readlines_worker.js');
    let quad_count = 0;
    worker.addEventListener('message', (e) => {
      let msg = null;
      if (e.data.event === 'line') {
        quad_count++;
        this.show_state_msg("<h3>Parsing... </h3><p>" + uri + "</p><progress value='" + quad_count + "' max='" + this.node_count + "'></progress>");
        //if quad_count % 100 is 0
          //@show_state_msg("parsed relation " + quad_count)
        const q = parseQuadLine(e.data.line);
        if (q) {
          q.s = q.s.raw;
          q.p = q.p.raw;
          q.g = q.g.raw;
          q.o = {
            type:  owl_type_map[q.o.type],
            value: unescape_unicode(this.remove_framing_quotes(q.o.toString()))
          };
          this.add_quad(q);
        }
      } else if (e.data.event === 'start') {
        msg = "starting to split " + uri;
        this.show_state_msg("<h3>Starting to split... </h3><p>" + uri + "</p>");
        this.node_count = e.data.numLines;
      } else if (e.data.event === 'finish') {
        msg = "finished_splitting " + uri;
        this.show_state_msg("done loading");
        this.after_file_loaded(uri, callback);
      } else {
        msg = "unrecognized NQ event:" + e.data.event;
      }
      if (msg != null) {
        return this.blurt(msg);
      }
    });
    worker.postMessage({uri});
  }

  parse_and_show_NQ_file(data, callback) {
    //TODO There is currently no error catcing on local nq files
    const owl_type_map = {
      uri:     RDF_object,
      literal: RDF_literal
    };
    let quad_count = 0;
    const allLines = data.split(/\r\n|\n/);
    for (let line of allLines) {
      quad_count++;
      const q = parseQuadLine(line);
      if (q) {
        q.s = q.s.raw;
        q.p = q.p.raw;
        q.g = q.g.raw;
        q.o = {
          type:  owl_type_map[q.o.type],
          value: unescape_unicode(this.remove_framing_quotes(q.o.toString()))
        };
        this.add_quad(q);
      }
    }
    this.local_file_data = "";
    this.after_file_loaded('local file', callback);
  }

  DUMPER(data) {
    console.log(data);
  }

  fetchAndShow(url, callback) {
    let msg;
    this.show_state_msg("fetching " + url);
    let the_parser = this.parseAndShowNQ; //++++Why does the parser default to NQ?
    if (url.match(/.ttl/)) {
      the_parser = this.parseAndShowTTLData; // does not stream
    } else if (url.match(/.(nq|nt)/)) { // TODO Retire this in favor of parseAndShowFile
      the_parser = this.parseAndShowNQ;
    } else if (url.match(/.(jsonld|nq|nquads|nt|n3|trig|ttl|rdf|xml)$/)) {
      the_parser = this.parseAndShowFile;
    } else { //File not valid
      //abort with message
      // NOTE This only catches URLs that do not have a valid file name;
      // nothing about actual file format
      msg = `Could not load ${url}. The data file format is not supported! ` +
            "Only accepts jsonld|nq|nquads|nt|n3|trig|ttl|rdf|xml extensions.";
      this.hide_state_msg();
      this.blurt(msg, 'error');
      $('#'+this.get_data_ontology_display_id()).remove();
      this.reset_dataset_ontology_loader();
      //@init_resource_menus()
      return;
    }

    if (the_parser === this.parseAndShowFile) {
      this.parseAndShowFile(url, callback);
      return;
    }

    // Deal with the case that the file is cached inside the datasetDB as a result
    // of having been dragged and droppped from the local disk and added to the datasetDB.
    if (url.startsWith('file:///') || (url.indexOf('/') === -1)) { // ie it is a local file
      this.get_resource_from_db(url, (err, rsrcRec) => {
        if (rsrcRec != null) {
          the_parser(rsrcRec.data);
          return; // REVIEW ensure that proper try catch is happening
        }
        this.blurt(err || `'${url} was not found in your DATASET menu.  Provide it and reload this page`);
        this.reset_dataset_ontology_loader();
      });
      return;
    }

    if (the_parser === this.parseAndShowNQ) {
      this.parseAndShowNQStreamer(url, callback);
      return;
    }

    $.ajax({
      url,
      success: (data, textStatus) => {
        the_parser(data, textStatus, callback);
        //@fire_fileloaded_event(url) ## should call after_file_loaded(url, callback) within the_parser
        this.hide_state_msg();
      },
      error: (jqxhr, textStatus, errorThrown) => {
        console.log(url, errorThrown);
        if (!errorThrown) {
          errorThrown = "Cross-Origin error";
        }
        msg = errorThrown + " while fetching dataset " + url;
        this.hide_state_msg();
        $('#'+this.get_data_ontology_display_id()).remove();
        this.blurt(msg, 'error');  // trigger this by goofing up one of the URIs in cwrc_data.json
        this.reset_dataset_ontology_loader();
        //TODO Reset titles on page
      }
    });
  }

  log_query_with_timeout(qry, timeout, fillColor, bgColor) {
    const queryManager = this.log_query(qry);
    queryManager.anim = this.animate_sparql_query(queryManager.preElem, timeout, fillColor, bgColor);
    return queryManager;
  }

  log_query(qry) {
    return this.gclui.push_sparqlQuery_onto_log(qry);
  }

  run_little_test_query() {
    const littleTestQuery = "SELECT * WHERE {?s ?o ?p} LIMIT 1";

    $.ajax({
      method: 'GET',
      url: url + '?query=' + encodeURIComponent(littleTestQuery),
      headers: {
        'Accept': 'application/sparql-results+json'
      },
      success: (data, textStatus, jqXHR) => {
        console.log("This a little repsponse test: " + textStatus);
        console.log(jqXHR);
        console.log(jqXHR.getAllResponseHeaders(data));
        console.log(data);
      },
      error: (jqxhr, textStatus, errorThrown) => {
        console.log(url, errorThrown);
        console.log(jqXHR.getAllResponseHeaders(data));
      }
    });
  }

  run_managed_query_abstract(args) {
    // Reference: https://www.w3.org/TR/sparql11-protocol/
    if (args == null) { args = {}; }
    if (args.success_handler == null) { args.success_handler = noop; }
    if (args.error_callback == null) { args.error_callback = noop; }
    if (args.timeout == null) { args.timeout = this.get_sparql_timeout_msec(); }

    const queryManager = this.log_query_with_timeout(args.query, args.timeout);
    queryManager.args = args;
    return queryManager;
  }

  run_managed_query_ajax(args) {
    const {query, serverUrl} = args;
    const queryManager = this.run_managed_query_abstract(args);
    const {success_handler, error_callback, timeout} = args;
    // These POST settings work for: CWRC, WWI open, on DBpedia, and Open U.K.
    // but not on Bio Database
    const more = "&timeout=" + timeout;
    // TODO This should be decrufted
    const ajax_settings = { //TODO Currently this only works on CWRC Endpoint
      'method': 'GET',
      'url': serverUrl + '?query=' + encodeURIComponent(query) + more,
      'headers' : {
        // This is only required for CWRC - not accepted by some Endpoints
        //'Content-Type': 'application/sparql-query'
        'Accept': 'application/sparql-results+json'
      }
    };
    if (serverUrl === "http://sparql.cwrc.ca/sparql") { // Hack to make CWRC setup work properly
      ajax_settings.headers = {
        'Content-Type' : 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      };
    }
    if (serverUrl.includes('wikidata')) {
      // these don't solve CORS issues but could solve CORB issues
      ajax_settings.headers.Accept = "text/tab-separated-values";
      ajax_settings.headers.Accept = "text/csv";
    }

    queryManager.xhr = $.ajax({
      timeout,
      method: ajax_settings.method,
      url: ajax_settings.url,
      headers: ajax_settings.headers,
      success: (data, textStatus, jqXHR) => {
        queryManager.cancelAnimation();
        try {
          return success_handler(data, textStatus, jqXHR, queryManager);
        } catch (e) {
          return queryManager.fatalError(e);
        }
      },
      error: (jqxhr, textStatus, errorThrown) => {
        if (!errorThrown) {
          errorThrown = "Cross-Origin error";
        }
        const msg = errorThrown + " while fetching " + serverUrl;
        $('#'+this.get_data_ontology_display_id()).remove();
        queryManager.fatalError(msg);
        if (error_callback != null) {
          return error_callback(jqxhr, textStatus, errorThrown, queryManager);
        }
      }
    });

    return queryManager;
  }

  run_managed_query_worker(qry, serverUrl, args) {
    args.query = qry;
    args.serverUrl = serverUrl;
    const queryManager = this.run_managed_query_abstract(args);
    return queryManager;
  }

  sparql_graph_query_and_show__trigger(url) {
    const selectId = this.endpoint_loader.select_id;
    this.sparql_graph_query_and_show(url, selectId);
    //console.log @dataset_loader
    $(`#${this.dataset_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
    $(`#${this.ontology_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
    $(`#${this.script_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
  }

  sparql_graph_query_and_show(url, id, callback) {
    const qry = `\
# sparql_graph_query_and_show()
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?g ?label
WHERE {
GRAPH ?g { } .
OPTIONAL {?g rdfs:label ?label}
}
ORDER BY ?g\
`;
    //alert("sparql_graph_query_and_show() id: #{id}")
    // these are shared between success and error handlers
    const spinner = $(`#sparqlGraphSpinner-${id}`);
    spinner.css('display','block');
    const graphSelector = `#sparqlGraphOptions-${id}`;
    $(graphSelector).parent().css('display', 'none');
    this.sparqlQryInput_hide();
    // LOAD button should be disabled while the search for graphs is happening
    this.disable_go_button();
    const handle_graphsNotFound = () => {
      $(graphSelector).parent().css('display', 'none');
      this.reset_endpoint_form(true);
      return this.enable_go_button();
    };

    const make_success_handler = () => {
      return (data, textStatus, jqXHR, queryManager) => {
        let json_data;
        const json_check = typeof data;
        if (json_check === 'string') {
          json_data = JSON.parse(data);
        } else {
          json_data = data;
        }

        const results = json_data.results.bindings;
        queryManager.setResultCount(results.length);

        const graphsNotFound = jQuery.isEmptyObject(results[0]);
        if (graphsNotFound) {
          handle_graphsNotFound();
          return;
        }
        let graph_options = `<option id='${this.unique_id()}' value='${url}'> All Graphs </option>`;
        for (let graph of results) {
          var label;
          if (graph.label != null) {
            label = ` (${graph.label.value})`;
          } else {
            label = '';
          }
          graph_options = graph_options + `<option id='${this.unique_id()}' value='${graph.g.value}'>${graph.g.value}${label}</option>`;
        }
        $(`#sparqlGraphOptions-${id}`).html(graph_options);
        $(graphSelector).parent().css('display', 'block');
        this.reset_endpoint_form(true);
        return this.disable_go_button(); // disable until a graph or term is picked
      };
    };

    const make_error_callback = () => {
      return (jqXHR, textStatus, errorThrown) => {
        $(graphSelector).parent().css('display', 'none');
        spinner.css('visibility','hidden');
        //@reset_dataset_ontology_loader()
        handle_graphsNotFound();
        return this.reset_endpoint_form(true);
      };
    };

    const args = {
      success_handler: make_success_handler(),
      error_callback: make_error_callback()
    };
    args.query = qry;
    args.serverUrl = url;
    this.sparql_graph_query_and_show_queryManager = this.run_managed_query_ajax(args);
  }

  sparqlQryInput_hide() {
    this.sparqlQryInput_JQElem.hide(); //css('display', 'none')
  }

  sparqlQryInput_show() {
    this.sparqlQryInput_JQElem.show();
    this.sparqlQryInput_JQElem.css({'color': 'inherit'} );
  }

  load_endpoint_data_and_show(subject, callback) {
    this.sparql_node_list = [];
    this.pfm_count('sparql');
    //if @p_display then @performance_dashboard('sparql_request')
    const node_limit = this.endpoint_limit_JQElem.val();
    const url = this.endpoint_loader.value;
    this.endpoint_loader.outstanding_requests = 0;
    let fromGraph = '';
    if (this.endpoint_loader.endpoint_graph) {
      fromGraph=` FROM <${this.endpoint_loader.endpoint_graph}> `;
    }
    const qry = `\
# load_endpoint_data_and_show('${subject}')
SELECT * ${fromGraph}
WHERE {
{<${subject}> ?p ?o}
UNION
{{<${subject}> ?p ?o} .
 {?o ?p2 ?o2}}
UNION
{{?s3 ?p3 <${subject}>} .
 {?s3 ?p4 ?o4 }}
}
LIMIT ${node_limit}\
`;

    const make_success_handler = () => {
      return (data, textStatus, jqXHR, queryManager) => {
        let json_data;
        const json_check = typeof data;
        if (json_check === 'string') {
          json_data = JSON.parse(data);
        } else {
          json_data = data;
        }
        queryManager.setResultCount(json_data.length);
        this.add_nodes_from_SPARQL(json_data, subject, queryManager);
        const endpoint = this.endpoint_loader.value;
        this.dataset_loader.disable();
        this.ontology_loader.disable();
        this.replace_loader_display_for_endpoint(endpoint, this.endpoint_loader.endpoint_graph);
        this.disable_go_button();
        this.big_go_button.hide();
        return this.after_file_loaded('sparql', callback);
      };
    };

    const args = {
      query: qry,
      serverUrl: url,
      success_handler: make_success_handler()
    };
    this.run_managed_query_ajax(args);
  }

  add_nodes_from_SPARQL(json_data, subject, queryManager) {
    const data = '';
    const context = this.get_context();
    const plainLiteral = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";
    //console.log(json_data)
    console.log("Adding node (i.e. fully exploring): " + subject);
    const results = json_data.results.bindings;
    if (queryManager != null) {
      queryManager.setResultCount(results.length);
    }
    for (let node of results) {
      var node_not_in_list, obj_val, pred, subj;
      let language = '';
      let obj_type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";
      if (node.s) {
        subj = node.s.value;
        pred = node.p.value;
        obj_val = subject;
      } else if (node.o2) {
        subj = node.o.value;
        pred = node.p2.value;
        obj_val = node.o2.value;
        if ((node.o2.type === 'literal') || (node.o.type === 'typed-literal')) {
          if (node.o2.datatype) {
            obj_type = node.o2.datatype;
          } else {
            obj_type = plainLiteral;
          }
          if (node.o2["xml:lang"]) {
            language = node.o2['xml:lang'];
          }
        }
        //console.log "-------- Sub-node -----" + subj + " " + pred  + " " + obj_val + " " + obj_type
      } else if (node.s3) {
        subj = node.s3.value;
        pred = node.p4.value;
        obj_val = node.o4.value;
        if ((node.o4.type === 'literal') || (node.o4.type === 'typed-literal')) {
          if (node.o4.datatype) {
            obj_type = node.o4.datatype;
          } else {
            obj_type = plainLiteral;
          }
          if (node.o4["xml:lang"]) {
            language = node.o4['xml:lang'];
          }
        }
      } else {
        subj = subject;
        pred = node.p.value;
        obj_val = node.o.value;
        if ((node.o.type === 'literal') || (node.o.type === 'typed-literal')) {
          if (node.o.datatype) {
            obj_type = node.o.datatype;
          } else {
            obj_type = plainLiteral;
          }
          if (node.o["xml:lang"]) {
            language = node.o['xml:lang'];
          }
        }
      }
      const q = {
        g: context,
        s: subj,
        p: pred,
        o: {
          type: obj_type,
          value: obj_val
        }
      };
      if (language) {
        q.o.language = language;
      }

      //console.log(q)
      //IF this is a new quad, then add it. Otherwise no.
      const node_list_empty = this.sparql_node_list.length;
      if (node_list_empty === 0) { // Add first node (because list is empty)
        this.sparql_node_list.push(q);
        node_not_in_list = true;
      } else {
        // Check if node is in list - sparql_node_list is used to keep track
        // of nodes that have already been loaded by a query so that they
        // will not be added again through add_quad.
        for (let snode of this.sparql_node_list) {
          //TODO - This filtering statement doesn't seem tight (Will not catch nodes that HuViz creates - that's okay I think)
          if ((q.s === snode.s) && (q.p === snode.p) && (q.o.value === snode.o.value) && (q.o.type === snode.o.type) && (q.o.language === snode.o.language)) {
            node_not_in_list = false;
            //console.log("Found it in list so will not send to add_quad")
            if ((snode.s === subject) || (snode.o.value === subject)) {//IF node is subject node IS already in list BUT fullly_loaded is false then set to true
              for (let i = 0; i < this.all_set.length; i++) {
                const a_node = this.all_set[i];
                if (a_node.id === subject) {
                   this.all_set[i].fully_loaded = true;
                 }
              }
            }
                   //console.log("Found node for #{subject} so making it fully_loaded")
            //else if snode.o.value is subject
              //for a_node, i in @all_set
                //console.log("compare: " + a_node.id + "   subject: " + subject)
                //if a_node.id is subject
                   //@all_set[i].fully_loaded = true
                   //console.log "Found object node for #{subject} which should be fully_loaded"
            break;
          } else {
            node_not_in_list = true;
          }
        }
      }
      //If node is not in list then add
      if (node_not_in_list) {
        this.sparql_node_list.push(q);
        node_not_in_list = false;
        this.add_quad(q, subject);
      }
    }
      //@dump_stats()
  }

  add_nodes_from_SPARQL_Worker(queryTarget, callback) {
    let previous_nodes;
    console.log("Make request for new query and load nodes");

    const timeout = this.get_sparql_timeout_msec();
    const queryManagerArgs = {timeout};
    let queryManager = null; // so it can be seen across calls to the message listener

    this.pfm_count('sparql');
    const url = this.endpoint_loader.value;
    if (this.sparql_node_list) { previous_nodes = this.sparql_node_list; } else { previous_nodes = []; }
    const graph = this.endpoint_loader.endpoint_graph;
    let local_node_added = 0;
    const query_limit = 1000; //@endpoint_limit_JQElem.val()
    const worker = new Worker('/huviz/sparql_ajax_query.js');
    worker.addEventListener('message', (e) => {
      //console.log e.data
      if (e.data.method_name === 'log_query') {
        queryManagerArgs.query = "#SPARQL_Worker\n"+e.data.qry;
        queryManagerArgs.serverUrl = url;
        queryManager = this.run_managed_query_abstract(queryManagerArgs);
        //queryManager = @log_query_with_timeout(, timeout)
        return;
      } else if (e.data.method_name !== 'accept_results') {
        const error = new Error("expecting either data.method = 'log_query' or 'accept_results'");
        queryManager.fatalError(error);
        throw error;
      }
      const add_fully_loaded = e.data.fully_loaded_index;
      for (let quad of e.data.results) {
        //console.log quad
        this.add_quad(quad);
        this.sparql_node_list.push(quad);  // Add the new quads to the official list of added quads
        local_node_added++;
      }
      queryManager.setResultCount(local_node_added);
      queryManager.cancelAnimation();
      if (local_node_added) {
        queryManager.setSuccessColor();
      } else {
        queryManager.setNoneColor();
      }
      // Verify through the loaded nodes that they are all properly marked as fully_loaded
      for (let i = 0; i < this.all_set.length; i++) {
        const a_node = this.all_set[i];
        if (a_node.id === queryTarget) {
          this.all_set[i].fully_loaded = true;
        }
      }
      this.endpoint_loader.outstanding_requests = this.endpoint_loader.outstanding_requests - 1;
      //console.log "Resort the shelf"
      this.shelved_set.resort();
      this.tick("Tick in add_nodes_from_SPARQL_worker");
      this.update_all_counts();
      if (callback != null) {
        callback();
      }
    });
    worker.postMessage({
      target: queryTarget,
      url,
      graph,
      limit: query_limit,
      timeout,
      previous_nodes});
  }

  using_sparql() {
    // force the return of a boolan with "not not"
    return !!((this.endpoint_loader != null) && this.endpoint_loader.value); // This is part of a sparql set
  }

  outstanding_sparql_requests_are_capped() {
    return !(this.endpoint_loader.outstanding_requests < this.max_outstanding_sparql_requests);
  }

  get_neighbors_via_sparql(chosen, callback) {
    if (!chosen.fully_loaded) {
      // If there are more than certain number of requests, stop the process
      const maxReq = this.max_outstanding_sparql_requests;
      if (!this.outstanding_sparql_requests_are_capped()) {
        this.endpoint_loader.outstanding_requests++;
        this.add_nodes_from_SPARQL_Worker(chosen.id, callback);
        console.log("outstanding_requests: " + this.endpoint_loader.outstanding_requests);
      } else {
        const msg = `SPARQL requests capped at ${maxReq}`;
        //@blurt(msg, 'alert')
        console.info(msg);
      }
    }
        // if $("#blurtbox").html()
        //   #console.log "Don't add error message " + message
        //   console.log "Request counter (over): " + @endpoint_loader.outstanding_requests
        // else
        //   #console.log "Error message " + message
        //   msg = "There are more than 300 requests in the que. Restricting process. " + message
        //   @blurt(msg, 'alert')
        //   message = true
        //   console.log "Request counter: " + @endpoint_loader.outstanding_requests
  }

  // Deal with buggy situations where flashing the links on and off
  // fixes data structures.  Not currently needed.
  show_and_hide_links_from_node(node) {
    this.show_links_from_node(node);
    this.hide_links_from_node(node);
  }

  get_container_width(pad) {
    pad = pad || hpad;
    const w_width = (this.container.clientWidth || window.innerWidth || document.documentElement.clientWidth || document.clientWidth) - pad;
    let tabs_width = 0;
    if (this.tabsJQElem && (this.tabsJQElem.length > 0)) {
      tabs_width = this.tabsJQElem.width();
    }
    //console.log @container
    //console.log @container.clientWidth
    //console.log "w_width: #{w_width} w. pad of #{pad}"
    //console.log "tabs_width: #{tabs_width}"
    return this.width = w_width - tabs_width;
  }
  // Should be refactored to be get_container_height
  get_container_height(pad) {
    pad = pad || hpad;
    this.height = (this.container.clientHeight || window.innerHeight || document.documentElement.clientHeight || document.clientHeight) - pad;
    if (this.args.stay_square) {
      this.height = this.width;
    }
    return this.height;
  }

  update_graph_radius() {
    this.graph_region_radius = Math.floor(Math.min(this.width / 2, this.height / 2));
    this.graph_radius = this.graph_region_radius * this.shelf_radius;
  }

  update_graph_center() {
    this.cy = this.height / 2;
    if (this.off_center) {
      this.cx = this.width - this.graph_region_radius;
    } else {
      this.cx = this.width / 2;
    }
    this.my = this.cy * 2;
    this.mx = this.cx * 2;
  }

  update_lariat_zone() {
    this.lariat_center = [this.cx, this.cy];
  }

  update_discard_zone() {
    this.discard_ratio = .1;
    this.discard_radius = this.graph_radius * this.discard_ratio;
    this.discard_center = [
      this.width - (this.discard_radius * 3),
      this.height - (this.discard_radius * 3)
    ];
  }

  set_search_regex(text) {
    this.search_regex = new RegExp(text || "^$", "ig");
    this.add_matching_nodes_to_matched_set();
  }

  add_matching_nodes_to_matched_set() {
    this.nodes.forEach((node, i) => {
      if (node.name.match(this.search_regex)) {
        if (!node.matched) {
          return this.matched_set.add(node);
        }
      } else {
        if (node.matched) {
          return this.matched_set.remove(node);
        }
      }
    });
    this.update_all_counts();
    this.tick(); // show labels NOW
  }

  update_searchterm() {
    const text = this.gclui.like_input.text();
    this.set_search_regex(text);
    this.restart();
  }

  dump_locations(srch, verbose, func) {
    verbose = verbose || false;
    const pattern = new RegExp(srch, "ig");
    nodes.forEach((node, i) => {
      if (!node.name.match(pattern)) {
        if (verbose) { console.log(pattern, "does not match!", node.name); }
        return;
      }
      if (func) { console.log(func.call(node)); }
      if (!func || verbose) { this.dump_details(node); }
    });
  }

  get_node_by_id(node_id, throw_on_fail) {
    throw_on_fail = throw_on_fail || false;
    const obj = this.nodes.get_by('id',node_id);
    if ((obj == null) && throw_on_fail) {
      throw new Error("node with id <" + node_id + "> not found");
    }
    return obj;
  }

  update_showing_links(n) {
    // TODO understand why this is like {Taxon,Predicate}.update_state
    //   Is this even needed anymore?
    const old_status = n.showing_links;
    if (n.links_shown.length === 0) {
      n.showing_links = "none";
    } else {
      if ((n.links_from.length + n.links_to.length) > n.links_shown.length) {
        n.showing_links = "some";
      } else {
        n.showing_links = "all";
      }
    }
    if (old_status === n.showing_links) {
      return null; // no change, so null
    }
    // We return true to mean that edges where shown, so
    return (old_status === "none") || (n.showing_links === "all");
  }

  should_show_link(edge) {
    // Edges should not be shown if either source or target are discarded or embryonic.
    const ss = edge.source.state;
    const ts = edge.target.state;
    const d = this.discarded_set;
    const e = this.embryonic_set;
    return !((ss === d) || (ts === d) || (ss === e) || (ts === e));
  }

  add_link(e) {
    this.add_to(e, e.source.links_from);
    this.add_to(e, e.target.links_to);
    if (this.should_show_link(e)) {
      this.show_link(e);
    }
    this.update_showing_links(e.source);
    this.update_showing_links(e.target);
    this.update_state(e.target);
  }

  remove_link(edge_id) {
    const e = this.links_set.get_by('id', edge_id);
    if ((e == null)) {
      console.log(`remove_link(${edge_id}) not found!`);
      return;
    }
    this.remove_from(e, e.source.links_shown);
    this.remove_from(e, e.target.links_shown);
    this.links_set.remove(e);
    console.log("removing links from: " + e.id);
    this.update_showing_links(e.source);
    this.update_showing_links(e.target);
    this.update_state(e.target);
    this.update_state(e.source);
  }

  // FIXME it looks like incl_discards is not needed and could be removed
  show_link(edge, incl_discards) {
    if ((!incl_discards) && ((edge.target.state === this.discarded_set) || (edge.source.state === this.discarded_set))) {
      return;
    }
    this.add_to(edge, edge.source.links_shown);
    this.add_to(edge, edge.target.links_shown);
    this.links_set.add(edge);
    edge.show();
    this.update_state(edge.source);
    this.update_state(edge.target);
    //@gclui.add_shown(edge.predicate.lid,edge)
  }

  unshow_link(edge) {
    this.remove_from(edge,edge.source.links_shown);
    this.remove_from(edge,edge.target.links_shown);
    this.links_set.remove(edge);
    //console.log("unshowing links from: " + edge.id)
    edge.unshow(); // FIXME make unshow call @update_state WHICH ONE? :)
    this.update_state(edge.source);
    this.update_state(edge.target);
    //@gclui.remove_shown(edge.predicate.lid,edge)
  }

  show_links_to_node(n, incl_discards) {
    incl_discards = incl_discards || false;
    //if not n.links_to_found
    //  @find_links_to_node n,incl_discards
    n.links_to.forEach((e, i) => {
      return this.show_link(e, incl_discards);
    });
    this.update_showing_links(n);
    this.update_state(n);
    this.update_d3links();
    if (!this.args.skip_log_tick) {
      console.log("Tick in @force.links(@links_set) show_links_to_node");
    }
    this.restart();
  }

  update_state(node) {
    if ((node.state === this.graphed_set) && (node.links_shown.length === 0)) {
      this.shelved_set.acquire(node);
      this.unpin(node);
    }
      //console.debug("update_state() had to @shelved_set.acquire(#{node.name})",node)
    if ((node.state !== this.graphed_set) && (node.links_shown.length > 0)) {
      //console.debug("update_state() had to @graphed_set.acquire(#{node.name})",node)
      this.graphed_set.acquire(node);
    }
    if ([this.discarded_set, this.hidden_set, this.shelved_set].includes(node.state)) {
      this.remove_boxNG(node);
      if (node.focused_node) {
        this.set_focused_node();
      }
    }
  }

  hide_links_to_node(n) {
    n.links_to.forEach((e, i) => {
      this.remove_from(e, n.links_shown);
      this.remove_from(e, e.source.links_shown);
      e.unshow();
      this.links_set.remove(e);
      this.remove_ghosts(e);
      this.update_state(e.source);
      this.update_showing_links(e.source);
      return this.update_showing_links(e.target);
    });
    this.update_state(n);
    this.update_d3links();
    if (!this.args.skip_log_tick) {
      console.log("Tick in @force.links() hide_links_to_node");
    }
    this.restart();
  }

  show_links_from_node(n, incl_discards) {
    incl_discards = incl_discards || false;
    //if not n.links_from_found
    //  @find_links_from_node n
    n.links_from.forEach((e, i) => {
      return this.show_link(e, incl_discards);
    });
    this.update_state(n);
    this.update_d3links();
    if (!this.args.skip_log_tick) {
      console.log("Tick in @force.links() show_links_from_node");
    }
    this.restart();
  }

  hide_links_from_node(n) {
    n.links_from.forEach((e, i) => {
      this.remove_from(e, n.links_shown);
      this.remove_from(e, e.target.links_shown);
      e.unshow();
      this.links_set.remove(e);
      this.remove_ghosts(e);
      this.update_state(e.target);
      this.update_showing_links(e.source);
      return this.update_showing_links(e.target);
    });

    //@force.links(@links_set)
    this.update_d3links();
    if (!this.args.skip_log_tick) {
      console.log("Tick in @force.links hide_links_from_node");
    }
    this.restart();
  }

  update_d3links() {
    if (this.d3links != null) {
      this.d3links.links(this.links_set);
    }
      //@d3simulation.restart()
  }

  attach_predicate_to_its_parent(a_pred) {
    const parent_id = this.ontology.subPropertyOf[a_pred.lid] || 'anything';
    if (parent_id != null) {
      const parent_pred = this.get_or_create_predicate_by_id(parent_id);
      a_pred.register_superclass(parent_pred);
    }
  }

  get_or_create_predicate_by_id(sid) {
    const obj_id = this.make_qname(sid);
    let obj_n = this.predicate_set.get_by('id',obj_id);
    if ((obj_n == null)) {
      obj_n = new Predicate(obj_id);
      this.predicate_set.add(obj_n);
      this.attach_predicate_to_its_parent(obj_n);
    }
    return obj_n;
  }

  clean_up_dirty_predicates() {
    const pred = this.predicate_set.get_by('id', 'anything');
    if (pred != null) {
      pred.clean_up_dirt();
    }
  }

  clean_up_dirty_taxons() {
    if (this.taxonomy.Thing != null) {
      this.taxonomy.Thing.clean_up_dirt();
    }
  }

  clean_up_all_dirt_once() {
    if (this.clean_up_all_dirt_onceRunner == null) { this.clean_up_all_dirt_onceRunner = new OnceRunner(0, 'clean_up_all_dirt_once'); }
    this.clean_up_all_dirt_onceRunner.setTimeout(this.clean_up_all_dirt, 300);
  }

  clean_up_all_dirt() {
    //console.warn("clean_up_all_dirt()")
    this.clean_up_dirty_taxons();
    this.clean_up_dirty_predicates();
    //@regenerate_english()
    //setTimeout(@clean_up_dirty_predictes, 500)
    //setTimeout(@clean_up_dirty_predictes, 3000)
  }

  prove_OnceRunner(timeout) {
    if (this.prove_OnceRunner_inst == null) { this.prove_OnceRunner_inst = new OnceRunner(30); }
    const yahoo = () => alert('yahoo!');
    return this.prove_OnceRunner_inst.setTimeout(yahoo, timeout);
  }

  get_or_create_context_by_id(sid) {
    const obj_id = this.make_qname(sid);
    let obj_n = this.context_set.get_by('id',obj_id);
    if ((obj_n == null)) {
      obj_n = {id:obj_id};
      this.context_set.add(obj_n);
    }
    return obj_n;
  }

  get_or_create_node_by_id(uri, name, isLiteral) {
    // FIXME OMG must standardize on .lid as the short local id, ie internal id
    //node_id = @make_qname(uri) # REVIEW: what about uri: ":" ie the current graph
    let node = this.nodes.get_by('id', uri);
    if ((node == null)) {
      node = this.embryonic_set.get_by('id', uri);
    }
    if ((node == null)) {
      // at this point the node is embryonic, all we know is its uri!
      node = new Node(uri);
      if (this.use_lid_as_node_name && (node.name == null) && (name == null)) {
        name = node.lid;
      }
      if (isLiteral != null) {
        node.isLiteral = isLiteral;
      }
      if ((node.id == null)) {
        alert(`new Node('${uri}') has no id`);
      }
      //@nodes.add(node)
      this.embryonic_set.add(node);
    }
    if (node.type == null) { node.type = "Thing"; }
    if (node.lid == null) { node.lid = uniquer(node.id); }
    if ((node.name == null)) {
      // FIXME dereferencing of @ontology.label should be by curie, not lid
      // if name is empty string, that is acceptable
      // if no name is provided, we use the label from the ontology if available
      if ((name == null)) {
        // Leave defaulting to the use of node.lid to @set_name() itself.
        // If we do that here then nothing is recognized as being nameless.
        name = this.ontology.label[node.lid] || null;
      }
      this.set_name(node, name);
    }
    return node;
  }

  develop(node) {
    // If the node is embryonic and is ready to hatch, then hatch it.
    // In other words if the node is now complete enough to do interesting
    // things with, then let it join the company of other complete nodes.
    if ((node.embryo != null) && this.is_ready(node)) {
      this.hatch(node);
      return true;
    }
    return false;
  }

  hatch(node) {
    // Take a node from being 'embryonic' to being a fully graphable node
    //console.log(node.id+" "+node.name+" is being hatched!")
    node.lid = uniquer(node.id); // FIXME ensure uniqueness
    this.embryonic_set.remove(node);
    const new_set = this.get_default_set_by_type(node);
    if (new_set != null) {
      new_set.acquire(node);
    }
    this.assign_types(node,"hatch");
    const start_point = [this.cx, this.cy];
    node.point(start_point);
    node.prev_point([start_point[0]*1.01,start_point[1]*1.01]);
    this.add_node_ghosts(node);
    this.update_showing_links(node);
    this.nodes.add(node);
    this.recolor_node(node);
    this.tick("Tick in hatch");
    this.pfm_count('hatch');
    return node;
  }

  get_or_create_transient_node(subjNode, point) {
    let isLiteral, name;
    const transient_id = '_:_transient';
    let nom = "↪";
    nom = " ";
    const transient_node = this.get_or_create_node_by_id(transient_id, (name = nom), (isLiteral = false));
    this.move_node_to_point(transient_node, {x: subjNode.x, y: subjNode.y});
    transient_node.radius = 0;
    transient_node.charge = 20;
    return transient_node;
  }

  // REVIEW the need for this method.  Called by showGraph but is it called?
  make_nodes(g, limit) {
    limit = limit || 0;
    let count = 0;
    for (let subj_uri in g.subjects) { //my_graph.subjects
      //console.log(subj, g.subjects[subj])  if @verbosity >= @DEBUG
      //console.log subj_uri
      //continue  unless subj.match(ids_to_show)
      const subj = g.subjects[subj_uri];
      const subject = subj; //g.subjects[subj]
      this.get_or_make_node(subject, [
        this.width / 2,
        this.height / 2
      ], false);
      count++;
      if (limit && (count >= limit)) { break; }
    }
  }

  make_links(g, limit) {
    limit = limit || 0;
    this.nodes.some((node, i) => {
      const subj = node.s;
      this.show_links_from_node(this.nodes[i]);
      if ((limit > 0) && (this.links_set.length >= limit)) { return true; }
    });
    this.restart();
  }

  hide_node_links(node) {
    node.links_shown.forEach((e, i) => {
      this.links_set.remove(e);
      if (e.target === node) {
        this.remove_from(e, e.source.links_shown);
        this.update_state(e.source);
        e.unshow();
        this.update_showing_links(e.source);
      } else {
        this.remove_from(e, e.target.links_shown);
        this.update_state(e.target);
        e.unshow();
        this.update_showing_links(e.target);
      }
      return this.remove_ghosts(e);
    });

    node.links_shown = [];
    this.update_state(node);
    this.update_showing_links(node);
  }

  hide_found_links() { // TODO use it or lose it
    this.nodes.forEach((node, i) => {
      if (node.name.match(search_regex)) {
        return this.hide_node_links(node);
      }
    });
    this.restart();
  }

  discard_found_nodes() { // TODO use it or lose it
    this.nodes.forEach((node, i) => {
      if (node.name.match(search_regex)) {
        return this.discard(node);
      }
    });
    this.restart();
  }

  show_node_links(node) {
    this.show_links_from_node(node);
    this.show_links_to_node(node);
    this.update_showing_links(node);
  }

  toggle_display_tech(ctrl, tech) {
    let val = undefined;
    tech = ctrl.parentNode.id;
    if (tech === "use_canvas") {
      this.use_canvas = !this.use_canvas;
      if (!this.use_canvas) { this.clear_canvas(); }
      val = this.use_canvas;
    }
    if (tech === "use_svg") {
      this.use_svg = !this.use_svg;
      val = this.use_svg;
    }
    if (tech === "use_webgl") {
      this.use_webgl = !this.use_webgl;
      val = this.use_webgl;
    }
    ctrl.checked = val;
    this.tick("Tick in toggle_display_tech");
    return true;
  }

  label(branded) {
    this.labelled_set.add(branded);
  }

  unlabel(anonymized) {
    this.labelled_set.remove(anonymized);
  }

  get_point_from_polar_coords(polar) {
    const {range, degrees} = polar;
    const radians = (2 * Math.PI * (degrees - 90)) / 360;
    return [this.cx + (range * Math.cos(radians) * this.graph_region_radius),
            this.cy + (range * Math.sin(radians) * this.graph_region_radius)];
  }

  pin(node, cmd) {
    if (node.state === this.graphed_set) {
      if ((cmd != null) && cmd.polar_coords) {
        const pin_point = this.get_point_from_polar_coords(cmd.polar_coords);
        node.prev_point(pin_point);
      }
      this.pinned_set.add(node);
      return true;
    }
    return false;
  }

  unpin(node) {
    // delete node.pinned_only_while_chosen # do it here in case of direct unpinning
    if (node.fixed) {
      this.pinned_set.remove(node);
      return true;
    }
    return false;
  }

  pin_at_center(node) {
    const cmd = {
      polar_coords: {
        range: 0,
        degrees: 0
      }
    };
    return this.pin(node, cmd);
  }

  unlink(unlinkee) {
    // FIXME discover whether unlink is still needed
    this.hide_links_from_node(unlinkee);
    this.hide_links_to_node(unlinkee);
    this.shelved_set.acquire(unlinkee);
    this.update_showing_links(unlinkee);
    this.update_state(unlinkee);
  }

  //
  //  The DISCARDED are those nodes which the user has
  //  explicitly asked to not have drawn into the graph.
  //  The user expresses this by dropping them in the
  //  discard_dropzone.
  //
  discard(goner) {
    this.unpin(goner);
    this.unlink(goner);
    this.discarded_set.acquire(goner);
    const shown = this.update_showing_links(goner);
    this.unselect(goner);
    //console.warn("newly calling update_state(goner) within discard(#{goner.ld})")
    //@update_state(goner)
    return goner;
  }

  undiscard(prodigal) {  // TODO(smurp) rename command to 'retrieve' ????
    // see test 'retrieving should only affect nodes which are discarded'
    if (this.discarded_set.has(prodigal)) {
      this.shelved_set.acquire(prodigal);
      this.update_showing_links(prodigal);
      this.update_state(prodigal);
    }
    return prodigal;
  }

  //
  //  The CHOSEN are those nodes which the user has
  //  explicitly asked to have the links shown for.
  //  This is different from those nodes which find themselves
  //  linked into the graph because another node has been chosen.
  //
  shelve(goner) {
    this.unpin(goner);
    this.chosen_set.remove(goner);
    this.hide_node_links(goner);
    this.shelved_set.acquire(goner);
    const shownness = this.update_showing_links(goner);
    console.warn(`calling update_state(goner) within shelve(${goner.lid})`);
    this.update_state(goner);
    if (goner.links_shown.length > 0) {
      console.log("shelving failed for", goner);
    }
    return goner;
  }

  suppress(suppressee) {
    console.log("suppress(",suppressee,")");
    this.unpin(suppressee);
    this.chosen_set.remove(suppressee);
    this.hide_node_links(suppressee);
    this.shelved_set.remove(suppressee);
    this.update_showing_links(suppressee);
    this.suppressed_set.acquire(suppressee);
    return suppressee;
  }

  choose(chosen, callback_after_choosing) {
    // If this chosen node is part of a SPARQL query set and not fully loaded then
    // fully load it and try this method again, via callback.
    if (this.using_sparql() &&
         !chosen.fully_loaded &&
         !this.outstanding_sparql_requests_are_capped()) {
      const callback_after_getting_neighbors = () => this.choose(chosen, callback_after_choosing);
      this.get_neighbors_via_sparql(chosen, callback_after_getting_neighbors);
      return;
    }

    // There is a flag .chosen in addition to the state 'linked'
    // because linked means it is in the graph
    this.chosen_set.add(chosen);     // adding the flag .chosen does not affect the .state
    this.nowChosen_set.add(chosen);  // adding the flag .nowChosen does not affect the .state
    // do it early so add_link shows them otherwise choosing from discards just puts them on the shelf
    this.graphed_set.acquire(chosen); // .acquire means DO change the .state to graphed vs shelved etc

    this.show_links_from_node(chosen);
    this.show_links_to_node(chosen);
    this.update_state(chosen);
    const shownness = this.update_showing_links(chosen);
    if (callback_after_choosing != null) {
      callback_after_choosing();
    }
    return chosen;
  }

  unchoose(unchosen) {
    // To unchoose a node is to remove the chosen flag and unshow the edges
    // to any nodes which are not themselves chosen.  If that means that
    // this 'unchosen' node is now no longer graphed, so be it.
    //
    //   remove the node from the chosen set
    //     loop thru all links_shown
    //       if neither end of the link is chosen then
    //         unshow the link
    // @unpin unchosen # TODO figure out why this does not cleanse pin
    this.chosen_set.remove(unchosen);
    for (let i = unchosen.links_shown.length - 1; i >= 0; i--) {
      const link = unchosen.links_shown[i];
      if (link != null) {
        if (!((link.target.chosen != null) || (link.source.chosen != null))) {
          this.unshow_link(link);
        }
      } else {
        console.log("there is a null in the .links_shown of", unchosen);
      }
    }
    this.update_state(unchosen);
  }

  wander__atFirst() {
    // Purpose:
    //   At first, before the verb Wander is executed on any node, we must
    // build a SortedSet of the nodes which were wasChosen to compare
    // with the SortedSet of nodes which are intendedToBeGraphed as a
    // result of the Wander command which is being executed. This method
    // is called once, BEFORE iterating through the nodes being wander-ed.
    if (!this.wasChosen_set.clear()) {
      throw new Error("expecting wasChosen to be empty");
    }
    for (let node of this.chosen_set) {
      this.wasChosen_set.add(node);
    }
  }

  wander__atLast() {
    // Purpose:
    //   At last, after all appropriate nodes have been pulled into the graph
    // by the Wander verb, it is time to remove wasChosen nodes which
    // are not nowChosen.  In other words, ungraph those nodes which
    // are no longer held in the graph by any recently wandered-to nodes.
    // This method is called once, AFTER wander has been called on each node.
    const wasRollCall = this.wasChosen_set.roll_call();
    const nowRollCall = this.nowChosen_set.roll_call();
    const removed = this.wasChosen_set.filter((node) => {
      return !this.nowChosen_set.includes(node);
    });
    for (let node of removed) {
      this.unchoose(node);
      this.wasChosen_set.remove(node);
    }
    if (!this.nowChosen_set.clear()) {
      throw new Error("the nowChosen_set should be empty after clear()");
    }
  }

  wander(chosen) {
    // Wander is just the same as Choose (AKA Activate) except afterward it deactivates the
    // nodes which were in the chosen_set before but are not in the set being wandered.
    // This is accomplished by wander__build_callback()
    // See @wander__atFirst and @wander__atLast which are run before and after this one.
    return this.choose(chosen);
  }

  unwalk(node) {
    this.walked_set.remove(node);
    delete node.walkedIdx0;
  }

  walkBackTo(existingStep) {
    // note that if existingStep is null (ie a non-node) we will walk back all
    const removed = [];
    for (let i = this.walked_set.length - 1; i >= 0; i--) {
      const pathNode = this.walked_set[i];
      if (pathNode === existingStep) {
        break;
      }
      // remove these intervening nodes
      this.unchoose(pathNode);
      this.shave(pathNode);
      this.unwalk(pathNode);
      removed.push(pathNode);
    }
    return removed;
  }

  walkBackAll() {
    return this.walkBackTo(null);
  }

  walk(nextStep) {
    let tooHairy = null;
    if (nextStep.walked) {
      // 1) if this node already in @walked_set then remove inwtervening nodes
      // ie it is already in the path so walk back to it
      this.walkBackTo(nextStep); // stop displaying those old links
      this.choose(nextStep);
      return;
    }

    if (this.walked_set.length) { // is there already a walk path in progress?
      const lastWalked = this.walked_set.slice(-1)[0]; // find the last node
      if (this.nodesAreAdjacent(nextStep, lastWalked)) { // is nextStep linked to lastWalked?
        // 2) handle the case of this being the next in a long chain of adjacent nodes
        tooHairy = lastWalked;  // Shave this guy later. If we do it now, nextStep gets ungraphed!
      } else {
        // 3) start a new path because nextStep is not connected with the @walked_set
        this.walkBackAll(); // clean up the old path completely
      }
    }

    const do_after_chosen = () => {
      if (tooHairy) { // as promised we now deal with the previous terminal node
        return this.shave(tooHairy); // ungraph the non-path nodes which were held in the graph by tooHairy
      }
    };

    // this should happen to every node added to @walked_set
    nextStep.walkedIdx0 = this.walked_set.length; // tell it what position it will have in the path
    if (!nextStep.walked) { // It might already be in the path, if not...
      this.walked_set.add(nextStep); // add it
    }
    this.choose(nextStep, do_after_chosen); // finally, choose nextStep to make it hairy

     // so the javascript is not cluttered with confusing nonsense
  }

  nodesAreAdjacent(n1, n2) {
    // figure out which node is least connected so we do the least work checking links
    let busyNode, link, lonelyNode;
    if ((n1.links_from.length + n1.links_to.length) > (n2.links_from.length + n2.links_to.length)) {
      [lonelyNode, busyNode] = Array.from([n2, n1]);
    } else {
      [lonelyNode, busyNode] = Array.from([n1, n2]);
    }
    // iterate through the outgoing links of the lonlier node, breaking on adjacency
    for (link of lonelyNode.links_from) {
      if (link.target === busyNode) {
        return true;
      }
    }
    // iterate through the incoming links of the lonlier node, breaking on adjacency
    for (link of lonelyNode.links_to) {
      if (link.source === busyNode) {
        return true;
      }
    }
    return false;
  }

  shave(tooHairy) {
    for (let i = tooHairy.links_shown.length - 1; i >= 0; i--) {
      const link = tooHairy.links_shown[i];
      if (link != null) {
        if (((link.target.walked == null)) || ((link.source.walked == null))) {
          this.unshow_link(link);
        }
        if (!this.edgeIsOnWalkedPath(link)) {
          this.unshow_link(link);
        }
      } else {
        console.log("there is a null in the .links_shown of", unchosen);
      }
    }
    this.update_state(tooHairy); // update the pickers concerning these changes REVIEW needed?
  }

  edgeIsOnWalkedPath(edge) {
    return this.nodesAreAdjacentOnWalkedPath(edge.target, edge.source);
  }

  nodesAreAdjacentOnWalkedPath(n1, n2) {
    const n1idx0 = n1.walkedIdx0;
    const n2idx0 = n2.walkedIdx0;
    if ((n1idx0 != null) && (n2idx0 != null)) {
      const larger = Math.max(n1idx0, n2idx0);
      const smaller = Math.min(n1idx0, n2idx0);
      if ((larger - smaller) === 1) {
        return true;
      }
    }
    return false;
  }

  distinguish(node) {
    const emeritus = this.distinguished_node;
    if (this.emeritus != null) {
      delete emeritus._is_distinguished;
    }
    if (node != null) {
      node._is_distinguished = true;
    }
    this.distinguished_node = node;
    return emeritus;
  }

  hide(goner) {
    this.unpin(goner);
    this.chosen_set.remove(goner);
    this.hidden_set.acquire(goner);
    this.selected_set.remove(goner);
    goner.unselect();
    this.hide_node_links(goner);
    this.update_state(goner);
    const shownness = this.update_showing_links(goner);
  }

  // The verbs SELECT and UNSELECT perhaps don't need to be exposed on the UI
  // but they perform the function of manipulating the @selected_set
  select(node) {
    if ((node.selected == null)) {
      this.selected_set.add(node);
      if (node.select != null) {
        node.select();
        this.recolor_node(node);
      } else {
        const msg = `${node.__proto__.constructor.name} ${node.id} lacks .select()`;
        throw msg;
        console.error(msg,node);
      }
    }
  }

  unselect(node) {
    if (node.selected != null) {
      this.selected_set.remove(node);
      node.unselect();
      this.recolor_node(node);
    }
  }

  // These are the EDITING VERBS: connect, spawn, specialize and annotate
  connect(node) {
    if (node !== this.focused_node) {
      console.info(`connect('${node.lid}') SKIPPING because it is not the focused node`);
      return;
    }
    this.editui.set_state('seeking_object');
    this.editui.set_subject_node(node);
    this.transient_node = this.get_or_create_transient_node(node);
    this.editui.set_object_node(this.transient_node);
    this.dragging = this.transient_node;
    console.log(this.transient_node.state.id);
    //alert("connect('#{node.lid}')")
  }

  set_unique_color(uniqcolor, set, node) {
    if (set.uniqcolor == null) { set.uniqcolor = {}; }
    const old_node = set.uniqcolor[uniqcolor];
    if (old_node) {
      old_node.color = old_node.uniqucolor_orig;
      delete old_node.uniqcolor_orig;
    }
    set.uniqcolor[uniqcolor] = node;
    node.uniqcolor_orig = node.color;
    node.color = uniqcolor;
  }

  animate_hunt(array, sought_node, mid_node, prior_node, pos) {
    //sought_node.color = 'red'
    const pred_uri = 'hunt:trail';
    if (mid_node) {
      mid_node.color = 'black';
      mid_node.radius = 100;
      this.label(mid_node);
    }
    if (prior_node) {
      this.ensure_predicate_lineage(pred_uri);
      const trail_pred = this.get_or_create_predicate_by_id(pred_uri);
      const edge = this.get_or_create_Edge(mid_node, prior_node, trail_pred, 'http://universal.org');
      edge.label = JSON.stringify(pos);
      this.infer_edge_end_types(edge);
      edge.color = this.gclui.predicate_picker.get_color_forId_byName(trail_pred.lid, 'showing');
      this.add_edge(edge);
    }
      //@show_link(edge)
    if (pos.done) {
      const cmdArgs = {
        verbs: ['show'],
        regarding: [pred_uri],
        sets: [this.shelved_set.id]
      };
      const cmd = new GraphCommand(this, cmdArgs);
      this.run_command(cmd);
      this.clean_up_all_dirt_once();
    }
  }

  hunt(node) {
    // Hunt is just a test verb to animate SortedSet.binary_search() for debugging
    this.animate_hunt(this.shelved_set, node, null, null, {});
    this.shelved_set.binary_search(node, false, this.animate_hunt);
  }

  recolor_node(n, default_color) {
    let color;
    if (default_color == null) { default_color = 'black'; }
    if (n._types == null) { n._types = []; }
    if (this.color_nodes_as_pies && (n._types.length > 1)) {
      n._colors = [];
      for (let taxon_id of n._types) {
        if (typeof(taxon_id) === 'string') {
          color = this.get_color_for_node_type(n, taxon_id) || default_color;
          n._colors.push(color);
        }
      }
       //n._colors = ['red','orange','yellow','green','blue','purple']
    } else {
      n.color = this.get_color_for_node_type(n, n.type);
    }
  }

  get_color_for_node_type(node, type) {
    const state = ((node.selected != null) && "emphasizing") || "showing";
    return this.gclui.taxon_picker.get_color_forId_byName(type, state);
  }

  recolor_nodes() {
    // The nodes needing recoloring are all but the embryonic.
    if (this.nodes) {
      for (let node of this.nodes) {
        this.recolor_node(node);
      }
    }
  }

  toggle_selected(node) {
    if (node.selected != null) {
      this.unselect(node);
    } else {
      this.select(node);
    }
    this.update_all_counts();
    this.regenerate_english();
    this.tick("Tick in toggle_selected");
  }

  // ======== SNIPPET (INFO BOX) UI ==========================================
  get_snippet_url(snippet_id) {
    if (snippet_id.match(/http\:/)) {
      return snippet_id;
    } else {
      return `${window.location.origin}${this.get_snippetServer_path(snippet_id)}`;
    }
  }

  get_snippetServer_path(snippet_id) {
    // this relates to index.coffee and the urls for the
    let which;
    if (this.data_uri != null ? this.data_uri.match('poetesses') : undefined) {
      console.info(this.data_uri,this.data_uri.match('poetesses'));
      which = "poetesses";
    } else {
      which = "orlando";
    }
    return `/snippet/${which}/${snippet_id}/`;
  }

  make_edge_inspector_id(edge) {
    const id = edge.id.replace(new RegExp(' ','g'), '_');
    //console.log("make_edge_inspector_id()", edge, '==>', id)
    return id;
  }

  get_snippet_js_key(snippet_id) {
    // This is in case snippet_ids can not be trusted as javascript
    // property ids because they might have leading '-' or something.
    return "K_" + snippet_id;
  }

  get_snippet(snippet_id, callback) {
    console.warn(`get_snippet('${snippet_id}') should no longer be called`);
    const snippet_js_key = this.get_snippet_js_key(snippet_id);
    const snippet_text = this.snippet_db[snippet_js_key];
    const url = this.get_snippet_url(snippet_id);
    if (snippet_text) {
      callback(null, {response:snippet_text, already_has_snippet_id:true});
    } else {
      d3.xhr(url, callback);
    }
    return "got it";
  }

  clear_snippets(evt) {
    if ((evt != null) && (evt.target != null) && !$(evt.target).hasClass('close_all_snippets_button')) {
      return false;
    }
    this.currently_printed_snippets = {};
    this.snippet_positions_filled = {};
    $('.snippet_dialog_box').remove();
  }

  init_snippet_box() { // REVIEW is this needed any more?
    if (d3.select('#snippet_box')[0].length > 0) {
      this.snippet_box = d3.select('#snippet_box');
    }
  }

  remove_snippet(snippet_id) {
    const key = this.get_snippet_js_key(snippet_id);
    delete this.currently_printed_snippets[key];
    if (this.snippet_box) {
      const slctr = '#'+id_escape(snippet_id);
      console.log(slctr);
      this.snippet_box.select(slctr).remove();
    }
  }

  push_snippet(obj, msg) {
    console.log("push_snippet");
    if (this.snippet_box) {
      const snip_div = this.snippet_box.append('div').attr('class','snippet');
      snip_div.html(msg);
      $(snip_div.node()).addClass("snippet_dialog_box");
      const my_position = this.get_next_snippet_position(obj.snippet_js_key);
      const dialog_args = {
        //maxHeight: @snippet_size
        minWidth: 400,
        title: obj.dialog_title,
        position: {
          my: my_position,
          at: "left top",
          of: window
        },
        close: (event, ui) => {
          event.stopPropagation();
          delete this.snippet_positions_filled[my_position];
          delete this.currently_printed_snippets[event.target.id];
        }
      };
      const dlg = $(snip_div).dialog(dialog_args);
      const elem = dlg.node();
      elem.setAttribute("id",obj.snippet_js_key);
      const bomb_parent = $(elem).parent().
        select(".ui-dialog-titlebar").children().first();
      const close_all_button = bomb_parent.
        append('<button type="button" class="ui-button ui-corner-all ui-widget close-all" role="button" title="Close All""><img class="close_all_snippets_button" src="close_all.png" title="Close All"></button>');
        //append('<span class="close_all_snippets_button" title="Close All"></span>')
        //append('<img class="close_all_snippets_button" src="close_all.png" title="Close All">')
      close_all_button.on('click', this.clear_snippets);
    }
  }
  snippet_position_str_to_obj(str) {
    // convert "left+123 top+456" to {left: 123, top: 456}
    const [left, top] = Array.from(str.replace(new RegExp('([a-z]*)\\+','g'),'').split(' ').map((c) => parseInt(c)));
    return {left, top};
  }

  get_next_snippet_position_obj(id) {
    return this.snippet_position_str_to_obj(this.get_next_snippet_position(id));
  }

  get_next_snippet_position(id) {
    // Fill the left edge, then the top edge, then diagonally from top-left
    if (id == null) { id = true; }
    const {
      height
    } = this;
    const {
      width
    } = this;
    let left_full = false;
    let top_full = false;
    let hinc = 0;
    let vinc = this.snippet_size;
    let hoff = 0;
    let voff = 0;
    let retval = `left+${hoff} top+${voff}`;
    while (this.snippet_positions_filled[retval] != null) {
      hoff = hinc + hoff;
      voff = vinc + voff;
      retval = `left+${hoff} top+${voff}`;
      if (!left_full && ((voff + vinc + vinc) > height)) {
        left_full = true;
        hinc = this.snippet_size;
        hoff = 0;
        voff = 0;
        vinc = 0;
      }
      if (!top_full && ((hoff + hinc + hinc + hinc) > width)) {
        top_full = true;
        hinc = 30;
        vinc = 30;
        hoff = 0;
        voff = 0;
      }
    }
    this.snippet_positions_filled[retval] = id;
    return retval;
  }

  // =========================================================================

  remove_tags(xml) {
    return xml.replace(XML_TAG_REGEX, " ").replace(MANY_SPACES_REGEX, " ");
  }

  // peek selects a node so that subsequent mouse motions select not nodes but edges of this node
  peek(node) {
    let was_already_peeking = false;
    if (this.peeking_node != null) {
      if (this.peeking_node === node) {
        was_already_peeking = true;
      }
      this.recolor_node(this.peeking_node);
      this.unflag_all_edges(this.peeking_node);
    }
    if (!was_already_peeking) {
      this.peeking_node = node;
      this.peeking_node.color = PEEKING_COLOR;
    }
  }

  unflag_all_edges(node) {
    for (let edge of node.links_shown) {
      edge.focused = false;
    }
  }

  hilight_dialog(dialog_elem) {
    if (typeof(dialog_elem) === 'string') {
      throw new Error('hilight_dialog() expects an Elem, not '+dialog_elem);
    } else {
      const dialog_id = dialog_elem.getAttribute('id');
    }
    $(dialog_elem).parent().append(dialog_elem); // bring to top
    $(dialog_elem).effect('shake');
  }

  print_edge(edge) {
    // @clear_snippets()
    let context_no = 0;
    for (let context of edge.contexts) {
      var edge_inspector_id = this.make_edge_inspector_id(edge, context);
      //snippet_js_key = @get_snippet_js_key(context.id)
      context_no++;
      if (this.currently_printed_snippets[edge_inspector_id] != null) {
        this.hilight_dialog(edge._inspector || edge_inspector_id);
        continue;
      }
      console.log("inspect edge:", edge);
      var me = this;
      const make_callback = (context_no, edge, context) => {
        return (err,data) => {
          data = data || {response: ""};
          let snippet_text = data.response;
          if (!data.already_has_snippet_id) {
            snippet_text = me.remove_tags(snippet_text);
            snippet_text += '<br><code class="snippet_id">'+context.id+"</code>";
          }
          const snippet_id = context.id;
          const snippet_js_key = me.get_snippet_js_key(snippet_id);
          if ((me.currently_printed_snippets[edge_inspector_id] == null)) {
            me.currently_printed_snippets[edge_inspector_id] = [];
          }
          me.currently_printed_snippets[edge_inspector_id].push(edge);
          me.snippet_db[edge_inspector_id] = snippet_text;
          me.printed_edge = edge;
          const quad = {
            subj_uri: edge.source.id,
            pred_uri: edge.predicate.id,
            graph_uri: edge.graph.id
          };
          if (edge.target.isLiteral) {
            quad.obj_val = edge.target.name.toString();
          } else {
            quad.obj_uri = edge.target.id;
          }
          return me.push_snippet({
            edge_inspector_id,
            edge,
            pred_id: edge.predicate.lid,
            pred_name: edge.predicate.name,
            context_id: context.id,
            quad,
            dialog_title: edge.source.name,
            snippet_text,
            no: context_no,
            snippet_js_key
          });
        };
      };
      const cb = make_callback(context_no, edge, context);
      cb();
    } // To get the old snippet fetcher working again, do the following instead:
      //@get_snippet(context.id, cb)
  }

  // The Verbs PRINT and REDACT show and hide snippets respectively
  print(node) {
    this.clear_snippets();
    for (let edge of node.links_shown) {
      this.print_edge(edge);
    }
  }

  redact(node) {
    node.links_shown.forEach((edge,i) => {
      return this.remove_snippet(edge.id);
    });
  }

  draw_edge_regarding(node, predicate_lid) {
    let dirty = false;
    const doit = (edge,i,frOrTo) => {
      if (edge.predicate.lid === predicate_lid) {
        if ((edge.shown == null)) {
          this.show_link(edge);
          return dirty = true;
        }
      }
    };
    node.links_from.forEach((edge,i) => {
      return doit(edge,i,'from');
    });
    node.links_to.forEach((edge,i) => {
      return doit(edge,i,'to');
    });
    if (dirty) {
      this.update_state(node);
      this.update_showing_links(node);
      this.d3simulation.alphaTarget(0.1);
      if (!this.args.skip_log_tick) {
        console.log("Tick in  @draw_edge_regarding");
      }
    }
  }

  undraw_edge_regarding(node, predicate_lid) {
    let dirty = false;
    const doit = (edge,i,frOrTo) => {
      if (edge.predicate.lid === predicate_lid) {
        dirty = true;
        return this.unshow_link(edge);
      }
    };
    node.links_from.forEach((edge,i) => {
      return doit(edge,i,'from');
    });
    node.links_to.forEach((edge,i) => {
      return doit(edge,i,'to');
    });
    // FIXME(shawn) Looping through links_shown should suffice, try it again
    //node.links_shown.forEach (edge,i) =>
    //  doit(edge,'shown')
    if (dirty) {
      this.update_state(node);
      this.update_showing_links(node);
      this.d3simulation.alphaTarget(0.1);
    }
  }

  update_history() {
    if (window.history.pushState) {
      const the_state = {};
      hash = "";
      if (chosen_set.length) {
        the_state.chosen_node_ids = [];
        hash += "#";
        hash += "chosen=";
        const n_chosen = chosen_set.length;
        this.chosen_set.forEach((chosen, i) => {
          hash += chosen.id;
          the_state.chosen_node_ids.push(chosen.id);
          if (n_chosen > (i + 1)) { return hash += ","; }
        });
      }

      const the_url = location.href.replace(location.hash, "") + hash;
      const the_title = document.title;
      window.history.pushState(the_state, the_title, the_state);
    }
  }

  // TODO: remove this method
  restore_graph_state(state) {
    //console.log('state:',state);
    if (!state) { return; }
    if (state.chosen_node_ids) {
      this.reset_graph();
      state.chosen_node_ids.forEach((chosen_id) => {
        const chosen = get_or_make_node(chosen_id);
        if (chosen) { return this.choose(chosen); }
      });
    }
  }

  fire_showgraph_event() {
    window.dispatchEvent(
      new CustomEvent('showgraph', {
        detail: {
          message: "graph shown",
          time: new Date()
        },
        bubbles: true,
        cancelable: true
      })
    );
  }

  showGraph(g) {
    alert("showGraph called");
    this.make_nodes(g);
    if (window.CustomEvent != null) { this.fire_showgraph_event(); }
    this.restart();
  }

  register_gclc_prefixes() {
    this.gclc.prefixes = {};
    for (let abbr in this.G.prefixes) {
      const prefix = this.G.prefixes[abbr];
      this.gclc.prefixes[abbr] = prefix;
    }
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
  init_datasetDB() {
    const {
      indexedDB
    } = window; // || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || null
    if (!indexedDB) {
      console.log("indexedDB not available");
    }
    if (!this.datasetDB && indexedDB) {
      this.dbName = 'datasetDB';
      this.dbVersion = 2;
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onsuccess = (evt) => {
        this.datasetDB = request.result;
        this.datasetDB.onerror = err => {
          return alert(`Database error: ${e.target.errorCode}`);
        };
        //alert "onsuccess"
        return this.populate_menus_from_IndexedDB('onsuccess');
      };
      request.onerror = (err) => {
        return alert(`unable to init ${this.dbName}`);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const objectStore = db.createObjectStore("datasets", {keyPath: 'uri'});
        objectStore.transaction.oncomplete = (evt) => {
          this.datasetDB = db;
          // alert "onupgradeneeded"
          this.populate_menus_from_IndexedDB('onupgradeneeded');
        };
      };
    }
  }

  ensure_datasets(preload_group, store_in_db) {
    // note "fat arrow" so this can be an AJAX callback (see preload_datasets)
    const defaults = preload_group.defaults || {};
    //console.log(preload_group) # THIS IS THE ITEMS IN A FILE (i.e. cwrc.json, generes.json)
    for (let ds_rec of preload_group.datasets) {
      // If this preload_group has defaults apply them to the ds_rec
      // if it is missing that value.
      // We do not want to do `ds_rec.__proto__ = defaults`
      //  because then defaults are not ownProperty
      for (let k in defaults) {
        if (ds_rec[k] == null) { ds_rec[k] = defaults[k]; }
      }
      this.ensure_dataset(ds_rec, store_in_db);
    }
  }

  ensure_dataset(rsrcRec, store_in_db) {
    // ensure the dataset is in the database and the correct
    const {
      uri
    } = rsrcRec;
    if (rsrcRec.time == null) { rsrcRec.time = new Date().toString(); }
    if (rsrcRec.title == null) { rsrcRec.title = uri; }
    if (rsrcRec.isUri == null) { rsrcRec.isUri = !!uri.match(/^(http|ftp)/); }
    // if it has a time then a user added it therefore canDelete
    if (rsrcRec.canDelete == null) { rsrcRec.canDelete = !(rsrcRec.time == null); }
    if (rsrcRec.label == null) { rsrcRec.label = uri.split('/').reverse()[0]; }
    if (rsrcRec.isOntology) {
      if (this.ontology_loader) {
        this.ontology_loader.add_resource(rsrcRec, store_in_db);
      }
    }
    if (this.dataset_loader && !rsrcRec.isEndpoint) {
      this.dataset_loader.add_resource(rsrcRec, store_in_db);
    }
    if (rsrcRec.isEndpoint && this.endpoint_loader) {
      this.endpoint_loader.add_resource(rsrcRec, store_in_db);
    }
  }

  add_resource_to_db(rsrcRec, callback) {
    const trx = this.datasetDB.transaction('datasets', "readwrite");
    trx.oncomplete = (e) => {
      return console.log(`${rsrcRec.uri} added!`);
    };
    trx.onerror = (e) => {
      console.log(e);
      return alert(`add_resource(${rsrcRec.uri}) error!!!`);
    };
    const store = trx.objectStore('datasets');
    const req = store.put(rsrcRec);
    req.onsuccess = (e) => {
      if (rsrcRec.isEndpoint) {
        this.sparql_graph_query_and_show__trigger(e.srcElement.result);
      }
      if (rsrcRec.uri !== e.target.result) {
        console.debug(`rsrcRec.uri (${rsrcRec.uri}) is expected to equal`, e.target.result);
      }
      callback(rsrcRec);
    };
  }

  remove_dataset_from_db(dataset_uri, callback) {
    const trx = this.datasetDB.transaction('datasets', "readwrite");
    trx.oncomplete = (e) => {
      return console.log(`${dataset_uri} deleted`);
    };
    trx.onerror = (e) => {
      console.log(e);
      return alert(`remove_dataset_from_db(${dataset_uri}) error!!!`);
    };
    const store = trx.objectStore('datasets');
    const req = store.delete(dataset_uri);
    req.onsuccess = (e) => {
      if (callback != null) {
        callback(dataset_uri);
      }
    };
    req.onerror = (e) => {
      console.debug(e);
    };
  }

  get_resource_from_db(rsrcUri, callback) {
    const trx = this.datasetDB.transaction('datasets', "readwrite");
    trx.oncomplete = (evt) => {
      return console.log(`get_resource_from_db('${rsrcUri}') complete, either by success or error`);
    };
    trx.onerror = (err) => {
      console.log(err);
      if (callback != null) {
        callback(err, null);
      } else {
        alert(`get_resource_from_db(${rsrcUri}) error!!!`);
        throw err;
      }
    };
    const store = trx.objectStore('datasets');
    const req = store.get(rsrcUri);
    req.onsuccess = (event) => {
      if (callback != null) {
        callback(null, event.target.result);
      }
    };
    req.onerror = (err) => {
      console.debug(`get_resource_from_db('${rsrcUri}') onerror ==>`,err);
      if (callback) {
        callback(err, null);
      } else {
        throw err;
      }
    };
  }

  populate_menus_from_IndexedDB(why) {
    // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#Using_a_cursor
    console.debug(`populate_menus_from_IndexedDB(${why})`);
    const datasetDB_objectStore = this.datasetDB.transaction('datasets').objectStore('datasets');
    let count = 0;
    const make_onsuccess_handler = (why) => {
      const recs = [];
      return event => {
        const cursor = event.target.result;
        if (cursor) {
          count++;
          const rec = cursor.value;
          recs.push(rec);
          const legacyDataset = (!rec.isOntology && !rec.rsrcType);
          const legacyOntology = (!!rec.isOntology);
          if (['dataset', 'ontology'].includes(rec.rsrcType) || legacyDataset || legacyOntology) {
            // both datasets and ontologies appear in the dataset menu, for visualization
            this.dataset_loader.add_resource_option(rec);
          }
          if ((rec.rsrcType === 'ontology') || legacyOntology) {
            // only datasets are added to the dataset menu
            this.ontology_loader.add_resource_option(rec);
          }
          if (rec.rsrcType === 'script') {
            this.script_loader.add_resource_option(rec);
          }
          if (rec.rsrcType === 'endpoint') {
            this.endpoint_loader.add_resource_option(rec);
          }
          return cursor.continue();
        } else { // when there are no (or NO MORE) entries, ie FINALLY
          //console.table(recs)
          // Reset the value of each loader to blank so
          // they show 'Pick or Provide...' not the last added entry.
          this.dataset_loader.val();
          this.ontology_loader.val();
          this.endpoint_loader.val();
          this.script_loader.val();
          this.update_dataset_ontology_loader();
          console.groupEnd(); // closing group called "populate_menus_from_IndexedDB(why)"
          return document.dispatchEvent( // TODO use 'huvis_controls' rather than document
            new Event('dataset_ontology_loader_ready'));
        }
      };
    };
          //alert "#{count} entries saved #{why}"
    if (this.dataset_loader != null) {
      datasetDB_objectStore.openCursor().onsuccess = make_onsuccess_handler(why);
    }
  }

  preload_datasets() {
    // If present args.preload is expected to be a list or urls or objects.
    // Whether literal object or JSON urls the object structure is expected to be:
    //   { 'datasets': [
    //        {
    //         'uri': "/data/byroau.nq",     // url of dataset .ttl or .nq
    //         'label': "Augusta Ada Brown", // label of OPTION in SELECT
    //         'isOntology': false,          // optional, if true it goes in Onto menu
    //         'opt_group': "Individuals",   // user-defined label for menu subsection
    //         'canDelete':   false,         // meaningful only for recs in datasetsDB
    //         'ontologyUri': '/data/orlando.ttl' // url of ontology
    //         }
    //                  ],
    //     'defaults': {}  # optional, may contain default values for the keys above
    //    }
    console.groupCollapsed("preload_datasets");
    // Adds preload options to datasetDB table
    console.log(this.args.preload);
    if (this.args.preload) {
      for (var preload_group_or_uri of this.args.preload) {
        if (typeof(preload_group_or_uri) === 'string') { // the URL of a preload_group JSON
          //$.getJSON(preload_group_or_uri, null, @ensure_datasets_from_XHR)
          $.ajax({
            async: false,
            url: preload_group_or_uri,
            success: (data, textStatus) => {
              return this.ensure_datasets_from_XHR(data);
            },
            error(jqxhr, textStatus, errorThrown) {
              return console.error(preload_group_or_uri + " " +textStatus+" "+errorThrown.toString());
            }
          });
        } else if (typeof(preload_group_or_uri) === 'object') { // a preload_group object
          this.ensure_datasets(preload_group_or_uri);
        } else {
          console.error("bad member of @args.preload:", preload_group_or_uri);
        }
      }
    }
    console.groupEnd(); // closing group called "preload_datasets"
  }

  preload_endpoints() {
    console.log(this.args.preload_endpoints);
    console.groupCollapsed("preload_endpoints");
    //###
    if (this.args.preload_endpoints) {
      for (var preload_group_or_uri of this.args.preload_endpoints) {
        console.log(preload_group_or_uri);
        if (typeof(preload_group_or_uri) === 'string') { // the URL of a preload_group JSON
          //$.getJSON(preload_group_or_uri, null, @ensure_datasets_from_XHR)
          $.ajax({
            async: false,
            url: preload_group_or_uri,
            success: (data, textStatus) => {
              return this.ensure_datasets_from_XHR(data);
            },
            error(jqxhr, textStatus, errorThrown) {
              return console.error(preload_group_or_uri + " " +textStatus+" "+errorThrown.toString());
            }
          });
        } else if (typeof(preload_group_or_uri) === 'object') { // a preload_group object
          this.ensure_datasets(preload_group_or_uri);
        } else {
          console.error("bad member of @args.preload:", preload_group_or_uri);
        }
      }
    }
    console.groupEnd();
    //###
  }

  ensure_datasets_from_XHR(preload_group) {
    this.ensure_datasets(preload_group, false); // false means DO NOT store_in_db
  }

  get_menu_by_rsrcType(rsrcType) {
    return this[rsrcType+'_loader']; // eg rsrcType='script' ==> @script_loader
  }

  get_or_create_sel_for_picker(specificSel) {
    // if specificSel is defined, return it, otherwise return the selector of a thin
    let sel = specificSel;
    if ((sel == null)) {
      if ((this.pickersSel == null)) {
        let huvis_controls_sel;
        const pickersId = this.unique_id('pickers_');
        this.pickersSel = '#' + pickersId;
        if (huvis_controls_sel = this.oldToUniqueTabSel['huvis_controls']) {
          if (this.huvis_controls_elem == null) { this.huvis_controls_elem = document.querySelector(huvis_controls_sel); }
          if (this.huvis_controls_elem) {
            this.huvis_controls_elem.insertAdjacentHTML('beforeend', `<div id="${pickersId}"></div>`);
          }
        }
      }
      sel = this.pickersSel;
    }
    return sel;
  }

  init_resource_menus() {
    // REVIEW See views/huviz.html.eco to set dataset_loader__append_to_sel and similar
    let sel;
    if (!this.dataset_loader && this.args.make_pickers) {
      sel = this.get_or_create_sel_for_picker(this.args.dataset_loader__append_to_sel);
      this.dataset_loader = new PickOrProvide(this, sel,
        'Dataset', 'DataPP', false, false,
        {rsrcType: 'dataset'});
    }
    if (!this.ontology_loader && this.args.make_pickers) {
      sel = this.get_or_create_sel_for_picker(this.args.ontology_loader__append_to_sel);
      this.ontology_loader = new PickOrProvide(this, sel,
        'Ontology', 'OntoPP', true, false,
        {rsrcType: 'ontology'});
    }
    if (!this.script_loader && this.args.make_pickers) {
      sel = this.get_or_create_sel_for_picker(this.args.script_loader__append_to_sel);
      this.script_loader = new PickOrProvideScript(this, sel,
        'Script', 'ScriptPP', false, false,
        {dndLoaderClass: DragAndDropLoaderOfScripts, rsrcType: 'script'});
    }
    if (!this.endpoint_loader && this.args.make_pickers) {
      sel = this.get_or_create_sel_for_picker(this.args.endpoint_loader__append_to_sel);
      this.endpoint_loader = new PickOrProvide(this, sel,
        'Sparql', 'EndpointPP', false, true,
        {rsrcType: 'endpoint'});
    }
      //@endpoint_loader.outstanding_requests = 0
    if (this.endpoint_loader && !this.big_go_button) {
      this.build_sparql_form();
      const endpoint_selector = `#${this.endpoint_loader.select_id}`;
      $(endpoint_selector).change(this.update_endpoint_form);
    }
    if (this.ontology_loader && !this.big_go_button) {
      this.big_go_button_id = this.unique_id('goButton_');
      this.big_go_button = $('<button class="big_go_button">LOAD</button>');
      this.big_go_button.attr('id', this.big_go_button_id);
      $(this.get_or_create_sel_for_picker()).append(this.big_go_button);
      this.big_go_button.click(this.big_go_button_onclick);
      this.disable_go_button();
    }
    if (this.ontology_loader || this.dataset_loader || (this.script_loader && !this.big_go_button)) {
      const ontology_selector = `#${this.ontology_loader.select_id}`;
      $(ontology_selector).change(this.update_dataset_forms);
      const dataset_selector = `#${this.dataset_loader.select_id}`;
      $(dataset_selector).change(this.update_dataset_forms);
      const script_selector = `#${this.script_loader.select_id}`;
      $(script_selector).change(this.update_dataset_forms);
    }

    this.init_datasetDB();
    this.preload_datasets();

    //@preload_endpoints()
    // TODO remove this nullification of @last_val by fixing logic in select_option()
    // clear the last_val so select_option works the first time
    if (this.ontology_loader.last_val) {
      this.ontology_loader.last_val = null;
    }
  }

  big_go_button_onclick(event) {
    if (this.using_sparql()) {
      return this.big_go_button_onclick_sparql(event);
    }
    this.visualize_dataset_using_ontology();
  }

  big_go_button_onclick_sparql(event) {
    let endpoint_label_uri, graphUri;
    if (this.allGraphsChosen()) {
      let foundUri;
      if (foundUri = this.endpoint_labels_JQElem.val()) {
        this.visualize_dataset_using_ontology();
        return;
      }
      colorlog("IGNORING. The LOAD button should not even be clickable right now");
      return;
    }
    if (endpoint_label_uri = this.endpoint_labels_JQElem.val()) {
      this.visualize_dataset_using_ontology();
      return;
    }
    if (graphUri = this.sparqlGraphSelector_JQElem.val()) {
      // TODO remove the requirement for a graphUri to be specified before the spoQuery is enabled.
      let spoQuery;
      if (spoQuery = this.spo_query_JQElem.val()) {
        this.displayTheSpoQuery(spoQuery, graphUri);
        return;
      }
      this.displayTheChosenGraph(graphUri);
      return;
    }
    colorlog("IGNORING.  Neither graph nor endpoint_label is chosen.");
  }

  displayTheChosenGraph(graphUri) {
    //alert("stub for displayTheChosenGraph('#{graphUri}')")
    let limit;
    const args = {
      success_handler: this.display_graph_success_handler,
      result_handler: this.name_result_handler,
      query_terms: {
        g: graphUri
      }
    };
    // respect the limit provided by the user
    if (limit = this.endpoint_limit_JQElem.val()) {
      args.limit = limit;
    }
    args.query = this.make_generic_query(args);
    this.run_generic_query(args);
  }

  displayTheSpoQuery(spoQuery, graphUri) {
    let limit;
    const args = {
      success_handler: this.display_graph_success_handler,
      result_handler: this.name_result_handler,
      query: spoQuery,
      query_terms: {
        g: graphUri
      }
    };
    if (limit = this.endpoint_limit_JQElem.val()) {
      args.limit = limit;
    }
    this.run_generic_query(args);
  }

  // ## make_generic_query()
  //
  // The default query looks like:
  // ```sparql
  // SELECT *
  // FROM <query_terms.g> # only present if query_terms.g provided
  // WHERE {
  //   <query_terms.s> ?p ?o .
  // }
  // LIMIT 20 # the value of args.limit, if present
  // ```
  make_generic_query(in_args) {
    const args = this.compose_object_from_defaults_and_incoming(this.default_name_query_args, in_args);
    const terms = args.query_terms || {};
    const lines = ["SELECT *"];
    if (terms.g != null) {
      lines.push(`FROM <${terms.g}>`);
    }
    lines.push("WHERE {");
    let pattern = "  ";
    for (let term of 'spo'.split('')) {
      const val = terms[term];
      if (val != null) {
        pattern += `<${val}> `;
      } else {
        pattern += `?${term} `;
      }
    }
    pattern += ".";
    lines.push(pattern);
    lines.push("}");
    if (args.limit) {
      lines.push(`LIMIT ${args.limit}`);
    }
    return lines.join("\n");
  }

  run_generic_query(args) {
    const serverSpec = this.get_server_for_dataset(args.query_terms.g);
    const {serverType, serverUrl} = serverSpec;
    args.serverUrl = serverUrl;
    args.serverType = serverType;
    switch (serverType) {
      case 'sparql':
        this.run_managed_query_ajax(args);
        break;
      default:
        throw new Error(`don't know how to handle serverType: '${serverType}'`);
    }
  }

  get_server_for_dataset(datasetUri) {
    // Purpose:
    //   Perform best effort to figure out a sparqlEndpoint for the datasetUri.
    //   The following does not support domains which have more two parts.
    //   For instance it would fail for keys like 'thingy.co.uk'
    let domain, serverType, serverUrl;
    const aUrl = new URL(datasetUri);
    const {hostname} = aUrl;
    const hostname_parts = hostname.split('.');
    if (hostname_parts.length > 2) {
      while (hostname_parts.length > 2) {
        hostname_parts.shift();
      }
      domain = hostname_parts.join('.');
    } else {
      domain = hostname;
    }
    // Deal with the situation where the datasetUri sought is served
    // by the server the user has chosen.
    if (this.using_sparql() && (this.sparqlGraphSelector_JQElem.val() === datasetUri)) {
      serverType = 'sparql';
      serverUrl = this.endpoint_loader.value;
    // Otherwise, consult built-in hard-coded mappings from datasets to
    // the servers they are available at.  First we look for matches
    // based on the domain sought.
    } else if (serverUrl = this.domain2sparqlEndpoint[domain]) {
      serverType = 'sparql';
    // Then try to find wildcard servers '*', if available.
    } else if (serverUrl = this.domain2sparqlEndpoint['*']) {
      serverType = 'sparql';
    } else {
      throw new Error(`a server could not be found for ${datasetUri}`);
    }
    return {serverType, serverUrl};
  }

  update_dataset_forms(e) {
    const ont_val = $(`#${this.ontology_loader.select_id}`).val();
    const dat_val = $(`#${this.dataset_loader.select_id}`).val();
    const scr_val = $(`#${this.script_loader.select_id}`).val();
    if ((ont_val === '') && (dat_val === '') && (scr_val === '')) {
      return $(`#${this.endpoint_loader.uniq_id}`).children('select').prop('disabled', false);
    } else {
      return $(`#${this.endpoint_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
    }
  }

  update_graph_form(e) {
    console.log(e.currentTarget.value);
    this.endpoint_loader.endpoint_graph = e.currentTarget.value;
  }

  turn_on_loading_notice_if_enabled() {
    // This will work even if the display_loading_notice setting UX is removed.
    if (!this.display_loading_notice) {
      return;
    }
    setTimeout(this.turn_on_loading_notice);
  }

  turn_on_loading_notice() {
    colorlog('turn_on_loading_notice()','green');
    this.disable_go_button();
    const args = {width:550};
    // TODO: it would be good if one could pass an argument to disable the close button
    // TODO: display some stats about what is happening...
    // TODO: I do not think that this information should be provided through the make_doalog method
    this.my_loading_notice_dialog = this.make_markdown_dialog(this.loading_notice_markdown, null, args);
  }

  turn_off_loading_notice_if_enabled() {
    if (!this.display_loading_notice) {
      return;
    }
    setTimeout(this.turn_off_loading_notice);
  }

  turn_off_loading_notice() {
    colorlog('turn_off_loading_notice()','green');
    this.my_loading_notice_dialog.remove();
  }

  visualize_dataset_using_ontology(ignoreEvent, dataset, ontologies) {
    // Either dataset and ontologies are passed in by HuViz.load_with() from a command
    // or we are called with neither in which case get values from the SPARQL or SCRIPT loaders

    let data, endpoint_label_uri;
    colorlog('visualize_dataset_using_ontology()');
    this.close_blurt_box();

    // If we are loading from a SPARQL endpoint
    if (endpoint_label_uri = this.endpoint_labels_JQElem.val()) {
      this.turn_on_loading_notice_if_enabled();
      data = dataset || this.endpoint_loader;
      this.load_endpoint_data_and_show(endpoint_label_uri, this.after_visualize_dataset_using_ontology);
      // TODO ensure disable_dataset_ontology_loader() is only called once
      console.warn("disable_dataset_ontology_loader() SHOULD BE CALLED ONLY ONCE");
      this.disable_dataset_ontology_loader_AUTOMATICALLY();
      this.update_browser_title(data);
      this.update_caption(data.value, data.endpoint_graph);
      return;
    }

    // If we are loading from a SCRIPT
    const alreadyCommands = this.gclui.future_cmdArgs.length > 0;
    if (this.script_loader.value && !alreadyCommands) {
      const scriptUri = this.script_loader.value;
      this.get_resource_from_db(scriptUri, this.load_script_from_db);
      return;
    }

    // Otherwise we are starting with a dataset and ontology
    this.turn_on_loading_notice_if_enabled();
    const onto = (ontologies && ontologies[0]) || this.ontology_loader;
    data = dataset || this.dataset_loader;
    // at this point data and onto are both objects with a .value key, containing url or fname
    if (!(onto.value && data.value)) {
      console.debug(data, onto);
      this.update_dataset_forms();
      throw new Error("Now whoa-up pardner... both data and onto should have .value");
    }
    this.load_data_with_onto(data, onto, this.after_visualize_dataset_using_ontology);
    this.update_browser_title(data);
    this.update_caption(data.value, onto.value);
  }

  after_visualize_dataset_using_ontology() {
    this.turn_off_loading_notice_if_enabled();
    if (this.discover_geonames_remaining) { // If this value is absent or zero then geonames lookup is suppressed
      this.preset_discover_geonames_remaining();
    }
  }

  load_script_from_db(err, rsrcRec) {
    if (err != null) {
      this.blurt(err, 'error');
    } else {
      this.load_script_from_JSON(this.parse_script_file(rsrcRec.data, rsrcRec.uri));
    }
  }

  init_gclc() {
    this.gclc = new GraphCommandLanguageCtrl(this);
    this.init_resource_menus();
    if ((this.gclui == null)) {
      // @oldToUniqueTabSel['huvis_controls'] ???
      const dom_node = d3.select(this.args.gclui_sel).node();
      this.gclui = new CommandController(this, dom_node, this.hierarchy);
    }
    window.addEventListener('showgraph', this.register_gclc_prefixes);
    window.addEventListener('newpredicate', this.gclui.handle_newpredicate);
    if (!this.show_class_instance_edges) {
      TYPE_SYNS.forEach((pred_id,i) => {
        return this.gclui.ignore_predicate(pred_id);
      });
    }
    NAME_SYNS.forEach((pred_id,i) => {
      return this.gclui.ignore_predicate(pred_id);
    });
    for (let pid of this.predicates_to_ignore) {
      this.gclui.ignore_predicate(pid);
    }
  }

  disable_dataset_ontology_loader_AUTOMATICALLY() {
    // TODO to be AUTOMATIC(!!) handle dataset, ontology and script too
    // TODO this should add graph, item and limit only if needed
    const endpoint = {
      value: this.endpoint_loader.value,
      label: this.endpoint_loader.value, // TODO get pretty label (or not?)
      limit: this.endpoint_limit_JQElem.val(),
      graph: {
        value: this.sparqlGraphSelector_JQElem.val(),
        label: this.sparqlGraphSelector_JQElem.val()
      }, // TODO get pretty label (or not?)
      item: {
        value: this.endpoint_labels_JQElem.val(),
        label: this.endpoint_labels_JQElem.val()
      } // TODO get pretty label (or not?)
    };
    this.disable_dataset_ontology_loader(null, null, endpoint);
  }

  disable_dataset_ontology_loader(data, onto, endpoint) {
    this.replace_loader_display(data, onto, endpoint);
    this.disable_go_button();
    this.dataset_loader.disable();
    this.ontology_loader.disable();
    this.big_go_button.hide();
  }

  reset_dataset_ontology_loader() {
    $('#'+this.get_data_ontology_display_id()).remove();
    //Enable dataset loader and reset to default setting
    this.dataset_loader.enable();
    this.ontology_loader.enable();
    this.big_go_button.show();
    $(`#${this.dataset_loader.select_id} option[label='Pick or Provide...']`)
       .prop('selected', true);
    this.gclui_JQElem.removeAttr("style","display:none");
  }

  update_dataset_ontology_loader(args) {
    if (!((this.dataset_loader != null) && (this.ontology_loader != null) &&
            (this.endpoint_loader != null) && (this.script_loader != null))) {
      console.log("still building loaders...");
      return;
    }
    this.set_ontology_from_dataset_if_possible(args);
    const ugb = () => {
      return this.update_go_button(); // TODO confirm that this should be disable_go_button
    };
    setTimeout(ugb, 200);
  }

  update_endpoint_form(e) {
    //check if there are any endpoint selections available
    const graphSelector = `#sparqlGraphOptions-${e.currentTarget.id}`;
    $(graphSelector).change(this.update_graph_form);
    if (e.currentTarget.value === '') {
      $(`#${this.dataset_loader.uniq_id}`).children('select').prop('disabled', false);
      $(`#${this.ontology_loader.uniq_id}`).children('select').prop('disabled', false);
      $(`#${this.script_loader.uniq_id}`).children('select').prop('disabled', false);
      $(graphSelector).parent().css('display', 'none');
      this.reset_endpoint_form(false);
    } else if (e.currentTarget.value === 'provide') {
      console.log("update_endpoint_form ... select PROVIDE");
    } else {
      this.sparql_graph_query_and_show(e.currentTarget.value, e.currentTarget.id);
      //console.log(@dataset_loader)
      $(`#${this.dataset_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
      $(`#${this.ontology_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
      $(`#${this.script_loader.uniq_id}`).children('select').prop('disabled', 'disabled');
    }
  }

  reset_endpoint_form(show) {
    const spinner = $(`#sparqlGraphSpinner-${this.endpoint_loader.select_id}`);
    spinner.css('display','none');
    this.endpoint_labels_JQElem.prop('disabled', false).val("");
    this.endpoint_limit_JQElem.prop('disabled', false).val(this.sparql_query_default_limit);
    if (show) {
      this.sparqlQryInput_show();
    } else {
      this.sparqlQryInput_hide();
    }
  }

  disable_go_button() {
    let disable;
    this.update_go_button((disable = true));
  }

  enable_go_button() {
    let disable;
    this.update_go_button((disable = false));
  }

  update_go_button(disable) {
    if ((disable == null)) {
      if (this.script_loader.value) {
        disable = false;
      } else if (this.using_sparql()) {
        disable = false;
      } else {
        const ds_v = this.dataset_loader.value;
        const on_v = this.ontology_loader.value;
        //console.log("DATASET: #{ds_v}\nONTOLOGY: #{on_v}")
        disable = (!(ds_v && on_v)) || ([ds_v, on_v].includes('provide'));
        const ds_on = `${ds_v} AND ${on_v}`;
      }
    }
    this.big_go_button.prop('disabled', disable);
  }

  get_reload_uri() {
    return this.reload_uri || new URL(window.location);
  }

  generate_reload_uri(dataset, ontology, endpoint) {
    let uri;
    this.reload_uri = (uri = new URL(document.location));
    if (dataset && ontology) {
      uri.hash = `load+${dataset.value}+with+${ontology.value}`;
    } else if (endpoint) {
      uri.hash = "query+"+encodeURIComponent(endpoint.value);
      if (endpoint.graph && endpoint.graph.value) {
        uri.hash += "+from+"+encodeURIComponent(endpoint.graph.value);
      }
      if (endpoint.item && endpoint.item.value) {
        uri.hash += "+seeking+"+encodeURIComponent(endpoint.item.value);
      }
      if (endpoint.limit) {
        uri.hash += "+limit+"+encodeURIComponent(endpoint.limit);
      }
    }
    return uri;
  }

  get_data_ontology_display_id() {
    if (this.data_ontology_display_id == null) { this.data_ontology_display_id = this.unique_id('datontdisp_'); }
    return this.data_ontology_display_id;
  }

  hide_pickers() {
    $(this.pickersSel).attr("style","display:none");
  }

  replace_loader_display(dataset, ontology, endpoint) {
    this.generate_reload_uri(dataset, ontology, endpoint);
    this.hide_pickers();
    const vis_src_args = {
      uri: this.get_reload_uri(),
      dataset,
      ontology,
      endpoint,
      script: "TODO include script stuff here"
    };
    this.render_visualization_source_display(vis_src_args);
  }

  render_visualization_source_display(vis_src_args) {
    let add_reload_button, source_html;
    const {dataset, ontology, endpoint, script, uri} = vis_src_args;
    if (dataset && ontology) {
      add_reload_button = true;
      source_html = `\
<p><span class="dt_label">Dataset:</span> <a href="${dataset.value}">${dataset.label}</a></p>
<p><span class="dt_label">Ontology:</span> <a href="${ontology.value}">${ontology.label}</a></p>\
`;
    } else if (endpoint) {
      add_reload_button = true;
      source_html = `\
<p><span class="dt_label">Endpoint:</span> <a href="${endpoint.value}">${endpoint.label}</a></p>\
`;
      if (endpoint.graph) {
        source_html += `\
<p><span class="dt_label">Graph:</span> <a href="${endpoint.graph.value}">${endpoint.graph.label}</a></p>\
`;
      }
      if (endpoint.item) {
        source_html += `\
<p><span class="dt_label">Item:</span> <a href="${endpoint.item.value}">${endpoint.item.label}</a></p>\
`;
      }
      if (endpoint.limit) {
        source_html += `\
<p><span class="dt_label">Limit:</span> ${endpoint.limit}</p>\
`;
      }
    } else if (script) {
      source_html = `\
<p><span class="dt_label">Script:</span> ${script}</p>\
`;
    } else {
      source_html = `\
<p><span class="dt_label">Source:</span>TBD</p>\
`;
    }
    const reload_html = `\
<p>
<button title="Copy shareable link"
  class="show_shareable_link_dialog"><i class="fas fa-share-alt"></i></button>
<button title="Reload this data"
   onclick="location.replace('${uri}');location.reload()"><i class="fas fa-redo"></i></button>
<button title="Clear the graph and start over"
   onclick="location.assign(location.origin)"><i class="fas fa-times"></i></button>
</p>\
`;
    const visualization_source_display = `\
<div id="${this.get_data_ontology_display_id()}" class="data_ontology_display">
${source_html}
${(add_reload_button && reload_html) || ''}
<br style="clear:both">
</div>`; // """ the extra set of triple double quotes is for emacs coffescript mode
    const sel = this.oldToUniqueTabSel['huvis_controls'];
    const controls = document.querySelector(sel);
    controls.insertAdjacentHTML('afterbegin', visualization_source_display);
    const shareable_link_button = controls.querySelector(".show_shareable_link_dialog");
    const show_shareable_link_closure = () => this.show_shareable_link_dialog(uri);
    shareable_link_button.onclick = show_shareable_link_closure;
  }

  show_shareable_link_dialog(uri) {
    const args = {width:550};
    const shareLinkId = unique_id('lnk_');
    const shareLinkSel = "#"+shareLinkId;
    const onclickCommand = [
      `input=document.getElementById('${shareLinkId}');`,
      "input.select();",
      "input.setSelectionRange(0, 99999);",
      "document.execCommand('copy',input);",
      "return"].join(' ');
    const md = `\
## Shareable Link

<input type="text" id="${shareLinkId}" class="urlToShare" value="${uri}"/>
<button onclick="${onclickCommand}" class="urlCopyButton"><i class="fa fa-copy" aria-hidden="true"></i> Copy</button>\
`;
    this.make_markdown_dialog(md, null, args);
  }

  replace_loader_display_for_endpoint(endpoint, graph) {
    let print_graph;
    $(this.pickersSel).attr("style","display:none");
    //uri = new URL(location)
    //uri.hash = "load+#{dataset.value}+with+#{ontology.value}"
    if (graph) {
      print_graph = `<p><span class='dt_label'>Graph:</span> ${graph}</p>`;
    } else {
      print_graph = "";
    }
    const data_ontol_display = `\
<div id="${this.get_data_ontology_display_id()}">
<p><span class="dt_label">Endpoint:</span> ${endpoint}</p>
${print_graph}
<br style="clear:both">
</div>`;
    $("#huvis_controls").prepend(data_ontol_display);
  }

  update_browser_title(dataset) {
    if (dataset.value) {
      this.set_browser_title(dataset.label);
    }
  }

  set_browser_title(label) {
    document.title = label + " - Huvis Graph Visualization";
  }

  make_git_link() {
    const base = this.args.git_base_url;
    return `<a class="git_commit_hash_watermark subliminal"
target="huviz_version"  tabindex="-1"
href="${base}${this.git_commit_hash}">${this.git_commit_hash}</a>`; // """
  }

  create_caption() {
    this.captionId = this.unique_id('caption_');
    this.addDivWithIdAndClasses(this.captionId, "graph_title_set git_commit_hash_watermark");
    this.captionElem = document.querySelector('#' + this.captionId);
    if (this.git_commit_hash) {
      this.insertBeforeEnd(this.captionElem, this.make_git_link());
    }
    const dm = 'dataset_watermark';
    this.insertBeforeEnd(this.captionElem, `<div class="${dm} subliminal"></div>`); // """
    this.make_JQElem(dm, this.args.huviz_top_sel + ' .' + dm); // @dataset_watermark_JQElem
    const om = 'ontology_watermark';
    this.insertBeforeEnd(this.captionElem, `<div class="${om} subliminal"></div>`); // """
    this.make_JQElem(om, this.args.huviz_top_sel + ' .' + om); // @ontology_watermark_JQElem
  }

  update_caption(dataset_str, ontology_str) {
    this.dataset_watermark_JQElem.text(dataset_str);
    this.ontology_watermark_JQElem.text(ontology_str);
  }

  set_ontology_from_dataset_if_possible(args) {
    if (args == null) { args = {}; }
    if (args.pickOrProvide === this.ontology_loader) { // and @dataset_loader.value
      // The ontology_loader being adjusted provoked this call.
      // We do not want to override the adjustment just made by the user.
      return;
    }
    if (this.dataset_loader.value) { // and not @ontology_loader.value
      const option = this.dataset_loader.get_selected_option();
      const ontologyUri = option.data('ontologyUri');
      const ontology_label = option.data('ontology_label'); //default set in group json file
      if (ontologyUri) { // let the uri (if present) dominate the label
        this.set_ontology_with_uri(ontologyUri);
      } else {
        this.set_ontology_with_label(ontology_label);
      }
    }
    this.ontology_loader.update_state();
  }

  set_ontology_with_label(ontology_label) {
    const topSel = this.args.huviz_top_sel;
    const sel = topSel + ` option[label='${ontology_label}']`;
    for (let ont_opt of $(sel)) { // FIXME make this re-entrant
      this.ontology_loader.select_option($(ont_opt));
      return;
    }
  }

  set_dataset_with_uri(uri) {
    // TODO use PickOrProvide.select_by_uri() as in query_from_seeking_limit()
    const topSel = this.args.huviz_top_sel;
    const option = $(topSel + ' option[value="' + uri + '"]');
    this.dataset_loader.select_option(option);
  }

  set_ontology_with_uri(ontologyUri) {
    // TODO use PickOrProvide.select_by_uri() as in query_from_seeking_limit()
    const topSel = this.args.huviz_top_sel;
    const ontology_option = $(topSel + ' option[value="' + ontologyUri + '"]');
    this.ontology_loader.select_option(ontology_option);
  }

  build_sparql_form() {
    this.sparqlId = unique_id();
    const sparqlQryInput_id = `sparqlQryInput_${this.sparqlId}`;
    this.sparqlQryInput_selector = "#" + sparqlQryInput_id;
    const endpoint_limit_id = unique_id('endpoint_limit_');
    const endpoint_labels_id = unique_id('endpoint_labels_');
    const spo_query_id = unique_id('spo_query_');
    const sparqlGraphSelectorId = `sparqlGraphOptions-${this.endpoint_loader.select_id}`;
    const select_box = `\
<div class="ui-widget" style="display:none;margin-top:5px;margin-left:10px;">
  <label>Graphs: </label>
  <select id="${sparqlGraphSelectorId}">
  </select>
</div>
<div id="sparqlGraphSpinner-${this.endpoint_loader.select_id}"
   style="display:none;font-style:italic;">
  <i class="fas fa-spinner fa-spin" style="margin: 10px 10px 0 50px;"></i>  Looking for graphs...
</div>
<div id="${sparqlQryInput_id}" class="ui-widget sparqlQryInput"
   style="display:none;margin-top:5px;margin-left:10px;color:#999;">
  <label for="${endpoint_labels_id}">Find: </label>
  <input id="${endpoint_labels_id}">
  <i class="fas fa-spinner fa-spin" style="visibility:hidden;margin-left: 5px;"></i>
  <div>
    <label for="${endpoint_limit_id}">Node Limit: </label>
    <input id="${endpoint_limit_id}" value="${this.sparql_query_default_limit}">
  </div>
  <div>
    <label for="${spo_query_id}">(s,p,o) query: </label>
    <textarea id="${spo_query_id}" value=""
      placeholder="pick graph, then enter query producing s,p,o"></textarea>
  </div>
</div>\
`; // """
    $(this.pickersSel).append(select_box);
    this.sparqlQryInput_JQElem = $(this.sparqlQryInput_selector);
    this.endpoint_labels_JQElem = $('#'+endpoint_labels_id);
    this.endpoint_limit_JQElem = $('#'+endpoint_limit_id);
    this.sparqlGraphSelector_JQElem = $('#'+sparqlGraphSelectorId);
    this.sparqlGraphSelector_JQElem.change(this.sparqlGraphSelector_onchange);
    const fromGraph ='';
    this.endpoint_labels_JQElem.on('input', this.animate_endpoint_label_typing);
    this.endpoint_labels_JQElem.autocomplete({
      minLength: 3,
      delay: 500,
      position: {collision: "flip"},
      source: this.search_sparql_by_label
    });
    this.endpoint_labels_JQElem.on('autocompleteselect', this.endpoint_labels__autocompleteselect);
    this.endpoint_labels_JQElem.on('change', this.endpoint_labels__update);
    this.endpoint_labels_JQElem.focusout(this.endpoint_labels__focusout);

    this.spo_query_JQElem = $('#'+spo_query_id);
    this.spo_query_JQElem.on('update', this.spo_query__update);
  }

  spo_query__update(event) {
    // if there is a query, then permit LOAD of graph
    if (this.spo_query_JQElem.length) {
      this.enable_go_button();
    } else {
      this.disable_go_button();
    }
  }

  // Called when the user selects an endpoint_labels autosuggestion
  endpoint_labels__autocompleteselect(event) {
    // Hopefully having this handler engaged will not interfere with the autocomplete.
    this.enable_go_button();
    return true;
  }

  endpoint_labels__update(event) {
    // If the endpoint_labels field is left blank then permit LOAD of graph
    if (!this.endpoint_labels_JQElem.val().length) {
      this.enable_go_button();
    }
    return true;
  }

  endpoint_labels__focusout(event) {
    // If endpoint_labels has content WITHOUT autocompleteselect then disable LOAD
    if (!this.endpoint_labels_JQElem.val().length) {
      this.enable_go_button();
    }
    return true;
  }

  allGraphsChosen() {
    // REVIEW what about the case where there were no graphs?
    try {
      return this.sparqlGraphSelector_JQElem.val() === this.endpoint_loader.value;
    } catch (error) {
      // REVIEW big handwave here! Assuming an error means something is missing
      return false;
    }
  }

  // When a Graph is selected, we offer the LOAD button for full graph loading.
  sparqlGraphSelector_onchange(event) {
    if (this.allGraphsChosen()) {
      // Apparently, 'All Graphs' was chosen.
      // Disable the LOAD button because loading all data on a server is madness.
      this.disable_go_button();
    } else {
      // Some particular graph was apparently chosen.
      // We enable the LOAD button so the whole graph may be loaded.
      this.enable_go_button();
    }
  }

  animate_endpoint_label_typing() {
    // Called every time the user types a character to animate the countdown to sending a query
    const elem = this.endpoint_labels_JQElem[0];
    this.endpoint_label_typing_anim = this.animate_fill_graph(elem, 500, '#E7E7E7');
    // TODO receive a handle to the animation so it can be killed when the search begins
  }

  animate_endpoint_label_search(overMsec, fc, bc) {
    // Called every time the search starts to show countdown until timeout
    this.start_graphs_selector_spinner();
    if (overMsec == null) { overMsec = this.get_sparql_timeout_msec(); }
    const elem = this.endpoint_labels_JQElem[0];
    this.endpoint_label_search_anim = this.animate_sparql_query(elem, overMsec, fc, bc);
    // TODO upon timeout, style box with a color to indicate failure
    // TODO upon success, style the box with a color to indicate success
  }

  endpoint_label_search_success() {
    this.kill_endpoint_label_search_anim();
    this.endpoint_labels_JQElem.css('background', 'lightgreen');
  }

  endpoint_label_search_none() {
    this.kill_endpoint_label_search_anim();
    this.endpoint_labels_JQElem.css('background', 'lightgrey');
  }

  endpoint_label_search_failure() {
    this.kill_endpoint_label_search_anim();
    this.endpoint_labels_JQElem.css('background', 'pink');
  }

  kill_endpoint_label_search_anim() {
    this.endpoint_label_search_anim.cancel();
    this.stop_graphs_selector_spinner();
  }

  animate_sparql_query(elem, overMsec, fillColor, bgColor) {
    if (fillColor == null) { fillColor = 'lightblue'; }
    return this.animate_fill_graph(elem, overMsec, fillColor, bgColor);
  }

  animate_fill_graph(elem, overMsec, fillColor, bgColor) {
    // https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
    if (overMsec == null) { overMsec = 2000; }
    if (fillColor == null) { fillColor = 'yellow'; }
    if (bgColor == null) { bgColor = 'white'; }
    const animId = false;
    const go = function(elem, overMsec, fillColor, bgColor) {
      const cancelled = false;
      const anim = {elem, overMsec, fillColor, bgColor, cancelled};
      var step = function(nowMsec) {
        if (anim.cancelled) {
          console.info('animate_fill_graph() cancelled');
          return;
        }
        if (!anim.startMsec) {
          anim.startMsec = nowMsec;
        }
        anim.progressMsec = nowMsec - anim.startMsec;
        const fillPct = ((anim.overMsec - anim.progressMsec) / anim.overMsec) * 100;
        const bgPct = 100 - fillPct;
        const bg = `linear-gradient(to right, ${anim.fillColor} 0% ${bgPct}%, ${bgColor} ${bgPct}%, ${anim.bgColor} 100%)`;
        // console.log(bg, anim.startMsec, nowMsec, anim.progressMsec)
        elem.style.background = bg;
        if (anim.progressMsec < anim.overMsec) {
          return anim.animId = requestAnimationFrame(step);
        }
      };
      anim.animId = requestAnimationFrame(step);
      anim.cancel = function() {
        anim.cancelled = true;
        return window.cancelAnimationFrame(anim.animId);
      };
      return anim;
    };
    return go(elem, overMsec, fillColor, bgColor);
  }

  get_sparql_timeout_msec() {
    return 1000 * (this.sparql_timeout || 5);
  }

  start_graphs_selector_spinner() {
    const spinner = this.endpoint_labels_JQElem.siblings('i');
    spinner.css('visibility','visible');
  }

  stop_graphs_selector_spinner() {
    const spinner = this.endpoint_labels_JQElem.siblings('i');
    spinner.css('visibility','hidden'); //  happens regardless of result.length
  }

  euthanize_search_sparql_by_label() {
    this.disable_go_button();
    if (this.search_sparql_by_label_queryManager != null) {
      this.kill_endpoint_label_search_anim();
      this.search_sparql_by_label_queryManager.kill();
      return true;
    }
    return false;
  }

  //  # Reading
  //
  //  Efficient Optimization and Processing of Queries over Text-rich Graph-structured Data
  //    https://d-nb.info/1037189205/34
  //
  //  Alternatives to regex in SPARQL
  //    https://www.cray.com/blog/dont-use-hammer-screw-nail-alternatives-regex-sparql/
  search_sparql_by_label(request, response) {
    this.euthanize_search_sparql_by_label();
    this.animate_endpoint_label_search();
    this.start_graphs_selector_spinner();
    const url = this.endpoint_loader.value;
    let fromGraph = '';
    if (this.endpoint_loader.endpoint_graph) {
      fromGraph=` FROM <${this.endpoint_loader.endpoint_graph}> `;
    }

    const qry = `\
# search_sparql_by_label()
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX dbp: <http://dbpedia.org/ontology/>
SELECT DISTINCT * ${fromGraph}
WHERE {
?sub rdfs:label|foaf:name|dbp:name ?obj .
FILTER (STRSTARTS(LCASE(?obj), "${request.term.toLowerCase()}"))
}
LIMIT 20\
`;                       // for emacs syntax hilighting  ---> "

    const make_success_handler = () => {
      return (data, textStatus, jqXHR, queryManager) => {
        let json_data;
        const json_check = typeof data;
        if (json_check === 'string') {
          try {
            json_data = JSON.parse(data);
          } catch (e) {
            console.error(e);
            console.log({data});
            this.endpoint_label_search_failure();
          }
        } else {
          json_data = data;
        }
        const results = json_data.results.bindings;
        queryManager.setResultCount(results.length);
        const selections = [];

        if (results.length) {
          this.endpoint_label_search_success();
        } else {
          this.endpoint_label_search_none();
        }
        // TODO maybe move spinner control into @kill_endpoint_label_search_anim()
        this.stop_graphs_selector_spinner();

        for (let label of results) {
          const this_result = {
            label: label.obj.value + ` (${label.sub.value})`,
            value: label.sub.value
          };
          selections.push(this_result);
        }
        return response(selections);
      };
    };

    const make_error_callback = () => {
      return (jqxhr, textStatus, errorThrown) => {
        this.endpoint_label_search_failure();
        $('#'+this.get_data_ontology_display_id()).remove();
        return this.stop_graphs_selector_spinner();
      };
    };

    const args = {
      query: qry,
      serverUrl: url,
      success_handler: make_success_handler(),
      error_callback: make_error_callback()
    };

    this.search_sparql_by_label_queryManager = this.run_managed_query_ajax(args);
  }

  init_editc_or_not() {
    if (this.editui == null) {
      this.editui = new EditController(this);
    }
    this.editui.id = 'EditUI';
    this.editui.transit('start'); // was prepare
    if (this.args.show_edit) {
      this.editui.show();
    } else {
      this.editui.hide();
    }
    if (this.args.start_with_editing) {
      this.editui.transit('enable');
    }
  }

  indexed_dbservice() {
    if (this.indexeddbservice == null) { this.indexeddbservice = new IndexedDBService(this); }
  }

  init_indexddbstorage() {
    if (this.dbsstorage == null) { this.dbsstorage = new IndexedDBStorageController(this, this.indexeddbservice); }
  }

  get_polar_coords_of(node) {
    const w = this.get_container_height();
    const h = this.get_container_width();
    const min_wh = Math.min(w, h);
    let max_radius = min_wh / 2;
    max_radius = this.graph_region_radius;
    const x = node.x - this.cx;
    const y = node.y - this.cy;
    const range = (Math.sqrt(((x * x) + (y * y)))/(max_radius));
    const radians = Math.atan2(y, x) + (Math.PI); // + (Math.PI/2)
    const degrees = (Math.floor((radians * 180) / Math.PI) + 270) % 360;
    return {range, degrees};
  }

  run_verb_on_object(verb, subject) {
    const args = {
      verbs: [verb],
      subjects: [this.get_handle(subject)]
    };
    if (verb === 'pin') {
      args.polar_coords = this.get_polar_coords_of(subject);
    }
    const cmd = new GraphCommand(this, args);
    this.run_command(cmd);
  }

  before_running_command() {
    // FIXME fix non-display of cursor and color changes
    if (this.use_fancy_cursor) {
      this.text_cursor.set_cursor("wait");
    }
  }

  after_running_command() {
    //toggle_suspend_updates(false)
    if (this.use_fancy_cursor) {
      this.text_cursor.set_cursor("default");
    }
    //$("body").css "background-color", this.renderStyles.pageBg # FIXME remove once it works!
    //$("body").addClass this.renderStyles.themeName
    this.topElem.style.backgroundColor = this.renderStyles.pageBg;
    this.topElem.classList.add(this.renderStyles.themeName);

    this.update_all_counts();
    this.clean_up_all_dirt_once();
  }

  get_handle(thing) {
    // A handle is like a weak reference, saveable, serializable
    // and garbage collectible.  It was motivated by the desire to
    // turn an actual node into a suitable member of the subjects list
    // on a GraphCommand
    return {id: thing.id, lid: thing.lid};
  }

  toggle_logging() {
    if ((console.log_real == null)) {
      console.log_real = console.log;
    }
    const new_state = console.log === console.log_real;
    return this.set_logging(new_state);
  }

  set_logging(new_state) {
    if (new_state) {
      console.log = console.log_real;
      return true;
    } else {
      console.log = function() {};
      return false;
    }
  }

  create_state_msg_box() {
    this.state_msg_box = $("#state_msg_box");
    //@state_msg_box = $("#{@args.state_msg_box_sel}")
    this.hide_state_msg();
    //console.info @state_msg_box
  }

  init_ontology() {
    this.create_taxonomy();
    this.ontology = PRIMORDIAL_ONTOLOGY;
  }

  get_default_tab(id) {
    for (let tab of this.default_tab_specs) {
      if (tab.id === id) {
        return tab;
      }
    }
    return {
      id,
      title: id,
      cssClass: id,
      text: id};
  }

  make_tabs_html() {
    // The firstClass in cssClass acts like a re-entrant identifier for these
    // tabs. Each also gets a unique id.
    // Purpose:
    //   Programmatically build the equivalent of views/tabs/all.ejs but with
    //   unique ids for the divs
    // Notes:
    //   When @args.use_old_tabs_ids is true this method reproduces all.ejs exactly.
    //   Otherwise it gives each div a unique id
    //   Either way @oldToUniqueTabSel provides a way to select each tab using
    //       the old non-reentrant ids like 'tabs-intro'
    // Arguments:
    //   cssClass becomes the value of the class attribute of the div
    //   title becomes the title attribute of the tab
    //   text becomes the visible label of the tab
    //   moveSelector: (optional) the selector of content to move into the div
    //   bodyUrl: (optional) is the url of content to insert into the div
    //       (if it ends with .md the markdown is rendered)
    // Motivation:
    //   The problem this is working to solve is that we want HuViz to
    //   be re-entrant (ie more than one instance per page) but it was
    //   originally written without that in mind, using unique ids such
    //   as #tabs-intro liberally.  This method provides a way to
    //   programmatically build the tabs with truly unique ids but also
    //   with a way to learn what those ids are using the old
    //   identifiers.  To finish the task of transforming the code to
    //   be re-entrant we must:
    //     1) find all the places which use ids such as "#gclui" or
    //        "#tabs-history" and get them to use @oldToUniqueTabSel
    //        as a lookup for the new ids.
    //     2) rebuild the CSS to use class names such as ".gclui" rather
    //        than the old ids such as "#gclui"
    const jQElem_list = []; // a list of args for the command @make_JQElem()
    let theTabs = "<ul class=\"the-tabs\">";
    let theDivs = "";
    const {
      tab_specs
    } = this.args;
    this.tab_id_to_idx = {};
    let idx = -1;
    for (let t of tab_specs) {
      idx++;
      if (typeof(t) === 'string') {
        t = this.get_default_tab(t);
      }
      const firstClass = t.cssClass.split(' ')[0];
      const firstClass_ = firstClass.replace(/\-/, '_');
      let id = this.unique_id(firstClass + '_');
      this.tabs_class_to_id[firstClass] = id;
      if (this.args.use_old_tab_ids) {
        id = firstClass;
      }
      const idSel = '#' + id;
      const tab_id = t.id;
      this.tab_id_to_idx[tab_id] = idx;
      this.oldToUniqueTabSel[firstClass] = idSel;
      theTabs += `<li><a href="${idSel}" title="${t.title}">${t.text}</a></li>`;
      theDivs += `<div id="${id}" class="${t.cssClass}">${t.kids || ''}</div>`;
      if ((typeof marked === 'undefined' || marked === null)) {
        console.info('marked does not exist yet');
      }
      if (t.bodyUrl != null) {
        this.withUriDo(t.bodyUrl, idSel);
      }
      if (t.moveSelector != null) {
        const mkcb = (fromSel, toSel) => { // make closure
          return () => this.moveSelToSel(fromSel, toSel);
        };
        setTimeout(mkcb(t.moveSelector, idSel), 30);
      }
      jQElem_list.push([firstClass_, idSel]);
    } // queue up args for execution by @make_JQElem()
    theTabs += "</ul>";
    this.tabs_id = this.unique_id('tabs_');
    const html = [
      `<section id="${this.tabs_id}" class="huviz_tabs" role="controls">`,
      theTabs, theDivs,
      "</section>"].join('');
    return [html, jQElem_list];
  }

  moveSelToSel(moveSel, targetSel) {
    let moveElem, targetElem;
    if (!(moveElem = document.querySelector(moveSel))) {
      console.warn(`moveSelector() failed to find moveSel: '${ moveSel}'`);
      return;
    }
    if (!(targetElem = document.querySelector(targetSel))) {
      console.warn(`moveSelector() failed to find targetSel: '${ targetSel}'`);
      return;
    }
    targetElem.appendChild(moveElem);
  }

  withUriDo(url, sel, processor) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = (e) => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          if (processor == null) { processor = (url.endsWith('.md') && marked) || ident; }
          return this.renderIntoWith(xhr.responseText, sel, processor);
        } else {
          return console.error(xhr.statusText);
        }
      }
    };
    xhr.onerror = (e) => console.error(xhr.statusText);
    xhr.send(null);
  }

  renderIntoWith(data, sel, processor) {
    const elem = document.querySelector(sel);
    if (!elem) {
      return;
    }
    if (processor != null) {
      elem.innerHTML = processor(data);
    } else {
      elem.innerHTML = data;
    }
  }

  insertBeforeEnd(elem, html) {
    const position = 'beforeend';
    elem.insertAdjacentHTML(position, html);
    return elem.lastElementChild;  // note, this only works right if html has one outer elem
  }

  create_tabs() {
    this.tabs_class_to_id = {};
    if (!this.args.tab_specs) {
      return;
    }
    const elem = document.querySelector(this.args.create_tabs_adjacent_to_selector);
    const [html, jQElem_list] = Array.from(this.make_tabs_html());
    this.addHTML(html);
    for (let pair of jQElem_list) {
      const contentAreaJQElem = this.make_JQElem(pair[0], pair[1]); // make things like @tab_options_JQElem
      const tabKey = 'tab_for_' + pair[0];
      const tabSel = 'li [href="#' + contentAreaJQElem[0].id + '"]';
      this.make_JQElem(tabKey, tabSel);
    } // make things like @tab_for_tab_options_JQElem
  }

  ensureTopElem() {
    if (!document.querySelector(this.args.huviz_top_sel)) {
      const body = document.querySelector("body");
      const id = sel_to_id(this.args.huviz_top_sel);
      const classes = 'huviz_top';
      this.addDivWithIDAndClasses(id, classes, body);
    }
    this.topElem = document.querySelector(this.args.huviz_top_sel);
    this.topJQElem = $(this.topElem);
  }

  get_picker_style_context_selector() {
    // The selector of the context which the picker's colors are constrained to.
    // What?  To keep the colors which any ColorTreePickers create confined to
    // this particular HuViz instance.
    return this.args.huviz_top_sel;
  }

  addHTML(html) {
    return this.insertBeforeEnd(this.topElem, html);
  }

  addDivWithIdAndClasses(id, classes, specialElem) {
    const idHtml = (id && `id="${sel_to_id(id)}" `) || ""; // html for the id, if there is one
    const html = `<div ${idHtml} class="${classes}"></div>`;
    if (specialElem) {
      return this.insertBeforeEnd(specialElem, html);
    } else {
      return this.addHTML(html);
    }
  }

  ensure_divs() {
    // find the unique id for things like viscanvas and make div if missing
    for (let key of this.needed_divs) {
      var sel;
      const key_sel = key + '_sel';
      if (sel = this.args[key_sel]) {
        var elem;
        const id = sel_to_id(sel);
        const classes = key;
        if (!(elem = document.querySelector(sel))) {
          var specialParent;
          let specialParentElem = null; // indicates the huviz_top div
          if (specialParent = this.div_has_special_parent[key]) {
            var specialParentSel;
            const specialParentSelKey = specialParent + '_sel';
            if ((specialParentSel = this.args[specialParentSelKey]) ||
                  (specialParentSel = this.oldToUniqueTabSel[specialParent])) {
              specialParentElem = document.querySelector(specialParentSel);
            }
          }
          this.addDivWithIdAndClasses(id, classes, specialParentElem);
        }
      }
    }
  }

  make_JQElem(key, sel) {
    const jqelem_id = key + '_JQElem';
    const found = $(sel);
    if (found.length > 0) {
      this[jqelem_id] = found;
    } else {
      throw new Error(sel + ' not found');
    }
    return found;
  }

  make_JQElems() {
    // Make jQuery elems like @viscanvas_JQElem and performance_dashboard_JQElem
    for (let key of this.needed_JQElems) {
      var sel;
      if (sel = this.args[key + '_sel']) {
        this.make_JQElem(key, sel);
      }
    }
  }

  // TODO create default_args from needed_divs (or something)
  make_default_args() {
    // these must be made on the fly for reentrancy
    return {
      add_to_HVZ: true,
      ctrl_handle_sel: unique_id('#ctrl_handle_'),
      gclui_sel: unique_id('#gclui_'),
      git_base_url: "https://github.com/smurp/huviz/commit/",
      hide_fullscreen_button: false,
      huviz_top_sel: unique_id('#huviz_top_'), // if not provided then create
      make_pickers: true,
      performance_dashboard_sel: unique_id('#performance_dashboard_'),
      settings: {},
      show_edit: false,
      show_tabs: true,
      skip_log_tick: true,
      state_msg_box_sel: unique_id('#state_msg_box_'),
      status_sel: unique_id('#status_'),
      stay_square: false,
      tab_specs: ['commands','settings','history'], // things break if these are not present
      tabs_minWidth: 300,
      use_old_tab_ids: false,
      viscanvas_sel: unique_id('#viscanvas_'),
      vissvg_sel: unique_id('#vissvg_')};
  }

  calculate_args(incoming_args) {
    // overlay incoming over defaults to make the composition
    if (incoming_args == null) { incoming_args = {}; }
    if (!incoming_args.huviz_top_sel) {
      console.warn('you have not provided a value for huviz_top_sel so it will be appended to BODY');
    }
    const args = this.compose_object_from_defaults_and_incoming(this.make_default_args(), incoming_args);
    // calculate some args from others
    if (args.create_tabs_adjacent_to_selector == null) {
      args.create_tabs_adjacent_to_selector = args.huviz_top_sel;
    }
    return args;
  }

  constructor(incoming_args) { // Huviz
    this.like_string = this.like_string.bind(this);
    this.mousemove = this.mousemove.bind(this);
    this.mousedown = this.mousedown.bind(this);
    this.mouseup = this.mouseup.bind(this);
    this.mouseright = this.mouseright.bind(this);
    this.close_node_inspector = this.close_node_inspector.bind(this);
    this.updateWindow = this.updateWindow.bind(this);
    this.get_charge = this.get_charge.bind(this);
    this.get_gravity = this.get_gravity.bind(this);
    this.mouseout_of_huviz_controls = this.mouseout_of_huviz_controls.bind(this);
    this.mouseover_of_huviz_controls = this.mouseover_of_huviz_controls.bind(this);
    this.mousemove_boxNG = this.mousemove_boxNG.bind(this);
    this.mousedown_boxNG = this.mousedown_boxNG.bind(this);
    this.mouseout_boxNG = this.mouseout_boxNG.bind(this);
    this.mouseenter_boxNG = this.mouseenter_boxNG.bind(this);
    this.mouseup_boxNG = this.mouseup_boxNG.bind(this);
    this.tick = this.tick.bind(this);
    this.hide_state_msg = this.hide_state_msg.bind(this);
    this.discovery_triple_ingestor_N3 = this.discovery_triple_ingestor_N3.bind(this);
    this.discovery_triple_ingestor_GreenTurtle = this.discovery_triple_ingestor_GreenTurtle.bind(this);
    this.make_triple_ingestor = this.make_triple_ingestor.bind(this);
    this.discover_labels = this.discover_labels.bind(this);
    this.ingest_quads_from = this.ingest_quads_from.bind(this);
    this.show_geonames_instructions = this.show_geonames_instructions.bind(this);
    this.tsv_name_success_handler = this.tsv_name_success_handler.bind(this);
    this.json_name_success_handler = this.json_name_success_handler.bind(this);
    this.display_graph_success_handler = this.display_graph_success_handler.bind(this);
    this.generic_success_handler = this.generic_success_handler.bind(this);
    this.generic_name_success_handler = this.generic_name_success_handler.bind(this);
    this.convert_str_obj_to_GreenTurtle = this.convert_str_obj_to_GreenTurtle.bind(this);
    this.convert_N3_uri_to_string = this.convert_N3_uri_to_string.bind(this);
    this.convert_str_uri_to_string = this.convert_str_uri_to_string.bind(this);
    this.convert_obj_obj_to_GreenTurtle = this.convert_obj_obj_to_GreenTurtle.bind(this);
    this.convert_obj_uri_to_string = this.convert_obj_uri_to_string.bind(this);
    this.name_result_handler = this.name_result_handler.bind(this);
    this.parseAndShowTTLData = this.parseAndShowTTLData.bind(this);
    this.parseAndShowTurtle = this.parseAndShowTurtle.bind(this);
    this.choose_everything = this.choose_everything.bind(this);
    this.parse_and_show_NQ_file = this.parse_and_show_NQ_file.bind(this);
    this.DUMPER = this.DUMPER.bind(this);
    this.log_query = this.log_query.bind(this);
    this.sparql_graph_query_and_show__trigger = this.sparql_graph_query_and_show__trigger.bind(this);
    this.sparql_graph_query_and_show = this.sparql_graph_query_and_show.bind(this);
    this.update_searchterm = this.update_searchterm.bind(this);
    this.clean_up_dirty_predicates = this.clean_up_dirty_predicates.bind(this);
    this.clean_up_all_dirt = this.clean_up_all_dirt.bind(this);
    this.shelve = this.shelve.bind(this);
    this.suppress = this.suppress.bind(this);
    this.choose = this.choose.bind(this);
    this.unchoose = this.unchoose.bind(this);
    this.wander__atFirst = this.wander__atFirst.bind(this);
    this.wander__atLast = this.wander__atLast.bind(this);
    this.wander = this.wander.bind(this);
    this.walk = this.walk.bind(this);
    this.hide = this.hide.bind(this);
    this.select = this.select.bind(this);
    this.unselect = this.unselect.bind(this);
    this.animate_hunt = this.animate_hunt.bind(this);
    this.hunt = this.hunt.bind(this);
    this.clear_snippets = this.clear_snippets.bind(this);
    this.peek = this.peek.bind(this);
    this.print = this.print.bind(this);
    this.redact = this.redact.bind(this);
    this.draw_edge_regarding = this.draw_edge_regarding.bind(this);
    this.undraw_edge_regarding = this.undraw_edge_regarding.bind(this);
    this.register_gclc_prefixes = this.register_gclc_prefixes.bind(this);
    this.ensure_datasets = this.ensure_datasets.bind(this);
    this.ensure_datasets_from_XHR = this.ensure_datasets_from_XHR.bind(this);
    this.big_go_button_onclick = this.big_go_button_onclick.bind(this);
    this.update_dataset_forms = this.update_dataset_forms.bind(this);
    this.update_graph_form = this.update_graph_form.bind(this);
    this.turn_on_loading_notice = this.turn_on_loading_notice.bind(this);
    this.turn_off_loading_notice = this.turn_off_loading_notice.bind(this);
    this.visualize_dataset_using_ontology = this.visualize_dataset_using_ontology.bind(this);
    this.after_visualize_dataset_using_ontology = this.after_visualize_dataset_using_ontology.bind(this);
    this.load_script_from_db = this.load_script_from_db.bind(this);
    this.update_dataset_ontology_loader = this.update_dataset_ontology_loader.bind(this);
    this.update_endpoint_form = this.update_endpoint_form.bind(this);
    this.reset_endpoint_form = this.reset_endpoint_form.bind(this);
    this.disable_go_button = this.disable_go_button.bind(this);
    this.enable_go_button = this.enable_go_button.bind(this);
    this.show_shareable_link_dialog = this.show_shareable_link_dialog.bind(this);
    this.set_ontology_from_dataset_if_possible = this.set_ontology_from_dataset_if_possible.bind(this);
    this.build_sparql_form = this.build_sparql_form.bind(this);
    this.spo_query__update = this.spo_query__update.bind(this);
    this.endpoint_labels__autocompleteselect = this.endpoint_labels__autocompleteselect.bind(this);
    this.endpoint_labels__update = this.endpoint_labels__update.bind(this);
    this.endpoint_labels__focusout = this.endpoint_labels__focusout.bind(this);
    this.sparqlGraphSelector_onchange = this.sparqlGraphSelector_onchange.bind(this);
    this.animate_endpoint_label_typing = this.animate_endpoint_label_typing.bind(this);
    this.animate_endpoint_label_search = this.animate_endpoint_label_search.bind(this);
    this.search_sparql_by_label = this.search_sparql_by_label.bind(this);
    this.catch_reject_init_settings = this.catch_reject_init_settings.bind(this);
    this.complete_construction = this.complete_construction.bind(this);
    this.blurt = this.blurt.bind(this);
    this.close_blurt_box = this.close_blurt_box.bind(this);
    this.fullscreen = this.fullscreen.bind(this);
    this.collapse_tabs = this.collapse_tabs.bind(this);
    this.expand_tabs = this.expand_tabs.bind(this);
    this.init_settings_to_defaults = this.init_settings_to_defaults.bind(this);
    this.update_settings_cursor = this.update_settings_cursor.bind(this);
    this.update_graph_settings = this.update_graph_settings.bind(this);
    this.change_graph_settings = this.change_graph_settings.bind(this);
    this.change_setting_to_from = this.change_setting_to_from.bind(this);
    this.on_change_reset_settings_to_default = this.on_change_reset_settings_to_default.bind(this);
    this.pfm_dashboard = this.pfm_dashboard.bind(this);
    this.build_pfm_live_monitor = this.build_pfm_live_monitor.bind(this);
    this.pfm_count = this.pfm_count.bind(this);
    this.pfm_update = this.pfm_update.bind(this);
    this.parseAndShowFile = this.parseAndShowFile.bind(this);
    this.receive_quaff_lod = this.receive_quaff_lod.bind(this);
    this.oldToUniqueTabSel = {};
    //if @show_performance_monitor is true
    //  @pfm_dashboard()
    this.git_commit_hash = window.HUVIZ_GIT_COMMIT_HASH;
    this.args = this.calculate_args(incoming_args);
    this.ensureTopElem();
    if (this.args.create_tabs_adjacent_to_selector) {
      this.create_tabs();
    }
    this.tabsJQElem = $('#' + this.tabs_id);
    if (!this.args.show_tabs) {
      this.collapse_tabs();
    }
    this.replace_human_term_spans(this.tabs_id);
    if (this.args.add_to_HVZ) {
      if ((window.HVZ == null)) {
        window.HVZ = [];
      }
      window.HVZ.push(this);
    }

    // FIXME Simplify this whole settings_sel and 'settings' thing
    //       The settings should just be built right on settings_JQElem
    if (this.args.settings_sel == null) { this.args.settings_sel = this.oldToUniqueTabSel['settings']; }

    this.create_blurtbox();
    this.ensure_divs();
    this.make_JQElems();
    this.create_collapse_expand_handles();
    if (!this.args.hide_fullscreen_button) {
      this.create_fullscreen_handle();
    }
    this.init_ontology();
    this.create_caption();
    this.off_center = false; // FIXME expose this or make the amount a slider
    document.addEventListener('nextsubject', this.onnextsubject);
    //@init_snippet_box()  # FIXME not sure this does much useful anymore
    this.mousedown_point = false;
    this.discard_point = [this.cx,this.cy]; // FIXME refactor so ctrl_handle handles this
    this.lariat_center = [this.cx,this.cy]; //       and this....
    this.node_radius_policy = node_radius_policies[default_node_radius_policy];
    this.currently_printed_snippets = {};
    //@fill = d3.scale.category20()
    // Examples:
    //   d3-force testing ground (v4)
    //     https://bl.ocks.org/steveharoz/8c3e2524079a8c440df60c1ab72b5d03
    //   Force Simulation (v4)
    //     https://bl.ocks.org/HarryStevens/f636199a46fc4b210fbca3b1dc4ef372
    this.initialize_d3_force_simulation();
    this.update_fisheye();
    this.initialize_svg();
    this.container = d3.select(this.args.viscanvas_sel).node().parentNode;
    this.init_settings_to_defaults().then(this.complete_construction).catch(this.catch_reject_init_settings);
  }

  initialize_svg() {
    this.svg = d3.select(this.args.vissvg_sel).
              append("svg").
              attr("width", this.width).
              attr("height", this.height).
              attr("position", "absolute");
    this.svg.append("rect").attr("width", this.width).attr("height", this.height);
  }

  initialize_d3_force_simulation() {
    this.d3simulation = d3.forceSimulation();
    //@force = @d3simulation.force('link')
    console.info("must implement d3v4 linkDistance, charge, size and gravity");
    console.warn('https://github.com/d3/d3/blob/master/CHANGES.md#forces-d3-force');
    // https://github.com/d3/d3-force/blob/v1.2.1/README.md#_force
    this.d3simulation.nodes([]).on('tick',this.tick);
  }

  sim_restart() {
    console.debug('d3simulation.restart()');
    this.d3simulation.restart();
  }

  catch_reject_init_settings(wha) {
    console.error(wha);
  }

  prepare_viscanvas() {
    this.viscanvas = d3.select(this.args.viscanvas_sel).html("").
      append("canvas").
      attr("width", this.width).
      attr("height", this.height);
    this.make_JQElem('viscanvas', this.args.viscanvas_sel); // --> @viscanvas_JQElem
    this.viscanvas_elem = document.querySelector(this.args.viscanvas_sel);
    this.canvas = this.viscanvas_elem.querySelector('canvas');
    return this.viscanvas;
  }

  complete_construction(setting_resolutions) {
    //console.warn(setting_resolutions)
    this.adjust_settings_from_kv_list(this.args.settings);
    if (this.use_fancy_cursor) {
      this.install_update_pointer_togglers();
    }
    this.create_state_msg_box();
    this.mouse_receiver = this.prepare_viscanvas();
    this.reset_graph();
    this.updateWindow();
    this.ctx = this.canvas.getContext("2d");
    this.mouse_receiver
      .on("mousemove", this.mousemove)
      .on("mousedown", this.mousedown)
      .on("mouseup", this.mouseup)
      .on("contextmenu", this.mouseright);
      //.on("mouseout", @mouseup) # FIXME what *should* happen on mouseout?
    this.restart();
    this.set_search_regex("");
    window.addEventListener("resize", this.updateWindow);
    this.tabsJQElem.on("resize", this.updateWindow);
    $(this.viscanvas).bind("_splitpaneparentresize", this.updateWindow);
    this.tabsJQElem.tabs({active: 0});
    this.maybe_start_with_search_node();
    this.maybe_demo_round_img();
  }

  maybe_start_with_search_node() {
    if (this.start_with_search_node) {
      setTimeout(() => {
        this.collapse_tabs;
        this.change_setting_to_from('display_labels_as', 'boxNGs');
        this.change_setting_to_from('show_class_instance_edges', true);
        this.make_search_node();
      });
    }
  }

  maybe_demo_round_img() {
    if (!(this.args.demo_round_img)) {
      return;
    }
    try {
      const roundImage = this.get_or_create_round_img(this.args.demo_round_img);
      roundImage.id = this.unique_id('sample_round_img_');
      this.tabsJQElem.append(roundImage);
      $('#'+roundImage.id).attr("style","background-color:black");
    } catch (e) {
      console.warn("url:", this.args.demo_round_img);
      console.debug(e);
    }
  }

  add_search_node_quads() {
    return this.add_quad({
      s: '_:search_node',
      p: RDFS_label,
      o: {
        type: RDF_literal,
        value: 'Search Node'
      }
    });
    return this.add_quad({
      s: '_:search_node',
      p: RDF_type,
      o: OWL_Thing
    });
  }

  make_search_node() {
    // add search node
    this.add_search_node_quads();
    const search_node = this.all_set[0];
    // activate node
    return this.choose(search_node, () => {
      this.label(search_node);
      return this.set_boxNG_editability(search_node, true);
    });
  }

  create_blurtbox() {
    const blurtbox_id = this.unique_id('blurtbox_');
    const tabsElem = document.querySelector('#'+this.tabs_id);
    const html = `<div id="${blurtbox_id}" class="blurtbox"></div>`;
    this.blurtbox_JQElem = $(this.insertBeforeEnd(tabsElem, html));
  }

  blurt(str, type, noButton) {
    //css styles for messages: info (blue), alert (yellow), error (red)
    // TODO There is currently no way for users to remove blurt boxes

    //type='info' if !type
    let label;
    if (type === "info") { label = "<h3>Message</h3>"; }
    if (type === "alert") { label = "<h3>Alert</h3>"; }
    if (type === "error") { label = "<h3>Error</h3>"; }
    if (!type) { label = ''; }
    this.blurtbox_JQElem.append(`<div class='blurt ${type}'>${label}${str}<br class='clear'></div>`);
    this.blurtbox_JQElem.scrollTop(10000);
    if (!noButton && !this.close_blurtbox_button) {
      this.close_blurtbox_button = this.blurtbox_JQElem.prepend("<button id='blurt_close' class='sml_bttn' type='button'>close</button>");
      this.close_blurtbox_button.on('click', this.close_blurt_box);
    }
  }

  close_blurt_box() {
    delete this.close_blurtbox_button;
    this.blurtbox_JQElem.html('');
  }

  //#### ------------------- fullscreen stuff ---------------- ########
  create_fullscreen_handle() {
    const fs = "<div class=\"full_screen\" style=\"position:absolute;z-index:999\"><i class=\"fa fa-arrows-alt\"></i></div>";
    this.topJQElem.prepend(fs);
    this.fullscreenJQElem = this.topJQElem.find(".full_screen");
    this.fullscreenJQElem.click(this.fullscreen);
  }

  fullscreen() {
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/exitFullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.topElem.requestFullscreen();
    }
  }

  //#### ------------------- collapse/expand stuff ---------------- ########

  collapse_tabs() {
    this.tabsJQElem.prop('style','visibility:hidden;width:0');
    this.tabsJQElem.find('.expand_cntrl').prop('style','visibility:visible');
    this.tabsJQElem.find('.the-tabs').prop('style','display:none');
    this.tabsJQElem.find('.tabs-intro').prop('style','display:none');
    //@expandCtrlJQElem.show() # why does this not work instead of the above?
  }

  expand_tabs() {
    this.tabsJQElem.prop('style','visibility:visible');
    //@tabsJQElem.find('.expand_cntrl').prop('style','visibility:hidden')
    this.tabsJQElem.find('.the-tabs').prop('style','display:inherit');
    this.tabsJQElem.find('.tabs-intro').prop('style','display:inherit');
    this.expandCtrlJQElem.hide();
    this.collapseCtrlJQElem.show();
  }

  create_collapse_expand_handles() {
    const ctrl_handle_id = sel_to_id(this.args.ctrl_handle_sel);
    const html = `\
<div class="expand_cntrl" style="visibility:hidden">
<i class="fa fa-angle-double-left"></i></div>
<div class="collapse_cntrl">
<i class="fa fa-angle-double-right"></i></div>
<div id="${ctrl_handle_id}"
   class="ctrl_handle ui-resizable-handle ui-resizable-w">
 <div class="ctrl_handle_grip">o</div>
</div>\
`; // """ this comment is to help emacs coffeescript mode
    this.tabsJQElem.prepend(html);
    this.expandCtrlJQElem = this.tabsJQElem.find(".expand_cntrl");
    this.expandCtrlJQElem.click(this.expand_tabs).on("click", this.updateWindow);
    this.collapseCtrlJQElem = this.tabsJQElem.find(".collapse_cntrl");
    this.collapseCtrlJQElem.click(this.collapse_tabs).on("click", this.updateWindow);
    this.tabsJQElem.resizable({
        handles: {'w':this.args.ctrl_handle_sel},
        minWidth: this.args.tabs_minWidth
    });
  }

  //### ---------------------  Utilities ---------------------------- #######

  goto_tab(tab_id) {
    const tab_idx = this.tab_id_to_idx[tab_id];
    if ((tab_idx == null)) {
      console.error(`goto_tab(${tab_id}) found no value in @tab_id_to_idx:`, this.tab_id_to_idx);
      return;
    }
    this.tabsJQElem.tabs({
      active: tab_idx,
      collapsible: true});
  }

  update_fisheye() {
    //@label_show_range = @link_distance * 1.1
    this.label_show_range = 30 * 1.1; //TODO Fixed value or variable like original? (above)
    //@fisheye_radius = @label_show_range * 5
    this.focus_radius = this.label_show_range;
    this.fisheye = d3.fisheye.
      circular().
      radius(this.fisheye_radius).
      distortion(this.fisheye_zoom);
    //@d3simulation.linkDistance(@link_distance).gravity(@gravity)
    console.warn("must implement d3v4 linkDistance and gravity");
    // https://stackoverflow.com/questions/16567750/does-d3-js-force-layout-allow-dynamic-linkdistance
    if (!this.args.skip_log_tick) {
      console.log("Tick in @force.linkDistance... update_fisheye");
    }
  }

  replace_human_term_spans(optional_class) {
    optional_class = optional_class || 'a_human_term';
    //if console and console.info
    //  console.info("doing addClass('#{optional_class}') on all occurrences of CSS class human_term__*")
    for (let canonical in this.human_term) {
      const human = this.human_term[canonical];
      const selector = '.human_term__' + canonical;
      //console.log("replacing '#{canonical}' with '#{human}' in #{selector}")
      $(selector).text(human).addClass(optional_class);
    } //.style('color','red')
  }

  auto_adjust_settings() {
    // Try to tune the gravity, charge and link length to suit the data and the canvas size.
    return this;
  }

  make_settings_group(groupName) {
    return this.insertBeforeEnd(
        this.settingGroupsContainerElem,
        `<h1>${groupName}</h1><div class="settingsGroup"></div>`);
  }

  get_or_create_settings_group(groupName) {
    const groupId = synthIdFor(groupName);
    if (this.settings_groups == null) { this.settings_groups = {}; }
    let group = this.settings_groups[groupName];
    if (!group) {
      this.settings_groups[groupName] = (group = this.make_settings_group(groupName));
    }
    return group;
  }

  init_settings_to_defaults() {
    // TODO rebuild this method without D3 using @settingsElem
    const elemPromises = [];
    this.settingsElem = document.querySelector(this.args.settings_sel);
    const settings_input_sel = this.args.settings_sel + ' input';
    this.settings_cursor = new TextCursor(settings_input_sel, "");
    if (this.settings_cursor) {
      $(settings_input_sel).on("mouseover", this.update_settings_cursor);
    }
    this.settings = d3.select(this.settingsElem);
    this.settings.classed('settings',true);
    this.settingGroupsContainerElem = this.insertBeforeEnd(this.settingsElem, '<div class="settingGroupsContainer"></div>');
    for (let control_spec of this.default_settings) {
      for (var control_name in control_spec) {
        // reset the values which will be used to initialize the setting input the user sees
        const control = control_spec[control_name];
        var initial_old_val = null;
        var initial_new_val = null;
        const inputId = unique_id(control_name+'_');
        const groupName = control.group || 'General';
        const groupElem = this.get_or_create_settings_group(groupName);
        const controlElem = this.insertBeforeEnd(groupElem, `<div class="a_setting ${control_name}__setting"></div>`);
        const labelElem = this.insertBeforeEnd(controlElem, `<label for="${inputId}"></label>`);
        if (control.text != null) {
          labelElem.innerHTML = control.text;
        }
        if (control.html_text != null) {
          labelElem.innerHTML = control.html_text;
        }
        if (control.style != null) {
          controlElem.setAttribute('style', control.style);
        }
        if (control.class != null) {
          controlElem.classList.add(control.class);
        }
        if (control.input != null) {
          var inputElem;
          if (control.input.type === 'select') {
            inputElem = this.insertBeforeEnd(controlElem, "<select></select>");
            for (let optIdx in control.options) {
              const opt = control.options[optIdx];
              const optionElem = this.insertBeforeEnd(inputElem, `<option value="${opt.value}"></option>`);
              if (initial_new_val == null) { initial_new_val = opt.value; } // default to the first option in case none is selected
              if (opt.selected) {
                optionElem.setAttribute('selected','selected');
                initial_new_val = opt.value;
              }
              if (opt.label != null) {
                optionElem.innerHTML = opt.label;
              }
            }
          } else if (control.input.type === 'button') {
            inputElem = this.insertBeforeEnd(controlElem, "<button type=\"button\">(should set label)</button>");
            if (control.input.label != null) {
              inputElem.innerHTML = control.input.label;
            }
            if (control.input.style != null) {
              inputElem.setAttribute('style', control.input.style);
            }
          } else {
            inputElem = this.insertBeforeEnd(controlElem, `<input name="${control_name}"></input>`);
            let WidgetClass = null;
            for (let k in control.input) {
              const v = control.input[k];
              if (k === 'jsWidgetClass') {
                WidgetClass = v;
                continue;
              }
              if (k === 'value') {
                initial_old_val = this[control_name];
                initial_new_val = v;
              }
              inputElem.setAttribute(k, v);
            }
            if (WidgetClass) {
              this[control_name + '__widget'] = new WidgetClass(this, inputElem);
            }
            if (control.input.type === 'checkbox') {
              initial_new_val = !(control.input.checked == null);
            }
          }
            // TODO replace control.event_type with autodetecting on_change_ vs on_update_ method existence
          inputElem.setAttribute('id', inputId);
          inputElem.setAttribute('name', control_name);

          let { event_type } = control;
          if (!event_type) {
            if (['checkbox','range','radio'].includes(control.input.type)) {
              event_type = 'input';
            } else {
              event_type = 'change';
            }
          }

          if (event_type === 'change') {
            // These controls only update when enter is pressed or the focus changes.
            // Good for things like text fields which might not make sense until the user is 'done'.
            //input.on("change", @update_graph_settings)
            inputElem.addEventListener('change', this.change_graph_settings);
          } else {
            // These controls get continuously updated.
            // Good for range sliders, radiobuttons and checkboxes.
            // This can be forced by setting the .event_type on the control_spec explicitly.
            //input.on("input", @update_graph_settings) # continuous updates
            inputElem.addEventListener('input', this.update_graph_settings);
          }
          if (control.input.type === 'button') {
            inputElem.addEventListener('click', this.update_graph_settings);
            continue; // because buttons do not need any updating
          }

          const execInitElem = (resolve, reject) => {
            try {
              this.change_setting_to_from(control_name, initial_new_val, initial_old_val);
              return resolve(control_name);
            } catch (e) {
              return reject(e);
            }
          };
          elemPromises.push(new Promise(execInitElem));
        } else {
          console.info(control_name + " has no input");
        }
        if (control.label.title != null) {
          this.insertBeforeEnd(controlElem, '<div class="setting_explanation">' + control.label.title + '</div>');
        }
      }
    }
    //$(@settingGroupsContainerElem).accordion()
    //@insertBeforeEnd(@settingsElem, """<div class="buffer_space"></div>""")
    return Promise.all(elemPromises);
  }

  update_settings_cursor(evt) {
    const cursor_text = (evt.target.value).toString();
    if (!cursor_text) {
      console.debug(cursor_text);
    } else {
      console.log(cursor_text);
    }
    this.settings_cursor.set_text(cursor_text);
  }

  update_graph_settings(event) {
    this.change_graph_settings(event, true);
  }

  change_graph_settings(event, update) {
    let cooked_value;
    const {
      target
    } = event;
    if (update == null) { update = false; }
    if (target.type === "checkbox") {
      cooked_value = target.checked;
    } else if (target.type === "range") { // must massage into something useful
      const asNum = parseFloat(target.value);
      cooked_value = ((('' + asNum) !== 'NaN') && asNum) || target.value;
    } else {
      cooked_value = target.value;
    }
    const old_value = this[target.name];
    this.change_setting_to_from(target.name, cooked_value, old_value);
    //d3.select(target).attr("title", cooked_value)
    if (update) {  // TODO be more discriminating, not all settings require update
               //   ones that do: charge, gravity, fisheye_zoom, fisheye_radius
      this.update_fisheye();
      this.updateWindow();
    }
    this.tick("Tick in update_graph_settings");
  }

  // ## Settings ##
  //
  // ### Nomenclature ###
  //
  // * changing a setting changes the property on the Huviz instance (but not the input)
  // * adjusting a setting alters the input in the settings tab then changes it too
  // * on_change_<setting_name> methods, if they exist, are called continuously upon INPUT changes

  adjust_settings_from_list_of_specs(setting_specs) {
    for (let setting_spec of setting_specs) {
      for (let setting_name in setting_spec) {
        const control = setting_spec[setting_name];
        let value = null;
        if (control.input != null) {
          if (control.input.value != null) {
            ({
              value
            } = control.input);
          }
          if (control.input.type === 'button') {
            //console.info("#{setting_name} is a button, so skipping")
            continue;
          }
          if (control.input.type === 'checkbox') {
            if (control.input.checked) {
              value = true;
            } else {
              value = false;
            }
          }
          if (control.input.type === 'select') {
            for (let option of control.options) {
              if (option.selected) {
                ({
                  value
                } = option);
              }
            }
          }
                // TODO support select where more than one option is selected
          if (control.input.type === 'text') {
            value = control.input.value || ''; // otherwise no adjustment happens
          }
        } else {
          continue; // skip settings without an input (eg *_preamble)
        }
        if (value != null) {
          this.adjust_setting_if_needed(setting_name, value);
        } else {
          console.info(`${setting_name} not handled by adjust_settings_from_list_of_specs()`);
          console.info("  default_value:",this.get_setting_input_JQElem(setting_name).val());
        }
      }
    }
  }

  adjust_settings_from_kv_list(kv_list) {
    for (let setting in kv_list) {
      const value = kv_list[setting];
      this.adjust_setting(setting, value);
    }
  }

  adjust_setting_if_needed(setting_name, new_value, skip_custom_handler) {
    let old_value;
    const input = this.get_setting_input_JQElem(setting_name);
    const theType = input.attr('type');
    if (['checkbox', 'radiobutton'].includes(theType)) {
      old_value = input.prop('checked');
    } else {
      old_value = input.val();
    }
    const equality = `because old_value: (${old_value}) new_value: (${new_value})`;
    if ((""+old_value) === (""+new_value)) { // compare on string value because that is what inputs return
      //console.warn("  no change required "+equality)
      return; // bail because no change is needed
    }
    //pretty_value = typeof value is 'string' and "'#{value}'" or value
    console.log(`change_setting_if_needed('${setting_name}', ${new_value})`);
    console.info("  change required "+equality);
    return this.adjust_setting(input, new_value, old_value, skip_custom_handler);
  }

  change_setting_to_from(setting_name, new_value, old_value, skip_custom_handler) {
    skip_custom_handler = ((skip_custom_handler != null) && skip_custom_handler) || false;
    // TODO replace control.event_type with autodetecting on_change_ vs on_update_ method existence
    const custom_handler_name = "on_change_" + setting_name;
    const custom_handler = this[custom_handler_name];
    if (this.settings_cursor) {
      if (new_value != null) {
        const cursor_text = (new_value).toString();
        this.settings_cursor.set_text(cursor_text);
      }
    }
    if ((custom_handler != null) && !skip_custom_handler) {
      return custom_handler.apply(this, [new_value, old_value]);
    } else {
      return this[setting_name] = new_value;
    }
  }

  adjust_settings_from_defaults() {
    return this.adjust_settings_from_list_of_specs(this.default_settings);
  }

  on_change_distanceMax(val) {
    if (val === 1) {
      this.distanceMax = Infinity;
    } else {
      this.distanceMax = val * this.graph_region_radius;
    }
    this.update_d3forceManyBody();
    if (this.d3forceManyBody != null) {
      this.d3simulation_shake();
    }
  }

  on_change_reset_settings_to_default(event) {
    console.group('reset_settings_to_default()...');
    this.adjust_settings_from_defaults();
    this.adjust_settings_from_kv_list(this.args.settings);
    console.groupEnd();
  }

  on_change_use_fancy_cursor(new_val, old_val) {
    this.use_fancy_cursor = !!new_val;
    if (this.use_fancy_cursor && !this.text_cursor) { // initialize the text_cursor
      this.text_cursor = new TextCursor(this.args.viscanvas_sel, "");
    }
  }

  // on_change handlers for the various settings which need them
  on_change_use_accordion_for_settings(new_val, old_val) {
    if (new_val) {
      // TODO replace this delay with a promise
      const doit = () => $(this.settingGroupsContainerElem).accordion();
      setTimeout(doit, 200);
    } else {
      console.warn('We do not yet have a solution for turning OFF the Accordion');
    }
  }

  on_change_nodes_pinnable(new_val, old_val) {
    if (!new_val) {
      if (this.graphed_set) {
        for (let node of this.graphed_set) {
          node.fixed = false;
        }
      }
    }
  }

  on_change_show_hunt_verb(new_val, old_val) {
    if (new_val) {
      const vset = {hunt: this.human_term.hunt};
      this.gclui.verb_sets.push(vset);
      this.gclui.add_verb_set(vset);
    }
  }

  on_change_show_cosmetic_tabs(new_val, old_val) {
    if ((this.tab_for_tabs_sparqlQueries_JQElem == null)) {
      // Keep calling this same method until tabs-sparqlQueries has been found
      setTimeout((() => this.on_change_show_cosmetic_tabs(new_val, old_val)), 50);
      return;
    }
    // Showing the queries tab is a power-user thing so we hide boring tabs for convenience.
    if (new_val) {
      if (this.tab_for_tabs_credit_JQElem != null) {
        this.tab_for_tabs_credit_JQElem.show();
      }
      if (this.tab_for_tabs_intro_JQElem != null) {
        this.tab_for_tabs_intro_JQElem.show();
      }
    } else {
      if (this.tab_for_tabs_credit_JQElem != null) {
        this.tab_for_tabs_credit_JQElem.hide();
      }
      if (this.tab_for_tabs_intro_JQElem != null) {
        this.tab_for_tabs_intro_JQElem.hide();
      }
    }
  }

  on_change_show_queries_tab(new_val, old_val) {
    if ((this.tab_for_tabs_sparqlQueries_JQElem == null)) {
      // Keep calling this same method until tabs-sparqlQueries has been found
      setTimeout((() => this.on_change_show_queries_tab(new_val, old_val)), 50);
      return;
    }
    // Showing the queries tab is a power-user thing so we hide boring tabs for convenience.
    if (new_val) {
      this.tab_for_tabs_sparqlQueries_JQElem.show();
    } else {
      this.tab_for_tabs_sparqlQueries_JQElem.hide();
    }
  }

  on_change_show_dangerous_datasets(new_val, old_val) {
    if (new_val) {
      $('option.dangerous').show();
      $('option.dangerous').text(function(idx, text) {
        const append = ' (!)';
        if (!text.match(/\(\!\)$/)) {
          return text + append;
        }
        return text;
      });
    } else {
      $('option.dangerous').hide();
    }
  }

  on_change_display_labels_as(new_val, old_val) {
    let boxes_change_settings;
    this.display_labels_as = new_val;
    if (new_val != null) {
      if (new_val.includes('boxNGs')) {
        this.viscanvas_JQElem.addClass('boxNGs');
      }
      if (new_val.includes('noBoxes')) {
        this.viscanvas_JQElem.addClass('noBoxes');
      }
    } else {
      this.viscanvas_JQElem.removeClass('boxNGs');
      this.viscanvas_JQElem.removeClass('noBoxes');
    }
    if (boxes_change_settings = false) {
      if (['pills', 'boxNGs'].includes(new_val)) {
        this.adjust_setting('charge', -3000);
        this.adjust_setting('link_distance', 200);
      } else {
        this.adjust_setting('charge', -210); // TODO use prior value or default value
        this.adjust_setting('link_distance', 29); // TODO use prior value or default value
      }
    }
    this.updateWindow();
  }

  on_change_theme_colors(new_val) {
    if (new_val) {
      this.renderStyles = themeStyles.dark;
      //$("body").removeClass themeStyles.light.themeName
      this.topElem.classList.remove(themeStyles.light.themeName);
    } else {
      this.renderStyles = themeStyles.light;
      //$("body").removeClass themeStyles.dark.themeName
      this.topElem.classList.remove(themeStyles.light.themeName);
    }
    //@update_graph_settings()
    //$("body").css "background-color", this.renderStyles.pageBg
    //$("body").addClass this.renderStyles.themeName
    this.topElem.style.backgroundColor = this.renderStyles.pageBg;
    this.topElem.classList.add(this.renderStyles.themeName);
    this.updateWindow();
  }

  on_change_paint_label_dropshadows(new_val) {
    if (new_val) {
      this.paint_label_dropshadows = true;
    } else {
      this.paint_label_dropshadows = false;
    }
    return this.updateWindow();
  }

  on_change_display_shelf_clockwise(new_val) {
    if (new_val) {
      this.display_shelf_clockwise = true;
    } else {
      this.display_shelf_clockwise = false;
    }
    this.updateWindow();
  }

  on_change_choose_node_display_angle(new_val) {
    this.nodeOrderAngle = new_val;
    this.updateWindow();
  }

  on_change_shelf_radius(new_val, old_val) {
    this.change_setting_to_from('shelf_radius', new_val, old_val, true);
    this.update_graph_radius();
    this.updateWindow();
  }

  on_change_truncate_labels_to(new_val, old_val) {
    this.change_setting_to_from('truncate_labels_to', new_val, old_val, true);
    if (this.all_set) {
      for (let node of this.all_set) {
        this.unscroll_pretty_name(node);
      }
    }
    this.updateWindow();
  }

  on_change_graph_title_style(new_val, old_val) {
    if (new_val === "custom") {
      this.topJQElem.find(".main_title").removeAttr("style");
      this.topJQElem.find(".sub_title").removeAttr("style");
      this.topJQElem.find(".graph_custom_main_title__setting").css('display', 'inherit');
      this.topJQElem.find(".graph_custom_sub_title__setting").css('display', 'inherit');
      const custTitle = this.topJQElem.find("input[name='graph_custom_main_title']");
      const custSubTitle = this.topJQElem.find("input[name='graph_custom_sub_title']");
      this.update_caption(custTitle[0].title, custSubTitle[0].title);
      this.topJQElem.find("a.git_commit_hash_watermark").css('display', 'none');
      this.ontology_watermark_JQElem.attr('style', '');
    } else if (new_val === "bold1") {
      this.ontology_watermark_JQElem.css('display', 'none');
    } else {
      this.topJQElem.find(".graph_custom_main_title__setting").css('display', 'none');
      this.topJQElem.find(".graph_custom_sub_title__setting").css('display', 'none');
      this.topJQElem.find("a.git_commit_hash_watermark").css('display', 'inherit');
      this.ontology_watermark_JQElem.attr('style', '');
      this.update_caption(this.data_uri, this.onto_uri);
    }
    this.dataset_watermark_JQElem.removeClass().addClass(`dataset_watermark ${new_val}`);
    this.ontology_watermark_JQElem.removeClass().addClass(`ontology_watermark ${new_val}`);
  }

  on_change_graph_custom_main_title(new_val) {
    // if new custom values then update titles
    this.dataset_watermark_JQElem.text(new_val);
  }

  on_change_graph_custom_sub_title(new_val) {
    this.ontology_watermark_JQElem.text(new_val);
  }

  // TODO use make_markdown_dialog() instead of alert()
  on_change_language_path(new_val, old_val) {
    try {
      MultiString.set_langpath(new_val);
    } catch (e) {
      alert(`Input: ${new_val}\n${e.toString()}\n\n  The 'Language Path' should be a colon-separated list of ISO two-letter language codes, such as 'en' or 'fr:en:es'.  One can also include the keywords ANY, NOLANG or ALL in the list.\n  'ANY' means show a value from no particular language and works well in situations where you don't know or care which language is presented.\n  'NOLANG' means show a value for which no language was specified.\n  'ALL' causes all the different language versions to be revealed. It is best used alone\n\nExamples (show first available, so order matters)\n  en:fr\n    show english or french or nothing\n  en:ANY:NOLANG\n    show english or ANY other language or language-less label\n  ALL\n    show all versions available, language-less last`);
      this.change_setting_to_from('language_path', old_val, old_val);
      return;
    }
    if (this.shelved_set) {
      this.shelved_set.resort();
      this.discarded_set.resort();
    }
    this.update_labels_on_pickers();
    if (this.gclui != null) {
      this.gclui.resort_pickers();
    }
    if (this.ctx != null) {
      this.tick("Tick in on_change_language_path");
    }
  }

  on_change_color_nodes_as_pies(new_val, old_val) {  // TODO why this == window ??
    this.color_nodes_as_pies = new_val;
    this.recolor_nodes();
  }

  on_change_show_hide_endpoint_loading(new_val, old_val) {
    let endpoint;
    if (this.endpoint_loader) {
      endpoint = "#" + this.endpoint_loader.uniq_id;
    }
    if (new_val && endpoint) {
      $(endpoint).css('display','block');
    } else {
      $(endpoint).css('display','none');
    }
  }

  on_change_show_performance_monitor(new_val, old_val) {
    //console.log("clicked performance monitor " + new_val + " " + old_val)
    if (new_val) {
      this.performance_dashboard_JQElem.css('display','block');
      this.show_performance_monitor = true;
      this.pfm_dashboard();
      this.timerId = setInterval(this.pfm_update, 1000);
    } else {
      clearInterval(this.timerId);
      this.performance_dashboard_JQElem.css('display','none').html('');
      this.show_performance_monitor = false;
    }
  }

  on_change_discover_geonames_remaining(new_val, old_val) {
    this.discover_geonames_remaining = parseInt(new_val,10);
    this.discover_names_including('geonames.org');
  }

  on_change_discover_geonames_as(new_val, old_val) {
    if ((this.discover_geonames_as__widget == null)) { // Try later if not ready
      setTimeout((() => this.on_change_discover_geonames_as(new_val, old_val)), 50);
      return;
    }
    this.discover_geonames_as = new_val;
    if (new_val) {
      this.discover_geonames_as__widget.set_state('untried');
      this.discover_names_including('geonames.org');
    } else {
      if (this.discover_geonames_as__widget) {
        this.discover_geonames_as__widget.set_state('empty');
      }
    }
  }

  on_change_center_the_distinguished_node(new_val, old_val) {
    this.center_the_distinguished_node = new_val;
    this.tick();
  }

  on_change_arrows_chosen(new_val, old_val) {
    this.arrows_chosen = new_val;
    this.tick();
  }

  init_from_settings() {
    // alert "init_from_settings() is deprecated"
    // Perform update_graph_settings for everything in the form
    // so the HTML can be used as configuration file
    for (let elem of $(".settings input")) { // so we can modify them in a loop
      this.update_graph_settings(elem, false);
    }
  }

  after_file_loaded(uri, callback) {
    this.call_on_dataset_loaded(uri);
    if (callback) {
      callback();
    }
  }

  show_node_pred_edge_stats() {
    const pred_count = 0;
    const edge_count = 0;
    const s = `nodes:${this.nodes.length} predicates:${pred_count} edges:${edge_count}`;
    console.log(s);
  }

  call_on_dataset_loaded(uri) {
    this.gclui.on_dataset_loaded({uri});
  }

  XXX_load_file() {
    this.load_data_with_onto(this.get_dataset_uri());
  }

  load_data_with_onto(data, onto, callback) {  // Used for loading files from menu
    // data and onto are expected to have .value containing an url; full, relative or filename
    // regardless the .value is a key into the datasetDB
    this.data_uri = data.value;
    this.set_ontology(onto.value);
    this.onto_uri = onto.value;
    if (this.args.display_reset) {
      $("#reset_btn").show();
    } else {
      //@disable_data_set_selector()
      this.disable_dataset_ontology_loader(data, onto);
    }
    this.show_state_msg(this.data_uri);
    if (!this.G.subjects) {
      this.fetchAndShow(this.data_uri, callback);
    }
  }

  disable_data_set_selector() {
    $("[name=data_set]").prop('disabled', true);
    $("#reload_btn").show();
  }

  XXX_read_data_and_show(filename, data) { //Handles drag-and-dropped files
    // REVIEW is this no longer used?
    let the_parser;
    data = this.local_file_data;
    //console.log(data)
    if (filename.match(/.ttl$/)) {
      the_parser = this.parseAndShowTTLData;
    } else if (filename.match(/.nq$/)) {
      the_parser = this.parse_and_show_NQ_file;
    } else {
      alert(`Unknown file format. Unable to parse '${filename}'. Only .ttl and .nq files supported.`);
      return;
    }
    the_parser(data);
    //@local_file_data = "" #RESET the file data
    //@disable_data_set_selector()
    this.disable_dataset_ontology_loader();
    //@show_state_msg("loading...")
    //@show_state_msg filename
  }

  get_dataset_uri() {
    // FIXME goodbye jquery
    return $("select.file_picker option:selected").val();
  }

  run_script_from_hash() {
    const script = this.get_script_from_hash();
    if (script != null) {
      this.gclui.run_script(script);
    }
  }

  get_script_from_hash() {
    let script = location.hash;
    script = (((script == null) || (script === "#")) && "") || script.replace(/^#/,"");
    script = script.replace(/\+/g," ");
    if (script) {
      colorlog("get_script_from_hash() script: "+script);
    }
    return script;
  }

  adjust_menus_from_load_cmd(cmd) {
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

  load_script_from_JSON(json) {
    //alert('load_script_from_JSON')
    let saul_goodman = false;
    for (let cmdArgs of json) {
      if (cmdArgs.verbs.includes('load')) {
        saul_goodman = this.adjust_menus_from_load_cmd(cmdArgs);
      } else {
        this.gclui.push_cmdArgs_onto_future(cmdArgs);
      }
    }
  }

  parse_script_file(data, fname) {
    // There are two file formats, both with the extension .txt
    //   1) * Commands as they appear in the Command History
    //      * Followed by the comment on a line of its own
    //      * Followed by the .json version of the script, for trivial parsing
    //   2) Commands as they appear in the Command History
    // The thinking is that, ultimately, version 1) will be required until the
    // parser for the textual version is complete.
    const lines = data.split('\n');
    while (lines.length) {
      const line = lines.shift();
      if (line.includes(this.json_script_marker)) {
        return JSON.parse(lines.join("\n"));
      }
    }
    return {};
  }

  boot_sequence(script) {
    // If we are passed an empty string that means there was an outer
    // script but there was nothing for us and DO NOT examine the hash for more.
    // If there is a script after the hash, run it.
    // Otherwise load the default dataset defined by the page.
    // Or load nothing if there is no default.
    this.reset_graph();
    if ((script == null)) {
      script = this.get_script_from_hash();
    }
    if ((script != null) && script.length) {
      console.log(`boot_sequence('${script}')`);
      this.gclui.run_script(script);
    } else {
      const data_uri = this.get_dataset_uri();
      if (data_uri) {
        this.load(data_uri);
      }
    }
  }

  load(data_uri, callback) {
    if (!this.G.subjects) { this.fetchAndShow(data_uri, callback); }
    if (this.use_webgl) {
      this.init_webgl();
    }
  }

  load_with(data_uri, ontology_uris) {
    this.goto_tab('commands'); // go to Commands tab # FIXME: should be symbolic not int indexed
    const basename = (uri) => { // the filename without the ext
      return uri.split('/').pop().split('.').shift();
    };
    const dataset = {
      label: basename(data_uri),
      value: data_uri
    };
    const ontology = {
      label: basename(ontology_uris[0]),
      value: ontology_uris[0]
    };
    this.visualize_dataset_using_ontology({}, dataset, [ontology]);
  }

  endpoint_loader_is_quiet() {
    // TODO Replace with a Promise-based way to ensure the loader is ready.
    // TODO Build it into PickOrProvide and use it in @load_with() too.
    return (this.endpoint_loader != null) && this.endpoint_loader.is_quiet(500);
  }

  query_from_seeking_limit(querySpec) {
    const {serverUrl, graphUrl, limit, subjectUrl} = querySpec;
    if (!this.endpoint_loader_is_quiet()) {
      setTimeout((() => this.query_from_seeking_limit(querySpec)), 50);
      //throw new Error("endpoint_loader not ready")
      return;
    }
    this.goto_tab('commands');
    if (serverUrl != null) {
      this.endpoint_loader.select_by_uri(serverUrl);
      this.sparql_graph_query_and_show__trigger(serverUrl);
      const finish_prep = () => {
        if (graphUrl != null) {
          this.sparqlQryInput_show();
          this.sparqlGraphSelector_JQElem.val(graphUrl);
        }
        if (limit != null) {
          this.endpoint_limit_JQElem.val(limit);
        }
        if (subjectUrl != null) {
          this.endpoint_labels_JQElem.val(subjectUrl);
        }
        return this.big_go_button_onclick_sparql();
      };
      this.sparql_graph_query_and_show_queryManager.when_done(finish_prep);
    }
  }

  // TODO: remove now that @get_or_create_node_by_id() sets type and name
  is_ready(node) {
    // Determine whether there is enough known about a node to make it visible
    // Does it have an .id and a .type and a .name?
    return (node.id != null) && (node.type != null) && (node.name != null);
  }

  assign_types(node, within) {
    const type_id = node.type; // FIXME one of type or taxon_id gotta go, bye 'type'
    if (type_id) {
      //console.log "assign_type",type_id,"to",node.id,"within",within,type_id
      this.get_or_create_taxon(type_id).register(node);
    } else {
      throw "there must be a .type before hatch can even be called:"+node.id+ " "+type_id;
    }
      //console.log "assign_types failed, missing .type on",node.id,"within",within,type_id
  }

  is_big_data() {
    if ((this.big_data_p == null)) {
      //if @nodes.length > 200
      if ((this.data_uri != null ? this.data_uri.match('poetesses|relations') : undefined)) {
        this.big_data_p = true;
      } else {
        this.big_data_p = false;
      }
    }
    return this.big_data_p;
  }

  get_default_set_by_type(node) {
    // see Orlando.get_default_set_by_type
    //console.log "get_default_set_by_type",node
    if (this.is_big_data()) {
      if (['writer'].includes(node.type)) {
        return this.shelved_set;
      } else {
        return this.hidden_set;
      }
    }
    return this.shelved_set;
  }

  get_default_set_by_type(node) {
    return this.shelved_set;
  }

  pfm_dashboard() {
    // Adding feedback monitor
    //   1. new instance in pfm_data (line 541)
    //   2. add @pfm_count('name') to method
    //   3. add #{@build_pfm_live_monitor('name')} into message below
    const warning = "";
    const message = `\
<div class='feedback_module'><p>Triples Added: <span id="noAddQuad">0</span></p></div>
<div class='feedback_module'><p>Number of Nodes: <span id="noN">0</span></p></div>
<div class='feedback_module'><p>Number of Edges: <span id="noE">0</span></p></div>
<div class='feedback_module'><p>Number of Predicates: <span id="noP">0</span></p></div>
<div class='feedback_module'><p>Number of Classes: <span id="noC">0</span></p></div>
<div class='feedback_module'><p>find_nearest... (msec): <span id="highwater_find_node_or_edge">0</span></p></div>
<div class='feedback_module'><p>maxtick (msec): <span id="highwater_maxtick">0</span></p></div>
<div class='feedback_module'><p>discover_name #: <span id="highwater_discover_name">0</span></p></div>
${this.build_pfm_live_monitor('add_quad')}
${this.build_pfm_live_monitor('hatch')}
<div class='feedback_module'><p>Ticks in Session: <span id="noTicks">0</span></p></div>
${this.build_pfm_live_monitor('tick')}
<div class='feedback_module'><p>Total SPARQL Requests: <span id="noSparql">0</span></p></div>
<div class='feedback_module'><p>Outstanding SPARQL Requests: <span id="noOR">0</span></p></div>
${this.build_pfm_live_monitor('sparql')}\
`;
    this.performance_dashboard_JQElem.html(message + warning);
  }

  build_pfm_live_monitor(name) {
    return `<div class='feedback_module'>${this.pfm_data[name].label}:
 <svg id='pfm_${name}' class='sparkline' width='200px' height='50px' stroke-width='1'></svg>
</div>`;
  }

  pfm_count(name) {
    // Incriment the global count for 'name' variable (then used to update live counters)
    this.pfm_data[name].total_count++;
  }

  pfm_update() {
    let noE, noN, noOR, noP;
    const time = Date.now();
    let class_count = 0;
    // update static markers
    if (this.nodes) {
      noN = this.nodes.length;
    } else {
      noN = 0;
    }
    $("#noN").html(`${noN}`);
    if (this.edge_count) { noE = this.edge_count; } else { noE = 0; }
    $("#noE").html(`${noE}`);
    for (let k in this.highwatermarks) {
      let v = this.highwatermarks[k];
      if (k.endsWith('__')) {
        continue;
      }
      const val = v;
      if (!Number.isInteger(v)) {
        v = v.toFixed(2);
      }
      $(`#highwater_${k}`).html(v);
    }
    //$("#fnnoe").html("#{(@find_node_or_edge_max or 0).toFixed(2)}")
    $("#maxtick").html(`${(this.maxtick || 0).toFixed(2)}`);
    if (this.predicate_set) { noP = this.predicate_set.length; } else { noP = 0; }
    $("#noP").html(`${noP}`);
    for (let item in this.taxonomy) { //TODO Should improve this by avoiding recount every second
      class_count++;
    }
    this.pfm_data.taxonomy.total_count = class_count;
    $("#noC").html(`${this.pfm_data.taxonomy.total_count}`);
    $("#noTicks").html(`${this.pfm_data.tick.total_count}`);
    $("#noAddQuad").html(`${this.pfm_data.add_quad.total_count}`);
    $("#noSparql").html(`${this.pfm_data.sparql.total_count}`);
    if (this.endpoint_loader) {
      noOR = this.endpoint_loader.outstanding_requests;
    } else {
      noOR = 0;
    }
    $("#noOR").html(`${noOR}`);

    for (let pfm_marker in this.pfm_data) {
      const marker = this.pfm_data[pfm_marker];
      const old_count = marker.prev_total_count;
      const new_count = marker.total_count;
      const calls_per_second = Math.round(new_count - old_count);
      if (marker.timed_count && (marker.timed_count.length > 0)) {
        //console.log marker.label + "  " + calls_per_second
        var marker_elem;
        if (marker.timed_count.length > 60) {
          marker.timed_count.shift();
        }
        marker.timed_count.push(calls_per_second);
        marker.prev_total_count = new_count + 0.01;
        //console.log "#pfm_#{pfm_marker}"
        const pfm_marker_sel = `#pfm_${pfm_marker}`;
        if (marker_elem = document.querySelector(pfm_marker_sel)) {
          sparkline.sparkline(marker_elem, marker.timed_count);
        } else {
          throw new Error(`#pfm_${pfm_marker} matches no elements`);
        }
      } else if (marker.timed_count) {
        marker.timed_count = [0.01];
      }
    }
  }

  parseAndShowFile(uri, callback) {
    let aUri;
    try {
      aUri = new URL(uri);
    } catch (error) {
      // assuming that uri failed because it is just a local path
      //   eg: /data/mariaEdgeworth.nquads
      const fullUri = document.location.origin + uri;
      aUri = new URL(fullUri);
    }
    const worker = new Worker('/quaff-lod/quaff-lod-worker-bundle.js');
    worker.addEventListener('message', this.receive_quaff_lod);
    const trigger_callback = (event) => {
      switch (event.data.type) {
        case 'end':
          this.call_on_dataset_loaded();
          if (callback != null) {
            callback();
          }
          break;
        case 'error':
          this.blurt(event.data.data, "error");
          break;
        default:
          console.log("trigger_callback(event) did not know what to do with event.data:", event.data);
      }
    };
    worker.addEventListener('message', trigger_callback); // a second listener for error and end
    worker.postMessage({url: aUri.toString()});
  }

  convert_quaff_obj_to_GreenTurtle(raw) {
    // receive either
    //   * an object
    //     - value: a full URI
    //     OR
    //     - value: a short string (representing a blank node?)
    //   * a literal
    //     - value: a string
    //     - datatype:
    //        - value: XSD:???
    //     - language: "" or a language
    const out =
      {value: raw.value};
    if (raw.datatype) {
      out.type = raw.datatype.value;
      if (raw.language != null) {
        out.language = raw.language || null;
      }
    } else {
      out.type = raw.type || RDF_object;
    }
    return out;
  }

  receive_quaff_lod(event) {
    const {subject, predicate, object, graph} = event.data;
    if (!subject) {
      return;
    }
    const subj_uri = subject.value;
    const pred_uri = predicate.value;
    const o = this.convert_quaff_obj_to_GreenTurtle(object);
    const graph_uri = graph.value;
    const q = {
      s: subj_uri,
      p: pred_uri,
      o,
      g: graph_uri
    };
    this.add_quad(q);
  }
};
Huviz.initClass();

class OntologicallyGrounded extends Huviz {
  // If OntologicallyGrounded then there is an associated ontology which informs
  // the TaxonPicker and the PredicatePicker, rather than the pickers only
  // being informed by implicit ontological hints such as
  //   _:Fred a foaf:Person .  # tells us Fred is a Person
  //   _:Fred dc:name "Fred" . # tells us the predicate_picker needs "name"
  constructor() {
    super(...arguments);
    this.parseTTLOntology = this.parseTTLOntology.bind(this);
  }

  set_ontology(ontology_uri) {
    //@init_ontology()
    this.read_ontology(ontology_uri);
  }

  read_ontology(url) {
    if (url.startsWith('file:///') || (url.indexOf('/') === -1)) { // ie local file stored in datasetDB
      this.get_resource_from_db(url, (err, rsrcRec) => {
        if (rsrcRec != null) {
          this.parseTTLOntology(rsrcRec.data);
          return;
        }
        this.blurt(err || `'${url}' was not found in your ONTOLOGY menu.  Provide it and reload page`);
        this.reset_dataset_ontology_loader();
      });
      return;
    }
    $.ajax({
      url,
      async: false,
      success: this.parseTTLOntology,
      error: (jqxhr, textStatus, errorThrown) => {
        // REVIEW standardize on @blurt(), right?
        this.show_state_msg(errorThrown + " while fetching ontology " + url);
      }
    });
  }

  parseTTLOntology(data, textStatus) {
    // detect (? rdfs:subClassOf ?) and (? ? owl:Class)
    // Analyze the ontology to enable proper structuring of the
    // predicate_picker and the taxon_picker.  Also to support
    // imputing 'type' (and hence Taxon) to nodes.
    const {
      ontology
    } = this;
    if ((typeof GreenerTurtle !== 'undefined' && GreenerTurtle !== null) &&
        (this.turtle_parser === 'GreenerTurtle')) {
      this.raw_ontology = new GreenerTurtle().parse(data, "text/turtle");
      for (let subj_uri in this.raw_ontology.subjects) {
        const frame = this.raw_ontology.subjects[subj_uri];
        const subj_lid = uniquer(subj_uri);
        for (let pred_id in frame.predicates) {
          const pred = frame.predicates[pred_id];
          const pred_lid = uniquer(pred_id);
          for (let obj of pred.objects) {
            const obj_raw = obj.value;
            if (['comment'].includes(pred_lid)) {
              //console.error "  skipping",subj_lid, pred_lid #, pred
              continue;
            }
            if (pred_lid === 'label') { // commented out by above test
              const label = obj_raw;
              if (ontology.label[subj_lid] != null) {
                ontology.label[subj_lid].set_val_lang(label, obj.language);
              } else {
                ontology.label[subj_lid] = new MultiString(label, obj.language);
              }
            }
            const obj_lid = uniquer(obj_raw);
            //if pred_lid in ['range','domain']
            //  console.log pred_lid, subj_lid, obj_lid
            if (pred_lid === 'domain') {
              ontology.domain[subj_lid] = obj_lid;
            } else if (pred_lid === 'range') {
              if ((ontology.range[subj_lid] == null)) {
                ontology.range[subj_lid] = [];
              }
              if (!(ontology.range[obj_lid])) {
                ontology.range[subj_lid].push(obj_lid);
              }
            } else if (['subClassOf', 'subClass'].includes(pred_lid)) {
              ontology.subClassOf[subj_lid] = obj_lid;
            } else if (pred_lid === 'subPropertyOf') {
              ontology.subPropertyOf[subj_lid] = obj_lid;
            }
          }
        }
      }
    }

        //
        // [ rdf:type owl:AllDisjointClasses ;
        //   owl:members ( :Organization
        //                 :Person
        //                 :Place
        //                 :Sex
        //                 :Work
        //               )
        // ] .
        //
        // If there exists (_:1, rdfs:type, owl:AllDisjointClasses)
        // Then create a root level class for every rdfs:first in rdfs:members
  }
}

class Orlando extends OntologicallyGrounded {
  // These are the Orlando specific methods layered on Huviz.
  // These ought to be made more data-driven.
  static initClass() {
    this.prototype.HHH = {};
    this.prototype.human_term = orlando_human_term;
  }
  constructor() {
    super(...arguments);
    this.close_edge_inspector = this.close_edge_inspector.bind(this);
    if (window.indexedDB) {
      let onceDBReadyCount = 0;
      const delay = 100;
      var onceDBReady = () => {
        onceDBReadyCount++;
        console.debug('onceDBReady() call #' + onceDBReadyCount);
        if (this.datasetDB != null) {
          console.debug('finally! datasetDB is now ready');
          return this.run_script_from_hash();
        } else {
          return setTimeout(onceDBReady,delay); // causes this method to be run again, acting as an async loop
        }
      };
      setTimeout(onceDBReady,delay);
    } else {
      // REVIEW not sure if this is worth doing (are we requiring indexedDB absolutely?)
      this.run_script_from_hash();
    }
  }

  get_default_set_by_type(node) {
    if (this.is_big_data()) {
      if (['writer'].includes(node.type)) {
        return this.shelved_set;
      } else {
        return this.hidden_set;
      }
    }
    return this.shelved_set;
  }

  make_link(uri, text, target) {
    if (uri == null) { uri = ""; }
    if (target == null) { target = synthIdFor(uri.replace(/\#.*$/,'')); } // open only one copy of each document
    if (text == null) { text = uri; }
    return `<a target="${target}" href="${uri}">${text}</a>`;
  }

  push_snippet(msg_or_obj) {
    const obj = msg_or_obj;
    if (true) { //@snippet_box
      if (typeof msg_or_obj !== 'string') {
        let m, obj_dd;
        [msg_or_obj, m] = Array.from(["", msg_or_obj]);  // swap them
        if (obj.quad.obj_uri) {
          obj_dd = `${this.make_link(obj.quad.obj_uri)}`;
        } else {
          const dataType_uri = m.edge.target.__dataType || "";
          let dataType = "";
          if (dataType_uri) {
            const dataType_curie = m.edge.target.type.replace('__',':');
            //dataType = """^^<a target="_" href="#{dataType_uri}">#{dataType_curie}</a>"""
            dataType = `^^${this.make_link(dataType_uri, dataType_curie)}`;
          }
          obj_dd = `"${obj.quad.obj_val}"${dataType}`;
        }
        msg_or_obj = `\
<div id="${obj.snippet_js_key}" class="message_wrapper" style="overflow:none;">
    <h3>subject</h3>
    <div class="edge_circle" style="background-color:${m.edge.source.color};"></div>
    <p>${this.make_link(obj.quad.subj_uri)}</p>

    <h3>predicate </h3>
    <div class="edge_arrow">
      <div class="edge_arrow_stem" style="background-color:${m.edge.color};"></div>
      <div class="edge_arrow_head" style="border-color: transparent transparent transparent ${m.edge.color};"></div>
    </div>
    <p class="pred">${this.make_link(obj.quad.pred_uri)}</p>

    <h3>object </h3>
    <div class="edge_circle" style="background-color:${m.edge.target.color};"></div>
    <p>${obj_dd}</p>

    <h3>source</h3>
    <p">${this.make_link(obj.quad.graph_uri)}</p>
</div>
\
`;
      }
    }

    const pos = this.get_next_snippet_position_obj(obj.edge_inspector_id);
    const dialogArgs = {
      width: this.width,
      height: this.height,
      extraClasses: "edge_inspector",
      top: pos.top,
      left: pos.left,
      close: this.close_edge_inspector
    };
    obj.edge._inspector = this.make_dialog(msg_or_obj, obj.edge_inspector_id, dialogArgs);
    obj.edge._inspector.dataset.edge_id = obj.edge.id;
  }

  close_edge_inspector(event, ui) {
    const box = event.currentTarget.offsetParent;
    const {
      edge_id
    } = box.dataset;
    if (edge_id != null) {
      const edge = this.edges_by_id[edge_id];
      if (edge != null) {
        delete edge._inspector;
      }
    }
    const edge_inspector_id = event.target.getAttribute('for');
    this.remove_edge_inspector(edge_inspector_id);
    this.destroy_dialog(event);
  }

  remove_edge_inspector(edge_inspector_id) {
    delete this.currently_printed_snippets[edge_inspector_id];
    this.clear_snippet_position_filled_for(edge_inspector_id);
  }

  clear_snippet_position_filled_for(match_id) {
    // delete the snippet_position_filled for match_id, so the position can be re-used
    for (let pos in this.snippet_positions_filled) {
      const id = this.snippet_positions_filled[pos];
      if (id === match_id) {
        delete this.snippet_positions_filled[pos];
        break;
      }
    }
  }
}
Orlando.initClass();

export { Huviz, OntologicallyGrounded, Orlando };
