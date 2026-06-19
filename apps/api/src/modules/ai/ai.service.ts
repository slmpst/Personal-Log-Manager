import { prisma } from '../../db/prisma';

const getApiKey = (reqHeaders: Record<string, any>) => {
  const authHeader = reqHeaders['authorization'];
  let tokenFromAuth = '';
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    tokenFromAuth = authHeader.substring(7).trim();
  }
  const userKey = tokenFromAuth || reqHeaders['x-gemini-key'];
  return userKey || process.env.GEMINI_API_KEY || '';
};

export const callAi = async (prompt: string, reqHeaders: Record<string, any>) => {
  const apiKey = getApiKey(reqHeaders);
  if (!apiKey) {
    throw new Error('API anahtarı eksik. Lütfen uygulamanın ayarlar menüsünden veya sunucunun .env dosyasından tanımlayın.');
  }

  // Auto-detect provider based on key format
  const isOpenAI = apiKey.startsWith('sk-');

  if (isOpenAI) {
    // Call OpenAI API
    const url = 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API Hatası: ${response.status} - ${errorBody}`);
    }

    const result = (await response.json()) as any;
    const generatedText = result?.choices?.[0]?.message?.content;
    if (!generatedText) {
      throw new Error('OpenAI herhangi bir içerik dönmedi.');
    }
    return generatedText;
  } else {
    // Call Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API Hatası: ${response.status} - ${errorBody}`);
    }

    const result = (await response.json()) as any;
    const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error('Gemini herhangi bir içerik dönmedi.');
    }
    return generatedText;
  }
};

export const chatWithProject = async (
  projectId: string, 
  message: string, 
  fileId: string | null, 
  reqHeaders: Record<string, any>
) => {
  const files = await prisma.devFile.findMany({
    where: { projectId },
    select: { title: true, type: true, content: true }
  });

  const activeFile = fileId ? await prisma.devFile.findUnique({
    where: { id: fileId },
    select: { title: true, content: true }
  }) : null;

  let context = "İşte bu projedeki mevcut dosyalar:\n\n";
  files.forEach(f => {
    const isThisActive = activeFile && f.title === activeFile.title;
    const contentLimit = isThisActive ? 15000 : 1500;
    const truncatedContent = f.content.length > contentLimit 
      ? f.content.slice(0, contentLimit) + "\n[...Metin çok uzun olduğu için yapay zeka tarafından kırpıldı...]"
      : f.content;
    context += `--- BAŞLIK: ${f.title} (Tip: ${f.type}) ---\nİçerik:\n${truncatedContent}\n\n`;
  });

  if (activeFile) {
    context += `Şu an aktif olarak açık olan dosya: "${activeFile.title}"\n\n`;
  }

  const systemPrompt = `Sen "Devlog Yöneticisi" uygulamasında yerleşik bir AI yazılım geliştirme asistanısın. Geliştiricinin kendi projelerine ait devloglar, notlar, raporlar ve yapılacaklar listeleri üzerinde çalışıyorsun.
Sana verilen proje dosyalarını (bağlam/context) kullanarak kullanıcının sorularını yanıtla.

Yanıt verirken şu kurallara uy:
1. Sadece sana verilen proje dosyalarındaki bilgilere dayanarak yanıt ver. Eğer bilgi dosyalarda yoksa, genel geliştirici bilgini de kullanarak yardımcı ol ama dosyalarda bu bilginin bulunmadığını nazikçe belirt.
2. Yanıtları kısa, öz, profesyonel ve geliştirici dostu bir dille (Türkçe) yaz.
3. Yanıtlarda kod örnekleri ve markdown formatını (tablo, kalın yazı, kontrol listeleri) bolca kullan.
4. Dosyalardan bahsederken başlıklarını aynen kullan.

Bağlam (Proje Dosyaları):
${context}

Kullanıcı Sorusu:
${message}`;

  return callAi(systemPrompt, reqHeaders);
};

export const runEditorCommand = async (
  command: string,
  content: string,
  selection: string | null,
  reqHeaders: Record<string, any>
) => {
  const targetText = selection && selection.trim() ? selection : content;
  
  let commandInstruction = "";
  if (command === 'summarize') {
    commandInstruction = "Bu metni kısa ve öz bir şekilde, maddeler halinde özetle.";
  } else if (command === 'fix-code') {
    commandInstruction = "Bu kod bloğundaki hataları bul, düzeltilmiş halini yaz ve yapılan değişiklikleri kısaca açıkla.";
  } else if (command === 'generate-mermaid') {
    commandInstruction = "Bu metinde anlatılan süreci, akışı veya mimariyi gösteren bir Mermaid.js diyagramı oluştur. YALNIZCA \`\`\`mermaid ile başlayıp \`\`\` ile biten kod bloğunu dönüştür, başka hiçbir metin ekleme.";
  } else if (command === 'continue-writing') {
    commandInstruction = "Bu yazının devamını, akışı ve stili bozmadan mantıklı bir şekilde yaz ve tamamla.";
  } else if (command === 'draft-to-devlog') {
    commandInstruction = "Bu dağınık notları/taslağı, başlıklar, yapılacaklar listeleri ve sorun-çözüm bölümleri içeren profesyonel bir Devlog formatına dönüştür.";
  } else {
    commandInstruction = command; // custom prompt
  }

  const prompt = `Sen yardımcı bir yazılım geliştirici asistanısın. Aşağıdaki metin üzerinde şu işlemi gerçekleştir:
"${commandInstruction}"

Kurallar:
1. Yanıtı doğrudan uygulayacağımız şekilde, temiz bir biçimde ver.
2. Eğer işlem bir Mermaid diyagramı üretmekse, YALNIZCA mermaid kod bloğunu ver.
3. Türkçe yanıt ver.

İşlem Yapılacak Metin:
${targetText}`;

  return callAi(prompt, reqHeaders);
};

export const generateProjectSummary = async (projectId: string, reqHeaders: Record<string, any>) => {
  const files = await prisma.devFile.findMany({
    where: { projectId },
    select: { title: true, type: true, content: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' }
  });

  if (files.length === 0) {
    throw new Error('Özet oluşturmak için projede dosya bulunmalıdır.');
  }

  let context = "";
  files.forEach(f => {
    const truncatedContent = f.content.length > 4000
      ? f.content.slice(0, 4000) + "\n[...Metin çok uzun olduğu için yapay zeka tarafından kırpıldı...]"
      : f.content;
    context += `--- BAŞLIK: ${f.title} (Tip: ${f.type}, Güncelleme: ${f.updatedAt}) ---\nİçerik:\n${truncatedContent}\n\n`;
  });

  const prompt = `Sen yardımcı bir yapay zeka asistanısın. Aşağıdaki proje dosyalarını (devloglar, notlar, raporlar) incele ve bu proje için profesyonel bir "Yayın Notları (Release Notes)" ve "Haftalık Güncelleme Raporu" taslağı oluştur.

Kurallar:
1. Yapılan işleri kategorilere ayır (Yenilikler, Düzeltilen Hatalar, Gelecek Planlar).
2. Dosyalardaki tarih ve güncelleme bilgilerini dikkate al.
3. Profesyonel ve geliştirici dostu bir markdown formatında (Türkçe) yaz.
4. Yanıtı doğrudan kopyalanıp kullanılabilecek şekilde ver.

İncelenecek Proje Dosyaları:
${context}`;

  return callAi(prompt, reqHeaders);
};
