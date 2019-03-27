window.addEventListener('load',function(){
  huviz = require('huviz');
  var hvz = new huviz.Orlando({
    default_node_url: '/huviz/docs/cwrc_logo.png',
    huviz_top_sel: "#FLOWER_TOP",
    settings: {
      charge: -600
      , shelf_radius: 1
      , fisheye_zoom: 1
      , fisheye_radius: 0
      //, default_node_url: '/huviz/docs/sshrc_logo_en2.png'
      //, default_node_url: '/huviz/docs/nooron_logo.png'
      //, default_node_url: '/huviz/docs/CANARIE_v2.png'
      //, default_node_url: '/huviz/docs/test_img_portrait.png'
      , default_node_url: 'http://i3.ytimg.com/vi/LeAltgu_pbM/hqdefault.jpg'
      //, // should use weird shape to test circular clipping
      , gravity: 1
      , link_distance: 0
      , make_nodes_for_literals: false
      //, theme_colors: 'dark'
      , show_thumbs_dont_graph: true
      , show_images_in_nodes: true
      , node_radius: 25
      , show_edges: false
      , single_chosen: true
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
      , '/data/prosopographies.json'
      , '/data/public_endpoints.json'
      , '/data/cwrc_endpoints.json'
    ]
  });
  hvz.add_quad({s:'http://apple.com', p:'a', o: {value: 'owl:Thing'}});
});
