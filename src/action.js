import { Variable } from './cross.js';
import {
    not, isBlackCell, getCellNumber, isLetterEnglish, fillBlue, fillBlack, fillWhite, fillYellow, getCellVariable, isHiddenNode, getCellCoords,
    createUserActivationAction, createUserActionEnd, touchesDistance, getTouchCoordsFromEvent
} from './helper.js';

const { ACROSS, DOWN, isSameCell } = Variable;



export class Action {

    constructor(component, crossword, direction, startOfWordCells, cellIdToVariableDict ) {

        this.component = component.bind(component())();

        this.crossword = crossword;
        this.rafPending = false;

        this.selected;
        this.direction = direction; // initial direction setting
        this.shadowRoot = this.component.shadowRoot;

        // these are static once the crossword is complete, don't recalculate it every time  
        this.startOfWordCells = startOfWordCells;  // this is ordered by word index for the display cells    
        this.cellIdToVariableDict = cellIdToVariableDict;
        this.variables = Array.from(crossword.variables);
        this.cells = [...this.shadowRoot.querySelectorAll('svg [id*="cell-id"]')];
        this.activeCells = this.cells.filter(not(isBlackCell));
       
        this.handleActivationOnEnd;
        this.selectedClue;
        this.selectedClueText;

        this.solution = new Map();
        this.clues = new Map();

        // add the existing values for the component
        const solutionKeysArray = Array.from(this.component.solution.keys())
        const clueKeysArray = Array.from(this.component.clues.keys())

        for (let v of crossword.variables) {

            // Check that there still exists the variable after the new view is created (might have changed the constraints)

            // after JSON.parse it is an object not a class Variable
            const solutionKey =solutionKeysArray.find((f) => f instanceof Variable ? f.equals(v) : new Variable(f).equals(v));
            const clueKey = clueKeysArray.find((f) => f.equals(v));

            // const key = {i:v.i, j:v.j, direction:v.direction, length: v.length, cells:v.cells};
            if(solutionKey) {
                this.solution.set(v, this.component.solution.get(solutionKey));
            } else {
                this.solution.set(v, [...v.cells]);
            }
            if(clueKey) {
                this.clues.set(v, this.component.clues.get(clueKey));
            } else {
                this.clues.set(v, "");
            }
        }

        // worker
        this.myWorker = new SharedWorker('./src/worker.js');
        this.myWorker.port.onmessage = (e) => {
            try {
                this.solution = new Map(JSON.parse(e.data));
                console.log(this.solution);
                //clone the solution so we can save it
                this.component.solution = new Map(this.solution); 
            } catch(err) {
                console.log(err);
            }
            console.log('Message received from worker');
        }


    }


