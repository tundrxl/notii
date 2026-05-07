import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { geminiService } from '../lib/gemini';
import { Note, Flashcard } from '../types';
import { 
  ArrowLeft, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  note: Note;
  onBack: () => void;
}

export default function FlashcardView({ note, onBack }: Props) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'notes', note.id, 'flashcards'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Flashcard));
      setCards(fetchedCards);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [note.id]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await geminiService.generateFlashcards(note.title, note.content);
      for (const card of generated) {
        await addDoc(collection(db, 'notes', note.id, 'flashcards'), {
          ...card,
          userId: note.userId,
          noteId: note.id,
          mastery: 0,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Card generation failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const nextCard = () => {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const prevCard = () => {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  if (loading) return null;

  return (
    <div className="flex flex-col h-full bg-[#05070A] text-slate-100 font-sans">
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#080B12]/80 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-white/10">
            <ArrowLeft size={20} />
          </button>
          <div>
             <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Cards</div>
             <h2 className="text-sm font-bold text-slate-200">{note.title}</h2>
          </div>
        </div>
        {!isGenerating && cards.length > 0 && (
          <button 
            onClick={handleGenerate} 
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-400/20 px-4 py-2 rounded-xl bg-cyan-400/5 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
          >
            <Sparkles size={14} />
            Update
          </button>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
        
        <AnimatePresence mode="wait">
          {cards.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-sm relative z-10"
            >
              <div className="w-24 h-24 bg-cyan-400/10 rounded-[40px] border border-cyan-400/20 flex items-center justify-center mb-8 mx-auto shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                <Sparkles size={48} className="text-cyan-400" />
              </div>
              <h3 className="text-3xl font-black italic mb-4 text-white">No Cards</h3>
              <p className="text-slate-400 mb-10 leading-relaxed">
                Generate cards to help you study.
              </p>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                {isGenerating ? "Loading..." : "Generate"}
              </button>
            </motion.div>
          ) : (
            <div className="w-full max-w-2xl flex flex-col items-center gap-16 relative z-10">
              <div className="relative w-full h-[450px] perspective-2000">
                <motion.div 
                  className="relative w-full h-full preserve-3d cursor-pointer"
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  onClick={() => setFlipped(!flipped)}
                >
                  {/* Front */}
                  <div className="absolute inset-0 backface-hidden bg-[#0D121A] border border-white/10 rounded-[48px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-16 text-center">
                    <div className="absolute top-10 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_cyan]" />
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Query</span>
                    </div>
                    <p className="text-3xl font-bold leading-tight text-white">{cards[currentIndex].front}</p>
                    <div className="absolute bottom-10 flex items-center gap-2 text-slate-600 animate-pulse">
                       <span className="text-[10px] font-black uppercase tracking-[0.4em]">Initialize Flip</span>
                    </div>
                  </div>
                  {/* Back */}
                  <div className="absolute inset-0 backface-hidden bg-gradient-to-tr from-cyan-600 to-blue-700 text-white rounded-[48px] shadow-[0_0_50px_rgba(6,182,212,0.3)] flex flex-col items-center justify-center p-16 text-center rotate-y-180">
                    <div className="absolute top-10 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_white]" />
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Response</span>
                    </div>
                    <p className="text-2xl font-medium leading-relaxed">{cards[currentIndex].back}</p>
                    <div className="absolute bottom-10 bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/20">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Validated Mastery</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="flex items-center gap-12">
                <button onClick={prevCard} className="w-16 h-16 bg-[#0D121A] border border-white/10 rounded-3xl hover:bg-white/5 text-slate-500 hover:text-white transition-all flex items-center justify-center group">
                  <ChevronLeft size={28} className="group-active:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center gap-2">
                   <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Progress</div>
                   <div className="px-6 py-2 bg-cyan-400/10 border border-cyan-400/20 rounded-full text-xs font-black text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                     {currentIndex + 1} <span className="text-slate-600 italic mx-1">OF</span> {cards.length}
                   </div>
                </div>
                <button onClick={nextCard} className="w-16 h-16 bg-[#0D121A] border border-white/10 rounded-3xl hover:bg-white/5 text-slate-500 hover:text-white transition-all flex items-center justify-center group">
                  <ChevronRight size={28} className="group-active:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .perspective-2000 { perspective: 2000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
