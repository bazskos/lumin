/**
 * @file FlashcardPage.tsx
 * @description Tanulókártyák (Flashcards) interaktív megjelenítése.
 * A fogalmak gyors memorizálását segíti elő 3D forgatási (flip) animációkkal.
 */
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ChevronLeft, ChevronRight, Layers, RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CardData {
  front: string;
  back: string;
}

const FlashcardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { cards: CardData[] } | null;
  
  const [cards, setCards] = useState<CardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (!state?.cards || state.cards.length === 0) {
      navigate('/dashboard');
      return;
    }
    setCards(state.cards);
  }, [state, navigate]);

const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            triggerConfetti();
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        }
    }, 200); 
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex(prev => prev - 1);
        }, 200);
    }
  };

  const handleFlip = () => setIsFlipped(!isFlipped);

  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  if (cards.length === 0) return <div className="min-h-screen bg-[#0f1014]"/>;

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="min-h-screen bg-[#0f1014] flex flex-col items-center font-sans text-white relative overflow-hidden">
       
       <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-900/10 blur-[150px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/10 blur-[150px]"></div>
        </div>

       <div className="relative z-10 w-full max-w-4xl mx-auto p-6 flex items-center justify-between">
            <button onClick={() => navigate('/dashboard')} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex-1 mx-8">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                    <span>Kártyák</span>
                    <span>{currentIndex + 1} / {cards.length}</span>
                </div>
                <div className="h-2 w-full bg-[#1a1b23] rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(20,184,166,0.5)]" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Layers className="w-5 h-5" />
            </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center w-full p-4 perspective-1000">
        
        <div 
            className={`relative w-full max-w-xl h-96 cursor-pointer group transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
            onClick={handleFlip}
        >
            
            <div className="absolute inset-0 backface-hidden bg-[#1a1b23] border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 hover:border-emerald-500/30 hover:shadow-emerald-500/10 transition-all">
                <div className="absolute top-6 left-6 text-xs font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    Fogalom
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white text-center leading-snug drop-shadow-lg">
                    {currentCard.front}
                </h2>
                <div className="absolute bottom-6 flex items-center text-slate-500 text-sm animate-pulse">
                    <RotateCw className="w-4 h-4 mr-2"/> Kattints a fordításhoz
                </div>
            </div>

            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-emerald-900/40 to-[#1a1b23] border border-emerald-500/30 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8">
                <div className="absolute top-6 left-6 text-xs font-bold text-emerald-200 uppercase tracking-widest bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                    Magyarázat
                </div>
                <p className="text-xl font-medium text-slate-100 text-center leading-relaxed">
                    {currentCard.back}
                </p>
            </div>

        </div>
      </div>

      <div className="relative z-10 flex items-center gap-6 mb-12">
        <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
            disabled={currentIndex === 0}
            className="p-4 rounded-2xl bg-[#1a1b23] hover:bg-[#252630] border border-white/5 transition text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
        >
            <ChevronLeft className="w-8 h-8"/>
        </button>

        <button 
            onClick={(e) => { e.stopPropagation(); handleFlip(); }} 
            className="p-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 transition transform hover:scale-110 active:scale-90 text-white"
        >
            <RefreshCw className={`w-8 h-8 ${isFlipped ? 'rotate-180' : ''} transition duration-500`}/>
        </button>

        <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }} 
            className="p-4 rounded-2xl bg-[#1a1b23] hover:bg-[#252630] border border-white/5 transition text-slate-400 hover:text-white disabled:opacity-30 hover:scale-105 active:scale-95"
        >
            <ChevronRight className="w-8 h-8"/>
        </button>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default FlashcardPage;