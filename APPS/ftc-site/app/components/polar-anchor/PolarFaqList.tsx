import { polarAnchorConfig } from "../../../lib/polarAnchor";

export default function PolarFaqList() {
  return (
    <div className="polar-faq-list">
      {polarAnchorConfig.faqs.map((item) => (
        <details key={item.question} className="polar-faq-item card">
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
