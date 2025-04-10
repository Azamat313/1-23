function проверить() {
  let значение = document.getElementById('температура').value;
  let число = Number(значение);
  let результат = document.getElementById('результат');

  if (число >= 30) {
    результат.textContent = 'Жарко';
  } else if (число <= 5) {
    результат.textContent = 'Холодно';
  } else {
    результат.textContent = 'Нормально';
  }
}
