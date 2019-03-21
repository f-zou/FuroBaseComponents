import {LitElement, html} from 'lit-element';
import {EntityNode} from "./lib/EntityNode.js"


/**
 * `mora-entity`
 *
 * @customElement
 * @demo demo/form.html
 * @appliesMixin FBP
 */
class EntityObject extends (LitElement) {

  constructor() {
    super();
    this._specs = window.Env.specs;

  }

  injectRaw(jsonObj) {
    // queue inject bis entity bereit ist
    if(!this.entity){
      setTimeout(()=>{this.injectRaw(jsonObj)},0)
    }else{
      this.entity.injectRaw(jsonObj);
    }
  }

  set type(type) {
    if (this._type) {
      this._checkType(type);
    }
    this._type = type;
  }

  _checkType(type) {

    if (this._specs[type] === undefined) {
      /**
       * @event spec-error
       * Fired when spec could not be loaded
       * detail payload: {string} spec name
       */
      let customEvent = new Event('spec-error', {composed: true, bubbles: true});
      customEvent.detail = type;
      setTimeout(() => {
        this.dispatchEvent(customEvent);
      }, 0);
      console.warn("Type does not exist.", type, this, this._specs)
      return
    }

    this.entity = new EntityNode(null, type, this._specs);
    /**
     * @event entity-ready
     * Fired when
     * detail payload:
     */
    let customEvent = new Event('object-ready', {composed: true, bubbles: true});
    customEvent.detail = this.entity;
    setTimeout(() => {
      this.dispatchEvent(customEvent);
    }, 0);
  }

  static get properties() {
    return {
      /**
       * Ein Entitätenbaum mit allen Feldern
       */
      entity: {type: Object},
      /**
       * Name der Spec
       */
      type: {type: String}
    };
  }

  firstUpdated() {
    super.firstUpdated();

    // queueing
    if (this._type) {
      this._checkType(this._type);
    }

    // data objects
    this._entityFields = this.querySelectorAll("entity-field");
    console.log("todo",this._entityFields);

  }

}

window.customElements.define('entity-object', EntityObject);