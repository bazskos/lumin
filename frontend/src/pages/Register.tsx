import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CyberpunkInput from '../components/CyberpunkInput';
import { UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/users/', { 
        email, 
        password, 
        username: fullName 
      });

      toast.success('Sikeres regisztráció! Most jelentkezz be.');
      navigate('/login');
    } catch (error: any) {
      console.error(error);
      
      let errorMessage = 'Váratlan hiba történt a regisztráció során!';
      const detail = error.response?.data?.detail;
      
      if (typeof detail === 'string') {
          if (detail.toLowerCase().includes('already registered') || detail.toLowerCase().includes('exists')) {
              errorMessage = 'Ez az email cím már foglalt. Kérlek, jelentkezz be!';
          } else {
              errorMessage = detail;
          }
      } else if (Array.isArray(detail) && detail.length > 0) {
          const firstErrorMsg = detail[0].msg?.toLowerCase() || '';
          if (firstErrorMsg.includes('valid email')) {
              errorMessage = 'Kérlek, egy valós email címet adj meg!';
          } else if (firstErrorMsg.includes('at least') || firstErrorMsg.includes('short')) {
              errorMessage = 'A jelszó túl rövid. Adj meg egy erősebb jelszót!';
          } else {
              errorMessage = 'Kérlek, ellenőrizd a megadott adatokat!';
          }
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1014] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px]"></div>

      <div className="w-full max-w-md bg-[#1a1b23]/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Fiók létrehozása</h1>
          <p className="text-slate-400">Csatlakozz és kezdj el tanulni!</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-8">
          <CyberpunkInput 
            label="TELJES NÉV" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            placeholder="Pl. Kiss Béla"
            required
          />
          <CyberpunkInput 
            label="EMAIL CÍM" 
            type="text"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="pelda@email.com"
            required
          />
          <CyberpunkInput 
            label="JELSZÓ" 
            type="password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••"
            required
          />

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center group"
          >
            {isLoading ? <Loader2 className="animate-spin w-6 h-6"/> : <>Regisztráció <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"/></>}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-400 text-sm">
          Már van fiókod?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline transition-colors">
            Jelentkezz be
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;