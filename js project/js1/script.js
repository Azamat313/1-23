function addItem() {
    let list = document.getElementById("itemList");
    let itemText = prompt("Enter item:");
    if (itemText) {
        let li = document.createElement("li");
        li.textContent = itemText;

        let deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.onclick = () => li.remove();

        li.appendChild(deleteBtn);
        list.appendChild(li);
    }
}


