import { generateUploadButton, generateUploadDropzone } from '@uploadthing/react';

export const UploadButton = generateUploadButton({
  url: process.env.REACT_APP_UPLOADTHING_URL || '/api/uploadthing',
});

export const UploadDropzone = generateUploadDropzone({
  url: process.env.REACT_APP_UPLOADTHING_URL || '/api/uploadthing',
});
