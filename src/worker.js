
onconnect = function(e) {
    const port = e.ports[0];  
    let solution = '';
    // port.postMessage('port')
 
    port.onmessage = function(e) {        
        try {
            solution = createSolution(e.data);
            port.postMessage(solution); 
        } catch(er) {
            port.postMessage(er);  
        }   
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
                if(letter){
                    const cellIndex = dict[cell][direction].cellNumber;
                    console.log(cellIndex)
                    const [key, value] = solution[indx];
                    value[cellIndex] = letter;
                    solution[indx] = [variable, value];
                }
            }
        }
    }
    
    return  JSON.stringify(solution);
}
