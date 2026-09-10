using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using HumanizeAI_API.Models;
using HumanizeAI_API.Services;

namespace HumanizeAI_API.Controllers
{
    // All the /api/humanize/... endpoints live here (basic, advanced, detect, history, stats).
    [ApiController]
    [Route("api/[controller]")]
    public class HumanizeController : ControllerBase
    {
        private readonly DatabaseService _db;

        // The OpenRouter API key is read from appsettings.json ("OpenRouter:ApiKey")
        // so that no secrets are stored in source code.
        private readonly string _openRouterKey;

        public HumanizeController(IConfiguration config)
        {
            _db = new DatabaseService(config);
            _openRouterKey = config["OpenRouter:ApiKey"]
                ?? throw new InvalidOperationException(
                    "OpenRouter:ApiKey is missing from appsettings.json.");
        }

        // A last-pass cleanup list: common AI phrases -> plainer alternatives.
        private static readonly Dictionary<string, string> _polish = new(StringComparer.OrdinalIgnoreCase)
        {
            ["it is important to note that"] = "",
            ["it is important to note"] = "",
            ["it should be noted that"] = "",
            ["it should be noted"] = "",
            ["it is evident that"] = "",
            ["it is evident"] = "",
            ["in conclusion"] = "finally",
            ["furthermore"] = "also",
            ["moreover"] = "also",
            ["in addition"] = "also",
            ["notably"] = "",
            ["nevertheless"] = "still",
            ["subsequently"] = "then",
            ["one must"] = "you should",
            ["delve into"] = "dig into",
            ["delve"] = "dig",
            ["paradigm"] = "model",
            ["leverage"] = "use",
            ["utilize"] = "use",
            ["facilitate"] = "help",
            ["demonstrate"] = "show",
            ["commence"] = "start",
            ["endeavor"] = "effort"
        };

        // Tidies the text: swap/remove AI phrases, drop fancy dashes and commas,
        // fix spaces before punctuation, and squeeze double spaces into one.
        private static string Polish(string text)
        {
            foreach (var kv in _polish)
                text = Regex.Replace(text, Regex.Escape(kv.Key), kv.Value, RegexOptions.IgnoreCase);
            text = text.Replace("—", " ").Replace("–", "-").Replace(",", "");
            text = Regex.Replace(text, @"\s+([.!?])", "$1");
            while (text.Contains("  ")) text = text.Replace("  ", " ");
            return text.Trim();
        }


        // BASIC mode: rewrites text offline using the synonym dictionary from the DB.
        [HttpPost("basic")]
        public IActionResult BasicHumanize([FromBody] HumanizeRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.OriginalText))
                return BadRequest(new { message = "Text cannot be empty." });

            var synonyms = _db.GetSynonyms();
            var engine = new SynonymEngine(synonyms);
            var humanizer = new BasicHumanizer(engine);

            humanizer.InputText = req.OriginalText;
            string result = Polish(humanizer.Process());

            int aiScore = ScoreCalculator.CalculateAIScore(result);
            int humanScore = ScoreCalculator.CalculateHumanScore(result);

            _db.SaveHistory(req.UserId, req.OriginalText, result,
                            humanScore, aiScore, req.ToneId);

