using System.Text.RegularExpressions;

namespace HumanizeAI_API.Services
{
    // Base class for anything that takes text in and gives text out.
    // Both humanizers inherit from this.
    public abstract class TextProcessor
    {
        public string InputText { get; set; } = "";
        public string OutputText { get; set; } = "";
        public abstract string Process();
    }

    // Holds the AI-word -> human-word list and looks words up in it.
    public class SynonymEngine
    {
        private readonly Dictionary<string, string> _synonyms;

        // empty engine (no words loaded)
        public SynonymEngine()
            => _synonyms = new Dictionary<string, string>();

        // engine built from the dictionary we pulled out of the database
        public SynonymEngine(Dictionary<string, string> synonyms)
            => _synonyms = synonyms;

        // give back the human version of a word, or the same word if we don't have one
        public string GetAlternative(string word)
        {
            string key = word.ToLower().Trim();
            return _synonyms.TryGetValue(key, out string? val) ? val : word;
        }
    }

    // Works out how "AI" vs "human" a piece of text reads, as a 0-100 score.
    public static class ScoreCalculator
    {
        private static readonly string[] _aiPhrases = {
            "furthermore","moreover","nevertheless","subsequently","notably",
            "in conclusion","in addition","it is important to note","it should be noted",
            "it is evident","it is worth noting","one must","it is crucial","it is essential",
            "in today's world","in the modern era","plays a vital role","plays a crucial role",
            "a testament to","when it comes to","needless to say","first and foremost",
            "in the realm of","the landscape of","shed light on","studies have shown",
            "research indicates","on the other hand"
        };

        private static readonly string[] _aiWords = {
            "delve","leverage","utilize","facilitate","demonstrate","commence","endeavor",
            "paradigm","comprehensive","significant","numerous","various","crucial","essential",
            "vital","pivotal","paramount","realm","landscape","tapestry","underscore","foster",
            "myriad","robust","seamless","holistic","intricate","nuanced","multifaceted",
            "additionally","consequently","therefore","thus","hence","furthermore","moreover"
        };

        private static readonly string[] _humanWords = {
            "folks","stuff","kinda","gonna","wanna","pretty","wild","really","lots","yeah",
            "honestly","basically","actually","you know","a lot","kind of","sort of",
            "maybe","gotta","okay","cool","huge","tons","things","stuff"
        };

        // Adds up "AI-looking" signals and subtracts "human-looking" ones to land on 0-100.
        public static int CalculateAIScore(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return 0;
            string lower = " " + text.ToLower() + " ";
            double score = 0;

            // each robotic phrase found pushes the AI score up
            foreach (var p in _aiPhrases)
                if (lower.Contains(p)) score += 14;

            // so does each fancy/AI-ish single word
            score += _aiWords.Count(w => lower.Contains(" " + w)) * 6;

            var words = Regex.Split(text, @"\W+").Where(w => w.Length > 0).ToList();
            int wordCount = Math.Max(words.Count, 1);

            // contractions (it's, don't) feel human; none in a long text feels robotic
            int contractions = Regex.Matches(text, @"\b\w+'(t|s|re|ll|ve|d|m)\b", RegexOptions.IgnoreCase).Count;
            if ((double)contractions / wordCount > 0.02) score -= 18;
            else if (wordCount > 25 && contractions == 0) score += 14;

            // casual everyday words pull the score back down
            score -= _humanWords.Count(w => lower.Contains(" " + w + " ")) * 8;

            // lots of long words = sounds more formal / AI
            double longRatio = (double)words.Count(w => w.Length >= 9) / wordCount;
            if (longRatio > 0.18) score += 12;
            else if (longRatio > 0.12) score += 6;

            // real people vary their sentence lengths; very even lengths look AI-generated
            var sentences = Regex.Split(text, @"[.!?]+").Select(s => s.Trim())
                                 .Where(s => s.Length > 0).ToList();
            if (sentences.Count >= 3)
            {
                var lens = sentences.Select(s => (double)s.Split(' ').Length).ToList();
                double avg = lens.Average();
                double variance = lens.Average(l => Math.Pow(l - avg, 2));
                if (variance < 6) score += 12;       // hardly any variation = suspicious
                else if (variance < 15) score += 6;
                if (avg > 22) score += 8;             // very long sentences on average
            }

            // semicolons and long dashes are formal punctuation, slight AI signal
            int formalPunct = text.Count(c => c == ';') + Regex.Matches(text, "—|–").Count;
            score += Math.Min(formalPunct * 4, 12);

            // keep the final number inside 0-100
            return (int)Math.Round(Math.Clamp(score, 0, 100));
        }

