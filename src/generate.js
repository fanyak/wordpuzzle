import { Crossword, Variable } from './cross.mjs';

export class CrosswordCreator {

    constructor(crossword) {
        this.crossword = crossword;
        // The Set object lets you store unique values of any type, whether primitive values or object references such as Variable
        this.domains = new Map(); // the keys of the 
        // crossword.variables is a Set()
        for (let variable of this.crossword.variables) {
            this.domains.set(variable, [...this.crossword.words]);
        }
        this.backup = [];
        this.epochs = 0;
    }

    // create a grid with filledIn letters for all the words in the assignment
    letterGrid(assignment) {
        const letters = [];
        for (let i = 0; i < this.crossword.height; i++) {
            const row = [];
            for (let j = 0; j < this.crossword.width; j++) {
                row.push(null);
            }
            letters.push(row);
        }
        for (let [variable, word] of assignment.entries()) {
            const direction = variable.direction;
            for (let k = 0; k < word.length; k++) {
                let i = direction == Variable.DOWN ? variable.i + k : variable.i;
                let j = direction == Variable.ACROSS ? variable.j + k : variable.j;
                letters[i][j] = word[k];
            }
        }
        return letters;
    }

    // helper function to console.log the assignment
    print(assignment) {
        const letters = this.letterGrid(assignment);

        for (let i = 0; i < this.crossword.height; i++) {
            let r = '';
            for (let j = 0; j < this.crossword.width; j++) {
                if (this.crossword.structure[i][j]) {
                    r += letters[i][j] || ' ';
                } else {
                    r += ' ';
                }
            }
            console.log(r);
        }
    }

    //Enforce node and arc consistency, and then solve the CSP by backtracin search (recursion).
    solve() {
        this.enforceNodeConsistency();
        this.ac3();
        return this.backTrack(new Map());
    }

    // Update this.domains such that each variable is node-consistent.
    // Remove any values that are incosistent with a variable's unary constraints = constraints imposed by the variable itself.
    // In this case, a variable's unary constraint is the length of the word (cannot be different than the length of the variable)
    enforceNodeConsistency() {
        for (let variable of this.crossword.variables) {
            // get the available words (the domain) for this variable
            const domainWords = this.domains.get(variable);
            // updatea the value of the variable in the domains by enforcing unary constraints
            this.domains.set(variable, domainWords.filter(word => word.length == variable.length));
        }
    }

    // make variable x be arc-consistent with variable y.
    // to do so, remove values from this.domains[x] for which there is no
    // possible corresponding value for y in this.domains[y]

    // return true if a revision was made to this.domains[x]
    //return false if no revision was made
    revise(x, y) {
        let revision = false;
        // this.crossword.overlaps is a map
        const overlap = this.crossword.overlaps.get([x, y]);
        const updatedXDomain = [];
        if (overlap) {
            for (let wordX of this.domains.get(x)) {
                for (let wordY of this.domains.get(y)) {
                    if (wordX[overlap[0]] == wordY[overlap[1]]) {
                        updatedXDomain.push(wordX);
                    }
                }
            }
            if (updatedXDomain.length < this.domains.get(x)) {
                this.domains.set(x, updatedXDomain);
                revision = true;
            }
        }
        return revision;
    }

    // update this.domains such that each variable is arc consistent.
    // if the arcs parameter is not passed, begin with all the existing arcs (overlaps).
    // If the arcs parameter is passed use arcs as the list of overlaps to make consistent
    // Return true if arc consistency is enforced AND no domains are empty
    // Return false if any of the domains end up empty.
    ac3(arcs = null) {
        // this.crossword.overlaps is a Map
        let queue = arcs || Array.from(this.crossword.overlaps.keys());
        // keep a queue of the arcs
        while (queue.length) {
            // queues are used as FIFO => use pop to dequeue
            const [x, y] = queue.pop();
            // check variable identities to prevent loops
            if (x.equals(y) || !this.crossword.overlaps.get([x, y])) {
                continue;
            }
            // update this.domains.x to  make x arc consistent with y;
            const revised = this.revise(x, y);
            if (revised) {
                // should return false if a domain becomes empty
                if (!this.domains.get(x).length) {
                    return false;
                }
                // enque the rest of the neighbors of X iff x has been revised, in order to update them also
                const neighbors = this.crossword.neighbors(x); // Given a variable, return SET of overlapping variables.
                const enqueu = Array.from(neighbors).filter(neighbor => !neighbor.equals(y)).map((neighbor) => [x, neighbor]);
                queue = [...queue, ...enqueu]; // enqueue the rest of the neighbors
            }
            // if we have reached the end of the queue with no empty domains, return true
            return true;
        }
    }

    // Maintain arc-consistency during the search-backtracking process
    // variable: a Variable that has been assigned a value in the backtracking process
    // assigment: the partially completed assignment during the backtracking process so far
    // Return true if we were able to update all the neighbors whithout ending up with an empty domains
    inference(variable, assignment) {
        // if a neighbor has not been assigned a value yet,
        // then make this neighbor be consistent with the variable has been assigned a value
        const neighbors = Array.from(this.crossword.neighbors(variable));
        const neighbors_arcs = neighbors.reduce((acc, cur) => {
            if (!assignment.get(cur)) {
                acc.push([cur, variable]);// make the neighbor arc-consistent with the assigned variable
            } return acc;
        }, []);

        // in order to make the neighbors consistent with the value that the variable as been assigned
        this.domains.set(variable, [assignment.get(variable)]);

        // make all neighbors of variable be arc-consistent with variable
        // if ac3 != failure, then all the neighbors have at least 1 possible value
        if (this.ac3(neighbors_arcs)) { // returns false if we end-up with empty domains, true otherwise

            for (let v of this.domains.keys()) {
                // we must check that assignment is consistent after this in backtrack (see Base Case)
                if (this.domains.get(v).length == 1) { // if we are left with onle 1 possible value
                    assignment.set(v, this.domains.get(v)[0]);
                }
            }

            return true; //if ac3 was successful
        }

        return false;
    }

