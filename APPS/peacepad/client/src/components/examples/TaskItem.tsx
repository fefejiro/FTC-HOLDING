import TaskItem from '../TaskItem';

export default function TaskItemExample() {
  return (
    <div className="p-4 max-w-md space-y-2">
      <TaskItem
        id="1"
        title="Schedule dentist appointment for Emma"
        completed={false}
        dueDate="Oct 15"
      />
      <TaskItem
        id="2"
        title="Buy new school shoes"
        completed={true}
        dueDate="Oct 12"
      />
    </div>
  );
}
