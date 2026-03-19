// Rule PR-1 & Rule PR-8 Verified 2026 Rates
export const WCT_CONFIG = {
  feeSchedule: {
    "Settlement Fee": 299,
    "Title Search Fee": 349,
    "Admin Fee": 199,
    "Delivery Fee": 40,
    "Deed Preparation": 70,
    "Recording Fee": 40,
  },
  settings: {
    includeTitlePremium: true, // Enabled as requested for OTIRB integration
    includeHOAProration: false,
  },
  // Ohio OTIRB Rate Schedule (PR-1)
  otirbRates: [
    { threshold: 0, rate: 5.80 },        // Up to $250k 
    { threshold: 250000, rate: 4.10 },   // $250k - $500k 
    { threshold: 500000, rate: 3.20 },   // $500k - $1M 
    { threshold: 1000000, rate: 3.10 },  // $1M - $5M 
    { threshold: 5000000, rate: 2.90 },  // $5M - $10M 
    { threshold: 10000000, rate: 2.60 }  // Over $10M 
  ],
  minPremium: {
    standard: 225,  // Rule PR-1 
    homeowner: 250  // Rule PR-1.1 [cite: 3397]
  },
  // Transfer tax rates by county (Rate per $1,000)
  transferTaxRates: {
    default: 4.00,
    "Huron": 2.00, "Wayne": 2.00,
    "Auglaize": 3.00, "Belmont": 3.00, "Butler": 3.00, "Clinton": 3.00, "Darke": 3.00, "Delaware": 3.00, "Fayette": 3.00, "Franklin": 3.00, "Greene": 3.00, "Hamilton": 3.00, "Hancock": 3.00, "Highland": 3.00, "Knox": 3.00, "Madison": 3.00, "Medina": 3.00, "Miami": 3.00, "Monroe": 3.00, "Montgomery": 3.00, "Morgan": 3.00, "Pickaway": 3.00, "Preble": 3.00, "Warren": 3.00, "Wood": 3.00,
    "Mercer": 3.50,
    "Adams": 4.00, "Allen": 4.00, "Ashland": 4.00, "Ashtabula": 4.00, "Athens": 4.00, "Brown": 4.00, "Carroll": 4.00, "Champaign": 4.00, "Clark": 4.00, "Clermont": 4.00, "Columbiana": 4.00, "Coshocton": 4.00, "Crawford": 4.00, "Cuyahoga": 4.00, "Defiance": 4.00, "Erie": 4.00, "Fairfield": 4.00, "Fulton": 4.00, "Geauga": 4.00, "Guernsey": 4.00, "Hardin": 4.00, "Harrison": 4.00, "Henry": 4.00, "Hocking": 4.00, "Holmes": 4.00, "Jackson": 4.00, "Jefferson": 4.00, "Lake": 4.00, "Lawrence": 4.00, "Licking": 4.00, "Logan": 4.00, "Mahoning": 4.00, "Marion": 4.00, "Meigs": 4.00, "Morrow": 4.00, "Muskingum": 4.00, "Noble": 4.00, "Ottawa": 4.00, "Paulding": 4.00, "Perry": 4.00, "Pike": 4.00, "Portage": 4.00, "Putnam": 4.00, "Richland": 4.00, "Ross": 4.00, "Sandusky": 4.00, "Scioto": 4.00, "Seneca": 4.00, "Shelby": 4.00, "Stark": 4.00, "Summit": 4.00, "Trumbull": 4.00, "Tuscarawas": 4.00, "Union": 4.00, "Van Wert": 4.00, "Vinton": 4.00, "Washington": 4.00, "Williams": 4.00, "Wyandot": 4.00
  }
};
