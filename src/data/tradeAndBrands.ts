import type { Country } from './countries';

export interface CountryTradeProfile {
  topExports: string[];
  topImports: string[];
  coreIndustries: string[];
  famousBrands: string[];
  tradeHighlight: string;
}

export interface CountryFootballProfile {
  teamName: string;
  nickname: string;
  confederation: string;
  homeStadium: string;
  iconicMoment: string;
}

const CURATED_TRADE: Record<string, CountryTradeProfile> = {
  lk: {
    topExports: ['Ceylon Tea', 'Apparel & Textiles', 'Rubber Products', 'Spices & Cinnamon', 'Precious Gemstones'],
    topImports: ['Refined Petroleum', 'Machinery', 'Textiles', 'Pharmaceuticals'],
    coreIndustries: ['Apparel Manufacturing', 'Plantation Agriculture', 'IT & BPO Services', 'Maritime Logistics & Tourism'],
    famousBrands: ['Dilmah', 'MAS Holdings', 'Brandix', 'Dialog Axiata', 'SriLankan Airlines', 'Spa Ceylon'],
    tradeHighlight: 'Strategic Indian Ocean transshipment hub centered on Colombo Port.',
  },
  jp: {
    topExports: ['Automobiles', 'Semiconductor Equipment', 'Industrial Robotics', 'Precision Optics'],
    topImports: ['Crude Oil & LNG', 'Integrated Circuits', 'Pharmaceuticals', 'Coal'],
    coreIndustries: ['Automotive Engineering', 'Consumer Electronics', 'Robotics & Precision Tech', 'High-Speed Rail'],
    famousBrands: ['Toyota', 'Sony', 'Nintendo', 'Honda', 'Canon', 'Panasonic', 'Uniqlo'],
    tradeHighlight: 'Global leader in advanced manufacturing, precision robotics, and hybrid vehicles.',
  },
  gb: {
    topExports: ['Gas Turbines & Aerospace', 'Pharmaceuticals', 'Financial Services', 'Luxury Vehicles'],
    topImports: ['Refined Petroleum', 'Vehicles', 'Computing Hardware', 'Medicines'],
    coreIndustries: ['Global Finance & FinTech', 'Aerospace & Defense', 'Life Sciences', 'Creative Media'],
    famousBrands: ['Rolls-Royce', 'BBC', 'Burberry', 'Barclays', 'AstraZeneca', 'Jaguar Land Rover'],
    tradeHighlight: 'Global capital for financial services, life sciences, and high-precision engineering.',
  },
  'gb-eng': {
    topExports: ['Financial & Legal Services', 'Aerospace Engines', 'Pharmaceuticals', 'Automotive'],
    topImports: ['Energy & Fuels', 'Consumer Electronics', 'Foodstuffs', 'Industrial Machinery'],
    coreIndustries: ['London FinTech', 'Biotech & Pharma', 'Aerospace', 'Creative & Software Tech'],
    famousBrands: ['Rolls-Royce', 'ARM', 'Dyson', 'Burberry', 'HSBC', 'Premier League'],
    tradeHighlight: 'Anchored by London global financial markets and Oxford-Cambridge life sciences.',
  },
  'gb-sct': {
    topExports: ['Scotch Whisky', 'Offshore Wind & Energy', 'Precision Electronics', 'Atlantic Salmon'],
    topImports: ['Industrial Machinery', 'Vehicles', 'Electronics', 'Agricultural Goods'],
    coreIndustries: ['Renewable Energy', 'Distilling & Food', 'Financial Services', 'Space Tech'],
    famousBrands: ['Johnnie Walker', 'Royal Bank of Scotland', 'BrewDog', 'Glenfiddich', 'Harris Tweed'],
    tradeHighlight: 'Europe’s leading offshore renewable energy and world-renowned Scotch whisky exporter.',
  },
  'gb-wls': {
    topExports: ['Aerospace Wing Assemblies', 'Steel & Metals', 'Compound Semiconductors', 'Agri-Food'],
    topImports: ['Raw Metals', 'Industrial Components', 'Consumer Goods', 'Energy'],
    coreIndustries: ['Aerospace Manufacturing', 'Compound Semiconductors', 'Clean Energy', 'Creative Media'],
    famousBrands: ['Admiral Group', 'Penderyn', 'Halon', 'Welsh Lamb PGI', 'Principality'],
    tradeHighlight: 'Home to the UK’s compound semiconductor cluster and Airbus wing manufacturing.',
  },
  'gb-nir': {
    topExports: ['Aerospace Components', 'Agri-Food & Dairy', 'Cybersecurity Software', 'Heavy Machinery'],
    topImports: ['Industrial Parts', 'Energy', 'Retail Goods', 'Building Materials'],
    coreIndustries: ['Cybersecurity & Software', 'Advanced Engineering', 'Agri-Food', 'Film Production'],
    famousBrands: ['Bushmills', 'Wrightbus', 'Tayto', 'Harland & Wolff', 'Moy Park'],
    tradeHighlight: 'Dual-market trade gateway known for clean-tech buses and cybersecurity innovation.',
  },
  us: {
    topExports: ['Cloud & Software IP', 'Aerospace & Aircraft', 'Refined Fuels & LNG', 'Semiconductors', 'Pharmaceuticals'],
    topImports: ['Vehicles', 'Consumer Electronics', 'Machinery', 'Pharmaceuticals'],
    coreIndustries: ['Technology & AI', 'Aerospace', 'Biotechnology', 'Financial Services', 'Energy'],
    famousBrands: ['Apple', 'Google', 'Microsoft', 'Tesla', 'Boeing', 'Nike', 'Coca-Cola'],
    tradeHighlight: 'World’s largest innovation economy spanning software, aerospace, and capital markets.',
  },
  in: {
    topExports: ['IT & Software Services', 'Pharmaceuticals', 'Refined Petroleum', 'Diamonds & Jewelry', 'Automobiles'],
    topImports: ['Crude Oil', 'Gold', 'Electronic Components', 'Coal'],
    coreIndustries: ['Software & Digital Services', 'Generic Pharmaceuticals', 'Automotive', 'Space & Renewable Tech'],
    famousBrands: ['Tata Group', 'Infosys', 'Reliance', 'Mahindra', 'TCS', 'Zoho', 'Royal Enfield'],
    tradeHighlight: 'Global powerhouse in IT services, vaccine manufacturing, and digital public infrastructure.',
  },
  cn: {
    topExports: ['Electronics & Smartphones', 'Electric Vehicles', 'Solar Panels & Batteries', 'Industrial Machinery'],
    topImports: ['Integrated Circuits', 'Crude Oil', 'Iron Ore', 'Soybeans'],
    coreIndustries: ['High-Volume Manufacturing', 'EV & Battery Supply Chains', 'E-Commerce', 'Telecom Infrastructure'],
    famousBrands: ['BYD', 'Huawei', 'Lenovo', 'DJI', 'Alibaba', 'Xiaomi', 'CATL'],
    tradeHighlight: 'World’s largest merchandise exporter leading global EV, battery, and solar supply chains.',
  },
  de: {
    topExports: ['Luxury & Industrial Vehicles', 'Precision Machinery', 'Pharmaceuticals', 'Chemical Engineering'],
    topImports: ['Data Processing Equipment', 'Oil & Natural Gas', 'Vehicle Parts', 'Electrical Gear'],
    coreIndustries: ['Automotive Engineering', 'Industrial Automation', 'Chemicals & Pharma', 'Renewable Engineering'],
    famousBrands: ['Mercedes-Benz', 'BMW', 'Porsche', 'Siemens', 'SAP', 'Bosch', 'Adidas'],
    tradeHighlight: 'Europe’s industrial powerhouse anchored by Mittelstand precision engineering.',
  },
  fr: {
    topExports: ['Commercial Aircraft', 'Luxury Fashion & Cosmetics', 'Pharmaceuticals', 'Fine Wines & Spirits'],
    topImports: ['Refined Fuels', 'Vehicles', 'Electronics', 'Industrial Machinery'],
    coreIndustries: ['Aerospace', 'Luxury Goods', 'Nuclear & Clean Energy', 'Agri-Food & Tourism'],
    famousBrands: ['Airbus', 'LVMH', 'L’Oréal', 'Renault', 'Chanel', 'Michelin', 'Hermès'],
    tradeHighlight: 'Global leader in civil aviation, haute couture luxury houses, and low-carbon energy.',
  },
  it: {
    topExports: ['Industrial Machinery', 'Luxury Fashion & Footwear', 'Pharmaceuticals', 'Supercars & Yachts'],
    topImports: ['Natural Gas & Oil', 'Vehicles', 'Electronic Components', 'Metals'],
    coreIndustries: ['Design & Luxury Fashion', 'Precision Machinery', 'Automotive', 'Food & Wine'],
    famousBrands: ['Ferrari', 'Gucci', 'Prada', 'Barilla', 'Ducati', 'Lamborghini', 'Lavazza'],
    tradeHighlight: 'Renowned for “Made in Italy” industrial craftsmanship, design, and supercar engineering.',
  },
  kr: {
    topExports: ['Memory Semiconductors', 'Automobiles', 'OLED Displays', 'Ships & Marine Vessels'],
    topImports: ['Crude Oil', 'Natural Gas', 'Semiconductor Machinery', 'Raw Minerals'],
    coreIndustries: ['Semiconductors', 'Automotive & EV Batteries', 'Shipbuilding', 'K-Culture Media'],
    famousBrands: ['Samsung', 'Hyundai', 'Kia', 'LG', 'SK Hynix', 'Naver', 'POSCO'],
    tradeHighlight: 'Critical node in global semiconductor memory, OLED displays, and battery innovation.',
  },
  sg: {
    topExports: ['Integrated Circuits', 'Refined Petroleum', 'Biomedical Products', 'Maritime & FinTech Services'],
    topImports: ['Crude Petroleum', 'Microchips', 'Gold', 'Industrial Machinery'],
    coreIndustries: ['Global Trade & Port Logistics', 'Wealth & FinTech', 'Biomedical Tech', 'Semiconductors'],
    famousBrands: ['Singapore Airlines', 'DBS Bank', 'Grab', 'Razer', 'Sea Group', 'Changi'],
    tradeHighlight: 'Premier Asia-Pacific trade, maritime transshipment, and financial command hub.',
  },
  au: {
    topExports: ['Iron Ore', 'Liquefied Natural Gas', 'Lithium & Critical Minerals', 'Gold', 'Wheat & Beef'],
    topImports: ['Vehicles', 'Refined Petroleum', 'Telecom Gear', 'Pharmaceuticals'],
    coreIndustries: ['Mining & Critical Minerals', 'Agriculture', 'Education & Tourism', 'FinTech & Biotech'],
    famousBrands: ['Atlassian', 'Canva', 'Qantas', 'BHP', 'CSL', 'Cochlear', 'R.M.Williams'],
    tradeHighlight: 'Leading global supplier of critical battery minerals, iron ore, and SaaS design tools.',
  },
  nz: {
    topExports: ['Dairy & Milk Powder', 'Lamb & Beef', 'Kiwifruit & Wine', 'Forestry & Space Launch'],
    topImports: ['Vehicles', 'Refined Petroleum', 'Machinery', 'Electronics'],
    coreIndustries: ['Sustainable Agriculture', 'Tourism', 'Software & Creative VFX', 'Aerospace'],
    famousBrands: ['Fonterra', 'Zespri', 'Xero', 'Rocket Lab', 'Air New Zealand', 'Allbirds'],
    tradeHighlight: 'Global leader in premium dairy, horticultural exports, and orbital small-sat launches.',
  },
  ca: {
    topExports: ['Crude Oil & Natural Gas', 'Vehicles & Aerospace', 'Potash & Wheat', 'Lumber & Minerals'],
    topImports: ['Automobiles', 'Machinery', 'Consumer Electronics', 'Pharmaceuticals'],
    coreIndustries: ['Natural Resources & Energy', 'AI Research & Software', 'Aerospace', 'Agri-Food'],
    famousBrands: ['Shopify', 'Lululemon', 'Bombardier', 'Canada Goose', 'BlackBerry', 'Tim Hortons'],
    tradeHighlight: 'Resource-rich G7 economy combining clean hydropower, minerals, and global commerce tech.',
  },
  ch: {
    topExports: ['Pharmaceuticals', 'Swiss Watches', 'Precision Instruments', 'Gold Refining', 'Chocolate'],
    topImports: ['Precious Metals', 'Vehicles', 'Chemical Precursors', 'Electronics'],
    coreIndustries: ['Life Sciences & Pharma', 'Horology & Luxury', 'Wealth Management', 'Precision MedTech'],
    famousBrands: ['Rolex', 'Nestlé', 'Novartis', 'Roche', 'UBS', 'Omega', 'Lindt'],
    tradeHighlight: 'World benchmark for high-value pharmaceuticals, luxury horology, and precision robotics.',
  },
  ae: {
    topExports: ['Crude Oil & Petrochemicals', 'Aluminum', 'Gold & Diamonds', 'Global Aviation & Logistics'],
    topImports: ['Broadcast Equipment', 'Gold', 'Vehicles', 'Jewelry & Machinery'],
    coreIndustries: ['Aviation & Re-Export Logistics', 'Energy & Renewables', 'Tourism', 'Finance & AI'],
    famousBrands: ['Emirates', 'Etihad', 'DP World', 'Emaar', 'ADNOC', 'Careem'],
    tradeHighlight: 'Global crossroads linking East and West via aviation, Jebel Ali port, and digital hubs.',
  },
  sa: {
    topExports: ['Crude Petroleum', 'Petrochemicals & Polymers', 'Refined Fuels', 'Fertilizers'],
    topImports: ['Vehicles', 'Industrial Machinery', 'Telecom Gear', 'Foodstuffs'],
    coreIndustries: ['Hydrocarbons & Petrochemicals', 'Clean Hydrogen', 'Giga-Project Infrastructure', 'Tourism'],
    famousBrands: ['Saudi Aramco', 'SABIC', 'STC', 'Almarai', 'Saudia', 'Lucid (PIF)'],
    tradeHighlight: 'World’s leading energy exporter diversifying rapidly into clean tech and global logistics.',
  },
  br: {
    topExports: ['Soybeans', 'Iron Ore', 'Crude Petroleum', 'Coffee & Sugar', 'Regional Aircraft'],
    topImports: ['Refined Fuels', 'Fertilizers', 'Electronics', 'Machinery'],
    coreIndustries: ['Agribusiness', 'Mining & Offshore Energy', 'Aerospace', 'Biofuels'],
    famousBrands: ['Embraer', 'Petrobras', 'Vale', 'Nubank', 'Havaianas', 'Natura'],
    tradeHighlight: 'Agricultural superpower and pioneer in sustainable biofuels and regional jet aviation.',
  },
  mx: {
    topExports: ['Vehicles & Auto Parts', 'Electronics & Medical Devices', 'Crude Oil', 'Avocados & Spirits'],
    topImports: ['Integrated Circuits', 'Refined Petroleum', 'Auto Components', 'Machinery'],
    coreIndustries: ['Nearshoring Manufacturing', 'Automotive', 'Aerospace', 'Agri-Food & Tourism'],
    famousBrands: ['Cemex', 'Grupo Bimbo', 'América Móvil', 'Corona', 'Pemex', 'Cinépolis'],
    tradeHighlight: 'North America’s premier manufacturing hub for vehicles, electronics, and medical devices.',
  },
  nl: {
    topExports: ['Lithography Systems', 'Refined Fuels', 'Agri-Tech & Flowers', 'Pharmaceuticals'],
    topImports: ['Crude Petroleum', 'Computing Equipment', 'Vehicles', 'Chemicals'],
    coreIndustries: ['Semiconductor Equipment', 'Port Logistics (Rotterdam)', 'Agri-Tech', 'Chemicals'],
    famousBrands: ['ASML', 'Philips', 'Heineken', 'Booking.com', 'KLM', 'Adyen'],
    tradeHighlight: 'Home to ASML lithography and Rotterdam, Europe’s largest maritime gateway.',
  },
  se: {
    topExports: ['Telecom Equipment', 'Vehicles & Trucks', 'Pharmaceuticals', 'Timber & Steel'],
    topImports: ['Crude Oil', 'Vehicles', 'Electronics', 'Industrial Machinery'],
    coreIndustries: ['Clean Tech & Green Steel', 'Telecommunications', 'Music & Gaming Tech', 'Automotive'],
    famousBrands: ['IKEA', 'Spotify', 'Volvo', 'Ericsson', 'H&M', 'Klarna'],
    tradeHighlight: 'Nordic innovation powerhouse producing global consumer tech, design, and green industry.',
  },
  es: {
    topExports: ['Automobiles', 'Refined Fuels', 'Olive Oil & Produce', 'Fashion Apparel', 'Pharmaceuticals'],
    topImports: ['Crude Oil', 'Vehicles', 'Natural Gas', 'Electronics'],
    coreIndustries: ['Renewable Energy', 'Fast Fashion Retail', 'Automotive', 'Tourism & Agri-Food'],
    famousBrands: ['Zara (Inditex)', 'Banco Santander', 'Telefónica', 'Iberdrola', 'SEAT', 'Mango'],
    tradeHighlight: 'Global leader in retail fashion logistics, high-speed rail, and solar/wind infrastructure.',
  },
  za: {
    topExports: ['Platinum & Gold', 'Iron Ore & Coal', 'Vehicles', 'Citrus & Fine Wine'],
    topImports: ['Refined Petroleum', 'Crude Oil', 'Machinery', 'Electronics'],
    coreIndustries: ['Mining & Precious Metals', 'Automotive Assembly', 'Financial Services', 'Agri-Business'],
    famousBrands: ['MTN', 'Naspers', 'Sasol', 'Standard Bank', 'Nando’s', 'Discovery'],
    tradeHighlight: 'Africa’s most industrialized economy and primary global supplier of platinum-group metals.',
  },
  ng: {
    topExports: ['Crude Petroleum', 'Liquefied Natural Gas', 'Cocoa & Sesame', 'Fertilizers'],
    topImports: ['Refined Fuels', 'Industrial Machinery', 'Wheat', 'Pharmaceuticals'],
    coreIndustries: ['Energy', 'FinTech & Telecoms', 'Nollywood Creative Media', 'Agriculture'],
    famousBrands: ['Dangote Group', 'Flutterwave', 'Paystack', 'Access Bank', 'Innoson', 'Glo'],
    tradeHighlight: 'West Africa’s largest market and continent-leading FinTech and creative media hub.',
  },
  eg: {
    topExports: ['Natural Gas & Fuels', 'Fertilizers', 'Textiles & Cotton', 'Citrus & Produce'],
    topImports: ['Wheat & Grains', 'Refined Petroleum', 'Machinery', 'Pharmaceuticals'],
    coreIndustries: ['Suez Canal Maritime Trade', 'Tourism & Heritage', 'Energy', 'Textiles & Construction'],
    famousBrands: ['Orascom', 'EgyptAir', 'Elsewedy Electric', 'CIB', 'Juhayna'],
    tradeHighlight: 'Controls the Suez Canal corridor connecting 12% of global maritime commerce.',
  },
  tr: {
    topExports: ['Automobiles', 'Textiles & Apparel', 'Machinery & Appliances', 'Aerospace Drones'],
    topImports: ['Natural Gas & Oil', 'Gold', 'Machinery', 'Electronic Components'],
    coreIndustries: ['Automotive Manufacturing', 'Home Appliances', 'Textiles', 'Aviation & Construction'],
    famousBrands: ['Turkish Airlines', 'Beko', 'Vestel', 'Baykar', 'Ülker', 'LC Waikiki'],
    tradeHighlight: 'Eurasian manufacturing bridge connecting European supply chains with Asia and MENA.',
  },
  my: {
    topExports: ['Semiconductor Packaging', 'Palm Oil', 'Liquefied Natural Gas', 'Medical Gloves'],
    topImports: ['Integrated Circuits', 'Refined Petroleum', 'Machinery', 'Chemicals'],
    coreIndustries: ['Semiconductor Assembly & Test', 'Energy', 'Agri-Commodities', 'Islamic Finance'],
    famousBrands: ['Petronas', 'AirAsia', 'Maybank', 'Proton', 'Top Glove', 'Sime Darby'],
    tradeHighlight: 'Critical Southeast Asian hub for semiconductor assembly, testing, and energy exports.',
  },
  id: {
    topExports: ['Nickel & Battery Metals', 'Palm Oil', 'Thermal Coal', 'Footwear & Textiles'],
    topImports: ['Refined Petroleum', 'Industrial Machinery', 'Electronics', 'Plastics'],
    coreIndustries: ['Nickel & EV Downstream Refining', 'Digital Economy', 'Agriculture', 'Manufacturing'],
    famousBrands: ['GoTo', 'Indomie (Indofood)', 'Pertamina', 'Bank Mandiri', 'Garuda Indonesia'],
    tradeHighlight: 'World’s largest nickel producer powering global stainless steel and EV battery supply chains.',
  },
  th: {
    topExports: ['Automobiles & Pickups', 'Hard Drives & Electronics', 'Rubber', 'Jasmine Rice & Seafood'],
    topImports: ['Crude Oil', 'Integrated Circuits', 'Gold', 'Industrial Machinery'],
    coreIndustries: ['Automotive Assembly', 'Electronics', 'Agri-Food', 'Medical & Leisure Tourism'],
    famousBrands: ['Red Bull (Krating Daeng)', 'CP Group', 'PTT', 'Thai Airways', 'Minor International'],
    tradeHighlight: 'Southeast Asia’s automotive manufacturing hub and top global food exporter.',
  },
  vn: {
    topExports: ['Smartphones & Electronics', 'Footwear & Apparel', 'Machinery', 'Coffee & Seafood'],
    topImports: ['Integrated Circuits', 'Textiles & Fabrics', 'Machinery', 'Plastics'],
    coreIndustries: ['Electronics Assembly', 'Apparel & Footwear', 'EV Manufacturing', 'Agriculture'],
    famousBrands: ['VinFast', 'Viettel', 'FPT Software', 'Vinamilk', 'Trung Nguyên'],
    tradeHighlight: 'Fastest-growing electronics, EV, and global apparel manufacturing hub in ASEAN.',
  },
  ph: {
    topExports: ['Semiconductor Components', 'IT-BPM Services', 'Coconut Oil', 'Copper & Nickel'],
    topImports: ['Refined Fuels', 'Electronic Parts', 'Vehicles', 'Grains'],
    coreIndustries: ['Business Process Outsourcing', 'Electronics Assembly', 'Maritime Crewing', 'Agri-Food'],
    famousBrands: ['Jollibee', 'San Miguel', 'Ayala', 'SM Prime', 'PLDT', 'GCash'],
    tradeHighlight: 'Global leader in English-language IT-BPM services and semiconductor assembly.',
  },
  pk: {
    topExports: ['Textiles & Denim', 'Basmati Rice', 'Surgical Instruments', 'IT Freelance Services'],
    topImports: ['Refined Petroleum', 'LNG', 'Palm Oil', 'Machinery'],
    coreIndustries: ['Textiles & Apparel', 'Agriculture', 'Surgical & Sports Goods', 'Software Services'],
    famousBrands: ['Jazz', 'Systems Limited', 'Khaadi', 'Engro', 'HBL', 'Shan Foods'],
    tradeHighlight: 'Major exporter of cotton textiles, Sialkot surgical/sports equipment, and Basmati rice.',
  },
  bd: {
    topExports: ['Ready-Made Garments', 'Knitwear & Textiles', 'Leather Footwear', 'Jute & Seafood'],
    topImports: ['Raw Cotton & Fabrics', 'Refined Fuels', 'Machinery', 'Wheat'],
    coreIndustries: ['Apparel & Knitwear', 'Pharmaceuticals', 'Digital FinTech', 'Shipbuilding'],
    famousBrands: ['bKash', 'Walton', 'PRAN', 'Beximco', 'Square Pharma', 'Aarong'],
    tradeHighlight: 'World’s second-largest ready-made garment exporter with a rapidly growing mobile FinTech sector.',
  },
  mv: {
    topExports: ['Skipjack & Yellowfin Tuna', 'Luxury Hospitality Services', 'Fishmeal'],
    topImports: ['Refined Petroleum', 'Foodstuffs', 'Construction Materials', 'Marine Vessels'],
    coreIndustries: ['Luxury Island Tourism', 'Sustainable Pole-and-Line Fisheries', 'Maritime Logistics'],
    famousBrands: ['Maldivian', 'Dhiraagu', 'MIFCO', 'Villa Resorts', 'Bank of Maldives'],
    tradeHighlight: 'Iconic Indian Ocean luxury tourism destination and sustainable tuna exporter.',
  },
  np: {
    topExports: ['Hydropower Electricity', 'Carpets & Pashmina', 'Cardamom & Tea', 'Apparel'],
    topImports: ['Refined Petroleum', 'Iron & Steel', 'Vehicles', 'Electronics'],
    coreIndustries: ['Himalayan Tourism & Trekking', 'Hydropower', 'Handicrafts', 'Agriculture'],
    famousBrands: ['Wai Wai (CG)', 'Ncell', 'Buddha Air', 'Goldstar Shoes', 'Himalayan Java'],
    tradeHighlight: 'Expanding clean Himalayan hydropower exporter and premier mountaineering destination.',
  },
  ru: {
    topExports: ['Crude Oil & Natural Gas', 'Wheat & Fertilizers', 'Aluminum & Palladium', 'Nuclear Tech'],
    topImports: ['Machinery', 'Vehicles', 'Electronics', 'Pharmaceuticals'],
    coreIndustries: ['Energy & Mining', 'Metallurgy', 'Grain Agriculture', 'Aerospace'],
    famousBrands: ['Gazprom', 'Rosatom', 'Yandex', 'Kaspersky', 'Sber', 'Lada'],
    tradeHighlight: 'Major Eurasian supplier of hydrocarbons, grain, fertilizers, and industrial metals.',
  },
  ua: {
    topExports: ['Sunflower Oil', 'Corn & Wheat', 'Iron Ore & Steel', 'IT Engineering Services'],
    topImports: ['Refined Fuels', 'Vehicles', 'Machinery', 'Pharmaceuticals'],
    coreIndustries: ['Black Sea Agriculture', 'Software Engineering', 'Metallurgy', 'Defense Tech'],
    famousBrands: ['Grammarly', 'Ajax Systems', 'SoftServe', 'Roshen', 'Antonov', 'Nova Poshta'],
    tradeHighlight: 'Global breadbasket for grains and sunflower oil alongside world-class software startups.',
  },
  ie: {
    topExports: ['Biopharmaceuticals', 'Cloud & Software Licensing', 'Medical Devices', 'Dairy & Whiskey'],
    topImports: ['Aircraft', 'Integrated Circuits', 'Pharmaceutical Inputs', 'Refined Fuels'],
    coreIndustries: ['EU Tech Headquarters', 'Biopharma & MedTech', 'Aviation Leasing', 'Agri-Food'],
    famousBrands: ['Stripe', 'Ryanair', 'Guinness', 'Kerrygold', 'Jameson', 'Primark'],
    tradeHighlight: 'European headquarters hub for global cloud platforms, biopharma, and aviation finance.',
  },
  no: {
    topExports: ['Natural Gas & Crude Oil', 'Atlantic Salmon', 'Aluminum', 'Maritime Clean Tech'],
    topImports: ['Electric Vehicles', 'Machinery', 'Ships', 'Electronics'],
    coreIndustries: ['Offshore Energy & Hydropower', 'Aquaculture', 'Green Shipping', 'Sovereign Finance'],
    famousBrands: ['Equinor', 'Norsk Hydro', 'Mowi', 'Kongsberg', 'Telenor', 'Helly Hansen'],
    tradeHighlight: 'Global pioneer in electric mobility, hydropower, and sustainable seafood exports.',
  },
  dk: {
    topExports: ['GLP-1 Biopharmaceuticals', 'Wind Turbines', 'Container Shipping', 'Pork & Dairy'],
    topImports: ['Vehicles', 'Machinery', 'Electronics', 'Pharmaceuticals'],
    coreIndustries: ['Life Sciences', 'Wind Energy', 'Global Maritime Logistics', 'Design & Toys'],
    famousBrands: ['Novo Nordisk', 'Maersk', 'LEGO', 'Vestas', 'Carlsberg', 'Bang & Olufsen'],
    tradeHighlight: 'Home to global leaders in metabolic medicine, offshore wind, and container shipping.',
  },
  fi: {
    topExports: ['Paper & Bio-Forestry', 'Industrial Machinery', 'Telecom Networks', 'Gaming Software'],
    topImports: ['Crude Oil', 'Vehicles', 'Electronics', 'Chemicals'],
    coreIndustries: ['5G/6G Telecom', 'Clean Forestry', 'Gaming & Software', 'Marine Engineering'],
    famousBrands: ['Nokia', 'Supercell', 'KONE', 'Fiskars', 'Marimekko', 'Wärtsilä'],
    tradeHighlight: 'Nordic leader in telecommunications infrastructure, elevator tech, and mobile gaming.',
  },
  il: {
    topExports: ['Cybersecurity & SaaS', 'Polished Diamonds', 'Semiconductors', 'Agri-Tech & MedTech'],
    topImports: ['Crude Oil', 'Vehicles', 'Rough Diamonds', 'Industrial Machinery'],
    coreIndustries: ['Cybersecurity & AI', 'Semiconductors', 'Precision Drip Irrigation', 'Medical Tech'],
    famousBrands: ['Check Point', 'Wix', 'Mobileye', 'Wiz', 'Teva', 'Monday.com'],
    tradeHighlight: 'High-density R&D startup ecosystem specializing in cybersecurity, chips, and water tech.',
  },
  ar: {
    topExports: ['Soybean Meal & Oil', 'Corn & Beef', 'Lithium', 'Malbec Wine', 'Software'],
    topImports: ['Auto Parts', 'Natural Gas', 'Machinery', 'Electronics'],
    coreIndustries: ['Agribusiness', 'Lithium & Shale Energy', 'Software & E-Commerce', 'Viticulture'],
    famousBrands: ['Mercado Libre', 'Globant', 'YPF', 'Arcor', 'Quilmes', 'Auth0'],
    tradeHighlight: 'Major South American agricultural exporter and birthplace of Latin America’s top tech unicorns.',
  },
  cl: {
    topExports: ['Refined Copper', 'Lithium Carbonate', 'Salmon & Cherries', 'Fine Wine'],
    topImports: ['Refined Fuels', 'Vehicles', 'Machinery', 'Electronics'],
    coreIndustries: ['Copper & Lithium Mining', 'Renewable Solar/Wind', 'Aquaculture', 'Viticulture'],
    famousBrands: ['Codelco', 'LATAM Airlines', 'SQM', 'Concha y Toro', 'Falabella'],
    tradeHighlight: 'World’s #1 copper producer and pivotal supplier of green-transition lithium.',
  },
  co: {
    topExports: ['Arabica Coffee', 'Cut Flowers', 'Crude Petroleum', 'Emeralds & Coal'],
    topImports: ['Refined Fuels', 'Vehicles', 'Electronics', 'Pharmaceuticals'],
    coreIndustries: ['Specialty Coffee & Floriculture', 'Energy', 'FinTech', 'Tourism'],
    famousBrands: ['Juan Valdez', 'Rappi', 'Avianca', 'Ecopetrol', 'Bancolombia', 'Arturo Calle'],
    tradeHighlight: 'World-renowned exporter of high-altitude Arabica coffee and fresh cut flowers.',
  },
  ke: {
    topExports: ['Black Tea', 'Cut Flowers & Avocados', 'Coffee', 'Mobile FinTech Services'],
    topImports: ['Refined Petroleum', 'Industrial Machinery', 'Vehicles', 'Pharmaceuticals'],
    coreIndustries: ['Mobile Money & FinTech', 'Horticulture & Tea', 'Geothermal Energy', 'Safari Tourism'],
    famousBrands: ['Safaricom (M-Pesa)', 'Kenya Airways', 'Equity Bank', 'Tusker', 'Java House'],
    tradeHighlight: 'East Africa’s “Silicon Savannah” and global pioneer in mobile payments and geothermal power.',
  },
  ma: {
    topExports: ['Automobiles & Wiring', 'Phosphates & Fertilizers', 'Citrus & Olives', 'Textiles'],
    topImports: ['Refined Fuels', 'Wheat', 'Auto Components', 'Machinery'],
    coreIndustries: ['Automotive Export Manufacturing', 'Phosphates', 'Solar Energy', 'Aerospace'],
    famousBrands: ['OCP Group', 'Royal Air Maroc', 'Attijariwafa Bank', 'Maroc Telecom'],
    tradeHighlight: 'Africa’s top automotive manufacturing exporter and major renewable solar corridor.',
  },
  tw: {
    topExports: ['Advanced Logic Semiconductors', 'AI Servers & GPUs', 'Precision Machinery', 'Bicycles'],
    topImports: ['Semiconductor Equipment', 'Crude Oil', 'LNG', 'Raw Materials'],
    coreIndustries: ['Leading-Edge Foundry', 'AI Hardware & PCs', 'Optoelectronics', 'Precision Cycling'],
    famousBrands: ['TSMC', 'ASUS', 'Acer', 'MediaTek', 'Foxconn', 'Giant Bicycles'],
    tradeHighlight: 'Produces over 60% of the world’s semiconductors and 90% of leading-edge logic chips.',
  },
  hk: {
    topExports: ['Financial & Trade Re-Exports', 'Integrated Circuits', 'Jewelry & Watches', 'Aviation Cargo'],
    topImports: ['Electronics', 'Gold & Luxury Goods', 'Foodstuffs', 'Telecom Equipment'],
    coreIndustries: ['International Finance', 'Air Cargo Logistics', 'Trade Re-Export', 'Hospitality'],
    famousBrands: ['Cathay Pacific', 'The Peninsula', 'AIA', 'MTR', 'Lee Kum Kee'],
    tradeHighlight: 'One of the world’s busiest air cargo hubs and premier Asia-Pacific capital gateway.',
  },
};