    // Receives a keyboard Event or a synthesized event for direct call
    // synthesized event: {key, code, type, shiftKey}
    keydown(evt) {
        // if not manually sent from an event on the body 
        if (evt instanceof Event) {
            evt.preventDefault();
        }
        // actual Event or synthesized for direct call
        const target = evt.target || this.selected;
        const cellId = target.id;
        const cellNumber = getCellNumber(target);

        // edit cell content
        const char = isLetterEnglish(evt.key);

        if (char) {
            const [text, hiddenText] = this.removeExistingContent(cellId);
            // replace or add content in the cell
            const letter = evt.key.toUpperCase();
            const content = document.createTextNode(letter);
            text.appendChild(content);
            hiddenText.textContent = letter;

            // this.cellIdToVariableDict[`cell-id-${cellNumber}`][this.direction].letter = letter;
            // Add for both directions!
            for(let dir in this.cellIdToVariableDict[`cell-id-${cellNumber}`]){
                this.cellIdToVariableDict[`cell-id-${cellNumber}`][dir].letter = letter;
            }           

            // activate the next empty cell
            if (this.direction == ACROSS) {
               this.activateWord(cellNumber, 1);
            } else {
               this.activateWord(cellNumber, 15);
            }

            // add this at the end of all the updates
            this.updateLetterInWorker();
            return;
        }

        if (['Delete', 'Backspace'].includes(evt.key)) {

            const [, , existingContent] = this.removeExistingContent(cellId);

            if (evt.key == 'Backspace') {
                let next;
                if (this.direction == ACROSS) {
                    next = this.changeActiveCell(cellNumber, -1);
                } else {
                    next = this.changeActiveCell(cellNumber, -15);
                }
                // if the cell where we clicked backspace was empty, delete the previous cell contents
                if (next && !existingContent) {
                    const nextCellId = next.id;
                    this.removeExistingContent(nextCellId);
                }
            } 

            // add this at the end of all the updates
            this.updateLetterInWorker();          
            return;
        }

        // navigate actions 

        if (evt.key == 'ArrowDown') {
            // const nextId = cellNumber + crossword.width;
            this.changeActiveCell(cellNumber, this.crossword.width);
            return;
        }
        if (evt.key == 'ArrowUp') {
            // const nextId = cellNumber -crossword.width;
            this.changeActiveCell(cellNumber, -this.crossword.width);
            return;
        }
        if (evt.key == 'ArrowLeft') {
            //const nextId = cellNumber - 1;
            this.changeActiveCell(cellNumber, -1);
            return;
        }
        if (evt.key == 'ArrowRight') {
            // const nextId = cellNumber + 1;
            this.changeActiveCell(cellNumber, 1);
            return;
        }

        if (evt.key == 'Tab') {
            let next;
            // there should always exist a startOfWord cell that this.selected belongs to in this.direction
            const currentIndex = this.startOfWordCells.findIndex(({ cell }) => getCellVariable(cell, this.direction) == getCellVariable(target, this.direction));
            if (evt.shiftKey) {
                // go back 1 word
                const anchor = currentIndex == 0 ? this.startOfWordCells.length : currentIndex;
                next = this.startOfWordCells[anchor - 1];

            } else {
                // go to next word
                const anchor = currentIndex == this.startOfWordCells.length - 1 ? -1 : currentIndex;
                next = this.startOfWordCells[anchor + 1];
            }
            if (next) {
                // ensure that this.direction is always the direction in which the next exists in a word (might exist in 2)
                //this.direction = next.startOfWordVariable.direction;

                // if this.directon == down and the next cell is the start of a down word, then continue down
                // if this direction == across and the next cell is the start of an across word, then continue across
                // else change to what whatever direction the next cell starts a word
                const down = this.cellIdToVariableDict[next.cell.id][DOWN] && this.cellIdToVariableDict[next.cell.id][DOWN].isStartOfWord
                    && this.direction == DOWN && this.direction;
                const across = this.cellIdToVariableDict[next.cell.id][ACROSS] && this.cellIdToVariableDict[next.cell.id][ACROSS].isStartOfWord
                    && this.direction == ACROSS && this.direction;
                this.direction = down || across || next.startOfWordVariable.direction;

                // synchronous dispatch : https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent
                // :dispatchEvent() invokes event handlers synchronously

                // https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events#event_bubbling
                //: trigger an event from a child element, and have an ancestor catch it(svg will catch it)
                next.cell.dispatchEvent(new Event(createUserActivationAction()), { bubbles: true });
            }
            return;
        }
    }

    activate(evt) {

        evt.preventDefault();

        // if (isBlackCell(evt.target)) {
        //     return;
        // }

        // prevent cell activation when we have multi-touch
        // // https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Multi-touch_interaction#pointer_down

        // if the device doesn't support PointerEvents, then we are listening to touches
        // In this case we don't want to listen to zooming (2 fingers)
        if (evt.touches && evt.touches.length == 2) {
            return;
        }

        // Handle dispatched synthetic event for initial highlighting
        if (!evt.touches && !evt.pointerType) {
            // dispatched event
            this.handleActivationEvent(evt);
            return;
        }               

        // needed after Shadow DOM added
        // create a copy to preserve the composedPath(); 
        const target = evt.composedPath()[0];
        if (!target.id.includes('cell')) {
            return;
        }
       
        // Applies to PointerDown / TouchStart / MouseDown
        // we handle activation on PointerUp / TouchEnd / MouseUp 
        // because we want to cancel the activation if the user goes on to Zoom or Move the Board after the initial Start/Down event
        this.handleActivationOnEnd = this.handleActivationEvent.bind(this);
        evt.target.addEventListener(createUserActionEnd(evt), this.handleActivationOnEnd, true);
    }


