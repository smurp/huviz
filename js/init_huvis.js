import * as huviz from '/huviz/huviz.js';
window.addEventListener('load',function(){
  new huviz.Orlando({
    huviz_top_sel: "#HUVIZ_TOP",
    show_edit: false,
    start_with_editing: false,
    settings: {
      show_cosmetic_tabs: true,
      show_queries_tab: true
    },
    // pass in the tab_specs to override the defaults_tab_specs
    tab_specs:
    [
      /*
      {
        "id": "intro",
        "cssClass": "tabs-intro scrolling_tab",
        "title": "Introduction and Usage",
        "text": "Intro",
        "moveSelector": "#contents_of_intro_tab"
      },
      */
      'commands','settings','history','sparqlQueries'
    ],
    preload: [
      //'/data/genres.json'
      //, '/data/cwrc-writer.json'
      "/data/beginner.json",
      , "/data/contributed.json"
      , '/data/slim-ontologies.json'
      //, '/data/open_anno.json'
      , '/data/experiments.json'
      //, '/data/organizations.json'
      //, '/data/periodicals.json'
      //, '/data/publishing.json'
      //, '/data/individuals.json'
      //, '/data/cwrc_data.json'
      , '/data/public_endpoints.json'
      , '/data/cwrc_endpoints.json'
    ]
  });
});
