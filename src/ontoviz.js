// OntoViz is deprecated, but left for Shawn's reference.

class OntoViz extends Huviz {
  static initClass() { //OntologicallyGrounded
    this.prototype.human_term = orlando_human_term;
    this.prototype.HHH = { // hardcoded hierarchy hints, kv pairs of subClass to superClass
      ObjectProperty: 'Thing',
      Class: 'Thing',
      SymmetricProperty: 'ObjectProperty',
      IrreflexiveProperty: 'ObjectProperty',
      AsymmetricProperty: 'ObjectProperty'
    };

    this.prototype.ontoviz_type_to_hier_map = {
      RDF_type: "classes",
      OWL_ObjectProperty: "properties",
      OWL_Class: "classes"
    };

    this.prototype.use_lid_as_node_name = true;
    this.prototype.snippet_count_on_edge_labels = false;

    // first, rest and members are produced by GreenTurtle regarding the AllDisjointClasses list
    this.prototype.predicates_to_ignore = ["anything", "comment", "first", "rest", "members"];
  }

  DEPRECATED_try_to_set_node_type(node,type) {
    // FIXME incorporate into ontoviz_type_to_hier_map
    //
    if (type.match(/Property$/)) {
      node.type = 'properties';
    } else if (type.match(/Class$/)) {
      node.type = 'classes';
    } else {
      console.log(node.id+".type is", type);
      return false;
    }
    console.log("try_to_set_node_type", node.id, "=====", node.type);
    return true;
  }
}
OntoViz.initClass();
