import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';

export default function AvatarCropModal({ imageFile, onCancel, onSave }) {
    const { t } = useTranslation();
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [imageSrc, setImageSrc] = useState(null);

    React.useEffect(() => {
        if (!imageFile) return;
        const url = URL.createObjectURL(imageFile);
        setImageSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [imageFile]);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            const image = new Image();
            image.src = imageSrc;
            await new Promise((resolve) => (image.onload = resolve));

            const canvas = document.createElement('canvas');
            canvas.width = croppedAreaPixels.width;
            canvas.height = croppedAreaPixels.height;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            );

            canvas.toBlob((blob) => {
                if (blob) {
                    onSave(blob);
                }
            }, 'image/jpeg', 0.95);
        } catch (e) {
            console.error('Failed to crop image', e);
        }
    };

    if (!imageSrc) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/55 backdrop-blur-md p-4">
            <div className="bg-[#F2F4F8] dark:bg-slate-900 w-full max-w-lg rounded-[24px] overflow-hidden shadow-[0_32px_80px_-12px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.08)] flex flex-col border-[1.5px] border-slate-300 dark:border-slate-700">
                <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-[17px] font-bold tracking-tight text-slate-950 dark:text-white">
                        {t('profile.crop_avatar_title', 'Recadrer la photo de profil')}
                    </h3>
                    <button onClick={onCancel} className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors">
                        <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                </div>
                
                <div className="relative w-full h-80 bg-slate-950">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                
                <div className="p-5 flex flex-col gap-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <span className="text-slate-600 dark:text-slate-400 text-sm font-semibold">Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-1">
                        <button onClick={onCancel} className="px-5 h-11 rounded-[13px] text-[15px] font-semibold bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors">
                            {t('common.cancel', 'Annuler')}
                        </button>
                        <button onClick={handleSave} className="px-6 h-11 rounded-[13px] text-[15px] font-semibold bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-sm transition-colors flex items-center gap-2">
                            <Check className="w-4 h-4 stroke-[2.5]" /> {t('common.validate', 'Valider')}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
