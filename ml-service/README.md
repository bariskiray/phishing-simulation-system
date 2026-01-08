# ML Servisi - Eğitim Gerekliliği Analizi

Python tabanlı ML servisi, kampanya ve risk bazlı eğitim gerekliliği analizi yapar.

## Kurulum

```bash
cd ml-service
pip install -r requirements.txt
```

## Çalıştırma

```bash
python app.py
```

Servis `http://localhost:8000` adresinde çalışacaktır.

## Environment Variables

`.env` dosyası oluşturun:

```env
ML_SERVICE_PORT=8000
ML_SERVICE_API_KEY=your-api-key-here
MODEL_PATH=./models/training_need_model.pkl
```

## API Endpoints

- `POST /ml/training-need/predict` - Eğitim gerekliliği tahmini
- `POST /ml/training-need/batch-predict` - Toplu tahmin
- `POST /ml/training-need/train` - Model eğitimi
- `GET /ml/training-need/model-info` - Model bilgisi
- `GET /ml/training-need/health` - Servis sağlık kontrolü