    // Captures Pointer, Touch and Mouse Events
    // the Function is overloaed with pointerupEvent if not called by dispatched synthetic event
    handleActivationEvent(startEvent) {

        const el = startEvent.target.id && this.shadowRoot.querySelector(`#${startEvent.target.id}`);

        // if (el && el.id.includes('cell') && not(isBlackCell)(el))
        if (el && el.id.includes('cell')) {

            if (this.rafPending) {
                return;
            }

            // // if we clicked on a black cell
            // // OR if the new candidate selected doesn't belong in any word in the current this.direction
            // // In the 2nd case, we have to switch direction to get the only direction in which the selected belongs
            // // the the 1st case, we may want to remove the black cell and that's why we clicked
            if (!getCellVariable(el, this.direction)) {

                if( not(isBlackCell)(el) )  {

                    this.changeDirection();
                    return;
                }
            }

            // // doubleclicking to change direction
            if (this.selected && el.id == this.selected.id && not(isBlackCell)(el) ) {
                this.changeDirection();
                return;
            }

            this.selected = el;
            this.rafPending = true;            
            
            
            const updateCellView = this.updateCellView.bind(this);
            window.requestAnimationFrame(updateCellView);
            // allow next activation
        }
    }

    // @TODO - cache this in order not to search every time
    updateCellView(evt) {

        if (!this.rafPending) {
            return;
        }

        // get the coords of the selected = variable
        const selectedVariableCoords = getCellVariable(this.selected, this.direction); // selected.getAttribute(`data-variable-${direction}`);           

        // get the cells that belong to the same variable as the selected  
        const refCells = this.activeCells.filter(cell => getCellVariable(cell, this.direction) == selectedVariableCoords);

        // @TODO/ cache the previously selected cells  to deselect them instead of updating all the activecells
        const notInSelectedCells = this.activeCells.filter(cell => !refCells.includes(cell));
        notInSelectedCells.forEach(fillWhite);

        const blackCells = this.cells.filter(cell => !this.activeCells.includes(cell));
        blackCells.forEach(fillBlack);

        refCells.forEach(fillBlue);
        fillYellow(this.selected);

        this.rafPending = false;

        // updateCluesList and make Aria Label
        const calculateWordIndexAndUpdate = this.calculateWordIndexAndUpdate.bind(this);
        // @ TODO - Move this to a Worker?
        window.requestAnimationFrame(calculateWordIndexAndUpdate);
    }

    calculateWordIndexAndUpdate() {
        const selectedCellCoords = getCellCoords(this.selected, this.crossword.width, this.crossword.height);
        const selectedCellVariable = getCellVariable(this.selected, this.direction) && getCellVariable(this.selected, this.direction).split('-'); //selected.getAttribute(`data-variable-${direction}`).split('-');
        
        if(selectedCellVariable) {
            const word = this.variables.find(v => isSameCell([v.i, v.j], selectedCellVariable) && v.direction == this.direction);
            const letterIndex = word.cells.findIndex(cell => isSameCell(selectedCellCoords, cell));
            const wordNumber = this.startOfWordCells.findIndex(({ cell }) => getCellVariable(cell, this.direction) == getCellVariable(this.selected, this.direction));
            const clueNumber = wordNumber + 1;

            // make updates
            this.updateCluesList(clueNumber, this.direction);

            this.activeCells.forEach(this.makeCellAriaLabel.bind(this, word, letterIndex, clueNumber));
        }
    }

    makeCellAriaLabel(word, letterIndex, clueNumber, cell) {
        const wordLengthDesc = `${word.length} letters`;
        const prefix = `${this.direction[0]}`.toUpperCase();
        cell.setAttributeNS(null, 'aria-label', `${prefix}${clueNumber}: clue, Answer: ${wordLengthDesc}, Letter ${letterIndex + 1}`);
    }

