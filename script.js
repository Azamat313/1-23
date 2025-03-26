function checkPassword() {
    const password = document.getElementById("password").value;
    const status = document.getElementById("status");

    if (password.length >= 8) {
        status.innerHTML = "✔️ Password is strong!";
        status.style.color = "green";
    } else {
        status.innerHTML = "❌ Password is too short!";
        status.style.color = "red";
    }

    // Add animation
    status.style.opacity = "1";
    status.style.transform = "scale(1.1)";
    
    // Reset size after 300ms
    setTimeout(() => {
        status.style.transform = "scale(1)";
    }, 300);
}

document.getElementById("password").addEventListener("input", checkPassword);