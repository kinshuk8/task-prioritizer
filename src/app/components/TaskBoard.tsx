'use client'

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isToday, isTomorrow, differenceInCalendarDays, isPast, parseISO } from 'date-fns';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Plus } from 'lucide-react';

export type TaskStatus = 'Not Started' | 'In Progress' | 'Done';
export type Priority = 'Low' | 'Medium' | 'High';

// Define a type for tags with an optional color
interface Tag {
  text: string;
  color?: string; // Store color as a hex string, Tailwind class, or specific color name
}

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  subtasks: Subtask[];
  status: TaskStatus;
  code: string;
  tags?: Tag[]; // Update tags to be an array of Tag objects
  priority?: Priority;
  due?: string;
}

const columns = [
  { status: 'Not Started' as TaskStatus, title: 'Todo' },
  { status: 'In Progress' as TaskStatus, title: 'In Progress' },
  { status: 'Done' as TaskStatus, title: 'Done' },
];

const generateId = () => Math.random().toString(36).substring(2, 9);
const generateTaskCode = () => `TASK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

const ItemTypes = { TASK: 'task' };

interface DraggableTaskCardProps {
  task: Task;
  onContextMenu: (e: React.MouseEvent) => void;
  onDropTask: (task: Task, status: TaskStatus) => void;
  children: React.ReactNode;
}

function DraggableTaskCard({ task, onContextMenu, onDropTask, children }: DraggableTaskCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TASK,
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item: { id: string; status: TaskStatus } | undefined, monitor) => {
      const dropResult = monitor.getDropResult() as { status?: TaskStatus } | null;
      if (dropResult && dropResult.status && dropResult.status !== task.status) {
        onDropTask(task, dropResult.status);
      }
    },
  });
  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: 'grab' }}
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  );
}

interface DroppableColumnProps {
  status: TaskStatus;
  children: React.ReactNode;
  onDrop: (task: Task, status: TaskStatus) => void;
}

function DroppableColumn({ status, children }: DroppableColumnProps) {
  const [, drop] = useDrop({
    accept: ItemTypes.TASK,
    drop: () => ({ status }),
  });
  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>} className="flex-1 min-w-[300px] bg-gray-800 rounded-lg p-4 flex flex-col shadow-lg">
      {children}
    </div>
  );
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<TaskStatus>('Not Started');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtasks, setNewSubtasks] = useState<Subtask[]>([]);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [taskCounter, setTaskCounter] = useState(1);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    open: boolean;
    task: Task | null;
    submenu?: 'tags';
    clickedTag?: { taskId: string; tagIndex: number; x: number; y: number };
  }>({ x: 0, y: 0, open: false, task: null });
  const [priorityDropdown, setPriorityDropdown] = useState<{
    taskId: string | null;
    open: boolean;
  }>({ taskId: null, open: false });

  const [newTag, setNewTag] = useState('');
  const [tagInputOpen, setTagInputOpen] = useState(false);

  const [newSubtaskInput, setNewSubtaskInput] = useState<{ [key: string]: string }>({});

  const [editModeTaskId, setEditModeTaskId] = useState<string | null>(null);

  const [newDueDate, setNewDueDate] = useState<string>('');

  // State for the color picker dropdown
  const [colorPicker, setColorPicker] = useState<{ taskId: string | null; tagIndex: number | null; open: boolean; x: number; y: number }>({ taskId: null, tagIndex: null, open: false, x: 0, y: 0 });

  // Open modal for add or edit
  const handleAddTask = (status: TaskStatus) => {
    setModalStatus(status);
    setEditTaskId(null);
    setNewTitle('');
    setNewSubtasks([]);
    setNewDueDate('');
    setModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setModalStatus(task.status);
    setEditTaskId(task.id);
    setNewTitle(task.title);
    setNewSubtasks(task.subtasks);
    setNewDueDate(task.due || '');
    setEditModeTaskId(task.id);
    setModalOpen(true);
    setContextMenu({ ...contextMenu, open: false, task: null });
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setNewTitle('');
    setNewSubtasks([]);
    setNewDueDate('');
    setEditTaskId(null);
    setEditModeTaskId(null);
  };

  const handleModalSubmit = () => {
    if (!newTitle.trim()) return;
    if (editTaskId) {
      setTasks(tasks =>
        tasks.map(task =>
          task.id === editTaskId
            ? { ...task, title: newTitle, subtasks: newSubtasks, status: modalStatus, due: newDueDate }
            : task
        )
      );
    } else {
      setTasks([
        ...tasks,
        {
          id: generateId(),
          title: newTitle,
          subtasks: newSubtasks,
          status: modalStatus,
          code: `TASK-${taskCounter}`,
          due: newDueDate
        },
      ]);
      setTaskCounter(prev => prev + 1);
    }
    handleModalClose();
  };

  // Context menu logic
  const handleTaskContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      open: true,
      task,
    });
  };

  const handleMoveTask = (task: Task, status: TaskStatus) => {
    setTasks(tasks =>
      tasks.map(t =>
        t.id === task.id ? { ...t, status } : t
      )
    );
    setContextMenu({ ...contextMenu, open: false, task: null });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ ...contextMenu, open: false, task: null });
  };

  // Close context menu on click elsewhere
  React.useEffect(() => {
    if (!contextMenu.open) return;
    const close = () => setContextMenu({ ...contextMenu, open: false, task: null });
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
    // eslint-disable-next-line
  }, [contextMenu.open]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== status) {
      handleMoveTask(draggedTask, status);
    }
    setDraggedTask(null);
  };

  // Modified handleAddTag to add a Tag object
  const handleAddTag = (task: Task, tagText: string) => {
    if (!tagText.trim()) return; // Prevent adding empty tags
    const newTag: Tag = { text: tagText.trim() };
    setTasks(tasks =>
      tasks.map(t =>
        t.id === task.id
          ? { ...t, tags: [...(t.tags || []), newTag] }
          : t
      )
    );
    setContextMenu({ ...contextMenu, open: false, task: null }); // Close context menu after adding
  };

  // Modified handleAddCustomTag to use the updated handleAddTag
  const handleAddCustomTag = (task: Task) => {
    handleAddTag(task, newTag);
    setNewTag('');
    // Keep the tag input open, or close it? Let's close the submenu for now.
    setContextMenu({ ...contextMenu, submenu: undefined });
  };

  // New handler to open color picker
  const handleTagClick = (e: React.MouseEvent, task: Task, tag: Tag, tagIndex: number) => {
    e.stopPropagation(); // Prevent card drag/context menu
    // Close context menu if open
    setContextMenu({ ...contextMenu, open: false, task: null });

    setColorPicker({
      taskId: task.id,
      tagIndex: tagIndex,
      open: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // New handler to set tag color
  const handleSetTagColor = (taskId: string, tagIndex: number, color: string) => {
    setTasks(tasks =>
      tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              tags: task.tags?.map((tag, idx) =>
                idx === tagIndex ? { ...tag, color } : tag
              )
            }
          : task
      )
    );
    setColorPicker({ ...colorPicker, open: false }); // Close picker after selecting
  };

  // Add handleSetPriority function
  const handleSetPriority = (task: Task, priority: Priority) => {
    setTasks(tasks =>
      tasks.map(t =>
        t.id === task.id
          ? { ...t, priority }
          : t
      )
    );
  };

  // Close color picker on click elsewhere
  React.useEffect(() => {
    if (!colorPicker.open) return;
    const close = () => setColorPicker({ ...colorPicker, open: false });
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [colorPicker.open]);

  // Replace the drag/drop handlers with onDropTask
  const onDropTask = (task: Task, status: TaskStatus) => {
    if (task.status !== status) {
      setTasks(tasks =>
        tasks.map(t =>
          t.id === task.id ? { ...t, status } : t
        )
      );
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-row gap-6 w-full min-h-screen bg-gray-200 p-6 relative">
        {columns.map(({ status, title }) => (
          <DroppableColumn key={status} status={status} onDrop={onDropTask}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-bold px-3 py-1 rounded-md bg-gray-300 text-gray-800">{title}</span>
              <button
                onClick={() => handleAddTask(status)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-xl leading-none shadow-md cursor-pointer"
                aria-label={`Add task to ${title}`}
              >
                <span className="flex items-center justify-center w-full h-full"><Plus /></span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              {tasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <DraggableTaskCard
                    key={task.id}
                    task={task}
                    onContextMenu={e => handleTaskContextMenu(e, task)}
                    onDropTask={onDropTask}
                  >
                    <Card
                      className="mb-3 bg-white border border-gray-300 shadow-md hover:shadow-lg transition-shadow duration-200"
                      draggable={false}
                    >
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-600 font-mono font-semibold tracking-wide mb-1">{task.code}</div>
                          <CardTitle className="text-gray-900 text-base font-semibold leading-tight">{task.title}</CardTitle>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setColorPicker({ ...colorPicker, open: false });
                              setPriorityDropdown({
                                taskId: priorityDropdown.taskId === task.id ? null : task.id,
                                open: !priorityDropdown.open
                              });
                            }}
                            className={`px-2 py-1 rounded text-xs border ${task.priority === 'High' ? 'border-red-500 text-red-600' : task.priority === 'Medium' ? 'border-yellow-500 text-yellow-600' : 'border-green-500 text-green-600'} cursor-pointer`}
                          >
                            {task.priority || 'Set Priority'}
                          </button>
                          {priorityDropdown.taskId === task.id && priorityDropdown.open && (
                            <div
                              className="absolute right-0 mt-1 bg-white rounded shadow-lg py-2 min-w-[120px] z-50 border border-gray-200"
                              onClick={e => e.stopPropagation()}
                            >
                              {['Low', 'Medium', 'High'].map(priority => (
                                <button
                                  key={priority}
                                  className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => {
                                    handleSetPriority(task, priority as Priority);
                                    setPriorityDropdown({ taskId: null, open: false });
                                  }}
                                >
                                  {priority}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="text-gray-700 text-sm pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>
                              {task.subtasks.filter(st => st.completed).length} / {task.subtasks.length}
                            </span>
                          </div>
                          <div className="w-full bg-gray-300 rounded-full h-1.5">
                            <div
                              className="bg-gray-700 h-1.5 rounded-full transition-all duration-300"
                              style={{
                                width: `${(task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100}%`
                              }}
                            />
                          </div>
                          <div className="space-y-1 mt-2">
                            {task.subtasks.map((subtask, subtaskIndex) => (
                              <div key={subtask.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`${task.id}-${subtask.id}`}
                                  checked={subtask.completed}
                                  onChange={() => {
                                    setTasks(tasks =>
                                      tasks.map(t =>
                                        t.id === task.id
                                          ? {
                                              ...t,
                                              subtasks: t.subtasks.map(st =>
                                                st.id === subtask.id
                                                  ? { ...st, completed: !st.completed }
                                                  : st
                                              )
                                            }
                                          : t
                                      )
                                    );
                                  }}
                                  className="rounded border-gray-400 bg-white text-gray-700 focus:ring-gray-700 cursor-pointer"
                                />
                                <label
                                  htmlFor={`${task.id}-${subtask.id}`}
                                  className={`text-sm ${subtask.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}
                                >
                                  {subtask.text}
                                </label>
                                {editModeTaskId === task.id && (
                                  <button
                                    className="ml-auto text-xs text-red-600 hover:text-red-800 cursor-pointer"
                                    onClick={() => setTasks(tasks.map(t => t.id === task.id ? { ...t, subtasks: t.subtasks.filter((_, i) => i !== subtaskIndex) } : t))}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))}
                            {/* Only show add subtask input in edit mode */}
                            {editModeTaskId === task.id && (
                              <div className="flex items-center gap-2 mt-2">
                                <input
                                  type="text"
                                  value={newSubtaskInput[task.id] || ''}
                                  onChange={(e) => setNewSubtaskInput({ ...newSubtaskInput, [task.id]: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddSubtask(task.id);
                                    }
                                  }}
                                  placeholder="Add subtask..."
                                  className="flex-1 bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm border border-gray-300 focus:border-blue-500 focus:outline-none"
                                />
                                <button
                                  onClick={() => handleAddSubtask(task.id)}
                                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1 rounded text-sm cursor-pointer"
                                >
                                  Add
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {task.tags?.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className={`bg-gray-300 text-gray-800 font-medium px-2 py-1 rounded cursor-pointer border-2 ${
                                tag.color ? tag.color : 'border-gray-400'
                              }`}
                              onClick={(e) => handleTagClick(e, task, tag, index)}
                            >
                              {tag.text}
                            </Badge>
                          ))}
                          {task.due && (() => {
                            const today = new Date();
                            const dueDate = parseISO(task.due);
                            if (isToday(dueDate)) {
                              return (
                                <Badge variant="outline" className="border-red-500 text-red-600 text-xs px-2 py-1 rounded">
                                  Due Today
                                </Badge>
                              );
                            }
                            if (isTomorrow(dueDate)) {
                              return (
                                <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs px-2 py-1 rounded">
                                  Due Tomorrow
                                </Badge>
                              );
                            }
                            if (isPast(dueDate) && !isToday(dueDate)) {
                              return (
                                <Badge variant="outline" className="border-red-500 text-red-600 text-xs px-2 py-1 rounded">
                                  Overdue
                                </Badge>
                              );
                            }
                            const diff = differenceInCalendarDays(dueDate, today);
                            return (
                              <Badge variant="outline" className="border-green-500 text-green-600 text-xs px-2 py-1 rounded">
                                Due in {diff} days
                              </Badge>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </DraggableTaskCard>
                ))}
            </div>
          </DroppableColumn>
        ))}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl text-gray-900">
              <h2 className="text-xl font-bold mb-4">
                {editTaskId ? 'Edit Task' : 'Add Task'}
              </h2>
              <input
                className="w-full mb-4 p-2 rounded bg-gray-100 text-gray-800 border border-gray-300"
                placeholder="Task Title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleModalSubmit();
                  }
                }}
              />
              {/* Due date input */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full p-2 rounded bg-gray-100 text-gray-800 border border-gray-300 cursor-pointer"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                />
              </div>
              {/* Subtasks input */}
              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  <input
                    className="flex-1 bg-gray-100 text-gray-800 border border-gray-300 rounded px-2 py-1"
                    placeholder="Add subtask"
                    value={newSubtaskInput['modal'] || ''}
                    onChange={e => setNewSubtaskInput({ ...newSubtaskInput, modal: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const text = newSubtaskInput['modal']?.trim();
                        if (text) {
                          setNewSubtasks([...newSubtasks, { id: generateId(), text, completed: false }]);
                          setNewSubtaskInput({ ...newSubtaskInput, modal: '' });
                        }
                      }
                    }}
                  />
                  <button
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1 rounded text-sm cursor-pointer"
                    onClick={() => {
                      const text = newSubtaskInput['modal']?.trim();
                      if (text) {
                        setNewSubtasks([...newSubtasks, { id: generateId(), text, completed: false }]);
                        setNewSubtaskInput({ ...newSubtaskInput, modal: '' });
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1 text-gray-800">
                  {newSubtasks.map((subtask, idx) => (
                    <div key={subtask.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() => {
                          setNewSubtasks(newSubtasks.map((st, i) => i === idx ? { ...st, completed: !st.completed } : st));
                        }}
                        className="rounded border-gray-400 bg-white text-gray-700 focus:ring-gray-700 cursor-pointer"
                      />
                      <span className={`text-sm ${subtask.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{subtask.text}</span>
                      <button
                        className="ml-auto text-xs text-red-600 hover:text-red-800 cursor-pointer"
                        onClick={() => setNewSubtasks(newSubtasks.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleModalClose}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalSubmit}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  {editTaskId ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu.open && contextMenu.task && (
          <div
            className="fixed z-50 bg-white text-gray-800 rounded shadow-xl py-2 border border-gray-200"
            style={{
              top: contextMenu.y,
              left: contextMenu.x,
              minWidth: 180,
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleEditTask(contextMenu.task!)}
            >
              Edit
            </button>
            <div className="border-t border-gray-200 my-1" />
            <div className="relative">
              <button
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onMouseEnter={() => setContextMenu({ ...contextMenu, submenu: 'tags' })}
              >
                Add Tag
              </button>
              {contextMenu.submenu === 'tags' && (
                <div className="absolute left-full top-0 bg-white rounded shadow-lg py-2 min-w-[200px] border border-gray-200">
                  <div className="px-4 py-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Enter custom tag"
                      className="w-full bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm border border-gray-300"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCustomTag(contextMenu.task!);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddCustomTag(contextMenu.task!)}
                      className="mt-2 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1 rounded text-sm cursor-pointer"
                    >
                      Add Custom Tag
                    </button>
                  </div>
                  <div className="border-t border-gray-200 my-1" />
                  <div className="px-2">
                    {['Feature', 'Bug', 'Enhancement', 'Documentation'].map(tagText => (
                      <button
                        key={tagText}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => contextMenu.task && handleAddTag(contextMenu.task, tagText)}
                      >
                        {tagText}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Color Picker Dropdown */}
        {colorPicker.open && colorPicker.taskId !== null && colorPicker.tagIndex !== null && (() => {
          const task = tasks.find(t => t.id === colorPicker.taskId);
          if (!task || !task.tags || task.tags.length <= colorPicker.tagIndex) return null;
          // You might want to calculate the position relative to the clicked badge
          // For simplicity, let's position it relative to the mouse click initially
          return (
            <div
              className="fixed z-50 bg-white rounded shadow-lg py-2 min-w-[120px] border border-gray-200 grid grid-cols-4 gap-1 p-2"
              style={{
                top: colorPicker.y + 10, // Offset slightly below cursor
                left: colorPicker.x, // Align with cursor
              }}
              onClick={e => e.stopPropagation()} // Prevent closing on click inside
            >
              {[
                { color: 'red', classes: 'border-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' },
                { color: 'blue', classes: 'border-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]' },
                { color: 'green', classes: 'border-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' },
                { color: 'yellow', classes: 'border-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]' },
                { color: 'purple', classes: 'border-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]' },
                { color: 'orange', classes: 'border-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]' },
                { color: 'gray', classes: 'border-gray-500 shadow-[0_0_5px_rgba(107,114,128,0.5)]' },
                { color: 'black', classes: 'border-black shadow-[0_0_5px_rgba(0,0,0,0.5)]' }
              ].map(({ color, classes }) => (
                <div
                  key={color}
                  className={`w-6 h-6 rounded-full cursor-pointer border border-gray-300`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleSetTagColor(colorPicker.taskId!, colorPicker.tagIndex!, classes)}
                />
              ))}
              {/* Option to remove color */}
              <div
                className={`w-6 h-6 rounded-full cursor-pointer border border-gray-300 flex items-center justify-center text-xs text-gray-600`}
                onClick={() => handleSetTagColor(colorPicker.taskId!, colorPicker.tagIndex!, '')} // Set color to empty string to remove
              >
                None
              </div>
            </div>
          );
        })()}
      </div>
    </DndProvider>
  );
}