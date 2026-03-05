"""
ML Servisi - Eğitim Gerekliliği Analizi
Flask tabanlı REST API servisi
Regression modeli ile 0-1 arası priority değerleri
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import joblib
import numpy as np
from datetime import datetime

# Environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
ML_SERVICE_PORT = int(os.getenv('ML_SERVICE_PORT', 8000))
ML_SERVICE_API_KEY = os.getenv('ML_SERVICE_API_KEY', '')
MODEL_PATH = os.getenv('MODEL_PATH', './models/training_need_model.pkl')

# Model ve preprocessing objects (lazy loading)
model = None
preprocessor = None
model_version = '2.0.0'
model_trained_at = None
model_metrics = {}

def load_model():
    """Model ve preprocessor'ı yükle"""
    global model, preprocessor, model_trained_at, model_version, model_metrics
    
    try:
        if os.path.exists(MODEL_PATH):
            model_data = joblib.load(MODEL_PATH)
            model = model_data.get('model')
            preprocessor = model_data.get('preprocessor')
            model_version = model_data.get('version', '2.0.0')
            model_trained_at = model_data.get('trained_at')
            model_metrics = model_data.get('metrics', {})
            print(f'✅ Model yüklendi: {MODEL_PATH}')
            print(f'   Version: {model_version}')
            if model_metrics:
                print(f'   R² Score: {model_metrics.get("overall", {}).get("r2", "N/A")}')
            return True
        else:
            print(f'⚠️ Model dosyası bulunamadı: {MODEL_PATH}')
            return False
    except Exception as e:
        print(f'❌ Model yükleme hatası: {str(e)}')
        return False

def check_api_key():
    """API key kontrolü"""
    if not ML_SERVICE_API_KEY:
        return True  # API key yoksa kontrol etme
    
    api_key = request.headers.get('X-API-Key')
    return api_key == ML_SERVICE_API_KEY

@app.before_request
def before_request():
    """Her istekten önce API key kontrolü"""
    if request.path.startswith('/ml/') and not check_api_key():
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Geçersiz API key'
        }), 401

@app.route('/ml/training-need/health', methods=['GET'])
def health():
    """Servis sağlık kontrolü"""
    return jsonify({
        'status': 'ok',
        'version': model_version,
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/ml/training-need/model-info', methods=['GET'])
def model_info():
    """Model bilgisi"""
    return jsonify({
        'version': model_version,
        'trained_at': model_trained_at.isoformat() if model_trained_at else None,
        'model_loaded': model is not None,
        'model_path': MODEL_PATH,
        'metrics': model_metrics
    })

@app.route('/ml/training-need/predict', methods=['POST'])
def predict():
    """Eğitim gerekliliği tahmini - Regression modeli"""
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Request body gereklidir'
            }), 400
        
        # Önce gerçek verileri kontrol et
        campaign_stats = data.get('campaignStats', {})
        summary = data.get('summary', {})
        
        total_campaigns = summary.get('totalCampaigns', 0)
        total_clicked = (
            (campaign_stats.get('basic', {}).get('clicked', 0) or 0) +
            (campaign_stats.get('urgent', {}).get('clicked', 0) or 0) +
            (campaign_stats.get('custom', {}).get('clicked', 0) or 0)
        )
        
        # Hiç kampanya yoksa veya hiç tıklama yoksa - fallback kullan
        if total_campaigns == 0 or total_clicked == 0:
            print(f'ℹ️ Kullanıcının tıklaması yok (campaigns: {total_campaigns}, clicked: {total_clicked}), fallback kullanılıyor')
            return jsonify(get_fallback_predictions(data))
        
        # Feature extraction
        features = extract_features(data)
        
        # Model yoksa fallback öneriler döndür
        if model is None:
            return jsonify(get_fallback_predictions(data))
        
        # Preprocessing
        if preprocessor:
            features_processed = preprocessor.transform([features])
        else:
            features_processed = np.array([features])
        
        # Regression Prediction - direkt predict kullan
        try:
            predictions = model.predict(features_processed)[0]
            
            # Değerleri 0-1 arasına sınırla
            predictions = np.clip(predictions, 0.0, 1.0)
            
        except Exception as pred_error:
            print(f'⚠️ Model prediction hatası, fallback kullanılıyor: {str(pred_error)}')
            return jsonify(get_fallback_predictions(data))
        
        # Eğitim kategorileri
        categories = [
            'phishing-basics',
            'urgent-emails',
            'link-security',
            'social-engineering',
            'company-policies',
            'advanced-threats',
            'time-based-threats'
        ]
        
        # Training needs oluştur
        training_needs = []
        for i, category in enumerate(categories):
            priority = float(predictions[i])
            
            # Minimum threshold 0.15 - çok düşük değerler gösterme
            if priority >= 0.15:
                training_needs.append({
                    'category': category,
                    'priority': round(priority, 3),
                    'reason': get_reason(category, data, priority),
                    'estimatedDuration': get_estimated_duration(category, priority)
                })
        
        # Önceliğe göre sırala
        training_needs.sort(key=lambda x: x['priority'], reverse=True)
        
        # Genel öncelik - max ve ortalama ağırlıklı
        if training_needs:
            max_priority = max([n['priority'] for n in training_needs])
            avg_priority = sum([n['priority'] for n in training_needs]) / len(training_needs)
            overall_priority = max_priority * 0.7 + avg_priority * 0.3
        else:
            overall_priority = 0.0
        
        # Önerilen sıra
        recommended_order = [n['category'] for n in training_needs]
        
        # Confidence - model metrics'ten al
        r2_score = model_metrics.get('overall', {}).get('r2', 0.85)
        confidence = min(0.95, max(0.5, r2_score))
        
        return jsonify({
            'trainingNeeds': training_needs,
            'overallPriority': round(float(overall_priority), 3),
            'recommendedOrder': recommended_order,
            'modelVersion': model_version,
            'confidence': round(confidence, 2)
        })
        
    except Exception as e:
        print(f'❌ Prediction hatası: {str(e)}')
        return jsonify({
            'error': 'Internal Server Error',
            'message': str(e)
        }), 500

