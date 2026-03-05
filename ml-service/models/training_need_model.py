"""
Eğitim Gerekliliği ML Modeli
Multi-output regression modeli - her kategori için 0-1 arası priority değeri
"""

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from datetime import datetime
import os


class TrainingNeedModel:
    """Eğitim gerekliliği ML modeli - Regression tabanlı"""
    
    def __init__(self, model_type='random_forest'):
        """
        Model oluştur
        
        Args:
            model_type: 'random_forest' veya 'gradient_boosting'
        """
        self.model = None
        self.preprocessor = None
        self.version = '2.0.0'
        self.trained_at = None
        self.model_type = model_type
        self.metrics = {}
    
    def create_model(self):
        """Model oluştur - Regression tabanlı"""
        if self.model_type == 'gradient_boosting':
            # GradientBoostingRegressor - daha yüksek doğruluk ama daha yavaş
            base_regressor = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=6,
                min_samples_split=5,
                min_samples_leaf=3,
                learning_rate=0.1,
                random_state=42
            )
        else:
            # RandomForestRegressor - varsayılan
            base_regressor = RandomForestRegressor(
                n_estimators=150,
                max_depth=12,
                min_samples_split=4,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1  # Paralel işlem
            )
        
        # Multi-output regressor
        self.model = MultiOutputRegressor(base_regressor)
        return self.model
    
    def train(self, X, y, test_size=0.2):
        """
        Model eğitimi
        
        Args:
            X: Feature matrix
            y: Label matrix (7 kategori için continuous değerler)
            test_size: Test set oranı
        
        Returns:
            dict: Eğitim sonuçları
        """
        if self.model is None:
            self.create_model()
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        # Model eğitimi
        print('🔄 Model eğitiliyor...')
        print(f'   Eğitim seti: {len(X_train)} örnek')
        print(f'   Test seti: {len(X_test)} örnek')
        
        self.model.fit(X_train, y_train)
        
        # Tahmin
        y_pred = self.model.predict(X_test)
        
        # Metrikleri hesapla
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        # Her kategori için ayrı metrikler
        category_metrics = []
        categories = [
            'phishing-basics',
            'urgent-emails',
            'link-security',
            'social-engineering',
            'company-policies',
            'advanced-threats',
            'time-based-threats'
        ]
        
        print(f'\n✅ Model eğitimi tamamlandı')
        print(f'\n📊 Genel Metrikler:')
        print(f'   MSE: {mse:.4f}')
        print(f'   MAE: {mae:.4f}')
        print(f'   R² Score: {r2:.4f}')
        
        print(f'\n📊 Kategori Bazlı Metrikler:')
        for i, cat in enumerate(categories):
            cat_mse = mean_squared_error(y_test[:, i], y_pred[:, i])
            cat_mae = mean_absolute_error(y_test[:, i], y_pred[:, i])
            cat_r2 = r2_score(y_test[:, i], y_pred[:, i])
            
            category_metrics.append({
                'category': cat,
                'mse': cat_mse,
                'mae': cat_mae,
                'r2': cat_r2
            })
            
            print(f'   {cat}:')
            print(f'      MAE: {cat_mae:.4f}, R²: {cat_r2:.4f}')
        
        self.trained_at = datetime.now()
        
        # Metrikleri kaydet
        self.metrics = {
            'overall': {
                'mse': float(mse),
                'mae': float(mae),
                'r2': float(r2)
            },
            'categories': category_metrics,
            'train_size': len(X_train),
            'test_size': len(X_test)
        }
        
        # Örnek tahminler göster
        print(f'\n📝 Örnek Tahminler vs Gerçek:')
        for i in range(min(3, len(y_test))):
            print(f'   Örnek {i+1}:')
            print(f'      Gerçek:  {[round(v, 2) for v in y_test[i]]}')
            print(f'      Tahmin:  {[round(v, 2) for v in y_pred[i]]}')
        
        return {
            'mse': float(mse),
            'mae': float(mae),
            'r2': float(r2),
            'trained_at': self.trained_at,
            'category_metrics': category_metrics
        }
    
    def predict(self, X):
        """
        Tahmin yap
        
        Args:
            X: Feature matrix
        
        Returns:
            numpy.ndarray: Her kategori için priority değerleri (0-1)
        """
        if self.model is None:
            raise ValueError('Model eğitilmemiş!')
        
        predictions = self.model.predict(X)
        
        # Değerleri 0-1 arasına sınırla
        predictions = np.clip(predictions, 0.0, 1.0)
        
        return predictions
    
    def predict_single(self, features):
        """
        Tek bir kullanıcı için tahmin
        
        Args:
            features: 10 elemanlı feature vektörü
        
        Returns:
            numpy.ndarray: 7 kategori için priority değerleri
        """
        X = np.array([features])
        return self.predict(X)[0]
    
    def evaluate(self, X, y):
        """
        Model değerlendirmesi
        
        Args:
            X: Feature matrix
            y: Label matrix
        
        Returns:
            dict: Değerlendirme metrikleri
        """
        if self.model is None:
            raise ValueError('Model eğitilmemiş!')
        
        y_pred = self.predict(X)
        
        return {
            'mse': float(mean_squared_error(y, y_pred)),
            'mae': float(mean_absolute_error(y, y_pred)),
            'r2': float(r2_score(y, y_pred))
        }
    
    def cross_validate(self, X, y, cv=5):
        """
        Cross-validation
        
        Args:
            X: Feature matrix
            y: Label matrix
            cv: Fold sayısı
        
        Returns:
            dict: CV sonuçları
        """
        if self.model is None:
            self.create_model()
        
        print(f'🔄 {cv}-fold cross-validation yapılıyor...')
        
        # Her output için ayrı CV
        cv_scores = []
        for i in range(y.shape[1]):
            scores = cross_val_score(
                self.model.estimators_[i] if hasattr(self.model, 'estimators_') else self.model,
                X, y[:, i], cv=cv, scoring='r2'
            )
            cv_scores.append(scores)
        
        cv_scores = np.array(cv_scores)
        
        return {
            'mean_r2': float(cv_scores.mean()),
            'std_r2': float(cv_scores.std()),
            'fold_scores': cv_scores.tolist()
        }
    
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
            'trained_at': self.trained_at,
            'model_type': self.model_type,
            'metrics': self.metrics
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
        self.version = model_data.get('version', '2.0.0')
        self.trained_at = model_data.get('trained_at')
        self.model_type = model_data.get('model_type', 'random_forest')
        self.metrics = model_data.get('metrics', {})
        
        print(f'✅ Model yüklendi: {filepath}')
        print(f'   Version: {self.version}')
        print(f'   Type: {self.model_type}')
        if self.trained_at:
            print(f'   Trained at: {self.trained_at}')
        
        return self
    
    def get_feature_importance(self):
        """Feature importance değerlerini al"""
        if self.model is None:
            raise ValueError('Model eğitilmemiş!')
        
        feature_names = [
            'risk_score',
            'risk_category',
            'basic_click_rate',
            'urgent_click_rate',
            'custom_click_rate',
            'recent_click_rate',
            'trend',
            'total_campaigns',
            'overall_click_rate',
            'overall_open_rate'
        ]
        
        importances = []
        for estimator in self.model.estimators_:
            if hasattr(estimator, 'feature_importances_'):
                importances.append(estimator.feature_importances_)
        
        if importances:
            avg_importance = np.mean(importances, axis=0)
            return dict(zip(feature_names, avg_importance.tolist()))
        
        return None
