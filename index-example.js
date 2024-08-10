const { ApifyClient } = require('apify-client');
const ExcelJS = require('exceljs');

// Inisialisasi ApifyClient dengan API token Anda
const client = new ApifyClient({
    token: 'apify_api_I6OjPpFv0UJl2xrdtdMczsFlP6WLZr4jrMPE',
});

// Input untuk menjalankan Actor
const input = {
    startUrls: [
        { url: 'https://www.facebook.com/marketplace/bandung/search?query=iphone' }
    ],
    resultsLimit: 5000, // Mengatur limit hasil ke nilai maksimum yang valid
    location: 'Bandung, Indonesia', // Lokasi
    radius: undefined, //10, // Radius dalam kilometer
    sortBy: undefined, //'RECOMMENDED', // Urut berdasarkan: RECOMMENDED, PRICE_LOW_TO_HIGH, PRICE_HIGH_TO_LOW, DATE_LISTED
    priceMin: undefined, //1000000, // Harga minimum dalam IDR
    priceMax: undefined, //10000000, // Harga maksimum dalam IDR
    condition: undefined, //'NEW', // Ketentuan: NEW, USED
    dateListed: 'LAST_30_DAYS', // Tanggal terdaftar: LAST_24_HOURS, LAST_7_DAYS, LAST_30_DAYS
    availability: 'IN_STOCK' // Ketersediaan: IN_STOCK, OUT_OF_STOCK
};

(async () => {
    // Jalankan Actor dan tunggu hingga selesai
    const run = await client.actor('apify/facebook-marketplace-scraper').call(input);

    // Ambil dan cetak hasil dari dataset
    let allItems = [];
    let offset = 0;
    let limit = 100;
    let hasMore = true;

    while (hasMore) {
        const { items, total } = await client.dataset(run.defaultDatasetId).listItems({ offset, limit });
        allItems = allItems.concat(items);
        offset += limit;
        hasMore = offset < total;
    }

    // Debugging: Tampilkan beberapa item untuk memeriksa data lokasi
    console.log('Sample items:', allItems.slice(0, 5));

    // Filter hasil berdasarkan lokasi Bandung
    const filteredItems = allItems.filter(item => {
        const location = item.location?.reverse_geocode?.city_page?.display_name || '';
        return typeof location === 'string' && location.toLowerCase().includes('bandung');
    });

    // Debugging: Tampilkan jumlah item yang difilter
    console.log(`Total items after filtering: ${filteredItems.length}`);

    // Cek apakah ada item yang difilter
    if (filteredItems.length === 0) {
        console.log('No items found for the specified filters.');
        return;
    }

    // Simpan hasil ke file Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    worksheet.columns = [
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Price', key: 'price', width: 15 },
        { header: 'Link', key: 'link', width: 50 },
        { header: 'Seller Name', key: 'sellerName', width: 30 }, // Menambahkan kolom nama penjual
        { header: 'Seller Profile Link', key: 'sellerProfileLink', width: 50 }, // Menambahkan kolom tautan profil penjual
        { header: 'Location', key: 'location', width: 30 }, // Menambahkan kolom lokasi
    ];

    filteredItems.forEach(product => {
        worksheet.addRow({
            title: product.marketplace_listing_title || 'N/A',
            price: product.listing_price?.formatted_amount || 'N/A',
            link: product.listingUrl || 'N/A',
            sellerName: product.marketplace_listing_seller?.name || 'N/A', // Menambahkan nama penjual
            sellerProfileLink: `https://www.facebook.com/${product.marketplace_listing_seller?.id}` || 'N/A', // Menambahkan tautan profil penjual
            location: product.location?.reverse_geocode?.city_page?.display_name || 'N/A' // Menambahkan lokasi produk
        });
    });

    await workbook.xlsx.writeFile('products.xlsx');
    console.log('Data saved to products.xlsx');
})();
