using MySqlConnector;
using BCrypt.Net;

namespace HumanizeAI_API.Services
{
    // This class is the only place that talks to the MySQL database.
    // Every method opens its own connection, runs one job, then closes it.
    public class DatabaseService
    {
        // Connection string is read from appsettings.json ("ConnectionStrings:Default")
        // so that no credentials are hardcoded in source code.
        private readonly string _conn;

        public DatabaseService(IConfiguration config)
        {
            _conn = config.GetConnectionString("Default")
                ?? throw new InvalidOperationException(
                    "Database connection string 'Default' is missing from appsettings.json.");
        }

        // Loads the word-swap dictionary (AI word -> human word) used by Basic mode.
        public Dictionary<string, string> GetSynonyms()
        {
            var synonyms = new Dictionary<string, string>();
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "SELECT OriginalText, HumanizedText FROM humanizationdictionary", conn);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    string key = reader["OriginalText"].ToString()?.ToLower().Trim() ?? "";
                    string val = reader["HumanizedText"].ToString() ?? "";
                    if (!string.IsNullOrEmpty(key)) synonyms[key] = val;
                }
                Console.WriteLine($"[DB] Loaded {synonyms.Count} synonyms");
            }
            catch (Exception ex) { Console.WriteLine("[DB] GetSynonyms: " + ex.Message); }
            return synonyms;
        }

        // Saves one humanize run into the history table, then bumps the analytics.
        public void SaveHistory(int userId, string inputText, string outputText,
                                int humanScore, int aiScore, int toneId = 1)
        {
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "INSERT INTO transformationhistory " +
                    "(UserID, InputText, OutputText, HumanScore, AIScore, AppliedToneID, ProcessedAt) " +
                    "VALUES (@uid, @inp, @out, @hs, @ai, @tone, NOW())", conn);
                cmd.Parameters.AddWithValue("@uid", userId);
                cmd.Parameters.AddWithValue("@inp", inputText);
                cmd.Parameters.AddWithValue("@out", outputText);
                cmd.Parameters.AddWithValue("@hs", humanScore);
                cmd.Parameters.AddWithValue("@ai", aiScore);
                cmd.Parameters.AddWithValue("@tone", toneId);
                cmd.ExecuteNonQuery();
                Console.WriteLine("[DB] History saved");
                UpdateAnalytics(userId, humanScore);
            }
            catch (Exception ex) { Console.WriteLine("[DB] SaveHistory: " + ex.Message); }
        }

        // Gets the last 50 runs for one user (newest first) for the History page.
        public List<object> GetUserHistory(int userId)
        {
            var list = new List<object>();
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "SELECT h.HistoryID, h.InputText, h.OutputText, " +
                    "       h.HumanScore, h.AIScore, h.ProcessedAt, " +
                    "       COALESCE(t.ToneName,'Casual') AS ToneName " +
                    "FROM transformationhistory h " +
                    "LEFT JOIN toneprofiles t ON h.AppliedToneID = t.ToneID " +
                    "WHERE h.UserID = @uid " +
                    "ORDER BY h.ProcessedAt DESC LIMIT 50", conn);
                cmd.Parameters.AddWithValue("@uid", userId);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                    list.Add(new
                    {
                        historyId = Convert.ToInt32(reader["HistoryID"]),
                        inputText = reader["InputText"].ToString(),
                        outputText = reader["OutputText"].ToString(),
                        humanScore = Convert.ToInt32(reader["HumanScore"]),
                        aiScore = Convert.ToInt32(reader["AIScore"]),
                        processedAt = Convert.ToDateTime(reader["ProcessedAt"])
                            .ToString("yyyy-MM-dd HH:mm:ss"),
                        toneName = reader["ToneName"].ToString()
                    });
            }
            catch (Exception ex) { Console.WriteLine("[DB] GetHistory: " + ex.Message); }
            return list;
        }

        // Deletes one history row (and any feedback attached to it first).
        public bool DeleteHistory(int historyId)
        {
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var delFb = new MySqlCommand(
                    "DELETE FROM userfeedback WHERE HistoryID=@id", conn);
                delFb.Parameters.AddWithValue("@id", historyId);
                delFb.ExecuteNonQuery();

                using var cmd = new MySqlCommand(
                    "DELETE FROM transformationhistory WHERE HistoryID=@id", conn);
                cmd.Parameters.AddWithValue("@id", historyId);
                return cmd.ExecuteNonQuery() > 0;
            }
            catch (Exception ex) { Console.WriteLine("[DB] DeleteHistory: " + ex.Message); return false; }
        }

        // Quick totals for one user: how many runs, average human score, average reduction.
        public object GetStats(int userId)
        {
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "SELECT COUNT(*) AS runs, COALESCE(AVG(HumanScore),0) AS avgHuman, " +
                    "COALESCE(AVG(HumanScore-AIScore),0) AS avgReduction " +
                    "FROM transformationhistory WHERE UserID=@uid", conn);
                cmd.Parameters.AddWithValue("@uid", userId);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                    return new
                    {
                        runs = Convert.ToInt32(reader["runs"]),
                        avgHumanScore = (int)Math.Round(Convert.ToDouble(reader["avgHuman"])),
                        avgReduction = (int)Math.Round(Convert.ToDouble(reader["avgReduction"]))
                    };
            }
            catch (Exception ex) { Console.WriteLine("[DB] GetStats: " + ex.Message); }
            return new { runs = 0, avgHumanScore = 0, avgReduction = 0 };
        }

        // Keeps the useranalytics table in sync after each run.
        private void UpdateAnalytics(int userId, int humanScore)
        {
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var check = new MySqlCommand(
                    "SELECT COUNT(*) FROM useranalytics WHERE UserID=@uid", conn);
                check.Parameters.AddWithValue("@uid", userId);
                long exists = (long)check.ExecuteScalar()!;

                if (exists == 0)
                {
                    using var ins = new MySqlCommand(
                        "INSERT INTO useranalytics (UserID,TotalRequests,AverageHumanScore,LastActive) " +
                        "VALUES(@uid,1,@hs,NOW())", conn);
                    ins.Parameters.AddWithValue("@uid", userId);
                    ins.Parameters.AddWithValue("@hs", humanScore);
                    ins.ExecuteNonQuery();
                }
                else
                {
                    using var upd = new MySqlCommand(
                        "UPDATE useranalytics SET " +
                        "TotalRequests=TotalRequests+1, " +
                        "AverageHumanScore=((AverageHumanScore*TotalRequests)+@hs)/(TotalRequests+1), " +
                        "LastActive=NOW() WHERE UserID=@uid", conn);
                    upd.Parameters.AddWithValue("@hs", humanScore);
                    upd.Parameters.AddWithValue("@uid", userId);
                    upd.ExecuteNonQuery();
                }
            }
            catch (Exception ex) { Console.WriteLine("[DB] Analytics: " + ex.Message); }
        }

        // Login check: verifies the BCrypt hash stored in the DB against the supplied password.
        public object? GetUserByCredentials(string fullName, string password)
        {
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                // Fetch the stored hash along with user details.
                using var cmd = new MySqlCommand(
                    "SELECT UserID, FullName, Email, Password FROM users " +
                    "WHERE FullName=@name LIMIT 1", conn);
                cmd.Parameters.AddWithValue("@name", fullName);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    string storedHash = reader["Password"].ToString() ?? "";

                    // BCrypt.Verify returns true only when the plaintext matches the hash.
                    // It also handles old plaintext passwords gracefully: if the stored value
                    // is not a valid BCrypt hash, Verify throws, so we catch and return null.
                    bool valid;
                    try { valid = BCrypt.Net.BCrypt.Verify(password, storedHash); }
                    catch { valid = false; }

                    if (!valid) return null;

                    return new
                    {
                        userId = Convert.ToInt32(reader["UserID"]),
                        username = reader["FullName"].ToString(),
                        email = reader["Email"].ToString()
                    };
                }
            }
            catch (Exception ex) { Console.WriteLine("[DB] GetUser: " + ex.Message); }
            return null;
        }

        // Used during sign up to stop two accounts sharing the same email.
        public bool EmailExists(string email)
        {
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "SELECT COUNT(*) FROM users WHERE Email=@email", conn);
                cmd.Parameters.AddWithValue("@email", email);
                return (long)cmd.ExecuteScalar()! > 0;
            }
            catch { return false; }
        }

        // Adds a new user row with a BCrypt-hashed password and returns the new UserID.
        public int RegisterUser(string fullName, string email, string password)
        {
            try
            {
                // Hash the password before storing — work factor 12 is the recommended default.
                string hashedPassword = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "INSERT INTO users (FullName, Email, Password, CreatedAt) " +
                    "VALUES (@name, @email, @pwd, NOW()); SELECT LAST_INSERT_ID();", conn);
                cmd.Parameters.AddWithValue("@name", fullName);
                cmd.Parameters.AddWithValue("@email", email);
                cmd.Parameters.AddWithValue("@pwd", hashedPassword);
                return Convert.ToInt32(cmd.ExecuteScalar());
            }
            catch (Exception ex) { Console.WriteLine("[DB] Register: " + ex.Message); return 0; }
        }

        // Records a login as a new session row and returns its SessionID.
        public int CreateSession(int userId, string ipAddress)
        {
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "INSERT INTO usersessions (UserID, LoginTime, IPAddress) " +
                    "VALUES (@uid, NOW(), @ip); SELECT LAST_INSERT_ID();", conn);
                cmd.Parameters.AddWithValue("@uid", userId);
                cmd.Parameters.AddWithValue("@ip", ipAddress);
                return Convert.ToInt32(cmd.ExecuteScalar());
            }
            catch (Exception ex) { Console.WriteLine("[DB] CreateSession: " + ex.Message); return 0; }
        }

        // Lists every login session for a user (newest first).
        public List<object> GetSessions(int userId)
        {
            var list = new List<object>();
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "SELECT SessionID, UserID, LoginTime, LogoutTime, IPAddress " +
                    "FROM usersessions WHERE UserID=@uid " +
                    "ORDER BY LoginTime DESC", conn);
                cmd.Parameters.AddWithValue("@uid", userId);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                    list.Add(new
                    {
                        sessionId = Convert.ToInt32(reader["SessionID"]),
                        userId = Convert.ToInt32(reader["UserID"]),
                        loginTime = reader["LoginTime"].ToString(),
                        logoutTime = reader["LogoutTime"] == DBNull.Value ? null : reader["LogoutTime"].ToString(),
                        ipAddress = reader["IPAddress"].ToString(),
                        isActive = reader["LogoutTime"] == DBNull.Value
                    });
            }
            catch (Exception ex) { Console.WriteLine("[DB] GetSessions: " + ex.Message); }
            return list;
        }

        // Logs out every other session except the one we want to keep.
        public void RevokeOtherSessions(int userId, int keepSessionId)
        {
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "UPDATE usersessions SET LogoutTime=NOW() " +
                    "WHERE UserID=@uid AND SessionID != @keep AND LogoutTime IS NULL", conn);
                cmd.Parameters.AddWithValue("@uid", userId);
                cmd.Parameters.AddWithValue("@keep", keepSessionId);
                cmd.ExecuteNonQuery();
            }
            catch (Exception ex) { Console.WriteLine("[DB] RevokeOthers: " + ex.Message); }
        }

        // Marks a single session as logged out.
        public void CloseSession(int sessionId)
        {
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "UPDATE usersessions SET LogoutTime=NOW() WHERE SessionID=@sid", conn);
                cmd.Parameters.AddWithValue("@sid", sessionId);
                cmd.ExecuteNonQuery();
            }
            catch (Exception ex) { Console.WriteLine("[DB] CloseSession: " + ex.Message); }
        }

        // Saves a star rating + comment a user left on one of their runs.
        public void SaveFeedback(int historyId, int rating, string comment)
        {
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "INSERT INTO userfeedback (HistoryID, Rating, UserComment, CreatedAt) " +
                    "VALUES (@hid, @rating, @comment, NOW())", conn);
                cmd.Parameters.AddWithValue("@hid", historyId);
                cmd.Parameters.AddWithValue("@rating", rating);
                cmd.Parameters.AddWithValue("@comment", comment);
                cmd.ExecuteNonQuery();
                Console.WriteLine("[DB] Feedback saved");
            }
            catch (Exception ex) { Console.WriteLine("[DB] SaveFeedback: " + ex.Message); }
        }

        // Gets all feedback this user has left (joined back to their history rows).
        public List<object> GetFeedbackByUser(int userId)
        {
            var list = new List<object>();
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                using var cmd = new MySqlCommand(
                    "SELECT f.FeedbackID, f.HistoryID, f.Rating, f.UserComment, f.CreatedAt " +
                    "FROM userfeedback f " +
                    "INNER JOIN transformationhistory h ON f.HistoryID = h.HistoryID " +
                    "WHERE h.UserID = @uid " +
                    "ORDER BY f.CreatedAt DESC", conn);
                cmd.Parameters.AddWithValue("@uid", userId);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                    list.Add(new
                    {
                        feedbackId = Convert.ToInt32(reader["FeedbackID"]),
                        historyId = Convert.ToInt32(reader["HistoryID"]),
                        rating = Convert.ToInt32(reader["Rating"]),
                        comment = reader["UserComment"].ToString(),
                        submittedAt = reader["CreatedAt"].ToString()
                    });
            }
            catch (Exception ex) { Console.WriteLine("[DB] GetFeedback: " + ex.Message); }
            return list;
        }

        // Simple ping: tries to open a connection so we know if MySQL is up.
        public bool TestConnection()
        {
            try
            {
                using var conn = new MySqlConnection(_conn);
                conn.Open();
                return true;
            }
            catch { return false; }
        }
    }
}
