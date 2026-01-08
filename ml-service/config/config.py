"""
ML Servisi Konfigürasyonu
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Model ayarları
MODEL_PATH = os.getenv('MODEL_PATH', './models/training_need_model.pkl')
MODEL_VERSION = '1.0.0'

# Eğitim kategorileri
TRAINING_CATEGORIES = [
    'phishing-basics',
    'urgent-emails',
    'link-security',
    'social-engineering',
    'company-policies',
    'advanced-threats',
    'time-based-threats'
]

# Model hyperparameters
HYPERPARAMETERS = {
    'n_estimators': 100,
    'max_depth': 10,
    'min_samples_split': 5,
    'min_samples_leaf': 2,
    'random_state': 42
}

# Feature importance weights
FEATURE_WEIGHTS = {
    'risk_score': 0.3,
    'risk_category': 0.2,
    'campaign_stats': 0.3,
    'recent_trend': 0.2
}

# Prediction threshold
PREDICTION_THRESHOLD = 0.3

