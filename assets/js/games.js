// ================================================
// assets/js/games.js — Mini-juegos Pusheen Bank 🐾
// ================================================

import { SLOT_SYMBOLS, SLOT_PRIZES, PPT_OPTIONS, PPT_WIN_COINS, PPT_LOSE_COINS } from './config.js';

// ==========================
// HELPERS
// ==========================
function getPPTResult(player, pusheen) {
    if (player === pusheen) return 'tie';
    if (
        (player === 'rock'     && pusheen === 'scissors') ||
        (player === 'paper'    && pusheen === 'rock')     ||
        (player === 'scissors' && pusheen === 'paper')
    ) return 'win';
    return 'lose';
}
function weightedRandom(symbols) {
    const total = symbols.reduce((s,x)=>s+x.weight,0); let r=Math.random()*total;
    for(const sym of symbols){r-=sym.weight;if(r<=0)return sym;} return symbols[symbols.length-1];
}
function showGameMsg(id,text,type){
    const el=document.getElementById(id);if(!el)return;
    el.textContent=text;el.className=`game-result game-result-${type}`;el.style.display='block';
    clearTimeout(el._t);el._t=setTimeout(()=>{el.style.display='none';},3500);
}
function updateGFWallet(){const el=document.getElementById('gf-wallet-num');if(el)el.textContent=window.getWallet()+' 🪙';}

// ==========================
// PERSONAJES COMPARTIDOS
// ==========================
const FLAPPY_CHARS = [
    {id:'globo1', name:'Globo Rosa',   img:'assets/img/globo1.gif', cost:0  },
    {id:'globo2', name:'Globo Dorado', img:'assets/img/globo2.gif', cost:50 },
    {id:'avion1', name:'Avioncito',    img:'assets/img/avion1.gif', cost:100},
];
function getOwnedChars(p)      {try{return JSON.parse(localStorage.getItem(`flappy_chars_${p}`)||'["globo1"]');}catch{return['globo1'];}}
function saveOwnedChars(p,o)   {localStorage.setItem(`flappy_chars_${p}`,JSON.stringify(o));}
function getSelectedChar(p)    {return localStorage.getItem(`flappy_selected_${p}`)||'globo1';}
function saveSelectedChar(p,id){localStorage.setItem(`flappy_selected_${p}`,id);}
function getRecord(key,p)      {return parseInt(localStorage.getItem(`${key}_rec_${p}`)||'0');}
function saveRecord(key,p,s)   {if(s>getRecord(key,p))localStorage.setItem(`${key}_rec_${p}`,s);}

// ==========================
// SELECTOR DE PERSONAJE (reutilizable)
// ==========================
function renderCharSelector(content, player, onWalletChange, onPlay, gameKey) {
    content.innerHTML = `
        <div class="gf-wallet"><span class="gf-wallet-label">Tus monedas</span><span class="gf-wallet-num" id="gf-wallet-num">${window.getWallet()} 🪙</span></div>
        <div class="flappy-char-section">
            <div class="flappy-char-title">Elige tu personaje</div>
            <div class="flappy-char-grid">
                ${FLAPPY_CHARS.map(ch=>{
                    const own=getOwnedChars(player).includes(ch.id);
                    const sel=getSelectedChar(player)===ch.id;
                    return `<div class="flappy-char-card ${sel?'selected':''} ${!own?'locked':''}" data-id="${ch.id}">
                        <img src="${ch.img}" class="flappy-char-img" alt="${ch.name}" onerror="this.style.opacity='0.3'">
                        <div class="flappy-char-name">${ch.name}</div>
                        ${own?`<div class="flappy-char-status ${sel?'active':''}">${sel?'✅ Seleccionado':'Seleccionar'}</div>`
                             :`<button class="flappy-char-buy" data-id="${ch.id}" data-cost="${ch.cost}">Desbloquear ${ch.cost} 🪙</button>`}
                    </div>`;
                }).join('')}
            </div>
        </div>
        <div class="flappy-record-wrap">
            🏆 Tu récord: <strong>${getRecord(gameKey,player)}</strong>
            &nbsp;·&nbsp; Franco: ${getRecord(gameKey,'Franco')} &nbsp;|&nbsp; Jess: ${getRecord(gameKey,'Jess')}
        </div>
        <button class="btn-play flappy-play-btn" id="btn-start-game">¡Jugar! 🎮</button>
    `;
    content.querySelectorAll('.flappy-char-card').forEach(card=>{
        card.addEventListener('click',e=>{
            if(e.target.classList.contains('flappy-char-buy'))return;
            if(!getOwnedChars(player).includes(card.dataset.id))return;
            saveSelectedChar(player,card.dataset.id);
            renderCharSelector(content,player,onWalletChange,onPlay,gameKey);
        });
    });
    content.querySelectorAll('.flappy-char-buy').forEach(btn=>{
        btn.addEventListener('click',async e=>{
            e.stopPropagation();
            const cost=parseInt(btn.dataset.cost);
            if(window.getWallet()<cost){btn.textContent='¡Sin monedas! 😿';setTimeout(()=>{btn.textContent=`Desbloquear ${cost} 🪙`;},1500);return;}
            await onWalletChange(-cost);
            saveOwnedChars(player,[...getOwnedChars(player),btn.dataset.id]);
            saveSelectedChar(player,btn.dataset.id);
            renderCharSelector(content,player,onWalletChange,onPlay,gameKey);
        });
    });
    document.getElementById('btn-start-game').onclick = onPlay;
}

