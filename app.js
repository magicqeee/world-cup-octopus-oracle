const FIXTURES_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=2026";

const fallbackFixtures = [
  ["South Africa", "Mexico", "2026-06-11T19:00:00Z", "Group Stage"],
  ["Czechia", "South Korea", "2026-06-12T02:00:00Z", "Group Stage"],
  ["Bosnia-Herzegovina", "Canada", "2026-06-12T19:00:00Z", "Group Stage"],
  ["Paraguay", "United States", "2026-06-13T01:00:00Z", "Group Stage"],
  ["Switzerland", "Qatar", "2026-06-13T19:00:00Z", "Group Stage"],
  ["Morocco", "Brazil", "2026-06-13T22:00:00Z", "Group Stage"],
  ["Scotland", "Haiti", "2026-06-14T01:00:00Z", "Group Stage"],
  ["Türkiye", "Australia", "2026-06-14T04:00:00Z", "Group Stage"],
].map(([away, home, date, stage], index) => ({
  id: `fallback-${index}`,
  date,
  stage,
  home: { name: home, flag: flagUrl(home) },
  away: { name: away, flag: flagUrl(away) },
}));

const chineseNames = {
  Algeria: "阿尔及利亚", Argentina: "阿根廷", Australia: "澳大利亚", Austria: "奥地利",
  Belgium: "比利时", "Bosnia-Herzegovina": "波黑", Brazil: "巴西", Canada: "加拿大",
  "Cape Verde": "佛得角", Colombia: "哥伦比亚", "Congo DR": "刚果民主共和国",
  Croatia: "克罗地亚", Curaçao: "库拉索", Czechia: "捷克", Ecuador: "厄瓜多尔",
  Egypt: "埃及", England: "英格兰", France: "法国", Germany: "德国", Ghana: "加纳",
  Haiti: "海地", Iran: "伊朗", Iraq: "伊拉克", "Ivory Coast": "科特迪瓦",
  Japan: "日本", Jordan: "约旦", Mexico: "墨西哥", Morocco: "摩洛哥",
  Netherlands: "荷兰", "New Zealand": "新西兰", Norway: "挪威", Panama: "巴拿马",
  Paraguay: "巴拉圭", Portugal: "葡萄牙", Qatar: "卡塔尔", "Saudi Arabia": "沙特阿拉伯",
  Scotland: "苏格兰", Senegal: "塞内加尔", "South Africa": "南非", "South Korea": "韩国",
  Spain: "西班牙", Sweden: "瑞典", Switzerland: "瑞士", Tunisia: "突尼斯",
  Türkiye: "土耳其", "United States": "美国", Uruguay: "乌拉圭", Uzbekistan: "乌兹别克斯坦",
};

const fixtureGrid = document.querySelector("#fixtureGrid");
const notice = document.querySelector("#notice");
const sourceLabel = document.querySelector("#sourceLabel");
const refreshButton = document.querySelector("#refreshButton");
const emptyOracle = document.querySelector("#emptyOracle");
const predictionStage = document.querySelector("#predictionStage");
const resultBanner = document.querySelector("#resultBanner");
const raceOctopus = document.querySelector("#raceOctopus");
const leftFlag = document.querySelector("#leftFlag");
const rightFlag = document.querySelector("#rightFlag");
const leftName = document.querySelector("#leftName");
const rightName = document.querySelector("#rightName");
const leftSide = document.querySelector(".left-side");
const rightSide = document.querySelector(".right-side");
const winnerName = document.querySelector("#winnerName");
const resultLine = document.querySelector("#resultLine");
const celebrationLayer = document.querySelector("#celebrationLayer");

let fixtures = [];
let selectedFixtureId = null;
let predictionTimer;

function flagUrl(name) {
  const countryCodes = {
    Mexico: "mx", Canada: "ca", "United States": "us", Brazil: "br", Qatar: "qa",
    Morocco: "ma", Australia: "au", Haiti: "ht", Scotland: "gb-sct", Switzerland: "ch",
    Paraguay: "py", "South Africa": "za", "South Korea": "kr", Czechia: "cz",
    "Bosnia-Herzegovina": "ba", Türkiye: "tr",
  };
  const code = countryCodes[name] || "un";
  return `https://flagcdn.com/w160/${code}.png`;
}

function readCompetitor(competitor) {
  return {
    name: competitor.team.displayName,
    zhName: chineseNames[competitor.team.displayName] || competitor.team.displayName,
    flag: competitor.team.logo || flagUrl(competitor.team.displayName),
  };
}

function teamLabel(team) {
  return `<b>${team.zhName || chineseNames[team.name] || team.name}<small>${team.name}</small></b>`;
}

