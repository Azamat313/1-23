function calculateAge() {
    let input = document.getElementById("birthYearInput"); 
    let birthYear = Number(input.value); 
    let currentYear = new Date().getFullYear(); 
    let result = document.getElementById("result"); 

    if (!isNaN(birthYear) && birthYear >= 1000 && birthYear <= currentYear) {
        let age = currentYear - birthYear; 
        let lastDigit = age % 10; 
        let secondLastDigit = Math.floor((age % 100) / 10);

        let ageText;
        if (secondLastDigit === 1) {
            ageText = "лет"; 
        } else if (lastDigit === 1) {
            ageText = "год"; 
        } else if (lastDigit >= 2 && lastDigit <= 4) {
            ageText = "года"; 
        } else {
            ageText = "лет"; 
        }

        result.textContent = `Ваш возраст: ${age} ${ageText}`; 
   
        result.style.color = "purple"; 
    } else {
        result.textContent = "Введите корректный год рождения!"; 
        result.style.color = "red"; 
    }
}