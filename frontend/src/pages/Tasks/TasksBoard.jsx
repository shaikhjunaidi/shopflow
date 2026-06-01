import { useState, useEffect } from "react";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import axios from "axios";
import { KanbanSquare, Plus, X, MoreVertical, Trash2, Calendar, User as UserIcon } from "lucide-react";

const COLUMNS = [
  { id: "TODO", title: "To Do", color: "bg-zinc-100 dark:bg-zinc-800/50" },
  { id: "IN_PROGRESS", title: "In Progress", color: "bg-blue-50 dark:bg-blue-900/20" },
  { id: "DONE", title: "Done", color: "bg-green-50 dark:bg-green-900/20" }
];

function TaskCard({ task, isDragging, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    data: { ...task }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border ${
        isDragging ? 'border-blue-500 shadow-xl scale-105' : 'border-zinc-200 dark:border-zinc-800'
      } cursor-grab active:cursor-grabbing mb-3 group relative`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm pr-6 leading-tight">{task.title}</h4>
        <button 
          onPointerDown={(e) => {
            e.stopPropagation(); // prevent drag
            if(window.confirm('Delete this task?')) onRemove(task.id);
          }}
          className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {task.description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center text-xs text-zinc-500">
          <Calendar className="w-3 h-3 mr-1" />
          {new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </div>
        
        {task.user ? (
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md" title={task.user.name}>
            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold mr-1.5 shrink-0 overflow-hidden">
              {task.user.profile_image ? (
                <img src={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}${task.user.profile_image}`} className="w-full h-full object-cover" />
              ) : task.user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] font-medium truncate max-w-[60px]">{task.user.name.split(' ')[0]}</span>
          </div>
        ) : (
          <div className="flex items-center text-xs text-zinc-400">
            <UserIcon className="w-3 h-3 mr-1" /> Unassigned
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksBoard() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Drag State
  const [activeId, setActiveId] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", assigned_to: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/users`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      setTasks(tasksRes.data);
      // Try to get users if the endpoint exists, otherwise empty array
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error("Failed to fetch tasks data:", error);
    } finally {
      setLoading(false);
    }
  };

  // DND Handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires moving 5px before drag starts (allows clicks on buttons)
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    const taskId = active.id;
    // Dropped over a column directly or over another task
    const overId = over.id;
    
    // Find what status we dropped into
    let newStatus;
    if (COLUMNS.map(c => c.id).includes(overId)) {
      newStatus = overId;
    } else {
      // Find the task we dropped over
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    if (!newStatus) return;

    // Optimistic UI Update
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const currentTask = tasks[taskIndex];
    if (currentTask.status === newStatus) return; // No change

    const originalTasks = [...tasks];
    const newTasks = [...tasks];
    newTasks[taskIndex] = { ...currentTask, status: newStatus };
    setTasks(newTasks);

    // API Update
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tasks/${taskId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error("Failed to update status:", error);
      setTasks(originalTasks); // Revert
      alert("Failed to move task. Please try again.");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tasks`, newTask, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks([res.data, ...tasks]);
      setShowModal(false);
      setNewTask({ title: "", description: "", assigned_to: "" });
    } catch (error) {
      console.error("Failed to create task:", error);
      alert("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTask = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Failed to delete task");
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="p-6 h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold flex items-center"><KanbanSquare className="mr-2 text-blue-500" /> Task Board</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage daily tasks, checklists, and staff assignments.</p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center shadow-lg shadow-blue-500/20 hover-lift"
        >
          <Plus className="w-5 h-5 mr-2" /> New Task
        </button>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
          {COLUMNS.map(column => {
            const columnTasks = tasks.filter(t => t.status === column.id);
            
            return (
              <div key={column.id} className="flex flex-col min-w-[300px] w-[300px] shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm tracking-wide text-zinc-600 dark:text-zinc-300 uppercase flex items-center">
                    {column.title}
                    <span className="ml-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 py-0.5 px-2 rounded-full text-xs font-bold">
                      {columnTasks.length}
                    </span>
                  </h3>
                </div>
                
                <SortableContext 
                  id={column.id}
                  items={columnTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className={`flex-1 ${column.color} rounded-2xl p-3 border border-zinc-200/50 dark:border-zinc-800 flex flex-col min-h-[150px]`}>
                    {loading ? (
                      <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">Loading...</div>
                    ) : columnTasks.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-sm text-zinc-400 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">Drop tasks here</div>
                    ) : (
                      columnTasks.map(task => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          onRemove={handleRemoveTask}
                          isDragging={task.id === activeId}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="opacity-80 scale-105 pointer-events-none">
              <TaskCard task={activeTask} isDragging={false} onRemove={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl w-full max-w-md shadow-2xl flex flex-col border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
              <h3 className="font-bold text-lg">Create New Task</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-900 p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Task Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Clean the front windows"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                  <textarea
                    rows="3"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar"
                    placeholder="Provide some details..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Assign To</label>
                  <select
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting || !newTask.title} className="btn-primary px-6 py-2.5 shadow-lg shadow-blue-500/20 disabled:opacity-50">
                    {submitting ? "Creating..." : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
