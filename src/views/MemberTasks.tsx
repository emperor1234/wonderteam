import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { TaskRow } from '../components/TaskRow.tsx';
import { AddTaskModal } from '../components/AddTaskModal.tsx';
import { AIPrioritizerModal } from '../components/AIPrioritizerModal.tsx';
import { TaskItem } from '../types/index.ts';
import { Plus, Sparkles, CheckSquare, ListTodo } from 'lucide-react';

export const MemberTasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAIPrioritizerOpen, setIsAIPrioritizerOpen] = useState(false);

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/tasks?userId=${user.id}&role=member`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleToggle = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' }
          : t
      )
    );

    try {
      await fetch('/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
    } catch (err) {
      console.error('Failed to toggle task:', err);
      fetchTasks();
    }
  };

  const todayStr = new Date().toISOString().substring(0, 10);

  // Filter tasks based on view tab
  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'completed') {
      return t.status === 'completed';
    }
    if (activeTab === 'today') {
      return t.status !== 'completed' && (t.dueDate <= todayStr || !t.dueDate);
    }
    if (activeTab === 'upcoming') {
      return t.status !== 'completed' && t.dueDate > todayStr;
    }
    return true;
  });

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-24">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#146C4E] uppercase tracking-wider mb-0.5">
            <ListTodo className="w-3.5 h-3.5" />
            <span>Daily Execution</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211D]">Daily To-Do List</h1>
          <p className="text-xs text-[#5E6964]">Add and manage your daily tasks cleanly</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAIPrioritizerOpen(true)}
            disabled={tasks.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#E7F4EE] hover:bg-[#D5EFE3] text-[#0F513B] border border-[#CBD6D1] text-xs font-bold rounded-[10px] shadow-2xs transition-colors disabled:opacity-50"
            title="Use Gemini AI to arrange your to-dos based on Income Producing Activities"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#146C4E]" />
            <span>AI Prioritize</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-semibold rounded-[10px] shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Main Subnav Tabs */}
      <div className="flex rounded-[10px] bg-white p-1 border border-[#E2E8E5] shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-[8px] transition-all ${
            activeTab === 'today'
              ? 'bg-[#E7F4EE] text-[#0F513B]'
              : 'text-[#5E6964] hover:text-[#17211D]'
          }`}
        >
          Today ({tasks.filter((t) => t.status !== 'completed' && (t.dueDate <= todayStr || !t.dueDate)).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-[8px] transition-all ${
            activeTab === 'upcoming'
              ? 'bg-[#E7F4EE] text-[#0F513B]'
              : 'text-[#5E6964] hover:text-[#17211D]'
          }`}
        >
          Upcoming ({tasks.filter((t) => t.status !== 'completed' && t.dueDate > todayStr).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-[8px] transition-all ${
            activeTab === 'completed'
              ? 'bg-[#E7F4EE] text-[#0F513B]'
              : 'text-[#5E6964] hover:text-[#17211D]'
          }`}
        >
          Completed ({tasks.filter((t) => t.status === 'completed').length})
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2 py-4">
            <div className="h-14 bg-[#E9EFEC] rounded-[12px] animate-pulse"></div>
            <div className="h-14 bg-[#E9EFEC] rounded-[12px] animate-pulse"></div>
            <div className="h-14 bg-[#E9EFEC] rounded-[12px] animate-pulse"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-8 text-center space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-[#E7F4EE] text-[#146C4E] flex items-center justify-center mx-auto">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#17211D]">
                {activeTab === 'completed'
                  ? 'No completed tasks yet'
                  : activeTab === 'upcoming'
                  ? 'No upcoming tasks scheduled'
                  : 'All caught up for today!'}
              </p>
              <p className="text-xs text-[#5E6964] mt-1">
                {activeTab === 'today'
                  ? 'Add your tasks to lock in your daily execution plan.'
                  : 'Your tasks will appear here once added.'}
              </p>
            </div>
            {activeTab === 'today' && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-semibold rounded-[8px] shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Task</span>
              </button>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={handleToggle} />
          ))
        )}
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTaskCreated={() => {
          fetchTasks();
        }}
      />

      {/* AI Prioritizer Modal */}
      <AIPrioritizerModal
        isOpen={isAIPrioritizerOpen}
        onClose={() => setIsAIPrioritizerOpen(false)}
        tasks={tasks}
        userId={user?.id}
        onPrioritiesApplied={() => {
          fetchTasks();
        }}
      />
    </div>
  );
};