            return Ok(new HumanizeResponse
            {
                HumanizedText = result,
                AIScore = aiScore,
                HumanScore = humanScore,
                Mode = "basic",
                Message = "Humanized in Basic mode."
            });
        }


        // ADVANCED mode: sends the text to ChatGPT via OpenRouter for a more natural rewrite.
        // Falls back to the offline engine if the API call fails.
        [HttpPost("advanced")]
        public async Task<IActionResult> AdvancedHumanize([FromBody] HumanizeRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.OriginalText))
                return BadRequest(new { message = "Text cannot be empty." });

            string result;
            string message;

            try
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(30);

                // API key comes from configuration — never from source code.
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {_openRouterKey}");
                client.DefaultRequestHeaders.Add("HTTP-Referer", "http://localhost:5000");
                client.DefaultRequestHeaders.Add("X-Title", "HumanizeAI");

                string tone = req.ToneId switch
                {
                    2 => "polished and formal",
                    3 => "academic but readable",
                    4 => "clear and professional",
                    _ => "casual and conversational"
                };

                string length = (req.Length ?? "same").ToLower() switch
                {
                    "shorter" => "Make it noticeably more concise than the original while keeping every key fact.",
                    "longer"  => "Expand it a little with natural detail and rhythm, but invent no new facts.",
                    _         => "Keep it roughly the same length as the original."
                };

                string systemPrompt =
                    $"You are a world-class human writer and editor who makes AI-generated text read as genuinely human and pass AI-content detectors. " +
                    $"Rewrite the user's text in a {tone} tone so it sounds like a thoughtful person wrote it by hand. Follow every rule:\n" +
                    "1. Burstiness: vary sentence length dramatically. Put a short, punchy sentence next to a longer one. Never keep a uniform rhythm.\n" +
                    "2. Perplexity: pick natural, slightly less predictable wording instead of the safest, most generic phrasing.\n" +
                    "3. Use contractions (it's, don't, you're), everyday words, active voice, and concrete nouns.\n" +
                    "4. Do NOT use em dashes or en dashes. Avoid long comma-stacked clauses; keep sentences clean and direct.\n" +
                    "5. Never use AI-tell words or phrases: furthermore, moreover, in conclusion, additionally, it is important to note, it should be noted, subsequently, delve, leverage, utilize, tapestry, realm, navigate the landscape, in today's world, plays a crucial role, a testament to.\n" +
                    "6. Vary how sentences and paragraphs begin; never start consecutive sentences the same way. Use the occasional short fragment for emphasis, and natural idioms a real person would actually say.\n" +
                    "7. Keep every fact and the original meaning. Add no new information, opinions, or filler.\n" +
                    $"8. Length: {length} No headings or bullet points unless the original used them.\n" +
                    "Return ONLY the rewritten text. No quotes, no preamble, no notes.";

                var body = new
                {
                    model = "openai/gpt-4o-mini",
                    messages = new[] {
                        new { role = "system", content = systemPrompt },
                        new { role = "user",   content = req.OriginalText }
                    },
                    max_tokens = 1200,
                    temperature = 0.85
                };

                var json = JsonSerializer.Serialize(body);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await client.PostAsync(
                    "https://openrouter.ai/api/v1/chat/completions", content);
                var bodyStr = await response.Content.ReadAsStringAsync();

                Console.WriteLine("[OpenRouter] Response: " + bodyStr);

                using var doc = JsonDocument.Parse(bodyStr);

                if (doc.RootElement.TryGetProperty("error", out var err))
                    throw new Exception(err.GetProperty("message").GetString());

                result = doc.RootElement
                             .GetProperty("choices")[0]
                             .GetProperty("message")
                             .GetProperty("content")
                             .GetString() ?? req.OriginalText;
                message = "Humanized in Advanced mode.";
            }
            catch (Exception ex)
            {
                Console.WriteLine("[OpenRouter] Failed: " + ex.Message);
                var synonyms = _db.GetSynonyms();
                var engine = new SynonymEngine(synonyms);
                var humanizer = new AdvancedHumanizer(engine);
                humanizer.InputText = req.OriginalText;
                result = humanizer.Process();
                message = "Humanized in Advanced mode.";
            }

            result = Polish(result);

            int aiScore = ScoreCalculator.CalculateAIScore(result);
            int humanScore = ScoreCalculator.CalculateHumanScore(result);

            _db.SaveHistory(req.UserId, req.OriginalText, result,
                            humanScore, aiScore, req.ToneId);

            return Ok(new HumanizeResponse
            {
                HumanizedText = result,
                AIScore = aiScore,
                HumanScore = humanScore,
                Mode = "advanced",
                Message = message
            });
        }


        // Returns a user's past runs for the History page.
        [HttpGet("history/{userId}")]
        public IActionResult GetHistory(int userId)
            => Ok(_db.GetUserHistory(userId));

        // Deletes one saved run by its id.
        [HttpDelete("history/{historyId}")]
        public IActionResult DeleteHistory(int historyId)
        {
            if (historyId < 1)
                return BadRequest(new { message = "Invalid history id." });
            bool ok = _db.DeleteHistory(historyId);
            if (!ok)
                return NotFound(new { message = "History entry not found." });
            return Ok(new { message = "History entry deleted." });
        }

        // Quick numbers for a user (total runs, averages).
        [HttpGet("stats/{userId}")]
        public IActionResult Stats(int userId)
            => Ok(_db.GetStats(userId));

        // DETECT mode: scores the text as-is and gives a verdict, without rewriting it.
        [HttpPost("detect")]
        public IActionResult Detect([FromBody] HumanizeRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.OriginalText))
                return BadRequest(new { message = "Text cannot be empty." });

            int aiScore = ScoreCalculator.CalculateAIScore(req.OriginalText);
            int humanScore = ScoreCalculator.CalculateHumanScore(req.OriginalText);
            string verdict = aiScore >= 60 ? "Likely AI-generated"
                           : aiScore >= 30 ? "Possibly AI-assisted"
                           : "Likely human";

            return Ok(new { aiScore, humanScore, verdict });
        }

        // Health check: open http://localhost:5000/api/humanize/test to verify API + DB.
        [HttpGet("test")]
        public IActionResult Test()
        {
            bool ok = _db.TestConnection();
            return Ok(new
            {
                apiStatus = "HumanizeAI running on .NET 10",
                advancedMode = "ChatGPT (gpt-4o-mini) via OpenRouter",
                dbStatus = ok ? "MySQL connected" : "MySQL FAILED",
                synonymsLoaded = _db.GetSynonyms().Count,
                time = DateTime.Now.ToString("dd MMM yyyy HH:mm:ss")
            });
        }
    }
}
