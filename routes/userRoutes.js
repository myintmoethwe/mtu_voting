const express = require("express");
const router = express.Router();

// Ensure pollController exports renderHome and vote
router.get("/", pollController.renderHome);
router.post("/vote", pollController.vote);
