const pool = require('../config/db');
const {
  createParticipant,
  getTotalVotes,
  updateParticipant,
  deleteParticipant,
  updateSettings,
  getSettings,
  getWinners,
  getVoteRecords,
  updateCountdownService,
  updateCountdownStatusService,
  getTopThreeResults, // <-- 1. Make sure this is required from admin.services
} = require("../services/admin.services");
const { getAllParticipants } = require("../services/user.services");

exports.createParticipant = async (req, res) => {
  const { name, description, gender, hobby, hometown } = req.body;
  const photo = req.file
    ? `/uploads/${req.file.filename}`
    : "/uploads/default.jpg";
  await createParticipant(name, photo, description, gender, hobby, hometown);
  res.redirect("/admin/dashboard");
};

exports.updateParticipant = async (req, res) => {
  const id = req.params.id;
  const { name, description, gender, hobby, hometown } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : null;
  await updateParticipant(id, name, photo, description, gender, hobby, hometown);
  res.redirect("/admin/dashboard"); 
};

exports.deleteParticipant = async (req, res) => {
  await deleteParticipant(req.params.id);
  res.redirect("/admin/dashboard");
};

exports.updateSettings = async (req, res) => {
  try {
    const { event_date, is_voting_open, one_vote_per_student, show_results } = req.body;
    
    const settingsData = {
      event_date: event_date || null,
      is_voting_open: is_voting_open === "open" || is_voting_open === true || is_voting_open === "on",
      one_vote_per_student: one_vote_per_student === "on" || one_vote_per_student === true,
      show_results: show_results === "on" || show_results === true,
    };

    await updateSettings(settingsData);
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).send("Server Error");
  }
};

