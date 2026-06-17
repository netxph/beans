import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Timer, 
  RotateCcw, 
  Play, 
  BookOpen, 
  Check, 
  X, 
  Award, 
  Flame, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Star,
  Sparkles,
  RefreshCw,
  Home,
  Volume2,
  VolumeX,
  Zap,
  HelpCircle
} from 'lucide-react';

// Simple synth-based sound effects generator to avoid external asset dependencies
const playSound = (type, isMuted) => {
  if (isMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Arpeggio sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'error') {
      // Buzz sound
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'click') {
      // Small pop
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'level_up') {
      // High victory tune
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45); // C6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    }
  } catch (e) {
    console.warn("Web Audio API not supported or blocked by browser policies.");
  }
};

export default function App() {
  // Screen routing states: 'WELCOME' | 'GAME' | 'RESULTS' | 'ALL_TABLES'
  const [screen, setScreen] = useState('WELCOME');
  const [sessionLength, setSessionLength] = useState(10); // 5, 10, 15, 20
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  
  // Scoring & Performance States
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [missedQuestions, setMissedQuestions] = useState([]); // tracks { factorA, factorB, userAnswer, correctAnswer }
  
  // Sound / Settings State
  const [isMuted, setIsMuted] = useState(false);

  // Instant Feedback State
  // 'NONE' | 'CORRECT' | 'WRONG'
  const [feedbackState, setFeedbackState] = useState('NONE');
  const [feedbackEmoji, setFeedbackEmoji] = useState('🎉');
  const [feedbackText, setFeedbackText] = useState('');

  // Custom Revision Sheet Drawer
  const [selectedFactorTable, setSelectedFactorTable] = useState(null); // e.g., 7

  // Animation Trigger for keypad press, answer submission
  const [wrongShake, setWrongShake] = useState(false);
  const [correctBounce, setCorrectBounce] = useState(false);

  const timerRef = useRef(null);

  const successEmojis = ['🎉', '🚀', '🌟', '🥳', '🔥', '🏆', '💯', '🦁', '👾', '🌈'];
  const successTexts = [
    "Woohoo! You got it! 🎉",
    "Absolute genius! 🧠⚡",
    "Turbo Speed! 🚀",
    "Unstoppable Math Power! 💪",
    "Golden Star for you! 🌟",
    "Spectacular answer! 🏆",
    "Super-duper correct! 🥳",
    "That was lightning fast! ⚡",
    "Math Wizard status! 🧙‍♂️",
    "Sensational multiplication! 🌈"
  ];

  const errorEmojis = ['🙈', '🧐', '💡', '💭', '🧩', '🌱', '🦾', '🎯', '✨'];
  const errorTexts = [
    "Oopsie! Double check that one! 🙈",
    "So close! You'll nail it next time! 🌱",
    "Almost! Math power charging up! ⚡",
    "Keep going, mistakes make us smarter! 💪",
    "Not quite, but you're learning fast! 🧠",
    "Ah, a tricky puzzle! Try again! 🧩",
    "Let's dust off and keep pushing! 🚀",
    "Almost had it! Keep your chin up! ✨"
  ];

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (screen !== 'GAME' || feedbackState !== 'NONE') return;

      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeyPress('BACK');
      } else if (e.key === 'Enter') {
        handleKeyPress('ENTER');
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleKeyPress('CLEAR');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, feedbackState, userAnswer, currentIndex, questions]);

  const generateQuestions = (length) => {
    const arr = [];
    // Ensure varied multiplication combos.
    // Try to focus mostly on typical school multiplication tables (1 to 10)
    for (let i = 0; i < length; i++) {
      const factorA = Math.floor(Math.random() * 10) + 1; // 1 to 10
      const factorB = Math.floor(Math.random() * 10) + 1; // 1 to 10
      arr.push({
        id: i,
        factorA,
        factorB,
        correctAnswer: factorA * factorB
      });
    }
    return arr;
  };

  const startNewGame = (lengthPreset) => {
    playSound('click', isMuted);
    const len = lengthPreset || sessionLength;
    const generated = generateQuestions(len);
    setQuestions(generated);
    setCurrentIndex(0);
    setUserAnswer('');
    setScore(0);
    setTimer(0);
    setMissedQuestions([]);
    setFeedbackState('NONE');
    setScreen('GAME');
    setIsTimerRunning(true);
  };

  const handleKeyPress = (value) => {
    if (feedbackState !== 'NONE') return; // block typing during immediate transition delay

    playSound('click', isMuted);

    if (value === 'CLEAR') {
      setUserAnswer('');
    } else if (value === 'BACK') {
      setUserAnswer(prev => prev.slice(0, -1));
    } else if (value === 'ENTER') {
      if (userAnswer === '') return;
      submitAnswer();
    } else {
      // Limit to 3 digits (max answer is 10 x 10 = 100)
      if (userAnswer.length < 3) {
        setUserAnswer(prev => prev + value);
      }
    }
  };

  const submitAnswer = () => {
    const currentQuestion = questions[currentIndex];
    const numericAnswer = parseInt(userAnswer, 10);
    const isCorrect = numericAnswer === currentQuestion.correctAnswer;

    if (isCorrect) {
      setScore(prev => prev + 1);
      setFeedbackState('CORRECT');
      setCorrectBounce(true);
      playSound('success', isMuted);
      
      // Randomize congratulatory emoji and speech bubbles
      const randomEmoji = successEmojis[Math.floor(Math.random() * successEmojis.length)];
      const randomText = successTexts[Math.floor(Math.random() * successTexts.length)];
      setFeedbackEmoji(randomEmoji);
      setFeedbackText(randomText);

      setTimeout(() => {
        setCorrectBounce(false);
        advanceGame();
      }, 1500);

    } else {
      setFeedbackState('WRONG');
      setWrongShake(true);
      playSound('error', isMuted);

      // Track the incorrect factors to generate Study Mode custom action plans later
      setMissedQuestions(prev => [...prev, {
        factorA: currentQuestion.factorA,
        factorB: currentQuestion.factorB,
        userAnswer: numericAnswer,
        correctAnswer: currentQuestion.correctAnswer
      }]);

      const randomEmoji = errorEmojis[Math.floor(Math.random() * errorEmojis.length)];
      const randomText = errorTexts[Math.floor(Math.random() * errorTexts.length)];
      setFeedbackEmoji(randomEmoji);
      setFeedbackText(randomText);

      setTimeout(() => {
        setWrongShake(false);
        advanceGame();
      }, 2000);
    }
  };

  const advanceGame = () => {
    setUserAnswer('');
    setFeedbackState('NONE');
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Game Over, trigger results screen
      setIsTimerRunning(false);
      setScreen('RESULTS');
      playSound('level_up', isMuted);
    }
  };

  // Pace evaluation: ideal speed is 1 minute per 5 puzzles (which is 12 seconds per puzzle)
  const calculatePaceStats = () => {
    const totalQuestions = questions.length || 1;
    const timePerPuzzle = timer / totalQuestions;
    
    let title = "Steady Learner 🐢";
    let description = "Keep practicing to speed up your mental math magic!";
    let color = "from-amber-400 to-orange-500";
    let badgeEmoji = "🐢";

    if (timePerPuzzle <= 5) {
      title = "Turbo Math Wizard 🧙‍♂️⚡";
      description = "Mind-boggling speed! You compute faster than a calculator!";
      color = "from-purple-500 to-sky-500";
      badgeEmoji = "⚡";
    } else if (timePerPuzzle <= 12) {
      title = "Speedy Math Explorer 🏎️";
      description = "Amazing tempo! Your calculation skills are incredibly sharp!";
      color = "from-sky-400 to-indigo-500";
      badgeEmoji = "🏎️";
    } else if (timePerPuzzle <= 18) {
      title = "Math Knight 🛡️";
      description = "Solid pacing and awesome calculation precision!";
      color = "from-emerald-400 to-teal-500";
      badgeEmoji = "🛡️";
    }

    return { title, description, color, badgeEmoji, avgTime: timePerPuzzle.toFixed(1) };
  };

  // Extract factors the user struggled with to create the Custom Action Plan
  const getSuggestedRevisionFactors = () => {
    if (missedQuestions.length === 0) return [];
    
    // Count occurrences of each factor from 1 to 10 in missed questions
    const counts = {};
    missedQuestions.forEach(q => {
      counts[q.factorA] = (counts[q.factorA] || 0) + 1;
      counts[q.factorB] = (counts[q.factorB] || 0) + 1;
    });

    // Sort factors by mistake frequency
    const sortedFactors = Object.keys(counts)
      .map(factor => ({
        factor: parseInt(factor, 10),
        count: counts[factor]
      }))
      .sort((a, b) => b.count - a.count);

    return sortedFactors.slice(0, 3); // top 3 most-missed factors for action plan
  };

  // Progressive "Mission" description based on current stage in the session
  const getMissionMessage = () => {
    const progress = (currentIndex / sessionLength) * 100;
    if (progress === 0) return "Mission Starting! Warm up your brain! 🧠";
    if (progress < 40) return "Great rhythm! Keep the streak alive! 🔥";
    if (progress < 70) return "You're halfway through! Focus level maximum! 🎯";
    if (progress < 90) return "Incredible speed! The finish line is super close! 🏆";
    return "Final puzzle! Finish with a brilliant bang! 🚀";
  };

  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="w-screen h-dvh bg-[#EEF2FF] text-slate-800 font-sans select-none antialiased overflow-hidden">
      {/* Fullscreen app container for phone, tablet, and desktop */}
      <div className="w-full h-full bg-[#EEF2FF] overflow-hidden flex flex-col relative">
        {/* Header Ribbon */}
        <header className="bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-500 pt-5 md:pt-6 lg:pt-5 pb-3 px-4 md:px-6 lg:px-8 flex justify-between items-center text-white shadow-md relative z-10">
          <div className="flex items-center space-x-2">
            <span className="bg-white p-1 rounded-lg text-purple-600 shadow-inner">
              <Sparkles className="w-5 h-5 fill-current animate-pulse" />
            </span>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight">
                MULLY
              </h1>
              <p className="text-[10px] text-purple-100 font-medium">Your Interactive Math Companion</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                playSound('click', isMuted);
                setIsMuted(!isMuted);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white shadow-sm"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            {screen !== 'WELCOME' && (
              <button 
                onClick={() => {
                  playSound('click', isMuted);
                  setIsTimerRunning(false);
                  setScreen('WELCOME');
                }}
                className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-bold shadow-md transition-all flex items-center gap-1 text-xs"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
            )}
          </div>
        </header>

        {/* SCREEN 1: WELCOME SCREEN */}
        {screen === 'WELCOME' && (
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 lg:gap-6 justify-between p-4 md:p-6 lg:p-8 overflow-y-auto">
            {/* Mascot Banner */}
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 my-auto lg:my-0">
              {/* Custom SVG Mully Bear Mascot Illustration */}
              <div className="relative w-36 h-36 bg-gradient-to-tr from-purple-200 to-sky-100 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                <svg viewBox="0 0 100 100" className="w-28 h-28 transform hover:scale-115 transition-transform duration-300">
                  {/* Ears */}
                  <circle cx="28" cy="28" r="14" fill="#7C3AED" />
                  <circle cx="28" cy="28" r="8" fill="#F472B6" />
                  <circle cx="72" cy="28" r="14" fill="#7C3AED" />
                  <circle cx="72" cy="28" r="8" fill="#F472B6" />
                  {/* Face Body */}
                  <circle cx="50" cy="55" r="34" fill="#8B5CF6" />
                  {/* Eyes */}
                  <circle cx="38" cy="48" r="5" fill="#1E1B4B" />
                  <circle cx="62" cy="48" r="5" fill="#1E1B4B" />
                  <circle cx="40" cy="46" r="1.5" fill="#FFFFFF" />
                  <circle cx="64" cy="46" r="1.5" fill="#FFFFFF" />
                  {/* Rosy Cheeks */}
                  <circle cx="30" cy="58" r="4.5" fill="#F472B6" opacity="0.8" />
                  <circle cx="70" cy="58" r="4.5" fill="#F472B6" opacity="0.8" />
                  {/* Snout */}
                  <ellipse cx="50" cy="62" rx="14" ry="10" fill="#E0E7FF" />
                  <polygon points="50,58 45,54 55,54" fill="#1E1B4B" />
                  {/* Smiling Mouth */}
                  <path d="M 44,62 Q 50,68 56,62" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  {/* Graduation Hat */}
                  <polygon points="50,15 75,22 50,29 25,22" fill="#38BDF8" />
                  <polygon points="40,26 40,36 60,36 60,26" fill="#0284C7" />
                  <line x1="75" y1="22" x2="75" y2="34" stroke="#FBBF24" strokeWidth="2" />
                  <circle cx="75" cy="34" r="3" fill="#FBBF24" />
                </svg>
                {/* Multiplication Badge */}
                <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-900 text-xs font-black px-3 py-1.5 rounded-2xl shadow-md rotate-12 border-2 border-white animate-bounce flex items-center gap-1">
                  <span>2 × 2 = 4</span>
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-3xl font-extrabold text-purple-950 tracking-tight">Meet Mully! 🐻</h2>
                <p className="text-slate-600 font-medium text-sm px-4">
                  The coolest bear in Math Land! Ready to challenge your brain and conquer the multiplication charts? 🚀
                </p>
              </div>
            </div>

            {/* Game Parameters Section */}
            <div className="bg-white p-5 rounded-3xl shadow-xl border-t-4 border-purple-300 space-y-4 lg:self-center lg:w-full lg:max-w-xl">
              <div className="space-y-2 text-center">
                <span className="text-xs bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full">
                  Step 1: Choose Session Length
                </span>
                <p className="text-xs text-slate-400">How many puzzles do you want to solve today?</p>
              </div>

              {/* Grid of session values */}
              <div className="grid grid-cols-4 gap-3">
                {[5, 10, 15, 20].map((num) => {
                  const isSelected = sessionLength === num;
                  return (
                    <button
                      key={num}
                      onClick={() => {
                        playSound('click', isMuted);
                        setSessionLength(num);
                      }}
                      className={`py-3.5 rounded-2xl font-black text-xl transition-all duration-150 relative ${
                        isSelected
                          ? 'bg-gradient-to-b from-sky-400 to-sky-500 text-white border-b-4 border-sky-600 translate-y-0.5 shadow-inner'
                          : 'bg-indigo-50 text-indigo-900 border-b-4 border-indigo-200 active:translate-y-1 hover:bg-indigo-100'
                      }`}
                    >
                      {num}
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow border border-white">
                          <Check className="w-3 h-3 stroke-[4]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Start Action Button */}
              <button
                onClick={() => startNewGame()}
                className="w-full py-4 bg-gradient-to-b from-amber-400 to-amber-500 text-slate-900 font-black text-xl rounded-2xl shadow-lg border-b-4 border-amber-600 hover:from-amber-300 hover:to-amber-400 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center space-x-2"
              >
                <Play className="w-6 h-6 fill-current text-slate-900" />
                <span>START QUIZ MISSION! 🚀</span>
              </button>

              <button
                onClick={() => {
                  playSound('click', isMuted);
                  setScreen('ALL_TABLES');
                }}
                className="w-full py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-extrabold rounded-xl transition-colors flex items-center justify-center space-x-1 border border-indigo-200"
              >
                <BookOpen className="w-4 h-4" />
                <span>Explore Multiplication Charts (1-10)</span>
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: GAMEPLAY INTERFACE */}
        {screen === 'GAME' && questions.length > 0 && (
          <div className="flex-1 flex flex-col justify-between p-4 md:p-6 overflow-hidden relative lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-4">
            
            {/* Stat Bar & Progress Line */}
            <div className="space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between">
                {/* Level / Mission progression indicators */}
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1 bg-purple-600 text-white font-extrabold text-xs rounded-full shadow-md flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-current text-amber-300 animate-pulse" />
                    <span>PUZZLE {currentIndex + 1} OF {sessionLength}</span>
                  </div>
                </div>

                {/* Instant Digital Timer */}
                <div className="flex items-center space-x-1.5 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-slate-700 font-bold border border-slate-200 shadow-sm">
                  <Timer className="w-4 h-4 text-purple-600 animate-spin-slow" />
                  <span className="font-mono text-sm">{formatTime(timer)}</span>
                </div>
              </div>

              {/* Progression Bar */}
              <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden p-0.5 border border-slate-300/40 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-400 h-full rounded-full transition-all duration-300 flex items-center justify-end px-1"
                  style={{ width: `${((currentIndex + 1) / sessionLength) * 100}%` }}
                >
                  <Star className="w-2.5 h-2.5 text-yellow-300 fill-yellow-300" />
                </div>
              </div>

              {/* Interactive Mission Message Banner */}
              <div className="bg-sky-50 border border-sky-100 p-2 rounded-2xl text-center shadow-xs">
                <p className="text-xs font-bold text-sky-800 tracking-wide">
                  {getMissionMessage()}
                </p>
              </div>
            </div>

            {/* Core Gameboard Multiplier Card */}
            <div className="flex-1 flex flex-col items-center justify-center my-4 lg:my-0">
              <div className={`relative w-full max-w-[340px] bg-white rounded-[32px] p-6 text-center shadow-xl border-4 border-purple-200 flex flex-col items-center transition-all duration-200 ${
                wrongShake ? 'animate-shake border-red-400 bg-red-50' : ''
              } ${
                correctBounce ? 'animate-bounce border-emerald-400 bg-emerald-50' : ''
              }`}>
                {/* Absolute status badges */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-black px-4 py-1.5 rounded-full text-xs shadow-md tracking-wider">
                  MULLY'S CHALLENGE
                </div>

                {/* Question Numbers Visual Presentation */}
                <div className="w-full flex justify-center items-center space-x-4 my-4 select-none">
                  {/* Factor 1 */}
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center text-4xl font-extrabold shadow-lg transform rotate-[-4deg]">
                    {questions[currentIndex]?.factorA}
                  </div>

                  {/* Multiply Operator */}
                  <div className="text-3xl font-black text-slate-400">
                    ×
                  </div>

                  {/* Factor 2 */}
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-sky-500 text-white rounded-2xl flex items-center justify-center text-4xl font-extrabold shadow-lg transform rotate-[4deg]">
                    {questions[currentIndex]?.factorB}
                  </div>

                  {/* Equal sign */}
                  <div className="text-3xl font-black text-slate-400">
                    =
                  </div>
                </div>

                {/* User Input field container */}
                <div className="w-full max-w-[180px] mt-2 relative">
                  <div className={`w-full h-16 rounded-2xl flex items-center justify-center font-mono text-4xl font-black transition-all duration-150 ${
                    userAnswer === '' 
                      ? 'bg-slate-100 text-slate-300 border-2 border-dashed border-slate-300' 
                      : 'bg-purple-100 text-purple-900 border-3 border-purple-500 shadow-inner'
                  }`}>
                    {userAnswer || '?'}
                  </div>
                  {userAnswer !== '' && (
                    <button 
                      onClick={() => handleKeyPress('CLEAR')}
                      className="absolute -right-2 -top-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 active:scale-90 shadow-md transition-all"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  )}
                </div>

                {/* Quick Hint (Optional Help Guide) */}
                <div className="mt-4 flex items-center gap-1 text-slate-400 hover:text-purple-600 transition-colors cursor-pointer text-xs font-semibold">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Type your answer using the keypad below!</span>
                </div>
              </div>
            </div>

            {/* Custom 3D Touch-Keypad Layout */}
            <div className="bg-purple-950 p-4 rounded-[28px] shadow-2xl border-t-4 border-indigo-900 lg:h-full lg:flex lg:items-center">
              <div className="grid grid-cols-3 gap-3 w-full lg:gap-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleKeyPress(num)}
                    className="h-14 lg:h-16 bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-2xl rounded-2xl shadow-[0_5px_0_#CBD5E1] active:shadow-none active:translate-y-[5px] transition-all duration-75 flex items-center justify-center border-b border-slate-200"
                  >
                    {num}
                  </button>
                ))}

                {/* Backspace/Delete Button */}
                <button
                  onClick={() => handleKeyPress('BACK')}
                  className="h-14 lg:h-16 bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xl rounded-2xl shadow-[0_5px_0_#BE123C] active:shadow-none active:translate-y-[5px] transition-all duration-75 flex items-center justify-center"
                  aria-label="Backspace"
                >
                  <span className="text-xl">⌫</span>
                </button>

                {/* Zero Button */}
                <button
                  onClick={() => handleKeyPress('0')}
                  className="h-14 lg:h-16 bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-2xl rounded-2xl shadow-[0_5px_0_#CBD5E1] active:shadow-none active:translate-y-[5px] transition-all duration-75 flex items-center justify-center border-b border-slate-200"
                >
                  0
                </button>

                {/* Enter / Submit Button */}
                <button
                  onClick={() => handleKeyPress('ENTER')}
                  disabled={userAnswer === ''}
                  className={`h-14 lg:h-16 font-extrabold text-xl rounded-2xl transition-all duration-75 flex items-center justify-center ${
                    userAnswer === ''
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed shadow-[0_5px_0_#334155]'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_5px_0_#047857] active:shadow-none active:translate-y-[5px]'
                  }`}
                >
                  <Check className="w-6 h-6 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* FEEDBACK OVERLAY SYSTEM (Immediate Success/Error Alert) */}
            {feedbackState !== 'NONE' && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 transition-opacity duration-300">
                <div className={`p-8 bg-white rounded-[40px] shadow-2xl text-center max-w-xs w-full border-8 transform transition-all duration-300 scale-100 ${
                  feedbackState === 'CORRECT' ? 'border-emerald-400' : 'border-rose-400'
                }`}>
                  {/* Spinning/Jumping Emoji */}
                  <div className={`text-7xl mb-4 select-none inline-block ${
                    feedbackState === 'CORRECT' ? 'animate-bounce' : 'animate-shake'
                  }`}>
                    {feedbackEmoji}
                  </div>

                  <h3 className={`text-2xl font-extrabold mb-2 ${
                    feedbackState === 'CORRECT' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {feedbackState === 'CORRECT' ? 'Woohoo! 🎉' : 'Oopsie! 🙈'}
                  </h3>

                  <p className="text-slate-700 font-bold mb-4">
                    {feedbackText}
                  </p>

                  {/* Show the correct equation detail on mistake */}
                  {feedbackState === 'WRONG' && (
                    <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 mb-2">
                      <p className="text-xs text-rose-500 font-semibold mb-1">Correct Formula:</p>
                      <p className="text-xl font-extrabold text-rose-700">
                        {questions[currentIndex]?.factorA} × {questions[currentIndex]?.factorB} = {questions[currentIndex]?.correctAnswer}
                      </p>
                    </div>
                  )}

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className={`h-full rounded-full transition-all duration-[1500ms] w-full ${
                      feedbackState === 'CORRECT' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCREEN 3: GAME RESULTS & DETAILED ANALYTICS */}
        {screen === 'RESULTS' && (
          <div className="flex-1 flex flex-col justify-between p-4 md:p-6 lg:p-8 overflow-y-auto">
            
            {/* Header Score/Pace Overview Card */}
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-purple-950">Mission Completed! 🏁</h2>
                <p className="text-xs text-slate-500 font-medium">Awesome computational brain exercise!</p>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-3xl shadow-md border-b-4 border-purple-200 flex flex-col items-center justify-center text-center">
                  <Trophy className="w-8 h-8 text-amber-500 mb-1 fill-amber-100" />
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Accuracy</span>
                  <span className="text-2xl font-black text-purple-950">
                    {score} / {questions.length}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    {Math.round((score / questions.length) * 100)}% Success Rate
                  </span>
                </div>

                <div className="bg-white p-4 rounded-3xl shadow-md border-b-4 border-purple-200 flex flex-col items-center justify-center text-center">
                  <Timer className="w-8 h-8 text-indigo-500 mb-1" />
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Time</span>
                  <span className="text-2xl font-black text-purple-950">
                    {formatTime(timer)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    ~{(timer / questions.length).toFixed(1)}s per card
                  </span>
                </div>
              </div>

              {/* Pace Evaluation Card */}
              <div className={`bg-gradient-to-r ${calculatePaceStats().color} text-white p-4 rounded-3xl shadow-lg relative overflow-hidden`}>
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 text-7xl opacity-15">
                  {calculatePaceStats().badgeEmoji}
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2.5 rounded-2xl">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Pace Category</span>
                    <h3 className="text-lg font-black">{calculatePaceStats().title}</h3>
                    <p className="text-xs text-indigo-100">{calculatePaceStats().description}</p>
                  </div>
                </div>
              </div>

              {/* Smart Mistake Analytics: Tallies Specific Factors Missed during Quiz */}
              <div className="bg-white p-4 rounded-3xl shadow-md space-y-3">
                <h4 className="text-sm font-black text-purple-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-purple-600" />
                  <span>Interactive Study Guide</span>
                </h4>

                {missedQuestions.length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl text-center space-y-1">
                    <p className="text-2xl">🏆👑</p>
                    <p className="text-sm font-bold text-emerald-800">Perfect Score Wizard!</p>
                    <p className="text-xs text-emerald-600">You did not miss a single factor. Absolutely outstanding!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      Based on your quiz, you encountered tricky spots on these factors. Click a table block to learn and master it:
                    </p>
                    
                    {/* Action Plan Chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {getSuggestedRevisionFactors().map(({ factor, count }) => (
                        <button
                          key={factor}
                          onClick={() => {
                            playSound('click', isMuted);
                            setSelectedFactorTable(factor);
                          }}
                          className="px-3.5 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-indigo-200 text-indigo-950 font-extrabold text-sm rounded-2xl shadow-xs transition-all active:scale-95 flex items-center justify-between gap-2 flex-1 min-w-[110px]"
                        >
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                            <span>{factor}s Table</span>
                          </span>
                          <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                            {count} {count === 1 ? 'slip' : 'slips'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Study Mode Drawer/Modal for factor details */}
            {selectedFactorTable !== null && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-5 z-50">
                <div className="bg-white w-full max-w-sm rounded-[36px] overflow-hidden shadow-2xl border-4 border-indigo-200 animate-slide-up flex flex-col max-h-[85vh]">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-sky-300" />
                      <h3 className="font-extrabold text-lg">Practice {selectedFactorTable}s Table</h3>
                    </div>
                    <button 
                      onClick={() => {
                        playSound('click', isMuted);
                        setSelectedFactorTable(null);
                      }}
                      className="bg-white/20 p-1.5 rounded-full hover:bg-white/30 text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Table listings scroll zone */}
                  <div className="p-4 overflow-y-auto space-y-1.5 bg-indigo-50">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((multiplier) => {
                      const answer = selectedFactorTable * multiplier;
                      // Highlight if user specifically missed this multiplication pair
                      const wasMissed = missedQuestions.some(
                        mq => (mq.factorA === selectedFactorTable && mq.factorB === multiplier) ||
                              (mq.factorB === selectedFactorTable && mq.factorA === multiplier)
                      );

                      return (
                        <div 
                          key={multiplier} 
                          className={`flex items-center justify-between px-4 py-2 rounded-xl border text-sm font-bold ${
                            wasMissed 
                              ? 'bg-rose-50 border-rose-200 text-rose-950 shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-mono">#{multiplier}</span>
                            <span>{selectedFactorTable} × {multiplier}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {wasMissed && <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse">Tricky Spot!</span>}
                            <span className={`text-base font-extrabold ${wasMissed ? 'text-rose-600' : 'text-purple-600'}`}>{answer}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Modal Action Area */}
                  <div className="p-4 bg-white border-t border-slate-100">
                    <button
                      onClick={() => {
                        playSound('click', isMuted);
                        setSelectedFactorTable(null);
                      }}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-md transition-colors text-center"
                    >
                      GOT IT, I'M READY! 👍
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results Navigation Buttons */}
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-2">
              <button
                onClick={() => startNewGame(sessionLength)}
                className="w-full py-4 bg-gradient-to-b from-sky-400 to-sky-500 text-white font-black text-lg rounded-2xl shadow-md border-b-4 border-sky-600 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
                <span>PLAY AGAIN ({sessionLength} CARDS)</span>
              </button>

              <button
                onClick={() => {
                  playSound('click', isMuted);
                  setScreen('WELCOME');
                }}
                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 font-extrabold rounded-2xl border border-slate-300 transition-colors flex items-center justify-center space-x-1"
              >
                <span>Return to Setup Screen</span>
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 4: EXPLORE ALL TABLES (1 to 10 Study Mode) */}
        {screen === 'ALL_TABLES' && (
          <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    playSound('click', isMuted);
                    setScreen('WELCOME');
                  }}
                  className="px-3 py-1.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs rounded-full shadow border border-indigo-100 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Welcome</span>
                </button>
                <span className="text-xs bg-purple-100 text-purple-700 font-black px-3 py-1 rounded-full">
                  Tables 1 - 10 Chart Explorer
                </span>
              </div>

              {/* Grid selectors for factors 1 to 10 */}
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
                  const isSelected = selectedFactorTable === num;
                  return (
                    <button
                      key={num}
                      onClick={() => {
                        playSound('click', isMuted);
                        setSelectedFactorTable(num);
                      }}
                      className={`py-2 rounded-xl text-center font-black text-sm transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-purple-500 to-indigo-600 text-white shadow-md'
                          : 'bg-white text-indigo-950 border border-indigo-100 hover:bg-indigo-50'
                      }`}
                    >
                      {num}s
                    </button>
                  );
                })}
              </div>

              {/* Show selected table grid */}
              <div className="flex-1 bg-white rounded-3xl p-4 border border-indigo-100 shadow-inner overflow-y-auto">
                {selectedFactorTable === null ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
                    <BookOpen className="w-12 h-12 text-indigo-300 animate-bounce" />
                    <p className="font-extrabold text-indigo-950">Select a factor above!</p>
                    <p className="text-xs text-slate-400">Tap any button from 1s to 10s to see the full multiplication table layout.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-50">
                      <h4 className="font-black text-purple-900 text-base">{selectedFactorTable} Times Table Chart</h4>
                      <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">Fast Reference</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((multiplier) => {
                        const product = selectedFactorTable * multiplier;
                        return (
                          <div 
                            key={multiplier} 
                            className="flex justify-between items-center px-4 py-2 bg-gradient-to-r from-purple-50/40 to-indigo-50/40 hover:from-purple-50 hover:to-indigo-50 rounded-xl border border-slate-100 text-sm font-bold transition-colors"
                          >
                            <span className="text-slate-600">
                              {selectedFactorTable} <span className="text-indigo-400">×</span> {multiplier}
                            </span>
                            <span className="text-purple-700 font-extrabold text-base">{product}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Play Action */}
            <div className="mt-4">
              <button
                onClick={() => startNewGame()}
                className="w-full py-3.5 bg-gradient-to-b from-amber-400 to-amber-500 text-slate-900 font-black text-lg rounded-2xl shadow-lg border-b-4 border-amber-600 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center space-x-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>LAUNCH PRACTICE QUIZ! 🚀</span>
              </button>
            </div>
          </div>
        )}


      </div>

      {/* Tailwind Specific Animation Support Injector */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
