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

export function fillYellow(cell) {
  cell.setAttributeNS(null, 'fill', '#fdea3f');
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
  // let c1, c2;

  // // use touch.clientX, touch.clientY
  // // REF: https://developer.mozilla.org/en-US/docs/Web/API/Touch/clientX#example
  // c1 = [touch1.clientX, touch1.clientY];
  // if (touch2) {
  //   c2 = [touch2.clientX, touch2.clientY];
  // }
  // return c1;

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



