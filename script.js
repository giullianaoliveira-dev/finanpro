let rates = { USD: 5.0, EUR: 5.4, GBP: 6.3, BTC: 350000.0 };
let chartInstance = null;
const DEFAULT_AVATAR_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

function isUserLoggedIn() {
  return localStorage.getItem("loggedUser") !== null;
}

// 1. GERENCIAMENTO DE NAVEGAÇÃO E ABAS
function updateMenuVisibility() {
  const logged = isUserLoggedIn();

  document.querySelectorAll(".logged-only").forEach((btn) => {
    btn.style.display = logged ? "block" : "none";
  });

  document.querySelectorAll(".unlogged-only").forEach((btn) => {
    btn.style.display = logged ? "none" : "block";
  });

  if (logged) {
    const currentTab = localStorage.getItem("selectedTab");
    if (!currentTab || currentTab === "landing") {
      switchTab("dashboard");
    } else {
      switchTab(currentTab);
    }
  } else {
    switchTab("landing");
  }
}

function switchTab(tabId, element) {
  const logged = isUserLoggedIn();

  if (!logged && tabId !== "landing") tabId = "landing";
  if (logged && tabId === "landing") tabId = "dashboard";

  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".nav-btn")
    .forEach((btn) => btn.classList.remove("active"));

  const targetTab = document.getElementById("tab-" + tabId);
  if (targetTab) targetTab.classList.add("active");

  const activeBtn = element || document.getElementById("btn-tab-" + tabId);
  if (activeBtn) activeBtn.classList.add("active");

  localStorage.setItem("selectedTab", tabId);
}

// 2. BUSCA DE COTAÇÕES EM TEMPO REAL
async function fetchQuotations() {
  try {
    const response = await fetch(
      "https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL",
    );
    const data = await response.json();

    rates.USD = parseFloat(data.USDBRL.bid);
    rates.EUR = parseFloat(data.EURBRL.bid);
    rates.GBP = parseFloat(data.GBPBRL.bid);
    rates.BTC = parseFloat(data.BTCBRL.bid);

    updateCard("usd-price", "usd-change", data.USDBRL);
    updateCard("eur-price", "eur-change", data.EURBRL);
    updateCard("gbp-price", "gbp-change", data.GBPBRL);
    updateCard("btc-price", "btc-change", data.BTCBRL, true);

    if (isUserLoggedIn()) calculatePortfolio();
  } catch (error) {
    console.error("Erro ao buscar cotações:", error);
  }
}

function updateCard(priceId, changeId, coinData, isCrypto = false) {
  const price = parseFloat(coinData.bid);
  const change = parseFloat(coinData.pctChange);

  document.getElementById(priceId).innerText = isCrypto
    ? "R$ " + price.toLocaleString("pt-BR", { minimumFractionDigits: 0 })
    : "R$ " + price.toFixed(2).replace(".", ",");

  const changeElem = document.getElementById(changeId);
  changeElem.innerText = (change >= 0 ? "+" : "") + change.toFixed(2) + "%";
  changeElem.className = "badge " + (change >= 0 ? "positive" : "negative");
}

// 3. GRÁFICO DINÂMICO
const historicalData = {
  USD: { name: "Dólar Americano (USD)", data: [5.08, 5.1, 5.12, 5.11, 5.14] },
  EUR: { name: "Euro (EUR)", data: [5.52, 5.54, 5.53, 5.56, 5.58] },
  GBP: { name: "Libra Esterlina (GBP)", data: [6.42, 6.45, 6.44, 6.48, 6.5] },
  BTC: {
    name: "Bitcoin (BTC)",
    data: [342000, 345000, 348000, 350000, 355000],
  },
};

function selectChartCoin(coinKey, name) {
  document
    .querySelectorAll(".card.clickable")
    .forEach((card) => card.classList.remove("active-card"));
  event.currentTarget.classList.add("active-card");

  document.getElementById("chartTitle").innerText =
    "Histórico de Cotação - " + name;
  updateChartData(historicalData[coinKey].data, coinKey === "BTC");
}

function updateChartData(newData, isCrypto = false) {
  if (!chartInstance) return;
  chartInstance.data.datasets[0].data = newData;
  chartInstance.update();
}

