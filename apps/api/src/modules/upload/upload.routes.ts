import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});

router.post('/', upload.single('file'), (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Dosya yüklenemedi.' });
  }

  const host = req.get('host');
  const protocol = req.protocol;
  const fileUrl = `${protocol}://${host}/api/uploads/${req.file.filename}`;

  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    savedName: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

export default router;
