/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { Note, AppView } from './types';
import { 
  Plus, 
  BrainCircuit, 
  Flame, 
  LogOut,
  Search,
  ChevronRight,
  Sparkles,
  Home,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// NavItem removed favoring SideNavItem

import NoteEditor from './components/NoteEditor';
import FlashcardView from './components/FlashcardView';
import QuizView from './components/QuizView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [notesError, setNotesError] = useState<string | null>(null);

  useEffect(() => {
    // Immediate check
    if (auth.currentUser) {
      setUser(auth.currentUser);
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("Auth State Changed:", u?.email || "No User");
      setUser(u);
      setLoading(false);
      if (u) {
        setIsLoggingIn(false);
        setAuthError(null);
      }
    }, (error) => {
      console.error("Auth Subscription Error:", error);
      setAuthError(error.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setNotesError(null);
      return;
    }

    // Simplified query to avoid index issues
    const q = query(
      collection(db, 'notes'), 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Note));
      // Manual sorting if needed
      fetchedNotes.sort((a, b) => {
        const dateA = a.updatedAt?.toDate?.()?.getTime() || 0;
        const dateB = b.updatedAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
      setNotes(fetchedNotes);
      setNotesError(null);
    }, (err) => {
      console.error("Notes Fetch Error:", err);
      setNotesError("Failed to sync your library. Please check your connection.");
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    setAuthError(null);
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    // Hint to Firebase to use a popup and handle the redirect flow gracefully
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setUser(result.user);
      }
    } catch (err: any) {
      console.error("Login failed", err);
      let message = "Authentication failed. ";
      if (err.code === 'auth/popup-blocked') {
        message += "Please enable popups for this site.";
      } else if (err.code === 'auth/popup-closed-by-user') {
        message += "Login window was closed before completion.";
      } else {
        message += err.message || "Unknown error occurred.";
      }
      setAuthError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateNote = async () => {
    if (!user) return;
    try {
      const newNote = {
        title: 'Untitled Note',
        content: '',
        userId: user.uid,
        tags: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'notes'), newNote);
      setActiveNoteId(docRef.id);
      setView('editor');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'notes');
    }
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#05070A]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)]"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#05070A] px-4 text-center overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/10 to-cyan-600/10 pointer-events-none" />
        <div className="mb-8 flex flex-col items-center gap-6 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.3)]">
            <Sparkles size={40} className="text-white" />
          </div>
          <h1 className="text-[96px] font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 font-sans py-2 text-left w-[210.141px]">Notii</h1>
        </div>
        <h2 className="mb-4 text-3xl font-bold text-white relative z-10">Master your notes.</h2>
        <p className="mb-12 max-w-md text-slate-400 text-lg relative z-10 leading-relaxed font-sans">
          Your AI-powered study partner.
        </p>
        
        {authError && (
          <div className="mb-6 px-6 py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2 relative z-10">
            {authError}
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="relative z-10 flex items-center gap-3 rounded-2xl bg-white px-10 py-4 font-bold text-black transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-cyan-500/20 disabled:opacity-50 disabled:scale-100"
        >
          {isLoggingIn ? (
            <>
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
              />
              Loading...
            </>
          ) : (
            <>
              Continue with Google
              <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#05070A] text-slate-100 overflow-hidden font-sans">
      <aside className="w-24 border-r border-white/5 flex flex-col items-center py-8 bg-[#06080D] shrink-0">
        <div className="mb-12 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.4)] text-white">
            <span className="font-black italic text-xl">N</span>
          </div>
        </div>

        <nav className="space-y-6 flex-1 flex flex-col items-center">
          <SideNavItem 
            icon={<Home size={24} />} 
            isActive={view === 'notes' || view === 'editor'} 
            onClick={() => setView('notes')} 
            label="Library"
          />
          <SideNavItem 
            icon={<Flame size={24} />} 
            isActive={view === 'flashcards'} 
            onClick={() => setView('flashcards')} 
            label="Cards"
          />
          <SideNavItem 
            icon={<BrainCircuit size={24} />} 
            isActive={view === 'test'} 
            onClick={() => setView('test')} 
            label="Quiz"
          />
        </nav>

        <div className="mt-auto space-y-6 flex flex-col items-center">
          <button 
             onClick={() => firebaseSignOut(auth)}
             className="p-3 text-slate-500 hover:text-white transition-colors"
             title="Sign Out"
          >
            <LogOut size={24} />
          </button>
          <img 
            src={user.photoURL || ''} 
            alt="avatar" 
            className="w-10 h-10 rounded-full border border-white/20 bg-slate-800"
          />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#080B12]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold italic bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Notii</h1>
             <div className="h-4 w-px bg-white/10" />
             <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
               {view === 'notes' ? 'Library' : activeNote?.title || 'Study'}
             </div>
          </div>
          <div className="flex items-center gap-6">
            {view === 'notes' && (
              <button 
                onClick={handleCreateNote}
                className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/5"
              >
                <Plus size={16} />
                New Note
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#05070A] relative">
          <AnimatePresence mode="wait">
            {view === 'notes' && (
              <motion.div 
                key="library"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-10 max-w-6xl mx-auto"
              >
                <div className="mb-12 relative max-w-2xl">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search"
                    className="w-full pl-16 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 ring-cyan-500/20 focus:border-white/10 transition-all outline-none text-lg text-white placeholder:text-slate-600"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {notesError && (
                  <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p className="font-medium">{notesError}</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="ml-auto px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-xs font-bold transition-all"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {notes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase())).map(note => (
                    <NoteCard 
                      key={note.id} 
                      note={note} 
                      onClick={() => {
                        setActiveNoteId(note.id);
                        setView('editor');
                      }} 
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {view === 'editor' && activeNote && (
              <NoteEditor 
                key="editor"
                note={activeNote} 
                onClose={() => setView('notes')} 
                onStudyCards={() => setView('flashcards')}
                onTakeQuiz={() => setView('test')}
              />
            )}

            {view === 'flashcards' && activeNote && (
              <FlashcardView 
                key="flashcards" 
                note={activeNote} 
                onBack={() => setView('editor')} 
              />
            )}

            {view === 'test' && activeNote && (
              <QuizView 
                key="quiz" 
                note={activeNote} 
                onBack={() => setView('editor')} 
              />
            )}

            {((view === 'editor' || view === 'flashcards' || view === 'test') && !activeNote) && (
              <div className="flex h-full items-center justify-center">
                 <div className="text-center">
                    <p className="text-slate-500 mb-4 font-medium italic">Loading...</p>
                    <button onClick={() => setView('notes')} className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] border border-cyan-400/20 px-4 py-2 rounded-xl bg-cyan-400/5 transition-all hover:bg-cyan-400/10">Back to Library</button>
                 </div>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function SideNavItem({ icon, isActive, onClick, label }: { icon: React.ReactNode, isActive: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-3 rounded-2xl transition-all relative group",
        isActive 
          ? "text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]" 
          : "text-slate-500 hover:text-white"
      )}
      title={label}
    >
      {icon}
      {isActive && (
        <motion.div 
          layoutId="activeSideNav"
          className="absolute -left-8 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"
        />
      )}
    </button>
  );
}

function NoteCard({ note, onClick }: { note: Note, onClick: () => void }) {
  return (
    <motion.div 
      whileHover={{ y: -4, borderColor: 'rgba(34,211,238,0.2)' }}
      onClick={onClick}
      className="group p-8 bg-[#0A0E14] border border-white/5 rounded-[32px] shadow-sm hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all cursor-pointer flex flex-col h-64"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-4">
           {note.weakPoints && note.weakPoints.length > 0 && (
             <span className="bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-amber-400/20">
               Gaps Found
             </span>
           )}
           <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-auto">
             {note.updatedAt?.toDate() ? new Date(note.updatedAt.toDate()).toLocaleDateString() : 'New'}
           </span>
        </div>
        <h3 className="text-xl font-bold mb-3 text-slate-200 group-hover:text-white transition-colors line-clamp-2 leading-tight">{note.title}</h3>
        <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
          {note.content || "Empty note. Add content for AI analysis."}
        </p>
      </div>
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
        <div className="flex items-center gap-2">
           <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-slate-400 border border-white/10 group-hover:text-cyan-400 group-hover:border-cyan-400 transition-colors">
              <ChevronRight size={14} />
           </div>
           <span className="text-xs font-bold text-slate-400 hidden group-hover:block transition-all">Open Study Space</span>
        </div>
        <div className="flex gap-1.5">
           <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
           <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
           <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
        </div>
      </div>
    </motion.div>
  );
}

