// ---------- helpers ----------
const K_PROFILE = "briefly:v1:profile";
const K_ACCOUNT = "briefly:v1:account";
const K_DOCS    = "briefly:v1:docs";
const K_CARDS   = "briefly:v1:cards";
const DEFAULT_CARDS = [
  {id:'repc', title:'REPC / Contract', total:792254},
  {id:'b2', title:'Budget 2', total:650000},
  {id:'b3', title:'Budget 3', total:500000}
];
const screens = ["login","profile","account","dashboard"];
const stepText = {
  login: "Step 0 of 3 — Login",
  profile: "Step 1 of 3 — Profile Setup",
  account: "Step 2 of 3 — Account Details",
  dashboard: "Step 3 of 3 — Dashboard"
};

const getJSON = (k, def=null) => { try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? def; } catch { return def; } };
const setJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const del = (k) => localStorage.removeItem(k);
const isAccountComplete = acc => !!(acc?.caseNumber?.trim() && acc?.role);

  const loadCards = () => {
    const stored = getJSON(K_CARDS);
    const toggleBase = {
      construction:false,
      contingency:false,
      land:false,
      slab:false,
      wall:false,
      pool:false,
      furniture:false
    };
    const amountBase = {
      construction:0,
      contingency:0,
      land:0,
      slab:0,
      wall:0,
      pool:0,
      furniture:0
    };
    if (!stored || !stored.length) {
      return DEFAULT_CARDS.map(c => ({
        ...c,
        expanded:false,
        toggles:{
          construction:true,
          contingency:true,
          land:false,
          slab:false,
          wall:false,
          pool:false,
          furniture:false
        },
        amounts:{...amountBase, construction:c.total}
      }));
    }
    return stored.map(c=>({
      ...c,
      expanded:!!c.expanded,
      toggles:{...toggleBase, ...(c.toggles||{})},
      amounts:{...amountBase, ...(c.amounts||{})}
    }));
  };
const saveCards = (cards) => setJSON(K_CARDS, cards);

function firstFocusable(el){
  return el.querySelector('input, select, button, textarea, [tabindex]:not([tabindex="-1"])');
}

function prefillProfile(){
  const data = getJSON(K_PROFILE, {});
  ["firstName","lastName","email","phone","address","organization","primaryAttorney","caseName","role"].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.value = data[id] || "";
  });
  const photoPreview = document.getElementById("photoPreview");
  if (photoPreview){
    if (data.photo){
      photoPreview.src = data.photo;
      photoPreview.style.display = "block";
    } else {
      photoPreview.style.display = "none";
      photoPreview.removeAttribute("src");
    }
  }
}

