import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Save, Loader2, Brain, FileText, List, Upload, Type, Image as ImageIcon, Zap, GraduationCap, Clock, PlusCircle, Library, X, Layers, Search, MessageSquare, Send, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import DashboardInput from '../components/DashboardInput';
import LogoutButton from '../components/LogoutButton';
import GalaxyLoader from '../components/GalaxyLoader';
import DeleteButton from '../components/DeleteButton';
import { api } from '../lib/api';
import PageLoader from '../components/PageLoader';
import confetti from 'canvas-confetti';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import toast from 'react-hot-toast';

interface Note {
  id: number;
  title: string;
  content: string;
  style: string;
  created_at: string;
  mime_type?: string;
}

interface Stats {
  notes_count: number;
  quizzes_count: number;
  average_score: number;
}

interface AiResult {
  title: string;
  content: string;
}

interface ChatMessage {
  id?: number;
  role: 'user' | 'ai';
  content: string;
  is_off_topic: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  
  const [user, setUser] = useState<any>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<Stats>({ notes_count: 0, quizzes_count: 0, average_score: 0 });
  
  const [currentView, setCurrentView] = useState<'list' | 'new'>('list');
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('general');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [isGeneratingSlow, setIsGeneratingSlow] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const [newNoteId, setNewNoteId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [animationParent] = useAutoAnimate();
  const [chatNote, setChatNote] = useState<Note | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    navigate('/login');
  }, [navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const renderNoteContent = (note: Note) => {
    let filePath = '';
    let textContent = note.content || '';

    const match = textContent.match(/\[FILE_PATH:(.*?)\]/);
    if (match) {
      filePath = match[1];
      textContent = textContent.replace(match[0], '').trim();
    } 
    else if (note.mime_type && note.mime_type !== 'text/plain') {
      filePath = textContent.startsWith('uploads/') ? textContent : `uploads/${textContent}`;
      textContent = ''; 
    }

    const renderText = () => {
      if (!textContent) return null;
      return <p className="text-slate-400 text-sm mt-4 line-clamp-3 font-medium">{textContent}</p>;
    };

    if (filePath) {
      const fileUrl = `http://localhost:8000/${filePath}?v=${note.id}`;
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filePath) || note.mime_type?.includes('image');
      const isPdf = /\.pdf$/i.test(filePath) || note.mime_type?.includes('pdf');

      if (isImage) {
        return (
          <div className="flex flex-col h-full">
            <div className="-mx-4 -mt-4 h-48 relative overflow-hidden rounded-t-2xl group shrink-0">
              <img src={fileUrl} alt="Feltöltött kép" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1b23] via-[#1a1b23]/40 to-transparent"></div>
            </div>
            {renderText()}
          </div>
        );
      }
      
      if (isPdf) {
        return (
          <div className="flex flex-col h-full">
            <div className="-mx-4 -mt-4 h-32 bg-gradient-to-br from-[#1a1c23] to-[#2a1b23] border-b border-red-500/20 flex flex-col items-center justify-center relative overflow-hidden group rounded-t-2xl shrink-0">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all duration-500"></div>
              <FileText size={32} className="text-red-400 mb-2 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)] group-hover:scale-110 transition-transform duration-300" />
              <span className="text-red-300 text-xs font-bold tracking-widest">PDF DOKUMENTUM</span>
            </div>
            {renderText()}
          </div>
        );
      }
    }

    return <p className="text-slate-400 text-sm line-clamp-4 leading-relaxed font-medium">{textContent}</p>;
  };

