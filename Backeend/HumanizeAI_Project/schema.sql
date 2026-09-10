-- HumanizeAI database setup
-- Note: CREATE DATABASE removed for hosted environments (freesqldatabase, Aiven, etc.)
-- The database is already created by the hosting provider.




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
INSERT IGNORE INTO toneprofiles (ToneID, ToneName) VALUES
  (1, 'Casual'), (2, 'Formal'), (3, 'Academic'), (4, 'Professional');


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


-- STORED PROCEDURE and TRIGGER omitted for hosted MySQL compatibility.
-- The application does not require them to function.

-- Synonym dictionary for Basic mode humanization
INSERT IGNORE INTO humanizationdictionary (OriginalText, HumanizedText) VALUES
('utilize','use'),('utilization','use'),('implement','put in place'),('implementation','setup'),('leverage','use'),('facilitate','help'),('commence','start'),('terminate','end'),('endeavor','try'),('obtain','get'),('acquire','get'),('require','need'),('purchase','buy'),('assist','help'),('assistance','help'),('demonstrate','show'),('indicate','show'),('sufficient','enough'),('numerous','many'),('additional','more'),('subsequently','then'),('previously','before'),('currently','now'),('approximately','about'),('frequently','often'),('significant','big'),('significantly','a lot'),('substantial','large'),('considerably','quite a bit'),('primarily','mainly'),('essentially','basically'),('specifically','in particular'),('generally','usually'),('typically','usually'),('potentially','possibly'),('effectively','well'),('efficiently','quickly'),('comprehend','understand'),('comprehension','understanding'),('articulate','express'),('elaborate','explain more'),('reiterate','repeat'),('mitigate','reduce'),('expedite','speed up'),('prioritize','focus on'),('optimize','improve'),('maximize','increase'),('minimize','reduce'),('visualize','picture'),('conceptualize','think about'),('contextualize','put in context'),('paramount','very important'),('crucial','very important'),('critical','very important'),('vital','very important'),('imperative','necessary'),('fundamental','basic'),('comprehensive','complete'),('sophisticated','advanced'),('innovative','new'),('revolutionary','game-changing'),('transformative','life-changing'),('multifaceted','complex'),('intricate','complex'),('robust','strong'),('seamless','smooth'),('dynamic','flexible'),('scalable','growable'),('holistic','overall'),('proactive','prepared'),('synergy','teamwork'),('paradigm','model'),('methodology','method'),('framework','structure'),('ecosystem','environment'),('landscape','field'),('stakeholder','person involved'),('deliverable','result'),('bandwidth','capacity'),('actionable','practical'),('pivot','change direction'),('disruptive','game-changing'),('cutting-edge','latest'),('state-of-the-art','latest'),('best-in-class','top'),('world-class','top'),('moving forward','from now on'),('going forward','from now on'),('at the end of the day','ultimately'),('touch base','check in'),('circle back','follow up'),('deep dive','close look'),('pain point','problem'),('value proposition','benefit'),('low-hanging fruit','easy win'),('think outside the box','be creative'),('on the same page','in agreement'),('game changer','big change'),('bottom line','main point'),('due diligence','careful research'),
('moreover','also'),('furthermore','also'),('nevertheless','still'),('nonetheless','even so'),('therefore','so'),('consequently','as a result'),('accordingly','so'),('hence','so'),('thus','so'),('thereby','by doing this'),('notwithstanding','despite'),('albeit','though'),('whilst','while'),('amongst','among'),('towards','toward'),('afterwards','after'),('henceforth','from now on'),('perplex','confuse'),('elucidate','explain'),('ascertain','find out'),('endeavour','try'),('cognizant','aware'),('pertaining','about'),('aforementioned','mentioned above'),('pertinent','relevant'),('germane','relevant'),('applicable','relevant'),('commensurate','equal'),('commencement','start'),('cessation','stop'),('initiation','start'),('inception','beginning'),('culmination','end'),('finalization','completion'),('accomplishment','achievement'),('attainment','achievement'),('fulfillment','completion'),('realization','achievement'),('actualization','making real'),('manifestation','sign'),('exemplification','example'),('articulation','expression'),('enunciation','saying clearly'),('proclamation','announcement'),('declaration','statement'),('assertion','claim'),('contention','argument'),('proposition','idea'),('postulation','assumption'),('supposition','guess'),('conjecture','guess'),('hypothesis','theory'),('speculation','guess'),('presumption','assumption'),('inference','conclusion'),('deduction','conclusion'),('extrapolation','extending'),('approximation','estimate'),('estimation','guess'),('computation','calculating'),('determination','finding out'),('identification','finding'),('acknowledgment','admitting'),('affirmation','confirmation'),('validation','checking'),('verification','confirming'),('substantiation','proving'),('corroboration','backing up'),('authentication','confirming'),('certification','confirming'),('ratification','approval'),('authorization','permission'),('sanctioning','approval'),('endorsement','support'),('approbation','approval'),('commendation','praise'),('recommendation','suggestion'),('initiative','plan'),('undertaking','project'),('enterprise','project'),('responsibility','duty'),('obligation','duty'),('necessity','need'),('prerequisite','requirement'),('precondition','requirement'),('stipulation','condition'),('specification','detail'),('criterion','standard'),('benchmark','standard'),('parameter','limit'),('constraint','limit'),('limitation','limit'),('restriction','limit'),('threshold','limit'),('capability','ability'),('competency','skill'),('proficiency','skill'),('expertise','skill'),('familiarity','knowledge'),('specialization','focus area'),('concentration','focus'),('orientation','direction'),('disposition','tendency'),('inclination','tendency'),('propensity','tendency'),('proclivity','habit'),('predisposition','tendency'),('preference','choice'),('alternative','other option'),('possibility','chance'),('opportunity','chance'),('prospect','chance'),('likelihood','chance'),('probability','chance'),('feasibility','workability'),('viability','workability'),('practicality','usefulness'),('applicability','usefulness'),('relevance','importance'),('magnitude','size'),('aggregate','total'),('cumulative','total'),('collective','combined'),('integrated','combined'),('unified','combined'),('consolidated','merged'),('incorporated','included'),('assimilated','absorbed'),
('analyzed','studied'),('evaluated','checked'),('assessed','judged'),('examined','looked at'),('investigated','looked into'),('explored','looked into'),('researched','studied'),('scrutinized','carefully checked'),('inspected','checked'),('surveyed','looked over'),('monitored','tracked'),('quantified','measured'),('projected','predicted'),('forecasted','predicted'),('anticipated','expected'),('foreseen','expected'),('envisioned','imagined'),('contemplated','thought about'),('considered','thought about'),('deliberated','thought over'),('pondered','thought about'),('reflected','thought about'),('ruminated','thought over'),('theorized','suggested'),('hypothesized','suggested'),('counseled','guided'),('administered','ran'),('supervised','oversaw'),('coordinated','organized'),('established','set up'),('founded','started'),('initiated','started'),('launched','started'),('deployed','rolled out'),('disseminated','spread'),('propagated','spread'),('transmitted','sent'),('conveyed','told'),('highlighted','pointed out'),('emphasized','stressed'),('underscored','stressed'),('reinforced','strengthened'),('enhanced','improved'),('refined','polished'),('streamlined','simplified'),('clarified','made clear'),('outlined','described'),('summarized','summed up'),('concluded','ended with'),('selected','picked'),('identified','found'),('discovered','found'),('uncovered','found'),('disclosed','shared'),('supplied','gave'),('delivered','gave'),('extended','gave'),('granted','gave'),('allocated','gave'),('assigned','gave'),('designated','set aside'),('earmarked','set aside'),('retained','kept'),('maintained','kept'),('preserved','kept'),('secured','made safe'),('ensured','made sure'),('guaranteed','made sure'),('confirmed','made sure'),('acknowledged','recognized'),('witnessed','saw'),('perceived','saw'),('encountered','came across'),('addressed','dealt with'),('resolved','fixed'),('corrected','fixed'),('rectified','fixed'),('amended','changed'),('modified','changed'),('adjusted','changed'),('adapted','changed'),('converted','changed'),('transitioned','moved'),('migrated','moved'),('repositioned','moved'),('realigned','adjusted'),('recalibrated','adjusted'),('restructured','reorganized'),('reinstated','brought back'),('restored','brought back'),('recovered','got back'),('retrieved','got back'),('reclaimed','got back'),('regained','got back'),('renewed','refreshed'),('upgraded','improved'),('expanded','grew'),('broadened','widened'),('enriched','improved'),('diversified','varied'),('differentiated','made different'),('distinguished','told apart'),('segmented','split'),('categorized','grouped'),('classified','grouped'),('prioritized','put first'),('filtered','narrowed down'),('decreased','went down'),('declined','went down'),('accelerated','sped up'),('decelerated','slowed down'),('discontinued','stopped'),('abandoned','gave up'),('discarded','threw away'),
('profoundly','deeply'),('enormously','hugely'),('tremendously','greatly'),('immensely','hugely'),('extensively','widely'),('predominantly','mostly'),('virtually','almost'),('barely','hardly'),('scarcely','barely'),('merely','only'),('speedily','fast'),('adequately','well enough'),('thoroughly','completely'),('flawlessly','without fault'),('effortlessly','without effort'),('cautiously','with caution'),('reliably','dependably'),('dependably','consistently'),('predictably','as expected'),('unexpectedly','without warning'),('abruptly','without warning'),('drastically','greatly'),('radically','completely'),('partially','partly'),('somewhat','a bit'),('marginally','barely'),('negligibly','almost not at all'),('minimally','very little'),('moderately','somewhat'),('interestingly','what is interesting is'),('importantly','what matters is'),('notably','worth noting'),('remarkably','amazingly'),('regrettably','sadly'),('fortunately','luckily'),('innovative solution','new fix'),('innovative approach','new way'),('cutting edge technology','latest tech'),('best practices','good methods'),('industry standards','common standards'),('world class service','top service'),('high quality output','great results'),('optimal performance','best performance'),('maximum efficiency','top efficiency'),('key performance indicators','key metrics'),('return on investment','payoff'),('value added','extra benefit'),('core competency','main strength'),('strategic objective','main goal'),('action plan','plan of action'),('competitive advantage','edge over others'),('brand awareness','name recognition'),('customer satisfaction','happy customers'),('user experience','how easy it is to use'),('data driven','based on data'),('evidence based','based on proof'),('research backed','backed by research'),('statistically significant','meaningful in numbers'),('empirically validated','tested and confirmed'),('peer reviewed','checked by experts'),('industry leading','top in the field'),('thought leader','expert'),('subject matter expert','expert in this area'),('domain expert','expert in the field'),('seasoned professional','experienced person'),('proven track record','history of success'),('established reputation','known for'),('trusted advisor','reliable guide'),('collaborative effort','team effort'),('cross functional team','mixed team'),('interdisciplinary approach','multi-field approach'),('diverse perspective','different viewpoint'),('inclusive environment','welcoming place'),('sustainable practice','eco-friendly practice'),('environmentally friendly','green'),('supply chain','production chain'),('business model','way of doing business'),('revenue stream','income source'),('operating costs','running costs'),('operational efficiency','how well things run'),('quality assurance','making sure quality is good'),('risk mitigation','reducing risk'),('risk management','handling risk'),('contingency plan','backup plan'),('business continuity','keeping things running'),('stakeholder engagement','talking with people involved'),('community outreach','reaching the community'),('corporate culture','company culture'),('mission statement','company mission'),('vision statement','company vision'),
('in order to','to'),('in terms of','regarding'),('with respect to','about'),('with regard to','about'),('in relation to','about'),('in accordance with','following'),('in compliance with','following'),('in line with','following'),('in conjunction with','along with'),('in addition to','besides'),('in contrast to','unlike'),('in comparison to','compared to'),('in lieu of','instead of'),('in place of','instead of'),('as opposed to','rather than'),('as a result of','because of'),('as a consequence of','because of'),('due to the fact that','because'),('owing to the fact that','because'),('in light of','given'),('in view of','given'),('taking into account','considering'),('taking into consideration','considering'),('with this in mind','so'),('bearing in mind','keeping in mind'),('on the basis of','based on'),('for the purpose of','to'),('for the sake of','for'),('for the benefit of','for'),('in the context of','in'),('in the field of','in'),('at this point in time','now'),('at this juncture','now'),('at the present time','now'),('in the near future','soon'),('in the foreseeable future','soon'),('as previously mentioned','as said before'),('as noted above','as mentioned'),('as stated earlier','as said before'),('it should be noted that','note that'),('it is worth noting that','worth noting'),('it is important to note that','importantly'),('it is worth mentioning that','worth mentioning'),('needless to say','obviously'),('it goes without saying','obviously'),('as a matter of fact','actually'),('in point of fact','in fact'),('to be more specific','specifically'),('to be more precise','to be exact'),('in other words','meaning'),('that is to say','meaning'),('to put it simply','simply put'),('in summary','to sum up'),('in conclusion','to wrap up'),('to conclude','to finish'),('to summarize','to sum up'),('in brief','briefly'),('in short','shortly'),('all in all','overall'),('on the whole','overall'),('by and large','mostly'),('for the most part','mostly'),('in most cases','usually'),('in many cases','often'),('in some cases','sometimes'),('depending on the situation','it depends'),('based upon','based on'),('grounded in','based on'),('rooted in','based on'),('stemming from','coming from'),('arising from','coming from'),('resulting from','coming from'),('with that said','that said'),('having said that','that said'),('that being said','that said'),('be that as it may','even so'),('despite the fact that','even though'),('regardless of the fact that','even though');
