import ChildUpdateCard from '../ChildUpdateCard';

export default function ChildUpdateCardExample() {
  return (
    <div className="p-4 max-w-md space-y-3">
      <ChildUpdateCard
        childName="Emma"
        update="Had a great day at school! Got an A on her math test."
        author="Alex"
        timestamp="2 hours ago"
      />
      <ChildUpdateCard
        childName="Liam"
        update="Slept through the night for the first time this week!"
        author="You"
        timestamp="Yesterday"
      />
    </div>
  );
}
