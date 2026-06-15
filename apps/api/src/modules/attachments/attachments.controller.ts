import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// GET /api/files/:fileId/attachments
export const getAttachments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const attachments = await prisma.attachment.findMany({
      where: { fileId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(attachments);
  } catch (error) {
    next(error);
  }
};

// POST /api/files/:fileId/attachments
export const createAttachment = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    if (!req.file) {
      res.status(400);
      throw new Error('Dosya yüklenemedi.');
    }

    const fileExists = await prisma.devFile.findUnique({
      where: { id: fileId }
    });
    if (!fileExists) {
      res.status(404);
      throw new Error('Not bulunamadı.');
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/api/uploads/${req.file.filename}`;

    const attachment = await prisma.attachment.create({
      data: {
        id: crypto.randomUUID(),
        fileId,
        name: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

    res.status(201).json(attachment);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/attachments/:id
export const deleteAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      res.status(404);
      throw new Error('Eklenti bulunamadı.');
    }

    const filename = path.basename(attachment.url);
    const filePath = path.join(__dirname, '../../../uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.attachment.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
