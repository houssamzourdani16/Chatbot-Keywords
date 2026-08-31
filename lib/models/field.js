// lib/models/field.js
import "server-only";
import mongoose from "mongoose";

const FieldSchema = new mongoose.Schema(
  {
    field_name: {
      type: String,
      required: true,
      unique: true,
    },
    field_label: {
      type: String,
      required: true,
    },
    field_type: {
      type: String,
      enum: [
        "text",
        "number",
        "dropdown",
        "checkbox",
        "date",
        "textarea",
        "image",
        "color",
      ],
      default: "text",
    },
    is_required: {
      type: Boolean,
      default: false,
    },
    is_visible: {
      type: Boolean,
      default: true,
    },
    sort_order: {
      type: Number,
      default: 0,
    },
    options: {
      type: [String],
      default: [],
    },
    default_value: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const Field = mongoose.models.Field || mongoose.model("Field", FieldSchema);
export default Field;
