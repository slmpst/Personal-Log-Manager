import { prisma } from '../../db/prisma';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // replace Turkish characters
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export const listProjects = async () => {
  const projects = await prisma.project.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { files: true },
      },
    },
  });

  return projects.map((p) => {
    const { _count, ...rest } = p;
    return {
      ...rest,
      fileCount: _count.files,
    };
  });
};

export const createProject = async (name: string, color: string) => {
  const maxOrderProject = await prisma.project.findFirst({
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  const order = maxOrderProject ? maxOrderProject.order + 1 : 0;

  const id = crypto.randomUUID();
  const slug = slugify(name);

  return prisma.project.create({
    data: {
      id,
      name,
      slug,
      color,
      order,
    },
  });
};

export const updateProject = async (
  id: string,
  data: { name?: string; color?: string; icon?: string | null }
) => {
  const updateData: any = { ...data };
  if (data.name) {
    updateData.slug = slugify(data.name);
  }

  return prisma.project.update({
    where: { id },
    data: updateData,
  });
};

export const deleteProject = async (id: string) => {
  // Find all attachments for files in this project
  const attachments = await prisma.attachment.findMany({
    where: {
      file: {
        projectId: id
      }
    },
    select: {
      url: true
    }
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
      console.error('Failed to delete physical file during project deletion:', err);
    }
  });

  return prisma.project.delete({
    where: { id },
  });
};

export const reorderProjects = async (orderedIds: string[]) => {
  return prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.project.update({
        where: { id },
        data: { order: index },
      })
    )
  );
};
