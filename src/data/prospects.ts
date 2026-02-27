export const STAGES = [
  "Not Started",
  "Actively Prospecting",
  "Meeting Booked",
  "Closed Lost",
  "Closed Won",
];

export const PRIORITIES = ["", "Hot", "Warm", "Cold", "Dead"];

export const TIERS = ["", "Tier 1", "Tier 2", "Tier 3", "Tier 4"];

export const INDUSTRIES = [
  "Auto Dealerships",
  "Bookstore Retail",
  "Car Wash Chain",
  "Casual Dining",
  "Commercial Landscaping",
  "Commercial Real Estate",
  "Daycare/Tutoring",
  "Fashion Retail",
  "Fine Dining",
  "Food & Bev",
  "Gas Stations",
  "Golf Retail",
  "Grocery",
  "Healthcare",
  "Hospitality/Hotels",
  "HVAC/R Distribution",
  "Moving/Storage",
  "Multifamily REIT",
  "Non-Profit Retail/Thrift",
  "Office Supply Retail",
  "Public Transportation",
  "QSR/Fast Casual",
  "Retail",
  "Sporting Goods",
  "Storage",
  "Other",
];

export const INTERACTION_TYPES = ["Email", "Call", "LinkedIn Message", "Task Completed"];

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
  "Unknown",
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

export interface Task {
  id: string;
  text: string;
  dueDate: string;
}

export interface Prospect {
  id: any;
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
  tasks: Task[];
  /** @deprecated use tasks[] instead */
  nextStep?: string;
  /** @deprecated use tasks[] instead */
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
  if (p.outreach === "Meeting Booked") items.push({ label: `Outreach: ${p.outreach}`, value: 15 });
  else if (p.outreach === "Actively Prospecting") items.push({ label: "Outreach: Actively Prospecting", value: 5 });
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

export const STORAGE_KEY = "tp-data-v6";

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
  if (p.outreach === "Meeting Booked") s += 15;
  else if (p.outreach === "Actively Prospecting") s += 5;
  if (p.priority === "Hot") s += 25;
  else if (p.priority === "Warm") s += 10;
  else if (p.priority === "Dead") s -= 30;
  if (p.status === "Churned") s -= 10;
  if (lc === 0 && p.locationNotes && p.locationNotes.includes("CLOSED"))
    s -= 50;
  return s;
}

