/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import './shared-styles.js';

class MyView2 extends PolymerElement {

  static get properties() {
    return {
      active: {
        type: Number,
        reflectToAttribute: true,
        observer: '_activeChanged'
      }
    }
  }

  static get template() {
    return html`
      <style include="shared-styles">
        :host {
          display: block;
          padding: 10px;
        }

        label {
          color: black;
          font-size: 17px;
          font-weight: 400;
        }

        select, input {
          height: 35px;
          width: 85px;
          margin-bottom: 10px;
          border: solid 1px #ddd;
          border-radius: 3px;
          font-size: 16px;
          padding: 2px;
          box-sizing: border-box;
        }
        .error {
          border: solid 2px red;
        }
        input.error:focus {
          border: solid 2px red !important;
          outline: none !important;
        }
        input[type='submit']{
          width: 100px;
          height: 40px;
          margin-top: 20px;
          padding: 10px;
          background-color: #4285f4;
          color: white;
          cursor: pointer;
        }
      </style>

      <div class="card">
        <!-- <div class="circle">2</div> -->
        <h1>Create</h1>
        <form id="dimentions" on-submit="handleSubmit">
          <label>Dimentions:</label>
          <select name="options" on-change="handleSelect">
            <option value="15">15 x 15</option>
            <option value="23">23 x 23</option>
            <option value="">Other</option>
          </select>
          <div id="setDims" hidden>
            <label>Width: 
              <input name="width" type="number" min="10" max="23" on-change="handleKeydown" on-input="handleKeydown" on-keydown="handleKeydown">
          </label>
            <label>Height: <input name="height" type="number" min="10" max="23" disabled></label>
          </div>
          <div>
            <input type="submit">
          </div>
        </form>
      </div>
    `;
  }

  constructor() {
    super();
  }
 
  ready() {
    super.ready();
    console.log('ready ');
   }

   handleSelect(evt) {
    const customDimsDiv = this.$.setDims;

    const select = evt.composedPath()[0];
    const value = select.value;

      if(!value){
        customDimsDiv.removeAttribute('hidden');
         // html5 form validation
        this.$.dimentions.elements.width.setAttribute('required', 'required');
      } else {
        customDimsDiv.setAttribute('hidden', true);
        this.$.dimentions.elements.width.removeAttribute('required');

      }
  }

  handleKeydown(evt) {
    const width = this.$.dimentions.elements.width;
    const height = this.$.dimentions.elements.height;
    let value;

    const update = () => {
      value = width.value;
      // console.log(value, width.max, width.min, value <= parseInt(width.max), value >= parseInt(width.min))
      if( (value <= parseInt(width.max)) && (value >= parseInt(width.min))) {
        height.value = value;
        width.classList.remove('error');
      }  else {
          height.value = null;
          width.classList.add('error');
        }
    }

    if(evt.data && /^\d{1}$/.test(evt.data)) {//iff input event, and we are inputing a digit
      update();    
    } else if(evt.type == 'keydown' && evt.key == 'Backspace') {
      update();
    } else if(evt.type == 'change') {
      update();
    } 

  }

  handleSubmit(evt) {
    evt.preventDefault();
    const elements = Array.prototype.slice.call(this.$.dimentions.elements, 0);
  }


}

window.customElements.define('my-view2', MyView2);
