const DEMO_BANK = [
  ["forest", [0.82, 0.31, 0.05, 0.12, 0.08, 0.18, 0.12, 0.27]],
  ["tree", [0.86, 0.19, 0.08, 0.2, 0.08, 0.2, 0.11, 0.23]],
  ["river", [0.58, 0.74, 0.04, 0.08, 0.18, 0.24, 0.13, 0.16]],
  ["ocean", [0.53, 0.8, 0.07, 0.05, 0.12, 0.28, 0.17, 0.18]],
  ["bread", [0.08, 0.08, 0.88, 0.38, 0.15, 0.13, 0.18, 0.14]],
  ["coffee", [0.06, 0.18, 0.78, 0.42, 0.36, 0.16, 0.22, 0.22]],
  ["kitchen", [0.08, 0.12, 0.76, 0.61, 0.17, 0.16, 0.19, 0.14]],
  ["computer", [0.02, 0.02, 0.02, 0.12, 0.22, 0.88, 0.23, 0.22]],
  ["software", [0.01, 0.02, 0.02, 0.08, 0.18, 0.9, 0.26, 0.22]],
  ["robot", [0.06, 0.02, 0.01, 0.08, 0.22, 0.84, 0.25, 0.42]],
  ["music", [0.08, 0.06, 0.06, 0.18, 0.28, 0.14, 0.84, 0.39]],
  ["painting", [0.18, 0.06, 0.05, 0.2, 0.23, 0.14, 0.88, 0.27]],
  ["dance", [0.12, 0.05, 0.06, 0.14, 0.27, 0.13, 0.72, 0.61]],
  ["love", [0.12, 0.04, 0.1, 0.38, 0.12, 0.05, 0.42, 0.8]],
  ["family", [0.1, 0.05, 0.21, 0.72, 0.16, 0.06, 0.22, 0.62]],
  ["friend", [0.1, 0.04, 0.14, 0.44, 0.3, 0.05, 0.26, 0.76]],
  ["city", [0.08, 0.05, 0.18, 0.22, 0.84, 0.24, 0.28, 0.22]],
  ["street", [0.08, 0.05, 0.1, 0.18, 0.86, 0.16, 0.2, 0.21]],
  ["train", [0.06, 0.05, 0.06, 0.07, 0.7, 0.32, 0.14, 0.6]],
  ["doctor", [0.08, 0.04, 0.05, 0.12, 0.36, 0.45, 0.06, 0.8]],
  ["hospital", [0.06, 0.04, 0.05, 0.12, 0.48, 0.35, 0.05, 0.78]],
  ["medicine", [0.08, 0.04, 0.05, 0.1, 0.22, 0.54, 0.04, 0.8]],
  ["clock", [0.04, 0.02, 0.04, 0.28, 0.18, 0.26, 0.18, 0.88]],
  ["history", [0.16, 0.02, 0.04, 0.18, 0.32, 0.36, 0.44, 0.7]],
];

const state = {
  bank: [],
  byWord: new Map(),
  targetData: [],
  targets: [],
  rankings: [],
  guesses: [],
  revealed: [false, false],
  usingDemoBank: false,
};

const nodes = {
  form: document.querySelector("#guessForm"),
  input: document.querySelector("#guessInput"),
  message: document.querySelector("#message"),
  history: document.querySelector("#history"),
  count: document.querySelector("#guessCount"),
  newRound: document.querySelector("#newRound"),
  boards: [...document.querySelectorAll(".board")],
  best: [document.querySelector("#bestA"), document.querySelector("#bestB")],
  progress: [document.querySelector("#progressA span"), document.querySelector("#progressB span")],
  answer: [document.querySelector("#answerA"), document.querySelector("#answerB")],
  hint: [document.querySelector("#hintA"), document.querySelector("#hintB")],
  give: [document.querySelector("#giveA"), document.querySelector("#giveB")],
  titles: [document.querySelector("#titleA"), document.querySelector("#titleB")],
};

