var builder = WebApplication.CreateBuilder(args);

// appsettings.Local.json holds real secrets (DB password, API key) and is gitignored.
// It overrides the placeholder values in the committed appsettings.json.
// Create it by copying appsettings.Local.json.example and filling in your values.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: false);

builder.Services.AddControllers();

// Make IConfiguration available for constructor injection in services and controllers.
// DatabaseService and HumanizeController both need it to read the connection string
// and the OpenRouter API key without hardcoding secrets in source code.
builder.Services.AddSingleton<IConfiguration>(builder.Configuration);

builder.Services.AddCors(options =>
    options.AddPolicy("AllowAll", p =>
        p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();
app.UseCors("AllowAll");
app.UseDefaultFiles();   // serve index.html by default
app.UseStaticFiles();    // serve the files in wwwroot
app.UseAuthorization();
app.MapControllers();    // hook up all the /api/... routes

Console.WriteLine("");
Console.WriteLine("HumanizeAI API (.NET 10)");
Console.WriteLine("Running at http://localhost:5000");
Console.WriteLine("Test endpoint: http://localhost:5000/api/humanize/test");
Console.WriteLine("");

app.Run("http://0.0.0.0:" + (Environment.GetEnvironmentVariable("PORT") ?? "5000"));