@app.route('/ml/training-need/batch-predict', methods=['POST'])
def batch_predict():
    """Toplu tahmin"""
    try:
        data = request.json
        users = data.get('users', [])
        
        if not users:
            return jsonify({
                'error': 'Bad Request',
                'message': 'users array gereklidir'
            }), 400
        
        results = []
        for user_data in users:
            try:
                # Tıklama kontrolü
                campaign_stats = user_data.get('campaignStats', {})
                summary = user_data.get('summary', {})
                
                total_campaigns = summary.get('totalCampaigns', 0)
                total_clicked = (
                    (campaign_stats.get('basic', {}).get('clicked', 0) or 0) +
                    (campaign_stats.get('urgent', {}).get('clicked', 0) or 0) +
                    (campaign_stats.get('custom', {}).get('clicked', 0) or 0)
                )
                
                # Hiç tıklama yoksa fallback
                if total_campaigns == 0 or total_clicked == 0:
                    prediction = get_fallback_predictions(user_data)
                elif model is None:
                    prediction = get_fallback_predictions(user_data)
                else:
                    # Model prediction
                    features = extract_features(user_data)
                    
                    if preprocessor:
                        features_processed = preprocessor.transform([features])
                    else:
                        features_processed = np.array([features])
                    
                    try:
                        predictions = model.predict(features_processed)[0]
                        predictions = np.clip(predictions, 0.0, 1.0)
                        
                        categories = [
                            'phishing-basics',
                            'urgent-emails',
                            'link-security',
                            'social-engineering',
                            'company-policies',
                            'advanced-threats',
                            'time-based-threats'
                        ]
                        
                        training_needs = []
                        for i, category in enumerate(categories):
                            priority = float(predictions[i])
                            if priority >= 0.15:
                                training_needs.append({
                                    'category': category,
                                    'priority': round(priority, 3),
                                    'reason': get_reason(category, user_data, priority),
                                    'estimatedDuration': get_estimated_duration(category, priority)
                                })
                        
                        training_needs.sort(key=lambda x: x['priority'], reverse=True)
                        
                        if training_needs:
                            max_priority = max([n['priority'] for n in training_needs])
                            avg_priority = sum([n['priority'] for n in training_needs]) / len(training_needs)
                            overall_priority = max_priority * 0.7 + avg_priority * 0.3
                        else:
                            overall_priority = 0.0
                        
                        r2_score = model_metrics.get('overall', {}).get('r2', 0.85)
                        confidence = min(0.95, max(0.5, r2_score))
                        
                        prediction = {
                            'trainingNeeds': training_needs,
                            'overallPriority': round(float(overall_priority), 3),
                            'recommendedOrder': [n['category'] for n in training_needs],
                            'modelVersion': model_version,
                            'confidence': round(confidence, 2)
                        }
                    except Exception as pred_error:
                        print(f'⚠️ Kullanıcı {user_data.get("userId")} prediction hatası: {str(pred_error)}')
                        prediction = get_fallback_predictions(user_data)
                
                results.append({
                    'userId': user_data.get('userId'),
                    **prediction
                })
            except Exception as e:
                print(f'❌ Kullanıcı {user_data.get("userId")} hatası: {str(e)}')
                results.append({
                    'userId': user_data.get('userId'),
                    'error': str(e)
                })
        
        return jsonify({
            'results': results,
            'count': len(results)
        })
        
    except Exception as e:
        print(f'❌ Batch prediction hatası: {str(e)}')
        return jsonify({
            'error': 'Internal Server Error',
            'message': str(e)
        }), 500

