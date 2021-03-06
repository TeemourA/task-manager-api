import express from 'express';

import { auth } from '../../middleware/auth.js';

import { Task, taskAllowedUpdates } from '../../models/Task.js';

export const taskRouter = express.Router();

taskRouter.post('/tasks', auth, async (req, res) => {
  const task = new Task({
    ...req.body,
    // @ts-ignore
    owner: req.user._id,
  });

  try {
    await task.save();
    res.status(201).send(task);
  } catch (err) {
    res.status(400).send(err);
  }
});

// GET /tasks?completed=true
// GET /tasks?limit=10&skip=0
// GET /tasks?sortBy=createdAt:asc/desc
taskRouter.get('/tasks', auth, async (req, res) => {
  try {
    const match = {};
    const sort = {};

    if (req.query.completed) match.completed = req.query.completed === 'true';
    if (req.query.sortBy) {
      // @ts-ignore
      const [sortKey, value] = req.query.sortBy.split(':');

      sort[sortKey] = value === 'desc' ? -1 : 1;
    }
    // @ts-ignore
    const { tasks } = await req.user.populate({
      path: 'tasks',
      match,
      options: {
        limit: Number(req.query.limit),
        skip: Number(req.query.skip),
        sort,
      },
    });
    res.status(200).send(tasks);
  } catch (err) {
    res.status(404).send();
  }
});

taskRouter.get('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      // @ts-ignore
      owner: req.user._id,
    });
    if (!task) return res.status(404).send();

    res.status(200).send(task);
  } catch (err) {
    res.status(500).send(err);
  }
});

taskRouter.patch('/tasks/:id', auth, async (req, res) => {
  const requestedUpdates = Object.keys(req.body);
  const isUpdateAllowed = requestedUpdates.every((update) =>
    taskAllowedUpdates.includes(update)
  );

  if (!isUpdateAllowed)
    return res.status(400).send({ error: 'Invalid updates requested' });

  try {
    const updatedTask = await Task.findOne({
      _id: req.params.id,
      // @ts-ignore
      owner: req.user._id,
    });

    if (!updatedTask) return res.status(404).send();

    requestedUpdates.forEach(
      (updateKey) => (updatedTask[updateKey] = req.body[updateKey])
    );

    await updatedTask.save();
    res.status(201).send(updatedTask);
  } catch (err) {
    res.status(400).send(err);
  }
});

taskRouter.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      // @ts-ignore
      owner: req.user._id,
    });

    if (!task) return res.status(404).send();

    res.status(200).send(task);
  } catch (err) {
    res.status(500).send(err);
  }
});
