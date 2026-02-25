export const STAGES = [
  "Not Started",
  "Researching",
  "Contacted",
  "Meeting Set",
  "Proposal Sent",
  "Negotiating",
  "Closed Won",
  "Closed Lost",
  "On Hold",
];

export const PRIORITIES = ["", "Hot", "Warm", "Cold", "Dead"];

export const TIERS = ["", "Tier 1", "Tier 2", "Tier 3", "Tier 4"];

export const INDUSTRIES = [
  "Retail",
  "Food & Bev",
  "Storage",
  "Daycare/Tutoring",
  "Gas Stations",
  "Grocery",
  "QSR/Fast Casual",
  "Casual Dining",
  "Fine Dining",
  "Fashion Retail",
  "Office Supply Retail",
  "Hospitality/Hotels",
  "Auto Dealerships",
  "Healthcare",
  "Non-Profit Retail/Thrift",
  "Commercial Real Estate",
  "Multifamily REIT",
  "Public Transportation",
  "Moving/Storage",
  "Commercial Landscaping",
  "Bookstore Retail",
  "Golf Retail",
  "Car Wash Chain",
  "HVAC/R Distribution",
  "Sporting Goods",
  "Government/Utility",
  "Other",
];

export const INTERACTION_TYPES = ["Email", "Call", "LinkedIn Message"];

export const COMPETITORS = [
  "",
  "SOCi",
  "Yext",
  "Birdeye",
  "Podium",
  "Reputation.com",
  "Uberall",
  "Rio SEO",
  "Chatmeter",
  "Other",
];

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  notes: string;
}

export interface InteractionLog {
  id: string;
  type: string;
  date: string;
  notes: string;
}

export interface NoteEntry {
  id: string;
  text: string;
  timestamp: string;
}

export interface Prospect {
  id: number;
  name: string;
  website: string;
  lastModified: string;
  transitionOwner: string;
  status: string;
  industry: string;
  locationCount: number | null;
  locationNotes: string;
  outreach: string;
  priority: string;
  notes: string;
  noteLog?: NoteEntry[];
  lastTouched: string | null;
  contactName: string;
  contactEmail: string;
  estimatedRevenue: number | null;
  competitor: string;
  tier: string;
  contacts: Contact[];
  interactions: InteractionLog[];
  createdAt?: string;
  nextStep?: string;
  nextStepDate?: string;
  customLogo?: string;
}

// --- Score helpers ---
export interface ScoreBreakdownItem {
  label: string;
  value: number;
}

export function scoreBreakdown(p: Prospect): ScoreBreakdownItem[] {
  const items: ScoreBreakdownItem[] = [];
  const lc = p.locationCount || 0;
  if (lc >= 500) items.push({ label: "500+ locations", value: 40 });
  else if (lc >= 100) items.push({ label: "100+ locations", value: 30 });
  else if (lc >= 50) items.push({ label: "50+ locations", value: 20 });
  else if (lc > 0) items.push({ label: "Has locations", value: 10 });
  if (["QSR/Fast Casual","Grocery","Casual Dining","Gas Stations","Hospitality/Hotels","Healthcare","Car Wash Chain"].includes(p.industry))
    items.push({ label: `${p.industry} industry`, value: 20 });
  if (p.outreach === "Meeting Set" || p.outreach === "Proposal Sent") items.push({ label: `Outreach: ${p.outreach}`, value: 15 });
  else if (p.outreach === "Contacted") items.push({ label: "Outreach: Contacted", value: 5 });
  if (p.priority === "Hot") items.push({ label: "Hot priority", value: 25 });
  else if (p.priority === "Warm") items.push({ label: "Warm priority", value: 10 });
  else if (p.priority === "Dead") items.push({ label: "Dead priority", value: -30 });
  if (p.status === "Churned") items.push({ label: "Churned status", value: -10 });
  if (lc === 0 && p.locationNotes && p.locationNotes.includes("CLOSED"))
    items.push({ label: "Closed locations", value: -50 });
  return items;
}

export function getScoreLabel(score: number): { label: string; short: string; color: string } {
  if (score >= 60) return { label: "Excellent", short: "A+", color: "hsl(152, 60%, 38%)" };
  if (score >= 40) return { label: "Strong", short: "A", color: "hsl(152, 50%, 45%)" };
  if (score >= 20) return { label: "Moderate", short: "B", color: "hsl(220, 80%, 55%)" };
  if (score >= 1) return { label: "Low", short: "C", color: "hsl(220, 14%, 55%)" };
  return { label: "Needs Work", short: "D", color: "hsl(0, 72%, 51%)" };
}