    // Activate either the next cell in the same word or the 1st cell in the next word if we reached the end of the word
    // in next is a new word, it is in the same direction as the one we are on

    activateWord(cellNumber, diff) {

        // initially move by diff
        let nextId = cellNumber + diff;
        let next = this.shadowRoot.querySelector(`#cell-id-${nextId}`);

        while (this.cellIdToVariableDict[`cell-id-${nextId}`] && !isBlackCell(next) &&
            (this.cellIdToVariableDict[`cell-id-${nextId}`][ACROSS].letter ||
                this.cellIdToVariableDict[`cell-id-${nextId}`][DOWN].letter)
        ) {
            this.activateWord(nextId, diff);
            return;
        }

        // check if we reached the end of the word OR the end of the grid.  
        // If Yes, then change word either to the same direction if a word exists, or start from the beginning on the other direction
        if ((next && isBlackCell(next)) || !next) {

            // there should always exist a startOfWordCell to which this.selected belongs in this.direction
            // @TODO TEST THIS!!
            const currentWordIndex = this.startOfWordCells.findIndex(({ cell }) =>
                getCellVariable(cell, this.direction) == getCellVariable(this.selected, this.direction));

            // getCellVariable(cell, this.direction) will return if the cell belongs to a world
            // the the cell that is startOfWord but that is not a cell in the same word as the selected
            const nextWord = this.startOfWordCells.slice(currentWordIndex + 1).find(({ cell, startOfWordVariable }) =>
                getCellVariable(cell, this.direction) &&
                this.cellIdToVariableDict[`${cell.id}`][this.direction].isStartOfWord);

            if (nextWord) {
                
                next = nextWord.cell;

            } else {
                // if there are no more words in this direction, then change direction
                const [changeDirection] = [ACROSS, DOWN].filter(dir => dir !== this.direction);
                // if not nextWord in the current direction, find the word the cell belongs to a variable on the change direction
                const firstWord = this.startOfWordCells.find(({ cell, startOfWordVariable }) => getCellVariable(cell, changeDirection));
                next = firstWord.cell;
                // In case next has both directions, then the direction will not switch on activate
                // in this case, force a change of Direction
                this.changeDirection(next);
                return;
                // in case next has both directions, then the activate event will not switch
            }
        }

        // next is either the next cell in the same word or the 1st cell in the next word in the same direction
        next.dispatchEvent(new Event(createUserActivationAction()), { bubbles: true, });

        return next;
    }

    changeActiveCell(cellNumber, diff) {

        let nextId = cellNumber + diff;
        let next = this.shadowRoot.querySelector(`#cell-id-${nextId}`);
        while (next && isBlackCell(next)) {
            nextId += diff;
            next = this.shadowRoot.querySelector(`#cell-id-${nextId}`);
        }
        if (next) {
            // synchronous dispatch : https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent
            next.dispatchEvent(new Event(createUserActivationAction()), { bubbles: true, });
            // @TODO add new Event support for IE 11?
        }
        return next;
    }

    removeExistingContent(cellId) {
        const letterId = cellId.replace('cell', 'letter');
        const text = this.shadowRoot.querySelector(`#${letterId}`);
        const hiddenText = this.shadowRoot.querySelector(`#${letterId} .hidden`);

        const content = [...text.childNodes].find(not(isHiddenNode));
        if (content) {
            text.removeChild(content);
            for(let dir in this.cellIdToVariableDict[`${cellId}`]){
                this.cellIdToVariableDict[`${cellId}`][dir].letter = null;
            }           
        }
       
        return ([text, hiddenText, content]);
    }

    updateDirectionAndSelected(cell, direction) {
        this.direction = direction;
        // prevent loop in the activation event when checking for change direction, since the selected.id remains the same
        this.selected = null;
        cell.dispatchEvent(new Event(createUserActivationAction()), { bubbles: true });
    }
    // Function overload: 
    // If it is called from touch cluelist, it passed the selected and the touch event, 
    // if it is called from activateWord, it passed the newTarget
    // else it is called without arguments

