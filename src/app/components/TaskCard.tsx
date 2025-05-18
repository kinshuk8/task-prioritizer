import { Task } from '../types/task';

export default function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-gray-400 rounded-lg p-4 mb-3 shadow cursor-grab">
      <div className="font-semibold text-gray-100">{task.title}</div>
      <div className="text-gray-400 text-sm">{task.description}</div>
    </div>
  );
}