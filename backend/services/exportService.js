const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const path = require('path');

// Font dosyaları yolu
const FONTS_DIR = path.join(__dirname, '../assets/fonts');

/**
 * PDF Raporu Oluşturur
 * @param {Object} reportData - Kampanya rapor verisi
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generatePDF = (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      
      // Türkçe karakter destekli Roboto fontlarını kaydet
      doc.registerFont('Roboto', path.join(FONTS_DIR, 'Roboto-Regular.ttf'));
      doc.registerFont('Roboto-Bold', path.join(FONTS_DIR, 'Roboto-Bold.ttf'));
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      const { campaign, summary, riskAssessment, riskLevel, userStats } = reportData;

      // ========== BAŞLIK ==========
      doc.font('Roboto-Bold')
         .fontSize(24)
         .fillColor('#2c3e50')
         .text('Kampanya Raporu', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.font('Roboto-Bold')
         .fontSize(16)
         .fillColor('#667eea')
         .text(campaign.name, { align: 'center' });
      
      doc.moveDown(0.3);
      doc.font('Roboto')
         .fontSize(10)
         .fillColor('#7f8c8d')
         .text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`, { align: 'center' });
      
      doc.moveDown(1.5);

      // ========== KAMPANYA BİLGİLERİ ==========
      drawSectionHeader(doc, 'Kampanya Bilgileri');
      
      doc.font('Roboto').fontSize(10).fillColor('#2c3e50');
      const campaignInfo = [
        ['Kampanya Adı', campaign.name],
        ['Konu', campaign.subject],
        ['Durum', getStatusText(campaign.status)],
        ['Gönderim Tarihi', new Date(campaign.sendDate).toLocaleString('tr-TR')],
        ['Oluşturulma Tarihi', new Date(campaign.createdAt).toLocaleString('tr-TR')]
      ];
      
      campaignInfo.forEach(([label, value]) => {
        doc.font('Roboto-Bold').text(`${label}: `, { continued: true });
        doc.font('Roboto').text(value);
      });
      
      doc.moveDown(1.5);

      // ========== ÖZET İSTATİSTİKLER ==========
      drawSectionHeader(doc, 'Özet İstatistikler');
      
      const statsY = doc.y;
      const statsWidth = 120;
      const statsGap = 15;
      const startX = 50;
      
      // İstatistik kutuları
      drawStatBox(doc, startX, statsY, statsWidth, 'Gönderildi', summary.sent, '#667eea');
      drawStatBox(doc, startX + statsWidth + statsGap, statsY, statsWidth, 'Açıldı', `${summary.opened} (${summary.openRate}%)`, '#9b59b6');
      drawStatBox(doc, startX + (statsWidth + statsGap) * 2, statsY, statsWidth, 'Tıklandı', `${summary.clicked} (${summary.clickRate}%)`, '#e74c3c');
      drawStatBox(doc, startX + (statsWidth + statsGap) * 3, statsY, statsWidth, 'Hedef', summary.totalTargets, '#3498db');
      
      doc.y = statsY + 70;
      doc.moveDown(1);

      // ========== GRAFİK ==========
      drawSectionHeader(doc, 'Performans Grafiği');
      
      const chartY = doc.y + 10;
      const chartX = 100;
      const barWidth = 80;
      const maxBarHeight = 100;
      const barGap = 50;
      
      // Bar değerleri
      const bars = [
        { label: 'Gönderildi', value: summary.sent, color: '#667eea' },
        { label: 'Açıldı', value: summary.opened, color: '#9b59b6' },
        { label: 'Tıklandı', value: summary.clicked, color: '#e74c3c' }
      ];
      
      const maxValue = Math.max(...bars.map(b => b.value), 1);
      
      bars.forEach((bar, index) => {
        const x = chartX + index * (barWidth + barGap);
        const barHeight = (bar.value / maxValue) * maxBarHeight;
        const y = chartY + maxBarHeight - barHeight;
        
        // Bar
        doc.rect(x, y, barWidth, barHeight)
           .fill(bar.color);
        
        // Değer
        doc.font('Roboto-Bold')
           .fontSize(12)
           .fillColor('#2c3e50')
           .text(bar.value.toString(), x, y - 20, { width: barWidth, align: 'center' });
        
        // Label
        doc.font('Roboto')
           .fontSize(9)
           .fillColor('#7f8c8d')
           .text(bar.label, x, chartY + maxBarHeight + 10, { width: barWidth, align: 'center' });
      });
      
      doc.y = chartY + maxBarHeight + 40;
      doc.moveDown(1);

      // ========== RİSK DEĞERLENDİRMESİ ==========
      drawSectionHeader(doc, 'Risk Değerlendirmesi');
      
      const riskColor = getRiskColor(riskAssessment);
      doc.font('Roboto-Bold')
         .fontSize(14)
         .fillColor(riskColor)
         .text(`Risk Seviyesi: ${riskAssessment}`, { continued: true });
      doc.font('Roboto')
         .fontSize(10)
         .fillColor('#7f8c8d')
         .text(` (${riskLevel})`);
      
      doc.moveDown(0.5);
      doc.font('Roboto')
         .fontSize(10)
         .fillColor('#2c3e50')
         .text(getRiskDescription(riskAssessment));
      
      doc.moveDown(1.5);

      // ========== KULLANICI DETAYLARI ==========
      // Yeni sayfa
      doc.addPage();
      
      drawSectionHeader(doc, 'Kullanıcı Detayları');
      
      // Tablo başlıkları
      const tableTop = doc.y + 10;
      const tableHeaders = ['Ad', 'E-posta', 'Grup', 'Gönderildi', 'Açıldı', 'Tıklandı', 'Risk'];
      const colWidths = [80, 120, 60, 50, 50, 50, 50];
      let tableX = 50;
      
      // Başlık satırı
      doc.rect(tableX, tableTop, colWidths.reduce((a, b) => a + b, 0), 20)
         .fill('#667eea');
      
      doc.font('Roboto-Bold')
         .fontSize(8)
         .fillColor('#ffffff');
      
      let currentX = tableX;
      tableHeaders.forEach((header, i) => {
        doc.text(header, currentX + 5, tableTop + 6, { width: colWidths[i] - 10 });
        currentX += colWidths[i];
      });
      
      // Veri satırları
      let rowY = tableTop + 20;
      
      userStats.forEach((stat, index) => {
        // Sayfa kontrolü
        if (rowY > 750) {
          doc.addPage();
          rowY = 50;
        }
        
        const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
        doc.rect(tableX, rowY, colWidths.reduce((a, b) => a + b, 0), 18)
           .fill(bgColor);
        
        doc.font('Roboto')
           .fontSize(7)
           .fillColor('#2c3e50');
        
        currentX = tableX;
        const rowData = [
          stat.user.name || '-',
          stat.user.email || '-',
          stat.user.group || '-',
          stat.sent ? 'Evet' : 'Hayır',
          stat.opened ? `Evet (${stat.openCount})` : '-',
          stat.clicked ? `Evet (${stat.clickCount})` : '-',
          getUserRiskLevel(stat)
        ];
        
        rowData.forEach((cell, i) => {
          // Risk sütunu için renk
          if (i === 6) {
            doc.fillColor(getUserRiskColor(stat));
          } else {
            doc.fillColor('#2c3e50');
          }
          doc.text(cell, currentX + 3, rowY + 5, { width: colWidths[i] - 6 });
          currentX += colWidths[i];
        });
        
        rowY += 18;
      });

      // ========== FOOTER ==========
      doc.font('Roboto')
         .fontSize(8)
         .fillColor('#95a5a6')
         .text('Bu rapor Phishing Simülasyon Sistemi tarafından otomatik oluşturulmuştur.', 
               50, 780, { align: 'center', width: 500 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * CSV Raporu Oluşturur
 * @param {Array} userStats - Kullanıcı istatistikleri
 * @param {Object} campaign - Kampanya bilgisi
 * @returns {String} - CSV string
 */
