const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "target.json");

const DEFAULT_DATA = {
    targetTime: 0,
    remaining: 0,
    duration: 0,
    status: "reset"
};

function getData() {

    if (!fs.existsSync(DATA_FILE)) {
        return DEFAULT_DATA;
    }

    try {

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        // Running countdown
        if (
            data.status === "running" &&
            data.targetTime > 0
        ) {

            const now = Date.now();

            // Scheduled - not started yet
            if (now < data.targetTime) {

                return {
                    ...data,
                    remaining: data.duration
                };
            }

            // Countdown has started
            const endTime =
                data.targetTime + data.duration;

            const remaining =
                endTime - now;

            // Finished
            if (remaining <= 0) {

                const finishedData = {
                    ...data,
                    remaining: 0,
                    status: "finished"
                };

                saveData(finishedData);

                return finishedData;
            }

            return {
                ...data,
                remaining
            };
        }

        return data;

    } catch (error) {

        console.error(error);

        return DEFAULT_DATA;
    }
}


function saveData(data) {

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2)
    );
}


// HOME
app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "views", "home.ejs")
    );
});


// ADMIN
app.get("/admin", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "admin_dashboard.html"
        )
    );
});


// GET COUNTDOWN
app.get("/api/countdown", (req, res) => {

    const data = getData();

    res.json({
        targetTime: data.targetTime || 0,
        remaining: data.remaining || 0,
        duration: data.duration || 0,
        status: data.status || "reset"
    });
});


// START / SCHEDULE
app.post("/api/admin/update", (req, res) => {

    const {
        newTarget,
        duration
    } = req.body;

    const targetTime = Number(newTarget);
    const countdownDuration = Number(duration);

    if (
        !targetTime ||
        isNaN(targetTime) ||
        !countdownDuration ||
        isNaN(countdownDuration)
    ) {

        return res.status(400).json({
            success: false,
            message: "Invalid date, time or duration."
        });
    }

    if (targetTime <= Date.now()) {

        return res.status(400).json({
            success: false,
            message: "Start date and time must be in the future."
        });
    }

    const payload = {

        targetTime: targetTime,

        remaining: countdownDuration,

        duration: countdownDuration,

        status: "running"
    };

    saveData(payload);

    res.json({
        success: true,
        ...payload
    });
});


// PAUSE
app.post("/api/admin/pause", (req, res) => {

    const data = getData();

    if (data.status !== "running") {

        return res.json({
            success: false,
            message: "Countdown is not running."
        });
    }

    const now = Date.now();

    let remaining = data.duration;

    if (now >= data.targetTime) {

        remaining = Math.max(
            0,
            data.targetTime +
            data.duration -
            now
        );
    }

    const payload = {

        targetTime: data.targetTime,

        remaining: remaining,

        duration: data.duration,

        status: "paused"
    };

    saveData(payload);

    res.json({
        success: true,
        remaining,
        status: "paused"
    });
});


// RESUME
app.post("/api/admin/resume", (req, res) => {

    const data = getData();

    if (data.status !== "paused") {

        return res.json({
            success: false,
            message: "Countdown is not paused."
        });
    }

    const remaining =
        Number(data.remaining || 0);

    if (remaining <= 0) {

        return res.json({
            success: false,
            message: "Countdown has finished."
        });
    }

    const targetTime =
        Date.now() + remaining;

    const payload = {

        targetTime,

        remaining,

        duration: data.duration || remaining,

        status: "running"
    };

    saveData(payload);

    res.json({
        success: true,
        targetTime,
        remaining,
        status: "running"
    });
});


// RESET
app.post("/api/admin/reset", (req, res) => {

    saveData(DEFAULT_DATA);

    res.json({
        success: true,
        ...DEFAULT_DATA
    });
});


app.listen(PORT, () => {

    console.log(
        `Countdown server running at http://localhost:${PORT}`
    );
});