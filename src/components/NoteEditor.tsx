import React, { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { geminiService, WeakPoint as AIWeakPoint } from '../lib/gemini';
import { Note } from '../types';
import { 
  ArrowLeft, 
  Sparkles, 
  BrainCircuit, 
  Flame, 
  Trash2,
  AlertCircle,
  Eye,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';

interface Props {
  note: Note;
  onClose: () => void;
  onStudyCards: () => void;
  onTakeQuiz: () => void;
}

export default function NoteEditor({ note, onClose, onStudyCards, onTakeQuiz }: Props) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [localWeakPoints, setLocalWeakPoints] = useState<AIWeakPoint[]>(note.weakPoints || []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (title !== note.title || content !== note.content) {
        setIsSaving(true);
        try {
          await updateDoc(doc(db, 'notes', note.id), {
            title,
            content,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `notes/${note.id}`);
        } finally {
          setIsSaving(false);
        }
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [title, content, note.id, note.title, note.content]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const results = await geminiService.analyzeNote(title, content);
      setLocalWeakPoints(results);
      await updateDoc(doc(db, 'notes', note.id), {
        weakPoints: results,
        updatedAt: serverTimestamp()
      });
      setShowAnalysis(true);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this note?")) {
      try {
        await deleteDoc(doc(db, 'notes', note.id));
        onClose();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `notes/${note.id}`);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#05070A] text-slate-100">
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#080B12]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-6 shrink-0">
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-white/10"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-extrabold bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-700 text-white"
              placeholder="Note Title"
            />
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                {isSaving ? "Saving..." : "Saved"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPreview(!isPreview)}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/10"
          >
            {isPreview ? <Edit3 size={14} /> : <Eye size={14} />}
            {isPreview ? "Edit" : "Preview"}
          </button>
          
          <div className="h-6 w-px bg-white/5 mx-2" />
          
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !content.trim()}
            className="group flex items-center gap-2 px-5 py-2.5 bg-cyan-400 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-300 transition-all disabled:opacity-30 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
          >
            {isAnalyzing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <Sparkles size={16} />
              </motion.div>
            ) : <Sparkles size={16} className="group-hover:scale-110 transition-transform" />}
            Analyze
          </button>

          {!showAnalysis && localWeakPoints.length > 0 && (
             <button 
               onClick={() => setShowAnalysis(true)}
               className="p-2.5 text-amber-400 hover:bg-amber-400/10 rounded-xl transition-colors border border-amber-400/20"
             >
               <AlertCircle size={20} />
             </button>
          )}

          <div className="h-6 w-px bg-white/5 mx-2" />
          
          <button 
            onClick={onStudyCards}
            className="p-2.5 text-orange-400 hover:bg-orange-400/10 rounded-xl transition-colors border border-transparent hover:border-orange-400/20"
            title="Study Flashcards"
          >
            <Flame size={20} />
          </button>
          <button 
            onClick={onTakeQuiz}
            className="p-2.5 text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-colors border border-transparent hover:border-indigo-400/20"
            title="Take AI Quiz"
          >
            <BrainCircuit size={20} />
          </button>
          <button 
            onClick={handleDelete}
            className="p-2.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-16 bg-[#05070A]">
          <div className="max-w-4xl mx-auto min-h-full">
            {isPreview ? (
              <div className="prose prose-invert prose-lg max-w-none text-slate-300 font-sans leading-relaxed">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            ) : (
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="The process of learning begins here..."
                className="w-full h-full min-h-[70vh] bg-transparent border-none outline-none focus:ring-0 text-xl leading-relaxed resize-none font-sans placeholder:text-slate-800 text-slate-200"
              />
            )}
          </div>
        </div>

        <AnimatePresence>
          {showAnalysis && (
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-[400px] border-l border-white/5 bg-[#080B12] flex flex-col shrink-0"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#080B12] sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs">Insights</h3>
                </div>
                <button onClick={() => setShowAnalysis(false)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-lg border border-white/10 transition-all">
                  <ArrowLeft size={16} className="rotate-180" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-8 space-y-6">
                {localWeakPoints.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-slate-600">
                       <BrainCircuit size={32} />
                    </div>
                    <p className="text-slate-500 text-sm font-medium italic">Analyze your notes to find gaps.</p>
                  </div>
                ) : (
                  localWeakPoints.map((wp, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      key={idx} 
                      className="p-6 bg-[#0D121A] border border-white/5 rounded-3xl shadow-xl"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={clsx(
                          "w-2 h-2 rounded-full",
                          wp.severity === 'high' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                          wp.severity === 'medium' ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" :
                          "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                        )} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          {wp.severity} Priority
                        </span>
                      </div>
                      <p className="font-bold text-slate-200 text-sm leading-snug mb-4">{wp.point}</p>
                      <div className="bg-[#05070A] p-4 rounded-2xl border border-white/5">
                        <p className="text-xs text-slate-400 leading-relaxed italic">
                           {wp.suggestion}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
                
                <div className="pt-8 space-y-4">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="h-px flex-1 bg-white/5" />
                      <p className="text-[10px] uppercase font-black text-slate-600 tracking-[0.3em]">Mastery Tools</p>
                      <div className="h-px flex-1 bg-white/5" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <button onClick={onStudyCards} className="p-6 bg-[#0D121A] text-orange-400 rounded-3xl flex flex-col items-center gap-3 hover:bg-[#141A24] transition-all border border-white/5 hover:border-orange-400/20 group">
                        <Flame size={28} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cards</span>
                      </button>
                      <button onClick={onTakeQuiz} className="p-6 bg-[#0D121A] text-indigo-400 rounded-3xl flex flex-col items-center gap-3 hover:bg-[#141A24] transition-all border border-white/5 hover:border-indigo-400/20 group">
                        <BrainCircuit size={28} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Quiz</span>
                      </button>
                   </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