// ==========================
// CANVAS SHELL
// ==========================
function setupCanvas(content, title, backFn) {
    document.getElementById('game-fullscreen-title').textContent = title;
    content.innerHTML = `
        <div class="flappy-game-wrap" id="flappy-game-wrap">
            <div class="flappy-hud">
                <span id="flappy-score-display">0</span>
                <span id="flappy-record-hud"></span>
            </div>
            <canvas id="flappy-canvas"></canvas>
            <div id="flappy-overlay" class="flappy-overlay">
                <div class="flappy-overlay-box">
                    <div class="flappy-overlay-title" id="flappy-overlay-title">${title}</div>
                    <div class="flappy-overlay-sub"   id="flappy-overlay-sub">Tocá para empezar</div>
                    <div class="flappy-overlay-score" id="flappy-overlay-score" style="display:none"></div>
                </div>
            </div>
        </div>
        <button class="btn-back-flappy" id="btn-back-game-canvas">← Personajes</button>
    `;
    const canvas=document.getElementById('flappy-canvas');
    const ctx=canvas.getContext('2d');
    const wrap=document.getElementById('flappy-game-wrap');
    function resize(){canvas.width=wrap.clientWidth||360;canvas.height=wrap.clientHeight||480;}
    resize();
    const ro=new ResizeObserver(resize); ro.observe(wrap);
    document.getElementById('btn-back-game-canvas').onclick=()=>{ro.disconnect();backFn();};
    return {canvas,ctx,wrap};
}

function showGameOver(key,player,score,unit=''){
    saveRecord(key,player,score);
    const isRec=score>=getRecord(key,player);
    const ov=document.getElementById('flappy-overlay');ov.style.display='flex';
    document.getElementById('flappy-overlay-title').textContent=isRec?'🏆 ¡Nuevo récord!':'💥 ¡Terminado!';
    document.getElementById('flappy-overlay-sub').textContent='Tocá para reintentar';
    const se=document.getElementById('flappy-overlay-score');se.style.display='block';
    se.innerHTML=`Puntuación: <strong>${score}${unit}</strong><br>Récord: <strong>${getRecord(key,player)}${unit}</strong>`;
    document.getElementById('flappy-record-hud').textContent=`Récord: ${getRecord(key,player)}${unit}`;
    return ov;
}

