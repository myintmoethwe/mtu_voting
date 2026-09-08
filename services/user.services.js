const db = require("../config/db")

exports.postVote = async ({
    kingId,
    queenId,
    mrSmartId,
    msStyleId,
    mrPopularId,
    msPopularId,
    email,
}) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        if (kingId) {
            await client.query(
                'UPDATE participants SET "kingVotes" = "kingVotes" + 1 WHERE id = $1',
                [kingId]
            );
        }
        if (queenId) {
            await client.query(
                'UPDATE participants SET "queenVotes" = "queenVotes" + 1 WHERE id = $1',
                [queenId]
            );
        }
        if (mrSmartId) {
            await client.query(
                'UPDATE participants SET "smartVotes" = "smartVotes" + 1 WHERE id = $1',
                [mrSmartId]
            );
        }
        if (msStyleId) {
            await client.query(
                'UPDATE participants SET "styleVotes" = "styleVotes" + 1 WHERE id = $1',
                [msStyleId]
            );
        }
        if (mrPopularId) {
            await client.query(
                'UPDATE participants SET "boyPopularVotes" = "boyPopularVotes" + 1 WHERE id = $1',
                [mrPopularId]
            );
        }
        if (msPopularId) {
            await client.query(
                'UPDATE participants SET "girlPopularVotes" = "girlPopularVotes" + 1 WHERE id = $1',
                [msPopularId]
            );
        }

        // Save vote and email in voted_users table
        if (email) {
            await client.query(
                `UPDATE voted_users 
                 SET king_id = $2, 
                     queen_id = $3, 
                     mr_smart_id = $4, 
                     ms_style_id = $5, 
                     mr_popular_id = $6, 
                     ms_popular_id = $7,
                     has_voted = TRUE
                 WHERE email = $1`,
                [
                    email,
                    kingId || null,
                    queenId || null,
                    mrSmartId || null,
                    msStyleId || null,
                    mrPopularId || null,
                    msPopularId || null
                ]
            );
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.getAllParticipants = async () => {
    const query = `
        SELECT 
            ROW_NUMBER() OVER (ORDER BY id ASC) AS display_id,
            id,
            name,
            photo,
            description,
            gender,
            hobby,
            hometown,
            "kingVotes",
            "queenVotes",
            "smartVotes",
            "styleVotes",
            "boyPopularVotes",
            "girlPopularVotes"
        FROM participants;`; 
    const { rows } = await db.query(query);
    return rows;
};