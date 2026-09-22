export interface InitialPageData {
  pageId: string;
  name: string;
  category: string;
  businessName?: string;
  avatarUrl: string;
  accessToken: string;
}

export interface InitialLeadData {
  pageId: string;
  psid: string;
  customerName: string;
  customerAvatar: string;
  adSource: string;
  lastCustomerMessage: string;
  lastCustomerMessageHoursAgo: number;
  lastAgentMessage: string;
  lastAgentMessageHoursAgo: number;
  status: string;
  followUpCount?: number;
  repliedAfterStep?: number;
  firstFollowedUpHoursAgo?: number;
  secondFollowedUpHoursAgo?: number;
}

export const INITIAL_PAGES: InitialPageData[] = [
  // --- Business A: SieLab Retail Group (4 Facebook Pages) ---
  {
    pageId: "fb_page_01",
    name: "SieLab Fashion & Streetwear",
    category: "Clothing Brand & Apparel",
    businessName: "SieLab Retail Group",
    avatarUrl: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=150&auto=format&fit=crop&q=80",
    accessToken: "EAAB_mock_token_sielab_fashion_live_01",
  },
  {
    pageId: "fb_page_02",
    name: "SieLab Electronics & Gadgets",
    category: "Consumer Electronics & Tech",
    businessName: "SieLab Retail Group",
    avatarUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=150&auto=format&fit=crop&q=80",
    accessToken: "EAAB_mock_token_sielab_electronics_live_02",
  },
  {
    pageId: "fb_page_03",
    name: "SieLab Beauty & Skin Care",
    category: "Health & Organic Cosmetics",
    businessName: "SieLab Retail Group",
    avatarUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150&auto=format&fit=crop&q=80",
    accessToken: "EAAB_mock_token_sielab_beauty_live_03",
  },
  {
    pageId: "fb_page_04",
    name: "SieLab Home & Kitchen Decor",
    category: "Home & Interior Design",
    businessName: "SieLab Retail Group",
    avatarUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=150&auto=format&fit=crop&q=80",
    accessToken: "EAAB_mock_token_sielab_home_live_04",
  },

  // --- Business B: Moew Specialty Cafe & Lounge (1 Facebook Page) ---
  {
    pageId: "fb_page_05",
    name: "Moew Specialty Cafe & Lounge",
    category: "Specialty Coffee & Artisan Bakery",
    businessName: "Moew Hospitality",
    avatarUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=150&auto=format&fit=crop&q=80",
    accessToken: "EAAB_mock_token_moew_cafe_live_05",
  },
];