function showScreen(name){
  screens.forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("hidden", id!==name);
  });
  document.title = `briefly — ${name}`;
  const focusTarget = firstFocusable(document.getElementById(name));
  focusTarget && focusTarget.focus({preventScroll:true});
  location.hash = `#${name}`;
  const ind = document.getElementById("stepIndicator");
  if (ind) ind.textContent = stepText[name] || "";
  if (name === "profile") prefillProfile();
}

  function renderCards(){
    const cards = loadCards();
    const list = document.getElementById("cardList");
    if (!list) return;
    list.innerHTML = "";
    const fmt = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
    cards.forEach(card=>{
      const cardEl = document.createElement("div");
      cardEl.className = "card";
      cardEl.draggable = true;
      cardEl.dataset.id = card.id;

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.gap = "var(--gap)";

      const titleEl = document.createElement("span");
      titleEl.textContent = card.title;

      const totalEl = document.createElement("span");
      totalEl.style.marginLeft = "auto";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = card.expanded ? "Collapse" : "Expand";

      header.appendChild(titleEl);
      header.appendChild(totalEl);
      header.appendChild(btn);
      cardEl.appendChild(header);

      const panel = document.createElement("div");
      panel.className = "card-panel";
      panel.style.display = card.expanded ? "block" : "none";
      const toggleMap = {
        construction:"Construction",
        contingency:"Contingency",
        land:"Land",
        slab:"Slab",
        wall:"Wall/Fence",
        pool:"Pool",
        furniture:"Furniture"
      };
      card.toggles = card.toggles || {};
      card.amounts = card.amounts || {};

      const table = document.createElement("table");
      const thead = document.createElement("thead");
      thead.innerHTML = `<tr><th>Item</th><th>Enabled</th><th>Amount</th></tr>`;
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      table.appendChild(tbody);

      const updateTotal = () => {
        card.total = Object.keys(toggleMap).reduce((sum,key)=>{
          return sum + (card.toggles[key] ? Number(card.amounts[key]||0) : 0);
        },0);
        totalEl.textContent = fmt.format(card.total);
        saveCards(cards);
      };

      Object.entries(toggleMap).forEach(([key,label])=>{
        const tr = document.createElement("tr");
        const tdItem = document.createElement("td");
        tdItem.textContent = label;
        tr.appendChild(tdItem);

        const tdEnable = document.createElement("td");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!card.toggles[key];
        cb.addEventListener("change",()=>{
          card.toggles[key] = cb.checked;
          updateTotal();
        });
        tdEnable.appendChild(cb);
        tr.appendChild(tdEnable);

        const tdAmount = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "decimal";
        input.value = card.amounts[key] ? fmt.format(card.amounts[key]) : "";
        const err = document.createElement("div");
        err.className = "error";
        err.style.display = "none";

        const validate = () => {
          const raw = input.value.trim();
          if (!raw){
            card.amounts[key] = 0;
            err.style.display = "none";
            updateTotal();
            return;
          }
          if (/^\d*(\.\d{0,2})?$/.test(raw)) {
            card.amounts[key] = Number(raw);
            err.style.display = "none";
            updateTotal();
          } else {
            err.textContent = "Invalid amount";
            err.style.display = "block";
          }
        };

        input.addEventListener('focus', ()=>{
          input.value = card.amounts[key] ? String(card.amounts[key]) : '';
        });
        input.addEventListener('input', validate);
        input.addEventListener('blur', ()=>{
          validate();
          if (err.style.display === 'none' && input.value.trim() !== '') {
            input.value = fmt.format(card.amounts[key]);
          }
        });

        tdAmount.appendChild(input);
        tdAmount.appendChild(err);
        tr.appendChild(tdAmount);
        tbody.appendChild(tr);
      });

      panel.appendChild(table);
      cardEl.appendChild(panel);

      btn.addEventListener("click",()=>{
        card.expanded = !card.expanded;
        panel.style.display = card.expanded ? "block" : "none";
        btn.textContent = card.expanded ? "Collapse" : "Expand";
        saveCards(cards);
      });

      list.appendChild(cardEl);
      updateTotal();
    });
  }

function renderDashboard(){
  const p = getJSON(K_PROFILE, {});
  const a = getJSON(K_ACCOUNT, {});
  document.getElementById("sumName").textContent = [p.firstName, p.lastName].filter(Boolean).join(" ") || "—";
  document.getElementById("sumCase").textContent = p.caseName || "—";
  document.getElementById("sumRole").textContent = p.role || "—";
  document.getElementById("sumEmail").textContent = p.email || "—";
  document.getElementById("sumPhone").textContent = p.phone || "—";
  document.getElementById("sumAddress").textContent = p.address || "—";
  document.getElementById("sumOrganization").textContent = p.organization || "—";
  document.getElementById("sumPrimaryAttorney").textContent = p.primaryAttorney || "—";
  const photoEl = document.getElementById("sumPhoto");
  if (p.photo){
    photoEl.src = p.photo;
    photoEl.style.display = "block";
  } else {
    photoEl.removeAttribute("src");
    photoEl.style.display = "none";
  }
  document.getElementById("caseInfo").textContent =
    a.caseNumber ? `Case #${a.caseNumber} — ${a.role || "—"}` : "—";

  // docs table on dashboard
  const docs = getJSON(K_DOCS, []);
  const tbody = document.querySelector("#docsList tbody");
  tbody.innerHTML = "";
  docs.forEach(d=>{
    const tr = document.createElement("tr");
    const added = new Date(d.addedAt||Date.now()).toLocaleString();
    const icon = fileIcon(d.name);
    tr.innerHTML = `
      <td>${icon} ${d.displayName || d.name}</td>
      <td>${Math.max(1, Math.round((d.size||0)/1024))}</td>
      <td>${d.type || "—"}</td>
      <td>${d.category || "Case Document"}</td>
      <td>${added}</td>
    `;
    tbody.appendChild(tr);
  });
  renderCards();
}

