// ============================================================================
// FILE: api/share.js (Letakkan di dalam folder /api/share.js di GitHub Anda)
// Berfungsi menghasilkan Meta OpenGraph bersih tanpa tag <div>/<br> di WhatsApp
// ============================================================================

const DB_URL = "https://zwezerwhvqsauohbfxkq.supabase.co";
const DB_ANON_KEY = "sb_publishable_6wEL_RA1TIkENs1ZAyqtCg_1L5GjjjW";
const DEFAULT_LOGO = "https://res.cloudinary.com/dtz0urit6/image/upload/w_1200,h_630,c_pad,b_white,f_jpg,q_auto:good/cloudinary-tools-uploads/dihjwoqgvxak1am7vhur.jpg";

// Fungsi menghapus seluruh tag HTML (<div>, <br>, <p>, <b>, dll) agar bersih di WhatsApp
function stripHtmlTags(rawHtml) {
    if (!rawHtml) return "";
    return String(rawHtml)
        // Ganti tag pemisah baris/paragraf dengan spasi agar kalimat tidak menempel
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<\/(div|p|li|h[1-6]|blockquote|tr)>/gi, " ")
        // Hapus semua tag HTML lainnya (<div...>, <b>, <i>, dll)
        .replace(/<[^>]*>/g, "")
        // Ubah HTML entities umum menjadi karakter biasa
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        // Rapikan spasi ganda menjadi satu spasi
        .replace(/\s+/g, " ")
        .trim();
}

// Fungsi mengamankan teks saat dimasukkan ke atribut meta HTML
function escapeAttr(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export default async function handler(req, res) {
    // 1. Respon cepat untuk pengecekan status endpoint (?ping=1)
    if (req.query.ping) {
        return res.status(200).json({ ok: true });
    }

    const articleId = req.query.id || req.query.article;
    const host = req.headers["x-forwarded-host"] || req.headers.host || "www.zeniopost.my.id";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${host}`;

    if (!articleId) {
        res.writeHead(302, { Location: baseUrl });
        return res.end();
    }

    let title = "Zeniopost - Portal Berita Digital";
    let description = "Platform berita digital terpercaya dari masyarakat untuk masyarakat.";
    let imageUrl = DEFAULT_LOGO;
    const targetArticleUrl = `${baseUrl}/?article=${encodeURIComponent(articleId)}`;

    try {
        // 2. Ambil data artikel langsung dari REST API database berdasarkan ID
        const apiUrl = `${DB_URL}/rest/v1/articles?id=eq.${encodeURIComponent(articleId)}&select=id,title,content,image_url`;
        const response = await fetch(apiUrl, {
            headers: {
                apikey: DB_ANON_KEY,
                Authorization: `Bearer ${DB_ANON_KEY}`,
                Accept: "application/json"
            }
        });

        if (response.ok) {
            const rows = await response.json();
            if (rows && rows.length > 0) {
                const art = rows[0];
                if (art.title) {
                    title = `${art.title.trim()} - Zeniopost`;
                }
                if (art.content) {
                    // Bersihkan semua tag <div>, <br>, <p> sebelum dipotong 160 karakter
                    const cleanText = stripHtmlTags(art.content);
                    if (cleanText) {
                        description = cleanText.length > 160
                            ? cleanText.substring(0, 157).trim() + "..."
                            : cleanText;
                    }
                }
                if (art.image_url && art.image_url.startsWith("http")) {
                    imageUrl = art.image_url;
                }
            }
        }
    } catch (err) {
        console.error("Error fetching article preview:", err);
    }

    const safeTitle = escapeAttr(title);
    const safeDesc = escapeAttr(description);
    const safeImg = escapeAttr(imageUrl);
    const safeShareUrl = escapeAttr(`${baseUrl}/api/share?id=${encodeURIComponent(articleId)}`);

    // 3. Kembalikan halaman HTML dengan Meta OpenGraph bersih + Auto Redirect ke artikel
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

    return res.status(200).send(`<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>

    <!-- OpenGraph Meta untuk WhatsApp, Facebook, Telegram -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Zeniopost">
    <meta property="og:url" content="${safeShareUrl}">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDesc}">
    <meta property="og:image" content="${safeImg}">
    <meta property="og:image:secure_url" content="${safeImg}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDesc}">
    <meta name="twitter:image" content="${safeImg}">

    <!-- Redirect otomatis bagi pembaca yang mengklik link -->
    <meta http-equiv="refresh" content="0;url=${targetArticleUrl}">
    <script>
        window.location.replace("${targetArticleUrl}");
    </script>
</head>
<body style="font-family: sans-serif; text-align: center; padding: 40px; color: #334155;">
    <p>Mengalihkan ke berita Zeniopost...</p>
    <p><a href="${targetArticleUrl}" style="color: #2563eb; font-weight: bold;">Klik di sini jika halaman tidak berpindah otomatis</a></p>
</body>
</html>`);
}
