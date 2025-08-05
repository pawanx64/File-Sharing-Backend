const express = require('express');
const multer = require('multer');
const FileModel = require('../Models/FileModel');
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../Models/UserModel');
const authMiddleware = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const storage = multer.diskStorage({})
let upload = multer({ storage });

// Route to handle file uploads
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "We Need The File",
            });
        }
        if (req.file.size > 5 * 1024 * 1024) {
            return res.status(413).json({ message: "File size exceeds 5MB limit." });
        }
        
        let uploadedFile;
        try {
            uploadedFile = await cloudinary.uploader.upload(req.file.path, {
                folder: "File Sharing",
                resource_type: "auto"
            });
        } catch (error) {
            console.log(error.message);
            return res.status(400).json({
                message: "Cloudinary Error " + error.message,
            });
        }
        const { originalname } = req.file;
        const { secure_url, bytes, public_id } = uploadedFile;

        try {
            const file = await FileModel.create({
                filename: originalname,
                secure_url,
                publicId: public_id, // Store the public ID directly
                sizeInBytes: bytes,
                user: req.userId,
                uploadTime: new Date()
            });
            res.status(200).json({
                id: file._id,
            });
        } catch (error) {
            console.log(error.message);
            return res.status(500).json({
                message: "Error saving file record",
            });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            message: "Server Error",
        });
    }
});

// Route to get download info for a file
router.get('/download/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const file = await FileModel.findById(fileId);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json({
            filename: file.filename,
            sizeInBytes: file.sizeInBytes,
            secure_url: file.secure_url,
            shareableLink: `https://skyboxshare.vercel.app/download/${file._id}`
        });
    } catch (error) {
        console.error('Error fetching download info:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Signup Route
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email and password required.' });
        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(409).json({ message: 'User already exists.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ email, password: hashedPassword });
        res.status(201).json({ message: 'Signup successful.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email and password required.' });
        const user = await User.findOne({ email });
        if (!user)
            return res.status(401).json({ message: 'Invalid credentials.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ message: 'Invalid credentials.' });
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', {
            expiresIn: '7d',
        });
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Route to get all files for the authenticated user
router.get('/myfiles', authMiddleware, async (req, res) => {
    try {
        const files = await FileModel.find({ user: req.userId }).sort({ uploadTime: -1 });
        res.json({ files });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching files' });
    }
});

// DELETE route to handle file deletion
router.delete('/file/:id', authMiddleware, async (req, res) => {
    try {
        const fileId = req.params.id;

        // 1. Find the file entry in MongoDB.
        const file = await FileModel.findOne({ _id: fileId, user: req.userId });

        if (!file) {
            return res.status(404).json({ message: "File not found or not authorized to delete" });
        }
        
        // 2. Use the stored publicId to delete the file from Cloudinary.
        const deletionResult = await cloudinary.uploader.destroy(file.publicId, {
            resource_type: "auto"
        });

        if (deletionResult.result !== 'ok' && deletionResult.result !== 'not found') {
            console.error('Cloudinary deletion failed:', deletionResult);
            return res.status(500).json({ message: "Failed to delete file from Cloudinary." });
        }

        console.log(`Cloudinary file with public_id '${file.publicId}' deleted. Result: ${deletionResult.result}`);

        // 3. Remove the record from MongoDB.
        await FileModel.deleteOne({ _id: fileId });

        res.status(200).json({ message: "File and record deleted successfully" });
    } catch (err) {
        console.error("Error deleting file:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Other routes...
router.post('/changepassword', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new passwords are required.' });
    }
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();
    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'If a user with that email exists, an OTP has been sent.' });
    }
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 2 * 60 * 1000);
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p style="font-size: 16px; color: #555;">Hello,</p>
          <p style="font-size: 16px; color: #555;">You recently requested to reset the password for your account. Please use the following One-Time Password (OTP) to complete the process:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; padding: 15px 25px; background-color: #f0f0f0; border-radius: 8px; font-size: 24px; font-weight: bold; color: #333; letter-spacing: 2px;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #777; text-align: center;">This OTP is valid for <b>2 minutes</b>.</p>
          <p style="font-size: 16px; color: #555;">If you did not request a password reset, please ignore this email or contact support if you have any concerns.</p>
          <p style="font-size: 16px; color: #555;">Thank you,<br>Your App Team</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
    console.log(`Password reset OTP sent to: ${user.email}`);
    res.status(200).json({ message: 'If a user with that email exists, an OTP has been sent.' });
  } catch (err) {
    console.error('Error in forgot-password route:', err);
    res.status(500).json({ message: 'Failed to send OTP.' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (user.otp === otp && user.otpExpires > new Date()) {
      res.status(200).json({ message: 'OTP verified successfully.' });
    } else {
      res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
  } catch (err) {
    console.error('Error in verify-otp route:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (!user.otp || user.otpExpires < new Date()) {
        return res.status(401).json({ message: 'Unauthorized. Please verify OTP first.' });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Error in reset-password route:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;