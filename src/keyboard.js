const qwerty = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '&#9003;'],
    // ['&larr;', '&uarr;', '&rarr;', '&darr;']
];

export function createKeys(board) {
    console.log(board);

    for (let row of qwerty) {
        const group = document.createElement('div');
        group.classList.add('keyboard_row');
        for (let key of row) {
            const btn = document.createElement('span');
            btn.innerHTML = key;
            btn.setAttribute('data-key', key);
            btn.classList.add('button');
            if (key == '&#9003;') {
                btn.classList.add('backspace');
            }
            // if (['&larr;', '&uarr;', '&rarr;', '&darr;'].includes(key)) {
            //     btn.classList.add('navigation');
            // }
            btn.setAttribute('role', 'button');
            group.appendChild(btn);
        }
        board.appendChild(group);
    }
}

export function extractKeyEvent(evt) {
    const target = evt.target;
    let key = target.getAttribute('data-key') && target.getAttribute('data-key').trim();

    if (key == '&#9003;') {
        key = 'Backspace';
    } else {
        target.classList.add('pressed');
    }

    const { type, code, shiftKey } = evt;
    return { key, code, type, shiftKey };
}

export function toggleKeyPressClass(evt) {
    evt.target.classList.remove('pressed');
    evt.target.removeEventListener('animationend', toggleKeyPressClass, true);
}
