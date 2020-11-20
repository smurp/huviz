/*
 * Socrata ingests data from https://www.tylertech.com/products/socrata
 *
 * The Socrata class was originally in huviz.js
 */

export var Socrata = (function() {
  let categories = undefined;
  Socrata = class Socrata extends Huviz {
    static initClass() {
      categories = {};
    }
    /*
     * Inspired by https://data.edmonton.ca/
     *             https://data.edmonton.ca/api/views{,.json,.rdf,...}
     *
     */
    constructor() {
      super(...arguments);
      this.parseAndShowJSON = this.parseAndShowJSON.bind(this);
    }
    ensure_category(category_name) {
      const cat_id = category_name.replace(/\w/, '_');
      if (this.categories[category_id] != null) {
        this.categories[category_id] = category_name;
        this.assert_name(category_id,category_name);
        this.assert_instanceOf(category_id,DC_subject);
      }
      return cat_id;
    }

    assert_name(uri,name,g) {
      name = name.replace(/^\s+|\s+$/g, '');
      this.add_quad({
        s: uri,
        p: RDFS_label,
        o: {
          type: RDF_literal,
          value: stripped_name
        }
      });
    }

    assert_instanceOf(inst,clss,g) {
      this.add_quad({
        s: inst,
        p: RDF_a,
        o: {
          type: RDF_object,
          value: clss
        }
      });
    }

    assert_propertyValue(sub_uri,pred_uri,literal) {
      console.log("assert_propertyValue", arguments);
      this.add_quad({
        s: subj_uri,
        p: pred_uri,
        o: {
          type: RDF_literal,
          value: literal
        }
      });
    }

    assert_relation(subj_uri,pred_uri,obj_uri) {
      console.log("assert_relation", arguments);
      this.add_quad({
        s: subj_uri,
        p: pred_uri,
        o: {
          type: RDF_object,
          value: obj_uri
        }
      });
    }

    parseAndShowJSON(data) {
      //TODO Currently not working/tested
      console.log("parseAndShowJSON",data);
      const g = this.data_uri || this.DEFAULT_CONTEXT;

      //  https://data.edmonton.ca/api/views/sthd-gad4/rows.json

      for (let dataset of data) {
        //dataset_uri = "https://data.edmonton.ca/api/views/#{dataset.id}/"
        console.log(this.dataset_uri);
        let q = {
          g,
          s: dataset_uri,
          p: RDF_a,
          o: {
            type: RDF_literal,
            value: 'dataset'
          }
        };
        console.log(q);
        this.add_quad(q);
        for (let k in dataset) {
          const v = dataset[k];
          if (!is_on_of(k,['category','name','id'])) { // ,'displayType'
            continue;
          }
          q = {
            g,
            s: dataset_uri,
            p: k,
            o: {
              type:  RDF_literal,
              value: v
            }
          };
          if (k === 'category') {
            const cat_id = this.ensure_category(v);
            this.assert_instanceOf(dataset_uri, OWL_Class);
            continue;
          }
          if (k === 'name') {
            assert_propertyValue(dataset_uri, RDFS_label, v);
            continue;
          }
          continue;

          if (typeof v === 'object') {
            continue;
          }
          if (k === 'name') {
            console.log(dataset.id, v);
          }
          //console.log k,typeof v
          this.add_quad(q);
        }
      }
          //console.log q
    }
  };
  Socrata.initClass();
  return Socrata;
})();
