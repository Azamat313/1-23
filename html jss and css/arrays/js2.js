
let numbers = [24, 99, 9, 42, 34];


let sum = numbers.reduce((total, num) => total + num, 0);


let max = Math.max(...numbers);
let min = Math.min(...numbers);


let sortedNumbers = [...numbers].sort((a, b) => a - b);

console.log("Arrays: ", numbers);
console.log("Sum: ", sum);
console.log("Max: ", max);
console.log("Min: ", min);
console.log("Ordered arrays: ", sortedNumbers);
