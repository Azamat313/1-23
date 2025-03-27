const input = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");

document.getElementById("addTaskBtn").addEventListener("click", function() {
    const taskText = input.value.trim();
    if (taskText === "") {
        alert("Введите задачу!");
        return;
    }

    const li = document.createElement("li");
    li.textContent = taskText;
    li.addEventListener("click", function() {
        taskList.removeChild(li); 
    });

    taskList.appendChild(li);
    input.value = "";
});