function initChart() {
  const ctx = document.getElementById("marketChart").getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["09:00", "11:00", "13:00", "15:00", "17:00"],
      datasets: [
        {
          label: "Cotação (R$)",
          data: historicalData.USD.data,
          borderColor: "#00f2fe",
          backgroundColor: "rgba(0, 242, 254, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "#2a3558" }, ticks: { color: "#a0aec0" } },
        y: { grid: { color: "#2a3558" }, ticks: { color: "#a0aec0" } },
      },
    },
  });
}

// 4. CARTEIRA & DEPÓSITO SIMULADO
const emptyPortfolio = { usd: 0, eur: 0, gbp: 0, btc: 0, brl: 0 };

function getPortfolioData() {
  const saved = localStorage.getItem("userPortfolio");
  return saved ? JSON.parse(saved) : emptyPortfolio;
}

function calculatePortfolio() {
  const portfolio = getPortfolioData();

  document.getElementById("inputUsd").value = portfolio.usd || "";
  document.getElementById("inputEur").value = portfolio.eur || "";
  document.getElementById("inputGbp").value = portfolio.gbp || "";
  document.getElementById("inputBtc").value = portfolio.btc || "";
  document.getElementById("inputBrl").value = portfolio.brl || "";

  const totalUsd = (portfolio.usd || 0) * rates.USD;
  const totalEur = (portfolio.eur || 0) * rates.EUR;
  const totalGbp = (portfolio.gbp || 0) * rates.GBP;
  const totalBtc = (portfolio.btc || 0) * rates.BTC;
  const totalBrl = portfolio.brl || 0;

  const grandTotal = totalUsd + totalEur + totalGbp + totalBtc + totalBrl;

  document.getElementById("totalPortfolioValue").innerText =
    "R$ " +
    grandTotal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const listContainer = document.getElementById("assetList");
  listContainer.innerHTML = `
    <div class="asset-item">
      <div class="asset-info"><strong>Dólar Americano</strong><span>${portfolio.usd || 0} USD</span></div>
      <div class="asset-value">R$ ${totalUsd.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="asset-item">
      <div class="asset-info"><strong>Euro</strong><span>${portfolio.eur || 0} EUR</span></div>
      <div class="asset-value">R$ ${totalEur.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="asset-item">
      <div class="asset-info"><strong>Libra Esterlina</strong><span>${portfolio.gbp || 0} GBP</span></div>
      <div class="asset-value">R$ ${totalGbp.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="asset-item">
      <div class="asset-info"><strong>Bitcoin</strong><span>${portfolio.btc || 0} BTC</span></div>
      <div class="asset-value">R$ ${totalBtc.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="asset-item">
      <div class="asset-info"><strong>Saldo em Reais</strong><span>BRL</span></div>
      <div class="asset-value">R$ ${totalBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
    </div>
  `;
}

document.getElementById("portfolioForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const updatedPortfolio = {
    usd: parseFloat(document.getElementById("inputUsd").value) || 0,
    eur: parseFloat(document.getElementById("inputEur").value) || 0,
    gbp: parseFloat(document.getElementById("inputGbp").value) || 0,
    btc: parseFloat(document.getElementById("inputBtc").value) || 0,
    brl: parseFloat(document.getElementById("inputBrl").value) || 0,
  };

  localStorage.setItem("userPortfolio", JSON.stringify(updatedPortfolio));
  calculatePortfolio();
  alert("Carteira atualizada com sucesso!");
});

// LÓGICA DO MODAL DE DEPÓSITO
function toggleDepositModal(show) {
  document.getElementById("depositModal").classList.toggle("active", show);
}

function updateDepositMethodView() {
  const method = document.getElementById("depositMethod").value;
  document.getElementById("methodPixView").style.display =
    method === "pix" ? "block" : "none";
  document.getElementById("methodCardView").style.display =
    method === "card" ? "block" : "none";
}

document.getElementById("depositForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const depositValue =
    parseFloat(document.getElementById("depositAmount").value) || 0;

  if (depositValue <= 0) {
    alert("Insira um valor válido de depósito!");
    return;
  }

  const portfolio = getPortfolioData();
  portfolio.brl = (portfolio.brl || 0) + depositValue;

  localStorage.setItem("userPortfolio", JSON.stringify(portfolio));
  calculatePortfolio();
  toggleDepositModal(false);
  document.getElementById("depositForm").reset();
  alert(`Depósito de R$ ${depositValue.toFixed(2)} confirmado com sucesso!`);
});

