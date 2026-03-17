import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ==========================
// CONFIGURACIÓN SUPABASE
// ⚠️ Reemplaza SUPABASE_KEY con tu anon key real (empieza con eyJ...)
// ==========================
const SUPABASE_URL = 'https://erblqbqsjqhatarcpzjs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyYmxxYnFzanFoYXRhcmNwempzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Nzk4NTUsImV4cCI6MjA4NzU1NTg1NX0.p3WM4tO9vDIc1gtS6kg3FqYxMRHFhYUo2wcsHDVKZEk'; // 👈 CAMBIA ESTO
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================
// ESTADO GLOBAL
// ==========================
let currentPlayer = null;
let myWallet = 0;
let sharedBank = 0;
let sharedHistory = [];
let isSaving = false;
let allComplaints = [];

const AVATARS = { Franco: '🧔', Jess: '👩' };

// ==========================
// ELEMENTOS DEL DOM
// ==========================
const coinDisplay   = document.getElementById("coin-count");
const walletDisplay = document.getElementById("available-coins");
const historyDiv    = document.getElementById("history");

// ==========================
// MENSAJES VISUALES
// ==========================
function showMessage(text, type = 'error', containerId = 'action-message') {
    const msg = document.getElementById(containerId);
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'action-message ' + type;
    msg.style.display = 'block';
    clearTimeout(msg._timer);
    msg._timer = setTimeout(() => { msg.style.display = 'none'; }, 3500);
}

// ==========================
// DESHABILITAR / HABILITAR BOTONES
// ==========================
function setActionButtons(disabled) {
    document.querySelectorAll('.quick-btn, .btn-give, .btn-steal')
        .forEach(btn => btn.disabled = disabled);
}

// ==========================
// ACCIONES DE MONEDAS
// ==========================
window.handleCustom = (action) => {
    const input = document.getElementById("custom-val");
    const val = parseInt(input.value);
    if (isNaN(val) || val <= 0) { showMessage("Escribe un número válido", 'error'); return; }
    window.handleCoin(action, val);
    input.value = "";
};

window.handleCoin = async (action, amount = 1) => {
    if (isSaving) return;

    if (action === 'remove') {
        const ok = confirm(`¿Seguro que quieres robar ${amount} moneda${amount > 1 ? 's' : ''}? ❌`);
        if (!ok) return;
    }

    const oldW = myWallet, oldB = sharedBank, oldH = [...sharedHistory];
    let donationChange = 0;

    if (action === 'add') {
        if (myWallet < amount) { showMessage("¡No tienes suficientes monedas! 🪙", 'error'); return; }
        myWallet -= amount; sharedBank += amount; donationChange = amount;
        sharedHistory.push(`${currentPlayer} dio ${amount} 🪙`);
    } else {
        if (sharedBank < amount) { showMessage("¡Pusheen no tiene tanto! 🐾", 'error'); return; }
        myWallet += amount; sharedBank -= amount; donationChange = -amount;
        sharedHistory.push(`${currentPlayer} robó ${amount} ❌`);
    }

    renderUI();
    isSaving = true;
    setActionButtons(true);

    try {
        // ✅ FIX: traer wallet_coins Y weekly_donations para evitar null
        const { data, error: fetchError } = await supabase
            .from("players")
            .select("wallet_coins, weekly_donations")
            .eq("username", currentPlayer)
            .single();

        if (fetchError || !data) throw new Error("No se encontró el jugador: " + (fetchError?.message || ''));

        const newWeekly = Math.max(0, (data.weekly_donations || 0) + donationChange);

        const [upPlayer, upBank] = await Promise.all([
            supabase.from("players")
                .update({ wallet_coins: myWallet, weekly_donations: newWeekly })
                .eq("username", currentPlayer),
            supabase.from("bank")
                .update({ total_coins: sharedBank, history: sharedHistory })
                .eq("id", 1)
        ]);

        if (upPlayer.error) throw new Error("Error actualizando jugador: " + upPlayer.error.message);
        if (upBank.error)   throw new Error("Error actualizando banco: " + upBank.error.message);

        showMessage(
            action === 'add'
                ? `¡Diste ${amount} moneda${amount > 1 ? 's' : ''} a Pusheen! 🪙`
                : `Robaste ${amount} moneda${amount > 1 ? 's' : ''}... ❌`,
            action === 'add' ? 'success' : 'warning'
        );
        updateRankingUI();
    } catch (e) {
        myWallet = oldW; sharedBank = oldB; sharedHistory = oldH;
        renderUI();
        showMessage("Error al guardar. Intenta de nuevo 😿", 'error');
        console.error("Error detallado:", e);
    } finally {
        isSaving = false;
        setActionButtons(false);
    }
};

