async function loadJSON(){
  try{
    const res = await fetch('recipes.json');
    if(!res.ok) throw new Error('fetch failed: '+res.status);
    return await res.json();
  }catch(err){
    console.error('loadJSON error', err);
    return [];
  }
}

function q(sel){return document.querySelector(sel)}

function getStorageComments(id){try{return JSON.parse(localStorage.getItem('recipe-comments-'+id)||'[]')}catch(e){return[]}}
function saveStorageComments(id,arr){localStorage.setItem('recipe-comments-'+id,JSON.stringify(arr))}
function averageRating(arr){if(!arr.length) return 0;return (arr.reduce((s,a)=>s+(a.rating||0),0)/arr.length).toFixed(1)}

const STAGE_PROFILES = {
  stage3: { label: 'ระยะ 3', sodiumMax: 600, potassiumMax: 400, phosphorusMax: 180, calciumMin: 80, calciumMax: 200 },
  stage4: { label: 'ระยะ 4', sodiumMax: 500, potassiumMax: 300, phosphorusMax: 150, calciumMin: 70, calciumMax: 160 },
  stage5: { label: 'ระยะ 5 ก่อนฟอกไต', sodiumMax: 350, potassiumMax: 220, phosphorusMax: 120, calciumMin: 60, calciumMax: 120 }
};

function getRecommendedStages(recipe){
  const nutrition = recipe.nutrition || {};
  const sodium = nutrition.sodium || 0;
  const potassium = nutrition.potassium || 0;
  const phosphorus = nutrition.phosphorus || 0;
  const calcium = nutrition.calcium || 0;
  const targetStage = recipe.targetStage || null;

  const matched = Object.entries(STAGE_PROFILES)
    .filter(([_, p]) => (
      sodium <= p.sodiumMax &&
      potassium <= p.potassiumMax &&
      phosphorus <= p.phosphorusMax &&
      calcium >= p.calciumMin &&
      calcium <= p.calciumMax
    ))
    .map(([stage]) => stage);

  if(targetStage){
    return matched.includes(targetStage) ? [targetStage] : [];
  }

  return matched;
}

function stageLabel(stage){
  const profile = STAGE_PROFILES[stage];
  return profile ? `เหมาะกับ${profile.label}` : stage;
}

function stageGuideText(stage){
  if(stage === 'all') return 'ทุกเมนูจะแสดงป้ายว่าเหมาะกับระยะไตใด โดยคำนึงถึงโซเดียม โพแทสเซียม ฟอสฟอรัส และแคลเซียม';
  const p = STAGE_PROFILES[stage];
  if(!p) return '';
  return `${p.label}: สูตรที่แนะนำจะมีโซเดียม ≤ ${p.sodiumMax} mg, โพแทสเซียม ≤ ${p.potassiumMax} mg, ฟอสฟอรัส ≤ ${p.phosphorusMax} mg และแคลเซียม ${p.calciumMin}-${p.calciumMax} mg ต่อที่`;
}

function renderList(recipes){
  const cont=q('#list');
  cont.innerHTML='';
  if(!recipes.length){
    cont.innerHTML='<p class="empty-text">ไม่พบสูตรที่เหมาะกับเงื่อนไขที่เลือก</p>';
    return;
  }

  recipes.forEach(r=>{
    const card=document.createElement('a');
    card.className='card';
    card.href=`recipe.html?id=${r.id}`;

    const stageBadges = (r.recommendedStages || [])
      .map(s => `<span class="stage-badge">${stageLabel(s)}</span>`)
      .join('');

    card.innerHTML=`
      <h3>${r.title}</h3>
      <p>${r.description||''}</p>
      <div class="stage-badge-wrap">${stageBadges || '<span class="stage-badge stage-badge-warning">ควรปรึกษานักกำหนดอาหาร</span>'}</div>
    `;
    cont.appendChild(card);
  });
}

if(q('#list')){
  (async()=>{
    const rawRecipes=await loadJSON();
    const recipes = rawRecipes.map(r => ({ ...r, recommendedStages: getRecommendedStages(r) }));

    const searchInput = q('#search');
    const stageSelect = q('#kidneyStage');
    const stageGuide = q('#stageGuide');

    function applyFilters(){
      const keyword = searchInput.value.trim().toLowerCase();
      const stage = stageSelect.value;
      stageGuide.innerText = stageGuideText(stage);

      const filtered = recipes.filter(r=>{
        const keywordPass = !keyword || r.title.toLowerCase().includes(keyword) || (r.ingredients||[]).join(' ').toLowerCase().includes(keyword);
        const stagePass = stage === 'all' || (r.recommendedStages || []).includes(stage);
        return keywordPass && stagePass;
      });

      renderList(filtered);
    }

    stageSelect.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);
    applyFilters();
  })();
}

