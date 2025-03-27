function checkAccess() {
    let age = document.getElementById("ageInput").value;
    let message = "";

    if (age >= 18) {
        message = "Доступ разрешен";
    } else {
        message = "Доступ запрещен";
    }

    document.getElementById("accessResult").innerText = message;
}