// 5. PERFIL E AUTENTICAÇÃO
function toggleAuthModal(show) {
  document.getElementById("authModal").classList.toggle("active", show);
  if (show) loadSavedCredentials();
}

function switchAuthTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("btnTabLogin").classList.toggle("active", isLogin);
  document
    .getElementById("btnTabRegister")
    .classList.toggle("active", !isLogin);
  document.getElementById("loginForm").classList.toggle("active", isLogin);
  document.getElementById("registerForm").classList.toggle("active", !isLogin);
}

function loadSavedCredentials() {
  const savedCreds = localStorage.getItem("rememberedCredentials");
  if (savedCreds) {
    const creds = JSON.parse(savedCreds);
    document.getElementById("loginEmail").value = creds.email || "";
    document.getElementById("loginPassword").value = creds.password || "";
    document.getElementById("loginRememberMe").checked = true;
  }
}

function renderUserProfile() {
  const profileContainer = document.getElementById("userProfileSection");
  const userJson = localStorage.getItem("loggedUser");

  if (userJson) {
    const user = JSON.parse(userJson);
    const avatarUrl = user.avatar || DEFAULT_AVATAR_SVG;

    profileContainer.innerHTML = `
      <div class="user-card">
        <div class="avatar-wrapper" onclick="triggerAvatarSelect()" title="Alterar Foto">
          <img src="${avatarUrl}" alt="Foto de Perfil" class="user-avatar">
          <div class="edit-avatar-icon">P</div>
        </div>
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          <div class="user-email">${user.email}</div>
        </div>
        <button class="btn-logout" onclick="logoutUser()" title="Sair">Sair</button>
      </div>
    `;
  } else {
    profileContainer.innerHTML = `
      <button class="login-trigger-btn" onclick="toggleAuthModal(true)">
        Entrar / Cadastrar
      </button>
    `;
  }

  updateMenuVisibility();
}

function triggerAvatarSelect() {
  document.getElementById("avatarFileInput").click();
}

function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const userJson = localStorage.getItem("loggedUser");
    if (userJson) {
      const user = JSON.parse(userJson);
      user.avatar = e.target.result;
      localStorage.setItem("loggedUser", JSON.stringify(user));
      renderUserProfile();
    }
  };
  reader.readAsDataURL(file);
}

// CADASTRO DE USUÁRIO
document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  const remember = document.getElementById("regRememberMe").checked;

  const userData = { name, email, avatar: "" };
  localStorage.setItem("loggedUser", JSON.stringify(userData));
  localStorage.setItem("userPortfolio", JSON.stringify(emptyPortfolio));

  if (remember) {
    localStorage.setItem(
      "rememberedCredentials",
      JSON.stringify({ email, password }),
    );
  }

  renderUserProfile();
  toggleAuthModal(false);
  document.getElementById("registerForm").reset();
  switchTab("dashboard");
});

// LOGIN
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const remember = document.getElementById("loginRememberMe").checked;

  const existingUserJson = localStorage.getItem("loggedUser");
  let userData = existingUserJson
    ? JSON.parse(existingUserJson)
    : { name: email.split("@")[0], email: email, avatar: "" };

  localStorage.setItem("loggedUser", JSON.stringify(userData));

  if (remember) {
    localStorage.setItem(
      "rememberedCredentials",
      JSON.stringify({ email, password }),
    );
  } else {
    localStorage.removeItem("rememberedCredentials");
  }

  renderUserProfile();
  toggleAuthModal(false);
  document.getElementById("loginForm").reset();
  switchTab("dashboard");
});

function logoutUser() {
  localStorage.removeItem("loggedUser");
  localStorage.removeItem("selectedTab");
  renderUserProfile();
}

// 6. CONFIGURAÇÕES
function initSettings() {
  const select = document.getElementById("settingCurrency");
  const saved = localStorage.getItem("userCurrency");
  if (saved) select.value = saved;

  select.addEventListener("change", (e) => {
    localStorage.setItem("userCurrency", e.target.value);
  });
}

// INICIALIZAÇÃO
renderUserProfile();
initSettings();
fetchQuotations();
initChart();
