import { Variable } from './cross.js';
import {
    not, isBlackCell, getCellNumber, isLetterEnglish, fillBlue, fillWhite, fillYellow, getCellVariable, isHiddenNode, getCellCoords,
    createUserActivationAction, createUserActionEnd, touchesDistance, getTouchCoordsFromEvent
} from './helper.js';

const { ACROSS, DOWN, isSameCell } = Variable;

export class Action {

    constructor(crossword, direction, startOfWordCells, cellIdToVariableDict, shadowRoot) {
        this.crossword = crossword;
        this.rafPending = false;

        this.selected;
        this.direction = direction; // initial direction setting
        this.shadowRoot = shadowRoot;

        // these are static once the crossword is complete, don't recalculate it every time  
        this.startOfWordCells = startOfWordCells;  // this is ordered by word index for the display cells    
        this.cellIdToVariableDict = cellIdToVariableDict;
        this.variables = Array.from(crossword.variables);
        const cells = [...this.shadowRoot.querySelectorAll('svg [id*="cell-id"]')];
        this.activeCells = cells.filter(not(isBlackCell));

        // handle Multi-Touch events for devices that support PointerEvents
        this.pointerCaches = {
            'pointerdown': []
        };
        this.handleActivationOnEnd;
        this.movePending = false;
        this.moveResetPending = false;

        this.zoomStart;
        this.zoomLevel = 1;
        this.zoomPending = false;
        this.zoomInLimit = 3;
        this.zoomOutLimit = 0.6;
        this.zoomResetPending = false;

        this.initialTouch;
        this.lastHoldPosition = [0, 0];
        this.position = [0, 0];


        this.selectedClue;
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
            this.cellIdToVariableDict[`cell-id-${cellNumber}`][this.direction].letter = letter;

            // activate the next empty cell
            if (this.direction == ACROSS) {
                this.activateWord(cellNumber, 1);
            } else {
                this.activateWord(cellNumber, 15);
            }

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

        if (isBlackCell(evt.target)) {
            return;
        }

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

        // Handle MULTI-TOUCH event In case the device supports Pointer Events (we have set the PointerDown event in main.mjs)
        // we don't want to activate a cell when zooming or moving
        // @TODO: SEE ALSO PointerCancel: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/pointercancel_event
        if (this.pointerCaches[evt.type] && this.pointerCaches[evt.type].length) {
            this.clearCache(evt.type);
            return;
        }

        // needed after Shadow DOM added
        // create a copy to preserve the composedPath(); 
        const target = evt.composedPath()[0];
        if (!target.id.includes('cell')) {
            return;
        }

        const { type } = evt;
        const e = { target, type };

        // non - synthetic events
        // Manage MULTI-touch event in case the device supports Pointer Events
        // the function will check if it is a PointerDown event
        // will not apply for Touch events
        this.pushEvent(e);
        // Applies to PointerDown / TouchStart / MouseDown
        // we handle activation on PointerUp / TouchEnd / MouseUp 
        // because we want to cancel the activation if the user goes on to Zoom or Move the Board after the initial Start/Down event

        this.handleActivationOnEnd = this.handleActivationEvent.bind(this, e);
        evt.target.addEventListener(createUserActionEnd(evt), this.handleActivationOnEnd, true);
    }


    // Captures Pointer, Touch and Mouse Events
    // the Function is overloaed with pointerupEvent if not called by dispatched synthetic event
    handleActivationEvent(startEvent, endEvent) {

        const el = startEvent.target.id && this.shadowRoot.querySelector(`#${startEvent.target.id}`);

        if (el && el.id.includes('cell') && not(isBlackCell)(el)) {

            if (endEvent) { // If not dispatched synthetic event
                // Remove the PoinerUp eventListener from the cell that we will activate
                this.clearCache(startEvent.type);
            }

            if (this.rafPending) {
                return;
            }

            // if the new candidate selected doesn't belong in any word in the current this.direction
            // we have to switch direction to get the only direction in which the selected belongs
            if (!getCellVariable(el, this.direction)) {
                this.changeDirection();
                return;
            }

            // doubleclicking to change direction
            // IFF not synthetic event (eg. clicked from the list of clues) == there exists an endEvent)
            if (endEvent && this.selected && el.id == this.selected.id) {
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

        refCells.forEach(fillBlue);
        fillYellow(this.selected);

        this.rafPending = false;

        // updateCluesList and make Aria Label
        const calculateWordIndexAndUpdate = this.calculateWordIndexAndUpdate.bind(this);
        // @ TODO - Move this to a Worker?
        // window.requestAnimationFrame(calculateWordIndexAndUpdate);
    }

    calculateWordIndexAndUpdate() {
        const selectedCellCoords = getCellCoords(this.selected, this.crossword.width, this.crossword.height);
        const selectedCellVariable = getCellVariable(this.selected, this.direction).split('-'); //selected.getAttribute(`data-variable-${direction}`).split('-');
        const word = this.variables.find(v => isSameCell([v.i, v.j], selectedCellVariable) && v.direction == this.direction);
        const letterIndex = word.cells.findIndex(cell => isSameCell(selectedCellCoords, cell));
        const wordNumber = this.startOfWordCells.findIndex(({ cell }) => getCellVariable(cell, this.direction) == getCellVariable(this.selected, this.direction));
        const clueNumber = wordNumber + 1;
        // make updates
        this.updateCluesList(clueNumber, this.direction);
        this.activeCells.forEach(this.makeCellAriaLabel.bind(this, word, letterIndex, clueNumber));
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
                const firstWord = this.startOfWordCells.find(({ cell, startOfWordVariable }) =>
                    getCellVariable(cell, changeDirection)); // this will return if it belongs to a variable on the change direction
                next = firstWord.cell;
                // In case next has both directions, then the direction will not switch to activate
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
            this.cellIdToVariableDict[`${cellId}`][DOWN].letter = null;
            this.cellIdToVariableDict[`${cellId}`][ACROSS].letter = null;
        }
        return ([text, hiddenText, content]);
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
            this.direction = changeDirection;
            this.selected = null; // prevent loop
            cell.dispatchEvent(new Event(createUserActivationAction()), { bubbles: true });
        }

    }

