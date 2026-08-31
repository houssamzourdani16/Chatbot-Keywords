import "server-only";
import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    label: {
      type: String,
      default: "",
    },
    group: {
      type: String,
      default: "general",
    },
  },
  {
    timestamps: true,
  },
);

const Setting =
  mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
export default Setting;
