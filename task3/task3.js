document.addEventListener("DOMContentLoaded", loadHistory);

let display = document.getElementById("display");
let historyList = document.getElementById("historyList");

function appendNumber(number) {
    display.value += number;
}

function appendOperator(operator) {
    if (display.value !== "") {
        display.value += operator;
    }
}

function clearDisplay() {
    display.value = "";
}

function deleteLast() {
    display.value = display.value.slice(0, -1);
}

function calculateResult() {
    try {
        let result = eval(display.value);
        if (result === Infinity || isNaN(result)) {
            throw new Error("Invalid calculation");
        }
        saveToHistory(display.value + " = " + result);
        display.value = result;
    } catch (error) {
        display.value = "Error";
    }
}

function saveToHistory(entry) {
    let history = JSON.parse(localStorage.getItem("calcHistory")) || [];
    history.push(entry);
    localStorage.setItem("calcHistory", JSON.stringify(history));
    updateHistory();
}

function loadHistory() {
    let history = JSON.parse(localStorage.getItem("calcHistory")) || [];
    historyList.innerHTML = "";
    history.forEach(item => {
        let li = document.createElement("li");
        li.textContent = item;
        historyList.appendChild(li);
    });
}

function updateHistory() {
    loadHistory();
}

function clearHistory() {
    localStorage.removeItem("calcHistory");
    updateHistory();
}
