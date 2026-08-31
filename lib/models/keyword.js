import "server-only";
import mongoose from "mongoose";

const KeywordSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "Other",
    },
    language: {
      type: String,
      enum: ["Darija", "Arabic", "French", "English"],
      default: "Darija",
    },
    meaning: {
      type: String,
      default: "",
    },
    synonyms: {
      type: [String],
      default: [],
    },
    context: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    examples: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const Keyword =
  mongoose.models.Keyword || mongoose.model("Keyword", KeywordSchema);
export default Keyword;
