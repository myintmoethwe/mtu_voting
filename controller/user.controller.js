const { getAllParticipants, postVote } = require("../services/user.services");
const { getWinners } = require("../services/admin.services");
const db = require("../config/db");

exports.renderHome = async (req, res) => {
  const participants = await getAllParticipants();
  let winners = null;

  winners = await getWinners();
  const user = req.session ? req.session.user : null;
  const hasVoted = req.session ? !!req.session.hasVoted : false;
  res.render("index", {
    participants,
    winners,
    user,
    hasVoted,
  });
};
exports.vote = async (req, res) => {
  try {
    const { kingId, queenId, mrSmartId, msStyleId, mrPopularId, msPopularId } =
      req.body;

    if (req.session.hasVoted) {
      return res.render("votingpage");;
    }

    await postVote({
      kingId,
      queenId,
      mrSmartId,
      msStyleId,
      mrPopularId,
      msPopularId,
    });

    req.session.hasVoted = true;
    res.render("votedpage");
  } catch (error) {
    res.status(500).send("Error submitting votes: " + error.message);
  }
};
