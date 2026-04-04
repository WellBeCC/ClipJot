export default function SubscribeConfirmedContent() {
  return (
    <>
      <div className="mb-6 flex justify-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-panel)] text-4xl">
          ✉️
        </span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
        Check your inbox
      </h1>
      <p className="mt-4 text-lg text-[var(--muted-foreground)]">
        Thanks for subscribing! We've sent you a confirmation email — click the link inside to verify
        your address and you'll be all set.
      </p>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
        Didn't get it? Check your spam folder or try subscribing again.
      </p>
    </>
  );
}
