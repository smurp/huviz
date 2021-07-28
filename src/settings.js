import {GeoUserNameWidget} from './settingswidgets.js';

export const DEFAULT_SETTINGS = [
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
      class: "deprecated_feature",
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
    linkDistance: {
      group: "Layout",
      html_text: '<a href="https://github.com/d3/d3-force#link_distance" target="extDocs">link distance</a> ',
      class: "alpha_feature",
      label: {
        title: "Link distance as proportion of the minimum window radius."
      },
      input: {
        value: .1,
        min: .01,
        max: 1,
        step: 0.01,
        type: "range"
      }
    }
  }
  , {
    linkStrength: {
      group: "Layout",
      html_text: '<a href="https://github.com/d3/d3-force#link_strength" target="extDocs">link strength</a> ',
      class: "alpha_feature",
      label: {
        title: "Link strength ?????."
      },
      input: {
        value: .8,
        min: 0,
        max: 2,
        step: 0.02,
        type: "range"
      }
    }
  }
  , {
    collideRadiusFactor: {
      group: "Layout",
      html_text: '<a href="https://github.com/d3/d3-force#collide_radius" target="extDocs">collide radius</a> ',
      class: "alpha_feature",
      label: {
        title: "Collide radius as a factor of node radius."
      },
      input: {
        value: 2,
        min: 1,
        max: 5,
        step: 0.2,
        type: "range"
      }
    }
  }
  , {
    collideStrength: {
      group: "Layout",
      html_text: '<a href="https://github.com/d3/d3-force#collide_strength" target="extDocs">collide strength</a> ',
      class: "alpha_feature",
      label: {
        title: "Collide strength."
      },
      input: {
        value: .5,
        min: 0,
        max: 1,
        step: 0.02,
        type: "range"
      }
    }
  }
  , {
    distanceMax: {
      class: "deprecated_feature",
      group: "Layout",
      text: "distanceMax scaled",
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
      class: "deprecated_feature",
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
        value: 20,
        min: 1,
        max: 100,
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
      input: { // this should be OFF by default until it is pretty
        type: "checkbox",
        checked: "checked"
      }
    }
  }
  , {
    torque_the_sets: {
      group: "Feature Flags",
      class: "alpha_feature",
      text: "Torque the Sets",
      label: {
        title: "Rotate the Sets around by 90deg"
      },
      input: {
        type: "checkbox"
        //, checked: "checked"
      }
    }
  }
  , {
    style_of_set_picker: {
      group: "Feature Flags",
      class: "alpha_feature",
      text: "Style of Set Picker...",
      label: {
        title: "How the Set Picker is styled"
      },
      input: {
        type: "select"
      },
      options : [
        {
          label: "Classic"
          , value: "classic"

        }
        , {
          label: "Canted (alpha)"
          , value: "canted"

        }
        , {
          label: "Wrenched (alpha)"
          , value: "wrenched"

        }
        , {
          label: "Horizontal (pre-alpha)"
          , value: "horiz-sets"
        }
        , {
          label: "Tipped (alpha)"
          , value: "tipped"

        }
        , {
          label: "Buttons (alpha)"
          , value: "buttons"
          , selected: true
        }
      ]
    }
  }
];
