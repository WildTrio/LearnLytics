const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require('../db')
const { JWT_SECRET } = require("../config")
const bcrypt = require("bcrypt")
const { z } = require("zod");
const { authMiddleware } = require('../middlewares/authMiddleware')
const router = express.Router();
const { assignmentSchema } = require("../schemas/userSchema")
router.get("/bulk", authMiddleware, async (req, res) => {
  try {
    const assignments = await pool.query(
      "SELECT * FROM assignments WHERE user_id=$1 ORDER BY due_date ASC",
      [req.user.id]
    );

    if (assignments.rows.length === 0) {
      return res.status(200).json({ msg: "No assignments", assignments: [] });
    }

    res.status(200).json(assignments.rows);
  } catch (err) {
    console.error("Get assignments error:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        msg: "Invalid data",
        errors: parsed.error.errors,
      });
    }

    const { title, description, subject, due_date } = parsed.data;

    const result = await pool.query(
      `INSERT INTO assignments (user_id, title, description, subject, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, title, description || null, subject || null, due_date]
    );

    res.status(201).json({
      msg: "Assignment created",
      assignment: result.rows[0],
    });
  } catch (err) {
    console.error("Create assignment error:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
});

// Helper function to update user streak
// Only updates once per day - if user already completed a task today, don't update streak
const updateStreak = async (userId, completedDate) => {
  try {
    const today = new Date(completedDate);
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Check how many tasks were completed today
    // We just inserted a task into task_history, so we count all entries for today
    // If count > 1, it means there was already a task completed today before this one
    // (the streak was already updated for the first task today)
    const existingTasksCheck = await pool.query(
      `SELECT COUNT(*) as count 
       FROM task_history 
       WHERE user_id = $1 
         AND completed_date = $2`,
      [userId, todayStr]
    );

    const taskCount = parseInt(existingTasksCheck.rows[0]?.count || 0);

    // If there's more than 1 task today, it means this is NOT the first task today
    // The streak was already updated when the first task was completed
    // So don't update the streak again
    if (taskCount > 1) {
      // Already updated streak for today, just return
      return;
    }

    // taskCount === 1 means this is the first task completed today
    // So we proceed to update the streak

    // This is the first task completed today, so update the streak
    const userResult = await pool.query(
      "SELECT current_streak, last_activity_date FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const user = userResult.rows[0];
    const lastActivity = user.last_activity_date
      ? new Date(user.last_activity_date)
      : null;

    // Calculate new streak value
    let newStreak = user.current_streak || 0;

    if (!lastActivity) {
      // First activity ever - start streak at 1
      newStreak = 1;
    } else {
      const lastActivityDate = new Date(lastActivity);
      lastActivityDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor(
        (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Consecutive day, increment streak
        newStreak = (user.current_streak || 0) + 1;
      } else if (daysDiff > 1) {
        // Streak broken (more than 1 day gap), reset to 1
        newStreak = 1;
      } else if (daysDiff === 0) {
        // Same day - this shouldn't happen due to check above, but if it does, don't update
        return;
      }
    }

    // Update user streak only if this is the first task completion today
    await pool.query(
      `UPDATE users 
       SET current_streak = $1, last_activity_date = $2 
       WHERE id = $3`,
      [newStreak, todayStr, userId]
    );
  } catch (err) {
    console.error("Update streak error:", err);
  }
};

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, subject, due_date, is_completed } = req.body;

    // Get current task state before update
    const currentTask = await pool.query(
      "SELECT * FROM assignments WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (currentTask.rows.length === 0) {
      return res.status(404).json({ msg: "Assignment not found or not yours" });
    }

    const oldIsCompleted = currentTask.rows[0].is_completed;
    const taskTitle = currentTask.rows[0].title;

    // Format the date if provided
    let formattedDate = null;
    if (due_date) {
      formattedDate = new Date(due_date).toISOString();
    }

    const result = await pool.query(
      `UPDATE assignments
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           subject = COALESCE($3, subject),
           due_date = COALESCE($4, due_date),
           is_completed = COALESCE($5, is_completed),
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        title ?? null,
        description ?? null,
        subject ?? null,
        formattedDate,
        is_completed,
        id,
        req.user.id
      ]
    );

    const updatedTask = result.rows[0];

    // If task is being marked as completed and wasn't completed before
    if (is_completed === true && oldIsCompleted === false) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedDateStr = today.toISOString().split('T')[0];

      // Log to task_history
      try {
        await pool.query(
          `INSERT INTO task_history (user_id, task_id, completed_date, task_title)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, task_id, completed_date) DO NOTHING`,
          [req.user.id, id, completedDateStr, taskTitle]
        );
      } catch (err) {
        console.error("Task history insert error:", err);
      }

      // Update streak
      await updateStreak(req.user.id, completedDateStr);
    }

    res.json(updatedTask);
  } catch (err) {
    console.error("Update assignment error:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
});
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM assignments WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Assignment not found" });
    }

    res.status(200).json({
      msg: "Assignment deleted",
      deleted: result.rows[0],
    });
  } catch (err) {
    console.error("Delete assignment error:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
});

// Dashboard stats endpoint
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total, pending, and completed tasks
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE is_completed = false) as pending_tasks,
        COUNT(*) FILTER (WHERE is_completed = true) as completed_tasks
       FROM assignments 
       WHERE user_id = $1`,
      [userId]
    );

    // Get overdue tasks count
    const overdueResult = await pool.query(
      `SELECT COUNT(*) as overdue_count
       FROM assignments 
       WHERE user_id = $1 
         AND is_completed = false 
         AND due_date < NOW()`,
      [userId]
    );

    // Get current streak from users table
    const userResult = await pool.query(
      "SELECT current_streak FROM users WHERE id = $1",
      [userId]
    );

    const stats = statsResult.rows[0];
    const overdueCount = parseInt(overdueResult.rows[0]?.overdue_count || 0);
    const currentStreak = userResult.rows[0]?.current_streak || 0;

    res.status(200).json({
      totalTasks: parseInt(stats.total_tasks) || 0,
      pendingTasks: parseInt(stats.pending_tasks) || 0,
      completedTasks: parseInt(stats.completed_tasks) || 0,
      overdueTasks: overdueCount,
      currentStreak: currentStreak,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
});

// Get overdue tasks
router.get("/overdue", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * 
       FROM assignments 
       WHERE user_id = $1 
         AND is_completed = false 
         AND due_date < NOW()
       ORDER BY due_date ASC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Get overdue tasks error:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
});

// Streak calendar endpoint (last 7 days)
router.get("/streak-calendar", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
    }

    // Get task history for last 7 days
    const historyResult = await pool.query(
      `SELECT completed_date, task_title, task_id
       FROM task_history 
       WHERE user_id = $1 
         AND completed_date >= $2
         AND completed_date <= $3
       ORDER BY completed_date ASC, completed_at ASC`,
      [userId, days[0], days[6]]
    );

    // Group tasks by date
    const calendarData = days.map((date) => {
      const tasksForDate = historyResult.rows.filter(
        (task) => task.completed_date === date
      );
      return {
        date,
        hasActivity: tasksForDate.length > 0,
        tasks: tasksForDate.map((task) => ({
          id: task.task_id,
          title: task.task_title,
        })),
      };
    });

    res.status(200).json({ calendarData });
  } catch (err) {
    console.error("Streak calendar error:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
});

module.exports = router;
