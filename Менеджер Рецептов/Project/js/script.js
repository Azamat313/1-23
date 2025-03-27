const addRecipBtn = document.getElementById("addRecipe");
const searchInput = document.getElementById("search");
const recipsContainer = document.querySelector("#recipes");

let recips = JSON.parse(localStorage.getItem("recips")) || [];

function saveRecips() {
  localStorage.setItem("recips", JSON.stringify(recips));
}

function renderRecips() {
  recipsContainer.innerHTML = "";
  recips.forEach((recip, index) => {
    const recipDiv = document.createElement("div");
    recipDiv.classList.add("recipe");

    recipDiv.innerHTML = `
      <h3>${recip.name}</h3>
      <p><strong>Категория:</strong> ${recip.category}</p>
      <p><strong>Ингредиенты:</strong> ${recip.ingredients}</p>
      <p><strong>Время приготовления:</strong> ${recip.time} мин</p>
      <button class="edit">Редактировать</button>
      <button class="delete">Удалить</button>
    `;

    recipDiv.querySelector(".delete").addEventListener("click", () => {
      recips.splice(index, 1);
      saveRecips();
      renderRecips();
    });

    recipDiv.querySelector(".edit").addEventListener("click", () => {
      const newName = prompt("Новое название:", recip.name);
      const newCategory = prompt("Новая категория:", recip.category);
      const newIngredients = prompt("Новые ингредиенты:", recip.ingredients);
      const newTime = prompt("Новое время приготовления:", recip.time);

      if (newName && newCategory && newIngredients && newTime) {
        recips[index] = { name: newName, category: newCategory, ingredients: newIngredients, time: newTime };
        saveRecips();
        renderRecips();
      }
    });

    recipsContainer.appendChild(recipDiv);
  });
}

addRecipBtn.addEventListener("click", () => {
  const name = document.getElementById("recipeName").value.trim();
  const category = document.getElementById("recipeCategory").value.trim();
  const ingredients = document.getElementById("recipeIngredients").value.trim();
  const time = document.getElementById("recipeTime").value.trim();

  if (name && category && ingredients && time) {
    recips.push({ name, category, ingredients, time });
    saveRecips();
    renderRecips();

    document.getElementById("recipeName").value = "";
    document.getElementById("recipeCategory").value = "";
    document.getElementById("recipeIngredients").value = "";
    document.getElementById("recipeTime").value = "";
  } else {
    alert("Заполните все поля!");
  }
});

searchInput.addEventListener("input", (event) => {
  const searchText = event.target.value.toLowerCase();
  document.querySelectorAll(".recipe").forEach(recip => {
    const name = recip.querySelector("h3").innerText.toLowerCase();
    recip.style.display = name.includes(searchText) ? "block" : "none";
  });
});

renderRecips();