def extract_features(data):
    """Feature extraction - 10 özellik"""
    risk_score = data.get('riskScore', 0)
    risk_category = data.get('riskCategory', 'Orta')
    campaign_stats = data.get('campaignStats', {})
    recent_trend = data.get('recentTrend', {})
    summary = data.get('summary', {})
    
    # Risk category encoding
    risk_category_map = {'Düşük': 0, 'Orta': 1, 'Yüksek': 2, 'Kritik': 3}
    risk_category_encoded = risk_category_map.get(risk_category, 1)
    
    # Campaign stats features
    basic_click_rate = 0
    urgent_click_rate = 0
    custom_click_rate = 0
    
    if campaign_stats.get('basic'):
        basic_total = campaign_stats['basic'].get('total', 0)
        basic_clicked = campaign_stats['basic'].get('clicked', 0)
        basic_click_rate = basic_clicked / basic_total if basic_total > 0 else 0
    
    if campaign_stats.get('urgent'):
        urgent_total = campaign_stats['urgent'].get('total', 0)
        urgent_clicked = campaign_stats['urgent'].get('clicked', 0)
        urgent_click_rate = urgent_clicked / urgent_total if urgent_total > 0 else 0
    
    if campaign_stats.get('custom'):
        custom_total = campaign_stats['custom'].get('total', 0)
        custom_clicked = campaign_stats['custom'].get('clicked', 0)
        custom_click_rate = custom_clicked / custom_total if custom_total > 0 else 0
    
    # Recent trend
    recent_click_rate = recent_trend.get('clickRate', 0) / 100
    trend = recent_trend.get('trend', 'stable')
    trend_encoded = 1 if trend == 'increasing' else (0 if trend == 'stable' else -0.5)
    
    # Summary features
    total_campaigns = summary.get('totalCampaigns', 0)
    overall_click_rate = summary.get('clickRate', 0) / 100
    overall_open_rate = summary.get('openRate', 0) / 100
    
    # Feature vector (10 özellik)
    features = [
        risk_score / 100,  # Normalize to 0-1
        risk_category_encoded / 3,  # Normalize to 0-1
        basic_click_rate,
        urgent_click_rate,
        custom_click_rate,
        recent_click_rate,
        trend_encoded,
        total_campaigns / 100,  # Normalize
        overall_click_rate,
        overall_open_rate
    ]
    
    return features

def get_reason(category, data, priority):
    """Eğitim gerekliliği nedeni"""
    risk_score = data.get('riskScore', 0)
    
    reasons = {
        'phishing-basics': 'Genel phishing farkındalığı eğitimi',
        'urgent-emails': 'Acil e-posta tanıma ve dikkat eğitimi',
        'link-security': 'Link güvenliği ve URL doğrulama eğitimi',
        'social-engineering': 'Sosyal mühendislik saldırıları farkındalığı',
        'company-policies': 'Şirket güvenlik politikaları eğitimi',
        'advanced-threats': 'Gelişmiş tehdit tanıma eğitimi',
        'time-based-threats': 'Zaman bazlı tehdit pattern eğitimi'
    }
    
    base_reason = reasons.get(category, 'Güvenlik eğitimi gerekli')
    
    # Priority bazlı prefix
    if priority >= 0.8:
        return f'Kritik: {base_reason}'
    elif priority >= 0.6:
        return f'Yüksek öncelik: {base_reason}'
    elif priority >= 0.35:
        return f'Orta öncelik: {base_reason}'
    else:
        return f'Önleyici: {base_reason}'

