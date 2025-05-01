document.getElementById("addBtn").addEventListener("click", addTask);

        function addTask() {
            let taskInput = document.getElementById("taskInput");
            let taskText = taskInput.value.trim();

            console.log("Добавление задачи:", taskText); 

            if (taskText === "") {
                alert("Введите задачу!");
                return;
            }

            let li = document.createElement("li");
            li.className = "todo-item";

            let checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.onchange = function() {
                if (checkbox.checked) {
                    span.classList.add("completed");
                } else {
                    span.classList.remove("completed");
                }
            };

            let span = document.createElement("span");
            span.textContent = taskText;

            let removeBtn = document.createElement("button");
            removeBtn.textContent = "Удалить";
            removeBtn.onclick = function() {
                li.remove();
            };

            li.appendChild(checkbox);
            li.appendChild(span);
            li.appendChild(removeBtn);
            document.getElementById("todoList").appendChild(li);

            taskInput.value = "";
        }