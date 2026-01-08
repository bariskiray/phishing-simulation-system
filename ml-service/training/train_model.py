"""
Model eğitim scripti
"""

import sys
import os
import json

# Parent directory'yi path'e ekle
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.training_need_model import TrainingNeedModel
from data.preprocessing import preprocess_features, create_labels
import numpy as np

def load_training_data(filepath):
    """
    Eğitim verisini yükle
    JSON formatında beklenir
    """
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    return data

def prepare_training_data(data):
    """
    Eğitim verisini hazırla
    """
    X = []
    y = []
    
    for item in data:
        # Features
        features = preprocess_features(item)
        X.append(features)
        
        # Labels
        labels = create_labels(item)
        y.append(labels)
    
    return np.array(X), np.array(y)

def train_model(training_data_path, model_save_path):
    """
    Model eğitimi
    """
    print('📊 Eğitim verisi yükleniyor...')
    training_data = load_training_data(training_data_path)
    
    print(f'   Toplam kayıt: {len(training_data)}')
    
    print('🔄 Veri hazırlanıyor...')
    X, y = prepare_training_data(training_data)
    
    print(f'   Feature shape: {X.shape}')
    print(f'   Label shape: {y.shape}')
    
    # Model oluştur ve eğit
    model = TrainingNeedModel()
    model.create_model()
    
    results = model.train(X, y)
    
    # Model kaydet
    model.save(model_save_path)
    
    print(f'\n✅ Model eğitimi tamamlandı ve kaydedildi: {model_save_path}')
    print(f'   Accuracy: {results["accuracy"]:.4f}')
    
    return model, results

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Eğitim gerekliliği modeli eğitimi')
    parser.add_argument('--data', type=str, default='./data/training_data.json',
                       help='Eğitim veri dosyası yolu')
    parser.add_argument('--output', type=str, default='./models/training_need_model.pkl',
                       help='Model kayıt yolu')
    
    args = parser.parse_args()
    
    train_model(args.data, args.output)

