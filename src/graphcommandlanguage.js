/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import {angliciser} from './angliciser.js';
import {SortedSet} from './sortedset.js';

function eval_ish(bod) { // calling this is equivalent to calling eval(bod)
  var f = new Function('return '+bod);
  return f();
}

export class GCLTest {
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
        got = eval_ish(exp[0]);
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

export class GCLTestSuite {
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

export class GraphCommand {
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
    this.huviz.show_state_msg(this.as_msg());
    this.huviz.d3simulation.stop();
    const regarding_required = this.regarding_required();
    const nodes = this.get_nodes();
    console.log(`%c${this.str}`, "color:blue;font-size:1.5em;",
                `on ${nodes.length} nodes`);
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
    if (regarding_required) {
      for (let meth of this.get_predicate_methods()) {
        let iter = (node) => {
          for (let pred of this.regarding) {
            /*
             * Verbs about predicates take a second argument: the predicate.
             */
            const retval = meth.call(this.huviz, node, pred);
          }
          return this.huviz.tick();
        };
        if (nodes != null) {
          async.each(nodes, iter, errorHandler);
        }
      }
    } else if (this.verbs[0] === 'load') {
      this.huviz.load_with(this.data_uri, this.with_ontologies, this.run_scripts);
    } else if (this.verbs[0] === 'run') {
      this.huviz.load_with(this.data_uri, this.with_ontologies, this.run_scripts);
      //console.warn("TODO implement the ability to run scripts from the URL");
    } else if (this.verbs[0] === 'query') {
      this.huviz.visualize_from_url(this.sparqlQuery);
    } else {
      for (let meth of this.get_methods()) { // find methods for the verbs
        var callback;
        if (meth.callback) {
          callback = meth.callback;
        } else if (meth.build_callback) {
          callback = meth.build_callback(this, nodes);
        } else {
          callback = errorHandler;
        }
        const { atFirst } = meth;
        if (atFirst != null) {
          atFirst(); // is called once before iterating through the nodes
        }
        let iter = (node) => {
          /*
           * Verbs about nodes take a second argument: the GraphCommand.
           * TODO: convert ALL verbs (see regarding_required above) to take the
           *       GraphCommand as the SECOND argument and
           *       callback (if any) as the third argument
           * Verbs which take a cmd (ie this) take it second
           *   pin(node, cmd)
           * Verbs which take a callback, take it last
           *   choose(node, ignoreCmd, cb) takes a callback
           * This permits verbs which take more arguments.
           * Additional args are sent between the 2nd and the last.
           */
          return meth.call(this.huviz, node, this);
        };
        //@huviz.tick() # TODO(smurp) move this out, or call every Nth node
        // REVIEW Must we check for nodes? Perhaps atLast dominates.
        const cmd = this;
        if (nodes != null) {
          var USE_ASYNC;
          if (USE_ASYNC = false) {
            async.each(nodes, iter, callback);
          } else {
            for (let node of nodes) {
              iter(node, cmd);
            }
            this.huviz.gclui.set; // REVIEW This is a noop. What was the intent?
            callback(); // atLast is called once, after the verb has been called on each node
            this.huviz.tick(); // force immediate rendering after each verb
          }
        }
      }
    }
    this.huviz.clean_up_all_dirt_once();
    this.huviz.hide_state_msg();
    this.huviz.restart();
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
    /*
       Acceptable urls either look like:
         load DATASET_URL with ONTOLOGY_URL
       or
         load DATASET_URL with ONTOLOGY_URL run SCRIPT_URL
       or
         run SCRIPT_URL
       or
         query QUERY_TERMS
       or
         UNTESTED_URL_TO_USE_AS_SUBJECT
     */
    const parts = cmd_str.split(" ");
    const verb = parts[0];
    const cmd = {};
    cmd.verbs = [verb];
    if (verb === 'load') {
      cmd.data_uri = parts[1];
      if (parts[2] == 'with') {
        cmd.with_ontologies = [parts[3]];
      }
      cmd.run_scripts = [];
      if (parts[4] == 'run') {
        cmd.run_scripts = [parts[5]];
      }
    } else if (verb === 'run') {
      // This is required but not sufficient to make support urls like:
      //    http://localhost:5000/#run+/scripts/SCRIPTFNAME.txt
      // See HuViz load_with()
      if (parts[1]) {
        cmd.run_scripts = [parts[1]];
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

export class GraphCommandLanguageCtrl {
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
