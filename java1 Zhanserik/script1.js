function isEvenNumbers() {
    let input = prompt("Введите числа через запятую:");
    if (input) {
        let numbers = input.split(',').map(num => parseInt(num.trim(), 10));
        let evenNumbers = numbers.filter(num => !isNaN(num) && num % 2 === 0);
        alert("Четные числа: " + evenNumbers.join(", "));
    } else {
        alert("Вы ничего не ввели.");
    }
}
