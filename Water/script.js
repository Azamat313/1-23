document.getElementById("calculate-btn").addEventListener("click", function() {
    const people = parseInt(document.getElementById("people").value);
    const usagePerPerson = parseInt(document.getElementById("usage").value);
    const rate = parseFloat(document.getElementById("rate").value);

    if (people <= 0 || usagePerPerson <= 0 || rate <= 0) {
        alert("Введите корректные значения!");
        return;
    }
    const dailyUsage = people * usagePerPerson;
    const weeklyUsage = dailyUsage * 7;
    const monthlyUsage = dailyUsage * 30;

    const dailyCost = (dailyUsage / 1000) * rate;
    const weeklyCost = (weeklyUsage / 1000) * rate;
    const monthlyCost = (monthlyUsage / 1000) * rate;

    const norm = people * 120;
    let comparison;
    if (dailyUsage > norm) {
        comparison = `Превышение нормы на ${dailyUsage - norm} л в день.`;
    } else {
        comparison = `Вы используете на ${norm - dailyUsage} л меньше нормы.`;
    }

    document.getElementById("result").innerHTML = `
        <p><strong>Суточный расход:</strong> ${dailyUsage} л</p>
        <p><strong>Недельный расход:</strong> ${weeklyUsage} л</p>
        <p><strong>Месячный расход:</strong> ${monthlyUsage} л</p>
        <p><strong>Стоимость воды:</strong></p>
        <p>В день: ${dailyCost.toFixed(2)} тг.</p>
        <p>В неделю: ${weeklyCost.toFixed(2)} тг.</p>
        <p>В месяц: ${monthlyCost.toFixed(2)} тг.</p>
        <p><strong>Сравнение с нормой:</strong> ${comparison}</p>
    `;
});
