window.addEventListener('load',function(){
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, false);
  document.addEventListener('dataset-loaded', function(e) {
  }, false);
  huviz = require('huviz');
  new huviz.Orlando({
    //use_old_tab_ids: true, // TODO (wolf) comment this out when you have converted tab CSS to be based on classes
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
});
