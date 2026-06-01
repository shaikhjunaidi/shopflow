const express = require("express");
const multer = require("multer");
const path = require("path");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Use memory storage to bypass Render's ephemeral disk wipes
// and store images directly as base64 in the database
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max to prevent huge DB payloads
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (jpeg, jpg, png, webp, gif) are allowed!"));
    }
  }
});

// Single image upload route
router.post("/", auth, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Convert file buffer to base64 Data URI
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    res.status(200).json({
      message: "Image processed successfully",
      url: base64Image
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to process image" });
  }
});

module.exports = router;
