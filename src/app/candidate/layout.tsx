export default function CandidateLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="candidate-flow-host">{children}</div>;
}
