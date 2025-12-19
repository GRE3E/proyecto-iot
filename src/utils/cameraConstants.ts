/**
 * Camera-related constants
 * Centralized configuration for camera operations
 */

/**
 * Default camera resolution
 */
export const CAMERA_WIDTH = 640;
export const CAMERA_HEIGHT = 480;

/**
 * Maximum number of photos for face recognition
 */
export const MAX_FACE_PHOTOS = 5;

/**
 * Camera initialization delay (milliseconds)
 */
export const CAMERA_INIT_DELAY_MS = 300;

/**
 * Camera constraint configurations
 * Ordered by preference: user-facing, environment, fallback
 */
export const CAMERA_CONSTRAINTS = {
  userFacing: {
    video: { width: CAMERA_WIDTH, height: CAMERA_HEIGHT, facingMode: "user" },
  },
  environment: {
    video: {
      width: CAMERA_WIDTH,
      height: CAMERA_HEIGHT,
      facingMode: "environment",
    },
  },
  fallback: {
    video: true,
  },
} as const;

/**
 * JPEG quality for captured photos (0.0 - 1.0)
 */
export const JPEG_QUALITY = 0.9;
