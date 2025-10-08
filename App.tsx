
import React, { useState, useMemo, useCallback, useEffect, createContext, useContext } from 'react';
import { CheckCircle, XCircle, RefreshCw, Pencil, Home, PaintBrush, TrendingUp, ArrowDownUp, Repeat, Plus, ClipboardList, Hash, BookOpen, Blocks, Shuffle, Calculator, Backspace } from './components/Icons';

// --- VERİ MODELLERİ VE OLUŞTURUCULAR ---

type Color = 'blue' | 'red';
type UserAnswers<T> = Record<string, T>;
type Feedback = Record<string, 'correct' | 'incorrect' | 'missed'>;
type DigitPlace = 'hundreds' | 'tens' | 'ones';

// --- Basamak Değeri Boyama Oyunu Verileri ---
type SingleColoringRule = { digitPlace: DigitPlace; targets: { blue: number; red: number; } };
type MixedColoringRule = {
    blue: { digitPlace: DigitPlace; target: number; };
    red: { digitPlace: DigitPlace; target: number; };
};
type ColoringGameState = {
    numbers: number[];
} & ({ mode: 'single'; rule: SingleColoringRule } | { mode: 'mixed'; rule: MixedColoringRule });

const generateColoringGameState = (mode: DigitPlace | 'mixed'): ColoringGameState => {
  const numbers: number[] = [];
  while (numbers.length < 20) {
    const num = Math.floor(Math.random() * 900) + 100;
    if (!numbers.includes(num)) numbers.push(num);
  }

  if (mode !== 'mixed') {
    const digits = Array.from({ length: 10 }, (_, i) => i);
    const shuffledDigits = digits.sort(() => 0.5 - Math.random());
    const blueTarget = shuffledDigits[0];
    const redTarget = shuffledDigits[1];
    return {
      numbers,
      mode: 'single',
      rule: { digitPlace: mode, targets: { blue: blueTarget, red: redTarget } }
    };
  } else { // Mixed mode
    const digitPlaces: DigitPlace[] = ['hundreds', 'tens', 'ones'];
    const shuffledPlaces = [...digitPlaces].sort(() => 0.5 - Math.random());
    const bluePlace = shuffledPlaces[0];
    const redPlace = shuffledPlaces[1];

    const digits = Array.from({ length: 10 }, (_, i) => i);
    const shuffledDigits = digits.sort(() => 0.5 - Math.random());
    const blueTarget = shuffledDigits[0];
    const redTarget = shuffledDigits[1];

    return {
      numbers,
      mode: 'mixed',
      rule: {
        blue: { digitPlace: bluePlace, target: blueTarget },
        red: { digitPlace: redPlace, target: redTarget }
      }
    };
  }
};


// --- Sayı Yuvarlama Oyunu Verileri ---
const generateRoundingGameState = (): { numbers: number[]; target: number; nearest: 'ten' | 'hundred' } => {
    const nearest = Math.random() < 0.5 ? 'ten' : 'hundred';
    const target = nearest === 'ten' 
        ? (Math.floor(Math.random() * 80) + 10) * 10 // 100-890 arası 10'un katı
        : (Math.floor(Math.random() * 8) + 1) * 100; // 100-800 arası 100'ün katı
    
    const correctNumbers = new Set<number>();
    while(correctNumbers.size < 5){
        const range = nearest === 'ten' ? 4 : 49;
        const num = target + Math.floor(Math.random() * (range * 2 + 1)) - range;
        if(Math.round(num / (nearest === 'ten' ? 10 : 100)) * (nearest === 'ten' ? 10 : 100) === target && num !== target){
            correctNumbers.add(num);
        }
    }

    const otherNumbers = new Set<number>();
    while(otherNumbers.size < 15) {
        const num = Math.floor(Math.random() * 900) + 100;
        if(Math.round(num / (nearest === 'ten' ? 10 : 100)) * (nearest === 'ten' ? 10 : 100) !== target){
            otherNumbers.add(num);
        }
    }
    const numbers = [...correctNumbers, ...otherNumbers].sort(() => 0.5 - Math.random());
    return { numbers, target, nearest };
};

// --- Sayı Sıralama Oyunu Verileri ---
const generateSortingGameState = (): { numbers: number[]; order: 'asc' | 'desc' } => {
    const numbers = new Set<number>();
    while(numbers.size < 5) {
        numbers.add(Math.floor(Math.random() * 900) + 100);
    }
    const order = Math.random() < 0.5 ? 'asc' : 'desc';
    return { numbers: Array.from(numbers), order };
};

// --- Ritmik Sayma Oyunu Verileri ---
const generateRhythmicGameState = (): { step: number; start: number } => {
    const step = Math.floor(Math.random() * 8) + 2; // 2-9 arası
    const start = Math.floor(Math.random() * step) + 1;
    return { step, start };
};

// --- Toplama ile Sayı Bulma Oyunu Verileri ---
const generateAdditionQuestion = (): { text: string; answer: number } => {
    const answer = Math.floor(Math.random() * 899) + 100; // 100-998 arası
    const hundreds = Math.floor(answer / 100);
    const tens = Math.floor((answer % 100) / 10);
    const ones = answer % 10;

    const parts: string[] = [];
    if (hundreds > 0) parts.push(...Array(hundreds).fill('100'));
    if (tens > 0) parts.push(...Array(tens).fill('10'));
    if (ones > 0) parts.push(...Array(ones).fill('1'));
    
    const text = parts.join(' + ');
    return { text, answer };
};
const generateAdditionGameData = (count = 4) => Array.from({length: count}, generateAdditionQuestion);

// --- Basamak Değeri ile Sayı Bulma Oyunu Verileri ---
const placeValueGameData = [
    { text: '3 yüzlük + 4 onluk + 0 birlik', answer: 340 },
    { text: '5 yüzlük + 0 onluk + 1 birlik', answer: 501 },
    { text: '8 yüzlük + 0 onluk + 0 birlik', answer: 800 },
    { text: '9 yüzlük + 5 onluk + 2 birlik', answer: 952 },
].sort(() => 0.5 - Math.random());


// --- Tek-Çift Sayılar Oyunu Verileri ---
type OddEvenQuestion = 
    | { type: 'single'; number: number }
    | { type: 'sum'; numbers: [number, number] };

const generateOddEvenGameState = (type: 'single' | 'sum', count = 15): OddEvenQuestion[] => {
    const questions: OddEvenQuestion[] = [];
    for (let i = 0; i < count; i++) {
        if (type === 'single') {
            questions.push({ type: 'single', number: Math.floor(Math.random() * 999) + 1 });
        } else { // type === 'sum'
            questions.push({
                type: 'sum',
                numbers: [
                    Math.floor(Math.random() * 499) + 1,
                    Math.floor(Math.random() * 499) + 1
                ]
            });
        }
    }
    return questions;
};

