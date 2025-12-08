import { useEffect, useRef, useState, useCallback } from "react";
import {
  CAMERA_CONSTRAINTS,
  CAMERA_WIDTH,
  CAMERA_HEIGHT,
  JPEG_QUALITY,
  CAMERA_INIT_DELAY_MS,
} from "../utils/cameraConstants";

interface UseCameraCaptureOptions {
  enabled: boolean;
  onPhotoCapture?: (blob: Blob) => void;
}

/**
 * Hook for managing camera capture functionality
 * Handles camera initialization, cleanup, and photo capture
 */
export function useCameraCapture({
  enabled,
  onPhotoCapture,
}: UseCameraCaptureOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Try to get media stream with given constraints
   */
  const tryGetStream = useCallback(
    async (
      constraints: MediaStreamConstraints
    ): Promise<MediaStream | null> => {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        return null;
      }
    },
    []
  );

  /**
   * Stop camera stream and cleanup resources
   */
  const stopCamera = useCallback(() => {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    } catch (err) {
      console.error("Error stopping camera:", err);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  /**
   * Start camera stream with fallback constraints
   */
  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      setError(null);

      // Try constraints in order of preference
      let stream =
        (await tryGetStream(CAMERA_CONSTRAINTS.userFacing)) ||
        (await tryGetStream(CAMERA_CONSTRAINTS.environment)) ||
        (await tryGetStream(CAMERA_CONSTRAINTS.fallback));

      if (!stream) {
        setError("No se pudo acceder a la cámara");
        return false;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Set video properties
        try {
          (videoRef.current as any).muted = true;
          (videoRef.current as any).playsInline = true;
          (videoRef.current as any).autoplay = true;
        } catch (err) {
          console.warn("Error setting video properties:", err);
        }

        // Play video
        try {
          await videoRef.current.play();
          setIsReady(true);
          return true;
        } catch (err) {
          console.error("Error playing video:", err);
          setError("Error al reproducir video de cámara");
          return false;
        }
      }

      return false;
    } catch (err) {
      console.error("Error starting camera:", err);
      setError("Error al iniciar la cámara");
      return false;
    }
  }, [stopCamera, tryGetStream]);

  /**
   * Capture photo from video stream
   */
  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video) {
      setError("Video no disponible");
      return null;
    }

    // If video not ready, try to start camera
    if (!video.videoWidth || !video.videoHeight || !video.srcObject) {
      const started = await startCamera();
      if (!started) {
        return null;
      }
      // Wait for camera to initialize
      await new Promise((resolve) => setTimeout(resolve, CAMERA_INIT_DELAY_MS));
    }

    try {
      const canvas = document.createElement("canvas");
      const width = video.videoWidth || CAMERA_WIDTH;
      const height = video.videoHeight || CAMERA_HEIGHT;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Error al crear contexto de canvas");
        return null;
      }

      ctx.drawImage(video, 0, 0, width, height);

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              onPhotoCapture?.(blob);
              resolve(blob);
            } else {
              setError("Error al crear imagen");
              resolve(null);
            }
          },
          "image/jpeg",
          JPEG_QUALITY
        );
      });
    } catch (err) {
      console.error("Error capturing photo:", err);
      setError("Error al capturar foto");
      return null;
    }
  }, [startCamera, onPhotoCapture]);

  /**
   * Effect to manage camera lifecycle based on enabled state
   */
  useEffect(() => {
    if (enabled) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [enabled, startCamera, stopCamera]);

  return {
    videoRef,
    isReady,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
  };
}