  const fetchData = useCallback(async () => {
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const [uRes, nRes, sRes] = await Promise.all([
            api.get('/users/me'),
            api.get('/notes/'),
            api.get('/stats')
        ]);
        setUser(uRes.data);
        setNotes(nRes.data);
        setStats(sRes.data);
    } catch (e) { 
        console.error("Hiba az adatok frissítésekor:", e); 
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
        setErrorMessage("Kérlek, adj meg egy címet a tananyagnak!");
        setTimeout(() => setErrorMessage(null), 4000);
        return;
    }

    if (activeTab === 'text' && !content.trim()) {
        setErrorMessage("A jegyzet tartalma nem lehet üres! Kérlek, írj be valamit.");
        setTimeout(() => setErrorMessage(null), 4000);
        return;
    }

    if (activeTab === 'image' && !file) {
        setErrorMessage("Kérlek, válassz ki egy fájlt (képet vagy PDF-et) a feltöltéshez!");
        setTimeout(() => setErrorMessage(null), 4000);
        return;
    }

    const isDuplicate = notes.some(note => note.title.toLowerCase() === title.trim().toLowerCase());
    if (isDuplicate) {
        setErrorMessage("Ezzel a névvel már létezik tananyagod! Kérlek, válassz egy másikat.");
        setTimeout(() => setErrorMessage(null), 4000);
        return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('style', selectedStyle);
      
      if (content.trim()) {
          formData.append('content', content);
      }

      if (activeTab === 'image' && file) {
          formData.append('file', file);
      }

      const res = await api.post('/notes/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });

      confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.3 },
          colors: ['#4f46e5', '#a855f7', '#ec4899', '#00FF87']
      });

      setNewNoteId(res.data.id);
      setTimeout(() => setNewNoteId(null), 3000);

      setTitle(''); setContent(''); setFile(null); setSelectedStyle('general');
      
      await fetchData(); 
      setCurrentView('list'); 
    } catch (e) { 
        console.error(e); 
        toast.error('Hiba a jegyzet mentésekor!');
    } 
    finally { setIsSubmitting(false); }
  };

  const proceedWithDeletion = async (id: number) => {
      setDeletingIds(prev => [...prev, id]);
      try {
          await new Promise(resolve => setTimeout(resolve, 300));
          await api.delete(`/notes/${id}`);
          toast.success('Jegyzet törölve!');
          fetchData(); 
      } catch (e) { 
          console.error(e);
          toast.error('Hiba a törlés során!');
          setDeletingIds(prev => prev.filter(deletingId => deletingId !== id));
      }
  };

  const handleDeleteNote = (id: number) => {
      toast((t) => (
          <div className="flex flex-col gap-4 p-1">
              <p className="font-bold text-white text-lg">Biztosan törölni akarod?</p>
              <div className="flex justify-end gap-3">
                  <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold text-white transition-colors">Mégse</button>
                  <button onClick={() => { toast.dismiss(t.id); proceedWithDeletion(id); }} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-colors">Igen, törlés</button>
              </div>
          </div>
      ), { duration: 8000, id: `confirm-${id}` });
  };