// --- Romen Rakamları Oyunu Verileri ---
const toRoman = (num: number): string => {
    if (num < 1 || num > 399) return "Sınır dışı"; // Basitlik için sınırı 399'da tutalım
    const romanMap: [number, string][] = [
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'],
        [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let result = '';
    for (const [value, symbol] of romanMap) {
        while (num >= value) {
            result += symbol;
            num -= value;
        }
    }
    return result;
};

const fromRoman = (roman: string): number => {
    const romanMap: { [key: string]: number } = { I: 1, V: 5, X: 10, L: 50, C: 100 };
    let result = 0;
    for (let i = 0; i < roman.length; i++) {
        const current = romanMap[roman[i]];
        const next = i + 1 < roman.length ? romanMap[roman[i + 1]] : 0;
        if (current < next) {
            result -= current;
        } else {
            result += current;
        }
    }
    return result;
};

type RomanQuestion = {
    question: string | { num1: string | number; num2: string | number };
    options: (string | number)[];
    answer: string | number;
};

const generateRomanGameQuestions = (activity: 'activity1' | 'activity2' | 'activity3', count = 10): RomanQuestion[] => {
    const questions: RomanQuestion[] = [];
    const usedNumbers = new Set<number>();

    while (questions.length < count) {
        const num = Math.floor(Math.random() * 100) + 1;
        if (usedNumbers.has(num)) continue;
        usedNumbers.add(num);

        let question: RomanQuestion;
        if (activity === 'activity1') { // Roman to Number
            const options = new Set<number>([num]);
            while (options.size < 3) {
                const wrongNum = Math.max(1, num + Math.floor(Math.random() * 10) - 5);
                if (wrongNum !== num) options.add(wrongNum);
            }
            question = {
                question: toRoman(num),
                answer: num,
                options: Array.from(options).sort(() => 0.5 - Math.random()),
            };
        } else if (activity === 'activity2') { // Number to Roman
            const options = new Set<string>([toRoman(num)]);
            while (options.size < 3) {
                const wrongNum = Math.max(1, num + Math.floor(Math.random() * 10) - 5);
                if (wrongNum !== num) options.add(toRoman(wrongNum));
            }
            question = {
                question: String(num),
                answer: toRoman(num),
                options: Array.from(options).sort(() => 0.5 - Math.random()),
            };
        } else { // activity3: Addition
            const num2 = Math.floor(Math.random() * 50) + 1;
            const sum = num + num2;
            const displayNum1 = Math.random() < 0.5 ? num : toRoman(num);
            const displayNum2 = Math.random() < 0.5 ? num2 : toRoman(num2);
            
            const options = new Set<string|number>([sum, toRoman(sum)]);
            while (options.size < 4) { // 3 seçenek + doğru cevap (2 formatta olabilir)
                 const wrongSum = Math.max(1, sum + Math.floor(Math.random() * 10) - 5);
                 if(wrongSum !== sum) {
                     options.add(Math.random() < 0.5 ? wrongSum : toRoman(wrongSum));
                 }
            }
            const finalOptions = Array.from(options).filter(o => String(o) !== String(sum) && String(o) !== toRoman(sum));
            const shuffledOptions = finalOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
            const answerFormat = Math.random() < 0.5 ? sum : toRoman(sum);
            shuffledOptions.push(answerFormat);
            
            question = {
                question: { num1: displayNum1, num2: displayNum2 },
                answer: sum, // Cevabı her zaman sayı olarak tut, karşılaştırma için
                options: shuffledOptions.sort(() => 0.5 - Math.random()),
            };
        }
        questions.push(question);
    }
    return questions;
};

// --- SAYI ÇÖZÜMLEME OYUNU VERİLERİ ---
const generateDecompositionGameData = (count = 5) => {
    const questions: { number: number; answer: { hundreds: number; tens: number; ones: number; } }[] = [];
    const usedNumbers = new Set<number>();
    while (questions.length < count) {
        const num = Math.floor(Math.random() * 900) + 100; // 100-999
        if (usedNumbers.has(num)) continue;
        usedNumbers.add(num);
        questions.push({
            number: num,
            answer: {
                hundreds: Math.floor(num / 100),
                tens: Math.floor((num % 100) / 10),
                ones: num % 10,
            }
        });
    }
    return questions;
};

// --- ELDESİZ TOPLAMA OYUNU VERİLERİ ---
const generateAdditionWithoutCarryGameState = (count = 5): { num1: number; num2: number; answer: number }[] => {
    const questions: { num1: number; num2: number; answer: number }[] = [];
    const usedPairs = new Set<string>();

    while (questions.length < count) {
        const o1 = Math.floor(Math.random() * 10);
        const o2 = Math.floor(Math.random() * (10 - o1));
        
        const t1 = Math.floor(Math.random() * 10);
        const t2 = Math.floor(Math.random() * (10 - t1));
        
        const h1 = Math.floor(Math.random() * 8) + 1; // 1-8
        const h2 = Math.floor(Math.random() * (9 - h1)) + 1; 
        
        const num1 = h1 * 100 + t1 * 10 + o1;
        const num2 = h2 * 100 + t2 * 10 + o2;
        const pairKey = `${num1}-${num2}`;

        if (!usedPairs.has(pairKey) && (num1 + num2 < 1000)) {
            questions.push({ num1, num2, answer: num1 + num2 });
            usedPairs.add(pairKey);
        }
    }
    return questions;
};

// --- ELDELİ TOPLAMA OYUNU VERİLERİ ---
const generateAdditionWithCarryGameState = (count = 5): { num1: number; num2: number; answer: number }[] => {
    const questions: { num1: number; num2: number; answer: number }[] = [];
    const usedPairs = new Set<string>();

    while (questions.length < count) {
        const o1 = Math.floor(Math.random() * 10);
        const o2 = Math.floor(Math.random() * 10);
        
        const t1 = Math.floor(Math.random() * 10);
        const t2 = Math.floor(Math.random() * 10);
        
        const h1 = Math.floor(Math.random() * 9) + 1; // 1-9
        const h2 = Math.floor(Math.random() * 9) + 1; // 1-9
        
        const num1 = h1 * 100 + t1 * 10 + o1;
        const num2 = h2 * 100 + t2 * 10 + o2;
        
        const carries = (o1 + o2 >= 10) || (t1 + t2 >= 10) || (h1 + h2 >= 10);
        const pairKey = `${Math.min(num1, num2)}-${Math.max(num1, num2)}`;

        if (carries && !usedPairs.has(pairKey)) {
            questions.push({ num1, num2, answer: num1 + num2 });
            usedPairs.add(pairKey);
        }
    }
    return questions;
};

// --- TOPLAMA PROBLEMLERİ OYUNU VERİLERİ ---
const generateAdditionProblemGameState = (count = 5): { text: string; answer: number }[] => {
    const questions: { text: string; answer: number }[] = [];
    const names = ["Ali", "Ayşe", "Efe", "Zeynep", "Can", "Elif"];
    const objectsPlural = ["elması", "cevizi", "kalemi", "kitabı", "bilyesi", "balonu"];
    const objectsSingular = ["elma", "ceviz", "kalem", "kitap", "bilye", "balon"];
    
    while (questions.length < count) {
        const nameIndex = Math.floor(Math.random() * names.length);
        const name = names[nameIndex];
        const objectIndex = Math.floor(Math.random() * objectsPlural.length);
        const objectP = objectsPlural[objectIndex];
        const objectS = objectsSingular[objectIndex];

        const num1 = Math.floor(Math.random() * 45) + 5; // 5-49
        const num2 = Math.floor(Math.random() * 45) + 5; // 5-49
        const answer = num1 + num2;

        const templates = [
            `${name}'nin ${num1} tane ${objectP} vardı. Arkadaşı ona ${num2} tane daha verdi. ${name}'nin toplam kaç tane ${objectP} oldu?`,
            `Bir sepette ${num1} ${objectS} vardı. Sepete ${num2} ${objectS} daha eklendi. Sepette toplam kaç ${objectS} oldu?`,
            `${name}, pazardan ${num1} tane ${objectS} aldı. Annesi de ${num2} tane aldı. İkisinin toplam kaç ${objectS} oldu?`
        ];
        
        const text = templates[Math.floor(Math.random() * templates.length)];
        
        if (!questions.some(q => q.answer === answer)) {
            questions.push({ text, answer });
        }
    }
    return questions;
};


// --- YARDIMCI BİLEŞENLER ---

const GameButton: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    icon: React.ReactNode;
    colorClasses: string;
}> = ({ onClick, children, icon, colorClasses }) => {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center text-center w-full p-4 space-y-2 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${colorClasses}`}
        >
            <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center bg-white/25 rounded-full text-white">
                {React.cloneElement(icon as React.ReactElement, { className: 'w-8 h-8' })}
            </div>
            <span className="text-base font-semibold text-white">{children}</span>
        </button>
    );
};


const ControlButtons: React.FC<{ onCheck: () => void; onNew: () => void; onMenu: () => void; isChecking: boolean; }> = ({ onCheck, onNew, onMenu, isChecking }) => {
    return (
        <div className="flex flex-wrap justify-center gap-4 mt-6">
            <button onClick={onCheck} disabled={isChecking} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-green-500 rounded-lg shadow-md hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75">
                <CheckCircle className="w-5 h-5" /> Kontrol Et
            </button>
            <button onClick={onNew} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                <RefreshCw className="w-5 h-5" /> Yeni Oyun
            </button>
            <button onClick={onMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
                <Home className="w-5 h-5" /> Ana Menü
            </button>
        </div>
    );
};

// --- OYUN BİLEŞENLERİ ---

const ColoringGame: React.FC<{ onBackToMenu: () => void }> = ({ onBackToMenu }) => {
  const [phase, setPhase] = useState<'selection' | 'playing'>('selection');
  const [gameState, setGameState] = useState<ColoringGameState | null>(null);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers<Color>>({});
  const [feedback, setFeedback] = useState<Feedback>({});
  const [isChecking, setIsChecking] = useState(false);

  const handleStartGame = (mode: DigitPlace | 'mixed') => {
    setGameState(generateColoringGameState(mode));
    setSelectedColor(null);
    setUserAnswers({});
    setFeedback({});
    setIsChecking(false);
    setPhase('playing');
  };

  const handleNewGame = () => {
    if (gameState) {
      handleStartGame(gameState.mode === 'single' ? gameState.rule.digitPlace : 'mixed');
    }
  };

  const handleBackToSelection = () => {
    setPhase('selection');
    setGameState(null);
  };

  const getCorrectColor = useCallback((num: number): Color | null => {
    if (!gameState) return null;
    
    const getDigit = (n: number, place: DigitPlace) => {
        if (place === 'hundreds') return Math.floor(n / 100);
        if (place === 'tens') return Math.floor((n % 100) / 10);
        return n % 10;
    };

    if (gameState.mode === 'single') {
        const { digitPlace, targets } = gameState.rule;
        const digit = getDigit(num, digitPlace);
        if (digit === targets.blue) return 'blue';
        if (digit === targets.red) return 'red';
    } else { // mixed mode
        const { blue, red } = gameState.rule;
        // Mavi önceliklidir
        if (getDigit(num, blue.digitPlace) === blue.target) return 'blue';
        if (getDigit(num, red.digitPlace) === red.target) return 'red';
    }
    return null;
  }, [gameState]);

  const handleCellClick = (num: number) => {
    if (isChecking || !selectedColor) return;
    setUserAnswers(prev => ({ ...prev, [num]: prev[num] === selectedColor ? undefined : selectedColor }));
  };

  const handleCheckAnswers = () => {
    if (!gameState) return;
    setIsChecking(true);
    const newFeedback: Feedback = {};
    gameState.numbers.forEach(num => {
      const correctColor = getCorrectColor(num);
      const userAnswer = userAnswers[num];
      if (correctColor === userAnswer) newFeedback[num] = 'correct';
      else if (userAnswer) newFeedback[num] = 'incorrect';
      else if (correctColor) newFeedback[num] = 'missed';
    });
    setFeedback(newFeedback);
  };

  const handleColorSelect = (color: Color) => {
    setSelectedColor(color);
  };

  const scoreText = useMemo(() => {
    if (!isChecking || !gameState) return null;
    const correctCount = Object.values(feedback).filter(f => f === 'correct').length;
    const total = gameState.numbers.filter(num => getCorrectColor(num)).length;
    return `Skor: ${correctCount} / ${total}`;
  }, [isChecking, feedback, gameState, getCorrectColor]);

  if (phase === 'selection') {
    return (
      <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-slate-800">Basamak Değeri Boyama</h1>
          <p className="text-slate-600 mt-2">Hangi basamakla oynamak istersin?</p>
        </header>
        <div className="flex flex-col space-y-4">
          <button onClick={() => handleStartGame('hundreds')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-red-50 hover:border-red-400">
            <span className="text-2xl font-bold text-red-500 w-12 text-center">100</span>
            <div>
              <h2 className="text-lg text-slate-800">Yüzler Basamağı</h2>
              <p className="text-sm text-slate-500">Sayıların yüzler basamağına odaklan.</p>
            </div>
          </button>
          <button onClick={() => handleStartGame('tens')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-400">
            <span className="text-2xl font-bold text-blue-500 w-12 text-center">10</span>
            <div>
              <h2 className="text-lg text-slate-800">Onlar Basamağı</h2>
              <p className="text-sm text-slate-500">Sayıların onlar basamağına odaklan.</p>
            </div>
          </button>
          <button onClick={() => handleStartGame('ones')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-green-50 hover:border-green-400">
            <span className="text-2xl font-bold text-green-500 w-12 text-center">1</span>
            <div>
              <h2 className="text-lg text-slate-800">Birler Basamağı</h2>
              <p className="text-sm text-slate-500">Sayıların birler basamağına odaklan.</p>
            </div>
          </button>
          <button onClick={() => handleStartGame('mixed')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-purple-50 hover:border-purple-400">
            <span className="w-12 text-center text-purple-500">
                <Shuffle className="w-8 h-8 mx-auto" />
            </span>
            <div>
              <h2 className="text-lg text-slate-800">Karışık Alıştırma</h2>
              <p className="text-sm text-slate-500">Farklı basamak değerleri ile çalış.</p>
            </div>
          </button>
        </div>
        <div className="flex justify-center pt-4">
          <button onClick={onBackToMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
            <Home className="w-5 h-5" /> Ana Menü
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const digitPlaceNames = { hundreds: 'Yüzler', tens: 'Onlar', ones: 'Birler' };
  const instructionText = (() => {
      if (gameState.mode === 'single') {
        const { digitPlace, targets } = gameState.rule;
        return `${digitPlaceNames[digitPlace]} basamağı ${targets.blue} olanları maviye, ${targets.red} olanları kırmızıya boya.`;
      } else {
        const { blue, red } = gameState.rule;
        return `${digitPlaceNames[blue.digitPlace]} basamağı ${blue.target} olanları maviye, ${digitPlaceNames[red.digitPlace]} basamağı ${red.target} olanları kırmızıya boya.`;
      }
  })();


  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">Basamak Değeri Boyama</h1>
        <p className="text-slate-600 mt-2">{instructionText}</p>
      </header>
      <div className="flex justify-center gap-4">
        <button onClick={() => handleColorSelect('blue')} className={`w-16 h-16 rounded-full transition-all duration-200 focus:outline-none ${selectedColor === 'blue' ? 'ring-4 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'} bg-blue-500`} aria-label="Mavi" />
        <button onClick={() => handleColorSelect('red')} className={`w-16 h-16 rounded-full transition-all duration-200 focus:outline-none ${selectedColor === 'red' ? 'ring-4 ring-offset-2 ring-red-500 scale-110' : 'hover:scale-105'} bg-red-500`} aria-label="Kırmızı" />
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 text-center text-slate-800">
        {gameState.numbers.map(num => {
          const userAnswer = userAnswers[num];
          const feedbackStatus = feedback[num];
          let cellClass = `p-2 rounded-lg cursor-pointer transition-all duration-200 font-semibold text-lg flex items-center justify-center aspect-square `;
          if (isChecking) {
            if (feedbackStatus === 'correct') cellClass += userAnswer === 'blue' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white';
            else if (feedbackStatus === 'incorrect') cellClass += 'bg-slate-200 text-red-500 line-through';
            else if (feedbackStatus === 'missed') cellClass += getCorrectColor(num) === 'blue' ? 'border-2 border-blue-500 text-blue-500' : 'border-2 border-red-500 text-red-500';
            else cellClass += 'bg-slate-100 text-slate-500';
          } else {
            if (userAnswer === 'blue') cellClass += 'bg-blue-500 text-white scale-105';
            else if (userAnswer === 'red') cellClass += 'bg-red-500 text-white scale-105';
            else cellClass += 'bg-slate-200 hover:bg-slate-300';
          }
          return <div key={num} onClick={() => handleCellClick(num)} className={cellClass}>{num}</div>;
        })}
      </div>
      {isChecking && <p className="text-center text-xl font-bold text-slate-700 animate-pop-in">{scoreText}</p>}
      <div className="flex flex-wrap justify-center gap-4 mt-6">
        <button onClick={handleCheckAnswers} disabled={isChecking} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-green-500 rounded-lg shadow-md hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75">
          <CheckCircle className="w-5 h-5" /> Kontrol Et
        </button>
        <button onClick={handleNewGame} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
          <RefreshCw className="w-5 h-5" /> Yeni Oyun
        </button>
        <button onClick={handleBackToSelection} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-yellow-500 rounded-lg shadow-md hover:bg-yellow-600 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75">
          <Pencil className="w-5 h-5" /> Basamak Değiştir
        </button>
        <button onClick={onBackToMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
          <Home className="w-5 h-5" /> Ana Menü
        </button>
      </div>
    </div>
  );
};

const RoundingGame: React.FC<{ onBackToMenu: () => void }> = ({ onBackToMenu }) => {
    const [gameState, setGameState] = useState(generateRoundingGameState);
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
    const [feedback, setFeedback] = useState<Feedback>({});
    const [isChecking, setIsChecking] = useState(false);

    const isCorrect = useCallback((num: number) => {
        const divisor = gameState.nearest === 'ten' ? 10 : 100;
        return Math.round(num / divisor) * divisor === gameState.target;
    }, [gameState]);

    const handleCellClick = (num: number) => {
        if (isChecking) return;
        setSelectedNumbers(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
    };

    const handleCheckAnswers = () => {
        setIsChecking(true);
        const newFeedback: Feedback = {};
        gameState.numbers.forEach(num => {
            const shouldBeSelected = isCorrect(num);
            const wasSelected = selectedNumbers.includes(num);
            if (shouldBeSelected && wasSelected) newFeedback[num] = 'correct';
            else if (!shouldBeSelected && wasSelected) newFeedback[num] = 'incorrect';
            else if (shouldBeSelected && !wasSelected) newFeedback[num] = 'missed';
        });
        setFeedback(newFeedback);
    };

    const handleNewGame = () => {
        setGameState(generateRoundingGameState());
        setSelectedNumbers([]);
        setFeedback({});
        setIsChecking(false);
    };
    
    const scoreText = useMemo(() => {
        if (!isChecking) return null;
        const correctCount = Object.values(feedback).filter(f => f === 'correct').length;
        const total = gameState.numbers.filter(isCorrect).length;
        return `Skor: ${correctCount} / ${total}`;
    }, [isChecking, feedback, gameState, isCorrect]);

    const instructionText = `Sayıları en yakın ${gameState.nearest === 'ten' ? 'onluğa' : 'yüzlüğe'} yuvarladığınızda sonucu ${gameState.target} olanları seçin.`;

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-slate-800">Sayı Yuvarlama Boyama</h1>
                <p className="text-slate-600 mt-2">{instructionText}</p>
            </header>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 text-center text-slate-800">
                {gameState.numbers.map(num => {
                    const isSelected = selectedNumbers.includes(num);
                    const feedbackStatus = feedback[num];
                    let cellClass = `p-2 rounded-lg cursor-pointer transition-all duration-200 font-semibold text-lg flex items-center justify-center aspect-square `;
                    if (isChecking) {
                        if (feedbackStatus === 'correct') cellClass += 'bg-green-500 text-white';
                        else if (feedbackStatus === 'incorrect') cellClass += 'bg-red-500 text-white line-through';
                        else if (feedbackStatus === 'missed') cellClass += 'border-2 border-yellow-500 text-yellow-600';
                        else cellClass += 'bg-slate-100 text-slate-500';
                    } else {
                        cellClass += isSelected ? 'bg-blue-500 text-white scale-105' : 'bg-slate-200 hover:bg-slate-300';
                    }
                    return <div key={num} onClick={() => handleCellClick(num)} className={cellClass}>{num}</div>;
                })}
            </div>
            {isChecking && <p className="text-center text-xl font-bold text-slate-700 animate-pop-in">{scoreText}</p>}
            <ControlButtons onCheck={handleCheckAnswers} onNew={handleNewGame} onMenu={onBackToMenu} isChecking={isChecking} />
        </div>
    );
};

const SortingGame: React.FC<{ onBackToMenu: () => void }> = ({ onBackToMenu }) => {
    const [gameState, setGameState] = useState(generateSortingGameState);
    const [unsortedNumbers, setUnsortedNumbers] = useState<number[]>([]);
    const [sortedNumbers, setSortedNumbers] = useState<(number | null)[]>(Array(5).fill(null));
    const [feedback, setFeedback] = useState<Record<number, 'correct' | 'incorrect'>>({});
    const [isChecking, setIsChecking] = useState(false);
    const [draggedItem, setDraggedItem] = useState<{ type: 'unsorted' | 'sorted'; num: number; index?: number } | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
    const [pressedNumber, setPressedNumber] = useState<number | null>(null);
    const [justDroppedIndex, setJustDroppedIndex] = useState<number | null>(null);

    const numberColorMap = useMemo(() => {
        const colors = [
            'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
            'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'
        ];
        const shuffledColors = [...colors].sort(() => 0.5 - Math.random());
        const colorMap: Record<number, string> = {};
        gameState.numbers.forEach((num, index) => {
            colorMap[num] = shuffledColors[index % shuffledColors.length];
        });
        return colorMap;
    }, [gameState.numbers]);

    useEffect(() => {
        setUnsortedNumbers([...gameState.numbers]);
        setSortedNumbers(Array(5).fill(null));
        setFeedback({});
        setIsChecking(false);
    }, [gameState]);

    const handlePressStart = (num: number) => {
        if (!isChecking) setPressedNumber(num);
    };

    const handlePressEnd = () => {
        setPressedNumber(null);
    };

    const handleDragStart = (e: React.DragEvent, payload: { type: 'unsorted' | 'sorted'; num: number; index?: number }) => {
        if (isChecking) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'move';
        setDraggedItem(payload);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        handlePressEnd();
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };
    
    const handleDragEnter = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if(!isChecking) setDragOverTarget(targetId);
    }
    
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverTarget(null);
    }

    const handleDrop = (e: React.DragEvent, targetType: 'unsorted' | 'sorted', targetIndex?: number) => {
        e.preventDefault();
        setDragOverTarget(null);
        if (isChecking) return;

        try {
            const payload = JSON.parse(e.dataTransfer.getData('text/plain'));
            const { type: sourceType, num: draggedNum, index: sourceIndex } = payload;
            
            let newUnsorted = [...unsortedNumbers];
            let newSorted = [...sortedNumbers];

            const triggerAnimation = (index: number) => {
                setJustDroppedIndex(index);
                setTimeout(() => setJustDroppedIndex(null), 400); // Duration of popIn animation
            };

            if (sourceType === 'unsorted' && targetType === 'sorted' && targetIndex !== undefined) {
                const numInTarget = newSorted[targetIndex];
                newSorted[targetIndex] = draggedNum;
                newUnsorted = newUnsorted.filter(n => n !== draggedNum);
                if (numInTarget !== null) newUnsorted.push(numInTarget);
                triggerAnimation(targetIndex);
            } else if (sourceType === 'sorted' && targetType === 'unsorted' && sourceIndex !== undefined) {
                newSorted[sourceIndex] = null;
                if (!newUnsorted.includes(draggedNum)) newUnsorted.push(draggedNum);
            } else if (sourceType === 'sorted' && targetType === 'sorted' && sourceIndex !== undefined && targetIndex !== undefined && sourceIndex !== targetIndex) {
                const numInTarget = newSorted[targetIndex];
                newSorted[targetIndex] = draggedNum;
                newSorted[sourceIndex] = numInTarget;
                triggerAnimation(targetIndex);
            }

            setUnsortedNumbers(newUnsorted);
            setSortedNumbers(newSorted);
        } catch (error) {
            console.error("Drop failed:", error);
        }
    };

    const handleCheckAnswers = () => {
        setIsChecking(true);
        const newFeedback: Record<number, 'correct' | 'incorrect'> = {};
        const sortedCorrect = [...gameState.numbers].sort((a, b) => gameState.order === 'asc' ? a - b : b - a);

        sortedNumbers.forEach((answer, index) => {
            newFeedback[index] = answer === sortedCorrect[index] ? 'correct' : 'incorrect';
        });

        setFeedback(newFeedback);
    };

    const handleNewGame = () => {
        setGameState(generateSortingGameState());
    };

    const instructionText = `Sayıları aşağıdan yukarıya sürükleyerek ${gameState.order === 'asc' ? 'küçükten büyüğe' : 'büyükten küüğe'} doğru sıralayın.`;
    
    return (
        <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-slate-800">Sayı Sıralama</h1>
                <p className="text-slate-600 mt-2">{instructionText}</p>
            </header>

            <div className="flex justify-center items-center flex-wrap gap-2 my-8">
                {Array.from({ length: 5 }).map((_, index) => {
                    const num = sortedNumbers[index];
                    const feedbackStatus = feedback[index];
                    const isJustDropped = justDroppedIndex === index;
                    let slotClass = "w-24 h-20 flex items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 ";
                    if (isChecking) {
                        slotClass += feedbackStatus === 'correct' ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500';
                    } else {
                        slotClass += dragOverTarget === `sorted-${index}` ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300';
                    }

                    return (
                        <React.Fragment key={index}>
                            {index > 0 && (
                                <div className="text-4xl font-light text-slate-400">
                                  {gameState.order === 'asc' ? '<' : '>'}
                                </div>
                            )}
                            <div 
                                onDragOver={handleDragOver} 
                                onDragEnter={(e) => handleDragEnter(e, `sorted-${index}`)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'sorted', index)}
                                className={slotClass}
                                aria-label={`Sıralama alanı ${index + 1}`}
                            >
                                {num !== null && (
                                    <div 
                                        draggable={!isChecking}
                                        onDragStart={(e) => handleDragStart(e, { type: 'sorted', num, index })}
                                        onDragEnd={handleDragEnd}
                                        onMouseDown={() => handlePressStart(num)}
                                        onMouseUp={handlePressEnd}
                                        onMouseLeave={handlePressEnd}
                                        onTouchStart={() => handlePressStart(num)}
                                        onTouchEnd={handlePressEnd}
                                        className={`text-2xl font-bold px-4 py-2 rounded-md shadow-sm select-none transition-all duration-200 ${!isChecking ? `cursor-grab active:cursor-grabbing text-white ${numberColorMap[num]}` : (feedbackStatus === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white')} ${draggedItem?.type === 'sorted' && draggedItem?.index === index ? 'opacity-40' : 'opacity-100'} ${pressedNumber === num ? 'scale-125 shadow-2xl z-10 opacity-95 ring-4 ring-indigo-300' : 'scale-100'} ${isJustDropped ? 'animate-pop-in' : ''}`}
                                    >
                                        {num}
                                    </div>
                                )}
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            <div 
                onDragOver={handleDragOver} 
                onDragEnter={(e) => handleDragEnter(e, 'unsorted')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'unsorted')} 
                className={`flex justify-center flex-wrap gap-4 p-4 rounded-lg min-h-[7rem] items-center transition-all duration-200 ${dragOverTarget === 'unsorted' ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'bg-slate-100'}`}
                aria-label="Sıralanacak sayılar alanı"
            >
                {unsortedNumbers.map(num => (
                    <div 
                        key={`unsorted-${num}`} 
                        draggable={!isChecking}
                        onDragStart={(e) => handleDragStart(e, { type: 'unsorted', num })}
                        onDragEnd={handleDragEnd}
                        onMouseDown={() => handlePressStart(num)}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        onTouchStart={() => handlePressStart(num)}
                        onTouchEnd={handlePressEnd}
                        className={`text-2xl font-bold px-4 py-2 rounded-md shadow-sm select-none transition-all duration-200 ${!isChecking ? `cursor-grab active:cursor-grabbing text-white ${numberColorMap[num]}` : 'bg-slate-200 text-slate-500'} ${draggedItem?.type === 'unsorted' && draggedItem?.num === num ? 'opacity-40' : 'opacity-100'} ${pressedNumber === num ? 'scale-125 shadow-2xl z-10 opacity-95 ring-4 ring-indigo-300' : 'scale-100'}`}
                    >
                        {num}
                    </div>
                ))}
                {unsortedNumbers.length === 0 && <span className="text-slate-400">Sıralama alanına bakın!</span>}
            </div>

            <ControlButtons onCheck={handleCheckAnswers} onNew={handleNewGame} onMenu={onBackToMenu} isChecking={isChecking} />
        </div>
    );
};