    // zoom and touchMove events
    touchAction(src, evt) {

        if (evt.cancelable) {
            evt.preventDefault();
        }

        // clear the cache for the pointerdown event that started this touchmove action, since we don't want to activate a cell
        this.clearCache('pointerdown');

        // don't Move or PinchZoom for large devices
        if (window.screen.availWidth > 900) { //@TODO Ipad PRo?
            return;
        }

        // Zooming Applies Only to Touch Events
        if (evt.touches && evt.touches.length >= 2) {

            // REF: https://developers.google.com/web/fundamentals/design-and-ux/input/touch#use_requestanimationframe
            if (this.zoomPending || this.movePending) {
                return;
            }

            if (!this.zoomStart) {
                this.zoomStart = touchesDistance(...evt.touches); // consider the first pinch  as the Start event
                return;
            }

            const zoomNext = touchesDistance(...evt.touches);
            const change = zoomNext - this.zoomStart;

            // Zoom In
            if (change > 0) {
                this.zoomLevel += change / 10;
            } else {
                // Zoom Out               
                this.zoomLevel -= (this.zoomStart - zoomNext) / 10;
            }

            // set zoom limits
            if (this.zoomLevel > this.zoomInLimit) {
                this.zoomLevel = this.zoomInLimit;
            }
            if (this.zoomLevel < this.zoomOutLimit) {
                this.zoomLevel = this.zoomOutLimit;
            }

            this.zoomPending = true;
            const f = this.pinchZoom.bind(this, src);
            window.requestAnimationFrame(f);

        } else {
            // Only for 1 finger Event = move

            // REF: https://developers.google.com/web/fundamentals/design-and-ux/input/touch#use_requestanimationframe
            if (this.zoomPending || this.movePending || this.zoomLevel == 1) {
                return;
            }

            if (!this.initialTouch) {
                this.initialTouch = getTouchCoordsFromEvent(evt);
                return;

            } else {
                const [nextX, nextY] = getTouchCoordsFromEvent(evt);
                const x = (this.position[0] + -(this.initialTouch[0] - nextX));
                const y = (this.position[1] + -(this.initialTouch[1] - nextY));


                const f = this.touchMove.bind(this, src, x, y);
                this.movePending = true;
                window.requestAnimationFrame(f);
            }

        }
    }

    pinchZoom(src) {

        if (!this.zoomPending) {
            return;
        }

        let x, y;
        if (this.zoomLevel == 1) {
            x = y = 0;
            this.lastHoldPosition = [x, y];
        } else {
            [x, y] = [...this.lastHoldPosition]; // if there was a move

            // DO WE NEED THIS?
            x += Math.abs(this.zoomLevel - this.zoomInLimit) < Math.abs(this.zoomLevel - this.zoomOutLimit) ? 0.5 : -0.5;
            y += Math.abs(this.zoomLevel - this.zoomInLimit) < Math.abs(this.zoomLevel - this.zoomOutLimit) ? 0.5 : -0.5;
            this.lastHoldPosition = [x, y];
        }

        src.style.transition = 'transform 0s ease-out 0s';
        src.style.transform = `translate(${x}px, ${y}px) scale(${this.zoomLevel})`;

        // allow next animation
        this.zoomPending = false;
        this.zoomStart = undefined;
    }

