// NOT: Email işleme artık emailService.js içinde yapılıyor (on-demand mod)
// Bu dosya geriye uyumluluk için tutulmuştur

console.log('⚠️ emailWorker.js deprecated - emailService.js kullanılıyor');

module.exports = {
  startEmailWorker: () => {
    console.log('⚠️ Worker başlatma devre dışı - on-demand mod aktif');
  }
};