if(q('#recipe')){
  (async()=>{
    const params=new URLSearchParams(location.search);
    const id=params.get('id');
    const data=await (await fetch('recipes.json')).json();
    const r=data.find(x=>x.id===id);
    if(!r){q('#recipe').innerText='ไม่พบสูตร';return}
    const comments=getStorageComments(id);
    const avg=averageRating(comments);

    const el=document.createElement('article');
    el.className='card recipe-detail-card';
    el.innerHTML=`
      <div class="recipe-hero">
        <h2>${r.title}</h2>
        <p class="recipe-desc">${r.description||''}</p>
      </div>

      <div class="recipe-grid">
        <section class="recipe-section">
          <h4>วัตถุดิบ</h4>
          <ul id="ingredientsList" class="clean-list">${(r.ingredients||[]).map(i=>`<li>${i}</li>`).join('')}</ul>
        </section>

        <section class="recipe-section">
          <h4>วิธีทำ</h4>
          <ol class="clean-list">${(r.steps||[]).map(s=>`<li>${s}</li>`).join('')}</ol>
        </section>
      </div>

      ${r.note?`<div class="note-box"><strong>💡 ข้อแนะนำ:</strong> ${r.note}</div>`:''}

      ${r.nutrition?`<section class="recipe-section"><h4>สารอาหาร</h4><div class="nutrition-grid"><div class="nutrition-pill">พลัง: ${Math.round(r.nutrition.calories)} kcal</div><div class="nutrition-pill">โปรตีน: ${r.nutrition.protein.toFixed(1)} g</div><div class="nutrition-pill">คาร์โบไฮเดต: ${r.nutrition.carbs.toFixed(1)} g</div><div class="nutrition-pill">ไขมัน: ${r.nutrition.fat.toFixed(1)} g</div><div class="nutrition-pill">โซเดียม: ${Math.round(r.nutrition.sodium)} mg</div>${r.nutrition.potassium?`<div class="nutrition-pill">โพแทสเซียม: ${Math.round(r.nutrition.potassium)} mg</div>`:''}${r.nutrition.phosphorus?`<div class="nutrition-pill">ฟอสฟอรัส: ${Math.round(r.nutrition.phosphorus)} mg</div>`:''}${r.nutrition.calcium?`<div class="nutrition-pill">แคลเซียม: ${Math.round(r.nutrition.calcium)} mg</div>`:''}</div></section>`:''}

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

    function renderComments(){const list=q('#commentsList');list.innerHTML='';const arr=getStorageComments(id);if(!arr.length) list.innerHTML='<p class="empty-text">ยังไม่มีคอมเมนต์</p>';else{arr.slice().reverse().forEach(c=>{const d=document.createElement('div');d.className='card comment-card';d.innerHTML=`<strong>${c.name||'ผู้ใช้'}</strong> <span class="recipe-meta">(${c.date})</span><div>ให้คะแนน: <span class="rating">${c.rating}</span></div><p>${c.comment}</p>`;list.appendChild(d)})}}

    renderComments();
    q('#send').addEventListener('click',()=>{
      const name=q('#name').value.trim();const comment=q('#msg').value.trim();const rating=parseInt(q('#rating').value,10);
      if(!comment){alert('กรุณาพิมพ์คอมเมนต์');return}
      const arr=getStorageComments(id);
      arr.push({name,comment,rating,date:new Date().toLocaleString('th-TH')});
      saveStorageComments(id,arr);renderComments();
      q('.rating').innerText=averageRating(arr);
      q('#msg').value='';
    });
  })();
}

function getMemberCount(){
  const candidateKeys = ['members', 'users', 'app-members'];
  for(const key of candidateKeys){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed)) return parsed.length;
      if(parsed && typeof parsed.count === 'number') return parsed.count;
    }catch(e){
      // ignore invalid data
    }
  }
  return 0;
}

function getPopularRecipes(recipes){
  const scored = recipes.map(r=>{
    const comments = getStorageComments(r.id);
    const reviewCount = comments.length;
    const avg = reviewCount ? Number(averageRating(comments)) : 0;
    return { ...r, reviewCount, avg };
  });

  return scored
    .filter(r => r.reviewCount > 0)
    .sort((a,b)=> b.reviewCount - a.reviewCount || b.avg - a.avg)
    .slice(0,5);
}

async function initAdminDashboard(){
  const recipes = await loadJSON();
  q('#memberCount').innerText = String(getMemberCount());
  q('#recipeCount').innerText = String(recipes.length);

  const popular = getPopularRecipes(recipes);
  const popularEl = q('#popularRecipes');

  if(!popular.length){
    popularEl.innerHTML = '<p>ยังไม่มีข้อมูลรีวิวสำหรับจัดอันดับ</p>';
    return;
  }

  popularEl.innerHTML = popular.map((r,idx)=>`
    <div class="popular-item">
      <div>#${idx + 1} <a href="recipe.html?id=${r.id}">${r.title}</a></div>
      <div>รีวิว: ${r.reviewCount} | คะแนนเฉลี่ย: ${r.avg.toFixed(1)}</div>
    </div>
  `).join('');
}

if(q('#adminLoginForm')){
  sessionStorage.removeItem('admin-auth');

  const loginWrap = q('#adminLoginWrap');
  const dash = q('#adminDashboard');
  const errorEl = q('#loginError');

  function showDashboard(){
    loginWrap.style.display='none';
    dash.style.display='grid';
    initAdminDashboard();
  }


  q('#adminLoginForm').addEventListener('submit',(e)=>{
    e.preventDefault();
    const username = q('#adminUser').value.trim();
    const password = q('#adminPass').value;

    if(username === 'jusin888' && password === 'jusin888'){
      sessionStorage.setItem('admin-auth','ok');
      errorEl.innerText='';
      showDashboard();
      return;
    }

    errorEl.innerText='ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
  });
}