    touchMove(src, x, y) {

        if (!this.movePending) {
            return;
        }

        src.style.transition = 'transform 0s ease-out 0s';
        src.style.transform = `translate(${x}px, ${y}px) scale(${this.zoomLevel})`;
        this.lastHoldPosition = [x, y];

        // allow next move
        this.movePending = false;
    }

    moveIntoView(src) {

        // the selected cell sould be set synchronously by the syncrhonous keydown call above
        if (this.zoomLevel > 1 && !this.movePending) {
            // the position of the cell relative to the Viewport, and its height
            const { x, y, width, height } = this.selected.getBoundingClientRect();
            const keyBoardYPos = this.shadowRoot.querySelector('main.touch .touchControls').getBoundingClientRect().height; //;
            const { availWidth, availHeight } = window.screen;

            // we are moving based on the current position of the board.  This is different from when we reset!!!!!
            let [resetX, resetY] = [...this.position];

            if (x < width) {
                resetX = resetX - x + height + 10;
            } else if (x > availWidth - width) { // if we have moved from the original (right = width)
                resetX = resetX - (x - availWidth) - width - 10;
            }
            if (y < 0) {
                resetY = resetY - y + height + 10;
            }
            if (y > keyBoardYPos) {
                resetY = resetY - (y - keyBoardYPos) + height;
            }

            const moveTo = this.touchMove.bind(this, src, resetX, resetY);

            // do this here instead of reset
            this.position = [resetX, resetY];

            this.movePending = true;
            window.requestAnimationFrame(moveTo);
        }

    }


    // this may be called before a previously scheduled RAF - the Browswer goes to render steps between or after tasks
    reset(src, evt) {

        if (evt.cancelable) {
            evt.preventDefault();
        }

        // update move event when touchMove ends
        this.position = [...this.lastHoldPosition];
        this.initialTouch = undefined;
        this.zoomStart = undefined; // cancel beginning or zoom if we are resetting       

        //Schedule a reset if too large or to small
        //if too small, then reset to 1 AND center to the middle(x = y = o)
        // if too big, then reset to 2
        if (!this.zoomResetPending && (parseFloat(this.zoomLevel) < 1 || (2 <= parseFloat(this.zoomLevel)))) {

            const resetZoom = function () {
                let x, y;

                if (!this.zoomResetPending) {
                    return;
                }

                this.zoomLevel = parseFloat(this.zoomLevel) < 1 ? 1 : 2;

                // touchEnd
                if (this.zoomLevel == 1) {
                    x = y = 0;
                    this.lastHoldPosition = [x, y];
                    this.position = [...this.lastHoldPosition];
                } else {
                    [x, y] = this.lastHoldPosition;

                    // DO WE NEED THIS?
                    x += Math.abs(this.zoomLevel - this.zoomInLimit) < Math.abs(this.zoomLevel - this.zoomOutLimit) ? 0.5 : -0.5;
                    y += Math.abs(this.zoomLevel - this.zoomInLimit) < Math.abs(this.zoomLevel - this.zoomOutLimit) ? 0.5 : -0.5;
                    this.lastHoldPosition = [x, y];
                }

                src.style.transition = 'transform 0.5s ease-in 0s';
                /// x,y are taken from the closure
                src.style.transform = `translate(${x}px, ${y}px) scale(${this.zoomLevel})`;

                this.zoomResetPending = false;

            }.bind(this);

            this.zoomResetPending = true;
            window.requestAnimationFrame(resetZoom);

        }

        // Schedule a reset touch position too left or too right
        const { x, y, width, height, left, top, bottom, right } = src.getBoundingClientRect();
        const keyBoardHeight = this.shadowRoot.querySelector('main.touch .touchControls').getBoundingClientRect().height; //;
        const { availWidth, availHeight } = window.screen;
        const statusBarHeight = availHeight - window.innerHeight;

        const { width: availContentWidth, height: availContentHeight } = this.shadowRoot.querySelector('main.touch').getBoundingClientRect();

        // the reset values for the translate function are relative to the original position, considered 0, no matter the x,y values
        let [resetX, resetY] = [...this.position];


        if (!this.moveResetPending && this.zoomLevel > 1) {

            const resetMove = function () {

                if (!this.moveResetPending) {
                    return;
                }

                // originally: right = width                
                // if (left < -(width - availWidth)) { // if we have moved all the overflow to the left and passed that
                //     resetX = ((availWidth - width) / 2) - (10);
                // } else if (right > width) {
                //     resetX = Math.abs(((availWidth - width) / 2)) + 10;
                // }

                // Replace availWidth with the actual width (availContentWidth) of the main component when it is embedded in a page                
                if (left < -(width - availContentWidth)) { // if we have moved all the overflow to the left and passed that
                    resetX = ((availContentWidth - width) / 2) - (10);
                } else if (right > width) {
                    resetX = Math.abs(((availContentWidth - width) / 2)) + 10;
                }

                // if (bottom > height) { // if we moved down. originally bottom = height
                //     resetY = Math.abs((availHeight - (keyBoardHeight + 10 + statusBarHeight) - height) / 2);
                // } else if (top < -(height - statusBarHeight)) { // don't pass over half of the screen
                //     resetY = ((availHeight - statusBarHeight - height) / 2);
                // }

                // Replace availHeight with the actual height (availContentHeight) of the main component when it is embedded in a page
                if (bottom > height) { // if we moved down. originally bottom = height
                    resetY = Math.abs((availContentHeight - (keyBoardHeight + 10 + statusBarHeight) - height) / 2);
                } else if (top < -(height - statusBarHeight)) { // don't pass over half of the screen
                    resetY = ((availContentHeight - statusBarHeight - height) / 2);
                }

                // touchEnd         
                src.style.transition = 'transform 0.5s ease-in 0s';
                /// x,y are taken from the closure
                src.style.transform = `translate(${resetX}px, ${resetY}px) scale(${this.zoomLevel})`;

                this.position = [resetX, resetY];
                this.lastHoldPosition = [...this.position];

                this.moveResetPending = false;

            }.bind(this);

            this.moveResetPending = true;
            window.requestAnimationFrame(resetMove);

        }
    }