export const INITIAL_LEADS: InitialLeadData[] = [
  // Page 1: SieLab Fashion
  {
    pageId: "fb_page_01",
    psid: "psid_fashion_01",
    customerName: "Sophea Meng",
    customerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #101: Oversized Vintage Hoodie (40% OFF)",
    lastCustomerMessage: "Hi, do you have size L available in black?",
    lastCustomerMessageHoursAgo: 26.5,
    lastAgentMessage: "Hello Sophea! Yes, black in size L is in stock. Would you like me to reserve one for your order today?",
    lastAgentMessageHoursAgo: 26.0,
    status: "AWAITING_CUSTOMER",
  },
  {
    pageId: "fb_page_01",
    psid: "psid_fashion_02",
    customerName: "David Chen",
    customerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #102: Denim Streetwear Jacket Collection",
    lastCustomerMessage: "How long does shipping take to Phnom Penh / Bangkok?",
    lastCustomerMessageHoursAgo: 18.2,
    lastAgentMessage: "Hi David! Standard shipping takes 2-3 business days. We also offer express 24h delivery! Should we proceed with an invoice?",
    lastAgentMessageHoursAgo: 17.8,
    status: "AWAITING_CUSTOMER",
  },
  {
    pageId: "fb_page_01",
    psid: "psid_fashion_03",
    customerName: "Jessica Taylor",
    customerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #103: Autumn Urban Trench Coat Promo",
    lastCustomerMessage: "Can I pay via cash on delivery (COD)?",
    lastCustomerMessageHoursAgo: 8.5,
    lastAgentMessage: "Yes absolutely Jessica! COD is supported nationwide with free delivery for orders above $35. Which color do you prefer?",
    lastAgentMessageHoursAgo: 8.0,
    status: "AWAITING_CUSTOMER",
  },

  // Page 2: SieLab Electronics
  {
    pageId: "fb_page_02",
    psid: "psid_electro_01",
    customerName: "Rithy Seng",
    customerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #201: ANC Wireless Earbuds with 40h Battery",
    lastCustomerMessage: "Is there any warranty included with these earbuds?",
    lastCustomerMessageHoursAgo: 25.0,
    lastAgentMessage: "Hello Rithy! All our ANC earbuds come with a 1-year official replacement warranty. Can I send you the checkout link?",
    lastAgentMessageHoursAgo: 24.6,
    status: "AWAITING_CUSTOMER",
  },
  {
    pageId: "fb_page_02",
    psid: "psid_electro_02",
    customerName: "Marcus Vance",
    customerAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #202: Ultra-Fast Magnetic Wireless Power Bank",
    lastCustomerMessage: "Does it support iPhone 15 & 16 fast charging?",
    lastCustomerMessageHoursAgo: 14.3,
    lastAgentMessage: "Hi Marcus! Yes, full 20W PD fast charge and Qi2 compatible. We have 10 units left at the promo price. Want to grab one?",
    lastAgentMessageHoursAgo: 13.9,
    status: "AWAITING_CUSTOMER",
  },
  {
    pageId: "fb_page_02",
    psid: "psid_electro_03",
    customerName: "Linda K.",
    customerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #203: Smartwatch Pro Fitness Tracker",
    lastCustomerMessage: "Do you have the rose gold color?",
    lastCustomerMessageHoursAgo: 3.5,
    lastAgentMessage: "Hi Linda! Rose gold is available and currently on discount for $49. Would you like to see live photos of the watch?",
    lastAgentMessageHoursAgo: 3.0,
    status: "AWAITING_CUSTOMER",
  },

  // Page 3: SieLab Beauty
  {
    pageId: "fb_page_03",
    psid: "psid_beauty_01",
    customerName: "Bopha Srun",
    customerAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #301: Hydrating Vitamin C Serum Duo Pack",
    lastCustomerMessage: "Is this suitable for sensitive acne-prone skin?",
    lastCustomerMessageHoursAgo: 27.2,
    lastAgentMessage: "Hello Bopha! It is 100% dermatologist tested and alcohol-free, great for sensitive skin. We have a buy 1 get 1 free promotion right now!",
    lastAgentMessageHoursAgo: 26.8,
    status: "AWAITING_CUSTOMER",
  },
  {
    pageId: "fb_page_03",
    psid: "psid_beauty_02",
    customerName: "Chloe Dupont",
    customerAvatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #302: Sunscreen SPF50+ Ultra Light Texture",
    lastCustomerMessage: "Does it leave a white cast?",
    lastCustomerMessageHoursAgo: 11.5,
    lastAgentMessage: "Hi Chloe! Zero white cast, it has an invisible matte finish. Would you like to add it to your cart?",
    lastAgentMessageHoursAgo: 11.0,
    status: "AWAITING_CUSTOMER",
  },

  // Page 4: SieLab Home
  {
    pageId: "fb_page_04",
    psid: "psid_home_01",
    customerName: "Vannak Lim",
    customerAvatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #401: Minimalist Nordic Ceramic Lamp",
    lastCustomerMessage: "How much is this lamp and what voltage does it use?",
    lastCustomerMessageHoursAgo: 22.1,
    lastAgentMessage: "Hi Vannak! It is $29 with dual 110V/220V adapter included. Can we arrange delivery to your address?",
    lastAgentMessageHoursAgo: 21.6,
    status: "AWAITING_CUSTOMER",
  },
  {
    pageId: "fb_page_04",
    psid: "psid_home_02",
    customerName: "Sarah Jenkins",
    customerAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #402: Stainless Steel French Press Coffee Set",
    lastCustomerMessage: "Is it dishwasher safe?",
    lastCustomerMessageHoursAgo: 6.2,
    lastAgentMessage: "Hi Sarah! Yes, 100% dishwasher safe 304 food-grade stainless steel. May I prepare an order for you?",
    lastAgentMessageHoursAgo: 5.8,
    status: "AWAITING_CUSTOMER",
  },

  // Business B: Moew Specialty Cafe & Lounge (1 Facebook Page)
  {
    pageId: "fb_page_05",
    psid: "psid_cafe_01",
    customerName: "Alex Rivera",
    customerAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #501: Weekend Artisan Brunch & Garden Terrace Table Booking",
    lastCustomerMessage: "Do you take brunch table reservations for 6 people this Sunday morning?",
    lastCustomerMessageHoursAgo: 23.4,
    lastAgentMessage: "Hi Alex! Yes, our garden terrace has slots at 10:30 AM and 12:30 PM. Would you like me to hold a 6-seat table for you?",
    lastAgentMessageHoursAgo: 23.0,
    status: "AWAITING_CUSTOMER",
  },
  {
    pageId: "fb_page_05",
    psid: "psid_cafe_02",
    customerName: "Emily Zhao",
    customerAvatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #502: Handcrafted Basque Burnt Cheesecake & Custom Pastries",
    lastCustomerMessage: "Do you make whole 8-inch Basque cheesecakes for birthday parties with custom plaques?",
    lastCustomerMessageHoursAgo: 16.0,
    lastAgentMessage: "Yes Emily! Our pastry chef bakes whole cheesecakes with custom chocolate message plaques with 24h pre-order. When is the birthday?",
    lastAgentMessageHoursAgo: 15.5,
    status: "AWAITING_CUSTOMER",
  },
  {
    pageId: "fb_page_05",
    psid: "psid_cafe_03",
    customerName: "Samnang Ouk",
    customerAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #503: Corporate Cold Brew Delivery & Office Catering Packs",
    lastCustomerMessage: "Can you deliver 20 bottles of vanilla cold brew to Vattanac Tower today?",
    lastCustomerMessageHoursAgo: 30.0,
    lastAgentMessage: "Hi Samnang! We can dispatch with our express courier within 2 hours. What time would you like delivery?",
    lastAgentMessageHoursAgo: 29.5,
    status: "FOLLOWED_UP",
    followUpCount: 1,
    firstFollowedUpHoursAgo: 5.0,
  },
  // Additional leads with real recoveries across all pages:
  // Page 1: SieLab Fashion
  {
    pageId: "fb_page_01",
    psid: "psid_fashion_04_resp1",
    customerName: "Chan Dara",
    customerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #101: Oversized Vintage Hoodie (40% OFF)",
    lastCustomerMessage: "Thanks for checking in! Yes, please reserve black in size L. Where should I transfer the deposit?",
    lastCustomerMessageHoursAgo: 2.1,
    lastAgentMessage: "Hello! We noticed you were interested in our vintage hoodie.",
    lastAgentMessageHoursAgo: 4.5,
    status: "REPLIED",
    followUpCount: 1,
    repliedAfterStep: 1,
    firstFollowedUpHoursAgo: 3.0,
  },
  {
    pageId: "fb_page_01",
    psid: "psid_fashion_05_resp2",
    customerName: "Srey Leak",
    customerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #102: Denim Streetwear Jacket Collection",
    lastCustomerMessage: "The 20% discount convinced me! I'll take the Medium size. My phone number is 012-888-999.",
    lastCustomerMessageHoursAgo: 1.2,
    lastAgentMessage: "Hi Srey! Here is your exclusive 20% off voucher for today!",
    lastAgentMessageHoursAgo: 2.0,
    status: "REPLIED",
    followUpCount: 2,
    repliedAfterStep: 2,
    firstFollowedUpHoursAgo: 10.0,
    secondFollowedUpHoursAgo: 2.0,
  },
  // Page 2: SieLab Electronics
  {
    pageId: "fb_page_02",
    psid: "psid_electro_04_resp1",
    customerName: "Kenji Sato",
    customerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #201: ANC Wireless Earbuds with 40h Battery",
    lastCustomerMessage: "Great to know about the 1-year warranty! Send me the ABA Pay QR code.",
    lastCustomerMessageHoursAgo: 4.0,
    lastAgentMessage: "Hi Kenji, following up on your inquiry!",
    lastAgentMessageHoursAgo: 5.5,
    status: "REPLIED",
    followUpCount: 1,
    repliedAfterStep: 1,
    firstFollowedUpHoursAgo: 4.8,
  },
  {
    pageId: "fb_page_02",
    psid: "psid_electro_05_resp2",
    customerName: "Dara Pich",
    customerAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #202: Ultra-Fast Magnetic Wireless Power Bank",
    lastCustomerMessage: "Okay fine, with the free delivery coupon I will order 2 pieces. One black, one titanium grey.",
    lastCustomerMessageHoursAgo: 0.8,
    lastAgentMessage: "Exclusive VIP offer for you with free delivery!",
    lastAgentMessageHoursAgo: 1.5,
    status: "REPLIED",
    followUpCount: 2,
    repliedAfterStep: 2,
    firstFollowedUpHoursAgo: 8.0,
    secondFollowedUpHoursAgo: 1.5,
  },
  // Page 3: SieLab Beauty
  {
    pageId: "fb_page_03",
    psid: "psid_beauty_03_resp1",
    customerName: "Lisa Monroe",
    customerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #301: Hydrating Vitamin C Serum Duo Pack",
    lastCustomerMessage: "Buy 1 Get 1 still available? Yes please, send 2 bottles to BKK1!",
    lastCustomerMessageHoursAgo: 3.5,
    lastAgentMessage: "Hi Lisa, checking if you still want the serum promo!",
    lastAgentMessageHoursAgo: 5.0,
    status: "REPLIED",
    followUpCount: 1,
    repliedAfterStep: 1,
    firstFollowedUpHoursAgo: 4.2,
  },
  {
    pageId: "fb_page_03",
    psid: "psid_beauty_04_fu2",
    customerName: "Nary Heng",
    customerAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #302: Sunscreen SPF50+ Ultra Light Texture",
    lastCustomerMessage: "Can I use it under makeup?",
    lastCustomerMessageHoursAgo: 19.0,
    lastAgentMessage: "Step 2 reminder: Don't miss our summer beauty pack!",
    lastAgentMessageHoursAgo: 4.0,
    status: "FOLLOWED_UP",
    followUpCount: 2,
    firstFollowedUpHoursAgo: 12.0,
    secondFollowedUpHoursAgo: 4.0,
  },
  // Page 4: SieLab Home
  {
    pageId: "fb_page_04",
    psid: "psid_home_03_resp1",
    customerName: "Thierry Laurent",
    customerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #401: Minimalist Nordic Ceramic Lamp",
    lastCustomerMessage: "Can I get 2 lamps with warm white bulbs? Delivery to Toul Kork.",
    lastCustomerMessageHoursAgo: 2.8,
    lastAgentMessage: "Hi Thierry! Following up on the Nordic lamp.",
    lastAgentMessageHoursAgo: 4.0,
    status: "REPLIED",
    followUpCount: 1,
    repliedAfterStep: 1,
    firstFollowedUpHoursAgo: 3.5,
  },
  // Business B: Moew Specialty Cafe & Lounge (Page 5)
  {
    pageId: "fb_page_05",
    psid: "psid_cafe_04_resp2",
    customerName: "Brandon Lee",
    customerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    adSource: "Ad #504: Afternoon High Tea Set & Pastry Pairing for Two",
    lastCustomerMessage: "I see the follow-up voucher with 15% off high tea! Let's do it. Please book 2 persons for tomorrow 3 PM.",
    lastCustomerMessageHoursAgo: 1.5,
    lastAgentMessage: "Step 2: Hi Brandon! Don't miss our complimentary pastry pairing with your afternoon tea booking!",
    lastAgentMessageHoursAgo: 3.0,
    status: "REPLIED",
    followUpCount: 2,
    repliedAfterStep: 2,
    firstFollowedUpHoursAgo: 14.0,
    secondFollowedUpHoursAgo: 3.0,
  },
];