const RhythmicCountingGame: React.FC<{ onBackToMenu: () => void }> = ({ onBackToMenu }) => {
    const [gameState, setGameState] = useState(generateRhythmicGameState);
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
    const [feedback, setFeedback] = useState<Feedback>({});
    const [isChecking, setIsChecking] = useState(false);

    const correctSequence = useMemo(() => {
        const seq = [];
        for (let i = gameState.start; i <= 81; i += gameState.step) {
            seq.push(i);
        }
        return seq;
    }, [gameState]);

    const handleNumberClick = (num: number) => {
        if (isChecking) return;
        setSelectedNumbers(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
    };

    const handleCheckAnswers = () => {
        setIsChecking(true);
        const newFeedback: Feedback = {};
        for (let i = 1; i <= 81; i++) {
            const isCorrect = correctSequence.includes(i);
            const isSelected = selectedNumbers.includes(i);
            if (isCorrect && isSelected) newFeedback[i] = 'correct';
            else if (!isCorrect && isSelected) newFeedback[i] = 'incorrect';
            else if (isCorrect && !isSelected) newFeedback[i] = 'missed';
        }
        setFeedback(newFeedback);
    };

    const handleNewGame = () => {
        setGameState(generateRhythmicGameState());
        setSelectedNumbers([]);
        setFeedback({});
        setIsChecking(false);
    };
    
    const scoreText = useMemo(() => {
        if (!isChecking) return null;
        const correctCount = Object.values(feedback).filter(f => f === 'correct').length;
        return `Skor: ${correctCount} / ${correctSequence.length}`;
    }, [isChecking, feedback, correctSequence]);

    const instructionText = `${gameState.start} sayısından başlayarak ${gameState.step}'er ritmik sayın ve sayıları işaretleyin.`;

    return (
        <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-slate-800">Ritmik Sayma Oyunu</h1>
                <p className="text-slate-600 mt-2">{instructionText}</p>
            </header>
            <div className="grid grid-cols-9 gap-1 text-center text-slate-800">
                {Array.from({ length: 81 }, (_, i) => i + 1).map(num => {
                    const isSelected = selectedNumbers.includes(num);
                    const feedbackStatus = feedback[num];
                    let cellClass = `p-1 rounded-md cursor-pointer transition-all duration-200 font-semibold text-sm flex items-center justify-center aspect-square `;
                    if (isChecking) {
                        if (feedbackStatus === 'correct') cellClass += 'bg-green-500 text-white';
                        else if (feedbackStatus === 'incorrect') cellClass += 'bg-slate-200 text-red-500';
                        else if (feedbackStatus === 'missed') cellClass += 'border-2 border-yellow-500 text-yellow-600';
                        else cellClass += 'bg-slate-100 text-slate-500';
                    } else {
                        cellClass += isSelected ? 'bg-blue-500 text-white scale-105' : 'bg-slate-200 hover:bg-slate-300';
                    }
                    return <div key={num} onClick={() => handleNumberClick(num)} className={cellClass}>{num}</div>;
                })}
            </div>
            {isChecking && <p className="text-center text-xl font-bold text-slate-700 animate-pop-in">{scoreText}</p>}
            <ControlButtons onCheck={handleCheckAnswers} onNew={handleNewGame} onMenu={onBackToMenu} isChecking={isChecking} />
        </div>
    );
};

const TextBasedGame: React.FC<{
    onBackToMenu: () => void;
    onNewGame: () => void;
    title: string;
    questions: { text: string; answer: number }[];
}> = ({ onBackToMenu, onNewGame, title, questions }) => {
    const [userAnswers, setUserAnswers] = useState<UserAnswers<string>>(questions.reduce((acc, _, i) => ({ ...acc, [i]: '' }), {}));
    const [feedback, setFeedback] = useState<Feedback>({});
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        setUserAnswers(questions.reduce((acc, _, i) => ({ ...acc, [i]: '' }), {}));
        setFeedback({});
        setIsChecking(false);
    }, [questions]);

    const handleInputChange = (index: number, value: string) => {
        if (isChecking || !/^\d*$/.test(value)) return;
        setUserAnswers(prev => ({ ...prev, [index]: value }));
    };

    const handleCheckAnswers = () => {
        setIsChecking(true);
        const newFeedback: Feedback = {};
        questions.forEach((q, index) => {
            newFeedback[index] = parseInt(userAnswers[index], 10) === q.answer ? 'correct' : 'incorrect';
        });
        setFeedback(newFeedback);
    };

    return (
        <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
            </header>
            <div className="space-y-4">
                {questions.map((q, index) => {
                    const feedbackStatus = feedback[index];
                    let inputClass = "w-28 text-center text-xl font-bold rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 p-2 ";
                     if (isChecking) {
                        if (feedbackStatus === 'correct') inputClass += 'bg-green-100 border-green-500 text-green-800';
                        else inputClass += 'bg-red-100 border-red-500 text-red-800';
                    } else {
                        inputClass += 'border-slate-300';
                    }
                    return (
                        <div key={index} className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg">
                            <p className="text-slate-700 text-center sm:text-left text-lg flex-1 font-mono">{q.text} = </p>
                            <input
                                type="text"
                                value={userAnswers[index]}
                                onChange={(e) => handleInputChange(index, e.target.value)}
                                className={inputClass}
                                disabled={isChecking}
                            />
                        </div>
                    );
                })}
            </div>
             <ControlButtons
                onCheck={handleCheckAnswers}
                onNew={onNewGame}
                onMenu={onBackToMenu}
                isChecking={isChecking}
            />
        </div>
    );
};

