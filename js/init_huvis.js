window.addEventListener('load',function(){
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, false);
  document.addEventListener('dataset-loaded', function(e) {
  }, false);
  huviz = require('huviz');
  HVZ = new huviz.Orlando({
    gclui_sel: "#gclui",
    skip_log_tick: true,
    make_pickers: true,
    /*  // TODO remove any sensitivity to these, we do not need them
    dataset_loader__append_to_sel: "#huvis_controls",
    ontology_loader__append_to_sel: "#huvis_controls",
    endpoint_loader__append_to_sel: "#huvis_controls",
    script_loader__append_to_sel: "#huvis_controls",
    */
    graph_controls_sel: '#tabs-options',
    display_hints: false, // here to show how to enable hints
    display_reset: false,  // here to show how to enable reset button
    use_old_tab_ids: true, // TODO (wolf) comment this out when you have converted tab CSS to be based on classes
    huviz_top_sel: "#HUVIZ_TOP",
    // pass in the tab_specs to override the defaults_tab_specs
    tab_specs:
    [
      {
        "cssClass": "tabs-intro scrolling_tab",
        "title": "Introduction and Usage",
        "text": "Intro",
        "moveSelector": "#contents_of_intro_tab"
      },
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
      },
      {
        "cssClass": "tabs-credit scrolling_tab",
        "title": "Academic, funding and technical credit",
        "text": "Credit",
        "bodyUrl": "/docs/credits.md"
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
  HVZ.replace_human_term_spans('ui-widget');
});
