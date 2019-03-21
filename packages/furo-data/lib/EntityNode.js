import {EventTreeNode, NodeEvent} from "./EventTreeNode";
import {FieldNode} from "./FieldNode";
import {RepeaterNode} from "./RepeaterNode";

export class EntityNode extends EventTreeNode {

  constructor(parentNode, type, specs) {
    super(parentNode);

    this.__specdefinitions = specs;
    this._spec = this.__specdefinitions[type];
    this.addChildProperty("fields");
    this.fields.__specdefinitions = this.__specdefinitions;
    this._initFieldsFromSpec(this.fields, this._spec.fields);
    this._pristine = true;
    this._isValid = true;


    /**
     * Schaltet ein Feld auf valid, müssen wir alle Felder auf validity prüfen...
     */
    this.addEventListener("field-became-valid", (e) => {
      if (this.fields.__childNodes.filter(f => !f._isValid).length === 0) {
        this._isValid = true;
        this.dispatchNodeEvent(new NodeEvent("entity-became-valid", this));
      }

    });

    /**
     * Schaltet ein Feld auf invalid ist die Entity ebenfalls invalid
     */
    this.addEventListener("field-became-invalid", (e) => {
      this._isValid = false;
      this.dispatchNodeEvent(new NodeEvent("entity-became-invalid", this));
    });

    /**
     * Wird ein Wert geändert gilt das form ebenfalls nicht mehr als jungfräulich
     */
    this.addEventListener("field-value-changed", (e) => {
      this._pristine = false;
    });
  }

  /**
   * Injecten eines raw models wie bspw body oder entity einer collection
   * @param rawEntity
   */
  injectRaw(rawEntity) {
    this._rawEntity = rawEntity;
    let meta = {};

    if (rawEntity.meta) {
      meta = rawEntity.meta.fields;
    }
    this._updateFieldValuesAndMetaFromRawEntity(this.fields, rawEntity.data, meta);
    this._pristine = true;
    this._isValid = true;
    this._handleErrorsFromRawEntity(this.fields, rawEntity.error);
    this.dispatchNodeEvent(new NodeEvent("data-injected", this));
  }

  /**
   * Resete zum letzten injectet state zurück
   */
  reset() {
    if (this._rawEntity) {
      this.injectRaw(this._rawEntity);
    }
  }


  get rawEntity() {
    return this._rawEntity;
  }

  get rawData() {
    return this.getRawData();
  }


  getRawData() {
    let data = {};
    // nur reine Daten zurück geben
    for (let index in this.fields.__childNodes) {
      let field = this.fields.__childNodes[index];
      data[field._name] = field.value
    }
    return data;
  }


  _updateFieldValuesAndMetaFromRawEntity(node, data, dynamicFieldMeta) {

    for (let fieldName in data) {
      let fieldNode = node[fieldName];


      if (fieldNode._isRepeater) {
        fieldNode.removeAllChildren();
        data[fieldName].forEach((repdata, i) => {
          if (!fieldNode.repeats[i]) {
            fieldNode._addSilent();
          }
          let repMeta = {}
          if (dynamicFieldMeta[fieldName]) {
            if (dynamicFieldMeta[fieldName].fields) {
              repMeta = dynamicFieldMeta[fieldName].fields;
            }
          }

          // Werte aktualisieren
          fieldNode.repeats[i].value = repdata;
          fieldNode.repeats[i]._pristine = true;


        });
        fieldNode._pristine = true;
        fieldNode.dispatchNodeEvent(new NodeEvent("repeated-fields-changed", fieldNode.repeats, false))

      } else {
        if (fieldNode) {
          fieldNode._clearInvalidity();

          let meta = {};
          let submeta = {};


          // Kommen neue metas von draussen rein
          if (dynamicFieldMeta[fieldName]) {
            meta = dynamicFieldMeta[fieldName];
            // setze node Meta wenn neue metas gekommen sind
            // TODO @veith Metas mischen und nicht überklatschen, ev immer von spec meta aus und nicht von runtime meta

            if (meta.constraints) {
              for (let key in meta.constraints) {
                fieldNode._constraints[key] = meta.constraints[key];
              }
            }

            if (meta.meta) {
              for (let key in meta.meta) {
                fieldNode._meta[key] = meta.meta[key];
              }
            }
            if (meta.options) {
              for (let key in meta.options) {
                fieldNode._options[key] = meta.options[key];
              }
            }

            // hat es meta für subfelder
            if (meta.fields) {
              submeta = meta.fields
            }
          }


          // Werte aktualisieren
          fieldNode.value = data[fieldName];
          fieldNode._pristine = true;
        }
      }


    }
  }


  _handleErrorsFromRawEntity(fields, fieldErrors) {
    fieldErrors && fieldErrors.fields.map((error) => {
      let path = error.field.split(".");
      if (path.length > 0) {
        // rest wieder in error reinwerfen
        error.field = path.slice(1).join(".");
      }
      if (fields[path[0]]) {
        fields[path[0]]._setInvalid(error);
      }else{
        console.warn("Unknown field", path[0])
      }
    });
  }

  /**
   * Baut die Felder aufgrund der spec auf
   * @param node
   * @param fieldSpec
   * @private
   */
  _initFieldsFromSpec(node, fieldSpec) {
    for (let fieldName in fieldSpec) {
      if (fieldSpec[fieldName].meta && fieldSpec[fieldName].meta.repeated) {
        node[fieldName] = new RepeaterNode(node, fieldSpec[fieldName], fieldName);

      } else {
        node[fieldName] = new FieldNode(node, fieldSpec[fieldName], fieldName);
      }
    }
  }


  toString() {
    return this.spec.mimetype;
  };
}