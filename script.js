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

function renderList(recipes){const cont=q('#list');cont.innerHTML='';recipes.forEach(r=>{const card=document.createElement('a');card.className='card';card.href=`recipe.html?id=${r.id}`;card.innerHTML=`<h3>${r.title}</h3><p>${r.description||''}</p>`;cont.appendChild(card);});}

function getStorageComments(id){try{return JSON.parse(localStorage.getItem('recipe-comments-'+id)||'[]')}catch(e){return[]}}
function saveStorageComments(id,arr){localStorage.setItem('recipe-comments-'+id,JSON.stringify(arr))}
function averageRating(arr){if(!arr.length) return 0;return (arr.reduce((s,a)=>s+(a.rating||0),0)/arr.length).toFixed(1)}

// Index page
if(q('#list')){
  (async()=>{
    const data=await loadJSON();
    const recipes=data;
    q('#search').addEventListener('input',e=>{
      const v=e.target.value.trim().toLowerCase();
      if(!v || v.length<2){
        q('#list').innerHTML='';
      } else {
        renderList(recipes.filter(r=>r.title.toLowerCase().includes(v)|| (r.ingredients||[]).join(' ').toLowerCase().includes(v)));
      }
    });
  })();
}

// Recipe detail page
if(q('#recipe')){
  (async()=>{
    const params=new URLSearchParams(location.search);
    const id=params.get('id');
    const data=await (await fetch('recipes.json')).json();
    const r=data.find(x=>x.id===id);
    if(!r){q('#recipe').innerText='ไม่พบสูตร';return}
    const comments=getStorageComments(id);
    const avg=averageRating(comments);
    
    const el=document.createElement('div');el.className='card';
    el.innerHTML=`<h2>${r.title}</h2>
      <p>${r.description||''}</p>
      <h4>วัตถุดิบ</h4>
      <ul id="ingredientsList">${(r.ingredients||[]).map(i=>`<li>${i}</li>`).join('')}</ul>
      <h4>วิธีทำ</h4>
      <ol>${(r.steps||[]).map(s=>`<li>${s}</li>`).join('')}</ol>
      ${r.note?`<div class="note-box"><strong>💡 ข้อแนะนำ:</strong> ${r.note}</div>`:''}
      ${r.nutrition?`<h4>สารอาหาร</h4><div class="nutrition-info"><div>พลัง: ${Math.round(r.nutrition.calories)} kcal</div><div>โปรตีน: ${r.nutrition.protein.toFixed(1)} g</div><div>คาร์โบไฮเดต: ${r.nutrition.carbs.toFixed(1)} g</div><div>ไขมัน: ${r.nutrition.fat.toFixed(1)} g</div><div>โซเดียม: ${Math.round(r.nutrition.sodium)} mg</div>${r.nutrition.potassium?`<div>โพแทสเซียม: ${Math.round(r.nutrition.potassium)} mg</div>`:''}${r.nutrition.phosphorus?`<div>ฟอสฟอรัส: ${Math.round(r.nutrition.phosphorus)} mg</div>`:''}</div>`:''}
      <div class="recipe-meta">คะแนนเฉลี่ย: <span class="rating">${avg}</span></div>
      <div class="comment">
        <h4>เพิ่มคอมเมนต์/ให้คะแนน</h4>
        <input id="name" placeholder="ชื่อ (ไม่บังคับ)" />
        <textarea id="msg" rows="3" placeholder="คอมเมนต์"></textarea>
        <label>ให้คะแนน: <select id="rating"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label>
        <button id="send">ส่ง</button>
      </div>
      <div id="commentsList"></div>`;
    q('#recipe').appendChild(el);

    function renderComments(){const list=q('#commentsList');list.innerHTML='';const arr=getStorageComments(id);if(!arr.length) list.innerHTML='<p>ยังไม่มีคอมเมนต์</p>';else{arr.slice().reverse().forEach(c=>{const d=document.createElement('div');d.className='card';d.innerHTML=`<strong>${c.name||'ผู้ใช้'}</strong> <span class="recipe-meta">(${c.date})</span><div>ให้คะแนน: <span class="rating">${c.rating}</span></div><p>${c.comment}</p>`;list.appendChild(d)})}}

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
