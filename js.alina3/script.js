function calculateTextLength() {
    let input = document.getElementById("textInput");
    let inputText = input.value;
    let result = document.getElementById("result");

    result.textContent = `Длина текста: ${inputText.length} символов`;

    if (inputText.length > 0) {
        result.className = "result green";
    } else {
        result.className = "result red";
        result.textContent = "Введите текст!!!";
    }
}