window.addEventListener('load',function(){
  huviz = require('huviz');
  var hvz = new huviz.Orlando({
    huviz_top_sel: "#SEARCH_TOP",
    settings: {
      charge: -600
      , fisheye_zoom: 1
      , fisheye_radius: 0
      , gravity: 1
      , link_distance: 0
      , make_nodes_for_literals: false
      , node_radius: 25
      //, shelf_radius: 1
      , show_images_in_nodes: true
      , show_thumbs_dont_graph: true
      , single_chosen: true
      , show_edges: true
      , start_with_search_node: true
      //, theme_colors: 'dark'
    },
    stay_square: false,
    //show_tabs: false,
    //hide_fullscreen_button: true,
    tab_specs: ['commands','settings','history'],
    preload: [
      '/data/genres.json'
      , '/data/ontologies.json'
      , '/data/open_anno.json'
      , '/data/organizations.json'
      , '/data/periodicals.json'
      , '/data/publishing.json'
      , '/data/individuals.json'
      , '/data/cwrc_data.json'
      , '/data/public_endpoints.json'
      , '/data/cwrc_endpoints.json'
    ]
  });
  //hvz.add_quad({s:'http://apple.com', p:'a', o: {value: 'owl:Thing'}});
});
