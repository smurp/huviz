import {TreePicker, append_html_to} from './treepicker.js'; // TODO convert to module
import {hsl2rgb} from './hsl.js';

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

export class ColoredTreePicker extends TreePicker {
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
    this.recolor_now();
  }
  recolor_now() {
    this.id_to_colors = this.recolor();
    this.update_css();
  }
  get_my_style_id() {
    return `${this.get_my_id()}_colors`;
  }
  update_css() {
    let styles = this.gen_stylesheet_header();
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
    this.style_sheet.innerHTML = styles;
    if (false) { // cross-check the stylesheets to ensure proper loading
      let style_sheet_length = this.style_sheet.innerHTML.length;
          if (style_sheet_length !== styles.length) {
            console.error("style_sheet_length error:",
                          style_sheet_length, "<>", styles.length);
      } else {
        console.info("style_sheet_length good:", style_sheet_length,
                     "==", styles.length);
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
    const branch = this.elem.children[1];
    if (branch) {
      this.recolor_recurse_DOM(retval, recursor, branch, "");
    }
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
    console.debug("no colors found for id: " + id);
  }
  click_handler(evt) {
    const id = super.click_handler(evt);
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
      this.id_to_elem[id].removeAttribute("style"); // clear style set by set_gradient_style
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
    let style = `background-color: transparent;`
    style += `background: linear-gradient(45deg, ${colors}`;
    this.id_to_elem[id].setAttribute("style", style);
  }
  set_payload(id, value) {
    super.set_payload(id, value);
    // REVIEW it works but is this the right time to do this?
    // ensure collapsed nodes have summary colors updated
    this.style_with_kid_color_summary_if_needed(id);
  }
}
ColoredTreePicker.initClass();
