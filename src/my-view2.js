/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import { PolymerElement, html, } from '@polymer/polymer/polymer-element.js';
import './shared-styles.js';

///
class MyView2 extends PolymerElement {

  static get template() {
    return html`
      <style include="shared-styles">
        :host {
          display: block;
          padding: 10px;
        }
      
        label {
          display: block;
          margin-right: 10px;
          color: black;
          font-size: 17px;
          font-weight: 400;
        }

        label span:first-child {
          display: inline-block;
          width: 100px;
          min-width: 100px;
          padding-right: 5px;
          box-sizing: border-box;
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
          width: 120px;
          height: 40px;
          margin-top: 20px;
          padding: 10px;
          background-color: #4285f4;
          color: white;
          cursor: pointer;
        }

        main {
          width: 100%;
          max-width: 1150px;
          height: 90vh;
          max-height: 90vh;
        } 

        main:focus-visible {
         outline: none !important;
        } 

        main > div.container {
        position: relative;
        display:flex;
        flex-direction: column;
        height: 90vh; /* account for statusBarHeight */
        width: 100%; /* percentage of the container the app is placed in */
        max-width: 1150px;
        justify-content: space-between;
        overflow: hidden;
        font-family: "arial,sans-serif";      
      }

      main:not(.touch) > div.container {
        height: 90vh;
        max-height: 90vh; /* leave 680 for controls*/
      }

      article[aria-label="puzzle game"] {
        display: flex;
        width: 100%;  /* relevant to the main div */        
        max-width: 100%;
        height: 100%;
        max-height: 100%;
        min-height: 100%;   
        justify-content: center; /*along the main axis */
      }

      main:not(.touch) article[aria-label="puzzle game"]{
        flex-direction: 'column';        
      }

      main:not(.touch) article[aria-label="puzzle game"].row {
        flex-direction: 'row';
      }

      main.touch article[aria-label="puzzle game"] {
        height: auto;  /* for touch this is defined by puzzle grid height = 55vh*/
        max-height: auto;
        min-height: auto;
      }
     
      /* for touch and not-touch */
      main section[aria-label="puzzle grid"] {
        position: relative;
      }

      main:not(.touch) section[aria-label="puzzle grid"] {
        flex-basis:100%;
        max-width:  100%;
        /* height: 60%;
        max-height:  calc(100% - 35%);
        min-height:  60%; */
        overflow: hidden;
      }     
      
      main:not(.touch) article[aria-label="puzzle game"].row section[aria-label="puzzle grid"] {
        flex-basis:55%;
        max-width: 501px;
        height: 100%;
        max-height: 100%;
        min-height: 100%;
      }

      main.touch section[aria-label="puzzle grid"] {
        height: 52vh; /*was 55vh, 60vh; */
        flex-basis: 100%; /* mobile first */
        max-width: 100%;
        overflow: hidden;
      } 

      main:not(.touch) section[aria-label="puzzle clues"] {
        flex-basis: 100%; /* same as grid */
        max-width: 100%;
        height: 35%;
        max-height: 35%;
        min-height:35%;
      }

      main:not(.touch) article[aria-label="puzzle game"].row section[aria-label="puzzle clues"] {
        flex-basis: 40%;
        max-width:  40%;
        height: 100%;
        max-height: 100%;
        min-height: 100%;
      }

      .board {
        position: absolute; /* RELATIVE TO: section[aria-label="puzzle grid"] */
        box-sizing: border-box;
        transition: transform 0s ease-in-out 0s;
        transform: translate(0px, 0px) scale(1);
        touch-action: none;
        user-select: none;
        -webkit-user-drag: none;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
      }

      main:not(.touch) .board {
        height: 100%;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
      }

      svg {
        display: block;
        width: 100%;
        max-width: 100%;       
        max-height: 100%;
        user-select: none;
      }

      main:not(.touch) svg {
        height: 501px;
        max-height: 100%;
      }

      svg text {    
        font-weight: "100";
        font-family: 'inherit';
        pointer-events: none;
      }
      
      svg rect {
        -webkit-tap-highlight-color: transparent;     
      }
        
      svg path {
        user-select: none;
      }
        
      svg:focus, svg rect:focus {
        outline: none;
      }
        
      svg rect::-moz-focus-inner {
        outline: none;
      }

      main:not(.touch) .scrolls:not([hidden]) {
        display: flex;
        justify-content: space-around;
        max-height: 100%; /* percentage of clues section */
        margin-bottom: 5px;
        margin-left: 1vw;
        box-sizing: border-box;
      }

      main:not(.touch) .scrolls:not([hidden]) > div {
        margin-left: 5px;
        flex: 1 1 50%;
        max-width: 50%;
        box-sizing: border-box;
      }

      main:not(.touch) .scrolls:not([hidden]) h4 {
        width: 95%;
        margin: 0px;
        /* padding-bottom: 3px; */
        text-transform: uppercase;
        border-bottom: 1px solid rgb(204, 204, 204);
        color: black;
      }

      main:not(.touch) .scrolls:not([hidden]) ol {
        height: calc(100% - 60px);
        min-height: calc(100% - 60px);
        max-height: calc(100% - 60px);
        padding-inline-start: 0px;
        padding-left: 0px;
        overflow-y: scroll;
        list-style-type: none;
        font-size: inherit;
        box-sizing: border-box;
      }

      main:not(.touch) .scrolls:not([hidden]) ol::-webkit-scrollbar {
        width: 8px;
      }

      main:not(.touch) .scrolls:not([hidden]) ol::-webkit-scrollbar {
        width: 11px;
        border-radius: 3px;
        background-color:#ddd;
      }
      
      main:not(.touch) .scrolls:not([hidden]) ol::-webkit-scrollbar-thumb {
        background: #aaa;
        border-radius: 3px;
      }

      main:not(.touch) .scrolls:not([hidden]) ol li {
        border-left: 10px solid transparent;
        cursor: pointer;
        display: flex;
        padding-right: 1vw;
        box-sizing: border-box;
      }

      main:not(.touch) .scrolls:not([hidden]) ol li.activeClue {
        border-left: 10px solid transparent;
        cursor: pointer;
        display: flex;
        background-color: lightblue;
      }
        
      main:not(.touch) .scrolls:not([hidden]) ol li.highlightedClue {
        border-color: lightblue;
      }
        
      main:not(.touch) .scrolls:not([hidden]) ol li span {
        font-family: 'Libre Franklin', sans-serif;
        line-height: 1.1;
        padding: 5px 1px;
        background: transparent;
        letter-spacing: 0.5px;
        font-size: 0.85rem; 
        word-break: break-word;   
        color: black;
      }
        
      main:not(.touch) .scrolls:not([hidden]) ol li > span:first-child {
        font-weight: bold;
        width: 24px;
        text-align: right;
        padding-right: 5px;
        box-sizing: border-box;
      }
        
      main:not(.touch) .scrolls:not([hidden]) ol li > span:nth-child(2) {
        width: calc(100% - 24px);
      }  

      #toolbar:not([hidden]) {
        
      }

      .clueEdit {
        display: flex;
        flex: 1;
        /* max-width: 400px; */
        padding-left: 35px;
        background-color: lightblue;
        justify-content: start;
        align-items: center;
        color: #444;
      }

      .clueEdit span {
        display: inline-block;
        width: 90px;
        padding-left: 5px;
        font-weight: bold;
        text-transform: uppercase;
        box-sizing: content-box;
        font-size: 15px;
      }

      .clueText {
        flex-basis: 400px;
        display: flex;
        height: 35px;
        padding-left: 5px;
        align-items: center;
        margin-left: 10px;
        border: solid 1px black;
        cursor: pointer;
      }

      .modal {
        width: 100%;
        height: 100%;
        display: flex;
        position:  absolute;
        top: 50px;
        z-index: 2;
      }

      .modal > div {
        width: 500px;
        height: 500px;
      }

      .modal:before {
        content: "";
        width: 100%;
        height: 100%;
        position: absolute;
        z-index: -1;
        background: lightgray;
      }

    </style>

      <div class="card">
        <!-- <div class="circle">2</div> -->
        <h1>Create</h1>
        <form id="dimentions" on-submit="handleSubmit">
          <label>
            <span>Dimentions:</span>          
            <select name="options" on-change="handleSelect">
              <option value="15">15 x 15</option>
              <option value="23">23 x 23</option>
              <option value="">Other</option>
            </select>
          </label>
          <div id="setDims" hidden>
            <label>
              <span>Width: </span>
              <input name="width" type="number" min="10" max="23" on-change="handleKeydown" on-keydown="handleKeydown">
          </label>
            <label>
              <span>Height:</span>
              <input name="height" type="number" min="10" max="23" disabled>
          </label>
          </div>
          <div>
            <input type="submit">
          </div>

          <input type="hidden" name="selectedDim" value="15">

        </form>

        <div id="toolbar" hidden>
          <div>
            <button id="new-grid" type="button" data-tooltip="Add Black Cell" on-click ="toggleConstraint">&#9632;</button>
            <button id="generate-solution" type="button" data-tooltip="Generate Solution" on-click ="generate">&#128270;</button>
            <button id="re-try" type="button" data-tooltip="Generate Solution" on-click ="edit">&#128472;</button>
          </div>
          <div class="clueEdit">
            <!-- https://polymer-library.polymer-project.org/2.0/docs/devguide/model-data#notify-path-->
            <span>{{action.selectedClue}}</span>
            <!--<span>{{action.selectedClueText}}</span> -->
            <div contenteditable='true' class="clueText" textContent="{{action.selectedClueText}}" on-keydown="addClueOnEnter"></div>
            <button on-click ="addClue">Add Clue</button>
          </div>
        </div>

        <main id='puzzle' tabindex="0" hidden>         

          <div class="container">

            <article aria-label="puzzle game">

              <section aria-label="puzzle grid">
                  <div class="board">
                      <svg viewBox="0 0 501 501" xmlns="http://www.w3.org/2000/svg" role="grid"
                          aria-labelledby="id-grid-layout">
                          <title id="id-grid-layout">Puzzle Grid</title>
                      </svg>
                  </div>
              </section>

              <section hidden aria-label="puzzle clues">
                  <div class="scrolls" hidden>
                  </div>
              </section>

            </article>

          </div>

        </main>

        <div class="modal">
            <div>
              <h1>Words you want to Exclude</h1>
            </div>
        </div>

      </div>
    `;
  }

  
  static get properties() {
    return {
      action: {
        type: Object,
        value: {selectedClue: 'one'},
        notify: true,
        // reflectToAttribute: true,
        observer: '_activeChanged'
      }
    }
  }

