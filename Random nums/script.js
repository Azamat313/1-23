document.getElementById("generate-btn").addEventListener("click", function() {
    const randomNumber = Math.floor(Math.random() * 100) + 1; 
    document.getElementById("random-number").textContent = `Случайное число: ${randomNumber}`;
});
