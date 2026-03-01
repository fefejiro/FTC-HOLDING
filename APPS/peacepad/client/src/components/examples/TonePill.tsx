import TonePill from '../TonePill';

export default function TonePillExample() {
  return (
    <div className="p-4 space-y-4">
      <TonePill tone="calm" summary="Polite and straightforward" />
      <TonePill tone="cooperative" summary="Helpful and accommodating" />
      <TonePill tone="neutral" summary="Factual communication" />
      <TonePill tone="frustrated" summary="Signs of tension detected" />
      <TonePill tone="defensive" summary="Defensive language present" />
    </div>
  );
}