const OddEvenGame: React.FC<{ onBackToMenu: () => void }> = ({ onBackToMenu }) => {
    type OddEvenMode = 'menu' | 'single' | 'sum';
    type GameProgress = 'playing' | 'feedback' | 'finished';

    const [mode, setMode] = useState<OddEvenMode>('menu');
    const [questions, setQuestions] = useState<OddEvenQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState<'tek' | 'çift' | null>(null);
    const [progress, setProgress] = useState<GameProgress>('playing');
    const [score, setScore] = useState(0);
    const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'incorrect' | null>(null);

    const startGame = (type: 'single' | 'sum') => {
        setMode(type);
        setQuestions(generateOddEvenGameState(type, 15));
        setCurrentQuestionIndex(0);
        setUserAnswer(null);
        setProgress('playing');
        setScore(0);
        setFeedbackStatus(null);
    };
    
    const getCorrectAnswer = useCallback((question: OddEvenQuestion) => {
        const number = question.type === 'single' ? question.number : question.numbers[0] + question.numbers[1];
        return number % 2 === 0 ? 'çift' : 'tek';
    }, []);

    const handleAnswerSelect = (selectedAnswer: 'tek' | 'çift') => {
        if (progress !== 'playing') return;

        setUserAnswer(selectedAnswer);
        const correctAnswer = getCorrectAnswer(questions[currentQuestionIndex]);
        
        if (selectedAnswer === correctAnswer) {
            setScore(prev => prev + 1);
            setFeedbackStatus('correct');
        } else {
            setFeedbackStatus('incorrect');
        }
        setProgress('feedback');
    };
    
    const handleNextQuestion = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setUserAnswer(null);
            setProgress('playing');
            setFeedbackStatus(null);
        } else {
            setProgress('finished');
        }
    }, [currentQuestionIndex, questions.length]);
    
    useEffect(() => {
        if (progress === 'feedback') {
            const timer = setTimeout(() => {
                handleNextQuestion();
            }, 1200); // 1.2 saniye bekleme

            return () => clearTimeout(timer);
        }
    }, [progress, handleNextQuestion]);

    const handleRestart = () => {
        if (mode === 'single' || mode === 'sum') {
            startGame(mode);
        }
    };

    if (mode === 'menu') {
        return (
             <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
                <header className="text-center">
                    <h1 className="text-3xl font-bold text-slate-800">Tek-Çift Sayılar Oyunu</h1>
                    <p className="text-slate-600 mt-2">Bir etkinlik seçin.</p>
                </header>
                <div className="flex flex-col space-y-4">
                    <button onClick={() => startGame('single')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-400">
                        <span className="text-2xl font-bold text-indigo-500">1</span>
                        <div>
                            <h2 className="text-lg text-slate-800">Etkinlik 1: Sayılar</h2>
                            <p className="text-sm text-slate-500">Verilen sayının tek mi çift mi olduğunu bulun.</p>
                        </div>
                    </button>
                     <button onClick={() => startGame('sum')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-teal-50 hover:border-teal-400">
                        <span className="text-2xl font-bold text-teal-500">2</span>
                        <div>
                            <h2 className="text-lg text-slate-800">Etkinlik 2: Toplamlar</h2>
                            <p className="text-sm text-slate-500">Verilen toplama işleminin sonucunun tek mi çift mi olduğunu bulun.</p>
                        </div>
                    </button>
                </div>
                 <div className="flex justify-center pt-4">
                    <button onClick={onBackToMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
                        <Home className="w-5 h-5" /> Ana Menü
                    </button>
                </div>
            </div>
        );
    }
    
    if (progress === 'finished') {
        return (
            <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-center animate-pop-in">
                <h1 className="text-3xl font-bold text-slate-800">Etkinlik Tamamlandı!</h1>
                <p className="text-5xl font-bold text-indigo-600">{score} / {questions.length}</p>
                <p className="text-slate-600">Harika iş! Tekrar denemek ister misin?</p>
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                     <button onClick={handleRestart} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                        <RefreshCw className="w-5 h-5" /> Tekrar Oyna
                    </button>
                    <button onClick={() => setMode('menu')} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-green-500 rounded-lg shadow-md hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75">
                         Etkinlik Menüsü
                    </button>
                     <button onClick={onBackToMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
                        <Home className="w-5 h-5" /> Ana Menü
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    const getButtonClass = (type: 'tek' | 'çift') => {
        let base = "w-full py-3 px-4 rounded-lg font-semibold border-2 transition-all duration-200 text-lg ";
        const isSelected = userAnswer === type;

        if (progress === 'feedback') {
             if (isSelected && feedbackStatus === 'correct') {
                 return base + 'bg-green-500 border-green-600 text-white animate-pop-in';
             }
             if (isSelected && feedbackStatus === 'incorrect') {
                 return base + 'bg-red-500 border-red-600 text-white animate-shake';
             }
             return base + 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed';
        } else {
            if (type === 'tek') {
                return base + 'bg-indigo-500 border-indigo-600 hover:bg-indigo-600 text-white';
            } else { // type === 'çift'
                return base + 'bg-teal-500 border-teal-600 hover:bg-teal-600 text-white';
            }
        }
    };
    
    const questionBoxClass = `bg-slate-100 rounded-xl p-4 space-y-3 shadow-inner min-h-[10rem] flex items-center justify-center transition-all duration-300 border-4 ${
        feedbackStatus === 'correct' ? 'border-green-400' :
        feedbackStatus === 'incorrect' ? 'border-red-400' :
        'border-transparent'
    }`;
    
    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
            <header className="text-center">
                <h1 className="text-2xl font-bold text-slate-800">{mode === 'single' ? 'Etkinlik 1: Sayılar' : 'Etkinlik 2: Toplamlar'}</h1>
                <p className="text-slate-500 mt-1">Soru {currentQuestionIndex + 1} / {questions.length}</p>
            </header>
             <div className={questionBoxClass}>
                <p className="text-center text-5xl font-bold text-slate-800">
                    {currentQuestion.type === 'single' ? currentQuestion.number : `${currentQuestion.numbers[0]} + ${currentQuestion.numbers[1]}`}
                </p>
            </div>
            <div className="flex gap-4">
                <button onClick={() => handleAnswerSelect('tek')} disabled={progress === 'feedback'} className={getButtonClass('tek')}>Tek</button>
                <button onClick={() => handleAnswerSelect('çift')} disabled={progress === 'feedback'} className={getButtonClass('çift')}>Çift</button>
            </div>
            <div className="flex flex-col items-center gap-4 pt-4">
                <div className="w-full h-[52px]">
                    {progress === 'feedback' && (
                        <div className="flex justify-center items-center h-full">
                           <p className="text-slate-500 animate-pulse">Sonraki soruya geçiliyor...</p>
                        </div>
                    )}
                </div>
                <button onClick={onBackToMenu} className="font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                    Ana Menü
                </button>
            </div>
        </div>
    );
};


const RomanNumeralGame: React.FC<{ onBackToMenu: () => void }> = ({ onBackToMenu }) => {
    type RomanActivity = 'menu' | 'activity1' | 'activity2' | 'activity3';
    type GameProgress = 'playing' | 'feedback' | 'finished';

    const [activity, setActivity] = useState<RomanActivity>('menu');
    const [questions, setQuestions] = useState<RomanQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState<string | number | null>(null);
    const [progress, setProgress] = useState<GameProgress>('playing');
    const [score, setScore] = useState(0);
    const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'incorrect' | null>(null);

    const startActivity = (type: 'activity1' | 'activity2' | 'activity3') => {
        setActivity(type);
        setQuestions(generateRomanGameQuestions(type, 10));
        setCurrentQuestionIndex(0);
        setUserAnswer(null);
        setProgress('playing');
        setScore(0);
        setFeedbackStatus(null);
    };

    const checkAnswer = (selectedAnswer: string | number, correctAnswer: string | number) => {
        if (typeof correctAnswer === 'number') {
            return fromRoman(String(selectedAnswer)) === correctAnswer || Number(selectedAnswer) === correctAnswer;
        }
        return String(selectedAnswer) === correctAnswer;
    };

    const handleAnswerSelect = (selectedAnswer: string | number) => {
        if (progress !== 'playing') return;

        setUserAnswer(selectedAnswer);
        const question = questions[currentQuestionIndex];
        
        if (checkAnswer(selectedAnswer, question.answer)) {
            setScore(prev => prev + 1);
            setFeedbackStatus('correct');
        } else {
            setFeedbackStatus('incorrect');
        }
        setProgress('feedback');
    };

    const handleNextQuestion = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setUserAnswer(null);
            setProgress('playing');
            setFeedbackStatus(null);
        } else {
            setProgress('finished');
        }
    }, [currentQuestionIndex, questions.length]);

    useEffect(() => {
        if (progress === 'feedback') {
            const timer = setTimeout(() => {
                handleNextQuestion();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [progress, handleNextQuestion]);

    const handleRestart = () => {
        if (activity !== 'menu') {
            startActivity(activity);
        }
    };
    
    const activityTitles = {
        activity1: "Etkinlik 1: Romen'den Sayıya",
        activity2: "Etkinlik 2: Sayıdan Romen'e",
        activity3: "Etkinlik 3: Toplama",
    };

    if (activity === 'menu') {
        return (
             <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
                <header className="text-center">
                    <h1 className="text-3xl font-bold text-slate-800">Romen Rakamları Oyunu</h1>
                    <p className="text-slate-600 mt-2">Bir etkinlik seçin.</p>
                </header>
                <div className="flex flex-col space-y-4">
                    <button onClick={() => startActivity('activity1')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-400">
                        <span className="text-2xl font-bold text-indigo-500">1</span>
                        <div>
                            <h2 className="text-lg text-slate-800">{activityTitles.activity1}</h2>
                            <p className="text-sm text-slate-500">Verilen Romen rakamının hangi sayı olduğunu bulun.</p>
                        </div>
                    </button>
                    <button onClick={() => startActivity('activity2')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-teal-50 hover:border-teal-400">
                        <span className="text-2xl font-bold text-teal-500">2</span>
                        <div>
                            <h2 className="text-lg text-slate-800">{activityTitles.activity2}</h2>
                            <p className="text-sm text-slate-500">Verilen sayının Romen rakamı karşılığını bulun.</p>
                        </div>
                    </button>
                     <button onClick={() => startActivity('activity3')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-purple-50 hover:border-purple-400">
                        <span className="text-2xl font-bold text-purple-500">3</span>
                        <div>
                            <h2 className="text-lg text-slate-800">{activityTitles.activity3}</h2>
                            <p className="text-sm text-slate-500">Toplama işleminin sonucunu bulun.</p>
                        </div>
                    </button>
                </div>
                 <div className="flex justify-center pt-4">
                    <button onClick={onBackToMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
                        <Home className="w-5 h-5" /> Ana Menü
                    </button>
                </div>
            </div>
        );
    }
    
    if (progress === 'finished') {
        return (
            <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-center animate-pop-in">
                <h1 className="text-3xl font-bold text-slate-800">Etkinlik Tamamlandı!</h1>
                <p className="text-5xl font-bold text-indigo-600">{score} / {questions.length}</p>
                <p className="text-slate-600">Harika iş! Tekrar denemek ister misin?</p>
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                    <button onClick={handleRestart} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                        <RefreshCw className="w-5 h-5" /> Tekrar Oyna
                    </button>
                    <button onClick={() => setActivity('menu')} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-green-500 rounded-lg shadow-md hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75">
                         Etkinlik Menüsü
                    </button>
                    <button onClick={onBackToMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
                        <Home className="w-5 h-5" /> Ana Menü
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    const getButtonClass = (option: string | number, index: number) => {
        let base = "w-full py-3 px-4 rounded-lg font-semibold border-2 transition-all duration-200 text-lg ";
        const isSelected = userAnswer === option;

        if (progress === 'feedback') {
            if (isSelected && feedbackStatus === 'correct') return base + 'bg-green-500 border-green-600 text-white animate-pop-in';
            if (isSelected && feedbackStatus === 'incorrect') return base + 'bg-red-500 border-red-600 text-white animate-shake';
            if (checkAnswer(option, currentQuestion.answer)) return base + 'bg-green-500 border-green-600 text-white'; // Show correct answer
            return base + 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed';
        }

        const optionColors = [
            'bg-sky-500 border-sky-600 hover:bg-sky-600',
            'bg-amber-500 border-amber-600 hover:bg-amber-600',
            'bg-lime-500 border-lime-600 hover:bg-lime-600',
        ];
        return base + 'text-white ' + optionColors[index % optionColors.length];
    };

    const questionBoxClass = `bg-slate-100 rounded-xl p-4 shadow-inner min-h-[10rem] flex items-center justify-center transition-all duration-300 border-4 ${
        feedbackStatus === 'correct' ? 'border-green-400' :
        feedbackStatus === 'incorrect' ? 'border-red-400' :
        'border-transparent'
    }`;
    
    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
            <header className="text-center">
                <h1 className="text-2xl font-bold text-slate-800">{activity !== 'menu' && activityTitles[activity]}</h1>
                <p className="text-slate-500 mt-1">Soru {currentQuestionIndex + 1} / {questions.length}</p>
            </header>
            <div className={questionBoxClass}>
                <p className="text-center text-5xl font-bold text-slate-800 tracking-wider">
                    {typeof currentQuestion.question === 'object' 
                        ? `${currentQuestion.question.num1} + ${currentQuestion.question.num2}` 
                        : currentQuestion.question}
                </p>
            </div>
            <div className="flex flex-col gap-3">
                {currentQuestion.options.map((option, idx) => (
                    <button key={idx} onClick={() => handleAnswerSelect(option)} disabled={progress === 'feedback'} className={getButtonClass(option, idx)}>
                        {option}
                    </button>
                ))}
            </div>
            <div className="flex flex-col items-center gap-4 pt-4">
                <div className="w-full h-[28px]">
                    {progress === 'feedback' && (
                        <div className="flex justify-center items-center h-full">
                           <p className="text-slate-500 animate-pulse">Sonraki soruya geçiliyor...</p>
                        </div>
                    )}
                </div>
                 <button onClick={onBackToMenu} className="font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                    Ana Menü
                </button>
            </div>
        </div>
    );
};

type DecompositionAnswer = { hundreds: number; tens: number; ones: number; };
type PlaceValue = keyof DecompositionAnswer;
type ColumnFeedback = Record<PlaceValue, 'correct' | 'incorrect' | 'neutral'>;

const DecompositionGame: React.FC<{ onBackToMenu: () => void }> = ({ onBackToMenu }) => {
    const [questions, setQuestions] = useState(() => generateDecompositionGameData(5));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState<DecompositionAnswer>({ hundreds: 0, tens: 0, ones: 0 });
    const [isChecking, setIsChecking] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [isGameFinished, setIsGameFinished] = useState(false);
    const [columnFeedback, setColumnFeedback] = useState<ColumnFeedback>({ hundreds: 'neutral', tens: 'neutral', ones: 'neutral' });

    const currentQuestion = questions[currentIndex];
    const currentTotal = useMemo(() => userAnswer.hundreds * 100 + userAnswer.tens * 10 + userAnswer.ones * 1, [userAnswer]);

    const handleNewGame = () => {
        setQuestions(generateDecompositionGameData(5));
        setCurrentIndex(0);
        setUserAnswer({ hundreds: 0, tens: 0, ones: 0 });
        setIsChecking(false);
        setIsComplete(false);
        setIsGameFinished(false);
        setColumnFeedback({ hundreds: 'neutral', tens: 'neutral', ones: 'neutral' });
    };
    
    const handleModifyBlocks = (part: PlaceValue, amount: number) => {
        if (isComplete || isChecking) return;
        setUserAnswer(prev => ({ ...prev, [part]: Math.max(0, prev[part] + amount) }));
    };

    const handleCheck = () => {
        setIsChecking(true);
        
        const { answer } = currentQuestion;
        const newFeedback: ColumnFeedback = {
            hundreds: userAnswer.hundreds === answer.hundreds ? 'correct' : 'incorrect',
            tens: userAnswer.tens === answer.tens ? 'correct' : 'incorrect',
            ones: userAnswer.ones === answer.ones ? 'correct' : 'incorrect',
        };
        setColumnFeedback(newFeedback);
        
        const allCorrect = Object.values(newFeedback).every(f => f === 'correct');

        if (allCorrect) {
            setIsComplete(true);
            setIsChecking(false);
        } else {
            setTimeout(() => {
                setIsChecking(false);
                setColumnFeedback({ hundreds: 'neutral', tens: 'neutral', ones: 'neutral' });
            }, 1500);
        }
    };
    
    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserAnswer({ hundreds: 0, tens: 0, ones: 0 });
            setIsChecking(false);
            setIsComplete(false);
            setColumnFeedback({ hundreds: 'neutral', tens: 'neutral', ones: 'neutral' });
        } else {
            setIsGameFinished(true);
        }
    };
    
    const handleReset = () => {
        setUserAnswer({ hundreds: 0, tens: 0, ones: 0 });
        setIsChecking(false);
        setIsComplete(false);
        setColumnFeedback({ hundreds: 'neutral', tens: 'neutral', ones: 'neutral' });
    };

    if (isGameFinished) {
        return (
            <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-center animate-pop-in">
                <h1 className="text-3xl font-bold text-slate-800">Harika İş!</h1>
                <p className="text-slate-600">Tüm sayıları başarıyla çözümledin.</p>
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                    <button onClick={handleNewGame} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                        <RefreshCw className="w-5 h-5" /> Yeni Oyun
                    </button>
                    <button onClick={onBackToMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
                        <Home className="w-5 h-5" /> Ana Menü
                    </button>
                </div>
            </div>
        );
    }

    const PlaceValueColumn: React.FC<{
        part: PlaceValue;
        title: string;
        value: number;
        colorClasses: string;
    }> = ({ part, title, value, colorClasses }) => {
        const feedback = columnFeedback[part];
        let feedbackClass = '';
        if (isChecking) {
            if (feedback === 'correct') feedbackClass = 'ring-green-500 bg-green-50';
            else if (feedback === 'incorrect') feedbackClass = 'ring-red-500 bg-red-50 animate-shake';
        }

        return (
            <div className={`flex flex-col items-center p-4 rounded-xl shadow-lg transition-all duration-300 ${colorClasses} ${feedbackClass} ring-4 ring-transparent`}>
                <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
                <div className="flex items-center justify-center gap-3 bg-white/30 p-2 rounded-full">
                    <button onClick={() => handleModifyBlocks(part, -1)} disabled={isComplete || isChecking} className="w-10 h-10 rounded-full bg-white text-3xl font-bold flex items-center justify-center hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">-</button>
                    <span className="text-4xl font-bold w-16 text-center text-white">{userAnswer[part]}</span>
                    <button onClick={() => handleModifyBlocks(part, 1)} disabled={isComplete || isChecking} className="w-10 h-10 rounded-full bg-white text-3xl font-bold flex items-center justify-center hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">+</button>
                </div>
                <p className="text-lg font-semibold text-white/90 mt-3">{userAnswer[part]} x {value} = {userAnswer[part] * value}</p>
            </div>
        );
    };

    return (
        <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col space-y-4 animate-fade-in">
             <header className="text-center">
                <h1 className="text-3xl font-bold text-slate-800">Sayı Çözümleme</h1>
                <p className="text-slate-600 mt-1">Hedef sayıyı yüzlük, onluk ve birliklerine ayır.</p>
                <p className="text-slate-500 mt-1">Soru {currentIndex + 1} / {questions.length}</p>
            </header>

            <div className="relative text-center bg-indigo-100 text-indigo-800 font-bold text-5xl sm:text-6xl p-4 rounded-xl tracking-wider shadow-inner">
                {currentQuestion.number}
                {isComplete && (
                    <div className="absolute -top-4 -right-4">
                        <CheckCircle className="w-12 h-12 text-green-500 bg-white rounded-full p-1 shadow-lg animate-pop-in" />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PlaceValueColumn part="hundreds" title="Yüzlükler" value={100} colorClasses="bg-red-500" />
                <PlaceValueColumn part="tens" title="Onluklar" value={10} colorClasses="bg-blue-500" />
                <PlaceValueColumn part="ones" title="Birlikler" value={1} colorClasses="bg-green-500" />
            </div>
            
            <div className="text-center text-xl sm:text-2xl font-bold text-slate-700 p-3 bg-slate-100 rounded-lg shadow-inner flex flex-wrap items-center justify-center gap-x-2">
                <span>{userAnswer.hundreds * 100}</span>
                <span className="text-slate-500">+</span>
                <span>{userAnswer.tens * 10}</span>
                <span className="text-slate-500">+</span>
                <span>{userAnswer.ones}</span>
                <span className="text-slate-500">=</span>
                <span className={`px-2 py-1 rounded-md transition-colors ${!isChecking && currentTotal !== currentQuestion.number ? 'bg-slate-200 text-slate-800' : ''} ${currentTotal === currentQuestion.number ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{currentTotal}</span>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 pt-2">
                {isComplete ? (
                    <button onClick={handleNext} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 animate-pop-in">
                        {currentIndex === questions.length - 1 ? 'Bitir' : 'Sonraki Soru'}
                    </button>
                ) : (
                    <button onClick={handleCheck} disabled={isChecking} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-green-500 rounded-lg shadow-md hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75">
                        <CheckCircle className="w-5 h-5" /> Kontrol Et
                    </button>
                )}
                <button onClick={handleReset} disabled={isComplete || isChecking} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-yellow-500 rounded-lg shadow-md hover:bg-yellow-600 disabled:bg-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75">
                    <RefreshCw className="w-5 h-5" /> Sıfırla
                </button>
                <button onClick={onBackToMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
                    <Home className="w-5 h-5" /> Ana Menü
                </button>
            </div>
        </div>
    );
};

const AdditionGame: React.FC<{ onBackToMenu: () => void; type: 'without-carry' | 'with-carry' }> = ({ onBackToMenu, type }) => {
    const title = type === 'with-carry' ? "Eldeli Toplama" : "Eldesiz Toplama";
    const generateQuestions = type === 'with-carry' ? generateAdditionWithCarryGameState : generateAdditionWithoutCarryGameState;
    
    const [questions, setQuestions] = useState(() => generateQuestions(5));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [gameStatus, setGameStatus] = useState<'playing' | 'feedback' | 'finished'>('playing');
    const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'incorrect' | null>(null);

    const currentQuestion = questions[currentIndex];
    const answerLength = String(currentQuestion.answer).length;
    
    const handleRestart = useCallback(() => {
        setQuestions(generateQuestions(5));
        setCurrentIndex(0);
        setUserAnswer('');
        setGameStatus('playing');
        setFeedbackStatus(null);
    }, [generateQuestions]);

    const handleNextQuestion = useCallback(() => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserAnswer('');
            setGameStatus('playing');
            setFeedbackStatus(null);
        } else {
            setGameStatus('finished');
        }
    }, [currentIndex, questions.length]);

    const handleCheckAnswer = () => {
        if (gameStatus !== 'playing' || userAnswer.length !== answerLength) return;
        
        setGameStatus('feedback');
        const isCorrect = parseInt(userAnswer.split('').reverse().join(''), 10) === currentQuestion.answer;

        if (isCorrect) {
            setFeedbackStatus('correct');
            setTimeout(handleNextQuestion, 1200);
        } else {
            setFeedbackStatus('incorrect');
            setTimeout(() => {
                setUserAnswer('');
                setGameStatus('playing');
                setFeedbackStatus(null);
            }, 1200);
        }
    };
    
    const handleNumberClick = (num: number) => {
        if (gameStatus !== 'playing' || userAnswer.length >= answerLength) return;
        setUserAnswer(prev => prev + String(num));
    };
    
    const handleBackspace = () => {
        if (gameStatus !== 'playing') return;
        setUserAnswer(prev => prev.slice(0, -1));
    };

    if (gameStatus === 'finished') {
        return (
            <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-center animate-pop-in">
                <h1 className="text-3xl font-bold text-slate-800">Harika İş!</h1>
                <p className="text-slate-600">Alıştırmayı tamamladın.</p>
                <p className="text-5xl font-bold text-lime-600">{questions.length} / {questions.length}</p>
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                    <button onClick={handleRestart} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                        <RefreshCw className="w-5 h-5" /> Tekrar Oyna
                    </button>
                    <button onClick={onBackToMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
                         Alıştırma Menüsü
                    </button>
                </div>
            </div>
        );
    }
    
    const widthClass = answerLength === 3 ? 'w-40' : 'w-48';
    
    const answerBoxClass = `h-20 ${widthClass} text-right text-5xl p-2 font-bold rounded-lg border-2 transition-all duration-300 ${
        gameStatus === 'feedback' 
            ? feedbackStatus === 'correct' 
                ? 'bg-green-100 border-green-500 text-green-800 animate-pop-in' 
                : 'bg-red-100 border-red-500 text-red-800 animate-shake'
            : 'bg-slate-100 border-slate-300 text-slate-800'
    }`;
    
    const answerDisplay = () => {
        const reversedAnswer = userAnswer.split('').reverse().join('');
        const paddedAnswer = reversedAnswer.padStart(answerLength, '_');
        return <>{paddedAnswer}</>;
    }

    return (
        <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
                <p className="text-slate-500 mt-1">Soru {currentIndex + 1} / {questions.length}</p>
            </header>

            <div className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 rounded-lg">
                <div className={`font-mono text-5xl text-slate-700 ${widthClass}`}>
                    <p className="text-right">{currentQuestion.num1}</p>
                    <div className="flex items-center justify-end">
                        <span className="text-slate-400 font-sans text-4xl mr-2">+</span>
                        <p>{currentQuestion.num2}</p>
                    </div>
                    <hr className="border-slate-800 border-t-2 my-2" />
                </div>
                <div className={answerBoxClass}>
                    {answerDisplay()}
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button 
                        key={num} 
                        onClick={() => handleNumberClick(num)}
                        disabled={gameStatus !== 'playing'}
                        className="py-3 text-3xl font-semibold bg-sky-200 text-sky-900 rounded-lg shadow-sm hover:bg-sky-300 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {num}
                    </button>
                ))}
                 <button 
                    onClick={handleBackspace}
                    disabled={gameStatus !== 'playing'}
                    className="py-3 flex items-center justify-center bg-amber-400 rounded-lg shadow-sm hover:bg-amber-500 active:scale-95 transition-all disabled:opacity-50"
                >
                    <Backspace className="w-8 h-8 text-white"/>
                </button>
                 <button 
                    onClick={() => handleNumberClick(0)}
                    disabled={gameStatus !== 'playing'}
                    className="py-3 text-3xl font-semibold bg-sky-200 text-sky-900 rounded-lg shadow-sm hover:bg-sky-300 active:scale-95 transition-all disabled:opacity-50"
                >
                    0
                </button>
                 <button 
                    onClick={handleCheckAnswer}
                    disabled={gameStatus !== 'playing' || userAnswer.length !== answerLength}
                    className="py-3 flex items-center justify-center bg-green-500 rounded-lg shadow-sm hover:bg-green-600 active:scale-95 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    <CheckCircle className="w-8 h-8 text-white"/>
                </button>
            </div>
            <div className="flex justify-center pt-2">
                 <button onClick={onBackToMenu} className="font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                    Alıştırma Menüsü
                </button>
            </div>
        </div>
    );
};

const AdditionProblemGame: React.FC<{ onBackToMenu: () => void }> = ({ onBackToMenu }) => {
    const title = "Toplama Problemleri";
    const [questions, setQuestions] = useState(() => generateAdditionProblemGameState(5));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [gameStatus, setGameStatus] = useState<'playing' | 'feedback' | 'finished'>('playing');
    const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'incorrect' | null>(null);

    const currentQuestion = questions[currentIndex];
    
    const handleRestart = useCallback(() => {
        setQuestions(generateAdditionProblemGameState(5));
        setCurrentIndex(0);
        setUserAnswer('');
        setGameStatus('playing');
        setFeedbackStatus(null);
    }, []);

    const handleNextQuestion = useCallback(() => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserAnswer('');
            setGameStatus('playing');
            setFeedbackStatus(null);
        } else {
            setGameStatus('finished');
        }
    }, [currentIndex, questions.length]);

    const handleCheckAnswer = () => {
        if (gameStatus !== 'playing' || userAnswer.length === 0) return;
        
        setGameStatus('feedback');
        const isCorrect = parseInt(userAnswer, 10) === currentQuestion.answer;

        if (isCorrect) {
            setFeedbackStatus('correct');
            setTimeout(handleNextQuestion, 1200);
        } else {
            setFeedbackStatus('incorrect');
            setTimeout(() => {
                setUserAnswer('');
                setGameStatus('playing');
                setFeedbackStatus(null);
            }, 1200);
        }
    };
    
    const handleNumberClick = (num: number) => {
        if (gameStatus !== 'playing' || userAnswer.length >= 3) return; // Max 3 digits for answer
        setUserAnswer(prev => prev + String(num));
    };
    
    const handleBackspace = () => {
        if (gameStatus !== 'playing') return;
        setUserAnswer(prev => prev.slice(0, -1));
    };

    if (gameStatus === 'finished') {
        return (
            <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-center animate-pop-in">
                <h1 className="text-3xl font-bold text-slate-800">Harika İş!</h1>
                <p className="text-slate-600">Alıştırmayı tamamladın.</p>
                <p className="text-5xl font-bold text-lime-600">{questions.length} / {questions.length}</p>
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                    <button onClick={handleRestart} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                        <RefreshCw className="w-5 h-5" /> Tekrar Oyna
                    </button>
                    <button onClick={onBackToMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
                         Alıştırma Menüsü
                    </button>
                </div>
            </div>
        );
    }
    
    const answerBoxClass = `h-16 w-full text-center text-4xl p-2 font-bold rounded-lg border-2 transition-all duration-300 ${
        gameStatus === 'feedback' 
            ? feedbackStatus === 'correct' 
                ? 'bg-green-100 border-green-500 text-green-800 animate-pop-in' 
                : 'bg-red-100 border-red-500 text-red-800 animate-shake'
            : 'bg-slate-100 border-slate-300 text-slate-800'
    }`;
    
    const answerDisplay = userAnswer.length > 0 ? userAnswer : '_';

    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
                <p className="text-slate-500 mt-1">Soru {currentIndex + 1} / {questions.length}</p>
            </header>

            <div className="flex flex-col items-center justify-center gap-4 p-4 bg-slate-50 rounded-lg min-h-[10rem]">
                <p className="text-lg text-slate-700 text-center">{currentQuestion.text}</p>
            </div>
            
            <div className={answerBoxClass}>
                {answerDisplay}
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button 
                        key={num} 
                        onClick={() => handleNumberClick(num)}
                        disabled={gameStatus !== 'playing'}
                        className="py-3 text-3xl font-semibold bg-sky-200 text-sky-900 rounded-lg shadow-sm hover:bg-sky-300 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {num}
                    </button>
                ))}
                 <button 
                    onClick={handleBackspace}
                    disabled={gameStatus !== 'playing'}
                    className="py-3 flex items-center justify-center bg-amber-400 rounded-lg shadow-sm hover:bg-amber-500 active:scale-95 transition-all disabled:opacity-50"
                >
                    <Backspace className="w-8 h-8 text-white"/>
                </button>
                 <button 
                    onClick={() => handleNumberClick(0)}
                    disabled={gameStatus !== 'playing'}
                    className="py-3 text-3xl font-semibold bg-sky-200 text-sky-900 rounded-lg shadow-sm hover:bg-sky-300 active:scale-95 transition-all disabled:opacity-50"
                >
                    0
                </button>
                 <button 
                    onClick={handleCheckAnswer}
                    disabled={gameStatus !== 'playing' || userAnswer.length === 0}
                    className="py-3 flex items-center justify-center bg-green-500 rounded-lg shadow-sm hover:bg-green-600 active:scale-95 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    <CheckCircle className="w-8 h-8 text-white"/>
                </button>
            </div>
            <div className="flex justify-center pt-2">
                 <button onClick={onBackToMenu} className="font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                    Alıştırma Menüsü
                </button>
            </div>
        </div>
    );
};


// --- ANA MENÜ VE UYGULAMA BİLEŞENİ ---

type GameMode = 'coloring' | 'rounding' | 'sorting' | 'rhythmic' | 'addition' | 'placeValue' | 'oddEven' | 'romanNumerals' | 'decomposition' | 'additionMenu' | 'additionWithoutCarry' | 'additionWithCarry' | 'additionProblem';

const MainMenu: React.FC<{ onSelectGame: (mode: GameMode) => void }> = ({ onSelectGame }) => (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
        <header className="text-center">
            <h1 className="text-4xl font-bold text-slate-800">Matematik Oyunları</h1>
            <p className="text-slate-600 mt-2">Oynamak istediğin oyunu seç!</p>
        </header>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            <GameButton 
                onClick={() => onSelectGame('coloring')} 
                icon={<PaintBrush />}
                colorClasses="bg-blue-500 hover:bg-blue-600 focus:ring-blue-500"
            >
                Basamak Değeri Boyama
            </GameButton>
            <GameButton 
                onClick={() => onSelectGame('rounding')} 
                icon={<TrendingUp />}
                colorClasses="bg-green-500 hover:bg-green-600 focus:ring-green-500"
            >
                Sayı Yuvarlama
            </GameButton>
            <GameButton 
                onClick={() => onSelectGame('sorting')} 
                icon={<ArrowDownUp />}
                colorClasses="bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500"
            >
                Sayı Sıralama
            </GameButton>
            <GameButton 
                onClick={() => onSelectGame('rhythmic')} 
                icon={<Repeat />}
                colorClasses="bg-purple-500 hover:bg-purple-600 focus:ring-purple-500"
            >
                Ritmik Sayma
            </GameButton>
            <GameButton 
                onClick={() => onSelectGame('addition')} 
                icon={<Plus />}
                colorClasses="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
                Toplama ile Sayı Bulma
            </GameButton>
            <GameButton 
                onClick={() => onSelectGame('placeValue')} 
                icon={<ClipboardList />}
                colorClasses="bg-teal-500 hover:bg-teal-600 focus:ring-teal-500"
            >
                Basamak Değeri
            </GameButton>
            <GameButton 
                onClick={() => onSelectGame('oddEven')} 
                icon={<Hash />}
                colorClasses="bg-cyan-500 hover:bg-cyan-600 focus:ring-cyan-500"
            >
                Tek-Çift Sayılar
            </GameButton>
            <GameButton 
                onClick={() => onSelectGame('romanNumerals')} 
                icon={<BookOpen />}
                colorClasses="bg-orange-500 hover:bg-orange-600 focus:ring-orange-500"
            >
                Romen Rakamları
            </GameButton>
            <GameButton 
                onClick={() => onSelectGame('decomposition')} 
                icon={<Blocks />}
                colorClasses="bg-pink-500 hover:bg-pink-600 focus:ring-pink-500"
            >
                Sayı Çözümleme
            </GameButton>
            <GameButton 
                onClick={() => onSelectGame('additionMenu')} 
                icon={<Calculator />}
                colorClasses="bg-lime-500 hover:bg-lime-600 focus:ring-lime-500"
            >
                Toplama Alıştırmaları
            </GameButton>
        </div>
    </div>
);

const AdditionMenu: React.FC<{ onSelectGame: (mode: 'additionWithoutCarry' | 'additionWithCarry' | 'additionProblem') => void; onBackToMenu: () => void }> = ({ onSelectGame, onBackToMenu }) => {
    return (
        <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-slate-800">Toplama Alıştırmaları</h1>
                <p className="text-slate-600 mt-2">Bir alıştırma türü seçin.</p>
            </header>
            <div className="flex flex-col space-y-4">
                <button onClick={() => onSelectGame('additionWithoutCarry')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-lime-50 hover:border-lime-400">
                    <span className="text-2xl font-bold text-lime-500 w-12 text-center">1</span>
                    <div>
                        <h2 className="text-lg text-slate-800">Eldesiz Toplama</h2>
                        <p className="text-sm text-slate-500">Sayıları elde kullanmadan toplayın.</p>
                    </div>
                </button>
                 <button onClick={() => onSelectGame('additionWithCarry')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-emerald-50 hover:border-emerald-400">
                    <span className="text-2xl font-bold text-emerald-500 w-12 text-center">2</span>
                    <div>
                        <h2 className="text-lg text-slate-800">Eldeli Toplama</h2>
                        <p className="text-sm text-slate-500">Elde kullanarak toplama alıştırması yapın.</p>
                    </div>
                </button>
                 <button onClick={() => onSelectGame('additionProblem')} className="w-full text-left flex items-center gap-4 p-4 rounded-lg font-semibold border-2 transition-all duration-200 bg-slate-50 border-slate-200 hover:bg-cyan-50 hover:border-cyan-400">
                    <span className="text-2xl font-bold text-cyan-500 w-12 text-center">3</span>
                    <div>
                        <h2 className="text-lg text-slate-800">Toplama Problemleri</h2>
                        <p className="text-sm text-slate-500">Okuduğunu anlama ve toplama becerilerini birleştir.</p>
                    </div>
                </button>
            </div>
             <div className="flex justify-center pt-4">
                <button onClick={onBackToMenu} className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-500 rounded-lg shadow-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75">
                    <Home className="w-5 h-5" /> Ana Menü
                </button>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [gameMode, setGameMode] = useState<GameMode | 'menu'>('menu');

    const [additionQuestions, setAdditionQuestions] = useState(generateAdditionGameData());
    const [placeValueQuestions] = useState(placeValueGameData);

    const handleSelectGame = (mode: GameMode) => {
        if (mode === 'addition') {
            setAdditionQuestions(generateAdditionGameData());
        }
        setGameMode(mode);
    };

    const handleBackToMenu = () => setGameMode('menu');
    
    const renderGame = () => {
        switch (gameMode) {
            case 'coloring': return <ColoringGame onBackToMenu={handleBackToMenu} />;
            case 'rounding': return <RoundingGame onBackToMenu={handleBackToMenu} />;
            case 'sorting': return <SortingGame onBackToMenu={handleBackToMenu} />;
            case 'rhythmic': return <RhythmicCountingGame onBackToMenu={handleBackToMenu} />;
            case 'addition': return <TextBasedGame onNewGame={() => handleSelectGame('addition')} onBackToMenu={handleBackToMenu} title="Toplama ile Sayı Bulma" questions={additionQuestions} />;
            case 'placeValue': return <TextBasedGame onNewGame={() => {}} onBackToMenu={handleBackToMenu} title="Basamak Değeri ile Sayı Bulma" questions={placeValueQuestions} />;
            case 'oddEven': return <OddEvenGame onBackToMenu={handleBackToMenu} />;
            case 'romanNumerals': return <RomanNumeralGame onBackToMenu={handleBackToMenu} />;
            case 'decomposition': return <DecompositionGame onBackToMenu={handleBackToMenu} />;
            case 'additionMenu': return <AdditionMenu onSelectGame={handleSelectGame} onBackToMenu={handleBackToMenu} />;
            case 'additionWithoutCarry': return <AdditionGame type="without-carry" onBackToMenu={() => setGameMode('additionMenu')} />;
            case 'additionWithCarry': return <AdditionGame type="with-carry" onBackToMenu={() => setGameMode('additionMenu')} />;
            case 'additionProblem': return <AdditionProblemGame onBackToMenu={() => setGameMode('additionMenu')} />;
            case 'menu':
            default: return <MainMenu onSelectGame={handleSelectGame} />;
        }
    };

    const GameWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        // All games use a centered layout.
        return <div className="w-full flex items-center justify-center p-4">{children}</div>;
    };


    return (
        <main className="h-screen w-full flex flex-col bg-gradient-to-br from-indigo-200 via-sky-200 to-purple-200">
             <GameWrapper>{renderGame()}</GameWrapper>
        </main>
    );
};

export default App;