def get_estimated_duration(category, priority):
    """Tahmini eğitim süresi (dakika)"""
    base_durations = {
        'phishing-basics': 30,
        'urgent-emails': 25,
        'link-security': 20,
        'social-engineering': 35,
        'company-policies': 30,
        'advanced-threats': 45,
        'time-based-threats': 25
    }
    
    base = base_durations.get(category, 30)
    
    # Önceliğe göre süre ayarla
    if priority >= 0.8:
        return int(base * 1.5)  # Kritik = daha kapsamlı
    elif priority >= 0.6:
        return base
    elif priority >= 0.35:
        return int(base * 0.8)
    else:
        return int(base * 0.6)  # Düşük öncelik = kısa

def get_fallback_predictions(data):
    """Fallback öneriler - gerçek veriye dayalı"""
    risk_score = data.get('riskScore', 0)
    risk_category = data.get('riskCategory', 'Orta')
    campaign_stats = data.get('campaignStats', {})
    summary = data.get('summary', {})
    
    training_needs = []
    
    # Toplam kampanya ve tıklama
    total_campaigns = summary.get('totalCampaigns', 0)
    total_clicked = (
        (campaign_stats.get('basic', {}).get('clicked', 0) or 0) +
        (campaign_stats.get('urgent', {}).get('clicked', 0) or 0) +
        (campaign_stats.get('custom', {}).get('clicked', 0) or 0)
    )
    
    # Hiç kampanya yoksa
    if total_campaigns == 0:
        training_needs.append({
            'category': 'phishing-basics',
            'priority': 0.15,
            'reason': 'Henüz test edilmemiş - Genel farkındalık eğitimi önerilir',
            'estimatedDuration': 15
        })
        return {
            'trainingNeeds': training_needs,
            'overallPriority': 0.15,
            'recommendedOrder': ['phishing-basics'],
            'modelVersion': 'fallback-2.0',
            'confidence': 0.50
        }
    
    # Hiç tıklama yoksa
    if total_clicked == 0:
        training_needs.append({
            'category': 'phishing-basics',
            'priority': 0.20,
            'reason': 'Düşük risk - Koruyucu farkındalık eğitimi',
            'estimatedDuration': 15
        })
        return {
            'trainingNeeds': training_needs,
            'overallPriority': 0.20,
            'recommendedOrder': ['phishing-basics'],
            'modelVersion': 'fallback-2.0',
            'confidence': 0.70
        }
    
    # Risk kategorisine göre priority
    if risk_category == 'Kritik' or risk_score >= 76:
        training_needs.append({
            'category': 'phishing-basics',
            'priority': 0.90,
            'reason': 'Kritik: Acil temel güvenlik eğitimi gerekli',
            'estimatedDuration': 45
        })
        training_needs.append({
            'category': 'urgent-emails',
            'priority': 0.85,
            'reason': 'Kritik: Acil e-posta tanıma eğitimi',
            'estimatedDuration': 35
        })
        overall_priority = 0.88
    elif risk_category == 'Yüksek' or risk_score >= 51:
        training_needs.append({
            'category': 'phishing-basics',
            'priority': 0.75,
            'reason': 'Yüksek öncelik: Temel güvenlik eğitimi',
            'estimatedDuration': 30
        })
        training_needs.append({
            'category': 'link-security',
            'priority': 0.65,
            'reason': 'Yüksek öncelik: Link güvenliği eğitimi',
            'estimatedDuration': 25
        })
        overall_priority = 0.72
    elif risk_category == 'Orta' or risk_score >= 26:
        training_needs.append({
            'category': 'phishing-basics',
            'priority': 0.50,
            'reason': 'Orta öncelik: Güvenlik farkındalığı eğitimi',
            'estimatedDuration': 20
        })
        overall_priority = 0.50
    else:
        training_needs.append({
            'category': 'phishing-basics',
            'priority': 0.30,
            'reason': 'Önleyici: Temel farkındalık eğitimi',
            'estimatedDuration': 15
        })
        overall_priority = 0.30
    
    return {
        'trainingNeeds': training_needs,
        'overallPriority': overall_priority,
        'recommendedOrder': [n['category'] for n in training_needs],
        'modelVersion': 'fallback-2.0',
        'confidence': 0.70
    }

if __name__ == '__main__':
    # Model yükle
    load_model()
    
    print(f'🚀 ML Servisi başlatılıyor...')
    print(f'   Port: {ML_SERVICE_PORT}')
    print(f'   Model: {"Yüklendi" if model else "Fallback modu"}')
    print(f'   Version: {model_version}')
    
    app.run(host='0.0.0.0', port=ML_SERVICE_PORT, debug=True)
