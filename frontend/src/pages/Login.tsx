/**
 * @file Login.tsx
 * @description Bejelentkezési felület.
 * Kezeli a felhasználói hitelesítést és a JWT hozzáférési tokenek kliens oldali eltárolását.
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CyberpunkInput from '../components/CyberpunkInput';
import { LogIn, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('username', email); 
        formData.append('password', password);

        const response = await api.post('/login/access-token', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        localStorage.setItem('token', response.data.access_token);
        
        toast.success('Sikeres bejelentkezés!');
        navigate('/dashboard');
        
      } catch (error) {
        console.error(error);
        toast.error('Hibás email cím vagy jelszó!');
      } finally {
        setIsLoading(false);
      }
};

  return (
    <div className="min-h-screen bg-[#0f1014] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]"></div>

      <div className="w-full max-w-md bg-[#1a1b23]/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Üdv újra!</h1>
          <p className="text-slate-400">Jelentkezz be a folytatáshoz.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <CyberpunkInput 
            label="EMAIL CÍM" 
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
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center group"
          >
            {isLoading ? <Loader2 className="animate-spin w-6 h-6"/> : <>Belépés <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"/></>}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-400 text-sm">
          Nincs még fiókod?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-bold hover:underline transition-colors">
            Regisztrálj itt
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;