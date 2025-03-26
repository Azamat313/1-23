// 1. Сортировка городов
function sortCities() {
    let citiesText = document.getElementById("citiesInput").value;
  
    let cities = citiesText.split(",");
    
    for (let i = 0; i < cities.length; i++) {
      cities[i] = cities[i].trim();
    }
    
    cities.sort();
    
    document.getElementById("citiesResult").textContent = "Отсортировано: " + cities.join(", ");
}
  
// 2. Расчёт скидки
function calculateDiscount() {

    let price = document.getElementById("price").value;
    let discount = document.getElementById("discount").value;

    price = Number(price);
    discount = Number(discount);

    let discountAmount = price * discount / 100;
    let finalPrice = price - discountAmount;

    document.getElementById("discountResult").textContent = "Цена со скидкой: " + finalPrice.toFixed(2);
}
  
// 3. Проверка на 3
function checkDivision() {

    let number = document.getElementById("numberInput").value;
    number = Number(number);
    
    if (number % 3 === 0) {
        document.getElementById("divisionResult").textContent = number + " делится на 3";
    } else {
        document.getElementById("divisionResult").textContent = number + " не делится на 3, остаток: " + (number % 3);
    }
}