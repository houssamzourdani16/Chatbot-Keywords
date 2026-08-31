// lib/services/lead-service.js
import "server-only";
import dbConnect from "@/lib/database/database";
import Lead from "@/lib/models/lead";

/**
 * ============================================
 * ✅ LEAD DETECTION SERVICE
 * ============================================
 *
 * Automatically detects lead information from customer messages:
 *  - Name, Phone, Email, Address, Product Interest, Quantity, Budget
 *  - Computes a confidence score based on info completeness
 *  - Creates/updates a Lead record per (customer, product)
 */

// Regex patterns for extracting lead info
const PATTERNS = {
  // Phone: 0555 123 456, +213 555 123 456, 0555123456
  phone: /(?:\+?\d{2,3}[\s.-]?)?0\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}/g,
  // Email
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Quantity: "2 pieces", "3 kg", "5 items", "nchri 2", "bghit 3"
  quantity:
    /(\d+)\s*(?:pieces?|kg|items?|units?|pcs|kilos?|كيلو|حبات|قطع)|(?:nchri|bghit|want|need|acheter|achter)\s+(\d+)/gi,
  // Budget: "5000 DZD", "5000 da", "5000 دج", "5000 dinars"
  budget: /(\d[\d\s.,]*)\s*(?:dzd|da|dinars?|دج|دينار|dh|mad)/gi,
  // Name: "ana smiti X", "ismi X", "my name is X", "je m'appelle X"
  name: /(?:ana smiti|ismi|my name is|je m'appelle|je suis)\s+([A-Za-z\u0600-\u06FF\s'-]{2,30})/i,
  // Address: "n3ich f X", "ana men X", "I live in X", "j'habite à X"
  address:
    /(?:n3ich f|ana men|i live in|j'habite à|j'habite a|from)\s+([A-Za-z\u0600-\u06FF\s'-]{2,30})/i,
};

// Common Darija interest keywords
const INTEREST_KEYWORDS = [
  "pizza",
  "burger",
  "sandwich",
  "tacos",
  "poulet",
  "chicken",
  "couscous",
  "tajine",
  "salade",
  "jus",
  "cafe",
  "coffee",
  "the",
  "tea",
  "gâteau",
  "cake",
  "robe",
  "hijab",
  "chaussure",
  "shoes",
  "sac",
  "bag",
  "montre",
  "watch",
  "téléphone",
  "phone",
  "ordinateur",
  "laptop",
];

/**
 * Extract lead info from a message text.
 * Returns { extracted_data, confidence_score }
 */
export function extractLeadInfo(message) {
  if (!message) {
    return { extracted_data: emptyData(), confidence_score: 0 };
  }

  const text = message.toLowerCase();
  const data = emptyData();

  // Phone
  const phoneMatch = text.match(PATTERNS.phone);
  if (phoneMatch) data.phone = phoneMatch[0].trim();

  // Email
  const emailMatch = text.match(PATTERNS.email);
  if (emailMatch) data.email = emailMatch[0].trim();

  // Quantity
  const qtyMatch = text.match(PATTERNS.quantity);
  if (qtyMatch) {
    const num = qtyMatch[0].match(/\d+/);
    if (num) data.quantity = parseInt(num[0]);
  }

  // Budget
  const budgetMatch = text.match(PATTERNS.budget);
  if (budgetMatch) {
    const num = budgetMatch[0].match(/\d[\d\s.,]*/);
    if (num) data.budget = parseInt(num[0].replace(/[\s.,]/g, ""));
  }

  // Name
  const nameMatch = text.match(PATTERNS.name);
  if (nameMatch) data.name = nameMatch[1].trim();

  // Address
  const addressMatch = text.match(PATTERNS.address);
  if (addressMatch) data.address = addressMatch[1].trim();

  // Interest (check for known keywords)
  for (const kw of INTEREST_KEYWORDS) {
    if (text.includes(kw)) {
      data.interest = kw;
      break;
    }
  }

  // Compute confidence score
  const confidence_score = computeConfidence(data);

  return { extracted_data: data, confidence_score };
}

/**
 * Compute a confidence score (0-100) based on how many fields are filled.
 */
function computeConfidence(data) {
  const fields = [
    data.name,
    data.phone,
    data.email,
    data.address,
    data.interest,
    data.quantity,
    data.budget,
  ];
  const filled = fields.filter((f) => f !== "" && f !== 0 && f !== null).length;
  return Math.round((filled / fields.length) * 100);
}

function emptyData() {
  return {
    name: "",
    phone: "",
    email: "",
    address: "",
    interest: "",
    quantity: 0,
    budget: 0,
  };
}

/**
 * Process a conversation and create/update a lead.
 * Returns the lead if created/updated, or null if no lead info found.
 */
export async function processLeadDetection({
  user_id,
  product_id,
  customer_id,
  conversation,
  message_id = null,
}) {
  try {
    await dbConnect();

    // Join all messages into one text
    const fullText = conversation.map((c) => c.message || "").join(" ");

    // Extract lead info
    const { extracted_data, confidence_score } = extractLeadInfo(fullText);

    // Only create a lead if we found at least some info
    const hasInfo = Object.values(extracted_data).some(
      (v) => v !== "" && v !== 0,
    );

    if (!hasInfo) return null;

    // Upsert the lead (unique on customer_id + product_id)
    const lead = await Lead.findOneAndUpdate(
      { customer_id, product_id },
      {
        $set: {
          user_id,
          message_id,
          extracted_data,
          confidence_score,
          raw_conversation: conversation,
        },
        $setOnInsert: { status: "new" },
      },
      { new: true, upsert: true },
    );

    return lead;
  } catch (error) {
    console.error("❌ Lead detection error:", error.message);
    return null;
  }
}

/**
 * Get all leads for a user, optionally filtered by product/status.
 */
export async function getLeadsForUser(user_id, { product_id, status } = {}) {
  await dbConnect();
  const query = { user_id };
  if (product_id) query.product_id = product_id;
  if (status) query.status = status;

  return Lead.find(query).sort({ createdAt: -1 }).lean();
}

/**
 * Update a lead's status.
 */
export async function updateLeadStatus(lead_id, status) {
  await dbConnect();
  return Lead.findByIdAndUpdate(lead_id, { status }, { new: true }).lean();
}
