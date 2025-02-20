"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ucb1 = ucb1;
exports.argmax = argmax;
function ucb1(sn, n, w) {
    if (n === 0)
        return Infinity;
    const C = Math.sqrt(2);
    return w / n + C * Math.sqrt(Math.log(sn) / n);
}
function argmax(array) {
    return array.reduce((maxIndex, current, currentIndex, arr) => current > arr[maxIndex] ? currentIndex : maxIndex, 0);
}
//# sourceMappingURL=utils.js.map