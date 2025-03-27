function LeapYear() {
    let year = document.getElementById("year").value;
    let result = document.getElementById("result");

    if ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) {
        result.textContent = `${year} - is a leap year.`;
    } else {
        result.textContent = `${year} - is not leap year.`;
    }
}
