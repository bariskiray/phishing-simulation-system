"""
ML Servisi - Eğitim Gerekliliği Analizi
Flask tabanlı REST API servisi
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
model_version = '1.0.0'
model_trained_at = None

def load_model():
    """Model ve preprocessor'ı yükle"""
    global model, preprocessor, model_trained_at
    
    try:
        if os.path.exists(MODEL_PATH):
            model_data = joblib.load(MODEL_PATH)
            model = model_data.get('model')
            preprocessor = model_data.get('preprocessor')
            model_version = model_data.get('version', '1.0.0')
            model_trained_at = model_data.get('trained_at')
            print(f'✅ Model yüklendi: {MODEL_PATH}')
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
        'model_path': MODEL_PATH
    })

@app.route('/ml/training-need/predict', methods=['POST'])
def predict():
    """Eğitim gerekliliği tahmini"""
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Request body gereklidir'
            }), 400
        
        # Feature extraction
        features = extract_features(data)
        
        # Model yoksa fallback öneriler döndür
        if model is None:
            return jsonify(get_fallback_predictions(data))
        
        # Preprocessing
        if preprocessor:
            features_processed = preprocessor.transform([features])
        else:
            features_processed = [features]
        
        # Prediction - MultiOutputClassifier için özel işlem
        try:
            # MultiOutputClassifier.predict_proba her output için ayrı array döndürür
            predictions_proba = model.predict_proba(features_processed)
            
            # Her output'un pozitif sınıf olasılığını al
            predictions = []
            for output_proba in predictions_proba:
                # output_proba shape: (n_samples, n_classes)
                # Pozitif sınıf (index 1) olasılığını al
                if len(output_proba[0]) > 1:
                    predictions.append(float(output_proba[0][1]))  # Pozitif sınıf olasılığı
                else:
                    predictions.append(float(output_proba[0][0]))  # Tek sınıf varsa
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
        
        # Öncelik eşikleri
        threshold = 0.3
        
        training_needs = []
        for i, category in enumerate(categories):
            if i < len(predictions):
                priority = float(predictions[i])
                if priority >= threshold:
                    training_needs.append({
                        'category': category,
                        'priority': priority,
                        'reason': get_reason(category, data, priority),
                        'estimatedDuration': get_estimated_duration(category, priority)
                    })
        
        # Önceliğe göre sırala
        training_needs.sort(key=lambda x: x['priority'], reverse=True)
        
        # Genel öncelik
        overall_priority = max([n['priority'] for n in training_needs]) if training_needs else 0.0
        
        # Önerilen sıra
        recommended_order = [n['category'] for n in training_needs]
        
        return jsonify({
            'trainingNeeds': training_needs,
            'overallPriority': float(overall_priority),
            'recommendedOrder': recommended_order,
            'modelVersion': model_version,
            'confidence': 0.85  # Model confidence
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
                features = extract_features(user_data)
                
                if model is None:
                    prediction = get_fallback_predictions(user_data)
                else:
                    # Preprocessing ve prediction
                    try:
                        if preprocessor:
                            features_processed = preprocessor.transform([features])
                        else:
                            features_processed = [features]
                        
                        # MultiOutputClassifier için özel işlem
                        predictions_proba = model.predict_proba(features_processed)
                        predictions = []
                        for output_proba in predictions_proba:
                            if len(output_proba[0]) > 1:
                                predictions.append(float(output_proba[0][1]))
                            else:
                                predictions.append(float(output_proba[0][0]))
                        
                        categories = [
                            'phishing-basics',
                            'urgent-emails',
                            'link-security',
                            'social-engineering',
                            'company-policies',
                            'advanced-threats',
                            'time-based-threats'
                        ]
                        
                        threshold = 0.3
                        training_needs = []
                        
                        for i, category in enumerate(categories):
                            if i < len(predictions):
                                priority = float(predictions[i])
                                if priority >= threshold:
                                    training_needs.append({
                                        'category': category,
                                        'priority': priority,
                                        'reason': get_reason(category, user_data, priority),
                                        'estimatedDuration': get_estimated_duration(category, priority)
                                    })
                        
                        training_needs.sort(key=lambda x: x['priority'], reverse=True)
                        overall_priority = max([n['priority'] for n in training_needs]) if training_needs else 0.0
                        
                        prediction = {
                            'trainingNeeds': training_needs,
                            'overallPriority': float(overall_priority),
                            'recommendedOrder': [n['category'] for n in training_needs],
                            'modelVersion': model_version,
                            'confidence': 0.85
                        }
                    except Exception as pred_error:
                        print(f'⚠️ Kullanıcı {user_data.get("userId")} prediction hatası, fallback kullanılıyor: {str(pred_error)}')
                        prediction = get_fallback_predictions(user_data)
                
                results.append({
                    'userId': user_data.get('userId'),
                    **prediction
                })
            except Exception as e:
                print(f'❌ Kullanıcı {user_data.get("userId")} prediction hatası: {str(e)}')
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
    """Feature extraction"""
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
    trend_encoded = 1 if recent_trend.get('trend') == 'increasing' else 0
    
    # Summary features
    total_campaigns = summary.get('totalCampaigns', 0)
    overall_click_rate = summary.get('clickRate', 0) / 100
    overall_open_rate = summary.get('openRate', 0) / 100
    
    # Feature vector
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
    reasons = {
        'phishing-basics': 'Genel phishing farkındalığı eksik',
        'urgent-emails': 'Acil e-posta kampanyalarına düşme tespit edildi',
        'link-security': 'Link güvenliği konusunda eğitim gerekli',
        'social-engineering': 'Sosyal mühendislik saldırılarına karşı eğitim önerilir',
        'company-policies': 'Şirket güvenlik politikaları eğitimi gerekli',
        'advanced-threats': 'Gelişmiş tehditlere karşı eğitim önerilir',
        'time-based-threats': 'Zaman bazlı tehdit pattern\'leri tespit edildi'
    }
    
    base_reason = reasons.get(category, 'Eğitim gerekli')
    
    if priority >= 0.8:
        return f'Yüksek öncelik: {base_reason}'
    elif priority >= 0.6:
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
        return int(base * 1.5)  # Yüksek öncelik = daha uzun
    elif priority >= 0.6:
        return base
    else:
        return int(base * 0.8)  # Düşük öncelik = daha kısa

def get_fallback_predictions(data):
    """Fallback öneriler (model yoksa)"""
    risk_score = data.get('riskScore', 0)
    risk_category = data.get('riskCategory', 'Orta')
    campaign_stats = data.get('campaignStats', {})
    
    training_needs = []
    
    # Risk bazlı öneriler
    if risk_category == 'Kritik' or risk_score >= 76:
        training_needs.append({
            'category': 'phishing-basics',
            'priority': 0.95,
            'reason': 'Kritik risk seviyesi - Acil temel eğitim gerekli',
            'estimatedDuration': 45,
            'riskBased': True
        })
        training_needs.append({
            'category': 'urgent-emails',
            'priority': 0.90,
            'reason': 'Yüksek risk - Acil e-posta tanıma eğitimi gerekli',
            'estimatedDuration': 30,
            'riskBased': True
        })
    elif risk_category == 'Yüksek' or risk_score >= 51:
        training_needs.append({
            'category': 'phishing-basics',
            'priority': 0.80,
            'reason': 'Yüksek risk seviyesi - Temel eğitim önerilir',
            'estimatedDuration': 30,
            'riskBased': True
        })
    elif risk_category == 'Orta' or risk_score >= 26:
        training_needs.append({
            'category': 'phishing-basics',
            'priority': 0.60,
            'reason': 'Orta risk seviyesi - Önleyici eğitim önerilir',
            'estimatedDuration': 20,
            'riskBased': True
        })
    else:
        training_needs.append({
            'category': 'phishing-basics',
            'priority': 0.40,
            'reason': 'Düşük risk - Temel farkındalık eğitimi',
            'estimatedDuration': 15,
            'riskBased': True
        })
    
    # Kampanya bazlı öneriler
    if campaign_stats.get('urgent'):
        urgent_total = campaign_stats['urgent'].get('total', 0)
        urgent_clicked = campaign_stats['urgent'].get('clicked', 0)
        if urgent_total > 0:
            urgent_rate = urgent_clicked / urgent_total
            if urgent_rate > 0.3:
                training_needs.append({
                    'category': 'urgent-emails',
                    'priority': 0.85,
                    'reason': 'Urgent kampanyalara yüksek düşme oranı',
                    'estimatedDuration': 30,
                    'campaignBased': True
                })
    
    if campaign_stats.get('basic'):
        basic_total = campaign_stats['basic'].get('total', 0)
        basic_clicked = campaign_stats['basic'].get('clicked', 0)
        if basic_total > 0:
            basic_rate = basic_clicked / basic_total
            if basic_rate > 0.2:
                training_needs.append({
                    'category': 'phishing-basics',
                    'priority': 0.75,
                    'reason': 'Basic kampanyalara düşme tespit edildi',
                    'estimatedDuration': 30,
                    'campaignBased': True
                })
    
    # Önceliğe göre sırala ve duplicate'leri kaldır
    seen_categories = set()
    unique_needs = []
    for need in sorted(training_needs, key=lambda x: x['priority'], reverse=True):
        if need['category'] not in seen_categories:
            unique_needs.append(need)
            seen_categories.add(need['category'])
        else:
            # Daha yüksek öncelikli olanı tut
            for i, existing in enumerate(unique_needs):
                if existing['category'] == need['category'] and need['priority'] > existing['priority']:
                    unique_needs[i] = need
                    break
    
    overall_priority = max([n['priority'] for n in unique_needs]) if unique_needs else 0.0
    
    return {
        'trainingNeeds': unique_needs,
        'overallPriority': float(overall_priority),
        'recommendedOrder': [n['category'] for n in unique_needs],
        'modelVersion': 'fallback-1.0',
        'confidence': 0.70
    }

if __name__ == '__main__':
    # Model yükle
    load_model()
    
    print(f'🚀 ML Servisi başlatılıyor...')
    print(f'   Port: {ML_SERVICE_PORT}')
    print(f'   Model: {"Yüklendi" if model else "Fallback modu"}')
    
    app.run(host='0.0.0.0', port=ML_SERVICE_PORT, debug=True)