// ==========================
// RENDER MONEDAS
// ==========================
function renderUI() {
    coinDisplay.textContent = sharedBank;
    walletDisplay.textContent = myWallet;
    historyDiv.innerHTML = [...sharedHistory]
        .reverse().slice(0, 6)
        .map(m => `<div class="history-item">${m}</div>`)
        .join("");
}

// ==========================
// RANKING
// ==========================
async function updateRankingUI() {
    const { data: r, error } = await supabase
        .from("players").select("username, weekly_donations")
        .order("weekly_donations", { ascending: false });

    if (error) { console.error("Error ranking:", error); return; }

    const list = document.getElementById("ranking-list");
    if (!r) return;

    list.innerHTML = r.map((p, i) => `
        <div class="ranking-item ${i === 0 ? 'first' : ''}">
            <span class="rank-pos">${i === 0 ? '👑' : '🐾'}</span>
            <span class="rank-name">${AVATARS[p.username] || '🐾'} ${p.username}</span>
            <span class="rank-coins">${p.weekly_donations} 🪙</span>
        </div>
    `).join("");
}

// ==========================
// DENUNCIAS
// ==========================
async function loadComplaints() {
    const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) { console.error("Error cargando denuncias:", error); return; }
    allComplaints = data || [];
    renderComplaints();
    updateNotifBadge();
}

function renderComplaints() {
    const list = document.getElementById("complaints-list");
    if (!allComplaints.length) {
        list.innerHTML = `<p style="text-align:center;color:var(--text-soft);padding:24px;font-weight:700;">No hay denuncias por ahora 🐾</p>`;
        return;
    }

    list.innerHTML = allComplaints.map(c => {
        const isNew = !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer;
        const isMine = c.reported_by === currentPlayer;
        const date = new Date(c.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const severityLabels = { leve: '😐 Leve', grave: '😠 Grave', catastrofico: '💀 Catastrófico' };

        return `
        <div class="complaint-card ${isNew ? 'nueva' : ''}" data-id="${c.id}">
            <div class="complaint-top">
                <span class="complaint-reporter">${AVATARS[c.reported_by] || '🐾'} ${c.reported_by} denuncia</span>
                <span class="severity-tag ${c.severity}">${severityLabels[c.severity] || c.severity}</span>
            </div>
            <div class="complaint-category">${c.category}</div>
            <div class="complaint-desc">${c.description}</div>
            ${c.image_url ? `<img src="${c.image_url}" class="complaint-img" alt="evidencia">` : ''}
            <div class="complaint-footer">
                <span class="complaint-status ${c.status}">${c.status === 'abierta' ? '🔴 Abierta' : '✅ Resuelta'}</span>
                <span class="complaint-date">${date}</span>
                ${isMine && c.status === 'abierta' ? `<button class="btn-resolve resolver" onclick="resolveComplaint('${c.id}', 'resuelta')">✅ Resolver</button>` : ''}
                ${isMine ? `<button class="btn-resolve eliminar" onclick="deleteComplaint('${c.id}')">🗑️</button>` : ''}
            </div>
        </div>`;
    }).join("");
}

// Subir imagen a Supabase Storage
async function uploadImage(file) {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage
        .from('complaint-images')
        .upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('complaint-images').getPublicUrl(path);
    return data.publicUrl;
}

// Enviar denuncia
document.getElementById("btn-submit-complaint").onclick = async () => {
    const category    = document.getElementById("c-category").value;
    const description = document.getElementById("c-description").value.trim();
    const severity    = document.getElementById("c-severity").value;
    const imageFile   = document.getElementById("c-image").files[0];

    if (!category)    { showMessage("Elige una categoría", 'error', 'complaint-msg'); return; }
    if (!description) { showMessage("Escribe qué pasó", 'error', 'complaint-msg'); return; }
    if (!severity)    { showMessage("Elige el nivel de gravedad", 'error', 'complaint-msg'); return; }

    const btn = document.getElementById("btn-submit-complaint");
    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
        let image_url = null;
        if (imageFile) image_url = await uploadImage(imageFile);

        const { error } = await supabase.from("complaints").insert([{
            reported_by: currentPlayer,
            category,
            description,
            severity,
            image_url,
            status: 'abierta',
            seen_by: [currentPlayer]
        }]);

        if (error) throw error;

        document.getElementById("c-category").value = "";
        document.getElementById("c-description").value = "";
        document.getElementById("c-severity").value = "";
        document.getElementById("c-image").value = "";
        document.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('complaint-form').style.display = 'none';
        document.getElementById('btn-new-complaint').style.display = 'block';

        showMessage("¡Denuncia enviada! 🚨", 'success', 'action-message');
    } catch (e) {
        showMessage("Error al enviar. Intenta de nuevo.", 'error', 'complaint-msg');
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.textContent = "Enviar denuncia 🚨";
    }
};