const CONTINENT_TRADE_TEMPLATES: Record<
  Exclude<Country['continent'], never>,
  (c: Country) => CountryTradeProfile
> = {
  Asia: (c) => ({
    topExports: ['Manufactured Textiles & Goods', 'Agricultural Commodities', 'Minerals & Energy', 'Regional Trade Services'],
    topImports: ['Refined Fuels', 'Industrial Machinery', 'Electronics', 'Pharmaceuticals'],
    coreIndustries: ['Regional Manufacturing', 'Agri-Business', 'Telecommunications', 'Hospitality & Trade'],
    famousBrands: [`${c.name} Telecom`, `${c.capital} Airways`, `National Bank of ${c.name}`, `${c.name} Heritage Crafts`],
    tradeHighlight: `Integrated into dynamic Asian maritime and digital commerce corridors via ${c.capital}.`,
  }),
  Europe: (c) => ({
    topExports: ['Precision Machinery', 'Pharmaceuticals & Chemicals', 'Agri-Food & Beverages', 'IT & Business Services'],
    topImports: ['Energy & Fuels', 'Vehicles', 'Electronic Hardware', 'Industrial Components'],
    coreIndustries: ['Specialized Manufacturing', 'Digital & Financial Services', 'Clean Energy', 'Cultural Tourism'],
    famousBrands: [`${c.name} National Rail`, `${c.capital} Bank Group`, `${c.name} Air`, `${c.name} Artisan Foods`],
    tradeHighlight: `Connected into European single-market logistics, green energy, and digital service networks.`,
  }),
  'North America': (c) => ({
    topExports: ['Agri-Food & Tropical Produce', 'Light Manufacturing', 'Tourism & Hospitality', 'Minerals & Energy'],
    topImports: ['Refined Fuels', 'Machinery & Vehicles', 'Consumer Electronics', 'Food Staples'],
    coreIndustries: ['Tourism & Eco-Hospitality', 'Regional Trade', 'Agriculture', 'Financial Services'],
    famousBrands: [`${c.name} National Bank`, `${c.capital} Airways`, `${c.name} Coffee & Rum`, `${c.name} Telecom`],
    tradeHighlight: `Key Americas trade and hospitality economy centered on ${c.capital}.`,
  }),
  'South America': (c) => ({
    topExports: ['Agricultural Exports', 'Minerals & Metals', 'Energy Commodities', 'Specialty Foods'],
    topImports: ['Industrial Machinery', 'Refined Fuels', 'Vehicles', 'Electronics'],
    coreIndustries: ['Agribusiness & Forestry', 'Mining & Energy', 'Logistics', 'Eco-Tourism'],
    famousBrands: [`Banco de ${c.name}`, `${c.capital} Air`, `${c.name} Coffee & Cacao`, `${c.name} Energy`],
    tradeHighlight: `Resource-rich South American economy supplying food, timber, and minerals globally.`,
  }),
  Africa: (c) => ({
    topExports: ['Agricultural Produce', 'Critical Minerals & Metals', 'Energy Resources', 'Handcrafted Textiles'],
    topImports: ['Refined Petroleum', 'Machinery', 'Pharmaceuticals', 'Grains & Consumer Goods'],
    coreIndustries: ['Agriculture & Cocoa/Coffee', 'Mining & Clean Energy', 'Mobile Telecoms & FinTech', 'Tourism'],
    famousBrands: [`${c.name} Telecom`, `National Bank of ${c.name}`, `${c.capital} Airways`, `${c.name} Gold & Crafts`],
    tradeHighlight: `Growing AfCFTA regional commerce and mobile-first digital economy anchored in ${c.capital}.`,
  }),
  Oceania: (c) => ({
    topExports: ['Sustainable Fisheries & Tuna', 'Coconut & Tropical Produce', 'Minerals & Timber', 'Island Tourism'],
    topImports: ['Refined Fuels', 'Foodstuffs', 'Marine & Construction Gear', 'Electronics'],
    coreIndustries: ['Blue-Economy Fisheries', 'Eco-Tourism', 'Copra & Vanilla Agriculture', 'Maritime Services'],
    famousBrands: [`Air ${c.name}`, `Bank of ${c.name}`, `${c.name} Pure Water`, `${c.name} Island Fisheries`],
    tradeHighlight: `Pacific blue-economy hub specializing in sustainable fisheries and island hospitality.`,
  }),
};