    // Toggel Direction
    // @ newTarget is either passed or is presumed to be this.selected
    changeDirection(newTarget, evt) {
        // console.log(newTarget, evt);
        const [changeDirection] = [ACROSS, DOWN].filter(dir => dir !== this.direction);
        const cell = newTarget || this.selected;
        // check if the cell exist in a word on the other direction
        // if it doesn't exist in another direction, just return,
        // else, change direction
        if (getCellVariable(cell, changeDirection)) {// this will return if the cell exists in a word on the changeDirection
            this.updateDirectionAndSelected(cell, changeDirection);
        }

    }

    // we can update the clueList either by navigating the grid OR by clicking on the clueList
    updateCluesList(clueNumber, direction, fromCluesList = false) {

        // if we didn't click on a cell - we clicked on the clue list and might have changed the direction
         if (fromCluesList) {           
            const gridCell = this.startOfWordCells[clueNumber - 1].cell;
            this.updateDirectionAndSelected(gridCell, direction)
              // the rest of this function will be called from the activation event
            return;
         } else { 
             // after activation event by clicking on the grid 
             const addHighlight = this.addHighlight.bind(this);
 
             // remove previously selected style in Clues List
             if (this.selectedClue) {
                 // no new change but maybe the crossed word has changed
                 const [previousDir, previousNum] = this.selectedClue.split('-');
                 if (previousDir == direction && previousNum == clueNumber) {
                     window.requestAnimationFrame(addHighlight);
                     return;
                 }
                 this.shadowRoot.querySelector(`[data-dir='${previousDir}'] [data-li-clue-index ='${previousNum}']`).classList.remove('activeClue');
             }
 
            // notify path - synchronous
            // https://polymer-library.polymer-project.org/2.0/docs/devguide/data-system#data-flow-is-synchronous
            this.selectedClue = `${this.direction}-${clueNumber}`;
            this.component.notifyPath('action.selectedClue');

            const cluekey = this.cellIdToVariableDict[this.selected.id][this.direction].variable;
            this.selectedClueText = this.clues.get(cluekey);
            const clueText = this.shadowRoot.querySelector('.clueText');
            clueText.textContent = this.selectedClueText;
            this.component.notifyPath('action.selectedClueText');

            const active = this.shadowRoot.querySelector(`[data-dir='${this.direction}'] [data-li-clue-index ='${clueNumber}']`);
            active.classList.add('activeClue');

            // if we are not displaying touch
            if (this.shadowRoot.querySelector('.scrolls ol')) {
                //active.scrollIntoView({ block: 'nearest', inline: 'start' });
                active.parentNode.scrollTop = active.offsetTop - active.parentNode.offsetTop;
            } else {
                //mobile                
                // active.scrollIntoView({ block: 'nearest', inline: 'start' });
                active.parentNode.parentNode.style.top = `${-active.offsetTop}px`;
            }

            window.requestAnimationFrame(addHighlight);
         }
    }

    // animationFrame Queues don't run until the queu is exhausted
    // HightLight the crossed Clue for the one that is selected

    addHighlight() {
        // IF WE ARE ON MOBILE DONT'T CONTINUE // SOS SOS SOS!!!!!!!!!!!  
        const scrolls = this.shadowRoot.querySelector('.scrolls ol');
        if (!scrolls) {
            //  console.log('touch');
            return;
        }
        if (this.highlightedClue) {
            const [previousDir, previousNum] = this.highlightedClue.split('-');
            const p = this.shadowRoot.querySelector(`[data-dir='${previousDir}'] [data-li-clue-index ='${previousNum}']`);
            if(p){ // check if we haven't removed the square in an update
                p.classList.remove('highlightedClue');
            }
        }
        const otherDirection = this.direction == ACROSS ? DOWN : ACROSS;
        const highlightedVariable = getCellVariable(this.selected, otherDirection); //selected.getAttribute(`data-variable-${direction}`).split('-');
        const highlightedClue = this.startOfWordCells.findIndex(({ cell }) => getCellVariable(cell, otherDirection) == highlightedVariable);
        // maybe there isn't a word on the other direction
        if (highlightedClue > -1) {
            const highlightedClueNumber = highlightedClue + 1;
            const highlightedLi = this.shadowRoot.querySelector(`[data-dir='${otherDirection}'] [data-li-clue-index ='${highlightedClueNumber}']`);

            this.highlightedClue = `${otherDirection}-${highlightedClueNumber}`;

            if(highlightedLi) { // check if we haven't removed in an update
                highlightedLi.classList.add('highlightedClue');
                //@TODO SOS MAKE SURE WE ARE NOT DOING THIS ON MOBILE, BECAUSE IT WLL SCROLL TO VIEW THE OTHER DIRECTION!!!!!!!!!!!
                // highlightedLi.scrollIntoView();
                highlightedLi.parentNode.scrollTop = highlightedLi.offsetTop - highlightedLi.parentNode.offsetTop;
            }
        }
    }