const generateCSV = (userStats, campaign) => {
  const data = userStats.map(stat => ({
    'Kampanya': campaign.name,
    'Ad': stat.user.name || '',
    'E-posta': stat.user.email || '',
    'Grup': stat.user.group || '',
    'Gönderildi': stat.sent ? 'Evet' : 'Hayır',
    'Açıldı': stat.opened ? 'Evet' : 'Hayır',
    'Açılma Sayısı': stat.openCount || 0,
    'Tıklandı': stat.clicked ? 'Evet' : 'Hayır',
    'Tıklama Sayısı': stat.clickCount || 0,
    'Risk Seviyesi': getUserRiskLevel(stat)
  }));

  const fields = [
    'Kampanya',
    'Ad',
    'E-posta',
    'Grup',
    'Gönderildi',
    'Açıldı',
    'Açılma Sayısı',
    'Tıklandı',
    'Tıklama Sayısı',
    'Risk Seviyesi'
  ];

  const parser = new Parser({ fields, delimiter: ';' });
  return parser.parse(data);
};

// ========== YARDIMCI FONKSİYONLAR ==========

function drawSectionHeader(doc, title) {
  doc.font('Roboto-Bold')
     .fontSize(14)
     .fillColor('#2c3e50')
     .text(title);
  
  doc.moveTo(50, doc.y + 2)
     .lineTo(550, doc.y + 2)
     .strokeColor('#667eea')
     .lineWidth(1)
     .stroke();
  
  doc.moveDown(0.5);
}

