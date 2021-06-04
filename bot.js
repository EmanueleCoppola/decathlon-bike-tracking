const fs = require('fs');

const axios = require('axios');
const cheerio = require('cheerio');
const { Telegraf } = require('telegraf');

const OLD_AVAILABILITY = require('./availability.json');
let   NEW_AVAILABILITY = OLD_AVAILABILITY;

const TELEGRAM_BOT_TOKEN   = null;
const TELEGRAM_BOT_CHANNEL = null;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_BOT_CHANNEL) process.exit(1);

const WAIT_GET = 3*1000;
const WAIT_XHR = 800;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const TELEGRAM = new Telegraf(TELEGRAM_BOT_TOKEN);

    const PRODUCTS = [
        // RC 120
        'https://www.decathlon.it/p/bici-da-corsa-rc120/_/R-p-302301',
        'https://www.decathlon.it/p/bici-da-corsa-rc120-fb-blu-arancione/_/R-p-311239',

        // GRVL 120
        'https://www.decathlon.it/p/bici-gravel-triban-grvl-120/_/R-p-312397',

        // RC 500
        'https://www.decathlon.it/p/bici-da-corsa-triban-rc-500-nera/_/R-p-301728',
        'https://www.decathlon.it/p/bici-da-corsa-triban-rc-500-fb/_/R-p-306215',

        // RC 520
        'https://www.decathlon.it/p/bici-da-corsa-triban-rc520/_/R-p-301734',
        'https://www.decathlon.it/p/bici-da-corsa-triban-rc520-fb/_/R-p-307286',
        'https://www.decathlon.it/p/bici-da-corsa-donna-rc520/_/R-p-301713',
        'https://www.decathlon.it/p/bici-gravel-triban-rc-520/_/R-p-302303',

        // GRVL 520
        'https://www.decathlon.it/p/bici-gravel-uomo-grvl-520/_/R-p-313016',
        'https://www.decathlon.it/p/bici-gravel-donna-grvl-520/_/R-p-328031',

        // ELOPS 120
        'https://www.decathlon.it/p/bici-citta-elops-120-telaio-alto-azzurra/_/R-p-168865',
        'https://www.decathlon.it/p/bici-citta-elops-120-telaio-basso-azzurra/_/R-p-168864',

        // RIVERSIDE 920
        'https://www.decathlon.it/p/bici-trekking-riverside-920/_/R-p-300795',
        'https://www.decathlon.it/p/bici-da-viaggio-riverside-touring-920/_/R-p-332473'
    ];

    for (let productUrl of PRODUCTS) {
        let message = '';

        let page = await axios.get(productUrl);
        let $ = cheerio.load(page.data);

        let _ctx = JSON.parse($('#__dkt').html());

        let models = _ctx['_ctx']['data'].find((datum) => datum.type === 'Supermodel')['data']['models'];

        for (let model of models) {
            let skus  = model['skus'].map((item) => Number(item['skuId']));
            let sizes = Object.fromEntries(model['skus'].map((item) => [Number(item['skuId']), item['size']]));

            let availabilityUrl = 'https://www.decathlon.it/it/ajax/nfs/stocks/online?skuIds=' + skus.join(',');
            await sleep(WAIT_XHR);

            let availabilityJson = await axios.get(availabilityUrl);
                availabilityJson = availabilityJson.data;

            message += `${model['webLabel']} \n\n`;

            let shouldNotifyProduct = false;

            for (let sku in availabilityJson) {
                if (!availabilityJson.hasOwnProperty(sku)) continue;

                let oldAvailability = sku in OLD_AVAILABILITY ? OLD_AVAILABILITY[sku] : 0;
                let newAvailability = availabilityJson[sku]['stockOnline'];

                availabilityJson[sku] = availabilityJson[sku]['stockOnline'];

                NEW_AVAILABILITY[sku] = newAvailability;

                if (oldAvailability === 0 && newAvailability > 0) {
                    shouldNotifyProduct = true;

                    message += `- ${sizes[sku]}: ${newAvailability} ${newAvailability === 1 ? 'pezzo disponibile' : 'pezzi disponibili'}\n`;
                }
            }

            message += `\n`;
            message += `${productUrl}\n`;

            if (shouldNotifyProduct) {
                TELEGRAM.telegram.sendMessage(TELEGRAM_BOT_CHANNEL, message);
            }
        }

        await sleep(WAIT_GET);
    }

    fs.writeFileSync('./availability.json', JSON.stringify(NEW_AVAILABILITY));
})();