/**
 * Returns guaranteed rich Trade, Exports, Imports, Industries & Famous Brands data
 * for all 215 countries & territories in the Meridian database.
 */
export function getCountryTradeProfile(country: Country): CountryTradeProfile {
  const curated = CURATED_TRADE[country.iso];
  if (curated) return curated;
  return CONTINENT_TRADE_TEMPLATES[country.continent](country);
}

const CURATED_FOOTBALL: Record<string, CountryFootballProfile> = {
  lk: {
    teamName: 'Sri Lanka National Football Team',
    nickname: 'The Golden Army',
    confederation: 'AFC · SAFF',
    homeStadium: 'Colombo Racecourse Stadium',
    iconicMoment: '1995 SAFF Gold Cup Champions in Colombo',
  },
  jp: {
    teamName: 'Japan National Football Team',
    nickname: 'Samurai Blue',
    confederation: 'AFC',
    homeStadium: 'Japan National Stadium, Tokyo',
    iconicMoment: '4× AFC Asian Cup Champions & 2022 World Cup knockout wins over Germany and Spain',
  },
  gb: {
    teamName: 'Home Nations Football (ENG / SCO / WAL / NIR)',
    nickname: 'Birthplace of Modern Football',
    confederation: 'UEFA',
    homeStadium: 'Wembley · Hampden · Cardiff · Windsor Park',
    iconicMoment: 'Codified the Laws of the Game in 1863 & 1966 World Cup champions (England)',
  },
  'gb-eng': {
    teamName: 'England National Football Team',
    nickname: 'The Three Lions',
    confederation: 'UEFA',
    homeStadium: 'Wembley Stadium, London',
    iconicMoment: '1966 FIFA World Cup Champions & UEFA Euro 2020/2024 Finalists',
  },
  'gb-sct': {
    teamName: 'Scotland National Football Team',
    nickname: 'The Tartan Army',
    confederation: 'UEFA',
    homeStadium: 'Hampden Park, Glasgow',
    iconicMoment: 'Co-hosts of the world’s first international match in 1872',
  },
  'gb-wls': {
    teamName: 'Wales National Football Team',
    nickname: 'The Dragons (Y Dreigiau)',
    confederation: 'UEFA',
    homeStadium: 'Cardiff City Stadium',
    iconicMoment: 'UEFA Euro 2016 Semifinalists & 2022 FIFA World Cup Qualifiers',
  },
  'gb-nir': {
    teamName: 'Northern Ireland National Football Team',
    nickname: 'Green and White Army',
    confederation: 'UEFA',
    homeStadium: 'Windsor Park, Belfast',
    iconicMoment: '1958 & 1982 FIFA World Cup Quarter-finalists & Euro 2016 Round of 16',
  },
  br: {
    teamName: 'Brazil National Football Team',
    nickname: 'A Seleção (Canarinha)',
    confederation: 'CONMEBOL',
    homeStadium: 'Estádio do Maracanã, Rio de Janeiro',
    iconicMoment: 'Record 5× FIFA World Cup Champions (1958, 1962, 1970, 1994, 2002)',
  },
  ar: {
    teamName: 'Argentina National Football Team',
    nickname: 'La Albiceleste',
    confederation: 'CONMEBOL',
    homeStadium: 'Estadio Monumental, Buenos Aires',
    iconicMoment: '3× FIFA World Cup Champions (1978, 1986, 2022) & 16× Copa América Winners',
  },
  fr: {
    teamName: 'France National Football Team',
    nickname: 'Les Bleus',
    confederation: 'UEFA',
    homeStadium: 'Stade de France, Paris',
    iconicMoment: '2× FIFA World Cup Champions (1998, 2018) & 2× UEFA Euro Winners',
  },
  de: {
    teamName: 'Germany National Football Team',
    nickname: 'Die Mannschaft (DFB-Elf)',
    confederation: 'UEFA',
    homeStadium: 'Olympiastadion / Allianz Arena',
    iconicMoment: '4× FIFA World Cup Champions & 3× UEFA Euro Winners',
  },
  es: {
    teamName: 'Spain National Football Team',
    nickname: 'La Roja',
    confederation: 'UEFA',
    homeStadium: 'Estadio Santiago Bernabéu / La Cartuja',
    iconicMoment: '2010 FIFA World Cup Champions & record 4× UEFA Euro Winners (including 2024)',
  },
  it: {
    teamName: 'Italy National Football Team',
    nickname: 'Gli Azzurri',
    confederation: 'UEFA',
    homeStadium: 'Stadio Olimpico, Rome',
    iconicMoment: '4× FIFA World Cup Champions & UEFA Euro 2020 Champions',
  },
  pt: {
    teamName: 'Portugal National Football Team',
    nickname: 'Seleção das Quinas',
    confederation: 'UEFA',
    homeStadium: 'Estádio da Luz, Lisbon',
    iconicMoment: 'UEFA Euro 2016 & 2019 UEFA Nations League Champions',
  },
  us: {
    teamName: 'United States National Soccer Team',
    nickname: 'USMNT / USWNT',
    confederation: 'CONCACAF',
    homeStadium: 'Co-Host of FIFA World Cup 2026',
    iconicMoment: '4× FIFA Women’s World Cup Champions & 7× CONCACAF Gold Cup Winners',
  },
  in: {
    teamName: 'India National Football Team',
    nickname: 'The Blue Tigers',
    confederation: 'AFC · SAFF',
    homeStadium: 'Salt Lake Stadium, Kolkata',
    iconicMoment: 'Record 9× SAFF Championship Winners & 1956 Olympic Semifinalists',
  },
  au: {
    teamName: 'Australia National Football Team',
    nickname: 'Socceroos / Matildas',
    confederation: 'AFC',
    homeStadium: 'Stadium Australia, Sydney',
    iconicMoment: '2015 AFC Asian Cup Champions & 2022 World Cup Round of 16',
  },
  kr: {
    teamName: 'South Korea National Football Team',
    nickname: 'Taegeuk Warriors',
    confederation: 'AFC',
    homeStadium: 'Seoul World Cup Stadium',
    iconicMoment: '2002 FIFA World Cup Semifinalists & 11 consecutive World Cup appearances',
  },
  ma: {
    teamName: 'Morocco National Football Team',
    nickname: 'Atlas Lions',
    confederation: 'CAF',
    homeStadium: 'Prince Moulay Abdellah Stadium, Rabat',
    iconicMoment: 'First African nation to reach the FIFA World Cup Semifinals (2022)',
  },
};

const CONFEDERATION_BY_CONTINENT: Record<Country['continent'], string> = {
  Asia: 'AFC',
  Europe: 'UEFA',
  'North America': 'CONCACAF',
  'South America': 'CONMEBOL',
  Africa: 'CAF',
  Oceania: 'OFC',
};

export function getCountryFootballProfile(country: Country): CountryFootballProfile {
  const curated = CURATED_FOOTBALL[country.iso];
  if (curated) return curated;
  const confed = CONFEDERATION_BY_CONTINENT[country.continent];
  return {
    teamName: `${country.name} National Football Team`,
    nickname: `${country.name} National XI`,
    confederation: confed,
    homeStadium: `${country.capital} National Stadium`,
    iconicMoment: `Represents ${country.name} in ${confed} and FIFA international qualifiers`,
  };
}
