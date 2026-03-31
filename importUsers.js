const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

/**
 * 1. Cấu hình Mailtrap 
 * Bạn lấy thông tin 'user' và 'pass' tại: https://mailtrap.io/inboxes
 */
const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "YOUR_MAILTRAP_USER_ID", // Thay bằng User ID của bạn
        pass: "YOUR_MAILTRAP_PASSWORD" // Thay bằng Password của bạn
    }
});

/**
 * Hàm tạo chuỗi ngẫu nhiên 16 ký tự (8 bytes hex = 16 ký tự)
 */
const generateRandomPassword = () => {
    return crypto.randomBytes(8).toString('hex');
};

async function importAndSendMail() {
    try {
        console.log("--- Bắt đầu quá trình Import User ---");

        // 2. Đọc file Excel (Đảm bảo file tên là user.xlsx nằm cùng thư mục)
        const workbook = xlsx.readFile('./user.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Chuyển dữ liệu Excel thành mảng JSON
        const users = xlsx.utils.sheet_to_json(worksheet);

        console.log(`Tìm thấy ${users.length} users trong file Excel.`);

        // 3. Lặp qua danh sách 99 users để xử lý
        for (const user of users) {
            const { username, email } = user;
            const randomPassword = generateRandomPassword();
            const role = 'user';

            console.log(`Đang gửi mail cho: ${username} (${email})...`);

            // 4. Nội dung Email gửi qua Mailtrap
            const mailOptions = {
                from: '"Hệ thống Quản lý" <admin@example.com>',
                to: email,
                subject: "Thông báo: Khởi tạo tài khoản thành công",
                html: `
                    <h3>Chào mừng ${username},</h3>
                    <p>Tài khoản của bạn đã được khởi tạo thành công trên hệ thống với thông tin sau:</p>
                    <ul>
                        <li><b>Username:</b> ${username}</li>
                        <li><b>Email:</b> ${email}</li>
                        <li><b>Password:</b> <span style="color: red;">${randomPassword}</span></li>
                        <li><b>Role:</b> ${role}</li>
                    </ul>
                    <p>Vui lòng đăng nhập và đổi mật khẩu ngay sau khi nhận được thông báo này.</p>
                `
            };

            // Thực hiện gửi mail
            await transporter.sendMail(mailOptions);
        }

        console.log("--- HOÀN THÀNH: Đã gửi email cho toàn bộ danh sách! ---");

    } catch (error) {
        console.error("Đã xảy ra lỗi trong quá trình thực hiện:", error.message);
    }
}

// Chạy chương trình
importAndSendMail();