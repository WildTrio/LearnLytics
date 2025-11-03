import { useEffect, useState } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./Tasks.css";

const API_URL = "http://localhost:3000/api/v1/tasks";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "",
    due_date: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("token");

  // Fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/bulk`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setTasks(data.assignments ?? data);
      } else {
        setTasks([]);
        toast.error('Failed to load tasks');
      }
    } catch (err) {
      console.error(err);
      setTasks([]);
      toast.error('Error fetching tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Handle input change
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Reset form
  const resetForm = () => {
    setForm({ title: "", description: "", subject: "", due_date: "" });
    setEditingId(null);
  };

  // Create or update task
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;

      // Format due_date
      const payload = {
        ...form,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        resetForm();
        await fetchTasks();
        toast.success(editingId ? 'Task updated successfully!' : 'Task added successfully!');
      } else {
        const error = await res.json();
        toast.error(error.msg || 'Failed to save task');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving task');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete task
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (editingId === id) resetForm();
        await fetchTasks();
        toast.success('Task deleted successfully!');
      } else {
        toast.error('Failed to delete task');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting task');
    }
  };

  // Toggle complete
  const toggleComplete = async (id, currentStatus) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_completed: !currentStatus }),
      });
      if (res.ok) {
        await fetchTasks();
        toast.success(!currentStatus ? 'Task marked as completed! 🎉' : 'Task marked as pending');
      } else {
        toast.error('Failed to update task status');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating task');
    }
  };

  // Fill form when clicking edit
  const handleEdit = (task) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description || "",
      subject: task.subject || "",
      due_date: task.due_date
        ? new Date(task.due_date).toISOString().slice(0, 10)
        : "",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && !new Date(dueDate).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);
  };

  return (
    <div className="tasks-container">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      <div className="tasks-header">
        <h2 className="tasks-title">My Tasks</h2>
        <p className="tasks-subtitle">Manage your assignments and track your progress</p>
      </div>

      {/* Task Form */}
      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-row">
          <input
            type="text"
            name="title"
            placeholder="Task Title *"
            value={form.title}
            onChange={handleChange}
            required
            className="form-input"
          />
          <input
            type="text"
            name="subject"
            placeholder="Subject"
            value={form.subject}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <input
          type="text"
          name="description"
          placeholder="Description (optional)"
          value={form.description}
          onChange={handleChange}
          className="form-input"
        />
        <input
          type="date"
          name="due_date"
          value={form.due_date}
          onChange={handleChange}
          required
          className="form-input"
        />
        <div className="form-buttons">
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Saving...' : editingId ? "Update Task" : "Add Task"}
          </button>
          {editingId && (
            <button type="button" className="cancel-btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Loading State */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p className="empty-message">No tasks yet. Add your first task above!</p>
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => {
            const overdue = !task.is_completed && new Date(task.due_date) < new Date();
            return (
              <li key={task.id} className={`task-item ${task.is_completed ? "completed" : ""} ${overdue ? "overdue" : ""}`}>
                <div className="task-main">
                  <div className="task-checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={task.is_completed}
                      onChange={() => toggleComplete(task.id, task.is_completed)}
                      className="task-checkbox"
                    />
                  </div>
                  <div className="task-info">
                    <div className="task-header">
                      <span className="task-title">{task.title}</span>
                      {overdue && <span className="overdue-badge">OVERDUE</span>}
                      {task.is_completed && <span className="completed-badge">✓ Completed</span>}
                    </div>
                    {task.description && (
                      <p className="task-description">{task.description}</p>
                    )}
                    <div className="task-meta">
                      {task.subject && (
                        <span className="task-subject">
                          <span className="meta-icon">📚</span>
                          {task.subject}
                        </span>
                      )}
                      <span className={`task-date ${overdue ? 'overdue-date' : ''}`}>
                        <span className="meta-icon">📅</span>
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="task-actions">
                  <button 
                    onClick={() => handleEdit(task)} 
                    className="action-btn edit-btn"
                    disabled={task.is_completed}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(task.id)} 
                    className="action-btn delete-btn"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
