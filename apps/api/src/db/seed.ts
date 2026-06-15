import { prisma } from './prisma';
import crypto from 'crypto';

export const initSeed = async () => {
  try {
    const projectCount = await prisma.project.count();
    if (projectCount > 0) {
      return; // Already has data
    }

    console.log('[Seed] Database is empty. Seeding default project and files...');

    const projectId = crypto.randomUUID();
    const fileId = crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.project.create({
        data: {
          id: projectId,
          name: 'Genel Notlar',
          slug: 'genel-notlar',
          color: '#6366f1',
          order: 0,
        },
      });

      await tx.devFile.create({
        data: {
          id: fileId,
          projectId: projectId,
          type: 'notlar',
          title: 'Başlangıç Rehberi 👋',
          content: `# Devlog Manager'a Hoş Geldiniz\n\nBu uygulama kişisel devloglarınızı, raporlarınızı ve yapılacak işlerinizi düzenli bir şekilde tutmanız için tasarlanmıştır.\n\n### Özellikler:\n- **Sürükle-Bırak:** Projelerinizi ve dosyalarınızı sürükleyerek sıralayabilirsiniz. Bir dosyayı başka bir projeye taşımak için sidebar'daki o projenin üzerine bırakmanız yeterlidir.\n- **Sabitleme:** Önemli dosyalarınızı üstte tutmak için sağ köşedeki pin ikonunu kullanabilirsiniz.\n- **Arama:** \`/\` tuşuna basarak veya sol alttaki arama çubuğunu kullanarak tüm projelerinizde arama yapabilirsiniz.\n- **Otomatik Kaydetme:** Editörde yazdığınız her şey arka planda otomatik olarak veritabanına kaydedilir.`,
          order: 0,
          pinned: true,
        },
      });
    });

    console.log('[Seed] Database seeded successfully.');
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
  }
};
