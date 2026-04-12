const express = require("express");
const router = express.Router();

const quiz = require("../data/quiz");


// GET 
router.get("/", (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.json(quiz);
  }

  const filtered = quiz.filter(item =>
    item.question.toLowerCase().includes(keyword.toLowerCase()) ||
    item.answer.toLowerCase().includes(keyword.toLowerCase()) ||
    item.keywords.includes(keyword.toLowerCase())
  );

  res.json(filtered);
});


// GET 
router.get("/:quizId", (req, res) => {
  const quizId = Number(req.params.quizId);

  const item = quiz.find(p => p.id === quizId);

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

  const maxId = Math.max(...quiz.map(p => p.id), 0);

  const newItem = {
    id: maxId + 1,
    question,
    answer,
    keywords: Array.isArray(keywords) ? keywords : []
  };

  quiz.push(newItem);

  res.status(201).json(newItem);
});


// PUT 
router.put("/:quizId", (req, res) => {
  const quizId = Number(req.params.quizId);

  const item = quiz.find(p => p.id === quizId);

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

  const index = quiz.findIndex(p => p.id === quizId);

  if (index === -1) {
    return res.status(404).json({ message: "Not found" });
  }

  const deleted = quiz.splice(index, 1);

  res.json({
    message: "Deleted successfully",
    item: deleted[0]
  });
});

module.exports = router;