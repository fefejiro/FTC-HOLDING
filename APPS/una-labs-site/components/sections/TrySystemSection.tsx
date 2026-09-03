import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function TrySystemSection() {
  return (
    <section className="bg-[#0f1117] py-20 text-white">
      <div className="mx-auto grid max-w-content items-center gap-10 px-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="max-w-2xl"><Badge variant="muted">See Una Labs in action</Badge><h2 className="mt-4 text-h2 text-white">Watch the path. Try a safe preview. Open a live product.</h2><p className="mt-4 text-body-lg leading-relaxed text-white/60">Our demo surface keeps the difference clear: walkthroughs are labelled, previews use synthetic data, and live products open in their own space.</p></div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-6"><div className="space-y-3"><div className="flex items-center justify-between rounded-xl bg-white/5 p-4"><span className="text-sm text-white/70">Watch</span><span className="text-xs text-[#75d7c7]">Walkthroughs</span></div><div className="flex items-center justify-between rounded-xl bg-white/5 p-4"><span className="text-sm text-white/70">Try</span><span className="text-xs text-[#75d7c7]">Synthetic preview</span></div><div className="flex items-center justify-between rounded-xl bg-white/5 p-4"><span className="text-sm text-white/70">Open</span><span className="text-xs text-[#75d7c7]">Live surfaces</span></div></div><Button href="/demo" variant="primary" size="md" className="mt-6">Explore the demo →</Button></div>
      </div>
    </section>
  );
}
