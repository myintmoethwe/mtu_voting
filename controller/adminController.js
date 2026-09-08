exports.renderAdminDashboard = async (req, res) => {
  const winners = await participantModel.getWinners();

  const participants = await participantModel.getAll();
  const stats = await participantModel.getVoteTotals();

  res.render("admin-dashboard", {
    winners,
    stats,
    participants,
    user: req.session.user,
    vote_count: stats,
  });
};
