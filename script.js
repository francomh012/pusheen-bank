const supabase = window.supabase;

const coinDisplay = document.getElementById("coin-count");
const availableDisplay = document.getElementById("available-coins");
const addButton = document.getElementById("add-coin");
const removeButton = document.getElementById("remove-coin");
const usernameInput = document.getElementById("username");
const historyDiv = document.getElementById("history");

let coins = 0;
let available = 0;
let history = [];

// ======================
// CARGAR DATOS DESDE SUPABASE
// ======================

async function loadData() {
  const { data, error } = await supabase
    .from('bank')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  coins = data.coins;
  available = data.available;
  history = data.history || [];

  coinDisplay.textContent = coins;
  availableDisplay.textContent = available;

  renderHistory();
}

// ======================
// ACTUALIZAR BASE
// ======================

async function updateData() {
  await supabase
    .from('bank')
    .update({
      coins: coins,
      available: available,
      history: history
    })
    .eq('id', 1);
}

// ======================
// HISTORIAL
// ======================

function renderHistory() {
  historyDiv.innerHTML = "<h3>Historial</h3>";

  history.slice(-10).reverse().forEach(entry => {
    const p = document.createElement("p");
    p.textContent = entry;
    historyDiv.appendChild(p);
  });
}

// ======================
// BOTONES
// ======================

addButton.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  if (!username) return alert("Pon tu nombre 😼");

  if (available > 0) {
    coins++;
    available--;

    history.push(`${username} dio una moneda 🪙 - ${new Date().toLocaleString()}`);

    await updateData();
    loadData();
  }
});

removeButton.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  if (!username) return alert("Pon tu nombre 😼");

  if (coins > 0) {
    coins--;
    available++;

    history.push(`${username} quitó una moneda ❌ - ${new Date().toLocaleString()}`);

    await updateData();
    loadData();
  }
});

// ======================
// INICIAR
// ======================

loadData();