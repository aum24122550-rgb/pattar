async function loadJSON() {
  try {
    const res = await fetch('recipes.json');
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('loadJSON error', err);
    return [];
  }
}

function q(sel) { return document.querySelector(sel); }

function getStorageComments(id) {
  try { return JSON.parse(localStorage.getItem(`recipe-comments-${id}`) || '[]'); }
  catch (e) { return []; }
}

function saveStorageComments(id, arr) {
  localStorage.setItem(`recipe-comments-${id}`, JSON.stringify(arr));
}

function averageRating(arr) {
  if (!arr.length) return 0;
  return (arr.reduce((s, a) => s + (a.rating || 0), 0) / arr.length).toFixed(1);
}

const STAGE_PROFILES = {
  stage3: { label: 'ระยะ 3', sodiumMax: 600, potassiumMax: 400, phosphorusMax: 180, calciumMin: 80, calciumMax: 200 },
  stage4: { label: 'ระยะ 4', sodiumMax: 500, potassiumMax: 300, phosphorusMax: 150, calciumMin: 70, calciumMax: 160 },
  stage5: { label: 'ระยะ 5 ก่อนฟอกไต', sodiumMax: 350, potassiumMax: 220, phosphorusMax: 120, calciumMin: 60, calciumMax: 120 }
};

function getRecommendedStages(recipe) {
  const n = recipe.nutrition || {};
  const sodium = n.sodium || 0;
  const potassium = n.potassium || 0;
  const phosphorus = n.phosphorus || 0;
  const calcium = n.calcium || 0;
  const targetStage = recipe.targetStage || null;

  const matched = Object.entries(STAGE_PROFILES)
    .filter(([_, p]) => sodium <= p.sodiumMax
      && potassium <= p.potassiumMax
      && phosphorus <= p.phosphorusMax
      && calcium >= p.calciumMin
      && calcium <= p.calciumMax)
    .map(([stage]) => stage);

  if (targetStage) return matched.includes(targetStage) ? [targetStage] : [];
  return matched;
}

function stageLabel(stage) {
  const profile = STAGE_PROFILES[stage];
  return profile ? `เหมาะกับ${profile.label}` : stage;
}

function stageGuideText(stage) {
  if (stage === 'all') return 'ทุกเมนูจะแสดงป้ายว่าเหมาะกับระยะไตใด โดยคำนึงถึงโซเดียม โพแทสเซียม ฟอสฟอรัส และแคลเซียม';
  const p = STAGE_PROFILES[stage];
  if (!p) return '';
  return `${p.label}: สูตรที่แนะนำจะมีโซเดียม ≤ ${p.sodiumMax} mg, โพแทสเซียม ≤ ${p.potassiumMax} mg, ฟอสฟอรัส ≤ ${p.phosphorusMax} mg และแคลเซียม ${p.calciumMin}-${p.calciumMax} mg ต่อที่`;
}

function renderList(recipes) {
  const cont = q('#list');
  if (!cont) return;

  cont.innerHTML = '';
  if (!recipes.length) {
    cont.innerHTML = '<p class="empty-text">ไม่พบสูตรที่เหมาะกับเงื่อนไขที่เลือก</p>';
    return;
  }

  recipes.forEach((r) => {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = `recipe.html?id=${r.id}`;

    const stageBadges = (r.recommendedStages || [])
      .map((s) => `<span class="stage-badge">${stageLabel(s)}</span>`)
      .join('');

    card.innerHTML = `
      <h3>${r.title}</h3>
      <p>${r.description || ''}</p>
      <div class="stage-badge-wrap">${stageBadges || '<span class="stage-badge stage-badge-warning">ควรปรึกษานักกำหนดอาหาร</span>'}</div>
    `;
    cont.appendChild(card);
  });
}

function initHomePage() {
  if (!q('#list')) return;

  (async () => {
    const rawRecipes = await loadJSON();
    const recipes = rawRecipes.map((r) => ({ ...r, recommendedStages: getRecommendedStages(r) }));

    const searchInput = q('#search');
    const stageSelect = q('#kidneyStage');
    const stageGuide = q('#stageGuide');

    const applyFilters = () => {
      const keyword = (searchInput?.value || '').trim().toLowerCase();
      const stage = stageSelect?.value || 'all';
      if (stageGuide) stageGuide.innerText = stageGuideText(stage);

      const filtered = recipes.filter((r) => {
        const ingredientsText = (r.ingredients || []).join(' ').toLowerCase();
        const keywordPass = !keyword || r.title.toLowerCase().includes(keyword) || ingredientsText.includes(keyword);
        const stagePass = stage === 'all' || (r.recommendedStages || []).includes(stage);
        return keywordPass && stagePass;
      });

      renderList(filtered);
    };

    if (stageSelect) stageSelect.addEventListener('change', applyFilters);
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    applyFilters();
  })();
}

