// Daily English Puzzles — minimal JS
// --- Utilities ---
const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];
const todayISO = new Date().toISOString().slice(0,10);
$("#today").textContent = new Date().toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
$("#year").textContent = new Date().getFullYear();

// Theme
const savedTheme = localStorage.getItem("dep_theme");
if (savedTheme === "light") document.documentElement.classList.add("light");
$("#themeToggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("light");
  localStorage.setItem("dep_theme", document.documentElement.classList.contains("light") ? "light" : "dark");
});

// Simple puzzle bank
const WORDS = [
  "apple","music","pride","sleek","crane","light","score","tiger","clean","track",
  "flame","smile","grace","storm","plant","charm","quest","dream","novel","sharp",
  "truth","angle","brave","class","glide","lemon","piano","quick","raven","solid"
];
const RIDDLES = [
  { q: "What has to be broken before you can use it?", a: ["egg"] },
  { q: "I’m tall when I’m young, and I’m short when I’m old. What am I?", a: ["candle"] },
  { q: "What month of the year has 28 days?", a: ["all of them","all months","every month"] },
  { q: "What is full of holes but still holds water?", a: ["sponge"] },
  { q: "What question can you never answer yes to?", a: ["are you asleep yet","are you asleep","are you dead"] },
  { q: "What gets wet while drying?", a: ["towel"] },
  { q: "What goes up but never comes down?", a: ["age"] },
  { q: "What can you catch but not throw?", a: ["cold"] },
  { q: "What kind of band never plays music?", a: ["rubber band","a rubber band"] },
  { q: "I have branches, but no fruit, trunk or leaves. What am I?", a: ["bank","a bank"] }
];
const HINTS = {
  "egg": "Breakfast starts here.",
  "candle": "Wax on, wax gone.",
  "all of them": "Think trick question…",
  "sponge": "Kitchen helper full of holes.",
  "are you asleep yet": "You wouldn’t be able to respond.",
  "towel": "Found in bathrooms & gyms.",
  "age": "Numbers keep climbing.",
  "cold": "Achoo!",
  "rubber band": "Snaps back.",
  "bank": "Money grows on these branches."
};

// Deterministic choice: alternate modes by day, index by day number
function dayNumber(date = new Date()) {
  return Math.floor(new Date(date.toDateString()).getTime() / 86400000); // days since epoch
}
const dnum = dayNumber(new Date());
const mode = dnum % 2 === 0 ? "Word" : "Riddle";
$("#mode").textContent = mode;

// Streak logic
function getStreak() {
  const data = JSON.parse(localStorage.getItem("dep_stats") || "{}");
  return { streak: data.streak || 0, lastSolved: data.lastSolved || null };
}
function setSolvedToday() {
  const data = getStreak();
  if (data.lastSolved === todayISO) return; // avoid double count
  let newStreak = 1;
  if (data.lastSolved) {
    const y = new Date(todayISO); y.setDate(y.getDate() - 1);
    const yISO = y.toISOString().slice(0,10);
    newStreak = (data.lastSolved === yISO) ? (data.streak || 0) + 1 : 1;
  }
  localStorage.setItem("dep_stats", JSON.stringify({ streak: newStreak, lastSolved: todayISO }));
  $("#streak").textContent = newStreak;
}
(function initStreak() {
  $("#streak").textContent = getStreak().streak || 0;
})();

// Modal
const howto = $("#howto");
$("#howToBtn").addEventListener("click", (e) => { e.preventDefault(); howto.showModal(); });

// Share
$("#shareBtn").addEventListener("click", async () => {
  const text = `Daily English Puzzles — ${todayISO} — I solved the ${mode}!`;
  try {
    if (navigator.share) {
      await navigator.share({ text });
      $("#shareStatus").textContent = "Shared!";
    } else {
      await navigator.clipboard.writeText(text);
      $("#shareStatus").textContent = "Copied to clipboard.";
    }
  } catch {
    $("#shareStatus").textContent = "Couldn’t share — try copying.";
  }
});

