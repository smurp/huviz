window.addEventListener('load',function(){
  huviz = require('huviz');
  new huviz.Orlando({
    huviz_top_sel: "#HUVIZ_TOP",
    show_edit: false,
    start_with_editing: false,
    settings: {
      show_queries_tab: true,
      show_cosmetic_tabs: true
    },
    // pass in the tab_specs to override the defaults_tab_specs
    tab_specs:
    [
      {
        "cssClass": "tabs-intro scrolling_tab",
        "title": "Introduction and Usage",
        "text": "Intro",
        "moveSelector": "#contents_of_intro_tab"
      },
      'commands','settings','history',
      {
        "cssClass": "tabs-credit scrolling_tab",
        "title": "Academic, funding and technical credit",
        "text": "Credit",
        "bodyUrl": "/huviz/docs/credits.md"
      },
      'sparqlQueries'
    ],
    preload: [
      '/data/genres.json'
      , '/data/cwrc-writer.json'
      , '/data/ontologies.json'
      , '/data/open_anno.json'
      , '/data/experiments.json'
      //, '/data/organizations.json'
      //, '/data/periodicals.json'
      //, '/data/publishing.json'
      //, '/data/individuals.json'
      , '/data/cwrc_data.json'
      , '/data/prosopographies.json'
      , '/data/public_endpoints.json'
      , '/data/cwrc_endpoints.json'
    ]
  });
});
