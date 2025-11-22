import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
const MONGODB_URI = "mongodb+srv://riki:riki@cluster0.ouqklmc.mongodb.net/health-record?retryWrites=true&w=majority";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err));

// ---- Schema ----
const RecordSchema = new mongoose.Schema(
  {
    nama: String,
    bn: String,
    umur: Number,
    jabatan: String,
    supervisor: String,
    dept: String,
    systolic: Number,
    diastolic: Number,
    nadi: Number,
    spo2: Number,
    suhu: Number,
    tanggal: String,
    time: String,
    color: String,
    fitness: String,
  },
  {
    timestamps: true,
  }
);

const Record = mongoose.model("Record", RecordSchema);

// ---- API Routes ----

// GET semua data
app.get("/api/records", async (req, res) => {
  try {
    const records = await Record.find().sort({ _id: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST tambah data
app.post("/api/records", async (req, res) => {
  try {
    const record = new Record(req.body);
    await record.save();
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update data
app.put("/api/records/:id", async (req, res) => {
  try {
    const record = await Record.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE satu data
app.delete("/api/records/:id", async (req, res) => {
  try {
    await Record.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE semua data
app.delete("/api/records", async (req, res) => {
  try {
    await Record.deleteMany({});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Handle root path
app.get("/", (req, res) => {
  res.json({ message: "Health Record API is running!" });
});

// Export the Express API
export default app;
