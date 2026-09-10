-- HumanizeAI database setup 


CREATE DATABASE IF NOT EXISTS humanizeai_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE humanizeai_db;




-- the people who sign up. Email must be unique so no two accounts share one.
CREATE TABLE IF NOT EXISTS users (
  UserID    INT AUTO_INCREMENT PRIMARY KEY,
  FullName  VARCHAR(150) NOT NULL,
  Email     VARCHAR(190) NOT NULL UNIQUE,
  Password  VARCHAR(255) NOT NULL,
  CreatedAt DATETIME NOT NULL
) ENGINE=InnoDB;

-- the four writing tones (Casual, Formal, Academic, Professional)
CREATE TABLE IF NOT EXISTS toneprofiles (
  ToneID   INT AUTO_INCREMENT PRIMARY KEY,
  ToneName VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

-- one row per login. LogoutTime stays NULL until the session ends.
CREATE TABLE IF NOT EXISTS usersessions (
  SessionID  INT AUTO_INCREMENT PRIMARY KEY,
  UserID     INT NOT NULL,
  LoginTime  DATETIME NOT NULL,
  LogoutTime DATETIME NULL,
  IPAddress  VARCHAR(64) NULL,
  -- if a user is deleted, their sessions go too
  CONSTRAINT fk_sessions_user FOREIGN KEY (UserID) REFERENCES users(UserID) ON DELETE CASCADE
) ENGINE=InnoDB;

-- every humanize run: the before/after text and the AI/human scores
CREATE TABLE IF NOT EXISTS transformationhistory (
  HistoryID     INT AUTO_INCREMENT PRIMARY KEY,
  UserID        INT NOT NULL,
  InputText     TEXT NOT NULL,
  OutputText    TEXT NOT NULL,
  HumanScore    INT NOT NULL,
  AIScore       INT NOT NULL,
  AppliedToneID INT NOT NULL DEFAULT 1,
  ProcessedAt   DATETIME NOT NULL,
  CONSTRAINT fk_hist_user FOREIGN KEY (UserID) REFERENCES users(UserID) ON DELETE CASCADE,
  CONSTRAINT fk_hist_tone FOREIGN KEY (AppliedToneID) REFERENCES toneprofiles(ToneID),
  -- scores have to stay between 0 and 100
  CONSTRAINT chk_scores CHECK (AIScore BETWEEN 0 AND 100 AND HumanScore BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- running totals per user (used for the analytics numbers)
CREATE TABLE IF NOT EXISTS useranalytics (
  UserID            INT PRIMARY KEY,
  TotalRequests     INT NOT NULL DEFAULT 0,
  AverageHumanScore DOUBLE NOT NULL DEFAULT 0,
  LastActive        DATETIME NULL,
  CONSTRAINT fk_analytics_user FOREIGN KEY (UserID) REFERENCES users(UserID) ON DELETE CASCADE
) ENGINE=InnoDB;

-- star ratings + comments people leave on a run
CREATE TABLE IF NOT EXISTS userfeedback (
  FeedbackID  INT AUTO_INCREMENT PRIMARY KEY,
  HistoryID   INT NOT NULL,
  Rating      INT NOT NULL,
  UserComment TEXT NULL,
  CreatedAt   DATETIME NOT NULL,
  CONSTRAINT fk_feedback_hist FOREIGN KEY (HistoryID) REFERENCES transformationhistory(HistoryID) ON DELETE CASCADE,
  -- rating must be 1 to 5 stars
  CONSTRAINT chk_rating CHECK (Rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- the word-swap list Basic mode uses (AI word -> human word)
CREATE TABLE IF NOT EXISTS humanizationdictionary (
  ID            INT AUTO_INCREMENT PRIMARY KEY,
  OriginalText  VARCHAR(190) NOT NULL UNIQUE,
  HumanizedText VARCHAR(190) NOT NULL
) ENGINE=InnoDB;

-- fill in the four tones (won't duplicate if they already exist)
INSERT INTO toneprofiles (ToneID, ToneName) VALUES
  (1, 'Casual'), (2, 'Formal'), (3, 'Academic'), (4, 'Professional')
  AS new ON DUPLICATE KEY UPDATE ToneName = new.ToneName;


-- ============================================================
-- VIEW
-- A ready-made "history with tone names" table. Saves writing the join
-- every time - just do:  SELECT * FROM vw_user_history;
-- ============================================================
CREATE OR REPLACE VIEW vw_user_history AS
SELECT h.HistoryID,
       h.UserID,
       h.InputText,
       h.OutputText,
       h.HumanScore,
       h.AIScore,
       h.ProcessedAt,
       COALESCE(t.ToneName, 'Casual') AS ToneName
FROM transformationhistory h
LEFT JOIN toneprofiles t ON h.AppliedToneID = t.ToneID;



-- AUDIT TABLE (the trigger below writes into this)

CREATE TABLE IF NOT EXISTS historyaudit (
  AuditID   INT AUTO_INCREMENT PRIMARY KEY,
  HistoryID INT NOT NULL,
  UserID    INT NOT NULL,
  Action    VARCHAR(50) NOT NULL,
  LoggedAt  DATETIME NOT NULL
) ENGINE=InnoDB;


-- STORED PROCEDURE


DROP PROCEDURE IF EXISTS sp_get_user_stats;
DELIMITER $$
CREATE PROCEDURE sp_get_user_stats(IN p_user_id INT)
BEGIN
    SELECT COUNT(*)                              AS Runs,
           COALESCE(AVG(HumanScore), 0)          AS AvgHumanScore,
           COALESCE(AVG(HumanScore - AIScore), 0) AS AvgReduction
    FROM transformationhistory
    WHERE UserID = p_user_id;
END$$
DELIMITER ;


-- TRIGGER

DROP TRIGGER IF EXISTS trg_history_after_insert;
DELIMITER $$
CREATE TRIGGER trg_history_after_insert
AFTER INSERT ON transformationhistory
FOR EACH ROW
BEGIN
    INSERT INTO historyaudit (HistoryID, UserID, Action, LoggedAt)
    VALUES (NEW.HistoryID, NEW.UserID, 'INSERT', NOW());
END$$
DELIMITER ;
