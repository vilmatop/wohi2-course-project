const express = require("express");
const router = express.Router();

const questions = require("../data/quiz");


// GET
router.get("/", (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.json(questions);
  }

  const filtered = questions.filter(q =>
    q.keywords.includes(keyword.toLowerCase())
  );

  res.json(filtered);
});


// GET by id
router.get("/:quizId", (req, res) => {
  const quizId = Number(req.params.quizId);

  const item = questions.find(p => p.id === quizId);

  if (!item) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json(item);
});


// POST
router.post("/", (req, res) => {
  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required"
    });
  }

  const maxId = Math.max(...questions.map(p => p.id), 0);

  const newItem = {
    id: maxId + 1,
    question,
    answer,
    keywords: Array.isArray(keywords) ? keywords : []
  };

  questions.push(newItem);

  res.status(201).json(newItem);
});


// PUT
router.put("/:quizId", (req, res) => {
  const quizId = Number(req.params.quizId);

  const item = questions.find(p => p.id === quizId);

  if (!item) {
    return res.status(404).json({ message: "Not found" });
  }

  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required"
    });
  }

  item.question = question;
  item.answer = answer;
  item.keywords = Array.isArray(keywords) ? keywords : [];

  res.json(item);
});


// DELETE
router.delete("/:quizId", (req, res) => {
  const quizId = Number(req.params.quizId);

  const index = questions.findIndex(p => p.id === quizId);

  if (index === -1) {
    return res.status(404).json({ message: "Not found" });
  }

  const deleted = questions.splice(index, 1);

  res.json({
    message: "Deleted successfully",
    item: deleted[0]
  });
});

module.exports = router;