export type EnrichedProspect = Prospect & { ps: number };

export const STORAGE_KEY = "tp-data-v4";

export function scoreProspect(p: Prospect): number {
  let s = 0;
  const lc = p.locationCount || 0;
  if (lc >= 500) s += 40;
  else if (lc >= 100) s += 30;
  else if (lc >= 50) s += 20;
  else if (lc > 0) s += 10;
  if (
    [
      "QSR/Fast Casual",
      "Grocery",
      "Casual Dining",
      "Gas Stations",
      "Hospitality/Hotels",
      "Healthcare",
      "Car Wash Chain",
    ].includes(p.industry)
  )
    s += 20;
  if (p.outreach === "Meeting Set" || p.outreach === "Proposal Sent") s += 15;
  else if (p.outreach === "Contacted") s += 5;
  if (p.priority === "Hot") s += 25;
  else if (p.priority === "Warm") s += 10;
  else if (p.priority === "Dead") s -= 30;
  if (p.status === "Churned") s -= 10;
  if (lc === 0 && p.locationNotes && p.locationNotes.includes("CLOSED"))
    s -= 50;
  return s;
}

export function initProspect(p: Partial<Prospect> & { id: number; name: string }): Prospect {
  return {
    website: "",
    lastModified: "",
    transitionOwner: "",
    status: "Prospect",
    industry: "",
    locationCount: null,
    locationNotes: "",
    notes: "",
    noteLog: [],
    lastTouched: null,
    contactName: "",
    contactEmail: "",
    estimatedRevenue: null,
    competitor: "",
    tier: "",
    contacts: [],
    interactions: [],
    createdAt: new Date().toISOString(),
    ...p,
    outreach: p.outreach || "Not Started",
    priority:
      p.priority ||
      ((p.locationCount ?? 0) >= 100
        ? "Hot"
        : (p.locationCount ?? 0) >= 50
        ? "Warm"
        : ""),
  };
}

