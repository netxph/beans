<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Flies Invasion</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Playful Kids/Jungle Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Luckiest+Guy&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Fredoka', sans-serif;
            user-select: none;
            -webkit-user-select: none;
            touch-action: manipulation;
            background-color: #0d1e13;
        }
        .jungle-font {
            font-family: 'Luckiest Guy', cursive;
            letter-spacing: 0.05em;
        }
        /* Custom scrollbar-free sizing */
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        /* Tap effect for keypad */
        .key-btn:active {
            transform: scale(0.9);
            background-color: #10b981;
            color: white;
        }
        /* Gentle swing animation for vine decorations */
        @keyframes swing {
            0%, 100% { transform: rotate(-3deg); }
            50% { transform: rotate(3deg); }
        }
        .vines {
            animation: swing 6s ease-in-out infinite;
            transform-origin: top center;
        }
        /* Shaking animation for incorrect answers */
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-6px); }
            75% { transform: translateX(6px); }
        }
        .shake-element {
            animation: shake 0.2s ease-in-out 2;
        }
    </style>
</head>
<body class="flex flex-col justify-between text-white">

    <!-- Header HUD / Jungle Canopy Top -->
    <header class="w-full bg-gradient-to-b from-emerald-900 to-green-950 border-b-4 border-emerald-800 px-4 py-2.5 flex justify-between items-center z-10 shadow-lg">
        <div class="flex items-center space-x-2">
            <span class="text-2xl animate-pulse">🐸</span>
            <h1 class="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-emerald-300 jungle-font">
                FLIES INVASION
            </h1>
        </div>
        
        <!-- Interactive scoreboard -->
        <div class="flex items-center space-x-3 text-sm md:text-base font-semibold">
            <div class="bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-600 shadow-inner">
                🍌 Score: <span id="hud-score" class="text-yellow-300 font-bold">0</span>
            </div>
            <div class="bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-600">
                🌴 Stage: <span id="hud-stage" class="text-green-300 font-bold">1</span>
            </div>
            <div class="bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-600">
                ⏱️ Time: <span id="hud-timer" class="text-cyan-200 font-bold">00:00</span>
            </div>
            <div class="flex items-center bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-600">
                <span class="mr-1">❤️</span>
                <span id="hud-lives" class="text-red-400 font-bold">3</span>
            </div>
        </div>
    </header>

    <!-- Main Game Frame -->
    <main class="relative flex-1 w-full max-w-4xl mx-auto flex flex-col justify-between overflow-hidden">
        
        <!-- Interactive Game Window / Canvas -->
        <div class="relative flex-1 w-full bg-emerald-950/50 border-x-4 border-emerald-900 overflow-hidden">
            <canvas id="gameCanvas" tabindex="0" class="w-full h-full block outline-none"></canvas>
            <input id="keyboardCapture" type="text" inputmode="none" readonly autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-hidden="true" class="absolute opacity-0 pointer-events-none w-px h-px" />

            <!-- Leafy Vine Overlay Left -->
            <div class="absolute left-1 top-0 vines opacity-30 pointer-events-none select-none text-2xl">🍃🌿</div>
            <!-- Leafy Vine Overlay Right -->
            <div class="absolute right-1 top-0 vines opacity-30 pointer-events-none select-none text-2xl" style="animation-delay: -3s;">🌿🍃</div>

            <!-- Start Menu Overlay -->
            <div id="start-menu" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 z-20 transition-all duration-300">
                <div class="text-center max-w-md w-full bg-gradient-to-b from-emerald-900/40 to-slate-900/60 p-6 rounded-3xl border border-emerald-500/30 shadow-2xl">
                    <span class="text-7xl animate-bounce inline-block mb-3">🦟</span>
                    <h2 class="text-3xl md:text-4xl font-extrabold mb-1 text-yellow-300 jungle-font">FLIES INVASION</h2>
                    <p class="text-emerald-100 text-sm md:text-base mb-6">Type the right answer and help Croaky the Frog splash the pesky invading flies!</p>
                    
                    <div class="bg-emerald-950/80 p-4 rounded-2xl border border-emerald-600/50 mb-6 shadow-inner text-left">
                        <p class="text-xs text-emerald-300 font-bold uppercase tracking-wider mb-2">Stage Rules</p>
                        <ul class="text-sm text-emerald-100 space-y-1.5">
                            <li>• Stage increases every 1 minute</li>
                            <li>• Flies move faster each stage</li>
                            <li>• Watch the timer and survive!</li>
                        </ul>
                    </div>

                    <button onclick="startGame()" class="w-full py-4 bg-gradient-to-r from-yellow-400 to-emerald-500 hover:from-yellow-300 hover:to-emerald-400 text-white rounded-2xl font-bold text-lg md:text-xl shadow-lg shadow-yellow-500/20 transform active:scale-95 transition-all jungle-font text-shadow-sm">
                        PLAY JUNGLE MATH 🐸
                    </button>
                </div>
            </div>

            <!-- Game Over / Victory Overlay -->
            <div id="game-over-screen" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 z-20 hidden transition-all duration-300">
                <div class="text-center max-w-sm w-full bg-emerald-950 border-2 border-emerald-600 p-8 rounded-3xl shadow-2xl">
                    <span id="game-over-emoji" class="text-6xl mb-4 inline-block">🍇</span>
                    <h2 id="game-over-title" class="text-3xl font-extrabold mb-2 text-yellow-300 jungle-font">JUNGLE INVADED</h2>
                    <p id="game-over-desc" class="text-emerald-200 text-sm mb-6">The flies swam past Croaky! Let's try again to clean up the swamp.</p>
                    
                    <div class="bg-emerald-900/50 p-4 rounded-xl border border-emerald-700/50 mb-6">
                        <div class="text-xs text-emerald-300 uppercase font-bold tracking-wider">Final Score</div>
                        <div id="final-score" class="text-4xl font-black text-yellow-300 jungle-font mt-1">0</div>
                    </div>

                    <button onclick="restartGame()" class="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-xl font-bold tracking-wide transform active:scale-95 transition-all jungle-font">
                        TRY AGAIN 🔁
                    </button>
                </div>
            </div>

            <!-- Warning Alert Overlay (Flashes when flies approach the vine) -->
            <div id="warning-banner" class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 text-slate-900 px-5 py-2 rounded-full border-2 border-yellow-300 font-bold text-xs md:text-sm tracking-wider uppercase shadow-lg opacity-0 pointer-events-none transition-opacity duration-300 z-10 flex items-center space-x-2">
                <span>⚠️</span> <span class="font-bold">Pesky flies are getting too close!</span>
            </div>
        </div>

        <!-- Math Answer & Targeting display -->
        <div class="bg-emerald-950 border-t-4 border-emerald-900 p-3 flex flex-col items-center space-y-2.5 z-10 shadow-2xl">
            

            <!-- Standard calculator-style keypad -->
            <div class="w-full max-w-md px-1">
                <div class="grid grid-cols-3 gap-2">
                    <button onclick="pressKey('7')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-800 text-white text-xl sm:text-2xl font-extrabold rounded-2xl shadow transition-transform duration-75">7</button>
                    <button onclick="pressKey('8')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-800 text-white text-xl sm:text-2xl font-extrabold rounded-2xl shadow transition-transform duration-75">8</button>
                    <button onclick="pressKey('9')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-800 text-white text-xl sm:text-2xl font-extrabold rounded-2xl shadow transition-transform duration-75">9</button>

                    <button onclick="pressKey('4')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-800 text-white text-xl sm:text-2xl font-extrabold rounded-2xl shadow transition-transform duration-75">4</button>
                    <button onclick="pressKey('5')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-800 text-white text-xl sm:text-2xl font-extrabold rounded-2xl shadow transition-transform duration-75">5</button>
                    <button onclick="pressKey('6')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-800 text-white text-xl sm:text-2xl font-extrabold rounded-2xl shadow transition-transform duration-75">6</button>

                    <button onclick="pressKey('1')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-800 text-white text-xl sm:text-2xl font-extrabold rounded-2xl shadow transition-transform duration-75">1</button>
                    <button onclick="pressKey('2')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-800 text-white text-xl sm:text-2xl font-extrabold rounded-2xl shadow transition-transform duration-75">2</button>
                    <button onclick="pressKey('3')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-800 text-white text-xl sm:text-2xl font-extrabold rounded-2xl shadow transition-transform duration-75">3</button>

                    <button onclick="pressKey('backspace')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-yellow-600 border border-yellow-500 hover:bg-yellow-500 text-white font-extrabold rounded-2xl shadow transition-transform duration-75" title="Backspace">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414A2 2 0 0010.828 19H20a2 2 0 002-2V7a2 2 0 00-2-2h-9.172a2 2 0 00-1.414.586L3 12z" />
                        </svg>
                    </button>
                    <button onclick="pressKey('0')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-800 text-white text-xl sm:text-2xl font-extrabold rounded-2xl shadow transition-transform duration-75">0</button>
                    <button onclick="pressKey('fire')" class="key-btn h-14 sm:h-16 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-green-500 border border-emerald-400 hover:from-emerald-400 hover:to-green-400 text-white rounded-2xl shadow transition-transform duration-75" title="Shoot Bubble">
                        <span class="text-3xl">👅</span>
                    </button>
                </div>
            </div>
        </div>
    </main>

    <!-- Game Engine Scripts -->
    <script>
        // Web Audio Context setup for synthesised jungle sounds
        let audioCtx = null;
        
        function playSound(type) {
            try {
                if (!audioCtx) {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }

                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);

                const now = audioCtx.currentTime;

                if (type === 'bubble') {
                    // Cute organic watery sound (bubble launch)
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(120, now);
                    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.12);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
                    osc.start(now);
                    osc.stop(now + 0.12);
                } else if (type === 'splat') {
                    // Juicy splat pop sound on popping flies
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(320, now);
                    osc.frequency.setValueAtTime(100, now + 0.05);
                    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
                    gain.gain.setValueAtTime(0.25, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
                    osc.start(now);
                    osc.stop(now + 0.25);
                } else if (type === 'error') {
                    // Deep ribbit / croak error sound
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(110, now);
                    osc.frequency.linearRampToValueAtTime(75, now + 0.15);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
                    
                    // Modulator for double vibration
                    const osc2 = audioCtx.createOscillator();
                    const gain2 = audioCtx.createGain();
                    osc2.type = 'sawtooth';
                    osc2.frequency.setValueAtTime(90, now);
                    osc2.frequency.linearRampToValueAtTime(65, now + 0.18);
                    osc2.connect(gain2);
                    gain2.connect(audioCtx.destination);
                    gain2.gain.setValueAtTime(0.2, now);
                    gain2.gain.linearRampToValueAtTime(0.01, now + 0.18);
                    
                    osc.start(now);
                    osc.stop(now + 0.2);
                    osc2.start(now);
                    osc2.stop(now + 0.2);
                } else if (type === 'level-up') {
                    // Happy jungle chime
                    osc.type = 'sine';
                    const scale = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
                    scale.forEach((freq, idx) => {
                        const noteTime = now + idx * 0.07;
                        osc.frequency.setValueAtTime(freq, noteTime);
                    });
                    gain.gain.setValueAtTime(0.18, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
                    osc.start(now);
                    osc.stop(now + 0.5);
                } else if (type === 'warning') {
                    // Mosquito/Fly insect buzz alarm sound
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(220, now);
                    osc.frequency.linearRampToValueAtTime(260, now + 0.1);
                    osc.frequency.linearRampToValueAtTime(220, now + 0.2);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                }
            } catch (err) {
                console.warn('Audio feedback failed or blocked by sandbox permissions:', err);
            }
        }

        // Canvas & Setup
        const canvas = document.getElementById('gameCanvas');
        const keyboardCapture = document.getElementById('keyboardCapture');
        const ctx = canvas.getContext('2d');

        const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
        const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
        const allowHiddenKeyboardCapture = !(hasCoarsePointer || isMobileUA || navigator.maxTouchPoints > 0);

        if (!allowHiddenKeyboardCapture) {
            // Keep physical key events on window, but never trigger the soft keyboard.
            keyboardCapture.blur();
        }
        
        let fireflies = [];
        let flies = [];
        let bubbles = [];
        let particles = [];
        
        let score = 0;
        let stage = 1;
        let lives = 3;
        const multiplierRange = { min: 1, max: 10 };

        let currentInput = '';
        let gameActive = false;
        let lastSpawnTime = 0;
        let spawnInterval = 5200; // dynamically reduced by stage
        let flySpeed = 0.24; // dynamically increased by stage
        let gameStartTime = 0;
        let scaleFactor = 1;
        let inputFlashTimer = 0;

        // Player frog positioning variables
        let frogX = 0;
        let frogY = 0;
        let frogTargetX = 0; 
        let tongueState = 0; // 0: Idle, >0: Tongue animation length
        let tongueX = 0;
        let tongueY = 0;

        // Configure dynamic scales of canvas coordinate system
        function resizeCanvas() {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            
            scaleFactor = rect.width / 480;
            frogX = rect.width / 2;
            frogTargetX = rect.width / 2;
            frogY = rect.height - 40;
            
            initFireflies(rect.width, rect.height);
        }
        
        // Cozy jungle fireflies floating up
        function initFireflies(width, height) {
            fireflies = [];
            for (let i = 0; i < 25; i++) {
                fireflies.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: Math.random() * 2.5 + 1.2,
                    speed: Math.random() * 0.3 + 0.15,
                    opacity: Math.random() * 0.5 + 0.5,
                    oscillator: Math.random() * 10
                });
            }
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        function formatElapsedTime(totalSeconds) {
            const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
            const secs = (totalSeconds % 60).toString().padStart(2, '0');
            return `${mins}:${secs}`;
        }

        function applyStagePacing(nowMs = Date.now()) {
            const elapsedMs = Math.max(0, nowMs - gameStartTime);
            const elapsedSeconds = Math.floor(elapsedMs / 1000);
            const nextStage = Math.floor(elapsedMs / 60000) + 1;

            document.getElementById('hud-timer').textContent = formatElapsedTime(elapsedSeconds);

            if (nextStage !== stage) {
                stage = nextStage;
                document.getElementById('hud-stage').textContent = stage;
                playSound('level-up');
            }

            flySpeed = 0.24 + (stage - 1) * 0.07;
            spawnInterval = Math.max(1700, 5200 - (stage - 1) * 320);
        }

        // Fly generator
        function generateFly() {
            const width = canvas.width / window.devicePixelRatio;
            
            // Random numbers for multiplication problem
            const num1 = Math.floor(Math.random() * (multiplierRange.max - multiplierRange.min + 1)) + multiplierRange.min;
            const num2 = Math.floor(Math.random() * 10) + 1;
            const answer = num1 * num2;
            
            // Prevent duplicated answers
            if (flies.some(f => f.answer === answer)) {
                return;
            }

            const text = `${num1} × ${num2}`;
            // Bug body color palettes
            const insectColors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#f59e0b', '#e11d48'];
            const randomColor = insectColors[Math.floor(Math.random() * insectColors.length)];
            
            const size = Math.max(48, 40 * scaleFactor);
            const x = Math.max(size, Math.min(width - size, Math.random() * (width - size)));
            
            // Increase speed based on current timed stage
            const speedMod = flySpeed + Math.random() * 0.08;
            
            flies.push({
                x: x,
                y: -size,
                size: size,
                text: text,
                answer: answer,
                color: randomColor,
                speed: speedMod,
                wingTimer: 0,
                swayOffset: Math.random() * 100
            });
        }

        // Particle splash generator on bug pop
        function spawnSplat(x, y, color) {
            playSound('splat');
            for (let i = 0; i < 20; i++) {
                particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    radius: Math.random() * 3.5 + 1.5,
                    color: color,
                    alpha: 1,
                    decay: Math.random() * 0.035 + 0.015
                });
            }
        }

        // Handle keys on the keypad
        function pressKey(key) {
            if (!gameActive) return;
            
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            if (key === 'backspace') {
                currentInput = currentInput.slice(0, -1);
            } else if (key === 'fire') {
                submitAnswer();
            } else if (currentInput.length < 4) {
                currentInput += key;
            }

            // Clear wrong-answer flash once player continues typing.
            inputFlashTimer = 0;
        }

        // Submit typed calculation
        function submitAnswer() {
            if (currentInput === '') return;
            const parsedVal = parseInt(currentInput);
            
            // Find lowest fly matching the answer
            let targetIdx = -1;
            let lowestY = -999;
            
            for (let i = 0; i < flies.length; i++) {
                if (flies[i].answer === parsedVal && flies[i].y > lowestY) {
                    lowestY = flies[i].y;
                    targetIdx = i;
                }
            }
            
            if (targetIdx !== -1) {
                const targetFly = flies[targetIdx];
                
                // Slide Frog toward target before shooting tongue/bubble
                frogTargetX = targetFly.x;
                
                // Spawn bubble projectile
                bubbles.push({
                    startX: frogX,
                    startY: frogY - 15,
                    currentX: frogX,
                    currentY: frogY - 15,
                    targetX: targetFly.x,
                    targetY: targetFly.y,
                    speed: 13,
                    targetFly: targetFly,
                    color: '#67e8f9' // bright glowing water bubble
                });

                // Trigger tongue firing visual effect
                tongueState = 12; // active animation frame count
                tongueX = targetFly.x;
                tongueY = targetFly.y;
                
                playSound('bubble');
                currentInput = '';
            } else {
                // Incorrect answer feedback on in-canvas input badge
                inputFlashTimer = 12;
                playSound('error');
            }
        }

        function focusKeyboardCapture() {
            if (!gameActive || !allowHiddenKeyboardCapture) {
                keyboardCapture.blur();
                return;
            }
            keyboardCapture.value = '';
            keyboardCapture.focus({ preventScroll: true });
        }

        let lastHandledAction = '';
        let lastHandledAt = 0;

        function shouldIgnoreDuplicateAction(action) {
            const now = performance.now();
            const isDup = action === lastHandledAction && (now - lastHandledAt) < 35;
            if (!isDup) {
                lastHandledAction = action;
                lastHandledAt = now;
            }
            return isDup;
        }

        function handleGameKeyboardInput(key, code, eventLike) {
            if (!gameActive) return;

            const numpadMatch = /^Numpad([0-9])$/.exec(code || '');
            const normalizedDigit = /^[0-9]$/.test(key) ? key : (numpadMatch ? numpadMatch[1] : null);

            if (normalizedDigit !== null) {
                if (!shouldIgnoreDuplicateAction(`digit:${normalizedDigit}`)) {
                    pressKey(normalizedDigit);
                }
                eventLike?.preventDefault?.();
                return;
            }

            if (key === 'Backspace' || key === 'Delete') {
                if (!shouldIgnoreDuplicateAction('backspace')) {
                    pressKey('backspace');
                }
                eventLike?.preventDefault?.();
                return;
            }

            if (key === 'Enter' || code === 'NumpadEnter' || key === ' ') {
                if (!shouldIgnoreDuplicateAction('fire')) {
                    pressKey('fire');
                }
                eventLike?.preventDefault?.();
            }
        }

        // Match keyboard inputs (desktop + numpad)
        window.addEventListener('keydown', (e) => {
            handleGameKeyboardInput(e.key, e.code, e);
        });

        // Accept forwarded key events from parent page (arcade iframe wrapper)
        window.addEventListener('message', (e) => {
            if (e.data?.type !== 'beans-key') return;
            handleGameKeyboardInput(e.data.key, e.data.code);
            focusKeyboardCapture();
        });

        function restoreKeyboardFocus() {
            if (!gameActive || document.hidden) return;
            canvas.focus({ preventScroll: true });
            focusKeyboardCapture();

            // Retry once because tab/window focus can settle asynchronously.
            setTimeout(() => {
                if (!gameActive || document.hidden) return;
                canvas.focus({ preventScroll: true });
                focusKeyboardCapture();
            }, 60);
        }

        canvas.addEventListener('pointerdown', () => {
            canvas.focus({ preventScroll: true });
            focusKeyboardCapture();
        });

        window.addEventListener('pointerdown', () => {
            focusKeyboardCapture();
        }, { passive: true });

        window.addEventListener('focus', restoreKeyboardFocus);
        window.addEventListener('pageshow', restoreKeyboardFocus);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) restoreKeyboardFocus();
        });

        // Procedurally draw the fly
        function drawFly(ctx, x, y, size, color) {
            const w = size;
            const h = size * 0.7;

            ctx.save();
            ctx.shadowBlur = 8;
            ctx.shadowColor = color;

            // Simple vector insect drawing (legs)
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 2;
            for (let i = -1; i <= 1; i += 2) {
                ctx.beginPath();
                ctx.moveTo(x + (i * w * 0.2), y + h * 0.1);
                ctx.lineTo(x + (i * w * 0.5), y + h * 0.4);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(x + (i * w * 0.15), y);
                ctx.lineTo(x + (i * w * 0.45), y + h * 0.1);
                ctx.stroke();
            }

            // Fly Body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(x, y, w * 0.35, h * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();

            // Head
            ctx.fillStyle = '#18181b';
            ctx.beginPath();
            ctx.arc(x, y - h * 0.42, w * 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Big insect eyes
            ctx.fillStyle = '#f43f5e'; // Red compound eyes
            ctx.beginPath();
            ctx.arc(x - w * 0.12, y - h * 0.48, w * 0.1, 0, Math.PI * 2);
            ctx.arc(x + w * 0.12, y - h * 0.48, w * 0.1, 0, Math.PI * 2);
            ctx.fill();

            // Animated Flapping Wings
            const flap = Math.sin(Date.now() * 0.05) * (w * 0.45);
            ctx.fillStyle = 'rgba(224, 242, 254, 0.75)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 1;

            // Wing Left
            ctx.beginPath();
            ctx.ellipse(x - w * 0.3, y - h * 0.1, w * 0.4, Math.abs(flap), -Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Wing Right
            ctx.beginPath();
            ctx.ellipse(x + w * 0.3, y - h * 0.1, w * 0.4, Math.abs(flap), Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

        // Procedurally draw player frog
        function drawFrog(ctx, x, y, size) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#10b981';

            // Frog Feet
            ctx.fillStyle = '#047857';
            ctx.beginPath();
            ctx.ellipse(x - size * 0.6, y + size * 0.3, size * 0.4, size * 0.2, -Math.PI/12, 0, Math.PI * 2);
            ctx.ellipse(x + size * 0.6, y + size * 0.3, size * 0.4, size * 0.2, Math.PI/12, 0, Math.PI * 2);
            ctx.fill();

            // Frog main body
            ctx.fillStyle = '#10b981'; // vibrant green frog
            ctx.beginPath();
            ctx.arc(x, y + size * 0.1, size * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // Frog chest (light yellow circle)
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(x, y + size * 0.25, size * 0.45, 0, Math.PI * 2);
            ctx.fill();

            // Big Frog eyes
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(x - size * 0.4, y - size * 0.4, size * 0.3, 0, Math.PI * 2);
            ctx.arc(x + size * 0.4, y - size * 0.4, size * 0.3, 0, Math.PI * 2);
            ctx.fill();

            // Eye whites
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x - size * 0.4, y - size * 0.4, size * 0.2, 0, Math.PI * 2);
            ctx.arc(x + size * 0.4, y - size * 0.4, size * 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(x - size * 0.4, y - size * 0.4, size * 0.1, 0, Math.PI * 2);
            ctx.arc(x + size * 0.4, y - size * 0.4, size * 0.1, 0, Math.PI * 2);
            ctx.fill();

            // Cute rosy cheeks
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(x - size * 0.38, y + size * 0.05, 4, 0, Math.PI * 2);
            ctx.arc(x + size * 0.38, y + size * 0.05, 4, 0, Math.PI * 2);
            ctx.fill();

            // Smiling frog mouth (opens dynamically when tongue active)
            ctx.strokeStyle = '#047857';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            if (tongueState > 0) {
                // Draw wide open circular mouth
                ctx.fillStyle = '#991b1b';
                ctx.arc(x, y + size * 0.1, size * 0.22, 0, Math.PI, false);
                ctx.fill();
            } else {
                // Smile shape
                ctx.arc(x, y + size * 0.05, size * 0.28, 0, Math.PI, false);
            }
            ctx.stroke();

            ctx.restore();

            // Draw sticky tongue laser-beam line
            if (tongueState > 0) {
                ctx.strokeStyle = '#f43f5e'; // sticky pink tongue
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x, y + size * 0.1);
                ctx.lineTo(tongueX, tongueY);
                ctx.stroke();
                tongueState--;
            }
        }

        let redFlashTimer = 0;
        function triggerScreenFlash() {
            redFlashTimer = 15;
            playSound('error');
        }

        // Game update math loop
        function updateGame() {
            if (!gameActive) return;

            const width = canvas.width / window.devicePixelRatio;
            const height = canvas.height / window.devicePixelRatio;

            // Smooth frog tracking
            frogX += (frogTargetX - frogX) * 0.15;

            // Fireflies float up
            fireflies.forEach(f => {
                f.oscillator += 0.02;
                f.y -= f.speed;
                f.x += Math.sin(f.oscillator) * 0.18;
                if (f.y < 0) {
                    f.y = height;
                    f.x = Math.random() * width;
                }
            });

            // Timed Spawner for Flies
            const currentTime = Date.now();
            applyStagePacing(currentTime);
            if (currentTime - lastSpawnTime > spawnInterval) {
                generateFly();
                lastSpawnTime = currentTime;
            }

            // Fly dynamics and collision checking
            let warningActive = false;
            for (let i = flies.length - 1; i >= 0; i--) {
                const fly = flies[i];
                fly.y += fly.speed;
                
                // Flapping wobble
                fly.swayOffset += 0.035;
                fly.xActual = fly.x + Math.sin(fly.swayOffset) * 2.2;

                const dangerLine = height - 70;
                if (fly.y > dangerLine - 55 && fly.y < dangerLine) {
                    warningActive = true;
                }

                // Hit bottom threshold line
                if (fly.y >= dangerLine) {
                    flies.splice(i, 1);
                    lives--;
                    document.getElementById('hud-lives').textContent = lives;
                    triggerScreenFlash();

                    if (lives <= 0) {
                        endGame(false);
                    }
                    continue;
                }
            }

            // Trigger warnings on imminent invasion
            if (warningActive) {
                const banner = document.getElementById('warning-banner');
                banner.classList.remove('opacity-0');
                banner.classList.add('opacity-100');
                if (Math.random() < 0.025) {
                    playSound('warning');
                }
            } else {
                const banner = document.getElementById('warning-banner');
                banner.classList.remove('opacity-100');
                banner.classList.add('opacity-0');
            }

            // Move bubbles & evaluate collisions
            for (let i = bubbles.length - 1; i >= 0; i--) {
                const b = bubbles[i];
                
                if (flies.includes(b.targetFly)) {
                    b.targetX = b.targetFly.xActual || b.targetFly.x;
                    b.targetY = b.targetFly.y;
                }

                const dx = b.targetX - b.currentX;
                const dy = b.targetY - b.currentY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < b.speed) {
                    // Splat!
                    const flyIdx = flies.indexOf(b.targetFly);
                    if (flyIdx !== -1) {
                        const hitFly = flies[flyIdx];
                        
                        // Juicy tropical particle splat
                        spawnSplat(hitFly.xActual || hitFly.x, hitFly.y, hitFly.color);
                        flies.splice(flyIdx, 1);
                        
                        score += 10;
                        document.getElementById('hud-score').textContent = score;
                    }
                    bubbles.splice(i, 1);
                } else {
                    b.currentX += (dx / distance) * b.speed;
                    b.currentY += (dy / distance) * b.speed;
                }
            }

            // Update Splats
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.decay;
                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                }
            }
        }

        // Draw loop
        function drawGame() {
            const width = canvas.width / window.devicePixelRatio;
            const height = canvas.height / window.devicePixelRatio;

            ctx.clearRect(0, 0, width, height);

            // Rich jungle green radial background gradient
            const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width * 0.8);
            bgGrad.addColorStop(0, '#0a3a20');
            bgGrad.addColorStop(1, '#05190e');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            // Draw Fireflies
            fireflies.forEach(f => {
                ctx.fillStyle = `rgba(167, 243, 114, ${f.opacity})`;
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#a7f372';
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // In-canvas typed answer display (replaces external answer bar)
            const displayInput = currentInput || '•';
            ctx.font = `900 ${Math.max(20, 18 * scaleFactor)}px 'Fredoka', sans-serif`;
            const inputTextWidth = ctx.measureText(displayInput).width;
            const inputY = (height - 70) - 28;

            const flashing = inputFlashTimer > 0;
            ctx.fillStyle = flashing ? '#fca5a5' : '#fde047';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,.55)';
            ctx.shadowBlur = 5;
            ctx.fillText(displayInput, width / 2, inputY);
            ctx.shadowBlur = 0;

            if (inputFlashTimer > 0) inputFlashTimer--;

            // Danger boundary: Brambles / Thorny vine line
            const dangerY = height - 70;
            ctx.strokeStyle = '#b45309'; // warm wood-brown branch
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, dangerY);
            ctx.lineTo(width, dangerY);
            ctx.stroke();

            // Tiny leaves / thorns drawn along the warning line
            ctx.fillStyle = '#065f46';
            for (let x = 10; x < width; x += 30) {
                ctx.beginPath();
                ctx.moveTo(x, dangerY);
                ctx.lineTo(x + 5, dangerY - 6);
                ctx.lineTo(x + 10, dangerY);
                ctx.closePath();
                ctx.fill();
            }

            // Draw flies
            flies.forEach(fly => {
                const actualX = fly.xActual || fly.x;
                drawFly(ctx, actualX, fly.y, fly.size, fly.color);

                // Math calculation text on top
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.max(14, 13 * scaleFactor)}px 'Fredoka', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 5;
                ctx.fillText(fly.text, actualX, fly.y);
                ctx.shadowBlur = 0;
            });

            // Draw Bubble projectiles
            bubbles.forEach(b => {
                ctx.shadowBlur = 10;
                ctx.shadowColor = b.color;
                
                // Glowing glass bubble
                ctx.fillStyle = 'rgba(103, 232, 249, 0.4)';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(b.currentX, b.currentY, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Highlight shine dot on bubble
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(b.currentX - 2, b.currentY - 2, 2.2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.shadowBlur = 0;
            });

            // Draw Splat particles
            particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 4;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Draw Jungle frog defender
            drawFrog(ctx, frogX, frogY, 22);

            // Red screen border damage flash
            if (redFlashTimer > 0) {
                ctx.strokeStyle = `rgba(239, 68, 68, ${redFlashTimer / 15})`;
                ctx.lineWidth = 14;
                ctx.strokeRect(0, 0, width, height);
                redFlashTimer--;
            }
        }

        // Active animation tick loop
        function gameLoop() {
            updateGame();
            drawGame();
            requestAnimationFrame(gameLoop);
        }

        // Setup initial conditions
        function startGame() {
            document.getElementById('start-menu').classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                document.getElementById('start-menu').classList.add('hidden');
            }, 300);

            score = 0;
            stage = 1;
            lives = 3;
            flies = [];
            bubbles = [];
            particles = [];
            currentInput = '';

            document.getElementById('hud-score').textContent = '0';
            document.getElementById('hud-stage').textContent = '1';
            document.getElementById('hud-timer').textContent = '00:00';
            document.getElementById('hud-lives').textContent = '3';
            inputFlashTimer = 0;

            gameStartTime = Date.now();
            applyStagePacing(gameStartTime);
            lastSpawnTime = gameStartTime - (spawnInterval - 1000);
            gameActive = true;
            canvas.focus();
            focusKeyboardCapture();
            playSound('level-up');
        }

        // Wrap up execution
        function endGame(victory = false) {
            gameActive = false;
            document.getElementById('final-score').textContent = score;
            document.getElementById('game-over-screen').classList.remove('hidden');
            
            if (victory) {
                document.getElementById('game-over-emoji').textContent = '👑';
                document.getElementById('game-over-title').textContent = 'SWAMP DEFENDED!';
                document.getElementById('game-over-desc').textContent = 'You protected the jungle! Incredible work!';
            } else {
                document.getElementById('game-over-emoji').textContent = '🍇';
                document.getElementById('game-over-title').textContent = 'JUNGLE INVADED';
                document.getElementById('game-over-desc').textContent = 'The pesky flies got past Croaky! Play again to protect the jungle!';
            }
        }

        function restartGame() {
            document.getElementById('game-over-screen').classList.add('hidden');
            document.getElementById('start-menu').classList.remove('hidden', 'scale-95', 'opacity-0');
        }

        // Initiate gameplay animation loop
        window.onload = function() {
            gameLoop();
        }
    </script>
</body>
</html>
