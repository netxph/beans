export const COUNTS = [10, 20, 30];

// 30% of the clocks may be wrong; one more and you're out.
export function allowedMistakes(count) {
  return Math.floor(count * 0.3);
}

export function isOut(mistakes, count) {
  return mistakes > allowedMistakes(count);
}

export function formatTime({ h, m }) {
  return `${h}:${String(m).padStart(2, '0')}`;
}

// Typed digits -> display text: the last two digits are minutes ("430" -> "4:30", "0530" -> "5:30").
export function formatEntry(digits) {
  return digits.length < 3 ? digits : `${Number(digits.slice(0, -2))}:${digits.slice(-2)}`;
}

export function handAngles({ h, m }) {
  return { hour: (h % 12) * 30 + m / 2, minute: m * 6 };
}

// Random times to the exact minute, no repeats within a game.
export function createGame(count = 10, random = Math.random) {
  const used = new Set();
  return Array.from({ length: count }, () => {
    let n = Math.floor(random() * 720); // minutes on a 12-hour dial
    while (used.has(n)) n = (n + 1) % 720;
    used.add(n);
    const time = { h: Math.floor(n / 60) || 12, m: n % 60 };
    return { time, answer: formatTime(time) };
  });
}
