// function countWords(text) {
//     let words = text.split(" ");
//     return words.length;
// }

// console.log(countWords("Checking how it works in this console"));



// function startTimer() {
//     let count = 10;
//     let timer = setInterval(() => {
//         console.log(count);
//         if (count === 0) {
//             clearInterval(timer);
//             console.log("Время вышло!");
//         }
//         count--;
//     }, 1000);
// }

// startTimer();



// function startTimer() {
//     let count = 10;
//     let timerDisplay = document.getElementById("timer");
//     let interval = setInterval(() => {
//         timerDisplay.textContent = count;
//         if (count === 0) {
//             clearInterval(interval);
//             timerDisplay.textContent = "Время вышло!";
//         }
//         count--;
//     }, 1000);
// }



// function isEvenOrOdd(number) {
//     if (number % 2 === 0) {
//         return "even"; 
//     } else {
//         return "odd";
//     }
// }

// console.log(isEvenOrOdd(4));
// console.log(isEvenOrOdd(7));