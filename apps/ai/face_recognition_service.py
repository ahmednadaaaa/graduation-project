import numpy as np
import json
import logging
from PIL import Image
import io
from apps.ai_service.detector import detect_and_crop_face

# Logger علشان نتابع اللي بيحصل
logger = logging.getLogger(__name__)


class FaceRecognitionService:
    """
    الـ Service ده مسؤول عن كل عمليات الـ Face Recognition

    الفكرة الأساسية:
    - كل وجه ممكن يتحول لـ "embedding" = array من 128 رقم
    - الـ array دي بتمثل ملامح الوجه رياضياً
    - لما نشوف وجه جديد، نحول الأرقام بتاعته
      ونقارنها بالأرقام المحفوظة
    - لو الفرق صغير → نفس الشخص
    """

    # حد الثقة — لو المسافة أقل من ده، الوجه متعرف عليه
    # القيمة 0.6 دي الـ default المناسب لـ face_recognition library
    RECOGNITION_THRESHOLD = 0.6

    def _import_face_recognition(self):
        """
        بيعمل import للـ face_recognition library بشكل lazy
        علشان لو مش مثبتة، الـ app تشتغل عادي بس بدون AI
        """
        try:
            import face_recognition
            return face_recognition
        except (ImportError, SystemExit):
            # face_recognition بتعمل quit() (SystemExit) على Python 3.13
            # بنمسكه عشان السيرفر ميوقفش
            logger.error(
                'face_recognition غير متوافقة مع Python 3.13. '
                'استخدم Python 3.11 أو Docker.'
            )
            return None

    def extract_embedding_from_image(self, image_file):
        """
        بتاخد صورة وترجع الـ embedding بتاعتها
        """
        try:
            # اقرأ الصورة وحولها لـ numpy array
            image_bytes = image_file.read()
            pil_image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            image_array = np.array(pil_image)

            # TRY 1: Traditional face_recognition (Most stable in current environment)
            face_recognition = self._import_face_recognition()
            if face_recognition:
                # بنجرب نلاقي الوجه ونطلعه encoding في خطوة واحدة
                encodings = face_recognition.face_encodings(image_array)
                if encodings:
                    print('✅ Face embedding extracted with face_recognition')
                    return encodings[0].tolist()

            # TRY 2: New DeepFace-based detector (Fallback if above fails and env is fixed)
            cropped_face = detect_and_crop_face(image_array)
            if cropped_face is not None:
                try:
                    from deepface import DeepFace
                    # We use 'Facenet' for 128d to match the system's expected size
                    objs = DeepFace.represent(
                        img_path=cropped_face,
                        model_name="Facenet",
                        enforce_detection=False
                    )
                    if objs:
                        print('✅ Face embedding extracted with DeepFace (Facenet)')
                        return objs[0]['embedding']
                except Exception as e:
                    if "tf-keras" not in str(e):
                        logger.error(f"DeepFace embedding failed: {e}")

            logger.warning('No face found in the image by any method')
            return None

        except Exception as e:
            logger.error(f'Error extracting embedding: {str(e)}')
            return None

    def embedding_to_string(self, embedding):
        """
        حول الـ embedding (list) لـ string علشان نحفظه في الـ DB
        [0.1, 0.2, 0.3, ...] → '{"embedding": [0.1, 0.2, ...]}'
        """
        return json.dumps({'embedding': embedding})

    def string_to_embedding(self, embedding_string):
        """
        حول الـ string الـ محفوظ في الـ DB رجع لـ numpy array
        """
        data = json.loads(embedding_string)
        return np.array(data['embedding'])

    def compare_faces(self, known_embedding_string, unknown_embedding):
        """
        قارن وجهين ببعض

        known_embedding_string: الـ embedding المحفوظ في الـ DB كـ string
        unknown_embedding: الـ embedding الجديد كـ list

        بترجع:
        - (True, confidence_score) لو نفس الشخص
        - (False, distance) لو شخص تاني
        """
        face_recognition = self._import_face_recognition()
        if face_recognition is None:
            return False, 0.0

        try:
            # حول الـ string للـ numpy array
            known_embedding = self.string_to_embedding(known_embedding_string)

            # حول الـ unknown لـ numpy array
            unknown_array = np.array(unknown_embedding)

            # face_distance: بتحسب المسافة بين الوجهين
            # المسافة دي بين 0.0 و 1.0
            # 0.0 = نفس الوجه تماماً
            # 1.0 = مختلف تماماً
            distance = face_recognition.face_distance(
                [known_embedding],
                unknown_array
            )[0]

            # حول المسافة لـ confidence score
            # لو المسافة = 0.4 → confidence = 0.6 (أو 60%)
            confidence = 1.0 - float(distance)

            # لو المسافة أقل من الـ threshold → نفس الشخص
            is_match = distance < self.RECOGNITION_THRESHOLD

            return is_match, confidence

        except Exception as e:
            logger.error(f'Error comparing faces: {str(e)}')
            return False, 0.0

    def identify_student(self, image_file):
        """
        الدالة الرئيسية:
        بتاخد صورة وتدور على الطالب المقابل ليها في الـ DB

        الخطوات:
        1. استخرج الـ embedding من الصورة الجديدة
        2. جيب كل الـ embeddings المحفوظة في الـ DB
        3. قارن الصورة الجديدة بكل embedding
        4. لو لقى مطابقة → رجع بيانات الطالب

        بترجع:
        {
            'found': True/False,
            'student': StudentProfile object أو None,
            'confidence': 0.0 → 1.0,
            'error': None أو رسالة خطأ
        }
        """
        from apps.students.models import FaceImage

        result = {
            'found': False,
            'student': None,
            'confidence': 0.0,
            'error': None
        }

        # الخطوة 1: استخرج الـ embedding من الصورة
        unknown_embedding = self.extract_embedding_from_image(image_file)

        if unknown_embedding is None:
            result['error'] = 'ملقيناش وجه في الصورة'
            return result

        # الخطوة 2: جيب كل الـ FaceImages المعالجة من الـ DB
        # is_processed=True يعني عندها embedding محفوظ
        face_images = FaceImage.objects.filter(
            is_processed=True,
            student__is_face_registered=True
        ).select_related('student', 'student__user')

        if not face_images.exists():
            result['error'] = 'مفيش طلاب مسجلين في النظام'
            return result

        # الخطوة 3: قارن مع كل الـ embeddings
        best_match_student = None
        best_confidence    = 0.0

        # نعمل dictionary لتجميع الـ scores لكل طالب
        # {student_id: [confidence1, confidence2, ...]}
        student_scores = {}

        for face_image in face_images:
            # لو ملقيش embedding محفوظ، عدي
            if not face_image.face_embedding:
                continue

            is_match, confidence = self.compare_faces(
                face_image.face_embedding,
                unknown_embedding
            )

            if is_match:
                student_id = face_image.student.id

                # جمّع الـ confidence scores للطالب ده
                if student_id not in student_scores:
                    student_scores[student_id] = {
                        'student': face_image.student,
                        'scores': []
                    }
                student_scores[student_id]['scores'].append(confidence)

        # الخطوة 4: لو لقينا مطابقات، خد الطالب الأعلى confidence
        if student_scores:
            for student_id, data in student_scores.items():
                # خد متوسط الـ scores للطالب ده
                avg_confidence = sum(data['scores']) / len(data['scores'])

                if avg_confidence > best_confidence:
                    best_confidence    = avg_confidence
                    best_match_student = data['student']

            result['found']      = True
            result['student']    = best_match_student
            result['confidence'] = best_confidence

        return result

    def process_and_save_embedding(self, face_image_obj):
        """
        بتاخد FaceImage object، تعمل embedding، وتحفظه في الـ DB

        الاستخدام:
        - لما طالب يرفع صورة جديدة
        - بنستدعي الدالة دي علشان نعالج الصورة

        بترجع True لو نجح، False لو فشل
        """
        try:
            # افتح الصورة من الـ ImageField
            image_file = face_image_obj.image.open('rb')

            embedding = self.extract_embedding_from_image(image_file)

            if embedding is None:
                logger.warning(
                    f'No face found in FaceImage {face_image_obj.id}'
                )
                return False

            # احفظ الـ embedding في الـ DB
            face_image_obj.face_embedding = self.embedding_to_string(embedding)
            face_image_obj.is_processed   = True
            face_image_obj.save(update_fields=['face_embedding', 'is_processed'])

            logger.info(f'Successfully processed FaceImage {face_image_obj.id}')
            return True

        except Exception as e:
            logger.error(f'Error processing FaceImage {face_image_obj.id}: {e}')
            return False


# نعمل instance واحد بس من الـ Service (Singleton pattern)
# بدل ما نعمل object جديد كل مرة
face_recognition_service = FaceRecognitionService()
