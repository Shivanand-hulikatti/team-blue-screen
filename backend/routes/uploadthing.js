const express = require('express');
const multer = require('multer');
const { UTApi } = require('uploadthing/server');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize once at module load so the SDK reads UPLOADTHING_TOKEN from env
const utapi = new UTApi();

/**
 * POST /api/uploadthing-upload
 * Direct file upload to UploadThing
 */
// router.post('/uploadthing-upload', upload.single('file'), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     // Create a File object from the buffer
//     const file = new File([req.file.buffer], req.file.originalname, {
//       type: req.file.mimetype,
//     });

//     // Upload to UploadThing
//     // const response = await utapi.uploadFiles([file]);

//     const response = await utapi.uploadFiles([
//       {
//         name: req.file.originalname,
//         type: req.file.mimetype,
//         size: req.file.size,
//         data: req.file.buffer,
//       },
//     ]);

//     if (response[0].error) {
//       throw new Error(response[0].error.message);
//     }

//     res.json({
//       fileUrl: response[0].data.ufsUrl || response[0].data.url,
//       success: true
//     });
//   } catch (err) {
//     console.error('UploadThing upload error:', err.message);
//     res.status(500).json({ error: 'Failed to upload file' });
//   }
// });
router.post('/uploadthing-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = new File(
      [req.file.buffer],
      req.file.originalname,
      { type: req.file.mimetype }
    );

    const response = await utapi.uploadFiles([file]);

    if (response[0].error) {
      throw new Error(response[0].error.message);
    }

    res.json({
      fileUrl: response[0].data.ufsUrl || response[0].data.url,
      success: true,
    });

  } catch (err) {
    console.error('UploadThing upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});


/**
 * Legacy presign endpoint - returns success to indicate direct upload should be used
 */
router.post('/uploadthing-presign', async (req, res) => {
  // Return a response indicating the client should use direct upload instead
  res.json({
    useDirectUpload: true,
    uploadEndpoint: '/api/uploadthing-upload'
  });
});

module.exports = router;