// Helper: get domain from website string
export function getDomain(website?: string): string {
  if (!website) return "";
  return website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

// Helper: get logo URL using Google favicons (works for virtually any site)
export function getLogoUrl(website?: string, size = 64): string {
  const domain = getDomain(website);
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

// Helper: basic string similarity for duplicate detection
export function stringSimilarity(a: string, b: string): number {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return 1;
  if (al.includes(bl) || bl.includes(al)) return 0.8;
  // Simple bigram similarity
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const aBi = bigrams(al);
  const bBi = bigrams(bl);
  let intersection = 0;
  bBi.forEach((b) => { if (aBi.has(b)) intersection++; });
  return (2 * intersection) / (aBi.size + bBi.size);
}

// All 303 prospects from CSV
const RAW_SEED: Array<Partial<Prospect> & { id: number; name: string }> = [
  {id:1,name:"White Spot",website:"whitespot.ca",transitionOwner:"Meera Shah",status:"Prospect"},
  {id:2,name:"BurlingtonGo",website:"burlingtongo.com",transitionOwner:"Mara Shah",status:"Prospect"},
  {id:3,name:"Gordon Convenience Stores Corp",website:"quickstorefoods.com",transitionOwner:"D'Andre Lyons",status:"Prospect"},
  {id:4,name:"Res Holding Company, LLC",website:"ares.com",transitionOwner:"Mara Shah",status:"Prospect"},
  {id:5,name:"Jennifer Convertibles, Inc.",website:"jenniferconvertibles.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:6,name:"Rodger Oil Company, Inc.",website:"rodgeroil.com",transitionOwner:"Gregory Goldberg",status:"Prospect"},
  {id:7,name:"ProVestment Development LLC",website:"provestment.com",transitionOwner:"Conor Murphy",status:"Prospect"},
  {id:8,name:"Sonic Financial Corporation",website:"shareintel.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:9,name:"The Cook & Boardman Group LLC",website:"cookandboardman.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:10,name:"RT Construction",website:"rtconstructioninc.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:11,name:"Ourfa",website:"ourfa.co",transitionOwner:"Lauren Goldman",status:"Churned"},
  {id:12,name:"NCFPS",website:"pagesofthebible.com",transitionOwner:"Lauren Goldman",status:"Churned"},
  {id:13,name:"Spartan Fleet",website:"spartanfleet.com",transitionOwner:"D'Andre Lyons",status:"Churned"},
  {id:14,name:"Tracery LLC",website:"tracery.com",transitionOwner:"Valentin Mises",status:"Churned"},
  {id:15,name:"Ag-Pro",website:"agprocompanies.com",transitionOwner:"Gregory Goldberg",status:"Prospect"},
  {id:16,name:"Raintree Zone",website:"raintreezone.com",transitionOwner:"Robbie Hassett",status:"Churned"},
  {id:17,name:"Relatives Hallway Home Services - Georgia Properties",website:"rhhsgeorgia.com",transitionOwner:"Conor Murphy",status:"Churned"},
  {id:18,name:"Juric R. Stout Properties",website:"juricrstout.com",transitionOwner:"Luca Filadelli",status:"Churned"},
  {id:19,name:"Texas Choice A Burger",website:"texaschoiceaburgerplace.com",transitionOwner:"Lauren Goldman",status:"Churned"},
  {id:20,name:"Smith & Associates Real Estate",website:"smithandassociatesrealestate.com",transitionOwner:"Michelle Luongo",status:"Prospect"},
  {id:21,name:"Jasmin's Italian Ice",website:"jasminaitalianice.com",transitionOwner:"Lauren Goldman",status:"Churned"},
  {id:22,name:"Pac Sun",website:"pacsunstock.com",locationCount:350,transitionOwner:"Doug Miller",status:"Prospect",industry:"Fashion Retail",locationNotes:"PacSun: ~350 retail stores in US malls"},
  {id:23,name:"The Shops at Columbus Circle",website:"seenet.com",transitionOwner:"Matthew Steen",status:"Churned"},
  {id:24,name:"Frambrills",website:"frambrills.com",transitionOwner:"Sean Loughery",status:"Prospect"},
  {id:25,name:"Club Champion",website:"clubchampionsgolf.com",transitionOwner:"Robbie Hassett",status:"Prospect"},
  {id:26,name:"Columbus Zoo and Aquarium",website:"columbuszoo.org",locationCount:1,transitionOwner:"Max Ratee",status:"Prospect",industry:"Other",locationNotes:"Single location"},
  {id:27,name:"GAP Management Corp",website:"gmpmanagement.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:28,name:"Quality Oil Company",website:"qualityoilco.com",locationCount:80,transitionOwner:"Micah Bank(ENS)",status:"Prospect",industry:"Gas Stations",locationNotes:"Quality Oil: ~80 convenience stores in NC/VA"},
  {id:29,name:"Aspen Holdings Inc.",website:"aspenholh.com",transitionOwner:"Brady Gonzalez",status:"Prospect"},
  {id:30,name:"The New Jersey Transit Corporation",website:"njtransit.com",locationCount:165,transitionOwner:"Lauren Goldman",status:"Prospect",industry:"Public Transportation",locationNotes:"165 rail stations + 62 light rail + 19,000+ bus stops"},
  {id:31,name:"Raymund Consolidated Corporation",website:"raymundcc.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:32,name:"Turbo & Gopher, Inc.",website:"turbog.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:33,name:"MFS Financial, Inc.",website:"mfsfinancial.com",transitionOwner:"Max Ratee",status:"Prospect"},
  {id:34,name:"Little General Stores",website:"littlegeneralstores.com",transitionOwner:"Valerie Tost",status:"Prospect"},
  {id:35,name:"The Randall Shops",website:"randallshopsretc.com",transitionOwner:"Max Ratee",status:"Prospect"},
  {id:36,name:"The Tom Club",website:"jonocols.net",transitionOwner:"Doug Miller",status:"Prospect"},
  {id:37,name:"South Mount Nobles LLC",website:"southmountnoblees.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:38,name:"ANZ Cleaning",website:"anzcleaning.com",transitionOwner:"Luca Filadelli",status:"Prospect"},
  {id:39,name:"F.K.K. Supermarkets, LLC D/B/A Foodtown",website:"foodtown.com",locationCount:65,transitionOwner:"Michelle Luongo",status:"Prospect",industry:"Grocery",locationNotes:"~65 Foodtown stores in NJ, NY, CT, PA"},
  {id:40,name:"Premises Management Company Inc.",website:"premises.com",transitionOwner:"Lauren Suskind",status:"Prospect"},
  {id:41,name:"Cat Park Metropics, Inc.",website:"catparkmetroparticade.net",transitionOwner:"Thomas Clements",status:"Prospect"},
  {id:42,name:"Empire Office, Inc.",website:"empireoffice.com",locationCount:10,transitionOwner:"Lauren Suskind",status:"Prospect",industry:"Other",locationNotes:"~10 locations; B2B office furniture dealer"},
  {id:43,name:"Amalg Steel Beverages USA Inc.",website:"amalgroup.com",transitionOwner:"Gregory Goldberg",status:"Prospect"},
  {id:44,name:"Oubit Services, Inc.",website:"qubitserviceinc.com",transitionOwner:"Sean Loughery",status:"Prospect"},
  {id:45,name:"Hapevo, LLC",website:"hapevo.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:46,name:"Lightfoot America, Inc.",website:"lightfoam.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:47,name:"District America Redlands, Inc.",website:"districtamericainc.com",transitionOwner:"Micah Bank(ENS)",status:"Prospect"},
  {id:48,name:"Vogue Entertainment Holdings Inc.",website:"vogueentertainment.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:49,name:"Warehouse Home Furnishings Distributors, Inc.",website:"famewarehouse-distributors.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:50,name:"Cocktail Barbie Bar Bistro, Inc., Nashville",website:"cocktailbarbiebarb.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:51,name:"The Paletto Group",website:"paletto.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:52,name:"Olmpo Amasil Corporation",website:"amasil.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:53,name:"Bellei Corp",website:"bellei.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:54,name:"Dubois Chemicals, Inc.",website:"duboischemicals.com",transitionOwner:"Gregory Goldberg",status:"Prospect"},
  {id:55,name:"Tuckerton Holding Corporation",website:"tuckertoh.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:56,name:"N Star Energy, LLC",website:"nstarph.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:57,name:"Daclar Holdings, Inc.",website:"daclarholdings.com",transitionOwner:"D'Andre Lyons",status:"Prospect"},
  {id:58,name:"Holloman Oil Corp",website:"hollomanoil.com",transitionOwner:"Matthew Steen",status:"Churned"},
  {id:59,name:"Herold, LLC",website:"herold.com",transitionOwner:"Margarita Lazariashvili (ARR)",status:"Churned"},
  {id:60,name:"American Making & Gas, Inc",website:"amgasinc.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:61,name:"ACE Gates Inc",website:"acegates.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:62,name:"Associated Packaging, Inc.",website:"associatedpackaging.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:63,name:"Datamonit USA Inc",website:"datamonit.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:64,name:"Wood Thermokinetology Corp",website:"beautik.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:65,name:"Georgia Safety Company, Inc.",website:"gaske.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:66,name:"Goodwill of North Georgia, Inc.",website:"goodwillng.org",locationCount:100,transitionOwner:"Conor Murphy",status:"Prospect",industry:"Non-Profit Retail/Thrift",locationNotes:"100+ stores and donation centers in North GA"},
  {id:67,name:"Hontai Hospitality Management, LP",website:"hontaihospitality.com",transitionOwner:"Lauren Suskind",status:"Churned"},
  {id:68,name:"JBL Inc.",website:"jblinc.com",transitionOwner:"Matthew Steen",status:"Churned"},
  {id:69,name:"Kancer Components, Inc.",website:"kancer.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:70,name:"Kyocera Document Solutions America, Inc.",website:"kyoceradocumentsolutionsam.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:71,name:"Metro Environmental Corp.",website:"metroenvironmentalcorp.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:72,name:"Promoter's Supermarkets, Inc.",website:"promoters.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:73,name:"H. L. Jordan Oil Company of North Carolina, Inc.",website:"hljordanoilcarolina.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:74,name:"Popley Holdings LLC",website:"popleyh.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:75,name:"Nordheng Opto-Electronics America, Inc.",website:"nop.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:76,name:"Seslager Growth Properties",website:"seslager.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:77,name:"The Jacobsen Clinic P.A.",website:"jacobsenclinic.com",transitionOwner:"Elissa Pappas",status:"Prospect"},
  {id:78,name:"United Nations Peacemakers, Inc",website:"un.inc",transitionOwner:"Flo Rosco",status:"Prospect"},
  {id:79,name:"Welcomely - NYC Liquidation",website:"welcomely.com",transitionOwner:"Meera Shah",status:"Prospect"},
  {id:80,name:"Dallas Realty Trust, Inc.",website:"dallasrealtytrust.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:81,name:"Thor Equities, LLC",website:"thorequities.com",locationCount:50,transitionOwner:"Brady Gonzalez",status:"Prospect",industry:"Commercial Real Estate",locationNotes:"50+ properties; major NYC/national CRE developer"},
  {id:82,name:"Upland Roads Properties Inc.",website:"uplandroads.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:83,name:"DS Bioplastics, Inc.",website:"dsbioplastics.com",transitionOwner:"Gregory Goldberg",status:"Prospect"},
  {id:84,name:"Fortisan Supply",website:"fortisan-supply.com",transitionOwner:"Thomas Clements",status:"Prospect"},
  {id:85,name:"Laurent Products, Inc.",website:"laurentproducts.com",transitionOwner:"James Heare",status:"Prospect"},
  {id:86,name:"T & J Food Co",website:"tjfoodgroup.com",transitionOwner:"Gregory Goldberg",status:"Prospect"},
  {id:87,name:"Audio Road Services Group, LLC",website:"audioroad.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:88,name:"CCI Systems, Inc.",website:"ccisystems.com",transitionOwner:"Robbie Hassett",status:"Prospect"},
  {id:89,name:"Contur Co.",website:"conturcouncil.com",transitionOwner:"Thomas Clements",status:"Prospect"},
  {id:90,name:"King Services, Inc",website:"kinser.com",transitionOwner:"Gregory Goldberg",status:"Prospect"},
  {id:91,name:"Milan Holding Company, Inc.",website:"milanica.com",transitionOwner:"Gregory Goldberg",status:"Prospect"},
  {id:92,name:"Agate Realty Corporation",website:"agaterealty.com",transitionOwner:"Gregory Goldberg",status:"Prospect"},
  {id:93,name:"Morris",website:"morris-corp.com",transitionOwner:"Scott Zeller",status:"Prospect"},
  {id:94,name:"Go Store It Self Storage",website:"gostoreit.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:95,name:"DC Water and Sewer Authority",website:"dcwater.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:96,name:"J & D Enterprises",website:"jnlabs.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:97,name:"Daniels Martin Company",website:"danielsmartin.com",transitionOwner:"Robbie Hassett",status:"Prospect"},
  {id:98,name:"Virtual Properties Realty",website:"virtualpropertiesrealty.com",transitionOwner:"Conor Murphy",status:"Prospect"},
  {id:99,name:"Circus Eyes",website:"circuseyes.com",transitionOwner:"Micah Bank(ENS)",status:"Prospect"},
  {id:100,name:"Foxweather, Inc.",website:"foxweather.com",transitionOwner:"Gregory Goldberg",status:"Prospect"},
  {id:101,name:"Dam Pod PREMIA Realty Group",website:"premia-dam.com",transitionOwner:"Lauren Goldman",status:"Churned"},
  {id:102,name:"Parkview Pharmacy",website:"parkviewpharmacy.com",transitionOwner:"Max Ratee",status:"Prospect"},
  {id:103,name:"Lifeholder Health Trust",website:"lifeholder.com",transitionOwner:"Max Ratee",status:"Prospect"},
  {id:104,name:"Zurikas Fitness, LLC",website:"zurikas.com",transitionOwner:"Max Ratee",status:"Prospect"},
  {id:105,name:"Crystal Livingroom LLC",website:"crystal-lvg.com",transitionOwner:"Robbie Hassett",status:"Prospect"},
  {id:106,name:"Jewels By Pure Lane, Inc.",website:"purelanesjewelry.com",transitionOwner:"Robbie Hassett",status:"Prospect"},
  {id:107,name:"Jameelinks, LP",website:"jameelinks.com",transitionOwner:"Raymond Kriss",status:"Prospect"},
  {id:108,name:"Douglas Realty, LLC",website:"justdouglasllc.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:109,name:"LSL Plasma Inc",website:"lslplasmainc.com",transitionOwner:"Jeff DeSalvatore(?)",status:"Prospect"},
  {id:110,name:"Tribonit Industries, Inc.",website:"tribonit.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:111,name:"Lucis Geographies, Inc.",website:"lucis-geographies.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:112,name:"Innovative Systems Inc.",website:"innovativesystemsinc.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:113,name:"Ariel, Inc.",website:"arielthebliss.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:114,name:"Word of Life Fellowship, Inc.",website:"wordoflife.com",transitionOwner:"Lauren Goldman",status:"Prospect"},
  {id:115,name:"PIK Industries, Inc.",website:"p-i-group.com",transitionOwner:"Lauren Suskind",status:"Prospect"},
  {id:116,name:"New England Conservatory of Music",website:"necmusic.edu",transitionOwner:"D'Andre Lyons",status:"Prospect"},
  {id:117,name:"Food State, Inc.",website:"foodstatei.com",transitionOwner:"Sean Loughery",status:"Prospect"},
  {id:118,name:"Suwanee Dawkins Distributors, Inc.",website:"earlrisingsawklike.com",transitionOwner:"Matthew Steen",status:"Prospect"},
  {id:119,name:"Eastem Mooring",website:"easternmoorlok.org",transitionOwner:"Lauren Suskind",status:"Prospect"},
  {id:120,name:"Thermo King Good Cities, Inc",website:"thermolking.com",transitionOwner:"Thomas Clements",status:"Prospect"},
];

export const SEED: Prospect[] = RAW_SEED.map((r) => initProspect(r));
