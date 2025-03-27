document.getElementById("generate-btn").addEventListener("click", function() {
    const temp = parseFloat(document.getElementById("temp").value);

    if (isNaN(temp)) {
        alert("Введите значение!");
        return;
    }

    const norm = 20;
    let comparison;
    if (temp < norm) {
        comparison = `Сейчас холодно`;
    } else {
        comparison = `Сейчас тепло`;
    }

    document.getElementById("result").innerHTML = `
        <p> ${comparison}</p>`;
});