exports.updateCountdown = async (req, res) => {
    try {
        const { target_time, remaining, duration, countdown_status } = req.body;

        await updateCountdownService({ target_time, remaining, duration, countdown_status });

        const io = req.app.get('io');
        if (io) {
            io.emit('countdownUpdated', {
                target_time,
                remaining,
                duration,
                countdown_status
            });
        }

        res.json({ success: true, message: "Countdown updated successfully" });
    } catch (err) {
        console.error("Error updating countdown:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.pauseCountdown = async (req, res) => {
    try {
        await updateCountdownStatusService('Paused');
        
        const settings = await getSettings();
        const io = req.app.get('io');
        if (io) {
            io.emit('countdownUpdated', {
                target_time: settings.target_time,
                remaining: settings.remaining,
                duration: settings.duration,
                countdown_status: 'Paused'
            });
        }

        res.json({ success: true, message: "Countdown paused" });
    } catch (err) {
        console.error("Error pausing countdown:", err);
        res.status(500).json({ error: "Failed to pause" });
    }
};

exports.resumeCountdown = async (req, res) => {
    try {
        await updateCountdownStatusService('running');

        const settings = await getSettings();
        const io = req.app.get('io');
        if (io) {
            io.emit('countdownUpdated', {
                target_time: settings.target_time,
                remaining: settings.remaining,
                duration: settings.duration,
                countdown_status: 'running'
            });
        }

        res.json({ success: true, message: "Countdown resumed" });
    } catch (err) {
        console.error("Error resuming countdown:", err);
        res.status(500).json({ error: "Failed to resume" });
    }
};

exports.resetCountdown = async (req, res) => {
    try {
        await updateCountdownStatusService('Reset');

        const settings = await getSettings();
        const io = req.app.get('io');
        if (io) {
            io.emit('countdownUpdated', {
                target_time: settings.target_time,
                remaining: settings.remaining,
                duration: settings.duration,
                countdown_status: 'Reset'
            });
        }

        res.json({ success: true, message: "Countdown reset" });
    } catch (err) {
        console.error("Error resetting countdown:", err);
        res.status(500).json({ error: "Failed to reset" });
    }
};

exports.renderAdminDashboard = async (req, res) => {
  try {
    const winners = await getWinners();
    const participants = await getAllParticipants();
    const stats = await getTotalVotes();
    const settings = await getSettings(); 
    const voteRecords = await getVoteRecords(); 
    const topResults = await getTopThreeResults(); // <--- Added
    
    res.render("admin-dashboard", {
      kings: winners.king ? [winners.king] : [],
      queens: winners.queen ? [winners.queen] : [],
      mrSmarts: winners.mrSmart ? [winners.mrSmart] : [],
      msStyles: winners.msStyle ? [winners.msStyle] : [],
      mrPopulars: winners.mrPopular ? [winners.mrPopular] : [],
      msPopulars: winners.msPopular ? [winners.msPopular] : [],
      winners,
      stats,
      participants,
      settings, 
      voteRecords, 
      topResults, // <--- Passed into view
      user: req.session.user,
      vote_count: stats,
    });
  } catch (err) {
    console.error("Error loading admin dashboard:", err);
    res.status(500).send("Server Error");
  }
};

exports.renderSettings = async (req, res) => {
  try {
    const winners = await getWinners();
    const participants = await getAllParticipants();
    const stats = await getTotalVotes();
    const settings = await getSettings();
    const voteRecords = await getVoteRecords();
    const topResults = await getTopThreeResults(); // <--- Added

    res.render("admin-dashboard", {
      kings: winners.king ? [winners.king] : [],
      queens: winners.queen ? [winners.queen] : [],
      mrSmarts: winners.mrSmart ? [winners.mrSmart] : [],
      msStyles: winners.msStyle ? [winners.msStyle] : [],
      mrPopulars: winners.mrPopular ? [winners.mrPopular] : [],
      msPopulars: winners.msPopular ? [winners.msPopular] : [],
      winners,
      stats,
      participants,
      settings,
      voteRecords,
      topResults, // <--- Passed into view
      user: req.session.user,
      vote_count: stats,
    });
  } catch (err) {
    console.error("Error rendering settings:", err);
    res.status(500).send("Server Error");
  }
};

exports.renderResultsPage = async (req, res) => {
  try {
    const winners = await getWinners();
    const settings = await getSettings(); 
    const topResults = await getTopThreeResults(); 
    
    const votesQuery = await pool.query(`
      SELECT COALESCE(SUM("kingVotes" + "queenVotes" + "smartVotes" + "styleVotes" + "boyPopularVotes" + "girlPopularVotes"), 0) AS total_votes 
      FROM participants
    `);

    const studentsQuery = await pool.query(`
      SELECT COUNT(*) AS total_students FROM voted_users
    `);

    const totalVotes = votesQuery.rows[0].total_votes;
    const totalStudentsVoted = studentsQuery.rows[0].total_students;

    res.render("results", {
      winners,
      topResults, 
      totalVotes,
      totalStudentsVoted,
      settings 
    });
  } catch (error) {
    console.error("Error loading results page:", error);
    res.status(500).send("Server Error: " + error.message);
  }
};

exports.getCountdownStatusApi = async (req, res) => {
    try {
        const settings = await getSettings();
        res.json({
            target_time: settings.target_time,
            duration: settings.duration,
            countdown_status: settings.countdown_status
        });
    } catch (err) {
        console.error("Error fetching countdown status API:", err);
        res.status(500).json({ error: "Server Error" });
    }
}; 

exports.getCandidatesApi = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM participants ORDER BY id ASC");
        
        const candidates = result.rows.map(row => ({
            id: row.id,
            name: row.name || "",
            photo: row.photo ? `/uploads/${row.photo.replace(/^\/+/, '').replace(/^uploads\//, '')}` : "/uploads/default.jpg",
            description_text: row.description_text || "",
            gender: row.gender || "",
            hobby: row.hobby || "",
            hometown: row.hometown || "",
            category: row.category || row.gender || "", 
            role: row.role || "",
            kingVotes: row.kingvotes || row.kingVotes || row.king_votes || 0,
            queenVotes: row.queenvotes || row.queenVotes || row.queen_votes || 0
        }));

        res.status(200).json(candidates);
    } catch (error) {
        console.error("Error fetching candidates:", error);
        res.status(500).json({ error: "Failed to fetch candidates" });
    }
};