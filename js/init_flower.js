window.addEventListener('load',function(){
  huviz = require('huviz');
  var hvz = new huviz.Huviz({
    default_node_url: '/huviz/docs/cwrc_logo.png',
    huviz_top_sel: "#FLOWER_TOP",
    settings: {
      charge: -600
      , shelf_radius: 1
      , fisheye_zoom: 1
      , fisheye_radius: 0
      , default_node_url: '/huviz/docs/orlando_tree_logo.png'
      //, // should use weird shape to test circular clipping
      , gravity: 1
      , link_distance: 0
      , make_nodes_for_literals: false
      //, theme_colors: 'dark'
      , node_radius: 25
      , show_edges: false
      , single_chosen: true
    },
    // pass in the tab_specs to override the defaults_tab_specs
    hide_tabs: true,
    hide_fullscreen_button: true,
    tab_specs:
    [
      {
        "cssClass": "huvis_controls scrolling_tab unselectable",
        "title": "Power tools for controlling the graph",
        "text": "Commands"
      },
      {
        "cssClass": "tabs-options scrolling_tab",
        "title": "Fine tune sizes, lengths and thicknesses",
        "text": "Settings"
      },
      {
        "cssClass": "tabs-history",
        "title": "The command history",
        "text": "History"
      }
    ],
    preload: [
      '/data/genres.json'
      , '/data/ontologies.json'
      , '/data/open_anno.json'
      , '/data/organizations.json'
      , '/data/periodicals.json'
      , '/data/publishing.json'
      , '/data/individuals.json'
      , '/data/cwrc_data.json'
      , '/data/prosopographies.json'
      , '/data/public_endpoints.json'
      , '/data/cwrc_endpoints.json'
    ]
  });
  hvz.add_quad({s:'http://apple.com', p:'a', o: {value: 'owl:Thing'}});
});
