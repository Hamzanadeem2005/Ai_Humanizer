using Microsoft.AspNetCore.Mvc;
using HumanizeAI_API.Models;
using HumanizeAI_API.Services;

namespace HumanizeAI_API.Controllers
{
    // Handles star ratings + comments people leave on a run (/api/feedback).
    [ApiController]
    [Route("api/[controller]")]
    public class FeedbackController : ControllerBase
    {
        private readonly DatabaseService _db;

        public FeedbackController(IConfiguration config)
        {
            _db = new DatabaseService(config);
        }

        // Save a new piece of feedback for one history row.
        [HttpPost]
        public IActionResult Submit([FromBody] FeedbackRequest req)
        {
            if (req.HistoryId < 1)
                return BadRequest(new { message = "Invalid History ID." });
            if (req.Rating < 1 || req.Rating > 5)
                return BadRequest(new { message = "Rating must be between 1 and 5." });

            _db.SaveFeedback(req.HistoryId, req.Rating, req.Comment);
            return Ok(new { message = "Feedback saved successfully!" });
        }

        // Get all feedback a given user has left.
        [HttpGet("{userId}")]
        public IActionResult GetByUser(int userId)
            => Ok(_db.GetFeedbackByUser(userId));
    }
}