function normalizeEvent(event) {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((team) => team.homeAway === "home");
  const away = competition?.competitors?.find((team) => team.homeAway === "away");
  if (!home || !away || /TBD|Winner|Runner-up|Group .+ Place/i.test(`${home.team.displayName}${away.team.displayName}`)) {
    return null;
  }
  return {
    id: event.id,
    date: event.date,
    stage: competition.type?.abbreviation || event.season?.type?.name || "World Cup",
    status: event.status?.type?.shortDetail || "",
    home: readCompetitor(home),
    away: readCompetitor(away),
  };
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function renderFixtures() {
  fixtureGrid.innerHTML = fixtures.map((match) => `
    <button class="fixture-card ${match.id === selectedFixtureId ? "selected" : ""}" data-id="${match.id}" type="button">
      <span class="match-meta">${match.stage} · ${formatDate(match.date)}</span>
      <span class="matchup">
        <span class="team"><img src="${match.away.flag}" alt="" />${teamLabel(match.away)}</span>
        <em>VS</em>
        <span class="team"><img src="${match.home.flag}" alt="" />${teamLabel(match.home)}</span>
      </span>
      <span class="choose-label">${match.id === selectedFixtureId ? "章鱼正在思考..." : "选择这场 →"}</span>
    </button>
  `).join("");
}

async function loadFixtures() {
  refreshButton.disabled = true;
  notice.hidden = false;
  notice.textContent = "正在从公开赛程接口打捞对阵...";
  sourceLabel.textContent = "正在连接赛程...";

  try {
    const response = await fetch(FIXTURES_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    fixtures = data.events.map(normalizeEvent).filter(Boolean);
    if (!fixtures.length) throw new Error("没有已确定对阵");
    notice.textContent = `实时接口已连接 · 当前找到 ${fixtures.length} 场赛程 · 更新于 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
    sourceLabel.textContent = "LIVE · 赛程";
  } catch (error) {
    fixtures = fallbackFixtures;
    notice.textContent = `实时接口暂时不可用，正在展示 ${fixtures.length} 场备用对阵。`;
    sourceLabel.textContent = "OFFLINE · 备用赛程";
  } finally {
    refreshButton.disabled = false;
    renderFixtures();
  }
}

function randomSide() {
  if (globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(new Uint8Array(1))[0] % 2;
  }
  return Math.floor(Math.random() * 2);
}

function launchCelebration(side) {
  celebrationLayer.replaceChildren();
  celebrationLayer.className = `celebration-layer active ${side}`;
  const colors = ["#ffd84a", "#ff6b5f", "#dff9f5", "#a7e05f", "#ffffff", "#075985"];
  for (let index = 0; index < 14; index += 1) {
    const piece = document.createElement("i");
    piece.className = "confetti-piece";
    piece.style.setProperty("--x", `${Math.round((Math.random() - 0.5) * 320)}px`);
    piece.style.setProperty("--y", `${Math.round(-80 - Math.random() * 190)}px`);
    piece.style.setProperty("--r", `${Math.round(Math.random() * 540)}deg`);
    piece.style.setProperty("--delay", `${(Math.random() * 0.2).toFixed(2)}s`);
    piece.style.setProperty("--color", colors[index % colors.length]);
    celebrationLayer.append(piece);
  }
  for (let index = 0; index < 6; index += 1) {
    const streamer = document.createElement("b");
    streamer.className = "streamer";
    streamer.style.setProperty("--x", `${Math.round((Math.random() - 0.5) * 350)}px`);
    streamer.style.setProperty("--y", `${Math.round(-120 - Math.random() * 150)}px`);
    streamer.style.setProperty("--r", `${Math.round((Math.random() - 0.5) * 140)}deg`);
    streamer.style.setProperty("--delay", `${(Math.random() * 0.18).toFixed(2)}s`);
    streamer.style.setProperty("--color", colors[(index + 1) % colors.length]);
    celebrationLayer.append(streamer);
  }
  window.setTimeout(() => {
    celebrationLayer.className = "celebration-layer";
  }, 1700);
}

function predict(match) {
  clearTimeout(predictionTimer);
  selectedFixtureId = match.id;
  renderFixtures();
  emptyOracle.hidden = true;
  predictionStage.hidden = false;
  resultBanner.hidden = true;
  leftSide.classList.remove("winner");
  rightSide.classList.remove("winner");

  leftFlag.src = match.away.flag;
  leftFlag.alt = `${match.away.name} 国旗`;
  leftName.innerHTML = `${match.away.zhName || chineseNames[match.away.name] || match.away.name}<small>${match.away.name}</small>`;
  rightFlag.src = match.home.flag;
  rightFlag.alt = `${match.home.name} 国旗`;
  rightName.innerHTML = `${match.home.zhName || chineseNames[match.home.name] || match.home.name}<small>${match.home.name}</small>`;

  raceOctopus.className = "race-octopus thinking";
  void raceOctopus.offsetWidth;

  const winnerIsRight = Boolean(randomSide());
  predictionTimer = window.setTimeout(() => {
    const winner = winnerIsRight ? match.home : match.away;
    const opponent = winnerIsRight ? match.away : match.home;
    raceOctopus.className = `race-octopus ${winnerIsRight ? "pick-right" : "pick-left"}`;
    window.setTimeout(() => {
      (winnerIsRight ? rightSide : leftSide).classList.add("winner");
      const winnerZh = winner.zhName || chineseNames[winner.name] || winner.name;
      const opponentZh = opponent.zhName || chineseNames[opponent.name] || opponent.name;
      winnerName.textContent = `${winnerZh} · ${winner.name}`;
      resultLine.textContent = `触手已经决定：${winnerZh} 将在这场对阵中战胜 ${opponentZh}。`;
      resultBanner.hidden = false;
      launchCelebration(winnerIsRight ? "right" : "left");
    }, 1250);
  }, 1150);
}

fixtureGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".fixture-card");
  if (!card) return;
  const match = fixtures.find((fixture) => fixture.id === card.dataset.id);
  if (match) predict(match);
});

refreshButton.addEventListener("click", loadFixtures);
loadFixtures();
