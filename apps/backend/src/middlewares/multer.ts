import multer from "multer";
import path from "path";

// Store files locally for now in uploads later upgrade if needed
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); //cb is callback and first is null if error happens null gets passed else file path
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); //extname is extension format like pdf
  },
});

export const upload = multer({ storage });