// ---------- login/profile wiring ----------
document.getElementById("loginNext").addEventListener("click", ()=> showScreen("profile"));
document.getElementById("backToLogin").addEventListener("click", ()=> showScreen("login"));

document.getElementById("profileForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  const file = fd.get("photo");
  if (file && file.size){
    data.photo = await new Promise(res=>{
      const reader = new FileReader();
      reader.onload = ev=>res(ev.target.result);
      reader.readAsDataURL(file);
    });
  } else {
    const existing = getJSON(K_PROFILE, {});
    if (existing.photo) data.photo = existing.photo;
  }
  setJSON(K_PROFILE, data);
  document.getElementById("profileMsg").textContent = "Profile saved.";
  const accRole = document.getElementById("accountRole");
  if (accRole && data.role) accRole.value = data.role;
  const account = getJSON(K_ACCOUNT);
  if (isAccountComplete(account)) { showScreen("dashboard"); renderDashboard(); }
  else showScreen("account");
});

document.getElementById("photo").addEventListener("change", e=>{
  const file = e.target.files[0];
  const preview = document.getElementById("photoPreview");
  if (file){
    const reader = new FileReader();
    reader.onload = ev=>{ preview.src = ev.target.result; preview.style.display = "block"; };
    reader.readAsDataURL(file);
  } else {
    preview.style.display = "none";
    preview.removeAttribute("src");
  }
});

// ---------- account + docs ----------
let docs = getJSON(K_DOCS, []);
const docsInput = document.getElementById("documents");
const docsTableBody = document.querySelector("#docsTable tbody");
const accountSection = document.getElementById("account");

function fileIcon(name){
  const ext = (name.split('.').pop()||"").toLowerCase();
  const map = {pdf:'📕',doc:'📄',docx:'📄',txt:'📃',png:'🖼️',jpg:'🖼️',jpeg:'🖼️'};
  return map[ext]||'📁';
}

function addFiles(files){
  files.forEach(f=>{
    docs.push({
      id: (crypto?.randomUUID?.() || String(Date.now()+Math.random())),
      name: f.name,
      displayName: f.name,
      size: f.size,
      type: f.type,
      category: "Case Document",
      addedAt: Date.now()
    });
  });
  setJSON(K_DOCS, docs);
  renderDocsTable();
}

function renderDocsTable(){
  docsTableBody.innerHTML = "";
  docs.forEach((d,i)=>{
    const tr = document.createElement("tr");
    const icon = fileIcon(d.name);
    tr.innerHTML = `
      <td>${icon} <input type="text" value="${d.displayName||d.name}" data-name-idx="${i}" style="width:100%" /></td>
      <td>${Math.max(1,Math.round(d.size/1024))}</td>
      <td>${d.type || "—"}</td>
      <td>
        <select data-idx="${i}">
          <option ${d.category==="Case Document"?"selected":""}>Case Document</option>
          <option ${d.category==="Motion"?"selected":""}>Motion</option>
          <option ${d.category==="Subpoena"?"selected":""}>Subpoena</option>
          <option ${d.category==="Other"?"selected":""}>Other</option>
        </select>
      </td>
      <td><button type="button" data-rm="${i}">Remove</button></td>
    `;
    docsTableBody.appendChild(tr);
  });
}

docsInput.addEventListener("change",(e)=>{
  const files = Array.from(e.target.files || []);
  addFiles(files);
  docsInput.value = "";
});

accountSection.addEventListener("dragover",(e)=>{e.preventDefault();});
accountSection.addEventListener("drop",(e)=>{
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files || []);
  addFiles(files);
});

