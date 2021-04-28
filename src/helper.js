// HELPER  FUNCTIONS
export function isBlackCell(cell) {
  // className returns a SVGAnimatedString for className
  const SVGAnimatedString = cell.className;
  return SVGAnimatedString.baseVal.includes('black');
}

export function isHiddenNode(node) {
  // className returns a SVGAnimatedString for className
  const SVGAnimatedString = node.className;
  return SVGAnimatedString && SVGAnimatedString.baseVal && SVGAnimatedString.baseVal.includes('hidden');
}

export function isLetterEnglish(char) {
  return /^[A-Za-z]{1}$/.test(char);
}

export function getCellNumber(cell) {
  return parseInt(cell.id.split('-')[2]);
}

export function getCellVariable(cell, direction) {
  return cell.getAttribute(`data-variable-${direction}`);
}

export function getCellCoords(cell, width, height) {
  const cellNumber = parseInt(cell.id.split('-')[2]);
  const i = Math.floor(cellNumber / height);
  const j = cellNumber % width;
  return ([i, j]);
}

export function mapCellInVariable(fn) {
  return function (cell, variable) {
    return fn(cell, variable);
  };
}

export function fillWhite(cell) {
  cell.setAttributeNS(null, 'fill', '#fff');
}

export function fillBlue(cell) {
  cell.setAttributeNS(null, 'fill', 'lightblue');
}

export function fillBlack(cell) {
  cell.setAttributeNS(null, 'fill', '#333');
}

export function fillYellow(cell) {
  const SVGAnimatedString = cell.className;
  if (SVGAnimatedString.baseVal.includes('black')) {
    cell.setAttributeNS(null, 'fill', '#737a52');
  } else {
    cell.setAttributeNS(null, 'fill', '#fdea3f');
  }
}

export function not(fn) {
  return (data) => !fn(data);
}


export function createUserActivationAction() {
  let userAction = '';
  if (window.PointerEvent) {
    userAction = 'pointerdown';
  } else {
    userAction = navigator.maxTouchPoints < 1 ? 'mousedown' : 'touchstart';
  }
  return userAction;
}

export function createUserActionEnd(evt) {
  const userActionEnd = evt.type.replace('down', 'up').replace('start', 'end');
  return userActionEnd;
}

export function touchesDistance(touch1, touch2) {
  const dist = Math.hypot(
    touch1.pageX - touch2.pageX,
    touch1.pageY - touch2.pageY);
  return dist;
}

export function getTouchCoordsFromEvent(evt) {
  let point = [];

  if (evt.targetTouches) {
    // Prefer Touch Events
    point = [evt.targetTouches[0].clientX, evt.targetTouches[0].clientY];
  } else {
    // Either Mouse event or Pointer Event
    point = [evt.clientX, evt.clientY];
  }

  return point;
}

export function createSymmetricConstraints(constraints, width, height) {
  
  const mirror = constraints.reduce((acc, cur) => {
    // we have added 1 for the constraints. Remove it now to fit the ids on the green
    cur -= 1;

    const i = Math.floor(cur / height);
    const j = cur % width;
    const ic = Math.abs(i - (height-1));
    const jc = Math.abs(j - (width-1))

    const idc = ic * height + (jc % width) + 1; // add one for the constraints
    acc.push(idc)
    return acc;
  }, []);

  return new Set(constraints.concat(mirror));
}

export function removeSymmetricConstraints(constraints, width, height) {
  const cp = [...constraints]
  for (let cur of constraints) {
    // we have added 1 for the constraints. Remove it now to fit the ids on the green
    let constraint = cur-1;

     // find the symmetrical in the constraints
    const i = Math.floor(constraint / height);
    const j = constraint % width;
    const ic = Math.abs(i - (height-1));
    const jc = Math.abs(j - (width-1))

    const idc = ic * height + (jc % width) + 1; // add one for the constraints

    if(!constraints.find((c) => c == idc)) {
      const indx = cp.indexOf(cur);
      cp.splice(indx, 1);
    }    
  }
  return new Set(cp);
}


export function removeAllChildNodes(parent) {
  while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
  }
}