// Resolver denuncia
window.resolveComplaint = async (id, status) => {
    const { error } = await supabase.from("complaints").update({ status }).eq("id", id);
    if (error) console.error("Error resolviendo:", error);
};

// Eliminar denuncia
window.deleteComplaint = async (id) => {
    const ok = confirm("¿Eliminar esta denuncia?");
    if (!ok) return;
    const { error } = await supabase.from("complaints").delete().eq("id", id);
    if (error) console.error("Error eliminando:", error);
};

// ==========================
// NOTIFICACIONES
// ==========================
function updateNotifBadge() {
    const unseen = allComplaints.filter(
        c => !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer
    ).length;

    const badge = document.getElementById("notif-badge");
    if (unseen > 0) {
        badge.textContent = unseen;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
    renderNotifPanel();
}

function renderNotifPanel() {
    const list = document.getElementById("notif-list");
    const unread = allComplaints.filter(
        c => !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer
    );
    const read = allComplaints.filter(
        c => c.seen_by?.includes(currentPlayer) || c.reported_by === currentPlayer
    ).slice(0, 5);

    if (!unread.length && !read.length) {
        list.innerHTML = `<p class="notif-empty">No hay notificaciones 🐾</p>`;
        return;
    }

    const renderItem = (c, isNew) => {
        const date = new Date(c.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        return `<div class="notif-item ${isNew ? 'nueva' : ''}">
            🚨 <strong>${c.reported_by}</strong> hizo una denuncia: <em>${c.category}</em>
            <div class="notif-time">${date}</div>
        </div>`;
    };

    list.innerHTML =
        unread.map(c => renderItem(c, true)).join("") +
        (read.length ? `<p style="font-size:0.78rem;color:var(--text-soft);padding:8px 0;font-weight:700;">— Anteriores —</p>` : '') +
        read.map(c => renderItem(c, false)).join("");
}

window.markNotifsSeen = async () => {
    const unseen = allComplaints.filter(
        c => !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer
    );
    for (const c of unseen) {
        const newSeen = [...(c.seen_by || []), currentPlayer];
        await supabase.from("complaints").update({ seen_by: newSeen }).eq("id", c.id);
    }
    document.getElementById("notif-badge").style.display = 'none';
};

// ==========================
// CARGA INICIAL
// ==========================
async function loadData(name) {
    currentPlayer = name;
    document.getElementById("player-avatar").textContent = AVATARS[name] || '🐾';
    document.getElementById("player-name").textContent = name;

    let { data: userData, error: userError } = await supabase
        .from("players").select("*").eq("username", name).maybeSingle();

    if (userError) {
        console.error("Error cargando jugador:", userError);
        showMessage("Error al cargar tu perfil 😿", 'error');
        return;
    }

    if (!userData) {
        myWallet = 100;
        const { error: insertError } = await supabase.from("players").insert([{
            username: name,
            wallet_coins: 100,
            last_claim: new Date().toISOString().split('T')[0],
            weekly_donations: 0
        }]);
        if (insertError) console.error("Error creando jugador:", insertError);
    } else {
        myWallet = userData.wallet_coins;
        await checkDailyReward(userData);
    }

    await refreshSharedData();
    await loadComplaints();

    // Tiempo real
    supabase.channel('db-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bank' }, (p) => {
            sharedBank = p.new.total_coins;
            sharedHistory = p.new.history;
            renderUI();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, () => {
            updateRankingUI();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
            loadComplaints();
        })
        .subscribe();

    document.getElementById("login-screen").classList.remove('active');
    document.getElementById("game-screen").classList.add('active');
    renderUI();
    updateRankingUI();
}

// ==========================
// FUNCIONES DE APOYO
// ==========================
async function checkDailyReward(user) {
    const hoy = new Date().toISOString().split('T')[0];
    if (user.last_claim !== hoy) {
        myWallet += 2;
        showMessage(`¡Hola ${currentPlayer}! 🐾 +2 monedas diarias`, 'success');
        const { error } = await supabase.from("players")
            .update({ wallet_coins: myWallet, last_claim: hoy })
            .eq("username", currentPlayer);
        if (error) console.error("Error reward diario:", error);
    }
}

async function refreshSharedData() {
    const { data: b, error } = await supabase.from("bank").select("*").eq("id", 1).single();
    if (error) { console.error("Error banco:", error); return; }
    if (b) { sharedBank = b.total_coins; sharedHistory = b.history || []; }
}

// ==========================
// BOTONES LOGIN / LOGOUT
// ==========================
document.getElementById("franco-btn").onclick = () => loadData("Franco");
document.getElementById("jess-btn").onclick   = () => loadData("Jess");
document.getElementById("logout-btn").onclick  = () => {
    currentPlayer = null;
    document.getElementById("game-screen").classList.remove('active');
    document.getElementById("login-screen").classList.add('active');
};