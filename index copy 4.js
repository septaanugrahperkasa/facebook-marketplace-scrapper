const { ApifyClient } = require('apify-client');
const ExcelJS = require('exceljs');

// Inisialisasi ApifyClient dengan API token Anda
const client = new ApifyClient({
    token: 'apify_api_I6OjPpFv0UJl2xrdtdMczsFlP6WLZr4jrMPE',
});

// Input untuk menjalankan Actor
const input = {
    startUrls: [
        { url: 'https://www.facebook.com/marketplace/jakarta/search?query=iphone' }
    ],
    resultsLimit: 5000, // Batasi hasil ke nilai maksimum yang valid
    location: 'Jakarta, Indonesia', // Lokasi pencarian
    radius: undefined, // Radius pencarian dalam kilometer (undefined untuk tidak ada batasan)
    sortBy: undefined, // Opsi pengurutan: RECOMMENDED, PRICE_LOW_TO_HIGH, PRICE_HIGH_TO_LOW, DATE_LISTED
    priceMin: undefined, // Harga minimum dalam IDR
    priceMax: undefined, // Harga maksimum dalam IDR
    condition: undefined, // Kondisi barang: NEW, USED
    dateListed: 'LAST_30_DAYS', // Tanggal terdaftar: LAST_24_HOURS, LAST_7_DAYS, LAST_30_DAYS
    availability: 'IN_STOCK' // Ketersediaan barang: IN_STOCK, OUT_OF_STOCK
};

(async () => {
    try {
        // Jalankan Actor dan tunggu hingga selesai
        const run = await client.actor('apify/facebook-marketplace-scraper').call(input);

        // Ambil dan gabungkan semua hasil dari dataset
        let allItems = [];
        let offset = 0;
        const limit = 100;

        while (true) {
            const { items, total } = await client.dataset(run.defaultDatasetId).listItems({ offset, limit });
            allItems = allItems.concat(items);
            offset += limit;
            if (offset >= total) break;
        }

        // Filter hasil berdasarkan lokasi Jakarta
        const filteredItems = allItems.filter(item => {
            const location = item.location?.reverse_geocode?.city_page?.display_name || '';
            return location.toLowerCase().includes('jakarta');
        });

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
            { header: 'Seller Name', key: 'sellerName', width: 30 },
            { header: 'Seller Profile Link', key: 'sellerProfileLink', width: 50 },
            { header: 'Location', key: 'location', width: 30 },
        ];

        filteredItems.forEach(product => {
            worksheet.addRow({
                title: product.marketplace_listing_title || 'N/A',
                price: product.listing_price?.formatted_amount || 'N/A',
                link: product.listingUrl || 'N/A',
                sellerName: product.marketplace_listing_seller?.name || 'N/A',
                sellerProfileLink: `https://www.facebook.com/${product.marketplace_listing_seller?.id}` || 'N/A',
                location: product.location?.reverse_geocode?.city_page?.display_name || 'N/A'
            });
        });

        await workbook.xlsx.writeFile('products.xlsx');
        console.log('Data saved to products.xlsx');
    } catch (error) {
        console.error('Error occurred:', error.message);
    }
})();
