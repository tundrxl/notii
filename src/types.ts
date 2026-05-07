export interface Note {
  id: string;
  title: string;
  content: string;
  userId: string;
  tags: string[];
  weakPoints?: WeakPoint[];
  createdAt: any;
  updatedAt: any;
}

export interface WeakPoint {
  point: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  noteId: string;
  userId: string;
  mastery: number;
}

export interface Quiz {
  id: string;
  title: string;
  noteId: string;
  questions: QuizQuestion[];
  score?: number;
  completed?: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export type AppView = 'notes' | 'flashcards' | 'test' | 'editor';