async function loadEmbeddingBank() {
  try {
    const payload = window.MULTI_CONTEXTO_EMBEDDINGS;
    if (!payload) throw new Error("Embedding data is missing.");
    const entries = Object.entries(payload.embeddings || payload).map(([word, vector]) => [word, vector]);
    if (entries.length < 2) throw new Error("Embedding file has too few words.");
    setBank(entries, false);
    nodes.message.textContent = statusMessage();
  } catch (error) {
    setBank(DEMO_BANK, true);
    nodes.message.textContent = statusMessage();
  }
}

function setBank(entries, usingDemoBank) {
  state.bank = entries
    .map(([word, vector]) => ({ word, vector: normalize(vector) }))
    .sort((a, b) => a.word.localeCompare(b.word));
  state.byWord = new Map(state.bank.map((entry) => [entry.word, entry]));
  state.usingDemoBank = usingDemoBank;
}

function normalize(vector) {
  const length = Math.hypot(...vector);
  return vector.map((value) => value / length);
}

function cosine(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function statusMessage() {
  if (state.usingDemoBank) return "Demo noun bank loaded. Generate embeddings for the larger game.";
  return `Loaded ${state.bank.length.toLocaleString()} ranked nouns.`;
}

function rankingFor(targetEntry) {
  return state.bank
    .map((entry) => ({ word: entry.word, score: cosine(entry.vector, targetEntry.vector) }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => [entry.word, index + 1]);
}

function rankWord(word, boardIndex) {
  return state.rankings[boardIndex].get(word);
}

function cleanGuess(value) {
  return value.toLowerCase().trim().replace(/[^a-z-]/g, "");
}

function startRound() {
  const first = randomEntry();
  let second = randomEntry();
  while (second.word === first.word) second = randomEntry();

  state.targetData = [first, second];
  state.targets = state.targetData.map((entry) => entry.word);
  state.rankings = state.targetData.map((entry) => new Map(rankingFor(entry)));
  state.guesses = [];
  state.revealed = [false, false];

  nodes.input.value = "";
  nodes.input.disabled = false;
  nodes.message.textContent = statusMessage();
  render();
  nodes.input.focus();
}

function randomEntry() {
  return state.bank[Math.floor(Math.random() * state.bank.length)];
}

function submitGuess(event) {
  event.preventDefault();
  const word = cleanGuess(nodes.input.value);

  if (!word) {
    nodes.message.textContent = "Try a single word.";
    return;
  }

  if (!state.byWord.has(word)) {
    nodes.message.textContent = `"${word}" is not in the noun bank.`;
    nodes.input.select();
    return;
  }

  if (state.guesses.some((guess) => guess.word === word)) {
    nodes.message.textContent = `"${word}" is already on the board.`;
    nodes.input.select();
    return;
  }

  const ranks = [rankWord(word, 0), rankWord(word, 1)];
  state.guesses.unshift({ word, ranks });
  nodes.input.value = "";

  const solved = ranks
    .map((rank, index) => (rank === 1 ? `Game ${index === 0 ? "A" : "B"}` : null))
    .filter(Boolean);

  nodes.message.textContent = solved.length
    ? `${solved.join(" and ")} solved. Keep going until both are found.`
    : bestNudge(ranks);

  render();
}

function bestNudge(ranks) {
  const best = Math.min(...ranks);
  if (best <= 10) return "Very close. The answer is in the neighborhood.";
  if (best <= 50) return "Hot trail.";
  if (best <= 200) return "Useful clue. Follow that meaning.";
  if (best <= 1000) return "Some signal, but keep roaming.";
  return "Distant. Try a different semantic area.";
}

function render() {
  nodes.history.innerHTML = "";
  state.guesses.forEach((guess) => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML = `
      <span class="guess-word" title="${guess.word}">${guess.word}</span>
      <span class="rank ${rankClass(guess.ranks[0])}">#${guess.ranks[0]}</span>
      <span class="rank ${rankClass(guess.ranks[1])}">#${guess.ranks[1]}</span>
    `;
    nodes.history.appendChild(row);
  });

  nodes.count.textContent = `${state.guesses.length} ${state.guesses.length === 1 ? "guess" : "guesses"}`;

  [0, 1].forEach((index) => {
    const best = bestRank(index);
    const solved = best === 1;
    nodes.best[index].textContent = best === Infinity ? "∞" : `#${best}`;
    nodes.progress[index].style.width = `${progressFor(best)}%`;
    nodes.boards[index].classList.toggle("solved", solved);
    nodes.boards[index].classList.toggle("revealed", state.revealed[index] && !solved);
    nodes.titles[index].textContent = solved ? "Solved" : "Finding word";
    nodes.answer[index].textContent = answerText(index, solved);
    nodes.hint[index].disabled = solved || state.revealed[index];
    nodes.give[index].disabled = solved || state.revealed[index];
  });
}

function bestRank(boardIndex) {
  const ranks = state.guesses.map((guess) => guess.ranks[boardIndex]);
  return ranks.length ? Math.min(...ranks) : Infinity;
}

function progressFor(rank) {
  if (rank === Infinity) return 0;
  return Math.max(4, Math.min(100, 100 - Math.log10(rank) * 24));
}

function rankClass(rank) {
  if (rank === 1) return "win";
  if (rank <= 10) return "close";
  if (rank <= 100) return "hot";
  if (rank <= 1000) return "warm";
  return "cold";
}

function answerText(index, solved) {
  if (solved) return `Answer: ${state.targets[index]}`;
  if (state.revealed[index]) return `Revealed: ${state.targets[index]}`;
  const best = bestRank(index);
  return best === Infinity ? "No signal yet" : `${closerCount(best)} words closer than your best guess`;
}

function closerCount(rank) {
  return Math.max(0, rank - 1).toLocaleString();
}

function giveUp(index) {
  state.revealed[index] = true;
  nodes.message.textContent = `Game ${index === 0 ? "A" : "B"} revealed.`;
  render();
}

function hint(index) {
  const best = bestRank(index);
  const targetRanking = [...state.rankings[index].entries()].sort((a, b) => a[1] - b[1]);
  const guessed = new Set(state.guesses.map((guess) => guess.word));
  const hintEntry = targetRanking.find(([word, rank]) => rank < best && rank > 1 && !guessed.has(word));

  if (!hintEntry) {
    nodes.message.textContent = "No hint left before the answer.";
    return;
  }

  const [word, rank] = hintEntry;
  state.guesses.unshift({
    word,
    ranks: [rankWord(word, 0), rankWord(word, 1)],
  });
  nodes.message.textContent = `Hint added "${word}" at #${rank} for Game ${index === 0 ? "A" : "B"}.`;
  render();
}

function drawField() {
  const canvas = document.querySelector("#field");
  const context = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  let width = 0;
  let height = 0;
  const particles = Array.from({ length: 42 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    radius: 1.5 + Math.random() * 2.8,
    speed: 0.00025 + Math.random() * 0.0005,
    phase: index * 0.7,
  }));

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function frame(time) {
    context.clearRect(0, 0, width, height);
    particles.forEach((particle, index) => {
      const x = particle.x * width + Math.sin(time * particle.speed + particle.phase) * 22;
      const y = particle.y * height + Math.cos(time * particle.speed + particle.phase) * 18;

      context.beginPath();
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = index % 2 ? "rgba(40, 108, 131, 0.16)" : "rgba(194, 103, 50, 0.14)";
      context.fill();

      particles.slice(index + 1).forEach((other) => {
        const otherX = other.x * width + Math.sin(time * other.speed + other.phase) * 22;
        const otherY = other.y * height + Math.cos(time * other.speed + other.phase) * 18;
        const distance = Math.hypot(x - otherX, y - otherY);
        if (distance < 135) {
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(otherX, otherY);
          context.strokeStyle = `rgba(32, 34, 42, ${0.08 * (1 - distance / 135)})`;
          context.stroke();
        }
      });
    });
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
}

async function init() {
  drawField();
  nodes.form.addEventListener("submit", submitGuess);
  nodes.newRound.addEventListener("click", startRound);
  nodes.hint.forEach((button, index) => button.addEventListener("click", () => hint(index)));
  nodes.give.forEach((button, index) => button.addEventListener("click", () => giveUp(index)));
  await loadEmbeddingBank();
  startRound();
}

init();
