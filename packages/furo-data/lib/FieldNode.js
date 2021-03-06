import {EventTreeNode, NodeEvent} from "./EventTreeNode";
import {RepeaterNode} from "./RepeaterNode";

export class FieldNode extends EventTreeNode {

  constructor(parentNode, fieldSpec, fieldName) {
    super(parentNode);
    this.__specdefinitions = parentNode.__specdefinitions;

    this._spec = fieldSpec;
    this._meta = fieldSpec.meta || {};
    this._constraints = fieldSpec.constraints;
    this._options = fieldSpec.options;

    this._name = fieldName;
    this._value = null;
    this._pristine = true;
    this._isValid = true;


    // Build custom type if a spec exists
    if(this.__specdefinitions[this._spec.type] !== undefined ){
      this._createVendorType(this._spec.type);
    }

    // set default value from meta
    if (this._meta && this._meta.default) {

      this.defaultvalue = this._meta.default;
      this._pristine = false;
    }

    /**
     * Schaltet ein Feld auf valid, müssen wir alle Kinder oder verästelungend des Felds auf validity prüfen...
     */
    this.addEventListener("field-became-valid", (e) => {
      let v = this.__childNodes.filter(f => !f._isValid);
      if (v.length === 0) {
        this._isValid = true;
      }
    });

    /**
     * Schaltet ein Feld auf invalid ist die Entity ebenfalls invalid
     */
    this.addEventListener("field-became-invalid", (e) => {
      this._isValid = false;
    });
  }

  _createVendorType(type) {
    if (this.__specdefinitions[type]) {
      for (let fieldName in this.__specdefinitions[type].fields) {
        if (this.__specdefinitions[type].fields[fieldName].meta && this.__specdefinitions[type].fields[fieldName].meta.repeated) {
          this[fieldName] = new RepeaterNode(this, this.__specdefinitions[type].fields[fieldName], fieldName);
        } else {
          this[fieldName] = new FieldNode(this, this.__specdefinitions[type].fields[fieldName], fieldName);
        }
      }
    } else {
      console.warn(type + " does not exist")
    }
  }

  set value(val) {
    // type any
    this._createAnyType(val);

    // map<string, something> typ
    if (this._spec.type.startsWith("map<")) {
      this._updateKeyValueMap(val, this._spec.type)
    } else {
      if (this.__childNodes.length > 0) {
        for (let index in this.__childNodes) {
          let field = this.__childNodes[index];
          if (val.hasOwnProperty(field._name)) {
            field.value = val[field._name];
          }
        }
        this.dispatchNodeEvent(new NodeEvent('branch-value-changed', this, false));
      } else {
        // update the primitive type
        this.oldvalue = this.value;
        this._value = val;
        this._pristine = false;
        if (JSON.stringify(this.oldvalue) !== JSON.stringify(this._value)) {
          this.dispatchNodeEvent(new NodeEvent('field-value-changed', this, true));
        }
      }

    }
  }


  _createAnyType(val) {
    // remove if type changes
    if(this.__anyCreated && this["@type"] !== val["@type"]){
      for (let i = this.__childNodes.length - 1; i >= 0; i--) {
        let field = this.__childNodes[i];
        if (!val[field._name]) {
          field.deleteNode();
        }
      }
      this.__anyCreated = false;
    }
    if (this._spec.type === "any" && val["@type"] && !this.__anyCreated) {
      // create custom type if not exist
      // any can only be a complex type
      this._createVendorType(val["@type"]);
      this.__anyCreated = true;
      this["@type"] = val["@type"];
    }
  }


  _updateKeyValueMap(val, spec) {
    let vType = spec.match(/,\s*(.*)>/)[1];
    let fieldSpec = {type: vType};

    // create if not exist
    for (let fieldName in val) {
      if (this[fieldName] == undefined) {
        this[fieldName] = new FieldNode(this, fieldSpec, fieldName);
      }
      //update data
      this[fieldName].value = val[fieldName];
    }
    //remove unseted
    for (let i = this.__childNodes.length - 1; i >= 0; i--) {
      let field = this.__childNodes[i];
      if (!val[field._name]) {
        field.deleteNode();
      }
    }

  }

  /**
   * deletes the fieldnode
   */
  deleteNode() {

    let index = this.__parentNode.__childNodes.indexOf(this);
    this.__parentNode.__childNodes.splice(index, 1);
    delete (this.__parentNode[this._name]);

    //notify
    this.dispatchNodeEvent(new NodeEvent("this-node-field-deleted", this._name, false));
    this.dispatchNodeEvent(new NodeEvent("node-field-deleted", this._name, true));
  }

  set defaultvalue(val) {
    // type any
    this._createAnyType(val);

    if (this.__childNodes.length > 0) {
      for (let index in this.__childNodes) {
        let field = this.__childNodes[index];
        field.defaultvalue = val[field._name];
      }
    } else {

      if (this._spec.type.startsWith("map<")) {
        this._updateKeyValueMap(val, this._spec.type)
      } else {

        this.oldvalue = this.value;
        this._value = val;
        this._pristine = true;
      }


    }
  }

  get value() {
    if (this.__childNodes.length > 0) {
      this._value = {};
      // nur reine Daten zurück geben
      for (let index in this.__childNodes) {
        let field = this.__childNodes[index];
        this._value[field._name] = field.value
      }
    }
    return this._value;
  }

  _clearInvalidity() {
    if (!this._isValid) {
      this._isValid = true;
      this._validity = {};
      this.dispatchNodeEvent(new NodeEvent("field-became-valid", this))
    }
  }

  _setInvalid(error) {
    // set field empty, if not defined
    error.field = error.field || "";

    let path = error.field.split(".");
    if (path.length > 0 && path[0] !== "") {
      // rest wieder in error reinwerfen
      error.field = path.slice(1).join(".");
      if (this[path[0]]) {
        this[path[0]]._setInvalid(error);
      } else {
        console.warn("Unknown field", path, this._name)
      }
    } else {
      this._isValid = false;
      this._validity = error;
      this.dispatchNodeEvent(new NodeEvent("field-became-invalid", this));
    }


  }

  toString() {
    //todo parse format rules from _meta...
    return this._value;
  };
}
