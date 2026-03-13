import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Trophy, Brain } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';

interface Question {
    question: string;
    options: string[];
    correct_answer: string;
}

const QuizPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const quizData = location.state as { questions: Question[]; quizId?: number } | null;

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [shake, setShake] = useState(false);

    useEffect(() => {
        if (!quizData || !quizData.questions || quizData.questions.length === 0) {
            navigate('/dashboard');
        }
    }, [quizData, navigate]);

    if (!quizData || !quizData.questions) return null;

    const questions = quizData.questions;
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / questions.length) * 100;
    const saveResult = async (finalScore: number) => {
        try {
            await api.post('/stats/save', {
                type: 'Kvíz',
                score: finalScore,
                max_score: questions.length
            });
        } catch (error) { 
            console.error("Mentési hiba:", error); 
        }
    };

    const handleAnswerClick = (option: string) => {
        if (isAnswered) return;

        setSelectedOption(option);
        setIsAnswered(true);

        const optionIndex = currentQuestion.options.indexOf(option);
        const optionLetter = String.fromCharCode(65 + optionIndex);

        const isCorrect = 
            option.trim() === currentQuestion.correct_answer.trim() || 
            optionLetter === currentQuestion.correct_answer.trim();

        if (isCorrect) {
            setScore(score + 1);
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }

        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setSelectedOption(null);
                setIsAnswered(false);
            } else {
                setShowResult(true);
                saveResult(isCorrect ? score + 1 : score);
            }
        }, 1500);
    };

    const checkIsCorrect = (option: string) => {
        const optionIndex = currentQuestion.options.indexOf(option);
        const optionLetter = String.fromCharCode(65 + optionIndex);
        return option.trim() === currentQuestion.correct_answer.trim() || 
               optionLetter === currentQuestion.correct_answer.trim();
    };

    if (showResult) {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        const percentage = Math.round((score / questions.length) * 100);
        let message = "Gyakorlás teszi a mestert!";
        if (percentage > 80) message = "Zseniális teljesítmény! 🔥";
        else if (percentage > 50) message = "Szép munka, csak így tovább! 👍";

        return (
            <div className="min-h-screen bg-[#0f1014] flex items-center justify-center p-4 font-sans relative overflow-hidden text-white">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
                
                <div className="bg-[#1a1b23]/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 max-w-md w-full text-center relative z-10 animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                        <Trophy className="w-12 h-12 text-white" />
                    </div>
                    
                    <h2 className="text-3xl font-bold mb-2">Kvíz Befejezve!</h2>
                    <p className="text-slate-400 mb-8">{message}</p>
                    
                    <div className="bg-[#0f1014] rounded-2xl p-6 mb-8 border border-white/5">
                        <div className="text-sm text-slate-500 uppercase tracking-widest font-bold mb-2">Eredményed</div>
                        <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            {score} / {questions.length}
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-400">{percentage}% helyes</div>
                    </div>

                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                    >
                        Vissza a Dashboardra
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1014] text-white flex flex-col font-sans relative overflow-y-auto overflow-x-hidden">
            
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/10 blur-[150px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[150px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto p-6 flex items-center justify-between">
                <button onClick={() => navigate('/dashboard')} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition text-slate-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex-1 mx-8">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                        <span>Haladás</span>
                        <span>{currentQuestionIndex + 1} / {questions.length}</span>
                    </div>
                    <div className="h-2 w-full bg-[#1a1b23] rounded-full overflow-hidden border border-white/5">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Brain className="w-5 h-5" />
                </div>
            </div>

            {}
            <div className={`relative z-10 flex-1 flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full ${shake ? 'animate-shake' : ''}`}>
                
                <div className="w-full bg-[#1a1b23]/60 backdrop-blur-md border border-white/10 p-10 rounded-[30px] shadow-2xl mb-10 min-h-[200px] flex items-center justify-center">
                    <h2 className="text-2xl md:text-4xl font-bold text-center leading-snug text-white">
                        {currentQuestion.question}
                    </h2>
                </div>

                <div className="w-full grid gap-4 md:grid-cols-2">
                    {currentQuestion.options.map((option, index) => {
                        
                        let buttonStyle = "border-white/10 bg-[#1a1b23] hover:border-indigo-500/50 hover:bg-[#20212e] text-slate-300"; 
                        let icon = null;

                        if (isAnswered) {
                            const isThisCorrect = checkIsCorrect(option);
                            
                            if (isThisCorrect) {
                                buttonStyle = "border-green-500 bg-green-900/20 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.2)]";
                                icon = <Check className="w-6 h-6 ml-auto text-green-400" />;
                            } else if (option === selectedOption) {
                                buttonStyle = "border-red-500 bg-red-900/20 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.2)]";
                                icon = <X className="w-6 h-6 ml-auto text-red-400" />;
                            } else {
                                buttonStyle = "border-transparent bg-transparent text-slate-600 opacity-30";
                            }
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => handleAnswerClick(option)}
                                disabled={isAnswered}
                                className={`
                                    group relative w-full p-6 rounded-2xl border-2 text-left font-bold text-lg transition-all duration-200 flex items-center
                                    ${buttonStyle}
                                    ${!isAnswered && "hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-indigo-500/10"}
                                `}
                            >
                                <span className={`mr-5 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border transition-colors ${
                                    isAnswered && (checkIsCorrect(option) || option === selectedOption) 
                                    ? 'border-current bg-current/10' 
                                    : 'border-white/10 bg-white/5 text-slate-500 group-hover:border-indigo-500 group-hover:text-indigo-400'
                                }`}>
                                    {String.fromCharCode(65 + index)}
                                </span>
                                {option}
                                {icon}
                            </button>
                        );
                    })}
                </div>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-3px); }
                    75% { transform: translateX(3px); }
                }
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default QuizPage;