/**
 * @file CompletionPage.tsx
 * @description "Lyukas szöveg" (Sentence Completion) AI alapú feladattípus felülete.
 * A tanulóknak a hiányzó szavakat kell kiegészíteniük, melyeket az AI értékel ki valós időben
 * szemantikai egyezés alapján.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Loader2, Send, Trophy, Type } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';

interface Exercise {
  part_before: string;
  hidden_part: string;
  part_after: string;
}

interface Evaluation {
  is_correct: boolean;
  feedback: string;
}

const CompletionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const state = location.state as { exercises: Exercise[], noteId: number } | null;
  const exercises = useMemo(() => state?.exercises ?? [], [state?.exercises]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!showResult) return;

    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, [showResult]);

  useEffect(() => {
    if (!exercises || exercises.length === 0) {
      navigate('/dashboard');
    }
  }, [exercises, navigate]);

  const handleCheck = async () => {
    if (!userAnswer.trim()) return;
    setIsChecking(true);

    try {
      const currentEx = exercises[currentIndex];

      const response = await api.post('/ai/completion/check', { 
           user_answer: userAnswer, 
           correct_answer: currentEx.hidden_part 
      });

      const data = response.data;
      
      let evalResult;
      try {
        evalResult = typeof data.evaluation === 'string' ? JSON.parse(data.evaluation) : data.evaluation;
      } catch (e) {
        console.error("JSON Parse hiba:", e);
        evalResult = { is_correct: false, feedback: "Hiba az AI válasz feldolgozásakor." };
      }
      
      setEvaluation(evalResult);
      
      if (evalResult.is_correct) {
        setScore(score + 1);
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }

    } catch (error) {
      console.error("Hiba:", error);
      alert("Hiba az ellenőrzéskor");
    } finally {
      setIsChecking(false);
    }
  };

const saveResult = async (finalScore: number) => {
    try {
        await api.post('/stats/save', {
            type: 'Lyukas Szöveg',
            score: finalScore,
            max_score: exercises.length
        });
    } catch (error) { console.error("Mentési hiba:", error); }
  };

  const handleNext = () => {
    setEvaluation(null);
    setUserAnswer('');
    
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResult(true);
      saveResult(score);
    }
  };

  if (showResult) {
    const percentage = Math.round((score / exercises.length) * 100);

    return (
        <div className="min-h-screen bg-[#0f1014] flex items-center justify-center p-4 font-sans relative overflow-hidden text-white">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
            
            <div className="bg-[#1a1b23]/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 max-w-md w-full text-center relative z-10 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                    <Trophy className="w-12 h-12 text-white" />
                </div>
                
                <h2 className="text-3xl font-bold mb-2">Gyakorlás vége!</h2>
                <p className="text-slate-400 mb-8">A mondatok a helyükre kerültek.</p>
                
                <div className="bg-[#0f1014] rounded-2xl p-6 mb-8 border border-white/5">
                    <div className="text-sm text-slate-500 uppercase tracking-widest font-bold mb-2">Eredményed</div>
                    <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                        {score} / {exercises.length}
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-400">{percentage}% helyes</div>
                </div>

                <button 
                    onClick={() => navigate('/dashboard')} 
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                >
                    Vissza a Dashboardra
                </button>
            </div>
        </div>
    );
  }

  if (exercises.length === 0) return <div className="min-h-screen bg-[#0f1014]"/>;

  const currentEx = exercises[currentIndex];
  const progress = ((currentIndex) / exercises.length) * 100;

  return (
    <div className="min-h-screen bg-[#0f1014] text-white flex flex-col font-sans relative overflow-y-auto overflow-x-hidden">
        
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-orange-900/10 blur-[150px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-900/10 blur-[150px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-3xl mx-auto p-6 flex items-center justify-between shrink-0">
            <button onClick={() => navigate('/dashboard')} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex-1 mx-8">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                    <span>Haladás</span>
                    <span>{currentIndex + 1} / {exercises.length}</span>
                </div>
                <div className="h-2 w-full bg-[#1a1b23] rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(244,114,182,0.5)]" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Type className="w-5 h-5" />
            </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 max-w-3xl mx-auto w-full">
            
            <div className={`w-full bg-[#1a1b23]/60 backdrop-blur-md border border-white/10 p-8 md:p-12 rounded-[30px] shadow-2xl flex flex-col items-center justify-center min-h-[300px] ${shake ? 'animate-shake' : ''}`}>
                
                <h2 className="text-xl text-slate-400 font-medium mb-8 uppercase tracking-widest text-center">Egészítsd ki a gondolatot:</h2>
                
                <div className="text-2xl md:text-3xl font-bold text-slate-200 leading-loose text-center">
                    <span>{currentEx.part_before} </span>
                    
                    <span className="relative inline-block mx-2">
                        <input 
                            type="text"
                            value={userAnswer}
                            onChange={(e) => !evaluation && setUserAnswer(e.target.value)}
                            disabled={!!evaluation}
                            className={`
                                bg-transparent border-b-4 outline-none text-center font-extrabold min-w-[150px] w-[200px] px-2 py-1 transition-all duration-300 pr-10
                                ${evaluation 
                                    ? (evaluation.is_correct ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400')
                                    : 'border-orange-500/50 text-orange-400 focus:border-orange-500 focus:w-[250px] focus:shadow-[0_10px_20px_-10px_rgba(249,115,22,0.3)]'
                                }
                            `}
                            placeholder="..."
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && userAnswer && !evaluation && handleCheck()}
                        />
                        {evaluation && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                {evaluation.is_correct 
                                    ? <Check className="w-6 h-6 text-green-500 animate-in zoom-in duration-300"/> 
                                    : <X className="w-6 h-6 text-red-500 animate-in zoom-in duration-300"/>}
                            </div>
                        )}
                    </span>

                    <span> {currentEx.part_after}</span>
                </div>

                <div className="min-h-[140px] w-full flex items-center justify-center mt-8">
                {evaluation ? (
                    <div className={`w-full p-4 rounded-xl border animate-in slide-in-from-bottom-2 duration-300 ${evaluation.is_correct ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="flex items-start">
                            <div className="flex-1">
                                <p className={`font-bold text-lg mb-1 ${evaluation.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                                    {evaluation.is_correct ? "Helyes!" : "Nem egészen."}
                                </p>
                                <p className="text-sm text-slate-300">{evaluation.feedback}</p>
                                
                                {!evaluation.is_correct && (
                                    <div className="mt-3 text-sm">
                                        <span className="text-slate-500 uppercase font-bold text-xs">Helyes megoldás: </span>
                                        <span className="text-white font-bold">{currentEx.hidden_part}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full"></div>
                )}
                </div>

            </div>
            
            <div className="w-full mt-8">
                {!evaluation ? (
                    <button 
                        onClick={handleCheck} 
                        disabled={isChecking || !userAnswer}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-orange-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
                    >
                        {isChecking ? <Loader2 className="animate-spin w-6 h-6"/> : <><Send className="w-5 h-5 mr-2"/> Ellenőrzés</>}
                    </button>
                ) : (
                    <button 
                        onClick={handleNext} 
                        className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg transition-all duration-300 border border-white/10 hover:border-white/20"
                    >
                        Következő
                    </button>
                )}
            </div>

        </div>

        <style>{`
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            .animate-shake {
                animation: shake 0.3s ease-in-out;
            }
        `}</style>
    </div>
  );
};

export default CompletionPage;