import MessageBubble from '../MessageBubble';

export default function MessageBubbleExample() {
  return (
    <div className="p-4 space-y-6 max-w-2xl">
      <MessageBubble
        content="Hi, can we discuss the pickup schedule for next week?"
        sender="coparent"
        timestamp="10:23 AM"
        senderName="Alex"
        tone="calm"
        toneSummary="Polite and straightforward"
      />
      <MessageBubble
        content="Sure, Thursday works. What time do you need me to pick them up?"
        sender="me"
        timestamp="10:25 AM"
        senderName="You"
        tone="cooperative"
        toneSummary="Helpful and accommodating"
      />
    </div>
  );
}
