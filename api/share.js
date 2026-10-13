export default async function handler(req, res) {
    // 1. Respon cepat untuk pengecekan otomatis dari aplikasi Zeniopost
    if (req.query.ping) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.status(200).json({ ok: true });
    }

    const SUPABASE_URL = "https://zwezerwhvqsauohbfxkq.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_6wEL_RA1TIkENs1ZAyqtCg_1L5GjjjW";
    const DEFAULT_LOGO = "https://res.cloudinary.com/dtz0urit6/image/upload/w_1200,h_630,c_pad,b_white,f_jpg,q_auto:good/cloudinary-tools-uploads/gyiscmvuxv4olklenjcg.jpg";

    const articleId = req.query.id;
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "zeniopost.vercel.app";
    const origin = `${protocol}://${host}`;

    // Jika tidak ada ID artikel, langsung arahkan ke beranda
    if (!articleId) {
        return res.redirect(302, origin);
    }

    let title = "Zeniopost - Portal Berita Digital";
    let description = "Platform berita digital terpercaya dari masyarakat untuk masyarakat.";
    let imageUrl = DEFAULT_LOGO;

    try {
        // 2. Ambil data berita berdasarkan ID dari Supabase
        const apiUrl = `${SUPABASE_URL}/rest/v1/articles?id=eq.${encodeURIComponent(articleId)}&select=id,title,content,image_url,author_name,is_official`;
        const response = await fetch(apiUrl, {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const art = data[0];
                if (art.title) title = `${art.title} - Zeniopost`;
                if (art.content) {
                    description = art.content.replace(/\s+/g, " ").trim().substring(0, 160);
                    if (art.content.length > 160) description += "...";
                }
                if (art.image_url) {
                    // Kompres & sesuaikan ukuran gambar ke 1200x630 JPG (< 60KB) agar 100% selalu muncul di WhatsApp
                    imageUrl = `https://wsrv.nl/?url=${encodeURIComponent(art.image_url)}&w=1200&h=630&fit=cover&output=jpg&q=80`;
                }
            }
        }
    } catch (err) {
        console.error("Gagal mengambil preview artikel:", err);
    }

    // Fungsi pengaman teks HTML agar tidak rusak jika judul mengandung tanda kutip
    const escapeHtml = (str) => String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const safeImg = escapeHtml(imageUrl);
    const targetUrl = `${origin}/?article=${encodeURIComponent(articleId)}`;
    const sharePageUrl = `${origin}/api/share?id=${encodeURIComponent(articleId)}`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

    // 3. Kirim HTML Meta Preview untuk WhatsApp/Medsos & Redirect otomatis untuk Pembaca
    return res.status(200).send(`<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>

    <!-- Open Graph Meta Tags (WhatsApp, Facebook, Telegram, LinkedIn) -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Zeniopost">
    <meta property="og:url" content="${sharePageUrl}">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDesc}">
    <meta property="og:image" content="${safeImg}">
    <meta property="og:image:secure_url" content="${safeImg}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter / X Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDesc}">
    <meta name="twitter:image" content="${safeImg}">

    <!-- Langsung arahkan pembaca ke tampilan layar penuh berita -->
    <script>
        window.location.replace("${targetUrl}");
    </script>
    <noscript>
        <meta http-equiv="refresh" content="0;url=${targetUrl}">
    </noscript>
</head>
<body style="font-family: sans-serif; background: #f4f7fb; color: #1e293b; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
    <p>Membuka berita di Zeniopost... <a href="${targetUrl}">Klik di sini jika belum berpindah</a>.</p>
</body>
</html>`);
}