export function initProspect(p: Partial<Prospect> & { id: any; name: string }): Prospect {
  const base: Prospect = {
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
    tasks: [],
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
  if (!base.tasks.length && p.nextStep) {
    base.tasks = [{ id: Date.now().toString(), text: p.nextStep, dueDate: p.nextStepDate || "" }];
  }
  return base;
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

// Helper: clean website URL to domain
function cleanWebsite(raw: string): string {
  return raw
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

// 309 accounts from FY27 Prospects CSV
const RAW_SEED: Array<Partial<Prospect> & { id: number; name: string }> = [
  {id:1,name:"(Over the top marketing) iStorage",website:"istorage.com",status:"Prospect"},
  {id:2,name:"84 Lumber",website:"84lumber.com",status:"Prospect"},
  {id:3,name:"Absolute Storage",website:"absolutemgmt.com",status:"Churned"},
  {id:4,name:"AeroMed Group",website:"etaglobal.com",status:"Prospect"},
  {id:5,name:"Ag-Pro",website:"agprocompanies.com",status:"Prospect"},
  {id:6,name:"Agree Realty Corporation",website:"agreerealty.com",status:"Prospect"},
  {id:7,name:"Akkodis",website:"modis.com",status:"Prospect"},
  {id:8,name:"Allen Tate Realtors",website:"allentate.com",status:"Prospect"},
  {id:9,name:"Alston Investments Inc",website:"bouclair.com",status:"Prospect"},
  {id:10,name:"Amc, Inc.",website:"amctheatres.com",status:"Prospect"},
  {id:11,name:"American Telecommunications Inc.",website:"atiglobal.com",status:"Prospect"},
  {id:12,name:"American Welding & Gas, Inc.",website:"awggases.com",status:"Prospect"},
  {id:13,name:"Another Broken Egg Cafe",website:"anotherbrokenegg.com",status:"Prospect"},
  {id:14,name:"Apple American Group (APPLEBEES Franchisee)",website:"applebees.com",status:"Prospect"},
  {id:15,name:"Arc3 Gases Inc.",website:"arc3gases.com",status:"Prospect"},
  {id:16,name:"Ardagh Metal Beverage USA Inc.",website:"ardaghgroup.com",status:"Prospect"},
  {id:17,name:"Argos Holdings Inc.",website:"petsmart.com",status:"Prospect"},
  {id:18,name:"Associated Packaging, Inc.",website:"associatedpackaging.com",status:"Prospect"},
  {id:19,name:"Au Bon Pain",website:"aubonpain.com",status:"Prospect"},
  {id:20,name:"Audio Visual Services Group, LLC",website:"psav.com",status:"Prospect"},
  {id:21,name:"Avalon Bay Communities Inc",website:"avaloncommunities.com",status:"Prospect"},
  {id:22,name:"Back Yard Burgers",website:"backyardburgers.com",status:"Prospect"},
  {id:23,name:"Barloworld USA Inc",website:"barloworld.com",status:"Prospect"},
  {id:24,name:"Barnes & Noble, Inc.",website:"barnesandnobleinc.com",status:"Prospect"},
  {id:25,name:"Barnhart Crane and Rigging Co",website:"barnhartcrane.com",status:"Prospect"},
  {id:26,name:"bb.q Chicken USA",website:"bbdotqchicken.com",status:"Prospect"},
  {id:27,name:"Beef O'Brady's",website:"beefobradys.com",status:"Prospect"},
  {id:28,name:"Belfor Corp",website:"belfor.com",status:"Prospect"},
  {id:29,name:"Bell Partners Inc",website:"bellpartnersinc.com",status:"Prospect"},
  {id:30,name:"Benzer Pharmacy",website:"benzerpharmacy.com",status:"Prospect"},
  {id:31,name:"Berkshire Hathaway Home Services - Georgia Properties",website:"bhhsgeorgia.com",status:"Churned"},
  {id:32,name:"BHLDN",website:"anthropologie.com",status:"Prospect"},
  {id:33,name:"Biscuitville Fresh Southern",website:"biscuitville.com",status:"Prospect"},
  {id:34,name:"BJ's Wholesale Club, Inc.",website:"bjs.com",status:"Prospect"},
  {id:35,name:"Blodgett Oil Company, Inc.",website:"blodgett.com",status:"Prospect"},
  {id:36,name:"Bon Worth Inc",website:"bonworth.com",status:"Prospect"},
  {id:37,name:"Bootlegger",website:"bootlegger.com",status:"Prospect"},
  {id:38,name:"Bosch Thermotechnology Corp.",website:"bosch.com",status:"Prospect"},
  {id:39,name:"Brennan Industries, Inc.",website:"brennaninc.com",status:"Prospect"},
  {id:40,name:"Brow Art 23",website:"browart23.com",status:"Prospect"},
  {id:41,name:"BrunchCo 21 / Le Pain Quotidien",website:"lepainquotidien.com",status:"Churned"},
  {id:42,name:"Buca di Beppo",website:"bucadibeppo.com",status:"Prospect"},
  {id:43,name:"BurgerFi",website:"burgerfi.com",status:"Churned"},
  {id:44,name:"Burn Boot Camp",website:"burnbootcamp.com",status:"Prospect"},
  {id:45,name:"C2 Education",website:"c2educate.com",status:"Prospect"},
  {id:46,name:"Caliber Car Wash",website:"calibercarwash.com",status:"Prospect"},
  {id:47,name:"Candlewood Suites",website:"candlewoodsuites.com",status:"Prospect"},
  {id:48,name:"Car Parts Warehouse, Inc.",website:"carpartswarehouse.net",status:"Prospect"},
  {id:49,name:"Carter's, Inc",website:"carters.com",status:"Prospect"},
  {id:50,name:"Carvel",website:"carvel.com",status:"Prospect"},
  {id:51,name:"CCI Systems, Inc.",website:"ccisystems.com",status:"Prospect"},
  {id:52,name:"Cedar Realty Trust, Inc.",website:"cedarrealtytrust.com",status:"Prospect"},
  {id:53,name:"Chester Fitness",website:"chesterfitness.com",status:"Prospect"},
  {id:54,name:"Chicken Salad Chick",website:"chickensaladchick.com",status:"Prospect"},
  {id:55,name:"CKO Kickboxing",website:"ckokickboxing.com",status:"Prospect"},
  {id:56,name:"Clean Eatz",website:"cleaneatz.com",status:"Prospect"},
  {id:57,name:"Club Champion",website:"clubchampiongolf.com",status:"Prospect"},
  {id:58,name:"Coldwell Banker Ben Bates, Inc., Realtor",website:"coldwellbanker.com",status:"Prospect"},
  {id:59,name:"Columbus Zoo and Aquarium",website:"columbuszoo.org",status:"Prospect"},
  {id:60,name:"Communications Electronics, Inc.",website:"communicationselectronics.com",status:"Prospect"},
  {id:61,name:"Compassus",website:"compassus.com",status:"Prospect"},
  {id:62,name:"Connor Co.",website:"connorco.com",status:"Prospect"},
  {id:63,name:"Cook Out",website:"cookout.com",status:"Prospect"},
  {id:64,name:"Costello Real Estate and Investments",website:"costellorei.com",status:"Prospect"},
  {id:65,name:"Crye-Leike Realtors",website:"crye-leike.com",status:"Prospect"},
  {id:66,name:"CSL Plasma Inc.",website:"cslplasma.com",status:"Prospect"},
  {id:67,name:"D1 Sports Training",website:"d1training.com",status:"Prospect"},
  {id:68,name:"Dakota Watch Company",website:"dakotawatch.com",status:"Prospect"},
  {id:69,name:"Darin Rich-REMAX Realty Group",website:"google.com",status:"Churned"},
  {id:70,name:"DC Water and Sewer Authority",website:"dcwater.com",status:"Prospect"},
  {id:71,name:"Dead River Company",website:"deadriver.com",status:"Prospect"},
  {id:72,name:"Decor Holdings, Inc.",website:"robertallendesign.com",status:"Prospect"},
  {id:73,name:"Deka Lash",website:"dekalash.com",status:"Prospect"},
  {id:74,name:"Desigual USA",website:"desigual.com",status:"Prospect"},
  {id:75,name:"Diamond Parking Ltd",website:"diamondparking.com",status:"Prospect"},
  {id:76,name:"Diesel",website:"shop.diesel.com",status:"Prospect"},
  {id:77,name:"Dippin' Dots (Owned by J&J Snackfoods)",website:"dippindots.com",status:"Prospect"},
  {id:78,name:"Douglas Realty, LLC",website:"godouglasrealty.com",status:"Prospect"},
  {id:79,name:"DTLR, Inc.",website:"dtlr.com",status:"Churned"},
  {id:80,name:"Dubois Chemicals, Inc.",website:"duboischemicals.com",status:"Prospect"},
  {id:81,name:"E3 Diagnostics, Inc.",website:"e3diagnostics.com",status:"Prospect"},
  {id:82,name:"Eastern National",website:"easternnational.org",status:"Prospect"},
  {id:83,name:"Eggs Up Grill",website:"eggsupgrill.com",status:"Prospect"},
  {id:84,name:"Ellianos Coffee",website:"ellianos.com",status:"Prospect"},
  {id:85,name:"Empire Office, Inc.",website:"empireoffice.com",status:"Prospect"},
  {id:86,name:"EQUUS CAPITAL PARTNERS, LTD",website:"equuspartners.com",status:"Prospect"},
  {id:87,name:"Faces Cosmetics Inc",website:"facescosmetics.ca",status:"Prospect"},
  {id:88,name:"Family Video Movie Club Inc",website:"familyvideo.com",status:"Prospect"},
  {id:89,name:"Famous Supply",website:"famous-supply.com",status:"Prospect"},
  {id:90,name:"Fine Wine & Good Spirits",website:"finewineandgoodspirits.com",status:"Prospect"},
  {id:91,name:"Fleming's Prime Steakhouse & Wine Bar",website:"flemingssteakhouse.com",status:"Prospect"},
  {id:92,name:"Food Giant, Inc",website:"foodgiant.com",status:"Prospect"},
  {id:93,name:"Forest Properties",website:"forestproperties.net",status:"Prospect"},
  {id:94,name:"Foreverlawn, inc",website:"foreverlawn.com",status:"Prospect"},
  {id:95,name:"Fountainhead Development LLC",website:"chateauelan.com",status:"Prospect"},
  {id:96,name:"Freshens",website:"freshens.com",status:"Prospect"},
  {id:97,name:"Gate Petroleum Convenience Stores",website:"gatepetro.com",status:"Prospect"},
  {id:98,name:"George Delalio Company, Inc.",website:"delallo.com",status:"Prospect"},
  {id:99,name:"Get In Shape For Women",website:"getinshapeforwomen.com",status:"Prospect"},
  {id:100,name:"Getty Petroleum Marketing Inc",website:"gettyrealty.com",status:"Prospect"},
  {id:101,name:"Giant Tiger",website:"gianttiger.com",status:"Prospect"},
  {id:102,name:"Giorgio Armani Corporation",website:"armani.com",status:"Prospect"},
  {id:103,name:"Go Store It Self Storage",website:"gostoreit.com",status:"Prospect"},
  {id:104,name:"Golden Krust Caribbean Bakery Inc.",website:"goldenkrust.com",status:"Prospect"},
  {id:105,name:"Golden Krust Franchising Inc.",website:"goldenkrust.com",status:"Prospect"},
  {id:106,name:"Goodwill of North Georgia, Inc.",website:"goodwillng.org",status:"Prospect"},
  {id:107,name:"Goodwill of South Central Ohio",website:"goodwill.org",status:"Prospect"},
  {id:108,name:"Guest Services, Inc.",website:"guestservices.com",status:"Prospect"},
  {id:109,name:"Gulf Oil",website:"gulfoilcorp.com",status:"Prospect"},
  {id:110,name:"H & H Enterprises",website:"hhsales.com",status:"Prospect"},
  {id:111,name:"Haffners",website:"haffnersenergy.com",status:"Prospect"},
  {id:112,name:"Happy's Pizza",website:"happyspizza.com",status:"Prospect"},
  {id:113,name:"Harbor Group Management Co",website:"hgliving.com",status:"Prospect"},
  {id:114,name:"Hartz Mountain Corporation",website:"hartz.com",status:"Prospect"},
  {id:115,name:"HCA Advertising Services, Inc. dba Hair Club",website:"hairclub.com",status:"Churned"},
  {id:116,name:"Healthcare",website:"seark.edu",status:"Prospect"},
  {id:117,name:"Hepaco, LLC",website:"hepaco.com",status:"Prospect"},
  {id:118,name:"Herb Chambers Dealerships",website:"herbchambers.com",status:"Prospect"},
  {id:119,name:"Hersha Hospitality Management, LP",website:"hhmhospitality.com",status:"Churned"},
  {id:120,name:"HGregoire",website:"hgreg.com",status:"Prospect"},
  {id:121,name:"Hillyard",website:"hillyard.com",status:"Prospect"},
  {id:122,name:"Hollywood Feed LLC",website:"hollywoodfeed.com",status:"Churned"},
  {id:123,name:"Holtzman Oil Corp.",website:"holtzmancorp.com",status:"Prospect"},
  {id:124,name:"Hometown America, L.L.C.",website:"hometownamerica.com",status:"Prospect"},
  {id:125,name:"Hooters of America, LLC",website:"hooters.com",status:"Churned"},
  {id:126,name:"Hoover",website:"hoover.co.uk",status:"Prospect"},
  {id:127,name:"Horizon Wine And Spirits Nashville, Inc.",website:"empiredist.com",status:"Prospect"},
  {id:128,name:"Hostelling International USA",website:"hiusa.org",status:"Churned"},
  {id:129,name:"Hot Head Burritos",website:"hotheadburritos.com",status:"Prospect"},
  {id:130,name:"Howard Hanna",website:"howardhanna.com",status:"Prospect"},
  {id:131,name:"Howard Perry Walston Realty Inc",website:"hpw.com",status:"Prospect"},
  {id:132,name:"Indigo Books and Music",website:"indigo.ca",status:"Prospect"},
  {id:133,name:"Innovative Systems Inc.",website:"innovativesystems.com",status:"Prospect"},
  {id:134,name:"Insomnia Cookies",website:"serveubrands.com",status:"Prospect"},
  {id:135,name:"Ipark",website:"ipark.com",status:"Prospect"},
  {id:136,name:"J. Alexander's Restaurant",website:"jalexanders.com",status:"Prospect"},
  {id:137,name:"Jamestown, L.P.",website:"jamestownlp.com",status:"Prospect"},
  {id:138,name:"Jcb, Inc.",website:"jcb.com",status:"Prospect"},
  {id:139,name:"Jennifer Convertibles, Inc.",website:"jenniferfurniture.com",status:"Prospect"},
  {id:140,name:"Jeremiah's Italian Ice",website:"jeremiahsice.com",status:"Churned"},
  {id:141,name:"Jewels By Park Lane, Inc.",website:"parklanejewelry.com",status:"Prospect"},
  {id:142,name:"John R. Wood Properties",website:"johnrwood.com",status:"Churned"},
  {id:143,name:"Jubilant Radiopharma",website:"jdlri.com",status:"Prospect"},
  {id:144,name:"K-Va-T Food Stores, Inc.",website:"foodcity.com",status:"Prospect"},
  {id:145,name:"Kaeser Compressors, Inc.",website:"kaeser.com",status:"Prospect"},
  {id:146,name:"Kessler Rehabilitation Center",website:"kesslerrehabilitationcenter.com",status:"Prospect"},
  {id:147,name:"Key Food Stores Co-Operative, Inc.",website:"keyfood.com",status:"Prospect"},
  {id:148,name:"Kiddie Academy",website:"kiddieacademy.com",status:"Churned"},
  {id:149,name:"King Venture, Inc.",website:"bk.com",status:"Prospect"},
  {id:150,name:"Kirkland's",website:"kirklands.com",status:"Prospect"},
  {id:151,name:"Koko FitClub",website:"kokofitclub.com",status:"Prospect"},
  {id:152,name:"Krystal Restaurants LLC",website:"krystal.com",status:"Churned"},
  {id:153,name:"Kung Fu Tea",website:"kungfutea.com",status:"Churned"},
  {id:154,name:"Kyocera Document Solutions America, Inc.",website:"kyoceradocumentsolutions.com",status:"Prospect"},
  {id:155,name:"La Bottega",website:"labottegagourmet.com",status:"Prospect"},
  {id:156,name:"Labor Finders",website:"laborfinders.com",status:"Prospect"},
  {id:157,name:"Landmark Properties",website:"landmarkproperties.com",status:"Prospect"},
  {id:158,name:"Laura Shoppe",website:"laura.ca",status:"Prospect"},
  {id:159,name:"Lawson Products, Inc.",website:"lawsonproducts.com",status:"Prospect"},
  {id:160,name:"Leica Geosystems, Inc.",website:"leica-geosystems.com",status:"Prospect"},
  {id:161,name:"Leonard Buildings and Truck Accessories",website:"leonardusa.com",status:"Prospect"},
  {id:162,name:"Levin Furniture",website:"levinfurniture.com",status:"Prospect"},
  {id:163,name:"Liebherr-America, Inc.",website:"liebherr.com",status:"Prospect"},
  {id:164,name:"Life Fitness",website:"lifefitness.com",status:"Prospect"},
  {id:165,name:"Lightbridge Academy",website:"lightbridgeacademy.com",status:"Prospect"},
  {id:166,name:"Lillibridge Health Trust",website:"lillibridge.com",status:"Prospect"},
  {id:167,name:"LINE-X",website:"linex.com",status:"Prospect"},
  {id:168,name:"Little General Store",website:"lgstoreswv.com",status:"Prospect"},
  {id:169,name:"Lodgco Management, L.L.C.",website:"lodgco.net",status:"Prospect"},
  {id:170,name:"Lukoli North America LLC",website:"lukoliamericas.com",status:"Prospect"},
  {id:171,name:"MAPCO Express, Inc.",website:"mapcorewards.com",status:"Prospect"},
  {id:172,name:"Marcs",website:"marcs.com",status:"Prospect"},
  {id:173,name:"Margaritas Mexican Restaurants",website:"margs.com",status:"Prospect"},
  {id:174,name:"Margaritaville",website:"margaritaville.com",status:"Churned"},
  {id:175,name:"Market America Worldwide, Inc.",website:"marketamerica.com",status:"Prospect"},
  {id:176,name:"Martin Incorporated",website:"martinsupply.com",status:"Prospect"},
  {id:177,name:"McGrath Realty Inc.",website:"mcgrathrealtyinc.com",status:"Prospect"},
  {id:178,name:"Metro Mattress Corp",website:"metromattress.com",status:"Prospect"},
  {id:179,name:"MFA Financial, Inc.",website:"mfafinancial.com",status:"Prospect"},
  {id:180,name:"Mizar Holding Company, Inc.",website:"bernina.com",status:"Prospect"},
  {id:181,name:"Mobile Communications America",website:"callmc.com",status:"Prospect"},
  {id:182,name:"Modell's Sporting Goods",website:"modells.com",status:"Prospect"},
  {id:183,name:"Monarch Roofing",website:"monarchroofing.biz",status:"Prospect"},
  {id:184,name:"NEOPS",website:"poaprosthetics.com",status:"Prospect"},
  {id:185,name:"New England Conservatory of Music",website:"necmusic.edu",status:"Prospect"},
  {id:186,name:"Nexair, LLC",website:"nexair.com",status:"Prospect"},
  {id:187,name:"Nissan North America, Inc.",website:"nissanusa.com",status:"Churned"},
  {id:188,name:"Northeast Grocery",website:"northeastgrocery.com",status:"Prospect"},
  {id:189,name:"Nouria Energy Corporation",website:"nouriaenergy.com",status:"Prospect"},
  {id:190,name:"NRT",website:"nrtllc.com",status:"Prospect"},
  {id:191,name:"NYSC",website:"mysportsclubs.com",status:"Churned"},
  {id:192,name:"Office Depot, Inc",website:"officedepot.com",status:"Churned"},
  {id:193,name:"Office Properties Income Trust",website:"rmrgroup.com",status:"Prospect"},
  {id:194,name:"Old Time Pottery",website:"oldtimepottery.com",status:"Prospect"},
  {id:195,name:"Osmow's Shawarma",website:"osmows.com",status:"Prospect"},
  {id:196,name:"Oxford Realty Services, Inc.",website:"oxforddevelopment.com",status:"Prospect"},
  {id:197,name:"P.S.K. Supermarkets, LLC D.B.A Foodtown",website:"foodtown.com",status:"Prospect"},
  {id:198,name:"Partners Pharmacy",website:"partnerspharmacy.com",status:"Prospect"},
  {id:199,name:"Paul Davis Restoration Inc",website:"pauldavis.com",status:"Churned"},
  {id:200,name:"PC Construction",website:"pcconstruction.com",status:"Prospect"},
  {id:201,name:"Pennrose Management Company Inc",website:"pennrose.com",status:"Prospect"},
  {id:202,name:"Perfumania",website:"perfumania.com",status:"Prospect"},
  {id:203,name:"Petland, Inc. (On a Partner)",website:"petland.com",status:"Prospect"},
  {id:204,name:"Petro-Canada",website:"petro-canada.ca",status:"Prospect"},
  {id:205,name:"PGA Tour Superstores",website:"pgatoursuperstore.com",status:"Prospect"},
  {id:206,name:"Piggly Wiggly",website:"pigglywiggly.com",status:"Prospect"},
  {id:207,name:"PODS Moving & Storage",website:"pods.com",status:"Prospect"},
  {id:208,name:"Pool Guard",website:"poolguardusa.com",status:"Churned"},
  {id:209,name:"PoolCorp",website:"poolcorp.com",status:"Prospect"},
  {id:210,name:"Prometric Superholdco, Inc.",website:"prometric.com",status:"Prospect"},
  {id:211,name:"Ptw, Inc",website:"precisiontune.com",status:"Prospect"},
  {id:212,name:"Qualia",website:"qualia.us.com",status:"Churned"},
  {id:213,name:"Quality Oil Company",website:"qualityoilnc.com",status:"Prospect"},
  {id:214,name:"Quickie Convenience Stores Corp",website:"quickiestores.com",status:"Prospect"},
  {id:215,name:"R. L. Jordan Oil Company of North Carolina, Inc.",website:"hotspotstore.com",status:"Prospect"},
  {id:216,name:"Rainbow Apparel Co. (DUPE)",website:"rainbowshops.com",status:"Prospect"},
  {id:217,name:"Raymond Consolidated Corporation",website:"raymondcorp.com",status:"Prospect"},
  {id:218,name:"RE/MAX Quebec Inc",website:"remax-quebec.com",status:"Prospect"},
  {id:219,name:"Red Roof",website:"redroof.com",status:"Prospect"},
  {id:220,name:"Refuel Operating Company",website:"refuelmarket.com",status:"Prospect"},
  {id:221,name:"Reimagined Parking",website:"reimagindparking.com",status:"Prospect"},
  {id:222,name:"RG Industries, Inc.",website:"rg-group.com",status:"Prospect"},
  {id:223,name:"Ritz Carlton",website:"ritzcarlton.com",status:"Prospect"},
  {id:224,name:"Rock N' Roll Sushi",website:"rocknrollsushi.com",status:"Prospect"},
  {id:225,name:"Rogers Enterprises, Inc.",website:"rogersandhollands.com",status:"Churned"},
  {id:226,name:"Rollins",website:"rollins.com",status:"Churned"},
  {id:227,name:"Royal LePage Niagara Real Estate Centre",website:"royallepage.ca",status:"Prospect"},
  {id:228,name:"Ruby Tuesday, Inc.",website:"rubytuesday.com",status:"Prospect"},
  {id:229,name:"Rugby Holdings LLC",website:"rugbyabp.com",status:"Prospect"},
  {id:230,name:"Rural King Supply Inc - DUPLICATE - Already Active Account",website:"ruralking.com",status:"Prospect"},
  {id:231,name:"Sam's Club",website:"samsclub.com",status:"Prospect"},
  {id:232,name:"Samsung Opto-Electronics America, Inc.",website:"sas.com",status:"Prospect"},
  {id:233,name:"Savvy Sliders",website:"savvysliders.com",status:"Prospect"},
  {id:234,name:"Schewels Furniture's Retailer",website:"schewels.com",status:"Prospect"},
  {id:235,name:"Seco Tools, LLC",website:"secotools.com",status:"Prospect"},
  {id:236,name:"Seritage Growth Properties",website:"seritage.com",status:"Prospect"},
  {id:237,name:"Shake Shack",website:"shakeshack.com",status:"Churned"},
  {id:238,name:"Sheraton",website:"sheraton.marriott.com",status:"Prospect"},
  {id:239,name:"SHP Management Corp",website:"shpmanagement.com",status:"Prospect"},
  {id:240,name:"Shp Management Corp.",website:"shpmanagement.com",status:"Prospect"},
  {id:241,name:"Sme Holding Company, LLC",website:"ems.com",status:"Prospect"},
  {id:242,name:"Smith & Associates Real Estate",website:"smithandassociates.com",status:"Prospect"},
  {id:243,name:"Solstice Marketing Concepts LLC",website:"solsticesunglasses.com",status:"Churned"},
  {id:244,name:"Sonic Automotive",website:"sonicautomotive.com",status:"Churned"},
  {id:245,name:"Sonic Financial Corporation",website:"chevrolet.com",status:"Prospect"},
  {id:246,name:"South Beach Estates LLC",website:"southbeachestates.com",status:"Prospect"},
  {id:247,name:"Southern Vacation Rentals",website:"southernresorts.com",status:"Churned"},
  {id:248,name:"Spartan Race",website:"spartan.com",status:"Prospect"},
  {id:249,name:"Sperry Van Ness",website:"svn.com",status:"Prospect"},
  {id:250,name:"Sticky Fingers Ribhouse",website:"stickyfingers.com",status:"Prospect"},
  {id:251,name:"Stretch Zone",website:"stretchzone.com",status:"Prospect"},
  {id:252,name:"Sun Tan City",website:"suntancity.com",status:"Prospect"},
  {id:253,name:"Sunshine Gasoline Distributors, Inc.",website:"sunshinegasoline.com",status:"Prospect"},
  {id:254,name:"Supermercados Econo",website:"superecono.com",status:"Prospect"},
  {id:255,name:"Supply Technologies",website:"supplytechnologies.com",status:"Prospect"},
  {id:256,name:"T & J Foods LLC",website:"tjtmfoodgroup.com",status:"Prospect"},
  {id:257,name:"Taco Bamba",website:"tacobamba.com",status:"Prospect"},
  {id:258,name:"Taurus Holdings, Inc.",website:"taurususa.com",status:"Prospect"},
  {id:259,name:"Texas Chicken & Burgers",website:"texaschickenandburgers.com",status:"Churned"},
  {id:260,name:"The Brass Tap",website:"brasstapbeerbar.com",status:"Prospect"},
  {id:261,name:"The Burger Joint (BGR)",website:"bgrtheburgerjoint.com",status:"Prospect"},
  {id:262,name:"The Cook & Boardman Group LLC",website:"cookandboardman.com",status:"Prospect"},
  {id:263,name:"The Honey Baked Ham Company, LLC",website:"honeybaked.com",status:"Churned"},
  {id:264,name:"The Jackson Clinic P. A.",website:"jacksonclinic.com",status:"Prospect"},
  {id:265,name:"The Kendall Group",website:"kendallelectric.com",status:"Churned"},
  {id:266,name:"The Learning Experience Academy of Early Education",website:"thelearningexperience.com",status:"Churned"},
  {id:267,name:"The Masielio Group",website:"masielio.com",status:"Prospect"},
  {id:268,name:"The New Jersey Transit Corporation",website:"njtransit.com",status:"Prospect"},
  {id:269,name:"The Polo Club",website:"poloclub.net",status:"Prospect"},
  {id:270,name:"The Shops at Columbus Circle",website:"related.com",status:"Prospect"},
  {id:271,name:"Theory LLC.",website:"theory.com",status:"Churned"},
  {id:272,name:"Thermo King Quad Cities, Inc.",website:"thermoking.com",status:"Prospect"},
  {id:273,name:"Thor Equities, LLC",website:"thorequities.com",status:"Prospect"},
  {id:274,name:"Tide Cleaners",website:"tidecleaners.com",status:"Prospect"},
  {id:275,name:"Tijuana Flats",website:"tijuanaflats.com",status:"Prospect"},
  {id:276,name:"Titanium Industries, Inc.",website:"titanium.com",status:"Prospect"},
  {id:277,name:"Topco Holdings, Inc. (cooperative)",website:"topco.com",status:"Prospect"},
  {id:278,name:"Total Life Changes",website:"totallifechanges.com",status:"Churned"},
  {id:279,name:"Tri Star Energy, LLC",website:"tristartn.com",status:"Prospect"},
  {id:280,name:"Truckpro Holding Corporation",website:"truckpro.com",status:"Prospect"},
  {id:281,name:"Tubby's Sub Shop Inc.",website:"tubbys.com",status:"Churned"},
  {id:282,name:"Turtle & Hughes, Inc",website:"turtle.com",status:"Prospect"},
  {id:283,name:"U'Sagain, LLC",website:"usagain.com",status:"Prospect"},
  {id:284,name:"Unicorn Listings of Cummings & Co. Realtors",website:"cummingsrealtors.com",status:"Prospect"},
  {id:285,name:"United Refrigeration Inc (URI) / Trenton Refrigeration",website:"uri.com",status:"Prospect"},
  {id:286,name:"United Service Organizations, Inc.",website:"uso.org",status:"Prospect"},
  {id:287,name:"United Skates of America",website:"unitedskates.com",status:"Prospect"},
  {id:288,name:"Urstadt Biddle Properties Inc.",website:"ubproperties.com",status:"Prospect"},
  {id:289,name:"US Lawns",website:"uslawns.com",status:"Prospect"},
  {id:290,name:"Vestis Corporation",website:"vestis.com",status:"Prospect"},
  {id:291,name:"Virtual Properties Realty",website:"virtualpropertiesrealty.com",status:"Prospect"},
  {id:292,name:"Visit Orlando",website:"visitorlando.com",status:"Prospect"},
  {id:293,name:"Visit Turks and Caicos Islands",website:"visittci.com",status:"Prospect"},
  {id:294,name:"Warehouse Home Furnishings Distributors, Inc.",website:"farmershomefurniture.com",status:"Prospect"},
  {id:295,name:"Waterworks / WW Liquidation",website:"waterworks.com",status:"Prospect"},
  {id:296,name:"Watson Realty Corp",website:"watsonrent.com",status:"Prospect"},
  {id:297,name:"Weis Markets Inc",website:"weismarkets.com",status:"Prospect"},
  {id:298,name:"Weisfield Jewelers",website:"kay.com",status:"Prospect"},
  {id:299,name:"Westcon-Comstor",website:"westconcomstor.com",status:"Prospect"},
  {id:300,name:"White Spot",website:"whitespot.ca",status:"Prospect"},
  {id:301,name:"Whole Foods Market Canada Inc",website:"wholefoodsmarket.com",status:"Prospect"},
  {id:302,name:"Wild Fork Foods",website:"wildforkfoods.com",status:"Churned"},
  {id:303,name:"Wind Hotels Holdings Inc (Owned by Wyndham Hotels)",website:"wyndhamhotels.com",status:"Prospect"},
  {id:304,name:"Wings to Go",website:"wingstogo.com",status:"Churned"},
  {id:305,name:"Wolf Trap Foundation For The Performing Arts",website:"wolftrap.org",status:"Prospect"},
  {id:306,name:"Word of Life Fellowship, Inc.",website:"wordoflife.edu",status:"Prospect"},
  {id:307,name:"Wow Bao",website:"wowbao.com",status:"Prospect"},
  {id:308,name:"Your Pie Franchising",website:"yourpie.com",status:"Prospect"},
  {id:309,name:"Zumba Fitness, LLC",website:"zumba.com",status:"Prospect"},
];

export const SEED: Prospect[] = RAW_SEED.map((r) => initProspect(r));
