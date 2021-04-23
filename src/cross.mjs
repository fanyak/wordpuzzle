// REF https://v8.dev/features/modules
class Variable {

    constructor(i, j, direction, length) {
        ///Create a new variable with starting point, direction, and length."""
        this.i = i;
        this.j = j;
        this.direction = direction;
        this.length = length;
        this.cells = [];
        for (let k = 0; k < this.length; k++) {
            this.cells.push(
                [this.i + (this.direction == Variable.DOWN ? k : 0),
                this.j + (this.direction == Variable.ACROSS ? k : 0)]
            );
        }
    }

    equals(other) {
        return (
            (this.i == other.i) &&
            (this.j == other.j) &&
            (this.direction == other.direction) &&
            (this.length == other.length)
        );
    }

    toString() {
        return `(${this.i}, ${this.j}, '${this.direction}', ${this.length})`;
    }

    intersection(other) {
        let _intersection = new Set();
        for (let elem of other.cells) {
            if (this.cells.find(cell => Variable.isSameCell(elem, cell))) {
                _intersection.add(elem);
            }
        }
        return _intersection;
    }

}

// Adding properties to the Constructor of Variable - not to the prototype
// This is a workaround to Static Methods, not supported in safari
// https://www.w3schools.com/js/js_object_constructors.asp

Variable.ACROSS = 'across';
Variable.DOWN = 'down';

Variable.isSameCell = (cell1, cell2) => {
    // console.log(cell1, cell2)
    if (cell1.length !== cell2.length) {
        return false;
    }
    for (let key of cell1.keys()) {
        if (cell1[key] != cell2[key]) { // not strict equality => want to match strings to numbers instead of parsing
            return false;
        }
    }
    return true;
};


class Crossword {
    constructor(structure, words, height, width) {
        //  Determine structure of crossword      
        const constraints = structure.constraints;
        // console.log(constraints)
        this.height = height;
        this.width = width;
        this.structure = [];
        for (let i = 0; i < this.height; i++) {
            const row = [];
            for (let j = 0; j < this.width; j++) {
                if (constraints.find(val => val == i * this.width + j + 1)) {
                    row.push(false);
                } else {
                    row.push(true);
                }
            }
            this.structure.push(row);
        }
        // console.log(this.structure)

        this.words = [...new Set(words.vocab.map(word => word.toUpperCase()))];
        //console.log(this.words.slice(0,10))

        // Determine variable set
        this.variables = new Set();

        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {

                // Vertical words
                let starts_word = (
                    this.structure[i][j]
                    && (i == 0 || !this.structure[i - 1][j]));

                if (starts_word) {
                    let length = 1;
                    for (let k = i + 1; k < this.height; k++) {
                        if (this.structure[k][j]) {
                            length += 1;
                        }
                        else {
                            break;
                        }
                    }

                    if (length > 1) {
                        this.variables.add(new Variable(
                            i, j,
                            Variable.DOWN,
                            length
                        ));
                    }

                }

                // Horizontal words
                starts_word = (
                    this.structure[i][j]
                    && (j == 0 || !this.structure[i][j - 1])
                );
                if (starts_word) {
                    let length = 1;
                    for (let k = j + 1; k < this.width; k++) {
                        if (this.structure[i][k]) {
                            length += 1;
                        }
                        else {
                            break;
                        }
                    }

                    if (length > 1) {
                        this.variables.add(new Variable(
                            i, j,
                            Variable.ACROSS,
                            length
                        ));
                    }

                }

            }
        }
        // Compute overlaps for each word
        // For any pair of variables v1, v2, their overlap is either:
        // null, if the two variables do not overlap; or
        // [i, j], where v1's ith character overlaps v2's jth character
        this.overlaps = new Map();
        for (let v1 of this.variables) {
            for (let v2 of this.variables) {
                // console.log(v1, v2)
                if (v1.equals(v2)) {
                    continue;
                }
                const intersection = v1.intersection(v2);
                if (!intersection.size) {
                    this.overlaps.set([v1, v2], null);
                } else {
                    const union = intersection.values().next();
                    const index1 = v1.cells.findIndex(cell => Variable.isSameCell(cell, union.value));
                    const index2 = v2.cells.findIndex(cell => Variable.isSameCell(cell, union.value));
                    this.overlaps.set([v1, v2], [index1, index2]);
                }
            }
        }
    }

    neighbors(variable) {
        /// Given a variable, return set of overlapping variables.
        const _neighbors = new Set();
        for (let v of this.variables) {
            if (v.equals(variable)) {
                continue;
            }
            if (this.overlaps.has([v, variable])) {
                _neighbors.add(variable);
            }
        }
        return _neighbors;
    }


}


export { Crossword, Variable, };
