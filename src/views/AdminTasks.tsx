import React, { useState, useEffect } from 'react';
import { TaskItem, TaskStatus, TaskPriority } from '../types/index.ts';
import { AddTaskModal } from '../components/AddTaskModal.tsx';
import { Plus, Filter, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export const AdminTasks: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks?role=admin');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await fetch('/api/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update task status:', err);
      fetchTasks();
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E2E8E5] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211D]">
            Team Tasks & Workload
          </h1>
          <p className="text-xs text-[#5E6964]">
            Delegation, progress tracking and blockers across field operations
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-semibold rounded-[10px] shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Assign Team Task</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-[12px] border border-[#E2E8E5]">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#89928E]" />
          <span className="text-xs text-[#89928E] font-medium">Status:</span>
          {(['all', 'todo', 'in_progress', 'completed', 'blocked'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-xs rounded-[6px] font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-[#17211D] text-white'
                  : 'bg-[#F7F9F8] text-[#5E6964] hover:bg-[#E2E8E5]'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#89928E] font-medium">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-[#F7F9F8] border border-[#E2E8E5] rounded-[6px] px-2 py-1 text-[#17211D]"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Task Board / Table */}
      <div className="bg-white rounded-[16px] border border-[#E2E8E5] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-12 bg-[#E9EFEC] rounded-[8px] animate-pulse"></div>
            <div className="h-12 bg-[#E9EFEC] rounded-[8px] animate-pulse"></div>
            <div className="h-12 bg-[#E9EFEC] rounded-[8px] animate-pulse"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#CBD6D1] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#17211D]">No tasks match the active filters</p>
            <p className="text-[11px] text-[#5E6964] mt-1">Adjust filters or assign a new task.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8E5]">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 hover:bg-[#F7F9F8] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-[4px] ${
                        task.status === 'completed'
                          ? 'bg-[#E7F4EE] text-[#0F513B]'
                          : task.status === 'blocked'
                          ? 'bg-[#FFF0F0] text-[#C84C4C]'
                          : task.status === 'in_progress'
                          ? 'bg-[#EEF7F8] text-[#477C8A]'
                          : 'bg-[#F7F9F8] text-[#5E6964]'
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>

                    <span className="text-[#CBD6D1]">·</span>

                    <span
                      className={`text-[11px] font-medium capitalize ${
                        task.priority === 'high' ? 'text-[#C84C4C] font-semibold' : 'text-[#89928E]'
                      }`}
                    >
                      {task.priority} Priority
                    </span>

                    <span className="text-[#CBD6D1]">·</span>

                    <span className="text-[11px] text-[#5E6964] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#89928E]" />
                      <span className="font-mono-numbers">{task.dueTime}</span>
                    </span>
                  </div>

                  <h3
                    className={`text-xs font-semibold ${
                      task.status === 'completed' ? 'line-through text-[#89928E]' : 'text-[#17211D]'
                    }`}
                  >
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-[11px] text-[#5E6964] mt-0.5 line-clamp-1">
                      {task.description}
                    </p>
                  )}

                  <div className="text-[11px] text-[#89928E] mt-1.5">
                    Assignee: <span className="font-semibold text-[#17211D]">{task.assigneeName}</span>
                  </div>
                </div>

                {/* Status Changer Dropdown */}
                <div className="shrink-0 flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => handleUpdateStatus(task.id, e.target.value as TaskStatus)}
                    className="h-9 px-2.5 bg-white border border-[#CBD6D1] rounded-[8px] text-xs font-medium text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#146C4E]"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTaskCreated={fetchTasks}
      />
    </div>
  );
};