        // human score is just the opposite of the AI score
        public static int CalculateHumanScore(string text)
            => 100 - CalculateAIScore(text);
    }
    // Basic offline humanizer: swaps stock phrases, swaps words from the DB list,
    // and turns formal forms into contractions.
    public class BasicHumanizer : TextProcessor
    {
        protected readonly SynonymEngine _engine;   // word lookup loaded from the DB

        public BasicHumanizer(SynonymEngine engine) => _engine = engine;

        public override string Process()
        {
            string result = InputText;
            // step 1: replace whole stock phrases with simpler ones (or remove them)
            var fillers = new Dictionary<string, string>
            {
                ["It is important to note that "] = "Keep in mind that ",
                ["it is important to note that "] = "keep in mind that ",
                ["It is worth noting that "] = "",
                ["it is worth noting that "] = "",
                ["It should be noted that "] = "",
                ["it should be noted that "] = "",
                ["It is evident that "] = "",
                ["it is evident that "] = "",
                ["In conclusion, "] = "To wrap up, ",
                ["in conclusion, "] = "to wrap up, ",
                ["Furthermore, "] = "Also, ",
                ["furthermore, "] = "also, ",
                ["Moreover, "] = "Plus, ",
                ["moreover, "] = "plus, ",
                ["Nevertheless, "] = "Still, ",
                ["nevertheless, "] = "still, ",
                ["Subsequently, "] = "Then, ",
                ["subsequently, "] = "then, ",
                ["In addition, "] = "Also, ",
                ["in addition, "] = "also, ",
                ["In order to "] = "To ",
                ["in order to "] = "to ",
                ["Due to the fact that "] = "Because ",
                ["due to the fact that "] = "because ",
                ["As previously mentioned, "] = "As I said, ",
                ["as previously mentioned, "] = "as I said, ",
            };
            foreach (var kv in fillers)
                result = result.Replace(kv.Key, kv.Value);

            // step 2: go word by word and swap any word that's in our DB dictionary.
            // we strip trailing punctuation first, swap the word, then put the punctuation back.
            string[] words = result.Split(' ');
            for (int i = 0; i < words.Length; i++)
            {
                string punct = "";
                string word = words[i];
                if (word.Length > 0 && ".,;:!?".Contains(word[^1]))
                {
                    punct = word[^1].ToString();
                    word = word[..^1];
                }
                words[i] = _engine.GetAlternative(word) + punct;
            }
            result = string.Join(" ", words);

            // step 3: shorten formal forms into everyday contractions
            result = result
                .Replace("do not", "don't").Replace("Do not", "Don't")
                .Replace("it is", "it's").Replace("It is", "It's")
                .Replace("I am", "I'm").Replace("they are", "they're")
                .Replace("we are", "we're").Replace("you are", "you're")
                .Replace("cannot", "can't").Replace("will not", "won't")
                .Replace("should not", "shouldn't").Replace("would not", "wouldn't")
                .Replace("could not", "couldn't").Replace("is not", "isn't")
                .Replace("are not", "aren't");

            OutputText = result;
            return result;
        }
    }

   
    // Advanced offline humanizer: does everything Basic does, then adds a few
    // conversational touches. This is the fallback when the online AI isn't available.
    public class AdvancedHumanizer : BasicHumanizer
    {
        public AdvancedHumanizer(SynonymEngine engine) : base(engine) { }

        public override string Process()
        {
            // run the basic pass first, then tweak the result
            base.Process();
            string result = OutputText;
            result = result
                .Replace(". The ", ". Well, the ")
                .Replace(". This ", ". This actually ")
                .Replace("very important", "really important")
                .Replace("very effective", "really effective")
                .Replace("very significant", "pretty significant")
                .Replace("very good", "really good");
            OutputText = result;
            return result;
        }
    }
}