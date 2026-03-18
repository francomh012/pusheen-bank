// ================================================
// assets/js/notifications.js
// Lógica del lado del cliente para notificaciones push
// ================================================

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// Tu VAPID public key (la misma que pusiste en Vercel)
const VAPID_PUBLIC_KEY = 'P23dNHZ8jUFvfzfZWKw9GdAHc2oM6ki1ZVJEKx9lApmSJrylgUtx0VuRrViLCEJuOYdiJTpnoxNuzeU0sObKbw';

// ==========================
// CONVERTIR VAPID KEY
// ==========================
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ==========================
// PEDIR PERMISO Y SUSCRIBIR
// ==========================
export async function subscribeToPush(username) {
    // Verificar soporte
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push no soportado en este navegador');
        return false;
    }

    // Pedir permiso
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        console.warn('Permiso de notificaciones denegado');
        return false;
    }

    try {
        const reg = await navigator.serviceWorker.ready;

        // Crear suscripción
        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly:      true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // Guardar en servidor
        const res = await fetch('/api/subscribe', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, subscription: subscription.toJSON() }),
        });

        if (!res.ok) throw new Error('Error guardando suscripción');
        console.log('✅ Suscripción push guardada para:', username);
        return true;

    } catch (e) {
        console.error('Error suscribiendo a push:', e);
        return false;
    }
}

// ==========================
// DESUSCRIBIR
// ==========================
export async function unsubscribeFromPush(username) {
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();

        await fetch('/api/subscribe', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, subscription: {}, action: 'unsubscribe' }),
        });
        return true;
    } catch (e) {
        console.error('Error desuscribiendo:', e);
        return false;
    }
}

// ==========================
// VERIFICAR SI YA ESTÁ SUSCRITO
// ==========================
export async function isPushSubscribed() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        return !!sub && Notification.permission === 'granted';
    } catch {
        return false;
    }
}

// ==========================
// ENVIAR NOTIFICACIÓN AL OTRO JUGADOR
// ================================================
// Llamá a esta función desde main.js cuando ocurre un evento
// ==========================
export async function notifyOtherPlayer(event, fromPlayer, data = {}) {
    // Determinar a quién notificar (el otro jugador)
    const players = ['Franco', 'Jess'];
    const to = players.find(p => p !== fromPlayer);
    if (!to) return;

    try {
        await fetch('/api/notify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ event, to, data: { from: fromPlayer, ...data } }),
        });
    } catch (e) {
        console.error('Error enviando notificación:', e);
    }
}

// ==========================
// RENDER BOTÓN DE NOTIFICACIONES EN UI
// ==========================
export async function renderNotifToggle(username, containerId = 'notif-toggle-wrap') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const subscribed = await isPushSubscribed();

    container.innerHTML = `
        <button id="btn-notif-toggle" class="btn-notif-toggle ${subscribed ? 'active' : ''}">
            ${subscribed ? '🔔 Notificaciones ON' : '🔕 Activar notificaciones'}
        </button>
    `;

    document.getElementById('btn-notif-toggle').onclick = async () => {
        const btn = document.getElementById('btn-notif-toggle');
        btn.disabled = true;
        btn.textContent = 'Espera...';

        if (subscribed) {
            await unsubscribeFromPush(username);
            btn.textContent = '🔕 Activar notificaciones';
            btn.classList.remove('active');
        } else {
            const ok = await subscribeToPush(username);
            if (ok) {
                btn.textContent = '🔔 Notificaciones ON';
                btn.classList.add('active');
            } else {
                btn.textContent = '🔕 Activar notificaciones';
            }
        }
        btn.disabled = false;
    };
}