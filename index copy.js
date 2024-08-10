const { ApifyClient } = require('apify-client');
const ExcelJS = require('exceljs');

// Inisialisasi ApifyClient dengan API token Anda
const client = new ApifyClient({
    token: 'apify_api_gt7HcEqkeOZIrEUgk5mPTS6G96VOBA0cAs3f',
});

// Input untuk menjalankan Actor
const input = {
    startUrls: [
        { url: 'https://www.facebook.com/marketplace/jakarta/search?daysSinceListed=30&itemCondition=new&query=iphone&exact=false' }
    ],
    resultsLimit: 100, // Meningkatkan limit hasil
    location: 'Jakarta, Indonesia', // Lokasi
    radius: 10, // Radius dalam kilometer
    sortBy: 'RECOMMENDED', // Urut berdasarkan: RECOMMENDED, PRICE_LOW_TO_HIGH, PRICE_HIGH_TO_LOW, DATE_LISTED
    priceMin: 1000000, // Harga minimum dalam IDR
    priceMax: 10000000, // Harga maksimum dalam IDR
    condition: 'NEW', // Ketentuan: NEW, USED
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

    // Filter hasil berdasarkan lokasi Jakarta
    const filteredItems = allItems.filter(item => {
        const location = item.location?.reverse_geocode?.city_page?.display_name || '';
        return typeof location === 'string' && location.toLowerCase().includes('jakarta');
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
        { header: 'Location', key: 'location', width: 30 }, // Menambahkan kolom lokasi
    ];

    filteredItems.forEach(product => {
        worksheet.addRow({
            title: product.marketplace_listing_title || 'N/A',
            price: product.listing_price?.formatted_amount || 'N/A',
            link: product.listingUrl || 'N/A',
            location: product.location?.reverse_geocode?.city_page?.display_name || 'N/A' // Menambahkan lokasi produk
        });
    });

    await workbook.xlsx.writeFile('products.xlsx');
    console.log('Data saved to products.xlsx');
})();
