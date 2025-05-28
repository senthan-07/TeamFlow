'use client';

import { useState } from 'react';

interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (...args: any[]) => Promise<void>;
  error?: string;
}

export default function AuthForm({ mode, onSubmit, error }: AuthFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await onSubmit(email, password);
      } else {
        await onSubmit(name, email, password);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 border rounded shadow">
      <h2 className="text-2xl font-bold mb-6">{mode === 'login' ? 'Login' : 'Register'}</h2>

      {mode === 'register' && (
        <div className="mb-4">
          <label htmlFor="name" className="block mb-1">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="email" className="block mb-1">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="block mb-1">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
      </button>
    </form>
  );
}
