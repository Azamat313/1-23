function addFruit() {
    let input = document.getElementById("fruitInput");
    let fruitName = input.value.trim();
    let list = document.getElementById("fruitList");

    if (fruitName !== "") {
        let listItem = document.createElement("li");
        listItem.textContent = fruitName;
        list.appendChild(listItem);
        input.value = ""; 
    } else {
        alert("Введите название фрукта!!!");
    }
}