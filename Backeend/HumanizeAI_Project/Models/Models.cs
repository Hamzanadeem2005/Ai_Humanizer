// These are simple data holders that match the JSON the website sends/receives.
namespace HumanizeAI_API.Models
{
    // what the website sends when asking to humanize text
    public class HumanizeRequest
    {
        public string OriginalText { get; set; } = "";   // the text to fix
        public int UserId { get; set; } = 1;              // who's logged in
        public int ToneId { get; set; } = 1;              // 1 casual, 2 formal, 3 academic, 4 professional
        public string Length { get; set; } = "same";      // same / shorter / longer (advanced mode)
    }

    // what we send back after humanizing
    public class HumanizeResponse
    {
        public string HumanizedText { get; set; } = "";
        public int AIScore { get; set; }      // 0-100, higher = more AI-looking
        public int HumanScore { get; set; }   // 0-100, higher = more human-looking
        public string Mode { get; set; } = "";
        public string Message { get; set; } = "";
    }

    // login form fields
    public class LoginRequest
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
    }

    // sign up form fields
    public class RegisterRequest
    {
        public string Username { get; set; } = "";
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
    }

    // feedback form fields (rating 1-5 + optional comment, tied to a history row)
    public class FeedbackRequest
    {
        public int UserId { get; set; }
        public int HistoryId { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; } = "";
    }
}