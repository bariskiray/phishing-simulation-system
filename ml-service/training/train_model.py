"""
Model eğitim scripti
Regression modeli için güncellenmiş versiyon
"""

import sys
import os
import json
import argparse
import numpy as np
from datetime import datetime

# Parent directory'yi path'e ekle
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.training_need_model import TrainingNeedModel
from data.preprocessing import preprocess_features, create_labels


def load_training_data(filepath):
    """
    Eğitim verisini yükle
    JSON formatında beklenir
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return data


def prepare_training_data(data):
    """
    Eğitim verisini hazırla
    
    Returns:
        X: Feature matrix (n_samples, 10)
        y: Label matrix (n_samples, 7) - continuous priority değerleri
    """
    X = []
    y = []
    
    for item in data:
        # Features
        features = preprocess_features(item)
        X.append(features)
        
        # Labels (continuous priority değerleri)
        labels = create_labels(item)
        y.append(labels)
    
    return np.array(X), np.array(y)


def analyze_data(data, X, y):
    """Veri analizi ve istatistikler"""
    print('\n📊 Veri Analizi:')
    print(f'   Toplam örnek: {len(data)}')
    print(f'   Feature sayısı: {X.shape[1]}')
    print(f'   Label sayısı: {y.shape[1]}')
    
    # Senaryo dağılımı
    scenarios = {}
    for item in data:
        scenario = item.get('scenario', 'unknown')
        scenarios[scenario] = scenarios.get(scenario, 0) + 1
    
    print(f'\n📊 Senaryo Dağılımı:')
    for scenario, count in sorted(scenarios.items()):
        print(f'   {scenario}: {count} ({count/len(data)*100:.1f}%)')
    
    # Risk dağılımı
    risk_categories = {}
    for item in data:
        category = item.get('riskCategory', 'Unknown')
        risk_categories[category] = risk_categories.get(category, 0) + 1
    
    print(f'\n📊 Risk Kategori Dağılımı:')
    for category, count in sorted(risk_categories.items()):
        print(f'   {category}: {count} ({count/len(data)*100:.1f}%)')
    
    # Label istatistikleri
    print(f'\n📊 Label İstatistikleri (0-1 arası priority):')
    categories = [
        'phishing-basics',
        'urgent-emails',
        'link-security',
        'social-engineering',
        'company-policies',
        'advanced-threats',
        'time-based-threats'
    ]
    
    for i, cat in enumerate(categories):
        print(f'   {cat}:')
        print(f'      Min: {y[:, i].min():.3f}, Max: {y[:, i].max():.3f}')
        print(f'      Mean: {y[:, i].mean():.3f}, Std: {y[:, i].std():.3f}')


def train_model(training_data_path, model_save_path, model_type='random_forest'):
    """
    Model eğitimi
    
    Args:
        training_data_path: Eğitim veri dosyası yolu
        model_save_path: Model kayıt yolu
        model_type: Model tipi ('random_forest' veya 'gradient_boosting')
    """
    print('=' * 60)
    print('🚀 ML Model Eğitimi Başlatılıyor')
    print('=' * 60)
    print(f'   Tarih: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'   Model Tipi: {model_type}')
    print(f'   Veri: {training_data_path}')
    
    # Veri yükle
    print('\n📊 Eğitim verisi yükleniyor...')
    training_data = load_training_data(training_data_path)
    print(f'   Toplam kayıt: {len(training_data)}')
    
    # Veri hazırla
    print('\n🔄 Veri hazırlanıyor...')
    X, y = prepare_training_data(training_data)
    print(f'   Feature shape: {X.shape}')
    print(f'   Label shape: {y.shape}')
    
    # Veri analizi
    analyze_data(training_data, X, y)
    
    # Model oluştur ve eğit
    print('\n' + '=' * 60)
    model = TrainingNeedModel(model_type=model_type)
    model.create_model()
    
    results = model.train(X, y)
    
    # Feature importance
    importance = model.get_feature_importance()
    if importance:
        print(f'\n📊 Feature Importance:')
        sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)
        for name, imp in sorted_importance:
            bar = '█' * int(imp * 50)
            print(f'   {name:20s} {imp:.4f} {bar}')
    
    # Model kaydet
    print('\n' + '=' * 60)
    model.save(model_save_path)
    
    # Sonuç özeti
    print('\n' + '=' * 60)
    print('✅ Model Eğitimi Tamamlandı!')
    print('=' * 60)
    print(f'   Model: {model_save_path}')
    print(f'   Version: {model.version}')
    print(f'   R² Score: {results["r2"]:.4f}')
    print(f'   MAE: {results["mae"]:.4f}')
    print(f'   MSE: {results["mse"]:.4f}')
    
    return model, results


def test_predictions(model_path):
    """Eğitilmiş modeli test et"""
    print('\n' + '=' * 60)
    print('🧪 Model Test Ediliyor')
    print('=' * 60)
    
    # Model yükle
    model = TrainingNeedModel()
    model.load(model_path)
    
    # Test senaryoları
    test_cases = [
        {
            'name': 'Hiç tıklama yok',
            'data': {
                'riskScore': 5,
                'riskCategory': 'Düşük',
                'campaignStats': {
                    'basic': {'total': 20, 'clicked': 0, 'opened': 10},
                    'urgent': {'total': 15, 'clicked': 0, 'opened': 8},
                    'custom': {'total': 10, 'clicked': 0, 'opened': 5}
                },
                'recentTrend': {'clickRate': 0, 'openRate': 50, 'trend': 'stable'},
                'summary': {'totalCampaigns': 45, 'clickRate': 0, 'openRate': 51}
            }
        },
        {
            'name': 'Kritik risk - yüksek tıklama',
            'data': {
                'riskScore': 85,
                'riskCategory': 'Kritik',
                'campaignStats': {
                    'basic': {'total': 15, 'clicked': 8, 'opened': 12},
                    'urgent': {'total': 10, 'clicked': 7, 'opened': 9},
                    'custom': {'total': 12, 'clicked': 5, 'opened': 8}
                },
                'recentTrend': {'clickRate': 55, 'openRate': 75, 'trend': 'increasing'},
                'summary': {'totalCampaigns': 37, 'clickRate': 54, 'openRate': 78}
            }
        },
        {
            'name': 'Orta risk - az tıklama',
            'data': {
                'riskScore': 35,
                'riskCategory': 'Orta',
                'campaignStats': {
                    'basic': {'total': 18, 'clicked': 3, 'opened': 12},
                    'urgent': {'total': 12, 'clicked': 2, 'opened': 8},
                    'custom': {'total': 15, 'clicked': 1, 'opened': 9}
                },
                'recentTrend': {'clickRate': 12, 'openRate': 60, 'trend': 'stable'},
                'summary': {'totalCampaigns': 45, 'clickRate': 13, 'openRate': 64}
            }
        }
    ]
    
    categories = [
        'phishing-basics',
        'urgent-emails',
        'link-security',
        'social-engineering',
        'company-policies',
        'advanced-threats',
        'time-based-threats'
    ]
    
    for test in test_cases:
        print(f'\n📝 Test: {test["name"]}')
        print(f'   Risk: {test["data"]["riskScore"]} ({test["data"]["riskCategory"]})')
        
        features = preprocess_features(test['data'])
        predictions = model.predict_single(features)
        
        print('   Tahmin edilen öncelikler:')
        for i, cat in enumerate(categories):
            priority = predictions[i]
            level = 'Kritik' if priority >= 0.8 else ('Yüksek' if priority >= 0.6 else ('Orta' if priority >= 0.35 else 'Düşük'))
            bar = '█' * int(priority * 20)
            print(f'      {cat:20s} {priority:.2f} [{level:6s}] {bar}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Eğitim gerekliliği modeli eğitimi')
    parser.add_argument('--data', type=str, default='./data/training_data.json',
                       help='Eğitim veri dosyası yolu')
    parser.add_argument('--output', type=str, default='./models/training_need_model.pkl',
                       help='Model kayıt yolu')
    parser.add_argument('--type', type=str, default='random_forest',
                       choices=['random_forest', 'gradient_boosting'],
                       help='Model tipi')
    parser.add_argument('--test', action='store_true',
                       help='Eğitimden sonra test yap')
    
    args = parser.parse_args()
    
    # Model eğit
    model, results = train_model(args.data, args.output, args.type)
    
    # Test
    if args.test:
        test_predictions(args.output)
