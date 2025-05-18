import React from 'react';
import { useDragLayer, XYCoord } from 'react-dnd';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isToday, isTomorrow, differenceInCalendarDays, isPast, parseISO } from 'date-fns';
import { TaskStatus, Priority } from './TaskBoard'; // Corrected import path

// Define the expected type of the dragged item (should match what's returned by useDrag)
interface DraggedTaskItem {
  id: string;
  // Include all properties needed to render the preview
  title: string;
  subtasks: Array<{ id: string; text: string; completed: boolean }>;
  status: TaskStatus;
  code: string;
  tags?: Array<{ text: string; color?: string }>; // Assuming tags might have colors later
  priority?: Priority;
  due?: string;
  type: string; // Should be ItemTypes.TASK
}

const layerStyles: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

function getItemStyles(initialOffset: XYCoord | null, currentOffset: XYCoord | null) {
  if (!initialOffset || !currentOffset) {
    return {
      display: 'none',
    };
  }

  const { x, y } = currentOffset;

  // Add an offset to position the card correctly relative to the cursor
  // Adjust these values based on how you want the card to align with the cursor
  const transform = `translate(${x}px, ${y}px)`;
  return {
    transform,
    WebkitTransform: transform,
    // Set a fixed width for the preview card to avoid layout shifts
    width: '300px', // Match column min-width or choose a size
  };
}

export default function CustomDragLayer() {
  const { itemType, isDragging, item, initialOffset, currentOffset } = useDragLayer(monitor => ({
    itemType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    // Explicitly define the type of the dragged item
    item: monitor.getItem() as DraggedTaskItem, // Cast to your item type
    initialOffset: monitor.getInitialClientOffset(),
    currentOffset: monitor.getClientOffset(),
  }));

  // Only render the layer if something is being dragged and it's a task
  if (!isDragging || itemType !== 'task') {
    return null;
  }

  // Render the task card preview
  const renderItem = (draggedItem: DraggedTaskItem) => {
    // Replicate the Card structure from TaskBoard.tsx here
    // You might want to abstract the card content rendering into a separate component
    // to avoid duplication and keep this file cleaner.
    return (
      <Card className="mb-3 bg-white border border-gray-300 shadow-md transition-shadow duration-200" style={{ width: '300px' }}> {/* Use the same width as defined in getItemStyles */}
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <div className="text-xs text-gray-600 font-mono font-semibold tracking-wide mb-1">{draggedItem.code}</div>
            <CardTitle className="text-gray-900 text-base font-semibold leading-tight">{draggedItem.title}</CardTitle>
          </div>
          <div className="relative">
            {/* Priority Badge */}
            {draggedItem.priority && (
               <Badge
                 variant="outline"
                 className={`px-2 py-1 rounded text-xs border ${
                   draggedItem.priority === 'High' ? 'border-red-500 text-red-600' :
                   draggedItem.priority === 'Medium' ? 'border-yellow-500 text-yellow-600' :
                   'border-green-500 text-green-600'
                 }`}
               >
                 {draggedItem.priority}
               </Badge>
             )}
          </div>
        </CardHeader>
        <CardContent className="text-gray-700 text-sm pt-0">
           {/* Progress Bar and Subtasks */}
           {draggedItem.subtasks.length > 0 && (
             <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                   <span>Progress</span>
                   <span>
                     {draggedItem.subtasks.filter(st => st.completed).length} / {draggedItem.subtasks.length}
                   </span>
                 </div>
                 <div className="w-full bg-gray-300 rounded-full h-1.5">
                   <div
                     className="bg-gray-700 h-1.5 rounded-full transition-all duration-300"
                     style={{
                       width: `${(draggedItem.subtasks.filter(st => st.completed).length / draggedItem.subtasks.length) * 100}%`
                     }}
                   />
                 </div>
                 {/* In the drag preview, we'll just show the subtask count for simplicity */}
                 {/* You could render the list if needed, but keep it minimal for performance */}
             </div>
           )}
          <div className="flex flex-wrap gap-2 mt-2">
             {/* Tags */}
             {/* Assuming tags are simple strings for now, will update for colors later */}
             {draggedItem.tags?.map((tag, index) => (
               <Badge key={index} variant="secondary" className="bg-gray-300 text-gray-800 font-medium px-2 py-1 rounded">
                 {/* If tags become objects with color, use tag.text and style based on tag.color */}
                 {typeof tag === 'string' ? tag : tag.text}
               </Badge>
             ))}
             {/* Due Date */}
             {draggedItem.due && (() => {
               const today = new Date();
               const dueDate = parseISO(draggedItem.due);
               if (isToday(dueDate)) return <Badge variant="outline" className="border-red-500 text-red-600 text-xs px-2 py-1 rounded">Due Today</Badge>;
               if (isTomorrow(dueDate)) return <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs px-2 py-1 rounded">Due Tomorrow</Badge>;
               if (isPast(dueDate) && !isToday(dueDate)) return <Badge variant="outline" className="border-red-500 text-red-600 text-xs px-2 py-1 rounded">Overdue</Badge>;
               const diff = differenceInCalendarDays(dueDate, today);
               return <Badge variant="outline" className="border-green-500 text-green-600 text-xs px-2 py-1 rounded">Due in {diff} days</Badge>;
             })()}
           </div>
         </CardContent>
       </Card>
    );
  };

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(initialOffset, currentOffset)}>
        {renderItem(item)}
      </div>
    </div>
  );
} 