    updateLetterInWorker() {
        console.log(this.cellIdToVariableDict)
        this.myWorker.port.postMessage([ 
                JSON.stringify(Array.from(this.solution)), 
                JSON.stringify(Array.from(this.crossword.variables)), 
                JSON.stringify(this.cellIdToVariableDict)  
        ]); 
    }


    // assumes attribute is Array with elements of type Map
    // @TODO return which values where updated!!! so we can only change those nodes in component.update
    updateValuesFromComponent(attributes, updatedValues) {
        const valueArrays = updatedValues.map((value) => Array.from(value.keys()));       
        for (let v of this.crossword.variables) {
            valueArrays.forEach((keysArray, indx) => {
                const clueKey = keysArray.find((f) => f instanceof Variable ? f.equals(v) : new Variable(f).equals(v));
                if(clueKey) {
                    this[attributes[indx]].set(v, updatedValues[indx].get(clueKey));
                }
            });
         }
         return attributes.reduce( (acc,cur) => {
                acc[cur] = this[cur];
                return acc; 
                }, 
            {} ) ;
    }

     // function bound to actionInstance
     updateCellLetters(cells) {
        for (let {cellId, letter} of cells) {
            //@ TODO make a functon of this from Action
            const [text, hiddenText] = this.removeExistingContent(cellId);
            // replace or add content in the cell
            const content = document.createTextNode(letter);
            text.appendChild(content);
            hiddenText.textContent = letter;
        }
        return this.updateCellDictionary(cells);
    } 

    updateCellDictionary(cells) {
        for (let {cellId, letter} of cells) {
            for(let dir in this.cellIdToVariableDict[cellId] ){
                this.cellIdToVariableDict[cellId][dir].letter = letter;
            }
        }      
    }

}
// The Task queue is on the opposite side of the Render steps Ιnside a Frame

// Rendering can happen in between Javascript Tasks BUT ALSO many tasks can happen before the BROWSER chooses to go to render steps

// Javascript runs first in a frame BEFORE RAF: javascript -> style -> layout -> paint !!!!!!!!!!! (javascript -> RAF -> style-> layout -> paint)
// BUT after javascript -> style -> layout -> paint, we can have another Javascript in the SAME frame

//INSIDE A FRAME: Javasript will run to completion (empty task queue??) BEFORE rendering can happen:

    // An Event Listener  callbacks are queued Tasks (not a microTask)
    // Microtasks = promises, mutationObservers:
        // Event Listener callbacks are called asyncrhonously by User Interaction 
        // Event Listener callbacks are called synchronously by javascript
    //  If we have an asyncrhonous Task (User Interaction), that means that THIS task will run to completion, before a microtask can execute
    // If we have a syncrhonous function (DispatchEvent), then the SCRIPT is on the task queue and IT will have to execute to completion
        // before we can run microtasks

    // RAF RUNS IN THE RENDER STEPS, AFTER JAVASCRIPT EXECUTION !!!!!!!!!!! (oposite side of the Event Loop from the task queue) INSIDE A FRAME => , 
        // if we had changed style with javascript before RAF,
        // then in the render steps RAF will override the javascript changes when executing its own callback
        // FRAME: Javascript -> RAF -> style -> layout -> render
