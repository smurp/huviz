/*
 * These SettingsWidget classes used to be in src/huviz.js nee src/huviz.coffee
 */

class SettingsWidget {
  constructor(huviz, inputElem, state) {
    this.huviz = huviz;
    this.inputElem = inputElem;
    this.id = unique_id('widget_');
    this.inputJQElem = $(this.inputElem);
  }

  wrap(html) {
    $(this.inputElem).wrap(html);
  }
}

class UsernameWidget extends SettingsWidget {
  static initClass() {
    // https://fontawesome.com/v4.7.0/examples/#animated explains animations fa-spin (continuous) and fa-pulse (8-step)
    this.prototype.state_to_state_icon = {
      bad: 'fa-times', // the username has been tried and failed last use
      good: 'fa-check', // the username has been tried and succeeded last use
      untried: 'fa-question', // a username has been provided but not yet tried
      trying: 'fa-spinner fa-pulse', // performing a lookup with a username which might be bad or good
      empty: 'fa-ellipsis-h', // no username present
      looking: 'fa-map-marker-alt fa-spin' // performing a lookup with a known good username
    };
    this.prototype.state_to_color = {
      bad: 'red',
      good: 'green',
      untried: 'orange',
      trying: 'orange',
      empty: 'grey',
      looking: 'green'
    };
  }

  constructor() {
    super(...arguments);
    this.wrap(`<div id="${this.id}" class="geo_input_wrap"></div>`); //  style="border:2px solid; padding:2px
    //@inputElem.setAttribute('style','border:none')
    this.widgetJQElem = $('#'+this.id);
    this.widgetJQElem.prepend("<i class=\"userIcon fa fa-user-alt\"></i><i class=\"stateIcon fa fa-question\"></i>");
    this.stateIconJQElem = this.widgetJQElem.find('.stateIcon');
    this.userIconJQElem = this.widgetJQElem.find('.userIcon');
    this.set_state('empty');
  }

  set_state(state) {
    if (false && this.state && (this.state === state)) {
      console.log("not bothering to change the state to",state,"cause it already is");
      return;
    }
    this.state = state;
    console.info(this.constructor.name, "state:", state, 'username:', this.inputJQElem.val());
    const stateIcon = this.state_to_state_icon[state];
    this.stateIconJQElem.attr('class', "stateIcon fa " + stateIcon);
    const color = this.state_to_color[state];
    this.widgetJQElem.css('border-color',color);
    this.widgetJQElem.css('color',color);
  }
}
UsernameWidget.initClass();

class GeoUserNameWidget extends UsernameWidget {
  constructor() {
    super(...arguments);
    this.stateIconJQElem.on('click', this.huviz.show_geonames_instructions);
    this.userIconJQElem.on('click', this.huviz.show_geonames_instructions);
  }
}

// export {SettingsWidget, UsernameWidget, GeoUserNameWidget}; // TODO convert to module
