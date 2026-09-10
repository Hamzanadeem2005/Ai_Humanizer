using HumanizeAI_API.Models;
using HumanizeAI_API.Services;
using Microsoft.AspNetCore.Mvc;

namespace HumanizeAI_API.Controllers
{
    // Handles sign up, log in, and the session list (/api/auth/...).
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly DatabaseService _db;

        // IConfiguration is injected by the DI container so DatabaseService
        // can read the connection string from appsettings.json.
        public AuthController(IConfiguration config)
        {
            _db = new DatabaseService(config);
        }

        // Log in: check the name + password, and if they match, start a new session.
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { message = "Please fill in all fields." });

            var user = _db.GetUserByCredentials(req.Username, req.Password);
            if (user == null)
                return Unauthorized(new { message = "Incorrect username or password." });

            var userDict = (dynamic)user;

            string ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            int sessionId = _db.CreateSession((int)userDict.userId, ip);

            return Ok(new
            {
                userId = (int)userDict.userId,
                username = (string)userDict.username,
                sessionId = sessionId,
                token = $"session-{sessionId}"
            });
        }

        // Sign up: make a brand new user account.
        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Username) ||
                string.IsNullOrWhiteSpace(req.Email) ||
                string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { message = "Please fill in all fields." });

            if (_db.EmailExists(req.Email))
                return Conflict(new { message = "An account with this email already exists." });

            int newId = _db.RegisterUser(req.Username, req.Email, req.Password);
            if (newId == 0)
                return StatusCode(500, new { message = "Registration failed - try again." });

            return Ok(new { message = "Account created successfully!" });
        }

        // Lists all login sessions for a user.
        [HttpGet("sessions/{userId}")]
        public IActionResult GetSessions(int userId)
            => Ok(_db.GetSessions(userId));

        // Logs out every session except the newest active one.
        [HttpDelete("sessions/{userId}/revoke-others")]
        public IActionResult RevokeOthers(int userId)
        {
            var sessions = _db.GetSessions(userId);
            var active = sessions
                .Where(s => ((dynamic)s).isActive)
                .OrderByDescending(s => ((dynamic)s).sessionId)
                .FirstOrDefault();

            int keepId = active != null ? (int)((dynamic)active).sessionId : 0;
            _db.RevokeOtherSessions(userId, keepId);

            return Ok(new { message = "All other sessions revoked." });
        }
    }
}
