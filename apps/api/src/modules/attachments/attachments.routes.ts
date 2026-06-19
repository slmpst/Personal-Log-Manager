import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as attachmentsController from './attachments.controller';

const router = Router();

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

// Attachment routes
router.get('/files/:fileId/attachments', attachmentsController.getAttachments);
router.post('/files/:fileId/attachments', upload.single('file'), attachmentsController.createAttachment);
router.delete('/attachments/:id', attachmentsController.deleteAttachment);

export default router;