document.getElementById("docsTable").addEventListener("input",(e)=>{
  const idx = e.target.dataset.nameIdx;
  if (idx!==undefined) {
    docs[idx].displayName = e.target.value;
    setJSON(K_DOCS, docs);
  }
});

document.getElementById("docsTable").addEventListener("change",(e)=>{
  if (e.target.tagName!=="SELECT") return;
  const i = Number(e.target.dataset.idx);
  if (!Number.isNaN(i) && docs[i]) {
    docs[i].category = e.target.value;
    setJSON(K_DOCS, docs);
  }
});

document.getElementById("docsTable").addEventListener("click",(e)=>{
  if (!e.target.dataset.rm) return;
  const i = Number(e.target.dataset.rm);
  docs.splice(i,1);
  setJSON(K_DOCS, docs);
  renderDocsTable();
});

document.getElementById("backToProfile").addEventListener("click", ()=> showScreen("profile"));

document.getElementById("saveAccountBtn").addEventListener("click", ()=>{
  const caseNumber = document.getElementById("caseNumber").value.trim();
  const role = document.getElementById("accountRole").value;
  const account = { caseNumber, role };
  setJSON(K_ACCOUNT, account);
  setJSON(K_DOCS, docs); // ensure persisted
  if (isAccountComplete(account)) {
    showScreen("dashboard");
    renderDashboard();
  } else {
    showScreen("account");
  }
});

// ---------- dashboard wiring ----------
document.getElementById("addCardBtn").addEventListener("click", ()=>{
  const cards = loadCards();
    cards.push({
      id: Date.now().toString(),
      title: "Untitled",
      total: 0,
      toggles:{
        construction:false,
        contingency:false,
        land:false,
        slab:false,
        wall:false,
        pool:false,
        furniture:false
      },
      amounts:{
        construction:0,
        contingency:0,
        land:0,
        slab:0,
        wall:0,
        pool:0,
        furniture:0
      },
      expanded:false
    });
  saveCards(cards);
  renderCards();
});
document.getElementById("signOutBtn").addEventListener("click", ()=>{
  [K_PROFILE, K_ACCOUNT, K_DOCS].forEach(del);
  docs = [];
  showScreen("login");
});
  document.getElementById("manageDocsBtn").addEventListener("click", ()=> showScreen("account"));
  document.getElementById("editProfileBtn").addEventListener("click", ()=> showScreen("profile"));

  const cardListEl = document.getElementById("cardList");
  let dragCardId = null;
  cardListEl.addEventListener("dragstart", e=>{
    const card = e.target.closest(".card");
    if (!card) return;
    dragCardId = card.dataset.id;
  });
  cardListEl.addEventListener("dragover", e=>e.preventDefault());
  cardListEl.addEventListener("drop", e=>{
    e.preventDefault();
    const target = e.target.closest(".card");
    if (!target || dragCardId===null) return;
    const cards = loadCards();
    const from = cards.findIndex(c=>c.id===dragCardId);
    const to = cards.findIndex(c=>c.id===target.dataset.id);
    if (from>=0 && to>=0 && from!==to){
      const [m] = cards.splice(from,1);
      cards.splice(to,0,m);
      saveCards(cards);
      renderCards();
    }
    dragCardId = null;
  });

// ---------- initial route ----------
(function init(){
  // set account role default from profile if exists
  const p = getJSON(K_PROFILE);
  if (p?.role) { const r = document.getElementById("accountRole"); if (r) r.value = p.role; }
  docs = getJSON(K_DOCS, []);
  renderDocsTable();

  const hasProfile = !!getJSON(K_PROFILE);
  const account = getJSON(K_ACCOUNT);
  if (!hasProfile) showScreen("login");
  else if (!isAccountComplete(account)) showScreen("account");
  else { showScreen("dashboard"); renderDashboard(); }

  // hash navigation (optional)
  window.addEventListener("hashchange", ()=>{
    const key = location.hash.replace("#","");
    if (screens.includes(key)) showScreen(key);
  });
})();
