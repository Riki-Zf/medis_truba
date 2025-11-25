import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection untuk production
const MONGODB_URI = "mongodb+srv://riki:riki@cluster0.ouqklmc.mongodb.net/health-record?retryWrites=true&w=majority";

// Connection function dengan handling khusus production
const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");

    // Untuk production, gunakan connection options yang lebih robust
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30 detik
      socketTimeoutMS: 45000, // 45 detik
      maxPoolSize: 10,
      minPoolSize: 1,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    // Retry connection setelah 5 detik
    console.log("Retrying connection in 5 seconds...");
    setTimeout(connectDB, 5000);
    return false;
  }
};

// Initialize connection
connectDB();

// Event listeners
mongoose.connection.on("connected", () => {
  console.log("✅ Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.log("❌ Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("🔌 Mongoose disconnected");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  process.exit(0);
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

// Middleware untuk check database connection
const checkDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database not connected",
      message: "Please try again in a few seconds",
      databaseStatus: mongoose.connection.readyState,
    });
  }
  next();
};

// GET semua data
app.get("/api/records", checkDB, async (req, res) => {
  try {
    const records = await Record.find().sort({ _id: -1 });
    res.json(records);
  } catch (error) {
    console.error("Error in GET /api/records:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST tambah data
app.post("/api/records", checkDB, async (req, res) => {
  try {
    const record = new Record(req.body);
    await record.save();
    res.json({ success: true, data: record });
  } catch (error) {
    console.error("Error in POST /api/records:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update data
app.put("/api/records/:id", checkDB, async (req, res) => {
  try {
    const record = await Record.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error("Error in PUT /api/records:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE satu data
app.delete("/api/records/:id", checkDB, async (req, res) => {
  try {
    await Record.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/records:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE semua data
app.delete("/api/records", checkDB, async (req, res) => {
  try {
    await Record.deleteMany({});
    res.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/records:", error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint yang lebih detail
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusText = dbStatus === 1 ? "Connected" : dbStatus === 2 ? "Connecting" : dbStatus === 3 ? "Disconnecting" : "Disconnected";

  res.json({
    status: "OK",
    message: "Server is running",
    database: statusText,
    databaseStatus: dbStatus,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Handle root path
app.get("/", (req, res) => {
  res.json({
    message: "Health Record API is running!!",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    environment: process.env.NODE_ENV || "development",
  });
});

// Export the Express API
export default app;
