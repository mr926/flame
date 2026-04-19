import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { LoginSchema, type LoginInput } from '@flame-claude/shared';
import { api } from '../api/client.js';
import { useSession } from '../api/hooks.js';

export default function LoginPage() {
  const { data: session, isLoading } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  if (isLoading) return null;
  if (session?.setupRequired) return <Navigate to="/setup" replace />;
  if (session?.authenticated) return <Navigate to="/" replace />;

  const onSubmit = async (data: LoginInput) => {
    setError('');
    try {
      await api.auth.login(data.username, data.password);
      qc.setQueryData(['session'], { authenticated: true, setupRequired: false });
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20">
      <h1 className="text-2xl font-bold text-[var(--color-accent)] mb-1">Welcome back</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-8">Sign in to your dashboard.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">Username</label>
          <input
            {...register('username')}
            className="inline-input w-full"
            autoFocus
            autoComplete="username"
          />
          {errors.username && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.username.message}</p>}
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">Password</label>
          <input
            {...register('password')}
            type="password"
            className="inline-input w-full"
            autoComplete="current-password"
          />
          {errors.password && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.password.message}</p>}
        </div>
        {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="flame-btn w-full">
          {isSubmitting ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </div>
  );
}
