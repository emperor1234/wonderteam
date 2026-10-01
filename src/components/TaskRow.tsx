import React from 'react';
import { TaskItem } from '../types/index.ts';
import { Check, Clock, Trash2 } from 'lucide-react';

interface TaskRowProps {
  task: TaskItem;
  onToggle: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  showAssignee?: boolean;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, onToggle, onDelete, showAssignee = false }) => {
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={`group flex items-start gap-3 p-3 sm:p-3.5 rounded-[12px] border transition-all duration-150 ${
        isCompleted
          ? 'bg-[#F7F9F8] border-[#E2E8E5] opacity-75'
          : 'bg-white border-[#E2E8E5] hover:border-[#CBD6D1] shadow-2xs'
      }`}
    >
      {/* Interactive Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        className={`w-5 h-5 mt-0.5 rounded-[6px] border flex items-center justify-center transition-all duration-150 shrink-0 ${
          isCompleted
            ? 'bg-[#146C4E] border-[#146C4E] text-white scale-95'
            : 'border-[#CBD6D1] hover:border-[#146C4E] bg-white'
        }`}
        aria-label={`Mark task ${task.title} as ${isCompleted ? 'incomplete' : 'complete'}`}
      >
        {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs sm:text-sm font-medium leading-snug transition-all ${
              isCompleted ? 'line-through text-[#89928E]' : 'text-[#17211D]'
            }`}
          >
            {task.title}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            {(task.dueTime || task.dueDate) && (
              <span className="text-[11px] text-[#89928E] flex items-center gap-1 font-mono-numbers">
                <Clock className="w-3 h-3 text-[#CBD6D1]" />
                <span>{task.dueTime || task.dueDate}</span>
              </span>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#89928E] hover:text-[#C84C4C] hover:bg-[#FFF0F0] rounded-[6px] transition-all"
                title="Delete task"
                aria-label="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-[11px] text-[#5E6964] mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        {showAssignee && (
          <div className="text-[11px] text-[#89928E] mt-1.5 flex items-center gap-1">
            <span>Assignee:</span>
            <span className="font-medium text-[#17211D]">{task.assigneeName}</span>
          </div>
        )}
      </div>
    </div>
  );
};
