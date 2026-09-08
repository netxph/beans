const CATALOG = [
  ['Apple basket', '🍎', 20, 55],
  ['Teddy bear', '🧸', 55, 110],
  ['Rain boots', '🥾', 70, 130],
  ['Toy train', '🚂', 80, 145],
  ['Story book', '📚', 25, 65],
  ['Paint set', '🎨', 35, 80],
  ['Soccer ball', '⚽', 45, 95],
  ['Backpack', '🎒', 75, 140],
  ['Puzzle', '🧩', 30, 75],
  ['Scooter', '🛴', 120, 190]
];

export function createRound(random = Math.random) {
  const pool = [...CATALOG];
  const items = [];
  while (items.length < 5) {
    const [name, emoji, min, max] = pool.splice(Math.floor(random() * pool.length), 1)[0];
    let price = min + Math.floor(random() * (max - min + 1));
    if (price % 5 === 0) price += price === max ? -1 : 1;
    items.push({ id: name, name, emoji, price });
  }
  return { money: 300 + Math.floor(random() * 201), items };
}

export function canCheckout(balance, items) {
  return items.length === 0 || items.every((item) => item.price > balance);
}

export function scoreAnswer(answer, balance, price) {
  return Number(answer) === balance - price && String(answer).trim() !== '';
}

export function countCorrectOperations(receipt) {
  return receipt.filter(({ available, price, answer }) => answer === available - price).length;
}

export function digitsFor(amount) {
  return {
    hundreds: Math.floor(amount / 100),
    tens: Math.floor((amount % 100) / 10),
    ones: amount % 10
  };
}

export function borrowPlace(digits, place) {
  const next = { ...digits };
  if (place === 'ones' && next.tens > 0) {
    next.tens--;
    next.ones += 10;
  }
  if (place === 'tens' && next.hundreds > 0) {
    next.hundreds--;
    next.tens += 10;
  }
  return next;
}
