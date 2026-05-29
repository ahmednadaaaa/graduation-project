import cv2
import numpy as np

def _fallback_detect(image: np.ndarray) -> np.ndarray | None:
    # Basic Haar Cascade fallback if everything else fails
    try:
        # Load pre-trained face detector
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) > 0:
            (x, y, w, h) = faces[0]
            face_crop = image[y:y+h, x:x+w]
            return cv2.resize(face_crop, (160, 160))
    except Exception as e:
        print(f"Fallback detector error: {e}")
    return None

def detect_and_crop_face(image: np.ndarray) -> np.ndarray | None:
    """
    بنجرب 4 backends مختلفين
    1. face_recognition (أكثر استقراراً في البيئة الحالية)
    2. deepface (opencv, ssd, mtcnn)
    3. Haar Cascade (fallback أخير)
    """
    
    # 1. بنجرب أولاً face_recognition library لأنها مثبتة وشغالة
    try:
        import face_recognition
        face_locations = face_recognition.face_locations(image, model='hog')
        if face_locations:
            print('✅ Face found with face_recognition')
            (top, right, bottom, left) = face_locations[0]
            face_crop = image[top:bottom, left:right]
            return cv2.resize(face_crop, (160, 160))
    except Exception as e:
        print(f'❌ face_recognition backend failed: {e}')

    # 2. بنجرب DeepFace لو موجودة وشغالة
    backends = ['opencv', 'ssd', 'mtcnn']
    for backend in backends:
        try:
            from deepface import DeepFace
            faces = DeepFace.extract_faces(
                img_path=image,
                detector_backend=backend,
                enforce_detection=True,
                align=True,
            )

            if faces:
                print(f'✅ Face found with {backend}')
                largest   = max(
                    faces,
                    key=lambda f: f['facial_area']['w'] * f['facial_area']['h']
                )
                face_array = (largest['face'] * 255).astype(np.uint8)
                return cv2.resize(face_array, (160, 160))

        except Exception as e:
            # بنقلل الرغي لو المشكلة في tensorflow نفسه
            if "tf-keras" in str(e):
                print(f'⚠️ DeepFace/Tensorflow needs tf-keras. Skipping DeepFace backends.')
                break
            print(f'❌ {backend} failed: {e}')
            continue

    # 3. آخر محاولة بـ Haar Cascade
    print('Trying Haar Cascade fallback...')
    return _fallback_detect(image)
