

--    mysql -u root -p < schema.sql


DROP DATABASE IF EXISTS proconnect;
CREATE DATABASE proconnect;
USE proconnect;


-- TABLE 1: profiles
-- Central table — every other table references this one

CREATE TABLE IF NOT EXISTS profiles (
    id           INT           NOT NULL AUTO_INCREMENT,
    name         VARCHAR(100)  NOT NULL,
    email        VARCHAR(150)  NOT NULL UNIQUE,
    password     VARCHAR(255)  NOT NULL,          -- bcrypt hash
    job_title    VARCHAR(100)  DEFAULT NULL,
    company      VARCHAR(100)  DEFAULT NULL,
    role         ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);


-- TABLE 2: connections
-- Tracks friend/connection requests between profiles

CREATE TABLE IF NOT EXISTS connections (
    id             INT  NOT NULL AUTO_INCREMENT,
    from_profile_id INT NOT NULL,
    to_profile_id   INT NOT NULL,
    status         ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_connection (from_profile_id, to_profile_id),
    CONSTRAINT fk_conn_from FOREIGN KEY (from_profile_id)
        REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_conn_to   FOREIGN KEY (to_profile_id)
        REFERENCES profiles(id) ON DELETE CASCADE
);


-- TABLE 3: posts
-- Updates / status posts written by users

CREATE TABLE IF NOT EXISTS posts (
    id                  INT           NOT NULL AUTO_INCREMENT,
    content             TEXT          NOT NULL,
    posted_by_profile_id INT          NOT NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_post_profile FOREIGN KEY (posted_by_profile_id)
        REFERENCES profiles(id) ON DELETE CASCADE
);


-- TABLE 4: skills
-- Admin-managed catalog of skills (Python, SQL, etc.)
-- Users cannot add new skill names, only pick from this list

CREATE TABLE IF NOT EXISTS skills (
    id          INT           NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)  NOT NULL UNIQUE,
    PRIMARY KEY (id)
);


-- TABLE 5: profile_skills
-- Many-to-many bridge: which profiles have which skills

CREATE TABLE IF NOT EXISTS profile_skills (
    profile_id  INT NOT NULL,
    skill_id    INT NOT NULL,
    PRIMARY KEY (profile_id, skill_id),
    CONSTRAINT fk_ps_profile FOREIGN KEY (profile_id)
        REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ps_skill   FOREIGN KEY (skill_id)
        REFERENCES skills(id)   ON DELETE CASCADE
);


-- TABLE 6: messages
-- Private messages sent between users

CREATE TABLE IF NOT EXISTS messages (
    id           INT  NOT NULL AUTO_INCREMENT,
    sender_id    INT  NOT NULL,
    receiver_id  INT  NOT NULL,
    content      TEXT NOT NULL,
    sent_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_msg_sender   FOREIGN KEY (sender_id)
        REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id)
        REFERENCES profiles(id) ON DELETE CASCADE
);




INSERT INTO profiles (name, email, password, job_title, company, role) VALUES
('Roshan Kumar',   'roshan@example.com',  '$2a$10$F6C31BI4LWG9Ce6u8FND9eW8.IHaxMr.rOlE2IwSPn4y/SwaYHLSK', 'Full Stack Developer', 'TechCorp',    'admin'),
('Priya Sharma',   'priya@example.com',   '$2a$10$F6C31BI4LWG9Ce6u8FND9eW8.IHaxMr.rOlE2IwSPn4y/SwaYHLSK', 'Data Scientist',       'DataWorks',   'user'),
('Arjun Mehta',    'arjun@example.com',   '$2a$10$F6C31BI4LWG9Ce6u8FND9eW8.IHaxMr.rOlE2IwSPn4y/SwaYHLSK', 'Backend Engineer',     'CloudSys',    'user'),
('Sneha Patel',    'sneha@example.com',   '$2a$10$F6C31BI4LWG9Ce6u8FND9eW8.IHaxMr.rOlE2IwSPn4y/SwaYHLSK', 'UI/UX Designer',       'DesignHub',   'user'),
('Vikram Singh',   'vikram@example.com',  '$2a$10$F6C31BI4LWG9Ce6u8FND9eW8.IHaxMr.rOlE2IwSPn4y/SwaYHLSK', 'DevOps Engineer',      'Infra Inc',   'user'),
('Meera Nair',     'meera@example.com',   '$2a$10$F6C31BI4LWG9Ce6u8FND9eW8.IHaxMr.rOlE2IwSPn4y/SwaYHLSK', 'Product Manager',      'ProductCo',   'user'),
('Rahul Gupta',    'rahul@example.com',   '$2a$10$F6C31BI4LWG9Ce6u8FND9eW8.IHaxMr.rOlE2IwSPn4y/SwaYHLSK', 'Frontend Developer',   'WebStudio',   'user');

-- Skills catalog (admin-managed)
INSERT INTO skills (name) VALUES
('JavaScript'),
('Node.js'),
('React'),
('Python'),
('SQL'),
('MySQL'),
('Express.js'),
('HTML/CSS'),
('Git'),
('REST APIs'),
('Docker'),
('AWS');

-- Profile Skills (who has which skills)
INSERT INTO profile_skills (profile_id, skill_id) VALUES
(1, 1), (1, 2), (1, 5), (1, 6),   
(2, 4), (2, 5), (2, 6),            
(3, 2), (3, 7), (3, 10),           
(4, 3), (4, 8),                    
(5, 11),(5, 12),(5, 9),          
(6, 1), (6, 3), (6, 10),        
(7, 1), (7, 3), (7, 8);         

-- Connections
INSERT INTO connections (from_profile_id, to_profile_id, status) VALUES
(1, 2, 'accepted'),   
(1, 3, 'accepted'),   -- Roshan ↔ Arjun
(2, 4, 'accepted'),   -- Priya  ↔ Sneha
(3, 5, 'pending'),    
(4, 6, 'accepted'),   -- Sneha  ↔ Meera
(5, 7, 'rejected'),   -- Vikram → Rahul (rejected)
(6, 1, 'pending');    -- Meera  → Roshan (waiting)

-- Posts
INSERT INTO posts (content, posted_by_profile_id) VALUES
('Just joined ProConnect! Excited to connect with fellow developers.',  1),
('Finished building a machine learning model for sales prediction. SQL + Python combo is powerful!', 2),
('Tips for building REST APIs with Node.js and Express — thread incoming.', 3),
('Just redesigned our app''s dashboard. Clean UI makes a huge difference.', 4),
('Dockerized our entire production stack today. Zero downtime deployment!', 5),
('Great product sprints happen when everyone knows the user story. Focus on the WHY.', 6),
('React hooks are so much cleaner than class components. Never going back.', 7),
('SQL joins explained in plain English — INNER, LEFT, RIGHT, FULL. Which do you use most?', 1),
('Python pandas tip: use .groupby() + .agg() for powerful summary tables.', 2);

-- Messages
INSERT INTO messages (sender_id, receiver_id, content) VALUES
(1, 2, 'Hey Priya! Loved your post about Python. Would love to collaborate sometime.'),
(2, 1, 'Thanks Roshan! Sure, let us set up a call this week.'),
(3, 1, 'Hey, can you review my API design before I push it to the team?'),
(1, 3, 'Of course! Share the doc and I will take a look.'),
(4, 6, 'Hi Meera! Do you have any resources on product roadmap planning?'),
(6, 4, 'Yes! I will send you a template we use at ProductCo.'),
(5, 7, 'Rahul, which CSS framework do you prefer — Tailwind or Bootstrap?'),
(7, 5, 'Tailwind all the way — utility-first is just faster once you get used to it.');
