import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection - PERBAIKAN: Hapus options yang deprecated
const MONGODB_URI = "mongodb+srv://riki:riki@cluster0.ouqklmc.mongodb.net/health-record?retryWrites=true&w=majority";

// Connection function yang lebih robust
const connectDB = async () => {
  try {
    console.log("🔄 Attempting to connect to MongoDB...");

    // PERBAIKAN: Hapus useNewUrlParser dan useUnifiedTopology (sudah tidak diperlukan di Mongoose 6+)
    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    };

    const conn = await mongoose.connect(MONGODB_URI, options);
    console.log("✅ MongoDB Connected Successfully");
    console.log(`📊 Host: ${conn.connection.host}`);
    console.log(`🗂️ Database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    // PERBAIKAN: Tambahkan error details yang lebih spesifik
    if (error.message.includes("authentication")) {
      console.error("🔐 Authentication failed - Check username/password");
    } else if (error.message.includes("ENOTFOUND")) {
      console.error("🌐 Cannot find MongoDB server - Check connection string");
    } else if (error.message.includes("network")) {
      console.error("📡 Network error - Check internet connection and firewall");
    }

    // Retry connection setelah 5 detik
    console.log("🔄 Retrying connection in 5 seconds...");
    setTimeout(connectDB, 5000);
    return false;
  }
};

// Initialize connection
connectDB();

// Event listeners untuk monitoring connection
mongoose.connection.on("connected", () => {
  console.log("✅ Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.log("❌ Mongoose connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.log("🔌 Mongoose disconnected from MongoDB");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔁 Mongoose reconnected to MongoDB");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down gracefully...");
  await mongoose.connection.close();
  console.log("✅ MongoDB connection closed.");
  process.exit(0);
});

// ---- Schema ----
const RecordSchema = new mongoose.Schema(
  {
    nama: {
      type: String,
      required: true,
    },
    bn: {
      type: String,
      required: true,
    },
    umur: {
      type: Number,
      required: true,
    },
    jabatan: {
      type: String,
      required: true,
    },
    supervisor: {
      type: String,
      required: true,
    },
    dept: {
      type: String,
      required: true,
    },
    systolic: {
      type: Number,
      required: true,
    },
    diastolic: {
      type: Number,
      required: true,
    },
    nadi: {
      type: Number,
      required: true,
    },
    spo2: {
      type: Number,
      required: true,
    },
    suhu: {
      type: Number,
      required: true,
    },
    tanggal: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    fitness: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Record = mongoose.model("Record", RecordSchema);

// ---- API Routes ----

// Helper function untuk status database
const getDBStatusText = (status) => {
  switch (status) {
    case 0:
      return "Disconnected";
    case 1:
      return "Connected";
    case 2:
      return "Connecting";
    case 3:
      return "Disconnecting";
    default:
      return "Unknown";
  }
};

// Middleware untuk check database connection
const checkDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database not connected",
      message: "Please try again in a few seconds",
      databaseStatus: mongoose.connection.readyState,
      databaseStatusText: getDBStatusText(mongoose.connection.readyState),
    });
  }
  next();
};

// GET semua data
app.get("/api/records", checkDB, async (req, res) => {
  try {
    const records = await Record.find().sort({ _id: -1 });
    res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error("Error in GET /api/records:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      databaseStatus: mongoose.connection.readyState,
    });
  }
});

// POST tambah data
app.post("/api/records", checkDB, async (req, res) => {
  try {
    // Validasi data required
    const requiredFields = ["nama", "bn", "umur", "jabatan", "supervisor", "dept", "systolic", "diastolic", "nadi", "spo2", "suhu", "tanggal", "time", "color", "fitness"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const record = new Record(req.body);
    await record.save();
    res.json({
      success: true,
      message: "Record created successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error in POST /api/records:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      databaseStatus: mongoose.connection.readyState,
    });
  }
});

// PUT update data
app.put("/api/records/:id", checkDB, async (req, res) => {
  try {
    const record = await Record.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: "Record not found",
      });
    }

    res.json({
      success: true,
      message: "Record updated successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error in PUT /api/records:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      databaseStatus: mongoose.connection.readyState,
    });
  }
});

// DELETE satu data
app.delete("/api/records/:id", checkDB, async (req, res) => {
  try {
    const record = await Record.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: "Record not found",
      });
    }

    res.json({
      success: true,
      message: "Record deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/records:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      databaseStatus: mongoose.connection.readyState,
    });
  }
});

// DELETE semua data
app.delete("/api/records", checkDB, async (req, res) => {
  try {
    const result = await Record.deleteMany({});
    res.json({
      success: true,
      message: `All records (${result.deletedCount}) deleted successfully`,
    });
  } catch (error) {
    console.error("Error in DELETE /api/records:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      databaseStatus: mongoose.connection.readyState,
    });
  }
});

// Health check endpoint yang lebih detail
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusText = getDBStatusText(dbStatus);

  res.json({
    status: dbStatus === 1 ? "Healthy" : "Unhealthy",
    message: "Server is running",
    database: {
      status: statusText,
      code: dbStatus,
      connectionString: MONGODB_URI ? "Configured" : "Not configured",
    },
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Handle root path
app.get("/", (req, res) => {
  const dbStatus = mongoose.connection.readyState;

  res.json({
    message: "Health Record API is running!!",
    database: getDBStatusText(dbStatus),
    databaseStatus: dbStatus,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      records: {
        getAll: "GET /api/records",
        create: "POST /api/records",
        update: "PUT /api/records/:id",
        delete: "DELETE /api/records/:id",
        deleteAll: "DELETE /api/records",
      },
    },
  });
});

// Handle 404 routes - PERBAIKAN: Ganti "*" dengan callback langsung
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: {
      root: "GET /",
      health: "GET /api/health",
      records: {
        getAll: "GET /api/records",
        create: "POST /api/records",
        update: "PUT /api/records/:id",
        delete: "DELETE /api/records/:id",
        deleteAll: "DELETE /api/records",
      },
    },
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: error.message,
  });
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📊 Database status: ${getDBStatusText(mongoose.connection.readyState)}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📍 API Root: http://localhost:${PORT}/`);
  });
};

// Tunggu connection database sebelum start server
if (mongoose.connection.readyState === 1) {
  startServer();
} else {
  mongoose.connection.once("connected", () => {
    startServer();
  });

  // Fallback: start server setelah 2 detik meski database belum connect
  setTimeout(() => {
    if (mongoose.connection.readyState !== 1) {
      console.log("⚠️ Starting server without database connection...");
      startServer();
    }
  }, 2000);
}

export default app;
