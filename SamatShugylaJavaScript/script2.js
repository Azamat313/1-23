"use strict";

let fruits = ["Яблоко", "Апельсин", "Банан", "Авокадо", "Груша", "Ананас"]; 
let result = []; 

for (let i = 0; i < fruits.length; i++) { 
    if (fruits[i][0] === "А") { 
        result.push(fruits[i]); 
    }
}

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("filteredFruits").innerText = result.join(", "); 
});
