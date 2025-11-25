import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection dengan options yang diperbaiki
const MONGODB_URI = "mongodb+srv://riki:riki@cluster0.ouqklmc.mongodb.net/health-record?retryWrites=true&w=majority";

// Tambahkan connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  bufferCommands: false,
  bufferMaxEntries: 0,
};

mongoose
  .connect(MONGODB_URI, mongooseOptions)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => {
    console.log("MongoDB Connection Error:", err);
    console.log("MongoDB URI:", MONGODB_URI);
  });

// Handle mongoose connection events
mongoose.connection.on("error", (err) => {
  console.log("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

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

// GET semua data dengan error handling
app.get("/api/records", async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const records = await Record.find().sort({ _id: -1 });
    res.json(records);
  } catch (error) {
    console.error("Error in GET /api/records:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST tambah data
app.post("/api/records", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const record = new Record(req.body);
    await record.save();
    res.json({ success: true, data: record });
  } catch (error) {
    console.error("Error in POST /api/records:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update data
app.put("/api/records/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const record = await Record.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error("Error in PUT /api/records:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE satu data
app.delete("/api/records/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: "Database not connected" });
    }

    await Record.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/records:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE semua data
app.delete("/api/records", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: "Database not connected" });
    }

    await Record.deleteMany({});
    res.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/records:", error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint dengan status database
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  res.json({
    status: "OK",
    message: "Server is running",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Handle root path
app.get("/", (req, res) => {
  res.json({
    message: "Health Record API is running!!",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

// Export the Express API
export default app;
