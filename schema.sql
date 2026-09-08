-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'voter', -- 'admin' or 'voter'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Participants Table (Managed by Admin)
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    photo VARCHAR(255) NOT NULL,
    description TEXT,
    vote_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Votes Table (Enforces 1 vote per user)
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    participant_id INT REFERENCES participants(id) ON DELETE CASCADE,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id) -- Ensures 1 user can only vote once
);