// ==========================
// RENDER SELECTOR DE JUEGOS
// ==========================
export function renderGamesTab(currentPlayer, myWallet, onWalletChange) {
    const container = document.getElementById('tab-games');
    if(!container) return;

    container.innerHTML = `
        <div class="games-header">
            <img src="assets/img/pusheen.gif" class="games-pusheen" alt="Pusheen">
            <h2 class="games-title">Mini-juegos 🎮</h2>
            <p class="games-sub">¡Jugá y ganá monedas!</p>
        </div>
        <div class="games-grid">
            <button class="game-select-card" onclick="window.openGame('slots')">
                <span class="game-select-icon">🎰</span>
                <span class="game-select-name">Tragamonedas</span>
                <span class="game-select-desc">3 iguales = ganás</span>
            </button>
            <button class="game-select-card" onclick="window.openGame('ppt')">
                <span class="game-select-icon">🪨</span>
                <span class="game-select-name">PPT vs Pusheen</span>
                <span class="game-select-desc">Ganá = +${PPT_WIN_COINS} 🪙</span>
            </button>
            <button class="game-select-card flappy-card" onclick="window.openGame('flappy')">
                <span class="game-select-icon">🎈</span>
                <span class="game-select-name">Flappy Globo</span>
                <span class="game-select-desc">Esquivá los tubos</span>
            </button>
            <button class="game-select-card storm-card" onclick="window.openGame('storm')">
                <span class="game-select-icon">🌩️</span>
                <span class="game-select-name">Tormenta</span>
                <span class="game-select-desc">Agarra estrellas</span>
            </button>
            <button class="game-select-card sniper-card" onclick="window.openGame('sniper')">
                <span class="game-select-icon">🎯</span>
                <span class="game-select-name">Globo Sniper</span>
                <span class="game-select-desc">Tocá los objetivos</span>
            </button>
            <button class="game-select-card wind-card" onclick="window.openGame('wind')">
                <span class="game-select-icon">💨</span>
                <span class="game-select-name">Viento Loco</span>
                <span class="game-select-desc">Aguantá el viento</span>
            </button>
        </div>
    `;

    // ===================== TRAGAMONEDAS =====================
    function openSlots(content) {
        document.getElementById('game-fullscreen-title').textContent='🎰 Tragamonedas';
        content.innerHTML=`
            <div class="gf-wallet"><span class="gf-wallet-label">Tus monedas</span><span class="gf-wallet-num" id="gf-wallet-num">${window.getWallet()} 🪙</span></div>
            <div class="slot-machine"><div class="slot-reels"><div class="slot-reel" id="reel-0">🐾</div><div class="slot-reel" id="reel-1">🐾</div><div class="slot-reel" id="reel-2">🐾</div></div><div class="slot-line"></div></div>
            <div class="slot-prizes-info">
                <div class="prize-row">👑×3=<strong>+50🪙 JACKPOT</strong></div>
                <div class="prize-row">💖×3=+20🪙 | ⭐×3=+10🪙</div>
                <div class="prize-row">🍩×3=+5🪙 | 🌸×3=+3🪙 | 🐾×3=+2🪙</div>
            </div>
            <div id="slot-result" class="game-result" style="display:none;"></div>
            <button class="btn-play" id="btn-slot">Girar 🎰 <span class="btn-cost">−1 🪙</span></button>
        `;
        let spinning=false;
        document.getElementById('btn-slot').onclick=async()=>{
            if(spinning)return;if(window.getWallet()<1){showGameMsg('slot-result','¡No tenés monedas!','error');return;}
            spinning=true;document.getElementById('btn-slot').disabled=true;
            await onWalletChange(-1);updateGFWallet();
            const reels=[0,1,2].map(i=>document.getElementById(`reel-${i}`));
            const ivs=reels.map((r,i)=>setInterval(()=>{r.textContent=weightedRandom(SLOT_SYMBOLS).emoji;r.classList.add('spinning');},80+i*20));
            const res=[weightedRandom(SLOT_SYMBOLS),weightedRandom(SLOT_SYMBOLS),weightedRandom(SLOT_SYMBOLS)];
            setTimeout(()=>{clearInterval(ivs[0]);reels[0].textContent=res[0].emoji;reels[0].classList.remove('spinning');reels[0].classList.add('stop');},700);
            setTimeout(()=>{clearInterval(ivs[1]);reels[1].textContent=res[1].emoji;reels[1].classList.remove('spinning');reels[1].classList.add('stop');},1100);
            setTimeout(async()=>{
                clearInterval(ivs[2]);reels[2].textContent=res[2].emoji;reels[2].classList.remove('spinning');reels[2].classList.add('stop');
                setTimeout(()=>reels.forEach(r=>r.classList.remove('stop')),500);
                if(res[0].name===res[1].name&&res[1].name===res[2].name){
                    const p=SLOT_PRIZES[res[0].name];await onWalletChange(p.coins);updateGFWallet();showGameMsg('slot-result',p.msg,'win');
                    if(window.spawnCoins)window.spawnCoins(10);
                    if(res[0].name==='corona'){reels.forEach(r=>r.classList.add('jackpot'));setTimeout(()=>reels.forEach(r=>r.classList.remove('jackpot')),2000);}
                }else{showGameMsg('slot-result','No fue esta vez... 😿','lose');}
                spinning=false;document.getElementById('btn-slot').disabled=false;
            },1500);
        };
    }

    // ===================== PPT =====================
    function openPPT(content) {
        document.getElementById('game-fullscreen-title').textContent='🪨 Piedra Papel Tijera';
        content.innerHTML=`
            <div class="gf-wallet"><span class="gf-wallet-label">Tus monedas</span><span class="gf-wallet-num" id="gf-wallet-num">${window.getWallet()} 🪙</span></div>
            <div class="ppt-rules">
                <span class="ppt-rule win">✅ Ganás=<strong>+${PPT_WIN_COINS}🪙</strong></span>
                <span class="ppt-rule tie">🤝 Empate=devuelve</span>
                <span class="ppt-rule lose">😹 Pierde=<strong>−${PPT_LOSE_COINS}🪙</strong></span>
            </div>
            <div class="ppt-arena">
                <div class="ppt-side"><div class="ppt-label">Tú</div><div class="ppt-choice" id="ppt-player-choice">❓</div></div>
                <div class="ppt-vs">VS</div>
                <div class="ppt-side"><div class="ppt-label">Pusheen</div><div class="ppt-choice" id="ppt-pusheen-choice">🐾</div></div>
            </div>
            <div class="ppt-buttons">
                <button class="btn-ppt" id="ppt-rock">🪨<span>Piedra</span></button>
                <button class="btn-ppt" id="ppt-paper">📄<span>Papel</span></button>
                <button class="btn-ppt" id="ppt-scissors">✂️<span>Tijera</span></button>
            </div>
            <div id="ppt-result" class="game-result" style="display:none;"></div>
            <p class="ppt-cost-note">Cada jugada cuesta <strong>1 🪙</strong></p>
        `;
        let playing=false;
        ['rock','paper','scissors'].forEach(choice=>{
            document.getElementById(`ppt-${choice}`).onclick=async()=>{
                if(playing)return;if(window.getWallet()<1){showGameMsg('ppt-result','¡No tenés monedas!','error');return;}
                playing=true;document.querySelectorAll('.btn-ppt').forEach(b=>b.disabled=true);
                await onWalletChange(-1);updateGFWallet();
                const pEl=document.getElementById('ppt-player-choice'),pPEl=document.getElementById('ppt-pusheen-choice');
                const chosen=PPT_OPTIONS.find(o=>o.id===choice);pEl.textContent=chosen.emoji;pPEl.textContent='🤔';
                const iv=setInterval(()=>{pPEl.textContent=['🤔','😏','🐾','😼'][Math.floor(Math.random()*4)];},200);
                setTimeout(async()=>{
                    clearInterval(iv);const pc=PPT_OPTIONS[Math.floor(Math.random()*PPT_OPTIONS.length)];pPEl.textContent=pc.emoji;
                    const res=getPPTResult(choice,pc.id);
                    if(res==='win'){await onWalletChange(PPT_WIN_COINS);updateGFWallet();showGameMsg('ppt-result',`¡Ganaste! ${chosen.emoji} vence a ${pc.emoji} · +${PPT_WIN_COINS} 🪙`,'win');if(window.spawnCoins)window.spawnCoins(8);pEl.classList.add('ppt-winner');pPEl.classList.add('ppt-loser');}
                    else if(res==='lose'){await onWalletChange(-PPT_LOSE_COINS);updateGFWallet();showGameMsg('ppt-result',`¡Pusheen ganó! · −${PPT_LOSE_COINS} 🪙 😹`,'lose');pPEl.classList.add('ppt-winner');pEl.classList.add('ppt-loser');}
                    else{await onWalletChange(1);updateGFWallet();showGameMsg('ppt-result',`¡Empate! · Moneda devuelta 🪙`,'tie');}
                    setTimeout(()=>{pEl.classList.remove('ppt-winner','ppt-loser');pPEl.classList.remove('ppt-winner','ppt-loser');playing=false;document.querySelectorAll('.btn-ppt').forEach(b=>b.disabled=false);},2500);
                },1200);
            };
        });
    }

    // ===================== FLAPPY =====================
    function openFlappy(content) {
        document.getElementById('game-fullscreen-title').textContent='🎈 Flappy Globo';
        function startGame() {
            const cfg=FLAPPY_CHARS.find(c=>c.id===getSelectedChar(currentPlayer))||FLAPPY_CHARS[0];
            const {canvas,ctx}=setupCanvas(content,'🎈 Flappy Globo',()=>openFlappy(content));
            document.getElementById('flappy-record-hud').textContent=`Récord: ${getRecord('flappy',currentPlayer)}`;
            const img=new Image();img.src=cfg.img;
            let state='waiting',score=0,gameLoop=null;
            let bird={x:0,y:0,vy:0,w:50,h:50},pipes=[],fc=0,speed=2.5;
            const G=0.35,FLAP=-7,GAP=160,PW=52;
            function reset(){bird={x:canvas.width*0.22,y:canvas.height*0.4,vy:0,w:50,h:50};pipes=[];score=0;fc=0;speed=2.5;document.getElementById('flappy-score-display').textContent='0';}
            function flap(){if(state==='waiting'){state='playing';document.getElementById('flappy-overlay').style.display='none';reset();}if(state==='playing')bird.vy=FLAP;}
            canvas.addEventListener('click',flap);
            canvas.addEventListener('touchstart',e=>{e.preventDefault();flap();},{passive:false});
            document.getElementById('flappy-overlay').addEventListener('click',flap);
            function drawBg(){const g=ctx.createLinearGradient(0,0,0,canvas.height);g.addColorStop(0,'#b8e4ff');g.addColorStop(1,'#e8f7ff');ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='rgba(255,255,255,0.8)';[[40,60,70,30],[200,40,90,25],[canvas.width-80,80,60,20]].forEach(([x,y,w,h])=>{ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,Math.PI*2);ctx.fill();});}
            function drawPipes(){pipes.forEach(p=>{const g=ctx.createLinearGradient(p.x,0,p.x+PW,0);g.addColorStop(0,'#ff9ec4');g.addColorStop(1,'#ff6fa8');ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(p.x,0,PW,p.topH,[0,0,10,10]);ctx.fill();ctx.fillStyle='#ff6fa8';ctx.beginPath();ctx.roundRect(p.x-5,p.topH-20,PW+10,20,6);ctx.fill();const by=p.topH+GAP;ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(p.x,by,PW,canvas.height-by,[10,10,0,0]);ctx.fill();ctx.fillStyle='#ff6fa8';ctx.beginPath();ctx.roundRect(p.x-5,by,PW+10,20,6);ctx.fill();});}
            function drawBird(){ctx.save();const a=Math.min(Math.max(bird.vy*3,-25),35)*Math.PI/180;ctx.translate(bird.x+bird.w/2,bird.y+bird.h/2);ctx.rotate(a);if(img.complete&&img.naturalWidth>0)ctx.drawImage(img,-bird.w/2,-bird.h/2,bird.w,bird.h);else{ctx.font='36px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🎈',0,0);}ctx.restore();}
            function hit(){const bx=bird.x+6,by=bird.y+6,bw=bird.w-12,bh=bird.h-12;if(by<=0||by+bh>=canvas.height)return true;for(const p of pipes){if(bx+bw>p.x+4&&bx<p.x+PW-4&&(by<p.topH||by+bh>p.topH+GAP))return true;}return false;}
            function onDead(){state='dead';const ov=showGameOver('flappy',currentPlayer,score);ov.onclick=()=>{state='waiting';document.getElementById('flappy-overlay-title').textContent='🎈 Flappy Globo';document.getElementById('flappy-overlay-sub').textContent='Tocá para empezar';document.getElementById('flappy-overlay-score').style.display='none';};}
            function loop(){gameLoop=requestAnimationFrame(loop);ctx.clearRect(0,0,canvas.width,canvas.height);drawBg();if(state==='playing'){fc++;speed=2.5+score*0.08;bird.vy+=G;bird.y+=bird.vy;if(fc%90===0)pipes.push({x:canvas.width,topH:Math.random()*(canvas.height-GAP-120)+60,passed:false});pipes.forEach(p=>p.x-=speed);pipes=pipes.filter(p=>p.x>-PW-10);pipes.forEach(p=>{if(!p.passed&&p.x+PW<bird.x){p.passed=true;score++;document.getElementById('flappy-score-display').textContent=score;}});if(hit())onDead();}drawPipes();drawBird();if(state==='playing'){ctx.fillStyle='rgba(255,255,255,0.9)';ctx.font='bold 28px Nunito';ctx.textAlign='center';ctx.fillText(score,canvas.width/2,42);}}
            loop();
        }
        renderCharSelector(content,currentPlayer,onWalletChange,startGame,'flappy');
    }

    // ===================== 🌩️ TORMENTA =====================
    function openStorm(content) {
        document.getElementById('game-fullscreen-title').textContent='🌩️ Tormenta de Estrellas';
        function startGame() {
            const cfg=FLAPPY_CHARS.find(c=>c.id===getSelectedChar(currentPlayer))||FLAPPY_CHARS[0];
            const {canvas,ctx}=setupCanvas(content,'🌩️ Tormenta',()=>openStorm(content));
            document.getElementById('flappy-record-hud').textContent=`Récord: ${getRecord('storm',currentPlayer)}`;
            const charImg=new Image();charImg.src=cfg.img;
            const DURATION=30;
            let state='waiting',score=0,lives=3,timeLeft=DURATION,lastTime=0,gameLoop=null;
            let player={x:0,y:0,w:52,h:52,targetY:0};
            let items=[],spawnT=0;

            const TYPES=[
                {type:'star', emoji:'⭐',points:1, prob:40},
                {type:'coin', emoji:'🪙',points:3, prob:25},
                {type:'gem',  emoji:'💎',points:5, prob:10},
                {type:'bomb', emoji:'💣',points:-1,prob:20},
                {type:'bolt', emoji:'⚡',points:-1,prob:5 },
            ];

            function reset(){player={x:canvas.width*0.15,y:canvas.height/2,w:52,h:52,targetY:canvas.height/2};items=[];score=0;lives=3;timeLeft=DURATION;lastTime=0;spawnT=0;document.getElementById('flappy-score-display').textContent='0';}
            function spawnItem(){let r=Math.random()*100,acc=0,ch=TYPES[0];for(const t of TYPES){acc+=t.prob;if(r<acc){ch=t;break;}}items.push({x:canvas.width+20,y:Math.random()*(canvas.height-60)+30,vx:-(2.5+Math.random()*2+score*0.05),vy:(Math.random()-0.5)*0.8,...ch,size:ch.type==='bomb'||ch.type==='bolt'?36:32,alive:true});}
            function moveFn(cY){const rect=canvas.getBoundingClientRect();player.targetY=(cY-rect.top)*(canvas.height/rect.height)-player.h/2;}
            canvas.addEventListener('touchmove',e=>{e.preventDefault();moveFn(e.touches[0].clientY);},{passive:false});
            canvas.addEventListener('mousemove',e=>{if(state==='playing')moveFn(e.clientY);});
            function startPlaying(){if(state==='waiting'){state='playing';document.getElementById('flappy-overlay').style.display='none';reset();}}
            canvas.addEventListener('click',startPlaying);
            canvas.addEventListener('touchstart',e=>{e.preventDefault();startPlaying();moveFn(e.touches[0].clientY);},{passive:false});
            document.getElementById('flappy-overlay').addEventListener('click',startPlaying);
            function onEnd(){state='dead';const ov=showGameOver('storm',currentPlayer,score);ov.onclick=()=>{state='waiting';document.getElementById('flappy-overlay-title').textContent='🌩️ Tormenta';document.getElementById('flappy-overlay-sub').textContent='Tocá para empezar';document.getElementById('flappy-overlay-score').style.display='none';};}
            function loop(ts){
                gameLoop=requestAnimationFrame(loop);const dt=lastTime?Math.min((ts-lastTime)/1000,0.05):0;lastTime=ts;
                ctx.clearRect(0,0,canvas.width,canvas.height);
                const bg=ctx.createLinearGradient(0,0,0,canvas.height);bg.addColorStop(0,'#1a1a2e');bg.addColorStop(1,'#16213e');ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
                ctx.fillStyle='rgba(255,255,255,0.3)';for(let i=0;i<25;i++){ctx.beginPath();ctx.arc((i*73+100)%canvas.width,(i*47+30)%canvas.height,1,0,Math.PI*2);ctx.fill();}
                if(state==='playing'){
                    timeLeft-=dt;if(timeLeft<=0||lives<=0){onEnd();return;}
                    player.y+=(player.targetY-player.y)*0.18;player.y=Math.max(0,Math.min(canvas.height-player.h,player.y));
                    spawnT+=dt;if(spawnT>0.55){spawnItem();spawnT=0;}
                    items.forEach(it=>{it.x+=it.vx;it.y+=it.vy;if(it.y<10||it.y>canvas.height-10)it.vy*=-1;});
                    items=items.filter(it=>it.x>-60&&it.alive);
                    items.forEach(it=>{if(!it.alive)return;const dx=it.x-(player.x+player.w/2),dy=it.y-(player.y+player.h/2);if(Math.sqrt(dx*dx+dy*dy)<player.w/2+it.size/2-10){it.alive=false;if(it.points>0){score+=it.points;document.getElementById('flappy-score-display').textContent=score;if(window.spawnCoins)window.spawnCoins(1);}else{lives=Math.max(0,lives-1);}}});
                    items.forEach(it=>{ctx.font=`${it.size}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(it.emoji,it.x,it.y);});
                    if(charImg.complete&&charImg.naturalWidth>0)ctx.drawImage(charImg,player.x,player.y,player.w,player.h);
                    else{ctx.font='40px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🎈',player.x+player.w/2,player.y+player.h/2);}
                    ctx.fillStyle='white';ctx.font='bold 15px Nunito';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('❤️'.repeat(Math.max(0,lives)),10,8);
                    ctx.fillStyle=timeLeft<10?'#ff6fa8':'white';ctx.font='bold 16px Nunito';ctx.textAlign='right';ctx.fillText(`⏱ ${Math.ceil(timeLeft)}s`,canvas.width-8,8);
                }
            }
            loop(0);
        }
        renderCharSelector(content,currentPlayer,onWalletChange,startGame,'storm');
    }

    // ===================== 🎯 SNIPER =====================
    function openSniper(content) {
        document.getElementById('game-fullscreen-title').textContent='🎯 Globo Sniper';
        function startGame() {
            const {canvas,ctx}=setupCanvas(content,'🎯 Globo Sniper',()=>openSniper(content));
            document.getElementById('flappy-record-hud').textContent=`Récord: ${getRecord('sniper',currentPlayer)}`;
            const DURATION=30;
            let state='waiting',score=0,timeLeft=DURATION,lastTime=0,gameLoop=null;
            let targets=[],combo=0,pops=[],spawnT=0;

            const TTYPES=[
                {emoji:'💖',points:1,size:55,speed:1.2,prob:35,life:2.5},
                {emoji:'⭐',points:2,size:48,speed:1.6,prob:30,life:2.0},
                {emoji:'👑',points:5,size:42,speed:2.2,prob:15,life:1.5},
                {emoji:'🌸',points:1,size:60,speed:1.0,prob:20,life:3.0},
            ];

            function reset(){targets=[];score=0;timeLeft=DURATION;lastTime=0;combo=0;pops=[];spawnT=0;document.getElementById('flappy-score-display').textContent='0';}
            function spawn(){let r=Math.random()*100,acc=0,ch=TTYPES[0];for(const t of TTYPES){acc+=t.prob;if(r<acc){ch=t;break;}}const life=ch.life+Math.random();targets.push({x:Math.random()*(canvas.width-100)+50,y:Math.random()*(canvas.height-160)+60,vx:(Math.random()*ch.speed+0.4)*(Math.random()>0.5?1:-1),vy:(Math.random()-0.5)*ch.speed,...ch,life,maxLife:life,alive:true});}

            function handleTap(cx,cy){
                if(state==='waiting'){state='playing';document.getElementById('flappy-overlay').style.display='none';reset();return;}
                if(state!=='playing')return;
                const rect=canvas.getBoundingClientRect();
                const sx=(cx-rect.left)*(canvas.width/rect.width),sy=(cy-rect.top)*(canvas.height/rect.height);
                let hit=false;
                targets.forEach(t=>{if(!t.alive)return;const dx=sx-t.x,dy=sy-t.y;if(Math.sqrt(dx*dx+dy*dy)<t.size/2+12){t.alive=false;hit=true;combo++;const pts=t.points*(combo>=3?2:1);score+=pts;document.getElementById('flappy-score-display').textContent=score;pops.push({x:t.x,y:t.y,text:`+${pts}${combo>=3?' ×2!':''}`,life:1});if(window.spawnCoins)window.spawnCoins(1);}});
                if(!hit)combo=0;
            }
            canvas.addEventListener('click',e=>handleTap(e.clientX,e.clientY));
            canvas.addEventListener('touchstart',e=>{e.preventDefault();handleTap(e.touches[0].clientX,e.touches[0].clientY);},{passive:false});
            document.getElementById('flappy-overlay').addEventListener('click',e=>handleTap(e.clientX,e.clientY));

            function onEnd(){state='dead';const ov=showGameOver('sniper',currentPlayer,score);ov.onclick=()=>{state='waiting';document.getElementById('flappy-overlay-title').textContent='🎯 Globo Sniper';document.getElementById('flappy-overlay-sub').textContent='Tocá para empezar';document.getElementById('flappy-overlay-score').style.display='none';};}

            function loop(ts){
                gameLoop=requestAnimationFrame(loop);const dt=lastTime?(ts-lastTime)/1000:0;lastTime=ts;
                ctx.clearRect(0,0,canvas.width,canvas.height);
                const bg=ctx.createLinearGradient(0,0,0,canvas.height);bg.addColorStop(0,'#ffeef5');bg.addColorStop(1,'#fff0f8');ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
                if(state==='playing'){
                    timeLeft-=dt;if(timeLeft<=0){onEnd();return;}
                    spawnT+=dt;if(spawnT>1.1&&targets.filter(t=>t.alive).length<5+Math.floor(score/5)){spawn();spawnT=0;}
                    targets.forEach(t=>{if(!t.alive)return;t.x+=t.vx;t.y+=t.vy;t.life-=dt;if(t.x<t.size/2||t.x>canvas.width-t.size/2)t.vx*=-1;if(t.y<t.size/2||t.y>canvas.height-t.size/2)t.vy*=-1;if(t.life<=0){t.alive=false;combo=0;return;}const a=Math.min(1,t.life/0.4);ctx.globalAlpha=a;ctx.shadowColor='rgba(200,80,140,0.3)';ctx.shadowBlur=10;ctx.font=`${t.size}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.emoji,t.x,t.y);ctx.shadowBlur=0;ctx.globalAlpha=1;const lr=t.life/t.maxLife;ctx.fillStyle=`rgba(255,100,150,${0.5*a})`;ctx.fillRect(t.x-t.size/2,t.y+t.size/2+4,t.size*lr,4);});
                    targets=targets.filter(t=>t.alive);
                    pops.forEach(p=>{p.life-=dt;p.y-=1;});pops=pops.filter(p=>p.life>0);
                    pops.forEach(p=>{ctx.globalAlpha=p.life;ctx.fillStyle='#ff6fa8';ctx.font='bold 20px Nunito';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.text,p.x,p.y);ctx.globalAlpha=1;});
                    ctx.fillStyle=timeLeft<10?'#ff6fa8':'#d63d7a';ctx.font='bold 16px Nunito';ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText(`⏱ ${Math.ceil(timeLeft)}s`,canvas.width-8,8);
                    if(combo>=3){ctx.fillStyle='#ffc94d';ctx.font='bold 15px Nunito';ctx.textAlign='left';ctx.fillText(`🔥 Combo ×${combo}`,8,8);}
                }
            }
            loop(0);
        }
        renderCharSelector(content,currentPlayer,onWalletChange,startGame,'sniper');
    }

    // ===================== 💨 VIENTO LOCO =====================
    function openWind(content) {
        document.getElementById('game-fullscreen-title').textContent='💨 Viento Loco';
        function startGame() {
            const cfg=FLAPPY_CHARS.find(c=>c.id===getSelectedChar(currentPlayer))||FLAPPY_CHARS[0];
            const {canvas,ctx}=setupCanvas(content,'💨 Viento Loco',()=>openWind(content));
            document.getElementById('flappy-record-hud').textContent=`Récord: ${getRecord('wind',currentPlayer)}s`;
            const charImg=new Image();charImg.src=cfg.img;
            let state='waiting',score=0,survived=0,lastTime=0,gameLoop=null;
            let player={x:0,y:0,w:50,h:50,vy:0};
            let windY=0,windT=0,windInt=2,particles=[];
            const ZONE=90,MAX_SPD=9;

            function reset(){player={x:canvas.width/2-25,y:canvas.height/2-25,w:50,h:50,vy:0};windY=0;windT=0;windInt=2;survived=0;particles=[];document.getElementById('flappy-score-display').textContent='0';}
            function changeWind(){windY=(Math.random()-0.5)*(0.5+survived*0.025);windT=0;}
            function tap(){
                if(state==='waiting'){state='playing';document.getElementById('flappy-overlay').style.display='none';reset();return;}
                if(state!=='playing')return;
                player.vy-=windY*2.8;player.vy=Math.max(-MAX_SPD,Math.min(MAX_SPD,player.vy));
            }
            canvas.addEventListener('click',tap);
            canvas.addEventListener('touchstart',e=>{e.preventDefault();tap();},{passive:false});
            document.getElementById('flappy-overlay').addEventListener('click',tap);

            function onDead(){state='dead';const ov=showGameOver('wind',currentPlayer,score,'s');ov.onclick=()=>{state='waiting';document.getElementById('flappy-overlay-title').textContent='💨 Viento Loco';document.getElementById('flappy-overlay-sub').textContent='Tocá para empezar';document.getElementById('flappy-overlay-score').style.display='none';};}

            function loop(ts){
                gameLoop=requestAnimationFrame(loop);const dt=lastTime?Math.min((ts-lastTime)/1000,0.05):0.016;lastTime=ts;
                ctx.clearRect(0,0,canvas.width,canvas.height);
                const bg=ctx.createLinearGradient(0,0,canvas.width,0);bg.addColorStop(0,'#e8f4ff');bg.addColorStop(0.5,'#f0f8ff');bg.addColorStop(1,'#e8f4ff');ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
                const zt=canvas.height/2-ZONE,zb=canvas.height/2+ZONE;
                ctx.fillStyle='rgba(100,210,100,0.07)';ctx.fillRect(0,zt,canvas.width,ZONE*2);
                ctx.strokeStyle='rgba(80,180,80,0.25)';ctx.lineWidth=2;ctx.setLineDash([8,6]);
                ctx.beginPath();ctx.moveTo(0,zt);ctx.lineTo(canvas.width,zt);ctx.stroke();
                ctx.beginPath();ctx.moveTo(0,zb);ctx.lineTo(canvas.width,zb);ctx.stroke();
                ctx.setLineDash([]);
                if(state==='playing'){
                    survived+=dt;score=Math.floor(survived);document.getElementById('flappy-score-display').textContent=score;
                    windT+=dt;if(windT>windInt){changeWind();windInt=Math.max(0.7,2-survived*0.025);}
                    player.vy+=windY;player.vy*=0.91;player.y+=player.vy;
                    if(player.y<-player.h||player.y>canvas.height){onDead();return;}
                    if(Math.random()<0.25){const side=Math.random()>0.5?canvas.width+10:-10;particles.push({x:side,y:Math.random()*canvas.height,vx:(side>0?-1:1)*(2+Math.random()*3),vy:windY*15,life:1});}
                    particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=dt;});particles=particles.filter(p=>p.life>0&&p.x>-30&&p.x<canvas.width+30);
                    particles.forEach(p=>{ctx.globalAlpha=p.life*0.45;ctx.strokeStyle='#88ccff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*4,p.y-p.vy*4);ctx.stroke();ctx.globalAlpha=1;});
                    if(charImg.complete&&charImg.naturalWidth>0)ctx.drawImage(charImg,player.x,player.y,player.w,player.h);
                    else{ctx.font='40px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🎈',player.x+player.w/2,player.y+player.h/2);}
                    const wStr=Math.abs(windY);const wDir=windY>0?'↓':'↑';
                    ctx.fillStyle=wStr>0.35?'#ff6fa8':'#5588aa';ctx.font='bold 15px Nunito';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(`💨 ${wDir} ${wStr>0.45?'FUERTE':wStr>0.25?'Medio':'Suave'}`,canvas.width/2,8);
                    ctx.fillStyle='#d63d7a';ctx.font='bold 17px Nunito';ctx.textAlign='right';ctx.fillText(`⏱ ${score}s`,canvas.width-8,8);
                    const danger=player.y<50||player.y>canvas.height-90;
                    if(danger){ctx.fillStyle=`rgba(255,0,0,${0.08+Math.sin(ts/80)*0.04})`;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#ff3333';ctx.font='bold 14px Nunito';ctx.textAlign='center';ctx.fillText('⚠️ ¡PELIGRO!',canvas.width/2,canvas.height/2);}
                }
            }
            loop(0);
        }
        renderCharSelector(content,currentPlayer,onWalletChange,startGame,'wind');
    }

    // ===================== ROUTER =====================
    window.openGame=(gameId)=>{
        const screen=document.getElementById('game-fullscreen');
        const content=document.getElementById('game-fullscreen-content');
        if     (gameId==='slots') openSlots(content);
        else if(gameId==='ppt')   openPPT(content);
        else if(gameId==='flappy')openFlappy(content);
        else if(gameId==='storm') openStorm(content);
        else if(gameId==='sniper')openSniper(content);
        else if(gameId==='wind')  openWind(content);
        screen.classList.add('active');
    };
}