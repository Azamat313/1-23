function generateColor() {
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    const display = document.getElementById("colorDisplay");
    
    display.textContent = `random color: ${randomColor}`;
    display.style.backgroundColor = randomColor;
    display.style.color = '#ffffff';
}
