import { Crossword, Variable } from './cross.mjs';
import { not, createUserActivationAction, createUserActionEnd, mapCellInVariable } from './helper.mjs';
import { Action } from './action.mjs';
import { createKeys, extractKeyEvent, toggleKeyPressClass } from './keyboard.mjs';

export function init(shadowRoot, crosswordDimentions) {

    // const crosswordDimentions = [15, 15];

    const rootUrl = 'http://localhost:3000/'; // @TODO change to CDN?
    const gridFiles = ['api/grids/7', 'api/words/',].map((req) => `${rootUrl}${req}`);
    const solutionFiles = ['api/solutions/7', 'api/clues/7'].map((req) => `${rootUrl}${req}`);
    // @TODO how dow we choose size?
    const cellSize = 33;
    const gridSpan = 495;
    const padding = 3;
    const letterFontSize = 22;
    const indexSize = 11;
    const letterPaddingLeft = cellSize * 0.25;
    const letterPaddingTop = cellSize * 0.85;
    const wordIndexPaddingLeft = padding / 1.5;
    const wordIndexPaddingTop = padding * 3.5;


    //startOfWordCells: Array of Objects: {cell, startOfWordVariable }[]
    const startOfWordCells = []; // this is in the order of the word indices for the display cells
    // {[cellId]:{dir1:{}, dir2:{}} }
    const cellIdToVariableDict = {}

    const svgNamespace = 'http://www.w3.org/2000/svg';

    const main = shadowRoot.querySelector('main');
    const svg = shadowRoot.querySelector('svg');
    const board = shadowRoot.querySelector('.board');
    const keyboard = shadowRoot.querySelector('.keyboard');
    const touchControls = shadowRoot.querySelector('.touchControls');

    // initial check for displaying a virtual keyboard, 
    // must change if there is touch BUT also a physical keyboard
    let useTouch = navigator.maxTouchPoints > 0; // || window.screen.width < 700;  @TODO orientation change
    let checkedKeyboardAPI = false;
    if (useTouch) {
        main.classList.add('touch');
    }

    //@TODO we don't need the vocab file for displaying a generated crossword
    Promise.all(gridFiles.map(file => fetch(file)))
        .then(responses => Promise.all(responses.map(response => response.json())))
        .then(([structure, words]) => new Crossword(structure, words, ...crosswordDimentions))
        .then((crossword) => makeCells(crossword))
        .then((crossword) => makeGrid(crossword))
        .then((crossword) => addActions(crossword))
        .then((actionInstance) => displayKeyboard(actionInstance))
        .catch((err) => {
            console.log(err); // @ TODO handle the error
        })
        .then((actionInstance) =>
            Promise.all(solutionFiles.map(file => fetch(file)))
                // create clusure for actionInstance
                .then(responses => Promise.all(responses.map(response => response.json())))
                .then(data => getClues(data))
                .then(clues => displayClues(clues, actionInstance))
                .then((actionInstance) => initializeView(actionInstance))
        )
        .catch((err) => {
            console.log(err);
        });

    // REF: https://www.motiontricks.com/creating-dynamic-svg-elements-with-javascript/
    function makeGrid(crossword) {

        const cellWidth = cellSize, cellHeight = cellWidth;

        const grid = document.createElementNS(svgNamespace, 'g');
        grid.setAttributeNS(null, 'data-group', 'grid');

        // create the grid using a path element 
        const path = document.createElementNS(svgNamespace, 'path');
        let d = '';
        // create  horizontal lines
        for (let i = 0; i < crossword.height - 1; i++) {
            d += `M${padding},${((i + 1) * cellHeight) + padding} l${gridSpan},0 `;
        }
        // create  vertical lines
        for (let i = 0; i < crossword.width - 1; i++) {
            d += `M${((i + 1) * cellHeight) + padding},${padding} l0,${gridSpan} `;
        }

        path.setAttributeNS(null, 'd', d);
        path.setAttributeNS(null, 'stroke', 'dimgray');
        path.setAttributeNS(null, 'stroke-width', 1);
        path.setAttributeNS(null, 'vector-effect', 'non-scaling-stroke');

        grid.appendChild(path);

        // create the outlines
        const outline = document.createElementNS(svgNamespace, 'rect');
        outline.setAttributeNS(null, 'width', gridSpan + padding);
        outline.setAttributeNS(null, 'height', gridSpan + padding);
        outline.setAttributeNS(null, 'x', padding / 2);
        outline.setAttributeNS(null, 'y', padding / 2);
        outline.setAttributeNS(null, 'stroke', 'black');
        outline.setAttributeNS(null, 'stroke-width', padding);
        outline.setAttributeNS(null, 'fill', 'none');

        grid.appendChild(outline);

        svg.appendChild(grid);

        return crossword;

    }

    function makeCells(crossword) {
        let rectWidth, rectHeight;
        const variables = Array.from(crossword.variables);
        let counter = 1;

        const rowGroup = document.createElementNS(svgNamespace, 'g');
        rowGroup.setAttributeNS(null, 'data-group', 'cells');
        rowGroup.setAttributeNS(null, 'role', 'rowgroup');
        //console.log(variables);
        for (let i = 0; i < crossword.height; i++) {

            const row = crossword.structure[i];

            for (let j = 0; j < crossword.width; j++) {

                const cellGroup = document.createElementNS(svgNamespace, 'g');
                cellGroup.setAttributeNS(null, 'role', 'cell');

                const wordIndex = document.createElementNS(svgNamespace, 'text');
                wordIndex.setAttributeNS(null, 'x', (j * cellSize) + padding + wordIndexPaddingLeft);
                wordIndex.setAttributeNS(null, 'y', (i * cellSize) + padding + wordIndexPaddingTop);
                wordIndex.setAttributeNS(null, 'stroke', 'black');
                wordIndex.setAttributeNS(null, 'stroke-width', '0.2');
                wordIndex.setAttributeNS(null, 'style', `font-size: ${indexSize}px`);



                const letter = document.createElementNS(svgNamespace, 'text');
                letter.setAttributeNS(null, 'x', (j * cellSize) + padding + cellSize / 2);
                letter.setAttributeNS(null, 'y', (i * cellSize) + padding + letterPaddingTop);
                letter.setAttributeNS(null, 'stroke', 'black');
                letter.setAttributeNS(null, 'stroke-width', '0.3');
                letter.setAttributeNS(null, 'id', `letter-id-${i * crossword.width + j}`);
                letter.setAttributeNS(null, 'style', `font-size: ${letterFontSize}px`);
                letter.setAttributeNS(null, 'text-anchor', 'middle');

                // Help for Aria 
                const ariaLetter = document.createElementNS(svgNamespace, 'text');
                ariaLetter.setAttributeNS(null, 'aria-live', 'polite');
                ariaLetter.classList.add('hidden');
                letter.appendChild(ariaLetter);

                const cell = document.createElementNS(svgNamespace, 'rect');

                // Define an id for all cells
                cell.setAttributeNS(null, 'id', `cell-id-${i * crossword.width + j}`);

                // set up a map from Id to variables
                cellIdToVariableDict[`cell-id-${i * crossword.width + j}`] = {};

                if (!row[j]) {
                    rectWidth = cellSize, rectHeight = rectWidth;
                    cell.setAttributeNS(null, 'x', (j * cellSize) + padding);
                    cell.setAttributeNS(null, 'y', (i * cellSize) + padding);
                    cell.setAttributeNS(null, 'fill', '#333');
                    cell.classList.add('black');
                } else {
                    // get ALL the words in ALL the directions to which this cell belongs
                    variables.forEach((v) => {
                        const cellIndex = v.cells.findIndex(cell => Variable.isSameCell(cell, [i, j]));
                        if (cellIndex > -1) {
                            // set the data-variable attribute for each direction that the cell exists in a word
                            cell.setAttributeNS(null, `data-variable-${v.direction}`, `${v.i}-${v.j}`);
                            // complete the celId map
                            cellIdToVariableDict[`cell-id-${i * crossword.width + j}`][v.direction] =
                                { 'variable': v, 'cellNumber': cellIndex, 'letter': null, 'isStartOfWord': cellIndex == 0 };
                            return true;
                        }
                        return false;
                    });

                    rectWidth = cellSize, rectHeight = rectWidth; // account for stroke width of the grid
                    cell.setAttributeNS(null, 'x', (j * cellSize) + padding); // account for stroke width of the grid
                    cell.setAttributeNS(null, 'y', (i * cellSize) + padding);
                    cell.setAttributeNS(null, 'fill', '#fff'); // should be transparent? => fill = none

                    //@TODO: precalculate this??? ([direction[counter]: ])
                    const startOfWordVariable = variables.find(v => v.i == i && v.j == j);
                    if (startOfWordVariable) {
                        wordIndex.textContent = counter;
                        startOfWordCells.push({ cell, startOfWordVariable });
                        counter++;
                    }

                }
                cell.setAttributeNS(null, 'width', rectWidth);
                cell.setAttributeNS(null, 'height', rectHeight);
                cell.setAttributeNS(null, 'stroke-width', 0);

                // ARIA LABELS
                cell.setAttributeNS(null, 'role', 'gridcell');

                cellGroup.appendChild(cell); // the most deeply nested element will catch the events in the capturing phase
                cellGroup.appendChild(wordIndex);
                cellGroup.appendChild(letter);


                rowGroup.appendChild(cellGroup);
            }
        }
        svg.appendChild(rowGroup);
        return crossword;
    }

    function addActions(crossword) {
        const direction = startOfWordCells[0].startOfWordVariable.direction;
        const action = new Action(crossword, direction, startOfWordCells, cellIdToVariableDict, shadowRoot);
        const activate = action.activate.bind(action);
        const keydown = action.keydown.bind(action);
        const touchAction = action.touchAction.bind(action, board);
        const reset = action.reset.bind(action, board);


        const cell = shadowRoot.querySelector('#cell-id-0');
        action.cellSpace = cell.getBoundingClientRect();

        // ACTIVATE CELL EVENT
        if (window.PointerEvent) {
            // Add Pointer Event Listener
            // allow click event on cell to bubble upwards to the svg 
            // clicks will be captured by the svg before the cells underneath it        
            svg.addEventListener('pointerdown', activate, true);
        } else {
            // add Touch event
            svg.addEventListener('touchstart', activate, true);
            svg.addEventListener('mousedown', activate, true);
        }

        // @ TODO: DO we need this when we have a touch screen?
        // Trap device Keyboard  Events!
        document.addEventListener('keydown', (evt) => {
            evt.preventDefault();
            // @ TODO replace the target check if it is out of functional elements
            if (!action.selected && evt.key == 'Tab') {
                // send the activation event to parent (svg) via the child (cell)          
                cell.dispatchEvent(new Event(createUserActivationAction(), { bubbles: true }));
                return;
            }
            if (action.selected) {
                const { key, code, type, shiftKey } = evt;
                // send Sythesized event      
                // keydown({target: action.selected, id:action.selected.id, key, code, type, shiftKey});            
                keydown({ key, code, type, shiftKey });
            }

            //If a keydown event has been sent, then the user has keyboard => we can remove virtual keyboard and touch
            main.classList.remove('touch'); // ??????????????
            useTouch = false;

        }, true);

        // treat move event as initial touch

        board.addEventListener('touchmove', touchAction, true);// for zooming
        board.addEventListener('touchend', reset, true);

        // hanlde Move Actions for Pens on touch-enabled screens
        if (window.PointerEvent && useTouch) {

            // Add Pointer Event Listener for touch screens AND input devices other than touch (like pen)
            const penEventHandler = (evt) => {

                // https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType - touch, mouse, pen
                if (evt.pointerType == 'pen') {

                    if (evt.type == 'pointermove') {
                        evt.target.setPointerCapture(evt.pointerId);
                        touchAction(evt);
                    }
                    if (evt.type == 'pointerup') {
                        evt.target.releasePointerCapture(evt.pointerId);
                        reset(evt);
                    }

                }
            }

            board.addEventListener('pointermove', penEventHandler, true);
            board.addEventListener('pointerup', penEventHandler, true);
        }

        // return the action instance 
        return action;
    }

    async function displayKeyboard(actionInstance) {

        // check for physical keyboard - if it exists, don't use virtual keyboard FOR KEYDOWN ACTION
        // BUT what if it is a touch device that can be connected to a physical keyboard? ex microsoft surface????

        // Solution for Touch Enabled Devices that also have a physical keyboard connected    
        // Navigator.keyboard API works for DESKTOP Chrome, Edge, Opera  

        // AWAIT to find if there is a keyboard
        // Check if it is touch enabled AND is Desktop that supports the Keyboard API
        if (useTouch && navigator.keyboard) {
            // If the'navigator.keyboard' property is supported by the browser
            useTouch = checkedKeyboardAPI ? useTouch : await navigator.keyboard.getLayoutMap()
                .then(map => !Boolean(map.size)); // uses keyboard
            checkedKeyboardAPI = true;
        }

        if (!useTouch) {
            // browser supports multi-touch
            main.classList.remove('touch')


        } else {
            main.classList.add('touch');

            console.log('touch');

            // Manage keyDown events on the virtual keyboard        
            const keydown = actionInstance.keydown.bind(actionInstance);
            const moveIntoView = actionInstance.moveIntoView.bind(actionInstance);
            const reset = actionInstance.reset.bind(actionInstance, board);


            const handleKeyEvent = (evt) => {

                // handle virtual keyboar animations
                evt.target.addEventListener('animationend', toggleKeyPressClass, true);

                keydown(extractKeyEvent(evt)); // syncrhronous event inside the eventCallback
                // have to reset after moveIntoView
                moveIntoView(board); // move to where the keydown event happend if we have zoomed
            };

            Promise.resolve(createKeys(keyboard))
                .then((_) => {
                    // Add crossword keyboard Events for touch devices that don't have keyboard
                    if (window.PointerEvent) {
                        // Add Pointer Event Listener                    
                        keyboard.addEventListener('pointerdown', handleKeyEvent, true);
                    } else {
                        // add Touch Event Listener
                        keyboard.addEventListener('touchstart', handleKeyEvent, true);
                        //might be using a mouse with a touch enambled device that doesn't use a keyboard? eg. Microsoft surface?
                        keyboard.addEventListener('mousedown', handleKeyEvent, true);
                    }

                }).catch(console.error);
        }

        return actionInstance;

    }

    // @TODO Move to generation files!!!!!!!!!!!!!! 
    function getClues([{ solution }, { clues }]) {
        //console.log(solution, clues)
        const allClues = { 'across': {}, 'down': {} };
        for (let keyVariable in solution) {
            // convert to javascript class from json string
            const classFunction = new Function(`Variable = ${Variable}; return new ${keyVariable}; `)
            const variable = classFunction();
            const clue = solution[keyVariable];
            const wordIndex = startOfWordCells.findIndex(({ startOfWordVariable }) =>
                startOfWordVariable.i == variable.i && startOfWordVariable.j == variable.j)
            allClues[variable.direction][wordIndex + 1] = { [clue]: clues[clue] };
        };
        return allClues;
    }

    function displayClues(clues, actionInstance) {
        console.log(clues)
        if (!useTouch) {
            displayDesktopClues(clues, actionInstance);
        } else {
            displayTouchClues(clues, actionInstance);
        }

        return actionInstance;
    }

    function createCluesList(clues, direction) {
        const ol = document.createElement('ol');
        ol.setAttribute('data-dir', direction);

        for (let clueNumber in clues[direction]) {

            const li = document.createElement('li');
            li.setAttribute('data-li-clue-index', `${clueNumber}`);
            const numberCell = document.createElement('span');
            let numberText
            if (useTouch) {
                numberText = document.createTextNode(`${clueNumber}${direction[0]}`);
            } else {
                numberText = document.createTextNode(`${clueNumber}`);
            }
            numberCell.appendChild(numberText);
            li.appendChild(numberCell);
            const clueCell = document.createElement('span');
            const obj = clues[direction][clueNumber];
            const clueText = document.createTextNode(`${Object.values(obj)[0]}`);
            clueCell.setAttribute('data-clue-index', `${clueNumber}`);
            numberCell.setAttribute('data-clue-index', `${clueNumber}`);
            clueCell.appendChild(clueText);
            li.appendChild(clueCell)
            ol.appendChild(li);
        }
        return ol;
    }

    function activateFromCluesList(evt, parent, actionInstance) {
        const target = evt.target;
        const clueNumber = target.getAttribute('data-clue-index');

        if (!clueNumber) {
            return;
        }

        // @TODO change directly the actionInstace directin from here??
        const direction = parent.getAttribute('data-dir');

        if (actionInstance.selectedClue && actionInstance.selectedClue == `${direction}-${clueNumber}`) {
            return;
        }

        actionInstance.updateCluesList(clueNumber, direction, true);
    }

    function displayDesktopClues(clues, actionInstance) {
        const section = shadowRoot.querySelector('section[aria-label="puzzle clues"]');
        const sectionDiv = shadowRoot.querySelector('section .scrolls');
        const activationFunction = function (evt) {
            const parentElement = this;
            activateFromCluesList(evt, parentElement, actionInstance);
        };

        for (let direction in clues) {
            const div = document.createElement('div');
            const header = document.createElement('h4')
            const headerTitle = document.createTextNode(`${direction}`);
            header.appendChild(headerTitle);
            div.appendChild(header);

            const list = createCluesList(clues, direction);

            div.appendChild(list);
            sectionDiv.appendChild(div);

            if (window.PointerEvent) {
                list.addEventListener('pointerdown', activationFunction, true);
            } else {
                list.addEventListener('touchstart', activationFunction, true);
                list.addEventListener('mousedown', activationFunction, true)
            }
        }

        sectionDiv.removeAttribute('hidden');
        section.removeAttribute('hidden');
    }

    function displayTouchClues(clues, actionInstance) {
        const cluesDiv = shadowRoot.querySelector('.touchClues');
        const cluesText = shadowRoot.querySelector('.clueText .textContainer');
        const [leftnav, rightnav] = shadowRoot.querySelectorAll('.touchClues .chevron');

        const changeDirectionFunction = actionInstance.changeDirection.bind(actionInstance, actionInstance.selected);
        const keydown = actionInstance.keydown.bind(actionInstance);
        const moveIntoView = actionInstance.moveIntoView.bind(actionInstance)
        const reset = actionInstance.reset.bind(actionInstance, board);


        const navigationFunction = function (evt) {
            evt.preventDefault();
            // synthesized event: {key, code, type, shiftKey}       
            const synthesizedEvent = { key: 'Tab', code: 'Tab', type: evt.type, shiftKey: evt.target == leftnav };

            // closure
            keydown(synthesizedEvent); // this should be synchronously dispatched!

            // the selected cell sould be set synchronously by the syncrhonous keydown call above
            moveIntoView(board);
        };

        for (let direction in clues) {
            const list = createCluesList(clues, direction);

            cluesText.appendChild(list);

            if (window.PointerEvent) {
                list.addEventListener('pointerdown', changeDirectionFunction, true);
            } else {
                list.addEventListener('touchstart', changeDirectionFunction, true);
                list.addEventListener('mousedown', changeDirectionFunction, true);
            }
        }

        // add navigation action from chevrons
        if (window.PointerEvent) {
            leftnav.addEventListener('pointerdown', navigationFunction, true);
            rightnav.addEventListener('pointerdown', navigationFunction, true);
        } else {
            leftnav.addEventListener('touchstart', navigationFunction, true);
            rightnav.addEventListener('touchstart', navigationFunction, true);
            leftnav.addEventListener('mousedown', navigationFunction, true);
            rightnav.addEventListener('mousedown', navigationFunction, true);
        }

    }


    function initializeView(actionInstance) {
        // set initial active cell
        if (!actionInstance.selected) {
            const [firstWord] = startOfWordCells;
            firstWord.cell.dispatchEvent(new Event(createUserActivationAction(), { bubbles: true }));
        }
    }

}
