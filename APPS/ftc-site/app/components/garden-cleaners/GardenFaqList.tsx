import { gardenCleanersConfig } from "../../../lib/gardenCleaners";

export default function GardenFaqList() {
  return (
    <div className="garden-faq-list">
      {gardenCleanersConfig.faqs.map((item) => (
        <details key={item.question} className="garden-faq-item card">
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
