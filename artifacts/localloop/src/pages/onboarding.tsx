import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useLocation as useGeoLocation } from '../lib/location';

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { user, login, isLoading: authLoading } = useAuth();
  const { coords, requestLocation, isLoading: geoLoading, error: geoError } = useGeoLocation();
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'welcome' | 'location'>('welcome');

  useEffect(() => {
    if (user && coords) {
      setLocation('/rooms');
    }
  }, [user, coords, setLocation]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await login(username.trim() || undefined);
    }
    setStep('location');
  };

  const handleLocation = async () => {
    try {
      await requestLocation();
    } catch (e) {
      // Error is handled by context, user can try again
    }
  };

  const isWorking = authLoading || geoLoading;

  if (user && coords) {
    return null; // Will redirect via effect
  }

  return (
    <div className="flex flex-col min-h-[100dvh] pt-safe pb-safe px-6 justify-center">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {step === 'welcome' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mb-8 rotate-3 shadow-lg shadow-primary/20">
              <MapPin className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl mb-4 leading-[1.1]">
              The neighborhood <br />
              <span className="text-primary italic">is alive.</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed font-sans">
              LocalLoop is an anonymous bulletin board for exactly where you are standing right now.
            </p>

            <form onSubmit={handleStart} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Pick a moniker (optional)
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Anonymous"
                  className="w-full bg-card border-2 border-border/50 text-foreground px-4 py-4 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-lg font-sans placeholder:text-muted-foreground/50"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                />
              </div>
              <button
                type="submit"
                disabled={isWorking}
                className="w-full bg-foreground text-background font-bold text-lg px-6 py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {authLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (
                  <>Continue <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>
          </div>
        )}

        {step === 'location' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="w-16 h-16 bg-secondary text-secondary-foreground rounded-2xl flex items-center justify-center mb-8 -rotate-3 shadow-lg shadow-secondary/20">
              <MapPin className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl mb-4 leading-[1.1]">
              Where are you?
            </h1>
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed font-sans">
              We need your location to show you rooms on your block. We don't save your exact coordinates.
            </p>

            {geoError && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-6 font-medium border border-destructive/20 text-sm">
                {geoError}
              </div>
            )}

            <button
              onClick={handleLocation}
              disabled={isWorking}
              className="w-full bg-primary text-primary-foreground font-bold text-lg px-6 py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 disabled:opacity-50"
            >
              {geoLoading ? <Loader2 className="animate-spin w-6 h-6" /> : 'Step Outside'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
