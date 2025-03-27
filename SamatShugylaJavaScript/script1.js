"use strict"
let count = 0;

document.addEventListener("keydown", function() {
    count++;
    document.getElementById("keyCount").innerText = "Нажатий: " + count;
})
