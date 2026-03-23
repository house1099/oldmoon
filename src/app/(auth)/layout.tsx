export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="dark flex min-h-[100dvh] flex-col items-center justify-center bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(88,28,135,0.5),rgba(15,23,42,0.96)_42%,#020617_100%)] p-4 text-foreground">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
