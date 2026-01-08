"""
Eğitim Gerekliliği ML Modeli
Multi-label classification modeli
"""

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from datetime import datetime
import os

class TrainingNeedModel:
    """Eğitim gerekliliği ML modeli"""
    
    def __init__(self):
        self.model = None
        self.preprocessor = None
        self.version = '1.0.0'
        self.trained_at = None
    
    def create_model(self):
        """Model oluştur"""
        # Base classifier
        base_classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        # Multi-label classifier
        self.model = MultiOutputClassifier(base_classifier)
        return self.model
    
    def train(self, X, y):
        """Model eğitimi"""
        if self.model is None:
            self.create_model()
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Model eğitimi
        print('🔄 Model eğitiliyor...')
        self.model.fit(X_train, y_train)
        
        # Değerlendirme
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f'✅ Model eğitimi tamamlandı')
        print(f'   Accuracy: {accuracy:.4f}')
        
        # Classification report
        print('\n📊 Classification Report:')
        print(classification_report(y_test, y_pred))
        
        self.trained_at = datetime.now()
        
        return {
            'accuracy': accuracy,
            'trained_at': self.trained_at
        }
    
    def predict(self, X):
        """Tahmin yap"""
        if self.model is None:
            raise ValueError('Model eğitilmemiş!')
        
        return self.model.predict(X)
    
    def predict_proba(self, X):
        """Olasılık tahmini"""
        if self.model is None:
            raise ValueError('Model eğitilmemiş!')
        
        return self.model.predict_proba(X)
    
    def save(self, filepath):
        """Model kaydet"""
        if self.model is None:
            raise ValueError('Kaydedilecek model yok!')
        
        # Dizin yoksa oluştur
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        model_data = {
            'model': self.model,
            'preprocessor': self.preprocessor,
            'version': self.version,
            'trained_at': self.trained_at
        }
        
        joblib.dump(model_data, filepath)
        print(f'✅ Model kaydedildi: {filepath}')
    
    def load(self, filepath):
        """Model yükle"""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f'Model dosyası bulunamadı: {filepath}')
        
        model_data = joblib.load(filepath)
        self.model = model_data.get('model')
        self.preprocessor = model_data.get('preprocessor')
        self.version = model_data.get('version', '1.0.0')
        self.trained_at = model_data.get('trained_at')
        
        print(f'✅ Model yüklendi: {filepath}')
        return self

