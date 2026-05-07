import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy,
  onSnapshot, 
  addDoc, 
  updateDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { geminiService, QuizQuestion } from '../lib/gemini';
import { Note, Quiz } from '../types';
import { 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Trophy,
  ArrowRight,
  RotateCcw,
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  note: Note;
  onBack: () => void;
}

export default function QuizView({ note, onBack }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'notes', note.id, 'quizzes'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty && questions.length === 0) {
        const latestDoc = snapshot.docs[0];
        const data = latestDoc.data();
        setActiveQuizId(latestDoc.id);
        setQuestions(data.questions || []);
        if (data.completed) {
          setAnswers(data.answers || []);
          setIsFinished(true);
        }
      }
      setLoading(false);
    }, (err) => {
      console.error("Quiz Fetch Error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [note.id, questions.length]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsFinished(false);
    setCurrentIndex(0);
    setAnswers([]);
    try {
      const generated = await geminiService.generateQuiz(note.title, note.content);
      setQuestions(generated);
      
      // Save new quiz to Firestore
      const docRef = await addDoc(collection(db, 'notes', note.id, 'quizzes'), {
        questions: generated,
        userId: note.userId,
        noteId: note.id,
        completed: false,
        createdAt: serverTimestamp()
      });
      setActiveQuizId(docRef.id);
    } catch (err) {
      console.error("Quiz generation failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = async (option: string) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = option;
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex(currentIndex + 1), 300);
    } else {
      setIsFinished(true);
      // Update completion in Firestore for the active quiz
      if (activeQuizId) {
        try {
          const score = questions.reduce((acc, q, idx) => acc + (newAnswers[idx] === q.correctAnswer ? 1 : 0), 0);
          await updateDoc(doc(db, 'notes', note.id, 'quizzes', activeQuizId), {
            completed: true,
            answers: newAnswers,
            score: score,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Failed to save quiz results", err);
        }
      }
    }
  };

  const score = questions.reduce((acc, q, idx) => {
    return acc + (answers[idx] === q.correctAnswer ? 1 : 0);
  }, 0);

  const percentage = Math.round((score / questions.length) * 100);

  if (loading) return null;

  return (
    <div className="flex flex-col h-full bg-[#05070A] text-slate-100 font-sans">
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#080B12]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-white/10">
            <ArrowLeft size={20} />
          </button>
          <div>
             <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Quiz</div>
             <h2 className="text-sm font-bold text-slate-200">{note.title}</h2>
          </div>
        </div>
        
        {questions.length > 0 && !isFinished && (
          <div className="flex flex-col items-end gap-1.5 min-w-48">
             <div className="flex justify-between w-full px-1">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress</span>
               <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
             </div>
             <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
             </div>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
        
        <AnimatePresence mode="wait">
          {questions.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-sm relative z-10"
            >
              <div className="w-24 h-24 bg-cyan-400/10 rounded-[40px] border border-cyan-400/20 flex items-center justify-center mb-8 mx-auto shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                <BrainCircuit size={48} className="text-cyan-400" />
              </div>
              <h3 className="text-3xl font-black italic mb-4 text-white">Quiz</h3>
              <p className="text-slate-400 mb-10 leading-relaxed">
                Test your knowledge with a quiz generated from your notes.
              </p>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                {isGenerating ? "Loading..." : "Start Quiz"}
              </button>
            </motion.div>
          ) : isFinished ? (
            <motion.div 
              key="finished"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0D121A] p-16 rounded-[64px] shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-white/10 text-center max-w-2xl w-full relative z-10"
            >
              <div className="w-28 h-28 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-[40px] flex items-center justify-center mb-10 mx-auto shadow-[0_0_40px_rgba(6,182,212,0.3)]">
                <Trophy size={56} className="text-white" />
              </div>
              <h3 className="text-5xl font-black italic mb-4 text-white">Results</h3>
              <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] mb-12">Score</p>
              
              <div className="grid grid-cols-2 gap-8 mb-16 px-8">
                <div className="text-center p-8 bg-white/5 rounded-[32px] border border-white/5">
                  <p className="text-6xl font-black text-white">{score}<span className="text-slate-600">/</span>{questions.length}</p>
                  <p className="text-[10px] text-slate-500 mt-3 font-black uppercase tracking-widest">Points Secured</p>
                </div>
                <div className="text-center p-8 bg-white/5 rounded-[32px] border border-white/10 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-cyan-400/5 group-hover:bg-cyan-400/10 transition-colors" />
                  <p className="text-6xl font-black text-cyan-400 relative z-10">{percentage}%</p>
                  <p className="text-[10px] text-cyan-400/50 mt-3 font-black uppercase tracking-widest relative z-10 text-center">Efficiency Rating</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={handleGenerate}
                  className="py-5 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  Regenerate Questions
                </button>
                <button 
                  onClick={onBack}
                  className="py-5 bg-white/5 text-slate-400 hover:text-white rounded-3xl font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-white/10 transition-all"
                >
                  Finalize Review
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="question"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-3xl relative z-10"
            >
              <div className="bg-[#0D121A] border border-white/5 p-12 md:p-16 rounded-[64px] shadow-[0_40px_80px_rgba(0,0,0,0.4)]">
                 <div className="flex items-center gap-4 mb-12">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 text-sm font-black">
                       {currentIndex + 1}
                    </div>
                    <div className="h-px flex-1 bg-white/5" />
                    <HelpCircle className="text-slate-700" size={24} />
                 </div>

                 <h3 className="text-3xl md:text-4xl font-bold leading-tight mb-16 text-white min-h-[140px]">
                   {questions[currentIndex].question}
                 </h3>

                 <div className="grid grid-cols-1 gap-4">
                   {questions[currentIndex].options.map((option, idx) => (
                     <motion.button 
                       whileHover={{ x: 8, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }}
                       whileTap={{ scale: 0.99 }}
                       key={idx}
                       onClick={() => handleAnswer(option)}
                       className={clsx(
                         "group p-6 text-left rounded-[32px] border-2 transition-all flex items-center justify-between",
                         answers[currentIndex] === option 
                           ? "bg-cyan-500 border-cyan-500 text-black shadow-[0_0_30px_rgba(34,211,238,0.2)]" 
                           : "bg-white/5 border-white/5 hover:border-white/20 text-slate-300"
                       )}
                     >
                       <span className="font-bold text-lg">{option}</span>
                       <div className={clsx(
                         "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                         answers[currentIndex] === option 
                           ? "border-black/20 bg-white/20" 
                           : "border-white/10 group-hover:border-white/30"
                       )}>
                         {answers[currentIndex] === option && <CheckCircle2 size={16} />}
                       </div>
                     </motion.button>
                   ))}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function clsx(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
