export const FuroInputBase = (superClass) => {

  return class extends superClass {
    constructor(props) {
      super(props);

      this._sharedStyle = `
        :host {
          display: inline-block;
          position: relative;
          font-size: 12px;
          box-sizing: border-box;
          margin: 0 0 14px 0;
          padding: 8px 0 2px 0;
          height: 28px;      
           
        }
        :host *{
        font-family: "Roboto", "Noto", sans-serif;
        line-height: 1.5;
        }
        
        :host([error]) .border{
         border-color: red;
          border-width: 1px;
        }
        
        input {
          border: none;  
          background: 0 0;
          font-size: 12px;
          margin: 0;
          padding: 0;
          width: 100%;
          text-align: left;
          color: inherit;
          outline: none;
        }
 
 

        .border{
        position: absolute;
        width: 100%;
        height: 1px;
        top:28px;
          border: none;
          border-bottom: 1px solid rgba(0, 0, 0, .12);
        }
        

        .borderBig{
        position: absolute;
        width: 100%;
        height: 1px;
        top:29px;
          border: none;
          border-bottom: 1px solid rgba(0, 0, 0, .12);
        }
        
        :host(:focus-within) .border{
          border-color: var(--app-primary-color,#3f51b5);
          border-width: 1px;
        }
        
        label {
          position: absolute;        
          top: 8px;
          color: rgba(0, 0, 0, .26);
          font-size: 12px;             
          pointer-events: none;
          display: block;
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
          text-align: left;
        }

        label[float="true"] {
          color: #3f51b5;
          font-size: 10px;
          top: -4px;
          visibility: visible;
        }

        * {
          transition: all 150ms ease-out;
        }
        
        .hint{
          position: absolute;
          top: 30px;
          font-size: 10px;
          color:transparent;
          white-space: nowrap;         
          pointer-events: none;

        }
        :host(:focus-within) .hint{
          color: var(--app-hint-color);
          transition: all 550ms ease-in;
        }
`;

    }


    static get properties() {
      return {
        noTypecheck: {type: Boolean, attribute: 'no-typecheck'},
        error: {type: Boolean, reflect: true},
        /**
         * Der eingegebene String
         */
        value: {
          type: String
        },
        /**
         * Label für das Feld
         */
        label: {
          type: String,
          attribute: true
        },
        /**
         * Setze den Fokus automatisch auf dieses Feld
         */
        autofocus: {
          type: Boolean
        },
        /**
         * helper für das label
         */
        _float: {
          type: Boolean
        },
        /**
         * hint
         * Hinweistext für das Feld
         */
        hint: {
          type: String,
        },
      };
    }

    _init() {
      this._float = false;
      this.noTypecheck = false;
      this._label = this.label;

      this._FBPAddWireHook("--inputInput", (e) => {
        if (this.field) {
          this.field.set(e.value);
        }

        this.value = e.value;
      });
    }

    set value(v) {
      this._float = !!v;
      this._value = v;
    };

    get value() {
      return this._value;
    }


    firstUpdated() {
      super.firstUpdated();
      this._init();
    }


    bindData(d) {
      if (d === undefined) {
        console.warn("Invalid binding ")
        console.log(this);
        return
      }

      this.field = d;
      this.error = false;
      // label auf attr ist höher gewichtet
      if (!this.label) {
        this._label = this.field._meta.label;
      } else {
        this._label = this.label;
      }

      this.hint = this.field._meta.hint;
      this.value = this.field.value;

      this._FBPTriggerWire('--value', this.field.value);

      //mark incomming error
      if (!this.field._isValid) {
        this.error = true;
        this.hint = this.field._validity.message;
      }

      this.field.addEventListener('field-value-changed', (e) => {
        // updates wieder einspielen
        this._FBPTriggerWire('--value', e.detail.value);

        // label auf attr ist höher gewichtet
        if (!this.label) {
          this._label = this.field._meta.label;
        } else {
          this._label = this.label;
        }


        this.hint = this.field._meta.hint;
        this.value = this.field.value;
        this.requestUpdate()
      });


      this.field.addEventListener('field-became-invalid', (e) => {
        // updates wieder einspielen
        this.error = true;
        this._oldhint = this.hint;
        this.hint = this.field._validity.message;
      });

      this.field.addEventListener('field-became-valid', (e) => {
        // updates wieder einspielen
        this.error = false;
        this.hint = this._oldhint;
      });


      /**
       if (!this.noTypecheck && this.field._spec.type == "date") {
      console.warn("du solltest kein type input feld für datum verwenden, setze no-typecheck", this);
    }
       */
    }


    /**
     * Setze den Fokus auf dieses Element
     */
    focus() {
      this._FBPTriggerWire('--focusReceived')
    }

    set autofocus(v) {

      this.focus()

    }

  }
};
