        // Game Constants
        const TOTAL_PUZZLES = 5;
        const TOTAL_SPOTS = 6;
        const MANHOLE_COUNT = 3;
        const INCREMENTS = [1, 10, 100];
        
        // Game State Variables
        let currentPuzzleIndex = 0;
        let timeElapsed = 0;
        let timerInterval = null;
        let isHopping = false;
        
        // Level State
        let sequenceData = [];
        let missingIndices = [];
        let answers = {};
        let activeManhole = -1;

        // DOM Elements
        const screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            result: document.getElementById('result-screen')
        };
        const sequenceContainer = document.getElementById('sequence-container');
        const bunnyWrapper = document.getElementById('bunny-wrapper');
        const bunnySprite = document.getElementById('bunny-sprite');
        const progressText = document.getElementById('progress-text');
        const timerText = document.getElementById('timer-text');
        const btnHop = document.getElementById('btn-hop');

        // Utils
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        function showScreen(screenName) {
            Object.values(screens).forEach(screen => screen.classList.remove('active'));
            screens[screenName].classList.add('active');
        }

        function startGame() {
            currentPuzzleIndex = 0;
            timeElapsed = 0;
            isHopping = false;
            
            showScreen('game');
            startTimer();
            loadNextPuzzle();
        }

        function startTimer() {
            clearInterval(timerInterval);
            timerText.innerText = `0s`;
            timerInterval = setInterval(() => {
                timeElapsed++;
                timerText.innerText = `${timeElapsed}s`;
            }, 1000);
        }

        function generatePuzzleData() {
            // Pick an increment step
            const step = INCREMENTS[Math.floor(Math.random() * INCREMENTS.length)];
            
            // Calculate max starting number to not exceed 1000 after (TOTAL_SPOTS - 1) steps
            let maxStart = 1000 - (step * (TOTAL_SPOTS - 1));
            let startNum = Math.floor(Math.random() * (maxStart - 1)) + 1; 

            sequenceData = [];
            for(let i = 0; i < TOTAL_SPOTS; i++) {
                sequenceData.push(startNum + (i * step));
            }

            // Pick 3 random indices to hide (leave 0 and 1 visible to establish pattern)
            let possibleIndices = [2, 3, 4, 5];
            possibleIndices.sort(() => Math.random() - 0.5);
            missingIndices = possibleIndices.slice(0, MANHOLE_COUNT).sort();
        }

        function loadNextPuzzle() {
            if (currentPuzzleIndex >= TOTAL_PUZZLES) {
                endGame(true);
                return;
            }

            progressText.innerText = `Level ${currentPuzzleIndex + 1}/${TOTAL_PUZZLES}`;
            isHopping = false;
            answers = {};
            
            // Reset bunny visual state
            bunnySprite.className = "text-5xl"; // clear fall/hop animations

            generatePuzzleData();
            activeManhole = missingIndices[0]; // Auto-select first manhole
            
            renderRoad();
            checkReady();

            // Position bunny precisely one hop distance away from the first spot
            setTimeout(updateBunnyPosition, 50);
        }

        function updateBunnyPosition() {
            if (isHopping) return; // Don't interrupt if already moving
            let spot0 = document.getElementById('spot-0');
            let spot1 = document.getElementById('spot-1');
            if (spot0 && spot1) {
                let hopDist = spot1.offsetLeft - spot0.offsetLeft;
                let targetX0 = spot0.offsetLeft + (spot0.offsetWidth / 2) - (bunnyWrapper.offsetWidth / 2);
                let startX = Math.max(4, targetX0 - hopDist);
                bunnyWrapper.style.transition = 'none';
                bunnyWrapper.style.transform = `translateX(${startX}px)`;
            }
        }

        // Add resize listener to keep bunny in place when screen size changes
        window.addEventListener('resize', updateBunnyPosition);

        function renderRoad() {
            // Clear existing spots (keep bunny inside)
            const spots = sequenceContainer.querySelectorAll('.spot-element');
            spots.forEach(el => el.remove());

            for (let i = 0; i < TOTAL_SPOTS; i++) {
                let div = document.createElement('div');
                div.id = `spot-${i}`;
                div.className = 'spot-element seq-item font-black text-base sm:text-lg md:text-2xl';
                
                if (missingIndices.includes(i)) {
                    // Manhole
                    div.classList.add('manhole-spot');
                    div.onclick = () => selectManhole(i);
                    
                    // The dark hole background
                    div.innerHTML = `<div class="absolute inset-0 bg-gray-900 rounded-full border-2 border-gray-700 shadow-inner w-[80%] h-[60%] top-[20%] left-[10%]"></div>`;
                    
                    // The Cover
                    let cover = document.createElement('div');
                    cover.id = `cover-${i}`;
                    cover.className = `absolute inset-0 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full border-[3px] md:border-4 border-gray-300 flex items-center justify-center text-white shadow-lg transition-all duration-200`;
                    
                    if (answers[i] !== undefined && answers[i] !== "") {
                        cover.innerText = answers[i];
                    } else {
                        cover.innerText = '?';
                        cover.classList.add('text-gray-300', 'opacity-90');
                    }
                    div.appendChild(cover);
                } else {
                    // Solid ground / Box
                    div.classList.add('bg-white', 'border-[3px]', 'md:border-4', 'border-gray-400', 'rounded-lg', 'text-gray-800', 'shadow-md');
                    div.innerText = sequenceData[i];
                }
                sequenceContainer.appendChild(div);
            }
            updateManholeStyles();
        }

        function selectManhole(index) {
            if (isHopping) return;
            activeManhole = index;
            updateManholeStyles();
        }

        function nextManhole() {
            if (isHopping) return;
            let currentIndex = missingIndices.indexOf(activeManhole);
            if (currentIndex !== -1) {
                let nextIndex = (currentIndex + 1) % missingIndices.length;
                selectManhole(missingIndices[nextIndex]);
            }
        }

        function updateManholeStyles() {
            missingIndices.forEach(i => {
                let cover = document.getElementById(`cover-${i}`);
                if (!cover) return;
                
                if (i === activeManhole) {
                    cover.classList.add('ring-4', 'ring-yellow-400', 'scale-110', 'z-10');
                    cover.classList.remove('border-gray-300');
                    cover.classList.add('border-yellow-200');
                } else {
                    cover.classList.remove('ring-4', 'ring-yellow-400', 'scale-110', 'z-10', 'border-yellow-200');
                    cover.classList.add('border-gray-300');
                }
            });
        }

        // Numpad Handlers
        function appendNum(num) {
            if (isHopping || activeManhole === -1) return;
            let current = answers[activeManhole] || "";
            if (current.length < 4) {
                answers[activeManhole] = current + num;
                renderRoad();
                checkReady();
            }
        }

        function delNum() {
            if (isHopping || activeManhole === -1) return;
            let current = answers[activeManhole] || "";
            if (current.length > 0) {
                answers[activeManhole] = current.slice(0, -1);
                renderRoad();
                checkReady();
            }
        }

        function checkReady() {
            const filledCount = missingIndices.filter(i => answers[i] && answers[i] !== "").length;
            if (filledCount === MANHOLE_COUNT) {
                btnHop.disabled = false;
                btnHop.classList.remove('opacity-50', 'cursor-not-allowed');
                btnHop.classList.add('hover:bg-green-400', 'active:translate-y-1', 'active:shadow-[0_0px_0_#166534]');
            } else {
                btnHop.disabled = true;
                btnHop.classList.add('opacity-50', 'cursor-not-allowed');
                btnHop.classList.remove('hover:bg-green-400', 'active:translate-y-1', 'active:shadow-[0_0px_0_#166534]');
            }
        }

        // Animation Loop
        async function startHopping() {
            if (isHopping || btnHop.disabled) return;
            isHopping = true;
            
            // Disable UI
            btnHop.disabled = true;
            btnHop.classList.add('opacity-50', 'cursor-not-allowed');
            updateManholeStyles(); // Clears selection rings

            // Recalculate jump distance to ensure precision
            let spot0 = document.getElementById('spot-0');
            let spot1 = document.getElementById('spot-1');
            let hopDist = spot1.offsetLeft - spot0.offsetLeft;
            let targetX0 = spot0.offsetLeft + (spot0.offsetWidth / 2) - (bunnyWrapper.offsetWidth / 2);
            let startX = Math.max(4, targetX0 - hopDist);
            
            bunnyWrapper.style.transition = 'none'; // Snap to start
            bunnyWrapper.style.transform = `translateX(${startX}px)`;
            
            await sleep(50); // Let DOM update
            bunnyWrapper.style.transition = 'transform 0.4s linear'; // Restore transition

            for (let i = 0; i < TOTAL_SPOTS; i++) {
                let spot = document.getElementById(`spot-${i}`);
                
                // Calculate center X of the target spot relative to the container
                let targetX = spot.offsetLeft + (spot.offsetWidth / 2) - (bunnyWrapper.offsetWidth / 2);

                // Move horizontally
                bunnyWrapper.style.transform = `translateX(${targetX}px)`;
                // Trigger hop arc
                bunnySprite.classList.add('animate-hop');

                await sleep(400); // Wait for hop to complete
                bunnySprite.classList.remove('animate-hop');

                // If it's a manhole, verify answer
                if (missingIndices.includes(i)) {
                    let playerAns = parseInt(answers[i]);
                    let cover = document.getElementById(`cover-${i}`);
                    
                    if (playerAns !== sequenceData[i]) {
                        // WRONG: Cover falls, bunny falls
                        cover.style.transition = 'all 0.3s';
                        cover.style.transform = 'rotateX(70deg) translateY(30px)';
                        cover.style.opacity = '0';
                        
                        bunnySprite.classList.add('animate-fall');
                        if (navigator.vibrate) navigator.vibrate([100, 100, 200]);
                        
                        await sleep(600);
                        endGame(false);
                        return; // Halt level
                    } else {
                        // CORRECT: Flash green
                        cover.classList.remove('from-gray-400', 'to-gray-600');
                        cover.classList.add('bg-green-500', 'border-green-300');
                    }
                }
            }

            // Hop exactly one distance off the last block
            let lastSpot = document.getElementById(`spot-${TOTAL_SPOTS - 1}`);
            let targetXLast = lastSpot.offsetLeft + (lastSpot.offsetWidth / 2) - (bunnyWrapper.offsetWidth / 2);
            let endX = targetXLast + hopDist;
            
            bunnyWrapper.style.transform = `translateX(${endX}px)`;
            bunnySprite.classList.add('animate-hop');
            await sleep(400);
            
            currentPuzzleIndex++;
            loadNextPuzzle();
        }

        function endGame(isWin) {
            clearInterval(timerInterval);
            showScreen('result');

            const wrapper = document.querySelector('#result-screen > div');
            const resultIcon = document.getElementById('result-icon');
            const resultTitle = document.getElementById('result-title');
            const resultMessage = document.getElementById('result-message');
            
            if (isWin) {
                wrapper.className = 'bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-[90%] text-center border-8 border-green-400 relative overflow-hidden';
                resultIcon.innerText = '🏆';
                resultTitle.innerText = 'YOU DID IT!';
                resultTitle.className = 'text-4xl md:text-5xl font-black mb-2 relative z-10 text-green-500';
                resultMessage.innerText = 'The bunny safely crossed all streets!';
            } else {
                wrapper.className = 'bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-[90%] text-center border-8 border-rose-500 relative overflow-hidden';
                resultIcon.innerText = '💥';
                resultTitle.innerText = 'OH NO!';
                resultTitle.className = 'text-4xl md:text-5xl font-black mb-2 relative z-10 text-rose-600';
                resultMessage.innerText = 'A wrong number! The bunny fell!';
            }

            document.getElementById('score-correct').innerText = `${currentPuzzleIndex} / ${TOTAL_PUZZLES}`;
            document.getElementById('score-time').innerText = `${timeElapsed}s`;

            // Score: 1000 pts per completed puzzle, minus 5 pts per second
            let rawScore = (currentPuzzleIndex * 1000) - (timeElapsed * 5);
            if (rawScore < 0) rawScore = 0;
            if (currentPuzzleIndex === 0) rawScore = 0;
            
            document.getElementById('score-final').innerText = rawScore;
        }

        function resetGameToStart() {
            showScreen('start');
        }