// ------------ WORD MODE ------------
function launchWordle() {
  $("#wordleSection").classList.remove("hidden");
  const index = dnum % WORDS.length;
  const target = WORDS[index];
  const rows = 6, cols = 5;
  const board = $("#board");
  const keyboard = $("#keyboard");
  const msg = $("#wordleMsg");

  // Build board
  let grid = [];
  for (let r=0; r<rows; r++) {
    const row = document.createElement("div");
    row.className = "row";
    const tiles = [];
    for (let c=0; c<cols; c++) {
      const t = document.createElement("div");
      t.className = "tile";
      t.setAttribute("aria-label", `Row ${r+1} Column ${c+1}`);
      row.appendChild(t);
      tiles.push(t);
    }
    board.appendChild(row);
    grid.push(tiles);
  }

  // Keyboard layout
  const layout = ["qwertyuiop","asdfghjkl","↵zxcvbnm⌫"];
  layout.forEach((row) => {
    for (const ch of row) {
      const key = document.createElement("button");
      key.className = "key";
      key.type = "button";
      let label = ch;
      if (ch === "↵") { label = "Enter"; key.classList.add("wide"); }
      if (ch === "⌫") { label = "Back"; key.classList.add("wide"); }
      key.textContent = label;
      key.setAttribute("data-key", ch);
      keyboard.appendChild(key);
    }
    const spacer = document.createElement("div");
    spacer.style.gridColumn = "1 / -1";
    keyboard.appendChild(spacer);
  });

  let currentRow = 0;
  let currentCol = 0;
  let locked = false;

  function updateTile() {
    grid[currentRow][currentCol]?.classList.add("filled");
  }

  function submitGuess() {
    if (locked) return;
    if (currentCol < cols) { msg.textContent = "Not enough letters."; return; }
    const guess = grid[currentRow].map(t => t.textContent.toLowerCase()).join("");
    if (!WORDS.includes(guess)) { msg.textContent = "Not in word list."; return; }
    // Score
    const tArr = target.split("");
    const gArr = guess.split("");
    const marks = Array(cols).fill("x"); // default absent
    const counts = {};
    // counts
    for (const ch of tArr) counts[ch] = (counts[ch]||0) + 1;
    // greens
    for (let i=0;i<cols;i++) {
      if (gArr[i] === tArr[i]) { marks[i] = "g"; counts[gArr[i]]--; }
    }
    // yellows
    for (let i=0;i<cols;i++) {
      if (marks[i] === "g") continue;
      const ch = gArr[i];
      if ((counts[ch]||0) > 0) { marks[i] = "y"; counts[ch]--; }
    }
    // paint
    for (let i=0;i<cols;i++) {
      const tile = grid[currentRow][i];
      tile.classList.remove("filled");
      tile.classList.add(marks[i]);
      // keyboard paint
      const key = keyboard.querySelector(`[data-key="${gArr[i]}"]`);
      if (key) {
        // priority: g > y > x
        if (marks[i] === "g") key.className = "key g";
        else if (marks[i] === "y" && !key.classList.contains("g")) key.className = "key y";
        else if (!key.classList.contains("g") && !key.classList.contains("y")) key.classList.add("x");
      }
    }
    // win/lose
    if (guess === target) {
      msg.textContent = "Nice! You solved today’s word.";
      setSolvedToday();
      locked = true;
      return;
    }
    currentRow++;
    currentCol = 0;
    if (currentRow === rows) {
      msg.textContent = `Out of tries. The word was “${target.toUpperCase()}.”`;
      return;
    }
  }

  function press(ch) {
    if (locked) return;
    if (/^[a-z]$/.test(ch)) {
      if (currentCol < cols) {
        grid[currentRow][currentCol].textContent = ch.toUpperCase();
        updateTile();
        currentCol++;
      }
      return;
    }
    if (ch === "⌫") {
      if (currentCol > 0) {
        currentCol--;
        grid[currentRow][currentCol].textContent = "";
        grid[currentRow][currentCol].classList.remove("filled");
      }
      return;
    }
    if (ch === "↵") submitGuess();
  }

  keyboard.addEventListener("click", (e) => {
    const k = e.target.closest(".key"); if (!k) return;
    press(k.getAttribute("data-key"));
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter") press("↵");
    else if (e.key === "Backspace") press("⌫");
    else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
  });
}

// ------------ RIDDLE MODE ------------
function normalize(s) { return s.toLowerCase().replace(/[^a-z]/g, " ").replace(/\s+/g," ").trim(); }
function launchRiddle() {
  $("#riddleSection").classList.remove("hidden");
  const index = dnum % RIDDLES.length;
  const { q, a } = RIDDLES[index];
  const answerSet = new Set(a.map(normalize));
  $("#riddleQuestion").textContent = q;
  const msg = $("#riddleMsg");

  $("#riddleForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const guess = normalize($("#riddleAnswer").value);
    if (!guess) return;
    if (answerSet.has(guess)) {
      msg.textContent = "Correct!";
      setSolvedToday();
    } else {
      msg.textContent = "Not quite — try again.";
    }
  });

  $("#hintBtn").addEventListener("click", () => {
    // Use the first normalized answer for hint lookup
    const key = a.map(normalize)[0];
    const hint = HINTS[key] || "Think simpler than you think.";
    msg.textContent = "Hint: " + hint;
  });

  $("#revealBtn").addEventListener("click", () => {
    msg.textContent = "Answer: " + a[0];
  });
}

// Launch proper mode
if (mode === "Word") launchWordle(); else launchRiddle();