function drawStatBox(doc, x, y, width, label, value, color) {
  // Kutu
  doc.rect(x, y, width, 55)
     .fill('#f8f9fa')
     .stroke('#e0e0e0');
  
  // Üst çizgi (renkli)
  doc.rect(x, y, width, 4)
     .fill(color);
  
  // Değer
  doc.font('Roboto-Bold')
     .fontSize(16)
     .fillColor('#2c3e50')
     .text(value.toString(), x, y + 15, { width: width, align: 'center' });
  
  // Etiket
  doc.font('Roboto')
     .fontSize(9)
     .fillColor('#7f8c8d')
     .text(label, x, y + 38, { width: width, align: 'center' });
}

function getStatusText(status) {
  const texts = {
    'draft': 'Taslak',
    'processing': 'İşleniyor',
    'scheduled': 'Zamanlandı',
    'sent': 'Gönderildi',
    'completed': 'Tamamlandı'
  };
  return texts[status] || status;
}

function getRiskColor(risk) {
  if (risk === 'Yüksek') return '#e74c3c';
  if (risk === 'Orta') return '#f39c12';
  return '#27ae60';
}

function getRiskDescription(risk) {
  if (risk === 'Yüksek') {
    return 'Kullanıcıların büyük çoğunluğu phishing linkine tıklamış. Acil güvenlik eğitimi önerilir.';
  }
  if (risk === 'Orta') {
    return 'Bazı kullanıcılar phishing linkine tıklamış. Güvenlik farkındalık eğitimi planlanmalı.';
  }
  return 'Kullanıcıların çoğu phishing girişimini başarıyla tespit etmiş. Mevcut güvenlik bilinci iyi seviyede.';
}

function getUserRiskLevel(stat) {
  if (stat.clicked) return 'Yüksek';
  if (stat.opened) return 'Orta';
  if (stat.sent) return 'Düşük';
  return 'Yok';
}

function getUserRiskColor(stat) {
  if (stat.clicked) return '#e74c3c';
  if (stat.opened) return '#f39c12';
  return '#27ae60';
}

module.exports = {
  generatePDF,
  generateCSV
};
