const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const HARGA_EVENT = {
    "Konser Musik Pop Internasional": 500000,
    "Workshop Coding Node.js 2026": 150000
};

// Database Lokal Sementara (Memory RAM) untuk menyimpan ID Tiket yang sudah masuk
const TIKET_SUDAH_CHECKIN = [];

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'EMAIL_KAMU@gmail.com', 
        pass: 'PASSWORD_APLIKASI_KAMU' 
    }
});

// [1] ENDPOINT CHECKOUT (PEMBUATAN TIKET)
app.post('/api/checkout', async (req, res) => {
    const { nama, email, eventName, ticketCount } = req.body;
    const hargaSatuan = HARGA_EVENT[eventName];
    const totalHarga = hargaSatuan * parseInt(ticketCount);
    
    // ID unik tiket menggunakan timestamp acak
    const bookingIdGenerated = `FTX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
        // Enkripsi struktur objek ke QR Code
        const dataTiket = JSON.stringify({
            bookingId: bookingIdGenerated,
            nama: nama,
            event: eventName,
            jumlah: ticketCount
        });
        
        const qrCodeDataUrl = await QRCode.toDataURL(dataTiket);

        const mailOptions = {
            from: '"Fast-Tix Indonesia" <EMAIL_KAMU@gmail.com>',
            to: email,
            subject: `🎉 Pembayaran Berhasil! Tiket ${eventName}`,
            html: `<h3>Terima Kasih, ${nama}!</h3><p>Berikut QR Code Masuk Anda:</p><img src="cid:qrcodeTiket" width="200"/>`,
            attachments: [{ filename: 'ticket-qrcode.png', path: qrCodeDataUrl, cid: 'qrcodeTiket' }]
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// [2] ENDPOINT VALIDATOR SCANNER (ANTI DUPLIKASI KUNCI UTAMA)
app.post('/api/validate-ticket', (req, res) => {
    const { bookingId } = req.body;

    if (!bookingId) {
        return res.status(400).json({ success: false, message: 'ID Tiket kosong.' });
    }

    // Pengecekan Kritis: Apakah ID tiket ini sudah ada di daftar check-in?
    if (TIKET_SUDAH_CHECKIN.includes(bookingId)) {
        return res.status(400).json({ 
            success: false, 
            message: 'TIKET SUDAH EXPIRED! Tiket ini telah dipakai scan sebelumnya.' 
        });
    }

    // Jika belum pernah dipakai, masukkan ID tiket ke daftar cek agar terkunci selamanya
    TIKET_SUDAH_CHECKIN.push(bookingId);

    return res.status(200).json({ 
        success: true, 
        message: 'Validasi sukses.' 
    });
});

app.listen(PORT, () => console.log(`Server Fast-Tix berjalan di Pelabuhan : ${PORT}`));