const handleGenerate = async (noteId: number, type: 'quiz' | 'summary' | 'flashcards' | 'completion') => {
    setGeneratingId(noteId);
    setIsGeneratingSlow(false);

    const slowTimer = setTimeout(() => {
        setIsGeneratingSlow(true);
    }, 1200);

    try {
        let url = '';
        if (type === 'quiz') url = '/ai/quiz';
        else if (type === 'completion') url = '/ai/completion/generate';
        else url = `/ai/${type}`;

        const [res] = await Promise.all([
            api.post(url, { title: "x", questions_json: "", note_id: noteId }),
            new Promise(resolve => setTimeout(resolve, 1000))
        ]);
        
        clearTimeout(slowTimer);
        const data = res.data;
        
        if (type === 'quiz') {
            try {
                const questions = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
                navigate(`/quiz/${noteId}`, { state: { questions, quizId: noteId } });
            } catch (err) { toast.error("Hiba a kvíz adatok feldolgozásakor."); }
        } else if (type === 'completion') {
            try {
                const exercises = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
                navigate('/completion', { state: { exercises, noteId: noteId } }); 
            } catch (e) { toast.error("Hiba a lyukas szöveg adataiban."); }
        } else if (type === 'flashcards') {
            try {
                const cards = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
                navigate('/flashcards', { state: { cards } });
            } catch (e) { toast.error("Hiba a kártyák betöltésekor."); }
        } else {
            setAiResult({ title: type, content: data.result });
        }

    } catch (e) { 
        clearTimeout(slowTimer);
        console.error(e);
        toast.error("Hiba történt az AI hívásakor. Próbáld újra!"); 
    } 
    finally { 
        setGeneratingId(null); 
        setIsGeneratingSlow(false);
    }
  };

  const handleOpenChat = async (note: Note) => {
    setChatNote(note);
    setChatMessages([]);
    setIsChatLoading(true);
    try {
        const res = await api.get(`/ai/chat/${note.id}/history`);
        setChatMessages(res.data);
    } catch (e) {
        toast.error("Nem sikerült betölteni a chat előzményeket.");
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatNote) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput, is_off_topic: false };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
        const res = await api.post('/ai/chat/send', {
            note_id: chatNote.id,
            message: userMsg.content
        });
        
        const aiMsg: ChatMessage = { 
            role: 'ai', 
            content: res.data.response, 
            is_off_topic: res.data.is_off_topic 
        };
        setChatMessages(prev => [...prev, aiMsg]);
        
        if (res.data.is_off_topic) {
            toast.error("Ez a kérdés eltér a tananyagtól!");
        }
    } catch (e) {
        toast.error("Hiba történt az üzenet küldésekor.");
    } finally {
        setIsChatLoading(false);
    }
  };


  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || note.style === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  if (!user) return <PageLoader />;

  return (
    <div className="flex min-h-screen text-slate-200 font-sans bg-[#0f1014] overflow-hidden relative">
      
        {generatingId !== null && (
          isGeneratingSlow ? (
              <GalaxyLoader />
          ) : (
              <PageLoader text="ELLENŐRZÉS A MEMÓRIÁBAN..." />
          )
      )}

      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/10 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px]"></div>
      </div>

      <aside className="w-20 lg:w-64 fixed h-full flex flex-col z-50 transition-all duration-300 border-r border-white/5 bg-[#0f1014]/80 backdrop-blur-xl">
        <div className="h-24 flex items-center justify-center lg:justify-start lg:px-8 border-b border-white/5">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                <Zap className="text-white h-6 w-6" />
            </div>
            <span className="ml-3 text-2xl font-black text-white hidden lg:block tracking-widest uppercase">Lumin</span>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-4">
            <button onClick={() => setCurrentView('list')} className={`w-full flex items-center px-4 py-4 rounded-2xl transition-all duration-300 group ${currentView === 'list' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <Library className={`h-5 w-5 ${currentView === 'list' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="ml-3 font-bold hidden lg:block">Tananyagaim</span>
            </button>
            <button onClick={() => setCurrentView('new')} className={`w-full flex items-center px-4 py-4 rounded-2xl transition-all duration-300 group ${currentView === 'new' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <PlusCircle className={`h-5 w-5 ${currentView === 'new' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="ml-3 font-bold hidden lg:block">Új hozzáadása</span>
            </button>
            <div className="my-6 border-t border-white/5"></div>
        </nav>

        <div className="p-4 border-t border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center overflow-hidden">
                <div className="h-10 w-10 min-w-[2.5rem] rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white font-bold shadow-md">
                    {user?.username?.charAt(0) || 'F'}
                </div>
                <div className="ml-3 hidden lg:block overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{user.username}</p>
                    <p className="text-xs text-slate-500">Online</p>
                </div>
            </div>
            <div className="hidden lg:block"><LogoutButton onClick={handleLogout} /></div>
        </div>
      </aside>

      <main className="flex-1 ml-20 lg:ml-64 p-6 lg:p-10 overflow-x-hidden relative z-10">
        
        {currentView === 'list' && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-1">Szia, {user.username}! 👋</h1>
                        <p className="text-slate-400">Jó újra látni. Ma mit szeretnél átnézni?</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur px-4 py-2 rounded-full flex items-center space-x-2 text-indigo-400 text-sm border border-white/10">
                        <Zap className="h-4 w-4 fill-current"/>
                        <span>AI Power: <strong>Aktív</strong></span>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                        { label: 'Feltöltött Jegyzetek', value: stats.notes_count, icon: BookOpen, color: 'from-blue-500 to-cyan-400' },
                        { label: 'Befejezett Játékok', value: stats.quizzes_count, icon: Brain, color: 'from-violet-500 to-fuchsia-500' },
                        { label: 'Átlag Pontszám', value: `${stats.average_score}%`, icon: GraduationCap, color: 'from-emerald-500 to-teal-400' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-[#1a1b23] p-6 rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition duration-500 border border-white/5 shadow-2xl">
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition group-hover:scale-110 duration-500 blur-xl group-hover:blur-2xl`}></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p><h3 className="text-4xl font-extrabold text-white mt-2">{stat.value}</h3></div>
                                <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg transform group-hover:rotate-12 transition duration-500`}><stat.icon className="h-6 w-6" /></div>
                            </div>
                        </div>
                    ))}
                </div>

                {notes.length > 0 && (
                    <div className="mb-8 flex flex-col xl:flex-row gap-4 items-center justify-between bg-gradient-to-r from-[#16171e] via-[#1a1b23] to-[#16171e] p-2.5 rounded-3xl border border-indigo-500/20 shadow-[0_0_30px_rgba(79,70,229,0.05)] backdrop-blur-xl animate-in fade-in duration-500 relative overflow-hidden">
                        
                        <div className="absolute top-0 left-1/4 w-1/2 h-full bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent blur-md pointer-events-none"></div>

                        <div className="relative w-full xl:w-96 group">
                            <input
                                type="text"
                                placeholder="Keresés a tananyagok között..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#0a0b0e] text-white rounded-2xl pl-12 pr-4 py-3.5 border border-white/5 group-hover:border-indigo-500/30 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:shadow-[0_0_25px_rgba(99,102,241,0.15)] transition-all duration-300 outline-none placeholder:text-slate-600 relative z-10"
                            />
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
                                <Search className="h-5 w-5 text-slate-600 group-focus-within:text-indigo-400 group-hover:text-indigo-400 transition-all duration-300 group-focus-within:drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                            </div>
                        </div>

                        <div className="flex gap-2 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 custom-scrollbar relative z-10">
                            {[
                                { id: 'all', label: 'Összes', icon: Layers },
                                { id: 'general', label: 'Általános', icon: GraduationCap },
                                { id: 'math', label: 'Matek', icon: Zap },
                                { id: 'history', label: 'Töri', icon: Clock },
                                { id: 'coding', label: 'Kódolás', icon: Type }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setSelectedFilter(filter.id)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                                        selectedFilter === filter.id 
                                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-400/30' 
                                        : 'bg-[#1a1b23] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <filter.icon className={`w-4 h-4 ${selectedFilter === filter.id ? 'text-white' : 'text-slate-500'}`} />
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {notes.length === 0 ? (
                    <div className="bg-[#1a1b23] rounded-3xl p-16 text-center shadow-xl border border-white/5">
                        <div className="bg-indigo-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><BookOpen className="w-10 h-10 text-indigo-400"/></div>
                        <h3 className="text-2xl font-bold text-white mb-2">Még nincs feltöltött anyag.</h3>
                        <p className="text-slate-400 text-lg mb-8">Kezdd el a tanulást egy új jegyzet létrehozásával!</p>
                        <button onClick={() => setCurrentView('new')} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30">Új létrehozása</button>
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="bg-[#1a1b23]/50 rounded-3xl p-12 text-center border border-dashed border-white/10 animate-in fade-in">
                        <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Nincs találat a keresésre</h3>
                        <p className="text-slate-500">Próbálj meg más kulcsszót vagy szűrőt használni.</p>
                        <button onClick={() => {setSearchQuery(''); setSelectedFilter('all');}} className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">Szűrők törlése</button>
                    </div>
                ) : (
                    <div ref={animationParent} className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredNotes.map(note => (
                            <div key={note.id} className={`group relative p-[2px] rounded-3xl bg-gradient-to-br from-indigo-500/20 via-slate-800 to-indigo-500/20 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20 origin-center ${deletingIds.includes(note.id) ? 'scale-50 opacity-0 pointer-events-none' : 'hover:-translate-y-2 scale-100 opacity-100'} ${newNoteId === note.id ? 'ring-2 ring-fuchsia-500 shadow-[0_0_30px_rgba(217,70,239,0.5)] z-40 scale-[1.02]' : ''}`}>
                                <div className="bg-[#0f1014] rounded-[22px] h-full p-6 relative z-10 flex flex-col overflow-hidden">
                                    
                                    <DeleteButton 
                                        onClick={() => handleDeleteNote(note.id)} 
                                        className="absolute top-6 right-6 z-30" 
                                    />

                                    <div className="mb-6">
                                        <div className="flex flex-col gap-1.5 mb-4 pr-12">
                                            <h3 className="font-bold text-xl text-white truncate leading-tight group-hover:text-indigo-400 transition-colors">{note.title}</h3>
                                            <div className="flex items-center text-xs font-medium text-slate-500"><Clock className="w-3.5 h-3.5 mr-1.5"/> {new Date(note.created_at).toLocaleDateString('hu-HU')}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1.5 rounded-full border ${note.style === 'math' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : note.style === 'history' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : note.style === 'coding' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>{note.style === 'general' ? 'Általános' : note.style === 'math' ? 'Matematika' : note.style === 'history' ? 'Történelem' : 'Kódolás'}</span>
                                            {note.mime_type && <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full flex items-center border border-slate-700">{note.mime_type.includes('pdf') ? 'PDF' : 'KÉP'}</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-[#1a1b23] p-4 rounded-2xl mb-6 flex-grow border border-white/5 group-hover:border-white/10 transition-colors">
                                        {renderNoteContent(note)}
                                    </div>

{}
                                    <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-3 relative z-20">
                                        
                                        {}
                                        <button onClick={()=>handleOpenChat(note)} className="group/chat relative flex items-center justify-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border border-indigo-500/40 hover:border-indigo-400 shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 group-hover/chat:opacity-100 transition-opacity duration-300"></div>
                                            <MessageSquare className="w-5 h-5 text-indigo-400 group-hover/chat:text-white relative z-10 transition-colors" />
                                            <span className="font-bold text-sm tracking-widest text-indigo-300 group-hover/chat:text-white relative z-10 transition-colors uppercase">AI Mentor Chat</span>
                                        </button>

 {}
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={()=>handleGenerate(note.id, 'quiz')} disabled={generatingId === note.id} className="group/quiz relative flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#1a1b23] border border-blue-500/30 hover:border-blue-400 shadow-sm hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden disabled:opacity-80">
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 opacity-0 group-hover/quiz:opacity-100 transition-opacity duration-300"></div>
                                                <Brain className="w-4 h-4 text-blue-400 group-hover/quiz:text-white relative z-10 transition-colors"/> 
                                                <span className="font-bold text-xs tracking-wide text-slate-300 group-hover/quiz:text-white relative z-10 transition-colors">KVÍZ</span>
                                            </button>
                                            
                                            <button onClick={()=>handleGenerate(note.id, 'completion')} disabled={generatingId === note.id} className="group/comp relative flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#1a1b23] border border-orange-500/30 hover:border-orange-400 shadow-sm hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden disabled:opacity-80">
                                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 opacity-0 group-hover/comp:opacity-100 transition-opacity duration-300"></div>
                                                <Type className="w-4 h-4 text-orange-400 group-hover/comp:text-white relative z-10 transition-colors"/>
                                                <span className="font-bold text-xs tracking-wide text-slate-300 group-hover/comp:text-white relative z-10 transition-colors">LYUKAS</span>
                                            </button>
                                            
                                            <button onClick={()=>handleGenerate(note.id, 'summary')} disabled={generatingId === note.id} className="group/summ relative flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#1a1b23] border border-emerald-500/30 hover:border-emerald-400 shadow-sm hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden disabled:opacity-80">
                                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover/summ:opacity-100 transition-opacity duration-300"></div>
                                                <FileText className="w-4 h-4 text-emerald-400 group-hover/summ:text-white relative z-10 transition-colors"/>
                                                <span className="font-bold text-xs tracking-wide text-slate-300 group-hover/summ:text-white relative z-10 transition-colors">VÁZLAT</span>
                                            </button>
                                            
                                            <button onClick={()=>handleGenerate(note.id, 'flashcards')} disabled={generatingId === note.id} className="group/flash relative flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#1a1b23] border border-purple-500/30 hover:border-purple-400 shadow-sm hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden disabled:opacity-80">
                                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-fuchsia-500 opacity-0 group-hover/flash:opacity-100 transition-opacity duration-300"></div>
                                                <Layers className="w-4 h-4 text-purple-400 group-hover/flash:text-white relative z-10 transition-colors"/>
                                                <span className="font-bold text-xs tracking-wide text-slate-300 group-hover/flash:text-white relative z-10 transition-colors">KÁRTYÁK</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {currentView === 'new' && (
            <div className="max-w-3xl mx-auto animate-in zoom-in-95 duration-500">
                <button onClick={() => setCurrentView('list')} className="mb-6 flex items-center text-slate-400 hover:text-white transition font-medium">
                    <List className="w-4 h-4 mr-2"/> Vissza a listához
                </button>

                <div className="glass-card p-8 rounded-3xl border border-white/10 shadow-2xl bg-[#0f1014]/50 backdrop-blur-xl relative overflow-hidden">
                    <h2 className="text-3xl font-bold text-white mb-8 flex items-center relative z-10">
                        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-3 rounded-2xl mr-4 text-white shadow-lg shadow-indigo-500/30">
                            <Plus className="h-6 w-6"/>
                        </div>
                        Új tananyag létrehozása
                    </h2>

                    <div className="bg-slate-800/50 p-1.5 rounded-xl flex mb-12 relative border border-white/5 max-w-md">
                        <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-indigo-600 rounded-lg shadow-sm transition-all duration-300 ease-out ${activeTab === 'image' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'}`}></div>
                        <button onClick={() => setActiveTab('text')} className={`relative z-10 flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors duration-300 flex items-center justify-center ${activeTab==='text' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                            <Type className="w-4 h-4 mr-2"/> Szöveg
                        </button>
                        <button onClick={() => setActiveTab('image')} className={`relative z-10 flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors duration-300 flex items-center justify-center ${activeTab==='image' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                            <ImageIcon className="w-4 h-4 mr-2"/> Fájl
                        </button>
                    </div>

                    <form onSubmit={handleCreateNote} className="space-y-8 relative z-10">
                        
                        {errorMessage && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center text-red-400 animate-in fade-in slide-in-from-top-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                <Zap className="w-5 h-5 mr-3 shrink-0" />
                                <span className="font-bold text-sm tracking-wide">{errorMessage}</span>
                            </div>
                        )}

                        <DashboardInput 
                            label="Jegyzet Címe" 
                            value={title} 
                            onChange={(e: any) => setTitle(e.target.value)} 
                            placeholder="pl. Analízis I. jegyzet" 
                        />
                        
                        <DashboardInput 
                            label="Tantárgy" 
                            type="select" 
                            value={selectedStyle} 
                            onChange={(e: any) => setSelectedStyle(e.target.value)}
                        >
                            <option value="general">🎓 Általános</option>
                            <option value="math">📐 Matematika</option>
                            <option value="history">📜 Történelem</option>
                            <option value="coding">💻 Programozás</option>
                        </DashboardInput>

                        {activeTab === 'image' && (
                            <div className="mb-6">
                                {file ? (
                                    <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-6 flex items-center justify-between shadow-inner animate-in fade-in zoom-in-95 duration-300">
                                        <div className="flex items-center space-x-4 overflow-hidden">
                                            <div className="bg-indigo-500/20 p-3 rounded-xl text-indigo-400">
                                                <ImageIcon className="w-6 h-6" />
                                            </div>
                                            <div className="truncate pr-4">
                                                <p className="text-sm text-slate-400 font-medium mb-1">Kiválasztott fájl:</p>
                                                <p className="text-white font-bold truncate">{file.name}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button" 
                                            onClick={() => setFile(null)}
                                            className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-colors duration-300 flex-shrink-0 group"
                                            title="Fájl törlése"
                                        >
                                            <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-slate-700 bg-[#1e293b]/50 rounded-2xl p-12 text-center cursor-pointer hover:border-indigo-500 transition-all duration-300 group relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                                        <input type="file" accept="image/*,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} className="absolute inset-0 opacity-0 cursor-pointer z-10"/>
                                        <div className="absolute inset-0 bg-indigo-500/10 scale-0 group-hover:scale-100 rounded-xl transition-transform duration-500 origin-center"></div>
                                        <div className="bg-indigo-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-6 transition duration-300 shadow-sm text-indigo-300">
                                            <Upload className="w-8 h-8"/>
                                        </div>
                                        <p className="text-lg font-bold text-slate-300 relative z-10">Kattints a feltöltéshez</p>
                                        <p className="text-sm text-slate-500 mt-2 relative z-10 font-medium">PDF dokumentum vagy Kép</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <DashboardInput 
                            label={activeTab === 'text' ? "Tartalom" : "Megjegyzés az AI-nak (Opcionális)"} 
                            type="textarea" 
                            value={content} 
                            onChange={(e: any) => setContent(e.target.value)} 
                            placeholder={activeTab === 'text' ? "Írd ide a jegyzeted..." : "Adj egy kis kontextust a képhez (pl. Odin, a skandináv főisten)..."} 
                        />

                        <button disabled={isSubmitting} className="relative w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-lg shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 overflow-hidden group mt-6">
                            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                            <div className="flex items-center justify-center gap-3 relative z-10">
                                {isSubmitting ? <><Loader2 className="animate-spin w-6 h-6"/><span>Feldolgozás...</span></> : <><Save className="w-6 h-6"/> MENTÉS</>}
                            </div>
                        </button>
                    </form>
                </div>
            </div>
        )}
      </main>
      
      {}
      {aiResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200" onClick={()=>setAiResult(null)}>
            <div className="bg-[#1e293b] rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-white/10" onClick={e=>e.stopPropagation()}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1e293b]">
                    <h3 className="font-bold text-2xl flex items-center text-white capitalize"><div className="p-2 bg-indigo-500/20 rounded-lg mr-3 text-indigo-400"><Brain className="w-6 h-6"/></div>{aiResult.title === 'summary' ? 'Vázlat' : aiResult.title}</h3>
                    <button onClick={() => setAiResult(null)} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition"><X className="h-6 w-6" /></button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar prose prose-invert max-w-none leading-relaxed
                    prose-h1:text-4xl prose-h1:font-black prose-h1:text-transparent prose-h1:bg-clip-text prose-h1:bg-gradient-to-r prose-h1:from-indigo-400 prose-h1:to-cyan-400 prose-h1:drop-shadow-sm prose-h1:mb-8
                    prose-h2:text-2xl prose-h2:font-extrabold prose-h2:text-indigo-300 prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-indigo-500/20 prose-h2:pb-2
                    prose-h3:text-xl prose-h3:font-bold prose-h3:text-cyan-300 prose-h3:mt-6 prose-h3:mb-3
                    prose-p:text-slate-300 prose-p:text-lg prose-p:leading-relaxed
                    prose-strong:text-fuchsia-400 prose-strong:font-black prose-strong:drop-shadow-[0_0_8px_rgba(232,121,249,0.3)]
                    prose-ul:text-slate-300 prose-ul:mt-2 prose-ul:list-disc prose-ul:pl-6
                    prose-li:marker:text-indigo-500 prose-li:pl-2 prose-li:mb-2
                    prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-500/10 prose-blockquote:px-4 py-2 prose-blockquote:rounded-r-lg prose-blockquote:text-slate-300 prose-blockquote:italic
                ">
                    <ReactMarkdown>{aiResult.content}</ReactMarkdown>
                </div>
                <div className="p-4 border-t border-white/10 bg-[#161f2e] flex justify-end"><button onClick={()=>setAiResult(null)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition font-medium text-sm">Bezárás</button></div>
            </div>
        </div>
      )}

      {}
      {chatNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-[100] animate-in fade-in duration-300" onClick={() => setChatNote(null)}>
            <div className="w-full max-w-md bg-gradient-to-b from-[#12131a] to-[#0a0b0e] h-full shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col border-l border-white/10 animate-in slide-in-from-right duration-500" onClick={e => e.stopPropagation()}>
                
                {}
                <div className="p-6 border-b border-white/5 bg-[#16171e]/80 backdrop-blur-md flex justify-between items-center shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mr-4">
                            <Brain className="w-6 h-6 text-white"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white tracking-wide">AI Mentor</h3>
                            <p className="text-xs text-indigo-300 mt-0.5 truncate max-w-[200px] font-medium">{chatNote.title}</p>
                        </div>
                    </div>
                    <button onClick={() => setChatNote(null)} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300"><X className="w-5 h-5"/></button>
                </div>

                {}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
                    {chatMessages.length === 0 && !isChatLoading && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50 animate-in zoom-in duration-500 delay-200">
                            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
                                <MessageSquare className="w-10 h-10 text-indigo-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-300">Tedd fel a kérdésed a tananyaggal kapcsolatban!</p>
                            <p className="text-xs text-slate-500 mt-2 max-w-[250px]">Kérhetsz extra magyarázatot, vagy kikérdezheted magad.</p>
                        </div>
                    )}
                    
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex w-full animate-in slide-in-from-bottom-4 fade-in duration-300 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            
                            {}
                            {msg.role === 'ai' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center mr-3 mt-1 shrink-0">
                                    <Brain className="w-4 h-4 text-indigo-400" />
                                </div>
                            )}

                            <div className={`max-w-[80%] p-4 relative group ${
                                msg.role === 'user' 
                                ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl rounded-tr-sm shadow-md shadow-indigo-500/20' 
                                : msg.is_off_topic 
                                    ? 'bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl rounded-tl-sm shadow-inner'
                                    : 'bg-[#1a1b23] border border-white/5 text-slate-200 rounded-2xl rounded-tl-sm shadow-lg'
                            }`}>
                                {msg.is_off_topic && (
                                    <div className="flex items-center text-red-400 text-[10px] font-black mb-2 uppercase tracking-widest bg-red-500/10 inline-flex px-2 py-1 rounded-md border border-red-500/20">
                                        <AlertCircle className="w-3 h-3 mr-1.5"/> Témán kívül
                                    </div>
                                )}
                                
                                {}
                                {msg.role === 'ai' ? (
                                    <div className="prose prose-invert max-w-none prose-p:text-sm prose-p:leading-relaxed prose-strong:text-indigo-300 prose-ul:my-1 prose-li:my-0.5 text-sm">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                )}
                            </div>

                            {}
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center ml-3 mt-1 shrink-0">
                                    <span className="text-xs font-bold text-white">{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                                </div>
                            )}
                        </div>
                    ))}

                    {}
                    {isChatLoading && (
                        <div className="flex items-start animate-in fade-in duration-300">
                            <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center mr-3 mt-1 shrink-0">
                                <Brain className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="bg-[#1a1b23] border border-white/5 p-4 rounded-2xl rounded-tl-sm flex space-x-2 shadow-lg items-center h-[44px]">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {}
                <div className="p-5 bg-[#12131a] border-t border-white/5 shrink-0">
                    <form onSubmit={handleSendMessage} className="relative flex items-center group">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Kérdezz a tananyagról..."
                            className="w-full bg-[#1a1b23] border border-white/10 rounded-2xl py-3.5 pl-5 pr-14 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 placeholder:text-slate-500 shadow-inner group-hover:border-white/20"
                            disabled={isChatLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={!chatInput.trim() || isChatLoading}
                            className="absolute right-2 p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-slate-600 mt-3 font-medium tracking-wider">A LUMIN AI HIBÁZHAT. ELLENŐRIZD A TÉNYEKET.</p>
                </div>

            </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;