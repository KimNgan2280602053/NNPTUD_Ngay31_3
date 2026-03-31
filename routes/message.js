const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const Message = require('../schemas/message'); 

// --- 1. CẤU HÌNH MULTER (Xử lý upload file thật) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Lưu vào thư mục uploads/
    },
    filename: (req, file, cb) => {
        // Tên file = thời gian + tên gốc
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- 2. MIDDLEWARE XÁC THỰC (Dùng đúng secretKey của thầy) ---
const checkAuth = (req, res, next) => {
    try {
        if (!req.headers.authorization) {
            return res.status(401).json({ message: "Không tìm thấy Token!" });
        }
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, 'secretKey'); 
        req.user = decoded; 
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token không hợp lệ!" });
    }
};

// --- 3. CÁC ROUTER THEO YÊU CẦU ---

/**
 * @route   POST /api/v1/messages
 * @desc    Gửi tin nhắn (Hỗ trợ cả text và file thật)
 */
router.post('/', checkAuth, upload.single('file'), async (req, res) => {
    try {
        const currentUserID = req.user.id; 
        const { to } = req.body;
        let type = req.body.type || 'text';
        let text = req.body.text;

        // Nếu có file upload kèm theo
        if (req.file) {
            type = 'file';
            text = req.file.path; // Lưu path vào field text như thầy yêu cầu
        }

        const newMessage = new Message({
            from: currentUserID,
            to: to,
            messageContent: {
                type: type,
                text: text  
            }
        });

        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

/**
 * @route   GET /api/v1/messages
 * @desc    Lấy tin nhắn cuối cùng của mỗi cuộc hội thoại (Aggregate)
 */
router.get('/', checkAuth, async (req, res) => {
    try {
        const currentUserID = req.user.id;
        const currentObjId = new mongoose.Types.ObjectId(currentUserID);
        
        const lastMessages = await Message.aggregate([
            {
                $match: {
                    $or: [{ from: currentObjId }, { to: currentObjId }]
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$from", currentObjId] }, 
                            "$to", 
                            "$from"
                        ]
                    },
                    lastMessage: { $first: "$$ROOT" }
                }
            }
        ]);

        res.json(lastMessages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @route   GET /api/v1/messages/:userID
 * @desc    Lấy toàn bộ lịch sử nhắn tin giữa 2 người
 */
router.get('/:userID', checkAuth, async (req, res) => {
    try {
        const currentUserID = req.user.id;
        const targetUserID = req.params.userID;

        const messages = await Message.find({
            $or: [
                { from: currentUserID, to: targetUserID },
                { from: targetUserID, to: currentUserID }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;