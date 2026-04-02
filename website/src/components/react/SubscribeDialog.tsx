import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { subscribeEmail } from '@/lib/subscribe';

type DialogState = 'idle' | 'loading' | 'success' | 'error';

interface SubscribeDialogProps {
  open: boolean;
  onClose: () => void;
}

const BASE = import.meta.env.BASE_URL as string;

export function SubscribeDialog({ open, onClose }: SubscribeDialogProps) {
  const [state, setState] = useState<DialogState>('idle');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [emailError, setEmailError] = useState('');
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, []);

  function handleClose() {
    if (state === 'loading') return;
    setState('idle');
    setEmail('');
    setAgreed(false);
    setEmailError('');
    onClose();
  }

  function validateEmail(value: string): boolean {
    if (!value) {
      setEmailError('Please enter your email address');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail(email)) return;

    setState('loading');
    try {
      await subscribeEmail(email);
      setState('success');
      sessionStorage.setItem('clipjot_subscribed_session', '1');
      autoCloseRef.current = setTimeout(() => {
        handleClose();
      }, 4000);
    } catch {
      setState('error');
    }
  }

  const isSubmitDisabled = !agreed || state === 'loading' || !email;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {state === 'success' ? (
          <div className="py-4 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--feedback-success)] bg-opacity-15">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--feedback-success)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <p className="text-base font-semibold text-[var(--foreground)]">You're subscribed!</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              We'll keep you posted on ClipJot updates.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>While your download starts…</DialogTitle>
              <DialogDescription>
                Want to get notified when we ship new features? No spam — just ClipJot updates.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="dialog-email">Email address</Label>
                <Input
                  id="dialog-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  disabled={state === 'loading'}
                  autoComplete="email"
                  aria-describedby={emailError ? 'dialog-email-error' : undefined}
                />
                {emailError && (
                  <p id="dialog-email-error" className="text-xs text-[var(--destructive)]">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="dialog-gdpr"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  disabled={state === 'loading'}
                  className="mt-0.5"
                />
                <Label htmlFor="dialog-gdpr" className="text-xs font-normal text-[var(--muted-foreground)] leading-relaxed cursor-pointer">
                  I agree to the{' '}
                  <a
                    href={`${BASE}terms`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[var(--foreground)] hover:text-[var(--accent)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms and Conditions
                  </a>{' '}
                  and{' '}
                  <a
                    href={`${BASE}privacy`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[var(--foreground)] hover:text-[var(--accent)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>
                  .
                </Label>
              </div>

              {state === 'error' && (
                <p className="text-sm text-[var(--destructive)]">
                  Something went wrong — please try again.
                </p>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={state === 'loading'}
                >
                  No thanks
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitDisabled}>
                  {state === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-3.5 w-3.5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Subscribing…
                    </span>
                  ) : (
                    'Subscribe'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
