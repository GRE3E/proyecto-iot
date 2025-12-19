import { useEffect, useRef, useState } from "react";
import { getValidAccessToken } from "../services/authService";

interface UseCameraStreamOptions {
  cameraId: string;
  enabled: boolean;
  apiBaseUrl?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function getToken(): Promise<string | null> {
  return await getValidAccessToken();
}

export function useCameraStream({
  cameraId,
  enabled,
  apiBaseUrl = API_BASE_URL,
}: UseCameraStreamOptions) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Cleanup when disabled
      if (previousBlobUrlRef.current) {
        URL.revokeObjectURL(previousBlobUrlRef.current);
        previousBlobUrlRef.current = null;
      }
      setImageUrl(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Token se obtiene dentro de startStream para evitar await en el tope del efecto

    // Create new abort controller for this stream
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    setError(null);

    const streamUrl = `${apiBaseUrl}/cameras/${cameraId}/stream`;

    // Start streaming
    const startStream = async () => {
      try {
        const tokenInitial = await getToken();
        if (!tokenInitial) {
          setError("No authentication token available");
          setIsLoading(false);
          return;
        }
        let response = await fetch(streamUrl, {
          headers: { Authorization: `Bearer ${tokenInitial}` },
          signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            const newToken = await getToken();
            if (!newToken)
              throw new Error("Authentication failed. Please login again.");
            response = await fetch(streamUrl, {
              headers: { Authorization: `Bearer ${newToken}` },
              signal,
            });
          }
          if (!response.ok)
            throw new Error(`Failed to start stream: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const boundary = "frame";
        let buffer = new Uint8Array(0);

        // Read stream chunks
        while (true) {
          const { done, value } = await reader.read();

          if (done || signal.aborted) {
            break;
          }

          // Append new data to buffer
          const newBuffer = new Uint8Array(buffer.length + value.length);
          newBuffer.set(buffer);
          newBuffer.set(value, buffer.length);
          buffer = newBuffer;

          // Look for JPEG boundaries
          const boundaryIndex = findBoundary(buffer, boundary);
          if (boundaryIndex !== -1) {
            // Extract JPEG data
            const jpegData = extractJpegData(buffer, boundaryIndex);
            if (jpegData) {
              // Revoke previous blob URL to prevent memory leaks
              if (previousBlobUrlRef.current) {
                URL.revokeObjectURL(previousBlobUrlRef.current);
              }

              // Create new blob URL - Fixed TypeScript error
              const blob = new Blob([jpegData as BlobPart], {
                type: "image/jpeg",
              });
              const blobUrl = URL.createObjectURL(blob);
              previousBlobUrlRef.current = blobUrl;
              setImageUrl(blobUrl);
              setIsLoading(false);
            }

            // Remove processed data from buffer
            buffer = buffer.slice(boundaryIndex + boundary.length);
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Stream error:", err);
          setError(err.message || "Failed to stream camera");
          setIsLoading(false);
        }
      }
    };

    startStream();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (previousBlobUrlRef.current) {
        URL.revokeObjectURL(previousBlobUrlRef.current);
        previousBlobUrlRef.current = null;
      }
    };
  }, [cameraId, enabled, apiBaseUrl]);

  return { imageUrl, error, isLoading };
}

// Helper function to find boundary in buffer
function findBoundary(buffer: Uint8Array, boundary: string): number {
  const boundaryBytes = new TextEncoder().encode(`--${boundary}`);
  for (let i = 0; i <= buffer.length - boundaryBytes.length; i++) {
    let found = true;
    for (let j = 0; j < boundaryBytes.length; j++) {
      if (buffer[i + j] !== boundaryBytes[j]) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
}

// Helper function to extract JPEG data from buffer
function extractJpegData(
  buffer: Uint8Array,
  boundaryIndex: number
): Uint8Array | null {
  // Look for JPEG start marker (0xFF 0xD8)
  let jpegStart = -1;
  for (let i = boundaryIndex; i < buffer.length - 1; i++) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd8) {
      jpegStart = i;
      break;
    }
  }

  if (jpegStart === -1) return null;

  // Look for JPEG end marker (0xFF 0xD9)
  let jpegEnd = -1;
  for (let i = jpegStart + 2; i < buffer.length - 1; i++) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) {
      jpegEnd = i + 2;
      break;
    }
  }

  if (jpegEnd === -1) return null;

  return buffer.slice(jpegStart, jpegEnd);
}
