import { Crossword, Variable } from './cross.js';
import { not, createUserActivationAction, removeAllChildNodes, createSymmetricConstraints, removeSymmetricConstraints } from './helper.js';
import { Action } from './action.js';

export function init(component, crosswordDimentions, crossword, keepCell) {

    // const crosswordDimentions = [15, 15];

    let { shadowRoot, gridFile, constraints } = component;    
   
    // @TODO change to CDN?
    const rootUrl = 'http://localhost:3000/';

    const headers = { 
        mode: 'cors', // request to a server of another origin if we are at a cdn
        cache: 'no-store', // *default, no-cache, reload, force-cache, only-if-cached       
        headers: {
        'Content-Type': 'application/json'
        }
    }   
    
    // @TODO how dow we choose size?
    const gridSpan = 495;
    const cellSize = gridSpan / crosswordDimentions[0];

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

    const dependencies = {listeners: []} // {target: fn}    
   
    // if we are updating
    if(keepCell) {
        const actionInstance = component.actionInstance;
        return  Promise.resolve(actionInstance.updateValuesFromComponent(['solution', 'clues'], [component.solution, component.clues]))
        .then(({solution, clues}) => buildCluesFromInstance([{solution}, {clues}]))
        .then((clues)=> updateDesktopClues(clues, actionInstance))
        .then(() => initializeView(actionInstance));        
    } else { // we are creating
        const reqHeaders = [];
        // @TODO this is an input from the element
        const gridFiles = gridFile ? [`api/grids/${gridFile}`] : ['api/grids/empty'];
        const gridReqOptions = { method: 'GET', ...headers}; // gridFile ? { method: 'GET', ...headers} : {method: 'POST', ...headers} ;
        reqHeaders.push(gridReqOptions);

        // if we haven't already fetched the words
        if(!crossword) {
        gridFiles.push('api/words');
        reqHeaders.push({ method: 'GET', ...headers});
        }

        const fetchFiles = gridFiles.map((req) => `${rootUrl}${req}`);
        const solutionFiles = ['api/solutions/7', 'api/clues/7'].map((req) => `${rootUrl}${req}`);
        //@TODO we don't need the vocab file for displaying a generated crossword
        let promise;
        // first check that we haven't saved the constraints or haven't added any constraints
        if(!crossword && !constraints) { 
            // fetch both words and grid (either given grid or empty)
            promise = Promise.all(fetchFiles.map((file,indx) => fetch(file, reqHeaders[indx])))
            .then(responses => Promise.all(responses.map(response => response.json())));

            // @TODO we must store the id of the grid if we created one!!!!  DON'T CREATE ONE UNITL WE SAVE

        } else if (!crossword && constraints) { 
            // we have the constraints
            constraints = manageConstraints([...constraints]); 
            // fetch only the words       
            promise = fetch(fetchFiles[1], reqHeaders[1])
            .then(response => response.json())
            .then((words) => [{constraints}, words]);

        } else if (!constraints) { // we have the words, fetch the grid (either given or empty)
            promise = fetch(fetchFiles[0], reqHeaders[0])
            .then(response => response.json())
            .then((structure) => [structure, {vocab:crossword.words}]);

            // @TODO we must store the id of the grid if we created one - DON'T CREATE ONE UNITL WE SAVE !!!!

        } else { // we have the constraints and the crossword => resolve promise
            constraints = manageConstraints([...constraints]);
            promise = Promise.resolve([{constraints}, {vocab:crossword.words}]);
        }

        return promise
            .then(([structure, words]) => new Crossword(structure, words, ...crosswordDimentions))
            .then((crossword) => makeCells(crossword))
            .then((crossword) => makeGrid(crossword))
            .then((crossword) => addActions(crossword))
            // .then((actionInstance) => displayKeyboard(actionInstance))
            .catch((err) => {
                console.log(err); // @ TODO handle the error
            })
            // .then((actionInstance) =>
            //     Promise.all(solutionFiles.map(file => fetch(file, { method: 'GET', ...headers})))
            //         // // // create clusure for actionInstance
            //         // .then(responses => Promise.all(responses.map(response => response.json())))
            //         // .then(data => getClues(data))
            //         // .then(clues => displayClues(clues, actionInstance))
            //         // .then((actionInstance) => initializeView(actionInstance))
            //         // .then((actionInstance) => ({dependencies, actionInstance}))// final return to view
            //  )
            .then((actionInstance) => 
                Promise.resolve(getClues([{solution: actionInstance.solution}, {clues: actionInstance.clues}]))
                            .then((clues)=> displayClues(clues, actionInstance))
                            .then((actionInstance) => initializeView(actionInstance))
                            .then((actionInstance) => ({dependencies, actionInstance}))// final return to view
            )
            .catch((err) => {
                console.log(err);
            });
    } // if not keepCell


    function manageConstraints(constraints) {
        if(constraints.length >= crossword.constraints.length) {
            // we have added constraints => we need tocreate symmetry
            constraints = Array.from(createSymmetricConstraints([...constraints], ...crosswordDimentions));
        } else {
            // we have removed constraints => must also remove the symmetrical
            constraints = Array.from(removeSymmetricConstraints([...constraints], ...crosswordDimentions))
        }
        return constraints;
    }

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

        // if we have set constraints = false values for a cell !!!
        
        
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

                // if we have set constraints
                //console.log(crossword.structure[i].findIndex((c) => !c) > -1);
                
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
                

                cell.setAttributeNS(null, 'width', cellSize);
                cell.setAttributeNS(null, 'height', cellSize);
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
        const direction = startOfWordCells.length ? startOfWordCells[0].startOfWordVariable.direction : Variable.ACROSS;
        const action = new Action( () => component, crossword, direction, startOfWordCells, cellIdToVariableDict);
        const activate = action.activate.bind(action);
        const keydown = action.keydown.bind(action);

        const cell = shadowRoot.querySelector('#cell-id-0');

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
        dependencies.listeners.push(new Map([[svg, [createUserActivationAction(), activate]]]));

        const keydownListener  = function f(action, evt) {
            evt.preventDefault();
            // @ TODO replace the target check if it is out of functional elements
            // if (!action.selected && evt.key == 'Tab') {
            //     // send the activation event to parent (svg) via the child (cell)          
            //     cell.dispatchEvent(new Event(createUserActivationAction(), { bubbles: true }));
            //     return;
            // }
            if (action.selected) {
                const { key, code, type, shiftKey } = evt;
                // send Sythesized event      
                // keydown({target: action.selected, id:action.selected.id, key, code, type, shiftKey});            
                keydown({ key, code, type, shiftKey });
            }

            //If a keydown event has been sent, then the user has keyboard => we can remove virtual keyboard and touch
            
        }.bind(null, action);
        // @ TODO: DO we need this when we have a touch screen?
        // Trap device Keyboard  Events!
        document.addEventListener('keydown', keydownListener, true);
        dependencies.listeners.push(new Map([[document, ['keydown', keydownListener]]]));
        // return the action instance 
        return action;
    }
 

    function getClues([{ solution }, { clues }]) {
        const clueKeys = Array.from(clues.keys());
        const allClues = { 'across': {}, 'down': {} };
        for (let [keyVariable, value]  of solution) {  
            const wordIndex = startOfWordCells.findIndex(({ startOfWordVariable }) =>
                startOfWordVariable.i == keyVariable.i && startOfWordVariable.j == keyVariable.j);                
            const clue =  clueKeys.find((f) => f.equals(keyVariable));
            allClues[keyVariable.direction][wordIndex + 1] = clues.get(clue);
        };
        return allClues;
    }

    function displayClues(clues, actionInstance) {
        displayDesktopClues(clues, actionInstance);
        return actionInstance;
    }

    function createCluesList(clues, direction) {
        const ol = document.createElement('ol');
        ol.setAttribute('data-dir', direction);

        for (let clueNumber in clues[direction]) {

            const li = document.createElement('li');
            li.setAttribute('data-li-clue-index', `${clueNumber}`);
            const numberCell = document.createElement('span');
            let numberText = document.createTextNode(`${clueNumber}`);
            
            numberCell.appendChild(numberText);
            li.appendChild(numberCell);
            const clueCell = document.createElement('span');
            const obj = clues[direction][clueNumber];
            const clueText = document.createTextNode(`${obj}`);
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
            console.log('return')
            return;
        }

        actionInstance.updateCluesList(clueNumber, direction, true);
    }

    function displayDesktopClues(clues, actionInstance) {
        const section = shadowRoot.querySelector('section[aria-label="puzzle clues"]');
        const sectionDiv = shadowRoot.querySelector('section .scrolls');

        const activationFunction = function (evt) {
            const parentElement = this; // referes to the event target
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


    function buildCluesFromInstance([{ solution }, { clues }]) {
        const { startOfWordCells } = component.actionInstance;
        const clueKeys = Array.from(clues.keys());
        const allClues = { 'across': {}, 'down': {} };
        for (let [keyVariable, value]  of solution) {  
            const wordIndex = startOfWordCells.findIndex(({ startOfWordVariable }) =>
                startOfWordVariable.i == keyVariable.i && startOfWordVariable.j == keyVariable.j);                
            const clue =  clueKeys.find((f) => f.equals(keyVariable));
            allClues[keyVariable.direction][wordIndex + 1] = clues.get(clue);
        };
        return allClues;
    }

    // @TODO only update the nodes that were changes, not all the list
    function updateDesktopClues(clues) {
        for (let direction in clues) {
            for (let clueNumber in clues[direction]) {
                const clueCell = shadowRoot.querySelector(`[data-dir="${direction}"] [data-li-clue-index="${clueNumber}"] span:nth-child(2)`);
                const obj = clues[direction][clueNumber];
                removeAllChildNodes(clueCell);                
                const clueText = document.createTextNode(`${obj}`);                
                clueCell.appendChild(clueText);
            }
        }
    }
   

    function initializeView(actionInstance) { 
        // set initial active cell
        if (!actionInstance.selected) {
            const firstWord = startOfWordCells.length ? startOfWordCells[0] : {cell: shadowRoot.querySelector('#cell-id-0')};
            firstWord.cell.dispatchEvent(new Event(createUserActivationAction(), { bubbles: true }));
        }
        return actionInstance;
    }

}