function initRecipePage() {
  if (!q('#recipe')) return;

  (async () => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const data = await loadJSON();
    const r = data.find((x) => x.id === id);

    if (!r) {
      q('#recipe').innerText = 'ไม่พบสูตร';
      return;
    }

    const comments = getStorageComments(id);
    const avg = averageRating(comments);

    const el = document.createElement('article');
    el.className = 'card recipe-detail-card';
    el.innerHTML = `
      <div class="recipe-hero">
        <h2>${r.title}</h2>
        <p class="recipe-desc">${r.description || ''}</p>
      </div>

      <div class="recipe-grid">
        <section class="recipe-section">
          <h4>วัตถุดิบ</h4>
          <ul class="clean-list">${(r.ingredients || []).map((i) => `<li>${i}</li>`).join('')}</ul>
        </section>

        <section class="recipe-section">
          <h4>วิธีทำ</h4>
          <ol class="clean-list">${(r.steps || []).map((s) => `<li>${s}</li>`).join('')}</ol>
        </section>
      </div>

      ${r.note ? `<div class="note-box"><strong>💡 ข้อแนะนำ:</strong> ${r.note}</div>` : ''}

      ${r.nutrition ? `<section class="recipe-section"><h4>สารอาหาร</h4><div class="nutrition-grid"><div class="nutrition-pill">พลัง: ${Math.round(r.nutrition.calories)} kcal</div><div class="nutrition-pill">โปรตีน: ${r.nutrition.protein.toFixed(1)} g</div><div class="nutrition-pill">คาร์โบไฮเดต: ${r.nutrition.carbs.toFixed(1)} g</div><div class="nutrition-pill">ไขมัน: ${r.nutrition.fat.toFixed(1)} g</div><div class="nutrition-pill">โซเดียม: ${Math.round(r.nutrition.sodium)} mg</div>${r.nutrition.potassium ? `<div class="nutrition-pill">โพแทสเซียม: ${Math.round(r.nutrition.potassium)} mg</div>` : ''}${r.nutrition.phosphorus ? `<div class="nutrition-pill">ฟอสฟอรัส: ${Math.round(r.nutrition.phosphorus)} mg</div>` : ''}${r.nutrition.calcium ? `<div class="nutrition-pill">แคลเซียม: ${Math.round(r.nutrition.calcium)} mg</div>` : ''}</div></section>` : ''}

      <div class="recipe-meta">คะแนนเฉลี่ย: <span class="rating">${avg}</span></div>

      <div class="comment modern-comment">
        <h4>เพิ่มคอมเมนต์/ให้คะแนน</h4>
        <div class="comment-layout">
          <input id="name" placeholder="ชื่อ (ไม่บังคับ)" />
          <textarea id="msg" rows="3" placeholder="คอมเมนต์"></textarea>
          <label>ให้คะแนน: <select id="rating"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label>
          <button id="send">ส่ง</button>
        </div>
      </div>

      <div id="commentsList"></div>`;

    q('#recipe').appendChild(el);

    function renderComments() {
      const list = q('#commentsList');
      list.innerHTML = '';
      const arr = getStorageComments(id);

      if (!arr.length) {
        list.innerHTML = '<p class="empty-text">ยังไม่มีคอมเมนต์</p>';
      } else {
        arr.slice().reverse().forEach((c) => {
          const d = document.createElement('div');
          d.className = 'card comment-card';
          d.innerHTML = `<strong>${c.name || 'ผู้ใช้'}</strong> <span class="recipe-meta">(${c.date})</span><div>ให้คะแนน: <span class="rating">${c.rating}</span></div><p>${c.comment}</p>`;
          list.appendChild(d);
        });
      }
    }

    renderComments();
    q('#send').addEventListener('click', () => {
      const name = q('#name').value.trim();
      const comment = q('#msg').value.trim();
      const rating = parseInt(q('#rating').value, 10);
      if (!comment) {
        alert('กรุณาพิมพ์คอมเมนต์');
        return;
      }
      const arr = getStorageComments(id);
      arr.push({ name, comment, rating, date: new Date().toLocaleString('th-TH') });
      saveStorageComments(id, arr);
      renderComments();
      q('.rating').innerText = averageRating(arr);
      q('#msg').value = '';
    });
  })();
}

function findMemberCount() {
  const possibleKeys = ['members', 'users', 'app-members'];
  for (const key of possibleKeys) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(value)) return value.length;
    } catch (e) {
      // skip invalid key
    }
  }
  return 0;
}

function topRecipes(recipes) {
  return recipes
    .map((r) => {
      const comments = getStorageComments(r.id);
      const avg = comments.length ? comments.reduce((s, c) => s + (c.rating || 0), 0) / comments.length : 0;
      const score = comments.length * 10 + avg;
      return { id: r.id, title: r.title, comments: comments.length, avg: avg.toFixed(1), score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function initAdminPage() {
  if (!q('#adminLogin')) return;

  const validUser = 'jusin888';
  const validPass = 'jusin888';

  const adminLogin = q('#adminLogin');
  const adminDashboard = q('#adminDashboard');
  const adminError = q('#adminError');

  q('#adminLoginBtn').addEventListener('click', async () => {
    const user = q('#adminUser').value.trim();
    const pass = q('#adminPass').value;

    if (user !== validUser || pass !== validPass) {
      adminError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      return;
    }

    adminError.textContent = '';
    const recipes = await loadJSON();

    q('#memberCount').textContent = findMemberCount();
    q('#recipeCount').textContent = recipes.length;

    const popular = topRecipes(recipes);
    const list = q('#popularRecipes');
    list.innerHTML = '';

    if (!popular.length) {
      const li = document.createElement('li');
      li.textContent = 'ยังไม่มีข้อมูลคะแนน';
      list.appendChild(li);
    } else {
      popular.forEach((item) => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="recipe.html?id=${item.id}">${item.title}</a> (${item.comments} รีวิว, เฉลี่ย ${item.avg})`;
        list.appendChild(li);
      });
    }

    adminLogin.hidden = true;
    adminDashboard.hidden = false;
  });
}

initHomePage();
initRecipePage();
initAdminPage();
