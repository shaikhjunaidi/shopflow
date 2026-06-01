const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const importController = require("../controllers/importController");
const { auth } = require("../middleware/auth");

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and image files are allowed"), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// Routes
router.post("/upload", auth, upload.single("pdf"), importController.uploadAndParsePdf);
router.post("/confirm", auth, importController.confirmImport);
router.post("/:id/approve", auth, importController.approveImport);
router.get("/history", auth, importController.getImportHistory);

module.exports = router;
