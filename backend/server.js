import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://riki:riki@cluster0.ouqklmc.mongodb.net/health-record?retryWrites=true&w=majority";

// PERBAIKAN: Cached connection untuk serverless (Vercel)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Connection function yang optimized untuk serverless
async function connectDB() {
  if (cached.conn) {
    console.log("✅ Using cached MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 10000,
    };

    console.log("🔄 Creating new MongoDB connection...");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("✅ MongoDB Connected Successfully");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("❌ MongoDB connection failed:", e.message);
    throw e;
  }

  return cached.conn;
}

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

const Record = mongoose.models.Record || mongoose.model("Record", RecordSchema);

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

// Middleware untuk connect database di setiap request (serverless)
const ensureDB = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: "Database connection failed",
      message: error.message,
      databaseStatus: mongoose.connection.readyState,
      databaseStatusText: getDBStatusText(mongoose.connection.readyState),
    });
  }
};

// GET semua data
app.get("/api/records", ensureDB, async (req, res) => {
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
app.post("/api/records", ensureDB, async (req, res) => {
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
app.put("/api/records/:id", ensureDB, async (req, res) => {
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
app.delete("/api/records/:id", ensureDB, async (req, res) => {
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
app.delete("/api/records", ensureDB, async (req, res) => {
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

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    await connectDB();
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
    });
  } catch (error) {
    res.status(503).json({
      status: "Unhealthy",
      message: "Server is running but database connection failed",
      error: error.message,
      database: {
        status: "Error",
        code: mongoose.connection.readyState,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Handle root path
app.get("/", async (req, res) => {
  try {
    await connectDB();
    const dbStatus = mongoose.connection.readyState;

    res.json({
      message: "Health Record API is running!!!",
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
  } catch (error) {
    res.json({
      message: "Health Record API is running (database connection pending)",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Handle 404 routes
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

// Start server (untuk local development)
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, async () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    try {
      await connectDB();
      console.log(`📊 Database status: ${getDBStatusText(mongoose.connection.readyState)}`);
    } catch (error) {
      console.log(`❌ Database connection failed: ${error.message}`);
    }
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📍 API Root: http://localhost:${PORT}/`);
  });
}

export default app;
