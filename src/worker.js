

onmessage = function(m) { 
    let solution = '';
    try {
        solution = createSolution(m.data);
        postMessage(solution); 
    } catch(er) {
        postMessage(er);  
    }   
}

  


function createSolution([s,v,d]) {

    const variables = JSON.parse(v);
    const solution = JSON.parse(s);
    const dict = JSON.parse(d);
    
    // this will update the solution since it is passed by reference!!!
    for (let cell in dict) {    
        for(let direction in dict[cell]) {
            const dir = dict[cell][direction]; 
            if(dir) { // if not black cell
                const l = dict[cell][direction].variable;
                const variable = variables.find((v) => v.i == l.i && v.j == l.j && v.direction == l.direction && v.length == l.length);
                const indx = solution.findIndex(([f, value]) => variable.i == f.i && variable.j == f.j && variable.direction == f.direction 
                && variable.length == l.length);
                const letter = dict[cell][direction].letter;
                const cellIndex = dict[cell][direction].cellNumber;
                const [key, value] = solution[indx];
                if(letter){ // if we have added a letter
                    value[cellIndex] = letter;
                    solution[indx] = [variable, value];
                } else {
                    // we have Erased the existing letter of the solution
                    // if it is a string and not the original array
                    if (value[cellIndex] && value[cellIndex][0] != key.cells[cellIndex][0]) {
                        value[cellIndex] = ""; // erase the existing value from the solution, since it doesn't exist any more
                        solution[indx] = [variable, value];
                    }                        
                }
            }
        }
    }
    
    return  JSON.stringify(solution);
}
