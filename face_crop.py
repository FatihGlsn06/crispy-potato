#!/usr/bin/env python3
"""
Yüz Gizleme Scripti
-------------------
Göz seviyesinden yukarısını kırparak kimliği gizler.
Çene, dudak, burun görünür kalır - ürün odaklı gösterim için ideal.
"""

import cv2
import mediapipe as mp
import numpy as np
from pathlib import Path
import argparse
import sys


def setup_face_mesh():
    """MediaPipe Face Mesh başlat"""
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5
    )
    return face_mesh


def get_eye_level(image, face_mesh):
    """
    Yüzdeki göz seviyesini tespit et
    Returns: göz seviyesi y koordinatı veya None
    """
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb_image)

    if not results.multi_face_landmarks:
        return None

    landmarks = results.multi_face_landmarks[0]
    h, w = image.shape[:2]

    # Göz landmark indeksleri (MediaPipe Face Mesh)
    # Sol göz üst: 159, alt: 145
    # Sağ göz üst: 386, alt: 374
    # Göz ortası için kullanacağız
    left_eye_indices = [159, 145, 133, 33]  # Sol göz çevresi
    right_eye_indices = [386, 374, 362, 263]  # Sağ göz çevresi

    eye_y_coords = []

    for idx in left_eye_indices + right_eye_indices:
        landmark = landmarks.landmark[idx]
        eye_y_coords.append(landmark.y * h)

    # Gözlerin ortalama y pozisyonu
    eye_level = int(np.mean(eye_y_coords))

    return eye_level


def crop_above_eyes(image, eye_level, margin_above=10):
    """
    Göz seviyesinden yukarısını kırp
    margin_above: gözlerin biraz üstünden kırpmak için piksel cinsinden pay
    """
    h, w = image.shape[:2]

    # Kırpma noktası: göz seviyesinin biraz üstü
    crop_y = max(0, eye_level - margin_above)

    # Göz seviyesinden aşağısını al
    cropped = image[crop_y:h, 0:w]

    return cropped


def process_image(input_path, output_path, face_mesh, margin=10):
    """
    Tek bir görseli işle
    Returns: (başarılı, mesaj)
    """
    try:
        # Görsel yükle
        image = cv2.imread(str(input_path))
        if image is None:
            return False, f"Görsel yüklenemedi: {input_path}"

        # Göz seviyesini bul
        eye_level = get_eye_level(image, face_mesh)

        if eye_level is None:
            return False, f"Yüz tespit edilemedi: {input_path}"

        # Kırp
        cropped = crop_above_eyes(image, eye_level, margin)

        # Kaydet
        cv2.imwrite(str(output_path), cropped)

        return True, f"✓ {input_path.name} -> {output_path.name}"

    except Exception as e:
        return False, f"Hata ({input_path.name}): {str(e)}"


def process_folder(input_folder, output_folder, margin=10):
    """
    Klasördeki tüm jpg/png dosyalarını işle
    """
    input_path = Path(input_folder)
    output_path = Path(output_folder)

    # Output klasörü oluştur
    output_path.mkdir(parents=True, exist_ok=True)

    # Desteklenen formatlar
    extensions = ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']

    # Tüm görselleri bul
    image_files = []
    for ext in extensions:
        image_files.extend(input_path.glob(ext))

    if not image_files:
        print(f"❌ '{input_folder}' klasöründe görsel bulunamadı!")
        return

    print(f"📁 {len(image_files)} görsel bulundu")
    print(f"📂 Çıktı klasörü: {output_folder}")
    print("-" * 50)

    # Face mesh başlat
    face_mesh = setup_face_mesh()

    success_count = 0
    fail_count = 0

    for img_file in image_files:
        # Çıktı dosya yolu
        out_file = output_path / f"cropped_{img_file.name}"

        success, message = process_image(img_file, out_file, face_mesh, margin)
        print(message)

        if success:
            success_count += 1
        else:
            fail_count += 1

    face_mesh.close()

    print("-" * 50)
    print(f"✅ Başarılı: {success_count}")
    print(f"❌ Başarısız: {fail_count}")


def main():
    parser = argparse.ArgumentParser(
        description='Göz seviyesinden yukarısını kırparak kimliği gizle'
    )
    parser.add_argument(
        'input',
        help='Girdi klasörü (jpg/png dosyaları içeren)'
    )
    parser.add_argument(
        '-o', '--output',
        default='output_cropped',
        help='Çıktı klasörü (varsayılan: output_cropped)'
    )
    parser.add_argument(
        '-m', '--margin',
        type=int,
        default=10,
        help='Göz üstü pay (piksel, varsayılan: 10)'
    )

    args = parser.parse_args()

    # Girdi klasörü var mı kontrol et
    if not Path(args.input).exists():
        print(f"❌ Girdi klasörü bulunamadı: {args.input}")
        sys.exit(1)

    process_folder(args.input, args.output, args.margin)


if __name__ == '__main__':
    main()
