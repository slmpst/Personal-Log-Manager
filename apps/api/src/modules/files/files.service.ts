import { prisma } from '../../db/prisma';
import { FileType } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const listProjectFiles = async (projectId: string) => {
  return prisma.devFile.findMany({
    where: { projectId },
    orderBy: [
      { pinned: 'desc' },
      { order: 'asc' },
    ],
  });
};

export const createFile = async (projectId: string, type: FileType, title: string) => {
  const maxOrderFile = await prisma.devFile.findFirst({
    where: { projectId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  const order = maxOrderFile ? maxOrderFile.order + 1 : 0;

  const id = crypto.randomUUID();

  return prisma.devFile.create({
    data: {
      id,
      projectId,
      type,
      title,
      content: '',
      order,
      pinned: false,
    },
  });
};

export const updateFile = async (
  id: string,
  data: { title?: string; content?: string; type?: FileType; pinned?: boolean; archived?: boolean }
) => {
  return prisma.devFile.update({
    where: { id },
    data,
  });
};

export const deleteFile = async (id: string) => {
  const file = await prisma.devFile.findUnique({
    where: { id },
    select: { projectId: true },
  });

  if (!file) {
    throw new Error('File not found');
  }

  const projectId = file.projectId;

  // Find all attachments for this file
  const attachments = await prisma.attachment.findMany({
    where: { fileId: id },
    select: { url: true }
  });

  // Delete physical files
  attachments.forEach(att => {
    try {
      const filename = path.basename(att.url);
      const filePath = path.join(__dirname, '../../../uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Failed to delete physical file during file deletion:', err);
    }
  });

  return prisma.$transaction(async (tx) => {
    await tx.devFile.delete({
      where: { id },
    });

    const remainingFiles = await tx.devFile.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    for (let i = 0; i < remainingFiles.length; i++) {
      await tx.devFile.update({
        where: { id: remainingFiles[i].id },
        data: { order: i },
      });
    }
  });
};

export const reorderFiles = async (projectId: string, orderedIds: string[]) => {
  return prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.devFile.update({
        where: { id },
        data: { order: index },
      })
    )
  );
};

export const moveFile = async (id: string, targetProjectId: string) => {
  return prisma.$transaction(async (tx) => {
    const file = await tx.devFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new Error('File not found');
    }

    const sourceProjectId = file.projectId;

    const maxOrderFile = await tx.devFile.findFirst({
      where: { projectId: targetProjectId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = maxOrderFile ? maxOrderFile.order + 1 : 0;

    await tx.devFile.update({
      where: { id },
      data: {
        projectId: targetProjectId,
        order: nextOrder,
        pinned: false, // reset pin on move
      },
    });

    const remainingSourceFiles = await tx.devFile.findMany({
      where: { projectId: sourceProjectId },
      orderBy: { order: 'asc' },
    });

    for (let i = 0; i < remainingSourceFiles.length; i++) {
      await tx.devFile.update({
        where: { id: remainingSourceFiles[i].id },
        data: { order: i },
      });
    }
  });
};

export const searchFiles = async (query: string) => {
  return prisma.devFile.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
};
