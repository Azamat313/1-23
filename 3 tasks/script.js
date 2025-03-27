const usersTimeInput = parseInt(prompt("Введите текущее время"), 10);
const greetingElement = document.getElementById("greetingMessage");

if (usersTimeInput >= 0 && usersTimeInput < 6) {
    greetingElement.textContent = "Good night!";
} else if (usersTimeInput >= 6 && usersTimeInput < 12) {
    greetingElement.textContent = "Good morning!";
} else if (usersTimeInput >= 12 && usersTimeInput < 18) {
    greetingElement.textContent = "Good afternoon!";
} else if (usersTimeInput >= 18 && usersTimeInput < 24) {
    greetingElement.textContent = "Good evening!";
} else {
    greetingElement.textContent = "Please enter a valid time.";
}

let evenNumbers = "";
    for (let num = 1; num <= 10; num++) {
        if (num % 2 === 0) {
            evenNumbers += num + " ";
        }
    }
document.getElementById("evenNumbers").textContent = "Even numbers: " + evenNumbers;

function startsWithUpperCase(str) {
    if (str.length === 0) return false;
        return str[0] === str[0].toUpperCase();
    }

function checkFirstLetter() {
    let input = document.getElementById("inputText").value;
    let result = startsWithUpperCase(input) ? "Starts with uppercase!" : "Does not start with uppercase.";
    document.getElementById("checkResult").textContent = result;
}