    // hanlde Multi-Touch events for devices that support PointerEvents
    // REF: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Multi-touch_interaction#miscellaneous_functions

    getCache(type) {
        // Return the cache for this event's target element
        return this.pointerCaches[type];
    }

    pushEvent(ev) {
        // Save this event in the target's cache
        const cache = this.getCache(ev.type);
        if (cache) { // applies only for pointerdown events
            cache.push(ev);
        }

    }

    clearCache(type) {
        // Remove this event from the target's cache
        let cache = this.getCache(type);

        if (!cache) {
            return;
        }

        for (let i = 0; i < cache.length; i++) {
            //@ TODO change? be careful!! REMOVE the pointerup event for type = cache[pointerdown]       
            cache[i].target.removeEventListener(createUserActionEnd({ type }), this.handleActivationOnEnd, true);
        }


        this.pointerCaches[type] = [];
        this.handleActivationOnEnd = undefined;

    }


    updateCluesList(clueNumber, direction, fromCluesList = false) {

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

        // make the change
        this.direction = direction; //@TODO change the way we do this
        this.selectedClue = `${this.direction}-${clueNumber}`;
        const active = this.shadowRoot.querySelector(`[data-dir='${this.direction}'] [data-li-clue-index ='${clueNumber}']`);
        active.classList.add('activeClue');

        if (fromCluesList) {
            const gridCell = this.startOfWordCells[clueNumber - 1].cell;
            gridCell.dispatchEvent(new Event(createUserActivationAction(), { bubbles: true })); // first send the event to the svg
        } else {
            // if we are not displaying touch
            if (this.shadowRoot.querySelector('.scrolls ol')) {
                //active.scrollIntoView({ block: 'nearest', inline: 'start' });
                active.parentNode.scrollTop = active.offsetTop - active.parentNode.offsetTop;
            } else {
                //mobile                
                // active.scrollIntoView({ block: 'nearest', inline: 'start' });
                active.parentNode.parentNode.style.top = `${-active.offsetTop}px`;
            }
        }

        window.requestAnimationFrame(addHighlight);
    }

    // animationFrame Queues don't run until all queued are completed
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
            this.shadowRoot.querySelector(`[data-dir='${previousDir}'] [data-li-clue-index ='${previousNum}']`).classList.remove('highlightedClue');
        }
        const otherDirection = this.direction == ACROSS ? DOWN : ACROSS;
        const highlightedVariable = getCellVariable(this.selected, otherDirection); //selected.getAttribute(`data-variable-${direction}`).split('-');
        const highlightedClue = this.startOfWordCells.findIndex(({ cell }) => getCellVariable(cell, otherDirection) == highlightedVariable);
        // maybe there isn't a word on the other direction
        if (highlightedClue > -1) {
            const highlightedClueNumber = highlightedClue + 1;
            const highlightedLi = this.shadowRoot.querySelector(`[data-dir='${otherDirection}'] [data-li-clue-index ='${highlightedClueNumber}']`);

            this.highlightedClue = `${otherDirection}-${highlightedClueNumber}`;
            highlightedLi.classList.add('highlightedClue');

            //@TODO SOS MAKE SURE WE ARE NOT DOING THIS ON MOBILE, BECAUSE IT WLL SCROLL TO VIEW THE OTHER DIRECTION!!!!!!!!!!!
            // highlightedLi.scrollIntoView();
            highlightedLi.parentNode.scrollTop = highlightedLi.offsetTop - highlightedLi.parentNode.offsetTop;
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