    // Return true if assignment is complete = all the crossword variables have been asssigned a value
    complete(assignment) {
        // crossword.variables is a Set()
        for (let variable of this.crossword.variables) {
            if (!assignment.has(variable)) {
                return false;
            }
        }
        return true;
    }

    // Return true if assignment is cosnsistent = words fit the variables and there are no conflicts where there are overlaps
    consistent(assignment) {

        // check that all the values are distinct
        const assignedValues = assignment.values();
        const distinctValues = new Set(Array.from(assignedValues));
        if (assignment.size != distinctValues.size) {
            console.log('non distinct values');
            return false;
        }

        // check that each assigned value has the correct length
        for (let [variable, word] of assignment.entries()) {
            if (variable.length != word.length) {
                console.log('wrong length');
                return false;
            }
        }

        //check that there is arc_consistency
        for (let [variables, overlap] of this.crossword.overlaps.entries()) {
            const [x, y] = variables;
            if (assignment.has(x) && assignment.has(y) && overlap) {
                const [index1, index2] = overlap;
                if (assignment.get(x)[index1] !== assignment.get(y)[index2]) {
                    console.log('wrong overlap');
                    return false;
                }
            }
        }

        return true;
    }

    ///////////////////////////////////////////////////// HEURISTICS ///////////////////////////////////////////////////////////////

    // Return a list of values in the domain of variable ordered by the number of values that they rule out for neihbouring variables.
    // The first value of the list is the one that rules out the least values for the neighboring variables.
    orderDomainValues(variable, assignment) {
        // we only care about the neighbors of variable that have not been already assigned
        const neighbors = Array.from(this.crossword.neighbors(variable)).filter((neighbor) => !assignment.has(neighbor));
        const yValues = [];
        for (let neighbor of neighbors) {
            const overlap = this.crossword.overlaps.get([variable, neighbor]);
            const neighborValues = this.domains.get(neighbor);
            yValues.push([overlap, neighborValues]);
        }
        const ruleOutByValue = {};
        for (let wordX of this.domains.get(variable)) {
            ruleOutByValue[wordX] = 0;
            for (let [overlap, yWords] of yValues) {
                if (overlap) {
                    const [index1, index2] = overlap;
                    const reject = yWords.filter((wordY) => wordY[index2] !== wordX[index1]);
                    ruleOutByValue[wordX] += reject.length;
                }
            }
        }
        // return a new list
        return [...this.domains.get(variable)].sort((a, b) => ruleOutByValue[a] - ruleOutByValue[b]);
    }

    // choose the variable that has the least amount of remaining values in its domain to assign next
    // if there is a tie choose the variable with the highest degree. If there is a tie any of the tied variables is acceptable
    selectUnassignedVariable(assignment) {
        const unassignedVariables = Array.from(this.crossword.variables).filter((variable) => !assignment.has(variable));
        const domainCounts = unassignedVariables.reduce((acc, cur) => {
            acc[cur] = this.domains.get(cur).length;
            return acc;
        }, {});

        // mutate the array
        unassignedVariables.sort((a, b) => domainCounts[a] - domainCounts[b]);

        // unassignedVariables is now sorted in ascending order of domain counts.
        const minCount = domainCounts[unassignedVariables[0]];
        let maxDegree = -1;
        let selectedVariable;

        // resolve domainCount ties by getting the variable with the maximum degree
        for (let v of unassignedVariables) {
            if (domainCounts[v] == minCount) {
                const degree = this.crossword.neighbors(v).size;
                if (degree > maxDegree) {
                    maxDegree = degree;
                    selectedVariable = v;
                }
            } else {
                // unassignedVariables is sorted => if a variable has larger count than the minCount, then all ther rest have also larger counts
                // ==> break
                break;
            }
        }

        return selectedVariable;
    }

    // Using Backtracking Search, tas as input a (partially) completed assignment and return a complete assigment if one is possible.
    // assignment is a mapping from variables to words
    // If no assignment is possible return null

    backTrack(assignment) {
        // limit how many times we can wait??
        this.epochs += 1;

        // Base Case for recursion
        if (this.consistent(assignment) && this.complete(assignment)) {
            return assignment;
        }

        // use the Heuristics
        const variable = this.selectUnassignedVariable(assignment);

        for (let value of this.orderDomainValues(variable, assignment)) {

            // clone the assigment
            const assignmentClone = new Map(assignment);
            // try the value of this iteration
            assignmentClone.set(variable, value);

            // check for dublicates and conflicts
            if (this.consistent(assignmentClone)) {

                // INFERENCE - OPTIONAL
                // keep the state in case the current value doesn't work
                this.backup.push(new Map(this.domains));
                // maintain arc consistency after we assign x a new value
                this.inference(variable, assignmentClone);

                // if inference != failure, then the domains and / or assignment have been updated                    

                // Recursion
                // check if we can go further with the value of this iteration
                const result = this.backTrack(assignmentClone);

                // check if at the end of the recursion the Base Case returns the assignment
                //  i.e: if result is not null = the assignment is complete
                if (result) {
                    return result;
                }

                // inference = failure, restore the wrongly updated domains
                this.domains = this.backup.pop();
            }
        }

        return null;

    }



}
