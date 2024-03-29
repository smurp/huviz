window.toggle_suspend_updates = function(val) {
  console.debug("toggle_suspend_updates(#val)");
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
function getRandomId(prefix) {
  const max = 10000000000;
  prefix = prefix || 'id';
  return prefix + Math.floor(Math.random() * Math.floor(max));
};
function isString(thing) {
  return (thing?.constructor?.name == 'String');
}
import {GraphCommand} from './graphcommandlanguage.js';
import {ColoredTreePicker, TreePicker, append_html_to} from '../wc/colortreepicker/index.js';
import {QueryManager} from './querymanager.js';
import {SortedSet} from './sortedset.js';

const THE_EMPTY_SORTED_SET = SortedSet().isState('empty').named('empty');;

//Styling for dev of template -- insert back into template html when in progress
//<div class="comdiv" style="border:1px dashed black">
//<h1>TEMPLATE</h1>
let GCLUI_TEMPLATE = `
<div class="comdiv">
  <div class="combined_command_history_parent">
    <div class="combined_command_history AKA_nextcommandbox AKA_history">
      <div class="control_label" style="display:inline">Command History</div>
      <div class="scriptPlayerControls">
        <button class="rewindScript" title="rewind to start" disabled=disabled>
          <i class="fa fa-fast-backward"></i>
        </button>
        <button class="scriptStepBack" title="go back one step" disabled=disabled>
          <i class="fa fa-play fa-flip-horizontal"></i>
        </button>
        <button class="scriptStepForward" title="play script step by step" disabled=disabled>
          <i class="fa fa-play"></i>
        </button>
        <button class="scriptFastForward" title="play script continuously" disabled=disabled>
          <i class="fa fa-fast-forward"></i>
        </button>
        <button class="scriptDownload" title="save script to local file" disabled=disabled>
          <i class="fa fa-download"></i>
        </button>
        <button class="scriptSaveToMenu title="save script to menu" disabled=disabled>
          <i class="fa fa-bars"></i>
        </button>
        <i class="grow_shrink_history fa fa-angle-double-down"></i>
      </div>
      <div class="commandlist shrunk inset_shadow AKA_cmdlist AKA_nextcommand">
        <div class="commandhistory">
        </div>
        <div class="nextcommand command">
          <code class="nextcommand_str AKA_nexcommandstr">
          </code>
          <code class="nextcommand_prompt">
             <span class="verb_phrase">
             </span>
             <span class="noun_phrase">
             </span>
             <span class="suffix_phrase">
             </span>
          </code>
          <div class="cmd-spinner AKA_nextcommand_working"
               style="float:right; color:red; display:none;">
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;

export class CommandController {
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
    this.on_grow_shrink_click = this.on_grow_shrink_click.bind(this);
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
    this.handle_clear_matching = this.handle_clear_matching.bind(this);
    this.handle_matching_input = this.handle_matching_input.bind(this);
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
    //    this.style_context_selector = this.huviz.get_picker_style_context_selector();
    this.comdiv = d3.select(this.container).append("div"); // --- Add a container
    this.comdiv.classed('comdiv');
    this.comdiv_elem = append_html_to(GCLUI_TEMPLATE, this.comdiv.node());
    if (!this.huviz.combine_command_history) {
      this.control_label("Current Command");
    }

    // D3 dependencies
    this.nextcommandbox_parent = this.comdiv.append('div');
    this.nextcommandbox_parent.classed("combined_command_history_parent", true);
    this.nextcommandbox = this.nextcommandbox_parent.append('div');
    this.nextcommandbox.classed('combined_command_history',    // set this class
                                true);

    this.nextcommandbox_elem = this.comdiv_elem.querySelector('.combined_command_history');
    this.make_command_history();
    this.prepare_tabs_sparqlQueries();
    this.make_verb_sets();
    var verbs_parent = this.control_label("Verbs");
    verbs_parent.classed('verbs_box_parent', true);
    //this.verbdiv = this.comdiv.append('div').attr('class','verbs');
    this.verbdiv = verbs_parent.append('div').attr('class','verbs');
    this.depthdiv = this.comdiv.append('div');
    this.matching_box_parent = this.comdiv.append('div').classed('matching_box_parent', true);
    this.matching_div = this.matching_box_parent.append('div');
    this.build_matching();
    this.set_picker_box_parent = this.build_set_picker("Sets", this.comdiv);
        this.node_pickers = this.comdiv.append('div').attr("id","node_pickers");
    this.add_clear_both(this.comdiv);
    this.taxon_picker_box_parent = this.build_taxon_picker(
      "Class Selector", this.node_pickers);
    //this.add_clear_both(this.comdiv);
    this.build_predicate_picker("Edges of the Selected Nodes", this.node_pickers);
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
    if (this.huviz.combine_command_history || true) {
      //this.huviz.tab_for_tabs_history_JQElem.hide();
      // keep only this for feature flag combine_command_history
      history = this.nextcommandbox_elem;
      command_history_label = 'Commands';
    } else { // THIS ALWAYS RUNS
      //history = d3.select(this.huviz.oldToUniqueTabSel['tabs-history']);
      history = document.querySelector(this.huviz.oldToUniqueTabSel['tabs-history']);
      command_history_label = 'Command History';
    }
    this.scriptPlayerControls = history.querySelector('.scriptPlayerControls');
    this.scriptRewindButton = this.scriptPlayerControls.querySelector('.rewindScript');
    this.scriptRewindButton.onclick = this.on_rewind_click;
    this.scriptBackButton = this.scriptPlayerControls.querySelector('.scriptStepBack');
    this.scriptBackButton.onclick = this.on_backward_click;
    this.scriptPlayButton = this.scriptPlayerControls.querySelector('.scriptStepForward');
    this.scriptPlayButton.onclick = this.on_forward_click;
    this.scriptForwardButton = this.scriptPlayerControls.querySelector('.scriptFastForward');
    this.scriptForwardButton.onclick = this.on_fastforward_click;
    this.scriptDownloadButton = this.scriptPlayerControls.querySelector('.scriptDownload');
    this.scriptDownloadButton.onclick = this.on_downloadscript_hybrid_clicked;
    this.scriptStashButton = this.scriptPlayerControls.querySelector('.scriptSaveToMenu');
    this.scriptStashButton.onclick = this.on_stashscript_clicked;

    this.cmdlist_elem = this.nextcommandbox_elem.querySelector('.commandlist');
    this.add_grow_shrink_history();
    // TODO settle on either camelCase or snake_case for the _elem (Elem) suffix
    this.commandhistoryElem = this.cmdlist_elem.querySelector('.commandhistory');
    this.commandhistoryElem.style['max-height'] = `${this.huviz.height-80}px`;

    this.future_cmdArgs = [];
    this.command_list = [];
    this.command_idx0 = 0;
  }
  add_grow_shrink_history() {
    /*
        this.grow_shrink = this.scriptPlayerControls.append('i').
      classed("grow_shrink_history fa fa-angle-double-down", true).
      on('click', this.on_grow_shrink_click.bind(this));
      */
    this.grow_shrink = this.scriptPlayerControls.querySelector('.grow_shrink_history');
    this.grow_shrink.onclick = this.on_grow_shrink_click;
  }
  on_grow_shrink_click(evt) {
    const UP = 'fa-angle-double-up';
    const DN = 'fa-angle-double-down';
    var growshrink_classList = this.grow_shrink.classList;
    var cmdlist_classList = this.cmdlist_elem.classList;
    if (growshrink_classList.contains(UP)) {
      growshrink_classList.replace(UP, DN);
      cmdlist_classList.replace('grown', 'shrunk');
    } else {
      growshrink_classList.replace(DN, UP);
      cmdlist_classList.replace('shrunk', 'grown');
      this.nextcommand_elem.scrollIntoView();
    }
  }
  reset_command_history() {
    for (let record of this.command_list) {
      record.elem.classList.remove('played');
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
    return this.get_script_prefix() + this.commandhistoryElem.innerText;
  }
  get_script_body_as_json() {
    const cmdList = [];
    const rsrcMenu = this.huviz.resourceMenu;
    if (rsrcMenu.dataset_loader.value) {
      cmdList.push({
        verbs: ['load'],
        data_uri: rsrcMenu.dataset_loader.value,
        ontologies: [rsrcMenu.ontology_loader.value],
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
  on_play_to_script_command_by_id(id) {
    // play the script to the command with the given id
    // There are 3 possible states: current command_idx0 is before, after or equal to idx
    const idx = this.get_command_idx_by_id(id);
    //console.log(`on_play_to_script_command_by_id(${id}) idx=${idx}`, this.command_idx0);
    if (idx == null || idx == this.command_idx0) return; // already there, ignore!
    if (idx < this.command_idx0) { // go back
      this.on_rewind_click();
    }
    this.on_fastforward_click(idx);
  }
  get_command_idx_by_id(id) {
    // we scan for idx rather than memo it on the cmds because they can be moved and deleted
    var idx = 0;
    while (this.command_list.length > idx) {
      var cmd_and_elem = this.command_list[idx];
      idx++;
      if (cmd_and_elem.cmd.id == id) return idx;
    }
    return null;
  }
  publish_script(script_rec, callback) {
    // script_rec keys: uri, opt_group, data
    console.debug("publish_script", script_rec);
    var formData = new FormData()
    var srcObj = [script_rec.data];
    srcObj.name = () => {return script_rec.fname_w_timestamp};
    var blob = new File(srcObj, {
      type: "text/plain",
      tempFilePath:  script_rec.fname_w_timestamp});
    formData.append('scriptFile', blob);
    var request = new XMLHttpRequest();
    request.onload = (resp) => {
      callback(null, request.getResponseHeader('Location'));
    }
    var publishScriptPostUrl = window.location.origin + "/scripts";
    request.open("POST", publishScriptPostUrl);
    request.send(formData);
  }
  play_old_command_by_idx(idx) {
    const record = this.command_list[idx];
    record.elem.classList.add('command', 'played');
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
  on_dataset_loaded(evt={}) {
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
    this.clear_matching();
    this.disengage_all_verbs();
    this.disengage_all_sets();
    this.clear_all_sets();
    this.init_editor_data();
    this.update_command();
  }
  disengage_command() {
    this.clear_matching();
    this.disengage_all_verbs();
    this.disengage_all_sets();
    this.update_command();
  }
  disengage_all() {
    this.clear_matching();
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
      console.warn("resorting of predicate_picker on hold until it does not delete 'anything'");
    }
      //@predicate_picker?.resort_recursively()
    //@set_picker?.resort_recursively()
  }
  build_predicate_picker(label, parent) {
    let extra_classes, needs_expander, squash_case, use_name_as_label;
    parent = parent || this.comdiv;
    this.predicates_id = this.huviz.unique_id('predicates_');
    const title =
      "Medium color: all edges shown -- click to show none\n" +
      "Faint color: no edges are shown -- click to show all\n" +
      "Stripey color: some edges shown -- click to show all\n" +
      "Hidden: no edges among the selected nodes";
    let where = (
      (label != null) &&
        this.control_label(label,parent,title)) || this.comdiv;
    where = where.node()
    console.debug("where",where.outerHTML)
    where.classList.add('predicate_picker_box_parent')
    // this.predicatebox = where.insertAdjacentHTML('beforeend',`<div class="container" id="${this.predicates_id}"></div>`)
    // this.predicatebox = where.children[where.children.length - 1] // find the added div
    this.predicatebox = append_html_to(`<div class="container" id="${this.predicates_id}"></div>`, where);

    //@predicatebox.attr('class','scrolling')
    this.predicates_ignored = [];
    this.predicate_picker = append_html_to(`<color-tree-picker root="anything"></color-tree-picker>`, this.predicatebox);
    this.predicate_hierarchy = {"anything":["anything"]};
    // FIXME Why is build_tree being called four times per node?
    this.predicate_picker.click_listener = this.handle_on_predicate_clicked;
    this.predicate_picker.build_tree(this.predicate_hierarchy);
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
    predicate_ctl.addEventListener('mouseenter', () => {
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
    predicate_ctl.addEventListener('mouseleave', () => {
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
  //displays colours of edges when clicked
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
    where = where.node();
    this.taxon_box = append_html_to(`<div class="container" id="${id}" style="vertical-align:top"></div>`, where);
    // http://en.wikipedia.org/wiki/Taxon
    this.taxon_picker = append_html_to(`<color-tree-picker root="Thing"></color-tree-picker>`, this.taxon_box);
    this.taxon_picker.click_listener = this.handle_on_taxon_clicked;
    this.taxon_picker.hover_listener = this.on_taxon_hovered;
    this.taxon_picker.build_tree(this.hierarchy);
    where.classList.add("taxon_picker_box_parent")
    return where;
  }
  add_taxon(taxon_id, parent_lid, class_name, taxon) {
    this.taxon_picker.add(taxon_id, parent_lid, class_name,
                          this.handle_on_taxon_clicked);
    this.make_taxon_proposable(taxon_id);
    this.huviz.recolor_nodes();
  }
  make_taxon_proposable(taxon_id) {
    const taxon_ctl = this.taxon_picker.id_to_elem[taxon_id];
    taxon_ctl.addEventListener('mouseenter', evt => {
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
    taxon_ctl.addEventListener('mouseleave', evt => {
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
      !this.set_is_engaged_because_matching;
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

    // Where the full command string to appear as plain text, eg:
    //    "____ every Thing."
    //    "shelve every Person."
    this.nextcommand_elem = this.cmdlist_elem.querySelector('.nextcommand')
    this.nextcommandstr_elem = this.nextcommand_elem.querySelector('.nextcommand_str');
    // Where the broken out versions of the command string, with prompts, goes.
    this.nextcommand_prompts = this.nextcommand_elem.querySelector(".nextcommand_prompt");
    this.nextcommand_verb_phrase_elem = this.nextcommand_prompts.querySelector('.verb_phrase');
    this.nextcommand_noun_phrase_elem = this.nextcommand_prompts.querySelector('.noun_phrase');
    this.nextcommand_suffix_phrase_elem = this.nextcommand_prompts.querySelector('.suffix_phrase');


    this.nextcommand_prompts.style.display = 'inherit';
    this.nextcommandstr_elem.style.display = 'none';
    this.nextcommand_working_elem = this.nextcommand_elem.querySelector('.cmd-spinner');
    this.build_submit();
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
    this.nextcommand_working_elem.setAttribute('class', 'fa fa-spinner fa-spin'); // PREFERRED fa-2x
    this.nextcommand_elem.setAttribute('class', 'nextcommand command cmd-working');
  }
  show_working_off() {
    this.nextcommand_working_elem.setAttribute('class',null);
    this.nextcommand_elem.setAttribute('class', 'nextcommand command');
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

  build_matching() {
    this.matching_div.text('matching:').classed("control_label", true);
    this.matching_div.style('display','inline-block');
    this.matching_div.style('white-space','nowrap');
    this.matching_input = this.matching_div.append('input');
    this.matching_input.attr('class', 'matching_input');
    this.matching_input.attr('placeholder','node Name');
    this.set_is_engaged_because_matching = false;
    this.matching_input.on('input', this.handle_matching_input);
    this.clear_matching_button = this.matching_div.append('button').text('⌫');
    this.clear_matching_button.attr('type','button').classed('clear_matching', true);
    this.clear_matching_button.attr('disabled','disabled');
    this.clear_matching_button.attr('title','clear the "matching" field');
    this.clear_matching_button.on('click', this.handle_clear_matching);
  }

  handle_clear_matching(evt) {
    this.matching_input.property('value','');
    this.handle_matching_input();
  }

  handle_matching_input(evt) {
    let TODO;
    const matching_value = this.get_matching_string();
    const matching_has_a_value = !!matching_value;
    const {engaged_set, id_of_engaged_set, engaged_set_before_matching_all} = this;
    var default_engaged_set = this.huviz.selected_set.length ? 'selected_set' : 'all_set';
    //default_engaged_set = 'selected_set';
    if (matching_has_a_value) {
      this.clear_matching_button.attr('disabled', null);
      if (this.set_is_engaged_because_matching) { // matching PREVIOUSLY had a value too
        TODO = `Update the selection based on the matching value '${this.id_of_engaged_set}'`;
        //@update_command(evt) # update the impact of the value in the matching input
      } else { // matching NEWLY has a value, so set things up for that
        this.engaged_set_before_matching_all = id_of_engaged_set;
        this.set_immediate_execution_mode(this.is_verb_phrase_empty());
        // Matching works in conjuction with an engaged set.
        if (id_of_engaged_set) { // TODO Is there already an engaged set?
          // If a set is already engaged then match with it.
          TODO = `Find matches for "${matching_value}" `;
          TODO += `in the already engaged set '${this.id_of_engaged_set}'`;
        } else {
          // If a set is not yet engaged then engage the appropriate set
          this.set_is_engaged_because_matching = true;
          this.huviz.click_set(default_engaged_set); // ie engage the appropriate set
          TODO = `find matches for "${matching_value}" ` +
            `in the automatically engaged set '${this.id_of_engaged_set}'`;
        }
      }

    } else { // matching_value is empty
      this.clear_matching_button.attr('disabled','disabled');
      if (id_of_engaged_set) { // this.set_is_engaged_because_matching
        // a set is engaged, either automatically or before a matching string
        TODO = `Cleaning up now that matching value is empty`;
        if (engaged_set_before_matching_all) {
          // So that engaged_set_before_matching_all should end up engaged
          if (engaged_set_before_matching_all == id_of_engaged_set) {
            TODO = "leaving the set engaged because it was before there was a matching_value";
          } else {
            this.huviz.click_set(id_of_engaged_set); // disengage
            this.huviz.click_set(engaged_set_before_matching_all); // re-engage
          }
          this.engaged_set_before_matching_all = undefined; // forget all about it
        } else { // just cancel the engaged set
          this.huviz.click_set(id_of_engaged_set); // toggle OFF the automatically engaged set
        }
        this.set_is_engaged_because_matching = false;
        this.set_immediate_execution_mode(true);
        //@update_command(evt) # does this deal with that moment when it becomes blanked?
      } else {
        TODO = 'Nothing to do when matching_value and id_of_engaged_set are both blank';
      }
      //this.huviz.set_matching_regex(''); // clear the labelling of matching nodes
    }
    setTimeout(() => {
      this.huviz.set_matching_regex(matching_value); // cause labels on matching nodes to be displayed
      console.debug({TODO, matching_value, default_engaged_set,
                     id_of_engaged_set, engaged_set_before_matching_all});
      this.update_command(evt);
    },100); // give the calls to click_set to propagate
  }

  build_submit() {
    //  IT LOOKS LIKE THIS CAN BE DELETED
    return;
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
    return;  //  REMOVE THIS
    this.doit_butt.attr('disabled',null);
  }
  disable_doit_button() {
    return;  //  REMOVE THIS
    this.doit_butt.attr('disabled','disabled');
  }
  hide_doit_button() {
    return; // REMOVE THIS
    $(this.doit_butt.node()).hide();
  }
  show_doit_button() {
    return;  // REMOVE THIS
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
  clear_matching() {
    this.huviz.matching_string();
  }
  get_matching_string() {
    return this.matching_input.node().value;
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
      if (this.command_list.length) {
        this.huviz.goto_tab('commands');
        setTimeout(() => {
          this.on_fastforward_click();
          // TODO move this hack to own method on HuViz
          // HACK ON
          // Make small change to a setting, so nodes do not pile up at the origin.
          var ld = this.huviz.linkDistance * 1.01;
          this.huviz.on_change_linkDistance(ld);
          // HACK OFF
        });
      } else {
        console.warn("nothing to run");
      }
    }
  }
  push_command_onto_history(cmd) {
    // Maybe the command_pointer is in the middle of the command_list
    // and here we are trying to run a new command -- so we need to
    // dispose of the remaining commands in the command_list because the
    // user is choosing to take a new path.
    this.clear_unreplayed_commands_if_needed();
    cmd.id = getRandomId('cmd');
    const elem = append_html_to(`<div class="played command" id="${cmd.id}"></div>`,
                                this.commandhistoryElem);
    this.commandhistoryElem.scrollTop = this.commandhistoryElem.scrollHeight;
    const elem_and_cmd = {
      elem,
      cmd
    };
    this.command_list.push(elem_and_cmd);
    this.command_idx0 = this.command_list.length;
    const idx_of_this_command = this.command_idx0;
    // appending to the script, playing is no longer valid, so...
    this.disable_play_buttons();
    elem.innerText = cmd.str+"\n"; // add CR for downloaded scripts
    elem.scrollIntoView();
    elem.onclick = () => this.on_play_to_script_command_by_id(cmd.id);
    const delete_button = append_html_to('<a class="delete-command"></a>', elem);
    delete_button.onclick = () => this.delete_script_command_by_id(cmd.id);
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
    const elem = elem_and_cmd?.elem;
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
    if (this.command_list.length > 0) {
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
    this.scriptPlayButton.setAttribute('disabled', 'disabled');
    this.scriptForwardButton.setAttribute('disabled', 'disabled');
  }
  enable_play_buttons() {
    this.scriptForwardButton.removeAttribute('disabled');
    this.scriptPlayButton.removeAttribute('disabled');
  }
  disable_back_buttons() {
    this.scriptBackButton.setAttribute('disabled', 'disabled');
    this.scriptRewindButton.setAttribute('disabled', 'disabled');
  }
  enable_back_buttons() {
    this.scriptBackButton.removeAttribute('disabled');
    this.scriptRewindButton.removeAttribute('disabled');
  }
  disable_save_buttons() {
    this.scriptDownloadButton.setAttribute('disabled', 'disabled');
    this.scriptStashButton.setAttribute('disabled', 'disabled');
    //this.scriptPublishButton.setAttribute('disabled', 'disabled');
  }
  enable_save_buttons() {
    this.scriptDownloadButton.removeAttribute('disabled');
    this.scriptStashButton.removeAttribute('disabled');
    //this.scriptPublishButton.removeAttribute('disabled');
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
    if (this.id_of_engaged_set) {
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
    const matching_str = (this.matching_input.node().value || "").trim();
    if (matching_str) {
      args.matching = matching_str;
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
        console.debug(Math.round((Date.now() - start) / 1000));
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
    this.nextcommand_verb_phrase_elem.innerText = this.command.verb_phrase;
    let verb_phrase_classList = this.nextcommand_verb_phrase_elem.classList;
    if (this.command.verb_phrase_ready) {
      verb_phrase_classList.add('nextcommand_prompt_ready')
      verb_phrase_classList.remove('nextcommand_prompt_unready')
    } else {
      this.nextcommand_verb_phrase_elem.classList
      verb_phrase_classList.remove('nextcommand_promp_ready');
      verb_phrase_classList.add('nextcommand_promp_unready');
    }
    this.nextcommand_noun_phrase_elem.innerText = this.command.noun_phrase;
    let noun_phrase_ready_classList = this.nextcommand_noun_phrase_elem.classList;
    if (this.command.noun_phrase_ready) {
      noun_phrase_ready_classList.add('nextcommand_prompt_ready');
      noun_phrase_ready_classList.remove('nextcommand_prompt_unready');
    } else {
      noun_phrase_ready_classList.remove('nextcommand_prompt_ready');
      noun_phrase_ready_classList.add('nextcommand_prompt_unready');
    }
    this.nextcommand_suffix_phrase_elem.innerText = this.command.suffix_phrase;
    this.nextcommandstr_elem.innerText = this.command.str;
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
       ((this.engaged_verbs.length === 1) &&
        (this.engaged_verbs[0] === 'select')));
  }
  build_verb_form() {
    this.verb_pairs = this.verbdiv.append('div').attr('class', 'pairs');
    this.verb_singletons = this.verbdiv.append('divs').
      attr('class', 'singletons');
    this.verb_pretty_name = {};
    for (let vset of this.verb_sets) {
      this.add_verb_set(vset);
    }
  }
  add_verb_set(vset) {
    const {verb_pairs, verb_singletons} = this;
    var containerElem, returnElem;
    const isEmpty = Object.keys(vset).length == 0;
    const isSingle = Object.keys(vset).length == 1;
    const isPair = Object.keys(vset).length == 2;
    const isGroup = Object.keys(vset).length > 2;
    const which = isEmpty ? 'empty' : (
      isSingle ? 'singleton' : (
        isPair ? 'pair' : (
          isGroup ? 'group' : 'unknown')));
    //console.log(which, vset);
    if (isSingle) {
      // Put all the singletons directly within ".verbs < .singletons"
      containerElem = verb_singletons;
      returnElem = containerElem;
    } else if (isPair || isGroup) {
      // Put the pairs within their own ".alternates" within ".verbs < .pairs"
      const alternatesElem = verb_pairs.append('div').attr('class','alternates');
      // are these D3 objects?
      containerElem = alternatesElem.append('div').attr('class', 'pair');
      const x_butt = alternatesElem.append('div').attr('class', 'x-button');
      x_butt.append('button').text('X');
      returnElem = alternatesElem;
    } else {
      console.warn("",vset);
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
    return returnElem; // used by EditController
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
         this.predicate_picker.shield();
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
        this.predicate_picker.unshield();
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
    var {style_of_set_picker} = this.huviz;
    var torque_the_sets = style_of_set_picker != 'classic';
    var is_button_style = style_of_set_picker == 'buttons';
    //torque_the_sets = true;
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
    if (torque_the_sets) {
      //this.the_sets.all_set[0] = 'ALL'; // make this first
      var all_set = this.the_sets.all_set;
      for (let k_v of Object.entries(all_set[1])) {
        var [k, v] = k_v;
        delete all_set[k];
        this.the_sets[k] = v;
      }
      this.the_sets.all_set.pop();
    }
    this.set_picker_box = append_html_to(`<div class="container" id="sets"></div>`, where.node());
    this.set_picker = append_html_to( // instantiate tree-picker WebComponent
      `<tree-picker class="treepicker-vertical" root="all"></tree-picker>`, this.set_picker_box);
    this.set_picker.click_listener = this.handle_on_set_picked;
    this.set_picker.build_tree(this.the_sets);
    this.populate_all_set_docs();
    this.make_sets_proposable();
    where.classed(`set_picker_box_parent ${style_of_set_picker}`,true);
    if (is_button_style) {
      this.scatter_set_buttons(where);
    }
    return where;
  }
  scatter_set_buttons(where) {
    var parentOfTemplate = where.node();
    parentOfTemplate.insertAdjacentHTML('beforeend',`
<div class="setsAndVerbs">
  <div class="sets">
    <div class="pinned">
HELLO WORLD
    </div>
    <div class="nameless">
    </div>
    <div class="pinned">
    </div>
  </div>
</div>
`);
    var target = parentOfTemplate.querySelector('.nameless');
    var theSetNodes = parentOfTemplate.querySelector('.container')
    theSetNodes.forEach((aSetNode) => {
      // move the set to a place in the template
    });
    console.debug("BUTTON STYLE STUFF", {target, parentOfTemplate});
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
      set_ctl.addEventListener('mouseenter', () => {
        this.proposed_set = a_set;
        return this.update_command();
      });
      return set_ctl.addEventListener('mouseleave', () => {
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
    this.clear_set_picker(); // TODO consider in relation to set_is_engaged_because_matching
    this.set_picker.set_direct_state(set_id, new_state);
    let because = {};
    const hasVerbs = !!this.engaged_verbs.length;
    if (new_state === 'showing') {
      this.taxon_picker.shield();
      this.predicate_picker.shield();
      this.chosen_set = this.huviz[set_id];
      this.engaged_set = this.chosen_set; // will set id_of_engaged_set
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
      this.predicate_picker.unshield();
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
    if (this.id_of_engaged_set) {
      this.on_set_picked(this.id_of_engaged_set, "unshowing");
      delete this.id_of_engaged_set;
      delete this.chosen_set;
    }
  }
  get engaged_set() {
    if (!this.id_of_engaged_set) {
      console.debug(`no engaged_set so returning THE_EMPTY_SORTED_SET`);
      return THE_EMPTY_SORTED_SET;
    }
    return this.huviz[this.id_of_engaged_set];
  }
  set engaged_set(which) {
    const ensure_ends_with_set = (id) => {
      if (!id) {
        throw new Error(`id must have value`);
      } else if (id.endsWith('_set')) {
        return id;
      } else {
        return `${id}_set`;
      }
    }
    if (isString(which)) {
      this.id_of_engaged_set = ensure_ends_with_set(which);
    //} else if (which?.constructor?.name == 'SortedSet') {
    } else if (Array.isArray(which)) {
      this.id_of_engaged_set = ensure_ends_with_set(which.id);
    } else if (which == undefined) {
      delete this.id_of_engaged_set;
    } else {
      throw new Error(`which should be a SortedSet or its id not ${which}`);
    }
    console.log(`engaged_set('${this.id_of_engaged_set}')`);
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
    if (this.id_of_engaged_set != null) {
      this.set_picker.set_direct_state(this.id_of_engaged_set, 'unshowing');
      delete this.id_of_engaged_set;
    }
  }
}
CommandController.initClass();
