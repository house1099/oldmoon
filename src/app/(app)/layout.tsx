export default function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="dark min-h-screen bg-[radial-gradient(ellipse_100%_55%_at_50%_0%,rgba(88,28,135,0.38),#020617_52%)] text-foreground">
      {children}
    </div>
  );
}
