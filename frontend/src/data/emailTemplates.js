// Profesyonel Phishing Mail Taslakları
// Admin bu taslakları seçip düzenleyebilir

export const emailTemplates = [
  {
    id: 'empty',
    name: 'Boş Başla',
    icon: '📝',
    category: 'custom',
    categoryLabel: 'Özel',
    description: 'Sıfırdan kendi içeriğinizi yazın',
    subject: '',
    body: ''
  },
  {
    id: 'password_reset',
    name: 'Şifre Sıfırlama',
    icon: '🔑',
    category: 'security',
    categoryLabel: 'Güvenlik',
    description: 'Microsoft/Google tarzı şifre sıfırlama talebi',
    subject: 'Şifre sıfırlama talebiniz alındı',
    body: `<p>Sayın Kullanıcı,</p>

<p>Hesabınız için bir şifre sıfırlama talebi aldık. Bu talebi siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.</p>

<p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bu bağlantı güvenlik nedeniyle <strong>24 saat</strong> içinde geçerliliğini yitirecektir.</p>

<p style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 4px;">
  <strong>Talep Detayları:</strong><br>
  Tarih: ${new Date().toLocaleDateString('tr-TR')}<br>
  IP Adresi: 192.168.1.***<br>
  Konum: İstanbul, Türkiye
</p>

<p>Bu talebi siz yapmadıysanız, hesabınızın güvenliği için derhal IT departmanı ile iletişime geçin.</p>

<p>Saygılarımızla,<br>
<strong>Güvenlik Ekibi</strong></p>`
  },
  {
    id: 'account_verify',
    name: 'Hesap Doğrulama',
    icon: '⚠️',
    category: 'security',
    categoryLabel: 'Güvenlik',
    description: 'Acil hesap doğrulama uyarısı',
    subject: 'ACİL: Hesabınız askıya alınmak üzere',
    body: `<p>Sayın Kullanıcı,</p>

<p>Hesabınızda <strong>olağandışı aktivite</strong> tespit edildi. Güvenlik politikalarımız gereği, hesabınızı doğrulamanız gerekmektedir.</p>

<p style="margin: 20px 0; padding: 15px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
  ⚠️ <strong>Dikkat:</strong> Bu işlemi 48 saat içinde tamamlamazsanız, hesabınız geçici olarak askıya alınacaktır.
</p>

<p><strong>Tespit Edilen Aktiviteler:</strong></p>
<ul>
  <li>Farklı bir lokasyondan giriş denemesi</li>
  <li>Birden fazla başarısız giriş denemesi</li>
  <li>Şüpheli cihaz tespiti</li>
</ul>

<p>Hesabınızı güvende tutmak için lütfen aşağıdaki butona tıklayarak kimliğinizi doğrulayın.</p>

<p>Saygılarımızla,<br>
<strong>Hesap Güvenliği Ekibi</strong></p>`
  },
  {
    id: 'it_security',
    name: 'IT Güvenlik Güncellemesi',
    icon: '🛡️',
    category: 'it',
    categoryLabel: 'IT',
    description: 'IT departmanından zorunlu güncelleme bildirimi',
    subject: 'ZORUNLU: Güvenlik güncellemesi yapılması gerekmektedir',
    body: `<p>Sayın Çalışan,</p>

<p>Şirketimizin siber güvenlik politikaları kapsamında, tüm çalışanların sistemlerinde <strong>kritik bir güvenlik güncellemesi</strong> yapılması gerekmektedir.</p>

<p style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 8px; border: 1px solid #667eea30;">
  <strong>📋 Güncelleme Detayları:</strong><br><br>
  Güncelleme Adı: Kurumsal Güvenlik Yaması v2.4.1<br>
  Son Tarih: ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')}<br>
  Tahmini Süre: 5-10 dakika
</p>

<p>Bu güncelleme, son zamanlarda tespit edilen güvenlik açıklarını kapatmak için zorunludur. Güncellemeyi tamamlamayan sistemler, <strong>şirket ağına erişimden geçici olarak men edilecektir.</strong></p>

<p>Güncellemeyi başlatmak için aşağıdaki butona tıklayın ve kurumsal kimlik bilgilerinizle giriş yapın.</p>

<p>Teknik destek için IT Help Desk: dahili 1234</p>

<p>Saygılarımızla,<br>
<strong>IT Güvenlik Departmanı</strong></p>`
  },
  {
    id: 'package_delivery',
    name: 'Kargo Bildirimi',
    icon: '📦',
    category: 'delivery',
    categoryLabel: 'Kargo',
    description: 'Kargo/paket teslim edilemedi bildirimi',
    subject: 'Paketiniz teslim edilemedi - İşlem gerekli',
    body: `<p>Sayın Alıcı,</p>

<p>Gönderinizi teslim etmek istedik ancak <strong>adresinizde kimseyi bulamadık.</strong></p>

<p style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px;">
  <strong>📦 Gönderi Bilgileri:</strong><br><br>
  Takip No: TR${Math.random().toString().slice(2, 14)}<br>
  Gönderici: Online Mağaza<br>
  Teslimat Durumu: Beklemede<br>
  Son Teslim Alma Tarihi: ${new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')}
</p>

<p>Paketinizi teslim alabilmek için lütfen aşağıdaki butona tıklayarak:</p>
<ul>
  <li>Teslimat adresinizi onaylayın</li>
  <li>Uygun teslimat zamanını seçin</li>
  <li>İletişim bilgilerinizi güncelleyin</li>
</ul>

<p style="color: #dc2626; font-weight: 500;">⚠️ Son teslim alma tarihine kadar işlem yapılmazsa paketiniz gönderici adresine iade edilecektir.</p>

<p>Saygılarımızla,<br>
<strong>Kargo Hizmetleri</strong></p>`
  },
  {
    id: 'hr_payroll',
    name: 'İK Maaş Bordrosu',
    icon: '💰',
    category: 'hr',
    categoryLabel: 'İnsan Kaynakları',
    description: 'Maaş bordrosu ve İK bildirimi',
    subject: 'Maaş bordronuz hazır - Onayınız gerekiyor',
    body: `<p>Sayın Çalışan,</p>

<p>${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} dönemi maaş bordronuz hazırlanmıştır.</p>

<p style="margin: 20px 0; padding: 20px; background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px;">
  <strong>💵 Bordro Özeti:</strong><br><br>
  Dönem: ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}<br>
  Durum: Onay Bekliyor<br>
  Son Onay Tarihi: ${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')}
</p>

<p>Yeni düzenlememize göre, maaş ödemelerinizin zamanında yapılabilmesi için <strong>bordronuzu incelemeniz ve onaylamanız</strong> gerekmektedir.</p>

<p>Bordronuzda aşağıdaki güncellemeler bulunmaktadır:</p>
<ul>
  <li>Vergi dilimi güncellemesi</li>
  <li>SGK prim kesintisi düzenlemesi</li>
  <li>Yeni yan haklar eklentisi</li>
</ul>

<p>Bordronuzu görüntülemek ve onaylamak için aşağıdaki butona tıklayın.</p>

<p>Sorularınız için İK departmanı ile iletişime geçebilirsiniz.</p>

<p>Saygılarımızla,<br>
<strong>İnsan Kaynakları Departmanı</strong></p>`
  },
  {
    id: 'file_share',
    name: 'Dosya Paylaşımı',
    icon: '📁',
    category: 'collaboration',
    categoryLabel: 'İşbirliği',
    description: 'OneDrive/Google Drive dosya paylaşım bildirimi',
    subject: 'Sizinle bir dosya paylaşıldı - "Proje_Raporu_2024.xlsx"',
    body: `<p>Merhaba,</p>

<p><strong>Mehmet Yılmaz</strong> sizinle bir dosya paylaştı ve görüntülemenizi istiyor.</p>

<div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
  <table style="width: 100%;">
    <tr>
      <td style="width: 50px; vertical-align: top;">
        <span style="font-size: 36px;">📊</span>
      </td>
      <td>
        <strong style="font-size: 16px; color: #1e293b;">Proje_Raporu_2024.xlsx</strong><br>
        <span style="color: #64748b; font-size: 13px;">Excel Çalışma Kitabı • 2.4 MB</span><br>
        <span style="color: #64748b; font-size: 13px;">Paylaşım tarihi: ${new Date().toLocaleDateString('tr-TR')}</span>
      </td>
    </tr>
  </table>
</div>

<p style="margin: 15px 0; padding: 15px; background-color: #eff6ff; border-radius: 8px; font-size: 14px;">
  💬 <strong>Mehmet'in notu:</strong> "Toplantıdan önce incelemenizi rica ederim. Özellikle 3. sayfadaki bütçe tablosuna bakın."
</p>

<p>Dosyayı görüntülemek için aşağıdaki butona tıklayın. Kurumsal hesabınızla giriş yapmanız gerekebilir.</p>

<p style="color: #6b7280; font-size: 13px; margin-top: 25px;">
  Bu dosya 30 gün boyunca erişilebilir olacaktır.<br>
  Dosyayı tanımıyorsanız, bu e-postayı yoksayabilirsiniz.
</p>`
  },
  {
    id: 'meeting_invite',
    name: 'Toplantı Daveti',
    icon: '📅',
    category: 'calendar',
    categoryLabel: 'Takvim',
    description: 'Acil toplantı daveti bildirimi',
    subject: 'ACİL: Yönetim Toplantısı - Katılımınız bekleniyor',
    body: `<p>Merhaba,</p>

<p><strong>Genel Müdür</strong> sizi acil bir toplantıya davet ediyor.</p>

<div style="margin: 25px 0; padding: 25px; background: linear-gradient(135deg, #667eea08 0%, #764ba208 100%); border: 1px solid #667eea30; border-radius: 12px;">
  <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">📅 Yönetim Değerlendirme Toplantısı</h3>
  
  <table style="width: 100%; font-size: 14px; color: #475569;">
    <tr>
      <td style="padding: 8px 0; width: 120px;"><strong>📆 Tarih:</strong></td>
      <td>${new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0;"><strong>🕐 Saat:</strong></td>
      <td>14:00 - 15:30 (TSİ)</td>
    </tr>
    <tr>
      <td style="padding: 8px 0;"><strong>📍 Konum:</strong></td>
      <td>Online - Microsoft Teams</td>
    </tr>
    <tr>
      <td style="padding: 8px 0;"><strong>👥 Katılımcılar:</strong></td>
      <td>Tüm departman müdürleri</td>
    </tr>
  </table>
</div>

<p><strong>Gündem Maddeleri:</strong></p>
<ol>
  <li>2024 Q4 performans değerlendirmesi</li>
  <li>2025 bütçe planlaması</li>
  <li>Yeni organizasyon yapısı</li>
  <li>Soru-Cevap</li>
</ol>

<p style="margin: 20px 0; padding: 15px; background-color: #fef3c7; border-radius: 8px;">
  ⚠️ <strong>Önemli:</strong> Toplantıya katılım zorunludur. Katılamayacaksanız en kısa sürede Genel Müdür Asistanı ile iletişime geçin.
</p>

<p>Toplantı bağlantısına erişmek ve katılımınızı onaylamak için aşağıdaki butona tıklayın.</p>`
  }
];

// Kategorilere göre renk kodları
export const categoryColors = {
  custom: { bg: '#f3f4f6', border: '#9ca3af', text: '#6b7280' },
  security: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  it: { bg: '#ede9fe', border: '#8b5cf6', text: '#6d28d9' },
  delivery: { bg: '#e0f2fe', border: '#0ea5e9', text: '#0369a1' },
  hr: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  collaboration: { bg: '#f0f9ff', border: '#3b82f6', text: '#1d4ed8' },
  calendar: { bg: '#fce7f3', border: '#ec4899', text: '#be185d' }
};

export default emailTemplates;
