/**
 * Calculates the UCB1 value for Monte Carlo Tree Search
 * @param sn Total number of visits to parent node
 * @param n Number of visits to this node
 * @param w Total reward for this node
 * @returns UCB1 value
 */
export function ucb1(sn: number, n: number, w: number): number {
    if (n === 0) return Infinity;
    const C = Math.sqrt(2);  // Exploration parameter
    return w / n + C * Math.sqrt(Math.log(sn) / n);
}

/**
 * Returns the index of the maximum value in an array
 * @param array Array of numbers
 * @returns Index of the maximum value
 */
export function argmax(array: number[]): number {
    return array.reduce((maxIndex, current, currentIndex, arr) => 
        current > arr[maxIndex] ? currentIndex : maxIndex, 0);
}