function ПоказЧ() {
  let число = Math.floor(Math.random() * 100) + 1;
  document.getElementById('output').textContent = 'Ваше число: ' + число;
}
