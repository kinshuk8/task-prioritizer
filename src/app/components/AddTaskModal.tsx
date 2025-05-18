// src/app/components/AddTaskModal.tsx
import { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, X } from "lucide-react";

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; subtasks: Subtask[] }) => void;
}

export default function AddTaskModal({ open, onClose, onSubmit }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  if (!open) return null;

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, { id: Math.random().toString(), text: newSubtask.trim(), completed: false }]);
      setNewSubtask('');
    }
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(subtask => subtask.id !== id));
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(subtask =>
      subtask.id === id ? { ...subtask, completed: !subtask.completed } : subtask
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-xl">
        <h2 className="text-xl text-gray-100 mb-4">Add Task</h2>
        <Input
          className="w-full mb-4 bg-gray-800 text-gray-100 border-gray-700"
          placeholder="Task Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        
        <div className="space-y-2 mb-4">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-2">
              <Checkbox
                id={subtask.id}
                checked={subtask.completed}
                onCheckedChange={() => handleToggleSubtask(subtask.id)}
                className="border-gray-600"
              />
              <label
                htmlFor={subtask.id}
                className="flex-1 text-sm text-gray-200"
              >
                {subtask.text}
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-gray-200"
                onClick={() => handleRemoveSubtask(subtask.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            className="flex-1 bg-gray-800 text-gray-100 border-gray-700"
            placeholder="Add subtask"
            value={newSubtask}
            onChange={e => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddSubtask();
              }
            }}
          />
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={handleAddSubtask}
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              onSubmit({ title, subtasks });
              setTitle('');
              setSubtasks([]);
            }}
          >
            Add Task
          </Button>
        </div>
      </div>
    </div>
  );
}