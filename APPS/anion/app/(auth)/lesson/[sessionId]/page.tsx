type LessonPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function LessonSessionPage({ params }: LessonPageProps) {
  const { sessionId } = await params;

  return (
    <section className="surface card">
      <p className="kicker">Live Classroom</p>
      <h1 className="h1">Session {sessionId}</h1>
      <p className="muted">M4 will wire Daily React join tokens and participant readiness checks.</p>
    </section>
  );
}
