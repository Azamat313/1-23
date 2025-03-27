const GAME_NODE = document.querySelector("#game-board");
const VICTORY_TEXT = document.querySelector("#victory-message");
const START_GAME_BUTTON = document.querySelector("#new-game-button");

const VISIBLE_CARD_CLASSNAME = "visible";
const CARD_FLIP_TIMEOUT_MS = 1000;

const CARD_ELEMENTS = ["🍓", "🍉", "🍌", "🍏", "🥝", "🍇"];
const CARDS_AMOUNT = 12;

let VISIBLE_CARDS = [];

START_GAME_BUTTON.addEventListener("click", startGame);

function startGame() {
  [GAME_NODE, VICTORY_TEXT].forEach((element) => (element.innerHTML = ""));

  const CARD_VALUES = generateArrayWithPairs(CARD_ELEMENTS, CARDS_AMOUNT);

  CARD_VALUES.forEach(renderCard);

  const renderedCards = document.querySelectorAll(".card");

  renderedCards.forEach((card) => card.classList.add(VISIBLE_CARD_CLASSNAME));

  setTimeout(() => {
    renderedCards.forEach((card) =>
      card.classList.remove(VISIBLE_CARD_CLASSNAME)
    );
  }, CARD_FLIP_TIMEOUT_MS);
}

function generateArrayWithPairs(arr, fieldSize) {
  const randomArray = [];
  const elementCounts = {};

  for (const item of arr) {
    elementCounts[item] = 0;
  }

  while (randomArray.length < fieldSize) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    const randomElement = arr[randomIndex];

    if (elementCounts[randomElement] < 2) {
      randomArray.push(randomElement);
      elementCounts[randomElement]++;
    }
  }

  return randomArray;
}

function renderCard(cardText = "") {
  const card = document.createElement("div");
  card.classList.add("card");

  const cardInner = document.createElement("div");
  cardInner.classList.add("card-inner");

  const cardFront = document.createElement("div");
  cardFront.classList.add("card-front");

  const cardBack = document.createElement("div");
  cardBack.classList.add("card-back");

  cardFront.textContent = "?";
  cardBack.textContent = cardText;

  cardInner.appendChild(cardFront);
  cardInner.appendChild(cardBack);

  card.appendChild(cardInner);

  card.addEventListener("click", handleCardClick.bind(this, card));

  GAME_NODE.appendChild(card);
}

function handleCardClick(card) {
  if (card.classList.contains(VISIBLE_CARD_CLASSNAME)) {
    return;
  }

  const checkVictory = () => {
    const visibleCardsNodes = document.querySelectorAll(
      `.${VISIBLE_CARD_CLASSNAME}`
    );

    const isVictory = visibleCardsNodes.length === CARDS_AMOUNT;
    const victoryMessage = "Congratulations, You win";

    if (isVictory) {
      VICTORY_TEXT.textContent = victoryMessage;
    }
  };

  card
    .querySelector(".card-inner")
    .addEventListener("transitionend", checkVictory);

  card.classList.add(VISIBLE_CARD_CLASSNAME);

  VISIBLE_CARDS.push(card);

  if (VISIBLE_CARDS.length % 2 !== 0) {
    return;
  }

  const [prelastCard, lastCard] = VISIBLE_CARDS.slice(-2);

  if (lastCard.textContent !== prelastCard.textContent) {
    VISIBLE_CARDS = VISIBLE_CARDS.slice(0, VISIBLE_CARDS.length - 2);

    setTimeout(() => {
      [lastCard, prelastCard].forEach((card) =>
        card.classList.remove(VISIBLE_CARD_CLASSNAME)
      );
    }, CARD_FLIP_TIMEOUT_MS);
  }
}

startGame();