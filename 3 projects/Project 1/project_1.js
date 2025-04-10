let моиЭлементы = [];

function Show() {
  let список = document.getElementById('список');
  список.innerHTML = '';

  for (let текст of моиЭлементы) {
    let пункт = document.createElement('li');
    пункт.textContent = текст;
    список.appendChild(пункт);
  }
}

function add() {
  let ввод = document.getElementById('ввод');
  моиЭлементы.push(ввод.value);
  ввод.value = '';
  Show();
}

function d() {
  моиЭлементы.pop();
  Show();
}