  constructor() {
    super();
    this.actionInstance;
    this.gridFile = '6';
    this.constraints;
    // only contain for the updates not the entire lists
    this.solution = new Map();
    this.clues = new Map();   
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
         // Add html5 form validation
        // getElementById
        this.$.dimentions.elements.width.setAttribute('required', 'required');
      } else {
        customDimsDiv.setAttribute('hidden', true);
        // getElementById
        this.$.dimentions.elements.width.removeAttribute('required');
        this.$.dimentions.elements.selectedDim.value = value;
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
        this.$.dimentions.elements.selectedDim.value = value;
      }  else {
          height.value = null;
          width.classList.add('error');
        }
    }

    if( (evt.data && /^\d{1}$/.test(evt.data) ) || (evt.key && /^\d{1}$/.test(evt.key)) ) {//iff input event, and we are inputing a digit
      update();    
    } else if(evt.type == 'keydown' && evt.key == 'Backspace') {
      update();
    } else if(evt.type == 'change') {
      update();
    } 

  }

  handleSubmit(evt) {
    evt.preventDefault();
    // clear previously created content
    this.actionInstance = null;
    this.constraints = null;   
    this.createView();    
  }

  // creates
  createView() { 
    // is this only imported once?
    return Promise.all([import('./component.js'), import('./helper.js')])
    .then(([view, helper]) => {

      this.helper = helper;

      // clear any contents of the svg
      const svg = this.shadowRoot.querySelector('svg');
      const scrolls = this.shadowRoot.querySelector('.scrolls');

      // this keeps the eventlistener on svg?
      svg.parentNode.replaceChild(svg.cloneNode(false), svg);

      // this will remove childNodes AND their eventListeners! (innerHTML doesn't remove the eventListeners)
      this.helper.removeAllChildNodes(scrolls);

      // remove previous listeners
      if(this.dependencies) {
        this.toggleDependencies(true);
      }
      
      const elements = Array.prototype.slice.call(this.$.dimentions.elements, 0);
      const [selectedDimElement]  = elements.filter((el) => el.type == 'hidden');
      const dim = parseInt(selectedDimElement.value);

      this.$.puzzle.removeAttribute('hidden');
      this.$.toolbar.removeAttribute('hidden');

      let crossword;      
      if(this.actionInstance) {
        crossword = this.actionInstance.crossword;       
      }

      const component = this;
      return view.init(component, [dim,dim], crossword);
    })
    .then(({dependencies, actionInstance}) => {
      // console.log(dependencies, actionInstance)
      this.actionInstance = actionInstance;
      this.dependencies = dependencies;     

      // if we fetched the grid and haven't saved it yet
      // create a copy
      this.constraints = [...actionInstance.crossword.constraints]; 
      // used in HTML    
      this.action = actionInstance;

      this.manageClicks();

      return actionInstance;
      
    });   

  }

  // create new action since we changed the variables
  toggleConstraint(evt) {
    const selected = this.actionInstance.selected;
    const cellId = this.helper.getCellNumber(selected);
   
    // toggle     
    if(this.constraints) {
      const existingIndex = this.constraints.findIndex((id) => id == cellId + 1);
      if(existingIndex > -1) {
        this.constraints.splice(existingIndex, 1);
      } else {
        this.constraints.push(cellId + 1);
      }      
    } else {
      this.constraints = [];
      this.constraints.push(cellId + 1);
    }
    // make the change
    this.createView().then((actionInstance) => {

       // We must check that the previous variables still exist after we change the constraints
       const vars = Array.from(actionInstance.crossword.variables)
       const clueKeysArray = Array.from(this.clues.keys());
       const solutionKeysArray = Array.from(this.solution.keys());

       // must create copy of the actionInstance clues and solution, but also keep the rerence to the variables(?)
       for(let k of clueKeysArray) {
          // Iff only the length has changed
         const c = vars.find(v => ( (v.i == k.i) &&(v.j == k.j) &&(v.direction == k.direction))  );
         // replace
         if(c) {
           this.clues.set(c, this.clues.get(k))
         }
         // delete the previous variable
         this.clues.delete(k)
       }

       for(let l of solutionKeysArray) {
         // if only the length has changed
         const c = vars.find(v => ( (v.i == l.i) &&(v.j == l.j) &&(v.direction == l.direction))  );
         if(c) {
           // replace
           this.solution.set(c, this.solution.get(l))
         }
         this.solution.delete(l);
       }

       return this.updateView(false);
    });
  }

  toggleDependencies(remove){
    for (let listener of this.dependencies.listeners) {
      // listener is a map
      const iterator = listener.entries();
      const [target, [type, fn]] = iterator.next().value;
      if(remove){
        target.removeEventListener(type, fn, true);
      } else{
        target.addEventListener(type, fn, true);
      }
    }
  }

  manageClicks() {
    if(!this.managedClicks) {
      const clueText = this.shadowRoot.querySelector('.clueText');

      clueText.addEventListener('focus', ()=> {
        this.toggleDependencies(true)
      }, true)

      clueText.addEventListener('blur', ()=> {        
        this.toggleDependencies(false);
      }, true);
      
      this.managedClicks = true;
    } 
    this.$.dimentions.setAttribute('hidden', 'hidden')   
  }


  // updates

  updateView(updateValues) {
    return Promise.all([import('./component.js'), import('./helper.js')])
    .then(([view, helper]) => {
      this.helper = helper;
      const component = this;
      return view.update(component, updateValues);
    });
  }
  
  addClue() {
    const clueText = this.shadowRoot.querySelector('.clueText');
    const value = clueText.textContent.trim();
    const cellId = this.actionInstance.selected.id;
    const direction = this.actionInstance.direction;
    const v = this.actionInstance.cellIdToVariableDict[`${cellId}`][direction].variable;  
    const clueKeysArray = Array.from(this.clues.keys());
    const e = clueKeysArray.find(f => f.equals(v));
    if(e) {
      this.clues.set(e, value);
    }  else {
      this.clues.set(v, value);
    }
    //console.log(this.clues)
    this.updateView(true).then(() => {
      console.log('selected clue', this.action.selectedClueText);
    });
  }

  addClueOnEnter(evt) {
    if(evt.key == 'Enter'){
      evt.preventDefault();
      this.addClue();
    }
  }

  _activeChanged(action) {
    console.log('aaaa', 'active changed');    
  }

  generate() {
    // transform objects to existing variables
    const {solution} = this.actionInstance.updateValues(['solution'], [this.actionInstance.solution]);   
    const load = {
      constraints : JSON.stringify(this.actionInstance.crossword.constraints), 
      // JSON.stringify(this.actionInstance.crossword.words),
      width: this.actionInstance.crossword.width,
      height: this.actionInstance.crossword.height,
      solution: JSON.stringify(Array.from(solution)),
      exclude: JSON.stringify(['SSSS', 'NLERS']),
    }
    const rootUrl = 'http://localhost:3000';

    const options = { 
        method: 'POST',
        mode: 'cors', // request to a server of another origin if we are at a cdn
        cache: 'no-store', // *default, no-cache, reload, force-cache, only-if-cached       
        headers: {
        'Content-Type': 'application/json'
        },
        body:JSON.stringify(load)
    };

    fetch(`${rootUrl}/api/generate/`, options)
    .then(response => response.json())
    .then(({solution}) => {
      if(solution) {
        this.solution = new Map(solution);
        for(let [key,value] of this.solution) {
          this.solution.set(key, value.split('')); // make the value be an array again
        }
        console.log(this.solution);
        return this.updateView(true);
      } else {
        // @TODO ALERT THAT NO FILL SOLUTION WAS FIND
      }
      
    })
    .then(console.log, console.error);    
  }

  edit() {

  }


}

window.customElements.define('my-view2', MyView2);
