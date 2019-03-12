      window.addEventListener('load',function(){
        document.addEventListener('touchmove', function(e) {
          e.preventDefault();
        }, false);
        document.addEventListener('dataset-loaded', function(e) {
        }, false);
        huviz = require('huviz');
        HVZ = new huviz.Orlando({
          viscanvas_sel: "#viscanvas",
          gclui_sel: "#gclui",
          skip_log_tick: true,
          dataset_loader__append_to_sel: ".unselectable",
          ontology_loader__append_to_sel: ".unselectable",
          endpoint_loader__append_to_sel: ".unselectable",
          script_loader__append_to_sel: ".unselectable",
          graph_controls_sel: '#tabs-options',
          display_hints: false, // here to show how to enable hints
          display_reset: false,  // here to show how to enable reset button
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
        //HVZ.goto_tab(2); // go to the "Commands" tab, comment out to stay on "Intro" tab

        var getMd = function(url) {
      	  var xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                xhr.send();
                var resp =  xhr.responseText;
      	  return resp;
      	};
        document.getElementById("tabs-credit").innerHTML = marked(getMd("/docs/credits.md"));
        //document.getElementById("tabs-help").innerHTML = marked(getMd("/docs/tutorial.md"));

      	window.open_help_dialog = function() {
      	  if (!(open_help_dialog && open_help_dialog.help_dialog)) {
      	    open_help_dialog.help_dialog = $('.help_content').show().dialog();
      	    open_help_dialog.help_dialog.dialog({
      	      position: {my: "left bottom", at: "left bottom", of: "html"},
      	      title: "Help",
      	      width: $("html").width()*0.24,
      	      height: $("html").height()*0.4,
      	      beforeClose: function(evt, ui) {
      		$(evt.target).parent().hide();
      		return false;
      	      }
      	    });
      	    open_help_dialog.help_dialog.dialog("open");
      	    $('#tabs').on("tabsbeforeactivate", function(evt, ui) {
                    // http://api.jqueryui.com/tabs/#event-beforeActivate
                    if (ui.newTab.hasClass('open_huviz_help')) {
                      if ($(open_help_dialog.help_dialog).parent().is(":Visible")) {
                        $(open_help_dialog.help_dialog.parent()).addClass("help_flash");
                        setTimeout(function() {
                          $(open_help_dialog.help_dialog.parent()).removeClass("help_flash");
                          },500);
                      } else {
                        $(open_help_dialog.help_dialog).parent().show();
                      }
      		return false; // suppress normal behaviour of the Help tab
      	      }
      	      return true; // non-Help tabs work normally
      	    });
      	  }
      	};
        $(".open_huviz_help").on('click', open_help_dialog);
       //open_help_dialog();
      });
